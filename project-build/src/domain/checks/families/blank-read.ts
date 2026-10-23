// Family: blank read used as zero. A field the issuer left blank, or a page the pipeline never read, treated as if
// it said zero or nothing.
import type { ExtractedValue } from '../../packet/types';
import { type Check, type Draft, caGainRate, docClaim, fmt, fmt2, lineClaim, lotField, num, round } from '../util';

const FAMILY = 'Blank read used as zero';

/** Sale lots whose basis was blank (read as 0) while another document gives an adjusted basis for the same shares. */
export const lotSupplementBasis: Check = {
  id: 'CHK-LOT-SUPPLEMENT-BASIS',
  family: FAMILY,
  run(ix) {
    const rates = ix.latest.tax_effect_rates;
    // Adjusted-basis values anywhere in the packet, keyed by their sibling acquisition date.
    const supp: { basis: ExtractedValue; acquired: ExtractedValue }[] = [];
    for (const v of ix.packet.extracted_values) {
      const m = v.field.match(/^(.*)_adjusted_basis$/);
      if (!m || num(v.value) === null) continue;
      const acq = (ix.valuesByDoc.get(v.document_id) || []).find((x) => x.field === `${m[1]}_acquired`);
      if (acq && typeof acq.value === 'string') supp.push({ basis: v, acquired: acq });
    }
    const byDoc = new Map<string, { lines: string[]; ev: string[]; fed: number; ca: number; parts: string[] }>();
    for (const line of ix.latest.lines) {
      const basis = lotField(ix, line, 'basis');
      const acquired = lotField(ix, line, 'acquired');
      if (!basis || !acquired || typeof acquired.value !== 'string') continue;
      const blank = (basis.value === 0 || basis.value === null) && basis.text_as_read.trim() === '';
      if (!blank) continue;
      if ((lotField(ix, line, 'covered')?.value as unknown) === true) continue;
      const match = supp.find((s) => s.acquired.value === acquired.value && s.basis.document_id !== basis.document_id
        && !(line.sources || []).includes(s.basis.id));
      if (!match) continue;
      const b = num(match.basis.value)!;
      const term = String(lotField(ix, line, 'term')?.value ?? '');
      const cat = /long/i.test(term) ? 'ltcg' : 'stcg';
      const sold = lotField(ix, line, 'sold');
      const r = rates[cat];
      const acc = byDoc.get(match.basis.document_id) ?? { lines: [], ev: [], fed: 0, ca: 0, parts: [] };
      acc.lines.push(line.key);
      acc.ev.push(basis.id, match.basis.id, match.acquired.id);
      if (r) acc.fed += -b * r.federal_per_dollar;
      acc.ca += -b * caGainRate(ix, typeof sold?.value === 'string' ? sold.value : null, cat);
      acc.parts.push(`${line.line}: basis read blank (0.00), ${fmt2(b)} on the supplement`);
      byDoc.set(match.basis.document_id, acc);
    }
    const out: Draft[] = [];
    for (const [docId, a] of byDoc) {
      const d = ix.docById.get(docId)!;
      out.push({
        title: `Sales at zero basis while ${d.title} gives the basis`,
        claims: a.lines.map(lineClaim),
        evidence: [...new Set([...a.ev, `doc:${docId}`])],
        trigger: [`doc:${docId}`],
        explanation: `${a.lines.length} sale lot(s) carry a blank broker basis read as 0.00, so the whole proceeds are taxed as gain. `
          + `${d.title} lists the adjusted basis for the same shares (same acquisition dates), and the lines do not cite it. `
          + `${a.parts.join('; ')}. Income already taxed as wages would be taxed again.`,
        effect: { federal: round(a.fed), california: round(a.ca), basis: 'tax_effect_rates' },
      });
    }
    return out;
  },
};

/** A partially extracted document used by the return: pages never read, with what they print. */
export const unreadPage: Check = {
  id: 'CHK-UNREAD-PAGE',
  family: FAMILY,
  run(ix) {
    const rates = ix.latest.tax_effect_rates;
    const used = new Set(ix.latest.documents_used);
    const superseded = new Set(ix.latest.documents_superseded);
    const out: Draft[] = [];
    for (const d of ix.packet.documents) {
      if (d.extraction.status !== 'partial' || !used.has(d.id) || superseded.has(d.id)) continue;
      const vals = ix.valuesByDoc.get(d.id) || [];
      // The pages the extraction says it did not read; else the pages with no value read from them.
      const named = new Set([...(d.extraction.reason ?? '').matchAll(/page (\d+)/gi)].map((m) => Number(m[1])));
      const readPages = new Set(vals.map((v) => v.page));
      const unread = d.pages.filter((p) => (named.size ? named.has(p.page) : !readPages.has(p.page)));
      if (!unread.length) continue;
      let fed = 0; let ca = 0; let lots = 0; let proceedsUnread = 0;
      for (const pg of unread) {
        for (const m of pg.printed_content.matchAll(/sold (\d{4}-\d{2}-\d{2}) proceeds ([\d,]+\.\d{2}) basis ([\d,]+\.\d{2}) (short|long)-term/g)) {
          const gain = num(m[2])! - num(m[3])!;
          proceedsUnread += num(m[2])!;
          const cat = m[4] === 'long' ? 'ltcg' : 'stcg';
          if (rates[cat]) fed += gain * rates[cat].federal_per_dollar;
          ca += gain * caGainRate(ix, m[1], cat);
          lots++;
        }
      }
      const summary = vals.find((v) => /summary_proceeds$/.test(v.field));
      const detail = vals.filter((v) => /^[A-Za-z]+\d+_proceeds$/.test(v.field)).reduce((s, v) => s + (num(v.value) ?? 0), 0);
      const gap = summary ? round((num(summary.value) ?? 0) - detail) : null;
      const pagesText = unread.map((p) => p.page).join(', ');
      out.push({
        title: `${d.title}: page ${pagesText} never read, yet the return uses it as complete`,
        claims: [docClaim(d.id)],
        evidence: [...unread.map((p) => `doc:${d.id}#page${p.page}`), ...(summary ? [summary.id] : [])],
        trigger: [`doc:${d.id}`],
        explanation: `The extraction is partial (${d.extraction.reason ?? 'pages not read'}). `
          + (lots ? `The unread page prints ${lots} more sale(s) with proceeds ${fmt2(proceedsUnread)} that no return line carries. ` : '')
          + (gap !== null ? `Summary proceeds less the extracted lots leave a gap of ${fmt(gap)}${lots && round(proceedsUnread) === gap ? ', exactly the unread sales' : ''}.` : ''),
        effect: lots ? { federal: round(fed), california: round(ca), basis: 'tax_effect_rates' } : undefined,
      });
    }
    return out;
  },
};

export const blankReadChecks: Check[] = [lotSupplementBasis, unreadPage];
