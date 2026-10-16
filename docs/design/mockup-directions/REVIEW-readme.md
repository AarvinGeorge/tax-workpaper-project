# Re-review after fix rounds 1 and 2: conformance to ground truth

Reviewer: Fable 5.1 (independent of the Opus authors). Date: Fri 16 Oct 2026, 13:07 EDT (`date`).
Files reviewed, not edited: `scratchpad/mock/project/Main.dc.html` (A, 430 lines), `Inbox.dc.html` (B, 305), `PullRequest.dc.html` (C, 443), all modified 13:06 EDT.
Ground truth in the order given: (1) `docs/brief.txt`, (2) the packet and its README (`docs/packet/readme-verbatim.md`) with `firm.starter_standards`, (3) `docs/ground-truth/README.md`. Shared rules: `FIX-ROUND-1.md`, `FIX-ROUND-2.md`.

## How I tested

| Probe | What | Result |
|---|---|---|
| `review-probe/harness2.js` (9 roles) | extracted each class, stubbed `DCLogic`, ran `renderVals()` for priya, marcus, daniel, helen, ngozi, jo, next, irs, sam; rendered the template (dotted holes, `sc-if`, `sc-for`, hidden elements stripped); called every handler and re-rendered; leak scans on the client and examiner renders | A: 0 undefined holes, 0 handler errors. **B: 3 undefined holes** (below). C: 0 / 0. Logs: `review-probe/<file>.r2.log`, renders in `<file>.r2.out.json` |
| `node --check` on the extracted class bodies | parse | all three parse |
| `facts.py`, `facts2.py`, `facts3.py`, `facts4.py` (`python3 -I … "<packet>"`) | every fact the screens show, read from the packet | section 2 |
| grep | em dashes, `<option>` literal count, `selected=`, modal, side stripes, `tabindex`, `checked` without `onChange` | 0 em dashes; 9 literal options in each file; no `selected=`; no modal; no coloured side stripes; B now uses `tabIndex` and `onChange` |

No browser render (no `support.js` in the mock folder), as before.

Severity: **must-fix** (breaks ground truth or a hard rule: leak, wrong fact, contradiction with the packet), **should-fix** (truth-rule gap or an unfair difference between directions), **note**.

---

## 1. README instructions that bear on these screens

