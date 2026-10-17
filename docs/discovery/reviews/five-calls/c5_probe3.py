import json, sys, re, datetime as dt
p = json.load(open(sys.argv[1]))
v3 = p['return_versions'][-1]
lines = {l['key']: l for l in v3['lines']}

print("=== F540NR key lines (CA tax context) ===")
for k in ['F540NR.17','F540NR.19','F540NR.31','F540NR.32','F540NR.35','F540NR.36','F540NR.37','F540NR.38','F540NR.40','F540NR.42','F540NR.61','F540NR.63','F540NR.64','F540NR.74','F540NR.101','F540NR.103','F540NR.125']:
    if k in lines:
        print(k, '|', lines[k]['label'], '|', lines[k]['value'], '| rule', lines[k]['rule'])
print("all F540NR keys:", [l['key'] for l in v3['lines'] if l['key'].startswith('F540NR')])
print("\nSchA.7 (SALT after cap):", lines['SchA.7']['value'], "| F1040.15:", lines['F1040.15']['value'], "| F1040.16:", lines['F1040.16']['value'])

print("\n=== carryovers_out keys in every version (any ISO/basis key?) ===")
for v in p['return_versions']:
    co = v['carryovers_out']
    keys = list(co['federal'].keys()) + ['california.' + k for k in co['california'].keys()]
    print(v['version'], len(keys), [k for k in keys if re.search(r'(?i)iso|amt|basis|option', k)])

print("\n=== dates: ISO 3-month rule and holding period ===")
grant = dt.date(2022,3,1); term = dt.date(2025,5,16); ex = dt.date(2025,7,30); move = dt.date(2025,7,15)
print("exercise - termination days:", (ex-term).days, "(3 months after 05/16 = 08/16; within)")
print("2 yrs from grant:", grant.replace(year=2024), "| 1 yr from exercise:", ex.replace(year=2026), "-> qualifying disposition only if sold after 2026-07-30")
print("exercise after TX residency start:", ex > move, "| employment ended before move:", term < move)

print("\n=== D28 Northlake: any year-end positions / Corvane holdings text? ===")
d28 = next(d for d in p['documents'] if d['id']=='D28')
for pg in d28['pages']:
    if re.search(r'(?i)corvane|position|holding|ISO', pg['printed_content']):
        print(' p', pg['page'], ':', pg['printed_content'][:400])

print("\n=== budget areas ===")
print(p['firm']['budget_hours'])

print("\n=== 2024 return lines mentioning AMT/6251/8801 ===")
r24 = p['prior_years']['return_2024']
for k, v in r24['lines'].items():
    if re.search(r'(?i)6251|8801|amt', k):
        print(k, v, r24['line_labels'].get(k))
print("2024 notes:", r24.get('notes'))

print("\n=== F6251.2i sources vs qa-06: is qa-06 cited anywhere in v3 lines? ===")
print([l['key'] for l in v3['lines'] if 'qa-06' in json.dumps(l.get('sources', []))])
print("any v3 line citing any qa-:", sorted({s for l in v3['lines'] for s in (l.get('sources') or []) if str(s).startswith('qa-')})[:10])
