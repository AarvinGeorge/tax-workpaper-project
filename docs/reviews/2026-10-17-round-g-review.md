# Round G review: shell layout and notifications

Reviewer: Fable 5.1 (cross-model), read-only. Written 17 Oct 2026, 13:25-13:45 EDT (`date`: Sat Oct 17 13:25:56 EDT 2026).
Scope: the uncommitted working tree (`git status` at 13:25: 8 modified, 9 untracked files) against
`docs/build/round-g-plan.md` sections 2 and 3, `docs/design/hybrid/FIX-ROUND-H3.md` B and C, `docs/brief.txt` lines 34 and 41,
and the notification findings in `docs/reviews/2026-10-17-gap-audit.md`.

Method: built and ran the app locally (`npm run build && npx next start -p 3400`), two Playwright probe scripts
(`probe.mjs`, `probe2.mjs`, in the session scratchpad), curl probes against the events and state APIs, the full
unit and e2e suites. Every finding names its probe; anything not reproduced is labelled hypothesis. SSNs: none written.

## 0. Verdict

Ship it after the two one-line CSS fixes in section 2. No must-fix. Every notification rule I could probe behaves as the
H3 rules and the brief say; the layout holds at 901-2560 px and on phones except a 12-47 px header overflow that is new
in this round. Server stopped after the review (`pkill -f "next start -p 3400"`).

## 1. Checks run (all in the same pass, 13:26-13:40 EDT)

| Check | Result |
|---|---|
| `npm test` | 16 files, **233 passed**, 1.48 s (exit 0 under `pipefail`) |
| `npm run typecheck` | clean (exit 0) |
| `npm run scan` | `ssn scan: values 5 hits 0` (the scan can hit: 5 values loaded) |
| `E2E_BASE_URL=http://localhost:3400 npx playwright test` | **34 passed**, 28.5 s |
| Build | `next build` clean; server answered 200 on `/w/rg-review/daniel` |

## 2. Findings, ranked

### Must-fix (blocks shipping)
None.

### Should-fix

1. **Phone header overflows the viewport; the bell hangs off the right edge.** `project-build/src/app/globals.css:198`
   (`.sh-tools { display:flex; gap:10px; margin-left:auto }`) has no wrap or shrink, so at 390 px the group is 386 px
   wide and the bell button ends at x=402 (badge at 407); at 360 px the same 402/407 (42 px off-screen).
   Probe: Playwright, viewport 390 and 360 (no mobile emulation): `document.documentElement.scrollWidth` 402-407 vs
   `innerWidth` 390/360; the only elements with `right > innerWidth` are `div.sh-tools`, `div.bell`, `button.bell-btn`,
   `span.bell-count`. Baseline on the committed deploy (taxmark-workpaper.vercel.app, same URL, 390 px): scrollWidth 390,
   no bell. With mobile emulation the layout viewport grew to 411 px, so a real phone zooms out slightly.
   Fix (one rule): `@media (max-width: 899.98px) { .sh-tools { flex: 1 1 100%; flex-wrap: wrap; min-width: 0; } }` or
   give `.sh-role .select` `max-width: 100%` and `.sh-tools` `min-width: 0; flex-wrap: wrap`.

2. **At exactly 900 px both media queries match and the drawer jumps to the left of the nav.**
   `globals.css:84` (`@media (max-width: 900px)`: `.sh-pane-r.open { order: -1 }`, `.sh-pane-l { max-width: none;
   border-right: 0; border-bottom: ... }`) and `globals.css:180` (`@media (min-width: 900px)`: nowrap row) both apply.
   Probe: Playwright viewport 900x800, `/daniel/return?claim=line:F540NR.72`: pane order `sh-pane-r x=0 (w 287)`,
   `sh-pane-l x=287`, `sh-pane-c x=507`; at 901 px the order is l 0, c 220, r 601 (correct), and 960/1024/1100 correct.
   Fix: change line 84 to `max-width: 899.98px` (one token).

3. **Bell panel has no Escape or outside-click dismissal.** `project-build/src/components/shell/Bell.tsx:46-63`
   toggles `open` only from the bell button; `grep -c 'Escape|pointerdown|mousedown' Bell.tsx` = 0. Keyboard users must
   tab back to the button. H3 C calls it an inline panel, which is fine; the dismissal is an accessibility gap, small.
   Probe: grep (code fact); the behaviour itself is a hypothesis (not driven).

### Nits (and carried-over audit items)

4. **Staleness is still derived twice** (carried over from the gap audit, section 3). `notify.ts:73,102,121` marks a
   sign-off stale on any applied adjustment after it; `project.ts:78` marks it stale only when `sameValue(value,
   current) === false`. Drift case: a value changed and changed back shows "not stale" on the screen and "is stale" in
   the bell. Hypothesis, not probed.
