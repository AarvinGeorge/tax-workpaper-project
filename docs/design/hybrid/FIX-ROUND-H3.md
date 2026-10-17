# Hybrid round H3: live collaboration, notifications, story clock, and the checklist's UI gaps (Aarvin approved 16 Oct 21:17 EDT)

Read first: `HYBRID-BRIEF.md`, `FIX-ROUND-H1.md`, `FIX-ROUND-H2.md` (all rules still hold unless changed below), then
`<repo>/docs/discovery/11-brief-checklist.md` (the U1-U20 list is this round's scope) and the full tables in
`<repo>/docs/discovery/reviews/checklist/fable-checklist.md` (edge cases with packet ids). Packet facts only via `python3 -I`
probes in `<scratch>/hybrid/probes/`; SSNs last 4 only; never write in `<repo>`. Edit ONLY your own files. At the end run
ALL harnesses (`harness-shell.js harness-H.js harness-R.js harness-F.js harness-A.js harness-integration.js`), update the
ones that test your files where this round deliberately changes behaviour (say which assertion changed and why), add
assertions for every new feature (including a mutation that proves each new assertion can fail), and report exit codes.

## Shared contract (identical in every file)

### A. One story clock per workspace (replaces the per-role `asOf` table)
- The shell holds `storyAt` (ISO timestamp), default `2026-06-23T06:05` (v3 computed). It passes `asOf = storyAt` and
  `asOfLabel` to every child, so children keep working unchanged.
- Header control "Story time: 23 Jun 2026, 06:05" with **Play the season** (step to the next packet `timeline` event) and a
  list of the timeline's events to jump to (all 29 `tl-` ids plus `extension-2026-04-14`; probe them). Moving the clock is
  itself an event everyone sees.
- Roles exist from a time: Sam from `2027-01-04` (`active_from`), next year's preparer from tl-28, the examiner from the
  Letter 566 receipt (26 Jan 2028). Picking such a role while `storyAt` is earlier shows, in the centre, a one-line notice
  "Sam joins on 4 Jan 2027" and a button **Move the story to 4 Jan 2027** (no other content). Working roles at a later clock
  see the filed record read-only ("As filed, locked").
- Stage word derives from `storyAt` (before acceptance tl-23 "Review"/"Approval"/"Filing"; after "Filed").

### B. One event list drives history, notifications and "since you last looked"
- Shell state `events: [{ seq, at, who, type, claimId, groupId, retracts, text }]`, seeded from the packet timeline up to
  `storyAt` (replayed: true) plus the Example review events already shown (tag Example). New events get `seq` = max+1 and
  `at = storyAt`.
- Children receive `events` and `emit` (function(event)). Every action that today shows "Recorded for this session" calls
  `emit` instead (and may still toast). Undo emits a compensating event with `retracts: seq`.
- `lastSeen` per person (object role → seq) lives in the shell. "Since you last looked" on Home, Review and Checks is
  computed from `events` with `seq > lastSeen[role]` visible to that role, never hard-coded.
- **Notifications** = events whose recipient rule includes the role. Recipient rules (the shell owns them):
  assignment → assignee; review note → addressee and preparer; sign-off gone stale → the signer; item over 1,000 → Helen;
  question to client → the named spouse; client answer → preparer; e-file rejection → preparer, reviewer, and both clients
  (plain words: "The IRS returned your return; we need Theo's Social Security card"); approval requested → Helen; client
  approval requested → both spouses; deadline warning → assignee and Jo. Bulk actions emit one grouped event ("11 items
  marked prepared").
- **Per-recipient wording, rendered at read time:** Marcus never sees identifier digits (not even last 4 in notification
  text: "an identifier was corrected"); clients get plain words and only their own items; the examiner gets no live
  events (only the notice thread); tl-20's two signature PINs are never shown in any channel.

### C. Bell (shell header, top right, immediately after the role switcher)
- Bell icon (inline stroke SVG) with unread count for the current role; panel opens inline under it (not a modal), grouped
  Today / Earlier in story time, each row: who, what, which number, story time; clicking a row opens the claim in the drawer
  (or `go` to the screen) and marks it read. "Mark all read". Reading is per person.
- New notification while the panel is closed: a toast top right under the header, fades after 6 s, `aria-live="polite"`,
  with a "View" link. No sound, no OS notification.
- **Simulate a colleague** (small link inside the panel, staff roles only): plays one scripted live sequence, e.g. Priya
  adjusts F540NR line for 2025 estimates to 10,500 (event, notifies Daniel); if Daniel had signed it, his sign-off goes stale
  ("Stale: the value changed after you signed", notifies Daniel); and an edit refused message when the current role then
  tries to change the same number: "Priya changed this at 06:07; review her change first" with the difference shown.
  This demonstrates several-people-at-once in one tab; real multi-tab sync is the build (backend B3).

### D. Erik becomes a role
- Switcher adds `erik` "Erik Lindqvist (client, spouse)" right after Ngozi; same screens and limits as Ngozi; questions are
  addressed per spouse (probe questionnaire `answered_by` and messages `from`: Erik answered 15, sent msg-03/05/06/07; check);
  each spouse signs Form 8879 and FTB 8879 separately. All files must treat `erik` exactly like `ngozi` for leak rules
  (client sees no internal text). Update every role list and harness ROLES.

### E. Terminology (Fable's map, `fable-checklist.md` section 5)
"Ledger findings" → "Findings" (and never the word "ledger" on screen; the "(ledger estimate, Example)" tags become
"(estimate, Example)"); "Carry" → "Carryover"; "Frozen" → "As filed, locked"; "Carry forward to 2026" → "Carryovers to 2026";
"Approve and e-sign" → "Sign Form 8879 (e-file signature authorization)"; "Dismiss with a reason" → "Clear with a reason";
"Export response pack" → "Examination response". Each screen name in the nav gets a `title` hint with the CPA term
(Checks: "Review checks and engine diagnostics"; Changes: "Adjustments and change log"; Return map: "Forms and lines";
Areas: "Summary by area"). A first use of a term may carry a hover definition (`title`), one line, plain words.

### F. Attribution
Under the role switcher, small text: "Actions are recorded as the role you choose (no sign-in in this demo)". Switching role
while a draft note is typed asks inline (not a modal) "Discard your draft as Daniel?".

## Work split (author: files; checklist items)
- **S1 (Main.dc.html):** A, B, C, D (switcher, nav, role notices), F; seed events; recipient rules; bell; toast; Simulate a
  colleague; Play the season; pass `events`, `emit`, `lastSeen`, `storyAt` to every child and the drawer. U1-U4, U6, U20.
- **S2 (ClaimDrawer.dc.html):** new claims `ca-wages` (GT-A02, Halvorsen box 16 full year, −5,685 CA) and `salt-d02`
  (GT-D02, +1,462; read the ledger for the exact facts and title); "Attach evidence" on every claim (file, message or note;
  emits an event; msg-07, msg-08 and call-01 offered as attachable packet items where they relate; Marcus's note field
  warns not to type identifiers); "Ask a colleague" thread distinct from review notes; claim state **"Answer arrived after
  the last computation"** for claims touched by msg-07/msg-08 (blocks approval; probe dates vs v3); stale sign-off shown
  live from `events`. U10, U12, U15, U16.
- **H (Home, ReturnMap, Documents):** Home "Since you last looked" from events; assignments and deadline warnings measured on
  `asOf` (27 Mar and 8 Apr internal deadlines overdue at 23 Jun, with the extension as context; probe `firm.deadlines`);
  ReturnMap **Compare versions** (v1 / v2 / v3 / firm-adjusted Example / as filed Example, side by side for a chosen form,
  from `changes_from_previous`, probe) and **swing flags** on every line with a 2024 counterpart using the firm's variance
  rule (> 10% and > 1,000; "New this year" state); Documents "Attach a document" for staff and both clients (emits). U3, U5,
  U8, U10, U18.
- **R (Checks, Review):** rows for `ca-wages` and `salt-d02`; blocker count computed from the shared blocker list (no
  `nBlock = 4` literal); assign / reassign action (emits, notifies); Review shows stale sign-offs from `events`; bulk actions
  emit one grouped event; renames. U2, U5, U15, U16.
- **F (Changes, Filing, Firm):** Changes **What-ifs** sandbox from the packet's 5 `what_if.alternatives` (+ extension; probe),
  labelled "Not a change; nothing is saved to the return", never emits a notification; Filing: client sign flow per spouse
  naming Form 8879 / FTB 8879 with the signed snapshot, **Client's copy** (as-filed return, both 8879s, acknowledgements, in
  plain words), **Outside filings** list (FBAR, 1099-NEC, 2023 Form 3520, Form 5330, composites, Ada's 1040, Form 709 none
  needed; each required / not ours / not needed with the reason; verify each against the ledger and packet, tag Example
  where it is a judgment), **Penalty and interest** after the 20 Jul balance payment from `post_filing_rates` (probe; show
  as estimate, Example) and the 2210 method decision; Firm: deadlines with warnings on `asOf`; assignments. U7, U9, U13, U14,
  U17.
- **A (Areas):** **Related returns** record (probe `household.related_returns`: Ada's own 1040, Woodworks 1120-S and Oregon
  composite, Ridgeline 1065 and Arizona composite; what we received and what must agree, e.g. Ada's "someone can claim you"
  vs Form 8812); "Ledger findings" → "Findings"; open `ca-wages` and `salt-d02` where they appear. U11, U15, U19.

Every author: apply E (renames) and D (`erik` in leak rules) in your own files; consume `events`/`emit`/`lastSeen` with safe
defaults so each file still renders alone; no em dashes; design laws from HYBRID-BRIEF; Example tags for anything not in the
packet. Report: files changed, features added per U-item, probes and facts added, harness output, anything not done.

## Harness ownership (edit only your own harness)
S1: harness-shell.js and harness-integration.js. S2: new harness-drawer.js. H: harness-H.js. R: harness-R.js. F: harness-F.js.
A: harness-A.js. Authors run in parallel: another author's file may change under you; if a harness fails only because of
another author's unfinished file, say so in your report rather than editing their file. Probe outputs: write to
`probes/h3-<author>-*.out` only (never overwrite another author's output).
