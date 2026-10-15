# US documentation frameworks as models for a tax workpaper tool

Researched 15 Oct 2026. Source-access caveat: pcaobus.org returned HTTP 403 to every fetch (AS 1215 text, QC 1000 postponement release), and the AICPA AU-C text was not retrieved directly. Claims about those texts rest on secondary sources or the researcher's prior knowledge, and are marked **unverified** where no fetched source confirmed them.

## 1. PCAOB AS 1215 (Audit Documentation), issuer audits

### Takeaway
AS 1215 is the strictest US documentation standard. Documentation must let an outsider reconstruct who did what, when, on what evidence, and who reviewed it. After a fixed completion date the file is append-only: changes are allowed only as dated, attributed, explained additions. The completion window is moving from 45 days to 14 days as part of the QC 1000 package, which now takes effect 15 Dec 2026, but this could not be confirmed from a primary source.

### Cited Findings
- Primary text location: [PCAOB AS 1215](https://pcaobus.org/oversight/standards/auditing-standards/details/AS1215). The fetch returned 403, so the paragraph-level claims below are **unverified** against the primary text.
- **Experienced-auditor test (AS 1215.06, unverified paragraph number).** Documentation must be enough for an experienced auditor with no previous connection to the engagement to understand the work performed, who performed it, when it was completed, the evidence obtained, and the conclusions reached. It must also identify who reviewed the work and the review date. AU-C 230 states the same test for non-issuers, per [open-exam-prep AU-C 230 summary](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention).
- **Significant findings or issues (AS 1215.08, 1215.12, unverified)** must be documented, and the engagement completion document must identify them, along with the actions taken and the basis for conclusions. Source: prior knowledge, **unverified**.
- **Presumption that undocumented work was not performed (AS 1215.09, unverified).** If the documentation does not show that work was done, the auditor must show by persuasive other evidence that it was done; oral explanation alone is not enough. Source: prior knowledge, **unverified**.
- **Retention.** Keep the file at least 7 years from the report release date, per [open-exam-prep](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention) and the [WebSearch summary of secondary sources](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention).
- **Documentation completion date: 45 days after the report release date (legacy rule).** Changing to **14 days**:
  - The 14-day figure appears in [open-exam-prep](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention) and a [beancount.io blog (Jul 2026)](https://beancount.io/blog/2026/07/21/pcaob-as1215-audit-documentation-14-day-deadline-small-firms-guide).
  - The two disagree on the effective date. open-exam-prep's footnote says fiscal years beginning on or after 15 Dec 2024 for large firms, and one year later for others. That footnote looks wrong or conflated.
  - The researcher's prior knowledge is that the 45→14-day change was adopted with QC 1000 (May 2024) and shares QC 1000's effective date. **Unverified.** No PCAOB primary source was retrievable.
- **QC 1000 postponed.** On 28 Aug 2025 the PCAOB postponed QC 1000 "and related standards, rules, and forms" by one year, to **15 Dec 2026**, without changing the text. Sources: [Deloitte DART](https://dart.deloitte.com/USDART/home/news/all-news/2025/aug/pcaob-postpones-effective-date-quality-control-standard), [Journal of Accountancy](https://www.journalofaccountancy.com/news/2025/aug/pcaob-postpones-effective-date-for-new-quality-control-system/), [PCAOB release (403 on fetch)](https://pcaobus.org/news-events/news-releases/news-release-detail/pcaob-postpones-effective-date-of-qc-1000-and-related-standards--rules--and-forms).
- **Proposed QC 1000 changes.** A PCAOB supplemental request for comment dated 9 Jun 2026 proposed amending QC 1000 to simplify its documentation requirements and shorten its documentation retention period. The effective date reportedly stays 15 Dec 2026. Source: search summary of [PCAOB Docket 057](https://pcaobus.org/about/rules-rulemaking/rulemaking-dockets/docket-057). **Unverified detail**, because the page was not fetched.
- **Changes after the completion date (AS 1215.16, unverified paragraph number).** Documentation must not be deleted or discarded. Any addition must state the date it was added, the name of the person who prepared it, and the reason. The rule is confirmed for the parallel AU-C rule by [open-exam-prep](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention); the AS 1215 wording itself is **unverified**.

### Inferences
- The "experienced auditor, no prior connection" test is the right acceptance criterion for the tool. A reviewer who opens any number cold must see:
  - its source document and field;
  - who entered or verified it, and when;
  - who reviewed it, and when;
  - the conclusion reached.
- The completion-date rule maps onto an "assembled/locked" state. Before lock, the file can be edited freely. After lock, it is an append-only log of dated, attributed, reasoned amendments.

**Implication for the tool:** Make every value carry preparer, reviewer, timestamps, and evidence links, and let the user lock the return. After lock, allow only annotated additions; never edit or delete. "No documentation" should show as "not done."

### Gaps
- Exact AS 1215 paragraph text and numbers: the PCAOB site blocked fetches.
- The 14-day effective date: conflicting secondary sources, and no primary release seen.
- Whether the June 2026 QC 1000 proposal was adopted by Oct 2026: not found.

## 2. AICPA AU-C 230, AU-C 500, AU-C 520 and SQMS No. 1, non-issuer audits

### Takeaway
AU-C 230 mirrors AS 1215 with looser timing: 60-day assembly and 5-year retention. AU-C 500 supplies the evidence-quality vocabulary (relevance, reliability, and accuracy and completeness of information produced by the entity). AU-C 520 supplies the exact pattern for prior-year variance review: an independent expectation, a threshold set in advance, and corroborated explanations for any difference above the threshold.

### Cited Findings
- **AU-C 230 basics:**
  - Experienced auditor with no previous connection to the audit.
  - Record who performed each step and the date, and who reviewed it and the date.
  - Document significant findings, difficulties and disagreements.
  - Assemble the final file within **60 days** of the report release date.
  - Retain for **at least 5 years**.
  - Deleting after assembly is prohibited. Additions must record the reason, author, date, reviewer and review date.
  - Source: [open-exam-prep AU-C 230](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention), a secondary study guide.
- An experienced auditor "possesses competencies and skills that would have enabled him or her to perform the audit." Source: search summary of [Journal of Accountancy, SAS 103 coverage (2006)](https://www.journalofaccountancy.com/issues/2006/jun/advancingtheauditdocumentationstandard/). SAS 103 is the predecessor of AU-C 230.
- During the assembly period, the file may be organised and indexed, but conclusions may not be substantively changed. Source: [open-exam-prep](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention).
- **AU-C 500 (audit evidence):**
  - Appropriateness means the quality of evidence: its relevance and reliability.
  - For information produced by the entity, the auditor must get evidence about its accuracy and completeness, and judge whether it is precise and detailed enough.
  - Original documents are more reliable than photocopies.
  - These points come from ISA/ASA-conformed texts, e.g. [AUASB ASA 500](https://www.auasb.gov.au/admin/file/content102/c3/ASA_500_27-10-09.pdf) and [HKICPA 500](https://www.hkicpa.org.hk/-/media/HKICPA-Website/HKICPA/section6_standards/standards/sas500.pdf).
  - The US section index is at [Deloitte DART AU-C 500–599](https://dart.deloitte.com/USDART/home/auditing/aicpa/professional-standards/aicpa-professional-standards/us-auditing-standards-aicpa-clarified/au-c-sections-500-599).
  - The US AU-C 500 was replaced by SAS No. 142 (effective for periods ending on or after 15 Dec 2022), which frames evidence by its attributes. **Unverified** (prior knowledge; not confirmed by search).
- **AU-C 520 (analytical procedures)** runs in four steps:
  1. Suitability.
  2. Reliability of the data. Is the source independent? Was prior-year data audited?
  3. An independent expectation, formed "BEFORE comparing it to the client's recorded balance".
  4. A threshold "that can be accepted without further investigation", set before the comparison.
  - Differences above the threshold call for inquiry plus corroboration; "Inquiry alone is NEVER sufficient".
  - Document the expectation and its inputs, the comparison, the threshold, and the explanations with corroborating evidence.
  - Source: [open-exam-prep AU-C 520](https://open-exam-prep.com/study-guides/cpa-aud/evidence-fundamentals/substantive-analytical-procedures), a secondary source.
- **SQMS No. 1 (AICPA Statement on Quality Management Standards), effective 15 Dec 2025.** It requires firm-level quality management, including engagement performance responses on direction, supervision and review, and documentation. **Unverified** (prior knowledge; no source fetched).

### Inferences
- AU-C 520 transfers directly to tax prior-year comparison:
  - The expectation is last year's line, adjusted for known changes.
  - The threshold is a dollar or percent limit, set in advance.
  - Each breach needs an explanation tied to a document or client answer. A bare narrative is not enough.
- AU-C 500's "information produced by the entity" maps onto client-prepared schedules and client answers. Those need corroboration against third-party documents (W-2, 1099, K-1), which rank higher in reliability.

**Implication for the tool:** Rank each value's evidence by reliability (third-party document over client-prepared schedule over oral answer). Run a prior-year variance check with a pre-set threshold, and require a corroborated explanation for every breach.

### Gaps
- The AICPA primary text was not retrieved for AU-C 230, 500 (SAS 142), 520 or SQMS No. 1. Exact paragraph wording and the SQMS effective date are unconfirmed.

## 3. Tickmarks, cross-referencing, tie-out, reconciliation, materiality, sampling

### Takeaway
The IRS's own manual defines tickmark and cross-referencing discipline. Audit standards define materiality (AU-C 320) and sampling (AU-C 530). In tax, materiality is weak: every dollar can matter for the return. So the transferable idea is the variance threshold for review attention, not a threshold for leaving errors in.

### Cited Findings
- **Tickmarks** document conditions and work performed. They need not be standard across the file, but "they must be consistent throughout the workpapers for an issue," with an explanation in the workpaper or in a legend. Source: [IRM 4.10.9.8.2(3)](https://www.irs.gov/irm/part4/irm_04-010-009).
- **Cross-referencing.** Lead sheets carry a "Workpaper Reference" column. "The supporting workpaper(s) must contain the documentation to explain the work performed", and workpapers should reference each other where needed for the audit trail. Source: [IRM 4.10.9.8.2(2)](https://www.irs.gov/irm/part4/irm_04-010-009).
- **Accuracy and completeness of entity data.** Testing a population means checking both the prices or amounts and the completeness of the volume data. This is the logic of a tie-out from detail to total. Source: [HKICPA 500](https://www.hkicpa.org.hk/-/media/HKICPA-Website/HKICPA/section6_standards/standards/sas500.pdf).
- **Materiality, performance materiality and sampling.**
  - Materiality and performance materiality are defined in AU-C 320 / AS 2105.
  - Audit sampling is defined in AU-C 530 / AS 2315.
  - No source fetched; **unverified**.
- **Tie-out and reconciliation** are practice terms, not defined terms in these standards. No source found.

### Inferences
- For hundreds of stock sales on a 1099-B, the tool should:
  - tie out by machine, 100% of the time: every lot sums to the 1099-B totals by category (covered and noncovered, short and long term), and those totals flow to Form 8949 and Schedule D;
  - reserve human "sampling" for judgement items such as basis adjustments, wash sales and missing basis.
  - Software makes full-population testing cheap, so audit sampling is less needed.

**Implication for the tool:** Make tickmarks structured, legend-defined statuses (e.g. "tied to source", "recomputed", "agreed to prior year") that are consistent for each issue. Every lead-sheet line should cross-reference its supporting detail. Replace sampling with automated full-population tie-outs, plus a flagged exceptions list.

### Gaps
- No primary AU-C 320 or 530 text was fetched. No authoritative tax-specific materiality guidance was found (Circular 230 and the AICPA SSTS were outside this scope).

## 4. IRS side: IRM 4.10.9 and 4.10.7, IDRs, CP2000, Letter 566, IRC §6001, Rev. Proc. 98-25

### Takeaway
The IRS examiner's workpaper model is structured like this:
- an index (Form 4318);
- issue lead sheets stating facts, law, the taxpayer's position and the conclusion;
- supporting workpapers that are cross-referenced and carry tickmarks;
- a contemporaneous activity record.

Evidence is weighed by type: documentary over oral, originals over copies, and "per oral testimony" is not a conclusion. That is the bar a preparer's file must meet when the IRS asks.

### Cited Findings
**IRM 4.10.9, workpapers** (revision 22 Apr 2024, [irs.gov](https://www.irs.gov/irm/part4/irm_04-010-009)):
- "Lead sheets and workpapers are the written records that support the audit findings" (4.10.9.2(6)).
- **Form 4318, Examination Workpapers Index**, "is the cover sheet that indexes the lead sheets and supporting documents" (4.10.9.11).
- **Activity record, Form 9984** (4.10.9.5): it "should be prepared contemporaneously and provide a complete and concise case history". Other employees initial their entries.
- **Issue lead sheets are required for every issue** (4.10.9.7.2). They "must reflect the issue name, adjustments (when applicable), conclusion, facts, law", plus the taxpayer's position. Facts favourable to both sides must be included. "Lead sheets do not replace the need for supporting workpapers" (4.10.9.7(2)).
- **Required workpaper contents** (4.10.9.8(1)):
  - what was reviewed, requested and inspected, and why the issue was audited;
  - the amounts examined and verified, and the conclusions;
  - questions raised and how they were resolved;
  - correspondence and documents from the taxpayer or third parties;
  - internal sources reviewed, even when not kept in the file.
- **Originals.** Originals must be copied when they support an adjustment and must never be altered. Electronic originals need a working copy (4.10.9.8(2), 4.10.9.10).
- **Quality bar.** "Workpapers must be neat, legible, grammatically correct, and easily understood", because managers, Appeals, TIGTA and Counsel review the file (4.10.9.6(2), 4.10.9.8(3)–(4)).
- **Form 4700** (examination workpapers / lead-sheet supplements) is not addressed in the fetched IRM text. Its exact role is **unverified**.

**IRM 4.10.7, issue resolution** (revision 18 Jul 2025, [irs.gov](https://www.irs.gov/irm/part4/irm_04-010-007)):
- "Evidence is something which tends to prove a fact or point in question" (4.10.7.3.1).
- Oral testimony is not a substitute for available documents, and "need not be accepted without further inquiry" (4.10.7.3.2).
- Documentary evidence has "great probative value" (4.10.7.3.9). Originals should be requested when they exist; copies are secondary evidence (4.10.7.3.11–12).
- Testimony by a taxpayer's representative is hearsay (4.10.7.3.5).
- "'Per oral testimony' or 'as reasonable' are insufficient unless the amounts are both de minimis and reasonable."
- Examiners reach "a definite conclusion by a balanced and impartial evaluation of all of the evidence" (4.10.7.4).
- Copies of the examiner's workpapers may be provided to the taxpayer or representative.
- Substantial compliance with IRC 274(d) records can suffice (4.10.7.4.6).

**IDRs (Form 4564):**
- IDRs must generally focus on the issues being examined. Initial basic books-and-records IDRs need not state an issue (IRM 4.46.4.2(2)).
- The form states the items requested, the due date, the IRS contact and the delivery method.
- IDRs are not self-enforcing (IRM 4.46.4.7). Taxpayers need not create documents that do not exist (IRM 5.17.6.1.1(3)).
- Best practice is to keep "an exact copy of everything turned over to the IRS".
- Source: [The Tax Adviser, Kossman, 1 Oct 2023](https://www.thetaxadviser.com/issues/2023/oct/responding-to-an-irs-information-document-request/).

**CP2000:**
- It is sent when third-party income or payment information "doesn't match what you reported".
- It is not a bill. The response form is signed agree/disagree, with supporting documents attached. If you do not respond, the IRS "may send another notice and a bill".
- If you agree, there is no amendment unless there are other items to report; in that case file a 1040-X marked "CP2000".
- Source: [IRS, Understanding your CP2000 notice](https://www.irs.gov/individuals/understanding-your-cp2000-notice).
- Practitioner guides advise answering each mismatched item individually, e.g. with brokerage statements showing corrected basis, and say the deadline is typically 30 days. Source: [getirshelp](https://getirshelp.com/blog/cp2000-notice-response/), a secondary source.

**Letter 566:**
- Prior knowledge says it is the initial-contact letter for a correspondence examination, asking for documentation of specific items. **Unverified**: no source was found.

**IRC §6001:**
- "Every person liable for any tax imposed by this title ... shall keep such records" as the Secretary prescribes, sufficient "to show whether or not such person is liable for tax". Source: [26 U.S.C. §6001, Cornell LII](https://www.law.cornell.edu/uscode/text/26/6001).

**Rev. Proc. 98-25** (machine-sensible records):
- Keep records as long as they may be material to tax administration. Per IRS, that is at least until the limitations period (with extensions) expires.
- Files must be labelled, secured, backed up off-site, and accessible during an exam.
- Loss or material inaccuracy must be reported promptly with a replacement plan.
- Sources: [Rev. Proc. 98-25 (IRS)](https://www.eitc.irs.gov/pub/irs-drop/rp-98-25.pdf), [IRS automated records page](https://www.irs.gov/node/4437), [Federal Register 2007](https://www.govinfo.gov/content/pkg/FR-2007-02-01/pdf/E7-1561.pdf).

### Inferences
- A preparer's workpaper that already matches the examiner's structure makes a CP2000 or exam response a matter of exporting what exists. The structure is: index, issue lead sheets (facts, law, position, conclusion), cross-referenced support, and an activity log.
- CP2000 is literally a third-party-document vs. return mismatch. A tool that reconciles every 1099/W-2 to its return line pre-empts the most common notice.

**Implication for the tool:**
- Model the file as an index of issue lead sheets (facts, law, position, conclusion, cross-referenced evidence), with a contemporaneous activity log.
- Weight evidence as the IRM does: an oral client answer is never enough alone.
- Keep an immutable copy of each source document, and offer a one-click "response pack" per issue.

### Gaps
- Letter 566 contents.
- Form 4700's current role.
- The IRM 4.10.7 burden-of-proof sections (the fetch was truncated).
- IRM 4.10.2 IDR procedures. IRM 4.46 (LB&I) was cited only second-hand.

## 5. Data-provenance standard: W3C PROV

### Takeaway
W3C PROV is the standard vocabulary for "where did this value come from". It is small enough to borrow as the tool's lineage model without adopting RDF.

### Cited Findings
- Provenance is "information about entities, activities, and people involved in producing a piece of data or thing, which can be used to form assessments about its quality, reliability or trustworthiness". Source: [W3C PROV Overview](https://www.w3.org/TR/prov-overview/).
- PROV-DM (the conceptual model), PROV-O (an OWL2/RDF ontology), PROV-N (a human-readable notation) and PROV-CONSTRAINTS became W3C Recommendations on 30 Apr 2013. The family has 12 documents, and PROV-PRIMER is the suggested start. Source: [W3C PROV Overview](https://www.w3.org/TR/prov-overview/).
- **Core concepts:**
  - types: Entity, Activity, Agent;
  - relations: wasGeneratedBy, used, wasDerivedFrom, wasAttributedTo, wasAssociatedWith.
  - These are defined in [PROV-DM](https://www.w3.org/TR/prov-dm/). Not fetched, so **unverified** against the text, though they are widely known.

### Inferences
Each part of the workpaper maps onto PROV:

| Workpaper item | PROV term |
|---|---|
| Source document field (e.g. 1099-B box 1d) | Entity |
| Extraction, computation, review | Activity |
| Preparer, reviewer, OCR engine, client | Agent |
| A return line computed from document fields | wasDerivedFrom |

This gives a defensible, standards-based answer to "trace every number to its source".

**Implication for the tool:** Store lineage as a PROV-shaped graph: every value is an Entity with wasDerivedFrom links to source fields, a generating Activity, and an attributed Agent. "Trace this number" then becomes a graph walk.

### Gaps
- PROV-DM was not fetched to quote the exact relation definitions.
