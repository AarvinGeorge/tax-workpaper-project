# US rules and obligations for protecting, masking and redacting taxpayer PII in CPA workpaper software (as of Oct 2026)

Researched Fri 16 Oct 2026 (local `date`: 00:13 EDT). Verification key: **[V]** = primary text opened and read this session; **[S]** = secondary source only; **[U]** = unverified, could not open the primary text (from background knowledge; check before relying on it).

## IRC §7216, Treas. Reg. §301.7216-1..3, Rev. Proc. 2013-14: is sending to an AI/OCR/redaction service a "disclosure"? Does redaction change it? Offshore and SSN rules?

### Takeaway
Yes. Sending return information to any outside service is a "disclosure" (the definition is "in any manner whatever"), and redaction does **not** take data outside §7216, because even anonymised or statistical data still counts as tax return information. A US vendor that helps prepare the return can receive data without consent as a contractor, if it gets only what it needs and a written §7216/§6713 notice. Anything sent to a recipient **outside the US** needs signed taxpayer consent first, and the **SSN must be masked** before it leaves the US, unless both sides keep an "adequate data protection safeguard" and the consent says so. The rules contain no general on-screen masking requirement.

### Cited Findings
- **[V]** "Disclosure" means "the act of making tax return information known to any person in any manner whatever" (§301.7216-1(b)(5)). — [26 CFR 301.7216-1, LII](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- **[V]** Tax return information is "any information, including, but not limited to, a taxpayer's name, address, or identifying number" furnished for or in connection with preparing a return, plus information the preparer derives from it (§301.7216-1(b)(3)(i)). — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- **[V]** **Redaction does not remove coverage.** Tax return information "includes statistical compilations of tax return information … even in a form that cannot be associated with, or otherwise identify, directly or indirectly, a particular taxpayer" (§301.7216-1(b)(3)(i)(B)). — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- **[V]** The definition of "tax return preparer" includes a person "providing auxiliary services in connection with the preparation of tax returns, including a person who develops software that is used to prepare or file a tax return" (§301.7216-1(b)(2)(i)(B)). So a software, OCR or AI vendor in the prep chain is itself bound by §7216. — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- **[V]** "Use" includes any case where a preparer "refers to, or relies upon" tax return information "as the basis to take or permit an action" (§301.7216-1(b)(4)(i)). — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- **[V]** **Contractor exception, no consent needed (§301.7216-2(d)(2)):** disclosure to contractors is allowed "only to the extent necessary for the person to provide the contracted services," and only if the preparer makes sure recipients get "a written notice that informs them of the applicability of sections 6713 and 7216 to them." Under (d)(1), preparer-to-preparer disclosure within the US is allowed for services that "are not substantive determinations or advice affecting the tax liability." — [26 CFR 301.7216-2, LII](https://www.law.cornell.edu/cfr/text/26/301.7216-2)
- **[V]** **Within a firm:** disclosure inside the same US firm is generally allowed. If the recipient is outside the US, "the taxpayer's consent under § 301.7216-3 prior to any disclosure is required" (§301.7216-2(c)). For attorneys and accountants, (h)(1) allows disclosure to other officers of the same firm, but "a tax return preparer's law or accounting firm does not include any related or affiliated firms" (h)(1)(ii). — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-2)
- **[V]** **Statistical compilations (§301.7216-2(o)):** may be used without consent only for internal management or support of the preparation business, and only if anonymous. Disclosure may not include "an aggregate figure containing data from fewer than ten tax returns." — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-2)
- **[V]** §301.7216-2 contains no general masking or redaction rule. Its only SSN rule is the offshore one (Example 3 under (d)(3): the firm "may not obtain consent to disclose T's social security number (SSN) to a tax return preparer located outside" the US). Quality and peer reviewers are covered at (p). — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-2)
- **[V]** **Consent requirements (§301.7216-3):** consent must be "knowing and voluntary," and making services conditional on it makes it involuntary ((a)(1)). It must name the preparer and the taxpayer, state the purpose, and specify the information, and it must be signed and dated ((a)(3)(i)(A)-(E)). It must be written and given before the disclosure ((b)(1)). With no stated duration it lasts **one year** ((b)(5)). — [26 CFR 301.7216-3, LII](https://www.law.cornell.edu/cfr/text/26/301.7216-3)
- **[V]** **Offshore SSN masking is mandatory (§301.7216-3(b)(4)(i)):** for Form 1040-series filers, a US preparer "may not obtain consent to disclose the taxpayer's social security number" to a preparer located abroad, and "must redact or otherwise mask the taxpayer's SSN before the tax return information is disclosed" outside the US. The SSN may be sent back to the foreign preparer without consent if that preparer supplied it originally. **Exception (b)(4)(ii):** consent to disclose the SSN is allowed only if both preparers keep an adequate data protection safeguard. — [LII](https://www.law.cornell.edu/cfr/text/26/301.7216-3)
- **[V]** **Rev. Proc. 2013-14** (effective 14 Jan 2013; it modifies and supersedes Rev. Proc. 2008-35) sets the mandatory consent wording for 1040 filers. It clarifies that no consent is needed to engage a preparer for **tax return preparation services only**, but consent is needed to use or disclose information for other services. — [Rev. Proc. 2013-14, IRS PDF](https://www.irs.gov/pub/irs-drop/rp-13-14.pdf)
- **[V]** Rev. Proc. 2013-14 §5.05: for disclosure offshore, if the SSN "is fully masked or otherwise redacted" the consent must carry a short statement: "This consent to disclose may result in your tax return information being disclosed to a tax return preparer located outside the United States." If the SSN is "not fully masked or otherwise redacted," a longer statement is required. It says both preparers keep an adequate data protection safeguard, and that "federal agencies may not be able to enforce United States laws" against the offshore preparer. **So masking the SSN changes the consent wording, not whether consent is needed.** — [Rev. Proc. 2013-14](https://www.irs.gov/pub/irs-drop/rp-13-14.pdf)
- **[V]** Rev. Proc. 2013-14 §5.07: an "adequate data protection safeguard" is "a management-approved and implemented security program, policy, and practice that includes administrative, technical, and physical safeguards" that conforms to one of six frameworks: (1) the Commerce "safe harbor" framework or its successor; (2) a foreign data protection law with a security component, such as the EU Directive; (3) a generally accepted financial-industry standard (BITS, Financial Services Roundtable, Shared Assessments); (4) the AICPA/CICA Privacy Framework; (5) the latest IRS Pub 1075; or (6) any framework giving the same level of protection. — [Rev. Proc. 2013-14](https://www.irs.gov/pub/irs-drop/rp-13-14.pdf)
- **[V]** Rev. Proc. 2013-14 §6: an electronic consent needs an electronic signature, for example a PIN of **at least 5 characters** assigned to the taxpayer. — [Rev. Proc. 2013-14](https://www.irs.gov/pub/irs-drop/rp-13-14.pdf)
- **[S]** Practitioner commentary says the IRS has issued **no AI-specific §7216 guidance**. Commentators treat sending return information to a third-party AI vendor as a disclosure that needs consent. They argue that the "administrative" or auxiliary-services exception covers storage, hosting and e-filing software, but not AI doing substantive analytical work, and they recommend a standalone signed AI consent plus a non-AI workflow for clients who decline. Penalty: up to $1,000 and/or one year (up to $100,000 when the disclosure is connected to identity theft); civil penalty under §6713. — [CPA Practice Advisor](https://www.cpapracticeadvisor.com/?p=191491); [Morris Manning & Martin, "When Is Consent Enough" (PDF)](https://www.mmmlaw.com/resources/When%20Is%20Consent%20Enough%20-%20Tax%20Return%20Information%20in%20the%20Uncharted%20AI%20Landscape_QzLqZ8E.pdf) (search snippet only; the article URL returned 404); [my-cpe.com](https://my-cpe.com/blogs/using-ai-cpa-accounting-firms-irc-7216-aicpa-ftc-compliance-guide)

### Inferences
- In this app, an OCR, AI or redaction call to an outside service **is a §7216 disclosure whether or not the data is redacted first**. Redaction reduces breach exposure and Safeguards Rule risk, and it changes the offshore consent wording, but it does not avoid §7216.
- A US-hosted processor that only extracts or redacts for return preparation can probably rely on §301.7216-2(d)(2) (minimum necessary, plus the §7216/§6713 notice, plus a Safeguards Rule service-provider contract). An AI model that makes **substantive tax determinations** falls outside (d)(1). There is no IRS ruling on this; it is the commentators' reading.
- An LLM or OCR endpoint that processes **outside the US**, or whose region cannot be confirmed, needs prior signed consent, with the SSN masked by default. Running redaction **locally**, so nothing leaves the firm, avoids the disclosure question entirely. That is the strongest design argument for local PII redaction.
- Inside the firm, the rules say nothing about masking on screen; masking there is good practice (Safeguards Rule access controls, least privilege), not a §7216 duty.

### Gaps
- No IRS or Treasury guidance found on AI, LLM or OCR vendors under §7216 as of Oct 2026 (secondary sources dated 2026 say none exists). Not confirmed against irs.gov news for 2026.
- The Commerce "safe harbor" in Rev. Proc. 2013-14 was invalidated in 2015, and its successor (Privacy Shield, now the EU-US Data Privacy Framework) is a policy question; no IRS update to §5.07 was found.
- The §301.7216-2(c)/(d) paragraph numbers were reported by a summariser. The fetch flagged the offshore rules as being at (c)(3); confirm on [eCFR](https://www.ecfr.gov/current/title-26/chapter-I/subchapter-F/part-301/subpart-ZZ) (eCFR redirected to a bot check and could not be opened).

## FTC Safeguards Rule (16 CFR Part 314) as applied to tax preparers

### Takeaway
A CPA firm that prepares returns is a GLBA "financial institution" and must meet 16 CFR 314.4. That means encryption at rest and in transit, least-privilege access, MFA, logging of authorised users' activity, disposal within 2 years of last use, oversight of service providers, and, since 13 May 2024, notifying the FTC within 30 days of a breach of **unencrypted** data affecting 500 or more consumers. It requires encryption, not field masking. Masking is a compensating or least-privilege control.

### Cited Findings
- **[V]** §314.2(h)(2)(viii) lists as a financial institution "An accountant or other tax preparation service that is in the business of completing income tax returns." — [16 CFR 314.2, LII](https://www.law.cornell.edu/cfr/text/16/314.2)
- **[V]** Definitions (§314.2): "customer information" means any record containing nonpublic personal information, in any form. "Encryption" means a transformation with low probability of yielding meaning without a key, consistent with current cryptographic standards. A "notification event" is the unauthorised acquisition of **unencrypted** customer information, and acquisition is presumed unless there is reliable evidence otherwise. A "service provider" is anyone that receives, maintains, processes or otherwise has access to customer information. — [LII](https://www.law.cornell.edu/cfr/text/16/314.2)
- **[V]** §314.4(c)(1): "Authenticate and permit access only to authorized users," limited to the data each user needs. — [16 CFR 314.4, LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(c)(3): encrypt "all customer information held or transmitted by you both in transit over external networks and at rest." Where encryption is infeasible, "effective alternative compensating controls reviewed and approved by your Qualified Individual" may be used instead. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(c)(5): MFA for any individual accessing any information system, unless the Qualified Individual approves an equivalent control in writing. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(c)(6): securely dispose of customer information "no later than two years after the last date the information is used," unless it is needed for business or required by law, and review the retention policy periodically. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(c)(8): "monitor and log the activity of authorized users" and detect unauthorised access or tampering. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(d)(2): continuous monitoring, or else annual penetration testing plus vulnerability assessments at least every six months. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(f): select service providers able to maintain safeguards, require them by contract, and assess them periodically. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[V]** §314.4(j): for a notification event involving at least 500 consumers, notify the FTC "no later than 30 days after discovery," electronically. — [LII](https://www.law.cornell.edu/cfr/text/16/314.4)
- **[S]** The amendment was published 13 Nov 2023 and took effect **13 May 2024**. Data counts as unencrypted if the key was also accessed. The notice includes the types of information involved, the date range, and the number of consumers. — [Federal Register 2023-24412](https://www.federalregister.gov/documents/2023/11/13/2023-24412/standards-for-safeguarding-customer-information); [govinfo text](https://www.govinfo.gov/content/pkg/FR-2023-11-13/html/2023-24412.htm)
- **[V]** IRS Pub 1345 states that under the FTC Safeguards Rule "tax return preparers must create and enact security plans to protect client data. Failure to do so may result in a FTC investigation." — [IRS Pub 1345 (PDF)](https://www.irs.gov/pub/irs-pdf/p1345.pdf)

### Inferences
- For the app: encrypt PII fields at rest; role-based access, so for example a reviewer sees full SSNs only when needed; an audit log of who viewed or exported what; and a retention and disposal setting.
- **Logs:** §314.4(c)(8) requires logging user activity, and §314.2(d) treats any record containing NPI as customer information. So application logs that contain raw SSNs become customer information that must be encrypted, access-controlled and disposed of. Masking PII in logs is the cheap way to keep logs out of scope (an inference, not an explicit rule).
- Encryption also determines breach reporting: only **unencrypted** acquisition is a notification event, so encrypted exports reduce the reporting duty.

### Gaps
- §314.6 (exemption from some requirements for institutions with fewer than 5,000 consumers) was not opened this session **[U]**.

## IRS Pub 4557, Pub 5708 (WISP), Pub 1345: masking or truncation

### Takeaway
None of the three publications requires or even mentions SSN masking, truncation or redaction. A keyword search of the text found no hits for mask, truncat, redact or "last four", while the same search did find hits for encrypt, cloud and MFA, which shows it could return matches. They push encryption, MFA, secure transfer, a WISP, inventorying where PII lives, and FTC-compliant disposal.

### Cited Findings
- **[V]** Pub 4557 advises: "Implement multi-factor authentication for anyone accessing customer information"; "Encrypt all sensitive files/emails, especially those with the taxpayer's personally identifiable information"; "encrypt data before uploading to the cloud"; "If you … transmit sensitive data by email over the Internet, be sure to encrypt the data," preferring SFTP; and dispose of data consistent with the FTC Disposal Rule. — [IRS Pub 4557 (PDF)](https://www.irs.gov/pub/irs-pdf/p4557.pdf)
- **[V]** Pub 5708 (Rev. 8-2024) WISP template: inventory where PII is stored, including "Online (Web-based) applications, portals, and cloud software applications" and "Database applications, such as Bookkeeping and Tax Software"; "PII will not be in any unprotected format, such as e-mailed in plain text…"; define policies for cloud hosting providers, including 2FA; and "spell out whom the Firm may share stored PII data with." It includes attachments on record retention, rules of behaviour for safeguarding client PII, and breach notification. — [IRS Pub 5708 (PDF)](https://www.irs.gov/pub/irs-pdf/p5708.pdf)
- **[V]** Pub 1345 cross-references Pubs 4557 and 5708 and states that providers subject to GLBA "must follow the FTC's Financial Privacy and Safeguard Rules." — [IRS Pub 1345 (PDF)](https://www.irs.gov/pub/irs-pdf/p1345.pdf)

### Inferences
- Masking in the UI or exports is **good practice** under IRS guidance, not an IRS requirement. Under the WISP model, any outside AI or OCR service must be listed as a PII storage or sharing location and covered by the firm's sharing policy.

### Gaps
- The revision years of Pubs 4557 and 1345 were not captured. Pub 1345's "Safeguarding IRS e-file" chapter and the six security, privacy and business standards for Online Providers were not read in full **[U]**.

## Truncated TINs (26 CFR 301.6109-4)

### Takeaway
A truncated TIN (`XXX-XX-1234` or `XX-XXX1234`) is allowed on **payee statements and other documents furnished to another person** (for example, the client's copy of a W-2 or 1099). It is not allowed on anything filed with the IRS or SSA, and a filer may never truncate its own TIN or EIN.

### Cited Findings
- **[V]** Format: the first five digits are replaced with Xs or asterisks: "XXX-XX-1234 when replacing an SSN, or XX-XXX1234 when replacing an EIN." It covers SSN, ITIN, ATIN and EIN. — [26 CFR 301.6109-4, LII](https://www.law.cornell.edu/cfr/text/26/301.6109-4)
- **[V]** (b)(1): a TTIN "may be used to identify any person on any statement or other document" that the internal revenue laws require to be furnished to another person. Use is optional. — [LII](https://www.law.cornell.edu/cfr/text/26/301.6109-4)
- **[V]** (b)(2)(iii): a TTIN may not be used on "any return, statement, or other document that is required to be filed with" the IRS or SSA, or where a form or instructions require the full number. (b)(2)(iv): "A person may not truncate its own taxpayer identifying number" (so no truncated employer EIN on a W-2, and no truncated TIN on your own W-9). — [LII](https://www.law.cornell.edu/cfr/text/26/301.6109-4)
- **[V]** Applies to documents filed or furnished after 31 Dec 2020. — [LII](https://www.law.cornell.edu/cfr/text/26/301.6109-4)

### Inferences
- Source documents in the packet (W-2s, 1099s) may legitimately arrive with truncated recipient TINs. The app must not flag a truncated TIN on a recipient copy as an error, but it should flag a truncated **payer** EIN, since a payer cannot truncate its own number. The last-four plus `XXX-XX-` format is the regulator-endorsed display format for masked SSNs on screen and in client-facing exports.

### Gaps
- None material.

## Circular 230 §10.36, AICPA Code (confidential client information), SSTS

### Takeaway
Circular 230 §10.36 imposes a firm-procedures duty, not a data-security rule. The binding professional confidentiality rule for CPAs is AICPA ET 1.700.001; its guidance on third-party service providers requires a confidentiality contract with the provider or client consent before sharing. That was not opened this session.

### Cited Findings
- **[V]** §10.36(a): those with principal authority "must take reasonable steps to ensure that the firm has adequate procedures in effect" for compliance with subparts A, B and C. Discipline applies for wilful, reckless or grossly incompetent failure. The text does not mention data security or confidentiality. — [31 CFR 10.36, LII](https://www.law.cornell.edu/cfr/text/31/10.36)
- **[U]** AICPA Code ET 1.700.001 (Confidential Client Information Rule): a member in public practice shall not disclose confidential client information without the client's consent, with listed exceptions (subpoena, peer review, professional ethics investigation). ET 1.150.040 / 1.700.040 (Use of a Third-Party Service Provider): before sharing confidential client information with a third-party service provider, the member must either have a contract requiring the provider to keep it confidential, or obtain the client's specific consent. — [AICPA Code of Professional Conduct](https://pub.aicpa.org/codeofconduct/ethicsresources/et-cod.pdf) (not opened)
- **[U]** The AICPA Statements on Standards for Tax Services (SSTS, revised effective 1 Jan 2024) address tax practice quality, including the use of technology tools and reliance on information. No SSTS provision on data protection or masking was confirmed. — [AICPA SSTS](https://www.aicpa-cima.com/resources/download/statements-on-standards-for-tax-services) (not opened)

### Inferences
- An AI or OCR vendor needs, at minimum, a confidentiality contract (AICPA), a §7216/§6713 notice (Treasury regulation), and a Safeguards Rule service-provider contract. The three can live in one data processing agreement.

### Gaps
- The AICPA Code and SSTS text could not be opened this session; the pub.aicpa.org URL is from background knowledge.
- Circular 230 §10.51 (incompetence, disreputable conduct) was not checked for confidentiality hooks.

## State law for a California–Texas client

### Takeaway
California and Texas both restrict how **SSNs** are displayed and transmitted: no public display, encrypted or secure transmission, no SSN as a login, and none on mailings unless required by law, with an internal-use exception. Neither requires masking on internal screens. California's CCPA exempts GLBA-covered data **except** for the data-breach private right of action (§1798.150). Texas requires notifying individuals within 60 days, and the Attorney General within 30 days if 250 or more Texans are affected; encrypted data still counts as breached if the key is taken.

### Cited Findings
- **[V via FindLaw, current as of 1 Jan 2026]** Cal. Civ. Code §1798.85(a) prohibits: (1) publicly posting or displaying an SSN; (2) printing it on any card required to access products or services; (3) requiring transmission over the internet unless the connection is secure or the SSN is encrypted; (4) requiring the SSN to access a website unless a password, PIN or other authentication is also required; (5) printing it on mailed materials unless state or federal law requires it (applications and forms may include it, but never on postcards or visible without opening the envelope); (6) selling it. Subdivision (b) does not prevent collection, use or release required by law, or use "for internal verification or administrative purposes." — [FindLaw §1798.85](https://codes.findlaw.com/ca/civil-code/civ-sect-1798-85/) (leginfo.legislature.ca.gov returned 403)
- **[S]** CCPA §1798.145(e) exempts personal information collected, processed, sold or disclosed under GLBA (and the California Financial Information Privacy Act). The exemption covers the **data, not the institution**, and expressly does not apply to §1798.150, the data-breach private right of action with statutory damages. — [Dorsey](https://www.dorsey.com/en/newsresources/publications/client-alerts/2019/06/national-financial-institutions-ccpa); [ABA Banking Journal](https://bankingjournal.aba.com/2019/08/california-updates-its-privacy-policy/); [Ballard Spahr](https://www.ballardspahr.com/insights/alerts-and-articles/2018/09/glba-and-the-california-privacy-act-analyzing-sb-1121s-change)
- **[U]** Cal. Civ. Code §1798.82 requires breach notice "in the most expedient time possible and without unreasonable delay," and notice to the Attorney General when more than 500 California residents are affected. SB 446 (2025) reportedly added a 30-calendar-day deadline for consumer notice and a 15-day deadline for the AG notice, effective 1 Jan 2026. Personal information includes name plus SSN, driver's licence, financial account with access code, and others; encrypted data is excluded unless the key is also compromised. §1798.81.5 requires "reasonable security procedures." — [leginfo §1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82) (403, not opened)
- **[V via texas.public.law]** Tex. Bus. & Com. Code §501.001(a): a non-government person may not (1) make an SSN available to the public; (2) display it on an access card; (3) require transmission over the internet unless "the Internet connection is secure" or "the social security number is encrypted"; (4) require it for website access without a password, PIN or other authentication device; (5) print it on mailed material unless law requires it. Exceptions (e): uses "required by state or federal law," and "use of a social security number for internal verification or administrative purposes." — [texas.public.law §501.001](https://texas.public.law/statutes/tex._bus._and_com._code_section_501.001) (statutes.capitol.texas.gov is a JavaScript single-page app that did not render)
- **[V via texas.public.law]** §521.053: a breach is the "unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity" of sensitive personal information. Encrypted data is included if the person also holds the decryption key. Individuals must be notified without unreasonable delay and **within 60 days**; the AG within **30 days** if at least **250** Texas residents are affected; consumer reporting agencies if more than 10,000 people are notified. — [texas.public.law §521.053](https://texas.public.law/statutes/tex._bus._and_com._code_section_521.053)
- **[U]** §521.052: businesses must implement reasonable procedures to protect sensitive personal information and destroy records containing it that are not to be retained, by shredding, erasing or making them unreadable. §521.002 defines sensitive personal information as first name or initial plus last name combined with SSN, driver's licence or government ID number, or financial account number plus access code; health information is also included. — [Tex. Bus. & Com. Code ch. 521](https://statutes.capitol.texas.gov/Docs/BC/htm/BC.521.htm) (did not render)

### Inferences
- Internal display of a full SSN to authorised staff is lawful in both states (internal-use exception). Exports, emails and client mailings are where the SSN statutes bite, and secure or encrypted transport is mandatory whenever the client sends an SSN over the internet.
- Under California's §1798.150, a breach of unencrypted, unredacted personal information is privately actionable even though GLBA otherwise exempts the data. "Encrypted **or redacted**" is the safe harbour, which makes field-level redaction in stored exports and logs valuable (inference; §1798.150's wording was not opened).

### Gaps
- The text of California §§1798.82, 1798.81.5 and 1798.150, and the current SB 446 deadlines, could not be opened (leginfo 403; Justia 403). Texas §§521.002 and 521.052 were not opened. Verify on official sites before citing in the deliverable.

## Standards: NIST SP 800-122, SP 800-188, IR 8053; HIPAA Safe Harbor (analogy only)

### Takeaway
NIST SP 800-122 (April 2010, still final) is the standard reference for rating PII "confidentiality impact" and choosing safeguards such as minimisation, de-identification and masking. SP 800-188 and IR 8053 cover de-identification. HIPAA's 18-identifier Safe Harbor is a useful checklist of identifiers to strip, but it has no legal force for tax data, and under §7216 de-identification does not end coverage.

### Cited Findings
- **[V]** NIST SP 800-122, *Guide to Protecting the Confidentiality of PII*, final 6 Apr 2010, with no withdrawal notice. It provides "practical, context-based guidance for identifying PII and determining what level of protection is appropriate for each instance of PII," using a PII confidentiality impact level tied to FIPS 199. — [NIST CSRC SP 800-122](https://csrc.nist.gov/pubs/sp/800/122/final)
- **[U]** SP 800-122 §4 lists safeguards including minimising PII use, de-identifying, anonymising, and masking or truncation of fields. NIST SP 800-188 (*De-Identifying Government Datasets*, final Sept 2023) and NISTIR 8053 (*De-Identification of Personal Information*, Oct 2015) describe suppression, generalisation, pseudonymisation and the risk of re-identification. — [SP 800-188](https://csrc.nist.gov/pubs/sp/800/188/final); [IR 8053](https://csrc.nist.gov/pubs/ir/8053/final) (not opened)
- **[U]** The HIPAA Safe Harbor at 45 CFR 164.514(b)(2) lists 18 identifiers to remove: names; geographic subdivisions smaller than a state (except the first 3 ZIP digits under conditions); all date elements except year; phone; fax; email; SSN; medical record number; health plan number; account numbers; certificate or licence numbers; vehicle IDs; device IDs; URLs; IP addresses; biometrics; full-face photos; and any other unique identifier. — [45 CFR 164.514, LII](https://www.law.cornell.edu/cfr/text/45/164.514) (not opened)

### Inferences
- Use SP 800-122 impact levels to tier the fields (see next section). Use the HIPAA list only as a completeness checklist for a redactor (dates, addresses, account numbers), never as proof that §7216 no longer applies.

### Gaps
- None of the NIST de-identification documents or the HIPAA text was opened this session.

## Which tax-return fields count as sensitive

### Takeaway
The law names SSN/ITIN/TIN, financial account numbers and driver's licence numbers explicitly (FTC NPI, state breach statutes). IRS-specific secrets (IP PIN, prior-year AGI, Self-Select signature PIN) act as authentication credentials and should be treated at the highest tier. Under §7216, **everything** on the return, including name and address, is protected tax return information.

### Cited Findings
- **[V]** §7216 covers "any information, including … a taxpayer's name, address, or identifying number" furnished for preparation. — [LII 301.7216-1](https://www.law.cornell.edu/cfr/text/26/301.7216-1)
- **[V]** The FTC treats any information a consumer provides to obtain a financial service, such as a prepared return, as personally identifiable financial information. — [LII 314.2](https://www.law.cornell.edu/cfr/text/16/314.2)
- **[V]** Both California and Texas give SSNs specific display and transmission rules (above). The Texas breach statute covers name plus SSN, driver's licence or financial account details. — [texas.public.law 521.053](https://texas.public.law/statutes/tex._bus._and_com._code_section_521.053); [FindLaw 1798.85](https://codes.findlaw.com/ca/civil-code/civ-sect-1798-85/)
- **[V]** The truncation rule covers SSN, ITIN, ATIN and EIN. — [LII 301.6109-4](https://www.law.cornell.edu/cfr/text/26/301.6109-4)
- **[U]** IRS guidance treats the IP PIN as a secret known only to the taxpayer and the IRS, and the prior-year AGI or Self-Select PIN as e-file signature or identity-verification data. Their exposure enables fraudulent e-filing. No primary source was opened this session.

### Inferences (proposed tiers for the app; design judgement, not law)
- **Tier 1, always masked on screen by default, never logged, never sent to an outside service:** SSN/ITIN/ATIN (show `XXX-XX-1234`); bank routing plus account numbers (show last 4); IP PIN; e-file Self-Select or practitioner PIN; prior-year AGI used for signature; driver's licence or state ID number and issue/expiry dates; passwords and credentials.
- **Tier 2, visible to the assigned role, masked in exports and logs:** dates of birth (especially minors'); dependants' names, SSNs and DOBs (minors); full street address; phone and email; EINs of individuals' sole proprietorships (an EIN is a TIN and may be truncated on furnished statements).
- **Tier 3, protected by §7216 but shown normally to authorised users:** dollar amounts, payer names and EINs (a business EIN is public-ish but still return information), filing status.
- **When:** on screen, mask Tier 1 by default with an audited reveal. In exports, mask Tier 1 unless the export is a filing copy (filed copies need full TINs, per §301.6109-4(b)(2)(iii)). In logs, mask Tiers 1 and 2. Before any third-party or AI call, redact Tiers 1 and 2 locally, **and still** treat the call as a §7216 disclosure: a US contractor under (d)(2) with notice and contract, or signed consent if offshore or non-preparation.

### Gaps
- Minors' data: no tax-specific federal rule found. COPPA applies to online collection directly from children under 13, not to parents giving data to a preparer (inference, not researched).
