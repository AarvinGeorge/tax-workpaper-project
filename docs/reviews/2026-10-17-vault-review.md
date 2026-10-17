# Vault restructure review (cross-model, security and correctness)

Reviewer: Fable 5.1 · Sat 17 Oct 2026, 18:41-18:52 EDT (22:41-22:52 UTC, `date` on the laptop) · tier b (internal, take-home)
Scope: the uncommitted change in `project-build/` (`git status` at 18:41: 28 modified, 19 untracked). No Anthropic call, no Vercel
settings touched, no `.env` file read, no secret value read, no commit. All paths below are under `project-build/` unless they start
with `docs/` or `.github/`.

## Verdict

Ship after the one must-fix (a commit-content gap, not a code bug). The cryptography, the fail-closed path, the secret handling and
the "data out of the deploy" claim all held up under probes. Four should-fixes, each a few lines.

## Must-fix

1. **`ai/eval/` and `.github/workflows/ci.yml` are untracked; the Vercel build and CI both depend on them.** `git ls-files ai/eval`
   returns 0 files; `?? .github/` in `git status`. `tests/unit/eval-gate.test.ts:12` reads `ai/eval/ai-suggestions.json`
   (`npm test` runs first in `vercel.json:4`), and `scripts/ingest.ts:49` reads it in vault mode. A commit that leaves them out
   fails the production build at the test step and ENOENTs the ingest. Stage `ai/eval/**`, `.github/**`, and the eight
   `data/ai-suggestions*` deletions together. Probe: `git ls-files ai/eval | wc -l` -> 0.

## Should-fix

