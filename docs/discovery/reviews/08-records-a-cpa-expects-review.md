# Review — Discovery 8, Records a CPA expects

Reviewer: Fable 5.1 (independent; CPA + tax-software lens). Written Fri 16 Oct 2026 04:00 UTC (`date -u`).
Probes: scratchpad `review/records/p0_shape.py`–`p7_rentaldocs.py`, run `python3 -I`, packet read-only. FTB pages
returned 403 to WebFetch; curled into `review/records/fetched/` and grepped. Fetched text treated as data.

## Re-measured

| Author claim | Result |
|---|---|
| Books-to-tax ties to `SchC.29` 83,054 via 7 items incl. Paywell 12,400 | **Reproduced** (p1): books 151,300 − 61,466 = 89,834; `SchC.1` 163,700 = 151,300 + 12,400; `SchC.28` 80,646 = books 61,466 + 30,400 depr. + 5,160 mileage − 14,400 SEHI − 1,980 meals |
| 87 of 106 2024 keys match; 11 `CA540.*`; `F1040.12` std→itemized | **Reproduced** (p2): 87/19; 32 swings >25% and >$2,500; `SchE.14A` +241%, `SchC.44a` +59%, `SchC.1` +27% |
| 33 recomputations, 0 mismatches; missing fields; `amt_difference` `{}` ×6 | **Reproduced** by hand (p3): SL/mid-month 5.5/12, 8.5/12, 3.5/12 first years; 9.5/12 disposal year; SAC-APPL CA 20/32/19.2/11.52/11.52 → 241.92 left. All 6 prior records `amt_difference: {}` |
| S1 carried-in CA passive 6,300 = federal; SAC-APPL 725.76 less CA depreciation; ev-3003 only HSA 2,400 | **Reproduced** as facts (p4); bound and direction wrong — see M3 |
| D22 03/14/2025; D37 p2 K-3; 8938 year-end; D51 310,000 incl. 62,000 land | **Reproduced** (p5, p6); land claim only half-proven — see M1 |
| FTC 396 without 1116 | 186 (D31 1099-DIV box 7) + 210 (D37 K-3) ≤ 600, both on the i1116 qualified-payee list (K-3 1065 listed; K-1 1065 is not): https://www.irs.gov/instructions/i1116 |
| 8938 at year-end Treasury rate, FBAR still due | Confirmed: https://www.irs.gov/instructions/i8938 |

## Must-fix

**M1 — "Land excluded from both buildings" is verified for Austin only.** No packet document states the Fremont purchase
price or land split; `SAC-BLDG cost 364,000 / land 156,000` exists only in the prior preparer's schedule (D07 p4), and no
extracted value anywhere equals 364,000, 156,000 or 520,000 (p7). 13,236.36 = 364,000 / 27.5 exactly, so the record is
right only if 364,000 is building-only (the AUS convention: 248,000 = 310,000 − 62,000). If it were the full price, the
schedule has depreciated land at 5,672/yr since 2019 (~34,000 to date). Rewrite as "Austin proven (D51); Fremont inferred
from convention, unsupported". Pub 946/527 allocation rule: https://www.irs.gov/publications/p527.

**M2 — Books-to-tax overstates what it surfaces.** The tie is real, but GT-C04 is invisible to it (books and tax both
carry phone/internet 3,480 at 100%), GT-C02 shows only via the mileage-log page recount, and GT-C08 sits below line 29.
Keep GT-C01 and drop the other three. More important for the model: the 12,400 "ties" only because the error is labelled
as a reconciling item. A reconciliation that permits unlabelled plugs hides errors; each item must carry a tax authority
(M-1 kind: timing, permanent, §274, §280F, SEHI → Sch 1) or stay "unexplained".

