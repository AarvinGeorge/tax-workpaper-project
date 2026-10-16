# Packet README (verbatim)

Extracted by script `docs/packet/readme_extract.py` (run: `python3 -I docs/packet/readme_extract.py <packet> docs/packet`) from the packet's `readme` key. Text is copied exactly; only Markdown structure (headings, bullets) is added. Machine copy: `readme.json` (same folder).

> **Viewing note:** 9 placeholders such as `<form>.<line>` contain angle brackets, which some Markdown viewers hide as HTML. The raw text of this file and `readme.json` are exact (verified by Fable 5.1, `reviews/readme-verify.md`); read those if a rendered view looks incomplete.

- Packet file: `case-study-project-package/okafor_lindqvist_2025_packet (1).json`
- SHA-256 of the canonical `readme` object (sorted keys, compact): `4efd91f725028fffa6a3ddc2fde653d6600a3415caf7988c740750461a738c22`
- Top-level keys (9): `what_this_is`, `all_data_is_invented`, `truth_and_mistakes`, `no_page_images`, `engine_and_recomputing`, `where_now_is`, `reference_formats`, `sections`, `form_codes`

## `what_this_is`

Everything Miraflores' pipeline would hand the workpaper for one client's 2025 return: the documents (as records), every value read from them, the client's answers and messages, prior-year records, tax agency records, firm settings, and the return as computed at three moments. It is pipeline output, not a workpaper: it contains no reviews, notes, sign-offs or decisions. Those are yours to design.

## `all_data_is_invented`

People, companies, numbers, SSNs (the 666 prefix is never issued), EINs, PTINs and accounts are fictional.

## `truth_and_mistakes`

documents[].pages[].printed_content states what is actually printed on each page. extracted_values states what the pipeline read, which can be wrong. return_versions reflect the engine's reading and rules, which can also be wrong. The packet contains mistakes with high confidence scores, as real pipeline output does.

## `no_page_images`

There are no page images. position values in extracted_values are synthetic: use them only to place highlights on a rendered representation of printed_content if you want to.

## `engine_and_recomputing`

Tax computations come from a simplified engine. Rate tables, thresholds and rules it used are in engine_reference; treat them as given. California AMT is not computed. You cannot rerun the engine: to show the tax effect of a change, multiply the change by the matching rate in return_versions[].tax_effect_rates (federal and California, per dollar). what_if holds engine results for specific alternatives.

## `where_now_is`

v3 (2026-06-23) is the latest engine output and the current return. Timeline events after that (client approval, e-file rejection and acceptance, payments, refunds, the 2028 examination letter) are scripted for replay; where they mention amounts, they mean the return as your workpaper finalizes it.

## `reference_formats`

- **`ev-NNNN`**: extracted_values[].id
- **`D01..D74`**: documents[].id
- **`qa-NN / msg-NN / call-NN`**: client.questionnaire / client.messages / client.call_notes ids
- **`py:/<json pointer>`**: a location inside prior_years, written as a JSON Pointer (RFC 6901), e.g. py:/carryovers_into_2025/capital_loss_short
- **`agency:/<json pointer>`**: a location inside tax_agency_records
- **`asset:<asset_id>`**: return_versions[].assets[].asset_id (same version) or prior_years.asset_records[].asset_id
- **`household:<id>`**: household.people[].id
- **`ref:param.<name>`**: engine_reference.parameters.<name>
- **`ref:fx.SEK.<rate>`**: engine_reference.parameters.fx.SEK.<rate> (also in fx_rates)
- **`timeline:<id>`**: timeline[].id (tl-NN, plus extension-2026-04-14 for the extension event)
- **`doc:<id>#page<n>`**: a page of a document that the pipeline did not extract
- **`line keys`**: <form>.<line>, e.g. F1040.11; return lines' inputs are keys of other lines in the same version

## `sections`

