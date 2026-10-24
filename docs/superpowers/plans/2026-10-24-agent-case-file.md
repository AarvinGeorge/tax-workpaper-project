# The agent gets a prepared case file and a calculator (agent redesign, step 1)

> Tier b. Test first; Fable 5.1 plan and code reviews; offline only (no API spend). Follows the agent build
> (docs/superpowers/plans/2026-10-24-ai-agent.md). Direction: Aarvin, 24 Oct 17:30 EDT ("process the input packet
> before sending it to the agent ... a tool that encompasses all the calculations ... the agent can decide which formula").

**Goal.** The agent starts from a case file our code prepares from the packet (a schema card, a state map of every line,
and the engine's list of open items) instead of the raw README, standards and line list, and it verifies through one
calculator tool whose every method is our own code. The model chooses what to check; code does every number.

## What the code shows today (measured 24 Oct, offline, chars/4)
- The cached starting context (`agentContext`, ai/lib/agent-core.ts) is about 22,900 tokens: return lines 12,700,
  document index 2,900, packet README 2,300, client answers 1,700, case brief 1,300, the rest 2,000. System prompt 790.
- Cost: that block is cached, so 40 turns read it for about $0.20 at Opus 5.5 cache prices. Trimming it saves cents;
  the case file is for aim (fewer wasted turns, no recomputation by the model), not for a cheaper start. What costs
  money is turns, tool-result size and output; those are what the paid run will measure.
- Each return line carries a `rule` (627 of 627), and `inputs` (221) and `sources` (431) where present; the packet's
  `engine_reference` holds 40 parameters and 97 rules in words.
- Calculation code that exists and is pure: `proofsFor` (agreement to source, recalculated, prior year, third-party
  record), `flowGraph` (replays a line only for arithmetic rules: R-SUM, R-CARRY, R-RENTAL-LINE, R-8949-LOT; anything
  past a tax computation "needs the engine" and is never estimated), `sameFacts` (every copy of a fact),
  `leftovers` (unproven lines, uncovered engine warnings, uncited money).
- Not available as a general function: caps, limits, brackets, phase-outs, AMT. The limit family's checks are
  specific (e.g. CHK-SEP-LIMIT). The calculator will not offer them; the case file says they need the engine.

## What stays exactly as today
The app, the live AI output, the reader, the verifier, the behaviour contract and every live screen. The agent is
offline (CLI) and its output goes to an eval file; nothing here touches the store or a route. Masking, the data note on
every tool result, the SSN scan, result size caps, the answer key kept out, and the three modes (default, blind,
hide-checks) all hold, and the case file obeys the mode: blind shows no findings, hide-checks hides the seeded checks.

## Part A: the case file (replaces `agentContext`)
New module `ai/lib/case-file.ts`, pure, built from the PacketIndex and the mode:
1. **Schema card**, about 300 tokens, written once by hand from the README: what a document, page, extracted value,
   return version, line (key, rule, inputs, sources), diagnostic, rule and parameter are, and how ids look. The full
   README stays reachable through a `glossary(term)` method of the calculator, not pasted.
2. **Task routine**: the firm standards rewritten as numbered steps (from `firm.starter_standards`), plus the existing
   domain digest. The case brief is dropped: it describes our deliverable, not the agent's job.
3. **State map**: one row per latest-version line with a non-empty value: key, value, rule id and a one-letter status
   (P proved, F finding, O open, E engine). No label (`get_line` has it; with labels the map measured 16,773 tokens,
   larger than today's 12,719). No separate "copies disagree" flag: all five same-fact rules are checks, and the flag
   sat on 12 lines, all of them finding lines, so it would leak findings in blind and hide-checks. Every status comes
   from `findingsFor(ix, mode)` claims, never from `sameFacts` directly.
4. **Work list**: the engine's open items from `leftovers(ix, mode)`: counts by kind plus the top 40 by amount
   (about 900 tokens; all 409 would be about 11,000). The rest are reachable through the existing `list_open_leftovers`.
5. **Document index**: kept, compacted (id, type, issuer, year, landed or why not).
Client answers, messages, call notes and prior-year notes move behind `get_page`/search rather than being pasted,
unless the size measurement says they are cheap enough to keep (decided by numbers in Task 3, recorded).

## Part B: the calculator tool (`verify`)
One tool, `verify({ method, ids, target? })`, replacing `proofs_for_line` and `find_fact_copies` (7 tools become 6).
Inputs are ids only, never typed numbers, so the model cannot introduce a figure. Not every method is a pure wrapper:
`flowGraph` and `proofsFor` only report agreement (flowGraph picks the operation *because* it fits; of 136
arithmetic-rule lines the 7 it cannot fit include 4 finding lines), so the calculator adds a small amount of new
"differ" arithmetic, tested on its own. Methods:
- `recompute_line(key)`: by the rule's meaning (R-SUM, R-CARRY, R-RENTAL-LINE, R-8949-LOT): carry or add the listed
  inputs; report the plain result, the difference, and which sign combinations of the inputs reach the value (R-SUM
  lines legitimately subtract). Other rules: "needs the engine", with the rule's words from `engine_reference`.
- `sum_to(ids, target)`: referenced values (extracted values or lines) added, against a target line or value; the
  difference. This one method covers "agree to sources" (ids = the line's sources) and "compare two values".
- `prior_year(key)`: the line against last year's record for it, agree or differ, with both figures.
- `fact_copies(id)`: every copy of the fact on a line or document (`sameFacts`); in blind mode agreements only, in
  hide-checks the hidden checks' disagreements removed (as the current tool does).
- `glossary(term)`: the README entry for a field or concept (a lookup in its flat key-value map).
Every result says what was compared, the numbers, pass or differ, and the ids; it passes the existing envelope
(mask, data note, size cap, SSN scan).

## Tasks (red first; offline; `npm test` must stay green, the behaviour contract unchanged)
1. **Calculator.** Unit tests on the real packet per method: a proved line recomputes with difference 0; an R-SUM line
   whose listed inputs do not reach its value reports the difference (chosen by probing the packet, not from the
   ledger); `sum_to` agrees for a line's own sources on a proved line; ids-only input is enforced (a number where an id
   belongs is refused); unknown ids refused; blind `fact_copies` returns agreements only; result bounded and masked.
2. **Case file.** Tests: schema card present; every non-empty latest line appears once with a status; in blind mode no
   F status and no finding text, and the case file equals one built with no findings at all; hide-checks hides the
   seeded checks' findings; no ledger id, finding id or check id anywhere (the existing blindness grep extended to the
   case file); work list capped at 40 with counts; no SSN shape; deterministic output.
3. **Wire in and measure.** `agentSystem` uses the case file; tool list updated; the fake-transport agent tests pass.
   Record the case file's size by section next to today's 22,900, before and after, in this plan; if it grows past
   today's, report it and trim by numbers before review.
4. **Fable code review** (executes probes), fixes test-first, full unit suite, then present to Aarvin with the size
   numbers and an estimated cost per run built from them. **No paid run without Aarvin's approval of a budget.**
   No agent run exists yet (`ai/eval` holds no agent output), so nothing here claims "fewer turns": the first paid run
   is the baseline, and only later runs can be compared with it.

## Plan review (Fable 5.1, 24 Oct 17:34 EDT): APPROVE WITH CHANGES, all accepted
Probes offline over data/packet.json. (1) Size figures confirmed; inputs and sources only where present. (2)
`recompute_line` over `flowGraph` could never report a mismatch; now by rule meaning, with new tested "differ"
arithmetic; three adding methods collapsed into `sum_to`. (3) The "copies disagree" flag leaked findings in blind and
hide-checks (12 of 12 on finding lines); removed, statuses only from `findingsFor`. (4) With labels the state map was
16,773 tokens, larger than today; labels dropped, statuses one letter, measured before Task 3. (5) Work list capped
(409 items would be about 11,000 tokens); no baseline exists, so the first paid run is the baseline.

## Out of scope (next, each needs its own yes)
The verifier feedback loop inside the run (rejections returned with reasons); multi-run measurement (5 to compare,
10 to report; union, intersection, agent-only finds); planted-injection test documents; any route, store write or
switch of the live AI output; caps, limits or tax computations in the calculator.