1. **Partial vault configuration is silent file mode** (`src/domain/datamode.ts:7`, `scripts/ingest.ts:35`). With one or two of the
   three variables set the app reads `data/packet.json` from disk and the ingest prints "file mode, nothing to ingest" and exits 0.
   Probe: built app on :3211 with `RETURN_ID` + `DATA_ENCRYPTION_KEY` only -> page 200 with the household name from disk; `env -u
   DATA_ENCRYPTION_KEY -u BLOB_READ_WRITE_TOKEN RETURN_ID=<sha> npx tsx scripts/ingest.ts` -> "file mode", exit 0. In a deploy this
   only fails closed because `next.config.ts:9` excludes `data/**` from the functions (ENOENT -> 500), which is an accident of file
   tracing, not a guard. Preview (one of three set, by decision) is exactly this state today. Fix: any-but-not-all set -> throw
   "partial vault configuration: set all of RETURN_ID, BLOB_READ_WRITE_TOKEN, DATA_ENCRYPTION_KEY or none" in `isVaultMode()`, so
   the build stops at ingest and the page error names the cause in the logs. `tests/unit/data-source.test.ts:49` ("two of them is
   still file mode") enshrines the current behaviour and should flip.
2. **A corrupt stored AI payload makes the cron fail every day** (`src/server/ai-reader.ts:35`). `JSON.parse(stored)` is outside any
   fallback: a payload that does not parse throws -> 500 on every scheduled run, never regenerated unless someone calls `?force=1`.
   The page side already treats this as "unreadable, refused" (`src/server/data.ts:37`); do the same here: parse failure = stale,
   re-run. Probe: code reading; the route test has no corrupt-payload case.
3. **The "shown grounding 100%" gate cannot fail on its own terms** (`ai/lib/harness-core.ts:367`, advertised in `ai/README.md` and
   `.github/workflows/ci.yml`). Shown = `verifySuggestions(...).filter(isShown)` (`src/domain/ai/verify.ts:94`: grounded and no
   problems), then scored with `reader-core.isGrounded` (`ai/lib/reader-core.ts:236`), a second implementation of the same quote
   check. The check only detects drift between the two implementations. Honest wording: "the harness and the app's verifier agree
   on every shown suggestion"; or gate on the held-back count instead. The other three gate conditions are honest: `MIN_STRICT_RECALL
   = 16` is the measured value (run: `eval gate: ... 16/27 (baseline 16); shown 39, grounding 100%`), the prompt-version check and the
   SSN check both fail in `tests/unit/eval-gate.test.ts`.
4. **`npm run lint` exits 1; the decision log says "lint clean"** (`docs/decisions.md`, 18:41 entry). 22 errors: 20 in the stale
   local `.vercel/output/**` (not in `eslint.config.mjs:16` ignores; `.vercel` is git-ignored so never deployed) and 2 `no-explicit-any`
   in `tests/unit/ai-reader.test.ts:49,59` that predate this change (`git diff` of that file adds no `any`). Add `.vercel/**` to the
   ignores; fix or disable the two `any`s; then lint is a true statement. CI does not run eslint, so this does not block CI.
5. **The hand-in should say where the plaintext still is.** `docs/handin/design-many-returns.md:21` ("a pointer, not a file in the
   deploy") is accurate, but `data/packet.json` and `case-study-project-package/*.json` are tracked in git (`git ls-files`), the
   repo is on GitHub (private: `gh repo view` -> `PRIVATE`), and the eval payloads about to be committed quote client documents
   verbatim. One sentence: "the deploy carries no client data; the private repo still does, because the case study ships the packet
   and the eval payloads with the code."

## Nits

- `src/server/vault.ts:29`: the version byte is checked (`:35`) but not authenticated (not in the AAD). Harmless at version 1;
  include it in the AAD when a version 2 appears.
- `src/server/vault.ts:19`: `Buffer.from(raw, 'base64')` ignores whitespace, so a key pasted with a trailing newline is accepted.
  Convenient, documented here so nobody mistakes it for a bug.
- `src/server/data.ts:60` `forceAiRecheck()` only resets the cron function's own instance; pages on other instances wait for the
  5-minute re-check anyway. Comment it so; or drop it (3 lines).
- `src/server/data.ts:17` `dataMode()` is exported for tests only.
- `package.json:23` `scan` covers `src tests scripts`; CI (`ci.yml:30`) adds `ai`. Make the script match CI.
- `.github/workflows/ci.yml:5-7`: `push` and `pull_request` both fire on a PR branch (two runs per push). `push: branches: [main]`
  plus `pull_request` is the usual pair.
- `src/app/api/internal/ai-reader/route.ts:6` `maxDuration = 300` needs Fluid compute on Hobby (default for projects created this
  year); a 60-second limit would time out the 115-second run daily. One look at the project's Functions settings confirms it (not
  checked here: settings are out of scope).
- `src/server/ai-reader.ts:29`: `?force=1` with the bearer spends about $1.50 per call. Fine for a secret holder; just known.

## Probes and evidence

### 1. Crypto (`src/server/vault.ts`)
Harness: `scratchpad/probe/crypto-probe.ts` (throwaway `randomBytes(32)` key; run with `npx tsx`). All 20 tamper and binding
probes rejected, control opens, no leak of key or plaintext in any error text:
- version byte 1->0, 1->2: "version N is not supported" (checked before decrypt).
- IV first/last byte, tag first/last byte, ciphertext first/last byte flipped; truncated by 1; extended by 1; header only; tag
  zeroed; tag computed at 12 bytes and padded to 16: all "failed authentication".
- empty buffer, 28-byte header: "too short".
- AAD: other return id, other file at the same return, empty: rejected (path binding works both ways).
- wrong key (random; one bit flipped): rejected.
- IV uniqueness: 20,000 seals of the same plaintext, 20,000 distinct IVs (`randomBytes(12)` per seal, `vault.ts:25`).
- key length: 31, 33, 16, 48 bytes, non-base64, empty: rejected with the decoded length only, never the value.
- GCM in Node checks the tag in `final()` (`vault.ts:40`), inside the try; the message carries the blob path (contains the return
  SHA, not a secret). Key never appears in any message or log.

### 2. Fail-closed (built app, `next start -p 3211`, throwaway key, fake-shape blob token, no real secrets)
| scenario | page `/w/e2e-boot/daniel` | `GET /api/w/e2e-boot/state` | leak check |
|---|---|---|---|
| vault mode, store unreachable | 500, generic Next error page (8 KB) | 500, empty body | no key, no token, no client name; server log has a stack, 0 lines with key or token |
| malformed key (31 bytes) | 500, generic | - | log: digest only |
| partial env (id + key, no token) | **200 from disk** | 200 from disk | see should-fix 1 |
| `POST /api/w/.../events` bad type | - | 400 "Unknown event type." before any data load | fine |
Unit tests (mock faithful to the SDK: `@vercel/blob` 2.8.0 `get()` returns `null` on 404, `dist/index.js:178`, which is what
`tests/fixtures/blob-mock.ts` does) cover hash mismatch ("does not match RETURN_ID"), missing blob ("not found ... run the ingest"),
wrong key, and that `loadPacket()` throws in vault mode before `ensureReturnData()` (`src/domain/packet/load.ts:23`). A failed warm
resets `packetInFlight` (`data.ts:50`), so the next request retries rather than caching the failure. Production pages show a digest
only (no `error.tsx`, so Next's default), API routes an empty 500.

### 3. Secrets
- Reader route on :3211: no bearer 401; wrong bearer 401; `Bearer ` with `CRON_SECRET` unset 401; right bearer without
  `ANTHROPIC_API_KEY` 503 on GET and POST; right bearer + fake key + unreachable store: 500 with the generic reason, log line
  "Vercel Blob: Failed to fetch blob: 400 Bad Request" (no token), and the vault is read **before** any model call.
- Compare is `timingSafeEqual` over SHA-256 of both sides (`src/server/ai-reader.ts:18-22`); auth is checked before the 503s, so an
  unauthenticated caller learns nothing about configuration.
- Response body is counts, seconds and a cost estimate (`ai-reader.ts:44-48`); the route test asserts the rationale and quote strings
  never appear, and that the stored blob holds ciphertext.
- Vercel Cron sends `GET` with `Authorization: Bearer <CRON_SECRET>` when the variable exists; `route.ts:8` handles GET. Matches.
- Repo grep (excluding node_modules, .next, .vercel, .git) for `sk-ant-…`, `vercel_blob_rw_…`, `postgres://user:pass@`: 0 hits.
  No `.env*` file tracked (`git ls-files | grep -i env`: none). Build output: 0 files in `.next/static` name any of the four
  variable names; `.next` has no `sk-ant-`/`vercel_blob_rw_` pattern.

### 4. Data out of the deploy (rebuilt: `npm run build`, exit 0)
- 21 `*.nft.json` traces; 0 name `packet.json` or `ai-suggestions`; control: 21 of 21 name `package.json` (the grep can hit).
- 244 files under `.next` scanned for 17 packet-only strings (12 long values with digits plus the packet's 5 SSNs): 0 hits; control:
  17 of 17 found in `data/packet.json`. 0 files in `.next/static` or `.next/server` contain the household surname.

### 5. CI (`.github/workflows/ci.yml`)
Runs on `ubuntu-latest`, `working-directory: project-build`, Node 20 (local: v20.19.4), `npm ci` with
`cache-dependency-path: project-build/package-lock.json` (path is repo-relative, correct), `npm ls --package-lock-only` reports no
mismatch, `permissions: contents: read`, no secrets, no Playwright. `npm test` needs `data/packet.json` (tracked) and `copy-packet.mjs`
finds the source packet (tracked under `case-study-project-package/`). Eval gate run locally: pass at 16/27, 39 shown. See
should-fix 3 for the one threshold that cannot fail and must-fix 1 for the files CI needs.

### 6. Not broken (this laptop, 18:44-18:51 EDT)
- `npm test`: 27 files, 503 passed, exit 0.
- `npm run typecheck`: exit 0.
- `npm run scan` and `node scripts/scan-ssn.mjs src tests scripts ai`: values 5, hits 0, exit 0 (the 5 proves the scan can hit).
- `npm run lint`: exit 1 (should-fix 4; nothing from this change).
- `npm run build`: exit 0.
- `npx playwright test` (port 3200, nothing listening beforehand; webServer rebuilt and started the app): 56 passed in 44.2 s, exit 0.
- Ingest CLI entry guard works: `npx tsx scripts/ingest.ts` in file mode prints "file mode, nothing to ingest", exit 0.

### 7. Over-engineering
Nothing to remove. The 5-minute AI re-check (`data.ts:15`) is the smallest thing that lets a cron run show up without a redeploy;
the generation cache in `src/domain/ai/load.ts:113-119` is the cost of not re-parsing on every request. The four kept eval payloads
in `ai/eval/` are documented as comparison baselines. `forceAiRecheck`/`dataMode` are the only candidates (nits above).
