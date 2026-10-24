// The agent's calculator (ai/lib/calculator.ts) through the `verify` tool: the model picks the method and passes ids;
// our code does every number. Real packet, no network. Lines are chosen by probing the packet, never from the ledger.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks/index';
import { proofsFor } from '@/domain/proofs';
import { FLOW_RULES } from '@/domain/flow';
import { SSN_SHAPED } from '@/domain/ai/verify';
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

describe('calculator: the methods', () => {
  it('offers exactly the planned methods', () => {
    expect([...VERIFY_METHODS].sort()).toEqual(['fact_copies', 'glossary', 'prior_year', 'recompute_line', 'sum_to']);
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
  it('blind: fact_copies returns agreements only', () => {
    let disagree = 0;
    for (const l of lines) {
      const items = (verify('fact_copies', [l.key], null, { kind: 'blind' }).data.items as { agree: boolean }[]) ?? [];
      expect(items.every((i) => i.agree), l.key).toBe(true);
      disagree += ((verify('fact_copies', [l.key]).data.items as { agree: boolean }[]) ?? []).filter((i) => !i.agree).length;
    }
    expect(disagree).toBeGreaterThan(0); // default mode has disagreements, so blind really removed something
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
  it('hide-checks, several seeds: no fact_copies disagreement has a claim only hidden findings claim', () => {
    const all = runChecks(ix);
    let measured = 0;
    for (const seed of [1, 3, 7, 11, 13]) {
      const mode: AgentMode = { kind: 'hide-checks', seed };
      const hidden = new Set(hiddenCheckIds(seed));
      const hiddenClaims = new Set(all.filter((f) => hidden.has(f.checkId)).flatMap((f) => f.claims));
      const visibleClaims = new Set(all.filter((f) => !hidden.has(f.checkId)).flatMap((f) => f.claims));
      const hiddenOnly = (c: string) => hiddenClaims.has(c) && !visibleClaims.has(c);
      measured += [...hiddenClaims].filter(hiddenOnly).length;
      const targets = [...lines.map((l) => l.key), ...ix.packet.documents.map((d) => d.id)];
      for (const t of targets) {
        for (let c: number | null = 0; c !== null;) {
          const r = JSON.parse(runTool(ix, 'verify', { method: 'fact_copies', ids: [t], target: null, limit: 50, cursor: c }, { mode })) as { data: { items?: { agree: boolean; claims: string[] }[]; nextCursor?: number | null } };
          for (const i of r.data.items ?? []) if (!i.agree) expect(i.claims.some(hiddenOnly), `seed ${seed} ${t} ${i.claims.join(',')}`).toBe(false);
          c = r.data.nextCursor ?? null;
        }
      }
    }
    expect(measured).toBeGreaterThan(0); // the seeds really hide claims no visible finding makes
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
