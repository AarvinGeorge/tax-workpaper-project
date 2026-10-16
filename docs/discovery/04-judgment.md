# Discovery 4 — Judgment

Written 16 Oct 2026, ~03:47 UTC; revised ~03:58 UTC after an independent review (section 9). Part 4 of 8 in the
section-by-section discovery of the brief's "What it must do". Every number below was measured from the packet
(read-only) with scripts in the session scratchpad (`disc/judgment/j2.py`–`j13.py`, run as `python3 -I`). The
year-over-year swings come from `j9.py`, and the label, payer and subtotal checks from `j13.py`. Nothing here is a
decision yet; proposals are marked as such. Outside rules are cited inline; anything not opened is marked unverified.

## 1. What the brief asks

> Judgment: flag swings from last year. Record judgment calls, elections, due diligence and penalty decisions. Prove
> completeness: every document used, every area considered, every outside filing identified.

Six jobs: **swings**, **judgment calls**, **elections**, **due diligence**, **penalty decisions**, **completeness**.
"Every document used" is covered in Discovery 1 (landing states). This section covers *areas* and *outside filings*.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| Firm's swing rule (`firm.starter_standards.variance_review`) | Flag if change > 10% **and** > 1,000 against prior year | The firm's own authority. AU-C 520 (an *audit* standard) is only an analogy here |
| 2024 lines vs v3 | 106 lines in 2024; 87 share a key with v3; 85 numeric pairs; 19 2024 keys have no 2025 twin (all 11 `CA540.*`: 2025 is a part-year 540NR) | — |
| **Same key, different thing** | **58 of 87** shared keys have different label text. Some are only rewording; some are real collisions: `SchB.1.2` is Meridian Treasury 560 in 2024 and Northlake Bank 1,840 in 2025; `SchB.1.3` and `1.4` also change payer; `F1040.12` is standard deduction 29,200 in 2024 and itemized 85,706 in 2025 | **Comparing by line position is wrong.** Lines must match by payer or concept |
| v3 federal non-zero lines with no 2024 key | 431 | Most of 2025 has no "last year" to compare with |
| Swings flagged by the firm's rule | **51 of 85** (60%): **28 are subtotals or carries** (engine rule R-SUM / R-CARRY: AGI, total tax, SchE.20/21/26 …), **23 are input lines**; 4 unchanged; smallest flagged 1,280, largest unflagged 2,000 (`SchE.32`, `F8582.3a`) | The rule can stay silent, so it is a real test. It fires on most lines, and half the flags are echoes of other flags |
| Swings that point at a ledger mistake | **4:** Sch1.17 SE health insurance 0 → 14,400 (GT-A06, against the 2024 note "Erik was covered on Ngozi's employer plan"); SchE.14A repairs 3,900 → 13,300 (GT-C05); SchC.1 receipts +27.5% (GT-C01); SchC.44a miles 7,400 → 11,800 (GT-C02) | 4 among 51 |
| Ledger mistakes the rule misses | GT-B01: the same-payer comparison `SchB.1.1` 1,180 → 1,840 (+660, 56%) is **under 1,000**; the double-counted Northlake Bank line is a *new payer*, not a swing. SchC.30 home office −300 (GT-C08/C10). SchE.18A depreciation **unchanged** at 13,891 after an 11,000 HVAC job (GT-C05) | New lines, small swings and lines that *should* have moved are invisible to a % rule |
| Elections the engine priced (`what_if.alternatives`) | 5: §179 (fed 0, CA −1,050, GT-C06); no bonus (fed +10,245, CA −260); HVAC as improvement (fed +3,633, CA +896); standard deduction (fed +12,306); annualized 2210 (0) | Not the full list. Section 5 adds the elections the engine cannot price |
| Engine diagnostics in v3 | 11 (13 in v1 and v2). None of them flags any of the 27 ledger mistakes. They **do** already state the outside-filing items: `FORM_1099_FILING`, `FBAR_OUTSIDE_RETURN`, `QUESTIONNAIRE_SALES_CONFLICT` | The workpaper's job here is to *close* them, not discover them |
| Firm deadlines (`firm.deadlines`) | Include "FBAR automatic extended due date (outside engagement) 2026-10-15" and "Forms 1099-NEC … (late; outside engagement) 2026-02-02" | The packet already knows these |
| Due diligence | `F8867.status` "Not completed" in v1–v3. CTC 2,200 (Theo) + ODC 500 (Ada) − 2,300 phase-out = **400 claimed**. AOTC: tentative 2,500, phased out to 0 | Form 8867 is still owed for the 400 |
| Penalties | Fed 2210: 164 under both methods. CA 5805: 0. tl-25 asserts a failure-to-pay penalty. The engine "does not compute post-filing interest or penalties". v3 is "the current return", not the filed one (`readme.where_now_is`) | Penalty decisions sit outside the engine and depend on final numbers |
| Prior preparer open items (D07) | 4: the 2023 Woodworks K-1, the 2024 Form 5498, home office sq ft, **2023 Form 3520 "no note of resolution"** | Documents closed three in 2025; nothing closed the 3520 (GT-B05) |
| Engagement scope (D01 p1) | Excludes FBAR, the business's 1099s, Oregon/other nonresident state returns and gift tax returns | Out of scope still needs recorded advice to the client |
| Related returns | 3: Ada's own 1040; Woodworks 1120-S + Oregon composite; Ridgeline 1065 + Arizona composite | Each must agree with ours |

