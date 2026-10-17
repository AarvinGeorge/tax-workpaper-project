"""Read-only probe of the packet for the Fable checklist. SSNs: last 4 only. Run with python3 -I."""
import json, sys, collections

p = sys.argv[1]
with open(p, encoding="utf-8") as f:
    P = json.load(f)

def last4(s):
    s = str(s or "")
    return "…" + s[-4:] if len(s) >= 4 else "(none)"

print("== top keys:", sorted(P.keys()))
H = P.get("household", {})
print("== household keys:", sorted(H.keys()))
print("filing_status:", H.get("filing_status"))
for per in H.get("people", []):
    print(" person", per.get("id"), per.get("role"), per.get("relationship"), "ssn", last4(per.get("ssn")), "ip_pin" , "set" if per.get("ip_pin") else "none", "months", per.get("months_lived_with_you"), "student", per.get("full_time_student"))
print("related_returns:", json.dumps(H.get("related_returns"), indent=None)[:1500])
print("bank_account keys:", list((H.get("bank_account_for_refund_or_payment") or {}).keys()))
print("prior_year_agi_for_esignature present:", "prior_year_agi_for_esignature" in H, type(H.get("prior_year_agi_for_esignature")).__name__)
print("residency:", H.get("residency"))
print("addresses count:", len(H.get("addresses", [])))

F = P.get("firm", {})
print("== firm keys:", sorted(F.keys()))
print("assignment_at_start:", F.get("assignment_at_start"))
print("deadlines:", json.dumps(F.get("deadlines"), indent=None))
print("budget_hours:", F.get("budget_hours"))
print("client_users:", [(c.get("id"), c.get("name"), c.get("role") or c.get("relationship")) for c in F.get("client_users", [])])
S = F.get("starter_standards", {})
print("starter_standards keys:", sorted(S.keys()))
print("verification_types:", S.get("verification_types"))
print("variance_review:", S.get("variance_review"))
print("review_levels:", S.get("review_levels"))
print("rules:", json.dumps(S.get("rules"), indent=None))
print("required_steps:", S.get("required_steps"))
print("staff:", [(s.get("id"), s.get("name"), s.get("role"), s.get("sensitive_data_clearance"), s.get("active_from")) for s in F.get("staff", [])])
print("firm_identity keys:", sorted((F.get("firm_identity") or {}).keys()))

print("== timeline")
for t in P.get("timeline", []):
    print(" ", t.get("id"), t.get("at"), t.get("event"), "actor=", t.get("actor"), "refs=", t.get("refs"), "|", str(t.get("detail"))[:110].replace("\n", " "))

print("== client")
C = P.get("client", {})
print("questionnaire count:", len(C.get("questionnaire", [])))
for m in C.get("messages", []):
    print(" msg", m.get("id"), m.get("sent_at"), m.get("from"), "->", m.get("to"), "|", str(m.get("text"))[:100].replace("\n", " "))
for c in C.get("call_notes", []):
    print(" call", c.get("id"), c.get("date"), c.get("participants"), "notes:", len(c.get("notes", [])))

print("== documents")
D = P.get("documents", [])
print("count:", len(D))
st = collections.Counter((d.get("extraction") or {}).get("status") for d in D)
print("extraction status:", st)
print("not fully extracted:", [(d["id"], (d.get("extraction") or {}).get("status"), str((d.get("extraction") or {}).get("reason"))[:80]) for d in D if (d.get("extraction") or {}).get("status") != "extracted"])
print("marked_corrected:", [d["id"] for d in D if d.get("marked_corrected")])
print("uploaded_by firm:", [d["id"] for d in D if d.get("uploaded_by") == "firm"])
print("received after v3 (2026-06-23T06:05):", [(d["id"], d.get("received_at")) for d in D if str(d.get("received_at")) > "2026-06-23T06:05"])
print("belongs_to counter:", collections.Counter(d.get("belongs_to") for d in D))
print("tax_year counter:", collections.Counter(d.get("tax_year") for d in D))
print("page_count total:", sum(d.get("page_count", 0) for d in D), "max:", max(d.get("page_count", 0) for d in D))

EV = P.get("extracted_values", [])
print("== extracted_values count:", len(EV))
print("value_type:", collections.Counter(e.get("value_type") for e in EV))
print("confidence <0.7:", len([e for e in EV if (e.get("confidence") or 0) < 0.7]), "<0.9:", len([e for e in EV if (e.get("confidence") or 0) < 0.9]))
print("ssn-type values:", [(e["id"], e["document_id"]) for e in EV if e.get("value_type") == "ssn"][:12])
print("account_number-type values:", [(e["id"], e["document_id"]) for e in EV if e.get("value_type") == "account_number"][:12])

