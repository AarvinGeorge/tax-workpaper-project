'use client';
import type { NewEvent, RoleKey } from '@/domain/contracts';

export type PostResult = { ok: boolean; reason?: string; status?: number };

/** Append one event through the API (policy is enforced on the server), then ask the page to re-render. */
export async function postEvent(ws: string, role: RoleKey, e: Omit<NewEvent, 'ws' | 'role' | 'storyAt'>): Promise<PostResult> {
  try {
    const res = await fetch(`/api/w/${encodeURIComponent(ws)}/events?role=${encodeURIComponent(role)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e),
    });
    const body = (await res.json().catch(() => ({}))) as { reason?: string; error?: string };
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wp:refresh'));
    if (!res.ok) return { ok: false, status: res.status, reason: body.reason ?? body.error ?? `The server refused it (${res.status}).` };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Not saved: the server could not be reached. Try again.' };
  }
}
