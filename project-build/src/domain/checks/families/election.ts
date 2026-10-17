// Family: cheaper election in what_if. An engine-computed alternative that lowers tax (or penalty) with no cost in
// any jurisdiction: the default was kept while a strictly better choice exists.
import { type Check, type Draft, fmt, lineClaim, num } from '../util';

const FAMILY = 'Cheaper election available';

export const cheaperElection: Check = {
  id: 'CHK-CHEAPER-ELECTION',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const alt of ix.packet.what_if.alternatives) {
      const f = alt.federal as { total_tax_change?: unknown; penalty_change?: unknown } | undefined;
      const c = alt.california as { total_tax_change?: unknown; penalty_change?: unknown } | undefined;
      const fed = num(f?.total_tax_change) ?? 0; const ca = num(c?.total_tax_change) ?? 0;
      const pen = (num(f?.penalty_change) ?? 0) + (num(c?.penalty_change) ?? 0);
      if (fed > 0 || ca > 0 || pen > 0 || fed + ca + pen >= 0) continue;
      const changed = ((alt.changed_lines as { key: string }[]) || []).map((x) => x.key).filter((k) => ix.line(ix.latest.version, k));
      const form = changed.length ? ix.line(ix.latest.version, changed[0])!.form : null;
      const claims = changed.filter((k) => ix.line(ix.latest.version, k)!.form === form);
      const evidence = [...new Set(claims.flatMap((k) => ix.line(ix.latest.version, k)!.sources || []).filter((s) => ix.valueById.has(s) || s.startsWith('ref:')))];
      const limit = Object.keys(ix.packet.engine_reference.parameters).find((p) => /section179/i.test(p) && /section 179/i.test(String(alt.description)));
      out.push({
        title: `Election available: ${String(alt.description).replace(/\.$/, '')}`,
        claims: claims.map(lineClaim),
        evidence: [...evidence, ...(limit ? [`ref:param.${limit}`] : [])],
        judgment: true,
        explanation: `The engine computed this alternative ("${alt.id}"): federal ${fed === 0 ? 'no change' : fmt(fed)}, California ${fmt(ca)}`
          + (pen ? `, penalty ${fmt(pen)}` : '') + `. It costs nothing anywhere and lowers the total; the return keeps the default. Record the choice and why.`,
        effect: { federal: fed + (num(f?.penalty_change) ?? 0), california: ca + (num(c?.penalty_change) ?? 0), basis: 'what_if' },
      });
    }
    return out;
  },
};

export const electionChecks: Check[] = [cheaperElection];
