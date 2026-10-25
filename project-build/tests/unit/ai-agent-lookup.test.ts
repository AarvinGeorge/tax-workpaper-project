/* eslint-disable @typescript-eslint/no-explicit-any -- tool results are loose JSON read field by field in these tests */
// lookup (ai/lib/lookup.ts): id-only, read-only access to the packet's generic sections. Cases are picked by probing
// the packet (and a perturbed copy), never from the ledger. No network.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { SSN_SHAPED } from '@/domain/ai/verify';
import { DATA_NOTE, SsnInToolResult, TOOL_RESULT_MAX_BYTES, runTool } from '../../ai/lib/agent-tools';
import { LOOKUP_SECTIONS } from '../../ai/lib/lookup';
import type { AgentMode } from '../../ai/lib/modes';
import { perturbedPacket } from '../fixtures/perturbed';

const ix = indexPacket(loadPacket());
type R = { tool: string; note: string; data: Record<string, any> };
const call = (input: Record<string, unknown>, x = ix, mode?: AgentMode) => JSON.parse(runTool(x, 'lookup', input, { mode })) as R;
const pk = ix.packet as unknown as Record<string, any>;
const MODES: AgentMode[] = [{ kind: 'default' }, { kind: 'blind' }, { kind: 'hide-checks', seed: 1 }, { kind: 'blind-v3' }];

