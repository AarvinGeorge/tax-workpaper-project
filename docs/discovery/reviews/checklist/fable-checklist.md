# Blind requirements checklist: brief vs hybrid mock-up

Reviewer: Fable 5.1, independent. Written Fri 16 Oct 2026, 21:16 EDT (01:16 UTC Sat 17 Oct), from `date`.
Inputs read in full: `docs/brief.txt` (80 lines), `docs/packet/readme-verbatim.md`, the four ledger files and the ledger README, all eleven `hybrid/project/*.dc.html` files. Packet queried read-only with `probe1.py` and `probe2.py` in this folder (outputs `probe1.out`, `probe2.out`); SSNs printed as last 4 only. The other model's list was not looked for.

**Keys.** Coverage: **C** covered, **P** partial, **M** missing, each with `file:line` evidence from the mock-up. Layer: **UI**, **Backend** (data model, server, event log, rules engine, persistence, sync), **Both** (which part is which, in brackets). "Mock" means the mock-up shows the shape but every action is a session-only toast; that is expected of a design mock-up and is not held against it unless the shape itself is absent. Packet ids (`D..`, `ev-..`, `qa-..`, `msg-..`, `tl-..`) were verified by probe; `GT-..` ids are from the ledger.

---

## 1. Framing (brief lines 1–15)

| # | Brief words (line) | Done means | Non-obvious edge cases (packet-grounded) | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| F1 | "working, web-native tax workpaper from scratch" (3) | A deployed URL loads the packet and every screen works without a local build. | The canvas needs `support.js` and a design-tool runtime; nothing in it persists. | P | Main.dc.html:6, 55 (static "Saved") | Both (UI shell; backend persistence) |
| F2 | "with full workpaper capability, for one complex household's return" (3–4) | Every "What it must do" item below works end to end for this one return. | 27 ledger findings; 627 v3 lines; 74 documents; the mock-up carries 22 claims, 30 document rows, 11 of 34 forms. | P | ClaimDrawer:210–515; Documents:424; ReturnMap:228 | Both |
| F3 | "proves the return is right: where every number came from, what was done to it, who checked it, and what is still open" (6–7) | For any line, four answers in one place: source, history, verifier, open items. | 196 of 627 v3 lines have no `sources` (computed only); 23 carry a free-text `note` the engine relies on (e.g. F1040.1a "D10 counted once"); 13 lines are text (SchB.7b "Sweden", SchE.2A "365 / 0"). | P | ClaimDrawer:87–152 (all four sections); ReturnMap:81 totals not clickable | Both (drawer UI; backend line graph + event log) |
| F4 | "serves preparers, reviewers, partners, the client, the firm's administrator, next year's preparer, and an IRS examiner years later" (7–9) | Each audience has a view and only the actions its role allows. | Packet has two client users (cu-01 Ngozi, cu-02 Erik); Erik answered 15 of 45 questionnaire items and sent msg-03/05/06/07; the mock-up has no Erik. tl-28 shows next year's preparer is Priya herself. Sam's `active_from` is 2027-01-04. | C | Main:61–69 (9 roles), 172–177 (visibility) | Both (UI views; backend role rules) |
| F5 | "not a spreadsheet, or traditional workpapers recreated in any form" (10–11) | No grid-of-cells, no W/P index codes, no tickmarks; records are views of one claim graph. | Areas tables are still tables; acceptable because each cell links to a claim. | C | Main:93–125 three panes; Areas:343–505 | UI |
| F6 | "a 20-year CPA finds it faster and more trustworthy … a new hire can use it on day one" (14–15) | A reviewer reaches any number's source in two clicks; a new hire's screen explains every rule in its own words. | Marcus (uncleared, joined 24 Mar) is the new-hire proxy; banners explain rules; no help, no onboarding, no keyboard path. Trust needs the Example tags to disappear in the build. | P | Main:159–169 banners; Home:73 mask note | UI |

## 2. Evidence (lines 18–21, 28–32)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| E1 | "trace any number to its exact source" (18) | Every line value opens its `sources` (ev-, qa-, py:, agency:, household:, ref:, timeline:, asset:) with the printed text highlighted. | v3 lines cite 8 source kinds (probe2): 9 cite `qa-`, 10 `py:`, 13 `ref:`, 1 `timeline:` (Sch3.10), 11 `asset:`; 0 cite `msg-`/`call-` although msg-07 and call-01 change lines (GT-B03, C04). ev-0498 is a blank read as 0 (`text_as_read` ""). D74 alone holds 1,826 values. | P | ClaimDrawer:87–95, 210–515 (22 claims); ReturnMap:80–81 (only claim lines clickable) | Both (drawer UI; backend source resolver for all 8 kinds) |
| E2 | "any document to everywhere it landed (or why it didn't)" (18–19) | Each of 74 documents lists the lines citing it, or a typed reason it cites none. | D07, D69, D70, D72 are `not_extracted` but reproduced as structured data elsewhere; D30/D31 `partial` (page 32 unread, GT-B04); D30 superseded; D10 duplicate of D09; D13 (Form 3922) used nowhere; 15 docs in `documents_used` but uncited (Documents:157); D71 after v3. | P | Documents:236–288 (30 of 74 rows), 289 (7 reason types), 154–160 | Both (UI index; backend reverse index + reason records) |
| E3 | "Record how each number was verified" (19) | A verification event (one of the 5 firm types, who, when, version) can be recorded per line and is shown. | `verification_types` has 5 values; "confirmed with client" must link a qa-/msg-/call-; a verification on v2 goes stale on v3 (89 line changes); the self-review rule applies to verifying too. | P | ClaimDrawer:140–148 (Example rows), 219; Firm:198; no record action | Both (UI; backend event + staleness) |
| E4 | "Link related items across the return" (19–20) | A line links to the lines it moves with. | heat-pump ↔ repairs ↔ F4562-E; fed-est ↔ ext-pay ↔ F2210; sehi ↔ F8995 QBI; SEP limit ↔ SchC.31 (GT-C07). | P | ClaimDrawer:162–169 (6 links hand-coded) | Both (UI; backend `inputs` graph) |
| E5 | "… across … years" (20) | Prior-year figure, prior preparer's note and carry-in sit beside each 2025 line. | `return_2024` has 106 lines; `basis_records` 2023/2024 are null by design ("Gaps are real gaps"); D40 is a 2023 document; GT-C10 says the 2024 figure is the wrong one. | C | Areas:345–357, 452–457, 562–572 | Both |
| E6 | "… and related returns" (20) | The household's related returns are a record with status, preparer, what we received, and what must agree. | `household.related_returns`: Ada's own 2025 Form 1040 (not in packet; she ticked "someone can claim you" which must agree with F8812), Woodworks 1120-S + Oregon composite (K-1s only), Ridgeline 1065 + Arizona composite (K-1 + state supplement). No screen holds this. | M | none (Oregon tax appears only inside Areas:446, 487–491) | Both |
| E7 | "Attach any file, message or note as evidence" (20–21) | Staff and client can attach a file/message/note to a claim; it becomes a cited source. | 0 v3 lines cite messages or calls, so an attachment creates a new link, never a packet edit; msg-08 is the evidence that clears LOW_CONFIDENCE_READ (ev-1049); a note attached by uncleared Marcus must not carry an SSN; an attachment after filing attaches to the frozen record. | M | Documents:177, 438 (client upload toast only); messages quoted as text in ClaimDrawer:442 | Both (upload UI; backend blob + link event) |
| E8 | "display its source document and clearly identify the specific field or location" (28–29) | The page renders with the field highlighted and its box/position shown. | Positions are synthetic (README); claims with no page: ca-trace (engine line), fed-est (qa-41), ext-pay (timeline), form-3520 (py:). | C | ClaimDrawer:91–94 (mark, field, position) | UI |
| E9 | "create simulated source documents from the JSON data" (30–31) | Any document opens as a full simulated document (all pages), not just an excerpt. | 199 pages total, D31 has 32; D07/D69/D70/D72 have no printed content beyond a pointer and must be simulated from `prior_years` / `tax_agency_records`. | P | ClaimDrawer:30, 91 (excerpt only); Documents:379–384 (4 flagged pages) | Both (page renderer; backend page model) |
| E10 | "so real source documents could replace the simulated versions seamlessly" (31–32) | The link is (document id, page, ev id, position); swapping the renderer changes nothing else. | D31 replacing D30 shows a document swap must keep ev ids; D10 vs D09 duplicates. | C | ClaimDrawer:94 (stated) | Backend |