5. **Literal `'priya'`** in `notify.ts:50` (carried, audit B13/B14). `firm.assignment_at_start.preparer` is `st-01` in the
   packet; the seat can come from there. Harmless today.
6. **Toast shows only the newest of several arrivals** (`Bell.tsx:33`, carried). One clock move from 23 Jun to 16 Jul
   lands three notices for Erik and one toast (probe H3). Acceptable; the file comment still does not say so.
7. **Unread count before read state loads.** `Bell.tsx:41` filters by `read` without waiting for `ready`;
   `SinceLastLooked` (line 79) does wait. On a hard load the badge shows the full count for one frame, then drops.
   Hypothesis (SSR HTML carries `Notifications, 302 unread` for the 300-event workspace; the correction is client-side).
8. **Home computes `notificationsFor` twice** (`Shell.tsx:88` and `app/w/[ws]/[role]/page.tsx:37`). Measured cost is
   nil (below), so this is tidiness only.
9. **Poll payload.** `/api/w/<ws>/state?role=priya&after=300` returns 176,823 bytes (the full projection) every 5 s per
   tab; `LiveRefresh.tsx:23-30` now reads `state.storyAt` from it. Pre-existing shape, not round G; worth a later
   `lastSeq`+`storyAt`-only response.
10. **`note_resolved` tells the preparer, not the note's author** (`notify.ts:92-93`). H3 is silent; a reviewer whose
    blocking note was resolved would want to know. Design choice to make, not a bug.
11. **H3 C "Today / Earlier" grouping absent** (carried). Low.
12. Roles not yet in the story (Sam, the next preparer) still render a bell, empty ("Nothing for you yet"). Probe H4.
    Fine, noting it.

## 3. Layout: what was probed and held

Viewport 1440x900, Daniel (Jo for Firm), drawer open on `line:F540NR.72`, nine screens (checks, return, documents,
firm, review, changes, filing, areas, home):
- Window never scrolls: `documentElement.scrollHeight` 900, `scrollWidth` 1440 on every screen.
- Centre pane scrolls and the last element is reachable: e.g. return `scrollHeight` 19,099, scrolled to 18,361, last
  element bottom 900 = pane bottom. Changes and Areas first read as clipped (last element at 2,049 / 36,238 px with the
  pane not scrolling that far); re-measured with every `<details>` opened they are reachable (Areas `scrollHeight`
  78,072, scrolled to 77,334, last element bottom 900). The first reading measured boxes inside closed `<details>`,
  a probe artefact, withdrawn.
- No horizontal pane scroll on any screen (`scrollWidth` = `clientWidth` 819 with the drawer open).
- Search (`?q=wages`): `.sh-results` capped at 359 px (content 601, scrolls, 10 hits), centre pane keeps 378 px.
- Bell panel fully inside the viewport: x 1040-1420, y 52-267.
- Keyboard: focusing the 280th focusable in the centre pane scrolls the pane (`scrollTop` 4,021), focused element inside
  the pane, `window.scrollY` 0.
- Dark mode (`colorScheme: dark`): `.drw-head` background `oklch(0.17 0.012 255)` equals `.sh-pane-r`; `--scroll-thumb`
  resolves from `--ink2`; body background set. Screenshot `dark-1440.png` in the scratchpad.
- 901, 960, 1024, 1100 px with the drawer open: panes in l/c/r order on one row, no window scroll, bell visible
  (x 843-1042). 900 px exactly fails (finding 2).
- Phone 390 px: page scrolls as one (`scrollHeight` 7,434), bell panel fits (x 32-390). Header overflow (finding 1).
- 2560 px centring: covered by `tests/e2e/layout.spec.ts` (passed in the 34).

## 4. Notifications: rules against H3 B/C and the brief

