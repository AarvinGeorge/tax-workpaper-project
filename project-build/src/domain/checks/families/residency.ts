// Family: residency and sourcing. Amounts a part-year resident's state may tax, against the move date.
import { type Check, type Draft, fmt, lineClaim, num, rateEffect, stateResidency } from '../util';
import type { ExtractedValue } from '../../packet/types';

const FAMILY = 'Residency and sourcing';

/** State-source wages taken from W-2 state boxes while a paystub from the same employer gives the split at the move. */
export const stateWagesResidency: Check = {
  id: 'CHK-STATE-WAGES-RESIDENCY',
  family: FAMILY,
  run(ix) {
    const res = stateResidency(ix);
    if (!res) return [];
    const out: Draft[] = [];
    const w2s = ix.packet.documents.filter((d) => d.document_type === 'W-2');
    const field = (docId: string, f: string) => (ix.valuesByDoc.get(docId) || []).find((v) => v.field === f);
    for (const line of ix.latest.lines) {
      if (line.jurisdiction !== 'california' || !/wages/i.test(line.label) || !/california amount/i.test(line.label)) continue;
      const v = num(line.value);
      if (v === null) continue;
      // One W-2 per employer (EIN): a re-uploaded copy is the same form.
      const byEin = new Map<string, string>();
      for (const d of w2s) {
        const ein = String(field(d.id, 'employer_ein')?.value ?? d.issuer);
        if (!byEin.has(ein)) byEin.set(ein, d.id);
      }
      let expected = 0; const ev: string[] = []; const parts: string[] = []; let split = false; let trigger: string[] = [];
      for (const docId of byEin.values()) {
        const d = ix.docById.get(docId)!;
        const box16 = field(docId, 'box16');
        const stub = ix.packet.documents.find((x) => x.document_type === 'paystub' && x.issuer === d.issuer);
        const stubCa: ExtractedValue | undefined = stub ? (ix.valuesByDoc.get(stub.id) || []).find((x) => /ca.*wages/i.test(x.field)) : undefined;
        if (stubCa && num(stubCa.value) !== null) {
          expected += num(stubCa.value)!;
          ev.push(stubCa.id); if (box16) ev.push(box16.id);
          parts.push(`${d.issuer}: ${fmt(num(stubCa.value)!)} state wages through the move per the paystub (box 16 says ${fmt(num(box16?.value) ?? 0)})`);
          split = true; trigger = [`doc:${stub!.id}`];
        } else if (box16 && num(box16.value) !== null) {
          expected += num(box16.value)!;
          ev.push(box16.id);
          parts.push(`${d.issuer}: box 16 ${fmt(num(box16.value)!)}`);
        }
      }
      const over = v - expected;
      if (!split || over < 1) continue;
      const answers = ix.packet.client.questionnaire.filter((q) => /california/i.test(q.answer) && /employer/i.test(q.answer)).map((q) => q.id);
      out.push({
        title: `${line.label} includes wages earned after the move`,
        claims: [lineClaim(line.key)],
        evidence: [...ev, ...(line.sources || []).filter((s) => ix.valueById.has(s) && !ev.includes(s)), ...answers],
        trigger,
        explanation: `The household lived in California to ${res.to}. ${line.key} is ${fmt(v)}, the full-year state wages. `
          + `${parts.join('; ')}. State-source wages are ${fmt(expected)}, so ${fmt(over)} is overstated.`,
        effect: rateEffect(ix, 'ca_source_income', -over),
      });
    }
    return out;
  },
};

export const residencyChecks: Check[] = [stateWagesResidency];
