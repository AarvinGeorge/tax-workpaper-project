// The agent's calculator (ai/lib/calculator.ts) through the `verify` tool: the model picks the method and passes ids;
// our code does every number. Real packet, no network. Lines are chosen by probing the packet, never from the ledger.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks/index';
import { proofsFor } from '@/domain/proofs';
import { FLOW_RULES } from '@/domain/flow';
import { SSN_SHAPED, supersession } from '@/domain/ai/verify';
import { hiddenCheckIds, type AgentMode } from '../../ai/lib/modes';
import { DATA_NOTE, TOOL_RESULT_MAX_BYTES, runTool } from '../../ai/lib/agent-tools';
import { VERIFY_METHODS } from '../../ai/lib/calculator';

const ix = indexPacket(loadPacket());
type Res = { tool: string; note: string; data: Record<string, unknown> & { error?: string } };
const verify = (method: string, ids: unknown[], target: unknown = null, mode?: AgentMode) =>
  JSON.parse(runTool(ix, 'verify', { method, ids, target }, { mode })) as Res;
const num = (v: unknown) => (typeof v === 'number' ? v : null);
const lines = ix.latest.lines;
const arith = lines.filter((l) => !!l.rule && FLOW_RULES.includes(l.rule) && (l.inputs ?? []).length > 1 && num(l.value) !== null);
const inputVals = (l: (typeof lines)[number]) => (l.inputs ?? []).map((k) => num(ix.line(ix.latest.version, k)?.value));
const PAYLOAD_KEYS = ['title', 'explanation', 'receipt', 'effect', 'trigger', 'stopsEfile'];

describe('calculator: the methods', () => {
  it('offers exactly the planned methods', () => {
    expect([...VERIFY_METHODS].sort()).toEqual(['compare_to_limit', 'convert', 'duplicates', 'fact_copies', 'glossary', 'prior_year', 'recompute_line', 'sum_to']);
  });

  it('recompute_line: a sum line whose inputs add up agrees, difference 0, labelled as data', () => {
    const l = arith.find((x) => { const v = inputVals(x); return v.every((n) => n !== null) && Math.abs((v as number[]).reduce((s, n) => s + n, 0) - (x.value as number)) < 1; })!;
    expect(l).toBeDefined();
    const r = verify('recompute_line', [l.key]);
    expect(r.note).toBe(DATA_NOTE);
    expect(r.data).toMatchObject({ key: l.key, rule: l.rule, arithmetic: true, operation: 'sum', difference: 0, agrees: true });
  });

  it('recompute_line: a line its listed inputs cannot reach, by any sign, reports the difference (not "needs the engine")', () => {
    const l = arith.find((x) => {
      const v = inputVals(x);
      if (!v.every((n) => n !== null) || v.length > 12) return false;
      for (let mask = 0; mask < 1 << v.length; mask++) if (Math.abs(v.reduce((s: number, n, i) => s + (mask & (1 << i) ? -n! : n!), 0) - (x.value as number)) < 1) return false;
      return true;
    });
    expect(l).toBeDefined(); // the packet has such lines, so the method is exercised on a real mismatch
    const d = verify('recompute_line', [l!.key]).data;
    expect(d.arithmetic).toBe(true);
    expect(d.agrees).toBe(false);
    expect(d.signsReaching).toBeNull();
    expect(Math.abs(d.difference as number)).toBeGreaterThanOrEqual(1);
  });

  it('recompute_line: a sum line that legitimately subtracts names the signs that reach its value', () => {
    const l = arith.find((x) => {
      const v = inputVals(x);
      if (!v.every((n) => n !== null) || v.length > 12) return false;
      const plain = (v as number[]).reduce((s, n) => s + n, 0);
      return Math.abs(plain - (x.value as number)) >= 1 && v.length === 2 && Math.abs(v[0]! - v[1]! - (x.value as number)) < 1;
    });
    expect(l).toBeDefined();
    const d = verify('recompute_line', [l!.key]).data;
    expect(d.agrees).toBe(false);
    expect(d.signsReaching).toEqual([`+${l!.inputs[0]}`, `-${l!.inputs[1]}`]);
  });

  it('recompute_line: a rule past arithmetic needs the engine and quotes the rule\'s words', () => {
    const l = lines.find((x) => !!x.rule && !FLOW_RULES.includes(x.rule) && (x.inputs ?? []).length > 0)!;
    const d = verify('recompute_line', [l.key]).data;
    expect(d).toMatchObject({ arithmetic: false, needsEngine: true });
    expect(d.ruleText).toBe((ix.packet.engine_reference.rules as Record<string, string>)[l.rule!]);
  });

  it('sum_to: a proved line\'s own sources add to it', () => {
    const l = lines.find((x) => proofsFor(ix, x.key).some((p) => p.method === 'agreed_to_source_document' && p.refs.length > 1))!;
    const refs = proofsFor(ix, l.key).find((p) => p.method === 'agreed_to_source_document')!.refs;
    const d = verify('sum_to', refs, l.key).data;
    expect(d.agrees).toBe(true);
    expect((d.items as unknown[]).length).toBe(refs.length);
  });

  it('sum_to: two values compared report their difference', () => {
    const [a, b] = lines.filter((x) => num(x.value) !== null && num(x.value) !== 0).slice(0, 2);
    const d = verify('sum_to', [a.key], b.key).data;
    expect(d.difference).toBe((b.value as number) - (a.value as number));
  });

  it('prior_year: a line on last year\'s return gives both figures and the firm\'s variance test', () => {
    const r24 = (ix.packet.prior_years as { return_2024: { lines: Record<string, unknown> } }).return_2024.lines;
    const l = lines.find((x) => num(x.value) !== null && num(r24[x.key]) !== null)!;
    const d = verify('prior_year', [l.key]).data;
    expect(d).toMatchObject({ key: l.key, value: l.value, priorReturnValue: r24[l.key] });
    expect(d.firmVarianceRule).toMatchObject({ percent: 10, amount: 1000 });
    expect(typeof d.overFirmThreshold).toBe('boolean');
  });

  it('fact_copies: the copies of facts on a line, paged', () => {
    const l = lines.find((x) => ((verify('fact_copies', [x.key]).data.items as unknown[]) ?? []).length > 0);
    expect(l).toBeDefined();
  });

  it('glossary: the README entry for a term', () => {
    const d = verify('glossary', ['extracted_values']).data as { items: { term: string; text: string }[] };
    expect(d.items.some((e) => /value_type/.test(e.text))).toBe(true);
  });
});

