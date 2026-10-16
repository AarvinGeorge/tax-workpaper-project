# Discovery 1 — Evidence

Written 16 Oct 2026, ~03:45 UTC. Part 1 of 8 in the section-by-section discovery of the brief's "What it must do".
Every number below was measured from the packet (read-only) with scripts in the session scratchpad
(`disc/ev2.py`, `ev3.py`, `ev4.py`, run as `python3 -I`). Nothing here is a decision yet; proposals are marked as such.
**Revised 16 Oct ~03:56 UTC** after the Fable 5.1 review (`reviews/01-evidence-review.md`); every change is listed in section 8.

## 1. What the brief asks

> Trace any number to its exact source, and any document to everywhere it landed (or why it didn't). Record how each
> number was verified. Link related items across the return, years and related returns. Attach any file, message or
> note as evidence.

Plus the constraint: show the source document with the exact field marked; documents are simulated from the JSON,
and the design must let real PDFs replace them "seamlessly".

Five jobs: **number → source**, **document → landings**, **verification record**, **cross-links**, **attachments**.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| Documents / pages | 74 / 199 pages; `page_count` matches `pages` for all 74 | Page-level view is reliable |
| Extraction status | 68 extracted, 2 partial (D30, D31: page 32 not read), 4 not extracted (D07, D69, D70, D72 — content given as structured data elsewhere) | "Not read" is a state the UI must show, not hide |
| Pages with zero extracted values | 64 of 199 | A page nobody read is invisible unless the app says so (GT-B04 lives here) |
| Extracted values | 3,012; all have a position box. Of 1,253 money values, 1,249 have read text that matches the value; **4 have empty read text**: ev-0498/0516/0525 (RSU lot basis "not reported", turned into 0.0 at 0.98 → GT-A01) and ev-0919 (crypto basis, no value, 0.60 → GT-B03) | **Blank turned into zero is a detectable signal**, and it sits behind the biggest mistake. (The first draft said "0 differences": its script silently skipped unparseable text; corrected by `ev5.py`) |
| Confidence | 2,663 at ≥0.99; 17 at 0.95–0.99; 330 at 0.90–0.95 (almost all the mileage log's trip rows); 2 below 0.90 — both real problems (ev-0919 GT-B03 at 0.60; ev-1049 handwritten "$?,500" read 1,500 at 0.41, cleared by msg-08 after v3) | **A weak signal: rank by it, never trust it.** Most mistakes sit at 0.97–0.99 |
| Engine diagnostics on v3 | 11 (e.g. low-confidence read, broker summary vs detail mismatch, digital-asset basis missing, questionnaire vs sales conflict) | Pipeline-raised warnings must land somewhere and be closed, like any check |
| v3 return lines | 627 (572 federal, 55 California); 431 cite sources, 191 only other lines, 5 neither | 5 lines with no trace at all |
| Source kinds on v3 lines | ev 1,956 · asset 18 · ref (engine parameter) 13 · py (prior year) 12 · qa (client answer) 9 · household (client-typed organizer) 6 · timeline 1 | **A source is not always a document.** Seven kinds |
| Values used by no v3 line | 1,098 of 3,012 (biggest: D23 mileage log 328, D74 Brightpath 1099-B 266, D30 159, D06 2024 return 107) | Most are legitimately detail; some hide mistakes |
| Sources used by more than one line | 49 (35 of them extracted values) | One document field can feed several lines; a fix must show all of them |
| Documents on no v3 line | 18: D01–D07, D10, D13, D15, D30, D47, D54, D69–D73 | See section 3 — this list is a mistake detector |
| Documents received after v3 (23 Jun) | D71 (Theo's Social Security card photo), D72 (IRS Letter 566, exam) | Evidence can arrive after the version it should have changed, and after filing |
| Uploaded by | client 70, firm 4 | The client is the main source of evidence |

## 3. The headline insight: "where it landed, or why not" finds mistakes on its own

Sorting the 18 documents that touch no v3 line into reasons:

| Reason it didn't land | Documents | Verdict |
|---|---|---|
| Duplicate image | D10 (phone photo of the D09 W-2; the engine's own note says "counted once") | Legitimate — must be **declared** as a duplicate |
| Superseded by a corrected copy | D30 (replaced by D31, corrected Meridian 1099) | Legitimate |
| Supports filing, not a line | D01 engagement letter, D02 §7216 consent, D03 IP PIN notice, D04–D05 driver licences | Legitimate — they land in e-file and engagement, not on a form line |
| Structured elsewhere | D07, D69, D70 | Legitimate — linked to the structured record |
| Corroborates another source | D13 Form 3922 (ESPP): confirms the basis of lot N2 sold 10 Mar 2025 (4,500 = 150 × 25.50 + 675 ordinary income) | Legitimate — a state a reviewer relies on |
| Arrived after filing | D72 IRS Letter 566 | Belongs to the notice record, not the frozen return |
| **Never used, and should have been** | **D15** books detail (Paywell 12,400 → GT-C01), **D47** heat-pump invoice (GT-C05), **D54** buyer closing statement (seller's tax credit → GT-D02), **D71** SSN card (3390 ≠ 3309 → GT-A05), **D73** post-move paystub (GT-A02) | **5 confirmed mistakes, 3 of them high** |

Page level adds two more: D30/D31 page 32 never read (GT-B04); D11 page 1 has no values and its page 2 basis
was ignored (GT-A01).

**The engine's own list disagrees.** v3's `documents_used` claims 71 documents, including D15, D47, D54 and D73, though no line cites them. "Engine says used, no line cites it" is itself a check worth showing.

**Implication (proposal):** every document must end in one of a fixed set of landing states — *landed on lines*,
*duplicate of X*, *superseded by X*, *supports filing (engagement / identity / e-file)*, *structured elsewhere*,
*corroborates another source*, *post-filing record*, or **unexplained**. Unexplained is a blocking check. A preparer cannot leave
a document unexplained, and the reviewer sees the reason for each. The same rule applies per page, split into *no amounts on the page* (D28 pp. 4–8) and *amounts present but not read* (D28 p2 summary totals, D14 p2 balance sheet, D30/D31 p32).

## 4. What each role needs from Evidence (domain view)

- **Preparer:** click a number, see the document with the box highlighted, confirm or fix it in place; see orphan
  documents and pages as a to-do list; turn a client email into evidence without retyping.
- **Reviewer / partner:** for any line, one glance shows *how* it was verified (tied to source / recomputed /
  client-confirmed / estimate / unverified), not just *that* someone ticked it. Wants to sample, not re-trace all
  1,956 links; wants unverified and client-said-only items surfaced first.
- **Client:** sees which of their uploads were used and which are still needed; never sees staff notes.
- **Firm administrator:** every view of an SSN, bank account or ID image logged. That is the packet's own firm rule 6 (`starter_standards`); the FTC Safeguards Rule (16 CFR 314.4(c)(8), https://www.law.cornell.edu/cfr/text/16/314.4) requires activity logging in general, not per-view logs.
- **Quality reviewer** (st-06, post-filing sampling) and **a preparer without clearance** (st-04) who must work with identifiers masked.
- **Next year's preparer:** carry-forward items keep their evidence (basis records, asset records, the 2024
  return) so nothing is re-proven from scratch.
- **IRS examiner (years later):** the record must stand alone: a number, its document, who verified it and when,
  with the version that was filed frozen. IRM 4.10.7.3.2 says oral evidence should not be used in place of
  *available* documents (https://www.irs.gov/irm/part4/irm_04-010-007), so client-said evidence must be labelled,
  and a line resting only on it when a document exists is a flag.

## 5. Edge cases

**Obvious (the packet has each one):**
1. Same document uploaded twice (D09/D10). Count once and say why.
2. Corrected form replaces the original (D31 over D30). Lines must move to the new source, and the old links show "superseded".
3. A page the pipeline never read (D30/D31 p32).
4. A document arrives after the return version that should have used it (D71; msg-07 crypto cost after v3).
5. Documents for other people: dependants (Theo 3, Ada 2) and related returns (Ada files her own; S corp and fund K-1s).
6. Prior-year documents (2024 ×4, 2023 ×2) used as evidence for this year.

**Not obvious:**
1. **Sources that aren't documents.** Theo's SSN on the return comes from the client-typed organizer (household,
   no confidence score, no page). Two documents print 3390: the 2024 return D06, already in the file at v3, and the
   card D71, which arrived after v3. The weaker source won over a document already held. **Proposal:** rank
   evidence reliability **per kind of fact** (for payments and prior filings the agency transcript ranks first, GT-A04;
   for income, the third-party form), separate client-uploaded third-party forms from client-prepared records
   (books, mileage log), let a corrected or later copy from the same issuer beat the original, and flag a line whose
   source is weaker than an available contradicting one.
2. **The same money on two documents** (Northlake interest on D28 and D29, GT-B01; Paywell in 1099-K and books,
   GT-C01). Two correct readings, one wrong total. Evidence links alone won't catch it; it needs a
   "same real-world amount" link between values.
3. **A value read right, applied to the wrong thing** (D68 payment correctly read as "tax year 2024", still put
   into 2025 estimates, GT-A03). Verification must include "does the source's own context match the use" (year,
   person, property, state).
4. **Duplicate *pages* inside one document** (mileage log page scanned twice, GT-C02). The document landed; one of
   its pages shouldn't have.
5. **One field feeding many lines** (49 values). Fixing one value must show every line it reaches, with tax effect.
6. **Lines with no trace at all** (5, e.g. `F540NR.73` extension payment, `SchD.18`). Each needs a stated reason
   ("engine default: no", "nothing to report") or it is a gap.
7. **Evidence after filing** (Letter 566). It attaches to the notice and the filed version without changing the
   frozen record.
8. **Sensitive documents as evidence.** An SSN card photo, driver licences and bank numbers show as masked;
   revealing one is logged.
9. **Swapping in real PDFs.** Positions are synthetic, page-relative boxes (0–1). **Proposal:** anchor every link
   as *(document, page, field id, box)*. The renderer, not the link, changes when a real PDF arrives, so links
   survive the swap.
10. **Evidence the client must supply that doesn't exist yet.** This is about completeness, an expected document
    that is missing, so it is covered in Judgment (section 4).

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Source** is a typed reference to one of: extracted value, client answer, message or call note, prior-year
  record, asset record, engine parameter, agency record, firm attachment. Each kind has a reliability rank.
- **Landing** is a fixed reason for every document, and for every page, with *unexplained* as a blocking check.
- **Verification** starts from the firm's own list (`starter_standards.verification_types`: agreed to source document,
  recalculated, confirmed with client, agreed to prior year, agreed to third-party record), plus *estimate* and
  *unverified*, who set it and when; the verifier must not be the preparer (firm rule 1). It goes stale when the source changes.
- **Read state** of a value: read / *nothing printed* / unreadable, kept separate from the number, so blank never becomes 0.
- **Engine diagnostics** are imported as checks that need closing.
- **Same-money link** between values on different documents, so double counting can be checked.
- **Link anchor** of (document, page, field, box), independent of how the document is rendered.

## 7. Questions for Aarvin (only what this section needs)

1. Is the **landing-reason list** right, and should *unexplained* block filing or only warn?
2. Is the **reliability ranking** worth showing to users, or should it only drive checks behind the scenes?

## 8. Changes after review (Fable 5.1, 16 Oct 03:51 UTC)

- M1: "0 read-vs-value differences" was wrong; my script skipped empty text silently. Now 4 blank-to-zero values, a new *read state*.
- M2: confidence is a weak signal to rank by; both values under 0.90 are real; engine diagnostics (11) added.
- M3: IRM 4.10.7 wording corrected; documents do not simply outweigh oral evidence.
- M4: Theo's SSN: two documents, and only D06 was in hand at v3.
- S1–S6: engine `documents_used` check; firm verification types; D13 corroborates; two kinds of unread page; reliability per kind of fact; FTC citation narrowed.
- Not yet applied (notes): N1 trace reasons for F540NR.73 and F8960.14; N3 extra edge cases (one page with two tax years, D68; a prior-year form proving a current-year fact, D42; oral evidence driving GT-C04).
