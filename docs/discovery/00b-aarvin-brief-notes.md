# Aarvin's handwritten notes on the brief (supplementary)

Transcribed 16 Oct 2026, 21:27 EDT, by Opus 5.5 from five notebook photos Aarvin sent (WhatsApp images, 21:26 EDT).
These are Aarvin's own reading of the brief. They sit **below** the brief, packet and ledger in the order of authority:
they add emphasis and questions, never override. `[?]` marks a word I could not read with confidence.
Right-margin notes on the first page and one name on the last page are unrelated to the brief and are left out.
Each section ends with **Opus notes**: where a note differs from the brief, answers a question it asks, or leaves out a brief item.

## Page 1: Case study work, redesigning the tax workpaper

**Brief**
- Web native tool with **full** workpaper capability.
- The workpaper is used to prove if the system is right.
- The workpaper is used to audit the return: where every number came from, what was done to it, who checked it, and items that are still open.
- The end users of the web based traditional workpaper alternative tool are going to be: preparers, reviewers, partners, the client, the firm's administrator, next year's preparer, IRS examiner (years later).

**Brief: North star direction**
- What is **not** wanted: traditional spreadsheets (do not want); traditional workpaper in any form (do not want).
- North star and the bar: imagine someone fluent in modern technology given this case; how would they tackle it, and how would they imagine the product.
- The bar: a 20 year CPA finds it reliable to use; a new hire can use it on day one.

Next page: things it must do, requirements and what stood out to me.

**Opus notes**
- Brief line 6 says the workpaper "proves the **return** is right", not the system. The difference matters: the app must not
  trust the engine (line 25), so it proves the return, including where the system was wrong (the packet's confident mistakes).
- Brief line 14 says "faster **and** more trustworthy than anything they've used". "Reliable" covers trustworthy; "faster" is a
  second, separate bar worth keeping (keyboard flow, one queue, no hunting).

## Page 2: What it must do

**1. Evidence**
- Audit trail for non technical users.
- Trace any number to its source.
- Trace document to everywhere it landed and did not land.
- Record verification of each number trail.
- Link items across years and related returns.
- Attach file, note or message as evidence: feature to submit document proof.
- Tracing a number: display source document.
- Display source document can help identify the specific field or the location it came from.
- **No** extraction pipeline.
- There JSON data given: create simulated source document.
- Structure the document view and tracing links so real source documents could replace the simulated version seamlessly.
- Basically a document viewer that highlights numbers.
- Also the architecture around it could allow for integration with real [?when] time comes for real source documents.

**2. Calculate**
- Show the steps taken for calculation for all the numbers that were built and resulted.
- How are we reconciling figures that should agree.
- No overcrowding the review process while handling large details (hundreds of sales, many assets).
- Take business book to taxable income.
- Split income between states and how they are taxed.
- How do we run checks that don't trust the engine?

**Opus notes**
- "Audit trail for non technical users" is Aarvin's addition (not brief wording); it serves the new-hire bar and the client.
- "Did not land": the brief adds "**or why it didn't**", so each unused document needs a stated reason (call 1, typed reason).
- "Split income between states and how they are taxed": the brief asks only to split; how each state taxes it is computed by the
  engine ("You don't need tax law"). Showing the split and reconciling it is ours; the tax itself is not.

## Page 3: Change, Judgement, People

**3. Change**
- Adjustments without losing the original (who, why, tax effects).
- What-ifs? Possibilities.
- Audit: see change live.
- Audit what changed since I last looked (primary users).
- Bulk act on many items capability.

**4. Judgement**
- How the flags changed from last year: flag swing.
- Record judgement calls: audit.
- Elections: audit.
- Due diligence records: audit.
- Penalty decisions: audit.
- Prove completeness: every document used; every area considered; every outside filing identified: what are the outside filings?

**5. People**
- Questions and answers associated to clients or colleagues that become evidence.
- Review notes that can block filings.
- Sign-offs that reopen when what was signed changes.
- Roles are enforced: different behaviour of tool with different roles.
- Several people at once: concurrency, live updates.
- Notifications: assignments, deadlines and approvals as something changes while everyone simultaneously works on it.
- Client approval and e-signature capabilities; e-file signature.

**Opus notes**
- Change: two brief items are not on this page: "**Compare versions**" and bulk action "**with undo**" (line 34-35).
- Judgement, "flag swings from last year" (line 36): in the brief "flag" is the verb. It means *raise a flag on amounts that swung a
  lot versus last year* (e.g. rental repairs 3,900 to 13,300), not *how the flags changed*. Comparing this year's open checks with
  last year's is a useful extra, but the requirement is the amount swing.
- "What are the outside filings?": filings the household owes that are not this income tax return. The packet names two deadlines
  marked "outside engagement": the FBAR (FinCEN 114, for the Swedish account, 15 Oct) and Form 1099-NEC (2 Feb). Others the facts
  point to (to verify against the ledger before use): Form 3520 for a foreign gift (GT-C02 area), Form 709 gift tax return for the
  gifts of stock and car if over the annual exclusion, Oregon and Texas filings tied to the move and K-1s. Each must be named and
  marked filed / not ours / not needed, with the reason.
- People: matches the brief. Note the brief lists approvals under the client ("Client approval and e-file signature"); internal
  approvals (reviewer, partner) also notify, which is Aarvin's sensible extension.

## Page 4: Filing and after, Firm, Records a CPA expects

**6. Filing and after ??**
- Extensions?
- Filing.
- E-file rejections.
- The client's copy of what?
- Freeze at filing.
- Amend activities on top.
- Answer a notice with a self contained record. What notice and what record.
- Carry the entire package of amends and updates forward with its audit history, and plan for next year: moveable package.

**7. Firm**
- Firm wide standardization.
- Time against budget.
- View logs, standards for protection of data.
- Status.
- Search.

**8. Records a CPA expects**
- Return tax summary v/s last year; tax computation; area summaries; document index;
- depreciation by asset (methods, life, bonus, federal v/s California v/s AMT, disposals and recapture);
- sales detail; books to tax; rentals and passive losses; K-1 lines; retirement and foreign items;
  deductions and credits with limits; payments; state split; carry overs; basis by year;
- what the prior preparer did and what changed.

**Opus notes (answers to the question marks)**
- Extensions: in the packet, Form 4868 with a 36,000 payment and California FTB 3519 with 0, on 14 Apr 2026, by Daniel
  (`extension-2026-04-14`). The extended due date is 15 Oct.
- The client's copy: the copy of the return **as filed** that the firm gives the client to keep (with the signed 8879s and the
  e-file acknowledgements), in plain words; it must match the frozen filed version exactly.
- What notice: the packet's IRS Letter 566 (received 26 Jan 2028), an examination letter asking to support specific items.
  What record: a self-contained response pack for those items only (filed value, source documents, how it was built, who signed
  off), readable without the app or the firm's internal notes.
- "Moveable package" is a good framing of "carry everything forward with its history": next year's file opens with the
  carryforwards, open questions and the prior year's history attached.

## Page 5: What to hand in
- Sending sooner the better.
- Working app: web app, run from link; stack any; loading the packets as delivered; saving everything with a role switcher.

**Opus notes**
- The brief has three more hand-in items not on this page: (2) one page on the core idea and data model; (3) the errors found and
  how the design surfaced them; (4) a video walkthrough explaining the technical decisions and trade-offs, submitted as a link.
  And: "Use any tools you like, including AI; tell us how."
