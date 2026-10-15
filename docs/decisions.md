# Decisions

One line per decision: date · decision · why · trade-off.

- 2026-10-15 · Hunt mistakes in four parallel areas (wages/credits; investments/K-1; business/rentals; state/deductions/whole-return math) before any design · findings shape the data model · costs agent tokens, saves wall-clock on a one-day deadline
- 2026-10-15 · plan-layer in light mode for shared state · one-day project needs the page and the gate, not archives · no figures or roll-ups
- 2026-10-15 · case-study-project-package/ is read-only ground truth: Edit/Write denied in .claude/settings.json; SHA-256 recorded (packet ee01f850…ad19, brief e81f876c…6fe2) for a test to assert later · Aarvin's rule; the app loads the packet as delivered · a shell command could still write there, so the hash test is the real guard
- 2026-10-15 · Core idea: every number on the return is a claim that must be proven (evidence, checks, verification, notes); documents view built in (where each landed, or why not) · matches the brief's purpose and all 27 mistakes surface as failing checks on claims · a document-first or timeline-first lead was given up; timeline lives inside claims as history
- 2026-10-15 · Saving: server database (Postgres) as the master copy from the start; every change an append-only event over the read-only packet; current state = packet + replayed events; workspaces per link; polling for live updates · industry practice for professional records (never erase, server-held, server-checked roles, freeze at filing); Fable and Opus both favoured the event log · 2-3 h more setup than browser-only storage; no real login (role switcher), polling not push

Back-filled 2026-10-15 23:02 UTC (decided earlier today, not logged at the time):
- 2026-10-15 · Process: engineering-method at tier b (internal / take-home) · one-day take-home, no live users · no deploy ceremony; reviewer must still be a different model
- 2026-10-15 · Deadline: Fri 16 Oct 2026 21:00 EDT (01:00 UTC Sat) · Aarvin's hour · build stops ~17:00 EDT for write-ups and video
- 2026-10-15 · Repo: private GitHub AarvinGeorge/tax-workpaper-project, main pushed · private per CLAUDE.md; Aarvin picked the name · reviewers need adding as collaborators if they want code access
- 2026-10-15 · Research model routing: industry scan on Sonnet, mistake hunt on Opus · a missed mistake costs more than a thin citation · research citations need a spot-check before use in the hand-in
- 2026-10-15 · Ledger rules: tax effect = change × v3 tax_effect_rates, each finding alone; duplicates merged (A06=C03, B05=C09) → 27 distinct; 5 high findings spot-checked against printed_content by the main session · the packet's own README method · interactions between fixes not computed (the real system recomputes)
- 2026-10-15 · Brainstorm questions get an independent second opinion from Fable and Opus when Aarvin asks · catches framing bias (it did: missed event-log and workspace options) · two extra agent runs per question
- 2026-10-15 · Deep research on US standards and traditional workflow before fixing round-1 scope · scope should follow recognised practice, not guesses · ~30 min delay to the brainstorm

From here on, every decision — product or process — is logged in the same turn it is made, prefixed "Process:" when it is about how we work.
- 2026-10-15 · Process: research report 'US tax workpaper standards and process' (docs/research/reports/) is the basis for round scope; its 'must-have vs described-only' table is the starting cut · no US body prescribes a tax workpaper format, so scope follows the duties (SSTS §2.3, Circular 230 §10.34(d), Reg. §1.6695-2) and Pub 1345 freeze · several citations unverified (AS 1215 wording, CA 4-year rule for CPAs)
