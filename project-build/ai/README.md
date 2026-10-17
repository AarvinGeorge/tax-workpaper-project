# AI reader and harness

The AI layer of Taxmark runs **at ingest, before the backend, never from the UI**. A reader reads the packet's free text
and writes a structured payload, `data/ai-suggestions.json` (shape `AiPayload` in `src/domain/ai/contract.ts`). The
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
| `tests/unit/ai-reader.test.ts`, `tests/unit/ai-harness.test.ts` | Unit tests; no network (a fake fetch is injected) |

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

**The key.** The API key is read from `project-build/.env.local` (git-ignored), goes only into the `x-api-key` header,
and is never printed, logged or written.

## How to run

From `project-build/`, with `ANTHROPIC_API_KEY=...` in `.env.local`:

```
npx tsx ai/reader.ts --limit 3                 # smoke test: three documents
npx tsx ai/reader.ts                           # full run, default model claude-sonnet-5-5
npx tsx ai/reader.ts --packet altered          # the altered packet, for false alarms
npx tsx ai/harness.ts                          # score, write docs/handin/ai-scorecard.md
```

Options: `--model <id>`, `--limit N` (hard cap on documents, so on calls), `--concurrency N` (default 4). Retries:
429, 5xx and network errors, exponential backoff from 1 second, honouring `retry-after`, at most 4 retries per call.

## Cost

Sonnet 5.5 at $2 per million input tokens and $10 per million output; cache reads $0.20. The packet's 74 documents come
to about 395,000 characters of per-document context plus about 61,000 characters shared. That is roughly
110,000 uncached input tokens, 1.3 million cached tokens read, and output (thinking included) of perhaps 1,000 to 3,000 tokens per document: about $1 to $3
for a full run. The reader prints the measured tokens and cost from the API's own usage figures and saves them beside
the payload, in `data/ai-suggestions.run-meta.json`. Nothing should glob `data/ai-suggestions*.json`: the run-meta files
share that prefix.

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
