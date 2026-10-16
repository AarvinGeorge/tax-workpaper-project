# Discovery 5 — People

Written 16 Oct 2026, ~03:50 UTC. Part 5 of 8 in the section-by-section discovery of the brief's "What it must do".
Every number below was measured from the packet (read-only) with scripts in the session scratchpad
(`disc/people/measure.py`, plus `p3.py`–`p9.py` for the text quoted, run as `python3 -I`). Outside rules are cited inline
to the page they were read from; anything not opened is marked **unverified**. Nothing here is a decision yet;
proposals are marked as such.

## 1. What the brief asks

> People: questions to the client or colleagues that become evidence. Review notes that can block filing. Sign-offs
> that reopen when what was signed changes. Enforced roles. Several people at once. Assignments, deadlines,
> notifications. Client approval and e-file signature.

Seven jobs: **question → evidence**, **blocking review notes**, **sign-offs that go stale**, **enforced roles**,
**concurrency**, **assignments / deadlines / notifications**, **client approval and e-signature**.

Already decided (Aarvin): no real logins, a role switcher, permissions enforced on the server, an append-only event log,
several people at once via polling.

## 2. What the packet actually holds (measured)

| Fact | Measured | Why it matters |
|---|---|---|
| Staff | 6: Priya Raman (st-01, preparer, no credential, from 2025-08-01), Daniel Ortiz (st-02, reviewer, CPA), Helen Strand (st-03, partner, CPA), Marcus Bell (st-04, preparer, **no sensitive-data clearance**, joined 2026-03-24), Jo Kimura (st-05, firm administrator), Sam Adeyemi (st-06, quality reviewer, CPA, **active from 2027-01-04**) | Six roles, not three. One person is masked; one exists only after filing |
| Client users | 2: Ngozi Okafor (taxpayer), Erik Lindqvist (spouse) — both role `client` | A joint return has **two** clients with separate voices and signatures |
| Assignment at start | preparer st-01, reviewer st-02, partner st-03; PTINs for st-01–04; paid-preparer signer st-03; firm ERO PIN present | The signer is not the preparer. Marcus is not in the starting assignment, yet tl-09 (24 Mar, `staff_joined_engagement`, actor st-04) puts him on the file; no act of his is recorded after that |
| Starter standards | 3 review levels; 7 rules (incl. "may not review own work", "tax effect over 1,000 needs partner sign-off", "open review notes block filing", masking + view log); 12 required steps | The packet already states the enforcement rules; the app must make them true |
| Deadlines | 6: due 15 Apr, extended 15 Oct, internal hand-off 27 Mar, review complete 8 Apr, FBAR 15 Oct and 1099-NEC 2 Feb (both "outside engagement") | Internal deadlines exist; two deadlines belong to work the firm did not take on |
| Budget | 22.0 hours across 9 areas (partner review 1.0) | Time is per area, not per person |
| Questionnaire | 45 answers: Ngozi 30, Erik 15; **all at one timestamp** (2026-01-20 04:00 UTC) | "Who answered" is recorded per question; "when" is not |
| Messages | 10, all client → "firm" (Ngozi 6, Erik 4); **0 from the firm or staff** (same test counts all 10 client ones) | The firm's side of every conversation is missing — including the rejection notice |
| Call notes | 1 (call-01, 26 Mar, Erik + Priya), 8 notes | Oral evidence, one spouse, one staff member |
| Timeline | 29 events; 7 have a staff actor (st-01 ×4, st-02, st-04, st-06), 22 have none; **0 hand-off, review-note or sign-off events** (the same test finds 3 other review/sign events) | The packet README says it holds "no reviews, notes, sign-offs or decisions" — the people layer is entirely ours to build |
| Client approval | tl-20, 10 Jul 20:05: Form 8879 + FTB 8879 signed, taxpayer PIN and spouse PIN both present, actor null; msg-09 from Ngozi alone says "Signed the e-file authorization" | Two PINs, one message. Nothing records that Erik signed, who keyed his PIN, or the firm's own (ERO) signature |
| Extension | `extension-2026-04-14`, actor st-02: Form 4868 with 36,000 (IRS transcript code 670, 14 Apr) and FTB 3519 with 0 | A 36,000 client payment with no client authorization, message or sign-off in the packet |
| E-file | 4 records: federal rejected 13 Jul 17:04 (R0000-504-02, Theo's SSN), CA "not transmitted" (state held); federal accepted 14 Jul 16:22, CA 15 Jul 02:10 | Rejection → fix → resubmit in 23 h 18 min, with no firm-to-client record |
| E-sign identity data | Ngozi has an IP PIN (matches D03 CP01A, 482915); Erik, Ada, Theo none; prior-year AGI 228,409 = 2024 F1040.11; household typed by the client (`entered_by: client (organizer)`) | The IP PIN and prior AGI agree with their sources, but the same client-typed record carried Theo's wrong SSN (GT-A05). Required step "Identity verified" has no actor or event anywhere in the packet. All of it must be masked for Marcus |
| Engine questions | v3 has 11 diagnostics; one (`QUESTIONNAIRE_SALES_CONFLICT`) is literally a question to the client (qa-14 "No sales" vs 318 Form 8949 / Schedule D lines in v3) | Checks generate questions; the answer must close the check |
| Prior preparer | 4 open items left behind (2023 K-1, 2024 Form 5498, office sq ft, 2023 Form 3520) | Questions inherited from another firm, never answered (GT-B05) |

## 3. The headline insight: the packet records the client's voice and none of the firm's

All 10 messages and 45 answers run client → firm. Not one review note, hand-off, sign-off, question sent, or rejection
notice exists. Yet the season visibly needed them: the client answered "4,000 I think" (qa-41, GT-A04), said
"no investments sold" (qa-14), gave a Blue Book guess (qa-39, GT-D03), and sent crypto cost **after** v3 (msg-07,
GT-B03). Each of the five "client said vs document says vs later news" mistakes (A04, A06, B03, C04, D03) is a
conversation that **never reached a decision**.

**Implication (proposal):** a question is not a chat message; it is an **inquiry** with a state machine:
*raised (by whom, to whom, about which line/check) → answered (by which person, when, how: written / oral / document)
→ accepted as evidence or rejected with reason → closed*. Closing it writes a source onto the line. An inquiry that
is open on a line with tax effect blocks sign-off of that line. This is the operational form of the duty to "make
reasonable inquiries if the information as furnished appears to be incorrect" (Circular 230 §10.34(d),
[law.cornell.edu](https://www.law.cornell.edu/cfr/text/31/10.34)). SSTS ¶2.3.2 says the same and adds "incomplete, or
inconsistent either on its face or on the basis of other facts known to the member"
([AICPA SSTS text, p.27](https://bradfordtaxinstitute.com/Endnotes/AICPA_ssts_no_1_4.pdf)).

The second insight: **approval is a signature on a snapshot, not a status.** The packet README says events after v3
are "scripted for replay; where they mention amounts, they mean the return as your workpaper finalizes it". So the
intended replay order is: *v3 → workpaper fixes → tl-20 approval of the fixed return → e-file*. In that order nothing
voids the 10 Jul signature. The rule matters for any change that lands **after** the replayed tl-20. Examples: a reviewer
reopens a line, a late answer like msg-07 is applied, or the SSN fix after the rejection. Pub 1345 requires a new
signature if, after signing, amounts move more than **$50** in total income or AGI, or **$14** in total tax,
withholding, refund or amount owed ([Pub 1345 Rev. 12-2025, p.14](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). For
scale, GT-A04 alone moves amount owed by 1,000. The FTB 8879 instructions state no $50/$14-style threshold (searched; none found)
and call the form "a one-time authorization" for that return ([FTB 8879 instructions 2025](https://www.ftb.ca.gov/forms/2025/2025-8879-instructions.pdf)). **Proposal:**
replay applies the workpaper's fixes before tl-20. Each signature binds to a frozen version. A post-signature change is
checked against $50/$14 by rule (not a packet fact) and voids the signature when crossed. The demo can show this with
one deliberate post-approval edit.

## 4. What each role needs from People (domain view)

- **Preparer (Priya; Marcus masked):** one queue of what is assigned to her, open inquiries, and review notes
  addressed to her; turn a client email or call note into an answered inquiry without retyping; cannot sign off her
  own work as reviewer.
- **Reviewer / partner (Daniel, Helen):** raise a note on a number (not a page); see which sign-offs went stale and
  why (which upstream value moved, by how much, tax effect); partner sees every adjustment over 1,000 waiting for
  them (starter rule 2). Partner is the signer, so they need "everything I am signing" on one screen.
- **Client (Ngozi, Erik, separately):** only their household; questions addressed to *them* by name; their uploads'
  status; the return summary to approve; their **own** PIN. Never staff notes.
- **Firm administrator (Jo):** assign and reassign; set roles and clearance; see deadlines and budget across the file;
  the masked-view and unmasked-view log.
- **Next year's preparer (Priya again, tl-28, Jan 2027):** inquiries marked "ask again next year", prior preparer's
  open items with their status, who answered what last year.
- **IRS examiner years later (Letter 566, 2028):** for the noncash gifts and the Schedule C receipts under exam, who
  asked, who answered, on what date, and who signed off — self-contained. Sam (quality review, 2027) needs the same
  record read-only.

## 5. Edge cases

**Obvious (the packet has each one):**
1. **A joint return needs both spouses' signatures, and the record must show each one.** Under the Practitioner PIN
   method the firm (ERO, the electronic return originator) may enter both PINs: "EROs may select and enter the
   taxpayers' PINs". But each taxpayer must still sign the authorization form, "even if they enter their own PINs"
   ([Pub 1345, p.15](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). The limit binds the *taxpayer*, not the firm: "It
   isn't acceptable for a taxpayer to select or enter the PIN of an absent spouse"
   ([Form 8879 instructions, Rev. Jan 2021](https://www.irs.gov/pub/irs-pdf/f8879.pdf)). California says it outright:
   "It is not acceptable for one spouse/RDP to enter both PINs". The ERO must "Obtain each taxpayer's signature
   after the tax return is prepared but before you transmit it"
   ([FTB 8879 instructions 2025](https://www.ftb.ca.gov/forms/2025/2025-8879-instructions.pdf)). Packet: tl-20 holds
   both PINs; msg-09 is Ngozi alone. That may well be a lawful ERO entry. What is missing is **any record that Erik
   signed**. This is a gap in the record, not a proven violation. The app should record each spouse's signing act
   separately.
2. **One spouse answering for the other.** Erik answered qa-03 and qa-06 about Ngozi's jobs and ISOs, and qa-30
   about her IRA; Ngozi answered qa-25 about Erik's health coverage (GT-A06). Each answer needs "answered by" and
   "about whom".
3. **Client answer contradicts a document.** qa-31 "prior basis: none" vs D06 2024 Form 8606 line 14 = 7,000 and the
   prior preparer's note. The engine correctly used 7,000 (`F8606.2`), but nothing records *why* the answer was
   overruled. qa-14 "No" sales vs the 1099-Bs is the same pattern, raised by the engine.
4. **Information arrives after the version it should change** (msg-07 crypto cost on 30 Jun, after v3 on 23 Jun,
   before approval on 10 Jul; GT-B03). An answer must reopen the line it answers.
5. **Staff without clearance** (Marcus) must see SSNs, bank numbers and the IP PIN masked; the rejection fix (Theo's
   SSN, GT-A05) is a task he cannot do.
6. **E-file rejection.** If the firm cannot fix it alone, it must "take reasonable steps to inform the taxpayer of the
   rejection within 24 hours" and give the business rule with an explanation
   ([Pub 1345, p.21](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). The duty applied here: the fix needed Theo's SSN card
   (D71) from the client. Packet: rejection at 17:04, Ngozi sends the card at 18:55. The timing *suggests* the firm
   contacted her (an inference), but no record exists. A rejected return can be corrected and resent without new
   signatures if amounts stay within $50 / $14, which is true for an SSN-only fix. Even then "the ERO must give
   taxpayers copies of the new electronic return data" (same page). So the corrected return is a client-facing
   deliverable with its own record.
7. **Internal deadlines missed by events, not people.** Hand-off 27 Mar is the day D73 arrived; "review complete
   8 Apr" precedes D26 (10 Apr), the extension (14 Apr) and v3 (23 Jun).

**Not obvious:**
1. **Reviewer = preparer, by the side door; a payment with no client authorization.** Daniel (reviewer) filed the
   extension with a 36,000 payment (`extension-2026-04-14`). Who reviewed *that*? Starter rule 1 must apply to every
   act, including extensions, not only to "the return". The payment exceeds 1,000, so rule 2 (partner sign-off) applies
   too. And the client must authorize it. When the payment is an electronic funds withdrawal and the ERO enters the
   PINs, that is a signed Form 8878: "only needed for Forms 4868 when taxpayers are authorizing an electronic funds
   withdrawal and want an ERO to enter their PINs" ([Pub 1345, p.15](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). The
   packet has no 8878, no message and no sign-off for it. (How the 36,000 was paid is not stated, so whether 8878 was
   required is unverified.)
2. **A sign-off going stale from an upstream change.** Traditional tools only flag the edited *workpaper*
   (Thomson Reuters Engagement Manager shows "a warning icon" when a signed-off workpaper is edited,
   [thomsonreuters.com](https://www.thomsonreuters.com/en-us/help/engagement-manager/workpapers/about-workpaper-sign-offs)).
   Here the stale trigger is any upstream source: D31 replacing D30, D73 arriving, msg-07. Staleness must follow the
   dependency graph, with the tax effect of the change.
3. **Note resolved by the wrong person.** A note raised by Daniel to Priya: Priya *responds*, only Daniel (or a
   higher level) *clears*. Self-clearing your own answer is the most common way a review trail lies. CCH Axcess
   reportedly records who wrote each note and who cleared it (**unverified**: vendor page returned 403).
4. **Approval of a moving target.** Client approves, then the firm fixes a ledger mistake. Below $50/$14: no
   re-sign, but the client should still get the corrected copy (Form 8879 instructions: "Provide the taxpayer with a
   corrected copy of Form 8879 if changes are made"). Above: signature void, filing blocked.
5. **Oral evidence from one spouse binding the joint return.** call-01 (Erik only) sets phone 70% / internet 50%
   (GT-C04); fine for his business, but the same channel could carry a statement about Ngozi's items.
6. **People who exist only after filing.** Sam joins 2027-01-04 and selects the return the same day; the examiner
   arrives in 2028. They read a frozen record; they may add notes but never change a sign-off.
7. **Several people on one number.** Priya edits a value while Daniel signs it off; with polling, the sign-off must
   carry the version it signed, and a sign-off on a superseded version is rejected by the server, not merged.
8. **Questions to people outside the file.** Ada files her own return (consumer software); Woodworks' preparer and
   Ridgeline's administrator hold missing answers (late K-1, 2023 K-1). Inquiries can be addressed to a third party
   via the client. The packet has no record of any such outreach. Asking directly discloses return information, and
   §7216 governs that. D02's consent covers using the information "to prepare the return and to offer tax planning".
   Some disclosures need no consent: to another preparer for non-substantive services (§301.7216-2(d)(1)), by
   accountants "in the normal course" unless the taxpayer objects (§301.7216-2(h)), and for quality or peer review
   (§301.7216-2(p), which covers Sam) ([26 CFR 301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2)).
   Others need signed consent ([26 CFR 301.7216-3](https://www.law.cornell.edu/cfr/text/26/301.7216-3)). So a
   direct inquiry should record its basis: *via client* / *exception cited* / *consent on file*.
11. **Cases the packet does not have (one line each):**
    - Representation for the 2028 Letter 566: who may speak to the IRS needs Form 2848 or 8821 on file. qa-44
      ("May we discuss your return with the IRS?" → "Yes") maps to the return's third-party designee
      box, not a power of attorney. That box's authority ends well before 2028 (**unverified**: not checked against
      the 1040 instructions this session).
    - Spouses separate mid-engagement, or one revokes consent: each spouse's access, approval and consent must be
      separable.
    - A taxpayer dies before signing: the surviving spouse or the executor signs. The signer is not always the client user.
    - A dependent who files separately (Ada): she is a person in the household but not a client user. Her "can be
      claimed" box must agree with ours, and we can only ask through her parents.
9. **Inherited questions.** The prior preparer's 4 open items (GT-B05) are inquiries with a different author, firm
   and year — they must show as open, not as background text.
10. **Notifications that matter legally vs. nice-to-have.** The rejection notice has a 24-hour clock; "you were
    mentioned" does not. The packet has no notification record of any kind (0 firm-sent messages).

## 6. What this means for the data model (proposals, to confirm at the end of discovery)

- **Actor** on every event: staff id or client user id (never "client" or null), plus the role they acted in at the
  time. Masking and permissions are checked on the server against role + clearance. The masked-view log for Marcus
  starts at tl-09 (24 Mar), the day he joined the file.
- **Inquiry** (question → evidence): target (line, value, check or document), raised by, addressed to (a person,
  not "the client"), channel, answer, answered by, about whom, received at, disposition (accepted as source /
  rejected with reason), closed by. Open inquiry with tax effect blocks sign-off.
- **Review note:** a kind of inquiry from a reviewer; states *open → responded → cleared*; only the raiser or higher
  clears; any open note blocks filing (starter rule 5).
- **Sign-off:** (who, level, object, **version hash of the inputs signed**). Recomputed status: *current / stale
  (input X changed by Δ, tax effect T) / void*. Partner level required when tax effect > 1,000.
- **Assignment** (person, area or item, due date) and **deadline** (external or internal, linked to the required
  steps); notifications are events derived from these, with the rejection notice as a timed obligation.
- **Signature**, one record per signer per form: kind (**Form 8879**, **FTB 8879**, **Form 8878** for an extension
  paid by electronic funds withdrawal), signer (each spouse separately; the ERO's own signature as a separate record),
  method (self-entered PIN / ERO-entered with authorization), and the signed version snapshot. It also stores the data
  Pub 1345 says e-signature software "must record": "digital image of the signed form", "date and time of the
  signature", IP address and login ID (remote signing), the identity-verification result (knowledge-based
  authentication, or photo ID checked in person), and the signing method or audit trail. The process must "separately
  identify and authenticate each taxpayer" ([Pub 1345, p.16](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). Status is
  live: *valid / void* (federal: change beyond $50 / $14 after signing). Retention: 3 years for Form 8879 (IRS); for
  FTB 8879, the California statute period, "the later of four years from the due date … or four years from the date
  the tax return is filed" ([FTB 8879 instructions 2025](https://www.ftb.ca.gov/forms/2025/2025-8879-instructions.pdf)).
  The firm's own 7-year rule exceeds both.

## 7. Questions for Aarvin (only what this section needs)

1. **Recommendation: the switcher lists people, each carrying a role** (Priya, Daniel, Helen, Marcus, Jo, Sam, Ngozi,
   Erik). Rule 1 ("may not review own work"), Marcus's masking and per-spouse signing cannot be tested by role alone.
   Do you agree, or do you want roles only for simplicity?
2. Should a stale sign-off **block filing** (like an open note) or only warn the signer?

## 8. Handed to other sections

- Reliability ranking of client answers vs documents → Evidence.
- Tax effect of a change that drives staleness and partner sign-off → Change.
- Recording judgment calls and due diligence (Form 8867) answers → Judgment.
- Freeze at filing, rejection/resubmission, client's copy, Letter 566 response → Filing and after.
- Masked-view log, clearance, time against budget, firm-wide search and status → Firm.
- 1099-NEC filing advice and FBAR (outside engagement, in call-01 and deadlines) → Judgment / Firm.
- Prior preparer's open items as a carry-forward record → Records a CPA expects.

## Sources

- IRS Publication 1345 (Rev. 12-2025), pp. 9, 14–16, 20–21 (printed page numbers) — TIN verification, $50/$14
  re-signature, PIN entry and Form 8878, e-signature data and per-taxpayer identity verification, rejection 24-hour
  notice, correct-without-new-signature and copies of new return data, copy to taxpayer:
  https://www.irs.gov/pub/irs-pdf/p1345.pdf
- FTB 8879 instructions 2025 (§B Practitioner PIN, ERO duties, statute-period retention):
  https://www.ftb.ca.gov/forms/2025/2025-8879-instructions.pdf ; FTB 8879 form 2025 (joint signature as agent for
  electronic funds withdrawal): https://www.ftb.ca.gov/forms/2025/2025-8879.pdf
- AICPA SSTS (effective 1 Jan 2024), ¶2.3.2, p.27 of this copy:
  https://bradfordtaxinstitute.com/Endnotes/AICPA_ssts_no_1_4.pdf
- 26 CFR 301.7216-2 (exceptions) and 301.7216-3 (consent): https://www.law.cornell.edu/cfr/text/26/301.7216-2 ,
  https://www.law.cornell.edu/cfr/text/26/301.7216-3
- IRS Form 8879 (Rev. January 2021), ERO responsibilities and "absent spouse" rule:
  https://www.irs.gov/pub/irs-pdf/f8879.pdf
- 31 CFR §10.34(d) (Circular 230), reliance and reasonable inquiries: https://www.law.cornell.edu/cfr/text/31/10.34
- 26 CFR §1.6695-1(b), signing preparer: https://www.law.cornell.edu/cfr/text/26/1.6695-1
- The Tax Adviser, "Understanding the updated tax ethical standards" (Nov 2023), SSTS ¶2.3.2 paraphrase:
  https://www.thetaxadviser.com/issues/2023/nov/understanding-the-updated-tax-ethical-standards/
- Thomson Reuters Engagement Manager, "About workpaper sign-offs":
  https://www.thomsonreuters.com/en-us/help/engagement-manager/workpapers/about-workpaper-sign-offs
- **Unverified (could not open):** Wolters Kluwer on CCH Axcess note types (403); Form 1040 instructions on the
  third-party designee's term (not fetched).
- **Not opened (secondary only):** The Tax Adviser's SSTS paraphrase is kept above. The AICPA text now backs the claim.

## 9. Changes after review (Fable 5.1)

Review: `docs/discovery/reviews/05-people-review.md`. Each finding was re-probed before it was accepted. The probes:
FTB 8879 instructions and form fetched with curl and grepped; Pub 1345 pp.15–16 re-read; SSTS PDF text grepped;
26 CFR 301.7216-2 read; packet README, tl-09, `ero_pin` and required steps re-read with the earlier scripts.

| # | Finding | Verified? | What I did |
|---|---|---|---|
| 1 (must) | Voiding the 10 Jul signature depends on replay order | Yes: README `where_now_is` | §3 rewritten. Intended order is v3 → fixes → tl-20, so nothing voids. The $50/$14 rule is presented as a rule for post-approval changes, with a demo edit |
| 2 (must) | Form 8878 missing from the Signature entity | Yes: Pub 1345 p.15 | Added to §6 Signature, and to not-obvious case 1 with a table row for the extension. Whether 8878 was actually required is marked unverified, because the payment method is not stated |
| 3 (should) | The absent-spouse rule binds the taxpayer; each spouse must still sign | Yes: Pub 1345 p.15; FTB §B and ERO duties | Obvious case 1 reframed as a missing record that Erik signed, not a violation |
| 4 (should) | Pub 1345 e-signature fields and the ERO signature | Yes: Pub 1345 p.16 (printed), plus "separately identify and authenticate each taxpayer" | Added to §6 Signature. The ERO PIN is noted as present, value not repeated |
| 5 (should) | tl-09 puts Marcus on the file | Yes: tl-09 actor st-04 | Table row corrected; masked-view log starts 24 Mar (§6 Actor) |
| 6 (should) | Third-party outreach is a §7216 disclosure | **Partly.** Consent is not always needed: §301.7216-2(d)(1), (h) and (p) are exceptions | Not-obvious case 8 records the basis (via client / exception / consent). I kept the nuance rather than "D02 does not cover it" |
| 7 (should) | Duty to give copies of new return data after a correction | Yes: Pub 1345 p.21 | Added to obvious case 6, with "firm clearly contacted her" softened to an inference |
| 8 (note) | "Identity data checks out" sits beside Theo's wrong SSN | Yes: `entered_by`, required steps | Table row reworded |
| 9 (note) | Missing People cases | n/a (outside the packet) | Added as not-obvious case 11, one line each |
| 10 (note) | Q1 should recommend people | Agree | §7 Q1 now recommends people carrying a role |
| §3(d) | My earlier report's ledger 02 remark is not in this doc | Correct | No change to this doc; the remark was in my report only |
| §2 FTB | Reviewer's FTB "irrevocable appointment … agent" wording | Yes, but it is on the **form**, not the instructions | Cited to the form in Sources |
| §2 FTB | "No $50/$14 equivalent" in California | Grep of the instructions found none | Stated as "the instructions state no threshold", not as "California has none" |
| §2 FTB | Retention is 4 years | Yes: "later of four years from the due date … or … filed" | Added to §6 Signature |
