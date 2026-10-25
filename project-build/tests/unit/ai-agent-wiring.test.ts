/* eslint-disable @typescript-eslint/no-explicit-any -- tool results are loose JSON read field by field in these tests */
// Task 4: verify_all and lookup in the agent's tool list. Offline, no network. Cases come from probing the packet.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { agentTools, runTool, toolNamesFor } from '../../ai/lib/agent-tools';
import { LOOKUP_SECTIONS } from '../../ai/lib/lookup';
import { VERIFY_ALL_KINDS } from '../../ai/lib/verify-all';
import type { AgentMode } from '../../ai/lib/modes';

const ix = indexPacket(loadPacket());
const MODES: AgentMode[] = [{ kind: 'default' }, { kind: 'blind' }, { kind: 'blind-v3' }, { kind: 'hide-checks', seed: 7 }];
const run = (name: string, input: Record<string, unknown>, mode: AgentMode = MODES[0]) => runTool(ix, name, input, { mode });
const data = (name: string, input: Record<string, unknown>, mode?: AgentMode) => (JSON.parse(run(name, input, mode)) as { data: Record<string, any> }).data;

describe('tool list: verify_all and lookup', () => {
  it('default and hide-checks offer nine tools; blind and blind-v3 offer the same minus run_checks', () => {
    expect(toolNamesFor({ kind: 'default' })).toHaveLength(9);
    expect(toolNamesFor({ kind: 'hide-checks', seed: 7 })).toHaveLength(9);
    for (const m of [{ kind: 'blind' }, { kind: 'blind-v3' }] as AgentMode[]) {
      const n = toolNamesFor(m);
      expect(n, m.kind).toHaveLength(8);
      expect(n).not.toContain('run_checks');
      expect(n).toContain('verify_all');
      expect(n).toContain('lookup');
    }
  });

  it('definitions follow the offered names in every mode; verify_all and lookup are closed, non-strict', () => {
    for (const mode of MODES) {
      const tools = agentTools(ix, { onHit: () => {} }, { mode });
      expect(tools.map((t) => t.name).sort(), mode.kind).toEqual([...toolNamesFor(mode)].sort());
      for (const name of ['verify_all', 'lookup']) {
        const t = tools.find((x) => x.name === name) as unknown as { strict?: boolean; input_schema: { additionalProperties: boolean; properties: Record<string, any>; required?: string[] } };
        expect(t.strict, name).toBe(false);
        expect(t.input_schema.additionalProperties, name).toBe(false);
      }
    }
    const props = (n: string) => Object.keys((agentTools(ix, { onHit: () => {} }).find((t) => t.name === n) as any).input_schema.properties).sort();
    expect(props('verify_all')).toEqual(['cursor', 'kind', 'limit']);
    expect(props('lookup')).toEqual(['as_of', 'cursor', 'id', 'limit', 'section', 'text']);
  });

  it('total strict input-schema bytes stay within 2,400 (measured 2,327 after Task 2: six schemas plus enum growth on verify)', () => {
    const tools = agentTools(ix, { onHit: () => {} });
    const strict = tools.filter((t) => (t as unknown as { strict?: boolean }).strict);
    expect(strict.map((t) => t.name).sort()).toEqual(['get_line', 'get_page', 'list_open_leftovers', 'run_checks', 'search_values', 'verify']);
    const bytes = strict.reduce((n, t) => n + Buffer.byteLength(JSON.stringify((t as unknown as { input_schema: unknown }).input_schema)), 0);
    expect(bytes).toBeLessThanOrEqual(2400);
  });

  it('runTool serves both tools in every mode, and refuses neither in blind', () => {
    for (const mode of MODES) {
      expect(data('verify_all', {}, mode).byKind, mode.kind).toBeDefined();
      expect(data('lookup', { section: 'prior_year' }, mode), mode.kind).toBeDefined();
    }
  });
});

describe('verify_all is non-strict: bad limit or cursor is an error, never coerced', () => {
  const bad: [string, unknown][] = [['limit', 0], ['limit', -3], ['limit', 2.5], ['limit', '5'], ['limit', 51], ['limit', true], ['cursor', -1], ['cursor', 1.5], ['cursor', '0'], ['cursor', 0.0001]];
  it.each(bad)('%s = %j returns { error }', (k, v) => {
    const d = data('verify_all', { [k]: v });
    expect(d.error, `${k}=${JSON.stringify(v)}`).toBeTypeOf('string');
    expect(d.items).toBeUndefined();
  });
  it('null or absent limit and cursor still mean the defaults; cursor 0 is the first page', () => {
    const a = data('verify_all', {});
    const b = data('verify_all', { limit: null, cursor: null });
    const c = data('verify_all', { cursor: 0, limit: 20 });
    expect(b.items).toEqual(a.items);
    expect(c.items).toEqual(a.items);
    expect(a.items.length).toBeGreaterThan(0);
  });
  it('a limit of 50 and a valid cursor page as before; a bad kind is still an error', () => {
    expect(data('verify_all', { limit: 50 }).items.length).toBeGreaterThan(20);
    expect(data('verify_all', { cursor: 20 }).cursor).toBe(20);
    expect(data('verify_all', { kind: 'nope' }).error).toBeTypeOf('string');
    expect(data('verify_all', { kind: 7 }).error).toBeTypeOf('string');
  });
  it('unknown properties are refused (the schema is closed, and non-strict means code must say so)', () => {
    expect(data('verify_all', { kind: 'all', extra: 1 }).error).toBeTypeOf('string');
  });
});

