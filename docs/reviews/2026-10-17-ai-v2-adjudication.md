# AI reader v2: independent adjudication of the strict matches and the unmatched suggestions

Reviewer: Fable 5.1 (a different model from the reader, claude-sonnet-5-5), 17 Oct 2026, 20:38–21:00 UTC. Read-only.
Inputs: `project-build/data/ai-suggestions.json` (prompt reader-v2, run 2026-10-17T20:35Z, 40 grounded suggestions),
`docs/handin/ai-scorecard.md` (reviewed-matches table, 29 rows; 12 unmatched suggestions), the ledger
(`docs/ground-truth/README.md` and area files 01–04), `project-build/src/domain/checks/catalogue.ts`, and the packet
(`project-build/data/packet.json`, queried with `python3 -I`; scripts in the session scratchpad, `adj_q.py`).

The harness matches by shared return line only. This review asks the question the harness cannot: does the suggestion
name the same mistake for the same reason?

Verdict scale (Task A): **SAME ISSUE** = same mistake, same reason. **PARTIAL** = right line, right direction, reasoning
incomplete or partly wrong. **DIFFERENT ISSUE** = right line, wrong problem.

## Headline: adjudicated recall

| Measure | Harness (strict) | Adjudicated, SAME ISSUE only | Adjudicated, SAME + PARTIAL |
|---|---|---|---|
| Recall, all 27 | 17 of 27 (63%) | **13 of 27 (48%)** | **14 of 27 (52%)** |
| Recall, text tier (8) | 7 of 8 (88%) | **4 of 8 (50%)** | **4 of 8 (50%)** |

- SAME ISSUE (13): GT-A01, GT-A02, GT-A03, GT-A06, GT-A07, GT-A08, GT-B01, GT-C02, GT-C04, GT-C05, GT-D01, GT-D02, GT-D03.
- PARTIAL only (1): GT-A04.
- Strict-matched but DIFFERENT ISSUE, so removed (3): GT-C08, GT-D04, GT-D05.
- Text tier found: GT-A02, GT-A06, GT-C04, GT-C05. Missed: GT-C07 (never matched), GT-C08, GT-D04, GT-D05 (matched on the line, wrong problem).

Sensitivity: if ai-business_use_share-1 is read generously as PARTIAL for GT-C08 (see row 2), the SAME + PARTIAL figures
become 15 of 27 (56%) and 5 of 8 (63%). I do not read it that way; the row explains why.

Secondary, precision on the same basis: of the 40 grounded suggestions, 25 are SAME ISSUE, 1 PARTIAL, 2 DIFFERENT ISSUE,
and of the 12 unmatched, 3 are duplicates of ledger entries and 1 is a real issue the ledger lacks. "Real" suggestions
(SAME + PARTIAL + duplicate + new) = 30 of 40 (75%); SAME ISSUE alone = 25 of 40 (63%). The harness's 28 of 40 (70%)
sits between.

## Task A: the 29 strict matches

