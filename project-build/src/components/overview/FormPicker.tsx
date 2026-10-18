'use client';
import { useRouter } from 'next/navigation';

/** Pick one form to show and compare, or "All forms". Each option is a link built on the server, so every other view
 *  setting (comparison, changed only, open line) carries over unchanged. */
export function FormPicker({ value, options }: { value: string; options: { label: string; href: string }[] }) {
  const router = useRouter();
  return (
    <label className="row small" style={{ gap: 6 }}>
      <span className="lbl">Form to compare</span>
      <select className="input" value={value} onChange={(e) => router.push(e.target.value, { scroll: false })} aria-label="Form to compare">
        {options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
      </select>
    </label>
  );
}
