# Tax workpaper case study — project context

A take-home case study: build a web-native tax workpaper for one invented household's 2025 return.
The brief is `case-study-project-package/Case_Study_Redesign_the_Tax_Workpaper (1).pdf`; the data is the
JSON packet beside it (74 documents, ~3,000 extracted values, three computed return versions, a README that
defines every field). **The packet contains confident mistakes — finding them is part of the deliverable.**

## Deliverables (from the brief)
1. A working web app run from a link, loading the packet as delivered, saving everything, with a role switcher.
2. One page on the core idea and the data model.
3. The errors found, and how the design surfaced them.
4. A video walkthrough (the founder records it).
"Sending sooner is better" — scope to a strong, working core first.

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
  skill once installed, at the "internal tool / prototype" depth: one reviewer of a different model, no deploy ceremony.
- UI: `impeccable` is this project's design skill (the other two design plugins are disabled here).
- Deploy: the `vercel` plugin (project scope only).
- Never begin building until Aarvin says go.
