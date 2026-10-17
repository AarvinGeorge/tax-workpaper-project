# Call 3 review — mask payer tax IDs (EINs)?

Reviewer: Claude Fable 5.1 (independent of the recommending model). Run Fri 16 Oct 2026 16:17 EDT (`date`).

## 1. Verdict

**AGREE** — do not mask EINs for any role. Two small corrections to the wording, neither changes the call.

## 2. What the recommendation gets right

- **The firm rule names only three classes.** L2, packet `firm.starter_standards.rules[5]` (probe 1): "Staff without sensitive-data clearance see SSNs, bank and account numbers and IP PINs masked; every unmasked view is logged." EINs are not in it. The brief (L1, `docs/brief.txt` line 46) says only "protection of sensitive data with view logs" and does not define the set, so the packet rule is the operative definition.
- **Every EIN in the packet is a business identifier.** Probe 1 lists all 13 distinct EINs: 2 employers (D08 Corvane, D09/D10 Halvorsen), 5 Form 1099-NEC payers (D16–D20), 1 partnership (D37 Ridgeline), 1 S corporation (D39/D40 Lindqvist Family Woodworks, Erik a 20% shareholder), 2 dependant-care providers (D61 Bright Oak Kids Club, D62 Little Sprouts, both companies), the firm itself (`firm.firm_identity.ein`), and the prior-year return's copy of Bright Oak's ID. None belongs to a person.
- **No household member or Erik's business has an EIN.** Probe 2: all five 1099-NECs read "Recipient Erik Lindqvist dba Lindqvist Studio, SSN XXX-XX-9134"; the household `people[]` carry only `ssn` (probe 2); the only key named `ein` anywhere in the packet is the firm's (probe 1). So "sole proprietor's EIN" is a non-case here, and the household's own identifiers are already covered by the SSN rule.
- **The README types EIN by format, not by sensitivity.** L2, `docs/packet/readme-verbatim.md` line 55 lists `value_type` as `… ssn | ein | account_number`; the README's only use of "sensitive" is the staff field `sensitive_data_clearance` (line 59). There is no README sensitivity definition that includes EINs.
- **EINs are concept keys and check targets.** L3: GT-A07 (`docs/ground-truth/01-wages-people-credits.md` lines 82–87) is a ledger mistake that *lives in an EIN*: D62 prints 74-3829**156**, ev-1045 and every return version's `F2441.1b` label say 74-3829**516** (probe 1 shows both numbers; probe 2 shows the labels). Masking EINs would hide the first five digits of exactly the field the app must surface to every role, including Marcus. The automated test for GT-A07 must pass in the uncleared role.
- **Truncation law is quoted correctly** (L4, `docs/research/reports/Local PII redaction for tax documents.md` line 21; `docs/discovery/07-firm.md` lines 51–53). A corollary check is cheap: TTIN-format EINs in the packet = 0, with the pattern proven to match a test string (probe 1).

## 3. What it misses or gets wrong

- **The count is understated and mis-described.** Probe 1: **34 occurrences, 13 distinct** across `documents` 14, `extracted_values` 12, `return_versions` 6 (the Form 2441 provider *labels*), `prior_years` 1, `firm` 1. "About 20 in packet text" is only the printed pages plus return labels. And "bank, broker IDs" is wrong for this packet: no bank or broker document prints a payer EIN (D32 1099-INT, probe 1, carries none). The real categories are employers, 1099-NEC payers, K-1 entities, care providers and the firm.
- **It reverses an earlier internal proposal without saying so.** L4 `docs/discovery/07-firm.md` line 160 proposed a render-time mask that includes "EIN". L4 cannot override the L2 rule, so the reversal is correct, but `docs/decisions.md` should record it as a change.
- **Care providers deserve one sentence.** Form 2441 takes a provider's SSN when the provider is an individual. Both providers here are companies (probe 1), so nothing to mask; but the SSN regex already handles the individual case without any EIN-specific logic. State that so a reviewer does not reopen it.
- **Client and IRS examiner views need no EIN difference.** The filed return must carry untruncated EINs (26 CFR 301.6109-4 forbids truncation on IRS filings), so the examiner sees them; the client already holds every W-2 and 1099 with the payer's full EIN printed. Scope (which documents each role sees) is the lever for those roles, not masking. Hypothesis, grounded in the reg cited above: no packet field or brief line asks otherwise.
- **Adjacent firm secrets are outside this call but easy to confuse.** `firm_identity` also holds `efin` (6 chars) and `ero_pin` (5 chars) and four PTINs (probe 2). The firm rule does not name them either; the ERO PIN is already flagged as a firm secret (L4, 07-firm.md line 23). Keep them out of the EIN decision, but do not let "EINs are open" bleed into "firm identity is open".

