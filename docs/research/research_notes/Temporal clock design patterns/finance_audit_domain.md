# How accounting, audit and tax systems handle "as of" time: conventions for a tax workpaper's story clock

Researched Sun 18 Oct 2026. Sources fetched in the same session unless marked "(search snippet)". The fetch tool sometimes paraphrases; where only a search snippet or a third-party source was available, it says so. Older material is flagged.

## Q1. Open-source accounting/ERP: lock dates, reversals vs edits, amendments, as-of reports

### Takeaway
Mature systems do not silently rewrite closed history. They (a) lock a period by date (Odoo, GnuCash, ERPNext "frozen up to"), (b) make a posted document immutable and fix it by cancel-then-amend with a back-link (Frappe `amended_from`) or by adding a new entry, and (c) produce as-of reports by cutting the ledger at a date and rolling earlier history into opening balances (Fava, hledger). "Closing" a period and "locking" it are separate acts.

### Cited Findings
- **Odoo lock dates.** "Setting a lock date prevents modifications to any posted journal entries" and "also prevents posting new entries with an accounting date on or before the lock date." Entries that land in a locked period are pushed forward: "the system automatically sets the accounting date to the day after the lock date." — [Odoo 18 docs, Year-end closing](https://www.odoo.com/documentation/18.0/applications/finance/accounting/reporting/year_end.html)
- **Odoo exceptions are logged.** "Users with Administrator access rights can create exceptions"; "All of this information is logged in the chatter of the company record." — [Odoo 18 docs](https://www.odoo.com/documentation/18.0/applications/finance/accounting/reporting/year_end.html)
- **Odoo hard lock date is one-way.** "The Hard Lock date field is irreversible and is intended to ensure data inalterability"; it "cannot be changed or overridden, regardless of access rights", and "should only be set once it is confirmed to be correct." — [Odoo 18 docs](https://www.odoo.com/documentation/18.0/applications/finance/accounting/reporting/year_end.html)
- **ERPNext: closing is not locking.** The Period Closing Voucher moves P&L balances into equity. Per the docs, "The voucher does not erase history or stop backdated entries." To block later postings you use an Accounting Period or the "Accounts Frozen Upto" date. If adjustments are posted after closing, "ERPNext does not silently rewrite the submitted voucher". You submit another closing voucher for the remainder. — [ERPNext docs, Period Closing Voucher](https://docs.frappe.io/erpnext/user/manual/en/period-closing-voucher)
- **Frappe document lifecycle.** `docstatus` is 0 Draft, 1 Submitted, 2 Cancelled. Submitted and cancelled documents cannot be edited, except "for individual fields we can explicitly allow edits, even when the document is in the submitted state" (the "allow on submit" fields). — [Frappe docs, DocStatus](https://docs.frappe.io/framework/doctypes/docstatus)
- **Frappe amendments.** You cannot take a submitted document back to Draft. You cancel it, then amend, which creates a new draft linked to the original through `amended_from`, named with a suffix (e.g. DOC-001-1, DOC-001-2). The cancelled original stays. — [Frappe docs search result](https://docs.frappe.io/framework/doctypes/docstatus); naming and copy behaviour from a third-party tool description, [frappe-mcp-server amend_document](https://glama.ai/mcp/servers/@appliedrelevance/frappe-mcp-server/tools/amend_document), and a community thread, [discuss.frappe.io](https://discuss.frappe.io/t/programmatically-cancel-amend-save-a-doctype/18381). Not confirmed from official docs.
- **Fava (beancount web UI) time filter.** Fava "does not just filter to the transactions in the interval but also summarises transactions." Earlier income and expense balances go to retained earnings; other earlier transactions roll into an opening balances account. "All the entries after the end date are removed." Asset and liability accounts keep their accumulated balances. — [Fava help, filters.md](https://github.com/beancount/fava/blob/main/src/fava/help/filters.md)
- **hledger.** `-e/--end=DATE`: "include postings/transactions before this date". `--today=DATE`: "override today's date (affects relative dates)". Postings can carry their own date via a `date:` tag, distinct from the transaction date. `date2` (secondary date) exists but `--date2` is marked "deprecated". — [hledger manual](https://hledger.org/hledger.html)
- **GnuCash.** File > Properties has a "Day Threshold for Read-Only Transactions": the number of days before today prior to which transactions are read-only, shown as a red line in registers; 0 means all editable. It is relative to today, not a fixed date. Users asked for a fixed-date lock; a developer defended the day count as "set and forget". — [GnuCash manual, Book Options](https://lists.gnucash.org/docs/C/gnucash-manual/book-options.html); [gnucash-user list, 2018](https://lists.gnucash.org/pipermail/gnucash-user/2018-August/078925.html) (older; still day-based as of the 2018-2020 threads, current status not verified).

### Inferences
- The common grammar: **draft → submitted/locked → corrected by a new linked record**, never by editing the locked one. A filed return maps cleanly onto Frappe's Submitted state, and a 1040-X onto an `amended_from` child.
- An as-of view should be a **cut at time T that removes everything after T**, as Fava does. It should not be a filter that hides some later items and keeps others.
- Odoo's "push forward to the day after the lock date" is the ledger version of "a later change is dated now, not back-dated into the locked period".
- A visible marker of the lock boundary (GnuCash's red line) is a known UI convention.

### Gaps
- Could not read the hledger `balance` (`--change` / `--historical`) and `close` sections. The manual page is about 470k characters and the fetches did not reach them.
- Did not fetch ERPNext's Accounting Period or Accounts Frozen Upto pages directly. They are referenced only from the Period Closing Voucher page.

## Q2. Audit standards on workpaper history and immutability; audit software

### Takeaway
Both US audit standards draw a hard line at a **documentation completion date**. After it, nothing may be deleted. Any addition must record who made it, when and why, and the original stays. This is the clearest external precedent for "the filed return is locked; later changes are added on top, with author, time and reason".

### Cited Findings
- **PCAOB AS 1215 (public companies).** Complete, final documentation must be assembled no later than 14 days after the report release date (the documentation completion date). — [legalclarity.org summary](https://legalclarity.org/audit-documentation-standards-requirements-and-penalties/) (secondary). The PCAOB page itself returned HTTP 403 to the fetch tool: [AS 1215](https://pcaobus.org/oversight/standards/auditing-standards/details/AS1215).
- **Additions after completion must say who, when and why, and keep the original.** Per a search summary of secondary sources, if anyone adds to the file after the completion date, the addition must identify who made it, when and why, and the original file must be preserved. The PCAOB has disciplined a partner for failing to document changes made to workpapers after their completion dates. — [Accounting Today, PCAOB censure](https://www.accountingtoday.com/news/pcaob-censures-bars-partner-for-failing-to-cooperate-with-inspection) (search snippet). The paragraph number (.16) comes from model knowledge and was not verified.
- **AS 1215 is being amended.** PCAOB lists a version "effective on 12/15/2026" that amends paragraphs .09 and .11. — [PCAOB AS 1215 (effective 12/15/2026)](https://pcaobus.org/oversight/standards/auditing-standards/details/as-1215--audit-documentation-%28effective-on-12-15-2026%29) (title only; content not read).
- **AICPA AU-C 230 (non-public).** Assembly within 60 days of the report release date. After assembly the auditor "shall not delete or discard audit documentation of any nature before the end of its retention period". Modifications or additions must document "(a) the specific reasons" and "(b) when and by whom they were made and reviewed". Retention is at least 5 years from the report release date. — [open-exam-prep AU-C 230 study guide](https://open-exam-prep.com/study-guides/cpa-aud/final-evaluation-documentation/audit-documentation-retention); [legalclarity.org](https://legalclarity.org/audit-documentation-standards-requirements-and-penalties/) (both secondary; the AICPA text is not freely fetchable). Public-company retention is 7 years under the SEC rule, per the same secondary sources.
- **CaseWare Working Papers.** It uses role-based electronic sign-off (default "Prepared by" and "Reviewed by" roles, signed per document), a "Reverse a Sign Off" function, a "History and Milestones" event log with document version control, a "Lock Down" feature, and a year-end roll forward that carries selected documents and issues into the next year's file. — [CaseWare 2016 help, Electronic Review and Sign-off](https://documentation.caseware.com/2016/WorkingPapers/en/Content/Engagement_Management/Electronic_Review_and_Signoff/c_ElectronicReview_and_SignOff_About.htm) (older); [CaseWare 2022 Roles](https://documentation.caseware.com/2022/WorkingPapers/en/Content/Engagements/Review-Signoff/Roles.htm); [CaseWare roll forward](https://www.caseware.com/docs/en/desktop/working-papers/practice/year-end-close/select-items-roll-forward) (search snippets).

### Inferences
- Treat return acceptance like a documentation completion date. Before it, normal editing with history. After it, append-only entries that each carry author, timestamp and reason.
- Sign-offs are events in the history, not just flags. Reversing a sign-off is itself an event, as CaseWare's "Reverse a Sign Off" suggests.

### Gaps
- No primary text of AS 1215 or AU-C 230 was retrieved (403, or paywalled). The exact wording and paragraph numbers need checking against pcaobus.org and AICPA.
- Not confirmed whether CaseWare roll forward clears sign-offs or how Lock Down behaves.
- Found no open-source audit-workpaper equivalent of CaseWare.
- Did not research Circular 230 or preparer record retention (e.g. IRC 6107 copy-retention rules). Not covered.

## Q3. Tax-specific: amended returns layered on the original, transcripts as as-of records, e-file acceptance

### Takeaway
The 1040-X is a delta layered on the last known state: column A "as originally filed or as previously adjusted", column B the net change, column C the corrected amount, plus a written reason. IRS transcripts show the same split. The **return transcript** is the frozen as-filed record. The **account transcript** shows the current state including later changes. That is a ready-made "as filed vs as now known" model.

### Cited Findings
- **1040-X columns.** Column A "needs to reflect the amount to which your originally filed return was adjusted"; column B: "Enter the net increase or decrease for each line that you are changing"; column C: "For any item you don't change, enter the amount from column A in column C." Part II: "The IRS needs to know why you are filing Form 1040-X." — [IRS Instructions for Form 1040-X](https://www.irs.gov/instructions/i1040x)
- **Multiple amendments stack.** "You may amend your original return by filing Form 1040-X more than once, as long as each Form 1040-X is filed timely." — [IRS i1040x](https://www.irs.gov/instructions/i1040x). Up to 3 amended returns can be e-filed for the same year. — [IRS, File an amended return](https://www.irs.gov/filing/file-an-amended-return)
- **Refund window.** File "within 3 years (including extensions) after the date you filed your original return or within 2 years after the date you paid the tax, whichever is later." An early-filed return "is considered filed on the due date (generally April 15)." — [IRS i1040x](https://www.irs.gov/instructions/i1040x)
- **No second original after the due date.** "After the due date for an original return has passed, don't file any additional original returns for the same year." — [IRS i1040x](https://www.irs.gov/instructions/i1040x)
- **E-filing 1040-X.** "You can file Form 1040-X electronically with tax filing software"; a preparer who e-files also needs Form 8879. — [IRS i1040x](https://www.irs.gov/instructions/i1040x); [IRS, File an amended return](https://www.irs.gov/filing/file-an-amended-return)
- **IRS corrections need no amendment.** You don't need to amend if the IRS will "Let you know that we corrected errors on your return." — [IRS, File an amended return](https://www.irs.gov/filing/file-an-amended-return)
- **Transcripts (IRS Tax Tip 2026-65, 26 Aug 2026).** The return transcript "doesn't show any changes made after the original return was filed". The account transcript: "Unlike the tax return transcripts, this one will show changes made after the original return was filed". The record of account transcript combines both. — [IRS Tax Tip 2026-65](https://www.irs.gov/newsroom/tax-transcripts-know-the-different-types-and-how-to-get-them)
- **California.** Individuals amend by filing an amended Form 540/540NR with **Schedule X** attached. Schedule X works out the additional amount owed or refund and explains the reasons. It takes original-return figures, such as the overpayment from the original return and the tax paid with it. — [FTB 2020 Schedule X instructions](https://www.ftb.ca.gov/forms/2020/2020-540-x-instructions.html); [FTB 2019 instructions](https://www.ftb.ca.gov/forms/2019/2019-540-x-instructions.html) (older, tax years 2019-2020; the 2024 page returned 403). Form "540X" proper is a pre-2016-era form. [FTB 2015 540X](https://www.ftb.ca.gov/forms/2015/15_540X.pdf) is older material.

### Inferences
- Model an amendment as **original snapshot (immutable) + ordered list of deltas, each with a reason**. The "current" figure is the original plus all deltas visible at T. Column A of amendment n equals column C of amendment n-1, which is exactly a linear history.
- In the app, "as filed" should behave like the return transcript (frozen) and "current" like the account transcript (includes later changes). Label both explicitly.
- For a CA return, say "amended Form 540 + Schedule X". For tax year 2025, "540X" would be a domain error.

### Gaps
- Could not confirm in IRS primary text (Pub 1345 or the e-file pages) that an *accepted* e-filed return cannot be changed and must be corrected by amendment. This is standard practice and the 1040-X instructions imply it, but no direct quote was found.
- No current (TY2024/2025) FTB Schedule X text retrieved. The CA rule on reporting federal changes (within 6 months) was not verified.

## Q4. Bitemporal concepts in finance

### Takeaway
Two clocks are needed. **Actual/valid time** is when something was true. **Record/transaction time** is when the system knew it. A story clock that shows "what was known at T" is a record-time cut. A retroactive correction adds a new record with a later record time and the same valid period. It never overwrites.

### Cited Findings
- **Fowler, "Temporal Patterns" (16 Feb 2005, older but canonical).** Actual time is "the time something happened"; record time is "the time we knew about it". Payroll example: the rate is $100/day; payroll runs 25 Feb at $100; on 15 Mar the firm learns the rate became $211 effective 15 Feb. "What was the rate on 25 Feb?" has two answers, as now known or as believed when payroll ran. Patterns: Audit Log, Effectivity, Temporal Property, Temporal Object, Snapshot. — [martinfowler.com/eaaDev/timeNarrative](https://martinfowler.com/eaaDev/timeNarrative.html)
- **SQL:2011.** Supports application-time period tables (valid time) and system-versioned tables (transaction time), at most one of each per table. The standard does not use the word "bitemporal". — [Uni Leipzig, Temporal features in SQL:2011](https://old.dbs.uni-leipzig.de/file/Temporal%20features%20in%20SQL2011.pdf)
- **Corrections append.** A corrected record is a new version with the same valid period and a later transaction time. An "as at" list must include entities valid on that date even if they later ended, to avoid survivorship bias. — [JUXT, value of bitemporality](https://juxt.pro/blog/value-of-bitemporality); [TDWI 2026, temporal data modeling](https://tdwi.org/blogs/data-101/2026/05/what-is-temporal-data-modeling.aspx) (search snippets)
- **Insurance example.** Valid and transaction time diverge, e.g. a policy recorded well before it takes effect (Kulkarni & Michels). — [Uni Leipzig paper](https://old.dbs.uni-leipzig.de/file/Temporal%20features%20in%20SQL2011.pdf) (search snippet)

### Inferences
- For a workpaper the dominant axis is **record time** ("what had arrived and been computed by T"). Valid time is mostly fixed (tax year 2025). A late corrected 1099 is a retroactive event: valid for 2025, recorded at T2.
- Fowler's Snapshot pattern is the as-of view. Audit Log is the linear history. Temporal Property is "value of field X at T".

### Gaps
- Found no authoritative source defining an "as-at vs as-of" distinction in insurance or finance. Usage varies by firm, so treat any such distinction as unverified.
- Did not read Fowler's individual Retroactive Event or Temporal Property pages, only the overview narrative.

## Q5. Implications for UX

### Takeaway
The sources agree on three conventions. A past view is a full cut at T with nothing from after T leaking in. Locked state is visibly marked and read-only, with any override logged. A later correction is signalled from the old view as a linked record, not by changing the old view.

### Cited Findings
- Visible lock boundary: GnuCash draws a red line in registers at the read-only threshold. — [GnuCash manual, Book Options](https://lists.gnucash.org/docs/C/gnucash-manual/book-options.html)
- Cut semantics: Fava removes all entries after the end date and rolls earlier ones into opening balances. — [Fava filters help](https://github.com/beancount/fava/blob/main/src/fava/help/filters.md)
- Lock overrides are recorded where users see them (Odoo company chatter). — [Odoo 18 docs](https://www.odoo.com/documentation/18.0/applications/finance/accounting/reporting/year_end.html)
- Corrections are linked records: Frappe `amended_from`; 1040-X columns A/B/C; IRS return transcript vs account transcript. — sources above.
- hledger's `--today=DATE` overrides "today" for relative dates. That is a precedent for an explicit, user-set reporting clock rather than the wall clock. — [hledger manual](https://hledger.org/hledger.html)

### Inferences
- When viewing at T: show only events with record time at or before T. Show the return as computed at T. If T is on or after acceptance, show the filed return as read-only, with a lock badge naming the acceptance date.
- If a later amendment or correction exists beyond T, show a non-intrusive "superseded later. See amendment #n (dated …)" link. The past view itself must not change.
- Edits in a past or locked view should be disabled, with the reason given ("filed and accepted on …; changes go on an amendment"). They should not be silently allowed.
- History should be one ordered list where every entry has who, when and why, matching AU-C 230 and AS 1215. Sign-offs and reversals of sign-offs are entries too.

### Gaps
- Found no published UX research on as-of time travel in accounting tools. The UX points here are inferred from product behaviour, not from user studies.
