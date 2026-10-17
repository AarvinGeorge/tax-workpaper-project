# AI layer review (cross-model, pre-ship)

Reviewer: Claude Fable 5.1, Sat 17 Oct 2026 16:57-17:05 EDT (20:57-21:05 UTC; clock read with `date` at start and end).
Scope: the uncommitted AI layer in `project-build/` (src/domain/ai/{contract,load,verify,merge}.ts, AiDecision.tsx,
Checks/Findings/ClaimDrawer, server/state.ts, policy/events/contracts/docs, next.config.ts, ai/ reader and harness,
data/ai-suggestions*.json, the AI unit and e2e tests). Read-only apart from this file. No API call was made.

## Verdict

**No must-fix.** Six should-fixes, none of which blocks the hand-in; five nits. The security and privacy
surfaces hold under probing: the key never reaches a body, a log line, a file or the bundle; no request body
holds an SSN-shaped string across all 74 documents; clients and the examiner get no AI content through the state
JSON, the page HTML or the drawer; 65 hostile payload shapes produced 0 throws and 0 unverified quotes on screen;
the production build traces both data files into every server function.

## Gates run (from project-build, `set -o pipefail`)

| Gate | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0 | `tsc --noEmit`, no output |
| `npm run scan` | exit 0 | `ssn scan: values 5 hits 0` |
| `npm test` | exit 0 | `Test Files 22 passed (22)`, `Tests 468 passed (468)` |
| `npm run build` | exit 0 | 14 routes, all dynamic |
| `playwright test tests/e2e/ai.spec.ts` | exit 0, 5 passed | against `next start -p 3400` with `AI_PAYLOAD_PATH` set to the fixture (`E2E_BASE_URL=http://localhost:3400`); server stopped after |

## 1. Security and privacy

**Key leakage. Holds.** Probes:
- `grep -rl "sk-ant-" .next` and `grep -rl ANTHROPIC_API_KEY .next`: no files. `grep -rl "ai-suggestions|promptVersion|reader-v2" .next/static`: no files (nothing AI-side is in the client bundle).
- `git check-ignore -v .env.local` -> `.gitignore:34:.env*`. `.env.local` is mode 0600.
- Every `console.*` in `ai/reader.ts`, `ai/harness.ts`, `ai/lib/*.ts`, `src/domain/ai/*.ts` listed: counts, sha prefix, model name, token totals, reasons. None prints headers, the request body, or the key. `callApi` keeps at most 300 chars of the API's error text (`reader-core.ts:272`), which goes into `rejected[].reason`; that text comes from the API, not from the request.
- `data/ai-suggestions.run-meta.json` holds model, prompt version, counts, usage, cost. No key, no text.
- Offline over all 74 documents (`scratchpad/probe-requests.ts`, no network): `keyInBody: 0`; the key is in `x-api-key` only (`reader-core.ts:163`).

**Identifiers in request bodies. Holds for SSNs; names, EINs and the rental address do go.** Same probe, 74 bodies, 5,274,191 bytes:
- SSN-shaped (`\d{3}[- ]?\d{2}[- ]?\d{4}`): **0**. The raw packet has 29 such matches and 34 EIN-shaped, so the zero is measurable. Nine-or-more-digit runs: 0.
- EIN-shaped: 170 occurrences (two EINs, in the shared return-lines context). `ai/README.md:61` states EINs are unmasked by house rule (decision 29, 16 Oct). Consistent.
- Full names of household members appear in 22-24 bodies (printed page text of W-2s, 1099s, invoices) and the rental property address in the return lines and questionnaire answers. This matches the app's own masking (`maskText` masks SSN/ITIN/TIN, account and routing numbers, PINs; not names or addresses), but the README's Privacy section does not say it. See S5.
- The 151 "DOB-shaped" hits were acquisition dates on Form 8949 lines (2019-04-02, 2018-12-20), not birth dates. Retracted.

