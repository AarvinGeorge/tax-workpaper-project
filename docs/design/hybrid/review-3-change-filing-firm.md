# Review 3: Changes, Filing and after, Firm

Reviewer: Fable 5.1, independent of the Opus authors. Fri 16 Oct 2026 16:55 EDT (`date`). Read-only; probes in this folder.
`<p>` = `<scratch>/hybrid/project`.

## 1. Verdict

**Reconciles with fixes.** Every number, date, id, quote and rule checked against the packet matches (probes 1 and 2: about 60 facts, zero mismatches). Three must-fixes: evidence cited before it exists in the replayed timeline (cross-file), and internal history shown to the IRS examiner.

## 2. Must-fix

**M1. Changes cites evidence that has not arrived yet for the review roles.** `<p>/Changes.dc.html:160-161` (theo-ssn, "Proposed 2 Jul 2026") relies on "D71 Social Security card: both end 3390"; `:183` (ext-pay) on "The IRS transcript of 3 Aug 2026 shows 36,000". Packet: D71 `received_at` 2026-07-13T19:02 (tl-22); the second transcript is `as_of` 2026-08-03 and the first (2026-03-12) has no 36,000 (probe 1). Filing's clock for review roles is 2026-07-02 (`Filing.dc.html:199-200`) and it marks tl-22 "Scripted" (harness: `priya ... timeline HHSSSSSSSSSS`). So the same Priya sees D71 as not yet happened on Filing and as evidence on Changes. `docs/decisions.md` (16 Oct) records exactly this correction: before filing the right number is on D06; the card comes after the rejection. Fix: non-`filed` branch cites D06 (ev-0012) and the 14 Apr timeline event only; `filed` branch adds D71 and the 3 Aug transcript. Same anachronism at `Filing.dc.html:298-299` (carry row "caused the July rejection ... D71"). Cross-file: Home:158, Review:159, Checks:186/234, ClaimDrawer:258/262, Documents:86/355 also treat D71 as in the file at review time (grep). One "now" for the shell; Filing's (before tl-20) keeps the "flagged before filing" story.

**M2. The examiner is shown the firm's internal history.** `<p>/Filing.dc.html:269, 275` ("History: Engine v3: 20,500; adjusted by the firm to 17,400, reason: ...", "Engine v3: 163,700; adjusted ...") render for `irs` (r3_leak.js: `Filing/irs /engine/i x2, /adjust/i x3, /v3/i x2`). The harness's examiner leak rule `/\bengine\b/` (`harness-F.js:80`) is case-sensitive and misses "Engine". FIX-ROUND-2 item 5 (kept by the hybrid brief) says Sam sees the full internal history "unlike the IRS examiner"; a response pack never says "our software first computed 20,500". Fix: for `isIrs` show support only ("17,400 = 14,500 (D65) + 2,900 (D66 box 4c)") and reword `:256` ("each adjustment and its history"). ClaimDrawer `f.history` for `noncash` and `atlas` (`:363, :234`) carries the same text under `irs: true`; for author S.

**M3.** `Filing.dc.html:296-297`: the heat-pump carry row drops its Example tag when `filed`, yet the capitalisation is Example work in every view (the packet holds no firm work; the Letter 566 "As filed" values keep their tag at `:122`). Make `ex: true` unconditional.

## 3. Should-fix

- `Filing.dc.html:128`: the Letter-item History row lacks the Example tag the value (`:122`) and sign-offs (`:129`) carry.
- `Changes.dc.html:166`: "Treas. Reg. 1.263(a)-3" is the firm's recorded authority (ledger GT-C05 says only "the IRS repair rules"); Example work like the "who" line. Tag it.
- `Firm.dc.html:246-260`: File status omits the packet's sixth deadline, Forms 1099-NEC 2026-02-02 (probe 1 `deadlines`); Filing cites it (`:309`). Add the row.
- `Firm.dc.html:214`: "Version 1, Superseded" is an invented event; tag Example like Version 2.
- `Filing.dc.html:314` and `Main.dc.html:141`: the client's "Draft 3, none of our changes applied yet" is internal phrasing for Ngozi; shell wording, for author S.
- `Changes.dc.html:62` says "at v3 rates", but heat-pump uses the engine what-if; say "or the engine's what-if where one exists".

## 4. What reconciles well