print("== return_versions")
for v in P.get("return_versions", []):
    print(" ", v.get("version"), v.get("computed_at"), v.get("trigger"), "lines", len(v.get("lines", [])), "diag", len(v.get("diagnostics", [])), "changes", len(v.get("changes_from_previous", [])), "assets", len(v.get("assets", [])), "docs_used", len(v.get("documents_used", [])), "superseded", v.get("documents_superseded"))
    print("    summary:", v.get("summary"))
    print("    carryovers_out keys:", {k: list(v.get("carryovers_out", {}).get(k, {}).keys()) if isinstance(v.get("carryovers_out", {}).get(k), dict) else v.get("carryovers_out", {}).get(k) for k in (v.get("carryovers_out") or {})})
    print("    diagnostics:", [(d.get("code"), d.get("severity")) for d in v.get("diagnostics", [])])
    print("    tax_effect_rates keys:", list((v.get("tax_effect_rates") or {}).keys()))
v3 = P["return_versions"][-1]
L = v3["lines"]
print("v3 forms:", collections.Counter(l.get("form") for l in L))
print("v3 jurisdictions:", collections.Counter(l.get("jurisdiction") for l in L))
print("v3 lines with note:", len([l for l in L if l.get("note")]), "with inputs:", len([l for l in L if l.get("inputs")]), "with sources:", len([l for l in L if l.get("sources")]))
print("v3 F8949 lines:", len([l for l in L if l.get("form") == "F8949"]))
print("v3 line value types:", collections.Counter(type(l.get("value")).__name__ for l in L))
print("sample line:", json.dumps(L[0])[:400])
print("sample asset:", json.dumps(v3["assets"][0])[:500])
print("sample change:", json.dumps(v3["changes_from_previous"][0])[:300])

W = P.get("what_if", {})
print("== what_if alternatives:", [(a.get("id"), a.get("base_version"), (a.get("federal") or {}).get("total_tax_change"), (a.get("california") or {}).get("total_tax_change")) for a in W.get("alternatives", [])])
print("what_if extension:", json.dumps(W.get("extension"))[:400])

T = P.get("tax_agency_records", {})
print("== tax_agency_records keys:", sorted(T.keys()))
print("transcript snapshots as_of:", [s.get("as_of") for s in T.get("irs_account_transcript_2025", [])])
for s in T.get("irs_account_transcript_2025", []):
    print("   ", s.get("as_of"), [(x.get("date"), x.get("code"), x.get("amount")) for x in s.get("transactions", [])])
print("ftb_account keys:", sorted((T.get("ftb_account") or {}).keys()))
print("notices:", [(n.get("id"), n.get("agency"), n.get("type"), n.get("tax_year"), n.get("dated"), n.get("status"), n.get("response_due"), n.get("document")) for n in T.get("notices", [])])
print("efile:", json.dumps(T.get("efile"), indent=None)[:1500])

PY = P.get("prior_years", {})
print("== prior_years keys:", sorted(PY.keys()))
print("return_2024 keys:", sorted((PY.get("return_2024") or {}).keys()))
print("return_2024 lines:", len((PY.get("return_2024") or {}).get("lines", {})))
print("prior_preparer_workpaper keys:", sorted((PY.get("prior_preparer_workpaper") or {}).keys()))
print("open items:", (PY.get("prior_preparer_workpaper") or {}).get("open_items_left_by_prior_preparer"))
print("asset_records:", [(a.get("asset_id"), a.get("activity"), a.get("disposed")) for a in PY.get("asset_records", [])])
print("basis_records keys:", sorted((PY.get("basis_records") or {}).keys()))
print("basis_records:", json.dumps(PY.get("basis_records"))[:900])
print("carryovers_into_2025:", json.dumps(PY.get("carryovers_into_2025"))[:800])

print("== planning_reference_2026:", json.dumps(P.get("planning_reference_2026"))[:900])
print("== post_filing_rates:", json.dumps(P.get("post_filing_rates"))[:500])
print("== engine_reference keys:", sorted((P.get("engine_reference") or {}).keys()), "rules:", len((P.get("engine_reference") or {}).get("rules", {})), "params:", len((P.get("engine_reference") or {}).get("parameters", {})))
print("== packet:", P.get("packet"))
