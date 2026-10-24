// Checks lists items, not findings: one row per claim (a return line or a document), with every signal on it. A check
// finding belongs to its first claim; an AI suggestion joins the item of the first check finding that names any claim it
// names, else it makes (or joins) an AI-only item keyed by its own first claim. The join is by claim only: sharing a line
// does not mean the AI raised the same problem.
import type { Finding, Severity } from './contracts';
import type { PacketIndex } from './packet/load';

const ORDER: Severity[] = ['blocker', 'check', 'judgment', 'info'];

export interface Item<T extends { f: Finding }> {
  key: string;
  checks: Finding[];
  ai: T[];
  /** Worst severity among its check findings; null for an AI-only item. */
  severity: Severity | null;
}

export function checkItems<T extends { f: Finding }>(checks: Finding[], ai: T[]): Item<T>[] {
  const items = new Map<string, Item<T>>();
  const owner = new Map<string, string>(); // any claim a check names -> its item's key (first wins)
  const rank = (s: Severity) => ORDER.indexOf(s);
  for (const f of [...checks].sort((a, b) => rank(a.severity) - rank(b.severity))) {
    const key = f.claims[0] ?? 'finding:' + f.id;
    const it = items.get(key) ?? { key, checks: [], ai: [], severity: f.severity };
    it.checks.push(f);
    items.set(key, it);
    for (const c of f.claims) if (!owner.has(c)) owner.set(c, key);
  }
  const aiOnly = new Map<string, Item<T>>();
  for (const x of ai) {
    const hit = x.f.claims.map((c) => owner.get(c)).find((k): k is string => !!k);
    if (hit) { items.get(hit)!.ai.push(x); continue; }
    const key = x.f.claims[0] ?? 'finding:' + x.f.id;
    const it = aiOnly.get(key) ?? { key, checks: [], ai: [], severity: null };
    it.ai.push(x);
    aiOnly.set(key, it);
  }
  return [...items.values(), ...aiOnly.values()];
}

type Diagnostic = PacketIndex['latest']['diagnostics'][number];

/** The engine's own v3 diagnostics that name each item, by reference only: a ref that is a line key the item claims or
 *  a source of such a line (the drawer's predicate), an evidence ref of the item's findings or suggestions, or a line
 *  key whose sources are such evidence. A
 *  diagnostic about the same subject that names nothing on the item does not join. */
export function engineOn<T extends { f: Finding }>(ix: PacketIndex, items: Item<T>[]): Map<string, Diagnostic[]> {
  const out = new Map<string, Diagnostic[]>();
  for (const it of items) {
    const all = [...it.checks, ...it.ai.map((x) => x.f)];
    const lines = [...new Set([it.key, ...all.flatMap((f) => f.claims)])].filter((c) => c.startsWith('line:')).map((c) => c.slice(5));
    const sources = new Set(lines.flatMap((k) => (ix.line(ix.latest.version, k)?.sources ?? []) as string[]));
    const evidence = new Set(all.flatMap((f) => f.evidence));
    // ...or a line ref whose own sources the item's checks cite (a warning on an input line the item is built from).
    const citesLine = (r: string) => (ix.line(ix.latest.version, r)?.sources ?? []).some((s) => evidence.has(s));
    const hits = ix.latest.diagnostics.filter((d) => d.refs.some((r) => lines.includes(r) || sources.has(r) || evidence.has(r) || citesLine(r)));
    if (hits.length) out.set(it.key, hits);
  }
  return out;
}