describe('calculator: ids only', () => {
  it('a number, or a numeric string, where an id belongs is refused', () => {
    expect(verify('sum_to', [1200, 'F1040.1a'], null).data.error).toMatch(/ids, not numbers/);
    expect(verify('sum_to', ['1,200'], lines[0].key).data.error).toMatch(/ids, not numbers/);
    expect(verify('sum_to', [lines[0].key], '450').data.error).toMatch(/ids, not numbers/);
  });
  it('an unknown id or method is refused', () => {
    expect(verify('recompute_line', ['NOT.A.LINE']).data.error).toMatch(/No line/);
    expect(verify('sum_to', ['ev-99999'], lines[0].key).data.error).toMatch(/Unknown id/);
    expect(verify('divide', [lines[0].key]).data.error).toMatch(/Unknown method/);
  });
  it('a value that is not an amount (an identifier, a date) cannot be added', () => {
    const ssnV = ix.packet.extracted_values.find((v) => v.value_type === 'ssn')!;
    const r = runTool(ix, 'verify', { method: 'sum_to', ids: [ssnV.id], target: lines[0].key });
    expect((JSON.parse(r) as Res).data.error).toMatch(/not an amount/);
    expect(SSN_SHAPED.test(r)).toBe(false);
  });
});

describe('calculator: modes and bounds', () => {
  it('blind-v3 (the v3 baseline definition): fact_copies returns agreements only', () => {
    let disagree = 0;
    for (const l of lines) {
      const items = (verify('fact_copies', [l.key], null, { kind: 'blind-v3' }).data.items as { agree: boolean }[]) ?? [];
      expect(items.every((i) => i.agree), l.key).toBe(true);
      disagree += ((verify('fact_copies', [l.key]).data.items as { agree: boolean }[]) ?? []).filter((i) => !i.agree).length;
    }
    expect(disagree).toBeGreaterThan(0); // default mode has disagreements, so blind-v3 really removed something
  });

  it('blind (independent): fact_copies returns every comparison, disagreements with their values, without the finding payload', () => {
    let disagree = 0;
    for (const t of [...lines.map((l) => l.key), ...ix.packet.documents.map((d) => d.id)]) {
      const b = (verify('fact_copies', [t], null, { kind: 'blind' }).data.items as Record<string, unknown>[]) ?? [];
      const d = (verify('fact_copies', [t]).data.items as Record<string, unknown>[]) ?? [];
      const raw = (i: Record<string, unknown>) => JSON.stringify([i.rule, i.agree, i.claims, i.copies]);
      expect(b.map(raw), t).toEqual(d.map(raw)); // the same comparisons, in the same order, as default
      for (const i of b) {
        for (const k of PAYLOAD_KEYS) expect(i, `${t} ${k}`).not.toHaveProperty(k);
        expect(Object.keys(i).sort()).toEqual(['agree', 'claims', 'copies', 'rule']);
      }
      for (const i of b.filter((x) => !x.agree)) {
        disagree++;
        expect((i.copies as { shown: unknown }[]).every((c) => typeof c.shown === 'string'), t).toBe(true);
      }
    }
    expect(disagree).toBeGreaterThan(0);
    // default keeps the comparison wording (unchanged output)
    const anyDefault = lines.flatMap((l) => (verify('fact_copies', [l.key]).data.items as Record<string, unknown>[]) ?? []);
    expect(anyDefault.every((i) => typeof i.title === 'string' && 'explanation' in i && 'receipt' in i)).toBe(true);
  });

  it('hide-checks: the hidden checks\' findings never appear in any verify result', () => {
    const mode: AgentMode = { kind: 'hide-checks', seed: 7 };
    const hidden = new Set(hiddenCheckIds(7));
    const gone = runChecks(ix).filter((f) => hidden.has(f.checkId));
    expect(gone.length).toBeGreaterThan(0);
    const all = lines.map((l) => runTool(ix, 'verify', { method: 'fact_copies', ids: [l.key], target: null }, { mode })).join('\n');
    for (const f of gone) expect(all.includes(JSON.stringify(f.title).slice(1, -1)), f.title).toBe(false);
  });

  it('every result on every line is bounded, masked and free of check or ledger ids', () => {
    const out: string[] = [];
    for (const l of lines) for (const m of ['recompute_line', 'prior_year', 'fact_copies']) out.push(runTool(ix, 'verify', { method: m, ids: [l.key], target: null }));
    for (const r of out) {
      expect(Buffer.byteLength(r)).toBeLessThanOrEqual(TOOL_RESULT_MAX_BYTES);
      expect(SSN_SHAPED.test(r)).toBe(false);
      expect(r).not.toMatch(/CHK-[A-Z]|GT-[A-Z]\d\d/);
    }
  });
});

