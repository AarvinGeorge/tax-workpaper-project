# Review of Discovery 7 — Firm

Reviewer: Fable 5.1 (20-year CPA / tax-software designer brief), 16 Oct 2026 03:55 UTC. Own probes in
`scratchpad/review/firm/p1_firm.py`, `p2_ssn.py`, `p3_misc.py` (run `python3 -I`, packet read-only). Sources opened
live; "unverified" means not opened by me either.

## 1. Measurements

| Doc claim | Result | Probe |
|---|---|---|
| 28 full-SSN occurrences, 5 distinct; 12 printed across 11 docs (D06×2, D08–D10, D16–D20, D59, D71); household 4, prior_years 2, extracted 10 | **Reproduced** exactly. Regex `\d{3}-\d{2}-\d{4}` asserted on a test string; no unhyphenated 666-numbers | p2 |
| Masked SSNs 0 | Reproduced (mask regex asserted on `XXX-XX-1234`) | p2 |
| `ssn` 5 / `ein` 5 / `account_number` 1; D16–D20 and D59 print an SSN no extracted value holds | Reproduced | p2 |
| IP PIN 482915 `code` (ev-0005) ×4; DOB ev-0006/0008 `date`; AGI ev-0010/3002 `money`; tl-20 PINs 41207, 88310; licence nos. on D04/D05; ERO PIN ×1 | Reproduced | p3 |
| Marcus `sensitive_data_clearance: false`, PTIN P02211456 | Reproduced | p1 |
| 9 of 27 ledger items > $1,000; GT-A04 = 1,000 | Reproduced from the README table: A01, A02, A03, A06, C01, C05, B03, C06, D02 | hand |
| 0 time entries; `hours` ×2 | Reproduced (`time_entr`, `timesheet`, `time_spent`, `minutes` all 0) | p3 |
| 29 events; 22 no actor; st-01×4, st-02/04/06 ×1; Jo absent | Reproduced | p3 |
| 10 docs after 2 Mar; **8 after 27 Mar**; 6 after 15 Apr | **Differs: 7** strictly after 27 Mar (D73 arrived that day). 3 of the 10 are not client-late: D69, D72 (firm uploads), D71 (after the rejection) | p3 |
| Budget 22.0 h, 9 areas, no reviewer/extension/e-file/notice line | Reproduced; `partner_review` 1.0 exists | p1 |
| D02: "use … to prepare the return and to offer tax planning … until 12/31/2028", titled "use and disclose" | Reproduced | p3 |

## 2. Outside rules checked

Verified as cited (law.cornell.edu, ftc.gov, irs.gov): 16 CFR 314.4(c)(1)(ii), (c)(6)(i), (c)(8), (j)(1); 314.6
exemptions; 301.7216-2(b), (c)(2), (p)(1); 301.7216-3 one-year default **and** "a single written document cannot
authorize both uses and disclosures"; 26 USC 6501(c)(8); 31 CFR 10.36; FTC page lists "tax preparation firms";
Self-Select PIN needs DOB plus prior AGI or prior PIN.

Closed:
- **Rev. Proc. 2013-14** (https://www.irs.gov/irb/2013-03_IRB): supersedes 2008-35; §5.05 "Disclosure consents and use
  consents must be provided in separate documents"; mandatory statements §5.04(1); 12-point on paper.
- **Pub 4557** (PDF opened with pypdf): **Rev. 6-2024**, not May; points to Pub 5708 for the WISP; data theft goes to
  the IRS Stakeholder Liaison. **Pub 5708**: Rev. 8-2024, Catalog 93462W; repeats the 500/30-day rule.
- **Mask-format anchor the doc lacks:** 26 CFR 301.6109-4, truncated TIN = first five digits replaced (XXX-XX-1234),
  never on anything filed with the IRS (https://www.law.cornell.edu/cfr/text/26/301.6109-4).

Still unverified: TaxDome "entries cannot be deleted" (help article 232 lists views and downloads; deletion not
addressed).

## 3. Findings

**Must-fix**
1. **Retention collision with the 2028 exam is wrong (§4, §5 edge 6).** "7 years after filing" runs from Jul 2026 to
   2033; Letter 566 (Jan 2028) sits inside that window. No collision unless the exam is still open in 2033. The real
   collisions are §6501(c)(8) (unlimited until the 2023 Form 3520 is filed, verified text) and basis/asset records
   (IRS: keep until limitations run for the disposal year). Also note 314.4(c)(6) pushes the *other* way: the firm's
   7 years is the "legitimate business need" exception, not a conflict. Source: p3 + cited texts.
2. **Over-engineered for one day (§3, §6).** Sensitive spans with offsets detected at load, retention per artefact,
   legal hold, crypto-shredding, staff time windows, a breach-count query for a one-household packet. For the demo:
   regex-mask SSN/EIN/account/IP-PIN/DOB/PIN patterns at render for uncleared roles (TTIN format), one append-only
   `reveal` event with reason, and server-side comparison showing match/mismatch (that idea is good). The rest belongs
   in the write-up. Hypothesis (design judgement), not a measurement.

**Should-fix**
3. **D02 is worse than "covers use only" (§8).** Under 301.7216-3 and Rev. Proc. 2013-14 §5.05 a combined "use and
   disclose" consent cannot validly exist, and consent to use information "to prepare the return" is not needed
   (preparation is the baseline purpose in the mandatory wording). The only operative consent is tax planning; there is
   **no disclosure consent at all**, so any outside disclosure (AI vendor, planner, prior preparer) is barred. Firm
   standards should carry a consent registry (type use|disclose, purpose, recipient, expiry); do not hand it off.
4. **Time model (§6).** "Cause tags" are not how a fixed-fee engagement is controlled. D01 is a $4,800 fixed fee and
   excludes FBAR/1099s; late K-1s, a corrected 1099 and a 2028 notice are **scope changes**. Model: time entry with
   `in_scope` + change-order link; budget view shows hours and realization ($4,800 ÷ hours). Simpler and what a
   partner actually reads.
5. **Search (§5 edge 7).** "Search masked text for uncleared users" is incomplete: index only what the viewer's role
   may see (clients never hit staff notes, time or budgets), and never return a snippet from a masked span.

**Notes**
6. Late-document count: 7 strictly after hand-off, not 8; only 7 of the 10 are client-caused (D69, D72 firm uploads;
   D71 follows the rejection). Edge case 3 overstates "caused by the client".
7. Budget gap (§2): reviewer time is genuinely missing; extension/e-file usually sit in intake/admin, and a 2028 notice
   response is a new engagement under D01's scope, so "no notice line" is not a defect.
8. Pub 4557 revision is June 2024 (page footer), not May.
9. Firm "status and search" is degenerate with one client; say the demo shows one return and the board design scales.
10. tl-20 PINs are legitimate 8879 content the ERO must keep (Pub 1345, not re-verified here): mask, never strip.
11. tl-28 shows next year's preparer is Priya herself (st-01, 2027-01-15); the role is a replay of the same person.

## 4. Verdicts on the suspected issues

- **(a) D02 use-only:** confirmed, and stronger (finding 3).
- **(b) Budget lines:** confirmed for reviewer time; overstated for extension/e-file/notice (note 7).
- **(c) Zero time entries:** confirmed.
- **(d) 7-year rule conflicts:** partly. Exam collision is wrong; §6501(c)(8) and basis records are right; FTC (c)(6) is
  not a conflict (finding 1).
