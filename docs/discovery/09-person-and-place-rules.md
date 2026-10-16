# Discovery 9 — Person and place rules

Written 16 Oct 2026, ~04:00 UTC; revised 04:20 UTC after the Fable 5.1 review (§9). Comes from Aarvin's own note
(`00-aarvin-thinking.md`, 03:49 UTC): tax rules depend on the **person** (age, minors, students, dependants, spouse) and
the **place** (state, city). Every number below was measured from the packet (read-only) with scripts in the session
scratchpad (`disc/person-place/pp1.py` … `pp13.py`, run as `python3 -I`). Rule figures are 2025 tax-year amounts from
the sources cited inline. Nothing here is a decision; proposals are marked as such.

## 1. What Aarvin asked, and which brief items it touches

> Tax rules vary with age; minors especially are treated differently. Work out the general pattern … Filing rules also
> change by state and by city.

Brief items touched: **Calculation** ("split income between states"), **People** (household members, related returns),
**Judgment** (which rules apply and why). Two jobs: (a) test each person and place rule against this household;
(b) say what the data model must hold so rules attach to people and places instead of being hard-coded.

Terms: a **dependant** is a person another taxpayer claims. A **qualifying child** is a dependant who passes the
relationship, age, residence, support and joint-return tests. **Part-year resident**: lived in a state for part of the
year. **Source income**: income a state can tax because it arose there, even if you live elsewhere. A **composite
return** is one return a business files for all its out-of-state owners.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| People | 4: Ngozi (taxpayer, born 1986-03-14, **39** at 31 Dec 2025), Erik (spouse, 1984-11-02, **41**), Ada (dependant, 2006-05-21, **19**, full-time student, UC Davis), Theo (dependant, 2017-02-09, **8**) | Ages drive every age rule. The age script was checked against a control date and gives other values |
| Person fields | Adults: dob, ssn, ip_pin, occupation. Ada: full_time_student, months_lived_with_you, own_income. Theo: months_lived only. **No ip_pin key on either child** | Fields differ by role; "unknown" and "none" look the same |
| Residency | **Household-level**: CA 01-01 to 07-14 (195 days = `ca_resident_days`), TX from 07-15. Corroborated by D54 (closing 07-08), D61 (Sacramento care ends 07-11), D73 (work location Austin 07-15), D62 (Austin care from 08-18) | One move for the whole family; the evidence for the date exists and should sit beside it |
| States touched | CA, TX (residence); OR (S corp, Eugene, D39); AZ, NV, CA, TX (fund apportionment 27/20/22/31 %, D38) | 5 states, but only 2 jurisdictions have return lines |
| Return lines by jurisdiction (v3) | federal 572, california 55, **any other state 0** | Oregon and Arizona tax lives in composite returns outside the packet |
| Lines citing a person as source | **3**: `F8812.4` (theo), `F8812.6` (ada), `F540NR.39` (all four). Three more (`F2441.2`, `F8863.27`, `Sch3.11`) name a person only in label or note | Age and status tests are never shown as evidence |
| Line owner, derived | **397 of 627** lines reach an owner through sources → `documents.belongs_to` (taxpayer 288, spouse 53, joint 48, ada 2, theo 2, mixed 4); the other 230 are sums of lines | Ownership is **derivable**, not absent. Place and date per amount are what's missing |
| Related returns | Ada's own 1040 ("can be claimed" checked; W-2 4,100; not in packet); Woodworks 1120-S + Oregon composite; Ridgeline 1065 + Arizona composite | Three other returns that must agree with this one |
| W-2 state fields | `box15_state`/`box16`/`box17` on 3 W-2 images; Halvorsen D09 prints "payroll kept California as the work state through 09/30/2025" | A place fact printed on a person's document: the source of GT-A02 |
| Deadlines in packet | federal + CA 2026-04-15, extended 2026-10-15; FBAR 2026-10-15; CA estimates 30/40/0/30 % | No Oregon, Arizona or local dates: the entities file those |

