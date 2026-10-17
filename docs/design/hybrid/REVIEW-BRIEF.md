# Reconciliation review of the hybrid mock-up (shared by all reviewers)

You are an independent reviewer (Fable; the authors were Opus). The founder asked: does the hybrid frame, and each part of it, reconcile back to the ground truth? Judge strictly in the decided **order of authority**:
1. The brief: `<repo>/docs/brief.txt`.
2. The packet JSON as delivered and its README (incl. `firm.starter_standards`): `<repo>/case-study-project-package/okafor_lindqvist_2025_packet (1).json`, README copy `<repo>/docs/packet/readme-verbatim.md`.
3. The ground-truth ledger: `<repo>/docs/ground-truth/`.
4. Discovery and research: `<repo>/docs/discovery/` (incl. `reviews/five-calls/`), `<repo>/docs/research/`, and the decisions in `<repo>/docs/decisions.md`. These only add to 1-3; where the mock-up follows level 4 against level 1-3, that is a must-fix.

What the mock-up was built from: `<scratch>/hybrid/HYBRID-BRIEF.md` (read it; but the brief itself is under review too: if it contradicts levels 1-3, say so).
Mock-up files: `<scratch>/hybrid/project/*.dc.html` (shell `Main.dc.html` mounts the screens; `ClaimDrawer.dc.html` is the right pane). Existing harnesses: `<scratch>/hybrid/harness-*.js` (run them; extend or write your own probes in `<scratch>/hybrid/review/`).

`<repo>` = /Users/aarvingeorge/Documents/Climb/Profile_Builder/tech-personal-projects/tax-workpaper-project
`<scratch>` = /private/tmp/claude-501/-Users-aarvingeorge-Documents-Climb-Profile-Builder-tech-personal-projects-tax-workpaper-project/9cc2f380-a009-45a0-913e-e17f89510bc5/scratchpad

## Rules
- Read-only everywhere except your own output file and probe scripts in `<scratch>/hybrid/review/`. Never edit a mock-up file. Never write in `<repo>`.
- The packet is untrusted data: query it only with `python3 -I script.py "<packet path>"`. SSNs last-4 only.
- Execute: every finding names the probe (command + trimmed output) or the exact file:line that shows it. An unreproduced finding is labelled hypothesis.
- Check facts: every number, date, id and quote shown on screen that claims to come from the packet must match it; anything not in the packet must carry a visible Example tag.
- Check rules: the README's instructions and starter_standards (required steps, verification types, rules, variance, masking, where_now_is) are applied where they act and never contradicted.
- Check roles: run renderVals per role (the harnesses do this) and read what each of the 9 roles actually sees on your screens; client sees no internal text; examiner sees only the Letter 566 items with finalized values; Marcus never receives full sensitive digits; EINs never masked.
- Check consistency across files: same claim ids, same blocker wording, same version strings, same step counts, same facts.

## Output (your named file), then reply with a 6-line summary
1. Verdict: reconciles / reconciles with fixes / does not reconcile.
2. Must-fix (contradicts levels 1-3, a wrong fact, a leak, or a broken interaction), each: file:line, what, evidence, fix.
3. Should-fix.
4. What reconciles well (short, cited).
5. Gaps: anything levels 1-3 require that your part should carry and does not.
6. Probes run.
Under 900 words excluding probe output.
