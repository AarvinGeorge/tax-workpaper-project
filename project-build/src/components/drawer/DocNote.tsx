'use client';
// Add a note to a document (attach_note). The server re-checks who may note which document.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RoleKey } from '@/domain/contracts';
import { postEvent } from '../shell/actions';

export function DocNote({ ws, role, claimId }: { ws: string; role: RoleKey; claimId: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function add() {
    if (!text.trim()) return;
    setBusy(true); setMsg(null);
    const r = await postEvent(ws, role, { type: 'attach_note', claimId, payload: { text: text.trim() } });
    setBusy(false);
    if (r.ok) { setText(''); setMsg({ ok: true, text: 'Note saved with the document.' }); router.refresh(); } else setMsg({ ok: false, text: r.reason ?? 'Refused.' });
  }
  return (
    <div className="drw-panel" role="group" aria-label="Add a note" data-testid="doc-note">
      <label className="lbl" htmlFor="doc-note-t">Add a note</label>
      <textarea id="doc-note-t" className="field" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => void add()}>{busy ? 'Saving' : 'Add the note'}</button>
      </div>
      <div role="status" aria-live="polite" className={msg ? (msg.ok ? 'small muted' : 'errline') : 'small'} style={{ minHeight: 18 }}>{msg?.text}</div>
    </div>
  );
}