describe('identifiers never reach the model through any tool', () => {
  const packet = ix.packet as unknown as Record<string, any>;
  const tl20 = (packet.timeline as { id: string; detail?: string }[]).find((e) => e.id === 'tl-20')!;
  const pinsInDetail = [...(tl20.detail ?? '').matchAll(/PIN\s+(\d{4,})/gi)].map((m) => m[1]);
  const secrets = new Set<string>(pinsInDetail);
  for (const p of packet.household.people ?? []) if (p.ip_pin) secrets.add(String(p.ip_pin));
  const acct = packet.household.bank_account_for_refund_or_payment ?? {};
  for (const k of ['account', 'routing']) if (acct[k]) secrets.add(String(acct[k]));

  it('the probe found the PINs and the account value to look for (a zero must be able to be non-zero)', () => {
    expect(pinsInDetail.length).toBeGreaterThanOrEqual(2);
    expect(secrets.size).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(packet.timeline)).toContain(pinsInDetail[0]); // the raw packet does carry them
  });

  it('no tool output holds them (every tool, every mode), D03 page 1 included', () => {
    // Each result is checked as it is produced (not kept): every tool over every mode is large.
    let count = 0;
    let d03Read = false;
    const leaks: string[] = [];
    const out = { push: (r: string) => {
      count++;
      for (const sec of secrets) { const at = r.indexOf(sec); if (at >= 0) leaks.push(r.slice(Math.max(0, at - 60), at).replace(/\d/g, '#') + '[SECRET]'); }
    } };
    const drain = (name: string, input: Record<string, unknown>, mode: AgentMode) => {
      let cursor: number | null = 0;
      while (cursor !== null) {
        const r = run(name, { ...input, limit: 50, cursor }, mode);
        out.push(r);
        const d = (JSON.parse(r) as { data: { nextCursor?: number | null; error?: string } }).data;
        expect(d.error, `${name} ${JSON.stringify(input)}`).toBeUndefined();
        cursor = d.nextCursor ?? null;
      }
    };
    const one = (name: string, input: Record<string, unknown>, mode: AgentMode) => out.push(run(name, input, mode));
    const d03 = ix.packet.documents.find((d) => d.id === 'D03');
    expect(d03, 'the probe needs D03 (the IP PIN notice)').toBeDefined();
    const dates = ['2025-07-10', '2025-07-11', '2026-12-31', (tl20 as any).at?.slice(0, 10)].filter(Boolean) as string[];
    for (const mode of MODES) {
      for (const l of ix.latest.lines) { one('get_line', { key: l.key }, mode); one('verify', { method: 'recompute_line', ids: [l.key], target: null }, mode); one('verify', { method: 'prior_year', ids: [l.key], target: null }, mode); }
      for (const d of ix.packet.documents) { for (const p of d.pages) { one('get_page', { doc: d.id, page: p.page }, mode); if (d.id === 'D03' && p.page === 1) d03Read = true; } drain('verify', { method: 'fact_copies', ids: [d.id], target: null }, mode); drain('verify', { method: 'duplicates', ids: [d.id], target: null }, mode); }
      for (const q of ['PIN', 'Identity Protection', 'account', 'routing']) drain('search_values', { text: q }, mode);
      if (toolNamesFor(mode).includes('run_checks')) drain('run_checks', {}, mode);
      drain('list_open_leftovers', { kind: 'all' }, mode);
      for (const kind of ['all', ...VERIFY_ALL_KINDS]) drain('verify_all', { kind }, mode);
      drain('lookup', { section: 'agency_record' }, mode);
      for (const top of Object.keys(packet.tax_agency_records ?? {})) drain('lookup', { section: 'agency_record', id: top }, mode);
      drain('lookup', { section: 'prior_year' }, mode);
      for (const l of ix.latest.lines) { out.push(run('lookup', { section: 'prior_year', id: l.key }, mode)); out.push(run('lookup', { section: 'diagnostics_for', id: l.key }, mode)); }
      for (const as_of of dates) drain('lookup', { section: 'what_was_known', as_of }, mode);
      for (const text of ['PIN', 'pin', 'signed', 'account', 'routing', 'refund', 'approved']) drain('lookup', { section: 'client_text', text }, mode);
      drain('lookup', { section: 'diagnostics_for' }, mode);
      drain('lookup', { section: 'alternatives' }, mode);
      for (const s of LOOKUP_SECTIONS) out.push(run('lookup', { section: s }, mode));
    }
    expect(count).toBeGreaterThan(500);
    expect(d03Read, 'D03 page 1 was read').toBe(true);
    expect(leaks.slice(0, 5), 'a secret reached a tool result').toEqual([]);
  });

  it('searching client_text by a secret\'s digits is refused (numbers are never inputs), and the refusal does not echo them', () => {
    for (const s of secrets) {
      const r = run('lookup', { section: 'client_text', text: s });
      expect((JSON.parse(r) as { data: { error?: string } }).data.error).toBeTypeOf('string');
      expect(r.includes(s)).toBe(false);
    }
  });

  it('what_was_known on the signing date still returns the event, with the PINs masked', () => {
    const r = run('lookup', { section: 'what_was_known', as_of: (tl20 as any).at.slice(0, 10) });
    expect(r).toContain('tl-20');
    for (const s of secrets) expect(r.includes(s)).toBe(false);
  });
});
