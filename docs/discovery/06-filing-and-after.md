# Discovery 6 — Filing and after

Written 16 Oct 2026, ~03:50 UTC (`date -u`: Fri 16 Oct 03:47 UTC). Part 6 of 8 in the section-by-section discovery of the brief's "What it must do".
Every number below was measured from the packet (read-only) with scripts in the session scratchpad
(`disc/filing/f1.py` … `f10.py`, `measure.py`, `fixsum.py`, `r1.py`, all run as `python3 -I`). Revised after an independent review; see section 9. Outside rules are cited inline. Anything
not opened at its source is marked **unverified**. Nothing here is a decision yet; proposals are marked as such.

## 1. What the brief asks

> Filing and after: extensions, filing, e-file rejections, the client's copy. Freeze at filing; amend on top. Answer a
> notice with a self-contained record. Carry everything forward with its history, and plan next year.

Six jobs: **extension**, **file and handle a reject**, **client's copy**, **freeze, then amend on top**, **notice
response**, **carry forward and plan**.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| What "now" means | `readme.where_now_is`: v3 (23 Jun 2026) is "the current return". 12 of the 29 timeline events come after v3 and are "scripted for replay". Where they mention amounts, "they mean the return as your workpaper finalizes it" | **The filed return is not v3. It is whatever the workpaper finalizes.** Post-filing amounts have to be computed from it, not read from the packet |
| Extension (14 Apr) | Sized from **v2**: federal balance 35,728, rounded up to **36,000** paid with Form 4868. California 0 with FTB 3519 because v2 showed a 9,131 refund. Done by st-02 (the reviewer) | The extension estimate was frozen on an older version. v3's tax is **4,492 higher** than v2's |
| Signature | Form 8879 and FTB 8879 signed **10 Jul**, 17 days after v3. msg-07 (crypto cost, GT-B03) and msg-08 (church gift) arrived *between* v3 and signing | What the client signed may not be v3 |
| E-file | 4 records. Federal **rejected 13 Jul 17:04** with R0000-504-02 (Theo's dependent TIN, GT-A05); California **not transmitted** ("STATE-HOLD"). D71 (SS card) arrived **1.97 h** later. Federal accepted 14 Jul 16:22 (**23.3 h** after the reject); California 15 Jul 02:10 | Reject, fix and resubmit all inside one day; the state follows the federal |
| Was it filed? | Yes. Transcript (as of 3 Aug 2026) code 150, "Return filed and tax assessed", 14 Jul 2026, amount = "total tax on the return as filed (your final return)" | Filed and accepted, three months before the extended due date (15 Oct) |
| Payment | Federal balance paid by direct debit **20 Jul**, **6 days after filing**, coded **TC 610 "Payment with return"**. Transcript 3 Aug: code 196/276, interest and failure-to-pay penalty assessed | The two codes contradict each other; see section 3 |
| Payment ratio | v3 payments 77,742 / total tax 81,962 = **94.85%** paid by 15 Apr (**93.63%** after GT-A04's 1,000) | Passes the 90% test for the extension penalty relief |
| Effect of the known fixes (**hypothesis**) | The 16 ledger items with a federal *tax* number, **excluding GT-A04** (a payment change, not a tax change), sum to **−10,113**, each taken alone (`fixsum.py`). Adding GT-A04's 1,000 to the balance: 4,220 + 1,000 − 10,113 ≈ **refund of ~4,900**. This ignores interactions, and **the return is in AMT** (tentative minimum tax 63,202 > regular tax 59,331, `F6251.11` = 3,871). Deduction fixes (e.g. GT-D02, property tax) partly disappear in the AMT add-back. SALT is also at the cap (41,290 before the 40,000 limit). Every fix also moves the minimum tax credit carryover | Only the direction is solid: GT-A01 alone (−15,536) exceeds the 4,220 due. If the finalized return is a refund, the scripted payment, penalty and interest events may not happen at all |
| California | v3 refund 8,256; refund issued 21 Aug. The FTB account holds the 3,500 Sept payment as a **2024** credit, while the return claims it (GT-A03) | A refund paid on v3 would be 3,500 too high. **No FTB adjustment notice is in the packet** |
| Notices | 2: CP2000 for 2023 (resolved, no change); **Letter 566 for 2025, dated 20 Jan 2028**, received 26 Jan, response due **19 Feb 2028** (30 days from the letter date, 24 days after receipt) | The due date counts from the letter date, not from receipt |
| Letter 566 items | As written: (1) "Noncash charitable contributions claimed on Schedule A line 12 (Form 8283): provide acknowledgments and valuation." (2) "Schedule C gross receipts: reconcile to Forms 1099-NEC (142,000) and Form 1099-K (12,400) filed by third parties." The letter names no gift amount. On the return, `SchA.12` = 20,500 (stock 14,500 + car **6,000** → GT-D03; the 1098-C says 2,900) and `SchC.1` = 163,700 (→ GT-C01, 12,400 counted twice). D72 itself is a one-line pointer to this record | **The examiner targets two mistakes already in our ledger: one against the client, one in the client's favour** |
| Transcripts | 2 snapshots (12 Mar 2026: 4 estimates of 3,000; 3 Aug 2026: +extension, filing, payment, penalty) | Agency records are dated evidence; the March one already disproved the 4,000 Q4 guess |
| Carryovers in | 4 non-zero: capital loss 3,200 short / 11,000 long; suspended passive 6,300 (Fremont) / 9,850 (Barton Hills). All consumed in v3 (`SchD.6`, `SchD.14`, `F8582.1c`) | Each needs a link from last year's figure to the line that used it |
| Carryovers out | 11 federal + 3 California keys. Non-zero: minimum tax credit **3,871** (v1 3,722, v2 3,700: moves every version), Ridgeline capital account 63,660, SEP excess 2,786; California depreciation basis differences on 4 assets | Carryovers are outputs of a version, so they must freeze with it |
| Missing carryover | **0** keys for the ISO's AMT basis (1,000 shares, granted 1 Mar 2022, exercised 30 Jul 2025 at 12, FMV 52, still held per qa-06). The same search finds `minimum_tax_credit…`, so the zero could have been non-zero. California AMT is not computed: `F540NR.61` = 0 and the engine flags `CA_AMT_NOT_COMPUTED` | **Suspected new mistake**, federal and California; section 3 |
| 2026 planning | `planning_reference_2026`: federal dates 15 Apr, 15 Jun, 15 Sep 2026, 15 Jan 2027; safe harbor 110% of 2025 tax. California 30% / 40% / 30% on 15 Apr, 15 Jun 2026, 15 Jan 2027. By filing day, **2 of 4 federal dates and 70% of California's installments** had passed | Planning at filing is already late. The safe harbor keys off the *final* 2025 tax, which a superseding or amended return moves |

## 3. The headline insight: "filed" is a fork, not an end

The packet does not give a filed return. It gives a script that branches on what the workpaper finalizes. Four
findings follow from that.

1. **Whether a penalty is owed depends on a fact the packet gets wrong.** Two tests decide penalty relief on an
   extension. (i) At least 90% of the tax was paid by 15 Apr. (ii) "any balance due shown on the … return is remitted
   with the return" ([Treas. Reg. §301.6651-1(c)(3)](https://www.law.cornell.edu/cfr/text/26/301.6651-1);
   [Form 4868, 2025](https://www.irs.gov/pub/irs-pdf/f4868.pdf): "The remaining balance is paid with your return").
   The IRS applies this automatically: "IRS computers are programmed to automatically apply this waiver"
   ([IRM 20.1.2.2.3.1(5)–(6)](https://www.irs.gov/irm/part20/irm_20-001-002r)). Test (i) passes at 94.85%. Test
   (ii) depends on what the 20 Jul debit was. For an electronic funds withdrawal (a direct debit set up with the
   e-filed return), "After the due date, the payment date must be the same as the date the return is transmitted, or
   be within the previous five days of that date" ([IRS, EFW](https://www.irs.gov/payments/pay-taxes-by-electronic-funds-withdrawal)).
   So a debit filed with the 14 Jul return could not carry a 20 Jul date. Two branches (`r1.py`, on v3's 4,220):

   | Branch | What 20 Jul is | Failure-to-pay penalty | Interest (7%, 15 Apr → 20 Jul, 96 days) |
   |---|---|---|---|
   | A | Settlement of the debit set up with the 14 Jul return: remitted with the return | **None** (test ii passes) | **≈ 78** |
   | B | A separate payment made after filing | 4 months × 0.5% × 4,220 = **84.40** (runs from 16 Apr) | **≈ 78** |

   **Suspected packet mistake:** the transcript codes the payment **TC 610 "Payment with return"** (branch A) yet
   assesses **196/276** including a failure-to-pay penalty (branch B). Those cannot both hold. The app should
   compute both from `post_filing_rates`, show which branch the facts support, and not echo "computed by IRS". Both
   branches disappear if the finalized return is a refund. The design lesson stands either way: the payment date is
   a review item, and the EFW rule *requires* a filing-day date after the due date.
2. **The exam letter lands on known mistakes.** Both Letter 566 items are ledger entries (GT-D03, GT-C01). Fixing them
   before 20 Jan 2028 is worth more than fixing them after. An amended return filed before the IRS "first
   contacted" the taxpayer about an examination is a *qualified amended return*: its extra tax counts as tax "shown on
   the return", which removes the base for the 20% accuracy penalty
   ([Treas. Reg. §1.6664-2(c)(2)–(3)](https://www.law.cornell.edu/cfr/text/26/1.6664-2)). After the letter, that window
   is closed. The design should treat every open ledger item on a filed return as racing that date.
3. **"Amend on top" has two kinds.** A second return filed before the extended due date (15 Oct 2026) is a
   *superseding* return, which replaces the original. One filed after is an *amended* return (Form 1040-X)
   ([National Taxpayer Advocate](https://www.taxpayeradvocate.irs.gov/news/nta-blog/nta-blog-did-you-file-a-superseding-return-if-so-read-on/2021/03/)).
   This packet's filing (14 Jul) left a 3-month superseding window. msg-07's crypto cost and the D71 card both arrived
   inside it.
4. **Suspected packet mistake (not in the ledger): the ISO's AMT basis is not carried forward, federal or
   California.** `F6251.2i` adds 40,000 for 1,000 ISO shares held at year end (D12: granted 1 Mar 2022, exercised
   30 Jul 2025 at 12, FMV 52). Those shares now have a regular basis of 12,000 and a federal AMT basis of 52,000.
   When they are sold, the AMT gain is 40,000 smaller. Without the record, a 2026+ sale is taxed twice for AMT.
   `carryovers_out` holds the federal credit (3,871) but not the basis it depends on.
   - **California twin.** Ngozi was a California resident until 14 Jul 2025 and exercised 16 days later. The option
     was granted while she worked in California, so much of the spread is probably California-source. *(Allocation
     by workdays from grant to exercise is the reviewer's reading, not verified here.)*
   - The engine did not compute California AMT: `F540NR.61` = 0 and the engine flags `CA_AMT_NOT_COMPUTED`. So the
     California AMT basis and any California minimum tax credit are missing too.
   - The carry-forward record needs federal and California AMT basis per lot, plus both credits.
   - Severity: medium for 2026+. For 2025 it is unknown on the California side.
   - It should become a ledger entry with a test (project rule). Logging it is the coordinator's call; this
     section writes only this file.

## 4. What each role needs from Filing and after (domain view)

- **Preparer:** one button to freeze and transmit. Rejects arrive with the business rule, the field it points at,
  and the fix. A check before re-transmitting that says whether a new 8879 is needed: Pub 1345 requires a new
  signature when AGI or total income moves more than $50, or total tax, withholding, refund or amount owed moves more
  than $14 ([Pub 1345 Rev. 12-2025](https://www.irs.gov/pub/irs-pdf/p1345.pdf), PDF pp. 18 and 25). Theo's SSN fix needs
  none; folding in msg-07 (−1,312) does.
- **Reviewer / partner:** sees exactly what was transmitted (submission ID, version hash). After filing, sees each
  newly found error with its tax effect and its deadlines (superseding until 15 Oct 2026; qualified-amended until
  exam contact; refund claim until 14 Jul 2029).
- **Client:** a complete copy of the return, given no later than when it is presented for signature
  ([26 U.S.C. §6107(a)](https://www.law.cornell.edu/uscode/text/26/6107)), and copies of any re-transmitted data
  (Pub 1345, PDF p. 25). Told of a reject within 24 hours if the firm can't fix it (PDF p. 25). A post-filing record
  showing what was paid, when, what it cost in interest, and what is due next.
- **Firm administrator:** retention clocks per artefact: 8879 for 3 years from the due date or IRS receipt date,
  whichever is later (Pub 1345, PDF p. 22); a copy or list of returns for 3 years (§6107(b)); carryforward records for as
  long as the item lives.
- **Next year's preparer** (15 Jan 2027, tl-28): every carryover with its origin (year, version, line, evidence),
  plus non-numeric carry-forwards: open items, elections, the AMT basis, California basis differences.
- **IRS examiner (Jan 2028):** a response package that stands alone. For each item: the filed figure, its documents,
  the reconciliation, who verified it. The IRS asks for copies, organised and complete, and disallows items not
  supported by the due date ([TAS, Letter 566 series](https://www.taxpayeradvocate.irs.gov/notices/letter-notifying-taxpayer-of-audit-with-request-for-additional-information/)).

## 5. Edge cases

**Obvious (the packet has each one):**
1. **E-file reject with the state held** (13 Jul). The state follows the federal.
2. **Extension sized on an old version** (v2; v3 is 4,492 higher). The extension amount must name its source version. An
   extension is valid only if it carries a proper good-faith estimate (Reg. §1.6081-4(b); *Crocker*, 92 T.C. 899: the
   reviewer's citations, not opened here). California needs no form at all: the extension is automatic, and "If you do
   not owe tax, do not complete or mail form FTB 3519" ([FTB 3519, 2025](https://www.ftb.ca.gov/forms/2025/2025-3519.pdf);
   seen via an ftb.ca.gov search excerpt, direct fetch blocked). So the packet's "FTB 3519 with 0" describes a form that
   should not exist.
3. **Balance paid after 15 Apr**, with interest and penalty (tl-25, transcript 196/276). An extension to file is not an
   extension to pay (`post_filing_rates.note`; Form 4868).
4. **Notice after filing** (Letter 566, D72) and a resolved older one (CP2000 2023, D70).
5. **Carryovers in and out**, including a value that changes every version (minimum tax credit 3,722 → 3,700 → 3,871).
6. **Information after signing** (msg-07, msg-08 before the 8879; D71 after the reject).

**Not obvious:**
1. **Pay date ≠ file date** may cost the penalty relief (section 3.1, branch B). After the due date, a debit must be
   dated on the transmission day or within the five days before it. The debit date belongs on the review checklist.
2. **The 5-day "perfection" rule doesn't apply here.** A rejected return counts as timely if corrected by the fifth
   day *after the due date* (Pub 1345, PDF p. 25). With a 15 Oct due date, July rejects have months of slack. Don't
   hard-code "5 days from reject".
3. **R0000-504-02 covers SSN *or* name.** The rule checks the dependent's SSN against the last name
   ([IRS, R0000-504-02](https://www.irs.gov/filing/free-file-fillable-forms/r0000-504-02)). Theo's surname is hyphenated
   (Lindqvist-Okafor), a common second cause. Check both before resubmitting.
4. **The signed version may differ from the filed version.** Signature, frozen version and submission must be bound
   together, with a re-sign test on every change.
5. **A filed refund can be wrong at the agency.** The California refund includes a payment FTB holds for 2024
   (GT-A03). Expect an FTB adjustment the packet never shows. The app should predict it, not wait for it.
6. **Known-error duties.** On learning of an error in a filed return, the CPA must promptly tell the client, explain
   the consequences and recommend corrective action, but cannot tell the IRS without consent. In an exam, the CPA
   should ask the client to agree to disclose a known error
   (revised SSTS No. 1 §1.2 "Knowledge of Errors", effective 1 Jan 2024: ¶1.2.6 "promptly inform the client of the
   potential consequences of the error and recommend corrective action"; ¶1.2.8 "not allowed to inform the taxing
   authority of an error without the taxpayer's permission"
   ([The Tax Adviser, Nov 2023](https://www.thetaxadviser.com/issues/2023/nov/understanding-the-updated-tax-ethical-standards/));
   same duty under the earlier SSTS No. 6
   ([AICPA FAQ](https://www.aicpa-cima.com/resources/article/faqs-for-statement-on-standards-for-tax-services-no-6-knowledge-of-error))).
   GT-D03 is exactly this case in the 2028 exam. The client's own 1098-C (box 4c: 2,900) disproves the 6,000, and
   §170(f)(12) limits a sold vehicle to the gross proceeds (rule as stated in GT-D03 and the review; statute not opened here). The response package must include Form 8283 and the
   1098-C.
7. **Netting in the exam.** GT-C01 overstates income by 12,400. The response should raise it as a
   taxpayer-favourable offset against the car adjustment, with the payer-level reconciliation.
8. **Each year has its own open window.** 2025: assessment until 14 Jul 2029 (3 years from filing,
   [§6501(a)](https://www.law.cornell.edu/uscode/text/26/6501)). 2024: filed early on 11 Apr 2025, so it counts as
   filed 15 Apr 2025 (§6501(b)(1)) and stays open to 15 Apr 2028. That covers the 2028 exam, and the 2024 office
   error (GT-C10) lives there. 2023: if a Form 3520 was required and never filed (GT-B05), §6501(c)(8) keeps the year
   open until 3 years after the information is given. That is the whole year, or only the related items if there
   was reasonable cause.
9. **Refund claims have their own clock.** Overstatements (GT-A01 −15,536) can be claimed on Form 1040-X within
   3 years of filing or 2 years of payment, whichever is later
   ([1040-X instructions](https://www.irs.gov/instructions/i1040x)). For 2025 that runs to 14 Jul 2029.
10. **IP PINs expire yearly.** Ngozi's PIN (D03) covers returns filed in 2026. An amended return filed in 2027 or
    2028 needs that year's PIN, and "Do not use an IP PIN from a prior year, even if amending"
    (1040-X instructions).
11. **California follows the IRS, but only upward.** Report "within six months after the date of each final federal
    determination", but for individuals "changes or corrections need not be reported unless they increase the amount
    of tax payable" ([R&TC §18622(a)](https://california.public.law/codes/revenue_and_taxation_code_section_18622)).
    GT-D03 (car, +149 CA) would trigger a report; GT-C01 (−384 CA) would not. The notice record should spawn a state
    task carrying that test, netted on the final determination.
12. **Planning after half the year is gone.** At filing, two 2026 federal estimates and California's 30% + 40%
    installments (15 Apr, 15 Jun) were already due. The 110% safe harbor uses the *final* 2025 tax, which a
    superseding or amended return changes. California
    refunded 8,256 by direct deposit instead of applying it to 2026, though California still taxes the Sacramento
    rental in 2026. Pub 1345 also says a direct-deposit election can't be cancelled after filing (Pub 1345, PDF p. 15).
13. **The "client's copy" must be the accepted submission**, not the version presented on 10 Jul if anything changed.

The packet has no example of a paper fallback, a superseding return, a missed extension, or an installment
agreement.

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Filed version**: an immutable snapshot with a content hash. It records its jurisdiction, the 8879 signature
  event(s) bound to the hash, and the submission(s). Pub 1345 requires a signed record to be "tamper-proof … lock a
  document and prevent it from being changed" (Pub 1345, PDF p. 21).
- **Submission**: submission ID, time, status (accepted / rejected / held / not transmitted), errors with business
  rule and field, ack time, payment instruction (debit date and amount), refund account. A reject links to the field
  and the fix.
- **Successor return**: typed *superseding* or *amended*, with a parent filed version, a reason per change (each
  linked to a ledger item), and a re-sign test result. The original is never edited.
- **Agency record**: dated transcript snapshots and FTB account records, reconciled to the return's payments.
- **Notice case**: agency, year, dated, received, response due, items. Each item links to the frozen lines, the
  evidence, known ledger mistakes and the computed effect. It exports as one self-contained package and spawns
  follow-ups (state report, affirmative offsets).
- **Deadline set per year**, computed from filing facts: due dates, superseding window, assessment date, refund
  claim date, qualified-amended cut-off (first exam contact), state report date, retention dates.
- **Carryforward ledger**: item, amount, origin (year, version, line, evidence), the next-year line that consumed it,
  history. It also covers non-numbers: AMT basis by lot, California basis differences, open items, elections.
- **Replay engine**: post-filing events are templates whose amounts come from the finalized return, so a refund
  correctly removes the "balance paid" and penalty steps. Proposed rule for the notice: **the 2028 letter fires
  regardless**, because its items are keyed to the *filed* values. A fix made before 20 Jan 2028 (superseding or
  qualified amended return) changes the outcome (no accuracy penalty, smaller or nil adjustment), not the trigger.
  If the finalized return already fixed both items, the response shows the filed figures already agree with the
  documents.

## 7. Questions for Aarvin (only what this section needs)

1. **Which return is "filed"?** (a) Build a finalized version (v3 plus accepted fixes) and replay filing on it,
   leaving later finds (e.g. msg-07) as superseding or amended candidates. Or (b) treat v3 as filed and show every
   ledger mistake as an amendment. (a) matches the readme; (b) is simpler and shows "amend on top" more often.
2. **Notice response:** is an in-app case view enough, or must it export a standalone package (HTML/PDF) for the
   examiner?

## 8. Handed to other sections

- Two-spouse PIN binding and voiding the 8879 when the return changes → **People** (05).
- Change history between v3, signing and filing; superseding vs amended mechanics in the version graph → **Change** (03).
- Tax effects of the ledger fixes and their interactions; California AMT on the ISO (`CA_AMT_NOT_COMPUTED`) → **Calculation**.
- Whether to amend for understatements (a client decision with a recorded rationale) → **Judgment** (04).
- Plaintext taxpayer, spouse, ERO and IP PINs in the timeline and firm record; FBAR (15 Oct 2026) and late 1099-NEC
  deadlines outside the engagement → **Firm**.
- S corporation basis ending at 0 with 2023 basis missing; Ridgeline outside basis never computed → **Records a CPA expects**.

## Sources

- IRS Pub 1345 (Rev. 12-2025), fetched and text-extracted (page refs are PDF page indices): https://www.irs.gov/pub/irs-pdf/p1345.pdf
- IRS Form 4868 (2025), fetched and text-extracted: https://www.irs.gov/pub/irs-pdf/f4868.pdf
- Treas. Reg. §301.6651-1 (Cornell LII; eCFR redirected): https://www.law.cornell.edu/cfr/text/26/301.6651-1
- Treas. Reg. §1.6664-2: https://www.law.cornell.edu/cfr/text/26/1.6664-2
- 26 U.S.C. §6501: https://www.law.cornell.edu/uscode/text/26/6501
- 26 U.S.C. §6107: https://www.law.cornell.edu/uscode/text/26/6107
- Instructions for Form 1040-X: https://www.irs.gov/instructions/i1040x
- IRS, Business Rule R0000-504-02: https://www.irs.gov/filing/free-file-fillable-forms/r0000-504-02
- Taxpayer Advocate Service, Letter 566 series: https://www.taxpayeradvocate.irs.gov/notices/letter-notifying-taxpayer-of-audit-with-request-for-additional-information/
- National Taxpayer Advocate blog, superseding vs amended returns: https://www.taxpayeradvocate.irs.gov/news/nta-blog/nta-blog-did-you-file-a-superseding-return-if-so-read-on/2021/03/
- AICPA, FAQs for SSTS No. 6 (pre-2024): https://www.aicpa-cima.com/resources/article/faqs-for-statement-on-standards-for-tax-services-no-6-knowledge-of-error
- The Tax Adviser, revised SSTS (Nov 2023), fetched: https://www.thetaxadviser.com/issues/2023/nov/understanding-the-updated-tax-ethical-standards/
- Cal. R&TC §18622 (California Public Law), fetched: https://california.public.law/codes/revenue_and_taxation_code_section_18622
- FTB 3519 (2025), ftb.ca.gov search excerpt only (direct fetch 403): https://www.ftb.ca.gov/forms/2025/2025-3519.pdf
- IRS, Pay taxes by electronic funds withdrawal, fetched: https://www.irs.gov/payments/pay-taxes-by-electronic-funds-withdrawal
- IRM 20.1.2.2.3.1 (Extensions of time to file), fetched: https://www.irs.gov/irm/part20/irm_20-001-002r
- Treas. Reg. §1.6081-4(b) and *Crocker v. Commissioner*, 92 T.C. 899 (1989): cited from the review, **not opened**
- FTB, "IRS changed your federal tax return" (403; superseded here by the statute text): https://www.ftb.ca.gov/file/after-you-file/amend-a-return/irs-changed-your-federal-tax-return.html

## 9. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/06-filing-and-after-review.md`. Each finding was re-probed (`r1.py`; sources fetched
16 Oct 2026) before it was accepted.

| # | Finding | Probe | Action |
|---|---|---|---|
| 1 | §3.1 stated the penalty cause as fact | EFW page and IRM 20.1.2.2.3.1(5)–(6) fetched; 96 days, interest 77.69, penalty 84.40 recomputed | **Accepted.** Rewritten as two branches; TC 610 vs 196/276 named as a suspected packet mistake |
| 2 | "~4,900 refund" is a hypothesis | `F6251.9` 63,202 > `F6251.10` 59,331 confirmed. Also found SALT is at the cap (41,290 before the limit), which shrinks GT-D02 further | **Accepted.** Labelled a hypothesis; GT-A04 exclusion and AMT damping stated |
| 3 | R&TC §18622 qualifier | Statute text fetched | **Accepted.** Reporting needed only for increases; D03 triggers it, C01 does not |
| 4 | SSTS §1.2 verified | The Tax Adviser fetched (¶1.2.6, ¶1.2.8, effective 1 Jan 2024) | **Accepted.** "Unverified" removed |
| 5 | CA extension automatic | ftb.ca.gov search excerpt (FTB 3519 2025); direct fetch still 403 | **Accepted, at excerpt level.** Added that a $0 FTB 3519 should not exist |
| 6 | ISO finding under-scoped | `F540NR.61` = 0, `CA_AMT_NOT_COMPUTED`, D12 grant 1 Mar 2022 confirmed | **Accepted.** California AMT basis and credit added. Workday sourcing kept as the reviewer's reading. Ledger entry left to the coordinator (this section writes one file only) |
| 7 | Quote Letter 566 as written; due date from letter date; include 8283 and 1098-C | Notice text re-read; 20 Jan + 30 days = 19 Feb | **Accepted** |
| 8 | Replay rule for the 2028 letter | n/a (design) | **Accepted** as a proposal in section 6 |
| 9 | Planning: final tax moves the safe harbor; CA installments passed | `planning_reference_2026` re-read | **Accepted** |
| 10 | Extension needs a proper estimate | Not opened | **Accepted as a note**, marked not opened |
| 11 | "Probably avoided" is too weak | EFW rule fetched | **Accepted**, folded into §3.1 |

Nothing rejected. One nuance kept: the reviewer counts 17 ledger numbers summing to −9,113 with GT-A04 included.
This doc keeps 16 items summing to −10,113 with GT-A04 applied to the balance. The two sums are the same arithmetic
and give the same −4,893.

