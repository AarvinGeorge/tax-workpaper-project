# Workpaper Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A thin, honest, deployed Next.js workpaper over the real packet: trace any number, checks that surface every ledger finding, append-only events for every action, server-enforced roles with masking, story clock and freeze.

**Architecture:** Pure TypeScript domain (`project-build/src/domain/`) behind fixed contracts (`src/domain/contracts.ts`); Next.js App Router server components render per role from the domain; one API route appends events; a store adapter (memory, file, Postgres or Vercel Blob). UI copies the hybrid mock-up's frame, tokens and wording (`docs/design/hybrid/*.dc.html`).

**Tech Stack:** Next.js 15.5.4, React 19.1, TypeScript, Vitest 3.2.4, Playwright 1.55, pg 8.16.3, @vercel/blob 1.1.1. No CSS framework: plain CSS with the mock-up's OKLCH tokens.

## Global Constraints
- Read `docs/build/BUILD-CONTEXT.md` before starting and before saying done. Every rule there applies to every task.
- Packet facts only from `project-build/data/packet.json` via `loadPacket()`/`indexPacket()`; never hard-code a packet count, id or name in logic (tests and the ledger catalogue may name ids).
- Identifiers: last 4 only everywhere; EINs never masked; tl-20 signature PINs never shown.
- Tax effects are labelled estimates from `tax_effect_rates` or `what_if`; post-v3 amounts come from the finalized version.
- Copy: no em dashes; status = word + colour; "Example" tag on anything not in the packet.
- TDD: write the test, run it, see it fail, implement, see it pass. `set -o pipefail` on every piped test run.
- Edit only the files your lane owns. No commits (Aarvin commits). No pushes.
- Done = `npm test`, `npm run typecheck`, `npm run scan` all exit 0, outputs shown in your report.

