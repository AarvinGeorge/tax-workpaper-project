'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps tabs on the same workspace in step: every few seconds it asks the state API for the latest event number and
 * re-renders the page on the server only when something new was saved or the story clock moved (the packet is never re-sent).
 */
export function LiveRefresh({ ws, role, lastSeq, storyAt, every = 5000 }: { ws: string; role: string; lastSeq: number; storyAt: string; every?: number }) {
  const router = useRouter();
  const seen = useRef(lastSeq);
  const clock = useRef(storyAt);
  useEffect(() => { seen.current = lastSeq; }, [lastSeq]);
  useEffect(() => { clock.current = storyAt; }, [storyAt]);
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const res = await fetch(`/api/w/${encodeURIComponent(ws)}/state?role=${encodeURIComponent(role)}&after=${seen.current}`, { cache: 'no-store' });
        if (res.ok) {
          const body = (await res.json()) as { lastSeq?: number; state?: { storyAt?: string } };
          // A role that cannot see the clock event itself (a client) still follows a clock move or a reset.
          const moved = typeof body.state?.storyAt === 'string' && body.state.storyAt !== clock.current;
          if ((typeof body.lastSeq === 'number' && body.lastSeq !== seen.current) || moved) {
            if (typeof body.lastSeq === 'number') seen.current = body.lastSeq;
            if (moved) clock.current = body.state!.storyAt!;
            router.refresh();
          }
        }
      } catch { /* offline: try again next tick */ } finally { busy = false; }
    };
    const id = window.setInterval(tick, every);
    const now = () => router.refresh();
    window.addEventListener('wp:refresh', now);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(id); window.removeEventListener('wp:refresh', now); document.removeEventListener('visibilitychange', tick); };
  }, [router, ws, role, every]);
  return null;
}
