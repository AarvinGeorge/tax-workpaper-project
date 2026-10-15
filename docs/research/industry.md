# Industry research: tax workpapers (for the Miraflores case study)

Method: web search and fetch, 15 Oct 2026. "Verified" = read on the cited page in this pass. "Unverified" = secondary source only, or not checked. Glossary and primer are general tax knowledge, not individually cited.

## 1. Primer

**What a workpaper is.** The file behind a return. It proves the return is right: where each number came from, what was done to it, who checked it, what is still open. It exists for three reasons: (1) the preparer must show reasonable diligence, (2) a reviewer needs to check work without redoing it, (3) the firm must answer the IRS years later.

**Who uses it**
- Preparer: builds it. Reviewer and partner: check it and sign.
- Client: answers questions, approves the return.
- Admin: assignments, deadlines, billing, access.
- Next-year preparer: needs carryovers, elections, prior judgment calls.
- IRS examiner: sees the record only through a notice response.

**Season workflow (individual)**
- Engagement letter, which also carries the §7216 consent.
- Organizer or questionnaire (client answers: dependents, foreign accounts, crypto, sales).
- Document intake (W-2, 1099s, K-1s, 1098s). Late and corrected documents are normal.
- Prep: data entry or extraction, then computation.
- Review in levels: preparer self-review, reviewer, partner on complex returns.
- Client approval and signature: Form 8879 (e-file authorization) or paper signature.
- E-file. If rejected, fix and resubmit. If not ready by the deadline, file an extension (Form 4868).
- After filing: amend with Form 1040-X; answer notices (CP2000 = IRS says third-party data does not match the return; exam letters = audit).

**Vocabulary**
- **Tickmark:** a symbol on a number meaning "agreed to source", "footed", "agreed to prior year", and so on. It is a verification record per number.
- **Review note:** a reviewer's question or required fix. It must be cleared before sign-off.
- **Sign-off:** initials and date from preparer, reviewer and partner. Traditionally it does not reopen when the work changes. That is the main flaw to fix.
- **PBC list ("prepared by client"):** the checklist of documents and answers the client owes.
- **Carryforward:** items that persist across years: capital-loss, passive-loss, AMT credit, basis, depreciation schedules, charitable and NOL carryovers.
- **Retention:** see section 2.

## 2. Standards and rules that shape workpapers

| Rule | What matters for design | Source |
|---|---|---|
| Circular 230 §10.22 | Practitioner must use due diligence preparing and approving returns; may rely on others' work if reasonable care was used. Verified. | https://www.law.cornell.edu/cfr/text/31/10.22 |
| Circular 230 §10.34 | May rely in good faith without verification on client information, but must make reasonable inquiries if it looks incorrect, inconsistent or incomplete. Verified. **Design: log the inquiry and the answer.** | https://www.law.cornell.edu/cfr/text/31/10.34 |
| Circular 230 §10.28 (return of client records) | Records must be returned on request; practitioner-prepared documents may be withheld pending fees. Unverified (secondary). | https://www.thetaxadviser.com/issues/2021/sep/practitioners-role-circular-230/ |
| AICPA SSTS | After the 2023 rewrite, SSTS No. 1 holds positions, knowledge of errors (prior-year errors: tell the client promptly, advise, recommend a fix), data protection and reliance on tools. Section numbers unverified; secondary source only. | https://www.thetaxadviser.com/issues/2023/nov/understanding-the-updated-tax-ethical-standards.html |
| IRC §6107 | Preparer keeps a copy of each return, or a list of names and TINs, for 3 years after the close of the return period. Verified. | https://www.law.cornell.edu/uscode/text/26/6107 |
| IRC §6695 | $50 per failure to give the client a copy or to retain (capped $25,000 a year or period; reasonable-cause exception); §6695(g) due-diligence penalty for HOH, CTC, AOTC and EITC has no reasonable-cause exception. Dollar amounts are inflation-adjusted. Verified. | https://www.law.cornell.edu/uscode/text/26/6695 |
| Form 8867 | Required for EIC, CTC/ACTC, AOTC and HOH. Preparer must ask questions and document the answers; keep records 3 years (start date varies, unverified). 2025 penalty about $650 per item, from a secondary source (unverified). Primary IRS page returned 404. | https://www.taxesforexpats.com/articles/expat-tax-rules/form-8867.html |
| IRC §7216 / Reg. 301.7216-3 | Written, signed, specific consent before using or disclosing return information; a use and a disclosure need separate documents; expires after 1 year if no term stated; extra rules for disclosure abroad. Verified. | https://www.law.cornell.edu/cfr/text/26/301.7216-3 |
| FTC Safeguards Rule, 16 CFR 314.4(c) | Tax preparers are financial institutions. Requires access controls (c)(1), encryption (c)(3), MFA (c)(5), and policies to "monitor and log the activity of authorized users" (c)(8). Verified. | https://www.law.cornell.edu/cfr/text/16/314.4 |
| IRS Pub 5708 (WISP) | Written Information Security Plan is a requirement. Confirmed through an IRS handout. Pub 4557 PDF could not be read: unverified. | https://revenuefiles.delaware.gov/2024/FedState/IRS_Handout_Pub_5708_WISP.pdf |
| Pub 1345 (e-file) | ERO keeps Forms 8878/8879 for 3 years from the return due date or IRS receipt date, whichever is later; the taxpayer signs before the ERO originates the e-file. Verified from the PDF text. | https://www.irs.gov/pub/irs-pdf/p1345.pdf |
| IRC §6501 | IRS can assess within 3 years of filing; 6 years if more than 25% of gross income is omitted; no limit for fraud or no return. | https://www.law.cornell.edu/uscode/text/26/6501 |
| IRS retention guidance | 3 years default; 6 years for 25% omission; 7 years for worthless securities and bad debts; indefinitely for no return or fraud. | https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records |

