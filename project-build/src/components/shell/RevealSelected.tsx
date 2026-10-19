'use client';
import { useLayoutEffect } from 'react';

// The row marked open (aria-current="true") on Checks (an item), Forms or Documents; on Checks, a line or document
// claim opens the items that sit on it or cite it (data-holds), and the first of them is the fallback.
const ROW = '[data-item][aria-current="true"], tr[aria-current="true"], .docrow[aria-current="true"]';
const HOLDER = '[data-item][data-holds]';

/** Brings the open item's row into view in the centre pane when none of it is in sight; a visible row never moves. Wide
 *  screens only: on phones the drawer is the target (RevealDrawerOnPhone). */
export function RevealSelected({ claim }: { claim: string | null }) {
  useLayoutEffect(() => {
    if (!claim || !window.matchMedia('(min-width: 900px)').matches) return;
    const pane = document.querySelector('.sh-pane-c');
    const row = pane?.querySelector(ROW) ?? pane?.querySelector(HOLDER);
    if (!pane || !row) return;
    const p = pane.getBoundingClientRect(), r = row.getBoundingClientRect();
    // Only when no part of it is in sight: a tall opened row the reader is inside must not move the list.
    if (r.bottom < p.top + 40 || r.top > p.bottom - 40) row.scrollIntoView({ block: r.height < p.height * 0.6 ? 'center' : 'start' });
  }, [claim]);
  return null;
}
