// Verified AI suggestions become findings beside our checks (source 'ai', family 'AI suggestion', severity
// 'judgment'). They never block filing, never notify, and only staff see them. Their review status comes from the
// suggestion_accepted / suggestion_dismissed events.
import type { Finding, RoleKey, WorkEvent } from '../contracts';
import type { PacketIndex } from '../packet/load';
import { retractedSeqs } from '../events';
import type { AiKind, AiPayload, VerifiedSuggestion } from './contract';
import { loadAiPayload, aiPayloadPath, type AiHeld } from './load';
import { isShown, verifySuggestions } from './verify';

export const AI_FAMILY = 'AI suggestion';
export const AI_CHECK_ID = 'AI reader';

const KIND_TITLE: Record<Exclude<AiKind, 'other'>, string> = {
  repair_vs_improvement: 'A repair that may be an improvement',
  answer_conflicts_with_return: 'A client answer that conflicts with the return',
  business_use_share: 'A business-use share that differs from what the client said',
  residency_or_source: 'Income that may sit in the wrong state or period',
  limit_or_eligibility: 'A deduction or credit that may exceed a limit',
  document_not_reflected: 'Something in a document the return does not reflect',
  date_or_year_mismatch: 'A payment or event that may sit in the wrong year',
};

export function aiTitle(kind: string, otherKind: string | null): string {
  if (kind !== 'other' && kind in KIND_TITLE) return KIND_TITLE[kind as keyof typeof KIND_TITLE];
  const label = (otherKind ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Another issue';
}

export function confidenceWord(n: number): 'high' | 'medium' | 'low' {
  return n >= 0.8 ? 'high' : n >= 0.5 ? 'medium' : 'low';
}

/** Shown suggestions as findings. Claims are kept only when the line exists in the latest version; a finding appears in
 *  the story once every document it quotes has arrived. */
export function aiFindings(ix: PacketIndex, payload: AiPayload, verified: VerifiedSuggestion[]): Finding[] {
  return verified.filter(isShown).map((s) => {
    const received = s.evidence.map((e) => ix.docById.get(e.doc)?.received_at).filter((x): x is string => !!x).sort();
    const f: Finding = {
      id: s.id, checkId: AI_CHECK_ID, family: AI_FAMILY, title: aiTitle(s.kind, s.otherKind), severity: 'judgment',
      claims: s.claims.map((k) => k.replace(/^line:/, '')).filter((k) => ix.line(ix.latest.version, k)).map((k) => 'line:' + k),
      evidence: [...new Set(s.evidence.map((e) => `doc:${e.doc}#page${e.page}`))],
      explanation: s.rationale, ledgerIds: [], source: 'ai',
      ai: {
        kind: s.kind === 'other' ? s.otherKind ?? 'other' : s.kind, quotes: s.evidence.map((e) => ({ doc: e.doc, page: e.page, quote: e.quote })),
        rationale: s.rationale, authority: s.authority, confidence: s.confidence, model: payload.model, promptVersion: payload.promptVersion, runAt: payload.runAt,
      },
    };
    if (received.length) f.firstVisibleAt = received[received.length - 1];
    return f;
  });
}

export interface AiReview {
  present: boolean;                        // a payload file was found (even if refused)
  findings: Finding[];                     // shown suggestions
  held: AiHeld[];                          // held back: invalid, refused or failed verification, with reasons
  meta: { model: string; promptVersion: string; runAt: string } | null;
}

export const NO_AI: AiReview = { present: false, findings: [], held: [], meta: null };

const reviewCache = new WeakMap<object, AiReview>();

/** Load, verify and merge in one step (cached with the loaded payload). */
export function aiReview(ix: PacketIndex, file: string = aiPayloadPath()): AiReview {
  const loaded = loadAiPayload(ix, file);
  if (loaded.status === 'absent') return NO_AI;
  const hit = reviewCache.get(loaded);
  if (hit) return hit;
  let r: AiReview;
  if (loaded.status === 'refused') {
    r = { present: true, findings: [], held: loaded.held.length ? loaded.held : [{ id: null, reasons: [loaded.reason] }], meta: null };
  } else {
    const v = verifySuggestions(ix, loaded.payload);
    const { model, promptVersion, runAt } = loaded.payload;
    r = {
      present: true, findings: aiFindings(ix, loaded.payload, v),
      held: [...loaded.held, ...v.filter((x) => !isShown(x)).map((x) => ({ id: x.id, reasons: x.problems }))],
      meta: { model, promptVersion, runAt },
    };
  }
  reviewCache.set(loaded, r);
  return r;
}

export interface SuggestionStatus { status: 'needs_review' | 'accepted' | 'dismissed'; by?: RoleKey; reason?: string; seq?: number; at?: string }

/** The latest accept or dismiss on the suggestion that is not undone; none means it still needs review. */
export function suggestionStatus(events: WorkEvent[], findingId: string): SuggestionStatus {
  const r = retractedSeqs(events);
  const cid = 'finding:' + findingId;
  const last = [...events].sort((a, b) => a.seq - b.seq)
    .filter((e) => e.claimId === cid && !r.has(e.seq) && (e.type === 'suggestion_accepted' || e.type === 'suggestion_dismissed')).pop();
  if (!last) return { status: 'needs_review' };
  const reason = typeof last.payload.reason === 'string' && last.payload.reason.trim() ? last.payload.reason.trim() : undefined;
  return { status: last.type === 'suggestion_accepted' ? 'accepted' : 'dismissed', by: last.role, reason, seq: last.seq, at: last.storyAt };
}

export const isAi = (f: Finding) => f.source === 'ai';