## 3. The headline insight: a swing is only a lead; the explanation is the record

The firm's rule flags 51 of 85 lines. In a year with a move, a job change, a home purchase and a sale, almost
everything swings, and 28 of the flags are subtotals echoing their inputs. A reviewer facing 51 flags ticks them all.
That is how GT-A06 gets past: it sits beside AGI +217,181. Worse, matching by line key compares *different payers*
(`SchB.1.2`), so a flag can be both noise and wrong.

What actually surfaces mistakes in this packet is four swing states, not a bigger threshold:

- **Explained:** closed by a linked document or event. Wages +56,361 → two W-2s and qa-03.
- **Unexplained:** an inquiry stays open. GT-C01, C02 and C05 sit here.
- **Contradicts a prior-year note:** the 2024 return says "no SEHI: covered on Ngozi's plan" and 2025 deducts
  14,400 (GT-A06). This is the strongest single signal in the packet.
- **Appeared, vanished, or should have moved:** a new payer line (Northlake Bank → GT-B01); depreciation unchanged
  after an HVAC job (GT-C05).

**Implication (proposal):** closing a swing needs a *link* (document, event or note) plus who and when. Free text
alone never closes it. AU-C 520 says the same for audits ("inquiry alone is not corroboration"), but here it is an
analogy only.

## 4. What each role needs from Judgment (domain view)

- **Preparer:** a short list of *open* swings, not 51; subtotals collapsed under their inputs. Each judgment call
  (repair vs improvement, SEHI eligibility, §179) opens a record with facts, authority, conclusion and tax effect. The
  firm's rule requires "the authority relied on" for every judgment call.
