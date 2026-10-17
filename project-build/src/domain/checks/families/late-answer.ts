// Family: answer after the last computation. A client message, sent after the latest engine run, that supplies a
// fact the return lacks: the return still carries the old figure ("answered, not applied").
import { type Check, type Draft, amountsIn, days, fmt, inStateResidency, lineClaim, lotField, num, round, valuesOf } from '../util';

const FAMILY = 'Answer after the last computation';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function acquiredFrom(text: string): string | null {
  const iso = text.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (iso) return `${iso[3]}-${iso[1]}-${iso[2]}`;
  const my = text.toLowerCase().match(new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{4})\\b`));
  if (my) return `${my[2]}-${String(MONTHS.indexOf(my[1]) + 1).padStart(2, '0')}-15`;
  return null;
}

export const answerAfterComputation: Check = {
  id: 'CHK-ANSWER-AFTER-COMPUTATION',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const rates = ix.latest.tax_effect_rates;
    const late = ix.packet.client.messages.filter((m) => m.sent_at > ix.latest.computed_at);
    for (const line of ix.latest.lines) {
      const blank = valuesOf(ix, line).find((v) => v.value === null && v.value_type === 'money');
      if (!blank) continue;
      const asset = String(lotField(ix, line, 'asset')?.value ?? line.label.split(/\s+/)[0]);
      const msg = late.find((m) => new RegExp(`\\b${asset}\\b`, 'i').test(m.text) && /\b(cost|basis|bought|paid)\b/i.test(m.text) && amountsIn(m.text).length);
      if (!msg) continue;
      const basis = amountsIn(msg.text)[0];
      const proceeds = num(line.value) ?? 0;
      const sold = String(lotField(ix, line, 'sold')?.value ?? (line.label.match(/sold (\d{4}-\d{2}-\d{2})/)?.[1] ?? ''));
      const oldAcq = line.label.match(/acquired (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      const newAcq = acquiredFrom(msg.text);
      const longTerm = (a: string | null) => !!a && !!sold && days(a, sold) > 365;
      const oldCat = longTerm(oldAcq) ? 'ltcg' : 'stcg';
      const newCat = longTerm(newAcq) ? 'ltcg' : oldCat;
      const ro = rates[oldCat]; const rn = rates[newCat];
      let effect;
      if (ro && rn) {
        const fed = -proceeds * ro.federal_per_dollar + (proceeds - basis) * rn.federal_per_dollar;
        const ca = inStateResidency(ix, sold)
          ? -basis * (rates.ca_source_income?.california_per_dollar ?? 0)
          : -proceeds * ro.california_per_dollar + (proceeds - basis) * rn.california_per_dollar;
        effect = { federal: round(fed), california: round(ca), basis: 'tax_effect_rates' as const };
      }
      out.push({
        title: `${line.label.split(' (')[0]}: client supplied the cost after the last computation; not applied`,
        claims: [lineClaim(line.key)],
        evidence: [msg.id, blank.id, ...(line.sources || []).filter((s) => ix.valueById.has(s) && s !== blank.id)],
        trigger: [msg.id],
        judgment: true,
        explanation: `The lot's basis was never read (blank), so ${line.key} taxes the whole ${fmt(proceeds)} as gain`
          + (oldAcq ? `, dated from the transfer-in ${oldAcq}` : '') + `. On ${msg.sent_at.slice(0, 10)}, after the latest computation (${ix.latest.computed_at.slice(0, 10)}), `
          + `the client wrote that it cost about ${fmt(basis)}${newAcq ? ` and was bought ${newAcq.slice(0, 7)}` : ''}${newCat !== oldCat ? ', which makes the sale long-term' : ''}. `
          + `No computation followed. Weigh the evidence (the client's own record) and record the decision.`,
        effect,
      });
    }
    return out;
  },
};

export const lateAnswerChecks: Check[] = [answerAfterComputation];