- Facts (probes 1, 2): F540NR.72 14,000 and the 15 Sep 2025 tax-year-2024 payment; SchC.1 163,700 to 151,300 (1099-NEC sum 142,000 + "9,300 from 11 small clients", D15 p3); RSU basis 19,100/19,100/9,420, −15,536 / −2,765 recomputed from v3 rates; heat pump +3,633/+896 = `what_if.hvac_improvement`; F1040.26 13,000 vs four 670 payments of 3,000; D62 vs ev-1045; extension 35,728 to 36,000; every timeline date, actor and quote; Letter 566 items verbatim, 17,400 = 14,500 + 2,900 against v3 SchA.12 20,500; carryovers_out; diagnostics verbatim; retention 14 Jul 2033 under rule 6.
- README `where_now_is`: filed roles read "As filed: the return as this workpaper finalized it" (`Filing:314`, `Changes:257`), the same string across the other files (grep).
- Firm: 12 steps, 5 verification types, 7 rules, variance and review levels copied exactly; rule 5 shown as a tightening beside the starter wording with the admin-change note (call 4); view log never holds a value; Marcus "Not cleared" with the packet note; budget 22.0 h, "Used" tagged Example, zero recorded time proven (key search finds only `budget_hours`).
- Call 5 as accepted: ISO lot 1,000 / 12,000 / 52,000 linked to MTC 3,871 with its 3,722/3,700/3,871 history, qualifying date 30 Jul 2026, qa-06 trace gap; California AMT under "Diagnostics resolved" as an open engine warning.
- Roles: harness-F 0 failures; client sees no names, ids or rules; examiner sees only the two items, the 8879/acceptance/letter dates and Export; "Prepared by / reviewed by / signed by" lines carry Example (`Filing:129`, `Changes:100-102`); Daniel's sign-off on the 36,000 disabled with the rule quoted; EINs unmasked.

## 5. Gaps

- Brief, Change: no control for "what changed since I last looked", "compare versions" or "try what-ifs" (the packet has five `what_if.alternatives`).
- Brief, Filing: "amend on top" is described (`Filing:256`) but no role can start one; give `next` (Priya, tl-28) a mock "Start an amendment on top".
- Brief, Filing: "the client's copy" never exists, since Ngozi's clock is review-time.
- Brief, "plan next year": `planning_reference_2026` due dates and the 110% safe harbor are not on the carry-forward list.
- Brief, Firm: "search" absent (shell-level if anywhere).

## 6. Probes run

```
$ node hybrid/harness-F.js                      -> failures: 0 (all 9 roles, 3 files)
$ python3 -I review/r3_probe1.py "<packet>"     -> lines, rates, what_if, carryovers, diagnostics, timeline, efile, notices,
                                                   ftb/irs records, firm.*, planning ref, documents, page text, qa/call/msg
$ python3 -I review/r3_probe2.py "<packet>"     -> D26/D37/D38/D71 dates, v3 trigger, 1099-NEC sum 142,000, D15 "9,300",
                                                   F2441.12 5,000, ev-0498 text_as_read '' (basis blank), D71 ends 3390, household 3309
$ node review/r3_leak.js                        -> Filing/irs /engine/i x2, /adjust/i x3, /v3/i x2; Filing/ngozi "changes applied" x1
$ grep "D71\|3 Aug 2026" project/*.dc.html      -> Home:158 Review:159 Checks:186,234 ClaimDrawer:258,262,293 Documents:86,355
```
Trimmed output: `F540NR.72 14000 note ... 2025-09-15 3,500.00`; `ftb tax_year_2024_payments_after_filing 2025-09-15 3500 "designated tax year 2024"`; `SchC.1 163700`; `SchA.12 20500`; `F8283.A1.vehicle 6000 src qa-39, ev-1055`; `hvac_improvement fed total_tax_change 3633, ca 896`; `extension estimated_balance 35728 paid_with_form_4868 36000`; `transcript as_of 2026-03-12 [4 x 670 3000]`, `as_of 2026-08-03 [... 2026-04-14 670 36000 ...]`; `efile ... 71530420261950019871 accepted, 71530420261950019872 accepted`; `notices N-2025-L566 dated 2028-01-20 response_due 2028-02-19 items [...]`; `rule 6 Records are retained 7 years after filing, then destroyed.`; `st-06 Sam Adeyemi active_from 2027-01-04`; `deadlines[5] Forms 1099-NEC ... 2026-02-02`; `hours/time keys in packet: ['budget_hours']`; `D71 received 2026-07-13T19:02 p1 "... XXX-XX-3390."`.
