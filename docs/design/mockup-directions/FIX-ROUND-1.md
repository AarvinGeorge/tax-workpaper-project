# Fix round 1 (after Fable review), shared by A, B, C

Read the review at `scratchpad/mock/REVIEW-roles.md`, fix every must-fix and should-fix that names YOUR file, and apply these shared decisions so the three directions are a fair comparison. Edit only your own file. Re-run your harness and show the output. Add a short "Changes after review" note in your report, with any finding you reject and why.

## Shared decisions (identical in all three)
1. **Version string:** "v3, none of our changes applied yet". No "+2", no "Changes 11". Untagged invented counts (e.g. "Checks 117 / 112 pass") are removed or tagged "Example".
2. **Stage is a fact of the return, not the viewer:** "Review" for every role. The examiner additionally sees the "Filed snapshot, read only" banner.
3. **Blockers:** the same 4 everywhere: California estimates include a 2024 payment (D68); card sales counted twice (Atlas 12,400); RSU sold with zero basis; Theo's SSN differs from his card. Heat pump stays the one judgment item. Northlake interest may appear only as a non-blocking item. So Helen's button reads "...blocked by <first blocker>, and 3 more".
4. **Role switcher markup:** write the 8 `<option>` elements literally (no `sc-for` inside `<select>`), bind `value="{{role}}"` on the `<select>` and `onChange` to the handler. No `selected=` on options.
5. **Chat text, exact.** Staff roles:
   Q "Which California estimated payments count for 2025?"
   A "Three payments count: 15 Apr 2025, 16 Jun 2025 and 15 Jan 2026, totalling 10,500 [Source: D68]. The 15 Sep 2025 payment is marked tax year 2024 on the document."
   Client role (computed per role, not static markup):
   Q "Which of my California payments count for 2025?"
   A "Three of your payments count: 15 Apr 2025, 16 Jun 2025 and 15 Jan 2026, totalling $10,500, from your FTB Web Pay confirmations. The 15 Sep 2025 payment was for 2024."
   Label "Preview, later round" in both.
6. **Client sees no internal text anywhere**, including static markup, peek headers and the chat: no staff names (say "your tax team"), no document IDs, line codes, ev ids, rule names, "tax effect", check names or review notes.
7. **Client asks must not contradict the screen.** Theo's card (D71) already arrived 13 Jul, so do not ask to upload it; ask instead "Please confirm Theo's Social Security number ends in 3390, as on his card."
8. **IRS examiner sees the filed record, not our internal analysis:** the Letter 566 items (Schedule A line 12 noncash gift with Form 8283; Schedule C receipts vs 1099-NEC 142,000 and 1099-K 12,400), each with its filed value, source document, how it was built and the sign-offs/history. No "Blocking", "should be", "Tax effect", open-check verdicts, or California lines. Action: Export response pack only.
