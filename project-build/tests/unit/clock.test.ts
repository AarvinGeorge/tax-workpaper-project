import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { DEFAULT_STORY_AT, deadlines, frozenAt, stageAt, visibleAt } from '@/domain/clock';

const p = loadPacket();
const ix = indexPacket(p);

describe('story clock', () => {
  it('defaults to the latest computation, to the minute', () => {
    const latest = ix.latest.computed_at;
    expect(DEFAULT_STORY_AT(ix)).toBe(latest.slice(0, 16) + ':00Z');
  });

  it('freezes at the first federal acceptance in the e-file records', () => {
    const efile = (p.tax_agency_records as { efile: { date: string; jurisdiction: string; status: string }[] }).efile;
    const first = efile.filter((e) => e.jurisdiction === 'federal' && e.status === 'accepted').map((e) => e.date).sort()[0];
    expect(frozenAt(ix)).toBe(first);
  });

  it('visibleAt compares instants, date-only strings at midnight UTC', () => {
    expect(visibleAt('2026-06-23T06:05:00Z', '2026-06-23T06:05:00Z')).toBe(true);
    expect(visibleAt('2026-06-23T06:06:00Z', '2026-06-23T06:05:00Z')).toBe(false);
    expect(visibleAt('2026-06-23', '2026-06-23T00:00:00Z')).toBe(true);
    expect(visibleAt(null, '2026-06-23T00:00:00Z')).toBe(true);
  });

  it('stage moves Preparation, Review, Approval, Filing, Filed along the clock', () => {
    const fz = frozenAt(ix)!;
    expect(stageAt(ix, '2026-01-01T00:00:00Z')).toBe('Preparation');
    expect(stageAt(ix, '2026-04-01T00:00:00Z')).toBe('Review');
    expect(stageAt(ix, DEFAULT_STORY_AT(ix))).toBe('Review');
    expect(stageAt(ix, '2026-07-11T00:00:00Z')).toBe('Approval');
    expect(stageAt(ix, '2026-07-13T18:00:00Z')).toBe('Filing');
    expect(stageAt(ix, fz)).toBe('Filed');
  });

  it('measures every firm deadline on the story clock', () => {
    const d = deadlines(ix, '2026-04-10T00:00:00Z');
    expect(d).toHaveLength((p.firm.deadlines as unknown[]).length);
    const original = d.find((x) => x.date === '2026-04-15')!;
    expect(original.daysLeft).toBe(5);
    expect(original.status).toBe('due_soon');
    expect(d.find((x) => x.date === '2026-03-27')!.status).toBe('passed');
    expect(d.find((x) => x.date === '2026-10-15')!.status).toBe('upcoming');
  });
});

describe('F1 item 8: stage follows signing, transmission and acceptance', () => {
  const signedAt = p.timeline.find((t) => /8879/.test(t.event))!.at;
  const firstSent = p.timeline.filter((t) => /efile/i.test(t.event)).map((t) => t.at).sort()[0];
  const plus = (iso: string, min: number) => new Date(new Date(iso).getTime() + min * 60_000).toISOString().slice(0, 16) + ':00Z';
  it('reads Review at the default clock (latest computation), before the client signs', () => {
    expect(DEFAULT_STORY_AT(ix) < signedAt).toBe(true);
    expect(stageAt(ix, DEFAULT_STORY_AT(ix))).toBe('Review');
    expect(stageAt(ix, plus(signedAt, -1))).toBe('Review');
  });
  it('reads Approval from the client signing event until the first transmission', () => {
    expect(stageAt(ix, signedAt)).toBe('Approval');
    expect(stageAt(ix, plus(firstSent, -1))).toBe('Approval');
  });
  it('reads Filing from the first transmission, Filed from federal acceptance', () => {
    expect(stageAt(ix, firstSent)).toBe('Filing');
    expect(stageAt(ix, plus(frozenAt(ix)!, -1))).toBe('Filing');
    expect(stageAt(ix, frozenAt(ix)!)).toBe('Filed');
  });
});
