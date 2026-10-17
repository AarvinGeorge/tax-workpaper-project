# Tax workpaper case study — project context

A take-home case study: build a web-native tax workpaper for one invented household's 2025 return.
The brief is `case-study-project-package/Case_Study_Redesign_the_Tax_Workpaper (1).pdf`; the data is the
JSON packet beside it (plain-text copy of the brief: `docs/brief.txt`) (74 documents, ~3,000 extracted values, three computed return versions, a README that
defines every field). **The packet contains confident mistakes — finding them is part of the deliverable.**

## Deliverables (from the brief)
1. A working web app run from a link, loading the packet as delivered, saving everything, with a role switcher.
2. One page on the core idea and the data model.
3. The errors found, and how the design surfaced them.
4. A video walkthrough (the founder records it).
The hand-in must also say how AI was used: keep `docs/decisions.md` (one line per decision, with the trade-off)
and `docs/ai-usage.md` (what each tool or model did) from day one; both feed the video.
"Sending sooner is better" — scope to a strong, working core first.

## Deadline and order of work
**Submit by Sat 17 Oct 2026, 21:00 EDT (01:00 UTC Sun 18 Oct)** (extension, Aarvin, 16 Oct; was Fri 16 Oct). Code freeze 14:00 EDT Sat; video 15:00-18:00; submit by 20:00.
working, deployed core over breadth. Order:
1. **Hunt the confident mistakes first (time-boxed).** Read the packet README, then cross-check values, versions,
   prior years and client answers; log each finding in `docs/ground-truth/` as you go. The findings shape the data
   model: every number carries its source, its confidence, how it was verified, and the checks it fails.
2. **Core idea + data model** — brainstorm with Aarvin, one short decision, then build.
3. **Thin end-to-end slice, deployed early:** load the packet → trace any number to its simulated source document and
   field → surface every logged mistake → role switcher → saving → live link. Then widen capability in rounds,
   redeploying after each.
4. **Last:** the one-page core idea and data model (Archify drawing), the errors write-up, `docs/ai-usage.md`; the video.
`docs/decisions.md` and `docs/ai-usage.md` are written as each decision or tool use happens, never reconstructed at the end.

## Layout
- `case-study-project-package/` — the brief and the packet, as delivered. Read-only; never edit.
- `project-build/` — the app's source.
- `project-build/tests/` — automated tests: one per known packet mistake asserting the app surfaces it, plus
  Playwright browser tests per role. A mistake that stops being flagged fails a test.
- Plans, notes, research and groundtruth discovery in `docs/`.
- `docs/ground-truth/` — the ledger of every confident mistake found in the packet: document, field, value, why it is
  wrong, evidence. Raw form of deliverable 3; each entry gets a test in `project-build/tests/`.
- No `evals/` unless the app gains an AI feature (evals score model judgement; this app's results are computed).

## Working method
- Process: Superpowers (brainstorm → plan → test-driven build → review → verify). Use the `engineering-method`
  skill at tier b (internal / take-home): one reviewer of a different model, no deploy ceremony.
- UI: `impeccable` is this project's design skill (the other two design plugins are disabled here).
- Deploy: the `vercel` plugin (project scope only); sign in through `/mcp` before the first deploy.
- Gmail, Calendar and Drive tools are denied in this project (`.claude/settings.json`).
- Inspiration: the REA MCP server (`rea-agents@6.5.0`, local scope, this project only) — observe existing web apps'
  structure, flows and UI patterns for ideas. Learn patterns; never copy another product's code or assets.
- Never begin building until Aarvin says go.
