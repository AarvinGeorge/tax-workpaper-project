# Discovery 8 — Records a CPA expects

Written 16 Oct 2026, ~03:50 UTC (clock read with `date -u` this pass). Part 8 of 8 in the section-by-section discovery of the brief's "What it must do".
Every number below was measured from the packet (read-only). The scripts are in the session scratchpad,
`disc/records/r4.py`–`r20.py`, run as `python3 -I`. `r17.py` recomputes the depreciation schedule and includes a
self-test, so a wrong value would fail it. Outside rules are cited inline and listed under **Sources**. Nothing here is a decision yet;
proposals are marked as such. Revised 16 Oct ~04:05 UTC after an independent review (§9).

## 1. What the brief asks

> Records a CPA expects: return summary vs last year, tax computation, area summaries, document index, depreciation by
> asset (method, life, bonus, federal vs California vs AMT, disposals and recapture), sales detail, books to tax,
> rentals and passive losses, K-1 lines, retirement and foreign items, deductions and credits with limits, payments,
> state split, carryovers, basis by year, and what the prior preparer did vs what we changed.

These are the binder's standard pages. In IRS terms each one is a **lead sheet** (one summary page per area, every line
carrying a "Workpaper Reference" to its support), filed under an index (IRM 4.10.9.7.2, 4.10.9.8.2:
https://www.irs.gov/irm/part4/irm_04-010-009). The question for this section is not "can we draw 19 screens". It is
"which of the 19 can be *derived* from the packet, and which need data the packet doesn't hold".

## 2. What the packet actually holds (measured)

Terms used below:
- **Bonus depreciation**: writing off most or all of an asset's cost in its first year.
- **Recapture**: on a sale, part of the gain is taxed at a higher rate because depreciation was claimed earlier.
- **Passive loss**: a rental or investment loss that may only offset passive income. A loss that can't be used yet is *suspended* and carried forward.
- **Basis**: the owner's running tax investment in an asset, which sets the gain or loss when it is sold.

| # | Record | Packet sources (measured) | Complete? | Mistakes it would surface |
|---|---|---|---|---|
| 1 | Return summary vs last year | v3 `summary` (6 federal + 6 CA totals). `return_2024.lines`: 106 lines, each with a `line_sources` value from D06. **87 of 106** 2024 keys match a v3 key. 19 don't, including all 11 `CA540.*` lines (2024 was a resident CA 540; 2025 is a 540NR) | Partial. The key match breaks across the CA form change. `F1040.12` is the standard deduction in 2024 (29,200) and itemized in 2025 (85,706) under the same key | Swings over 25% and $2,500 (32 lines) include `SchE.14A` repairs +241% (**GT-C05**), `SchC.44a` miles +59% (**GT-C02**), `SchC.1` +27% (**GT-C01**) |
| 2 | Tax computation | `F1040` 31 lines; `F1040.16` = 59,727 via `R-TAX-SCHD-WORKSHEET`; `F6251` 11 lines; `Sch2`/`F8959`/`F8960`; brackets in `engine_reference` | Partial. The Schedule D tax worksheet itself isn't in the packet; only its result is | GT-D05 (penalty), via `F2210` |
| 3 | Area summaries | No area tag on any line. The only area list is `firm.budget_hours`: 9 areas (wages & stock comp, investments, business, rentals & sale, pass-throughs & basis, deductions & credits, California, …) | **No.** Must be built: map 34 form codes to the 9 areas | All 27 GT, grouped by area |
| 4 | Document index | 74 documents, 50 document types; v3 `documents_used` 71, `documents_superseded` [D30] | Yes (see Discovery 1) | GT-A01, A02, B04, C05, D02 (unused documents) |
| 5 | Depreciation by asset | v3 `assets`: 9 assets with federal, CA and AMT columns, method, life, `disposition`. `prior_years.asset_records`: 6, by year. **33 recomputations, 0 mismatches** (`r17.py`) | Mostly. Missing: **acquisition / binding-contract date** (only placed in service), convention as its own field, bonus %, §179 amount, business-use %, class rationale. `amt_difference` is `{}` on all 6 prior records. No California AMT book (`F540NR.61` = 0, "Not computed by the engine"). Fremont land split rests only on D07 (see §7) | GT-C05 (heat pump missing as an asset), GT-C06 (§179 vs bonus, CA); suspected **S2** (flooring class) |
| 6 | Sales detail | `F8949` 302 lines (A 120, B 3, D 161, E 2, F 2, H 8, K 6); `SchD` 16; brokerage and crypto docs D28/D31/D74/D34/D35 hold 2,135 values, 1,756 used | Yes, at lot level | GT-A01 (RSU lots at $0 basis, boxes B/E), GT-B03 (crypto lot), GT-B04 (lot M18 never read) |
| 7 | Books to tax | D14 P&L (20 values, 13 used), D15, D27; `SchC` 26 lines | **No reconciliation exists.** It can be derived: books net 89,834 + 12,400 Paywell + 14,400 health insurance moved out + 3,100 fuel + 7,600 book depreciation − 38,000 tax depreciation − 8,260 mileage + 1,980 meals at 50% = **83,054 = `SchC.29` exactly**; minus 1,200 home office = 81,854. **But the tie is only real if every reconciling item has a tax authority.** Six do (SEHI → Sch 1; §274 meals; standard mileage replaces actual costs; tax vs book depreciation; home office). The 12,400 has none: books already include it (D15), so it is an unlabelled plug | **GT-C01 only**, and only if items without an authority show as *unexplained*. GT-C04 is invisible here: books and tax both carry phone/internet 3,480 at 100% (`r18.py`). GT-C02 needs the mileage-log page recount. GT-C08 sits below line 29 |
| 8 | Rentals and passive losses | `SchE` 29, `F4562-E` 2, `F8582` 5, `F4797` 11; rental docs D46–D53 hold 27 values, 23 used; 2024 `F8582` with per-property unallowed losses | Yes for federal. **No CA passive record** (FTB 3801 equivalent) | GT-C05; suspected new item S1 (§7) |
| 9 | K-1 lines | D37–D40: 23 values, 14 used by v3 lines. Unused: Ridgeline distributions 6,000, beginning and ending capital, Woodworks ownership 20% | Yes for income lines; capital and distribution lines feed only `carryovers_out` | GT-D04 (Oregon composite tax → Schedule S) |
| 10 | Retirement | `F8606` 14, `F8889` 6, `Sch1.16` SEP; docs D26, D41–D45: 13 values, 8 used | Yes | GT-C07 (SEP over limit; `carryovers_out` even holds 2,786 non-deductible) |
| 11 | Foreign items | `SchB.7a/7b`, `F8938` 3 lines (year-end SEK rate), `Sch3.1` foreign tax credit 396 with no Form 1116, diagnostic `FBAR_OUTSIDE_RETURN` | **No record for FBAR or Form 3520** | GT-B02 (FX year), **GT-B05** (2023 Form 3520 dropped) |
| 12 | Deductions and credits with limits | `SchA` 13, `F8283` 2, `F8812` 8, `F8863` 3, `F2441` 6, `Sch3`. 8 of 97 engine rules state a limit, cap or phase-out | Partial: limits live in rule text and parameters, not as "amount before limit / limit / allowed" | GT-D01, D02, D03, A06/C03, A07, A08 |
| 13 | Payments | `F1040.25d/26`, `Sch3.10` (36,000 extension payment, sourced to a timeline event), `Sch3.11`; `F540NR.71–73`; IRS transcript (2 snapshots), FTB account; D67/D68: 24 values, 22 used | Yes. Three independent sources per payment (confirmation, agency record, return) | **GT-A03** (FTB shows the 09/15 payment held as a 2024 credit), **GT-A04** (transcript Q4 3,000 vs 4,000) |
| 14 | State split | `SchCA540NR` 30 lines (columns A 7, B 2, C 2, D 9, E 9), `F540NR` 19, `FTB3885A` 4, `ScheduleS` 1; residency CA to 07-14, TX from 07-15; `ca_resident_days` 195 | Yes. Income lines are sourced by days, not by date received (wrong for wages: GT-A02). For the suspended Austin loss (9,850), proration by days matches FTB 3801's part-year rule (as-if-resident × resident days + as-if-nonresident × nonresident days) | GT-A02, D04, D06 |
| 15 | Carryovers | In: 10 federal keys + CA block. Out: 11 federal keys + CA (capital, passive, 4 asset basis differences totalling 30,641.92) | Partial. In and out use **different key sets**. Out adds minimum tax credit 3,871, S corp basis, Ridgeline capital, SEP excess. Out drops NOL, foreign tax credit, QBI loss, §1231. No CA minimum tax credit (CA AMT not computed) | GT-C07 (via the SEP key) |
| 16 | Basis by year | `basis_records`: S corp 3 years (2023 and 2024 ending basis **null**), Ridgeline outside basis **null**, IRA basis 7,000, home price 685,000; `F7203` 9 lines roll it forward | **Gaps by design**: 2 null S corp years filled in v3 via D40; Ridgeline outside basis never computed. Equity-compensation basis is not here at all (row 16b) | GT-B05 context; S corp gap resolved (not a mistake) |
| 16b | Equity-compensation ledger (added after review) | D11 (RSU and ESPP adjusted basis), D12 Form 3921 (1,000 ISO shares, exercised 07/30/2025 at 12, FMV 52), D13 Form 3922 (ESPP), qa-06 ("She still holds those shares"); `F6251.2i` 40,000; `F8949` RSU/ESPP lots | **No record.** ISO shares carry two bases (regular 12,000, AMT 52,000). Form 6251 line 2i says to increase AMT basis (https://www.irs.gov/instructions/i6251). Holding dates decide a qualifying disposition (after 07/30/2026). The 3,871 minimum tax credit (row 15) comes from the same exercise. Derived (`r18.py`): dropping the 40,000 ISO cuts the tentative minimum tax by ≥ 10,400 (26%), from 63,598 to ≤ 53,198. That is below the regular tax of 59,331, so AMT from exclusion items is 0 and all 3,871 is caused by deferral items, which makes it creditable (https://www.irs.gov/instructions/i8801) | **GT-A01** (3 RSU lots at $0 basis vs D11 19,100 / 19,100 / 9,420). The ESPP lot is right: basis 3,825 with a −675 adjustment, so gain = 6,600 − 4,500 |
| 17 | Prior preparer vs what we changed | `return_2024` (106 lines, 3 notes, 2 K-1 summaries); `prior_preparer_workpaper` (5 notes, 4 open items); v3 `changes_from_previous` (89) is **version-to-version, not vs the prior preparer** | Partial. "What we changed" against the prior preparer's *methods* has no record. One position to record as *kept*: the 2024 F8582 allocation reproduces exactly (16,150 × 15,974 / 40,950 = 6,300) | **GT-A06/C03** (2024 note: "Erik was covered on Ngozi's employer plan"), **GT-C10** (300 sq ft), **GT-B05/C09** (open item dropped) |

Two more rows the brief lists, folded in above: "disposals and recapture" is part of row 5/8, and "K-1 lines" includes the 2023 K-1 (D40) used only for basis.

## 3. The headline insight: the records *are* the checks

Built honestly, each record is a reconciliation. A reconciliation with an unexplained difference finds mistakes on its own:

- **Books to tax** ties to `SchC.29` to the dollar with 7 reconciling items. But one of them is the double-counted 12,400 (GT-C01). A bridge that accepts any labelled plug "ties" *because of* the error. It catches GT-C01 only if each item must cite a tax authority and the 12,400 (which has none) shows as *unexplained*. It does not catch C02, C04 or C08. The packet has no such record; the engine never shows it.
- **Summary vs last year** with a set threshold (AU-C 520 style, per the research report) shows heat-pump repairs at +241% and mileage at +59% before anyone opens a document.
- **Payments** is three-way: confirmation, agency record, return line. Two of the three disagree for GT-A03 and GT-A04.
- **Prior preparer vs us** shows the 2024 note that contradicts this year's health-insurance deduction (GT-A06).
- **Depreciation by asset** recomputes cleanly (33/33) and so reads as "clean". But it can't show what is *missing*: the heat pump that should be a tenth asset (GT-C05). An asset register needs a check for "improvement-sized repairs" the same way the document index needs "unexplained".

**Implication (proposal):** model each record as a *reconciliation* (left side, right side, reconciling items, unexplained remainder), not as a report. Each reconciling item must name its **authority**, M-1 style: timing (depreciation), permanent (§274 meals), reclass (SEHI → Sch 1), method substitution (standard mileage), or a document link. An item without one counts toward the unexplained remainder. A remainder that isn't zero is an open check.

## 4. What each role needs from these records (domain view)

- **Preparer:** each record built automatically from lines, with every cell clickable to its source; reconciling items they can label ("health insurance → Sch 1"); a to-do list of non-zero remainders.
- **Reviewer / partner:** the summary vs last year first, then exceptions: swings without explanation, remainders, depreciation with federal ≠ CA ≠ AMT, carryover keys that appear or vanish. Reviewers work from exceptions first (research report; https://www.irs.gov/irm/part4/irm_04-010-009 on lead sheets).
- **Client:** a plain summary vs last year and the payments record ("what you paid, what the IRS/FTB shows"). No staff reconciliations.
- **Firm administrator:** the area list (the 9 budget areas) is firm-wide configuration, the same across clients, so records and time budgets line up.
- **Next year's preparer:** carryovers, basis by year and the asset register *out* of 2025, each with provenance. 2026 is TX-only for wages, but the Sacramento rental keeps California filing alive. CA basis differences (30,641.92) must survive.
- **IRS examiner, years later:** the frozen record set as filed. Letter 566 (D72) examines 2025, so the depreciation, sale (Form 4797) and basis records are what an exam asks for. Basis must show "allowed or allowable" depreciation (Form 4797 instructions, line 22: https://www.irs.gov/instructions/i4797).

## 5. Edge cases

**Obvious (the packet has each one):**
1. **Mid-year disposal.** The condo was sold 10/15/2025, so the last year gets 9.5 months under mid-month. Gain 105,040; unrecaptured §1250 50,340. Straight-line residential property has no ordinary §1250 recapture (https://www.irs.gov/instructions/i4797). `r17.py` confirms both 2025 figures.
2. **Three depreciation books.** CA does not allow federal bonus (§168(k)) and caps §179 at $25,000, phased out above $200,000 (FTB 3885A instructions, https://www.ftb.ca.gov/forms/2025/2025-3885a-instructions.html). The studio equipment shows federal 38,000 vs CA 7,600.
3. **Basis differences that outlive the asset.** SAC-APPL is fully expensed federally in 2021, but 241.92 of CA basis remains.
4. **Passive losses released.** All suspended losses are freed when net passive income is positive or when the entire interest is sold in a fully taxable sale (https://www.irs.gov/instructions/i8582). Both happen here.
5. **Capital loss carryover** keeps its short/long split (3,200 / 11,000) (https://www.irs.gov/instructions/i1040sd).
6. **Prior-year line meaning changes**: standard vs itemized on `F1040.12`; CA 540 → 540NR.
7. **Distributions above S corp basis** become capital gain: 21,215 on `F8949.F.SCORP` (https://www.irs.gov/instructions/i7203).

**Not obvious:**
1. **Acquisition date ≠ placed-in-service date.** 100% bonus needs both acquisition and placed-in-service after 19 Jan 2025 (https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill).
   - Property acquired before 20 Jan 2025 stays under the TCJA rules (40% for 2025).
   - Notice 2026-11 applies the existing written-binding-contract rules (BDO summary: https://www.bdo.com/insights/tax/irs-issues-interim-guidance-on-bonus-depreciation-rules). So the date that matters is the **binding-contract date**.
   - D22's invoice (dated and paid 03/14/2025) is evidence of payment, not of a contract. Eligibility here is very likely but rests on an inference. The asset record has no field for it.
2. **AMT column that is always zero.** All 9 assets show federal AMT difference 0.
   - Federally that is correct: post-1998 residential rental needs no AMT adjustment, and neither does bonus-eligible property with the same basis (https://www.irs.gov/instructions/i6251). It must read "no difference, because…".
   - **California has its own AMT** (Schedule P), which the engine leaves "not computed". There, tangible property on 200DB, such as SAC-APPL, refigures at 150DB. The ISO exercise is a CA AMT adjustment too (line 10) (FTB Schedule P (540NR) instructions, https://www.ftb.ca.gov/forms/2025/2025-540nr-p-instructions.html).
   - The asset needs a fourth book, or an explicit "CA AMT: not computed" state.
3. **Asset class judgment, and a possible mistake (S2, §7).** AUS-FLOOR ("Flooring replaced 09/2022", D51) is on 27.5 years. D50 shows 2025 "make-ready … carpet cleaning" for the unit. Carpeting in a residential rental is 5-year property (https://www.irs.gov/publications/p527), which makes it §1245, not §1250. If it is carpet, the error carries a basis effect and needs a method change; a note alone won't fix it.
4. **State passive carryover diverges from federal.** CA's passive-loss amounts can differ from federal because of depreciation differences (FTB 3801 instructions, https://www.ftb.ca.gov/forms/2025/2025-3801-instructions.html). See S1.
5. **Foreign tax credit without Form 1116** is allowed only if all foreign income is passive, it is reported on a *qualified payee statement* (1099-DIV/INT, K-1 1041, **K-3** 1065/1120-S), and the total is ≤ $600 joint (https://www.irs.gov/instructions/i1116). A K-1 (1065) alone isn't on the list. Here D37 p2 carries a K-3 excerpt, so the election holds. The record should store *why* it qualifies.
6. **Foreign items outside the return.** Form 8938 is converted at the year-end Treasury rate and does **not** replace the FBAR (https://www.irs.gov/instructions/i8938). The FBAR and 2023 Form 3520 need records even though no return line exists (GT-B05).
7. **Digital-asset boxes are new for 2025.** H/K are for a 1099-DA with no basis reported (https://www.irs.gov/instructions/i8949). The sales record must group by box, or the totals won't match the 1099-DA.
8. **Basis with null years.** S corp basis was unknown for 2023–24 until D40 arrived. A basis record needs "unknown, assumed by X" as a state, not a blank.
9. **Carryover keys that appear or vanish** between in and out (NOL, foreign tax credit, QBI loss dropped; minimum tax credit added). Each needs "zero, because…" or it is a gap.

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Record = reconciliation**: (left source, right source, reconciling items [label, amount, **authority**, link], remainder, threshold). An item with no authority counts as unexplained. Books-to-tax, payments, summary vs last year, carryovers and sales totals vs 1099 summaries all fit this shape.
- **Area** as a firm-level list (start from the 9 `budget_hours` areas) with a form-to-area map. Lines inherit their area, so area summaries come for free.
- **Asset** gets the fields the packet lacks: binding-contract / acquisition date, convention, bonus %, §179 amount, business-use %, class and rationale, and land-split evidence. It keeps one depreciation row per (year × book: federal / CA / federal AMT / CA AMT), each holding both *allowed* and *allowable*. A disposition carries the recapture split (§1245 ordinary, unrecaptured §1250).
- **Equity-compensation lot** (grant, vest or exercise, sale; regular basis, AMT basis; W-2 income already included; holding-period dates), feeding Form 8949 and Form 6251. The same lot record also serves the brokerage 1099-B match (GT-A01).
- **Year-over-year line map** keyed by *concept*, not by form key, so `CA540.17` ↔ `F540NR` and standard ↔ itemized compare correctly.
- **Carryforward item** (kind, jurisdiction, amount in, used, amount out, provenance) covering carryovers, basis by year and CA basis differences; "unknown" is a valid value with a note.
- **Prior-preparer position**: each 2024 note or method (home office 300 sq ft, no SEHI, F8582 allocation, FBAR by client) as a record we either *kept* or *changed* with a reason. This is distinct from version changes.

## 7. Questions for Aarvin (only what this section needs)

1. For the first build, which records do we ship as *reconciliations* and which only as plain tables? My pick: books-to-tax, payments and summary vs last year as reconciliations (they surface GT-C01, A03, A04, C05, C02); depreciation and carryovers as tables.
2. Is the 9-area list from `budget_hours` acceptable as the area taxonomy, or do you want the 1040 binder order (wages, interest, …)?

### Suspected new items (not in the ground-truth ledger)

- **S1 — CA passive carryover for 1450 Fremont should differ from federal by an unknown amount; the packet shows them equal (6,300).**
  - **Evidence:** the CA-minus-federal depreciation on SAC-APPL by year is 2021 −3,360 (smaller CA loss), 2022 +1,344, 2023 +806.40, 2024 +483.84 (`r18.py`).
  - **How much reached the suspended balance** depends on which years' losses were suspended and on the F8582 allocation. So the difference lies somewhere in **[−3,360, +2,634.24], sign unknown**.
  - **Strongest evidence:** the packet's own note says "Same as federal except depreciation", yet both figures are 6,300. The 2024 Schedule CA shows only the HSA add-back of 2,400 (ev-3003).
  - **Rule:** FTB 3801 computes CA passive amounts with FTB 3885A depreciation (https://www.ftb.ca.gov/forms/2025/2025-3801-instructions.html).
  - **Status:** a hypothesis; confirming it needs the 2021–2023 FTB 3801 history, which the packet doesn't hold. Severity: low. 2025 CA tax effect: the bound × CA rate gives −$215 to +$169 at the ca_source_income rate (0.064), or −$333 to +$261 at the ordinary rate (0.099). Sign unknown.
- **S2 — AUS-FLOOR (6,600, Austin condo, sold 10/15/2025) is probably carpet, depreciated as 27.5-year property.**
  - **Evidence:** D51 says only "Flooring replaced 09/2022 for 6,600.00". D50 lists 2025 make-ready "paint, carpet cleaning" for the unit.
  - **Rule:** carpeting in a residential rental is 5-year property (Pub 527), which makes it §1245 property.
  - **Basis effect:** basis falls by depreciation "allowed or allowable" (Form 4797 instructions, line 22). Allowable 200DB half-year was 4,699.20 through 2024 plus 380.16 in 2025, against 550 + 190 claimed. So basis is **4,339.36 lower** (`r20.py`).
  - **Character:** the gain on the flooring becomes ordinary §1245 recapture, not unrecaptured §1250.
  - **Without a method change:** the extra gain costs about **+$1,345 federal** (× ordinary 0.31). The California effect is likely nil, because it is Texas property sold during the Texas period. That is not verified.
  - **The fix:** an automatic change to a permissible method on Form 3115, DCN 7 (Rev. Proc. 2022-14 §6.01, named in https://www.irs.gov/instructions/i3115). That gives a §481(a) catch-up of −4,149.20 plus −190.16 more 2025 depreciation, roughly offsetting the extra gain.
  - **Unverified:** whether DCN 7 is available in the year the asset is disposed of, and whether unclaimed 2022 bonus counts as "allowable". I did not open Rev. Proc. 2022-14 or the bonus regulations.
  - **Status:** a hypothesis until the flooring type is confirmed with the client.
- **Land split:** proven for **Austin only** (D51: 310,000 incl. 62,000 land per appraisal district, so the 248,000 building). For **Fremont** the 364,000 / 156,000 split exists only in the prior preparer's schedule (D07 p4). No extracted value equals 364,000, 156,000 or 520,000, and no document states the purchase. The search does find D51's 310,000, so a hit was possible (`r18.py`). 13,236.36 = 364,000 / 27.5 is right only if 364,000 is building-only. If 364,000 were the full price, land has been depreciated since 2019. Land is not depreciable, and cost is split by fair market value or assessed values (https://www.irs.gov/publications/p527). Status: *inferred from the Austin convention, unsupported*. Ask the client for the 2019 closing statement.
- Checked and **not** a mistake: foreign tax credit de minimis (186 from 1099-DIV + 210 from the K-3, both qualified payee statements, ≤ 600), §8938 year-end rate, all prior depreciation arithmetic, the 2024 F8582 allocation (6,299.88 / 9,850.12), the ESPP lot. 100% bonus on the studio equipment is very likely right (see §5, Not obvious 1).

## 8. Handed to other sections

- Tracing a record cell to its document and field → **Evidence** (Discovery 1). Trace gap: `SchC.13` 38,000 and `SchE.18A/B` (`R-CARRY` / `R-RENTAL-LINE`) have empty `sources`. The asset register is their real source.
- Recomputing tax effect of a reconciling item; what-if (§179 election) → **Calculation**.
- Showing what changed since last look, version compare (`changes_from_previous`) → **Change**.
- Swing thresholds, recorded judgments (flooring class, SEHI eligibility, §179 election) → **Judgment**.
- Review notes and sign-offs per record → **People**.
- Freezing records at filing, the exam response pack for Letter 566, next-year rollforward → **Filing and after**.
- Area list and thresholds as firm standards → **Firm**.

## Sources

- IRM 4.10.9, Examination workpapers (lead sheets, index, cross-references, tick marks): https://www.irs.gov/irm/part4/irm_04-010-009
- IRS news, 100% additional first-year depreciation after 19 Jan 2025 (OBBB guidance): https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill
- BDO, IRS interim guidance on bonus depreciation (Notice 2026-11 keeps TCJA rules, incl. written binding contracts, for property acquired before 20 Jan 2025): https://www.bdo.com/insights/tax/irs-issues-interim-guidance-on-bonus-depreciation-rules
- Form 8801 instructions (minimum tax credit only for AMT caused by deferral items): https://www.irs.gov/instructions/i8801
- Form 3115 instructions (DCN 7 = Rev. Proc. 2022-14 §6.01): https://www.irs.gov/instructions/i3115
- FTB Schedule P (540NR) instructions 2025 (CA AMT: ISO line 10, 150DB for other tangible property): https://www.ftb.ca.gov/forms/2025/2025-540nr-p-instructions.html
- IRS Pub 946 (2025), land not depreciable, placed in service, election out, recapture: https://www.irs.gov/publications/p946
- IRS Pub 527, 27.5-year residential rental; appliances/carpeting/furniture 5-year; depreciation reduces basis: https://www.irs.gov/publications/p527
- Form 6251 instructions, line 2l (no AMT adjustment for post-1998 residential rental or bonus-eligible property): https://www.irs.gov/instructions/i6251
- Form 4797 instructions (§1250, unrecaptured §1250, allowed or allowable, §1231 lookback): https://www.irs.gov/instructions/i4797
- Form 8582 instructions ($25,000 allowance and phase-out; release on disposition): https://www.irs.gov/instructions/i8582
- Form 7203 instructions (S corp stock basis, distributions above basis): https://www.irs.gov/instructions/i7203
- Form 1116 instructions (exemption from Form 1116, qualified payee statements): https://www.irs.gov/instructions/i1116
- Form 8938 instructions (thresholds, year-end rate, FBAR still required): https://www.irs.gov/instructions/i8938
- Form 8949 instructions (2025 boxes A–L incl. digital assets): https://www.irs.gov/instructions/i8949
- Schedule D instructions (capital loss limit and carryover worksheet, unrecaptured §1250 worksheet): https://www.irs.gov/instructions/i1040sd
- FTB 3885A instructions 2025 (CA §168(k) nonconformity, §179 $25,000 / $200,000): https://www.ftb.ca.gov/forms/2025/2025-3885a-instructions.html
- FTB 3801 instructions 2025 (CA passive loss may differ from federal; use 3885A amounts): https://www.ftb.ca.gov/forms/2025/2025-3801-instructions.html
- Project research report (AU-C 520 prior-year review, SPbinder lead sheets): `docs/research/reports/US tax workpaper standards and process.md`

## 9. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/08-records-a-cpa-expects-review.md`. Each finding was re-probed (`r18.py`, `r19.py`,
`r20.py`, a one-line F8582 recompute, plus fetches of Form 8801 and 3115 instructions, the BDO summary and FTB Schedule P) before it was accepted.

| Finding | My probe | Change made |
|---|---|---|
| M1 land split proven for Austin only | No extracted value equals 364,000 / 156,000 / 520,000. The only text hit is D07 p4. Control: D51's 310,000 is found | Accepted. §7 now says Austin proven, Fremont inferred and unsupported |
| M2 books-to-tax overstates what it surfaces | Books phone + internet 3,480 = `SchC.25` 3,480 (C04 invisible) | Accepted. Row 7 and §3 say GT-C01 only. Reconciling items now need an authority, or they count as unexplained (§3, §6) |
| M3 S1 bound and sign | By-year differences −3,360 / +1,344 / +806.40 / +483.84 | Accepted. Bound is [−3,360, +2,634.24], sign unknown |
| S-a equity-compensation ledger | D11, D12, D13 and qa-06 read. ESPP lot on `F8949.A.N2` is correct | Accepted. Row 16b added, plus an equity-comp lot in §6 |
| S-b 3,871 is deferral-caused | TMT 63,598 − 10,400 = 53,198 < 59,331. i8801: credit only for AMT from deferral items | Accepted. Derived in row 16b; no longer unverified |
| S-c binding-contract rule | The IRS newsroom page doesn't state it. BDO says Notice 2026-11 applies the TCJA written-binding-contract rules and keeps pre-20-Jan-2025 property on TCJA rules | Accepted, resting on a **secondary** source (BDO). The unverified Schedule F citation is removed. I did not open EisnerAmper or the Notice itself |
| S-d CA AMT | FTB Schedule P (540NR) instructions: ISO on line 10; 150DB for other tangible property. `F540NR.61` = 0, "Not computed" | Accepted. §5 Not obvious 2 and §6 add a CA AMT book |
| S-e AUS-FLOOR carpet (S2) | D50 "carpet cleaning" confirmed. Allowable 200DB 4,699.20 vs 550 (plus 380.16 vs 190 in 2025) | Accepted as hypothesis S2, with +$1,345 federal if no method change and Form 3115 DCN 7 as the fix. Year-of-disposition use of DCN 7 and unclaimed-bonus "allowable" are marked unverified |
| Notes: CA day proration of the 9,850; F8582 kept; SchC.13 / SchE.18 trace gap | F8582 recompute 6,299.88 / 9,850.12 | Added to rows 14 and 17 and to §8 |

Rejected: none. One adjustment: I report S1's tax effect as a range at two CA rates, not a single figure.
