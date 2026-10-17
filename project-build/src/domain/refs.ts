// Reference resolver: turns any packet reference string (README reference_formats) into a typed, labelled record.
// Returns raw packet text; masking identifiers is the API's job (policy.maskValue), not this module's.
import type { ResolvedRef } from './contracts';
import type { PacketIndex } from './packet/load';
import type { PacketDocument } from './packet/types';
import { humanize } from './labels';

type SourceKind = NonNullable<ResolvedRef['sourceKind']>;
type Obj = Record<string, unknown>;

/** RFC 6901 JSON Pointer lookup. Returns undefined when any step is missing. */
export function jsonPointer(root: unknown, pointer: string): unknown {
  if (pointer === '' || pointer === '/') return pointer === '' ? root : (root as Obj)?.[''];
  if (!pointer.startsWith('/')) return undefined;
  let cur: unknown = root;
  for (const raw of pointer.slice(1).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (cur === null || typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(key)) return undefined;
      cur = cur[Number(key)];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
      cur = (cur as Obj)[key];
    }
    if (cur === undefined) return undefined;
  }
  return cur;
}

const IRS = /internal revenue service|\birs\b|u\.s\. treasury/i;
const FTB = /franchise tax board|\bftb\b/i;
/** Document types that are standard information returns (W-2, 1099-*, 1098-*, K-1-*, 3921, 5498 ...): they carry a form number. */
const NUMBERED_FORM = /\d/;

function surnames(ix: PacketIndex): string[] {
  const out = new Set<string>();
  for (const person of ix.packet.household.people) {
    for (const part of String(person.name || '').split(/[\s-]+/)) if (part.length > 2) out.add(part.toLowerCase());
  }
  return [...out];
}

/** Kind of source for a document, from its issuer, uploader and type (never its id). */
export function documentSourceKind(ix: PacketIndex, d: PacketDocument): SourceKind {
  const issuer = d.issuer || '';
  if (/prior/i.test(d.document_type)) return 'Prior year';
  if (FTB.test(issuer)) return 'FTB record';
  if (IRS.test(issuer)) return 'IRS record';
  if (d.uploaded_by === 'firm') return 'Firm record';
  const lower = issuer.toLowerCase();
  if (!NUMBERED_FORM.test(d.document_type) && surnames(ix).some((s) => lower.includes(s))) return "Client's own record";
  return 'Third-party form';
}

function text(ref: string): ResolvedRef {
  return { ref, kind: 'text', label: ref, text: ref };
}

function resolveDocument(ix: PacketIndex, ref: string, id: string): ResolvedRef {
  const d = ix.docById.get(id);
  if (!d) return text(ref);
  return { ref, kind: 'document', label: d.title, docId: d.id, value: d, sourceKind: documentSourceKind(ix, d) };
}

function resolveAsset(ix: PacketIndex, ref: string, id: string, version?: string): ResolvedRef {
  const rv = (version && ix.version(version)) || ix.latest;
  const a = (rv.assets || []).find((x) => (x as Obj).asset_id === id) as Obj | undefined;
  if (a) return { ref, kind: 'asset', label: String(a.description ?? id), value: a, sourceKind: 'Engine' };
  const prior = (ix.packet.prior_years.asset_records as Obj[] | undefined)?.find((x) => x.asset_id === id);
  if (prior) return { ref, kind: 'asset', label: String(prior.description ?? id), value: prior, sourceKind: 'Prior year' };
  return text(ref);
}

function resolveParamPath(ix: PacketIndex, ref: string, kind: 'param' | 'fx', path: string[]): ResolvedRef {
  let cur: unknown = ix.packet.engine_reference.parameters;
  for (const k of path) {
    if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, k)) return text(ref);
    cur = (cur as Obj)[k];
  }
  return { ref, kind, label: path.join('.'), value: cur, sourceKind: 'Engine' };
}

/**
 * Resolve one reference. `version` is the version a line key or asset id is read in (inputs are keys of other lines
 * in the same version); default the latest.
 */
