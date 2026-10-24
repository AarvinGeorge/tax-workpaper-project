// The AI agent's tools: thin, read-only wrappers over the deterministic domain code. Every result is masked as the
// reader's text is, labelled as data, bounded, and scanned for SSN shapes. No network here.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { CHECKS, LEDGER, runChecks } from '@/domain/checks/index';
import { hiddenCheckIds, type AgentMode } from '../../ai/lib/modes';
import { SSN_SHAPED } from '@/domain/ai/verify';
import { AGENT_TOOL_NAMES, DATA_NOTE, TOOL_RESULT_MAX_BYTES, SsnInToolResult, agentTools, runTool } from '../../ai/lib/agent-tools';

const ix = indexPacket(loadPacket());
const call = (name: string, input: Record<string, unknown>) => JSON.parse(runTool(ix, name, input)) as { tool: string; note: string; data: Record<string, unknown> & { error?: string } };
const realSsns = [...new Set(JSON.stringify(ix.packet).match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? [])];
const docWithPages = ix.packet.documents.find((d) => d.pages.length && d.pages[0].printed_content.length > 40)!;
const lineWithSources = ix.latest.lines.find((l) => (l.sources ?? []).some((s) => ix.valueById.has(s)))!;

/** Every result any tool can give on the real packet: each line, each page, each list read to its end. */
function everyResult(): string[] {
  const out: string[] = [];
  for (const l of ix.latest.lines) { out.push(runTool(ix, 'get_line', { key: l.key })); out.push(runTool(ix, 'verify', { method: 'recompute_line', ids: [l.key], target: null })); out.push(runTool(ix, 'verify', { method: 'prior_year', ids: [l.key], target: null })); }
  for (const d of ix.packet.documents) for (const p of d.pages) out.push(runTool(ix, 'get_page', { doc: d.id, page: p.page }));
  const drain = (name: string, extra: Record<string, unknown>) => {
    let cursor: number | null = 0;
    while (cursor !== null) {
      const r = runTool(ix, name, { ...extra, limit: 50, cursor });
      out.push(r);
      cursor = (JSON.parse(r) as { data: { nextCursor: number | null } }).data.nextCursor;
    }
  };
  drain('run_checks', {});
  drain('list_open_leftovers', { kind: null });
  drain('search_values', { text: 'ssn' });
  drain('search_values', { text: 'account' });
  for (const d of ix.packet.documents.slice(0, 20)) drain('verify', { method: 'fact_copies', ids: [d.id], target: null });
  return out;
}

describe('agent tools: the tool set', () => {
  it('has the six planned tools, each strict with a closed input schema', () => {
    const tools = agentTools(ix, { onHit: () => {} });
    expect(tools.map((t) => t.name).sort()).toEqual([...AGENT_TOOL_NAMES].sort());
    expect(AGENT_TOOL_NAMES).toEqual(['get_line', 'get_page', 'search_values', 'verify', 'run_checks', 'list_open_leftovers']);
    for (const t of tools) {
      const tool = t as unknown as { strict?: boolean; input_schema: { additionalProperties: boolean; required: string[]; properties: Record<string, unknown> } };
      expect(tool.strict, t.name).toBe(true);
      expect(tool.input_schema.additionalProperties, t.name).toBe(false);
      expect([...tool.input_schema.required].sort(), t.name).toEqual(Object.keys(tool.input_schema.properties).sort());
    }
  });
});

