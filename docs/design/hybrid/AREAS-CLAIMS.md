# New claim ids from the Areas screen (author A, round H2), for author S to add to ClaimDrawer

Eleven claims, one per ledger entry the mock-up did not show before (A06/C03, A08, B02, B05/C09, C02, C04, C06, D01, D04, D05, D06). Fields use the drawer's own names (`C` object in `ClaimDrawer.dc.html`). Every figure was verified by a `python3 -I` probe on the packet; the probe that proves each one is named on the claim. Quotes in `pre`/`hl`/`post` are `printed_content` verbatim; an ellipsis marks a trim. No quote carries an SSN.

Shared rules for all eleven:
- **None is among the 8 adjustments** (FIX-ROUND-H1 item 4): the Changes list stays 8 and the partner count stays 4. Coordinator decision (16 Oct): for after-filing roles (sam, next) each reads **"Resolved before filing (Example)"** with the corrected value tagged Example where the ledger gives it, and "Carries to 2026" where relevant. These are resolutions recorded in Areas, not entries in the Changes list. Reason: README `where_now_is`, the filed return is the one this workpaper finalizes.
- `irs`: false for all (neither Letter 566 item). The examiner never reaches them.
- `c` (client wording) is given for code safety only: no client screen links to these claims.
- `checked`: [] for all (no review work in the packet). `needed` names the verification type(s) from the firm's five: Agreed to source document, Recalculated, Confirmed with client, Agreed to prior year, Agreed to third-party record.
- `signable`: false for all (each fails a check, so Daniel's Sign off shows "Resolve this item first"). `preparedBy`: none.
- Tax effects not in the packet are the ledger's estimates at v3 `tax_effect_rates`: `effEx: true`, wording "(ledger estimate at v3 rates, Example)". Engine what-if figures are packet facts: `effEx: false`.
- History: probe `a_7_more.py` shows each line identical in v1, v2 and v3.
- `pos` is `ev-id: x0, y0 X, Y to X1, Y1` from `extracted_values[].position` (synthetic, per README).

---

### `sehi`
- Ledger: GT-A06 = GT-C03. Area: Business. Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_5_print.py`, `a_6_records.py`, `a_10_effects.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Health insurance deducted though Erik could join Ngozi’s plan'
- `line`: 'Sch1.17 · Self-employed health insurance deduction'
- `value`: '$14,400'
- `why`: 'The client says both of Ngozi’s employers offered family coverage and Erik chose his own plan. The deduction is not allowed for a month he could join a spouse’s employer plan; rule R-SEHI checks only the income limit.'
- `pos`: 'ev-0484: x0, y0 0.5882, 0.1056 to 0.7079, 0.1347'
- `kind`: 'Third-party statement: Golden Poppy Health Plan premium statement'
- `conf`: '0.99 (ev-0484)'
- `doc`: 'D25 · page 1', `docTitle`: 'Health insurance premium statement 2025, Erik Lindqvist (individual plan)'
- `field`: 'Total premiums paid 2025, 14,400.00 (ev-0484)'
- `pre`: 'Premium statement 2025. Subscriber Erik Lindqvist, individual PPO plan (not marketplace). Premiums paid January-December 2025: 1,200.00 per month, '
- `hl`: 'total 14,400.00'
- `post`: '. Paid from the Lindqvist Studio account.'
- `others`:
  - 'Typed by the client: questionnaire qa-25, 20 Jan 2026: “Yes - both of Ngozi’s employers offer family coverage, but Erik kept his own individual plan because he likes his doctors.”'
  - 'Prior year: the 2024 return deducted 0 (Sch1.17); the prior preparer’s note: “No self-employed health insurance deduction: Erik was covered on Ngozi’s employer plan in 2024.”'
- `built`: 'Premiums 14,400 (D25), limited only by Schedule C profit (rule R-SEHI, inputs SchC.31, SchSE.13, Sch1.16). No eligibility test. It also feeds the QBI amount F8995.2.1.'
- `fails`: [['Fails', 'wrn', 'Client answer gates the line: qa-25 says Erik was eligible for an employer plan; the deduction is 14,400.'], ['Fails', 'wrn', 'Prior-year treatment differs: 2024 allowed 0 for the same reason.']]
- `needed`: 'None yet. Needed: confirmed with client (eligibility by month), agreed to prior year.'
- `history`: 'Engine v1, v2 and v3: 14,400. No change by the firm yet.'
- `effect`: 'Federal +4,464, California +605 (ledger estimate at v3 rates, Example); the QBI effect is not captured by the rate.', `effEx`: true
- `effectNote`: 'Over 1,000: partner sign-off applies if adjusted.', `partner`: true
- `adjust`: 'Adjust to $0'
- `c`: { title: 'Erik’s health insurance', value: '$14,400', why: 'You told us Erik could have joined Ngozi’s employer plan. That affects whether these premiums can be deducted.', docTitle: 'Erik’s premium statement', need: 'Tell us which months, if any, Erik could not join Ngozi’s plan.', act: 'Answer' }
- `f`: { word: 'Resolved before filing', value: '$0', valueEx: true, history: 'Engine v3: 14,400; resolved before filing to 0: Erik could join Ngozi’s employer plan all year (qa-25) (Example).' }
- `links`: [['Schedule C gross receipts', 'atlas']]

### `bright-oak`
- Ledger: GT-A08. Area: Deductions and credits. Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_5_print.py`, `a_10_effects.py` (no document prints "Bright Oak Preschool").
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Bright Oak named wrongly on Form 2441'
- `line`: 'F2441.1a · Care provider, Bright Oak'
- `value`: 'Bright Oak Preschool'
- `why`: 'The return names the provider “Bright Oak Preschool”, a name no document prints. The statement and the 2024 return say “Bright Oak Kids Club”. The tax ID is right.'
- `pos`: 'ev-1043: x0, y0 0.1992, 0.2954 to 0.4373, 0.314' (the tax ID; the packet has no extracted value for the name)
- `kind`: 'Third-party statement: Bright Oak Kids Club 2025 statement'
- `conf`: '0.99 for the tax ID (ev-1043) and the amount (ev-1044); the name was not extracted'
- `doc`: 'D61 · page 1', `docTitle`: 'Bright Oak Kids Club, 2025 statement (Theo)'
- `field`: 'Provider name as printed; tax ID 68-0412257 (ev-1043)'
- `pre`: ''
- `hl`: 'Bright Oak Kids Club'
- `post`: ', 3101 Freeport Blvd, Sacramento CA. Tax ID 68-0412257. Before/after-school care for Theo Lindqvist-Okafor January 2 - July 11, 2025: total paid 5,400.00.'
- `others`: ['Prior year: the 2024 return’s Form 2441 provider, “Bright Oak Kids Club, 68-0412257” (D06 page 10, ev-2994).']
- `built`: 'Provider name, tax ID 68-0412257 and amount 5,400 (rule R-DEP-CARE-PROVIDER, sources ev-1043, ev-1044). The name on the line label is not taken from the document.'
- `fails`: [['Fails', 'wrn', 'Name on the return against the document: “Bright Oak Preschool” against “Bright Oak Kids Club”.']]
- `needed`: 'None yet. Needed: agreed to source document (D61), agreed to prior year.'
- `history`: 'Engine v1, v2 and v3: “Bright Oak Preschool”, 5,400. No change by the firm yet.'
- `effect`: 'None. The tax ID is right.', `effEx`: false, `partner`: false
- `adjust`: 'Correct the name to Bright Oak Kids Club'
- `c`: { title: 'Theo’s care at Bright Oak', value: '$5,400', why: 'We are making sure the provider’s name matches its statement.', docTitle: 'Bright Oak statement', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: 'Bright Oak Kids Club', valueEx: true, history: 'Engine v3: “Bright Oak Preschool”; resolved before filing to the name printed on D61 (Example).' }
- `links`: [['Little Sprouts tax ID', 'care-ein']]

### `sek-fx`
- Ledger: GT-B02. Area: Investments and digital assets. Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_5_print.py`, `a_10_effects.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Swedish interest converted at the 2024 rate'
- `line`: 'SchB.1.6 · Interest, Sparbanken Norrland'
- `value`: '$1,747'
- `why`: 'SEK 18,450 of 2025 interest was converted at the 2024 average rate, 10.56. The packet’s 2025 average is 9.86, which gives 1,871.'
- `pos`: 'ev-0960: x0, y0 0.3038, 0.8441 to 0.4878, 0.8586'
- `kind`: 'Third-party form: foreign bank year-end statement (Sparbanken Norrland AB)'
- `conf`: '0.99 (ev-0960)'
- `doc`: 'D36 · page 1', `docTitle`: 'Sparbanken Norrland, 2025 year-end statement (SEK)'
- `field`: 'Interest credited (SEK) 18,450.00 (ev-0960)'
- `pre`: 'Arsbesked 2025. Account holder Erik Lindqvist. … '
- `hl`: 'Interest credited 12/31/2025: SEK 18,450.00'
- `post`: '. No Swedish tax withheld (non-resident). …'
  (The account number printed on this page is masked by the firm rule; the trim keeps it out.)
- `others`: ['Packet reference: fx_rates SEK per USD, 2024 average 10.56, 2025 average 9.86, 2025 year end 9.71.', 'Prior year: the 2024 return converted 2024 interest at 10.56 (“SEK 3,700 at 10.56”).']
- `built`: 'SEK 18,450 ÷ 10.56 = 1,747 (rule R-INTEREST-PAYER, sources ev-0960 and ref:fx.SEK.2024_average).'
- `fails`: [['Fails', 'wrn', 'Exchange-rate year differs from the tax year: 2025 interest at the 2024 average rate.']]
- `needed`: 'None yet. Needed: recalculated.'
- `history`: 'Engine v1, v2 and v3: 1,747. No change by the firm yet.'
- `effect`: 'Federal +43, California +9 (ledger estimate at v3 rates, Example).', `effEx`: true, `partner`: false
- `adjust`: 'Adjust to $1,871'
- `c`: { title: 'Interest on Erik’s Swedish account', value: 'SEK 18,450', why: 'We convert Swedish kronor to dollars at the 2025 average rate.', docTitle: 'Sparbanken year-end statement', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: '$1,871', valueEx: true, history: 'Engine v3: 1,747; resolved before filing to 1,871 at the 2025 average rate 9.86 (Example).' }
- `links`: [['2023 Form 3520 open item', 'form-3520']]

### `form-3520`
- Ledger: GT-B05 = GT-C09. Area: Intake and engagement (prior preparer’s carry-ins). Probes: `a_5_print.py`, `a_6_records.py`, `a_10_effects.py` (D07 has no extracted values).
- `st: 'wrn'`, `word: 'Open item'`
- `title`: '2023 Form 3520 left open by the prior preparer'
- `line`: 'Prior preparer open item 4 of 4 · py:/prior_preparer_workpaper/open_items_left_by_prior_preparer/3'
- `value`: 'Open'
- `why`: 'Erik inherited the Swedish account from his mother in 2023. The prior preparer listed a 2023 Form 3520 as discussed with no note of resolution. The other three open items are closed in this file; this one is not, and no engine version raises it.'
- `pos`: none (D07 has no extracted values; highlight by text)
- `kind`: 'Prior preparer’s record: 2024 workpaper export, Delta River Tax Services'
- `conf`: 'No read: the packet holds the open items as prior_years data, not as extracted values'
- `doc`: 'D07 · page 3', `docTitle`: '2024 workpaper file from prior preparer (export)'
- `field`: 'Open items, item 4'
- `pre`: 'Open items: Obtain 2023 Woodworks K-1 to roll basis forward. | Confirm 2024 Form 5498 for IRA basis. | Client to confirm home office square footage. | '
- `hl`: '2023 Form 3520 (foreign inheritance over 100,000) - discussed? (no note of resolution)'
- `post`: ''
- `others`:
  - 'Client’s own record: D36 page 1, “Account opened 09/2023 (inheritance from Birgitta Lindqvist).”'
  - 'Typed by the client: qa-07, “Yes - Erik’s savings account in Sweden (inherited from his mother in 2023).”'
  - 'Typed by the client: qa-08 asks only about 2025 gifts: “No”.'
- `built`: 'Not a return line. Carried in from prior_years.prior_preparer_workpaper; closed items: 2023 K-1 (D40), 2024 Form 5498 (D42), home office size (D24).'
- `fails`: [['Fails', 'wrn', 'Prior preparer’s open items: 1 of 4 has no resolution.']]
- `needed`: 'None yet. Needed: confirmed with client (his mother’s residency and the value at receipt).'
- `history`: 'Not in any engine version (v1 to v3 diagnostics have no Form 3520 item).'
- `effect`: 'None on 2025. A 2023 penalty exposure the packet does not let us size.', `effEx`: false, `partner`: false
- `adjust`: 'Record a resolution'
- `c`: { title: 'Erik’s 2023 inheritance', value: 'Swedish account', why: 'Your previous preparer noted a 2023 form for large gifts or inheritances from abroad and did not record whether it was filed.', docTitle: 'Your previous preparer’s notes', need: 'Tell us whether a 2023 Form 3520 was filed, and where Erik’s mother lived.', act: 'Answer' }
- `f`: { word: 'Resolved before filing', value: 'Raised with the client; tracked into 2026', valueEx: true, history: 'Raised with the client before filing and tracked as a 2026 item with an owner (Example). Carries to 2026.' }
- `links`: [['Swedish interest', 'sek-fx']]

### `mileage`
- Ledger: GT-C02. Area: Business. Probes: `a_4_ev.py`, `a_5_print.py`, `a_10_effects.py` (pages 2 and 3: 22 trips each, identical), `a_13_rest.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Mileage log page counted twice'
- `line`: 'SchC.44a · Business miles (feeds SchC.9 car expense 8,260)'
- `value`: '11,800 miles'
- `why`: 'Page 3 is a second scan of page 2: the same 22 trips and the same 3,700 total. The rule adds every page total, so May to August counts twice. Business miles are 8,100.'
- `pos`: 'ev-0404: x0, y0 0.5927, 0.5404 to 0.7502, 0.5575'
- `kind`: 'Client’s own record: handwritten mileage log, scanned'
- `conf`: '0.96 (ev-0404, page 3 total); 0.96 (ev-0315, page 2 total)'
- `doc`: 'D23 · page 3', `docTitle`: 'Vehicle mileage log 2025 (scanned, 4 pages)'
- `field`: 'Page total miles 3,700 (ev-0404)'
- `pre`: '(Second scan of the May-Aug sheet - same handwriting and coffee stain as page 2.) Mileage log May-Aug. Vehicle 2021 Toyota RAV4 Hybrid. … '
- `hl`: 'Page total 3,700 miles.'
- `post`: ''
- `others`: ['Client’s own record: D23 page 2, the same 22 trips, page total 3,700 (ev-0315).', 'Client’s own record: D23 page 4 odometer 41,220 on 1 Jan and 58,960 on 31 Dec 2025 (ev-0478, ev-0479): 17,740 miles in the year.']
- `built`: 'Page totals 2,600 + 3,700 + 3,700 + 1,800 = 11,800 (rule R-MILEAGE-PAGE-TOTALS). Car expense 11,800 × 0.70 = 8,260 (SchC.9).'
- `fails`: [['Fails', 'wrn', 'Duplicate page: pages 2 and 3 carry the same trips.'], ['Fails', 'wrn', 'Business share 66% of odometer miles as filed; 46% without the second scan.']]
- `needed`: 'None yet. Needed: agreed to source document (D23), recalculated.'
- `history`: 'Engine v1, v2 and v3: 11,800 miles, car expense 8,260. No change by the firm yet.'
- `effect`: 'Federal +919, California +80 (ledger estimate at v3 rates, Example).', `effEx`: true, `partner`: false
- `adjust`: 'Adjust to 8,100 miles'
- `c`: { title: 'Erik’s mileage log', value: '8,100 business miles', why: 'Your scan has the May to August sheet twice. We count it once.', docTitle: 'Your mileage log', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: '8,100 miles', valueEx: true, history: 'Engine v3: 11,800 miles; resolved before filing to 8,100, the second scan counted once; car expense 5,670 (Example).' }

### `phone-pct`
- Ledger: GT-C04. Area: Business. Probes: `a_4_ev.py`, `a_5_print.py`, `a_6_records.py` (call-01), `a_10_effects.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Phone, internet and Spotify taken at 100% business'
- `line`: 'SchC.25 · Utilities (telephone and internet); also SchC.27a.1 software 6,850'
- `value`: '$3,480'
- `why`: 'On the 26 Mar 2026 call Erik put the business share of the family phone plan at 70% and of home internet at 50%, and said Spotify Family is personal. The return still deducts all three in full.'
- `pos`: 'ev-0101: x0, y0 0.479, 0.4127 to 0.8108, 0.4364'
- `kind`: 'Client’s own record: QuickBooks profit and loss, Lindqvist Studio'
- `conf`: '0.99 (ev-0101 telephone, ev-0095 internet)'
- `doc`: 'D14 · page 1', `docTitle`: 'Lindqvist Studio, Profit and Loss, January-December 2025'
- `field`: 'Telephone 2,160.00 (ev-0101); Internet 1,320.00 (ev-0095)'
- `pre`: '… Insurance - health (Erik) 14,400.00; '
- `hl`: 'Internet 1,320.00'
- `post`: '; Legal and professional 1,800.00; Meals 3,960.00; Office expenses 1,180.00; Software and subscriptions 6,850.00; Supplies 3,240.00; Telephone 2,160.00; Travel 4,520.00. …'
  (S may prefer to highlight “Telephone 2,160.00”; both are on the same line.)
- `others`:
  - 'Client’s own record: D15 page 2, “Telephone 2,160.00: family mobile plan (4 lines) 180.00 per month. Internet 1,320.00: home internet 110.00 per month.”'
  - 'Client’s own record: D15 page 1, software detail ending “Spotify Family 216.00” (ev-0106).'
  - 'Call note, 26 Mar 2026 (call-01, Erik Lindqvist and Priya Raman): “Mobile plan covers 4 family lines; Erik estimates his business share is 70%.” “Home internet is shared with the family; business use about 50%.” “Spotify Family in software is personal - booked by mistake.”'
- `built`: 'Books lines copied at 100% (rule R-BOOKS-LINE): telephone 2,160 + internet 1,320 = 3,480; software 6,850 including Spotify 216.'
- `fails`: [['Fails', 'wrn', 'Mixed-use expense at 100% while a client note gives a business share.'], ['Fails', 'wrn', 'Personal item in business software: Spotify Family 216.']]
- `needed`: 'None yet. Needed: confirmed with client (the call note), recalculated.'
- `history`: 'Engine v1, v2 and v3: 3,480 and 6,850. No change by the firm yet.'
- `effect`: 'Federal +541, California +47 (ledger estimate at v3 rates, Example).', `effEx`: true, `partner`: false
- `adjust`: 'Adjust to $2,172 and software to $6,634'
- `c`: { title: 'Phone, internet and Spotify', value: '$3,480', why: 'You told us part of the phone and internet is family use, and Spotify is personal. We deduct only the business part.', docTitle: 'Studio books', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: '$2,172', valueEx: true, history: 'Engine v3: 3,480 and software 6,850; resolved before filing to 2,172 and 6,634 per the call notes (Example).' }

### `sec179`
- Ledger: GT-C06. Area: Business. Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_5_print.py`, `a_8_books_k1.py`, `a_9_filed.py`, `a_10_effects.py`.
- `st: 'wrn'`, `word: 'Judgment'` (an election)
- `title`: 'Section 179 not elected for the studio equipment'
- `line`: 'F4562-C.14 · Special depreciation allowance (100%); F4562-C.12 Section 179 = 0'
- `value`: '$38,000'
- `why`: 'The engine’s default took 100% bonus depreciation. California allows no bonus, so it depreciates only 7,600. Electing Section 179 gives the same 38,000 federally and lets California expense up to 25,000.'
- `pos`: 'ev-0141: x0, y0 0.3789, 0.216 to 0.567, 0.2367'
- `kind`: 'Third-party form: vendor invoice, Vantage Imaging Supply'
- `conf`: '0.99 (ev-0141 to ev-0145)'
- `doc`: 'D22 · page 1', `docTitle`: 'Invoice, Vantage Imaging Supply (equipment)'
- `field`: 'Equipment lines: printer 14,200.00 (ev-0141), camera 16,300.00 (ev-0142), workstation 7,500.00 (ev-0143)'
- `pre`: 'Invoice 22-8841 dated 03/14/2025 to Lindqvist Studio. '
- `hl`: 'Large-format printer 14,200.00; camera system (body, 3 lenses) 16,300.00; workstation computer 7,500.00.'
- `post`: ' Total 38,000.00, paid in full 03/14/2025. Delivered and installed 03/21/2025. All items new.'
- `others`: ['Engine what-if equipment_section179: federal total tax change 0; California total tax change −1,050.', 'Call note, 26 Mar 2026 (call-01): “Bought the equipment in March for the large-format print work; it is used only for the business.”', 'California: FTB3885A 2,840 + 3,260 + 1,500 = 7,600; addition SchCA540NR.12.C 30,400 (“California does not allow federal bonus depreciation; section 179 limited to 25,000.”).']
- `built`: '100% special depreciation on 38,000 (rule R-EQUIPMENT-METHOD default). With Section 179: California 25,000 + 20% × 13,000 = 27,600 instead of 7,600.'
- `fails`: [['Fails', 'wrn', 'Election with a strictly better alternative: same federal tax, California −1,050.']]
- `needed`: 'None yet. Needed: a recorded decision (election) and recalculated.'
- `history`: 'Engine v1, v2 and v3: 38,000 special depreciation, Section 179 0. No change by the firm yet.'
- `effect`: 'Federal 0, California −1,050 (the engine’s own what-if, equipment_section179).', `effEx`: false
- `effectNote`: 'Over 1,000 (California): partner sign-off applies if elected.', `partner`: true
- `adjust`: 'Elect Section 179'
- `c`: { title: 'Studio equipment bought in March', value: '$38,000', why: 'There are two ways to write off the equipment. One saves California tax at no federal cost.', docTitle: 'Vantage Imaging invoice', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: 'Section 179, $38,000', valueEx: true, history: 'Engine v3: 38,000 special depreciation; resolved before filing by electing Section 179: federal unchanged, California −1,050 (Example).' }

### `payoff-int`
- Ledger: GT-D01. Area: Deductions and credits. Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_5_print.py`, `a_10_effects.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Payoff interest counted twice'
- `line`: 'SchA.8a · Home mortgage interest and points on Form 1098'
- `value`: '$21,847'
- `why`: 'The Lonestar Form 1098 box 1 already includes the interest paid at payoff, and the payoff statement says so. The rule added the payoff interest 2,150 a second time.'
- `pos`: 'ev-1032: x0, y0 0.5995, 0.3437 to 0.8447, 0.3686'
- `kind`: 'Third-party statement: lender payoff statement, Lonestar Mortgage LLC'
- `conf`: '0.99 (ev-1032)'
- `doc`: 'D56 · page 1', `docTitle`: 'Lonestar Mortgage payoff statement (11/20/2025)'
- `field`: 'Interest to payoff 2,150.00 (ev-1032)'
- `pre`: 'Payoff as of 11/20/2025: principal 546,311.08; '
- `hl`: 'interest 11/01/2025-11/20/2025 2,150.00'
- `post`: '; recording fee 45.00; total 548,506.08. (Interest is reported on the 2025 Form 1098.)'
- `others`: ['Third-party form: Form 1098, Lonestar Mortgage (D55): “Box 1 mortgage interest received 13,900.00 (includes prepaid interest at closing and interest paid at payoff 11/20/2025).” (ev-1029)', 'Third-party form: Form 1098, Pecan Federal Savings (D57) box 1 997.00 (ev-1034).']
- `built`: 'Lonestar 1098 13,900 + Pecan 1098 997 + payoff statement interest 2,150 + purchase points 4,800 = 21,847 (rule R-MORTGAGE-INTEREST, “every Form 1098 and lender statement”).'
- `fails`: [['Fails', 'wrn', 'Same money on two documents: the payoff interest is inside the Form 1098 box 1.']]
- `needed`: 'None yet. Needed: agreed to source document (D55, D56).'
- `history`: 'Engine v1, v2 and v3: 21,847. No change by the firm yet.'
- `effect`: 'Federal +559, California +103 (ledger estimate at v3 rates, Example).', `effEx`: true, `partner`: false
- `adjust`: 'Adjust to $19,697'
- `c`: { title: 'Mortgage interest on your Austin home', value: '$19,697', why: 'Your lender’s Form 1098 already includes the interest you paid at payoff, so we count it once.', docTitle: 'Lonestar payoff statement', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: '$19,697', valueEx: true, history: 'Engine v3: 21,847; resolved before filing to 19,697, the payoff interest counted once (Example).' }

### `or-credit`
- Ledger: GT-D04 (as corrected 16 Oct: allowed but limited). Area: California. Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_5_print.py`, `a_10_effects.py`.
- `st: 'wrn'`, `word: 'Judgment'`
- `title`: 'Oregon credit not limited'
- `line`: 'ScheduleS.credit · Credit for tax paid to Oregon (feeds F540NR.64)'
- `value`: '$844'
- `why`: 'The credit is the Oregon composite tax 1,580 × 195/365. Schedule S limits it to California’s own tax on the same income, about 635. That the credit is allowed at all for a composite return comes from the FTB instructions, not the packet.'
- `pos`: 'ev-0982: x0, y0 0.3857, 0.3299 to 0.5697, 0.35'
- `kind`: 'Third-party form: Schedule K-1 (Form 1120-S), Lindqvist Family Woodworks, Inc.'
- `conf`: '0.99 (ev-0982)'
- `doc`: 'D39 · page 2', `docTitle`: '2025 Schedule K-1 (Form 1120-S), Lindqvist Family Woodworks, Inc.'
- `field`: 'Oregon composite tax paid for shareholder 1,580 (ev-0982)'
- `pre`: '… Statement: Oregon composite return filed for nonresident shareholders; '
- `hl`: 'Oregon tax paid on your behalf 1,580'
- `post`: ' (paid with the composite return in April 2026; included in box 16D distributions). Shareholder does not work in the business.'
- `others`: ['Third-party form: same page, box 17V “qualified business income 18,400”.', 'Return lines: California AGI 305,349 (F540NR.32); California regular tax 19,718 (F540NR.40).']
- `built`: '1,580 × 195/365 = 844 (rule R-CA-OSTC). Limit: 18,400 × 195/365 = 9,830 of Oregon income; 9,830 ÷ 305,349 × 19,718 ≈ 635.'
- `fails`: [['Fails', 'wrn', 'Credit limit not applied: the credit equals the tax paid times a day ratio.']]
- `needed`: 'None yet. Needed: recalculated; authority to confirm: FTB Schedule S instructions (Example).'
- `history`: 'Engine v1, v2 and v3: 844. No change by the firm yet.'
- `effect`: 'California +209 if limited to about 635 (ledger arithmetic from the packet). Allowed for a composite return per the FTB Schedule S instructions: authority to confirm (Example).', `effEx`: true, `partner`: false
- `adjust`: 'Adjust to $635'
- `c`: { title: 'Credit for Oregon tax', value: '$1,580 paid', why: 'Woodworks paid Oregon tax for Erik. California gives a credit for part of it.', docTitle: 'Woodworks K-1', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: '$635', valueEx: true, history: 'Engine v3: 844; resolved before filing to the Schedule S limit, about 635 (Example).' }

### `excess-ss`
- Ledger: GT-D05. Area: Deductions and credits (payments and penalty). Probes: `a_3_v3lines.py`, `a_4_ev.py`, `a_7_more.py`, `a_10_effects.py` (regular-method recompute: 164 with withholding 25,400; 17 with 28,742; 27 with the Q4 3,000), `a_15_quotes.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Penalty ignores excess social security'
- `line`: 'F1040.38 · Estimated tax penalty (F2210.19 regular method)'
- `value`: '$164'
- `why`: 'Form 2210 counts excess social security withheld as income tax withheld. The engine used W-2 box 2 only (25,400). Ngozi’s two employers withheld 3,342 too much social security.'
- `pos`: 'ev-0038: x0, y0 0.1787, 0.6163 to 0.479, 0.6345'
- `kind`: 'Third-party form: Form W-2, Halvorsen Data LLC'
- `conf`: '0.99 (ev-0019, ev-0038)'
- `doc`: 'D09 · page 1', `docTitle`: '2025 Form W-2, Halvorsen Data LLC (Ngozi Okafor)'
- `field`: 'Box 4 social security tax withheld 7,316.00 (ev-0038)'
- `pre`: '… Box 1 107,800.00; Box 2 9,600.00; Box 3 118,000.00; '
- `hl`: 'Box 4 7,316.00'
- `post`: '; Box 5 118,000.00; …'
  (The page prints an SSN before this point; the trim keeps it out.)
- `others`: ['Third-party form: Form W-2, Corvane Systems (D08) box 4 6,944.00 (ev-0019).', 'Return line: Sch3.11 excess social security 3,342 (14,260 − 176,100 × 6.2%).']
- `built`: 'Required payment 41,313 (F2210.8) in four installments; withholding 25,400 spread evenly; estimated payments by date; 7% to 15 Apr 2026 = 164. With withholding 28,742 (25,400 + 3,342) the same method gives about 17.'
- `fails`: [['Fails', 'wrn', 'Penalty inputs: excess social security not counted as withholding.']]
- `needed`: 'None yet. Needed: recalculated.'
- `history`: 'Engine v1, v2 and v3: 164. No change by the firm yet.'
- `effect`: 'Federal penalty about −147 (164 to about 17; ledger recompute, Example).', `effEx`: true, `partner`: false
- `adjust`: 'Adjust to about $17'
- `c`: { title: 'Underpayment penalty', value: '$164', why: 'Extra social security withheld by two employers counts as tax paid during the year, which lowers the penalty.', docTitle: 'Ngozi’s W-2s', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: 'About $27', valueEx: true, history: 'Engine v3: 164; resolved before filing: excess social security counted as withholding, with the corrected January payment, about 27 (Example).' }
- `links`: [['Federal estimated payments', 'fed-est']] (the Q4 correction moves the recompute to about 27)

### `ca-trace`
- Ledger: GT-D06. Area: California. Probes: `a_3_v3lines.py`, `a_7_more.py`, `a_10_effects.py` (D = A − B + C on lines 1, 2, 12, 17), `a_15_quotes.py`.
- `st: 'wrn'`, `word: 'Check failed'`
- `title`: 'Schedule CA trace leaves out the California adjustment'
- `line`: 'SchCA540NR.1.D · Wages, total using California law (also lines 2, 12, 17 column D)'
- `value`: '$218,400'
- `why`: 'The value is right: 212,400 + 6,000 HSA add-back. But the line lists only column A as its input, so following the trace shows a sum of one number that does not equal the line.'
- `pos`: none (an engine line, not a document field)
- `kind`: 'Engine computation: rule R-SUM'
- `conf`: 'No read: computed by the engine'
- `doc`: 'Return line · v3', `docTitle`: 'Schedule CA (540NR), line 1 column D'
- `field`: 'inputs: ["SchCA540NR.1.A"]'
- `pre`: 'Wages - total using CA law = 218,400. Inputs listed: '
- `hl`: 'SchCA540NR.1.A (212,400)'
- `post`: '. Not listed: SchCA540NR.1.C (6,000, “California does not exclude employer HSA contributions.”).'
  (This is the engine’s line record, not printed_content; S may prefer to render it as a trace view rather than a page.)
- `others`: ['Same gap on line 2 (6,450 − 410 = 6,040; B missing), line 12 (81,854 + 30,400 = 112,254; C missing), line 17 (−11,830 − 484 = −12,314; B missing).', 'Third-party forms: W-2 box 12 code W 2,500 (D08, ev-0024) and 3,500 (D09, ev-0043) are the 1.C sources.']
- `built`: 'Column D = A − B + C on every line; the inputs list names only A.'
- `fails`: [['Fails', 'wrn', 'Trace: the listed inputs do not produce the value (lines 1, 2, 12, 17).']]
- `needed`: 'None yet. Needed: recalculated.'
- `history`: 'Engine v1, v2 and v3: the same four lines, the same gap.'
- `effect`: 'None: the values are right, the trace is incomplete.', `effEx`: false, `partner`: false
- `adjust`: 'Flag the trace for the engine team'
- `c`: { title: 'California wages', value: '$218,400', why: 'An internal check on how the California figures are traced.', docTitle: 'Your California return', need: 'Nothing needed from you.', act: 'Ask your tax team' }
- `f`: { word: 'Resolved before filing', value: '$218,400, trace completed', valueEx: true, history: 'Engine v3: 218,400 with an incomplete trace; resolved before filing by listing columns B and C as inputs (Example).' }

---

## Not given a claim in this round (shown on Areas as text rows, number not clickable)

GT-A02 (California wages split), GT-B01 (Northlake interest twice; Checks has an `int` row without a claim), GT-B03 (crypto lot C6), GT-B04 (Meridian M18), GT-C07 (SEP excess), GT-C08 (home office two homes), GT-C10 (2024 home office 300 sq ft), GT-D02 (seller's property tax). H2 named the eleven above as the priority; these eight already appear elsewhere as a Checks row, a Documents hint or an engine note. Each Areas row says where it shows today and "No drawer entry in this mock-up". After filing they too read "Resolved before filing (Example)" (no number shown).
