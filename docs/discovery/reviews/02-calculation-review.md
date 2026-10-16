# Review — Discovery 2: Calculation

Reviewer: Fable 5.1 (independent; 20-year CPA + tax-software designer brief). 16 Oct 2026, 04:06 UTC.
Probes (own scripts, `python3 -I`): `scratchpad/review/calculation/p3_lines.py`, `p4_lots.py`, `p5_bridge_state.py`,
`p6_followups.py`, `p7_grep.py` (FTB/IRS pages fetched with curl into `fetched/`). Packet read-only; document not edited.

## 1. Re-measurement

**Reproduced (p3–p6):** 627 / 221 / 406 / 13 lines; 94 of 97 rules; 19 R-SUM lines need a subtraction; AGI 442 lines /
1,847 sources, 1,560 of 1,831 extracted values from D74 (85.2%); `F1040.37` 531 / 1,909; 0.07 ms per pass; 11 diagnostics /
7 warnings; 295 lots, 28 W / 1 B; D74 net −665.45, summary = lots to the cent; D31 71,715 vs 71,965; box A 212 vs
212.45, D 7,309 vs 7,309.10; 29 lots = 80% of |gain|; top five at positions 1, 3, 4, 288, 295; CA E = D × 195/365 on lines
2, 3, 12, 26; 30,400; carryovers; §1250 50,340; 212,400 vs naive 320,200; both payment gaps; D21 Jan–Jul 7,350; float sums
139615.96000000002 / 195112.56000000003 in extracted-value order (`math.fsum` gives the printed value); 16 `-0.0` line
values (none in `extracted_values`); 0 securities in two accounts; the books bridge (below).

**Differs:**
| Doc claim | My figure |
|---|---|
| 260 + 17 + 12 + 5 "other" lots | = 294. The 295th is `F8949.F.SCORP` (21,215), the only lot with **no source at all** (`sources: []`) |
| recomputed 295/295; holding period 295/295 | 294 have proceeds/basis; 293 have dates. `A.X235` (acq 2024-07-31, sold 2025-07-29) is 2 days short of long-term; a naive 365-day check misfiles it |
| 41 steps deep | 40 by longest path, 15 by shortest; say which |
| 33 in-account wash cases | 34 by my definition (loss lot, same security bought ±30 days, same account) |
| "the 27 mistakes all sit" in line math + targeted re-derivations | No: M1 |

**Bridge reconciliation.** Both authors are right: 89,834 + 12,400 + 14,400 + 3,100 + 7,600 − 38,000 − 8,260 + 1,980 =
**83,054 = `SchC.29`** (7 items); − 1,200 home office = **81,854 = `SchC.31`** (8th) (p6, both exact). Name line 31 and the
7 + 1 split so the two files agree on their face.

