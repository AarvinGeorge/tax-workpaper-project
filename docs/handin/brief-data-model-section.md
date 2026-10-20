# Brief section: the findings shaped the data model (goes after "Core Idea")

**The findings shaped the data model.** Every confident mistake I found was a number that looked right and was still wrong,
and 25 of the 27 were read at 95% confidence or more. That told me confidence could never be the proof, so every number in
Taxmark had to carry its own source, how it was built, how it was checked, and what it still fails.

**One packet, read three ways.** The input packet was never split up or changed. The same packet was read by three
readers, each with its own job, and that separation is what lets me trust the result:

- **The independent investigation (outside the app, before any code).** An AI-assisted hunt across the whole packet,
  with four AI researchers each taking one area, a second model reviewing their work, and me resolving anything in
  doubt, produced my ground-truth ledger: 27 distinct confident mistakes. This ledger is my answer key. It never
  creates a finding: the app only uses it to label a finding a check has already raised with its ledger id, and
  outside the app it tests the checks and grades the AI.
- **Deterministic checks (inside the app).** Each kind of mistake became a rule, 15 families in all, written against
  the packet's schema and never against a specific document, so the same checks would run on the next client's
  packet. There is a test for each of the 27 that fails if the app ever stops flagging it.
- **The AI reader (inside the app, for what rules can't read).** Some mistakes live in wording, like a client's answer
  or a note on a page, where rules are at their weakest. A background job runs an AI reader over every document
  once per packet, never while someone is browsing. Code then checks that every quote it gives is on its page, word for
  word, before a suggestion is shown, and a person accepts or dismisses each one. I evaluated it with a harness
  against the ledger: grounding 40 of 40 (100%), precision 25 of 40 (63%), and recall 13 of 27 (48%) once a second
  model judged each match, plus one real mistake I had missed. A test in CI fails the build if a suggestion is
  ungrounded or its automatic recall score drops below 16 of 27.

**Read-only underneath, everything on top.** The packet and the AI reader's output stay read-only: never edited, only
built on. Everything a person does sits on top of them:

- **Event log:** append-only. Adjustments, notes, sign-offs, questions, decisions, undo. Nothing is edited or deleted;
  an undo is a new event on top. The audit trail is the data, not a feature.
- **Projection:** for one role, at one point on the story clock: findings, blockers, sign-offs (fresh or stale),
  adjustments carried through the totals, masking.
- **Claim:** anything that can hold evidence and actions: a line, a document, a finding.

*(Figure: "Taxmark: one packet, read three ways", graph in `docs/handin/data-model-graph.png`.)*
