# AI reader scorecard

Scored 2026-10-17. Model claude-sonnet-5-5, prompt reader-v2, run at 2026-10-17T20:35:23.271Z. Packet SHA-256 starts ee01f8508bd2.
Calls: 74. Tokens: 226446 in, 34076 cache write, 2487548 cache read, 46339 out. Approximate cost: $1.50.

The reader is scored against the ledger of known mistakes. Only grounded suggestions count (every quote appears word for
word on the page it names); ungrounded ones never reach a screen.

- **Strict (the headline):** a suggestion finds a mistake only when it sits on a return line that the mistake itself claims.
- **Loose (secondary):** a shared claim line, or any shared evidence document. Loose overstates: one document can hold several unrelated mistakes.
- A strict match is still only a candidate: the "Reviewed matches" table below is for a person to say whether it is the same issue.

## reader-v1 vs reader-v2

| Measure | reader-v1 | reader-v2 |
|---|---|---|
| Recall, strict | 7 of 27 (26%) | 17 of 27 (63%) |
| Recall, strict, text tier | 4 of 8 (50%) | 7 of 8 (88%) |
| Precision, strict | 11 of 17 (65%) | 28 of 40 (70%) |
| Recall, loose | 12 of 27 (44%) | 24 of 27 (89%) |
| Grounding rate | 17 of 17 (100%) | 40 of 40 (100%) |
| Rejected | 27 | 4 |
| Approximate cost | $1.45 | $1.50 |

## Headline: adjudicated recall (read by a second model)

Claude Fable 5.1 (a different model from the reader) read every strict match against the ledger and the packet and judged whether it names the same mistake for the
same reason (SAME), the right line and direction with incomplete reasoning (PARTIAL), or the right line but a different
problem (DIFFERENT). Source: `docs/reviews/2026-10-17-ai-v2-adjudication.md`.

| Measure | Result |
|---|---|
| Recall, same issue | 13 of 27 (48%) |
| Recall, same or partial | 14 of 27 (52%) |
| Recall, text tier (same issue) | 4 of 8 (50%) |
| Precision, same issue | 25 of 40 (63%) |

Same issue: GT-A01, GT-A02, GT-A03, GT-A06, GT-A07, GT-A08, GT-B01, GT-C02, GT-C04, GT-C05, GT-D01, GT-D02, GT-D03. Partial only: GT-A04. Strict-matched but a different issue: GT-C08, GT-D04, GT-D05.

## Automatic measure (strict)

| Measure | Result | What it means |
|---|---|---|
| Recall, strict (shared claim line) | 17 of 27 (63%) | Known mistakes the reader put a grounded suggestion on |
| Recall, strict, text tier | 7 of 8 (88%) | Mistakes that depend on wording in free text, where code checks are weakest |
| Precision, strict | 28 of 40 (70%) | Grounded suggestions on a line a known mistake claims; the rest may still be real issues |
| Grounding rate | 40 of 40 (100%) | Suggestions whose quotes were all found on the page |
| Rejected by the reader | 4 | Rows that failed the reader's own checks before the payload was written |
| Claims on lines not in the return | 0 | Should be zero; unknown line keys are dropped at read time |

Strict found: GT-A01, GT-A02, GT-A03, GT-A04, GT-A06, GT-A07, GT-A08, GT-B01, GT-C02, GT-C04, GT-C05, GT-C08, GT-D01, GT-D02, GT-D03, GT-D04, GT-D05. Text tier: GT-A02, GT-A06, GT-C04, GT-C05, GT-C08, GT-D04, GT-D05.

Note: the strict text-tier hits GT-C08, GT-D04, GT-D05 were DIFFERENT issues on adjudication, so the 88% strict text-tier recall must not be quoted.

Cannot match strictly (their ledger claims name a document, not a line): GT-B04, GT-B05, GT-C10.

## As produced vs as shown after verification

The backend verifier (the same code the app runs) holds back a suggestion whose quote is missing or too short to ground it alone,
whose only evidence is a replaced document, whose authority is off the list, or whose text is too long or SSN-shaped.