## File ownership
| Lane | Owns |
|---|---|
| A checks | `src/domain/checks/**`, `tests/unit/checks/**` |
| B refs, docs, versions | `src/domain/refs.ts`, `src/domain/docs.ts`, `src/domain/versions.ts`, `tests/unit/{refs,docs,versions}.test.ts`, `tests/fixtures/altered.ts` |
| C events, store, policy, clock, project, API | `src/domain/{events,policy,clock,project}.ts`, `src/domain/store/**`, `src/app/api/**`, `src/server/**`, `tests/unit/{events,policy,clock,project,store}.test.ts` |
| D1 shell and trace | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/w/[ws]/[role]/layout.tsx`, `.../page.tsx` (Home and Start here), `.../return/**`, `.../documents/**`, `src/components/shell/**`, `src/components/drawer/**`, `tests/e2e/trace.spec.ts`, `playwright.config.ts` |
| D2 work screens | `src/app/w/[ws]/[role]/{checks,review,changes,filing,firm,areas,findings}/**`, `src/components/work/**`, `public/designed/**`, `tests/e2e/work.spec.ts` |
| Coordinator | `src/domain/contracts.ts`, `src/domain/packet/**`, `package.json`, `next.config.ts`, integration, deploy |

---

### Task A: Check library and ledger catalogue (lane A)
**Files:** Create `src/domain/checks/index.ts` (exports `runChecks`), `src/domain/checks/catalogue.ts` (exports `LEDGER`), one file per family in `src/domain/checks/families/*.ts`; tests `tests/unit/checks/*.test.ts`.
**Interfaces:** Consumes `indexPacket`, `PacketIndex` (`src/domain/packet/load.ts`). Produces `runChecks(ix, asOf?) : Finding[]`, `LEDGER` (contracts.ts).
- [ ] Step 1: Read `docs/ground-truth/README.md` and the four ledger files; list every finding id (expect 27 distinct; overlaps such as A06/C03 and B05/C09 are one finding with two ids).
- [ ] Step 2: Write `tests/unit/checks/ledger.test.ts`: for every ledger id in `LEDGER`, `runChecks(indexPacket(loadPacket()))` contains a finding whose `ledgerIds` includes it, with non-empty `evidence` whose refs all resolve (`ix.valueById` for ev-, `ix.docById` for doc:/D ids). Run: `npx vitest run tests/unit/checks` → FAIL (module missing).
- [ ] Step 3: Write family tests first, each on the real packet AND on an altered in-memory copy where the triggering fact is removed (the check must go silent) — e.g. payment tax year: remove the "tax year 2024" designation from D68's value → no finding.
- [ ] Step 4: Implement the families from spec section 5 (two documents disagree; counted twice; agency tie-out; identity vs prior year; ignored field such as payment tax year or FX rate year; limit or cap; answer after last computation with `firstVisibleAt`; open item never closed; residency and sourcing; cheaper election from `what_if`; blank read used as zero; judgment flag). Thresholds and rates from `engine_reference.parameters` and `firm.starter_standards`.
- [ ] Step 5: Effects: `tax_effect_rates` of the latest version × delta, or `what_if` where the packet computes it; `basis` set accordingly. Severity: blocker when it changes tax by more than the firm's partner threshold or stops e-file; judgment for judgment calls.
- [ ] Step 6: Engine diagnostics are NOT findings; leave them to the UI.
- [ ] Step 7: `npm test` exit 0, `npm run typecheck` exit 0. Report each ledger id → check id, and any ledger finding you could not reproduce from the packet (list it, do not fake it).

### Task B: References, documents, versions (lane B)
**Files:** `src/domain/refs.ts`, `src/domain/docs.ts`, `src/domain/versions.ts`, `tests/fixtures/altered.ts`, tests `tests/unit/{refs,docs,versions}.test.ts`.
**Interfaces:** Produces `resolveRef`, `documentLanding`, `simulatedPage`, `compareVersions`, `finalized`, `swings`, `whatIfs`, `formsOf` (contracts.ts). `tests/fixtures/altered.ts` exports `alteredPacket(): Packet` (renamed people, one form's lines removed, an extra staff member) for every lane's tests.
- [ ] Step 1: Tests first. refs: every distinct source string across all versions' `lines[].sources` and `diagnostics[].refs` resolves to a kind other than 'text' unless it is free text (assert the count of 'text' equals the count of sources containing a space); README prefixes `py:`, `asset:`, `ref:param`, `ref:fx`, `household:`, `agency:`, `timeline:`, bare `v1|v2|v3`, `doc:<id>#page<n>` each have a test. Masking is not refs' job: return raw text; the API masks.
- [ ] Step 2: docs: every document gets exactly one of landed / reason; a document cited by any latest-version line source is landed; `extraction.status` drives not_extracted/partial; a document in `documents_superseded` is superseded; received after latest `computed_at` → after_last_computation; `visible=false` when `received_at > asOf`. Simulated page: printed_content plus the page's values with positions.
- [ ] Step 3: versions: compare uses `changes_from_previous` for adjacent versions and line-by-line diff otherwise; `finalized(ix, state)` overlays adjusted claims on the latest version, `recomputed:false`; swings use `prior_years.return_2024` lines and the firm variance rule from `starter_standards.variance_review` (percent and amount from the data); what-ifs from `what_if.alternatives`.
- [ ] Step 4: Implement until green; run all three test files plus the altered fixture; `npm test`, typecheck exit 0.

### Task C: Events, store, policy, clock, projection, API (lane C)
**Files:** `src/domain/events.ts`, `src/domain/store/{index,memory,file,postgres,blob}.ts`, `src/domain/policy.ts`, `src/domain/clock.ts`, `src/domain/project.ts`, `src/server/state.ts`, `src/app/api/w/[ws]/events/route.ts`, `src/app/api/w/[ws]/state/route.ts`; tests as owned.
**Interfaces:** Produces `getStore`, `roles`, `can`, `maskValue`, `redactText`, `DEFAULT_STORY_AT`, `stageAt`, `frozenAt`, `visibleAt`, `projectWorkspace` (contracts.ts), and `src/server/state.ts` exporting `async function loadWorkspace(ws: string, role: RoleKey): Promise<{ ix, findings, state, role: RoleInfo }>` and `async function postEvent(ws: string, role: RoleKey, e: NewEvent): Promise<{ ok: true; event: WorkEvent } | { ok: false; status: 403 | 409; reason: string; newer?: WorkEvent[] }>`. Server components and the API both call these; UI never calls the store directly.
- [ ] Step 1: Tests first: memory store append/list ordering; file store round-trips across instances; Postgres and Blob adapters behind env checks (unit test only the SQL/keys builder); `getStore()` picks by env.
- [ ] Step 2: policy tests per role: Marcus `reveal` refused with the firm rule text; preparer cannot sign off as reviewer their own adjustment (self-review); partner sign-off required when |effect| > the threshold from standards; clients may only `answer_recorded`/`attach_note` on their own items; examiner read-only; Sam and next year's preparer read-only; roles unavailable before `active_from` relative to storyAt; `maskValue` last 4 for ssn/account types read from `value_type`, EIN untouched; `redactText` removes "PIN 12345"-style numbers.
- [ ] Step 3: projection tests: adjustment keeps original and sets current; sign-off stores the value it covered and goes stale after a later adjustment; undo retracts; a write with stale `baseVersion` → 409 with newer events; open blocking review note adds a blocker; findings with severity blocker and not resolved are blockers; frozen after `frozenAt` refuses value changes ("amend on top"); events after storyAt hidden.
- [ ] Step 4: API routes: POST validates JSON, role (from path), policy, then appends; GET returns masked state. Workspace ids are `[a-z0-9-]{4,40}`.
- [ ] Step 5: green tests, typecheck.

### Task D1: Shell, Start here, Return, Documents, drawer (lane D1)
**Files:** as owned. Routes: `/` redirects to `/w/<new id>/daniel` ("New workspace"); `/w/[ws]/[role]` Home with the Start here panel; `/w/[ws]/[role]/return`; `/w/[ws]/[role]/documents`; drawer via `?claim=<claimId>` on any screen.
**Interfaces:** Consumes `loadWorkspace`, `resolveRef`, `simulatedPage`, `documentLanding`, `formsOf`, `compareVersions`, `swings`, `roles`, `maskValue`. Produces `src/components/shell/Shell.tsx` (`<Shell ws role screen state roleInfo>{children}</Shell>`), `src/components/drawer/ClaimDrawer.tsx` (`<ClaimDrawer ws role claimId />`, server component), `src/components/shell/actions.ts` client helper `postEvent(ws, role, event)` calling the API then `router.refresh()`; and a 5 s poll (`<LiveRefresh />`).
- [ ] Step 1: Copy tokens, fonts and the three-pane frame from `docs/design/hybrid/Main.dc.html` (header: product, client, "Viewing as" select with the 10 roles from `roles(ix)`, version, stage, story time, Saved; left nav filtered by `role.screens`; centre; right drawer). Phone width: panes stack.
- [ ] Step 2: Start here panel (dismissible per browser): what this is (one line), the counts from `ix.counts`, "Try: open Checks as Daniel, click California estimates", the role list.
- [ ] Step 3: Return: forms from `formsOf(latest)`, every line clickable to `?claim=line:<KEY>`, a "Compare" toggle (v1/v2/v3/finalized) and a "Last year" column with swing flags.
- [ ] Step 4: Documents: all documents from `documentLanding`, filter by status, each row opens `?claim=doc:<ID>` (simulated page with values highlighted at their positions).
- [ ] Step 5: Drawer: value (masked), original vs current, rule + rule text, inputs (links), sources resolved (kind of source label separate from confidence), simulated page with the field highlighted, findings on this claim, history, sign-offs (stale shown), actions allowed by `can` (adjust, note, sign off, ask client, reveal).
- [ ] Step 6: e2e `tests/e2e/trace.spec.ts`: for daniel, open a v3 line, see its source document and field; switch to marcus, SSN masked and Reveal disabled; ngozi sees no review notes. Run `npx playwright test tests/e2e/trace.spec.ts`.

### Task D2: Work screens (lane D2)
**Files:** as owned. Routes `checks`, `review`, `changes`, `filing`, `firm`, `areas`, `findings` under `/w/[ws]/[role]/`.
**Interfaces:** Consumes `loadWorkspace`, `runChecks` output inside it, `LEDGER`, `whatIfs`, `finalized`, `ClaimDrawer` link convention `?claim=`, `postEvent` helper from D1 (`src/components/shell/actions.ts`; if not yet present, write against its signature `postEvent(ws: string, role: RoleKey, e: Omit<NewEvent,'ws'|'role'|'storyAt'>): Promise<{ok:boolean; reason?: string}>`).
- [ ] Step 1: Checks: inbox of findings (blockers first) beside engine diagnostics (labelled "From the engine"); bulk sign-off with one undo; filter by severity.
- [ ] Step 2: Review: adjustments vs v3, open review notes (blocking ones block approval), sign-offs with stale ones marked, partner items over the threshold, Helen's approve button disabled with the blocker list.
- [ ] Step 3: Changes: the event log with undo; what-ifs panel labelled "Not a change; nothing is saved to the return".
- [ ] Step 4: Filing and after: timeline up to storyAt (PINs redacted), extension, e-file rejection and fix, freeze state, "Designed, not built" cards with images from the mock-up (8879 per spouse flow, client's copy, examination response, penalty estimate, outside filings, related returns, live notifications), each linking to the published mock-up https://claude.ai/artifact/RW8BgnvPMRwFzFjZyVVHoy.
- [ ] Step 5: Firm: standards quoted, staff and clearance, view log (reveal events), time vs budget (budget from packet; logged time events), deadlines on the story clock. Story clock control (Jo and staff): move to any timeline event (emits clock_moved).
- [ ] Step 6: Areas: record tables from the packet (depreciation by asset with federal, CA, AMT columns; sales by box with lot detail on demand; K-1 lines; payments; carryovers in and out; prior preparer notes).
- [ ] Step 7: Findings: the ledger catalogue, each row with its check, severity, effect, evidence links (drawer) and "how it was surfaced".
- [ ] Step 8: e2e `tests/e2e/work.spec.ts`: daniel adjusts California estimates, reload keeps it; helen's approval lists blockers; findings page lists every LEDGER row.

### Task I: Integrate, deploy, review (coordinator)
- [ ] Merge lanes in order C → B → A → D1 → D2, running `npm test && npm run typecheck && npm run build` after each.
- [ ] Deploy to Vercel (team aarvingeorges-projects, root `project-build`), public; run the grader walk (spec section 9) on the live link.
- [ ] Fable review of the deployed app against the spec and checklist; fix must-fixes only; redeploy.

## Self-review
Spec sections 2-9 each map to a task: load (coordinator, done), trace (B, D1), documents (B, D1), checks (A, D2), change (C, D1, D2), compare (B, D1, D2), roles (C), clock (C, D2), finalized (B, C), saving (C), findings (A, D2), start here (D1), records (D2), firm (D2), designed-not-built (D2), testing (all), deploy (I). Deviation from the skill's format, recorded: steps name the tests and assertions but not full code, because five agents implement in parallel against `contracts.ts` under a 14:00 freeze.
