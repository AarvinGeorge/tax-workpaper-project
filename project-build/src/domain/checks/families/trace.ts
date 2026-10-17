// Family: trace gap. A sum line whose listed inputs do not produce its value (the number may be right; the trace
// a reviewer follows is not).
import type { ReturnLine } from '../../packet/types';
import { type Check, type Draft, fmt, lineClaim, num } from '../util';

const FAMILY = 'Trace gap';

/** True when some +/- combination of the values equals the target (within half a dollar). */
function reachable(target: number, vals: number[]): boolean {
  if (vals.length > 12) return true; // too many to search; not judged
  const n = vals.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += mask & (1 << i) ? -vals[i] : vals[i];
    if (Math.abs(s - target) <= 0.5) return true;
  }
  return false;
}

export const inputsDoNotSum: Check = {
  id: 'CHK-INPUTS-DO-NOT-SUM',
  family: FAMILY,
  run(ix) {
    const gaps: { line: ReturnLine; missing: ReturnLine[] }[] = [];
    const v = ix.latest.version;
    for (const line of ix.latest.lines) {
      // Rules the engine describes as a plain arithmetic combination of the listed input lines.
      const rule = ix.packet.engine_reference.rules[line.rule ?? ''] ?? '';
      if (!/^arithmetic combination of the listed input lines/i.test(rule) || !(line.inputs || []).length) continue;
      const target = num(line.value);
      const ins = (line.inputs || []).map((k) => num(ix.line(v, k)?.value));
      if (target === null || ins.some((x) => x === null)) continue;
      if (reachable(target, ins as number[])) continue;
      // Which sibling lines (same form and line number, another column) would close the gap.
      const stem = line.key.replace(/\.[^.]+$/, '.');
      const siblings = ix.latest.lines.filter((l) => l.key.startsWith(stem) && l.key !== line.key && !(line.inputs || []).includes(l.key) && num(l.value) !== null);
      const missing = siblings.filter((s) => reachable(target, [...(ins as number[]), num(s.value)!]));
      gaps.push({ line, missing });
    }
    if (!gaps.length) return [];
    const evidence = [...new Set(gaps.flatMap((g) => g.missing.flatMap((m) => m.sources || []).filter((s) => ix.valueById.has(s) || s.includes(':'))))];
    const draft: Draft = {
      title: `${gaps.length} sum line${gaps.length === 1 ? '' : 's'} whose listed inputs do not add up`,
      claims: gaps.map((g) => lineClaim(g.line.key)),
      evidence,
      explanation: gaps.map((g) => `${g.line.key} = ${fmt(num(g.line.value)!)} lists ${(g.line.inputs || []).join(', ')}`
        + (g.missing.length ? `; inputs omit ${g.missing.map((m) => m.key).join(' or ')}` : '; no sibling line closes the gap')).join('. ')
        + '. The value may be right, but the trace a reviewer follows does not reach it.',
    };
    return [draft];
  },
};

export const traceChecks: Check[] = [inputsDoNotSum];
