# Review 2: Documents, Checks, Review (Fable 5.1, Fri 16 Oct 2026 16:48 EDT by `date`)

Files: `project/Documents.dc.html`, `Checks.dc.html`, `Review.dc.html`. Packet read with `python3 -I` probes in this folder; SSNs last-4 only.

## 1. Verdict

**Reconciles with fixes.** About 110 counts, dates, ids, amounts and rule quotes match the packet (probes 1-3). Three must-fixes.

## 2. Must-fix

**M1. "Now" contradicts README `where_now_is` (level 2).** `Documents.dc.html:85-86, 245-246, 271-272` and `Checks.dc.html:175` show D71 (13 Jul 2026) and D72 (26 Jan 2028) as received, "the clients signed Form 8879 and FTB 8879 (10 Jul)" and "the federal e-file was rejected (17:04)", while the stage is Review, Helen is blocked and `Review.dc.html:241` shows Client "Not sent". README: v3 (2026-06-23) "is the current return. Timeline events after that ... are scripted for replay." FIX-ROUND-1 item 7 (level 4) told authors D71 "already arrived": level 4 against level 2. Fix: the shell carries a timeline position (default 23 Jun 2026); pre-filing roles see 72 documents and no late-arrival panel until the replay passes tl-22; Sam, next year and the examiner see the full replay; the client's Theo ask follows the position.

**M2. Blocker wording differs (brief: same wording everywhere).** `Checks.dc.html:174` "Theo's SSN differs from the 2024 return and his card"; `Home:158,179`, `ClaimDrawer:253`, `Changes:158`, `Filing:225` say "differs from his card" (grep below). Checks' version is the accurate one (GT-A05; decisions.md correction: the pre-filing evidence is D06). Fix: one string; change Checks:174 (one line) or the other four files.

**M3. A quoted page is not what the packet prints.** `Checks.dc.html:203` shows D08 p1 as "2025 Form W-2, Corvane Systems, Inc. (Ngozi Okafor). Box 1 wages, tips, other compensation 104,600.00." Packet: "Form W-2 2025. Employer Corvane Systems, Inc., EIN 82-4471903, ... Box 1 104,600.00; Box 2 15,800.00; ..." (probe 3). README `truth_and_mistakes`: printed_content "states what is actually printed"; brief 28-32. Fix: render `printed_content` verbatim with the field highlighted, as `Documents.dc.html:364-369` does.

## 3. Should-fix

- Quotes trimmed with no cut mark: `Checks:170`, `Review:193` (D15 drops "; processing fees booked to Bank and merchant fees"); `Review:194` (D47 drops ", new line set and thermostat"); `Checks:197` (D62 drops the date range). Add an ellipsis or quote whole sentences.
- Helen's button wraps the blocker in curly quotes at `Checks:316`, `Review:256`; `Home:203`, `Filing:230`, `Firm:254` do not.
- "Most recent of the 70 you sent" (`Documents:182, 379-380`) lists D47 (12 Feb) and D68 (9 Feb); 24 client documents arrived between 12 Feb and 2 Mar (probe 3). Drop the two rows or retitle.
- Chips "All 74" and "Landed on return lines 56" (`Documents:337, 342`) while 33 and 15 rows render. Say "33 of 74 shown" or render all 74.
- Issuers paraphrased: `Documents:239, 277` "Lindqvist Studio books (QuickBooks)" vs packet "Lindqvist Studio (QuickBooks Online)"; `:275` truncates "administrator". Call 2 derives the kind label from `document_type` + `issuer`, so issuer must be verbatim.
- `Checks:165` "CA refund −$3,500" vs `Review:150` "CA balance −3,500". v3 California `balance_due` is −8,256 (a refund). Use "CA refund" (`Home:206` agrees).
- `Review:195` counts t4, a queue item already on Sign-offs (`s-ext`), as a review note: "4 open review notes" overstates by one.
- `Documents:268` flags D69 'After "upload complete"'; D69 was pulled by the firm (tl-06, actor st-01). Client uploads only (D31, D73).
- Checks actions are inert (`Checks:254` `run: noop`), no feedback; Documents shows a "(mock)" message.
- Tie-outs (`Checks:187-191`) name no verification type ("agreed to third-party record", "agreed to prior year").

## 4. What reconciles well

- Counts (probe 1): 74 docs, 70/4; 1,914 of 3,012 on a v3 line; 18 uncited, 15 in `documents_used`; step 4 of 12; 64/10/54/4 pages; 73 before acceptance; 8 client docs after tl-03; all 33 rows' totals, used, line counts, dates; D06 107 values / 106 prior-year lines.
- Checks and Review (probe 2): 11 diagnostics, 4 quoted verbatim; rules 0-5 verbatim; variance 10 % and 1,000; review levels; 89 changes; SchE.32 and F1040.37 old/new; transcript 4 x 3,000; FTB 3 x 3,500 and the 2024 hold; qa-41; extension actor st-02; what_if hvac 3,633 / 896; MTC 3,871; SEP 2,786; ledger tax effects.
- Call 1: reasons filled only from structured fields; D10's free-text note only suggests; a set reason re-stales the sign-off; Daniel cannot set reasons, his sign-off cites the self-review rule; four money pages flagged (`rv2_behaviour.js`).
- Call 2: plain kind labels, no ranking, confidence on the value (`Checks:196`); identity tie-out 4 rows / 1 mismatch / last-4 only; payment tie-out 2 mismatches, both linked, under their firm steps.
- Rules where they act: self-review on Sch3.10 in Checks (queue, action, top bar) and Review (thread, sign-off, merge note); partner threshold with "1,000 is not over 1,000"; "Open review notes block filing" on Helen's disabled button; masking rule for Marcus, Reveal and fix disabled; EIN never masked; bulk action with working undo.
- Roles: client and examiner get away states; examiner Documents limited to D72, D65, D66, D14-D21; no leak matched (harness-R, harness-H); Sam "Signed" with Example; Jo and next year read only.