describe('calculator: review fixes (Fable, 9f014cc)', () => {
  it('hide-checks, several seeds: a disagreement only hidden findings claim is returned raw, without the finding payload (replaces the claims filter on purpose)', () => {
    const all = runChecks(ix);
    let measured = 0;
    for (const seed of [1, 3, 7, 11, 13]) {
      const mode: AgentMode = { kind: 'hide-checks', seed };
      const hidden = new Set(hiddenCheckIds(seed));
      const hiddenClaims = new Set(all.filter((f) => hidden.has(f.checkId)).flatMap((f) => f.claims));
      const visibleClaims = new Set(all.filter((f) => !hidden.has(f.checkId)).flatMap((f) => f.claims));
      const hiddenOnly = (c: string) => hiddenClaims.has(c) && !visibleClaims.has(c);
      const targets = [...lines.map((l) => l.key), ...ix.packet.documents.map((d) => d.id)];
      for (const t of targets) {
        for (let c: number | null = 0; c !== null;) {
          const r = JSON.parse(runTool(ix, 'verify', { method: 'fact_copies', ids: [t], target: null, limit: 50, cursor: c }, { mode })) as { data: { items?: Record<string, unknown>[]; nextCursor?: number | null } };
          for (const i of r.data.items ?? []) {
            if (!i.agree && (i.claims as string[]).some(hiddenOnly)) {
              measured++;
              for (const k of PAYLOAD_KEYS) expect(i, `seed ${seed} ${t} ${k}`).not.toHaveProperty(k);
            }
          }
          c = r.data.nextCursor ?? null;
        }
      }
    }
    expect(measured).toBeGreaterThan(0); // the seeds really hide claims no visible finding makes, and those comparisons stay
  });

  it('prior_year: a sign error is visible (amount agrees, sign does not)', () => {
    const l = lines.find((x) => {
      const d = verify('prior_year', [x.key]).data;
      return typeof d.priorRecordsTotal === 'number' && typeof x.value === 'number' && x.value !== 0 && Math.abs(Math.abs(d.priorRecordsTotal) - Math.abs(x.value)) < 1 && Math.sign(d.priorRecordsTotal) !== Math.sign(x.value);
    });
    expect(l).toBeDefined(); // the packet has carryover lines stored with the opposite sign to last year's record
    const d = verify('prior_year', [l!.key]).data;
    expect(d).toMatchObject({ amountAgreesWithPriorRecords: true, signAgreesWithPriorRecords: false, agreesWithPriorRecords: false });
  });

  it('recompute_line: an agreeing line says "all +" instead of listing every input again; results stay small', () => {
    let agreeing = 0;
    for (const l of lines) {
      const r = runTool(ix, 'verify', { method: 'recompute_line', ids: [l.key], target: null });
      expect(Buffer.byteLength(r), l.key).toBeLessThanOrEqual(6_000);
      const d = (JSON.parse(r) as Res).data;
      if (d.agrees === true) { agreeing++; expect(d.signsReaching, l.key).toBe('all +'); }
    }
    expect(agreeing).toBeGreaterThan(0);
  });

  it('glossary: paged with limit and cursor, the total given', () => {
    const page1 = verify('glossary', ['value']).data as { total: number; items: unknown[]; nextCursor: number | null };
    const total = page1.total;
    expect(total).toBeGreaterThan(3);
    const a = JSON.parse(runTool(ix, 'verify', { method: 'glossary', ids: ['value'], target: null, limit: 3, cursor: 0 })) as { data: { items: unknown[]; nextCursor: number | null; total: number } };
    expect(a.data.items).toHaveLength(3);
    expect(a.data.nextCursor).toBe(3);
    const seen = [...a.data.items];
    for (let c: number | null = 3; c !== null;) {
      const r = JSON.parse(runTool(ix, 'verify', { method: 'glossary', ids: ['value'], target: null, limit: 3, cursor: c })) as { data: { items: unknown[]; nextCursor: number | null } };
      seen.push(...r.data.items); c = r.data.nextCursor;
    }
    expect(seen).toHaveLength(total);
  });
});

