# Review — Discovery 4 (Judgment)

Reviewer: Fable 5.1, independent (CPA / tax-system design lens). Thu 15 Oct 2026 23:54 EDT (03:54 UTC Fri 16 Oct, per `date`).
Probes: `scratchpad/review/judgment/p2_swings.py`, `p3_facts.py`, `p4_docs.py`, `p5_client.py`, `p6_rest.py` (own code, `python3 -I`, packet read-only).
Verdict: measurements sound; analysis overclaims in three places (positional line keys, "new" findings the packet already states, elections limited to what the engine priced).

## 1. Re-measurement

| Claim | Result |
|---|---|
| Rule >10% and >1,000; 106/87/85/19 (11 `CA540.*`); 431 federal lines without a 2024 key | Reproduced (p2, p3) |
| 51 of 85; 4 unchanged; smallest flagged 1,280 `SchB.1.2`; largest unflagged 2,000 `SchE.32` | Reproduced (p2); `F8582.3a` ties at 2,000 |
| AGI, cap gain, itemized, total tax, wages +56,361; what_if five figures; 89 changes | Reproduced (p6) |
| 5 ledger mistakes among swings (A06, C05, C01, C02, B01) | **4 reproduced; B01 differs** (must-fix 1) |
| `SchC.30` −300 unflagged; `SchE.18A` unchanged 13,891 | Reproduced |
| Diagnostics 13/13/11; `F8867` "Not completed" v1–v3; CTC/ODC 400; AOTC 2,500 → 0 | Reproduced |
| 2210 = 164 both methods; 5805 = 0; 94.85% / 93.63% | Reproduced (77,742 and 76,742 / 81,962) |
| 8938: 123,254 and 149,567 at 9.71 | Reproduced (D36, `fx_rates`) |
| D27, qa-08/23/31, Ridgeline null, 15 gift hits, D01, D07, D38/D39, Ada's return | Reproduced (`printed_content`, `related_returns`) |

## 2. Outside rules (fetched text treated as data)

- 301.6651-1(c)(3): shortfall ≤ 10% of tax shown **and** balance "remitted with the return" — author's reading correct. <https://www.law.cornell.edu/cfr/text/26/301.6651-1>
- FBAR 15 Apr → automatic 15 Oct 2026, FinCEN: confirmed. <https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar>; FinCEN notice FIN-2025-NTC3 (Dec 2025) agrees.
- 8938 MFJ >100,000 year-end / >150,000 any time, year-end Treasury rate for both: confirmed. <https://www.irs.gov/instructions/i8938>
- 8867 $650 per failure, returns filed 2026: confirmed. <https://www.irs.gov/instructions/i8867>
- 2210 excess SS counts as withholding; 110% rule: confirmed (supports GT-D05). <https://www.irs.gov/instructions/i2210>
- 3520 $100,000; 5%/month to 25%: confirmed. <https://www.irs.gov/businesses/gifts-from-foreign-person>
- Digital assets: any sale is Yes: confirmed. <https://www.irs.gov/filing/digital-assets>
- **Closed — Ada/AOTC:** Form 8863 instructions: a student not claimed as a dependent is the only one who can claim; refundable part barred for an under-24 full-time student with earned income < half support, a parent alive, not MFJ. Ada (age 19) meets all three. <https://www.irs.gov/instructions/i8863>
- **Closed by mootness — 1099-NEC $600:** no irs.gov page states the 2025 figure (current i1099mec is the 12/2026 revision: $2,000 "for tax years beginning after 2025"); secondary sources agree $600 governs 2025. Irrelevant here: 4,800 and 2,600 exceed $2,000 either way.
- **Not closed — AU-C 520:** AICPA PDF redirects to a login download; only ISA/ASA analogues reachable. More to the point, AU-C 520 is an *audit* standard with no force over tax preparation; the firm's `variance_review` rule and SSTS are the authorities. Label it an analogy.

## 3. Findings

