# The tool does the accounting: proofs as receipts, an unexplained-variance check, engine-warning coverage

> Replaces the rolled-back firm-steps gate (docs/superpowers/plans/2026-10-24-firm-steps-gates.md, reverted in
> e24af9e and 60f2c88). Inline execution, test first. Tier b.

**Goal (unchanged for the product):** the tool finds the mistakes and proves the numbers; the reviewer only judges what
needs a person. This round makes the tool's own accounting visible and adds a generic net, with **no new screens, no
new forms, no new gate and no extra reviewer work** on the real packet.

**Fit with the existing app (mapped first):** Checks is the one inbox (findings from check families, accordion rows,
in-place actions); the side panel answers "where it came from, how it was built, who checked it, what is open"; the
engine's own warnings are listed beside our checks, never as findings (src/domain/checks/index.ts:1-3).

## What is built
| # | Capability | EXTENDS / NEW | Where it shows | Real packet (measured 24 Oct) |
|---|---|---|---|---|
| 1 | **Proofs the tool runs itself** on a line, in the firm's own verification vocabulary: *agreed to source document* (the value equals one of its extracted sources or their sum), *recalculated* (a sum line whose inputs add up), *agreed to prior year* (a carryover equals last year's carryover record) | NEW `src/domain/proofs.ts` (pure, schema-only), EXTENDS the side panel's "Who checked it" | side panel, "Checked by Taxmark" above people's sign-offs | e.g. SchD.6 = 2024 carryover 3,200; F8582.1c = 6,300 + 9,850 |
| 2 | **Unexplained prior-year change**: a non-total line on both returns, past the firm's variance rule, that no proof explains (its documents do not add up to it and no carryover agrees) | EXTENDS the "Prior year vs documents" family with one check | an ordinary finding on Checks (Check severity) | 0 rows: all 14 swings are explained (11 documents, 1 carryover, 2 by existing findings); proven to fire on an altered copy |
| 3 | **Engine-warning coverage**: each engine warning says which of our checks covers it, or that none does | EXTENDS the "From the engine" list on Checks | a link to the covering item, or a "Not covered by our checks" tag | 6 of 11 covered; 5 not (two compliance tasks, a questionnaire conflict, a low-confidence read; CA AMT is covered by CHK-LINE-NOT-COMPUTED) |

**Wording rule for proofs:** a proof states a fact ("Agrees with Form W-2 box 1, ev-0016"), never "correct": a
confident mistake agrees with its own source, which is why our checks test it against *other* sources.

## Out of scope
Firm-step gates, Review tabs, Explain forms, bulk explain, unused-document rows (measured as noise), agency tie-out
proofs (already a check), changing severities, the ledger, the AI layer, hand-in documents.

## Tasks (each red first)
1. `proofs.ts` + unit tests: each proof fires on a real line (W-2 wages, a sum line, SchD.6 carryover) and does not on
   an altered copy (value changed); no proof for a line with no numeric source.
2. Side panel: "Checked by Taxmark" lists a line's proofs (browser test on SchD.6 and F1040.1a); clients and the
   examiner keep their current views.
3. `CHK-UNEXPLAINED-VARIANCE` in prior-year.ts: silent on the real packet; fires on an altered copy where a swinging
   line's value no longer matches its sources; schema-only; listed in the families test.
4. Checks "From the engine": coverage per warning (browser test: CA_AMT links to its finding; FORM_1099_FILING reads
   "Not covered by our checks").
5. Full unit and browser suites; Fable 5.1 review with probes; logs; deploy on Aarvin's go (already given).

## Plan review (Fable 5.1, 24 Oct 10:57 EDT): APPROVE WITH CHANGES, all applied
1. Agreement proofs would land on 15 of 27 ledger-mistake lines and read as verification. On a line with an open
   finding the side panel shows no "Checked by Taxmark" proofs, only "Matches its sources, but our check disputes it".
2. Engine-warning coverage is 3 of 11 with today's matching, 5 of 11 once a line ref also matches through that line's
   sources. Extend `engineOn` (src/domain/items.ts) with that one rule and derive coverage as its inverse; no third
   matcher. "Not covered by our checks" never counts toward any inbox number.
3. Unexplained variance: only lines with no input lines (`inputs.length === 0`), else false positives (SchE.22A, F1040.16).
4. A single-input line reads "Carried from <line>", not "Recalculated".
Logged, out of scope: 17 prior-only swings (dropped lines and forms, GT-B05 territory).
