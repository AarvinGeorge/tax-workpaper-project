# Discovery 3 — Change

Written 16 Oct 2026, ~03:50 UTC. Part 3 of 8 in the section-by-section discovery of the brief's "What it must do".
Every number below was measured from the packet (read-only) with scripts in the session scratchpad
(`disc/change/c2.py` … `c11.py`, run as `python3 -I`). Revised after an independent review (§9). Outside rules are cited inline; anything not opened at its
source is marked **unverified**. Nothing here is a decision yet; proposals are marked as such.

## 1. What the brief asks

> Change: adjust without losing the original (who, why, tax effect). See changes live and what changed since I last
> looked. Compare versions. Try what-ifs. Act on many items at once, with undo.

Five jobs: **adjust with provenance**, **live + "since I last looked"**, **compare versions**, **what-ifs**,
**bulk with undo**. Already decided: a server database with an append-only event log over the read-only packet, one
workspace per link, reset = new workspace (`docs/decisions.md`). An **adjustment** here means any change a person
makes on top of the engine's number (a correction, an override, a reclassification).

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| Versions | v1 04 Mar (64 docs used), v2 19 Mar (65; D31 and D69 IRS transcript in, D30 superseded), v3 23 Jun (71; adds D26, D37, D38, D40, D43, D73) | Three engine snapshots; none made by a person |
| `changes_from_previous` | v1→v2: 63 (61 changed, 1 added, 1 removed); v2→v3: 89 (87 changed, 2 added). Recomputed by diffing lines: **0 unstated, 0 overstated, 0 old/new mismatches** (`c3.py`, which can report each) | The packet's own diff is trustworthy; the app can show it as given |
| Fields on a change | `key, change, old, new` only — no who, no why, no tax effect | The brief's "who, why, tax effect" is entirely ours to add |
| Root vs ripple | Root = line added/removed, or its document sources changed, or it cites a document new to the version; engine parameters (`ref:`) and the organizer (`household:`) excluded (`c9.py`). v1→v2: **4 line events = 3 Meridian lots** (M6, M9, M14) of 63. v2→v3: **6 document-rooted lines** (D37 ×4, D38, D40) **+ 1 timeline-rooted** (`Sch3.10`, the 36,000 extension payment) of 89 | ~90% or more of a diff is ripple. "What changed" must lead with causes, not 63 rows |
| Provenance-only change | `Sch1.16` SEP deduction = 15,214 in all versions, but its source moves from qa-26 (client answer) in v2 to ev-0485 (D26) in v3; it is **not** in `changes_from_previous`. D43 cited on 2 lines, D73 and D69 on **0** lines, none changed (`c9.py`, `c10.py`) | A value diff hides a change of evidence and documents that were used to no effect |
| Churn | 98 distinct lines changed across the two steps, 54 of them in both; v3 has 627 lines | A line can change twice; history is per line |
| Identity break | Lot M14 (Harbor Lane ETF): v1 `F8949.A.M14` "removed", v2 `F8949.D.M14` "added". The corrected 1099 moved the acquired date 2024-10-15 → 2024-09-15, so short-term became long-term | A key-based diff calls one lot two events. Anything attached to the old key (a tick, a note) would be orphaned |
| Diagnostics | 13 → 13 → 11. v3 drops `K1_EXPECTED_NOT_RECEIVED` and `SCORP_BASIS_INCOMPLETE` (resolved by D37/D38 and D40); 0 new | A warning vanishing is a change too; it should say what resolved it |
| Tax-effect rates | 10 of 20 per-dollar rates differ between versions; e.g. CA wages 0.071 → 0.099, CA long-term gains 0.008 → 0.034 (×4), federal Sch C 0.306 → 0.356 | A tax effect computed in March is wrong in June unless re-priced |
| What-ifs | 5, all on base v3: §179 (fed 0, CA −1,050, 22 lines), no bonus (fed +10,245, CA −260, 75 lines), HVAC as improvement (fed +3,633, CA +896, 63 lines), standard deduction (fed +12,306, CA 0), annualized penalty (0 and 0, **0 lines**) | One what-if changes nothing; the app must say so, not show a blank |
| What-if overlap | Pairs share lines: no-bonus ∩ HVAC 42, no-bonus ∩ std-deduction 18, HVAC ∩ std-deduction 16, §179 ∩ HVAC 14, no-bonus ∩ §179 13 | What-ifs are not additive; combining two needs the engine, or a labelled estimate |
| Extension | 14 Apr, sized from **v2** (balance 35,728 → paid 36,000, "rounded up to next 500"); CA 0. v2 counts 13,000 of estimates (`F1040.26`, from D67 + qa-41); the transcript in file since 12 Mar shows 12,000, so v2's true balance was **36,728**, already above the payment (`c10.py`, `c11.py`) | A decision taken on a version with a known gap (see §5) |
| News after v3 | msg-07 (30 Jun, crypto cost 3,050 → GT-B03), msg-08 (1 Jul, client says the St. Brigid gift is 1,500; supports a client-confirmed verification, but ev-1049 stays at 0.41 confidence and the `LOW_CONFIDENCE_READ` warning does not clear by itself), D71 (13 Jul, SSN card → GT-A05), D72 (2028 exam letter) | Evidence keeps arriving after the last version; v3 is not the end |
| Timeline | 29 events; 3 `return_computed`, 7 `document_received`, 2 `client_message`; 8879 signed 10 Jul, rejected 13 Jul, accepted 14/15 Jul | The change history must interleave with signing and filing |
| Firm rules | "Any adjustment with a tax effect over 1,000 (federal or state) requires partner sign-off"; "may not review … work they prepared" (`firm.starter_standards`) | Tax effect is not just display — it routes approval |

