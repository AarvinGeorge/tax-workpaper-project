# Review: the four AI-reader suggestions on D30 that match no ledger entry

Reviewer: Claude Fable 5.1 (cross-model), read-only. Sat 17 Oct 2026, started 16:27 EDT (`date`). Under review: the four
suggestions in `project-build/data/ai-suggestions.json` (model `claude-sonnet-5-5`, prompt `reader-v1`, run
2026-10-17T20:23Z per `ai-suggestions.run-meta.json`) that the harness could not match to any of the 27 ledger entries:
`ai-document_not_reflected-3`, `-4`, `-5` and `ai-date_or_year_mismatch-1`. All four cite document D30.

Evidence read from `project-build/data/packet.json` with `python3 -I` scripts (documents, extracted_values,
return_versions, readme), from `docs/ground-truth/` and from `project-build/src/domain/checks/catalogue.ts`. SSNs were
not printed. No file other than this one was written.

## Verdict in one table

| Suggestion | Quote on page? | Verdict | Why |
|---|---|---|---|
| `ai-document_not_reflected-3` (M18 on p32) | Yes, verbatim | **REAL-DUPLICATE of GT-B04** | Same lot, same page, same 250 gap; the ledger already files it under D31 |
| `ai-document_not_reflected-4` (M9 basis 6,900) | Yes, verbatim | **NOT-REAL** | D30 is superseded; the return uses the CORRECTED D31, where M9 basis is 4,880 |
| `ai-document_not_reflected-5` (M6 wash 735) | Yes, verbatim | **NOT-REAL** | D31 corrects the wash to 512, and v3 `F8949.A.M6` carries 512 |
| `ai-date_or_year_mismatch-1` (M14 acquired 2024-10-15) | Yes, verbatim | **NOT-REAL** | D31 corrects the date to 2024-09-15 (long-term); v3 `F8949.D.M14` is box D with that date |

Net: no new mistake. One duplicate, three artefacts of reading a superseded form against a return that no longer uses it.

## The fact that decides three of the four

D30 is the original Meridian consolidated 1099 (received 2026-02-16, `marked_corrected: false`). D31 is the same form
marked CORRECTED (received 2026-03-18, `marked_corrected: true`, page 1 begins "CORRECTED."). The versions say which one
the return relies on:

| Version | computed_at | D30 in `documents_used` | D31 in `documents_used` | `documents_superseded` |
|---|---|---|---|---|
| v1 | 2026-03-04 | yes | no | [] |
| v2 | 2026-03-19 | no | yes | ["D30"] |
| v3 (latest) | 2026-06-23 | no | yes | ["D30"] |

v2's trigger is "Recompute: corrected Meridian Brokerage 1099 received 2026-03-18." In v3, zero line sources point at any
D30 extracted value (checked every `sources` entry against `extracted_values.document_id`). The app already labels D30
"Superseded from v2 on" (`src/domain/docs.ts:34-36`) and `blank-read.ts:75` skips superseded documents.

The three D30 pages the reader quoted differ from D31 in exactly the three fields the reader flagged. Those differences
are the broker's corrections, and the return follows the corrected form:

| Lot | D30 (original) | D31 (CORRECTED) | v1 line (used D30) | v3 line (uses D31) and sources |
|---|---|---|---|---|
| M6 Pinecrest, p4 | wash disallowed 735.00 (ev-0596) | wash disallowed 512.00 (ev-0755) | `F8949.A.M6` = 0.0, "adjustment W 735.00" | `F8949.A.M6` = −223.0, "adjustment W 512.00", sources ev-0749..0755 |
| M9 Northgate, p6 | basis 6,900.00 (ev-0622) | basis 4,880.00 (ev-0781) | `F8949.D.M9` = −1,380.0 | `F8949.D.M9` = 640.0, "basis 4,880.00", sources ev-0776..0782 |
| M14 Harbor Lane, p8 | acquired 2024-10-15, short-term (ev-0664, ev-0669) | acquired 2024-09-15, long-term (ev-0823, ev-0828) | `F8949.A.M14` = 855.0 (box A, short) | `F8949.D.M14` = 855.0 (box D, long), "acquired 2024-09-15", sources ev-0821..0827 |

