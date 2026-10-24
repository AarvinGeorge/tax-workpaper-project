# Safety, evaluation and cost control for a tool-using agent reading untrusted tax documents

Context assumed throughout: Taxmark's agent reads a client tax packet (untrusted documents and client messages) through read-only tools; its suggestions are verified by code (quote must appear on cited page, vetted authority list, SSN scan); it never blocks approval; identifiers are masked before the model sees them; estimated $3-8 per run on Claude Opus 5.5, hard cap $12. Research date: 24 Oct 2026. Older material is marked with its date.

## 1. Prompt-injection defenses for agents reading untrusted content — which apply when tools are read-only and outputs are verified?

### Takeaway
No filter or model reliably stops prompt injection. The working defense is architectural: make sure that text inside the documents cannot trigger a consequential action or carry data out. Taxmark's design (read-only tools, no outbound channel, code-verified outputs, a human approver) already removes the exfiltration and action legs of Willison's "lethal trifecta". The risk left is **integrity**, not theft: an injected document could bias, suppress or fabricate suggestions. So the defenses that still matter are verification, data-marking (spotlighting) of untrusted spans, per-document isolation, and evals that plant injections.

### Cited Findings
- **Lethal trifecta (Willison, 16 Jun 2025):** the danger comes from combining (1) access to private data, (2) exposure to untrusted content and (3) the ability to communicate externally. With all three, "an attacker can easily trick it into accessing your private data and sending it to that attacker." Past vendor fixes usually worked by locking down the exfiltration vector. — [Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- Willison is "deeply suspicious" of guardrail products. A claim to catch "95% of attacks" is a failing grade in web security, and "we still don't know how to 100% reliably prevent this." — [Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- Core principle, quoted from the design-patterns paper: once an agent has read untrusted input, "it must be constrained so that it is impossible for that input to trigger any consequential actions." — [Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- **Design Patterns for Securing LLM Agents against Prompt Injections** (Beurer-Kellner et al., Jun 2025; 14 authors from IBM, ETH Zurich, Google, Microsoft and others) gives six patterns:
  - Plan-then-execute: the plan is fixed before any untrusted data is read. Tool outputs cannot add new actions, but they can still tamper with the arguments to planned actions.
  - Map-reduce: an isolated sub-agent processes each untrusted document, and a constrained reduce step combines the results.
  - Dual LLM: a privileged LLM holds the tools and never sees untrusted text; a quarantined LLM reads untrusted text and has no tools.
  - Source: [arXiv 2506.08837](https://arxiv.org/pdf/2506.08837); Willison's review: [simonwillison.net](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/)
  - A secondary source (ArmoSec) argues that these patterns stop injected text from choosing actions but leave argument values open. Its claim that the authors concede a residual weakness in 8 of 10 case studies is unverified. — [ArmoSec](https://www.armosec.io/blog/design-patterns-for-securing-llm-agents/)
- **CaMeL (Google DeepMind, "Defeating Prompt Injections by Design", arXiv 2503.18813, Mar 2025):**
  - A privileged LLM writes code. Untrusted data is handled by a quarantined LLM, and capability and taint tracking enforces policy on data flows.
  - Utility: 77% of AgentDojo tasks with provable security, versus 84% undefended (v2). v1 reported 67%.
  - Limitation: tasks where the required action depends on untrusted data cannot be planned without reading that data.
  - Sources: [CaMeL PDF (MIT 6.858 reading)](https://css.csail.mit.edu/6.858/2026/readings/camel.pdf); [liner summary](https://liner.com/review/defeating-prompt-injections-by-design); [sotaverified](https://sotaverified.org/papers/defeating-prompt-injections-by-design)
- **Spotlighting (Microsoft, Hines et al., arXiv 2403.14720, Mar 2024 — older):**
  - Three variants: delimiting, datamarking (interleaving a marker token through untrusted text) and encoding (for example base64).
  - On GPT-family models it "reduces the attack success rate from greater than 50% to below 2%" with "minimal detrimental impact to underlying NLP tasks."
  - A secondary summary says encoding gave the lowest ASR, but it hurt the weaker model (GPT-3.5); datamarking had negligible task impact.
  - Sources: [arXiv abstract](https://arxiv.org/abs/2403.14720); [Moonlight review](https://www.themoonlight.io/en/review/defending-against-indirect-prompt-injection-attacks-with-spotlighting)
- **Anthropic, "prompt injection defenses" (24 Nov 2025):**
  - Three layers: RL training against injections (including "authoritative or urgent" ones), classifiers that scan untrusted content entering the context window, and continuous red-teaming.
  - Attack success rates against an adaptive Best-of-N attacker (100 attempts per environment), shown as model only → old safeguards → improved safeguards:

    | Model | Model only | Old safeguards | Improved safeguards |
    |---|---|---|---|
    | Opus 4.5 | 8.0% | 7.6% | 1.4% |
    | Sonnet 4.5 | 13.8% | 10.8% | 1.9% |

  - "A 1% attack success rate … still represents meaningful risk." "No browser agent is immune to prompt injection."
  - Source: [Anthropic](https://anthropic.com/research/prompt-injection-defenses)
- **Claude for Chrome (Aug 2025):** 123 test cases across 29 scenarios. The unprotected agent failed 23.6% of the time; the reported rate with mitigations is 11.2%. — [Anthropic](https://www.anthropic.com/news/claude-for-chrome); [Gigazine](https://www.gigazine.net/gsc_news/en/20250827-claude-for-chrome)
- **Newer figures, secondary sources only (not checked against system cards):**
  - The Opus 4.6 system card reportedly shows 0% attack success in a constrained coding environment but 78.6% by the 200th attempt in an unguarded GUI environment. The point: the action surface matters as much as model robustness. — [WorkOS](https://workos.com/blog/ai-agent-governance-prompt-injection-surface-not-model)
  - Opus 5 reportedly reached 0% browser attack success with Auto Mode on and 3.7% without it. — [The Decoder](https://the-decoder.com/opus-5-may-have-solved-browser-based-prompt-injection-the-biggest-security-flaw-haunting-ai-agents/)
- **OWASP Top 10 for LLM Applications 2025** (summaries; the official text was not fetched):
  - LLM01 Prompt Injection, including indirect injection through documents.
  - LLM02 Sensitive Information Disclosure, up from #6 to #2.
  - LLM06 Excessive Agency. Mitigations: minimise tool permissions and require approval for high-impact actions.
  - LLM10 Unbounded Consumption: cost, latency or capacity exhausted by abuse or missing limits.
  - Sources: [promptfoo](https://promptfoo.dev/docs/red-team/owasp-llm-top-10/); [dev.to overview](https://dev.to/foxgem/overview-owasp-top-10-for-llm-applications-2025-a-comprehensive-guide-8pk); [Invicti](https://voltron81.invicti.com/blog/web-security/owasp-top-10-risks-llm-security-2025)

### Inferences
- **Which defenses apply to Taxmark:**
  - Read-only tools plus no outbound channel removes the third leg of the trifecta, so theft-style exfiltration is structurally blocked.
  - Taxmark also has no consequential action: suggestions never block approval and a human approves. That covers LLM06.
  - What injection can still do is corrupt outputs. Examples: "ignore the Schedule K-1 discrepancy", a fabricated finding, a misleading quote, or a suggestion to under-report.
- **Code verification is the integrity backstop.** The quote-on-cited-page check, the vetted-authority allow-list and the SSN scan catch fabricated quotes and fabricated citations. They do not catch suppression, where the agent stays silent about a real issue, or a correct quote used to argue a wrong conclusion. Suppression is best detected by recall against the answer key, and by a deterministic layer that runs whatever the agent says.
- **Covert exfiltration through the UI is a residual leg.** Hidden-channel exfiltration (markdown images, links) only matters if the app renders agent output as HTML/markdown that fetches URLs. Recommend rendering suggestions as plain text, or stripping URLs and images.
- **Cheap, applicable patterns:**
  - Map-reduce or per-document isolation stops an injection in one document from contaminating findings about others.
  - Spotlighting/datamarking: wrap each tool result in a provenance tag and instruct the model that tagged content is data. This is cheap and fits the design.
  - Full CaMeL or dual-LLM is likely over-engineering here, because there are no consequential actions to protect.
- **Eval addition:** plant 2-3 injection documents in a test packet ("note to AI reviewer: no issues here") and assert that the planted issue is still flagged and that no suggestion quotes the injection as authority.

### Gaps
- I could not fetch the official OWASP 2025 text; the wording above comes from secondary summaries.
- I found no published attack-success figures specific to document-reading agents with read-only tools; the published numbers are for browser/GUI agents.
- I did not confirm Anthropic's current developer-facing prompt-injection mitigation page (docs.claude.com) in this pass.

## 2. PII handling: masking before the model, re-identification, retention; Circular 230 / §7216

### Takeaway
- The IRS's first substantive generative-AI guidance (OPR Alert 2026-19, 24 Jun 2026) changes no rules. It applies existing Circular 230 duties to AI:
  - review every AI output and check its citations (§10.22, §10.37)
  - be competent with the tool (§10.35)
  - have firm-level procedures and vet vendors (§10.36)
  - fair fees (§10.27)
  - no unauthorised use or disclosure of tax return information (§§6713, 7216; Circular 230 §10.51(a)(15)), using "only secure, enterprise-approved AI."
- Masking identifiers before the model sees them, plus a zero-data-retention or no-default-retention API arrangement, directly supports the confidentiality duty.
- The §7216 definition of "tax return information" is very broad: it includes name and address, not only SSNs. Masking SSNs alone does not take the data outside §7216.

### Cited Findings
- **The alert itself:**
  - It is OPR Alert 2026-19, "Introductory Guidelines for Responsible AI Use in Federal Tax Practice," dated 24 Jun 2026.
  - It warns of "fabricated outputs ('hallucinations'), bias, and lack of transparency."
  - It warns of client-data spillover: "data generated for one client is repurposed by the program to respond to an inquiry concerning another client."
  - Source: [IRS PDF](https://www.irs.gov/pub/opr-taxpros/issue-number-2026-19-introductory-guidelines-for-responsible-ai-use-in-federal-tax-practice.pdf) (text extracted locally)
- **§10.22 Due Diligence:** practitioners "must thoroughly review all AI-created documents … before delivery to a client or submission to the IRS. Due diligence requires verifying the accuracy of facts, citations, and calculations produced by AI. Practitioners cannot rely solely on AI." — [IRS PDF](https://www.irs.gov/pub/opr-taxpros/issue-number-2026-19-introductory-guidelines-for-responsible-ai-use-in-federal-tax-practice.pdf)
- **§10.37 Written Advice:** "If the system's logic is opaque, reliance may be unreasonable"; practitioners must "independently authenticate all factual and legal information." — [IRS PDF](https://www.irs.gov/pub/opr-taxpros/issue-number-2026-19-introductory-guidelines-for-responsible-ai-use-in-federal-tax-practice.pdf)
- **§10.36 Procedures:** firms need staff training, "protocols for secure data handling, AI accuracy monitoring," vetting of third-party AI tools, and "all steps and processes documented." — [IRS PDF](https://www.irs.gov/pub/opr-taxpros/issue-number-2026-19-introductory-guidelines-for-responsible-ai-use-in-federal-tax-practice.pdf)
- **§§6713/7216:** "Practitioners must strictly handle all client data using only secure, enterprise-approved AI"; "never upload sensitive data to unsecured sites."
  - The footnote quotes Treas. Reg. §301.7216-1(b)(3): tax return information means "any information, including, but not limited to, a taxpayer's name, address, or identifying number, which is furnished in any form or manner for, or in connection with, the preparation of a tax return."
  - Source: [IRS PDF](https://www.irs.gov/pub/opr-taxpros/issue-number-2026-19-introductory-guidelines-for-responsible-ai-use-in-federal-tax-practice.pdf)
- **The alert's best-practice list includes:** "Document AI usage and verification processes," "Treat the written text that AI generates as drafts," and "always check citations." — [IRS PDF](https://www.irs.gov/pub/opr-taxpros/issue-number-2026-19-introductory-guidelines-for-responsible-ai-use-in-federal-tax-practice.pdf)
- **Penalties, secondary source:** §7216 criminal penalty up to $1,000 per offense and up to 1 year in prison; §6713 civil penalty $250 per disclosure, capped at $10,000 per year. Whether clients must be told about AI use is unresolved; AICPA advises disclosure as a precaution. — [letsdatascience](https://letsdatascience.com/news/irs-ai-guidance-leaves-client-disclosure-question-open-f5400ffe); [TaxGPT blog](https://www.taxgpt.com/blog/general-ai-vs-tax-specific-ai)
- **Anthropic API retention (current docs):**
  - "Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is Covered Models, which require 30-day retention."
  - Covered Models are Fable 5.1, Mythos 5.1, Fable 5 and Mythos 5, which are not available under ZDR. **Opus 5.5 is not a Covered Model.**
  - Source: [Anthropic docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- **ZDR eligibility by feature:**
  - Prompt caching is ZDR-eligible: "prompts and Claude's outputs are not stored"; KV-cache representations are held in memory.
  - Not ZDR-eligible: Batch API (29-day retention), Files API (kept until deleted), code execution and programmatic tool calling (containers up to 30 days).
  - US-only inference (`inference_geo: "us"`) costs a 1.1x multiplier.
  - Sources: [Anthropic docs](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention); [pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- An Anthropic privacy help article still says API inputs and outputs are deleted within 30 days. This conflicts with the "not retained by default" docs wording and may be stale. — [privacy.claude.com](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- OWASP LLM02 (Sensitive Information Disclosure) covers PII in context leaking into outputs, in both directions. — [promptfoo](https://promptfoo.dev/docs/red-team/owasp-llm-top-10/)

### Inferences
- **Masking and re-identification:**
  - Mask before the model with stable tokens (for example `[SSN_1]`, `[PAYER_EIN_2]`). Keep the token↔value map server-side and re-identify only when rendering for the human, never in the model's context.
  - Tool results must go through the same masker; otherwise a read tool re-leaks the raw values. The SSN scan on outputs is the second line of defense.
  - Code verification must compare quotes against the *masked* page text, or mask both sides consistently, or valid quotes will fail.
- **§7216 framing:** treat the full packet as tax return information even after masking. The defensible framing is: a vetted enterprise vendor, no default retention or ZDR, no Batch/Files API for packet content, US inference if required, and documented usage plus a verification log. That matches the §10.36 "documented procedures" expectation.
- **Taxmark's design maps onto the alert:**
  - "Never blocks approval" combined with code-verified quotes and citations maps onto §10.22's "verify facts, citations, calculations," and onto "treat output as drafts."
  - The vetted authority list answers the alert's emphasis on hallucinated citations.

### Gaps
- I did not open Treas. Reg. §301.7216-2 and -3 (consent and permitted-disclosure exceptions, for example auxiliary services to a preparer), or Rev. Proc. 2013-14 consent wording. Whether an LLM vendor qualifies under a permitted-disclosure exception without client consent needs a primary-source or counsel check.
- I found no Journal of Accountancy or AICPA primary text in this pass; the AICPA disclosure advice comes via a secondary source.
- There is no published guidance on whether masked/tokenised data still counts as "tax return information." Inference: it likely does when combined with the remaining packet content.

## 3. Evaluating agents: variance, pass@k / pass^k, union/intersection, LLM-as-judge, ablations, number of runs for a 27-item key

### Takeaway
- Anthropic's "Demystifying evals for AI agents" (9 Jan 2026) is the canonical reference. Its advice:
  - run multiple isolated trials
  - grade outcomes, not paths
  - prefer code graders and calibrate any LLM judge against humans
  - give the judge an "Unknown" option
  - report both pass@k (at least one success in k trials) and pass^k (all k succeed)
- For a 27-item answer key, per-run recall has wide confidence intervals: roughly ±15-19 points at 95% for one run. A suite that small needs repeated runs, plus item-level analysis and exact or bootstrap intervals rather than normal approximations.

### Cited Findings
- **Eval anatomy, from "Demystifying evals for AI agents" (Grace, Hadfield, Olivares, De Jonghe; 9 Jan 2026):**
  - task: a single test with defined inputs and success criteria
  - trial: one attempt; multiple trials are needed "because outputs vary"
  - grader: logic that scores one aspect of performance
  - transcript: the full record of a trial
  - outcome: the final environment state
  - evaluation harness: runs tasks and aggregates results
  - Evaluating "an agent" means evaluating the harness and the model together.
  - Source: [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **pass@k vs pass^k:** pass@k is the chance of at least one success in k trials and rises with k; pass^k is the chance all k succeed and falls with k. At 75% per-trial success, pass^3 ≈ 42%. By k=10, pass@k approaches 100% while pass^k approaches 0%. The post gives no recommended trial count. — [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Grader types:**
  - Code-based: fast, cheap, reproducible, but brittle.
  - Model-based: flexible, but non-deterministic, and "requires calibration against human graders."
  - Human: the gold standard, used to calibrate the model-based graders.
  - Scoring can be weighted, binary or hybrid. Use partial credit for multi-component tasks.
  - Source: [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **LLM-judge calibration:** calibrate closely against human experts; give the judge an "Unknown" option to reduce hallucinated judgements; use structured rubrics with a separate judge per dimension. — [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Suite design:**
  - Start with 20-50 tasks drawn from real failures.
  - Capability evals should start low; regression evals should sit near 100%.
  - A score of 100% is saturated and gives no improvement signal; 0% across many trials usually means a broken task.
  - Each trial needs a clean environment, because shared state inflates scores. In one example an agent read git history from earlier trials.
  - "Don't take scores at face value until someone has checked the details"; read transcripts.
  - Source: [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Error bars (Miller, "Adding Error Bars to Evals", arXiv 2411.00640, Nov 2024 — older but standard):**
  - Use paired, per-question differences when comparing two configurations, because shared question difficulty cancels.
  - Cluster standard errors when items are related. Clustered errors on popular evals can be more than 3x the naive figures.
  - Sources: [arXiv](https://arxiv.org/pdf/2411.00640); [Anthropic research post](https://anthropic.com/research/statistical-approach-to-model-evals)
- **Small-sample caution:** a 2025 position paper warns against central-limit-theorem-based intervals for LLM evals with fewer than a few hundred datapoints; use Bayesian or exact alternatives. — [arXiv 2503.01747](https://arxiv.org/pdf/2503.01747)

### Inferences
These are calculations or design suggestions, not sourced claims.
- **Metrics for a 27-item key, per run:** recall (items found / 27) and precision (verified suggestions that match a key item or are judged valid / all suggestions). Across N runs, report:
  - **Mean recall ± interval.** Bootstrap over items, clustered by item, not by run.
  - **Union recall (≈ pass@N per item):** items found in at least one run. This is the ceiling if you ran N times and merged.
  - **Intersection recall (≈ pass^N per item):** items found in every run. This is what a reviewer can rely on from a single run.
  - **Per-item hit rate p_i:** this separates "always found" from "flaky" from "never found."
  - The union-minus-intersection gap is the clearest picture of run-to-run variance.
- **Arithmetic on width and run count:**
  - With 27 items and one run at recall 0.6, the binomial SE is √(0.6·0.4/27) ≈ 0.094, so the 95% interval is about ±18 points. Averaging runs shrinks the run-to-run part of the variance only; the item-sampling part stays.
  - To have 95% confidence of seeing an item with per-run hit rate p at least once, you need k ≥ ln(0.05)/ln(1−p): about 9 runs at p=0.3 and 5 runs at p=0.5.
  - To tell p=0.9 from p=0.5 per item, 5 runs is marginal and 10 is reasonable.
  - Practical recommendation: **5 runs for a development comparison, 10 runs for the reported number.** At $3-8 a run that is $15-40 and $30-80, inside a sensible eval budget. Compare configurations with paired per-item differences, per Miller.
- **Ablation design:** run the agent with (a) the full deterministic layer visible, (b) part of it hidden (for example, withhold the engine's cross-check results), and (c) no deterministic layer. The agent's *marginal* value is the items it finds that the deterministic layer does not, so score "agent-only finds" separately. If ablation (c) still recovers deterministic-layer items, the agent works as a safety net; if it recovers nothing beyond (a), it is redundant.
- **Judge:** use code graders (quote check, citation allow-list, item-ID match) wherever possible. Use an LLM judge only for "does this suggestion match key item X semantically," calibrate it against hand labels on 2-3 runs, report agreement, and include an "Unknown/no match" option.
- **Planted items for safety:** add injection-bearing documents and masked-PII leak checks as regression tests that must stay at 100%.

### Gaps
- I found no published guidance giving a specific run count for small (fewer than 50 item) agent answer keys; the figures above are my own binomial arithmetic.
- No published ablation write-up quantifies an "LLM on top of deterministic checks" uplift in the tax or accounting domain.

## 4. Cost and latency control

### Takeaway
On Opus 5.5 ($4/MTok input, $20/MTok output, cache reads $0.20/MTok = 0.05x), most of an agent loop's cost is re-sent context. Caching a stable prefix is the biggest lever: tools, then the system prompt, then the masked packet digest. After that come context editing (clearing stale tool results), effort settings, a task budget as an advisory pacing signal, a per-request `max_tokens`, and a client-side hard dollar cap. A task budget is advisory only, so the $12 hard cap must be enforced in code.

### Cited Findings
- **Pricing per MTok:**

  | Model | Input | 5-min cache write | 1-hour cache write | Cache read | Output |
  |---|---|---|---|---|---|
  | Opus 5.5 | $4 | $5 | $8 | $0.20 | $20 |
  | Sonnet 5.5 | $2 | $2.50 | $4 | $0.10 | $10 |
  | Haiku 5.5 (prompts up to 100k tokens) | $0.10 | – | – | $0.01 | $0.50 |

  - Batch API is 50% off, but it is not ZDR-eligible. US-only inference is 1.1x.
  - The pricing page also lists Opus 5.5 at $8/$40 in its fast-mode section (inferred from the page's section layout).
  - Source: [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Prompt caching:**
  - Write multipliers: 1.25x (5-minute TTL) and 2x (1-hour TTL). The read multiplier is 0.05x for Opus 5.5 and Sonnet 5.5, and 0.1x for most others.
  - Minimum cacheable length is 512 tokens on Opus 5.5. Up to 4 breakpoints are allowed, and each looks back at most 20 blocks.
  - Prefix order is tools → system → messages. Changing tool definitions invalidates everything; changing `tool_choice`, images, thinking settings or effort invalidates message-level cache.
  - The TTL starts at the start of the request, so a 4-minute stream leaves about 1 minute for reuse.
  - Cache hits do not count against rate limits. The page publishes no percentage savings beyond the multipliers.
  - Source: [Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- **Context editing and memory (Anthropic, Sep/Oct 2025 — older):**
  - In a 100-turn web-search evaluation, context editing let agents finish workflows that would otherwise fail from context exhaustion, "while reducing token consumption by 84%."
  - Memory tool plus context editing gave +39% performance; context editing alone gave +29%.
  - The Decoder attributes the 84% to the combination; Anthropic's wording attributes it to context editing.
  - Sources: [Anthropic](https://www.anthropic.com/news/context-management); [The Decoder](https://the-decoder.com/anthropic-claims-context-engineering-beats-prompt-engineering-when-managing-ai-agents/)
- **Effort:** set with `output_config.effort`; the default is high, with options from low to max. It replaces `budget_tokens` as the way to control thinking depth on newer models. Third-party token ranges per effort level are unofficial. — [Anthropic effort docs](https://platform.claude.com/docs/en/build-with-claude/effort); [MindStudio (unofficial)](https://www.mindstudio.ai/blog/claude-effort-levels-better-results-without-overspending)
- **Task budgets (beta header `task-budgets-2026-03-13`):**
  - Supported on Opus 5.5, Sonnet 5.5 and Haiku 5.5, among others.
  - The token budget covers the whole agentic loop: thinking, tool calls, tool results and output. The model sees a server-side countdown and "finish[es] gracefully."
  - It is a "soft hint, not a hard cap"; `max_tokens` remains the enforced per-request limit. The minimum is 20,000 tokens.
  - A budget that is too small can cause refusal-like behaviour or early stops. Size it from the measured p99 of per-task spend.
  - Mutating `remaining` on each request breaks the cache, so set the budget once.
  - Source: [Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/task-budgets)
- **OWASP LLM10 (Unbounded Consumption):** missing limits on cost, latency or capacity are a listed top-10 risk. — [promptfoo](https://promptfoo.dev/docs/red-team/owasp-llm-top-10/)

### Inferences
These are calculations or design suggestions, not sourced claims.
- **Worked cost example (illustrative, not measured):** a 30-request loop that re-sends about 60k tokens of context each time.
  - Without caching: 1.8M input tokens × $4 = $7.20 of input.
  - With caching of the prefix: about 1.8M × $0.20 = $0.36, plus a one-off write of about 60k × $5 ≈ $0.30, plus new tokens.
  - Output at, say, 60k tokens costs $1.20.
  - So caching plausibly moves a run from about $8.50 to about $2, assuming the TTL is kept warm. A 5-minute TTL is refreshed by each request, so this holds as long as tool latency stays under 5 minutes.
- **Hard cap design:**
  - After each response, sum `usage` across requests (input, cache_creation, cache_read, output), price it, and stop the loop at $12. At about $10, inject a "finish and report" instruction.
  - Also set an iteration cap (for example 40 tool calls) and a per-request `max_tokens`.
  - Use the task budget only as a pacing signal, set once.
- **Keep the prefix stable:** freeze the tool definitions; don't toggle effort or `tool_choice` mid-run; put the masked packet digest in the cached system block; append per-turn content only at the end.
- **Smaller models for sub-agents:**
  - If map-reduce per document is adopted for injection isolation, the per-document readers could run on Sonnet 5.5 or Haiku 5.5 (Haiku 5.5 is 40x cheaper on input than Opus 5.5).
  - This must be validated with the eval suite: run the per-item recall comparison, paired by item.
- **Context editing:** clearing old tool results fits a packet-reading agent where earlier document reads go stale. It must not clear evidence a pending suggestion still needs to cite; the code verifier reads the source page anyway.

### Gaps
- I found no Anthropic-published figure for latency savings from caching on current models.
- I found no published per-effort-level token or quality curves for Opus 5.5.
- I found no measured cost data for document-review agents comparable to Taxmark; the $3-8 estimate should be checked against logged `usage` from real runs.
