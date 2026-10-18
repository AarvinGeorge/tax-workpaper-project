import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { compareVersions, finalized, swings, whatIfs, formsOf, FINALIZED } from '@/domain/versions';
import type { ClaimState, WorkspaceState } from '@/domain/contracts';
import type { Packet } from '@/domain/packet/types';
import { alteredPacket, REMOVED_FORM } from '../fixtures/altered';

const p = loadPacket();
const ix = indexPacket(p);
const [v1, v2, v3] = p.return_versions.map((rv) => rv.version);

function stateWith(claims: Record<string, Partial<ClaimState>>): WorkspaceState {
  const full: Record<string, ClaimState> = {};
  for (const [id, c] of Object.entries(claims)) {
    full[id] = { claimId: id, original: null, current: null, adjusted: false, history: [], signoffs: [], openNotes: [], version: 0, ...c };
  }
  return { storyAt: ix.latest.computed_at, frontierAt: ix.latest.computed_at, frozen: false, stage: 'Review', claims: full, blockers: [], reveals: [], reasons: {}, events: [] };
}

describe('compareVersions', () => {
  it('adjacent versions follow changes_from_previous exactly', () => {
    const rows = compareVersions(ix, v2, v3);
    const changed = rows.filter((r) => r.change !== 'same');
    const cfp = ix.version(v3)!.changes_from_previous;
    expect(changed.length).toBe(cfp.length);
    for (const c of cfp) {
      const r = rows.find((x) => x.key === c.key)!;
      expect(r.change).toBe(c.change);
      if (c.change !== 'added') expect(r.a).toEqual(c.old);
      if (c.change !== 'removed') expect(r.b).toEqual(c.new);
    }
    const keys = new Set([...ix.version(v2)!.lines, ...ix.version(v3)!.lines].map((l) => l.key));
    expect(rows.length).toBe(keys.size);
  });

  it('non-adjacent versions diff line by line', () => {
    const rows = compareVersions(ix, v1, v3);
    const a = new Map(ix.version(v1)!.lines.map((l) => [l.key, l.value]));
    const b = new Map(ix.version(v3)!.lines.map((l) => [l.key, l.value]));
    for (const r of rows) {
      const exp = !a.has(r.key) ? 'added' : !b.has(r.key) ? 'removed' : a.get(r.key) === b.get(r.key) ? 'same' : 'changed';
      expect(r.change, r.key).toBe(exp);
    }
    expect(rows.some((r) => r.change === 'changed')).toBe(true);
  });

  it('adjacent compare trusts changes_from_previous over the line values (packet as delivered)', () => {
    const q: Packet = JSON.parse(JSON.stringify(p));
    const last = q.return_versions.at(-1)!;
    const prev = q.return_versions.at(-2)!;
    const victim = last.changes_from_previous.find((c) => c.change === 'changed')!;
    last.changes_from_previous = last.changes_from_previous.filter((c) => c !== victim);
    const rows = compareVersions(indexPacket(q), prev.version, last.version);
    expect(rows.find((r) => r.key === victim.key)!.change).toBe('same');
  });

  it('compares against the finalized version with adjusted lines changed', () => {
    const key = ix.latest.lines.find((l) => typeof l.value === 'number' && l.value !== 0)!.key;
    const orig = ix.line(v3, key)!.value as number;
    const fin = finalized(ix, stateWith({ [`line:${key}`]: { adjusted: true, original: orig, current: orig + 100 } }));
    const rows = compareVersions(ix, v3, FINALIZED, fin);
    const r = rows.find((x) => x.key === key)!;
    expect(r).toMatchObject({ a: orig, b: orig + 100, change: 'changed' });
    expect(rows.filter((x) => x.change !== 'same').length).toBe(1);
  });

  it('labels and forms come from the lines', () => {
    const rows = compareVersions(ix, v2, v3);
    const l = ix.latest.lines[0];
    expect(rows.find((r) => r.key === l.key)).toMatchObject({ label: l.label, form: l.form });
  });
});

