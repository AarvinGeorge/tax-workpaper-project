// lookup: id-only, read-only access to the packet's generic schema sections (agency records, prior years, the timeline,
// client text, engine diagnostics, what-if alternatives). The sections and id formats are the README's; no form, line,
// document or check is named here. Raw packet data, so the result is the same in every mode. The tool is not strict, so
// every input is validated here and a bad one comes back as { error } naming the valid shapes (nothing is coerced).
// runTool (agent-tools.ts) masks, labels, pages and scans what this returns.
import type { PacketIndex } from '../../src/domain/packet/load';
import { masker } from './reader-core';
import { looksNumeric, priorReturn } from './calculator';

export const LOOKUP_SECTIONS = ['agency_record', 'prior_year', 'what_was_known', 'client_text', 'diagnostics_for', 'alternatives'] as const;
export type LookupSection = (typeof LOOKUP_SECTIONS)[number];
const INPUT_KEYS = ['section', 'id', 'as_of', 'text', 'limit', 'cursor'];
const MAX_LIMIT = 50;
const MIN_TEXT = 2;
const SNIPPET = 600;

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const has = (o: unknown, k: string) => (isObj(o) || Array.isArray(o)) && Object.prototype.hasOwnProperty.call(o, k);
const given = (x: unknown) => x !== undefined && x !== null;

/** A JSON Pointer (RFC 6901) into a value; undefined when it leads nowhere. Own properties only. */
function resolvePointer(root: unknown, pointer: string): { found: boolean; value?: unknown } {
  if (pointer === '' || pointer === '/') return { found: true, value: root };
  if (!pointer.startsWith('/')) return { found: false };
  let cur: unknown = root;
  for (const raw of pointer.slice(1).split('/')) {
    const k = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!has(cur, k)) return { found: false };
    cur = (cur as Obj)[k];
  }
  return { found: true, value: cur };
}

