'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoleKey } from '@/domain/contracts';
import { postEvent } from './actions';

/**
 * Demo control: takes the workspace back to the pipeline output at the start of review (no notes, adjustments,
 * sign-offs, questions or reveals; story clock at v3). Saved as an event, so the log keeps everything before it.
 * Other tabs on the workspace follow on their next poll. Asks once, inline.
 */
export function ResetButton({ ws, role }: { ws: string; role: RoleKey }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!asking) {
    return <button type="button" className="btn" onClick={() => { setError(null); setAsking(true); }}
      title="Demo: start the review again from the pipeline output">Reset to start</button>;
  }
  return (
    <span className="row" role="group" aria-label="Reset to start" style={{ gap: 6 }}>
      <span className="small">Clear all work in this workspace, for every role, and set the clock back to when v3 was handed over?</span>
      <button type="button" className="btn primary" onClick={async () => {
        const r = await postEvent(ws, role, { type: 'workspace_reset', payload: {} });
        if (!r.ok) { setError(r.reason ?? 'Not reset.'); return; }
        try { Object.keys(window.localStorage).filter((k) => k.startsWith('wp.')).forEach((k) => window.localStorage.removeItem(k)); } catch { /* storage blocked */ }
        window.dispatchEvent(new Event('wp:reset'));
        setAsking(false);
        router.push(`/w/${encodeURIComponent(ws)}/${role}`);
        router.refresh();
      }}>Confirm reset</button>
      <button type="button" className="btn" onClick={() => setAsking(false)}>Cancel</button>
      {error && <span className="warnline small" role="alert">{error}</span>}
    </span>
  );
}