**Design consequences**
- Retention is at least 3 years, but basis and carryover records must live as long as the asset or carryover. The 6-year rule matters for a household with large unreported-income risk.
- The workpaper must record the diligence inquiry and answer, not only the number.
- Signed 8879 and consent forms are evidence objects with their own retention.
- Sensitive-data access logging is a legal requirement, not a nicety.

## 3. Existing tools to learn from

**Tax workflow and workpaper tools**
- **SurePrep 1040SCAN / SPbinder / TaxCaddy (Thomson Reuters).** Tiers: ORGANIZE (sort into a binder), PRO (OCR and export, staff check figures), and a verify tier where SurePrep staff check the data. SPbinder is the workpaper binder with tickmarks, annotations and sign-off tracking. TaxCaddy is the client document collector.
  - Borrow: three confidence tiers of verification; flag missing source documents.
  - https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-versions/sureprep-service-types and https://www.cpapracticeadvisor.com/2019/08/13/2019-review-of-sureprep-1040scan-and-taxcaddy/34443/
- **CCH ProSystem fx Engagement / Axcess Workpapers.** Notes on workpapers, sign-off with locking after final review, "Notes Summary" and "Sign Off Summary" views, per-document roll-forward rules. (Axcess Workpapers itself unverified; evidence is for ProSystem fx.)
  - Borrow: a summary view of all open notes and all sign-offs; per-item roll-forward behaviour.
  - https://www.cpapracticeadvisor.com/2008/07/25/cch-a-wolters-kluwer-business-prosystem-fx-engagement-4/3363/ and https://support.cch.com/updates/Engagement/pdf/guides_tab/version6/68/FieldGuide%20(US).pdf
- **CCH AutoFlow / Scan.** OCR identifies the form, matches the TIN to the client file, and uses the prior-year return as a baseline to flag potentially missing data. Axcess iQ itself: not found.
  - Borrow: prior-year-as-expectation for completeness checks.
  - https://www.cpapracticeadvisor.com/2015/11/16/2015-review-of-cch-prosystem-fx-scan-with-autoflow-technology/20277/
- **Caseware Working Papers.** Annotation with tickmarks and references; review notes called "issues", which can be archived, rolled forward or cleared; colour-coded sign-off (up to 8 signatures per the 2005 review). Cloud features unverified.
  - Borrow: colour-coded sign-off status; issues that carry forward.
  - https://documentation.caseware.com/2022/WorkingPapers/en/Content/Engagements/Review-Signoff/Annotation.htm and https://www.cpapracticeadvisor.com/2019/02/26/caseware-international-inc-caseware-working-papers/429/
- **UltraTax CS.** Source Document Processing creates PDF workbinders and OCR. A direct link from a return figure to its source image was not found.
  - https://www.cpapracticeadvisor.com/2015/11/16/2015-review-of-thomson-reuters-ultratax-cs-source-document-processing/20283/
- **Lacerte / ProConnect.** Diagnostics of fatal, warning and informational levels. A fatal diagnostic blocks print and e-file. The reviewer ticks a "reviewed" checkbox, which does not resolve the diagnostic. Intuit markets over 25,000 diagnostics.
  - Borrow: severity tiers where "fatal" blocks filing; separate "acknowledged" from "resolved".
  - https://proconnect.intuit.com/community/individual/help/lacerte-informational-diagnostics-frequently-asked-questions/00/5356
