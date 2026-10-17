"""Second read-only probe. No SSNs printed. Run with python3 -I."""
import json, sys, collections, re

with open(sys.argv[1], encoding="utf-8") as f:
    P = json.load(f)

H = P["household"]
print("entered_by:", H.get("entered_by"))
Q = P["client"]["questionnaire"]
print("qa answered_by:", collections.Counter(q.get("answered_by") for q in Q))
print("qa answered_at:", collections.Counter(str(q.get("answered_at"))[:10] for q in Q))
for q in Q:
    if q["id"] in ("qa-06", "qa-14", "qa-15", "qa-25", "qa-31", "qa-39", "qa-41", "qa-45"):
        print("  ", q["id"], q.get("answered_by"), "|", str(q.get("question"))[:70], "=>", str(q.get("answer"))[:80])

v3 = P["return_versions"][-1]
L = v3["lines"]
def cites(prefix):
    return [l["key"] for l in L if any(str(s).startswith(prefix) for s in (l.get("sources") or []))]
for pre in ("qa-", "msg-", "call-", "py:", "agency:", "household:", "ref:", "timeline:", "doc:", "asset:"):
    ks = cites(pre)
    print(f"v3 lines citing {pre!r}: {len(ks)} e.g. {ks[:8]}")
print("v3 str-valued lines:", [(l["key"], l["value"]) for l in L if isinstance(l["value"], str)])

tl20 = [t for t in P["timeline"] if t["id"] == "tl-20"][0]
d = str(tl20.get("detail"))
print("tl-20 detail (PINs redacted):", re.sub(r"\b\d{5}\b", "#####", d))

D = {d["id"]: d for d in P["documents"]}
print("D72 pages:", [(p["page"], str(p["printed_content"])[:400]) for p in D["D72"]["pages"]])
print("D74 page_count:", D["D74"]["page_count"], "values:", len(D["D74"]["extraction"].get("values", [])))
print("D40 tax_year:", D["D40"]["tax_year"], "D06:", D["D06"]["tax_year"], "D70:", D["D70"]["tax_year"], "D42:", D["D42"]["tax_year"])
print("D03 printed (IP PIN redacted):", re.sub(r"\b\d{6}\b", "######", str(D["D03"]["pages"][0]["printed_content"]))[:300])
ba = H["bank_account_for_refund_or_payment"]
print("bank account: bank=", ba.get("bank"), "type=", ba.get("type"), "acct last4=", str(ba.get("account"))[-4:])
print("firm_identity ero_pin set:", bool(P["firm"]["firm_identity"].get("ero_pin")), "ptins keys:", list(P["firm"]["firm_identity"].get("ptins", {}).keys()))
print("rules sample:", list(P["engine_reference"]["rules"].items())[:3])
print("v3 documents_used count:", len(v3["documents_used"]), "not used:", sorted(set(D) - set(v3["documents_used"])))
# call-01 notes
c = P["client"]["call_notes"][0]
print("call-01 notes:", [str(n)[:90] for n in c["notes"]])
# changes_from_previous shape
print("v3 changes sample:", v3["changes_from_previous"][:3])
print("what_if changed_lines sample:", {a["id"]: len(a.get("changed_lines", [])) for a in P["what_if"]["alternatives"]})
print("ftb_account:", json.dumps(P["tax_agency_records"]["ftb_account"])[:600])
