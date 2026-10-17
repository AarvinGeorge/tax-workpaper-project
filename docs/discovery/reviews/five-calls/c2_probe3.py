import json, sys, re
p = json.load(open(sys.argv[1]))
def mask(s): return re.sub(r'(\d{3})-(\d{2})-(\d{4})', r'XXX-XX-\3', str(s))
r24 = p['prior_years']['return_2024']
print("return_2024.dependents:", mask(json.dumps(r24.get('dependents'))))
print("line_sources with dep2:", {k: v for k, v in r24.get('line_sources', {}).items() if 'dep' in k.lower()})
d06 = [d for d in p['documents'] if d['id']=='D06'][0]
pc = d06['pages'][0]['printed_content']
i = pc.find('Theo'); print("D06 p1 printed near Theo:", mask(pc[max(0,i-60):i+80]))
# timing: D71 received vs efile rejected
d71 = [d for d in p['documents'] if d['id']=='D71'][0]
print("D71 received_at", d71['received_at'], "| efile rejected", p['tax_agency_records']['efile'][0]['date'])
print("timeline mentions D71:", [(t['id'], t['at'], t['event']) for t in p['timeline'] if 'D71' in json.dumps(t)])