## 3. Calculation (lines 22–25)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| C1 | "show how any number was built" (22) | Every line shows rule, inputs with values, and the arithmetic; a line whose inputs do not produce it is marked. | 221 lines have inputs; GT-D06 four Schedule CA lines list incomplete inputs; F8949 lots in cents; 73 rules "not modelled" by the ledger checker; totals in the mock are "v3, not recomputed". | P | ClaimDrawer:127–129; ReturnMap:121, 206; ClaimDrawer:503–514 (ca-trace) | Both (UI; backend recompute-from-inputs) |
| C2 | "Reconcile figures that should agree" (22) | Named reconciliations run and show both sides. | 1099-NEC 142,000 + 1099-K 12,400 vs books 151,300 (Letter 566 asks exactly this); FTB payments by tax year; IRS transcript has two snapshots (12 Mar, 3 Aug) and the extension appears only in the second; Meridian summary vs detail gap of exactly 250 (page 32). | C | Checks:190–201; Areas:397–407; ClaimDrawer:231 | Both |
| C3 | "Handle large detail (hundreds of sales, many assets) without swamping the review" (23) | 302 F8949 lines and 9 assets are viewable, filterable and roll up to one number without loading the full list on the main screen. | D74: 260 lots, 1,826 values, 2,300 printed rows; sales by box roll up to 91,017; only the 3 RSU lots and C6 matter for review. | P | Areas:375–384 (box summary; "stays in its own view" but no view); ReturnMap:143 | Both (virtualised UI; backend paging) |
| C4 | "Take business books to taxable income" (24) | Books net → Schedule C net, every difference a line. | Books 89,834 → 81,854; SEHI moved to Sch1; books depreciation 7,600 vs 38,000; fuel replaced by mileage; meals 50%. | C | Areas:397–407 | UI (data from packet) |
| C5 | "Split income between states" (24) | Residency periods, Schedule CA columns and sourcing method per item. | GT-A02: Halvorsen box 16 is the full year (−5,685 CA, the largest CA finding) and has no drawer entry; Ridgeline 22% CA share after the move; condo gain is Texas; proration by days vs `ca_source_income`. | C | Areas:477–491 | Both |
| C6 | "Run checks that don't trust the engine" (24–25) | Checks re-derive from printed facts and can fail; engine diagnostics are shown beside, never instead. | Engine arithmetic is sound (ledger: 0 mismatches in 148 lines), so every useful check is source-vs-document; DIGITAL_ASSET_BASIS_MISSING went stale after msg-07; v1/v2 had 13 diagnostics, v3 has 11, the two resolved ones must show as resolved. | C | Checks:171–230, 233; Areas:508–549 (one or more checks per finding) | Backend (rules) + UI |

## 4. Change (lines 33–35)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| H1 | "adjust without losing the original (who, why, tax effect)" (33) | An adjustment is a new event over the packet value with who, why, authority/evidence, effect; the original stays visible. | Effect by rate vs engine what-if (hvac: rate +3,364 vs engine +3,633); "exactly 1,000 is not over 1,000" (fed-est); SALT cap stops binding after GT-D02 so the salt rate is wrong; SEP limit moves after SchC fixes; an SSN correction's event must store masked text only. | C | Changes:62, 148–192; ClaimDrawer:150–156 | Both (UI; backend append-only log) |
| H2 | "See changes live" (33–34) | Another person's saved change appears in my open tab within seconds, without reload. | See section 3. | M | Main:55 static "Saved"; Main:104–110 hard-coded history | Backend (sync) + UI |
| H3 | "and what changed since I last looked" (34) | Per person, a diff since their last visit to that screen/claim. | v3's 89 changes are "since you last looked" for a reviewer who signed on v2; a client's last look is 10 Jul (msg-09); per-tab vs per-person read state. | P | Home:206–208, Review:186, Checks:239 (hard-coded Example groups) | Both (backend last-seen per actor; UI diff) |
| H4 | "Compare versions" (34) | Any two of v1, v2, v3, firm-adjusted, as-filed, amended, side by side by line. | `changes_from_previous` is complete (63 and 89, verified by ledger); compare must also cover firm standards versions (Firm:212–215). | M | Review:272 and Main:216 mention counts only | Both |
| H5 | "Try what-ifs" (34) | A sandbox change shows its effect and is labelled not-a-change; never notifies, never blocks. | Packet has 5 `what_if.alternatives` (section179, no_bonus, hvac, standard_deduction, penalty_annualized) plus `extension`; rate-based what-ifs cross thresholds (README warns). | M | Changes:171 and ClaimDrawer:455 cite what-if results; no what-if action | Both |
| H6 | "Act on many items at once, with undo" (34–35) | Multi-select, one action, one undo that reverses all of it as a new event. | Bulk sign-off must skip items the reviewer prepared (mock excludes via Checks:263); undo after someone built on one of the items (section 3); Changes undo dies on page leave (Changes:281). | C | Checks:66–72, 325–331, 376; Changes:72–79, 277–281 | Both (UI; backend compensating event) |

