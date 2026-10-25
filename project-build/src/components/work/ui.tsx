// Small presentational pieces shared by the work screens (server components).
import type { ReactNode } from 'react';
import type { RoleInfo, ScreenKey } from '@/domain/contracts';
import s from './work.module.css';
import { MOCKUP_URL, type Tone } from './lib';

export function Tag({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return <span className={`${s.tag} ${s['t-' + tone]}`} title={title}>{children}</span>;
}
/** The small mark beside anything the AI suggested. Its label is read aloud; the glyph itself is decoration. */
export function AiMark({ label = 'Suggested by AI' }: { label?: string }) {
  if (!label) return <span className={s.aiMark} aria-hidden="true">✦</span>; // beside a word that already says AI
  return <span className={s.aiMark} role="img" aria-label={label} title={label} data-ai-mark="">✦</span>;
}

export function Ex() {
  return <span className={s.ex} title="Not in the packet: an illustration">Example</span>;
}
export function Est() {
  return <span className={s.ex} title="Estimated from the packet's tax effect rates or what-if; the engine has not recomputed">estimate</span>;
}

export function Page({ label, h1, intro, tags, children, head }: { label: string; h1: string; intro?: ReactNode; tags?: ReactNode; children: ReactNode; head?: ReactNode }) {
  return (
    <div className={s.page}>
      {head ? <>{head}{intro ? <p className={s.intro}>{intro}</p> : null}</> : (
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className={s.eyebrow}><span className={s.lbl}>{label}</span>{tags}</div>
          <h1 className={s.h1}>{h1}</h1>
          {intro ? <p className={s.intro}>{intro}</p> : null}
        </header>
      )}
      {children}
    </div>
  );
}

/** Shown when the role may not open this screen. The nav already hides it; a typed URL lands here. */
export function NoAccess({ role, screen }: { role: RoleInfo; screen: ScreenKey }) {
  const home = role.screens[0] ?? 'home';
  return (
    <div className={s.page}>
      <section className={s.section} style={{ maxWidth: '62ch' }}>
        <h1 className={s.h1}>Not part of this view</h1>
        <p style={{ margin: 0 }}>
          {role.kind === 'client'
            ? 'This page is for your tax team. Everything you need is on your home page.'
            : `${role.name} (${role.title}) does not use the ${screen} screen.`}
        </p>
        <div><a className={s.btn} href={home === 'home' ? '.' : home}>Go to {home === 'home' ? 'Home' : home}</a></div>
      </section>
    </div>
  );
}

/** A feature designed in the mock-up but not built in this round. No image offline: caption, description, link. */
export function Designed({ title, text }: { title: string; text: string }) {
  return (
    <div className={s.designed} role="note" aria-label={`${title}: designed, not built`}>
      <div className={s.row}><Tag tone="neu">Designed, not built in this round</Tag></div>
      <strong>{title}</strong>
      <span className={s.note} style={{ fontSize: 13 }}>{text}</span>
      <a className={s.link} href={MOCKUP_URL} target="_blank" rel="noopener noreferrer">See it in the published mock-up</a>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.boxRow}><span className={s.note}>{children}</span></div>;
}

export function NotInPacket({ what }: { what: string }) {
  return <p className={s.note} style={{ margin: 0 }}>{what}: not in the packet.</p>;
}
