// Family: the same money counted twice (two documents for one payment, a page scanned twice, a statement that is
// detail of a form already counted).
import type { ExtractedValue, ReturnLine } from '../../packet/types';
import {
  type Check, type Draft, categoryOf, docsOf, fmt, lineClaim, num, pageText, rateEffect, round, valuesOf,
} from '../util';

const FAMILY = 'Value counted twice';

/** Two income lines with the same amount from two documents that print the same account. */
export const dupPayer: Check = {
  id: 'CHK-DUP-PAYER',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const lines = ix.latest.lines.filter((l) => num(l.value) && valuesOf(ix, l).length > 0 && categoryOf(l));
    const accounts = (l: ReturnLine) => {
      const set = new Set<string>();
      for (const v of valuesOf(ix, l)) {
        const t = pageText(ix.docById.get(v.document_id), v.page);
        for (const m of t.matchAll(/(?:account|acct)\b[^.;]*?ending (\d{4})/gi)) set.add(m[1]);
      }
      return set;
    };
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const a = lines[i]; const b = lines[j];
        if (a.form !== b.form || a.rule !== b.rule || num(a.value) !== num(b.value)) continue;
        const da = new Set(valuesOf(ix, a).map((v) => v.document_id));
        const db = valuesOf(ix, b).map((v) => v.document_id);
        if (db.some((d) => da.has(d))) continue;
        const shared = [...accounts(a)].filter((x) => accounts(b).has(x));
        if (!shared.length) continue;
        const amount = num(b.value)!;
        out.push({
          title: `${b.label} repeats ${a.label}`,
          claims: [lineClaim(b.key)],
          evidence: [...a.sources, ...b.sources].filter((s) => ix.valueById.has(s)),
          explanation: `Two lines report ${fmt(amount)} each, from two documents that print the same account (ending ${shared[0]}). `
            + `One payment shown on two forms is one line of income; ${b.key} counts it again.`,
          effect: rateEffect(ix, categoryOf(b)!, -amount),
        });
      }
    }
    return out;
  },
};

/** Gross receipts = books total + a card-processor (1099-K) amount the books already include. */
export const dup1099kBooks: Check = {
  id: 'CHK-DUP-1099K-BOOKS',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    const isBooks = (dt: string) => dt.startsWith('books_');
    for (const line of ix.latest.lines) {
      const vals = valuesOf(ix, line);
      const books = vals.find((v) => isBooks(ix.docById.get(v.document_id)?.document_type ?? '') && /total_income/.test(v.field));
      if (!books) continue;
      const k = vals.filter((v) => ix.docById.get(v.document_id)?.document_type === '1099-K');
      const excess = (num(line.value) ?? 0) - (num(books.value) ?? 0);
      for (const kv of k) {
        if (Math.abs(excess - (num(kv.value) ?? 0)) > 0.5 || excess <= 0) continue;
        const kDoc = ix.docById.get(kv.document_id)!;
        const issuerWord = (kDoc.issuer ?? '').split(/\s+/)[0].toLowerCase();
        const inBooks = ix.packet.extracted_values.find((v) => v.id !== kv.id && num(v.value) === num(kv.value)
          && isBooks(ix.docById.get(v.document_id)?.document_type ?? '')
          && (v.label.toLowerCase().includes(issuerWord) || pageText(ix.docById.get(v.document_id), v.page).toLowerCase().includes(issuerWord)));
        if (!inBooks) continue;
        out.push({
          title: `${line.label} counts the ${kDoc.issuer} card money twice`,
          claims: [lineClaim(line.key)],
          evidence: [books.id, kv.id, inBooks.id, `doc:${inBooks.document_id}#page${inBooks.page}`],
          explanation: `${line.key} is ${fmt(num(line.value)!)} = books total ${fmt(num(books.value)!)} plus the Form 1099-K amount ${fmt(num(kv.value)!)}. `
            + `The books' deposit detail shows that same ${fmt(num(kv.value)!)} arrived through ${kDoc.issuer} and was deposited gross, so it is already inside the books total.`,
          effect: rateEffect(ix, categoryOf(line) ?? 'schc_profit', -excess),
        });
      }
    }
    return out;
  },
};

