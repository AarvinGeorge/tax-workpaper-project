# Taxmark architecture facts (shared source for the Archify diagrams)

Measured at commit 45b37d8 (17 Oct 2026); inputs, AI layer and delivery updated for the vault restructure
(17 Oct 2026, 18:40 EDT, uncommitted at the time of writing). Every diagram must agree with this sheet; anything not here must be read
from the code and cited with a file path.

## Runtime topology
- Browser (any role via the role switcher; no sign-in) -> Vercel (Next.js 15 App Router, React 19, server components;
  route handlers `src/app/api/w/[ws]/events/route.ts` POST and `src/app/api/w/[ws]/state/route.ts` GET).
- Server logic: `src/server/state.ts` (`loadWorkspace`, `postEvent`: validate -> policy -> append; `stateResponse`
  masks per role). Domain is pure TypeScript in `src/domain/`.
- Event store: `src/domain/store/` chooses Postgres (Neon, `DATABASE_URL`, one `workpaper_events` table keyed by
  workspace and sequence) in production, file locally, memory in tests (Blob adapter exists as a fallback, unused).
- Read-only inputs live in a private Vercel Blob store (`taxmark-client-data`, iad1), encrypted (AES-256-GCM, key in
  `DATA_ENCRYPTION_KEY`; envelope: version byte, 12-byte IV, 16-byte tag, ciphertext; the blob path is the
  authenticated data): `returns/<sha>/packet.json.enc` and `returns/<sha>/ai-suggestions.json.enc`. Loaded by pointer:
  production holds only `RETURN_ID` (the packet's SHA-256); `src/server/data.ts` `ensureReturnData()` fetches,
  decrypts and hash-checks the packet (fail closed) into the cache `loadPacket()` uses, and re-checks the AI payload at
  most every 5 minutes. Some but not all of the three variables set fails closed, naming the missing ones (Preview,
  which has the Blob token only, stops at the ingest by design: client data is production-only). Called at the start of `loadWorkspace` and `postEvent` (every page and API route goes through
  them). Neither file ships with any server function (`next.config.ts` outputFileTracingExcludes; 0 of 21 traces).
- File mode (local dev, tests; any of the three variables unset): `data/packet.json` (SHA-256 checked by
  `scripts/copy-packet.mjs`) and `ai/eval/ai-suggestions.json` (the measured eval payload) from disk.
- Live updates: each tab polls `GET state` every 5 s (`LiveRefresh.tsx`) and re-renders on a new event or clock move.
- No model call at page load. The only model call in the app is the internal AI reader route (below); the Anthropic
  key is a Vercel environment variable, read only by that route.

## AI layer (reader in the cloud, harness in CI)
- Reader core `ai/lib/reader-core.ts`: per document (sectioning), identifiers masked (`maskText`), Claude Sonnet 5.5 via
  Messages API with structured outputs (`output_config.format` json_schema), adaptive thinking (envelope: packetSha,
  model, promptVersion reader-v2, runAt; fixed core per suggestion; open `kind`).
- In the cloud: `src/app/api/internal/ai-reader/route.ts` (GET for the daily Vercel Cron at 06:00 UTC, POST manual;
  `Authorization: Bearer <CRON_SECRET>`, timing-safe; maxDuration 300 s; 503 without `ANTHROPIC_API_KEY`). Skips
  when the stored payload matches the packet hash and prompt version (unless `?force=1`); otherwise runs over the vault
  packet and stores the payload encrypted. Returns counts, seconds and a cost estimate, never content.
- On a laptop: `ai/reader.ts` (writes `ai/eval/ai-suggestions.json`, the eval payload kept with the code).
- `ai/harness.ts`: scores a payload against the 27 ledger mistakes (strict line match; adjudication by a second model in
  `ai/adjudication-v2.json`); writes `docs/handin/ai-scorecard.md`. Judged recall 13 of 27. `--check` is the CI gate
  (`.github/workflows/ci.yml`): every produced suggestion grounded, at most 1 held back by the verifier (the baseline),
  strict recall as shown at least 16 of 27, payload prompt version equal to the code's, no SSN-shaped string.

## Backend processing (every request, in the app)
- Packet: `src/domain/packet/load.ts` (load, validate, index).
- Checks: `src/domain/checks/` (27 checks, 15 families, written against the schema; `runChecks`).
- AI payload: `src/domain/ai/load.ts` (strict envelope, tolerant rows, packetSha refusal), `verify.ts` (quote on its
  page; quote carries content; not only from a superseded document), `merge.ts` (shown suggestions become findings with
  `source: 'ai'`, never blockers).
- Projection: `src/domain/project.ts` `projectWorkspace(ix, events, role, findings)` -> claims, blockers, sign-offs
  (fresh/stale), finalized return, per role and story time; `notify.ts` notifications; `policy.ts` roles, `can()`,
  masking.

## Roles (10)
Priya (preparer), Marcus (preparer, no clearance), Daniel (reviewer), Helen (partner), Sam (quality reviewer, read
only from 4 Jan 2027), Jo (firm administrator), Ngozi and Erik (clients), next year's preparer (read only), IRS
examiner (read only, from 2028). Clients and the examiner never receive AI suggestions.

## Return lifecycle (story clock, `src/domain/clock.ts` stageAt)
Preparation (before the hand-off deadline) -> Review -> Approval (from the clients' Form 8879 signature) -> Filing
(from the first e-file transmission) -> Filed (from federal acceptance; the record freezes; later changes are "amend on
top"). E-file rejection (13 Jul 2026) returns to a fix and retransmission inside Filing. Partner approval requires zero
blockers; client signatures go stale if the finalized return changes.

## Delivery
GitHub `main` -> Vercel Git integration, root `project-build`, build command
`npm test && npx tsx scripts/ingest.ts && npm run build` (unit tests gate the deploy; the ingest encrypts and uploads
what the store lacks and verifies it by read-back), docs-only commits skip builds; production
`taxmark-workpaper.vercel.app`. GitHub Actions CI (`.github/workflows/ci.yml`): unit tests, typecheck, SSN scan, eval
gate; no secrets.
