'use client';
import { useEffect, useState, type ReactNode } from 'react';

const KEY = 'wp.startHere.dismissed';

/** The first-screen panel. Dismissed per browser; "Show Start here" brings it back. */
export function StartHere({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(window.localStorage.getItem(KEY) === '1'); } catch { /* storage blocked: keep it shown */ } }, []);
  const toggle = (h: boolean) => { setHidden(h); try { window.localStorage.setItem(KEY, h ? '1' : '0'); } catch { /* ignore */ } };
  if (hidden) return <div><button type="button" className="link" onClick={() => toggle(false)}>Show Start here</button></div>;
  return (
    <section className="start" aria-label="Start here" data-testid="start-here">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="lbl">Start here</span>
        <button type="button" className="btn" onClick={() => toggle(true)}>Dismiss</button>
      </div>
      {children}
    </section>
  );
}
