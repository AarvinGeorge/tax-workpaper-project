# Whole-app product/UX pass — 18 Oct 2026

Read-only walk at commit 13b1d37 (local :3300). Roles daniel, priya, helen, jo, ngozi, irs; clocks 23 Jun 2026 (default), 14 Apr 2026, 16 Jul 2026, and 26 Jan 2028 for the examiner. Panel opened on lines, documents and a blocker. Screenshots: scratchpad `pass/`.

Marks: KEEP / MOVE / CUT / REWORD. Brief phrases quoted where an element exists because the brief requires it; those are never CUT.

## Shell

- Header "Version ? v3, none of our changes applied yet" — REWORD to `v3` + "+N adjustments" badge only when non-zero ("Compare versions").
- "Stage" — KEEP. "Saved" pill — CUT; nothing is ever unsaved. "As filed, locked" — KEEP ("Freeze at filing").
- Story bar: 29-entry dropdown, Move clock, Reset, "?" — MOVE the picker behind the date; keep "Return to latest". It is the demo replay ("a timeline to replay the season"), not a workpaper control.
- Role banner sentence (Jo: "You see who viewed what, time against budget…") — CUT; enabled buttons already say it. Keep "Viewing as".
- Nav hints under three labels — CUT; examiner's "Start here, your queue" is wrong.
- History pane — MOVE into Review → Changes; the bell covers "what changed since I last looked".

## Return overview

- Three figures — KEEP; caption "v3, as computed" once, not thrice; add refund/balance due.
- Filing-status box — REWORD: at 14 Apr it reads "Not sent / Not sent / Notice IRS CP2000 dated 8 Jul 2024". A 2024 notice is not 2025 status; MOVE prior-year notices to Areas → Prior preparer. Pre-filing, one line: "Extension filed 14 Apr, 36,000 paid · due 15 Oct".
- "Start here" card (intro, five packet counts, "Try…", 10-role list, workspace sentence) — MOVE whole card to a "Demo" section of "?". Demo scaffolding above the blockers; duplicates the role switcher. Counts become a Documents footer.
- "Blocking approval · 10" list — MOVE to one line "10 blockers stop filing → Checks". Three identical ten-item lists (overview, Review, Checks) are the main "dump" signal.
- Compare toolbar — KEEP, compact ("Compare versions", "flag swings from last year").
- Forms collapsed with "N lines · k with open checks" — KEEP ("handle large detail without swamping the review").
- Areas — KEEP the 14 areas ("depreciation by asset… sales detail… books to tax"). REWORD raw keys: "California: Balance due −8,256" → "Refund 8,256"; 21-column depreciation table → federal/California/AMT stacked per asset.
- Documents — KEEP rows and filters ("any document to everywhere it landed, or why it didn't"). CUT the sentence repeated nine times ("Read by the engine (v3) but no line takes a value…"); the tag says it. CUT the trailing "Kind of document…" paragraph.
- What-ifs — KEEP ("Try what-ifs"); CUT the duplicated heading.
- Overview subtitle "The return, its open questions… As of …" — CUT; the bar shows the time.

## Checks

- Order ours → AI → engine — KEEP ("checks that don't trust the engine").
- Intro paragraph — CUT; definitions to "?" terms.
- Row — KEEP. "Check CHK-PRORATION-CREDIT-UNUSED · Two sources disagree" — REWORD to the family only; id in the panel.
- Inline "What you checked" / "Clear with a reason" forms per row — MOVE to the panel, which already has Sign off / Verify.
- AI: 39 rows, all "Needs review", "Something in a document the return does not reflect" ×9, "Duplicate_scan_double_counted" — REWORD titles to line + amount, group duplicates.
- Engine codes (`DIGITAL_ASSET_BASIS_MISSING`) — KEEP collapsed, plain title first.
- At 16 Jul (filed) "11 blockers" — REWORD to "open at filing" ("Freeze at filing; amend on top").

## Review

- Approval counts + Approve button — KEEP ("Sign-offs that reopen", "Client approval and e-file signature").
- Second full blocker list — CUT; count + link.
- "Firm rule: Open review notes block filing" under findings — CUT; misleading.
- At 16 Jul staff see "Partner approval: Not yet / Ngozi has not signed" while the client's page says she signed 10 Jul and the return is accepted — REWORD to read the timeline's approval and 8879 events. Trust bug.
- "version 0bc16509" — MOVE to tooltip.
- Six tabs — KEEP ("adjust without losing the original", "view logs"). Changes-tab intro → one line. Title "Review of v3 and our adjustments" + intro — REWORD to "Review".

## Side panel

- Pinned head (tag, key, label, value, "was X") — KEEP ("trace any number to its exact source").
- Actions block above the evidence — MOVE below "Where it came from".
- "How it was built" with rule id and inputs — KEEP ("show how any number was built"); id small.
- Source page with highlights — KEEP ("clearly identify the specific field"). CUT mini-page coordinates and the synthetic-boxes footer.
- Sources: `ev-1027`, "Third-party form", "Pipeline read 0.99: how surely the text was read…" per source — REWORD: confidence once, number + "?" term; hide `ev-` ids.
- Checks on this / Sign-offs / Notes / Client questions / History — KEEP ("how each number was verified", "questions that become evidence").
- Document panel "extraction extracted", "corroborates" — REWORD to the tab's labels.

## Clients and examiner

- Client Home plain asks — KEEP. Nav "Approve and sign" after filing — REWORD "Your filed return".
- Client Filing (state, history, next year, sign, copy) — KEEP ("the client's copy"); CUT intro.
- Story bar + "Reset to start" shown to clients and examiner — MOVE out of their view.
- Examiner letter, items, four lines, cited documents — KEEP ("answer a notice with a self-contained record").

## "?" dialog

- Legends, deadlines, firm standards with "where it acts", people, time against budget — KEEP ("firm-wide standards", "time against budget"). Right home for intros, demo card, role text. Missing terms: "Corroborates only", "fingerprint", "engine note", "Needs review".

## Top 10

1. "Start here" → "?" Demo section — S.
2. One blocker list (Checks); overview and Review show count + link — S.
3. Review reads timeline approval/8879 events; a filed return never says "Not signed" — M.
4. Cut every intro paragraph; definitions to terms — S.
5. Panel: evidence first, actions second, confidence once, no `ev-` ids or coordinates — M.
6. Filing-status: prior-year notices out, one line pre-filing, refund in the figures — S.
7. Cut nav hints, role sentence, "Saved"; shrink story bar — S.
8. AI titles name line + amount, grouped; inline forms removed — M.
9. Areas: refund wording, depreciation split, raw keys humanised — M.
10. Documents: tag only, counts as footer — S.
