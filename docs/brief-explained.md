# The brief, in plain words

Source: `docs/brief.txt` (copy of the PDF) and the packet README (`readme` key in the JSON). Written 15 Oct 2026.

## What a tax workpaper is

- Software at Miraflores reads a client's tax documents (W-2s, 1099s, K-1s…) and **computes the return**. CPAs then **review** it.
- The **workpaper** is the proof that the return is right. For every number on the return it answers:
  1. **Where did it come from?** (which document, which box)
  2. **What was done to it?** (sums, splits, adjustments, rules applied)
  3. **Who checked it, and how?**
  4. **What is still open?** (unanswered questions, unresolved review notes)
- Today this is usually a stack of spreadsheets and PDFs with tick-marks. The brief says **do not rebuild that**. Design it as a modern product someone would invent from scratch.

## Who uses it

| Person | What they need from it |
|---|---|
| Preparer | Do the work: check numbers, fix them, ask the client questions |
| Reviewer / partner | Trust it fast: see what changed, what's risky, sign off |
| Client | Answer questions, approve, sign for e-file, get their copy |
| Firm administrator | Roles, standards, deadlines, time budgets, who viewed sensitive data |
| Next year's preparer | Carry-forwards and history, without redoing the archaeology |
| IRS examiner (years later) | A self-contained record that answers a notice |

**The bar:** a 20-year CPA finds it faster and more trustworthy than anything they've used; a new hire can use it on day one.

## The data we get

One JSON "packet" for an invented household, the Okafor-Lindqvists, 2025, married filing jointly:
- **74 documents** (as text records — no page images) and **3,012 extracted values**, each with a source position and a confidence score. The positions are synthetic (README: use them only to place highlights on a rendered page).
- **Three computed versions of the return** (v1 March, v2 March after a corrected 1099, v3 June after a late K-1). v3 is current.
- Client questionnaire answers, messages, a call note; the 2024 return and prior preparer's notes; IRS/California account records; firm staff and standards; a timeline to replay the season.
- **The trap:** "The packet contains confident mistakes." What is *printed* on a document is the truth; what the pipeline *read* and what the engine *computed* can both be wrong — even at 99% confidence. Finding them is part of the job.
- We don't need to know tax law: every result is computed for us. To show the tax effect of a change, multiply it by the rates the packet gives. The engine cannot be rerun; where `what_if` holds the engine's own result for the same change, that result is used instead (16 Oct correction; see `docs/packet/readme-explained.md`).

## What the app must do (grouped)

- **Evidence** — click any number → see its source document with the exact field highlighted (we generate simulated documents from the JSON, built so real PDFs could replace them later). Click any document → see everywhere it landed, or why it didn't. Record how each number was verified. Attach files/notes as evidence.
- **Calculation** — show how any number was built; reconcile figures that should agree; handle hundreds of stock sales without drowning the reviewer; books → taxable income; California vs Texas split; **run our own checks that don't trust the engine**.
- **Change** — adjust a number without losing the original (who, why, tax effect); live updates and "what changed since I last looked"; compare versions; what-ifs; bulk actions with undo.
- **Judgment** — flag big swings from last year; record judgment calls and elections; prove completeness (every document used, every area considered).
- **People** — client/colleague questions that become evidence; review notes that **block filing**; sign-offs that **reopen when the thing signed changes**; enforced roles; several people at once; assignments, deadlines, notifications; client approval and e-file signature.
- **Filing and after** — extensions, filing, e-file rejections, client copy; **freeze at filing, amend on top**; answer an IRS notice with a self-contained record; carry forward to next year.
- **Firm** — standards, sensitive-data protection with view logs, time vs budget, status and search.
- Plus a list of standard CPA records (return summary vs last year, depreciation by asset, sales detail, state split, carryovers, basis by year…).

That list is far too much for one day. The brief says "everything must work", but also "**sending sooner is better**". Our plan: a strong working core that nails *evidence + checks + mistakes surfaced + roles + saving*, deployed early, then widen.

## What we hand in

1. **The app** — a link; loads the packet as delivered; saves everything; has a role switcher.
2. **One page** — the core idea and the data model.
3. **The errors found** — and how the design surfaced each one.
4. **A video** — you walking through it, explaining technical decisions and trade-offs.
5. **How AI was used** — `docs/ai-usage.md` and `docs/decisions.md`, kept as we go.
