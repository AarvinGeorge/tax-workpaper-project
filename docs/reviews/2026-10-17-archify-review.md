# Cross-model review: the four Archify diagrams

Reviewer: Claude Fable 5.1 (different model from the authors). Sat 17 Oct 2026, 17:53-18:15 EDT. Read-only; no repo spec was
edited. Checked against the code at commit `45b37d8` (`git rev-parse --short HEAD`), `docs/architecture/FACTS.md`, the packet
(via `python3 -I`, SSN last 4 only), and the Archify rules in `~/.claude/skills/archify/SKILL.md`.

Specs: `plan/archify/{system.architecture,data.dataflow,adjust.sequence,return.lifecycle}.json`. Screenshots read:
`docs/architecture/*.visual-check.1440x900.light.png` (all four) and `*.2048x1320.dark.png` (data flow, lifecycle).

Baseline: all four specs validate at showcase (9 artifact checks, 0 errors, 0 warnings; architecture needs
`--repo-root <repo>`), and every delivered `visual-check.json` reports `pass`.

Proof of the fixes: every change below was applied to copies in the scratchpad and re-validated at showcase; all four pass
(9 checks, 0 errors, 0 warnings). The data-flow and lifecycle copies were also delivered and `visual-check`ed: pass at
1440x900, 1600x1000, 1920x1080, 2048x1320. Patched copies:
`/private/tmp/claude-501/-Users-aarvingeorge-Documents-Climb-Profile-Builder-tech-personal-projects-tax-workpaper-project/9cc2f380-a009-45a0-913e-e17f89510bc5/scratchpad/fixed/`.

## 1. Factual accuracy, doubt by doubt

