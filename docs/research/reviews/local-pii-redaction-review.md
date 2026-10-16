# Review: "Local PII redaction for tax documents"

Reviewer: Fable 5.1 (privacy/security, §7216–Safeguards compliance, ML), Fri 16 Oct 2026 00:19–00:35 EDT (`date`).
Probes: `scratchpad/review/pii/p2_measure.py`, `p3_holes.py`, `ner/bench.mjs` (`python3 -I`; Node 20.19.4, transformers.js 4.3.1). Every regex was proven on a synthetic control first (one probe's control missed the trailing period the real text has and gave a false zero; fixed before use). Packet read-only; last-4 only.

## 1. Packet figures

| Claim | Result | Probe |
|---|---|---|
| 17 SSN text hits (12 pages, 5 `text_as_read`), 5 distinct, 0 unhyphenated | **Reproduced**; also 0 split across lines, 0 space/dot-separated, 0 in file names or return_versions | p2, p3 |
| 8879 PINs 2; licences 2; IBAN 2 + county 1 | Reproduced | p2 |
| DOB 4, regex 2; IP PIN 2, regex 0; AGI 4, regex 0 | Reproduced on the report's surfaces (a 60-char PIN window catches 1 IP PIN). **AGI has 3 unlisted leaves**: `prior_years.return_2024.lines.F1040.11`, `.CA540.13`, `engine_reference.parameters.prior_year_agi` | p2 |
| Bank, phones, emails, ERO PIN, EFIN, PTINs: 0 text hits | Reproduced | p2 |
| Names 205 (90 full + 115 first) | Reproduced only if the questionnaire's structured `answered_by` field counts: 45 full and 45 first-name hits are that field, not free text (q+a text: 0 full names) | p2 |
| bert-base-NER ≈ 58% (63/108 pairs) | **Differs.** Same model, q8, plain `##` word-piece merge: 41/45 = **91%** where the full name is on the page (the report's pair definition); 110/145 = 76% strict on any name part. Three outside names (Quintero, Patel, Birgitta) and latency (p50 10 ms, 3.5 s total) reproduced | bench.mjs |
| `onnxruntime-node` 287 MB; Vercel 250 MB, 5 GB beta | Reproduced (`du`: darwin 85, linux 68, win32 133 MB; [Vercel limits](https://vercel.com/docs/functions/limitations)) | shell |
| Presidio drops 666/000 | Reproduced from [source](https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_ssn_recognizer.py): rejects areas 000/666, group 00, serial 0000, identical digits, mixed delimiters, 3 samples; **not** 9xx. **All 5 packet SSNs are 666-area**: Presidio would drop 5/5 | p2 |
| "account" context regex | 11 hits, 10 false positives ("account ending/holder"): 9% precision | p2 |

## 2. Legal and tool claims

Verified against primary text: §301.7216-1(b)(3)(i)(B), (b)(5), (b)(2)(i)(B); §301.7216-3(b)(4)(i)–(ii) and (c)(1) ("a single written document cannot authorize both uses and disclosures" — a stronger D02 cite than Rev. Proc. 2013-14); Rev. Proc. 2013-14 §5.05 masked/unmasked statements and §5.07 six frameworks (PDF via pypdf); 16 CFR 314.2(h)(2)(viii), 314.4(c)(1),(3),(5),(6),(8),(f),(j) (500 consumers, 30 days); 26 CFR 301.6109-4 in full; Tex. Bus. & Com. Code §521.053 on [statutes.capitol.texas.gov](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.521.htm) via browser (60th day; AG 30th day at ≥250 residents; encrypted-with-key counts). REDACT names Presidio and reports HIGH-tier recall 0.07 ([arXiv 2606.19881](https://arxiv.org/html/2606.19881)). Privacy Filter Apache-2.0, 1.5B/50M active (metadata says 1B), 8 labels, no SSN label; gliner-PII 0.70/0.64/0.87; Piiranha cc-by-nc-nd-4.0 — per the HF cards.

**California, now verified** (browser on [leginfo §1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82.), "Amended by Stats. 2025, Ch. 319 (SB 446), effective January 1, 2026"): individuals **within 30 calendar days** of discovery; when >500 residents, a sample notice to the AG **within 15 calendar days of notifying consumers** (not of discovery). §1798.150(a)(1) "nonencrypted and nonredacted" and §1798.145(e) GLBA exemption "shall not apply to Section 1798.150" verified in the CPPA's [statute PDF](https://cppa.ca.gov/regulations/pdf/ccpa_statute.pdf). Drop the "could not be opened" caveat.

## 3. Findings

**Must-fix**
1. **The US-vendor exception is misstated.** §301.7216-2(d)(2) covers contractors "in connection with the programming, maintenance, repair, testing, or procurement of equipment or software" — IT contractors — with the §6713/§7216 notice. An OCR or AI service that *processes* return data is not that; its route is (d)(1): disclosure to another US "tax return preparer" (auxiliary-service providers count, §7216-1(b)(2)(i)(B)) for non-substantive services — no notice requirement, but the vendor is itself bound. The proposed consent gate encodes the wrong paragraph. Source: [§301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2).
2. **The sweep is "100% by construction" only if the secret inventory is complete, and it is not.** Three AGI leaves (above) and superseded values are outside it. After GT-A05 is corrected, the old literal lives only in event history and diffs; a sweep keyed on *current* values misses it (regex still catches hyphenated SSNs, not an old DOB or AGI). Inventory every historical value of a secret field. Probe: p2 AGI pointers.

**Should-fix**
3. **Search still confirms a guessed last-4.** "3390" matches `XXX-XX-3390` in a masked index; the plan's test (full SSN, first five) passes while discovery 07's leak stays open. Accept last-4 as the TTIN-permitted exposure and say so, or exclude masked spans from the index.
4. **Cherry-picked benchmark.** REDACT is cited for Presidio's 0.07 but not for Privacy Filter's partial micro-F1 **0.512** on the same benchmark, while the report quotes the vendor's 96–97%. State both.
5. **NER number is understated**: 58% is a crude-rebuild artefact; a plain `##` merge gives 76–91%. The conclusion (no ML now) stands on the policy argument, not on this figure.
6. **Attribution**: "unencrypted" sits in 314.2(m), not 314.4(j); the statistical-compilation clause covers aggregates — redacted pages stay return information because they carry names and amounts "in any form", the simpler argument.
7. **Holes the plan omits**: pages contain zero newlines, so the recall test cannot exercise split or spaced SSNs — add a synthetic fixture; the "note refused" error must not echo the value; Vercel runtime logs and stack traces; Playwright traces/screenshots of the cleared-role reveal test hold full SSNs (`test-results/` is gitignored, verified; CI artefacts are not); a licence expiry on the birthday leaks DOB month/day (9 MM/DD hits for Ngozi).

**Notes**
8. The packet sits in the private repo with 28 full SSNs; README says all data is invented (666 prefix). The deployed link has a role switcher with no login (decisions.md), so masking demonstrates a control, it does not protect — say so in the write-up.
9. gliner-PII's 0.87 is on Nemotron-PII, its training set.
10. **1–1.5 h is optimistic** (hypothesis): it covers `redact()` and the unit recall test. The network-body Playwright sweep over every route, masked search index, exports and event refusal, on an app that does not exist yet (`project-build/` is empty), is nearer 3–4 h.
