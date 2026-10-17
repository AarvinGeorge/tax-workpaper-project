import json, sys, re, collections
p = json.load(open(sys.argv[1]))
C = collections.Counter
print("== packet ==", p['packet'])
hh = p['household']
print("== household keys ==", list(hh.keys()))
print("people fields:", [list(x.keys()) for x in hh['people']][:1], "n", len(hh['people']))
for x in hh['people']: print("  ", x['id'], x['role'], x['name'], "ssn ...%s" % str(x.get('ssn'))[-4:], "ip_pin" , 'set' if x.get('ip_pin') else x.get('ip_pin'), "months", x.get('months_lived_with_you'), "fts", x.get('full_time_student'), "rel", x.get('relationship'))
print("addresses:", hh['addresses']); print("residency:", hh['residency'])
print("bank:", {k: (str(v)[-4:] if 'number' in k else v) for k,v in hh['bank_account_for_refund_or_payment'].items()})
print("prior_year_agi_for_esignature:", hh['prior_year_agi_for_esignature'])
print("related_returns:", json.dumps(hh['related_returns'], indent=1))
docs = p['documents']
print("\n== documents ==", len(docs))
print("doc keys:", C(tuple(sorted(d.keys())) for d in docs).most_common(3))
print("belongs_to:", C(d['belongs_to'] for d in docs))
print("document_type:", C(d['document_type'] for d in docs))
print("uploaded_by:", C(d['uploaded_by'] for d in docs))
print("tax_year:", C(str(d.get('tax_year')) for d in docs))
print("marked_corrected:", [(d['id'], d.get('marked_corrected')) for d in docs if d.get('marked_corrected')])
print("extraction status:", C(d['extraction']['status'] for d in docs))
print("extraction reasons:", [(d['id'], d['extraction']['status'], d['extraction'].get('reason')) for d in docs if d['extraction']['status']!='extracted'])
print("extraction keys:", C(tuple(sorted(d['extraction'].keys())) for d in docs))
print("issuer sample:", C(type(d['issuer']).__name__ for d in docs), docs[0]['issuer'])
print("received_at range:", min(d['received_at'] for d in docs), max(d['received_at'] for d in docs))
ev = p['extracted_values']
print("\n== extracted_values ==", len(ev))
print("value_type:", C(e['value_type'] for e in ev))
print("text_as_read empty:", sum(1 for e in ev if e['text_as_read']==""))
print("confidence <0.9:", [(e['id'], e['confidence']) for e in ev if e['confidence']<0.9], " min", min(e['confidence'] for e in ev))
print("position keys:", C(tuple(sorted(e['position'].keys())) for e in ev))
print("ev keys:", C(tuple(sorted(e.keys())) for e in ev).most_common(2))
print("extraction.values type:", type(docs[0]["extraction"]["values"]).__name__, "sum:", sum(d["extraction"]["values"] or 0 for d in docs))
print("extraction.values sample:", docs[0]["extraction"]["values"])
cl = p['client']
print("\n== client ==", list(cl.keys()), "qa", len(cl['questionnaire']), "msg", len(cl['messages']), "calls", len(cl['call_notes']))
print("qa keys:", list(cl['questionnaire'][0].keys()), "answered_by:", C(q['answered_by'] for q in cl['questionnaire']))
print("msg keys:", list(cl['messages'][0].keys()), "from/to:", C((m['from'], m['to']) for m in cl['messages']))
print("call keys:", list(cl['call_notes'][0].keys()), cl['call_notes'][0]['participants'])
py = p['prior_years']
print("\n== prior_years ==", list(py.keys()))
r24 = py['return_2024']; print("return_2024 keys:", list(r24.keys()), "lines", len(r24['lines']), "line_sources sample", list(r24['line_sources'].items())[:2], "notes n", len(r24['notes']))
print("K1_1120S:", r24.get('K1_1120S')); print("K1_1065:", r24.get('K1_1065')); print("dependents:", r24.get('dependents'))
print("prior_preparer_workpaper keys:", list(py['prior_preparer_workpaper'].keys()))
print("asset_records n:", len(py['asset_records']), "keys:", list(py['asset_records'][0].keys()))
for a in py['asset_records']: print("  ", a['asset_id'], a['activity'], a['cost'], a.get('land_value'), a['method'], a['life_years'], "disposed", a['disposed'], "amt_diff", a['amt_difference'], "src", a['sources'])
print("basis_records:", json.dumps(py['basis_records'])[:900])
print("carryovers_into_2025:", json.dumps(py['carryovers_into_2025']))
ta = p['tax_agency_records']
print("\n== tax_agency_records ==", list(ta.keys()))
for s in ta['irs_account_transcript_2025']: print("  snapshot", s['as_of'], [(t['date'], t['code'], t['amount']) for t in s['transactions']])
print("ftb_account:", json.dumps(ta['ftb_account'])[:800])
print("notices:", [ {k:(str(v)[:120]) for k,v in n.items()} for n in ta['notices']])
print("efile:", [ {k:str(v)[:100] for k,v in e.items()} for e in ta['efile']])
tl = p['timeline']
print("\n== timeline ==", len(tl), "events:", C(t['event'] for t in tl))
print("actors:", C(str(t['actor']) for t in tl))
print("ids not tl-:", [t['id'] for t in tl if not t['id'].startswith('tl-')])
print("refs prefix kinds:", C(re.split(r'[:/-]', r)[0] for t in tl for r in (t.get('refs') or [])))
print("tl-20 detail keys:", [ (t['id'], str(t['detail'])[:200]) for t in tl if t['id'] in ('tl-20','tl-25','tl-26','tl-21')])
v3 = [r for r in p['return_versions'] if r['version']=='v3'][0]
print("\n== v3 lines ==")
print("forms used:", sorted(C(l['form'] for l in v3['lines']).items()))
fc = "F1040, Sch1, Sch2, Sch3, SchA, SchB, SchC, SchD, SchE, SchSE, F8949, F4797, F4562-C, F4562-E, F8582, F6251, F8959, F8960, F8995, F8995A, F8812, F8863, F2441, F8889, F8606, F8283, F7203, F8938, F2210, F8867, SchCA540NR, F540NR, ScheduleS, FTB3885A, FTB5805".split(", ")
used = set(l['form'] for l in v3['lines'])
print("form_codes not used in v3:", [f for f in fc if f not in used], "used not in form_codes:", [f for f in used if f not in fc])
print("value types:", C(type(l['value']).__name__ for l in v3['lines']))
print("text/ratio lines:", [(l['key'], l['value']) for l in v3['lines'] if not isinstance(l['value'], (int,float)) or (isinstance(l['value'], float) and 0 < abs(l['value']) < 1)][:25])
print("rules used:", len(set(l['rule'] for l in v3['lines'] if l['rule'])), "null rule:", sum(1 for l in v3['lines'] if not l['rule']))
rules_in_lines = set(l['rule'] for l in v3['lines'] if l['rule'])
print("rules in engine_reference not used by any v3 line:", sorted(set(p['engine_reference']['rules']) - rules_in_lines)[:40])
print("rules used not in engine_reference:", sorted(rules_in_lines - set(p['engine_reference']['rules'])))
src = C()
for l in v3['lines']:
    for s in (l['sources'] or []):
        m = re.match(r'^(ev-|D\d|qa-|msg-|call-|py:|agency:|asset:|household:|ref:param\.|ref:fx\.|timeline:|doc:)', s)
        src[m.group(1) if m else s[:12]] += 1
