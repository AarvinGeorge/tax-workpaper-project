import json, sys, re
p = json.load(open(sys.argv[1]))

def mask(s):
    return re.sub(r'(\d{3})-(\d{2})-(\d{4})', r'XXX-XX-\3', str(s))

print("== firm.starter_standards keys:", list(p['firm']['starter_standards'].keys()))
ss = p['firm']['starter_standards']
print("verification_types:", json.dumps(ss.get('verification_types'), indent=1))
print("rules:", json.dumps(ss.get('rules'), indent=1))
print("required_steps:", json.dumps(ss.get('required_steps'), indent=1))
print("review_levels:", json.dumps(ss.get('review_levels'), indent=1))
print("variance_review:", json.dumps(ss.get('variance_review'), indent=1))

# any 'reliability'/'source_kind'/'trust' keys anywhere in packet?
hits = {}
def walk(o, path):
    if isinstance(o, dict):
        for k, v in o.items():
            kl = k.lower()
            if any(t in kl for t in ('reliab', 'trust', 'source_kind', 'source_type', 'hierarchy', 'rank', 'authority')):
                hits.setdefault(k, []).append(path + '/' + k)
            walk(v, path + '/' + k)
    elif isinstance(o, list):
        for i, v in enumerate(o[:400]):
            walk(v, path + f'/{i}')
walk(p, '')
print("== keys containing reliab/trust/source_kind/source_type/hierarchy/rank/authority:", {k: v[:3] for k, v in hits.items()})
# control: key containing 'confidence'
c = sum(1 for e in p['extracted_values'] if 'confidence' in e)
print("control: extracted_values with 'confidence' key:", c, "of", len(p['extracted_values']))

# README mention of confidence / reliability
rd = json.dumps(p['readme'])
for term in ('confidence', 'reliab', 'trust', 'rank'):
    print(f"readme mentions '{term}':", len(re.findall(term, rd, re.I)))

# Theo SSN sources
theo = [h for h in p['household']['people'] if 'theo' in h['id'].lower() or 'Theo' in h.get('name','')][0]
print("== household theo:", theo['id'], mask(theo['ssn']), "keys:", list(theo.keys()))
ssn_vals = [e for e in p['extracted_values'] if e['value_type'] == 'ssn']
print("extracted ssn values:", [(e['id'], e['document_id'], e['page'], e['field'], mask(e['value']), e['confidence']) for e in ssn_vals])
v3 = p['return_versions'][2]
for ln in v3['lines']:
    if ln['key'] in ('F8812.4', 'F1040.26', 'F2210.19', 'F8812.12') or (ln.get('sources') and any('theo' in str(s) for s in ln['sources'])):
        print("line", ln['key'], ln['form'], ln['line'], "value", ln['value'], "rule", ln.get('rule'), "sources", ln.get('sources'), "inputs", ln.get('inputs'), "note", mask(str(ln.get('note',''))[:300]))
# who else uses household: sources
hh = [(ln['key'], ln['sources']) for ln in v3['lines'] if ln.get('sources') and any(str(s).startswith('household:') for s in ln['sources'])]
print("v3 lines citing household:", hh)
qa = [(ln['key'], ln['sources']) for ln in v3['lines'] if ln.get('sources') and any(str(s).startswith('qa-') for s in ln['sources'])]
print("v3 lines citing qa-:", qa)
ag = [(ln['key'], ln['sources']) for ln in v3['lines'] if ln.get('sources') and any(str(s).startswith('agency:') for s in ln['sources'])]
print("v3 lines citing agency:", ag)
# docs D06 D69 D71 in documents_used of each version
for v in p['return_versions']:
    print(v['version'], v['computed_at'], 'D06' in v['documents_used'], 'D69' in v['documents_used'], 'D71' in v['documents_used'], 'D67' in v['documents_used'])
for d in p['documents']:
    if d['id'] in ('D06', 'D67', 'D69', 'D71'):
        print(d['id'], d['title'], d['document_type'], d['issuer'], d['uploaded_by'], d['received_at'], d['extraction']['status'], d['extraction'].get('reason'))
# IRS transcript 670 lines
for snap in p['tax_agency_records']['irs_account_transcript_2025']:
    print("transcript as_of", snap['as_of'], [(t['date'], t['code'], t['amount']) for t in snap['transactions'] if t['code'] == '670' or t['code'] == 670])
print("qa-41:", [q for q in p['client']['questionnaire'] if q['id'] == 'qa-41'])
print("efile:", [(e['date'], e['jurisdiction'], e['status'], e.get('errors')) for e in p['tax_agency_records']['efile']][:3])
