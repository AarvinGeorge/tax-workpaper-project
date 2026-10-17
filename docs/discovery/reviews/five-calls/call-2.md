# Call 2 review — "show how trustworthy each source is"

Reviewer: Fable 5.1 (independent of the recommending model). Packet read-only; probes in this folder (`c2_probe1.py`, `c2_probe2.py`, `c2_probe3.py`).

## 1. Verdict

**MODIFY** — keep the *kind* label (factual, cheap); drop the user-facing *trust ranking*; catch the mistakes with two named tie-outs the firm's own standards already require.

## 2. What it gets right

- Sources are not all documents: v3 lines cite 7 kinds (ev / asset / ref / py / qa / household / timeline) — L4 `docs/discovery/01-evidence.md:30`; confirmed by probe (3 lines cite `household:`, 9 cite `qa-`).
- GT-A05 and GT-A04 really are "weaker source won": `F8812.4` cites only `household:theo` (organizer, …3309); `F1040.26` = 13,000 cites `qa-41` ("4,000 I think") — L2 packet probe 1; L3 `docs/ground-truth/01-wages-people-credits.md:52-70`.
- A corrected copy must beat the original: D31 is the only `marked_corrected: true` document (probe 2) — L2 README `sections.documents`.
- Showing *what kind* of source a number rests on is what the brief's reviewer needs ("record how each number was verified", L1 `docs/brief.txt:19-20`).

## 3. What it misses or gets wrong

**a. Confusable with the packet's `confidence`.** README defines `confidence (0-1)` per extracted value as how surely the *pipeline read* the text (L2 `docs/packet/readme-verbatim.md:55`), and warns mistakes carry high confidence (line 21). A second "how much to trust it" word beside the number invites conflating OCR certainty with issuer reliability. The two must be named and placed differently: `confidence` is a read-quality fact of one value; the kind label is a provenance fact of the source. No "trust" word at all.

**b. The packet already defines the vocabulary.** `firm.starter_standards.verification_types` = agreed_to_source_document / recalculated / confirmed_with_client / agreed_to_prior_year / agreed_to_third_party_record (L2, probe 1). `required_steps` include "Identity verified", "Prior-year return reviewed", "Estimated payments agreed to IRS and FTB records". No key named reliability/rank/hierarchy/trust exists anywhere in the packet (probe 1; control: `confidence` found on 3,012/3,012 values). Inventing a parallel ranking vocabulary ignores the firm's own, which the README says is "a starting point you may change" (line 59) — change it, do not duplicate it.

**c. A displayed ranking is false authority in this packet.** The wrong value sits on the *top-ranked* "third-party form" in at least six ledger mistakes: D28 1099-B blank basis → 0 (GT-A01), D09 W-2 box 16 (GT-A02), D28+D29 duplicate interest (GT-B01), 1099-K vs books (GT-C01), 1098 + payoff (GT-D01), seller closing statement (GT-D02) — issuers Northlake Securities, Halvorsen Data, Hill Country Bank/Title (probe 2; L3 `ground-truth/README.md:29-46`). In GT-A06 the *client answer* (qa-25) is the evidence that overturns a document. A "ranks first" badge would tell the 20-year CPA to stop looking exactly where the packet hides errors. Fable's earlier review already noted agency-below-document is wrong for payments (L4 `reviews/01-evidence-review.md:41`); the fix is per-fact rules, which is a *check*, not a label.

**d. The GT-A05 story is mis-told.** D71 (SSN card) was received 2026-07-13T19:02Z, two hours *after* the 17:04Z rejection (probe 3; tl-22). It could not have been "beaten". The only pre-filing source with …3390 is the 2024 return: D06 printed page 1 and, structured, `prior_years.return_2024.dependents[1]` = {Theo, …3390} (probe 3). Note D06's `ev-0012` is labelled "Dependent 2 SSN" with `belongs_to: joint`, so a naive per-person join misses it (probe 2 printed `unmatched ssn value ev-0012`); the structured dependents list, keyed by name, is the reliable join.

**e. "Flag a line whose source is weaker than an available contradicting one" needs the contradiction found first.** No v3 line cites `agency:` at all (probe 1: 0, while `qa-` = 9). The transcript is never a competing source on a line; it only contradicts after a tie-out computes 13,000 − 12,000 (probe 2). The label does no work; the tie-out does all of it.

**f. Open question 2 is still open** (L4 `docs/decisions.md:24`); this call answers it without Aarvin having decided.

## 4. My recommendation

