# Review 6: round H2 (Areas screen, header search, three small fixes)

Reviewer: Fable 5.1 (authors: Opus). Read-only; probes and outputs in `<scratch>/hybrid/review/r6_probe*`. Packet queried only with `python3 -I`, SSN last-4 only. Run 16 Oct 2026, 17:56-18:10 EDT.

## 1. Verdict

**Reconciles with fixes** (all should-fix: no wrong fact, no leak, no broken interaction found).

## 2. Must-fix

None found: about 230 packet values checked, 0 mismatches; no sensitive digit in any role's search index or Areas output; no internal text rendered to client or examiner (harness-shell's scan also 0); every Areas handler changes state; `go('areas')` refused for ngozi and irs.

## 3. Should-fix

1. **Search refuses an EIN typed without its hyphen.** `Main.dc.html:284` exempts only `^\d{2}-\d{7}$` from the 9-digit refusal. Probe: `q="743829156" head="Search"` (refused); `q="74-3829156"` matches. Fix: compare a 9-digit run with the index's EINs, hyphens stripped, before refusing it.
2. **Standalone `asOf` defaults differ.** `Checks.dc.html:160` and `Review.dc.html:142` default sam to `'2027-01-04'` (date only); `ClaimDrawer.dc.html:520` date only; the shell and every other file use `'2027-01-15T15:00'`. Harmless through the shell (integration harness passes), but standalone artboards put Sam on another day; review-5's regression was this class. Fix: one literal everywhere.
3. **Example tags on ledger estimates are inconsistent.** New findings say "(ledger estimate at v3 rates, Example)" (`Areas.dc.html:207`, all 11 drawer claims); the same kind of number on old claims is bare: `Areas.dc.html:227` "Federal −15,536 · California −2,765", `:246` "Federal −4,402 · California −384", likewise Checks:175-178, Review, Changes. Neither is in the packet (GT-A01, GT-C01). Fix: tag every rate-based estimate; leave 1:1 effects and engine what-ifs untagged.
4. **Drawer noncash wording is split.** `ClaimDrawer.dc.html:360` `effect` plus `effectNote` under the "Tax effect" label: same meaning, "About" capitalised, no `effectEx`. Checks, Areas, Changes, Review carry the exact sentence. Nit.
5. **Areas re-types the checks.** `Areas.dc.html:508-548` (`K`) is a third hand-written copy of check rows. Consistent today; the build needs one check store filtered by area.
6. **Five what-ifs in the packet, two surfaced.** `equipment_no_bonus` (+10,245 / −260), `standard_deduction`, `penalty_annualized` are not on Areas. Minor gap against the brief's "what-ifs".

## 4. What reconciles well (cited)

