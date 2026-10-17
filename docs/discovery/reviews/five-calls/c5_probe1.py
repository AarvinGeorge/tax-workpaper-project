import json, sys, re
p = json.load(open(sys.argv[1]))

def red(s):
    s = str(s)
    return re.sub(r'\b(\d{3})-(\d{2})-(\d{4})\b', r'XXX-XX-\3', s)

print("=== top-level keys ===", list(p.keys()))
rv = p['return_versions']
print("versions:", [(v['version'], v['computed_at']) for v in rv])
v3 = rv[-1]

print("\n=== carryovers_out v3 (full) ===")
print(json.dumps(v3.get('carryovers_out'), indent=1))
print("\n=== carryovers_into_2025 (full) ===")
print(json.dumps(p['prior_years'].get('carryovers_into_2025'), indent=1))

print("\n=== basis_records keys ===")
print(json.dumps(p['prior_years'].get('basis_records'), indent=1)[:3000])

print("\n=== every v3 line with 'F6251' ===")
for l in v3['lines']:
    if l['key'].startswith('F6251'):
        print(l['key'], '|', l.get('label'), '|', l.get('value'), '| rule', l.get('rule'), '| inputs', l.get('inputs'), '| sources', l.get('sources'), '| note', l.get('note'))

print("\n=== F540NR.61 and CA AMT-ish lines ===")
for l in v3['lines']:
    if l['key'] in ('F540NR.61',) or 'AMT' in str(l.get('label','')).upper() or 'alternative minimum' in str(l.get('label','')).lower():
        print(l['key'], '|', l.get('label'), '|', l.get('value'), '| rule', l.get('rule'), '| note', l.get('note'))

print("\n=== diagnostics v3 ===")
for d in v3.get('diagnostics', []):
    print(d)

print("\n=== global text search: iso / 3921 / amt basis / incentive ===")
s = json.dumps(p)
for pat in [r'(?i)incentive stock', r'(?i)\biso\b', r'3921', r'(?i)amt[_ ]basis', r'(?i)amt basis', r'(?i)dual basis', r'(?i)minimum_tax_credit', r'(?i)minimum tax credit', r'CA_AMT', r'(?i)schedule p\b', r'(?i)disqualifying']:
    hits = [m.start() for m in re.finditer(pat, s)]
    print(f"{pat!r}: {len(hits)} hits")
    for h in hits[:6]:
        print("   ...", red(s[max(0,h-120):h+160]).replace('\n',' '))
