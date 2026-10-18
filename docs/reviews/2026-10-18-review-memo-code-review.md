# Code review: review memo (commit 3285c2e)

Reviewer: Claude Fable 5.1 (not the author). Read-only. Probed on `next build` + `WORKPAPER_STORE=file next start -p 3314`, Playwright
(chromium), PDFs inspected with PyMuPDF under `python3 -I`. Sun 18 Oct 2026 18:07-18:15 EDT. Paths relative to project-build/.

## Must-fix

None found.

## Should-fix

1. **Print pads to three pages where two would do.** `.memoSec{break-inside:avoid-page}` (work.module.css) moves each section that
   does not fit to a fresh page: Letter PDF, 1,844px of content, 3 pages; page 1 ends with 226pt (3.1in) blank after the moved-lines
   table, page 2 with 285pt (4in) blank after the resolutions. Margins themselves are right (44pt all round, `@page { margin: 0.6in }`
   honoured with and without Playwright's `margin` option, `preferCSSPageSize` either way); nothing is clipped. Drop `avoid-page` on
   `.memoSec`, keep `break-inside:avoid` on `.memoItem` and `li`, add `break-after:avoid` to `.memoH2`.
2. **The PIN assertion tests the wrong thing.** `expect(text).not.toMatch(/PIN\s*\d{4,}/)` only catches a PIN next to the word.
   Read the 8879 timeline event's `detail` in the test, take its 5-digit runs, assert each is absent from `page.content()`; never
   print them. (Probe result: the detail has one 4-digit and two 5-digit runs; the only hit in either memo's HTML is the 4-digit
   one, a year or form number; no 5-digit run; no `ddd-dd-dddd`; no full SSN of any household person.)
3. **domain -> components import.** `src/domain/memo.ts` is now the only file under `src/domain` importing `@/components`
   (`client/signing.ts`). `signing.ts` is itself pure domain (imports only `@/domain`) but has 13 importers; `memo.ts` has three
   (Memo.tsx, Review.tsx, memo.test.ts). Minimum change: move `memo.ts` to `src/components/work/memo.ts`, beside `lib.ts` which
   already holds `findingStatus`/`partnerThreshold`. No lint boundary enforces either way, so leaving it is acceptable.

## Fine, with evidence

- Before approval: button disabled, "Available once the partner approves the return" in the Approval box; `/daniel/review/memo`
  redirects to `/daniel/review`; ngozi gets "Not part of this view", irs "Not yet in the story", no `memo` test id.
- After the dry run (adjust 72 to 10,500, partner sign-off, 8 findings cleared, approval, both spouses sign): "Approved by Helen
  Strand, 23 Jun 2026, 06:05 UTC"; figures "v3 plus 1 adjustment", CA payments 23,630, Refund 4,756; moved lines 78 27,130 to
  23,630 and 97 8,256 to 4,756; 8 "Cleared:" lines = 8 `finding_cleared` events, 2 "Resolved by the change to", 1 "Partner sign-off
  by Helen Strand" = 11 resolved; open "0 blockers, 14 checks, 2 judgments, 1 info; 39 AI suggestions" matches Checks (All 27,
  Blocker 10, AI 39 need review). `claims.return.signoffs` = one partner, `stale:false`.
- Adjust after approval: button disabled with "The return changed after approval; approve again"; memo route redirects.
- 16 Jul: "Approved per the firm's record: the clients signed Form 8879 on 10 Jul 2026. No partner approval event in this
  workspace."; both signatures "(firm's record)"; 0 changes. Role switch from the memo lands on `/helen/review` cleanly.
- Dark mode print (`colorScheme: dark`, and `data-theme="dark"`): white page, dark ink; sampled pixels 255,255,255 dominant.
- Shell nav keeps `aria-current` on Review. No em dash in Memo.tsx, Review.tsx, memo.ts or the rendered text. Unit 4/4, memo.spec
  5/5 against the production server.
- Observation only: at 16 Jul with earlier workspace adjustments the memo would say "per the firm's record" above figures titled
  "v3 plus N adjustments"; `basisText` keeps that honest, as the plan intended.
