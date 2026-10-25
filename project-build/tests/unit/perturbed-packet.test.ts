// The perturbed packet (Task 0 of the CPA toolkit plan): a seeded, in-memory copy of the real packet with planted,
// generic numeric mistakes the checks were not written for, and the code-made list of what was planted (the gold).
// Offline: no network, no spend. The agent run here is a scripted fake transport.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket, validatePacket } from '@/domain/packet/load';
import type { AiPayload } from '@/domain/ai/contract';
import { runChecks } from '@/domain/checks/index';
import {
  PERTURBED_SEED, PLANT_KINDS, moneyText, packetDiff, parseMoney, perturbedPacket, versionChangeProblems,
} from '../fixtures/perturbed';
import { plantedReport, plantedScore } from '../../ai/lib/planted-score';
import { runTool, toolNamesFor } from '../../ai/lib/agent-tools';
import { VERIFY_METHODS } from '../../ai/lib/calculator';
import { agentOutFile, agentSystem, loadContextFiles, runAgent, writeRun } from '../../ai/lib/agent-core';
import { caseFile } from '../../ai/lib/case-file';
import type { AgentMode } from '../../ai/lib/modes';

const real = loadPacket();
const realIx = indexPacket(real);
const realJson = JSON.stringify(real);
const realFindings = runChecks(realIx);
const claimedReal = new Set(realFindings.flatMap((f) => f.claims).filter((c) => c.startsWith('line:')).map((c) => c.slice(5)));

const base = perturbedPacket(PERTURBED_SEED);
const pIx = indexPacket(base.packet);

const at = (root: unknown, p: string): unknown => {
  // Paths are packetDiff's: segments joined by '/', array elements by their id, key, version or page.
  let o: unknown = root;
  for (const seg of p.split('/')) {
    if (Array.isArray(o)) {
      o = o.find((x) => x && typeof x === 'object' && ['id', 'key', 'version', 'page'].some((k) => String((x as Record<string, unknown>)[k]) === seg)) ?? o[Number(seg)];
    } else o = o && typeof o === 'object' ? (o as Record<string, unknown>)[seg] : undefined;
  }
  return o;
};

describe('perturbed packet: determinism and isolation', () => {
  it('the same seed gives byte-identical JSON and planted list; two seeds differ', () => {
    const again = perturbedPacket(PERTURBED_SEED);
    expect(JSON.stringify(again.packet)).toBe(JSON.stringify(base.packet));
    expect(JSON.stringify(again.planted)).toBe(JSON.stringify(base.planted));
    const other = perturbedPacket(PERTURBED_SEED + 1);
    expect(JSON.stringify(other.planted)).not.toBe(JSON.stringify(base.planted));
    expect(JSON.stringify(other.packet)).not.toBe(JSON.stringify(base.packet));
  });

  it('the real packet is not mutated, and the copy still loads and validates like the real one', () => {
    const before = createHash('sha256').update(JSON.stringify(loadPacket())).digest('hex');
    perturbedPacket(PERTURBED_SEED + 2);
    expect(createHash('sha256').update(JSON.stringify(loadPacket())).digest('hex')).toBe(before);
    expect(JSON.stringify(loadPacket())).toBe(realJson);
    expect(pIx.counts.documents).toBe(realIx.counts.documents);
    expect(pIx.counts.versions).toBe(realIx.counts.versions);
    expect(validatePacket(base.packet).errors).toEqual(validatePacket(real).errors);
    expect(() => runChecks(pIx)).not.toThrow();
  });

  it('plants about 8 mistakes across every kind (one or two each) for the default seed; a skipped kind is reported, never forced', () => {
    const kinds = base.planted.map((p) => p.kind);
    expect(base.planted.length).toBeGreaterThanOrEqual(6);
    expect(base.planted.length).toBeLessThanOrEqual(10);
    for (const k of PLANT_KINDS) {
      const n = kinds.filter((x) => x === k).length;
      const skipped = base.skipped.some((s) => s.kind === k);
      expect(n > 0 || skipped, k).toBe(true);
      expect(n).toBeLessThanOrEqual(2);
    }
    for (const s of base.skipped) expect(PLANT_KINDS).toContain(s.kind);
  });
});

