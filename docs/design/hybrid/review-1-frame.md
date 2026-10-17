# Review 1: the frame (Main, ClaimDrawer, Home, ReturnMap)

Reviewer: Fable 5.1, 16 Oct 2026 16:48-16:57 EDT. Read-only; probes in this folder.

## 1. Verdict
**Reconciles with fixes.** Every packet fact checked on these four screens matches the packet (probe 1, 419 lines). Three wrong facts remain, all on the Return map; the rest are wording and gaps.

## 2. Must-fix
1. **`ReturnMap.dc.html:143` with `:177-182`: a count rendered as money.** "Qualifying children under 17", `F8812.4`, value `'1'` goes through `fmt`, which prefixes `$` to any digit string: rendered **"$1"** for every role (probe 2). Packet: `F8812.4` = 1, rule R-DEPENDENTS. Fix: a per-line plain flag (or format only packet `value_type` money).
2. **`ReturnMap.dc.html:153-157` vs `ClaimDrawer.dc.html:350-365` and `Filing.dc.html:265`: the filed record contradicts itself.** The drawer carries `noncash` (Check failed, ledger GT-D03) with filed value $17,400 and Filing shows 17,400 for the Letter 566 item, but the map leaves `SchA.12` unlinked ("$20,500", SchA "0 open checks of ours") and for Sam and next year prints "**$20,500 · As filed · No adjustments**" (probe 2). `Home.dc.html:154-175` also omits `noncash` from Priya's fix list, so no pre-filing screen in this part raises the mistake the filed record shows as adjusted. Fix: `['Gifts other than by cash or check','SchA.12','20,500','noncash','17,400']`, SchA `st:'chk', ours:1`; add `noncash` to Home's `C` and `fixList`.
3. **`ReturnMap.dc.html:135` "302 lots".** v3's 302 `F8949` lines = 282 brokerage lots + 12 digital-asset dispositions + 1 S-corporation line + 7 box totals (probe 4; diagnostic QUESTIONNAIRE_SALES_CONFLICT says "282 brokerage sales and 12 digital asset dispositions"). Fix: "295 sale lines (282 brokerage, 12 digital asset, 1 S corporation)".

## 3. Should-fix
4. `Main.dc.html:48`: Stage is hard-coded "Review", so Sam, next year and the examiner read "Stage Review" beside "Filed snapshot, read only" (`:50`) and version "As filed". README `where_now_is` makes the post-v3 timeline a filed return; FIX-ROUND-1 item 2 predates the after-filing roles. Show "Filed" with an Example tag for `R.after`.
5. `Main.dc.html:141`: the client's "Draft 3, none of our changes applied yet" is internal wording (FIX-ROUND-1 item 6; decisions.md:51 says "Draft 3"). "Draft 3, being checked by your tax team".
6. `Home.dc.html:203`: Helen's reason "Open review notes block filing (4 open)": the four are blockers, not notes, and `Review.dc.html:80` says "The packet holds no review work". Say "4 blockers open".
7. `ReturnMap.dc.html:124-126,219`: filed view shows F1040.26 = 12,000 but Total payments 77,742 and Amount you owe 4,220 stay at v3. README `engine_and_recomputing`: payments move balance due 1:1, so these are computable (76,742 / 5,220 before other fixes); at least tag those totals "v3, not recomputed" on the line.
8. `ReturnMap.dc.html:220` "Two more are not tied to a form line": 7 shown + 2 named = 9 of 11; AOTC_PHASED_OUT (F8863.7) and FBAR_OUTSIDE_RETURN (F8938.1.max) sit on forms not drawn. Name all four.
9. `Home.dc.html:255`: next year's "heat pump: depreciate over 27.5 years" is untagged, though the decision is Example in `ClaimDrawer.dc.html:275` and `Home.dc.html:219`. Add `ex:true`.
10. `ClaimDrawer.dc.html:89-93`: the anchor is doc · page · field · ev id, without the README's `position` box (`no_page_images`). "A real page image can replace it without changing the link" is stronger if the link visibly carries the box (ev-1076: x0 0.09, y0 0.637).
11. Dates are UTC (tl-15 `2026-06-05T00:41Z` shown "5 Jun", `Main.dc.html:192`; 4 Jun in Austin). Consistent with Documents; note the convention once.

