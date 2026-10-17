# Taxmark video: a 5-minute walkthrough

## The whole demo in four sentences (read this first)

A tax firm gets a client's documents already read by software: 74 documents, about 3,000 numbers, and a computed return.
That software is often confidently wrong, so a person has to check everything by hand.
Taxmark gives every number on the return a receipt: where it came from, how sure the reading was, and which checks it passes or fails.
People fix what is wrong, every change is kept forever, AI points at problems in the written text, and a person always makes the call.

## Before you press record

- Open four tabs, in this order: Daniel, Priya, Ngozi, Jo. Base link: https://taxmark-workpaper.vercel.app/w/video-take1
- In Daniel's tab, click **Reset to start**, then **Confirm**.
- Speak slowly. The numbers on screen do the work; you explain why they matter.

## The script (about 650 spoken words, 5 minutes)

| # | Time | Show (click) | Say |
|---|---|---|---|
| 1 | 0:00-0:35 | Daniel `/daniel`: Home, the counts | "A tax return is a few hundred numbers. Behind each one is a document: a W-2, a brokerage statement, a receipt. Software reads those documents for the firm, and it is usually right. When it is wrong, it is wrong with 99% confidence, and nobody notices until the IRS does. So I built Taxmark around one idea: every number on the return carries its receipt." |
| 2 | 0:35-1:20 | `/daniel/return?claim=line:F540NR.72`, click a source | "Here is a line on the California return. I click it and I see where it came from: the document, the page, the exact field, highlighted. I see the rule that added it up and how confident the reading was. You never have to trust a number. You can follow it back to the paper. The pages here are rebuilt from the data we were given, and a real PDF can drop into the same slot." |
| 3 | 1:20-2:05 | `/daniel/checks`: the blockers | "The data we were given has mistakes planted in it, so I don't trust the software's answer. Taxmark checks each number against a second source: the IRS and California records, the other documents, last year's return. That is how it found 27 mistakes. This one: the return claims 14,000 dollars of California estimated payments, but one of those payments was for the year before. Ten mistakes like this are blockers, and the return cannot be approved until they are fixed." |
| 4 | 2:05-2:50 | Daniel adjusts F540NR.72 to 10,500 with a reason; switch to Priya's tab: the notice and the bell | "Daniel is the preparer. Daniel fixes the number and writes why. Taxmark keeps the old value, who changed it, why, and what it does to the tax. A change over 1,000 dollars needs the partner. Now look at Priya's tab. Priya is the reviewer, and the notice is already there. Nothing is ever edited or deleted. Every action is added to a record, like a bank statement, and that record is the audit trail." |
| 5 | 2:50-3:20 | Role switcher: Marcus on Documents (masked, Reveal refused); then Ngozi's Home | "Five people use one workpaper and each sees what their job needs. The server enforces that, so hiding a button is never the only protection. Marcus has no clearance, so Marcus sees the last four digits of a Social Security number, and asking for more is refused and logged. Ngozi is the client, and sees only the client's own questions, in plain words." |
| 6 | 3:20-4:25 | `/daniel/checks`, scroll to the ✦ AI suggestions, open the heat-pump one | "Now, AI. Rules are good with numbers. Rules are bad at reading a sentence like 'we replaced the heat pump' and asking whether that is a repair or an improvement. That kind of reading is what AI does well, so that is the one place I use it. Claude reads the documents once, when the packet arrives, never while you browse. It works with names and ID numbers masked. Every suggestion has to quote the document word for word, and code checks that the quote is really on that page. Anything it cannot prove is held back. It is marked with this star, it never blocks filing, and a person accepts or dismisses it. Before trusting it, I tested it blind against the 27 known mistakes. The automatic score said 17. A second model checked each match by hand and said 13. I report 13. It also found one real mistake I had missed." |
| 7 | 4:25-5:00 | Jo `/jo/firm`: move the clock to 13 Jul (rejected), then 15 Jul ("As filed, locked") | "Jo runs the firm. This clock replays the tax season: the e-file is rejected, fixed, and accepted. Once it is accepted, the return is locked, and any later change is filed as an amendment on top. I built this with Claude Code writing the software and a different model reviewing every round by running tests against it. Every decision and its trade-off is in the log. The client data is encrypted, and the AI key never leaves the server." |

## Lines to keep exact

- "The automatic score said 17. A second model checked each match and said 13. I report 13." Never quote 88%.
- "Claude reads the documents once, when the packet arrives, never while you browse." (No model is called when a page loads.)
- If asked what is not built: "Designed, not built: file upload, the examination response pack, the penalty estimate, many returns."

## Your design choices, in one line each (if asked)

- **Every number carries its source.** A reviewer follows the receipt instead of redoing the work.
- **Check, don't trust.** Each number is compared against a second source; the software's 99% confidence counts for nothing.
- **Nothing is overwritten.** Every action is added to a record, so the history is the audit trail.
- **Rules where rules work, AI where reading is needed.** AI only suggests, quotes its evidence, and a person decides.
- **Roles enforced on the server.** The role switcher replaces sign-in so a grader can see every view from one link.
- **Client data encrypted, out of the deployed code.** The app opens it by its fingerprint and refuses it if one byte changed.

## Trade-offs (if asked)

- The role switcher replaces real sign-in, a convenience for the demo.
- The final return is the computed version plus our fixes, not recalculated; tax effects are estimates from the packet's rates.
- Five kinds of check depend on how the text is worded. That is where the AI reader helps, and where it still misses half.
