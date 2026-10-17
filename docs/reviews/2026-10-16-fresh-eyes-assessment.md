# Fresh-eyes assessment: tax workpaper case study

Reviewer: Fable 5.1, no prior context. Written Fri 16 Oct 2026 23:05 EDT (03:05 UTC Sat), from `date`. Deadline Sat 17 Oct 21:00 EDT: **about 22 hours left**. Read-only; nothing in the repo touched.

## 1. What is asked, and how close each item is (measured)

| Hand-in (brief.txt:70-76) | State | Evidence |
|---|---|---|
| 1. Web app from a link; loads the packet as delivered; saves everything; role switcher | **0%** | `ls project-build` = `.gitkeep` + empty `tests/`; 10 commits, none with product code; no spec; `vercel whoami` → "token is not valid"; no pnpm, no psql, no sign of a database |
| 2. One page: core idea and data model | ~40% raw | Idea decided (decisions.md:8; discovery 10 §2); data model decided in words (decisions.md:9). No page, no drawing |
| 3. Errors found, and how the design surfaced them | ~60% raw | `docs/ground-truth/README.md`: 27 findings with ev ids, line keys, tax effects (files 01-04 cite 59 ev ids, 78 line keys). Only 5 of 27 spot-checked against `printed_content` (README.md:14-23). "How the design surfaced them" cannot be written: no design exists in code |
| 4. Video | 0% | Pipeline visual exists (v3, decisions.md:115); nothing to record against |
| AI-usage note | current | `docs/ai-usage.md` 29 lines, `docs/decisions.md` 116 lines, kept same-turn |

The mock-up (11 `.dc.html`, 680 KB) is a design-canvas format (`class Component extends DCLogic`, Main.dc.html:208), not React; its data is hand-typed (the `TL` table, Main:215; 350 occurrences of the five household names). Reusable as spec, copy, tokens and screenshots; its render code and data are not.

## 2. Is the plan sound?

**Strong.** The ledger is specific, cited, and names the general check family per finding. The core idea (claim + pull-request stages) fits "someone who has never seen a workpaper". The order of authority (decisions.md:60) and the README audit paid off: the finalized-version gap (readme-checklist.md:76) and the "lots in cents" 100x trap (R56) were caught. The logs are honest and current. The mock-up's role views and story clock are a real asset.

**Over-invested.** About 30 wall-clock hours (first commit 15 Oct 17:56, last 16 Oct 15:48, plus seven uncommitted) produced 84 markdown files, ten reviewed discovery sections, three layout directions, a mock-up through eight Fable rounds, OCR and PII research, a pipeline visual redrawn three times. Each is defensible alone; together they consumed the build day, and the per-file author → review → fix → re-review loop cannot run a build in 22 hours.

**Under-invested.** Product code (zero), the deploy path (login invalid, no database), the grader's cold-open experience, and the 22 unverified findings that will go into the hand-in as fact.

**The requirement list is not a plan.** 11-brief-checklist.md marks all 20 U items and 24 of 26 B items First (§6). decisions.md:78 sized just the five accepted calls at "about 1.5 days of build": already more than the time left.

**Single biggest risk:** submitting a mock-up plus documents without a working link. Hand-in 1 fails outright, and items 2-4 ("how your design surfaced them", a video "walking through the prototype") depend on it. Everything is secondary to a deployed app by morning.

## 3. Is "everything First" achievable? No. The minimum credible submission

The mock-up, a picture with no backend or real data, took six parallel Opus authors about eight hours and still needed four integration fixes that seven green per-file suites missed (decisions.md:88, :108). Integration is serial; parallel agents do not shorten it. The full First list is days of work.

The grader's own words give the cut: "Sending sooner is better". A thin, working, honest slice beats a wide one that half-works. The packet does most of the work if the app is **generic views over the README schema**: `lines[].inputs/sources/rule` is already a calculation graph, `changes_from_previous` a version diff, `what_if` computed, `starter_standards` the thresholds and steps.

**Must work end to end on the real packet (thin is fine):**

- **Load, save, roles (70-71).** Packet read from the repo file, SHA-256 shown, nothing typed from it. One Postgres `events` table (seq, at, role, type, target, payload, retracts_seq) behind two routes. Workspace id in the URL. Switcher: 6 staff, 2 clients, an examiner; role checked on the server.
- **Evidence (18-32).** Click any of the 627 v3 lines → drawer: `ev-` sources open the page rendered from `printed_content`, value highlighted by `position`; `py:`, `asset:`, `ref:param`, `household:`, `qa/msg/call` render as a labelled card; unknown refs as text. Document index of 74 with "where it landed / why not" derived from which lines cite its ev ids plus `extraction.reason`. Verification = an event with one of the firm's five types. A note on a claim = evidence.
- **Calculation (22-25).** "How built" = rule id, its `engine_reference` description, inputs, recursively. The 27 checks plus a generic "inputs sum to the line" check, run from printed values and `ref:param`, never from the engine's line. The 302 lots in one virtualised table. State split from `SchCA540NR`.
- **Change (33-35).** Adjust event (who, why, category, delta × `tax_effect_rates`, version priced at). v1/v2/v3 compare from `changes_from_previous`. The packet's 5 what-ifs, labelled. Bulk clear with undo as a compensating event. "Since you last looked" from a per-role last-seen.
- **Judgment (36-38).** Swings vs 2024 by matching line labels at the firm's 10%/1,000 rule. A decision event (election, due diligence, penalty) with who and why. Completeness = unaccounted documents plus the firm's 12 required steps as a checklist.
- **People (39-42).** Question-to-client event that becomes evidence once answered; review note that blocks; sign-off storing the hash it covered, stale when a later event changes it; assignment event. Client approval and 8879 = one event per spouse, no PDF. Client role sees plain words only.
- **Filing and after (43-45).** Story clock over the packet timeline merged with our events; freeze = no adjust after tl-23 unless flagged amendment; notice = Letter 566 items with sources; carry-forward = `carryovers_out` plus open items.
- **Firm (46-47).** Standards from the packet, edits as events; masking of `ssn`, `account_number`, `ip_pin` by `value_type`, a reveal event as the view log; budget vs time from `budget_hours`; one search box over lines, documents, values.
- **Records (48-53).** One generic record-table component over `assets[]`, `basis_records`, carry-ins, the prior preparer memo, K-1 lines, payments vs transcript, grouped by `budget_hours` keys as the Areas screen.

