# Plan review: review memo (docs/superpowers/plans/2026-10-18-review-memo.md)

Reviewer: Claude Fable 5.1 (not the author). Read-only; paths relative to project-build/src.

## Must-fix

1. **Approval source and stale approval.** Use `returnApproved` (domain/policy.ts:314) or `state.claims.return.signoffs` (domain/project.ts:113-121), not Review.tsx:61's `payload.scope === 'return'`. An approval goes stale on any later applied change (project.ts:117-118); the plan would print it as approved. Disable the button on a stale approval (the `signingBlock` rule, policy.ts:322-327) or print "Approval stale since #seq".
2. **16 Jul / byRecord has no approver.** The timeline's 8879 event has no actor, and its detail carries PINs (signing.ts:85-87 reads `.at` only). "Approved by whom and when" must become "Approved per the firm's record: clients signed Form 8879 on 10 Jul 2026 20:05 UTC; no partner approval event in this workspace."
3. **"The filed figures" is wrong unless frozen with zero adjustments.** `keyAmounts` reads the finalized workspace return (signing.ts:40-41 via versions.ts:59); at 16 Jul that includes workspace adjustments the filed return never had. Title it with `basisText` (versions.ts:70).
4. **Blocker resolutions are mis-modelled.** Findings clear only by `finding_cleared` or an adjusted claim in `f.claims` (project.ts:182-186); a sign-off on a finding does not clear it (Checks.tsx:139). "Partner sign-off by" applies only to the threshold blocker on an adjusted line (project.ts:189-193). "Fixed by the change to <line>" must name the adjusted member of `f.claims`; derived lines never count. Missing: blocking review notes resolved by `note_resolved` (project.ts:122-123; walk 4.1 does this). Cleared and adjusted together: follow `findingStatus` order (work/lib.ts:81-88).
5. **Print will clip to one page.** At >=900px `.wp` is `height:100dvh; overflow:hidden` and `.sh-pane-c` scrolls (globals.css:187-194). `@media print` must reset both and hide `.sh-head, .sh-story, .sh-banner, .sh-pane-l, .sh-pane-r, .sh-results, .info-btn, .toast`.
6. **Non-staff should refuse, not redirect.** Clients cannot open Review (policy.ts:15); work.spec.ts:79-83 expects "Not part of this view" for typed URLs. Render via `renderWork('review', MemoScreen)` (WorkPage.tsx:11) so Shell's gate (Shell.tsx:73,194) refuses; redirect only staff-before-approval. Add `review/memo` to that loop.

## Should-fix

- `memoData(ix, state)` needs `findings` and `ai` too (state.ts:87 merges AI findings; split with `isAi`, merge.ts:117). Open = `visibleFinding` and not `findingStatus().cleared` (Checks.tsx:85); AI not acted on = `suggestionStatus().status === 'needs_review'` (merge.ts:107).
- "Every entry links to its event": ChangeLog has no anchors (ChangeLog.tsx:64-65). Add `id="e<seq>"` or drop "links".
- Reasons in `state.events` are already masked (project.ts:136-142,157): say "as recorded", not "exact words".
- Applied by: `adj.role` plus `payload.appliedBy` (Review.tsx:150). Tax effect: print `effect.basis` and the "Est" mark.
- "8 cleared": count finding blockers from the fixture; the walk clears "the rest" dynamically (acceptance-walk.spec.ts:506-509).
- RoleSwitcher drops `/memo` on switch (RoleSwitcher.tsx:22); acceptable.

## Fine

- Data exists: `signatures().byRecord/fingerprint/spouses` (signing.ts:93-111), `keyAmounts.needsEngine` (signing.ts:54), derived lines `claims[*].derived && from` (project.ts:125), partner sign-offs in `claims[*].signoffs`. Values: 72 14,000->10,500 gives 78 27,130->23,630 and 97 8,256->4,756 (v3, R-SUM).
- `review/memo/page.tsx` beside `review/page.tsx` is fine; no middleware.
- layout.spec, lean.spec:125, walk 4.2:531 (`/Approved.*Helen/`) and ux-tiers survive a button plus caption, provided the caption avoids the word "Approved".
