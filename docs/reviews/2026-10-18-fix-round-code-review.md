# Code review: whole-app fix round, commit 9c6eb41 (18 Oct 2026, 15:34 EDT)

Reviewer: Fable 5.1 (different model from the author). Read-only. Probed a production build (`next build` clean, `next start -p 3312`, AI e2e fixture loaded) with a Python/urllib script plus the full suites. Paths relative to `project-build/`.

Evidence: `vitest run` 29 files, 526 passed. `E2E_BASE_URL=http://localhost:3312 npx playwright test` 149 passed in 1.4 min (the 36-step walk included). 145 page fetches across 2 Mar, 14 Apr, 16 Jul, default, 26 Jan 2028 for daniel, helen, ngozi, irs: all 200, no "Application error". Old routes: `/firm` 307 to `?info=1`, `/changes` to `review?tab=log`, staff `/filing` to the overview, `/findings?claim=x` to `checks?claim=x`; client and examiner `/filing` serve 200. No em dash in any rendered page or in `src/`.

## Must-fix

None.

## Should-fix

1. **"N items stop filing" beside "Approved per the firm's record"** (`src/components/work/Review.tsx:91-93, 101-104`; `src/components/overview/OverviewHead.tsx:66-72`). `blockerLine` ignores `byRecord` and `frozen`. Probe at 12 Jul, helen `/review` Approval box: "11 blockers ... Approve the return [disabled] Approved per the firm's record. 11 items stop filing". At 16 Jul the same box reads "Approved and filed per the firm's record. 11 items stop filing". The overview at 12 Jul: "Blocking 11 items stop filing" while the record says the clients signed on 10 Jul. This is the A1 contradiction in a new sentence. When `byRecord` is true, say "11 open checks remain" (link kept) or hide the line.

2. **Client "Where your return is" at 12 Jul** (`src/components/work/Filing.tsx`, the Not-sent-yet copy): "Your tax team sends it once you have approved and signed." directly above the signing box's "You approved and signed the return." Same page, two answers. Read `signatures().byRecord` there too.

3. **Changes names the actor twice** (`src/components/work/ChangeLog.tsx:26, 72`): "Clock moved Jo Kimura moved the clock from 23 Jun 2026 ... to 16 Jul 2026 ... Jo Kimura Undo". The row already carries the byline; the summary can read "moved the clock from X to Y".

4. **B8 test passes on a zero it cannot prove non-zero** (`tests/e2e/fixround.spec.ts:280`). "Read by the engine" never appears in the Documents list at default (probe: 0 occurrences; 11 rows render an empty reason span, so the shared-sentence suppression does work). Assert instead that the Corroborates rows show the tag and an empty `.small`, or count a sentence that still appears once (the "Not extracted by the pipeline" row).

## Fine

- **A1.** 16 Jul, daniel `/review` Approval box: no "has not signed", no "Not yet", both spouses "10 Jul 2026, 20:05 UTC, per the firm's record"; helen's button `disabled title="Approved and filed per the firm's record."`, no "must clear first"; ngozi and erik `/filing` show 10 Jul 2026 and no "Not signed". PIN scan: the two 5-digit strings from `tl-20` (read with `python3 -I`, never printed) appear in neither text nor raw HTML of 10 roles x their screens plus 40 finding panels and two line panels, at 16 Jul and 26 Jan 2028. `recordSignedAt` reads `t.at` only (`signing.ts:133-135`). Default-time flow: `clientlane.spec` (approve, each spouse signs, stale, closed) passed.
- **A4.** 2999 and 2000 and 17:05:59 on 12 Jan 2026: 403 "The story runs from Jan 12, 2026 to Jan 26, 2028. Pick a time inside it."; "garbage": 403 "payload.to must be a date and time."; irs to the last event, irs back to the first, ngozi to the last: 200. `can` is called with the static index (`src/server/state.ts:133`), so the clamp never shrinks to the visible timeline.
- **A5.** ngozi, erik, irs `#firm-dl`: five filing deadlines, no "Internal"; daniel keeps "Internal: preparer hand-off to review".
- **A2/A3.** Areas: "California: Refund 8,256", "Federal: Balance due 4,220", no "-8,256". CP2000 absent from `filing-status` at default, 14 Apr, 16 Jul; "Letter 566" present at 26 Jan 2028 (fixround A3 passed).
- **A6/A7/B7.** Both clock sentences render; the AI note is on Checks and in "?". The only snake-case string left in the AI group is the held-back id `ai-document_not_reflected-1` in `ai-held`, an identifier, not a title.
- **Deleted coverage.** Every assertion removed with a cut element has a replacement of the same shape (`gaps` G1, `reset`, `work` blockers, `ux-tiers` T5 inverted, walk 1.1 tooltip). Walk 5.1's "the fix that followed" now asserts the story bar, which is true by construction; `filing-status` does show "Rejected 13 Jul 2026", so that step could assert it instead. Low priority.
- `Demo` declares a `role` prop it never reads (`src/components/info/Demo.tsx:10`); harmless.
