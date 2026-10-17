# Review 7: round H3 (story clock, events, bell, Erik, U1-U20)

Reviewer: Fable 5.1 (authors: Opus). Read-only; probes in `<scratch>/hybrid/review/r7_*`; packet via `python3 -I`, SSN last 4 only, PINs never printed. Run 16 Oct 2026, 22:10-22:29 EDT (`date`).

## 1. Verdict

**Reconciles with fixes.** No packet fact wrong; no PIN in any project file or 2,100 rendered views; examiner gets no live event at any clock; clients get plain words. Four must-fixes: a story-clock slip, blocker text diverging across files, actions that stop working through the shell, promised notifications never sent.

## 2. Must-fix

**M1. Drawer shows Theo's card 62 minutes early.** `ClaimDrawer.dc.html:701` compares `asOf < '2026-07-13'` (date only). Probe at 13 Jul 2026 18:00: title "differed from his 2024 return and his card", others "D71, received 13 Jul 2026", client "Ends 3390 on his card". Fix: compare to `'2026-07-13T19:02'` like every other file.

**M2. Helen's blocker text diverges after an adjustment.** Checks:345-347 and Review:320-322 derive blockers from events; Home:321/365, Filing:336-337, Firm:301-302, Changes:435 from the clock alone. Probe: Priya adjusts ca-est; Home "blocked by “California estimates…”, and 3 more", Checks/Review "blocked by “Card sales…”, and 2 more", Filing/Firm "4". H1 item 3: byte-identical. Fix: the shell computes `blockers` from events and passes it down.

**M3. Child actions stop taking effect inside the shell.** `Main.dc.html:569-577` `view()` renames `who` to the display short name and whitelists fields (drops `slot`, `signer`, `form`, `from`). Children compare `who` to the role key or full name (Checks:336-339, Review:334-364, Documents:525/532) and read the dropped fields (Firm:262, Filing:349). Probe through the shell: Priya's "Mark prepared" shows her "Prepared by Priya" under "Since you last looked" with every button still enabled; Review's send-to-reviewer never flips; Jo's reassign leaves Priya; Ngozi's signature reads "Not signed" on remount; the bell reads "Priya Priya Raman marked…". Standalone it all works, so the harnesses pass. Fix: the view carries `by` (role key) and every field; children test `by` and never put the actor's name in `text`.

**M4. Promised notifications never fire.** Firm:327 "The assignee and you are notified", Firm:347 "The partner is notified", but `Main.dc.html:315-348` has no rule for `deadline_warning` or `standards_published`: `rec()` returns `[]` (probe); contract B names deadline warning → assignee and Jo. Also silent: Changes `send_back`/`sent_to_review`, Filing `client_signed`, Home `quality_finding` (the shell spells them `sent_back`, `review_requested`, `qr_finding`). Fix: add the cases or use the shell's names.

## 3. Should-fix

