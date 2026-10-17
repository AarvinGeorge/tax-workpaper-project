# The packet README as a checklist: what U1-U20, B1-B18 and the mock-up still miss

Reviewer: Fable 5.1, independent. Written Fri 16 Oct 2026, 22:41 EDT (02:41 UTC Sat 17 Oct), from `date`.
Inputs read in full: `docs/packet/readme-verbatim.md` (every key), `firm.starter_standards` from the packet, `docs/discovery/11-brief-checklist.md` (U1-U20, B1-B18), `docs/discovery/reviews/checklist/fable-checklist.md`, `docs/design/mockup-directions/REVIEW-readme.md`, and the eleven `hybrid/project/*.dc.html` files (grep with line numbers). Packet queried read-only with `probe1.py`, `probe2.py`, `probe3.py` in this folder (`python3 -I`; outputs `probe*.out`); SSNs last 4 only. Nothing in `<repo>` was written.

**Keys.** Checklist: the U/B/brief item that covers the README line, or **missing**. Mock-up: C covered, P partial, M missing, with `file:line`. Layer: UI, Backend, Both. When: First (first deployed version) or Later.

| # | README line or field | What it requires of the app | Checklist | Mock-up (file:line) | Layer | When |
|---|---|---|---|---|---|---|
| R01 | `what_this_is`: "no reviews, notes, sign-offs or decisions. Those are yours to design" | The firm's own record is a separate schema; the packet is never edited | B15, B2 | C: Changes:74 "the packet stays read only"; actions are session toasts (Checks:277) | Backend | First |
| R02 | "the return as computed at three moments" | v1, v2, v3 each loadable and addressable | U8, B1 | C: ReturnMap:200 three columns | Both | First |
| R03 | `all_data_is_invented`: 666 SSN prefix, fictional EINs, PTINs, accounts | No SSA-style validity check may reject 666; the public link says the data is invented | **missing** | M: 0 hits for "invented"/"fictional" | Both | First (light) |
| R04 | `truth_and_mistakes`: printed_content is what is printed; extracted_values can be wrong | A "printed against read" check on every value, not only the 27 ledger cases | B9 | C: Main:738 CHECKS; ClaimDrawer:444 | Backend | First |
| R05 | return_versions "can also be wrong" | Checks re-derive; engine diagnostics shown beside, never instead | B9, C6 | C: Checks:279-280 | Both | First |
| R06 | "mistakes with high confidence scores" | Confidence shown as read certainty, never as trust | E1 | C: ClaimDrawer:82-83 | UI | First |
| R07 | `no_page_images`: position values are synthetic, fractions of the page from top-left | Highlights placed on a rendered printed_content; position is not a scan coordinate | E8, B16 | C: ClaimDrawer:102-103 | Both | First |
| R08 | "a rendered representation of printed_content" | Every document opens as a full simulated page set (199 pages; D31 has 32) | E9 (P) | P: ClaimDrawer:103 excerpt only | Both | First |
| R09 | `engine_and_recomputing`: parameters and rules "treat them as given" | Checks and recomputes read `ref:param.*` values (salt_cap 40,000, qbi_threshold 394,600, ss_wage_base 176,100, brackets as [upper_bound or null, rate]) instead of hard-coded law; "how it was built" shows the rule's description (97 rules; R-CA-CAPGAIN, R-CA-DIVIDENDS, R-CA-IRA cited by no v3 line) | **missing** (B9 silent on where rates come from; K2 P) | M: rule ids cited 721 times, no description or parameter value anywhere (0 hits "Arithmetic combination", "bracket") | Both | First (resolver), Later (reference screen) |
| R10 | "California AMT is not computed" | Stays open; F540NR.61 note "Not computed by the engine" | C6 | C: Checks:279-280; Filing:539-540 | UI | First |
| R11 | "You cannot rerun the engine: multiply the change by the matching rate" | Every tax effect is change × `tax_effect_rates[version][category]`, labelled an estimate; the app's own arithmetic (penalty 164 → 17) is labelled as ours | H1, D6 | C: Changes:251 "estimate at v3 rates, Example"; Areas:313 "our recompute, Example" | Both | First |
| R12 | Ten categories; `ca_source_income` for fully California-source items; business adjustments also move QBI; credits and payments 1:1 | The category used is chosen by a rule and shown with the effect | H1 edge, D6 edge | P: ClaimDrawer:489 QBI caveat; Areas:301 "1:1"; the category is never named | Both | First |
| R13 | "Rates are measured at this version's numbers; large changes can cross thresholds - the real system recomputes" | A stored effect records (version, category, rate) and goes stale when the base version changes; warn when a change crosses a `ref:param` threshold (SALT cap after GT-D02) | **missing** (B5 covers sign-offs only) | M: 0 hits "cross"; Changes:143 only on what-ifs | Both | First (record and stale), Later (threshold warning) |
| R14 | "what_if holds engine results for specific alternatives" | Prefer the engine's figure over the rate when a what-if exists (hvac 3,633 vs rate 3,364) | U9 | C: Changes:359-396 | Both | First |
| R15 | `where_now_is`: v3 (2026-06-23) is the current return | Default version v3; "now" from the story clock | B8 | C: Changes:198 | Both | First |
| R16 | Post-v3 events "scripted for replay" | Replay with notifications; not yet happened before their time | U4 | C: Filing:572 | Both | First |
| R17 | Post-v3 amounts "mean the return as your workpaper finalizes it" | A derived finalized version (v3 + applied adjustments, by rate) feeds tl-25 balance, tl-26 refund, transcript 150/610, Letter 566 values, the 2026 safe harbour, the client's copy | **missing** as a backend item (U8 names an "as filed" column; A5/A9 edges only) | P: Filing:120, 414 label; Filing:458 penalty still sized on v3's 4,220 | Backend | First |
| R18 | `ev-NNNN` | Open the value with document, page, field, position, confidence | E1 | C: ClaimDrawer:91-102 | Both | First |
| R19 | `D01..D74` | Document index, all 74 | K4 | P: Documents:236-288 (30 of 74) | Both | First |
| R20 | `qa-NN / msg-NN / call-NN` | Answers, messages and calls open as cited sources | E7, U10 | C: Checks:241-244 | Both | First |
| R21 | `py:/<json pointer>` (RFC 6901; 12 line cites, 56 in the packet, incl. array indices such as `/scorp_lindqvist_family_woodworks/0`) | Resolve into prior_years and render the record | **missing** (E1 names the kind; no item) | M: shown as text, ClaimDrawer:428, Documents:309 | Backend | First |
| R22 | `agency:/<json pointer>` (6 timeline refs: efile, irs_account_transcript_2025, ftb_account, notices/1; 0 line cites) | Resolve into tax_agency_records | **missing** | M: 0 hits | Backend | First |
| R23 | `asset:<asset_id>` (18 line cites; same version first, else prior_years.asset_records) | Resolve with version scope | **missing** | M: 0 hits; Areas:454 asset ids as text | Backend | First |
| R24 | `household:<id>` (6 cites) | Open the person record | E1 | P: ClaimDrawer:372 text | Both | First |
| R25 | `ref:param.<name>`, `ref:fx.SEK.<rate>` (13 cites) | Show the parameter's name and value where cited | **missing** | M: one fx cite as text, ClaimDrawer:514 | Both | First |
| R26 | `timeline:<id>` incl. `extension-2026-04-14` | Open the event | U4 | C: Checks:274; Main:212 | Both | First |
| R27 | `doc:<id>#page<n>` "a page the pipeline did not extract" (0 in the packet) | A person can cite an unextracted page as a source without an ev id (D30/D31 page 32; U10 attachments) | **missing** | M: Documents:462 page 32 as text only | Both | First |
| R28 | Line keys `<form>.<line>`; inputs are keys of the same version (verified: 0 dangling) | Inputs graph per version | C1, E4 | C: ClaimDrawer:618-622 | Both | First |
| R29 | Refs the README does not list: timeline refs `v1/v2/v3` (4), free-text sources (`prior_preparer_depreciation_schedule`, `basis_records[].source`) | Resolver tolerates unknown refs and shows them as text | B13 (tolerant) implicitly | M: none | Backend | First |
| R30 | `packet`: name, version, generated, client_id | Recorded on load and shown somewhere | B13 (version only) | M: 0 hits "CL-20417" | Both | First (light) |
| R31 | `household.people[]`: dob, relationship, months_lived_with_you, full_time_student, ip_pin, "exactly as the client entered them" | A dependent-eligibility record (CTC under 17 for Theo, Ada full-time student, months 12) beside F8812/F8863 | **missing** | M: 0 hits "student"; ReturnMap:220 count only | UI | First (light) |
| R32 | addresses[], residency[] with dates | Residency periods drive the state split | C5 | C: Areas:599 | UI | First |
| R33 | bank_account_for_refund_or_payment | Masked; on the client's copy and the refund | R2 | C: Filing:406 "ending 9276" | Both | First |
| R34 | prior_year_agi_for_esignature (228,409) | The identity check in the 8879 signing flow | **missing** (U7 silent) | M: Areas:599 shows it as prior AGI only | Both | First |
| R35 | related_returns[] | A record | U11 | C: Areas:741 | Both | First |
| R36 | documents[].belongs_to (taxpayer 17, spouse 22, joint 30, dependent:ada 2, dependent:theo 3) | Which client user sees which document; "whose form" checks (Corvane W-2 is Ngozi's) | **missing** | M: 0 hits | Both | First |
| R37 | documents: tax_year (2023: 2, 2024: 4), received_at, uploaded_by (firm: D01, D02, D69, D72), file_name, page_count | Index columns; uploader; year | K4 | P: Documents:466 | UI | First |
| R38 | marked_corrected (D31) + documents_superseded (D30) | Superseded reason | E2 | C: Documents:331 | Both | First |
| R39 | extraction {status, values, reason}: `values` is an integer count, not a list | Loader types it as a count; not_extracted/partial reasons shown | E2, B13 | P: Documents:289 reasons; B13 does not say | Backend | First |
| R40 | extracted_values.value_type (11 kinds: ssn 5, ein 5, account_number 1) | Render and mask by type: ssn and account_number masked, ein shown | B6 | P: ReturnMap:225 "EINs are never masked" | Backend | First |
| R41 | text_as_read "empty when nothing was printed" (7 values: N1/N3/N4 basis and covered flags on D28, C6 basis on D35) | A generic "blank read as a value" check | B9 (ledger RSU case only) | P: ClaimDrawer rsu | Backend | First |
| R42 | client.questionnaire answered_by/answered_at; messages from/to; call_notes participants | Route to the right spouse; answer time vs version | U6, U16 | C: ClaimDrawer:712 | Both | First |
| R43 | firm.firm_identity: EIN, EFIN, ERO PIN, PTINs by staff id, signer st-03 | Paid-preparer block on the as-filed return and 8879; ERO PIN and tl-20 signature PINs treated as sensitive though rule 6 names only SSNs, accounts, IP PINs | **missing** (R2 edge mentions) | P: Firm:253 "signs as paid preparer"; Checks:204-209 scrubs signature PINs; 0 hits "ERO PIN" | Both | First (display), Later (policy) |
| R44 | staff[]: role, credential, clearance, active_from | Roles exist from a date; clearance drives masking | P5 | C: Firm:249-253; Main:297 | Both | First |
| R45 | deadlines (6), budget_hours (9), assignment_at_start | Measured on the story clock | U5, R3 | C: Firm:260-292; Home:281 | Both | First |
| R46 | starter_standards: note, 5 verification types, variance_review, 3 review levels, 7 rules, 12 steps, "a starting point you may change" | Versioned, editable by the administrator | R1, B11 | C: Firm:236-246; Documents:81 | Both | First |
| R47 | prior_years.return_2024: lines (106), line_labels, line_sources (ev ids on D06) | The 2024 column traces to D06 pages | **missing** | M: Areas:600 2024 values as text; Documents:327 names line_sources | Both | First |
| R48 | prior_preparer_workpaper (D07): memo, notes, open items | Shown and closed | K16 | C: Areas:382 | UI | First |
| R49 | asset_records: land_value, method, life, federal/california by year, amt_difference | Depreciation record | K5 | C: Areas:454 | UI | First |
| R50 | basis_records "Gaps are real gaps" | Nulls shown as gaps | K15 | C: Areas:486 | UI | First |
| R51 | carryovers_into_2025 (+ california note, sources string) | Carry-in record | K14 | C: Areas:377 | UI | First |
| R52 | tax_agency_records: two transcript snapshots (as_of), code glossary 150/196/276/460/610/670, ftb_account 2024 bucket, notices, efile with submission ids and errors | Payments tie-out, notice record, e-file record | K12, A3, A7 | P: Filing:459 (196/276/610), 400-413 ids; Changes:242 12 Mar; 460/150 unexplained | Both | First (glossary light) |
| R53 | timeline: id, at, event (20 names), actor (staff id or null), refs | Replay; null actor = pipeline | U4 | C: Home:166; Main:212 | Both | First |
| R54 | engine_reference: 40 parameters, 97 rules, bracket format | A reference view "treat as given" | K2 (P) | M: 0 hits | Both | Later |
| R55 | return_versions: trigger, documents_used (64/65/71), summary incl. penalty, carryovers_out (ridgeline null in v1/v2), assets, diagnostics severity info/warning, changes_from_previous added/changed/removed | Version record | U8, J6, A8, C6 | C: ReturnMap:184; Filing:510 | Both | First |
| R56 | lines[].value: whole dollars; "Form 8949 lots in cents"; 13 text lines; ratios (F540NR.34 0.6347); note (23) | Lots are decimal dollars to the cent (19240.0, −0.13; they sum to SchD whole dollars), not integer cents; B13's "lots in cents" must be read that way | B13 wording risk | P: ReturnMap:182 PLAIN; Checks:270 note | Backend | First |
| R57 | what_if.alternatives (5) + extension (from v2, "rounded up to the next 500") | What-if sandbox; extension record | U9, A1 | C: Changes:388 | Both | First |
| R58 | planning_reference_2026: dates, safe harbours, known 2026 changes (Form 8801, no CA residency, SEP) | 2026 plan | A9 | C: Filing:510; Areas:338 | Both | First |
| R59 | post_filing_rates + note "not an extension of time to pay"; FTB "5% plus 0.5% per month" | Interest and penalty estimate, both agencies | U14 | P: Filing:449; Changes:393; FTB rate unused (0 hits "5% plus") | Both | First |
| R60 | fx_rates (same as parameters.fx) | FX record | E1 | C: ClaimDrawer:513 | UI | First |
| R61 | form_codes: 34 forms, "F8995 or F8995A", F8949 `<box>.<lot>`, SchCA540NR `<line>.<column A-E>`, "line numbers follow the 2025 forms where the engine maps them" | Forms come from the data, not a list; F8938, F8959, F8960, F8863, F8889, FTB5805 drawn | B14, K2 | P: ReturnMap:195-237 11 groups; Areas:517 columns | Both | First |

**Counts (61 rows, counted by script over the table rows):** mock-up 32 C, 14 P, 15 M. Checklist: **15 rows with no U, B or brief item** (R03, R09, R13, R17, R21, R22, R23, R25, R27, R31, R34, R36, R43, R47, and R56 where B13's wording is wrong), 3 more that rest on an item covering only part of the line (R29, R30, R54), 43 covered.

## Missed, ranked by importance

1. **A finalized version (R17).** The README says every post-v3 amount "means the return as your workpaper finalizes it". Nothing in B1-B18 builds that version: v3 plus applied adjustments, each priced by its version's rate. It feeds the balance paid (tl-25), the refund (tl-26), transcript codes 150 and 610, the Letter 566 values, the 110% safe harbour and the client's copy. The mock labels it (Filing:120) but sizes the late-payment penalty on v3's 4,220 (Filing:458). Backend, First.
2. **A resolver for every reference kind (R21-R27, R29).** E1 names eight kinds; no U or B item builds them. Line sources use `py:` (12), `asset:` (18), `ref:param` and `ref:fx` (13), `household:` (6); timeline refs use `agency:/` (6) and bare `v1/v2/v3` (4); two sections carry free-text sources. The mock shows all of these as text. `doc:<id>#page<n>` exists for exactly the page-32 case the ledger found. Backend, First.
3. **Rates are version-bound (R13).** A stored tax effect must record version, category and rate, and go stale when the base version changes, as sign-offs do (B5). The README's "large changes can cross thresholds" is the GT-D02 SALT case; the parameters are in the packet to warn with. Both; record First, warning Later.
4. **engine_reference is unused (R09, R25, R54).** Checks that "don't trust the engine" must still take their rates from `ref:param` ("treat them as given"), not from hard-coded 2025 law; the mock cites rule ids 721 times and never shows a rule's description or a parameter's value. Both; First for the cited values, Later for a reference screen.
5. **Documents have owners (R36).** `belongs_to` decides which client user sees which document once Erik is a role (U6), and whose W-2 a value is. 0 hits in the mock. Both, First.
6. **Firm identity and PINs (R43).** EFIN, ERO PIN, PTINs and the paid-preparer signer are needed by the 8879 flow (U7) and the as-filed return; the ERO PIN and tl-20's signature PINs are not in rule 6's list, so the firm's standards version 2 should name them. Both; display First, policy Later.
7. **"Lots in cents" (R56).** F8949 lot values are decimal dollars (19240.0, −0.13) that sum to SchD's whole dollars; B13's "Form 8949 lots in cents" will produce a 100× error if read literally. Backend, First; one line in B13.
8. **The 2024 column does not trace (R47).** `line_sources` gives an ev id on D06 for all 106 prior-year lines; the mock shows 2024 figures as text. The brief's "across years" (E5) is marked C; the README makes the trace possible and expected. Both, First.
9. **Dependent facts as entered (R31, R34).** months_lived_with_you, full_time_student, dob and prior_year_agi_for_esignature are in the household record and feed F8812, F8863 and the 8879 identity check; the mock shows a count and a prior AGI. UI, First (light).
10. **Schema details B13 does not state (R39, R40, R41).** `extraction.values` is an integer; masking keys on `value_type` (ssn, account_number; ein shown); seven blank reads (`text_as_read` "") are the general form of the RSU finding. Backend, First.
11. **Invented data and the packet header (R03, R30).** No validator may reject the 666 prefix; the public link should say the data is invented and show packet name, version, generated date and client id. Both, First (light).
12. **Agency glossary and FTB rate (R52, R59).** Codes 150 and 460 are unexplained; the FTB late-payment rate is never used. UI, First (light).

## Brief items the checklist marks covered that I doubt after the README

- **E5 "across years" (C).** Covered as a column, but the README gives `line_sources` for every 2024 line and `py:` pointers for carry-ins; neither resolves in the mock (miss 8).
- **E8 "display its source document and identify the field" (C).** True for `ev-` sources; 196 v3 lines are computed and 13 cite `ref:param`, where the "document" is a parameter or a rule. The drawer has no shape for that (miss 4).
- **E10 "real documents replace simulated ones" (C).** For D07, D69, D70, D72 (not_extracted) the link is a `py:` or `agency:` pointer, not an ev id; B16's link definition should allow it.
- **C6 "checks that don't trust the engine" (C).** The README says the engine's parameters are given; a check that hard-codes a rate is a second engine. B9 should say where its rates come from (miss 4).
- **H1 "tax effect" (C).** The README's category rules (ca_source_income, QBI, 1:1, thresholds) are applied by hand per claim in the mock; the build needs a category rule per line and the version it was priced at (miss 3).
- **A5 "freeze at filing" (C).** What is frozen is the finalized version, which does not exist yet (miss 1).
- **D4 "replay the season" (P).** Replayed post-v3 events quote amounts that depend on miss 1; replay before it exists shows v3 numbers under an "as filed" label.
- **R2 "sensitive data" (C).** Rule 6 lists SSNs, accounts and IP PINs; the packet also holds an ERO PIN, two signature PINs and `household.people[].ssn` in full (miss 6).

Word count of prose outside the table: about 980.
