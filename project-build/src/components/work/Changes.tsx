// Changes: the append-only event log of this workspace, each entry undoable by a compensating event; the engine's
// what-ifs beside it, labelled "Not a change". Copies Changes.dc.html.
import type { EventType, WorkEvent } from '@/domain/contracts';
import { whatIfs } from '@/domain/versions';
import s from './work.module.css';
import { claimHref, fmt, humanize, isRetracted, lineLabel, masker, one, personName, queryHref, signed, when, writeBlock, type WorkProps } from './lib';
import { Est, NoAccess, Page, Tag } from './ui';
import { Term } from '../term/Term';
import { EventButton } from './actions';

const KIND: Partial<Record<EventType, string>> = {
  adjustment: 'Adjustment', review_note: 'Review note', note_resolved: 'Note resolved', signoff: 'Sign-off',
  question_to_client: 'Question to client', answer_recorded: 'Answer', reason_set: 'Reason', reveal: 'Reveal',
  clock_moved: 'Clock moved', undo: 'Undo', assignment: 'Assignment', attach_note: 'Note', time_logged: 'Time',
  verification: 'Verification', decision: 'Decision', question_to_colleague: 'Question to colleague', finding_cleared: 'Finding cleared',
};
const UNDOABLE: EventType[] = ['adjustment', 'review_note', 'note_resolved', 'signoff', 'question_to_client', 'reason_set', 'assignment',
  'attach_note', 'time_logged', 'verification', 'decision', 'question_to_colleague', 'finding_cleared', 'clock_moved'];

function summary(e: WorkEvent, m: (t: unknown) => string): string {
  const pl = e.payload;
  switch (e.type) {
    case 'adjustment': return `${pl.from !== undefined ? m(pl.from) + ' to ' : ''}${m(pl.value ?? pl.to ?? pl.newValue)}${pl.reason ? ': ' + m(pl.reason) : ''}${pl.status ? ` (${m(pl.status)})` : ''}`;
    case 'signoff': return `${m(pl.level ?? '')} sign-off on ${m(pl.value ?? '')}${pl.scope === 'return' ? ' (return approved)' : ''}`;
    case 'clock_moved': return `to ${when(String(pl.to ?? ''))}`;
    case 'undo': return e.retracts ? `reverses entry ${e.retracts}` : `reverses every entry in group ${e.groupId ?? ''}`;
    case 'reveal': return `revealed ${m(pl.what ?? pl.identifier ?? '')} (value never logged)`;
    case 'time_logged': return `${fmt(pl.hours)} h on ${humanize(String(pl.area ?? ''))}`;
    default: {
      const t = pl.text ?? pl.reason ?? pl.note ?? pl.question ?? pl.answer ?? pl.method ?? pl.kind;
      return t !== undefined ? m(t) : '';
    }
  }
}

export function ChangesScreen(p: WorkProps) {
  const { role, state, ix, ws } = p;
  if (!role.screens.includes('changes')) return <NoAccess role={role} screen="changes" />;
  const m = masker(state, role);
  const block = writeBlock(role, state);
  const kind = one(p.sp.kind);
  const all = [...state.events].reverse();
  const types = [...new Set(all.map((e) => e.type))];
  const list = kind ? all.filter((e) => e.type === kind) : all;
  const alts = whatIfs(ix);

  return (
    <Page label="Changes" h1="Our changes over the packet"
      tags={<><Tag tone="neu">{ix.latest.version}</Tag><Tag tone="neu">As of {when(state.storyAt)}</Tag>{block ? <Tag tone="neu">Read only</Tag> : null}</>}
      intro={<>The packet stays read only. Each action is a new entry with the original value, the reason, the authority or evidence, the tax effect and who did it. Entries are never edited or deleted; an undo is a new entry on top. Tax effects are each change taken alone, at the latest version&apos;s rates or from the engine&apos;s what-if (fixes interact; the engine has not recomputed).</>}>

      <div role="group" aria-label="Filter changes" className={s.row}>
        <a className={`${s.chip} ${!kind ? s.chipOn : ''}`} href={queryHref(p.sp, 'kind', null)}>All <span className={s.num}>{all.length}</span></a>
        {types.map((t) => (
          <a key={t} className={`${s.chip} ${kind === t ? s.chipOn : ''}`} href={queryHref(p.sp, 'kind', t)}>
            {KIND[t] ?? humanize(t)} <span className={s.num}>{all.filter((e) => e.type === t).length}</span>
          </a>
        ))}
      </div>

      <section className={s.box} aria-label="Change log">
        {list.length === 0 ? <div className={s.boxRow}><span className={s.note}>Nothing recorded yet in this workspace at this story time. Open any number and adjust, note, sign off or ask; it appears here.</span></div> : null}
        {list.map((e) => {
          const undone = isRetracted(state.events, e.seq);
          const claim = e.claimId;
          return (
            <article key={e.seq} className={s.boxRow} style={{ opacity: undone ? 0.7 : 1 }}>
              <span className={s.when} title={`Story time. Saved ${when(e.at)} by the wall clock.`}><span className={s.num}>#{e.seq}</span> · {when(e.storyAt)}</span>
              <span className={s.body}>
                <span className={s.row} style={{ gap: 6 }}>
                  <Tag tone={e.type === 'undo' ? 'neu' : e.type === 'adjustment' ? 'acc' : e.type === 'signoff' ? 'pas' : 'neu'}>{KIND[e.type] ?? humanize(e.type)}</Tag>
                  {undone ? <Tag tone="neu">Undone</Tag> : null}
                  {claim === 'return' ? <span>The return</span> : null}
                  {claim && claim !== 'return' ? <a className={s.link} href={claimHref(p.sp, claim)}>{m(claim.startsWith('line:') ? `${lineLabel(ix, claim.slice(5))} (${claim.slice(5)})` : claim)}</a> : null}
                </span>
                <span>{summary(e, m)}</span>
                {e.type === 'adjustment' && state.claims[claim ?? '']?.effect ? (
                  <span className={s.note}>Tax effect Fed {signed(state.claims[claim!].effect!.federal)} · CA {signed(state.claims[claim!].effect!.california)} <Est /></span>
                ) : null}
                <span className={s.note}>{personName(ix, e.role)}{e.groupId ? ' · saved together with others' : ''}</span>
              </span>
              {UNDOABLE.includes(e.type) && !undone ? (
                <EventButton ws={ws} role={role.key} small label="Undo" disabledReason={block}
                  events={[{ type: 'undo', retracts: e.seq, claimId: e.claimId, payload: { reason: `Undo of entry ${e.seq}` } }]} />
              ) : null}
            </article>
          );
        })}
      </section>

      <section className={s.section} aria-labelledby="chg-whatif">
        <div className={s.row}><h2 className={s.h2} id="chg-whatif">What-ifs from the engine</h2><Term k="what-if" /><Tag tone="neu">Not a change; nothing is saved to the return</Tag></div>
        <p className={s.intro}>Alternatives the engine computed on {ix.latest.version}. Reading them changes nothing; to act on one, record an election<Term k="election" /> from the line’s drawer.</p>
        <div className={s.box}>
          {alts.length === 0 ? <div className={s.boxRow}><span className={s.note}>No what-ifs in the packet.</span></div> : null}
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
