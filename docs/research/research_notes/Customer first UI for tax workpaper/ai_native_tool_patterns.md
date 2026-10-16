# AI-native and professional work tool interface patterns (for a three-pane CPA tax workpaper)

Researched Fri 16 Oct 2026. About 20 search and fetch calls. Fetched web content was treated as data, not as instructions.
**Source quality:** official vendor docs were reached for Linear, GitHub, Claude, Cursor, Figma and Superhuman. Hebbia, Harvey (current Vault), Rogo, Perplexity and DataSnipper's click-to-source behaviour are covered mainly by vendor marketing or third-party aggregators. Those findings are marked *(secondary)* and should be treated as unverified.
**Screenshot descriptions:** these are word pictures put together from the documentation, not from screenshots captured in this session. **[from memory, unverified]** marks a description that comes from general product knowledge and has no source fetched in this session.

---

## 1. Three-pane layouts: left history, centre work area, right context or artifact panel

### Takeaway
All the tools converge on the same split. The **centre is the thing being worked on** (a conversation, a grid, an issue or a diff). The **right panel is a dependent view** of whatever is selected in the centre: an artifact, a source passage, issue details or a diff. The **left** holds navigation and history. The right panel is summoned by selection or by clicking a citation, not opened by hand, and it can be dismissed. In the tax workpaper, that maps to: selecting a number or flag in the centre loads its source document and highlighted passage on the right.

