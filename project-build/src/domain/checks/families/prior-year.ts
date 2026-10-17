// Family: identity vs prior year (figures). A prior-year figure for the same thing this year's documents measure,
// saying which year looks wrong rather than only that they differ.
import { type Check, type Draft, docClaim, fmt, num, taxYear } from '../util';

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

export const priorYearChecks: Check[] = [priorYearFigure];
