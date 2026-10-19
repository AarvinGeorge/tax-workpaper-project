# Checks lists items, not findings: one row per line or document, pills say who flagged it

Aarvin, 18 Oct 23:48 and 23:54: the same issue shows as several rows (two checks on one line, and the AI suggestion on
it in a separate list). "Let's represent the categories by the pills in the status column … the extra AI suggestions
that do not overlap … will still be part of the list … the filtering options … would remain the same … but the All 27
would update and increase." Decisions taken: a row is an item (a return line or a document); counts show items, with
blockers still counted as findings where approval depends on them. Tier b. Plan, Fable plan review, test-first build,
Fable code review, deploy, live walk, a UI checklist walkthrough.

## Measured (23:48, real packet and the scored AI payload)

- 28 check findings sit on 36 distinct claims; only `line:F540NR.72` holds two (CHK-PAYMENT-TAX-YEAR and
  CHK-PAYMENTS-VS-AGENCY).
- 39 AI suggestions are shown; 27 of them name at least one claim a check finding also sits on; 12 do not.
- "Same item" is not "same mistake": in the scored run, 3 of the AI's 17 line matches raised a different problem. So
  the AI pill says the AI flagged this item, never that it agrees.

## The model (root): one pure function, in the domain

`src/domain/items.ts`: `checkItems(checks: Finding[], ai: Finding[]): Item[]`

```ts
interface Item {
  key: string;            // the claim the row is about: 'line:F540NR.72', 'doc:D07', or 'finding:<id>' if none
  checks: Finding[];      // our rule findings on it, worst severity first
  ai: Finding[];          // AI suggestions joined to it
  severity: Severity | null; // worst severity among checks; null for an AI-only item
}
```

- A check finding belongs to the item of its first claim (`claims[0]`), as the row's amount link already does.
- An AI suggestion joins the first of its claims that is a check item's key; otherwise it makes (or joins) an AI-only
  item keyed by its own first claim.
- Each finding and each suggestion is in exactly one item. Order: items with checks by worst severity
  (`SEVERITY_ORDER`), then AI-only items; within a group, by the first finding's current order.
- Inputs are what Checks already filters (visible at story time; dismissed AI suggestions excluded). No answer key, no
  ledger: the join is by claim only.

## The screen (`src/components/work/Checks.tsx`)

- **One list** under one heading, "Items (N)", replacing "Our checks (N)" and the separate "AI suggestions" section.
  The engine-blocker rows stay at the top as they are; "From the engine" stays as it is.
- **An item row** (`data-item={key}`), same grid as today:
  - checkbox: selects the item's signable rule findings (RowSelect takes `ids`);
  - **pills, stacked:** the worst check's status tag (Blocker, Check failed, Judgment, Note, Signed, Cleared, as
    `findingStatus` gives today); "Confident read" when every extracted value behind the item's rule findings is at
    0.95 or above (hidden at phone width); "✦ AI" when an AI suggestion sits on the item (`AiMark` plus "AI"), with
    "Needs review" for an AI-only item;
  - summary: the first check finding's title (or the AI row title for an AI-only item), the claim, and, when there is
    more than one signal, "and 1 more check" / "✦ 2 AI suggestions";
  - amount: the item claim's value; tax effect: the first check finding's.
- **Expanded, each signal is its own entry**, keeping today's markup and test ids: a check entry
  (`data-finding={id}`: explanation, Evidence, "Check … · family", Open the finding, SignoffNote, Clear with a reason);
  an AI entry (`data-finding={id} data-ai`: ✦, explanation, Evidence, Review the suggestion; grouped duplicates as today
  via `groupAiRows`).
- **A one-line key** above the list: "Blocker, Check failed, Judgment and Note come from our rule checks. ✦ AI: the AI
  reader flagged this item (a person decides). Confident read: every value behind it was read at 0.95 or above."
