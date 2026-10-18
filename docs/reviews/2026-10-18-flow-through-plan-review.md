# Plan review: adjustments flow through (Fable, 18 Oct 2026 16:38 EDT)

Evidence: `python3 -I` over `project-build/data/packet.json`; grep over `project-build/src` and `tests`.

## Must-fix

1. **Within-1 tolerance is a false positive on ratio lines.** F540NR.34 (0.6347), F540NR.36 (0.0766), F8606.10 (0.99815) "fit" `max0(a-b)` because a-b < 0 gives 0 and |0 - 0.63| <= 1. F540NR.34 is downstream of F1040.1a (wages), so a wage adjustment would set the CA deduction ratio to 0 and label it exact. Treat a non-integer stored value as non-linear (tolerance 1 -> 160 fits; 0.01 -> 155; the only other losses are F8949.A/D.total rounding).
2. **The count is 160 + 61 = 221, not 59.** F8938.req and F8867.status have numeric inputs and string values. `flow.ts` must mark non-numeric values `needsEngine`; the unit test in C4 asserts 59 and would be wrong.
3. **`finalized()` does not read `current` today.** `versions.ts:61` reads `adjusted ? c.current : l.value`; `cmpCells` `versions.ts:173-174`, `Areas.tsx:88` and `FormsTab.tsx:127` key off `adjusted` too. All four need `adjusted || derived`, and `contracts.ts:107` (`recomputed: false` literal) plus `versions.test.ts:82` must change with it.
4. **Sign-off staleness is computed before the overlay.** `project.ts:96-98` sets `stale` inside `buildClaims` against the engine value; a derived state added afterwards leaves a preparer sign-off on F540NR.78 at 27,130 reading fresh after 72 moves. Derive before `buildClaims` finishes (or recompute `stale` in the merge), and merge into an existing ClaimState (notes, sign-offs) rather than replacing it.
5. **Gate blocker claimId.** `tests/unit/project.test.ts:82-88` adjusts F1040.1a (wages, 65 descendants, first non-linear at SchCA540NR.1.C) and asserts no blocker with the adjusted line's claimId after the partner signs. Put the blocker on the `needsEngine` line (or `return`), not the adjusted line.

## Should-fix

- **Coincidental fits where a cap is not binding:** F1040.12 (`R-DEDUCTION-CHOICE`, max of itemized/standard), F540NR.18 (`R-CA-DEDUCTION`), F8863.7 (AOTC phase-out), F7203.15 (all-zero). Data decides the operation; let the rule name decide eligibility (allowlist `R-SUM`, `R-CARRY`: 126 of 160). Stricter than either alone and keeps 78 and 97 (both `R-SUM`).
- `Areas.tsx:174` renders the packet `v.summary` (`california.balance_due: -8256`); not lines, never follows. Caption it "engine summary, v3 as computed" or overlay from `finalized`.
- `swings()` `versions.ts:105-109` reads engine `l.value`; the "against 2024" current column will not follow either.
- `tests/e2e/filing-extension.spec.ts:22` asserts `/v3 plus 1 adjustment, not recomputed/`; the caption change in C3 breaks it. Update the test in the same change. `overview.spec.ts:33` (`/plus 1 adjustment/`) still passes.
- `notify.ts:103` sends a stale notice only to signers of the adjusted claim; a signer of a derived line gets none. Acceptable, record it in decisions.

## Fine

- **Root cause confirmed.** Readers go through `claims.current` or `finalized`: `signing.ts:17,40`, `AfterFiling.tsx:48`, `ClaimDrawer.tsx:240`, `Checks.tsx:23`, `state.ts:127,132`. No "e-file comparison" reads amounts (`FilingStatus.tsx:15` reads efile records only). What-ifs are packet statics.
- **Walk and approval tests.** Every e2e adjustment is F540NR.72 or F1040.26 (`FED_EST`, walk 2.5 and 4.4). Descendants: 72 -> 78, 97 (4,756 > 0); 26 -> 33, 37 (5,220 and 4,720 > 0, candidates agree). The gate never fires; walk 4.1 "0 blockers" and 4.2 Approve hold. `clientlane.test.ts:113` sets Total tax to 1: F1040.37 flips and stays engine; the assertion reads totalTax only.
- **Sign flip = needsEngine is right:** F1040 has no overpaid line and F540NR no amount-due line (nothing after 97), so the flipped amount has nowhere to live.
- Graph sound: no cycles, duplicate keys or missing inputs; v1/v2/v3 all 160 linear (ambiguous 26/26/25, cosmetic).
- `indexAt`: `project.ts:140` builds `pix`, `state.ts:88` returns `ix: pix`; `flowThrough` and `finalized` see the same version.
- Findings auto-clear (`project.ts:163`, `work/lib.ts:85`) and partner threshold (`project.ts:123`) key off `adjusted`/`effect`; `derived: true, adjusted: false`, no `effect`, keeps both correct. Fingerprint follows once must-fix 3 lands.

## Simpler

Compute the operation table once in `indexPacket` per version (static data) rather than caching at projection. Implement the gate as a blocker so `policy.ts:275` refuses Approve with no new branch. Otherwise the plan is the minimum change; keep it.
