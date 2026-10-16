# Review of Discovery 5 — People

Reviewer: independent model (Fable 5.1), 16 Oct 2026 03:54 UTC. Probes: `scratchpad/review/people/p1_structure.py`,
`p2_measure.py`, `p3_details.py` (packet, `python3 -I`), `p4_pdfgrep.py` over Pub 1345, Form 8879, Form 8878, SSTS and
FTB 8879 PDFs fetched this session. Nothing in the document or packet was edited.

## 1. Measured numbers — all reproduced

Every measured figure reproduced (p2/p3): 6 staff with the stated roles, clearances and dates; 10 messages all client→firm
(Ngozi 6, Erik 4), 0 firm-sent — zero proven non-zero (10 of 10 match the client test); 45 answers (30/15) at one timestamp;
29 timeline events, 22 with `actor: null`, st-01 ×4, st-02, st-04, st-06; 0 hand-off/review-note/sign-off events and 3 other
"sign/review" names; tl-20 both PINs with ref msg-09 (Ngozi only); extension `actor: st-02`, 36,000; reject 13 Jul 17:04 →
accept 14 Jul 16:22 (23 h 18 m), msg-10 at 18:55; F8606.2 = 7,000 from `py:/return_2024/lines/F8606.14`; 11 diagnostics;
318 F8949/SchD lines; IP PIN 482915; AGI 228,409; 4 prior-preparer items; budget 22.0; 6 deadlines. Pub 1345 Rev. 12-2025,
$50/$14 on printed p.14 and the 24-hour rule on printed p.21 reproduced from the PDF text (p4).

## 2. Outside rules (primary sources)

- **$50/$14** (Pub 1345 p.14) quoted correctly: "more than either (i) $50 to 'Total income' or 'AGI,' or (ii) $14 to 'Total
  tax,' 'Federal income tax withheld,' 'Refund' or 'Amount you owe.'" https://www.irs.gov/pub/irs-pdf/p1345.pdf
- **24 hours** (p.21): conditional on "the ERO cannot fix the reason for the rejection"; after a within-threshold correction
  "the ERO must give taxpayers copies of the new electronic return data" — the doc omits this second duty.
- **Absent spouse** (Form 8879 instructions, Rev. Jan 2021, verified verbatim). The prohibition binds the *taxpayer*; an ERO
  entering both PINs under a signed 8879 is lawful (Pub 1345 p.15: "EROs may select and enter the taxpayers' PINs").
  https://www.irs.gov/pub/irs-pdf/f8879.pdf
- **Form 8878** (Pub 1345 p.15): "only needed for Forms 4868 when taxpayers are authorizing an electronic funds withdrawal and
  want an ERO to enter their PINs". https://www.irs.gov/pub/irs-pdf/f8878.pdf
- **FTB 8879, 2025 instructions — unverified item closed** (ftb.ca.gov serves curl with a browser user agent): §B "It is not
  acceptable for one spouse/RDP to enter both PINs"; §E "Obtain each taxpayer's signature … before you transmit"; retain for
  the California statute period (4 years, not the IRS 3); **no** $50/$14 equivalent. Joint signature "is an irrevocable
  appointment of the other spouse/RDP as an agent to authorize an electronic funds withdrawal".
  https://www.ftb.ca.gov/forms/2025/2025-8879-instructions.pdf
- **SSTS 2.3.2 — closed**: "should make reasonable inquiries if the information furnished appears to be incorrect, incomplete,
  or inconsistent either on its face or on the basis of other facts known to the member" (AICPA text, p.27:
  https://bradfordtaxinstitute.com/Endnotes/AICPA_ssts_no_1_4.pdf).
- **§7216**: 26 CFR 301.7216-3 needs signed, purpose-specific consent before disclosure to third parties
  (https://www.law.cornell.edu/cfr/text/26/301.7216-3); D02 covers "use to prepare the return and to offer tax planning" only.
- CCH Axcess note authorship: could not test (403). Thomson Reuters page: not tested.

## 3. Verdicts on the suspected findings

- **(a) Spouse PIN** — data gap confirmed; legal framing overstated. tl-20 could be a lawful Practitioner-PIN entry by the ERO
  if Erik signed the 8879; nothing records that he did (msg-09 is Ngozi alone). Hypothesis, not a violation.
- **(b) Rejection notice** — gap confirmed (0 firm→client records). The 24-hour duty is conditional (ERO cannot fix); here the
  fix needed D71 from the client, so it applied. "The firm clearly contacted her" is inference from msg-10's timing.
- **(c) Extension** — confirmed and under-argued: a 36,000 debit needs the client's authorization; with EFW and ERO-entered
  PINs that is a signed Form 8878 from both spouses. No 8878, no message, no partner sign-off (rule 2, tax effect > 1,000).
- **(d) Ledger 02 line 94** — the document never makes this claim (grep "line 94|02-investments": none). The ledger line is a
  hedged hand-off under "Suspicions not confirmed", resolved in 01 line 118. v3: F8606.2 = 7,000, F8606.14 = 0, so
  `carryovers_out.federal.ira_nondeductible_basis_ngozi = 0` is correct (basis consumed by the 14,026 conversion). Not an error.

## 4. Findings

**Must-fix**
1. **§3 "all 27 fixes would land after v3 … void the signature" depends on sequencing the doc does not state.** README
   `where_now_is`: post-v3 events "mean the return as your workpaper finalizes it". If fixes land before the replayed tl-20, the
   signature binds to the fixed return and nothing voids. Say which replay order the app assumes; the threshold check is a
   rule, not a packet fact. (p3, README text.)
2. **Form 8878 absent from the Signature entity.** The extension is the one firm act with a client payment and no client
   authorization in the packet; the model lists "8879 / FTB 8879" only. (Pub 1345 p.15; transcript code 670 36,000 on 14 Apr.)

**Should-fix**
3. Edge case 1 should state the absent-spouse rule binds the taxpayer, and that the Practitioner PIN method requires both
   spouses' signatures even when they key their own PIN (Pub 1345 p.15; FTB §B/§E).
4. Signature record lacks Pub 1345's e-signature fields (pp.15–17): signature image, timestamp, IP, login, **identity-verification
   result (KBA) per signer**, and the **ERO's own signature/EFIN+PIN** (packet `ero_pin` 52961). tl-20 records no firm-side act.
5. Table row "Marcus has a PTIN but no assignment" misses tl-09 `staff_joined_engagement` actor st-04 (24 Mar): an uncleared
   person is on the file with no attributed act. The masked-view log must run from that date. (p3.)
6. Edge case 8 (third parties): outreach to Woodworks' preparer or Ridgeline is a §7216 *disclosure*; D02 does not cover it.
   The inquiry model needs "via client" vs "direct, consent on file". FTB retention (4 years) differs from IRS (3), firm rule 7.
7. Edge case 6: add the post-correction duty to give the taxpayers copies of the new return data (Pub 1345 p.21).

**Note**
8. "E-sign identity data checks out" (§2) sits beside Theo's wrong SSN; the household was client-typed (`entered_by: client
   (organizer)`), and "Identity verified" is a required step with no actor in the packet.
9. Missing People cases: representation for Letter 566 (Form 2848/8821); spouses separating or one revoking consent
   mid-engagement; a deceased taxpayer; the dependent (Ada) as a separate filer. One line each.
10. Q1: switch by **person** carrying a role; rule 1, masking and per-spouse signing are untestable by role alone.
