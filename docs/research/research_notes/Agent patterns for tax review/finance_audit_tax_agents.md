# Agentic AI for document-heavy verification in finance, audit and tax

Research pass: 24 Oct 2026 (session date). About 18 search/fetch calls. "Measured" means a number from a paper or benchmark; "Claim" means vendor or press statement with no published method. Material from 2023 to mid-2025 is marked [older].

## Products and case studies 2024-2026: what agent structure do they describe?

### Takeaway
Every vendor follows the same pattern: deterministic or extracted structured data at the bottom, agents for orchestration and judgement, every data point linked back to its source, and a human sign-off gate. Basis is the only vendor that has described its internals in any depth: a supervisor with nested sub-agents, voting on hard decisions, fresh-instance reviewers, and process-based evaluation against behaviour specs. No vendor publishes accuracy numbers with a stated method.

### Cited Findings
- **Basis (accounting agents).** Uses a multi-agent architecture with a supervising agent that routes steps to specialised sub-agents and assigns models per job (o3, o3-Pro, GPT-4.1, GPT-5). Claim: firms save "up to 30%" of time — [OpenAI case study](https://openai.com/index/basis); routing detail from secondary coverage — [llmbase](https://llmbase.ai/news/openai-o3-gpt-5-and-gpt-4-1-power-basis-ai-agents-for-accounting-automation)
- Basis 2026 talk (co-founder Mitch Troyanovski) — all from a [ZenML summary](https://www.zenml.io/llmops-database/building-long-horizon-autonomous-agents-for-complex-accounting-work):
  - Runs last hours to days, with thousands of inference steps. Sub-agents nest up to about seven layers deep.
  - On hard decisions, several sub-agents attempt the same problem and vote.
  - Reviewers are fresh sub-agent instances, so they are not biased by the trajectory they are reviewing.
  - The "ontology" is at its simplest a file-system structure, optionally with metadata, graph relations and embeddings. It also holds agents' notes, so a new instance can rebuild prior state ("Memento"-style self-written memory).
  - Verification copies accounting practice: independent review, deterministic checks (e.g. a trial balance sums to zero, no Excel errors), and expert-judgement checks written as LLM judges.
  - Outcome-only evaluation is called insufficient. An agent that gets tax answers right from memory or blogs, without citing primary sources, "would not be hired." Behaviour specs are markdown files that serve both as alignment docs for humans and as grading rubrics for LLM judges.
  - Judges are agents themselves: they traverse long trajectories to find where a behaviour triggered. A complex 1065 return takes 20+ human hours and involves 500–1,000 documents.
- **Thomson Reuters CoCounsel (tax/audit/accounting).**
  - Agentic launch June 2025 [older], built partly on the Materia acquisition; agents "plan, reason, act, and react" across multi-step workflows — [Accountancy Age](https://accountancyage.com/2025/06/02/thomson-reuters-launches-agentic-ai-for-tax-and-accounting-professionals/)
  - The "Ready to Review" 1040 agent ingests source documents and prior-year returns, extracts and categorises data, and produces a return ready for professional review.
  - The Nov 2025 release added Document Analysis and an "Audit Intelligence Test", with AICPA/FASB/GASB/IFRS content wired into the workflow. Claim: jurisdiction reviews went from half a week to under an hour; 1,300+ firms use it — [Thomson Reuters press release](https://www.thomsonreuters.com/en/press-releases/2025/november/thomson-reuters-launches-agentic-ai-solutions-to-transform-tax-audit-and-accounting-workflows.html); [CPA Practice Advisor](https://www.cpapracticeadvisor.com/2025/11/05/thomson-reuters-launches-agentic-ai-solutions-to-transform-tax-audit-and-accounting-workflows/172307/)
- **Black Ore Tax Autopilot.** Pipeline: classify documents (W-2, 1099, K-1, brokerage, bank) → extract data → "resolve discrepancies between them" → apply federal/state tax logic → generate supporting workpapers. Each data point links to its source document, items needing attention are flagged, and a professional signs off. No internals or accuracy published — [Accounting Today](https://www.accountingtoday.com/news/black-ores-tax-autopilot-now-generally-available); [International Accounting Bulletin](https://www.internationalaccountingbulletin.com/news/black-ore-opens-tax-autopilot-ai-platform-to-more-cpa-practices/)
- **KPMG Clara.**
  - July 2024 [older]: generative-AI assistants that flag risk factors in documents such as board minutes, plus a methodology-aware assistant for designing substantive tests — [Accountancy Age](https://www.accountancyage.com/2024/07/30/kpmg-integrates-ai-into-smart-audit-platform)
  - April 2025 [older]: AI agents for substantive procedures (expense vouching, search for unrecorded liabilities, accrued expenses), a Financial Report Analyzer for disclosure checklists, and controls-testing agents to follow. Human-in-the-loop; 95,000 auditors — [KPMG press release](https://kpmg.com/xx/en/media/press-releases/2025/04/kpmg-advances-ai-integration-in-kpmg-clara-smart-audit-platform.html)
  - Note: KPMG's split is per audit procedure, i.e. specialist agents by area.
- **EY.** April 2026: a multi-agent framework on Azure/Foundry/Fabric embedded in EY Canvas (130,000 professionals, 160,000 engagements, 1.4 trillion journal-entry lines a year). "Human-led, AI-powered"; full end-to-end audit coverage targeted by 2028. Names no individual agents and reports no measured outcomes — [EY press release](https://www.ey.com/en_gl/newsroom/2026/04/ey-launches-enterprise-scale-agentic-ai-to-redefine-the-audit-experience-for-the-ai-era)
- **Deloitte Zora AI** (March 2025) [older]. Finance agents for expenses, invoices and working capital. Claim: 25% cost reduction and 40% productivity gain in internal expense management. This is enterprise finance work, not audit verification — [Deloitte press release](https://www.deloitte.com/us/en/about/press-room/deloitte-unveils-zora-ai-agentic-ai-for-tomorrows-workforce.html)
- **Anthropic.** May 2026: 10 finance agent templates (pitchbooks, credit memos, KYC screening, month-end close) on Claude Opus 4.7. Anthropic cites 64.37% on Vals Finance Agent — [Quartz](https://qz.com/anthropic-ai-agents-financial-services-banks-insurers-050526)

### Inferences
- The common pattern is: extract to a structured record with source links, run deterministic rules, let agents work on exceptions and discrepancies, then a human gate. That is the architecture Taxmark already has, so the agent sits in the place the industry puts it.
- The Basis practices that transfer most directly to Taxmark:
  - A fresh-context reviewer, so the verifier never sees the investigator's reasoning.
  - Voting or repeated attempts on hard calls.
  - Behaviour specs used as judge rubrics, e.g. "cites the source field" and "does not restate a rule finding."
  - Persisted notes or state, so later runs build on earlier ones.

### Gaps
- No public internals or accuracy figures for Intuit (its tax agents), PwC (searches returned only unrelated tax-review service pages), or MindBridge (not searched for lack of budget). Deloitte has nothing specific to audit.
- No vendor publishes an error-detection rate against a known-error set. Every efficiency figure is self-reported.

## Research and benchmarks: which design choices measurably improved accuracy?

### Takeaway
The strongest measured result is that executable, deterministic verification does almost all the work. In AuditFlow, a checker alone scores 86.7%, the full multi-agent system 87.7%, and a single agent 68.6%. Agents add only a small margin on top of good checker coverage. A second measured result: models that compute natively fail tax arithmetic (TaxCalcBench: at most about 32% of returns fully correct, even from structured input). Decomposing the work by domain (AuditAgent) and using tools more often (Vals) also produce measured gains.

### Cited Findings
- **AuditFlow** (arXiv 2606.03031, Oct 2026) — [alphaXiv](https://www.alphaxiv.org/abs/2606.03031):
  - Design: a graph-grounded multi-agent system over an *executable symbolic environment*. A US-GAAP taxonomy graph is linked to filing-specific XBRL facts, with typed tools for retrieval, traversal, computation and rule evaluation. LLM agents decide *where to look*; the symbolic layer *computes*.
  - Roles: two specialist auditors (a regulatory view and an evidentiary view) plus a senior auditor who triggers refinement when they disagree. Deterministic tools produce the evidence, and "evidential aggregation" combines the reports, including agent-declared overrides.
  - Measured, Claude Sonnet 4.6, 1,000 recorded data-quality-rule violations: AuditFlow 87.70%, checker-only 86.70%, single agent 68.60%. The authors say executable verification is "the main source of accuracy", and that further gains from agent judgement depend on the backbone model and checker coverage.
- **AuditAgent** (arXiv 2510.00156, 2025) — [arXiv](https://arxiv.org/html/2510.00156v1):
  - Design: a Bayesian prior over which accounting subjects carry fraud risk cuts the search from 60–80 subjects to 15. Per subject, it runs sparse plus dense retrieval. Then a hierarchy of experts: single-document experts look for contradictions inside one document, subject experts look at trends across periods, a cross-document expert aggregates, and a meta-expert assembles evidence chains.
  - Data: 1,570 fraud cases from China Securities Regulatory Commission enforcement records.
  - Measured with DeepSeek-R1:
    - Issue-level recall: 28.91 (AuditAgent) vs 26.20 (single LLM) vs 16.53 (general-purpose agent).
    - Evidence-level recall: 23.29 vs 20.72 vs 12.74.
    - A general-purpose agent did *worse* than a single LLM call on every backbone tested.
    - Single LLMs degrade as input length grows; agent methods hold steadier.
    - Priors add about 5–6% (the paper does not say whether absolute or relative).
    - Only recall is reported, no precision.
- **TaxCalcBench** (Column Tax, arXiv 2507.16126, July 2025) [older] — [arXiv](https://arxiv.org/html/2507.16126v1):
  - Setup: 51 tax-year-2024 federal returns, 4 runs each. Input is *structured JSON*, not documents.
  - Best strict score (every field correct): Gemini 2.5 Pro 32.35%; lenient (±$5) 51.96%. Claude Opus 4: 27.45% strict, 42.65% lenient.
  - Failure modes:
    - Using bracket formulas instead of the IRS Tax Table, which fails an estimated 15–20% of cases.
    - Calculation errors that cascade through dependent forms (e.g. Form 8962, Schedule 2).
    - Wrong eligibility calls on credits (Child Tax Credit, Earned Income Tax Credit).
  - More thinking budget helped Claude (Opus 4: 7.8% → 27.5%) but not Gemini 2.5 Pro (flat at about 28–32%).
  - Tools such as a calculator or table lookup were *not* tested; the authors list scaffolding as future work.
  - A secondary source reports GPT-5 at 41.7%; not confirmed against the paper — [DEV](https://dev.to/rawveg/when-ai-files-your-taxes-5cfp)
- **Vals Finance Agent Benchmark** (arXiv 2508.00828):
  - Setup: 537 expert-written financial research tasks in nine categories. The harness provides EDGAR search, Google search, an HTML parser and a retrieval tool.
  - Measured: o3 best at 46.8% ($3.79/query) in the paper. Models that called tools more often (o3, Claude 3.7 Sonnet Thinking) scored higher; Llama 4 Maverick often skipped tools entirely — [arXiv](https://arxiv.org/pdf/2508.00828); [The Decoder](https://the-decoder.com/benchmark-shows-ai-agents-cant-yet-replace-human-analysts-in-finance/)
  - v1.1 leaderboard snapshot, June 2026: Claude Opus 4.7 64.37%, Sonnet 4.6 63.33% — [BenchLM mirror](https://benchlm.ai/benchmarks/valsfinanceagentv11)
  - v2 (May 2026) top score was under 52% in May and 60.6% by August; scores are not comparable to v1.1 — [AllMind](https://allmind.ai/research/ai-financial-research-benchmarks-explained). Secondary sources only; check [vals.ai](https://vals.ai/benchmarks/finance_agent).
  - Fintool claims 90% vs Claude's 55% with a purpose-built finance agent. Vendor claim — [Fintool](https://fintool.com/benchmark/finance-agent-benchmark-fintool)
- **FinanceBench** (Patronus, Nov 2023) [older] — [arXiv](https://arxiv.org/abs/2311.11944v1):
  - GPT-4-Turbo with retrieval answered wrongly or refused 81% of questions.
  - A shared vector store across all filings scored about 19% correct.
  - Secondary figures, not confirmed against the paper: per-document store 50%, long context 76–79%, oracle passage 85% — [beancount research log](https://beancount.io/bean-labs/research-logs/2026/05/12/financebench-open-book-financial-qa-benchmark)
- **Structured-finance asset review** (arXiv 2405.04294, 2024) [older]: multi-agent extraction and checking of loan and bank-statement PDFs, with a GPT-4 evaluation agent — [arXiv](https://arxiv.org/pdf/2405.04294). Results not retrieved.

### Inferences
- AuditFlow is the closest published analogue to Taxmark: a deterministic checker plus agents over structured facts. Its result predicts that Taxmark's agent will add a *narrow* margin over its rules. So the agent should be judged on what the rules miss (the unexplained remainder), not on total recall.
- Taxmark's two runs (blind tool-using agent: 22 of 27; one-document-at-a-time reader: 13 of 27) match the literature in direction:
  - FinanceBench: scoping to one document at a time loses the cross-document contradictions.
  - AuditAgent: a cross-document expert is a separate stage from the single-document experts.
- Arithmetic should never be left to the model (TaxCalcBench). Any number in an agent proposal should be recomputed by the deterministic layer before it is shown.
- AuditAgent's finding that "a general-purpose agent is worse than a single call" is a warning: an agent without domain structure (risk priors, decomposition by area) can lose to a simple read.

### Gaps
- No benchmark measures *detection of planted errors* in a tax return against source documents. TaxCalcBench measures computing a return, not reviewing one. Taxmark's 27-mistake set is unusual.
- The AuditFlow ablations on the graph and the junior/senior review are not in the abstract; the full paper would be needed.
- No controlled study found on self-verification or critic loops in finance specifically.

## Knowledge-graph or structured-state approaches: when do they beat raw retrieval?

### Takeaway
Graph or structured fact layers win on multi-hop, relational, cross-document questions. They give little or nothing on single-document or tabular lookups. Most finance GraphRAG evidence comes from vendors; the most credible structured-state result is AuditFlow, where the taxonomy graph and the facts are executable rather than just retrievable.

### Cited Findings
- Lettria/AWS hybrid GraphRAG on complex documents including Amazon financial reports: 81.67% vs 57.50% (vector RAG) correct. On tabular reasoning questions, results were *identical* to vector RAG. Vendor-run, small hand-graded set — [Lettria](https://www.lettria.com/blogpost/vectorrag-vs-graphrag-a-convincing-comparison); [AWS ML blog](https://aws.amazon.com/jp/blogs/machine-learning/improving-retrieval-augmented-generation-accuracy-with-graphrag/)
- Neo4j/WhyHow.AI financial-report comparison concludes that combining graph and vector search works best. Numbers not retrieved — [Neo4j](https://neo4j.com/blog/developer/knowledge-graph-vs-vector-rag)
- Financial sentiment with graph-augmented retrieval (arXiv 2606.00062): +6.4% entity recall (p<0.001), no loss in answer quality, 22.6% higher latency — [arXiv](https://arxiv.org/pdf/2606.00062)
- AML setting (arXiv 2512.06240): on multi-hop questions, GraphRAG's faithfulness was 0.83–0.87, while vector RAG's answer relevancy collapsed to 0.03–0.12 — [arXiv](https://arxiv.org/pdf/2512.06240)
- AuditFlow: a US-GAAP taxonomy graph plus filing facts, with typed traversal and compute tools. Executable verification is the main source of accuracy — [alphaXiv](https://www.alphaxiv.org/abs/2606.03031)
- Basis: "ontology" ranges from a plain file system to added metadata, graph and embeddings. More enrichment can move to inference as models get cheaper — [ZenML](https://www.zenml.io/llmops-database/building-long-horizon-autonomous-agents-for-complex-accounting-work)

### Inferences
- Taxmark's "fact copies" (every copy of a fact across sources) already form a small relational graph. Handing the agent typed tools over it ("all copies of fact X", "lines that depend on X", "prior-year value") is the AuditFlow pattern and should beat feeding the agent raw documents for cross-document mistakes.
- For a single household of about 74 documents, a full GraphRAG build is not justified. The structured fact table is already the graph.

### Gaps
- No independent, standardised financial-document benchmark comparing graph and vector approaches head to head.

## Run-to-run variance and how teams evaluate agents

### Takeaway
pass@k (solved on at least one of k runs) overstates what an agent can do reliably; pass^k (solved on every one of k runs) is the reliability measure, and agents drop sharply under it. Practitioners judge both process and outcome, use agent judges with written rubrics, and use repeated attempts with voting for hard calls. For a detection task like Taxmark's, report the union across runs (coverage), the intersection (reliable core), and judged precision.

### Cited Findings
- τ-bench (arXiv 2406.12045, 2024) [older] defines pass^k as the probability that all k i.i.d. trials succeed. Unlike pass@k, which needs one success, it measures consistency — [arXiv](https://arxiv.org/pdf/2406.12045)
- GPT-4o retail: about 61% at pass@1, under 25% at pass^8 — [beancount summary of τ-bench](https://beancount.io/bean-labs/research-logs/2026/06/12/tau-bench-tool-agent-user-interaction-real-world-domains). A blog figure of 0.383 is pass@4, not pass^4, so the two are not comparable.
- Follow-on work: ReliabilityBench adds fault injection and perturbations on top of pass^k — [arXiv](https://arxiv.org/html/2601.06112v1). A long-horizon reliability paper argues pass^k degradation with task duration is understudied — [arXiv](https://arxiv.org/pdf/2603.29231)
- TaxCalcBench ran every model 4 times per thinking level and reports averages — [arXiv](https://arxiv.org/html/2507.16126v1)
- Basis uses process-based evaluation (behaviour specs as judge rubrics), agentic judges that traverse trajectories, multi-agent voting on hard decisions, and deterministic checks — [ZenML](https://www.zenml.io/llmops-database/building-long-horizon-autonomous-agents-for-complex-accounting-work)
- AuditAgent reports recall only and deliberately leaves out precision ("auditors value broad early-warning coverage"). That is a known blind spot — [arXiv](https://arxiv.org/html/2510.00156v1)

### Inferences
- For Taxmark, report for N runs:
  - The union of mistakes found (pass@N-style coverage).
  - The intersection (pass^N-style reliable core).
  - The per-mistake hit rate.
  - Judged precision of suggestions: what fraction are real issues, not restatements of rule findings.
- "22 of 27" from one blind run is a single sample. Run-to-run variance could move it several points.
- Running k times and taking the union, then passing every candidate through a deterministic verifier gate, combines the pass@k gain with the precision of AuditFlow's executable checks.

### Gaps
- No published variance figures for finance or audit agents specifically.
- No standard metric for "judged precision of proposed checks"; teams use LLM judges with rubrics (Basis) without publishing how well those judges agree with humans.