| Measure | As produced (40) | As shown (39) |
|---|---|---|
| Recall, strict | 17 of 27 (63%) | 16 of 27 (59%) |
| Recall, strict, text tier | 7 of 8 (88%) | 7 of 8 (88%) |
| Precision, strict | 28 of 40 (70%) | 27 of 39 (69%) |
| Grounding rate | 40 of 40 (100%) | 39 of 39 (100%) |
| Held back by the verifier | 0 | 1 |

Lost by verification: GT-A07.

| Held back because | Suggestions |
|---|---|
| Quote too short to prove anything | 1 |

## Loose (secondary)

| Measure | Result |
|---|---|
| Recall, loose (shared line or document) | 24 of 27 (89%) |
| Recall, loose, text tier | 7 of 8 (88%) |
| Precision, loose | 37 of 40 (93%) |

Found only by the loose rule: GT-A05, GT-B03, GT-B04, GT-B05, GT-C01, GT-C10, GT-D06.

## Reviewed matches

One row per strict match. Verdict is for a person: same issue, or different issue.
People's first names are shown as [name], in ledger titles and in quotes.

| Suggestion | Ledger | Line | Quote | Verdict |
|---|---|---|---|---|
| ai-repair_vs_improvement-1 | GT-C05: 11,000 heat-pump replacement deducted as a repair; an improvement to depreciate | SchE.14A | D06 p7: SchE.18A Depreciation - A 13,891 | SAME: Infers from unchanged 2024 depreciation that the August HVAC job was expensed, not capitalized; weaker evidence than the invoice rows. |
| ai-business_use_share-1 | GT-C08: Home-office simplified method blended across two homes | SchC.30 | D07 p2: Home office 300 sq ft (Sacramento rental house, 2 rooms combined?) - client to confirm. | DIFFERENT: States the unconfirmed 2024 footage versus this year's, a restatement of GT-C10 and the engine's own warning, not the one-home limit on the simplified method. |
| ai-document_not_reflected-3 | GT-A01: RSU sales at zero basis; the stock-plan supplement (D11) ignored, so wage income is taxed twice | F8949.B.N1, F8949.B.N3, F8949.E.N4 | D08 p1: Box 14 RSU 38,200.00 | SAME: W-2 box 14 RSU 38,200 already taxed as wages; zero-basis lots overstate gain. |
| ai-residency_or_source-1 | GT-A02: California wages include Halvorsen pay earned after the move to Texas | SchCA540NR.1.E | D09 p1: Employer payroll kept California as the work state through 09/30/2025.<br>D09 p1: Box 16 111,300.00 | SAME: Payroll kept California as work state to 09/30; wages after the mid-July move are not California-source. |
| ai-residency_or_source-2 | GT-A02: California wages include Halvorsen pay earned after the move to Texas | SchCA540NR.1.E | D10 p1: Box 15 CA; Box 16 111,300.00; Box 17 4,180.00. | SAME: Same point from the W-2 photo; the added note that withholding may be excess is right and harmless. |
| ai-document_not_reflected-4 | GT-A01: RSU sales at zero basis; the stock-plan supplement (D11) ignored, so wage income is taxed twice | F8949.B.N1, F8949.B.N3, F8949.E.N4 | D11 p1: The cost basis reported on Form 1099-B for RSU shares is blank/$0 because these shares are noncovered.<br>D11 p2: adjusted basis 19,100.00, sold 02/18/2025<br>D11 p2: adjusted basis 19,100.00, sold 05/20/2025<br>D11 p2: adjusted basis 9,420.00, sold 08/12/2025 | SAME: Quotes the three supplement adjusted-basis figures against the return's zero; the strongest row in the run. |
| ai-other-1 | GT-C04: Phone, internet and Spotify at 100% business; call notes say 70%, 50%, personal | SchC.27a.1 | D14 p1: Software and subscriptions 6,850.00 | SAME: Software line deducted in full though the call notes say it holds a personal family streaming subscription. |
| ai-limit_or_eligibility-2 | GT-A06: Self-employed health insurance deducted though [name] could join [name]'s employer plan (qa-25) | Sch1.17 | D14 p1: Insurance - health ([name]) 14,400.00 | SAME: Self-employed health insurance is barred for months the spouse was eligible for an employer plan, which the client says was offered. |
| ai-business_use_share-2 | GT-C04: Phone, internet and Spotify at 100% business; call notes say 70%, 50%, personal | SchC.27a.1 | D15 p1: Spotify Family 216.00 | SAME: The family streaming subscription (216) is personal and sits in the business software total. |
| ai-business_use_share-3 | GT-C04: Phone, internet and Spotify at 100% business; call notes say 70%, 50%, personal | SchC.25 | D15 p2: family mobile plan (4 lines) 180.00 per month<br>D15 p2: home internet 110.00 per month | SAME: Four-line family mobile plan and shared home internet deducted at 100%; only the business share is deductible. |
| ai-other-2 | GT-C02: Mileage-log page scanned twice: 11,800 miles vs 8,100 | SchC.44a | D23 p3: (Second scan of the May-Aug sheet - same handwriting and coffee stain as page 2.)<br>D23 p2: Page total 3,700 miles. | SAME: Mileage page 3 is a second scan of page 2 and both 3,700 totals were summed. |
| ai-limit_or_eligibility-3 | GT-A06: Self-employed health insurance deducted though [name] could join [name]'s employer plan (qa-25) | Sch1.17 | D25 p1: Premiums paid January-December 2025: 1,200.00 per month, total 14,400.00. | SAME: Same eligibility bar, cited from the premium statement. |
| ai-document_not_reflected-5 | GT-A01: RSU sales at zero basis; the stock-plan supplement (D11) ignored, so wage income is taxed twice | F8949.B.N1, F8949.B.N3, F8949.E.N4 | D28 p3: N1 Corvane Systems Inc (RSU) 400 sh acquired 2025-02-15 sold 2025-02-18 proceeds 19,240.00 basis (not reported) short-term noncovered<br>D28 p3: N4 Corvane Systems Inc (RSU) 300 sh acquired 2023-08-15 sold 2025-08-12 proceeds 15,300.00 basis (not reported) long-term noncovered | SAME: Basis not reported is not zero basis; vest-date value already taxed as wages belongs in basis. |
| ai-other-3 | GT-B01: Northlake sweep interest on two forms, counted twice | SchB.1.2 | D28 p1: 1099-INT (bank sweep program, Northlake Bank): box 1 interest 1,840.00 | SAME: The same sweep interest 1,840 on two Schedule B lines. |
| ai-other-4 | GT-B01: Northlake sweep interest on two forms, counted twice | SchB.1.2 | D29 p1: bank sweep program for Northlake Securities account | SAME: This is the sweep 1099-INT the composite already includes. |
| ai-date_or_year_mismatch-1 | GT-D04: California Schedule S credit for Oregon tax not limited (allowed for a composite return, but capped) | ScheduleS.credit | D39 p2: paid with the composite return in April 2026 | DIFFERENT: Questions the April 2026 payment date; GT-D04 is the missing Schedule S limitation. Payment timing does not change the credit. |
| ai-repair_vs_improvement-2 | GT-C05: 11,000 heat-pump replacement deducted as a repair; an improvement to depreciate | SchE.14A | D46 p1: HVAC 11,000.00 (Delta Breeze Heating & Air, 08/12/2025)<br>D46 p1: Repairs and maintenance 13,300.00 | SAME: HVAC 11,000 inside repairs 13,300; a whole-system replacement is a capital improvement. |
| ai-repair_vs_improvement-3 | GT-C05: 11,000 heat-pump replacement deducted as a repair; an improvement to depreciate | SchE.14A | D47 p1: Installed new 3-ton heat pump system with air handler, new line set and thermostat.<br>D47 p1: Removed failed 2004 gas furnace and 3-ton AC condenser. | SAME: Invoice: furnace and condenser removed, new heat pump installed; an improvement to depreciate. |
| ai-document_not_reflected-9 | GT-D02: Home property tax includes the seller's share credited at closing | SchA.5b | D54 p1: Seller credit for 2025 county taxes 01/01/2025-07/07/2025: 6,912.00 | SAME: Seller credit 6,912 for 01/01-07/07 taxes reduces the buyers' deductible tax; the line carries the full levy. |
| ai-other-5 | GT-D01: Lonestar payoff interest counted twice (the 1098 already includes it) | SchA.8a | D55 p1: includes prepaid interest at closing and interest paid at payoff 11/20/2025 | SAME: The 1098 box 1 already includes payoff interest, yet the payoff statement's amount is added again. |
| ai-other-6 | GT-D01: Lonestar payoff interest counted twice (the 1098 already includes it) | SchA.8a | D56 p1: Interest is reported on the 2025 Form 1098. | SAME: The payoff statement itself says the interest is on the 1098; counted twice. |
| ai-date_or_year_mismatch-3 | GT-D02: Home property tax includes the seller's share credited at closing | SchA.5b | D58 p1: Owner of record 01/01/2025: prior owner | SAME: Prior owner on record 01/01 plus a July purchase means the full levy includes the seller's share. |
| ai-document_not_reflected-10 | GT-A08: Wrong provider name on Form 2441 | F2441.1a | D61 p1: Bright Oak Kids Club, 3101 Freeport Blvd, Sacramento CA. | SAME: The statement names a kids club; the return line names a preschool. |
| ai-other-7 | GT-A07: Little Sprouts tax ID misread at 0.97 confidence | F2441.1b | D62 p1: Tax ID | SAME: Provider tax ID transposed against the return line; the quote is thin but the rationale names the defect exactly. |
| ai-document_not_reflected-11 | GT-D03: Donated car at the client's Blue Book guess, not the 1098-C sale price | F8283.A1.vehicle | D66 p1: Box 4a vehicle sold in arm's length transaction to unrelated party checked<br>D66 p1: 4c gross proceeds from sale 2,900.00 | SAME: Charity sold the car at arm's length for 2,900, so the deduction is capped there, not at the client's estimate. |
| ai-document_not_reflected-12 | GT-A04: Federal Q4 estimate from the client's guess (4,000); the IRS transcript shows 3,000 | F1040.26 | D67 p1: 09/15/2025 3,000.00 | PARTIAL: Right line and direction: the fourth payment is unsupported by the confirmations; never reaches the IRS transcript showing 3,000. |
| ai-document_not_reflected-12 | GT-D05: Underpayment penalty ignores excess social security tax as withholding | F2210.19 | D67 p1: 09/15/2025 3,000.00 | DIFFERENT: Claims the penalty line only because the payment feeds it; GT-D05 is excess social security left out of withholding. |
| ai-date_or_year_mismatch-4 | GT-A03: California estimated payments include a payment designated tax year 2024 | F540NR.72 | D68 p1: 2025-09-15 3,500.00 tax year 2024 (estimated payment) | SAME: A payment labelled tax year 2024 is counted in 2025 California estimates. |
| ai-residency_or_source-3 | GT-A02: California wages include Halvorsen pay earned after the move to Texas | SchCA540NR.1.E | D73 p1: Work location changed to Austin, TX effective 07/15/2025.<br>D73 p1: CA taxable wages 22,469.00 | SAME: Paystub shows California taxable wages to 07/15, yet the California column carries all wages; the most precise A02 row. |

