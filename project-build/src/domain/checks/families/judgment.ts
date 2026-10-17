// Family: judgment needed (flag, record the decision and authority). Repair or improvement; one home for the
// simplified home-office method.
import { type Check, type Draft, categoryOf, fmt, lineClaim, num, pageText, rateEffect, round, taxYear, valuesOf } from '../util';

const FAMILY = 'Judgment needed';
const CAPITAL_WORDS = /\b(install(?:ed)? new|replac\w*|new [\w\s-]{0,30}system|permit)\b/i;

/** A rental repair line that contains an invoice describing a replacement (an improvement to depreciate). */
export const repairVsImprovement: Check = {
  id: 'CHK-REPAIR-VS-IMPROVEMENT',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const invoices = ix.packet.documents.filter((d) => d.document_type === 'invoice');
    for (const line of ix.latest.lines) {
      if (!/repairs/i.test(line.label)) continue;
      for (const src of valuesOf(ix, line)) {
        const parts = (ix.valuesByDoc.get(src.document_id) || []).filter((v) => v.id !== src.id && num(v.value) !== null && v.value_type === 'money');
        for (const part of parts) {
          const inv = invoices.find((d) => (ix.valuesByDoc.get(d.id) || []).some((v) => /total/i.test(v.field) && num(v.value) === num(part.value)));
          if (!inv) continue;
          const words = pageText(inv).match(CAPITAL_WORDS);
          if (!words) continue;
          const total = (ix.valuesByDoc.get(inv.id) || []).find((v) => /total/i.test(v.field))!;
          const alt = ix.packet.what_if.alternatives.find((a) => ((a.changed_lines as { key: string }[]) || []).some((c) => c.key === line.key));
          const effect = alt
            ? { federal: num((alt.federal as { total_tax_change: unknown }).total_tax_change) ?? 0, california: num((alt.california as { total_tax_change: unknown }).total_tax_change) ?? 0, basis: 'what_if' as const }
            : undefined;
          const answers = ix.packet.client.questionnaire.filter((q) => q.answer.includes(fmt(num(part.value)!))).map((q) => q.id);
          const calls = ix.packet.client.call_notes.filter((c) => ((c.notes as string[]) || []).some((n) => CAPITAL_WORDS.test(n))).map((c) => c.id as string);
          out.push({
            title: `${line.label}: the ${fmt(num(part.value)!)} invoice reads as a replacement, possibly an improvement to depreciate`,
            claims: [lineClaim(line.key)],
            evidence: [part.id, total.id, `doc:${inv.id}`, ...answers, ...calls],
            trigger: [`doc:${inv.id}`],
            judgment: true,
            explanation: `${inv.title} reads "${words[0]}" (${fmt(num(total.value)!)}). Replacing a whole building system is usually a betterment or restoration `
              + `to capitalize and depreciate, not a repair. Decide and record the authority.`
              + (alt ? ` The engine's own what-if "${alt.id}" computes the improvement treatment.` : ''),
            effect,
          });
        }
      }
    }
    return out;
  },
};

/** The simplified home-office method blended across two homes in one year. */
export const homeOfficeOneHome: Check = {
  id: 'CHK-HOME-OFFICE-ONE-HOME',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const year = taxYear(ix);
    const addrs = ((ix.packet.household.addresses as unknown as { from: string; to: string | null }[]) || [])
      .filter((a) => a.from <= `${year}-12-31` && (!a.to || a.to >= `${year}-01-01`));
    if (addrs.length < 2) return out;
    const rate = num(ix.packet.engine_reference.parameters.home_office_rate);
    for (const line of ix.latest.lines) {
      if (!/home office/i.test(line.label) || !/simplified/i.test(line.label + ' ' + (ix.packet.engine_reference.rules[line.rule ?? ''] ?? ''))) continue;
      const areas = valuesOf(ix, line).filter((v) => /sq_?ft/i.test(v.field) && num(v.value) !== null);
      if (new Set(areas.map((a) => a.value)).size < 2) continue;
      // Estimate: claim only the home with a start date (the later home) for its months.
      let effect;
      const start = valuesOf(ix, line).find((v) => /_start$/.test(v.field) && typeof v.value === 'string');
      const later = start && areas.find((a) => a.field.split('_')[0] === start.field.split('_')[0]);
      if (later && rate !== null && start) {
        const months = 12 - Number(String(start.value).slice(5, 7)) + 1;
        const est = round(num(later.value)! * months / 12 * rate);
        effect = rateEffect(ix, categoryOf(line) ?? 'schc_profit', (num(line.value) ?? 0) - est);
      }
      out.push({
        title: `${line.label}: one simplified figure for two homes`,
        claims: [lineClaim(line.key)],
        evidence: areas.map((a) => a.id).concat(start ? [start.id] : []),
        judgment: true,
        explanation: `The office moved between ${addrs.length} homes this year (${areas.map((a) => `${a.label} ${a.value}`).join('; ')}). `
          + `The simplified method may be used for one home only in a year; the other needs the regular method. Choose per home and record why.`
          + (effect ? ' Estimate shown: the later home alone by the simplified method.' : ''),
        effect,
      });
    }
    return out;
  },
};

export const judgmentChecks: Check[] = [repairVsImprovement, homeOfficeOneHome];
