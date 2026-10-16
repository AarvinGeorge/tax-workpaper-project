# OCR and document-extraction alternatives to baidu/Unlimited-OCR for US tax documents, and how the tax industry extracts (as of Oct 2026)

Research run 15 Oct 2026. 24 web searches and fetches. Fetched pages are treated as data. Every metric carries the date of its source. Several vendor claims are marketing and are labelled that way.

## Q0. What Unlimited-OCR is (baseline for comparison)

### Takeaway
Unlimited-OCR is an MIT-licensed vision-language model released 22–23 Jun 2026. It has 3B total parameters with about 500M active, and it is built for transcribing long, multi-page documents in a single pass. It returns block categories with bounding boxes, but it does not return per-field or per-token confidence and has no tax-form schema.

### Cited Findings
- The repo describes "one-shot long-horizon parsing of single images and multi-page PDFs". It supports Transformers, vLLM and SGLang backends. Code and weights are MIT-licensed. The project was presented on 2026-06-22, with arXiv 2606.23050 posted 2026-06-23. The latest update (2026-07-21) adds ms-swift training. — [GitHub baidu/Unlimited-OCR](https://github.com/baidu/Unlimited-OCR)
- Raw output contains `<|det|>type [bbox]<|/det|>` markers: a block category plus box coordinates, then the block's content. The coordinate format is not documented on the README. — [GitHub baidu/Unlimited-OCR](https://github.com/baidu/Unlimited-OCR)
- Hardware: tested on Python 3.12.3 + CUDA 12.9, with a vLLM Docker image for CUDA 13.0 and a separate Hopper/CUDA 12.9 image. No VRAM figure is given. PDFs are rendered at 300 DPI. Multi-page input uses only "base" mode (image_size 1024). `max_length` is 32,768. It needs no-repeat n-gram settings to control repetition. — [GitHub baidu/Unlimited-OCR](https://github.com/baidu/Unlimited-OCR)
- It has 3B total and 500M active parameters. It is built on DeepSeek-OCR (Oct 2025) and uses Reference Sliding Window Attention (R-SWA), which keeps the KV cache roughly constant. It claims end-to-end SOTA on OmniDocBench v1.5 and v1.6, but no numbers appear in that coverage. It handles "several tens of pages" per inference. — [Gigazine, 24 Jun 2026](https://gigazine.net/gsc_news/en/20260624-baidu-unlimited-ocr/)
- Star counts: 4,663 (24 Jun 2026) and 14,259 (15 Jul 2026), per secondary coverage. — [search summary of secondary articles incl. pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/6063/unlimited-ocr-baidu-long-pdfs)

### Inferences
- Its strength is transcribing long documents, such as a 40-page consolidated 1099 in one pass. Its weaknesses for a tax workpaper are no key-value schema (W-2 Box 1 and so on), no confidence scores and undocumented box coordinates. It would need a field-mapping layer and an independent validation layer on top.
- It is a generative VLM, so the hallucination risk in Q4 applies directly.

### Gaps
- I could not retrieve OmniDocBench scores for Unlimited-OCR (the fetch of the paper and article failed or did not include numbers).
- VRAM needs and throughput (pages per second) are not published on the README.

## Q1. How tax products extract source documents today, and whether they anchor by bounding box for click-to-source

### Takeaway
The incumbents (SurePrep/Thomson Reuters, CCH AutoFlow, Intuit Tax Import, GruntWorx) all use the same pattern. They classify and bookmark documents, extract fields with OCR and ML into fixed form templates, and send low-confidence or failed-rule pages to a human verification queue. Values are shown highlighted on the source PDF. Native PDFs are verified against their own text layer. Newer AI-native entrants (Black Ore, Filed) market "every data point linked back to the source document". No vendor publicly documents its anchor format, but highlighted fields on a page imply page-plus-box coordinates.

### Cited Findings
**SurePrep 1040SCAN (Thomson Reuters)**
- The tiers separate organising from extraction. 1040SCAN ORGANIZE bookmarks documents into a standardised workpaper index without OCR data extraction. The PRO tiers add extraction and export into tax software. — [SurePrep product page](https://corp.sureprep.com/?p=21967); [CPA Practice Advisor 2019 review](https://www.cpapracticeadvisor.com/2019/08/13/2019-review-of-sureprep-1040scan-and-taxcaddy/34443/)
- "1040SCAN PRO+ uses OCR and AI/ML technologies to capture amounts", and firms must verify OCR-captured amounts. — [Thomson Reuters help: SurePrep service types](https://www.thomsonreuters.com/en-us/help/ultratax-cs/tax-automation/sureprep-service-types)
- Auto-verification works like this. For native PDFs, it extracts text directly and auto-verifies it against the native text layer. For some scanned document types, it uses AI/ML, released on an "introductory trial basis". Pages go to human "In Verification" when they are not fully auto-verified, contain a barcode, have an empty field (for example an identifier that doesn't match the client proforma), or lack a required field such as payer name or SSN. — [TR help: Auto verification](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/auto-verification)
- The verifier UI works like this. "Input fields highlighted in pink were auto-verified using the native PDF's text layer." Distinct tickmarks in SPbinder mark text-layer verification versus text layer plus business rules. Pages carry an "Auto-Verified" stamp. — [TR help: Auto verification](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/auto-verification)
- The list of auto-verified non-native documents includes 1099-Consolidated Statements. The 2023 policy recommends excluding consolidated-statement intro pages and K-1 cover letters from verification. The 2025 policy says it captures IRS forms, organizer pages, brokerage statements and grantor letters. — [TR help: Auto verification](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/auto-verification.html); [2023 1040SCANverify policy](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-policy-statements/2023-1040scanverify-policy-1040-return); [2025 1040SCANverify policy](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-policy-statements/2025-1040scanverify-policy-1040-return)
- A vendor page claims about 65% of standard documents are auto-verified. This is a vendor figure; the TR help page gives no percentage. — [search summary of SurePrep pages](https://corp.sureprep.com/?p=21967)

**CCH (Wolters Kluwer) Scan / AutoFlow**
- AutoFlow works with CCH ProSystem fx Scan (and SaaS). It extracts key data from W-2s and 1099s after scanning and flows it into CCH ProSystem fx Tax or CCH Axcess Tax. — [Wolters Kluwer shop page](https://shoptax.wolterskluwer.com/en/prosystem-fx-scan-autoflow-authorizations-bundles-50.html)
- A 2009 review describes a data-verification step where staff review summary data before it flows to tax software. It recognised 1099-DIV, INT, MISC, Q and R; 1099-B is not mentioned. — [CPA Practice Advisor, 1 Jul 2009](https://www.cpapracticeadvisor.com/2009/07/01/cch-a-wolters-kluwer-business-prosystem-fx-scan-with-autoflow-technology/2924)

**Intuit (Lacerte / ProConnect Tax Import)**
- Scanned PDFs are uploaded to Intuit for processing. A typical run takes about 20 minutes, with a worst case of up to 12 hours. Status shows "Processing" and then "Ready for Import". — [Intuit ProConnect help](https://proconnect.intuit.com/community/individual/help/importing-scanned-source-documents-with-lacerte-tax-import/00/4874)
- The product page lists W-2, W-2G, 1098, 1099-B, 1099-G and 1099-DIV. It describes a form reviewer to check and edit data before import, "dual optical character readers", and **bookmarked, highlighted PDFs showing where each value came from**. — [Intuit Lacerte Tax Import page](https://accountants.intuit.com/lacerte/integrations/tax-import/)

**GruntWorx (consolidated 1099-B with many lots)**
- Trade Details turns scanned consolidated brokerage statements into a spreadsheet with one row per lot. Fields are quantity, description, acquired and sold dates, proceeds, cost, gain/loss and Box 6 covered/non-covered. Trade Summary returns category totals only. Users fix extraction errors by hand in the Excel output. It accepts year-end consolidated statements and standalone 1099-Bs, but not monthly statements. — [Drake KB: GruntWorx Trade Details or Summary](https://kb.drakesoftware.com/kb/GruntWorx/11043.htm); [GruntWorx Trades](https://www.gruntworx.com/features/trades.php)
- Trades is available for return types 1040, 1041, 1120, 1120-S and 1065 only. Drake's documentation says GruntWorx reviews Trade Summary totals for accuracy. — [Drake KB 11043](https://kb.drakesoftware.com/kb/GruntWorx/11043.htm)

**AI-native entrants**
- Black Ore Tax Autopilot became broadly available on 29 Apr 2026. In the company's framing, it "shows its work, links each data point back to source documents, and flags items requiring attention", and professionals sign off. It is SOC 2 Type II. Black Ore says 75 firms were onboarded from a waitlist of about 4,000. — [CPA Practice Advisor, 29 Apr 2026](https://www.cpapracticeadvisor.com/2026/04/29/black-ore-launches-tax-autopilot-for-broad-availability/)
- Filed launched an AI Tax Preparer on 21 May 2025 ($17.2M raised). It integrates with CCH Axcess, Drake, ProConnect, Lacerte and UltraTax, checks figures against sources and generates workpapers. Its "40% prep-time cut" is a vendor claim. — [CPA Practice Advisor, 21 May 2025](https://www.cpapracticeadvisor.com/2025/05/21/new-ai-tax-system-integrates-with-existing-systems-and-workflows-to-automate-tax-preparation/161468/); [ai.engineer profile](https://www.ai.engineer/orgs/filed)

**DataSnipper (audit click-to-source, the closest analogue to the case study's "trace a number")**
- A "Snip" extracts selected data from a source document and creates a reference between the document and an Excel cell. Document Matching finds the text, date or number in a source and references it to sample data. It supports tolerance, fuzzy and partial matching, and Force Match restricts matching to a section of the document. — [DataSnipper Match](https://datasnipper.com/features/match); [DataSnipper 3.0](https://www.datasnipper.com/resources/everything-you-need-to-know-about-datasnipper-3-0)

### Inferences
- The industry norm is: classify and bookmark, then extract into form templates, then verify with confidence and business rules (comparing to the text layer, the prior-year proforma, required fields), then a human queue, then export. The OCR engine is one component and not the product. The verification and triage layer is where the products differ.
- "Highlighted PDF showing where each value came from" (Intuit, SurePrep pink fields, Black Ore links) requires a page index plus region per value. That is effectively a bounding-box anchor, even though none of them publish the format.
- SurePrep's practice of matching extracted identifiers to the client proforma (prior-year data) is a direct precedent for the case study's prior-year cross-checks.

### Gaps
- No public documentation on the internal anchor schema of any vendor (SurePrep, CCH, Intuit, DataSnipper, Black Ore).
- No current (2025–26) CCH Axcess Scan documentation was found on highlighting or consolidated 1099 handling.
- No independent accuracy benchmarks for any tax vendor; all accuracy claims are vendor-sourced.
- I found nothing confirming whether Intuit has added LLM/VLM extraction to Lacerte or ProConnect in 2026.

## Q2. Open-source and cloud alternatives: accuracy, boxes, licence, cost, hardware

### Takeaway
For tax forms specifically, the cloud APIs are the only off-the-shelf options with **named tax-field schemas plus per-field confidence plus boxes**. Azure has the broadest coverage, including 1099-B, 1099 Combo and every 1040 schedule. AWS Textract Analyze Lending covers W-2 and the common 1099s. Google prices its W-2 parser at $0.30 per document. Open-source VLM parsers (PaddleOCR-VL, MinerU, GLM-OCR, dots.ocr, Marker, Unlimited-OCR) lead general document-parsing benchmarks but output layout and markdown, not tax fields, and most lack calibrated confidence.

### Cited Findings
**Cloud APIs**
- **Azure Document Intelligence v4.0 (2024-11-30 GA; doc page dated 15 Aug 2026):** the model IDs include `prebuilt-tax.us` (unified), `prebuilt-tax.us.w2`, `.1098`, `.1098E`, `.1098T`, `.1099A`, `.1099B`, `.1099C`, `.1099CAP`, `.1099Combo`, `.1099DIV`, `.1099G`, `.1099H`, `.1099INT`, `.1099K`, `.1099MISC`, `.1099NEC`, `.1099OID`, `.1099R`, `.1099S`, `.1099SA`, `.1099SSA` and others. It also covers 1040 plus Schedules 1, 2, 3, 8812, A, B, C, D, E, EIC, F, H, J, R, SE, 1095A/C and W-4. The unified model detects W-2, 1098, 1040 and 1099 forms within a mixed document and skips unsupported ones. Limits are up to 2,000 pages per PDF and 500 MB on S0, with a minimum text height of about 8 pt at 150 DPI. v3.0 and v3.1 support only W-2 and the 1098 family. — [Microsoft Learn: tax document model](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/tax-document)
- **AWS Textract Analyze Lending** classifies and extracts mortgage-packet documents. Its class list includes W_2, 1099_DIV, 1099_G, 1099_INT, 1099_MISC, 1099_NEC, 1099_R and 1099_SSA. The full list is in an AWS sample assets file I could not access, so 1099-B and K-1 are unconfirmed. — [AWS docs: Analyze Lending response objects](https://docs.aws.amazon.com/textract/latest/dg/lending-response-objects.html); [AWS News Blog](https://aws.amazon.com/blogs/aws/classifying-and-extracting-mortgage-loan-data-with-amazon-textract)
- Textract blocks carry a Confidence that covers both the recognised text and the geometry. Geometry is a normalised BoundingBox (Left, Top, Width, Height as page ratios) plus a Polygon. — [AWS Kotlin SDK Block.confidence](https://docs.aws.amazon.com/sdk-for-kotlin/api/latest/textract/aws.sdk.kotlin.services.textract.model/-block/confidence.html); [AWS re:Post example](https://repost.aws/questions/QUNtDiTPukRIKrxexholICSg/textract-confidence-for-query-results)
- Textract plus Amazon A2I human review can trigger on a key's confidence below a threshold (the example uses 90 for most keys and 99 for one critical key), on a missing required key, or on random sampling for audit. Word-level confidence conditions are also possible (example: pair below 60 and words below 85). — [AWS SageMaker A2I Textract activation conditions](https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-json-humantaskactivationconditions-textract-example.html); [AWS ML blog](https://aws.amazon.com/blogs/machine-learning/using-amazon-textract-with-amazon-augmented-ai-for-processing-critical-documents/)
- **Google Document AI:** the W-2 parser costs $0.30 per classified document and the lending splitter/classifier $0.05 per classified document. Synchronous requests take up to 10 pages; batch requests up to 200 pages. — [Google Cloud Document AI pricing](https://cloud.google.com/document-ai/pricing)

**Open-source parsers**
- **PaddleOCR-VL-1.6** (0.9B-class VLM, released 28 May 2026) reports 96.33% on OmniDocBench v1.6. The model card cites the official leaderboard, but it is self-reported. It scores 93.19% on Real5-OmniDocBench (skew and screen photos), per Chinese press. — [HF model card PaddleOCR-VL-1.6](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6); [QbitAI, Jun 2026](https://www.qbitai.com/2026/06/427754.html)
- Roboflow (3 Aug 2026) ranks OmniDocBench v1.6 open-source leaders as PaddleOCR-VL 96.34%, MinerU2.5-Pro 95.75% and GLM-OCR 95.22%, all beating Qwen3-VL-235B at 89.78%. — [Roboflow: Best open-source OCR models](https://blog.roboflow.com/best-open-source-ocr-models/)
- **PaddleOCR 3.x** is Apache-licensed. PP-StructureV3 converts PDFs and images to Markdown plus JSON that preserves structure. — [PaddleOCR 3.0 tech report, arXiv 2507.05595](https://arxiv.org/abs/2507.05595); [paddleocr.ai docs](https://www.paddleocr.ai/v3.3.1/en/index.html)
- **olmOCR-Bench** (from the dots.ocr paper supplement): Marker about 70.1%, MinerU 61.5%, olmOCR v0.1.75 74.7%, Mistral OCR about 72.0%. — [dots.ocr paper, arXiv 2512.02498](https://arxiv.org/pdf/2512.02498)
- Marker 2 (Jul 2026) scores 76.0% in balanced mode and 66.6% in fast mode on olmOCR-Bench, against Docling at 50.3% on the same harness. This is secondary reporting. — [MarkTechPost, 24 Jul 2026](https://www.marktechpost.com/2026/07/24/datalab-marker-v2-vs-mineru-docling-and-liteparse-benchmark-breakdown/)
- **dots.ocr** is labelled MIT on an HF mirror. Its paper describes layout parsing (layout boxes plus content) in a single VLM. — [dots.ocr paper](https://arxiv.org/pdf/2512.02498); [HF mirror README](https://huggingface.co/hexiydev/dots.ocr/blob/main/README.md)

### Inferences
- **Recommended split for a tax workpaper:** a layout and OCR engine (open source, such as Unlimited-OCR, PaddleOCR-VL or MinerU, or a cloud read/layout API) gives text plus boxes. A separate, deterministic field-mapping and validation layer assigns tax semantics and runs checks. Use cloud prebuilt tax models only where a field schema with confidence is needed out of the box.
- For consolidated 1099-B with hundreds of lots, the industry precedent (GruntWorx Trades) is table extraction into one row per lot plus a reconciliation to category totals. Any OCR choice must be judged on long multi-page table fidelity, which is where Unlimited-OCR's long-context design is plausibly relevant.
- For this case study, the packet already contains extracted values, so no OCR is needed for the deliverable. The design question is the anchor and confidence model, not the engine.

### Gaps
- No OmniDocBench numbers found for Unlimited-OCR, dots.ocr, olmOCR, GOT-OCR or Surya on the same version (v1.6).
- Licences for MinerU (believed to be AGPL in earlier versions, **unverified here**), Marker, Surya (believed to carry weight-use restrictions, **unverified**), olmOCR (believed to be Apache-2.0, **unverified**), Docling (believed to be MIT, **unverified**) and GOT-OCR were not confirmed in this pass. Check each repo before relying on these.
- No tax-form-specific benchmark (W-2 or 1099 field accuracy) was found for any open-source model.
- Azure and Textract per-page prices for the tax and lending models were not retrieved. Only Google's W-2 price was confirmed.
- Tesseract was not researched in this pass.

## Q3. Anchor formats for "click a number, see the highlighted field", and survival across re-OCR or a corrected document

### Takeaway
Store the anchor as **document ID plus content hash, page index, and a box in PDF user space (points, bottom-left origin)**. Also store **normalised 0–1 page coordinates**, as Textract does, plus a **text-quote selector** (exact value with prefix and suffix context) for re-anchoring. W3C Web Annotation selectors give a standard envelope for this. The fallback chain Hypothesis uses (stored position, then context-first fuzzy text match, then fuzzy match on the exact text alone) is the proven way to survive a changed document. Anything that fails to re-anchor should be flagged as an orphan, never silently dropped.

### Cited Findings
- The W3C Web Annotation model allows a FragmentSelector refined by a TextQuoteSelector (`refinedBy`). The Web Publications extension note that showed this was discontinued and is to be "read with caution". — [W3C Web Annotation Extensions for Web Publications](https://www.w3.org/TR/wpub-ann/)
- EPUB Annotations 1.0 (W3C Working Draft, 7 Apr 2026) profiles Web Annotation. Its fragment options include Media Fragments `xywh=50,50,640,480`. Text-fragment integration is marked "AT RISK". — [W3C EPUB Annotations 1.0 WD](https://www.w3.org/TR/2026/WD-epub-anno-10-20260407/)
- Hypothesis stores three selectors per annotation:
  - a RangeSelector (XPath plus offsets)
  - a TextPositionSelector (global character offsets)
  - a TextQuoteSelector (exact text plus 32-character prefix and suffix)

  It re-anchors in four steps: range, then position, then context-first fuzzy matching, then fuzzy matching on the exact text alone. Matching uses diff-match-patch with Bitap. — [Hypothesis blog "Fuzzy Anchoring", 22 Apr 2013](https://web.hypothes.is/blog/fuzzy-anchoring/)
- PDF user space has a bottom-left origin and units in points (1/72 inch). Screen space has a top-left origin in CSS pixels. PDF.js `PageViewport.convertToViewportRectangle` and `convertToPdfPoint` convert between the two. Store rectangles in PDF space, because it doesn't depend on zoom or rotation, and reconvert on zoom or rotation. These are secondary guides by a commercial vendor. — [Nutrient: PDF.js coordinate systems](https://www.nutrient.io/blog/pdfjs-coordinate-systems-pdf-to-screen/); [Nutrient: PDF.js text highlights](https://www.nutrient.io/blog/pdfjs-text-highlight-annotations/)
- PDF highlight annotations use QuadPoints (four points per rectangle, several rectangles allowed). The point order in the spec is reportedly inconsistent with real files. — [annotpdf / pdfAnnotate](https://github.com/highkite/pdfAnnotate); [Apryse Link annotation docs](https://docs.apryse.com/api/PDFTronSDK/dotnet/pdftron.PDF.Annots.Link.html)
- Textract returns normalised boxes (page-ratio Left, Top, Width, Height) plus a polygon. — [AWS re:Post example](https://repost.aws/questions/QUNtDiTPukRIKrxexholICSg/textract-confidence-for-query-results)

### Inferences
- Boxes alone break when a corrected document is re-issued, such as a corrected 1099 whose layout shifts or whose page count changes, and when re-OCR at different DPI moves boxes slightly. A text-quote selector with context, plus the form-field key (form type and box number), lets the app re-find the value. If the value itself changed, the app should flag "source changed" rather than re-anchor silently.
- For this case study (a JSON packet with simulated source documents), a minimal anchor would be `{docId, docVersion/hash, page, field key, bbox in normalised coords, quote}`. It renders through PDF.js or an HTML overlay, and a "re-anchor failed" state is shown as a check failure.

### Gaps
- No primary source found on how commercial tax or audit products (SurePrep, DataSnipper) store anchors or handle corrected-document re-anchoring.
- The official PDF.js API docs and the ISO 32000 QuadPoints text were not fetched directly. Coordinate notes come from secondary guides.

## Q4. Known failure modes in financial OCR and how products surface them

### Takeaway
There are two families of failure. Classic OCR misreads or skips characters. VLM OCR can **invent fluent, plausible text and numbers**, and gives no per-character confidence to threshold on. Products surface errors by checks outside the OCR model: comparison to the text layer, required-field and identifier checks against prior-year data (proforma), confidence thresholds that route fields to human review, random audit sampling, and reconciling totals.

### Cited Findings
- VLM OCR "can invent text that was never on the page", and the result reads fluently. Numbers are particularly vulnerable, because the model fills ambiguous characters with what seems to fit. There is "no per-character score to threshold on", so validation must sit outside the model. — [Towards AI: VLM validation and document intelligence](https://pub.towardsai.net/vlm-validation-and-document-intelligence-ed609460e8d4)
- VLM OCR errors are qualitatively different from traditional character substitutions: a low character error rate can hide hallucinations. — [arXiv 2607.24077 (Jul 2026)](https://arxiv.org/pdf/2607.24077)
- FinCriticalED, a benchmark for fact-level financial OCR, has a concrete example: "21,829,000" output where the source says "21,429,000" (a single-digit misread), along with a hallucinated interest rate. — [arXiv 2511.14998](https://arxiv.org/pdf/2511.14998)
- In financial statement extraction, OCR misses keywords because of low-quality scans or overlapping stamps. Unit ambiguity can shift values by 3–6 orders of magnitude. — [arXiv 2510.23066](https://arxiv.org/pdf/2510.23066)
- SurePrep routes pages to human verification in several cases:
  - an identifier read by OCR does not match the client proforma
  - a required field (payer name, SSN) is missing
  - the page is not fully auto-verified

  Native-PDF values are checked against the text layer and marked with distinct tickmarks. — [TR help: Auto verification](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/auto-verification)
- Textract and A2I flag low-confidence keys, missing required keys and random samples for human review. — [AWS A2I Textract activation conditions](https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-json-humantaskactivationconditions-textract-example.html)
- Intuit uses "dual optical character readers", which implies cross-checking two engines. — [Intuit Lacerte Tax Import](https://accountants.intuit.com/lacerte/integrations/tax-import/)
- The SurePrep 2023 policy excludes consolidated-statement intro pages and K-1 cover letters from verification. This is a practical guard against duplicated or summary pages being double-counted. — [2023 1040SCANverify policy](https://www.thomsonreuters.com/en-us/help/sureprep/1040scan/1040scan-policy-statements/2023-1040scanverify-policy-1040-return)

### Inferences
- How each failure is surfaced in practice:
  - **Digit transposition** (SSN 3390 vs 3309, EIN, amounts): cross-check against the prior-year proforma or other documents. SurePrep's identifier-to-proforma mismatch is this exact pattern. Use checksums where they exist and reconcile totals.
  - **Blank read as zero:** require the extractor to return null for an empty box, separate from 0. Flag any required box that comes back as 0 when the prior year was non-zero. No source documents this failure directly; it is inferred.
  - **Duplicated pages:** detect them by page hash or document fingerprint, and by identical payer, account and amount tuples. Exclude summary and intro pages, following the SurePrep policy.
  - **Low-confidence handwriting:** route to a human queue with the highlighted crop. Engines with per-field confidence (Azure, Textract) support this directly; VLMs need an external proxy, such as agreement between two engines or text-layer comparison.
- This supports the case study's data model: each number carries its source anchor, confidence, verification method (text layer, second engine, human, rule) and the checks it fails. The industry already works this way, though it rarely exposes it as clearly.

### Gaps
- No source specifically documents "blank read as zero" in tax OCR. It is plausible but unconfirmed.
- No published error-rate statistics for W-2 or 1099 extraction from any vendor or open-source model.
- No product documentation found on how handwritten logs (such as mileage) are handled by tax OCR vendors.