| Doubt | Code says | Verdict |
|---|---|---|
| Data-flow legend: dashed = "async batch" | Renderer default (`renderers/shared/i18n.mjs:51`). The two dashed flows are `verify-findings` (synchronous, every request: `src/server/state.ts:69-70`) and `staff-events` (a synchronous POST). Nothing is async or batch. | **Wrong. Must-fix** (legend override). |
| "Client screens: final return" | Clients get `OUTSIDE_SCREENS = home, documents, filing` (`policy.ts:13`); findings filtered to `f.plain` (`state.ts:70`); events: questions to them, their answers, the signing record (`project.ts:123-132`); Filing shows the finalized return's key amounts to sign (`components/client/signing.ts`). | Incomplete: questions and plain findings are the bigger share. Should-fix label. |
| Examiner edge "masked, frozen" | Examiner receives zero events (`project.ts:131` `own = []`), the Letter 566 plus the documents traced from the items under examination (`policy.ts:400-441`); text masked like any uncleared role (`maskText`). "Frozen" is a property of the return at the 2028 story time (`clock.ts:22-25`), not of what flows to the examiner. | Misleading word. Should-fix: "masked, exam items only". |
| Where the packet SHA-256 is checked | Build/test time only: `scripts/copy-packet.mjs` (prebuild, predev, `npm test`). At runtime nothing re-hashes the packet for its own sake; `src/domain/ai/load.ts:27-37` hashes `data/packet.json` to compare with the payload's `packetSha`. | System node sublabel "SHA-256 checked" is true but hides *when*. Should-fix: "SHA-256 at build". The data-flow card wording ("checked against its SHA-256") is acceptable. |
| Lifecycle "Signatures stale" as a state | `stageAt` (`clock.ts:30-42`) reads only the packet timeline and e-file records against the story clock; **no workpaper event ever changes the stage**. Staleness is an overlay: `project.ts:79-81` (sign-offs, including the partner's on `return`) and `signing.ts:88` (client signatures vs fingerprint). Re-signing is allowed while not frozen (`policy.ts:309-314`). | The sublabel already admits "stage stays Approval", so not false, but it reads as a stage. Should-fix wording + card line "stages follow the story clock". Also note a value can still change during Filing (frozen only from federal acceptance, `policy.ts:153`). |
| "Approval (8879s signed 10 Jul)" vs the partner's approval inside Review | `stageAt` returns `Approval` from the first `/8879/` timeline event (10 Jul 2026 20:05Z, `tl-20`). The partner's approval is a `signoff` on claim `return` refused while `state.blockers.length` (`policy.ts:255`), and the clients can only sign after `returnApproved` (`policy.ts:310`). So the partner approves *inside Review*; the stage named Approval starts with the client signatures. | The box and the Gates card ("each spouse signs ... after approval") read as a contradiction at a glance. **Must-fix** by wording. |
| Rejection fix inferred from D71 | Packet: `efile[0]` 13 Jul 17:04Z rejected `R0000-504-02` (dependent 2 TIN/name); `tl-22` 13 Jul 19:02Z `document_received` refs `D71` (Social Security card, Theo) and `msg-10`; accepted 14 Jul 16:22Z. Ledger `GT-A05` ("Theo's SSN entered wrong in the organizer, transposed digits, caused the e-file rejection") cites msg-10: "I must have typed his number wrong in the organizer." | Supported by packet evidence, not a guess. Should-fix: name GT-A05 so the lifecycle points at a ledger finding (deliverable 3). |
| System: reader -> harness "payload to score" | `ai/harness.ts:21-24` reads the *file* `data/ai-suggestions.json` (and `ai/adjudication-v2.json`), never the reader process. Direction is right (same laptop), wording implies a live hand-off. | Should-fix label: "written payload, scored offline". |
| Reader -> suggestions "writes at ingest" crosses laptop -> Vercel | The file is committed to git and reaches Vercel through the build (`next.config.ts` outputFileTracingIncludes). | Should-fix: "writes at ingest, committed". |
| 1,000 partner threshold | `policy.ts:101-105` parses it from `firm.starter_standards.rules` ("Any adjustment with a tax effect over 1,000 ... requires partner sign-off"). `project.ts:105-111,147-152` turns it into a *blocker*; `notify.ts:112-115` notifies the partner. `can()` never refuses the adjustment for it. | Sequence author's correction confirmed; no diagram claims otherwise. |
| Self-review | Not asserted in any of the four diagrams. | Nothing to fix. |

Other facts checked and confirmed: 10 roles (`policy.ts` buildRoles: 6 staff + 2 clients + next-year persona + examiner);
27 checks (`grep -c "id: 'GT-"` catalogue = 27) in 15 family files; `vercel.json` buildCommand `npm test && npm run build`;
5 s poll (`LiveRefresh.tsx` `every = 5000`, `after=${seen.current}`); `INSERT ... COALESCE(MAX(seq),0)+1 ... RETURNING seq, at`
with retry on `23505` (`postgres.ts:9-11,45`); 409 carries `newer` events (`state.ts:113`, `policy.ts:159`); server sets
`ws, role, storyAt` (`state.ts:116`); reviewer adjustment defaults to `status: applied` (`state.ts:100-102`); F540NR.72 is
"2025 California estimated tax payments", v3 value 14000; toast text rule `${who} changed ${what}` (`notify.ts:98`); model
`claude-sonnet-5-5`, `promptVersion reader-v2`, `packetSha` matches `copy-packet.mjs` (`data/ai-suggestions.json` envelope);
hand-off deadline 2026-03-27; CA `STATE-HOLD` 13 Jul, CA accepted 15 Jul 02:10Z.

One label is self-contradictory in the system diagram: "Reviewer browser" with sublabel "10 roles" (the reviewer is one of the
ten; Daniel). **Must-fix** (cheap). `GitHub main` typed `messagebus` is a styling choice the skill forbids ("never let a badge
replace the semantic type"); `external` is honest.

Missing items a grader would look for: the role switcher (system card only; now in the browser node), masking at the API
(nowhere on the data flow; added to card 3), the role on every request (sequence), the Priya page re-render being a *page*
render, not the API route (sequence participant sublabel).

## 2. Coherence across the four

- Names agree: Neon Postgres / `workpaper_events`, packetSha, 27 checks, 5 s poll, Form 8879 + FTB 8879, "amend on top".
- One inconsistency: the system diagram says "Reviewer browser", the sequence has two named browsers; after the fix the
  system node is role-neutral.
- One gap: nothing says that stages come from the story clock while sign-offs and signatures come from events; the lifecycle
  fix adds it, which also explains why "Signatures stale" is not a stage.
- Together they cover inputs, AI at ingest (system), verification and merge (data flow), events and projection (data flow +
  sequence), roles (system card, data flow screens), lifecycle, delivery (system). Delivery's "docs-only commits skip builds"
  is absent and not needed.

## 3. Readability for a video (screenshots)

- System: balanced, labels legible at 1440 and 2048. No empty band.
- Data flow: fine; the legend is the only wrong text on screen. Stage columns are tall (row 0 used only by the examiner), but
  no conspicuous lower band at 2048x1320.
- Sequence: clear; the second segment is easy to follow. The "re-render + toast" arrow leaves the *API route* lifeline, which
  is the one thing a careful viewer will question.
- Lifecycle: **a conspicuous empty band** "03 / Outcomes" at every size (the renderer always draws the outcome band; it is
  empty because no state uses lane id `terminal`). Moving "Amend on top" to a `terminal` lane fills it and reads better
  ("after filing" sits below "Filed"). The hourglass icon kisses the end of "Signatures stale"; "Re-sign needed" fits.

## 4. Fix list (exact JSON; all validated at showcase on copies)

### system.architecture.json
Must-fix
- `components[id=browser].label` -> `"Browser (any role)"`; `.sublabel` -> `"role switcher · no sign-in"`.
Should-fix
- `components[id=github].type` -> `"external"`.
- `components[id=packet].sublabel` -> `"read-only · SHA-256 at build"`.
- `components[id=suggestions].sublabel` -> `"read-only · packetSha gate"`.
- `connections[id=browser-to-server].label` -> `"POST events · GET state (5 s poll)"`.
- `connections[id=domain-to-events].label` -> `"store adapter: append / read"` (the store lives in `src/domain/store`; a longer
  domain sublabel fails desktop-readability, tried).
- `connections[id=reader-to-suggestions].label` -> `"writes at ingest, committed"`.
- `connections[id=reader-to-harness].label` -> `"written payload, scored offline"`.

### data.dataflow.json
Must-fix
- add `meta.legend` = `{"entries":{"dashed":{"label":"AI rows / write-back"}}}` (a longer label overlaps the next legend swatch, seen).
Should-fix
- `flows[id=projection-examiner].label` -> `"masked, exam items only"`.
- `flows[id=projection-client].label` -> `"questions, finalized return"` **and** add `labelAt: [853, 238]` (without it the
  longer label overlaps `projection` and `client`; this is the validator's own suggested position).
- `nodes[id=eventlog].tag` -> `"source of truth"`.
- `cards[2].items[1]` -> `"State is masked per role at the API; clients and the examiner never receive AI suggestions"`.

### adjust.sequence.json
Must-fix: none (every message matches `state.ts`, `postgres.ts`, `LiveRefresh.tsx`).
Should-fix
- `participants[id=route].sublabel` -> `"api/w/[ws]/* + page render"`.
- `messages[id=post].label` -> `"POST events?role=daniel (F540NR.72 = 10500)"`; `.note` ->
  `"type adjustment, status applied (reviewer), baseVersion = the version Daniel opened"`.
- `messages[id=poll].label` -> `"GET state?role=priya&after=lastSeq"`.
- `messages[id=load]` add `note: "projects and masks for Priya"`.
- `messages[id=render].label` -> `"router.refresh(): page re-render + toast"`.
- `cards[0].items` append `"403 also: a read-only seat, or a person not yet active on the story clock"`.

### return.lifecycle.json
Must-fix
- Empty outcome band: `lanes` -> `[{"id":"main","label":"Return stages (stageAt, story clock)"},{"id":"detours","label":"Detours (stage unchanged)"},{"id":"terminal","label":"After filing"}]`;
  `states[id=amend].lane` -> `"terminal"` (keep `col: 2`); `meta.viewBox` -> `[1000, 632]` (the terminal band needs the
  height; 640 overflowed 1440x900 with the longer card copy, 632 with the copy below passes every viewport).
- Approval wording: `states[id=approval].sublabel` -> `"clients sign 8879s 10 Jul"`; `cards[0].items` ->
  `["Review starts at the 27 Mar hand-off; stages follow the story clock","Partner approves inside Review, with zero blockers","Approval stage: each spouse signs 8879 and FTB 8879 (10 Jul)"]`.
Should-fix
- `states[id=stale].label` -> `"Re-sign needed"`; `.sublabel` -> `"overlay; stage unchanged"`.
- `cards[1].items[2]` -> `"GT-A05: Theo's SSN transposed; card D71 13 Jul, accepted 14 Jul"`.

After applying: re-run `deliver` for each and `visual-check`; the lifecycle needs its new viewBox or validation fails with
"State amend exceeds the vertical lifecycle area".
