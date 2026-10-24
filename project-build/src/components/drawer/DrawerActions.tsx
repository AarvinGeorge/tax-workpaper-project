'use client';
import { useState } from 'react';
import type { EventType, RoleKey } from '@/domain/contracts';
import { postEvent } from '../shell/actions';
import { Term } from '../term/Term';

export interface ActionSpec {
  kind: Extract<EventType, 'adjustment' | 'verification' | 'signoff' | 'review_note' | 'question_to_client' | 'decision' | 'question_to_colleague'>;
  label: string; ok: boolean; reason?: string; level: string; current: unknown;
}

interface Props {
  ws: string; role: RoleKey; claimId: string; baseVersion: number; actions: ActionSpec[]; frozen: boolean;
  reveal: { ok: boolean; reason?: string; items: { valueId: string; label: string; revealed: boolean }[] } | null;
  clients: { key: RoleKey; name: string }[]; colleagues: { key: RoleKey; name: string }[]; methods: string[];
  assign: { ok: boolean; reason?: string; current: string | null; staff: { key: RoleKey; name: string }[] };
  title: string; // what every action below applies to
}

const DECISIONS = [['judgment', 'Judgment call'], ['election', 'Election'], ['due_diligence', 'Due diligence'], ['penalty', 'Penalty']] as const;

