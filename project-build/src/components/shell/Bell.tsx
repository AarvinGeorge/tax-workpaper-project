'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useReadState } from './readState';

/** One notice as the browser shows it. id is stable (see Notice in src/domain/notify.ts); items arrive newest first. */
export interface BellItem { id: string; at: string; text: string; when: string; href: string }

/**
 * Notifications for the person viewing: unread count, an inline panel (not a modal), and a toast when something new
 * arrives while this tab is open (the page re-renders on the 5 s poll, so other tabs' work and a moved story clock
 * show up here). No toast on first mount, and none when the clock goes back (a reset or a rewind): what reappears
 * then is not new. Read state is per person and workspace, kept in this browser (readState.ts).
 */
export function Bell({ ws, role, storyAt, items }: { ws: string; role: string; storyAt: string; items: BellItem[] }) {
  const { read, markRead } = useReadState(ws, role);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<BellItem | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const clock = useRef(storyAt);

  useEffect(() => {
    const rebase = () => { seen.current = null; };
    window.addEventListener('wp:reset', rebase);
    return () => window.removeEventListener('wp:reset', rebase);
  }, []);
  useEffect(() => {
    const back = new Date(storyAt).getTime() < new Date(clock.current).getTime();
    clock.current = storyAt;
    if (seen.current === null || back) { seen.current = new Set(items.map((x) => x.id)); return; }
    const fresh = items.filter((x) => !seen.current!.has(x.id));
    for (const x of items) seen.current.add(x.id);
    if (fresh.length) setToast(fresh[0]); // one toast, the newest; the rest wait in the panel and the unread count
  }, [items, storyAt]);
  useEffect(() => {
    // The open panel closes with Escape (focus returns to the bell) or a click anywhere outside it.
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const unread = items.filter((x) => !read.has(x.id));
  const label = unread.length ? `Notifications, ${unread.length} unread` : 'Notifications, none unread';

  return (
    <div className="bell" ref={root}>
      <button ref={button} type="button" className="btn bell-btn" data-testid="bell" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread.length > 0 && <span className="bell-count num" aria-hidden="true">{unread.length}</span>}
      </button>
      {open && (
        <div className="bell-panel" data-testid="bell-panel" role="region" aria-label="Notifications">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="lbl">Notifications</span>
            {unread.length > 0 && <button type="button" className="link" onClick={() => markRead(items.map((x) => x.id))}>Mark all read</button>}
          </div>
          {items.length === 0 && <p className="small muted">Nothing for you yet. When a colleague or client does something that needs you, it appears here.</p>}
          {items.map((x) => (
            <Link key={x.id} href={x.href} className={`bell-row${read.has(x.id) ? '' : ' unread'}`} onClick={() => { markRead([x.id]); setOpen(false); }}>
              <span>{x.text}</span><span className="small muted num">{x.when}</span>
            </Link>
          ))}
        </div>
      )}
      <div aria-live="polite" className="toast-slot">
        {toast && (
          <div className="toast" data-testid="toast">
            <span>{toast.text}</span>
            <Link href={toast.href} className="link" onClick={() => { markRead([toast.id]); setToast(null); }}>View</Link>
          </div>
        )}
      </div>
    </div>
  );
}