| # | Suggestion | Ledger | Verdict | Reason |
|---|---|---|---|---|
| 1 | ai-repair_vs_improvement-1 | GT-C05 | SAME ISSUE | Infers from unchanged 2024 depreciation (D06 p7) that the August HVAC job was expensed, not capitalized; same mistake, weaker evidence than rows 17–18. |
| 2 | ai-business_use_share-1 | GT-C08 | DIFFERENT ISSUE | The problem it states is the unconfirmed 2024 footage (300) versus this year's 240; that is the engine's own HOME_OFFICE_AREA_CHANGE and GT-C10 restated. "Two houses are involved" is a clause, not the one-home limit on the simplified method. |
| 3 | ai-document_not_reflected-3 | GT-A01 | SAME ISSUE | W-2 box 14 RSU 38,200 already taxed as wages; zero-basis lots overstate gain. |
| 4 | ai-residency_or_source-1 | GT-A02 | SAME ISSUE | Payroll kept CA as work state to 09/30; wages after the mid-July move are not CA-source. |
| 5 | ai-residency_or_source-2 | GT-A02 | SAME ISSUE | Same point from the W-2 photo (D10); the added "withholding may be excess" is right and harmless. |
| 6 | ai-document_not_reflected-4 | GT-A01 | SAME ISSUE | Quotes the three D11 adjusted-basis figures (19,100 / 19,100 / 9,420) against the return's zero; the strongest row in the run (0.93). |
| 7 | ai-other-1 | GT-C04 | SAME ISSUE | Software line 6,850 deducted in full though the call notes say it holds a personal Spotify Family subscription; the Spotify third of C04 on its own line. |
| 8 | ai-limit_or_eligibility-2 | GT-A06 | SAME ISSUE | SEHI barred for months Erik was eligible for a spouse's employer plan, which the client says both employers offered (qa-25). |
| 9 | ai-business_use_share-2 | GT-C04 | SAME ISSUE | Spotify Family 216 is personal and sits in the business software total. |
| 10 | ai-business_use_share-3 | GT-C04 | SAME ISSUE | Four-line family mobile plan and shared home internet deducted at 100%; only the business share is deductible. Does not quote 70/50%, but the reason is the same. |
| 11 | ai-other-2 | GT-C02 | SAME ISSUE | D23 page 3 is a second scan of page 2 and both 3,700 totals were summed into 11,800 miles. |
| 12 | ai-limit_or_eligibility-3 | GT-A06 | SAME ISSUE | Same eligibility bar, cited from the premium statement (D25). |
| 13 | ai-document_not_reflected-5 | GT-A01 | SAME ISSUE | "Basis not reported" is not zero basis; vest-date value already taxed as wages belongs in basis. |
| 14 | ai-other-3 | GT-B01 | SAME ISSUE | Same Northlake sweep 1,840 on two Schedule B lines. |
| 15 | ai-other-4 | GT-B01 | SAME ISSUE | D29 is the sweep 1099-INT the composite (D28) already includes. |
| 16 | ai-date_or_year_mismatch-1 | GT-D04 | DIFFERENT ISSUE | Questions the April 2026 payment date of the Oregon tax; GT-D04 is the missing Schedule S limitation (844 claimed, about 635 allowed). Payment timing does not change a same-year other-state credit, so the row is also not a real issue on its own. |
| 17 | ai-repair_vs_improvement-2 | GT-C05 | SAME ISSUE | HVAC 11,000 inside repairs 13,300 (D46); a whole-system replacement is a capital improvement. |
| 18 | ai-repair_vs_improvement-3 | GT-C05 | SAME ISSUE | Invoice (D47): furnace and condenser removed, new heat pump system installed; improvement to depreciate. |
| 19 | ai-document_not_reflected-9 | GT-D02 | SAME ISSUE | Seller credit 6,912 for 01/01–07/07 taxes reduces the buyers' deductible tax; SchA.5b carries the full levy. |
| 20 | ai-other-5 | GT-D01 | SAME ISSUE | 1098 box 1 already includes payoff interest, yet the payoff statement's 2,150 is added again. |
| 21 | ai-other-6 | GT-D01 | SAME ISSUE | Payoff statement itself says the interest is on the 1098; counted twice. |
| 22 | ai-date_or_year_mismatch-3 | GT-D02 | SAME ISSUE | Prior owner on record 01/01 (D58) plus July purchase means the full levy includes the seller's share; same conclusion from the tax receipt instead of the closing statement. |
| 23 | ai-document_not_reflected-10 | GT-A08 | SAME ISSUE | Statement says Bright Oak Kids Club; the return line says Bright Oak Preschool. |
| 24 | ai-other-7 | GT-A07 | SAME ISSUE | Provider tax ID on D62 has two digits transposed against F2441.1b. The quote ("Tax ID") is thin, but the rationale names the defect exactly. |
| 25 | ai-document_not_reflected-11 | GT-D03 | SAME ISSUE | Charity sold the car at arm's length for 2,900 (box 4a/4c), so the deduction is capped there, not at the client's 6,000. |
| 26 | ai-document_not_reflected-12 | GT-A04 | PARTIAL | Right line and direction: the fourth 4,000 payment is unsupported by the EFTPS confirmations (D67). Incomplete: it never reaches the IRS transcript (D69) showing 3,000, so it can say "unverified" but not "wrong by 1,000". |
| 27 | ai-document_not_reflected-12 | GT-D05 | DIFFERENT ISSUE | It claims F2210.19 only because the payment feeds the penalty; GT-D05 is excess social security tax left out of withholding. Not mentioned. |
| 28 | ai-date_or_year_mismatch-4 | GT-A03 | SAME ISSUE | 2025-09-15 payment labelled tax year 2024 is counted in 2025 CA estimates; hedged ("misapplied or mislabeled") but the same defect. |
| 29 | ai-residency_or_source-3 | GT-A02 | SAME ISSUE | Paystub (D73): CA taxable wages 22,469 to 07/15, yet column E carries all wages. The most precise of the three A02 rows. |

