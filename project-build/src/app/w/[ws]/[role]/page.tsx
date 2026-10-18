import { roles } from '@/domain/policy';
import Link from 'next/link';
import { Shell, roleLabel } from '@/components/shell/Shell';
import { StartHere } from '@/components/shell/StartHere';
import { getWorkspace } from '@/components/shell/load';
import { maskText } from '@/domain/policy';
import { claimHref, examinedLines, fmtDay, fmtStory, fmtValue, screenPath } from '@/components/shell/lib';
import type { Finding, RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { visibleAt } from '@/domain/clock';
import { humanize } from '@/domain/labels';
import { findingStatus } from '@/components/work/lib';
import { TextAction } from '@/components/work/actions';
import { Term } from '@/components/term/Term';

type P = { params: Promise<{ ws: string; role: string }>; searchParams: Promise<Record<string, string | undefined>> };

const ORDER: Record<Finding['severity'], number> = { blocker: 0, check: 1, judgment: 2, info: 3 };

export default async function Home({ params, searchParams }: P) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const w = await getWorkspace(ws, role);
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
  // Blockers are listed once, in their own section; the open-checks list holds the rest.
  const listed = new Set(state.blockers.map((b) => b.claimId));
  const others = visible.filter((f) => !listed.has('finding:' + f.id));
  const c = ix.counts;
  const first = me.screens[0];
  const tryLink = `${screenPath(ws, 'daniel', 'checks')}`;

  return (
    <Shell ws={ws} role={me.key} screen="home" state={state} roleInfo={me} claim={sp.claim} q={sp.q}>
      <div className="screen">
        <div className="screen-head"><div>
          <h1>{isClient ? `Hello, ${me.name.split(' ')[0]}` : me.kind === 'examiner' ? 'Items under examination' : 'Home'}</h1>
          <span className="sub">{isClient ? 'What your tax team needs from you, in plain words.' : me.kind === 'examiner' ? 'Read only: the items in the notice and the return lines they concern, as filed.' : state.frozen ? 'Filed and accepted. The return as filed, and what you do now.' : 'Your queue: blockers first, then checks that failed, then judgment calls.'}</span>
          <span className="small muted num">As of {fmtStory(state.storyAt)}</span>
        </div></div>

        {me.kind === 'staff' && (
          <StartHere>
            <p>Taxmark is a web-native workpaper for one household&apos;s {String(ix.packet.household.tax_year ?? '')} return: click any number to see the page and field it came from, the rule that built it, who checked it and what is still open.</p>
            <div className="counts num" data-testid="counts">
              <span><strong>{c.documents.toLocaleString('en-US')}</strong> documents</span>
              <span><strong>{c.values.toLocaleString('en-US')}</strong> values read from them</span>
              <span><strong>{c.versions}</strong> computed versions</span>
              <span><strong>{c.lines.toLocaleString('en-US')}</strong> lines on {ix.latest.version}</span>
              <span><strong>{c.timeline}</strong> events in the timeline</span>
            </div>
            <p>Try: open <Link href={tryLink}>Checks as Daniel</Link>, click California estimates, then switch role in “Viewing as” to see what each person may see and do.</p>
            <div>
              <span className="lbl">The roles · {w.allRoles.length}</span>
              <div className="rolelist">
                {w.allRoles.map((r) => (
                  <Link key={r.key} href={screenPath(ws, r.key, r.screens[0])}>
                    <span className="t" style={{ fontWeight: 600 }}>{roleLabel(r)}</span>
                    <span className="small muted">{r.kind === 'client' ? ' · client view' : r.kind === 'examiner' ? ' · read only, items under examination' : r.clearance ? '' : ' · no sensitive-data clearance'}{r.activeFrom && r.activeFrom > state.storyAt ? ` · joins ${fmtDay(r.activeFrom)}` : ''}</span>
                  </Link>
                ))}
              </div>
            </div>
            <p className="small muted">Every action is saved as an event in this workspace<Term k="workspace" /> (/w/{ws}); open the root link again for a clean copy. Anything not in the packet is tagged <span className="ex">Example</span><Term k="example-tag" />.</p>
          </StartHere>
        )}


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
        ) : state.frozen ? (
          <AfterFiling ws={ws} ix={ix} state={state} me={me} findings={visible} mask={mask} />
        ) : (
          <>
            {state.blockers.length > 0 && (
              <section aria-label="Blocking approval" style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 className="lbl" style={{ paddingBottom: 8 }}>Blocking approval<Term k="blocker" /> · <span className="num">{state.blockers.length}</span></h2>
                {state.blockers.map((b) => <Link key={b.claimId + b.title} className="qrow" href={claimHref(b.claimId)}><span className="tag t-blk">Blocking</span><span className="grow"><span>{mask(b.title)}</span></span></Link>)}
              </section>
            )}
            <section aria-label="Open checks" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="row" style={{ paddingBottom: 8 }}>
                <h2 className="lbl">{listed.size ? 'Other open checks' : 'Open checks'} · <span className="num">{others.length}</span></h2>
                {me.screens.includes('checks') && <Link className="btn" style={{ marginLeft: 'auto' }} href={screenPath(ws, me.key, 'checks')}>Open all checks</Link>}
              </div>
              {visible.length === 0 && <p className="small muted">No check has fired at this story time{w.findings.length ? '' : ' (the check library is not loaded yet)'}.</p>}
              {visible.length > 0 && others.length === 0 && <p className="small muted">Every open check is a blocker, listed above.</p>}
              {others.length > 0 && <p className="small">{others.length} more open checks{listed.size ? ' besides the blockers above' : ''}. Each has its source, evidence and actions on Checks.</p>}
            </section>
            <div className="row">
              {first !== 'home' ? null : <Link className="btn primary" href={screenPath(ws, me.key, 'return')}>Open the return</Link>}
              <Link className="btn" href={screenPath(ws, me.key, 'documents')}>Open the documents</Link>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

const SUMMARY = /^(adjusted gross income|total tax|amount you owe|overpaid tax)$/i;

/** Home once the return is accepted: no approval queue. The return as filed, then what this role does now. */
function AfterFiling({ ws, ix, state, me, findings, mask }: { ws: string; ix: PacketIndex; state: WorkspaceState; me: RoleInfo; findings: Finding[]; mask: (t: string) => string }) {
  const efile = (((ix.packet.tax_agency_records as { efile?: { date: string; jurisdiction: string; status: string }[] }).efile) ?? [])
    .filter((e) => e.status === 'accepted' && visibleAt(e.date, state.storyAt));
  const lines = ix.latest.lines.filter((l) => SUMMARY.test(l.label.trim()));
  const adjusted = Object.values(state.claims).filter((c) => c.adjusted).length;
  const open = findings.filter((f) => !findingStatus(f, state).cleared);
  const names = (ix.packet.household.people ?? []).map((p) => String(p.name).split(' ')[0]);
  const carry = (ix.latest.carryovers_out ?? {}) as Record<string, Record<string, unknown>>;
  const carryRows = Object.entries(carry).flatMap(([j, o]) => Object.entries(o ?? {}).flatMap(([k, v]) => {
    if (typeof v === 'number') return v ? [{ key: j + k, j, label: humanize(k, names), value: fmtValue(v) }] : [];
    if (v && typeof v === 'object') return [{ key: j + k, j, label: humanize(k, names), value: Object.entries(v as Record<string, unknown>).map(([a, b]) => `${a} ${fmtValue(b)}`).join(', ') }];
    return [];
  }));
  const link = (k: Parameters<typeof screenPath>[2], text: string) => me.screens.includes(k) ? <Link className="btn" href={screenPath(ws, me.key, k)}>{text}</Link> : null;
  return (
    <>
      <section aria-label="As filed" className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="lbl">The return as filed</h2>
        {efile.map((e) => <span key={e.jurisdiction + e.date}><span className="tag t-pas">Accepted</span> {humanize(e.jurisdiction)} return, {fmtStory(e.date)}</span>)}
        <span className="small muted">{ix.latest.version}{adjusted ? ` plus ${adjusted} adjustment${adjusted === 1 ? '' : 's'} (finalized, not recomputed by the engine)` : ', as computed'}. Read only; a later change is an amendment on top.<Term k="amend-on-top" /></span>
        {lines.map((l) => (
          <Link key={l.key} className="qrow" href={claimHref('line:' + l.key)}>
            <span className="grow"><span>{l.label}</span><span className="small muted">{humanize(l.jurisdiction)} · {l.key}</span></span>
            <span className="val num">{fmtValue(state.claims['line:' + l.key]?.current ?? l.value)}</span>
          </Link>
        ))}
      </section>
      <section aria-label="What you do now" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="lbl">What you do now</h2>
        {me.key === 'sam' ? (
          <p style={{ margin: 0 }}>Quality review of the filed return: read each change with its reason, authority and tax effect, the review notes and how they were resolved, and who signed what. Everything is read only.</p>
        ) : me.key === 'next' ? (
          <p style={{ margin: 0 }}>Next year&apos;s return starts here: the carryovers out of {ix.latest.version} and the items still open when this return was filed.</p>
        ) : (
          <p style={{ margin: 0 }}>The return is filed and locked. Anything new, such as an agency letter or a client message, attaches as a later event.</p>
        )}
        {me.key === 'next' && (
          <>
            <h3 className="lbl">Carryovers into next year<Term k="carryover" /> · <span className="num">{carryRows.length}</span></h3>
            {carryRows.length === 0 && <p className="small muted">No carryovers in the packet.</p>}
            {carryRows.map((r) => <div key={r.key} className="qrow"><span className="grow"><span>{mask(r.label)}</span><span className="small muted">{humanize(r.j)}</span></span><span className="val num">{mask(r.value)}</span></div>)}
            <h3 className="lbl">Open items at filing · <span className="num">{open.length}</span></h3>
            {open.length === 0 && <p className="small muted">Nothing was left open.</p>}
            {open.slice(0, 12).map((f) => <Link key={f.id} className="qrow" href={claimHref('finding:' + f.id)}><span className="grow"><span>{mask(f.title)}</span></span></Link>)}
          </>
        )}
        <div className="row">
          {me.key === 'sam' ? <>{link('review', 'Open Review')}{link('changes', 'Open Changes')}{link('findings', 'Open Findings')}</> : null}
          {link('filing', me.key === 'next' ? 'Carryovers and next-year plan' : 'The filed record')}
        </div>
      </section>
    </>
  );
}