**Who can see AI content. Holds.** Live probes on `next start -p 3400` (`scratchpad/probe-server.mjs`, `probe-server2.mjs`):
- `/api/w/<ws>/state?role=` for `ngozi`, `erik`, `irs`: `"source":"ai"` absent, the suggestion id absent, the first 24 chars of its quote absent, `promptVersion` absent, the words "AI suggestion" absent. For `priya` the same JSON carries 39 AI findings (the measurement can be non-zero).
- Page HTML for those three roles at `/checks`, `/findings`, home, `/checks?sev=ai`, `/checks?claim=finding:<ai id>`, `/return?claim=finding:<ai id>`: quote fragment and rationale absent in all 18 pages (the id string appears only where the URL's own query is echoed into links).
- Root cause in code: `state.ts:68-69` hands `NO_AI` and no AI findings to non-staff before anything renders; `ClaimDrawer.tsx:336` refuses non-staff before `AiFindingClaim`; home (`page.tsx:29`), `ClientAnswers` and `Findings.tsx` filter `source !== 'ai'`.
- Markup: no `dangerouslySetInnerHTML` anywhere in `src/`. A dismiss reason of `<img src=x onerror=alert(1)>` renders as `&lt;img` (probe), and the fuzz's `<script>` in `otherKind`, `rationale`, `model` reaches the page only as escaped text.

## 2. Trust boundary

`scratchpad/probe-fuzz.ts`: 65 shapes through `parseAiPayload` -> `verifySuggestions` -> `aiFindings`: **0 throws, 0 "shown though bad"**. Highlights:
- Non-object payloads, wrong `schemaVersion` type, `packetSha` as an object, bad `runAt`, `suggestions`/`rejected` not lists: refused whole, with reason.
- Row shapes: `null`, arrays, `__proto__` keys (no pollution observed), ids with markup or 500 chars, page 0 / 1.5 / `"1"` / 1e308, `confidence` NaN/Infinity/-1/2/string/null, 10,000 claims, 100-deep nesting, a 2 MB quote, a 1 MB rationale: held with a reason, or shown with the bad part dropped (unknown claim keys and `line:` prefixes are normalised by `merge.ts:41`).
- Grounding cannot be bypassed: injecting `grounded: true, problems: []` with a fabricated quote is held (extra fields are dropped at `load.ts:68-73`; `verify.ts` recomputes). One real quote plus one fabricated quote is held. A quote that is real text plus `<b>x</b>` is held.
- Short-quote rule: a one-character real quote is held ("Quote too short"); the live payload holds exactly one row this way (`ai-other-7`, the "Tax ID" case).
- Superseded rule: the packet's supersession map is `D30 -> D31` only; no shown suggestion still points at `D30` (0 of 39).
- `rejected` is kept raw and untyped (`load.ts:108`) but never rendered or returned by `aiReview`; a 100 KB hostile `rejected` entry changed nothing.

## 3. Correctness (live probes, `probe-server*.mjs`)

| Probe | Result |
|---|---|
| accept as client `ngozi` | 403 "Clients can answer questions, sign..." |
| accept as examiner `irs` | 403 (activeFrom rule fires first; examiner rule would too) |
| accept as `sam` (quality reviewer) | 403 "joins on Jan 4, 2027" |
| accept as `jo` (firm administrator) | **200** (see S1) |
| dismiss with no / blank reason as `marcus` | 403 "Dismissing a suggestion needs a reason." |
| accept unknown id, a non-AI finding id, `line:` claimId, no claimId | 400 "No AI suggestion with that id is shown." |
| accept as `marcus` (staff, no clearance) | 200; drawer shows `data-testid="ai-accepted"` and "Suggested by AI, accepted by Marcus" |
| accept the same suggestion again | 200, a second event (see N1) |
| undo own accept as `marcus` | 200; status returns to Needs review |
| undo Marcus's dismiss as `priya` (preparer) | 403 "You can undo only your own actions." |
| undo it as `daniel` (reviewer) | 200 |
| dismissed suggestion | gone from the Checks inbox (`data-finding` absent), still in the record |
| story clock moved to 2026-01-15 (earliest `firstVisibleAt` is 2026-01-21) | Checks AI group shows 0 rows and "No AI suggestions at this story time"; drawer of a March suggestion says "Not yet in the story" with no quote leaked |
| accept/dismiss a not-yet-visible suggestion through the API as `priya` at that clock | **200 / 200** (see S2) |
| packetSha | wrong hash refused whole; the offline probe confirmed `packetShaOf` hashes the file bytes the reader hashed (`load.ts:29`, `reader.ts:50`) |

## 4. Production gap (data files in the server bundle)

`npm run build` exit 0. All **18 of 18** `.next/server/**/*.nft.json` list both `data/packet.json` and `data/ai-suggestions.json` (loop over every nft file: no "MISSING" line for either). The only other runtime disk reads in `src/` are the event store (`.data/events` locally, `os.tmpdir()` on Vercel, `store/index.ts:34`) and `AI_PAYLOAD_PATH`, which is an override not a default. Nothing else is missing from the trace.

## 5. Tests are honest

- `ai-reader.test.ts:27-39` asserts the raw packet has SSNs before asserting no body does: a zero proven able to be non-zero.
- The fixture (`tests/fixtures/ai-payload.ts`) copies its grounded quote out of `printed_content` by regex, never typed; the fake quote and unvetted authority are distinct rows, so the verifier tests would fail if verification were removed (I confirmed by reading that `shownIds` comes from `verifySuggestions`, not the fixture).
- `ai-backend.test.ts:168-180` asserts staff findings start with exactly `runChecks(ix)` and non-staff get none; `:182-191` compares blockers with and without AI.
- Weak spot: `ai-backend.test.ts:198-204` lists `sam` among "read-only seats are refused", but the probe shows Sam is refused because he joins in 2027, not because `meta.writes` is false (S4).
- e2e `ai.spec.ts` ran green against a fixture-backed server; the "clients and the examiner" test checks the state JSON and four pages per role for the id and the quote text.

## Findings

### Must-fix
None.

### Should-fix
- **S1** `project-build/src/domain/policy.ts:221-225` — any staff seat with write access can accept or dismiss, including the firm administrator (`jo`, no sign-off level); probe: accept as `jo` -> 200. The sibling rules (`finding_cleared` :219, `decision`, `adjustment`) require `meta.level`. Matches the spec text ("staff with write only") but an admin putting "Suggested by AI, accepted by Jo" on a tax judgement reads wrong; gate on `meta.level` like `finding_cleared`, or record the choice in decisions.md.
- **S2** `project-build/src/server/state.ts:84-87` — the API accepts or dismisses a suggestion whose `firstVisibleAt` is after the story clock (probe: `priya` at 2026-01-15 accepts a 2026-03-27 suggestion -> 200). The inbox and drawer hide it; only the server does not check. Add `(!f.firstVisibleAt || f.firstVisibleAt <= storyAt)` to the `some()` at :86 (the projection's `storyAt` is available two lines later; compute it first).
- **S3** `project-build/src/server/state.ts:127-129` — `stateResponse` masks `explanation` and `plain` but spreads `f.ai` unmasked, so `ai.rationale` and `ai.quotes[].quote` reach a no-clearance staff seat raw (probe: Marcus's state JSON quote identical to Priya's). No live leak today (verifier rejects SSN-shaped text; 0 of 39 quotes carry account- or routing-shaped numbers; 0 contain `•`), and the drawer masks on render, but the JSON is the defence-in-depth gap. Map `ai.rationale` and each quote through `maskText` too.
- **S4** `project-build/tests/unit/ai-backend.test.ts:198-204` — the "read-only seats are refused" claim is carried by `sam`, who is refused for `activeFrom` (joins 2027), so `!meta.writes` is never exercised for the two new actions (no read-only staff seat is active in this packet). Either move the clock past Sam's start inside the test, or build a `RoleInfo` stub with `writes: false` and call `can()` directly.
- **S5** `project-build/ai/lib/reader-core.ts:216-218` and `data/ai-suggestions.json` — `validateRow` checks the word limit before the names check, so a row rejected for length keeps its un-name-checked rationale in `rejected[].raw`. The committed payload has one such row ("rationale over 30 words") naming Ngozi and Erik; `ai-suggestions.v1.json` has one more. The file ships in every server function (next.config.ts tracing) though nothing renders `rejected`. Run the names check first, or strip `rationale` from `raw` on rejection (the harness already prints no rationale for rejected rows).
- **S6** `project-build/ai/README.md:57-64` — the Privacy section says what is masked but not what is sent: household members' full names (printed page text of 22-24 documents), the rental property address, and EINs. Add one sentence so the hand-in's AI-usage note is complete; the masking itself matches the app's own `maskText` policy.

### Nit
- **N1** `project-build/src/server/state.ts:84-87` — accepting an already-accepted suggestion appends a second `suggestion_accepted` (probe: 200 twice). Harmless (latest wins), noisy in the trail; the UI hides the button, the API does not.
- **N2** `project-build/src/domain/ai/load.ts:81` — in the whole-payload-refused path, `held[].id` is any non-empty string (no `ID` regex, no length cap), and `Checks.tsx` renders it in the held-back list. Bound it with the same `ID` test.
- **N3** `project-build/package.json` (`scan` script) — `scan-ssn.mjs src tests scripts` does not cover `ai/` (adjudication JSON with free-text reasons) or `data/ai-suggestions*.json`. I ran it over `ai data ../docs/handin`: the only hits are the five values in `data/packet.json` itself. Add `ai` and the payload files to the script's scope so the gate covers the new inputs.
- **N4** `project-build/src/domain/ai/load.ts:108` — `rejected` is copied through untyped. Not rendered, not returned by `aiReview`; fine today, but `AiPayload.rejected` is typed `AiRejected[]` and nothing checks it.
- **N5** `project-build/src/domain/ai/merge.ts:38-49` — `firstVisibleAt` is the latest `received_at` among the quoted documents, which is right for document evidence, but the reader also read the shared client context (answers, messages) dated later in the story. A suggestion prompted by a later client message can surface before that message arrives. Known limit worth one line in decisions.md; no code change proposed for today.

## Probe files (scratchpad, not in the repo)
`/private/tmp/claude-501/-Users-aarvingeorge-Documents-Climb-Profile-Builder-tech-personal-projects-tax-workpaper-project/9cc2f380-a009-45a0-913e-e17f89510bc5/scratchpad/{probe-requests.ts,probe-fuzz.ts,probe-server.mjs,probe-server2.mjs,probe-server3.mjs,probe-offline.ts,checks.log,build.log}`