/** Inline action panels (no modals). The server re-checks every action; a refusal is shown in words. */
export function DrawerActions(p: Props) {
  const [open, setOpen] = useState<ActionSpec['kind'] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const spec = p.actions.find((a) => a.kind === open);

  async function send(type: EventType, payload: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const r = await postEvent(p.ws, p.role, { type, claimId: p.claimId, payload, baseVersion: p.baseVersion });
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: done }); setOpen(null); setF({}); } else setMsg({ ok: false, text: r.reason ?? 'Refused.' });
  }

  function submit() {
    if (!spec) return;
    const need = (k: string, label: string) => { if (!f[k]?.trim()) { setMsg({ ok: false, text: `${label} is required.` }); return false; } return true; };
    switch (spec.kind) {
      case 'adjustment': {
        if (!need('value', 'A new value') || !need('reason', 'A reason')) return;
        const n = Number(f.value.replace(/[,\s]/g, ''));
        const value = Number.isFinite(n) && /^-?[\d,.\s]+$/.test(f.value) ? n : f.value;
        return send('adjustment', { value, reason: f.reason, authority: f.authority ?? '' }, spec.level === 'preparer' ? 'Adjustment proposed and saved; a reviewer applies it. The original value is kept.' : 'Adjustment applied and saved. The original value is kept.');
      }
      case 'verification':
        if (!need('note', 'A note on what you checked')) return;
        return send('verification', { method: f.method || p.methods[0], note: f.note ?? '' }, 'Verification recorded.');
      case 'signoff':
        if (!need('note', 'What you checked')) return;
        return send('signoff', { note: f.note }, `Signed off as ${spec.level}. It goes stale if the value changes.`);
      case 'review_note':
        if (!need('text', 'The note')) return;
        return send('review_note', { text: f.text, blocking: f.blocking === 'yes' }, 'Review note saved.');
      case 'question_to_client':
        if (!need('text', 'The question')) return;
        return send('question_to_client', { to: f.to || p.clients[0]?.key, text: f.text }, 'Question sent to the client.');
      case 'decision':
        if (!need('text', 'The decision') || !need('authority', 'The authority relied on')) return;
        return send('decision', { kind: f.kind || 'judgment', text: f.text, authority: f.authority }, 'Decision recorded with its authority.');
      case 'question_to_colleague':
        if (!need('text', 'The question')) return;
        return send('question_to_colleague', { to: f.to || p.colleagues[0]?.key, text: f.text }, 'Question sent. It does not block or sign anything.');
    }
  }

  return (
    <div className="drw-sec" data-testid="drawer-actions">
      <span className="lbl">Actions</span>
      <span className="small" data-testid="acting-on">Acting on: <strong>{p.title}</strong></span>
      {p.frozen && <span className="small muted">As filed, locked: value changes are refused; amend on top.<Term k="amend-on-top" /></span>}
      <div className="drw-acts">
        {p.actions.map((a) => (
          <button key={a.kind} type="button" className={`btn${open === a.kind ? ' on' : ''}`} aria-disabled={!a.ok} aria-expanded={open === a.kind}
            title={a.ok ? undefined : a.reason}
            onClick={() => { if (!a.ok) { setMsg({ ok: false, text: a.reason ?? 'Not allowed for this role.' }); return; } setMsg(null); setOpen(open === a.kind ? null : a.kind); }}>
            {a.label}
          </button>
        ))}
      </div>

      {spec && (
        <div className="drw-panel" role="group" aria-label={spec.label}>
          {spec.kind === 'adjustment' && <>
            <label className="lbl" htmlFor="adj-v">New value</label><input id="adj-v" className="field num" value={f.value ?? ''} onChange={set('value')} inputMode="decimal" />
            <label className="lbl" htmlFor="adj-r">Reason</label><textarea id="adj-r" className="field" rows={2} value={f.reason ?? ''} onChange={set('reason')} />
            <label className="lbl" htmlFor="adj-a">Authority or evidence</label><input id="adj-a" className="field" value={f.authority ?? ''} onChange={set('authority')} placeholder="e.g. D68 payment designated tax year 2024" />
            <span className="small muted">{spec.level === 'preparer' ? 'Saved as proposed; the reviewer or partner applies it as firm policy says.' : 'Saved as applied.'} The tax effect is estimated from the engine&apos;s rates.</span>
          </>}
          {spec.kind === 'verification' && <>
            <span><label className="lbl" htmlFor="ver-m">Method (the firm&apos;s verification types)</label><Term k="verification" /></span>
            <select id="ver-m" className="field" value={f.method ?? p.methods[0] ?? ''} onChange={set('method')}>{p.methods.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}</select>
            <label className="lbl" htmlFor="ver-n">Note (required)</label><input id="ver-n" className="field" value={f.note ?? ''} onChange={set('note')} />
          </>}
          {spec.kind === 'signoff' && <>
            <label className="lbl" htmlFor="so-n">What you checked (required)</label><textarea id="so-n" className="field" rows={2} value={f.note ?? ''} onChange={set('note')} placeholder="What you checked before signing off" />
            <span className="small">You sign off the value as it stands now. If it changes later, this sign-off is marked stale.</span>
          </>}
          {spec.kind === 'review_note' && <>
            <label className="lbl" htmlFor="rn-t">Note</label><textarea id="rn-t" className="field" rows={3} value={f.text ?? ''} onChange={set('text')} />
            <label className="row small"><input type="checkbox" checked={f.blocking === 'yes'} onChange={(e) => setF((x) => ({ ...x, blocking: e.target.checked ? 'yes' : '' }))} /> Blocking: open blocking notes stop approval</label>
          </>}
          {(spec.kind === 'question_to_client' || spec.kind === 'question_to_colleague') && <>
            <label className="lbl" htmlFor="q-to">To</label>
            <select id="q-to" className="field" value={f.to ?? ''} onChange={set('to')}>
              {(spec.kind === 'question_to_client' ? p.clients : p.colleagues).map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
            <label className="lbl" htmlFor="q-t">Question</label><textarea id="q-t" className="field" rows={3} value={f.text ?? ''} onChange={set('text')} />
            {spec.kind === 'question_to_client' && <span className="small muted">Write in plain words; the client sees only this question.</span>}
            {spec.kind === 'question_to_colleague' && <span className="small muted">Not a review note: it does not block, send back or sign anything.</span>}
          </>}
          {spec.kind === 'decision' && <>
            <span><label className="lbl" htmlFor="d-k">Kind</label><Term k="election" /></span>
            <select id="d-k" className="field" value={f.kind ?? 'judgment'} onChange={set('kind')}>{DECISIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <label className="lbl" htmlFor="d-t">Decision</label><textarea id="d-t" className="field" rows={2} value={f.text ?? ''} onChange={set('text')} />
            <label className="lbl" htmlFor="d-a">Authority relied on</label><input id="d-a" className="field" value={f.authority ?? ''} onChange={set('authority')} />
          </>}
          <div className="row">
            <button type="button" className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Saving' : spec.kind === 'signoff' ? 'Sign off' : 'Save'}</button>
            <button type="button" className="link" onClick={() => { setOpen(null); setMsg(null); }}>Close</button>
          </div>
        </div>
      )}

      <div className="row small" data-testid="assign">
        <span className="lbl">Assigned to</span>
        <span data-testid="assignee">{p.assign.current ?? 'No one yet'}</span>
        {p.assign.ok ? (
          <>
            <select id="as-to" className="field" style={{ width: 'auto' }} value={f.assignTo ?? ''} onChange={set('assignTo')} aria-label="Assign to">
              <option value="">Assign to</option>
              {p.assign.staff.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
            </select>
            <button type="button" className="btn" disabled={busy || !f.assignTo}
              onClick={() => { const to = f.assignTo; void send('assignment', { to }, `Assigned to ${p.assign.staff.find((x) => x.key === to)?.name ?? to}. They are notified.`); }}>
              Assign
            </button>
          </>
        ) : <span className="muted">{p.assign.reason}</span>}
      </div>

      {p.reveal && (
        <div className="drw-sec">
          <span className="lbl">Identifiers on this document</span>
          {p.reveal.items.map((it) => (
            <div key={it.valueId} className="row small">
              <span style={{ minWidth: 140 }}>{it.label}</span>
              <span className={`tag ${it.revealed ? 't-wrn' : 't-mut'}`}>{it.revealed ? 'Revealed, logged' : 'Masked, last 4'}</span>
              {!it.revealed && <button type="button" className="btn" aria-disabled={!p.reveal!.ok} data-testid="reveal"
                title={p.reveal!.ok ? 'Unmask; the view is logged' : p.reveal!.reason}
                onClick={() => { if (!p.reveal!.ok) { setMsg({ ok: false, text: p.reveal!.reason ?? 'Refused.' }); return; } void send('reveal', { what: it.valueId }, 'Revealed for you; the view is logged (who, which, when; never the value).'); }}>
                Reveal
              </button>}
            </div>
          ))}
          {!p.reveal.ok && <span className="small muted" data-testid="reveal-reason">{p.reveal.reason}</span>}
        </div>
      )}

      <div role="status" aria-live="polite" className={msg ? (msg.ok ? 'small muted' : 'errline') : 'small'} style={{ minHeight: 18 }}>{msg?.text}</div>
    </div>
  );
}