## 5. Judgment (lines 36–38)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| J1 | "flag swings from last year" (36) | The firm variance rule (>10% and >1,000) runs on every line with a 2024 counterpart and needs an explanation. | Only repairs is flagged in the mock; capital gain (3,000)→185,027, CA estimates 3,000→14,000, wages 156,039→212,400 are not; lines new in 2025 (Sch3.11) need a "new" state; GT-C10 shows the prior year can be the wrong one. | P | Home:172; Checks:202; Areas:562–572 (2024 column, no flags) | Backend (rule) + UI |
| J2 | "Record judgment calls" (36) | A judgment record: question, decision, authority, who, when, effect. | Rule "every judgment call records the authority"; the mock cites Treas. Reg. 1.263(a)-3 marked Example (outside the packet). | C | Changes:169–174, 99; ClaimDrawer:276 | Both |
| J3 | "elections" (36) | Elections are explicit choices with the alternative's result beside them. | Section 179 (what-if −1,050 CA); Form 2210 method (regular vs annualized, both 164); de minimis FTC vs Form 1116; standard vs itemized (+12,306 what-if). | P | Areas:256 "Record the election"; ClaimDrawer:450–461 | Both |
| J4 | "due diligence" (36–37) | Form 8867 answers are recorded per credit, not just the engine warning. | Firm rule names CTC, ODC, AOTC, EITC, HOH; AOTC is phased out (does 8867 still apply?); F8867.status is a text line "Not completed". | P | ReturnMap:166–167; Checks:217–218 (engine diag only) | Both |
| J5 | "and penalty decisions" (37) | Penalty-related decisions recorded: 2210 method, excess SS, late-payment penalty after 20 Jul, SEP excise, Form 3520 exposure. | `post_filing_rates` (7%, 0.5%/month) lets the app size the 20 Jul cost; the engine does not; first-time abatement is a decision. | M | ClaimDrawer:489–501 (excess-ss only) | Both |
| J6 | "Prove completeness: every document used" (37–38) | Step 4 is derived: no document received before filing without a reason. | D71 arrives after signing and reopens the step; D72 after filing must not gate; `documents_used` differs by version (64/65/71). | C | Documents:54–81, 360–363, 427–434 | Backend (derived step) + UI |
| J7 | "every area considered" (38) | Each of the 9 budget areas has a reviewed state with who/when. | Daniel cannot mark Deductions (he filed the extension inside it, Areas:644); an area with only engine notes still needs a human mark. | C | Areas:641–648 | Both |
| J8 | "every outside filing identified" (38) | One list of filings outside this return: required/not, owner, due date, status. | FBAR (FinCEN 114, client filed 2024 himself per D07), Forms 1099-NEC (due 2 Feb 2026, late), 2023 Form 3520 (GT-B05), Form 5330 SEP excise (GT-C07), Oregon and Arizona composite returns (related_returns), Ada's own 1040, Form 709 (none needed, record the negative), Form 8938 is inside the return. | P | Filing:311–318; Firm:248–249, 256–257 (two items, scattered) | Both |

## 6. People (lines 39–42)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| P1 | "questions to the client" (39) | A question is an event tied to a claim, addressed to a named client user, with the answer becoming a cited source. | Which client: Ngozi answered 30, Erik 15 (Erik owns the studio, crypto, Swedish account); qa-41 is a guess to be re-asked; a question carries the version it was asked on. | P | Checks:282–285; ClaimDrawer:569; Home:255–258 (client sees questions) | Both |
| P2 | "or colleagues that become evidence" (39) | A question to a colleague (preparer → partner) is a thread on a claim, distinct from a review note. | Marcus cannot be asked to type an SSN; "ask the engine team" (ca-trace) is a colleague outside the firm. | M | none (only review notes, Review:180–199) | Both |
| P3 | "Review notes that can block filing" (39–40) | Open notes block partner approval; severity and resolution tracked. | Rule says any open note blocks, not only Blocking ones; a note on a line that then changes in a new version; client never sees notes (Review:150). | C | Review:77–97, 180–199, 244–246 | Both |
| P4 | "Sign-offs that reopen when what was signed changes" (40) | Each sign-off stores the version/value hash it covered; a later change flips it to stale. | 89 v2→v3 changes; document-list sign-off reopens on D71 or a changed reason; area sign-off reopens on any line in the area; firm standards v3 does not reopen (Firm:72, a choice); client 8879 after the 13 Jul SSN fix (see P8). | C | Review:204–227; Documents:366–376 | Backend (hash + staleness) + UI |
| P5 | "Enforced roles" (40) | The server refuses actions outside the role, not just the UI. | Marcus uncleared; Sam not active before 2027-01-04; Helen signs as paid preparer (PTIN); Jo edits standards not values; examiner sees only Letter items. | C | Main:172–207; per-screen `actsFor` (Checks:280–301, Changes:210–230) | Backend (authorisation) + UI |
| P6 | "Several people at once" (41) | Two roles in two tabs act on the same return without overwriting each other. | Section 3. | M | Main:146 single in-memory state | Backend (sync, conflicts) + UI |
| P7 | "Assignments" (41) | Items and areas have an assignee; reassignment is an event; a queue per person. | `assignment_at_start` st-01/02/03; Marcus joins 24 Mar with no assignment; the SSN item must move to a cleared preparer (Checks:283); Sam assigned 2027; tl-28 assigns Priya again. | P | Firm:253; Review:182; Checks:87 owner column (display only) | Both |
| P8 | "deadlines" (41) | Firm deadlines, agency deadlines and per-item due dates, measured against the simulated clock, with warnings. | 6 `firm.deadlines` (two outside engagement); 27 Mar and 8 Apr already missed at the 23 Jun "now"; e-file rejection perfection window (hypothesis: 5 days for 1040 MeF); Letter 566 due 19 Feb 2028; 2026 Q1 estimate 15 Apr 2026 already past. | P | Firm:242–258; Home:246–249 (display, no warnings) | Both |
| P9 | "notifications" (41) | Each person has an inbox fed by events relevant to them, read state, live delivery. | Section 3. | M | none | Both |
| P10 | "Client approval and e-file signature" (41–42) | Client sees the return as presented, approves, both spouses e-sign (8879 + FTB 8879); the signed snapshot is kept. | Both spouses sign (tl-20 carries two PINs; those PINs must be redacted everywhere, including search and timeline replay); `prior_year_agi_for_esignature` is the identity check; a change after signing (13 Jul SSN fix) needs a re-presentation decision. | P | Filing:238–253 (Locked block, steps); no sign flow | Both |

