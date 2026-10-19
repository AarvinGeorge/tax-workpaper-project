# An "Engine" pill on the item an engine diagnostic names

Aarvin, 19 Oct 01:03: "okay let's add a new pill safely", after the measurement that 2 of the engine's 11 v3
diagnostics name a line or document a Checks item sits on (a third from 30 Jun). Tier b. Plan, Fable plan review,
test-first build, Fable code review, deploy, live walk.

## Measured (01:00, real packet and scored AI run, default story time)

| Diagnostic | Names | Item on Checks |
|---|---|---|
| BROKER_SUMMARY_DETAIL_MISMATCH | doc:D31 (via its ev refs) | doc:D31, our check CHK-UNREAD-PAGE (GT-B04) |
| LOW_CONFIDENCE_READ | line:SchA.11 (its ev is a source of that line) | line:SchA.11, AI only |
| DIGITAL_ASSET_BASIS_MISSING | line:F8949.H.C6 | that item exists from 30 Jun (CHK-ANSWER-AFTER-COMPUTATION) |
| the other 8 | no line or document any item names | none |

## The rule (domain, pure, in `src/domain/items.ts`)

`engineOn(ix, items)` returns, per item key, the v3 diagnostics that name it. A diagnostic names an item when one of
its `refs` is:
- an extracted value that is a `source` of a line the item claims, or that sits on a document the item claims;
- a line key or document id the item claims directly;
- an evidence ref of one of the item's check findings or AI suggestions.

"The item claims" = its key plus every claim of its findings and suggestions. Join by reference only, never by topic
(a diagnostic about the same subject that names nothing on the item does not join). Diagnostics stay where they are:
the "From the engine" list is unchanged, not counted as findings, never blocking.

## The screen (`Checks.tsx`)

- A neutral pill "Engine" in the item's stacked pills (after ✦ AI, before Confident mistake), `title`: "The engine's
  own diagnostic names this item; shown as it wrote it, not one of our checks".
- Inside the expanded item, one line per diagnostic, `data-engine-note={code}`: "The engine also warned" + the
  severity tag as the engine list shows it + the code + the message (masked).
- The pill key gains: "Engine: the engine's own warning names this item."
- No change to filters, counts, the engine list, the drawer, other screens or roles.

## Tests first (red, then green)

- Unit (`tests/unit/items.test.ts`): on the real packet at default time, `doc:D31` gets
  BROKER_SUMMARY_DETAIL_MISMATCH; `line:SchA.11` (with the scored AI run) gets LOW_CONFIDENCE_READ; `line:F540NR.72`
  gets none; with all findings visible (no time filter), `line:F8949.H.C6` gets DIGITAL_ASSET_BASIS_MISSING; no
  diagnostic joins an item it does not name (a synthetic case).
- e2e (`tests/e2e/checks-items.spec.ts`): the `doc:D31` row shows "Engine" and, expanded, the note with the code; the
  `line:F540NR.72` row shows no "Engine"; the key mentions Engine; at 1440 the stacked pills stay inside the status
  cell on an item that carries the most pills.

## Rules

Minimum change; nothing working breaks; never edit `case-study-project-package/`; no em dashes; masking unchanged.
Verification: all suites green, build clean, screenshots looked at, push, poll live, walk 36/36 plus the Checks specs
on live.

## Revisions after Fable's plan review (01:05). These override the body.

- **Three join at default time, not two:** HOME_OFFICE_AREA_CHANGE names the bare line key `SchC.30`, the item of
  CHK-HOME-OFFICE-ONE-HOME (same line, a different problem: by reference it joins, and the pill says only that the
  engine's warning names this item). SchC.30 carries four pills (Judgment, AI, Engine warning, Confident mistake).
- **Ref formats in v3:** `ev-NNNN`, bare line keys (no `line:` prefix), one `qa-14`; no `doc:`. A diagnostic joins an
  item when a ref equals a line key the item claims, or is a `source` of such a line (the drawer's own predicate,
  `ClaimDrawer.tsx:261`, `r === key || sources.includes(r)`), or is an evidence ref of the item's findings or
  suggestions. The "value sits on a claimed document" arm is dropped (too broad, adds nothing today).
- **One word, one tone:** the pill reads "Engine warning" in the amber tone the "?" legend already uses
  (`Legends.tsx:8`). Hidden at phone width like Confident mistake; the note inside the row still says it.
- **Unit cases** for a bare-key ref and for an `ev-` ref that sources no claimed line.