| README / standards item | A Main | B Inbox | C PullRequest |
|---|---|---|---|
| `where_now_is`: v3 is current; post-v3 amounts mean the return as the workpaper finalizes it | Examiner and Sam show "As filed: the return as this workpaper finalized it", values 151,300 and 17,400 with Example tags, history "Engine v3: 163,700; adjusted by the firm…" ✓. **note**: next-year version string "2025 as filed · 2026 plan open" (:317) has no Example tag and not the agreed label. | ✓ examiner, Sam and next-year all carry the label with an Example tag (:48 `versionExCls`) | Examiner and Sam ✓. **should-fix, :415**: next-year `versionLine` is "v3, none of our changes applied yet" while the same view's steps panel says "1 of 12 steps with evidence in the file" and step 12 "Done: Form 8879 and FTB 8879 signed 10 Jul 2026" (`post` includes `next`, :380). One view, two moments. Probe: `texts.next` in `PullRequest.r2.out.json` contains both strings. |
| `truth_and_mistakes`: printed_content is what is printed; extracted_values can be wrong | Document panes show printed text ✓; ca-est: "The pipeline read the year correctly" (ev-1076 = 2024 ✓); rsu: "basis read as 0 at 98% confidence" (ev-0498: value 0.0, text_as_read "", confidence 0.98 ✓) | printed text ✓; no confidence shown (fine) | printed text ✓ |
| `no_page_images`: no images; positions synthetic | A :145 "Simulated from the packet; a real PDF page drops in here unchanged" ✓ (staff only now) | nothing claims an image ✓ | ✓ |
| `engine_and_recomputing`: tax effects only from `tax_effect_rates` or `what_if` | CA refund −3,500 (payments 1:1 ✓); Fed −4,402 = 12,400 × 0.355 (v3 `schc_profit`) ✓; RSU −15,536 = 38,200 × 0.348 + 9,420 × 0.238 = 15,535.6 ✓; heat pump +3,633 / +896 = `what_if.hvac_improvement` ✓ and the text says so; engine diagnostic "effect: not computed" ✓ honest | same figures ✓; Northlake −640 = 1,840 × 0.348 ✓ | same figures ✓ |
| `sections.firm`: starter_standards "a starting point you may change" | Jo: "Edit firm standards" ✓ (:316) | ✓ (:241) | ✓ (:326) |
| `verification_types` (five, exact) | "Agreed to source document", "Recalculated", "Confirmed with client", "agreed to third-party record", "agreed to prior year" ✓ (:170, :176, :186, :191, :198, :205, :217, :222) | ✓ (:148, :149, :185-188) | ✓ (:372, :376) |
| `required_steps` (12, exact strings) | `stepNames` :398 identical to the packet list ✓; "0 of 12 steps done" for staff, "1 of 12 steps with evidence in the file" for the filed views, step 12 evidenced by Forms 8879 10 Jul ✓; step 1 "D02 covers use, not disclosure" ✓ (D02 printed_content: consent "to use tax return information to prepare the return and to offer tax planning"; ledger reconciliation item 10) | `stepNames` :268 identical ✓; same counts ✓; step 1 and step 8 notes ✓ | `STEPS` :381 identical ✓; same counts ✓; per-step reasons cite D68, Form 8867, 11 diagnostics ✓ |
| `variance_review` (over 10% and over 1,000 vs prior year) | wages: 212,400 vs 156,039 (+36%) flagged in those words, explained by qa-03 ✓; repairs 3,900 → 13,300 flagged ✓ | **note**: B shows no variance anywhere (rule 8 says "if you show a swing", so not a breach, but A and C do and the brief lists "flag swings from last year") | step 5 note cites the threshold ✓; no item flagged |
| rules: no self-review | ext item: Daniel filed the extension (timeline actor st-02) so his Sign off is disabled with the rule ✓ (:220-224, :285) | reason text cites the rule for passed items prepared by Priya (:231); nothing Daniel prepared | mergeNote: "You changed no values, so you may sign off" (:315). **should-fix (fairness, section 4)**: A, B and C apply the rule to different facts. |
| rule: over 1,000 needs partner | "Waiting for partner": ca-est, atlas, rsu, hvac, each labelled with the rule ✓ (SSN excluded: no tax figure) | "Waiting for partner": hvac, rsu only (:162); ca-est (3,500) and atlas (4,402) are also over 1,000 but sit only in "Blocking filing". **note** | every thread carries the rule text with its effect ✓ |
| rule: open review notes block filing | Helen's disabled reason "Firm rule: Open review notes block filing (4 open)" ✓ | ✓ (:236) | ✓ (:318) |
| rule: masking and logging | Marcus note quotes the rule ✓; cleared staff "Reveal (logged)" ✓; Jo's log ✓ | ✓ | ✓ |
| rule: every judgment call records the authority | hvac "needs a recorded decision with reason" (no "authority") **note** | "Judgment calls need partner sign-off and the authority relied on" ✓ | Sam view cites the rule ✓ |
| diagnostics are checks | DIGITAL_ASSET_BASIS_MISSING, code, exact message, refs ev-0879/0881/0882/0918/0919 ✓, labelled "From the engine" | DUE_DILIGENCE_REQUIRED exact ✓ | FORM_1099_FILING and DUE_DILIGENCE_REQUIRED exact ✓ |
| Sam Adeyemi (st-06, CPA, cleared, active 2027-01-04, tl-27) | present; `mask:'on'` (cleared ✓); "Selected for quality review, 4 Jan 2027" ✓ | present; `clear:true` ✓ | present; **note :403**: `clear` lists priya/daniel/helen only, so Sam's card says "Masked. Read only for this role." although the packet gives Sam clearance (read-only is a fair design choice; the wording implies no clearance) |
| Client sees only "Your part: answer questions, approve and sign" | ✓ (:54) | ✓ | ✓ (:214) |
| Stage is a fact of the return (round 1, decision 2); brief rule 10 says the header shows stage | **note**: A's header no longer shows a stage word at all (progress replaced it; `R.stage` is unused) | "Stage Review" + progress ✓ | "Review" tag + steps ✓ |

Nothing in the README is contradicted. The three items above marked should-fix are internal contradictions (C next-year) and uneven application of a firm rule.

---

## 2. Facts new since the first review (all read from the packet)

