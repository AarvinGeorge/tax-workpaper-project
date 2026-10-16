# Review of Discovery 9 — Person and place rules

Reviewer: independent model (Fable 5.1), 16 Oct 2026 04:06 UTC (`date -u`). Probes `scratchpad/review/person-place/r1_shape.py`,
`r2_lines.py`, `r3_detail.py`, `r5_size.py` (packet, `python3 -I`); `r4_grep_html.py` over pages fetched into
`…/person-place/fetched/`. Nothing in the document or packet was edited.

## 1. Measured numbers

Reproduced (r2, r3): 627 lines, 572 / 55 / 0; ages; household-level residency, 195 days; documents 30/22/17/3/2; D38
percentages only; Medicare 500; Corvane ended 05-16, ISO exercised 07-30; HSA 8,550; interest 3,227, 166.7, 51.3.

Differs:
- **"6 lines cite a person"** holds only if labels and notes count. Person *sources* sit on 3 lines (`F8812.4` theo,
  `F8812.6` ada, `F540NR.39` all four); `F2441.2`, `F8863.27`, `Sch3.11` only name one in text. Erik appears only on
  `F540NR.39`, so "theo ×2, ada ×2, ngozi, erik" misdescribes.
- **"Ownership exists for documents but not for lines"**: 397 of 627 lines get an owner by following sources →
  `documents.belongs_to` (taxpayer 288, spouse 53, joint 48, ada 2, theo 2, mixed 4); the other 230 are sums. The frame is
  derivable, not absent.
- `F8812.12` = 400 is CTC + ODC (2,700) after a 2,300 phase-out (46 steps × 50), not "Theo 2,200 phased to 400".

## 2. Outside rules (primary sources, 2025)

