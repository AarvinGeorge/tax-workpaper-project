// Family: a limit or cap. A contribution above its deductible limit; a credit for another state's tax taken at the
// raw tax paid, without the limit to the state's own tax on that income.
import { type Check, type Draft, fmt, lineClaim, num, oneToOne, valuesOf } from '../util';

const FAMILY = 'Limit or cap';

/** Retirement contribution above the deduction allowed: the excess is carried silently. */
export const sepLimit: Check = {
  id: 'CHK-SEP-LIMIT',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const contrib = valuesOf(ix, line).find((v) => ix.docById.get(v.document_id)?.document_type === 'retirement_contribution' && num(v.value) !== null);
      const deducted = num(line.value);
      if (!contrib || deducted === null) continue;
      const excess = num(contrib.value)! - deducted;
      if (excess < 1) continue;
      const fed = (ix.latest.carryovers_out as { federal?: Record<string, unknown> }).federal ?? {};
      const carried = Object.entries(fed).find(([k, v]) => /not_deductible/.test(k) && Math.abs((num(v) ?? 0) - excess) <= 1);
      const flagged = ix.latest.diagnostics.some((d) => (d.refs || []).includes(line.key));
      out.push({
        title: `${line.label}: ${fmt(excess)} contributed above the limit, never flagged`,
        claims: [lineClaim(line.key)],
        evidence: [contrib.id, ...(line.sources || []).filter((s) => ix.valueById.has(s) && s !== contrib.id), `doc:${contrib.document_id}`],
        trigger: [`doc:${contrib.document_id}`],
        judgment: true,
        explanation: `The contribution was ${fmt(num(contrib.value)!)}; ${line.key} deducts ${fmt(deducted)}, the computed limit. `
          + `The excess of ${fmt(excess)} is ${carried ? `carried out as "${carried[0]}"` : 'not deducted'}${flagged ? '' : ' with no diagnostic'}. `
          + `A nondeductible contribution can draw an excise tax unless withdrawn (the rate is not in the packet, so no amount is estimated). `
          + `Decide whether to withdraw the excess or keep it and file for the excise, and tell the client. The limit falls if Schedule C profit changes.`,
      });
    }
    return out;
  },
};

/** Credit for tax paid to another state, prorated by days, without the limit to this state's tax on that income. */
export const otherStateCreditLimit: Check = {
  id: 'CHK-OTHER-STATE-CREDIT-LIMIT',
  family: FAMILY,
  run(ix) {
    const params = ix.packet.engine_reference.parameters;
    const resDays = num(params.ca_resident_days); const yearDays = num(params.year_days);
    if (resDays === null || yearDays === null) return [];
    const L = ix.latest.lines;
    const agi = L.find((l) => l.jurisdiction === 'california' && /^california agi$/i.test(l.label));
    const tax = L.find((l) => l.jurisdiction === 'california' && /^regular tax$/i.test(l.label));
    if (!agi || !tax) return [];
    const out: Draft[] = [];
    for (const line of L) {
      if (line.jurisdiction !== 'california' || !/credit for .*tax paid to/i.test(line.label)) continue;
      const paid = valuesOf(ix, line).find((v) => num(v.value) !== null);
      const credit = num(line.value);
      if (!paid || credit === null) continue;
      if (Math.abs(num(paid.value)! * resDays / yearDays - credit) > 1) continue; // already something other than raw proration
      const income = (ix.valuesByDoc.get(paid.document_id) || []).find((v) => /ordinary business income|ordinary income/i.test(v.label) && num(v.value) !== null);
      if (!income) continue;
      const sourced = num(income.value)! * resDays / yearDays;
      const limit = Math.round(sourced / num(agi.value)! * num(tax.value)!);
      const excess = credit - limit;
      if (excess < 1) continue;
      out.push({
        title: `${line.label} is not limited to California's tax on that income`,
        claims: [lineClaim(line.key)],
        evidence: [paid.id, income.id, 'ref:param.ca_resident_days', 'ref:param.year_days'],
        trigger: [`doc:${paid.document_id}`],
        explanation: `${line.key} = ${fmt(num(paid.value)!)} other-state tax x ${resDays}/${yearDays} = ${fmt(credit)}. The credit is limited to California's own tax on the `
          + `double-taxed income: ${fmt(sourced)} / California AGI ${fmt(num(agi.value)!)} x regular tax ${fmt(num(tax.value)!)} = about ${fmt(limit)}. `
          + `Credit overstated by about ${fmt(excess)}; attach the statement for the composite return.`,
        effect: oneToOne('california', excess),
      });
    }
    return out;
  },
};

export const limitChecks: Check[] = [sepLimit, otherStateCreditLimit];
