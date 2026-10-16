# Mask at the server, not with a model

**Build one deterministic, server-side redaction pass now, and leave local ML models out of the one-day build.** On this packet, three rules catch every secret the firm's rule names: context-anchored regex, a sensitivity policy keyed on field and label, and a "known-value sweep" that masks every literal occurrence of a value already marked secret. The sweep is complete only if its list of secret values is complete, and that list must include old values kept in the edit history. A small local NER model tagged 76–91% of household name occurrences, depending on how a hit is counted. The app's own name records catch all of them, and the model's only new finds were three third-party names that no rule asks to mask. Packaging it for Vercel would cost 2–4 hours and put deploy risk on the critical path. The law points the same way. US rules require **encryption, least-privilege access, activity logging and controlled disclosure**. They do not require on-screen masking. Masking in the UI is good practice that a reviewer will expect, because the brief asks for "protection of sensitive data with view logs" and the packet itself says uncleared staff see SSNs, bank numbers and IP PINs masked. The legal point with the biggest design impact: under IRC §7216, **redacting data before sending it to an outside OCR or AI service does not stop the send from being a disclosure**. So local redaction is a safety layer in front of any future AI service, never a substitute for consent and contracts. The hand-in should build the redaction choke point, the logged "reveal" event and the tests that prove no full SSN reaches an uncleared role. Browser-side ML scrubbing, attachment OCR and outbound pseudonymisation belong in the write-up as a future adapter. One limit should be stated plainly: the deployed role switcher has no login, so anyone with the link can pick a cleared role. In this build, masking **demonstrates** a control. It does not protect anything.

## Federal law demands encryption and logging; masking is a choice, and redaction does not stop a disclosure

Start with what the law requires, because it is narrower and stricter than people assume. **A CPA firm that prepares returns is a GLBA "financial institution"**: 16 CFR 314.2(h)(2)(viii) names "an accountant or other tax preparation service." That brings in the FTC Safeguards Rule's concrete duties ([16 CFR 314.2](https://www.law.cornell.edu/cfr/text/16/314.2)):

- give access only to authorised users, limited to what each needs (§314.4(c)(1));
- encrypt customer information **at rest and in transit** (§314.4(c)(3));
- use MFA (§314.4(c)(5));
- dispose of data within two years of last use (§314.4(c)(6));
- "monitor and log the activity of authorized users" (§314.4(c)(8));
- bind service providers by contract (§314.4(f));
- notify the FTC within 30 days of a "notification event" affecting 500 or more consumers (§314.4(j)).

