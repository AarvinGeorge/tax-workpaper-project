# Call 4 review — "mask sensitive numbers for everyone"

## 1. Verdict
**MODIFY.** Mask-for-everyone with logged reveals is the right default, but the recommendation argues it from the wrong place (the rule's silence), omits that the rule is admin-changeable, and leaves out the two things that make it work without friction: last-4 always visible with checks computed server-side, and a reveal that lasts the session rather than a click.

## 2. What it gets right
- Masking by default for every role satisfies **both** readings of the firm rule. L2 packet `firm.starter_standards.rules[5]`: "Staff without sensitive-data clearance see SSNs, bank and account numbers and IP PINs masked; every unmasked view is logged." If the only unmasked views are reveals, then every unmasked view is logged, as the rule demands, whether "unmasked view" means a page load or a click.
- Marcus cannot reveal: L2 `firm.staff[3]` = `sensitive_data_clearance: false`, note "Background check pending; no access to full SSNs or bank numbers." (probe 1).
- A log the administrator reads is the brief's requirement: L1 `docs/brief.txt:46` "protection of sensitive data with view logs". Jo is `firm_administrator` with clearance true (probe 1).
- The reveal log is a meaningful artefact only under this design. Under the "cleared staff see numbers by default, log page views" reading, 11 of 74 documents print SSN-like strings (probe 3), so every document open becomes a log row and Jo's "who saw Theo's SSN" question (L4 `docs/discovery/07-firm.md:84`) drowns in noise.
- L4 `docs/discovery/07-firm.md:125-128` already reached the same proposal, and L4 `docs/research/reports/Local PII redaction for tax documents.md` ("Two policy calls remain open … Masking by default for everyone fits the logging duty best") left it to Aarvin. So this is a decision being closed, not invented.

## 3. What it misses or gets wrong
1. **The literal reading is not "silent".** Read plainly, clause 1 says uncleared staff see masks; clause 2 ("every unmasked view is logged") can only apply to the people who get unmasked views, i.e. cleared staff. The natural reading is: cleared staff see numbers; every such view is logged. The recommendation's reading (mask all, log reveals) is *stricter than the rule*, not an interpretation of a gap. Say so honestly in the write-up: "we tightened the starter rule" is a better story than "the rule was unclear". L4 support for tightening: FTC Safeguards 16 CFR 314.4(c)(8) asks for logging of all authorized users' activity (cited at `docs/discovery/07-firm.md:126-127`, not re-verified here).
2. **The standards are changeable by the administrator, and the recommendation ignores it.** L2 packet `firm.starter_standards.note`: "A starting point. Applicants may change, extend or replace these through the firm administrator role." (probe 2). The README (L2 `docs/packet/readme-verbatim.md:59`) repeats "a starting point you may change". So the masking default is a *firm standard*, not an app constant. It matters here because the firm's own text says the default is a policy Jo owns. Day-one answer: hard-code mask-for-all, but show it on Jo's standards screen as the rule the app applies, with the tightened wording, versioned like any other rule. Do not build a toggle on day one.
3. **It does not say where masking runs.** Only 11 of 3,012 extracted values are typed `ssn`/`account_number`/`ein` (probe 4), yet 11 documents print SSNs in text and tl-20 holds both 8879 PINs (L4 `docs/discovery/07-firm.md:37`). "Marcus's button is disabled" is a UI statement; the requirement is that the server never sends the digits to an uncleared session, in documents, search, exports or the log. The research report's test ("DOM and every network response body") is the right check.
4. **Role needs are stated, not checked.**
   - *Priya fixing GT-A05* (L3 `docs/ground-truth/01-wages-people-credits.md:62-71`): the mismatch (…3309 vs card …3390) sits in the last four, so TTIN masking (XXX-XX-3390) already shows it; the identity check itself should be computed server-side as match/mismatch (L4 `07-firm.md:55-57`). She needs a reveal only to *type* the corrected number. One reveal, one log row. Low friction.
   - *Marcus*: beyond the disabled button, he cannot do the required step "Identity verified" (L2 `starter_standards.required_steps[1]`, probe 4) or the e-file fix. Clearance must change assignment, not just rendering (L4 `07-firm.md:100-102`). The task should say "needs clearance", not fail silently.
   - *Client (Ngozi)*: the household SSNs were "entered by client (organizer), 2026-01-20" (probe 4); GT-A05 is her typo. She must be able to see and correct her own family's numbers. Mask-by-default plus reveal works; logging her own view is harmless and keeps one code path. Do not special-case her.
   - *IRS examiner*: disclosure to the IRS needs no consent (L4 `07-firm.md:93-94`); the examiner already holds the SSNs. Masked by default with a logged reveal is fine and is exactly the kind of outside view a log should record.
   - *Next year's preparer*: masking does nothing about the 2026 IP PIN, which must not carry forward (L4 `07-firm.md:90-92`). Separate rule; note it so nobody thinks masking covers it.
5. **Friction for a 20-year CPA is real if the reveal is per click per field.** Professional tax software shows staff full SSNs; a reviewer re-clicking "Reveal" on every page of 11 documents will turn it off or resent it (hypothesis). The fix is design, not policy: last four always visible; checks run on the server; one reveal unmasks that person's or account's identifiers for the rest of the session on that return and writes one row (who, which identifier by label, where, when). No mandatory free-text reason: the brief asks for view logs, not justifications.

## 4. Recommendation (plain words)
Keep "masked for everyone, reveal is logged, Marcus cannot reveal, Jo reads the log", with four changes:
- Write it as a *tightening* of the firm's starter rule, and show the tightened rule on Jo's standards page as a versioned standard (the packet says standards are hers to change). No toggle on day one. Cost: one line of copy on a screen you are building anyway.
- Mask on the server, over text, not fields: SSN, account, EIN, IP PIN and the two 8879 PINs in tl-20; last four stay visible (IRS TTIN format). Uncleared sessions never receive the digits; search never confirms a guess; the log stores labels, never values. Cost: one `redact` function and one Playwright test as the uncleared role (both already specified in the research report).
- Reveal lasts the session for that identifier on that return; one log row per reveal. Cost: a small set in session state instead of per-field flags; cheaper than per-click.
- Identity checks (GT-A05, A07, A08) compare on the server and show match/mismatch; a reveal is needed only to edit. Cost: already in the plan.
Total: roughly half a day inside the slice you are building, no new screens.

## 5. Probes run
Scripts in `/private/tmp/claude-501/…/scratchpad/calls-review/probe4*.py`, run as `python3 -I probe4X.py "case-study-project-package/okafor_lindqvist_2025_packet (1).json"`.

Probe 1 (staff, rules):
```
st-01 Priya Raman preparer clearance True
st-02 Daniel Ortiz reviewer CPA clearance True
st-03 Helen Strand partner CPA clearance True
st-04 Marcus Bell preparer clearance False note 'Background check pending; no access to full SSNs or bank numbers.'
st-05 Jo Kimura firm_administrator clearance True
st-06 Sam Adeyemi quality_reviewer CPA clearance True
client_users: cu-01 Ngozi Okafor, cu-02 Erik Lindqvist (role client)
rules[5]: Staff without sensitive-data clearance see SSNs, bank and account numbers and IP PINs masked; every unmasked view is logged.
keyword counts: unmasked 1, masked 2, "view log" 0, clearance 8, ip_pin 5, logged 1, audit 0
distinct SSN-like last4: 5
```
Probe 2 (standards note, Marcus references):
```
starter_standards.note: A starting point. Applicants may change, extend or replace these through the firm administrator role.
assignment_at_start: preparer st-01, reviewer st-02, partner st-03
st-04 mentions: 3 (staff entry ×2, timeline[8] tl-09 staff_joined_engagement 2026-03-24)
ip_pin paths: household.people[0].ip_pin, household.people[1].ip_pin
```
Probe 3 (where SSNs live):
```
docs containing SSN-like strings: 11 of 74
Ngozi: ssn yes, ip_pin yes | Erik: ssn yes, ip_pin no | Ada: ssn yes | Theo: ssn yes
efile[0] 2026-07-13 federal rejected R0000-504-02 (dependent 2: Theo Lindqvist-Okafor)
```
Probe 4 (steps, typed values):
```
required_steps[1]: 'Identity verified'  (12 steps total)
extracted values typed ssn/account/ein: 11 of 3012
household entered_by: client (organizer), 2026-01-20
```
Grep (L1): `docs/brief.txt:46: Firm: firm-wide standards, protection of sensitive data with view logs, …`
