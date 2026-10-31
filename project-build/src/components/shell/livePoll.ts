/** How long after the last activity (an interaction, a page load or a change from another tab) the poll stays fast. */
export const ACTIVE_MS = 120_000;
/** After this long idle the tab stops polling until someone interacts with it or brings it back into view. */
export const IDLE_STOP_MS = 600_000;

/** The wait before the next poll, or null to stop: 5 s while active, 30 s once idle, none after 10 idle minutes. */
export function pollDelay(sinceActivityMs: number): number | null {
  if (sinceActivityMs < ACTIVE_MS) return 5_000;
  if (sinceActivityMs < IDLE_STOP_MS) return 30_000;
  return null;
}