## 3. The headline insight: rules key on *who* and *where on which dates*

Every person or place mistake already in the ledger sits in the gap between a fact about a person or place and the
line it should govern. **GT-A02** (wages earned in Texas taxed as California): the work place changed on a date, and the
engine read the W-2 state box instead. **GT-A05**: Theo's identifier. **GT-D05**: the Social Security wage base is per
person. **GT-D04**: a credit that depends on a pair of states. **ISO (new)**: income sourced to California though
exercised as a Texas resident. The engine's arithmetic is right. A line's owner can be derived from its sources; what is
missing is the rule test (age, status, state pair) and the allocation method, both stated as evidence.

**Person rules, tested against this household**

| Rule (2025) | Trigger | This household | Status | GT |
|---|---|---|---|---|
| Kiddie tax, Form 8615 | Child under 18; or 18; or full-time student 19–23 whose earned income ≤ half of support; unearned income > **$2,700** ([i8615](https://www.irs.gov/instructions/i8615)) | Ada 19, student, age test met. W-2 4,100 is earned. Her 9,000 scholarship is restricted to tuition (D60) and below 15,800 tuition (D59), so it is excludable and not unearned income. Open question: any interest or dividends? | Age test applies; tax **packet can't tell** | — |
| Child tax credit + credit for other dependants | CTC: under 17, SSN for child and a parent, $2,200; ODC $500; phase-out $50 per $1,000 over $400k MFJ ([IRS CTC](https://www.irs.gov/credits-deductions/individuals/child-tax-credit)) | Theo 2,200 + Ada 500 = 2,700, less 2,300 (46 steps × 50) = **400** (`F8812.12`) | applies | GT-A05 (SSN) |
| Dependent-care credit, Form 2441 | Child under 13; both spouses have earned income | Theo 8; Erik has Schedule C income. Credit 0 after 5,000 employer benefit | applies | GT-A07, A08 |
| Education credit (AOTC) | Student you claim; phase-out 160–180k MFJ. A student not claimed may take it, nonrefundable only if under 24 ([Pub 970](https://www.irs.gov/publications/p970)) | Ada; tentative 2,500 → 0 at MAGI 445,590. Releasing Ada to claim it gains 0 (her tax is 0) and loses ODC 500 + CA dependent credit ≈ 301 = **≈ 801** | applies, phased out; final | — |
| Qualifying child: age and absence | Under 19, or under 24 if a student; school absence counts as living at home ([Pub 501](https://www.irs.gov/publications/p501)) | Ada 19 + student; 12 months, UC Davis = temporary absence | applies | — |
| Dependant's own filing | Must file if earned > $15,750, unearned > $1,350, or gross > larger of $1,350 or earned (≤ $15,300) + $450 (Pub 501 Table 2) | Ada 4,100 < 4,550 → not required. She filed, probably to recover withholding. Checking "can be claimed" **agrees** with the parents' return | applies; consistent | — |
| 65+ extra deduction; senior deduction $6,000 (2025–28, MAGI phase-out from $150k MFJ) ([IRS](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers)) | Age 65 | 39 and 41 | doesn't apply | — |
| Catch-up at 50 (IRA $1,000; 401(k) $7,500; ages 60–63 $11,250) ([IRS](https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions)) | Age 50 | none | doesn't apply | — |
| HSA catch-up 55; 20 % penalty-free at 65; IRA 10 % before 59½; RMD 73; Medicare 65 | Age | none. Ngozi's IRA conversions (code 2, under 59½) are exempt from the 10 % | doesn't apply | — |
| Social Security wage base $176,100 **per person** | Each worker | Ngozi: 2 employers, excess 3,342 (`Sch3.11`). Erik: SE tax on his own base (`SchSE.10` = 75,592 × 12.4 %) | applies | GT-D05 |
| Additional Medicare tax | Joint 250k, wages + SE combined | 230,000 + 75,592 → 500 (checked) | applies | — |
| HSA family limit | Family HDHP; spouse on other coverage | Ngozi family HDHP (D45, qa-27); Erik on his own PPO, so not eligible. 6,000 < 8,550 | applies | GT-A06 |
| ISO status | Exercise within 3 months of leaving the job | Left Corvane 05-16, exercised 07-30: inside 3 months | applies (ISO kept) | — |
| IP PIN | Each person issued one, dependants included; missing → e-file reject ([IRS FAQ](https://www.irs.gov/identity-theft-fraud-scams/frequently-asked-questions-about-the-identity-protection-personal-identification-number-ip-pin)) | Ngozi 482915 (D03, valid for 2026 filings); Erik null; children: field absent | adults yes; **children packet can't tell** | — |

**Place rules, tested**

| Rule | This household | Status | GT |
|---|---|---|---|
| CA part-year: taxed on all income while resident plus CA-source after; 540NR ratio method (CA tax on total income × CA AGI / total AGI). Interest and dividends: received while resident. K-1 income: actual date of realisation, else **daily pro-rata by FTB default** ([Schedule CA (540NR) line 5](https://www.ftb.ca.gov/forms/2025/2025-540nr-ca-instructions.html)) | Ratio 0.6347. K-1 lines by 195/365 follow the FTB default. Interest, dividends and Schedule C are also split by days, which is an estimate (see §5) | applies | GT-A02, D06 |
| Wages sourced where the work is done | Halvorsen: Sacramento until 07-14, Austin after (D73) | applies | **GT-A02** |
| Equity compensation sourced by CA workdays, grant to exercise or end of employment if earlier ([FTB Pub 1004](https://www.ftb.ca.gov/forms/misc/1004.html)) | ISO granted 03-01-2022; Corvane (San Francisco) employment ended 05-16-2025, before the move; exercised 07-30, **after** the 07-14 move. All workdays in CA → the 40,000 AMT adjustment (`F6251.2i`) is **100 % CA-source** on Schedule P (540NR) | applies; CA AMT up to ≈ 2,800 (7 % × 40,000, upper bound), not computed by the engine | new suspect, §8 |
| Texas: no personal income tax ([Comptroller](https://comptroller.texas.gov/economy/fiscal-notes/industry/2025/small-biz-info/)); Austin: no city income tax | Post-move income taxed by no state, unless sourced elsewhere | applies (zero) | — |
| Oregon nonresident: S corp in Eugene, composite return, tax 1,580 (D39) | Composite satisfies Erik's Oregon filing | applies | GT-D04 |
| Arizona nonresident: fund composite, "no Arizona filing required" (D38) | 8,400 × 27 % = 2,268 AZ income; composite tax ≤ 57 (2.5 %); resident-period share ≈ 30. Arizona's composite allows no credits (ITR 16-2), so California's group-return exception applies | applies; ≈ **$30** credit, immaterial. Client request for the composite statement, not a ledger entry | — |
| Credit for tax paid to other states (CA Schedule S) | See GT-D04 revision below | applies, limited | **GT-D04** |
| Local income taxes: Eugene Community Safety Payroll Tax on Eugene wages and self-employment ([EUG-SE 2025](https://www.eugene-or.gov/DocumentCenter/View/81441/2025-EUG-SE---Instructions-to-Self-Employment-Tax)); Portland Metro SHS 1 % / Multnomah PFA 1.5 % over $200k MFJ on Metro or county-source income ([Metro](https://www.oregonmetro.gov/what-metro-does/housing-and-homelessness/supportive-housing-services/pay-my-shs-taxes), [Multnomah](https://multco.us/info/multnomah-county-preschool-all-personal-income-tax)); NYC, Philadelphia, ~600 Ohio municipalities, Kentucky cities ([Tax Foundation](https://taxfoundation.org/research/all/state/local-income-taxes-city-and-county-level-income-and-wage-taxes-continue-wane/)) | Woodworks is in Eugene, but Erik has no Eugene wages or self-employment there ("shareholder does not work in the business", D39); an S corp share is neither. No address, employer or entity in the other places | doesn't apply | — |
| Community property (CA and TX both) | Same move date for both spouses, joint return → no split. SE income stays with Erik | doesn't apply (would if moves differed or filing separately) | — |
| CA non-conformity: no bonus depreciation, §179 cap 25,000, HSA add-back, no QBI deduction | Engine applies all of them (`R-CA-BUSINESS`, `R-CA-WAGES` add-back 6,000) | applies | GT-C06 |
| CA dependent-care credit (FTB 3506): federal AGI ≤ $100k, care in California ([FTB 3506](https://www.ftb.ca.gov/forms/2025/2025-3506-instructions.html)) | AGI 445,590 | doesn't apply | — |
| CA renter's credit: federal AGI ≤ $107,988 MFJ ([540NR booklet 2025](https://www.ftb.ca.gov/forms/2025/2025-540nr-booklet.html)) | Rented in Sacramento 195 days, but AGI 445,590 | doesn't apply | — |
| CA exemption credits $153 / $475, prorated by ratio; reduced only when federal AGI > $504,411 MFJ ([FTB](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html), 540NR line 39) | 797 (`F540NR.39`); 445,590 < 504,411, no reduction | applies | — |
| Due dates differ by place | Federal and CA 04-15 / 10-15. CA estimates 30/40/0/30 vs federal 25 % each. Oregon and Arizona dates belong to the entities | applies | GT-A03 |

**GT-D04: revise the ledger's "truth: 0".** The 2025 FTB Schedule S instructions (read directly) say: *"California
residents who are included in a group nonresident tax return … filed with … Arizona (AZ), Oregon (OR), or Virginia (VA)
may also claim a credit for their share of income taxes paid to these states, unless any of these states allow a credit
for taxes paid to California on the group nonresident tax return."* Oregon's current guide says other-state credits
"aren't allowed on the composite return" ([2025 Pub OR-OC, Rev. 02-04-26](https://www.oregon.gov/dor/forms/FormsPubs/pub%20or-oc_101-155_2025.pdf)).
ORS 316.131 explains the pattern: Oregon credits a nonresident's home-state tax only where that state gives no credit
([ORS 316.131](https://oregon.public.law/statutes/ors_316.131)). So the credit is **allowed but limited**: ≈ **635**, not
844 (California tax +209). Attach a statement and schedule of Erik's share. The ledger's limit arithmetic stands, and its
"file an individual Oregon return instead" is no longer needed.

## 4. What each role needs

- **Preparer:** a per-person panel (age at year end, student, months at home, SSN verified, IP PIN) with each rule's
  pass/fail and the fact behind it. The residency dates shown with their supporting evidence (D54, D61, D62, D73),
  because a residency audit is decided on facts.
- **Reviewer / partner:** "why this credit?" answered by the test and its inputs (Theo, DOB 2017-02-09 → under 17 ✓),
  not by a count. State-pair credits show the eligibility rule and the limit; allocated amounts show their method.
- **Client:** questions only for missing person facts: children's IP PINs, Ada's interest or dividends, the Arizona
  composite statement.
- **Next year's preparer:** ages roll forward (Ada turns 20, Theo 9). Trailing place items carry forward: the Sacramento
  rental and Ridgeline's CA share stay CA-source in 2026 (packet `planning_reference_2026`). So does a later
  disqualifying sale of the ISO shares, which would be CA-source wages.
- **Examiner:** each dependant's tests documented. Form 8867 due diligence is "Not completed" in v3 (`F8867.status`).

## 5. Edge cases, obvious and not obvious

**Obvious (in the packet):** a dependant filing her own return; two employers → excess Social Security; a mid-year
move; a child who changes care provider with the move (Sacramento, then Austin); an SSN that disagrees between sources.

**Not obvious:**
1. **Residency can differ by person.** Ada is at UC Davis in California after the family moved. That matters for her own
   California filing, not for the 540NR. In this packet it is a note on her related return, not a second timeline.
2. **Days are a default for some income and an estimate for the rest.** For K-1 income, 195/365 is FTB's stated default
   when realisation dates are unknown. Interest, dividends and Schedule C income belong to California when *received*
   while resident. That depends on when the money arrived, not on where the bank is. The packet gives only annual
   totals (e.g. Austin Community Credit Union 312 → 167 to CA; Sacramento Valley Bank 96 → 51). So the split is an
   **estimate of unknown accuracy**: label it, don't call it wrong.
3. **Place follows the income, not the person.** The ISO was exercised on 07-30, as a Texas resident. Its 40,000 AMT
   adjustment is still 100 % California-source, because every workday from grant to the end of Corvane employment was in
   California. The engine flags only `CA_AMT_NOT_COMPUTED`. The ledger aside "exercise in July while CA resident" has
   the date wrong.
4. **Ages are measured at year end**, but some rules use other dates: 59½, ISO's 3 months after leaving a job, Ada's
   19th birthday in May.
5. **Thresholds change by year and by law** (2025: CTC 2,200, senior deduction, SALT 40,000). Rules need a
   tax-year parameter table, not constants.
6. **"Null" vs "absent"**: Erik `ip_pin: null` (checked, none) vs children (never asked).

## 6. What this means for the data model (proposals, sized for one day)

- **`rules.json`, about 20 person and place rules.** Each has inputs, a 2025 parameter with its year, a citation and a
  result: *applies / doesn't apply / can't tell*. "Can't tell" produces a client question. Each rule is a small typed
  function with one test.
- **Jurisdiction list** in which Texas (no income tax) and the Oregon and Arizona composites are real entries, each with
  due dates and credit-pair notes.
- **Line owner derived** from sources → `documents.belongs_to` (397 lines, no new field).
- **Allocation record** (as in Discovery 2) on every CA-split line, with method ∈ {dated facts, FTB-default days,
  estimate days, source rule (wages, equity, property)}.
- **Person** as the packet has it, plus derived age at year end and the evidence for each test.
- **Related return** with its claims (Ada's "can be claimed", composite tax paid), checked against this return.
- Not now: per-amount place and date fields, per-person residency timelines. The packet cannot fill them (no receipt
  dates, one household move).

## 7. Questions for Aarvin

1. Show the **per-person rule panel** to all roles, or only to preparer and reviewer?
2. Should the **ISO California AMT** (up to ≈ 2,800) go into the ground-truth ledger as a confirmed mistake, or stay a
   suspect, given the engine openly says it doesn't compute CA AMT?

## 8. Handed to other sections

- **Calculation:** the allocation method per line (FTB-default days vs estimate days); the Schedule S limit and
  state-pair rule; CA AMT on the ISO.
- **Judgment:** "can't tell" items become client requests: children's IP PINs, Ada's interest or dividends, the
  Arizona composite statement (≈ $30 credit).
- **People:** Ada's related return as a consistency check (dependant box ticked, no AOTC claimed by her).
- **Change / carry-forward:** ages, trailing CA-source items, AMT credit, ISO shares.
- **Ground truth:** revise GT-D04 (≈ 635, not 0); correct its ISO date aside; add suspect "ISO AMT adjustment 100 %
  CA-source, CA AMT up to ≈ 2,800 not computed". Discovery 2 §5.2 needs the same "days" correction as §5.2 here.

## 9. Changes after review (Fable 5.1)

Each finding was re-probed (`pp13.py`; FTB Pub 1004 and Schedule CA (540NR) instructions fetched by curl; 2025 OR-OC
PDF fetched; Eugene and renter's-credit pages searched) before editing.

- **Days vs dates (must-fix 1): accepted.** Schedule CA line 5 text confirms daily pro-rata as the K-1 default. §5.2 now
  calls the interest split an estimate of unknown accuracy, sourced by receipt date and not by the bank's state.
- **ISO (must-fix 2): accepted.** Pub 1004 confirms "or the date your employment ended, if earlier". `F6251.2i` =
  40,000. Now 100 % CA-source, with the exercise after the move noted.
- **Measured claims: accepted.** 3 lines cite a person (not 6); 397/627 lines derive an owner (reproduced exactly); the
  CTC row now shows 2,700 − 2,300 = 400.
- **GT-D04: accepted**, now citing the 2025 OR-OC (edition Rev. 02-04-26 confirmed in the PDF; its text is
  font-encoded, so the quoted sentence is as the reviewer and the 2023 edition give it) and ORS 316.131.
- **Arizona: accepted** as ≈ $30 (reproduced: 2,268 × 2.5 % × 195/365 = 30.3) and a client request, not a ledger entry.
- **Closed items: accepted.** Exemption phase-out over $504,411; Pub 970 AOTC release (gains 0, loses ≈ 801;
  475 × 0.6347 = 301); Eugene payroll tax and renter's credit ($107,988, confirmed) added as "doesn't apply". Residency
  evidence added.
- **Rules as data: accepted and right-sized** (§6).
- **Rejected, note 8 (the e-file reject might be a missing dependant IP PIN):** the reject code is in the packet.
  `tax_agency_records.efile[0]` carries `R0000-504-02`, "Dependent's taxpayer identification number and name control
  must match … (dependent 2: Theo)". That is a TIN mismatch, which GT-A05 explains, so the cause is decided. Children's
  IP PINs stay a "can't tell" client question.

## Sources

Fetched and read: [Form 8615 instructions 2025](https://www.irs.gov/instructions/i8615);
[Pub 501 (2025)](https://www.irs.gov/publications/p501); FTB
[2025 Schedule S instructions](https://www.ftb.ca.gov/forms/2025/2025-540-s-instructions.html),
[2025 Schedule CA (540NR) instructions](https://www.ftb.ca.gov/forms/2025/2025-540nr-ca-instructions.html) and
[Pub 1004](https://www.ftb.ca.gov/forms/misc/1004.html) (read via curl; WebFetch returned 403);
[2025 Pub OR-OC](https://www.oregon.gov/dor/forms/FormsPubs/pub%20or-oc_101-155_2025.pdf) (edition confirmed, text
not extractable). Seen in search results, not opened:
[IRS Child Tax Credit](https://www.irs.gov/credits-deductions/individuals/child-tax-credit),
[IRS Working Families Tax Cuts](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers),
[IRS catch-up](https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions),
[IRS IP PIN FAQ](https://www.irs.gov/identity-theft-fraud-scams/frequently-asked-questions-about-the-identity-protection-personal-identification-number-ip-pin),
[FTB 3506 2025](https://www.ftb.ca.gov/forms/2025/2025-3506-instructions.html),
[FTB Tax News Oct 2025](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html),
[540NR booklet 2025](https://www.ftb.ca.gov/forms/2025/2025-540nr-booklet.html),
[Eugene EUG-SE 2025](https://www.eugene-or.gov/DocumentCenter/View/81441/2025-EUG-SE---Instructions-to-Self-Employment-Tax),
[Metro SHS](https://www.oregonmetro.gov/what-metro-does/housing-and-homelessness/supportive-housing-services/pay-my-shs-taxes),
[Multnomah PFA](https://multco.us/info/multnomah-county-preschool-all-personal-income-tax),
[Texas Comptroller](https://comptroller.texas.gov/economy/fiscal-notes/industry/2025/small-biz-info/),
[Tax Foundation local income taxes](https://taxfoundation.org/research/all/state/local-income-taxes-city-and-county-level-income-and-wage-taxes-continue-wane/),
[AZ Form 140NR 2025](https://azdor.gov/sites/default/files/document/FORMS_INDIVIDUAL_2025_140NRBooklet.pdf).
From the reviewer only (not opened by me): [Arizona ITR 16-2](https://www.azdor.gov/sites/default/files/2023-03/RULINGS_INDIV_2016_ITR16-2_0.pdf)
("No tax credits will be allowed" on composites), [ORS 316.131](https://oregon.public.law/statutes/ors_316.131), the
Pub 970 release rule, and the $504,411 exemption-credit threshold.
