# How AI was used

Two different uses: AI inside the product, where it reads and a person decides, and AI as the team that built it,
where the work was checked by running it, not by reading it.

## AI in the product: one job, checked by code

Rules are good with numbers. They cannot read "we replaced the heat pump" and decide whether that is a repair or an
improvement. That is the one job given to AI.

- **When it runs.** An AI reader (Claude Sonnet 5.5) reads the packet once, never while someone browses: no model is
  called when a page loads. The suggestions shown today come from the scored run below, stored encrypted at deploy. The
  same reader also runs as a protected cloud function on a daily schedule (proven on a dry run) and only re-reads when
  the packet or the prompt changes.
- **What it sees.** Each document's text, with names and identification numbers masked first.
- **What it must produce.** A fixed format: each suggestion quotes the document word for word, names the document and
  page, gives a short reason (asked for 25 words, refused over 30) and, optionally, a legal source from a vetted list.
- **How it is checked.** Code treats the output as untrusted. A suggestion is held back if its quote is not on the page
  it names, if the quote carries no content, if it rests only on a document that was later replaced, if it cites a
  source outside the vetted list, or if it contains anything shaped like an SSN.
- **What a person sees.** What passes appears in the inbox of findings, marked with a star (✦) and "needs review". It never blocks filing; a reviewer
  accepts or dismisses it.

**How well it works, measured before trusting it.** A harness ran the reader blind (no known answer in any prompt,
verified by searching every request) and scored it against the 27 mistakes found by hand.

| Measure | Result |
|---|---|
| Automatic match score | 17 of 27 |
| Judged by a second model, match by match (the figure we report) | **13 of 27** (14 counting a partial) |
| Quotes shown that were verified on their page | all of them |
| Its other suggestions, outside the 27 | 8 judged wrong, 3 repeats, 1 held back by the verifier; each waits for a person |
| Confident mistakes in an earlier run | 3, quoting a 1099 that was later replaced; a verifier rule now holds these back |
| Real mistakes it found that we had missed | **1** (a 1,500 gift with no written acknowledgment, IRC 170(f)(8)) |
| Cost of one full run | about $1.50 |

A test in continuous integration fails the build if a suggestion is ungrounded, if recall falls below the measured
baseline, or if the prompt changes without a new scored run.

## AI as the build team

- **Claude Code (Claude Opus 5.5)** planned, wrote the code and tests, and coordinated parallel sub-agents, test first:
  wherever a test could catch the bug, the fix started from a failing test.
- **Claude Fable 5.1, a different model, reviewed each major round**, mostly by running probes against the running app. Its findings changed the product: a sign-off refused by the server used to erase the reviewer's
  notes; the story clock let the filed return be rewritten by moving back in time; evidence links were merged too
  aggressively. Each became a test before it was fixed.
- **Research and the mistake hunt.** Four AI researchers read the packet area by area before the build; reviewers, including a
  second model, raised and checked doubtful items before the ledger was settled.
- **What I decided.** The core idea, the scope, what AI may and may not do in the product, and every trade-off. Each
  decision is logged one line at a time with its trade-off, and every use of AI is logged as it happened.