- **Areas are the packet's own:** `firm.budget_hours` keys, order and hours match `Areas.dc.html:575-585`; Jo's note names the field.
- **Summary lines:** all 29 v3 and 25 `return_2024.lines` values match, incl. CA540.17/64/72/111 and F1040.34 393 as "(393)".
- **Records:** W-2 boxes, lots N1-N4, Form 8949 by box (295 lots, 7 `*.total` lines excluded, sums recomputed), Schedule B (8 payers = 6,450), books to tax (D14 151,300 / 61,466 / 89,834), depreciation fed/CA/AMT for all 9 assets, mileage pages, Form 4797 lines 21-25, K-1 lines, basis by year, carry-ins, prior preparer and D07 open items verbatim, D40/D42/D24 dates, Schedule CA D-input gap on 1/2/12/17, Schedule S 844 and 635, fx rates, both what-ifs (0/−1,050; 3,633/896), 11 diagnostics verbatim, the 3 Aug transcript's 36,000.
- **Drawer claims:** all 11 positions and confidences exact; quotes verbatim from D25, D36 (account number trimmed), D56, D55, D61, D62, D14, D15, D22, D23 p3, D39 p2, D07 p3, D06; qa-25/07/08, call-01 (26 Mar 2026) and msg-07 dates and text exact.
- **Corrected values after filing** all trace to the ledger and carry Example: 38,000 Section 179, 635, about 27, 19,697, 8,100, 1,871, 0, 2,172, Kids Club, 218,400. Partner table stays 4; the two Areas items over 1,000 read "not among the 8 adjustments".
- **Roles:** ngozi/irs hidden with a plain redirect; priya/marcus proposals record then disable; daniel's "Mark area reviewed" disabled while checks fail, enabled on pass-throughs, blocked on deductions by the self-review rule; helen's blocker button byte-identical; sam/next read only with Example and `next`'s carry rows; no full SSN in any role's output; EINs unmasked.
- **Search:** index staff 124, sam/next 125 (+D71), client 74, examiner 13; no digit run of 5+ except EINs. SSN-shaped, bank and routing queries: "not searchable"; every SSN last-4 and the IP PIN: "No matches". Amounts and EINs hit; D71/D72 absent before their `asOf`; no group names a screen the role cannot open; a pick sets `claimId` and clears the query.
- **Three fixes:** noncash sentence in Checks, Areas, Changes, Review; out of Helen's "Waiting for partner" (`Checks.dc.html:240`); partner count 4. "Authority to confirm: Treas. Reg. 1.263(a)-3 (Example)" in Review:161, Changes:172, Home:231, Checks:247, Drawer:276/281, Areas:269. Late panel gated by `showLate: isStaff && cardIn` (`Documents.dc.html:427`).
- **Cross-file:** `asOf` literals, 8 adjustments, 4 partner items, blocker text identical (Checks/Review compose it from the same 4 blockers).

## 5. Gaps

- 8 of 27 findings have no drawer entry (A02, B01, B03, B04, C07, C08, C10, D02), disclosed on screen; the build needs a claim and a test per ledger entry.
- Three what-ifs unsurfaced; no version compare on Areas.

## 6. Frame

Holds as one shared set of 10 screens with distinct jobs: Return map = a line and its trace; Checks = the queue by status; Areas = the CPA's records by area with prior year, findings and area sign-off. The overlap (findings and checks on both; "Partner review" mirrors Helen's Checks group) is deliberate grouping, and the reason the build needs one claim store and one check store feeding all three.

## 7. Probes run

- Six harnesses, each alone, `set -o pipefail`: exit 0 x 6; harness-A caught 5 of 5 mutations.
- `python3 -I r6_probe.py`, `r6_probe2.py` (packet facts); `node r6_probe.js` (search 24 queries x 9 roles; Areas x 9 roles; drawer x 13 claims x 5 roles); `node r6_probe3.js` (bank/routing/PIN/name queries, `go` refusal, result pick).

