# Discovery 2 — Calculation

Written 16 Oct 2026, ~03:50 UTC. Part 2 of 8 in the section-by-section discovery of the brief's "What it must do".
Every number below was measured from the packet (read-only) with scripts in the session scratchpad
(`disc/calculation/c2.py` … `c24.py`, plus the earlier line checker `hunt/d_linecheck.py`, all run as `python3 -I`).
Nothing here is a decision yet; proposals are marked as such. External rules carry a source link; see section 11.
Revised after an independent review, 16 Oct 2026; see section 10.

## 1. What the brief asks

> Show how any number was built. Reconcile figures that should agree. Handle large detail (hundreds of sales, many
> assets) without swamping the review. Take business books to taxable income. Split income between states. Run
> checks that don't trust the engine.

Six jobs: **build-up**, **reconciliation** (two figures that must agree, and every difference explained),
**large detail**, **books to tax**, **state split**, **independent checks**.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| v3 lines | 627; 221 have `inputs` (built from other lines), 406 are leaves built from sources by a rule; 13 hold text, dates or ratios | Two kinds of "how built": a formula over lines, or a rule over documents |
| Rules | 94 used, 97 defined, all as **prose** (e.g. R-QBI = "Form 8995-A computation.") | The rule says *what*, never the arithmetic. It cannot be re-run |
| Operators | R-SUM = "arithmetic combination"; **19 lines only fit if some inputs are subtracted** (e.g. `F1040.11` = 9 − 10, `F540NR.64` = 40 − Schedule S). Two R-CARRY lines combine two inputs (`SchD.10`, `SchCA540NR.12.A`) | The packet does not say which inputs are minus. A checker has to guess |
| Line checker | 148 of 221 formula lines recomputed in each of v1–v3: **0 mismatches**; 73 not modelled. Changing `F1040.11` by +5 gives 5 mismatches (the check can fail) | The arithmetic is sound. Every known mistake is an input or a rule, not a sum |
| Size of a build-up | Balance due `F1040.37` (4,220) sits on **531 lines and 1,909 sources**, 40 links on the longest path (15 on the shortest). AGI: 442 lines, 1,847 sources | A full tree is unreadable. "How was it built" needs levels |
| Sales detail | 295 lot lines on Form 8949; 260 from D74 Brightpath (direct indexing), 17 Meridian, 12 crypto, 5 Corvane stock-plan / Northlake, and 1 S-corp excess-distribution line (`F8949.F.SCORP`, built from `F7203.excess`, with **no document source**). 28 wash-sale (W) codes, 1 basis (B) code | The "hundreds of sales" |
| Where AGI's evidence sits | 1,560 of the 1,831 extracted values under AGI (85%) are D74. D74's 260 lots net **−665.45** on AGI of 445,590 | The bulk of the detail has almost no tax effect |
| Where the risk sits | 29 of 295 lots make up 80% of the absolute gain/loss. The 5 largest all have **zero or no basis**: S-corp excess 21,215 (no basis value at all; it rests on `F7203`), RSU N1 19,240, N3 18,480, N4 15,300, crypto C6 5,325. Four are logged mistakes (GT-A01 ×3, GT-B03); the fifth rests on an unverified 2022 basis figure | Sort by size and filter "basis = 0 **or** missing **or** no source" and the mistakes come first. A filter on `basis == 0` alone misses the S-corp line (`c24.py`) |
| 1099-B tie-outs | D74: lot sums = printed summary to the cent (ST proceeds 139,615.96, LT 195,112.56, wash 1,326.05 / 1,580.24). D31 Meridian: summary 71,965 vs 17 lots 71,715 (GT-B04). 294 lots recomputed (proceeds − basis + adjustment, from line labels) with 0 mismatches; the S-corp line is carried from `F7203.excess`. Box totals = sum of lots. Holding period matches the box 295/295, using a calendar-year test on label dates (a naive 365-day test misfiles `A.X235`, sold 2 days short of a year) | One broker ties, one does not. The tie-out finds the unread page |
| Rounding | Lots in cents, totals in dollars: Box A 212 vs lots 212.45; Box D 7,309 vs 7,309.10. Form 8949 also lets a filer round each lot ([i8949](https://www.irs.gov/instructions/i8949)); CA column E rounds per line | Each identity needs its **own** rounding point and tolerance, not one blanket "±1" |
| Books to tax | D14 books net income 89,834 → 7 items → **83,054 = `SchC.29`** (tentative profit) → 8th item, home office −1,200 → **81,854 = `SchC.31`** (net profit). Both tie to $0 (`c9.py`), but the packet stores the bridge nowhere; only 2 line notes mention it | The bridge must be built by the app |
| State split | Interest, dividends, business and adjustments: CA amount = federal × 195/365 exactly. Capital gains: lots by sale date, the rest by days. Wages: W-2 box 16 | The engine uses days; California asks for dates where they exist and prorates by day only when they don't (section 5) |
| Assets | 9 in v3 (6 carried from prior years); prior accumulated depreciation ties to prior-year records 12/12 (federal and CA); CA addition 30,400 = federal 38,000 − CA 7,600 | Carry-forward ties; the federal/CA difference is one visible number |
| Engine checks | 11 diagnostics in v3 (7 warnings). Two point at a logged mistake (C6 basis; Meridian mismatch); none names the other 25 | The engine's own checks are not enough |
| Firm standard | Adjustments over 1,000 tax effect need partner sign-off; "carryovers agreed to prior year" and "estimated payments agreed to IRS and FTB records" are required steps | Tax effect and reconciliations are firm rules, not extras |

## 3. The headline insight: the bulk is clean, the risk is in a few lines, and the engine hides both

- **Detail volume and risk point in opposite directions.** 85% of AGI's evidence is one 27-page 1099-B worth −665.
  The five biggest lots all have zero or no basis. A reviewer who pages through 295 lots in engine order meets them at
  positions 1, 3, 4, 288 and 295 (`c23.py`). That is easy to miss in the middle of a session. **Proposal:** show detail as a *population*. Show its tie-out first (lots = summary =
  Schedule D), then *exceptions* (zero or missing basis, wash, term vs dates, unmatched to summary, supplement
  ignored), then lots ranked by tax effect. The rest stays one collapsed, tied total. The IRS itself accepts totals: covered lots with no adjustment can be reported in total on Schedule D line 1a/8a, or on an attached
  statement, rather than lot by lot ([i8949, Exceptions 1 and 2](https://www.irs.gov/instructions/i8949)).
- **Reconciliations are where the mistakes become visible.** The books bridge shows "+12,400: 1099-K not matched to
  books". That is GT-C01 as one line asking "why?". The Meridian tie-out leaves 250 unexplained (GT-B04). The bridge has
  no "personal use" item at all, while call notes say phone 70%, internet 50% (GT-C04). An *unexplained difference*
  or a *missing expected item* is the signal.
- **"Doesn't trust the engine" means re-deriving from printed facts, not re-adding sums.** The engine's addition is
  right 148/148. What is wrong is what went in: the tax year on a payment, a date against residency, the basis on a
  supplement, or a statutory rule applied too simply (SEP excess, 2210 withholding, Schedule S, home office). Independent
  checks should restate key figures from dated, printed facts and compare (see 9.1 for where the line sits).

## 4. What each role needs from Calculation (domain view)

- **Preparer:** each line as a short sentence of steps ("38,000 = 14,200 + 16,300 + 7,500, 100% bonus"), not a 40-link
  tree; reconciliation worksheets that fill themselves and leave only differences to explain.
- **Reviewer / partner:** tie-outs first (green, or the amount and reason it is off); exceptions ranked by tax
  effect; adjustments over the firm's 1,000 threshold sent to the partner. Reviews the population, not 295 rows. The
  experienced-reviewer test (AU-C 230, via the research report) is the bar for whether a build-up stands alone.
- **Client:** sees the result and the few items that change it ("your RSU sales were taxed twice"), never lot math.
- **Firm administrator:** sets tolerances, the materiality threshold and which reconciliations are required.
- **Next year's preparer:** ending asset basis, wash-sale basis carried into unsold replacement lots, carryovers
  (federal *and* California, which differ in method) with the computation that produced them.
- **IRS / FTB examiner (years later):** for an examined item (Letter 566), the build-up from printed facts to the
  line with the rule and parameter values *as used in 2026*, frozen with the filed version.

## 5. Edge cases

**Obvious (packet examples):**
1. **Wash sales.** 28 W codes; the disallowed loss moves into the replacement's basis
   ([Pub 550](https://www.irs.gov/publications/p550)). Brokers only report same-CUSIP, same-account washes; the loss
   is still disallowed when they don't report it (Pub 550). GT has two Meridian washes the broker missed.
2. **Basis not reported (RSU, ESPP).** Report the broker's basis and correct with code B in column (g), or the correct
   basis for box B/E ([i8949](https://www.irs.gov/instructions/i8949)). Lots N1/N3/N4 (GT-A01).
3. **Corrected 1099 and summary ≠ detail** (D30 → D31; GT-B04).
4. **Federal vs California depreciation.** CA does not allow federal bonus depreciation, and caps §179 at 25,000
   ([FTB 3885A instr.](https://www.ftb.ca.gov/forms/2024/2024-3885a-instructions.html): "the maximum IRC Section 179
   expense deduction allowed is $25,000"; §168(k) listed as a CA difference; read directly after review).
   `SchCA540NR.12.C` = 30,400; election choice GT-C06.
5. **Rental sale.** §1250 depreciation 50,340 recapture and release of the suspended passive loss (Barton Hills condo).
6. **Carryovers.** Capital loss −3,200 / −11,000; passive 6,300 / 9,850; agreed to the prior year by firm rule.

**Not obvious:**
1. **A sum with no signs.** 19 R-SUM lines subtract something. A future input that legitimately goes negative
   (a loss) can't be told from a wrong sign. Each input's operator must be stored.
2. **Days vs dates in the state split (hypothesis, no dollar effect computable).** Schedule CA (540NR) asks for
   interest and dividends "received while a California resident"
   ([540NR CA instr.](https://www.ftb.ca.gov/forms/2024/2024-540nr-ca-instructions.html)). For pass-through income,
   Pub 1100 says the allocation "must be made in a manner that reflects the actual date of realization", and only
   "in the absence of information" uses "a daily pro rata method" ([FTB Pub 1100](https://www.ftb.ca.gov/forms/misc/1100.html)).
   Carryovers are computed twice (as if always resident, as if always nonresident), then prorated. So day proration is
   the **allowed fallback** when dates are missing, not an error. The packet has no monthly interest, dividend or
   P&L detail. (The D21 1099-K monthly split is no evidence of timing: that money is already in the books, GT-C01.)
   **Proposal:** label the day-prorated lines *estimate*, ask the client for dated statements, and flag them until
   the statements arrive. Lot sale dates and the paystub at the move (GT-A02) are dated facts and are used.
3. **A gain sourced by when it was received (hypothesis; about 11,334 of CA-source income at stake).** The S-corp
   excess distribution (21,215) is treated as gain from a sale of property
   ([IRC §1368(b)(2)](https://www.law.cornell.edu/uscode/text/26/1368)). A distribution "is taken into account on the
   date the corporation makes the distribution" ([Reg. §1.1368-1(b)](https://www.law.cornell.edu/cfr/text/26/1.1368-1)).
   FTB sources stock gains to where the seller lived at the time of sale (Pub 1100; applying it here is my inference).
   The engine prorates by days (21,215 × 195/365 ≈ 11,334 in `SchCA540NR.7.E`). The distribution dates are not in the
   packet, so this cannot be confirmed. Needed: the corporation's distribution ledger. Capital-gain distributions
   (`SchD.13`, 1,820) are dated payments prorated the same way.
4. **One figure, several measures.** `F8949.A.total` = 212 is the gain; its label carries proceeds, basis and
   adjustment. A tie-out must reconcile each measure separately (proceeds to 1099-B, gain to Schedule D).
5. **Rates are local.** `tax_effect_rates` hold only near v3: salt = 0.0 only while SALT stays over the cap;
   SEP/SE-health changes also move QBI, which the rate ignores (packet README). A tax effect is an *estimate* and must
   say so.
6. **Linked calculations.** SEP → SE health → QBI depend on each other through Schedule C and SE tax. A fix to gross
   receipts (GT-C01) moves five forms; the build-up must show the chain, not just the line.
7. **Cross-account wash sales.** IRA and spouse purchases also count (Pub 550). The packet has **no** security held
   in two accounts (0 found; the same test finds 33 in-account cases, so it can fire; the reviewer counts 34 with a slightly different window). Still a check to build.
8. **Moving out of California.** Moving expenses: CA column E is 0 for a move out
   ([540NR CA instr., line 14](https://www.ftb.ca.gov/forms/2024/2024-540nr-ca-instructions.html)), but the move
   still sits in the CA rate computation. The packet has no moving costs and no question about them.
9. **Not computed is not zero.** `F540NR.61` California AMT = 0 with rule R-CA-AMT-NOT-COMPUTED, in a year with an ISO
   exercise. A line needs a *not computed* state that can't be read as 0.
10. **Sums that fit no sign pattern.** Four Schedule CA column D lines (`1.D`, `2.D`, `12.D`, `17.D`) don't equal any
    ± combination of their listed inputs: column B or C is missing from `inputs` (GT-D06). That is its own state:
    *trace incomplete*, separate from *mismatch*.
11. **A whole class drawing basis from the client.** All 12 crypto lots take basis from the client's CSV export (D35),
    not from the 1099-DA (D34) (`c24.py`). That is a class-level evidence issue, not only lot C6 (GT-B03).
12. **Partial wash sales.** When fewer shares are bought back than were sold, only part of the loss is disallowed
    ([IRC §1091(b)](https://www.law.cornell.edu/uscode/text/26/1091)). A lot-level check must handle the split.

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Computation node** per line: its inputs with an explicit operator each (+, −, ×, ÷, min, max, carry), the rule id,
  the parameter values *with their year*, a rounding rule, and a one-line plain explanation. Leaves point to sources
  (Discovery 1).
- **Reconciliation** as its own record: side A, side B, tolerance, reconciling items (each with evidence and tax
  effect), state *tied / explained / unexplained*; unexplained blocks sign-off. First set: books → Schedule C;
  1099-B summary ↔ lots ↔ Schedule D per broker; 1099-NEC/K ↔ gross receipts; W-2 box 1 ↔ box 16 ↔ paystub at
  move; payments ↔ IRS transcript and FTB account; asset roll-forward ↔ prior year; federal ↔ CA column D.
- **Population** for large detail: rollup with its tie-out, exception rules, rank by tax effect, and a recorded
  "tied 260/260 to printed values" in place of 260 ticks.
- **Independent check** record: our recomputation, result (match / mismatch / not modelled + reason), and a
  self-test that proves each check can fail.
- **State allocation** per income item: method (*dated facts* / *source rule* / *day-proration estimate*), the dates
  used, and a flag when a day estimate stands in for dates that exist.
- **Tax effect** stored as *estimate (rate × change)* vs *engine result*, with the category used.

## 7. Questions for Aarvin (only what this section needs)

1. **How deep to recompute:** line math (148) plus targeted re-derivations (the reconciliations above, state split
   from dates, and the four targeted statutory re-derivations in 9.1). Or also model all 73 opaque rules? I recommend
   the first. It reaches the logged mistakes in calculation; the rest (A05, A07, A08, B05, C10) are Evidence and
   Judgment checks.
2. **Default view for large detail:** exceptions and tie-out only, with the full list one click away. OK, or does
   a reviewer need the full list on first view?

## 8. Handed to other sections

- Evidence: leaf sources, verification status per lot ("tied to printed") → Discovery 1 model.
- Change: what-ifs (Section 179, standard deduction) and the effect of a fix across linked lines.
- Judgment: completeness of moving-expense question; SE-health eligibility (GT-A06), heat pump repair vs improvement
  (GT-C05), §179 election (GT-C06).
- People: partner sign-off over the 1,000 tax-effect threshold; review notes on unexplained reconciliations.
- Filing and after: the frozen build-up for the Letter 566 exam; carry wash-sale basis and CA carryovers forward.
- Firm: tolerance and materiality settings.
- Records a CPA expects: depreciation by asset, sales detail, books to tax, state split as printable records.

## 9. Formula book, compute needs and existing tools

### 9.1 Formula book (proposal)

A **formula book** is a machine-readable catalogue of every calculation: one entry per engine rule, plus a list
of **identities**: equalities that must hold across documents and lines. Our checks read the book and re-derive
figures from it. They do not reuse the engine's answer.

**How the 94 rules used in v3 sort** (`c22.py`; my classification, listed in the script):

| Kind | Rules | Lines | Can we re-derive? |
|---|---|---|---|
| Plain arithmetic over inputs or sources (sum, carry, ×rate, min/max, ratio) | 43 | 513 | Yes, exactly |
| Tables, thresholds, multi-step statutory (brackets, SE, AMT, QBI, CTC, 2210, 8582, 8606, depreciation methods) | 32 | 86 | Some are cheap (the line checker already does CA brackets, SALT cap); most we take from the engine |
| Selection, matching or judgment (which payments count, which receipts are unmatched, questionnaire answers, residency sourcing) | 19 | 28 | Not as formulas; as identities over dated facts plus a recorded judgment |

The key finding is that even the "arithmetic" rules hide a **selection step**: *which* W-2s, *which* log pages,
*which* payments, *whether* a supplement matches. Every logged GT mistake sits in a selection, an input or a
too-simple rule. None sits in the arithmetic (148/148 lines tie). So the book's value is in its **preconditions,
identities and missing consequences**, not in its formulas. Four mistakes sit inside rules whose arithmetic is
right but incomplete (see "Where the line sits").

**Shape of an entry (proposal):** `id`, `kind` (arithmetic / table / selection), `applies_to` (line keys or pattern),
`inputs` (each with sign or role), `params` (name, value, **tax year**), `expr` (a small typed expression tree),
`precision` (cents) and `rounding` (where whole dollars apply), `preconditions` (facts that must be true for the
formula to be valid), `identities` (ids), and `fallback` ("engine result; effect = change × rate[category]").
An **identity** holds: left side, right side, tolerance, severity, and the GT ids it catches.

**Worked entries from the packet:**

| # | Entry or identity | Packet check | Catches |
|---|---|---|---|
| 1 | Every W-2 document is counted once **or** declared a duplicate of another; `F1040.1a` = Σ box 1 over the counted ones | 104,600 + 107,800 = 212,400 ✓. A naive Σ of all three = 320,200 (D10 is a photo of D09). The engine already dedupes (its note says so), so the check's value is the declared-duplicate link, not the sum (`c20.py`) | duplicate documents |
| 2 | CA wages `SchCA540NR.1.E` = Σ box 16 for pay **dated in residency**; identity: box 16 ≤ paystub YTD at the move date | 218,400 vs D73 CA wages to 07/15 22,469 | GT-A02 |
| 3 | `R-8949-LOT`: proceeds − basis + adj; preconditions: basis present, non-zero and sourced, or no supplement / client cost exists for the lot | 294/294 recompute; preconditions fail on N1, N3, N4, C6 (basis 0) and SCORP (no basis value, no document source) | GT-A01, GT-B03; flags the unverified S-corp basis |
| 4 | Per broker and term: Σ lot proceeds = printed 1099-B summary; Σ lot gain = 8949 box total = Schedule D line; tolerance set per identity (engine rounds the box total once: 212.45 → 212) | D74 ties to the cent; D31 71,715 vs 71,965 | GT-B04 |
| 5 | Books → Schedule C: books net + 7 typed items = `SchC.29` 83,054; − home office 1,200 = `SchC.31` 81,854; Σ 1099-NEC + 1099-K (deduplicated by payer) ≤ books revenue | Both tie to $0; the +12,400 item has no match evidence; no "personal use" item | GT-C01, GT-C04 |
| 6 | Payments: `F540NR.72` = Σ FTB payments **designated** 2025 (not "dated in a window"); federal estimates = IRS transcript code 670 | 14,000 vs 10,500; 4,000 vs 3,000 | GT-A03, GT-A04 |
| 7 | Interest by payer with a same-money key; foreign amounts × the **2025** rate | Northlake 1,840 twice; SEK at the 2024 rate | GT-B01, GT-B02 |
| 8 | `SchC.44a` = Σ page totals over **distinct** pages; `SchA.5b` = 1098 box 10 − seller credit at closing | 11,800 vs 8,100; D54 credit unused | GT-C02, GT-D02 |

**Where the line sits (revised after review).** "Take the engine's number for the 32 statutory rules" would miss four
logged mistakes, each in a rule whose arithmetic is right but incomplete (`c24.py`):

| Rule | Packet | What a targeted re-derivation adds | Catches |
|---|---|---|---|
| R-SEP-LIMIT (`Sch1.16`) | Limit applied: 15,214 of 18,000; 2,786 sits in `carryovers_out` | The consequence: excise on the excess, never computed | GT-C07 |
| R-2210 / R-2210-REGULAR (`F2210.19` 164) | Excess Social Security 3,342 (`Sch3.11`) not treated as withholding | Re-run the required installments with it as withholding | GT-D05 |
| R-CA-OSTC (`ScheduleS.credit` 844) | Credit from the Oregon composite tax (D39) | Eligibility (reverse-credit state) and the limit | GT-D04 |
| R-HOME-OFFICE-SIMPLIFIED (`SchC.30` 1,200) | Average area across two homes | One-home rule per period | GT-C08 |

The revised line: **re-derive** every rule whose parameters are in `engine_reference.parameters` or whose inputs
are dated facts. That covers the arithmetic class, the identities above, these four, and the cheap statutory ones
(CA brackets, SALT cap, CA ratio, CTC/AOTC phase-outs). **Take the engine's number** only for the federal tax
worksheet, AMT, QBI, SE, 8582 and 8606. Label those lines *not independently checked*. Any change is priced as
change × `tax_effect_rates`, labelled *estimate*, as the packet README says. We still never build a tax engine.

### 9.2 Compute needs (measured, `c20.py`, `c21.py`)

- Packet 1.94 MB; 3,012 values; 74 documents / 199 pages; 625 / 625 / 627 lines in v1–v3; 295 lots on Form 8949.
  D74 has 260 lots and 1,826 values; D30 and D31 have 17 lots and 159 values each. 9 assets in v3 (6 carried).
- Python parses the packet in 7 ms. One full pass over all 627 lines in dependency order takes about **0.08 ms**
  (1,000 passes in 0.076 s). Identities over 3,012 values add milliseconds. Recomputing everything on every change
  is trivially cheap.
- **Recommendation:** run in the **browser**, for instant feedback and what-ifs, and run the same module in the
  test suite. (A server-side anti-tamper re-run was dropped after review: out of scope for a one-day take-home
  with a role switcher and no authentication.)
- **Exact arithmetic is required, not optional.** Adding D74's short-term lot proceeds in floating point gives
  139,615.96**000000002**; the printed summary is 139,615.96. A float equality tie-out would report a **false
  mismatch** on a document that actually ties. Long-term does the same (195,112.56000000003). The packet also holds
  16 lot values stored as `-0.0`, which display as "−0". **Proposal:** convert every money value to integer cents on
  load (integer sums are exact well past any household's amounts). The only non-integer steps are ratio × cents
  (195/365, the 540NR ratio 0.6347 = `F540NR.32` / `F540NR.17` as 6347/10000, × rates). Do each as **one integer
  multiply and one correctly rounded division**, using a small BigInt `mulDiv` with a stated tie rule (half-up). No
  decimal library is needed. Each rounding point is written in the formula book.

### 9.3 Existing tools (fetched 16 Oct 2026)

| Option | Maturity / licence / last release | Fit | Risk | What it would replace |
|---|---|---|---|---|
| IRS **Fact Graph** ([repo](https://github.com/IRS-Public/fact-graph)) | Scala + Scala.js; GitHub API: `LICENSE.md`: US public domain plus **CC0 1.0** (read directly); last push 2026-09-01; README: "production-ready", but IRS does "not endorse, maintain, or guarantee". Direct File repo README says archived, TY2024, federal only ([direct-file](https://github.com/IRS-Public/direct-file)) | Right *idea*: a declarative graph of facts that runs in the browser | Scala toolchain, no 540NR, no packet mapping. Days of work | Our formula book and evaluator |
| **PolicyEngine-US** ([GitHub](https://github.com/PolicyEngine/policyengine-us), [PyPI](https://pypi.org/project/policyengine-us/)) | Python ≥3.11; **AGPL-3.0**; v2.43.0, 16 Oct 2026; "federal and state tax-benefit microsimulation" | An outside oracle for statutory lines | AGPL; Python server; microsimulation inputs, not return lines; part-year CA support **unverified** | The engine (which the brief says we don't need) |
| **PSL Tax-Calculator** ([PyPI](https://pypi.org/project/taxcalc/)) | Python ≥3.12; CC0; v6.8.4, 1 Oct 2026; "federal income and payroll taxes" microsimulation | Same as above, federal only | No state; policy model | The engine |
| **Open Tax Solver** ([site](https://opentaxsolver.sourceforge.net/), [SourceForge](https://sourceforge.net/projects/opentaxsolver/)) | C, **GPLv2** (SourceForge project page, read by me; the reviewer got 403), updated 2026-09-27, TY2025; 1040 and Schedules A–D, "several states" | Text-file solver | GPL; no 540NR named; no Schedule E / 8949 named | The engine |
| **json-logic-js** ([GitHub](https://github.com/jwadhams/json-logic-js)) | MIT; v2.0.5, 9 Jul 2024 (npm registry) | Serialisable rules | Untyped, float math, no trace of steps, no tolerance concept | Our expression format only |
| **Own typed formula DSL** (TypeScript) | Ours | Exactly the ops we need (signed sum, ×, ÷, min, max, round, param, bracket), records each step for "show how built" | We maintain it; must stay small | — |
| **big.js** / **decimal.js** ([decimal.js](https://github.com/MikeMcl/decimal.js)) | MIT; big.js 7.0.1 (Apr 2025), decimal.js 10.6.0 (Jul 2025) (npm registry). decimal.js is "significantly larger" than big.js | **Not needed** after review: integer cents plus one BigInt division covers every step | A dependency for no gain | — |

**Recommendation:** an **own small typed formula book in TypeScript**: entries as JSON, a typed AST with about
8 operators, integer cents and a BigInt `mulDiv`. It runs in the browser and in tests. **Cost (re-priced after
review):** the evaluator and the line-math port of `d_linecheck.py` take about 3 hours. The matching steps the
identities need are the real work: distinct documents, same-money keys, payer dedup, lot ↔ supplement, payment tax
year. Those take about 4–5 hours for all 8 identities plus the 4 targeted re-derivations, so roughly a full day in
all. For the deadline: build the 1099-B tie-out, the books bridge, payments and lot preconditions first (about half a
day), and add the rest in later rounds. It replaces nothing we would otherwise buy; it only formalises the checker
we already proved. Take
Fact Graph's idea (facts as a declarative graph), not its code. Leave PolicyEngine, Tax-Calculator and OTS out:
each re-runs the engine, which the brief rules out of scope, and each brings a licence or language cost.

## 10. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/02-calculation-review.md`. I checked each finding with my own probe (`c24.py`, plus
curl reads of FTB 3885A, Pub 1100, Reg. §1.1368-1, §1091 and the Fact Graph licence) before applying it.

- **M1, accepted.** I confirmed `Sch1.16` 15,214 with the 2,786 excess in `carryovers_out`, `F2210.19` 164 alongside
  `Sch3.11` 3,342, `ScheduleS.credit` 844 from ev-0982, and `SchC.30` 1,200. The line is redrawn in 9.1: targeted
  re-derivations for these four rules; engine-only lines labelled *not independently checked*. The Q1 claim is fixed.
  (Two of the four, R-SEP-LIMIT and R-HOME-OFFICE-SIMPLIFIED, were in my *arithmetic* class. Re-deriving their
  arithmetic would still have missed the mistakes, which is the point.)
- **M2 / suspected (a), accepted as a hypothesis.** Pub 1100's daily pro rata fallback is confirmed. The 1099-K
  monthly split is withdrawn as evidence. One nuance kept: that Pub 1100 sentence is in the pass-through section.
  For interest and dividends the Schedule CA instruction is "received while a California resident", so day
  proration is still an *estimate* pending dated statements, not an error.
- **M3 / suspected (b), accepted as a hypothesis**, with about 11,334 at stake and Reg. §1.1368-1(b) cited. I did not
  re-open §1.1367-1(d)(1) (the year-end reading).
- **S1, accepted with a correction.** `F8949.F.SCORP` has `sources: []` and no extracted basis. It is not entirely
  without a chain, though: its input is `F7203.excess`. The lot count is now 260 + 17 + 12 + 5 + 1, and the
  exception filter catches basis 0, missing basis and no source.
- **S2, accepted.** Tolerance is now per identity.
- **S3, accepted.** big.js dropped; integer cents plus a BigInt `mulDiv`; serverless anti-tamper dropped.
- **S4, accepted.** Re-priced to about a full day, with a half-day first cut; entry 1 reframed as "counted once or
  declared a duplicate".
- **S5, accepted.** Edge cases 9–12 added. I verified the 12/12 crypto basis from D35 and the 4 column-D lines
  (my checker logs them as LINEAGE). The partial-wash rule is cited to §1091(b).
- **Re-measurement notes.** Depth is now stated as 40 links (longest path), 15 (shortest). The holding-period test
  is stated as calendar-year on label dates, so A.X235 is handled. Kept 33 in-account wash cases by my definition,
  noting the reviewer's 34.
- **Rejected or kept:** OTS GPLv2 is kept. I read it on the SourceForge project page myself ("GNU General Public
  License version 2.0"); the reviewer's 403 was an access failure, not contrary evidence.
- **N1–N3:** `-0.0` handled by integer cents. The 43 / 32 / 19 classification lists its members in `c22.py`, so it
  is reproducible from that file. The 540NR ratio is now named as `F540NR.32 / F540NR.17`.

## 11. Sources

- IRS, Instructions for Form 8949 (Exceptions 1 and 2; codes B and W) — https://www.irs.gov/instructions/i8949 (opened)
- IRS, Publication 550 (wash sales: Form 1099-B box 1g scope; spouse and IRA purchases; basis carry) —
  https://www.irs.gov/publications/p550 (opened)
- 26 U.S.C. §1368(b)(2), S-corp distributions in excess of basis — https://www.law.cornell.edu/uscode/text/26/1368 (opened)
- FTB Pub. 1100 (rev. 10/2024), part-year carryover and suspended-loss method; intangible installment gains —
  https://www.ftb.ca.gov/forms/misc/1100.html (opened)
- FTB 2024 Schedule CA (540NR) instructions (lines 2, 3, 7, 14) —
  https://www.ftb.ca.gov/forms/2024/2024-540nr-ca-instructions.html (opened)
- FTB 2024 Form 3885A instructions (§179 cap 25,000; §168(k) difference) —
  https://www.ftb.ca.gov/forms/2024/2024-3885a-instructions.html (read directly with curl after review: §179 cap 25,000; §168(k) listed)
- AICPA SSTS (rev. 2024), reliance-on-tools standard —
  https://www.aicpa-cima.com/resources/download/revised-statements-on-standards-for-tax-services-no-1-4-1-1-2024
  (opened: the page confirms a reliance-on-tools standard exists; exact wording **unverified**, taken from the research report)
- AU-C 230 experienced-auditor test — via `docs/research/reports/US tax workpaper standards and process.md` (not re-opened)
- IRS Fact Graph — https://github.com/IRS-Public/fact-graph and https://raw.githubusercontent.com/IRS-Public/fact-graph/main/LICENSE.md (opened; CC0)
- 26 CFR §1.1368-1(b), date a distribution is taken into account — https://www.law.cornell.edu/cfr/text/26/1.1368-1 (opened)
- 26 U.S.C. §1091(b), partial wash sales — https://www.law.cornell.edu/uscode/text/26/1091 (opened)
- IRS Direct File — https://github.com/IRS-Public/direct-file (opened)
- PolicyEngine-US — https://github.com/PolicyEngine/policyengine-us and https://pypi.org/pypi/policyengine-us/json (API read; PyPI page itself failed to render)
- PSL Tax-Calculator — https://pypi.org/project/taxcalc/ (opened)
- Open Tax Solver — https://opentaxsolver.sourceforge.net/ and https://sourceforge.net/projects/opentaxsolver/ (opened)
- json-logic-js — https://github.com/jwadhams/json-logic-js and https://registry.npmjs.org/json-logic-js (API read; npm page blocked)
- decimal.js / big.js — https://github.com/MikeMcl/decimal.js, https://registry.npmjs.org/decimal.js, https://registry.npmjs.org/big.js (opened / API read)