print("source prefixes:", src)
print("doc:#page refs anywhere:", [s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('doc:')])
print("lines with note:", sum(1 for l in v3['lines'] if l.get('note')), "with no sources:", sum(1 for l in v3['lines'] if not l['sources']), "with inputs:", sum(1 for l in v3['lines'] if l['inputs']))
print("inputs that aren't line keys in same version:", [ (l['key'], i) for l in v3['lines'] for i in (l['inputs'] or []) if i not in set(x['key'] for x in v3['lines'])][:10])
print("ref:param names cited:", sorted(set(s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('ref:'))))
print("household: cited:", sorted(set(s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('household:'))))
print("agency: cited:", sorted(set(s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('agency:'))))
print("py: cited:", sorted(set(s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('py:'))))
print("timeline: cited:", sorted(set(s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('timeline:'))))
print("asset: cited:", sorted(set(s for l in v3['lines'] for s in (l['sources'] or []) if s.startswith('asset:'))))
print("F8949 lots sample:", [(l['key'], l['value']) for l in v3['lines'] if l['form']=='F8949'][:4])
print("SchCA540NR sample:", [(l['key'], l['value']) for l in v3['lines'] if l['form']=='SchCA540NR'][:6])
print("diagnostics refs:", [(d['code'], d['refs']) for d in v3['diagnostics']])
print("assets v3:", [(a['asset_id'], a['disposed'], a['federal'], a['california'], a['amt'], a['sources']) for a in v3['assets']][:9])
print("changes kinds:", C(c['change'] for c in v3['changes_from_previous']))
# does any source reference the diagnostics / what_if / prior asset
print("D06 line_sources count:", len(r24['line_sources']))
print("\n== all ref kinds across packet (regex scan of strings) ==")
allrefs = C()
def walk(o):
    if isinstance(o, str):
        m = re.match(r'^(ev-\d|D\d\d|qa-\d|msg-\d|call-\d|py:/|agency:/|asset:|household:|ref:param\.|ref:fx\.|timeline:|doc:D\d\d#page)', o)
        if m: allrefs[m.group(1)] += 1
    elif isinstance(o, dict):
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
walk({k:v for k,v in p.items() if k!='readme'})
print(allrefs)
docrefs=[]
def walk2(o, path):
    if isinstance(o, str) and o.startswith('doc:'): docrefs.append((path, o))
    elif isinstance(o, dict):
        for k,v in o.items(): walk2(v, path+'/'+k)
    elif isinstance(o, list):
        for i,v in enumerate(o): walk2(v, path+'/'+str(i))
walk2({k:v for k,v in p.items() if k!='readme'}, '')
print("doc: refs:", docrefs[:20])
