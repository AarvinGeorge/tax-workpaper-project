// Checks inbox: our findings (blockers first) beside the engine's diagnostics, filter by severity, bulk sign-off with
// one undo. Copies the hybrid mock-up Checks.dc.html layout and wording.
import type { Finding, Severity } from '@/domain/contracts';
import { refText, resolveRef } from '@/domain/refs';
import s from './work.module.css';
import {
  SEVERITY_ORDER, SEVERITY_WORD, claimHref, findingStatus, fmt, isRetracted, levelOf, masker, one, queryHref, refClaim,
  signed, visibleFinding, when, writeBlock, type WorkProps,
} from './lib';
import { Est, NoAccess, Page, Tag } from './ui';
import { Term } from '../term/Term';
import { BulkSignoff, EventButton, TextAction } from './actions';

export function claimValue(p: WorkProps, claimId: string): unknown {
  const c = p.state.claims[claimId];
  if (c) return c.current;
  if (claimId.startsWith('line:')) return p.ix.line(p.ix.latest.version, claimId.slice(5))?.value ?? null;
  return null;
}

export function Evidence({ p, refs }: { p: WorkProps; refs: string[] }) {
  const m = masker(p.state, p.role);
  if (!refs.length) return null;
  // Readable labels, one per reference, separated; the raw reference stays in the tooltip.
  return (
    <span className={s.row} style={{ gap: 6 }}>
      <span className={s.lbl}>Evidence</span>
      {refs.map((r, i) => {
        const c = refClaim(p.ix, r);
        const label = m(refText(resolveRef(p.ix, r, p.ix.latest.version)));
        const sep = i < refs.length - 1 ? <span aria-hidden="true" className={s.note}> ·</span> : null;
        return c
          ? <span key={r}><a className={s.link} href={claimHref(p.sp, c)} title={m(r)} data-ref={r} style={{ color: 'var(--acc)' }}>{label}</a>{sep}</span>
          : <span key={r} title={m(r)} data-ref={r}>{label}{sep}</span>;
      })}
    </span>
  );
}

function effectText(f: Finding): string {
  if (!f.effect) return '';
  const parts: string[] = [];
  if (typeof f.effect.federal === 'number' && f.effect.federal) parts.push(`Fed ${signed(f.effect.federal)}`);
  if (typeof f.effect.california === 'number' && f.effect.california) parts.push(`CA ${signed(f.effect.california)}`);
  return parts.join(' · ');
}

