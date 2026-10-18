// Review: the pull-request view of the return. Our adjustments against the latest version, open review notes (blocking
// ones block approval), sign-offs with stale ones marked, partner items over the firm's threshold, and the partner's
// approve button, disabled with the blocker list, and the clients' e-file signatures. Two more tabs: Changes (every
// event, undoable; the old /changes) and View log (who revealed which identifier; from the old Firm screen). Copies Review.dc.html.
import type { ClaimState, WorkEvent } from '@/domain/contracts';
import { retractedSeqs } from '@/domain/events';
import s from './work.module.css';
import {
  byline, claimHref, findRule, fmt, levelOf, liveEvents, lineLabel, masker, one, partnerThreshold, personName, queryHref, signed, storyAtOf, when, writeBlock, type WorkProps,
} from './lib';
import { Est, NoAccess, Page, Tag } from './ui';
import { Term } from '../term/Term';
import { EventButton, TextAction } from './actions';
import { ChangeLog } from './ChangeLog';
import { StaffSigning } from '@/components/client/ClientFiling';
import { signatures } from '@/components/client/signing';
import { blockerLine } from '@/components/overview/blockers';

/** The claim's last adjustment that has not been undone, proposed or applied. */
function lastAdjustment(c: ClaimState, retracted: Set<number>): WorkEvent | undefined {
  return [...c.history].reverse().find((e) => e.type === 'adjustment' && !retracted.has(e.seq));
}
function overThreshold(c: ClaimState, amount: number | null): boolean {
  if (amount === null || !c.effect) return false;
  return Math.abs(c.effect.federal) > amount || Math.abs(c.effect.california) > amount;
}
function claimTitle(p: WorkProps, id: string): string {
  if (id === 'return') return 'The return';
  if (id.startsWith('line:')) return lineLabel(p.ix, id.slice(5));
  if (id.startsWith('doc:')) return p.ix.docById.get(id.slice(4))?.title ?? id;
  if (id.startsWith('finding:')) return p.findings.find((f) => 'finding:' + f.id === id)?.title ?? id;
  return id;
}

