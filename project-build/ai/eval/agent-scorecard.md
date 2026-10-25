# AI agent vs reader scorecard

Scored 2026-10-25. Same harness, same ledger, same strict match as docs/handin/ai-scorecard.md (whose figures are not changed).
Each agent run is scored on the tier its mode allows, beside the reader on the same tier. Same issue counts a second
model's SAME verdicts (ai/adjudication-<version>.json); a run without verdicts shows "not adjudicated".

## Mode default: ledger mistakes no deterministic check reaches

Only ledger mistakes no deterministic check reaches are scored, so a suggestion that repeats one of our checks earns nothing.

On this packet every ledger mistake is reached by a deterministic check (27 of 27), so this tier has no entries
and cannot rank the runs. Use the blind and hide-checks modes below, grounded suggestions beyond the ledger (read by a person),
and cost and time.

## Mode blind: all 27 ledger mistakes (no run_checks, no find_fact_copies)

The agent sees none of our checks' results, so recall on every ledger mistake is a fair comparison.
The reader-v2 figures are those of docs/handin/ai-scorecard.md (same payload, same strict rule, same verdicts).

| Measure | reader-v2 | agent-v3-blind |
|---|---|---|
| Recall, strict | 17 of 27 (63%) | 15 of 27 (56%) |
| Recall, same issue (adjudicated) | 13 of 27 (48%) | not adjudicated |
| Grounding rate | 40 of 40 (100%) | 19 of 19 (100%) |
| Found, strict | GT-A01, GT-A02, GT-A03, GT-A04, GT-A06, GT-A07, GT-A08, GT-B01, GT-C02, GT-C04, GT-C05, GT-C08, GT-D01, GT-D02, GT-D03, GT-D04, GT-D05 | GT-A01, GT-A02, GT-A03, GT-A04, GT-A05, GT-A06, GT-B02, GT-B03, GT-C01, GT-C04, GT-C05, GT-C07, GT-D01, GT-D02, GT-D03 |

## All tiers

| Measure | reader-v2 | agent-v2 | agent-v3-blind |
|---|---|---|---|
| Recall, strict | 17 of 27 (63%) | 0 of 27 (0%) | 15 of 27 (56%) |
| Recall, strict, text tier | 7 of 8 (88%) | 0 of 8 (0%) | 5 of 8 (63%) |
| Recall, strict, as shown | 16 of 27 (59%) | 0 of 27 (0%) | 15 of 27 (56%) |
| Precision, strict | 28 of 40 (70%) | none to score | 16 of 19 (84%) |
| Grounding rate | 40 of 40 (100%) | none to score | 19 of 19 (100%) |
| Held back by the verifier | 1 | 0 | 0 |
| Grounded suggestions on no ledger line | 12 | 0 | 3 |
| Rejected | 4 | 1 | 1 |

## Run

| Measure | reader-v2 | agent-v2 | agent-v3-blind |
|---|---|---|---|
| Approximate cost | $1.50 | $1.82 | $1.83 |
| Seconds | 115 | 280 | 291 |
| Turns / tool calls | not recorded / not recorded | 40 / 90 | 34 / 122 |
| HTTP calls | 74 | not recorded | not recorded |
| Served model | not recorded | claude-opus-5-5 | claude-opus-5-5 |

## Altered packet

| Measure | reader-v2 |
|---|---|
| No-check tier, strict | 0 of 1 (0%) (entries GT-A08) |
| Recall, strict | 15 of 27 (56%) |
| Claims on lines not in this packet | 0 |
| Grounding rate | 42 of 42 (100%) |