| Fact shown | Packet | Verdict |
|---|---|---|
| 2024 wages 156,039; 2025 wages 212,400 | `return_2024.lines.F1040.1a` = 156039; v3 `F1040.1a` = 212400 | ✓ A :205. Variance (212,400 − 156,039) / 156,039 = 36% and > 1,000 ✓ |
| "Ngozi changed jobs in 2025 (questionnaire qa-03)" | qa-03: "Ngozi left Corvane in May and started at Halvorsen Data on June 2" (answered by Erik) | ✓ A :205 |
| Repairs 3,900 in 2024 → 13,300 in 2025 | `return_2024.lines.SchE.14A` = 3900; v3 `SchE.14A` = 13300, source ev-1000 (D46 repairs_total) | ✓ A :191 |
| call-01, 26 Mar, Priya and Erik: whole system replaced with a heat pump | `call_notes[0]` ✓ | ✓ A :191 ("Confirmed with client") |
| Daniel filed the 36,000 extension, 14 Apr; `Sch3.10` = 36,000, rule R-EXTENSION-PAYMENT | timeline `extension-2026-04-14` actor st-02; v3 `Sch3.10` value 36000, rule `R-EXTENSION-PAYMENT`, source `timeline:extension-2026-04-14` | ✓ A :220-224 |
| DIGITAL_ASSET_BASIS_MISSING text and refs | v3 diagnostics[0] | ✓ A :215-219, verbatim |
| msg-07 text (3,050, CryptoNorth, 03/15/2021) | `messages[6]` | ✓ A :219 verbatim |
| DUE_DILIGENCE_REQUIRED, FORM_1099_FILING texts | v3 diagnostics | ✓ B :138/:150, C :303 verbatim |
| Step 12 evidence tl-20 "Form 8879 and FTB 8879 signed electronically", 10 Jul 2026, "the return the firm presented for approval (your final return)" | `timeline tl-20` | ✓ A :402, B :271, C :398 |
| 11 engine diagnostics on v3 | `len(v3.diagnostics)` = 11 | ✓ A :399, C :390 |
| D01 signed 12 Jan 2026; D02 consent to use only | D01 p2 "Signed electronically … 01/12/2026"; D02 printed_content mentions use and planning, not disclosure (title says "use and disclose": printed_content wins per README) | ✓ A :399, B :271, C :382 |
| Noncash gifts: v3 `SchA.12` = 20,500 = stock 14,500 (`F8283.A1.stock`, D65) + car 6,000 (`F8283.A1.vehicle`, qa-39); finalized 17,400 with the car at 2,900 (D66 box 4c) | ✓; D65: 200 sh, 12/05/2025, 72.50 × 200 = 14,500, cost 9,300 acquired 04/2019; D66: contribution 08/20/2025, sold 09/09/2025, proceeds 2,900; qa-39 "Kelley Blue Book said about 6,000" | ✓ A :209-214, B :182, C :370-373 (ledger GT-D03) |
| Schedule C finalized 151,300: books total income 151,300 (D14 ev-0103); 1099-NECs D16 to D20 sum 142,000; 1099-K D21 12,400; 9,300 from 11 small clients (D15 p3) | all ✓; 142,000 + 9,300 = 151,300 ✓ | ✓ A :179-182, B :181, C :374-377 (ledger GT-C01) |
| D15 and D47 cited by no v3 line | `facts4.py`: D15 cited by [], D47 cited by [] | ✓ A :178, :193, :399 |
| D11 "No line cites the basis on this page" | D11 is cited by `F8949.A.N2` (the ESPP lot, also on page 2); the RSU bases are not cited | **note** A :188: true for the RSU lots, not for the whole page |
| Letter 566 dated 20 Jan 2028, due 19 Feb 2028, D72 | ✓ | ✓ B, C |
| Sam st-06 selected 4 Jan 2027 (tl-27) | ✓ | ✓ all three |
| Examiner audit without California (A :345) | efile CA accepted 15 Jul exists; A filters FTB and rewrites "signed Form 8879" for the federal examiner | ✓ consistent with rule 8 |

No wrong fact found. Every invented sign-off, time entry, reveal entry and adjustment carries an Example tag where I looked (A: `checkedEx`, section `ex`, value `Example` on filed values; B: row `ex`, group `grpEx`, version tag, "(Example)" in chips; C: static tags on threads, sign-offs, view log, budget, filed values, "Who checked").

---

## 3. Leak scans

