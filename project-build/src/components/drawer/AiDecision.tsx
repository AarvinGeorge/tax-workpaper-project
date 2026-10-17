'use client';
// Accept or dismiss an AI suggestion (dismiss asks for a reason). The server re-checks role and policy.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RoleKey } from '@/domain/contracts';
import { postEvent } from '../shell/actions';

export function AiDecision({ ws, role, claimId, status, ok, reason }: {
  ws: string; role: RoleKey; claimId: string; status: 'needs_review' | 'accepted' | 'dismissed'; ok: boolean; reason?: string;
}) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(type: 'suggestion_accepted' | 'suggestion_dismissed', payload: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const r = await postEvent(ws, role, { type, claimId, payload });
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: done }); setDismissing(false); setWhy(''); router.refresh(); } else setMsg({ ok: false, text: r.reason ?? 'Refused.' });
  }

  if (!ok) return <div className="drw-sec"><span className="lbl">Review</span><span className="small muted">{reason ?? 'Read only.'}</span></div>;
  return (
    <div className="drw-sec" data-testid="ai-decision">
      <span className="lbl">Review this suggestion</span>
      <div className="drw-acts">
        {status !== 'accepted' && (
          <button type="button" className="btn primary" disabled={busy} onClick={() => void send('suggestion_accepted', {}, 'Accepted. It stays in the Checks inbox, labelled.')}>Accept</button>
        )}
        {status !== 'dismissed' && (
          <button type="button" className={`btn${dismissing ? ' on' : ''}`} aria-expanded={dismissing} disabled={busy} onClick={() => { setDismissing(!dismissing); setMsg(null); }}>Dismiss</button>
        )}
      </div>
      {dismissing && (
        <div className="drw-panel" role="group" aria-label="Dismiss">
          <label className="lbl" htmlFor="ai-why">Why it needs no action</label>
          <textarea id="ai-why" className="field" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} />
          <div className="row">
            <button type="button" className="btn primary" disabled={busy || !why.trim()}
              onClick={() => void send('suggestion_dismissed', { reason: why.trim() }, 'Dismissed. It leaves the inbox and stays in the record.')}>
              {busy ? 'Saving' : 'Save'}
            </button>
            <button type="button" className="link" onClick={() => setDismissing(false)}>Close</button>
          </div>
        </div>
      )}
      <div role="status" aria-live="polite" className={msg ? (msg.ok ? 'small muted' : 'errline') : 'small'} style={{ minHeight: 18 }}>{msg?.text}</div>
    </div>
  );
}
