# Agent patterns and context engineering (2025-2026), applied to Taxmark

Scope: the agent patterns vendors and practitioners have settled on, and how they decide what context an agent gets. The use case is Taxmark: a deterministic layer already produces lines, sources, findings, same-fact comparisons, proofs and leftovers. The agent investigates what the rules cannot settle, proposes suggestions that code verifies, and proposes new checks in words.
Dating key: **[2026]**, **[2025]**, **[older]** (2022-2024). Guidance is separated from marketing where it matters.

## Q1. What does Anthropic recommend (workflows vs agents, context engineering, multi-agent, tools), and when NOT to use an agent?

### Takeaway
Anthropic's line has stayed the same from Dec 2024 to Mar 2026. Use the simplest system that works, and prefer fixed workflows when the steps can be known in advance. Give the model "the smallest set of high-signal tokens", fetch further detail just in time through IDs, and spend real effort on tools. Use a separate, sceptical evaluator. Every part of the harness is an assumption to re-test as models improve. Multi-agent setups cost about 15x the tokens of chat and suit only parallel, low-dependency work.

### Cited Findings
**Building effective agents [older: 19 Dec 2024; the page now notes its tooling landscape has changed]**
- Workflows are "systems where LLMs and tools are orchestrated through predefined code paths". Agents are systems where "LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks." — [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- The building block is "an LLM enhanced with augmentations such as retrieval, tools, and memory" (the augmented LLM). — [same](https://www.anthropic.com/engineering/building-effective-agents)
- The five patterns and when to use each — [same](https://www.anthropic.com/engineering/building-effective-agents):
  - **Prompt chaining:** when the task "can be easily and cleanly decomposed into fixed subtasks".
  - **Routing:** "classifies an input and directs it to a specialized followup task". Use it when there are "distinct categories that are better handled separately".
  - **Parallelization:** sectioning ("independent subtasks run in parallel") or voting ("same task multiple times to get diverse outputs").
  - **Orchestrator-workers:** "a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results". Use it when subtasks cannot be predicted in advance.
  - **Evaluator-optimizer:** "one LLM call generates a response while another provides evaluation and feedback in a loop". Use it when there are "clear evaluation criteria" and refinement adds measurable value.
- When not to use an agent: start with "the simplest solution possible, and only increase complexity when needed", which may mean no agentic system at all. Agents trade latency and cost for performance. For many applications, optimising single LLM calls with retrieval and in-context examples is usually enough. — [same](https://www.anthropic.com/engineering/building-effective-agents)
- Three principles: keep the design simple, make planning steps visible, and carefully design the agent-computer interface (ACI). Call the APIs directly before reaching for frameworks, because frameworks obscure prompts and responses. "Poka-yoke" the tools: for example, requiring absolute file paths removed a recurring SWE-bench error. — [same](https://www.anthropic.com/engineering/building-effective-agents)

**Effective context engineering for AI agents [2025: 29 Sep 2025]**
- Context is "a finite resource with diminishing marginal returns". Each token draws on an "attention budget". Recall degrades as context grows ("context rot"). The goal is "the smallest set of high-signal tokens that maximize the likelihood of your desired outcome." — [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- System prompts should sit at the "right altitude", between brittle hard-coded logic and vague guidance. Organise them in XML or Markdown sections. Start minimal on the best model, then add instructions in response to observed failures. — [same](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Tools should be self-contained, robust to error and minimally overlapping. If "a human engineer can't definitively say which tool should be used", the agent cannot either. Prefer a few "diverse, canonical examples" over a laundry list of edge-case rules. — [same](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Just-in-time retrieval: agents keep "lightweight identifiers (file paths, stored queries, web links)" and load the data at runtime through tools (progressive disclosure). The trade-off is that runtime exploration is slower and needs guidance.
  - The hybrid that works: Claude Code puts CLAUDE.md in context up front and fetches the rest on demand with glob and grep.
  - Hybrid models may suit "less dynamic" domains such as legal or finance.
  - The overall advice is "do the simplest thing that works."
  — [same](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Long-horizon techniques — [same](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents):
  - **Compaction:** tune for recall first. Clearing old tool results is the low-risk first step.
  - **Structured note-taking:** a to-do list or NOTES.md kept outside the window.
  - **Sub-agents:** each works in a clean context and returns condensed summaries of 1,000-2,000 tokens.
  - How the article matches them to work: compaction for conversational flow, notes for iterative work with milestones, multi-agent for parallel research.

**How we built our multi-agent research system [2025: 13 Jun 2025]**
- The system is orchestrator-worker. A lead agent plans, saves its plan to Memory (context beyond 200k tokens gets truncated), spawns 3-5 parallel subagents and synthesises their results. A separate CitationAgent then attributes claims to sources. — [Anthropic, Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- Performance and cost — [same](https://www.anthropic.com/engineering/multi-agent-research-system):
  - Opus 4 lead with Sonnet 4 subagents "outperformed single-agent Claude Opus 4 by 90.2%" on an internal eval.
  - Token usage alone explained 80% of the variance on BrowseComp.
  - Agents use about 4x the tokens of chat; multi-agent systems use about 15x.
- Poor fit: domains where all agents must "share the same context" or have many dependencies, most coding work, and tasks whose value cannot cover the token cost. — [same](https://www.anthropic.com/engineering/multi-agent-research-system)
- Delegation needs an objective, an output format, tool guidance and task boundaries; vague briefs caused duplicated work. Effort should scale with complexity: simple fact-finding needs 1 agent and 3-10 tool calls. Evals can start small (about 20 queries), and the LLM judge works best as a single call that returns 0.0-1.0 scores plus pass/fail. — [same](https://www.anthropic.com/engineering/multi-agent-research-system)

**Writing effective tools for agents [2025: 11 Sep 2025]**
- "More tools don't always lead to better outcomes." Don't wrap every endpoint. Consolidate steps (`schedule_event` rather than list plus create). Prefer `search_logs` that "only returns relevant log lines" over `read_logs`. Use namespacing prefixes. — [Anthropic, Writing effective tools](https://www.anthropic.com/engineering/writing-tools-for-agents)
- Return meaningful context: prefer `name` over `uuid`, since resolving opaque IDs to meaningful language improved precision. Offer a `response_format` enum (`concise` or `detailed`). Paginate, filter and truncate, and tell the agent how to narrow when output is truncated. Claude Code caps tool responses at 25,000 tokens by default. Errors should say what went wrong and how to fix it. Develop tools against evals: realistic multi-step tasks with verifiable outcomes, tracking accuracy, call count, tokens and errors. — [same](https://www.anthropic.com/engineering/writing-tools-for-agents)

**Later Anthropic posts [2025-2026]**
- Code execution with MCP [4 Nov 2025]: loading every tool definition up front, and passing every intermediate result "through the model", wastes tokens.
  - Filter in code instead: "The agent sees five rows instead of 10,000."
  - A worked example drops from 150,000 to 2,000 tokens (98.7%).
  - `search_tools` offers detail levels: name; name and description; full schema.
  - Caveat: running agent-written code needs a sandbox.
  — [Anthropic, Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- Agent Skills [16 Oct 2025]: "Progressive disclosure is the core design principle". Name and description load at startup, the SKILL.md body loads when relevant, and bundled files load on demand. Deterministic operations such as sorting belong in code, not token generation. — [Anthropic, Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- Effective harnesses for long-running agents [26 Nov 2025] — [Anthropic, Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents):
  - An initializer agent writes a JSON feature list (200+ features, all marked failing) and later agents may change only `passes`. JSON was chosen because "the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files."
  - Agents work "one feature at a time".
  - Each session starts by reading progress files and the git log; the key insight is that "agents quickly understand the state of work when starting with a fresh context window."
  - Agents marked features done prematurely. End-to-end testing tools "dramatically improved performance".
- Harness design for long-running application development [24 Mar 2026] — [Anthropic, Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps):
  - Three agents (planner, generator, evaluator) that communicate through files.
  - Self-evaluating agents "confidently prais[e] the work". "Tuning a standalone evaluator to be skeptical turns out to be far more tractable" than making the generator self-critical.
  - The evaluator was calibrated with weighted criteria and few-shot score breakdowns.
  - Cost: solo run 20 min for $9; full harness 6 h for $200.
  - With Opus 4.6 the sprints were dropped, but the planner and evaluator stayed. The evaluator is worth its cost only when the task "sits beyond what the current model does reliably solo".
- Scaling Managed Agents [8 Apr 2026]: "harnesses encode assumptions about what Claude can't do on its own" and those assumptions "need to be frequently questioned". Context resets added for Sonnet 4.5 "had become dead weight" on Opus 4.5. The session is a durable log "outside Claude's context window" that the agent slices with `getEvents()`, because "it is difficult to know which tokens the future turns will need." — [Anthropic, Managed Agents](https://anthropic.com/engineering/managed-agents)
- The Anthropic Engineering index also lists "Demystifying evals for AI agents" [9 Jan 2026] and the "think" tool [20 Mar 2025]. Neither was read in depth for these notes. — [Anthropic Engineering index](https://www.anthropic.com/engineering)

### Inferences
- The deterministic layer that already exists is the "workflow" half. The agent should be a narrow augmented LLM placed at the points where rules cannot decide (free text, leftovers). That is Anthropic's recommended shape, not a compromise.
- The verifier that checks every suggestion in code is Anthropic's "separate sceptical evaluator", in its strongest form. A deterministic evaluator is not lenient the way an LLM evaluator is.
- Anthropic's JSON-feature-list finding argues for keeping the agent's working state (open questions, hypotheses, proposals) in a typed JSON ledger that only the harness mutates.

### Gaps
- The "Demystifying evals" (Jan 2026) and "think" tool posts were not fetched.
- Anthropic says little directly about regulated or financial review agents beyond the remark that hybrid retrieval may suit legal and finance.

## Q2. OpenAI, Google ADK, LangGraph, ReAct, Reflexion: what converges?

### Takeaway
Every vendor recommends the same four things:
- start with one agent and tools, and add agents only on evidence;
- put fixed steps in deterministic code or workflow agents and let the LLM decide only where judgement is needed;
- separate generating from validating (generator-critic or evaluator-optimizer);
- have a human approve high-stakes or irreversible actions.

The academic patterns (ReAct, plan-and-solve, Reflexion) are the older substrate these product guides build on.

### Cited Findings
**OpenAI, A practical guide to building agents.** The PDF carries no date; it is widely reported as April 2025, which is unverified here, so treat it as [2025].
- An agent "leverages an LLM to manage workflow execution and make decisions", "recognizes when a workflow is complete", and can "halt execution and transfer control back to the user." "Single-turn LLMs, or sentiment classifiers—are not agents." — [OpenAI guide](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- Build agents where "deterministic and rule-based approaches fall short". The fraud example: a rules engine "works like a checklist", while an agent works "like a seasoned investigator… identifying suspicious activity even when clear-cut rules aren't violated."
  - The three criteria are complex decision-making, difficult-to-maintain rules, and "heavy reliance on unstructured data".
  - "Otherwise, a deterministic solution may suffice."
  — [same](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- The three foundations are model, tools and instructions. Prototype with the most capable model, set up evals to establish a baseline, then swap in smaller models where they still meet the bar. Tools fall into data, action and orchestration types. — [same](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- Instructions: "use existing operating procedures… or policy documents to create LLM-friendly routines". Break dense resources into smaller steps. Make "every step… correspond to a specific action or output". Capture edge cases. Advanced models can turn source documents into numbered agent instructions. — [same](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- "Maximize a single agent's capabilities first… often a single agent with tools is sufficient." Split only for complex logic (many if-then branches) or tool overload, which depends on overlap rather than count: ">15 well-defined, distinct tools" can work while "<10 overlapping tools" can fail.
  - The two multi-agent forms are manager (agents as tools) and decentralised handoffs.
  - Every run is a loop with exit conditions: a final-output tool, a reply with no tool calls, an error, or a maximum number of turns.
  — [same](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- Guardrails are layered and come in several types: LLM-based, rules-based (regex), output validation, and tool safeguards rated low, medium or high by read versus write, reversibility and financial impact. Human intervention is triggered by exceeded failure thresholds and by high-risk actions. — [same](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)

**Google ADK [2025: Developer's guide to multi-agent patterns, 16 Dec 2025, Shubham Saboo]**
- Eight patterns — [Google Developers Blog](https://developers.googleblog.com/en/developers-guide-to-multi-agent-patterns-in-adk/):
  - Sequential Pipeline ("linear, deterministic, and refreshingly easy to debug")
  - Coordinator/Dispatcher (LLM routing)
  - Parallel Fan-Out/Gather
  - Hierarchical Decomposition (for when "a task is too big for one agent context window")
  - Generator and Critic ("separate the creation of content from the validation of content"; for correctness gates such as compliance)
  - Iterative Refinement (qualitative polish with a maximum number of iterations)
  - Human-in-the-Loop ("a human must authorize high-stakes actions")
  - Composite
- SequentialAgent and ParallelAgent fix execution order in code, while the coordinator "relies on LLM-driven delegation" from sub-agent descriptions. State passes through `output_key` into shared `session.state`, with unique keys in parallel to avoid races. The advice is to start with a simple sequential chain. — [same](https://developers.googleblog.com/en/developers-guide-to-multi-agent-patterns-in-adk/)

**LangGraph / LangChain**
- LangGraph's docs adopt Anthropic's taxonomy word for word: workflows "have predetermined code paths", agents "define their own processes and tool usage". Evaluator-optimizer is recommended where there are "clear success criteria" (the docs' example is translation). This came through a search snippet, not a fetched page. — [LangChain docs, Workflows and agents](https://docs.langchain.com/oss/langgraph/workflows-agents)
- Plan-and-execute [older: 13 Feb 2024] — [LangChain blog, Planning agents](https://www.langchain.com/blog/planning-agents):
  - Structure: a planner writes a multi-step plan, executors run the steps with tools, and a replanner decides whether to finish or plan again.
  - Its case against ReAct: ReAct "requires an LLM call for each tool invocation" and "only plans for 1 sub-problem at a time". Plan-and-execute is faster, cheaper (smaller executor models) and forces the planner to "think through" every step.
  - Variants: ReWOO adds variable assignment, and LLMCompiler streams a DAG of tasks (claimed 3.6x speedup).
  - Cited papers: Plan-and-Solve (arXiv:2305.04091), ReAct (arXiv:2210.03629).

**Academic [older]**
- Reflexion (Shinn et al., Mar 2023, revised Oct 2023) reinforces agents "not by updating weights, but instead through linguistic feedback". Reflections are stored in an episodic memory buffer, and the feedback can be scalar or free-form, external or internally simulated. It reports 91% pass@1 on HumanEval against 80% for GPT-4. — [arXiv:2303.11366](https://arxiv.org/abs/2303.11366)

**Practitioner counterpoints [2025]**
- Cognition, "Don't build multi-agents" (Walden Yan, 12 Jun 2025) — [Cognition](https://cognition.com/blog/dont-build-multi-agents):
  - "Share context, and share full agent traces, not just individual messages."
  - "Actions carry implicit decisions, and conflicting decisions carry bad results." In the Flappy Bird example, parallel subagents produce incompatible pieces.
  - The recommendation is "a single-threaded linear agent", with a compression model for long histories.
- Manus, context-engineering lessons (Yichao 'Peak' Ji, 18 Jul 2025) — [Manus blog](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus):
  - KV-cache hit rate is "the single most important metric for a production-stage AI agent".
  - Keep a stable prefix (no timestamps at the top) and make context "append-only".
  - Mask tools rather than removing them mid-task.
  - Use the filesystem for restorable compression (drop the page, keep the URL).
  - Recite goals through a todo.md file.
  - Keep errors in context.
  - "Don't few-shot yourself into a rut."
- The two counterpoints are reconciled in Anthropic's own position: multi-agent "is not a good fit" where agents must share context or depend on each other. — [Anthropic, Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)

### Inferences
- The points of convergence, mapped to Taxmark:
  - **Deterministic first:** the existing engine is the workflow.
  - **One agent with a few distinct tools:** below roughly 10-15 non-overlapping tools.
  - **Separate validator:** the code verifier.
  - **Human approval:** the reviewer accepts suggestions.
  - **Explicit exit conditions:** a final structured-output tool plus a turn budget.
- "Vendor-neutral" framework marketing (ADK's eight named patterns, framework abstractions) adds names, not new mechanisms. All three vendors warn to start with the simplest sequential or single-agent form.

### Gaps
- No primary vendor source quantifies single-agent against multi-agent performance for review or audit tasks. Anthropic's 90.2% figure is for open-web research.
- A LangGraph supervisor-pattern page was not fetched. The supervisor pattern appears to be the same as OpenAI's manager and Anthropic's orchestrator-workers, but that equivalence comes from the descriptions, not a cited comparison.

## Q3. What should the starting context be, and how is a processed domain model and domain knowledge represented?

### Takeaway
Practitioners use a hybrid:
- a small, stable, high-signal starting context: role, goal, an index or state map with IDs and counts, and the output contract;
- detail fetched just in time through narrow, ID-addressed tools that return concise or detailed views;
- domain knowledge split three ways: procedure goes in instructions or skills, written as numbered actionable routines; reference material is fetched on demand; deterministic computation stays in code;
- working state in a structured file or ledger the harness controls.

Raw source documents are not pre-loaded.

### Cited Findings
- Starting context: aim for "the smallest set of high-signal tokens". Agents hold "lightweight identifiers" and fetch at runtime. Use a hybrid of up-front essentials plus on-demand retrieval, which may suit "legal or finance". — [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Orientation through a state map: long-running agents start by reading a progress file, the git log and a JSON feature list, so they "quickly understand the state of work when starting with a fresh context window." JSON is used because models are less likely to overwrite it than Markdown. — [Anthropic, Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Progressive disclosure: three levels (metadata, then body, then files) for knowledge and tool definitions, so bundled context is "effectively unbounded". — [Anthropic, Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills); [Anthropic, Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- Tool output design — [Anthropic, Writing effective tools](https://www.anthropic.com/engineering/writing-tools-for-agents):
  - Semantic names over UUIDs.
  - `response_format` with concise and detailed options.
  - Filter, paginate and truncate, with hints on how to narrow.
  - Consolidated, task-shaped tools such as `search_logs`.
- Filter data in code before it reaches the model ("five rows instead of 10,000"). — [Anthropic, Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- Domain knowledge as instructions: convert existing SOPs and policy documents into LLM-friendly numbered routines in which "every step… correspond[s] to a specific action or output". Use templated prompts with policy variables instead of many prompts. — [OpenAI guide](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- Deterministic work belongs in code ("sorting… is far more expensive" through tokens). — [Anthropic, Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- Keep the full record outside the window and fetch slices of it, because what future turns need cannot be predicted. — [Anthropic, Managed Agents](https://anthropic.com/engineering/managed-agents)
- Keep the prefix stable and context append-only for cache hits, and use restorable compression (keep the ID, drop the body). — [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- Few-shot: use "diverse, canonical examples" over rule lists. Manus warns that repetitive examples cause mimicry. — [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents); [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)

### Inferences (Taxmark-specific)
- These directly support the owner's rejection of stuffing in the raw README, firm standards and brief. The guidance converges on a compact processed packet in the starting context. A sketch of what that packet holds:
  - **Case summary:** household, return version, totals.
  - **State map:** each line ID with value, source IDs and proof status; finding IDs by check family and severity; same-fact disagreements; unexplained leftovers with amount and line.
  - **Counts.**
  - **Output contract:** the suggestion and new-check schema.
- Detail comes through ID-addressed tools, for example `get_line(id)`, `get_fact_copies(fact_id)`, `get_document_field(doc_id, field)`, `search_free_text(query)` and `get_rule(rule_id)`.
- The README's field definitions become a schema and glossary the tools return on demand. They should not be pasted as prose.
- Firm standards become a numbered routine in the system prompt, at "right altitude", plus rule lookups. Arithmetic and tax computation stay in code. The agent should never recompute a line by generating tokens.

### Gaps
- No source gives a formal schema for "domain state maps" in finance or tax agents. The representation above is inferred from coding-agent and tool-design guidance.
- No vendor quantifies context-rot thresholds; the effect is described qualitatively only.

## Q4. Which pattern fits a bounded investigative review over a structured dataset with a verifier? Cost, latency and reliability trade-offs

### Takeaway
Best fit: a **workflow-wrapped single agent with a deterministic evaluator**. A deterministic step selects the open items (leftovers, free text, unresolved disagreements). One ReAct-style tool-using agent investigates each item, or a batch of items, with a turn budget. Every proposal passes through the code verifier, and rejections go back with reasons, which is evaluator-optimizer or Reflexion with a hard-coded judge. A human accepts the verified proposals.

Orchestrator-workers by area is justified only if the items are truly independent and the volume is high. It costs about 15x the tokens of chat and risks decisions that conflict across areas. Plan-and-execute adds little when the "plan" is already the deterministic list of open items.

### Cited Findings
- Orchestrator-workers suits work whose subtasks are unpredictable. Evaluator-optimizer suits clear criteria. Routing suits distinct categories. — [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- Multi-agent costs about 15x the tokens of chat (agents about 4x). It is a poor fit where context is shared or dependencies are many. Token use explains 80% of the performance variance. — [Anthropic, Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- Parallel subagents make conflicting implicit decisions; prefer a single-threaded agent. — [Cognition](https://cognition.com/blog/dont-build-multi-agents)
- A separate, sceptical evaluator is "far more tractable" than self-critique. It is worth its cost only beyond the model's solo reliability. The full harness cost $200 against $9 solo. — [Anthropic, Harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Generator and Critic is aimed at correctness gates such as compliance review. — [Google Developers Blog](https://developers.googleblog.com/en/developers-guide-to-multi-agent-patterns-in-adk/)
- Plan-and-execute cuts LLM calls compared with ReAct but stays serial, and replanning is needed when steps fail. — [LangChain blog, Planning agents](https://www.langchain.com/blog/planning-agents)
- Linguistic feedback from external sources improves later attempts. — [Reflexion, arXiv:2303.11366](https://arxiv.org/abs/2303.11366)
- Exit conditions (final-output tool, maximum turns) and failure thresholds that escalate to a human. A single agent is sufficient until tools overlap or the logic branches heavily. — [OpenAI guide](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- Agents prematurely declare things done, so give them a structured list of items with pass/fail status that only verification can flip. — [Anthropic, Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Effort scales with complexity: simple tasks need 1 agent and 3-10 tool calls. — [Anthropic, Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)

### Inferences
**Trade-offs by pattern**

| Pattern | Cost | Latency | Reliability |
|---|---|---|---|
| Single agent + code verifier loop | Lowest. Tokens scale with the number of open items. | Serial, but parallel tool calls help. | Highest: one context, deterministic judge. |
| Parallelization by item (sectioning) | Linear | Lower, since items run concurrently | Good, as long as each item is self-contained. Investigations need only the item plus the shared state map, so the Cognition objection is weak. |
| Orchestrator-workers by area (wages, investments, K-1s) | About 15x chat | Lower wall time | Lower: synthesis must merge decisions across areas, and same-fact links cut across areas. |
| Plan-and-execute | Fewer calls than ReAct | Moderate | Redundant here, because the engine already produces the plan. |

**Recommended shape and controls**
- Parallelization by item is a good option for a later round.
- Proposing new checks "in words" is an open-ended generation step. It should go through an LLM rubric judge (a single call, 0-1 score plus pass/fail) and then human review, because code cannot verify a check that does not exist yet.
- Re-test the harness pieces as models improve: per Anthropic's 2026 posts, scaffolding becomes "dead weight".

### Gaps
- No public case study was found of an LLM agent used on tax or audit workpaper review. The fit is reasoned from general guidance.
- No sourced benchmark compares the cost of single-agent and orchestrator setups on structured-dataset review.
