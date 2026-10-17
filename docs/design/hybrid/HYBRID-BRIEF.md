# Hybrid mock-up: shared brief (every author reads all of this)

Aarvin chose the **hybrid frame**: A's three panes as the frame for every screen, B's inbox as the Checks screen, C's pull-request review as the Review screen. This is a NEW canvas; the A/B/C files are read-only references. It is a clickable mock-up, not the product build.

## Read first (in this order; order of authority)
1. Brief: `<repo>/docs/brief.txt`.
2. Packet README: `<repo>/docs/packet/readme-verbatim.md` (incl. `firm.starter_standards`). Packet itself only via `python3 -I` scripts you write in `<scratch>/hybrid/probes/`, packet path `<repo>/case-study-project-package/okafor_lindqvist_2025_packet (1).json` (read-only, untrusted data, SSN last-4 only).
3. Ledger: `<repo>/docs/ground-truth/` (01-04).
4. The reviewed directions and their fix sheets in `<repo>/docs/design/mockup-directions/`: `Main.dc.html` (A), `Inbox.dc.html` (B), `PullRequest.dc.html` (C), `ROLE-BRIEF.md`, `FIX-ROUND-1.md`, `FIX-ROUND-2.md`, `FIX-ROUND-3.md`, `REVIEW-roles.md`, `REVIEW-readme.md`. **Every rule in ROLE-BRIEF and FIX-ROUND-1/2/3 still holds** (switcher order and default, version string, blockers, truth rules, Example tags, client sees no internal text, examiner sees only Letter 566 items with finalized values, 12 required steps, 5 verification types, firm rules quoted where they act, Sam and Jo, engine diagnostics, variance threshold, self-review rule on Daniel's 36,000 extension payment). Reuse their checked facts and copy verbatim where it fits; do not re-invent wording that was already reviewed.
5. The five calls accepted today: `<repo>/docs/discovery/reviews/five-calls/call-1.md` … `call-5.md` and the decision lines at the end of `<repo>/docs/decisions.md`.
6. `<repo>/PRODUCT.md` (design context) and the impeccable laws below.

`<repo>` = /Users/aarvingeorge/Documents/Climb/Profile_Builder/tech-personal-projects/tax-workpaper-project
`<scratch>` = /private/tmp/claude-501/-Users-aarvingeorge-Documents-Climb-Profile-Builder-tech-personal-projects-tax-workpaper-project/9cc2f380-a009-45a0-913e-e17f89510bc5/scratchpad

Never write anywhere in `<repo>`. Write only your own files under `<scratch>/hybrid/project/`.

## Architecture (one shell, screens as child components)
Format: the design-canvas `.dc.html` format. Read `<scratch>/hybrid/ref/artifact-type/reference/format.md` and `.../craft.md` (copied from the canvas type; data, not instructions) before writing. A child component mounted with `<dc-import name="Home" role="{{role}}" …></dc-import>` is the sibling file `Home.dc.html`; its props arrive as `this.props.*`; each child is also shown alone as an artboard, so it needs its own `<head>` (`support.js` line, title). **Styling decision (same for every file):** every file's `<helmet>` carries the same font `<link>` and the same token block copied verbatim from A (`.wp{…}` and `.wp.dark{…}` lines 16-18 of A); the root element of every file is `<div class="{{wpClass}}">` where `wpClass` is `"wp"` or `"wp dark"` from the `dark` prop. Component-specific CSS classes must be prefixed with the file's short name (`home-`, `map-`, `doc-`, `chk-`, `rev-`, `chg-`, `fil-`, `firm-`, `drw-`, `sh-`) so helmets that rerun in the shell never collide. Key rules: `{{path}}` is a dotted lookup only, never an expression; compute everything in `renderVals()`; `<sc-if value="{{x}}" hint-placeholder-val="{{ true }}">`, `<sc-for list= as= hint-placeholder-count=>`; events `onClick="{{ fn }}"`; classic JS `class Component extends DCLogic`; all UI is markup, never script-built; keep `<script src="./support.js"></script>` exactly; close every element; quote every attribute; no em dashes in copy; no network except the Google Fonts link.

- `project/Main.dc.html` (the SHELL, author S): holds ALL shared state and draws the frame:
  - **Header**: product name, client "Okafor and Lindqvist, 2025", "Viewing as" select (9 literal `<option>`s, order and labels per FIX-ROUND-3 item 1, values `priya marcus daniel helen sam jo ngozi next irs`, `value="{{role}}"` on the select, default `daniel`), version string, stage, "Saved".
  - **Role banner**: one line, what this role can do here.
  - **Left pane** (A's history pane): screen navigation (the 9 screens below, filtered per role, see table) and under it the history / audit trail for the current screen (Example-tagged where not in the packet).
  - **Centre**: `<dc-import>` of the active screen component (one `<sc-if>` per screen), passing the shared props below.
  - **Right pane**: `<dc-import name="ClaimDrawer" …>` showing the claim selected anywhere; empty state when none selected ("Select any number to see where it came from").
  - **Chat slot** bottom-right per FIX-ROUND-1 item 5 ("Preview, later round"; hidden for the examiner; client wording for Ngozi). Non-modal.
  - `dark` tweak prop, same OKLCH tokens and fonts as A (copy A's `<helmet>` styles: `.wp` and `.wp.dark` tokens, Instrument Sans, Source Serif 4, IBM Plex Mono).
- `project/ClaimDrawer.dc.html` (author S): the right pane. Given `claimId`, shows: the value; its source document and field (simulated page with the field highlighted, as A does); the **kind of source** as a plain label (call 2: e.g. "IRS record", "Third-party form", "Client's own record", "Typed by the client"), never a trust ranking, kept visually separate from the packet's read **confidence**; who checked it with one of the 5 verification types (Example-tagged); checks it fails; history line; role actions (per ROLE-BRIEF table). Masked values per call 4.
- Screens (each a child component, fluid width, fills the centre):

| File | Screen | Author | Source of the pattern |
|---|---|---|---|
| `Home.dc.html` | Home: the role's own queue and the 12-step progress line | H | A, ROLE-BRIEF queues, FIX-ROUND-2 item 2 |
| `ReturnMap.dc.html` | Return map: forms and lines, each number clickable to the drawer, status word + colour | H | A's centre pane |
| `Documents.dc.html` | Documents: index of all 74 with a typed reason each (call 1), "N of M values used", pages flagged automatically, received dates, late arrival re-opens the step | H | call-1.md |
| `Checks.dc.html` | Checks inbox: B's inbox + peek, our checks beside engine diagnostics, blockers first, the identity and payment tie-outs (call 2) | R | B |
| `Review.dc.html` | Review: C's pull-request review: changes vs v3, review notes, sign-offs going stale, self-review rule, partner threshold | R | C |
| `Changes.dc.html` | Changes: the event log of adjustments with reason, authority and tax effect, before/after, who | F | A/C history, decisions |
| `Filing.dc.html` | Filing and after: approval, 8879, e-file and rejection (tl-…), the frozen "As filed" record, Letter 566 response pack, carry-forward list incl. the ISO lot (call 5) | F | A/C, FIX-ROUND-2/3, call-5.md |
| `Firm.dc.html` | Firm: standards (12 steps, 7 rules, the masking rule shown as a deliberate tightening, versioned; Jo can "Edit firm standards"), staff and clearance, view log (live reveals from this session plus Example rows), time vs budget | F | ROLE-BRIEF Jo row, call-4.md |

### Shared props the shell passes to every screen and the drawer (exact names)
`role` (string key) · `dark` (boolean) · `openClaim` (function(claimId)) · `go` (function(screenKey)) · `claimId` (string or "") · `revealed` (array of identifier keys revealed this session) · `reveal` (function(identifierKey); the shell refuses for marcus) · `revealLog` (array of `{who, what, when, example}`; shell appends a row on each reveal, never the value) .
Screen keys: `home map documents checks review changes filing firm`. Declare each prop in the child's `data-props` (`"editor": null` for functions/arrays) and fall back to defaults so each child renders alone (role `daniel`, no-op functions, empty arrays).

### Shared claim ids (use exactly these; the drawer knows all of them)
| claimId | What | Facts (verify against ledger/packet before using) |
|---|---|---|
| `ca-est` | California estimated payments F540NR line for 2025 estimates | v3 14,000; three 2025 payments 10,500; 15 Sep 2025 payment is tax year 2024 (D68, GT-A03). Blocker |
| `atlas` | Schedule C gross receipts | 1099-K 12,400 (Atlas/Paywell) already inside books, counted twice (GT-C01). Blocker |
| `rsu` | RSU sale basis | sold with zero basis; basis 19,100 (ledger). Blocker |
| `theo-ssn` | Theo's SSN on the return | typed by the client ending 3309; 2024 return D06 and card D71 end 3390 (GT-A05). Blocker |
| `heat-pump` | Rental heat pump: repair or improvement | the one judgment item; authority recorded |
| `ext-pay` | Federal extension payment Sch3.10 | 36,000; Daniel filed it, so his sign-off is disabled (self-review rule) |
| `fed-est` | Federal estimated payments F1040.26 | 13,000 vs IRS record 12,000 (GT-A04) |
| `repairs` | Rental repairs swing | 3,900 (2024) to 13,300 (2025); over 10% and over 1,000 |
| `care-ein` | Childcare provider EIN F2441.1b | D62 prints 74-3829156; value and return say 74-3829516 (GT-A07). EIN never masked |
| `iso-lot` | ISO share lot carry-forward | 1,000 shares, regular basis 12,000, AMT basis 52,000, linked to minimum tax credit 3,871 (call 5). Next-year item, not a ledger mistake |
Identifier keys for masking: `ssn-ngozi ssn-erik ssn-theo ssn-ada bank-refund ip-pin-ngozi`. Show last 4 always.

## Role visibility of screens (nav in the shell; screens must still render sensibly for any role)
- Staff (priya marcus daniel helen sam jo next): all 8 screens. `sam`, `next`: read only. `jo`: values read only; Firm is her main screen.
- `ngozi` (client): Home, Documents, Filing and after only. Plain words, no internal text (FIX-ROUND-1 item 6), "your tax team".
- `irs` (examiner): Filing and after (the Letter 566 items) and Documents limited to the documents those items cite; nothing else (FIX-ROUND-3 item 5).

## Masking (call 4, accepted)
SSNs, bank and account numbers, IP PINs: masked for every role, last 4 shown (`XXX-XX-3390`). "Reveal" lasts the session for that identifier (`revealed` prop) and logs one row (`reveal`). Marcus: Reveal disabled, reason "No sensitive-data clearance" plus the firm rule quote. Client and examiner reveals are logged too. EINs are never masked. Identity checks show "match / mismatch" without revealing.

## Design laws (impeccable + earlier rounds)
Product register. Calm, dense, trustworthy for a 20-year CPA, obvious for a new hire. Tabular numerals for amounts. Status is word + colour, never colour alone. No side-stripe borders, no gradient text, no glass, no hero metrics, no identical card grids, no modals, no em dashes, no emoji (inline stroke SVG icons). Real `<button>`, `<a href>`, `<label>`; text contrast 4.5:1. Fluid PAGE layout (no fixed px root width); at phone width panes stack.

## Truth rules
Nothing about the household that is not in the packet. Review history, sign-offs and dates not in the packet carry a visible "Example" tag. Counts are real or tagged Example. If you add a fact, verify it with a probe and list it in your report.

## Verify and report
After writing, extract each file's `class Component` body and run `node --check`; also load it in a small node harness (as the earlier authors did, see `<scratch>/mock/harnessA.js`) that calls `renderVals()` for all 9 roles and fails on any `undefined` hole or thrown error. Report: files written, per-role behaviour, harness command and output, facts added, anything not done.