describe('lookup: sections and shapes', () => {
  it('names the six sections', () => {
    expect([...LOOKUP_SECTIONS]).toEqual(['agency_record', 'prior_year', 'what_was_known', 'client_text', 'diagnostics_for', 'alternatives']);
  });

  it('every section refuses a bad input with an error naming the valid shapes', () => {
    for (const section of LOOKUP_SECTIONS) {
      const r = call({ section, id: 'nope:/zzz', as_of: 'not a date', text: '' });
      expect(r.data.error, section).toMatch(/valid|use|shape|e\.g\./i);
    }
    expect(call({ section: 'bogus' }).data.error).toMatch(/agency_record[\s\S]*prior_year[\s\S]*what_was_known/);
    expect(call({}).data.error).toMatch(/section/);
    expect(call({ section: 'agency_record', id: 'agency:/no_such_key/0' }).data.error).toMatch(/agency:\//);
  });

  it('refuses numbers as ids or text, and unknown properties', () => {
    expect(call({ section: 'prior_year', id: '1,500' }).data.error).toMatch(/not numbers|ids/i);
    expect(call({ section: 'client_text', text: '12345' }).data.error).toMatch(/not numbers|words/i);
    expect(call({ section: 'alternatives', amount: 5 }).data.error).toMatch(/section[\s\S]*id[\s\S]*as_of/);
  });

  it('limit and cursor must be whole numbers in range; nothing is coerced', () => {
    for (const bad of [{ limit: 1.5 }, { limit: -1 }, { limit: 0 }, { limit: 51 }, { limit: '5' }, { cursor: -1 }, { cursor: 2.5 }, { cursor: '0' }]) {
      expect(call({ section: 'alternatives', ...bad }).data.error, JSON.stringify(bad)).toMatch(/limit|cursor/);
    }
    expect(call({ section: 'alternatives', limit: null, cursor: null }).data.error).toBeUndefined();
  });
});

describe('lookup: agency_record', () => {
  const tops = Object.keys(pk.tax_agency_records);
  it('no id lists the top keys; a top key and a pointer return the record', () => {
    const none = call({ section: 'agency_record' }).data;
    expect(none.keys.map((k: any) => k.key)).toEqual(tops);
    const arrKey = tops.find((k) => Array.isArray(pk.tax_agency_records[k]))!;
    const r = call({ section: 'agency_record', id: arrKey }).data;
    expect(r.total).toBe(pk.tax_agency_records[arrKey].length);
    const p = call({ section: 'agency_record', id: `agency:/${arrKey}/0` }).data;
    expect(p.id).toBe(`agency:/${arrKey}/0`);
    expect(JSON.stringify(p.value)).toContain(Object.keys(pk.tax_agency_records[arrKey][0])[0]);
  });
});

describe('lookup: prior_year', () => {
  const retKey = Object.keys(pk.prior_years).find((k) => /^return_\d{4}$/.test(k))!;
  const ret = pk.prior_years[retKey];
  it('a line key gives last year\'s value, label and line_sources; a pointer gives the record', () => {
    const key = Object.keys(ret.line_sources)[0];
    const r = call({ section: 'prior_year', id: key }).data;
    expect(r.key).toBe(key);
    expect(r.value).toEqual(ret.lines[key]);
    expect(r.label).toBe(ret.line_labels[key]);
    expect(r.line_sources).toEqual(ret.line_sources[key]);
    const top = Object.keys(pk.prior_years)[0];
    expect(call({ section: 'prior_year', id: `py:/${top}` }).data.id).toBe(`py:/${top}`);
    expect(call({ section: 'prior_year' }).data.keys.length).toBe(Object.keys(pk.prior_years).length);
    expect(call({ section: 'prior_year', id: 'Z9.99' }).data.error).toMatch(/py:\//);
  });
});

describe('lookup: what_was_known', () => {
  const nowDate = (pk.readme.where_now_is as string).match(/\((\d{4}-\d{2}-\d{2})\)/)![1];
  const tl = pk.timeline as { id: string; at: string }[];
  const before = tl.filter((e) => e.at.slice(0, 10) <= nowDate);
  it('as of the README\'s where_now_is date: only events at or before it, with refs', () => {
    expect(before.length).toBeGreaterThan(0);
    expect(before.length).toBeLessThan(tl.length);
    const r = call({ section: 'what_was_known', as_of: nowDate, limit: 50 }).data;
    expect(r.total).toBe(before.length);
    expect(r.items.map((e: any) => e.id)).toEqual(before.map((e) => e.id));
    expect(r.items.every((e: any) => e.at.slice(0, 10) <= nowDate && Array.isArray(e.refs))).toBe(true);
    expect(r.later).toBe(tl.length - before.length);
  });
  it('a full timestamp is an instant; a bad or impossible date is an error', () => {
    const t0 = tl[0].at;
    expect(call({ section: 'what_was_known', as_of: t0 }).data.total).toBe(tl.filter((e) => Date.parse(e.at) <= Date.parse(t0)).length);
    expect(call({ section: 'what_was_known', as_of: '1999-01-01' }).data.total).toBe(0);
    for (const bad of ['2026-02-30', 'June 2026', '2026-6-1', '']) expect(call({ section: 'what_was_known', as_of: bad }).data.error, bad).toMatch(/YYYY-MM-DD/);
    expect(call({ section: 'what_was_known' }).data.error).toMatch(/as_of/);
  });
  it('pages with total and nextCursor', () => {
    const a = call({ section: 'what_was_known', as_of: nowDate, limit: 5 }).data;
    expect(a.items).toHaveLength(5);
    expect(a.nextCursor).toBe(5);
    const b = call({ section: 'what_was_known', as_of: nowDate, limit: 5, cursor: 5 }).data;
    expect(b.items[0].id).toBe(before[5].id);
  });
});

describe('lookup: client_text', () => {
  const phrase = (s: string) => s.split(/\s+/).slice(0, 4).join(' ');
  it('finds a phrase from a call note and one from a prior-preparer note', () => {
    const callLine: string = pk.client.call_notes[0].notes[0];
    const r = call({ section: 'client_text', text: phrase(callLine) }).data;
    const hit = r.items.find((i: any) => i.id === pk.client.call_notes[0].id);
    expect(hit).toBeTruthy();
    expect(hit.text).toContain(phrase(callLine));
    const memo: string = pk.prior_years.prior_preparer_workpaper.notes[0];
    const r2 = call({ section: 'client_text', text: phrase(memo).toUpperCase() }).data;
    expect(r2.items.some((i: any) => String(i.id).startsWith('py:/prior_preparer_workpaper/notes/0'))).toBe(true);
    expect(r2.total).toBeGreaterThan(0);
  });
  it('searches questionnaire, messages, timeline details and notices too', () => {
    const kinds = new Set<string>();
    for (const q of ['marital', 'upload', 'charitable', 'proposed', 'return', 'basis']) for (const i of call({ section: 'client_text', text: q, limit: 50 }).data.items) kinds.add(i.kind);
    for (const k of ['questionnaire', 'message', 'notice', 'timeline', 'prior_preparer']) expect(kinds.has(k), k).toBe(true);
  });
  it('is masked: an SSN in the text never comes back whole', () => {
    const ssn = (JSON.stringify(pk.prior_years).match(/\b\d{3}-\d{2}-\d{4}\b/) ?? [])[0];
    expect(ssn).toBeTruthy();
    for (const q of ['dependent', 'social', 'ssn', 'Lindqvist']) {
      const raw = runTool(ix, 'lookup', { section: 'client_text', text: q, limit: 50 });
      expect(SSN_SHAPED.test(raw)).toBe(false);
    }
  });
  it('pages with total; short text is an error', () => {
    const a = call({ section: 'client_text', text: 'the', limit: 3 }).data;
    expect(a.items.length).toBeLessThanOrEqual(3);
    expect(a.total).toBeGreaterThan(3);
    expect(a.nextCursor).not.toBeNull();
    expect(call({ section: 'client_text', text: 'a' }).data.error).toMatch(/2 characters/);
  });
});

describe('lookup: diagnostics_for and alternatives', () => {
  it('a line key: every version\'s diagnostics naming it; none: the latest list', () => {
    const v = ix.versions.find((x) => x.diagnostics.some((d) => d.refs?.length))!;
    const d = v.diagnostics.find((x) => x.refs?.length)!;
    const key = d.refs.find((r) => !r.startsWith('ev-')) ?? d.refs[0];
    const r = call({ section: 'diagnostics_for', id: key }).data;
    const expected = ix.versions.reduce((n, x) => n + x.diagnostics.filter((y) => (y.refs ?? []).includes(key)).length, 0);
    expect(r.total).toBe(expected);
    expect(r.items.every((i: any) => i.refs.includes(key) && typeof i.version === 'string')).toBe(true);
    const latest = call({ section: 'diagnostics_for' }).data;
    expect(latest.total).toBe(ix.latest.diagnostics.length);
    expect(latest.items.every((i: any) => i.version === ix.latest.version)).toBe(true);
    expect(call({ section: 'diagnostics_for', id: 'Z9.99' }).data.error).toMatch(/line key/);
    const quiet = ix.latest.lines.find((l) => !ix.versions.some((x) => x.diagnostics.some((y) => (y.refs ?? []).includes(l.key))))!;
    expect(call({ section: 'diagnostics_for', id: quiet.key }).data.total).toBe(0); // a real line with none is an empty list, not an error
  });
  it('alternatives: a list, one by id, the extension', () => {
    const alts = pk.what_if.alternatives;
    const list = call({ section: 'alternatives' }).data;
    expect(list.total).toBe(alts.length + 1);
    expect(list.items.map((i: any) => i.id)).toEqual([...alts.map((a: any) => a.id), 'extension']);
    const one = call({ section: 'alternatives', id: alts[1].id }).data;
    expect(one.id).toBe(alts[1].id);
    expect(one.federal.alternative).toEqual(alts[1].federal.alternative);
    expect(call({ section: 'alternatives', id: 'extension' }).data.based_on_version).toBe(pk.what_if.extension.based_on_version);
    expect(call({ section: 'alternatives', id: 'zzz' }).data.error).toMatch(new RegExp(alts[0].id));
  });
  it('a perturbed packet\'s alternatives follow its planted lines (same shapes)', () => {
    const pix = indexPacket(perturbedPacket(1).packet);
    expect(call({ section: 'alternatives' }, pix).data.total).toBeGreaterThan(1);
  });
});

describe('lookup: envelope', () => {
  const inputs: Record<string, unknown>[] = [
    { section: 'agency_record' }, { section: 'agency_record', id: Object.keys(pk.tax_agency_records)[0] }, { section: 'prior_year' },
    { section: 'prior_year', id: 'py:/' }, { section: 'what_was_known', as_of: '2027-01-01', limit: 50 }, { section: 'client_text', text: 'the', limit: 50 },
    { section: 'diagnostics_for', limit: 50 }, { section: 'alternatives', limit: 50 }, { section: 'alternatives', id: 'extension' },
    { section: 'prior_year', id: 'py:/asset_records' }, { section: 'agency_record', id: 'agency:/' },
  ];
  it('is identical in every mode (raw packet data)', () => {
    for (const input of inputs) {
      const base = runTool(ix, 'lookup', input, { mode: MODES[0] });
      for (const m of MODES.slice(1)) expect(runTool(ix, 'lookup', input, { mode: m }), JSON.stringify(input)).toBe(base);
    }
  });
  it('is labelled data and stays under the byte bound', () => {
    for (const input of inputs) {
      const raw = runTool(ix, 'lookup', input);
      expect(Buffer.byteLength(raw), JSON.stringify(input)).toBeLessThanOrEqual(TOOL_RESULT_MAX_BYTES);
      expect(JSON.parse(raw).note).toBe(DATA_NOTE);
    }
  });
  it('the SSN scan fires on an injected SSN', () => {
    expect(() => runTool(ix, 'lookup', { section: 'alternatives' }, { inject: () => '123-45-6789' })).toThrow(SsnInToolResult);
  });
});
