# The return follows the story clock; fewer screens, controls always at hand

Aarvin's intent (18 Oct): the app reads as a dump of the packet. It should be lean, with only the essential information on
each screen and the controls where people need them. Concretely:

- Moving the clock should move the whole return. On 14 Apr the return was v2, not v3.
- Fewer screens:
  - Changes and the view log become tabs of Review;
  - What-ifs become a tab of the Return overview;
  - Firm goes away.
- The clock is moved from the Story time bar.
- Reference material (firm standards, people, time, deadlines, every status legend) sits behind one "?" button.

**Rules:** minimum change, nothing that works breaks, every old link keeps working. Tier b: test first; Fable reviews
this plan and then the code; deploy; the live walk must pass.

## Part A: the return as of story time (domain, done first). Revised 18 Oct 12:40, after Aarvin's "truly temporal" call and Fable's plan review

Measured: three versions (v1 4 Mar, v2 19 Mar, v3 23 Jun); default story time = v3's computed_at; ~117 `ix.latest` reads;
the clock rule makes the past view-only and the frontier starts at v3, so history stays one line (no branches).

**A1. `indexAt(ix, at)`** (`src/domain/clock.ts` or `packet/at.ts`): a shallow copy of the PacketIndex whose `latest` is
the last version computed at or before `at`, whose `versions` are those computed by then, and whose `counts.lines/versions`
are recomputed. It **returns `ix` itself when `at >= ix.latest.computed_at`** (so caches and default views are byte-identical).
Before the first version, `latest` is a fully shaped placeholder: `version: 'none'`, `lines: []`, `diagnostics: []`,
`documents_superseded: []`, `changes_from_previous: []`, `tax_effect_rates: {}`, `carryovers_out: {}`, `computed_at` =
the first version's time, plus a flag `computed: false`. `ix.line()` and label lookups still resolve every version.

**A2. Where the projection applies.** The clock itself is derived from the STATIC index: `DEFAULT_STORY_AT`,
`frontierTime`, `stageAt`, `frozenAt`, `storyTime` and the server's write path (`postEvent`, `can()`'s frontier rule) keep `ix`.
`loadWorkspace` (`components/shell/load.ts`) computes `storyAt` from the static ix, then builds `pix = indexAt(ix, storyAt)`
and passes `pix` to the projection of claims, checks and every screen. Must-hold test: at 14 Apr `frontierAt` is still 23 Jun
and an adjustment is refused.

**A3. Checks per version:** `runChecks(pix)`, memoised in a `WeakMap<Packet, Map<version, Finding[]>>` (at most 3 runs,
14-35 ms each). `firstVisibleAt` gating stays on top. (The old A4 min-to-max change is dropped: per-version checks supersede it.)

**A4. AI suggestions** were made on the final version: shown only when `pix.latest` is the final version (explicit check in
`loadWorkspace`, and `suggestion_*` refused by the server otherwise). Same rule for the engine's what-ifs (B4).

**A5. Before the first computation** ("No return computed yet: the engine first ran on 4 Mar 2026") on the overview head and
the Forms tab; cards show it; adjustments are refused with that sentence. Rendered at 2 Mar: `/`, `/checks`, `/review`,
`/filing` must not throw.

**A6. Every role may move the clock** (`policy.ts:140`, drop the staff-only line): it is a demo instrument like Reset.
One clock per workspace, recorded as an event. The bar stays visible while a role is "not yet in the story" so the examiner
can move forward.

Unit tests first (red): `indexAt` at 14 Apr gives v2 and at default returns `ix`; `keyAmounts(pix)` 77,470 / 17,999 at 14 Apr,
77,200 / 17,845 at 10 Mar, 81,962 / 18,874 at default, empty at 2 Mar; checks at 14 Apr lack the v3-only SEP finding;
frontier test above; AI suggestions absent at 14 Apr; a client may move the clock.

## Part B: fewer screens, controls at hand (UI, after A)

**B1. Clock in the Story time bar** (`Shell.tsx`):
- The existing `ClockControl` (timeline dropdown plus "Move clock") replaces the sentence "The story clock is moved on Firm".
- For every role (A6). It uses shell classes, not `work.module.css`.
- The dropdown groups the timeline events by stage with `<optgroup>` (29 events; research: past ~15 a flat list is hard to
  scan). "Move clock" stays a separate button (USWDS: a select must not act on change).
