'use client';
import { useEffect, useId, useRef, useState } from 'react';

/**
 * The client and return in the header, as a switcher for firm staff (a disclosure: a button that shows a short list).
 * Today the workspace holds one return; the list shows it and a designed "Add a new client" (each return would be a
 * packet in encrypted storage, opened by its fingerprint after sign-in; see docs/handin/design-many-returns.md).
 * Nothing here loads data.
 */
export function ClientSwitcher({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const noteId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <div className="client-sw" ref={root}
      onBlur={(e) => { if (open && !root.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button ref={button} type="button" className="client-sw-btn" aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen(!open)}>
        <span className="vh">Client and return: </span><span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open ? (
        <div className="client-sw-menu" id={panelId} data-testid="client-menu">
          <div className="lbl" style={{ padding: '4px 8px' }}>Returns</div>
          <div className="client-sw-item current" aria-current="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            <span>{label}</span>
          </div>
          <button type="button" className="client-sw-item add" disabled aria-describedby={noteId}>
            <span aria-hidden="true">+</span><span>Add a new client</span>
          </button>
          <p className="small muted client-sw-note" id={noteId}>Designed, not built: each return would be a packet in encrypted storage, opened by its fingerprint after sign-in.</p>
        </div>
      ) : null}
    </div>
  );
}
