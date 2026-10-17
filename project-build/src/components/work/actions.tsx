'use client';
// Client controls for the work screens. Every write goes through the shell's postEvent helper (server validates role
// and policy, appends one event); the page then re-renders from the server.
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
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
      for (const e of events) {
        const r = await postEvent(ws, role, e);
        if (!r.ok) { setErr(r.reason ?? 'Refused'); break; }
      }
      after?.();
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
export function TextAction({ ws, role, label, placeholder, build, disabledReason, extra }: {
  ws: string; role: RoleKey; label: string; placeholder: string; build: { type: Ev['type']; claimId?: string; payload: Record<string, unknown>; field: string };
  disabledReason?: string | null; extra?: { name: string; label: string }[];
}) {
  const { send, pending, err } = useSend(ws, role);
  const [text, setText] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  if (disabledReason) return <span className={s.note}>{label}: {disabledReason}</span>;
  return (
    <form className={s.row} style={{ gap: 8 }} onSubmit={(e) => {
      e.preventDefault();
      if (!text.trim()) return;
      send([{ type: build.type, claimId: build.claimId, payload: { ...build.payload, ...flags, [build.field]: text.trim() } }], () => setText(''));
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
      <button className={`${s.btn} ${s.small}`} type="submit" disabled={pending || !text.trim()}>{pending ? 'Saving' : 'Save'}</button>
      <Refusal err={err} />
    </form>
  );
}

/** Bulk sign-off: checkboxes on rows (rendered by the server), one button, one shared groupId so one undo reverses all. */
export function BulkSignoff({ ws, role, level, items, disabledReason, children }: {
  ws: string; role: RoleKey; level: string; items: { claimId: string; value: string; title: string }[]; disabledReason?: string | null; children?: ReactNode;
}) {
  const { send, pending, err } = useSend(ws, role);
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  return (
    <div className={s.box}>
      <div role="toolbar" aria-label="Bulk actions" className={s.boxRow} style={{ background: 'var(--accsoft)', alignItems: 'center' }}>
        <strong className={s.num} style={{ fontSize: 13 }}>{sel.length} selected</strong>
        <button type="button" className={`${s.btn} ${s.small} ${s.primary}`} disabled={!!disabledReason || pending || sel.length === 0}
          title={disabledReason ?? undefined}
          onClick={() => {
            const groupId = 'bulk-' + Date.now().toString(36);
            send(items.filter((i) => sel.includes(i.claimId)).map((i) => ({ type: 'signoff', claimId: i.claimId, groupId, payload: { level, bulk: true } })), () => setSel([]));
          }}>
          {pending ? 'Saving' : `Sign off selected as ${level}`}
        </button>
        <button type="button" className={`${s.btn} ${s.small}`} onClick={() => setSel([])} disabled={sel.length === 0}>Clear</button>
        <span className={s.note}>{disabledReason ?? 'Every bulk action can be undone in one step.'}</span>
        <Refusal err={err} />
      </div>
      {children}
      {items.length ? (
        <fieldset className={s.boxRow} style={{ border: 0, margin: 0 }} disabled={!!disabledReason}>
          <legend className={s.lbl} style={{ padding: '0 0 6px' }}>Select for sign-off</legend>
          {items.map((i) => (
            <label key={i.claimId} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, flex: '1 1 300px' }}>
              <input type="checkbox" checked={sel.includes(i.claimId)} onChange={() => toggle(i.claimId)} aria-label={`Select ${i.title}`} />
              {i.title}
            </label>
          ))}
        </fieldset>
      ) : null}
    </div>
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
