# Whole-app fix round: seven bugs, eight lean-ups

Source lists: the Fable code review of 7102816 + 13b1d37 (six should-fixes) and `docs/reviews/2026-10-18-whole-app-pass.md`
(top 10). Aarvin approved the merged list on 18 Oct 14:59 ("go for it").

**Product frame (from the 12:58 decision):** overview = what the return says and what stops it; Checks = what needs
attention; Review = what changed, who signed, can it be approved; side panel = where a number came from; clock = any
moment; "?" = meanings, firm rules and the demo guide.

**Rules:** tier b. Test first (red, then green) for every item with behaviour; copy-only cuts are covered by updating the
existing e2e tests that assert the old copy. Minimum change; nothing working breaks; every old link keeps working. The
acceptance walk (`tests/e2e/walk*.spec.ts`, 36 steps) keeps its steps, with only selectors or copy updated where a cut
element was asserted. No em dashes in UI copy. Never edit `case-study-project-package/`.

## A. Bugs

**A1. Review agrees with the packet on approval and signatures (trust bug).** At 16 Jul staff Review says "Partner
approval: Not yet" and "Ngozi has not signed", while the client's Filing page says she signed on 10 Jul and the return was
accepted. Cause to confirm first: Review's Approval box reads only workspace events (`approve`, `client_signature`), not the
packet timeline's approval and Form 8879 events that the client page and `clock.ts:66` already read.
- Fix: one helper (in `src/components/client/signing.ts` or `src/domain/`, wherever the client page's logic lives) that
  answers "approved?, who signed and when?" from workspace events OR visible timeline events; Review's Approval box and
  `StaffSigning` and the client Filing page all call it.
- Test (e2e, red first): at 16 Jul, as daniel on `/review?tab=approval` (or wherever the Approval box sits), the text does
  not contain "has not signed" or "Not yet", and does contain each spouse's sign date shown on the client page.
- Must hold: at the default time (23 Jun, before the 8879 in the timeline), the existing approval flow and its tests are
  unchanged.

**A2. California refund shown as "Balance due −8,256" on Areas.** Find where the balance-due row is labelled (Areas'
summary). A negative balance due reads "Refund 8,256"; a positive one "Balance due N". Reuse `keyAmounts`' `result.kind`
if it applies. Unit or e2e test: Areas at default shows "Refund 8,256" for California and no "−8,256".

**A3. A prior-year notice in this return's filing status.** `FilingStatus.tsx` (~lines 81, 111) lists every visible agency
notice; the IRS CP2000 is for tax year 2023. Show only notices whose tax year equals the household's tax year (2025).
Prior-year notices stay where they already appear (Documents, Areas prior preparer). Test: at 14 Apr and at default, the
filing status does not contain "CP2000"; at the examiner's time a 2025 notice, if any, still shows.

**A4. Clock clamp.** `policy.ts:143` accepts any `to`. Normalise it to a valid ISO time and refuse (or clamp) anything
outside [first timeline event, last timeline event] of the static packet. Today `to: 2999-…` locks the workspace (frontier
moves to 2999). Unit test in `policy.test.ts`: `to` = "2999-01-01T00:00:00Z" is refused (or clamped to the last event);
"garbage" is refused; a timeline time is allowed for every role.

**A5. Clients and the examiner do not see internal deadlines.** In the "?" dialog's Deadlines section, drop deadlines whose
text starts "Internal" for non-staff roles. e2e: as ngozi, open "?", Deadlines has no "Internal".

**A6. History line for a clock move** reads like a future event. Reword to "moved the clock from <date> to <date>" (and
the same sentence in Review's Changes tab if it renders clock events). Test: after a `clock_moved` event, the Changes tab
shows "moved the clock from".

**A7. The in-app note on how AI was used** went with Findings. Restore one sentence on Checks' AI section (and a line in
the "?" dialog): what the AI read, that its suggestions only appear on the final computed version, and that a person
decides on each. Recover the wording from the deleted Findings page (`git show 13b1d37^:project-build/src/components/work/Findings.tsx`)
and the removed ai.spec test (`git show 13b1d37^:project-build/tests/e2e/ai.spec.ts`); restore that test against the new home.

## B. Lean-up

**B1. Start here moves into "?" as a "Demo" section** (first section for every role): the one-sentence product line, the
five counts (`data-testid="counts"` keeps its id), the "Try…" line, the role list, and the workspace sentence. Removed from
`OverviewHead.tsx` (`StartHere` component no longer rendered there; delete it if nothing else uses it). Tests that look for
`counts` on the overview open "?" first.

**B2. One blocker list, on Checks.** The overview Forms tab replaces the "Blocking approval · N" list with one line:
"N items stop filing" linking to Checks (keep `section[aria-label="Blocking approval"]` as the wrapper so tests find it;
the link goes to `/checks`). Review's second full blocker list becomes the same one-line count and link. Checks keeps
the full list. A blocker on the whole return (claimId 'return') still has a home: if it is not on Checks today, the line
on Review links to its row. After filing, AfterFiling is unchanged.

**B3. Cut the intro paragraphs** under each screen title (overview subtitle, Checks intro, Review title intro, Changes
intro to one line, What-ifs duplicated heading, Documents trailing "Kind of document…" paragraph, client Filing intro).
Definitions stay behind "?" term marks. Review's h1 becomes "Review". Do not cut text that states a rule the brief needs
(e.g. "A signature goes stale…" on the client page stays).

**B4. Cut shell noise:** the "Saved" pill (`Shell.tsx:141`), the nav hints under labels (`lib.ts` hint maps, both staff
and client), and the History sidebar pane (`Shell.tsx:~215`); the bell and Review → Changes cover it. Clients' "Your
activity" pane goes too (their Home lists what they did). Check nothing else (tests, the walk) depends on the pane; if the
walk asserts it, point the step at Review → Changes or the client Home.

**B5. Role banner to one clause** (`Shell.tsx` ~46 and its siblings): e.g. "Preparer: you edit and propose." /
"Client: answer questions, send documents, sign when ready." Keep "Viewing as". Not cut: the brief requires enforced roles.

**B6. Side panel: evidence first.** In `ClaimDrawer.tsx`, "Where it came from" (source page and sources) renders before
the actions block. Read confidence is shown once per panel, as a number with a "?" term, not repeated per source. Hide
`ev-` ids and mini-page coordinates from the visible text (a `title` tooltip is fine). Keep every action and every test id.

**B7. AI suggestions readable.** On Checks, each AI suggestion's title names the line and amount it concerns (from the
suggestion's own fields: claim label and value) instead of a generic phrase; suggestions with the same title and claim are
grouped into one row with a count. Snake-case titles (`Duplicate_scan_double_counted`) are humanised. The status chip
stays. Test: no AI row title matches /_/ and no two AI rows share title+claim.

**B8. Documents and Areas wording.** Documents: drop the per-row reason sentence repeated on every row when a tag already
says it (keep it in the panel). Areas: humanise raw keys like `extraction extracted` (use `humanize` from
`domain/labels.ts`). Test: Documents tab text has the repeated sentence at most once; Areas has no "extracted extracted"
style raw key.

## Not in this round (kept on purpose)

- The clock stays visible in the bar for every role (Aarvin's temporal ask); the reviewer's suggestion to hide it for
  clients and the examiner is declined.
- Depreciation table split by jurisdiction: deferred.
- Moving Checks' inline forms into the panel: deferred.

## Verification

1. `npm run test` (unit) and `npx playwright test` (e2e) green; numbers reported.
2. `npm run build` clean (the dev-only term dedup flake from the code review must not appear on the build).
3. Screenshots at 1440 and 390 wide of: overview, Checks, Review approval at 16 Jul, the "?" dialog as daniel and ngozi.
4. Push to main; poll the live deployment until it serves the new commit; run the walk on live with `E2E_BASE_URL`.

## Revisions after Fable's plan review (15:06, docs/reviews/2026-10-18-fix-round-plan-review.md)

All its must-fix and should-fix items are adopted:
- A1: the signature helper also reads the packet timeline's 8879 event (both spouses, date only; never render its detail text, which holds PINs). Test asserts "10 Jul 2026" on Review and the client page at 16 Jul. Helen's Approve button at 16 Jul reads approved and filed, not "N blockers must clear first".
- A4: inclusive [first, last] timeline clamp inside `can` only; `frontierTime` untouched.
- B2: the one-line count keeps a link `a.qrow` with `href` to `/checks?claim=<first blocker>` inside the wrapper, so existing tests keep their shape.
- B3: "What-ifs from the engine" stays in one heading.
- B6/walk 1.1: coordinates and per-source confidence assertions move with the change; T5 order test is inverted, not deleted.
- B7: group only same title+claim+status; first id keeps `data-finding`; the rest listed inside the details. Humanise in `merge.ts`.
- B8: "extraction extracted" is the document panel header (`ClaimDrawer.tsx:336`), not Areas.
- A2: sign rule for `balance_due` keys in Areas' `KV`.
- A7: restore both sentences; drop the ledger-mark assertions.
- Every test listed in the review's item 3 is updated in the same change as the element it asserts.
