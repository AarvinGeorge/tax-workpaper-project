# Call 5 review — "add the ISO AMT basis gap to the ledger as GT-B06"

Reviewer: Fable 5.1 (independent of the recommending model). Fri 16 Oct 2026, 20:20 UTC (`date -u`). Tier b. All packet claims re-probed with `c5_probe1.py`–`c5_probe3.py` in this folder (run as `python3 -I`, read-only).

## 1. Verdict

**MODIFY.** The facts hold, but this is a carry-forward record the workpaper must create plus an engine limitation the packet discloses three times, not a "confident mistake". Do not add GT-B06; build the carry-forward item (needed anyway) and, if a ledger line is wanted, log the real trace gap on `F6251.2i` instead.

## 2. What the recommendation gets right (all reproduced)

- `F6251.2i` = 40,000 = 1,000 × (52 − 12), rule `R-AMT-ISO`, sources ev-0076…0079 = D12 (L2, probe 1/2). D12 prints grant 03/01/2022, exercise 07/30/2025, 12.00, FMV 52.00, 1,000 shares (L2).
- Year-end hold: qa-06 "She still holds those shares" (L2). No ISO sale anywhere: Corvane appears only in D08, D12, D28; the only Corvane lots on Form 8949 are RSU/ESPP (N1–N4), so the search can find Corvane shares (proven non-zero, probe 2). ISO status kept: exercised 75 days after employment ended 05/16/2025 (D08), inside 3 months (probe 3).
- `carryovers_out` has no ISO/AMT-basis key in v1, v2 or v3 (14 keys each); the same key search finds `minimum_tax_credit_from_2025_amt` 3,871 and `ira_nondeductible_basis_ngozi`, so the zero is provable (L2, probe 3). `basis_records` has no equity-compensation entry either.
- The engine itself anticipates next year for the credit (diagnostic `AMT_CREDIT_CARRYFORWARD`; `planning_reference_2026` "Minimum tax credit … may be usable") but never for the basis the credit rests on. That asymmetry is the strongest part of the case.

## 3. What it misses or gets wrong

