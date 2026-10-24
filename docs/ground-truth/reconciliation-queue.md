# Ledger reconciliation queue

Items raised by discovery writers, reviewers or the README explainer that may change the ground-truth ledger.
Nothing here changes the ledger until the main session checks it against the packet and records the outcome.
Opened 16 Oct 2026, 04:00 UTC.

| # | Ledger item | Raised by | Claim | Status |
|---|---|---|---|---|
| 1 | GT-C05 tax effect | Change review (F1); README explainer | Index shows +3,364 fed / +1,074 CA (rates). README says the engine's own `what_if` beats the rate estimate where one matches: `hvac_improvement` gives +3,633 / +896. The ca_source_income rate gives +694 | **resolved 04:06 UTC:** use what_if +3,633 / +896; index corrected |
| 2 | GT-A06 tax effect | README explainer | "+3,770 net" in file 03 uses an outside 24% bracket; file 01 gives +4,464 with QBI not captured. The two ledger files disagree | **resolved 04:06 UTC:** +4,464, QBI offset noted as uncaptured; index corrected |
| 3 | GT-D04 | Discovery 9 | Schedule S credit for the Oregon composite is probably allowed but capped (~635, not 844); ledger says the claim is wrong | open; Fable review of 9 running |
| 4 | New: ISO AMT basis not carried forward | Discovery 6 | carryovers_out lacks AMT basis for 1,000 ISO shares (AMT basis 52,000 vs regular 12,000) | open; Fable review of 6 running |
| 5 | New: California split by days | Discovery 2, Discovery 9 | 540NR uses federal × 195/365 where FTB asks for amounts received while resident | open; Fable reviews of 2 and 9 running |
| 6 | New: CA suspended rental loss = federal | Discovery 8 | CA depreciation differed, so CA suspended loss should differ (≤ ~$72) | open; Fable review of 8 running |
| 7 | Federal fixes total | Discovery 3, 4, 6 | −9,113 vs −10,113 standalone; v3's 4,220 due likely becomes a refund; scripted penalty may not arise | open |
| 8 | Process: extension sized on stale data | Discovery 3 (revised) | D69 showed 12,000 estimates (balance 36,728 > 36,000 paid); Ridgeline K-1 pending | process observation, not a ledger mistake |
| 9 | Process: no record Erik signed; no Form 8878; no rejection notice | Discovery 5 | packet records gaps | process observations |
| 10 | Process: no disclosure consent (D02) | Discovery 7 | Rev. Proc. 2013-14 §5.05 | process observation |
| 11 | v2→v3 document-caused lines: 6 or 8 | Change writer vs reviewer | count dispute | open |
| 12 | New: AUS-FLOOR likely carpet (5-yr §1245), allowed-or-allowable depreciation, recapture on 2025 sale (~4,149 basis), Form 3115 | Records review (S2) | D50 prints "carpet cleaning" | open |
| 13 | Item 6 bound widened | Records review | CA suspended loss difference range [−3,360, +2,634], sign unknown | open |
| 14 | Item 4 corroborated | Records review | ISO AMT basis 52,000 vs regular 12,000 carried by no record (D12) | open, now raised by two agents |
| 15 | Item 7 resolved in part | Filing review | −9,113 and −10,113 are both right (with / without GT-A04's +1,000); both give 4,220 − 9,113 = −4,893. Standalone sum overstates because the return is in AMT; direction robust (GT-A01 alone > 4,220) | partly resolved |
| 16 | New: TC 610 vs electronic-payment date inconsistency | Filing review | 20 Jul debit coded "payment with return" yet a failure-to-pay penalty is scripted; either no penalty (interest ≈ 78) or penalty ≈ 84.40 + interest | open |
| 17 | Item 4 widened | Filing review | ISO needs federal and CA AMT basis plus CA minimum tax credit; F540NR.61 = 0 with CA_AMT_NOT_COMPUTED; reviewer recommends promoting to the ledger with a test | open, recommended for ledger |
| 18 | Item 5 (CA split by days) | Calculation review | rule right, evidence misread; Pub 1100 makes daily proration the required fallback without dated facts → hypothesis, no computable effect | downgraded: hypothesis |
| 19 | New: S corp excess distribution 21,215 prorated by days | Calculation review | SchCA540NR.7.E reproduced as engine proration; Pub 1100 Ex. 8 and Reg. §1.1368-1(b) support date-based sourcing; dates missing; ≈11,334 CA-source at stake | open: hypothesis, ask client for distribution dates |
| 20 | Trace gap: F8949.F.SCORP has empty sources, basis None | Calculation review | basis chain via 2022 client worksheet and null 2024 figure | open; candidate for ledger (trace pattern, like GT-D06) |
| 21 | Bridge dispute settled | Calculation review | 7 items → SchC.29 83,054; + home office 1,200 → SchC.31 81,854; both authors right | resolved |
| 22 | Item 3 (GT-D04) | Person/place review | Oregon 2025 Pub OR-OC (Rev. 02-04-26) confirms composite credits not allowed; Schedule S group-return exception applies → credit allowed, limit ≈ 635, CA +209 (not +844); drop "truth: 0" | **applied 04:15 UTC** (file 04 correction line; index footnote ³) |
| 23 | Arizona composite credit | Person/place review | real but ≈ $30; client request for the composite statement, not a ledger entry | resolved: client request |
| 24 | Items 4/14/17 (ISO) widened again | Person/place review | 40,000 AMT adjustment is 100% California-source (Pub 1004; employment ended 05/16/2025, before the move) → up to 2,800 CA AMT; ledger's "exercised while CA resident" wording is wrong (exercise 07-30, move 07-14) | open, recommended for ledger |
| 26 | Items 17/24 confirmed by the blind re-investigation (24 Oct, Fable 5.1 with only the raw packet) | Post-hand-in | Third independent reader raises CA AMT never computed (F540NR.61 = 0, rule R-CA-AMT-NOT-COMPUTED, input F6251.2i 40,000, diagnostic open in v1-v3). The app now flags it as a blocker (CHK-LINE-NOT-COMPUTED, any line the engine does not compute with a nonzero input) | **checked in the app; kept out of the 27-entry catalogue** so handed-in counts stay true (Aarvin, 24 Oct); promote to the ledger later in one step |
| 25 | Item 5/18 (CA split) | Person/place review | for K-1 income 195/365 is the FTB default; interest is sourced by residence at receipt, not bank location | further narrowed |
