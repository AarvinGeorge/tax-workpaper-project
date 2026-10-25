# AI agent vs reader scorecard

Scored 2026-10-25. Same harness, same ledger, same strict match as docs/handin/ai-scorecard.md (whose figures are not changed).
Each agent run is scored on the tier its mode allows, beside the reader on the same tier. Same issue counts a second
model's SAME verdicts (ai/adjudication-<version>.json); a run without verdicts shows "not adjudicated".

## Mode default: ledger mistakes no deterministic check reaches

Only ledger mistakes no deterministic check reaches are scored, so a suggestion that repeats one of our checks earns nothing.

On this packet every ledger mistake is reached by a deterministic check (27 of 27), so this tier has no entries
and cannot rank the runs. Use the blind and hide-checks modes below, grounded suggestions beyond the ledger (read by a person),
and cost and time.

## All tiers

| Measure | reader-v2 | agent-v2 |
|---|---|---|
| Recall, strict | 17 of 27 (63%) | 0 of 27 (0%) |
| Recall, strict, text tier | 7 of 8 (88%) | 0 of 8 (0%) |
| Recall, strict, as shown | 16 of 27 (59%) | 0 of 27 (0%) |
| Precision, strict | 28 of 40 (70%) | none to score |
| Grounding rate | 40 of 40 (100%) | none to score |
| Held back by the verifier | 1 | 0 |
| Grounded suggestions on no ledger line | 12 | 0 |
| Rejected | 4 | 1 |

## Run

| Measure | reader-v2 | agent-v2 |
|---|---|---|
| Approximate cost | $1.50 | $1.82 |
| Seconds | 115 | 280 |
| Turns / tool calls | not recorded / not recorded | 40 / 90 |
| HTTP calls | 74 | not recorded |
| Served model | not recorded | claude-opus-5-5 |

## Altered packet

| Measure | reader-v2 |
|---|---|
| No-check tier, strict | 0 of 1 (0%) (entries GT-A08) |
| Recall, strict | 15 of 27 (56%) |
| Claims on lines not in this packet | 0 |
| Grounding rate | 42 of 42 (100%) |

