# Taxmark: the errors we found, and how the design surfaced them

Generated from the app's own catalogue of checks and their output on the real packet, so every mistake here is one the
app flags on Checks; the per-mistake sentences are the catalogue's own notes. Ids starting GT- are our ledger numbers for each mistake.

## How they were found

Before building, we hunted the packet for confident mistakes: four AI researchers (Claude Opus 5.5), one per area,
each reading the printed documents against the extracted values, the three computed versions, the IRS and California Franchise Tax Board (FTB) account
records, the prior year and the client's own answers. Each finding was logged with its document, field, value, why it is
wrong and its evidence; findings were spot-checked against the printed pages. Reviewers, including a second model (Claude
Fable 5.1), raised and checked doubtful items, and the main session resolved them before the build. Two entries turned out to be
the same mistake logged twice, so 29 ledger ids collapse into **27 distinct mistakes**.

Then each mistake became a **deterministic check** in the app, written against the packet's schema and never against
a document id, and tested on an altered copy of the packet to prove it can fire and stay silent. The app does not
remember the answers; it re-derives them.

## The 27 mistakes

Tax effect is the estimated change in tax from correcting the mistake, from the packet's own `tax_effect_rates`
(plus means more tax owed). It is an estimate; the engine has not recomputed the return.

| Id | The mistake | Caught by | In the app | Tax effect of the fix |
|---|---|---|---|---|
| GT-A01 | RSU sales at zero basis; the stock-plan supplement (D11) ignored, so wage income is taxed twice | Blank read used as zero | Blocker | −15,536 federal, −2,765 California |
| GT-A02 | California wages include Halvorsen pay earned after the move to Texas | Residency and sourcing | Blocker | −5,685 California |
| GT-A03 | California estimated payments include a payment designated tax year 2024 | Tie-out to agency record; Field the rule ignores | Blocker | +3,500 California |
| GT-A04 | Federal Q4 estimate from the client's guess (4,000); the IRS transcript shows 3,000 | Tie-out to agency record | Check failed | +1,000 federal |
| GT-A05 | Theo's SSN transposed in the organizer; caused the July e-file rejection | Identity vs documents and prior year | Blocker | no dollar effect |
| GT-A06 (also GT-C03) | Self-employed health insurance deducted though Erik could join Ngozi's employer plan (the client's own questionnaire answer) | Client answer vs line | Blocker | +4,464 federal, +605 California |
| GT-A07 | Little Sprouts tax ID misread at 0.97 confidence | Two sources disagree | Check failed | no dollar effect |
| GT-A08 | Wrong provider name on Form 2441 | Two sources disagree | Check failed | no dollar effect |
| GT-B01 | Northlake sweep interest on two forms, counted twice | Value counted twice | Check failed | −640 federal, −127 California |
| GT-B02 | Swedish interest converted at the 2024 exchange rate, not 2025 | Field the rule ignores | Check failed | +43 federal, +9 California |
| GT-B03 | Crypto lot C6 at zero basis after the client sent the real cost (in a message that arrived after the last computed version, v3) | Answer after the last computation | Blocker | −1,312 federal, −195 California |
| GT-B04 | Meridian lot M18 (page 32) never read in either 1099; the cause of the engine's own mismatch warning | Blank read used as zero | Check failed | −21 federal, −2 California |
| GT-B05 (also GT-C09) | Prior preparer's open item (2023 Form 3520, foreign inheritance) dropped | Open item never closed | Check failed | no dollar effect |
| GT-C01 | 1099-K card money counted twice in Schedule C gross receipts | Value counted twice | Blocker | −4,402 federal, −384 California |
| GT-C02 | Mileage-log page scanned twice: 11,800 miles vs 8,100 | Value counted twice | Check failed | +919 federal, +80 California |
| GT-C04 | Phone, internet and Spotify at 100% business; call notes say 70%, 50%, personal | Client answer vs line | Check failed | +541 federal, +47 California |
| GT-C05 | 11,000 heat-pump replacement deducted as a repair; an improvement to depreciate | Judgment needed | Blocker | +3,633 federal, +896 California |
| GT-C06 | Section 179 not elected for the equipment; saves California tax at no federal cost | Cheaper election available | Blocker | −1,050 California |
| GT-C07 | SEP contribution over the limit; the excess was carried and never flagged | Limit or cap | Judgment | no dollar effect |
| GT-C08 | Home-office simplified method blended across two homes | Judgment needed | Judgment | +195 federal, +17 California |
| GT-C10 | 2024 return claimed a 300 sq ft office; the room measures 220 | Prior year vs documents | Check failed | no dollar effect |
| GT-D01 | Lonestar payoff interest counted twice (the 1098 already includes it) | Value counted twice | Check failed | +559 federal, +103 California |
| GT-D02 | Home property tax includes the seller's share credited at closing | Two sources disagree | Blocker | +1,462 federal, +332 California |
| GT-D03 | Donated car at the client's Blue Book guess, not the 1098-C sale price | Two sources disagree | Check failed | +806 federal, +149 California |
| GT-D04 | California Schedule S credit for Oregon tax not limited (allowed for a composite return, but capped) | Limit or cap | Check failed | +209 California |
| GT-D05 | Underpayment penalty ignores excess social security tax as withholding | Field the rule ignores | Check failed | −147 federal |
| GT-D06 | Schedule CA column D lines list incomplete inputs (trace gap; numbers right) | Trace gap | Note | no dollar effect |

