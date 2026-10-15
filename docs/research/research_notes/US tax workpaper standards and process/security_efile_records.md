# US data-protection, e-file and records rules for a CPA-firm tax workpaper tool

Researched Thu 15 Oct 2026 (local clock read with `date`: 19:03 EDT). Every factual claim carries a URL. "Unverified" means the source was secondary or not fetched in full. The primary IRS e-file text used is **Publication 1345 (Rev. 12-2025)**, which replaces the November 2024 edition ([Pub 1345 PDF](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). Each finding ends with **Implication for the tool:**.

Roles in the reader's design: preparer, reviewer, partner, client, admin. Sensitive data: SSNs and bank accounts. Flows: e-file, and a record frozen at filing.

## 1. FTC Safeguards Rule (16 CFR Part 314)

### Takeaway
A CPA firm that prepares returns is a "financial institution" under the Safeguards Rule. The rule requires the following:
- a written security programme;
- least-privilege access;
- encryption in transit and at rest;
- MFA for anyone accessing any system;
- logging and monitoring of authorised-user activity;
- disposal of customer data within 2 years of last use;
- change management;
- FTC notice within 30 days of a breach affecting 500 or more consumers.

Most of these turn directly into tool features.

### Cited Findings
- **Coverage.** The rule's definition gives this example: "An accountant or other tax preparation service that is in the business of completing income tax returns" is a financial institution ([16 CFR 314.2](https://www.law.cornell.edu/cfr/text/16/314.2)). The FTC's own guide lists "tax preparation firms" among covered businesses ([FTC guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know)). Pub 1345 restates that preparers "must create and enact security plans" under Part 314 ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** treat the firm as the regulated entity and the tool as a service provider that must make its controls possible. The tool needs per-firm security settings, and the admin role should own them.
- **Program elements (§314.4, nine elements in the FTC guide).**
  - A Qualified Individual.
  - A written risk assessment.
  - Safeguards.
  - Monitoring and testing.
  - Staff training.
  - Oversight of service providers.
  - Keeping the programme current.
  - A written incident response plan.
  - An annual written report to the board or senior officer.

  ([FTC guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know))

  **Implication for the tool:** the vendor must supply documentation the firm can rely on for its service-provider oversight, such as a SOC 2 report or security whitepaper. The admin role should have a way to export the access list, the activity log and the configuration for the Qualified Individual's annual report.
- **Access control (§314.4(c)(1)).** "Authenticate and permit access only to authorized users." Access must be limited to the customer information each user needs for their duties, and customers may access only their own information ([16 CFR 314.4](https://www.law.cornell.edu/cfr/text/16/314.4)). "Authorized user" includes customers and contractors ([314.2](https://www.law.cornell.edu/cfr/text/16/314.2)).
  **Implication for the tool:** use role-based access with client- and engagement-level scoping. A client sees only their own household. A preparer sees only assigned returns. SSNs and bank numbers should be masked by default and revealed only to roles that need them.
- **Encryption (§314.4(c)(3)).** Customer information must be encrypted in transit over external networks and at rest. Any exception needs compensating controls that the Qualified Individual reviews and approves ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)). Under §314.2, data counts as "unencrypted" for breach purposes if the key was also acquired ([314.2](https://www.law.cornell.edu/cfr/text/16/314.2)).
  **Implication for the tool:**
  - Use TLS everywhere and encrypt the database and file storage at rest.
  - Keep keys separate from the data, through a KMS.
  - Consider field-level encryption for SSN and bank fields, so a database dump alone is not a "notification event".
- **MFA (§314.4(c)(5)).** MFA is required "for any individual accessing any information system" unless the Qualified Individual approves an equivalent in writing. The factors are knowledge, possession and inherence ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4); [314.2](https://www.law.cornell.edu/cfr/text/16/314.2)). For Online Providers, Pub 1345 adds three points: MFA before returning taxpayers can access stored tax data, second-factor validation before a return is transmitted, and a strong recommendation against non-fixed VoIP numbers as a possession factor ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** MFA for every role, client included. It should not be optional for staff roles.
- **Disposal and retention (§314.4(c)(6)).** Customer information must be disposed of securely "no later than two years after the last date the information is used" to serve the customer. The exceptions are business necessity, a legal retention requirement, and cases where targeted disposal is not reasonably feasible. The retention policy must be reviewed periodically ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4); [FTC guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know)).
  **Implication for the tool:** each engagement needs a `last_used_at` date and a retention clock that reconciles the 2-year default against the legal holds in section 3: Form 8879 for 3 years, §6107 for 3 years, the CA statute of limitations for 4 years. The disposal job should be logged and leave a tombstone record.
- **Change management (§314.4(c)(7)).** "Adopt procedures for change management" ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)).
  **Implication for the tool:** keep versioned deployments with a change log. Changes to tax-calculation logic should be traceable to a release, so a frozen return records which engine version produced it.
