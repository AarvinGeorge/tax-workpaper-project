// Shared contracts between build lanes. Types only. Each lane implements the functions named in the comments, in the
// module path given, with exactly these names and shapes. Change a contract only through the coordinator.
import type { Position } from './packet/types';

// ---------- Roles (lane C: src/domain/policy.ts) ----------
export type RoleKey = 'priya' | 'marcus' | 'daniel' | 'helen' | 'sam' | 'jo' | 'ngozi' | 'erik' | 'next' | 'irs';
export interface RoleInfo {
  key: RoleKey; name: string; title: string;            // e.g. 'Daniel Ortiz', 'Reviewer, CPA'
  kind: 'staff' | 'client' | 'examiner';
  staffId?: string; clientUserId?: string;              // from firm.staff / firm.client_users, never hard-coded
  clearance: boolean; activeFrom: string | null;        // ISO; null = from the start
  screens: ScreenKey[];                                  // screens this role may open
}
export type ScreenKey = 'home' | 'return' | 'areas' | 'documents' | 'checks' | 'review' | 'changes' | 'filing' | 'firm' | 'findings';
// roles(ix): RoleInfo[]                       derived from firm.staff, firm.client_users and the two non-staff seats
// can(ix, role, action, target, state): { ok: boolean; reason?: string }
// maskValue(text, valueType, role, revealed): string   last 4 only for ssn/account/ip_pin/pin types; EIN never masked
// redactText(text): string                    strips signature PINs and full identifiers from free text (timeline details)
// maskText(text, role, revealed): string      regex pass for ANY role payload text (printed_content, household, prior year,
//                                              notes): SSN-shaped, account and routing numbers, IP PIN, ERO PIN, signature PINs -> last 4

// ---------- Events (lane C: src/domain/events.ts, src/domain/store/*) ----------
export type EventType =
  | 'adjustment' | 'review_note' | 'note_resolved' | 'signoff' | 'question_to_client' | 'answer_recorded'
  | 'reason_set' | 'reveal' | 'clock_moved' | 'undo' | 'assignment' | 'attach_note' | 'time_logged'
  | 'verification' | 'decision' | 'question_to_colleague' | 'finding_cleared' | 'workspace_reset' | 'client_signature'
  | 'suggestion_accepted' | 'suggestion_dismissed';
// suggestion_accepted / suggestion_dismissed: staff with write access review an AI suggestion, claimId 'finding:<id>',
// payload { reason } (required to dismiss). The latest one not undone sets the suggestion's status.
// client_signature: one spouse e-signs Form 8879 and FTB 8879 on claimId 'return', payload { forms, value } where value is
// the fingerprint of the finalized return signed. No PIN is ever sent or stored.
// workspace_reset is a demo control: the projection ignores every event before the latest one (back to the pipeline
// output at the default story time); the log itself stays append-only.
// verification.payload.method is one of firm.starter_standards.verification_types; decision.payload.kind is
// 'election' | 'due_diligence' | 'penalty' | 'judgment' with payload.authority; adjustment.payload.status is 'proposed' | 'applied'.
export interface WorkEvent {
  seq: number; ws: string; at: string; storyAt: string; role: RoleKey; type: EventType;
  claimId?: string; payload: Record<string, unknown>; baseVersion?: number; groupId?: string; retracts?: number;
}
export type NewEvent = Omit<WorkEvent, 'seq' | 'at'>;
export interface EventStore {
  append(ws: string, e: NewEvent): Promise<WorkEvent>;
  list(ws: string, afterSeq?: number): Promise<WorkEvent[]>;
}
// getStore(): EventStore      memory in tests, file locally, Postgres (DATABASE_URL) or Vercel Blob (BLOB_READ_WRITE_TOKEN)

// ---------- Claims and workspace state (lane C: src/domain/project.ts) ----------
/** A claim id is 'line:<KEY>' (latest version), 'doc:<ID>', or 'finding:<ID>'. */
export interface SignOff { seq: number; role: RoleKey; level: 'preparer' | 'reviewer' | 'partner'; value: string; stale: boolean; at: string; note?: string }
export interface ClaimState {
  claimId: string; original: number | string | null; current: number | string | null; adjusted: boolean;
  history: WorkEvent[]; signoffs: SignOff[]; openNotes: WorkEvent[]; version: number;   // version = count of value-changing events
  effect?: { federal: number; california: number; basis: string; version: string };
}
export interface WorkspaceState {
  storyAt: string; frozen: boolean; stage: 'Preparation' | 'Review' | 'Approval' | 'Filing' | 'Filed';
  claims: Record<string, ClaimState>; blockers: { claimId: string; title: string }[];
  reveals: { seq: number; role: RoleKey; what: string; at: string }[];
  reasons: Record<string, { code: string; text: string; role: RoleKey }>;
  events: WorkEvent[];                                   // already filtered and masked for the requesting role
}
// projectWorkspace(ix, events, role, findings): WorkspaceState