## Suggestions by kind

| Kind | Count |
|---|---|
| answer_conflicts_with_return | 3 |
| business_use_share | 4 |
| date_or_year_mismatch | 4 |
| document_not_reflected | 12 |
| limit_or_eligibility | 4 |
| other | 7 |
| repair_vs_improvement | 3 |
| residency_or_source | 3 |

## Why rows were rejected

| Reason | Count |
|---|---|
| rationale over 30 words | 4 |

## Rejected by format (31-32 words), all grounded

These rows failed only the 30-word limit on the rationale. They are not in the payload and not counted above.
Scored strictly, they would add these mistakes to recall: GT-B03.

Rationale text is not printed: these rows were rejected before the name check.

| Quotes from | Reason | Kind | Lines | Words | Grounded | Strict ledger match |
|---|---|---|---|---|---|---|
| D06 p3 | rationale over 30 words | limit_or_eligibility | Sch1.17 | 32 | yes | GT-A06 |
| D14 p1 | rationale over 30 words | business_use_share | SchC.25 | 31 | yes | GT-C04 |
| D34 p1 | rationale over 30 words | date_or_year_mismatch | F8949.H.C6, SchD.3 | 32 | yes | GT-B03 |
| D35 p1 | rationale over 30 words | date_or_year_mismatch | F8949.H.C6, SchD.3 | 31 | yes | GT-B03 |

