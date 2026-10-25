# AI reader and harness

The AI layer of Taxmark runs **at ingest, before the backend, never from the UI**. A reader reads the packet's free text
and writes a structured payload (shape `AiPayload` in `src/domain/ai/contract.ts`). In production the reader runs in the
cloud over the encrypted packet and stores its payload encrypted in the private Blob store; on a laptop it writes the
eval payload `ai/eval/ai-suggestions.json`, which stays with the code (client data leaves the deploy, eval data does not). The
backend treats that file as untrusted input: it re-checks the schema and the grounding before any suggestion reaches a
screen, and a reviewer must accept a suggestion before it becomes a finding. A harness scores the reader against the
known mistakes before anyone trusts it.

## Files

| File | What it does |
|---|---|
| `ai/reader.ts` | CLI: one Messages API call per document, writes the payload and a run-meta file (tokens, cost) |
| `ai/harness.ts` | CLI: scores a payload against the ledger, writes `docs/handin/ai-scorecard.md` |
| `ai/lib/reader-core.ts` | Context building, masking, request, schema, row validation, retry, the run loop (pure apart from an injected fetch) |
| `ai/lib/harness-core.ts` | Gold set, grounding, matching, scoring, the scorecard text (pure) |
| `src/server/ai-reader.ts`, `src/app/api/internal/ai-reader/route.ts` | The reader in the cloud (see below) |
| `ai/agent.ts` | CLI: the agent (one investigation over the whole packet with the deterministic tools); writes `ai/eval/runs/<version>/<mode>.<packet>.<n>.json` with its run meta and trace (the live `ai/eval/agent-suggestions.json` only with `--live`, agent-v3 default real only). Never run without an approved budget |
| `ai/lib/agent-core.ts` | The agent loop on the Anthropic SDK tool runner: context, guards (iteration cap, wall-clock abort, cost budget, refusal and max_tokens stops), final-answer validation, proposals, writing only a finished run |
| `ai/lib/agent-tools.ts` | The nine tools in default mode, eight in blind (blind drops `run_checks`): `get_line`, `get_page`, `search_values`, `verify`, `run_checks`, `list_open_leftovers`, `record_suggestion` (checks a suggestion at once and keeps it), `verify_all` (the whole-return sweep, `ai/lib/verify-all.ts`) and `lookup` (agency records, prior year, what was known when, client text, diagnostics, alternatives; `ai/lib/lookup.ts`): masked, labelled as data with the run's budget (turn k of N), bounded, SSN-scanned; findings leave without ledger, finding or check ids |
| `ai/lib/calculator.ts` | The `verify` tool's methods (`recompute_line`, `sum_to`, `prior_year`, `fact_copies`, `glossary`, `compare_to_limit`, `convert`, `duplicates`): ids in, numbers computed by our code. Last year's return is found by shape (`priorReturn`: the `return_YYYY` key in `prior_years`), shared with `lookup` and `verify_all` |
| `ai/lib/case-file.ts` | The agent's cached context: schema card, review steps, digest, state map (P/F/O/E), work list, documents, client text |
| `ai/lib/domain-digest.md` | The short review-method digest in the agent's context (from `docs/research`; no ledger content) |
| `ai/lib/producer.ts` | The active producer and its prompt version, read by the CI gate and the cron's idempotency (today: the reader) |
| `ai/eval/` | The measured eval payloads (`ai-suggestions.json` is reader-v2; `.v1` and `.altered` kept for comparison) and their run-meta files |
| `tests/unit/ai-reader.test.ts`, `tests/unit/ai-harness.test.ts`, `tests/unit/ai-reader-route.test.ts`, `tests/unit/eval-gate.test.ts` | Unit tests; no network (a fake fetch is injected) |

## Patterns used, and why

- **Parallelization by sectioning** (Anthropic, "Building effective agents"): the job is split into independent pieces,
  one call per document, each with only the context that document needs. Calls run four at a time. Small, focused
  contexts make each answer easier to check, and a failure costs one document, not the run.
