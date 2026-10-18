import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isVaultMode } from '../datamode';
import type { ExtractedValue, Packet, PacketDocument, ReturnLine, ReturnVersion } from './types';
import { flowGraph, type FlowGraph } from '../flow';

let cached: Packet | null = null;
let cachedSha: string | null = null;
const packetFile = () => path.join(process.cwd(), 'data', 'packet.json');

/** Vault mode: the data module (src/server/data.ts) puts the decrypted, hash-checked packet here. */
export function primePacket(p: Packet, sha: string): void {
  cached = p;
  cachedSha = sha;
}

export const isPacketPrimed = () => cached !== null;

/** The packet: the warmed cache first; in file mode data/packet.json (the byte-identical copy of the packet as
 *  delivered). In vault mode an unwarmed cache is an error, never a silent fallback to disk. */
export function loadPacket(): Packet {
  if (cached) return cached;
  if (isVaultMode()) throw new Error('Return data is not loaded: in vault mode call ensureReturnData() before loadPacket().');
  cached = JSON.parse(readFileSync(packetFile(), 'utf8')) as Packet;
  return cached;
}

/** SHA-256 of the loaded packet's bytes (vault mode: verified against RETURN_ID when it was warmed). */
export function loadedPacketSha(): string {
  loadPacket();
  cachedSha ??= createHash('sha256').update(readFileSync(packetFile())).digest('hex');
  return cachedSha;
}

/** Shape check against the README's definitions. Reports, never throws; unknown fields are allowed. */
export function validatePacket(p: Packet): { errors: string[] } {
  const errors: string[] = [];
  const need = (obj: Record<string, unknown>, keys: string[], where: string) => {
    for (const k of keys) if (!(k in obj)) errors.push(`${where} is missing ${k}`);
  };
  for (const s of ['documents', 'extracted_values', 'return_versions', 'timeline', 'firm', 'household', 'client']) {
    if (!(s in p)) errors.push(`packet is missing ${s}`);
  }
  (p.documents || []).forEach((d) => need(d, ['id', 'title', 'document_type', 'received_at', 'pages', 'extraction'], `document ${d.id}`));
  (p.extracted_values || []).forEach((v) => need(v, ['id', 'document_id', 'page', 'field', 'value', 'value_type', 'text_as_read', 'confidence'], `value ${v.id}`));
  (p.return_versions || []).forEach((rv) => {
    need(rv, ['version', 'computed_at', 'lines', 'diagnostics', 'changes_from_previous', 'tax_effect_rates'], `version ${rv.version}`);
    (rv.lines || []).forEach((l) => need(l, ['key', 'form', 'line', 'label', 'value', 'sources'], `line ${rv.version}/${l.key}`));
  });
  return { errors };
}

export interface PacketIndex {
  packet: Packet;
  counts: { documents: number; values: number; versions: number; lines: number; timeline: number; staff: number; clientUsers: number };
  latest: ReturnVersion;
  versions: ReturnVersion[];
  version(v: string): ReturnVersion | undefined;
  line(version: string, key: string): ReturnLine | undefined;
  valueById: Map<string, ExtractedValue>;
  valuesByDoc: Map<string, ExtractedValue[]>;
  docById: Map<string, PacketDocument>;
  /** line keys (in a version) whose sources cite a value of this document */
  linesCitingDoc(version: string, docId: string): ReturnLine[];
  /** the version's line graph with the operation each derived line fits (src/domain/flow.ts) */
  flowGraph(version: string): FlowGraph;
}

const indexCache = new WeakMap<Packet, PacketIndex>();

export function indexPacket(p: Packet): PacketIndex {
  const hit = indexCache.get(p);
  if (hit) return hit;
  const valueById = new Map(p.extracted_values.map((v) => [v.id, v]));
  const valuesByDoc = new Map<string, ExtractedValue[]>();
  for (const v of p.extracted_values) {
    const list = valuesByDoc.get(v.document_id) ?? [];
    list.push(v);
    valuesByDoc.set(v.document_id, list);
  }
  const docById = new Map(p.documents.map((d) => [d.id, d]));
  const byVersion = new Map(p.return_versions.map((rv) => [rv.version, rv]));
  const lineMaps = new Map(p.return_versions.map((rv) => [rv.version, new Map(rv.lines.map((l) => [l.key, l]))]));
  const citing = new Map<string, Map<string, ReturnLine[]>>();
  for (const rv of p.return_versions) {
    const m = new Map<string, ReturnLine[]>();
    for (const l of rv.lines) {
      for (const s of l.sources || []) {
        const v = valueById.get(s);
        const doc = v ? v.document_id : s.startsWith('doc:') ? s.slice(4).split('#')[0] : null;
        if (!doc) continue;
        const arr = m.get(doc) ?? [];
        if (!arr.includes(l)) arr.push(l);
        m.set(doc, arr);
      }
    }
    citing.set(rv.version, m);
  }
  const graphs = new Map(p.return_versions.map((rv) => [rv.version, flowGraph(rv)]));
  const noGraph: FlowGraph = { order: [], inputs: new Map(), ops: new Map() };
  const latest = p.return_versions[p.return_versions.length - 1];
  const ix: PacketIndex = {
    packet: p,
    counts: {
      documents: p.documents.length, values: p.extracted_values.length, versions: p.return_versions.length,
      lines: latest ? latest.lines.length : 0, timeline: p.timeline.length, staff: p.firm.staff.length, clientUsers: p.firm.client_users.length,
    },
    latest, versions: p.return_versions,
    version: (v) => byVersion.get(v),
    line: (v, k) => lineMaps.get(v)?.get(k),
    valueById, valuesByDoc, docById,
    linesCitingDoc: (v, d) => citing.get(v)?.get(d) ?? [],
    flowGraph: (v) => graphs.get(v) ?? noGraph,
  };
  indexCache.set(p, ix);
  return ix;
}
