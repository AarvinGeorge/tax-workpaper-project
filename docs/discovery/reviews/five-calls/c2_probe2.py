import json, sys, re, collections
p = json.load(open(sys.argv[1]))
def mask(s): return re.sub(r'(\d{3})-(\d{2})-(\d{4})', r'XXX-XX-\3', str(s))
docs = {d['id']: d for d in p['documents']}
evs = {e['id']: e for e in p['extracted_values']}

print("== ev-0012:", {k: mask(v) for k, v in evs['ev-0012'].items() if k != 'position'})
print("== ev-1080:", {k: mask(v) for k, v in evs['ev-1080'].items() if k != 'position'})
for d in ('D06', 'D71', 'D11', 'D28', 'D14', 'D15', 'D23', 'D25', 'D30', 'D31', 'D73', 'D09'):
    x = docs[d]; print(d, x['document_type'], '|', x['issuer'], '| belongs_to', x['belongs_to'], '| uploaded_by', x['uploaded_by'], '| corrected', x.get('marked_corrected'))
print("== document_type counts:", collections.Counter(d['document_type'] for d in p['documents']).most_common())
print("== marked_corrected docs:", [(d['id'], d.get('marked_corrected')) for d in p['documents'] if d.get('marked_corrected')])
print("== uploaded_by:", collections.Counter(d['uploaded_by'] for d in p['documents']))

# --- Simplest check 1: identity cross-check (household ssn vs any ssn-type value on a document for the same person)
print("\n== CHECK 1: identity cross-check")
people = {h['id']: h for h in p['household']['people']}
n_compared = 0
for e in p['extracted_values']:
    if e['value_type'] != 'ssn': continue
    d = docs[e['document_id']]
    # who is it? dependent:<id> via belongs_to, else by field/label name match
    who = None
    bt = d['belongs_to']
    if bt.startswith('dependent:'): who = bt.split(':')[1]
    elif bt in ('taxpayer', 'spouse'):
        who = [h['id'] for h in people.values() if h['role'] == bt]
        who = who[0] if who else None
    if who is None or bt == 'joint':
        for hid, h in people.items():
            if h['name'].split()[0].lower() in (e['label'] + ' ' + e['field']).lower(): who = hid
    if who is None: print("  unmatched ssn value", e['id'], e['field'], e['label']); continue
    n_compared += 1
    ok = people[who]['ssn'] == e['value']
    print(f"  {e['id']} {e['document_id']} field={e['field']} person={who} doc={mask(e['value'])} organizer={mask(people[who]['ssn'])} -> {'OK' if ok else 'MISMATCH'}")
print("  compared:", n_compared)

# --- Simplest check 2: payments tie-out to agency records (firm required step 7)
print("\n== CHECK 2: estimated payments vs agency records")
v3 = p['return_versions'][2]
lines = {l['key']: l for l in v3['lines']}
f = lines['F1040.26']
snap = p['tax_agency_records']['irs_account_transcript_2025'][0]  # earliest, 2026-03-12, in hand at v2
irs670 = [t for t in snap['transactions'] if str(t['code']) == '670']
print("  F1040.26 =", f['value'], "sources", f['sources'])
print("  IRS 670 (as_of", snap['as_of'] + "):", [(t['date'], t['amount']) for t in irs670], "sum", sum(t['amount'] for t in irs670))
print("  -> DIFF", f['value'] - sum(t['amount'] for t in irs670))
print("  qa-sourced components:", [s for s in f['sources'] if s.startswith('qa-')])
ca = lines['F540NR.72']
ftb = p['tax_agency_records']['ftb_account']
print("  F540NR.72 =", ca['value'], "| ftb_account keys", list(ftb.keys()))
py25 = ftb.get('tax_year_2025_payments')
print("  ftb tax_year_2025_payments:", py25)
if isinstance(py25, list):
    s = sum(x['amount'] if isinstance(x, dict) else x for x in py25)
    print("  -> DIFF", ca['value'] - s)

# --- how often would a 'third-party form' outrank the right answer? issuer of wrong-value docs per ledger
print("\n== issuers of documents the ledger says carry the wrong/duplicated value")
for d in ('D28', 'D09', 'D29', 'D16', 'D52', 'D53'):
    if d in docs: print(' ', d, docs[d]['document_type'], '|', docs[d]['issuer'])
