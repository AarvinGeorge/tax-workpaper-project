// Family: two sources disagree. What is printed against what was read; a line's wording against its document; a
// client's estimate against a third-party form; a closing-statement fact no line uses.
import { type Check, type Draft, amountsIn, categoryOf, digits, docClaim, fmt, lineClaim, linesCiting, num, pageText, valuesOf } from '../util';

const FAMILY = 'Two sources disagree';
const ID_TYPES = new Set(['ein', 'ssn', 'account_number']);

/** An identifier read from a page that is not what the page prints (high confidence is not proof). */
export const printedVsRead: Check = {
  id: 'CHK-PRINTED-VS-READ',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const v of ix.packet.extracted_values) {
      if (!ID_TYPES.has(v.value_type) || !v.text_as_read) continue;
      const d = ix.docById.get(v.document_id);
      const text = pageText(d, v.page);
      if (!text || text.includes(v.text_as_read)) continue;
      const read = digits(v.text_as_read);
      const printed = [...text.matchAll(/[\dX][\dX -]{6,}[\dX]/g)].map((m) => m[0].trim())
        .filter((t) => digits(t).length === read.length);
      if (printed.some((t) => digits(t) === read)) continue;
      const sameDigits = printed.find((t) => [...digits(t)].sort().join('') === [...read].sort().join(''));
      if (!sameDigits) continue; // only a misread of a printed identifier, not an identifier the page never shows
      const lines = linesCiting(ix, v.id);
      const showAll = v.value_type === 'ein';
      out.push({
        title: `${v.label} misread on ${d!.title}`,
        claims: lines.length ? lines.map((l) => lineClaim(l.key)) : [docClaim(d!.id)],
        evidence: [v.id, `doc:${d!.id}#page${v.page}`],
        trigger: [v.id],
        explanation: `The page prints ${showAll ? sameDigits : `a number ending ${digits(sameDigits).slice(-4)}`}; the pipeline read `
          + `${showAll ? v.text_as_read : `one ending ${read.slice(-4)}`} at confidence ${v.confidence}. The digits are transposed`
          + (lines.length ? `, and ${lines.map((l) => l.key).join(', ')} carr${lines.length === 1 ? 'ies' : 'y'} the wrong number.` : '.'),
      });
    }
    return out;
  },
};

/** A line that names a party and its tax ID, where the cited document prints a different name. */
export const labelVsDocument: Check = {
  id: 'CHK-LABEL-VS-DOCUMENT',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const ein = valuesOf(ix, line).find((v) => v.value_type === 'ein' && line.label.includes(String(v.value)));
      if (!ein) continue;
      const m = line.label.match(/:\s*(.+?),\s*[^,]*$/);
      if (!m) continue;
      const name = m[1].trim();
      const d = ix.docById.get(ein.document_id)!;
      const text = pageText(d) + ' ' + (d.issuer ?? '');
      if (text.toLowerCase().includes(name.toLowerCase())) continue;
      out.push({
        title: `${line.key} names "${name}"; the document says "${d.issuer ?? d.title}"`,
        claims: [lineClaim(line.key)],
        evidence: [...(line.sources || []).filter((s) => ix.valueById.has(s)), `doc:${d.id}`],
        trigger: [`doc:${d.id}`],
        explanation: `The line's party name "${name}" appears nowhere on ${d.title}, which is issued by ${d.issuer ?? 'an unnamed issuer'} under tax ID ${ein.value}. `
          + `The tax ID is right; the name on the form should match the document.`,
      });
    }
    return out;
  },
};

