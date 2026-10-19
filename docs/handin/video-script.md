# Taxmark video: one confident mistake, start to finish (5 minutes)

## The story in one line (read this first)

The software read a California payment perfectly, at 99% confidence, and the return still counts it in the wrong
year. In five minutes you follow that one mistake through Taxmark: found, proven, fixed, signed by the partner, and
still not allowed out of the door until everything else is cleared.

## Why this slice

The brief's bar: "a 20-year CPA finds it faster and more trustworthy than anything they've used, and a new hire can
use it on day one." Every moment below earns one of those three words. Say them out loud when you reach them.

| The bar | Where the video shows it |
|---|---|
| **Faster** | One row holds every signal on the line; one click reaches the source page; a fix moves the refund by itself. |
| **More trustworthy** | Every number has a receipt; the check compares against the FTB's own record; nothing is ever overwritten; the partner signs what she checked. |
| **Day one** | Plain words on screen; the pill key says what each pill means; the app refuses what a role may not do and says why. |

## Before you press record

- Open three tabs, in this order: **Daniel** (reviewer), **Priya** (preparer), **Helen** (partner).
  Base link: `https://taxmark-workpaper.vercel.app/w/video-take2` then `/daniel`, `/priya`, `/helen`.
- In Daniel's tab click **Reset to start**, then **Confirm reset**. Reload Priya's and Helen's tabs.
- Record the browser at **1440 pixels wide or wider**. Below that, with the right panel open, the Confident mistake
  label hides to make room, and beat 2 needs it.
- Never show the Checks header after the fix: it then counts 8 blockers while Helen's Review counts 9 (her own
  partner sign-off is the ninth until she signs).
- Speak slowly. Point before you click. About 560 spoken words, so there is room to pause while pages load.

## The script

| # | Time | Show | Say |
|---|---|---|---|
| 1 | 0:00-0:30 | Daniel: `/daniel/checks` | "A tax return is a few hundred numbers, and each one comes from a document that software has read. The software is usually right. When it is wrong, it is wrong with 99% confidence, and a reviewer has to catch it by hand. Taxmark is a web-native workpaper built on one idea: every number carries its receipt, and every number is checked against a second source, not trusted." |
| 2 | 0:30-1:15 | The pill key; the F540NR.72 row (3rd blocker) | "This is the Checks inbox: ten blockers. Each row is one line of the return, and its labels say what is wrong and who found it. The first label is how serious it is: a Blocker stops filing. The star means the AI reader flagged it too. Confident mistake means every value behind it was read at 95% or more, and our checks still caught it. This row, California estimated payments, holds two blockers from two different checks, plus the AI. That is the faster part: one row, every signal." |
| 3 | 1:15-1:50 | Open the finding: "Confidence gave no warning"; then the line's source page | "Open it. In v3, the engine's latest computed version, the return claims 14,000 dollars of estimated payments. The FTB's own account credits 10,500. Why? Here is the receipt: the confirmation page, highlighted. The September payment of 3,500 is marked tax year 2024. The pipeline read that correctly. The engine's rule counts payments by date and ignores the year. Confidence gave no warning. A second source did." |
| 4 | 1:50-2:40 | Adjust to 10,500 with a reason; then line 97, the refund | "Daniel, the reviewer, fixes it: 10,500, and why. The old value stays: was 14,000. The tax effect is estimated from the packet's own rates. The fix carries through: total payments and line 97, overpaid tax, the refund, are recomputed: 8,256 becomes 4,756. The refund moves by 3,500, over the firm's 1,000 dollar threshold, so the rule asks for the partner." |
| 5 | 2:40-3:30 | Priya's bell; Helen: Review, sign off as partner; "8 blockers must clear first"; the Changes tab | "Priya prepared this return, and the notice is already in her bell. Helen is the partner. She sees the change, the reason and the tax effect, writes what she checked, and signs. Her sign-off is bound to 10,500; if the number moves, it goes stale. Can she approve? No: eight other blockers still stand, and the button says so. And every step is in the record, numbered, in story time, never edited or deleted. That is the trust part." |
| 6 | 3:30-4:15 | Daniel: back on the row, the star suggestion; its quote | "Now the AI. Rules are good with numbers; they cannot read a sentence. So Claude reads each document once, when the packet arrives, never while you browse. It flagged this same payment and quoted the page word for word, and code checked that quote before showing it. It never blocks filing; a person accepts or dismisses it. I tested it blind against the 27 mistakes we found by hand. The automatic score said 17; a second model judged each match and said 13. I report 13. It also found one we had missed." |
| 7 | 4:15-5:05 | Daniel: Checks, then the role switcher top right | "The decisions behind it. The packet is read-only; everything people do is an event, so the audit trail is the data, never a second copy. The checks are written against the packet's format, not this client, so they run on the next return. Roles are enforced on the server, and every look at sensitive data is logged. The trade-off: a role switcher instead of sign-in, so one link shows every view. I built it with Claude Code; a different model reviewed each major round by probing the live app. A new hire can follow this screen on day one; a partner can trust what she signs." |

