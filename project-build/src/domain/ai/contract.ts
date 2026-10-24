// The AI payload: a second read-only input beside the packet. An AI reader (run at ingest, never from the UI) reads
// the packet's free text and proposes findings; the backend treats the payload as untrusted input that must prove
// itself (schema, then grounding) before anything reaches a screen. A fixed envelope and a fixed core per suggestion,
// with an open `kind` ('other' + otherKind) so an unexpected kind of issue is kept, never crashes the import.
// Shared by lane R (reader + harness, writes the payload) and lane U (backend + UI, reads it). Change only through
// the coordinator.

/** Known kinds of issue the reader looks for; 'other' keeps anything else (its label goes in otherKind). */
export const AI_KINDS = [
  'repair_vs_improvement',        // a cost expensed as a repair that reads as a replacement or improvement
  'answer_conflicts_with_return', // a client answer, message or call note contradicts what the return assumes
  'business_use_share',           // a business-use percentage on the return disagrees with what the client said
  'residency_or_source',          // income placed in the wrong state or period around the move
  'limit_or_eligibility',         // a deduction or credit taken beyond a limit or without eligibility in the text
  'document_not_reflected',       // something a document says that the return does not reflect
  'date_or_year_mismatch',        // a payment, sale or event attached to the wrong year or date
  'other',
] as const;
export type AiKind = (typeof AI_KINDS)[number];

export interface AiEvidence { doc: string; page: number; quote: string }   // quote: verbatim from printed_content

export interface AiSuggestion {
  id: string;                    // 'ai-<kind>-<n>', stable within one payload
  kind: AiKind;
  otherKind: string | null;      // a short label when kind is 'other'
  claims: string[];              // line keys it sits on, e.g. 'SchE.14A' (no 'line:' prefix); may be empty
  evidence: AiEvidence[];        // at least one
  rationale: string;             // at most 30 words, plain words, no identifiers
  authority: string | null;      // only from AI_AUTHORITIES, else null
  confidence: number;            // 0 to 1, the reader's own estimate (never used to skip verification)
}

/** The only authorities the reader may cite (a vetted list; anything else is rejected by the verifier).
 *  Lane R verifies each title exists for tax year 2025 on irs.gov / ftb.ca.gov before the first run. */
export const AI_AUTHORITIES = [
  'IRS Pub 946 (2025): How to Depreciate Property',
  'Treas. Reg. 1.263(a)-3: Amounts paid to improve tangible property',
  'IRS Pub 334 (2025): Tax Guide for Small Business',
  'IRS Pub 587 (2025): Business Use of Your Home',
  'IRS Form 7206 instructions (2025): Self-Employed Health Insurance Deduction',
  'IRS Pub 560 (2025): Retirement Plans for Small Business',
  'IRS Pub 526 (2025): Charitable Contributions',
  'IRS Form 2210 instructions (2025)',
  'FTB Pub 1031 (2025): Guidelines for Determining Resident Status',
  'FTB Schedule CA (540NR) instructions (2025)',
] as const;

export interface AiRejected { raw: unknown; reason: string }

/** A new deterministic check proposed in words by the agent (ai/agent.ts): never code, shown nowhere in the app,
 *  reviewed offline and, if accepted, coded and tested like any check. Optional; the app's loader ignores it. */
export interface AiProposal {
  rule: string;                  // the rule in plain words
  compares: string[];            // the fact keys or fields compared, e.g. 'line:SchE.14A', 'W-2 box 16'
  firesWhen: string;             // where it should fire
  silentWhen: string;            // where it must stay silent
  refs: string[];                // packet refs that motivated it (line keys, value ids, doc ids)
}

export interface AiPayload {
  schemaVersion: 1;
  packetSha: string;             // SHA-256 of the packet it read; the backend refuses a payload for another packet
  model: string;                 // e.g. 'claude-sonnet-5-5'
  promptVersion: string;         // e.g. 'reader-v1'; changes whenever the prompt changes
  runAt: string;                 // ISO time of the run
  suggestions: AiSuggestion[];
  rejected: AiRejected[];        // rows the reader's own pipeline already refused (schema), kept for the scorecard
  proposals?: AiProposal[];      // agent only: new checks proposed in words (never code); ignored by the app
}

/** What the backend adds after verification (lane U): grounded or quarantined, with the reason. */
export interface VerifiedSuggestion extends AiSuggestion {
  grounded: boolean;             // every quote found verbatim (whitespace-normalised) on its page
  problems: string[];            // why not shown, when grounded is false or authority is not vetted
}

// Payload file: project-build/ai/eval/ai-suggestions.json locally (the measured eval payload, committed); in production the encrypted copy in the private Blob store.
// Events (lane U): 'suggestion_accepted' and 'suggestion_dismissed' on claimId 'finding:<suggestion id>',
// payload { reason }. Accepted suggestions become findings labelled "Suggested by AI, accepted by <name>";
// dismissed ones leave the inbox and stay in the record. Unreviewed suggestions never block filing.
