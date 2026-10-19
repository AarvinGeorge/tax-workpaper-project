# The open item is marked and in view in its list; confident reads are tagged; the note stands out

Aarvin, 18 Oct 22:30: "when i open this link … it does not open the item from the list as well in the checks screen
… go ahead look at the root cause and address the root cause … also can you appropriately highlight this text" (the
"Confidence gave no warning" note), plus "a particular pill for this category of flags on the respective items along
with the other pill". Tier b. Plan, Fable plan review, test-first build, Fable code review, deploy, live walk.

## The symptom

`/w/<ws>/daniel/checks?claim=finding:CHK-PAYMENT-TAX-YEAR:line:F540NR.72` opens the finding in the right panel, but the
list looks untouched: the user cannot see which row is open.

## Root cause (measured in code, 22:30)

Two gaps, both app-wide patterns rather than one screen's bug:

1. **Checks rows have no selected state.** Forms lines (`FormsTab.tsx:116`, `tr.sel`) and document rows
   (`documents/page.tsx:78`, `.docrow.sel`) mark the row whose claim is open with `--accsoft`. Checks rows
   (`Checks.tsx:160`) never do; they only expand their `<details>` (`holdsCurrent`, `Checks.tsx:105,163`).
2. **No list brings its selected row into view.** Nothing in the app scrolls the centre pane to the selected row on
   arrival (the only `scrollIntoView` calls are the sign-off batch, `actions.tsx:115`, and the phone drawer,
   `actions.tsx:151`). So any deep link (a URL, the bell, search, a finding's "Sits on" link) to an item below the fold
   lands with the item out of sight, on Checks, Forms and Documents alike.

## The fix

**F1. One selected-row rule.** The row whose claim is open carries `aria-current="true"` and the existing `sel` look
(`--accsoft` background). Add it to Checks finding rows (when `current === 'finding:' + f.id`; when the open claim is a
line or document that a finding cites, the existing `holdsCurrent` expansion stays as it is, without the selected
mark). Add `aria-current="true"` to the existing Forms `tr.sel` and Documents `.docrow.sel` so all three share one
marker. Engine-blocker rows on Checks: same rule when `current === b.claimId`.

**F2. One component brings it into view.** `RevealSelected` (a client component rendered once in `Shell.tsx`, next to
`ScrollHint`), keyed on the `claim` prop: after render, find `.sh-pane-c [aria-current="true"]` that is a list row
(selector limited to `[data-finding], tr, .docrow`), and call `scrollIntoView({ block: 'nearest' })` only if it is not
already fully visible in the pane. `nearest` means a click on a visible row never jumps. Respect
`prefers-reduced-motion` (no smooth behaviour at all; instant). On phones the existing `RevealDrawerOnPhone` keeps the
drawer as the target; `RevealSelected` runs only at widths where the centre and right panes sit side by side
(`min-width: 900px`, the same breakpoint `RevealDrawerOnPhone` uses).

**F3. "Confident read" pill on Checks rows.** A neutral tag (`Tag tone="neu"`) beside the status tag on each of our
checks' rows where `confidentRange` of the finding's resolved evidence is not null, the same rule as the panel note,
staff only (Checks is staff only today). Text: "Confident read"; `title`: "Every value behind this was read at 0.95 or
above; confidence gave no warning". Not on AI rows or engine-blocker rows. Neutral so the red Blocker tag still leads.

**F4. The note stands out.** In `FindingClaim`, the note becomes a callout: `--accsoft` background, 1px full border in
`--line` (or the accent at low strength), 8px radius, 10-12px padding, the bold lead on its own line. No side-stripe
border, no icon, no new colour tokens; works in light and dark through existing tokens. Text unchanged.

## Tests first (red, then green)

- e2e, as daniel at default time, 1440 wide:
  - open the deep link above: the row `[data-finding="CHK-PAYMENT-TAX-YEAR:line:F540NR.72"]` has `aria-current="true"`,
    and it is inside the centre pane's visible area (bounding box within `.sh-pane-c`'s box);
  - exactly one finding row is `aria-current` on that page;
  - a Forms deep link to a line far down a long form (e.g. a F8949 lot) lands with its `tr[aria-current]` in view;
  - Documents deep link `?claim=doc:D68` lands with its row in view and marked;
  - the CHK-PAYMENT-TAX-YEAR row shows "Confident read"; the CHK-ANSWER-AFTER-COMPUTATION row (after moving the clock
    to the last event) does not;
  - the note has a visible background different from the panel's (computed style), and still contains its text.
- Existing tests that assert `.sel` or `aria-current` counts stay green (search first).

## Out of scope

The header count of confident reads (not asked for), Review and Areas lists, any change to findings or checks.

## Rules

Minimum change; nothing working breaks; never edit `case-study-project-package/`; no em dashes in UI copy; masking
unchanged. Verification: unit and browser suites green, build clean, screenshots (1440 and 390, light and dark) looked
at, push, poll live, walk 36/36 plus the new tests on live.

## Revisions after Fable's plan review (22:34). These override the body.

- **Pill:** qualifies on 26 of 27 rows at default time (all but CHK-PRIOR-OPEN-ITEM). Aarvin was told it would be on
  nearly every row and chose it; kept, neutral, and stacked under the status tag (status cell becomes a column flex,
  gap 4px) so it never overflows the 104px column or squeezes the title at 390.
- **Selector scoped to rows:** `[data-finding][aria-current="true"], tr[aria-current="true"], .docrow[aria-current="true"]`
  (chips and evidence links also carry aria-current="true"). Fallback on Checks for a line claim: the row holding the
  open evidence link, `[data-finding]:has([data-ref][aria-current="true"])`. `useLayoutEffect`. No smooth scrolling exists,
  so no reduced-motion branch.
- **Tests:** deep link to a deep row, `CHK-SEP-LIMIT:line:Sch1.16`, asserting `.sh-pane-c` scrollTop > 0 and the row in
  view; a no-jump test (click "Open the finding" on a visible row, scrollTop unchanged); "exactly one" counts scoped to
  rows; measure the pill inside its cell at 390.
- **Callout:** `--accsoft` background with a 1px border in the accent at low strength, mirroring `.drw-kind`.