- **Logging and monitoring (§314.4(c)(8)).** The rule requires "policies, procedures, and controls designed to monitor and log the activity of authorized users and detect unauthorized access or use of, or tampering with, customer information" ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)).
  **Implication for the tool:**
  - Keep an append-only audit log of who viewed, edited, revealed, exported or signed what, and when.
  - Log reads of SSNs and bank accounts, not only writes.
  - The log itself must resist tampering (see section 6).
- **Testing (§314.4(d)(2)).** Without continuous monitoring, the firm needs an annual penetration test and vulnerability assessments at least every six months ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)).
  **Implication for the tool:** this is a vendor and hosting obligation, not a UI feature. Mention it in the security page or case-study write-up.
- **Small-firm exception (§314.6).** §314.4(b)(1), (d)(2), (h) and (i) do not apply to institutions that hold customer information on fewer than 5,000 consumers. Those are the written risk assessment, the pen-test cadence, the written incident response plan and the board report. MFA, encryption and logging still apply ([16 CFR 314.6](https://www.law.cornell.edu/cfr/text/16/314.6)).
  **Implication for the tool:** do not design on the assumption that small firms are exempt from the technical controls.
- **Breach notification to the FTC (§314.4(j), 2023 amendment).**
  - **Trigger:** a "notification event", meaning acquisition of unencrypted customer information without authorisation. Unauthorised access is presumed to be acquisition unless shown otherwise ([314.2](https://www.law.cornell.edu/cfr/text/16/314.2)).
  - **Threshold and deadline:** at least 500 consumers, notified as soon as possible and no later than 30 days after discovery, through the FTC online form ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)).
  - **Contents:** name and contact details, types of information, date range, number of consumers, a description of the event, and any law-enforcement delay ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)).
  - **Effective date:** May 2024 ([FTC guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know)).

  **Implication for the tool:** the audit log must answer "which consumers' records did this account or session touch, and between which dates", or the firm cannot count affected consumers inside 30 days.

### Inferences
- In the logging model, "view" or "reveal" of an SSN or bank field counts as an auditable event. Without read logging, a firm cannot scope a breach.
- Field-level encryption of SSN and bank data, with keys held separately, is the cheapest way to shrink what counts as a notification event.

### Gaps
- The effective date of the 2021 amendments' substantive controls (commonly cited as 9 Jun 2023) was not confirmed in a fetched primary source. **Unverified.**
- eCFR.gov blocked the fetch, so the Cornell LII mirror was used. The wording was confirmed there, but the eCFR "current as of" date was not.

## 2. IRS guidance: Pub 4557, Pub 5708 (WISP), Security Six, Pub 1345 e-file rules, Pub 1075, IP PIN, prior-year AGI

### Takeaway
The firm's e-file obligations come from Pub 1345 (Rev. 12-2025). It sets out:
- e-signature rules for Form 8879, with identity proofing at NIST 800-63 level 2 plus knowledge-based authentication, capture of the IP address and login, and a tamper-proof signed record;
- a 3-year retention period for Form 8879;
- the $50 / $14 re-signature thresholds;
- taxpayer notice within 24 hours of a reject and a 5-day perfection window;
- reporting of security incidents to the IRS by the next business day.

Pub 4557 and Pub 5708 are guidance and templates that put the FTC WISP duty into practice.

### Cited Findings
- **Security incident reporting.** All Authorized e-file Providers must report security incidents "as soon as possible but not later than the next business day after confirmation". Any event that can lead to unauthorised disclosure, misuse, modification or destruction of taxpayer information counts. EROs report to their local stakeholder liaison ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** this IRS clock (next business day) is much shorter than the FTC's 30 days. The admin role needs a fast "incident scope" report built from the audit log.
- **Online Provider standards.**
  - An Extended Validation SSL certificate with TLS 1.2 or later and at least 2048-bit RSA / 128-bit AES.
  - An external vulnerability scan by an independent third party.
  - The ability to "timely isolate and investigate potentially compromised taxpayer information" ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  These apply to *Online Providers*, defined in Pub 3112, which a CPA firm's client portal may or may not be. **Unverified.**
  **Implication for the tool:** enforce TLS 1.2 or later as a minimum.
