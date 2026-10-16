# Ground truth 01 — wages, people, credits, retirement, payments, agency

Area: household and identity, W-2s and stock compensation, IRA / HSA, dependents and credits, estimated
payments, agency records and e-file. Packet read: `case-study-project-package/okafor_lindqvist_2025_packet (1).json`
(read-only, queried with small Python scripts). Current return = `return_versions[2]` (v3, 2026-06-23).

Tax effects use v3 `tax_effect_rates` (wages 0.31 / 0.099; stcg 0.348 / 0.034; ltcg 0.238 / 0.034;
adjustment -0.31 / -0.042; ca_source_income 0 / 0.064). Credits and payments are 1:1. Rates are linear
estimates; the engine would recompute exactly.

Terms used once and defined here:
- **W-2 box 16 / 17** — wages and income tax the employer reported to a state.
- **California-source wages** — pay for work done while living or working in California; a part-year resident pays
  California tax only on these (plus other California-source income).
- **Form 8949 basis** — what you paid for shares; gain = sale proceeds minus basis.
- **RSU** — restricted stock units: shares an employer gives you; their value is already taxed as wages on the W-2 when they vest.
- **Estimated payments** — tax the household paid in advance during the year (IRS via EFTPS, California via FTB Web Pay).
- **Self-employed health insurance (SEHI) deduction** — an above-the-line deduction for a self-employed person's own health premiums.

---

### GT-A01 — RSU sales taxed twice: supplemental basis ignored on three Corvane lots
- **Where:** D28 page 3 lots N1, N3, N4 (ev-0498, ev-0516, ev-0525 basis = 0); D11 page 2 (ev-0066, ev-0068, ev-0070); v3 lines `F8949.B.N1`, `F8949.B.N3`, `F8949.E.N4` → SchD → F1040.7
- **Packet says:** basis 0.00 on all three lots (extracted with confidence 0.98, `text_as_read` = "" — the broker left it blank). Return gains: N1 19,240; N3 18,480; N4 15,300.
- **Truth:** basis per D11 supplemental statement: RSU-2502 19,100; RSU-2505 19,100; RSU-2308 9,420. Gains: N1 19,240 − 19,100 = **140**; N3 18,480 − 19,100 = **−620**; N4 15,300 − 9,420 = **5,880**.
- **Why it's wrong:** The broker 1099-B says the basis is "not reported" (noncovered). The vest value was already taxed as wages (W-2 box 14 RSU 38,200 = 19,100 + 19,100). Rule R-8949-LOT says the supplemental statement replaces broker basis "if matched" — the engine matched the ESPP lot (N2 cites ev-0072) but not the three RSU lots, so the same income is taxed twice. Unchanged in v1, v2, v3.
- **Evidence:** D28 p3: "N1 Corvane Systems Inc (RSU) 400 sh acquired 2025-02-15 sold 2025-02-18 proceeds 19,240.00 basis (not reported) … N3 … 400 sh acquired 2025-05-15 sold 2025-05-20 proceeds 18,480.00 basis (not reported) … N4 … 300 sh acquired 2023-08-15 sold 2025-08-12 proceeds 15,300.00 basis (not reported)". D11 p1: "cost basis reported on Form 1099-B for RSU shares is blank/$0 because these shares are noncovered". D11 p2: "Lot RSU-2502: 400 sh acquired 02/15/2025 … adjusted basis 19,100.00, sold 02/18/2025 … RSU-2505: 400 sh acquired 05/15/2025 … 19,100.00, sold 05/20/2025. RSU-2308: 300 sh acquired 08/15/2023 … 9,420.00, sold 08/12/2025". v3 line label: "F8949.B.N1 … proceeds 19,240.00, basis 0.00 = 19240.0", sources do not include ev-0066.
- **Tax effect (est.):** gain overstated by 38,200 short-term + 9,420 long-term. Federal: 38,200 × 0.348 + 9,420 × 0.238 = 13,294 + 2,242 ≈ **−15,536**. California: N1/N3 sold during CA residency → 38,200 × 0.064 (ca_source_income) = 2,445; N4 sold after the move → 9,420 × 0.034 (ltcg, approximate) = 320; ≈ **−2,765**.
- **How a workpaper should surface it:** "Noncovered lot with zero/blank basis" check, and a cross-document match of 1099-B lots against the stock-plan supplement (same shares, same dates) — show the unmatched supplement lots as orphans.
- **Severity:** high

