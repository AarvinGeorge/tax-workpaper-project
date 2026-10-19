# A finding says when confidence gave no warning

Aarvin, 18 Oct 22:07: "the one-sentence 'read at 0.99 and still wrong' note on a finding. Do this if you think it's
actually needed. Evaluate first." Tier b. Plan, Fable plan review, test-first build, Fable code review, deploy, live walk.

## Evaluation (measured 22:07 EDT, `runChecks` on the real packet, read confidence of each ledger finding's evidence)

- 25 of the 27 ledger mistakes rest on extracted values read at 0.96 to 0.99. The exceptions: GT-B03 (one value at
  0.60) and GT-B05 (no extracted values, an open item).
- In most of them the pipeline read the page correctly; the mistake is in how the value was used (counted twice,
  wrong tax year, a client's guess, a rule that ignores a field). So the proposed words "read at 0.99 and still wrong"
  are false for most findings. The true statement is that confidence gave no warning and a check caught it.
- Today the finding panel shows "Pipeline read 0.98 to 0.99" inside the Evidence section, lower down, with no
  interpretation. The brief's phrase "confident mistakes" is never connected on screen to what the app did about them.
- Verdict: needed, small, with corrected wording.

## The change

One sentence in the finding panel's head (`FindingClaim` in `src/components/drawer/ClaimDrawer.tsx`), under the
explanation, above the actions, so it is seen without scrolling:

> **Confidence gave no warning.** Every value behind this was read at 0.98 to 0.99; this check caught it by comparing sources.

- Shown when: the viewer is staff, the finding is from our checks (not AI), it has at least one extracted-value
  evidence ref, and every such ref's confidence is at least 0.95 (`CONFIDENT = 0.95`, a named constant with a one-line
  comment: the packet reads 3,010 of 3,012 values at 0.9 or above, so 0.95 means "the pipeline was sure").
- The range is the same as the existing `ReadConfidence` (min to max, two decimals; one number when equal). Extract
  one small helper used by both, so the two can never disagree.
- Not shown for clients (they see the plain-language version, no pipeline terms) or the examiner.
- `data-testid="confident-note"`. No new colour; the existing `small` text with the first three words bold.
- No change to checks, findings, the domain, or any other screen.

## Tests first (red, then green)

- Unit: the helper `confidentRange(refs)` returns `{lo, hi}` when every value ref is ≥ 0.95, and `null` when any is
  below, when there are none, or when refs carry no confidence.
- e2e (`tests/e2e/fixround.spec.ts` or a new small spec), as daniel at the default time:
  - `/checks?claim=finding:<the F540NR.72 tax-year finding id>` shows `confident-note` containing "Confidence gave
    no warning" and "0.98 to 0.99";
  - a finding whose evidence includes the 0.60 value (GT-B03, the crypto lot after msg-07, at a story time when it is
    visible) shows no `confident-note`;
  - as ngozi, a client-visible finding shows no `confident-note`.
- Finding ids are read from the page or `runChecks`, not hard-coded beyond what existing tests already use.

## Out of scope

Checks list rows, Forms tags, any label naming the ledger (GT ids stay out of the product), copy elsewhere.

## Rules

Minimum change; nothing working breaks; never edit `case-study-project-package/`; no em dashes in UI copy; last-4
masking unchanged. Verification: unit and browser suites green, `npm run build` clean, screenshot of the panel,
push, poll live, walk 36/36 plus the new spec on live.

## Revisions after Fable's plan review (22:11). These override the body.

- **Wording, true for all 26 findings that show it** (several families compare a value with a rule or cap, not with a
  second source; GT-A07 is a real misread): "**Confidence gave no warning.** Every value behind this was read at 0.98
  to 0.99; a score says how surely the text was read, not whether the return is right. This check is what caught it."
- **Threshold comment:** 0.95 is the pipeline's top band (2,680 of 3,012 values; 332 sit at 0.90 to 0.94). "Every
  value behind this" means the finding's extracted values (`ev-` refs) only, as `ReadConfidence` already counts.
- **Tests:** positive `finding:CHK-PAYMENT-TAX-YEAR:line:F540NR.72`; negative GT-B03
  `finding:CHK-ANSWER-AFTER-COMPUTATION:line:F8949.H.C6` after moving the clock to the last event (its firstVisibleAt is
  30 Jun); ngozi on `finding:CHK-IDENTITY-VS-DOCUMENTS:line:F8812.4` shows no note.