1. **Label the kind, not the trust.** On every source chip show a plain noun derived mechanically: `document_type` + `issuer` for extracted values ("W-2, Halvorsen Data"; "Books, QuickBooks — client-prepared"), "Client answer (qa-41)", "Organizer entry", "2024 return", "IRS transcript", "Engine parameter". Cost: one mapping table over the 50 `document_type` values (probe 2), ~1 hour.
2. **Keep the packet's `confidence` as a separate "read" indicator** on the value, never on the source.
3. **Two tie-outs, taken straight from `required_steps`:**
   - *Identity*: every `household.people[].ssn` vs `prior_years.return_2024.dependents[].ssn` (by name) and vs every `value_type: ssn` extracted value for that person. Probe 2 found 4 comparisons, 1 mismatch (Theo), 0 false alarms. Mismatch = blocker before e-file. ~30 lines.
   - *Payments*: `F1040.26` vs IRS code-670 sum ≤ 2026-01-15 (13,000 vs 12,000, diff 1,000); `F540NR.72` vs `ftb_account.tax_year_2025_payments` (14,000 vs 10,500, diff 3,500 — catches GT-A03 free). ~30 lines.
4. **One rule, not a ranking:** a line whose *only* source is a client answer or organizer entry is "unverified" until a verification type is recorded (firm types list). That is the IRM 4.10.7.3.2 point as the review rephrased it (L4 `reviews/01-evidence-review.md:27`).
5. Store a per-fact-type preference order only *inside* those checks (payments → agency; identity → prior return/SSA card; corrected → original). Never render it as a badge.

Total: ~3 hours, no new vocabulary, both mistakes caught plus GT-A03.

## 5. Probes run (trimmed)

```
$ python3 -I c2_probe1.py "<packet>"
verification_types: [agreed_to_source_document, recalculated, confirmed_with_client, agreed_to_prior_year, agreed_to_third_party_record]
required_steps: [..., "Identity verified", "Prior-year return reviewed", ..., "Estimated payments agreed to IRS and FTB records", ...]
keys containing reliab/trust/source_kind/source_type/hierarchy/rank/authority: {}
control: extracted_values with 'confidence' key: 3012 of 3012
readme mentions 'confidence': 2 ; 'reliab': 0 ; 'trust': 0 ; 'rank': 0
household theo: XXX-XX-3309  keys: [id, role, name, ssn, dob, relationship, months_lived_with_you]   (no confidence, no page)
extracted ssn values: ev-0012 D06 dep2_ssn XXX-XX-3390 0.99 ; ev-1080 D71 ssn XXX-XX-3390 0.99 ; (3 × Ngozi …2287)
line F8812.4 value 1 rule R-DEPENDENTS sources ['household:theo']
line F1040.26 value 13000 rule R-ESTIMATED-PAYMENTS sources [ev-1056..1061, 'qa-41'] note "...2026-01-14 4,000.00"
v3 lines citing household: 3 ; citing qa-: 9 ; citing agency: 0
v2 2026-03-19 D69 in documents_used: True ; v3: True ; D71 in any version: False
transcript as_of 2026-03-12 670: [(2025-04-15,3000),(2025-06-16,3000),(2025-09-15,3000),(2026-01-15,3000)]
efile: 2026-07-13T17:04Z federal rejected R0000-504-02 (dependent 2: Theo)

$ python3 -I c2_probe2.py "<packet>"
D06 prior_year_return | Delta River Tax Services | belongs_to joint
D71 identity_document | Social Security Administration | belongs_to dependent:theo
marked_corrected docs: [('D31', True)]   uploaded_by: client 70, firm 4
CHECK 1 identity: unmatched ssn value ev-0012 (dep2_ssn, joint) ; ev-0015/0034/0051 ngozi OK ; ev-1080 theo doc …3390 organizer …3309 -> MISMATCH ; compared: 4
CHECK 2 payments: F1040.26 = 13000 ; IRS 670 sum 12000 -> DIFF 1000 ; qa-sourced: ['qa-41']
                  F540NR.72 = 14000 ; ftb tax_year_2025_payments 3 × 3500 -> DIFF 3500
issuers carrying wrong/duplicated values: D28 Northlake Securities ; D09 Halvorsen Data LLC ; D29 Northlake Bank ; D52 Hill Country Title ; D53 Hill Country Bank

$ python3 -I c2_probe3.py "<packet>"
return_2024.dependents: [{Ada, XXX-XX-1106}, {Theo Lindqvist-Okafor, XXX-XX-3390}]
D06 p1 printed: "Dependents: Ada ... ; Theo Lindqvist-Okafor SSN XXX-XX-3390."
D71 received_at 2026-07-13T19:02:00Z | efile rejected 2026-07-13T17:04:00Z   (tl-22 document_received)

$ grep -n -i "reliab|ranking|open question" docs/decisions.md docs/discovery/reviews/*
decisions.md:24 "... Evidence's two open questions stay open until he answers"
reviews/01-evidence-review.md:41 S5 reliability ranking per fact type (agency first for payments)
```