## 4. What reconciles well
- Switcher: 9 literal options in FIX-ROUND-3 order, default `daniel`, `value="{{role}}"` (`Main.dc.html:53-63`; harness-shell 1764 checks, 0 failures). Hidden screens refused (`:164,178`).
- Masking per call 4: last 4 always, Marcus refused in the shell (`Main.dc.html:168`), one reveal per identifier per session, log row never holds a digit (`:171`), client and examiner reveals logged, Jo's history shows live rows untagged and seed rows Example (`:197`). EIN unmasked (`ClaimDrawer.dc.html:329`).
- Kind of source and read confidence kept apart as call 2 asked: plain nouns, no trust word, "Pipeline read ... how surely the text was read, not how far to trust the source" (`ClaimDrawer.dc.html:80-83`); typed answers say "No read".
- Rules quoted verbatim from `starter_standards.rules[0,1,2,5]` where they act (`Main.dc.html:132`, `ClaimDrawer.dc.html:195-198`); 12 steps verbatim, none marked done without packet evidence (`Home.dc.html:178-185`); all five verification types; variance wording "over 10% and over 1,000".
- Examiner scope = notices N-2025-L566, finalized values Example-tagged, no verdict words (`ClaimDrawer.dc.html:385,445-456`; `Main.dc.html:173,179`).
- Probe 1 confirms every map value, 34 forms / 627 lines / 11 diagnostics, 89 and 63 changes, MTC 3,722 → 3,700 → 3,871, the printed pages (D68, D15 p3, D28 p3, D11 p2, D06, D71, D47, D46, D62, D12, D66, D21, D65), confidences, `what_if.hvac_improvement` +3,633 / +896, the 3 Aug 2026 transcript's 36,000, R0000-504-02, D02 use-only consent, msg-04 to msg-08 in the client's history, `planning_reference_2026` wording. Home's "6 need a person's reason, 1 suggestion" agrees with `Documents.dc.html:237-249` and call-1.

## 5. Gaps (levels 1-3 ask; this part does not carry)
- Brief "Attach any file, message or note as evidence": no attach action in the drawer.
- Brief "status and search": no search in the shell.
- Brief "Assignments, deadlines, notifications": no assignee on queue rows though `firm.assignment_at_start` names st-01/02/03; 3 of 6 `firm.deadlines` shown.
- `bank-refund` and `ip-pin-ngozi` are declared (`Main.dc.html:165`) but the drawer's `IDS` knows only Theo and Ada (`ClaimDrawer.dc.html:203-206`); the examiner never gets a Reveal control (`:390`) although decisions.md:78 logs examiner reveals.
- "Since you last looked" is a static Example section; the shell keeps no last-seen state.

## 6. Probes run
```
$ node harness-shell.js            -> checks run: 1764, failures: 0 (235 drawer renders, 122 shell renders)
$ node harness-H.js / -R.js / -F.js -> failures: 0 / 0 problems / 0
$ python3 -I review/probe1-frame.py "<packet>" > review/probe1-out.txt   (419 lines: firm, standards, timeline, v3 lines, rules, ev ids, printed pages, client, agency, what_if, prior year)
  F8812.4 => value 1 rule R-DEPENDENTS sources ['household:theo']
  SchA.12 => 20500 inputs [F8283.A1.stock, F8283.A1.vehicle]; F8283.A1.vehicle 6000 sources [qa-39, ev-1055]
  v3 lines 627 diag 11 changes 89; v2 changes 63; forms 34
  transcript as_of 2026-08-03: 2026-04-14 code 670 "Payment with extension (Form 4868)" 36000
  notices N-2025-L566 items: Schedule A line 12 (Form 8283); Schedule C gross receipts vs 1099-NEC 142,000 and 1099-K 12,400
$ node review/probe2-map.js
  ReturnMap daniel | F8812.4 | "$1" | claim:false
  ReturnMap sam    | SchA.12 | "$20,500" | claim:false | tword: As filed | checks: No adjustments
  Home helen | approve reason: Firm rule: Open review notes block filing (4 open)
$ python3 -I review/probe3-misc.py "<packet>"
  planning_reference_2026: "No California residency in 2026: ... (the Sacramento rental, Ridgeline's California share)"; D38: California 22%
$ python3 -I review/probe4-lots.py "<packet>"
  F8949 lines 302 lot-shaped 282 other 20 [C1..C12, F.SCORP, 7 x .total]; D65 "high/low average 72.50 per share = 14,500.00"
```