## Grounded suggestions on no ledger line (for a person to read)

These are not counted as wrong. The ledger may have missed them; a reviewer decides. "Loose" names any entry they share a document with.

| Id | Kind | Lines | Documents | Loose | Rationale |
|---|---|---|---|---|---|
| ai-document_not_reflected-1 | document_not_reflected | F7203.1, F7203.excess, F8949.F.SCORP | D07 | GT-B05 | S corporation stock basis was never rolled forward through 2023 and 2024, so the 2025 beginning basis and the excess-distribution capital gain are unsupported. |
| ai-answer_conflicts_with_return-1 | answer_conflicts_with_return | F8606.2, F8606.1, F8606.14 | D07 | GT-B05 | The 7,000 prior basis may be the same contribution as the 2025 one, since it was made in February 2025 and no Form 5498 was obtained. |
| ai-document_not_reflected-2 | document_not_reflected | none | D07 | GT-B05 | A possible Form 3520 filing obligation for the foreign inheritance was left unresolved and is not addressed on the return. |
| ai-limit_or_eligibility-1 | limit_or_eligibility | SchA.5a, F540NR.71 | D09 | GT-A02, GT-D05, GT-D06 | California tax withheld after the move to Texas looks erroneous and refundable, so it may not count as a deductible state tax payment or valid CA withholding. |
| ai-answer_conflicts_with_return-2 | answer_conflicts_with_return | SchD.13 | D28 | GT-A01, GT-B01 | Capital gain distributions on the return exceed the amount on this 1099-DIV, which looks like transposed digits. |
| ai-document_not_reflected-6 | document_not_reflected | none | D30 | GT-B04, GT-D06 | A short-term fractional-share sale on the supplemental page, which makes up the gap between summary and detail proceeds, does not appear among the Form 8949 lots on the return. |
| ai-document_not_reflected-7 | document_not_reflected | F8949.B.total, SchD.2 | D31 | GT-B04, GT-D06 | The unread supplemental page lists a short-term noncovered sale that appears on no Form 8949 line, so the capital gain figures may be incomplete. |
| ai-answer_conflicts_with_return-3 | answer_conflicts_with_return | F8949.H.total, F8949.K.total, SchD.3 | D34 | GT-B03 | The client said the crypto was only moved around and not sold, but the 1099-DA shows twelve sales with gross proceeds, so the account of events conflicts with the return. |
| ai-date_or_year_mismatch-2 | date_or_year_mismatch | SchE.19B | D50 | none | HOA dues run through October, but the rental ended September 30 and the unit was then listed for sale, so the October dues may not be deductible rental expense. |
| ai-business_use_share-4 | business_use_share | SchE.12B | D53 | none | Full-year interest through payoff on 10/15 is deducted as rental expense, but the condo was rented only until September 30; interest after that may be nondeductible. |
| ai-document_not_reflected-8 | document_not_reflected | SchA.8c, SchA.8e | D54 | GT-D02 | Points paid at purchase of the Austin home appear on the closing statement but the return shows only small refinance points; they may be deductible and missing. |
| ai-limit_or_eligibility-4 | limit_or_eligibility | SchA.11 | D64 | none | A gift of $250 or more needs a written acknowledgment stating whether goods or services were provided; this receipt has no such statement, so substantiation may fail. |