Ledger file `02-investments-foreign-k1.md` lines 104-105 recorded the same check on 15 Oct: "the corrected Meridian
values are used from v2 on (M6 wash 512 not 735, M9 basis 4,880 not 6,900, M14 acquired 2024-09-15 and now long-term)".
This review re-derived it from the packet rather than trusting that note.

## Per suggestion

### ai-document_not_reflected-3: M18 Ironwood REIT on the unread page 32

- (a) Quote present: D30 p32 prints "Supplemental page (page 32, 'Additional transactions'): M18 Ironwood REIT (fractional
  share cash in lieu) 6.8 sh acquired 2025-01-14 sold 2025-12-15 proceeds 250.00 basis 310.00 short-term noncovered."
  D30 p1 prints "1099-B summary: total proceeds 71,965.00." and p10 "Detail total proceeds 71,715.00." All three quotes
  are verbatim.
- (b) Real: yes. D31 p32 prints the identical M18 line; both documents' `extraction` is `partial` with reason "Page 32
  ('Additional transactions') was not read by the pipeline"; no extracted value exists on page 32 of either document;
  no `F8949.*.M18` line exists in v1, v2 or v3 (v3 has 17 Meridian lots, M1..M17). 71,715 + 250 = 71,965. The engine's
  own `BROKER_SUMMARY_DETAIL_MISMATCH` diagnostic (v3, ref ev-0703) reports the 250 gap without naming the cause. The
  issue survives in D31, the document the return relies on.
- (c) Already covered: **GT-B04** ("Meridian lot M18 (page 32) never read in either 1099"), catalogue check
  `CHK-UNREAD-PAGE`, claim `doc:D31`. The reader filed it under D30 because it reads one document at a time; the ledger
  files it under D31. Same finding.
- (d) Tax effect (already in the ledger): −60 short-term loss omitted; federal −60 × 0.348 (stcg) = about −$21 (the
  return overstates tax); California about 0 (sold 2025-12-15, after the move to Texas).
- Verdict: **REAL-DUPLICATE (GT-B04)**. The harness's matcher missed it because the ledger claim is `doc:D31` and the
  suggestion cites D30; a matcher that treats a superseded document and its CORRECTED successor as the same source would
  have paired them.

### ai-document_not_reflected-4: M9 basis 6,900 vs the return

- (a) Quote present: D30 p6 prints "M9 Northgate Rail Corp 120 sh acquired 2020-01-10 sold 2025-06-24 proceeds 5,520.00
  basis 6,900.00 wash sale loss disallowed 0.00 long-term covered". Verbatim.
- (b) Not real against the return. The claim `F8949.D.M9` in v3 = 640.0 with basis 4,880.00, sourced to ev-0776..0782,
  all D31. D31 p6 prints basis 4,880.00 (ev-0781, confidence 0.99). D30's 6,900 was used only in v1 (`F8949.D.M9` =
  −1,380) and was replaced when the CORRECTED form arrived. The reader's rationale ("a loss may have been reported as a
  gain") describes the correction itself: the broker revised the basis down, which turned the lot from a loss into a gain.
- (c) No ledger entry, correctly: the ledger explicitly lists this as "checked and found correct (so the app should not
  flag them)".
- (d) Not applicable.
- Verdict: **NOT-REAL**. The reader compared a superseded document with a return that uses its correction.

### ai-document_not_reflected-5: M6 wash sale 735 vs the return

- (a) Quote present: D30 p4 prints "... M6 Pinecrest Semiconductor Corp 30 sh acquired 2025-02-10 sold 2025-03-05 proceeds
  3,885.00 basis 4,620.00 wash sale loss disallowed 735.00 short-term covered." Verbatim.
- (b) Not real against the return. v3 `F8949.A.M6` = −223.0, label "adjustment W 512.00", sources ev-0749..0755 (D31).
  D31 p4 prints "wash sale loss disallowed 512.00" (ev-0755). Arithmetic: 3,885 − 4,620 + 512 = −223, which is the v3
  value. v1, built on D30, carried 735 and a value of 0.0 (3,885 − 4,620 + 735 = 0). The broker's correction reduced the
  disallowed amount; the return follows it.