- **Reviewer / partner:** every position with its tax effect and **support level**. A position needs substantial
  authority if undisclosed, or a reasonable basis plus Form 8275 if disclosed; the preparer penalty is the greater of
  $1,000 or 50% of the fee ([26 USC 6694](https://www.law.cornell.edu/uscode/text/26/6694);
  [i8275](https://www.irs.gov/instructions/i8275)). Over 1,000 of tax effect goes to the partner under the firm's rule
  (GT-C05 +3,364, GT-A06 +3,770). Elections show as choices with their cost.
- **Client:** plain-language decisions (keep §179? file the 1099-NECs?) and **dated** written advice on noncompliance.
  Circular 230 §10.21 requires advising the client "promptly"
  ([31 CFR 10.21](https://www.law.cornell.edu/cfr/text/31/10.21)).
- **Firm administrator:** sets the threshold, the due-diligence list, the required steps, and which swing states block.
- **Next year's preparer:** open items, elections that bind future years (bonus/§179, the AMT credit, 2026
  non-residency in `planning_reference_2026`), and prior-year notes like the 2024 Sch1.17 note, which is what made
  GT-A06 detectable.
- **IRS examiner (D72 Letter 566 arrives 2028):** the 8867 record of "how and when the information was obtained,
  including the identity of any person furnishing" it, kept 3 years
  ([26 CFR 1.6695-2](https://www.law.cornell.edu/cfr/text/26/1.6695-2)). Also the noncash-gift file (Form 8283),
  which is the kind of item an exam opens on.

## 5. Edge cases

**Obvious (the packet has each one):**
1. **Big swing, good reason.** AGI nearly doubles (ISO, sale, job change). It still needs a linked explanation.
2. **Same key, different thing.** `F1040.12` standard → itemized; `SchB.1.2` Meridian → Northlake Bank; CA 540 →
   540NR. Match by payer or concept (EIN, property, form purpose), never by line number.
3. **Elections with opposite effects by jurisdiction.** §179: federal 0, CA −1,050 (GT-C06). Electing out of bonus:
   federal +10,245, CA −260. Record both numbers.
4. **Repair or improvement** (GT-C05). The facts are in the call notes and D47; the authority goes to Calculation.
5. **Due diligence owed, not done.** Form 8867 covers CTC/ACTC/**ODC**, AOTC, EIC and HOH, at **$650 per failure**
   for returns filed in 2026 ([i8867](https://www.irs.gov/instructions/i8867)). Here it is needed for CTC/ODC. The
   AOTC is not claimed, but the "phased out" conclusion is recorded.
6. **Underpayment penalty method.** 2210 regular and annualized both give 164. Choosing the method is a recorded
   decision even when it changes nothing. Excess Social Security counts as withholding
   ([i2210](https://www.irs.gov/instructions/i2210)); the engine ignores it (GT-D05).
7. **Out-of-scope filings the packet already flags.** These are not discoveries: the diagnostics and `firm.deadlines`
   state them. The workpaper must carry each to a **closed state with dated client advice**:
   - **FBAR:** D36 maximum SEK 1,452,300. Due 15 Apr, automatic extension to 15 Oct 2026, filed with FinCEN
     ([IRS FBAR](https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar)).
   - **1099-NEC:** D27 shows 4,800 and 2,600, paid by ACH. They were due Mon 2 Feb 2026 (31 Jan was a Saturday) and
     are late ([i1099mec](https://www.irs.gov/instructions/i1099mec)). Both are over $2,000, so the 2025 threshold
     question ($600) does not matter.
8. **In-scope outside form.** Form 8938 is required by the **year-end test**: 123,254 USD against $100,000 MFJ. The
   any-time maximum, 149,567, is just under $150,000 ([i8938](https://www.irs.gov/instructions/i8938)). In 2024 the
   *any-time* test was met (151,880). Record which test was met each year.
9. **Noncash gifts (Form 8283).** v3 has `F8283.A1.stock` 14,500 (D65: DAF shares, basis 9,300) and
   `F8283.A1.vehicle` 6,000 (GT-D03: the 1098-C says sold for 2,900). These are an "area considered" with its own
   evidence rules, and the Letter 566 exam makes them an examiner's starting point.

**Not obvious:**
1. **Elections the engine cannot price: "considered → result (why)".**
   - *Small-taxpayer building safe harbor* (Reg. §1.263(a)-3(h)). The cap is the lesser of 2% of unadjusted basis or
     $10,000. Fremont building 364,000 (`SAC-BLDG`) × 2% = 7,280 < 2025 repairs 13,300 → **fails**. This strengthens
     GT-C05.
   - *De minimis safe harbor* ($2,500 per item without audited statements, annual election by statement;
     [IRS](https://www.irs.gov/businesses/small-businesses-self-employed/tangible-property-final-regulations)). Not
     available for the 38,000 of equipment (qa-18: three items averaging well over $2,500), but it could cover
     small supplies. Considered → not useful.
   - *Partial-disposition election* for the removed 2004 furnace (Reg. §1.168(i)-8(d); must be made on the timely
     original return, extensions included; [Cornell](https://www.law.cornell.edu/cfr/text/26/1.168(i)-8)).
     Available only if the HVAC is capitalized (GT-C05). It deducts the furnace's remaining basis, which must be
     estimated because the furnace was inside the 2019 building cost.
   - *California MFJ vs MFS.* Not available. California follows the federal joint status unless a spouse was military
     or a full-year nonresident with no CA income
     ([FTB](https://www.ftb.ca.gov/file/personal/filing-status/married-rdp-filing-jointly.html), via search result;
     page not opened). Both spouses were part-year residents.
2. **Look-back: prior-year outside filings nobody closed.**
   - *2023 Form 3520* (GT-B05/C09): required for a bequest from a foreign person over $100,000; penalty 5% a month,
     up to 25% ([IRS](https://www.irs.gov/businesses/gifts-from-foreign-person)). qa-08 asks only about 2025, so
     "No" was honest.
   - *2023 FBAR and 2023 Form 8938*: the account opened 09/2023 (D36). D07 confirms only 2024 ("FBAR filed by client
     separately. 8938 filed"). Both are open for 2023.
3. **Penalty decisions, not just Form 2210:**
   - *Failure to pay (tl-25).* Paid by 15 Apr: 77,742 of 81,962 = **94.85%** (93.63% with GT-A04). The
     reasonable-cause presumption needs ≥ 90% paid **and** the balance "remitted with the return"
     ([26 CFR 301.6651-1(c)(3)](https://www.law.cornell.edu/cfr/text/26/301.6651-1)). Paid 20 Jul, six days after
     acceptance. **But** v3 is not the filed return. The ledger's federal effects, each taken alone, net to about
     −10,000, so the corrected return is likely a refund and the question goes away. The decision must be
     recomputed from final numbers. If a penalty is still assessed, cite (c)(3) in an abatement letter before using
     first-time abatement.
   - *Accuracy-related penalty* (§6662): 20%, for a substantial understatement over the greater of 10% of the
     correct tax (**5%** when a §199A/QBI deduction is claimed, as here) or $5,000. It is reduced for substantial
     authority, or for disclosure with a reasonable basis
     ([26 USC 6662](https://www.law.cornell.edu/uscode/text/26/6662)). This applies to the GT-A06 and GT-C05
     positions if they are kept.
   - *SEP excise* (GT-C07): 10% on nondeductible contributions, explicitly covering SEPs
     ([26 USC 4972](https://www.law.cornell.edu/uscode/text/26/4972)), reported on Form 5330. Decide whether to
     withdraw the excess or pay the excise.
   - *3520 penalty exposure*: a decision about a late filing with a reasonable-cause statement, not just a reminder.
4. **Related returns must agree with ours.** Ada's return says she can be claimed, which matches our ODC. If we did
   not claim her, she alone could take the AOTC. But her refundable part is barred: she is under 24, a full-time
   student, with earned income under half her support and a living parent (per the reviewer's reading of the
   [Form 8863 instructions](https://www.irs.gov/instructions/i8863); I did not open them). So claiming her (+400)
   is right. Her scholarship (9,000) is below her tuition (15,800), so nothing is taxable.
5. **Composite returns remove a filing.** Oregon (D39 p2: 1,580 paid for Erik) and Arizona (D38: "no Arizona filing
   required by the partner") are considered and closed by evidence. They interact with GT-D04.
6. **A client answer that contradicts the prior year, and the engine was right to ignore it.** qa-31 says "no prior
   basis". The 2024 Form 8606 shows 7,000, and v3 uses it. Record why the prior return outranks the client's memory.
7. **A required return question the engine doesn't model.** No version has the 1040 digital-asset question. The
   engine flags the conflict (`QUESTIONNAIRE_SALES_CONFLICT`, 12 disposals), but no line carries the answer. The
   answer must be Yes ([IRS](https://www.irs.gov/filing/digital-assets)). Completeness covers *questions* as well as
   lines.
8. **Gift tax: considered, none found.** Searching all printed content for gift / inherit / 709 / 3520 / estate got
   15 hits (so the search can find things). None is a gift to a person over the 2025 $19,000 exclusion
   ([IRS](https://www.irs.gov/businesses/small-businesses-self-employed/frequently-asked-questions-on-gift-taxes)).
   "Considered → none" is a closed state that keeps its evidence.
9. **A prior-year error found this year** (GT-C10, 2024 office 300 vs 220 sq ft): record the amend decision and the
   advice given (Circular 230 §10.21).
10. **Basis never computed** (Ridgeline outside basis is null). No loss limit bites in 2025. Record "considered, not
    needed" and what would reopen it.

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Comparison identity:** each line carries a *concept key* (payer EIN, property, form purpose) used for
  year-over-year matching. Subtotals are tagged so they collapse under their inputs.
- **Swing record:** the firm rule's flag plus a state: *explained (link)*, *open*, *contradicts prior-year note*,
  *appeared / vanished / expected-but-unchanged*.
- **Position:** facts, authority, support level (substantial authority / reasonable basis + 8275), conclusion, tax
  effect fed/CA, who/when; partner over 1,000.
- **Election:** choice, priced alternatives (from `what_if`) **or** "considered → not available / not useful (why)";
  binding years; deadline (e.g. "timely original return incl. extensions").
- **Due-diligence record** per credit, in the §1.6695-2 shape; it blocks filing until complete.
- **Penalty decision:** which penalty, amount, the version it was computed on, relief considered (waiver, 90%
  presumption, first-time abatement, disclosure), advice to client.
- **Area and outside-filing checklist**, per year with look-back: *in return*, *out of scope → client advised (date)*,
  *filed by others (composite)*, *considered → none (evidence)*, *open*. *Open* blocks filing.

**Recommendation for the one-day build (weighing the reviewer's alternative).** I proposed an expected value per
line, built from questionnaire events. The reviewer proposed a cheaper option: keep the firm's rule, add payer/concept
matching, a "contradicts prior-year note" flag, appear/vanish detection, and closure only by link. **I recommend the
reviewer's version.** It produces all four swing states with no rule library. It catches every swing-visible ledger
mistake (A06 by the note flag; B01 by the new payer; C01, C02 and C05 by the firm rule plus the open state). It also
avoids anchoring, where reviewers accept a pre-written "wages up → job change" story. Expected values can come in a
later round, as a suggestion the preparer must accept, not a default.

## 7. Questions for Aarvin (only what this section needs)

1. Ship the reviewer's lighter swing model (firm rule + concept matching + note-contradiction + appear/vanish) for the
   one-day build? (Recommended.)
2. For out-of-scope filings (FBAR, 1099-NEC, 2023 3520/FBAR/8938), does "client advised, dated" close them, or do they
   stay open until the client confirms filing?

## 8. Handed to other sections

- Repair-vs-improvement authority, §179 mechanics, partial-disposition basis estimate → **Calculation**.
- Re-signing after the SSN fix; the e-file rejection; Letter 566 response → **Filing and after**.
- Who can sign off what; partner-over-1,000 enforcement → **People / Firm**.
- Swings between versions v1 → v3 (89 changes in v3) → **Change**.
- Retention (firm 7 years vs the 3-year minimum for 8867) → **Records a CPA expects**.

## 9. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/04-judgment-review.md`. Each finding was re-probed with `j13.py` before I changed
anything.

| # | Finding | My probe | Action |
|---|---|---|---|
| 1 | Positional keys; B01 isn't a swing; 4 not 5 | Confirmed: `SchB.1.2` 2024 "Meridian (U.S. Treasury)" 560 vs v3 "Northlake Bank" 1,840; same-payer `SchB.1.1` +660 unflagged; 58/87 labels differ | Count corrected to 4; concept matching added (§2, §5, §6) |
| 2 | 1099-NEC / FBAR / digital assets already in the packet | Confirmed in v3 diagnostics and `firm.deadlines` | Recast as "carry to a closed state with dated advice" |
| 3 | Elections stop at what the engine priced | Confirmed `SAC-BLDG` 364,000 → 7,280 < 13,300 | Added the small-taxpayer, de minimis, partial-disposition and CA MFS entries. **Corrected the reviewer on one point:** the reg text on Cornell says $500 for de minimis, but the IRS page confirms $2,500 since 2016 (Notice 2015-82) |
| 4 | FTP analysis rests on v3, not the filed return | Confirmed `readme.where_now_is`; my own net of ledger federal effects ≈ −10,100 | Dependency stated |
| 5 | §6694, §6662, 8275, C07 excise, 3520 penalty | Rules fetched and cited | Added. I also added that the §6662 threshold uses 5% when QBI is claimed (it is) |
| 6 | 2023 FBAR / 8938 | Confirmed D36 opened 09/2023; D07 refers only to 2024 | Added to the look-back |
| 7 | Form 8283 missing | Confirmed `F8283.A1.stock` 14,500, `.vehicle` 6,000 | Added |
| 8 | Expected-value proposal over-engineered | Agree | Recommended the reviewer's version for the build |
| 9–12 | 2 Feb due date; 8938 FX point weak; split subtotals; abatement order | Confirmed (28 subtotal/carry + 23 inputs) | All applied; the FX-flip point is dropped |
| — | AU-C 520 → analogy | Agree | Relabelled throughout |

Rejected: none. One partial disagreement: on finding 2, the missing digital-asset *question line* stays as a
completeness point, because the engine flags the conflict but no line carries the answer.

## Sources

- AU-C 520: **primary not opened** (the AICPA download page has no text). Used only as an analogy. Secondary:
  <https://open-exam-prep.com/study-guides/cpa-aud/evidence-fundamentals/substantive-analytical-procedures> (not re-fetched).
- SSTS (AICPA, effective 1 Jan 2024): not re-fetched; relied on `docs/research/reports/US tax workpaper standards and process.md`. Unverified here.
- 26 CFR 1.6695-2: <https://www.law.cornell.edu/cfr/text/26/1.6695-2> (eCFR blocked the fetch)
- Form 8867 instructions: <https://www.irs.gov/instructions/i8867>
- 26 CFR 301.6651-1: <https://www.law.cornell.edu/cfr/text/26/301.6651-1>
- Form 2210 instructions: <https://www.irs.gov/instructions/i2210>
- 26 USC 6694: <https://www.law.cornell.edu/uscode/text/26/6694>; 26 USC 6662: <https://www.law.cornell.edu/uscode/text/26/6662>; Form 8275 instructions: <https://www.irs.gov/instructions/i8275>
- 26 USC 4972 (SEP excise): <https://www.law.cornell.edu/uscode/text/26/4972>
- Tangible property regulations, safe harbors: <https://www.irs.gov/businesses/small-businesses-self-employed/tangible-property-final-regulations>; Reg. §1.263(a)-3: <https://www.law.cornell.edu/cfr/text/26/1.263(a)-3>; Reg. §1.168(i)-8: <https://www.law.cornell.edu/cfr/text/26/1.168(i)-8>
- FTB married/RDP filing status: <https://www.ftb.ca.gov/file/personal/filing-status/married-rdp-filing-jointly.html> (search result only; ftb.ca.gov returned 403 to direct fetch)
- FBAR: <https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar>
- Form 8938 instructions: <https://www.irs.gov/instructions/i8938>
- Form 3520 / foreign gifts and bequests: <https://www.irs.gov/businesses/gifts-from-foreign-person>
- Gift tax FAQ: <https://www.irs.gov/businesses/small-businesses-self-employed/frequently-asked-questions-on-gift-taxes>
- Forms 1099-MISC/NEC instructions: <https://www.irs.gov/instructions/i1099mec>
- Digital assets: <https://www.irs.gov/filing/digital-assets>
- Circular 230 §10.21: <https://www.law.cornell.edu/cfr/text/31/10.21>
- Form 8863 instructions (Ada / AOTC refundability; per the reviewer, not opened by me): <https://www.irs.gov/instructions/i8863>