export function resolveRef(ix: PacketIndex, ref: string, version?: string): ResolvedRef {
  const p = ix.packet;
  const r = ref.trim();

  if (/^ev-\d+$/.test(r)) {
    const v = ix.valueById.get(r);
    if (!v) return text(ref);
    const d = ix.docById.get(v.document_id);
    return {
      ref, kind: 'value', label: v.label, text: v.text_as_read, value: v.value, docId: v.document_id, page: v.page,
      position: v.position ?? null, confidence: v.confidence, valueType: v.value_type,
      sourceKind: d ? documentSourceKind(ix, d) : undefined,
    };
  }

  const page = /^doc:([^#\s]+)#page(\d+)$/.exec(r);
  if (page) {
    const d = ix.docById.get(page[1]);
    const pg = d?.pages.find((x) => x.page === Number(page[2]));
    if (!d || !pg) return text(ref);
    return { ref, kind: 'page', label: `${d.title}, page ${pg.page}`, text: pg.printed_content, docId: d.id, page: pg.page, position: null, sourceKind: documentSourceKind(ix, d) };
  }
  if (r.startsWith('doc:')) return resolveDocument(ix, ref, r.slice(4));
  if (ix.docById.has(r)) return resolveDocument(ix, ref, r);

  if (/^qa-\d+$/.test(r)) {
    const q = p.client.questionnaire.find((x) => x.id === r);
    if (!q) return text(ref);
    return { ref, kind: 'qa', label: q.question, text: `${q.question} Answer: ${q.answer}`, value: q, sourceKind: 'Typed by the client' };
  }
  if (/^msg-\d+$/.test(r)) {
    const m = p.client.messages.find((x) => x.id === r);
    if (!m) return text(ref);
    return { ref, kind: 'msg', label: `Message from ${m.from}`, text: m.text, value: m, sourceKind: m.from === 'firm' ? 'Firm record' : 'Typed by the client' };
  }
  if (/^call-\d+$/.test(r)) {
    const c = (p.client.call_notes as Obj[]).find((x) => x.id === r);
    if (!c) return text(ref);
    const notes = Array.isArray(c.notes) ? (c.notes as unknown[]).map(String) : [];
    return { ref, kind: 'call', label: `Call notes ${String(c.date ?? '').slice(0, 10)}`.trim(), text: notes.join('\n'), value: c, sourceKind: 'Firm record' };
  }

  if (r.startsWith('py:')) {
    const v = jsonPointer(p.prior_years, r.slice(3));
    if (v === undefined) return text(ref);
    return { ref, kind: 'py', label: `Prior year ${r.slice(3)}`, value: v, sourceKind: 'Prior year' };
  }
  if (r.startsWith('agency:')) {
    const ptr = r.slice(7);
    const v = jsonPointer(p.tax_agency_records, ptr);
    if (v === undefined) return text(ref);
    const ftb = /ftb/i.test(ptr) || ((v as Obj)?.agency !== undefined && FTB.test(String((v as Obj).agency))) || (v as Obj)?.jurisdiction === 'california';
    return { ref, kind: 'agency', label: `Agency record ${ptr}`, value: v, sourceKind: ftb ? 'FTB record' : 'IRS record' };
  }
  if (r.startsWith('asset:')) return resolveAsset(ix, ref, r.slice(6), version);
  if (r.startsWith('household:')) {
    const person = p.household.people.find((x) => x.id === r.slice(10));
    if (!person) return text(ref);
    return { ref, kind: 'household', label: person.name, value: person, sourceKind: 'Typed by the client' };
  }
  if (r.startsWith('ref:param.')) return resolveParamPath(ix, ref, 'param', r.slice(10).split('.'));
  if (r.startsWith('ref:fx.')) return resolveParamPath(ix, ref, 'fx', ['fx', ...r.slice(7).split('.')]);
  if (r.startsWith('timeline:')) {
    const t = p.timeline.find((x) => x.id === r.slice(9));
    if (!t) return text(ref);
    return { ref, kind: 'timeline', label: `${humanize(t.event)} (${t.at.slice(0, 10)})`, text: t.detail, value: t, sourceKind: t.actor ? 'Firm record' : undefined };
  }

  const rv = ix.version(r);
  if (rv) return { ref, kind: 'version', label: `${rv.version}, computed ${rv.computed_at.slice(0, 10)}`, text: rv.trigger, value: rv.version, sourceKind: 'Engine' };

  const rules = p.engine_reference.rules || {};
  if (Object.prototype.hasOwnProperty.call(rules, r)) return { ref, kind: 'rule', label: r, text: rules[r], sourceKind: 'Engine' };

  const ver = (version && ix.version(version)) ? version : ix.latest.version;
  const line = ix.line(ver, r);
  if (line) return { ref, kind: 'line', label: line.label, value: line.value, text: line.note ?? undefined, sourceKind: 'Engine' };

  return text(ref);
}

const pointerWords = (ptr: string) => ptr.split('/').filter(Boolean).map((x) => (/^\d+$/.test(x) ? `#${Number(x) + 1}` : humanize(x))).join(', ');

/** One readable line for a resolved reference: a label, never raw JSON. Raw packet text: the caller masks it. */
export function refText(r: ResolvedRef): string {
  const v = r.value as Record<string, unknown> | undefined;
  switch (r.kind) {
    case 'value': return `${r.label}${r.docId ? ` (${r.docId}${r.page ? `, page ${r.page}` : ''})` : ''}`;
    case 'household': return `${r.label}${v && typeof v.role === 'string' ? `, ${humanize(v.role)}` : ''}`;
    case 'qa': return `Questionnaire: ${r.label}`;
    case 'agency': return `Agency record: ${pointerWords(r.ref.trim().slice(7))}`;
    case 'py': return `Prior year: ${pointerWords(r.ref.trim().slice(3))}`;
    case 'timeline': return v && typeof v.event === 'string' && typeof v.at === 'string' ? `${humanize(v.event)} (${v.at.slice(0, 10)})` : r.label;
    case 'line': return `${r.label} (${r.ref.replace(/^line:/, '')})`;
    default: return r.label;
  }
}
