# Ground truth 02: investments, crypto, foreign, pass-throughs

Area covered: brokerage 1099s (D28–D33, D74), Form 8949 / Schedule D / Schedule B, crypto (D34, D35), the Swedish
account (D36), K-1s (D37–D40) and S corporation basis (Form 7203), NIIT (Form 8960), and California sourcing of these items.
Packet read: `case-study-project-package/okafor_lindqvist_2025_packet (1).json` (read-only; I queried it with small Python
scripts in the session scratchpad, `b_*.py`). The current return is `return_versions[2]` (v3, 2026-06-23).

Tax effects use the v3 `tax_effect_rates` (federal / California per dollar): interest 0.348 / 0.069; stcg 0.348 / 0.034;
ltcg 0.238 / 0.034; ca_source_income 0 / 0.064. The README says that when an item is fully California-source (for example,
a sale while they lived in California, before 2025-07-15), you use ca_source_income for the California effect. All
figures are linear estimates; the real engine would recompute them exactly.

Terms, defined once:
- **Form 8949 / Schedule D**: the list of every sale (proceeds minus basis = gain) and its summary. "Box A/B/D/E/H/K" says
  whether the sale is short or long term and whether the broker reported the basis.
- **Basis**: what you paid for an asset, used to work out the gain.
- **Short-term / long-term**: held one year or less / more than one year. Long-term gains get a lower federal rate.
- **Schedule B**: the list of interest and dividends by payer. Its Part III asks about foreign accounts.
- **Wash sale**: a loss on a sale is disallowed (deferred) if the same security is bought within 30 days before or after the sale.
- **K-1**: the statement a partnership or S corporation sends each owner, showing that owner's share of its income.
- **S corporation stock basis (Form 7203)**: the owner's running investment in the company. Distributions above basis are taxed as capital gain.
- **NIIT (Form 8960)**: an extra 3.8% tax on investment income above $250,000 of AGI (married filing jointly).
- **Form 8938 / FBAR**: reports of foreign accounts. Form 8938 goes with the return; the FBAR (FinCEN 114) is filed separately.
- **Form 3520**: the IRS report of a large gift or inheritance from a foreign person (more than $100,000).

---

### GT-B01: Northlake sweep interest counted twice on Schedule B
- **Where:** D28 page 1 (ev-0492) and D29 page 1 (ev-0538); v3 lines `SchB.1.1` and `SchB.1.2` → `SchB.2` → `F1040.2b`, `F8960.1`, `SchCA540NR.2`
- **Packet says:** two interest lines of 1,840 each. ev-0492 has confidence 0.99 and is labelled "Northlake Securities - bank sweep (composite 1099-INT)". ev-0538 has confidence 0.99 and is labelled "Northlake Bank, N.A.". Total interest is 6,450.
- **Truth:** a single 1,840 of interest, so total interest is 4,610.
- **Why it's wrong:** the composite statement just reprints the same Form 1099-INT that Northlake Bank issued for the sweep, so it is one payer and one payment shown on two documents. The 2024 return reported this sweep interest on one line only.
- **Evidence:** D28 p1: "1099-INT (bank sweep program, Northlake Bank): box 1 interest 1,840.00". D29 p1: "Payer Northlake Bank, N.A. (bank sweep program for Northlake Securities account ending 7731) … Box 1 interest income 1,840.00". It is the same account (7731), the same payer and the same amount. In 2024, D06 p4 shows a single line, "SchB.1.1 Interest - Northlake Securities (bank sweep) 1,180". Rule R-INTEREST-PAYER says "One line per interest payer", and the engine broke it.
- **Tax effect (est.):** −1,840 of interest. Federal: −1,840 × 0.348 = **−$640**. California: −1,840 × 0.069 = **−$127**.
- **How a workpaper should surface it:** run a duplicate check across documents that keys on payer, account number and amount, so that a composite 1099 and a standalone 1099-INT for the same account collide. Also show each Schedule B line next to the prior-year payer list.
- **Severity:** medium

