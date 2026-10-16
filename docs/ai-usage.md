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
