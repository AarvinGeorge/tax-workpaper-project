# Workpaper build: design spec (thin, honest, deployed)

Written 16 Oct 2026, 23:58 EDT by Opus 5.5 after Aarvin's go. Inputs: brief, README, ledger, discovery 11 checklist
(U1-U20, B1-B26), README audit, Fable fresh-eyes assessment, hybrid mock-up v9. Context anchor: `docs/build/BUILD-CONTEXT.md`.

## 1. Intent (the outcome, not the method)
A grader opens one link and, within 30 seconds, can pick any role, click any number on the real 2025 return and see the
source page and field it came from, see every one of the packet's confident mistakes surfaced by a check that does not
trust the engine, act on one (adjust, note, sign off, ask, undo) and see that saved, and see each role see a different,
permission-enforced view. Everything the brief names works at least once on the real packet, or is clearly shown as
"Designed, not built" with the mock-up screen, never faked.

Success test (run before submitting): the five-minute grader walk in section 9 passes on the deployed link from a cold browser.

## 2. Scope
### Built (end to end on the real packet)
| Area | What works | Checklist |
|---|---|---|
| Load | Packet copied byte-identical (hash test), validated on load against a typed schema (strict where the README is clear, tolerant elsewhere; unknown fields kept); counts shown | B1, B13, B14 |
| Trace | Every v3 line (627) clickable; drawer shows value, rule and its description from `engine_reference`, inputs (clickable), sources resolved for every reference kind, simulated source page with the field highlighted and its position, kind of source, read confidence | E1, E8-E10, B16, B20, B22 |
| Documents | All 74 with type, issuer, owner (`belongs_to`), received, status; where each landed (lines citing its values) or the typed reason it did not (duplicate, superseded, not extracted, partial, after the last computation, corroborates only, unused) | E2, J6, U10-lite |
| Checks | Deterministic check library over the schema; every ledger finding surfaced by at least one check (test per finding); engine diagnostics shown beside, never instead; inbox grouped blockers first | C2, C6, D5, B9 |
| Change | Adjust (new value, reason, authority/evidence, tax effect estimate from `tax_effect_rates`, bound to the version), original kept; review note (blocking or not); sign-off bound to the value it signed, goes stale when it changes; question to a named client spouse; undo as a compensating event; bulk sign-off with one undo | H1, H6, P3, P4, P1, B5, B21 |
| Compare | v1 / v2 / v3 / finalized side by side by line, from `changes_from_previous`; what-ifs from `what_if.alternatives` labelled "not a change"; swings against 2024 using the firm variance rule; the 2024 column traces to D06 | H4, H5, J1, B25 |
| Roles | 10 roles (Priya, Marcus, Daniel, Helen, Sam, Jo, Ngozi, Erik, next year's preparer, IRS examiner) via a switcher; server-enforced policy (self-review refused, partner threshold over 1,000, Marcus no reveal, client and examiner limited views); masking at the API by `value_type`; reveal log | P5, R2, B6, B23 |
| Clock | One story clock per workspace (default v3, 23 Jun 2026 06:05); events and documents after it hidden; roles that start later show a notice; freeze at federal acceptance: the as-filed record is read-only, later changes are "amend on top" | D4, A5, B8, B10 |
| Finalized | v3 plus applied adjustments as its own version; totals marked "not recomputed by the engine" with the estimated tax effect; every post-v3 amount reads from it | B19 |
| Saving | Append-only events per workspace (`/w/<id>`; "New workspace" gives a clean copy); survives reload and is shared by tabs on the same workspace (poll every 3 s) | S4, B2, B3-lite |
| Findings | In-app Findings page: the 27 ledger findings, each with its check, evidence links and how the design surfaced it (deliverable 3 lives here) | S7 |
| Start here | First-screen panel: what this is, the roles, a three-click tour | grader |
| Records | Areas page: generic record tables from the packet (depreciation by asset with federal/CA/AMT, sales by box with detail on demand, K-1 lines, payments, carryovers, prior preparer vs us) | K1-K16 lite |
| Firm | Standards (12 steps, 7 rules) quoted where they act; staff and clearance; view log; time against budget (budget from packet, time recorded as events, Example where none); status | R1-R5 lite |

### Designed, not built (shown as mock-up screens, labelled, linked to the published mock-up)
Live notifications bell and toasts; multi-tab push; the per-spouse Form 8879 signing flow; the client's copy; the
examination response pack; penalty and interest estimate; related returns record; outside filings list. Each appears where
it would live, as a captioned image with "Designed, not built in this round" and a link to the mock-up.

### Later (named in the write-up)
AI suggestion layer for unrecognised documents; standards change re-evaluation; large, minimal and unknown-type test packets
beyond the altered one; retention hold.

## 3. Architecture
- Next.js (App Router, TypeScript), deployed on Vercel. One repo folder `project-build/`.
- `src/domain/` pure TypeScript, no framework: `packet` (types, load, validate, indexes), `refs` (reference resolver),
  `checks` (library + catalogue), `events` (types, store interface, projections), `policy` (roles, actions, masking),
  `clock`, `versions` (compare, finalized, swings), `docs` (landing and reasons, simulated page model).
- Store adapter: `EventStore { append(ws, e): seq; list(ws, afterSeq) }` with three implementations: memory (tests),
  file (local dev), Postgres (`DATABASE_URL`, one `events` table) or Vercel Blob (`BLOB_READ_WRITE_TOKEN`) in production,
  chosen by environment. Writes carry `baseVersion` for the claim; a stale write returns 409 with the newer events.
- API routes (`src/app/api/`): `GET /api/w/:ws/state?role=&after=` returns the role-filtered, masked projection;
  `POST /api/w/:ws/events` validates role and policy server-side, appends, returns seq. The client never receives
  unmasked identifiers unless a reveal event exists for that role and identifier.
- UI follows the hybrid mock-up: header (product, client, role switcher, version, stage, story time, saved state), left
  nav plus history, centre screen, right claim drawer. Tokens, fonts and status words copied from the mock-up.

## 4. Data model (events over a read-only packet)
Event: `{ seq, ws, at (wall), storyAt, role, type, claimId?, payload, baseVersion?, groupId?, retracts? }`.
Types: adjustment, review_note, note_resolved, signoff, question_to_client, answer_recorded, reason_set, reveal,
clock_moved, undo, assignment, attach_note, what_if_viewed (not stored). A claim is a line key or a document id or a
finding id. Projections: claim state (current value, original, history, sign-offs with staleness), blockers, document
reasons, reveal log, finalized version. Notification projection exists in the domain (for the designed bell) but is not
rendered beyond a simple "since you last looked" list on Home.

## 5. Checks (deterministic, general)
Families, each written against schema fields, never ids: two documents disagree; value counted twice (page, payer,
summary vs detail); tie-out to agency record; identity vs prior year; a field the rule ignores (payment tax year, FX
rate year); limit or cap exceeded; answer after the last computation; open item never closed; residency and sourcing;
cheaper election in `what_if`; blank read used as zero; judgment needed (flag only). The catalogue maps each ledger
finding to the check that surfaces it. Every check has a test on the real packet and a test on an altered copy proving
it can stay silent and can fire (B17 first part).

## 6. Roles and policy (server)
From `firm.staff` and `firm.client_users`: role, credential, clearance, `active_from`. Rules from
`firm.starter_standards`: may not review own work; tax effect over 1,000 needs partner sign-off; open review notes block
approval; masking and view log. Clients see only their own documents (`belongs_to`) and questions addressed to them, in
plain words. The examiner sees only the Letter 566 items and the documents they cite, after the letter's date.

## 7. Testing
Vitest unit tests for every domain module, written first. One test per ledger finding (its check fires on the real
packet). Altered-packet fixture built in memory (renamed people, removed forms, an extra staff member). Policy tests per
role. Playwright e2e per role on the built app: open, switch role, click a number, see the source; Marcus cannot reveal;
client sees no internal text; an adjustment survives reload. SSN scan script in CI.

## 8. Deploy
Vercel project `tax-workpaper` (team aarvingeorges-projects), root `project-build`. Deploy the empty shell first, then
after each lane merges. The link is public (no deployment protection) and opens on the Start here panel.

## 9. Grader walk (acceptance)
1. Open the link cold: Start here explains in five lines; counts from the packet are shown (74, 3,012, 3 versions).
2. As Daniel, open Checks: blockers first; click California estimates: drawer shows 14,000, the three FTB payments, the
   15 Sep 2025 payment designated for 2024 (D68), the check that caught it.
3. Adjust it to 10,500 with a reason: tax effect estimate shown, original kept, Helen's approval now needs partner sign-off.
4. Switch to Marcus: SSNs masked, Reveal disabled with the firm rule quoted. Switch to Ngozi: plain words, her questions only.
5. Reload: the adjustment is still there. Open Findings: 27 rows, each linked to its check and evidence.
6. Move the story clock to after acceptance: the return is "As filed, locked"; Filing shows the rejection and fix.

## 10. Risks and cuts
Database provisioning needs Aarvin (Vercel Marketplace); fallback adapters keep saving working. If time runs short, cut
in this order: Areas breadth, what-ifs, bulk actions, compare beyond v2/v3; never cut trace, checks, roles, saving, deploy.

## 11. Amendments after Fable's fresh review (17 Oct 00:00 EDT; review in scratchpad review/spec/spec-review.md)
Facts verified by probe: 74 / 3,012 / 627 / 3 versions; F540NR.72 = 14,000 citing four D68 payments, one designated tax year 2024.
- **Added to Built:** header search (lines, documents, amounts, EINs; never identifier digits); Filing and after screen
  (timeline, extension, e-file rejection and fix, freeze, carryovers out, next-year plan from `planning_reference_2026`);
  related returns and outside filings as plain rows; verification events using the firm's five `verification_types`;
  decision events (election, due diligence, penalty, judgment, with authority); question to a colleague; deadlines from
  `firm.deadlines` measured on the story clock.
- **Designed, not built:** attaching a real file (notes are built).
- **Fixes:** walk step 2 reads "four payments on the line, three are 2025's; the 15 Sep payment is designated 2024 (D68)";
  walk step 3: Daniel's adjustment over the threshold needs Helen's partner sign-off. Payments and credits have no
  `tax_effect_rates` category: their tax effect is 1:1 (README). Next year's preparer is a persona of st-01 (Priya) at the
  tl-28 clock, not an eleventh person. Self-review: you cannot sign off a claim whose last adjustment you authored.
- **Masking scope:** masking is a regex pass over every text the role receives (printed pages, household, prior year,
  notes, timeline), not only `value_type`; a test greps the rendered response for every real identifier.
- **Clock and findings:** checks run independent of the clock; each finding carries `firstVisibleAt`; inboxes show
  findings visible at story time; the Findings page lists all ledger findings with "appears in the story on ...".
  A finding on a claim clears when that claim is adjusted (finalized projection) or explicitly cleared with a reason.
- **Adjustments:** proposed, then applied (by the reviewer or partner as policy says); undo is a compensating event.
- **Store:** Postgres in production (`DATABASE_URL`), file locally, memory in tests; Vercel Blob only as a fallback if no
  database is provisioned before deploy (no atomic sequence; ordering by time-sortable keys).
- **Polling:** the page re-renders on the server every 5 s (router.refresh); the packet is never re-sent.
