# Round G: checklist gaps, notifications, shell layout (plan, for Aarvin's go)

Written 17 Oct 2026, 13:10 EDT by Opus 5.5. Inputs: brief (`docs/brief.txt`), checklist (`docs/discovery/11-brief-checklist.md`),
H3 mock-up rules (`docs/design/hybrid/FIX-ROUND-H3.md` B, C), impeccable (product register, `layout` reference), the
running app. Fable's gap audit (`docs/reviews/2026-10-17-gap-audit.md`) is running and will add rows to section 4.

## 1. Intent
One round that closes what the brief requires and our build left out, with each change fitting the existing design
(events over a read-only packet, projections per role, one poll), not patched one at a time. No new infrastructure.

## 2. Shell layout (impeccable, product register)
**Problem, measured in the code:** the page scrolls as a whole (`.wp { min-height: 100vh }`; no pane has its own
overflow), so the nav, the screen and the drawer move together; the centre column is capped at 1,120px with no auto
margins (`.screen` and `.page`, two separate rules), so it hugs the left edge on wide screens.

**Design:**
- **App frame, not a page.** At widths of 900px and up the shell is exactly one viewport tall (`100dvh`); header, story bar and
  role banner stay fixed; the three panes each scroll on their own (`overflow-y: auto`, `overscroll-behavior: contain`,
  `min-height: 0`). This is the pattern the brief's borrowed references use (Claude and ChatGPT side panels, Linear's peek
  panel): you read a document on the right while the list in the centre stays where you left it.
- **Below 900px, unchanged:** panes stack and the page scrolls as one (nested scroll areas on a phone trap the thumb).
- **Quiet scrollbars:** thin, transparent until the pane is hovered, focused or being scrolled, then a soft neutral thumb;
  `scrollbar-gutter: stable` so content never jumps when it appears. macOS overlay scrollbars already behave this way;
  the CSS makes Windows and Linux match. A tiny client helper marks a pane "scrolling" for 800 ms so the thumb shows while
  wheel or trackpad scrolling without hover (touch, keyboard). Keyboard focus inside a pane shows it too (accessibility).
- **Centred centre column:** one shared container rule for `.screen` and `.page`: `max-width: 1120px; margin-inline: auto`.
  Text stays left aligned inside it (impeccable: centre the column, never centre the text). One rule, so every screen agrees.
- **Drawer:** its top block (the number and its label) stays pinned while the evidence below scrolls, so you never lose
  which number you are reading. Search results get a capped height with their own scroll so they never push the panes off.
- **Depth:** a small named z-index scale (dropdown, toast) instead of loose numbers.
- **Test:** Playwright at 1440x900: scrolling the centre pane leaves the left pane's and the drawer's scroll positions
  unchanged, and the window itself does not scroll; centre column's left and right gaps are equal within 2px; at 390px wide
  the page scrolls as one.

## 3. Notifications: one design, two sources
**Mistake owned:** the spec moved notifications to "Designed, not built" (16 Oct 23:58) though the brief requires them
(line 41) and the checklist marked them First (U1, B7). A first slice is live (bell, unread count, panel, toast, six
recipient rules); it was built before this plan, so it is reviewed here like any other code.

**Design:** notifications are one projection, `notificationsFor(ix, events, role, storyAt)`, fed by two sources with one set of
recipient rules and per-recipient wording:
1. **Firm events** (built): review note, applied or proposed change, stale sign-off, partner threshold, client question and
   answer, colleague question, assignment, return sign-off.
2. **The packet's own story, up to the story clock** (to build): the timeline's e-file rejection (preparer, reviewer, both
   clients in plain words), the client's 30 Jun and 1 Jul messages that arrived after the last computation (preparer),
   documents received after v3, and deadlines from `firm.deadlines` that are due or passed on the story clock (assignee and
   Jo). These are derived, not stored: moving the clock makes them appear, a reset clears them, no event spam.
- **"What changed since you last looked"** (brief line 34): Home shows the same notices newer than the person's last visit,
  so the bell and Home never disagree.
- **Grouping:** events sharing a `groupId` (bulk actions) become one notice ("Daniel signed off 11 items").
- **Read state:** per person and workspace in the browser (trade-off: storing every read as an event would bury the audit
  trail in clicks; a real product keeps read state server side per user).
- **Out of scope:** Play the season, OS or email notifications, live push (the 5 s poll is the delivery).
- **Tests:** unit per rule and per source (fires, stays silent, never to the actor, no identifier digits, examiner none,
  clients only their own); e2e: a rejection notice appears for Ngozi when the clock passes 13 Jul; a deadline notice for Jo.

## 4. Other checklist gaps
Filled from Fable's audit when it lands: each gap with its state, evidence, grader impact and size, and a build or skip call.

## 5. Order and time
Code freeze was 14:00. This round is about 75 minutes of build after the plan is agreed, so it ends around 14:45 unless we cut.
Proposed order: layout (independent of everything, 20 min) and notification sources (40 min) in parallel lanes with
separate files, then the top gaps from section 4, then one Fable review of the whole round with probes, then deploy and
commit. Video window 15:00-18:00 stays.

## 6. Out of scope
Server-side read state; push transport; restyling screens beyond the shell; anything the gap audit rates low impact and L size.
