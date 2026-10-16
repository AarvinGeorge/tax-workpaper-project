# Discovery 10 — How it comes together

Written 16 Oct 2026, ~04:55 UTC, after re-reading the brief line by line with discovery 1–9 in hand.
North Star (the brief's bar): **a 20-year CPA finds it faster and more trustworthy than anything they've used, and a
new hire can use it on day one.** Proposal for Aarvin's approval; nothing here is decided until he says so.

## 1. Clues in the brief we had not fully used

| Brief line | What it tells us |
|---|---|
| "The workpaper proves the return is right: where every number came from, what was done to it, who checked it, and what is still open." | The whole product answers **four questions** for any number, area or the return: *Where from? What was done? Who checked? What's open?* Every screen should show those four. |
| "Picture someone fluent in modern technology who has never seen a workpaper … they would not invent a spreadsheet." | Borrow from tools that person already knows: **a pull request** (checks must pass, conversations must be resolved, approvals go stale on change, merge = file), **an inbox** (Linear), **comments pinned to the spot** (Figma), **click-to-source** (DataSnipper), **version history** (Figma/Google Docs). |
| "Everything below must work. How is up to you." | **Breadth beats depth.** Every bullet needs a working, minimal version before any one gets deep. |
| "a timeline to replay the season" | **Replay is a feature**, not just data: a "season" control that steps through events (late K-1, corrected 1099, extension, rejection, filing, exam letter). It demos Change, People and Filing in one move. |
| "A README defines every field. The packet contains confident mistakes." | The app must **surface the mistakes by design** (our checks), not hard-code them. Each ledger finding gets a test. |
| "You don't need tax law (every result is computed for you)" | No tax engine. We re-derive arithmetic and targeted checks; tax effects come from the engine's what-ifs or the packet rates. |
| "loading the packet as delivered, saving everything, with a role switcher" | Load the JSON unchanged; every action is a saved event; one switcher for the six roles. |
| "explaining the technical decisions … and the tradeoffs" | Keep `decisions.md` honest; the video walks the demo and the tradeoffs. |

**Gaps we had under-weighted:** the season replay as navigation; linking across years and related returns (Ada's own
return, the S corporation, the fund); the **client's** and the **IRS examiner's** experiences; "plan next year";
"act on many items at once, with undo"; and the day-one experience (plain-language explanations on every check).

## 2. Core idea (proposal)

**The return is a reviewable change set, and every number in it is a claim that must be proven.**
- A *claim* = a number on the return + its evidence (source, highlighted), how it was built, how it was verified,
  the checks it passes or fails, and its conversation.
- The return moves through **stages**, like a pull request: checks must pass, notes must be resolved, approvals
  go stale when what they approved changes, and *filing* is the merge, after which the record is frozen and
  amendments sit on top.

## 3. Stages (progress the user always sees)

Intake → Prepare → Review (send back ⇄ re-review) → Partner approval → Client approval & e-sign → Filed
(rejected ⇄ resubmitted → accepted) → After filing (notice response, amendment) → Carried forward to 2026.
Each stage has an entry rule and a visible checklist; a progress bar on every screen shows where the return is and
what blocks the next stage.

## 4. Screens, by the question they answer

| Screen | Answers | Main users | Brief areas it covers |
|---|---|---|---|
| **Home: what's open** — stage tracker, blockers, my assignments, deadlines, budget used | What is still open, and what's mine? | everyone | People, Firm (status) |
| **Return map** — summary vs last year by area (wages, investments, business, rentals, K-1s, state…), each with status | Where are we, area by area? | reviewer, partner | Records (summary, area summaries), Judgment (swings) |
| **Claim drawer** — click any number: source with highlight, how built, verification, checks, history, notes | Where from? What was done? Who checked? | preparer, reviewer, examiner | Evidence, Calculation, Change |
| **Documents** — index, viewer with highlights, "where it landed or why not" | Was every document used? | preparer, examiner | Evidence, Judgment (completeness) |
| **Checks inbox** — our checks + engine warnings + swings, triage with bulk actions and undo | What looks wrong? | preparer, reviewer | Calculation, Judgment, Change (bulk) |
| **Review** — threaded notes pinned to claims, send back, re-review, sign-offs that go stale | Who checked, and is it still valid? | reviewer, partner | People |
| **Changes** — since I last looked, v1/v2/v3/ours compare, what-ifs, adjustments with tax effect | What changed, and what if? | reviewer, partner | Change |
| **Client portal** — questions in plain words, uploads, approve, e-sign | What do you need from me? | client | People (client approval, e-sign) |
| **Filing & after** — season replay, freeze, rejection, notice response pack, carry-forward and next-year plan | What happened after, and what's next year? | partner, examiner, next-year preparer | Filing and after |
| **Firm** — standards, view log, time vs budget, search | Is the firm in control? | administrator | Firm |

The "Records a CPA expects" are **views of the same data** reached from the return map (depreciation by asset,
sales detail, books to tax, state split, carryovers, basis by year, prior preparer vs us), not separate sheets.

## 5. Each role's day-one experience

- **Preparer:** opens Home, sees a checklist and the checks inbox; each check says in plain words what's wrong,
  why it matters, and the one-click next step (ask client, adjust, dismiss with reason).
- **Reviewer:** sees only what changed since they last looked and what is unverified or risky, ranked; leaves notes
  pinned to claims; sends back; re-reviews only what changed.
- **Partner:** one screen: blockers, adjustments over the firm's limit, judgment calls and penalties to approve.
- **Client:** a short list of questions and documents needed, then a plain summary to approve and sign.
- **Administrator:** standards, who viewed sensitive data, time vs budget, status of the file.
- **Next year's preparer:** carry-forward items with their history and open items.
- **IRS examiner (later):** a frozen, read-only filed record and a self-contained response pack for the notice.

## 6. Where the research lands (already decided or in discovery)

Evidence anchor (document, page, field, 0–1 box, read state) so real PDFs can replace simulated ones; a fixed list of
document landing reasons; verification types from the firm's own standards; year-over-year matched by payer or
concept; engine what-if beats rate estimates; adjustments keep the original with tax effect; signatures and
sign-offs go stale on change; server event log; roles enforced on the server; sensitive values masked with a view log.

**Future work, write-up only:** OCR adapter, local-model PII redaction, rules engine for other households, real logins.

## 7. Round shape under "everything must work"

1. **Core loop, deployed first:** load packet → claims with click-to-source → documents with landing → checks inbox
   (surfacing the ledger mistakes) → review notes, send back, sign-off, stage tracker → role switcher → saving.
2. **Breadth pass:** a minimal working version of every remaining brief bullet (changes and what-ifs, bulk with undo,
   client portal and e-sign, season replay with freeze/reject/amend/notice pack, carry-forward, firm screens, records views).
3. **Polish for the North Star:** plain-language help, keyboard shortcuts, empty states, the demo path for the video.