- **FTB 2025 Schedule S**: §C group-return exception quoted correctly; §E part-year residents use resident rules for the
  resident period; Part II line 4 uses 540NR line 32 (the ledger's 305,349 base is right).
  https://www.ftb.ca.gov/forms/2025/2025-540-s-instructions.html
- **Oregon 2025 Pub OR-OC (Rev. 02-04-26), closes the 2023-edition item:** "Credits normally allowed on owners' tax returns,
  such as the credit for taxes paid to another state or exemption credit, aren't allowed on the composite return."
  https://www.oregon.gov/dor/forms/FormsPubs/pub%20or-oc_101-155_2025.pdf. ORS 316.131 explains the FTB exception: Oregon
  credits a nonresident's home-state tax only when that state gives no credit. https://oregon.public.law/statutes/ors_316.131
- **Arizona ITR 16-2, closes the item:** composite returns: "2. No tax credits will be allowed." The 2025 140NR booklet still
  cites it; composite rate 2.5%.
  https://www.azdor.gov/sites/default/files/2023-03/RULINGS_INDIV_2016_ITR16-2_0.pdf,
  https://azdor.gov/sites/default/files/document/FORMS_INDIVIDUAL_2025_140NRBooklet.pdf
- **CA exemption-credit limit, closes the item:** 2025 540NR line 39 limits credits when *federal AGI* exceeds $504,411
  MFJ. 445,590 → 797 stands; GT-D04's suspicion used total CA AGI, the wrong base.
  https://www.ftb.ca.gov/forms/2025/2025-540nr-booklet.html. $153 / $475 confirmed (FTB Tax News Oct 2025).
- **Schedule CA (540NR) 2025:** line 2/3 interest and dividends "received while a California resident"; **line 5
  (partnerships, S corporations): by "actual date of realization … In the absence of information … a daily pro-rata
  methodology."** https://www.ftb.ca.gov/forms/2025/2025-540nr-ca-instructions.html
- **FTB Pub 1004 (rev. 01/2015, current), closes the item:** ISO AMT adjustment is sourced like NSO income: CA workdays from
  grant to exercise "or the date your employment ended, if earlier". https://www.ftb.ca.gov/forms/misc/1004.html
- **Pub 970, closes the item:** if the parent "doesn't claim … the dependent can claim the American opportunity credit";
  under-24 students get it nonrefundable only. https://www.irs.gov/publications/p970
- Form 8615 ($2,700; student 19–23, earned ≤ half support), Pub 501 Table 2 (1,350 / 15,750 / earned + 450), IRS CTC page
  ($2,200), IP PIN FAQ (e-file "will be rejected" if an issued dependent PIN is missing): as the doc states. FTB Pub 1031
  not fetched (not needed).

## 3. Findings

**Must-fix**
1. **§5.2 "dates beat days" is half right.** Receipt dates govern interest, dividends and Schedule C; for K-1 income the
   engine's 195/365 is the FTB *default* (Schedule CA line 5), not "a rule applied too simply". And the Austin CU example
   assumes the account post-dates the move: interest is sourced by residence at receipt, not by the bank's state; if the
   account predates July (they owned an Austin condo), 167 is right. Write "estimate, method unknown". Same correction for
   Discovery 2 §5.2.
2. **§5.3 leaves the ISO open when the packet decides it.** Grant 03/01/2022, employment ended 05/16/2025 (before the move),
   San Francisco employer, CA-only W-2 (D08, D12; r5): under Pub 1004 the 40,000 AMT adjustment (`F6251.2i`) is **100%
   California-source** on Schedule P (540NR) although exercised as a Texas resident; upper bound 7% × 40,000 = 2,800.
   The ledger's GT-D04 aside "exercise in July while CA resident" is wrong: 07-30 is after 07-14.

**Should-fix**
3. **GT-D04 revision: accept.** Credit allowed, limited to ≈ 635 (CA +209), statement and schedule attached. Cite the 2025
   OR-OC. The ledger's "file an individual Oregon return instead" is no longer needed.
4. **Arizona credit: real, ≈ $30, immaterial.** 8,400 × 27% = 2,268 AZ income; composite tax ≤ 57; resident-period share 30;
   Schedule S limit 78 (r5). Log as a client request for the composite statement, not a ground-truth entry.
5. **The local-tax row names NYC and Philadelphia but not Eugene**, the one packet city with a local income-type tax
   (Community Safety Payroll Tax on Eugene wages and self-employment; doesn't apply, Erik has neither).
   https://www.eugene-or.gov/DocumentCenter/View/81441/2025-EUG-SE---Instructions-to-Self-Employment-Tax. Also missing from
   "doesn't apply": CA renter's credit (rented 195 days; AGI cap $107,988 MFJ, Tax News Oct 2025).
6. **Residency evidence, not just dates.** The packet corroborates the move (D54 closing 07-08, D61 care ends 07-11, D73 work
   location 07-15, D62 care starts 08-18). A residency audit is a facts case; hold evidence items on the timeline.
7. **Ada's AOTC is final.** Releasing her to claim it gains 0 (her tax is 0; refundable part barred under 24) and loses ODC
   500 + CA dependent credit ≈ 301. Her 9,000 scholarship is restricted to tuition (< 15,800): excludable, not unearned
   income, so the kiddie-tax question narrows to "any interest or dividends?".

**Notes**
8. The July e-file reject is attributed to Theo's SSN; a missing issued dependent IP PIN rejects the same way. The reject
   code (not in the packet) decides.

## 4. "Rules as data": sound, oversized

Keep: a `rules.json` of ~20 person and place rules (inputs, 2025 parameter with year, citation, result applies / doesn't /
can't tell → client question), evaluated by small typed functions with one test each; a Jurisdiction list where Texas and
the two composites are real entries; line owners derived from sources (free). Drop for the one-day build: per-amount place
and date fields and per-person residency timelines, which the packet cannot populate (no receipt dates, one household move;
Ada's school presence is a note on her related return). Adopt Discovery 2's allocation record with method ∈ {dated facts,
FTB-default days, estimate days, source rule}.