## Beyond the ledger

Claude Fable 5.1 (a different model from the reader) checked each of the 12 grounded suggestions on no ledger line against the packet: 1 real new mistake,
3 duplicates of known mistakes, 8 not real.

| Suggestion | Verdict | Reason |
|---|---|---|
| ai-document_not_reflected-1 | NOT-REAL | Quotes the prior preparer's 2024 note; in 2025 the 2023 K-1 is used and S corporation basis recomputes, and the engine's basis warning is gone in v3. |
| ai-answer_conflicts_with_return-1 | NOT-REAL | Two distinct 7,000 IRA contributions (2024 and 2025 Forms 5498) fund two conversions; the client's 'no prior basis' answer is the error. |
| ai-document_not_reflected-2 | REAL-DUPLICATE | GT-B05: the prior preparer's 2023 Form 3520 open item; unmatchable strictly because the ledger claims the document, not a line. |
| ai-limit_or_eligibility-1 | NOT-REAL | California tax withheld after the move was remitted, so it is a valid credit and a cash-basis state tax payment; the excess comes back through GT-A02's fix. |
| ai-answer_conflicts_with_return-2 | NOT-REAL | Schedule D line 13 is the 1099-DIV amount plus the corrected 1099's 640; the digit resemblance is coincidence. |
| ai-document_not_reflected-6 | REAL-DUPLICATE | GT-B04: the unread lot on page 32, cited from the superseded original. |
| ai-document_not_reflected-7 | REAL-DUPLICATE | GT-B04: the same unread lot from the corrected 1099; claimed on the box B total, so strict matching missed it. |
| ai-answer_conflicts_with_return-3 | NOT-REAL | No return error: the twelve crypto sales are reported as the 1099-DA shows, and the engine already flags the answer conflict. |
| ai-date_or_year_mismatch-2 | NOT-REAL | Expenses of rental property held for sale stay deductible until the sale (Pub 527); October dues are a carrying cost. |
| ai-business_use_share-4 | NOT-REAL | Same rule: loan interest to payoff on the sale date is a carrying cost of property held for rental until sold. |
| ai-document_not_reflected-8 | NOT-REAL | The 4,800 purchase points are already deducted on line 8a from the Form 1098; the reader looked at 8c and missed 8a. |
| ai-limit_or_eligibility-4 | REAL-NEW | St. Brigid receipt (D64) lacks the goods-or-services statement required for gifts of 250 or more (IRC 170(f)(8)); SchA.11, about +390 federal and +72 California if disallowed. Verified against the packet by the reviewing model and the coordinator. |