## 3. The headline insight: the tax effect of a change is a measurement with a date and a method, not a fixed number

The firm's rule ("over 1,000, federal **or** state, needs partner sign-off") makes the tax effect decide who must
approve. The packet shows that number depends on how it is computed (`c11.py`):

| GT-C06: elect §179 for the 38,000 studio equipment | Federal | California | Partner needed? |
|---|---|---|---|
| Rate shortcut, Schedule C: −20,000 CA AGI × 0.031 | 0 | −620 | **no** |
| Rate shortcut, CA-source: −10,685 CA AGI × 0.064 | 0 | −684 | **no** |
| Engine what-if `equipment_section179` | 0 | **−1,050** | **yes** |

Federal is 0 under every method, so the California figure alone decides routing, and only the engine figure crosses
1,000. A second item shows the spread is not a one-off: for GT-C05 (HVAC as an improvement, 10,850 more Sacramento
rental income) California is +694 at the README's `ca_source_income` rate for the Sacramento rental, +1,074 at the
`ordinary_income` rate the ledger used, and +896 by the engine what-if. (Federal is over 1,000 by every method there,
so routing does not flip; the engine's implied federal rate on rental income is 0.335, and `tax_effect_rates` has no
passive-rental category.) Add the rate drift (10 of 20 rates moved between versions) and every stored tax effect
needs: the **method** (engine what-if / rate × change, naming the category / 1:1 for credits and payments), the
**version whose rates were used**, and a **stale flag that re-routes**, not just marks, when a newer version re-prices
it. When an engine what-if exists for the same change, it outranks the shortcut. Both items double as the cleanest
"what-if becomes real" cases.

Second insight: **a version diff must be grouped by cause.** v1→v2 is one document (D31) changing 3 lots and
rippling to 63 lines; v2→v3 is three documents that move numbers (D37, D38, D40), one that changes only a source (D26),
two used to no effect (D43, D73), and the extension payment, across 89 lines. "What changed since I last looked"
should read "D31 corrected Meridian 1099: 3 lots, +270 federal tax", with the ripple folded underneath, and must also
list documents and source swaps that moved no number.

## 4. What each role needs from Change (domain view)

- **Preparer:** fix a number in place with a reason and a link to the evidence; see the federal and CA effect at once;
  pull a client message (msg-07) straight into an adjustment; bulk-confirm low-risk items and undo a slip.
