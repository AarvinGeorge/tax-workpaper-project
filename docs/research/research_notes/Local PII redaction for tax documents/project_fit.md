# Local PII redaction: fit for the one-day tax workpaper

Written Fri 16 Oct 2026 (local clock read with `date`: 00:10 EDT at start). Packet measurements come from read-only
scripts in the session scratchpad, `research/pii/s2.py … s7.py` (run with `python3 -I`), plus `bench.mjs` and `bench2.mjs` (Node 20.19.4,
`@huggingface/transformers` 4.3.1, Apple M4 Pro). No full SSN, PIN or account number is reproduced in these notes.
Local project files are cited by repo path; web sources by URL.

## Where in this app does PII need detection or redaction?

### Takeaway
Everywhere the server sends text, not just typed fields. Seven places need it: the document viewer, search, exports and
the client's copy, the activity log, diffs, uploaded attachments, and any outbound AI or OCR call. Field typing covers only
a small part of the problem: the packet types 11 values as sensitive, but full SSNs alone appear 28 times. So the
redaction must be one server-side function that every response passes through.

### Cited Findings
- The brief asks for "protection of sensitive data with view logs" under Firm, "Enforced roles", "the client's copy",
  "status and search", and lets users "Attach any file, message or note as evidence" — `docs/brief.txt` lines 20, 40, 43, 46–47.
- The packet's own rule: "Staff without sensitive-data clearance see SSNs, bank and account numbers and IP PINs masked;
  every unmasked view is logged" — packet `firm.starter_standards.rules` (measured, `s5.py`).
- Marcus Bell (st-04) has `sensitive_data_clearance: false`, with the note "Background check pending; no access to full
  SSNs or bank numbers" — packet `firm.staff` (measured, `s3.py`).
- Full SSNs: 28 occurrences of 5 distinct numbers. Of these, 12 are in printed page text on 11 documents, and 0 are
  already masked. Only 5 / 5 / 1 extracted values are typed `ssn` / `ein` / `account_number` — `docs/discovery/07-firm.md` §2,
  reproduced in `docs/discovery/reviews/07-firm-review.md` §1. My own scan agrees on the text surfaces: 17 SSN hits, 12 on
  pages and 5 in `text_as_read` (`s4.py`).