// ---------- Task 2 (docs/superpowers/plans/2026-10-24-agent-cpa-toolkit.md): compare_to_limit, convert, duplicates ----------
const params = ix.packet.engine_reference.parameters as Record<string, unknown>;
const refsOf = (prefix: string) => lines.flatMap((l) => (l.sources ?? []).filter((s) => s.startsWith(prefix)).map((s) => ({ l, ref: s })));

describe('calculator: compare_to_limit', () => {
  it('a line against the numeric parameter it cites: value, parameter, relation, difference, and the judgment note', () => {
    const cited = refsOf('ref:param.').filter(({ ref }) => typeof params[ref.slice('ref:param.'.length)] === 'number');
    expect(cited.length).toBeGreaterThan(0);
    const relations = new Set<string>();
    for (const { l, ref } of cited) {
      const p = params[ref.slice('ref:param.'.length)] as number;
      const r = verify('compare_to_limit', [l.key], ref);
      expect(r.note).toBe(DATA_NOTE);
      const d = r.data;
      const diff = Math.round(((l.value as number) - p) * 100) / 100;
      expect(d, l.key).toMatchObject({ id: l.key, value: l.value, parameter: { ref, value: p }, difference: diff });
      const equal = Number.isInteger(p) ? Math.abs(diff) < 0.5 : diff === 0; // dollar limits within rounding; rates exactly
      expect(d.relation, l.key).toBe(equal ? 'equal' : diff > 0 ? 'above' : 'below');
      expect(String(d.note)).toMatch(/whether the parameter applies is your judgment/);
      relations.add(d.relation as string);
    }
    expect(relations.size).toBeGreaterThan(1); // the packet gives more than one relation, so the field is really computed
  });

  it('an extracted value can be compared too; a bare parameter name is accepted', () => {
    const v = ix.packet.extracted_values.find((x) => x.value_type === 'money' && typeof x.value === 'number' && x.value > 0)!;
    const name = Object.keys(params).find((k) => typeof params[k] === 'number')!;
    const a = verify('compare_to_limit', [v.id], `ref:param.${name}`).data;
    const b = verify('compare_to_limit', [v.id], name).data;
    expect(a).toMatchObject({ id: v.id, value: v.value, parameter: { ref: `ref:param.${name}`, value: params[name] } });
    expect(b).toEqual(a);
  });

  it('list or dict parameters need the engine; an unknown parameter, a missing target or a number as target is refused', () => {
    const l = lines.find((x) => typeof x.value === 'number')!;
    const list = Object.keys(params).find((k) => Array.isArray(params[k]))!;
    const dict = Object.keys(params).find((k) => !!params[k] && typeof params[k] === 'object' && !Array.isArray(params[k]))!;
    expect(list && dict).toBeTruthy();
    expect(verify('compare_to_limit', [l.key], `ref:param.${list}`).data.error).toMatch(/needs the engine/);
    expect(verify('compare_to_limit', [l.key], `ref:param.${dict}`).data.error).toMatch(/needs the engine/);
    expect(verify('compare_to_limit', [l.key], 'ref:param.not_a_parameter').data.error).toMatch(/Unknown parameter/);
    expect(verify('compare_to_limit', [l.key], null).data.error).toMatch(/needs a target/);
    expect(verify('compare_to_limit', [l.key], 31500).data.error).toMatch(/ids, not numbers/);
    expect(verify('compare_to_limit', [l.key], '31,500').data.error).toMatch(/ids, not numbers/);
    const ssnV = ix.packet.extracted_values.find((v) => v.value_type === 'ssn')!;
    expect(verify('compare_to_limit', [ssnV.id], `ref:param.${Object.keys(params).find((k) => typeof params[k] === 'number')}`).data.error).toMatch(/not an amount/);
  });
});