## Click guide, step by step (walked on the live site, 19 Oct)

All links start with `https://taxmark-workpaper.vercel.app/w/video-take2`. Tabs: Daniel `/daniel`, Priya `/priya`,
Helen `/helen`.

**Order matters.** Do every step in this order. To redo a take: Daniel's tab, Reset to start, Confirm reset, reload the
other two tabs.

**0:00-0:30 · Daniel's tab**
1. Open `/daniel/checks`. Point at "10 blockers" in the header. (The Blocker filter says 9: nine rows, ten blocker
   findings, because the F540NR.72 row holds two.)

**0:30-1:15 · The row**
1. Point at the pill key above the list (Blocker, Check, Judgment, Info; ✦ AI; Engine warning; Confident mistake).
2. Under "Items", the 3rd blocker row is **F540NR.72**: pills Blocker, ✦ AI, Confident mistake; two titles ("14,000 on
   the return, 10,500 on the FTB account" and "includes a payment designated for another tax year"). Click the row: it
   opens to both checks and "1 AI suggestion".

**1:15-1:50 · The receipt**
1. In the open row, under the second check ("…designated for another tax year"), click **Open the finding**. The right
   panel shows the blue box: "Confidence gave no warning. Every value behind this was read at 0.98 to 0.99…". Point
   at it.
2. Click the amount **14,000** in the row's Amount column. The right panel becomes "Where this number came from":
   point at "How it was built" (every FTB payment dated 2025-04-01 through 2026-01-15), then the source page, D68,
   with "2025-09-15 3,500.00 tax year 2024" in the text.

**1:50-2:40 · The fix (typing the reason takes time)**
1. In that panel, under Actions, click **Adjust**. New value `10500`. Reason
   `The 15 Sep 2025 payment is designated tax year 2024 (FTB confirmation D68)`. Leave Authority blank. Click **Save**.
2. Point at "Adjusted", "10,500", "was 14,000 in v3", "Needs partner sign-off (tax effect over 1,000)" and the tax
   effect line (California 3,500).
3. Open `/daniel/return?claim=line:F540NR.97`. Point at "Recomputed", "4,756", "was 8,256 in v3", "Recomputed from the
   adjustment to 2025 California estimated tax payments".

**2:40-3:30 · The team and the partner**
1. Priya's tab: pause a second (the tab refreshes when it comes to the front), then click the bell. The top notice:
   "Daniel changed 2025 California estimated tax payments". Press Escape.
2. Helen's tab: open `/helen/review`. Point at "Approve the return: 9 blockers must clear first." and, under Our
   adjustments, the row: 14,000 to 10,500, the reason, "Over 1,000: partner".
3. In "What you checked", type `Tied the 15 Sep payment to the FTB confirmation, tax year 2024`. Click **Sign off as
   partner**.
4. Point at the approval box: now "8 blockers must clear first."
5. Click the tab labelled **Changes 2** (not "Adjustments"): two numbered entries, #1 the adjustment by Daniel, #2 the partner sign-off by Helen, and
   "Entries are never edited or deleted; an undo is a new entry on top."

**3:30-4:15 · The AI**
1. Daniel's tab: open `/daniel/checks?claim=finding%3Aai-date_or_year_mismatch-4`. The right panel: "✦ AI suggestion ·
   A payment or event that may sit in the wrong year", the quote "2025-09-15 3,500.00 tax year 2024 (estimated
   payment)", and "Each quote was found word for word on its page before this suggestion was shown." Point at the
   quote, then at **Accept** / **Dismiss**. Do not click either.

**4:15-5:05 · Close**
1. Stay on Checks. Optional: open **Viewing as** (top right) to show the list of roles, then close it without
   switching.

## Lines to keep exact

- "The automatic score said 17; a second model judged each match and said 13. I report 13." Never quote 88%.
- "Claude reads each document once, when the packet arrives, never while you browse." No model is called on a page load.
- Do not say "the 27 rows are the 27 mistakes". Say "our checks catch every one of the 27 mistakes we found by hand".
- If asked what is not built: "Designed, not built: file upload, the examination response pack, the penalty estimate,
  many returns behind sign-in."

## If you have more time (not in the 5 minutes)

- The four-pill row: `/daniel/checks?claim=line:SchC.30` (Judgment, ✦ AI, Engine warning, Confident mistake).
- The story clock (Jo's tab): move to "13 Jul 2026 · E-file rejected", then "15 Jul 2026 · E-file accepted California";
  the return locks as filed and later changes are amendments.
- Roles: as Marcus on Documents, a W-2's SSN shows last four; Reveal is refused with the firm rule.

## Trade-offs, if asked

- A role switcher instead of sign-in, so one link shows every view.
- A change flows through sums and differences only; a line that needs a tax computation waits for an engine re-run and
  blocks approval. Tax effects are estimates from the packet's own rates.
- Five kinds of check depend on how the text is worded; that is where the AI reader helps, and where it still misses
  about half.
