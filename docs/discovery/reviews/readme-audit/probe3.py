import json, sys, collections, re
p = json.load(open(sys.argv[1]))
v3 = [r for r in p['return_versions'] if r['version']=='v3'][0]
L = {l['key']: l for l in v3['lines']}
# F8949 lot units: sum lots per box vs SchD lines
bybox = collections.defaultdict(float)
for k,l in L.items():
    if l['form']=='F8949':
        m = re.match(r'F8949\.([A-H])\.', k)
        if m: bybox[m.group(1)] += l['value']
print("F8949 sum by box:", {b: round(v,2) for b,v in sorted(bybox.items())})
print("SchD lines:", [(k, L[k]['value'], L[k]['label'][:50]) for k in L if L[k]['form']=='SchD'][:16])
print("F8949 non-lot lines:", [(k, L[k]['value'], L[k]['label'][:40]) for k in L if L[k]['form']=='F8949' and not re.match(r'F8949\.[A-H]\.[A-Z]\d+$', k)][:12])
lot = L.get('F8949.B.N1'); print("F8949.B.N1:", lot)
# docs not used by v3
used = set(v3['documents_used']); print("docs not in v3 documents_used:", [d['id'] for d in p['documents'] if d['id'] not in used])
# empty text_as_read
print("empty text_as_read:", [(e['id'], e['document_id'], e['field'], e['value'], e['confidence']) for e in p['extracted_values'] if e['text_as_read']==""])
# notes the engine relies on
print("v3 notes:", [(l['key'], l['note'][:70]) for l in v3['lines'] if l.get('note')])
# rule descriptions for a few cited rules
R = p['engine_reference']['rules']
for r in ['R-SUM','R-SEHI','R-EXTENSION-PAYMENT','R-CA-CAPGAIN','R-CA-DIVIDENDS','R-CA-IRA']: print(r, '->', R.get(r, 'MISSING')[:120])
# parameters sample
P = p['engine_reference']['parameters']
for k in ['salt_cap','salt_cap_phase_start','qbi_threshold','niit_threshold','ss_wage_base','brackets_mfj','ca_resident_days','year_days','prior_year_tax','prior_year_agi','fed_underpayment_rate']: print(k, '=', str(P.get(k))[:120])
# household entered_by, ssn format
print("household entered_by:", p['household'].get('entered_by'), "filing_status:", p['household']['filing_status'])
# timeline refs with versions and agency
print("timeline refs sample:", [(t['id'], t['refs']) for t in p['timeline'] if any(str(r).startswith(('agency','v')) for r in (t.get('refs') or []))])
# firm identity shape (no values beyond keys/shape)
fi = p['firm']['firm_identity']; print("firm_identity ptins keys:", list(fi['ptins'].keys()), "signer:", fi['paid_preparer_signing_returns'])
print("staff:", [(s['id'], s['role'], s['credential'], s['sensitive_data_clearance'], s['active_from']) for s in p['firm']['staff']])
# documents page_count vs pages
print("page_count mismatch:", [(d['id'], d['page_count'], len(d['pages'])) for d in p['documents'] if d['page_count']!=len(d['pages'])])
print("documents uploaded_by firm:", [d['id'] for d in p['documents'] if d['uploaded_by']=='firm'])
print("v1 docs_used - v3:", sorted(set(p['return_versions'][0]['documents_used']) - used), " v3 - v2:", sorted(used - set(p['return_versions'][1]['documents_used'])))
print("Letter 566 items:", p['tax_agency_records']['notices'][1]['items_under_examination'])
