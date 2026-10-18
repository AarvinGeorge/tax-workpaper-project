'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Which notices a person has read, per workspace, kept in this browser (localStorage `wp.read.<ws>.<role>`, a list of
 * notice ids). Read by the bell; kept as its own module so other views can share the read state: a change in one tells
 * the other through a window event (same tab) or the storage event (other tabs). The reset button clears `wp.*`.
 */
export const readKey = (ws: string, role: string) => `wp.read.${ws}.${role}`;
const CHANGED = 'wp:read';

export function loadRead(ws: string, role: string): Set<string> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(readKey(ws, role)) ?? '[]') as unknown;
    // Earlier builds stored event seqs as numbers; those are the `ev:<seq>` ids now.
    return new Set(Array.isArray(raw) ? raw.map((x) => (typeof x === 'number' ? `ev:${x}` : String(x))) : []);
  } catch { return new Set(); }
}

export function useReadState(ws: string, role: string) {
  const key = readKey(ws, role);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setRead(loadRead(ws, role));
    sync(); setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === key) sync(); };
    window.addEventListener(CHANGED, sync);
    window.addEventListener('wp:reset', sync);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(CHANGED, sync); window.removeEventListener('wp:reset', sync); window.removeEventListener('storage', onStorage); };
  }, [ws, role, key]);
  const markRead = useCallback((ids: string[]) => {
    const next = new Set([...loadRead(ws, role), ...ids]);
    setRead(next);
    try { window.localStorage.setItem(key, JSON.stringify([...next])); } catch { /* storage blocked */ }
    window.dispatchEvent(new Event(CHANGED));
  }, [ws, role, key]);
  return { read, ready, markRead };
}
