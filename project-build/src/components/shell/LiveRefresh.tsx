'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps tabs on the same workspace in step: every few seconds it asks the state API for the latest event number and
 * re-renders the page on the server only when something new was saved (the packet is never re-sent).
 */
export function LiveRefresh({ ws, role, lastSeq, every = 5000 }: { ws: string; role: string; lastSeq: number; every?: number }) {
  const router = useRouter();
  const seen = useRef(lastSeq);
  useEffect(() => { seen.current = lastSeq; }, [lastSeq]);
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const res = await fetch(`/api/w/${encodeURIComponent(ws)}/state?role=${encodeURIComponent(role)}&after=${seen.current}`, { cache: 'no-store' });
        if (res.ok) {
          const body = (await res.json()) as { lastSeq?: number };
          if (typeof body.lastSeq === 'number' && body.lastSeq !== seen.current) { seen.current = body.lastSeq; router.refresh(); }
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
