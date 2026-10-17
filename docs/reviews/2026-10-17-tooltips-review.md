# Review: "?" term tooltips and the no-slop copy pass

Reviewer: Claude Fable 5.1 (cross-model), read-only. Sat 17 Oct 2026, 15:29 to 15:34 EDT (`date`). Round under review: uncommitted
working tree on `main` after 23ea0f3 (`git status`): `src/components/term/{terms.ts,Term.tsx,Term.module.css}`, marks placed across
`src/components` and `src/app`, `tests/unit/terms.test.ts`, `tests/e2e/terms.spec.ts`, and the slop edits to `src/domain/checks/**` and
`src/domain/notify.ts` (originals in the lane W scratchpad `orig/` tree; the six files that differ from `orig/` are exactly the six in `git diff`).

Every finding names its probe. Anything not reproduced is marked **hypothesis**.

## Verdict

Ship after two definition fixes. The component behaves well (keyboard, hover, tap, Escape, 390px, button inside `<summary>`, dark mode)
and nothing regressed. Two of the 66 definitions state a tax rule wrongly for this household; three more are loose enough that a
20-year CPA would mark them.

## Must-fix

1. **`terms.ts:9` `form-540nr`: "It taxes California-source income" is wrong for a part-year resident.** A part-year resident is taxed on
   all income received while a California resident plus California-source income while a nonresident, at the rate a full-year resident
   would pay on everything. This household moved to Texas mid-year, so the entry describes the wrong base.
   Source: FTB, [Part-year resident and nonresident](https://www.ftb.ca.gov/file/personal/residency-status/part-year-and-nonresident.html);
   [2025 Instructions for Schedule CA (540NR)](https://www.ftb.ca.gov/forms/2025/2025-540nr-ca-instructions.html) (column E).
   Proposed (28 words): *California's return for nonresidents and part-year residents. It taxes income received while resident plus
   California-source income after the move, at the rate a full-year resident would pay.*
2. **`terms.ts:30` `form-8960`: "3.8% on investment income once modified AGI passes $250,000" misstates the base.** The tax is 3.8% of the
   *lesser* of net investment income or MAGI above the threshold. IRS example: MAGI $300,000, NII $225,000, tax on $50,000 = $1,900, not on
   $225,000. The $250,000 joint threshold is right.
   Source: IRS [Topic no. 559](https://www.irs.gov/taxtopics/tc559); [Questions and Answers on the NIIT](https://www.irs.gov/newsroom/questions-and-answers-on-the-net-investment-income-tax).
   Proposed (22 words): *Net investment income tax: 3.8% of the smaller of net investment income or modified AGI above $250,000 on a joint return.*

## Should-fix

3. **`terms.ts:46` `safe-harbor`: "110% at higher incomes" hides the test.** The 110% figure applies when the prior year's AGI was over
   $150,000 ($75,000 married filing separately). Source: IRS [Instructions for Form 2210 (2025)](https://www.irs.gov/instructions/i2210).
   Proposed (25 words): *Paying in 90% of this year's tax, or 100% of last year's (110% if last year's AGI was over $150,000), avoids the
   federal underpayment penalty.* Note, unsourced in this pass (hypothesis for the editor to confirm in the FTB 5805 instructions): California
   drops the prior-year safe harbor entirely when AGI is $1,000,000 or more.
4. **`terms.ts:41` `depreciation`: silent on the 2025 law change that the GT-C06 finding depends on.** P.L. 119-21 (4 Jul 2025) restored
   100% bonus depreciation for property acquired after 19 Jan 2025; "allow more in the first year" undersells why section 179 "costs nothing
   federally" for this equipment. "Useful life" should be "recovery period" for this audience. California: no bonus, section 179 capped at
   $25,000 (phase-out from $200,000). Sources: IRS [Publication 946 (2025)](https://www.irs.gov/publications/p946) and the
   [Notice 2026-11 release](https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill);
   FTB [2025 Instructions for FTB 3885A](https://www.ftb.ca.gov/forms/2025/2025-3885a-instructions.html).
   Proposed (30 words): *Deducting an asset's cost over its recovery period. Bonus depreciation (100% for property acquired after 19 Jan 2025)
   and section 179 front-load it; California allows no bonus and caps section 179 at $25,000.*
5. **`terms.ts:21` `form-4797`: the 25% rate is not computed "here".** Equipment (section 1245) recapture is ordinary income on Form 4797;
   for buildings the gain attributable to depreciation is *unrecaptured section 1250 gain*, taxed at up to 25% through the Schedule D tax
   worksheet, not recaptured on 4797. Stated from the Form 4797 and Schedule D instructions; not re-fetched in this pass.
   Proposed (29 words): *Sales of business or rental property. Depreciation on equipment is recaptured as ordinary income; on buildings it
   becomes unrecaptured section 1250 gain, taxed at up to 25% through Schedule D.*
6. **`Term.tsx:87` a click or tap inside the open tooltip closes it.** Probe (`rev-probe/probe.mjs`, section 2): after pinning by click,
   `tip.click()` left `getByRole('tooltip')` at count 0. Cause: the tooltip is not focusable, so the button's `onBlur` fires with
   `relatedTarget === null` and `close()` runs, even though the `pointerdown` guard at line 54 correctly ignores the tip. On a phone, tapping
   the text to read it, or trying to select a form number, dismisses it. Fix: give the tip `tabIndex={-1}` (so `relatedTarget` is the tip) or
   set a ref in the tip's `onPointerDown` and skip `close()` in `onBlur` when it is set.

## Nits

7. `terms.ts:34` `fbar`: say "exceeded $10,000 at any time during the year" (aggregate maximum). Source: IRS
   [FBAR page](https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar). Current text is not wrong.
8. `terms.ts:11` `form-8879`: add "for three years". Source: [Form 8879](https://www.irs.gov/pub/irs-pdf/f8879.pdf) ERO instructions. FTB 8879 is four years (from memory; confirm).
9. `terms.ts:40` `passive-loss`: "does not materially work in" reads oddly to a CPA; "does not materially participate in" is the term of art.
10. `terms.ts:31` `k-1`: omits Form 1041 (estates and trusts) while `sch-e` names them; `terms.ts:43` `qbi`: Form 8995-A above the income limits.
11. `terms.ts:48` `extension`: correct (file by 15 Oct; pay by 15 Apr; California needs no form, FTB 3519 is payment only). Source: FTB
    [Extension to file](https://www.ftb.ca.gov/file/when-to-file/extension-to-file.html). `terms.ts:44` `estimated-tax` 30/40/0/30 confirmed:
    FTB [Estimated tax payments](https://www.ftb.ca.gov/pay/estimated-tax-payments.html). `letter-566` matches the IRS initial-contact-letter
    family (566-S, 566-B): IRM [4.19.13](https://www.irs.gov/irm/part4/irm_04-019-013r).
12. `Term.tsx:82` `aria-label` reads "What is Viewing as?" for the header mark (label 'Viewing as'); consider "What does Viewing as mean?" for labels that are UI names.
13. `Term.tsx:24-29` SSR carries duplicates: with JavaScript off, `/return` has `form-4562` twice (F4562 and F4562-C); hydration removes one
    via `useLayoutEffect` before paint, so no flash was seen. Probe section 1 (`ssrDuplicates`).
14. **Hypothesis**, `Term.tsx:27`: the "first in DOM wins" rule ignores visibility. On `/areas` the surviving marks for `sch-d`, `read-confidence`,
    `basis`, `form-7203` are inside closed sections (probe section 4, `checkVisibility()` false). No visible later use was suppressed on any of the
    nine screens probed, so no defect today; a `checkVisibility()` test in the dedupe would make it robust to future placements.
15. Dark mode (probe section 3): glyph `oklch(0.74)` on `oklch(0.23)` is roughly 7:1 (estimate from L^3); the 16px circle border `oklch(0.33)`
    on `oklch(0.23)` is about 1.5:1, under the 3:1 non-text guideline, but the glyph carries the affordance. Tooltip text 0.93 on 0.23 is fine.
16. Checks screen: "never instead of them" (engine diagnostics never replace the firm's checks) is gone from the whole source after the slop
    pass (`grep -rF "never instead of them" src` = 0; it appeared twice before). The `engine-diagnostics` term keeps the idea ("apart from the
    firm's own checks"). A stance, not a fact; mention only because the removal was global.

## Priority 2: information loss in the slop edits

Compared `orig/` against the working tree for all ten files (`diff -q`); six differ and match `git diff` exactly. Each edit, with verdict:

| File:line | Change | Loss? |
|---|---|---|
| `catalogue.ts:48` GT-B03 | "appearing in the story" → "and it appears in the story" | none |
| `catalogue.ts:51` GT-B04 | "the summary gap is named, not just reported" → "traced to them" | none; "them" = the unread pages, more specific |
| `catalogue.ts:57` GT-C01 | one sentence split in two | none |
| `catalogue.ts:70` GT-C07 title | "carried silently, never flagged" → "was carried and never flagged" | none |
| `ignored-field.ts:67` fx | colon → comma before "a change of" | none; all figures and `${want}` kept |
| `judgment.ts:80` home office | "Estimate shown: the later home alone" → "The estimate shown uses the later home alone" | none |
| `limit.ts:31` SEP | "Decide: withdraw… ; tell the client" → "Decide whether to… and tell the client" | none |
| `prior-year.ts:36` | colon → semicolon; "overstated" → "was overstated" | none; `${fmt(over)}` and `${prior}` kept |
| `notify.ts:102` | "is stale: the value changed" → "is stale because the value changed" | none; `notify` and `notify-story` suites pass |

No number, line key, form, document id or evidence reference was removed. Screen-text removals in the component diff were checked by phrase:
"how far to trust the source", "plain label for where it comes from", "times are UTC", "value changes are refused", "Federal safe harbor",
"open the root link again", "fixes interact", "moved past the firm" all still present once (grep counts); the removed lines were re-wrapped to
insert marks, not deleted. The header line "Actions are recorded as the role you choose" moved to a visually hidden `#sh-attrib` span
(`RoleSwitcher.tsx:30`) that still describes the select; e2e test 3 confirms.

## Priority 3: behaviour, measured

- `tests/e2e/terms.spec.ts` against `next start -p 3400`: 4 passed in 2.9s (hover + focus + Escape; 390px tap inside viewport; header line
  behind the mark; one mark per term on 12 screens).
- Probe (`rev-probe/probe.mjs`): 24 marks sit inside `<summary>` on `/return`; click, Enter and Space on the mark left `details.open` unchanged
  (true before and after each); Escape closed the tip and left the section open. Tab away closes (count 0). Hover opens, mouse-out closes
  within 300ms. Hit area 24×24px. Tooltip `z-index` 39 (under toasts, over dropdowns), font 13px.
- Priority-3 defects: item 6 (tap inside tip closes it); nits 12 to 15.

## Priority 4: regressions

Run from `project-build` with `set -o pipefail`, exit codes printed by `echo $?` after the pipe:

- `npm test`: 19 files, 388 passed, exit 0 (`tests/unit/terms.test.ts` is one of the 19: run alone, 136 passed, exit 0).
- `npm run typecheck`: `tsc --noEmit` silent, exit 0.
- `npm run scan`: `ssn scan: values 5 hits 0` (the zero is proven able to be non-zero: 5 values were checked).
- `npm run build`: route table printed, all `/w/[ws]/[role]/*` routes dynamic.
- Server on port 3400 returned 200 for `/w/rev-probe/daniel/return`; killed with `pkill -f "next start -p 3400"` and confirmed down.
- First harness logged `TEST_EXIT=` empty because it used bash `PIPESTATUS` under zsh; the reruns above print the codes correctly.

Constraints kept: no app code edited, no packet files opened, no commits, deploys or pushes. This report is the only file written in the repo.