### GT-B02: Swedish interest converted at the 2024 exchange rate
- **Where:** D36 (ev-0960, SEK 18,450.00); v3 line `SchB.1.6`, whose source is `ref:fx.SEK.2024_average`
- **Packet says:** 1,747 (SEK 18,450 ÷ 10.56). The label reads "at 10.56 SEK/USD".
- **Truth:** 18,450 ÷ 9.86 (`fx_rates.SEK_per_USD.2025_average`) = **1,871**.
- **Why it's wrong:** this is 2025 interest, so it should use the 2025 average rate, but the engine took the 2024 rate. The 2024 return used 10.56 for 2024 interest (D06 p4, "SEK 3,700 at 10.56"), and the engine seems to have carried that rate forward. The 2025 average (9.86) is in the packet, and the engine used the right 2025 year-end rate (9.71) for Form 8938.
- **Evidence:** v3 `SchB.1.6` sources = ["ev-0960", "ref:fx.SEK.2024_average"]. fx_rates = {2024_average 10.56, 2025_average 9.86, 2025_year_end 9.71}. 18,450 / 10.56 = 1,747.2 and 18,450 / 9.86 = 1,871.2, a difference of +124.
- **Tax effect (est.):** +124 of interest. Federal: +124 × 0.348 = **+$43**. California: +124 × 0.069 = **+$9**.
- **How a workpaper should surface it:** every foreign-currency amount should show its rate, the rate's year and the rule for which rate to use (average for income, year-end for balances). Flag any rate whose year differs from the tax year.
- **Severity:** low (small amount, but a systematic error that grows with the balance)

