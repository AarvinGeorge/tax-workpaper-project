// Findings: the ledger of the packet's confident mistakes (deliverable 3 in the app). Every ledger row, regardless of the
// story clock, with the check that surfaces it, severity, effect estimate, evidence (drawer links) and how the design
// surfaced it. A row whose check does not fire says so; it is never faked.
import { LEDGER } from '@/domain/checks/catalogue';
import s from './work.module.css';
import { SEVERITY_TONE, claimHref, findingStatus, masker, signed, visibleFinding, when, type WorkProps } from './lib';
import { Evidence } from './Checks';
import { Est, NoAccess, Page, Tag } from './ui';
import type { Severity } from '@/domain/contracts';

export function FindingsScreen(p: WorkProps) {
  const { role, state, findings } = p;
  if (!role.screens.includes('findings')) return <NoAccess role={role} screen="findings" />;
  const m = masker(state, role);
  const ids = (l: (typeof LEDGER)[number]) => [l.id, ...(l.aliases ?? [])];
  const hitsOf = (l: (typeof LEDGER)[number]) => findings.filter((f) => ids(l).some((i) => f.ledgerIds.includes(i)));
  const fired = LEDGER.filter((l) => hitsOf(l).length > 0).length;
  const beyond = findings.filter((f) => f.ledgerIds.length === 0);

  return (
    <Page label="Findings" h1="The packet's confident mistakes"
      tags={<><Tag tone="neu">{LEDGER.length} in the ledger</Tag><Tag tone={fired === LEDGER.length ? 'pas' : 'wrn'}>{fired} surfaced by a check</Tag><Tag tone="neu">As of {when(state.storyAt)}</Tag></>}
      intro="Every mistake we found in the packet, listed whatever the story time, with the check that catches it from the data (not from the engine), its evidence and how the design puts it in front of the right person. A finding that depends on a later document appears in the inboxes only once the story reaches it.">
      <div className={`${s.box} ${s.scroll}`}>
        <table className={s.table} aria-label="Ledger findings">
          <thead><tr><th>Id</th><th>Finding</th><th>Severity</th><th className={s.r}>Effect</th><th>Status</th></tr></thead>
          <tbody>
            {LEDGER.map((l) => {
              const hits = hitsOf(l);
              const f = hits[0];
              const st = f ? findingStatus(f, state) : null;
              const shown = f ? visibleFinding(f, state.storyAt) : false;
              const sev = (f?.severity ?? l.severity) as Severity;
              return (
                <tr key={l.id} data-ledger={l.id}>
                  <td className={s.mono} style={{ whiteSpace: 'nowrap' }}>{ids(l).join(' / ')}</td>
                  <td style={{ minWidth: 260 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {f ? <a className={s.link} href={claimHref(p.sp, 'finding:' + f.id)}><strong>{m(l.title)}</strong></a> : <strong>{m(l.title)}</strong>}
                      <span className={s.note}><span className={s.lbl}>Check</span> <span className={s.mono}>{(f ? [...new Set(hits.map((h) => h.checkId))] : l.checkIds).join(', ')}</span></span>
                      <span className={s.note}><span className={s.lbl}>How it was surfaced</span> {m(l.surfaced)}</span>
                      {f ? <Evidence p={p} refs={f.evidence} /> : null}
                      {f?.firstVisibleAt ? <span className={s.note}>Appears in the story on {when(f.firstVisibleAt)}</span> : null}
                    </div>
                  </td>
                  <td><Tag tone={SEVERITY_TONE[sev] ?? 'neu'}>{sev}</Tag>{f && f.severity !== l.severity ? <span className={s.note} style={{ display: 'block' }}>Ledger: {l.severity}</span> : null}</td>
                  <td className={s.r}>
                    {f?.effect ? <>{typeof f.effect.federal === 'number' ? `Fed ${signed(f.effect.federal)}` : ''}{typeof f.effect.california === 'number' ? ` CA ${signed(f.effect.california)}` : ''} <Est /></> : ''}
                  </td>
                  <td>
                    {!f ? <Tag tone="blk">Check did not fire</Tag>
                      : !shown ? <Tag tone="neu">Later in the story</Tag>
                      : <Tag tone={st!.tone}>{st!.word}</Tag>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {beyond.length ? (
        <section className={s.section} aria-labelledby="fnd-beyond">
          <h2 className={s.h2} id="fnd-beyond">Also raised by the checks ({beyond.length})</h2>
          <p className={s.note} style={{ margin: 0 }}>Findings our checks raise beyond the ledger: judgment items and smaller tie-outs.</p>
          <div className={s.box}>
            {beyond.map((f) => (
              <div key={f.id} className={s.boxRow}>
                <Tag tone={SEVERITY_TONE[f.severity]}>{f.severity}</Tag>
                <a className={`${s.link} ${s.grow}`} href={claimHref(p.sp, 'finding:' + f.id)}>{m(f.title)}</a>
                <span className={s.mono}>{f.checkId}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Page>
  );
}
