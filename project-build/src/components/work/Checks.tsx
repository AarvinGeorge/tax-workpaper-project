// Checks inbox: our findings (blockers first) beside the engine's diagnostics, filter by severity, bulk sign-off with
// one undo. Copies the hybrid mock-up Checks.dc.html layout and wording.
import type { Finding, Severity } from '@/domain/contracts';
import { refText, resolveRef } from '@/domain/refs';
import s from './work.module.css';
import {
  SEVERITY_ORDER, SEVERITY_WORD, claimHref, findingStatus, fmt, isRetracted, levelOf, masker, one, queryHref, refClaim,
  signed, visibleFinding, when, writeBlock, type WorkProps,
} from './lib';
import { AiMark, Est, NoAccess, Page, Tag } from './ui';
import { confidenceWord, isAi, suggestionStatus } from '@/domain/ai/merge';
import { personName } from './lib';
import { Term } from '../term/Term';
import Link from 'next/link';
import { EventButton, GroupSelect, RevealDrawerOnPhone, RowSelect, SignoffNote, SignoffScope, TextAction } from './actions';

export function claimValue(p: WorkProps, claimId: string): unknown {
  const c = p.state.claims[claimId];
  if (c) return c.current;
  if (claimId.startsWith('line:')) return p.ix.line(p.ix.latest.version, claimId.slice(5))?.value ?? null;
  return null;
}

