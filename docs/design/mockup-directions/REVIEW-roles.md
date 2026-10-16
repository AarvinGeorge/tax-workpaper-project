# Review: role switcher in the three mock-up directions

Reviewer: Fable 5.1 (independent of the Opus authors). Date: Fri 16 Oct 2026, 12:15 EDT (`date`).
Files reviewed, not edited: `scratchpad/mock/project/Main.dc.html` (A), `Inbox.dc.html` (B), `PullRequest.dc.html` (C).
Brief: `scratchpad/mock/ROLE-BRIEF.md`. Format: `artifact-type/reference/format.md`.

## How I tested (executed, not just read)

Scripts live in `scratchpad/review-probe/` (never in the packet folder):

| Probe | What it did | Result |
|---|---|---|
| `harness.js` | Extracted each `class Component extends DCLogic`, stubbed `DCLogic` (props/state/setState), ran `renderVals()` for all 8 roles, rendered the `<x-dc>` template with a mini-engine (dotted-lookup holes, `sc-if`, `sc-for`, `display:none`/`.hide` stripped), then called every handler returned (pick, toggle, go, run, reveal, pickRole, toggleChat) and re-rendered. Output per file in `*.out.json`. | A, B, C: **0 undefined holes, 0 expression holes, 0 handler exceptions** across 8 roles |
| `node --check` on the extracted class bodies | parse check | all three parse |
| `probe2.js` | Daniel selects the RSU item, then switches to the client; client chat opened; Marcus clicks Reveal; Helen's approve button; read-only roles' action labels | see findings |
| `facts.py`, `facts2.py` (`python3 -I … "<packet>"`) | every household/firm fact the mock-ups show, read from the packet | see section 3 |
| grep | em dashes (U+2014), en dashes, `border-left/right`, `modal`/`dialog`, form-control bindings, style holes, missing `hint-*` | see sections 5 and 6 |

Not verified: a real browser render. The files load `./support.js`, which is not in `scratchpad/mock/project/`, so the runtime could not be exercised; everything below about React-style attribute handling is marked hypothesis.

