// Story clock: one per workspace. Everything time-dependent is measured against storyAt, never the wall clock.
import type { PacketIndex } from './packet/load';
import type { ReturnVersion } from './packet/types';
import type { WorkspaceState } from './contracts';

const ms = (iso: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso).getTime();
const toMinute = (t: number) => new Date(t).toISOString().slice(0, 16) + ':00Z';

/** The latest version's computed_at, truncated to the minute. */
export function DEFAULT_STORY_AT(ix: PacketIndex): string {
  return toMinute(ms(ix.latest.computed_at));
}

/** The packet index as of a story time: `latest` is the last version computed at or before `at`, `versions` those
 *  computed by then. At or after the latest computation it is `ix` itself (caches and default views unchanged). Before
 *  the first computation `latest` is an empty placeholder flagged `computed: false`. Clock rules (DEFAULT_STORY_AT,
 *  the frontier, stageAt, frozenAt) and the server's write gate keep the static index. */
const atCache = new WeakMap<PacketIndex, Map<string, PacketIndex>>();
export function indexAt(ix: PacketIndex, at: string): PacketIndex {
  if (!ix.latest || ms(at) >= ms(ix.latest.computed_at)) return ix;
  const versions = ix.versions.filter((v) => ms(v.computed_at) <= ms(at));
  const latest: ReturnVersion = versions[versions.length - 1] ?? {
    version: 'none', computed_at: ix.versions[0].computed_at, computed: false, trigger: '', documents_used: [],
    documents_superseded: [], summary: {}, tax_effect_rates: {}, carryovers_out: {}, assets: [], diagnostics: [],
    changes_from_previous: [], lines: [],
  };
  const byVersion = atCache.get(ix) ?? new Map<string, PacketIndex>();
  atCache.set(ix, byVersion);
  const hit = byVersion.get(latest.version);
  if (hit) return hit;
  const pix: PacketIndex = { ...ix, latest, versions, counts: { ...ix.counts, versions: versions.length, lines: latest.lines.length } };
  byVersion.set(latest.version, pix);
  return pix;
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "No return computed yet: …" when the story time is before the engine's first run; null otherwise. */
export function notComputedText(ix: PacketIndex): string | null {
  return ix.latest?.computed === false ? `No return computed yet: the engine first ran on ${fmtDay(ix.latest.computed_at)}` : null;
}

export function visibleAt(isoTime: string | null | undefined, storyAt: string): boolean {
  if (!isoTime) return true;
  return ms(isoTime) <= ms(storyAt);
}

type Efile = { date: string; jurisdiction: string; status: string };
const efile = (ix: PacketIndex): Efile[] => ((ix.packet.tax_agency_records as { efile?: Efile[] }).efile ?? []);

/** First federal acceptance: the as-filed record is read-only from then on. */
export function frozenAt(ix: PacketIndex): string | null {
  const acc = efile(ix).filter((e) => e.jurisdiction === 'federal' && e.status === 'accepted').map((e) => e.date).sort();
  return acc[0] ?? null;
}

type Deadline = { what: string; date: string };
const firmDeadlines = (ix: PacketIndex): Deadline[] => (ix.packet.firm.deadlines as unknown as Deadline[]) ?? [];

export function stageAt(ix: PacketIndex, storyAt: string): WorkspaceState['stage'] {
  const fz = frozenAt(ix);
  if (fz && visibleAt(fz, storyAt)) return 'Filed';
  // Filing starts with the first transmission (an e-file record or an e-file event on the timeline).
  const sent = [...efile(ix).map((e) => e.date), ...ix.packet.timeline.filter((t) => /efile/i.test(t.event)).map((t) => t.at)].sort()[0];
  if (sent && visibleAt(sent, storyAt)) return 'Filing';
  // Approval starts when the client signs the e-file authorization (Form 8879); review runs until then.
  const signed = ix.packet.timeline.filter((t) => /8879/.test(t.event)).map((t) => t.at).sort()[0];
  if (signed && visibleAt(signed, storyAt)) return 'Approval';
  const handoff = firmDeadlines(ix).find((d) => /hand-?off/i.test(d.what))?.date;
  if (handoff && !visibleAt(handoff, storyAt)) return 'Preparation';
  return 'Review';
}

export interface DeadlineAt { what: string; date: string; daysLeft: number; status: 'passed' | 'due_soon' | 'upcoming' }
const DUE_SOON_DAYS = 14;

/** firm.deadlines measured on the story clock (days left, rounded down to whole days). */
export function deadlines(ix: PacketIndex, storyAt: string): DeadlineAt[] {
  return firmDeadlines(ix).map((d) => {
    const daysLeft = Math.floor((ms(d.date) - ms(storyAt)) / 86_400_000);
    const status = daysLeft < 0 ? 'passed' : daysLeft <= DUE_SOON_DAYS ? 'due_soon' : 'upcoming';
    return { what: d.what, date: d.date, daysLeft, status };
  });
}