## 7. Filing and after (lines 43–45)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| A1 | "extensions" (43) | Extension event with amount, basis version, confirmation. | Sized from v2 which carried the 4,000 guess; FTB 3519 with 0; "not an extension of time to pay" (post_filing_rates note); shows on the transcript only from 3 Aug. | C | Filing:208; ClaimDrawer:284–295; Areas:468 | Both |
| A2 | "filing" (43) | Submission ids and acceptances recorded per jurisdiction. | CA accepted a day after federal; the record freezes at which? | C | Filing:213–214, 259 | Both |
| A3 | "e-file rejections" (43) | Rejection code, message, the item it points to, the fix, retransmission. | R0000-504-02 + STATE-HOLD; the fix changed the return after the client signed; the card arrived 2 h after the rejection. | C | Filing:211–212, 229 | Both |
| A4 | "the client's copy" (43) | The client can open/download the as-filed return, 8879s and payment record. | Which client (Ngozi vs Erik) ; refund bank account on the copy; the copy is of the finalized return, not v3. | M | Filing:325 (text only) | Both |
| A5 | "Freeze at filing" (43) | After acceptance nothing in the record changes; later events attach. | Federal 14 Jul vs CA 15 Jul; 20 Jul payment, 3 Aug transcript (196/276), 21 Aug refund attach without mutating; msg-07/08 arrived after v3 and before signing and were never applied (GT-B03). | C | Filing:255–261; Main:56 | Backend (immutability) + UI |
| A6 | "amend on top" (44) | An amendment is a new version over the frozen one with its own approvals. | GT-B03 (−1,312) is the natural amendment; CA Schedule X; 2024 home office overstatement is the prior preparer's return. | P | Filing:87, 328 (next-year role only, toast) | Both |
| A7 | "Answer a notice with a self-contained record" (44) | A response pack per notice item: as-filed value, how built, documents, sign-offs, history. | Letter 566 items: Sch A 12 (Form 8283) and Sch C 1; the pack must contain the 1099-NEC/1099-K reconciliation that explains the excluded 12,400; prior notice N-2023-CP2000 (D70) as precedent; retention to 14 Jul 2033 covers 2028. | C | Filing:263–281, 336–338; Documents:403–417 | Both |
| A8 | "Carry everything forward with its history" (44–45) | Every `carryovers_out` key and every open item rolls into 2026 with its source chain. | 11 federal + 3 CA carryover keys; `ira_nondeductible_basis_ngozi` 0 vs 2024 Form 8606 line 14 = 7,000 (ledger 02 suspicion); minimum tax credit moved 3,722→3,700→3,871; SEP excess; CA depreciation differences per asset. | C | Filing:293–310; Home:264–277; Checks:252 | Both |
| A9 | "and plan next year" (45) | A 2026 plan with estimates (safe harbour on the finalized return), elections and watch items. | 110% of 2025 total tax depends on the finalized return, not v3's 81,962; CA 30/40/30 on CA-source only; 2026 Q1 (15 Apr 2026) is already past at "now"; ISO qualifying disposition after 30 Jul 2026. | C | Filing:308–309, 290–291 | Both |

## 8. Firm (lines 46–47)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| R1 | "firm-wide standards" (46) | Standards are versioned data the administrator edits; every rule names where it acts. | README: starter standards "a starting point you may change"; the mock tightens the masking rule and says so; a threshold change re-runs variance flags; sign-offs keep their version's wording. | C | Firm:194–215, 71–73 | Both |
| R2 | "protection of sensitive data with view logs" (46) | Identifiers masked by default; every unmasked view logged (who, which, when, never the value). | Identifiers in the packet: 4 household SSNs, 5 ssn-type values (ev-0012/0015/0034/0051/1080), 1 account number (ev-0963, D36), refund bank account, IP PIN (D03), ERO PIN, PTINs, two signature PINs in tl-20 detail. `printed_content` is already masked (XXX-XX-) but `household.people[].ssn` is full; the rule says every *view* is logged, so document views that print identifiers count, not only reveal clicks; search refuses SSN-shaped queries (Main:283–284). | C | Main:190–197; Firm:227–231; ClaimDrawer:98–116, 550–562 | Backend (masking at the API) + UI |
| R3 | "time against budget" (46–47) | Time is captured per person per area and compared to `budget_hours`. | Packet records no time; 22.0 h budget; Marcus's time; time after filing (quality review, notice). | P | Firm:233–239 (Example hours); Areas:84 | Both |
| R4 | "status" (47) | Return status derived from the 12 steps and events, per role's "now". | Status differs at 23 Jun 2026, 15 Jan 2027, 26 Jan 2028. | C | Firm:242–258; Main:52–53; Home:187–197 | Backend (derived) + UI |
| R5 | "and search" (47) | Full-text and amount search over lines, values, documents, answers, notes; role-scoped. | 3,012 values, F8949 in cents, printed_content (e.g. "Spotify" in D15), client scope = own documents, examiner scope = Letter items; never SSN digits. | C | Main:58, 253–325 (22-claim index; design is right) | Both (backend index; UI) |

