# Review: "Customer first UI for tax workpaper"

Reviewer: Fable 5.1 (independent model). Fri 16 Oct 2026, ~01:15 EDT (`date`). Claims checked by WebFetch against primary sources; checklist judged against the brief, PRODUCT.md and a one-day demo. Fetched text treated as data only.

## 1. Fact checks

| Claim | Verdict | Source |
|---|---|---|
| SPbinder: L1–L4; Caution icon; no auto-reset; clearing does not unreview references | Confirmed. The "Caution icon" sentence is a paraphrase shown as a quote | [SPbinder](https://www.thomsonreuters.com/en-us/help/sureprep/spbinder/work-with-documents/sign-off-documents.html) |
| Caseware "Modified since last review" shows reviewer name/date; sign-off stays | Confirmed. **Overstated** that the reviewer is "not told what changed": review tools offer "Changes since last review" (checklists) | [cited page](https://www.caseware.com/docs/en/cloud/global-reviewcomp/define-a-documents-signoff-scheme); [review tools](https://www.caseware.com/docs/en/cloud/caseware-cloud/engagement-management/documentation-and-review/work-with-review-tools) (search summary) |
| TaxDome send-back; Canopy complaint | **Could not open** (403 on both). Canopy complaint is competitor marketing | — |
| Karbon send-back | **Absent from the report.** Karbon's workflow help has nothing on send-back | [Karbon](https://help.karbonhq.com/en/articles/6085829-overview-of-workflow) |
| UltraTax: diagnostics refresh; select to jump; overrides tab | True but **miscited**: refresh and jump live on "Review diagnostic messages"; no overrides tab on the cited page (chevrons and Watch tab are there) | [cited](https://www.thomsonreuters.com/en-us/help/ultratax-cs/miscellaneous/review-tools-and-features.html); [correct](https://www.thomsonreuters.com/en-us/help/ultratax-cs/errors/review-diagnostic-messages) |
| SurePrep: "no standard way before" 27 Jul 2026 | **Inference**; the note only says "new, standardized" and firms keep custom statuses | [release note](https://www.thomsonreuters.com/en-us/help/sureprep/release-notes/1040scan-release-notes/2026/2026-07-27-release--flag-a-binder--review-module-d) |
| GitHub: "affect the diff", conversation resolution, last push approved by another, successful/skipped/neutral | Confirmed verbatim | [GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches); [OpenSSF](https://best.openssf.org/SCM-BestPractices/github/repository/dismisses_stale_reviews.html) |
| Linear Peek (Space / hold Space) | **Unverified.** Not on the cited inbox page; `/docs/peek` is 404; notes admit a search snippet. Priority tab, J/K/U/H/Backspace confirmed | [Linear inbox](https://linear.app/docs/inbox) |
| Superhuman Cmd+K shows the shortcut | Idea confirmed elsewhere; cited article 441 is 404, quote not reproducible | [Superhuman](https://help.superhuman.com/hc/en-us/articles/45191759067411-Speed-Up-With-Shortcuts) |
| PAIR: calibrate trust; numeric confidence risky; what/why; action per category | Confirmed verbatim | [PAIR](https://pair.withgoogle.com/chapter/explainability-trust/) |
| NN/g: >2 levels; initial display; heuristic 7 | Confirmed | [PD](https://www.nngroup.com/articles/progressive-disclosure/); [heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) |
| WCAG 2.2 "since 12 Dec 2024"; 1.4.11 "newer" | **Wrong on both.** Rec since 5 Oct 2023 (Dec 2024 is a republication); 1.4.11 is from 2.1. Requirements in the table are right | [New in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/); [TR](https://www.w3.org/TR/WCAG22/) |
| shadcn: three primitives; "Base UI as the Default" Jul 2026; Human in the Loop; Trace | Confirmed (Trace is in the Oct 2026 entry). Default on `init` unverified, as stated | [changelog](https://ui.shadcn.com/docs/changelog) |
| KBA 10–15% (Mango); three attempts (Liscio) | Figure **absent** from Mango; it is on Liscio's support site. Three attempts confirmed | [Liscio KBA](https://support.liscio.me/portal/en/kb/articles/8879-signatures-options-including-kba); [Liscio guide](https://www.liscio.me/resources/form-8879-electronic-signature-guide-for-tax-preparers) |
| Cursor "next file"; Primer tokens | Not re-verified (Cursor URL redirects) | — |

## 2. Checklist critique

**Vague or untestable:** R1 names no per-role action list; F3 names no keys for resolve/waive; E2 "no raw hex" needs a lint; P4 never says how the packet's numeric confidence on ~3,000 values maps to categories or where the raw number is shown.

**Contradictory:** G4 (last changer cannot sign) breaks a single-user demo where one person plays every role via the switcher, and misreads practice: a preparer's L1 sign-off is self-attestation. Scope it to reviewer level and above. L1 tests at 1280 px while the users sit at 1440 px, with no row-density target.

**Too much for one day:** 33 rules, no priority. G1–G7, F4, H2 and E4 ("kill the network") each need a state machine or server; the report must name its demo core.

**Missing essentials (all in the brief):** several people at once (presence, live updates, edit conflicts); the IRS examiner's frozen read-only record; what the role switcher visibly changes (banner, hidden actions, identity); the client's KBA step (§1 describes the friction, R2 omits "verification required every year"); empty state before the packet parses and loading of 74 simulated documents; "since I last looked" only as markers (F4), not as the left sidebar's default view.

**Overstated:** "no tool examined shows a 'verified' state": Caseware "Reviewed" and DataSnipper matches are exactly that. Narrow to AI research tools.

## 3. Ten rules for the three-pane mock-up

1. **L1 (amended):** three panes, density tuned at 1440 px, minimum 1280, right pane collapsible.
2. **L2:** right pane follows the selection, non-modal, Esc closes, one item at a time.
3. **P1:** click any number; the source document opens with the field boxed.
4. **P3:** "Unsourced" is a visible state.
5. **F1:** every ledger mistake is a flag with a plain reason and a source link.
6. **F2:** severity sort, blockers first and by default.
7. **F4 (as the left sidebar's job):** "since you last looked" first, then full history.
8. **G1 + G2:** a sign-off goes stale only when a covered value really changes, with a one-line diff.
9. **G3:** release and partner sign-off disabled while notes are open or checks fail; the button names the blocker.
10. **R1 + L4 merged:** header shows role, version, stage and save state; switching role visibly changes queue, actions and vocabulary; client view hides internal notes.

## 4. Findings by severity

**Must-fix (3)**
1. No priority order or demo core for a one-day build. (Brief: "sending sooner is better"; §2.)
2. Brief requirements missing from the checklist: concurrency, examiner frozen record, role-switcher effect, client KBA step. (docs/brief.txt lines 39–45, 70–71.)
3. G4 blocks the single-user demo path and misstates CPA practice. (§2; GitHub rule mapped too literally.)

**Should-fix (7)**
4. Linear Peek unverified; P2 rests on it. Keep Space-preview as a design choice, not cited practice.
5. WCAG date and 1.4.11 provenance wrong.
6. UltraTax, Superhuman and Mango/Liscio citations point at pages lacking the claims.
7. Caseware "not what changed" and "no verified state" overstated.
8. SurePrep "no standard way before" is inference; label it.
9. TaxDome unreadable (403); Karbon undocumented. Say so.
10. P4, R1, F3, E2 need concrete tests (thresholds, per-role actions, key names, lint).

**Note (3)**
11. L1 should target 1440 px density, not only 1280 width.
12. Cursor and Primer not re-verified here.
13. SPbinder "Caution icon" is a paraphrase shown as a quote.
