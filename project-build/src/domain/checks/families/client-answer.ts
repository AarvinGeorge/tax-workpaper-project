// Family: what the client said against the line it gates (questionnaire answers and call notes as evidence).
import { type Check, type Draft, amountsIn, bigrams, categoryOf, fmt, lineClaim, num, rateEffect, valuesOf } from '../util';

const FAMILY = 'Client answer vs line';

/** A "yes" to employer-plan eligibility while the self-employed health insurance deduction is taken. */
export const answerGatesDeduction: Check = {
  id: 'CHK-ANSWER-GATES-DEDUCTION',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const yes = ix.packet.client.questionnaire.filter((q) => /eligible/i.test(q.question) && /health (coverage|plan|insurance)/i.test(q.question) && /^\s*yes\b/i.test(q.answer));
    if (!yes.length) return out;
    const notes = ((ix.packet.prior_years.return_2024 as { notes?: Record<string, string> }).notes) ?? {};
    for (const line of ix.latest.lines) {
      if (!/self-employed health insurance/i.test(line.label)) continue;
      const v = num(line.value);
      if (!v) continue;
      const prior = notes[line.key];
      out.push({
        title: `${line.label} taken although the client says employer coverage was available`,
        claims: [lineClaim(line.key)],
        evidence: [...yes.map((q) => q.id), ...(line.sources || []).filter((s) => ix.valueById.has(s)), ...(prior ? [`py:/return_2024/notes/${line.key}`] : [])],
        trigger: yes.map((q) => q.id),
        explanation: `${line.key} deducts ${fmt(v)}. The deduction is not allowed for a month the person could join a subsidized employer plan, `
          + `including a spouse's. The questionnaire says: "${yes[0].answer}"`
          + (prior ? ` Last year's preparer denied it: "${prior}"` : '') + ' The engine rule applies only the income limit.',
        effect: rateEffect(ix, 'adjustment', -v),
      });
    }
    return out;
  },
};

/** Call notes give a business share (or "personal") for an expense the return deducts in full. */
export const businessShareFromNotes: Check = {
  id: 'CHK-BUSINESS-SHARE-FROM-NOTES',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const detailDocs = ix.packet.documents.filter((d) => d.document_type.startsWith('books_'));
    type Hit = { line: string; personal: number; text: string; ev: string[] };
    const hits: Hit[] = []; const callIds = new Set<string>(); const seen = new Set<string>();
    for (const call of ix.packet.client.call_notes) {
      for (const note of (call.notes as string[]) || []) {
        const pct = note.match(/(\d{1,3})%/);
        const share = pct ? Number(pct[1]) / 100 : /\bpersonal\b/i.test(note) ? 0 : null;
        if (share === null || share >= 1) continue;
        const grams = bigrams(note);
        for (const d of detailDocs) {
          for (const pg of d.pages) {
            for (const seg of pg.printed_content.split(/(?<=\.)\s+(?=[A-Z])/)) {
              const low = seg.toLowerCase();
              const g = grams.find((b) => low.includes(b));
              if (!g) continue;
              const account = seg.replace(/^[^:]*detail:\s*/i, '').match(/^([A-Za-z][A-Za-z &-]+?)\s+[\d,]+\.\d{2}/)?.[1]?.trim();
              if (!account) continue;
              // An itemised account ("X includes A 1.00, B 2.00") gives the item's amount; otherwise the account total.
              const after = seg.slice(low.indexOf(g) + g.length);
              const itemAmt = /\bincludes\b/i.test(seg) && /^\s*[\d,]+\.\d{2}/.test(after) ? amountsIn(after)[0] : amountsIn(seg)[0];
              const key = `${account}|${itemAmt}`;
              if (seen.has(key)) continue;
              seen.add(key);
              const books = ix.packet.extracted_values.find((v) => v.label === account && detailDocs.some((x) => x.id === v.document_id));
              if (!books) continue;
              const line = ix.latest.lines.find((l) => (l.sources || []).includes(books.id) && categoryOf(l));
              if (!line) continue;
              const cited = valuesOf(ix, line).reduce((s, v) => s + (num(v.value) ?? 0), 0);
              if (Math.abs(cited - (num(line.value) ?? 0)) > 0.5) continue; // the line already reflects a reduction
              const item = ix.packet.extracted_values.find((v) => v.document_id === d.id && v.page === pg.page && num(v.value) === itemAmt && v.label.toLowerCase().includes(g.split(' ')[0]));
              hits.push({ line: line.key, personal: itemAmt * (1 - share), text: `${account} ${fmt(itemAmt)}: ${share ? `${Math.round(share * 100)}% business` : 'personal'}`, ev: [books.id, ...(item ? [item.id] : [])] });
              callIds.add(call.id as string);
            }
          }
        }
      }
    }
    if (!hits.length) return out;
    const total = hits.reduce((s, h) => s + h.personal, 0);
    const lines = [...new Set(hits.map((h) => h.line))];
    out.push({
      title: `Mixed-use expenses deducted at 100% although the client gave a business share`,
      claims: lines.map(lineClaim),
      evidence: [...new Set([...callIds, ...hits.flatMap((h) => h.ev)])],
      trigger: [...callIds],
      explanation: `The call notes give the business share: ${hits.map((h) => h.text).join('; ')}. `
        + `${lines.join(' and ')} still deduct${lines.length === 1 ? 's' : ''} the full amounts. Personal part: ${fmt(total)}.`,
      effect: rateEffect(ix, categoryOf(ix.line(ix.latest.version, lines[0])!) ?? 'schc_profit', total),
    });
    return out;
  },
};

export const clientAnswerChecks: Check[] = [answerGatesDeduction, businessShareFromNotes];
