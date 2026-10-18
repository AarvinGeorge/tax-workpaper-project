# UX patterns for navigating time in software (for the workpaper "story clock")

Context: the target design is one clock per shared workspace, a dropdown of timeline events plus "Move clock" in the top bar, past is view-only (acting only at the latest point), and every screen re-renders as of the chosen time. Research done 18 Oct 2026 from official help pages, docs and repos. Screenshots are described in words from the help text; I did not capture images.

## 1. How products present and move through time, and how they signal "you are viewing the past"

### Takeaway
Almost every product uses the same shape: a side panel or rail of **discrete, labelled stops** (versions, captures, backups, actions), a clear way **back to the current state**, and **restore as a separate, deliberate action**. The "you are in the past" signal is usually weak. Wikipedia's text banner is the clearest. Figma and Google rely on the panel being open plus a "Back" or "Edit current version" exit. Several tools gate history to editors only.

### Cited Findings

**Google Docs / Sheets / Slides version history**
- Opened by clicking **Last edit** at the top right. Hovering shows who last updated and when, and a blue dot means the file changed since you last viewed it. History opens as a **right-side panel**. You select a version to see who changed what, and grouped versions expand with an arrow — [Google Docs Help](https://support.google.com/docs/answer/190843)
- Exit is a **Back** button at the top left that "returns you to the current version". No distinct "current version" label is described — [Google Docs Help](https://support.google.com/docs/answer/190843)
- Named versions: **More > Name this version** (up to 40 per doc, 15 per spreadsheet), plus a filter toggle **Only show named versions**. This is a "milestones vs autosaves" filter — [Google Docs Help](https://support.google.com/docs/answer/190843)
- In Sheets, unmodified rows are hidden by default in history, with **Show unmodified rows** to reveal them. This is a "show only what changed" default — [Google Docs Help](https://support.google.com/docs/answer/190843)
- Restore takes two steps: **Restore this version**, then confirm **Restore**. Restoring a spreadsheet clears the cell-by-cell edit history for earlier changes. **Make a copy** branches a version into a new file — [Google Docs Help](https://support.google.com/docs/answer/190843)
- Selecting a version only shows a preview and does not bring it back — [Allegheny College library tip](https://sites.allegheny.edu/library/?p=11109)
- **Permissions:** you need edit permission to browse earlier versions. Viewers cannot see history — [Google Docs Help](https://support.google.com/docs/answer/190843)

**Figma version history**
- File name menu > **Show Version History** opens a **right sidebar timeline running from now back to the file's creation**. Named versions show name, description, date/time and main contributor. Autosave checkpoints (every 30 minutes, and after a crash or lost connection) are grouped and expandable, and **Show older** pages back further — [Figma Help](https://help.figma.com/hc/en-us/articles/360038006754)
- Viewing a past version is **effectively view-only**. You can switch pages, select and copy with the Move tool, pan, and export. You must restore to edit layers. The help article describes no banner. The exit is **Edit current version** — [Figma Help](https://help.figma.com/hc/en-us/articles/360038006754)
- Restore is **non-destructive**: it adds two checkpoints, one saving the current state and one for the restored version. **Duplicate** branches a version into a new file — [Figma Help](https://help.figma.com/hc/en-us/articles/360038006754)
- Permissions: anyone with view access can browse history. Creating, naming or restoring versions needs edit access — [Figma Help](https://help.figma.com/hc/en-us/articles/360038006754)
- Users struggle with this. Forum threads report restores that "did not work", files that went back to the previous version after clicking **Done**, and "can't edit restored version from history, view only". The mode boundary between viewing history and editing is easy to misread — [Figma forum: restoring doesn't work](https://forum.figma.com/ask-the-community-7/restoring-version-does-not-work-for-me-12957); [Figma forum: can't edit restored version, view only](https://forum.figma.com/archive-21/can-t-edit-restored-version-from-history-view-only-791); [Figma forum: reverts on Done](https://forum.figma.com/t/restoring-version-does-not-work-for-me/87643)

**Notion page history**
- Opened from the `•••` menu > **Version history**, and requires Can edit access. A window lists past versions. Selecting one shows the page at that time **with highlights of what changed**: text edits, added or removed blocks, some non-text and database changes. Highlights do not capture every change — [Notion Help](https://www.notion.com/help/duplicate-delete-and-restore-content)
- Snapshots are taken every 10 minutes while editing and 2 minutes after the last edit. A **preview of what will change** appears before restoring. Partial recovery works by copying blocks from an old version. Restore is reversible through history — [Notion Help](https://www.notion.com/help/duplicate-delete-and-restore-content)
- A known pitfall: restoring a database brings back pages and properties but not the text inside those pages, and "may affect existing views and how other people see it", so a restore changes the shared state for everyone — [Notion Help](https://www.notion.com/help/duplicate-delete-and-restore-content)
- Retention: Free 7 days, Plus 30, Business 90, Enterprise unlimited — [Notion Help](https://www.notion.com/help/duplicate-delete-and-restore-content)

**Wikipedia / MediaWiki old revisions (the clearest "past" banner)**
- The old-revision banner reads: "This is an old revision of this page, as edited by $2 at $1$7." It continues: "The present address (URL) is a permanent link to this revision", which "may differ significantly from the current revision" — [MediaWiki:Revision-info on en.wikipedia](https://en.wikipedia.org/wiki/MediaWiki:Revision-info)
- A secondary line reads "Revision as of $1 by $2" — [MediaWiki:Revision-info](https://en.wikipedia.org/wiki/MediaWiki:Revision-info)
- Wikimedia deliberately **hides the "Last edited … ago by …" footer on old revisions** and keeps it on the current one, so that "now" cues do not appear on past views — [Phabricator T153125](https://phabricator.wikimedia.org/T153125)

**GitHub blame / file history**
- **Blame** shows code grouped by commit, with author, message and date beside each group. The versions icon **View blame prior to this change** steps back one commit for that block of lines, so you move through time per line rather than per file — [GitHub Docs](https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files)
- The page documents no "you are viewing an older commit" indicator for blame — [GitHub Docs](https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files)

**Excel "Show Changes"**
- The pane shows "who changed what, where, and when" and **the previous value of the cell**. It can be filtered to a sheet, range or cell, including from a right-click on the selection. Bulk edits collapse into a card with **See changes** — [Microsoft Support](https://support.microsoft.com/en-us/office/show-changes-that-were-made-in-a-workbook-978ceea7-bbf6-4337-bca7-22e7cc9892e8)
- If others edit while the pane is open, a **See New Changes** button refreshes it, so the pane does not live-update — [Microsoft Support](https://support.microsoft.com/en-us/office/show-changes-that-were-made-in-a-workbook-978ceea7-bbf6-4337-bca7-22e7cc9892e8)
- Retention is 60 days in the current article; an older version of the article said 365 — [Microsoft Support](https://support.microsoft.com/en-us/office/show-changes-that-were-made-in-a-workbook-978ceea7-bbf6-4337-bca7-22e7cc9892e8)
- There is no per-change revert. You copy the old value back by hand — [xelplus](https://www.xelplus.com/show-changes-in-excel/)

**Grafana time-range picker**
- Relative presets ("Last 30 minutes", "Yesterday", "This week so far") have a filter box, and typed shorthand such as `13h` works. Absolute **From / To** fields take exact or relative values (`now-24h`), plus a calendar, with **Apply time range**. Recently used absolute ranges are listed. Semi-relative ranges (fixed start to `now`) are also supported — [Grafana docs](https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/)
- Zoom out with an icon, `t-` or a double-click. Zoom in by dragging across a graph or with `t+`. Copy and paste a time range between dashboards with `t+c` and `t+v` — [Grafana docs](https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/)
- **Time lives in the URL** (`?from=now-5m&to=now`, `time` + `time.window`, `timezone`), so a link carries the time position — [Grafana docs](https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/)
- Dashboards do not auto-refresh by default. A refresh dropdown sets an interval — [Grafana docs](https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/)
- Amazon Managed Grafana documents the same controls, including Ctrl/Cmd+Z for zoom out — [AWS Managed Grafana docs](https://docs.aws.amazon.com/grafana/latest/userguide/dashboard-time-range-controls.html)

**Wayback Machine calendar + timeline**
- A **year bar graph** above the calendar picks a year and shows roughly how often the site was captured, like a histogram or sparkline. The calendar below shows dots on captured days. Dot colour encodes the HTTP status: blue 2xx, green 3xx, orange 4xx, red 5xx — [Internet Archive blog FAQ](https://blog.archive.org/2016/10/24/faqs-for-some-new-features-available-in-the-beta-wayback-machine/)
- Hovering a dot lists individual captures. A "why" link explains which crawl each capture came from, so every capture has a stated provenance — [Internet Archive blog FAQ](https://blog.archive.org/2016/10/24/faqs-for-some-new-features-available-in-the-beta-wayback-machine/)
- The capture URL embeds the timestamp (`/web/20200115143000/…`), making it shareable and permanent. A separate "Changes" calendar shades days grey to blue by how much the page changed — [Search Engine Journal](https://www.searchenginejournal.com/Wayback-machine-now-shows-when-a-page-was-updated-and-what-changed/)
- Larger dots mean more captures that day. This comes from a secondary source only — [MSOE LibGuide](https://libguides.msoe.edu/searching101/wayback-machine)

**Apple Time Machine**
- Arrows next to the Finder window step through backups, and a **timeline on the right edge** lists them. The currently selected backup is **highlighted in red**. A pulsing or dark-grey tick means the backup is still loading or validating. **Restore** puts items back in their original location — [Apple Mac User Guide](https://support.apple.com/en-au/guide/mac-help/restore-files-mh11422/mac)
- Inside some documents, **File > Revert To > Browse All Versions** opens the same view per document — [Apple Mac User Guide](https://support.apple.com/en-au/guide/mac-help/restore-files-mh11422/mac)

**Google Earth historical imagery slider**
- Open it with the clock / **Time** control above the viewer. The slider has a **notch for every available image** for the current view, and shows each image's day, month and year — [Google News Initiative training](https://newsinitiative.withgoogle.com/resources/trainings/google-historical-imagery-google-earth-maps-and-timelapse)
- In Earth on the web, **years are marked by dots and smaller dots indicate additional months**. Turning historical imagery on **switches off 3D buildings**, so a feature that cannot be shown as of that time is disabled rather than shown wrongly — [Google Earth developer docs](https://developers.google.com/maps/documentation/earth/historical-imagery)
- You can zoom the timeline to change the date span covered — [Google Earth Help](https://support.google.com/earth/answer/148093)

**Redux DevTools / Elm / Replay.io (time-travel debugging)**
- Redux DevTools offers "hot reloading, action replay, and customizable UI". It runs as a browser extension, a standalone app, or an embedded React component — [reduxjs/redux-devtools](https://github.com/reduxjs/redux-devtools)
- Replay.io: comments are **pins dropped at a point in time** on the timeline. Clicking a comment jumps to and pauses at that execution point. **Shared URLs include the execution point you're paused at.** You can scrub the playhead or click an event row to jump there — [Replay docs: commenting](https://docs.replay.io/reference-guide/debugging/commenting); [Replay docs: timeline annotation](https://docs.replay.io/basics/replay-devtools/time-travel-devtools/timeline-annotation); [Replay Viewer docs](https://docs.replay.io/reference-guide/viewer)

### Inferences
- The closest analogue to the story clock is **Replay.io / Redux DevTools / Google Earth**: a list of discrete events with a jump-to-event action, where the whole view re-renders as of that point. Document-history tools (Docs, Figma, Notion) re-render too, but only one document.
- The established "past" signals are: (a) a persistent text banner naming the point in time and who or what caused it (Wikipedia); (b) removing "now" cues such as the last-edited footer (Wikipedia); (c) a coloured marker for the selected stop (Time Machine red); (d) a single labelled exit back to current ("Back", "Edit current version"). None of the big document tools pairs a strong banner with this, and that is where Figma users get confused.
- "Past is view-only, act only at latest" matches Figma's model, where you must restore or exit before editing. The story clock has no "restore", so the only exit is "return to latest", which makes the exit simpler and the banner more important.
- Disabling a feature that has no meaning as of that time (Earth turning off 3D buildings) is a good pattern for workpaper actions that did not exist yet at the chosen point.

### Gaps
- I could not fetch the Elm 0.18 debugger article (page body empty) or Redux DevTools' slider-monitor README, so their exact controls (pause, resume, commit, revert, jump, skip) are unverified here.
- Kibana's time picker, GitHub's commit-browsing ("browse repository at this point") indicator, and the current Excel "Version history" view were not checked.
- I captured no screenshots. The descriptions come from the help text.

## 2. Freely available / open-source patterns and licences

### Takeaway
The timeline components worth borrowing are permissively licensed (vis-timeline Apache-2.0 OR MIT; react-chrono MIT; Redux DevTools MIT). Grafana's picker is AGPLv3, so learn from its interaction model rather than lifting its code.

### Cited Findings
- **vis-timeline**: dual-licensed, Apache 2.0 or MIT, per its bundled LICENSE file — [Apache Spark's copy of LICENSE-vis-timeline](https://apache.googlesource.com/spark/+/master/licenses/LICENSE-vis-timeline.txt); [DepScope listing](https://depscope.dev/pkg/npm/vis-timeline)
- **react-chrono**: MIT according to third-party listings. Sources disagree on the latest version (2.6.1 vs 3.3.3) — [Snyk](https://snyk.io/advisor/npm-package/react-chrono); [DepScope](https://depscope.dev/pkg/npm/react-chrono)
- **Redux DevTools**: MIT — [reduxjs/redux-devtools](https://github.com/reduxjs/redux-devtools)
- **Grafana** (including its time picker in core) moved from Apache 2.0 to **AGPLv3** in April 2021. Plugins, agents and some libraries stayed Apache — [Grafana blog](https://grafana.com/blog/2021/04/20/grafana-loki-tempo-relicensing-to-agplv3)

### Inferences
- For a story clock with a few dozen discrete events, a native `<select>` or a listbox needs no library. vis-timeline would only be worth adding for a zoomable visual track.
- AGPL code in a hosted web app brings source-disclosure duties, so copying Grafana picker code is not advisable. Reimplementing its interaction ideas (presets, typed values, time in URL) is fine.

### Gaps
- I did not read react-chrono's LICENSE file directly, so its licence rests on Snyk and DepScope only.
- Whether `@grafana/ui` (the component library) is Apache or AGPL was not confirmed; the blog says "certain libraries" stayed Apache without naming them in what I read.

## 3. Specific design guidance: banner wording, return to now, event markers, discrete vs continuous, shared vs per-user time, diffs, slider vs select accessibility

### Takeaway
Use discrete stops labelled with the event and its time, a persistent banner in Wikipedia's format ("You are viewing X as of <event>, <time>"), a single "Return to latest" exit, and a **select or listbox rather than a slider** as the main control (sliders have known touch and assistive-tech problems). Put the time position in the URL. Show change between points as "previous value" or highlights, as Excel and Notion do.

### Cited Findings
- **Banner wording model:** "This is an old revision of this page, as edited by [who] at [when]… The present address (URL) is a permanent link to this revision" — [MediaWiki:Revision-info](https://en.wikipedia.org/wiki/MediaWiki:Revision-info)
- **Remove "now" cues on past views:** Wikimedia hides the "Last edited … ago" footer on old revisions — [Phabricator T153125](https://phabricator.wikimedia.org/T153125)
- **Return-to-now affordances:** Google uses "Back" (top left) — [Google Docs Help](https://support.google.com/docs/answer/190843). Figma uses "Edit current version" — [Figma Help](https://help.figma.com/hc/en-us/articles/360038006754). Grafana uses relative ranges anchored to `now` — [Grafana docs](https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/)
- **Event markers:** notches, one per available image, with dates — [Google News Initiative](https://newsinitiative.withgoogle.com/resources/trainings/google-historical-imagery-google-earth-maps-and-timelapse). Dots by year, smaller dots by month — [Google Earth dev docs](https://developers.google.com/maps/documentation/earth/historical-imagery). Comment pins at execution points — [Replay docs](https://docs.replay.io/reference-guide/debugging/commenting). Status-coloured capture dots — [Internet Archive FAQ](https://blog.archive.org/2016/10/24/faqs-for-some-new-features-available-in-the-beta-wayback-machine/). Red-highlighted selected backup — [Apple guide](https://support.apple.com/en-au/guide/mac-help/restore-files-mh11422/mac)
- **Named milestones vs noise:** "Only show named versions" — [Google Docs Help](https://support.google.com/docs/answer/190843). Named versions vs grouped autosaves — [Figma Help](https://help.figma.com/hc/en-us/articles/360038006754)
- **Time position in the URL / shareable:** Grafana `from`/`to` — [Grafana docs](https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/). Replay shared URLs carry the paused execution point — [Replay docs](https://docs.replay.io/reference-guide/debugging/commenting). Wayback timestamp URLs — [SEJ](https://www.searchenginejournal.com/Wayback-machine-now-shows-when-a-page-was-updated-and-what-changed/). Wikipedia permalinks — [MediaWiki:Revision-info](https://en.wikipedia.org/wiki/MediaWiki:Revision-info)
- **Showing what changed:** Notion highlights changes when viewing a version, but "highlights don't capture every change" — [Notion Help](https://www.notion.com/help/duplicate-delete-and-restore-content). Excel shows the previous value per cell, filterable to a range — [Microsoft Support](https://support.microsoft.com/en-us/office/show-changes-that-were-made-in-a-workbook-978ceea7-bbf6-4337-bca7-22e7cc9892e8). Sheets hides unmodified rows by default — [Google Docs Help](https://support.google.com/docs/answer/190843). Wayback's change calendar shades days by amount of change — [SEJ](https://www.searchenginejournal.com/Wayback-machine-now-shows-when-a-page-was-updated-and-what-changed/)
- **Shared state side effects:** a Notion database restore "may affect existing views and how other people see it" — [Notion Help](https://www.notion.com/help/duplicate-delete-and-restore-content). An Excel pane open during others' edits needs a manual **See New Changes** — [Microsoft Support](https://support.microsoft.com/en-us/office/show-changes-that-were-made-in-a-workbook-978ceea7-bbf6-4337-bca7-22e7cc9892e8)
- **Slider accessibility (WAI-ARIA APG):** arrows step, Home/End jump to first/last, PageUp/PageDown take bigger steps. Use `aria-valuetext` when the number is not meaningful; its example is a day name such as "Monday". **Warning:** "some touch-based assistive technology users may have difficulty with slider widgets", and authors should test on touch devices before production — [W3C ARIA APG Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- **Select guidance:** use a select for about 7–15 options when space is tight, radios for fewer, a combo box for more. Do not auto-submit on change, because it disrupts screen reader users — [US Web Design System](https://designsystem.digital.gov/components/select/)
- **Select pitfalls (GOV.UK-derived research):** users struggle to close selects, try to type into them, and confuse focused items with selected ones — [UK Parliament Design System](https://designsystem.parliament.uk/forms/select/)

### Inferences
- **Discrete vs continuous:** a tax workpaper's history is a set of business events (documents arrive, the client answers, a version is computed), like Replay's event rows or Earth's per-image notches, not a continuous range like Grafana's. Discrete stops avoid landing "between" events where no state is defined.
- **Dropdown + "Move clock" fits the guidance:** USWDS warns against auto-submitting a select. A separate "Move clock" confirm button follows that rule and also guards against accidental global moves. If there are more than about 15 events, a filterable combo box (Grafana's filterable preset list is the analogue) beats a plain select.
- **Shared vs per-user time:** every surveyed document tool keeps history browsing **per user**. Only a restore changes shared state, and even then Notion warns that it affects how others see the page. Moving one shared clock for everyone is therefore unusual. Mitigations drawn from the patterns: put who moved the clock and when in the banner (Wikipedia's "as edited by X at T"); make "Return to latest" one click; and consider carrying clock position in the URL (Grafana, Replay) so a link reproduces the view.
- **Banner text suggestion** (derived from the MediaWiki format): "Viewing the workspace as of *<event name>* — <date time>, moved by <user>. View only. [Return to latest]". Also remove or relabel "now" cues such as "last updated" on past views.
- **Change between two points:** Excel's "previous value → new value" per field maps directly onto a workpaper line. Notion's "not every change highlighted" caveat argues for stating plainly what the diff covers.

### Gaps
- I found no published usability study on **shared, workspace-wide time position** (one user moving time for everyone). The risk is inferred from the products, not measured.
- I found no NN/g, Material or Carbon article specifically on version-history views. See section 4.

## 4. Published usability research and design-system guidance

### Takeaway
Formal guidance is thin and mostly at the component level: WAI-ARIA on sliders, USWDS and GOV.UK-derived systems on selects, and Nielsen's "user control and freedom" heuristic for undo/exit. I found no NN/g article dedicated to version history in this pass.

### Cited Findings
- Nielsen's heuristic #3, **User control and freedom**, calls for undo/redo and a clearly marked way out ("emergency exit"), and says clear undo or cancel matters most on touchscreens — [UX Collective on heuristic #3](https://uxdesign.cc/jakob-nielsens-third-usability-heuristic-for-user-interface-design-de788590665f) (secondary summary of Nielsen)
- Abowd and Dix, "Giving undo attention" (1992), *Interacting with Computers*, discusses undo in group (shared) editors. It is the closest academic work on shared-history semantics — [Oxford Academic](https://academic.oup.com/iwc/article/4/3/317/730147)
- WAI-ARIA APG slider pattern and its touch-AT warning — [W3C](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- USWDS select guidance (7–15 options, no auto-submit) — [USWDS](https://designsystem.digital.gov/components/select/)
- GOV.UK-derived select research (users fail to close selects or try to type into them) — [UK Parliament Design System](https://designsystem.parliament.uk/forms/select/)

### Inferences
- The "Return to latest" control is a direct application of the "clearly marked exit" heuristic, and it should always be visible while in the past.
- Choosing a select plus a confirm button over a slider follows the ARIA warning and USWDS's no-auto-submit rule.

### Gaps
- NN/g articles on version history, timelines or date pickers were not found by search. nngroup.com was not fetched directly.
- Material Design and Carbon guidance on date/time pickers or history views was not retrieved.
- The GOV.UK Design System date-input page was not retrieved.
- Low-reliability claims (for example, "NN/g recommends undo over confirmation dialogs" from a skills registry) were left out.
