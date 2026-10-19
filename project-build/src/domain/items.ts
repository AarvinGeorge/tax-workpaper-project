// Checks lists items, not findings: one row per claim (a return line or a document), with every signal on it. A check
// finding belongs to its first claim; an AI suggestion joins the item of the first check finding that names any claim it
// names, else it makes (or joins) an AI-only item keyed by its own first claim. The join is by claim only: sharing a line
// does not mean the AI raised the same problem.
import type { Finding, Severity } from './contracts';

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
