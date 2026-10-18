// The one door to saved state. Server components and the API both call these; the UI never touches the store.
import { returnFingerprint } from '@/components/client/signing';
import type { Finding, NewEvent, RoleInfo, RoleKey, WorkEvent, WorkspaceState } from '@/domain/contracts';
import { indexPacket, loadPacket, type PacketIndex } from '@/domain/packet/load';
import { getStore } from '@/domain/store';
import { isWorkspaceId } from '@/domain/store/ids';
import { validateNewEvent, type EventInput } from '@/domain/events';
import { projectWorkspace, storyAtOf } from '@/domain/project';
import { can, isRoleKey, maskText, roleInfo, roles, signoffLevel } from '@/domain/policy';
import { aiReview, NO_AI, type AiReview } from '@/domain/ai/merge';
import { indexAt, visibleAt } from '@/domain/clock';
import type { Packet } from '@/domain/packet/types';
import { ensureReturnData } from './data';

export { isWorkspaceId };

type RunChecks = (ix: PacketIndex, asOf?: string) => Finding[];
let runChecksFn: RunChecks | null | undefined;

const checksCache = new WeakMap<Packet, Map<string, Finding[]>>();

/** Lane A's check library, loaded lazily so the app runs before it lands; [] until then. Run on the version of the
 *  story time (pix), memoised per packet and version. */
async function findingsFor(ix: PacketIndex): Promise<Finding[]> {
  if (runChecksFn === undefined) {
    try {
      const name = 'index';
      const mod = await import(`../domain/checks/${name}`);
      runChecksFn = typeof mod.runChecks === 'function' ? (mod.runChecks as RunChecks) : null;
    } catch {
      runChecksFn = null;
    }
  }
  if (!runChecksFn) return [];
  const byVersion = checksCache.get(ix.packet) ?? new Map<string, Finding[]>();
  checksCache.set(ix.packet, byVersion);
  const hit = byVersion.get(ix.latest.version);
  if (hit) return hit;
  try {
    const out = runChecksFn(ix); // each finding carries firstVisibleAt, gated on top by the story clock
    byVersion.set(ix.latest.version, out);
    return out;
  } catch (err) {
    console.error('runChecks failed', err);
    return [];
  }
}

function packet(): PacketIndex {
  return indexPacket(loadPacket());
}

function assertArgs(ws: string, role: RoleKey) {
  if (!isWorkspaceId(ws)) throw new Error('invalid workspace id');
  if (!isRoleKey(role)) throw new Error('unknown role');
}

/** ai: the AI review for staff (verified suggestions and the held-back count); empty for clients and the examiner. */
export interface Workspace { ix: PacketIndex; findings: Finding[]; state: WorkspaceState; role: RoleInfo; ai: AiReview }

/** AI suggestions never reach the projection (so never a blocker); a broken payload never breaks the workspace. They
 *  were made on the final version, so they show only when the story time has reached it. */
function aiFor(ix: PacketIndex, pix: PacketIndex = ix): AiReview {
  if (pix !== ix) return NO_AI;
  try {
    return aiReview(ix);
  } catch (err) {
    console.error('AI payload skipped', err);
    return NO_AI;
  }
}

export async function loadWorkspace(ws: string, role: RoleKey): Promise<Workspace> {
  assertArgs(ws, role);
  await ensureReturnData(); // vault mode: the packet and AI payload from the private store; file mode: no-op
  const ix = packet();
  const info = roleInfo(ix, role);
  if (!info) throw new Error('role not present in this packet');
  const events = await getStore().list(ws);
  // The clock comes from the static index; every screen gets the return as of story time (pix).
  const pix = indexAt(ix, storyAtOf(ix, events));
  const allFindings = await findingsFor(pix);
  const state = projectWorkspace(ix, events, role, allFindings);
  // Findings per role: staff see all (inboxes filter by firstVisibleAt) plus verified AI suggestions after our checks;
  // clients only those written for them; examiner none. AI suggestions are for staff only.
  const ai = info.kind === 'staff' ? aiFor(ix, pix) : NO_AI;
  const findings = info.kind === 'staff' ? [...allFindings, ...ai.findings] : info.kind === 'client' ? allFindings.filter((f) => f.plain) : [];
  return { ix: pix, findings, state, role: info, ai };
}

export type PostResult =
  | { ok: true; event: WorkEvent }
  | { ok: false; status: 400 | 403 | 409; reason: string; newer?: WorkEvent[] };

