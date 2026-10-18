'use client';
// The "?" button and its centred native dialog. The content is server-rendered and passed in as children.
// Esc (native), the Close button or a click on the backdrop closes it; ?info=1 in the address opens it on load.
import { useEffect, useRef, type ReactNode } from 'react';

export function InfoDialog({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => { if (ref.current && !ref.current.open) ref.current.showModal(); };
  const close = () => ref.current?.close();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open && new URLSearchParams(window.location.search).get('info') === '1') d.showModal();
  }, []);
  const onClose = () => {
    // Drop ?info=1 so a reload does not reopen it.
    const u = new URL(window.location.href);
    if (u.searchParams.has('info')) { u.searchParams.delete('info'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash); }
  };
  return (
    <>
      <button type="button" className="info-btn" onClick={open}
        aria-label="About this workspace: demo, legends, deadlines, firm standards, people, time" title="Legends and reference">
        <span aria-hidden="true">?</span>
      </button>
      <dialog ref={ref} className="info-dlg" aria-labelledby="info-title" onClose={onClose}
        onClick={(e) => { if (e.target === ref.current || (e.target as HTMLElement).closest('a[href]')) close(); }}>
        <div className="info-in">
          <div className="info-top">
            <h2 id="info-title">About this workspace</h2>
            <button type="button" className="btn" onClick={close}>Close</button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