Client (ngozi) render, hidden elements stripped, all three: the only staff names are the switcher's own option labels. No `D\d+`, `ev-`, `R-`, line codes, "Tax effect", "should be", check names or review notes. The chat answer is the agreed client sentence with no source id (A `srcStyle=display:none`, B `chatSrcCls=hide`, C `chatSrc=false`); the progress button and command palette are hidden (A `prog.btnStyle` and `staffOnly` = `display:none`, B `stepsBtnCls=hide`, C `showSteps=false`). B's peek header is "Your FTB Web Pay confirmations" (was "D68 · page 1"). All three client asks now say "Please confirm Theo's Social Security number ends in 3390, as on his card" and "your tax team".
- **note, Inbox.dc.html:163**: the client's version string is "v3, none of our changes applied yet" (A says "Draft 3…", C "Version 3, updated 23 Jun"); "v3" is mild internal wording.

Examiner (irs) render: scan for Blocking / should be / Tax effect / What is open / unexplained / Check failed / Mismatch / F540NR / Schedule CA / FTB / Needs review / Sign off / Adjust / Dismiss returned **nothing** in A, B or C. Filed values 151,300 and 17,400 with Example tags; history "Engine v3: …; adjusted by the firm, reason …" as round 2 allows; chat hidden in all three.
- **should-fix, PullRequest.dc.html:191-201 (`showSsn: !isClient`, :427)**: the examiner's aside shows "Sensitive field: Theo, dependent 2, SSN · Organizer XXX-XX-3309 · Card (D71) XXX-XX-3390". The filed return carries one number; the organizer/card mismatch is the firm's internal finding (ledger GT-A05) and is exactly the "open-check verdict" rule 8 excludes. Probe: `texts.irs` in `PullRequest.r2.out.json` contains "Organizer XXX-XX-3309 Card (D71) XXX-XX-3390". A and B hide it for the examiner.
- **should-fix, PullRequest.dc.html:218-219 (`showInternal: !isClient`)**: the examiner sees "FBAR (outside return) 15 Oct 2026". The engagement letter (D01) excludes FBAR; it is not part of the filed return the examiner is looking at.
- **note, Main.dc.html:56, :145**: the examiner (and Sam, next) still see "Search or run a command Ctrl K" and "Simulated from the packet; a real PDF page drops in here unchanged" (`staffOnly` hides them for the client only). Harmless mock text, but "examiner sees the filed record" would hide the command palette too.

---

## 4. Fair comparison (same counts, same step logic)

| Item | A | B | C | Verdict |
|---|---|---|---|---|
| 9 people | ✓ | ✓ | ✓ | ✓ |
| Order of the 9 | …next, irs, **sam** | …next, **sam**, irs | …helen, **sam**, ngozi… | **should-fix**: three orders; round 2 added one person, the list should be identical |
| Labels | "Daniel Ortiz, reviewer"; "Sam Adeyemi, quality reviewer"; "IRS examiner (filed snapshot)" | "…reviewer (CPA)"; "Sam Adeyemi, quality reviewer (CPA, read only)"; "(filed snapshot, read only)" | "…reviewer (CPA)"; "Sam Adeyemi, quality reviewer (CPA)"; "IRS examiner (read only)" | **should-fix**: still three spellings (carried over from review 1, item 15) |
| Default | daniel | daniel | daniel | ✓ |
| Version string | "v3, none of our changes applied yet" ✓ | ✓ | ✓ | ✓ (client variants differ, note above) |
| Blockers | 4 | 4 | 4 | ✓ |
| Helen's button | "blocked by California estimates include a 2024 payment, and 3 more" | "blocked by “RSU shares sold with a zero cost basis”, and 3 more" | "blocked by California estimates include a 2024 payment, and 3 more" | **should-fix, Inbox.dc.html:162/:212**: B's first blocker is RSU because `rsu` sits first in Helen's queue; A and C name the CA estimates. Same button, different blocker. |
| Judgment item | 1 | 1 | 1 | ✓ |
| Engine diagnostics shown | 1 (DIGITAL_ASSET_BASIS_MISSING) | 1 (DUE_DILIGENCE_REQUIRED) | 2 (FORM_1099_FILING, DUE_DILIGENCE_REQUIRED) | note: rule 7 asks for at least one; different picks are fine |
| Passed items | 2 (wages, extension) | 2 (wages, capital loss carryover) | 1 (wages) | note |
| Steps done / with evidence | 0 of 12 / 1 of 12 | 0 of 12 / 1 of 12 | 0 of 12 / 1 of 12 | ✓ |
| Self-review rule, step logic | applied to a packet fact: Daniel filed the extension (tl actor st-02), so Daniel cannot sign off `Sch3.10` | reason text only, on Priya's passed items | "You changed no values, so you may sign off" | **should-fix**: round 2 rule 4 ("if Daniel changed a value…"). A reads the extension as Daniel's work; C asserts the opposite for the same packet. Pick one reading for all three. |
| Partner-sign-off queue | 4 items over 1,000 | 2 items | all 3 threads | note (section 1) |
| Examiner | 2 Letter 566 items, 151,300 and 17,400, Example | same | same | ✓ |
| Sam | 5 adjusted/decided rows + 1 step not done | 4 adjustments | 2 filed items with notes and rules | note: different depth; all read-only with "Leave a quality-review finding" ✓ |
| Chat text | exact per round 1 (staff and client) | exact | exact | ✓ (A :411-412, B :294-296, C :434-437) |
| Jo | "Edit firm standards" | ✓ | ✓ | ✓ |
| **C sign-offs card for Sam** | | | `showSignoffs` includes `qr` (:426); the card says Priya "Not yet", Daniel "Stale", Helen "Waiting", Client "Not sent" (:411) | **should-fix**: Sam is looking at the filed record (tl-20 client signed; "As filed"); the card contradicts the same screen's "History … signed by Helen Strand" wording and tl-20. Hide for `qr` or show the filed sign-offs (Example-tagged). |

