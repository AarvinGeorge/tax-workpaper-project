import json, sys
p = json.load(open(sys.argv[1]))
evdoc = {e['id']: e['document_id'] for e in p['extracted_values']}
v3 = p['return_versions'][-1]
n = sum(1 for ln in v3['lines'] for s in (ln.get('sources') or []) if isinstance(s,str) and s in evdoc)
docs = {evdoc[s] for ln in v3['lines'] for s in (ln.get('sources') or []) if isinstance(s,str) and s in evdoc}
print("v3 ev citations:", n, "| distinct docs cited:", len(docs))
