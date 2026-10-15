# Ground truth 04 — California→Texas move, itemized deductions, gifts, whole-return integrity

Area: residency and the California part-year return (Form 540NR, Schedule CA (540NR), Schedule S, FTB 5805),
Schedule A itemized deductions, the stock and car gifts, and cross-version integrity of the return.
Packet read: `case-study-project-package/okafor_lindqvist_2025_packet (1).json` (read-only, queried with small
Python scripts). Current return = `return_versions[2]` (v3, 2026-06-23).

Tax effects use v3 `tax_effect_rates`: itemized −0.26 federal / −0.048 California; salt 0.0 / −0.048 (federal 0.0
only because SALT is currently above the cap); ca_source_income 0 / 0.064. Credits and payments are 1:1. Rates are
linear estimates; the engine would recompute exactly.

Terms used once and defined here:
- **Itemized deductions (Schedule A)** — personal expenses you may subtract instead of the flat standard deduction
  (state and local taxes, home mortgage interest, gifts to charity). You take whichever is larger.
- **SALT** — state and local taxes (income tax + property tax). Federal law caps the SALT deduction (here 40,000).
- **Form 1098** — the lender's yearly statement of mortgage interest (box 1), points (box 6), property tax paid
  from escrow (box 10).
- **Points** — up-front interest paid to get a loan. Points on buying a home are deductible at once; points on a
  refinance are spread over the loan's life.
- **Form 1098-C** — the charity's statement for a donated car; box 4c is what the charity sold it for.
- **Form 540NR / Schedule CA (540NR)** — California's return for part-year residents. Column A = federal amount,
  B = subtractions, C = additions, D = total under California law, E = the part California may tax.
- **Schedule S** — California's credit for income tax paid to another state on the same income.
- **Form 2210** — federal penalty for paying tax too slowly during the year.

---

### GT-D01 — Mortgage interest to payoff counted twice (Lonestar payoff statement + Lonestar 1098)
- **Where:** D55 (ev-1029), D56 (ev-1032); v3 `SchA.8a` (rule R-MORTGAGE-INTEREST) → `SchA.8e` → `SchA.10` → `SchA.17`; also feeds `SchCA540NR.A.itemized`
- **Packet says:** SchA.8a = 21,847 = "Lonestar Mortgage LLC (Form 1098) 13,900.00; Pecan Federal Savings (Form 1098) 997.00; Lonestar Mortgage payoff statement - interest 2,150.00; purchase points 4,800.00" (v3 line note). ev-1032 = 2,150, confidence 0.99.
- **Truth:** 13,900 + 997 + 4,800 = **19,697**.
- **Why it's wrong:** The 1098 box 1 already includes the interest paid at payoff, and the payoff statement says so. The rule "every Form 1098 and lender statement" adds the same 2,150 a second time.
- **Evidence:** D55: "Box 1 mortgage interest received 13,900.00 (includes prepaid interest at closing and interest paid at payoff 11/20/2025)". D56: "interest 11/01/2025-11/20/2025 2,150.00 … (Interest is reported on the 2025 Form 1098.)" 21,847 − 2,150 = 19,697.
- **Tax effect (est.):** itemized −2,150. Federal 2,150 × 0.26 ≈ **+559** tax. California 2,150 × 0.048 ≈ **+103** tax.
- **How a workpaper should surface it:** De-duplication check across documents from the same lender for the same loan: when a statement says "reported on the Form 1098", link it to that 1098 as supporting detail, never as a second source. Show each Schedule A interest component with its document.
- **Severity:** medium

