# An adjustment flows through the return

## The symptom (Aarvin's dry run, 18 Oct 16:25)

The reviewer adjusts California estimated payments (F540NR.72) from 14,000 to 10,500. The partner signs it off and
approves it, and both clients sign. But the client's signing table still shows California payments as 27,130 and a refund
of 8,256. The correct figures are 23,630 and 4,756. The client signed figures the firm had already changed.

## The root cause (measured, not assumed)

- An adjustment is a leaf override. `claimsFrom` in `src/domain/project.ts` (~line 80) sets `current` on the adjusted
  line only.
- Every other figure is the engine's stored value. This includes the totals, the payments total, the refund or balance
  due, and the three overview cards (`keyAmounts` in `src/components/client/signing.ts:39` reads `finalized()`).
  Nothing downstream of the change moves.
- The app then labels the result "plus N adjustments, not recomputed" on staff screens. It labels nothing on the
  client's table.
- **That is the root cause: the app has no notion of which lines depend on which.** One "not recomputed" label per
  screen is a patch over it, and every screen that reads a total inherits the bug. Today that is the cards, client
  Filing, the AfterFiling block, the e-file comparison and the signature fingerprint.

## What the packet gives us

Measured with `python3 -I` on `data/packet.json`. Every line carries `rule` and `inputs`, so the packet *is* the
dependency graph. In v3:
- 627 lines; 221 have inputs.
- **160 are linear** in the engine's own numbers:
  - the stored value equals the sum of the inputs, or a-b / b-a, or max(0, a-b) / max(0, b-a);
  - checked against the stored values of every version (v1, v2 and v3 all give 160 linear and 59 non-linear).
- **25 of the 160 are ambiguous** today. For example, a-b and max(0, a-b) agree while the result is positive.
- **59 are non-linear tax computations**: brackets, self-employment tax, QBI, phase-outs, AMT. These need the engine.
- The chain from F540NR.72 is fully linear:
  - F540NR.78 Total payments = sum(71, 72, 73);
  - F540NR.97 Overpaid = 78 - 64.

## The fix: replay the linear part of the graph, flag the rest honestly

**C1. `flowThrough(ix, claims)` in a new `src/domain/flow.ts`, pure, unit-tested.**
1. **Infer each derived line's operation from the engine's own output** for the version in view (`ix.latest`), cached
   per version. The candidates are `sum`, `a-b`, `b-a`, `max0(a-b)` and `max0(b-a)`, and a candidate fits when it
   matches within 1. The data decides, not rule names: R-SUM is used for 78 - 64, so rule names cannot be trusted.
2. **Start from the applied adjustments** (claims with `adjusted`). Walk downstream in topological order:
   - **One candidate fits:** recompute the line exactly.
   - **Several candidates fit:** compute them all. If they agree, use the value. If they disagree (a sign flip),
     stop and mark the line as needing the engine.
   - **No candidate fits** (non-linear): stop and mark it as needing the engine.
   - **Downstream of a line that needs the engine:** mark it the same way. Its value cannot be known without the engine.
3. **What it returns:** for each affected line, either `{ value, derived: true, from: [adjusted line keys] }` or
   `{ needsEngine: true, from: [...] }`. A line the user adjusted directly keeps its own value; it is never
   overwritten by a derived one.