### GT-B03: Crypto lot C6 still at zero basis and short-term after the client supplied the real cost
- **Where:** D35 (ev-0918 acquired = None, ev-0919 basis = None, confidence 0.6); D34 (ev-0882 proceeds 5,325); v3 line `F8949.H.C6` → `SchD.3`; client message msg-07
- **Packet says:** basis 0.00, acquired 2025-06-01 (the date of the transfer into Coinhaven), short-term (box H). Gain 5,325.
- **Truth:** per the client, basis was about **3,050** and the purchase date was **2021-03-15**, so the sale is **long-term**. Gain = 5,325 − 3,050 = **2,275 long-term** (digital-asset long-term box, K in the engine's scheme).
- **Why it's wrong:** the engine treated "basis unknown" as zero and the date the coins were moved as the date they were bought. Moving your own coins between wallets is not a purchase. The client's answer arrived on 2026-06-30, after v3 (2026-06-23), and no new computation followed before the client approved the return on 2026-07-10 (msg-09). The return therefore went out on the stale zero-basis version.
- **Evidence:** D35 p1: "C6 BTC 0.05 acquired TRANSFER-IN 2025-06-01 (cost basis unknown) cost  sold 2025-06-18 proceeds 5,325.00". msg-07 (2026-06-30, Erik): "that BTC was bought on another exchange in March 2021 for about 3,050 and moved to Coinhaven in June … a bank statement line showing 3,050 to 'CryptoNorth' on 03/15/2021." The v3 diagnostic DIGITAL_ASSET_BASIS_MISSING says "Engine used zero basis and the transfer-in date."
- **Tax effect (est.):** short-term −5,325 and long-term +2,275. Federal: −5,325 × 0.348 + 2,275 × 0.238 = −1,853 + 541 = **−$1,312**. California: sold 2025-06-18, during California residency, and California taxes all gains alike, so the gain change is −3,050 × 0.064 = **−$195**.
- **How a workpaper should surface it:** an open-item list that links each engine warning to the client's answer. When an answer arrives after the last computation, the item becomes "answered, not applied" and blocks sign-off. The basis evidence (a bank line only, and "about 3,050") needs a preparer's judgement, recorded with the evidence attached.
- **Severity:** medium

### GT-B04: Meridian lot M18 (page 32) never read, in either the original or the corrected 1099
- **Where:** D30 and D31 page 32. `documents[D30|D31].extraction` = partial ("Page 32 ('Additional transactions') was not read"). There is no `F8949.*.M18` line in v1, v2 or v3.
- **Packet says:** 17 Meridian lots, with proceeds of 71,715.
- **Truth:** 18 lots. M18 is Ironwood REIT cash in lieu of a fractional share (6.8 sh): acquired 2025-01-14, sold 2025-12-15, proceeds 250.00, basis 310.00, short-term, noncovered (box B). That is a loss of **−60**.
- **Why it's wrong:** the pipeline skipped the supplemental page. The engine noticed the totals didn't match but went ahead with incomplete lots.
- **Evidence:** D31 p32: "M18 Ironwood REIT (fractional share cash in lieu) 6.8 sh acquired 2025-01-14 sold 2025-12-15 proceeds 250.00 basis 310.00 short-term noncovered." The p1 summary says 71,965.00 and the p10 detail total says 71,715.00. 71,715 + 250 = 71,965 exactly. My parse of every page found 18 printed lots but 17 extracted lots.
- **Tax effect (est.):** −60 short-term. Federal: −60 × 0.348 = **−$21**. California: sold after the move, so not California-source, and the effect is ≈ $0.
- **How a workpaper should surface it:** any document marked "partial" should show its unread pages and block sign-off. A summary-to-detail check should name the gap (250) and point to the unread page, not just report a mismatch.
- **Severity:** low in dollars, but high as a process signal: a "partial" extraction was used as if it were complete, twice.

### GT-B05: 2023 foreign inheritance (Form 3520) left open and never flagged
- **Where:** D36 p1; qa-07; D07 p3 (open items); `prior_years.prior_preparer_workpaper.open_items_left_by_prior_preparer[3]`. The v1–v3 diagnostics contain no 3520 item.
- **Packet says:** nothing in the return or diagnostics. The engine flags only the FBAR (FBAR_OUTSIDE_RETURN).
- **Truth:** the Swedish account came from an inheritance from Erik's mother (a foreign person) in 2023. The balance was about SEK 1.2–1.45 million, roughly $120–150k, which is above the $100,000 Form 3520 threshold. The prior preparer left "2023 Form 3520 … discussed? (no note of resolution)".
- **Why it's wrong:** a possibly unfiled 2023 Form 3520 carries a large penalty risk, and nothing in the pipeline tracks it. qa-08 only asks about 2025 gifts ("No"), which does not answer the 2023 question.
- **Evidence:** D36 p1: "Account opened 09/2023 (inheritance from Birgitta Lindqvist)". qa-07: "Erik's savings account in Sweden (inherited from his mother in 2023)". D07 p3: "2023 Form 3520 (foreign inheritance over 100,000) - discussed? (no note of resolution)".
- **Tax effect (est.):** none on the 2025 return; it is a compliance and penalty exposure for 2023, which I can't compute.
- **How a workpaper should surface it:** carry the prior preparer's open items forward as tracked items, each with an owner and a resolution, and link them to the documents that mention the same fact (D36 "inheritance").
- **Severity:** medium

### Also in my area, logged elsewhere (not double-counted)
- **RSU lots N1, N3, N4 at zero basis (ignoring the D11 supplemental basis of 19,100 / 19,100 / 9,420):** logged as **GT-A01** in
  `01-wages-people-credits.md`, at about −$15,536 federal and −$2,765 California. I confirmed it independently. The
  W-2 (D08) box 14 shows "RSU 38,200.00" = 19,100 + 19,100, which is already taxed as wages. Rule R-8949-LOT says to use the supplemental basis "if matched", and the engine did match the ESPP lot from the same statement (ev-0072 on `F8949.A.N2`) but not the three RSU lots.

---

## Suspicions not confirmed
- **Meridian wash sales the broker missed (M5→M11, M12→M16):** M12 Meadowlark was sold at a 1,640 loss on 2025-08-14, and M16 bought the same stock on 2025-08-20 in the same account with wash 0. M5 Bluewater was sold at a 450 loss on 2025-04-28, and M11 was bought on 2025-05-01. Both replacements were sold within 2025, so the net 2025 effect should be about $0 (the disallowed loss moves into the replacement's basis). To confirm, get the full buy history for account 0458.
- **Brightpath (D74) wash-sale data looks inconsistent:** 27 loss sales have a visible same-security repurchase within 30 days but wash 0 (2,431 of losses), and about 20 lots show a wash amount with no visible replacement. The replacements may still be held, so I can't judge without the full trade history. There is no cross-account wash with Meridian or Northlake, because no security names overlap (checked).
- **Foreign tax credit taken without Form 1116 (`Sch3.1`, 396, R-FTC-DE-MINIMIS):** the de minimis route requires all foreign income to be reported on payee statements (1099 or K-1). The Swedish interest (about 1,871) comes from a foreign bank statement, so Form 1116 may be required. The credit probably stays at 396. To confirm, compute the Form 1116 limitation.
- **California capital-loss carryover prorated by days:** the engine counts 14,200 of 2024 carryover × 195/365 in column E (California). 2024 was a full-year California resident year (2024 CA Form 540), so the full carryover may belong to California, which would be about 6,614 more California loss and about −$423 California tax. To confirm, check the FTB 540NR carryover instructions.
- **Swedish interest credited on 12/31/2025, when Erik lived in Texas:** the engine counts 195/365 of all interest as California-source. If interest is sourced to the residency period on the day it is received, the Sparbanken interest is 0% California (≈ −$64 California). To confirm, check California's part-year accrual rule for interest.
- **Schedule S credit for Oregon tax (`ScheduleS.credit` 844 = 1,580 × 195/365):** I don't see it limited to California's tax on the same income (about 18,400 × 195/365 × 0.0766 ≈ 753). It may be overstated by about $91. To confirm, apply the Schedule S limitation.
- **S corporation basis starts from a client worksheet:** the 2022 ending basis of 21,300 is "client worksheet in prior preparer file" (basis_records) and is unverified. The v3 roll-forward math is right, but the whole 21,215 excess-distribution gain depends on that starting figure. To confirm, get the 2022 K-1 or the S corporation's basis records.
- **Ridgeline outside basis never computed** (`basis_records.partnership_ridgeline`, outside_basis null). Distributions of 6,000 are far below capital of 60,000, so no gain is likely. To confirm, compute outside basis.
- **IRA basis (other ledger's area):** the 2024 Form 8606 line 14 = 7,000 (D06 p10, D07 p6), yet `carryovers_out.ira_nondeductible_basis_ngozi` = 0 and qa-31 says "Prior basis: none". This should be passed to the retirement owner if it isn't already logged.

## Things the engine already flags (my area), and whether each is right
- **BROKER_SUMMARY_DETAIL_MISMATCH** (v1–v3): right, but incomplete. It doesn't name the cause: lot M18 on the unread page 32, which is exactly 250 (see GT-B04). v2 and v3 still use the partial D31.
- **DIGITAL_ASSET_BASIS_MISSING** (v1–v3): right when raised. It went stale after msg-07 supplied the basis and was never resolved (GT-B03).
- **SCORP_BASIS_INCOMPLETE** (v1, v2): right. It was resolved in v3 by the D40 2023 K-1, and the v3 roll-forward is correct: 21,300 + 14,100 − 20,000 = 15,400 (2023); + 16,900 − 30,000 = 2,300 (2024); + 18,485 = 20,785; − 42,000 → 21,215 taxed as long-term gain (`F7203.excess`, `F8949.F.SCORP`). D40 is in the packet precisely to close this basis gap.
- **K1_EXPECTED_NOT_RECEIVED** (v1, v2): right. It was resolved in v3 by D37 and D38, and the v3 Ridgeline math checks out. Capital: 60,000 + 9,870 − 6,000 − 210 = 63,660. California share: 8,400 × 195/365 + 8,400 × 170/365 × 22% = 4,488 + 861 = 5,348, which equals the v2→v3 change in `SchCA540NR.17.E` (−21,658 → −16,310).
- **QUESTIONNAIRE_SALES_CONFLICT** (v1–v3): right in substance (qa-14 "No" vs the sales). Two small faults: the count of 282 (260 + 17 + 5) misses M18, and it cites only qa-14 for the crypto, though qa-15 ("didn't really sell, just moved things around") is the crypto answer that conflicts with 12 dispositions.
- **FBAR_OUTSIDE_RETURN** (v1–v3): right. The maximum value of SEK 1,452,300 is far above $10,000. D07 says the client filed the FBAR himself for 2024.

Checked and found correct (so the app should not flag them): the corrected Meridian values are used from v2 on (M6 wash
512 not 735, M9 basis 4,880 not 6,900, M14 acquired 2024-09-15 and now long-term). The ESPP lot N2 gain 2,100 = 6,600 − 4,500
(D11 adjusted basis). The capital-loss carryover of 3,200 short / 11,000 long follows from the 2024 figures (−6,200 short, −11,000 long, 3,000 used from short).
All 260 Brightpath lots match their printed values, and the lot sums equal the printed summary. Every lot's short/long term
matches its dates. Form 8938 uses the year-end rate (149,567 maximum, 123,254 at year end, filing required). NIIT = 3.8% × 186,707 = 7,095.
California capital gain `SchCA540NR.7.E` 55,174 = lots sold by 2025-07-14 (49,732.83) + (pass-through, distributions,
carryover and S corporation excess, −11,030 + 21,215) × 195/365. The Oregon composite tax (paid in April 2026) is correctly kept out of 2025 SALT.
