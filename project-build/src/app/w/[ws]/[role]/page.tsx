import { roles } from '@/domain/policy';
import { FormsTab } from '@/components/overview/FormsTab';
import Link from 'next/link';
import { Shell } from '@/components/shell/Shell';
import { getWorkspace } from '@/components/shell/load';
import { maskText } from '@/domain/policy';
import { claimHref, examinedLines, fmtDay, fmtStory, fmtValue } from '@/components/shell/lib';
import type { Finding } from '@/domain/contracts';
import { findingStatus } from '@/components/work/lib';
import { TextAction } from '@/components/work/actions';
import { Term } from '@/components/term/Term';

type P = { params: Promise<{ ws: string; role: string }>; searchParams: Promise<Record<string, string | undefined>> };

const ORDER: Record<Finding['severity'], number> = { blocker: 0, check: 1, judgment: 2, info: 3 };

export default async function Home({ params, searchParams }: P) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const w = await getWorkspace(ws, role);
  // Staff land on the Return overview (its Forms tab); clients and the examiner keep their own Home.
  if (w.role.kind === 'staff') return FormsTab({ ws, role, sp, screen: 'home' });
  const { ix, state, role: me } = w;
  const mask = (t: string) => maskText(t, me, false);
  const isClient = me.kind === 'client';
  const visible = w.findings.filter((f) => f.source !== 'ai').filter((f) => !f.firstVisibleAt || f.firstVisibleAt <= state.storyAt).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const myQuestions = state.events.filter((e) => e.type === 'question_to_client' && e.payload.to === me.key);
  const openQuestions = myQuestions.filter((q) => !state.events.some((x) => x.type === 'answer_recorded' && Number(x.payload.questionSeq) === q.seq));
  // A client's asks stand only while the return is open and the item is not already resolved.
  // Whether an ask is resolved is the firm's record (a client's own projection never sees a clear or an adjustment).
  const staffKey = isClient ? roles(ix).find((r) => r.kind === 'staff')?.key : undefined;
  const firm = staffKey ? (await getWorkspace(ws, staffKey)).state : state;
  const plain = state.frozen ? [] : visible.filter((f) => f.plain && !findingStatus(f, firm).cleared);

  return (
    <Shell ws={ws} role={me.key} screen="home" state={state} roleInfo={me} claim={sp.claim} q={sp.q}>
      <div className="screen">
        <div className="screen-head"><div>
          <h1>{isClient ? `Hello, ${me.name.split(' ')[0]}` : me.kind === 'examiner' ? 'Items under examination' : 'Home'}</h1>
          <span className="sub">{isClient ? 'What your tax team needs from you, in plain words.' : me.kind === 'examiner' ? 'Read only: the items in the notice and the return lines they concern, as filed.' : state.frozen ? 'Filed and accepted. The return as filed, and what you do now.' : 'Your queue: blockers first, then checks that failed, then judgment calls.'}</span>
          <span className="small muted num">As of {fmtStory(state.storyAt)}</span>
        </div></div>



        {me.kind === 'examiner' ? (
          <section aria-label="Items under examination" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(((ix.packet.tax_agency_records as { notices?: { type: string; dated: string; response_due?: string; items_under_examination?: string[] }[] }).notices) ?? [])
              .filter((n) => (n.items_under_examination ?? []).length > 0).map((n) => (
                <div key={n.type} className="panel">
                  <span className="lbl">{n.type}{/566/.test(n.type) ? <Term k="letter-566" /> : null} · dated {fmtDay(n.dated)}{n.response_due ? ` · response due ${fmtDay(n.response_due)}` : ''}</span>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>{(n.items_under_examination ?? []).map((t) => <li key={t}>{t}</li>)}</ol>
                </div>
              ))}
            <h2 className="lbl" style={{ paddingTop: 8 }}>Lines as filed · <span className="num">{examinedLines(ix).length}</span></h2>
            {examinedLines(ix).map((k) => { const l = ix.line(ix.latest.version, k)!; return (
              <Link key={k} className="qrow" href={claimHref('line:' + k)}><span className="grow"><span>{l.label}</span><span className="mono muted">{k}</span></span><span className="val num">{fmtValue(state.claims['line:' + k]?.current ?? l.value)}</span></Link>
            ); })}
          </section>
        ) : isClient ? (
          <section aria-label="What we need from you" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="lbl" style={{ paddingBottom: 8 }}>What we need from you · <span className="num">{openQuestions.length + plain.length}</span></h2>
            {myQuestions.length + plain.length === 0 && <p className="small muted">Nothing right now. We will ask here if we need anything.</p>}
            {myQuestions.map((e) => {
              const answer = [...state.events].reverse().find((x) => x.type === 'answer_recorded' && Number(x.payload.questionSeq) === e.seq);
              return (
                <div key={e.seq} className="qrow" data-testid="client-question" style={{ flexWrap: 'wrap' }}>
                  <span className={`tag ${answer ? 't-pas' : 't-acc'}`}>{answer ? 'Answered' : 'Question'}</span>
                  <span className="grow">
                    <span>{mask(String(e.payload.text ?? ''))}</span>
                    <span className="small muted">From your tax team, {fmtDay(e.storyAt)}</span>
                    {answer
                      ? <span className="small" data-testid="client-answer">Your answer, {fmtDay(answer.storyAt)}: {mask(String(answer.payload.text ?? ''))}</span>
                      : <TextAction ws={ws} role={me.key} label="Your answer" placeholder="Type your answer in your own words"
                          build={{ type: 'answer_recorded', claimId: e.claimId, payload: { questionSeq: e.seq }, field: 'text' }} />}
                  </span>
                </div>
              );
            })}
            {plain.map((f) => <Link key={f.id} className="qrow" href={claimHref('finding:' + f.id)}><span className="tag t-acc">Needed</span><span className="grow"><span>{mask(f.plain!)}</span></span></Link>)}
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
