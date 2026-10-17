# Ground truth — confident mistakes in the packet

Hunted 15 Oct 2026, 22:25–22:34 UTC, by four agents (one per area). Packet read-only. Full evidence per finding in the
area files; this is the index. Tax effects use v3 `tax_effect_rates`, each finding taken alone (fixes interact; the real
system recomputes). **+** = the return currently understates tax; **−** = it overstates tax.

| File | Area |
|---|---|
| [01-wages-people-credits.md](01-wages-people-credits.md) | wages, people, credits, retirement, payments, agency |
| [02-investments-foreign-k1.md](02-investments-foreign-k1.md) | brokerages, crypto, Swedish account, K-1s, basis |
| [03-business-rentals-assets.md](03-business-rentals-assets.md) | Schedule C, rentals, rental sale, depreciation, prior preparer |
| [04-state-deductions-integrity.md](04-state-deductions-integrity.md) | CA/TX split, itemized deductions, gifts, whole-return math |

## Spot-check by the main session (15 Oct 22:34 UTC)

Read directly from `printed_content` and v3 lines, script `scratchpad/spot.py`:
- **GT-A01 holds:** D11 p2 prints "RSU-2502 … adjusted basis 19,100.00"; v3 `F8949.B.N1` = 19,240 with sources ev-0493…0498 only (no D11 value).
- **GT-A03 holds:** D68 prints "2025-09-15 3,500.00 tax year 2024"; the pipeline read it right (ev-1076 = 2024) yet `F540NR.72` = 14,000 includes it.
- **GT-C01 holds:** D15 p3 prints "Atlas … 41,200.00 … of which 12,400.00 arrived through Paywell"; `SchC.1` = 163,700.
- **GT-C05 holds:** D47 prints "Removed failed 2004 gas furnace … Installed new 3-ton heat pump system … Permit #B25-31877".
- **GT-B01 holds:** D28 and D29 both print 1,840.00 for the Northlake sweep; v3 has `SchB.1.1` = 1,840 and `SchB.1.2` = 1,840.

Not yet spot-checked: the rest. GT-D04 was confirmed and revised by the Discovery 9 review (16 Oct): allowed but limited.

## Index (27 distinct; two duplicates merged)

| ID | Mistake | Sev. | Fed | CA |
|---|---|---|---|---|
| GT-A01 | RSU stock sales at $0 basis; stock-plan supplement (D11) ignored → same income taxed twice | high | −15,536 | −2,765 |
| GT-A02 | California wages include Halvorsen pay earned after the move to Texas | high | 0 | −5,685 |
| GT-A03 | CA estimated payments include a payment marked "tax year 2024" | high | 0 | refund −3,500 |
| GT-A06 = GT-C03 | Self-employed health insurance deducted though Erik could join Ngozi's employer plan (qa-25) | high | +4,464 (QBI offset not captured) ¹ | +605 |
| GT-C01 | 1099-K card money counted twice in Schedule C gross receipts | high | −4,402 | −384 |
| GT-C05 | $11,000 heat-pump replacement deducted as a repair; it's an improvement to depreciate | high | +3,633 ² | +896 ² |
| GT-A04 | Federal Q4 estimate from the client's guess (4,000), IRS transcript shows 3,000 | med | +1,000 due | — |
| GT-A05 | Theo's SSN transposed (…3309 vs card …3390) → the July e-file rejection | med | risk | — |
| GT-B01 | Northlake sweep interest on two forms, counted twice | med | −640 | −127 |
| GT-B03 | Crypto lot C6 at $0 basis after the client sent the real cost (msg-07, after v3) | med | −1,312 | −195 |
| GT-B05 = GT-C09 | Prior preparer's open item (2023 Form 3520, foreign inheritance) dropped | med | 2023 penalty risk | — |
| GT-C02 | Mileage-log page scanned twice: 11,800 miles vs 8,100 | med | +919 | +80 |
| GT-C04 | Phone/internet/Spotify at 100% business; call notes say 70/50/0% | med | +541 | +47 |
| GT-C06 | Section 179 not elected for equipment; saves CA at no federal cost | med | 0 | −1,050 |
| GT-C07 | SEP contribution over the limit; 10% excise, never flagged | med | +279 excise | — |
| GT-D01 | Lonestar payoff interest counted twice (1098 already includes it) | med | +559 | +103 |
| GT-D02 | Home property tax includes the seller's share credited at closing | med | +1,462 | +332 |
| GT-D03 | Donated car at the client's Blue Book guess, not the 1098-C sale price | med | +806 | +149 |
| GT-D04 | CA Schedule S credit for Oregon tax not limited (allowed for a composite return, but capped) | med | 0 | +209 ³ |
| GT-B02 | Swedish interest converted at the 2024 FX rate, not 2025 | low | +43 | +9 |
| GT-B04 | Meridian lot M18 (page 32) never read in either 1099 — the source of the engine's own mismatch warning | low $ / high process | −21 | 0 |
| GT-C08 | Home-office simplified method blended across two homes | low | +195 | +17 |
| GT-C10 | 2024 return claimed 300 sq ft office; measured 220 | low | 2024 only | — |
| GT-D05 | Underpayment penalty ignores excess Social Security as withholding | low | −140 | — |
| GT-D06 | Schedule CA column D lines list incomplete inputs (trace gap, numbers right) | low | 0 | 0 |
| GT-A07 | Little Sprouts tax ID misread at 0.97 confidence | low | 0 | — |
| GT-A08 | Wrong provider name on Form 2441 | low | 0 | — |

