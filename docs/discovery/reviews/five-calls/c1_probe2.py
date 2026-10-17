import json, sys
p = json.load(open(sys.argv[1]))
ss = p['firm']['starter_standards']
print(json.dumps(ss, indent=1))
print("--- review_levels/roles in staff:")
for s in p['firm']['staff']:
    print(s['id'], s['name'], s['role'], 'clearance=', s.get('sensitive_data_clearance'))
# search the whole packet for 'block'
def walk(o, path=''):
    if isinstance(o, dict):
        for k,v in o.items(): yield from walk(v, path+'/'+k)
    elif isinstance(o, list):
        for i,v in enumerate(o): yield from walk(v, path+'/'+str(i))
    elif isinstance(o, str): yield path, o
hits = [(pa, s[:160]) for pa,s in walk(p) if 'block' in s.lower()]
print("--- 'block' hits:", len(hits))
for h in hits[:20]: print(h)
hits2 = [(pa, s[:160]) for pa,s in walk(p) if 'accounted for' in s.lower() or 'all documents' in s.lower()]
print("--- 'accounted for / all documents' hits:", len(hits2))
for h in hits2: print(h)
hits3 = [(pa, s[:200]) for pa,s in walk(p) if 'required' in s.lower()][:15]
print("--- 'required' hits (first 15):")
for h in hits3: print(h)
