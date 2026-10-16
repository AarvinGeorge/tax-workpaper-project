# The packet README, in plain words

Source: `docs/packet/readme-verbatim.md` (exact copy of the packet's `readme` key). Packet examples come from read-only
queries (`scratchpad/disc/readme/probe.py`, `probe2.py`, run with `python3 -I`). Written 15 Oct 2026, 23:59 EDT (03:59 UTC 16 Oct). Anything marked
*background* is general tax knowledge, not from the README or packet. Design points are **proposals, not decisions**.

## 1. Summary

The README is the packet's instruction sheet. It says what the packet is (everything the firm's software produced for
one client's 2025 return, but no review work), defines every field, and gives a short code for every kind of
reference. Three rules matter most:

1. **What is printed on the page is the truth.** The pipeline's readings and the engine's computed return "can be
   wrong", even at high confidence.
2. **We cannot rerun the engine.** To estimate the tax effect of a change, multiply it by that version's
   `tax_effect_rates`. Where the packet already has an engine result for an alternative (`what_if`), it gives that result
   (preferring it over the estimate is our inference).
3. **"Now" is v3, 23 Jun 2026.** Everything later in the timeline is a scripted future to replay. Any amounts it
   mentions mean the return *our workpaper* finalizes, not v3.

## 2. Key by key

### `what_this_is`
- **Says:** the packet is "Everything Miraflores' pipeline would hand the workpaper": documents, extracted values,
  client answers and messages, prior years, tax agency records, firm settings, and the return "as computed at three
  moments". "It is pipeline output, not a workpaper: it contains no reviews, notes, sign-offs or decisions. Those are
  yours to design."
- **Plain:** we get the raw material and the machine's answer. Every human layer (checks, notes, approvals) is ours to add.
  Example: v1 (4 Mar), v2 (19 Mar, after the corrected Meridian 1099), v3 (23 Jun, after the late Ridgeline K-1).
- **Design:** treat the packet as a read-only base. Store all human work as a separate layer on top, so the packet is
  never edited.

### `all_data_is_invented`
- **Says:** people, companies, numbers, SSNs ("the 666 prefix is never issued"), EINs, PTINs and accounts are fictional.
- **Plain:** no real person's data is here. The SSNs are deliberately impossible ones.
- **Design:** we can show the data in a demo, but should still build masking and view logs for SSNs, because the
  brief asks for sensitive-data protection.

### `truth_and_mistakes`
- **Says:** "`documents[].pages[].printed_content` states what is actually printed on each page. `extracted_values`
  states what the pipeline read, which can be wrong. `return_versions` reflect the engine's reading and rules, which
  can also be wrong. The packet contains mistakes with high confidence scores, as real pipeline output does."
- **Plain:** there are three layers of trust. The printed page beats the reading, and the reading feeds the computed
  return. A 0.98 confidence score does not mean it is right. Example: ev-0498 (D28 p3, lot N1 basis) has empty
  `text_as_read` but value 0.0 at confidence 0.98. Behind that is GT-A01, the RSU sales taxed at $0 basis.
- **Design:** every number shows its three layers side by side (printed → read → used) and runs checks that compare
  them. Confidence is a sort key, never a pass mark.

### `no_page_images`
- **Says:** "There are no page images. position values in extracted_values are synthetic: use them only to place
  highlights on a rendered representation of printed_content if you want to."
- **Plain:** documents are text only. The boxes (fractions of the page from the top-left) are made up, so they
  don't map to any real scan.
- **Design:** render each page from `printed_content` and highlight the field by matching text first, using the
  box only as an optional hint. Anchor links to document + page + field, so real PDFs could replace the
  simulated pages later.

### `engine_and_recomputing`
- **Says:** the engine is "simplified". Its rates, thresholds and rules are in `engine_reference`: "treat them as
  given". "California AMT is not computed." "You cannot rerun the engine: to show the tax effect of a change,
  multiply the change by the matching rate in `return_versions[].tax_effect_rates` (federal and California, per
  dollar). `what_if` holds engine results for specific alternatives."
- **Plain:** we don't argue with the engine's tax tables (97 rules, 40 parameters). To estimate what a fix is worth,
  multiply. Example from v3: $1,000 more wages ≈ +$310 federal, +$99 California. Five engine-computed alternatives
  exist (Section 179, no bonus depreciation, HVAC as improvement, standard deduction, annualized penalty).
- **Design:** every adjustment shows an *estimated* tax effect (labelled as an estimate, with its rate category and
  version). Where a `what_if` matches the change, show the engine's figure instead and say so (our inference, not a
  README rule).