- **`packet`**: Name, version, generation date and the firm's client id.
- **`household`**: filing_status; people[] (id, role, name, ssn, dob, relationship, months_lived_with_you, full_time_student, ip_pin, contact) exactly as the client entered them; addresses[] and residency[] with dates; bank_account_for_refund_or_payment; prior_year_agi_for_esignature; related_returns[].
- **`documents`**: 74 documents. Fields: id, title, document_type, issuer, belongs_to (taxpayer | spouse | joint | dependent:<id>), tax_year, received_at, uploaded_by (client | firm), file_name, page_count, pages[{page, printed_content}], marked_corrected (when the issuer marked it CORRECTED), extraction {status: extracted | partial | not_extracted, values, reason}.
- **`extracted_values`**: Fields: id, document_id, page, field (issuer's box or field name), label, value, value_type (money | date | text | integer | quantity | percent | boolean | code | ssn | ein | account_number), text_as_read (empty when nothing was printed), position {x0, y0, x1, y1} (synthetic, fractions of the page from the top-left), confidence (0-1).
- **`client.questionnaire`**: id, question, answer, answered_by, answered_at.
- **`client.messages`**: id, sent_at, from, to, text.
- **`client.call_notes`**: id, date, participants, notes[].
- **`firm`**: name; firm_identity (EIN, address, EFIN, ERO PIN, PTINs by staff id, who signs as paid preparer); staff[] (id, name, role, credential, sensitive_data_clearance, active_from, note); client_users[]; assignment_at_start; deadlines[]; budget_hours by area; starter_standards (verification_types, variance_review, review_levels, rules, required_steps) - a starting point you may change.
- **`prior_years.return_2024`**: The 2024 return as filed: lines {key: value}, line_labels, line_sources (extracted value ids on document D06), notes, dependents, K1_1120S, K1_1065.
- **`prior_years.prior_preparer_workpaper`**: Summary memo, notes, open items left by the prior preparer (document D07).
- **`prior_years.asset_records`**: Assets placed in service before 2025: asset_id, description, activity, cost (depreciable cost; land shown separately as land_value), placed_in_service, method, life_years, disposed, federal {year: depreciation}, california {year: depreciation}, amt_difference, sources.
- **`prior_years.basis_records`**: S corporation stock basis, partnership capital, IRA basis and home cost by year. Gaps are real gaps.
- **`prior_years.carryovers_into_2025`**: Federal and California carryovers from 2024.
- **`tax_agency_records`**: irs_account_transcript_2025[] snapshots {as_of, transactions[{date, code, description, amount}]} (IRS transaction codes: 150 return filed, 196 interest, 276 failure-to-pay penalty, 460 extension, 610 payment with return, 670 payment); ftb_account; notices[] (id, agency, type, tax_year, dated, summary or items_under_examination, status, response_due, document); efile[] submissions {date, jurisdiction, submission_id, status, errors[{code, message}]}.
- **`timeline`**: Events in time order: id, at, event, actor (firm staff id or null), detail, refs. Event names: engagement_signed, questionnaire_submitted, client_marked_upload_complete, document_received, return_computed, work_started, irs_transcript_pulled, staff_joined_engagement, client_call, extension_filed_with_payment, client_message, client_approved_and_signed_8879, efile_rejected, efile_accepted_federal, efile_accepted_california, federal_balance_paid, california_refund_issued, quality_review_selected_return, next_year_engagement_started, notice_received.
- **`engine_reference`**: parameters (rates, thresholds, exchange rates the engine used; bracket tables are [upper_bound or null, rate]) and rules {rule id: description}.
- **`return_versions[]`**: version, computed_at, trigger, documents_used, documents_superseded, summary {federal, california: totals}, tax_effect_rates {category: {federal_per_dollar, california_per_dollar}} by category: wages (federal and California-source), interest (and dividends), schc_profit (also drives SE tax and QBI), stcg, ltcg, ordinary_income (other income, California-source), adjustment (adjustments to income), salt (state and local taxes, subject to the cap), itemized (other itemized deductions), ca_source_income (changes only the California-source amount, e.g. a California wage split). California rates for interest, gains, Schedule C and adjustments assume residency-day proration; for an item fully California-source (a sale during California residency, the Sacramento rental) use ca_source_income for the California effect. Adjustments tied to the business (SEP, SE health insurance) also change the QBI deduction, which the adjustment rate does not capture. Credits and payments change tax or balance due 1:1. Rates are measured at this version's numbers; large changes can cross thresholds - the real system recomputes. carryovers_out (federal and California, from this version); assets[] (2025 per-asset depreciation: federal, California, AMT, accumulated, disposition); diagnostics[] {code, severity: info | warning, message, refs}; changes_from_previous[] {key, change: added | changed | removed, old, new}; lines[].
- **`return_versions[].lines[]`**: key, jurisdiction (federal | california), form, line, label, value (whole dollars, except Form 8949 lots in cents; some lines hold text, dates or ratios), rule, inputs, sources, note.
- **`what_if`**: alternatives[] {id, description, base_version, choices, federal and california {base, alternative, total_tax_change, penalty_change}, changed_lines[]}; extension (the April estimate made from v2).
- **`planning_reference_2026`**: Due dates and safe-harbor rules for next year's estimates.
- **`post_filing_rates`**: Interest and penalty rates for payments made after the due date.
- **`fx_rates`**: Exchange rates available to the engine (same as engine_reference.parameters.fx).

## `form_codes`

F1040, Sch1, Sch2, Sch3, SchA, SchB, SchC, SchD, SchE, SchSE, F8949 (lines <box>.<lot>), F4797, F4562-C (Schedule C assets), F4562-E (rental assets), F8582, F6251, F8959, F8960, F8995 or F8995A, F8812, F8863, F2441, F8889, F8606, F8283, F7203, F8938, F2210, F8867, SchCA540NR (lines <line>.<column A-E>), F540NR, ScheduleS, FTB3885A, FTB5805. Line numbers follow the 2025 forms where the engine maps them.