export function ReviewScreen(p: WorkProps) {
  const { role, state, ix, ws } = p;
  if (!role.screens.includes('review')) return <NoAccess role={role} screen="review" />;
  const m = masker(state, role);
  const tab = one(p.sp.tab) ?? 'changes';
  const block = writeBlock(role, state);
  const level = levelOf(ix, role);
  const thr = partnerThreshold(ix);
  const selfRule = findRule(ix, /may not review/i);
  const notesRule = findRule(ix, /review notes block/i);
  // Approval from the firm's record once story time passes the clients' Form 8879 (the packet has no workspace event).
  const byRecord = signatures(ix, state).byRecord;

  const claims = Object.values(state.claims);
  // Proposed and applied adjustments both belong here: a preparer's proposal is applied from this list. (c.adjusted
  // means applied only and drives blockers and versions; it is deliberately not used for this list.)
  const retracted = retractedSeqs(state.events);
  const adjusted = claims.filter((c) => !!lastAdjustment(c, retracted));
  const notes = claims.flatMap((c) => c.openNotes.map((n) => ({ c, n })));
  const blockingNotes = notes.filter(({ n }) => n.payload.blocking === true);
  const signoffs = claims.flatMap((c) => c.signoffs.map((so) => ({ c, so })));
  const stale = signoffs.filter(({ so }) => so.stale);
  const partnerItems = adjusted.filter((c) => overThreshold(c, thr.amount));
  const partnerOpen = partnerItems.filter((c) => !c.signoffs.some((so) => so.level === 'partner' && !so.stale));

  const approval = [...liveEvents(state.events)].reverse().find((e) => e.type === 'signoff' && e.payload.scope === 'return');
  const tabs = [
    { key: 'changes', name: 'Adjustments', count: adjusted.length },
    { key: 'notes', name: 'Review notes', count: notes.length },
    { key: 'signoffs', name: 'Sign-offs', count: signoffs.length },
    { key: 'partner', name: 'Partner items', count: partnerItems.length },
    { key: 'log', name: 'Changes', count: state.events.length },
    { key: 'views', name: 'View log', count: state.reveals.length },
  ];

  const approveBlock = byRecord ? `${state.frozen ? 'Approved and filed' : 'Approved'} per the firm’s record.`
    : block ?? (state.blockers.length ? `${state.blockers.length} blockers must clear first.` : null);
  const stop = blockerLine(ws, role.key, state.blockers);
  const returnBlockers = state.blockers.filter((b) => b.claimId === 'return').length;

  return (
    <Page label="Review" h1="Review"
      tags={<><Tag tone="neu">As of {when(state.storyAt)}</Tag><Tag tone="neu">Stage: {state.stage}</Tag>{state.frozen ? <Tag tone="acc">As filed, locked</Tag> : null}</>}>

      <section className={s.box} aria-label="Approval" style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <strong>Approval</strong>
        <span><Tag tone={state.blockers.length ? 'blk' : 'pas'}>{state.blockers.length ? `${state.blockers.length} blockers` : 'No blockers'}</Tag><Term k="blocker" /></span>
        <Tag tone={blockingNotes.length ? 'blk' : 'neu'}>{blockingNotes.length} blocking notes</Tag>
        <Tag tone={stale.length ? 'wrn' : 'neu'}>{stale.length} stale sign-offs</Tag>
        <span><Tag tone={partnerOpen.length ? 'wrn' : 'neu'}>{partnerOpen.length} need partner sign-off</Tag><Term k="partner-threshold" /></span>
        {approval ? <Tag tone="pas" title={byline(ix, approval).title}>Approved by {byline(ix, approval).text}</Tag> : null}
        <span style={{ marginLeft: 'auto' }}>
          {level === 'partner' ? (
            <EventButton ws={ws} role={role.key} primary label="Approve the return"
              disabledReason={approval ? 'Already approved.' : approveBlock}
              events={[{ type: 'signoff', claimId: 'return', payload: { scope: 'return', level: 'partner', value: ix.latest.version } }]} />
          ) : <span className={s.note}>Only the partner approves the return.</span>}
        </span>
        {/* One blocker list, on Checks: here a count that opens it, and the notes tab for blockers on the whole return. */}
        {stop ? (
          <div style={{ flex: '1 1 100%' }} className={s.row}>
            <a className={s.link} href={stop.href}>{stop.text}</a>
            {returnBlockers ? <a className={s.link} href={queryHref(p.sp, 'tab', 'notes')}>{returnBlockers} on the return itself, in Review notes</a> : null}
          </div>
        ) : null}
        <div style={{ flex: '1 1 100%' }}><StaffSigning ix={ix} state={state} /></div>
      </section>

      <nav className={s.tabs} aria-label="Review views">
        {tabs.map((t) => (
          <a key={t.key} className={`${s.tab} ${tab === t.key ? s.tabOn : ''}`} href={queryHref(p.sp, 'tab', t.key)} aria-current={tab === t.key ? 'page' : undefined}>
            {t.name} <span className={s.num} style={{ color: 'var(--ink2)' }}>{t.count}</span>
          </a>
        ))}
      </nav>

      {tab === 'changes' ? (
        <section className={s.box} aria-label="Changes">
          <div className={s.boxRow} style={{ justifyContent: 'space-between' }}>
            <span className={s.lbl}>Our adjustments<Term k="adjustment" /> over {ix.latest.version}</span>
            {thr.rule ? <span className={s.note} style={{ maxWidth: '70ch' }}>Firm rule: “{thr.rule}”</span> : null}
          </div>
          {adjusted.length === 0 ? <div className={s.boxRow}><span className={s.note}>No adjustments yet. Adjust a number from its drawer (open any amount).</span></div> : null}
          {adjusted.map((c) => {
            const adj = lastAdjustment(c, retracted);
            const status = String(adj?.payload.status ?? 'proposed');
            const mine = adj?.role === role.key;
            const over = overThreshold(c, thr.amount);
            const signReason = block ?? (!level ? `${role.title} does not sign off work.` : mine ? `You made this adjustment. Firm rule: “${selfRule ?? 'A person may not review their own work.'}”` : null);
            const canApply = (level === 'reviewer' || level === 'partner') && status !== 'applied';
            return (
              <div key={c.claimId} className={s.boxRow} style={{ alignItems: 'flex-start' }}>
                <span className={s.body} style={{ flex: '1 1 260px' }}>
                  <a className={s.link} href={claimHref(p.sp, c.claimId)}><strong>{m(claimTitle(p, c.claimId))}</strong></a>
                  <span className={s.mono}>{c.claimId.replace(/^line:/, '')}</span>
                  {adj ? <span className={s.note}>{m(adj.payload.reason ?? '')}{adj.payload.authority ? ` · Authority: ${m(adj.payload.authority)}` : ''} · <span title={byline(ix, adj).title}>{byline(ix, adj).text}</span></span> : null}
                </span>
                <span className={s.num} style={{ flex: '0 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span><span className={s.old}>{m(c.original)}</span> to <strong>{m(status === 'applied' ? c.current : adj?.payload.value)}</strong></span>
                  {c.effect ? <span className={s.note}>Fed {signed(c.effect.federal)} · CA {signed(c.effect.california)} <Est /></span> : null}
                </span>
                <span className={s.row} style={{ flex: '1 1 260px', gap: 6 }}>
                  <Tag tone={status === 'applied' ? 'pas' : 'wrn'}>{status === 'applied' ? 'Applied' : 'Proposed'}</Tag>
                  {over ? <Tag tone="wrn">Over {fmt(thr.amount)}: partner</Tag> : null}
                  {c.signoffs.map((so) => <Tag key={so.seq} tone={so.stale ? 'wrn' : 'pas'}>{so.stale ? 'Stale' : 'Signed'}: {so.level} ({personName(ix, so.role)})</Tag>)}
                </span>
                <span className={s.row} style={{ flex: '1 1 100%', gap: 8 }}>
                  {canApply ? (
                    <EventButton ws={ws} role={role.key} small label="Apply"
                      disabledReason={block ?? (mine ? 'You proposed it; another person applies it.' : null)}
                      events={[{ type: 'adjustment', claimId: c.claimId, baseVersion: c.version, payload: { ...(adj?.payload ?? {}), status: 'applied', appliedBy: role.key } }]} />
                  ) : null}
                  {level ? (
                    <TextAction ws={ws} role={role.key} label="What you checked" placeholder="What you checked before signing off" submitLabel={`Sign off as ${level}`}
                      disabledReason={signReason} build={{ type: 'signoff', claimId: c.claimId, baseVersion: c.version, payload: { level }, field: 'note' }} />
                  ) : null}
                </span>
              </div>
            );
          })}
        </section>
      ) : null}

      {tab === 'notes' ? (
        <section className={s.box} aria-label="Review notes">
          <div className={s.boxRow}><span className={s.lbl}>Open review notes<Term k="review-note" /></span>{notesRule ? <span className={s.note}>Firm rule: “{notesRule}”</span> : null}</div>
          {notes.length === 0 ? <div className={s.boxRow}><span className={s.note}>No open review notes.</span></div> : null}
          {notes.map(({ c, n }) => (
            <div key={n.seq} className={s.boxRow}>
              <Tag tone={n.payload.blocking ? 'blk' : 'neu'}>{n.payload.blocking ? 'Blocking' : 'Note'}</Tag>
              <span className={s.body} style={{ flex: '1 1 300px' }}>
                <span>{m(n.payload.text ?? n.payload.note ?? '')}</span>
                <span className={s.note}><a className={s.link} href={claimHref(p.sp, c.claimId)}>{m(claimTitle(p, c.claimId))}</a> · <span title={byline(ix, n).title}>{byline(ix, n).text}</span></span>
              </span>
              <EventButton ws={ws} role={role.key} small label="Resolve" disabledReason={block}
                events={[{ type: 'note_resolved', claimId: c.claimId, payload: { noteSeq: n.seq } }]} />
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'signoffs' ? (
        <section className={s.box} aria-label="Sign-offs">
          <div className={s.boxRow}><span className={s.lbl}>Sign-offs</span><span className={s.note}>Stale means the value changed after it was signed.<Term k="stale-signoff" /></span></div>
          {signoffs.length === 0 ? <div className={s.boxRow}><span className={s.note}>No sign-offs yet.</span></div> : null}
          {signoffs.map(({ c, so }) => (
            <div key={so.seq} className={s.boxRow}>
              <Tag tone={so.stale ? 'wrn' : 'pas'}>{so.stale ? 'Stale' : 'Current'}</Tag>
              <span className={s.grow}><a className={s.link} href={claimHref(p.sp, c.claimId)}>{m(claimTitle(p, c.claimId))}</a></span>
              <span className={s.num}>Signed {m(so.value)}{so.stale ? `, now ${m(c.current)}` : ''}</span>
              <span className={s.note} title={byline(ix, { ...so, storyAt: storyAtOf(state, so.seq) }).title}>{so.level} · {byline(ix, { ...so, storyAt: storyAtOf(state, so.seq) }).text}{so.note ? <>: {m(so.note)}</> : null}</span>
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'partner' ? (
        <section className={s.box} aria-label="Partner items">
          <div className={s.boxRow}><span className={s.lbl}>Adjustments over the partner threshold</span>{thr.rule ? <span className={s.note}>Firm rule: “{thr.rule}”</span> : null}</div>
          {partnerItems.length === 0 ? <div className={s.boxRow}><span className={s.note}>No adjustment has a tax effect over {fmt(thr.amount)}.</span></div> : null}
          {partnerItems.map((c) => {
            const done = c.signoffs.some((so) => so.level === 'partner' && !so.stale);
            return (
              <div key={c.claimId} className={s.boxRow}>
                <Tag tone={done ? 'pas' : 'wrn'}>{done ? 'Partner signed' : 'Needs partner'}</Tag>
                <span className={s.grow}><a className={s.link} href={claimHref(p.sp, c.claimId)}>{m(claimTitle(p, c.claimId))}</a></span>
                {c.effect ? <span className={s.num}>Fed {signed(c.effect.federal)} · CA {signed(c.effect.california)} <Est /></span> : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {tab === 'log' ? <ChangeLog {...p} /> : null}

      {tab === 'views' ? (
        <section className={s.section} aria-labelledby="firm-log">
          <h2 className={s.h2} id="firm-log">View log<Term k="view-log" /></h2>
          <p className={s.note} style={{ margin: 0 }}>Every unmasked view of an identifier: who, which, when. The value itself is never logged.</p>
          <div className={s.box}>
            {state.reveals.length === 0 ? <div className={s.boxRow}><span className={s.note}>No reveals in this workspace at this story time.</span></div> : null}
            {state.reveals.map((r) => (
              <div key={r.seq} className={s.boxRow}><span className={s.when}>{when(r.at)}</span><strong>{personName(ix, r.role)}</strong><span className={s.grow}>{m(r.what)}</span></div>
            ))}
          </div>
        </section>
      ) : null}

      {role.kind === 'staff' ? (
        <section className={s.section} aria-label="Add a review note">
          <TextAction ws={ws} role={role.key} label="Review note on the return" placeholder="What needs attention"
            disabledReason={block} extra={[{ name: 'blocking', label: 'Blocks approval' }]}
            build={{ type: 'review_note', claimId: 'return', payload: {}, field: 'text' }} />
        </section>
      ) : null}
    </Page>
  );
}
