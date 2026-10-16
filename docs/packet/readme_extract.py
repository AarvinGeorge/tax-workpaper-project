import json,sys,hashlib
pk,outdir=sys.argv[1],sys.argv[2]
p=json.load(open(pk,encoding='utf-8'))
r=p['readme']
canon=json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
h=hashlib.sha256(canon).hexdigest()
open(f'{outdir}/readme.json','w',encoding='utf-8').write(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
def walk(v,depth):
    out=[]
    if isinstance(v,dict):
        for k,x in v.items():
            if isinstance(x,(dict,list)):
                out.append(f"{'#'*min(depth,6)} `{k}`\n"); out+=walk(x,depth+1)
            else: out.append(f"- **`{k}`**: {x}\n")
    elif isinstance(v,list):
        for x in v:
            if isinstance(x,(dict,list)): out.append('- item:\n'); out+=['  '+l for l in walk(x,depth+1)]
            else: out.append(f'- {x}\n')
    else: out.append(f'{v}\n')
    return out
md=[f"# Packet README (verbatim)\n\nExtracted by script `docs/packet/readme_extract.py` (run: `python3 -I docs/packet/readme_extract.py <packet> docs/packet`) from the packet's `readme` key. Text is copied exactly; only Markdown structure (headings, bullets) is added. Machine copy: `readme.json` (same folder).\n\n> **Viewing note:** 9 placeholders such as `<form>.<line>` contain angle brackets, which some Markdown viewers hide as HTML. The raw text of this file and `readme.json` are exact (verified by Fable 5.1, `reviews/readme-verify.md`); read those if a rendered view looks incomplete.\n\n- Packet file: `case-study-project-package/okafor_lindqvist_2025_packet (1).json`\n- SHA-256 of the canonical `readme` object (sorted keys, compact): `{h}`\n- Top-level keys ({len(r)}): {', '.join('`'+k+'`' for k in r)}\n\n"]
for k,x in r.items():
    md.append(f"## `{k}`\n\n")
    md+=walk(x,3) if isinstance(x,(dict,list)) else [f"{x}\n"]
    md.append('\n')
open(f'{outdir}/readme-verbatim.md','w',encoding='utf-8').write(''.join(md))
# self-check: reload readme.json equals source
assert json.load(open(f'{outdir}/readme.json',encoding='utf-8'))==r
strings=[]
def S(v):
    if isinstance(v,dict): [S(x) for x in v.values()]+[strings.append(k) for k in v]
    elif isinstance(v,list): [S(x) for x in v]
    else: strings.append(str(v))
S(r); mdtxt=''.join(md); miss=[s for s in strings if s not in mdtxt]
print('sha256',h); print('strings',len(strings),'missing from md',len(miss),miss[:5]); print('chars',len(canon))
