// Same fact, every source. One fact (an interest payment, a box on a form, an estimated payment, a lot's basis, a
// person's number) often has several copies in a packet: two forms, a form and a statement, the return and the agency
// record, a broker and a plan administrator. Five rules compare the copies. A disagreement becomes an ordinary check
// (family "Two sources disagree", a safety net that yields to a specific check on the same claim); an agreement with a
// copy the line does not itself rest on is an independent receipt (proofs.ts). Read from the packet's schema only:
// document_type, issuer, belongs_to, tax_year, field names, return-line sources, agency records. No ids named here.
import type { PacketIndex } from './packet/load';
import type { ExtractedValue, PacketDocument, ReturnLine } from './packet/types';
import type { Finding } from './contracts';
import { BOX_MAP, boxAgrees, type BoxEntry } from './forms/box-map';
import {
  caGainRate, categoryOf, digits, docClaim, fmt, isSumRule, isoDay, lineClaim, lotField, lotOf, num, oneToOne, pageText,
  rateEffect, round, taxYear, valuesOf,
} from './checks/util';

export type SameFactRule = 'added-twice' | 'box-to-line' | 'payments' | 'lot' | 'identifier';

/** One copy of the fact: what it is, its value as shown (identifiers last 4 only), and its packet reference. */
export interface Copy { what: string; shown: string; ref?: string }

export interface Comparison {
  rule: SameFactRule;
  agree: boolean;
  /** The claims a disagreement sits on: the same strings the specific checks use, so yielding works. */
  claims: string[];
  copies: Copy[];
  title: string;
  explanation: string;
  /** Agreement wording, only when a copy the line does not itself rest on agrees (an independent receipt). */
  receipt?: string;
  trigger?: string[];
  effect?: Finding['effect'];
  stopsEfile?: boolean;
}

const near = (a: number, b: number, tol = 1) => Math.abs(a - b) < tol;
const NUMERIC = new Set(['money', 'quantity', 'integer']);

/** Issuer name without punctuation and corporate suffixes, for matching one issuer across documents. */
const normIssuer = (s: string | null) => (s ?? '').toLowerCase().replace(/[.,&()]/g, ' ')
  .replace(/\b(inc|llc|llp|lp|n a|co|corp|ltd|ab|the)\b/g, ' ').replace(/\s+/g, ' ').trim();

/** The document schema key: two documents with the same key are copies of one form (an original and its correction). */
const formKey = (d: PacketDocument) => [d.document_type, normIssuer(d.issuer), d.belongs_to, d.tax_year].join('|');

const docOf = (ix: PacketIndex, v: ExtractedValue) => ix.docById.get(v.document_id)!;
const boxName = (field: string) => field.replace(/^box/, 'box ').replace(/_/g, ' ');

