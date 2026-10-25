# The agent reviews like a CPA on any packet: verify_all, schema lookups, a numbered routine (agent redesign, step 2)

> Tier b. Test first; Fable 5.1 plan and code reviews; offline only (no API spend) until Aarvin approves a budget.
> Follows docs/superpowers/plans/2026-10-24-agent-case-file.md. North Star (Aarvin, 24 Oct): the agent acts like a CPA
> reviewer on ANY packet that follows the packet schema; code verifies every number, the model judges free text. The
> checks in src/domain/checks/families/* are a floor for this packet, not a general reviewer.

**Goal.** One call settles every number code can settle (`verify_all`), a small set of id-only lookups reach every
schema section, and the prompt makes the routine explicit: sweep first, explain each difference from the documents,
then read free text. Written plan only; nothing here is built until Aarvin says go.

**Primary mode (Aarvin, 24 Oct 21:40 EDT): independent re-performance.** Blind mode is redefined as "independent"
and is the headline: the agent re-performs the review with our generic tools but never sees our checks' findings.
Default mode ("skip what the checks found") biases the agent; it is secondary and measures incremental finds.

## What the code and the last runs show (measured 24 Oct 21:14 EDT, offline, scratchpad tsx/python3 -I probes)
- Last runs (ai/eval/*.run-meta.json, *.trace.json): default $1.99, 37 turns, 87 calls (get_page 57, get_line 20,
  verify 4: prior_year 3, recompute_line 1); blind $1.83, 34 turns, 122 calls (get_page 53, get_line 42, verify 5).
  The model reads pages; it barely uses the calculator.
- Blind agent-v3 run, scored afterwards by the controller (counts only, as relayed): 12 misses. 3 never opened (the
  agent opened 62 of 627 lines and 46 of 74 documents); 4 found but claimed on a line other than the one the mistake
  changes (loose matches only); 5 looked at with no tool to judge (what_if elections, limits vs engine parameters,
  prior-year records, a page scanned twice). Blind `fact_copies` returned agreements only (calculator.ts:164), which
  hid a two-form double count: a handicap we imposed ourselves.
- Duplicates (probe): 199 pages. 28 groups of identical printed pages (whitespace-normalised), all across
  documents and every one involving a superseded document (`supersession`, verify.ts); 9 groups of pages with an
  identical set of (field, money value) pairs (8 involve a superseded document, 1 does not, 0 with both cited by a
  line); 5 near-identical page pairs of the same document type across documents (ratio >0.9); **5 latest lines cite
  one nonzero amount (money, integer or quantity; 4 if money only) from 2 or more pages**: the signal a double
  count leaves on the return.
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
  - sameFacts (facts.ts:384): 36 comparisons, 11 disagree. A comparison's `title` and `explanation` become the
    "Two sources disagree" finding's own text (checks/families/disagree.ts:159-160), so those two fields are check
    output; the copies (what, shown value, ref) and `agree` are raw comparisons.
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
- Leak rule (redefined): a mode hides **our checks' findings**, never raw comparisons from the generic tools. Blind
  ("independent"): no run_checks; no finding title, explanation, check id, ledger id or finding id; nothing saying
  which lines a check flags (no `onCheck`, no F status in the case file, no status derived from findings). Raw
  comparisons are allowed in every mode: `fact_copies` returns every comparison's copies, values and `agree`, and
  `verify_all` returns every disagreement. In blind, fact_copies and copies_disagree items drop the finding payload
  sameFacts carries (disagree.ts:159-160): `title`, `explanation`, `receipt`, `effect`, `trigger`, `stopsEfile`; they
  keep rule, lines (claims), copies and agree. A claims set equal to a finding's is raw and allowed.
  Hide-checks: this overwrites approved change (4)'s claims filter (calculator.ts:155-167 goes), so hide-checks no
  longer keeps its seeded purpose for fact copies; it drops hidden checks' payload fields the same way and `onCheck`
  comes only from `findingsFor(mode)`. Hide-checks paid runs are out of scope.
- Mode invariant (tested per kind): kinds with a single method mirror it in the same mode (arithmetic_* and
  sign_subtraction = `recompute_line`, prior_record_differs and variance = `prior_year`, copies_disagree =
  `fact_copies`, duplicate_* = `duplicates`); source_unreachable and version_change_unlisted have no single method.
  Item sets are identical in every mode; modes differ only in finding-derived fields.
- Earlier blind scores (agent-v3-blind) were taken under the old definition (agreements-only fact copies), so they
  are not comparable with v4 independent scores. Keeping the old definition is cheap (one condition at
  calculator.ts:164): it stays reachable as mode `blind-v3` for the v3 baseline reruns only, and is otherwise unused.
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
| Fact copies, payments vs agency | EXTENDS | `sameFacts` via calculator `factCopies` | raw copies in every mode; finding wording only outside blind |
| Duplicate pages and documents | NEW | `supersession`, `documentLanding`, printed text, extracted values | generic: same printed text, same (field, value) set, or one amount cited from 2+ pages |
| Unlisted version change | NEW | `ix.versions`, `changes_from_previous` | generic, 0 here; a perturbation test proves it can be non-zero |
| Line vs engine parameter | NEW | verify `compare_to_limit` | a comparison, never a tax computation |
| FX conversion | NEW | verify `convert` | one rate named by its key; direction from the key's `<A>_per_<B>` |
| Schema lookups (6 sections) | NEW | packet sections, masker | read-only, id-only; raw packet data is allowed in every mode |
Not added: other transcript codes, notices and e-file tied to lines (mapping codes to lines is tax knowledge: the
model reads them through lookup); caps, phase-outs, brackets (need the engine; flow.ts:1-4).

## Tool shape (grammar decision)
- `verify` (strict) gains methods `compare_to_limit`, `convert` and `duplicates` (enum growth only, no new
  properties; about +80 bytes, inside the 2,400 cap). `duplicates(ids:[line | document])`: for a line, cited values
  with one amount on 2+ pages, and how alike those pages are (identical, same value set, near); for a document, every
  page elsewhere with identical printed text or the same value set, each pair marked superseded or not, landed or not,
  and cited or not.
- `verify_all` (new, non-strict): `{ kind?: one kind | 'differs' | 'all', limit?, cursor? }`. Default `differs`.
  Result: `coverage` (per method: applicable, ran, agree, differ, needsEngine, notComparable; numeric lines accounted
  for = numeric lines), `byKind` counts, then items, hardest first (no-sign arithmetic, unreached sources, prior-record
  differs, copies disagree), each by |difference|: `{ kind, key or ids, compared, numbers, difference, rule, ruleText,
  receipted?, onCheck? }`. Definition kept: source_unreachable = no sign combination of the cited values reaches the
  line, even when one source matches; such items carry `receipted: true` (5 today) so the model sees both facts.
  Kinds added for duplicates: `duplicate_amount_cited` (in `differs`: 5 lines today) and `duplicate_page` (pairs with
  neither document superseded: 1 value-set group plus the near pairs, listed on `kind`; pairs involving a superseded
  document are counted only). Each duplicate_amount_cited item states the relation: line value = the amount once
  (`corroboration`), = the copies added (`double_count`), or `neither`.
  Pinned definitions: copies_disagree = one item per `sameFacts(ix)` comparison with `agree: false` (11 today: added
  twice 3, box to line 2, payments 2, lot 3, identifier 1; every one has line claims; Fable counted 12 with one
  claimless, not reproduced by this probe, so Task 1 asserts the definition and the count it gives);
  duplicate_amount_cited = a latest line citing one nonzero amount-type value (money, integer, quantity) from 2+
  distinct (document, page) pairs (5 today). `differs` today: 5 + 29 + 7 + 11 + 5 = 57 items, **the same in every
  mode**, 3 pages of 20.
- `lookup` (new, non-strict): `{ section, id?, as_of?, text?, limit?, cursor? }`, sections named after the brief:
  `agency_record` (id `agency:/<pointer>` or a top key), `prior_year` (id `py:/<pointer>` or a line key: last year's
  value, label, line_sources), `what_was_known` (as_of an ISO date: timeline events at or before it, with refs),
  `client_text` (search over questionnaire, messages, call notes, prior-preparer memo, notes and open items, timeline
  details, notice summaries), `diagnostics_for` (id a line key: every version's diagnostics whose refs name it; none:
  the latest list), `alternatives` (what_if alternatives and extension; id optional).
- Default 7 tools become 9 (strict set unchanged); blind 6 become 8. Alternative rejected: eight separate tools (eight
  more schemas in every request and a crowded tool list) or `verify_all` as a `verify` method (less salient for step 1).

## Tasks (red first; offline; each ends with `npm test` green and the contract snapshots unchanged)
0. **Perturbed packet, required** (Aarvin, 24 Oct 21:51 EDT: the real generalisation test, "even if a new packet
   comes in"). Built first; it needs none of the agent tools. New tests/fixtures/perturbed.ts, beside altered.ts and
   in memory like it: `perturbedPacket(seed)` returns `{ packet, planted }`. A mulberry32 seed (as modes.ts:14) picks
   targets by schema shape only, never by id, and avoids lines any finding of the real packet claims, so each plant
   is a mistake the checks were not written for. Kinds (one or two each, about 8 in all):
   - `source_changed`: one cited money value changed with its `text_as_read` and its page's `printed_content`
     together, so the document and the line no longer tie;
   - `copied_twice`: one document's money value repeated on a page of a second, unsuperseded document of the same type
     and cited again by the same line, whose value is raised by it (a double count);
   - `prior_shift`: the 2025 carryover line that cites a `py:` record is shifted past the firm's variance rule. The py
     record and the prior-year pages that print it stay as the truth, so a page quotes the right figure and the
     mistake can be recorded (verify.ts:77). Shifting the py record alone would leave no page to quote;
   - `fx_wrong_year`: a line citing `ref:fx.SEK.<rate>` switched to another year's rate key with its value rescaled
     by the rates' ratio (plain arithmetic);
   - `page_duplicated`: one page copied as an extra page of its own document, with its values cited again.
   Consistency rules (Fable, Task 0 review):
   - Cascade: 371 of 372 numeric latest lines that cite sources and have no inputs feed a parent sum. Each plant's
     delta is carried up the sum-rule ancestors (FLOW_RULES), in every return version where the line has the same
     value (367 of 372 match v2). A latest-only change would itself trip version_change_unlisted, a giveaway.
   - Printed text: a target value is picked only when its `text_as_read` appears exactly once on its page (827 values
     do; 18 repeat; 122 have none). copied_twice and page_duplicated also raise `page_count` and the document's
     `extraction.values`.
   - Target scarcity: fx has 2 of 3 citing lines unclaimed by a real finding, and prior-year has 10 unclaimed. The
     by-line rule stays (avoid lines a real finding claims); a kind with no eligible target is skipped and reported,
     never forced.
   `planted` lists, per plant: kind, the claim set (the planted line plus every ancestor whose value moved), the
   refs changed, before and after. It never enters the packet object: no note, label or field mentions it.
   Tests in tests/unit/perturbed-packet.test.ts: the same seed gives byte-identical JSON and planted list, and two
   seeds differ; each planted entry matches a real difference against the real packet, and every difference belongs
   to a planted entry; the packet still loads with `indexPacket`, and the real packet is not mutated; leak test: no
   planted-list string (kind names, "planted", "perturb") appears in any tool result, the case file, the prompt, or
   the run-meta and trace files a fake-transport run writes, in every mode, on a full sweep of every tool over the
   perturbed packet; ancestors carry the delta in every version where they shared the value, and the perturbed
   packet gives no version_change_unlisted item; each changed value's `text_as_read` occurs once on its page and
   matches the new figure.
   Scoring (offline, no API): a `plantedScore(ix, planted, payload | findings)` helper. The harness's strict rule
   (harness-core.ts:56) is applied to the planted list as the gold, with findings, items and suggestions mapped to
   their claims. It scores **runChecks on the perturbed packet** (which plants the checks catch: the floor) and later
   each agent payload, plus verify_all's items (which plants the generic sweep surfaces). For the checks' precision
   it counts new findings only: runChecks(perturbed) minus runChecks(real), by (checkId, claims). It reports per kind
   checks caught / sweep surfaced / agent recorded, with matches on the planted line and on cascade lines counted
   apart. "As much as the checks, and more" is then measured per kind on mistakes the checks were not written for. CLI: `--packet perturbed --seed N` in file mode only, refused in vault mode (as altered is,
   ai/lib/agent-packet.ts:22).
1. **verify_all core**, new pure module ai/lib/verify-all.ts; tests in tests/unit/ai-agent-verify-all.test.ts:
   - real packet, default: byKind arithmetic_unreachable 5, source_unreachable 29, prior_record_differs 7,
     copies_disagree 11, version_change_unlisted 0; sign_subtraction 19 and variance_over_firm_rule 51 counted, listed
     only on `kind`; coverage accounts for every numeric latest line exactly once as tried, needs_engine or
     not_comparable (over 12 inputs or over 12 cited values: 3 arithmetic lines today); 5 source items `receipted`;
   - every count's denominator defined in code and asserted: arithmetic 136 (rule in FLOW_RULES, inputs listed);
     sources 375 (numeric, no inputs, 1 to 12 numeric ev- sources); prior_year 94 (same-key 2024 line or py: source);
     version changes 152 (value differs or key added/removed, v1 to v3);
   - mode invariant per kind as in Global constraints (default, blind, hide-checks seed 1): mirrored kinds equal their
     method's disagreements over all ids; the item sets (kind, key, numbers) are identical across modes;
   - leak test (blind): no result of any tool, nor the case file, contains a finding title, explanation, check id,
     ledger id or finding id (every string from `runChecks` titles and explanations is grepped for), no `onCheck` key,
     no F status, and no fact_copies or copies_disagree item has a `title`, `explanation`, `receipt`, `effect`,
     `trigger` or `stopsEfile` key; copies_disagree items are present with values (raw comparisons allowed).
     Hide-checks: no hidden finding's payload fields, no `onCheck: true` from a hidden finding;
   - stale comments updated: modes.ts header ("takes away ... find_fact_copies") and agent-tools.ts:51 ("fact_copies
     gives agreements only there");
   - duplicates: duplicate_amount_cited lists the 5 lines, each with its relation (corroboration, double_count,
     neither); identical-print pairs with a superseded document are only
     counted (28); a perturbed copy that cites one page's amount on a second, unsuperseded copy of that page yields an
     item;
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
   - `duplicates`: a line id returns its same-amount pages with likeness; a document id returns its page pairs with
     superseded/landed/cited flags; masked; bounded;
   - `fact_copies` in blind returns disagreements with values but without title, explanation or receipt text; the
     existing test "blind: fact_copies returns agreements only" (ai-agent-calculator.test.ts:124) is replaced on
     purpose; `blind-v3` keeps the old behaviour and gets that old test;
   - `VERIFY_METHODS` gains all three (test at agent-tools.test.ts:39-45 updated on purpose).
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
   1. Call verify_all first; page every `differs` item. 2. Explain each disagreement: open the cited line and page;
   decide whether the document explains it (say which), it is a real issue (record it), or it is engine-only (say so).
   3. Run verify / lookup for every number you rely on; never compute. 4. Then read free text (lookup client_text,
   what_was_known, alternatives, diagnostics_for) against the lines it gates. 5. Record as you go; answer on the
   reserved final turn.
   Claim-line rule: `claims` names the return line(s) whose value the mistake changes (for example the total or the
   deduction it flows into), never only the document; when a document is wrong, claim the line that cites it.
   Recording path (verifySuggestions needs a verbatim quote from a document page, verify.ts:48,77; client text may
   not be quoted): a footing error between return lines is recorded by walking the line's (or its inputs') sources
   to a cited document page and quoting that page's printed amount or label; a client_text judgement is recorded by
   quoting the page of the document the answer contradicts or gates. When no page exists, the model says so in its
   final text and does not record; the summariser counts these as "addressed but unrecordable".
   Tests (ai-agent.test.ts): the prompt names verify_all as step 1 and states the claim-line rule; blind still never
   names run_checks and no longer says "F lines are known"; v4 version
   strings `agent-v4`, `agent-v4-blind`; default without the flag is byte-identical to today's agent-v3 prompt.
   The v4 blind prompt is the primary one; the default-mode prompt adds only "the checks' findings are known".
6. **Run outputs off the live file**: `--prompt v4` (and any measurement batch) writes under ai/eval/runs/<version>/
   `<mode>.<packet>.<n>.json`; test: `agentOutFile` never returns ai/eval/agent-suggestions.json for v4. An offline
   summarizer (ai/eval/summarize-runs.ts) reads run files and prints the metrics below; tested on fixture payloads.
7. **Fable code review** (runs probes), fixes test-first, then present to Aarvin with sizes, the strict-byte total and
   the budget below. No paid run without his approval.

## Measurement design (after approval)
- Conditions, headline first: **agent-v4 independent (blind) × real, 5 runs**; agent-v4 independent × altered, 1 run
  (numbers identical: checks nothing breaks on renamed ids); agent-v3 `blind-v3` × real, 2 more runs (n = 3 with the
  committed one) as the baseline; **agent-v4 independent × perturbed (Task 0, one fixed seed), 2 runs, required**.
  Total **5 + 1 + 2 + 2 = 10 runs**.
- Default-mode runs are cut. Its intended secondary metric, beyond-checks recall, is empty on the real packet (every
  ledger entry is reached by a check: 0 entries), and adjudicated beyond-ledger finds are better taken from the
  independent runs, which are not steered away from checked lines. Default mode stays built and tested, unmeasured.
- Why 5 on the headline arm: it is the number that gets reported, so it needs a median and a spread that 3 cannot
  give; the baseline stays at n = 3 because v3 is not being tuned. If the v4/v3 median difference sits inside the
  spread, add 2 baseline runs before claiming a gain. Note the comparison is confounded by design (prompt, tools and
  the blind definition all change); it answers "is v4 independent better than v3 blind", not which change helped.
- Perturbed packet (required): scored by `plantedScore` for runChecks (offline, before any paid run), verify_all
  (offline) and each of the 2 agent runs. Reported per kind: checks caught, sweep surfaced, agent recorded on the
  planted claim line. Plus the real-packet ledger metrics for those runs' unchanged mistakes.
- Headline, two numbers (independent mode, with precision): (a) **strict recall split into tool-surfaced** (a
  verify_all or verify item touched the entry's claim line before the match) **vs agent-found**; (b) **agent-found
  recall on the ledger entries no `differs` item touches**, the judgement figure. Fable's probe: verify_all alone
  touches 15 of 27 entries (sources 7, copies 9, duplicates 2, arithmetic 1; overlapping), so (b) is over about 12
  entries; the harness computes the split offline from the item list and the trace (no answer key in the tools).
  Secondary: adjudicated beyond-ledger finds from the same runs. Also per run: loose-only matches (found but claimed
  on the wrong line, the claim-line rule's target), and lines and documents opened (62 of 627 and 46 of 74 in the v3
  blind run).
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
  - blind leak check: no blind tool result in the trace carries a finding title, explanation or check id;
  - tool-surfaced vs agent-found: for each strict match in blind, whether a verify_all or fact_copies item on its
    line came before it (our generic code surfaced it) or not (the agent found it reading), so independent recall
    is not read as pure model judgement.
- Budget: v3 measured $1.83 to $1.99 per run, but v4 must page about 57 differs items and open their lines and pages
  (Fable: ~112+ calls before free text), so expect **$2.5 to $3.5 per run**. Runs use `--max-cost 6`: 10 runs ≈ $26
  to $34 expected, ceiling $60.
- Stop rule: "truncated" (hit the cost, turn or time cap) is not "failed" (error, SSN hit, malformed answer). Today an
  over-budget run writes nothing and exits 1 (ai/agent.ts); Task 6 adds a test that a truncated run persists its
  trace and run meta (marked truncated, no payload scored), so the spend still yields evidence. Halt the batch on
  any failed run or two truncated runs, and report.
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

**Revision 24 Oct 21:40 EDT (Aarvin: independent mode is primary), pending Fable re-review.** Blind redefined as
independent (findings hidden, raw comparisons never), fact_copies and verify_all identical in every mode apart from
finding text, `blind-v3` kept for the baseline; duplicates added as a verify method and two verify_all kinds;
claim-line rule in the prompt; measurement re-centred on independent mode. All 7 approved changes kept except (4)'s
hide-checks claims filter, overwritten. Conflict resolved in the plan: sameFacts titles and explanations are the
disagree finding's own text, so they are dropped in blind even though the comparisons themselves are shown.

**Re-review (Fable 5.1): APPROVE WITH CHANGES, all 5 accepted.** (1) Blind also drops `effect`, `trigger`,
`stopsEfile` (with title, explanation, receipt); the leak test asserts none of these keys; equal claims sets are raw.
(2) Headline is two numbers: recall split tool-surfaced vs agent-found, plus agent-found recall on entries no
differs item touches (verify_all touches 15 of 27). (3) Default runs cut (8 runs): beyond-checks is empty on the
real packet and beyond-ledger finds come from independent runs. (4) duplicate_amount_cited states corroboration,
double_count or neither. (5) `--max-cost 6`, $2.5 to $3.5 expected per run, truncated runs persist their trace and
are counted apart from failed ones. Also applied: (4)'s hide-checks filter overwritten and hide-checks paid runs out
of scope; stale comments (modes.ts header, agent-tools.ts:51) fixed in Task 1; definitions pinned for
copies_disagree (11 measured, not Fable's 12) and duplicate_amount_cited (5).

**Revision 24 Oct 21:51 EDT (Aarvin: the perturbed packet is required), pending Fable re-review.** Task 0 added,
built first and offline; it scores runChecks, verify_all and the agent on planted mistakes; 2 perturbed runs make 10
runs (≈$26 to $34, ceiling $60). Watch points: (a) `fx_wrong_year` and `prior_shift` are kinds some check families
already target (ignored-field: "the year of an exchange rate"; prior-year), so the checks may catch them. The score
is reported per kind and plants avoid lines the real checks claim; that measures generality, it does not guarantee
the checks miss. (b) A plant changes the printed text with the value, or it becomes a pipeline misread, a different
kind.

**Task 0 review (Fable 5.1): APPROVE WITH CHANGES, all 6 accepted.** (1) Deltas cascade up sum ancestors in every
version sharing the value; the claim set includes moved ancestors. (2) value, text_as_read and printed_content change
together; only once-on-page targets; page_count and extraction.values bumped. (3) prior_shift moves the 2025 line
and keeps the py record and pages as the truth. (4) Checks' precision is taken from new findings only (perturbed
minus real); per-kind triple; cascade matches counted apart. (5) Target scarcity noted; by-line rule kept, skipped
kinds reported. (6) Leak test covers run-meta and trace files.

## Out of scope (each needs its own yes)
Switching the live payload or AGENT_PROMPT_VERSION to v4; any route, store, UI or Checks-tab change; new
deterministic checks from verify_all items; caps, limits, brackets, phase-outs or any tax computation; mapping
transcript codes, notices or e-file records to lines; perturbed packets beyond the one fixed seed's 2 runs;
planted-injection documents;
the verifier feedback loop beyond record_suggestion; hide-checks paid runs; reader changes.
