// The return as of story time: at time T the workspace shows the latest version computed at or before T, its checks
// and figures; the clock itself (frontier, write gate) stays on the static index, so the past remains view-only.
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { DEFAULT_STORY_AT, indexAt, notComputedText } from '@/domain/clock';
import { projectWorkspace } from '@/domain/project';
import { can } from '@/domain/policy';
import { keyAmounts } from '@/components/client/signing';
import { loadWorkspace, postEvent } from '@/server/state';
import type { RoleKey, WorkEvent } from '@/domain/contracts';
import { AI_FIXTURE_IDS, writeAiFixture } from '../fixtures/ai-payload';

const ix = indexPacket(loadPacket());
const DEFAULT = DEFAULT_STORY_AT(ix);
const APR14 = '2026-04-14T12:00:00Z';
const MAR10 = '2026-03-10T12:00:00Z';
const MAR02 = '2026-03-02T12:00:00Z';
const move = (to: string): WorkEvent => ({ seq: 1, ws: 'w', at: DEFAULT, storyAt: DEFAULT, role: 'jo', type: 'clock_moved', payload: { to } });
const fresh = () => 'ws-tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function at(to: string, role: RoleKey = 'daniel') {
  const ws = fresh();
  expect((await postEvent(ws, 'jo', { type: 'clock_moved', payload: { to } })).ok).toBe(true);
  return { ws, w: await loadWorkspace(ws, role) };
}
function taxes(to: string) {
  const pix = indexAt(ix, to);
  const rows = keyAmounts(pix, projectWorkspace(ix, to === DEFAULT ? [] : [move(to)], 'daniel', []));
  return rows.map((r) => [r.jurisdiction, r.totalTax?.value]);
}

describe('indexAt: the packet index as of a story time', () => {
  it('at 14 Apr the latest version is v2, with only the versions computed by then', () => {
    const pix = indexAt(ix, APR14);
    expect(pix.latest.version).toBe('v2');
    expect(pix.versions.map((v) => v.version)).toEqual(['v1', 'v2']);
    expect(pix.counts.versions).toBe(2);
    expect(pix.counts.lines).toBe(pix.latest.lines.length);
    expect(pix.line('v3', pix.latest.lines[0].key)).toBeDefined(); // every version still resolves
  });
  it('at or after the latest computation it is the static index itself', () => {
    expect(indexAt(ix, DEFAULT)).toBe(ix);
    expect(indexAt(ix, '2027-01-01T00:00:00Z')).toBe(ix);
  });
  it('before the first computation the latest version is a fully shaped placeholder, flagged not computed', () => {
    const pix = indexAt(ix, MAR02);
    expect(pix.latest).toMatchObject({
      version: 'none', lines: [], diagnostics: [], documents_superseded: [], changes_from_previous: [],
      tax_effect_rates: {}, carryovers_out: {}, computed_at: ix.versions[0].computed_at, computed: false,
    });
    expect(pix.versions).toEqual([]);
    expect(notComputedText(pix)).toBe('No return computed yet: the engine first ran on 4 Mar 2026');
    expect(notComputedText(ix)).toBeNull();
  });
});

describe('the figures follow the clock', () => {
  it('federal and California tax per version, empty before the first computation', () => {
    expect(taxes(APR14)).toEqual([['federal', 77470], ['california', 17999]]);
    expect(taxes(MAR10)).toEqual([['federal', 77200], ['california', 17845]]);
    expect(taxes(DEFAULT)).toEqual([['federal', 81962], ['california', 18874]]);
    expect(taxes(MAR02)).toEqual([]);
  });
});

describe('the workspace at a past story time', () => {
  let saved: string | undefined;
  beforeEach(() => { saved = process.env.AI_PAYLOAD_PATH; });
  afterEach(() => { if (saved === undefined) delete process.env.AI_PAYLOAD_PATH; else process.env.AI_PAYLOAD_PATH = saved; });

  it('loads the version of the day and re-runs the checks on it: the v3-only SEP finding is absent at 14 Apr', async () => {
    const { w } = await at(APR14);
    expect(w.ix.latest.version).toBe('v2');
    expect(w.findings.some((f) => f.checkId === 'CHK-SEP-LIMIT')).toBe(false);
    const now = await loadWorkspace(fresh(), 'daniel');
    expect(now.ix).toBe(ix);
    expect(now.findings.some((f) => f.checkId === 'CHK-SEP-LIMIT')).toBe(true);
  });
  it('the clock stays on the static index: at 14 Apr the frontier is still v3 and an adjustment is refused', async () => {
    const { ws, w } = await at(APR14);
    expect(w.state.frontierAt).toBe('2026-06-23T06:05:00Z');
    const claimId = 'line:' + ix.latest.lines.find((l) => typeof l.value === 'number')!.key;
    expect(can(ix, 'daniel', 'adjustment', { claimId, payload: { value: 1 } }, w.state).ok).toBe(false);
    const r = await postEvent(ws, 'daniel', { type: 'adjustment', claimId, payload: { value: 1 } });
    expect(r.ok).toBe(false);
  });
  it('AI suggestions, made on the final version, are absent at 14 Apr and cannot be reviewed', async () => {
    process.env.AI_PAYLOAD_PATH = writeAiFixture(path.join(mkdtempSync(path.join(tmpdir(), 'taxmark-tmp-')), 'ai.json'));
    const { ws, w } = await at(APR14);
    expect(w.ai.findings).toEqual([]);
    expect(w.findings.some((f) => f.source === 'ai')).toBe(false);
    const r = await postEvent(ws, 'daniel', { type: 'suggestion_accepted', claimId: 'finding:' + AI_FIXTURE_IDS.grounded, payload: {} });
    expect(r.ok).toBe(false);
    const now = await loadWorkspace(fresh(), 'daniel');
    expect(now.ai.findings.length).toBeGreaterThan(0);
  });
  it('before the first computation the workspace loads, and an adjustment is refused with the reason', async () => {
    const { w } = await at(MAR02);
    expect(w.ix.latest.version).toBe('none');
    const claimId = 'line:' + ix.latest.lines[0].key;
    expect(can(w.ix, 'daniel', 'adjustment', { claimId, payload: { value: 1 } }, w.state).reason).toBe('No return computed yet: the engine first ran on 4 Mar 2026');
  });
  it('a client may move the clock', async () => {
    const state = projectWorkspace(ix, [], 'ngozi', []);
    expect(can(ix, 'ngozi', 'clock_moved', { payload: { to: APR14 } }, state).ok).toBe(true);
    expect((await postEvent(fresh(), 'ngozi', { type: 'clock_moved', payload: { to: APR14 } })).ok).toBe(true);
  });
});
