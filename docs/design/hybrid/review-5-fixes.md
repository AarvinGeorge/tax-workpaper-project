# Review 5: did fix round H1 land? (Fable 5.1, Fri 16 Oct 2026 17:07 EDT by `date`)

Read-only. Probes: `review/r5_probe.js` (renders all 9 files per role with the SHELL's own asOf/label/revealLog), `review/r5_probe.py`, `review/r5_probe2.py` (packet, `python3 -I`). `<p>` = `hybrid/project`.

## Verdict
**Reconciles with one fix.** Every must-fix from reviews 1 to 4 is fixed; 11 of 12 shared decisions hold. One regression from decision 1: the shell passes a date-only `asOf`, Filing compares it against datetime strings, so three roles see an event that defines their "now" as not yet happened.

## Must-fixes from the four reviews

| Ref | Status | Evidence |
|---|---|---|
| R1-M1 F8812.4 "$1" | FIXED | `ReturnMap:119` PLAIN; probe: `F8812.4 => "1"` |
| R1-M2 SchA.12 unlinked, Home lacks noncash | FIXED | `ReturnMap:161,164` (`st:'chk', ours:1`, claim noncash, filed 17,400); `Home:171,185`; probe: sam `SchA.12 $17,400 · engine v3 20,500, adjusted` |
| R1-M3 "302 lots" | FIXED | `ReturnMap:143` "295 (282 brokerage, 12 digital asset, 1 S corporation)"; packet 302 keys = 282 + 12 + 1 + 7 totals |
| R2-M1 D71/D72 shown as received before filing | FIXED | `Documents:295-301` filters by asOf (daniel: 72 docs, `showLate false`); Checks old 17:04 text gone (grep 0); ClaimDrawer `:373-382` |
| R2-M2 blocker wording | FIXED | probe 4: every file says "differs from his 2024 return" for working roles, "differed ... and his card" for sam/next |
| R2-M3 D08 quote not verbatim | FIXED | `Checks:213` equals packet D08 p1 (`r5_probe.py`), cut marked "…" |
| R3-M1 Changes cites D71 / 3 Aug transcript at review time | FIXED | `Changes:164-167` by `cardIn`; ext-pay removed from Changes (`:114`); `Filing:302-304` by `cardIn` |
| R3-M2 examiner sees internal history | FIXED | `Filing:281` `hasHist: !isIrs`, `ClaimDrawer:467` `history: !isIrs`; case-insensitive scan (engine, adjust, v3, reason, propos, blocking/fails/mismatch, firm presented, "our") over all files and 11 claims: zero hits for irs and ngozi |
| R3-M3 heat-pump carry row loses Example | FIXED | `Filing:300` `ex: true` |
| R4-M1/M2 fed-est partner rule and count | FIXED | `Changes:176,180` `over:false`; helen gets only "Leave a review note" on fed-est; Review tag "4 changes need partner sign-off" = Changes filter 4 = Home helen Waiting for partner 4 |
| R4-M3 noncash proposed nowhere | FIXED | ids `ca-est,atlas,rsu,theo-ssn,heat-pump,fed-est,care-ein,noncash` identical in Changes, Review (8 lines), Checks sam, Home sam ("8 firm adjustments") |

## Shared decisions
1 PARTLY (below). 2, 3 (button byte-identical in Home:214, Checks:342, Review:245; list identical in Filing:234, Firm:251), 4, 5, 6, 7 (`Main:143`, `Filing:320`), 8 (D08, D15 p3, D47, D62, D66 checked verbatim), 9 (shell's 3 Example rows; Firm renders `revealLog` only, 3 rows, no duplicates), 10, 11 (no "CA balance" anywhere), 12 (Review 3 open notes = Home helen "3 review notes open"): FIXED.

## Regression (must-fix)
**`Main:226` passes `asOf` as a date; `Filing:221` compares `e.at <= now` against `'2026-06-23T06:05'` etc.** `'2026-06-23T06:05' <= '2026-06-23'` is false, so:
- working roles: "23 Jun 2026 Return computed: v3 => Later in this story (not yet happened)" under a header reading "As of 23 Jun 2026, v3";
- next: tl-28 "Next year's engagement started" not yet happened, though the shell's history says Priya opened the file that day;
- **irs: "26 Jan 2028 IRS Letter 566 received => Later in this story" and the Letter 566 section reads "Later in this story: arrives 26 Jan 2028"** (`Filing:264-265`) for the examiner holding the letter.
Fix (one line, author S): `Main:226` pass `'2026-06-23T06:05'`, `'2027-01-15T15:00'`, `'2028-01-26T15:00'` (the probed tl-17/28/29 timestamps). Every other child compares against a date or a shorter prefix (Home:151, ReturnMap:117, Checks:162, Review:144, Changes:141, ClaimDrawer:373, Documents:295), so the longer string is safe for them.

## Should-fix (new, from the fixes)
- `ClaimDrawer:360` noncash tax effect "federal +806, California +149" (Example): matches ledger GT-D03 (`04-state-deductions-integrity.md:54`), but Changes:187, Review:164, Checks:187 say "Tax effect: Example" with no number. One wording on all four (either the ledger estimate tagged Example everywhere, or none).
- `Checks:240` helen groups noncash under "Waiting for partner"; Home's same group has 4 and noncash's rule says "only if over 1,000". Group it "Not blocking".
- `Review:161` filed roles read "Authority relied on" (Example-tagged) where every other file keeps "to confirm" (decision 10).
- `Documents:85-86` late-arrival panel now unreachable for every role (`showLate` needs `cardIn && !filed`; no role has both); dead text, remove or drop.

## New facts verified against the packet
v3 computed 2026-06-23T06:05Z; tl-28 2027-01-15T15:00; tl-29 2028-01-26T15:00; D71 2026-07-13T19:02; SchA.12 20,500 = F8283 stock + vehicle; ev-1054 box 4c 2,900 (0.99); D65 "72.50 per share = 14,500.00"; 1099-NEC box 1: 38,500 / 41,200 / 27,900 / 19,800 / 14,600 (sum 142,000), 1099-K box 1a 12,400; `planning_reference_2026` dates and safe-harbor quote (`Filing:308`) verbatim; carryovers_out 63,660 / SAC-APPL 241.92 / 11,360 / 13,040 / 6,000 / 2,786 / 3,871.

## Harnesses (`node`, exit codes)
```
harness-shell.js  checks run: 3630, failures: 0   exit=0
harness-H.js      failures: 0                      exit=0
harness-R.js      RESULT: 0 problems               exit=0
harness-F.js      failures: 0                      exit=0
```
The harnesses pass because each child's standalone default is a datetime; only the shell-fed render shows the regression.

## Probe output (trimmed, `node review/r5_probe.js`)
```
== 0. Shell asOf per role
  daniel: asOf=2026-06-23 label="As of 23 Jun 2026, v3" stage=Review
  sam: asOf=2027-01-15 label="Filed" stage=Filed | next: asOf=2027-01-15 | irs: asOf=2028-01-26 label="Filed"
  ngozi: label="As of 23 Jun 2026" version="Draft, being prepared by your tax team"
== 1. Leak scan (irs, ngozi), case-insensitive: no hits
  Filing/irs names x6 e.g. "Sign-offs Prepared by Priya Raman; reviewed by Daniel Ortiz; signed by Helen Strand. Example"
== 2. Filing timeline under the shell asOf
  daniel: 14 Apr Extension => Happened | 23 Jun Return computed: v3 => Later in this story (not yet happened) | ...
  sam: ... 4 Jan 2027 Selected for quality review => Happened | 15 Jan 2027 Next year's engagement => Later in this story
  irs: 10 Jul 2026 => Happened | 14 Jul 2026 => Happened | 26 Jan 2028 IRS Letter 566 received => Later in this story (not yet happened)
     letter: Later in this story: arrives 26 Jan 2028 | hist shown: false,false
  string compare: "2026-06-23T06:05" <= "2026-06-23" is false
== 3. Adjustments
  Changes (priya) ids: ca-est,atlas,rsu,theo-ssn,heat-pump,fed-est,care-ein,noncash | All=8 | Need partner sign-off=4 | Judgment calls=1 | Blocking filing=4
  Changes helen acts: ca-est[Partner sign-off/...] atlas[...] rsu[...] theo-ssn[Leave a review note] heat-pump[Partner sign-off/...] fed-est[Leave a review note] care-ein[...] noncash[Leave a review note]
  Review tags: 4 blockers / 3 open review notes (Example) / 4 changes need partner sign-off | Review sam: changes 8
  Checks sam adj ids: atlas,ca-est,rsu,theo-ssn,heat-pump,fed-est,care-ein,noncash | chips: 8 firm adjustments, Signed (Example)
  Checks helen groups: ... heat-pump@Waiting for partner noncash@Waiting for partner ...
  Home sam: 8 firm adjustments [...8 rows] | Home helen: Waiting for partner=4, Blockers=4 | approve: "Approve and send to client: blocked by “California estimates include a 2024 payment”, and 3 more" | reason: ... 3 review notes open
  ReturnMap daniel F8812.4 => "1" claim false | SchA 1 open check of ours | SchA.12 claim true $20,500 | F8949 295
  ReturnMap sam SchA.12 $17,400 note " · engine v3 20,500, adjusted by the firm" tword Adjusted ex true | F1040.33 " · v3, not recomputed"
== 4. Theo wording: working roles "differs from his 2024 return" (Home, Checks, Changes, Filing, ClaimDrawer, jo); sam/next "differed from his 2024 return and his card"
== 5. /CA balance/ 0 hits; /302 lots/ 0; "none of our changes applied yet" in ReturnMap, Changes, Filing, Firm for working roles only; Firm jo log rows: 3 (all Example, distinct)
  Documents daniel "72 documents received · 1,914 of 3,011 values" gate 66/72 showLate false | sam 73 | ngozi clientTotal 69, first row Ridgeline state supplement
  Drawer noncash helen: effect "Not in the packet; an estimate at v3 rates is federal +806, California +149." ex true | irs: S.history false
  Drawer fed-est helen acts: Leave a review note/Send back | rule "Partner sign-off not required for this item: tax effect not over 1,000."
```