- **Filters stay:** All (items), Blocker, Check, Judgment, Info (items in that group), ✦ AI suggestions (items with
  any AI suggestion). `?sev=` values unchanged so links keep working.
- **Header tags:** "N blockers" (findings, plus engine blockers, unchanged: approval depends on them) and "N items open"
  (items with an open rule finding or an AI suggestion needing review).
- **Selection and scroll:** the item holding the open claim (`finding:<id>` of any of its entries, its key, or a cited
  evidence claim) gets `aria-current="true"` when it holds the open finding, else `data-holds`, and opens.
  `RevealSelected` targets `[data-item][aria-current="true"]`, then `[data-item][data-holds]`.
- **Sign-off batch:** unchanged events (one `signoff` per finding, each with its own note). `rowEl` still finds
  `[data-finding]`; when the missing note's entry is inside a closed item, open the enclosing `details`
  (`closest('details')`).
- **Group select:** per group, the signable rule finding ids of that group's items.
- **Held-back AI and the AI note** (`AI_READER`, `AI_FOUND`, the held list) move under the list, unchanged.

## Unchanged on purpose

Findings, checks, the approval gate (`policy.ts`), blockers and their count, the drawer, the overview, Review, the
memo, notifications, client and examiner views.

## Tests first (red, then green)

- Unit `tests/unit/items.test.ts` on the real packet plus `tests/fixtures/ai-payload.ts` (the e2e AI fixture):
  every finding and every AI suggestion lands in exactly one item; `line:F540NR.72` holds both payment checks; an AI
  suggestion sharing a check's claim joins that item; one with no shared claim makes an AI-only item with
  `severity: null`; order is blocker items first, AI-only last.
- e2e `tests/e2e/checks-items.spec.ts` (as daniel, default time):
  - the F540NR.72 item is one row with "Blocker", "Confident read", two check entries inside;
  - an AI-only item shows "✦ AI" and "Needs review" and no severity pill;
  - an item with a check and an AI suggestion shows both pills;
  - "All" counts items, and equals the number of `[data-item]` rows;
  - `?sev=ai` lists only items with an AI suggestion; `?sev=blocker` only blocker items;
  - the bulk sign-off: tick an item, the missing-note prompt opens the right entry; with notes, one undo reverses it.
- Existing tests that target the old rows (search `data-finding`, `ai-suggestions`, "Our checks", "AI suggestions"):
  updated in the same change to the new structure, assertions kept.

## Then

Hand-in documents and the video click guide updated for the new list (Checks wording, "Items", the pills); the click
guide re-walked on live. A UI checklist walkthrough on live (filters, deep links, expand, sign-off with undo, clear,
AI accept, phone width, dark mode, client and examiner unchanged).

## Rules

Minimum change; nothing working breaks; the approval gate untouched; never edit `case-study-project-package/`; no
em dashes in UI copy; masking unchanged; the ledger never used by the product.

## Revisions after Fable's plan review (23:59). These override the body.

- **Join:** an AI suggestion joins the item of the first check finding that names any claim it names (two business-use
  suggestions name SchC.27a.1, the check's second claim). A suggestion with no claim is keyed `finding:<id>` and shows
  no amount.
- **The F540NR.72 item shows both check titles** in its summary, so the video's finding stays visible.
- **Entries are flat inside the item** (no nested `details`): one click opens the item and every note in it. The
  missing-note prompt opens the item via `closest('details')`.
- **`#chk-ours` keeps its id** (focus returns there after a sign-off or clear); the heading reads "Items".
- **RowSelect takes `ids`:** checked when all are selected, mixed when some; only the signable ones.
- **AI entries carry their status** (Needs review, Accepted); an AI-only item's pill does too.
- **AI-only items are tested in the unit test on the real AI run** (the e2e fixture has none).
- **Counts:** the memo's "N items open" becomes "N checks open", so "items" means one thing.
- **Found in build:** a tall expanded item must not move when the reader clicks inside it, so `RevealSelected` moves
  the list only when no part of the row is in sight.