export function ChecksScreen(p: WorkProps) {
  const { role, state, ix, ws } = p;
  if (!role.screens.includes('checks')) return <NoAccess role={role} screen="checks" />;
  const m = masker(state, role);
  const sev = one(p.sp.sev) as Severity | undefined;
  const visible = p.findings.filter((f) => visibleFinding(f, state.storyAt));
  const later = p.findings.length - visible.length;
  const shown = visible
    .filter((f) => !sev || f.severity === sev)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const counts = Object.fromEntries(SEVERITY_ORDER.map((k) => [k, visible.filter((f) => f.severity === k).length]));
  const open = visible.filter((f) => !findingStatus(f, state).cleared);
  const block = writeBlock(role, state);
  const level = levelOf(ix, role);
  const diags = ix.latest.diagnostics;

  // Last bulk sign-off by this role that is still in force: one undo reverses the whole group.
  const bulk = [...state.events].reverse().find((e) => e.type === 'signoff' && e.role === role.key && e.groupId?.startsWith('bulk-') && !isRetracted(state.events, e.seq));
  const bulkGroup = bulk ? state.events.filter((e) => e.groupId === bulk.groupId && e.type === 'signoff' && !isRetracted(state.events, e.seq)) : [];

  const signable = shown
    .filter((f) => !findingStatus(f, state).cleared && !findingStatus(f, state).signed)
    .map((f) => ({ claimId: 'finding:' + f.id, title: f.title, value: fmt(claimValue(p, f.claims[0] ?? '')) }));

  let lastGroup: Severity | null = null;
  return (
    <Page label="Checks" h1="Checks inbox"
      tags={<>
        <Tag tone="neu">As of {when(state.storyAt)}</Tag>
        <Tag tone="blk">{counts.blocker} blockers</Tag>
        <Tag tone="wrn">{open.length} open</Tag>
        {later ? <Tag tone="neu" title="Findings that depend on a document or message later in the story">{later} later in the story</Tag> : null}
      </>}
      intro={<>Our checks run over the packet and do not trust the engine. Blockers<Term k="blocker" /> come first. The engine&apos;s own diagnostics<Term k="engine-diagnostics" /> are listed beside them under their own label. Tax effects are estimates at the latest version&apos;s rates or from the engine&apos;s what-if<Term k="what-if" />.</>}>

      <div role="group" aria-label="Filter by severity" className={s.row}>
        <a className={`${s.chip} ${!sev ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', null)} aria-current={!sev ? 'true' : undefined}>All <span className={s.num}>{visible.length}</span></a>
        {SEVERITY_ORDER.map((k) => (
          <a key={k} className={`${s.chip} ${sev === k ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', k)} aria-current={sev === k ? 'true' : undefined}>
            {SEVERITY_WORD[k]} <span className={s.num}>{counts[k]}</span>
          </a>
        ))}
      </div>


      <div className={s.cols}>
        <section className={s.section} aria-labelledby="chk-ours">
          <h2 className={s.h2} id="chk-ours">Our checks <span className={s.note}>({shown.length})</span></h2>
          <div className={s.box}>
            <div className={`${s.chkRow} ${s.chkHead}`}><span>Status</span><span>What</span><span className={s.right}>Amount</span><span className={s.hideSm}>Tax effect</span></div>
            {shown.length === 0 ? <div className={s.boxRow}><span className={s.note}>No findings at this story time for this filter.</span></div> : null}
            {shown.map((f) => {
              const st = findingStatus(f, state);
              const showGrp = f.severity !== lastGroup;
              lastGroup = f.severity;
              const c0 = f.claims[0];
              return (
                <div key={f.id}>
                  {showGrp ? <div className={s.grp}><span className={s.lbl}>{SEVERITY_WORD[f.severity]}</span>{f.severity === 'judgment' ? <Term k="judgment" /> : null}</div> : null}
                  <div className={s.chkRow} data-finding={f.id}>
                    <span><Tag tone={st.tone}>{st.word}</Tag></span>
                    <details className={s.peek}>
                      <summary>
                        <span className={s.title}>{m(f.title)}</span>
                        <span className={s.mono} style={{ display: 'block' }}>{f.claims.map((c) => c.replace(/^line:/, '')).join(', ')}</span>
                      </summary>
                      <div className={s.peekBody}>
                        <p style={{ margin: 0, maxWidth: '78ch' }}>{m(f.explanation)}</p>
                        <Evidence p={p} refs={f.evidence} />
                        <span className={s.note}>Check {f.checkId} · {f.family}</span>
                        <div className={s.row}>
                          {c0 ? <a className={`${s.btn} ${s.small}`} href={claimHref(p.sp, c0)}>Show where it came from</a> : null}
                          <a className={`${s.btn} ${s.small}`} href={claimHref(p.sp, 'finding:' + f.id)}>Open the finding</a>
                        </div>
                        {!st.cleared ? (
                          <TextAction ws={ws} role={role.key} label="Clear with a reason" placeholder="Why this needs no change"
                            disabledReason={block} build={{ type: 'finding_cleared', claimId: 'finding:' + f.id, payload: {}, field: 'reason' }} />
                        ) : null}
                      </div>
                    </details>
                    <span className={s.right}>{c0 ? <a className={s.amt} href={claimHref(p.sp, c0)} aria-label={`Where ${fmt(claimValue(p, c0))} came from`}>{m(claimValue(p, c0))}</a> : null}</span>
                    <span className={`${s.num} ${s.hideSm}`} style={{ color: 'var(--ink2)', fontSize: 12.5 }}>{effectText(f)} {f.effect ? <Est /> : null}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {bulkGroup.length ? (
            <div className={s.toast} role="status">
              <span>{bulkGroup.length} sign-offs saved together at {when(bulk!.at)}.</span>
              <EventButton ws={ws} role={role.key} small label="Undo"
                events={[{ type: 'undo', groupId: bulk!.groupId, payload: { reason: 'Bulk sign-off undone' } }]} />
            </div>
          ) : null}
          <BulkSignoff ws={ws} role={role.key} level={level ?? 'preparer'} items={signable}
            disabledReason={block ?? (level ? null : `${role.title} does not sign off work.`)} />
        </section>

        <section className={s.section} aria-labelledby="chk-engine">
          <h2 className={s.h2} id="chk-engine">From the engine <span className={s.note}>({diags.length}, {ix.latest.version})</span></h2>
          <p className={s.note} style={{ margin: 0 }}>The engine’s own diagnostics, shown as it reported them. They are not our checks and are not counted as findings.</p>
          <div className={s.box}>
            {diags.length === 0 ? <div className={s.boxRow}><span className={s.note}>The engine reported nothing.</span></div> : null}
            {diags.map((d, i) => (
              <div key={d.code + i} className={s.boxRow}>
                <Tag tone={d.severity === 'error' ? 'blk' : d.severity === 'warning' ? 'wrn' : 'neu'}>{d.severity}</Tag>
                <span className={s.body} style={{ flex: '1 1 220px' }}>
                  <span className={s.mono}>{d.code}</span>
                  <span style={{ fontSize: 13 }}>{m(d.message)}</span>
                  <Evidence p={p} refs={d.refs} />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
