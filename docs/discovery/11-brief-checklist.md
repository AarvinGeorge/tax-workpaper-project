# Discovery 11: the brief as a checklist (UI, backend, both)

Written 16 Oct 2026, 21:35 EDT, by Opus 5.5. Sources, in the order of authority:
1. The brief, line by line: Fable 5.1's blind pass, `reviews/checklist/fable-checklist.md` (91 items, each with a done-test,
   packet-grounded edge cases, mock-up coverage with file:line, and a layer). Probes beside it, `python3 -I`, read-only.
2. Aarvin's handwritten reading of the brief, `00b-aarvin-brief-notes.md` (supplementary), merged below as "Aarvin" tags.
Opus spot-checked four Fable findings against the mock-up files (GT-A02 and GT-D02 have no drawer entry; Erik is not a role in
the switcher; "Ledger findings" at Areas:137; `nBlock = 4` hard-coded at Review:234): all four hold.

**Score of the hybrid mock-up (v7) against the brief:** 88 checkable items: 41 covered, 34 partial, 13 missing
(counted by script over Fable's table rows). Full tables: `reviews/checklist/fable-checklist.md`. This file is the merged view.

## 1. How the layers fit together (one idea)

Everything is **one append-only event log over the read-only packet** (decided 15 Oct). The backend owns truth: loading the
packet as delivered, the events, the rules (checks, roles, masking, staleness), the story clock. The UI owns views of it: each
screen, the drawer, the bell, "since you last looked" are projections of the same events, filtered by role and by the role's
"now". So every "Both" item below splits the same way: **backend = the event and the rule; UI = where the person sees and acts.**

## 2. UI items (what the mock-up must show) — gaps for round H3

| # | Item (brief line) | Today | H3 change | Aarvin | When |
|---|---|---|---|---|---|
| U1 | Notifications (41) | missing | Bell top right next to the role switcher, unread count, toast, per-recipient wording, click opens the claim | Notifications as things change while everyone works | First |
| U2 | See changes live; several people at once (33-34, 41) | missing | Simulated second actor: a scripted event arrives (Priya adjusts, Daniel's sign-off goes stale; an edit refused "Daniel changed this 20 s ago") | Concurrency, live updates | First |
| U3 | Since I last looked (34) | partial, hard-coded | Driven by the same event list as the bell (last-seen per person) | Primary users | First |
| U4 | Timeline replay (63-64) | partial | "Play the season" control on the shared story clock; replayed events notify; tl-20 PINs redacted | | First |
| U5 | Assignments, deadlines (41) | display only | Assign / reassign action; deadline warnings on the story clock (27 Mar and 8 Apr already 76 days late at 23 Jun) | Assignments, deadlines | First |
| U6 | Erik as a client user (7-9, 41-42) | not a role | Add Erik to the switcher; questions addressed per spouse; both spouses sign 8879 separately | | First |
| U7 | Client approval and e-file signature (41-42) | partial | Sign flow naming Form 8879 / FTB 8879, one step per spouse, signed snapshot | E-signature | First |
| U8 | Compare versions (34) | missing | v1 / v2 / v3 / firm-adjusted / as filed side by side by line | (not in notes) | First |
| U9 | What-ifs (34) | missing | Sandbox from the packet's 5 `what_if.alternatives`, labelled "not a change", never notifies | What-ifs | First |
| U10 | Attach any file, message or note (20-21) | missing | Attach on any claim; msg-07, msg-08, call-01 become cited sources | Submit document proof | First |
| U11 | Related returns (20) | missing | A record: Ada's own 1040, Woodworks 1120-S + Oregon composite, Ridgeline 1065 + Arizona composite | Related returns | First |
| U12 | Questions to colleagues (39) | missing | Thread on a claim, distinct from a review note | Questions become evidence | First |
| U13 | Outside filings (38) | scattered | One list: FBAR, 1099-NEC, 2023 Form 3520, Form 5330, composites, Ada's 1040, Form 709 (none needed, recorded) | "What are the outside filings?" | First |
| U14 | Penalty decisions (37) | missing | Late-payment interest and penalty after 20 Jul from `post_filing_rates`; 2210 method; abatement decision | Penalty decisions | First: the decision record; Later: the interest and penalty estimate |
| U15 | Biggest findings surfaced (64) | partial | Drawer entries and Checks rows for GT-A02 (CA wages −5,685) and GT-D02 (+1,462) | | First |
| U16 | Answered but not applied (60) | missing | Claim state "answer arrived after the last computation", blocks approval (msg-07, msg-08) | | First |
| U17 | Client's copy (43) | text only | Open the as-filed return + signed 8879s + acknowledgements, plain words | "The client's copy of what?" | First |
| U18 | Swings from last year (36) | partial | Variance rule on every line with a 2024 counterpart (capital gain, CA estimates, wages), "new this year" state | Aarvin read "how flags changed"; brief means amount swings | First |
| U19 | Terminology (bar, 14-15) | mostly right | Small renames only (see section 4); hover definitions for terms | Industry terms | First |
| U20 | Attribution by role (71) | silent | Say on screen that "who" is the chosen role; confirm a role switch when a draft exists | | First |

Partial items not listed (large-detail views for 302 sales, full document index of 74, full return summary vs last year,
retirement and foreign items as one record) stay for the build: they are data volume, not design questions.

## 3. Backend items (the build; no mock-up change)

| # | Item | Why it is backend | When |
|---|---|---|---|
| B1 | Load `okafor_lindqvist_2025_packet (1).json` unchanged, hash recorded | "loading the packet as delivered" (70-71) | First |
| B2 | Append-only `events` table: `seq`, wall time, story time, role, type, claim, masked payload, `base_version`, `group_id`, `retracts_seq` | "saving everything" (71); undo is a compensating event | First |
| B3 | Delivery: polling `GET /events?after=<seq>` every 2-3 s plus `BroadcastChannel` nudge between tabs | Several tabs, one browser; Vercel functions are stateless (Fable read Vercel docs: WebSockets close at the function's max duration, so the resume endpoint is needed anyway) | First |
| B4 | Conflict rule: write carries `base_version`, stale write gets 409 with the newer events | Two people on one number | First |
| B5 | Sign-off stores the hash it covered; approval re-checks blockers at click time | "Sign-offs that reopen" (40); no cached counts | First |
| B6 | Role rules enforced on the server; masking at the API; any endpoint returning a full identifier writes a view-log row | "Enforced roles", "view logs" (40, 46) | First |
| B7 | Notifications are a projection with recipient rules, rendered per recipient at read time; read state per person; bulk actions grouped | Per-recipient wording under masking | First |
| B8 | One shared story clock per workspace; deadlines and "happened / not yet" computed from it, never `Date.now()` | Roles at different points in the season | First |
| B9 | Checks re-derive from printed facts; each of the 27 has a test that flips the input and sees it fail | "checks that don't trust the engine"; the proven-zero rule | First |
| B10 | Freeze at acceptance; later events attach; retention date and an examination hold | Freeze, amend on top, retention to 14 Jul 2033 | First: freeze and amend on top; Later: retention date and examination hold |
| B11 | Standards are versioned; a threshold change re-evaluates open items and notifies the partner | Firm-wide standards with consequences | Later |
| B12 | Public link with no deployment protection | "run from a link" | First |
| B13 | The README as a written input schema, checked on load: strict where the README is clear, tolerant where it is silent (no required/optional markers; line values may be text, dates or ratios; Form 8949 lot values are dollars to the cent, e.g. 19240.0, 231 of 302 non-integer, measured 22:52; the README's "in cents" means precision, not units: never divide by 100); unknown fields and document types kept and shown as unrecognised; the loaded `packet.version` recorded | Shape contract (README level 2); shape is not truth, the checks (B9) decide belief | First (light: the README's main fields) |
| B14 | No count, id or name from this packet in code; every collection is n from the data; missing sections give an honest empty state ("No prior year on file: the comparison cannot run") | Aarvin: n possibilities in the input; extends the schema-not-ids guard | First |
| B15 | Our own event schema for everything the firm creates (adjustments, notes, sign-offs, questions, notifications, reads, view log, assignments, clock moves) | Not in the packet; we own this contract | First |
| B16 | Document link = (document, page, position, value id), with a swappable view, so a real file replaces the simulated page | Brief lines 31-32, above the README | First |
| B17 | Five test packets in CI: as delivered; altered (renamed people, removed forms, extra staff); minimal (few documents, one version, no prior year, no messages); large generated (~10x, load time measured); one unknown document type that the safety net must block | Proof of B13-B16 | First: delivered + altered; Later: minimal, large, unknown type |
| B18 | Unrecognised-document safety net: a document that lands nowhere and has no reason blocks "every document accounted for"; AI may later propose a mapping, a person accepts it, and it becomes data or a deterministic check | Unknown types (proposal, 22:06) | First: the safety net; Later: the AI suggestion |

## 4. Terminology: result of the check

Fable mapped every label to the term a US tax CPA expects (IRS form wording, AICPA SSTS, Circular 230, tax-software usage).
**Verdict: the vocabulary is already mostly standard; renames are small.** This corrects Opus's earlier remark that the screen
names were the gap: Fable keeps the screen names (Checks = our checks beside the engine's diagnostics; Changes = adjustments)
and adds hint text. Renames it recommends:
- "Ledger findings" → "Findings" (Areas:137, 680): "ledger" is this project's word, not the user's.
- "Carry" → "Carryover"; "Frozen" → "As filed, locked"; "Carry forward to 2026" → "Carryovers to 2026".
- "Approve and e-sign" names the form: "Sign Form 8879 (e-file signature authorization)".
- "Dismiss with a reason" → "Clear with a reason"; "Export response pack" → "Examination response".
- No paper-era jargon found (no tickmarks, index codes, lead sheets, PBC).

## 5. Aarvin's notes: where each landed
Every bullet in `00b-aarvin-brief-notes.md` maps to an item above or to a covered item in Fable's tables. Three differ from the
brief and are recorded there with the brief's reading: "proves the system" vs "proves the return"; "flag swing" (U18);
the omitted "compare versions", "with undo", "or why it didn't" and hand-in items 2-4 (all present in Fable's list).

### README audit additions (Fable, line by line, 16 Oct 22:41; full table in reviews/readme-audit/readme-checklist.md)
61 README lines and fields: mock-up 32 covered, 14 partial, 15 missing; 15 had no checklist item. Added:

| # | Item (README) | Layer | When |
|---|---|---|---|
| B19 | **Finalized version**: v3 plus the applied adjustments is a computed version of its own; every post-v3 amount (approval, balance due, refund, penalty and interest) is taken from it, never from v3 ("they mean the return as your workpaper finalizes it"). The mock sizes the penalty on v3's 4,220 | Backend + UI | First |
| B20 | **Resolver for every reference kind**: ev-, qa-, msg-, call-, py:, asset:, ref:param / ref:fx, household:, agency:, timeline:, bare v1/v2/v3, doc:id#page, and free-text sources; each opens the right view in the drawer | Backend + UI | First |
| B21 | **Tax effects are bound to a version**: a stored effect records version, category and rate and goes stale on a new version, like a sign-off; a warning when a threshold moves (the SALT cap in GT-D02) | Both | First: the record; Later: the warning |
| B22 | **engine_reference is the law the app uses**: checks read rates and thresholds from `ref:param`, never hard-coded; the drawer shows the cited rule's description and parameter values | Both | First: cited values; Later: a reference screen |
| B23 | **`belongs_to` decides ownership**: which spouse sees which document, whose W-2 a value is, which spouse gets a question (feeds the spouse table) | Both | First |
| B24 | **Firm identity**: EFIN, ERO PIN, PTINs and the paid-preparer signer shown in the 8879 flow and the as-filed return; ERO PIN and the tl-20 signature PINs added to the masking rule's list in standards v2 | Both | First: display; Later: the policy change |
| B25 | **The 2024 column traces**: prior-year lines open their D06 source like any 2025 number (`line_sources`) | Both | First |
| B26 | **Schema facts for B13**: `extraction.values` is a count, masking keys on `value_type`, seven blank `text_as_read` reads are a check family (generalises GT-A01), dependent facts as entered, agency code glossary, FTB late-payment rate | Backend | First: masking by value_type and blank reads; Later: the rest |

Brief items the checklist marked covered that the README puts in doubt (re-check in the spec): E5, E8, E10, C6, H1, A5, D4, R2.

## 6. When: first version or later
Added 16 Oct 22:34 EDT (Aarvin). "First" = in the first working, deployed version; "Later" = a round after it is live.
The brief says "Everything below must work", so every brief item (U1-U20) is First; the tiering bites on the
proof and hardening extras in the backend list. Counts: U 20 First (U14's estimate Later); B 17 First, 1 Later (B11),
with the Later parts of B10, B17 and B18 named in the row.

## 7. Carried into the spec
Sections 2 and 3 (U1-U20, B1-B26) are the requirement list for `docs/superpowers/specs/2026-10-16-workpaper-design.md`
when it is written: each U item names its screen, each B item its test, and each B13-B18 item one of the five test packets.