### Trimmed probe output
```
# harness exit codes
harness-shell.js exit=0
harness-H.js exit=0
harness-R.js exit=0
harness-F.js exit=0
harness-A.js exit=0
harness-integration.js exit=0

# firm.budget_hours and asset columns
{
"intake_and_engagement": 1.5,
"wages_and_stock_compensation": 3.0,
"investments_and_digital_assets": 4.0,
"business": 3.5,
"rentals_and_sale": 3.5,
"pass_throughs_and_basis": 2.0,
"deductions_and_credits": 2.0,
"california": 1.5,
"partner_review": 1.0
}
SAC-BLDG 364000.0 2019-07-01 SL / mid-month | fed 13236.36 | ca 13236.36 | amt 13236.36 | disposed None
SAC-APPL 4200.0 2021-05-10 Federal: 100% bonus in 2021; | fed 0.0 | ca 483.84 | amt 0.0 | disposed None
SAC-ROOF 18000.0 2022-04-18 SL / mid-month | fed 654.55 | ca 654.55 | amt 654.55 | disposed None
AUS-BLDG 248000.0 2020-04-01 SL / mid-month | fed 7139.39 | ca 7139.39 | amt 7139.39 | disposed 2025-10-15
AUS-FLOOR 6600.0 2022-09-01 SL / mid-month | fed 190.0 | ca 190.0 | amt 190.0 | disposed 2025-10-15
STU-LAPTOP 2800.0 2022-02-03 Section 179 | fed 0.0 | ca 0.0 | amt 0.0 | disposed None
STU-PRINTER 14200.0 2025-03-21 100% special depreciation | fed 14200.0 | ca 2840.0 | amt 14200.0 | disposed None
STU-CAMERA 16300.0 2025-03-21 100% special depreciation | fed 16300.0 | ca 3260.0 | amt 16300.0 | disposed None
STU-WORKST 7500.0 2025-03-21 100% special depreciation | fed 7500.0 | ca 1500.0 | amt 7500.0 | disposed None

# what_if / fx / 8949 totals
8949 non-lot ids: ['F8949.A.total', 'F8949.B.total', 'F8949.D.total', 'F8949.E.total', 'F8949.F.total', 'F8949.H.total', 'F8949.K.total'] | lot count 295
what_if equipment_section179 | fed change 0 | ca change -1050
what_if equipment_no_bonus | fed change 10245 | ca change -260
what_if hvac_improvement | fed change 3633 | ca change 896
what_if standard_deduction | fed change 12306 | ca change 0
what_if penalty_annualized | fed change 0 | ca change 0
{"SEK_per_USD": {"2024_average": 10.56, "2025_average": 9.86, "2025_year_end": 9.71}}

# search (daniel, ngozi, irs: selected queries)
-- daniel: index 124 entries; digit runs >=5 (non-EIN): []; sensitive-looking: []
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="74-3829156" head="1 match" Numbers:1[Little Sprouts tax ID misread]
   q="743829156" head="Search" 
   q="D71" head="No matches" 
   q="Letter 566" head="No matches" 
   q="Business" head="4 matches" Numbers:3[Card sales counted twice in business income; Mileage log page counted twice; Phone, internet and Spotify taken at 100% business] | Areas:1[Business]
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="74-3829156" head="1 match" Numbers:1[Little Sprouts tax ID misread]
   q="743829156" head="Search" 
   q="D71" head="No matches" 
   q="Letter 566" head="No matches" 
   q="Business" head="4 matches" Numbers:3[Card sales counted twice in business income; Mileage log page counted twice; Phone, internet and Spotify taken at 100% business] | Areas:1[Business]
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="74-3829156" head="1 match" Numbers:1[Little Sprouts tax ID misread]
   q="743829156" head="Search" 
   q="D71" head="1 match" Documents:1[Social Security card - Theo Lindqvist-Okafor (photo)]
   q="Letter 566" head="No matches" 
   q="Business" head="4 matches" Numbers:3[Card sales counted twice in business income; Mileage log page counted twice; Phone, internet and Spotify taken at 100% business] | Areas:1[Business]
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="74-3829156" head="1 match" Numbers:1[Little Sprouts tax ID misread]
   q="743829156" head="Search" 
   q="D71" head="No matches" 
   q="Letter 566" head="No matches" 
   q="Business" head="4 matches" Numbers:3[Card sales counted twice in business income; Mileage log page counted twice; Phone, internet and Spotify taken at 100% business] | Areas:1[Business]
-- ngozi: index 74 entries; digit runs >=5 (non-EIN): []; sensitive-looking: []
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Your questions:1[Card payments from Atlas Outdoor Gear]
   q="74-3829156" head="No matches" 
   q="743829156" head="Search" 
   q="D71" head="No matches" 
   q="Letter 566" head="No matches" 
   q="Business" head="No matches" 
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="74-3829156" head="1 match" Numbers:1[Little Sprouts tax ID misread]
   q="743829156" head="Search" 
   q="D71" head="1 match" Documents:1[Social Security card - Theo Lindqvist-Okafor (photo)]
   q="Letter 566" head="No matches" 
   q="Business" head="4 matches" Numbers:3[Card sales counted twice in business income; Mileage log page counted twice; Phone, internet and Spotify taken at 100% business] | Areas:1[Business]
-- irs: index 13 entries; digit runs >=5 (non-EIN): []; sensitive-looking: []
   q="900-00-3390" head="Search" 
   q="12,400" head="1 match" Items under examination:1[Schedule C gross receipts, line 1]
   q="74-3829156" head="No matches" 
   q="743829156" head="Search" 
   q="D71" head="No matches" 
   q="Letter 566" head="1 match" Documents cited:1[IRS Letter 566 - examination of 2025 return]
   q="Business" head="No matches" 
-- daniel: hidden=false areas=9 fullSSN=0 
-- ngozi: hidden=true areas=0 fullSSN=0 internal strings=0 ["wp","This page is for your tax team. Your questions and documents are on Home and Documents.","Go to Home",""]
-- irs: hidden=true areas=0 fullSSN=0 internal strings=0 ["wp","Areas are not part of the examination record. The items under examination are on Filing and after.","Open Filing and after",""]
daniel q="4483019276" -> "Search" 
daniel q="990000017" -> "Search" 
daniel q="482915" -> "No matches" 
daniel q="2287" -> "No matches" 
daniel q="XXX-XX-2287" -> "Search" 
daniel go('areas') -> screen=areas; nav=Home, Return map, Areas, Documents, Checks, Review, Changes, Filing and after, Firm
ngozi q="4483019276" -> "Search" 
ngozi q="990000017" -> "Search" 
ngozi q="482915" -> "No matches" 
ngozi q="2287" -> "No matches" 
ngozi q="XXX-XX-2287" -> "Search" 
ngozi go('areas') -> screen=home; nav=Home, Your documents, Approve and sign
irs q="4483019276" -> "Search" 
irs q="990000017" -> "Search" 
irs q="482915" -> "No matches" 
irs q="2287" -> "No matches" 
irs q="XXX-XX-2287" -> "Search" 
irs go('areas') -> screen=home; nav=Filed return and Letter 566, Documents cited

# Areas per role (sam excerpt)
-- sam: index 125 entries; digit runs >=5 (non-EIN): []; sensitive-looking: []
   asOf=2027-01-15T15:00 entries mentioning D71/D72/Letter 566: ["D71 Social Security card - Theo Lindqvist-Okafor (photo)"]
   q="900-00-3390" head="Search" 
   q="900003390" head="Search" 
   q="3390" head="No matches" 
   q="3309" head="No matches" 
   q="666-74" head="Search" 
   q="XXX-XX-3390" head="Search" 
   q="482915" head="No matches" 
   q="12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="$12,400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="12400" head="1 match" Numbers:1[Card sales counted twice in business income]
   q="74-3829156" head="1 match" Numbers:1[Little Sprouts tax ID misread]
   q="743829156" head="Search" 
   q="68-0412257" head="1 match" Numbers:1[Bright Oak named wrongly on Form 2441]
   q="36,000" head="1 match" Numbers:1[Federal extension payment of 36,000]
   q="D71" head="1 match" Documents:1[Social Security card - Theo Lindqvist-Okafor (photo)]
   q="Letter 566" head="No matches" 
   q="Areas" head="No matches" 
   q="Business" head="4 matches" Numbers:3[Card sales counted twice in business income; Mileage log page counted twice; Phone, internet and Spotify taken at 100% business] | Areas:1[Business]
   q="Engine v3" head="No matches" 
   q="adjust" head="1 match" Numbers:1[Schedule CA trace leaves out the California adjustment]
   q="Schedule S" head="1 match" Numbers:1[Oregon credit not limited]
   q="Ridgeline" head="2 matches" Documents:2[2025 Schedule K-1 (Form 1065) - Ridgeline Real Estate Fund III LP; Ridgeline Real Estate Fund III - 2025 state supplement]

# Areas hidden roles
-- ngozi: index 74 entries; digit runs >=5 (non-EIN): []; sensitive-looking: []
-- irs: index 13 entries; digit runs >=5 (non-EIN): []; sensitive-looking: []
-- ngozi: hidden=true areas=0 fullSSN=0 internal strings=0 ["wp","This page is for your tax team. Your questions and documents are on Home and Documents.","Go to Home",""]
-- irs: hidden=true areas=0 fullSSN=0 internal strings=0 ["wp","Areas are not part of the examination record. The items under examination are on Filing and after.","Open Filing and after",""]
```
