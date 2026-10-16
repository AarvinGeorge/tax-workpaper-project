# Review — Discovery 6, Filing and after

Reviewer: independent (Fable 5.1), 16 Oct 2026 03:52–04:10 UTC (`date -u`). Probes `scratchpad/review/filing/p0–p5.py`
(`python3 -I`, packet read-only); Pub 1345 and Form 4868 PDFs text-extracted with pypdf. Document and repo untouched.

## 1. Re-measurement

| Claim | Result |
|---|---|
| "Now" = v3 (23 Jun); 12 of 29 events after it | **Reproduced** (tl-18…tl-29; p1) |
| Reject 13 Jul 17:04 R0000-504-02; CA held; D71 +1.97 h; accepted 14 Jul 16:22 (+23.3 h); CA 15 Jul; TC 150 14 Jul | **Reproduced** (p1) |
| Letter 566: 20 Jan 2028, received 26 Jan, due 19 Feb; noncash gifts (8283); Sch C vs 142,000 + 12,400 | **Reproduced**; but the notice names *no* gift amount — 20,500 is `SchA.12`; D72's printed content is a one-line pointer (p1, p4) |
| 94.85% paid (93.63% after GT-A04); v3 − v2 tax = 4,492; extension 35,728 → 36,000 | **Reproduced** (p5) |
| 16 fixes sum −10,113 → ~4,900 refund | **Reproduced; reconciled with −9,113**: 17 ledger numbers; −9,113 includes GT-A04's +1,000, −10,113 excludes it and adds it to the balance. Both give 4,220 + 1,000 − 10,113 = 4,220 − 9,113 = **−4,893**. "16 items with a federal number" is imprecise (A04 has one). Caveat in finding 2 (p5) |
| CA refund 8,256 includes the 3,500 held as 2024 credit; 8879 signed 10 Jul after msg-07/08 | **Reproduced** (p1, p2) |
| ISO AMT basis absent | **Reproduced**: `F6251.2i` = 40,000 = 1,000 × (52 − 12) from D12 (ev-0076…0079); qa-06 "still holds those shares"; `carryovers_out.federal` 11 keys incl. MTC 3,871, none for basis (p2, p3) |
| Carryovers in/out, MTC 3,722/3,700/3,871, Ridgeline 63,660, SEP 2,786; Pub 1345 rules and page indices | **Reproduced** (p2, p3; extracted Rev. 12-2025 text) |

## 2. The penalty question — definitive reading