1. **It does not fit the packet's own definition of a mistake (L2 beats L4).** README `truth_and_mistakes`: mistakes are wrong `extracted_values` or wrong engine readings/rules, "with high confidence scores" (`docs/packet/readme-verbatim.md` l.21). A missing record has no value and no confidence. README `what_this_is` (l.13): the packet "is pipeline output, not a workpaper"; `basis_records` "Gaps are real gaps" (l.63). The brief (L1, `docs/brief.txt` l.44–53) assigns "carry everything forward", "carryovers, basis by year" to the workpaper. So the gap is a requirement on our app, not an error in theirs. Discovery 8 already classified the identical fact ("Equity-compensation ledger … No record", row 16b, `docs/discovery/08-records-a-cpa-expects.md` l.47) as a data-model gap, not a suspect, while reserving "suspected new items" for S1/S2 which contradict packet evidence. Existing omission entries (GT-B05, GT-C05, GT-D06) each contradict something printed in the packet; this one contradicts nothing.
2. **The California half is a disclosed limitation, elaborated past its value.** "California AMT is not computed" is stated in README `engine_and_recomputing` (l.29), in the line itself (`F540NR.61` rule `R-CA-AMT-NOT-COMPUTED`, note "Not computed by the engine") and in diagnostic `CA_AMT_NOT_COMPUTED`, which even tells the reviewer what to do ("review incentive stock option exercise for California-source allocation") (L2, probe 1). `firm.starter_standards.required_steps` includes "Diagnostics resolved" (L2, probe 2), so the app must already surface it as a blocking open item. The "up to 2,800" is a ceiling (7 % × 40,000, L4): CA regular tax is 19,718 at an effective 7.66 % on 267,822 (`F540NR.36/40`, probe 3), above the 7 % AMT rate, so actual CA AMT is plausibly 0 (hypothesis; no CA AMT parameters in `engine_reference`). And the household is Texas-only from 2026 (`planning_reference_2026`), so a CA AMT basis has little future use (hypothesis: a later sale's gain follows residence; only a disqualifying-disposition wage element stays CA-source per Pub 1004, `docs/discovery/09-…` l.106). This is where the tunnel vision is: a California twin built from an engine limitation the packet confesses three times.
3. **The bigger miss nearby, on the 2025 return itself.** `R-AMT-ISO` applies only to shares "held at year end", yet `F6251.2i` cites D12 only; qa-06, the sole evidence of the hold, is not in its sources. The engine does cite questionnaire answers on seven other lines (qa-22, 23, 29, 35, 36, 39, 41), so the omission is provable (probe 3). The 40,000, the 3,871 AMT and the MTC carryover all rest on an uncited client answer. Ledger file 01 (l.107) already lists this as an unconfirmed suspicion with no entry. That is a GT-D06-type trace gap and belongs in the ledger more than the basis record does.
4. **Carry-forward facts it leaves out:** a qualifying disposition needs a sale after 2026-07-30 (probe 3), a date that passes before the next preparer opens the file on 2027-01-15 (tl-28); and MTC 3,871 moves with every ledger fix (3,722 → 3,700 → 3,871 across versions), so the record must freeze with the finalized version, not v3.
5. "Taxed twice for AMT" is slightly strong: Form 8801 still refunds the credit over time; what is lost without the record is the negative adjustment at sale. Acceptable as plain words.

## 4. Recommendation (plain words) and cost

- **Do not add GT-B06.** A 20-year CPA reading the hand-in will see the README's "not a workpaper" and "CA AMT is not computed" and discount the entry, which weakens the 27 real ones.
- **Build the carry-forward item (needed regardless, ~1–2 h).** One equity-compensation lot from D12 + qa-06: 1,000 sh, regular basis 12,000, AMT basis 52,000, qualifying after 2026-07-30, linked to `F6251.2i` and the MTC 3,871, shown on the Carryovers screen and in the next-year-preparer role. The lot record is already in the agreed data model (discovery 8 §6) and serves GT-A01. One test: the record exists with those values and is visible to that role.
- **Ledger, if anything: a low-severity trace gap, "GT-A09: `F6251.2i` 'held at year end' rests on qa-06, uncited" (~30 min + one test** asserting the app flags the line's condition as unevidenced). Area: wages & stock comp, not investments.
- **California AMT: an open check from the engine's own diagnostic (~0 extra),** blocking "Diagnostics resolved", annotated "100 % CA-source per Pub 1004; ceiling 2,800; likely 0". Close reconciliation-queue items 4/14/17/24 as "carry-forward item + open check", not ledger.
- Cost of GT-B06 as proposed: ~30 min write-up plus a test that can only pass once the carry-forward feature above exists anyway, so it buys nothing the feature test does not, and costs credibility.

Both directions tested: dropping the item entirely would lose a carry-forward record the brief explicitly demands and a role (next year's preparer) depends on; promoting it to a mistake mislabels a requirement on us as an error in them.

## 5. Probes run (trimmed)

```
$ python3 -I c5_probe1.py "<packet>"
carryovers_out v3 federal: capital_loss_short 0, capital_loss_long 0, passive_1450_fremont 0, passive_1200_barton_hills 0,
  minimum_tax_credit_from_2025_amt 3871, charitable 0, section_179 0, ira_nondeductible_basis_ngozi 0, scorp_stock_basis_end 0,
  ridgeline_capital_account_end 63660.0, sep_contribution_not_deductible_for_2025 2786
  california: capital_loss 0, passive 0, depreciation_basis_differences {SAC-APPL 241.92, STU-PRINTER 11360, STU-CAMERA 13040, STU-WORKST 6000}
F6251.2i | Incentive stock options | 40000 | rule R-AMT-ISO | inputs [] | sources ['ev-0079','ev-0078','ev-0077','ev-0076']
F6251.9 63202  F6251.10 59331  F6251.11 3871
F540NR.61 | Alternative minimum tax (Schedule P) | 0 | rule R-CA-AMT-NOT-COMPUTED | note Not computed by the engine - see diagnostics.
diag AMT_CREDIT_CARRYFORWARD (info): "...a minimum tax credit carryforward to 2026 is expected (Form 8801 next year)." refs F6251.11
diag CA_AMT_NOT_COMPUTED (warning): "California AMT (Schedule P 540NR) not computed: review incentive stock option exercise for California-source allocation." refs F6251.2i
'(?i)amt[_ ]basis': 0 hits   '(?i)minimum_tax_credit': 3 hits   '3921': 5 hits   '(?i)disqualifying': 1 hit (D11 ESPP only)

$ python3 -I c5_probe2.py "<packet>"
D12 p1: Form 3921 2025 ... Date option granted 03/01/2022. Date exercised 07/30/2025. Exercise price per share 12.00. FMV ... 52.00. Shares transferred 1,000.
D08 p1: ... Box 15 CA; Box 16 107,100.00 ... Employment ended 05/16/2025.
ev-0076 D12 box2 2025-07-30 (0.99)  ev-0077 box3 12.0  ev-0078 box4 52.0  ev-0079 box5 1000
qa-06: "Yes - RSUs and ESPP at Corvane, and Ngozi exercised her Corvane ISOs in July before the window closed. She still holds those shares."
residency: CA 2025-01-01..07-14 resident; TX 2025-07-15..12-31 resident
'Corvane' in printed content: ['D08','D12','D28']; v3 lines mentioning Corvane: F8949.B.N1, A.N2, B.N3, E.N4 (RSU/ESPP) + F6251.2i
F6251.2i = 40000 in v1, v2, v3; F6251.11 3722 -> 3700 -> 3871; F540NR.61 = 0 in all
what_if ids: equipment_section179, equipment_no_bonus, hvac_improvement, standard_deduction, penalty_annualized (no ISO alternative)
planning_reference_2026.known_2026_changes: [...no CA residency..., "Minimum tax credit from the 2025 AMT may be usable (Form 8801).", ...SEP...]
R-AMT-ISO: "Shares x (FMV at exercise minus exercise price) for incentive stock options exercised and held at year end."
R-CA-AMT-NOT-COMPUTED: "The engine does not compute California AMT."
required_steps includes "Diagnostics resolved"

$ python3 -I c5_probe3.py "<packet>"
F540NR.19 421970 | .31 32328 | .35 267822 | .36 0.0766 | .40 19718 | .61 0 | .64 18874
carryovers_out keys per version: v1 14, v2 14, v3 14; basis/amt-ish keys = [minimum_tax_credit_from_2025_amt, ira_nondeductible_basis_ngozi, scorp_stock_basis_end, california.depreciation_basis_differences]
exercise - termination days: 75 (3 months after 05/16 = 08/16; within)
1 yr from exercise: 2026-07-30 -> qualifying disposition only if sold after 2026-07-30
D28 p3: N1..N4 Corvane RSU/ESPP lots only
v3 lines citing qa-06: []   v3 lines citing any qa-: ['qa-22','qa-23','qa-29','qa-35','qa-36','qa-39','qa-41']
```
