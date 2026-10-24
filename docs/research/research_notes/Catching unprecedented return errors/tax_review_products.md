# How tax-prep software, review tools and the IRS catch errors in a computed 1040, including errors nobody wrote a rule for

Research date: 24 Oct 2026. Vendor-help and community sources are as of when they were fetched. Older sources are dated inline. Vendor marketing is labelled **[vendor claim]**.

Framing used throughout:
- (a) **pre-enumerated diagnostics**: one rule per known mistake
- (b) **generic structural mechanisms**: prior-year variance, cross-form consistency, completeness, independent recomputation, "changed since reviewed" and override tracking
- (c) **AI-based review**

## Q1. How do professional preparation suites (CCH Axcess/ProSystem fx, UltraTax/GoSystem, Lacerte/ProConnect, Drake) handle diagnostics, severities, blocking, overrides, prior-year comparison and review tick-marks?

### Takeaway
Every major suite uses the same pattern:
- **What hard-blocks:** only one tier, the e-file-reject class (diagnostics that mirror IRS MeF business rules). Every other diagnostic, including "critical", is advisory, and a preparer can ignore it or a reviewer can sign it off.
- **Generic mechanisms that exist:** flags for prior-year fields left blank, override/"overruled" flags, and review checkmarks that turn red when the number under them changes.
- **What none of them do (in anything I found):** treat "a line the engine did not compute, while its input is non-zero" as blocking. A known diagnostic that blocks nothing is the normal state in these products, not an anomaly.

