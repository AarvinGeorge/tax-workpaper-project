'use client';
// Client controls for the work screens. Every write goes through the shell's postEvent helper (server validates role
// and policy, appends one event); the page then re-renders from the server.
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from 'react';
import type { NewEvent, RoleKey } from '@/domain/contracts';
import { postEvent } from '@/components/shell/actions';
import s from './work.module.css';

type Ev = Omit<NewEvent, 'ws' | 'role' | 'storyAt'>;

function useSend(ws: string, role: RoleKey) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const send = (events: Ev[], after?: () => void) =>
    start(async () => {
      setErr(null);
      let ok = true;
      for (const e of events) {
        const r = await postEvent(ws, role, e);
        if (!r.ok) { setErr(r.reason ?? 'Refused'); ok = false; break; }
      }
      if (ok) after?.(); // a refusal keeps what the person typed
      router.refresh();
    });
  return { send, pending, err };
}

function Refusal({ err }: { err: string | null }) {
  return err ? <span role="alert" className={`${s.tag} ${s['t-wrn']}`} style={{ whiteSpace: 'normal' }}>Not saved: {err}</span> : null;
}

/** One button, one or more events. Disabled with a visible reason when the UI already knows policy refuses. */
export function EventButton({ ws, role, events, label, disabledReason, primary, small }: {
  ws: string; role: RoleKey; events: Ev[]; label: string; disabledReason?: string | null; primary?: boolean; small?: boolean;
}) {
  const { send, pending, err } = useSend(ws, role);
  return (
    <span className={s.row} style={{ gap: 8 }}>
      <button type="button" className={`${s.btn} ${primary ? s.primary : ''} ${small ? s.small : ''}`}
        disabled={!!disabledReason || pending} title={disabledReason ?? undefined} onClick={() => send(events)}>
        {pending ? 'Saving' : label}
      </button>
      {disabledReason ? <span className={s.note}>{disabledReason}</span> : null}
      <Refusal err={err} />
    </span>
  );
}

/** A short form with one required text field (reason, note, question) that emits one event built from the text. */
export function TextAction({ ws, role, label, placeholder, build, disabledReason, extra, submitLabel }: {
  ws: string; role: RoleKey; label: string; placeholder: string; build: { type: Ev['type']; claimId?: string; baseVersion?: number; payload: Record<string, unknown>; field: string };
  disabledReason?: string | null; extra?: { name: string; label: string }[]; submitLabel?: string;
}) {
  const { send, pending, err } = useSend(ws, role);
  const [text, setText] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  if (disabledReason) return <span className={s.note}>{label}: {disabledReason}</span>;
  return (
    <form className={s.row} style={{ gap: 8 }} onSubmit={(e) => {
      e.preventDefault();
      if (!text.trim()) return;
      send([{ type: build.type, claimId: build.claimId, ...(build.baseVersion !== undefined ? { baseVersion: build.baseVersion } : {}), payload: { ...build.payload, ...flags, [build.field]: text.trim() } }], () => setText(''));
    }}>
      <label className={s.row} style={{ gap: 6, flex: '1 1 260px' }}>
        <span className={s.note}>{label}</span>
        <input className={s.input} style={{ flex: '1 1 200px' }} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      </label>
      {(extra ?? []).map((x) => (
        <label key={x.name} className={s.note} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={!!flags[x.name]} onChange={(e) => setFlags({ ...flags, [x.name]: e.target.checked })} /> {x.label}
        </label>
      ))}
      <button className={`${s.btn} ${s.small}`} type="submit" disabled={pending || !text.trim()}>{pending ? 'Saving' : submitLabel ?? 'Save'}</button>
      <Refusal err={err} />
    </form>
  );
}

/**
 * Sign-off inside the Checks table: one selection shared by the row checkboxes, the per-group select-all and the bar.
 * Every selected row needs its own note on what was checked (written in the row, kept here until sent). Signing with a note missing
 * sends nothing: the first such row opens, scrolls into view and takes focus. Otherwise one signoff event per row goes
 * out under one groupId, each with its note, so a single undo reverses the batch.
 */
type Pick = { sel: string[]; set: (ids: string[]) => void; signable: Set<string>; notes: Record<string, string>; note: (id: string, t: string) => void };
const SignoffCtx = createContext<Pick | null>(null);
const rowEl = (id: string) => document.querySelector<HTMLElement>(`[data-finding="${CSS.escape(id.replace(/^finding:/, ''))}"]`);

