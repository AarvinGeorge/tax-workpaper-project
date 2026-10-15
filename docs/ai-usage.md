# How AI was used

One line per use: date · tool or model · what it did · what a human checked.

- 2026-10-15 · Claude Code (Opus 5.5) · set up the repo, CLAUDE.md, plugins; Fable reviewed readiness · Aarvin approved each step
- 2026-10-15 · Claude Code (Opus 5.5) · read brief + packet README, wrote docs/brief-explained.md, set up plan/ (plan-layer light) · Aarvin to read
- 2026-10-15 · 4 × Opus 5.5 subagents · hunted packet mistakes by area into docs/ground-truth/ · main session to spot-check each finding against the packet
- 2026-10-15 · 1 × Sonnet subagent · web research: workpaper standards, existing tools, glossary → docs/research/industry.md · citations to be spot-checked
- 2026-10-15 · Claude Code (Opus 5.5) · merged the four hunts into docs/ground-truth/README.md, spot-checked 5 findings against printed_content · Aarvin to review
- 2026-10-15 · Fable 5.1 + Opus 5.5 subagents (independent, read-only) · reviewed the 'where does saving live' brainstorm question · both found the framing biased and proposed an append-only event log with workspaces per link; Aarvin decides
- 2026-10-15 · 4 × Opus subagents + 1 writer (deep-research skill) · US standards, traditional workflow, documentation frameworks, security/e-file rules → docs/research/reports/ · citations to be spot-checked