- **Reviewer / partner:** a "since I last signed" view, grouped by cause, with only the changes that touch what they
  signed. A reviewer tick that flips when its number changes; Lacerte already turns a check mark red when the line
  changes ([Intuit](https://accountants.intuit.com/support/en-us/help-article/tax-return/audit-check-marks-adding-reminders-lines-form/L2um380bH_US_en_US)),
  but users report it keeps no record of the prior value
  ([Intuit idea exchange](https://accountants.intuit.com/community/lacerte-tax-idea-exchange/changed-tick-mark-report/idi-p/229661), forum, unverified as product spec).
  CCH Axcess reportedly lists "reversed tickmarks" (vendor article, 403 on fetch, **unverified**). Partner sees
  every adjustment over 1,000 queued for them.
- **Client:** sees the change in plain words at approval time ("your crypto gain dropped by 3,050 because you sent the
  purchase record"), never the staff debate. Must re-sign when Pub 1345 says so (below).
- **Firm administrator:** sets the thresholds (partner limit, variance %, re-sign limits); can see but never delete
  history.
- **Next year's preparer:** sees which adjustments were one-off and which recur (the HVAC asset depreciates for 27.5
  years; the 2024 home-office area was corrected, GT-C10).
- **IRS examiner years later:** the filed version frozen, every adjustment with who, when, why and the evidence; the
  2028 Letter 566 (D72) attaches to that frozen version. Circular 230 §10.21 requires promptly telling the client of
  an error found in a filed return ([eCFR 31 CFR 10.21](https://www.ecfr.gov/current/title-31/subtitle-A/part-10/subpart-B/section-10.21)).

## 5. Edge cases

**Obvious (the packet has each one):**
1. **A corrected source replaces the original** (D31 over D30). Lines move; adjustments made on D30 values must be
   re-checked, not silently carried.
2. **Late evidence after the last version** (msg-07, msg-08, D71). The change lands on the workpaper, not on v3.
3. **A warning resolved by a new document** (K-1 diagnostics gone in v3). Show "resolved by D37", not absence.
4. **A what-if that should become real** (HVAC → GT-C05; §179 → GT-C06). Promoting it must create an adjustment
   with its own who/why, not flip a switch. If a hand adjustment for the same fix already exists, promotion must
   retire or link it, or the effect is counted twice.
5. **A what-if with no effect** (annualized penalty: 0 lines). Say "no change", so nobody thinks it failed.
6. **Bulk confirm hiding a mistake.** The mileage log has ~330 trip values at 0.90–0.95 confidence (Evidence §2); a
   bulk "verify all" would bless the page scanned twice (GT-C02). Bulk acts must list what they touched and be undone
   as one unit. Bulk also dodges the 1,000 rule: fifty adjustments of 900 each route to nobody unless the rule is
   applied to the change set as well as each item.

**Not obvious:**
1. **Identity across versions.** Lot M14 changed key when its holding period changed. **Proposal:** anchor history to
   a stable item id (document + lot), with the line key as a property that can change.
2. **A decision taken on a version with a known gap.** The extension payment was sized from v2 on 14 Apr. Two things
   in hand were ignored: the IRS transcript (D69, in file since 12 Mar) shows 12,000 of estimates, not v2's 13,000
   (GT-A04), so v2's true balance was 36,728, above the 36,000 paid; and the Ridgeline K-1 was known to be pending
   (msg-01; v2 warning `K1_EXPECTED_NOT_RECEIVED`), with 7,900 of income on the 2024 return (v3: 8,400). D73 and D26,
   also in hand, turned out to change no number. A process observation, not a confident packet mistake. Every
   decision record should name the version it relied on and the open items it knowingly left out.
3. **Changes after the client signed.** Pub 1345 (Rev. 12-2025) requires a new signature if total income or AGI moves
   by more than **$50**, or total tax, withholding, refund or amount owed by more than **$14**; a rejected return can
   be corrected and resent without new signatures inside those limits
   ([IRS Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf), text extracted and checked). Packet case: the 13 Jul
   rejection (Theo's SSN, GT-A05) can be fixed with no new 8879, because no amount changes. Fixing msg-07's crypto
   basis (−1,312 federal) in the same resubmission would cross $14 and require a new Declaration of Taxpayer. The
   $50 / $14 limits are the IRS's; I found no FTB source for the same limits on California's 8879, so the app should
   not assume them for California (**unverified**).
4. **Undo after a sign-off.** Undo is itself an event; it must reopen any sign-off that relied on the undone value,
   and it may not be possible at all past the filing freeze.
5. **Two people editing the same number.** Priya (st-01) and Marcus (st-04, from 24 Mar) are both preparers. With
   polling, the second save must see the first and choose, not overwrite. Marcus lacks SSN clearance, so he cannot
   make the GT-A05 fix at all.
6. **A scripted consequence that depends on our changes.** The transcript script says interest and a failure-to-pay
   penalty were assessed on the balance paid 20 Jul. The ledger's federal fixes net to about **−9,113** (sum of
   ledger effects, each alone; `c8.py`), which would turn v3's 4,220 due into a refund. Replay of post-filing events
   must recompute from the workpaper's final version, as the README says. If the ledger is right, there is no balance
   for the 610 payment or the 276 penalty to attach to. Even at v3's numbers, 77,742 of 81,962 (94.9%; 93.6% after
   GT-A04) was paid by 15 Apr. Under an extension, reasonable cause for the failure-to-pay penalty is presumed when the
   tax shown exceeds the tax paid by the regular due date by "no greater than 10 percent" and the balance "is remitted
   with the return" ([26 CFR 301.6651-1(c)(3)](https://www.law.cornell.edu/cfr/text/26/301.6651-1)). This covers the
   penalty (code 276) only, never interest (code 196). The 20 Jul payment came six days after acceptance, but the
   transcript lists it as code 610 "Payment with return". At stake: about 84 of penalty (4,220 × 0.5% × 4 months);
   the about 78 of interest stands either way. A hypothesis until a final return exists; low severity.
7. **Changes after filing.** Before the extended due date (15 Oct 2026) a second return is a *superseding* return;
   after, an *amended* one, and the original still starts the limitation periods
   ([NTA blog, Mar 2021](https://www.taxpayeradvocate.irs.gov/news/nta-blog/nta-blog-did-you-file-a-superseding-return-if-so-read-on/2021/03/)).
   California expects federal changes that raise tax to be reported within 6 months of the final federal
   determination ([FTB](https://www.ftb.ca.gov/file/after-you-file/amend-a-return/irs-changed-your-federal-tax-return.html),
   seen in search summary only, 403 on fetch, **unverified**). Either way the filed version stays frozen; the change is
   a new version linked to it.
8. **Combining what-ifs.** Overlapping what-ifs (42 shared lines for no-bonus and HVAC) cannot be summed. Show the
   combination as "estimate, rates × change" or refuse it.
9. **A what-if leaking into the real return.** Must be visually and structurally separate (scenario vs workpaper);
   Drake's planner compares scenarios against the original return rather than editing it (search result only,
   **unverified**).

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Adjustment** = event: target item (stable id), old, new, reason, evidence links, author, time, base version,
  and **tax effect {federal, CA, method, rate category, rates version}**. Routes to partner when |effect| > the firm
  threshold, judged per adjustment **and** per change set; re-pricing at a new version re-runs the routing.
- **Effective value** of a line = engine value of the latest version, then adjustments replayed; each adjustment
  re-checked (stale) when its base value changes in a new version.
- **Adjustments do not ripple**: the engine cannot be rerun, so totals downstream of an adjusted input (AGI, tax,
  balance) stay at the engine's value. Each total must say so: "N adjustments not reflected", plus a rate-estimated
  delta with its method. Calculation needs this as an input.
- **Version diff** = value changes **plus** source swaps (e.g. `Sch1.16` qa-26 → D26) **plus** documents newly used to
  no effect (D43, D73; D69 in v2).
- **Change set** groups events by cause (a document, a message, a bulk action, a promoted what-if); bulk undo and
  "since I last looked" both work on change sets. Undo = a compensating event, never deletion.
- **Seen-marker** per person: the last event they viewed or signed; the diff is computed from it.
- **Scenario** = a named, separate overlay on a base version; promoting it copies its changes into a real change set.
- **Sign-off** points at the exact values it covered; any later event on those values flips it to stale.
- **Signature snapshot** keeps the six Pub 1345 amounts; a later change crossing $50 / $14 requires a new Declaration of Taxpayer (federal; California limits unsourced).

## 7. Questions for Aarvin (only what this section needs)

1. When an engine what-if and the rate shortcut disagree (§179: CA −1,050 vs −620/−684), should the app **prefer the
   engine figure** and label the other as estimate, accepting that this changes partner routing?
2. Is **grouping by cause** (change sets) worth building in round 1, or is a flat line diff enough for the first
   deploy?

## 8. Handed to other sections

- Engine arithmetic, rate application and recomputation limits → **Calculation**.
- Whether the HVAC is an improvement, §179 vs bonus, the reliability of msg-07's bank line → **Judgment**.
- Who may edit what, clearance for SSN fixes, the "no self-review" rule → **People**.
- 8879 signing, reject/resubmit, superseding vs amended, Letter 566 → **Filing and after**.
- Thresholds and their administration → **Firm**.
- Retention and what an examiner gets in the archive → **Records a CPA expects**.
- Evidence anchors for adjustments (document, page, field) → **Evidence** (already proposed there).

## Sources

- IRS Publication 1345 (Rev. 12-2025), re-signature thresholds, reject correction, tamper-proof records — https://www.irs.gov/pub/irs-pdf/p1345.pdf (fetched; text extracted)
- 26 CFR 301.6651-1(c)(3), 90% rule for failure-to-pay under an extension — https://www.law.cornell.edu/cfr/text/26/301.6651-1 (fetched)
- 31 CFR 10.21 (Circular 230), advising the client of an error — https://www.ecfr.gov/current/title-31/subtitle-A/part-10/subpart-B/section-10.21 (fetched via eCFR API)
- National Taxpayer Advocate, superseding vs amended return — https://www.taxpayeradvocate.irs.gov/news/nta-blog/nta-blog-did-you-file-a-superseding-return-if-so-read-on/2021/03/ (fetched)
- FTB, IRS changed your federal return — https://www.ftb.ca.gov/file/after-you-file/amend-a-return/irs-changed-your-federal-tax-return.html (**unverified**: 403)
- Intuit Lacerte, audit check marks turn red on change — https://accountants.intuit.com/support/en-us/help-article/tax-return/audit-check-marks-adding-reminders-lines-form/L2um380bH_US_en_US (fetched)
- Intuit idea exchange, changed tick mark report request — https://accountants.intuit.com/community/lacerte-tax-idea-exchange/changed-tick-mark-report/idi-p/229661 (search result; forum, **unverified**)
- Wolters Kluwer, CCH Axcess onscreen review (reversed tickmarks, override and estimate reports) — https://www.wolterskluwer.com/en/expert-insights/onscreen-review-is-the-next-critical-stage-for-tax-workflow-improvement (**unverified**: 403)
- Drake Software, comparing scenarios — https://www.drakesoftware.com/sharedassets/help/2022/Comparing-Scenarios.html (**unverified**: 404)

## 9. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/03-change-review.md`. Each finding was re-probed (`c9.py`–`c11.py`) before changing text.

| Finding | Verified? | What I did |
|---|---|---|
| F1 HVAC example flips nothing; README rate for the Sacramento rental is `ca_source_income` (+694) | Yes: federal 3,364 / 3,633 both > 1,000; README names the Sacramento rental; 10,850 × 0.064 = 694 | Replaced the headline with GT-C06 §179 (federal 0; CA −620 / −684 by rates vs −1,050 engine: routing genuinely flips). Kept HVAC as a secondary spread (694 / 896 / 1,074) with no routing claim; noted the 0.335 implied federal rate and no passive-rental category |
| F2 root count includes `ref:` / `household:` lines | Yes: `F1040.16`, `F540NR.31` cite `ref:param`, `F540NR.39` cites `household:` | Redefined root and recounted: v1→v2 3 lots (4 line events); v2→v3 6 document-rooted + 1 timeline-rooted. **Partly disagree:** the review says 8 document-rooted in v3; my probe finds 6 (`SchB.1.8`, `SchD.12`, `SchE.28B`, `Sch3.1` from D37; `SchCA540NR.17.E` from D38; `F7203.1` from D40). `SchCA540NR.2.E` changes with an unchanged D31 source, so I count it as ripple. I could not see the review's probe, so the gap stays open |
| F3 extension reasoning wrong (D73/D26 changed nothing) | Yes: D73 cited by 0 lines; `Sch1.16` = 15,214 in all versions; transcript 12,000 vs `F1040.26` 13,000; 2024 Ridgeline 7,900 | Reframed §5 not-obvious 2 around D69 and the pending K-1, as a process observation; table row updated |
| F4 penalty point needs caveats | Yes | Quoted the individual (c)(3) 10% wording; penalty only, not interest; payment timing vs code 610; stakes ≈ 84 + 78; hypothesis, low severity; led with "no balance if the ledger is right" |
| F5 adjustments do not ripple | Agree | New §6 bullet; flagged as an input to Calculation |
| F6 bulk vs the 1,000 rule; re-pricing must re-route | Agree | Added to §5 obvious 6, §3 and the §6 Adjustment bullet |
| F7 zero-effect documents are changes | Yes, and stronger: D26 swapped `Sch1.16`'s source with no value change, invisible to `changes_from_previous` | New table row, §3 text and §6 "Version diff" bullet |
| N1 FTB 8879 limits unsourced | Agree; not found | Marked as IRS-only, CA unverified |
| N2 "void" | Agree | Now "requires a new Declaration of Taxpayer" |
| N3 corporate 90% wording | Agree | Quoted the individual 10% text |
| N4 promotion double-counts | Agree | Added to §5 obvious 4 |
| N5 msg-08 does not clear the warning | Yes: ev-1049 confidence stays 0.41 | Reworded the table row |
| Table: v2 also added D69 | Yes | Added |