export function SignoffScope({ ws, role, level, items, blockers, children }: {
  ws: string; role: RoleKey; level: string; items: string[]; blockers: string[]; children: ReactNode;
}) {
  const { send, pending, err } = useSend(ws, role);
  const [sel, setSel] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState(false);
  const signable = new Set(items);
  const key = items.join('|');
  useEffect(() => {
    const keep = new Set(key ? key.split('|') : []);
    setSel((x) => x.filter((id) => keep.has(id)));
    setNotes((n) => Object.fromEntries(Object.entries(n).filter(([k]) => keep.has(k))));
  }, [key]);
  const live = sel.filter((id) => signable.has(id));
  const toHeading = () => requestAnimationFrame(() => document.getElementById('chk-ours')?.focus());
  const missing = live.filter((id) => !(notes[id] ?? '').trim());
  const nBlk = live.filter((id) => blockers.includes(id)).length;
  const signSelected = () => {
    if (missing.length) {
      setAsk(true);
      const row = rowEl(missing[0]);
      const det = row?.querySelector('details');
      if (det) det.open = true;
      row?.scrollIntoView({ block: 'center' });
      requestAnimationFrame(() => row?.querySelector<HTMLInputElement>('[data-signoff-note]')?.focus());
      return;
    }
    const groupId = 'bulk-' + Date.now().toString(36);
    send(live.map((claimId) => ({ type: 'signoff', claimId, groupId, payload: { level, bulk: true, note: notes[claimId].trim() } })),
      () => { setSel([]); setNotes((n) => Object.fromEntries(Object.entries(n).filter(([k]) => !live.includes(k)))); setAsk(false); toHeading(); });
  };
  return (
    <SignoffCtx.Provider value={{ sel: live, set: setSel, signable, notes, note: (id, t) => setNotes((n) => ({ ...n, [id]: t })) }}>
      {children}
      {live.length ? (
        <div role="toolbar" aria-label="Sign off the selected rows" className={`${s.box} ${s.boxRow}`} style={{ background: 'var(--accsoft)', alignItems: 'center', position: 'sticky', bottom: 0, zIndex: 1 }}>
          <strong className={s.num} style={{ fontSize: 13 }}>{live.length} selected</strong>
          <span className={s.note} aria-live="polite" style={ask && missing.length ? { color: 'var(--wrn)', fontWeight: 600 } : undefined}>
            {missing.length
              ? `${missing.length} selected ${missing.length === 1 ? 'row needs' : 'rows need'} a note on what you checked${ask ? '; opened the first one' : ''}`
              : 'Every selected row says what you checked'}
          </span>
          <span style={{ flex: '1 1 auto' }} />
          <button type="button" className={`${s.btn} ${s.small} ${s.primary}`} disabled={pending} onClick={signSelected}>
            {pending ? 'Saving' : `Sign off selected (${live.length})`}
          </button>
          <button type="button" className={`${s.btn} ${s.small}`} onClick={() => { setSel([]); setAsk(false); toHeading(); }}>Clear</button>
          {nBlk ? <span className={s.note} style={{ flex: '1 1 100%', color: 'var(--wrn)' }}>{nBlk === 1 ? '1 of these is a blocker' : `${nBlk} of these are blockers`}: your sign-off is recorded, and {nBlk === 1 ? 'it keeps' : 'they keep'} blocking approval until adjusted or cleared.</span> : null}
        </div>
      ) : null}
      <Refusal err={err} />
    </SignoffCtx.Provider>
  );
}

/** Below the three-pane width the drawer stacks above the list: when a claim opens without a reload, show it. */
export function RevealDrawerOnPhone({ claim }: { claim: string | null }) {
  useEffect(() => {
    if (!claim || !window.matchMedia('(max-width: 899.98px)').matches) return;
    document.querySelector('[data-testid="drawer"]')?.scrollIntoView({ block: 'start' });
  }, [claim]);
  return null;
}