Source: [16 CFR 314.4](https://www.law.cornell.edu/cfr/text/16/314.4). The "unencrypted" condition sits in the definition at §314.2(m): a notification event is the "acquisition of unencrypted customer information", and data counts as unencrypted "if the encryption key was accessed by an unauthorized person" ([16 CFR 314.2](https://www.law.cornell.edu/cfr/text/16/314.2)). The breach duty took effect on 13 May 2024 ([Federal Register 2023-24412](https://www.federalregister.gov/documents/2023/11/13/2023-24412/standards-for-safeguarding-customer-information)).

The IRS's own security publications say nothing about masking. A keyword search of Pub 4557, Pub 5708 (the WISP template) and Pub 1345 found **no hits for mask, truncate, redact or "last four"**. The same search did find encryption, cloud and MFA, which shows it could return matches. Those publications push encryption, MFA, secure transfer, and an inventory of every place PII lives, including "Online (Web-based) applications" ([IRS Pub 4557](https://www.irs.gov/pub/irs-pdf/p4557.pdf); [IRS Pub 5708](https://www.irs.gov/pub/irs-pdf/p5708.pdf)).

The closest thing to a federal display standard is the truncated TIN rule. It allows **`XXX-XX-1234` for an SSN and `XX-XXX1234` for an EIN** on statements furnished to another person. It forbids truncation on anything filed with the IRS or SSA, and it forbids a filer from truncating its own TIN ([26 CFR 301.6109-4](https://www.law.cornell.edu/cfr/text/26/301.6109-4)). That gives the app a regulator-endorsed mask format. It also gives a packet check: a truncated payer EIN on a W-2 is an error, while a truncated recipient SSN is not.

California and Texas, the household's two states, regulate where SSNs go, not how they appear on internal screens. Both forbid:

- public display of an SSN;
- sending one over an insecure, unencrypted internet connection;
- using the SSN as the only credential for a website;
- printing it on mail unless the law requires it.

Both exempt use "for internal verification or administrative purposes" ([Cal. Civ. Code §1798.85 via FindLaw](https://codes.findlaw.com/ca/civil-code/civ-sect-1798-85/); [Tex. Bus. & Com. Code §501.001](https://texas.public.law/statutes/tex._bus._and_com._code_section_501.001)). Texas requires notifying individuals within **60 days** of a breach, and the Attorney General within 30 days when 250 or more Texans are affected. Encrypted data counts as breached if the key is also taken ([§521.053](https://texas.public.law/statutes/tex._bus._and_com._code_section_521.053)). California's CCPA exempts data covered by GLBA, but §1798.145(e) says the exemption "shall not apply to Section 1798.150", the data-breach private right of action. §1798.150(a)(1) gives that right to "any consumer whose nonencrypted and nonredacted personal information" is breached ([CCPA statute, CPPA PDF](https://cppa.ca.gov/regulations/pdf/ccpa_statute.pdf)). Field-level masking in stored exports and logs is therefore worth doing: data that is **encrypted or redacted** falls outside that right. California's breach deadlines changed under SB 446, effective 1 Jan 2026:

- individuals must be notified **within 30 calendar days** of discovery;
- when more than 500 residents are affected, a sample notice goes to the Attorney General **within 15 calendar days of notifying consumers** (not of discovery).

Sources: [Troutman Pepper](https://www.troutmanprivacy.com/2025/10/california-amends-breach-notification-statute/); [McDonald Hopkins](https://www.mcdonaldhopkins.com/insights/news/changes-to-californias-data-breach-notification-law); the statute is [Cal. Civ. Code §1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82.).

**§7216 is where redaction stops helping.** Disclosure means making return information known "in any manner whatever." Return information explicitly includes "statistical compilations … even in a form that cannot be associated with … a particular taxpayer" ([26 CFR 301.7216-1](https://www.law.cornell.edu/cfr/text/26/301.7216-1)). The simpler argument: a redacted page still carries names and amounts, and return information is "any information" furnished for preparation, in any form. So an outbound OCR or AI call is a disclosure **whether or not the data is redacted first**. What redaction changes is narrower:

- **Offshore SSN rule.** For 1040 filers, the preparer must "redact or otherwise mask the taxpayer's SSN" before disclosing outside the US. The only exception is when both sides keep an adequate data-protection safeguard ([26 CFR 301.7216-3](https://www.law.cornell.edu/cfr/text/26/301.7216-3)).
- **Consent wording.** Whether the SSN is fully masked decides which offshore consent statement Rev. Proc. 2013-14 §5.05 requires. It does not decide whether consent is needed ([Rev. Proc. 2013-14](https://www.irs.gov/pub/irs-drop/rp-13-14.pdf)).
- **US services that process the return data.** The route for these is §301.7216-2(d)(1): disclosure to another US "tax return preparer" for services that are not "substantive determinations or advice affecting the tax liability." Software and auxiliary-service vendors count as tax return preparers, so the vendor is itself bound by §7216 ([26 CFR 301.7216-1](https://www.law.cornell.edu/cfr/text/26/301.7216-1)). (d)(1) carries **no notice requirement**. An OCR service that reads a W-2 fits (d)(1).
- **IT contractors.** §301.7216-2(d)(2) is a different exception. It covers contractors for "programming, maintenance, repair, testing, or procurement" of equipment or software, limited to what they need, and only with a written §6713/§7216 notice to the people who receive the data ([26 CFR 301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2)). It fits a hosting or support vendor, not a service that processes the return.
- **AI that does substantive analysis** falls outside (d)(1) and needs signed consent, in the commentators' reading. The IRS has issued no AI-specific guidance ([CPA Practice Advisor](https://www.cpapracticeadvisor.com/?p=191491)).

For this packet, the firm's only consent document (D02) is a combined "use and disclose" form. The project's discovery notes treat it as invalid for disclosure (`docs/discovery/07-firm.md` §3). **No outbound call has a legal basis on file**, and the app should show that as a blocked gate rather than hide it.

The table turns this into a field policy. The tiers are a design judgement built on the cited rules, not law. Under §7216 every field on the return is protected.

| Tier | Fields | Screen | Export / client copy | Logs | Before any outside service |
|---|---|---|---|---|---|
| 1 — credentials and IDs | SSN/ITIN, bank routing and account, IP PIN, 8879 and ERO PINs, prior-year AGI, driver's licence | Masked by default; reveal is logged | Masked (full TIN only on a filing copy) | Never stored | Redacted locally, plus consent or contract |
| 2 — personal context | DOB, dependants' details, street address, phone, email | Visible to the assigned role | Masked | Masked | Redacted or pseudonymised |
| 3 — return content | Amounts, payer names and EINs, filing status | Normal | Normal | Field id only | Minimum necessary, under contract |

## Rules plus a known-value sweep catch every named secret; the misses are policy gaps, not ML gaps

The packet shows why redacting by field type alone fails. Only **11 extracted values are typed as sensitive** (5 `ssn`, 5 `ein`, 1 `account_number`). Yet the 5 distinct SSNs appear **28 times**, and 12 of those are in printed page text across 11 documents. None of the 28 is already masked (`docs/discovery/07-firm.md` §2). Other secrets are typed as ordinary data:

- the IP PIN is typed `code`;
- the DOBs are typed `date`;
- the prior-year AGI, an e-file identity secret ([IRS Self-Select PIN](https://www.irs.gov/e-file-providers/self-select-pin-method-for-forms-1040-and-4868-modernized-e-file-mef)), is typed `money`.

Secrets also sit in free text:

- a timeline entry holds both spouses' 8879 signature PINs;
- D36 prints a full foreign IBAN;
- D04 and D05 print driver's licence numbers next to a DOB.

The bank numbers, phones, emails, ERO PIN, EFIN and PTINs appear **0 times across 3,256 text surfaces**, so a schema rule alone covers them.

A 12-pattern regex set was run over every text surface, and the results checked against every known value in the packet:

| Class | Occurrences in text | Regex caught | Why missed |
|---|---|---|---|
| SSNs (5 distinct) | 17 | 17 | — |
| 8879 PINs | 2 | 2 | — |
| Driver's licence numbers | 2 | 2 | — |
| IBAN and county account | 3 | 3 | — |
| DOBs | 4 | 2 | Two are bare dates with no "DOB" label |
| IP PIN | 2 | **0** | A year sits between the keyword and the number; one is a bare number |
| Prior-year AGI | 4 | **0** | It is an ordinary amount; only its meaning makes it secret |
| Household names | 205 | **0** | Regex cannot know names |

Source: scratchpad script `s4.py`; summarised in `docs/research/research_notes/Local PII redaction for tax documents/project_fit.md`.

**Every miss is a value whose *field* is secret, not its text shape.** No model fixes that. Two rules do:

- a policy table keyed on the measured field names (`ip_pin`, `dob`, `agi`, the 2024 Federal AGI line);
- a known-value sweep that takes every value the policy marks secret and masks each literal occurrence, including variants such as unhyphenated forms, the three date formats, and amounts with and without commas.

The sweep is 100% **only if its inventory of secret values is complete**, and the first inventory was not. It must include:

- **every copy of the prior-year AGI**, not just the four in text: also `prior_years.return_2024.lines.F1040.11`, `prior_years.return_2024.lines.CA540.13` and `engine_reference.parameters.prior_year_agi` (all three confirmed present in the packet);
- **every superseded value of a secret field**, held in the event history and diffs. After GT-A05 is corrected, the old SSN ending 3309 lives only in history. A sweep keyed on *current* values misses it. Regex still catches a hyphenated SSN, but not an old DOB or AGI.

So the inventory is built from every value a secret field has ever held: the packet's value, plus each event that changed it. With that rule, a probabilistic detector still cannot match the sweep on known values.

Names went the other way. A local `Xenova/bert-base-NER` model (q8 ONNX, MIT licence, run through transformers.js 4.3.1) was run over all 199 pages. The first pass reported 58%, but that came from a crude rebuild of split word pieces. A plain `##` merge of the same model's output, re-run for this revision, gives:

- **76%** (110 of 145 page–name pairs) when every part of the name must be tagged;
- **81%** (118 of 145) when any part counts;
- **91%** (41 of 45) on pages that print the full name.

The model still split unusual surnames, and it found only three names outside the app's own records: two contractors on D27 and one inheritance source on D36. A gazetteer built from the app's household and staff records catches all known-name occurrences. Of the 205 counted, 90 sit in the questionnaire's structured `answered_by` field rather than free text, so the free-text name count is lower. The case against ML here rests on the policy argument, not the recall number. Names should stay visible to staff, who need them to work, and be pseudonymised only on outbound calls.

Two caveats. First, the packet is generated text with consistent formats, so 100% here does not carry over to messy real scans. The write-up should say so. Second, any validator that *filters* by SSN validity is a trap for synthetic data. Microsoft Presidio's SSN recogniser rejects area 666 and known sample numbers ([Presidio us_ssn_recognizer.py](https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_ssn_recognizer.py)), and the SSA never assigns 000, 666 or 900–999 ([SSA](https://www.ssa.gov/employer/randomization.html)). **All five SSNs in this packet use area 666**, so Presidio's default SSN recogniser would drop all five. Detect by format and context, and record validity as a separate check, never as a filter on redaction.

The structural identifiers also limit what any detector can do:

- **SSN, ITIN and EIN have no check digit.** All are nine digits, and only the hyphenation distinguishes them.
- **Only the ABA routing number has a checksum** (3-7-1 weights). Presidio's own recogniser list marks only the US NPI as checksum-validated ([Presidio supported entities](https://presidio.dataprivacystack.org/supported_entities/)).
- **A transposed SSN is invisible to regex.** That is exactly packet mistake GT-A05: Theo's SSN ending 3309 on the organizer, against 3390 on the card.

Cross-document comparison is the only check that catches it, and it can run on the server and return only "match" or "mismatch."

## Local models are real but none is built for US tax IDs, and Vercel is the worst place to run them

Local PII models are now good enough to take seriously, but none is built for US tax identifiers:

| Option | Licence | Size (ONNX) | Published accuracy | Tax-ID coverage | Runs where |
|---|---|---|---|---|---|
| **OpenAI Privacy Filter** (Apr 2026) | Apache-2.0 | q4 917 MB, q4f16 809 MB; about 50M active parameters | Vendor: F1 96–97% on PII-Masking-300k ([Help Net Security](https://www.helpnetsecurity.com/2026/04/23/openai-privacy-filter-personally-identifiable-information/)). Independent: partial micro-F1 **0.512** and high-sensitivity recall 0.57 on REDACT ([arXiv 2606.19881](https://arxiv.org/html/2606.19881)) | **No SSN/TIN label**; 8 fixed labels ([HF card](https://huggingface.co/openai/privacy-filter)) | Browser via WebGPU (first-party example); too big for a page download |
| **NVIDIA gliner-PII** | NVIDIA Open Model License | about 570M parameters | Strict F1 0.64–0.87 across three sets; the 0.87 is on Nemotron-PII, its own training set ([HF](https://huggingface.co/nvidia/gliner-PII)) | SSN and account labels | Python; JS through a community `gliner` npm package |
| **Knowledgator gliner-pii-base** | Apache-2.0 | quint8 197 MB | Average F2 0.738, third-party leaderboard ([BenchmarkList](https://benchmarklist.com/benchmarks/pii_masking_benchmark/)) | Zero-shot labels | Node or browser via ONNX |
| **Piiranha v1** | **CC-BY-NC-ND** (non-commercial) | int8 317 MB | SOCIALNUM F1 0.93, TAXNUM recall 0.89 ([HF](https://huggingface.co/iiiorg/piiranha-v1-detect-personal-information)) | Yes | Unusable commercially |
| **Presidio** | MIT | spaCy `sm` 12.8 MB, `lg` 400 MB compressed | Partial micro-F1 0.195; recall **0.07** on high-sensitivity categories ([REDACT, arXiv 2606.19881](https://arxiv.org/html/2606.19881)) | Regex plus context | Python only |
| **Small LLMs (3–8B)** | Varies | GBs | Do not beat BERT or GLiNER for redaction ([RedactionBench, arXiv 2606.18782](https://arxiv.org/pdf/2606.18782)) | Prompted | CPU too slow; GPU needed |

Model sizes are from the Hugging Face API, read 16 Oct 2026.

The model cards themselves set the limits. OpenAI calls Privacy Filter "a redaction and data minimization aid, not an anonymization, compliance, or a safety guarantee." It warns that financial uses need human review, and its labels cannot be changed without fine-tuning ([HF card](https://huggingface.co/openai/privacy-filter)). Presidio's documentation warns that "there is no guarantee that Presidio will find all sensitive information" ([Presidio](https://presidio.dataprivacystack.org/)). The gap between vendor and independent numbers is large: Privacy Filter reports F1 of 96–97% on its chosen dataset but scores **0.512** on REDACT's main metric, the best of the local tools there and still about half. No published benchmark covers PII on US tax forms.

Where a model runs matters more than which model it is.

**On a Vercel function.** Bundles are limited to **250 MB uncompressed for Node** (500 MB for Python), memory to 2–4 GB, and request bodies to 4.5 MB. There is no GPU ([Vercel Functions limits](https://vercel.com/docs/functions/limitations)). `onnxruntime-node` alone measured 287 MB in `node_modules`. A 109 MB NER model fits under the limit only if build tracing strips the other platforms' binaries. That is packaging risk on the day the app ships.

**In the browser.** Transformers.js runs on CPU via WASM by default. Its WebGPU path is "still experimental in many browsers" ([Transformers.js docs](https://huggingface.co/docs/transformers.js/index)). Privacy Filter's 800+ MB download is impractical there. A 60–110 MB NER model is feasible.

**Measured speed.** On an Apple M4 Pro in Node, bert-base-NER loaded in 2.9 s and processed all 199 pages in 3.8 s (p50 11 ms per page, p90 64 ms). Browser WASM will be slower, and it was not measured.

The browser is still the only place where "nothing leaves the device" is literally true. That makes it the right future home for scrubbing attachments and AI-bound text before upload. It can never be the *enforcement* point for role masking, because the user controls the browser and the brief requires server-enforced roles.

## Build one choke point, one reveal event, and tests that prove a non-zero

The core takes about **1.5 hours**. The full test and hardening scope adds about **2–2.5 hours more**, so the total is about 3.5–4 hours. Both figures are estimates, and `project-build/` is still empty. The core has five parts:

1. **A sensitivity policy table** keyed on value type, field and label.
2. **One server function, `redact(text, viewer)`.** It runs the known-value sweep first, then the context regex, and outputs `XXX-XX-1234` for TINs and `•••` for PINs.
3. **A single serialisation path.** Every API route uses it: document pages, fields, search, the event log, diffs, exports and the client's copy. The full SSN therefore never reaches the uncleared browser, in the HTML or in the network payload.
4. **An append-only `reveal` event.** It records actor, role, field id, sensitivity class, reason and time, never the value. This answers the Safeguards Rule's logging duty and the brief's "view logs."
5. **A server-side match check.** It shows GT-A05 to an uncleared reviewer as a mismatch without revealing either number.

The policy has these consequences:

- **Search** indexes text with masked spans **removed**, not replaced by `XXX-XX-1234`. Indexing the mask would let a search for a guessed last four digits confirm the guess. Last-4 is permitted on furnished statements, but search should not turn it into a lookup.
- **Log entries** store *that* a value was seen. A note whose free text contains a full SSN is refused, and the refusal message names the problem without echoing the value.
- **Server errors and Vercel runtime logs** also go through `redact`. No request body or stack trace that might hold a value is logged unmasked.
- **Licence expiry dates** are masked with the DOB. A licence often expires on the holder's birthday, so the expiry reveals the DOB's month and day. In this packet, one taxpayer's birth month and day appear 9 times in text, some of them licence expiry dates.
- **Unread uploaded images** are restricted to cleared roles until something can read them.
- **Marcus Bell**, who has `sensitive_data_clearance: false` with the note "no access to full SSNs or bank numbers," cannot reveal.

The project's independent reviewer recommended exactly this scope (`docs/discovery/reviews/07-firm-review.md` §3).

The tests matter more than the code, because a redaction test that passes on an empty page proves nothing. Each test is paired with a check that shows it can fail:

| Test | What it asserts | Proof it can fail |
|---|---|---|
| **Uncleared role sees no full SSN** | Playwright, signed in as the uncleared staff member, opens every document, the timeline, messages, search and the export. The DOM **and every network response body** contain no `\d{3}-\d{2}-\d{4}` and none of the known secret literals. | The same scan as a cleared user after a reveal finds the value. A fixture with `redact` bypassed fails. |
| **Search cannot confirm a guess** | Searching a known SSN, its first five digits, or its **last four** returns nothing. | A non-sensitive phrase from the same page returns at least one hit. |
| **The log never stores a secret** | After a scripted reveal and a refused note, the events table and the error response hold 0 secret literals. | A seeded test literal is found by the same scan. |
| **Recall does not regress** | A unit test asserts the masked counts: 17 SSNs, 2 IP PINs, 4 DOBs, 2 8879 PINs, 2 licence numbers, 3 account numbers, every AGI copy and every superseded value. Names are untouched. | The counts themselves are non-zero, so a broken pass fails. |
| **Odd layouts are caught** | A synthetic fixture with an SSN split across a line break, spaced or dotted, is masked. The packet cannot test this: its pages contain no newlines at all (0 in the whole file). | The fixture fails when the pattern is narrowed to hyphens only. |

The cleared-role reveal test puts full SSNs into Playwright traces and screenshots. `test-results/` is in `.gitignore`, but CI artefact uploads are not covered by it. So that test either runs with tracing and screenshots off, or its artefacts are not uploaded.

Two policy calls remain open for Aarvin. First, whether to mask payer EINs: there are 20 occurrences in text, and the firm rule does not mention them. Second, whether masking is the default for every role with logged reveals, or applies only to uncleared staff. Masking by default for everyone fits the logging duty best.

The future update belongs in the write-up as a pluggable second detector behind the deterministic one, never instead of it:

- a small browser-side NER through transformers.js, or Presidio with a small spaCy model on a US-hosted box, for unknown free-text PII such as D27's contractors;
- tesseract.js plus scrubbing for uploaded images;
- per-span sensitivity offsets stored when a document is ingested.

**For any future OCR or AI service, local redaction is the gate in front of it.** The earlier OCR research ranks where a reader may run, cleanest first:

1. browser-side;
2. self-hosted in the US;
3. a US cloud API under contract;
4. public endpoints, ruled out for SSNs.

Source: `docs/research/reports/Unlimited OCR fit for tax workpaper.md`.

Redaction fits into that ranking as follows. Text bound for any service passes through the same `redact` function. It uses *consistent pseudonyms* (the same SSN always becomes the same token) rather than blackouts, so that cross-document checks still work. The call is then refused unless a valid §7216 basis is on file:

- **A US service doing non-substantive preparation work**, such as OCR. It relies on §301.7216-2(d)(1) and needs no consent or notice. It still needs a Safeguards Rule service-provider contract (§314.4(f)) and, for the AICPA, a confidentiality agreement.
- **Signed consent**, for anything offshore, for AI doing substantive analysis, or for any use beyond preparation.

The §6713/§7216 notice belongs to (d)(2) IT contractors, such as hosting or support, not to the processing gate. Pseudonyms must be marked as synthetic, or they recreate the invalid-SSN trap.

## Conclusion

Redaction in a tax workpaper turns out to be a data-model problem more than a detection problem. The app already knows which values are secret, because it holds them in structured records. Its job is to make sure that knowledge reaches every surface that prints text. That is why a deterministic sweep beats a model here, and why the hard part is the single choke point and the tests that prove it can fail, not choosing a detector. ML becomes useful only where the app does not know the values in advance: real scans, uploaded images and third-party names. Those arrive with real documents, which this packet does not have.

The second insight concerns how to present this in the hand-in. Local redaction does not make an AI feature legal. It shrinks what a breach exposes and changes one consent sentence, but the §7216 disclosure stands. A design that shows the consent gate as **blocked** for this household is the honest one. It is also more convincing than any AI demo, because D02 leaves no valid disclosure consent on file. Two things remain unverified and should be flagged rather than smoothed over: no published benchmark measures PII detection on US tax forms, and the 100% recall here reflects clean generated text, not production scans.

## Changes after review (Fable 5.1)

Review: `docs/research/reviews/local-pii-redaction-review.md`. Every point was re-checked before being accepted. None was rejected; two were accepted with a narrower wording.

| # | Point | How it was checked | Change |
|---|---|---|---|
| 1 | §7216 route is (d)(1), not (d)(2) | Read [§301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2): (d)(2) is programming, maintenance, repair, testing or procurement, with the notice; (d)(1) is another US preparer, non-substantive services, no notice | Fixed the legal section and the consent gate |
| 2 | "Unencrypted" sits in §314.2(m) | Read [§314.2](https://www.law.cornell.edu/cfr/text/16/314.2) paragraph (m) | Citation moved; §314.4(j) kept for the 30-day, 500-consumer duty |
| 3 | California deadlines and CCPA sections | §1798.150(a)(1) and §1798.145(e) wording read in the reviewer's saved CPPA statute PDF. SB 446 deadlines confirmed by Troutman Pepper and McDonald Hopkins; leginfo still returns 403 to this agent | Caveat removed; deadlines added |
| 4 | Sweep inventory incomplete | Packet probe: `F1040.11`, `CA540.13` and `engine_reference.parameters.prior_year_agi` all present | Inventory rule added: every AGI copy and every superseded value |
| 5 | NER figure understated | Re-ran the reviewer's `bench.mjs`: 110/145 strict (76%), 118/145 lenient (81%), 41/45 full-name pages (91%) | Accepted with a narrower wording: the figures are reported with their definitions. The 41/45 is not claimed to be the original 63/108 definition, because the pair counts differ |
| 6 | Privacy Filter shown with both numbers | Read REDACT ([arXiv 2606.19881](https://arxiv.org/html/2606.19881)): Privacy Filter 0.512, GLiNER 0.320, Presidio 0.195 partial micro-F1 | Table and text show vendor and independent numbers |
| 7 | Build-plan holes | 0 newlines in the whole packet (probe); `test-results/` in `.gitignore` (read); DOB month/day of one taxpayer appears 9 times in text (probe, against 849 dates of that shape overall, so some hits are coincidence) | Added: removing masked spans from the search index; a last-4 search test; no echo in error messages; runtime logs through `redact`; trace and screenshot handling; licence expiry masked with the DOB; a split-SSN fixture; a plain statement that the role switcher has no login, so masking demonstrates a control rather than protecting anything |
| 8 | Estimate | Judgement; `project-build/` is empty | 1.5 h core plus 2–2.5 h of tests and hardening, about 3.5–4 h in total |
| — | All 5 packet SSNs are area 666 | Probe, last 4 only | Added: Presidio's default would drop 5/5 |
| — | gliner-PII 0.87 is on its training set | Model card | Noted in the table |