- **Taxpayer signature basics.**
  - The taxpayer must sign the Declaration of Taxpayer before transmission.
  - The taxpayer signs Form 8879 "after reviewing the return and ensuring the tax return information on the form matches the information on the return".
  - The ERO may enter PINs only with a signed 8879 ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  **Implication for the tool:** the client role's signing step must show the exact return version and the 8879 summary lines, and must record that this version was the one presented. Signing must be blocked until the return is in a reviewed or approved state.
- **Self-Select PIN vs Practitioner PIN.** Self-Select PIN authenticates the taxpayer with prior-year AGI or the prior-year PIN. Practitioner PIN does not need prior-year AGI but always needs a signed 8879. Primary taxpayers under 16 who have never filed cannot use Self-Select PIN ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** store the signature method per return. If Self-Select is used, prior-year AGI becomes a required, sensitive field. It should be validated against the prior-year return in the packet, which is a good mistake-hunt check.
- **Re-signature thresholds.** A new signature is needed if return data changes after signing by more than $50 to Total income or AGI, or more than $14 to Total tax, Federal income tax withheld, Refund or Amount you owe. The same thresholds decide whether a rejected return can be retransmitted without new signatures ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** after signing, compare the live return to the signed snapshot on those six lines. If either threshold is exceeded, mark the signature invalid automatically and send the return back for re-signature. This is a concrete, testable rule.
- **What e-signature software must record.**
  - A digital image of the signed form.
  - Date and time of signature.
  - The taxpayer's IP address and login username, for remote signing.
  - Identity verification results: knowledge-based authentication passed, or photo ID verified for in-person signing.
  - The signing method, or an audit trail of the signing process.

  The ERO must provide this to the IRS on request ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** a `signature_event` record with exactly these fields, attached to the frozen return.
- **Identity proofing.**
  - Must follow NIST SP 800-63 "Level 2 assurance level and knowledge-based authentication or higher".
  - Each taxpayer on a joint return is identified and authenticated separately.
  - Remote signing requires recording name, SSN, address and date of birth, and a record check.
  - Knowledge-based authentication is disabled after three failed attempts, and the taxpayer must then sign by hand.
  - The process must run in a secure portal.
  - Third-party record checks do not violate §7216 and need no extra consent ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  **Implication for the tool:**
  - Joint returns need two separate signer identities and two separate signature events.
  - Lock out after three failed knowledge-based authentication attempts.
  - Offer a wet-signature fallback.
  - The prototype can simulate the knowledge-based authentication vendor but should keep these states.
- **Tamper-proof signed record.**
  - Signatures must be "linked to their respective electronic records" so they cannot be excised or transferred.
  - "After the electronic record has been signed, it must be tamper-proof … techniques must be employed that lock a document and prevent it from being changed."
  - Storage needs secure access control, an indexing and retrieval system, and legible hard-copy reproduction ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  **Implication for the tool:** this is the strongest primary-source basis for "freeze at filing". Store an immutable snapshot of the signed return and 8879, hash it, and bind the signature event to that hash. Make the snapshot printable or exportable as a PDF.
- **ERO signature.** The ERO signs with a PIN attesting the ERO Declaration. Firm members or employees may be authorised to sign, but the ERO stays responsible ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** gate the "originate e-file" action on the partner or ERO role, and log the person who actually pressed it.
- **Retention.**
  - Form 8879 and 8878 are kept "for three years from the return due date or the IRS received date, whichever is later". They are not sent to the IRS unless requested.
  - The Submission ID must be on, or linked to, the 8879. If the acknowledgment carries the Submission ID, it is kept for the same period.
  - Other e-file records are kept "until the end of the calendar year": Form 8453 and supporting documents, W-2, W-2G and 1099-R copies, consent forms, an electronic return copy that can be retransmitted, and the acknowledgment file.
  - Electronic imaging is allowed if it meets Rev. Proc. 97-22 ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  **Implication for the tool:** store `submission_id` and the acknowledgment on the frozen record, and compute a retention date for each artefact.