### `where_now_is`
- **Says:** "v3 (2026-06-23) is the latest engine output and the current return. Timeline events after that (client
  approval, e-file rejection and acceptance, payments, refunds, the 2028 examination letter) are scripted for replay;
  where they mention amounts, they mean the return as your workpaper finalizes it."
- **Plain:** the app's clock starts at 23 Jun 2026. Twelve timeline events (tl-18 to tl-29, running to Jan 2028) are
  the future, to be played forward. Two documents (D71 Theo's SSN card, 13 Jul 2026; D72 IRS Letter 566, Jan 2028) and
  messages msg-07 to msg-10 arrive after v3. The Aug 2026 IRS transcript even has text where amounts should be ("total tax on the
  return as filed (your final return)").
- **Design:** a replay clock. Items dated after "now" stay hidden until replayed. Post-filing amounts (balance paid,
  refund) are computed from our finalized return, not copied from v3.

### `reference_formats`
- **Says:** a short prefix for every kind of pointer (full list in section 3). `py:/` and `agency:/` use JSON Pointer
  (RFC 6901). `doc:<id>#page<n>` is "a page of a document that the pipeline did not extract". Line keys are
  `<form>.<line>`. A line's inputs "are keys of other lines in the same version".
- **Plain:** a source is not always a document. It can be a client answer, a prior-year figure, an engine parameter,
  an asset or a timeline event. Example: `F1040.11` (AGI, 445,590) has inputs `F1040.9` and `F1040.10` and no direct sources.
- **Design:** one resolver that turns any reference string into a clickable target. A reference it can't resolve is
  itself a flagged check.

### `sections`
- **Says:** field-by-field definitions for every part of the packet (table in section 3), plus the rules for using
  the tax-effect rates (section 4).
- **Plain:** the data dictionary. Notable phrases: household `people[]` are "exactly as the client entered them";
  basis records: "Gaps are real gaps"; firm standards are "a starting point you may change".
- **Design:** client-typed data (household `people[]`) is shown as *client-stated*, never as verified. Basis gaps are shown as
  open items, never filled in.

### `form_codes`
- **Says:** the list of form codes the engine uses. "Line numbers follow the 2025 forms where the engine maps them."
- **Plain:** the README names 35 codes (counting F8995 and F8995A separately); 34 appear in v3's 627 lines (F8995A never does). Form 8949 alone has 302 lines (one per stock lot).
- **Design:** group lines by form. Fold the 8949 lots into a summary that can be expanded, so a reviewer isn't
  buried in 302 rows.

## 3. Reference formats, sections and form codes

**Reference formats**

| Code | Points to |
|---|---|
| `ev-NNNN` | one extracted value (3,012 exist) |
| `D01..D74` | one document |
| `qa-NN` / `msg-NN` / `call-NN` | a questionnaire answer / client message / call note |
| `py:/…` | a spot inside prior-year records |
| `agency:/…` | a spot inside IRS/FTB records |
| `asset:<id>` | an asset in this version's list or in prior-year asset records |
| `household:<id>` | a person in the household (ngozi, erik, ada, theo) |
| `ref:param.<name>` / `ref:fx.SEK.<rate>` | an engine parameter / a Swedish krona exchange rate |
| `timeline:<id>` | a timeline event (tl-NN, or extension-2026-04-14) |
| `doc:<id>#page<n>` | a page the pipeline never extracted |
| `<form>.<line>` | a return line, e.g. `F1040.11` |

**Sections**

| Section | Plain meaning |
|---|---|
| `packet` | name, version, generation date (2026-10-12), client id |
| `household` | filing status; people ("exactly as the client entered them"); addresses and residency dates (CA to 14 Jul, TX from 15 Jul); refund bank; prior-year AGI for e-signature; related returns |
| `documents` | 74 documents: who issued them, whose they are, when received, pages of text, CORRECTED flag (D31), extraction status (68 extracted, 2 partial, 4 not extracted) |
| `extracted_values` | each value read: field, value, type, text as read, synthetic box, confidence |
| `client.questionnaire` / `.messages` / `.call_notes` | client answers, 10 messages, 1 call |
| `firm` | firm identity, staff, client users, deadlines, budget hours, starter standards (5 verification types, variance rule >10% and >1,000, 3 review levels) |
| `prior_years.return_2024` | last year's filed return, line by line, sourced to D06 |
| `prior_years.prior_preparer_workpaper` | the previous preparer's memo and open items (D07) |
| `prior_years.asset_records` | assets bought before 2025 and their depreciation history |
| `prior_years.basis_records` | S-corp stock basis, partnership capital, IRA basis, home cost. Gaps are real |
| `prior_years.carryovers_into_2025` | amounts carried in from 2024 (e.g. capital loss 3,200 short + 11,000 long) |
| `tax_agency_records` | IRS transcript snapshots, FTB account, notices, e-file submissions |
| `timeline` | dated events from engagement (Jan 2026) to exam letter (Jan 2028) |
| `engine_reference` | the engine's rates, thresholds, FX rates and 97 rules |
| `return_versions[]` | v1–v3: trigger, documents used and superseded, totals, tax-effect rates, carryovers out, assets, diagnostics, changes from previous version, lines |
| `return_versions[].lines[]` | one return line: value, rule, inputs, sources, note |
| `what_if` | engine results for 5 alternatives, plus the April extension estimate (from v2) |
| `planning_reference_2026` | next year's estimate due dates and safe-harbor rules |
| `post_filing_rates` | interest and penalty rates for late payment (the engine doesn't compute these) |
| `fx_rates` | SEK exchange rates (same as in `engine_reference`) |

**Form codes** (meanings are *background*)

| Code | Plain meaning |
|---|---|
| F1040 | main federal return |
| Sch1 / Sch2 / Sch3 | extra income and adjustments / extra taxes / extra credits and payments |
| SchA | itemized deductions |
| SchB | interest, dividends, foreign accounts |
| SchC | self-employed business |
| SchD / F8949 (lines `<box>.<lot>`) | capital gains summary / each sale |
| SchE | rentals, K-1 income |
| SchSE | self-employment tax |
| F4797 | sale of business or rental property |
| F4562-C / F4562-E | depreciation for business assets / rental assets |
| F8582 | passive loss limits |
| F6251 | federal alternative minimum tax |
| F8959 / F8960 | additional Medicare tax / net investment income tax |
| F8995 or F8995A | QBI (qualified business income) deduction |
| F8812 | child tax credit |
| F8863 | education credits |
| F2441 | child and dependent care credit |
| F8889 | health savings account |
| F8606 | nondeductible IRA basis |
| F8283 | noncash charitable gifts |
| F7203 | S-corp shareholder basis |
| F8938 | foreign financial assets |
| F2210 | federal underpayment penalty |
| F8867 | preparer due-diligence checklist |
| F540NR / SchCA540NR (lines `<line>.<column A-E>`) | California part-year return / its federal-to-California adjustments |
| ScheduleS | California credit for tax paid to another state |
| FTB3885A | California depreciation |
| FTB5805 | California underpayment penalty |

## 4. Rules we must not break

| Rule | README phrase |
|---|---|
| Printed page is the truth | "printed_content states what is actually printed on each page" |
| Readings and engine can be wrong, confidently | "can be wrong" … "mistakes with high confidence scores" |
| Engine rules and parameters are given | "treat them as given" |
| Don't claim California AMT | "California AMT is not computed" |
| Tax effect = change × that version's rate | "multiply the change by the matching rate in return_versions[].tax_effect_rates" |
| Fully CA-source items use one category | "use ca_source_income for the California effect" |
| Credits and payments are dollar for dollar | "change tax or balance due 1:1" |
| Rate estimates are approximate | "large changes can cross thresholds - the real system recomputes" |
| Business adjustments miss QBI | "which the adjustment rate does not capture" |
| Positions are not real | "synthetic: use them only to place highlights" |
| Now is v3 | "v3 (2026-06-23) is the latest engine output and the current return" |
| Future amounts come from our return | "they mean the return as your workpaper finalizes it" |
| Review layer is ours | "no reviews, notes, sign-offs or decisions. Those are yours to design." |
| Basis gaps stay gaps | "Gaps are real gaps" |

## 5. Easy to misread

- **"Truth" means the page's text, not the right tax answer.** D68 prints "tax year 2024" correctly and the pipeline read
  it correctly, yet the engine counted it as a 2025 payment (GT-A03). A page can also print the client's own guess.
- **The rates are already signed.** `adjustment` is −0.31 federal and `itemized` is −0.26. Multiply by the change in the
  *amount*, not by its effect.
- **A rate of 0 holds only at that version's numbers.** The README: "Rates are measured at this version's numbers".
  `salt` federal is 0.0 because the cap is binding. A large change could cross it.
- **Use the matching version's rates.** Each version carries its own rates. v3's apply to v3.
- **California rates for interest, gains, Schedule C and adjustments assume residency-day proration.** A Sacramento
  rental item is fully CA-source, so its California effect uses `ca_source_income` (0.064), not `ordinary_income` (0.099).
- **`what_if` beats the multiplication** when it covers the exact change. *Inference, not a README rule:* the README says
  "what_if holds engine results for specific alternatives" and that rate estimates are approximate ("the real system
  recomputes"), so an engine result for the same change is the better figure.
- **"Now" is neither the packet date (2026-10-12) nor today's date.** It is 23 Jun 2026. Post-v3 messages, D71 and D72 are
  in the file but haven't "happened" yet.
- **`documents_used` is the engine's claim, not proof.** v3 lists 71, but 15 of them are cited by no v3 line (D01–D07,
  D10, D13, D15, D47, D54, D69, D70, D73). Discovery 01's figure of 18 uncited documents adds D30 (superseded), D71 and
  D72, which fall outside the 71.
- **Units vary by line.** Most are whole dollars. Form 8949 lots are in cents (e.g. `F8949.B.N1` = 19240.0), and some lines
  hold text ("Yes", an address) or dates.
- **Asset references have two homes**: the same version's `assets[]` or `prior_years.asset_records`.
- **Line inputs never cross versions**: "keys of other lines in the same version".
- **`starter_standards` are editable**, not fixed law: "a starting point you may change".
- **Household `people[]` are client-typed** ("exactly as the client entered them"); the README says this of `people[]`
  only. Theo's SSN there is the one the IRS rejected.

## Changes after verification (Fable 5.1)

Report: `docs/packet/reviews/readme-explained-verify.md`. Each quote rechecked against `docs/packet/readme.json` on
16 Oct 2026, 00:05 EDT (04:05 UTC).
1. v3 quote in section 4 restored in full: "is the latest engine output and the current return" (it had been stitched with an ellipsis).
2. "at today's numbers" removed, since it is not README text. The point now quotes "Rates are measured at this version's numbers".
3. documents_used point corrected. Rechecked by script: 15 of v3's 71 `documents_used` are cited by no line. D30, D71 and D72
   sit outside the 71. Together these make discovery 01's 18.
4. "Exactly as the client entered them" now applies to household `people[]` only, as in the README (section table, `sections` entry, section 5).
5. "`what_if` beats the multiplication" is now labelled as our inference (sections 1, 2 and 5).
- Also fixed: form-code count. The README names 35 codes and 34 appear in v3.
- Conflict (c) on brief-explained.md narrowed in the hand-back: "every result is computed for us" is the brief's own
  sentence (`brief.txt`), so the only missing point there is "the engine cannot be rerun", plus the synthetic-position wording.
