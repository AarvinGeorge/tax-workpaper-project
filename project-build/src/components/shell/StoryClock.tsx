'use client';
// The story clock in the Story time bar, for every role: a timeline dropdown grouped by stage and a separate
// "Move clock" button (a select never acts on change), and "Return to latest" when viewing the past. Each emits clock_moved.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RoleKey } from '@/domain/contracts';
import { postEvent } from './actions';

function useMove(ws: string, role: RoleKey, current: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const move = (to: string) => start(async () => {
    setErr(null);
    const r = await postEvent(ws, role, { type: 'clock_moved', payload: { to, from: current } });
    if (!r.ok) setErr(r.reason ?? 'Refused');
    router.refresh();
  });
  return { move, pending, err };
}

export function ClockControl({ ws, role, groups, current }: {
  ws: string; role: RoleKey; groups: { stage: string; options: { at: string; label: string }[] }[]; current: string;
}) {
  const { move, pending, err } = useMove(ws, role, current);
  const [to, setTo] = useState(current);
  return (
    <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); move(to); }}>
      <label className="row" style={{ gap: 6 }}>
        <span className="small muted">Move story time to</span>
        <select className="select" value={to} onChange={(e) => setTo(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g.stage} label={g.stage}>
              {g.options.map((o) => <option key={o.at + o.label} value={o.at}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <button className="btn primary" type="submit" disabled={pending || to === current}>{pending ? 'Moving' : 'Move clock'}</button>
      {err ? <span role="alert" className="warnline">Not saved: {err}</span> : null}
    </form>
  );
}

export function ReturnToLatest({ ws, role, current, latest }: { ws: string; role: RoleKey; current: string; latest: string }) {
  const { move, pending, err } = useMove(ws, role, current);
  return (
    <>
      <button type="button" className="btn primary" disabled={pending} onClick={() => move(latest)}>{pending ? 'Moving' : 'Return to latest'}</button>
      {err ? <span role="alert" className="warnline">Not saved: {err}</span> : null}
    </>
  );
}
