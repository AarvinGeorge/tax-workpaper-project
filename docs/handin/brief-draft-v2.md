# Taxmark: the brief (draft 2, reshaped from Aarvin's opening)

> Your words are kept where you wrote them; the rest follows the same thread: **the packet told me what to build.**
> `✎` marks a spot only you can fill. Target: one page.

---

I started by investigating the confident mistakes in the ground truth, the client packet as delivered, before
writing a line of code. I wanted to build a web-native tool I would trust and use myself, and the mistakes told me
what that tool had to be.

## Approach: how the ground truth became the screens

Before any code, I had to establish what the ground truth was trying to tell me. The packet and the brief were the
starting point of an AI-assisted investigation into its confident mistakes, and that investigation became the basis
for everything after it.

- **Learning the domain.** My fintech background gave me a rough sense of the roles: a preparer, a reviewer, the
  four-eyes rule, an e-file signature (Form 8879). For a tax workpaper I had to go further: research how US firms
  actually prepare and review a return, then walk the brief's requirements one area at a time (evidence, calculation,
  change, judgment, people, filing and after, the firm, the records a CPA expects).
- **Learning the data.** I read the packet's own README until I understood the shape of the schema: 74 documents,
  about 3,000 extracted values, three computed versions of the return, agency records, the prior year, the client's
  answers.
- **Placing the tool in the pipeline.** Documents are read by software, an engine computes the return, people
  review, sign and file. The workpaper sits between the engine and the signature, and that placement shaped the
  screens: **what does the return say, what needs attention, what changed and who signed it.**

✎ *One sentence on the moment it clicked.*

## The findings shaped the data model

Every mistake I found was a number that looked fine and was not, often read at 95% confidence or more. So confidence
could not be the proof. Every number had to carry its source, how it was built, how it was checked, and what it fails.

- **The packet is read-only.** It is never edited, only built on.
- **Everything people do is an event** in an append-only log: an adjustment, a note, a sign-off, a question, an undo.
  The audit trail is the data, not a feature.
- **Each screen is a view** of packet plus log, for one role at one point on the story clock.
- **A claim** is anything that holds evidence and actions: a line, a document, a finding.

**The core idea:** every number is a claim that carries its receipt. One click shows where it came from, what was done
to it, who checked it, and what is still open.

## Key decisions

- **Checks, not memory.** Each mistake became a deterministic check written against the packet's schema, never a
  document id, and tested on altered copies of the packet. My answer key labels findings; it never creates them.
- **AI where rules can't read.** An AI reader reads each document once, its quotes are verified by code, and a person
  accepts or dismisses each suggestion. Blind against my 27, it matched 13 and found one I had missed.
- **Honest about what isn't computed.** A fix flows through plain sums; a line needing a tax computation waits for an
  engine re-run and blocks approval.
- **How I worked with AI.** An order of authority (brief, then packet, then my ledger, then research); a different
  model reviewed each major round by probing the live app; every decision, including the process ones and the corrections,
  logged the moment it was made; the deadline was a backstop, not the driver.

## The errors, and how the design surfaced them

**27 distinct mistakes**, every one flagged on Checks. The one I'd show anyone: California estimated payments say
14,000; the Franchise Tax Board's own record says 10,500. One payment is marked "tax year 2024", read correctly at 0.98 to 0.99.
The engine counted by date and ignored the year. Confidence gave no warning; a second source did. In Taxmark that is
one row, a **Confident mistake** pill, one click to the source page, a fix that moves the California refund from 8,256 to 4,756,
and a partner sign-off bound to the new number.

✎ *Close in your own words: what a 20-year CPA and a day-one hire should each feel.*