- (c) Same ledger note as above: checked and found correct.
- (d) Not applicable.
- Verdict: **NOT-REAL**.

### ai-date_or_year_mismatch-1: M14 acquired 2024-10-15, short-term vs long-term

- (a) Quote present: D30 p8 prints "M14 Harbor Lane Growth ETF 45 sh acquired 2024-10-15 sold 2025-09-22 proceeds
  6,165.00 basis 5,310.00 wash sale loss disallowed 0.00 short-term covered." Verbatim.
- (b) Not real against the return. v3 has `F8949.D.M14` (box D, long-term) = 855.0, "acquired 2024-09-15", sources
  ev-0821..0827 (D31). D31 p8 prints "acquired 2024-09-15 ... long-term covered" (ev-0823 = 2024-09-15, ev-0828 = long).
  2024-09-15 to 2025-09-22 is more than one year, so long-term is right for the corrected date. v1, built on D30, had the
  lot as `F8949.A.M14` (box A, short-term) with the 2024-10-15 date; v2 moved it to box D when D31 arrived. The
  "mismatch" is the broker correcting the acquisition date, and the return reflects the correction.
- (c) Same ledger note: "M14 acquired 2024-09-15 and now long-term", checked and found correct.
- (d) Not applicable. (Had the return still used D30's date, the direction would be: 855 taxed as long-term at 0.238
  instead of short-term at 0.348, federal tax understated by about 855 × 0.11 = $94. It does not.)
- Verdict: **NOT-REAL**.

## What this says about the reader, and what to change

1. **The reader is quoting accurately.** All six quotes across the four suggestions are verbatim from `printed_content`.
   The failure is context, not hallucination.
2. **Three of four came from one blind spot: supersession.** Per `project-build/ai/README.md`, each call sees the
   document, its extracted values, and "the return lines (latest version) citing the document". For D30 that list is
   empty, which the model read as "not reflected" rather than "replaced". Nothing in the per-document header tells it
   that D30 is in `documents_superseded`, nor that D31 (`marked_corrected: true`) exists for the same account.
   - Smallest fix: add one line to the per-document header when the document is superseded in the latest version
     ("Superseded from v2 by D31 (CORRECTED); the return does not use this document"), and instruct the reader that a
     difference between a superseded document and the return is not an issue unless it also appears in the superseding
     document. Change `PROMPT_VERSION` when doing so, as the README requires.
   - Or, in the validation step before the payload is written: a suggestion whose only cited document is superseded in
     the latest version is moved to `rejected` with a reason, unless the same quote is also present in the superseding
     document (that rule would have kept suggestion 3, since D31 p32 prints the same M18 line, and dropped 4, 5 and the
     date mismatch).
3. **The duplicate matcher should treat a document and its CORRECTED successor as one source.** GT-B04 claims
   `doc:D31`; the suggestion cites D30 for the same page and lot. Pairing by (account, page, lot) or by
   `documents_superseded` adjacency would have matched it.
4. **No ledger change is warranted.** The ledger's "checked and found correct" list (file 02, lines 104-105) already
   anticipates exactly these three false positives, and GT-B04 already carries the real one.

## Probes run (all read-only, `python3 -I`)

- D30/D31 header fields, `extraction`, `marked_corrected`, and `printed_content` of pages 1, 4, 6, 8, 10, 32 of both.
- Every `extracted_values` row for lots M6, M9, M14, M18 in D30 and D31 (ids, values, confidence); page-32 rows (none).
- `return_versions[*]`: `documents_used`, `documents_superseded`, `trigger`; lines `F8949.A.M6`, `F8949.D.M9`,
  `F8949.A.M14`/`F8949.D.M14` with `sources` in v1, v2, v3; count of v3 lines citing any D30 value (0); list of v3
  Meridian 8949 keys (17, no M18); v3 `diagnostics`; v3 `tax_effect_rates`.
- Ledger: `docs/ground-truth/README.md`, `02-investments-foreign-k1.md` (GT-B04 and the "checked and found correct"
  list); `catalogue.ts` GT-B04 entry; `src/domain/docs.ts` and `checks/families/blank-read.ts` for superseded handling;
  `project-build/ai/README.md` for what each reader call sees.
