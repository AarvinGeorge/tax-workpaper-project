// What-ifs: the engine's alternatives, a tab of the Return overview (moved unchanged from the old Changes screen).
// They were computed on the final version, so they show only once the story clock has reached it.
import { whatIfs } from '@/domain/versions';
import s from './work.module.css';
import { claimHref, lineLabel, masker, signed, type WorkProps } from './lib';
import { NoAccess, Page, Tag } from './ui';
import { Term } from '../term/Term';

export function WhatIfsScreen(p: WorkProps) {
  const { role, state, ix } = p;
  if (!role.screens.includes('whatifs')) return <NoAccess role={role} screen="whatifs" />;
  const m = masker(state, role);
  const base = (ix.packet.what_if.alternatives as { base_version?: string }[]).map((a) => a.base_version).find(Boolean);
  const reached = !base || ix.versions.some((v) => v.version === base);
  const alts = reached ? whatIfs(ix) : [];

  return (
    <Page head={p.head} label="What-ifs" h1="What-ifs from the engine">
      <section className={s.section} aria-labelledby="chg-whatif">
        <div className={s.row}><h2 className={s.h2} id="chg-whatif">What-ifs from the engine</h2><Term k="what-if" /><Tag tone="neu">Not a change; nothing is saved to the return</Tag><span className={s.note}>Computed on {base ?? ix.latest.version}</span></div>
        <div className={s.box}>
          {!reached ? <div className={s.boxRow}><span className={s.note}>The engine computed these on {base}; they show once the story clock reaches it.</span></div>
            : alts.length === 0 ? <div className={s.boxRow}><span className={s.note}>No what-ifs in the packet.</span></div> : null}
          {alts.map((w) => (
            <details key={w.id} className={s.boxRow} style={{ display: 'block' }}>
              <summary style={{ cursor: 'pointer' }}>
                <strong>{m(w.description)}</strong>{' '}
                <span className={s.num}>Fed {signed(w.federalChange)} · CA {signed(w.californiaChange)}{w.penaltyChange ? ` · penalty ${signed(w.penaltyChange)}` : ''}</span>
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13 }}>
                {w.changedLines.map((k) => (
                  <li key={k}><a className={s.link} href={claimHref(p.sp, 'line:' + k)}>{m(lineLabel(ix, k))}</a> <span className={s.mono}>{k}</span></li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>
    </Page>
  );
}
