# Plan review: whole-app fix round (18 Oct 2026, 15:05 EDT)

Reviewer: Fable 5.1 (different model from the author). Read-only against the code at 13b1d37 + working tree; no dev server needed. Paths relative to `project-build/`.

## Must-fix

1. **A1 cause is half wrong, and the test premise fails.** Nothing reads the timeline 8879 event for signatures: `signatures()` (`src/components/client/signing.ts:79-93`) reads only `client_signature` events, and the client page simply *hides* unsigned rows once frozen (`src/components/client/ClientFiling.tsx:106-108`). On a fresh workspace at 16 Jul the client page shows no sign date, so "does contain each spouse's sign date shown on the client page" asserts nothing. Fix the helper as planned; assert "10 Jul 2026" on both pages. Also: the timeline event `tl-20` has `actor: null` and its `detail` carries both spouses' full PINs. Render only the date (both spouses, 2026-07-10T20:05Z); never the detail text.

2. **A4 bounds.** Timeline spans 2026-01-12T17:06Z to 2028-01-26T15:00Z; examiner `activeFrom` is 2028-01-20 and walk 6.2 moves to the last event, so an inclusive `[first, last]` clamp in `can` (`policy.ts:143`) is safe. `tests/unit/policy.test.ts:97` projects `to: 2028-02-01` directly (bypasses `can`), so leave `frontierTime` (`project.ts:54-59`) alone or that test's intent changes. Reset already clears a 2999 frontier (`sinceLastReset`).

3. **Tests the plan does not list but will break:**
   - A3: `tests/e2e/lean.spec.ts:120` asserts the CP2000 link in `filing-status` at 16 Jul.
   - B1: `trace.spec.ts:8-16,102-106` (`start-here` testid, "IRS examiner", brand sentence), `reset.spec.ts:15,27` (Dismiss button, `start-here` visible after reset), `overview.spec.ts:20`, walk 0.1 (`acceptance-walk.spec.ts:103-106`).
   - B2: `overview.spec.ts:25-30` needs `a.qrow` with `href=/checks?claim=` inside the wrapper and clicks it; `fix-f1.spec.ts:84-88` reads `.qrow` texts and expects >0 distinct. Keeping the `section` alone does not satisfy either.
   - B4: `.sh-hist` in `gaps.spec.ts:20`, `reset.spec.ts:18,38`, walk 2.2 (`:286-287`); "Nothing recorded in this workspace yet." (History pane text, `Shell.tsx:216`) in `reset.spec.ts:24,29` and walk 0.1 (`:107`). ChangeLog's empty text differs (`ChangeLog.tsx:56`).
   - B6: `ux-tiers.spec.ts:63-66` (T5) asserts actions *above* "Where it came from"; walk 1.1 asserts `/Field: \S+ at \d\.\d+, \d\.\d+/` (`:120`, coordinates) and `/Pipeline read 0\.\d+/` (`:123`). Keep "Pipeline read 0.xx" wording or update the step.
   - B3: `lean.spec.ts:104` and walk 1.5 (`:190`) assert "What-ifs from the engine"; keep it in one of the two headings (`WhatIfs.tsx:18,20`).

4. **B8 misattributes "extraction extracted".** It is the document panel header, `src/components/drawer/ClaimDrawer.tsx:336` (`extraction {status}`), not Areas (`Areas.tsx:238` reads "No values extracted (status)"). The planned "Areas has no raw key" test would pass on a zero it cannot prove non-zero. Point the test at the drawer.

## Should-fix

5. **A2 cause confirmed:** `Areas.tsx:168` renders `v.summary` through `KV`/`colLabel` (`:22-23, 51-60`); `california.balance_due: -8256` in the packet. `keyAmounts.result.kind` reads lines, not the summary; a sign rule inside `KV` for keys matching `balance_due` is the minimum change.

6. **A7 wording.** The deleted test asserted "found during an AI-assisted review of the packet and are now caught by deterministic checks" plus ledger-row marks (`tr[data-ledger]`) that no longer have a home. Restore that sentence (it is the brief's "how AI was used") alongside the reader sentence; drop the ledger-mark assertions.

7. **B7 grouping hides per-suggestion state.** Each row carries its own `data-finding`, status and "Review the suggestion" link (`Checks.tsx:219-233`); `ai.spec.ts:14-17` locates the fixture row by id. Group only same title+claim+status, keep the first id on the row, and list the rest inside the details. `Duplicate_scan_double_counted` is an `otherKind` label (`merge.ts:24-28`); humanise there.

8. **A1 follow-on:** at 16 Jul Helen's Approve button still says "N blockers must clear first" (`Review.tsx:66,83`) while the box will say Approved. Disable it with "Approved and filed per the firm's record" when the helper says approved.

## Fine

- A3: CP2000 is `tax_year: 2023`; `household.tax_year` is 2025; Letter 566 (2025, dated 2028-01-20) survives the filter. `FilingStatus.tsx:16` confirmed. Documents keeps D70; Areas prior preparer has no notices (`prior_years` has none), so the "stays on Areas" claim is harmless but untrue.
- A5: `FirmInfo.tsx:133-150` shows every deadline to every role; the bell already limits deadlines to staff (`notify.ts:238`). `notify-story.spec.ts:52` is Jo's bell, unaffected.
- A6: `ChangeLog.tsx:23` renders "to <date>"; `from` is present only for UI moves (`StoryClock.tsx:15`), absent for API moves; handle both.
- B5: no test asserts banner sentences. Terms first-use test (`terms.spec.ts:67-83`) is unaffected by removing banner marks.
- Product frame: every item fits the 12:58 frame; nothing over-reaches. The "Demo" section as first "?" section for clients and the examiner duplicates the role switcher but matches the agreed frame.
