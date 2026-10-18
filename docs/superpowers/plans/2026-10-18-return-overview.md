# Return overview: Home, Return, Areas and Documents become one screen with tabs

Aarvin's intent: fewer screens, cleaner and leaner. Staff land on one "Return overview": three figure cards, the
dismissible Start here card, the blocking-approval list (each row opens Checks), then tabs Forms | Areas | Documents.
Minimum change; nothing that works may break. Tier b: test first, Fable reviews this plan and then the code.

## Shape (tabs are the existing routes)

- The four routes stay (`/w/<ws>/<role>`, `/return`, `/areas`, `/documents`), so every deep link (`?claim=`), the
  drawer, the video click guide and the acceptance walk keep working. Each renders the same overview head, then its tab.
  The root shows the Forms tab (same content as `/return`).
- Staff only. Clients (Home, Documents, Filing) and the examiner keep their screens unchanged: they have three, and
  their Home is a plain-words queue, not a return overview.

## Tasks

**T1. Overview head** (`src/components/overview/OverviewHead.tsx`, server): h1 "Return overview", one sub-line with the
story time; three cards; Start here (moved unchanged from Home, still dismissible); before filing the "Blocking
approval · n" list, after filing the existing AfterFiling block (moved unchanged); then a tab bar (links, `aria-current`)
showing only tabs the role may open.
- Each blocking row links to Checks with the item open: `/checks?claim=<claimId>`.
- Removed from Home: the "Open checks" list and count, "Open all checks", "Open the return", "Open the documents"
  (the tabs and the Checks nav replace them).

**T2. The three cards** (`kpis(ix, staffState)` in `src/components/overview/kpis.ts`): read from `keyAmounts` (finalized =
v3 plus applied adjustments) for federal AGI, federal total tax and California total tax; add to each tax the sum of the
applied adjustments' estimated effects (`claim.effect.federal` / `.california`), skipping a total-tax line adjusted
directly. Label: "As computed, v3" when there are none; "v3 plus the estimated effect of n adjustments" otherwise; AGI
says "not recomputed" when an adjustment exists. Unit-tested: no events gives 445,590 / 81,962 / 18,874; an applied
adjustment with a known effect moves the tax cards by exactly that effect.

**T3. Forms tab** (`return/page.tsx`): its own head is replaced by the overview head; the status key and the compare
panel stay. Every form starts collapsed (the existing collapsed row with "Show the n lines"); a form opens when it holds
the selected line, when "Only changed lines" is on, when `?open=<form>`, or when chosen in the new picker.
- Picker inside the compare panel: a `<select>` "Form: All forms / each form" that sets `?form=<code>` (a small client
  component using the router, keeping the other query values); with a form chosen only that form is listed, open; "All
  forms" removes the filter.

**T4. Areas and Documents tabs**: their pages render the overview head in place of their own heads; content unchanged
(Documents keeps its filter chips and list; Areas keeps its cards). `areas/page.tsx` stops using the shared WorkPage
head for staff; `Page` gains an optional `head` override so nothing else changes.

**T5. Navigation** (`Shell.tsx`): for staff the four entries become one, "Return overview · Forms, areas, documents",
pointing at the root and current on any of the four routes. Other screens unchanged.

**T6. Tests and docs**: new e2e (cards, tabs, collapsed forms, picker, blocking row lands on Checks, no "Open all
checks"); update tests that used Home's open-checks section or the nav names; update the video click guide (moment 1
on Return overview, nav names).

## Out of scope

Recomputing AGI or tax; changing client or examiner screens; moving any route; restyling the tabs' content.
