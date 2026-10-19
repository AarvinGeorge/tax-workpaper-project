# Taxmark video: a 5-minute walkthrough

## The whole demo in four sentences (read this first)

For every client, a tax firm gets a packet: the client's documents already read by software, and a computed return.
That software is often confidently wrong, so a person has to check everything by hand.
Taxmark works on any packet in that format and gives every number on the return a receipt: where it came from, how sure the reading was, and which checks it passes or fails.
People fix what is wrong, every change is kept forever, AI points at problems in the written text, and a person always makes the call.

## Before you press record

- Open four tabs, in this order: Daniel, Priya, Ngozi, Jo. Base link: https://taxmark-workpaper.vercel.app/w/video-take1
- In Daniel's tab, click **Reset to start**, then **Confirm reset**. Then reload Priya's tab (a tab opened before a reset shows old state).
- Speak slowly. Talk about the tool; use this client's numbers only as the example on screen.

## The script (about 650 spoken words, 5 minutes)

| # | Time | Show (click) | Say |
|---|---|---|---|
| 1 | 0:00-0:35 | Daniel `/daniel`: Return overview, the three figures, then the counts behind **?** | "A tax return is a few hundred numbers. Behind each one is a document: a W-2, a brokerage statement, a receipt. Software reads those documents for the firm, and it is usually right. When it is wrong, it is wrong with 99% confidence, and nobody notices until the IRS does. So I built Taxmark around one idea: every number on the return carries its receipt." |
| 2 | 0:35-1:20 | `/daniel/return?claim=line:F540NR.72`, click a source | "Here is a line on the California return. I click it and I see where it came from: the document, the page, the exact field, highlighted. I see the rule that added it up and how confident the reading was. You never have to trust a number. You can follow it back to the paper. In this demo the pages are rebuilt from the extracted data, and the design lets a real PDF take their place." |
| 3 | 1:20-2:05 | `/daniel/checks`: the blockers | "Taxmark does not take the software's word for it. It checks each number against something else: the tax agencies' records, the client's other documents, last year's return. The checks read the packet format, so the same checks run on the next client's packet. I also ran them on a second, altered packet, to make sure they catch real mistakes and stay quiet otherwise. In this client's packet they found 27 mistakes. Here is one. The return claims 14,000 dollars of California estimated payments, but one of those payments was for the year before. That is a blocker. The return cannot be approved until it is fixed." |
| 4 | 2:05-2:50 | Daniel (reviewer) adjusts F540NR.72 to 10,500 with a reason; switch to Priya's tab: the notice and the bell | "Daniel, the reviewer, fixes the number and writes why. Taxmark keeps the old value, who changed it, why, and what it does to the tax. This change is over 1,000 dollars, so it needs the partner. Switch to Priya's tab. Priya prepared this return, and the notice is already waiting. Nothing is ever edited or deleted. Every action is added to a record, like a bank statement, and that record is the audit trail." |
| 5 | 2:50-3:20 | Role switcher: Marcus on Documents (masked, Reveal refused); then Ngozi's Home | "Everyone on the return shares one workpaper, and each person sees only what their job needs. The server enforces that; hiding a button on its own would never be enough. Marcus has no clearance, so the Social Security number shows as its last four digits. Asking for the rest is refused, and every time someone does see a full number, it is logged. Ngozi is the client and sees only the questions meant for Ngozi, in plain words." |
| 6 | 3:20-4:25 | `/daniel/checks?claim=finding%3Aai-repair_vs_improvement-3`, the heat-pump ✦ suggestion | "Now, AI. Rules are good with numbers. They cannot read a sentence like 'we replaced the heat pump' and ask whether that is a repair or an improvement. That is the one job I give the AI. Claude reads the documents once, when the packet arrives, never while you browse. Names and ID numbers are masked first. Every suggestion has to quote the document word for word, and code checks that the quote is really on that page. Anything it cannot prove is held back. It is marked with this star, it never blocks filing, and a person accepts or dismisses it. Before trusting it, I tested it blind on this client's packet, against the 27 mistakes already known. The automatic score said 17. A second model judged each match and said 13. I report 13. It also found one real mistake my own review had missed." |
| 7 | 4:25-5:00 | Jo: clock to 13 Jul from the Story time bar, the filing status under the figures (rejected), clock to 15 Jul ("As filed, locked") | "Jo is the firm's administrator. This clock replays the tax season: the e-file is rejected, fixed, and accepted. Once it is accepted the return is locked, and any later change is filed as an amendment. I built this with Claude Code. A different model reviewed every round by running the tests. Every decision and its trade-off is in the log. The client data is encrypted, and the AI key never leaves the server." |