/** Account or loan numbers printed on a value's page, last 4 only. */
function accountsOn(ix: PacketIndex, v: ExtractedValue): Set<string> {
  const t = pageText(docOf(ix, v), v.page);
  return new Set([...t.matchAll(/\b(?:account|acct|loan)\b[^.;]*?(?:ending|no\.|number|#)\s*(?:in\s+)?[X*-]*(\d{4})\b/gi)].map((m) => m[1]));
}

/** Every value read from one page, as a signature; two pages with the same signature are one sheet scanned twice. */
function pageSig(ix: PacketIndex, docId: string, page: number): string | null {
  const vs = (ix.valuesByDoc.get(docId) || []).filter((v) => v.page === page);
  return vs.length < 3 ? null : vs.map((v) => `${v.field}=${JSON.stringify(v.value)}`).sort().join('|');
}

// ---- Rule 1: added twice, not corroborated ------------------------------------------------------------------------
// A line (or a total of lines) adds what it cites; two of the added amounts are copies of one fact. Account or loan
// identity first, then the document schema key, then a statement whose page says it is reported on the other form.

type Part = { v: ExtractedValue; line: ReturnLine };

function oneFact(ix: PacketIndex, a: ExtractedValue, b: ExtractedValue): { why: string; extra: ExtractedValue } | null {
  const da = docOf(ix, a); const db = docOf(ix, b);
  const same = near(num(a.value)!, num(b.value)!, 0.5);
  if (da.id === db.id) {
    if (a.page === b.page || !same) return null;
    const sa = pageSig(ix, da.id, a.page);
    return sa && sa === pageSig(ix, db.id, b.page) ? { why: `page ${b.page} of ${db.title} repeats page ${a.page} value for value`, extra: b } : null;
  }
  if (same && da.belongs_to === db.belongs_to) {
    const acct = [...accountsOn(ix, a)].find((x) => accountsOn(ix, b).has(x));
    if (acct) return { why: `${da.title} and ${db.title} print the same account (ending ${acct})`, extra: b };
  }
  if (same && a.field === b.field && formKey(da) === formKey(db)) return { why: `${db.title} is a second copy of ${da.title}`, extra: b };
  if (da.issuer && normIssuer(da.issuer) === normIssuer(db.issuer) && da.document_type !== db.document_type) {
    const says = (s: PacketDocument, f: PacketDocument) => new RegExp(`reported on (?:the )?(?:\\d{4} )?Form ${f.document_type.replace(/[-]/g, '\\-')}\\b`, 'i').test(pageText(s));
    if (says(db, da)) return { why: `${db.title} says its amount is reported on the Form ${da.document_type}`, extra: b };
    if (says(da, db)) return { why: `${da.title} says its amount is reported on the Form ${db.document_type}`, extra: a };
  }
  return null;
}

function addedTwice(ix: PacketIndex): Comparison[] {
  // A line's parts only when its value is the sum of what it cites (a line that cites more than it adds is not judged).
  const parts = (l: ReturnLine): Part[] => {
    const v = num(l.value);
    const vs = valuesOf(ix, l).filter((x) => NUMERIC.has(x.value_type) && num(x.value) !== null);
    if (v === null || !vs.length || !near(vs.reduce((s, x) => s + num(x.value)!, 0), v)) return [];
    return vs.map((x) => ({ v: x, line: l }));
  };
  const contexts: Part[][] = [];
  for (const l of ix.latest.lines) {
    const own = parts(l);
    if (own.length > 1) contexts.push(own);
    if ((l.inputs || []).length > 1 && isSumRule(ix, l)) {
      const ps = l.inputs.flatMap((k) => { const il = ix.line(ix.latest.version, k); return il ? parts(il) : []; });
      if (new Set(ps.map((p) => p.line.key)).size > 1) contexts.push(ps);
    }
  }
  const out: Comparison[] = [];
  const seen = new Set<string>();
  for (const ps of contexts) {
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i]; const b = ps[j];
        if (a.v.id === b.v.id) continue;
        const hit = oneFact(ix, a.v, b.v);
        if (!hit) continue;
        const extra = hit.extra === a.v ? a : b;
        // The extra copy once per line (a statement inside a form pairs with each of the form's amounts).
        if (seen.has(`${extra.v.id}|${extra.line.key}`)) continue;
        seen.add(`${extra.v.id}|${extra.line.key}`);
        const amount = num(extra.v.value)!;
        const cat = extra.v.value_type === 'money' ? categoryOf(extra.line) : null;
        const copy = (p: Part): Copy => ({ what: `${p.v.label} on ${docOf(ix, p.v).title} (${p.line.key})`, shown: fmt(num(p.v.value)!), ref: p.v.id });
        out.push({
          rule: 'added-twice', agree: false, claims: [lineClaim(extra.line.key)], copies: [copy(a), copy(b)],
          title: `${extra.line.label} adds one fact twice`,
          explanation: `${a.line.key === b.line.key ? a.line.key : `${a.line.key} and ${b.line.key}`} add ${fmt(num(a.v.value)!)} and ${fmt(num(b.v.value)!)}, `
            + `but they are one fact: ${hit.why}. Counted once, ${extra.line.key} falls by ${fmt(amount)}.`,
          effect: cat ? rateEffect(ix, cat, -amount) : undefined,
        });
      }
    }
  }
  return out;
}

// ---- Rule 2: information-return tie-out -----------------------------------------------------------------------------
// Per issuer, person and year, a box must reach its return line (forms/box-map.ts). A corrected form supersedes its
// original: of the copies of one form, the one the return cites counts, else the corrected one, else the latest.

function boxToLine(ix: PacketIndex): Comparison[] {
  const y = taxYear(ix);
  const cited = new Set(ix.latest.lines.flatMap((l) => valuesOf(ix, l).map((v) => v.document_id)));
  const superseded = new Set(ix.latest.documents_superseded);
  const fx = (ix.packet.engine_reference.parameters.fx ?? {}) as Record<string, Record<string, number>>;
  const forms = (type: string): PacketDocument[] => {
    const groups = new Map<string, PacketDocument[]>();
    for (const d of ix.packet.documents) if (d.document_type === type && d.tax_year === y) groups.set(formKey(d), [...(groups.get(formKey(d)) ?? []), d]);
    return [...groups.values()].map((ds) => ds.find((d) => cited.has(d.id)) ?? ds.find((d) => d.marked_corrected === true)
      ?? [...ds].filter((d) => !superseded.has(d.id)).sort((a, b) => b.received_at.localeCompare(a.received_at))[0] ?? ds[0]);
  };
  const field = (d: PacketDocument, box: string | RegExp) => (ix.valuesByDoc.get(d.id) || [])
    .find((v) => (typeof box === 'string' ? v.field === box : box.test(v.field)) && num(v.value) !== null);
  type Box = { d: PacketDocument; e: BoxEntry; v: ExtractedValue; minus?: ExtractedValue };

  const tie = (line: ReturnLine, mode: BoxEntry['mode'], expected: number, boxes: Box[], fixed: boolean, how: string): Comparison => {
    const lv = num(line.value)!;
    const agree = boxAgrees(mode, expected, lv);
    const refs = boxes.flatMap((b) => [b.v.id, ...(b.minus ? [b.minus.id] : [])]);
    // Independent means a copy the line does not itself cite; agreeing with its own boxes is agreed_to_source_document.
    const independent = refs.some((r) => !(line.sources || []).includes(r));
    const cat = categoryOf(line);
    const words = mode === 'at_least' ? 'The line must be at least the forms added.' : mode === 'at_most' ? 'The line may not exceed the form.' : 'The line must equal them.';
    return {
      rule: 'box-to-line', agree, claims: [lineClaim(line.key)],
      copies: [{ what: `${line.key} ${line.label}`, shown: fmt(lv) },
        ...boxes.flatMap((b) => [{ what: `${b.e.form} ${boxName(b.v.field)} on ${b.d.title}`, shown: fmt(num(b.v.value)!), ref: b.v.id },
          ...(b.minus ? [{ what: `${b.e.form} ${boxName(b.minus.field)} on ${b.d.title}`, shown: fmt(num(b.minus.value)!), ref: b.minus.id }] : [])])],
      title: `${line.label}: ${fmt(lv)} on the return, ${fmt(expected)} from ${how}`,
      explanation: `${line.key} is ${fmt(lv)}; ${how}: ${fmt(expected)}. ${words}`,
      // Only an exact match is a receipt: "at least the forms" also holds when money is counted twice.
      receipt: agree && independent && (mode !== 'at_least' && mode !== 'at_most' || Math.abs(expected - lv) < 1) ? `${how}: ${fmt(expected)}` : undefined,
      effect: !agree && cat ? rateEffect(ix, cat, expected - lv) : undefined,
    };
  };

  const out: Comparison[] = [];
  // Fixed targets: every entry naming the same line and mode adds together (1099-NEC and 1099-K into gross receipts).
  const fixed = new Map<string, BoxEntry[]>();
  for (const e of BOX_MAP) if (typeof e.line === 'string') fixed.set(`${e.line}|${e.mode}`, [...(fixed.get(`${e.line}|${e.mode}`) ?? []), e]);
  for (const entries of fixed.values()) {
    const line = ix.line(ix.latest.version, entries[0].line as string);
    if (!line || num(line.value) === null) continue;
    const boxes: Box[] = entries.flatMap((e) => forms(e.form).map((d) => ({ d, e, v: field(d, e.box)!, minus: e.minus ? field(d, e.minus) : undefined })))
      .filter((b) => !!b.v);
    if (!boxes.length) continue;
    const expected = boxes.reduce((s, b) => s + num(b.v.value)! - (b.minus ? num(b.minus.value)! : 0), 0);
    const kinds = [...new Set(boxes.map((b) => `${b.e.form} ${boxName(b.v.field)}${b.minus ? ` less ${boxName(b.minus.field)}` : ''}`))];
    out.push(tie(line, entries[0].mode, expected, boxes, true, `every ${y} Form ${kinds.join(' and Form ')} added (${boxes.length} form${boxes.length === 1 ? '' : 's'})`));
  }
  // Per-document targets: the line on the form that cites the document (the one citing the box, when several do).
  for (const e of BOX_MAP) {
    if (typeof e.line === 'string') continue;
    const form = e.line.form;
    for (const d of forms(e.form)) {
      const v = field(d, e.box);
      if (!v) continue;
      const citing = ix.latest.lines.filter((l) => l.form === form && num(l.value) !== null && valuesOf(ix, l).some((x) => x.document_id === d.id));
      const line = citing.find((l) => (l.sources || []).includes(v.id)) ?? (citing.length === 1 ? citing[0] : undefined);
      if (!line) continue;
      let expected = num(v.value)!;
      let how = `${boxName(v.field)} on ${d.title}`;
      if (e.mode === 'converted') {
        const cur = (e.box as RegExp).exec(v.field)?.[1]?.toUpperCase();
        const rate = cur ? fx[cur]?.[`${y}_average`] : undefined;
        if (!rate) continue;
        how = `${cur} ${fmt(expected)} on ${d.title} at the ${y} average rate (${rate})`;
        expected = round(expected / rate);
      }
      out.push(tie(line, e.mode, expected, [{ d, e, v }], false, how));
    }
  }
  return out;
}

// ---- Rule 3: payments three ways --------------------------------------------------------------------------------------
// A payment line, the payment confirmations it cites (designated for the tax year) and the agency's record for the
// tax year are three copies of one fact. A payment designated for another year is not this year's fact.

interface AgencyPay { date: string; amount: number; ref: string }

function agencyPayments(ix: PacketIndex, jurisdiction: string, kind: 'estimate' | 'extension'): { who: string; pays: AgencyPay[] } | null {
  const y = taxYear(ix);
  const recs = ix.packet.tax_agency_records as Record<string, unknown>;
  if (jurisdiction === 'california') {
    const ftb = recs.ftb_account as Record<string, unknown> | undefined;
    const key = `tax_year_${y}_payments`;
    const list = ftb?.[key] as { date: string; amount: unknown }[] | undefined;
    if (kind !== 'estimate' || !Array.isArray(list)) return null;
    return { who: 'the FTB account', pays: list.filter((p) => num(p.amount) !== null).map((p, i) => ({ date: p.date, amount: num(p.amount)!, ref: `agency:/ftb_account/${key}/${i}` })) };
  }
  const key = Object.keys(recs).find((k) => k.startsWith('irs_account_transcript'));
  const snaps = key ? (recs[key] as { transactions?: { date: string; code: string; description: string; amount: unknown }[] }[]) : null;
  if (!key || !Array.isArray(snaps)) return null;
  // Later snapshots repeat earlier ones: each payment once, from the first snapshot that shows it.
  const seen = new Set<string>();
  const pays: AgencyPay[] = [];
  snaps.forEach((s, i) => (s.transactions || []).forEach((t, j) => {
    const d = isoDay(t.date);
    const ok = t.code === '670' && num(t.amount) !== null && (kind === 'estimate'
      ? /estimated/i.test(t.description) && d >= `${y}-01-01` && d <= `${y + 1}-01-31`
      : /extension/i.test(t.description) && d.startsWith(String(y + 1)));
    const k = `${d}|${t.amount}|${t.description}`;
    if (!ok || seen.has(k)) return;
    seen.add(k);
    pays.push({ date: d, amount: num(t.amount)!, ref: `agency:/${key}/${i}/transactions/${j}` });
  }));
  return { who: 'the IRS account transcript', pays };
}

function payments(ix: PacketIndex): Comparison[] {
  const y = String(taxYear(ix));
  const out: Comparison[] = [];
  for (const line of ix.latest.lines) {
    const kind = /estimated tax payments/i.test(line.label) ? 'estimate' : /extension/i.test(line.label) && /paid|payment/i.test(line.label) ? 'extension' : null;
    const lv = num(line.value);
    if (!kind || lv === null) continue;
    const agency = agencyPayments(ix, line.jurisdiction, kind);
    if (!agency || (!agency.pays.length && lv === 0)) continue;
    const total = agency.pays.reduce((s, p) => s + p.amount, 0);
    // Confirmations the line cites, designated for the tax year (a payment's own "year" field, when it has one).
    const vals = valuesOf(ix, line);
    const confirmed = vals.filter((v) => docOf(ix, v).document_type === 'payment_confirmation' && /_amount$/.test(v.field) && num(v.value) !== null)
      .filter((v) => { const yr = (ix.valuesByDoc.get(v.document_id) || []).find((x) => x.field === v.field.replace(/_amount$/, '_year')); return !yr || String(yr.value) === y; });
    const conf = confirmed.reduce((s, v) => s + num(v.value)!, 0);
    const agree = near(lv, total);
    const what = kind === 'estimate' ? `estimated payments credited to tax year ${y}` : 'paid with the extension';
    out.push({
      rule: 'payments', agree, claims: [lineClaim(line.key)],
      copies: [{ what: `${line.key} ${line.label}`, shown: fmt(lv) },
        ...agency.pays.map((p) => ({ what: `${agency.who}, ${p.date}`, shown: fmt(p.amount), ref: p.ref })),
        ...confirmed.map((v) => ({ what: `${v.label} on ${docOf(ix, v).title}`, shown: fmt(num(v.value)!), ref: v.id }))],
      title: `${line.label}: ${fmt(lv)} on the return, ${fmt(total)} on ${agency.who}`,
      explanation: `Three copies of one fact: the return says ${fmt(lv)}; ${agency.who} shows ${fmt(total)} ${what}`
        + (confirmed.length ? `; the payment confirmations the line cites, designated for ${y}, add to ${fmt(conf)}` : '')
        + `. The return ${lv > total ? 'overstates' : 'understates'} payments by ${fmt(Math.abs(lv - total))} against the agency.`,
      receipt: agree && agency.pays.length ? `${agency.who} shows ${fmt(total)} ${what} (${agency.pays.length} payment${agency.pays.length === 1 ? '' : 's'})` : undefined,
      trigger: agency.pays.map((p) => p.ref),
      effect: agree ? undefined : oneToOne(line.jurisdiction, lv - total),
    });
  }
  return out;
}

// ---- Rule 4: lot matching across statements ---------------------------------------------------------------------------
// A sale lot's basis on the broker form and the same lot (same acquisition date, same security or lot id) on another
// statement: a plan administrator's supplement, an exchange export. The line that cites the other copy reconciles it.

function lots(ix: PacketIndex): Comparison[] {
  const rates = ix.latest.tax_effect_rates;
  const superseded = new Set(ix.latest.documents_superseded);
  const byDate = new Map<string, ExtractedValue[]>();
  for (const v of ix.packet.extracted_values) {
    if (!/_acquired$/.test(v.field) || typeof v.value !== 'string') continue;
    byDate.set(v.value, [...(byDate.get(v.value) ?? []), v]);
  }
  const out: Comparison[] = [];
  for (const line of ix.latest.lines) {
    const acq = lotField(ix, line, 'acquired');
    const basis = lotField(ix, line, 'adjusted_basis') ?? lotField(ix, line, 'basis');
    if (!lotField(ix, line, 'proceeds') || !acq || typeof acq.value !== 'string' || !basis) continue;
    const used = valuesOf(ix, line).find((v) => /_adjusted_basis$/.test(v.field) && num(v.value) !== null) ?? basis;
    const usedBasis = num(used.value) ?? 0;
    const lot = lotOf(line);
    const word = String(lotField(ix, line, 'description')?.value ?? '').toLowerCase().match(/[a-z]{4,}/)?.[0];
    const own = docOf(ix, basis);
    for (const other of byDate.get(acq.value) ?? []) {
      const d = docOf(ix, other);
      if (d.id === own.id || superseded.has(d.id) || formKey(d) === formKey(own)) continue;
      const prefix = other.field.replace(/_acquired$/, '');
      const sameLot = prefix === lot || (!!word && `${d.issuer ?? ''} ${d.title} ${pageText(d)}`.toLowerCase().includes(word));
      const ob = (ix.valuesByDoc.get(d.id) || []).find((x) => (x.field === `${prefix}_adjusted_basis` || x.field === `${prefix}_basis`) && num(x.value) !== null);
      if (!sameLot || !ob || (line.sources || []).includes(ob.id)) continue;
      const otherBasis = num(ob.value)!;
      const agree = near(otherBasis, usedBasis);
      const cat = /long/i.test(String(lotField(ix, line, 'term')?.value ?? '')) ? 'ltcg' : 'stcg';
      const sold = lotField(ix, line, 'sold');
      const diff = otherBasis - usedBasis;
      out.push({
        rule: 'lot', agree, claims: [lineClaim(line.key)],
        copies: [{ what: `${used.label} on ${docOf(ix, used).title}`, shown: fmt(usedBasis), ref: used.id },
          { what: `${ob.label} on ${d.title}`, shown: fmt(otherBasis), ref: ob.id }],
        title: `${line.label}: basis ${fmt(usedBasis)} on the return, ${fmt(otherBasis)} on ${d.title}`,
        explanation: `The lot acquired ${acq.value} appears on ${own.title} and on ${d.title}. ${line.key} uses a basis of ${fmt(usedBasis)}; `
          + `${d.title} gives ${fmt(otherBasis)} for the same lot, and the line does not cite it.`,
        receipt: agree ? `${d.title} gives the same basis for the lot acquired ${acq.value}: ${fmt(otherBasis)}` : undefined,
        trigger: [`doc:${d.id}`],
        effect: agree ? undefined : {
          federal: round(-diff * (rates[cat]?.federal_per_dollar ?? 0)),
          california: round(-diff * caGainRate(ix, typeof sold?.value === 'string' ? sold.value : null, cat)), basis: 'tax_effect_rates',
        },
      });
    }
  }
  return out;
}

// ---- Rule 5: identifier copies ------------------------------------------------------------------------------------------
// A person's SSN and date of birth in the organizer, on documents that belong to them, and on last year's return.
// Compared in full, shown as the last 4 only.

function identifiers(ix: PacketIndex): Comparison[] {
  const people = ix.packet.household.people as { id: string; role: string; name: string; ssn?: string; dob?: string }[];
  const y = taxYear(ix);
  const pyKey = `return_${y - 1}`;
  const deps = ((ix.packet.prior_years as Record<string, { dependents?: { name: string; ssn?: string }[] }>)[pyKey]?.dependents) ?? [];
  const owner = (d: PacketDocument) => people.find((p) => d.belongs_to === `dependent:${p.id}` || (p.role === d.belongs_to && p.role !== 'dependent'));
  const out: Comparison[] = [];
  for (const p of people) {
    const lines = ix.latest.lines.filter((l) => (l.sources || []).includes(`household:${p.id}`)).map((l) => lineClaim(l.key));
    for (const kind of ['ssn', 'dob'] as const) {
      const mine = p[kind];
      if (!mine) continue;
      const key = (s: unknown) => (kind === 'ssn' ? digits(s) : String(s));
      const show = (s: unknown) => (kind === 'ssn' ? `ending ${digits(s).slice(-4)}` : String(s));
      const copies: (Copy & { raw: string; doc?: string })[] = [];
      for (const v of ix.packet.extracted_values) {
        const d = docOf(ix, v);
        const isKind = kind === 'ssn' ? v.value_type === 'ssn' : v.field === 'dob' && d.document_type === 'identity_document';
        if (!isKind || v.value === null || owner(d)?.id !== p.id) continue;
        copies.push({ what: `${v.label} on ${d.title}`, shown: show(v.value), ref: v.id, raw: key(v.value), doc: d.id });
      }
      if (kind === 'ssn') deps.forEach((dp, i) => { if (dp.name === p.name && dp.ssn) copies.push({ what: `last year's return (dependent ${dp.name})`, shown: show(dp.ssn), ref: `py:/${pyKey}/dependents/${i}/ssn`, raw: key(dp.ssn) }); });
      if (!copies.length) continue;
      const differ = copies.filter((c) => c.raw !== key(mine));
      const claims = lines.length ? lines : differ.find((c) => c.doc) ? [docClaim(differ.find((c) => c.doc)!.doc!)] : [];
      if (!claims.length) continue;
      const label = kind === 'ssn' ? 'SSN' : 'date of birth';
      out.push({
        rule: 'identifier', agree: !differ.length, claims,
        copies: [{ what: `the organizer (${p.name})`, shown: show(mine), ref: `household:${p.id}` }, ...copies.map(({ what, shown, ref }) => ({ what, shown, ref }))],
        title: `${p.name}: the ${label} in the organizer does not match its other copies`,
        explanation: `The organizer ${label} for ${p.name} is ${show(mine)}; ${differ.map((c) => `${c.what} shows ${c.shown}`).join('; ')}. `
          + `A number or date that does not match the IRS record rejects the e-file.`,
        receipt: differ.length ? undefined : `${p.name}'s ${label} (${show(mine)}) matches ${copies.map((c) => c.what).join(' and ')}`,
        trigger: differ.some((c) => c.doc) ? differ.filter((c) => c.doc).map((c) => c.ref!) : undefined,
        stopsEfile: true,
      });
    }
  }
  return out;
}

const cache = new WeakMap<PacketIndex, Comparison[]>();

/** Every same-fact comparison on the latest return: agreements and disagreements, five rules. */
export function sameFacts(ix: PacketIndex): Comparison[] {
  let c = cache.get(ix);
  if (!c) {
    c = [...addedTwice(ix), ...boxToLine(ix), ...payments(ix), ...lots(ix), ...identifiers(ix)];
    cache.set(ix, c);
  }
  return c;
}