/** A line built from the client's own estimate while a third-party document for the same item gives another figure. */
export const clientValueVsDocument: Check = {
  id: 'CHK-CLIENT-VALUE-VS-DOCUMENT',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const v = num(line.value);
      if (v === null || v === 0) continue;
      const qa = (line.sources || []).map((s) => ix.packet.client.questionnaire.find((q) => q.id === s)).filter((q) => !!q);
      const fromAnswer = qa.find((q) => amountsIn(q!.answer).includes(v));
      if (!fromAnswer) continue;
      const docs = new Set(valuesOf(ix, line).map((x) => x.document_id));
      for (const docId of docs) {
        const d = ix.docById.get(docId)!;
        if (d.uploaded_by === 'firm' || /client_note/.test(d.document_type)) continue;
        const money = (ix.valuesByDoc.get(docId) || []).filter((x) => x.value_type === 'money' && num(x.value) !== null && num(x.value) !== v);
        const pick = money.length === 1 ? money[0] : money.find((x) => /proceeds|amount|value/i.test(x.label));
        if (!pick) continue;
        const docValue = num(pick.value)!;
        const cat = categoryOf(line) ?? 'itemized';
        const r = ix.latest.tax_effect_rates[cat];
        const delta = docValue - v;
        out.push({
          title: `${line.label}: ${fmt(v)} from the client's estimate, ${fmt(docValue)} on the ${d.document_type}`,
          claims: [lineClaim(line.key)],
          evidence: [fromAnswer!.id, pick.id, `doc:${d.id}`],
          trigger: [`doc:${d.id}`],
          explanation: `${line.key} takes ${fmt(v)} from the client's answer ("${fromAnswer!.answer}"). ${d.title} reports `
            + `${pick.label.toLowerCase()} ${fmt(docValue)}. When the third-party form fixes the amount, the return uses it.`,
          plain: `You told us about ${fmt(v)}; the ${d.issuer ?? 'charity'} form says ${fmt(docValue)}. The deduction is limited to the form's figure.`,
          effect: r ? { federal: Math.round(delta * r.federal_per_dollar), california: Math.round(delta * r.california_per_dollar), basis: 'tax_effect_rates' } : undefined,
        });
      }
    }
    return out;
  },
};

/** A closing statement's tax credit (the other party's share of the year's tax) that feeds no line. */
export const prorationCreditUnused: Check = {
  id: 'CHK-PRORATION-CREDIT-UNUSED',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const rates = ix.latest.tax_effect_rates;
    const street = (s: string) => s.match(/\d+ [A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)* (?:Dr|St|Way|Ave|Rd|Blvd|Ln|Ct)\b/)?.[0] ?? null;
    for (const d of ix.packet.documents) {
      if (!d.document_type.startsWith('closing_statement')) continue;
      const addr = street(d.title);
      for (const credit of ix.valuesByDoc.get(d.id) || []) {
        if (!/tax/i.test(credit.label) || !/credit/i.test(credit.label) || num(credit.value) === null) continue;
        if (linesCiting(ix, credit.id).length) continue;
        const amount = num(credit.value)!;
        const line = ix.latest.lines.find((l) => l.form === 'SchA' && /real estate tax/i.test(l.label)
          && valuesOf(ix, l).some((v) => { const t = ix.docById.get(v.document_id)!; return t.document_type.startsWith('property_tax') && !!addr && t.title.includes(addr); }));
        if (!line) continue;
        // Federal effect through the SALT cap: the deduction falls only by the part above the cap.
        const total = ix.latest.lines.find((l) => l.form === 'SchA' && (l.inputs || []).includes(line.key));
        const capped = total && ix.latest.lines.find((l) => l.form === 'SchA' && (l.inputs || []).includes(total.key) && (l.sources || []).some((s) => s.startsWith('ref:param.salt_cap')));
        let fed = 0;
        if (total && capped && rates.itemized) {
          const oldCapped = num(capped.value)!; const oldTotal = num(total.value)!;
          const cap = oldTotal > oldCapped ? oldCapped : Infinity;
          const newCapped = Math.min(oldTotal - amount, cap);
          fed = Math.round((newCapped - oldCapped) * rates.itemized.federal_per_dollar);
        }
        const ca = rates.salt ? Math.round(-amount * rates.salt.california_per_dollar) : 0;
        out.push({
          title: `${line.label} includes the other party's share credited at closing`,
          claims: [lineClaim(line.key)],
          evidence: [credit.id, ...(line.sources || []).filter((s) => ix.valueById.has(s)), `doc:${d.id}`],
          trigger: [`doc:${d.id}`],
          explanation: `${line.key} deducts the full bill (${fmt(num(line.value)!)}). ${d.title} shows a credit of ${fmt(amount)} for the part of the year before the purchase; `
            + `that share is the other party's tax. The value was read (${credit.id}) but feeds no line. Deductible: ${fmt(num(line.value)! - amount)}.`
            + (capped ? ` The total falls below the cap, so the federal deduction drops by the amount above the cap.` : ''),
          effect: { federal: fed, california: ca, basis: 'tax_effect_rates' },
        });
      }
    }
    return out;
  },
};

export const disagreeChecks: Check[] = [printedVsRead, labelVsDocument, clientValueVsDocument, prorationCreditUnused];
