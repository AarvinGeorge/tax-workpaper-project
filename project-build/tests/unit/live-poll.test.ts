import { describe, expect, it } from 'vitest';
import { pollDelay, ACTIVE_MS, IDLE_STOP_MS } from '@/components/shell/livePoll';

describe('live refresh poll schedule', () => {
  it('polls every 5 s while someone is active, so other tabs follow within the promised 12 s', () => {
    expect(pollDelay(0)).toBe(5_000);
    expect(pollDelay(ACTIVE_MS - 1)).toBe(5_000);
  });
  it('backs off to 30 s once the tab has been idle for 2 minutes', () => {
    expect(ACTIVE_MS).toBe(120_000);
    expect(pollDelay(ACTIVE_MS)).toBe(30_000);
    expect(pollDelay(IDLE_STOP_MS - 1)).toBe(30_000);
  });
  it('stops after 10 idle minutes (an open, untouched tab costs nothing)', () => {
    expect(IDLE_STOP_MS).toBe(600_000);
    expect(pollDelay(IDLE_STOP_MS)).toBeNull();
    expect(pollDelay(86_400_000)).toBeNull();
  });
  it('an idle tab polls at most 40 times before stopping, against 120 at a flat 5 s', () => {
    let t = 0, n = 0;
    for (let d = pollDelay(t); d !== null; d = pollDelay(t)) { t += d; n++; }
    expect(n).toBeLessThanOrEqual(40);
  });
});
