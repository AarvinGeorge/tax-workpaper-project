# Taxmark video: rehearsal and recording script (about 9 minutes)

Use one fresh workspace for the recording: `video-take1` (links below). Open these tabs first, in this order:
Daniel, Priya, Ngozi, Jo. Before you press record, open Daniel's tab and click Reset to start, then Confirm.

Base: https://taxmark-workpaper.vercel.app/w/video-take1

| # | Time | Show (click) | Say (one or two sentences, in your words) |
|---|---|---|---|
| 1 | 0:00-0:45 | Daniel `/daniel`: Start here, the counts | "Taxmark is a workpaper that proves the return. It starts where the pipeline stops: 74 documents, 3,012 values, three computed versions, read-only. Every number is a claim that carries its proof." |
| 2 | 0:45-2:00 | `/daniel/return?claim=line:F540NR.72`, then click a source | "Click any number: the page and field it came from, highlighted; the rule that built it; how confidently it was read. The pages are simulated from the JSON behind an interface a real PDF can replace." |
| 3 | 2:00-3:00 | `/daniel/checks`: blockers, our checks beside the engine's | "The packet has confident mistakes: wrong values read at 0.99. So we don't trust the engine. 27 deterministic checks re-derive what should agree, against the IRS and FTB records, other documents, last year. Here: 14,000 of California estimates, but one payment was designated for 2024." |
| 4 | 3:00-4:15 | Daniel adjusts F540NR.72 to 10,500 with a reason; switch to Priya's tab: toast, bell | "Adjusting keeps the original, who, why, and the tax effect, and over 1,000 it needs the partner. It's an event in an append-only log; Priya sees it live. That log is the audit trail: we never edit or delete." |
| 5 | 4:15-5:00 | Role switcher: Marcus on Documents (masked, Reveal refused); Ngozi Home (plain words) | "Roles are enforced on the server, not the screen. Marcus has no clearance: last four digits only, and reveals are logged. Clients see only their own items, in plain words." |
| 6 | 5:00-6:15 | `/daniel/checks`, scroll to ✦ AI suggestions; open the heat-pump one | "AI sits before the backend, never on page load. A reader, Claude Sonnet, reads the free text with identifiers masked and proposes findings with exact quotes. Code verifies every quote is on its page; a person accepts. It never blocks filing." |
| 7 | 6:15-7:15 | `docs/handin/ai-scorecard.md` (or say it) | "Before trusting it, a harness scored it blind against the 27 known mistakes. The automatic score said 17; a second model judging each match said 13. It made three confident mistakes, perfect quotes from a superseded 1099, now caught by a rule; and it found one mistake our own review missed." |
| 8 | 7:15-8:15 | Jo `/jo/firm`: move the clock to 13 Jul (rejection), then 15 Jul (accepted): "As filed, locked" | "One story clock replays the season: the rejection, the fix, acceptance. At acceptance the return freezes; later changes are amended on top." |
| 9 | 8:15-9:00 | Back to Home | "Decisions and trade-offs are logged one per line; AI built it with a different model reviewing every round by running probes. Next: a secure returns registry behind sign-in, and sources cited on every tax definition." |

## Lines to keep exact
- "The automatic score said 17; judged, it is 13 of 27." Never quote 88%.
- "No model is called when a page loads."
- "Designed, not built: file upload, the examination response pack, the penalty estimate, many returns."

## Trade-offs to name if asked
- Role switcher instead of sign-in, so a grader sees every view from one link.
- Finalized return is v3 plus our adjustments, not recomputed; tax effects are estimates from the packet's rates.
- One story clock per workspace.
- Five check families depend on wording in free text; that tier is where the AI reader helps.
