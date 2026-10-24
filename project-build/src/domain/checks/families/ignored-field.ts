// Family: a field the rule ignores. The pipeline read the fact right, the engine's rule never looked at it: the tax
// year a payment was designated for, the year of an exchange rate, withholding the penalty rule leaves out.
import { type Check, type Draft, categoryOf, days, fmt, lineClaim, num, oneToOne, rateEffect, round, taxYear, valuesOf } from '../util';
import type { PacketIndex } from '../../packet/load';

const FAMILY = 'Field the rule ignores';

/** Payments counted on a line whose own "tax year" field names another year. */
export const paymentTaxYear: Check = {
  id: 'CHK-PAYMENT-TAX-YEAR',
  family: FAMILY,
  run(ix) {
    const y = String(taxYear(ix));
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const vals = valuesOf(ix, line);
      const wrong: { amount: number; ids: string[]; date: string; year: string }[] = [];
      for (const yv of vals) {
        const m = yv.field.match(/^(.*)_year$/);
        if (!m || yv.value === null || String(yv.value) === y) continue;
        const amt = vals.find((v) => v.document_id === yv.document_id && v.field === `${m[1]}_amount`);
        const dt = vals.find((v) => v.document_id === yv.document_id && v.field === `${m[1]}_date`);
        if (!amt || num(amt.value) === null) continue;
        wrong.push({ amount: num(amt.value)!, ids: [dt?.id, amt.id, yv.id].filter((x): x is string => !!x), date: String(dt?.value ?? ''), year: String(yv.value) });
      }
      if (!wrong.length) continue;
      const total = wrong.reduce((s, w) => s + w.amount, 0);
      out.push({
        title: `${line.label} include${wrong.length === 1 ? 's a payment' : ' payments'} designated for another tax year`,
        claims: [lineClaim(line.key)],
        evidence: wrong.flatMap((w) => w.ids),
        explanation: `${line.key} counts every payment by date. ${wrong.map((w) => `The ${w.date} payment of ${fmt(w.amount)} is designated tax year ${w.year}`).join('; ')}, `
          + `as the pipeline read correctly, so it is not a ${y} payment. Payments are overstated by ${fmt(total)}.`,
        effect: oneToOne(line.jurisdiction, total),
      });
    }
    return out;
  },
};

/** Foreign income converted at a rate whose year or kind does not match the tax year's average rate. */
export const fxRateYear: Check = {
  id: 'CHK-FX-RATE-YEAR',
  family: FAMILY,
  run(ix) {
    const y = taxYear(ix);
    const fx = (ix.packet.engine_reference.parameters.fx ?? {}) as Record<string, Record<string, number>>;
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const cat = categoryOf(line);
      if (!cat) continue; // balances (Form 8938) rightly use year-end rates
      for (const s of line.sources || []) {
        const m = s.match(/^ref:fx\.([A-Z]{3})\.(.+)$/);
        if (!m) continue;
        const want = `${y}_average`;
        const table = fx[m[1]] || {};
        if (m[2] === want || table[want] === undefined) continue;
        const foreign = valuesOf(ix, line).find((v) => num(v.value) !== null);
        if (!foreign) continue;
        const correct = round(num(foreign.value)! / table[want]);
        const delta = correct - (num(line.value) ?? 0);
        out.push({
          title: `${line.label}: converted at the ${m[2].replace('_', ' ')} rate, not the ${y} average`,
          claims: [lineClaim(line.key)],
          evidence: [foreign.id, s, `ref:fx.${m[1]}.${want}`],
          explanation: `${m[1]} ${fmt(num(foreign.value)!)} of ${y} income was converted at ${table[m[2]]} (${m[2]}). `
            + `Income uses the tax year's average rate, ${table[want]} (${want}), which gives ${fmt(correct)}, a change of ${fmt(delta)}.`,
          effect: rateEffect(ix, cat, delta),
        });
      }
    }
    return out;
  },
};

/** Regular-method penalty: four equal installments, withholding spread evenly, credits applied in date order. */
export function penaltyRegular(required: number, withholding: number, payments: { date: string; amount: number }[], due: string[], end: string, rate: number): number {
  const inst = required / due.length;
  const pool = [...due.map((d) => ({ date: d, amount: withholding / due.length })), ...payments]
    .sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ ...c }));
  let total = 0;
  for (const d of due) {
    let need = inst;
    while (need > 1e-9 && pool.length) {
      const c = pool[0];
      const use = Math.min(c.amount, need);
      if (c.date > d) total += use * rate * days(d, c.date) / 365;
      need -= use; c.amount -= use;
      if (c.amount <= 1e-9) pool.shift();
    }
    if (need > 1e-9) total += need * rate * days(d, end) / 365;
  }
  return total;
}