Brief line 41 ("Several people at once. Assignments, deadlines, notifications") and line 34 ("what changed since I last
looked"): both now have a surface (bell, toast; Home "Since you last looked" from the same ids and read state).

| Rule (H3 B) | State | Evidence |
|---|---|---|
| assignment -> assignee | built | curl: Daniel assigns to Marcus -> Marcus "Daniel assigned 2025 California estimated tax payments to you" |
| review note -> addressee and preparer | built | unit `a review note also reaches its addressee`; curl Priya sees it |
| sign-off gone stale -> signer | built | unit (Helen/Priya test) |
| item over threshold -> Helen | built, measured from the value just before the change | unit `partner threshold measures each change against the value before it` (audit item resolved) |
| question to client -> named spouse only | built | e2e `client sees only their own question`; curl Ngozi only |
| client answer -> whoever asked, else preparer | built | unit `an answer reaches whoever asked` (audit item resolved) |
| e-file rejection -> preparer, reviewer, both clients, plain words | built | unit `story notices: e-file rejection`; probe H3 Erik: "The IRS returned your return; we need a document from you", no digits; staff text carries the reason "name control ... (dependent 2: Theo Lindqvist-Okafor)", a name, no identifier |
| approval requested -> Helen; client approval requested -> both spouses | not built | no such events exist yet (Form 8879 signing is U7, "designed, not built") |
| deadline warning -> assignee and Jo | built | unit `story notices: firm deadlines`; e2e Jo 2 unread at the default clock; curl Priya and Jo see both internal deadlines, Daniel/Helen/Marcus none |
| bulk actions grouped | built | unit `grouping` ("Daniel signed off 3 items", undo collapses it) |
| clock move never notifies | built | unit `moving the story clock is history only` |

Per-recipient wording (H3 B last bullet):
- **No identifier digits or PINs for any role at any clock time.** Unit `never carries a PIN, SSN-shaped text or the
  signature event` runs 10 roles x 5 clocks (incl. 2028); `safe()` (`notify.ts:43`) strips masked tails; tl-20's PINs
  are never read (only `efile_*`, `client_message`, `document_received` branches touch the timeline; `extension` detail
  unused). Probe H3 panel text for Erik at 16 Jul: `digits=false`. The 300-event page (`Notifications, 302 unread`)
  rendered with 0 scan hits in the source tree.
- **Clients only their own.** The bell reads the role's filtered projection, so staff events never reach it even when
  addressed to a client: curl posted `review_note {to:'ngozi'}` and `assignment {to:'erik'}` as Daniel (both 200) and
  neither client's bell shows them; `question_to_colleague {to:'erik'}` is refused 403. Rejection and acceptance go to
  both spouses by H3's rule.
- **Examiner gets nothing.** `notify.ts:259` returns `[]` for kind examiner; curl `/w/<ws>/irs` has no bell markup;
  unit `the examiner gets none at any clock`.

Read state, toast, reset, rewind, clock moves (Bell.tsx, readState.ts):
- Forward clock move in an open **client** tab toasts (probe H3: Erik 23 Jun -> 16 Jul, `3 unread`, 1 toast) because
  `LiveRefresh` now follows `state.storyAt` (the audit's "client tab never re-renders" gap, resolved; e2e fixme now green).
- Rewind gives no toast (probe H3: 16 Jul -> 1 Jul, 0 toasts, `none unread`); reset gives no toast (e2e Jo test).
- Role switch through the switcher (client navigation, Bell stays mounted) gives no false toast (probe H1: Daniel ->
  Priya, 0 toasts). I expected the `seen` set to leak across roles; it does not in practice (the items effect rebases
  before paint or the component remounts); not investigated further since it holds.
- Read state shared across tabs: tab B had marked Jo's two deadlines read; tab A reset; B went from `none unread` to
  `2 unread` on the storage event, no toast (probe H2). Ids are stable (`dl:<date>:<i>:passed`), so a reset from another
  browser leaves them read there; that is defensible (they were read).
- Bell and Home agree: e2e `Ngozi ... Mark all read` clears both.

Performance (runs on every render for every role): 300 events (150 notes + 150 applied adjustments, the heaviest
rules: `effectOf` per adjustment) -> Priya Home 24 ms / 193 KB, Helen 20 ms, Ngozi 16 ms, Priya Checks 29 ms; empty
workspace 17 ms. `roles()` is memoised (`metaCache`). Not a concern; the double call on Home (nit 8) costs under 5 ms.

## 5. Gap-audit notification findings: resolved?

| Audit item | Now |
|---|---|
| Partner threshold against v3 value | resolved (`notify.ts:108-113`, unit) |
| Staleness duplicated with project.ts | **open** (nit 4) |
| Answer always to the preparer | resolved (`notify.ts:134`) |
| Applied change not telling the proposer | resolved (`notify.ts:99-100`) |
| Missing H3 rules (rejection, deadlines) | resolved; approval-requested rules wait on U7 |
| Client bell href drops the claim | unchanged by design (lands on Home, which now lists the notice) |
| Toast newest-only, say so in a comment | **open** (nit 6) |
| Read state shared with "since you last looked" | resolved (`readState.ts`) |
| Today / Earlier | **open** (nit 11) |
| Literal `'priya'` | **open** (nit 5) |
| Notice identity as string ids, not seq | resolved (`Notice.id`, `loadRead` migrates numbers) |
| Pass the projection, not raw events | partly: `storyAt` is passed; events still raw (acceptable given the measured cost) |
| Since-you-last-looked as a filter on the same notices | resolved (`Bell.tsx:77-94`) |

## 6. Not reviewed

`vercel.json` build command (`npm test && npm run build`): read, not exercised. The Vercel root-directory change named in
the decision log is dashboard state, not in the tree. Screens' internal styling beyond the shell (out of scope per plan 6).