/** A page whose extracted values repeat another page of the same document, both summed into a line. */
export const dupPage: Check = {
  id: 'CHK-DUP-PAGE',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const d of ix.packet.documents) {
      const vals = ix.valuesByDoc.get(d.id) || [];
      const byPage = new Map<number, ExtractedValue[]>();
      for (const v of vals) byPage.set(v.page, [...(byPage.get(v.page) ?? []), v]);
      const sig = (vs: ExtractedValue[]) => vs.map((v) => `${v.field}=${JSON.stringify(v.value)}`).sort().join('|');
      const pages = [...byPage.keys()].sort((a, b) => a - b);
      for (let i = 0; i < pages.length; i++) {
        for (let j = i + 1; j < pages.length; j++) {
          const A = byPage.get(pages[i])!; const B = byPage.get(pages[j])!;
          if (A.length < 3 || sig(A) !== sig(B)) continue;
          const bIds = new Set(B.map((v) => v.id)); const aIds = new Set(A.map((v) => v.id));
          for (const line of ix.latest.lines) {
            const src = line.sources || [];
            const fromB = src.filter((s) => bIds.has(s));
            if (!fromB.length || !src.some((s) => aIds.has(s))) continue;
            const dup = fromB.reduce((s, id) => s + (num(ix.valueById.get(id)!.value) ?? 0), 0);
            // Lines computed from this one with a packet rate (e.g. miles x mileage rate).
            const downstream = ix.latest.lines.filter((l) => (l.inputs || []).includes(line.key)
              && (l.sources || []).some((s) => s.startsWith('ref:param.')));
            let effect; const claims = [lineClaim(line.key)];
            for (const dl of downstream) {
              const p = (dl.sources || []).find((s) => s.startsWith('ref:param.'))!;
              const rate = num(ix.packet.engine_reference.parameters[p.slice(10)]);
              const cat = categoryOf(dl);
              if (rate === null || !cat) continue;
              claims.push(lineClaim(dl.key));
              // The downstream line is an expense: removing the duplicate lowers it and raises profit.
              effect = rateEffect(ix, cat, round(dup * rate));
            }
            out.push({
              title: `${d.title}: page ${pages[j]} repeats page ${pages[i]}`,
              claims,
              evidence: [`doc:${d.id}#page${pages[i]}`, `doc:${d.id}#page${pages[j]}`, ...fromB],
              trigger: [`doc:${d.id}`],
              explanation: `Every value read from page ${pages[j]} (${B.length} values) matches page ${pages[i]}, so it is the same sheet twice. `
                + `${line.key} adds both pages, counting ${fmt(dup)} twice${claims.length > 1 ? `, which flows into ${claims.slice(1).map((c) => c.slice(5)).join(', ')}` : ''}.`,
              effect,
            });
          }
        }
      }
    }
    return out;
  },
};

/** A lender statement added on top of the Form 1098 that already includes it. */
export const dupLenderStatement: Check = {
  id: 'CHK-DUP-LENDER-STATEMENT',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      const docs = docsOf(ix, line);
      for (const a of docs) {
        for (const b of docs) {
          if (a === b || !a.issuer || a.issuer !== b.issuer || a.document_type === b.document_type) continue;
          const ta = pageText(a); const tb = pageText(b);
          const saysReported = new RegExp(`reported on the \\d{4} Form ${b.document_type.replace(/[-]/g, '\\-')}`, 'i').test(ta);
          const typeWords = a.document_type.split('_').filter((w) => w.length > 3 && w !== 'statement');
          const includes = (tb.match(/\(includes[^)]*\)/i)?.[0] ?? '').toLowerCase();
          const saysIncludes = typeWords.some((w) => includes.includes(w));
          if (!saysReported && !saysIncludes) continue;
          const extra = valuesOf(ix, line).filter((v) => v.document_id === a.id);
          const amount = extra.reduce((s, v) => s + (num(v.value) ?? 0), 0);
          if (!amount) continue;
          out.push({
            title: `${line.label}: the ${a.document_type.replace(/_/g, ' ')} is added on top of the Form ${b.document_type} that includes it`,
            claims: [lineClaim(line.key)],
            evidence: [...extra.map((v) => v.id), ...valuesOf(ix, line).filter((v) => v.document_id === b.id).map((v) => v.id), `doc:${a.id}`, `doc:${b.id}`],
            explanation: `${line.key} includes ${fmt(amount)} from the ${a.document_type.replace(/_/g, ' ')} as a separate amount, but `
              + (saysReported ? `that statement says it is reported on the Form ${b.document_type}` : `the Form ${b.document_type} says its amount includes it`)
              + `. The same ${fmt(amount)} is counted twice.`,
            effect: rateEffect(ix, categoryOf(line) ?? 'itemized', -amount),
          });
        }
      }
    }
    return out;
  },
};

export const countedTwiceChecks: Check[] = [dupPayer, dup1099kBooks, dupPage, dupLenderStatement];
