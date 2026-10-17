import json, sys
p = json.load(open(sys.argv[1]))
evdoc = {e['id']: e['document_id'] for e in p['extracted_values']}
# D06: cited by prior_years.return_2024.line_sources?
ls = p['prior_years']['return_2024'].get('line_sources', {})
d = set()
for k,v in ls.items():
    for s in (v if isinstance(v,list) else [v]):
        if s in evdoc: d.add(evdoc[s])
print("prior_years.return_2024.line_sources cite docs:", d, "count lines:", len(ls))
# D69: referenced anywhere in tax_agency_records / timeline?
def walk(o, path=''):
    if isinstance(o, dict):
        for k,v in o.items(): yield from walk(v, path+'/'+k)
    elif isinstance(o, list):
        for i,v in enumerate(o): yield from walk(v, path+'/'+str(i))
    elif isinstance(o, str): yield path, o
for want in ['D69','D70','D07','D72','D13','D15','D47','D54','D73','D71']:
    hits=[pa for pa,s in walk(p) if s==want and not pa.startswith('/documents/') and 'documents_used' not in pa]
    print(want, 'referenced at:', hits[:6])
# values of D15/D47/D54/D73 used by any line of any version?
used=set()
for v in p['return_versions']:
    for ln in v['lines']:
        for s in ln.get('sources') or []:
            if isinstance(s,str) and s in evdoc: used.add(s)
for want in ['D15','D47','D54','D73','D13','D06']:
    n=sum(1 for e in p['extracted_values'] if e['document_id']==want)
    u=sum(1 for e in p['extracted_values'] if e['document_id']==want and e['id'] in used)
    print(want, 'values', n, 'used by any version line', u)