### Cited Findings
- **Lacerte, blocking split:** e-file critical diagnostics stop e-file validation; paper-file critical diagnostics do not. — [Intuit community/KB thread](https://accountants.intuit.com/community/lacerte-tax-discussions/discussion/e-filing-through-critical-diagnostic/00/250684)
- **Lacerte, e-file check can be switched off.** An "E-file Support Tools → Disable E-file Error" option exists for diagnostics that look irrelevant or come from a program defect. Intuit warns that a valid diagnostic can still lead to an agency reject. — [Intuit community](https://proconnect.intuit.com/community/electronic-filing/help/disabling-e-file-diagnostic-error-checking/00/5330)
- **Intuit (ProConnect/Lacerte) severity tiers, per Intuit's FAQ:**
  - *Fatal*: the agency will reject.
  - *E-file critical*: blocks e-file until resolved.
  - *Critical*: audit risk, but does not block e-file.
  - *Suggestions*: informational.
  - Some "Critical" items are only informational, and a preparer can tick "Ignore" to mark one complete.
  - Source: [Intuit, Common questions about diagnostics](https://accountants.intuit.com/support/en-us/help-article/diagnostics/common-questions-diagnostics-suggestions-tax/L7zsvPBVt)
- **Example of a critical that does not block:** ProConnect ref. 58044 (prior-year excess business loss for QBI) "won't prevent e-file transmission". — [Intuit help, ref. 58044](https://accountants.intuit.com/support/en-us/help-article/diagnostics/resolve-proconnect-tax-diagnostic-ref-58044/L4f0hlvaM_US_en_US)
- **Practitioners treat critical diagnostics as noise.** Users complain about "silly critical diagnostics that have no impact on the program result". Intuit support has described diagnostics as "a preparer alert tool". Some diagnostics were acknowledged as defects (refs 57762, 58402). — [Intuit community](https://accountants.intuit.com/community/lacerte-product-discussions-2/how-override-some-of-these-silly-critical-diagnostics-that-have-no-impact-on-the-program-result-47729); [community idea: "make a 3rd diagnostic category"](https://accountants.intuit.com/community/lacerte-tax-idea-exchange/make-a-3rd-diagnostic-category/idi-p/263814)
- **ProConnect prior-year comparison:** the Tax Summary under Check Return shows prior-year amounts, which flow from Other → Prior Year Summary and can be edited. — [Intuit help, Tax Summary](https://accountants.intuit.com/support/en-us/help-article/tax-calculations/using-tax-summary-proconnect-tax/L5Lsh2x9G_US_en_US)
- **Lacerte audit checkmarks (generic "changed since reviewed"):**
  - A preparer or reviewer left-clicks a number in Forms view to place a green check. The check turns red if the number later changes.
  - The checks do not print. The View menu can clear all checks or show them.
  - Source: community posts, not official docs — [Intuit community, tick marks](https://proconnect.intuit.com/community/lacerte-discussions/discussion/lacerte-tick-marks/00/43541); [reviewer's checkmark thread](https://proconnect.intuit.com/community/lacerte-tax-discussions/discussion/reviewer-s-checkmark/01/231288)
- **ProConnect added the same feature later** ("Track calculated changes with checkmarks in ProConnect Tax"). A user notes that CCH ProSystem fx has the same behaviour: double right-click a number to check it, and it is flagged if it changes after review. — [Intuit idea exchange](https://accountants.intuit.com/community/proconnect-tax-idea-exchange/checkmark-confirm-data-has-been-reviewed/idc-p/234307)
- **UltraTax CS review features** (Thomson Reuters help, current) — [TR help, Review tools and features](https://www.thomsonreuters.com/en-us/help/ultratax-cs/miscellaneous/review-tools-and-features.html):
  - *Blue chevrons:* a field that had data last year but is blank this year is marked "to alert you that data may be missing". This is a generic completeness/variance check.
  - *Red chevrons:* when overrule notifications are on, they mark fields where a transferred value was typed over. The preparer can acknowledge the override or restore the value.
  - *Watch fields:* a frozen Watch tab in the Diagnostics window shows changes to key values.
  - *Other:* tick marks, field notes, form attachments documenting calculations, a Return Summary, and diagnostics that flag incorrect or missing data.
  - *Not on the page:* any sign-off workflow or severity taxonomy.
- **UltraTax diagnostics in 2012 (dated):** they drew on prior-year entries and "historical IRS statistics", flagged e-file-blocking errors, and noted "previously reviewed information that has since changed". — [CPA Practice Advisor 2012 review](https://www.cpapracticeadvisor.com/2012/03/26/2012-review-of-thomson-reuters-ultratax-cs/7240/)
- **CCH Axcess Tax** (vendor article, Mar 2023):
  - Four diagnostic categories. Only Electronic Filing errors "must be cleared in order to e-file".
  - A reviewer "can sign-off on non-severe diagnostics to approve the return even if the diagnostic has not been cleared".
  - Preparer reports cover overrides and estimates, and reviewers clear them one at a time or in bulk.
  - I got this from the search summary; the page returned 403 when fetched. — [Wolters Kluwer, Onscreen review](https://www.wolterskluwer.com/en/expert-insights/onscreen-review-is-the-next-critical-stage-for-tax-workflow-improvement)
- **Drake** (2011 brochure, dated): EF Messages flag issues that would cause an IRS reject and "must be cleared before a return can be e-filed". There is also a prior-year comparison worksheet ("Comparison Sheet"). — [Drake brochure 2011](https://drakesoftware.com/sharedassets/pdf/brochure2011.pdf); [Drake KB setup options](https://kb.drakesoftware.com/KB/Drake-Tax/18202.htm)
- **GoSystem / ONESOURCE e-file validations:**
  - A failed MeF business rule produces a reject diagnostic that blocks e-file.
  - Some rules can only be detected once the return reaches the IRS.
  - Diagnostics generated from the IRS's Business Rules Management System carry an asterisk.
  - Sources: [TR GoSystem 1065 validations](https://www.thomsonreuters.com/en-us/help/gosystem-tax-rs/e-file/1065-returns/validations); [TR ONESOURCE validations](https://www.thomsonreuters.com/en-us/help/onesource-income-tax/e-file/common-e-file-errors/validations)

### Inferences
- **How the tiers break down:**
  - *Hard-block:* the e-file-reject tier, which is a copy of the IRS business rules (category a).
  - *Generic mechanisms:* blue/red chevrons, red-turning checkmarks, override and estimate reports, prior-year comparison (category b). All of these are advisory or depend on a reviewer.
- **Why reviewers learn to click through critical diagnostics:** the products make even "critical" diagnostics ignorable, and the volume of false positives pushes reviewers that way. That is the same failure as our engine's advisory warning. Commercial practice does not solve this; it hands it to the human reviewer.
- **What none of these products publicly offer** (in anything I found): a generic "uncomputed line with non-zero input" or "every line has a provenance" gate that blocks sign-off. The red checkmark is the closest: it catches *change*, not *never computed*.
- **What a better design would combine:**
  - CCH's model, where a reviewer explicitly signs off each unresolved diagnostic (recorded, not silently ignored).
  - An override report.
  - Our own rule that an engine-admitted "not computed" line is a blocking class.

### Gaps
- **CCH Axcess:** I could not fetch the official help for the four category names, so the category names are unverified. I also found no prior-year variance report for CCH.
- **Variance tests:** I found no vendor doc describing percentage/threshold prior-year variance tests (for example, "flag a line changed by more than X%"). They are only known through blue chevrons, Watch fields and comparison sheets.
- **Drake:** I found no current documentation on Drake review mode or tick marks.
- **"Not computed" lines:** I found no evidence of how any vendor handles a line its engine does not support (unsupported-form diagnostics). This is worth a targeted search, for example "form not supported" diagnostics.

## Q2. How do review-focused and AI tools (SurePrep/1040SCAN, TR Ready to Review, CCH Axcess review, Black Ore, Filed, Basis, Juno and others) claim to catch errors, and what is deterministic vs model-based?

### Takeaway
- **Mostly extraction and preparation, not review:** the AI tools of 2025-2026 mainly do extraction and prep, with OCR plus human verifiers (SurePrep) or "agents" (Ready to Review, Black Ore).
- **Where the computation happens:** they hand the actual tax computation to a deterministic tax engine (UltraTax or the firm's own software).
- **No published recall:** none of them publish recall or error-catch rates. The figures they do publish are extraction accuracy or time saved, and all of those are vendor claims.

### Cited Findings
- **TR Ready to Review:**
  - Launched 15 Dec 2025, built on CoCounsel, 1040 only for now.
  - Has "Gather" and "Tax Preparer" AI agents, described as "auditable, and grounded in trusted Thomson Reuters tax content".
  - The launch post gives no accuracy figures and does not say which parts are rules and which are AI.
  - Its only number is about 1 hour saved per simple 1040, from an early adopter. — [TR launch post, Dec 2025](https://www.thomsonreuters.com/en-us/posts/innovation/introducing-ready-to-review-thomson-reuters-agentic-ai-for-1040-prep/)
  - Product pages say the agents verify inputs against source documents and run data through the TR tax engine **[vendor claim]**. — [TR product page](https://tax.thomsonreuters.com/en/products/ready-to-review); [TR July 2025 press release](https://www.thomsonreuters.com/en/press-releases/2025/july/thomson-reuters-unveils-ai-native-agentic-applications-to-transform-tax-and-advisory-workflows)
- **SurePrep 1040SCANverify** (TR-owned):
  - OCR extraction, then human verifiers check every input field on PDF pages, fix OCR errors, add missed data and delete extraneous data.
  - Verifiers do not review non-standard documents, Excel, Word or email.
  - Post-verification "wizards" (Steps 3-7, Superseded Documents through Tax Exempt Income) can be done by SurePrep or by the firm.
  - Source: [1040SCANverify 2025 policy](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-policy-statements/2025-1040scanverify-policy-1040-return); [2023 policy](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-policy-statements/2023-1040scanverify-policy-1040-return)
- **SurePrep, more generic checks:**
  - *Unmatched documents:* a document that cannot be matched becomes a new entity in the index tree rather than silently merging.
  - *Tax Year in Review wizard:* OCR reads each document's tax year; a prior-year document is classified as such and its fields are locked. This is a generic stale-document check.
  - Source: [Tax Year in Review Wizard](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan-review-wizard-on-web/step-2-verification/tax-year-in-review-wizard); [Review Wizard overview](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan-review-wizard/review-wizard-overview.html)
- **Black Ore Tax Autopilot** (broad availability 29 Apr 2026):
  - Pipeline: ingest documents → extract → apply federal/state tax logic → produce workpapers → export to the firm's tax software for human review.
  - Each data point links back to its source and the platform "flags items requiring attention".
  - Claims ">99% accuracy across tens of thousands of returns" **[vendor claim]**. Elsewhere the 99% is framed as *extraction* accuracy, and Forbes attributes it to testing with 75 CPAs.
  - Third-party reviewers note there are no independent, audited benchmarks.
  - Sources: [Black Ore press release (GlobeNewswire)](https://www.globenewswire.com/news-release/2026/04/29/3283985/0/en/black-ore-launches-tax-autopilot-for-broad-availability.html); [Forbes, Apr 2026](https://www.forbes.com/sites/davidprosser/2026/04/29/how-blackore-hopes-to-solve-the-cpa-labor-shortage-with-ai/); [agent-finder review](https://agent-finder.co/reviews/black-ore-tax-autopilot); [Black Ore site](https://blackore.ai/)
- **Filed:** raised $17M (May 2025). It automates prep "from upload to review-ready returns", and the CEO says the AI "flags it for review" when human judgment is needed **[vendor claim]**. — [People of Color in Tech, May 2025](https://peopleofcolorintech.com/?p=42835)
- **Intuit:** practitioners have asked publicly for "enhanced AI-backed tools for tax return self review". This suggests ProConnect did not have such a tool at the time of the post. — [Intuit idea exchange](https://accountants.intuit.com/community/ideas/enhanced-ai-backed-tools-for-tax-return-self-review-22641)

### Inferences
- **The common design** is (c) AI for extraction plus an AI flagger on top of (a) a deterministic engine and its diagnostics.
- **The tie-every-number-to-a-source mechanism:** "link every data point back to source" (Black Ore) is a generic *input-provenance* mechanism. But it covers inputs, not computed lines, so it would not catch an engine leaving a line at 0.
- **Our error is downstream of the AI tools.** Ours was a failure to compute, and the products that do the computing (UltraTax and others) are the existing engines with advisory diagnostics. So these AI tools would probably not have caught it either. This is inference; I found no source testing it.

### Gaps
- **Basis and Juno:** I found nothing on either as tax-review products.
- **CCH Axcess AI review:** I found no CCH Axcess "AI review" or "Review" module documentation.
- **Effectiveness data:** I found no published recall or precision for any AI tax-review tool. The figures that exist cover time saved or extraction accuracy only.
- **Ready to Review internals:** the help docs ("Get started") were not fetched in detail, so whether it checks computed lines against prior year is unknown.

## Q3. How does the IRS (and FTB) catch errors, and which mechanisms are generic rather than one rule per mistake?

### Takeaway
The IRS runs four layers:
1. **E-file intake:** MeF schema validation plus business rules (category a, but many rules are generic "line X must equal the sum of" consistency checks).
2. **Math verification:** the processing computer recomputes the return and stops at the first point of error (Error Resolution). This is generic **independent recomputation**, backed by statutory math-error authority.
3. **AUR:** matches every information return against the reported line. This is generic **third-party cross-source matching**.
4. **DIF scoring:** a statistical outlier model against peer norms, trained on random NRP audits. This is a generic **anomaly detector** that needs no per-mistake rule.

Of these, independent recomputation, information-return matching and statistical scoring are the mechanisms that catch errors nobody wrote a rule for.

### Cited Findings
- **MeF has two validation levels: schema (data format) and business rules.** The business rules test for "missing information, mismatched information, or incorrect data". — [TR UltraTax e-file troubleshooting](https://cs.thomsonreuters.com/ua/ut/cs_us_en/utwapp/elf/xus_elf/troubleshoot_error_codes.htm)
- **"Reject and Stop" severity:** used for unsupported submission types (R0000-120) in IRS business-rule updates, and for schema failures in Connecticut's state list. I found no official definition of the Reject / Reject and Stop / Alert tiers. — [IRS 990-N business rule updates TY2009](https://www.irs.gov/pub/irs-schema/990n_businessruleupdates-ty2009v1.2-12112009.pdf); [CT 2023 reject codes](https://portal.ct.gov/-/media/drs/forms/2023/eft/2023-reject-codes.pdf)
- **Rule numbering (dated, TY2009/2011):** IRS crosswalks map legacy error reject codes to MeF business-rule numbers (for example IND-008, R0000-097). — [IRS TY2009 1040 ERC-to-BR crosswalk](https://www.irs.gov/pub/irs-utl/ty2009_1040_erc_to_br_crosswalk_nov_2009.pdf)
- **IRM 21.5.4.2, "What Is a Math Error?"** (revised 19 Sep 2025). The listed categories include arithmetic errors, incorrect use of tables, "entries inconsistent with an attached schedule, form, statement", omitted information needed to substantiate an entry, deductions/credits exceeding a statutory limit, and missing or incorrect TINs. — [IRM 21.5.4](https://www.irs.gov/irm/part21/irm_21-005-004r)
  - The IRM page lists 11 categories. The National Taxpayer Advocate counts 22 statutory categories (IRC 6213(g)(2)(A)-(V)). The IRM lists the operationally relevant subset, so the two counts measure different things. — [NTA, 2014 MSP 16](https://www.taxpayeradvocate.irs.gov/news/directory-entry/2014-msp-16-math-error-notices/)
- **IRM 21.5.4.4.4, math verification:** "The computer stops verifying the taxpayer's information at the point of error and computes the return based on the new figures." This is independent recomputation of the return. — [IRM 21.5.4](https://www.irs.gov/irm/part21/irm_21-005-004r)
- **Error Resolution for individual returns is IRM 3.12.3** (version of 3 Nov 2023, with error codes such as EC 002 and EC 019). I did not retrieve the text. — [Tax Notes copy of IRM 3.12.3](https://www.taxnotes.com/lr/resolve/4v8hz)
- **What math-error authority allows:** the IRS can summarily assess without deficiency procedures. The taxpayer has 60 days to request abatement, or the assessment becomes final. — [NTA blog, Math error part I](https://www.taxpayeradvocate.irs.gov/news/nta-blog-math-error-part-i); [NTA blog, what you need to know](https://www.taxpayeradvocate.irs.gov/news/nta-blog-math-error-notices-what-you-need-to-know-and-what-the-irs-needs-to-do-to-improve-notices/)
- **AUR, IRM 4.19.3:**
  - Cases are "systemically identified through computer matching of tax returns with corresponding" third-party information returns. Return data comes from the IMF and third-party data from the IRMF; a case opens when "computer analysis detects a discrepancy between the two data sources".
  - Discrepancies are grouped by income type and by amount range.
  - An examiner closes the case if the item is already addressed elsewhere on the return. Otherwise a CP2000 or CP2501 is issued.
  - Tolerance thresholds sit in IRM 4.19.3.5.10, which I did not retrieve.
  - Source: [IRM 4.19.3](https://www.irs.gov/irm/part4/irm_04-019-003r)
- **DIF scoring:**
  - The higher the score, the greater the probability that an audit changes the tax.
  - Different DIF formulas apply by AGI band and by whether the return has business income.
  - Source (dated, 1999): [GAO/GGD-99-30](https://govinfo.gov/content/pkg/GAOREPORTS-GGD-99-30/html/GAOREPORTS-GGD-99-30.htm); [GAO PDF](https://www.gao.gov/assets/100316.pdf)
- **NRP is the training data:** National Research Program audits let the IRS "update its workload selection formulas" so that it focuses on returns with a high likelihood of error. — [NTA 2024 Purple Book, Rec. 66](https://taxpayeradvocate.irs.gov/wp-content/uploads/2024/12/ARC24_PurpleBook_08_MiscRecs_66.pdf)
- **Newer scoring:**
  - The IRS uses a Dependent Database (DDB) rules-based system, measured by its no-change rate.
  - IRS officials are "piloting a new scoring model to better detect noncompliance".
  - GAO notes that the no-change rate includes default audits, which may distort it.
  - Source: [GAO-24-106126](https://www.gao.gov/products/GAO-24-106126)

### Inferences
- **Generic mechanisms (catch errors nobody wrote a rule for):**
  - *Math verification / recomputation:* the IRS computes the return itself and compares.
  - *AUR:* every information return is matched against the return line it should reach.
  - *DIF:* a statistical outlier score.
  - *"Inconsistent with attached schedule":* a cross-form consistency check.
- **Pre-enumerated mechanisms:** MeF business rules and the specific statutory math-error categories.
- **What the IRS analogue would have done with our error:** recompute the line and compare it with the filed line. The independent recomputation would disagree with the engine's 0, so the discrepancy surfaces whether or not anyone wrote a rule for it.
- **Lesson for our product:** a second, independent computation path, or a check that every line is either computed or explicitly marked not applicable, is the IRS-style generic control.
- **The FTB has broadly equivalent machinery:** CalFile/e-file validation, math-error processing, and IRS information sharing. **This is unsourced; see Gaps.**

### Gaps
- **IRM 3.12.3:** I did not retrieve its text, so ERS workflow details (error codes, how the computer flags a field for a tax examiner) are unsourced here.
- **MeF severity tiers:** I found no current IRS document defining Reject / Reject and Stop / Alert, and I did not retrieve the TY2025 1040 business-rule catalogue.
- **AUR tolerances:** IRM 4.19.3.5.10 was not read.
- **FTB:** not researched within the tool budget. The FTB equivalents (e-file business rules, its math-error notice process, its Integrated Nonfiling Compliance and underreporting programs) remain unsourced.

## Q4. Is there published evidence of how effective any of these are (error rates, recall)?

### Takeaway
- **IRS:** the only hard numbers are volumes and yields: math-error notices, AUR closures and dollars, DIF no-change rates. No source gives recall (what share of errors each layer catches).
- **Vendors:** the numbers are extraction accuracy or time saved, and they are unaudited.

### Cited Findings
- **Math-error notices:** for tax-year-2022 returns, the IRS sent about 2.2 million notices covering nearly 2.7 million math errors. Child-related credits were the most common type. This figure came from the search summary of the Data Book; I did not confirm the exact table. — [IRS Data Book 2023 (p55b--2024.pdf)](https://www.irs.gov/pub/irs-prior/p55b--2024.pdf)
- **AUR in FY2025:** 987,460 cases closed, with $5.9B in additional assessments recommended. This came from the search summary of the IRS compliance page and should be verified against the table. — [IRS Compliance presence](https://www.irs.gov/statistics/compliance-presence); [IRS Data Book 2025](https://www.irs.gov/pub/irs-pdf/p55b.pdf)
- **DIF vs non-DIF audits (1999):** non-DIF audits had lower no-change rates and higher recommended taxes than DIF audits. — [GAO/GGD-99-30](https://govinfo.gov/content/pkg/GAOREPORTS-GGD-99-30/html/GAOREPORTS-GGD-99-30.htm)
- **DIF no-change rates in FY2011:** reported at 50% for partnerships and 62% for S corporations (business returns, not 1040s). This is secondary reporting of TIGTA. — [The Tax Adviser, Jan 2013](https://www.thetaxadviser.com/issues/2013/jan/tpp-jan2013-story-03/)
- **Black Ore:** ">99% accuracy" **[vendor claim, not independently benchmarked]**. — [GlobeNewswire 2026](https://www.globenewswire.com/news-release/2026/04/29/3283985/0/en/black-ore-launches-tax-autopilot-for-broad-availability.html); [agent-finder review](https://agent-finder.co/reviews/black-ore-tax-autopilot)
- **TR Ready to Review:** about 1 hour saved per simple 1040, from an early adopter **[vendor-published anecdote]**. — [TR launch post](https://www.thomsonreuters.com/en-us/posts/innovation/introducing-ready-to-review-thomson-reuters-agentic-ai-for-1040-prep/)

### Inferences
- **Volume is not recall.** Nobody publishes the recall of preparer-software diagnostics or AI review. The IRS publishes volumes, which show how much each mechanism catches but not what it misses.
- **What can be claimed:**
  - "Independent recomputation and third-party matching catch millions of errors a year at the IRS" is supportable.
  - "X% recall" for any layer is not supportable.

### Gaps
- **Rejects:** I found no e-file reject-rate statistics by business rule.
- **Error rates:** I found no NRP-based error-rate figures for 1040s prepared with software vs without.
- **TIGTA/GAO:** I found no study on the effectiveness of math-error or ERS detection beyond volume.
- **Academic work:** I found no studies on the precision or recall of tax-software diagnostics.