## 9. Records a CPA expects (lines 48–53)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| K1 | "return summary vs last year" (48) | Whole-return two-column summary with variance flags. | Per-area summaries exist; no whole-return summary; 2024 was a full-year CA 540 so CA lines do not map 1:1. | P | Areas:562–572; ReturnMap has no 2024 column | UI (from packet) |
| K2 | "tax computation" (48) | Brackets, AMT (3,871), NIIT (7,095), QBI, CA ratio 0.6347 shown as a computation. | `tax_effect_rates` are measured at v3; Form 8995 vs 8995-A; `engine_reference` has 40 parameters and 97 rules. | P | ReturnMap:126–134 (totals only) | Both |
| K3 | "area summaries" (48–49) | — | — | C | Areas:575–585 | UI |
| K4 | "document index" (49) | All 74 with type, issuer, received, uploaded by, status, landed/why not. | 30 of 74 shown. | P | Documents:236–288 | Both |
| K5 | "depreciation by asset (method, life, bonus, federal vs California vs AMT, disposals and recapture)" (49–50) | Per asset: cost, land, in service, method, life, bonus/179, fed/CA/AMT current and accumulated, disposal, recapture. | 9 v3 assets vs 6 prior records (3 new STU-*); SAC-APPL CA 484 / fed 0; AUS disposals with unrecaptured §1250 50,340; heat pump would be a 10th asset; `amt_difference` field. | C | Areas:408–414, 424–439 | UI (from packet) |
| K6 | "sales detail" (50) | Lot-level detail (302 lines) with box, dates, proceeds, basis, adjustments, wash, term. | D74 260 lots; M18 missing lot; wash-sale suspicions (ledger 02). | P | Areas:375–384 (by box only) | Both |
| K7 | "books to tax" (50) | — | — | C | Areas:397–407 | UI |
| K8 | "rentals and passive losses" (50) | Per property income/expense, days, F8582 allowed/suspended, releases. | 16,150 carried in, all released in 2025; condo days 273; Sacramento 100% CA. | P | Areas:424–439, 348 (no F8582 record) | UI |
| K9 | "K-1 lines" (51) | — | Ridgeline 22% CA; Woodworks Oregon composite 1,580. | C | Areas:442–451 | UI |
| K10 | "retirement and foreign items" (51) | IRA/backdoor Roth (F8606), SEP, HSA (F8889), Form 8938, FBAR, FTC, Form 3520 as one record. | 8606 basis 7,000 vs carryovers_out 0 vs qa-31 "none"; 8938 at year-end rate 9.71; FTC 396 de minimis; FBAR filed by the client for 2024. | P | Checks:225–229; ClaimDrawer:338–349, 396–422 (ISO, SEP, FX, 3520 only) | Both |
| K11 | "deductions and credits with limits" (51–52) | Each limited item shows the limit, the fraction and the source. | SALT 41,290 vs cap 40,000 (drops below cap after GT-D02); CTC 2,500→400 (46×50); AOTC phased out; F2441 0 after 5,000 exclusion; charitable AGI limits; Schedule S ≈ 635. | P | Areas:460–474, 487–491 | Both |
| K12 | "payments" (52) | Federal/CA payments by date and source, tied to agency records, incl. extension and post-filing. | Two transcript snapshots; FTB 2024 vs 2025 buckets; 13,130 CA withholding; 196/276 after filing. | C | Areas:466–470; Checks:197–201 | Both |
| K13 | "state split" (52) | — | — | C | Areas:477–486 | UI |
| K14 | "carryovers" (52) | — | — | C | Areas:345–352; Filing:293–310 | UI |
| K15 | "basis by year" (52) | — | 2022 from a client worksheet; Ridgeline outside basis null; home 685,000. | C | Areas:452–457 | UI |
| K16 | "what the prior preparer did vs what we changed" (52–53) | Per item: prior treatment, our treatment, why. | SEHI 0 in 2024 vs 14,400; Northlake sweep one line in 2024; FX 10.56 carried; home office 300→220; `return_2024.notes` and the D07 memo. | P | Areas:345–357 (carry-ins and open items only) | Both |

## 10. The client and the data (lines 54–65)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| D1 | "documents arrive late or corrected" (59–60) | Late/corrected arrivals are events that reopen steps and sign-offs. | D31 corrected (→ v2); D10 re-upload; D37/38 22 Jun (→ v3); D40 a 2023 document; D71 after signing; D72 after filing. | C | Documents:246–248, 265–266, 280, 427–434 | Backend (events) + UI |
| D2 | "some answers only the client knows" (60) | Client questions are first-class, with the answer's arrival time vs the version it should have changed. | msg-07 "about 3,050" after v3 (GT-B03); qa-06 ISO held; Form 3520: mother's residency; SEHI by month. | C | ClaimDrawer:158–160, 599–603 | Both |
| D3 | "One JSON packet holds 74 documents … about 3,000 extracted values with source and confidence, three computed versions … client answers, prior years, IRS data, firm staff" (61–64) | The app loads all of it, not a hand-copied subset. | 3,012 values, 627/625/625 lines, 45 answers, 10 messages, 1 call with 8 notes, 6 staff, 2 client users, 2 transcript snapshots, 2 notices, 4 e-file records. | P | ClaimDrawer:210–515 (22 claims hand-copied); Documents:236 (30 rows) | Backend (loader) |
| D4 | "a timeline to replay the season" (63–64) | A time control replays 29 events (+ `extension-2026-04-14`, a non-`tl-` id); every screen answers "as of" that time. | README: post-v3 amounts "mean the return as your workpaper finalizes it" (tl-25 balance, tl-26 refund must be computed from the finalized return); three fixed "nows" in the mock vs a continuous clock; events with `actor: null`. | P | Main:248–251 (one "now" per role); Filing:207–232 (happened / not yet) | Both (backend as-of queries; UI scrubber) |
| D5 | "The packet contains confident mistakes" (64) | All 27 ledger findings are surfaced by a check the user can see fail. | 5 findings have no drawer entry (A02, B01, B03, B04, D02 — A02 and D02 are the 2nd-largest CA and a +1,462 federal item); confidence <0.9 on only 2 values, so confidence is not a finder (A07 read at 0.97). | C | Areas:214–302 (all 27 placed); Checks; Home blockers | Backend (checks) + UI |
| D6 | "You don't need tax law … or document reading" (65) | Effects from `tax_effect_rates`/`what_if`, labelled as estimates; no OCR. | Rates mislead when a threshold moves (SALT cap, GT-D02) or QBI is involved (GT-A06); the mock adds authorities marked Example. | C | Changes:62 | Backend |

## 11. What to hand in (lines 68–77)

| # | Brief words (line) | Done means | Edge cases | Cov. | Evidence | Layer |
|---|---|---|---|---|---|---|
| S1 | "Sending sooner is better" (69) | Process, not product. | — | n/a | — | — |
| S2 | "a web app run from a link" (70) | Public URL, no login, loads in a fresh browser. | Vercel deployment protection must be off or bypassed for the reviewer's browser. | M | mock is a design canvas | Backend (deploy) |
| S3 | "loading the packet as delivered" (70–71) | The file `okafor_lindqvist_2025_packet (1).json` is read unchanged at startup; load is idempotent and recorded with a hash. | Space and "(1)" in the filename; no pre-cleaning of mistakes; packet.version 1.0 generated 2026-10-12. | M | mock hand-copies values | Backend |
| S4 | "saving everything" (71) | Every action by every role persists across reload and across tabs: adjustments, notes, sign-offs, questions, reveals, reads, assignments, standards versions, what-ifs, undo. | Undo is itself a saved event; timestamps carry both wall clock and simulated clock; a reveal is saved even though its value is not. | M | Main:55 static; every action "Recorded for this session" (Checks:277, Changes:208, Home:235) | Backend (append-only log) + UI (saved state) |
| S5 | "with a role switcher" (71) | Switch roles without login; the switcher sets who the next events are attributed to. | With no logins, "who" in the view log is a claim, not a fact — say so on screen; switching mid-draft; switching to a role whose "now" is later must not reveal post-filing events to a working role. | C | Main:59–70, 199–207 | UI (backend attributes events to the role) |
| S6 | "One page on your core idea and your data model" (72) | Document. | — | n/a | — | — |
| S7 | "The errors you found, and how your design surfaced them" (73) | Each of the 27 has a named check and a screenshot of it failing. | The mock itself records which findings it does not surface (Areas:223, 235, 239, 243, 262, 266, 288, 301). | P | Areas:214–302 | — |
| S8 | "video … technical decisions … tradeoffs" (74–76) | Founder records. | — | n/a | — | — |
| S9 | "Use any tools you like, including AI; tell us how" (77) | `docs/ai-usage.md`. The mock previews an in-app AI ("Ask about this return", Main:127–139); if it ships, CLAUDE.md requires evals and the answers must be role-scoped and cite sources. | The preview answer cites D68 and already knows the ledger's finding; a real one must not leak masked numbers or internal notes to the client. | P | Main:127–139, 240–246 | Both |