### Must-fix
1. **Positional line keys make the Sch B comparison wrong (p6).** 2024 `SchB.1.2` is "Meridian Brokerage (U.S. Treasury)" 560; v3 `SchB.1.2` is "Northlake Bank, N.A." 1,840. The "560 → 1,840 (GT-B01)" swing compares two payers. The real B01 signal, `SchB.1.1` 1,180 → 1,840 (+660, 56%), is **unflagged** by the firm's rule. `SchB.1.3`/`1.4` collide too; 58 of 87 shared keys have differing labels (`F1040.12` is standard deduction vs itemized). "5 mistakes among the swings" is 4, and the doc's "compare by concept" point applies to Schedules B, C and E, not only CA 540. Comparison needs a concept/payer identity, not form line numbers.
2. **(c) and (d) are not new findings.** v3 diagnostics already carry `FORM_1099_FILING` ("paid two contractors 600 or more and has not filed Forms 1099-NEC"), `FBAR_OUTSIDE_RETURN`, and `QUESTIONNAIRE_SALES_CONFLICT` ("12 digital asset dispositions"); `firm.deadlines` lists FBAR 2026-10-15 and 1099-NEC 2026-02-02 "(late)". §2 says the diagnostics flag none of the 27; §5 then presents these as discoveries. Recast as "stated by the packet; the workpaper must carry them to a closed state with dated client advice".
3. **Elections stop at what the engine priced.** Real elections on these facts absent from `what_if`: small-taxpayer building safe harbor (§1.263(a)-3(h): 2% × 364,000 = 7,280 < repairs 13,300, so *considered → fails*, which strengthens GT-C05); de minimis safe harbor (§1.263(a)-1(f)) for the 38,000 equipment items; partial-disposition election for the removed furnace (§1.168(i)-8(d)); MFJ/MFS California comparison in a part-year year. The Election record must hold entries the engine cannot price, with "considered → not available (why)".

### Should-fix
4. **tl-25 analysis rests on v3, which the packet says is not the filed return** (`readme.where_now_is`: post-v3 amounts "mean the return as your workpaper finalizes it"). The ledger's federal effects net to roughly −10,000; the corrected return is a refund and the FTP question dissolves. State the dependency; the penalty decision must recompute from final numbers.
5. **"Penalty decisions" omits preparer-side standards.** Nothing on §6694 (substantial authority / reasonable basis + Form 8275) for the repair and SEHI positions, §6662 exposure, GT-C07's 10% excise (Form 5330), or the 3520 penalty as a decision. A partner signs off positions, not only 2210.
6. **Lookback is one year short.** The account opened 09/2023 (D36): 2023 FBAR and 2023 Form 8938 are open alongside the 3520; D07 confirms only 2024.
7. **Form 8283 / 1098-C is missing from the areas list**, yet D72's Letter 566 examines noncash contributions. The "examiner years later" role need applies here as much as to 8867.
8. **The expectation-per-line proposal is over-engineered for one day and invites anchoring**: pre-filling "wages up → job change" from the questionnaire has reviewers accept a pre-written story. Cheaper and safer: keep the firm rule; add concept/payer matching, a "contradicts prior-year note" flag (the one that catches A06), lines that appear/disappear between years, and explanation closed only by a document link. That yields the four swing states without a rule library.

### Notes
9. 2025 1099-NECs were due Mon 2 Feb 2026 (31 Jan was a Saturday); the packet says so.
10. The 8938 "FX could flip the test" point is weak: only a rate below ~9.68 flips it; GT-B02's rates (10.56, 9.86) move away. Record "year-end test met; 2024 was the any-time test (D07 max 151,880)".
11. The 51/85 mixes input lines with subtotals (AGI, total tax, SchE.20/21/26); report them separately.
12. If the FTP penalty was assessed, record the abatement letter citing (c)(3) before spending first-time abatement.

## 4. Verdicts
(a) FTP presumption: mechanics correct, premise shaky (finding 4). (b) Digital-asset question: holds; no version has the line, D34 shows 12 disposals, engine already flags the conflict. (c) 1099-NEC: true, already in the packet. (d) FBAR 15 Oct 2026: true, already in the packet. (e) 8938 year-end test only: holds.