describe('calculator: convert', () => {
  const fxRates = ix.packet.fx_rates as Record<string, Record<string, number>>;
  const fxKey = Object.keys(fxRates).find((k) => /^[A-Z]{3}_per_[A-Z]{3}$/.test(k))!;
  const [A, B] = fxKey.split('_per_');

  it('a line citing a value and an fx rate: amount, rate, the result both ways, labelled by the key\'s direction', () => {
    const cited = lines.map((l) => ({ l, fx: (l.sources ?? []).find((s) => s.startsWith('ref:fx.')), ev: (l.sources ?? []).find((s) => s.startsWith('ev-')) })).filter((x) => x.fx && x.ev);
    expect(cited.length).toBeGreaterThan(0);
    let reached = 0;
    for (const { l, fx, ev } of cited) {
      const amount = ix.valueById.get(ev!)!.value as number;
      const rate = (params.fx as Record<string, Record<string, number>>)[fx!.split('.')[1]][fx!.split('.')[2]];
      const d = verify('convert', [ev!], fx!).data as Record<string, unknown> & { results: { from: string; to: string; result: number }[] };
      expect(d, l.key).toMatchObject({ id: ev, amount, rate: { ref: fx, value: rate, key: `${fxKey}.${fx!.split('.')[2]}`, per: `${A} per ${B}` } });
      expect(d.results).toEqual([
        { from: A, to: B, operation: `amount / ${rate}`, result: Math.round((amount / rate) * 100) / 100 },
        { from: B, to: A, operation: `amount x ${rate}`, result: Math.round(amount * rate * 100) / 100 },
      ]);
      if (Math.abs((amount / rate) - (l.value as number)) < 1) reached++;
    }
    expect(reached).toBeGreaterThan(0); // some line is the cited value converted at its cited rate
  });

  it('the fx_rates key form gives the same figures; a line id converts its value', () => {
    const rateName = Object.keys(fxRates[fxKey])[0];
    const ref = `ref:fx.${A}.${rateName}`;
    const v = ix.packet.extracted_values.find((x) => x.value_type === 'money' && typeof x.value === 'number' && x.value > 0)!;
    const a = verify('convert', [v.id], ref).data as { results: unknown };
    const b = verify('convert', [v.id], `${fxKey}.${rateName}`).data as { results: unknown };
    expect(b.results).toEqual(a.results);
    const l = lines.find((x) => typeof x.value === 'number' && x.value !== 0)!;
    expect(verify('convert', [l.key], ref).data).toMatchObject({ id: l.key, amount: l.value });
  });

  it('the rate\'s period and year against the return\'s tax year (Fable fix 1): a cited prior-year rate says false, a same-year rate true; every mode alike', () => {
    const taxYear = ix.packet.household.tax_year as number;
    const fxp = params.fx as Record<string, Record<string, number>>;
    const cited = lines.flatMap((l) => (l.sources ?? []).filter((s) => s.startsWith('ref:fx.')).map((fx) => ({ l, fx, ev: (l.sources ?? []).find((s) => s.startsWith('ev-'))! })));
    const wrong = cited.find(({ fx }) => !fx.split('.')[2].includes(String(taxYear)));
    expect(wrong).toBeDefined(); // the packet has a line citing another year's rate on this year's return
    const period = wrong!.fx.split('.')[2];
    const d = verify('convert', [wrong!.ev], wrong!.fx).data;
    expect(d.ratePeriod).toEqual({ period, year: Number(/\d{4}/.exec(period)![0]), taxYear, periodYearMatchesTaxYear: false });
    const same = Object.keys(fxp[A]).find((r) => r.includes(String(taxYear)))!;
    expect(verify('convert', [wrong!.ev], `ref:fx.${A}.${same}`).data.ratePeriod).toEqual({ period: same, year: taxYear, taxYear, periodYearMatchesTaxYear: true });
    expect(verify('convert', [wrong!.ev], `${fxKey}.${same}`).data.ratePeriod).toMatchObject({ periodYearMatchesTaxYear: true });
    for (const mode of [{ kind: 'blind' }, { kind: 'blind-v3' }, { kind: 'hide-checks', seed: 1 }] as AgentMode[]) {
      for (const { ev, fx } of cited) expect(verify('convert', [ev], fx, mode).data).toEqual(verify('convert', [ev], fx).data);
    }
  });

  it('an unknown rate is refused; a year typed as a number is refused', () => {
    const v = ix.packet.extracted_values.find((x) => x.value_type === 'money' && typeof x.value === 'number')!;
    expect(verify('convert', [v.id], `ref:fx.${A}.1999_average`).data.error).toMatch(/Unknown rate/);
    expect(verify('convert', [v.id], `ref:fx.${A}.2025`).data.error).toMatch(/Unknown rate/);
    expect(verify('convert', [v.id], 'XYZ_per_USD.2025_average').data.error).toMatch(/Unknown rate/);
    expect(verify('convert', [v.id], 2025).data.error).toMatch(/ids, not numbers/);
    expect(verify('convert', [v.id], '2025').data.error).toMatch(/ids, not numbers/);
    expect(verify('convert', [v.id], null).data.error).toMatch(/needs a target/);
  });
});

