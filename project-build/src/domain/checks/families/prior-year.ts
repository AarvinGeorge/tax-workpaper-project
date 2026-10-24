// Family: identity vs prior year (figures). A prior-year figure for the same thing this year's documents measure,
// saying which year looks wrong rather than only that they differ.
import { type Check, type Draft, docClaim, fmt, lineClaim, num, taxYear } from '../util';
import { swings } from '../../versions';
import { proofsFor } from '../../proofs';

const FAMILY = 'Prior year vs documents';

export const priorYearFigure: Check = {
  id: 'CHK-PRIOR-YEAR-FIGURE',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const ly = ix.packet.prior_years.return_2024 as { lines?: Record<string, unknown>; line_labels?: Record<string, string>; notes?: Record<string, string>; line_sources?: Record<string, string> } | undefined;
    if (!ly) return out;
    const prior = taxYear(ix) - 1;
    const addrs = (ix.packet.household.addresses as unknown as { from: string; to: string | null; address: string }[]) || [];
    const home = addrs.find((a) => a.from <= `${prior}-12-31` && (!a.to || a.to >= `${prior}-12-31`));
    const city = home?.address.split(',')[1]?.trim();
    if (!city) return out;
    const priorDoc = ix.packet.documents.find((d) => d.document_type === 'prior_year_return');
    for (const key of Object.keys(ly.line_labels ?? {})) {
      const text = `${ly.line_labels?.[key] ?? ''} ${ly.notes?.[key] ?? ''}`;
      const m = text.match(/(\d+) sq ft/);
      if (!m) continue;
      const claimed = Number(m[1]);
      const measured = ix.packet.extracted_values.find((v) => /sq_?ft/i.test(v.field) && v.label.includes(city) && num(v.value) !== null);
      if (!measured || num(measured.value) === claimed) continue;
      const rate = num(ix.packet.engine_reference.parameters.home_office_rate);
      const over = rate !== null ? (claimed - num(measured.value)!) * rate : null;
      const src = ly.line_sources?.[key];
      out.push({
        title: `${prior} return claimed ${claimed} sq ft for the ${city} office; the client measured ${measured.value}`,
        claims: priorDoc ? [docClaim(priorDoc.id)] : [docClaim(measured.document_id)],
        evidence: [`py:/return_2024/lines/${key}`, ...(src && ix.valueById.has(src) ? [src] : []), measured.id],
        trigger: [measured.id],
        explanation: `The ${prior} ${key} used ${claimed} sq ft (${text.trim()}). The same room measures ${measured.value} sq ft (${ix.docById.get(measured.document_id)?.title}). `
          + `The prior year looks wrong, not this year${over !== null && over > 0 ? `; about ${fmt(over)} of ${prior} deduction was overstated` : ''}. Record it and tell the client; too small to amend alone.`,
      });
    }
    return out;
  },
};

/** A line on both returns that moved past the firm's variance rule while nothing the tool can prove explains its new
 *  figure: its documents do not add up to it and no carryover record agrees. Totals (lines with inputs) are explained
 *  by the lines they add up, so only lines with no inputs are judged. A safety net: it yields to a specific check. */
export const unexplainedVariance: Check = {
  id: 'CHK-UNEXPLAINED-VARIANCE',
  family: FAMILY,
  yields: true,
  run(ix) {
    const out: Draft[] = [];
    for (const s of swings(ix)) {
      if (s.flag !== 'swing' || s.prior === null) continue;
      const line = ix.line(ix.latest.version, s.key);
      if (!line || (line.inputs || []).length) continue;
      if (proofsFor(ix, s.key).some((p) => p.method === 'agreed_to_source_document' || p.method === 'agreed_to_prior_year')) continue;
      out.push({
        title: `${line.label} moved from ${fmt(s.prior)} to ${fmt(s.current)} and nothing on file explains the new figure`,
        claims: [lineClaim(s.key)],
        evidence: [...(line.sources || []).filter((r) => ix.valueById.has(r)), ...(s.priorRef ? [s.priorRef] : [])],
        explanation: `${s.key} was ${fmt(s.prior)} last year and is ${fmt(s.current)} now, past the firm's variance rule. Its sources do not add up to the new figure and no carryover record agrees, so the change has no receipt. Find the document behind it or correct the line.`,
      });
    }
    return out;
  },
};

export const priorYearChecks: Check[] = [priorYearFigure, unexplainedVariance];