/** The row's sign-off note (what you checked), inside the expanded row; only for rows this role can still sign. */
export function SignoffNote({ id, level }: { id: string; level: string }) {
  const c = useContext(SignoffCtx);
  if (!c || !c.signable.has(id)) return null;
  const v = c.notes[id] ?? '';
  return (
    <label className={s.row} style={{ gap: 6 }}>
      <span className={s.note}>What you checked <span className={s.lbl}>required</span></span>
      <input className={s.input} data-signoff-note="" style={{ flex: '1 1 260px', minWidth: 0 }} value={v}
        placeholder={`What you checked before signing off as ${level}`}
        onChange={(e) => { c.note(id, e.target.value); if (e.target.value.trim() && !c.sel.includes(id)) c.set([...c.sel, id]); }} />
    </label>
  );
}

export function RowSelect({ id, title }: { id: string; title: string }) {
  const c = useContext(SignoffCtx);
  if (!c || !c.signable.has(id)) return <span />;
  const on = c.sel.includes(id);
  return <input type="checkbox" className={s.pick} checked={on} aria-label={`Select ${title}`}
    onChange={() => c.set(on ? c.sel.filter((x) => x !== id) : [...c.sel, id])} />;
}

/** Select-all for one group (Blocker, Check, Judgment, Info): only the rows that can still be signed. */
export function GroupSelect({ ids, word, children }: { ids: string[]; word: string; children: ReactNode }) {
  const c = useContext(SignoffCtx);
  const can = c ? ids.filter((id) => c.signable.has(id)) : [];
  if (!c || !can.length) return <>{children}</>;
  const on = can.filter((id) => c.sel.includes(id)).length;
  return (
    <>
      <input type="checkbox" className={s.pick} checked={on === can.length} aria-label={`Select all ${word} rows`}
        ref={(el) => { if (el) el.indeterminate = on > 0 && on < can.length; }}
        onChange={() => c.set(on === can.length ? c.sel.filter((x) => !can.includes(x)) : [...c.sel.filter((x) => !can.includes(x)), ...can])} />
      {children}
      {on ? <span className={s.note}>{on} of {can.length} selected</span> : null}
    </>
  );
}

/** Story clock: move to any timeline event (emits clock_moved). */
export function ClockControl({ ws, role, options, current, disabledReason }: {
  ws: string; role: RoleKey; options: { at: string; label: string }[]; current: string; disabledReason?: string | null;
}) {
  const { send, pending, err } = useSend(ws, role);
  const [to, setTo] = useState(current);
  return (
    <form className={s.row} onSubmit={(e) => { e.preventDefault(); send([{ type: 'clock_moved', payload: { to, from: current } }]); }}>
      <label className={s.row} style={{ gap: 6 }}>
        <span className={s.note}>Move story time to</span>
        <select className={s.input} value={to} onChange={(e) => setTo(e.target.value)} disabled={!!disabledReason}>
          {options.map((o) => <option key={o.at + o.label} value={o.at}>{o.label}</option>)}
        </select>
      </label>
      <button className={`${s.btn} ${s.small} ${s.primary}`} type="submit" disabled={!!disabledReason || pending || to === current}>{pending ? 'Moving' : 'Move clock'}</button>
      {disabledReason ? <span className={s.note}>{disabledReason}</span> : null}
      <Refusal err={err} />
    </form>
  );
}

/** Time against budget: log hours to one budget area (emits time_logged). */
export function TimeForm({ ws, role, areas, disabledReason }: { ws: string; role: RoleKey; areas: { key: string; label: string }[]; disabledReason?: string | null }) {
  const { send, pending, err } = useSend(ws, role);
  const [area, setArea] = useState(areas[0]?.key ?? '');
  const [hours, setHours] = useState('');
  if (disabledReason) return <span className={s.note}>{disabledReason}</span>;
  const h = Number(hours);
  return (
    <form className={s.row} onSubmit={(e) => { e.preventDefault(); if (h > 0) send([{ type: 'time_logged', payload: { area, hours: h } }], () => setHours('')); }}>
      <label className={s.row} style={{ gap: 6 }}><span className={s.note}>Area</span>
        <select className={s.input} value={area} onChange={(e) => setArea(e.target.value)}>
          {areas.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
      </label>
      <label className={s.row} style={{ gap: 6 }}><span className={s.note}>Hours</span>
        <input className={s.input} style={{ width: 90 }} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
      </label>
      <button className={`${s.btn} ${s.small}`} type="submit" disabled={pending || !(h > 0)}>{pending ? 'Saving' : 'Log time'}</button>
      <Refusal err={err} />
    </form>
  );
}