### GT-A02 — California-source wages overstated: post-move Halvorsen wages taxed by California
- **Where:** D09 box 16 (ev-0047 = 111,300); D73 (ev-1081 = 22,469); household.residency; v3 `SchCA540NR.1.E` (rule R-CA-WAGES-SOURCE)
- **Packet says:** California wages = 218,400 (all of Ngozi's wages, both employers, plus 6,000 HSA add-back).
- **Truth:** 107,100 (Corvane box 16, all earned while a CA resident) + 22,469 (Halvorsen CA taxable wages through 07/15/2025, D73) = **129,569**.
- **Why it's wrong:** The family were CA residents only to 2025-07-14 and then lived and worked in Texas. Halvorsen's payroll wrongly kept California as the work state, so box 16 reports the whole year's pay to California; the engine copies box 16 as California-source. The paystub (D73) gives the correct split and was in v3's `documents_used`, but changed nothing.
- **Evidence:** D09: "Box 16 111,300.00 … (Employer payroll kept California as the work state through 09/30/2025.)" — 111,300 = box 1 107,800 + HSA code W 3,500, i.e. the full year. D73: "Work location changed to Austin, TX effective 07/15/2025. Year-to-date as of 07/15/2025 … HSA (cafeteria) 0.00 … CA taxable wages 22,469.00". household.residency: CA "2025-01-01" to "2025-07-14". qa-45: "Ngozi's new employer kept withholding California tax until September by mistake." Arithmetic: 218,400 − 129,569 = 88,831 overstated. (D73 YTD runs to 07/15, one day past residency; immaterial.)
- **Tax effect (est.):** Federal none. California 88,831 × 0.064 (ca_source_income) ≈ **−5,685** CA tax (larger CA refund). The 4,180 CA withholding stays a payment and is refunded.
- **How a workpaper should surface it:** "State wages vs residency dates" check: box 16 for an employer with a work-location change after the move date must be split; show box 16 beside paystub YTD at the move date. Also a client-answer link (qa-45) on the line.
- **Severity:** high

### GT-A03 — California estimated payments include a payment designated for tax year 2024
- **Where:** D68 (ev-1074..1076: 2025-09-15, 3,500, year "2024"); tax_agency_records.ftb_account; v3 `F540NR.72` (rule R-CA-ESTIMATED-PAYMENTS)
- **Packet says:** 2025 CA estimated payments = 14,000 (4 × 3,500).
- **Truth:** **10,500** (2025-04-15, 2025-06-16, 2026-01-15).
- **Why it's wrong:** The rule counts "every FTB payment dated 2025-04-01 through 2026-01-15" by date, ignoring the tax year the payment was applied to. The 2025-09-15 payment was designated tax year 2024, and the FTB holds it as a 2024 credit. The engine even extracted the year (ev-1076 = "2024", conf 0.98) and ignored it.
- **Evidence:** D68: "2025-09-15 3,500.00 tax year 2024 (estimated payment)". ftb_account.tax_year_2025_payments lists only 04-15, 06-16, 01-15 (3 × 3,500); tax_year_2024_payments_after_filing: "Web Pay payment designated tax year 2024; held as a 2024 credit". v3 F540NR.72 note: "2025-04-15 3,500.00; 2025-06-16 3,500.00; 2025-09-15 3,500.00; 2026-01-15 3,500.00".
- **Tax effect (est.):** California payments overstated 3,500 → CA refund overstated **3,500** (1:1). (The 3,500 is recoverable separately as a 2024 credit — ask FTB to transfer or refund it.) California underpayment penalty unchanged on my check (110% × 2024 tax 12,520 = 13,772 is still met: withholding 13,130 + 10,500).
- **How a workpaper should surface it:** Reconcile each payment to the agency account (FTB) by tax year, not by date; "payment year ≠ return year" flag.
- **Severity:** high

### GT-A04 — Federal 4th-quarter estimated payment taken from the client's guess, not the IRS record
- **Where:** v3 `F1040.26` (rule R-ESTIMATED-PAYMENTS, sources include qa-41); D67; tax_agency_records.irs_account_transcript_2025; `F2210.19`
- **Packet says:** 13,000 (3 × 3,000 + "2026-01-14 4,000.00").
- **Truth:** **12,000** — the 4th payment was 3,000 on 2026-01-15.
- **Why it's wrong:** EFTPS confirmations (D67) cover only three payments, so the engine fell back to the questionnaire ("4,000 I think"). The IRS transcript (D69, in `documents_used` since v2) shows 3,000 on 2026-01-15. The engine never reconciled to the transcript.
- **Evidence:** qa-41: "Paid January 14, 2026 - 4,000 I think." Transcript as_of 2026-03-12 and 2026-08-03: `{"date": "2026-01-15", "code": "670", "description": "Estimated tax payment", "amount": 3000}`. D67: "04/15/2025 3,000.00; 06/16/2025 3,000.00; 09/15/2025 3,000.00."
- **Tax effect (est.):** Federal payments overstated 1,000 → balance due understated **+1,000** (1:1). Underpayment penalty rises about 1,000 × 7% × 90/365 ≈ **+17** (164 → ~181; my recomputation of the regular method gives ~182). Note: the April extension payment (36,000) was sized from v2, which carried the same error.
- **How a workpaper should surface it:** Payments tie-out: return payments vs IRS transcript code 670 lines; any payment sourced only from a client answer is marked "unverified".
- **Severity:** medium

### GT-A05 — Theo's SSN entered wrong in the organizer (transposed digits) — caused the e-file rejection
- **Where:** household.people[theo].ssn; D71 (ev-1080); D06 (ev-0012); tax_agency_records.efile[0]
- **Packet says:** 666-74-**3309** (household, "exactly as the client entered them"); return dependents use household:theo (`F8812.4` source).
- **Truth:** 666-74-**3390** (Social Security card D71; also on the 2024 return D06).
- **Why it's wrong:** Last two digits swapped. The 2024 return already in the file (D06, received 2026-01-21) had the right number, so this was catchable five months before filing; instead the federal return was rejected and the California return held.
- **Evidence:** D71: "Social Security card: Theo Lindqvist-Okafor, XXX-XX-3390." D06 p1: "Theo Lindqvist-Okafor SSN XXX-XX-3390" (ev-0012). efile 2026-07-13: "R0000-504-02 … Dependent's taxpayer identification number and name control must match the e-file database (dependent 2: Theo Lindqvist-Okafor)"; CA "STATE-HOLD". msg-10: "I must have typed his number wrong in the organizer."
- **Tax effect (est.):** None once fixed. Unfixed, the 2,200 child tax credit (400 after phase-out, `F8812.12`) and e-file would fail; it delayed filing a day.
- **How a workpaper should surface it:** Identity check: every SSN in household vs every document that prints it (prior-year return, SS card, 1098-T); mismatch = blocker before e-file.
- **Severity:** medium

### GT-A06 — Self-employed health insurance deducted although Erik could join Ngozi's employer plans
- **Where:** v3 `Sch1.17` = 14,400 (rule R-SEHI, source ev-0484 / D25); qa-25
- **Packet says:** SEHI deduction 14,400.
- **Truth:** **0** (pending a month-by-month eligibility check).
- **Why it's wrong:** The deduction is not allowed for any month the self-employed person is eligible for a subsidised plan of an employer of the person *or the spouse*. The client says both of Ngozi's employers offered family coverage and Erik chose not to join. Rule R-SEHI only applies the income limit, not the eligibility test.
- **Evidence:** qa-25: "Yes - both of Ngozi's employers offer family coverage, but Erik kept his own individual plan because he likes his doctors." D25: "individual PPO plan … 1,200.00 per month, total 14,400.00." qa-27: Ngozi's family HDHP covers "her and the kids".
- **Tax effect (est.):** Adjustment removed 14,400: Federal 14,400 × 0.31 ≈ **+4,464**; California 14,400 × 0.042 ≈ **+605**. (QBI effect not captured by the rate.) Possible small carve-out for any gap month between jobs (Corvane ended 05/16, Halvorsen began 06/02) — confirm with the employers' plan dates.
- **How a workpaper should surface it:** Link client answers to the lines they gate: a "yes" on qa-25 must raise a conflict on Sch1.17.
- **Severity:** high

### GT-A07 — Little Sprouts provider tax ID misread (transposed digits)
- **Where:** D62 (ev-1045); v3 `F2441.1b`
- **Packet says:** 74-3829**516** (confidence 0.97).
- **Truth:** 74-3829**156** (as printed).
- **Why it's wrong:** The OCR swapped "156" to "516"; the return carries the wrong provider ID on Form 2441 (the dependent-care form, which must list each provider's tax ID to support the 5,000 employer dependent-care exclusion).
- **Evidence:** D62 printed: "Tax ID 74-3829156." ev-1045 `value` and `text_as_read` both "74-3829516". F2441.1b label: "Care provider: Little Sprouts Learning Center, tax ID 74-3829516".
- **Tax effect (est.):** None computable (credit is 0 either way: 3,000 limit − 5,000 excluded benefits). A wrong provider TIN can put the 5,000 exclusion at risk on IRS matching.
- **How a workpaper should surface it:** Printed vs extracted mismatch (string diff of `text_as_read` against printed content); high confidence is not proof.
- **Severity:** low