- **Drake.** Mostly a calculation engine with diagnostics and PDF output; not a workflow suite. Marketing and aggregator evidence only. https://g2.com/compare/drake-tax-vs-taxdome
- **Practice management (Canopy, Karbon, TaxDome).** Client portal, e-signature, organizers, workflow, email-based collaboration. TaxDome's own comparison page is marketing; a Capterra reviewer cites a steep workflow-setup learning curve. Form 8879 handling in these products: unverified.
  - Borrow: client-facing checklist and approval flow.
  - https://taxdome.com/canopy-alternative
- **AI tax startups.**
  - Black Ore (Tax Autopilot: automated federal and state 1040 prep for CPA firms): https://www.sovereignmagazine.com/article/ai-tax-startup-black-ore-opens-platform-to-cpa-firms
  - Juno (92+ document types, human reviews every return): https://www.cpapracticeadvisor.com/2026/04/13/juno-raises-12m-seed-to-scale-ai-tax-preparation-platform-that-automates-90-of-busy-work/181502/
  - Soraban (intake, data entry, delivery): https://ycombinator.com/companies/soraban
  - Gruntworx (document automation, K-1 partnership with K1x): https://www.businesswire.com/news/home/20260108890061/en/K1x-and-Juno-Announce-Strategic-Partnership-to-Provide-Industry-Leading-Tax-Automation
  - Filed (Prowork checks figures against sources and generates workpapers; "Protocols" turn reviewer corrections into reusable rules; vendor claims): https://www.cpapracticeadvisor.com/2025/05/21/new-ai-tax-system-integrates-with-existing-systems-and-workflows-to-automate-tax-preparation/161468/
  - Basis: nothing found; unverified.
  - Borrow from this group: confidence on every extracted value, a human always in the loop, corrections that become rules.

**Audit-software analogues**
- **DataSnipper.** Each "snip" keeps a reference to the original source. A Validation Snip marks "reviewer confirmed"; an Exception Snip flags a concern to the preparer; Version Compare highlights changes between workpaper versions. Vendor-stated.
  - Borrow: the model for trace-to-source (click a number, see the highlighted region).
  - https://knowledge.datasnipper.com/en/articles/739737-datasnipper-s-value-for-reviewers
- **AuditBoard.** Its review and sign-off mechanics were not found. Unverified.

**Dev-tool analogues (verified)**
- **GitHub protected branches.** Required approving reviews, "dismiss stale pull request approvals when commits are pushed that affect the diff", and "require conversation resolution before merging".
  - This maps directly to review notes that block filing and sign-offs that reopen on change.
  - https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- **Figma version history.** Auto checkpoints, named versions with a description, and non-destructive restore (restoring adds checkpoints and keeps all comments). Compare is not described there.
  - https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history
- **Linear.** Not researched; unverified.

**What users complain about.** Direct Reddit r/taxpros threads were not retrievable, so this is thin and partly vendor-sourced.
- A vendor explainer says workpaper tools organise the file while workflow tools move the return, and the two sit in separate systems so work "gets stuck between systems" (Soraban, vendor view): https://www.soraban.com/accounting-workpaper-software
- A Bloomberg Tax / Arizent survey (corporate tax) found workpapers were among the most urgent workflow problems and that few tools exist beyond spreadsheets: https://pro.bloombergtax.com/insights/tax-solutions/how-to-modernize-your-tax-workpapers-process
- Intuit/TR forum threads: complaints about bugs, slow support, painful conversions that force hand re-entry of carryovers and basis, and UltraTax's lack of missing-data flagging (single-user comments): https://accountants.intuit.com/community/lacerte-tax-discussions/discussion/unseccessful-conversion-from-ultratax/00/243669
- Design opportunity: carryovers and basis that survive conversion with history; one system for workpaper and workflow; missing-data flags.

## 4. Design principles

