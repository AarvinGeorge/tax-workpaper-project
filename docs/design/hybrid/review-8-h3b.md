# Review 8: round H3b (fixes for review 7)

Reviewer: Fable 5.1 (authors: Opus). Read-only; probes in `<scratch>/hybrid/review/r8_*`; packet via `python3 -I`, SSN last 4 only, PINs never printed. Run 16 Oct 2026, 22:41-23:05 EDT (`date`).

## 1. Verdict

**Ready to publish.** All four must-fixes and seven should-fixes are fixed through the shell, no regression: 7 harnesses exit 0 (pipefail, 22:43 EDT; shell 8,441 checks); the 6-clock × 10-role sweep (1,645 child views) has the same early-mention set as review 7; eight mutations each caught by the matching guard. What remains is small wording and one routing gap.

## 2. Must-fixes

**M1 fixed.** `ClaimDrawer:702` compares the full timestamp. 18:00 and 19:01: "differs", Ngozi "Ends 3390 on last year's return"; 19:02: "differed … and his card". Mutation F fails harness-drawer "H3b M1". Residue: Checks' item title still says "differs" at 19:02 (probe2 §4).

**M2 fixed.** `Main:322 blockersAt` is the one list. IDENTICAL button text in Home, Checks, Review, Filing, Firm at four clocks, after Priya adjusts ca-est (3), clock to 1 Jul (5), back (3), second adjustment (2). Mutation E fails integration and 4,481 shell checks.

**M3 fixed.** `Main:613` keeps every field, `who` the role key. Mark prepared → "Prepared", buttons disabled; Review → "Sent to reviewer"; Jo reassign → "Marcus Bell"; Ngozi signs → remounted "Signed"; attach then undo retracts (evidence 1 → 0); bell names Priya once. Mutations D, H fail "events keep every field" and integration's Jo-reassign check.

**M4 fixed.** `Main:358-373`. Driven through the shell: deadline warning → Priya; send back → Priya; Sam's quality finding → Priya, Daniel, Helen; Review finding → Priya, Helen; Firm publish → four staff, Helen's bell shows it. Mutation G fails "recipient rules H3b".

## 3. Should-fixes from review 7

1. Marcus tails **fixed**: attach text "an identifier was corrected", note "Theo's card (identifier withheld)"; mutation A caught.
2. Spouse table **fixed** in shell, Checks, drawer; Home drops ca-wages and salt-d02. Residue in §5.
3. PINs **fixed**: 0 hits in all harnesses and project files.
4. Clients after filing **fixed**: every claim "For your information", no questions at 15 Jul 2026, 15 Jan 2027, 26 Jan 2028.
5. Simulate **fixed**: `clock@06:07` (Example) then `value_changed`; Home reads `clientText` when present.
6. Stage and note times **fixed**: Firm and Filing equal the shell at six clocks; notes say "story time 23 Jun 2026, 06:05".
7. Harness gap **fixed**: mutation C fails "clock backwards shrinks the view" in shell and integration. 15 Jul → 23 Jun: events 31 → 24, Filed → Review, blockers 0 → 4, late mentions identical.

## 4. Coordinator choices

- **RSU → Ngozi: right.** D08 (Corvane W-2), D11, D28 all `belongs_to: taxpayer` = Ngozi; qa-06 is Erik's answer about "Ngozi exercised her Corvane ISOs". Through the shell Checks asks Ngozi alone. Standalone `Checks:290` lacks `SPOUSE_QA` and says "Ngozi and Erik" for rsu, repairs, care-ein; `harness-R:333` wrongly says it mirrors the shell.
- **Client whoName "You": works.** "You | answered the question about Theo's Social Security number", no doubling. Gap: `client_signed` has no plain text, so Ngozi's own signature reads "You | updated your return".

## 5. New should-fixes (small)

1. `Firm:334` sends `deadline_warning` without `assignee`; `Main:370` falls back to Priya, so the "review complete" warning skips Daniel while Firm says "The assignee and you are notified".
2. `Home:423` asks Erik "Your donated Subaru"; the drawer (noncash, Erik) says "Nothing needed from you".
3. After Ngozi signs, Erik's Filing shows her 8879 "Not signed" (`Main:607`: client_signed reaches staff only).
4. Checks theo-ssn title at 19:02; `Checks:290`; `client_signed` plain text.

## 6. Probes

`r8_probe.js`, `r8_probe2.js`, `r8_probe3.js`, `r8_facts*.py`, `r7_pins.py`; `r8_mut/A-H` against four harnesses.

### Trimmed probe output
```
# harnesses, pipefail, 22:43 EDT
shell 0 (8441 checks) · H 0 · R 0 · F 0 (31/31) · A 0 (17/17) · integration 0 · drawer 0 (27/27)
# M1
2026-07-13T19:01 ngozi: value="Ends 3390 on last year's return"   19:02: "Ends 3390 on his card"
# M2 after Priya adjusts ca-est, then clock 1 Jul, then back
shell 3 → 5 → 3 | IDENTICAL each time
# M3
Checks "Mark prepared" -> tword="Prepared" acts [all disabled]; Review -> "Sent to reviewer" dis=true
Firm reassign -> Marcus Bell (Reassigned in this story), marcus bell=1; Filing ngozi -> remounted "Signed"
saveNote -> attach event, liveRows 1, evidence 1; undo -> retracts 24, evidence 0
# M4
Firm warn -> rec ["priya"] (deadline=review, assignee "")   Firm publish -> ["priya","marcus","daniel","helen"]
Home sam finding -> quality_finding ["priya","daniel","helen"]   Review sam -> qr_finding ["priya","helen"]
# S1 marcus attach: text "an identifier was corrected", note "Theo's card (identifier withheld)"; no !! digits
# S2 rsu: shell=ngozi checks(shell)=Ngozi checks(alone)=Ngozi and Erik
# S7 priya: 23 Jun events=23 blockers=4 | 15 Jul events=31 stage=Filed blockers=0 | back events=24 stage=Review blockers=4
# facts: D08/D11/D28 belongs_to taxpayer (Ngozi Okafor); qa-06 answered_by Erik Lindqvist; tl-20 PIN tokens 2, hits 0
# mutations: A shell [marcus tails] · B shell [examiner] · C shell+integration [clock backwards] · D,H shell [keep every field], H integration [Jo reassign]
#            E integration+shell(4481) [blockers] · F drawer [M1] · G shell [recipient rules]
```
