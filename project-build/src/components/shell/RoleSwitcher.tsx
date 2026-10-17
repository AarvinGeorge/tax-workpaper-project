'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RoleKey, ScreenKey } from '@/domain/contracts';
import { Term } from '../term/Term';
import { TERMS } from '../term/terms';

export interface RoleOption { key: RoleKey; label: string; screens: ScreenKey[] }

/** "Viewing as": switching role keeps the screen when the new role may open it, else lands on its first screen. */
export function RoleSwitcher({ ws, role, screen, options }: { ws: string; role: RoleKey; screen: ScreenKey; options: RoleOption[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <div className="sh-role">
      {/* The button sits outside the label so the select's name stays "Viewing as". */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink2)' }}>
        <label htmlFor="sh-role-select">Viewing as</label><Term k="role-switcher" />
        <select id="sh-role-select" className="select" value={role} aria-describedby="sh-attrib" data-testid="role-switcher"
          onChange={(e) => {
            const next = options.find((o) => o.key === e.target.value);
            if (!next) return;
            const k = next.screens.includes(screen) ? screen : next.screens[0];
            const claim = sp.get('claim');
            const q = claim && next.screens.includes(screen) ? '?claim=' + encodeURIComponent(claim) : '';
            router.push(`/w/${ws}/${next.key}${k === 'home' ? '' : '/' + k}${q}`);
          }}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      <span id="sh-attrib" className="vh">{TERMS['role-switcher'].text}</span>
    </div>
  );
}