const kindOf = (v: unknown) => (Array.isArray(v) ? 'list' : isObj(v) ? 'record' : v === null ? 'null' : typeof v);
const sizeOf = (v: unknown) => (Array.isArray(v) ? v.length : isObj(v) ? Object.keys(v).length : null);
const keyList = (o: Obj, prefix: string) => Object.keys(o).map((key) => ({ key, id: `${prefix}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, kind: kindOf(o[key]), size: sizeOf(o[key]) }));

/** What a pointer lookup returns: a list as items (paged by the caller), anything else as the value. */
function pointerResult(id: string, v: unknown): Obj {
  return Array.isArray(v) ? { id, kind: 'list', items: v } : { id, kind: kindOf(v), value: v };
}

// ---------- sections ----------
function agencyRecord(ix: PacketIndex, id: string | null): Obj {
  const root = ix.packet.tax_agency_records as unknown;
  const tops = isObj(root) ? Object.keys(root) : [];
  const shapes = `Valid: no id (lists the top keys), a top key (${tops.join(', ')}) or agency:/<JSON pointer> into it, e.g. agency:/${tops[0] ?? '<key>'}/0.`;
  if (id === null) return { keys: keyList((root as Obj) ?? {}, 'agency:'), note: shapes };
  const ptr = id.startsWith('agency:') ? id.slice('agency:'.length) : tops.includes(id) ? `/${id}` : null;
  const r = ptr === null ? { found: false } : resolvePointer(root, ptr);
  if (!r.found) return { error: `No agency record ${id}. ${shapes}` };
  return pointerResult(id, r.value);
}

function priorYear(ix: PacketIndex, id: string | null): Obj {
  const root = ix.packet.prior_years as unknown as Obj;
  const tops = Object.keys(root ?? {});
  const pr = priorReturn(ix);
  const lines = pr && isObj(pr.ret.lines) ? pr.ret.lines : {};
  const eg = Object.keys(lines)[0] ?? '<line key>';
  const shapes = `Valid: no id (lists the sections), py:/<JSON pointer> into prior_years (sections: ${tops.join(', ')}; e.g. py:/${tops[0] ?? '<key>'}), or a line key of last year's return (e.g. ${eg}).`;
  if (id === null) return { keys: keyList(root ?? {}, 'py:'), lineKeys: Object.keys(lines).length, note: shapes };
  if (id.startsWith('py:')) {
    const r = resolvePointer(root, id.slice(3));
    return r.found ? pointerResult(id, r.value) : { error: `No prior-year record ${id}. ${shapes}` };
  }
  if (pr && has(lines, id)) {
    const labels = isObj(pr.ret.line_labels) ? pr.ret.line_labels : {};
    const srcs = isObj(pr.ret.line_sources) ? pr.ret.line_sources : {};
    return { key: id, from: pr.name, value: lines[id], label: has(labels, id) ? labels[id] : null, line_sources: has(srcs, id) ? srcs[id] : [] };
  }
  return { error: `No prior-year line or record ${id}. ${shapes}` };
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
/** The cut-off instant for as_of: a date means the end of that (UTC) day; a timestamp means that instant. */
function cutoff(asOf: string): number | null {
  const d = DATE_ONLY.exec(asOf);
  if (d) {
    const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
    const t = Date.UTC(y, m - 1, day);
    const back = new Date(t);
    return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === day ? t + 86_400_000 - 1 : null;
  }
  if (INSTANT.test(asOf)) { const t = Date.parse(asOf); return Number.isNaN(t) ? null : t; }
  return null;
}

function whatWasKnown(ix: PacketIndex, asOf: string | null): Obj {
  const shape = 'as_of must be an ISO date (YYYY-MM-DD, e.g. 2026-06-23) or a full timestamp (YYYY-MM-DDTHH:MM:SSZ).';
  if (asOf === null) return { error: `what_was_known needs as_of. ${shape}` };
  const t = cutoff(asOf);
  if (t === null) return { error: `Bad as_of ${JSON.stringify(asOf)}. ${shape}` };
  const all = ix.packet.timeline;
  const items = all.filter((e) => Date.parse(e.at) <= t);
  return { as_of: asOf, later: all.length - items.length, items: items.map((e) => ({ id: e.id, at: e.at, event: e.event, actor: e.actor, detail: e.detail, refs: e.refs ?? [] })) };
}

/** Every searchable string of the client's own words and the notes about them, each with the id that locates it. */
function textSources(ix: PacketIndex): { id: string; kind: string; text: string }[] {
  const p = ix.packet as unknown as Obj;
  const out: { id: string; kind: string; text: string }[] = [];
  const add = (id: string, kind: string, text: unknown) => { if (typeof text === 'string' && text.trim()) out.push({ id, kind, text }); };
  const client = (p.client ?? {}) as Obj;
  for (const q of (client.questionnaire as Obj[] | undefined) ?? []) { add(String(q.id), 'questionnaire', q.question); add(String(q.id), 'questionnaire', q.answer); }
  for (const m of (client.messages as Obj[] | undefined) ?? []) add(String(m.id), 'message', m.text);
  for (const c of (client.call_notes as Obj[] | undefined) ?? []) ((c.notes as unknown[] | undefined) ?? []).forEach((n) => add(String(c.id), 'call_note', n));
  const prior = ((p.prior_years ?? {}) as Obj).prior_preparer_workpaper;
  if (isObj(prior)) {
    add('py:/prior_preparer_workpaper/summary_memo', 'prior_preparer', prior.summary_memo);
    for (const k of ['notes', 'open_items']) if (Array.isArray(prior[k])) prior[k].forEach((n, i) => add(`py:/prior_preparer_workpaper/${k}/${i}`, 'prior_preparer', n));
  }
  for (const e of ix.packet.timeline) add(`timeline:${e.id}`, 'timeline', e.detail);
  const notices = ((p.tax_agency_records ?? {}) as Obj).notices;
  if (Array.isArray(notices)) notices.forEach((n, i) => {
    if (!isObj(n)) return;
    add(`agency:/notices/${i}/summary`, 'notice', n.summary);
    if (Array.isArray(n.items_under_examination)) n.items_under_examination.forEach((t, j) => add(`agency:/notices/${i}/items_under_examination/${j}`, 'notice', t));
  });
  return out;
}

function clientText(ix: PacketIndex, text: string | null): Obj {
  const shape = `text must be a word or phrase of at least ${MIN_TEXT} characters, not a number (e.g. "home office").`;
  if (text === null || text.trim().length < MIN_TEXT) return { error: `client_text needs text. ${shape}` };
  const m = masker(ix);
  const q = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const items = textSources(ix)
    .map((s) => ({ ...s, text: m(s.text) }))
    .filter((s) => s.text.toLowerCase().replace(/\s+/g, ' ').includes(q))
    .map((s) => ({ ...s, text: s.text.length > SNIPPET ? s.text.slice(0, SNIPPET) + ' [cut]' : s.text }));
  return { query: m(text.trim()), items };
}

function diagnosticsFor(ix: PacketIndex, id: string | null): Obj {
  const versions = id === null ? [ix.latest] : ix.versions;
  if (id !== null) {
    const known = ix.versions.some((v) => v.lines.some((l) => l.key === id) || (v.diagnostics ?? []).some((d) => (d.refs ?? []).includes(id)));
    if (!known) return { error: `No line key or ref ${id}. Valid: no id (the latest return's diagnostics) or a line key (e.g. ${ix.latest.lines[0]?.key ?? '<form>.<line>'}) or a ref a diagnostic names (ev-NNNN, D01).` };
  }
  const items = versions.flatMap((v) => (v.diagnostics ?? [])
    .filter((d) => id === null || (d.refs ?? []).includes(id))
    .map((d) => ({ version: v.version, code: d.code, severity: d.severity, message: d.message, refs: d.refs ?? [] })));
  return { for: id ?? `latest return (${ix.latest.version})`, items };
}

function alternatives(ix: PacketIndex, id: string | null): Obj {
  const w = ix.packet.what_if as unknown as Obj | undefined;
  const alts = (Array.isArray(w?.alternatives) ? w!.alternatives : []) as Obj[];
  const ids = [...alts.map((a) => String(a.id)), ...(isObj(w?.extension) ? ['extension'] : [])];
  const shapes = `Valid: no id (lists them) or one of ${ids.join(', ')}.`;
  if (id === null) {
    return {
      items: [
        ...alts.map((a) => ({ id: a.id, description: a.description, base_version: a.base_version, choices: a.choices, federal_total_tax_change: (a.federal as Obj | undefined)?.total_tax_change ?? null, california_total_tax_change: (a.california as Obj | undefined)?.total_tax_change ?? null })),
        ...(isObj(w?.extension) ? [{ id: 'extension', description: 'The April extension estimate.', base_version: (w!.extension as Obj).based_on_version ?? null }] : []),
      ],
      note: shapes,
    };
  }
  if (id === 'extension' && isObj(w?.extension)) return { id, ...(w!.extension as Obj) };
  const a = alts.find((x) => x.id === id);
  return a ? { ...a } : { error: `No alternative ${id}. ${shapes}` };
}

// ---------- entry ----------
/** Runs one lookup. Errors are results ({ error }), never throws. A list comes back as `items` (paged by runTool). */
export function lookup(ix: PacketIndex, input: Obj): Obj {
  const sections = LOOKUP_SECTIONS.join(', ');
  if (!isObj(input)) return { error: `Pass an object: { section, id?, as_of?, text?, limit?, cursor? }. Sections: ${sections}.` };
  const unknown = Object.keys(input).filter((k) => !INPUT_KEYS.includes(k));
  if (unknown.length) return { error: `Unknown input ${unknown.join(', ')}. Valid inputs: ${INPUT_KEYS.join(', ')}.` };
  const section = input.section;
  if (typeof section !== 'string' || !(LOOKUP_SECTIONS as readonly string[]).includes(section)) {
    return { error: `Unknown or missing section ${JSON.stringify(section ?? null)}. Use one of ${sections}.` };
  }
  for (const k of ['id', 'as_of', 'text'] as const) {
    if (given(input[k]) && typeof input[k] !== 'string') return { error: `${k} must be a string (or omitted), got ${typeof input[k]}.` };
  }
  for (const [k, min] of [['limit', 1], ['cursor', 0]] as const) {
    const v = input[k];
    if (given(v) && (typeof v !== 'number' || !Number.isInteger(v) || v < min || (k === 'limit' && v > MAX_LIMIT))) {
      return { error: `${k} must be a whole number${k === 'limit' ? ` from 1 to ${MAX_LIMIT}` : ' from 0'} (or null), got ${JSON.stringify(v)}.` };
    }
  }
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : null);
  const id = str('id'); const asOf = str('as_of'); const text = str('text');
  if ((id !== null && looksNumeric(id)) || (text !== null && looksNumeric(text))) {
    return { error: 'Pass ids and words, not numbers: ids like py:/carryovers_into_2025, agency:/notices/0, a line key, or a phrase to search. The tool reads every figure itself.' };
  }
  switch (section as LookupSection) {
    case 'agency_record': return agencyRecord(ix, id);
    case 'prior_year': return priorYear(ix, id);
    case 'what_was_known': return whatWasKnown(ix, asOf);
    case 'client_text': return clientText(ix, text);
    case 'diagnostics_for': return diagnosticsFor(ix, id);
    case 'alternatives': return alternatives(ix, id);
  }
}
