'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pollDelay } from './livePoll';

/**
 * Keeps tabs on the same workspace in step: every few seconds it asks the state API for the latest event number and
 * re-renders the page on the server only when something new was saved or the story clock moved (the packet is never re-sent).
 * The poll asks only for those two markers (head=1), runs every 5 s while someone is active, backs off to 30 s after two
 * idle minutes and stops after ten (pollDelay); an interaction or bringing the tab back into view polls at once.
 * So a window nobody touches for ten minutes stops following other tabs until it is clicked, scrolled or refocused.
 */
export function LiveRefresh({ ws, role, lastSeq, storyAt }: { ws: string; role: string; lastSeq: number; storyAt: string }) {
  const router = useRouter();
  const seen = useRef(lastSeq);
  const clock = useRef(storyAt);
  useEffect(() => { seen.current = lastSeq; }, [lastSeq]);
  useEffect(() => { clock.current = storyAt; }, [storyAt]);
  useEffect(() => {
    let busy = false;
    let gone = false; // set on unmount: a poll still in flight must not re-arm or refresh
    let timer: number | undefined;
    let lastActivity = Date.now();
    const schedule = () => {
      window.clearTimeout(timer);
      timer = undefined;
      if (gone) return;
      const wait = pollDelay(Date.now() - lastActivity);
      timer = wait === null ? undefined : window.setTimeout(tick, wait);
    };
    const tick = async () => {
      if (busy) return;
      if (document.visibilityState !== 'visible') { schedule(); return; }
      busy = true;
      try {
        const res = await fetch(`/api/w/${encodeURIComponent(ws)}/state?role=${encodeURIComponent(role)}&head=1`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) }); // a hung request cannot strand the poll
        if (res.ok && !gone) {
          const body = (await res.json()) as { lastSeq?: number; state?: { storyAt?: string } };
          // A role that cannot see the clock event itself (a client) still follows a clock move or a reset.
          const moved = typeof body.state?.storyAt === 'string' && body.state.storyAt !== clock.current;
          if ((typeof body.lastSeq === 'number' && body.lastSeq !== seen.current) || moved) {
            if (typeof body.lastSeq === 'number') seen.current = body.lastSeq;
            if (moved) clock.current = body.state!.storyAt!;
            lastActivity = Date.now(); // someone is working in another tab: stay quick
            router.refresh();
          }
        }
      } catch { /* offline: try again next tick */ } finally { busy = false; schedule(); }
    };
    // Activity resets the back-off; if the poll had stopped, it checks at once.
    const active = () => { const stopped = timer === undefined && !busy; lastActivity = Date.now(); if (stopped) void tick(); };
    const shown = () => { if (document.visibilityState !== 'visible') return; lastActivity = Date.now(); void tick(); };
    const activity = ['pointerdown', 'keydown', 'scroll', 'focus'] as const;
    const opts = { capture: true, passive: true }; // capture: scrolls inside the panes do not bubble to window
    schedule();
    const now = () => router.refresh();
    window.addEventListener('wp:refresh', now);
    document.addEventListener('visibilitychange', shown);
    for (const ev of activity) window.addEventListener(ev, active, opts);
    return () => {
      gone = true;
      window.clearTimeout(timer);
      window.removeEventListener('wp:refresh', now);
      document.removeEventListener('visibilitychange', shown);
      for (const ev of activity) window.removeEventListener(ev, active, opts);
    };
  }, [router, ws, role]);
  return null;
}
