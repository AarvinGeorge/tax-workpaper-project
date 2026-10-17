// The one door to saved state. Server components and the API both call these; the UI never touches the store.
import { returnFingerprint } from '@/components/client/signing';
import type { Finding, NewEvent, RoleInfo, RoleKey, WorkEvent, WorkspaceState } from '@/domain/contracts';
import { indexPacket, loadPacket, type PacketIndex } from '@/domain/packet/load';
import { getStore } from '@/domain/store';
import { isWorkspaceId } from '@/domain/store/ids';
import { validateNewEvent, type EventInput } from '@/domain/events';
import { projectWorkspace } from '@/domain/project';
import { can, isRoleKey, maskText, roleInfo, roles, signoffLevel } from '@/domain/policy';

export { isWorkspaceId };

type RunChecks = (ix: PacketIndex, asOf?: string) => Finding[];
let runChecksFn: RunChecks | null | undefined;

/** Lane A's check library, loaded lazily so the app runs before it lands; [] until then. */
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
  try {
    return runChecksFn(ix); // checks run independent of the clock; each finding carries firstVisibleAt
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

export interface Workspace { ix: PacketIndex; findings: Finding[]; state: WorkspaceState; role: RoleInfo }

export async function loadWorkspace(ws: string, role: RoleKey): Promise<Workspace> {
  assertArgs(ws, role);
  const ix = packet();
  const info = roleInfo(ix, role);
  if (!info) throw new Error('role not present in this packet');
  const [events, allFindings] = await Promise.all([getStore().list(ws), findingsFor(ix)]);
  const state = projectWorkspace(ix, events, role, allFindings);
  // Findings per role: staff see all (inboxes filter by firstVisibleAt); clients only those written for them; examiner none.
  const findings = info.kind === 'staff' ? allFindings : info.kind === 'client' ? allFindings.filter((f) => f.plain) : [];
  return { ix, findings, state, role: info };
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
  const ix = packet();
  const store = getStore();
  const [events, findings] = await Promise.all([store.list(ws), findingsFor(ix)]);
  const staffView = projectWorkspace(ix, events, policyViewer(ix, role), findings);
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

/** GET /api/w/:ws/state body: the role's masked projection (never the packet; the page already has it). */
export async function stateResponse(ws: string, role: RoleKey, after = 0) {
  const w = await loadWorkspace(ws, role);
  const findings = w.findings.map((f) => ({
    ...f, explanation: maskText(f.explanation, w.role, false), plain: f.plain ? maskText(f.plain, w.role, false) : f.plain,
  }));
  const lastSeq = w.state.events.reduce((m, e) => Math.max(m, e.seq), 0);
  return { ws, role: w.role, state: w.state, findings, lastSeq, newEvents: w.state.events.filter((e) => e.seq > after) };
}
