// The one-line blocker count on the overview and Review: "N items stop filing", opening the full list on Checks at its
// first blocker. A blocker on the whole return (a blocking review note) lives on Review's notes tab, so when every
// blocker is one of those the line opens that tab instead. Once the return is approved by the firm's record or filed
// (closed), nothing stops it any more: the same checks read as open at filing.
import type { WorkspaceState } from '@/domain/contracts';
import { claimHref, screenPath } from '@/components/shell/lib';

export function blockerLine(ws: string, role: string, blockers: WorkspaceState['blockers'], closed = false): { text: string; href: string; where: 'Checks' | 'Review' } | null {
  if (!blockers.length) return null;
  const first = blockers.find((b) => b.claimId !== 'return');
  const n = blockers.length;
  return {
    text: closed ? openAtFiling(n) : `${n} item${n === 1 ? '' : 's'} stop${n === 1 ? 's' : ''} filing`,
    where: first ? 'Checks' : 'Review',
    href: first ? screenPath(ws, role, 'checks') + claimHref(first.claimId) : screenPath(ws, role, 'review') + '?tab=notes',
  };
}

/** The blocker count once approval or filing has happened: a fact about the record, not a stop. */
export const openAtFiling = (n: number) => `${n} open at filing`;