1. Marcus and last-4 phrasing: Main:547 `IDENT_RE` misses "ends 3390"; drawer:773 and Documents:494 pass it. Probe: a Priya note "Theo card ends 3390" reaches Marcus. Reuse the drawer's `scrub` (772).
2. Three spouse tables disagree: Checks:220 asks Erik about the RSUs (Ngozi's, D28/D11); Checks:273/275 dg-1099 → Ngozi, dg-caamt → Erik; drawer:712 lacks `noncash`; Home:407/410 asks ca-wages and salt-d02 questions the drawer answers "Nothing needed from you" (639, 653). One table, in the shell.
3. harness-H.js:162,170 embed the two real tl-20 PINs (4 hits; project files and rendered dump 0). Use fake PINs.
4. Clients after filing still see "Needs your answer" on ca-est and theo-ssn (drawer 1002-1007 ignores filing; probe at 2027 and 2028).
5. Simulate moves the clock 2 minutes with no clock event (Main:440-445; contract A). Home:221 reads `clientText`, which the view lacks, so clients get "Your tax team updated your file".
6. Firm:304 and Filing:409 say stage "Filing" from the signature; the shell says "Approval" until the rejection (Main:464). Review:239-241 note times "5:02 am" / "Yesterday" are off the story clock.
7. Harness gap: removing the `e.at > storyAt` filter (Main:565) trips only the anchor self-test; nothing jumps the clock backwards and asserts the view shrinks.

## 4. What reconciles well (cited)

All 29 timeline ids and times (Main:215-245), 63/89 changes, 45 answers, Letter 566 dates, submission ids. Stage words and Filing's 13 rows right at all six clocks; Sam/next/irs/Marcus see only the notice before their start. Bell: Marcus "an identifier was corrected", before/after withheld; clients in plain words; clock moves history-only; Play groups toasts; mark-all-read clears Home and Checks; draft guard; refused edit "Priya changed this at 06:07; review her change first"; stale sign-off live in drawer, Review and Checks after Simulate. Facts all match: GT-A02, GT-D02 (6,912 = 13,420 × 188/365), C6, St. Brigid, five what-ifs, extension, post-filing rates, related returns and K-1 lines, outside filings, deadlines, 7 starter rules, variance rule. Blockers 4 → 5 → 6 in all five files at untouched clocks; adjustments 8, partner 4. Renames complete; nav hints (Main:496); attribution (Main:87). Every claim id a child opens is known to the drawer.

## 5. U1-U20

Done: U1 (Main:89-112), U4 (138, 644), U6 (82, 302-305; Filing:342-367), U8 (ReturnMap:315-335), U9 (Changes:349-398, never emits), U10 (drawer 914-940; Documents 481-528), U11 (Areas:741-772), U12 (drawer 942-966), U13 (Filing:466-502), U14 (Filing:431-464; Example at 185), U15 (drawer 629-655; Checks 229-234), U16 (drawer 816-819; Checks 288-289), U17 (Filing:392-401), U18 (ReturnMap:260-280), U19, U20 (Main:87, 532-537). Partial: U2 (silent clock move), U3 and U7 (M3), U5 (Firm reassign and deadline warning, M3/M4).

## 6. Harnesses

All seven exit 0 (`set -o pipefail`, 22:14 EDT). harness-integration renders every child with the shell's own events, emit, lastSeen and storyAt, but never re-renders after an action, so M3 is invisible. Mutations on a copy: Marcus digits and examiner events caught by harness-shell; the clock filter removed fails only the anchor self-test (should-fix 7).

## 7. Probes run

`python3 -I r7_probe.py`, `r7_probe2.py`, `r7_probe3.py`, `r7_pins.py`; `node r7_probe.js` (6 clocks × 10 roles × 10 screens × 26 claims; blockers before/after an adjustment; 12-event scenario per role; recipient rules for 30 types; actions through the shell; spouse table; claim ids); `r7_mut/` (three mutations).

### Trimmed probe output
```
# harnesses (pipefail)
harness-shell exit=0 … checks run: 8355, failures: 0
harness-H/R/F/A/integration/drawer exit=0

# M1 drawer, clock 2026-07-13T18:00
drawer theo-ssn daniel: title="Theo’s SSN differed from his 2024 return and his card" others=1
drawer theo-ssn ngozi: value="Ends 3390 on his card"

# M2 after Priya adjusts ca-est, helen
home:   … blocked by “California estimates include a 2024 payment”, and 3 more
checks: … blocked by “Card sales counted twice in business income”, and 2 more | chip: 3 blocking filing
review: … blocked by “Card sales counted twice in business income”, and 2 more | 3 blockers
filing: 4 | firm: 4 | changes: 4

# M3 through the shell
Checks priya "Mark prepared" on repairs -> tword="Prepared by Priya" grp="Since you last looked" acts disabled=[all false]
Review priya send to reviewer -> button still "Mark prepared and send to reviewer"; since: "Priya Priya Raman marked…"
Firm jo reassign -> asgRows[0].who="Priya Raman" | event assignee=marcus
Filing ngozi signed 8879 -> fresh instance "Not signed" | view has signer: false

# M4 recipient rules
deadline_warning -> []   standards_published -> []   send_back -> []   client_signed -> []   quality_finding -> []

# PINs
pins found in tl-20 detail: 2 … project files 0 hits each … harness-H.js PIN hits: 4 … r7_dump.json PIN hits: 0

# mutations (copy)
A Marcus digits: harness-shell exit=1 (guard fails on Main)   B examiner events: exit=1 (guard)   C clock filter: exit=1 (anchor only)
```
