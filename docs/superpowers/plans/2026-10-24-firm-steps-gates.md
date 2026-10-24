# Firm required steps as closed-world gates: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use `- [ ]`.

**Goal:** Partner approval waits until every item of three of the firm's own required steps is explained: "Diagnostics
resolved", "All documents accounted for" (including information-return amounts that reach no line), and "Prior-year
variances explained". A discrepancy no check was written for still reaches a person, because nothing in those
populations can stay unexplained.

**Why (measured 24 Oct, docs/decisions.md):** the packet's firm standards list 12 required steps; the app displays them
(FirmInfo) but approval waits only on blocker findings, open notes, partner thresholds and engine re-runs
(src/domain/project.ts:178-200). CA AMT passed because "Diagnostics resolved" was never enforced. As generic gates on
the real packet the three steps touch 22 of the 27 ledger mistakes plus CA AMT; the other 6 are caught by today's checks.

**Tier:** b. TDD on the domain logic; Fable 5.1 reviews the plan and the code, executing probes; full browser suite.

## Global constraints
- Read the packet's schema only; never name a packet document id, line key or code in `src/` (tests may).
- Steps apply only when the firm's `required_steps` lists them (matched by wording), so another firm's packet without
  them gets no gate.
- The ledger never creates anything here (it is not read).
- No new event type: an item is explained by a live `verification` event (one of the firm's `verification_types`,
  with a note) on the item's claim. Undo works as for any event.
- Story clock: an item exists only once its evidence is visible at `storyAt` (as every finding does).
- Clients and the examiner see none of this (they get no blockers today; unchanged).

## Capabilities: EXTENDS or NEW
| Capability | EXTENDS / NEW | Why |
|---|---|---|
| Item populations | EXTENDS `documentLanding` (docs.ts), `swings` (versions.ts), `latest.diagnostics` | already computed and shown; only the "needs a person" rule is new |
| Explaining an item | EXTENDS the `verification` event + firm verification types | already validated by policy and recorded on claims |
| Gate | EXTENDS `state.blockers` in project.ts | approval already refuses on any blocker (policy.ts:275) |
| Step logic | NEW `src/domain/steps.ts` | no module turns the firm's required steps into item lists; one place, used by project.ts and the Review tab |
| UI | EXTENDS the Review screen with a "Firm steps" tab | Review already holds approval and its blockers |

## Item rules (one claim per item)
1. **Diagnostics resolved:** every diagnostic of the latest version visible at story time. Claim `diag:<code>` (a code
   repeated in one version gets `#2`, `#3`). Shows the message and links to referenced lines/documents.
2. **All documents accounted for, kind "did not land":** every visible document with status `not_landed` whose reason is
   not `duplicate`, `superseded` or `post_filing` (those three are deterministic and already explained by the packet).
   Claim `doc:<id>`. The automatic reason (e.g. "Corroborates only") is shown as the system's guess, not as the answer.
3. **All documents accounted for, kind "amounts not on the return":** every visible, landed information return
   (document_type matching W-2, 1099*, 1098*, K-1*, 5498, 3921, 3922, 1095*, SSA-1099) that is not a duplicate or
   superseded, with at least one nonzero numeric extracted value that no line of the latest version cites. One item per
   document, claim `doc:<id>`, listing the uncited fields and amounts.
4. **Prior-year variances explained:** every `swings()` row with flag `swing` (on both returns, over the firm's percent
   AND amount). Claim `line:<key>`. New-this-year lines are out (they have no prior figure to vary from).

An item is **explained** when its claim has a live `verification` event visible at story time. One blocker per step with
open items: claimId `step:<step wording>`, title `Firm step open: <wording> (<n> of <m> unexplained)`.

## Out of scope
- The other nine required steps (identity, estimated payments, carryovers, due diligence, sign-offs, client approval):
  covered today by checks or by existing sign-off rules, or not measurable from the packet; revisit separately.
- Variance on new lines; value-level accounting for non-information-return documents (measured too noisy, 324 values).
- Independent expectations, a second engine, the agentic AI reviewer.
- Changing the ledger catalogue, the AI gold set, errors-found.md or the hand-in documents.

