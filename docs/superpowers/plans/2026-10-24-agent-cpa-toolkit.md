# The agent reviews like a CPA on any packet: verify_all, schema lookups, a numbered routine (agent redesign, step 2)

> Tier b. Test first; Fable 5.1 plan and code reviews; offline only (no API spend) until Aarvin approves a budget.
> Follows docs/superpowers/plans/2026-10-24-agent-case-file.md. North Star (Aarvin, 24 Oct): the agent acts like a CPA
> reviewer on ANY packet that follows the packet schema; code verifies every number, the model judges free text. The
> checks in src/domain/checks/families/* are a floor for this packet, not a general reviewer.

**Goal.** One call settles every number code can settle (`verify_all`), a small set of id-only lookups reach every
schema section, and the prompt makes the routine explicit: sweep first, explain each difference from the documents,
then read free text. Written plan only; nothing here is built until Aarvin says go.

## What the code and the last runs show (measured 24 Oct 21:14 EDT, offline, scratchpad tsx/python3 -I probes)
- Last runs (ai/eval/*.run-meta.json, *.trace.json): default $1.99, 37 turns, 87 calls (get_page 57, get_line 20,
  verify 4: prior_year 3, recompute_line 1); blind $1.83, 34 turns, 122 calls (get_page 53, get_line 42, verify 5).
  The model reads pages; it barely uses the calculator.
- Calculator sweep, latest return (627 lines, 29 findings, runChecks 46 ms, full sweep 3 ms):
  - recompute_line over the 136 lines with an arithmetic rule and inputs (calculator.ts:63, flow.ts:15): 24 differ
    from a plain sum, 20 of them on no finding's claims; 19 of the 24 are reached by a sign combination
    (calculator.ts:54, legitimate subtraction), **5 by none, 1 of those on no finding**. (The brief's "18 not on any
    check" is 20 here; Task 1 pins the definition: claimed = `line:<key>` in any finding's claims.) 3 of the 136
    have over 12 inputs (13, 119, 160); `signsReaching` returns null for them without searching (calculator.ts:55),
    which reads like "no sign reaches"; they are `not_comparable`, never `arithmetic_unreachable`.
  - Sources (denominator: numeric latest lines with no inputs citing 1 to 12 numeric ev- values = 375): **346 are
    reached by a sign combination, 29 are not, 22 of those on no finding**, 3 under an arithmetic rule, and **5 of the
    29 also carry an agreed_to_source_document receipt** (proofs.ts:30, one matching source). A plain total is the
    wrong test: it differs on 318 of the same 375, mostly Form 8949 lots citing proceeds and basis together.
  - prior_year (calculator.ts:115) applies to 94 lines (a 2024 return line of the same key or a cited py: record);
    7 disagree with the cited prior-year records (all 7 on no finding); 51 move past the firm's variance rule (a
    reason is needed, not a mistake).
  - sameFacts (facts.ts:384): 36 comparisons, 11 disagree; every disagreement is already a check ("Two sources
    disagree" or a specific check that yields), so they are check output (blind must not see them).
  - Version drift: 152 line changes across v1 to v3 (value differs, or the key is added or removed); 0 not listed in
    `changes_from_previous`.
- Agency records: payment ties exist only for transcript code 670 (agency.ts:19, facts.ts:237). The transcript also
  holds codes 150, 460, 610, 196/276; 2 notices; 4 e-file records. No latest line cites `agency:/` (0 of 2,015 sources:
  ev- 1,956, asset: 18, ref: 13, py: 12, qa- 9, household: 6, timeline: 1).
- Schema (readme.sections, 22 keys; readme.reference_formats): engine_reference 40 parameters (29 int, 7 float, 3 list,
  1 dict) and 97 rules in words; timeline 29 events (25 with refs); what_if 5 alternatives plus extension; fx_rates
  SEK_per_USD (2024_average, 2025_average, 2025_year_end); client 45 answers, 10 messages, 1 call note (12,080 chars).
  Lines cite 11 distinct `ref:` parameters/rates.
- Altered packet (tests/fixtures/altered.ts:2-5, 29-51): renames every person, removes Form F2441's lines from every
  version (627 to 621), adds one staff member. **Numbers are unchanged**: the sweep counts are identical (24/5, 29, 7,
  11) apart from 3 fewer prior_year lines and findings 29 to 28. It tests "no hard-coded ids or names", not new mistakes.
- Strict-tool grammar: the 6 strict schemas total 2,244 bytes (get_line 153, get_page 212, search_values 394, verify
  699, run_checks 323, list_open_leftovers 463) and are accepted; adding record_suggestion (1,355) as a 7th strict tool
  was refused "compiled grammar is too large" (agent-tools.ts:355). The limit is somewhere between; bytes are a proxy.
- Live wiring: ACTIVE_PRODUCER is the agent (ai/lib/producer.ts:12,15) and `agentOutFile` for default/real is
  ai/eval/agent-suggestions.json (agent-core.ts:418), the live payload. A measurement run with no `--out` overwrites it.

## Global constraints (every task)
- Offline; no Anthropic API call, never run ai/agent.ts or ai/reader.ts, no .env reads; no full SSN or PIN printed.
- Never read docs/ground-truth, the ledger or the errors write-up from new code or its tests; tool tests pick cases by
  probing the packet (and a perturbed copy), never from the ledger. Extend the existing blindness grep to new files.
- Generic over the schema: inputs are ids in README reference formats (line keys, ev-, D, py:/, agency:/, ref:param.,
  ref:fx., timeline ids, qa-/msg-/call-); no form, line, document or check id named in ai/lib code. Numbers are never
  inputs (calculator.ts:38 `looksNumeric` refusal applies to every new method).
- Read-only: no store, route, UI or findings write. `verify_all` reports; it never blocks, never becomes a Finding,
  and is not called by runChecks. The app, the live payload, agent-v3 and the behaviour contract stay as they are.
- Every result goes through `runTool`'s envelope: masked, DATA_NOTE, ≤16,000 bytes (agent-tools.ts:28), paged at
  ≤50 (agent-tools.ts:29), SSN-scanned (agent-tools.ts:295).
- Mode invariant (new, tested per kind): kinds with a single method mirror it in that mode (arithmetic_* and
  sign_subtraction = `recompute_line`, prior_record_differs and variance = `prior_year`, copies_disagree =
  `fact_copies`); source_unreachable and version_change_unlisted have no single method and are raw packet arithmetic,
  the same in every mode. Blind: no copies_disagree item, no `onCheck` field. Hide-checks: hidden claim sets are
  removed from copies_disagree only (as factCopies does, calculator.ts:155-167); arithmetic and prior-year items on a
  hidden check's line stay (raw data); `onCheck` comes only from `findingsFor(mode)`, never from hidden findings.
- Strict-grammar budget: the strict set stays the six accepted schemas plus enum growth on `verify` (about +60 bytes).
  New tools are non-strict with code validation, like record_suggestion.
- `npm test` green after every task; tests that name the tool list change on purpose (listed per task).

## Capabilities: EXTENDS or NEW, and why it is not a second check engine
Checks are specific rules that emit Findings (claims, effect, ledger links) into the app. verify_all is a sweep of
generic comparisons for the agent only: it lists raw disagreements, benign ones included, and a disagreement becomes
a suggestion only after the model grounds it in a quote and the verifier passes it.
| Capability | Kind | Reuses | Reason |
|---|---|---|---|
| Re-foot arithmetic lines | EXTENDS | calculator `recomputeLine`, `signsReaching` | loop the existing method; report only "no sign reaches" (5), count sign-reached (19) |
| Tie to sources | EXTENDS | proofs.ts:24-40 receipt, `signsReaching` | a plain total is noise (318 of 375); signed reach is the test (29 miss; 5 flagged `receipted`) |
| Prior year | EXTENDS | calculator `priorYear` | disagreements with cited records (7) are items; variances (51) are a kind on request |
| Fact copies, payments vs agency | EXTENDS | `sameFacts` via calculator `factCopies` (mode-filtered) | already check output; default and hide-checks only |
| Unlisted version change | NEW | `ix.versions`, `changes_from_previous` | generic, 0 here; a perturbation test proves it can be non-zero |
| Line vs engine parameter | NEW | verify `compare_to_limit` | a comparison, never a tax computation |
| FX conversion | NEW | verify `convert` | one rate named by its key; direction from the key's `<A>_per_<B>` |
| Schema lookups (6 sections) | NEW | packet sections, masker | read-only, id-only; raw packet data is allowed in every mode |
Not added: other transcript codes, notices and e-file tied to lines (mapping codes to lines is tax knowledge: the
model reads them through lookup); caps, phase-outs, brackets (need the engine; flow.ts:1-4).

## Tool shape (grammar decision)
- `verify` (strict) gains methods `compare_to_limit` and `convert` (enum growth only, no new properties).
- `verify_all` (new, non-strict): `{ kind?: one kind | 'differs' | 'all', limit?, cursor? }`. Default `differs`.
  Result: `coverage` (per method: applicable, ran, agree, differ, needsEngine, notComparable; numeric lines accounted
  for = numeric lines), `byKind` counts, then items, hardest first (no-sign arithmetic, unreached sources, prior-record
  differs, copies disagree), each by |difference|: `{ kind, key or ids, compared, numbers, difference, rule, ruleText,
  receipted?, onCheck? }`. Definition kept: source_unreachable = no sign combination of the cited values reaches the
  line, even when one source matches; such items carry `receipted: true` (5 today) so the model sees both facts.
  Default `differs` today: 5 + 29 + 7 + 11 = 52 items (blind 41), 3 pages of 20.
- `lookup` (new, non-strict): `{ section, id?, as_of?, text?, limit?, cursor? }`, sections named after the brief:
  `agency_record` (id `agency:/<pointer>` or a top key), `prior_year` (id `py:/<pointer>` or a line key: last year's
  value, label, line_sources), `what_was_known` (as_of an ISO date: timeline events at or before it, with refs),
  `client_text` (search over questionnaire, messages, call notes, prior-preparer memo, notes and open items, timeline
  details, notice summaries), `diagnostics_for` (id a line key: every version's diagnostics whose refs name it; none:
  the latest list), `alternatives` (what_if alternatives and extension; id optional).
- Default 7 tools become 9 (strict set unchanged); blind 6 become 8. Alternative rejected: eight separate tools (eight
  more schemas in every request and a crowded tool list) or `verify_all` as a `verify` method (less salient for step 1).

## Tasks (red first; offline; each ends with `npm test` green and the contract snapshots unchanged)
1. **verify_all core**, new pure module ai/lib/verify-all.ts; tests in tests/unit/ai-agent-verify-all.test.ts:
   - real packet, default: byKind arithmetic_unreachable 5, source_unreachable 29, prior_record_differs 7,
     copies_disagree 11, version_change_unlisted 0; sign_subtraction 19 and variance_over_firm_rule 51 counted, listed
     only on `kind`; coverage accounts for every numeric latest line exactly once as tried, needs_engine or
     not_comparable (over 12 inputs or over 12 cited values: 3 arithmetic lines today); 5 source items `receipted`;
   - every count's denominator defined in code and asserted: arithmetic 136 (rule in FLOW_RULES, inputs listed);
     sources 375 (numeric, no inputs, 1 to 12 numeric ev- sources); prior_year 94 (same-key 2024 line or py: source);
     version changes 152 (value differs or key added/removed, v1 to v3);
   - mode invariant per kind as in Global constraints (default, blind, hide-checks seed 1): mirrored kinds equal their
     method's disagreements over all ids; blind has no copies_disagree and no `onCheck`; hide-checks copies_disagree has
     none of `hiddenFindings`' claim sets (modes.ts:57), and no `onCheck: true` comes from a hidden finding;
   - perturbation (proves non-zeros): a seeded in-test copy shifts one arithmetic input line by +1,000 and one cited
     source value by +500, and drops one key from `changes_from_previous`; each shows up as an item of its kind, and
     the real packet's items are otherwise unchanged; a shifted input of the 160-input line yields not_comparable,
     never arithmetic_unreachable; altered packet: same counts as the probe above;
   - no ledger id, finding id, check id or full name in any item (extend the existing grep); deterministic order.
   Refactor: export the source-receipt predicate from proofs.ts (proofsFor output unchanged: proofs.test.ts green).
2. **verify methods** in calculator.ts; tests extend tests/unit/ai-agent-calculator.test.ts:
   - `compare_to_limit(ids:[line|ev], target:'ref:param.<name>')`: value, parameter, relation (above/equal/below),
     difference; list or dict parameters refused ("needs the engine"); unknown parameter refused; a number as target
     refused; result says "whether the parameter applies is your judgment";
   - `convert(ids:[ev|line], target:'ref:fx.SEK.<rate>' or the fx_rates key)`: amount, rate, result both ways labelled
     by the key's direction; unknown rate refused; a year typed as a number refused;
   - `VERIFY_METHODS` gains both (test at agent-tools.test.ts:39-45 updated on purpose).
3. **lookup tool**, new ai/lib/lookup.ts plus wiring; tests in tests/unit/ai-agent-lookup.test.ts:
   - each section on the real packet returns the record for a valid id and an error naming valid shapes for a bad one;
   - `what_was_known` as of the README's `where_now_is` date returns only events at or before it (count probed);
   - `client_text` finds a phrase from a call note and a prior-preparer note, masked; paged with total;
   - identical results in every mode (raw packet data); bounded under 16,000 bytes; SSN scan fires via `inject`.
4. **Wire in**: agent-tools.ts names, `toolNamesFor`, definitions (verify_all and lookup `strict: false`, closed
   schemas, code-validated). Tests changed on purpose: agent-tools.test.ts:39-45 (9 tools, strict set = the six),
   ai-agent.test.ts:82 (strict except the three non-strict), :287 (blind 8), :307 (default 9). New test: total strict
   schema bytes ≤ 2,400 (today 2,244 + enum growth), so a later change cannot silently cross the measured limit.
5. **Prompt agent-v4** as a numbered routine, in a new constant `AGENT_V4_PROMPT_VERSION` behind a `--prompt v4`
   flag; AGENT_PROMPT_VERSION and the live payload stay agent-v3 (producer.ts:12) until Aarvin approves a switch.
   1. Call verify_all; page every `differs` item. 2. For each, open the cited line and page; decide: the document
   explains it (say which), a real issue (record), or engine-only (say so). 3. Run verify / lookup for every number
   you rely on; never compute. 4. Read free text (lookup client_text, what_was_known, alternatives, diagnostics_for)
   against the lines it gates. 5. Record as you go; answer on the reserved final turn.
   Recording path (verifySuggestions needs a verbatim quote from a document page, verify.ts:48,77; client text may
   not be quoted): a footing error between return lines is recorded by walking the line's (or its inputs') sources
   to a cited document page and quoting that page's printed amount or label; a client_text judgement is recorded by
   quoting the page of the document the answer contradicts or gates. When no page exists, the model says so in its
   final text and does not record; the summariser counts these as "addressed but unrecordable".
   Tests (ai-agent.test.ts): the prompt names verify_all as step 1; blind still never names run_checks; v4 version
   strings `agent-v4`, `agent-v4-blind`; default without the flag is byte-identical to today's agent-v3 prompt.
6. **Run outputs off the live file**: `--prompt v4` (and any measurement batch) writes under ai/eval/runs/<version>/
   `<mode>.<packet>.<n>.json`; test: `agentOutFile` never returns ai/eval/agent-suggestions.json for v4. An offline
   summarizer (ai/eval/summarize-runs.ts) reads run files and prints the metrics below; tested on fixture payloads.
7. **Fable code review** (runs probes), fixes test-first, then present to Aarvin with sizes, the strict-byte total and
   the budget below. No paid run without his approval.

## Measurement design (after approval)
- Conditions: agent-v4 × {default, blind} × real (3 runs each); agent-v4 × {default, blind} × altered (1 run each: its
  numbers are identical, so it only checks nothing breaks on renamed ids); agent-v3 × {default, blind} × real as the
  baseline.
- Runs: **6 v4 real + 2 v4 altered + 4 more v3 (2 per mode) = 12**, so each compared real arm has n = 3: the smallest n
  that shows a spread (min, median, max) and a union/intersection of finds. If a v3/v4 median difference sits inside
  the spread, add 2 runs per arm (to 5) before claiming a gain.
- Optional, approved separately: a number-perturbed copy (planted shifts as in Task 1's test, seeded, in memory),
  1 v4 run per mode, scored by recall of verify_all's planted items: the real test that the agent generalises.
- Headline metric per mode: **default = beyond-checks recall** (harness-core.ts:89-105), **blind = strict recall**.
- Metrics, per run and as median/min/max:
  - strict recall and precision from the harness (harness-core.ts:56,73-75); on altered,
    entries whose lines were removed are reported unreachable by the harness (:76), not counted as misses;
  - verified findings beyond the ledger: Aarvin adjudicates every shown suggestion that matches no entry (verified,
    plausible, wrong), in the adjudication file format (ai/adjudication-v2.json);
  - verify_all coverage: offline numbers from Task 1 (deterministic); per run, the share of `differs` items the agent
    addressed (a get_line/get_page on the item's line, or a recorded suggestion on it), from the trace, and how many
    were addressed but unrecordable (no document page to quote);
  - number discipline: for each recorded suggestion, whether a verify or verify_all result covering its claim line
    appears earlier in the trace;
  - tool mix (verify + verify_all + lookup vs get_page), turns, seconds, cost, endedBy, held-back and rejected counts;
  - blind leak check: no blind tool result in the trace carries a copies_disagree item.
- Budget: measured $1.83 to $1.99 per run. 12 runs ≈ $24 expected; with `--max-cost 4` per run the ceiling is $48
  (the optional perturbed pair adds about $4, ceiling $8).
  The stop rule: halt the batch if any run exceeds $4 or fails, and report.

## Plan review (Fable 5.1, 24 Oct 21:21 EDT): APPROVE WITH CHANGES, all 7 accepted
Re-probed offline before applying: 318 of 375, prior_year 94, version changes 152, 5 receipted, over-12 inputs 13/119/160.
(1) Arithmetic lines with over 12 inputs (3) were indistinguishable from "no sign reaches" (calculator.ts:55): now
`not_comparable`, with a perturbation test on the 160-input line. (2) Denominators pinned and asserted in Task 1:
318 of 375 (not 325 of 385), prior_year 94, version changes 152. (3) 5 of the 29 source_unreachable lines carry a
one-source receipt (proofs.ts:30): definition kept, items flagged `receipted: true`. (4) Mode invariant restated per
kind: mirrored methods only where one exists; hidden claim sets removed from copies_disagree only; `onCheck` never
from hidden findings. (5) Recording path stated (walk sources to a document page to quote; client text is never
quoted) and "addressed but unrecordable" counted. (6) Altered cut to 1 run per mode (16 to 12 runs, ≈$24); a
number-perturbed copy added as an optional, separately approved generalisation test. (7) Headline metric per mode
(default beyond-checks recall, blind strict recall) and a trace metric for verify coverage of each recorded claim line.

## Out of scope (each needs its own yes)
Switching the live payload or AGENT_PROMPT_VERSION to v4; any route, store, UI or Checks-tab change; new
deterministic checks from verify_all items; caps, limits, brackets, phase-outs or any tax computation; mapping
transcript codes, notices or e-file records to lines; the optional perturbed-packet runs (until approved apart);
planted-injection documents;
the verifier feedback loop beyond record_suggestion; hide-checks paid runs; reader changes.
