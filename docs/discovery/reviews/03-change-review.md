# Review of Discovery 3 — Change

Reviewer: Fable 5.1 (independent; CPA + tax-system design lens). 16 Oct 2026, 03:54 UTC. Probes `p0`–`p6` in
`scratchpad/review/change/`, written fresh, run `python3 -I` against the read-only packet.

## 1. Measured table and headline — re-measured

| Claim | Result |
|---|---|
| Version dates, 64/65/71 docs, D30 superseded, v3 adds D26 D37 D38 D40 D43 D73 | reproduced (p1) — **v2 also added D69** (IRS transcript); the doc omits it |
| Diff 63 (61/1/1), 89 (87/2); 0 unstated / overstated / mismatched; fields `key, change, old, new` | reproduced (p2) |
| Root 7 of 63, 11 of 89 | counts reproduced; heuristic wrong (F2) |
| Churn 98 / 54; v3 627 lines; M14 A→D, acquired 2024-10-15 → 2024-09-15 | reproduced (p2) |
| Diagnostics 13 → 13 → 11, two K-1/S-corp codes dropped, 0 new | reproduced (p1) |
| 10 of 20 rates move; the three examples | reproduced (p2); v2→v3 alone moves 10 |
| What-ifs 0/−1,050/22; 10,245/−260/75; 3,633/896/63; 12,306/0/20; 0/0/0; overlaps 42/18/16/14/13 | reproduced (p3) |
| Extension 35,728 → 36,000, CA 0; news after v3; 29 events (3/7/2); 8879 and e-file dates; firm rules | reproduced (p3, p4) |
| HVAC 10,850 × v3 = 3,364 / 1,074; engine 3,633 / 896 | arithmetic reproduced (p6) — see F1 |
| Ledger federal sum −9,113 → 4,220 becomes −4,893; 94.9 % and 93.6 % paid; v1→v2 +270 | reproduced (p6) |

## 2. Outside rules

- 26 CFR 301.6651-1(c)(3): verified at law.cornell.edu/cfr/text/26/301.6651-1 (ecfr.gov blocked). Individual test:
  excess of tax shown over tax paid by the regular due date "no greater than 10 percent", and the balance "remitted
  with the return". The doc quotes the corporate (c)(4) "90 percent" form; numerically equivalent.
- Pub 1345 Rev. 12-2025: verified from the PDF text. $50 / $14 thresholds; rejected data "corrected and retransmitted
  without new signatures" inside them. "Void" is the doc's word.
- 31 CFR 10.21: verified (law.cornell.edu/cfr/text/31/10.21). NTA blog: verified (original return controls the
  limitation periods). FTB six-month rule (R&TC §18622): ftb.ca.gov 403; confirmed only in OTA opinions
  (ota.ca.gov …/220811057-Davidson-Reha-SCP-Opinion-060123wm.pdf), secondary.
- FTB 8879 re-signature thresholds: **not found**; the doc applies the IRS $50/$14 to the California 8879 unsourced.

## 3. Findings

### Must-fix

**F1 — The headline example flips nothing, and the "README-prescribed" rate is misidentified (p6).** The rule is "over
1,000 (federal **or** state)"; federal is 3,364 by rates and 3,633 by engine, so partner sign-off is required under
both methods and CA 1,074 vs 896 is irrelevant to routing. Further, the README says a fully CA-source item ("the
Sacramento rental") uses `ca_source_income` (0.064) → **+694**, which the ground-truth entry itself records. The
shortcut is off by 202 the other way. The lesson (method + rates version per tax effect) stands; the example does
not. Note also the engine's implied federal rate on rental income is 0.335 (NIIT): there is no passive-rental
category in `tax_effect_rates`.

**F2 — "Root = has its own sources" counts ripple as cause (p5).** `F1040.16`, `F540NR.31`, `F540NR.39` are sourced to
`ref:param.*` / `household:*`. True roots: v1→v2 three Meridian lots (D31); v2→v3 eight document-rooted lines, not
11. Define root as added/removed, `sources` changed, or a source document new to the version; exclude `ref:` and
`household:`.

**F3 — (b) is not what the doc says (p5, p6).** D73 and D26 changed **no line** when v3 used them: `Sch1.16` = 15,214
in all versions (sourced qa-26); CA wages 218,400 in all. In v2 they would have left the 36,000 unchanged. What was
knowable on 14 Apr and ignored: D69 (used since v2) shows 12,000 of estimates, so the true v2 balance was 36,728,
already above the 36,000 paid; and the Ridgeline K-1 was known pending since msg-01 with a prior-year box 2 of 7,900
(v3: 8,400). Reframe as "extension ignored a transcript in hand and a known-pending K-1"; a process observation, not
a confident packet mistake.

### Should-fix

**F4 — (a) holds on v3 numbers, with caveats.** Presumption covers only the §6651(a)(2) penalty (276), never
interest (196), and only if the balance is remitted with the return; the payment is 20 Jul, six days after
acceptance — the "610 Payment with return" code supports the doc, say so. Stakes ≈ 84 penalty + ≈ 78 interest (p6).
The stronger point: if the ledger is right, there is no balance for codes 610/276 to attach to. Hypothesis until a
final return exists.

**F5 — Adjustments do not ripple.** "Engine value + adjustments replayed" leaves every total downstream of an adjusted
input stale. Change must say what AGI/tax lines show after an adjustment ("N adjustments not reflected", a
rate-estimated delta, or nothing); Calculation needs that decision as input.

**F6 — Bulk vs the 1,000 rule.** Fifty confirmations of 900 route to nobody. Decide per adjustment, per change set, or
both; and re-pricing at a new version can push an approved adjustment over 1,000 — stale must re-route, not just mark.

**F7 — A document used that changed nothing is a change.** D69 in v2 is the GT-A04 tell; D26/D73 in v3 likewise.
"What changed" should list newly used, zero-effect documents explicitly.

### Notes

- N1 Source the FTB 8879 re-sign rule before reusing $50/$14 for California.
- N2 "Void" → "requires a new Declaration of Taxpayer".
- N3 Quote the individual (c)(3) 10 % wording, not the corporate 90 %.
- N4 Promoting the HVAC what-if while a GT-C05 adjustment exists double-counts; promotion must retire or link it.
- N5 msg-08 does not clear `LOW_CONFIDENCE_READ` (ev-1049 stays 0.41); a `confirmed_with_client` verification does.

## 4. Verdicts

- (a) **Supported with caveats** — rule verified, 94.9 % reproduced; penalty only, small dollars; the ledger's refund
  outcome is the bigger inconsistency. Low-severity packet note.
- (b) **Dates reproduced, reasoning fails** — D73/D26 changed nothing; the stale inputs were D69's 12,000 and the
  pending K-1. Reframe before it enters the ground truth.