- **Viewing the past is said up front** (research: Wikipedia's old-revision banner is the clearest pattern): when story time
  is before the latest point reached, the bar reads "You are viewing <date>, an earlier point in the story. Nothing can be
  changed here." with who moved the clock last, and a one-click **Return to latest** (moves the clock to `frontierAt`).
  Today people only learn this when an action is refused.
- The "Not yet in the story" message points to the bar instead of "Open Firm as Jo".

**B2. "?" info button:** a fixed round button at the top right, under Reset to start (`aria-label="About this
workspace: legends, firm standards, people, time, deadlines"`).
- It opens a centred native `<dialog>` via `showModal()` in a small client wrapper; it closes with Esc, the close button or a click outside. The content is
  server-rendered and passed in as children.
- Sections, collapsible, in this order:
  1. Legends: every status tag used in the app, each with its one-line meaning and term link. This covers the Forms
     key that moves here (Blocking, Check failed, Judgment, Engine warning, Adjusted, Swing, New this year) plus the
     tags that have never had a key: Note, No open checks, Signed, Stale, Proposed, Example, and As filed, locked.
  2. Deadlines on the story clock.
  3. Firm standards (rules, required steps, verification types, review levels, variance).
  4. People and clearance.
  5. Time against budget, with "Log time".
- Clients and the examiner see only Legends and Deadlines.
- The Firm section components move from `Firm.tsx` into `src/components/info/` unchanged in content.
- The Forms tab's status key row is removed, because it now lives in the dialog.

**B3. Review gains two tabs:** Adjustments | Review notes | Sign-offs | Partner items | **Changes** | **View log**.
- Changes is the whole current Changes log: filter chips, undo and "Undo all". Its what-ifs section moves to B4.
- View log is Firm's reveal log.
- Tab keys are `log` and `views`; the existing keys stay, so old links work.
- The `?kind=` filter keeps working inside the Changes tab.

**B4. What-ifs become a tab of the Return overview:** Forms | Areas | Documents | **What-ifs**.
- It is a new route `/whatifs` (ScreenKey `whatifs`, staff only), with the same overview head.
- Its content is the existing what-ifs section, unchanged.

**B5. Retire Firm and Changes from the nav:**
- `firm` and `changes` leave `ALL_SCREENS`.
- The routes stay as redirects: `/firm` goes to `/?info=1` (opens the dialog), and `/changes?…` goes to `/review?tab=log&…`
  (keeping `kind` and `claim`).
- Nav for staff becomes: Return overview, Checks, Review (B7, B8; `whatifs` joins `OVERVIEW_TABS`).
- The new Changes tab's region is labelled "Change log" (Review's Adjustments region is already `aria-label="Changes"`).
- Banner texts that name Firm or Changes are reworded. Jo's becomes "…you move the story clock from the bar above."

**B7. Retire the staff Filing page** (Aarvin, 18 Oct 12:41: "a dump of information… no functionality"). The brief still
requires "extensions, filing, e-file rejections, the client's copy. Freeze at filing; amend on top. Answer a notice… Carry
everything forward… plan next year" and "client approval and e-file signature", so each essential moves, compactly:
- **Filing status** under the overview cards (OverviewHead, all overview tabs, staff): one line per jurisdiction, following
  the clock: "Not sent" / "Rejected <date>: <reason>" / "Accepted <date>", plus "Extension filed <date> with <amount>,
  estimated from <version>" when visible, plus "As filed, locked" once frozen, plus each agency notice once visible
  ("<agency> <type> dated <date>", linking its document). Reuse the data reads now in `Filing.tsx` (efile, extension,
  notices); no new domain logic. The earlier "For comparison" row is dropped (the cards are right beside it).
- **Signatures**: `StaffSigning` (who signed, stale) moves into Review's Approval box.
- **Carry forward and next year**: AfterFiling's carryovers list shows for every staff role after filing (not only `next`),
  plus the next-year plan rows now on Filing (estimate due dates), compactly.
- **Outside filings and related returns**: the Filing section moves to the Areas tab, at the end.
- **Cut**: "Timeline to story time" (the clock dropdown is the timeline), "The fix" events, the "Designed, not built" boxes
  (they are in the hand-in write-up).
- `filing` leaves the staff screen list; `/filing` for staff redirects to the overview root. **Client and examiner Filing
  screens stay unchanged** (clients sign there; the examiner reads the items under examination).

**B8. Findings leaves the nav**: `findings` leaves `ALL_SCREENS`'s nav (route stays and works for staff) and is linked
from the "?" dialog: "Known packet mistakes (case study): the ledger and the check that catches each".

Staff nav after B: **Return overview** (Forms · Areas · Documents · What-ifs), **Checks**, **Review** (Adjustments ·
Review notes · Sign-offs · Partner items · Changes · View log).

**B6. Tests:**
- New e2e: the clock bar moves the clock; "?" opens the dialog with legends, Esc closes it, and a client sees only
  legends and deadlines; Review's Changes and View log tabs; the What-ifs tab; the redirects; at 14 Apr the cards show
  77,470 / 17,999 and the header says v2.
- Update the e2e tests that open `/firm` or `/changes` or read the Forms key to the new homes. The acceptance walk keeps
  its 36 steps, with only addresses updated.
- Update the video click guide wherever it says Firm or Changes.

## Out of scope

- Working in the past and carrying changes forward through later engine runs (branches); the past stays view-only.
- Restyling the content of any moved section.
- Changing the hand-in PDF until Aarvin asks.
