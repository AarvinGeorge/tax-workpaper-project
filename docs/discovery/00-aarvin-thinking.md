# Aarvin's thinking during discovery

Aarvin's own ideas, recorded as he states them, so they can be traced into the design. Newest last.

## 16 Oct 2026, 03:49 UTC (23:49 EDT Thu 15 Oct)

**Calculation**
- Should we keep a *formula book* (a calculation cheat sheet) that states accurately how each figure is computed? It would serve
  reconciling figures that should agree and handling large detail.
- What processing power does the calculation side need?
- Are there reliable existing tools we could use instead of building our own?
- The Calculation research should give us the programmatic formulas for every calculation scenario.

**People**
- Tax rules vary with age; minors especially are treated differently. Work out the general pattern of how the rules depend
  on the person.
- Filing rules also change by state and by city. Keep that in mind.

**What happened next:** passed to the Calculation discovery agent while it was still running; a new discovery file,
9 Person and place rules, was started for the age and place questions. Both get a Fable 5.1 review like the others.

## 16 Oct 2026, 04:53 UTC (00:53 EDT)

- Don't get tunnel-visioned. PII redaction (and OCR) are future features for the write-up, so no PII test effort. Step back.
- Re-read the handout with everything we now know: look for clues, anything missed, and how it all comes together.
- North Star = the brief's bar: **a 20-year CPA finds it faster and more trustworthy than anything they've used, and a new hire can use it on day one.**
- Picture a tool for someone fluent in modern technology: intuitive, friendly, easy to follow, with progress tracking, review, review comments, send-backs, re-review, stages of review, audit trails.
- Think from every role: system designer, 20-year CPA, preparer, reviewer, partner, client, firm administrator, next year's preparer, IRS examiner.
- Take inspiration from the modern tools researched. "Maybe we can start building something from all of this."

**What happened next:** brief re-read line by line; synthesis written to `docs/discovery/10-how-it-comes-together.md`; presented to Aarvin for approval before the spec.
