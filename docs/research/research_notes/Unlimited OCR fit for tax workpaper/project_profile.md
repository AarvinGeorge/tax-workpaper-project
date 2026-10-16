# Unlimited-OCR (baidu/Unlimited-OCR) — project profile

All live metrics below were read on **Fri 16 Oct 2026, 03:55–03:57 UTC** (Thu 15 Oct, 23:55 EDT) via the GitHub REST API (`gh api`) and the Hugging Face API, unless another date is given. The `date -u` output was captured in the same command as each query.

## 1. Does the repo exist, and what is it?

### Takeaway
Yes. `github.com/baidu/Unlimited-OCR` exists, belongs to Baidu's official GitHub organisation, and is what its name says: an end-to-end document-OCR vision-language model ("Unlimited OCR Works"). It is a continued-training derivative of DeepSeek-OCR. Its one new idea is an attention change that lets it transcribe many pages in a single pass. The GitHub repo is mostly a README, one batch script and a bundled SGLang wheel. The model code and weights are on Hugging Face.

### Cited Findings
- Repo `baidu/Unlimited-OCR`, owner `baidu` (organisation id 13245940), description "Unlimited OCR Works: Welcome the Era of One-shot Long-horizon Parsing.", not a fork, not archived, language Python — [GitHub API](https://api.github.com/repos/baidu/Unlimited-OCR)
- Repo contents (whole tree): `README.md`, `LICENSE`, `CONTRIBUTING.md`, `infer.py` (11 KB batch client), `Unlimited-OCR.pdf` (the paper), `assets/` (images plus an 82 MB demo GIF), and `wheel/sglang-0.0.0.dev11416+g92e8bb79e-py3-none-any.whl` (12.4 MB custom SGLang build). There is no training code — [GitHub tree](https://github.com/baidu/Unlimited-OCR)
- The model code (`modeling_unlimitedocr.py`, `deepencoder.py`, `modeling_deepseekv2.py`) and the weights live on Hugging Face as `baidu/Unlimited-OCR` — [HF model](https://huggingface.co/baidu/Unlimited-OCR)
- README release log: 2026-06-22 launch ("aiming to push Deepseek-OCR one step further"); 2026-06-23 ModelScope mirror (`PaddlePaddle/Unlimited-OCR`) and arXiv paper; 2026-06-24 HF Spaces demo; 2026-06-28 vLLM support; 2026-07-03 Baidu Cloud API; 2026-07-21 ms-swift fine-tuning support — [README](https://github.com/baidu/Unlimited-OCR)
- Paper: "Unlimited OCR Works", arXiv 2606.23050, v1 published 2026-06-22, Baidu Inc., 17 authors — [arXiv](https://arxiv.org/abs/2606.23050)
- Community ports exist under similar names: `Dicklesworthstone/franken_ocr` (Rust CPU engine, 335 stars), `AIwork4me/Unlimited-OCR-ROCm` (AMD), `Konsn666/unlimited-ocr-mac` (Apple Silicon), `say4n/unlimited-ocr-container`, `RustedBytes/unlimited-ocr-server` — [GitHub search](https://github.com/search?q=Unlimited-OCR&type=repositories)

### Inferences
- The name does not describe a general "unlimited" OCR service. "Unlimited" means long-horizon: dozens of pages in one forward pass, within a 32K context.
- The GitHub repo is a thin wrapper. Judge maturity mainly by the Hugging Face model code and the vLLM/SGLang integrations, not by the GitHub code.

### Gaps
- None on existence or identity.

## 2. What it does: capabilities, architecture, size, output formats

### Takeaway
A 3.3B-parameter Mixture-of-Experts VLM (about 0.5B parameters active per token). Architecture: DeepSeek-OCR's DeepEncoder (SAM-ViT + CLIP-ViT, 16x token compression) plus a 12-layer MoE decoder in which every attention layer is replaced by "Reference Sliding Window Attention" (R-SWA). It does page parsing: text, titles, tables (as HTML), formulas, reading order and layout blocks. It outputs Markdown-like text with inline block-level layout tags and bounding boxes. It does **not** do semantic key-value or form-field extraction.

### Cited Findings
- Architecture: "DeepEncoder paired with a Mixture-of-Experts (MoE) architecture that enjoys 3B total and 500M activated parameters". Figure 2 labels the decoder "3B-MOE-A570M". All decoder attention is replaced by R-SWA, which attends to all visual/prompt tokens plus only the previous 128 output tokens, so the KV cache stays constant — [paper, §3.2 and Fig. 1–2](https://arxiv.org/abs/2606.23050)
- Hugging Face safetensors metadata: 3,336,106,240 BF16 parameters. Weight file `model.safetensors` is 6,672,547,120 bytes (about 6.67 GB) — [HF API](https://huggingface.co/api/models/baidu/Unlimited-OCR)
- `config.json`: decoder has 12 layers, hidden size 1280, 64 routed experts plus 2 shared experts, 6 experts per token, `sliding_window_size: 128`, `max_position_embeddings: 32768`. Vision stack is `sam_vit_b` + `clip-l-14-224` — [config.json](https://huggingface.co/baidu/Unlimited-OCR/blob/main/config.json)
- Training: continued from the DeepSeek-OCR checkpoint for 4,000 steps on about 2M document samples (9:1 single-page to multi-page) on 8×16 A800 GPUs, encoder frozen. Single-page labels were produced by PaddleOCR, with block coordinates "normalized to the range of 0–1000" — [paper, §4](https://arxiv.org/abs/2606.23050)
- Two resolution modes: "Base" (1024×1024, 256 visual tokens per page, the only mode for multi-page/PDF) and "Gundam" (dynamic crop, single image only) — [paper, §3.3](https://arxiv.org/abs/2606.23050); [README](https://github.com/baidu/Unlimited-OCR)
- Output format: generated text with block tags `<|det|>label [x1,y1,x2,y2]<|/det|>` followed by that block's content. The README ships a regex to strip them for benchmarking — [README](https://github.com/baidu/Unlimited-OCR); confirmed by an independent evaluator in [issue #66](https://github.com/baidu/Unlimited-OCR/issues/66) (2026-08-01)
- Block labels, as stated by maintainer MurphyYin: `text, title, header, footer, page_number, page_footnote, ref_text, aside_text, image, image_caption, image_footnote, chart, table, equation, algorithm` — [issue #51](https://github.com/baidu/Unlimited-OCR/issues/51) (2026-06-30)
- Tables come out as HTML `<table><tr><td>…` inside the Markdown — [issue #16 sample output](https://github.com/baidu/Unlimited-OCR/issues/16)
- Languages: maintainer says "We currently mainly support Chinese and English" — [issue #25](https://github.com/baidu/Unlimited-OCR/issues/25) (2026-06-25)

### Inferences
- For a US tax workpaper, the model reads a page into text plus layout blocks. Mapping "Box 1 wages = 85,000" to a field would still need a separate step (rules or an LLM) on top of its output.
- A third-party Mac port describes it as a "6.7B VLM". That looks like confusion with the 6.7 GB file size; the parameter count is 3.3B.

### Gaps
- No official JSON output from the open model. The JSON in the hosted Baidu Cloud API is a different product surface (see §5).
- A Baidu Baike (wiki) entry surfaced in search reportedly says "30B total / 5B active". This contradicts the paper and the HF metadata, and I did not rely on it.

## 3. Licence, dates, popularity, maintenance

### Takeaway
MIT for both code and weights. Very popular: 27.5k stars in about 4 months, 1.16M Hugging Face downloads. Thinly maintained, though: 2 contributors, 14 commits (all after the first are README edits), no tagged releases, no merged community PRs, and most issues unanswered after early July 2026.

### Cited Findings
- Licence: GitHub `LICENSE` is MIT, "Copyright (c) 2026 Baidu" — [LICENSE](https://github.com/baidu/Unlimited-OCR/blob/main/LICENSE). Hugging Face model card `license: mit`, and the HF repo ships its own LICENSE file — [HF card](https://huggingface.co/baidu/Unlimited-OCR). The paper is CC BY 4.0 — [arXiv](https://arxiv.org/abs/2606.23050)
- Note: the derived file `modeling_deepseekv2.py` carries an Apache-2.0 header, and the model is trained from the DeepSeek-OCR checkpoint — [HF file](https://huggingface.co/baidu/Unlimited-OCR/blob/main/modeling_deepseekv2.py)
- GitHub repo created 2026-06-18. First commit ("Initial commit") 2026-06-22. Latest commit 2026-10-12 ("Update README"). pushed_at 2026-10-12T10:37Z — [GitHub API](https://api.github.com/repos/baidu/Unlimited-OCR/commits)
- 14 commits in total; 13 of 14 are titled "Update README" or "Update README.md" — [commits](https://github.com/baidu/Unlimited-OCR/commits/main)
- No GitHub releases and no tags — [releases](https://github.com/baidu/Unlimited-OCR/releases)
- Stars 27,512; forks 2,884; contributors 2 (MurphyYin 13 commits, liufanfanlff 1) — [GitHub API](https://api.github.com/repos/baidu/Unlimited-OCR/contributors)
- Issues: 57 open and 10 closed; 37 PRs in total; `open_issues_count` (issues + PRs) 86 — [GitHub search API](https://github.com/baidu/Unlimited-OCR/issues)
- Hugging Face: created 2026-06-19, lastModified 2026-10-14, 1,163,009 downloads, 4,707 likes — [HF API](https://huggingface.co/api/models/baidu/Unlimited-OCR)
- Maintainer said on 2026-06-25 that an official Docker image is coming "as soon as possible". As of the read date the repo has no Dockerfile — [issue #27](https://github.com/baidu/Unlimited-OCR/issues/27)
- More than 20 community quantised or converted variants exist on HF (AWQ, GGUF, MLX, ONNX). The most downloaded is `sahilchachra/Unlimited-OCR-AWQ` (about 1.09M downloads) — [HF search](https://huggingface.co/models?search=Unlimited-OCR)

### Inferences
- Treat it as a research release with strong community uptake, not a maintained product. Expect to own fixes yourself; the open PRs show that infer.py bugs and the looping problem remain unaddressed upstream.

### Gaps
- No public roadmap or release cadence. A promised multilingual model, fine-tuning support and 128K context are not released.

## 4. Accuracy and benchmarks, and known weaknesses

### Takeaway
Baidu reports end-to-end state of the art among the VLMs it compared: 93.23 on OmniDocBench v1.5 and 93.92 on v1.6. The OmniDocBench maintainers' own leaderboard, updated 2026-09-11, lists 94.00 on v1.6_full, ranked behind PaddleOCR-VL-1.6, MinerU2.5-Pro, GLM-OCR and PaddleOCR-VL. One independent evaluator could not reproduce the text edit-distance figure: they measured 0.087 against an implied 0.042 (overall 92.45). The issues report handwriting, scanned tables in multi-page mode, rotated text, non-Latin scripts, repetition loops and bounding-box drift as known weaknesses.

### Cited Findings
- Baidu, paper Table 1, OmniDocBench v1.5: Overall 93.23, Text Edit 0.038, Formula CDM 92.61, Table TEDS 90.93, TEDS-S 94.07, Read-order Edit 0.045. DeepSeek-OCR baseline scored 87.01. Baseline numbers are taken "from the OmniDocBench repository"; the Unlimited-OCR numbers were run by Baidu — [paper](https://arxiv.org/abs/2606.23050)
- Baidu, paper Table 1, OmniDocBench v1.6: Overall 93.92, Text Edit 0.042, CDM 95.79, TEDS 90.16, TEDS-S 93.32, Read-order 0.129. That is marginally above Qianfan-OCR (93.90) and Logics-Parsing-v2 (93.33) — [paper](https://arxiv.org/abs/2606.23050)
- Baidu, in-house long-document set (≥10 books per bucket): edit distance 0.036 at 2 pages, 0.057 at 20 pages, 0.107 at 40+ pages. Baidu attributes the 40+-page errors to small text under the 1024×1024 Base mode — [paper, Table 3, §5.4](https://arxiv.org/abs/2606.23050)
- OmniDocBench maintainers (opendatalab) added Unlimited-OCR on 2026-09-11 to their "v1.6_full" end-to-end leaderboard: Overall 94.00, Text Edit 0.0394, CDM 95.72, TEDS 90.21, TEDS-S 93.36, Read Order 0.1281. Ranked above it: PaddleOCR-VL-1.6 96.34, MinerU2.5-Pro 95.75, GLM-OCR 95.22, PaddleOCR-VL-1.5 94.93, PaddleOCR-VL 94.18 — [OmniDocBench README](https://github.com/opendatalab/OmniDocBench)
- Independent reproduction by AIwork4me, using the official HF `model.infer` and the official OmniDocBench v1.6 scorer: Overall 92.45, Text Edit 0.087, CDM and TEDS matching the reported values. Even after re-scoring Baidu's own shared prediction files with the masking Baidu specified, they got Text Edit 0.085, not about 0.042. Still unresolved in the thread as of 2026-08-01 — [issue #66](https://github.com/baidu/Unlimited-OCR/issues/66)
- An independent Devanagari stress-test paper found DeepSeek-OCR ahead of Unlimited-OCR on clean Devanagari (chrF++ 93.84 vs 91.04). This is from a search-result summary; I did not read the paper's table myself — [arXiv 2606.29213](https://arxiv.org/pdf/2606.29213)
- No OCRBench or olmOCR-Bench result found. AIreiter (updated 2026-07-28) states there is no olmOCR-Bench entry — [AIreiter review](https://aireiter.com/blog/unlimited-ocr-baidu-api-review)
- Handwriting: a user shows several character substitutions on handwritten Chinese, and another user found dots.ocr more accurate on the same sample — [issue #45](https://github.com/baidu/Unlimited-OCR/issues/45) (2026-06-27 to 07-02)
- Scanned tables: complex tables in a scanned PDF degrade in multi-page (Base) mode but parse acceptably as single images (Gundam mode) — [issue #16](https://github.com/baidu/Unlimited-OCR/issues/16)
- Repetition loops: on 0.2–1.2% of pages (newspapers, Chinese government documents, dense formulas) the output repeats until `max_length`. The cause is that `no_repeat_ngram_size=35` misses repeating units shorter than 35 tokens. Setting ngram=5 globally dropped the evaluator's Overall from 91.97 to 64.56 — [issue #55](https://github.com/baidu/Unlimited-OCR/issues/55); also reported under llama.cpp in [#82](https://github.com/baidu/Unlimited-OCR/issues/82) and vLLM in [#84](https://github.com/baidu/Unlimited-OCR/issues/84)
- Other open accuracy issues: rotated text drops lines and invents a spurious one ([#79](https://github.com/baidu/Unlimited-OCR/issues/79)); Hebrew hallucinated token ([#90](https://github.com/baidu/Unlimited-OCR/issues/90)); bounding boxes missing or overflowing on unconventional layouts ([#33](https://github.com/baidu/Unlimited-OCR/issues/33))
- Against Tesseract on a T4 GPU (3 single-page image PDFs, one evaluator, 2026-09-28): equal or better character accuracy (hard scan 99.54% vs 79.36%), but 8–19× slower per page (14.6–30.9 s vs 0.8–1.8 s) — [issue #100](https://github.com/baidu/Unlimited-OCR/issues/100)

### Inferences
- For clean typed English forms such as W-2s, 1099s and brokerage statements, the accuracy class is strong. The independent numbers, however, put it roughly at parity with or behind smaller PaddleOCR-VL / GLM-OCR / MinerU models, not clearly ahead.
- A generative OCR that loops or hallucinates matters for a tax workpaper: a confidently wrong digit is exactly the failure the case study is about. Any figure it produces needs a cross-check against an independent source.

### Gaps
- I could not confirm whether the OmniDocBench maintainers ran the model themselves or ingested Baidu-supplied predictions.
- No published per-language (English vs Chinese) breakdown, and no benchmark on US tax forms or receipts.

## 5. Hardware and runtime: GPU, VRAM, CPU, serverless, browser, hosted API

### Takeaway
The official paths (Transformers, vLLM, SGLang) all need an NVIDIA CUDA GPU. 8 GB VRAM is the stated BF16 floor, and about 12 GB was observed in real use. CPU works only after patching hardcoded `.cuda()` calls, at about 550 s per dense page. Running on Vercel Functions is not realistic (6.7 GB of weights, a GPU dependency, minutes per page on CPU). Browser runs exist only as unverified community experiments. Baidu Cloud offers a hosted asynchronous API that returns coordinates; it was in a "limited-time free" phase with no published price on the page I read.

### Cited Findings
- README: Transformers inference "on NVIDIA GPUs", tested on Python 3.12.3 + CUDA 12.9, torch 2.10.0, transformers 4.57.1. The code calls `.cuda()` — [README](https://github.com/baidu/Unlimited-OCR)
- vLLM recipe: "a single GPU with >=8 GB VRAM is enough for BF16 inference". Requires a dedicated Docker image `vllm/vllm-openai:unlimited-ocr` and a custom n-gram logits processor — [vLLM recipe](https://recipes.vllm.ai/baidu/Unlimited-OCR)
- The SGLang path needs the custom wheel bundled in the repo, not the PyPI `sglang`. Users reported setup failures — [issue #27](https://github.com/baidu/Unlimited-OCR/issues/27), [#12](https://github.com/baidu/Unlimited-OCR/issues/12)
- Observed VRAM: about 12 GB on a 16 GB RTX 4070 Ti Super under SGLang (one practitioner, reported by AIreiter on 2026-07-28). A full 32K prefill adds about 1.9 GiB of KV cache (AIreiter's own calculation) — [AIreiter](https://aireiter.com/blog/unlimited-ocr-baidu-api-review)
- CPU: `modeling_unlimitedocr.py` has about 17 hardcoded `.cuda()` calls. After patching, CPU inference on an M1 Pro produced correct output in "~550s for a single dense page (~1 token/s decode)". MPS (Apple GPU) crashes or degrades — [issue #81](https://github.com/baidu/Unlimited-OCR/issues/81) (2026-07-23), [#18](https://github.com/baidu/Unlimited-OCR/issues/18), [#53](https://github.com/baidu/Unlimited-OCR/issues/53)
- T4 GPU: 14.6–30.9 s per page in single/crop mode — [issue #100](https://github.com/baidu/Unlimited-OCR/issues/100)
- Throughput claim (Baidu, high concurrency): 5,580 tokens/s at 512 concurrency on OmniDocBench vs DeepSeek-OCR's 4,951 — [paper §5.2](https://arxiv.org/abs/2606.23050)
- Community runtimes: a Rust CPU-only engine (`franken_ocr`, last push 2026-10-14); AMD ROCm port claiming 16 GB VRAM; Mac/MLX conversions; GGUF files for llama.cpp — [GitHub search](https://github.com/search?q=Unlimited-OCR&type=repositories), [HF search](https://huggingface.co/models?search=Unlimited-OCR)
- Browser: an ONNX export of the DeepEncoder claims under 3 s per page on Apple Metal-3 via onnxruntime-web WebGPU, with a custom WGSL decoder. Third-party and unverified; 0 downloads recorded — [HF naklitechie/Unlimited-OCR-DeepEncoder-ONNX](https://huggingface.co/naklitechie/Unlimited-OCR-DeepEncoder-ONNX)
- Hugging Face Inference Providers: none mapped (`inferenceProviderMapping: {}`) — [HF API](https://huggingface.co/api/models/baidu/Unlimited-OCR?expand[]=inferenceProviderMapping). A free HF Spaces demo exists — [HF Space](https://huggingface.co/spaces/baidu/Unlimited-OCR)
- Baidu Cloud hosted API "文档解析（Unlimited-OCR）": asynchronous submit/query at `aip.baidubce.com/rest/2.0/brain/online/v2/unlimited-ocr-parser/task`, with API Key/Secret auth. Rate limits: QPS 2 for submit, 5 for query. Inputs: images ≤10 MB, PDFs ≤500 pages. Outputs: Markdown and JSON, with JSON marked "后续支持" ("supported later") in the sample. Pricing: described as "限时免费" (limited-time free), with 200 free pages for verified individuals and 1,000 for enterprises; no per-page price on this page. Result links expire after 30 days — [Baidu Cloud doc](https://cloud.baidu.com/doc/OCR/s/fmr1p39gb)
- Conflict: AIreiter (2026-07-28) says "No official API exists". The README (2026-07-03) and the Baidu Cloud doc above show one. AIreiter appears to mean no Western or HF inference provider — [AIreiter](https://aireiter.com/blog/unlimited-ocr-baidu-api-review)

### Inferences
- For a one-day Vercel-hosted take-home, running this model inside the app is impractical. The realistic options are: (a) pre-compute OCR offline on a rented GPU and ship the results as data, or (b) call the Baidu Cloud API, which sends client tax documents to a server in China (see §7).

### Gaps
- Baidu Cloud per-page price after the free period is not published on the page I read, and I did not fetch the separate pricing page.
- No first-party CPU, WASM or WebGPU support.

## 6. Coordinates for highlight overlays

### Takeaway
Yes, but only at block level. The open model emits one box per layout block (a paragraph, table or title), as `[x1,y1,x2,y2]` normalised to 0–999 of the page image. It does not emit word or field boxes. The hosted Baidu Cloud API adds line-level ("span") boxes when `return_span_boxes=True`. Users have reported missing or ill-fitting boxes.

### Cited Findings
- Output tags have the form `<|det|>label [x1,y1,x2,y2]<|/det|>content` — [README regex](https://github.com/baidu/Unlimited-OCR); [issue #66](https://github.com/baidu/Unlimited-OCR/issues/66)
- The HF model code scales boxes with `x1 / 999 * image_width` (and the same for y) and draws them in `draw_bounding_boxes()` — [modeling_unlimitedocr.py](https://huggingface.co/baidu/Unlimited-OCR/blob/main/modeling_unlimitedocr.py)
- Training labels were PaddleOCR block coordinates "normalized to the range of 0–1000" — [paper §4.1](https://arxiv.org/abs/2606.23050)
- Bounding boxes are "missing, or the text scope actually exceeds/overflows the bounding box" on some layouts — [issue #33](https://github.com/baidu/Unlimited-OCR/issues/33). A commenter in that thread claimed the model emits no boxes at all. That claim is contradicted by the model code and the maintainer's label list ([#51](https://github.com/baidu/Unlimited-OCR/issues/51)).
- In multi-page mode, page boundaries are not emitted (per AIreiter), so mapping boxes back to their page needs care — [AIreiter](https://aireiter.com/blog/unlimited-ocr-baidu-api-review)
- Baidu Cloud API: layout elements return `position` [x, y, w, h] and `polygon`; line-level coordinates when `return_span_boxes` is True — [Baidu Cloud doc](https://cloud.baidu.com/doc/OCR/s/fmr1p39gb)

### Inferences
- Block boxes can highlight the region that contains a value (for example the W-2 Box 1 cell, if it is parsed as its own block), but not the exact number. For a digital PDF with a text layer, word coordinates from PyMuPDF or pdf.js would be more precise and deterministic than any VLM box.

### Gaps
- No measured box-accuracy metric (for example IoU) has been published for this model.

## 7. Security and supply chain

### Takeaway
Self-hosting needs `trust_remote_code=True`, which executes Python downloaded from Hugging Face. That code calls `eval()` on strings the model generates. The SGLang path installs a 12 MB pre-built wheel from the repo. I found no telemetry in the files I inspected. The hosted Baidu Cloud API sends documents to Baidu, and the page states no data region or retention policy.

### Cited Findings
- Weights are hosted on Hugging Face (served via HF's Xet/AWS CDN), with a ModelScope mirror at `PaddlePaddle/Unlimited-OCR` — [HF](https://huggingface.co/baidu/Unlimited-OCR); [README](https://github.com/baidu/Unlimited-OCR)
- Weights are in safetensors format (no pickle). The HF repo contains both `model.safetensors` and `model-00001-of-000001.safetensors`, each 6,672,547,120 bytes — [HF API](https://huggingface.co/api/models/baidu/Unlimited-OCR)
- Loading requires `trust_remote_code=True` (README example). `extract_coordinates_and_label()` runs `cor_list = eval(ref_text[2])` on the box string the model generated — [modeling_unlimitedocr.py](https://huggingface.co/baidu/Unlimited-OCR/blob/main/modeling_unlimitedocr.py) (my inspection on 2026-10-16)
- `modeling_unlimitedocr.py` imports `requests`, but a grep shows no `requests.` call. `infer.py` makes HTTP calls only to `http://127.0.0.1:10000` (the local SGLang server). I found no telemetry or analytics calls in `modeling_unlimitedocr.py`, `deepencoder.py`, `modeling_deepseekv2.py`, `conversation.py` or `infer.py` (my inspection) — [GitHub](https://github.com/baidu/Unlimited-OCR/blob/main/infer.py)
- The SGLang path installs `wheel/sglang-0.0.0.dev11416+g92e8bb79e-py3-none-any.whl`, a pre-built development wheel committed to the repo, plus `kernels==0.11.7`. Note that the README text says "pin kernels==0.9.0" but the command installs 0.11.7 — [README](https://github.com/baidu/Unlimited-OCR)
- Baidu Cloud API: no data region or retention statement on the page; result URLs are valid for 30 days — [Baidu Cloud doc](https://cloud.baidu.com/doc/OCR/s/fmr1p39gb)

### Inferences
- `eval()` on model output is a code-injection risk if an adversarial document can steer the generated box string. In practice the regex requires a `[...]` body, but it is still poor hygiene; pin a reviewed HF revision rather than tracking `main`.
- For real taxpayer data (SSNs, income), sending documents to the Baidu Cloud API would be hard to justify without a data-processing agreement. Self-hosting keeps the data local.

### Gaps
- I did not audit the bundled SGLang wheel's contents or the full HF remote code line by line; the absence of telemetry is based on grep, not a full audit.
- I found no SBOM, signed releases or security policy (`SECURITY.md`) in the repo.
