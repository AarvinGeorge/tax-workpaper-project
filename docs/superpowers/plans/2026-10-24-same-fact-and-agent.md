# Same fact, every source; then the AI reader becomes an agent with those tools

> Tier b. Inline execution, test first, Fable 5.1 plan and code reviews, full suite before deploy.
> Evidence: Fable's blind measurement (scratchpad/samefact: rules frozen 11:47, rows 11:58, ledger opened after):
> 11 of 27 flagged automatically, 18 surfaced, 22 within the rules' reach; 17 of 22 error rows real; no new error on
> this packet; ~340 independent agreements. Direction logged in docs/decisions.md (24 Oct 11:55).

**Goal.** Catch inconsistencies of any kind on any client's packet, not only the kinds in our ledger, without new
reviewer work: the tool compares every copy of a fact; disagreements are ordinary Checks rows; agreements are
independent receipts. The same functions then become the tools of an AI agent that replaces the one-document reader.

**Ground truth used:** the packet schema and README, the firm's standards, the case brief, the domain research
(docs/research). The ledger is the answer key: used to score, never read by src/ or the agent's prompt.

## Fit with the existing app
| Capability | Where | EXTENDS / NEW |
|---|---|---|
| Fact identity and copies | `src/domain/facts.ts` (pure) | NEW: no module groups every copy of a fact |
| Disagreements | ordinary findings, family "Two sources disagree" (disagree.ts), `yields: true` so a specific check on the same claim wins | EXTENDS the family and the yields rule |
| Agreements with an independent source | proofs.ts, method `agreed_to_third_party_record` (firm type), shown in "Checked by Taxmark"; never on disputed or adjusted lines | EXTENDS proofs |
| Agent | `ai/` reader pipeline: same payload contract, verification, sealed storage, cron route, harness, CI gate | EXTENDS the reader |
No new screens, tabs, forms or gates.

## Step 1: the same-fact engine (five rules)
Identity keys (schema only): document_type + issuer + belongs_to + tax_year; payer EIN; account last 4 printed on the
page; property address; person; designated tax year of a payment; lot acquisition date + description.
1. **Added twice, not corroborated**: one line or total whose cited values include two copies of one fact (same
   issuer or account, equal amounts, or a statement whose page says it is reported on another form). Requires the
   line's value to equal the sum of what it cites (Fable: avoids the F4797.21 false double count).
2. **Information-return tie-out**: a fixed IRS form-box to return-line table (W-2, 1099-INT/DIV/NEC/K/R/SA/S/B/DA,
   1098/1098-C/1098-T, 5498/5498-SA, K-1) as data in facts.ts; per (issuer, person, year) the box total must reach
   its line; corrected forms supersede originals.
3. **Payments three ways**: payment confirmations (document_type), agency records (IRS codes, FTB payments) and the
   return's payment lines, keyed by designated tax year.
4. **Lot matching**: a lot on a broker 1099-B and the same lot on a supplement, export or client message (by
   acquisition date and description): basis differences disagree.
5. **Identifier copies**: SSN, EIN, date of birth across household, documents and last year (last 4 in all text).
Dropped (measured noise or duplicate): year-over-year variance rows, hand-paired client statements, generic re-sum.

Tasks, each red first: facts.ts identity and copies (unit tests on real lines and an altered copy per rule:
fires, then silent once the copies agree); five checks `CHK-SAME-FACT-*` with `yields: true`; independent receipts in
proofs.ts; measurement gate as a test: on the real packet the engine adds **no row** a specific check does not already
make (all yield), and each rule fires on its altered copy; Checked by Taxmark shows "Confirmed by an independent
source: ..." (browser test). Checks stays at 11 blockers.

## Step 2: the AI reader becomes an agent
- **Same contract and safety**: runs at intake (CLI and the existing cron route), never from the UI; output is the
  existing `AiPayload` (suggestions with quotes and refs), re-verified by `src/domain/ai/verify.ts`; a person accepts
  or dismisses; never blocks approval; scored by the harness; CI gate stays.
- **One investigation over the whole packet** with tools (Messages API tool use), each a thin wrapper over pure domain
  code: `get_line`, `get_page`, `find_fact_copies` (facts.ts), `proofs_for_line`, `recompute_line`, `run_checks`
  (findings already raised, so it does not repeat them), `list_unproven_lines`. Masking as today; no tool returns a
  full identifier or PIN.
- **Context**: the packet README (field definitions), firm standards, the case brief and a short domain digest from
  docs/research; never the ledger or ground-truth docs.
- **Outputs**: (a) suggestions, as today; (b) proposed checks as code in a separate file, never loaded by the app,
  that a CLI gate promotes only if it fires on its packet, is silent on a corrected copy, names no packet ids and
  Aarvin approves.
- **Model and cost**: Sonnet 5.5 as today; budget per run measured and logged; caching of the shared context.
- Tasks, red first: tool wrappers (unit, no network), agent loop with an injected fetch (unit), payload validation
  (existing tests extended), harness run on the real and altered packets with the scorecard updated in a new section
  (handed-in numbers kept as they were), proposal gate CLI (unit), CI gate unchanged or tightened.

## Out of scope
A second engine, independent tax recomputation, vanished-line accounting, a background production evaluator,
changing the ledger or hand-in documents.

## Plan review (Fable 5.1, 24 Oct 12:12 EDT): APPROVE WITH CHANGES; Step 2 becomes its own plan
Step 1 changes (all accepted):
1. The "adds no row" gate alone is tautological (an engine finding nothing passes). Add: before yielding, the engine
   makes at least 9 drafts on the real packet, each on a claim a specific check also makes (the A01, A03, A04, A05,
   B01, B02, C02, D01, D03 rows of the measurement). A zero proven able to be non-zero.
2. Same-fact findings claim exactly the strings the specific checks claim (e.g. identity on the line the identity
   check uses), or yielding fails silently and Checks grows.
3. Rule 1 keys on account or loan identity (last 4 printed on the page) first, the document schema key second: the
   real double counts are across document types (a 1098 plus a payoff statement; a composite plus a 1099-INT).
4. The form-box to line table lives in src/domain/forms/box-map.ts as data, each entry with its comparison mode
   (equal; line at least the sum for 1099-NEC/K; box 1 minus box 5 for 1098-T), tested so a missing target line is
   skipped, never an error.
Negative altered copies added: a corrected form with its original where the return cites the corrected one; two
payers with equal amounts on different accounts; a payment designated for another year left out of the line; the
shared altered fixture (renamed people, a form removed) yields no new rows.
Step 2 (separate plan, later): structured outputs and tools coexist but a forced tool choice is refused, so the agent
loops tool calls and ends in the structured payload; cron time limit 300 s, so measure in the CLI first and keep the
per-document reader on cron until measured; max-turn and wall-clock guards; a partial run never overwrites the stored
payload. **Model-written code is cut**: the agent proposes a check as a structured description (rule in words, fact
keys, where it should fire and stay silent) that is then coded and tested like any check. Reuse proofsFor instead of a
separate recompute tool.
