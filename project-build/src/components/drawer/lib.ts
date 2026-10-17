// Pure helpers for the claim drawer.

export interface PageField { valueId: string; text: string; value: unknown; valueType: string }
export interface Segment { text: string; mark: 'sel' | 'other' | null; valueId?: string }

/** Ways a value may be printed on the page, most specific first. */
function needles(f: PageField): string[] {
  const out: string[] = [];
  if (f.text) out.push(f.text);
  if (typeof f.value === 'number') {
    out.push(f.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    out.push(f.value.toLocaleString('en-US'));
    out.push(String(f.value));
  } else if (f.value !== null && f.value !== undefined && f.value !== '') out.push(String(f.value));
  return [...new Set(out.filter((s) => s.length > 0))];
}

/** A match must not sit inside a longer number or word: "0.00" inside "7,400.00" is not a match. */
function bounded(t: string, a: number, b: number): boolean {
  const pre = t[a - 1] ?? ''; const post = t[b] ?? ''; const post2 = t[b + 1] ?? '';
  if (/[A-Za-z0-9]/.test(pre) && /[A-Za-z0-9]/.test(t[a])) return false;
  if (/[,.]/.test(pre) && /\d/.test(t[a - 2] ?? '') && /\d/.test(t[a])) return false;
  if (/[A-Za-z0-9]/.test(post) && /[A-Za-z0-9]/.test(t[b - 1])) return false;
  if (/[,.]/.test(post) && /\d/.test(post2) && /\d/.test(t[b - 1])) return false;
  return true;
}

/** Find where each field's text sits in the printed page. Fields reading the same text take successive occurrences. */
function locate(printed: string, fields: PageField[]): Map<string, [number, number]> {
  const at = new Map<string, [number, number]>();
  const taken: [number, number][] = [];
  const overlaps = (a: number, b: number) => taken.some(([x, y]) => a < y && b > x);
  for (const f of fields) {
    for (const n of needles(f)) {
      let from = 0; let found = -1;
      while (from <= printed.length) {
        const i = printed.indexOf(n, from);
        if (i < 0) break;
        if (!overlaps(i, i + n.length) && bounded(printed, i, i + n.length)) { found = i; break; }
        from = i + 1;
      }
      if (found >= 0) { at.set(f.valueId, [found, found + n.length]); taken.push([found, found + n.length]); break; }
    }
  }
  return at;
}

/** Split a printed page into text runs, marking the selected field and (lightly) the other values read from it. */
export function highlightSegments(printed: string, fields: PageField[], selected: string | string[] | null): Segment[] {
  const sel = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);
  const at = locate(printed, fields);
  const spans = [...at.entries()].map(([id, [a, b]]) => ({ id, a, b })).sort((x, y) => x.a - y.a);
  const segs: Segment[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.a < pos) continue;
    if (s.a > pos) segs.push({ text: printed.slice(pos, s.a), mark: null });
    segs.push({ text: printed.slice(s.a, s.b), mark: sel.has(s.id) ? 'sel' : 'other', valueId: s.id });
    pos = s.b;
  }
  if (pos < printed.length || segs.length === 0) segs.push({ text: printed.slice(pos), mark: null });
  if (spans.length === 0) return [{ text: printed, mark: null }];
  return segs;
}

/** The reveal refusal, quoting the firm rule once even when the policy reason is the rule itself. */
export function revealReason(reason: string | undefined, rule: string | undefined): string {
  const r = (reason ?? '').trim();
  if (!rule) return r;
  const quoted = `Firm rule: “${rule}”`;
  if (!r || r === rule || r.includes(rule)) return r.includes('Firm rule') ? r : quoted;
  return `${r} ${quoted}`;
}