**Outside facts.** FTB 3885A instructions, read directly: "the maximum IRC Section 179 expense deduction allowed is
$25,000"; §168(k) listed as a CA difference (https://www.ftb.ca.gov/forms/2024/2024-3885a-instructions.html). Pub 1100:
carryover method as stated; Example 8, stock gain taxed "because you were a California resident when you sold the stock"
(https://www.ftb.ca.gov/forms/misc/1100.html). Schedule CA (540NR): line 2/3 "received while a California resident",
Section B line 3 "businesses conducted while a California resident"
(https://www.ftb.ca.gov/forms/2024/2024-540nr-ca-instructions.html). Pub 550 spouse / IRA / box 1g passages confirmed.
Reg §1.1368-1(b): a distribution is "taken into account on the date the corporation makes the distribution";
§1.1367-1(d)(1): basis adjustments "determined as of the close of the taxable year" (law.cornell.edu). Fact Graph
`LICENSE.md` = public domain / CC0 ("licence unread" resolved); Direct File README says archived (GitHub flag
`archived=false`, last push 2026-06-11); PolicyEngine AGPL-3.0, taxcalc CC0, big.js 7.0.1, decimal.js 10.6.0,
json-logic-js 2.0.5 confirmed. **OTS GPLv2 unverified**: the site names no licence, SourceForge returns 403.

## 2. Findings

### Must-fix

**M1. "Take the engine's number for the 32 statutory rules" misses four logged mistakes** (p6). GT-C07 sits in
`R-SEP-LIMIT` (limit applied, 15,214; the 2,786 excess is in `carryovers_out`, the excise never computed); GT-D05 in
`R-2210` (`F2210.19` = 164 ignores excess SS 3,342); GT-D04 in `R-CA-OSTC` (844 from Oregon composite 1,580); GT-C08 in
`R-HOME-OFFICE-SIMPLIFIED`. Redraw the line: re-derive every rule whose parameters are in `engine_reference.parameters`
or whose inputs are dated facts; take the engine's number only for brackets, AMT and QBI phase-in, and label those lines
*not independently checked*.

**M2. Suspected (a): sound rule, misread evidence.** The 1099-K's 12,400 is already in the books (GT-C01), so its
monthly split says nothing about business-income timing, and "Jan–Jul" includes 16 nonresident days (July alone is
3,100). Pub 1100 also says allocation "must be made in a manner that reflects the actual date of realization", else "a
daily pro rata method": proration is the FTB fallback when dated facts are absent. Restate as: *proration is an
estimate; ask for dated statements (monthly interest/dividend detail, interim P&L) and flag the line until they arrive*.
No dollar effect is computable from the packet.

**M3. Suspected (b): reproduced as engine behaviour; keep it a hypothesis.** `SchCA540NR.7.E` 55,174 = lots sold ≤ 14 Jul
(49,732.83) + (21,215 + 1,350 + 1,820 − 3,200 − 11,000) × 195/365, diff 0 (p6). Two defensible readings beat day
proration: the date of the distribution that breached basis 20,785 (Reg §1.1368-1(b); needs the corporation's
distribution ledger) or year-end determination (§1.1367-1(d)(1), Texas). About 11,334 of CA-source income (≈ 400–725
CA tax at packet rates) rides on it. The 1,820 capital-gain distributions (`SchD.13`) are dated payments prorated the
same way.

### Should-fix

**S1. The 21,215 gain has no evidence chain.** `F8949.F.SCORP` cites nothing; `F7203.1` (2,300) rests on a 2022 client
worksheet, a K-1 that arrived after v3 (D40) and a null 2024 ending basis. The "basis = 0" filter misses it (basis is
`None`); add *no source* as an exception.

**S2. "±1 rounding" is not one tolerance.** The engine sums cents then rounds (212.45 → 212); i8949 lets a filer round
each lot ("round all amounts"), so 160 rounded lots can drift several dollars; CA column E rounds each line. Each
identity needs its own rounding point and tolerance (https://www.irs.gov/instructions/i8949).

**S3. big.js is unnecessary with integer cents.** The only non-integer steps are ratio × cents; `Math.round(cents × 195
/ 365)` is one correctly-rounded division, and a BigInt `mulDiv` handles ties with no dependency. Drop the serverless
anti-tamper re-run too: a one-day take-home with a role switcher and no auth does not need it.

**S4. "Half a day" prices the evaluator, not the value.** Each of the 8 worked identities needs a matching step
(distinct documents, same-money key, payer dedup, lot ↔ supplement), none estimated. Entry 1 restates the engine's own
rule (`F1040.1a` note already says D10 counted once); the useful check is "every W-2 document counted once or declared
a duplicate".

**S5. Missing edge cases.** (i) *Not computed ≠ 0*: CA AMT is not computed (`CA_AMT_NOT_COMPUTED`) in an ISO-exercise
year; the model needs that state. (ii) Four R-SUM lines fit **no** sign assignment (`SchCA540NR.1.D`, `2.D`, `12.D`,
`17.D`, GT-D06); report that as its own state. (iii) All 12 crypto lots take basis from the client's CSV (D35), not the
1099-DA (D34, boxes H/K): a class issue, not just C6. (iv) Partial-share wash sales disallow pro rata.

### Notes

**N1.** Suspected (c) reproduced: 16 `-0.0` line values; `Intl.NumberFormat` prints "-0". Trivial once cents are integers.
**N2.** The 43 / 32 / 19 split is the author's classification; totals (513 + 86 + 28 = 627) match my rule counts,
membership is not reproducible.
**N3.** The 540NR ratio 0.6347 is `F540NR.32 / F540NR.17`, not Schedule CA 22.E / 22.D (0.6278); say which.
