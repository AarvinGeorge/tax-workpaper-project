# Finish the switch: the AI agent replaces the AI reader as the live AI producer

> Tier b. Subagent-driven: one implementer per task, a Fable 5.1 task review after each, a final whole-branch review.
> Branch agent-case-file (head bd2c152 + 7317ee8). Decision: docs/decisions.md 24 Oct 20:41 (Aarvin). Nothing ships
> without Aarvin's separate "ship it".

**Goal.** The default-mode agent v3 output (ai/eval/agent-suggestions.json, 3 suggestions, 0 held back) becomes the
live AI payload, labelled by source, with the eval gate, the behaviour contract and every suite green.

## Global Constraints
- Offline only: no Anthropic API calls, never run ai/agent.ts or ai/reader.ts, never read or write .env files, never
  print a full SSN or PIN, never touch Vercel, the store, or production.
- `git add` specific paths only (never -A); never push or merge; commit messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Test first for every behaviour change (red, then green). Run `npm test` with `set -o pipefail`.
- Behaviour contract (tests/unit/behaviour-contract.test.ts): only tests/contract/ai.json may change, and only in
  Task 4; findings.json, blockers.json, demo-adjustment.json, proofs.json and documents.json stay byte-identical.
- Never edit case-study-project-package/ or docs/ground-truth/.
- The active producer is set in project-build/ai/lib/producer.ts (agent, agent-v3, ai/eval/agent-suggestions.json).

### Task 1: Source-aware wording everywhere the UI still says "AI reader"
Files: project-build/src/components/** (the "?" About-this-workspace dialog text on Checks, the Legends pill text, the
glossary term for "ai-suggestion"), plus any other user-facing string that hard-codes "AI reader".
- Use the payload's source (the helper the switch commit 7317ee8 added; promptVersion starting with `agent-` means
  "AI agent", otherwise "AI reader"). Where the text describes how the AI works (e.g. "the AI reader read each
  document"), give one accurate sentence per source: agent = "an AI agent investigated the whole packet with the
  app's own tools"; reader = keep today's wording.
- Tests: unit tests for the wording helper per source; update the browser specs that assert the old text
  (tests/e2e/ai.spec.ts A7 asserts /AI reader read/; make it source-aware, not deleted).
- Done when `grep -rn "AI reader" project-build/src` only shows the reader-branch strings.

### Task 2: The proposal validator wrongly rejects plain-words proposals as "code"
Files: project-build/ai/lib/agent-core.ts (proposal validation), tests/unit/ai-agent*.test.ts.
- Two real proposals were rejected with "proposal reads as code, not words". Their `compares` entries read like
  "donation_receipt printed text (goods or services statement)" and "K-1 tax year and box 1 income": schema field
  names with underscores, inside plain sentences. Find the heuristic and narrow it so field names in `compares` are
  allowed while real code (function calls, `=>`, `{ }`, `;`-terminated statements, `if (`) is still refused.
- Tests: both quoted examples accepted; at least three code-shaped strings still refused.
- Do not re-finalize or edit any ai/eval/*.json file.

### Task 3: Commit the agent payload and set its eval-gate baseline
Files: project-build/ai/eval/agent-suggestions.json, .run-meta.json, .trace.json (already on disk from the default
run at 20:47 EDT, not yet committed), project-build/ai/eval/gate-baselines.json.
- Do not modify the payload. Confirm with the verifier that it is for packet ee01f8508bd2… and holds back 0
  (`ingest` refuses to seal otherwise).
- Run `npx tsx ai/harness.ts --set-baseline` and commit the baseline file it writes.
- The active-producer eval-gate test must now pass.

### Task 4: Regenerate the behaviour contract's AI snapshot only
- Run the contract test with `-u` restricted to the AI test (`-t` its name) so only tests/contract/ai.json changes;
  prove with `git diff --stat tests/contract` that no other snapshot moved.
- Append one docs/decisions.md line: the approved behaviour change (AI rows now from the agent: 3 shown, 0 held),
  the before/after counts from the old and new ai.json.

### Task 5: Full verification on a local production build
- Full unit suite, `npx tsc --noEmit`, eslint on changed files.
- Full browser suite locally (`npx playwright test`, which builds and starts production mode). The local suite uses
  its fixture payload; additionally start the production build with the real committed agent payload
  (`AI_PAYLOAD_PATH=<abs path to ai/eval/agent-suggestions.json> npx next start -p 3300`) and run
  `E2E_BASE_URL=http://localhost:3300 npx playwright test` against it; stop the server after.
- Report every failure verbatim with its cause; do not change app behaviour to make a test pass without saying so.