Severity key: **must-fix** (breaks the brief's hard rules: client leak, external-party leak, wrong packet fact), **should-fix** (fairness of the comparison or a truth-rule gap), **note**.

---

## 1. Role leaks (client view, Ngozi)

Method: the full visible text of the client render is in `review-probe/<file>.out.json` under `texts.ngozi`; grep patterns for staff names, line codes, `D\d+`, `ev-`, `R-…`, "tax effect", review words. The "Viewing as" `<select>` options (all 8 names) appear in every role's text by design of the brief, so they are excluded from the leak list; everything else is listed.

### A. Main.dc.html
- **Clean of internal codes**: no `D\d+`, `ev-`, `R-`, line codes, "tax effect", "should be", "Who checked" in the client render. `probe2.js` confirmed that a staff selection (`sel:'rsu'`, an item with no client wording) does not carry over: the client falls back to the first client-safe item (line 307) and the leak-term scan of `V` was `[]`.
- **should-fix, Main.dc.html:262 and :264**: "Opens after Helen Strand approves it" and the disabled-button title "Locked until Helen Strand approves the return". The partner's name is shown to the client. B and C say "your accountant" / "the firm". The brief's client row says no reviewer names; a partner's name is borderline but the three directions should agree. Probe: `texts.ngozi` contains "Helen Strand" twice outside the select.
- **note, Main.dc.html:56**: the static "Search or run a command Ctrl K" button is rendered to the client (no role gate). A client has no command palette.
- **note, Main.dc.html:133**: static "Simulated from the packet; a real PDF page drops in here unchanged." is rendered to every role including the client. Mock-up meta text; fine for a design canvas, wrong if copied into the build.
- **note, Main.dc.html:51-55**: the stage strip shows internal stage names ("Partner", "Client sign", "Carry forward") to the client. Not a leak of a fact, but not plain-words either.

### B. Inbox.dc.html
- **must-fix, Inbox.dc.html:90 with :152**: the Peek header renders `{{cur.doc}} · page {{cur.page}}` and the client's first item spreads `...docs.caest`, so the client sees **"D68 · page 1"**. Probe: `probe2.js` leak scan of client `cur` returned `['D68']`; `texts.ngozi` contains "Peek D68 · page 1".
- **must-fix, Inbox.dc.html:107**: the chat answer has a static `[Source: D68]` button, rendered for every role. With the client's chat open (`toggleChat` in `probe2.js`) the client sees a document ID. A's client chat (line 348) correctly uses "FTB Web Pay confirmations".
- **should-fix, Inbox.dc.html:154**: the client's "Approve and e-sign" row's `line` is "Form 8879". A form code where the brief asks for plain words ("your e-file authorization").
- **note, Inbox.dc.html:60**: the nav title "Workpaper" is shown to the client (A has the same at :48). Minor.

### C. PullRequest.dc.html
- **must-fix, PullRequest.dc.html:208-209**: the chat Q/A is static text, rendered for every role: the client sees "Which California **estimated payments** count…", "**[Source: D68]**" and "on the document". Only `chatScope` (line 357) changes per role. Probe: `probe2.js` client chat shows the static block; `texts` for ngozi contain no D68 only because the panel is closed by default.
- **should-fix, PullRequest.dc.html:54 with :341**: `title` is "2025 Form 1040 and California 540NR" for the client too. Form names rather than plain words; A says "Okafor-Lindqvist · 2025 · Married filing jointly", B "2025 return".
- Otherwise clean: `showSignoffs`, `showBudget`, `showInternal`, `showSsn`, `showConversation` all gate on `view==='client'`; the client `clientItems` scan was `[]`.

### Leak to an external party (not the client, but the same class of error)
- **must-fix, Main.dc.html:297 with :108-119**: the IRS examiner's queue B "Other filed lines" uses `fromItem(byId.wages)` and `fromItem(byId['ca-est'])`, and the A section uses `fromItem(byId.atlas, …)`. The centre pane is only gated by `R.client`, so the examiner render (`texts.irs`) contains: **"Blocking · SchC.1 · Gross receipts · Card sales counted twice in business income · $163,700 should be $151,300 · Tax effect Federal −$4,402 · … the engine added the 1099-K again · What was done … · Who checked Not yet verified · What is open Books-to-tax bridge leaves 12,400 unexplained"**, and the "Where this document landed: Nowhere … unexplained" block. This is the firm's internal error analysis shown in a "Filed snapshot, read only" view, and it contradicts the snapshot framing (a filed return would carry the fixed value). B's examiner view shows the filed figure and a plain sentence; C's shows only line → document traces. Gate the centre/aside internals on `R.snapshot` as well as `R.client`, and give the snapshot items their own `c`-style wording.

---

## 2. Permissions

All verified by `harness.js` button inventory (hidden elements stripped) and `probe2.js`.

| Check | A Main | B Inbox | C PullRequest |
|---|---|---|---|
| Jo: no edit/adjust/sign-off/reveal | `actions=[]`, "No actions on return values. Read only."; mask hidden (`R.mask='none'`) | `acts=[]`, bulk `[]`, checkboxes hidden, mask hidden | `mergeBtns=[]`, no threads, reveal hidden (`revealStyle=display:none`) |
| Next year: only "Add to 2026 plan" | yes | yes | yes (4 buttons, disabled after click: "Added to 2026 plan") |
| IRS: only "Export response pack", no edit control | yes (but see leak above) | yes | yes |
| Marcus cannot reveal | `mask.cls='off'`, `aria-disabled=true`, click → "Not available: no sensitive-data clearance." | `revealCls='dis'`, `aria-disabled=true`, `reveal()` guarded: `revealed` stays `false` | `disabled=true`, label "Reveal (no clearance)", `reveal()` guarded by `clear` |
| Helen approve disabled and names blocker | "Approve and send to client: blocked by "California estimates include a 2024 payment" and 3 more", `aria-disabled=true`, title "4 blockers open" | "…blocked by “RSU shares sold with a zero cost basis” and 4 more", `aria-disabled=true`, reason "5 items block filing…" | "…blocked by payments dated for another tax year", `disabled=true`, note "Plus 3 more blocking checks…" |
| Daniel cannot edit values | no Adjust; "Sign off" disabled with title "Resolve this item first" on open items | no Adjust; Sign off only on passed items | threadActs = ["Leave a review note"]; Send back / Sign off at top |
| Client approve locked | `off`, title "Locked until Helen Strand approves…" | `act('Approve and e-sign', true, true)` | static `disabled="{{true}}"` |
| Every hole resolves for every role | 0 undefined | 0 undefined | 0 undefined |

Notes:
- **note, Main.dc.html:120**: `aria-disabled` buttons stay clickable (by design: the click explains why). Fine for a mock; the build should also set `disabled` or trap focus order.
- **note, Inbox.dc.html:226**: Marcus only sees that Reveal is refused after selecting the SSN row; nothing else in his view says sensitive data is masked except the banner. Acceptable.
- **note, PullRequest.dc.html:339**: Sign-offs card says "Priya Raman · Preparer · Signed" while Priya's own status strip still offers "Mark prepared and send to reviewer" (not sent). Internal contradiction inside C (both are Example-tagged, so not a truth-rule breach).

---

## 3. Packet accuracy

Every fact below was read with `facts.py` / `facts2.py` (`python3 -I`, packet path as argument). ✓ = matches.

| Fact shown | Packet | Verdict |
|---|---|---|
| D68: six payments; 2025-tax-year ones 15 Apr, 16 Jun 2025, 15 Jan 2026 = 10,500; 15 Sep 2025 marked 2024 | `D68 page 1` printed text; `ev-1076 pay5_year 2024` | ✓ all three (chat text and item text) |
| `F540NR.72` = 14,000, rule `R-CA-ESTIMATED-PAYMENTS` | v3 line: value 14000, rule ✓, **sources ev-1068…ev-1079** | **should-fix, Main.dc.html:158**: says "four payments (ev-1068 to ev-1072)"; the line cites ev-1068 to ev-1079 (12 ids, 4 payments). ev-1072 is pay4_amount. |
| Staff: Priya preparer (cleared), Marcus preparer (not cleared, "Background check pending; no access to full SSNs or bank numbers.", active 2026-03-24), Daniel reviewer CPA, Helen partner CPA, Jo firm_administrator, Ngozi client | `firm.staff`, `firm.client_users` | ✓ all three. Sam Adeyemi (quality reviewer, active 2027) correctly not in the 8. |
| Budget: 9 areas, 1.5/3.0/4.0/3.5/3.5/2.0/2.0/1.5/1.0 = 22.0 h | `firm.budget_hours` | ✓ A (Jo rows, Example-tagged), B ("22.0 h across 9 areas"), C (table) |
| Hours used (A: 5.5 h, 2.5 h, 19.0 h; C: 15.8 h) | not in packet | A: section Example tag ✓; C: "Example" tag + "hours used are an example" ✓ |
| Firm rule: adjustment over 1,000 of tax needs partner sign-off | `starter_standards.rules[1]` | ✓ A :251/:252, B :149 |
| Deadlines: extended 15 Oct 2026; internal review complete 8 Apr 2026; FBAR 15 Oct 2026; original 15 Apr 2026 | `firm.deadlines` | ✓ A, B, C |
| Letter 566: dated 2028-01-20, response due 2028-02-19, D72 received 2028-01-26; items: Schedule A line 12 noncash (Form 8283), Schedule C receipts vs 1099-NEC 142,000 and 1099-K 12,400 | `tax_agency_records.notices[1]` | ✓ A, B. **should-fix, PullRequest.dc.html:328**: C's "Filed lines" are the three thread lines (F540NR.72, SchC.1, SchE.14A), not the Letter 566 items; the Form 8283 item is absent and a California line is shown to an IRS examiner. |
| E-file: 13 Jul rejected (dependent 2), 14 Jul federal accepted, 15 Jul CA accepted; 8879 signed 10 Jul | `efile`, `timeline tl-20…24` | ✓ A filed history |
| Extension 14 Apr 2026, Form 4868 with 36,000, actor st-02 (Daniel) | `timeline extension-2026-04-14` | ✓ A :205 |
| IRS transcript pulled 12 Mar by st-01 (Priya), D69 | `tl-06`, D69 | ✓ A :208 |
| Marcus joined 24 Mar | `tl-09` | ✓ A :206 |
| v1 4 Mar, v2 19 Mar (corrected Meridian 1099), v3 23 Jun (Ridgeline K-1) | `return_versions[].computed_at/trigger` | ✓ A, C ("v3 computed 23 Jun after the late Ridgeline K-1 · 3 versions") |
| Client activity: 20 Jan questionnaire, 2 Mar "everything except Ridgeline", 18 Mar Erik corrected Meridian 1099, 5 Jun Erik 2023 Woodworks K-1 photo, 30 Jun Erik crypto lot, 1 Jul St. Brigid 1,500 | `tl-02`, msg-04…08 | ✓ A client audit (no Example needed) |
| "Jan 2027 Priya opened the 2026 return to roll forward" | `tl-28` 2027-01-15, actor st-01 | ✓ A :227 (I expected an invention; it is in the packet) |
| Theo: organizer …3309; card D71 …3390 (received 2026-07-13, client upload); 2024 return …3390; Ada …1106 | `household.people`, D71, `return_2024.dependents` | ✓ A, B, C (last 4 only everywhere) |
| Atlas 41,200 of which 12,400 by Paywell (D15 p3); `SchC.1` = 163,700 | ✓ | ✓ |
| RSU-2502 adjusted basis 19,100 (D11 p2); `F8949.B.N1` proceeds 19,240 basis 0 | ✓ | ✓ |
| Heat pump invoice D47, total 11,000; `SchE.14A` = 13,300 (HVAC inside repairs); what-if `hvac_improvement` federal +3,633, CA +896 | ✓ | ✓ A ("$2,300 + depreciation" = 13,300 − 11,000 ✓) |
| Wages 104,600 + 107,800 = 212,400; D10 is a duplicate image of D09 | `F1040.1a` note | ✓ A, B |
| Northlake sweep 1,840 on D28 and D29; `SchB.1.1` and `SchB.1.2` both 1,840 | ✓ | ✓ B ("$3,680", Fed −640 per ledger GT-B01) |
| Capital loss carryover 3,200 / 11,000 from 2024; `SchD.6`, `SchD.14` | ✓ | ✓ B |
| Carryovers out v3: MTC 3,871; SEP not deductible 2,786 | `v3.carryovers_out` | ✓ B |
| Planning 2026: no CA residency, MTC Form 8801, Erik SEP limit | `planning_reference_2026` | ✓ A, B |
| Contractors paid by ACH, no 1099s, Erik asks what to do, call 26 Mar | `call-01` | ✓ A |
| Prior preparer open item: 2023 Form 3520, foreign inheritance over 100,000 | `prior_preparer_workpaper.open_items…[3]` | ✓ B |
| Move Sacramento → Austin 15 Jul 2025 (qa-02); ISOs exercised July, still held (qa-06); Erik's Swedish account (qa-07); all answered 2026-01-20 | questionnaire | ✓ C |
| 74 documents, 10 messages, 627 v3 lines | counts | ✓ B nav |
| "v3 changed 11 lines" / tab "Changes 11" | `v3.changes_from_previous` has **89** entries | **should-fix, PullRequest.dc.html:234**: "Changes 11" is untagged and wrong; the sentence at :171 is Example-tagged but still misleading. B's "Changes 2" (:230) and "v3 + 2 of our changes" (:142) are invented and untagged too. |
| Where "now" is | `readme.where_now_is`: v3 (2026-06-23) is current; later events are scripted replay | see next item |
| A client queue: "Documents to upload: Theo's Social Security card" (:261) while A's own ssn item says "Arrived 13 Jul, after v3" and the staff doc pane shows D71 | D71 received 2026-07-13 | **should-fix, Main.dc.html:261**: inside one screen the card has both arrived (staff view) and not arrived (client view). Either tag the upload request as Example or pick a document not yet in the file (B uses the Form 3520 open item; C uses the heat-pump permit, Example-tagged). |

### Facts shown without an Example tag that are not in the packet
- **Inbox.dc.html:167**: IRS item "Schedule C gross receipts · $151,300" with why "…so they are counted once." States the filed return carried the fix. `where_now_is` allows replay amounts to "mean the return as your workpaper finalizes it", but the fix is still an assumption; tag it. (A tags nothing in its IRS view either, but A's problem is the leak above.)
- **Inbox.dc.html:130-137**: per-item `owner` (Priya / Helen / Unassigned) and the nav counts "Review notes 3", "Changes 2", "Client 2" (:230), "View log 1" (:232): invented, untagged. Low stakes but the truth rule is strict.
- **PullRequest.dc.html:234, :276**: "Checks 117", "112 checks pass", "4 blocking checks": there is no check engine in the packet; untagged.
- **Inbox.dc.html:152-154**: the client questions themselves are invented requests; A tags its "Questions for you" section Example (:258), C tags "Example requests" (:106), B tags nothing. Align.

---

## 4. Consistency across A, B, C

| Item | A | B | C | Verdict |
|---|---|---|---|---|
| 8 people, order, ids | same | same | same | ✓ |
| Default | daniel | daniel | daniel | ✓ |
| Labels | "Daniel Ortiz, reviewer"; "Next year's preparer (2026 return)"; "IRS examiner (filed snapshot)" | "…reviewer (CPA)"; "(2026, read only)"; "(filed snapshot, read only)" | "…reviewer (CPA)"; "(read only)"; "(read only)" | **note**: three spellings of the same 8 options; pick one list |
| Blockers | 4 (CA est, Atlas, RSU, SSN) | **5** (adds Northlake interest) | 4 | **should-fix**: B's fifth blocker is a real ledger item (GT-B01) but it makes B's Helen button say "and 4 more" against "and 3 more" in A and C. Not an error, but unjustified for a fair comparison; use one item set. |
| Judgment items | 1 (heat pump) | 1 | 1 | ✓ |
| Passed items | 1 (wages) | 2 (wages, cap loss) | 2 (in checks) | note |
| Waiting for partner | heat pump only | heat pump + RSU ("over 1,000") | heat pump thread | note: by the firm rule every blocker over 1,000 waits for partner; B is the most consistent with `starter_standards.rules[1]` |
| Version string | "v3, none of our changes applied yet" | "v3 + 2 of our changes" | "v3 computed 23 Jun … no changes of ours yet" | **should-fix**: A and C say no changes, B says 2. The brief's example wording is B's, but B shows no change anywhere except a nav count. |
| Stage | Review (staff); client "Being checked by your firm"; next "Carry forward"; irs "Filed" | **per role**: Priya "Preparation", Daniel "Review", Helen "Partner review", client "Waiting on you" | "In review"; irs "Filed" | **should-fix, Inbox.dc.html:142-148**: stage is a property of the return, not of the viewer; B shows three different stages for the same return at the same moment. The time-shifted personas (next year, IRS) legitimately differ. |
| Chat example text | "Three payments dated 15 Apr 2025, 16 Jun 2025 and 15 Jan 2026 count, totalling 10,500 [Source: D68]. The 15 Sep 2025 payment…" | "Three payments, dated …, count, totalling 10,500 [Source: D68] The 15 Sep…" (no full stop after the source) | "Three payments count for 2025 (15 Apr 2025, 16 Jun 2025, 15 Jan 2026), totalling 10,500 [Source: D68]. The 15 Sep…" | **should-fix**: brief gives one sentence; three paraphrases. B drops the period. Client variant: A rewrites with no D68 ✓, B keeps D68 ✗, C is static ✗ (section 1). |
| Example tagging of invented history | per-row `exStyle` + per-section | per-row `exCls` + per-group | per-thread static tag, per-section tag | all three have a mechanism; gaps listed in section 3 |

---

## 5. Design rules (grep evidence)

- Em dashes (U+2014): `grep -c` → A 0, B 0, C 0 ✓. En dashes (U+2013): B has 7, all `page:'–'` placeholders (Inbox.dc.html:153,154,158,159,162,163,164), rendering as "page –" in the Peek header. Allowed by the letter of the rule; "no page" would read better. note.
- Modals: `grep -niE 'role="dialog"|aria-modal|<dialog|modal'` → none ✓. Chat panels are non-modal fixed regions in all three ✓.
- Side-stripe borders: only `border-left/right: 1px solid var(--line)` pane dividers (A :72, :129; B :59, :89); no coloured stripes >1px ✓. C's `.tab.on` uses `border-bottom: 2px` accent (a tab indicator, not a status) ✓.
- Status never by colour alone: every `.tag` carries a word (Blocking / Judgment / Passed / Locked / Revealed / Refused / Under exam …) ✓; C's budget bar has the figure under it ✓; "Saved" is a word ✓.
- Tabular numerals: `.num` applied to amounts in all three ✓.

---

## 6. Rendering risks (per format.md; none reproduced, no runtime available: all hypotheses)

| File:line | Binding | Risk |
|---|---|---|
| PullRequest.dc.html:48 | `<option … selected="{{r.sel}}">` inside a `<select>` with no `value` | React warns "Use the `defaultValue` or `value` props on <select> instead of setting `selected` on <option>" and may not re-apply `selected` on later renders; A and B bind `value="{{role}}"` on the `<select>` with `onChange`, which is the supported controlled form. Switch C to the same. |
| Main.dc.html:59, Inbox.dc.html:53, PullRequest.dc.html:48 | `<sc-for>` as the direct child of `<select>` | If the runtime wraps loop output in an element, `<select>` gets a non-`<option>` child and shows nothing. format.md does not say how `sc-for` mounts. Verify in the canvas; fallback is eight literal `<option>`s. |
| Inbox.dc.html:79 | `<input type="checkbox" checked="{{it.checked}}" onClick="{{it.toggle}}">` | `checked` without `onChange`: React warns and treats the field as read-only; the `onClick` still fires `setState`, so it should work with a console warning. Safer: `onChange`. |
| Inbox.dc.html:78 | `tabindex="0"` on a `role="button"` div | JSX camelCase is `tabIndex`; React warns "Invalid DOM property" and may drop it, so the row is not keyboard-focusable. |
| PullRequest.dc.html:71, :144, :182 | `disabled="{{b.dis}}"` raw boolean | Fine in React (`false` omits the attribute). ✓ |
| PullRequest.dc.html:117 | `disabled="{{true}}"` | Fine. ✓ |
| Main.dc.html:68, 73-74, 82-83, 91-92, 103, 108, 112-113, 117-118, 120, 125, 134, 141; PullRequest.dc.html:126, :182 | style holes used for `display:none` toggles | format.md allows style holes for live state-driven values; these are. ✓ Interpolated forms (`style="color:var(--ink2);{{V.internal}}"`) are interpolated strings. ✓ |
| Main.dc.html:123 | `title="{{b.reason}}"` with `''` | renders `title=""`; harmless. |
| All | `hint-placeholder-count` on every `sc-for`, `hint-placeholder-val` on every `sc-if` | grep found none missing ✓ |
| Main.dc.html:147, PullRequest.dc.html:212 | `aria-expanded="{{chat.open}}"` (string) / `"{{chatOpen}}"` (boolean) | both render "true"/"false". ✓ |
| Main.dc.html:353 | `R: { ...R, snapStyle }` passes the whole role object (with functions, nested sections) to the template | only dotted lookups are used; fine. |

---

## 7. Summary by severity

**Must-fix**
1. Inbox.dc.html:90/:152: client sees "D68 · page 1" in the Peek header.
2. Inbox.dc.html:107: static "[Source: D68]" in the chat answer, shown to the client.
3. PullRequest.dc.html:208-209: static staff chat Q/A ("estimated payments", "[Source: D68]", "on the document") shown to the client.
4. Main.dc.html:297 with :108-119/:134-137: IRS examiner (external party, "filed snapshot") sees "Blocking", "should be", "Tax effect", "Who checked", "What is open", "Where this document landed: Nowhere".

**Should-fix**
5. Main.dc.html:262/:264: partner's name shown to the client (B and C say "the firm" / "your accountant").
6. Main.dc.html:158: "ev-1068 to ev-1072" should be ev-1068 to ev-1079.
7. Main.dc.html:261: client asked to upload Theo's card while the same screen says D71 arrived 13 Jul.
8. PullRequest.dc.html:234: "Changes 11" (packet: 89 changes in v3) and the untagged "Checks 117 / 112 pass" counts; Inbox.dc.html:142/:230: "v3 + 2 of our changes" / "Changes 2" untagged; A and C say no changes. Agree one version string across the three.
9. Inbox.dc.html:142-148: return stage varies with the viewer (Preparation / Review / Partner review).
10. Inbox.dc.html:140: five blockers vs four in A and C; Helen's button text differs accordingly.
11. Inbox.dc.html:167: IRS item asserts the filed value was corrected ($151,300) with no Example tag; Inbox.dc.html:154: "Form 8879" to the client; PullRequest.dc.html:54: form names in the client title.
12. PullRequest.dc.html:328: examiner's "Filed lines" are the thread lines, not the Letter 566 items (Form 8283 missing; a California line shown to the IRS).
13. Chat sentence: three paraphrases of the brief's one sentence (B missing the full stop after the source).
14. PullRequest.dc.html:48: `selected` on `<option>`; bind `value` on the `<select>` like A and B.

**Notes**
15. Role option labels spelled three ways; align the list.
16. Main.dc.html:56 and :133: staff command palette and mock meta text rendered to the client.
17. Inbox.dc.html:79/:78: `checked` without `onChange`, `tabindex` casing (hypotheses).
18. `<sc-for>` inside `<select>` in all three (hypothesis, needs a canvas check).
19. Inbox per-item owners and nav counts, and B's client questions, are untagged inventions; A and C tag theirs.
20. PullRequest.dc.html:339 vs :278: "Priya · Signed" while Priya has not yet sent to reviewer.
21. B's en-dash "page –" placeholders (7).

What I could not do: render in a browser (`support.js` absent), so attribute-handling items in section 6 are hypotheses; everything in sections 1 to 5 was executed with the harness or read from the packet with the scripts named above.