describe('finalized', () => {
  it('is the latest version with adjusted claims overlaid, never recomputed', () => {
    const key = ix.latest.lines.find((l) => typeof l.value === 'number')!.key;
    const fin = finalized(ix, stateWith({
      [`line:${key}`]: { adjusted: true, original: ix.line(v3, key)!.value, current: 12345 },
      'doc:D01': { adjusted: true, current: 1 },
    }));
    expect(fin.length).toBe(ix.latest.lines.length);
    // Hand-built claims carry no flow-through: nothing is recomputed, and recomputed always means derived.
    for (const f of fin) expect(f.recomputed).toBe(f.derived);
    expect(fin.some((f) => f.recomputed)).toBe(false);
    const hit = fin.find((f) => f.key === key)!;
    expect(hit).toMatchObject({ v3: ix.line(v3, key)!.value, value: 12345, adjusted: true });
    expect(fin.filter((f) => f.adjusted).length).toBe(1);
  });

  it('an un-adjusted claim (after undo) shows the v3 value', () => {
    const key = ix.latest.lines[0].key;
    const fin = finalized(ix, stateWith({ [`line:${key}`]: { adjusted: false, current: 999 } }));
    expect(fin.find((f) => f.key === key)!.value).toBe(ix.latest.lines[0].value);
  });
});

describe('swings', () => {
  const rule = p.firm.starter_standards.variance_review as { flag_if_change_over_percent: number; and_over_amount: number };
  const prior = p.prior_years.return_2024.lines as Record<string, number>;
  const priorSources = p.prior_years.return_2024.line_sources as Record<string, string>;

  it('uses prior_years lines and the firm variance rule from the data', () => {
    const s = swings(ix);
    const flagged = s.filter((x) => x.flag === 'swing');
    expect(flagged.length).toBeGreaterThan(0);
    for (const x of s) {
      if (x.prior === null) continue;
      const over = Math.abs(x.delta) > rule.and_over_amount && (x.prior === 0 || (Math.abs(x.delta) / Math.abs(x.prior)) * 100 > rule.flag_if_change_over_percent);
      expect(x.flag === 'swing', x.key).toBe(over);
      expect(x.prior).toBe(prior[x.key]);
      expect(x.delta).toBeCloseTo(x.current - x.prior, 6);
    }
    expect(s.some((x) => x.prior !== null && x.flag === null)).toBe(true);
  });

  it('every numeric prior-year line appears; the 2024 column traces to its source value', () => {
    const s = swings(ix);
    const numeric = Object.keys(prior).filter((k) => typeof prior[k] === 'number');
    expect(numeric.length).toBeLessThan(Object.keys(prior).length); // text lines exist and are left out
    for (const k of numeric) {
      const x = s.find((y) => y.key === k);
      expect(x, k).toBeDefined();
      if (priorSources[k]) expect(x!.priorRef).toBe(priorSources[k]);
    }
  });

  it('a 2025 line with no prior-year line over the amount is new', () => {
    const s = swings(ix);
    const news = s.filter((x) => x.flag === 'new');
    expect(news.length).toBeGreaterThan(0);
    for (const x of news) {
      expect(x.prior).toBeNull();
      expect(Math.abs(x.current)).toBeGreaterThan(rule.and_over_amount);
    }
  });

  it('changing the firm rule in the data changes the flags', () => {
    const q: Packet = JSON.parse(JSON.stringify(p));
    (q.firm.starter_standards.variance_review as { and_over_amount: number }).and_over_amount = 1e12;
    expect(swings(indexPacket(q)).filter((x) => x.flag).length).toBe(0);
  });
});

describe('whatIfs', () => {
  it('maps what_if.alternatives', () => {
    const w = whatIfs(ix);
    const alts = p.what_if.alternatives as { id: string; description: string; federal: { total_tax_change: number }; california: { total_tax_change: number }; changed_lines: { key: string }[] }[];
    expect(w.length).toBe(alts.length);
    alts.forEach((a, i) => {
      expect(w[i]).toMatchObject({ id: a.id, description: a.description, federalChange: a.federal.total_tax_change, californiaChange: a.california.total_tax_change });
      expect(w[i].changedLines).toEqual(a.changed_lines.map((c) => c.key));
    });
  });
});

describe('formsOf', () => {
  it('groups every line of a version by form, in order, with readable labels', () => {
    const f = formsOf(ix, v3);
    expect(f.flatMap((x) => x.lines).length).toBe(ix.latest.lines.length);
    expect(new Set(f.map((x) => x.form)).size).toBe(f.length);
    const first = f.find((x) => x.form === 'F1040')!;
    expect(first.label).toBe('Form 1040');
    expect(f.find((x) => x.form === 'SchA')!.label).toBe('Schedule A');
    for (const x of f) for (const k of x.lines) expect(ix.line(v3, k)!.form).toBe(x.form);
  });

  it('a removed form disappears on the altered packet', () => {
    expect(formsOf(ix, v3).some((x) => x.form === REMOVED_FORM)).toBe(true);
    const ax = indexPacket(alteredPacket());
    expect(formsOf(ax, ax.latest.version).some((x) => x.form === REMOVED_FORM)).toBe(false);
  });
});