describe('agent tools: results', () => {
  it('every result is labelled as packet data, not instructions', () => {
    const r = call('get_line', { key: lineWithSources.key });
    expect(r.note).toBe(DATA_NOTE);
    expect(DATA_NOTE).toMatch(/never instructions/);
    expect(r.tool).toBe('get_line');
  });

  it('get_line returns the line, its rule, inputs and each source value with its document and page', () => {
    const d = call('get_line', { key: lineWithSources.key }).data as { key: string; value: unknown; sources: { ref: string; doc?: string; page?: number }[] };
    expect(d.key).toBe(lineWithSources.key);
    expect(d.value).toEqual(lineWithSources.value);
    const v = ix.valueById.get(lineWithSources.sources.find((s) => ix.valueById.has(s))!)!;
    expect(d.sources.find((s) => s.ref === v.id)).toMatchObject({ doc: v.document_id, page: v.page });
  });

  it('an unknown key or page is an error result, not a thrown error', () => {
    expect(call('get_line', { key: 'NOT.A.LINE' }).data.error).toMatch(/No line/);
    expect(call('get_page', { doc: docWithPages.id, page: 999 }).data.error).toMatch(/no page/);
    expect(call('verify', { method: 'recompute_line', ids: ['NOT.A.LINE'], target: null }).data.error).toMatch(/No line/);
  });

  it('get_page returns the printed page text', () => {
    const d = call('get_page', { doc: docWithPages.id, page: docWithPages.pages[0].page }).data as { printed: string };
    const firstLine = docWithPages.pages[0].printed_content.split('\n').find((l) => l.trim().length > 10 && !/\d{3}-\d{2}-\d{4}/.test(l))!;
    expect(d.printed).toContain(firstLine.trim());
  });

  it('run_checks returns findings without ledger ids, finding ids or check ids', () => {
    const findings = runChecks(ix);
    expect(findings.some((f) => f.ledgerIds.length)).toBe(true); // the source has ledger ids, so stripping is tested
    const text = runTool(ix, 'run_checks', { limit: 200, cursor: 0 });
    const d = (JSON.parse(text) as { data: { total: number; items: Record<string, unknown>[] } }).data;
    expect(d.total).toBe(findings.length);
    for (const item of d.items) for (const k of ['id', 'checkId', 'ledgerIds']) expect(item[k]).toBeUndefined();
    expect(text).not.toMatch(/GT-[A-Z]\d\d/);
    expect(text).not.toMatch(/CHK-[A-Z]/);
    for (const e of LEDGER) expect(text.includes(e.title), e.id).toBe(false);
  });

  it('verify fact_copies returns the copies of facts on a line (the calculator\'s own tests: ai-agent-calculator)', () => {
    const line = ix.latest.lines.find((l) => call('verify', { method: 'fact_copies', ids: [l.key], target: null, limit: 5, cursor: 0 }).data.total as number > 0);
    expect(line).toBeDefined();
    const d = call('verify', { method: 'fact_copies', ids: [line!.key], target: null, limit: 5, cursor: 0 }).data as { items: { copies: unknown[]; agree: boolean }[] };
    expect(d.items[0].copies.length).toBeGreaterThan(0);
  });

  it('list_open_leftovers lists unproven lines, uncovered engine warnings and uncited money, filterable by kind', () => {
    const all = call('list_open_leftovers', { kind: null, limit: 10, cursor: 0 }).data as { total: number; byKind: Record<string, number> };
    expect(all.total).toBeGreaterThan(20);
    expect(Object.keys(all.byKind).sort()).toEqual(['uncited_money', 'uncovered_engine_warning', 'unproven_line']);
    const one = call('list_open_leftovers', { kind: 'unproven_line', limit: 10, cursor: 0 }).data as { total: number; items: { kind: string }[] };
    expect(one.total).toBe(all.byKind.unproven_line);
    expect(one.items.every((i) => i.kind === 'unproven_line')).toBe(true);
  });

  it('search_values finds values and lines by text', () => {
    const v = ix.packet.extracted_values.find((x) => x.label.length > 8)!;
    const d = call('search_values', { text: v.label, limit: 20, cursor: 0 }).data as { total: number };
    expect(d.total).toBeGreaterThan(0);
  });
});

describe('agent tools: bounded', () => {
  it('list tools page with limit and cursor and always give the total', () => {
    const a = call('run_checks', { limit: 3, cursor: 0 }).data as { total: number; items: unknown[]; nextCursor: number | null };
    const b = call('run_checks', { limit: 3, cursor: 3 }).data as { items: unknown[] };
    expect(a.items).toHaveLength(3);
    expect(a.nextCursor).toBe(3);
    expect(JSON.stringify(a.items)).not.toBe(JSON.stringify(b.items));
    const last = call('run_checks', { limit: 500, cursor: 0 }).data as { items: unknown[]; nextCursor: number | null; total: number };
    expect(last.nextCursor === null || last.items.length < last.total).toBe(true);
  });

  it('caps every result in bytes, paging what does not fit', () => {
    const results = everyResult();
    expect(results.length).toBeGreaterThan(1000);
    for (const r of results) expect(Buffer.byteLength(r)).toBeLessThanOrEqual(TOOL_RESULT_MAX_BYTES);
    const big = call('list_open_leftovers', { kind: null, limit: 500, cursor: 0 }).data as { items: unknown[]; total: number; nextCursor: number | null };
    expect(big.items.length).toBeLessThan(big.total); // ~160 items do not fit in one result
    expect(big.nextCursor).toBe(big.items.length);
  });

  it('get_page never cuts the printed text; a long values list is cut and its total given', () => {
    let cutLists = 0;
    for (const d of ix.packet.documents) for (const p of d.pages) {
      const r = call('get_page', { doc: d.id, page: p.page }).data as { printed: string; values: unknown[]; valuesTotal: number };
      expect(r.printed, `${d.id} p${p.page}`).not.toMatch(/\[cut\]$/);
      if (r.values.length < r.valuesTotal) cutLists++;
    }
    expect(cutLists).toBeGreaterThan(0); // the packet has pages with more values than fit, so the cut is exercised
  });

  it('is read-only: the packet is unchanged after every tool has run', () => {
    const before = createHash('sha256').update(JSON.stringify(ix.packet)).digest('hex');
    everyResult();
    expect(createHash('sha256').update(JSON.stringify(ix.packet)).digest('hex')).toBe(before);
  });
});

