'use client';
import { useLayoutEffect } from 'react';

// The row marked open (aria-current="true") on Checks, Forms or Documents; on Checks, a line or document claim opens
// the rows that sit on it or cite it (data-holds), and the first of them is the fallback.
const ROW = '[data-finding][aria-current="true"], tr[aria-current="true"], .docrow[aria-current="true"]';
const HOLDER = '[data-finding][data-holds]';

/** Brings the open item's row into view in the centre pane when its top is out of sight; a visible row never moves. Wide
 *  screens only: on phones the drawer is the target (RevealDrawerOnPhone). */
export function RevealSelected({ claim }: { claim: string | null }) {
  useLayoutEffect(() => {
    if (!claim || !window.matchMedia('(min-width: 900px)').matches) return;
    const pane = document.querySelector('.sh-pane-c');
    const row = pane?.querySelector(ROW) ?? pane?.querySelector(HOLDER);
    if (!pane || !row) return;
    const p = pane.getBoundingClientRect(), r = row.getBoundingClientRect();
    // Only when its top is out of sight: an opened row taller than the space below it must not move the list.
    if (r.top < p.top || r.top > p.bottom - 40) row.scrollIntoView({ block: r.height < p.height * 0.6 ? 'center' : 'start' });
  }, [claim]);
  return null;
}