// ---------- Checks (lane A: src/domain/checks/index.ts, catalogue.ts) ----------
export type Severity = 'blocker' | 'check' | 'judgment' | 'info';
export interface Finding {
  id: string; checkId: string; family: string; title: string; severity: Severity;
  claims: string[];            // claim ids it sits on
  evidence: string[];          // packet refs (ev-, qa-, msg-, call-, doc:, py:, agency:, ref:, timeline:, household:, asset:)
  explanation: string;         // staff wording, cites values
  plain?: string;              // client wording, only when the client must act
  effect?: { federal?: number; california?: number; basis: 'tax_effect_rates' | 'what_if' | 'computed' };
  ledgerIds: string[];         // e.g. ['GT-A03']; empty for findings beyond the ledger
  firstVisibleAt?: string;     // ISO; a finding that depends on a later document or message appears only after it
  source?: 'check' | 'ai';     // absent = check; 'ai' = a verified AI suggestion (src/domain/ai), never a blocker
  ai?: {                       // set when source is 'ai'
    kind: string; quotes: { doc: string; page: number; quote: string }[]; rationale: string; authority: string | null;
    confidence: number; model: string; promptVersion: string; runAt: string;
  };
}
// runChecks(ix, asOf?): Finding[]
// LEDGER: { id: string; title: string; severity: string; checkIds: string[]; surfaced: string }[]   catalogue of all ledger findings

// ---------- References, documents, versions (lane B) ----------
export type RefKind = 'value' | 'document' | 'page' | 'qa' | 'msg' | 'call' | 'param' | 'fx' | 'household' | 'agency' | 'timeline' | 'asset' | 'version' | 'line' | 'py' | 'rule' | 'text';
export interface ResolvedRef {
  ref: string; kind: RefKind; label: string; text?: string; value?: unknown;
  docId?: string; page?: number; position?: Position | null; confidence?: number; valueType?: string;
  sourceKind?: 'Third-party form' | 'IRS record' | 'FTB record' | 'Client\'s own record' | 'Typed by the client' | 'Firm record' | 'Engine' | 'Prior year';
}
// src/domain/refs.ts:      resolveRef(ix, ref, version?): ResolvedRef
// src/domain/docs.ts:      documentLanding(ix, asOf): DocLanding[];  simulatedPage(ix, docId, page): SimPage
export interface DocLanding {
  docId: string; title: string; type: string; issuer: string | null; owner: string | null; receivedAt: string;
  status: 'landed' | 'not_landed'; landedLines: string[]; usedValues: number; totalValues: number;
  reason: { code: 'duplicate' | 'superseded' | 'not_extracted' | 'partial' | 'after_last_computation' | 'corroborates' | 'prior_year' | 'post_filing' | 'unused'; text: string } | null;
  visible: boolean;            // false when received after asOf
}
export interface SimPage {
  docId: string; page: number; pageCount: number; title: string; issuer: string | null; printed: string;
  fields: { valueId: string; label: string; field: string; text: string; valueType: string; position: Position | null; confidence: number }[];
}
// src/domain/versions.ts: compareVersions(ix, a, b, finalized?): CompareRow[];  finalized(ix, state): FinalizedLine[];
//                          swings(ix): Swing[];  whatIfs(ix): WhatIf[];  formsOf(ix, version): { form: string; label: string; lines: string[] }[]
export interface CompareRow { key: string; label: string; form: string; a: unknown; b: unknown; change: 'added' | 'removed' | 'changed' | 'same' }
export interface FinalizedLine { key: string; v3: unknown; value: unknown; adjusted: boolean; recomputed: false }
export interface Swing { key: string; label: string; prior: number | null; current: number; delta: number; flag: 'swing' | 'new' | null; priorRef?: string }
export interface WhatIf { id: string; description: string; federalChange: number; californiaChange: number; penaltyChange?: number; changedLines: string[] }

// ---------- Story clock (lane C: src/domain/clock.ts) ----------
// DEFAULT_STORY_AT(ix): string   = latest version computed_at (truncated to minutes)
// stageAt(ix, storyAt): WorkspaceState['stage'];  frozenAt(ix): string | null  (first federal acceptance in tax_agency_records.efile)
// visibleAt(isoTime, storyAt): boolean