Side note, not counted: the four rows rejected for rationale length (scorecard, "Rejected by format") would have adjudicated
SAME ISSUE for GT-A06 (D06), GT-C04 (D14) and GT-B03 (D34, D35); the D34/D35 rows are the only place the reader
reached the C6 basis and holding-period problem.

## Task B: the 12 grounded suggestions on no ledger line

Each checked against `packet.json` (v3 = `return_versions[2]`, computed 2026-06-23), the README field definitions,
superseded documents, and the v3 diagnostics.

| # | Suggestion | Verdict | Finding |
|---|---|---|---|
| 1 | ai-document_not_reflected-1 (F7203.1, F7203.excess, F8949.F.SCORP; D07 p2 "basis not rolled forward") | NOT-REAL | The reader quoted the prior preparer's 2024 note. In 2025 the gap was closed: D40 (2023 K-1, box 1 14,100, box 16D 20,000) is in v3 `documents_used`; `F7203.1` = 2,300 cites ev-0983/ev-0985 and recomputes (21,300 + 14,100 − 20,000 + 16,900 − 30,000); the v1/v2 diagnostic SCORP_BASIS_INCOMPLETE is gone in v3. What remains (the 2022 opening 21,300 from a client worksheet) is already a ledger "suspicion not confirmed" (file 02) and the reader did not raise it. |
| 2 | ai-answer_conflicts_with_return-1 (F8606.1/.2/.14; D07 p2 "basis 7,000 per client … 5498 not obtained") | NOT-REAL | Two distinct 7,000 contributions: D42 (2024 Form 5498, box 1 7,000 "made 02/12/2025 for tax year 2024", ev-0991 feeds `F8606.2`) and D43 (2025 Form 5498, box 1 7,000, ev-0993 feeds `F8606.1`). D41 (1099-R) shows two conversions, 02/20/2025 7,010 and 04/02/2025 7,016 = 14,026, which only two contributions can fund. qa-31's "no prior basis" is the client's error; the engine's 26 taxable is right. Ledger file 01 already lists this as checked-correct. |
| 3 | ai-document_not_reflected-2 (no line; D07 p3 Form 3520) | REAL-DUPLICATE | **GT-B05** (= GT-C09): prior preparer's 2023 Form 3520 open item dropped. Unmatchable strictly because the ledger claim is `doc:D07`, which the suggestion cites. |
| 4 | ai-limit_or_eligibility-1 (SchA.5a, F540NR.71; D09 box 17 4,180 withheld after the move) | NOT-REAL | The 4,180 was withheld and remitted to the FTB (W-2 box 17), so it is a valid 540NR line 71 credit (ev-0048, `F540NR.71` = 13,130 = 8,950 + 4,180) and a cash-basis 2025 state tax payment on Schedule A (`SchA.5a` = 27,870, checked right in ledger file 04). The over-withholding is recovered as a refund through GT-A02's fix, and any refund is a 2026 tax-benefit item. Federal effect is nil anyway while SALT sits above the 40,000 cap. |
| 5 | ai-answer_conflicts_with_return-2 (SchD.13; D28 2a 1,180 "transposed digits") | NOT-REAL | `SchD.13` = 1,820 = D28 2a 1,180 (ev-0491) + D31 2a 640 (ev-0700). D30's 640 (ev-0541) is the superseded original and is correctly counted once. The 1,180 / 1,820 digit resemblance is coincidence. |
| 6 | ai-document_not_reflected-6 (no line; D30 p32 lot M18) | REAL-DUPLICATE | **GT-B04**: Meridian lot M18 on the unread page 32; D30 is the superseded original, same unread page as D31. |
| 7 | ai-document_not_reflected-7 (F8949.B.total, SchD.2; D31 p32 lot M18) | REAL-DUPLICATE | **GT-B04**, from the corrected 1099 the return uses; the reader also ties it to the summary/detail gap of 250, as the ledger does. The claim is on the box B total rather than a lot line, which is why strict matching missed it (the ledger claim is `doc:D31`). |
| 8 | ai-answer_conflicts_with_return-3 (F8949.H.total, F8949.K.total, SchD.3; D34 twelve sales vs qa-15 "just moved things around") | NOT-REAL | No return error: the return reports the twelve dispositions, which the 1099-DA supports, and the v3 engine already carries the answer conflict as QUESTIONNAIRE_SALES_CONFLICT (ledger file 02 notes it should cite qa-15 as well as qa-14). The real D34/D35 mistake, lot C6's basis and holding period (GT-B03), appears only in the reader's two rows rejected for length. |
| 9 | ai-date_or_year_mismatch-2 (SchE.19B; D50 HOA dues "through October", lease ended 09/30, listed 10/01) | NOT-REAL | IRS Pub 527 ("Vacant while listed for sale"): when property held for rental is sold, the ordinary and necessary expenses of managing, conserving or maintaining it remain deductible until the sale. The condo went from tenant (to 09/30) to listing (10/01) to sale (10/15, `F4797.20`) with no personal use (`SchE.2B` personal days 0). Depreciation likewise runs to 10/15 (AUS-BLDG 9.5 months, checked right in ledger file 03). October dues are a carrying cost of the sale period. |
| 10 | ai-business_use_share-4 (SchE.12B; D53 "includes interest to payoff 10/15/2025") | NOT-REAL | Same rule as row 9: the rental loan's interest to payoff on the sale date is a carrying cost of property held for rental until sold; `SchE.12B` = 6,900 = D53 box 1 (ev-1024), counted once. |
| 11 | ai-document_not_reflected-8 (SchA.8c, SchA.8e; D54 origination points 4,800) | NOT-REAL | The 4,800 is already deducted. `SchA.8a` = 21,847 carries "purchase points 4,800.00" in its note, sourced from ev-1030 = D55 (Lonestar 1098) box 6 "points paid on purchase 4,800.00". It belongs on 8a (points reported on Form 1098), not 8c; `SchA.8c` = 9 is correctly only the amortized refinance points (D57 box 6 3,200). The reader looked at 8c and missed 8a's note. |
| 12 | ai-limit_or_eligibility-4 (SchA.11; D64 "No goods or services line.") | **REAL-NEW** | The St. Brigid receipt (dated 12/21/2025, 1,500 per msg-08 and ev-1049) lacks the statement of whether goods or services were provided. IRC 170(f)(8) requires a contemporaneous written acknowledgment with that statement for any single gift of 250 or more, obtained by the earlier of the filing date or the due date; the return was filed 2026-07-13 with the 1,500 inside `SchA.11` (3,350 = 600 + 1,250 + 1,500), and msg-08 is a phone confirmation of the amount, not a written acknowledgment. The other two cash receipts (D63) and the stock acknowledgment (D65) each print "no goods or services provided", so the omission on D64 reads as designed. Not in the ledger: file 04 treats D64 as resolved by msg-08 (the amount) and does not consider substantiation. **Line and direction:** `SchA.11` −1,500 if disallowed on exam; federal tax **+390** (1,500 × 0.26 itemized rate), California **+72** (× 0.048); tax currently understated by that much, contingent on disallowance. Severity low (small, and curable only if a compliant letter had been obtained before filing). |

