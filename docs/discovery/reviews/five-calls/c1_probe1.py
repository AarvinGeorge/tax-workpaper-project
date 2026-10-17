import json, sys, re
p = json.load(open(sys.argv[1]))
docs = p['documents']
print("documents:", len(docs))
for v in p['return_versions']:
    du = v.get('documents_used', []); ds = v.get('documents_superseded', [])
    print(f"{v['version']} computed_at={v['computed_at']} used={len(du)} superseded={ds}")
    allids = {d['id'] for d in docs}
    notused = sorted(allids - set(du), key=lambda s:int(s[1:]))
    print("  not in documents_used:", notused)
    # which docs are cited by any line in this version
    cited = set()
    evmap = {e['id']: e['document_id'] for e in p['extracted_values']}
    for ln in v['lines']:
        for s in ln.get('sources', []) or []:
            if isinstance(s, str) and s.startswith('ev-') and s in evmap: cited.add(evmap[s])
            elif isinstance(s, str) and s.startswith('doc:'): cited.add(s.split(':')[1].split('#')[0])
    nocite = sorted(allids - cited, key=lambda s:int(s[1:]))
    print("  docs cited by no line:", len(nocite), nocite)
    print("  in documents_used but no line cites:", sorted(set(du)-cited, key=lambda s:int(s[1:])))
    print("  cited by a line but NOT in documents_used:", sorted(cited-set(du), key=lambda s:int(s[1:])))
# titles of the not-used docs for v3
v3 = p['return_versions'][-1]
for d in docs:
    if d['id'] not in v3['documents_used']:
        print(d['id'], '|', d['title'], '|', d['document_type'], '| received', d['received_at'], '| extraction', d['extraction']['status'], '| corrected', d.get('marked_corrected'))
# D30/D31 relation
for d in docs:
    if d['id'] in ('D30','D31','D09','D10'):
        print(d['id'], d['title'], d['received_at'], d.get('marked_corrected'), d['extraction']['status'], d['extraction'].get('reason'))
