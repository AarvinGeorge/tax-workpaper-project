# Review memo: a printable record once the partner approves

Aarvin, 18 Oct 17:30: build the memo. The button says it prints the memo now and that the full record is planned.
Wording correction, recommended and taken: no claim of "IRS doc specifications". No such workpaper specification exists;
the planned version is "the full review record, ready to hand over when an examiner asks for documents".

## What it is

- A **frozen, shareable snapshot** of the review as of story time.
- It is not a second Review screen: one page, read top to bottom, printable. The browser's Print / Save as PDF makes the
  file; there is no server PDF library.

## Where

- **The Review screen**, beside the Approval box: a button "Review memo". Staff only (clients and the examiner never see
  it).
  - **Disabled until the return is approved**, either by the partner's sign-off on `return` or by the firm's record
    (`byRecord`, from 10 Jul). The reason shows as visible text: "Available once the partner approves the return".
  - **Under the button, always visible:** one small line, "Prints the review memo. Planned: the full review record, ready
    to hand over when an examiner asks for documents." The same text goes in its `title`.
- **The memo itself:** a new route `/w/[ws]/[role]/review/memo`, a server component.
  - It renders the memo with a print stylesheet: no shell chrome when printing, A4 and Letter safe, and the shell's
    panes hidden by `@media print`.
  - A "Print or save as PDF" button calls `window.print()`, in a tiny client component.
  - The route refuses (redirects to Review) when the return is not approved or the role is not staff.

## Content (from the projected state only; no new domain rules)

1. **Head:**
   - household name, tax year, and the version with its fingerprint (`st.fingerprint` as on the client page);
   - "As of <story time>" and "Printed by <role name>".
2. **The filed figures:** from `keyAmounts`, one row per jurisdiction: income, total tax, payments, refund or balance
   due. Derived figures are shown as they are. A figure that needs the engine is marked; it cannot normally appear
   once approved, but stay honest if it does.
3. **One-line facts:**
   - approved by whom and when;
   - each spouse signed when (workspace signatures or the firm's 8879 record, date only);
   - counts: N changes, N blockers resolved, N items open at approval.
4. **Changes:** each applied adjustment, showing the line, engine value → new value, reason, authority, estimated tax
   effect, who made it and who signed it off. Under it, the lines it moved, using the flow-through's derived lines (for
   example "Total payments 27,130 → 23,630").
5. **How each blocker was resolved:**
   - "Fixed by the change to <line>";
   - "Cleared: <reviewer's exact words>, <who>, <when>";
   - "Partner sign-off by <who>".
6. **Open at approval:** counts by severity, plus up to 10 titles; AI suggestions not acted on as a count.
7. **Footer:** "Generated from the workspace event log; every entry above links to its event (#seq)."

**Masking:** run through `maskText` for the viewing role. Identifiers show the last 4 digits only, and PINs never
appear (the 8879 detail is never read).

## Tests first

- **Unit:** a `memoData(ix, state)` builder in `src/domain/memo.ts`:
  - after the dry-run events, it returns the 10,500 change with its moved lines (78 and 97), 8 cleared with reasons,
    the partner sign-off and 2 signatures;
  - before approval it returns `null`.
- **e2e:**
  - the button is disabled with the reason before approval;
  - after approval it opens the memo, which shows "23,630", "Refund 4,756", the reason text and both signatures;
  - the caption line is visible;
  - ngozi and irs get no button, and `/ngozi/review/memo` redirects;
  - at 16 Jul the memo is available from the firm's record;
  - no PIN or full-SSN pattern appears;
  - print emulation (`page.emulateMedia({ media: 'print' })`) hides the shell nav.

## Out of scope

- A server-side PDF.
- The full record (the evidence appendix and documents).
- An e-mail or share action.

## Revisions after Fable's plan review (17:35, docs/reviews/2026-10-18-review-memo-plan-review.md). These override the body.

All six must-fixes and all the should-fixes are adopted:
1. **Approval** comes from `returnApproved` (`policy.ts:314`) / `claims.return.signoffs`. A stale approval disables the button with "The return changed after approval; approve again".
2. **byRecord (from 10 Jul):** print "Approved per the firm's record: the clients signed Form 8879 on <date>. No partner approval event in this workspace." Read `.at` only, never the detail.
3. **Figures are titled with `basisText`** (`versions.ts:70`), never "the filed figures".
4. **Resolutions follow the real model:**
   - `finding_cleared` gives "Cleared: <reason as recorded>, who, when";
   - an adjusted member of `f.claims` gives "Resolved by the change to <that line>";
   - a partner-threshold blocker gives "Partner sign-off by …";
   - blocking review notes resolved by `note_resolved` are included.
5. **Print CSS** resets `.wp` height and overflow and `.sh-pane-c` overflow, and hides the shell chrome. A test prints to PDF and asserts more than one page is possible, or at least that the content is not clipped.
6. **Non-staff** go through `renderWork('review', …)` and get the Shell's refusal. Only staff viewing before approval are redirected to Review.

Should-fixes:
- `memoData` takes `findings` and `ai`.
- No `#seq` link promise (the footer says "from the workspace event log").
- Reasons are shown "as recorded".
- Include `appliedBy` and `effect.basis`.
- Tests do not hard-code counts.
- The RoleSwitcher keeps `/memo` or falls back cleanly.
- The caption avoids the word "Approved".
