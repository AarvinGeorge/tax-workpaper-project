# Call 1 review — "a document nothing uses"

Reviewer: Fable 5.1 (independent of the recommending model). Packet read-only; probes in this folder (`c1_probe1.py`–`c1_probe4.py`).

## 1. Verdict

**MODIFY.** Keep the rule and the gate; change how it blocks (through the firm's required step, time-scoped, mostly auto-derived) and add a value-level view, because a document-level reason alone lets two ledger mistakes through.

## 2. What it gets right

- **Counts are correct.** 74 documents; v3 `documents_used` = 71; `documents_superseded` = [D30]; the three not listed are D30, D71, D72 (L2, probe 1). 18 documents are cited by no v3 line; 15 of those are in `documents_used` anyway — "engine says used, no line cites it" is a real check and matches the brief's "run checks that don't trust the engine" (L1 `docs/brief.txt:24-25`).
- **The mandate exists.** Brief: "any document to everywhere it landed (or why it didn't)" (L1 `brief.txt:18-19`) and "every document used" (L1 `:37-38`). Firm: required step "All documents accounted for" (L2 `firm.starter_standards.required_steps[3]`).
- **Unused documents hide mistakes.** D15, D47, D54, D73 and D13 have 0 of their values on any line of any version (probe 4); the ledger ties them to C01, C05, D02, A02 (L3 `docs/ground-truth/README.md:33-34,45,71`). The link to A01 is weaker: D11 *is* cited; A01 is page 2's values being ignored, a value-level orphan (L3 `docs/discovery/01-evidence.md:51-52`).

## 3. What it misses or gets wrong

1. **"Block" has one L2 source, and it is not this rule.** The packet's only blocking sentence is "Open review notes block filing" (`rules[4]`, probe 2: one hit for "block" in the whole packet). "All documents accounted for" is a *required step*, and the standards are "a starting point. Applicants may change… through the firm administrator role" (L2 `starter_standards.note`). So: do not hard-code a blocker; compute the required step as incomplete while an unexplained document exists, let the stage gate name it, and let Jo relax it. The agreed design already has four blockers (L4 `docs/design/mockup-directions/FIX-ROUND-1.md:8`); this should surface as the step, not a fifth check.
2. **No time scope.** D72 arrives 2028-01-26, after e-file acceptance 2026-07-14/15 (L2 timeline tl-23, tl-24, tl-29). A frozen return cannot be "blocked" by it; it lands on notice n-02 (`tax_agency_records/notices/1/document`, probe 4). D71 arrives 13 Jul, after the 8879 signature (tl-20) and between rejection (tl-21) and acceptance (tl-23): the gate must re-run after sign-off, which is the brief's "sign-offs that reopen" (L1 `brief.txt:40`). Rule: documents received before the filing freeze gate the step; later ones attach to the post-filing record.
3. **Document-level reason is too coarse; two mistakes slip through it.** D54 *is* used: `prior_years/basis_records/home_7709_barton_ridge/0/source` cites it (probe 4), so a preparer can honestly say "landed: home basis" and the seller's tax credit (GT-D02) stays hidden. Same shape for D06 (107 values, all landing only in `prior_years.return_2024.line_sources`). Fix: keep one reason per document, but show "N of M values landed" and list the orphan values in the document view; the GT-D02 and GT-A01 tests assert at value level. Do **not** block on orphan values: 1,098 of 3,012 are unused and most are legitimate detail (L3 `01-evidence.md:31`).
4. **Most reasons derive from the packet; the preparer should pick few.** Probe 3: D30 from `documents_superseded` + D31 `marked_corrected`; D10 from the engine note "second image of the Halvorsen W-2 (D09); counted once" (`return_versions[2].lines[0].note`); D01–D05 from `document_type` (engagement_letter, consent_7216, irs_ip_pin_notice, identity_document) mapping to steps "Engagement letter and consents signed" and "Identity verified"; D07/D69/D70/D72 from `not_extracted` plus their references in prior_years, timeline and notices. That leaves D13, D15, D47, D54, D71, D73 for a human — exactly the ledger's set plus D13 (corroboration). Derived reasons must show as "proposed" and be confirmed, or the derivation is its own rubber stamp.
5. **Per-page: worth it, but as an automatic flag, not a human reason per page.** 64 pages have no values; 10 sit in `not_extracted` documents; of the remaining 54, only **4** print money-like numbers: D14 p2, D28 p2, D30 p32, D31 p32 (probe 3, regex). Those are precisely B04 and the D28 summary totals (L3 `01-evidence.md:59`). One regex at load gives the "amounts present but not read" split; the other 50 pages need nothing. Asking for 199 page reasons is over-engineering.
6. **Rubber-stamp risk is real; three things stop it.** (a) A reason is a typed link with a target, never a bare label: *duplicate of D09*, *superseded by D31*, *corroborates ev-0493*, *supports step: Identity verified*, *structured at py:/…*, *post-filing: notice n-02*. "Considered, not used" is the only free one and requires a note. (b) The "engine says used, no line cites" check stays open regardless of the reason; the reason explains the document, the check tests the engine. (c) The reviewer signs the document index (firm rule "may not review… work they prepared", L2 `rules[0]`), and that sign-off goes stale when a document arrives or a reason changes.

## 4. Recommendation (plain words)

Every document gets a landing state, computed first, confirmed by a person. Twelve of the 18 are filled in by the packet itself; Priya decides six. Until all documents received before filing have a confirmed reason, the firm's step "All documents accounted for" stays red and the Filed stage will not open; Jo can switch that step to warn-only. Each document shows how many of its values landed, so "used" can't hide an unused figure. Four pages that print money but were never read are flagged automatically. Daniel sees every reason and signs the index.

**Cost:** one pure function (documents × v3 lines × extracted values × superseded list × document_type × received_at vs filing event) → landing state, about half a day; a status column plus a picker in the Documents index; the step and the gate reuse the stage tracker already designed. Tests: D15, D47, D54, D73 unexplained at load; D54 shows 1 orphan value; D30 p32 flagged; D72 does not reopen the filed gate.

## 5. Probes run

`python3 -I c1_probe1.py "<packet>"` (documents_used / superseded / uncited per version)
```
documents: 74
v3 computed_at=2026-06-23T06:05:00Z used=71 superseded=['D30']
  not in documents_used: ['D30', 'D71', 'D72']
  docs cited by no line: 18 ['D01','D02','D03','D04','D05','D06','D07','D10','D13','D15','D30','D47','D54','D69','D70','D71','D72','D73']
  in documents_used but no line cites: ['D01','D02','D03','D04','D05','D06','D07','D10','D13','D15','D47','D54','D69','D70','D73']
  cited by a line but NOT in documents_used: []
D30 ... partial  Page 32 ('Additional transactions') was not read by the pipeline.
D31 ... CORRECTED ... marked_corrected True  partial  (same page 32 reason)
```

`python3 -I c1_probe2.py "<packet>"` (starter_standards; search for "block")
```
"note": "A starting point. Applicants may change, extend or replace these through the firm administrator role."
rules[4]: "Open review notes block filing."
required_steps[3]: "All documents accounted for"
--- 'block' hits: 1   ('/firm/starter_standards/rules/4', 'Open review notes block filing.')
--- 'accounted for / all documents' hits: 1   ('/firm/starter_standards/required_steps/3', ...)
```

`python3 -I c1_probe3.py "<packet>"` (types of the 18; engine duplicate note; filing timeline; unread pages)
```
D01 engagement_letter | D02 consent_7216 | D03 irs_ip_pin_notice | D04/D05 identity_document | D06 prior_year_return
D07 prior_workpaper not_extracted | D10 W-2 | D13 3922 | D15 books_transaction_detail | D47 invoice
D54 closing_statement_buyer | D69 irs_transcript not_extracted | D70 irs_notice not_extracted
D71 identity_document received 2026-07-13 | D72 irs_notice received 2028-01-26 not_extracted | D73 paystub 2026-03-27
/return_versions/2/lines/0/note | D10 is a second image of the Halvorsen W-2 (D09); counted once.
tl-20 2026-07-10 client_approved_and_signed_8879 | tl-21 2026-07-13T17:04 efile_rejected
tl-22 2026-07-13T19:02 document_received ['D71','msg-10'] | tl-23 2026-07-14 efile_accepted_federal
tl-24 2026-07-15 efile_accepted_california | tl-29 2028-01-26 notice_received ['agency:/notices/1','D72']
--- pages with zero extracted values: 64
  in not_extracted docs: 10
  in extracted/partial docs: 54 of which printed money-like numbers: 4
  money-bearing unread pages: [('D14', 2), ('D28', 2), ('D30', 32), ('D31', 32)]
```

`python3 -I c1_probe4.py "<packet>"` (where the uncited documents are referenced; value usage)
```
prior_years.return_2024.line_sources cite docs: {'D06'} count lines: 106
D69 referenced at: ['/timeline/5/refs/0']
D70 referenced at: ['/tax_agency_records/notices/0/document']
D07 referenced at: ['/prior_years/prior_preparer_workpaper/source_document']
D72 referenced at: ['/tax_agency_records/notices/1/document', '/timeline/28/refs/1']
D54 referenced at: [... '/prior_years/basis_records/home_7709_barton_ridge/0/source']
D15 values 6 used by any version line 0 | D47 2/0 | D54 4/0 | D73 2/0 | D13 6/0 | D06 107/0
```
`python3 -I c1_probe5.py "<packet>"` (non-zero control for the "0 values used" lines above: the same ev-to-document map does find citations)
```
v3 ev citations: 1956 | distinct docs cited: 56
```
(56 cited + 18 uncited = 74.)