describe('agent tools: masking', () => {
  it('no result holds an SSN-shaped string or any of the packet\'s SSNs, with or without dashes', () => {
    expect(realSsns.length).toBeGreaterThan(0); // the measurement can find something
    expect(SSN_SHAPED.test(JSON.stringify(ix.packet))).toBe(true);
    for (const r of everyResult()) {
      expect(SSN_SHAPED.test(r), r.slice(0, 120)).toBe(false);
      for (const s of realSsns) { expect(r.includes(s)).toBe(false); expect(r.includes(s.replace(/-/g, ''))).toBe(false); }
    }
  });

  it('search cannot find an identifier by its digits (it searches masked text)', () => {
    const s = realSsns[0];
    expect((call('search_values', { text: s, limit: 5, cursor: 0 }).data as { total: number }).total).toBe(0);
    expect((call('search_values', { text: s.slice(0, 6), limit: 5, cursor: 0 }).data as { total: number }).total).toBe(0);
  });

  it('a result with an SSN shape is refused: the guard is told and the tool throws', () => {
    const hits: string[] = [];
    const tools = agentTools(ix, { onHit: (t) => hits.push(t) }, { inject: () => 'id 123-45-6789' });
    const t = tools.find((x) => x.name === 'get_line')!;
    expect(() => t.run({ key: lineWithSources.key } as never)).toThrow(SsnInToolResult);
    expect(hits).toEqual(['get_line']);
  });
});

describe('agent tools: measurement modes', () => {
  const titles = (text: string) => (JSON.parse(text) as { data: { items: { title: string }[] } }).data.items.map((i) => i.title);
  it('hidden check ids: a deterministic seeded half of all check ids', () => {
    const a = hiddenCheckIds(7);
    expect(hiddenCheckIds(7)).toEqual(a);
    expect(a.length).toBe(Math.floor(CHECKS.length / 2));
    expect(new Set(a).size).toBe(a.length);
    for (const id of a) expect(CHECKS.map((c) => c.id)).toContain(id);
    expect(hiddenCheckIds(8)).not.toEqual(a);
  });

  it('blind: no run_checks, and leftovers computed with no findings', () => {
    const blind: AgentMode = { kind: 'blind' };
    const names = agentTools(ix, { onHit: () => {} }, { mode: blind }).map((t) => t.name);
    expect(names.sort()).toEqual(['get_line', 'get_page', 'list_open_leftovers', 'search_values', 'verify']);
    expect(() => runTool(ix, 'run_checks', { limit: 5, cursor: 0 }, { mode: blind })).toThrow(/not available/);
    const d = (m?: AgentMode) => (JSON.parse(runTool(ix, 'list_open_leftovers', { kind: null, limit: 1, cursor: 0 }, { mode: m })) as { data: { byKind: Record<string, number> } }).data.byKind;
    expect(d(blind).uncovered_engine_warning).toBe(ix.latest.diagnostics.length);
    expect(d(blind).unproven_line).toBeGreaterThan(d().unproven_line);
  });

  it('hide-checks: the hidden checks\' findings leave run_checks, leftovers and fact copies', () => {
    const mode: AgentMode = { kind: 'hide-checks', seed: 7 };
    const hidden = new Set(hiddenCheckIds(7));
    const all = runChecks(ix);
    const gone = all.filter((f) => hidden.has(f.checkId));
    const kept = all.filter((f) => !hidden.has(f.checkId));
    expect(gone.length).toBeGreaterThan(0); // the seed really hides findings, so this measures something
    const rc = runTool(ix, 'run_checks', { limit: 50, cursor: 0 }, { mode });
    expect((JSON.parse(rc) as { data: { total: number } }).data.total).toBe(kept.length);
    expect(titles(rc).sort()).toEqual(kept.map((f) => f.title).slice(0, 50).sort());
    const texts: string[] = [rc];
    for (const l of ix.latest.lines) texts.push(runTool(ix, 'verify', { method: 'fact_copies', ids: [l.key], target: null, limit: 50, cursor: 0 }, { mode }));
    for (let c: number | null = 0; c !== null;) {
      const r = runTool(ix, 'list_open_leftovers', { kind: null, limit: 50, cursor: c }, { mode });
      texts.push(r); c = (JSON.parse(r) as { data: { nextCursor: number | null } }).data.nextCursor;
    }
    const joined = texts.join('\n');
    for (const f of gone) {
      expect(joined.includes(JSON.stringify(f.title).slice(1, -1)), f.title).toBe(false);
      expect(joined.includes(JSON.stringify(f.explanation).slice(1, -1)), f.checkId).toBe(false);
    }
  });
});