- **Structured outputs** (`output_config.format` with a `json_schema`, generally available;
  https://platform.claude.com/docs/en/build-with-claude/structured-outputs): the model can only answer in the payload's
  row shape. Every object in the schema has `additionalProperties: false`; no unsupported constraints such as
  `minLength` or `maximum` are used, so limits (rationale at most 30 words, confidence 0 to 1) are checked by our code.
- **Grounding verified by code after extraction**: Citations cannot be combined with structured outputs, so the model
  copies quotes and our code checks each one, whitespace-normalised, against that page's `printed_content`. A suggestion
  with any quote not found on its page is quarantined, whatever confidence the model gave it.
- **A vetted authority list**: the model may cite only a title from `AI_AUTHORITIES`, or null. Each title was checked to
  exist for tax year 2025 on irs.gov or ftb.ca.gov (FTB's Schedule CA (540NR) instructions are published inside the
  2025 Form 540NR booklet; Treas. Reg. 1.263(a)-3 is not year-specific).
- **Prompt caching**: the context every call shares (latest return lines, client answers, messages, call notes,
  prior-year notes) sits in a cached system block, so it is paid in full once and read cheaply after that.

## What each call sees

- The system prompt (`PROMPT_VERSION = 'reader-v1'`; change the version whenever the prompt changes): a careful tax reviewer;
  only issues grounded in verbatim quotes from the page text; law only from the vetted list or null; never compute or
  restate amounts not in the text; prefer no suggestion to a weak one; rationale at most 30 words.
- Shared, cached: the latest version's return lines (key, label, value), all client questionnaire answers, messages and
  call notes (small, so all of it), and the prior-year notes and the prior preparer's memo and open items.
- Per document: its header, every page's printed text, its extracted values with the return lines citing each value,
  and the return lines (latest version) citing the document.
- Adaptive thinking (`thinking: {type: 'adaptive', display: 'omitted'}`) with `max_tokens` 8,000: this is a judgment
  task, so tokens are traded for quality. Thinking counts toward `max_tokens`. A response cut at the limit is recorded as
  rejected, never half-read. The thinking mode and `max_tokens` are saved in the run-meta file.

## Validation before the payload is written

Each row is checked for shape, a known kind (`other` needs a label), an authority from the vetted list or null,
evidence that names an existing document and page, a rationale of at most 30 words and a confidence from 0 to 1. Line
keys that are not lines of the latest return are dropped. A failing row goes to `rejected` with its reason; so does a
failed call, a refusal, or a response that is not JSON. Ids are `ai-<kind>-<n>`.

## Privacy

**What is sent to the model.** Each call carries the document's printed text and the shared client context, after
masking. That means the model does see:

- people's names (household members, and staff named in notes): 5 of the 10 full names in the household and the firm
  appear in at least one request;
- street addresses as printed on the documents (the homes and the rental property);
- EINs and other business tax IDs, unmasked (the firm's rule: an EIN identifies a business, not a person);
- amounts, dates, employers, banks, brokers and charities.

**What is not sent.** SSNs, bank and account numbers leave as last 4 at most; IP, signature and ERO PINs leave fully
hidden. Masking is the app's own (`maskText` and `maskValue` in `src/domain/policy.ts`, run as a staff role without
sensitive-data clearance), so the model sees what such a person would see. A unit test builds the request for every
document and asserts that no body holds an SSN-shaped string or any of the packet's SSNs, with or without dashes
(11 documents carry SSN-shaped text before masking).

**Why names and addresses are sent.** The reader's job is to judge whether a document matches the return: whose W-2 it
is, which property a bill belongs to, whether a provider's name matches the line. Removing names and addresses would
remove the facts it reasons from. Identifiers that let someone act as the person (SSN, account, PIN) are not needed for
that judgment, so they never leave.

**What comes back and is stored.** The model is told not to name people in its rationale, and a row that does is
rejected. Rejected rows are stored as structure only (kind, claims, evidence document and page, the rationale's word
count, and whether its quotes were grounded); no rejected rationale or quote is kept, and a unit test checks every
payload file for first names in `rejected[]`. Kept suggestions carry verbatim quotes of page text, which may include a
name or an address, exactly as the page prints it; the backend verifier and the role masking apply to them like any
other page text. The scorecard prints first names as [name].

**The key.** In production `ANTHROPIC_API_KEY` is a Vercel environment variable read only by the internal reader
route; without it the route answers 503 and the app runs on the stored payload. On a laptop the CLI reads it from
`project-build/.env.local` (git-ignored). Either way it goes only into the `x-api-key` header and is never printed,
logged or written.

## How to run

From `project-build/`, with `ANTHROPIC_API_KEY=...` in `.env.local`:

```
npx tsx ai/reader.ts --limit 3                 # smoke test: three documents
npx tsx ai/reader.ts                           # full run, default model claude-sonnet-5-5
npx tsx ai/reader.ts --packet altered          # the altered packet, for false alarms
npx tsx ai/harness.ts                          # score, write docs/handin/ai-scorecard.md
```

The CI eval gate (no key, no model call; scores the committed eval payload through the backend verifier):

```
npx tsx ai/harness.ts --check                  # exit 1 if any produced suggestion is ungrounded, the verifier holds
                                               # back more than 1 (the baseline), strict recall as shown < 16 of 27,
                                               # the payload's promptVersion differs from ACTIVE_PROMPT_VERSION, or any
                                               # SSN-shaped string is in the payload
```

When `PROMPT_VERSION` changes, the gate fails with "prompt changed: re-run the eval and commit the new eval payload":
run the reader locally, score it, and commit the new `ai/eval/ai-suggestions.json` (and change the baselines in
`MIN_STRICT_RECALL` and `MAX_HELD_BACK` only on a measured result).

Options: `--model <id>`, `--limit N` (hard cap on documents, so on calls), `--concurrency N` (default 4). Retries:
429, 5xx and network errors, exponential backoff from 1 second, honouring `retry-after`, at most 4 retries per call.

## Cost

Sonnet 5.5 at $2 per million input tokens and $10 per million output; cache reads $0.20. The packet's 74 documents come
to about 395,000 characters of per-document context plus about 61,000 characters shared. That is roughly
110,000 uncached input tokens, 1.3 million cached tokens read, and output (thinking included) of perhaps 1,000 to 3,000 tokens per document: about $1 to $3
for a full run. The reader prints the measured tokens and cost from the API's own usage figures and saves them beside
the payload, in `ai/eval/ai-suggestions.run-meta.json`. Nothing should glob `ai/eval/ai-suggestions*.json`: the run-meta
files share that prefix.

## The reader in the cloud

`/api/internal/ai-reader` (GET or POST, run on demand; the daily Vercel Cron schedule was removed on 24 Oct 2026 because the demo packet never changes) requires
`Authorization: Bearer <CRON_SECRET>` (compared timing-safe; 401 otherwise) and answers 503
"ANTHROPIC_API_KEY not configured" without the key. It is idempotent: when the stored payload was made for this
packet (`packetSha` equals `RETURN_ID`) and `ACTIVE_PROMPT_VERSION` (ai/lib/producer.ts; today the reader's `PROMPT_VERSION`), it returns `{skipped: true}` without a model call;
`?force=1` reruns. Otherwise it runs the same reader core over the decrypted vault packet (same masking, model
`claude-sonnet-5-5`, same row validation), encrypts the payload into `returns/<sha>/ai-suggestions.json.enc`, and
returns counts, rejected, seconds and a cost estimate; never suggestion content. A full run took 108 to 119 seconds on
a laptop; the function limit is 300. App instances re-check the stored payload at most every 5 minutes, so a new run
appears without a redeploy. The deploy's ingest stores the eval payload as the first production payload when none
exists.

A manual run: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://taxmark-workpaper.vercel.app/api/internal/ai-reader`
(add `?force=1` to rerun on the same prompt version).

A dry run proves the cloud path in production without touching the stored payload: `?dryRun=1&limit=N` (N from 1 to
5, default 3) runs the reader over the first N documents of the vault packet, stores nothing, and returns
`{dryRun, documents, suggestions, rejected, grounded, calls, failedCalls, seconds, costUsdEstimate}`, counts only. It needs the same bearer and key.

## The agent (Step 2, CLI only)

Plan: `docs/superpowers/plans/2026-10-24-ai-agent.md`. The same safety model as the reader (runs at intake, output
re-checked by the backend, a person accepts each suggestion, never blocks), but one investigation over the whole packet.

- **SDK**: `@anthropic-ai/sdk` 1.3.0, `client.beta.messages.toolRunner` with `betaTool` (JSON Schema, `strict: true`,
  no Zod). The client gets the `fetch` option (tests inject one returning real `Response` objects), `maxRetries` 2 and
  `timeout` 15 minutes per request. `thread: false`: the full history is sent each turn (no server-held thread), with
  top-level `cache_control` caching the growing transcript and a breakpoint on the shared context.
- **Packet** (`ai/lib/agent-packet.ts`): in vault mode (production) the same path as the cloud reader:
  `ensureReturnData()` fetches the sealed packet, decrypts it and refuses it unless its SHA-256 equals `RETURN_ID`;
  `data/packet.json` is never read and nothing is written to the Blob store. File mode (`data/packet.json`, or
  `--packet altered`) is for laptop measurement only. A partial vault configuration fails loudly. The run meta records
  `source: 'vault' | 'file'`.
- **Model**: `claude-opus-5-5` by default (`--model` to measure another), adaptive thinking, `output_config.effort`
  `high`, the server-side refusal fallback (`betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`),
  `tool_choice` left at auto (forced is refused). The served model of every turn is recorded.
- **Context (cached)**: the case file (`ai/lib/case-file.ts`, agent-v2): a schema card, the firm's standards as review
  steps, `ai/lib/domain-digest.md`, a state map of every line (key, value, rule, P/F/O/E status from the mode's findings
  and our proofs), the work list (counts, every uncovered engine warning, the 40 largest other items), a compact
  document index and the client's text, masked. About 11,900 tokens (the agent-v1 context was about 22,900).
- **Output**: the `AiPayload` (`promptVersion` `agent-v3`, `model` = the served model) plus optional `proposals`
  (rule, fields compared, where it fires, where it stays silent, refs; words only, never code). Rows are validated as the
  reader's.
- **Measurement modes** (`ai/lib/modes.ts`): `--blind` drops `run_checks`, gives agreements only from `verify` `fact_copies`, and computes leftovers
  with no findings (scored on all 27 beside reader-v2); `--hide-checks <seed>` hides a seeded half of the check ids from
  `run_checks`, the leftovers and the fact copies (scored on the ledger entries only those checks reach, recomputed by the
  harness from the seed and the real checks). Default is production. Every run writes its own file under
  `ai/eval/runs/<version>/` (`<mode>.<real|altered|seed-<n>>.<n>.json`); no run, `--out` included, writes a committed
  `ai/eval/agent-suggestions*.json` (the earlier measured runs stay as they were); the live payload takes `--live`.
  The run meta records the mode, seed, hidden check ids and outcome (ok, truncated, failed).
- **Suggestions on a finding's exact claims are kept** (a new issue can sit on a checked line) and counted in the run meta
  as `onFindingClaims`; the scoring tiers, not a filter, stop echoes from scoring.
- **Guards**: `--max-iterations` (40), `--max-minutes` (40), `--max-cost` (12 USD). No partial run writes a payload. A
  failed run (error, SSN hit, refusal, cut or malformed answer) writes its trace and exits 1; a truncated run (a cost,
  turn or time cap) writes its trace and run meta marked truncated and exits 3, so a batch can tell them apart.
- **Summary of measurement runs**: `npx tsx ai/eval/summarize-runs.ts [runs dir] [--json]`, offline: every metric of the
  plan's measurement design per run and as median/min/max per condition, each defined in `ai/lib/run-summary.ts`.
- **Scoring**: `npx tsx ai/harness.ts --agent` writes `ai/eval/agent-scorecard.md`: per agent run, strict and same-issue
  recall with grounding on its mode's tier beside reader-v2 (default: mistakes no check reaches, empty on the delivered
  packet; blind: all 27; hide-checks: entries only the hidden checks reach, 11 for seed 7).

## What the scorecard means

- **Recall, strict (the headline)**: of the 27 known mistakes in the ledger, how many the reader put a grounded suggestion
  on, where "on" means the suggestion claims a return line that the mistake itself claims. Three entries (GT-B04, GT-B05,
  GT-C10) claim a document, not a line, so they cannot match strictly.
- **Recall, strict, text tier**: the same, over the mistakes whose checks depend on wording in free text (families
  "Judgment needed", "Client answer vs line", "Residency and sourcing", "Limit or cap", and GT-D05).
- **Precision, strict**: the share of grounded suggestions on a line some known mistake claims. The rest are listed for
  a person to read: they may be real issues the ledger missed.
- **Loose (secondary)**: a shared claim line, or any shared evidence document (a mistake's documents are its own claims
  plus the evidence documents of the findings our checks raise for it). Loose overstates, because one document can hold
  several unrelated mistakes; it is shown only beside the strict figures.
- **Reviewed matches**: one row per strict match with the shared line and the quotes, and an empty verdict column for a
  person to fill in (same issue, or different issue). A strict match is a candidate, not proof.
- **Grounding rate**: the share of suggestions whose every quote was found on its page. Ungrounded suggestions never
  reach a screen.
- **Rejected**: rows the reader's own checks refused, by reason. Rows rejected only for rationale length are scored
  separately ("Rejected by format") to show what they would add; they are not in the payload and not in the headline.
- **Altered packet**: the same scoring on a copy with every person renamed, one form removed and a staff member added.
  The mistakes are still there, so recall should hold; claims on lines that do not exist in that copy are false alarms.
