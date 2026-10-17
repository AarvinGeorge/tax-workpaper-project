// Findings: the ledger of the packet's confident mistakes (deliverable 3 in the app). Every ledger row, regardless of the
// story clock, with the check that surfaces it, severity, effect estimate, evidence (drawer links) and how the design
// surfaced it. A row whose check does not fire says so; it is never faked.
import { LEDGER } from '@/domain/checks/catalogue';
import s from './work.module.css';
import { SEVERITY_TONE, claimHref, findingStatus, masker, refClaim, signed, visibleFinding, when, type WorkProps } from './lib';
import { Evidence } from './Checks';
import { AiMark, Est, NoAccess, Page, Tag } from './ui';
import { isAi } from '@/domain/ai/merge';
import { Term } from '../term/Term';
import type { Finding, Severity } from '@/domain/contracts';

export function FindingsScreen(p: WorkProps) {
  const { role, state } = p;
  const findings = p.findings.filter((f) => !isAi(f));
  // A ledger row the AI reader also flagged: same claim, or a quote from a document the row's evidence cites.
  const ai = p.findings.filter(isAi);
  const docsOf = (f: Finding) => new Set(f.evidence.map((r) => refClaim(p.ix, r)).filter((c): c is string => !!c?.startsWith('doc:')));
  const aiAlso = (hits: Finding[]) => ai.some((a) => hits.some((h) => {
    const d = docsOf(h);
    return a.claims.some((c) => h.claims.includes(c)) || (a.ai?.quotes ?? []).some((q) => d.has('doc:' + q.doc));
  }));
  if (!role.screens.includes('findings')) return <NoAccess role={role} screen="findings" />;
  const m = masker(state, role);
  const ids = (l: (typeof LEDGER)[number]) => [l.id, ...(l.aliases ?? [])];
  const hitsOf = (l: (typeof LEDGER)[number]) => findings.filter((f) => ids(l).some((i) => f.ledgerIds.includes(i)));
  const fired = LEDGER.filter((l) => hitsOf(l).length > 0).length;
  const beyond = findings.filter((f) => f.ledgerIds.length === 0);

  return (
    <Page label="Findings" h1="The packet's confident mistakes"
      tags={<><Tag tone="neu">{LEDGER.length} in the ledger</Tag><Tag tone={fired === LEDGER.length ? 'pas' : 'wrn'}>{fired} surfaced by a check</Tag><Tag tone="neu">As of {when(state.storyAt)}</Tag></>}
      intro="Every mistake we found in the packet, whatever the story time. Each shows the check that catches it from the packet's own data, its evidence, and who it is put in front of. A finding that depends on a later document reaches the inboxes only when the story gets there. These mistakes were found during an AI-assisted review of the packet and are now caught by deterministic checks.">
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
                      <span>{aiAlso(hits) ? <AiMark label="The AI reader also flagged this" /> : null}{f ? <a className={s.link} href={claimHref(p.sp, 'finding:' + f.id)}><strong>{m(l.title)}</strong></a> : <strong>{m(l.title)}</strong>}</span>
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
          <p className={s.note} style={{ margin: 0 }}>Findings our checks raise beyond the ledger: judgment<Term k="judgment" /> items and smaller tie-outs<Term k="tie-out" />.</p>
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
