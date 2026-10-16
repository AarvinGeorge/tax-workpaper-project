# Review — Discovery 1: Evidence

Reviewer: Fable 5.1 (independent; 20-year CPA + tax-software designer brief). 16 Oct 2026, 03:51 UTC.
Probes (own scripts, `python3 -I`): `scratchpad/review/evidence/p2_measure.py`, `p3_claims.py`, `p4_follow.py`.
Packet read-only; document not edited.

## 1. Re-measurement of section 2 and 3

**Reproduced:** 74/199 pages; 68/2/4 extraction (D31 the only `marked_corrected`); 64 zero-value pages; 3,012 values with positions; 627 lines (572/55), 431/191/5 (the 5: SchB.8, F4797.26g, SchD.18, F8960.14, F540NR.73); source-kind counts; 1,098 unused values and the top-four documents; the 18-document list; D71/D72 after v3; client 70 / firm 4; every section 3 and 5 `printed_content` claim (D10 note, D15 12,400, D47, D54 credit 6,912, D71 3390, D11 p2 19,100, D23 p3 "second scan", msg-07 after v3, ev-1076 "2024", D28/D29 1,840, dependant and prior-year counts).

**Differs:**
| Doc claim | My figure |
|---|---|
| numeric `text_as_read` always equals `value` (0 differences) | **4:** ev-0498, ev-0516, ev-0525 (D28 p3, RSU lots N1/N3/N4, basis "not reported") have empty text and `value` 0.0 at 0.98; ev-0919 (C6 basis) empty → `None` |
| Confidence 2,663 / 330 / 2 | Buckets omit 17 values at 0.95–0.99 (2,995 ≠ 3,012) |
| Values used by >1 line: 49 | 49 is all source kinds; distinct *extracted values* on >1 line = **35** |
| "Three documents disagree" (Theo SSN) | **Two** print …3390 (D06 p1, D71 p1) |

## 2. Findings

### Must-fix

**M1. Blank-to-zero is a visible signal, and the doc says there is none** (p2, p4). The three RSU lot-basis values behind GT-A01 are read as `0.0` where nothing was printed, at 0.98 confidence; the engine then taxed them at zero basis (`F8949.B.N1`, `B.N3`, `E.N4`). "Misreads are not visible by comparing read text vs value" is wrong for the highest-dollar mistake. The data model needs a *nothing printed* state distinct from 0, and a check "numeric value with empty text_as_read".

**M2. "Confidence is no signal" is overstated** (p2, p4). Both values under 0.90 are real problems: ev-0919 (GT-B03, 0.60) and ev-1049 (D64 handwritten "$?,500" read 1,500 at 0.41; cleared by msg-08 after v3). Confidence is a weak signal to rank, not ignore. The doc also never mentions v3's 11 engine `diagnostics` (LOW_CONFIDENCE_READ, BROKER_SUMMARY_DETAIL_MISMATCH, DIGITAL_ASSET_BASIS_MISSING, QUESTIONNAIRE_SALES_CONFLICT) — pipeline-supplied evidence state that must land somewhere.

**M3. IRM 4.10.7 does not say "documents outweigh oral statements."** 4.10.7.3.9(2): documentary evidence "should not be relied on to the exclusion of other facts" and courts sometimes weight oral testimony higher; 4.10.7.3.2(1): "oral evidence should not be used in lieu of *available* documentary evidence"; 4.10.7.3.2(4): "per oral testimony" alone is insufficient unless de minimis. Source: https://www.irs.gov/irm/part4/irm_04-010-007. Rephrase the rule as *a client statement is not enough when a document is available or required*; the ranking then follows.

**M4. Theo SSN example miscounts** (p3). Two documents, not three; and D71 arrived 13 Jul 2026, after v3, so at v3 time the only contradicting document was D06 — say so, because that is the stronger point (the prior-year return already disagreed).

### Should-fix

**S1. The engine's own `documents_used` / `documents_superseded` are ignored** (p2). v3 lists 71 documents as used, including D15, D47, D54, D73, D13 and D01–D07, though no line cites them; `documents_superseded` = [D30]. Landing must be derived from line citations plus the superseded list, and "engine says used, no line cites it" is itself a check worth showing.

**S2. Verification statuses diverge from the packet's firm standards.** `firm.starter_standards.verification_types` already defines agreed_to_source_document / recalculated / confirmed_with_client / agreed_to_prior_year / agreed_to_third_party_record. The proposed tied/recomputed/client-confirmed/estimate/unverified drops the two types that catch GT-A04 (transcript) and carryovers. Start from the firm list (the admin role edits it); add *unverified* and *estimate* as states. Record verifier ≠ preparer (firm rule 1).

**S3. D13 Form 3922 is corroboration, not "informational, to check"** (p4). The 150 ESPP shares were sold 10 Mar 2025 (D28 p3 lot N2; D11 p2 calls it a disqualifying disposition). Basis 4,500 = 150 × 25.50 (D13 box 5) + 675 ordinary income (W-2 box 14 ESPP). The landing-state list needs *corroborates another source* — a state a reviewer relies on. (Form 3922 is an issuer-furnished statement: https://www.irs.gov/instructions/i3921.)

**S4. Unread pages with amounts beyond the two named** (p3). D28 p2 (1099-B summary: control totals, e.g. noncovered proceeds 37,720) and D14 p2 (balance sheet: equipment 38,000, client-booked SL 5-yr) have zero values. The page check should separate *no amounts* (D28 p4–8) from *amounts present, not extracted*; D28 p2 is what a lot-to-summary tie-out needs.

**S5. Reliability ranking.** (a) Agency record below third-party document is wrong for payments and prior filings — the transcript is what the IRS matches against (GT-A04); rank per fact type. (b) "Client document" conflates a client-uploaded W-2 with client-prepared books and mileage log (D14, D15, D23). (c) Corrected or later-dated beats the original from the same issuer regardless of rank (D31 > D30).

**S6. FTC Safeguards citation.** 16 CFR 314.4(c)(8) requires logging authorized users' activity generally; it does not require a log of each SSN view. The per-view log is firm rule 6 in `starter_standards`; cite that, with Safeguards as background. Source: https://www.law.cornell.edu/cfr/text/16/314.4 (ecfr.gov redirected to a block page).

### Notes

**N1.** Of the 5 untraced lines, F540NR.73 = 0 has a reason in `timeline:extension-2026-04-14` ("FTB 3519 with 0") that Sch3.10 cites and it does not; F8960.14 = 250,000 is an uncited `ref:param`. Fillable trace gaps, not "engine default".
**N2.** Roles missing: quality reviewer (st-06; `quality_review_selected_return` — post-filing sampling); a preparer without clearance (st-04) working with masked identifiers; the client's view bounded by the §7216 consent (D02).
**N3.** Edge cases missing: one page carrying two tax years (D68); a prior-year form proving a current-year fact (D42 2024 Form 5498 → 2025 Form 8606 basis); oral evidence (call-01) driving GT-C04; related returns present only as K-1s.
**N4.** The README's `doc:<id>#page<n>` and `agency:/` reference formats appear on no v3 line (p3); the Source type should still admit them.
