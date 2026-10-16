# Review workflow UX in tax, accounting and audit software (as of 16 Oct 2026)

Research run 16 Oct 2026. About 17 search/fetch calls. All web content was treated as untrusted data. Vendor pages are self-reported. Where only a search-engine summary was available (no full-page fetch), that is noted as "(search summary)". Two pages were fetched in full: Caseware ReviewComp sign-off scheme and SPbinder "Sign off documents".

## 1. Review workflow in each product (stages, notes, send-back, sign-off, dashboards, portals, audit trail)

### Takeaway
The best-documented products (SurePrep SPbinder, Caseware Cloud, UltraTax CS) all use **role-levelled sign-offs with a name and timestamp**, and **flag** a document changed after sign-off. None that I could confirm **automatically removes** the sign-off. Send-back is mostly a manual status or stage change in a practice-management tool (TaxDome, Karbon), not part of the workpaper. The AI-native tools (Juno, Filed, Black Ore) sell a "review-ready workpaper" with source links and mismatch flags, but their review-stage UX is barely documented in public.

### Cited Findings

**Thomson Reuters SurePrep: SPbinder and 1040SCAN**
- **Sign-off levels:** four fixed levels, L1 Preparer, L2 Reviewer, L3 Signer and L4 Partner. Admin maps each check mark to a role, and users sign only at the levels their role allows. "The user with the highest level rights can sign-off at the lowest levels." — [SPbinder: Sign off documents](https://www.thomsonreuters.com/en-us/help/sureprep/spbinder/work-with-documents/sign-off-documents.html) (fetched 16 Oct 2026)
- **Sign-off log:** each sign-off records name, date and time. Signing again at the same level after someone else adds a new log entry. Signing again when nobody else has signed since only updates your timestamp. — same source
- **Change after sign-off:** "A Caution icon appears next to a workpaper that was modified after being signed off," and every user sees it whatever their level. The help page describes no automatic reset of the sign-off. — same source
- **Unsigning:** "Clear Sign is enabled for the user with the most recent sign-off at that level." Once someone else signs at that level, you can no longer clear yours. Clearing a sign-off "does not unreview the page's references or linked TR stamps." — same source
- **Progress view:** in the Review Tree, a signed-off workpaper turns green and bold and the unreviewed count drops by one. — same source
- **What the Review Tree flags:** documents that are missing, appear blank, have unreviewed fields, or have uncleared notes. It also lists unreviewed TR stamps (amounts exported to tax software; Ctrl-click marks one reviewed), unreviewed sticky notes, and workpapers marked for rollforward. — [SPbinder: brief tour](https://www.thomsonreuters.com/en-us/help/sureprep/spbinder/get-started/a-brief-tour-getting-started) (search summary)
- **Review notes:** preparers and reviewers create, respond to and clear review notes. An "Uncleared Notes" tab tracks the responses. — [SPbinder: workflow](https://www.thomsonreuters.com/en-us/help/sureprep/spbinder/get-started/workflow) (search summary)
- **Hand-off status (new):** from the 27 Jul 2026 release, a preparer can "Flag for Review" from the Sign-Off Options window. The binder's FileRoom status becomes "Flagged for Review", described as "a new standardized status indicating the binder is ready for review and finalization." Before this there was no standard hand-off status. — [1040SCAN release notes, 2026-07-27](https://www.thomsonreuters.com/en-us/help/sureprep/release-notes/1040scan-release-notes/2026/2026-07-27-release--flag-a-binder--review-module-d) (search summary)

**CCH Axcess (Wolters Kluwer)**
- **Note types:** Preparer Notes carry forward year to year. Reviewer Notes apply to the current year only. Missing Item notes can be assigned to staff. — [Wolters Kluwer: Onscreen review is the next critical stage (Mar 2023)](https://www.wolterskluwer.com/ja-jp/expert-insights/onscreen-review-is-the-next-critical-stage-for-tax-workflow-improvement) (search summary)
- **Note record:** each note records who wrote it, whether it needs resolution and who cleared it. Notes can attach to a single field or to the whole return, in the worksheet view or the government-form view. — same source
- **Self-check before review:** a Tax Return Dashboard lets preparers find and fix issues before submitting the return for review. — same source
- I did not find CCH Axcess Workflow documentation on stage definitions, send-back, or sign-off reopening. See Gaps.

**Caseware Cloud (audit/engagement)**
- **Sign-off statuses** on the Documents page: "Partially prepared", "Partially reviewed", "Prepared", "Reviewed" and "Modified since last review". The last means "Documents that have changed since the last time a reviewer has signed off on them." It shows as a warning icon, and selecting it shows the last reviewer's name and date. The page does not say whether the change removes sign-offs. — [Caseware: Define a document's signoff scheme](https://www.caseware.com/docs/en/cloud/global-reviewcomp/define-a-documents-signoff-scheme) (fetched 16 Oct 2026)
- **Configuration:** sign-off schemes (which roles must sign each document) are set per template. — [Caseware Cloud: Review and customize signoff schemes](https://www.caseware.com/docs/en/cloud/caseware-cloud/authoring/template-setup/roles-and-signoffs/review-and-customize-signoff-schemes) (search summary)
- **Manual removal:** select the initials and choose "Remove Signoff". — [Caseware: US sign off](https://www.caseware.com/docs/en/cloud/sqm-us/features/us-sign-off) (search summary)
- **Desktop only (not confirmed for Cloud):** Working Papers warns about sign-offs made out of order. A "Make read only after sign offs" option locks a document once a role signs. — [Caseware: reverse sign off](https://www.caseware.com/docs/en/desktop/working-papers/engagements/roles/reverse-sign-off) (search summary)

**UltraTax CS (Thomson Reuters)**
- **Diagnostics:** the diagnostics window (Ctrl+D) lists warnings about incorrect or missing data. It refreshes every time data changes, and selecting a message jumps to the field. — [UltraTax CS: Review diagnostic messages](https://www.thomsonreuters.com/en-us/help/ultratax-cs/errors/review-diagnostic-messages) (search summary)
- **FYI diagnostics:** these can be acknowledged and later reverted to active. — [UltraTax CS: FYI diagnostics](https://www.thomsonreuters.com/en-us/help/ultratax-cs/errors/fyi-diagnostics) (search summary)
- **Visual flags:** blue chevrons mark fields that were filled last year but are blank this year. Red chevrons mark overridden amounts, which are also listed on an "Input Screen Overrules" tab. A Watch tab tracks chosen values and can be frozen to show changes. A Return Summary shows key amounts. — [UltraTax CS: Review tools and features](https://www.thomsonreuters.com/en-us/help/ultratax-cs/miscellaneous/review-tools-and-features.html); [Enabling notifications of overruled data](https://cs.thomsonreuters.com/ua/ut/cs_us_en/utwapp/sysconfig/enable_notif_overruled_data.htm) (search summary)

**Lacerte (Intuit)**
- The only finding: one G2 reviewer praises Lacerte's audit diagnostics for giving "clear indicators for potential issues". The same reviewer reports that mid-season updates cause glitches and slowdowns, and that switching modules and printing large returns feels clunky. That is one person's report. — [G2: Lacerte reviews](https://www.g2.com/products/lacerte/reviews) (search summary)

**TaxDome (practice management and client portal)**
- **Signing moves the job:** a job can move to the next pipeline stage automatically once every party has signed. Linking a pending Form 8879 to the job triggers that move. — [TaxDome help: Tax Preparation, configure processes](https://help.taxdome.com/article/920-tax-preparation-configure-processes-in-taxdome) (search summary)
- **Client portal:** clients can approve or reject files, see client-facing statuses in the portal or mobile app, and sign on mobile. Internal job comments are hidden from clients. — [TaxDome: Client experience](https://taxdome.com/en-au/client-portal); [TaxDome: document management](https://taxdome.com/document-management) (vendor pages, search summary)
- **Sending a job back:** when a job moves backward, the automations for a stage must be reapplied when it re-enters that stage. Send-back is a pipeline move, not a review-note concept. — [TaxDome help article 920](https://help.taxdome.com/article/920-tax-preparation-configure-processes-in-taxdome) (search summary)
- **KBA cost:** identity verification (KBA) for IRS-compliant 8879 signatures costs about $1 per signer. — same source

**Karbon**
- Work statuses are customizable per work type and set from a drop-down. Changes to the status list apply across the team immediately. — [Karbon help: Overview of workflow](https://help.karbonhq.com/en/articles/6085829-overview-of-workflow) (search summary)
- Workflow-management score on G2: 8.3/10 for Karbon (351 reviews). Canopy had too little data for a score. — [G2: Canopy vs Karbon](https://www.g2.com/compare/canopy-2026-05-12-vs-karbon-2025-03-03) (search summary)

**Canopy**
- A competitor review (TaxDome, so biased) says Canopy users report that note tracking is limited and context is easy to lose on complex tasks. — [TaxDome blog: Karbon vs Canopy](https://blog.taxdome.com/karbon-vs-canopy) (search summary)

**Juno**
- **Workpaper (Jul 2026):** the Firm360 AutoPrep partnership says Juno extracts data from more than 100 document types, builds a "review-ready workpaper", flags mismatches between source and return, and pushes verified data into Drake, Lacerte, ProConnect, CCH Axcess and UltraTax. — [CPA Practice Advisor, 15 Jul 2026](https://www.cpapracticeadvisor.com/2026/07/15/firm360-introduces-autoprep/186752/); [Firm360 × Juno](https://www.myfirm360.com/our-solution/autoprep/)
- **Automation claims (vendor):** Firm360 says about 90% of data entry is automated; Juno says prep time falls by 50%. — same sources
- **Business returns:** an Aug 2026 TaxDome recap says Juno now prepares business returns (1120, 1120-S, 1065). — [TaxDome webinar recap: Juno](https://taxdome.com/blog/webinar-recap-and-qa-ai-powered-business-returns-with-taxdome-juno)
- **User review:** one G2 reviewer (4.5/5, 30 Jul 2026) praised the AI for catching tax problems and disliked the calculator and the order of source documents in the bookmarked PDF. — [G2: Juno](https://www.g2.com/products/juno-tax/reviews)

**Filed**
- **Product:** Filed's Prowork assistant runs beside the tax software and as an Excel add-in. It prepares returns from client documents, checks figures against their sources and generates workpapers. — [ai.engineer org page: Filed](https://ai.engineer/orgs/filed) (search summary)
- **Protocols:** reviewer corrections written in plain English become reusable firm instructions called "Protocols". — same source
- I found no step-by-step description of Filed's review stage.

**Black Ore (Tax Autopilot)**
- **Output:** Tax Autopilot produces the return plus supporting workpapers "with a review workflow". A Black Ore CPA team does a first-pass review before returning the work to the firm. — [CPA Practice Advisor, 7 Nov 2023](https://www.cpapracticeadvisor.com/2023/11/07/black-ore-launches-with-60-million-in-funding-to-bring-ai-to-financial-services/97324/)
- **Access:** after two years in early access, 75 firms were onboarded from a waitlist of about 4,000. — [International Accounting Bulletin](https://www.internationalaccountingbulletin.com/news/black-ore-opens-tax-autopilot-ai-platform-to-more-cpa-practices/)
- **Independent reviews:** none; Black Ore had 0 reviews on G2. — [G2: Black Ore](https://www.g2.com/sellers/blackore)

**Related AI-native pattern: Instead (a competitor, not on the list)**
- Instead's review stage gives the reviewer a complete workpaper with source citations and an AI review pass that has "organized findings by severity". The reviewer works from a findings list instead of rebuilding the return. — [Instead blog, Sep 2026](https://instead.com/resources/blog/how-ai-tax-return-review-works-in-instead) (vendor)

### Inferences
- **Common baseline:** role-levelled sign-off with name and timestamp, plus a "modified after sign-off" warning, is standard (SurePrep, Caseware). A modern workpaper must at least match it.
- **Reopen on change is a gap:** both documented products *warn* about a change but leave the stale sign-off in place. Invalidating the sign-off automatically, scoped to the values that changed (as GitHub does with stale approvals), is a clear improvement.
- **Send-back lives in the wrong place:** it sits in practice-management tools as a pipeline move, apart from the notes that explain *why*. Joining "send back" to the open notes that caused it is a gap.
- **Self-check before review:** preparer checks before hand-off (CCH dashboard, UltraTax diagnostics) are a recognised pattern. The new SurePrep "Flagged for Review" status (Jul 2026) shows even incumbents only recently standardised the hand-off status.

### Gaps
- **CCH Axcess Workflow:** no primary documentation found for stages, send-back or whether sign-offs reopen.
- **Lacerte:** no primary documentation found for review mode or review marks.
- **UltraTax review marks (tickmarks):** the only source is a 2010s-era PDF ([18987_UltraTaxCS_Review.pdf](https://cs.thomsonreuters.com/company/08-pdfs/18987_UltraTaxCS_Review.pdf)), which I did not fetch.
- **Canopy, Karbon, Juno, Filed, Black Ore:** review-note and sign-off mechanics are not publicly documented in what I found.
- **Audit-trail depth:** apart from SPbinder's sign-off log (name, date, time), I found nothing on audit-trail depth (field-level history) in any product.

## 2. Practitioner pain points

### Takeaway
Evidence is thinner than expected. My searches returned no r/taxpros threads, and the trade press has no article focused on "review notes in email". What I could confirm is that review is a staffing bottleneck, that reviewers spend their time on tie-out and completeness checks, that software is slow or glitchy mid-season, that diagnostics are hard to read, and that tracking notes and context is weak in some practice-management tools.

### Cited Findings
- **Review is the bottleneck:** reviewers are scarce because the role needs years of experience, and most review-queue time goes to tie-out and completeness checks. This is a non-trade source (EDUCBA), so weaker evidence. — [EDUCBA: What is tax return review](https://www.educba.com/tax-return-review/)
- **Review spills upward:** work bunching pushes some review to audit managers and partners outside the tax team. — [CPA Trendlines, 1 Mar 2023](https://cpatrendlines.com/2023/03/01/what-makes-an-excellent-tax-return-reviewer/)
- **Admin coordination:** one firm uses administrative staff to coordinate reviews by staff and managers. This suggests the coordination itself is overhead. — [Journal of Accountancy, Jan 2024, "Tips for a better tax season"](https://editions.journalofaccountancy.com/publication/?i=809710&article_id=4689851&view=articleBrowser)
- **AI in review:** firms are adopting AI alternatives in the review process. — [JofA, Tax season 2025 preview](https://www.journalofaccountancy.com/issues/2025/jan/tax-season-2025-preview/)
- **Slow, glitchy software:** mid-season updates cause glitches and slowdowns, and switching modules and printing large returns is clunky (one Lacerte reviewer). — [G2: Lacerte](https://www.g2.com/products/lacerte/reviews)
- **Hard-to-read diagnostics:** diagnostics are "often poorly written and difficult to see" (one TaxPrep reviewer on Capterra; TaxPrep is a Canadian product). — [Capterra: Taxprep reviews](https://www.capterra.com/p/185193/Taxprep/reviews/?page=2)
- **Support waits:** one TaxPrep user reported waiting 42 minutes on hold for support. — same source
- **Lost context:** Canopy users report that note tracking is limited and context gets lost on complex tasks (competitor-reported). — [TaxDome blog](https://blog.taxdome.com/karbon-vs-canopy)
- **Broken sequences:** completing Kanban-style tasks out of order can break workflows (competitor-reported). — same source
- **Juno PDF ordering:** a Juno user disliked the order of source documents in the bookmarked PDF. Navigating the PDF binder is a friction point even in AI tools. — [G2: Juno](https://www.g2.com/products/juno-tax/reviews)
- **Unreviewed items:** SurePrep's Review Tree exists to surface unreviewed fields, stamps, sticky notes and uncleared notes. It is indirect evidence that finding what still needs review is a recognised problem. — [SPbinder brief tour](https://www.thomsonreuters.com/en-us/help/sureprep/spbinder/get-started/a-brief-tour-getting-started)

### Inferences
- **Two jobs the design should do:** (a) cut tie-out time by putting each number next to its source, and (b) make "what is left to review" and "what changed since I looked" obvious. These match the bottleneck findings and the incumbents' own features (Review Tree, Watch tab, caution icon).
- **Diagnostics must be legible:** written in plain words and placed next to the field they concern.

### Gaps
- **Reddit:** no r/taxpros or r/Accounting threads came back from search, so I cannot report how many practitioners agree on specific complaints. Fetching a subreddit search directly would be the next step.
- **Unconfirmed complaints:** "Review notes lost in email" and "PDF tickmarks" were not confirmed by any source I found. Treat them as plausible but unsourced.
- **AICPA:** no AICPA survey data on review-cycle time or send-back rates was found.

## 3. Modern patterns from adjacent fields

### Takeaway
GitHub's branch protection gives the clearest model for a tax workpaper: required reviews, **stale approvals dismissed when the reviewed content changes**, **all conversations resolved before merge**, and the latest change approved by someone other than its author. Audit AI (DataSnipper) contributes **a link from every number to a snippet of its source document**. Harvey contributes **review tables with cells verified per item, where re-running does not undo verified work**.

### Cited Findings
- **Stale approvals:** with required reviews and stale-review dismissal on, a commit that changes code on an approved pull request dismisses the approval, and the PR must be approved again before merging. — [GitHub Docs: About pull request reviews (GHES 3.7)](https://docs.github.com/ko/enterprise-server@3.7/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
- **Resolving conversations:** the PR author or anyone with write access can resolve a conversation. — same source
- **Further settings** (third-party GraphQL reference, not GitHub's own documentation): "require conversation resolution" blocks merging until all conversations are resolved, and "require approval of the most recent reviewable push" by someone other than the pusher. — [jsr.io GitHub GraphQL PullRequestParameters](https://jsr.io/@hk/github-graphql@0.2.2/doc/~/PullRequestParameters)
- **Admin override:** repository admins can merge without approval. In a workpaper, this would be the partner override, and it should be logged. — [GitHub Docs (GHES 3.4)](https://docs.github.com/de/enterprise-server@3.4/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews)
- **DataSnipper:** auditors extract, match, link and "snip" values from supporting documents (invoices, bank or broker statements) into Excel workpapers "with clear audit trails". The result is reviewable chains of evidence. — [idp-software.com: DataSnipper](https://idp-software.com/vendors/datasnipper/); [DataSnipper: audit](https://www.datasnipper.com/campaign/audit) (vendor or secondary)
- **MindBridge:** scores risk on 100% of ledger entries and flags anomalies. This is population-level risk scoring, not sampling. — [MindBridge AI Audit Methodology whitepaper](https://info.mindbridge.ai/hubfs/docs-website/Whitepaper/MindBridgeAnalytics-AI-Audit-Methodology-Whitepaper.pdf); [tooldirectory.ai: DataSnipper (reviewed 13 Sep 2026)](https://tooldirectory.ai/tools/datasnipper)
- **Harvey Vault Review Tables:** these organise extracted data points from many documents into an interactive table. A Jan 2026 release added the ability to "update and re-run review table columns without redoing verified work". — [Harvey: Review Tables video](https://www.harvey.ai/resources/videos/review-table-overview); [Harvey EU release notes](https://eu.help.harvey.ai/release-notes/page/4)
- **Harvey citations:** users can view the relevant snippet of a source or the whole document. — [Harvey help: Getting started](https://help.harvey.ai/en/articles/10580373-getting-started-with-harvey); [Contrary Research: Harvey](https://research.contrary.com/company/harvey)
- **Severity-sorted findings:** an AI review pass gives findings ordered by severity, with citations to the workpaper. — [Instead blog, Sep 2026](https://instead.com/resources/blog/how-ai-tax-return-review-works-in-instead) (vendor)

### Inferences
These map to tax review as follows:
- **Stale approvals → field-scoped sign-off invalidation.** If a value changes under a signed-off section, that sign-off becomes stale and the section returns to "needs re-review", with a diff of what changed. This is stronger than SurePrep's and Caseware's warning icon.
- **Required conversation resolution → no partner sign-off or client release while any review note is open.**
- **Most-recent-push approval → the person who made the last change cannot be the one who signs it off.**
- **Required checks (CI) → computed diagnostics** (cross-checks, prior-year variance, source mismatch) that must pass or carry a written waiver before sign-off.
- **DataSnipper/Harvey → each value links to a snippet of its source document.** Verification is recorded per value, and survives recomputation unless that value changes.

### Gaps
- **GitHub docs:** I cited GHES versions, not the current github.com page. The behaviour is long-standing, but I did not confirm wording as of Oct 2026.
- **Harvey:** how the "verified" state is shown in the UI was not documented in what I found.
- **DataSnipper/MindBridge:** no native integration between the two was found.

## 4. Client experience (portals, e-signature, approval)

### Takeaway
The best-documented client friction is **identity verification (KBA) for e-signing Form 8879**: questions about the client's financial past, a 10–15% failure rate, a fallback to wet signature after three failed attempts, and a fresh check every year. Clients also confuse which forms to mail. I found no source on plain-language summaries or year-over-year comparison as aids to client approval.

### Cited Findings
- **KBA content:** remote e-signature on Forms 8879/8878 needs identity verification. KBA questions are "usually multiple choice questions such as the name of their mortgage lender, type of car financed, a former address or phone number". Taxpayers who cannot pass cannot use e-signature. Verification is required every time they sign, with two exceptions. — [IRS: FAQ on e-file signature authorization](https://www.irs.gov/e-file-providers/frequently-asked-questions-for-irs-efile-signature-authorization)
- **KBA failure rate:** clients fail KBA questions 10–15% of the time. This is an industry vendor blog, not IRS data. — [Mango Practice: KBA and tax season](https://mangopractice.com/blog/knowledge-based-authentication-compliance-and-tax-season/)
- **Fallback:** after three failed KBA attempts a handwritten signature is required, and one wrong answer fails the whole set. — [Liscio: Form 8879 e-signature guide](https://www.liscio.me/resources/form-8879-electronic-signature-guide-for-tax-preparers); [Encyro blog](https://blog.encyro.com/form-8879-irs-compliant-signature/) (vendor blogs)
- **Form confusion:** clients think they must mail the 8879 and confuse it with Form 8453. — [Reed Corp: Form 8879 explained](https://reedcorp.tax/helpful-guides/form-8879-explained/) (one practitioner's report)
- **Mixed client preferences:** firms serve a mix of all-electronic clients, clients who can't pass KBA, and wet-signature insisters. Taking the user straight to the signature lines avoids confusion and skipped content. — [Insightful Accountant: e-signatures for 8879](https://insightfulaccountant.com/tax-and-practice-management/should-you-move-to-electronic-signatures-for-form-8879/)
- **Portal patterns (TaxDome, vendor):** client-facing statuses separate from internal ones, approve or reject on files, mobile signing, and an automatic move to the next stage once all parties sign. — [TaxDome: Client experience](https://taxdome.com/en-au/client-portal)

### Inferences
- **Approval should be one screen:** a short plain-language summary (refund or amount due, the main changes from last year), then one action that leads straight to the signature.
- **Plan for KBA failure:** offer an obvious wet-signature fallback and say up front that verification is needed every year.
- **Two status vocabularies:** keep the internal one ("Partially reviewed", "Sent back") hidden from clients and show a simpler client vocabulary (TaxDome's split is the precedent).

### Gaps
- **Summaries and comparisons:** no source was found measuring whether a plain-language summary or a prior-year comparison makes client approval easier. This is a design hypothesis, not a sourced finding.
- **Client-side data:** no independent survey of client confusion with tax portals (as opposed to accountant-side or vendor claims) was found.
- **Document-request chasing:** "chasing clients for documents" is widely assumed, but in this pass I found no source quantifying it.