### Task B summary

- REAL-NEW: 1 (ai-limit_or_eligibility-4, St. Brigid acknowledgment lacks the goods-or-services statement).
- REAL-DUPLICATE: 3 (ai-document_not_reflected-2 → GT-B05; ai-document_not_reflected-6 and -7 → GT-B04).
- NOT-REAL: 8 (rows 1, 2, 4, 5, 8, 9, 10, 11). Five of these are places where the reader read a stale or superseded
  statement (the prior preparer's 2024 notes twice, the unread note on 8a, the original D30) or did not follow the number
  to its source (SchD.13, the two IRA contributions).
- UNSURE: 0.

## What this changes for the hand-in

- The scorecard's strict recall (63%, text tier 88%) overstates; the defensible figures are **48% same-issue (52% with
  the one partial), text tier 50%**. The strict rule's largest false credits are on the three judgment-call mistakes in
  the text tier (C08, D04, D05), where the reader landed on the right line for a different reason.
- The reader's one genuine addition is a substantiation defect (row 12); it merits a ledger entry and a check
  (acknowledgment must state goods-or-services for gifts of 250 or more), if time allows.
- Loose recall (89%) should not be quoted as a finding rate; rows 1, 2 and 11 above are loose "hits" on documents
  that hold no mistake the reader found.