/** Validates, checks policy against the current projection, then appends. ws, role and storyAt come from the server. */
export async function postEvent(ws: string, role: RoleKey, e: EventInput | NewEvent | unknown): Promise<PostResult> {
  assertArgs(ws, role);
  const v = validateNewEvent(e);
  if (!v.ok) return { ok: false, status: 400, reason: v.reason };
  const input = v.event;
  await ensureReturnData();
  const ix = packet();
  if (input.type === 'suggestion_accepted' || input.type === 'suggestion_dismissed') {
    const id = input.claimId?.startsWith('finding:') ? input.claimId.slice(8) : '';
    if (!aiFor(ix).findings.some((f) => f.id === id)) return { ok: false, status: 400, reason: 'No AI suggestion with that id is shown.' };
  }
  const store = getStore();
  const events = await store.list(ws);
  // Policy runs on the static index (frontier, write gate); findings are those of the version at the story time.
  const pix = indexAt(ix, storyAtOf(ix, events));
  const findings = await findingsFor(pix);
  const staffView = projectWorkspace(ix, events, policyViewer(ix, role), findings);
  if (input.type === 'suggestion_accepted' || input.type === 'suggestion_dismissed') {
    // Same rule as the inbox: a suggestion shows once every document it quotes has arrived at the story clock.
    const f = aiFor(ix).findings.find((x) => 'finding:' + x.id === input.claimId);
    if (f && !visibleAt(f.firstVisibleAt, staffView.storyAt)) return { ok: false, status: 403, reason: 'This suggestion is not in the story yet: a document it quotes arrives later.' };
    if (pix !== ix) return { ok: false, status: 403, reason: `AI suggestions were made on ${ix.latest.version}, which is not computed yet at this story time.` };
  }
  // A client's own view decides what a client may touch.
  const view = roleInfo(ix, role)?.kind === 'staff' ? staffView : projectWorkspace(ix, events, role, findings);
  const payload = { ...input.payload };
  if (input.type === 'adjustment' && payload.status === undefined) {
    payload.status = signoffLevel(ix, role) === 'reviewer' || signoffLevel(ix, role) === 'partner' ? 'applied' : 'proposed';
  }
  if (input.type === 'signoff' && input.claimId && payload.value === undefined) {
    const c = staffView.claims[input.claimId];
    const original = c ? c.current : originalValue(ix, input.claimId);
    payload.value = original === null || original === undefined ? '' : String(original);
    if (payload.level === undefined && signoffLevel(ix, role)) payload.level = signoffLevel(ix, role);
  }
  // What a client signs is fingerprinted here from the finalized return, never taken from the browser.
  if (input.type === 'client_signature') payload.value = returnFingerprint(ix, staffView);
  const verdict = can(ix, role, input.type, { ...input, payload }, view);
  if (!verdict.ok) {
    if (verdict.conflict) return { ok: false, status: 409, reason: verdict.reason ?? 'Conflict.', newer: verdict.newer };
    return { ok: false, status: 403, reason: verdict.reason ?? 'Not allowed.' };
  }
  const event: NewEvent = { ...input, payload, ws, role, storyAt: staffView.storyAt };
  return { ok: true, event: await store.append(ws, event) };
}

/** Policy checks for staff run on the full staff projection (the requesting role's own, which is unfiltered for staff). */
function policyViewer(ix: PacketIndex, role: RoleKey): RoleKey {
  if (roleInfo(ix, role)?.kind === 'staff') return role;
  return roles(ix).find((r) => r.kind === 'staff')?.key ?? role;
}

function originalValue(ix: PacketIndex, claimId: string): unknown {
  return claimId.startsWith('line:') ? ix.line(ix.latest.version, claimId.slice(5))?.value ?? null : null;
}

/** A finding's free text masked for the role: explanation, plain wording and, for an AI suggestion, its rationale and quotes. */
export function maskFinding(f: Finding, role: RoleInfo): Finding {
  const m = (t: string) => maskText(t, role, false);
  const out: Finding = { ...f, explanation: m(f.explanation), plain: f.plain ? m(f.plain) : f.plain };
  if (f.ai) out.ai = { ...f.ai, rationale: m(f.ai.rationale), quotes: f.ai.quotes.map((q) => ({ ...q, quote: m(q.quote) })) };
  return out;
}

/** GET /api/w/:ws/state body: the role's masked projection (never the packet; the page already has it). */
export async function stateResponse(ws: string, role: RoleKey, after = 0) {
  const w = await loadWorkspace(ws, role);
  const findings = w.findings.map((f) => maskFinding(f, w.role));
  const lastSeq = w.state.events.reduce((m, e) => Math.max(m, e.seq), 0);
  return { ws, role: w.role, state: w.state, findings, lastSeq, newEvents: w.state.events.filter((e) => e.seq > after) };
}
