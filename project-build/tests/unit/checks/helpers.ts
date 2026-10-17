// Test helpers for the check library. Builds altered copies in memory; never writes the packet.
import { loadPacket, indexPacket, type PacketIndex } from '@/domain/packet/load';
import type { Packet } from '@/domain/packet/types';
import { runChecks } from '@/domain/checks';
import type { Finding } from '@/domain/contracts';

export function realIx(): PacketIndex {
  return indexPacket(loadPacket());
}

/** A deep copy of the real packet, changed by `mutate`. */
export function altered(mutate: (p: Packet) => void): Packet {
  const p = structuredClone(loadPacket());
  mutate(p);
  return p;
}

export function run(p: Packet): Finding[] {
  return runChecks(indexPacket(p));
}

export function byCheck(findings: Finding[], checkId: string): Finding[] {
  return findings.filter((f) => f.checkId === checkId);
}

export function latestLine(p: Packet, key: string) {
  const l = p.return_versions[p.return_versions.length - 1].lines.find((x) => x.key === key);
  if (!l) throw new Error(`no line ${key}`);
  return l;
}

export function value(p: Packet, id: string) {
  const v = p.extracted_values.find((x) => x.id === id);
  if (!v) throw new Error(`no value ${id}`);
  return v;
}

export function doc(p: Packet, id: string) {
  const d = p.documents.find((x) => x.id === id);
  if (!d) throw new Error(`no document ${id}`);
  return d;
}

/** Resolves a packet reference without lane B's resolver, so this lane's tests stand alone. */
export function refResolves(ix: PacketIndex, ref: string): boolean {
  const p = ix.packet;
  const ptr = (root: unknown, pointer: string): unknown => {
    let cur: unknown = root;
    for (const raw of pointer.split('/').slice(1)) {
      const k = raw.replace(/~1/g, '/').replace(/~0/g, '~');
      if (cur === null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
  };
  if (ref.startsWith('ev-')) return ix.valueById.has(ref);
  if (ref.startsWith('doc:')) {
    const [id, page] = ref.slice(4).split('#page');
    const d = ix.docById.get(id);
    if (!d) return false;
    return page === undefined || d.pages.some((pg) => pg.page === Number(page));
  }
  if (/^D\d+$/.test(ref)) return ix.docById.has(ref);
  if (ref.startsWith('qa-')) return p.client.questionnaire.some((q) => q.id === ref);
  if (ref.startsWith('msg-')) return p.client.messages.some((m) => m.id === ref);
  if (ref.startsWith('call-')) return p.client.call_notes.some((c) => c.id === ref);
  if (ref.startsWith('py:')) return ptr(p.prior_years, ref.slice(3)) !== undefined;
  if (ref.startsWith('agency:')) return ptr(p.tax_agency_records, ref.slice(7)) !== undefined;
  if (ref.startsWith('household:')) return p.household.people.some((x) => x.id === ref.slice(10));
  if (ref.startsWith('ref:param.')) return ptr(p.engine_reference.parameters, '/' + ref.slice(10).split('.').join('/')) !== undefined;
  if (ref.startsWith('ref:fx.')) return ptr(p.engine_reference.parameters.fx, '/' + ref.slice(7).split('.').join('/')) !== undefined;
  if (ref.startsWith('timeline:')) return p.timeline.some((t) => t.id === ref.slice(9));
  if (ref.startsWith('asset:')) {
    const id = ref.slice(6);
    return ix.latest.assets.some((a) => a.asset_id === id)
      || ((p.prior_years.asset_records as { asset_id: string }[] | undefined) ?? []).some((a) => a.asset_id === id);
  }
  return false;
}
