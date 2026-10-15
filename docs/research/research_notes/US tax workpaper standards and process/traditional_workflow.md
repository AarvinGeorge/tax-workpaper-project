# Traditional US CPA practice: preparing, documenting and reviewing a Form 1040

Researched 15 Oct 2026, using 16 web search and fetch calls. Source quality is mixed. Few primary professional sources (Journal of Accountancy, The Tax Adviser) could be fetched in full. Much of the concrete product detail comes from vendor pages, and those claims are labelled "vendor claim". Anything without a URL is marked **unverified**: it is general practitioner knowledge that I could not confirm this session.

---

## 1. Anatomy of a 1040 workpaper file

### Takeaway
A 1040 file has three layers:
- the **binder**, which is the whole engagement;
- **lead sheets**, which summarise one area each and tie return lines to sources;
- **workpapers**, the detail behind each number: source documents, calculations and notes.

The file is organised by an **index that follows the order of the 1040**. Tick marks, annotations and cross-references tie each return amount to its source document. Today this is mostly digital (PDF binders such as SPbinder), but it copies the conventions of the paper binder.

### Cited Findings
- **Three layers.** "The binder is the full engagement file, the leadsheet is the section summary, and the workpaper is the detailed support for a number or conclusion." — [Soraban, vendor blog](https://www.soraban.com/accounting-workpapers)
- **What a review-ready file holds:** intake status, documents received, notes on missing items, calculations and adjustments, preparer and reviewer notes, and sign-off status. Examples include depreciation schedules, K-1 tracking, charitable contribution support and estimated payment records. — [Soraban, vendor blog](https://www.soraban.com/accounting-workpapers)
- **Index follows the 1040.** SPbinder "automatically bookmark[s] and organize[s] tax documents in a work-paper index that follows the flow of a 1040 tax return." It accepts PDFs, spreadsheets, word-processing files and email. — [Thomson Reuters SPbinder, vendor claim](https://tax.thomsonreuters.com/en/products/spbinder.html)
- **OCR scanning feeds the same kind of index.** SurePrep 1040SCAN bookmarks source documents into a standard workpaper index in return order. With CCH Axcess Tax, the data and index go to SPbinder, which builds lead sheets showing variances, and the final data is exported back to the tax software. — [Thomson Reuters SurePrep 1040SCAN, vendor claim](https://Tax.ThomsonReuters.com/en/products/sureprep-1040scan); [SurePrep + CCH Axcess, vendor claim](https://tax.thomsonreuters.com/en/accounting-solutions/c/sureprep-cch-axcess-tax-end-to-end-efficiency)
- **Lead sheets in the paper era.** "Preparers used workpaper leadsheets to tie amounts on 1040 tax returns to their related source documents." SPbinder's digital lead sheets create those cross-references automatically. — [Thomson Reuters white paper landing page, vendor claim](https://tax.thomsonreuters.com/en/insights/white-papers/maximize-review-efficiency-with-spbinders-work-paper-lead-sheets/form)
- **How tick marks and cross-references work digitally:**
  - Workpapers carry "tick marks, annotations, notes, and hyperlinked cross-references". — [SPbinder, vendor claim](https://tax.thomsonreuters.com/en/products/spbinder.html)
  - A cross-reference is a hyperlinked annotation from an amount on one workpaper to another. It is strictly one-to-one: one link cannot point to several places. — [SPbinder search result](https://tax.thomsonreuters.com/en/products/spbinder.html)
  - CaseWare Working Papers defines an annotation as "notes, tickmarks, references and commentary" attached to items in the file. — [CaseWare docs](https://documentation.caseware.com/2021/WorkingPapers/en/Content/Engagements/Review-Signoff/Annotation.htm)
- **Patent.** Software that creates "cross-reference links, tables and lead sheets for tax return documents" is patented (SurePrep lineage). — [US7610227B2](https://patents.google.com/patent/US7610227B2)
- **Prior-year comparison.** SPbinder's Two Year Comparison sheet shows 1040 amounts with columns for current year, prior year, difference in dollars and difference in percent. Lead sheets can also carry prior-year amounts. — [TR SurePrep help: prior-year amounts in leadsheets](https://www.thomsonreuters.com/en-us/help/sureprep/spbinder/leadsheets/prior-year-amounts-in-leadsheets)
- **Some workpaper practice is firm-specific.** One firm's checklist requires preparers to:
  - compare the current return with the prior year;
  - document explanations for large variances or unexpected items in the workpapers or return comments;
  - reconcile to the CCH Axcess Interest and Dividend Summary and Passthrough Recap schedules.

  — [KSM "One KSM Way" quick checklist](https://ksm.freshservice.com/support/solutions/articles/20000123925)
- **Open items.** Missing items are flagged so a reviewer can tell routine gaps from gaps that change the return. Examples: "A missing charitable receipt may need follow-up"; "A corrected brokerage statement may change a calculation." — [Soraban, vendor blog](https://www.soraban.com/accounting-workpapers)

### Inferences
- Every artifact serves the same promise: a reviewer can go from any return line → lead sheet → workpaper → source page without asking anyone. The index, tick marks and cross-references are how a flat paper medium kept that promise.
- Digital binders mostly put paper conventions onto PDFs. A cross-reference is still a link drawn by hand (or by OCR) between two pages, not a property of the number itself.

### Gaps
- **Unverified (no source fetched):**
  - The split between a **permanent file** (carryovers, basis records, prior returns, entity documents, engagement history) and a **current-year file**.
  - Typical index codes, for example letter or number tabs per area: A = admin and correspondence, W-2s, interest and dividends, Schedule C, D, E and so on. Conventions vary by firm, and no neutral standard was found.
  - A standard tick-mark legend: for example "agreed to source", "footed", "agreed to prior year", "recomputed", each defined on a legend page.
  - Typical carryover schedules: capital loss, passive loss, NOL, charitable, AMT credit, §179, basis.
  - The contents of **client organizers** (prior-year figures plus a yes/no questionnaire) and **PBC lists**.
- No public PPC or AICPA sample index was available; it sits behind a paywall in the PPC 1040 Deskbook.

**Implication for the tool:** Model the chain (return line → summary → evidence → source page and field) as data, so a reference is a property of each number rather than a drawn link. Keep the familiar views (an index in 1040 order, tick-mark-style verification states, a prior-year column with $ and % change) so a CPA recognises the file at once.

---

## 2. Review process

### Takeaway
Review runs in layers: preparer → reviewer (senior or manager, a detail review) → signing partner, with a concurring review for complex returns (unverified). Review notes go back to the preparer, are cleared once the change is confirmed, and every level signs off. Reviewers rely heavily on software diagnostics, override and estimate reports, and a two-year comparison. Checklists such as PPC's 1040 preparation and review checklists, or firm checklists, set out the work.

### Cited Findings
- **Order of review.** The return goes back to the preparer with review notes. The notes are cleared when the changes come back, the reviewer signs off on the workpapers used, and the folder goes to the signing partner. — [CPA Trendlines, "How to Review Tax Returns" book outline](https://cpatrendlines.com/shop/htrtr/)
- **That book's chapter list** includes "topside review", "partner review at signing" and reviewer checklists for individual returns. — [CPA Trendlines](https://cpatrendlines.com/shop/htrtr/)
- **A CPE webinar** covers quality control in review, choosing and training reviewers, cutting review bottlenecks, and "seven types of tax return reviews". — [CPA Academy webinar listing](https://excelu.cpaacademy.org/archived_show/a0D2S00000fi1ZYUAY)
- **Layered review, and too many errors found late.** A supervisor's review should confirm that each earlier preparer or reviewer finished their work. Many errors appearing at a later stage suggests the earlier review was weak. — summary of the [NATP blog on review procedures](https://www.natptax.com/news-insights/blog/implementing-tax-return-review-procedures/) (403 on fetch; seen only as a search snippet, so **partially verified**)
- **Sign-off levels in software.** SPbinder supports "up to four sign-off levels". — [SPbinder, vendor claim](https://tax.thomsonreuters.com/en/products/spbinder.html)
- **Review notes in CCH Axcess Tax:**
  - Notes can be attached to a field, a worksheet view or the whole return, and are collected in a notes pane.
  - Diagnostics fall into four categories: e-file errors that must be cleared, warnings, cautions and informational alerts. Most informational alerts cannot be cleared.
  - Reviewers can list every **override and estimate** and clear them one at a time or in bulk.

  — [Wolters Kluwer, "Onscreen review is the next critical stage for tax workflow improvement" (2023), vendor claim](https://www.wolterskluwer.com/nl-nl/expert-insights/onscreen-review-is-the-next-critical-stage-for-tax-workflow-improvement)
- **What a good review note holds:** the issue, the assumption made, what was updated and what was resolved. "A note marked 'open' should mean the team still needs action." — [Soraban, vendor blog](https://www.soraban.com/accounting-workpapers)
- **Variance review.** Run a two-year comparison and investigate anything in it that lacks a logical explanation. — [NATP blog, solo preparers](https://www.natptax.com/news-insights/blog/solo-tax-preparers-need-a-sharper-second-look-before-filing/) (search snippet only)
- **PPC checklists** are inside the PPC 1040 Deskbook and its Interactive Practice Aids on Checkpoint. They include "return preparation and review checklists that guide you through troublesome areas" and can be completed online or exported. — [TR PPC Tax, vendor claim](https://tax.thomsonreuters.com/en/checkpoint/ppc-tax); [PPC 1040 Deskbook store page](https://store.tax.thomsonreuters.com/accounting/p/100200173)
- **Checklists as workpapers.** A TR checklist for converted returns "can serve as a workpaper". — [TR restoring/converted-returns PDF](https://www.thomsonreuters.com/content/dam/helpandsupp/en-us/Topics/ultratax/files/restoring-proseries.pdf)
- **Written review procedures.** Firm quality control should include a written tax procedures manual with "tracking procedures, checklists and return review procedures", and internal "tax practice reviews" that sample completed work. — [Journal of Accountancy, Dec 2000](https://www.journalofaccountancy.com/issues/2000/dec/qualitycontrolfortaxpractices/)

### Inferences
- Reviewers start from the exceptions: diagnostics, overrides and estimates, then big swings against the prior year. Only after that do they look at high-risk areas. A tool that leads with an exception queue matches how review is actually done.
- A review note is a small workflow object. It has a scope (field, form or return), an owner, a state (open, responded, cleared) and a resolution. Paper and PDF hold it as loose text.

### Gaps
- **Unverified:**
  - The exact meaning of "detail review" against "partner review" (a line-by-line tie-out against a topside or reasonableness review).
  - When firms require a **concurring or second-partner review**: typically high-net-worth, complex, or new-client returns.
  - Sign-off conventions such as the preparer's initials and date on each workpaper and the reviewer's initials beneath.
- The actual PPC 1040 checklist items could not be seen (paywalled).
- No primary Journal of Accountancy or Tax Adviser article on 1040 review levels could be fetched this session.

**Implication for the tool:** Treat sign-offs (role, person, timestamp, per workpaper) and review notes (scope, state, thread, resolution) as first-class records. Give the reviewer a front door that lists diagnostics, overrides and estimates, and large prior-year variances.

---

## 3. The season workflow end to end

### Takeaway
The order is:
1. engagement letter and §7216 consent
2. organizer and PBC list
3. document intake (portal or scan, with OCR into a bookmarked binder)
4. data entry or import into the tax software
5. diagnostics
6. layered review, with client questions in between
7. extension if needed
8. client approval and Form 8879 signature
9. e-file (MeF), with acknowledgments and reject handling
10. client copy delivered
11. file archived and locked

After filing come amendments, IRS notices and examinations, and next year's rollforward. Nearly every step after intake now happens in a separate software product.

### Cited Findings
- **Engagement letter:**
  - List the specific returns, including state returns by name, rather than "all required state returns".
  - Say whether non-income taxes are in scope, and exclude foreign filings unless agreed.
  - Use separate letters for business and individual work, and update and re-sign the letter every year.
  - Issue a new letter whenever a new service is added.
  - Require clients to upload through a secure portal, and track e-file acknowledgments every day.

  — [The Tax Adviser, "Risk mitigation best practices" (Aug 2021)](https://www.thetaxadviser.com/issues/2021/aug/risk-mitigation-best-practices/)
- **Small firms.** Engagement letters should state what the firm is not responsible for as well as what it is. — [The Tax Adviser, Nov 2018](https://www.thetaxadviser.com/issues/2018/nov/importance-engagement-letters-small-firms.html)
- **Intake by scan and OCR.** SurePrep 1040SCAN uses barcoded pages ("Bookmark Only" skips OCR verification). Documents then go through a Review Wizard: verification, child-form association, new-form review. — [TR SurePrep 2025 1040SCANverify policy](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-policy-statements/2025-1040scanverify-policy-1040-return)
- **Form 8879:**
  - It is the e-file signature authorization. The ERO obtains and keeps it, and it is not sent to the IRS.
  - It is generally signed by both the ERO and the taxpayer before transmission.
  - It is kept for **3 years** from the due date or the IRS received date, whichever is later.
  - The same applies to Form 8878 for extensions.

  — [IRS Form 8879](https://www.irs.gov/pub/irs-pdf/f8879.pdf); [The Tax Adviser, Jan 2018](https://www.thetaxadviser.com/issues/2018/jan/form-8879.html); [UltimateTax support](https://support.ultimatetax.com/hc/en-us/articles/201087118-Submitting-retaining-Forms-8879-and-8878)
- **ERO duties** also include providing copies of returns to taxpayers and making records available to the IRS on request. — [UltimateTax support (citing Pub 1345)](https://support.ultimatetax.com/hc/en-us/articles/201087118-Submitting-retaining-Forms-8879-and-8878)
- **Rejections:**
  - A timely 1040 or Form 4868 that is rejected can be fixed and resent within a **5-day perfection period**. Business returns get 10 days.
  - If the return cannot be fixed, file on paper by the later of the due date or 10 calendar days after the rejection notice, marked as a rejected electronic return.
  - The ERO must tell the taxpayer within 24 hours if a return cannot be fixed.
  - Larger changes need the taxpayer's authorization again.

  — [TR blog, grace periods for retransmission](https://tax.thomsonreuters.com/blog/cs-professional-suite/cs-tax-asset-management-solutions/grace-periods-for-retransmission-of-rejected-e-filed-returns-and-extensions/); [NATP blog on e-file rejection](https://www.natptax.com/news-insights/blog/e-file-rejection-tax-pro-steps-to-preserve-timely-filing/) (search snippets; **check against the current Pub 1345**)

### Inferences
- The workflow is a pipeline of handoffs across separate systems: portal, scan or OCR, tax engine, binder, e-signature, e-file, archive. The context about each number (who said what, and why) gets lost at every handoff.

### Gaps
- **Unverified** (general knowledge; no source fetched):
  - §7216 consent: Treas. Reg. §301.7216-3 written consent before using or disclosing return information for anything other than preparation.
  - Form 4868 extends the deadline to 15 Oct but not the time to pay.
  - Archiving and locking the file after filing.
  - Form 1040-X amendments, which can now be e-filed.
  - CP2000 under-reporter notices: answer by the date on the notice, typically 30 days.
  - IRS examination Information Document Requests (Form 4564).
  - Next-year rollforward: the software proforma carries prior-year data, carryovers and organizer contents forward.
- CCH Scan and AutoFlow, UltraTax, Lacerte, GoSystem and Drake: product details not confirmed this session.

**Implication for the tool:** Make each return's state explicit (intake → prepared → in review → client approval → filed → accepted or rejected → archived) and keep client answers, 8879 status and e-file acknowledgments in the same record as the numbers. Model next year's rollforward as a copy of carryovers that keeps their sources.

---

## 4. How the documentation is used later; what makes a file "self-contained"

### Takeaway
The file is read later by:
- next year's preparer;
- internal or peer reviewers;
- IRS examiners, through information document requests;
- the firm's defence lawyers if there is a malpractice claim.

Tax work causes most malpractice claims against CPAs, so the record of what the client said and what the firm advised is the firm's main defence. A self-contained file lets a stranger reconstruct every number and every judgment without the preparer in the room.

### Cited Findings
- **Most claims come from tax work.** About **66%** of claims against CPAs in the AICPA professional liability program in 2020 related to tax services. The commonest causes were improper tax treatment or advice and late filing. — [Journal of Accountancy, Feb 2021](https://www.journalofaccountancy.com/issues/2021/feb/cpa-firm-liability-advice-defending-tax-and-other-claims.html) (via search snippet)
- **An earlier CNA figure** put tax at 72% of claims (2016). — same search; source page not fetched (**partially verified**)
- **SSTS standards:**
  - SSTS No. 1: a return position needs a "realistic possibility of being sustained".
  - SSTS No. 3: the preparer may rely in good faith on client information unless it appears "incomplete, incorrect or inconsistent", which in practice means documenting the follow-up questions.
  - A revised SSTS took effect in 2024, with four statements: general, compliance, consulting and representation. **Check the current text.**

  — [Varsity Tutors REG summary](https://internal.varsitytutors.com/practice/subjects/cpa-regulation-reg/lessons/aicpa-statements); [Strafford CPE listing](https://www.straffordpub.com/products/aicpas-new-statements-on-standards-for-tax-services-assessing-tax-positions-safeguarding-data-handling-errors-2024-05-20)
- **Documenting advice.** Document the question, the facts and the answer for oral advice. Follow up in writing for important, unusual, high-value or complicated matters. — [The Tax Adviser, Aug 2021](https://www.thetaxadviser.com/issues/2021/aug/risk-mitigation-best-practices/)
- **Quality judged three ways.** Tax practice reviews judge work on whether it "was substantively correct, was documented in the files and was communicated to the client in understandable form". — [Journal of Accountancy, Dec 2000](https://www.journalofaccountancy.com/issues/2000/dec/qualitycontrolfortaxpractices/)
- **Tie every material amount.** Reconcile every material return amount to an authoritative source, and keep accounting corrections separate from tax adjustments. — summary of practitioner guides in a search result ([Hyperbots glossary, vendor](https://www.hyperbots.com/glossary/tax-workpapers-review)) (**weak source**)

### Inferences
- "Self-contained" means each number has its source, its method, its verification and its open questions or client answers attached, and each judgment has its reasoning attached. This is exactly the provenance a data model can hold natively.

### Gaps
- **Unverified:**
  - Firm retention periods for workpapers, commonly 7 years, but this is firm policy.
  - How peer review covers tax-only practices: peer review mainly covers attest work.
  - What IRS examiners typically request from preparers.

**Implication for the tool:** Every value should carry its source, its verification method and status, who verified it and when, and any linked client answer or judgment note. An exportable audit trail turns the file into a defence record.

---

## 5. Practitioner pain points and best practices

### Takeaway
The recurring pains are:
- review bottlenecks, often from unclear routing rather than lack of reviewer capacity;
- documents that arrive in pieces;
- manual sorting and re-keying;
- context lost between preparer and reviewer;
- client questions that stall a whole file.

Practitioners keep asking for templates that "tie everything out".

### Cited Findings
- **Review is slow.** An r/taxpros poster with a contracted CPA reviewer said the tied-out workpapers improve the work, but "the timing is slow". They asked about AI for organising workpapers before review. — [r/taxpros mirror](https://red.applefritter.com/r/taxpros) (snippet)
- **Templates.** An r/taxpros thread (34 upvotes) asked what 1040 workpapers, checklists or templates people use "to help keep things organized and make review easier… make sure everything ties out to the main forms/schedules". — [r/taxpros mirror](https://red.applefritter.com/r/taxpros) (snippet)
- **Routing.** "Most firms discover the bottleneck isn't capacity; it's clarity". Returns stall when no one has defined whether they go to senior or partner review. — [Intuit ProConnect blog, vendor](https://accountants.intuit.com/taxprocenter/practice-management/workflow-tools/bottlenecks-that-make-tax-season-harder)
- **Delays start before review.** A missing form, unclear upload or unresolved client question passes from admin to preparer to reviewer. — [Soraban, vendor](https://www.soraban.com/tax-workpaper-software)
- **Documents arrive in pieces.** "Someone may upload one document today, send a photo tomorrow". Staff "sort, name, match, route, and track those pieces". When a reviewer finds missing context late, the work has to be redone. — [Soraban, vendor](https://www.soraban.com/accounting-workpapers)
- **Review time.** One firm said review "took a fraction of the time" once the binder and workpapers were in one system. — [SurePrep case study, vendor claim](https://corp.sureprep.com/wp-content/uploads/Osborne-and-Osborne-CPAs-LLC-Success-2.pdf)
- **Onscreen review.** Wolters Kluwer calls it the next critical stage in tax workflow. Paper or print-based review persists, and field-level notes are the remedy it offers. — [Wolters Kluwer, vendor](https://www.wolterskluwer.com/nl-nl/expert-insights/onscreen-review-is-the-next-critical-stage-for-tax-workflow-improvement)

### Inferences
- Version confusion arises when a corrected 1099 or a late K-1 arrives after review. The return changes, but the workpapers and review notes refer to the old value. Nothing found above fixes this at the level of the individual number. A design that versions each value and re-opens the sign-offs that depend on it would target that gap directly.

### Gaps
- Full threads on Reddit and TaxProTalk could not be read (snippets only).
- No survey data quantifying re-keying time or review-cycle counts was found.
- No CPA Practice Advisor or AICPA Tax Section piece was retrieved.

**Implication for the tool:** Put client questions, document status and review notes on the specific number they affect. When a source value changes, flag the downstream sign-offs as stale instead of silently keeping them.
