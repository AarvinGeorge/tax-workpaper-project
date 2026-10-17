# Round H3b: fixes from Fable review 7 (read <scratch>/hybrid/review/review-7-h3.md first)

Test first: for every must-fix, the owner of the harness writes the failing assertion BEFORE the fix, runs it to show it fails on the current files (paste the failure), then fixes. Edit only your own files and harnesses.

## Shared decisions (one source of truth = the shell; children consume props, with standalone fallbacks)
1. **Blockers (M2):** the shell computes the blocker list once from `events` + `storyAt` (the 4 base blockers, minus those cleared by an adjustment/cleared event on that claim, plus crypto-c6 and gift-brigid after their arrival) and passes `blockers` (ordered array of {claimId, title}) to every child. Helen's button text everywhere = `Approve and send to client: blocked by “<blockers[0].title>”, and N more` built from that prop. No child computes its own list when the prop is present.
2. **Events keep every field (M3):** `who` stays the role key; the shell adds `whoName` for display; all other fields (slot, signer, form, itemIds, to, clientText, assignee, ...) pass through untouched. Bell text uses whoName once ("Priya Raman marked ...").
3. **Recipient rules (M4)** cover: deadline_warning (assignee + jo), standards_published (all staff), send_back / sent_back (preparer), sent_to_review / review_requested (reviewer), client_signed (preparer, reviewer, helen), quality_finding (preparer, reviewer, helen). Unknown types stay history-only.
4. **Stage and spouse:** the shell passes `stage` (its header word) and `spouseOf` (the canonical table, function claimId -> 'ngozi'|'erik'|'both'); children use them. Canonical table unchanged (Erik: atlas, sehi, form-3520, crypto-c6, noncash; Ngozi: theo-ssn, fed-est, heat-pump, ca-wages, gift-brigid; both: ca-est, salt-d02; else questionnaire answerer, else both).
5. **Marcus wording:** no digits of any identifier in any text Marcus receives, including "ends 3390"; filter on 3-4 digit tails next to identifier words, and phrase as "an identifier was corrected".
6. **Clock:** every comparison with `storyAt` uses the full timestamp (M1). Simulate a colleague that moves the clock emits a clock event (history only).

## Owners
- S1 (Main, harness-shell, harness-integration): decisions 1-6 in the shell; integration harness gains (a) act-then-re-render through the shell for: Mark prepared, send to reviewer, Jo reassign, Ngozi sign 8879 then remount, attach then undo; assert the visible state after each; (b) clock backwards: jump to 15 Jul then back to 23 Jun and assert every child's view shrinks (no D71, no rejection); (c) after Priya adjusts ca-est, Helen's button text identical in Home, Checks, Review, Filing, Firm; (d) Marcus text never matches /\b\d{4}\b/ next to SSN/identifier words.
- S2 (ClaimDrawer, harness-drawer): M1 full-timestamp compare (ClaimDrawer:701 and any other date-only compare); spouse from `spouseOf`; noncash included.
- H (Home, ReturnMap, Documents, harness-H): blockers and stage from props; spouse from `spouseOf` (drop questions for claims the drawer says need nothing from the client); clients after filing never see "Needs your answer" (show "Answered" or nothing); remove the two real tl-20 PINs from harness-H.js (assert on a pattern instead).
- R (Checks, Review, harness-R): blockers, stage, spouse from props (Checks:220 RSU question goes to the canonical owner); Review note times as story timestamps, not "5:02 am"/"Yesterday".
- F (Changes, Filing, Firm, harness-F): blockers and stage from props (Home:321-style clock-only counts at Filing:336, Firm:301, Changes:435 replaced); event names deadline_warning, standards_published, client_signed kept as-is (the shell now routes them).
At the end run all 7 harnesses and report exit codes and the failing-first evidence.