### GT-D02 — Home property tax includes the seller's share (seller credit at closing ignored)
- **Where:** D54 (ev-1027 = 6,912), D57 (ev-1036), D58 (ev-1038); v3 `SchA.5b` (rule R-SALT-PROPERTY) → `SchA.5d`/`SchA.5e`; also `SchCA540NR.A.itemized` (input `SchA.5b`)
- **Packet says:** SchA.5b = 13,420 (full 2025 Travis County bill).
- **Truth:** 13,420 − 6,912 = **6,508** (the buyers' share, 07/08–12/31).
- **Why it's wrong:** The house was bought 07/08/2025. At closing the seller credited the buyers 6,912 for the seller's part of the 2025 tax (01/01–07/07). The buyers then paid the full bill from escrow, but only their own period is their deductible tax; the seller's part is the seller's deduction.
- **Evidence:** D54: "Settlement date 07/08/2025 … Seller credit for 2025 county taxes 01/01/2025-07/07/2025: 6,912.00". D58: "Total levy 13,420.00 paid 12/18/2025 … Owner of record 01/01/2025: prior owner". Check: 13,420 × 188/365 = 6,912 (Jan 1–Jul 7 = 188 days), so the credit is exactly the seller's days. ev-1027 was extracted but feeds no line.
- **Tax effect (est.):** SALT total 41,290 → 34,378 (27,870 + 6,508), now **below** the 40,000 cap, so the deduction falls 40,000 − 34,378 = 5,622. The v3 federal salt rate (0.0) does not apply once the cap stops binding; use the itemized rate: 5,622 × 0.26 ≈ **+1,462** federal tax. California (no SALT cap, property tax only): 6,912 × 0.048 ≈ **+332** CA tax.
- **How a workpaper should surface it:** For a home bought or sold in the year, a "property-tax proration" view that sets the tax bill beside the closing statement's tax credit/debit, and flags any closing-statement tax line that feeds no return line.
- **Severity:** medium

### GT-D03 — Donated car deducted at the client's Kelley Blue Book guess, not the 1098-C sale price
- **Where:** D66 (ev-1054 box 4c = 2,900); qa-39; call-01; v3 `F8283.A1.vehicle` (rule R-NONCASH-GIFT, sources `qa-39`, `ev-1055`) → `SchA.12` → `SchA.14` → `SchA.17`
- **Packet says:** 6,000.
- **Truth:** **2,900.**
- **Why it's wrong:** When a charity sells a donated car (box 4a checked), the deduction is limited to the gross proceeds in box 4c. The engine's rule takes "the value stated by the donor", and the box 4c value was extracted but not used.
- **Evidence:** D66: "Box 4a vehicle sold in arm's length transaction to unrelated party checked; 4b date of sale 09/09/2025; 4c gross proceeds from sale 2,900.00." qa-39: "Kelley Blue Book said about 6,000." call-01: "The 2012 Subaru: Erik thinks it was worth about 6,000; the charity sold it at auction." 6,000 − 2,900 = 3,100 overstated.
- **Tax effect (est.):** itemized −3,100. Federal 3,100 × 0.26 ≈ **+806**. California 3,100 × 0.048 ≈ **+149**.
- **How a workpaper should surface it:** "Client-stated value vs third-party document" conflict check: when a line's source is a client answer and a document field for the same item exists, show both and require a choice. Vehicle rule: if 1098-C box 4a is checked, cap at box 4c.
- **Severity:** medium

### GT-D04 — California Schedule S credit claimed for Oregon tax (Oregon is a "reverse-credit" state)
- **Where:** D39 page 2 (ev-0982 = 1,580); v3 `ScheduleS.credit` (rule R-CA-OSTC) → `F540NR.64`
- **Packet says:** credit 844 (= 1,580 × 195/365).
- **Truth:** **0 on the California return.** For Oregon-source income of a California resident, California does not give the credit; the credit is claimed on the Oregon nonresident return instead (Oregon credits the California tax). Even if a credit were allowed, Schedule S limits it to California's own tax on that income: 18,400 × 195/365 = 9,830 of Oregon income; 9,830 / 305,349 (CA AGI, `F540NR.32`) × 19,718 (`F540NR.40`) ≈ **635**, not 844.
- **Why it's wrong:** The engine's simplified rule prorates the other state's tax by days and skips both the reverse-credit-state exception and the Schedule S limitation. Confidence: the 635 limit is arithmetic from the packet; the Oregon exception is from FTB Schedule S instructions (Arizona, Guam, Oregon, Virginia listed), not from the packet — reviewer to confirm.
- **Evidence:** D39 p2: "Oregon composite return filed for nonresident shareholders; Oregon tax paid on your behalf 1,580 (paid with the composite return in April 2026; included in box 16D distributions)." 1,580 × 195/365 = 844.1 (matches v3). The Oregon tax was paid by composite return, so to recover California's share the family would need an individual Oregon nonresident return rather than the composite — a decision for the preparer.
- **Tax effect (est.):** California tax **+844** if disallowed (credit 1:1); **+209** at minimum (844 − 635) under the limitation alone. Federal none.
- **How a workpaper should surface it:** Credit lines get a "limit" panel: other-state tax, double-taxed income, the limitation fraction and the state-pair eligibility, each with source; a credit that equals the raw tax paid × a day ratio is flagged as "limit not applied".
- **Severity:** medium

### GT-D05 — Federal underpayment penalty ignores excess social security tax as withholding
- **Where:** v3 `F2210.19` (rule R-2210-REGULAR), `F2210.AI`, `F1040.38`; `Sch3.11` / excess SS 3,342 (part of `F1040.31` 39,342 = 36,000 extension + 3,342)
- **Packet says:** penalty 164.
- **Truth:** about **17** with the engine's payments, about **27** after GT-A04's corrected 4th-quarter payment (3,000 on 2026-01-15).
- **Why it's wrong:** Form 2210 counts excess social security tax withheld as income tax withheld (spread evenly over the year). The engine used only W-2 box 2 (25,400). Ngozi had two employers in 2025: box 4 6,944 + 7,316 = 14,260 vs maximum 176,100 × 6.2% = 10,918, so 3,342 excess.
- **Evidence:** My recompute (`d_2210.py`: four equal installments of 41,313 / 4, withholding evenly on due dates, payments applied first-in first-out, 7% to 2026-04-15) reproduces the engine's **164 exactly** with withholding 25,400, which shows that is what the engine did. With withholding 28,742 (25,400 + 3,342): 17 (Q4 4,000) / 27 (Q4 3,000). Required annual payment checked: min(90% × 81,962 = 73,766; 110% × 37,557 = 41,313) = 41,313 = `F2210.8`. Same issue was raised as a suspicion in 01 (GT-A list); this confirms the engine's method.
- **Tax effect (est.):** penalty −137 to −147 federal (1:1). California none.
- **How a workpaper should surface it:** Show the penalty schedule (installments, payments by date, what counts as withholding) instead of a single number, so a reviewer can see which credits were included.
- **Severity:** low

### GT-D06 — Schedule CA column D lines list incomplete inputs (traceability defect)
- **Where:** v3 `SchCA540NR.1.D`, `.2.D`, `.12.D`, `.17.D` (rule R-SUM); same in v1 and v2
- **Packet says:** e.g. `SchCA540NR.1.D` = 218,400 with `inputs: ["SchCA540NR.1.A"]` (212,400).
- **Truth:** the values are right (D = A − B + C: 212,400 + 6,000 = 218,400; 6,450 − 410 = 6,040; 81,854 + 30,400 = 112,254; −11,830 − 484 = −12,314), but the inputs list omits the B or C line.
- **Why it's wrong:** A reviewer who follows "inputs" sees a sum of one number that does not equal the line, and the California adjustment that makes the difference (HSA add-back, Treasury interest, bonus-depreciation add-back, appliance depreciation) is invisible on the trace.
- **Evidence:** line-checker output (below): "LINEAGE ('SchCA540NR.1.D', 'inputs omit SchCA540NR.1.C')" and three more, in all three versions.
- **Tax effect (est.):** none (numbers are right).
- **How a workpaper should surface it:** The "trace this number" view must recompute every line from its listed inputs and show a red mark where the listed inputs do not produce the value.
- **Severity:** low

## Also in my area, logged elsewhere (not double-counted)
- **California-source wages overstated by 88,831** — GT-A02 (01-wages-people-credits.md). I confirmed it the same way: D73 "CA taxable wages 22,469.00" through 07/15 vs D09 box 16 111,300; `SchCA540NR.1.E` = 218,400; CA ≈ −5,685.
- **California estimated payments include the 09/15/2025 payment designated tax year 2024 (14,000 vs 10,500)** — GT-A03. Confirmed from D68 ev-1076 "2024" and `ftb_account`. FTB 5805 penalty stays 0 after the fix (withholding 13,130 alone covers more than 90% of any corrected CA tax at the 30/40/0/30 installment pattern).
- **Federal 4th-quarter estimate 4,000 (client guess) vs 3,000 on the IRS transcript** — GT-A04. My penalty recompute: 164 → 182 under the engine's method (see GT-D05).

## Suspicions not confirmed
- Refinance points (D57 box 6 3,200): engine deducts 9 (≈ 3,200 / 360 × 1 month). Loan term and first payment date are not printed; 0, 9 or 18 are all defensible. Confirm with the Pecan note's term and first payment date. Trivial amount.
- Stock gift to the donor-advised fund (D65) valued at "high/low average 72.50" — correct for an exchange-traded fund, but if Northlake Total Market Index Fund is a mutual fund the value is the closing NAV on 12/05/2025. Confirm with the broker transfer confirmation. Holding period long (acquired 04/2019) so fair-value deduction is right; lot N5 sold 09/04/2025 (120 sh, ev-0530) is a different lot, not a double count.
- Austin condo suspended passive loss (9,850 carryover) released on the 10/15/2025 sale is prorated into California by days (`SchCA540NR.17.E`). The sale was in the Texas period and the property is in Texas; California may not allow any of the released carryover. Confirm under California part-year rules for suspended losses.
- California exemption-credit phase-out for high AGI is not in `engine_reference.parameters`; at total CA AGI 481,096 it may reduce the 797 credit. Confirm the 2025 FTB threshold.
- Extension (April) was sized from v2 (35,728 → 36,000, rule "rounded up to the next 500" is applied correctly). The filed balance is v3's 4,220 plus corrections (+1,000 GT-A04, +~2,800 from GT-D01–D03, plus other ledgers), all paid 2026-07-20, so failure-to-pay penalty and interest apply (`timeline` tl-25, transcript code 196/276). Not an error in the packet, but the workpaper should show the cost of the late balance.
- No Form 709 (gift tax return) issue found: both noncash gifts went to charities (Austin Community Foundation DAF; Lone Star Kids Auto Donation), and no gift to a person appears in documents or answers. The 2023 Swedish inheritance (Form 3520) is logged in 02/03.

## Things the engine already flags (my area)
- `LOW_CONFIDENCE_READ` (ev-1049, St. Brigid receipt read 1,500 at 0.41) — **right to flag; resolved, no error.** D64: "'$?,500.00' … could be read as 1 or 7". msg-08 (2026-07-01, after v3): "St. Brigid confirmed by phone the gift was 1,500 - matches our bank statement (check #2207, 12/21/2025)". The workpaper should record msg-08 as the evidence that clears the flag.
- `CA_AMT_NOT_COMPUTED` — right (engine limitation; ISO exercise in July while CA resident is relevant).
- `AMT_CREDIT_CARRYFORWARD`, `DUE_DILIGENCE_REQUIRED` — informational, plausible.
- Not flagged by the engine: GT-D01, D02, D03, D04, D05, A02, A03, A04 — none has a diagnostic.

## Checks that passed (numbers I recomputed and found right)
- Residency days: 2025-01-01 to 2025-07-14 inclusive = 195 = `ca_resident_days`; matches qa-02 ("July 15") and household.residency.
- SALT cap: AGI 445,590 < 500,000 → cap 40,000 (`SchA.5e`). `SchA.5a` 27,870 = W-2 box 17 8,950 + 4,180 + every FTB payment paid in calendar 2025 (3,000 + 1,240 + 3,500 + 3,500 + 3,500); cash-basis correct even for the payments applied to 2024.
- Rental mortgages (D48 Golden Bear, D53 Hill Country condo) and the Sacramento tax bills (D49) go to Schedule E, not Schedule A; D49 3,080 + 3,160 = D48 box 10 6,240, counted once.
- Deduction choice: itemized 85,706 > standard 31,500 (`F1040.12`); still itemized after all fixes (≈ 74,800). California: itemized 59,126 > 11,412; no CA itemized phase-out (481,096 < 531,000).
- 540NR math: line 31 = bracket tax of 421,970 = 32,328; ratio 305,349 / 481,096 = 0.6347; line 35 = 305,349 − 59,126 × 0.6347 = 267,822; exemption credits (2 × 153 + 2 × 475) × 0.6347 = 797.
- California-source lines by days (interest 3,227, dividends 3,772, business 59,971, adjustments 18,911) all equal D × 195/365. Capital gain E 55,174 = lots sold by 07/14 (49,732.83) + (K-1 1,350 + distributions 1,820 + S-corp excess distribution 21,215 + carryovers −14,200) × 195/365 — reproduced exactly. Rental E −16,310 reproduced (Sacramento 100%, condo/Woodworks/Ridgeline by days, Ridgeline 22% CA for the Texas period).
- `tax_effect_rates` sanity: interest/stcg 0.348 = ordinary 0.31 + 3.8% NIIT; ltcg 0.238 = 15% + 3.8% + 5% child-tax-credit phase-out (CTC 400 left → only ~8,000 more AGI before that part stops). The salt rate 0.0 is only valid while SALT stays above the cap (see GT-D02).
- Summary totals vs lines: all 12 summary fields × 3 versions match their lines (`F1040.11/.15/.24/.33/.37/.38`, `F540NR.17/.32/.64/.78/.97`, `FTB5805.penalty`).
- `changes_from_previous`: v2 lists 63 changes = 63 actual line differences; v3 89 = 89. No unlisted or phantom change.
- Documents never used in v3: D30 (superseded by D31, correct), D71 (received 2026-07-13, after v3), D72 (2028 exam letter). D10 (phone photo of the Halvorsen W-2) is "used" but de-duplicated: `SchCA540NR.1.A` 212,400 = 104,600 + 107,800 and `F540NR.71` 13,130 = 8,950 + 4,180, counted once. D73 is "used" but changes nothing (see GT-A02).
- What-if alternatives: `standard_deduction` +12,306 federal, 0 California (CA deduction is independent) — consistent. `penalty_annualized` = 164: the annualized installments (14,807 / 16,707 / 14,922 / 27,330) are all above the regular 10,328, so the regular amount applies each quarter — consistent.

## Line-math checker results
Script: `/private/tmp/claude-501/-Users-aarvingeorge-Documents-Climb-Profile-Builder-tech-personal-projects-tax-workpaper-project/9cc2f380-a009-45a0-913e-e17f89510bc5/scratchpad/hunt/d_linecheck.py`
(version check: `d_versions.py`; penalty: `d_2210.py`, same folder).

It recomputes each line with `inputs` from the input lines' values: R-SUM by finding a +/− combination (fewest
minus signs first; the subtractions found are all sensible, e.g. `F1040.11` = 9 − 10, `F540NR.64` = 40 − Schedule S);
explicit formulas for R-CA-RATIO, R-CA-PRORATE, R-CA-TAX, R-SALT-CAP, R-DEDUCTION-CHOICE, R-CA-DEDUCTION, the CA rate
schedule, CA exemption credits, R-STANDARD-MILEAGE, R-2210-METHOD-CHOICE; Schedule CA column D as A − B + C. Rules
that need data outside the line graph (tax worksheet, SE tax, QBI, passive losses, etc.) are reported as "not modelled".