## Plan review (Fable 5.1, 24 Oct 09:51 EDT): APPROVE WITH CHANGES, all applied
These override the rules above where they differ.
1. `diag:` claim ids are refused by `CLAIM_ID` (events.ts:21): extend it. The `step:` blocker must route to Review's
   Firm steps tab in `blockerLine` (overview/blockers.ts), not to a dead Checks link.
2. Before the first computation (`pix.latest.computed === false`) every population is empty (else 95 phantom swings and
   64 phantom documents).
3. Amounts rule: any landed, non-duplicate, non-superseded document with an uncited extracted value whose
   `value_type === 'money'` (not a document-type regex, which misses D11, the GT-A01 supplement).
4. Documents rule: only documents carrying at least one money value (drops IDs, consents, the IP PIN notice).
5. Explanation = a live `verification` whose `payload.step` names that step; an unrelated verification on the same
   claim no longer closes it. `verification` now requires a note for new writes (policy), as sign-off does.
6. Variances: only leaf lines (no inputs) on both returns; a line absent this year is collapsed into one item per form
   ("form not on this return"). No bulk explain (it would be rubber-stamping by construction).
7. Blocker totals: Checks counts must equal `state.blockers.length` (flow.spec.ts:88-101); acceptance-walk's approval
   path explains every item through the API first.
8. `firmSteps(pix, claims)` reads retraction-aware claim history from `projectWorkspace` instead of re-deriving it.
Expected load on the real packet at the latest time: about 11 + 9 + 15 + 15 items.

## Tasks

### Task 1: steps.ts, the item populations (TDD)
Files: create `project-build/src/domain/steps.ts`; test `project-build/tests/unit/steps.test.ts`.
Interface: `export interface StepItem { id: string; step: string; kind: 'diagnostic' | 'document' | 'amounts' | 'variance'; claimId: string; title: string; detail: string; refs: string[]; explained: boolean }`
`export interface StepState { step: string; items: StepItem[]; open: number }`
`export function firmSteps(ix: PacketIndex, events: WorkEvent[], storyAt: string): StepState[]`
- [ ] Red: on the real packet at the latest story time, assert: the three steps present (and only those); diagnostics
  include `diag:CA_AMT_NOT_COMPUTED`; documents include D73, D15, D47, D54 (did not land) and exclude the duplicate D10
  and superseded D30; amounts include a document behind GT-A01 (D11 or the brokerage 1099) and exclude D10; variances
  include `line:SchC.28` and exclude any `new` line; a firm packet without "Diagnostics resolved" yields no such step;
  at an early story time (before v1) the diagnostics step is empty.
- [ ] Red: a live `verification` on `doc:D73` marks that item explained; undoing it reopens it; a verification on
  another claim does not.
- [ ] Green: implement, reusing documentLanding, swings and latest.diagnostics.

### Task 2: the gate (TDD)
Files: modify `project-build/src/domain/project.ts`; test `project-build/tests/unit/project.test.ts` (or steps.test.ts).
- [ ] Red: a fresh staff projection has one `step:` blocker per open step, titled with counts; when every item of a step
  carries a verification, that blocker is gone; clients get none; partner approval is refused while any is open
  (policy `approval`).
- [ ] Green: push the step blockers in `project.ts` after the findings loop.

### Task 3: the Review tab
Files: modify `project-build/src/components/work/Review.tsx`; small `ExplainAction` in `components/work/actions.tsx`
(method select from the firm's verification types + required note, emits one `verification`); per step a bulk
"Explain all open items with one note" (one `verification` per item under one `groupId`, `payload.bulk: true`, as bulk
sign-off does) so a single undo reverses it.
- [ ] Red (Playwright, new `tests/e2e/firm-steps.spec.ts`): as daniel, Review shows a "Firm steps" tab with three steps
  and open counts; explaining one document item lowers its count and survives reload; Approve stays disabled with the
  step blockers named; as ngozi and irs the tab is absent.
- [ ] Green: implement the tab (items link to their claim through `claimHref`; `diag:` items show their refs).

### Task 4: knock-on tests, docs, review
- [ ] Run the full unit and browser suites; update tests that assert blocker totals (e.g. "11 blockers"), each update
  justified by the new step blockers; never weaken an assertion that is not about counts.
- [ ] Fable 5.1 code review with probes; apply must-fix items test-first.
- [ ] Log in docs/decisions.md and docs/ai-usage.md; commit only when Aarvin says so (deploy changes the live demo:
  more blockers than the brief and video mention).
