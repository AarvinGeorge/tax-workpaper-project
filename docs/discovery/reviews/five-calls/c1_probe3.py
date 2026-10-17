import json, sys, re
from collections import Counter
p = json.load(open(sys.argv[1]))
docs = {d['id']: d for d in p['documents']}
v3 = p['return_versions'][-1]
evmap = {e['id']: e['document_id'] for e in p['extracted_values']}
cited=set()
for ln in v3['lines']:
    for s in ln.get('sources', []) or []:
        if isinstance(s,str) and s in evmap: cited.add(evmap[s])
uncited = [d for d in docs if d not in cited]
print("18 uncited: id | type | uploaded_by | received | extraction | belongs_to")
for d in uncited:
    x=docs[d]; print(d,'|',x['document_type'],'|',x['uploaded_by'],'|',x['received_at'][:10],'|',x['extraction']['status'],'|',x['belongs_to'],'|',x['title'][:60])
print("\n--- document_type counts across all 74:")
print(Counter(docs[d]['document_type'] for d in docs).most_common())
print("\n--- engine notes mentioning D10 / 'counted once' / duplicate:")
def walk(o, path=''):
    if isinstance(o, dict):
        for k,v in o.items(): yield from walk(v, path+'/'+k)
    elif isinstance(o, list):
        for i,v in enumerate(o): yield from walk(v, path+'/'+str(i))
    elif isinstance(o, str): yield path, o
for pa,s in walk(p):
    if ('counted once' in s.lower() or 'duplicate' in s.lower()) and 'return_versions/2' in pa or ('D10' in s and 'return_versions/2' in pa):
        print(pa, '|', s[:200])
print("\n--- v3 diagnostics:")
for dg in v3['diagnostics']: print(dg['code'], dg['severity'], '|', dg['message'][:120], '|', dg.get('refs'))
print("\n--- timeline filing events:")
for t in p['timeline']:
    if t['event'] in ('client_approved_and_signed_8879','efile_rejected','efile_accepted_federal','efile_accepted_california','document_received','return_computed','quality_review_selected_return','notice_received','next_year_engagement_started'):
        if t['event']=='document_received' and not any(r in ('D71','D72','D73','D31') for r in (t.get('refs') or [])): continue
        print(t['id'], t['at'][:16], t['event'], t.get('refs'), '|', str(t.get('detail'))[:100])
# per page: pages with zero values; of those, which have money-like text
money = re.compile(r'\d{1,3}(,\d{3})+(\.\d{2})?|\d+\.\d{2}')
cnt = Counter((e['document_id'], e['page']) for e in p['extracted_values'])
zero=[]; 
for d in docs.values():
    for pg in d['pages']:
        if cnt[(d['id'], pg['page'])]==0:
            zero.append((d['id'], pg['page'], bool(money.search(pg['printed_content'] or '')), d['extraction']['status']))
print("\n--- pages with zero extracted values:", len(zero))
print("  in not_extracted docs:", sum(1 for z in zero if z[3]=='not_extracted'))
rest=[z for z in zero if z[3]!='not_extracted']
print("  in extracted/partial docs:", len(rest), "of which printed money-like numbers:", sum(1 for z in rest if z[2]))
print("  money-bearing unread pages:", [(z[0],z[1]) for z in rest if z[2]])