**M3 — S1's bound "at most ~726" is wrong and the sign is unknown.** The CA/federal SAC-APPL difference by year is
2021 −3,360 (CA loss smaller), 2022 +1,344, 2023 +806, 2024 +484 (p3). What reached the suspended balance depends on
which years' losses were suspended and on the F8582 allocation ratio (2024: 16,150 × 15,974 / 40,950 = 6,300, so the
prior preparer's method is correct). Range is −3,360 to +2,634, not ±726. S1 stays a hypothesis; its strongest evidence
is the packet's own note "Same as federal except depreciation" against an identical 6,300. FTB 3801 (fetched) confirms
CA PAL uses 3885A amounts and, for a part-year resident, "as if a California resident for all prior years" then prorated.

## Should-fix

**S-a — Missing record: equity-compensation ledger.** D12: 1,000 ISO shares, 12 → 52, exercised 07/30/2025, still held
(qa-06). AMT basis 52,000 vs regular 12,000 must be carried (Form 6251 line 2i: "Increase your AMT basis…"
https://www.irs.gov/instructions/i6251), with holding-period dates (qualifying disposition after 07/30/2026). ESPP lots
(D13) and RSU lots (GT-A01) belong here too. Row 16 "basis by year" omits all of it.

**S-b — Close "AMT credit 3,871 relates to deferral items".** Exclusion-only AMTI 386,913 (drop the 40,000 ISO) cuts TMT
by ≥ 10,400 to < 53,200, under regular tax 59,331 → AMT on exclusion items 0 → the whole 3,871 is deferral-caused
(Form 8801: credit only for AMT from deferral items, https://www.irs.gov/instructions/i8801). Record as derived.

**S-c — Close "pre-20-Jan-2025 property stays at 40%".** IR-2026-06 / Notice 2026-11 keep Reg. 1.168(k)-2 and move the
acquisition cutoff from 27 Sep 2017 to 19 Jan 2025; a written binding contract on or before 19 Jan 2025 keeps TCJA 40%
for 2025 (https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill;
secondary: https://www.bdo.com/insights/tax/irs-issues-interim-guidance-on-bonus-depreciation-rules,
https://www.eisneramper.com/insights/real-estate/notice-2026-11-confirms-tcja-bonus-depreciation-framework-0126/).
The asset field is "binding-contract date", and D22's invoice date is evidence of payment, not of contract.

**S-d — "AMT column always zero is correct" is federal-only.** California has its own AMT (Schedule P 540NR): the ISO
preference is CA-sourced by workdays grant→exercise (Pub 1100 ex. 43, fetched; FTB Pub 1004), and SAC-APPL on CA 200DB
has a CA-AMT 150DB difference. The engine leaves `F540NR.61` "not computed". The asset needs a fourth book or an explicit
"CA AMT: not computed" state.

**S-e — AUS-FLOOR is probably carpet, and that is a possible new mistake (S2).** D50 prints "make-ready … carpet cleaning"
for the unit (p7). Carpet is 5-year §1245 property (Pub 527 Table 2-1). Under "allowed or allowable", allowable 200DB
through 2024 ≈ 4,699 vs 550 claimed: ~4,149 lower basis, and the gain on it is ordinary §1245 recapture, not unrecaptured
§1250. The fix in a disposition year is Form 3115 (DCN 7), not only "a recorded judgment". Hypothesis; needs the flooring
type confirmed.

## Notes

- Row 14 "by days, not date of receipt": for suspended passive losses the engine's day proration of the Austin 9,850
  matches FTB 3801's part-year rule (as-if-resident × resident days + as-if-nonresident × nonresident days). Say so.
- Row 17: the 2024 F8582 allocation and SchE.22A/B reproduce exactly — a "kept" prior-preparer position worth recording.
- `SchC.13` 38,000 and `SchE.18A/B` are `R-CARRY`/`R-RENTAL-LINE` with empty `sources`; the asset register is the real
  source. Trace gap for the Evidence section.
- Doc's own sources list cites the Schedule F instructions as "unverified"; S-c replaces it.

## Verdicts

- **Books-to-tax tie-out:** reproduced to the dollar; the claim about which mistakes it surfaces must shrink to GT-C01,
  and the design must forbid unlabelled plugs.
- **S1:** valid hypothesis, wrong bound. Keep, re-state as "CA passive carryover should differ from federal by an unknown
  amount in [−3,360, +2,634]; packet lacks 2021–2023 FTB 3801 history".
