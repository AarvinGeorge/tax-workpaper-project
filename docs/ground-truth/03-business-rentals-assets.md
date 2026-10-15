# Ground truth 03: Schedule C business, rentals, the condo sale, depreciation, prior preparer

Scope: Lindqvist Studio (Erik's one-person business, D14–D27), the two rentals (D46–D53), the depreciation records
(`prior_years.asset_records` and `return_versions[2].assets`), and the prior preparer's file (D06, D07).
Everything below was read from `case-study-project-package/okafor_lindqvist_2025_packet (1).json` on Thu 15 Oct 2026.
The "current return" is v3 (`return_versions[2]`, computed 2026-06-23).

Tax effects use v3 `tax_effect_rates`:
`schc_profit` 0.355 fed / 0.031 CA; `adjustment` −0.31 / −0.042; `ordinary_income` 0.31 / 0.099;
`ca_source_income` 0.000 / 0.064. Each one is an estimate for that finding on its own. The real engine would recompute,
and some fixes interact (see GT-C07).

A few terms used below:
- **Schedule C**: the form for a sole proprietor's business profit. That profit is taxed as income and also carries
  **self-employment (SE) tax**, the self-employed person's Social Security and Medicare tax.
- **Schedule E**: the form for rental income and expenses.
- **Form 1099-NEC / 1099-K**: reports that a client (NEC) or a card processor (K) sends to the IRS showing what it paid
  the business. The IRS matches them against the return.
- **QBI deduction**: a 20% deduction on qualified business income.
- **Passive loss**: a rental loss that may only offset passive income. Losses that are not allowed are "suspended" and
  carried forward.

---

### GT-C01: Schedule C gross receipts count the Paywell 1099-K money twice
- **Where:** D21 (ev-0127), D15 p3 (ev-0109, ev-0110), D17 (ev-0116), D14 (ev-0103). Return line `SchC.1`, rule R-SCHC-GROSS.
- **Packet says:** `SchC.1` = 163,700. Its note says this is "books revenue plus Form 1099-K amounts not matched to a books deposit", so 151,300 + 12,400. The 1099-K read itself is right (12,400.00, conf 0.99).
- **Truth:** 151,300 (the books total). The 12,400 is already inside it.
- **Why it's wrong:** The books record the card payments as deposits. The engine failed to match them, so it added the 1099-K amount on top of the books total. That adds 12,400 of income that was never earned.
- **Evidence:** D15 p3: "Atlas Outdoor Gear paid 41,200.00 in 2025, of which 12,400.00 arrived through Paywell Payments card processing (deposited gross; processing fees booked to Bank and merchant fees) and 28,800.00 by ACH." D21: one payee, 12,400.00 gross. Reconciliation: the five 1099-NECs total 38,500 + 41,200 + 27,900 + 19,800 + 14,600 = 142,000. Add 9,300 from clients who sent no 1099 (ev-0111) and you get 151,300, the books total (ev-0103). The Atlas 1099-NEC (41,200) already includes the card-paid 12,400, so the 1099-K duplicates part of the 1099-NEC. That is also an issuer error: card payments belong on the 1099-K only. The 2028 IRS Letter 566 (`tax_agency_records.notices` N-2025-L566) asks for exactly this: "reconcile to Forms 1099-NEC (142,000) and Form 1099-K (12,400)".
- **Tax effect (est.):** −12,400 × 0.355 = **−$4,402 federal**; −12,400 × 0.031 = **−$384 CA**. The return currently overstates tax by these amounts.
- **How a workpaper should surface it:** Show a gross-receipts reconciliation: every 1099-NEC and 1099-K against books deposits, matched by payer. A 1099-K whose payer-level amount is already inside a 1099-NEC (same customer, same money) gets flagged as a duplicate, not as an unmatched receipt. Keep the reconciliation as the support for the IRS exam.
- **Severity:** high

### GT-C02: The mileage log's May–Aug page was scanned twice, so business miles are 11,800 instead of 8,100
- **Where:** D23 pages 2 and 3; ev-0315 and ev-0404 (both page_total 3,700, conf 0.96); return lines `SchC.44a`, `SchC.9`, `SchC.44c`; rule R-MILEAGE-PAGE-TOTALS.
- **Packet says:** `SchC.44a` = 11,800 miles (2,600 + 3,700 + 3,700 + 1,800). `SchC.9` = 11,800 × 0.70 = 8,260. `SchC.44c` other miles = 5,940.
- **Truth:** 8,100 business miles. Car expense is 8,100 × 0.70 = 5,670. Other (personal) miles are 17,740 − 8,100 = 9,640.
- **Why it's wrong:** Page 3 is a second scan of page 2. The rule adds the total from "every page", so the May–Aug miles count twice.
- **Evidence:** D23 p3 printed_content begins "(Second scan of the May-Aug sheet - same handwriting and coffee stain as page 2.)". Its 22 trips match page 2 trip for trip (script `c_miles2.py`: identical dates, destinations and miles), and its page total is the same 3,700. The page totals do add correctly (p1 20 trips = 2,600; p2 22 = 3,700; p4 18 = 1,800). Odometer readings: 58,960 − 41,220 = 17,740 total miles (ev-0478, ev-0479).
- **Tax effect (est.):** Deduction overstated by 8,260 − 5,670 = 2,590. Fixing it costs +2,590 × 0.355 = **+$919 federal**, +2,590 × 0.031 = **+$80 CA**.
- **How a workpaper should surface it:** Check for duplicate pages: two pages with the same trip lines, or the same date range on two sheets, get flagged before any totals are summed. The mileage view should show business miles as a share of odometer miles (66% as filed, 46% when correct).
- **Severity:** medium

### GT-C03: Self-employed health insurance is deducted although Erik could get coverage through Ngozi's employers
- **Where:** D25 (ev-0484); return line `Sch1.17`, rule R-SEHI; it also flows into `F8995.2.1`. Client answer qa-25.
- **Packet says:** `Sch1.17` = 14,400.
- **Truth:** 0.
- **Why it's wrong:** The self-employed health insurance deduction (a write-off of health premiums for a self-employed person) is not allowed for any month in which the person was eligible for a subsidized plan through a spouse's employer. The client says Erik was eligible all year. The engine's rule only checks the income limit, never eligibility.
- **Evidence:** qa-25: "Yes - both of Ngozi's employers offer family coverage, but Erik kept his own individual plan because he likes his doctors." The prior preparer denied the same deduction in 2024: `prior_years.return_2024.notes.Sch1.17` says "No self-employed health insurance deduction: Erik was covered on Ngozi's employer plan in 2024." D25 shows 1,200 × 12 = 14,400 paid from the business account. Treating it as personal is correct, and v3 already leaves it out of Schedule C expenses (`SchC.28` = 80,646 excludes it).
- **Tax effect (est.):** Removing the adjustment: 14,400 × 0.31 = **+$4,464 federal**, partly offset by a larger QBI deduction (QBI rises by 14,400, so the deduction rises by 2,880; about −$690 at the 24% bracket). Net is about **+$3,770 federal**. California: 14,400 × 0.042 = **+$605 CA**.
- **How a workpaper should surface it:** Make SEHI eligibility a required check before the deduction is allowed. Show the questionnaire answer (qa-25) next to `Sch1.17`, and flag "eligible for employer plan = Yes" against any deduction above zero. Show the prior-year treatment beside it.
- **Severity:** high

### GT-C04: Personal phone, internet and Spotify are deducted in full as business expenses
- **Where:** D15 p1–p2 (ev-0106, ev-0107, ev-0108); return lines `SchC.25` (3,480) and `SchC.27a.1` (6,850); call-01 notes.
- **Packet says:** Telephone 2,160 (100%), internet 1,320 (100%), and software 6,850 including Spotify Family 216.
- **Truth:** Phone 70% × 2,160 = 1,512, and internet 50% × 1,320 = 660, so `SchC.25` = 2,172. Software is 6,850 − 216 = 6,634.
- **Why it's wrong:** The client told the firm what share was personal. v3 was computed 2026-06-23, three months after the call, and still deducts 100%.
- **Evidence:** call-01 (2026-03-26): "Mobile plan covers 4 family lines; Erik estimates his business share is 70%." / "Home internet is shared with the family; business use about 50%." / "Spotify Family in software is personal - booked by mistake." D15 p2: "family mobile plan (4 lines) 180.00 per month … home internet 110.00 per month". Personal amount = 648 + 660 + 216 = 1,524. (Note: 70% of a 4-line family plan is generous. A reviewer should press for the cost of Erik's own line.)
- **Tax effect (est.):** +1,524 × 0.355 = **+$541 federal**; +1,524 × 0.031 = **+$47 CA**.
- **How a workpaper should surface it:** Link each books line to the call notes and messages that mention it. Flag a mixed-use expense (phone, internet, a "Family" subscription) taken at 100% when a client note gives a business percentage.
- **Severity:** medium

### GT-C05: The Fremont Way HVAC replacement is deducted as a repair; it is an improvement to depreciate
- **Where:** D46 p1 (ev-1000, ev-1001), D47 (ev-1004, ev-1005); return lines `SchE.14A` (note: "HVAC 11,000.00 is inside repairs"), `SchE.18A`, `F4562-E.total-A`; qa-37, call-01.
- **Packet says:** `SchE.14A` repairs = 13,300, which includes the 11,000 HVAC job.
- **Truth:** Repairs = 2,300. The 11,000 should be a new building asset: 27.5-year straight-line, mid-month, placed in service August 2025. 2025 depreciation = 11,000 / 27.5 × 4.5/12 = **150**.
- **Why it's wrong:** Replacing a whole heating and cooling system with a new kind of system (furnace and AC replaced by a heat pump) is a betterment and restoration of a building system. Under the IRS repair rules it must be capitalized and depreciated. The small-taxpayer safe harbor allows at most $10,000, and this job is $11,000.
- **Evidence:** D47: "Removed failed 2004 gas furnace and 3-ton AC condenser. Installed new 3-ton heat pump system with air handler, new line set and thermostat. Total 11,000.00 … Permit #B25-31877." call-01: "replaced the whole system with a heat pump (new air handler, line set)". qa-37 calls it "replace the HVAC". The 2022 roof replacement was capitalized as asset SAC-ROOF; that is the same kind of item, treated consistently.
- **Tax effect (est.):** Rental income rises by 11,000 − 150 = 10,850. The loss stays fully allowed (net passive income is still positive, `F8582.4`). Federal: 10,850 × 0.31 = **+$3,364**. California (Sacramento property, fully CA-source): 10,850 × 0.099 = **+$1,074 CA**. That uses `ordinary_income`, which is already CA-source; at the `ca_source_income` rate it would be +$694.
- **How a workpaper should surface it:** Any rental repair over the safe-harbor amount, or any invoice with "replace / install new / permit / system", goes into a repair-vs-improvement review queue. That queue offers a capitalize action, which creates an asset record.
- **Severity:** high

### GT-C06: Bonus depreciation was chosen for the studio equipment; electing Section 179 saves $1,050 in California at no federal cost
- **Where:** D22 (ev-0141..0145); `F4562-C.12`/`.14`, `SchCA540NR.12.C`, `FTB3885A.STU-*`; `what_if.alternatives[id=equipment_section179]`; rule R-EQUIPMENT-METHOD (default 100% special depreciation).
- **Packet says:** Federal 100% special (bonus) depreciation of 38,000. California allows no bonus, so it uses 5-year MACRS at 7,600 (California addition 30,400).
- **Truth:** A Section 179 election gives the same federal deduction (38,000). California honours Section 179 up to 25,000, so California depreciation becomes 27,600 instead of 7,600.
- **Why it's wrong:** This is a missed election, not an arithmetic error. The engine's default ignores that California treats Section 179 and bonus depreciation differently. (Section 179 is an election to expense equipment in the year it is bought; bonus depreciation is a separate first-year write-off.)
- **Evidence:** what_if `equipment_section179`: federal total_tax_change 0; California total_tax_change **−1,050**. FTB3885A becomes 10,314 + 11,839 + 5,447 = 27,600 = 25,000 + 20% × (38,000 − 25,000). `ref:param.ca_section179_limit` = 25,000. Business income easily covers the Section 179 income limit.
- **Tax effect (est.):** **$0 federal / −$1,050 CA** (engine what_if).
- **How a workpaper should surface it:** Present elections as explicit decisions with their what_if result beside them. Flag "default method chosen while an alternative is strictly better", where federal is equal and the state is lower.
- **Severity:** medium

### GT-C07: The SEP contribution exceeds the deductible limit; the excess is carried silently and never flagged
- **Where:** D26 (ev-0485, ev-0486); `Sch1.16`; `return_versions[2].carryovers_out.federal.sep_contribution_not_deductible_for_2025` = 2,786; qa-26.
- **Packet says:** Contribution 18,000. The deduction is limited to 15,214 (that limit math is right for v3 numbers), and 2,786 is carried as "not deductible". No diagnostic is raised.
- **Truth:** 2,786 is a nondeductible excess contribution in v3. After GT-C01, C02 and C04, net profit is about 73,568, so the limit falls to 20% × (73,568 − 5,197) ≈ 13,674 and the excess grows to **≈ 4,326**.
- **Why it's wrong:** A SEP (simplified employee pension, a retirement plan for self-employed people) contribution above the limit can be carried forward and deducted later, but a 10% excise tax on nondeductible contributions applies (Form 5330, IRS Pub 560) unless the excess is withdrawn. The return deducts the capped amount and says nothing about the excess.
- **Evidence:** `Sch1.16` note: "Contribution 18,000.00; limit 20% of (net profit - half SE tax) = 15,214.30." 18,000 − 15,214 = 2,786. Deposited 04/10/2026 (ev-0486). The client sized it from "We plan to put 18,000" (qa-26), not from the computed limit.
- **Tax effect (est.):** Excise tax of 10% × 2,786 = **≈ $279** (≈ $433 on the corrected excess). The SEP deduction also drops by about 1,540 after the other fixes: about +$477 federal at 0.31.
- **How a workpaper should surface it:** Show the SEP limit next to the amount deposited. Any excess becomes an open item that needs a decision (withdraw it, or carry it forward and pay the excise tax) and a client message. Recompute the limit whenever Schedule C changes.
- **Severity:** medium

### GT-C08: The home-office simplified method is applied across two homes
- **Where:** D24 (ev-0481, ev-0482, ev-0483); `SchC.30`; rule R-HOME-OFFICE-SIMPLIFIED; diagnostic HOME_OFFICE_AREA_CHANGE.
- **Packet says:** `SchC.30` = 1,200 ("average 240 sq ft × $5"), blending the Sacramento room (220 sq ft, Jan to mid-July) and the Austin room (260 sq ft, from 07/16).
- **Truth:** The simplified method may be used for only one home in a year (Rev. Proc. 2013-13). Austin alone: 260 × 6 months / 12 × 5 = **650**. Sacramento alone: 220 × 7 / 12 × 5 ≈ **642**. The other home can only be claimed under the regular (actual-expense) method, which needs the Sacramento rent and utilities. Those are not in the packet.
- **Why it's wrong:** The engine averages two homes into one simplified figure, and the rule text has no one-home limit.
- **Evidence:** D24: "Studio room in the Sacramento rental house … used exclusively … January through mid-July. Austin house … used exclusively from 07/16/2025." `household.addresses` shows two homes (rented Sacramento home until 2025-07-14; owned Austin home from 2025-07-15).
- **Tax effect (est.):** If only the Austin room is claimed by the simplified method: +550 × 0.355 = **+$195 federal**, +550 × 0.031 = +$17 CA. An exact figure is not computable until a regular-method figure for Sacramento is chosen; that could also lower the tax.
- **How a workpaper should surface it:** When the home office has more than one address or date range, ask the preparer to choose a method per home, and block simplified on both.
- **Severity:** low

### GT-C09: The prior preparer's open item on Form 3520 (2023 foreign inheritance) was never resolved or carried forward
- **Where:** D07 p3; `prior_years.prior_preparer_workpaper.open_items_left_by_prior_preparer[3]`; D36; qa-07, qa-08.
- **Packet says:** The open item reads "2023 Form 3520 (foreign inheritance over 100,000) - discussed? (no note of resolution)". No v1–v3 diagnostic mentions it. The questionnaire asks only about 2025 gifts (qa-08: "No").
- **Truth:** This is still open. Erik inherited a Swedish account in 2023 (D36: "Account opened 09/2023 (inheritance from Birgitta Lindqvist)"; balance SEK 1,196,800 at year-end 2025; the 2024 Form 8938 shows a maximum of $151,880). If his mother was a nonresident alien, a 2023 Form 3520 was required (the threshold is $100,000). Form 3520 is an information return the IRS requires when a US person receives a large gift or inheritance from a foreign person.
- **Why it's wrong:** The other three open items were resolved in this packet: the 2023 Woodworks K-1 (D40), the 2024 Form 5498 (D42), and the home-office square footage (D24). This one silently dropped off.
- **Evidence:** As quoted above. (The 2023 Woodworks K-1 was found "in my mom's papers" (msg-06). That hints but does not prove her US status, which decides whether Form 3520 applies.)
- **Tax effect (est.):** None on 2025. Penalty exposure for 2023 is 5% per month, up to 25% of the bequest. That is not computable without her residency status and the value at receipt.
- **How a workpaper should surface it:** Import the prior preparer's open items as tracked items with an owner and a resolution field. An item with no resolution stays open on the review dashboard.
- **Severity:** medium

### GT-C10: The 2024 return claimed a 300 sq ft home office; the client's own measurement is 220 sq ft
- **Where:** `prior_years.return_2024.lines.SchC.30` = 1,500 (ev-2953, "simplified, 300 sq ft"); D07 p2 note "Home office 300 sq ft (Sacramento rental house, 2 rooms combined?) - client to confirm"; D24 ev-0481 = 220.
- **Packet says:** 2024 home office 300 sq ft × $5 = 1,500.
- **Truth:** The same Sacramento room measures 11 × 20 = 220 sq ft, so the deduction should have been 1,100.
- **Why it's wrong:** The prior preparer guessed ("2 rooms combined?") and never confirmed. The 2025 diagnostic HOME_OFFICE_AREA_CHANGE notes the difference but treats 2025 as the outlier.
- **Evidence:** As quoted. The difference is 400 of 2024 deduction.
- **Tax effect (est.):** A 2024 overstatement of about $400 deduction (roughly +$140 federal tax at 2025's Schedule C rate). Too small to amend on its own; record it and tell the client.
- **How a workpaper should surface it:** A prior-year comparison should say which year looks wrong, using the source document, rather than only noting that the two years differ.
- **Severity:** low

---

## Checked and found correct (so the app should not flag them)
- D14 P&L: the 15 expense lines sum to 61,466 and income to 151,300. Every extracted value matches what is printed (conf 0.99).
- D15 software detail sums to 6,850 (including the −800 Monotype refund).
- D23: all 82 trip-mile reads match the printed log, and each page's trips add up to its printed total.
- Health insurance (14,400) and books depreciation (7,600) are correctly kept out of Schedule C expenses. Books fuel (3,100) is correctly replaced by standard mileage. Meals at 50% = 1,980.
- SE tax, the SEP formula and the QBI formula are computed correctly on the numbers they were given.
- Rental depreciation recomputes exactly: SAC-BLDG 13,236.36; SAC-ROOF 654.55; AUS-BLDG 7,139.39 (9.5 months to the 10/15 sale); AUS-FLOOR 190. California SAC-APPL 483.84 is the 5th-year 200DB rate (11.52%).
- Condo sale (Form 4797): basis 310,000 + 6,600 + 21,725 + 1,975 = 340,300. Depreciation allowed 49,599.99 + 740 = 50,340 matches the asset records. Gain 105,040. Unrecaptured §1250 gain (depreciation taxed at up to 25% on sale) = 50,340.
- 2024 Form 8582 allocation recomputes to the carryovers (6,300 Fremont / 9,850 Barton). Both are correctly released in 2025: the fully taxable sale frees Barton's losses, and net passive income is positive.
- Fremont property tax 6,240 = 3,080 + 3,160 (both paid in 2025 from escrow) = 1098 box 10. The value is not double-counted even though three sources are cited. Condo taxes 5,544 = the seller's proration credit to the buyer, which the seller may deduct. Condo days rented 273 = Jan–Sep.

## Suspicions not confirmed
- **Atlas 1099-NEC includes card payments (issuer error):** confirmed by D15 p3 as the cause of GT-C01. Asking Atlas for a corrected 1099-NEC (28,800) would remove the IRS mismatch at the source.
- **Travel 4,520 (`SchC.24a`):** there is no detail in D15. It may include the July Sacramento-to-Austin move or personal travel. A travel ledger would confirm.
- **Fremont landlord insurance 1,850 (`SchE.9A`):** sourced only from the client's answer (qa-36), with no policy document. A declarations page would confirm.
- **California source of the condo gain:** the sale (10/15) came after California residency ended (07/14), and the property is in Texas, so none of the 105,040 should be California-source. Line `SchCA540NR.7.E` (55,174) can't be decomposed from the packet. A per-lot California source listing would confirm.
- **Phone business share of 70% of a 4-line family plan:** probably still too high (one line ≈ 25%). A carrier bill per line would confirm.

## Things the engine already flags (in this area)
- **FORM_1099_FILING** (warning, v1–v3): "client paid two contractors 600 or more and has not filed Forms 1099-NEC". **Correct.** Quintero 4,800 and Patel 2,600 were paid by ACH (D27, call-01), and the $600 threshold still applies to 2025 payments. The flag doesn't say what to do: file late 1099-NECs now to limit penalties, collect W-9s, and keep `SchC.J` = "No" until they are filed.
- **HOME_OFFICE_AREA_CHANGE** (info): "average 240 sq ft differs from 2024 (300 sq ft)". **True but incomplete.** It misses the one-home limit (GT-C08) and points the suspicion at the wrong year (GT-C10).
- **Nothing flagged for:** GT-C01 (1099-K double count), C02 (duplicate mileage page), C03 (SEHI eligibility), C04 (personal share from call notes), C05 (HVAC improvement), C06 (Section 179 vs bonus in California), C07 (SEP excess), C09 (Form 3520 open item).