Sources: [Reg. §301.6651-1(c)(3)](https://www.law.cornell.edu/cfr/text/26/301.6651-1): presumption of reasonable cause
"for the period of the extension" if (i) ≤10% unpaid at the regular due date and (ii) "any balance due shown on the …
return is **remitted with the return**". [IRM 20.1.2.2.3.1(5)–(6)](https://www.irs.gov/irm/part20/irm_20-001-002r):
"the remainder must be paid with the return"; "IRS computers are programmed to automatically apply this waiver".
[IRS EFW page](https://www.irs.gov/payments/pay-taxes-by-electronic-funds-withdrawal): "After the due date, the payment
date must be the same as the date the return is transmitted, or be within the previous five days of that date."

Verdict: **the author's mechanism is right; the fact it rests on is not in the packet.** Prong (i) passes (94.85%).
Prong (ii) turns on a fact: a debit *submitted with* the 14 Jul return could not carry a 20 Jul date (EFW rule), so
either (A) 20 Jul is the settlement date of an EFW effective 14 Jul — balance remitted with the return, **no FTP
penalty**, interest only — or (B) it was a separate payment on 20 Jul — prong (ii) fails, FTP runs from 16 Apr
(IRM 20.1.2.3.8.4.2): 4 months × 0.5% × 4,220 = **84.40**, plus interest 7% × 96 days ≈ **78** (p5). The packet codes
the payment **TC 610 "Payment with return"**, the IRS's label for (A), yet scripts 196/276: internally inconsistent.
The other authors are right that it "may not apply"; the doc is right about *why* it would. Both vanish if the
finalized return is a refund.

## 3. Findings

**Must-fix**
1. **§3.1 states the penalty cause as fact.** Rewrite as the two-branch test above, name the TC 610 / EFW-date
   inconsistency as a suspected packet mistake, and have the app compute interest and FTP from `post_filing_rates`
   per branch rather than echo "computed by IRS". (p1, p5; reg, IRM, EFW page.)
2. **"~4,900 refund" is a hypothesis, not a measurement.** Standalone sums ignore interactions, and this return is
   *in AMT* (`F6251.11` 3,871, TMT 63,202 > regular 59,331): SALT-type fixes (GT-D02) are AMT add-backs with near-zero
   total-tax effect while AMT persists, and every fix moves the MTC carryforward. Direction is robust (GT-A01 alone
   exceeds 4,220); the figure is not. Say "16 items excluding GT-A04" explicitly. (p3, p5.)

**Should-fix**
3. **R&TC §18622 — now verified, with a qualifier the doc lacks.** Report "within six months after the date of each
   final federal determination", but for individuals "changes or corrections need not be reported unless they
   increase the amount of tax payable" ([statute text](https://california.public.law/codes/revenue_and_taxation_code_section_18622);
   applied in [OTA, Appeal of Douglas 2025-OTA-066](https://ota.ca.gov/wp-content/uploads/sites/54/2025/01/752-Douglas.pdf)).
   GT-D03 (+149 CA) triggers it; GT-C01 does not. The state task should carry that test. FTB page still 403.
4. **SSTS — verified, close the "unverified".** Revised SSTS effective 1 Jan 2024; SSTS No. 1 §1.2 "Knowledge of
   Errors"; ¶1.2.6 inform the client and recommend correction, ¶1.2.8 no disclosure to the authority without consent
   ([The Tax Adviser, Nov 2023](https://www.thetaxadviser.com/issues/2023/nov/understanding-the-updated-tax-ethical-standards/)).
5. **California extension — verified at excerpt level.** 2025 FTB 3519 instructions: automatic, file by 15 Oct 2026,
   "If you do not owe tax, do not complete or mail form FTB 3519"; payment still due 15 Apr (ftb.ca.gov PDF via search
   excerpt; direct fetch 403).
6. **ISO AMT basis: valid finding, under-scoped.** Promote to a ledger entry with a test (project rule). Add the
   California twin: Ngozi was a CA resident until 14 Jul 2025, exercised 30 Jul; CA sources the spread by workdays
   grant (1 Mar 2022) → exercise, mostly California, yet `F540NR.61` = 0 and the engine says `CA_AMT_NOT_COMPUTED`.
   The carryforward record needs federal *and* CA AMT basis, and the CA MTC. (p2–p4.)
7. **Letter 566.** Quote it as it reads (no 20,500); the response date is 30 days from the letter date, so compute from
   that; the package must include Form 8283 and the 1098-C (2,900, §170(f)(12)) — the client's own document disproves 6,000.
8. **Replay engine under-specified.** If the finalized return already fixes both letter items, does the 2028 letter
   still fire? State the rule (items keyed to *filed* values; a QAR changes the outcome, not the trigger).
9. **Planning.** The 110% safe harbor keys off the *final* 2025 tax, which a superseding return moves; California's
   30% + 40% installments (15 Apr, 15 Jun) had passed too — the doc counts only federal dates.

**Note**
10. Extension validity needs a good-faith "proper estimate" (Reg. §1.6081-4(b); *Crocker*, 92 T.C. 899): a legal reason
    for the extension to name its source version.
11. "Would probably have avoided the penalty" is weaker than the rule: the EFW rule *required* a filing-day date.
12. Verified as cited: 1040-X IP PIN and 3-year/2-year wording; §1.6664-2(c)(3)(i)(A) "first contacted"; Pub 1345 page
    indices. Not re-fetched: §6107, §6501.

Overall: measurements sound; the causal claim (penalty) and the headline number (refund) need hedging; the ISO
finding is real and bigger than stated.