function penaltyInputs(ix: PacketIndex) {
  const L = ix.latest.lines;
  const pen = L.find((l) => l.jurisdiction === 'federal' && /penalty/i.test(l.label) && /regular method/i.test(l.label));
  if (!pen) return null;
  const required = num(ix.line(ix.latest.version, (pen.inputs || [])[0] ?? '')?.value);
  const wh = L.find((l) => l.jurisdiction === 'federal' && /^total withholding$/i.test(l.label));
  const est = L.find((l) => l.jurisdiction === 'federal' && /estimated tax payments/i.test(l.label));
  const ss = L.find((l) => l.jurisdiction === 'federal' && /excess social security/i.test(l.label));
  const ruleText = ix.packet.engine_reference.rules[pen.rule ?? ''] ?? '';
  const end = ruleText.match(/to (\d{4}-\d{2}-\d{2})/)?.[1];
  const rate = num(ix.packet.engine_reference.parameters.fed_underpayment_rate);
  const plan = (ix.packet.planning_reference_2026 as { federal_estimate_due_dates?: string[] } | undefined)?.federal_estimate_due_dates;
  if (required === null || !wh || !est || !end || rate === null || !Array.isArray(plan)) return null;
  // This year's due dates: next year's dates one year earlier, moved to a payment date when one falls within 3 days.
  const payments = [...String(est.note ?? '').matchAll(/(\d{4}-\d{2}-\d{2}) ([\d,]+\.\d{2})/g)].map((m) => ({ date: m[1], amount: num(m[2])! }));
  const due = plan.map((d) => {
    const prev = `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
    const near = payments.find((p) => days(prev, p.date) >= 0 && days(prev, p.date) <= 3);
    return near ? near.date : prev;
  });
  return { pen, required, wh, est, ss, end, rate, payments, due };
}

/** The penalty leaves out excess social security tax, which counts as withholding (spread evenly). */
export const penaltyWithholding: Check = {
  id: 'CHK-PENALTY-WITHHOLDING',
  family: FAMILY,
  run(ix) {
    const inp = penaltyInputs(ix);
    if (!inp || !inp.ss) return [];
    const excess = num(inp.ss.value) ?? 0;
    const used = num(inp.wh.value) ?? 0;
    const engine = num(inp.pen.value) ?? 0;
    if (excess <= 0) return [];
    // Prove the model first: with the engine's withholding it must reproduce the engine's penalty.
    const reproduced = penaltyRegular(inp.required, used, inp.payments, inp.due, inp.end, inp.rate);
    if (Math.abs(reproduced - engine) > 2) return [];
    const fixed = penaltyRegular(inp.required, used + excess, inp.payments, inp.due, inp.end, inp.rate);
    const delta = round(fixed) - engine;
    if (Math.abs(delta) < 1) return [];
    return [{
      title: `${inp.pen.label} leaves out excess social security tax as withholding`,
      claims: [lineClaim(inp.pen.key)],
      evidence: [...(inp.ss.sources || []), ...(inp.wh.sources || [])].filter((s) => ix.valueById.has(s)).concat(['ref:param.fed_underpayment_rate']),
      explanation: `The penalty treats ${fmt(used)} as withholding. Excess social security tax (${inp.ss.key}, ${fmt(excess)}) counts as withholding too. `
        + `Recomputing the regular method (installments of ${fmt(inp.required / inp.due.length)}, ${inp.rate * 100}% to ${inp.end}) reproduces the engine's ${fmt(engine)} `
        + `with ${fmt(used)}, and gives ${fmt(fixed)} with ${fmt(used + excess)}.`,
      effect: { federal: delta, basis: 'computed' },
    }];
  },
};

const NOT_COMPUTED = /\b(?:does not|did not|never) compute|\bnot computed\b/i;

/** A line whose rule the engine does not compute, held at its placeholder while an input carries an amount. */
export const lineNotComputed: Check = {
  id: 'CHK-LINE-NOT-COMPUTED',
  family: FAMILY,
  run(ix) {
    const rules = ix.packet.engine_reference.rules;
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const text = rules[line.rule ?? ''] ?? '';
      if (!NOT_COMPUTED.test(text)) continue;
      const live = (line.inputs || []).map((k) => ix.line(ix.latest.version, k)).filter((l): l is NonNullable<typeof l> => !!l && (num(l.value) ?? 0) !== 0);
      if (!live.length) continue;
      const open = ix.versions.filter((v) => v.diagnostics.some((d) => NOT_COMPUTED.test(d.message) && d.refs.some((r) => live.some((l) => l.key === r)))).map((v) => v.version);
      out.push({
        title: `${line.label}: never computed, though its input carries an amount`,
        claims: [lineClaim(line.key)],
        evidence: live.flatMap((l) => (l.sources || []).filter((s) => ix.valueById.has(s))),
        explanation: `${line.key} shows ${fmt(num(line.value) ?? 0)}, but its rule ${line.rule} says "${text}" `
          + `Its input ${live.map((l) => `${l.key} (${l.label}, ${fmt(num(l.value)!)})`).join(', ')} is not zero, so the figure is a placeholder, not a result`
          + (open.length ? `; the engine's own warning on it stayed open in ${open.join(', ')}` : '')
          + `. Compute it outside the engine, or record why it is zero, before approval.`,
        stopsEfile: true,
      });
    }
    return out;
  },
};

export const ignoredFieldChecks: Check[] = [paymentTaxYear, fxRateYear, penaltyWithholding, lineNotComputed];
