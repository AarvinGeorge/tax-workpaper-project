'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Pick one form to show and compare, or "All forms". Each option is a link built on the server, so every other view
 *  setting (comparison, changed only, the open line) carries over. A mouse pick applies at once; with the keyboard,
 *  arrowing through the options only browses, and Enter or leaving the field applies the choice. */
export function FormPicker({ value, options }: { value: string; options: { label: string; href: string }[] }) {
  const router = useRouter();
  const keyed = useRef(false);
  const go = (href: string) => { if (href !== value) router.push(href, { scroll: false }); };
  return (
    <label className="row small" style={{ gap: 6 }}>
      <span className="lbl">Form to compare</span>
      <select className="input" defaultValue={value} key={value} aria-label="Form to compare"
        onKeyDown={(e) => { keyed.current = true; if (e.key === 'Enter') go(e.currentTarget.value); }}
        onMouseDown={() => { keyed.current = false; }}
        onChange={(e) => { if (!keyed.current) go(e.target.value); }}
        onBlur={(e) => go(e.target.value)}>
        {options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
      </select>
    </label>
  );
}