export function Evidence({ p, refs }: { p: WorkProps; refs: string[] }) {
  const m = masker(p.state, p.role);
  if (!refs.length) return null;
  const current = one(p.sp.claim);
  // Readable labels, one per reference, separated; the raw reference stays in the tooltip. A link opens on the right
  // without reloading the page (the row stays open, the list keeps its place); the one open now is marked.
  return (
    <span className={s.row} style={{ gap: 6 }}>
      <span className={s.lbl}>Evidence</span>
      {refs.map((r, i) => {
        const c = refClaim(p.ix, r);
        const label = m(refText(resolveRef(p.ix, r, p.ix.latest.version)));
        const sep = i < refs.length - 1 ? <span aria-hidden="true" className={s.note}> ·</span> : null;
        return c
          ? <span key={r}><Link scroll={false} prefetch={false} className={`${s.link} ${s.evLink} ${c === current ? s.evOn : ''}`} href={claimHref(p.sp, c)} title={m(r)} data-ref={r}
              aria-current={c === current ? 'true' : undefined}>{label}{c === current ? <span className={s.evHint} aria-hidden="true"> · open</span> : null}</Link>{sep}</span>
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
  const sev = one(p.sp.sev) as Severity | 'ai' | undefined;
  const checks = p.findings.filter((f) => !isAi(f));
  const visible = checks.filter((f) => visibleFinding(f, state.storyAt));
  const later = checks.length - visible.length;
  // AI suggestions: a separate group after our checks; dismissed ones leave the inbox (they stay in the record).
  const ai = p.findings.filter((f) => isAi(f) && visibleFinding(f, state.storyAt))
    .map((f) => ({ f, st: suggestionStatus(state.events, f.id) })).filter((x) => x.st.status !== 'dismissed');
  const aiOn = !!p.ai?.present && role.kind === 'staff';
  const held = aiOn ? p.ai!.held : [];
  const shown = visible
    .filter((f) => !sev || f.severity === sev)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const counts = Object.fromEntries(SEVERITY_ORDER.map((k) => [k, visible.filter((f) => f.severity === k).length]));
  const open = visible.filter((f) => !findingStatus(f, state).cleared);
  const openBlockers = open.filter((f) => f.severity === 'blocker').length; // same cleared rule as the rows
  const block = writeBlock(role, state);
  const level = levelOf(ix, role);
  const diags = ix.latest.diagnostics;

  // Last bulk sign-off by this role that is still in force: one undo reverses the whole group.
  const bulk = [...state.events].reverse().find((e) => e.type === 'signoff' && e.role === role.key && e.groupId?.startsWith('bulk-') && !isRetracted(state.events, e.seq));
  const bulkGroup = bulk ? state.events.filter((e) => e.groupId === bulk.groupId && e.type === 'signoff' && !isRetracted(state.events, e.seq)) : [];

  // Rows this role can still sign: open (not cleared or adjusted), not yet signed, and the role signs off at all.
  const canSign = !!level && !block;
  const signable = canSign ? shown.filter((f) => !findingStatus(f, state).cleared && !findingStatus(f, state).signed).map((f) => 'finding:' + f.id) : [];
  const blockerIds = shown.filter((f) => f.severity === 'blocker').map((f) => 'finding:' + f.id);
  const current = one(p.sp.claim);
  const holdsCurrent = (f: Finding) => !!current && (current === 'finding:' + f.id || f.evidence.some((r) => refClaim(ix, r) === current));

  let lastGroup: Severity | null = null;
  return (
    <Page label="Checks" h1="Checks inbox"
      tags={<>
        <Tag tone="neu">As of {when(state.storyAt)}</Tag>{' '}
        <Tag tone="blk">{openBlockers} blockers</Tag>{' '}
        <Tag tone="wrn">{open.length} open</Tag>{' '}
        {later ? <Tag tone="neu" title="Findings that depend on a document or message later in the story">{later} later in the story</Tag> : null}
      </>}
      intro={<>Our checks run over the packet and do not trust the engine. Blockers<Term k="blocker" /> come first. The engine&apos;s own diagnostics<Term k="engine-diagnostics" /> are listed beside them under their own label. Tax effects are estimates at the latest version&apos;s rates or from the engine&apos;s what-if<Term k="what-if" />.</>}>

      <div role="group" aria-label="Filter by severity" className={s.row}>
        <a className={`${s.chip} ${!sev ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', null)} aria-current={!sev ? 'true' : undefined}>All <span className={s.num}>{visible.length + (aiOn ? ai.length : 0)}</span></a>
        {SEVERITY_ORDER.map((k) => (
          <a key={k} className={`${s.chip} ${sev === k ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', k)} aria-current={sev === k ? 'true' : undefined}>
            {SEVERITY_WORD[k]} <span className={s.num}>{counts[k]}</span>
          </a>
        ))}
        {aiOn ? (
          <a className={`${s.chip} ${sev === 'ai' ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', 'ai')} aria-current={sev === 'ai' ? 'true' : undefined}>
            <AiMark label="" />AI <span className={s.num}>{ai.length}</span>
          </a>
        ) : null}
      </div>


      <div className={s.cols}>
        <div className={s.section} style={{ gap: 16 }}>
        {sev !== 'ai' ? <section className={s.section} aria-labelledby="chk-ours">
          <RevealDrawerOnPhone claim={current ?? null} />
          <h2 className={s.h2} id="chk-ours" tabIndex={-1}>Our checks <span className={s.note}>({shown.length})</span></h2>
          <SignoffScope ws={ws} role={role.key} level={level ?? 'preparer'} items={signable} blockers={blockerIds}>
          <div className={s.box}>
            <div className={`${s.chkRow} ${s.chkSel} ${s.chkHead}`}><span>{canSign ? <Term k="sign-off" /> : null}</span><span>Status</span><span>What</span><span className={s.right}>Amount</span><span className={s.hideSm}>Tax effect</span></div>
            {shown.length === 0 ? <div className={s.boxRow}><span className={s.note}>No findings at this story time for this filter.</span></div> : null}
            {shown.map((f) => {
              const st = findingStatus(f, state);
              const showGrp = f.severity !== lastGroup;
              lastGroup = f.severity;
              const c0 = f.claims[0];
              return (
                <div key={f.id}>
                  {showGrp ? <div className={s.grp}><GroupSelect word={SEVERITY_WORD[f.severity]} ids={shown.filter((x) => x.severity === f.severity).map((x) => 'finding:' + x.id)}><span className={s.lbl}>{SEVERITY_WORD[f.severity]}</span>{f.severity === 'judgment' ? <Term k="judgment" /> : null}</GroupSelect></div> : null}
                  <div className={`${s.chkRow} ${s.chkSel}`} data-finding={f.id} data-severity={f.severity}>
                    <RowSelect id={'finding:' + f.id} title={m(f.title)} />
                    <span><Tag tone={st.tone}>{st.word}</Tag></span>
                    <details className={s.peek} open={holdsCurrent(f) || undefined}>
                      <summary>
                        <span className={s.title}>{m(f.title)}</span>
                        <span className={s.mono} style={{ display: 'block' }}>{f.claims.map((c) => c.replace(/^line:/, '')).join(', ')}</span>
                      </summary>
                      <div className={s.peekBody}>
                        <p style={{ margin: 0, maxWidth: '78ch' }}>{m(f.explanation)}</p>
                        <Evidence p={p} refs={f.evidence} />
                        <span className={s.note}>Check {f.checkId} · {f.family}</span>
                        <div className={s.row}>
                          {c0 ? <Link scroll={false} prefetch={false} className={`${s.btn} ${s.small}`} href={claimHref(p.sp, c0)}>Show where it came from</Link> : null}
                          <Link scroll={false} prefetch={false} className={`${s.btn} ${s.small}`} href={claimHref(p.sp, 'finding:' + f.id)}>Open the finding</Link>
                        </div>
                        <SignoffNote id={'finding:' + f.id} level={level ?? 'preparer'} />
                        {!st.cleared ? (
                          <TextAction ws={ws} role={role.key} label="Clear with a reason" placeholder="Why this needs no change"
                            disabledReason={block} build={{ type: 'finding_cleared', claimId: 'finding:' + f.id, payload: {}, field: 'reason' }} />
                        ) : null}
                      </div>
                    </details>
                    <span className={s.right}>{c0 ? <Link scroll={false} prefetch={false} className={s.amt} href={claimHref(p.sp, c0)} aria-label={`Where ${fmt(claimValue(p, c0))} came from`}>{m(claimValue(p, c0))}</Link> : null}</span>
                    <span className={`${s.num} ${s.hideSm}`} style={{ color: 'var(--ink2)', fontSize: 12.5 }}>{effectText(f)} {f.effect ? <Est /> : null}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </SignoffScope>
          {bulkGroup.length ? (
            <div className={s.toast} role="status">
              <span>{bulkGroup.length} sign-offs saved together at {when(bulk!.at)}.</span>
              <EventButton ws={ws} role={role.key} small label="Undo"
                events={[{ type: 'undo', groupId: bulk!.groupId, payload: { reason: 'Bulk sign-off undone' } }]} />
            </div>
          ) : null}
          {!canSign ? <p className={s.note} style={{ margin: 0 }}>{block ?? `${role.title} does not sign off work.`}</p> : null}
        </section> : null}
        {aiOn && (!sev || sev === 'ai') ? <AiGroup p={p} items={ai} held={held} /> : null}
        </div>

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

/** Third group after our checks: verified AI suggestions, each marked, unreviewed ones saying "Needs review". */
function AiGroup({ p, items, held }: { p: WorkProps; items: { f: Finding; st: ReturnType<typeof suggestionStatus> }[]; held: { id: string | null; reasons: string[] }[] }) {
  const m = masker(p.state, p.role);
  const open = items.filter((x) => x.st.status === 'needs_review').length;
  return (
    <section className={s.section} aria-labelledby="chk-ai" data-testid="ai-suggestions">
      <h2 className={s.h2} id="chk-ai">AI suggestions<Term k="ai-suggestion" /> <span className={s.note}>({items.length}{open ? `, ${open} ${open === 1 ? 'needs' : 'need'} review` : ''})</span></h2>
      <div className={s.box}>
        <div className={`${s.chkRow} ${s.chkHead}`}><span>Status</span><span>What</span><span className={s.right}>Amount</span><span className={s.hideSm}>Confidence</span></div>
        {items.length === 0 ? <div className={s.boxRow}><span className={s.note}>No AI suggestions at this story time.</span></div> : null}
        {items.map(({ f, st }) => {
          const c0 = f.claims[0];
          const by = st.by ? personName(p.ix, st.by).split(' ')[0] : '';
          return (
            <div key={f.id} className={s.chkRow} data-finding={f.id} data-ai="">
              <span>{st.status === 'accepted' ? <Tag tone="pas">Accepted</Tag> : <Tag tone="wrn">Needs review</Tag>}</span>
              <details className={s.peek}>
                <summary>
                  <span className={s.title}><AiMark />{m(f.title)}</span>
                  <span className={s.mono} style={{ display: 'block' }}>{f.claims.map((c) => c.replace(/^line:/, '')).join(', ')}</span>
                </summary>
                <div className={s.peekBody}>
                  <p style={{ margin: 0, maxWidth: '78ch' }}>{m(f.explanation)}</p>
                  <Evidence p={p} refs={f.evidence} />
                  {st.status === 'accepted' ? <span className={s.note}>Suggested by AI, accepted by {by}</span> : null}
                  <div className={s.row}>
                    <Link scroll={false} prefetch={false} className={`${s.btn} ${s.small}`} href={claimHref(p.sp, 'finding:' + f.id)}>{st.status === 'accepted' ? 'Open the suggestion' : 'Review the suggestion'}</Link>
                  </div>
                </div>
              </details>
              <span className={s.right}>{c0 ? <Link scroll={false} prefetch={false} className={s.amt} href={claimHref(p.sp, c0)} aria-label={`Where ${fmt(claimValue(p, c0))} came from`}>{m(claimValue(p, c0))}</Link> : null}</span>
              <span className={`${s.note} ${s.hideSm}`}>{f.ai ? confidenceWord(f.ai.confidence) : ''}</span>
            </div>
          );
        })}
      </div>
      {held.length ? (
        <details className={s.note} data-testid="ai-held">
          <summary>{held.length} AI suggestion{held.length === 1 ? '' : 's'} held back: failed verification</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {held.map((h, i) => <li key={(h.id ?? '') + i}><span className={s.mono}>{m(h.id ?? 'no id')}</span> {m(h.reasons.join(' '))}</li>)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