¹ Corrected 16 Oct 04:06 UTC (reconciliation item 2): was +3,770, which used a 24% bracket from outside the packet; the README says the adjustment rate does not capture QBI, so the packet-consistent figure is 14,400 × 0.31 with QBI noted as uncaptured (file 01).
² Corrected 16 Oct 04:06 UTC (reconciliation item 1): was +3,364 / +1,074 by rates; the packet's own engine result `what_if.hvac_improvement` is the identical change (federal +3,633, CA +896), and an engine result beats the rate estimate. Verified by Fable 5.1 (`docs/packet/reviews/readme-explained-verify.md`) and by the main session.

³ Corrected 16 Oct 04:15 UTC (reconciliation items 3, 22): was "+209 to +844" on the view that no credit is allowed; Schedule S's group-return exception and Oregon's 2025 composite guide make it allowed but limited to ≈ 635.

**The engine's arithmetic is sound:** a line-math checker recomputed 148 of 221 formula lines in each version with 0
mismatches (and was proven able to fail). Every mistake is a **wrong input, a missed document, or a rule applied too
simply** — the engine never flags any of the 27.

## What the mistakes teach the data model

| Pattern | Findings | What the app must carry or check |
|---|---|---|
| **Same money, two documents** | B01, C01, C02, D01 | Link values that represent the same real-world amount; a "counted twice?" check across documents |
| **Evidence present but unused** | A01, D02, B04 | Document → "where it landed, or why not"; unmatched lots/pages/values are visible orphans |
| **Read right, applied wrong** | A03, A02, B02 | Checks that re-derive from printed facts (tax year, dates vs residency, FX year), not trusting the engine |
| **Client said vs document says vs later news** | A04, A06, B03, C04, D03 | Client answers and messages as first-class evidence with time; flag info that arrived after the version it should have changed |
| **Judgment calls** | C05, C06, C07, D04, C08 | A recorded decision (who, why, tax effect) per judgment item; elections as explicit choices |
| **Identity misreads** | A05, A07, A08 | Cross-check identifiers against the identity documents and prior year |
| **Carry-forward** | B05/C09, C10 | Prior-year open items and figures carried in with their status |
| **Trace gaps** | D06 | Every line's inputs must sum to it, or the gap is shown |

Each finding gets a test in `project-build/tests/` asserting the app surfaces it.

## Found after the build by the AI reader (17 Oct 2026)

- **GT-D07 · St. Brigid donation lacks a contemporaneous written acknowledgment.** D64 (handwritten receipt, received
  2026-02-10) prints 500.00 and "No goods or services line"; the return's SchA.11 (3,350) includes a 1,500 gift to
  St. Brigid supported only by a phone confirmation (msg-08). IRC 170(f)(8) requires a written acknowledgment that
  states whether goods or services were provided for any gift of 250 or more, obtained before filing. The other
  receipts (D63, D65) carry the statement. Effect if disallowed: SchA.11 −1,500, about +390 federal, +72 California
  (packet rates). Found blind by the AI reader (reader-v2, Claude Sonnet 5.5), verified by Fable 5.1 against the packet
  (docs/reviews/2026-10-17-ai-v2-adjudication.md) and by Opus 5.5 (python3 -I read of D63, D64, D65, SchA.11, msg-08).
  Our own hunt had marked D64 resolved by msg-08, which settled the amount but not the acknowledgment. No
  deterministic check covers it yet.