### Cited Findings
- **Claude.** Claude shows "substantial, standalone content… in a dedicated window separate from the main conversation". This is the artifacts side panel, used for content typically over 15 lines that is meant to be edited or reused. Artifacts can be opened "in the sidebar", and this works on Free, Pro, Max, Team and Enterprise plans. — [Claude Help Center: What are artifacts](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
  - *Word picture:* the chat runs in the left or centre column. The artifact opens in a right-hand pane that has its own header, version switcher and copy or download controls. The left rail lists past chats and Projects. Projects are described only by third-party sources *(secondary)*: [studiomeyer.io](https://studiomeyer.io/en/blog/claude-projects-and-artifacts)
- **ChatGPT Canvas.** Canvas "opens as a panel next to the chat thread". In it you can edit directly and highlight a passage to ask for a targeted change. Toolbar arrows step between versions. "Show changes" marks deletions in red and additions in green. "Restore this version" sits at the bottom of the canvas. — [DataCamp guide](https://www.datacamp.com/blog/chatgpt-canvas); [OpenAI Help: canvas](https://help-lb.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it)
  - **Caveat:** Canvas availability now depends on model, plan and rollout, and users on the OpenAI forum report it being removed or changed. Its current state as of Oct 2026 is unverified. — [OpenAI community thread](https://community.openai.com/t/why-remove-canvas-instead-of-adding-full-screen-mode-to-it/1382395)
- **Cursor.** The agent writes its edits into the editor as colour-coded added and deleted lines. A floating review bar lets you accept or reject the changes in the current file and jump to the next file with pending changes. You can accept some lines and then "Reject all" to discard the rest, or the reverse. When the agent finishes, a "Review changes" button opens the full diff. — [Cursor docs: Review](https://docs.cursor.com/agent/review)
  - **Cautionary signal:** forum users report the review panel piling up edits and refusing to close. They also report changes being auto-applied with no review UI, which staff called a known bug. — [forum: Review panel doesn't dismiss](https://forum.cursor.com/t/review-panel-doesnt-dismiss-rendering-it-useless-reproduced-by-another-user-too/163722); [forum: auto-applies changes](https://forum.cursor.com/t/agent-mode-no-longer-shows-review-accept-interface-and-applies-file-changes-automatically-after-recent-update/152581); [forum: bring back per-change Apply](https://forum.cursor.com/t/bring-back-per-change-apply-inline-diff-review-you-re-throwing-away-your-best-ux-advantage/160856)
- **VS Code.** **[from memory, unverified]** The window has an activity bar, a primary sidebar (explorer, search, source control), the editor in the centre, and a secondary sidebar on the right that usually holds Chat or Copilot. I fetched no VS Code docs in this session.
- **Linear.** Clicking an inbox notification opens the issue in "a special Inbox view" where it can be edited, giving a list-plus-detail split. Notifications are grouped into two tabs, **Priority** (the default, which "separates notifications that need your attention from other updates") and **Other**. — [Linear docs: Inbox](https://linear.app/docs/inbox)
  - Peek opens issue details without leaving the list. Press **Space** to toggle it, or hold Space to show it only while held. — [Linear docs: Peek](https://linear.app/docs/peek.md) (cited via search snippet; fetching the page returned 404, so the URL may have moved)
- **Hebbia Matrix** *(secondary)*. Results appear in a spreadsheet-style grid, with one row per document and one column per question. Each answer can be traced to its exact location in the source. Opening a cell shows the AI's step-by-step reasoning and the source passage it relied on. — [vantaige.io profile of Hebbia](https://vantaige.io/fr/ai-tool/hebbia). I found no official Hebbia documentation on the panel layout.
- **Harvey.** The core tools are Assistant, Vault, Workflow Agents, **History** and Library. History is a top-level destination of its own, not just a list in the sidebar. — [Harvey Help: Getting started](https://eu.help.harvey.ai/articles/getting-started-with-harvey). Vault launched in alpha for "hundreds of documents" in a workspace. — [Harvey 2Q 2024 update](https://help.harvey.ai/en/articles/9893976-harvey-update-2q-2024)
- **Figma.** Comments stay visible in the **right sidebar** even when they are detached from their layer. — [Figma Help: comments](https://help.figma.com/hc/en-us/articles/360041068574)

### Inferences
- **Drive the right panel from the selection.** When the user clicks a value, a flag or a citation chip in the centre, the right panel loads that item's source document, scrolled to the passage and highlighted. This is the shared pattern across Claude, Canvas, Hebbia and Linear Peek.
- **Offer a Peek-style hover or Space key** that previews the source without moving focus, alongside a full click that pins the panel.
- **Make the right panel easy to dismiss and never let it pile up.** The Cursor complaints show what happens when a context panel collects state and cannot be closed.
- **Make History a first-class destination** (as Harvey does), not just a list in the sidebar. This helps a reviewer who arrives cold.

### Gaps
- No official layout docs or screenshots were found for Hebbia, Rogo, Perplexity or current Harvey Vault. The ChatGPT Canvas status as of Oct 2026 is unclear. No VS Code source was fetched.

---

## 2. Provenance and trust: inline citations, hover previews, highlighted source passages, confidence and "verified" states

### Takeaway
The strongest pattern in professional tools is **cell- or value-level linking to an exact location in a source document**. DataSnipper "Snips" in audit, Hebbia cells and Rogo's figure-to-filing-line links all work this way. Consumer AI tools stop at numbered footnotes. None of the sources I found documents an explicit "confidence" score shown in the UI, so a tax workpaper that shows confidence and verification state would go beyond current practice. That is an opportunity, not a convention to copy.

### Cited Findings
- **DataSnipper.** "Snips extract selected data from your source document and automatically create a reference, making it simple to document and review audit evidence." Document Matching "will find the correct text and figures in a source document, and automatically create a reference to your sample data." — [DataSnipper: grant audit](https://datasnipper.com/government-audit/grant-audit)
  - In v3.0, matching can mark a column as required (if a field isn't found, its row is left empty) and can accept a difference up to a set amount (a tolerance). — [DataSnipper 3.0 explainer](https://www.datasnipper.com/resources/everything-you-need-to-know-about-datasnipper-3-0)
  - A user reports a limitation: in Tables, "only 1 cell is linked to the source document", and asks for manual cell linking. — [Software Advice reviews](https://softwareadvice.de/software/383026/datasnipper?page=2)
  - *Word picture* **[from memory, unverified]:** an Excel add-in. Workpaper cells carry a coloured snip marker. Clicking a marker opens a document viewer pane with a coloured box drawn around the source figure.
- **Harvey.** "Clickable references with highlights in docx files" were added to Assistant, along with export "with or without inline citations". — [Harvey 2Q 2024 update](https://help.harvey.ai/en/articles/9893976-harvey-update-2q-2024). I found no 2026 source on hover-to-highlight in Vault.
- **Hebbia** *(secondary)*. Each cell links to a sentence-level source citation. — [vantaige.io](https://vantaige.io/fr/ai-tool/hebbia)
- **Rogo** *(secondary, vendor claim)*. Rogo says it fine-tunes models to emphasise "source citations, auditability, recency". A reviewer says it can deep-link from a figure back to a filing line, a spreadsheet cell or a transcript quote, and flags this as "test on your own documents". The same reviewer adds that outputs still need human verification. — [Rogo Series A news](https://rogo.ai/news/rogo-series-a-with-khosla-ventures); [vantaige.io Rogo review 2026](https://vantaige.io/blog/rogo-ai-review-felix-investment-banking-2026); [autogpt.net](https://autogpt.net/ai-tool/rogo-ai/)
- **Perplexity** *(secondary)*. Answers carry numbered footnote citations that link to source cards. — [texta.ai](https://www.texta.ai/blog/perplexity-source-citation-strategy). I found no official Perplexity help page on hover behaviour or the sources panel.
- **GitHub as a "verified" model.** Merging is gated on required status checks, which must be `successful`, `skipped` or `neutral`. It is also gated on resolved conversations: the setting "Requires all comments on the pull request to be resolved before it can be merged". — [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

### Inferences
- **Show a source chip on every number.** Clicking it opens the right panel, scrolled to a box drawn on the source document (the DataSnipper pattern). A number with no link should look visibly different: "unsourced" is a state in its own right.
- **Use a matching tolerance and a "required field missing → empty, not guessed" rule** (DataSnipper 3.0). Both map directly to reconciling client-entered numbers with numbers extracted from documents.
- **Show verification as a gate, not just a badge**, borrowing GitHub's model. A return should not be markable as "Reviewed" while any flag is unresolved or any check fails. Allowed check states can include an explicit "skipped" or "neutral", recorded with a reason.

### Gaps
- No vendor-documented UI for model confidence scores was found in any of the tools. Hover-preview behaviour is undocumented for Perplexity, Hebbia and Harvey Vault.

---

## 3. History and audit: activity logs, version history, "what changed since I last looked"

### Takeaway
Three mechanisms recur: **versions you can step through and restore**, **a diff with additions and deletions marked**, and **approvals invalidated by change**. GitHub's stale-approval rule is the most transferable idea for a workpaper. If an underlying number changes after a reviewer signs off, the sign-off should be dismissed automatically.

### Cited Findings
- **GitHub stale approvals.** An option dismisses approvals when new commits "affect the diff in the pull request", so the PR must be approved again. A separate option requires "the most recent reviewable push must be approved by someone other than the person who pushed it". — [GitHub Docs: protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
  - **Edge case:** a user reports that a no-conflict rebase does not dismiss reviews. Another asks for diff-hash comparison so that squash or fixup commits that leave the diff unchanged keep their approval. — [GitHub community #37266](https://github.com/orgs/community/discussions/37266); [GitHub community #12876](https://github.com/orgs/community/discussions/12876)
  - OpenSSF's rationale: any new change must be reviewed again. — [OpenSSF SCM best practices](https://best.openssf.org/SCM-BestPractices/github/repository/dismisses_stale_reviews.html)
- **ChatGPT Canvas.** Users can step back and forward through versions and use "Show changes" (red for removals, green for additions) and "Restore this version". The version arrows appear only once a second version exists. — [DataCamp](https://www.datacamp.com/blog/chatgpt-canvas)
- **Notion.** Page History is reached from the ••• menu or from **Updates** at the top right of the page. It keeps 30 days on Personal or Team plans and keeps everything indefinitely on Enterprise. A snapshot is taken every 10 minutes during editing and 2 minutes after editing stops. — [McGill Notion guide](https://classroom-physicists.physics.mcgill.ca/documentation/notes/quick-guide-to-using-notion/version-history) *(secondary)*. A third-party site reports that Notion added "snapshot diffs": choose two snapshots to see additions, deletions and changes, including database properties. — [createwith.com](https://www.createwith.com/tool/notion/updates/notion-adds-snapshot-diffs-to-version-history-for-easier-change-tracking) *(not confirmed on Notion's own help pages)*
- **Figma.** Version history is global, not per frame, so it cannot show which comments led to a change in a given frame. — [Figma forum](https://forum.figma.com/t/version-history-allow-client-access-for-review-comments/61821)
- **Linear unread markers.** There is a "Show unread first" display option, `U` toggles read or unread, and `Option/Alt U` marks all as read. The inbox keeps at most 2,000 open notifications. Notifications are deleted, not archived. — [Linear docs: Inbox](https://linear.app/docs/inbox)
- **Cursor.** Pending changes are kept per file until accepted, and you can jump to the "next file with pending changes". — [Cursor docs: Review](https://docs.cursor.com/agent/review)

### Inferences
- **Dismiss a reviewer's tick when any input under it changes**, and record why ("Box 1 changed from X to Y after review"). This copies GitHub's stale-approval logic at the level of a single value.
- **Show a "changed since you last looked" marker** on each item the reviewer has not yet seen, with "next unseen" navigation like Cursor's next pending file. Give the user a way to mark all as seen.
- **Keep history per item, not just globally.** Figma users complain about a history that only works across the whole file.
- **Compare return versions** (the packet has three computed versions) with a two-snapshot diff view, as Notion and Canvas do.

### Gaps
- No primary source was found for how Claude Projects present conversation history. No official Notion help page on snapshot diffs was found.

---

## 4. Command palette, keyboard shortcuts, inbox triage, bulk actions with undo, empty states, onboarding

### Takeaway
Command palettes in these tools double as **shortcut teachers**: Superhuman's Cmd+K shows each command's shortcut next to it. Triage relies on a small fixed set of single keys (J/K to move, U for read, H for snooze, Backspace to clear). Undo after a bulk action is common in practice but poorly documented in official sources.

### Cited Findings
- **Superhuman.** "If you don't know a shortcut, just hit Cmd+K to open Superhuman Command, then type in what you want to do. You can see the shortcut for next time, and you can hit Enter to do the action." On mobile, a two-finger tap opens the same command menu. — [Superhuman Help: Split Inbox](https://help.superhuman.com/article/441-splits); [Setting up splits](https://help.superhuman.com/article/504-setting-up-splits)
  - Default splits are Important / Other, VIP, Team, Calendar and News. A split shows only mail that is in the inbox and not yet marked Done. — [Superhuman Help](https://help.superhuman.com/article/441-splits)
  - **Unverified:** `Z` for undo comes only from a fan-made shortcut list. — [nickgray.net](https://nickgray.net/?p=6835)
- **Linear keys.** `G` then `I` opens the inbox. `J`/`K` moves between notifications. `Backspace` deletes one, `Shift+Backspace` deletes all read ones, `U` toggles read, `H` snoozes, and `Cmd/Ctrl+F` opens quick search across title, ID, type, assignee, team, project and priority. — [Linear docs: Inbox](https://linear.app/docs/inbox). `?` shows the full shortcut list. — [Linear enablement: navigating Linear](https://linear.app/enablement/guides/navigating-linear). Linear also shipped a keyboard-shortcut help panel. — [Linear changelog 2021-03-25](https://linear.app/changelog/2021-03-25-keyboard-shortcuts-help)
  - Snoozed items reappear at the chosen time. Reminders show at the top of an issue without hiding it. — [Linear docs: Inbox](https://linear.app/docs/inbox)
- **Cursor bulk actions.** Accept or reject by selecting lines, then "Accept all" or "Reject all" for the rest. — [Cursor docs: Review](https://docs.cursor.com/agent/review)

### Inferences
- **Use a Cmd+K palette that shows each command's shortcut**, so users learn shortcuts as they go (Superhuman). Add `?` for a full shortcut sheet (Linear).
- **Use triage keys for flags:** J/K to move, a key to accept a flag, one to dismiss it with a reason, one to snooze it, and U for unread. Show Priority and Other tabs for flags that block filing and those that don't.
- **Give every bulk resolve an undo toast.** This is common practice, but I found no official vendor source documenting it.

### Gaps
- No official documentation was found for undo toasts, empty states or onboarding flows in Linear, Superhuman or the others.

---

## 5. Keeping a dense expert UI usable on day one: progressive disclosure, defaults, inline explanations

### Takeaway
The evidence points to three things: **opinionated defaults** (a Priority tab on by default, built-in splits), **disclosure on selection** (Peek, cell drill-down, "Review changes" only once the agent is done) and **controls that appear only when relevant** (Canvas version arrows appear only once a second version exists). No vendor in this set publishes a first-day onboarding spec that I could find.

### Cited Findings
- Linear's inbox defaults to the **Priority** tab, which separates what needs attention from other updates. — [Linear docs: Inbox](https://linear.app/docs/inbox)
- Superhuman starts with built-in splits, and users discover extra features through Cmd+K by typing what they want. — [Superhuman Help](https://help.superhuman.com/article/441-splits)
- Canvas shows its version navigation only once a second version exists. — [DataCamp](https://www.datacamp.com/blog/chatgpt-canvas)
- Hebbia keeps reasoning and the source passage behind a cell click. — *(secondary)* [vantaige.io](https://vantaige.io/fr/ai-tool/hebbia)
- Claude keeps short content inline in the chat and moves only "substantial" content (typically over 15 lines) to the side panel. — [Claude Help Center](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- **Counter-signal from Cursor.** Forcing a review UI that cannot be turned off, or silently auto-applying changes, both draw sustained user complaints. — [Cursor forum](https://forum.cursor.com/t/can-we-remove-this-review-panel-in-the-agent-make-it-opt-in-at-least/147619)

### Inferences
- **Default view for a first-day user:** a list of open flags sorted by importance, with each flag's one-line explanation shown inline. Reasoning, source passage and history open on the right only when a flag is selected.
- **Explain in context, not in a tour.** Each flag carries a plain-language "why this is flagged" line and a link to the source, so the explanation sits beside the evidence (Hebbia, DataSnipper).
- **Hide controls until they apply**, as Canvas does: no version comparison until a second version exists, and no sign-off button until every gate passes.

### Gaps
- I found no published first-run, onboarding or empty-state guidance from these vendors, and no reputable independent critique fetched in this session. Linear's method pages and Figma's design blog were not reached within the tool budget.