- **Rejects.**
  - The IRS treats a rejected return as not filed.
  - If the ERO cannot fix the reject, it must take reasonable steps to tell the taxpayer within 24 hours, giving the business rule(s) and an explanation.
  - A return rejected on or before the due date is timely if corrected and resubmitted by the 5th calendar day after the due date.
  - The paper-return fallback deadline is the later of the due date or 10 calendar days after the reject notice.
  - The ERO must give taxpayers copies of corrected return data ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  **Implication for the tool:**
  - Model a "rejected" status that un-freezes into a correction version. The original filed snapshot is never edited.
  - Keep a 24-hour client-notification task and a perfection-period countdown.
  - Store the business-rule codes on the reject record.
- **Submission timing and income documents.** Once the return is signed, submission happens "as soon as possible". A return must not be e-filed before the ERO receives Forms W-2, W-2G and 1099-R, unless Form 4852 is used ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** add a pre-file check that every W-2, W-2G and 1099-R the return relies on has a source document attached. This fits the trace-to-source data model.
- **IP address.** Returns must carry the public, routable IP address, date, time and time zone of the computer used. Returns without the IP address are rejected, and private IP addresses are flagged in the acknowledgment ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** capture the IP address and time zone at transmission and store them on the frozen record.
- **Pub 4557** ("Safeguarding Taxpayer Data", revision 0524) is listed on the IRS tax-pro security hub, which was last updated 16 Sep 2026 ([IRS](https://www.irs.gov/tax-professionals/protect-your-clients-protect-yourself)). Pub 1345 describes it as guidance that links to NIST and warns that failures can bring FTC sanctions and §7216/§6713 penalties ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** Pub 4557 is best-practice guidance, not a separate legal rule. Cite it as the reason for the controls above.
- **Pub 5708 (WISP template).** The latest revision found is August 2024: a 28-page Security Summit template with sample attachments, including a record retention policy, rules of behaviour, a breach response procedure and a hardware inventory. The 2024 update added MFA best practices ([CPA Practice Advisor](https://www.cpapracticeadvisor.com/2024/08/14/irs-updates-wisp-guide-for-tax-professionals/109001/); [Delaware-hosted IRS handout](https://revenuefiles.delaware.gov/2024/FedState/IRS_Handout_Pub_5708_WISP.pdf)). Pub 5709 is the shorter companion ([IRS](https://www.irs.gov/tax-professionals/protect-your-clients-protect-yourself)). The revision date was confirmed only through secondary sources. **Unverified.**
  **Implication for the tool:** the firm's WISP will cite the tool's controls (roles, MFA, logging, retention), so make them documentable.
- **Security Six.** These are antivirus, firewall, two-factor authentication, backup, drive encryption and a written data security plan. They were released in 2018, and the IRS page is now marked archival ([IRS newsroom](https://www.irs.gov/newsroom/tax-security-101-security-summit-outlines-security-six-basic-safeguards-for-tax-professionals-computers-and-email); [Thomson Reuters](https://tax.thomsonreuters.com/blog/irs-identities-six-basic-security-safeguards-to-enhance-cybersecurity/)).
  **Implication for the tool:** mostly endpoint and office controls. Two-factor authentication, encryption and backup carry over to the tool.
- **Pub 1075.** Its scope is Federal Tax Information held by government agencies and their contractors under IRC 6103(p)(4) ([IRS Pub 1075 PDF](https://www.irs.gov/pub/irs-utl/p1075.pdf); [UpGuard](https://www.upguard.com/blog/irs-1075)).
  **Implication for the tool:** probably not applicable to a private CPA firm's own client data. Mention it only as a reference control set. **Unverified** that preparers are fully outside its scope.
- **IP PIN.** If the IRS has issued an IP PIN to the taxpayer, spouse or a dependent, it must be on any return they appear on. A missing or wrong IP PIN causes a reject (IND-180-01, IND-181-01). IP PINs change every year ([efile.com reject code](https://efile.com/tax-service/tax-return-rejection-codes/ind-180-01); [TaxSlayer Pro](https://support.taxslayerpro.com/hc/en-us/articles/7280916612250-IRS-Rejects-for-Incorrect-or-Missing-Identity-Protection-PIN-IP-PIN)). These are secondary sources; the IRS IP PIN page was not fetched.
  **Implication for the tool:** store an IP PIN field for each person on the return, for the current year only. Treat it as a secret on a par with SSN. Flag a prior-year IP PIN as stale.

### Inferences
- Pub 1345's "tamper-proof after signing" plus the $50 / $14 thresholds give "freeze at filing" a precise definition. Freeze at signature, not only at acceptance. Any post-signature change above the thresholds voids the signature.
- Rejects need versioning, not editing in place. The original snapshot and the corrected one are both kept.

### Gaps
- Whether the IRS "Security, Privacy and Business Standards" 1–5 apply to a CPA firm's client portal depends on the "Online Provider" definition in Pub 3112. That definition was not checked.
- No IRS rule was found that forbids preparers from retaining IP PINs after filing.
- The prior-year-AGI signature rule was confirmed in Pub 1345. The Pub 1345 Rev. 12-2025 text has no IP PIN section.

## 3. IRC §7216 and Treas. Reg. §301.7216-2/-3, Rev. Proc. 2013-14: consent to use and disclose

### Takeaway
Using or disclosing tax-return information beyond preparing the return needs prior written, knowing and voluntary consent, with separate documents for "use" and for "disclosure". There are exceptions:
- related taxpayers (spouse, parent and child, partner and partnership), unless the taxpayer prohibits it;
- software and IT contractors (with conditions);
- use within the same firm;
- peer review.

Sending return data to a third-party AI vendor is widely treated as needing consent. No IRS exemption for AI was found.

### Cited Findings
- **Consent form.**
  - It must be "knowing and voluntary", and conditioning services on it generally makes it invalid.
  - "A single written document, however, cannot authorize both uses and disclosures."
  - It must name the preparer and the taxpayer, state the purpose, the specific information and (for disclosures) the recipients, and carry the taxpayer's signature and date.
  - A consent for a full return must let the taxpayer ask for a narrower disclosure.
  - The taxpayer gets a copy.
  - No retroactive consent is allowed.
  - If no duration is stated, the consent lasts one year ([26 CFR 301.7216-3](https://www.law.cornell.edu/cfr/text/26/301.7216-3)).
  - The required format is in Rev. Proc. 2013-14, which Pub 1345 cross-references ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).

  **Implication for the tool:** keep a `consent` record per purpose with these fields: type (use or disclose), purpose, data scope, recipient, signed_at, expires_at (default 1 year), taxpayer copy delivered. Check it before any feature that shares data outside the engagement.
- **Offshore SSN disclosure.** For 1040 filers, a US preparer may not obtain consent to disclose the SSN to a preparer outside the US. The SSN must be masked unless an IRS-defined "adequate data protection safeguard" applies ([301.7216-3(b)(4)](https://www.law.cornell.edu/cfr/text/26/301.7216-3)).
  **Implication for the tool:** if any processor (for example an AI or OCR vendor, or offshore staff) is outside the US, send masked SSNs. Hosting region matters.
- **Solicitation limits.** A preparer may not request consent for unrelated solicitation after giving the taxpayer the completed return for signature. After a refusal, the preparer may not ask again for a substantially similar purpose ([301.7216-3](https://www.law.cornell.edu/cfr/text/26/301.7216-3)).
  **Implication for the tool:** do not put marketing-consent prompts in the 8879 signing step.
- **Related taxpayers (§301.7216-2(e)).** Information from one taxpayer may be used to prepare a related taxpayer's return (spouse, parent and child, partner and partnership, and similar) if the interests are not adverse and the first taxpayer has not "expressly prohibited the disclosure or use" ([26 CFR 301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2)).
  **Implication for the tool:** cross-return linking (for example a K-1 from the client's partnership return, or a dependant's return) is allowed by default. Add a per-taxpayer "prohibit cross-use" flag that blocks it.
- **Software and IT contractors (§301.7216-2(d)(2)).** Disclosure to contractors for programming, maintenance, repair, testing or procurement of tax software is allowed if:
  - it is limited to what the service needs;
  - the individuals get written notice of §§6713 and 7216.

  Such contractors are themselves treated as tax return preparers ([301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2)).
  **Implication for the tool:** developer and support access to production client data must be minimal and logged. Use synthetic data (as this case study does) for testing.
- **Same firm, retention, peer review.**
  - Accountants may use the information within their own firm for other services. Affiliates are not the same firm.
  - Preparers may keep copies of returns for later returns or examinations (§-2(m)).
  - Quality or peer review by CPAs, attorneys or EAs is allowed. Reports must not identify taxpayers ([301.7216-2](https://www.law.cornell.edu/cfr/text/26/301.7216-2)).

  **Implication for the tool:** the reviewer and partner roles inside the firm need no consent. An external peer-review export should support de-identification.
- **AI tools.** Secondary commentary says:
  - sending return information to a third-party AI vendor is generally a disclosure that needs §7216 consent;
  - generic e-file consent does not cover it;
  - no published exemption covers AI that performs substantive analysis.

  ([The Tax Adviser, Jan 2024](https://www.thetaxadviser.com/issues/2024/jan/the-many-implications-of-sec-7216.html); [Winthrop & Weinstine](https://winthrop.com/bold-perspectives/you-may-be-a-return-preparer-using-ai-without-violating-sections-7216-and-6713/); [Let's Data Science news summary](https://letsdatascience.com/news/irs-ai-guidance-leaves-client-disclosure-question-open-f5400ffe)). This is secondary and partly contested. **Unverified** against any IRS AI-specific guidance.

  **Implication for the tool:** if the workpaper adds an AI feature, gate it on a per-client "disclosure to [named AI vendor]" consent, or keep it inside a contractor arrangement under §301.7216-2(d)(2) with no substantive determinations. Mask SSNs in any prompt either way.

### Inferences
- §7216 enforcement belongs in the data model: a disclosure without a matching, unexpired consent should be impossible in code, not merely discouraged.

### Gaps
- The text of Rev. Proc. 2013-14 (mandatory consent wording and font size for 1040 consents) was not fetched. **Unverified** beyond the Pub 1345 cross-reference.
- No primary IRS guidance on AI and §7216 was found.

## 4. AICPA guidance, SOC 2, and NIST concepts

### Takeaway
SOC 2 is the vendor attestation that CPA firms expect from tax-software providers. Security is the mandatory criterion. Confidentiality, Processing Integrity and Privacy are the relevant optional ones for a workpaper tool. NIST SP 800-53 supplies the vocabulary for logging (AU-2), protection of audit information (AU-9) and least privilege (AC-6).

### Cited Findings
- **SOC 2 Trust Services Criteria.**
  - Security (mandatory, the Common Criteria).
  - Availability.
  - Processing Integrity: processing is "complete, valid, accurate, timely, and authorized".
  - Confidentiality.
  - Privacy.

  The criteria date from 2017, and the points of focus were revised in 2022 ([Secureframe](https://secureframe.com/hub/soc-2/trust-services-criteria); [Bastion](https://bastion.tech/learn/soc2/trust-services-criteria)). These are secondary sources; AICPA TSP section 100 was not fetched.
  **Implication for the tool:** Processing Integrity fits a computed return exactly. Every computed number should be reproducible from its inputs and engine version, which matches the trace-to-source data model.
- **NIST AU-9.** "Protect audit information and audit logging tools from unauthorized access, modification, and deletion", and alert on detected tampering. The enhancements include AU-9(4), access limited to a subset of privileged users, and AU-9(6), read-only access. AU-9 is in all three baselines ([UpGuard AU-9](https://www.upguard.com/compliance/nist-sp-800-53/au/au-9); [Coralogix](https://coralogix.com/guides/nist-sp-800-53-audit-logging-au-controls/)).
  **Implication for the tool:** the audit log is read-only for every role, including admin. No UI action deletes log entries.
- **NIST AU-2.** The organisation defines the set of events to log, with a rationale ([Coralogix](https://coralogix.com/guides/nist-sp-800-53-audit-logging-au-controls/)).
  **Implication for the tool:** write an explicit event list: login, MFA, view SSN, reveal bank, edit value, override, review sign-off, consent, 8879 sign, transmit, acknowledgment, reject, export, delete or dispose.
- **AC-6 (least privilege).** The concept is used in FTC §314.4(c)(1) ("limit … to customer information … needed to perform their duties") ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)). NIST AC-6 text was not fetched.
- **AICPA professional standards and AI.** Commentary links client-data use in AI tools to AICPA confidentiality rules (ET 1.700.001) and the Statements on Standards for Tax Services ([MasterCPE](https://www.mastercpe.com/ai-tools-and-professional-standards-what-the-rules-actually-say/)). This is secondary. **Unverified.**

### Inferences
- A SOC 2-ready design needs three things: an immutable audit log, role-based access with least privilege, encryption, change management and reproducible computation. The case-study app can show these at prototype level.

### Gaps
- No AICPA primary document on data security for tax practices was fetched. NIST SP 800-171 was not checked; it applies to CUI in federal contracts and is likely not directly binding on a CPA firm. **Unverified.**

## 5. State rules: California (CCPA/CPRA, FTB e-file) and Texas

### Takeaway
- CCPA/CPRA exempts personal information collected or processed under GLBA. The exemption covers the data, not the whole firm, so the firm's website, marketing and HR data may still be in scope.
- California's FTB requires the ERO to keep form FTB 8879 for the California statute of limitations, generally 4 years, which is longer than the federal 3.
- Texas requires notice to the Attorney General within 30 days when 250 or more Texans are affected, and to individuals within 60 days.

### Cited Findings
- **CCPA GLBA exemption.** It is data-level, not entity-level. Non-GLBA data (website, marketing, analytics) stays covered, and the scope of "pursuant to" GLBA is unsettled ([Presencis CCPA GLBA exemption](https://presencis.com/regulations/ccpa/exemptions/glba); [Davis Wright Tremaine](https://dwt.com/blogs/privacy--security-law-blog/2019/04/exempt-or-not-exempt)). These are secondary sources; Cal. Civ. Code §1798.145(e) was not fetched, and no source addressed tax preparers specifically. **Unverified** for tax firms.
  **Implication for the tool:** return data is likely GLBA data. Client-portal analytics, cookies and marketing contact data may fall under CCPA, so keep analytics off client data.
- **California FTB 8879.** "Retain form FTB 8879 for the California statute of limitations period" ([FTB 2023 8879 instructions](https://www.ftb.ca.gov/forms/2023/2023-8879-instructions.pdf)). The limitations period is "the later of four years from the due date of the tax return or four years from the date the tax return is filed" ([FTB 2017 8879-FID instructions](https://www.ftb.ca.gov/forms/2017/17_8879fidins.pdf)). FTB Pub 1345 Section 5 covers identity confirmation ([FTB 2023 instructions](https://www.ftb.ca.gov/forms/2023/2023-8879-instructions.pdf)). The individual 4-year figure was inferred from the fiduciary instructions, and 2025 instructions were not checked. **Unverified** for tax year 2025.
  **Implication for the tool:** set retention per jurisdiction: federal 8879 for 3 years, CA FTB 8879 for 4 years.
- **Texas (Bus. & Com. Code §521.053).** Individuals must be notified within 60 days of determining a breach. The Attorney General must be notified "not later than the 30th day" when at least 250 Texas residents are affected, using the AG's electronic form. SB 768 (2023) changed the AG deadline from 60 to 30 days ([texas.public.law](https://texas.public.law/statutes/tex._bus._%26_com._code_section_521.053); [SB 768 enrolled](https://capitol.texas.gov/tlodocs/88R/billtext/html/SB00768F.htm)). The effective date of SB 768 was not confirmed (**unverified**), and the AG page returned HTTP 402.
  **Implication for the tool:** the incident report should break down affected consumers by state of residence.

### Inferences
- The tool needs a client `state_of_residence` field for both breach-notice thresholds and state-specific retention.

### Gaps
- The CCPA applicability thresholds (revenue and number of consumers) were not fetched. California breach law (Civ. Code §1798.82) was not checked.

## 6. Record immutability, audit trail, and what "freeze at filing" must satisfy

### Takeaway
No rule was found that requires WORM storage for tax preparers, unlike SEC Rule 17a-4 for broker-dealers. The requirements that do exist are:
- the Pub 1345 rule that the signed e-file record be "tamper-proof", linked to its signature, access-controlled, indexed and reproducible;
- Rev. Proc. 97-22 integrity and indexing for electronic storage;
- the FTC §314.4(c)(8) duty to detect tampering;
- a 3-year (federal) or 4-year (CA) retention window.

An append-only, hash-chained snapshot satisfies all of these. It is also the same pattern the SEC now accepts as its "audit-trail alternative" to WORM.

### Cited Findings
- **Pub 1345 tamper-proof rule.** After signing, the record "must be tamper-proof", using techniques that "lock a document and prevent it from being changed". Access controls must ensure records "can't be changed". There must be an indexing and retrieval system and legible hard copies ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)).
  **Implication for the tool:** freeze at the 8879 signature, by snapshotting the return and 8879 and hashing them. Bind the signature event to the hash. After that, any edit creates a new version and never mutates the snapshot.
- **Rev. Proc. 97-22.**
  - Electronic storage systems must be accurate and reliable and have controls against unauthorised changes, with the burden of proof on the taxpayer.
  - They must have an indexing system and an audit trail cross-referencing ledger to source documents.
  - Records must be reproducible as hard copy for the IRS.
  - A failing system can bring a Notice of Inadequate Records and §6662 penalties.

  ([Journal of Accountancy, Jun 1997](https://www.journalofaccountancy.com/issues/1997/jun/taxbrfs-jun-1997/); [OMB-hosted text](https://omb.report/icr/202602-1545-013/doc/166463500.pdf)). Pub 1345 requires 97-22 compliance for imaged e-file records ([Pub 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf)). Whether 97-22 has been modified since 1997 was not checked. **Unverified.**
  **Implication for the tool:** keep the trace from each return line to its source document and field inside the frozen record. The index must survive the freeze.
- **IRC §6107(b).** The preparer keeps a copy of the return, or a list of client names and TINs, for 3 years after the close of the "return period". The return period is the 12 months starting 1 July (§6060(c)), so a 2022 return delivered in Aug 2023 is kept to 30 Jun 2027. The penalty is $50 per failure, capped at $25,000 (§6695(d)) ([govinfo §6107](https://www.govinfo.gov/link/uscode/26/6107); [The Tax Adviser, Feb 2023](https://www.thetaxadviser.com/issues/2023/feb/documentation-and-recordkeeping-for-tax-practitioners.html)).
  **Implication for the tool:** the retention date for the filed return copy is the end of the return period plus 3 years, which differs from the 8879 clock.
- **FTC §314.4(c)(8).** Controls must "detect unauthorized access or use of, or tampering with, customer information" ([314.4](https://www.law.cornell.edu/cfr/text/16/314.4)).
  **Implication for the tool:** a hash chain over the audit log, verified on read, turns "detect tampering" into a check the tool can actually run.
- **SEC 17a-4 contrast.** The 2022 amendments let broker-dealers choose WORM *or* an audit-trail alternative. The alternative must be able to recreate an original record after any modification or deletion, and must log the date, time and identity for each create, modify or delete ([Mayer Brown, Oct 2022](https://www.mayerbrown.com/-/media/files/perspectives-events/publications/2022/10/legal-update--sec-adopts-amendments-to-electronic-recordkeeping-requirements-for-brokerdealers-and-sbs-entities.pdf); [WilmerHale, Nov 2022](https://www.wilmerhale.com/-/media/files/shared_content/editorial/publications/wh_publications/client_alert_pdfs/20221129-sec-adopts-amendments-to-electronic-recordkeeping-requirements-for-broker-dealers-and-security-based-swap-dealers.pdf)). 17a-4 does not apply to CPA firms. It is a useful benchmark only.
  **Implication for the tool:** an event-sourced design (every change is an appended event, any past state can be rebuilt) meets the stricter SEC benchmark without WORM hardware.

### Inferences
- **Checklist for "freeze at filing":**
  1. Freeze at taxpayer signature. Re-freeze at transmission with the Submission ID, the IP and time-zone data and the engine version.
  2. Store an immutable, hashed snapshot of the return, the 8879, the signature evidence and the source-trace index.
  3. Auto-invalidate the signature if the $50 / $14 thresholds are crossed.
  4. Handle a reject by creating a new version that links back to the original. Never edit the original in place.
  5. Keep the audit log append-only and hash-chained, readable by every role and deletable by none.
  6. Give each artefact its own retention clock: 8879 for 3 years (CA for 4), the return copy for 3 years after the return period, the 2-year FTC disposal default for other customer data, and a legal-hold override.
  7. Export the frozen record to a legible PDF.

### Gaps
- No federal or AICPA rule was found that mandates WORM or cryptographic tamper-evidence for CPA firms. This absence is a finding from a limited search, not proof. **Unverified.**
- AICPA SSTS and AICPA workpaper-retention guidance for tax engagements were not fetched.