| Version | Lines | With inputs | Recomputed | Mismatches | Not modelled | Lineage gaps |
|---|---|---|---|---|---|---|
| v1 | 625 | 221 | 148 | 0 | 73 | 4 |
| v2 | 625 | 221 | 148 | 0 | 73 | 4 |
| v3 | 627 | 221 | 148 | 0 | 73 | 4 |

Proof it can produce a mismatch (`--mutate`):
```
$ python3 -I d_linecheck.py "<packet>" 2 --mutate SchA.11=1000
version v3: lines=627 with_inputs=221 recomputed=148 ok=147 MISMATCH=1 not_modelled=73
MISMATCH ('SchA.14', 'R-SUM', 23850.0, 'no +/- combination of inputs', [('SchA.11', 4350.0), ('SchA.12', 20500.0)])
exit=1
```
And `d_versions.py` on a copy with SchA.11 +1,000 and summary balance +1 reports
`UNLISTED SchA.11 ('changed', 3350, 4350)` and `v3 fed summary balance_due 4221 line F1040.37 4220`.

Conclusion: the engine's arithmetic is internally consistent. Every error in this ledger is in **what goes into**
the lines (wrong or duplicated sources, ignored document fields) or in **rules applied too simply** — exactly what
a line-math check cannot catch, so the workpaper also needs the source-vs-document checks described above.