**Show as designed only** (mock-up screenshots, labelled "designed, not built"): notification bell, live multi-tab sync, the full 8879 flow, the client's copy, the examination response pack, next-year plan, interest and penalty estimate, standards re-evaluation, the five test packets.

**Drop:** chat helper, large generated packet, OCR/PII, retention hold, threshold-crossing warning, Playwright beyond one smoke per role.

A grader accepts this because every "must do" bullet works minimally on the real packet, each gap is named, and the design surfaces all 27 errors.

## 4. Order of work, Fri 23:15 to Sat 21:00 EDT

Hard constraint: Aarvin needs a stable link five hours before the deadline to record, retake and upload, so **code freeze is 14:00**.

- **23:15-23:45, Go 1 (Aarvin):** accept the cut; `vercel login`; provision Neon via the Vercel marketplace (if it stalls 30 min, fall back to one JSON event file per workspace in Vercel Blob); update the CLAUDE.md deadline.
- **23:45-01:30:** skeleton: Next.js + TS, packet loader with light README typing, events table and two routes, role switcher; **public deploy with the packet counts on screen by 01:30**. Parallel: agent B, the 27 checks as pure functions, test-first from the ledger; agent C, document-page renderer and reference resolver, tested; agent D re-verifies the 22 unspot-checked findings against `printed_content`; what fails leaves the hand-in. Aarvin can sleep from about 00:30.
- **01:30-06:30:** core loop in the main session: return map by form, claim drawer, documents and landing, checks inbox wired to B, events (adjust, note, sign-off, question, clear/undo), server role check and masking with reveal log. Redeploy 03:30 and 05:30. Parallel: agent E, schema and API tests; agent F, one-page draft and the errors write-up skeleton (27 rows: mistake, check that surfaces it, screen).
- **06:30-07:00, Go 2 (Aarvin):** open the link cold, name the demo path, approve breadth scope.
- **07:00-11:00:** breadth: versions and what-ifs, swings, story clock with freeze and amend, Areas record tables, Firm and search, client and examiner views, finalized version (v3 + applied adjustments) on Filing. Redeploy 09:00 and 11:00. Parallel: agent G, one Playwright smoke per role on the link; agent H, impeccable pass on the demo path only.
- **11:00-12:30:** one Fable review of the deployed link, must-fix only; fixes. Writers finish the one-page (Archify drawing: claim → sources, checks, events), the errors write-up, the AI note from both logs.
- **12:30-14:00:** empty states, "all data invented" banner, a **Start here** panel; **freeze at 14:00**, final deploy, commit.
- **14:00-15:00, Go 3 (Aarvin):** read the write-ups, test the link in a private window, approve.
- **15:00-18:00:** Aarvin records: script from the demo path, pipeline visual as the opening slide, retakes, upload. Agents idle except a hotfix lane.
- **18:00-20:00:** buffer; assemble the submission (link, one-page, errors, video link, AI note). **Submit at 20:00**, not 20:59.

Build rules that differ from the last 30 hours: one review round, on the deployed link, must-fix only; no spec document (checklist, hybrid brief and mock-up are the spec); agents integrate through the main session; every deploy is looked at in a browser before the next round (decisions.md:114).

## 5. What everyone has missed

1. **The grader's first 30 seconds.** Nothing in 84 documents says what the reviewer sees when the link opens cold. A "Start here" panel (which role you are, three things to click, where the 27 findings live) and an in-app **Findings** page, deliverable 3 made navigable, are the highest-leverage hour in the plan.
2. **Honesty in deliverable 3.** The errors were found by Python scripts on 15 Oct, not by the design. Say so: found by analysis, then turned into general checks the design surfaces. Overclaiming is what a 20-year CPA would catch.
3. **22 findings have never been spot-checked** (ground-truth README.md:23). One wrong "error" costs more than one missing error. Verify tonight in parallel; drop what fails.
4. **The mock-up's code cannot ship, and the next planned step was another document** (plan.json:259; the spec). Both are decided. Go straight to code.
5. **The process is the risk, not the people.** Eight review rounds on a picture is the habit that will stop the app shipping. Tier b allows one reviewer, not one per round.
6. **The deploy path was never exercised.** An invalid Vercel token and no database at T-22h is the first fix; only Aarvin can do it.
7. **Shared state on a public link.** Without a workspace id in the URL (decided, decisions.md:9, not yet designed in) the grader inherits the previous grader's adjustments.
8. **The video needs five hours.** decisions.md:13 planned a 17:00 stop for a 21:00 deadline; no room for a retake or a failed upload. Freeze at 14:00.
