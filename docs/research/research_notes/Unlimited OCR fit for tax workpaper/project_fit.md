# Unlimited-OCR (baidu) — fit for the tax workpaper take-home

Written 16 Oct 2026 ~04:00 UTC (`date -u` read 03:55 UTC in the same session). Local files read only; the
`case-study-project-package/` folder was not opened. Web pages fetched are treated as data.

**Model facts used throughout** (primary sources):
- MIT licence, 3B parameters (BF16 safetensors), custom `unlimited_ocr` model type loaded with `trust_remote_code`; runs on NVIDIA GPUs through Transformers, vLLM, SGLang or Docker; "Not deployed by any Hugging Face Inference Provider"; demo Space plus Baidu Cloud and ModelScope listings — [HF model card](https://huggingface.co/baidu/Unlimited-OCR)
- Announced 22 Jun 2026, paper arXiv:2606.23050 on 23 Jun, vLLM support 28 Jun, Baidu Cloud 3 Jul — [GitHub README](https://github.com/baidu/Unlimited-OCR)
- Inputs: single images, multi-page image sets, PDFs (rasterised at 300 dpi with PyMuPDF). Output is parsed markup with layout blocks tagged `<|det|>type [bbox]<|/det|>`; the bbox coordinate system is **not documented** on the card — [GitHub README](https://github.com/baidu/Unlimited-OCR); [HF model card](https://huggingface.co/baidu/Unlimited-OCR)
- Built on the DeepSeek-OCR vision stack; secondary sources disagree on MoE details (one says ~500M active) and on VRAM (8 GB vs ≥16 GB BF16) — [aiweekly](https://aiweekly.co/alerts/baidu-releases-mit-licensed-3b-ocr-model-for-long-documents); [localaimaster](https://localaimaster.com/models/unlimited-ocr). Treat VRAM as unverified.
- Benchmarks: the card cites a ParseBench leaderboard mean of 46.17 (Text Content 86.81, Text Formatting 0.97); secondary sources quote OmniDocBench 93.2–93.9 with conflicting versions — [HF model card](https://huggingface.co/baidu/Unlimited-OCR); [aiweekly FR](https://aiweekly.co/fr/alerts/baidu-publie-unlimited-ocr-sous-licence-mit-un-modle-moe-de-3-milliards-de)
- Its selling point is long-horizon parsing: the paper reports ~35% higher output tokens/s than DeepSeek-OCR at ~6,000 output tokens. No pages-per-second figure was found — [arXiv 2606.23050](https://arxiv.org/pdf/2606.23050) (via search summary)

## Which brief requirements could OCR genuinely help with?

### Takeaway
OCR helps with three real (but future) jobs: (a) a real-PDF adapter that maps OCR boxes onto the (document, page, field, box) anchor, (b) making user-attached evidence searchable and linkable, and (c) an independent second read of identity documents such as the SSN card. **None of the three is needed to meet the brief inside one day.** The brief says extraction is out of scope, and the anchor design already makes the adapter a renderer swap.

### Cited Findings
- The brief puts extraction outside scope: "You start where our extraction stops. One JSON packet holds 74 documents as records…" (docs/brief.txt line 61), and "Since source documents are not provided and you are not building a full extraction and tracing pipeline, create simulated source documents from the JSON data. Structure the document view and tracing links so real source documents could replace the simulated versions seamlessly" (lines 28–32) — local `docs/brief.txt`
- The brief asks to "Attach any file, message or note as evidence" (lines 20–21) — local `docs/brief.txt`
- Packet measured: 74 documents, 199 pages, 3,012 extracted values, **all with a page-relative position box (0–1)**; there are no page images — local `docs/discovery/01-evidence.md` §2, §5 item 9
- The project's proposed link anchor is *(document, page, field id, box)*: "The renderer, not the link, changes when a real PDF arrives, so links survive the swap" — local `docs/discovery/01-evidence.md` §5.9, §6
- **(a) Adapter compatibility.** AWS Textract returns each word's or field's `BoundingBox` as Left/Top/Width/Height ratios "between 0 and 1" of page width/height, plus a page number — the **same coordinate convention as the packet's synthetic boxes** — [AWS Textract docs](https://docs.aws.amazon.com/textract/latest/dg/text-location.html). Unlimited-OCR emits `[bbox]` in an undocumented coordinate system — [HF model card](https://huggingface.co/baidu/Unlimited-OCR). DeepSeek-OCR-family models are commonly reported to use a 0–999 normalised grid, but I found no primary source confirming that for Unlimited-OCR (see Gaps).
- **(b) Attachments.** tesseract.js runs in the browser and in Node, supports 100+ languages, Apache-2.0, but "does not support PDF files" (it points to Scribe.js for PDFs). Word/line-level output is available through `blocks`/hOCR, which v6 turns off by default — [tesseract.js README](https://github.com/naptha/tesseract.js)
- **(c) Independent second read.** The packet's identity mistakes are where a second read pays: GT-A05 (Theo's SSN transposed, …3309 on the return vs …3390 on the card D71; caused the July e-file rejection), GT-A07 (Little Sprouts tax ID misread at 0.97 confidence), GT-A08 (wrong provider name) — local `docs/ground-truth/README.md`. D71 is a *photo* of the SSN card, received after v3 — local `docs/discovery/01-evidence.md` §2
- **(d) Other.** Blank-to-zero misreads: 4 money values have empty read text yet value 0.0 (ev-0498/0516/0525 → GT-A01, biggest mistake; ev-0919 → GT-B03); a second reader that reports "nothing printed" vs "0" would catch this class on real scans — local `docs/discovery/01-evidence.md` §2. Unread pages: 64 of 199 pages have no extracted values, and D30/D31 page 32 was never read (GT-B04) — a page-level re-parse would show whether amounts are present — same file §2–3. Unlimited-OCR's long-document single pass (100-page PDFs) suits multi-page brokerage 1099-Bs such as D74 (266 values) — [besthub summary](https://www.besthub.dev/articles/unlimited-ocr-baidu-s-3b-parameter-open-source-ocr-that-handles-100-page-pdfs-in-one-pass-12ac76d9dd5a) (secondary)

### Inferences
- (a) The adapter is a *data-shape* problem, not a model problem: any OCR whose output can be normalised to (page, x0, y0, x1, y1) in 0–1 fits the anchor. Matching an OCR box to a packet field id needs a join (text match plus spatial overlap), which is the real work and is engine-agnostic. Textract's native 0–1 boxes make it the lowest-friction reference format to describe in the write-up.
- (b) Evidence attachments are the only place a user could bring a real image into this app during the demo. Searchable text plus "link this region to a line" is a plausible demo moment, but the brief only requires *attaching*, not reading.
- (c) An independent re-read matters most for identifiers (SSN, EIN, tax ID), where one transposed digit causes an e-file reject and confidence scores do not warn (GT-A07 was 0.97). It needs a real image (D71), which the packet does not contain.
- (d) The strongest product idea is the **read state** (read / nothing printed / unreadable) already proposed in the data model. OCR is one producer of that state; the state itself is what the app must carry.

### Gaps
- Unlimited-OCR's bbox coordinate system (pixel, 0–1, or 0–999) is undocumented on the card and README; it would need a test run to confirm.
- No primary accuracy figures for small, form-style US tax documents (W-2, 1099, SSN card). Its benchmarks are general document parsing.

## What OCR would NOT help with, and is OCR over our own simulated pages circular?

### Takeaway
With no page images in the packet, OCR cannot find or fix any of the 27 logged mistakes. Running OCR over pages the app renders from the packet's own text is circular: it reads back text we typed, so it can only test our renderer, never the pipeline.

### Cited Findings
- Every one of the 27 mistakes is "a wrong input, a missed document, or a rule applied too simply — the engine never flags any of the 27"; the engine's arithmetic is sound (148 of 221 formula lines recomputed, 0 mismatches) — local `docs/ground-truth/README.md`
- The mistakes were found by cross-checking printed content, versions, prior years and client answers (e.g. GT-A01: D11 p2 prints "adjusted basis 19,100.00" but v3 uses 19,240 without citing D11; GT-A03: D68 read correctly as "tax year 2024" yet included in 2025 estimates) — local `docs/ground-truth/README.md`
- Patterns: same money on two documents (B01, C01, C02, D01), evidence present but unused (A01, D02, B04), read right but applied wrong (A03, A02, B02), client-said vs document (A04, A06, B03, C04, D03), judgment calls (C05, C06, C07, D04, C08) — local `docs/ground-truth/README.md`
- The packet already carries the read text per value: 1,249 of 1,253 money values have read text matching the value — local `docs/discovery/01-evidence.md` §2

### Inferences
- Only one pattern (identity misreads A05/A07/A08, plus blank-to-zero A01/B03) is an OCR-class error at all; the other ~22 are reasoning, linkage or judgment errors that a better reader would reproduce.
- OCR over simulated pages: the rendered page is generated from `printed_content`; OCR would recover that same text with some noise. Any "disagreement" would be an OCR error or a rendering bug, never a packet mistake. It would also make the demo look like it "verified" values when it verified nothing — exactly the "green result that tested nothing" the user's measurement rules warn against. **Not meaningful; skip.**
- The one useful non-circular use with simulated data is an adapter **contract test**: feed a hand-made fixture of OCR-style output (0–1 boxes) for one simulated page and assert that existing links still resolve. That needs no model at all.

### Gaps
- None material.

## Deployment reality for a Vercel app

### Takeaway
Unlimited-OCR cannot run on Vercel Functions (no GPU; 2–4 GB memory; 4.5 MB request body). Running it means a separate GPU host (Modal is the quickest pay-per-second path; HF Inference Endpoints has no managed provider for it) or a hosted OCR API. In a one-day build, standing any of these up costs roughly 2–4 hours of work that does not advance a brief requirement. Browser-side tesseract.js is the only option that fits the existing deployment, and only for attached images.

### Cited Findings
- Vercel Functions: memory max 2 GB/1 vCPU (Hobby) or 4 GB/2 vCPU (Pro); duration max 300 s Hobby, 800 s Pro (1,800 s beta); bundle 250 MB (500 MB Python, 5 GB "large functions" beta); request/response body max 4.5 MB; billed on active CPU and memory. No GPU is mentioned anywhere on the limits page — [Vercel Functions limits](https://vercel.com/docs/functions/limitations) (page last updated 2026-08-24)
- Unlimited-OCR's documented paths all target NVIDIA CUDA (tested on CUDA 12.9, torch 2.10) — [GitHub README](https://github.com/baidu/Unlimited-OCR)
- Quantised GGUF variants run under llama.cpp, Ollama, LM Studio — [HF model card](https://huggingface.co/baidu/Unlimited-OCR); one community GGUF build reports about 6–10 s per page on unnamed hardware — [42ailab GGUF](https://huggingface.co/42ailab/Unlimited-OCR-GGUF) (via search summary; unverified)
- **Modal**: per-second GPU billing — T4 $0.000164/s (~$0.59/h), L4 $0.000222/s (~$0.80/h), A10 ~$1.10/h, L40S ~$1.95/h, A100-40GB ~$2.10/h, H100 ~$3.95/h; Starter plan includes $30/month free credits — [Modal pricing](https://modal.com/pricing)
- **Hugging Face Inference Endpoints** (dedicated, per-minute billing): T4 $0.50/h, L4 $0.80/h (AWS) or $0.70/h (GCP), A10G $1.00/h, L40S $1.80/h, A100 $2.50/h (AWS). Scaled-to-zero endpoints still count toward quota — [HF Endpoints pricing](https://huggingface.co/docs/inference-endpoints/pricing). The model is "not deployed by any Hugging Face Inference Provider", so there is no serverless pay-per-call route on HF — [HF model card](https://huggingface.co/baidu/Unlimited-OCR)
- **Hosted OCR API (AWS Textract)**: Detect Document Text $0.0015/page; Analyze Document Forms $0.05/page; Forms + Tables + Queries $0.07/page; free tier for new accounts is 1,000 pages/month (text) or 100 pages/month (forms) for three months — [Textract pricing](https://aws.amazon.com/textract/pricing/)
- **Browser-side**: tesseract.js runs in the browser, Apache-2.0, no PDF input; reuse one worker across images — [tesseract.js README](https://github.com/naptha/tesseract.js)
- No pages-per-second figure for Unlimited-OCR was found; for comparison, HunyuanOCR-1.5 on vLLM at batch size 1 measured 0.33 pages/s — [arXiv 2607.04884](https://arxiv.org/pdf/2607.04884) (via search summary)

### Inferences
- **Cost is trivial; time and risk are not.** 199 pages at an assumed ~5–10 s/page on an L4 is roughly 20–35 GPU-minutes ≈ $0.30–0.50 on Modal (inside free credits). The packet has no images to send, though, so batch cost is moot; for demo attachments, cost per page is fractions of a cent.
- **Latency**: a scaled-to-zero GPU container must load ~6–7 GB of BF16 weights on a cold start (3.3B params × 2 bytes), likely tens of seconds before the first page. That is acceptable for a background job, poor for a live demo click. A warm endpoint costs ~$0.50–0.80/h while idle.
- **Time inside the one-day build** (estimate): a Modal wrapper plus a Vercel route, upload handling (the 4.5 MB body limit means direct-to-storage upload), output parsing of the `<|det|>` markup, bbox normalisation and failure handling come to about 2–4 h, with real risk from `trust_remote_code`, CUDA-version pinning and a model only ~4 months old. tesseract.js in the browser is ~1 h for "make an attached image searchable" but gives plain word boxes, not layout parsing.
- Textract is the cheapest *integration* path because its 0–1 boxes drop straight onto the anchor, but it sends tax data to AWS (see next section).

### Gaps
- Real cold-start time and per-page latency for Unlimited-OCR on Modal/HF were not found; the figures above are estimates.
- Whether Vercel offers any GPU compute product as of Oct 2026 beyond Functions/Sandbox was not checked beyond the Functions limits page, which lists none.

## Data protection: sending tax documents (SSNs) to an OCR service

### Takeaway
Sending a client's tax documents to a third-party OCR service is a §7216 disclosure. It is permitted for U.S.-located contractors with written notice, but it needs taxpayer consent if the recipient is outside the U.S. (for example Baidu Cloud, or an unknown-region HF Space). Under the FTC Safeguards Rule the service provider must be contractually bound and assessed, and data must be encrypted. Self-hosted open weights (MIT) on a U.S. GPU you control is the cleanest option. For this take-home the data is invented, so the point belongs in the write-up, not the build.

### Cited Findings
- "The term disclosure means the act of making tax return information known to any person in any manner whatever"; "tax return preparer" includes auxiliary service providers such as "a person who develops software that is used to prepare or file a tax return" — [26 CFR 301.7216-1](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- §301.7216-2(d)(2): a preparer may disclose to a contractor "in connection with the programming, maintenance, repair, testing, or procurement of equipment or software", "only to the extent necessary", with written notice to recipients of the penalty provisions; (d)(1) preparer-to-preparer disclosure requires the recipient to be "located in the United States"; (c)(2): if the recipient is outside the U.S., "the taxpayer's consent under § 301.7216-3 prior to any disclosure is required" — [26 CFR 301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2)
- FTC Safeguards Rule: §314.4(f) requires "your service providers by contract to implement and maintain such safeguards" and "periodically assessing your service providers based on the risk they present"; §314.4(c)(3) "Protect by encryption all customer information held or transmitted by you" — [16 CFR 314.4](https://www.law.cornell.edu/cfr/text/16/314.4)
- The packet itself carries a §7216 consent document (D02) and a firm rule requiring every view of an SSN, bank account or ID image to be logged (`starter_standards` rule 6) — local `docs/discovery/01-evidence.md` §3–4
- Unlimited-OCR is MIT-licensed open weights (self-hostable); hosted options listed are an HF Space demo, Baidu Cloud and ModelScope — [HF model card](https://huggingface.co/baidu/Unlimited-OCR); [GitHub README](https://github.com/baidu/Unlimited-OCR)

### Inferences
- Ranking for real client data: (1) browser-side tesseract.js, where the image never leaves the user's machine and there is no disclosure at all; (2) self-hosted weights on a U.S.-region GPU (Modal/HF Endpoints in a U.S. region) under a contract — still a contractor disclosure, needing written notice and a Safeguards-compliant agreement; (3) a U.S. hosted API (Textract) under the same contractor terms; (4) public demo Spaces or Baidu Cloud/ModelScope — avoid, because the region and retention are unclear and an offshore recipient needs per-taxpayer consent.
- An OCR call is a "view" of an SSN image. Under the packet's firm rule 6 it should be written to the same access log as a human reveal.
- I am not a lawyer; these are readings of the regulation text, not legal advice.

### Gaps
- §301.7216-3 consent formalities (Rev. Proc. 2013-14) were not fetched.
- Data-retention and region terms for Modal, HF Endpoints and Baidu Cloud were not checked.

## Recommendation framing: do now / describe only / skip

### Takeaway
**Skip building OCR; describe it in the write-up as the future adapter.** The single exception worth considering only if the core is done early is browser-side tesseract.js on attached evidence images. Do not use Unlimited-OCR in this build.

### Cited Findings
- Deadline is Fri 16 Oct 2026, 21:00 EDT; "every choice favours a working, deployed core over breadth"; "Sending sooner is better" — local project `CLAUDE.md`
- The brief explicitly says the build is not a full extraction pipeline, and asks only that real documents *could* replace simulated ones — local `docs/brief.txt` lines 28–32
- No page images exist in the packet — local `docs/discovery/01-evidence.md`

### Inferences
- **Do now (in the data model, zero OCR):** keep the anchor as (document, page, field id, box in 0–1 page coordinates) plus a `read_state` (read / nothing printed / unreadable) and a `reader` (pipeline / human / second-reader). Add one fixture-based contract test showing that an OCR-shaped box list for one page resolves to the same links. That proves "seamless replacement" without a model.
- **Describe only (write-up, one paragraph):** "Real-PDF adapter: any OCR emitting page-relative boxes (Textract natively; Unlimited-OCR after normalising its `[bbox]`) is joined to field ids by text plus overlap; only the renderer changes. An independent second read is reserved for identifiers (SSN, EIN, tax IDs). GT-A05 and GT-A07 show that confidence does not catch transpositions. Self-hosted in a U.S. region for §7216/Safeguards." Unlimited-OCR's long-PDF single pass is a fit for 100+-page broker statements, which is worth one sentence.
- **Optional stretch (only after the deployed core and all 27 mistakes surface):** tesseract.js in the browser to make an attached image's text searchable and let a user drag a box to link it to a line. About 1 h, no new infrastructure, and no disclosure.
- **Skip:** Unlimited-OCR on Modal/HF for this build (2–4 h, a new CUDA dependency, a cold-start-prone demo, and nothing to read); OCR over simulated pages (circular); any public demo endpoint for tax data.
- Alternatives in one line each: Textract is the best hosted fit for the adapter story, but it adds an AWS account, a disclosure and no demo value without real scans. A Modal-hosted Unlimited-OCR is the right self-hosted choice for a real product with long broker PDFs, not for a one-day take-home.

### Gaps
- Whether the founder values a visible "AI reads documents" moment in the video more than core completeness is a judgement for Aarvin, not something research can settle.