**Totals (items F1–S9, excluding the 3 n/a):** 88 checkable items: **41 covered, 34 partial, 13 missing** (counted by script over the table rows, not by hand).

---

## Section 3. Several people at once, live changes and notifications

**What the founder wants.** One browser, several tabs, one role per tab; each tab shows a bell next to the role switcher; reviews, sign-offs, assignments, deadline warnings and approvals arrive there live. The mock-up has none of it: one in-memory state per tab (Main:146), a static "Saved" tag (Main:55), hard-coded "Since you last looked" groups (Home:206, Review:186). Discovery 05 already leaned to polling; it did not list the cases below.

**Edge cases this creates**

1. *Conflicting edits.* Priya (tab 1) proposes "Adjust to 10,500" on F540NR.72 while Marcus (tab 2) proposes 14,000 "Dismissed with a reason" on the same claim. Append-only means both events land; the claim's state must be "two open proposals", not last-writer-wins. Each write carries the `claim_version` it was made against; the server rejects a write whose base is stale and the tab shows the other person's event instead.
2. *A sign-off racing a change.* Daniel signs off F1040.1a at the moment Priya's adjustment on the same line commits. Sign-off stores the value hash it covered; if the hash no longer matches at commit, the sign-off is written as `stale` from birth and Daniel's tab says so. Same for the partner approval button: "blocked by 4 blockers" must be re-evaluated server-side at click time, not from the tab's cached count (Review:234 hard-codes `nBlock = 4`).
3. *Per-recipient content under masking.* The same event ("Theo's SSN corrected to …3390") renders differently per recipient: Priya sees last 4; Marcus (no clearance, Firm:222) sees "an identifier was corrected"; Ngozi sees "please confirm Theo's number" and only on her own items; the examiner never receives it. Notification text is rendered at read time per role, never stored pre-rendered. tl-20's detail contains two signature PINs; the replay of that event must redact them in every channel (Filing:242 already hides them on one screen).
4. *Client and examiner limits.* Ngozi's bell receives: questions to her, documents requested, "ready to approve", acceptance, refund. Never: review notes, blockers, tax-effect estimates, Marcus's clearance. Erik (cu-02, absent from the mock) receives the questions he is the right person for (studio, crypto, Swedish account). The examiner's "inbox" is only the notice thread and the response pack; no live events at all.
5. *Roles at different points on the season's timeline.* The mock gives working roles "now" = 23 Jun 2026, Sam and next year's preparer 15 Jan 2027, the examiner 26 Jan 2028 (Main:250). A live event is dated on the wall clock but must also carry a simulated time; a tab whose "now" is earlier than an event's simulated time must not show it (Sam must not see Priya's 2026 work as "new", and Priya must not see the 2028 letter). Decide one rule: simulated time = the role's "now" at write, wall time = ordering only.
6. *Deadlines on the simulated clock.* "Internal review due 8 Apr 2026" is already 76 days late at the 23 Jun "now"; "Letter 566 response due 19 Feb 2028" is 24 days away for the examiner's "now". Warnings compute from the simulated clock; nothing may use `Date.now()` for tax dates. The 2026 Q1 estimate (15 Apr 2026) is in the past for a plan written on 15 Jan 2027, so "plan next year" warnings differ by role too.
7. *Timeline replay.* Replaying tl-21 (rejection) and tl-22 (card) must raise the same notifications a live rejection would, to the same recipients, and must reopen "All documents accounted for" (Documents:427–434). Replayed events are flagged `replayed: true` so they never re-trigger emails or counters twice on reload.
8. *Duplicate and read state across tabs.* Two tabs as Daniel: a notification read in one is read in the other (read state per actor, not per tab, stored as an event). Two tabs as different roles: the same underlying event appears in both bells with different text (case 3) and independent read state. Dedupe by event id, not by text.
9. *Bulk actions → floods.* Priya marks 11 items prepared in one click (Checks:325–331): Daniel gets one grouped notification ("11 items prepared, 4 blockers") with the list inside, not 11 toasts. Undo of the bulk emits one compensating event that retracts the group; a tab that already showed the group marks it "withdrawn".
10. *Undo after someone built on a change.* Priya adjusts F540NR.72 to 10,500; Daniel signs it; Priya undoes. Undo is a new event; it cannot delete Daniel's sign-off, so the sign-off flips to stale and Daniel is notified "the item you signed was withdrawn". Undo is refused only if the item is in a frozen (filed) record.
11. *Role switch inside a tab.* Switching the role in one tab must re-subscribe with the new role's filter and "now"; buffered events for the old role are dropped, not shown to the new one.
12. *Offline/ slow tab.* A tab that missed events (laptop asleep) resumes from the last event sequence it saw; it never re-fetches from zero or shows a flood as "new".

**Recommended mechanism (Vercel serverless, Postgres)**