describe('calculator: duplicates', () => {
  // Probe: latest lines citing one nonzero amount-type value from 2+ distinct (document, page) pairs.
  const amountTypes = new Set(['money', 'integer', 'quantity']);
  const dupLines = lines.filter((l) => {
    const vs = (l.sources ?? []).map((s) => ix.valueById.get(s)).filter((v) => !!v && amountTypes.has(v.value_type) && typeof v.value === 'number' && v.value !== 0);
    const by = new Map<number, Set<string>>();
    for (const v of vs) by.set(v!.value as number, (by.get(v!.value as number) ?? new Set()).add(`${v!.document_id}#${v!.page}`));
    return [...by.values()].some((p) => p.size > 1);
  });

  it('a line id returns its same-amount pages, how alike each pair of them is, and the relation to the line', () => {
    expect(dupLines.length).toBeGreaterThan(0);
    for (const l of dupLines) {
      const d = verify('duplicates', [l.key]).data as { target: string; kind: string; items: { amount: number; ids: string[]; pages: string[]; relation: string; pairs: { pages: string[]; likeness: string; wordSimilarity: number }[] }[] };
      expect(d).toMatchObject({ target: l.key, kind: 'line' });
      expect(d.items.length, l.key).toBeGreaterThan(0);
      for (const i of d.items) {
        expect(i.pages.length).toBeGreaterThan(1);
        expect(['corroboration', 'double_count', 'neither']).toContain(i.relation);
        expect(i.pairs).toHaveLength((i.pages.length * (i.pages.length - 1)) / 2);
        for (const p of i.pairs) {
          expect(['identical', 'same_value_set', 'near', 'different']).toContain(p.likeness);
          expect(p.wordSimilarity).toBeGreaterThanOrEqual(0);
          expect(p.wordSimilarity).toBeLessThanOrEqual(1);
        }
      }
    }
    const plain = lines.find((l) => typeof l.value === 'number' && !dupLines.includes(l))!;
    expect((verify('duplicates', [plain.key]).data.items as unknown[])).toEqual([]);
    expect(String(verify('duplicates', [plain.key]).data.note)).toMatch(/No nonzero amount this line cites appears on two or more pages/); // Fable fix 2: the note survives paging
  });

  it('a document id returns its page pairs with superseded, landed and cited flags', () => {
    const sup = supersession(ix);
    const old = ix.packet.documents.find((d) => sup.has(d.id) && ((verify('duplicates', [d.id]).data.items as unknown[]) ?? []).length > 0);
    expect(old).toBeDefined(); // a correction re-sends pages: the superseded original has identical pages elsewhere
    const d = verify('duplicates', [old!.id]).data as { kind: string; items: { pages: string[]; likeness: string; superseded: boolean[]; landed: boolean[]; cited: boolean[]; lines: string[] }[] };
    expect(d.kind).toBe('document');
    for (const i of d.items) {
      expect(i.pages).toHaveLength(2);
      expect(i.pages.some((p) => p.startsWith(`${old!.id}#`))).toBe(true);
      expect(['identical', 'same_value_set', 'near']).toContain(i.likeness);
      expect(i.superseded).toEqual(i.pages.map((p) => sup.has(p.split('#')[0])));
      expect(i.landed.every((x) => typeof x === 'boolean')).toBe(true);
      expect(i.cited.every((x) => typeof x === 'boolean')).toBe(true);
    }
    expect(d.items.some((i) => i.likeness === 'identical')).toBe(true);
  });

  it('an unknown id is refused; every line and document result is bounded, masked and free of check or ledger ids', () => {
    expect(verify('duplicates', ['NOT.A.LINE']).data.error).toMatch(/No line or document/);
    const out: string[] = [];
    for (const t of [...lines.map((l) => l.key), ...ix.packet.documents.map((d) => d.id)]) {
      for (let c: number | null = 0; c !== null;) {
        const r = runTool(ix, 'verify', { method: 'duplicates', ids: [t], target: null, limit: 50, cursor: c });
        out.push(r);
        c = (JSON.parse(r) as { data: { nextCursor?: number | null } }).data.nextCursor ?? null;
      }
    }
    for (const r of out) {
      expect(Buffer.byteLength(r)).toBeLessThanOrEqual(TOOL_RESULT_MAX_BYTES);
      expect(SSN_SHAPED.test(r)).toBe(false);
      expect(r).not.toMatch(/CHK-[A-Z]|GT-[A-Z]\d\d/);
    }
  });

  it('the same result in every mode (no finding-derived field)', () => {
    const t = [...dupLines.map((l) => l.key), ...ix.packet.documents.map((d) => d.id)];
    for (const mode of [{ kind: 'blind' }, { kind: 'blind-v3' }, { kind: 'hide-checks', seed: 1 }] as AgentMode[]) {
      for (const id of t) expect(verify('duplicates', [id], null, mode).data, id).toEqual(verify('duplicates', [id]).data);
    }
  });
});