---

## 5. Rendering

- **should-fix, Inbox.dc.html:102 and :104**: `{{cur.chk}}`, `{{cur.built}}`, `{{cur.hist}}` are undefined for every item that lacks them (all of Priya's, Marcus's, Daniel's, Helen's, Ngozi's, Jo's, next-year's items). The holes sit inside elements hidden by `chkCls` / `histCls`, so nothing shows, but the brief asks that every hole resolve. Probe: harness2 `problems` for Inbox: `undefined-hole cur.chk @102`, `cur.built @104`, `cur.hist @104` (role priya). Default them to `''` in `mk()`.
- Switcher: 9 literal `<option>`s, `value="{{role}}"` + `onChange` on the `<select>`, no `selected=` in all three ✓ (round 1 decision 4).
- B :87-88: `tabIndex`, `onChange` on the checkbox with `onClick` stop ✓ (review-1 hypotheses resolved).
- C :205: `aria-expanded="{{stepsOpen}}"` bound to a boolean; renders "true"/"false" ✓.
- Em dashes 0, no modal, no coloured side stripe, status always word + colour ✓.

---

## 6. Summary by severity

**Must-fix**: none. No README instruction is violated, no packet fact is wrong, client and examiner renders are free of internal text under the agreed scans.

**Should-fix**
1. PullRequest.dc.html:415: next-year version line "v3, none of our changes applied yet" contradicts the same view's "1 of 12 steps with evidence in the file" and step 12 "Done … 10 Jul 2026". Use the finalized label (as A and B do).
2. PullRequest.dc.html:191-201, :427: examiner sees the organizer/card SSN mismatch (internal finding); :218-219: examiner sees the FBAR deadline. Gate both off for `irs`.
3. PullRequest.dc.html:411/:426: Sam's sign-offs card says "Not yet / Stale / Waiting / Not sent" on a filed record.
4. Inbox.dc.html:162/:212: Helen's button names RSU as the first blocker; A and C name the CA estimates.
5. Self-review rule applied to different facts (A: Daniel's extension; C: "you changed no values"; B: text only). One reading for all three.
6. Switcher order and labels differ across the three (A …irs, sam; B …sam, irs; C sam after helen; three spellings of Daniel, Sam and the examiner).
7. Inbox.dc.html:102/:104: three undefined holes (`cur.chk`, `cur.built`, `cur.hist`); hidden, but default them.

**Notes**
8. Main.dc.html:317: next-year version string has no Example tag and not the agreed "As filed…" label.
9. Main.dc.html header shows no stage word (progress replaced it); brief rule 10 names stage in the header. B and C show both.
10. Inbox.dc.html:162: Helen's "Waiting for partner" omits ca-est and atlas though both are over 1,000.
11. Inbox shows no variance flag; A and C do.
12. Main.dc.html:191: hvac "needs a recorded decision with reason" does not mention the authority rule (B and C do).
13. PullRequest.dc.html:403: Sam's SSN card says "Read only for this role" though the packet gives Sam clearance.
14. Main.dc.html:188: D11 "no line cites the basis on this page" is true for the RSU lots; `F8949.A.N2` (ESPP) does cite D11.
15. Main.dc.html:56/:145: command palette and "Simulated from the packet" text shown to examiner, Sam and next-year.
16. Inbox.dc.html:163: client version string says "v3".