describe('perturbed packet: the planted list is exactly the difference', () => {
  const seeds = [PERTURBED_SEED, 2, 3, 11, 42];
  it.each(seeds)('seed %i: every difference against the real packet belongs to a planted entry, and every entry is a real difference', (seed) => {
    const { packet, planted } = seed === PERTURBED_SEED ? base : perturbedPacket(seed);
    const diff = packetDiff(real, packet);
    expect(diff.size).toBeGreaterThan(0); // the diff can see a change
    const touched = new Map<string, { before: unknown; after: unknown }[]>();
    for (const p of planted) for (const r of p.refs) touched.set(r.path, [...(touched.get(r.path) ?? []), r]);
    for (const k of diff.keys()) expect(touched.has(k), `unplanted difference ${k}`).toBe(true);
    for (const [k, chain] of touched) {
      expect(diff.has(k), `planted ref ${k} is no difference`).toBe(true);
      // Plants apply in order: each ref's first before is the real value, each after is the next before, the last after is final.
      expect(JSON.stringify(chain[0].before)).toBe(JSON.stringify(at(real, k)));
      for (let i = 1; i < chain.length; i++) expect(JSON.stringify(chain[i].before)).toBe(JSON.stringify(chain[i - 1].after));
      expect(JSON.stringify(chain.at(-1)!.after)).toBe(JSON.stringify(at(packet, k)));
    }
    for (const p of planted) {
      // The planted line(s) moved or their source did: each entry has a ref on its own target.
      expect(p.refs.length, p.kind).toBeGreaterThan(0);
      expect(p.lines.length).toBeGreaterThan(0);
      for (const l of p.lines) expect(p.claims).toContain(l);
    }
  });

  it.each(seeds)('seed %i: plants avoid every line a real finding claims, and no two plants share a target line', (seed) => {
    const { planted } = seed === PERTURBED_SEED ? base : perturbedPacket(seed);
    const lines = planted.flatMap((p) => p.lines);
    for (const l of lines) expect(claimedReal.has(l), l).toBe(false);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('the planted list never enters the packet: no note, label or field mentions it', () => {
    const text = JSON.stringify(base.packet);
    for (const s of [...PLANT_KINDS, 'planted', 'perturb']) expect(text.toLowerCase().includes(s), s).toBe(false);
    expect(readFileSync('tests/fixtures/perturbed.ts', 'utf8')).toMatch(/perturb/); // the search can find the word
  });
});

describe('perturbed packet: consistency (the mistakes look like real ones)', () => {
  const seeds = [PERTURBED_SEED, 2, 3, 11, 42];
  it.each(seeds)('seed %i: ancestors carry the delta in every version where they shared the value; no unlisted version change', (seed) => {
    const { packet, planted } = seed === PERTURBED_SEED ? base : perturbedPacket(seed);
    expect(versionChangeProblems(packet)).toEqual(versionChangeProblems(real));
    expect(versionChangeProblems(real)).toEqual([]);
    const ix = indexPacket(packet);
    const latest = ix.latest.version;
    for (const p of planted) for (const k of p.claims) {
      const rl = realIx.line(latest, k); const pl = ix.line(latest, k);
      if (!rl || !pl) continue;
      for (const rv of ix.versions) {
        const rOld = realIx.line(rv.version, k); const pOld = ix.line(rv.version, k);
        if (!rOld || !pOld) continue;
        // Where a version shared the latest value in the real packet, it shares it in the copy.
        if (JSON.stringify(rOld.value) === JSON.stringify(rl.value)) expect(pOld.value, `${rv.version} ${k}`).toEqual(pl.value);
      }
    }
  });

  it.each(seeds)('seed %i: the arithmetic still fits: every line whose operation fitted in the real packet fits in the copy', (seed) => {
    const { packet, planted } = seed === PERTURBED_SEED ? base : perturbedPacket(seed);
    const ix = indexPacket(packet);
    let moved = 0;
    for (const rv of ix.versions) {
      const g = realIx.flowGraph(rv.version);
      for (const k of g.order) {
        const ops = g.ops.get(k) ?? [];
        if (!ops.length) continue;
        if (planted.some((p) => p.claims.includes(k) && !p.lines.includes(k))) moved++;
        const vals = g.inputs.get(k)!.map((i) => ix.line(rv.version, i)?.value as number);
        const val = ix.line(rv.version, k)!.value as number;
        expect(ops.some((o) => Math.abs(o.apply(vals) - val) <= 0.5), `${rv.version} ${k}`).toBe(true);
      }
    }
    expect(moved).toBeGreaterThan(0); // the cascade really moved fitted lines
  });

  it.each(seeds)('seed %i: each changed or added value\'s text_as_read occurs once on its page and matches the new figure', (seed) => {
    const { packet } = seed === PERTURBED_SEED ? base : perturbedPacket(seed);
    const ix = indexPacket(packet);
    let seen = 0;
    for (const v of packet.extracted_values) {
      const r = realIx.valueById.get(v.id);
      if (r && JSON.stringify(r) === JSON.stringify(v)) continue;
      seen++;
      const page = ix.docById.get(v.document_id)!.pages.find((pg) => pg.page === v.page)!;
      expect(page.printed_content.split(v.text_as_read).length - 1, v.id).toBe(1);
      if (v.value_type === 'money') expect(parseMoney(v.text_as_read), v.id).toBe(v.value);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it.each(seeds)('seed %i: a document that gains a page counts it, and counts its new values', (seed) => {
    const { packet } = seed === PERTURBED_SEED ? base : perturbedPacket(seed);
    for (const d of packet.documents) {
      const r = realIx.docById.get(d.id)!;
      expect(d.page_count - r.page_count, d.id).toBe(d.pages.length - r.pages.length);
      const nNew = packet.extracted_values.filter((v) => v.document_id === d.id).length - (realIx.valuesByDoc.get(d.id)?.length ?? 0);
      expect(d.extraction.values - r.extraction.values, d.id).toBe(nNew);
    }
  });

  it('money text keeps the packet\'s own format', () => {
    expect(parseMoney('1,234.56')).toBe(1234.56);
    expect(parseMoney('-1,234.00')).toBe(-1234);
    expect(parseMoney('12.50')).toBe(12.5);
    expect(parseMoney('abc')).toBeNull();
    expect(moneyText('1,234.56', 2345.6)).toBe('2,345.60');
    expect(moneyText('-1,234.00', -987)).toBe('-987.00');
    expect(moneyText('120.00', 1120)).toBe('1,120.00');
  });

  it('each kind changes what its definition says', () => {
    const latest = pIx.latest.version;
    for (const p of base.planted) {
      const paths = p.refs.map((r) => r.path);
      const lineValue = (k: string) => paths.includes(`return_versions/${latest}/lines/${k}/value`);
      if (p.kind === 'source_changed') {
        // the document moves, the line does not: they no longer tie
        expect(paths.some((x) => /^extracted_values\/ev-\d+\/value$/.test(x))).toBe(true);
        expect(paths.some((x) => /\/printed_content$/.test(x))).toBe(true);
        for (const k of p.lines) expect(lineValue(k)).toBe(false);
      } else {
        for (const k of p.lines) expect(lineValue(k), `${p.kind} ${k}`).toBe(true);
      }
      if (p.kind === 'copied_twice' || p.kind === 'page_duplicated') {
        expect(paths.some((x) => /page_count$/.test(x))).toBe(true);
        expect(paths.some((x) => /^extracted_values\/ev-\d+$/.test(x))).toBe(true);
        expect(paths.some((x) => /\/sources$/.test(x))).toBe(true);
      }
      if (p.kind === 'prior_shift') {
        // the py record stays the truth; the 2025 line moves past the firm's variance rule
        expect(paths.some((x) => x.startsWith('prior_years'))).toBe(false);
        const k = p.lines[0];
        const vr = real.firm.starter_standards.variance_review as { flag_if_change_over_percent: number; and_over_amount: number };
        const d = Math.abs((pIx.line(latest, k)!.value as number) - (realIx.line(latest, k)!.value as number));
        expect(d).toBeGreaterThan(vr.and_over_amount);
        expect(d).toBeGreaterThan((vr.flag_if_change_over_percent / 100) * Math.abs(realIx.line(latest, k)!.value as number));
      }
      if (p.kind === 'fx_wrong_year') {
        const k = p.lines[0];
        const before = realIx.line(latest, k)!.sources.find((s) => s.startsWith('ref:fx.'))!;
        const after = pIx.line(latest, k)!.sources.find((s) => s.startsWith('ref:fx.'))!;
        expect(after).not.toBe(before);
        expect(after.split('.').at(-1)!.slice(0, 4)).not.toBe(before.split('.').at(-1)!.slice(0, 4)); // another year's rate
      }
    }
  });
});

describe('perturbed packet: nothing about the plants reaches the model', () => {
  const LEAK = new RegExp([...PLANT_KINDS, 'planted', 'perturb'].join('|'), 'i');
  const modes: [string, AgentMode][] = [['default', { kind: 'default' }], ['blind', { kind: 'blind' }], ['hide-checks', { kind: 'hide-checks', seed: 7 }]];
  const files = loadContextFiles(process.cwd());

  it('the pattern can fire', () => { expect(LEAK.test(JSON.stringify(base.planted))).toBe(true); });

  /** Every tool over the copy: every line and page, every list drained, every verify method on every planted line. */
  function sweep(mode: AgentMode): string[] {
    const out: string[] = [];
    const call = (name: string, input: Record<string, unknown>) => out.push(runTool(pIx, name, input, { mode }));
    const drain = (name: string, extra: Record<string, unknown>) => {
      let cursor: number | null = 0;
      while (cursor !== null) {
        const r = runTool(pIx, name, { ...extra, limit: 50, cursor }, { mode });
        out.push(r);
        cursor = (JSON.parse(r) as { data: { nextCursor?: number | null } }).data.nextCursor ?? null;
      }
    };
    const offered = new Set<string>(toolNamesFor(mode));
    for (const l of pIx.latest.lines) { call('get_line', { key: l.key }); call('verify', { method: 'recompute_line', ids: [l.key], target: null }); call('verify', { method: 'prior_year', ids: [l.key], target: null }); }
    for (const d of pIx.packet.documents) for (const p of d.pages) call('get_page', { doc: d.id, page: p.page });
    const plantedLines = base.planted.flatMap((p) => p.claims);
    for (const m of VERIFY_METHODS) for (const k of plantedLines) {
      if (m === 'glossary') continue;
      drain('verify', { method: m, ids: [k], target: m === 'sum_to' ? k : null });
    }
    for (const d of new Set(base.planted.flatMap((p) => p.refs.map((r) => r.path.match(/^documents\/(D\d+)/)?.[1]).filter(Boolean)))) drain('verify', { method: 'fact_copies', ids: [d], target: null });
    for (const t of ['interest', 'wages', 'carryover', 'exchange']) { drain('search_values', { text: t }); drain('verify', { method: 'glossary', ids: [], target: t }); }
    if (offered.has('run_checks')) drain('run_checks', {});
    drain('list_open_leftovers', { kind: null });
    return out;
  }

  it.each(modes)('%s mode: no tool result, case file or prompt names a plant', (_n, mode) => {
    const results = sweep(mode);
    expect(results.length).toBeGreaterThan(1500);
    for (const r of results) expect(LEAK.test(r), r.slice(0, 160)).toBe(false);
    expect(LEAK.test(caseFile(pIx, files.digest, mode))).toBe(false);
    expect(LEAK.test(JSON.stringify(agentSystem(pIx, files, mode)))).toBe(false);
  });

  it.each(modes)('%s mode: a fake-transport run over the copy writes run-meta and trace files that name no plant', async (_n, mode) => {
    const k = base.planted[0].lines[0];
    const pageRef = base.planted.flatMap((p) => p.refs.map((r) => r.path.match(/^documents\/(D\d+)\/pages\/(\d+)$/))).find(Boolean)!;
    let n = 0;
    const msg = (content: unknown[], stop: string) => ({ id: `m${++n}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason: stop, stop_details: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } });
    const use = (name: string, input: Record<string, unknown>) => ({ type: 'tool_use', id: `tu${++n}`, name, input });
    const offered = new Set<string>(toolNamesFor(mode));
    const calls1 = [
      use('get_line', { key: k }), use('verify', { method: 'recompute_line', ids: [k], target: null, limit: null, cursor: null }),
      use('verify', { method: 'fact_copies', ids: [k], target: null, limit: 50, cursor: 0 }), use('get_page', { doc: pageRef[1], page: Number(pageRef[2]) }),
      use('run_checks', { limit: 50, cursor: 0 }), use('list_open_leftovers', { kind: 'all', limit: 50, cursor: 0 }),
      use('search_values', { text: 'interest', limit: 50, cursor: 0 }),
    ].filter((t) => offered.has(t.name));
    const bodies: string[] = [];
    const fetch = async (_u: unknown, init?: RequestInit) => {
      bodies.push(String(init?.body));
      const body = bodies.length === 1 ? msg(calls1, 'tool_use') : msg([{ type: 'text', text: JSON.stringify({ suggestions: [], proposals: [] }) }], 'end_turn');
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const res = await runAgent({ ix: pIx, packetSha: 'abc', model: 'claude-opus-5-5', apiKey: 'sk-test', fetchImpl: fetch as never, files, mode, source: 'file', now: () => new Date('2026-10-24T00:00:00Z') });
    expect(res.ok).toBe(true);
    expect(bodies.length).toBe(2);
    for (const b of bodies) expect(LEAK.test(b)).toBe(false);
    const root = mkdtempSync(path.join(tmpdir(), 'pp-run-'));
    mkdirSync(path.join(root, 'ai', 'eval'), { recursive: true });
    const out = agentOutFile(root, mode, 'perturbed', PERTURBED_SEED);
    expect(writeRun(res, out)).toBe(true);
    const written = readdirSync(path.dirname(out));
    expect(written.length).toBe(3);
    for (const f of written) {
      expect(LEAK.test(f), f).toBe(false);
      expect(LEAK.test(readFileSync(path.join(path.dirname(out), f), 'utf8')), f).toBe(false);
    }
  });

  it('agent-side code never imports the planted list or its scoring', () => {
    // The loader and the CLI name the copy (as they name altered); nothing on the agent's side names the planted list.
    for (const f of ['ai/lib/agent-core.ts', 'ai/lib/agent-tools.ts', 'ai/lib/calculator.ts', 'ai/lib/case-file.ts', 'ai/lib/modes.ts', 'ai/lib/reader-core.ts', 'ai/lib/agent-packet.ts', 'ai/agent.ts']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/planted/i);
    }
    for (const f of ['ai/lib/agent-tools.ts', 'ai/lib/calculator.ts', 'ai/lib/case-file.ts', 'ai/lib/modes.ts', 'ai/lib/reader-core.ts']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/perturb/i);
    }
  });
});

describe('perturbed packet: scoring (offline)', () => {
  const pFindings = runChecks(pIx);

  it('scores the checks on new findings only (perturbed minus real, by check and claims)', () => {
    const s = plantedScore(pIx, base.planted, pFindings, { baseline: realFindings });
    const key = (f: { checkId: string; claims: string[] }) => `${f.checkId}|${[...f.claims].sort().join(',')}`;
    const realKeys = new Set(realFindings.map(key));
    expect(s.considered).toBe(pFindings.filter((f) => !realKeys.has(key(f))).length);
    expect(s.matched).toBeLessThanOrEqual(s.considered);
    expect(s.precision).toBe(s.considered ? s.matched / s.considered : 0);
    expect(s.perPlant).toHaveLength(base.planted.length);
    // The real packet scored against itself has no new findings: precision has no false base.
    expect(plantedScore(realIx, base.planted, realFindings, { baseline: realFindings }).considered).toBe(0);
  });

  it('counts a claim on the planted line apart from a claim on a cascade line only', () => {
    const withCascade = base.planted.find((p) => p.claims.length > p.lines.length)!;
    expect(withCascade).toBeTruthy();
    const onLine = { checkId: 'X', claims: [`line:${withCascade.lines[0]}`] };
    const onAncestor = { checkId: 'Y', claims: [`line:${withCascade.claims.find((c) => !withCascade.lines.includes(c))}`] };
    const nowhere = { checkId: 'Z', claims: ['line:NO.SUCH'] };
    const i = base.planted.indexOf(withCascade);
    const a = plantedScore(pIx, base.planted, [onLine] as never);
    expect(a.perPlant[i]).toMatchObject({ onLine: true, onCascade: false });
    const b = plantedScore(pIx, base.planted, [onAncestor, nowhere] as never);
    expect(b.perPlant[i]).toMatchObject({ onLine: false, onCascade: true });
    expect(b).toMatchObject({ considered: 2 });
    expect(b.matched).toBeGreaterThanOrEqual(1);
    expect(b.perKind[withCascade.kind].onCascadeOnly).toBeGreaterThanOrEqual(1);
  });

  it('scores an agent payload (grounded suggestions, by claim line) and sweep items (by key or ids)', () => {
    const p = base.planted[0];
    const page = pIx.packet.documents.find((d) => d.pages.length)!;
    const quote = page.pages[0].printed_content.slice(0, 30);
    const sug = (claims: string[], q = quote) => ({ id: 's', kind: 'other', claims, evidence: [{ doc: page.id, page: page.pages[0].page, quote: q }], rationale: 'r', confidence: 0.5 });
    const payload = { suggestions: [sug([`line:${p.lines[0]}`]), sug([p.lines[0]], 'not on the page at all, so ungrounded')], rejected: [] } as unknown as AiPayload;
    const s = plantedScore(pIx, base.planted, payload);
    expect(s.considered).toBe(1); // the ungrounded one never reaches a screen
    expect(s.perPlant[0].onLine).toBe(true);
    const items = plantedScore(pIx, base.planted, [{ kind: 'arithmetic_no_sign', key: p.lines[0] }, { kind: 'copies_disagree', ids: ['ev-0001'], lines: [p.lines[0]] }]);
    expect(items.considered).toBe(2);
    expect(items.perPlant[0].onLine).toBe(true);
  });

  it('reports per kind: checks caught, sweep surfaced, agent recorded (null until given)', () => {
    const r = plantedReport(pIx, base.planted, { findings: pFindings, baseline: realFindings });
    for (const k of new Set(base.planted.map((p) => p.kind))) {
      expect(r.perKind[k].plants).toBe(base.planted.filter((p) => p.kind === k).length);
      expect(r.perKind[k].checks).toMatchObject({ onLine: expect.any(Number), onCascadeOnly: expect.any(Number) });
      expect(r.perKind[k].sweep).toBeNull();
      expect(r.perKind[k].agent).toBeNull();
    }
    expect(r.checks.precision).toBeGreaterThanOrEqual(0);
  });
});

describe('perturbed packet: the CLI and loader', () => {
  it('file mode loads the seeded copy and hashes its JSON; the output file names no plant', async () => {
    const { loadAgentPacket } = await import('../../ai/lib/agent-packet');
    const got = await loadAgentPacket({ env: {}, root: process.cwd(), packet: 'perturbed', seed: PERTURBED_SEED });
    expect(got.source).toBe('file');
    expect(JSON.stringify(got.ix.packet)).toBe(JSON.stringify(base.packet));
    expect(got.packetSha).toBe(createHash('sha256').update(JSON.stringify(base.packet)).digest('hex'));
    const f = agentOutFile('/r', { kind: 'blind' }, 'perturbed', 5);
    expect(f).toBe(path.join('/r', 'ai', 'eval', 'agent-suggestions.blind.seed-5.json'));
    expect(/perturb|plant/i.test(f)).toBe(false);
  });

  it('the CLI takes --packet perturbed --seed N', () => {
    const src = readFileSync('ai/agent.ts', 'utf8');
    expect(src).toMatch(/'perturbed'/);
    expect(src).toMatch(/--seed/);
  });
});