### GT-A08 — Bright Oak provider named wrongly on Form 2441
- **Where:** D61; v3 `F2441.1a`
- **Packet says:** "Bright Oak Preschool".
- **Truth:** "Bright Oak Kids Club" (D61; also the 2024 return's F2441.provider, ev-2994).
- **Why it's wrong:** The return line uses a name that appears nowhere in the documents; the tax ID 68-0412257 is right.
- **Evidence:** D61: "Bright Oak Kids Club, 3101 Freeport Blvd, Sacramento CA. Tax ID 68-0412257." F2441.1a label: "Care provider: Bright Oak Preschool, tax ID 68-0412257 = 5400".
- **Tax effect (est.):** None.
- **How a workpaper should surface it:** Line label text vs source document text check.
- **Severity:** low

---

## Suspicions not confirmed

- **Excess social security not counted as withholding in the penalty (Form 2210).** The 2210 instructions treat excess SS (3,342, `Sch3.11`) as tax withheld; the engine's note lists withholding as 25,400 only. Confirm by reading the engine's 2210 inputs; if included, the 164 penalty would fall by roughly 3,342 × 7% × ~half-year ≈ 100+.
- **ISO shares held at year end.** `F6251.2i` = 40,000 (1,000 × (52 − 12)) is right only if none of the 1,000 shares was sold in 2025; qa-06 says "She still holds those shares" and a search of every document's printed content finds no ISO sale and no Corvane shares outside D08/D11/D12/D13/D28. Likely correct; confirm with a year-end brokerage position statement.
- **California AMT on the ISO exercise.** Exercise 07/30/2025 was after the move, but the option was granted 2022 while working in CA, so part of the 40,000 spread may be California-source for AMT. The engine flags this (CA_AMT_NOT_COMPUTED) but does not size it. Confirm with grant-to-exercise CA workdays.
- **HDHP coverage in the job-change gap (05/17–06/01).** The 8,550 family limit assumes 12 months of HDHP coverage; contributions (6,000) are under the limit anyway, so low risk.
- **Interest and failure-to-pay penalty not on the return.** Balance paid 2026-07-20 (tl-25; transcript code 196/276). Not an engine error (the IRS computes it), but the workpaper's "amount you owe" should show it is not the final cost.

## Things the engine already flags (my area)

- **DUE_DILIGENCE_REQUIRED** (Form 8867 not completed for CTC/ODC) — correct; still open in v3.
- **AOTC_PHASED_OUT** — correct: MAGI 445,590 > 180,000 ceiling; tentative AOTC 2,500 on 15,800 − 9,000 scholarship = 6,800 is also right.
- **AMT_CREDIT_CARRYFORWARD** (ISO deferral) — correct in principle; amount 3,871 depends on GT-A01 (lower regular tax changes AMT).
- **CA_AMT_NOT_COMPUTED** — correct and important (see suspicion above).
- **Not flagged but checked and correct:** W-2 box 1 / 2 sums (212,400 / 25,400; D10 photo correctly matched to D09 and counted once — identical boxes); box 4 = 6.2% and box 6 = 1.45% of boxes 3/5 on both W-2s; excess SS 14,260 − 176,100 × 6.2% = 3,341.80 → 3,342; additional Medicare 500; CTC phase-out 46 × 50 = 2,300; HSA (6,000 employer, 2,150 qualified distributions, CA add-back 6,000); Form 8606 backdoor Roth (basis 7,000 from 2024 + 7,000 for 2025 against 14,026 converted → 26 taxable) — correct even though qa-31 says "Prior basis: none … we started doing this in 2025" (the 2024 return D06 p10 and D42 show the 2024 contribution was made 02/12/2025); ESPP lot N2 (+675 adjustment → basis 4,500) correct; IP PIN 482915 matches D03; prior-year AGI 228,409 matches D06; DOBs match D04/D05.