## 5. Gaps

- Brief Evidence, "any document to everywhere it landed": 41 landed documents have no row.
- Brief Evidence, "record how each number was verified": only the W-2 item shows "Who checked".
- Call 1 "Considered, not used (note required)": the picker (`Documents:289`) takes no note.
- `Checks:198` (`int`) has no claim id, so the drawer cannot open; no shared claim for GT-B01.
- No attach-a-file on a check or review note (brief Evidence).

## 6. Probes run

```
$ node harness-H.js      -> failures: 0 (Documents: 1768 holes, 109 handlers per role; priya closes the step 73 of 73)
$ node harness-R.js      -> RESULT: 0 problems (Checks 14/14/16/11/4/14/away/4/away items; Review 7/4/4 tabs; marcus reveal disabled)
$ node review/rv2_behaviour.js -> all behaviour checks passed (47: gate 66/6/1, re-stale, bulk+undo, self-review, partner rule, masks, notes count, stale sign-offs)
$ python3 -I review/rv2_probe1.py "<packet>"   (trimmed)
documents 74 ev 3012 | uploaded_by client 70 firm 4 | distinct ev cited by v3 lines 1914 unused 1098
docs cited by no v3 line 18 | documents_used 71 superseded ['D30'] | in used but uncited 15
required_steps 12: 4 = All documents accounted for
tl-20 2026-07-10T20:05 8879 signed | tl-21 07-13T17:04 rejected | tl-22 07-13T19:02 D71 | tl-23 07-14 accepted
received before fed acceptance 73, after ['D72'] | client docs after upload complete (tl-03 2026-03-02) 8
D08 total 19 used 9 lines 10 | D31 159/107/24 corrected=True | D74 1826/1560/260 | D06 107, line_sources citing D06 106
pages with zero evs 64, in not_extracted 10, money-bearing unread [('D14',2),('D28',2),('D30',32),('D31',32)]
notice N-2025-L566 dated 2028-01-20 response_due 2028-02-19, 2 items | N-2023-CP2000 Resolved 2024-11-18
household theo XXX-XX-3309 | 2024 dependents Theo XXX-XX-3390 | ev-1080 D71 XXX-XX-3390
$ python3 -I review/rv2_probe2.py "<packet>"   (trimmed)
F540NR.72 = 14000 | SchC.1 = 163700 | SchE.14A = 13300 note "HVAC 11,000.00 is inside repairs" | SchB.1.1 = 1840, SchB.1.2 = 1840
F1040.26 = 13000 sources [... 'qa-41'] | Sch3.10 = 36000 sources ['timeline:extension-2026-04-14'] | F6251.2i = 40000
v2->v3 changes 89 | SchE.32 18400->26800 | F1040.37 35728->4220 | F1040.1a unchanged | trigger "Ridgeline K-1 ... 2026-06-22"
v3 summary california balance_due -8256 | diagnostics 11 (4 quoted codes/messages match verbatim)
rules 0-6 verbatim | variance 10 / 1000 | review_levels [preparer, reviewer, partner]
extension actor st-02 "Form 4868 with 36,000 and FTB 3519 with 0" | what_if hvac fed 3633 ca 896
transcript 2026-03-12 670: 4 x 3000 | ftb 2025: 3 x 3500; 2025-09-15 held as 2024 credit | qa-41 "Paid January 14, 2026 - 4,000 I think."
2024 SchE.14A 3900 | carryovers_out minimum_tax_credit 3871, sep_not_deductible 2786
$ python3 -I review/rv2_probe3.py "<packet>"   (trimmed)
D08 p1: "Form W-2 2025. Employer Corvane Systems, Inc., EIN 82-4471903 ... Box 1 104,600.00; Box 2 15,800.00; ..."
D15 p3: "... card processing (deposited gross; processing fees booked to Bank and merchant fees) and 28,800.00 by ACH."
D47 p1: "... Total 11,000.00. 10-year parts warranty. Permit #B25-31877." | D54 p1: "Seller credit for 2025 county taxes ...: 6,912.00."
D13 p1: "shares purchased 06/28/2024 ... shares transferred 150." | D65 14,500.00 | D66 4c 2,900.00 | D16-D20 received 3-7 Feb
client docs received after D47 and before upload complete: 24
$ grep -o "Theo’s SSN differs[^'\"]*" project/*.dc.html | sort | uniq -c
Checks: "...differs from the 2024 return and his card" (1) | Home x2, ClaimDrawer, Changes, Filing: "...differs from his card"
```
