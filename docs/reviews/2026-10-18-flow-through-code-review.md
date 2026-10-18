# Code review: adjustments flow through, commit 4d83965 (Fable, 18 Oct 2026 17:05 EDT)

Evidence: production build (`next build` exit 0, `next start -p 3313`), events/state API and rendered pages via curl;
`python3 -I` over `project-build/data/packet.json`; `vitest run` 541/541; e2e flow, fix-f1, filing-extension, overview
14/14 against that server. Server killed after.

## Must-fix

None.

## Should-fix

1. **A client can sign known-stale figures** (`src/domain/policy.ts:331`, `returnApproved` ignores staleness). Probe:
   approve, then adjust F1040.1a to 213,400 -> the return approval reads `stale: true`, six "Needs engine re-run"
   blockers exist, the client table shows Federal tax 81,962 (engine) with the "you will be asked to sign again" note,
   and `client_signature` is accepted (fingerprint 19533a87). The partner gate is bypassed by ordering. Refuse the
   signature while any key amount `needsEngine` (or the approval is stale); the note then rarely renders, which is fine.
2. **Engine blockers are invisible on Checks** (`src/components/work/Checks.tsx:86,109` count findings only). Wage
   change: overview says "Blocking 16 items stop filing, Open on Checks"; Checks says "10 blockers" and lists no
   engine line; Review alone names them. Same pre-existing gap as partner blockers, now six items wide. List
   `state.blockers` that are not findings, or caption the count.
3. **Drawer estimate is the sum of every adjustment** (`src/components/drawer/ClaimDrawer.tsx:110`,
   `effectEstimate(state)`), shown on each needs-engine line as if it were that line's effect. Filter to adjustments in
   `cs.from`, or word it "all adjustments together".

## Fine

- **Probe 1.** F540NR.72 -> 10,500: state 78 = 23,630 and 97 = 4,756, both `derived`, `from: ['F540NR.72']`, no engine
  blocker. Overview "v3 plus 1 adjustment (finalized)", no engine tag; client table "California 305,349 18,874 23,630
  Refund 4,756"; Areas summary Payments 23,630 / Refund 4,756 ("other 4 figures are the engine summary"); Return table
  "23,630 was 27,130 Recomputed"; AfterFiling at 16 Jul "Overpaid tax F540NR.97 4,756". Fingerprint: fresh 0bc16509,
  adjusted 5527d65c, adjust+undo 0bc16509. Priya's sign-off on 78 at 27,130 reads `stale: true` after the change; a
  later one covers 23,630 (unit test). Undo: state identical to a fresh workspace except `claims['line:F540NR.72']`
  holding its history at `current: 14000` (event-log residue; blockers equal).
- **Probe 2.** My own propagation of F1040.1a +1,000 (allowlist + integer + fit <= 0.5, topological) gives 7 derived /
  58 engine, identical sets and values to the app (F1040.1z, 9, 11, F540NR.13, F8812.1, F8960.13, SchCA540NR.1.A).
  Every app-replayable line fits one common operation in v1, v2 and v3 (0 exceptions); dropping the allowlist adds no
  line for this change. The 7 allowlisted lines left to the engine are three-term differences (F1040.22, F540NR.64),
  unlisted inputs (SchCA540NR.1.D, 2.D, 12.D, 17.D) and a two-input R-CARRY (SchCA540NR.12.A): conservative, correct.
- **Probe 3.** Clock at 14 Apr: adjustment refused ("earlier point in the story"); state and five pages 200, `claims {}`.
  At 16 Jul: frozen, adjustment refused (locked). Adjust at v3 then move back to 14 Apr: claims empty, card "17,999
  v2, as computed", no engine blocker; `buildClaims(pix, ...)` keeps graph and values on one version.
- **Probe 4.** R-RENTAL-LINE: SchE.18A/B carry F4562-E.total-A/B (13,891 / 7,329) in v1, v2, v3. R-8949-LOT: the only
  lot with inputs, F8949.F.SCORP, carries F7203.excess (15,315 in v1/v2, 21,215 in v3, input moved with it). Both are
  single-input carries in every version; the other 12 lots have no inputs and never enter the graph.
- **Probe 5.** Wage change with findings cleared: six frontier blockers (SchA.5e, F8812.11, F8863.7, F8960.17,
  SchCA540NR.1.C, 1.D), Approve 403 "Approval is blocked: Needs engine re-run: ...", Review button disabled with
  "Re-run the engine: 58 figures depend on changes it has not computed."; after undo no engine blockers, no flagged claims.
- Tests changed for right reasons (fix-f1 "3 lines differ": 72, 78, 97; filing-extension caption). No em dash in any
  added line. Staleness uses `flowAt(seq)` (plan must-fix 4 done). `project.ts:597` frontier test matches flow.ts.