- Several sensitive values are typed as ordinary data:
  - the IP PIN, ev-0005, is typed `code`;
  - the dates of birth, ev-0006 and ev-0008, are typed `date`;
  - the 2024 AGI, ev-0010 and ev-3002, is typed `money`.

  These are measured in `s5.py`, and DOB plus prior-year AGI are e-file identity secrets
  ([IRS Self-Select PIN](https://www.irs.gov/e-file-providers/self-select-pin-method-for-forms-1040-and-4868-modernized-e-file-mef),
  cited in `docs/discovery/07-firm.md` §2).
- Sensitive values also sit in free text, outside document pages:
  - timeline tl-20 holds both spouses' 8879 signature PINs;
  - msg-10 announces that an SSN card is attached;
  - D36 prints a full Swedish IBAN, and D58 prints a county account number;
  - D04 and D05 print driver's licence numbers next to a DOB;
  - D03 prints the IP PIN.

  Source: `docs/discovery/07-firm.md` §2; re-measured in `s3.py` and `s4.py`.
- Some secrets exist only as structured fields and never appear in document text. These are the bank routing and account
  numbers, the household phones and emails, the ERO PIN, the EFIN and the 4 PTINs: each has 0 occurrences across 3,256 text
  surfaces (`s4.py`). The text surfaces are 199 pages, 29 timeline details, 10 messages, 1 call note, the questionnaire,
  3,012 `text_as_read` strings, the return-version diagnostics and the prior workpaper.
- Places the existing discovery already identified:
  - **Search.** Typing the last digits of a card number finds that card. A snippet must never come from inside a masked
    span, or searching a guessed SSN confirms it.
  - **Activity log.** An entry such as "changed SSN from …3309 to …3390" leaks the value, so the log records *that* a
    value was seen, never the value.
  - **Exports and timeline details** carry the same text.

  Source: `docs/discovery/07-firm.md` §3 and §5, edges 1 and 7; review finding 5.
- The mask format is the IRS truncated TIN, XXX-XX-1234. It is for display only and is never used on anything filed with the IRS
  ([26 CFR 301.6109-4](https://www.law.cornell.edu/cfr/text/26/301.6109-4), cited in `docs/discovery/07-firm.md` §3).
- Outbound AI or OCR is a "disclosure" under §7216. The firm holds no valid disclosure consent: D02 is a combined
  "use and disclose" form, and Rev. Proc. 2013-14 §5.05 requires separate documents.
  Sources: `docs/discovery/07-firm.md` §3; [Rev. Proc. 2013-14](https://www.irs.gov/irb/2013-03_IRB);
  [26 CFR 301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2).
- The OCR report already ranks where a reader may run, cleanest first: browser-side, then self-hosted in the US, then a US
  cloud API under contract, then public endpoints. It places any OCR or AI service behind the firm's data-protection
  layer — `docs/research/reports/Unlimited OCR fit for tax workpaper.md`, section "Nothing to read…".

### Inferences
- Each place has its own mechanism:

  | Place | What to do |
  |---|---|
  | **Screen rendering by role** | Mask in the server response, not with CSS or in client JS. Otherwise the full SSN is in the HTML and network payload that Marcus's browser receives. |
  | **Search** | Index the *masked* text for every role. Then a search for a full or partial SSN cannot match, and a snippet cannot show one. Cleared users reveal a value; they do not search for it. |
  | **Exports / client's copy** | Use the same mask pass. The client's copy is masked by default too: Ada is an adult on the joint return (`07-firm.md` §5, edge 8). |
  | **Activity log** | Events store a field id and a class, never the value. Before the append, check the event's free text (reason, note) with the same detector, and refuse the event if it holds a full SSN. |
  | **Diffs / version comparisons** | For sensitive fields, compare on the server and show only "changed" or "match / mismatch" (`07-firm.md` §3, "Checks can run on secrets without revealing them"). The diff text goes through the same mask. |
  | **Uploaded attachments** | File names, message text and notes are text: mask them. File contents (images, PDFs) cannot be read without OCR, so mark an unread upload "may contain sensitive data". Only cleared roles can open it, and each open is logged. |
  | **AI / OCR (future)** | Redact or pseudonymise before sending, and block the call when no disclosure consent is on file. |

- Because masking happens at a single server choke point, the role switcher's server-side permission check and the mask live
  in the same code path. That is the easiest arrangement to test.

### Gaps
- Uploaded image or PDF contents cannot be scanned without OCR. Whether a reviewer would accept the rule "unread uploads are
  restricted to cleared roles" is a design judgement, not something measured.
- Whether the 8879 PINs must be kept rather than stripped rests on IRS Pub 1345, which is still **unverified**
  (`docs/discovery/07-firm.md` §5).

## Is a deterministic regex/checksum detector enough, or is a local ML model needed?

### Takeaway
For the secrets the firm rule names, regex plus field-level policy catches everything measured, as long as the matching is
anchored to context. For names, a lookup of the names in the app's own records beats both regex (0% of names caught) and a
small local NER model (about 58% of name occurrences caught in my crude scoring). ML adds only three third-party names that
none of the firm's rules ask to mask. So no ML model is needed for this build.

### Cited Findings
Measured with `s4.py`. The regex set had 12 patterns:
- SSN `\d{3}-\d{2}-\d{4}`;
- EIN;
- PTIN;
- IBAN;
- PIN with context;
- licence number with context;
- account number with context;
- routing number with context;
- DOB with context;
- phone;
- email;
- US street address.

Ground truth is every known value from household, firm and document records, including unhyphenated and date-format variants.

| Class | Occurrences in text | Regex caught | Why missed |
|---|---|---|---|
| SSN (5 distinct, incl. Theo's card number) | 17 (12 pages, 5 `text_as_read`) | **17** | — |
| 8879 PINs (tl-20) | 2 | **2** | — |
| Driver's licence numbers (D04, D05) | 2 | **2** | — |
| IBAN (D36) | 2 | **2** | — |
| County account (D58) | 1 | **1** | — |
| Home street addresses | 2 exact; plus 23 other street-address hits (rentals 1450 Fremont Way ×8, 1200 Barton Hills Dr ×7, employers) | all | — |
| DOB | 4 | **2** | ev-0006/0008 `text_as_read` is a bare date with no "DOB" context |
| IP PIN | 2 | **0** | D03 reads "PIN for returns filed in calendar year 2026 is …": a year sits between the keyword and the number. ev-0005 is a bare number |
| Prior-year AGI | 4 (D06 p1, p12; ev-0010, ev-3002) | **0** | It is an ordinary money amount; only its meaning makes it secret |
| Household full names | 90 (45 pages, 45 questionnaire) | **0** | Regex cannot know names |
| Household first names | 115 | **0** | Same |
| Staff names in text | 1 | 0 | Same |

- Over-matching: the EIN pattern made 20 hits that are payer and employer EINs, which are not personal secrets
  (`s4.py`). The firm rule does not list EINs, but the packet types 5 values as `ein`. Whether to mask them is a policy choice.
- No unhyphenated SSNs were found, so no 9-digit SSN pattern is needed. A bare 9-digit pattern would collide with the bank
  routing number format (`s4.py`; `docs/discovery/reviews/07-firm-review.md` §1).
- 8 pages print "account ending NNNN", which is already partial (`s5.py`).
- Local NER test: `Xenova/bert-base-NER`, q8 ONNX, 109 MB, MIT licence, run in Node with transformers.js 4.3.1 over all
  199 pages (83,864 characters) (`bench2.mjs`):
  - It tagged a known person's name word as PER in 63 of 108 page–name pairs.
  - It split unusual surnames into pieces ("Okaf"+"or", "Lindq"+"vist", "Ngoz"+"i").
  - The 58% figure is a lower bound: my word-piece rebuild is crude, so some fragments it counts as misses may be real hits.
- The only new names NER found outside the household and staff records:
  - "Mara Quintero" and "Dev Patel", contractors on D27, the Lindqvist Studio contractor report;
  - "Birgitta Lindqvist", the inheritance source on D36.

  Source: `bench2.mjs`, `s6.py`, `s7.py`. A capitalised-bigram scan agrees: almost every other two-word capitalised name in
  the text is a company, such as "Atlas Outdoor" or "Halvorsen Data LLC" (`s5.py`).
- Presidio, the standard open PII framework, itself uses "regular expressions, rule-based logic, and checksums, with
  attention to surrounding context", plus spaCy, Stanza or Transformers NER. It warns that "there is no guarantee that
  Presidio will find all sensitive information." It is "transitioning to a community-owned project" under Data Privacy
  Stack — [Presidio](https://presidio.dataprivacystack.org/).
- Presidio's US recognizers (US_SSN, US_ITIN, US_BANK_NUMBER, US_DRIVER_LICENSE, US_PASSPORT and others) are listed as
  "pattern match and context". Only US_NPI adds a checksum, so US_SSN has no checksum —
  [Presidio supported entities](https://presidio.dataprivacystack.org/supported_entities/).
  - Caveat: in the fetched summary, PERSON and LOCATION read as "custom logic and context". The Presidio home page says NER
    engines do that work. Treat the entities page wording as unconfirmed.
- OpenAI's `privacy-filter` (Apache-2.0, created 17 Apr 2026, about 326k downloads) labels people, addresses, emails,
  phones, URLs, dates, account numbers and secrets. Its own card states:
  - "a redaction and data minimization aid, not an anonymization, compliance, or a safety guarantee";
  - "Additional caution is warranted in high-sensitivity settings such as medical, legal, financial";
  - labels cannot be changed at runtime.

  Source: [HF model card](https://huggingface.co/openai/privacy-filter).

### Inferences
- The packet is generated text with consistent formats. That is why context-anchored regex reaches 100% on SSN, licence,
  IBAN and account numbers here. Real scanned documents would be messier; the write-up should say so.
- The misses are not ML problems. The IP PIN, the DOBs and the prior-year AGI are missed because the *field* is secret,
  not the text shape. The fix is a policy table keyed on `field` and `label`: `ip_pin`, `dob`, `agi` and
  "2024 Federal AGI" are measured field names in `s5.py`. Two more steps complete it:
  - a **known-value sweep**: take every value the policy marks secret (5 SSNs, the IP PIN, 4 DOBs in 3 date formats,
    the AGI as "228409" and "228,409", the 8879 PINs, the bank numbers, the ERO PIN) and mask every literal occurrence in
    any text;
  - widening the IP PIN context window, though the known-value sweep already catches it.
- The known-value sweep is deterministic, and on this packet its recall of known secrets is 100% by construction. A local
  ML model cannot match it on known values.
- Names: the app holds every household and staff name in structured records. A gazetteer catches all 205 known-name
  occurrences that regex misses. NER adds 3 third-party names, which no firm rule masks.
  - Recommendation: do not mask names in staff views; staff need names to work.
  - Pseudonymise names only on outbound AI or OCR calls, and there the gazetteer is enough for this packet.

### Gaps
- My NER recall number is a lower bound, because the word-piece reassembly is crude. I did not test
  `aggregation_strategy` in transformers.js 4.3.1.
- No published benchmark covers PII detection on US tax forms. I found no accuracy comparison across the small PII models
  (curtain-privacy, piiranha, gliner-pii).

## Where would a local model run, and at what cost, latency and build time?

### Takeaway
If a model is ever used, run it in the browser as a pre-upload or pre-send scrub, or on a separate host. A Vercel
function is the worst fit: the models are big, and onnxruntime-node pushes even a 109 MB model near the 250 MB bundle limit.
None of these belongs in the one-day build.

### Cited Findings
- Vercel Functions limits:
  - memory: Hobby 2 GB / 1 vCPU, Pro 4 GB / 2 vCPU;
  - bundle: 250 MB uncompressed (500 MB for Python), with "Large functions" up to 5 GB in **beta**, which requires
    fluid compute with Active CPU;
  - request and response body: 4.5 MB;
  - duration: Hobby 300 s;
  - no GPU listed;
  - billing is active CPU time plus provisioned memory time.

  Source: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations), updated 24 Aug 2026.
- transformers.js 4.3.1 is the current npm release (`npm registry`, read 16 Oct 2026). It runs models in the browser
  through ONNX Runtime: "By default … on your CPU (via WASM)", with WebGPU opt-in, which is "still experimental in many
  browsers". q8 is the WASM default dtype, and the docs advise quantized models for browsers —
  [Transformers.js docs](https://huggingface.co/docs/transformers.js/index).
- Measured dependency sizes in `node_modules`:
  - onnxruntime-node: 287 MB, of which linux binaries are 68 MB;
  - onnxruntime-web: 140 MB;
  - @huggingface/transformers: 14 MB;
  - total: 480 MB (`du`, scratchpad).
- Model sizes from the Hugging Face API, 16 Oct 2026:

  | Model | Size | Licence and notes |
  |---|---|---|
  | `Xenova/bert-base-NER` | int8/q8 109 MB, q4f16 94 MB | MIT |
  | `openai/privacy-filter` | q4 917 MB, q4f16 809 MB, fp32 about 5.6 GB in three parts | Apache-2.0 |
  | `knowledgator/gliner-pii-base-v1.0` | quint8 197 MB | Apache-2.0 |
  | `onnx-community/piiranha-v1…-ONNX` | int8 317 MB | The original `iiiorg/piiranha-v1` is **cc-by-nc-nd-4.0**, not usable commercially |
  | `hackshare/curtain-privacy` | q4 58 MB | MIT; created 10 Jul 2026, only 58 downloads, unproven |

- Measured latency, Node on Apple M4 Pro, `Xenova/bert-base-NER` q8 over the 199 packet pages (`bench.mjs`):
  - model load: 2.9 s, from local cache after the first download;
  - whole packet: 3.8 s;
  - per page: p50 11 ms, p90 64 ms, max 93 ms.

  This is not a browser WASM number. Browser WASM is usually slower than native onnxruntime-node, and I did not measure it.
- Presidio as the server option: Python, deployed as pip packages, Docker or an HTTP service
  ([Presidio](https://presidio.dataprivacystack.org/)); presidio-analyzer 2.2.364 on PyPI. Its spaCy models:
  - `en_core_web_lg` 3.8.0 is a **400.7 MB compressed** wheel, so unpacked it would very likely exceed Vercel's 500 MB
    Python limit (the unpacked size is my inference);
  - `en_core_web_sm` is 12.8 MB.

  Source: GitHub release API, explosion/spacy-models.
- The GPU-host cost reference point from the OCR report is Modal or HF Endpoints at about $0.60–0.80 per hour
  (`docs/research/reports/Unlimited OCR fit for tax workpaper.md`).

### Inferences
| Where | What fits | Cost | Latency | Time inside the one-day build (my estimate) |
|---|---|---|---|---|
| **Browser** (transformers.js, WASM) | bert-base-NER q8 (109 MB) or curtain-privacy (58 MB). privacy-filter at 809–917 MB is impractical as a page download | $0 server; 109 MB download per user on first load, cached afterwards | First load: seconds to tens of seconds on a typical connection, plus about 3 s model init. Then tens of ms per page (extrapolated from Node) | 2–3 h, including COOP/COEP and worker setup, a loading UI, and tests that are flaky in CI |
| **Vercel function** (Node) | bert-base-NER q8 plus linux onnxruntime-node, about 180 MB: under 250 MB only if output-file tracing excludes the darwin/win32 binaries and onnxruntime-web. Presidio with `en_core_web_sm` fits Python 500 MB; `_lg` likely does not. privacy-filter needs the Large functions beta, and 4 GB of memory is tight for its 0.8–1.8 GB weights | Active CPU plus memory time. Each cold start loads 109 MB or more | About 3 s or more cold start for the model, then about 10–60 ms per page | 2–4 h; packaging risk on the deploy path the day it ships |
| **Separate host** (Presidio Docker, or a GPU box for privacy-filter) | Any model | About $0.60–0.80 per hour for a GPU; a small CPU box costs less | Network round trip plus inference | 2–4 h plus a second deploy target. Sending text to it is itself a disclosure to justify |
| **None: regex, field policy and known-value sweep in the existing server code** | Everything the firm rule names | $0 | Microseconds | About 1–1.5 h including tests |

- The browser is the only place where "nothing leaves the device" holds. That makes it the right future home for one job:
  scrubbing a user's attachment, or text bound for AI, before upload or send. Pair it with tesseract.js for images, which the
  OCR report already rates as the only OCR that fits Vercel.
- Browser-side scrubbing cannot be the *enforcement* point for role masking. The browser belongs to the user, and the brief
  demands server-enforced roles. So masking stays on the server whatever happens to ML.

### Gaps
- No measured browser WASM latency on this packet.
- No measured Vercel cold-start time for onnxruntime-node.
- No Vercel per-invocation dollar figure: the limits page gives the billing basis, not prices.
- The bundle-size fit of about 180 MB is an estimate from local `du` on darwin, not from a Vercel build.

## What to build now versus describe in the write-up

### Takeaway
Build now: one server-side `redact(text, viewer)` function and a `reveal` event. The function uses context regex, a policy
table keyed on field and label, and a known-value sweep. Run every response through it: page, field, search snippet, log,
diff and export. Put local ML, attachment OCR scrubbing and outbound-AI pseudonymisation in the write-up as a future
adapter. Prove it with tests that fail if a full SSN reaches an uncleared role.

### Cited Findings
- The independent reviewer recommended exactly this scope: "regex-mask SSN/EIN/account/IP-PIN/DOB/PIN patterns at render
  for uncleared roles (TTIN format), one append-only `reveal` event with reason, and server-side comparison showing
  match/mismatch". It classed the other items as write-up material —
  `docs/discovery/reviews/07-firm-review.md` §3, must-fix 2; adopted in `docs/discovery/07-firm.md` §6.
- The discovery proposes masking by default for everyone, with every reveal logged by anyone. Its reasoning is the FTC
  requirement to "monitor and log the activity of authorized users"
  ([16 CFR 314.4(c)(8)](https://www.law.cornell.edu/cfr/text/16/314.4); `docs/discovery/07-firm.md` §5, not-obvious edge 3,
  and §7, question 1, still open for Aarvin).
- The project's test layout already requires one test per known packet mistake, plus Playwright tests per role —
  `CLAUDE.md`, Layout.

### Inferences
**Build now, about 1–1.5 h (estimate):**
1. **A `sensitivity` policy table.** Map `value_type ∈ {ssn, ein?, account_number}` and the fields `ip_pin`, `dob`, `agi`,
   `CA540.13` (2024 Federal AGI), 8879 PINs, licence numbers, routing and account, and the ERO PIN to a class.
2. **The `redact(text, viewer)` function**, applied in a fixed order:
   - known-value sweep over every secret literal, with variants;
   - context regex: SSN, IBAN, licence, account, PIN, DOB;
   - output in truncated-TIN style (XXX-XX-1234), or `•••` for PINs.

   Default: masked for every role. Marcus cannot reveal.
3. **One choke point.** Every API route serialises through `redact`, including search, which indexes masked text, the event
   log, diffs and exports.
4. **A `reveal` event** in the append-only log: actor, role, entity or field id, class, reason, time. Never the value.
5. **A server-side match check** that returns only "match" or "mismatch". It shows GT-A05 (Theo's card ending 3390 against
   the organizer's ending 3309) to Marcus without revealing either number.

**Tests**, each with a zero-proof (`~/.claude/CLAUDE.md` §3: a zero must be provably non-zero):
- *"No full SSN appears in any rendered page for a role without clearance."* Playwright as Marcus opens every document page,
  the timeline, messages, search and the export. It asserts that the DOM text **and every network response body** contain
  no `\d{3}-\d{2}-\d{4}`, none of the 5 known SSNs with or without hyphens, and none of the IP PIN, DOB, 8879 PIN or AGI
  literals.
  - Zero-proof: the same assertion run as a cleared user *after a reveal* must find the value.
  - Control: a fixture page containing a test SSN must fail the check when `redact` is bypassed.
- *Search cannot confirm a guess.* As Marcus, searching for a known SSN, or its first five digits, returns 0 results. Zero-proof:
  searching a non-sensitive string from the same page returns at least 1.
- *The log never stores a secret.* After a scripted reveal, scan the `events` table rows (JSON) for every known secret
  literal: expect 0. Zero-proof: seed a test literal through a known path and confirm the scan finds it.
- *Recall regression.* A unit test runs `redact` over all 199 pages and the free-text surfaces, then asserts these counts:
  - the 17 SSN text occurrences, the 2 IP PIN occurrences, the 4 DOB occurrences and the 2 8879 PINs all masked;
  - the 2 licence numbers and the 3 account and IBAN occurrences masked;
  - names untouched.

**Write-up only (future update):**
- A local ML pass for unknown free-text PII: third-party names such as D27's contractors, and new formats.
  - In the browser via transformers.js for attachments and AI-bound text, using a small NER (about 60–110 MB).
  - Or Presidio with a small spaCy model on a separate US host.
  - Either way, as an *additional* detector behind the deterministic one, never instead of it. The model cards themselves
    disclaim guarantees.
- tesseract.js plus scrubbing for uploaded images.
- Pseudonymise text for outbound AI or OCR, gated by the consent registry (no disclosure consent is on file, D02).
- Per-span sensitivity offsets stored at ingest, retention, and crypto-shredding: already deferred in
  `docs/discovery/07-firm.md` §6.

### Gaps
- Two decisions for Aarvin are still open:
  - whether EINs are masked (20 payer EINs in text; the firm rule is silent);
  - mask-by-default for everyone versus only for uncleared staff (`07-firm.md` §7, question 1).
- Time estimates are my judgement, not measurements.