## Click guide, step by step (walked on the live site 17 Oct 19:53 EDT; re-checked on live 18 Oct 20:53 EDT)

All links start with `https://taxmark-workpaper.vercel.app/w/video-take1`. Tabs: Daniel `/daniel`, Priya `/priya`, Ngozi `/ngozi`, Jo `/jo`. Marcus has no tab; you reach him through the **Viewing as** dropdown, top right.

**Order matters.** Do the adjustment (moment 4) before the clock (moment 7). After 15 Jul the return is locked and Adjust is refused. To redo a take: Reset to start, Confirm reset, reload Priya's tab.

**0:00-0:35 · Return overview (Daniel's tab)**
1. Open `/daniel`. Point at the three figures (adjusted gross income, federal tax, California tax).
2. Click the **?** floating on the top edge of the right panel. Its Demo section shows the counts (documents, values, versions, lines, events). Press Escape to close it.

**0:35-1:20 · Trace a number**
1. Open `/daniel/return?claim=line:F540NR.72`. The right panel opens by itself: "2025 California estimated tax payments", 14,000.
2. Point at "How it was built" (the rule), then the source page with the numbers highlighted.
3. Scroll inside the right panel to the source rows. Point at "Pipeline read 0.98 to 0.99".
4. Click the first source row, "FTB record, Payment 3 amount · 3,500". The panel shows the document and "Lands on: SchA.5a, F540NR.72".

**1:20-2:05 · Checks**
1. Open `/daniel/checks`. Point at the "10 blockers" and "27 open" chips.
2. Under "Our checks (27)", click the 5th blocker: "2025 California estimated tax payments includes a payment designated for another tax year". It expands: the 15 Sep payment of 3,500 was for tax year 2024.

**2:05-2:50 · Adjust, then Priya sees it**
1. Open `/daniel/checks?claim=line:F540NR.72`. In the right panel, under Actions, click **Adjust**.
2. New value `10500`. Reason `Sept payment was for tax year 2024`. Leave Authority blank. Click **Save**.
3. Point at "was 14,000 in v3", then at "Needs partner sign-off (tax effect over 1,000)". There is no pop-up; that line is the rule.
4. Talk for about 5 seconds (the other tab checks every 5 seconds), then switch to Priya's tab.
5. Click the bell (3 unread): the notice "Daniel changed 2025 California estimated tax payments" is at the top. Press Escape to close it. The pop-up toast may already be gone; don't wait for it.

**2:50-3:20 · Roles**
1. Back in Daniel's tab, open `/daniel/documents`. Set **Viewing as** to "Marcus Bell, preparer".
2. Click the first W-2 row (D08, Corvane Systems). Point at the SSN shown as last four, "Masked, last 4".
3. In the right panel, under Actions (near the top, above the page), click **Reveal**. The refusal appears, quoting the firm rule.
4. Switch to Ngozi's tab (not the dropdown, which would keep you on Documents). Point at "What we need from you · 3".

**3:20-4:25 · AI**
1. Open `/daniel/checks?claim=finding%3Aai-repair_vs_improvement-3`. If it does not open the heat-pump suggestion, scroll to "AI suggestions" and click the first row, "✦ A repair that may be an improvement" (SchE.14A, 13,300, the one whose text mentions a new heat pump).
2. Click **Review the suggestion**. Point at the quote "Installed new 3-ton heat pump system…", then at "Each quote was found word for word on its page before this suggestion was shown."
3. Point at the ✦ and at **Accept** / **Dismiss**. Don't click either. Don't read the confidence column aloud (the list and the panel use different words).

**4:25-5:00 · Clock (Jo's tab)**
1. In the Story time bar, under the header, in **Move story time to**, pick "13 Jul 2026, 17:04 UTC · E-file rejected" (under Filing) and click **Move clock**. Wait 3 to 4 seconds.
2. Under the three figures, point at the filing status: "Rejected 13 Jul 2026" and the reason (a dependent's ID number and name must match).
3. Pick "15 Jul 2026, 02:10 UTC · E-file accepted California" (under Filed) and click **Move clock**. Point at the "As filed, locked" chip in the header and in the filing status.

## Lines to keep exact

- "The automatic score said 17. A second model judged each match and said 13. I report 13." Never quote 88%.
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
- A change flows through the sums and differences; a line that needs a tax computation waits for an engine re-run and blocks approval. Tax effects are estimates from the packet's rates.
- Five kinds of check depend on how the text is worded. That is where the AI reader helps, and where it still misses half.