- **Source of truth:** one append-only `events` table with a monotonically increasing `seq` (bigserial), `at_wall`, `at_simulated`, `actor_role`, `type`, `claim_id`, `payload_masked` (identifiers already masked), `base_version` (for conflict checks), `group_id` (bulk), `retracts_seq` (undo). Every screen is a projection over this table; notifications are a projection with a `recipient_role` filter and a `reads` table keyed by (actor, seq).
- **Delivery:** long-polling `GET /api/events?after=<seq>&role=<r>` from each tab every 2–3 s, server returns immediately when there is something newer or after ~25 s otherwise. This is the simplest thing that works on serverless, needs no connection state, and survives function recycling. Hypothesis, not from docs: a tab count of 9 (one per role) at 3 s is ~3 requests/s, well inside any plan.
- **If the founder wants true push:** Vercel's own docs state WebSockets run in Vercel Functions and "WebSocket connections close when a Vercel Function reaches its maximum duration limit", with the documented client pattern being reconnect with exponential backoff up to 30 s (vercel.com/docs/functions/websockets, read via the Vercel docs tool tonight). So push is possible but still needs the `after=<seq>` resume on reconnect, which means the polling endpoint must exist anyway. Build polling first; add SSE/WebSocket only if the demo needs sub-second arrival. Exact maximum-duration figures per plan were not in the excerpt I read: treat them as unverified.
- **Conflict rule:** writes include `base_version`; the server compares with the claim's current head and either appends or returns 409 with the newer events, which the tab renders before letting the user retry. No optimistic UI for sign-offs and approvals; optimistic is fine for notes.
- **Simulated clock:** stored on every event; the role's "now" is a server-side setting per role (the mock's three values), so a tab cannot forge it.

---

## Section 4. What we may have missed

Stepping back to the whole product for CPAs and the client, beyond the brief's phrases:

1. **Erik.** The packet has two client users; Erik owns half the facts (studio, crypto, Swedish account, mileage, K-1s) and sent the message that fixes GT-B03. A client experience with only Ngozi cannot ask the right person and cannot have both spouses e-sign (tl-20 has two PINs).
2. **Related returns as a record** (E6). The brief names them; the packet gives three, one of which (Ada's own return) must agree with the dependent claim. Nothing in the mock-up holds them.
3. **The biggest findings without a surface.** GT-A02 (CA wages, −5,685, high severity) and GT-D02 (+1,462 federal) have no drawer entry and no row in Checks; they exist only as Areas text. The errors write-up (hand-in 3) will be weaker for exactly the two numbers a California reviewer would look for first.
4. **Post-filing cost of the late balance.** Balance paid 20 Jul 2026 after the 15 Apr due date; `post_filing_rates` is in the packet so the app can show interest and failure-to-pay penalty (transcript code 196/276 on 3 Aug) and the extension's "not an extension of time to pay" warning. The mock mentions it in one timeline row (Filing:215).
5. **Answered-but-not-applied.** msg-07 and msg-08 arrived between v3 and the client's signature and were never applied; the return was signed on stale data. A state "answered after the last computation" per claim, blocking approval, is the single design feature that catches this class (ledger: "Client said vs document says vs later news").
6. **Prove a check can fail.** The CLAUDE.md measurement rule applies to the app: each of the 27 checks needs a test that flips the input and sees it fail. The mock cannot show that; the build must.
7. **Who is "who" without logins.** Every sign-off, reveal and approval records a role chosen from a dropdown. The one-page and the UI should say the attribution is by role, and the design should make it hard to switch role accidentally mid-action (confirm on switch when a draft exists).
8. **Document view log vs reveal log.** The rule is "every unmasked view is logged". Simulated documents print masked identifiers already, but the household record and ev-1080 do not; the API, not the page, must mask, and any endpoint that returns a full identifier must write the log row.
9. **Standards changes have consequences.** Raising the variance threshold or the partner threshold changes which items need partner sign-off; the Firm screen versions the standards (Firm:212–215) but nothing re-evaluates open items against the new version or tells the partner.
10. **The deadline that is today.** At the working roles' "now" (23 Jun 2026) the firm's internal deadlines are already missed and the extended due date is 114 days away; the app's first notification on load should be that state, not silence.
11. **Retention and destruction.** Rule 7: records destroyed 7 years after filing (14 Jul 2033). A frozen record needs a destruction date and a hold flag for an open examination (Letter 566 arrives 2028; a hold must stop destruction).
12. **A print/export of the workpaper.** "Not a spreadsheet" does not mean no export; a partner or examiner will ask for a PDF of a claim with its evidence. The response pack (Filing:336) is the only export in the mock.

---

## Section 5. Labels the mock-up shows, against the terms a US tax CPA expects

Sources used for "expected term": IRS form and publication wording (Form 8879, Form 1040 instructions, Pub 17), the IRS e-file acknowledgement vocabulary (accepted/rejected, reject code), AICPA SSTS (Statements on Standards for Tax Services, revised 2024: reasonable basis, due diligence, reliance on information), Circular 230 §10.22 (diligence as to accuracy) and §10.34, and common tax-software usage (CCH Axcess, Lacerte, Drake, UltraTax: "diagnostics", "organizer", "e-file acknowledgement", "tax summary / comparison", "carryover", "what-if / planner", "review notes", "sign-off"). Verdict: **keep**, **rename**, or **jargon** (paper-era, the brief would reject).

| Where | Label in mock-up | Kind | Term a CPA expects | Source of the term | Verdict |
|---|---|---|---|---|---|
| Main:178 | Home | screen | Dashboard / My work | software usage | keep |
| Main:178 | Return map | screen | Forms view / Return (forms and lines) | software: "Forms" view (Lacerte, Drake) | keep ("map" is fine; add "forms and lines" hint, present at Main:179) |
| Main:178 | Areas | screen | Tax summary by area / Schedules | software: "Summary", "Comparison" | keep; consider "Summary by area" |
| Main:178 | Documents | screen | Source documents / Document index | SSTS 1.2 reliance on information; software "Source Docs" | keep |
| Main:178 | Checks | screen | Diagnostics (engine) + Review checks (ours) | software "Diagnostics"; Circular 230 §10.22 due diligence | keep; the mock already says "our checks beside the engine's diagnostics" |
| Main:178 | Review | screen | Review / Review notes | software "Review notes", "Preparer/Reviewer sign-off" | keep |
| Main:178 | Changes | screen | Adjustments / Change log | software "Adjustments", Form 1040-X "changes" | keep ("Adjustments" also acceptable) |
| Main:178 | Filing and after | screen | E-file / Filing status | IRS e-file acknowledgement vocabulary | keep |
| Main:178 | Firm | screen | Firm settings / Standards | software "Firm setup" | keep |
| Main:52–53 | Version v3; Stage Review | status | Return version; Status: In review | software "status" | keep |
| Main:55 | Saved | status | Saved (autosave) | web usage | keep, must be true |
| Main:56 | Filed snapshot, read only | status | As filed (locked) | IRS "as filed"; software "locked return" | keep; "As filed" preferred |
| Main:59 | Viewing as | control | Signed in as / Role | web usage | keep; add note "attribution by role" |
| Home:157 | Blocking | status | Critical diagnostic / Blocks e-file | software: "critical/fatal diagnostics" | keep; add "stops e-file" where it does |
| Home:157 | Judgment | status | Judgment call / Position (reasonable basis) | SSTS 1 (tax return positions); Circular 230 §10.34 | keep; "Position" would be the CPA word |
| Home:157 | Check failed | status | Exception / Diagnostic | software "diagnostic"; audit usage "exception" | keep |
| Home:157 | Variance | status | Prior-year comparison variance | software "Comparison" report | keep |
| Home:157 | Needs review | status | Pending review | software | keep |
| Home:157 | Engine warning | status | Diagnostic (warning) | software "diagnostics" | keep |
| Home:157 | Carry | status | Carryover / Carryforward | IRS "carryover" (Pub 17, Sch D) | rename to "Carryover" |
| Home:157 | Passed | status | Verified / Agreed | audit usage "agreed to" | keep |
| Home:188 | The firm's 12 required steps | record | Engagement checklist / Required procedures | SSTS; firm QC usage "checklist" | keep |
| Checks:271–273 | Mark prepared; Sign off; Send back; Leave a review note; Dismiss with a reason; Mark resolved with a reason | action | Preparer sign-off; Reviewer sign-off; Return to preparer; Review note; Clear diagnostic (with reason) | software: "sign-off", "review note", "clear diagnostic" | keep; "Dismiss" → "Clear with reason" is closer to software usage |
| Checks:255 | Tie-out | status | Tie-out / Reconciliation | audit usage; the brief says "reconcile" | keep (CPAs use it) |
| Checks:255 | Not blocking | status | Informational / Non-critical | software diagnostic severities | keep |
| Checks:190, 197 | Identity tie-out; Payments tie-out | record | Taxpayer identification verification; Estimated payments reconciliation (to account transcript) | IRS "account transcript", code 670 | keep |
| Review:260–261 | Changes against v3; Review notes; Sign-offs | tab | Adjustments; Review notes; Sign-offs | software | keep |
| Review:205, 209 | Stale; Current | status | Sign-off reopened / outdated | software "review stale" (CCH) | keep |
| Review:239 | Mark prepared and send to reviewer | action | Submit for review | software | keep |
| Review:245 | Approve and send to client | action | Partner approval; Release to client | software "release" | keep |
| Changes:194 | Proposed; Applied; Recorded; Judgment | status | Proposed adjustment; Posted; Recorded | software "post adjustment" | keep |
| Changes:99 | Evidence relied on / Authority relied on | field | Support; Authority | SSTS 1 "authority"; Circular 230 §10.34 | keep |
| Changes:101 | Partner sign-off | field | Partner review / signer review | software | keep |
| Documents:289 | Supports a line; Corroborates a value; Duplicate; Superseded; Supports a firm step; Post-filing record; Considered, not used | record type | Source for line; Corroborating evidence; Duplicate; Superseded (CORRECTED form); Procedure support; Post-filing; Not used (N/A with reason) | IRS "CORRECTED" box on 1099s; audit "corroborating" | keep |
| Documents:56 | Firm step 4 of 12 | status | Required procedure 4 of 12 | firm QC usage | keep |
| Filing:239 | Approve and e-sign | action | Sign Form 8879 (e-file signature authorization) | IRS Form 8879 title | rename: name the form in the subtitle |
| Filing:256 | Frozen | status | Filed / Locked | software "locked" | rename to "As filed, locked" |
| Filing:228 | Happened; Later in this story (not yet happened) | status | Occurred; Scheduled/Future | replay usage | keep inside replay only |
| Filing:211 | Federal e-file rejected; California held | status | Rejected (reject code R0000-504-02); State held | IRS MeF acknowledgement wording | keep |
| Filing:113 | Letter 566: items under examination | record | IRS Letter 566 (correspondence examination) | IRS letter number | keep |
| Filing:135 | Export response pack | action | Examination response / IDR response package | IRS "Information Document Request" (IDR) | keep; "Examination response" is the CPA phrase |
| Filing:143 | Carry forward to 2026 | record | Carryovers to 2026 / Proforma | IRS "carryover"; software "proforma" | rename "Carryovers to 2026" ("proforma" is software jargon but understood) |
| Filing:87 | Start an amendment on top | action | Amend (Form 1040-X / Schedule X) | IRS form names | keep; name the forms |
| Firm:64 | Firm standards | record | Firm policies / Quality control standards | AICPA QC usage | keep |
| Firm:92 | Verification types: Agreed to source document; Recalculated; Confirmed with client; Agreed to prior year; Agreed to third-party record | record | Same words are the audit-procedure vocabulary (agree, recalculate, confirm, inspect) | AICPA audit evidence procedures | keep |
| Firm:96 | Variance review | record | Prior-year comparison threshold | software "Comparison" | keep |
| Firm:134 | View log | record | Access log / Audit log of sensitive data views | IRS Pub 4557 safeguarding; "audit trail" | keep ("Access log" also fine) |
| Firm:149 | Time against budget | record | Time and budget (WIP) | practice-management usage "WIP" | keep; avoid "WIP" |
| Firm:164 | File status | record | Return status / Engagement status | software | keep |
| Firm:247 | Records retained until | field | Record retention | Circular 230 §10.28; IRS Rev. Proc. 98-25 usage | keep |
| ClaimDrawer:46 | Where this number came from | heading | Source / Support | audit usage | keep (plain and right) |
| ClaimDrawer:80 | Kind of source | field | Source type | — | keep |
| ClaimDrawer:82 | Pipeline read (confidence) | field | Extraction confidence | software/OCR usage | keep |
| ClaimDrawer:127 | How it was built | section | Computation / Calculation | software "calculation detail" | keep |
| ClaimDrawer:131 | Checks it fails | section | Open diagnostics / Exceptions | software | keep |
| ClaimDrawer:140 | Who checked | section | Verified by / Sign-off | audit usage | keep |
| ClaimDrawer:154 | Tax effect | field | Tax effect / Tax impact | software "tax impact" | keep |
| Areas:93 | This year against last year | table | Two-year comparison | software "Comparison" | keep |
| Areas:137 | Ledger findings in this area | section | Findings / Exceptions | audit usage "findings" | rename: "Ledger" is this project's internal word, not the user's; "Findings" alone |
| Main:131 | Ask about this return (Preview, later round) | action | Assistant | — | keep, but it is an AI feature with its own obligations (S9) |

**Jargon check.** No tickmarks, no workpaper index codes (A-1, B-2), no "lead sheet", no "PBC", no "T/B" appear anywhere in the mock-up; "tie-out", "carry", "frozen" and "ledger" are the only words to revisit, and only "ledger" (Areas:137, 680) leaks project vocabulary into the user's screen. The mock-up's vocabulary is otherwise the brief's own: plain words, sourced.

---

*Word count of prose outside tables: about 2,050.*