## 4. Recommendation (plain words)

Leave EINs visible to everyone, in every view. Mask only what the firm's own rule says: SSNs, bank and account numbers, IP PINs (plus the extras already decided elsewhere). Write that down in the decision log as "EINs are business IDs printed on the forms the client already holds; the firm rule does not cover them; one of our logged mistakes sits inside an EIN and must stay visible to the uncleared preparer."

Cost: nothing to build. One unit test (minutes) asserting the mask function leaves `NN-NNNNNNN` strings untouched while still masking an SSN beside it, and the existing GT-A07 test run once under the Marcus role.

## 5. Probes run

Scripts: `/private/tmp/claude-501/-Users-aarvingeorge-Documents-Climb-Profile-Builder-tech-personal-projects-tax-workpaper-project/9cc2f380-a009-45a0-913e-e17f89510bc5/scratchpad/calls-review/probe3_ein.py` and `probe3b_ein.py`, each run as `python3 -I <script> "<packet path>"`. SSNs shown last-4 only.

Probe 1 (trimmed):
```
TOTAL EIN-pattern hits in packet: 34
Distinct EINs: 13
By top-level section: {'documents': 14, 'extracted_values': 12, 'firm': 1, 'prior_years': 1, 'return_versions': 6}
68-0412257  x10  D06 Delta River (prior_year_return), D61 Bright Oak Kids Club (dependent_care_statement, dependent:theo); prior_years/return_2024/lines/F2441.provider; return_versions v0-v2 F2441 labels
74-2290518  x6   D09, D10 Halvorsen Data LLC (W-2)
74-3829516  x5   D62 Little Sprouts (extracted + return labels)
82-4471903  x3   D08 Corvane Systems (W-2)
93-1876620  x2   D39, D40 Lindqvist Family Woodworks, Inc. (K-1-1120S, spouse)
91-1180443 / 46-3017729 / 68-2240915 / 74-0612278 / 85-3391062  x1 each  D16-D20 1099-NEC payers
87-1123904  x1   D37 Ridgeline Real Estate Fund III LP (K-1-1065)
74-3829156  x1   D62 Little Sprouts (printed page)      <- GT-A07
88-4410275  x1   firm/firm_identity/ein
extracted value_type == 'ein': ev-0014 D08 employer_ein; ev-0033 D09; ev-0050 D10; ev-1043 D61 "Provider tax ID"; ev-1045 D62 "Provider tax ID"
value_type counts: {'ssn': 5, 'ein': 5, 'account_number': 1}
rules[5]: Staff without sensitive-data clearance see SSNs, bank and account numbers and IP PINs masked; every unmasked view is logged.
staff clearance: st-01 True, st-02 True, st-03 True, st-04 Marcus Bell False, st-05 True, st-06 True
keys named ein/_ein/tin anywhere: firm/firm_identity/ein = 88-4410275   (only one)
documents mentioning dependent care / 2441: D06 only (D61/D62 are typed dependent_care_statement)
TTIN-format EINs (XX-XXX1234) in packet: 0 | self-test on 'XX-XXX1234': 1
Occurrences of the word 'EIN' in packet text: 10
```

Probe 2 (trimmed):
```
D16: Form 1099-NEC 2025. Payer Fennimore Brewing Co., TIN 91-1180443. Recipient Erik Lindqvist dba Lindqvist Studio, SSN XXX-XX-9134. ...
(D17-D20 identical pattern; D21 1099-K payee "Erik Lindqvist dba Lindqvist Studio", no TIN printed)
return_versions v0/v1/v2 F2441.1a label: "Care provider: Bright Oak Preschool, tax ID 68-0412257"
return_versions v0/v1/v2 F2441.1b label: "Care provider: Little Sprouts Learning Center, tax ID 74-3829516"
household people keys: ngozi/erik [ssn, ip_pin, ...]; ada/theo [ssn, ...]  -- no ein/tin key
firm_identity: ein = 88-4410275; efin = <len 6>; ero_pin = <len 5>; ptins = 4 x <len9>; paid_preparer_signing_returns = st-03
```

Source greps: `grep -n -i "sensitive|mask|EIN|SSN|IP PIN" docs/brief.txt` → only line 46; same grep on `docs/packet/readme-verbatim.md` → lines 17, 53, 54, 55, 59; `grep -rn "D62|3829|EIN" docs/ground-truth/` → GT-A07 (lines 82–87), GT-A08 (92–97), README.md line 54.
