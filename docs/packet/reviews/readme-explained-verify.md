# Verification: `readme-explained.md` against the packet README

Verifier: Claude Fable 5.1, independent of the author. Run 16 Oct 2026 00:00 EDT (04:00 UTC, `date`).
Scripts (read-only, `python3 -I`): `scratchpad/review/readme-explained/{coverage,quotes,spot,spot2}.py`.
Truth: `docs/packet/readme.json`; examples checked against the packet directly. No repo file edited.

## Verdict: faithful, with 5 minor defects (none changes meaning)

## 1. Coverage (`coverage.py`)

| Set | README | Explainer | Missing |
|---|---|---|---|
| Top-level keys | 9 | 9 `###` headings | none |
| `reference_formats` | 12 | 11 rows (`ref:param`/`ref:fx` share one) | none |
| `sections` | 22 | 20 rows (`client.*` share one) | none |
| `form_codes` | 35 names (`F8995 or F8995A` = 2) | 28 rows | none |

Can-fail proof: a copy with the `F8582` and `agency:/` rows deleted reports `missing: ['agency:/<json pointer>']`, `missing: ['F8582']`, `GAPS FOUND`. (The first run also wrongly skipped the F1040 row as a header; parser fixed.)

## 2. Quotes (`quotes.py`)

31 quoted phrases: 26 verbatim; 3 are scare quotes, not README ("Truth", "happened", "tax year 2024"); 2 are not verbatim:

- `"v3 (2026-06-23) … is the current return"` — README: "is the latest engine output **and** the current return".
- `"at today's numbers"` — README: "Rates are measured at **this version's** numbers". Shown as README text; it is not, and "today" blurs the per-version point.
- Trivial: `"everything Miraflores' …"` lowercases the README's "Everything".

## 3. Faithfulness

All nine paraphrases match the README. Noted:

- `household`: "as typed by the client" is applied to the whole section; the README scopes "exactly as the client entered them" to `people[]` only.
- "`what_if` beats the multiplication" is inference, not README text. Sound (README: "large changes can cross thresholds - the real system recomputes"), but label it as inference.
- Omitted, none load-bearing: IRS transaction-code meanings, timeline event names, bracket format `[upper_bound or null, rate]`, "ratios" as a line value type, the field enumerations.
- "all 34 codes appear in v3": v3 has 34 distinct forms; README names 35 (F8995A never appears).
- Packet quirk, not a defect: `fx_rates` keyed `SEK_per_USD`, engine fx keyed `SEK`; same values.

## 4. Packet spot-checks (`spot.py`, `spot2.py`): 26 checked, 25 exact

Exact: ev-0498 (D28 p3, `text_as_read` "", 0.0, conf 0.98); v1/v2/v3 dates and triggers; v3 rates (0.31/0.099, −0.31, −0.26, 0.0, 0.064, 0.099); 627 lines, 34 forms, 302 F8949; 3,012 values; 68/2/4 extraction; D31 only CORRECTED; D71 2026-07-13, D72 2028-01-26; tl-18..tl-29 after v3; msg-07..10 after v3, 10 messages, 1 call; 97 rules, 40 parameters; 5 what_if, extension from v2; F1040.11 = 445590, inputs F1040.9/.10; F8949.B.N1 = 19240.0; carryovers 3,200/11,000; CA to 07-14, TX from 07-15; generated 2026-10-12; standards 5 / >10% and >1,000 / 3; Aug-2026 transcript code 150 = "total tax on the return as filed (your final return)"; Theo SSN XXX-XX-3309 vs D71 XXX-XX-3390, reject R0000-504-02; D68 prints 2024, ev-1064 read 2024.

Imprecise (1): "v3 lists 71, but discovery 01 found 18 documents that no v3 line cites". Of the 71, 15 are uncited; discovery's 18 adds D30, D71, D72, which are not in `documents_used`.

## 5. Conflicts with existing docs

**(a) GT-C05 — holds.** `what_if.alternatives[hvac_improvement]`: "Treat the 11,000 HVAC replacement at 1450 Fremont Way as an improvement depreciated over 27.5 years instead of a repair", base v3, `SchE.14A` 13300→2300, federal `total_tax_change` **3633**, California **896**. Same change as GT-C05. README: "what_if holds engine results for specific alternatives"; "the real system recomputes". Replace +3,364 / +1,074 in file 03 and `ground-truth/README.md:34`. File 03 also used `ordinary_income` 0.099 for CA where the README assigns the Sacramento rental to `ca_source_income`.

**(b) GT-A06 — holds.** `03-business-rentals-assets.md:51`: "about −$690 at the 24% bracket. Net is about +$3,770". No 24% rate exists in v3 `tax_effect_rates` (marginal is 0.31); README says the QBI effect is what "the adjustment rate does not capture". File 01 (+4,464, QBI uncaptured) follows the README; `ground-truth/README.md:32` copies +3,770. No `what_if` covers SEHI, so +4,464 with the QBI caveat is the packet-consistent figure.

**(c) brief-explained — partly holds.** Line 31 "each with its source position" omits that positions are synthetic (README: "use them only to place highlights … if you want to"); fix the wording. Line 35 "every result is computed for us" is the brief's own sentence (`brief.txt:65`), and the same line already says "multiply it by the rates the packet gives". That charge is overstated; add only "the engine cannot be rerun".