## Limits

- 27 is a small set: one household, one season. A single suggestion moves recall by about 4 points.
- reader-v2 was revised after seeing reader-v1 scored on the same 27 mistakes. The changes were to format (a shorter
  rationale) and to document supersession (telling the reader which document replaced which), not to answers: no ledger
  text, id or hint is in any prompt (checked by searching every request body). The figures are still not a clean test.
- The altered packet (people renamed, one form removed, a staff member added) is the hold-out check.
- The ledger is what we found, not everything that is wrong; unmatched suggestions may be real issues.

## Altered packet

The altered packet renames every person, removes one form from every return version and adds a staff member.
The same mistakes are still in it, so recall should hold; suggestions that cite lines missing from it are false alarms.

| Measure | Result |
|---|---|
| Recall, strict | 15 of 27 (56%) |
| Recall, strict, text tier | 6 of 8 (75%) |
| Precision, strict | 30 of 42 (71%) |
| Recall, loose | 22 of 27 (81%) |
| Grounding rate | 42 of 42 (100%) |
| Claims on lines not in this packet (false alarms) | 0 |
| Rejected by format | 0 (would add none) |

Strict found: GT-A01, GT-A02, GT-A03, GT-A04, GT-A06, GT-B01, GT-B03, GT-C02, GT-C04, GT-C05, GT-D01, GT-D02, GT-D03, GT-D04, GT-D05.