**10 of the 27 are blockers:** the partner cannot approve the return while any is open. Net estimated effect of
fixing all 27: **−8,436 federal, −4,261 California** (each estimate taken alone;
fixes interact).

## How the design surfaced them

Five design choices do the work, in this order of importance:

1. **Checks that do not trust the engine.** Each check re-derives what should agree: the return against the IRS and
   FTB account records, two documents against each other, this year against last, a field the engine ignored (a
   payment's tax year, an exchange rate's year), a client's answer against the line it should change. A wrong value
   read at 0.99 confidence is still caught, because confidence is never the test.
2. **One inbox, blockers first.** Checks lists one row per item (a line or document) by severity, with its amount and tax effect and pills for who flagged it (our rule checks, the AI reader) and whether every value behind it was read confidently; the engine's
   own diagnostics sit beside ours under their own label, never mixed in.
3. **Trace in one click.** Every finding links to the claim it sits on; the side panel shows the source page with the
   field highlighted, the rule that built the number, who checked it and what is open.
4. **The story clock.** A finding appears only once its evidence has arrived (a late K-1, a client message after the
   last computation), so the inbox at any date shows what a reviewer could know then.
5. **Findings stop the return.** A blocker or a blocking review note disables approval; an adjustment that clears it
   keeps the original value, the reason and the tax effect, carries through the totals it feeds, and needs the partner
   when the effect is over 1,000.

Per mistake, in the catalogue's own notes:

- **GT-A01.** Blank broker basis read as 0.00 matched to the supplement lot with the same acquisition date; the unused supplement value is shown beside each lot.
- **GT-A02.** State wages rebuilt per employer from W-2 box 16, or the paystub split at the move date where one exists, against the residency dates.
- **GT-A03.** The payment's own tax-year field (read correctly by the pipeline) is checked, and the line is tied out to the FTB account by tax year.
- **GT-A04.** Estimated payments tied out to the estimated-payment lines on the IRS account transcript; the part resting only on a client answer is named.
- **GT-A05.** Every organizer SSN compared with every document that prints one for the same person (the 2024 return already had it); a mismatch blocks e-file. Last 4 only.
- **GT-A06.** The questionnaire answer on eligibility is linked to the line it gates, with last year's treatment beside it.
- **GT-A07.** Each identifier read is compared with the printed page; a transposition is shown whatever the confidence.
- **GT-A08.** A line naming a party with its tax ID is checked against the name the cited document prints.
- **GT-B01.** Two income lines with the same amount from documents that print the same account are flagged as one payment.
- **GT-B02.** Every foreign amount shows its rate and the rate's year; income must use the tax year's average.
- **GT-B03.** A message after the last computation that supplies a missing fact is shown as "answered, not applied" on the line, and it appears in the story when it arrives.
- **GT-B04.** A partial extraction used by the return lists its unread pages and what they print; the summary gap is traced to them.
- **GT-B05.** Each prior-preparer open item is carried in and checked for a resolving document; the one with none stays open, linked to the documents that mention the same fact.
- **GT-C01.** Gross receipts are reconciled to the books. A 1099-K amount the books' deposit detail already includes is a duplicate, not an unmatched receipt.
- **GT-C02.** Pages whose extracted values repeat another page are flagged before their totals are summed.
- **GT-C04.** Call notes with a business share are linked to the books lines they describe.
- **GT-C05.** An invoice inside a repairs line that reads as a replacement goes to a repair-or-improvement judgment, with the engine's own what-if as the effect.
- **GT-C06.** Engine what-ifs that lower tax with no cost anywhere are presented as elections to decide.
- **GT-C07.** The contribution document is set beside the deductible limit; the excess becomes a decision item.
- **GT-C08.** A simplified home office with two areas in a year with two homes asks for a method per home.
- **GT-C10.** Prior-year figures are compared with this year's source documents, saying which year looks wrong.
- **GT-D01.** A lender statement that says it is reported on the Form 1098 is linked to the 1098 as detail, never a second source.
- **GT-D02.** A closing-statement tax credit that feeds no line is set beside the property-tax line for the same address, with the effect of the cap on deductible state and local taxes (SALT).
- **GT-D03.** A line taken from a client's estimate is shown against the third-party form for the same item.
- **GT-D04.** A credit equal to the raw other-state tax times a day ratio is checked against the limit to California's tax on that income.
- **GT-D05.** The penalty is recomputed from the packet (proven by reproducing the engine's figure first) with excess social security counted as withholding.
- **GT-D06.** Every sum line is recomputed from its listed inputs; where they do not reach the value, the missing sibling line is named.

## What the AI reader found on its own

After the build we ran an AI reader (Claude Sonnet 5.5) blind over the packet, with none of these mistakes or their
titles in any prompt. Judged by a second model, it found 13 of the 27 for the same reason (14 counting a partial).
It also found one we had missed, now logged as **GT-D07**: the 1,500 gift to St. Brigid rests on a handwritten
receipt (D64) with no statement of goods or services, which IRC 170(f)(8) requires for gifts of 250 or more; our hunt
had treated a phone confirmation of the amount as enough. If disallowed: about +390 federal and +72 California. Of its
other suggestions outside our list, a second model judged 8 wrong and 3 repeats of others, which is why every AI
suggestion waits for a person. An earlier run had made three confident mistakes from a 1099 that was later replaced;
a verifier rule now holds those back.
