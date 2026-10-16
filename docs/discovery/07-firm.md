# Discovery 7 — Firm

Written 16 Oct 2026, ~03:50 UTC; revised ~04:15 UTC after an independent review (section 9). Part 7 of 8 in the
section-by-section discovery of the brief's "What it must do". Every number below was measured from the packet
(read-only) with scripts in the session scratchpad (`disc/firm/f1.py` … `f13.py`, run as `python3 -I`). Outside rules
carry their URL inline; anything not opened is marked **unverified**. Nothing here is a decision yet; proposals are
marked as such.

## 1. What the brief asks

> Firm: firm-wide standards, protection of sensitive data with view logs, time against budget, status and search.

Five jobs: **standards** (rules the firm sets once, applied to every return), **sensitive data** (masking plus a log
of who *viewed* what), **time vs budget**, **status** (where each return is), **search**. With one household in the
packet, status and search show one return; the design must still be one that scales to a firm's whole client list.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| Staff | 6: Priya Raman (preparer, st-01, from 2025-08-01), Daniel Ortiz CPA (reviewer, st-02), Helen Strand CPA (partner, st-03, signs as paid preparer), Marcus Bell (preparer, st-04, from 2026-03-24, **no clearance**, "background check pending"), Jo Kimura (firm administrator, st-05), Sam Adeyemi CPA (quality reviewer, st-06, from **2027-01-04**) | Staff have start dates: the roster changes during the season |
| Client users | 2 (Ngozi, Erik). Ada (a 19-year-old dependant who files her own return) has no login | Joint access; the adult child's data is visible to her parents |
| PTINs | 4 (st-01…st-04). Firm also holds EIN, EFIN and ERO PIN | The ERO PIN is the firm's e-file signature: a firm secret |
| Assignment at start | preparer st-01, reviewer st-02, partner st-03. Next year's file is opened by st-01 again (tl-28) | "Next year's preparer" is the same person, a year later |
| Deadlines | 6: original 15 Apr; extended 15 Oct; **internal hand-off 27 Mar; internal review complete 8 Apr**; FBAR 15 Oct and 1099-NEC 2 Feb (both "outside engagement") | Internal and out-of-scope dates sit beside legal ones |
| Budget and fee | 22.0 h over 9 areas: intake 1.5, wages/stock 3.0, investments/crypto 4.0, business 3.5, rentals/sale 3.5, pass-throughs/basis 2.0, deductions/credits 2.0, California 1.5, partner review 1.0. **Fixed fee $4,800** (D01), which equals $218/h at budget | No line for the reviewer's review |
| Engagement scope (D01) | 2025 Form 1040 and CA 540NR. Excluded: FBAR, the business's 1099s, Oregon or other nonresident returns, gift tax returns | Work on the excluded items is a change order, not budget overrun |
| Actual time recorded | **None**: 0 time entries (`time_entr`, `timesheet` = 0 hits; the same grep finds `hours` twice, so it can hit) | "Time against budget" has nothing to compare until the app records time |
| Starter standards | 5 verification types; variance flag at >10% **and** >$1,000 vs prior year; review levels preparer → reviewer → partner; 7 rules; 12 required steps. Marked "a starting point … change, extend or replace through the firm administrator role" | Standards are editable data, so they need versions |
| Timeline actors | 29 events; 22 have no staff actor, st-01 ×4, st-02 ×1 (filed the extension), st-04 ×1, st-06 ×1; Jo Kimura never appears | Most season events are client or system events |
| Documents after "upload complete" (2 Mar) | 10, of which 8 were client uploads (D26, D31, D37, D38, D40, D43, D71, D73; D69 and D72 are firm uploads). **7 arrived after the hand-off date of 27 Mar** (D73 came that day); 6 after 15 Apr | Both internal deadlines were missed mainly for reasons outside the firm |
| Full SSNs in the packet | **28 occurrences, 5 distinct numbers**: household 4, prior_years 2, extracted values 10 (5 values × value + text_as_read), **printed page text 12 on 11 documents** (D06 ×2, D08, D09, D10, D16–D20, D59, D71) | Most SSNs live in document text, not in typed fields |
| Masked SSNs (XXX-XX-1234) | 0 (pattern proven to match a test string) | Every document prints the full number |
| Extracted values typed `ssn`/`ein`/`account_number` | 5 / 5 / 1. All five 1099-NEC and the 1098-T SSNs are **printed but not extracted** | Masking by `value_type` alone misses most of them |
| Sensitive values typed as something else | IP PIN ev-0005 (`code`); dates of birth ev-0006, ev-0008 (`date`); 2024 AGI ev-0010, ev-3002 (`money`) | DOB and prior-year AGI are the e-file signature secrets ([IRS Self-Select PIN](https://www.irs.gov/e-file-providers/self-select-pin-method-for-forms-1040-and-4868-modernized-e-file-mef)) |
| Other sensitive printed text | Full account numbers on D36 (Swedish IBAN) and D58 (county account); "account ending" on 6 docs; licence numbers + DOB on D04, D05; IP PIN 482915 on D03 (4 occurrences in the packet); bank routing and account in household (1 each) | |
| Sensitive data in free text | Timeline tl-20 detail holds both spouses' 8879 signature PINs (41207, 88310); msg-10 announces an SSN card attached | Event details and messages need masking too |
| Consent (D02) | One document titled "Consent to use and disclose", whose text reads "to use tax return information to prepare the return and to offer tax planning. Duration: until 12/31/2028" | See section 3 |

## 3. The headline insights

**Masking is a property of text, not of fields.** The starter rule masks "SSNs, bank and account numbers and IP
PINs" for uncleared staff. The packet types only 11 values as sensitive. Yet full SSNs appear 28 times, 12 of them
inside printed document text. An app that masks the `ssn` field will still show Erik's SSN on all five 1099-NECs,
and Ada's on her 1098-T, the moment Marcus opens the document viewer. The same leak reaches **search** (typing
"3390" finds Theo's card), **exports**, the **event log** ("changed SSN from …3309 to …3390") and timeline details.
The FTC rule asks firms to "Limit authorized users' access only to customer information that they need" and to
"monitor and log the activity of authorized users"
([16 CFR 314.4(c)(1)(ii), (c)(8)](https://www.law.cornell.edu/cfr/text/16/314.4)). It names tax preparation firms
as covered ([FTC guidance](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know)).
A ready-made mask format exists: the IRS "truncated TIN" replaces the first five digits with X's (XXX-XX-1234,
XX-XXX1234 for an EIN). A truncated TIN may never be used on anything filed with the IRS
([26 CFR 301.6109-4](https://www.law.cornell.edu/cfr/text/26/301.6109-4)), so masking is for display only.

**Checks can run on secrets without revealing them.** GT-A05 (Theo's SSN …3309 vs card …3390) happens to show in
the last four digits. A transposition in the first five would be hidden by masking. **Proposal:** the server compares
sensitive values (organizer vs card vs prior year) and shows only "match" or "mismatch". Marcus can then see a
blocking check that he cannot open, and the fix goes to cleared staff.

**The firm holds no disclosure consent at all.** Rev. Proc. 2013-14 says "Disclosure consents and use consents must
be provided in separate documents". It also says a taxpayer "does not need to complete a consent form to engage a tax
return preparer to perform only tax return preparation services"
([Rev. Proc. 2013-14, IRB 2013-3](https://www.irs.gov/irb/2013-03_IRB)). A consent must be signed *before* the use
or disclosure ([26 CFR 301.7216-3(b)(1)](https://www.law.cornell.edu/cfr/text/26/301.7216-3)). So D02, a single
"use and disclose" document, cannot validly cover both. Its "prepare the return" wording grants nothing, because
that use needs no consent. Its only working effect is to consent to *use* for tax planning, until 12/31/2028.
Disclosure outside the firm needs a separate consent that the firm does not hold. That covers sending data to an
outside planner, to an AI or other vendor, or to the S-corp's preparer (Willamette CPA Group) beyond what
§301.7216-2 allows. Exempt cases need no consent: preparation help inside the US
([§301.7216-2(c)(2)](https://www.law.cornell.edu/cfr/text/26/301.7216-2)), disclosure to the IRS (b), and quality
review (p). **Proposal:** the firm keeps a consent registry, and an action that needs a missing consent is blocked.

## 4. What each role needs from Firm (domain view)

- **Preparer:** sees the standards as checks on the work, not as a manual. Logs time per area and marks it in scope
  or not. Sees masked data, with a "reveal" that asks for a reason. Marcus (uncleared) still sees which checks fail.
- **Reviewer / partner:** a status board showing each return's step against the 12 required steps, its deadline, hours
  vs budget and **realization** (fee ÷ hours: $4,800 ÷ actual hours, against $218/h at budget), and open review notes.
  The partner must see every adjustment with a tax effect over $1,000. Measured from the ledger: 9 of 27 known
  mistakes exceed it, and GT-A04 sits at exactly $1,000.
- **Client:** sees their own data, masked by default too. Never sees staff time, budgets or staff notes. Two client
  users share one joint return.
- **Firm administrator (Jo):** edits standards (each edit versioned), grants clearance, keeps the consent registry,
  and reads the reveal log ("who saw Theo's SSN, when, why"). If 500 or more consumers' unencrypted data is breached,
  the FTC must be told within 30 days
  ([FTC guidance](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know);
  [IRS Pub 5708, Rev. 8-2024](https://www.irs.gov/pub/irs-pdf/p5708.pdf)). A log of reads is what makes that count
  possible. Circular 230 §10.36 puts the duty for "adequate procedures" on whoever oversees the practice
  ([31 CFR 10.36](https://www.law.cornell.edu/cfr/text/31/10.36)).
- **Next year's preparer (Priya again, tl-28):** inherits the standards version in force, budget vs actual by area
  (to re-budget and re-price 2026), the consent registry (D02 runs to 2028) and carry-forward records. Must **not**
  inherit the 2026 IP PIN, which is issued for one calendar year (D03).
- **IRS examiner, years later (Letter 566, 2028):** the firm may disclose to the IRS without client consent
  ([§301.7216-2(b)](https://www.law.cornell.edu/cfr/text/26/301.7216-2)). The examiner needs the record intact and
  the standard version in force when the return was signed. The notice response is outside D01's scope: a new
  engagement or change order.

## 5. Edge cases

**Obvious (the packet has each one):**
1. **Uncleared staff on the engagement:** Marcus joins 24 Mar, three days before hand-off. He holds a PTIN but cannot
   see SSNs, so he cannot do "Identity verified" or fix the e-file rejection (GT-A05). Clearance must change who gets the task.
2. **Staff who don't exist yet:** Sam is active from 2027-01-04. The role switcher, replayed at June 2026, should not
   offer him.
3. **Hours overrun from late documents is not scope change.** Seven client documents arrived on or after the
   hand-off date: D73 (on the day), D26, D37, D38, D40, D43 and D71 (after the e-file rejection). The 7 strictly after
   27 Mar in section 2 swap D73 for D72, the firm's own upload of the 2028 notice. The late K-1s and the
   corrected 1099 (D31, before hand-off) are still the 1040 that D01 covers. Under a fixed fee they are absorbed: they
   lower realization unless the letter allows extra billing, and D01 has no such clause. FBAR, the late 1099-NECs, an
   Oregon return, gift tax returns and the 2028 notice response *are* outside D01, so they are change orders.
4. **Missed internal deadlines with legal ones met:** hand-off 27 Mar and review 8 Apr were missed (v3 on 23 Jun); the
   extension was filed 14 Apr; e-file accepted 14 Jul. Status needs both clocks.
5. **Deadlines outside the engagement:** FBAR and the late 1099-NECs are listed but excluded by D01. Status shows them
   as "client's responsibility", not as firm work.
6. **Self-review:** Daniel (reviewer) filed the extension. If he computed it, he may not review it (starter rule 1).
7. **Consent covers less than its title** (D02, section 3).

**Not obvious:**
1. **SSNs leak through printed text, search, exports, diffs and the log itself** (section 3). The reveal log records
   *that* a value was seen, never the value.
2. **Sensitive data the standard forgets:** DOB and prior-year AGI (e-file identity secrets), 8879 PINs, driver's
   licence numbers, the firm's ERO PIN. The packet has all five; none is in the masking rule. The 8879 PINs are
   legitimate signature records the firm keeps, so they are masked, never stripped (the keeping duty is under Pub
   1345, **unverified** here).
3. **Does a cleared person's view get logged?** The rule reads "every unmasked view is logged", next to the clause
   on uncleared staff. The FTC asks for logging of all authorized users' activity
   ([16 CFR 314.4(c)(8)](https://www.law.cornell.edu/cfr/text/16/314.4)). **Proposal:** mask for everyone by default
   and log every reveal, by anyone.
4. **A standard changed mid-season.** If Jo lowers the variance threshold in May, are April's cleared variances
   reopened? **Proposal:** each check result records the standard version it ran under. A change re-runs the checks
   and labels new failures as raised by the new version.
5. **"Over 1,000" is ambiguous.** Is it absolute or signed? Federal and state separately or combined (GT-C05 is
   +3,364 fed and +1,074 CA)? Per adjustment or per batch? GT-A04 is exactly 1,000.
6. **"Retain 7 years, then destroy" is too short in two measured cases.** First, GT-B05: the unfiled 2023 Form 3520
   keeps assessment open until 3 years after the information is furnished
   ([26 USC 6501(c)(8)](https://www.law.cornell.edu/uscode/text/26/6501)). Second, basis and asset records (rental sold,
   S-corp basis, depreciation) must be kept until the limitations period runs for the year of disposal
   ([IRS](https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records)). The FTC's
   2-year disposal default does not conflict: it allows longer retention for a legitimate business need
   ([16 CFR 314.4(c)(6)](https://www.law.cornell.edu/cfr/text/16/314.4)), and the firm's 7 years is that need. The 2028
   exam does *not* collide, because 7 years from the July 2026 filing runs to 2033.
7. **Search must respect the role, not only the mask.** It searches only what the viewer's role may see. Clients
   never hit staff notes, time or budgets. A snippet never comes from inside a masked span, because otherwise
   searching a guessed SSN confirms it.
8. **The client's portal.** Both spouses see the joint return. Ada, an adult, appears on it with her full SSN; the
   packet has no rule on this.
9. **Small-firm exemptions don't excuse logging.** Firms with fewer than 5,000 consumers skip §314.4(b)(1), (d)(2),
   (h) and (i). They do not skip access control, encryption, MFA or logging
   ([16 CFR 314.6](https://www.law.cornell.edu/cfr/text/16/314.6)).
10. **The quality reviewer needs no new consent:** §7216 exempts quality and peer review
    ([§301.7216-2(p)](https://www.law.cornell.edu/cfr/text/26/301.7216-2)). Sam's reveals are still logged.
11. **SQMS 1 does not bind this firm:** the AICPA quality standard applies to audit, attest and review practices
    ([Journal of Accountancy](https://www.journalofaccountancy.com/news/2025/aug/aicpa-unveils-new-qm-resources-to-help-firms-meet-dec-15-deadline/)).
    That tax-only firms fall outside it is an inference, not stated. The starter standards are firm policy, which is
    why they must be editable.

## 6. What this means for the data model (proposals for a one-day build)

**Build:**
- **Mask at render:** one server-side function applies regex patterns (SSN, EIN, account and IBAN, IP PIN, DOB, PINs,
  licence numbers) to *every* text it sends: fields, page text, messages, event details, search snippets. It uses the
  truncated-TIN format. Masked for every role by default.
- **Reveal event** in the append-only log: who, role, document or field, class (never the value), reason, time.
  Uncleared roles cannot reveal. No role can delete an event.
- **Server-side match check** for sensitive values (organizer vs card vs prior year), showing match or mismatch only.
- **Standard** as versioned data, edited only by the administrator; each check result records the version.
- **Consent registry:** type (use or disclose), purpose, recipient, signed date, expiry, source document. Seeded with
  D02 read as use-for-planning, and with no disclosure consent.
- **Time entry:** person, budget area, hours, `in_scope` yes/no, optional change-order link. The board computes hours
  vs budget per area and realization against the $4,800 fee.
- **Status** derived from the 12 required steps plus the deadlines, never typed by hand.

**Describe only (write-up):** per-record retention dates and legal hold; deleting a per-client encryption key to
destroy data while the log stays append-only; staff access windows in replay; breach-count queries; MFA and
encryption at rest.

## 7. Questions for Aarvin (only what this section needs)

1. **Masked for everyone by default, with every reveal logged** (proposed), or unmasked for cleared staff? The first
   is stronger and demos better, at the cost of a click.
2. **Time capture:** real time entries in the prototype (about 1 h more), or simulated actuals only?

## 8. Handed to other sections

- Variance review (>10% and >$1,000) as a check → **Judgment**.
- Due diligence for CTC, ODC, AOTC, EIC and head of household; authority for each judgment call → **Judgment**.
- Sign-off order, "open review notes block filing", partner sign-off over $1,000, deadline notifications → **People**.
- Theo's SSN fix and e-file rejection (GT-A05); 8879 PINs; client e-file authorization; freeze at filing → **Filing and after**.
- Verification types as the per-number verification legend → **Evidence**.
- Whether the client was told about FBAR and the late 1099-NECs → **People**.
- A document index that shows each document's sensitive classes → **Records a CPA expects**.

## 9. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/07-firm-review.md`. Each finding was checked with my own probe before I accepted it.

| Finding | My probe | Change |
|---|---|---|
| Must-fix 1: the 2028 exam does not collide with the 7-year rule | 7 years from the 14 Jul 2026 filing runs to 2033; Letter 566 is dated Jan 2028 | Accepted. Kept only §6501(c)(8) and basis records; added that FTC (c)(6) is not a conflict (edge 6) |
| Must-fix 2: over-built for one day | Design judgement | Accepted. Section 6 split into Build (regex mask at render, one reveal event, match check, versioned standard, consent registry, time entry) and Describe only |
| Should-fix 3: D02 has no disclosure consent | Opened Rev. Proc. 2013-14 (IRB 2013-3): §5.05 "separate documents" and "does not need to complete a consent form … only tax return preparation" | Accepted. Moved into Firm as a headline insight and a consent registry, no longer handed off |
| Should-fix 4: time as in scope vs change order, with realization | D01 printed text: fixed $4,800; exclusions listed | **Accepted in part.** In scope vs change order and realization added. I disagree that the late K-1s and the corrected 1099 are scope changes: they belong to the 1040 that D01 covers, and D01 has no extra-fee clause. So they count as in-scope hours that lower realization. Only the excluded items and the notice response are change orders |
| Should-fix 5: search by role, no snippet from a masked span | Design point | Accepted (edge 7) |
| Note 6: 7 documents after hand-off, not 8 | `f12.py`: D73 arrived 27 Mar 16:30, on the hand-off date; 7 arrived strictly after | Accepted. Also: 8 of the 10 late documents were client uploads (D69 and D72 are firm uploads) |
| Note 7: no notice or e-file budget line is not a defect | The notice response is outside D01 | Accepted; only the missing reviewer line remains |
| Note 8: Pub 4557 is Rev. 6-2024 | `f13.py` (pypdf) read "Rev. 6-2024", Catalog 48905Y; Pub 5708 "Rev. 8-2024", Catalog 93462W, with the 500/30-day rule | Accepted; both Pubs now verified |
| Note 9: status and search degenerate with one client | n/a | Accepted (section 1) |
| Note 10: 8879 PINs are kept records; mask, never strip | Pub 1345 not opened | Accepted, marked unverified |
| Note 11: next year's preparer is Priya (tl-28) | tl-28 actor st-01, 2027-01-15 | Accepted (section 2, section 4) |
| Mask-format anchor (26 CFR 301.6109-4) | Opened: first five digits to X's; never on anything filed | Added (section 3) |

## Sources

- 16 CFR 314.4, Safeguards Rule elements (opened): https://www.law.cornell.edu/cfr/text/16/314.4 (ecfr.gov redirected to a block page)
- 16 CFR 314.6, small-firm exemptions (opened): https://www.law.cornell.edu/cfr/text/16/314.6
- FTC, "FTC Safeguards Rule: What Your Business Needs to Know" (opened): https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know
- 26 CFR 301.7216-2, uses and disclosures without consent (opened): https://www.law.cornell.edu/cfr/text/26/301.7216-2
- 26 CFR 301.7216-3, consent requirements, 1-year default, no retroactive consent (opened): https://www.law.cornell.edu/cfr/text/26/301.7216-3
- Rev. Proc. 2013-14, in IRB 2013-3 (opened, §5.04–5.05): https://www.irs.gov/irb/2013-03_IRB
- 26 CFR 301.6109-4, truncated TINs (opened): https://www.law.cornell.edu/cfr/text/26/301.6109-4
- 31 CFR 10.36, Circular 230 procedures (opened): https://www.law.cornell.edu/cfr/text/31/10.36
- 26 USC 6501(c)(8) (opened): https://www.law.cornell.edu/uscode/text/26/6501
- IRS, "How long should I keep records?" (opened): https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records
- IRS, Self-Select PIN method (opened): https://www.irs.gov/e-file-providers/self-select-pin-method-for-forms-1040-and-4868-modernized-e-file-mef
- IRS Pub 4557, Rev. 6-2024 (opened; text read with pypdf): https://www.irs.gov/pub/irs-pdf/p4557.pdf
- IRS Pub 5708, Rev. 8-2024, WISP template (opened; text read with pypdf): https://www.irs.gov/pub/irs-pdf/p5708.pdf
- IRS Pub 1345, keeping 8879 records: **unverified** (not opened)
- AICPA SQMS 1 scope, Journal of Accountancy, Aug 2025 (opened): https://www.journalofaccountancy.com/news/2025/aug/aicpa-unveils-new-qm-resources-to-help-firms-meet-dec-15-deadline/
- Practice-management tools, used as a pattern reference: Karbon Time & Budgets offers "time and dollar estimates" and lets firms "compare budgets against actuals" (opened): https://www.accountingtoday.com/news/karbon-releases-time-budgets. TaxDome's audit trail logs document views (per a search summary); whether its entries can be deleted is **unverified** (https://help.taxdome.com/category/reference-activity-audit returned 403). No CCH Axcess access-log documentation was found (**unverified**).
