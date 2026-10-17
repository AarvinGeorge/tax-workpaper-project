import json, sys, re
p = json.load(open(sys.argv[1]))
def red(s):
    return re.sub(r'\b(\d{3})-(\d{2})-(\d{4})\b', r'XXX-XX-\3', str(s))
docs = {d['id']: d for d in p['documents']}
evs = {e['id']: e for e in p['extracted_values']}

for did in ['D12', 'D11', 'D08']:
    d = docs[did]
    print(f"\n=== {did} {d['title']} | type {d['document_type']} | issuer {d['issuer']} | received {d['received_at']} ===")
    for pg in d['pages']:
        print(f"  p{pg['page']}: {red(pg['printed_content'])}")
    print("  extraction:", d['extraction'])

print("\n=== ev-0076..0079 ===")
for i in range(76, 80):
    e = evs[f'ev-{i:04d}']
    print(e['id'], e['document_id'], e['field'], e['label'], e['value'], e['value_type'], 'conf', e['confidence'])

print("\n=== questionnaire mentioning ISO/Corvane/shares/options ===")
for q in p['client']['questionnaire']:
    t = json.dumps(q)
    if re.search(r'(?i)corvane|option|iso\b|shares|exercise', t):
        print(red(json.dumps(q)))
print("\n=== messages/call notes mentioning Corvane/option/ISO ===")
for m in p['client']['messages']:
    if re.search(r'(?i)corvane|option|\biso\b|exercise', json.dumps(m)):
        print(red(json.dumps(m)))
for c in p['client']['call_notes']:
    if re.search(r'(?i)corvane|option|\biso\b|exercise', json.dumps(c)):
        print(red(json.dumps(c)))

print("\n=== residency / addresses ===")
print(json.dumps(p['household'].get('residency'), indent=1))

print("\n=== 'Corvane' hits in documents printed content (doc ids) ===")
hits = set()
for d in p['documents']:
    for pg in d['pages']:
        if 'Corvane' in pg['printed_content'] or 'CORVANE' in pg['printed_content'].upper():
            hits.add(d['id'])
print(sorted(hits))
print("=== v3 lines mentioning Corvane in label/note, and F8949 lots mentioning Corvane/ISO ===")
v3 = p['return_versions'][-1]
for l in v3['lines']:
    t = json.dumps(l)
    if re.search(r'(?i)corvane|\biso\b|3921', t):
        print(l['key'], l.get('label'), l.get('value'), l.get('note'))

print("\n=== F6251.2i across versions + changes_from_previous touching F6251 ===")
for v in p['return_versions']:
    for l in v['lines']:
        if l['key'] in ('F6251.2i', 'F6251.11', 'F540NR.61'):
            print(v['version'], l['key'], l['value'])
    for c in v.get('changes_from_previous', []) or []:
        if 'F6251' in c.get('key', '') or 'F540NR.61' in c.get('key', ''):
            print(v['version'], 'change:', c)

print("\n=== what_if alternatives (ids + descriptions) ===")
for a in p['what_if']['alternatives']:
    print(a['id'], '|', a['description'])

print("\n=== planning_reference_2026 (full) ===")
print(json.dumps(p['planning_reference_2026'], indent=1))

print("\n=== prior_preparer_workpaper ===")
print(json.dumps(p['prior_years']['prior_preparer_workpaper'], indent=1)[:3000])

print("\n=== timeline next_year_engagement_started / quality review ===")
for t in p['timeline']:
    if t['event'] in ('next_year_engagement_started', 'quality_review_selected_return'):
        print(json.dumps(t))

print("\n=== engine rules mentioning AMT or CA ===")
for k, v in p['engine_reference']['rules'].items():
    if re.search(r'(?i)amt|minimum tax|schedule p', k + ' ' + v):
        print(k, ':', v)
print("\n=== engine params with amt ===")
for k, v in p['engine_reference']['parameters'].items():
    if 'amt' in k.lower():
        print(k, ':', v)

print("\n=== firm.starter_standards.rules / required_steps ===")
ss = p['firm']['starter_standards']
print(json.dumps({k: ss[k] for k in ss if k in ('rules', 'required_steps')}, indent=1)[:4000])
