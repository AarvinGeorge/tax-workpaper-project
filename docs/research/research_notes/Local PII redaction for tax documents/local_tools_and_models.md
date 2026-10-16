# Local PII detection and redaction for US tax and financial documents (as of Oct 2026)

Research pass run Fri 16 Oct 2026, 00:11 EDT (04:11 UTC), clock read with `date`. All fetched web content treated as data. "Fetched" = page read in this pass; "snippet" = search-result summary only (lower confidence); "unverified" = not confirmed from a primary source in this pass.

## Rule-based detectors: SSN, ITIN, EIN, ABA routing, account numbers, DOB, IP PIN, address, phone, email — and their traps

### Takeaway
Regex plus checksum is fast, deterministic and runs anywhere (browser, Node, edge), but for tax identifiers only the ABA routing number has a real checksum; SSN, ITIN and EIN are just 9 digits with range rules, so they collide with each other and with account numbers, and context words carry most of the precision. Presidio's own SSN rules reject 666-area and known sample numbers, which is a direct trap for synthetic test packets that use 666-xx or 9xx SSNs.

### Cited Findings
- Presidio `UsSsnRecognizer` patterns (fetched from source, main branch, Oct 2026): four "very weak" patterns at score 0.05 (`\d{5}-\d{4}`, `\d{3}-\d{6}`, `\d{3}-\d{2}-\d{4}`, bare `\d{9}`) and one "medium" pattern `\d{3}[- .]\d{2}[- .]\d{4}` at 0.5. Context words: social, security, ssn, ssns, ssid. — [Presidio us_ssn_recognizer.py](https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_ssn_recognizer.py)
- Presidio SSN invalidation rejects: mixed delimiters; all-identical digits; group `00` or serial `0000`; area `000` or `666`; and the literal sample values 123456789, 987654320, 078051120. It does **not** reject 9xx areas, and does not reject the full 987-65-4320..4329 advertising block (only ...4320). — same source
- SSA randomization (25 Jun 2011): area numbers 000, 666 and 900–999 remain excluded from assignment. — [SSA, Randomization](https://www.ssa.gov/employer/randomization.html) (snippet)
- 987-65-4320 to 987-65-4329 reserved for advertising; 078-05-1120 is the 1938 Woolworth wallet-card number, widely treated as void — secondary sources only, not SSA. — [fraudpractice.com](https://fraudpractice.com/fraud-articles/social-security-numbers-(ssn)---the-anatomy-of) (snippet); [transferfees.io SSN validator](https://transferfees.io/validators/ssn/) (snippet)
- Presidio `UsItinRecognizer`: must start with 9; 4th–5th digits restricted to 50–65, 70–88, 90–92, 94–99 (93 excluded); scores 0.05 (one separator), 0.3 (no separators), 0.5 (both separators). Context words: individual, taxpayer, itin, tax, payer, taxid, tin. — [Presidio us_itin_recognizer.py](https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_itin_recognizer.py)
- IRS's ITIN landing page states only "a 9-digit number"; the range rules are not on that page. — [IRS ITIN page](https://www.irs.gov/individuals/individual-taxpayer-identification-number)
- Presidio `AbaRoutingRecognizer`: first digit in [0123678]; `\d{9}` at 0.05, `\d{4}-\d{4}-\d` at 0.3; context aba, routing, abarouting, association, bankrouting; checksum = digits × weights 3,7,1,3,7,1,3,7,1, valid if sum mod 10 = 0. — [Presidio aba_routing_recognizer.py](https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/aba_routing_recognizer.py)
- Presidio `UsBankRecognizer`: single weak pattern `\b[0-9]{8,17}\b` at 0.05, context check, account, account#, acct, bank, save, debit. — [Presidio us_bank_recognizer.py](https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/country_specific/us/us_bank_recognizer.py)
- Presidio's supported-entities page lists US_BANK_NUMBER, US_DRIVER_LICENSE, US_ITIN, US_MBI, US_NPI, US_PASSPORT, US_SSN; only US_NPI is marked as using a checksum. ABA routing is not in that US list (so it may not be in the default registry — unverified). — [Presidio supported entities](https://presidio.dataprivacystack.org/supported_entities/)

### Inferences
- **666-xx / 9xx trap:** a synthetic tax packet very likely uses invalid-by-design SSNs (666-, 9xx-, 000-). A validity-filtering detector (Presidio SSN) will *drop* 666-xx and the sample values — a false negative in exactly the test data. For a workpaper, detect by format+context and record validity as a separate check, never as a filter on redaction.
- **SSN vs ITIN vs EIN:** all are 9 digits. ITIN = 9xx with 4th–5th in the ranges above, so it overlaps the SSN 9xx space that SSN validators reject. EIN is conventionally written `XX-XXXXXXX` (2-7 grouping) — format distinguishes it only when hyphenated; unhyphenated, all three plus a routing number and an 8–17-digit account number match the same string. Field labels on the form (box name) are the reliable disambiguator in structured data.
- **Transposed digits:** SSN/ITIN/EIN have no check digit, so a transposition is undetectable by regex; only ABA routing (3-7-1 weights) catches most single-digit errors and some transpositions. Cross-document consistency (same SSN on W-2, 1099, prior-year return) is the only check for the others.
- **Account numbers:** `\d{8,17}` will hit dollar amounts written without separators, ZIP+4 without hyphen (9 digits), phone numbers without punctuation, and form/control numbers; context words are essential.
- **DOB:** any date regex over-hits on tax documents (every form has tax-year dates, payment dates, filing dates); DOB needs a label/context ("date of birth", "DOB").
- **IP PIN:** a 6-digit number; no format rule distinguishes it from any other 6-digit value — must be label-driven.

### Gaps
- No primary IRS source fetched for EIN prefix validity (valid campus prefixes) or for the ITIN digit ranges (IRS Pub 1915 not fetched); EIN prefix list unverified.
- No primary SSA page fetched for 987-65-432x or 078-05-1120.
- Whether Presidio enables `AbaRoutingRecognizer` in its default registry — not confirmed.
- No published precision/recall for regex-only detectors on tax forms found.

## Frameworks and models: licence, size, CPU/GPU, latency, published accuracy, browser / Vercel fit

### Takeaway
The realistic local stack in Oct 2026 is (1) regex+checksum for structured identifiers, (2) a small token-classifier for names/addresses in free text — OpenAI Privacy Filter (Apache-2.0, 1.5B total / 50M active, ships transformers.js + ONNX with WebGPU) is the newest and the only one with first-party browser support, with GLiNER-family models (NVIDIA gliner-PII, Knowledgator, GLiNER2 ONNX ports) as zero-shot alternatives — and (3) optionally a small LLM, which published evidence says does *not* beat BERT/GLiNER-class models for redaction. Presidio is the orchestration/anonymizer layer but is Python-only and weakest on high-sensitivity categories in a 2026 benchmark.

### Cited Findings
**OpenAI Privacy Filter** (released ~23 Apr 2026)
- Apache-2.0, on Hugging Face and GitHub as `openai/privacy-filter`, ships a CLI `opf`; 1.5B total parameters, ~50M active; up to 128k-token context; bidirectional token classifier with constrained Viterbi span decoding. — [Help Net Security, 23 Apr 2026](https://www.helpnetsecurity.com/2026/04/23/openai-privacy-filter-personally-identifiable-information/)
- PII-Masking-300k: F1 96% (P 94.04%, R 98.04%); revised dataset F1 97.43% (P 96.79%, R 98.08%) — vendor-reported, no independent replication found. — [Help Net Security](https://www.helpnetsecurity.com/2026/04/23/openai-privacy-filter-personally-identifiable-information/)
- 8 labels: account_number, private_address, private_email, private_person, private_phone, private_url, private_date, secret (BIOES tags, 33 classes). **No dedicated SSN/TIN label** — government IDs would have to fall under account_number or be missed. Label policy cannot be changed at runtime (fine-tune required). — [HF model card](https://huggingface.co/openai/privacy-filter)
- Model card documents a Transformers.js example using WebGPU with q4 quantization, ONNX tags, 9 quantized variants, a community WebGPU Space; says it can run in a browser or on a laptop. Card's size field shows "1B params", conflicting with the 1.5B headline. — [HF model card](https://huggingface.co/openai/privacy-filter)
- Stated limitations: misses uncommon identifiers and novel formats; over-redacts placeholders, hashes, sample credentials; fragments spans in mixed-format text; financial/government uses need human review. — [HF model card](https://huggingface.co/openai/privacy-filter)
- OpenAI's own announcement page returned HTTP 403 to fetch. — [openai.com](https://openai.com/index/introducing-openai-privacy-filter/)

**Microsoft Presidio** (now Data Privacy Stack)
- Docs moved: microsoft.github.io/presidio → presidio.dataprivacystack.org (301 redirects observed in this pass). — [Presidio docs](https://presidio.dataprivacystack.org/supported_entities/)
- Secondary report (15 Jul 2026): project now under independent Data Privacy Stack org (github.com/data-privacy-stack/presidio), MIT licence unchanged, images moved to ghcr.io/data-privacy-stack/presidio-*, v2.2.363 on 28 Jun 2026. Only blog sources — unverified. — [pasqualepillitteri.it](https://pasqualepillitteri.it/pt/news/5545/microsoft-presidio-pii-protecao-dados-ia)
- REDACT benchmark (arXiv 2606.19881, 18 Jun 2026; 25 languages, 1,000-record sample): Presidio recall **0.07** on HIGH-sensitivity categories; LLM detectors (GPT-4.1, Claude Sonnet 4.6) lead; GLiNER and OpenAI Privacy Filter form a close middle tier; Presidio trails on every language. — [arXiv 2606.19881](https://arxiv.org/abs/2606.19881)

**GLiNER family**
- NVIDIA `gliner-PII` (v1.0, 28 Oct 2025): NVIDIA Open Model License (commercial use allowed); based on gliner_large-v2.1, ~570M params; 55+ entity types incl. SSN and account numbers; strict F1 @0.3 threshold: Argilla PII 0.70, AI4Privacy 0.64, Nemotron-PII 0.87; PyTorch/GLiNER Python only on card, no ONNX/browser mention, no latency (tested on A100). — [HF nvidia/gliner-PII](https://huggingface.co/nvidia/gliner-PII)
- Knowledgator gliner-pii: BenchmarkList "PII Masking Benchmark" average F2 0.814 (large-v1.0, rank 4) and 0.738 (base-v1.0, rank 10); aggregate over OpenPII, Gretel, Nemotron-PII, Privy. Third-party leaderboard. — [BenchmarkList](https://benchmarklist.com/benchmarks/pii_masking_benchmark/) (snippet)
- SPY benchmark span F1 (from a third-party model card): fastino GLiNER2 0.477, NVIDIA gliner-PII 0.400, urchade gliner_multi_pii-v1 0.398 — low absolute numbers on a harder benchmark. — [HF mateoopa/gliner2-privacy-filter-PII-multi](https://huggingface.co/mateoopa/gliner2-privacy-filter-PII-multi) (snippet)
- JS runtime: `gliner` npm package (GLiNER.js, v0.0.19) runs ONNX GLiNER models with WebGPU/WASM/CPU providers; a HF discussion on `onnx-community/gliner_multi_pii-v1` reports browser use was hard without a JS port; `DanKau/gliner2-pii-onnx` points to `@lmoe/gliner-onnx.js` for Node. Maturity unverified. — [npm gliner](https://npmjs.com/package/gliner); [HF discussion](https://huggingface.co/onnx-community/gliner_multi_pii-v1/discussions/1); [DanKau/gliner2-pii-onnx](https://huggingface.co/DanKau/gliner2-pii-onnx) (snippets)

**Piiranha v1**
- Licence **CC-BY-NC-ND-4.0** (non-commercial, no derivatives); mDeBERTa-v3-base, ~0.3B params; 256-token context (must chunk); 17 PII types incl. SOCIALNUM, TAXNUM, ACCOUNTNUM, DATEOFBIRTH; trained on ai4privacy pii-masking-400k. Overall P 93.16 / R 93.08 / F1 93.12; per class: SOCIALNUM F1 0.93, TAXNUM P 0.97 R 0.89, ACCOUNTNUM F1 0.85, DATEOFBIRTH R 0.85. — [HF Piiranha](https://huggingface.co/iiiorg/piiranha-v1-detect-personal-information)

**Small local LLMs as redactors**
- PRvL (arXiv 2508.05545): instruction-tuned Llama-3.1-8B ≈ P 0.95 / R 0.92, Llama-3.2-3B ≈ P 0.89 / R 0.83 (label-exact); a BERT-NER baseline ≈ 0.98 recall. — [arXiv 2508.05545](https://arxiv.org/pdf/2508.05545) (snippet)
- RedactionBench (arXiv 2606.18782, Jun 2026): fine-tuned small LMs underperform BERT and GLiNER — best SLM R-Score 0.45 vs best BERT 0.58 vs GLiNER 0.47. — [arXiv 2606.18782](https://arxiv.org/pdf/2606.18782) (snippet)
- No benchmark found for Qwen/Phi/Gemma via Ollama or llama.cpp specifically. — search, this pass

**Deployment limits — Vercel Functions** (docs last_updated 24 Aug 2026)
- Bundle: 250 MB uncompressed (Node), 500 MB (Python); "large functions" beta up to 5 GB on Node/Bun/Python with Fluid compute. Memory: Hobby 2 GB/1 vCPU; Pro/Ent up to 4 GB/2 vCPU. Duration: 300 s (Hobby), 800 s (Pro, 1800 s beta). Request/response body 4.5 MB. — [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

### Inferences
- **Fit by runtime:**
  - *Browser:* regex/checksum (trivial); OpenAI Privacy Filter via transformers.js q4 on WebGPU (first-party example); GLiNER ONNX via `gliner` npm (community, less mature). Keeps PII on-device — strongest privacy story for a demo.
  - *Vercel Node function:* regex; ONNX classifiers ≤ ~300M params fit easily in 250 MB/2 GB; Privacy Filter q4/q8 likely fits (size not measured — unverified); Presidio needs Python (500 MB bundle, spaCy model adds size) — feasible but cold starts unknown.
  - *CPU server:* all of the above plus Presidio with spaCy/transformers NER; small LLMs (3–8B, quantized) are slow on CPU.
  - *GPU:* needed realistically only for LLM redactors or batch GLiNER-large.
- **For tax documents specifically:** none of the ML models has a reliable *US tax ID* label (Privacy Filter has none; Piiranha has SOCIALNUM/TAXNUM but non-commercial licence; NVIDIA gliner-PII lists SSN). Structured identifiers should come from field labels + regex/checksum; ML adds value mainly for names, addresses and free-text notes.
- **Latency per page:** no source gave per-page latency for any model; a 50M-active classifier should be well under a second per page on CPU, but this is an inference, not a measurement.

### Gaps
- No per-page latency figures, browser memory figures, or ONNX file sizes were measured or found for any model.
- No StarPII model card fetched (BigCode StarPII is code-PII-focused and gated, per prior knowledge — unverified this pass).
- No spaCy NER PII numbers fetched; no HF de-identification BERT (e.g. clinical de-id) model cards fetched.
- No independent evaluation of OpenAI Privacy Filter's 96% F1; REDACT paper aggregate numbers not extracted (only abstract read).
- Presidio's move to Data Privacy Stack confirmed only by doc redirects and blogs, not the repo itself.

## Redaction vs masking vs pseudonymisation vs tokenisation

### Takeaway
Pick by whether the reviewer must still *link* values: irreversible redaction for exports, consistent pseudonyms (same SSN → same token everywhere) for a workpaper where cross-document matching is the whole point, and reversible encryption/vault tokenisation only when an authorised role must see the original.

### Cited Findings
- OpenAI Privacy Filter is explicitly "a redaction aid, not an anonymization, compliance, or safety guarantee." — [HF model card](https://huggingface.co/openai/privacy-filter)
- Presidio splits Analyzer (detection) from Anonymizer (operators); Presidio docs index. — [Presidio docs](https://presidio.dataprivacystack.org/supported_entities/)

### Inferences
- Definitions (standard practice, not sourced in this pass): *redaction* removes or blacks out the span (irreversible); *masking* keeps partial form, e.g. `***-**-1234` (irreversible, keeps last-4 for matching); *pseudonymisation* replaces with a consistent fake value per real value (deterministic map or keyed hash, HMAC) so joins survive; *tokenisation* stores originals in a vault and returns tokens (reversible by authorised lookup); *format-preserving encryption* (NIST FF1/FF3-1) yields a valid-looking 9-digit value and is reversible with the key.
- Presidio Anonymizer operators are, from prior knowledge: replace, redact, mask, hash, encrypt (AES, reversible via a deanonymize engine), keep, custom — **unverified this pass**.
- In a tax workpaper, a consistent pseudonym/keyed hash per SSN/EIN keeps the "same person across W-2, 1099 and prior year" check working while hiding the value; irreversible redaction would break those cross-checks. Pseudonyms must be format-valid-looking but *flagged* as synthetic, or they recreate the 666-xx trap.
- Structured fields (JSON value with a known field name) need no detection at all — redact by schema. Text inside documents (OCR text, notes) is where detectors are needed.

### Gaps
- Presidio anonymizer operator list and NIST SP 800-38G (FF1/FF3-1) status not fetched this pass.

## Cloud baselines (for comparison only)

### Takeaway
AWS Comprehend, Azure AI Language and Google DLP all cover SSN and bank fields with confidence scores but publish no per-entity precision/recall; Azure is the only one with an offline (disconnected) container, gated behind commercial approval.

### Cited Findings
- AWS Comprehend DetectPiiEntities types include SSN, BANK_ACCOUNT_NUMBER, BANK_ROUTING, CREDIT_DEBIT_NUMBER, PIN, PASSPORT_NUMBER, DRIVER_ID; each with a confidence score; input up to 100 KB; English or Spanish. No published precision/recall. — [AWS CLI detect-pii-entities](https://docs.aws.amazon.com/cli/latest/reference/comprehend/detect-pii-entities.html) (snippet)
- Azure AI Language PII is available as a container (`mcr.microsoft.com/azure-cognitive-services/textanalytics/pii`), including disconnected mode under commitment-tier pricing after approval; sync limit 5,120 chars/document, 10 documents/call. — [Azure disconnected containers](https://learn.microsoft.com/en-my/Azure/ai-services/containers/disconnected-containers); [Azure PII containers](https://docs.azure.cn/en-us/ai-services/language-service/personally-identifiable-information/how-to/use-containers) (snippets)

### Inferences
- Azure's disconnected container is the only "cloud vendor model run locally" option, but it is not realistic for a take-home (approval gate, commitment pricing).

### Gaps
- Google Sensitive Data Protection (DLP) infoTypes (US_SOCIAL_SECURITY_NUMBER, US_EMPLOYER_IDENTIFICATION_NUMBER, US_INDIVIDUAL_TAXPAYER_IDENTIFICATION_NUMBER, US_BANK_ROUTING_MICR, AMERICAN_BANKERS_CUSP_ID) — searched but not returned; not verified this pass.
- No independent cloud-vs-local benchmark on financial/tax documents found.
