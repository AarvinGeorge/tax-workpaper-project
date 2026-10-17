# Review: header client switcher and AI reader dry-run mode

Sat 17 Oct 2026, 18:59 EDT (22:59 UTC). Reviewer: Claude Fable 5.1 (cross-model, read-only). Tier b (internal / take-home).
Scope: the two uncommitted additions named in the brief. Playwright not run (another lane owns it).

## What was measured

| Check | Command | Result |
|---|---|---|
| Route unit tests | `npx vitest run tests/unit/ai-reader-route.test.ts` | 10 passed, 0 failed (608 ms) |
| Types | `npx tsc --noEmit` | exit 0 |
| "Stores nothing" | grep `writeSealed` in `src/server/ai-reader.ts` and `src/server/data.ts` | only call is `ai-reader.ts:77`, after the dry-run `return` at :61; `data.ts` has no write path; `forceAiRecheck()` (:78) is not reached in a dry run |
| Auth and key order | `ai-reader.ts:38-39` | 401 before 503 before any packet work; `authorised()` is sha256-then-`timingSafeEqual`, and no secret means nobody is authorised |
| Limit bounds | `ai-reader.ts:52-54` | `/^[1-5]$/` on the raw string: rejects 0, 6, x, 2.5, "", " 3"; default 3 |
| Response content | `ai-reader.ts:61-66` | counts and numbers only; the test asserts the rationale and quote strings do not leave the server |

The phone-overflow finding (M2) is computed from the CSS, not measured in a browser; its fix comes with the one assertion that measures it.

## Must-fix

**M1. The switcher renders for every role, including client and examiner.**
`project-build/src/components/shell/Shell.tsx:112` renders `<ClientSwitcher>` unconditionally. An examiner (read-only, sees "only the documents they cite") and a client both get a button with `aria-haspopup="menu"`, a menu named "Clients and returns" and an "Add a new client" item. That contradicts the examiner banner at :42 and, for a client, implies a client list exists behind their login.

Recommendation on clients: **no, clients should not see the switcher.** A client has exactly one return in this product; "Add a new client" is a firm action; and the only thing the menu adds for them is a reason to wonder what else is in the list. Staff (`me.kind === 'staff'`, which includes Jo, Sam and "next") keep it.

Change, `Shell.tsx:112`:
```tsx
<div className="sh-brand"><strong>Taxmark</strong>{me.kind === 'staff'
  ? <ClientSwitcher label={`${client}${taxYear ? `, ${taxYear}` : ''}`} />
  : <span className="client-sw-static">{client}{taxYear ? `, ${taxYear}` : ''}</span>}</div>
```
and in `globals.css` after :205: `.client-sw-static { font-size: 14px; color: var(--ink2); padding: 4px 8px; }` so the header does not shift between roles.
Test to add to `tests/e2e/client-switcher.spec.ts` (the project rule is one test per guarantee):
```ts
test('clients and the examiner see the client name as text, not a switcher', async ({ page }) => {
  for (const role of ['client-sarah', 'examiner']) {   // use the real client and examiner role keys from w.allRoles
    await page.goto(`/w/e2e-client-${Date.now().toString(36)}/${role}`);
    await expect(page.getByRole('button', { name: /Okafor and Lindqvist, 2025/ })).toHaveCount(0);
    await expect(page.locator('.sh-brand')).toContainText(/Okafor and Lindqvist, 2025/);
  }
});
```

**M2. The open menu overflows the viewport at 390 px (horizontal scroll while open).**
`project-build/src/app/globals.css:208`: `.client-sw-menu { position: absolute; left: 0; width: min(320px, calc(100vw - 32px)) }` is positioned against `.client-sw`, which sits after "Taxmark" (about 60 px) plus the 10 px gap plus the 16 px phone gutter: left edge about 86 px, right edge about 406 px on a 390 px screen. An absolutely positioned box past the right edge extends the document's scrollable width, and `.wp` only clips (`overflow: hidden`) at 900 px and up (:181). Computed, not measured.

Change: add to the existing `@media (max-width: 899.98px)` block at `globals.css:197-201`:
```css
  .sh-brand { position: relative; flex: 1 1 100%; }
  .client-sw { position: static; }
  .client-sw-menu { left: 0; right: 0; width: auto; }
```
The menu's containing block becomes the full-width brand row, so it spans exactly the content width (358 px) under the client name. Measure it with one assertion added to the spec (390 px viewport, menu open):
```ts
expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
```

## Should-fix

**S1. Menu semantics without menu keyboard behaviour.**
`project-build/src/components/shell/ClientSwitcher.tsx:14-21, 33, 37`: `role="menu"` promises that focus moves into the menu and Arrow keys move between items; here both items are `tabIndex={-1}` with no key handler, so a keyboard or screen-reader user opens a menu they cannot enter (VoiceOver announces "menu" and then nothing). Escape and focus return are correct. Smallest fix that keeps the test unchanged (focus moves to the first item on open; Escape still returns to the button):
```tsx
const menu = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!open) return;
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
  items()[0]?.focus();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); button.current?.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const list = items(); const i = list.indexOf(document.activeElement as HTMLElement);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
    e.preventDefault(); list[n]?.focus();
  };
  ...
}, [open]);
```
and `ref={menu}` on the `role="menu"` element. Disabled menu items stay focusable on purpose (the ARIA menu pattern recommends it, so the designed item is discoverable).
Alternative in one sentence: since nothing in the menu is actionable today, a disclosure (`aria-expanded` + `aria-controls` on the button, a plain list in the panel, no `role="menu"`) is honest and needs no key handling; the brief asked for menu semantics, so S1 as written is the recommendation.