**C2. Wire it into the one projection, not into screens.**
- `projectWorkspace` (or `claimsFrom`'s caller) adds derived claim states. Each one has `current` set to the derived
  value, `original` set to the engine value, `derived: true` and `adjusted: false`.
- A derived line is not an adjustment. It needs no partner sign-off and creates no adjustment row.
- `finalized()` and `keyAmounts()` read `current`, so the cards, the client table, AfterFiling, the e-file comparison
  and the signature fingerprint all follow without screen-by-screen edits. Check each reader actually goes through
  `finalized` or `state.claims`. Any that read `ix.latest.lines` directly for a value are the same bug and are
  switched to read the projected value.
- `needsEngine` lines keep the engine value and carry `needsEngine: true`.

**C3. Say it plainly where a figure is shown** (the "small fix", now driven by data):
- A derived figure shows "recomputed from your adjustment" in the side panel's head, with the adjusted line linked.
  The "was X" line shows as it does for adjustments.
- A figure that needs the engine shows a tag "Needs engine re-run" in the panel and on the overview cards. The
  estimated tax effect already computed from `tax_effect_rates` is shown beside it, labelled as an estimate.
- **On the client's signing table:**
  - Derived figures are shown as they now are, with no special label: they are exact.
  - If any figure on the table needs the engine, one sentence under the table reads: "Some figures will change when your
    tax team re-runs the return; you will be asked to sign again." The partner's Approve button is refused with
    "Re-run the engine: N figures depend on changes it has not computed". This follows the firm rule that the return
    is not approved on stale figures. Plan reviewer: confirm this gate does not break the walk or the existing approval
    tests (they use the F540NR.72 adjustment, which is fully linear, so they should pass).
- The overview card captions change. "v3 plus 1 adjustment, not recomputed" becomes "v3 plus 1 adjustment" when every
  affected figure was recomputed, and "v3 plus 1 adjustment; N figures need the engine" otherwise.

**C4. Tests first (red, then green).**
- Unit (`tests/unit/flow.test.ts`):
  - **F540NR.72 at 10,500:** 78 becomes 23,630 and 97 becomes 4,756. No line needs the engine. 72 itself stays 10,500.
  - **A wage-line adjustment:** AGI-chain sums recompute, and the first bracket-tax line and everything below it need
    the engine.
  - **A sign flip:** an adjustment that makes 78 less than 64 stops at 97 with `needsEngine` (the candidates disagree),
    and the balance-due line likewise.
  - **No adjustments:** an empty result, and the projection is byte-identical to today.
  - **Inference on every version:** 160 linear, 59 non-linear, and no line whose value disagrees with its inferred
    operation.
- e2e:
  - The dry-run path. After the 10,500 adjustment, the client signing table shows 23,630 and "Refund 4,756", and the
    overview California figures show the same.
  - A wage adjustment shows "Needs engine re-run" on the federal tax card, and Helen's Approve is refused with the
    re-run reason.

## Out of scope

- Re-implementing the non-linear tax computations (brackets, SE tax, QBI, AMT). The packet's engine owns them, and
  replicating it would be a second engine that could disagree with the first.
- Re-running the engine. The packet's versions are fixed. The honest state is "needs engine re-run".
- Changing which lines a user may adjust.

## Rules

Tier b, test first, minimum change, nothing working breaks, never edit `case-study-project-package/`, packet text is
untrusted (`python3 -I`), last-4 only for identifiers. Fable reviews this plan, then the code. Then deploy and run
the walk on live.

## Revisions after Fable's plan review (16:41, docs/reviews/2026-10-18-flow-through-plan-review.md). These override the body.

- **Eligibility.** A line is replayed only when (a) its rule is on an allowlist of arithmetic rules (`R-SUM`, `R-CARRY`, and any other rule the implementer proves purely additive across all three versions; list them in flow.ts with the evidence) AND (b) the data fits an operation exactly. Exactly means: integer stored value, tolerance 0.5. Non-integer or non-numeric stored values (ratios, string flags like F8938.req) always need the engine. The test counts follow the measured numbers; they are not hard-coded to 160/59.
- **The operation table** is computed once per version in `indexPacket` (static data), not at projection time.
- **Derived values join `buildClaims`, they are not added after it.** Sign-off staleness must compare against the derived current. A derived line merges into an existing ClaimState (its notes and sign-offs are kept).
- **Every reader keyed on `adjusted` also takes `derived`:** `versions.ts:61` (finalized), `versions.ts:173-174` (cmpCells), `Areas.tsx:88`, `FormsTab.tsx:127`, `swings()` `versions.ts:105-109`. Also update `contracts.ts:107` (the literal `recomputed: false`) and `versions.test.ts:82`.
- **The approval gate is a blocker** on the `needsEngine` line's claimId, titled "Needs engine re-run: <label> depends on <adjusted line>", so `policy.ts:275` refuses Approve with no new branch. It is never placed on the adjusted line (see `project.test.ts:82-88`).
- **Areas' `v.summary`:** the California and federal summary rows overlay from `finalized` where the summary key maps to a line (balance_due or overpaid to the refund/owe line). Otherwise they are captioned "engine summary, <version> as computed".
- **Tests:** update `filing-extension.spec.ts:22` with the caption change.
- **Recorded, not fixed:** stale notices go only to signers of the adjusted claim (`notify.ts:103`).
