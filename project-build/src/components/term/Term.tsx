'use client';
// A small "?" after a hard term. Hover, focus or tap opens a short explanation from TERMS; Escape, an outside click or
// moving focus away closes it. Only the first mark for a term on the screen shows: a later duplicate renders nothing.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { TERMS, formTermKey } from './terms';
import s from './Term.module.css';

const GAP = 6;
const EDGE = 16;

export function Term({ k }: { k: string }) {
  const t = TERMS[k];
  const auto = useId();
  const id = 'term-' + auto.replace(/[^a-zA-Z0-9_-]/g, '');
  const btn = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dup, setDup] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({ left: 0, top: 0, visibility: 'hidden' });

  // First use on the screen wins: hide this mark when an earlier one for the same term is already on the page.
  useLayoutEffect(() => {
    const me = btn.current;
    if (!me) return;
    // The "?" dialog is its own screen: its marks and the page's are counted apart.
    const scope = me.closest('dialog');
    const first = [...document.querySelectorAll(`[data-term="${CSS.escape(k)}"]`)].find((el) => el.closest('dialog') === scope);
    if (first && first !== me) setDup(true);
  }, [k]);

  const close = useCallback(() => { setOpen(false); setPinned(false); }, []);
  const cancelHover = () => { if (hoverTimer.current) { window.clearTimeout(hoverTimer.current); hoverTimer.current = null; } };
  const leaveSoon = () => { cancelHover(); if (!pinned) hoverTimer.current = window.setTimeout(() => setOpen(false), 150); };

  // Place below the mark (above when there is no room), kept inside the viewport at phone width.
  useLayoutEffect(() => {
    if (!open || !btn.current || !tip.current) return;
    const b = btn.current.getBoundingClientRect();
    const w = tip.current.offsetWidth;
    const h = tip.current.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const left = Math.max(EDGE, Math.min(b.left + b.width / 2 - w / 2, vw - w - EDGE));
    const below = b.bottom + GAP;
    const top = below + h > vh - EDGE && b.top - GAP - h > EDGE ? b.top - GAP - h : below;
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); } };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!btn.current?.contains(n) && !tip.current?.contains(n)) close();
    };
    const onScroll = () => close();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  useEffect(() => () => cancelHover(), []);

  if (!t || dup) return null;
  const onClick = (e: MouseEvent) => {
    // Inside a <summary> the click would also open or close the section.
    e.preventDefault();
    e.stopPropagation();
    if (pinned) close(); else { setOpen(true); setPinned(true); }
  };

  return (
    <span className={s.wrap}>
      <button ref={btn} type="button" className={s.mark} data-term={k}
        aria-label={`What is ${t.label}?`} aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={onClick}
        onMouseEnter={() => { cancelHover(); setOpen(true); }}
        onMouseLeave={leaveSoon}
        onFocus={() => setOpen(true)}
        onBlur={(e) => { if (!tip.current?.contains(e.relatedTarget as Node)) close(); }}>
        <span aria-hidden="true" className={s.dot}>?</span>
      </button>
      {open ? (
        <span ref={tip} id={id} role="tooltip" tabIndex={-1} className={s.tip} style={{ ...pos, position: 'fixed' }}
          onMouseEnter={cancelHover} onMouseLeave={leaveSoon}>
          <strong className={s.label}>{t.label}</strong> {t.text}
        </span>
      ) : null}
    </span>
  );
}

/** The mark for a form code shown as a dynamic label (Return, Areas); nothing when the form has no term. */
export function FormTerm({ code }: { code: string }) {
  const k = formTermKey(code);
  return k ? <Term k={k} /> : null;
}

export default Term;
