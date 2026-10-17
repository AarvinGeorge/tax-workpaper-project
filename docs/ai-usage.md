# How AI was used

One line per use: date · tool or model · what it did · what a human checked.

- 2026-10-15 · Claude Code (Opus 5.5) · set up the repo, CLAUDE.md, plugins; Fable reviewed readiness · Aarvin approved each step
- 2026-10-15 · Claude Code (Opus 5.5) · read brief + packet README, wrote docs/brief-explained.md, set up plan/ (plan-layer light) · Aarvin to read
- 2026-10-15 · 4 × Opus 5.5 subagents · hunted packet mistakes by area into docs/ground-truth/ · main session to spot-check each finding against the packet
- 2026-10-15 · 1 × Sonnet subagent · web research: workpaper standards, existing tools, glossary → docs/research/industry.md · citations to be spot-checked
- 2026-10-15 · Claude Code (Opus 5.5) · merged the four hunts into docs/ground-truth/README.md, spot-checked 5 findings against printed_content · Aarvin to review
- 2026-10-15 · Fable 5.1 + Opus 5.5 subagents (independent, read-only) · reviewed the 'where does saving live' brainstorm question · both found the framing biased and proposed an append-only event log with workspaces per link; Aarvin decides
- 2026-10-15 · 4 × Opus subagents + 1 writer (deep-research skill) · US standards, traditional workflow, documentation frameworks, security/e-file rules → docs/research/reports/ · citations to be spot-checked
- 2026-10-16 · Claude Code (Opus 5.5), main session · discovery section 1 (Evidence): measured the packet with read-only scripts (scratchpad disc/ev2–ev4.py) and wrote docs/discovery/01-evidence.md · Aarvin to review
- 2026-10-16 · 7 × Opus 5.5 subagents (background, read-only on the packet) · drafted docs/discovery/02–08 (Calculation, Change, Judgment, People, Filing and after, Firm, Records a CPA expects) · main session spot-checks before Aarvin reviews
- 2026-10-16 · Fable 5.1 subagents · independent reviews of each discovery file (re-measure, open cited sources) → docs/discovery/reviews/
- 2026-10-16 · Opus 5.5 subagent · discovery 9 Person and place rules (age, dependency, residency, state, city) with live sources
- 2026-10-16 · 3 × Opus 5.5 researchers + 1 Opus writer (deep-research skill) · Unlimited-OCR fit report → docs/research/reports/Unlimited OCR fit for tax workpaper.md · recommendation: don't build; anchor design + one adapter test now
- 2026-10-16 · script (no model) + Opus 5.5 explainer + Fable 5.1 verifiers · packet README recorded verbatim (docs/packet/) and explained in plain language
- 2026-10-16 · 3 × Opus 5.5 researchers + Opus writer + Fable 5.1 reviewer · local PII redaction report → docs/research/reports/Local PII redaction for tax documents.md; review found a wrong §7216 paragraph, an incomplete value inventory and an understated NER figure; writer applying fixes
- 2026-10-16 · 3 × Opus 5.5 researchers + Opus writer (Fable 5.1 review running) · customer-first UI/UX research → docs/research/reports/Customer first UI for tax workpaper.md (33 checkable design rules)
- 2026-10-16 · Claude Code (Opus 5.5), main session, impeccable skill · PRODUCT.md from Aarvin's answers; 3 interactive layout directions on a Design canvas (claude.ai/artifact/3SjRkRoEYHNHaDixg9M7j4), source copied to docs/design/mockup-directions/
- 2026-10-16 · 3 × Opus 5.5 (one per direction, in parallel) + Fable 5.1 reviewer · added a working 8-person role switcher to directions A, B, C; Fable ran every role through a Node harness and checked facts with python3 -I against the packet (4 must-fix leaks to client/examiner, 10 should-fix); the authors fixed their own files and caught one main-session error (three 2025 CA payments, not four) · docs/design/mockup-directions/REVIEW-roles.md
- 2026-10-16 · 3 × Opus 5.5 authors + Fable 5.1 reviewer · README and starter-standards conformance pass on A, B, C (fix rounds 2 and 3); Fable re-review found 0 must-fix, no README instruction violated, all new facts correct · docs/design/mockup-directions/REVIEW-readme.md
- 2026-10-16 · Fable 5.1 (5 parallel reviewers): independently reviewed my five open calls against the order of authority; 1 agree, 4 modify; caught my tunnel vision on call 5 and my misstatement of GT-A05. Copies in docs/discovery/reviews/five-calls/.
- 2026-10-16 · Opus 5.5 (4 parallel authors): wrote the hybrid mock-up (shell + drawer; home, return map, documents; checks, review; changes, filing, firm) from one shared brief; Fable reconciliation review to follow.
- 2026-10-16 · Fable 5.1 (4 parallel reviewers): reconciliation review of the hybrid (frame + shell/drawer/home/map; documents/checks/review; changes/filing/firm; whole-frame coverage of the brief and the ledger) against the order of authority; in progress.
- 2026-10-16 · Opus 5.5 (same 4 authors): fix round H1 across all 10 files; Fable 5.1: scoped re-review of the fixes, in progress.
- 2026-10-16 · Opus 5.5 (author A, new): Areas screen and 11 new drawer claims; authors S/H/R/F: round H2 fixes, search; Fable 5.1: round-H2 review in progress. Hybrid published as version 6 (version 5 was saved by something other than me; the type's release also changed).
- 2026-10-16 21:20 EDT · Fable 5.1: blind line-by-line checklist of the brief (every phrase an item, done-test, packet-grounded edge cases, mock-up coverage with file:line), plus a review of the several-tabs live-notification idea. Opus 5.5: the notification and multi-tab design proposal.
- 2026-10-16 21:36 EDT · Fable 5.1: blind brief checklist (91 items, probes probe1/probe2, terminology map); Opus 5.5: transcribed Aarvin's handwritten notes (5 photos) and merged both into discovery 11.
- 2026-10-16 23:50 EDT to 17 Oct 00:05 · Opus 5.5 (main): build context checklist, spec, plan (writing-plans skill), Next.js scaffold, packet copy with hash check, SSN scan, packet loader and index (test first, 3 passing), domain contracts. Fable 5.1: fresh review of the spec (facts verified by probe; 20 amendments applied). Opus 5.5 x5 (lanes A checks, B refs/docs/versions, C events/store/policy/API, D1 shell and trace screens, D2 work screens): building in parallel against contracts.ts.
- 2026-10-17 00:35 EDT · Opus 5.5 x5 lanes finished (A 71 tests, B 51, C 56, D1 17 unit + 8 e2e, D2 8 e2e); Fable 5.1: review of the built app running.