**S2. Non-menuitem children inside `role="menu"`.**
`ClientSwitcher.tsx:32` (the "Returns" `.lbl` div) and `:41` (the `<p>` note) are children of the menu but not menu items or groups; screen readers may skip them or announce them out of the item count. Change: keep `data-testid="client-menu"` and the `.client-sw-menu` class on an outer panel without a role; inside it put `<div id="client-sw-h" className="lbl client-sw-h">Returns</div>`, then `<div role="menu" aria-labelledby="client-sw-h" ref={menu}>` holding only the two items, with the add item carrying `aria-describedby="client-sw-note"`, then `<p id="client-sw-note" className="small muted client-sw-note">` after the menu. The existing test still passes: `getByTestId('client-menu')` finds the panel, `menu.getByRole(...)` searches descendants, `toContainText` sees the note. Move the `:32` inline `padding: '4px 8px'` into `.client-sw-h`.

**S3. Tab away leaves the menu open.**
`ClientSwitcher.tsx:24`: outside pointer closes it, Tab does not; the menu lingers over the header while focus is elsewhere. Add on the root div:
```tsx
onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}
```

**S4. The button's accessible name is only the client name.**
`ClientSwitcher.tsx:27`: a screen reader hears "Okafor and Lindqvist, 2025, menu button" with no cue that it is the client and return. Change `:27` to `<span><span className="vh">Client and return: </span>{label}</span>`; the spec's `/Okafor and Lindqvist, 2025/` regex still matches.

**S5. A dry run can report `suggestions: 0` while every model call failed.**
`project-build/src/server/ai-reader.ts:61-66` reports `documents: Math.min(limit, documents.length)` (computed from the packet, not from what ran) and omits `calls` and `failedCalls`, which the full run returns at :81. Three failed calls read as "3 documents, 0 suggestions, 0 rejected", a green result that tested nothing. Change `:62`: add `calls: res.calls, failedCalls: res.failedCalls,` to the dry-run body. Test: in `tests/unit/ai-reader-route.test.ts:129` extend the typed-number loop to `['suggestions', 'rejected', 'grounded', 'seconds', 'calls', 'failedCalls']`, and update `ai/README.md:149`.

**S6. `?limit=N` without `dryRun=1` is silently ignored and runs the full paid, payload-replacing job.**
`ai-reader.ts:52-54`: `limit` is parsed for every request but only consulted when `dryRun`. Someone trying a cheap probe with `?limit=2` (forgetting `dryRun=1`) triggers all 74 documents and overwrites the stored payload. Change: after `:54` add
```ts
if (!dryRun && q.has('limit')) return json(400, { ok: false, reason: 'limit applies only with dryRun=1.' });
```
Test: one line in the "refuses a limit" test, `expect((await handleAiReader(req(\`Bearer ${SECRET}\`, '?limit=2'), env(), fakeFetch)).status).toBe(400);` with `fetchCalls` unchanged.

## Nit

**N1.** `ai-reader.ts:65` names the figure `costUsd`; the full run at `:82` names it `costUsdEstimate`. Use `costUsdEstimate` in both; update `tests/unit/ai-reader-route.test.ts:130` and `ai/README.md:149`.

**N2.** `tests/e2e/client-switcher.spec.ts:15-16`: after `add.click({ force: true })`, also assert the menu is still open (`await expect(menu).toBeVisible()` and `aria-expanded` still `'true'`) so "does nothing" means nothing, not "navigates nowhere". Add a keyboard open step (`button.focus(); page.keyboard.press('Enter')`) so the test covers the keyboard path the brief asks for.

**N3.** `tests/unit/ai-reader-route.test.ts:131`: `fetchCalls === 2` proves two calls, not that they were the first two documents; assert the doc ids seen by `fakeFetch` equal the packet's first two ids (collect `doc` into an array in the fake).

**N4.** `Shell.tsx:97`: when `people` is empty the label is ", 2025". Guard: `client || 'Return'`.

**N5.** `ClientSwitcher.tsx:17`: `pointerdown` outside closes without returning focus, which is right for a pointer; no change, noted so it is not "fixed" later.

## What is fine as built

- Dry run: no write path reachable, idempotency skip bypassed on purpose and documented (`ai/README.md:147-149`, `docs/decisions.md:213`), bearer and key enforced in the same order as the full run, bounds exact, response free of suggestion content (asserted). The route file is unchanged in shape (`GET`/`POST`, `maxDuration` 300, `force-dynamic`).
- Switcher: Escape closes and returns focus (tested), `aria-expanded` and `aria-haspopup` on the button, `menuitemradio aria-checked` for the current return, `aria-disabled` on the designed item with `cursor: not-allowed`, no handler so it cannot act, `z-index` from the shared `--z-dropdown` token, dark-mode tokens reused, header still one row of brand / meta / search / tools with no new chrome.

## Order to apply

M1, M2 (with their two tests), then S5 and S6 (two lines each plus test lines), then S1-S4 together in one pass over `ClientSwitcher.tsx` (they touch the same 20 lines). Nits only if time remains before the 14:00 freeze passes into the video window.
