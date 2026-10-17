# Review 4: the whole hybrid against the brief, the ledger and the frame

Reviewer: Fable 5.1. Scope: coverage, ledger surfacing, frame coherence. Per-screen facts are reviews 1-3.
Paths below are under `<scratch>/hybrid/project/`; `brief` = `<repo>/docs/brief.txt`; `GT README` = `<repo>/docs/ground-truth/README.md`.

## 1. Verdict

**Reconciles with fixes.** The frame holds and the brief's core (evidence, checks that distrust the engine, change log, roles, filing freeze, firm standards) is carried with consistent wording. Three cross-file contradictions are must-fix. Eleven of 27 ledger entries are absent and the frame has no screen for half of the brief's "Records a CPA expects"; the build must plan for both.

## 2. Must-fix

1. **fed-est partner rule contradicts itself across files.** `Review.dc.html:160-161,181` says `over:false`, "1,000 is not over 1,000: reviewer sign-off is enough"; `ClaimDrawer.dc.html:305` agrees (`partner:false`); `Changes.dc.html:170,174` says `over:true`, "Required: 1,000 of payments plus about 17 of penalty is over 1,000." and gives Helen a "Partner sign-off" button. Probe: `probe4-consistency.js` lines 1-3 of output. Fix: pick one (the drawer's reading, effect = payments 1,000, penalty separate, is the README-consistent one unless the penalty is a computed tax effect) and copy it to all three.
2. **Partner-sign-off count differs.** `Review.dc.html:247` "4 changes need partner sign-off"; `Changes.dc.html:191` filter "Need partner sign-off" = 5 (probe output lines 4-5). Same root cause as item 1.
3. **GT-D03 (donated car) is "adjusted by the firm" in Filing but proposed nowhere.** `Filing.dc.html:265-270` shows to pre-filing staff "Engine v3: 20,500; adjusted by the firm to 17,400"; `ClaimDrawer.dc.html:350-365` carries the `noncash` claim; but Checks, Review, Changes and the Return map never mention it (probe lines 6-13: Checks/Review/Changes/ReturnMap false; `ReturnMap.dc.html:156` SchA.12 is a plain 20,500 with no claim; `Checks.dc.html:310` Sam sees "4 firm adjustments"). The filed record contains an adjustment the workpaper never logged. Fix: add `noncash` to Checks (Not blocking), Review CH, Changes data, and link `ReturnMap` SchA.12 to it; Sam's chip becomes 5.

## 3. Should-fix

- `Main.dc.html:48` hard-codes "Stage Review" for every role, including Sam, next year and the examiner whose version string says "As filed" (probe lines 14-19).
- View log duplicates: the shell's three Example reveals (`Main.dc.html:122-126`) plus Firm's own three (`Firm.dc.html:229-233`) give six rows, with Priya revealing Theo's SSN on both 24 Jun and 14 Jul (probe line 21). Keep one list, in the shell.
- `Home.dc.html:222` tells Sam step 1 is "Not done" while the same screen's step list says "No record" (probe lines 24-25).
- Review's "Changes against v3" tab (`Review.dc.html:62-77`) and the Changes screen list the same seven proposals with the same fields; the Checks peek repeats the drawer's excerpt. Two homes for one job is how items 1-3 happened. Make Review's tab a summary linking to Changes; let the peek show the check and the drawer own the excerpt.
- "Compare versions" and "what-ifs" (brief 34-35) have no action anywhere; `what_if` is cited text only. Changes is the home: an engine-version tab (v1 to v3, 63 and 89 line changes already in `Main.dc.html:191`) and a "Try what-if" that writes an unapplied entry.

## 4. What reconciles well

- One claim id set across all nine files (`ca-est atlas rsu theo-ssn heat-pump ext-pay fed-est repairs care-ein iso-lot`); blocker wording "California estimates include a 2024 payment, and 3 more" identical in Home, Checks, Review, Filing, Firm; version strings identical; 12 steps and 5 verification types everywhere (`Home.dc.html:178`, `Firm.dc.html:196-198`, drawer `checked`).
- Roles change content and permissions, never layout: every screen renders inside the same three panes; the only "away" panels are for ngozi and irs on screens the shell never offers them (probe line 29), so no role sees a different frame.
- Examiner sees two Letter 566 items with finalized values and nothing else (`ClaimDrawer.dc.html:385`, `Filing.dc.html:218`, `Documents.dc.html:383-397`); client text is plain everywhere; Marcus cannot reveal (`Main.dc.html:168`); EINs unmasked (`care-ein`).
- Masking tightened from the starter rule is shown as a deliberate, versioned change (`Firm.dc.html:205-214`), which the README permits.

## 5. Gaps

### 5a. Coverage matrix (brief → screen)

| Brief requirement (line) | Where | Status |
|---|---|---|
| Bar: 20-year CPA faster, new hire day one (14-15) | frame, role banner `Main.dc.html:66-69` | covered as design intent |
| Trace any number to exact source (18) | drawer page+field `ClaimDrawer.dc.html:87-95`; map `ReturnMap.dc.html:80` | covered (10 claims; 24 lines plain) |
| Document to everywhere it landed or why not (18-19) | `Documents.dc.html:51,131-134,313` | covered (33 of 74 rows shown) |
| How each number was verified (19) | drawer `checked` `ClaimDrawer.dc.html:139-147` | covered, Example |
| Link related items across return, years, related returns (20) | drawer `links` (heat-pump↔repairs, ext-pay↔fed-est); prior year in `repairs.others` | partly: no link to a related return (K-1, S corp) |
| Attach any file, message or note as evidence (20-21) | client Upload only `Documents.dc.html:177` | missing for staff (grep "Attach": none) |
| Show how any number was built (22) | drawer `built` `ClaimDrawer.dc.html:126-128` | covered for claims only |
| Reconcile figures that should agree (22) | Checks tie-outs `Checks.dc.html:180-191` | covered |
| Large detail without swamping (23) | `ReturnMap.dc.html:135` "302 lots" plain; `Documents.dc.html:287` D74 | missing: no detail view |
| Books to taxable income (24) | `atlas.built` text only | partly |
| Split income between states (24) | `Documents.dc.html:248` D73 hint | missing (GT-A02 absent) |
| Checks that don't trust the engine (24-25) | `Checks.dc.html:182` | covered |
| Simulated source documents, replaceable (28-32) | `ClaimDrawer.dc.html:91-93` | covered |
| Adjust without losing original: who, why, effect (33) | `Changes.dc.html:142-185` | covered |
| Changes live; since I last looked (33-34) | `Home.dc.html:197`, `Checks.dc.html:228`, `Review.dc.html:199` | covered, Example |
| Compare versions (34) | `Review.dc.html:75` sentence | missing |
| Try what-ifs (34) | citations only | missing |
| Many at once, with undo (34-35) | `Checks.dc.html:300-306,349`, `Changes.dc.html:270-274` | covered |
| Flag swings from last year (36) | `repairs` | covered (one swing) |
| Judgment calls, elections, due diligence, penalties (36-37) | heat-pump; 8867 engine row; penalty text `Changes.dc.html:170` | partly: no election or penalty record |
| Completeness: documents, areas, outside filings (37-38) | Documents gate; FBAR/1099-NEC "outside" `Filing.dc.html:308-311` | partly: "every area considered" has no list |
| Questions to client/colleagues become evidence (39) | "Ask the client" mock; qa-41 as source | partly: colleagues absent |
| Review notes block filing (39-40) | `Review.dc.html:79-99` | covered |
| Sign-offs reopen when signed thing changes (40) | `Review.dc.html:216-238`, `Documents.dc.html:355` | covered |
| Enforced roles (40) | shell + per-role `acts` | covered |
| Several people at once (41) | none | missing |
| Assignments, deadlines, notifications (41) | Owner column; Firm status | partly: no notifications |
| Client approval and e-file signature (41-42) | `Filing.dc.html:234-243` | covered |
| Extensions, filing, rejections, client's copy (43) | timeline `Filing.dc.html:203-216` | covered; client copy promised only (`:248`) |
| Freeze at filing; amend on top (43-44) | `Filing.dc.html:251-257` | covered; amend is text |
| Answer a notice self-contained (44) | letter items + export | covered |
| Carry forward with history; plan next year (44-45) | `Filing.dc.html:289-304`, next role | covered |
| Firm standards; view logs; time vs budget; status (46-47) | `Firm.dc.html` | covered |
| Search (47) | none (grep "search": none) | missing |
| Records a CPA expects (48-53) | document index, payments, carryovers, deductions lines | missing: area summaries, depreciation by asset, sales detail, books-to-tax, rentals/passive, K-1 lines, retirement/foreign, state split, basis by year, prior preparer vs us |
| Roles list (7-9) | 9 options `Main.dc.html:54-62` | covered |
| Load packet as delivered; saving; role switcher (70-71) | hard-coded data; static "Saved" `Main.dc.html:49`; switcher | switcher covered; load and save are build items |

### 5b. Ledger matrix (27 entries)

Surfaced by our own check: **A01** rsu, **A03** ca-est, **A04** fed-est, **A05** theo-ssn, **A07** care-ein, **C01** atlas, **C05** heat-pump, **B01** Checks `int` (`Checks.dc.html:198`, no claim id, no drawer), **B04** Documents flagged page `:368` plus engine row, **D03** drawer/Filing only (must-fix 3).
Engine diagnostic only, not our check: **B03** C6 basis (`Home.dc.html:172`; msg-07 later news not surfaced), **C08** and **C10** HOME_OFFICE_AREA_CHANGE (`ReturnMap.dc.html:169`), **C07** SEP shown as carry-forward, not as an excise mistake (`Checks.dc.html:218`).
Hint only: **A02** D73 "supports the California wage split" (`Documents.dc.html:248`), **D02** D54 "seller tax credit to test" (`:244`).
Absent (grep: no hit): **A06/C03** health insurance, **A08** Bright Oak, **B02** Swedish FX, **B05/C09** Form 3520, **C02** mileage, **C04** phone/Spotify, **C06** §179, **D01** Lonestar, **D04** Oregon, **D05** excess SS, **D06** Schedule CA trace gap.
Does the frame have a home for the rest? Checks (queue row + peek) and the drawer fit any of them mechanically. But the GT README patterns they belong to, state split (A02, D04), Schedule C expenses (C02, C04, A06), depreciation elections (C06), itemized deductions (D01, D02), penalty (D05), prior-preparer carry-in (B05/C09, C10), trace gaps (D06), are area-level, and the frame's only area view is a forms-and-lines map. Without an area/records screen they will land as 27 flat inbox rows.

## 6. What the founder may be missing

1. **The frame has no "Records" screen.** Nine of the brief's listed records and 11 ledger items share the same gap. Recommendation: give Return map an "Areas" grouping (the packet's budget areas in `Firm.dc.html:238` are already the list), each area a summary with its own checks, swings and prior-year column; forms-and-lines becomes a view inside it.
2. **Carry-in has no home; carry-out does.** "What the prior preparer did vs what we changed" (brief 52-53) and GT-B05/C09, C10 need a prior-preparer panel, probably on Filing and after or the new Areas screen.
3. **Four screens copy the same facts by hand** (Home, Checks, Review, Changes), and the copies already disagree (must-fix 1-3). In the build, one claim store feeding every screen is not optional.
4. Search, notifications, several-people presence, attach-as-evidence and what-ifs are unplaced; the chat slot is the only candidate for the first two. Decide now whether they ship in the core or are declared out of scope in the one-pager.

## 7. Probes run

- `node <scratch>/hybrid/harness-shell.js`, `harness-H.js`, `harness-R.js`, `harness-F.js`: all pass (1764 checks / 0, 0, 0 problems, 0 failures).
- `node <scratch>/hybrid/review/probe4-consistency.js` (output in `probe4-out.txt`); key lines quoted above.
- `grep -il` over `project/*.dc.html` for each ledger signature and brief verb (health insur, Bright Oak, Swedish, 3520, mileage, Spotify, 179, Lonestar, Oregon, excess social, SchCA, search, attach, what-if, amend, notif, compare); zeros proven able to be non-zero (SEP=2 in Checks, "Export response pack"=1 in Filing and ClaimDrawer, ">Undo<"=1 in Checks and Changes). The probe's action-label grabber under-reports Export/Undo; the direct grep is the authority.