1. **Every number carries provenance** (document, field/location, extraction confidence). From DataSnipper snips and SPbinder bookmarks.
2. **Verification is a per-number record** (method, who, when, result), the modern tickmark. From SPbinder and Caseware.
3. **Review state is per item and invalidated by change.** A sign-off or tick on an input that later changes reopens automatically. From GitHub stale-approval dismissal.
4. **Open review notes and fatal checks block filing; "acknowledged" is not "resolved".** From GitHub conversation resolution and Lacerte diagnostics.
5. **Checks do not trust the engine.** Independent recomputation and cross-document tie-outs run beside the computed return. From DataSnipper and Lacerte diagnostics (and the brief).
6. **Prior-year variance with materiality thresholds**, so reviewers see swings, not every line. From AutoFlow's prior-year baseline.
7. **Completeness is provable:** every document either landed somewhere or has a stated reason; every area was considered. From the PBC list, SPbinder missing-document flags and Form 8867.
8. **Changes never overwrite.** Original value, new value, who, why, tax effect. From Figma's non-destructive restore.
9. **Named, comparable versions.** Compare any two with a diff of what changed. From Figma and DataSnipper Version Compare.
10. **Filing freezes an immutable snapshot; amendments are new versions on top.** Supports §6107 and §6501 retention.
11. **Diligence inquiries and answers are first-class evidence** (client Q&A, §10.34, Form 8867). Questions to the client become records.
12. **Roles are enforced, and sensitive-field views are logged.** 16 CFR 314.4(c)(1), (c)(8).
13. **The notice response is a generated self-contained package**, not a hunt through the file.
14. **Carryforward is structured with history**, not re-keyed. From the conversion complaints and Caseware issue roll-forward.
15. **Workpaper and workflow share one model** (assignments, deadlines, status beside the evidence). From the workpaper/workflow gap.

## 5. Glossary (general knowledge; not individually cited)

- **AGI:** adjusted gross income; total income less above-the-line adjustments. Drives many limits.
- **Schedule C:** profit or loss from a sole proprietorship.
- **Schedule D / Form 8949:** capital gains and losses; 8949 lists each sale, with a basis-adjustment column.
- **Schedule E:** rental, royalty, partnership and S-corp income.
- **1099-B:** broker proceeds, often with wrong or missing basis. **1099-DIV / INT:** dividends / interest.
- **1099-K:** payment-card or platform payments (gross, not net).
- **1099-NEC:** non-employee compensation, which feeds Schedule C. **1099-DA:** digital-asset (crypto) broker reporting.
- **K-1 (1065 / 1120-S):** a partner's or S-corp shareholder's share of the entity's items; partnerships and S-corps follow different basis rules.
- **Basis:** the tax cost of an asset or investment; determines gain and loss. For S-corp shareholders, limits deductible losses.
- **Wash sale:** a loss disallowed when the same security is repurchased within 30 days; disallowed loss is added to the new basis.
- **ISO / ESPP:** stock-option and employee stock purchase plans. ISO exercise creates an AMT adjustment; ESPP sales split into ordinary and capital portions.
- **AMT:** alternative minimum tax; a parallel calculation, with credits carried forward.
- **Backdoor Roth / Form 8606:** non-deductible IRA contribution converted to Roth; 8606 tracks after-tax basis and the pro-rata rule.
- **SEP-IRA:** self-employed retirement plan with a deductible contribution.
- **QBI (§199A):** up to 20% deduction on qualified business income, with limits.
- **SALT cap:** limit on the state and local tax itemised deduction.
- **Passive activity loss / Form 8582:** passive losses offset only passive income, with carryforwards and a rental allowance.
- **§1250 recapture:** depreciation on real property taxed at up to 25% on sale (unrecaptured §1250 gain).
- **Form 4797:** sale of business property, including recapture.
- **Form 4562:** depreciation and amortisation (method, life, bonus).
- **540NR:** California nonresident or part-year resident return; income is split by residency period and source.
- **FBAR (FinCEN 114) vs Form 8938:** foreign-account reports to FinCEN versus to the IRS with the return; different thresholds.
- **Form 2210:** underpayment-of-estimated-tax penalty computation.
- **Form 8879:** e-file signature authorisation.
- **Form 4868:** automatic extension of time to file (not to pay).
- **Form 1040-X:** amended return.
- **Form 709:** gift-tax return, relevant to stock and car gifts above the annual exclusion.
- **Form 8283:** noncash charitable contributions.
- **CP2000:** IRS notice proposing a change after a third-party data mismatch. Source: https://www.irs.gov/individuals/understanding-your-cp2000-notice
- **MeF reject codes:** the IRS Modernised e-File error codes returned when an e-file is rejected; fix and resubmit. Code list not fetched; unverified.
- **EFIN / PTIN / ERO:** e-file ID of the firm / preparer ID / electronic return originator.
- **Carryover:** a loss or credit moved to a later year (capital loss, passive loss, AMT credit, charitable, NOL).
