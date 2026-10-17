// Filing and after: timeline up to story time (PINs redacted), extension, e-file rejection and fix, freeze, carryovers
// out, next-year plan, related returns and outside filings as rows, and the designed-not-built pieces. Copies Filing.dc.html.
import type { TimelineEvent } from '@/domain/packet/types';
import { frozenAt, visibleAt } from '@/domain/clock';
import { redactText } from '@/domain/policy';
import { refText, resolveRef } from '@/domain/refs';
import s from './work.module.css';
import { arr, claimHref, day, humanize, masker, obj, refClaim, when, type WorkProps } from './lib';
import { Designed, NoAccess, NotInPacket, Page, Tag } from './ui';
import { ClientSigning, StaffSigning } from '@/components/client/ClientFiling';

function Rows({ data, m, names = [] }: { data: Record<string, unknown>; m: (t: unknown) => string; names?: string[] }) {
  const entries = Object.entries(data);
  return (
    <div className={s.scroll}>
      <table className={s.table}>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td>{humanize(k, names)}</td>
              <td className={s.r}>{v && typeof v === 'object' && !Array.isArray(v)
                ? Object.entries(v as Record<string, unknown>).map(([a, b]) => `${humanize(a)} ${m(b)}`).join(' · ')
                : m(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilingScreen(p: WorkProps) {
  const { role, state, ix } = p;
  if (!role.screens.includes('filing')) return <NoAccess role={role} screen="filing" />;
  const m = masker(state, role);
  const t = (x: unknown) => m(redactText(typeof x === 'string' ? x : x == null ? '' : String(x)));
  const pk = ix.packet;
  const isClient = role.kind === 'client';
  const isExaminer = role.kind === 'examiner';
  const freezeAt = frozenAt(ix);
  const agency = obj(pk.tax_agency_records);
  const efile = arr(agency.efile).map(obj).filter((e) => visibleAt(String(e.date), state.storyAt));
  const notices = arr(agency.notices).map(obj).filter((n) => visibleAt(String(n.dated) + 'T23:59:59Z', state.storyAt));
  const timeline = pk.timeline
    .filter((e) => visibleAt(e.at, state.storyAt))
    .filter((e) => !isClient || !e.actor);
  const later = pk.timeline.length - pk.timeline.filter((e) => visibleAt(e.at, state.storyAt)).length;
  const ext = obj(pk.what_if.extension);
  const extEvent = pk.timeline.find((e) => /extension/i.test(e.event));
  const extVisible = extEvent ? visibleAt(extEvent.at, state.storyAt) : false;
  const rejected = efile.filter((e) => e.status === 'rejected');
  const accepted = efile.filter((e) => e.status === 'accepted');
  const firstReject = rejected[0] ? String(rejected[0].date) : null;
  const firstAccept = accepted[0] ? String(accepted[0].date) : null;
  const fixEvents: TimelineEvent[] = firstReject
    ? pk.timeline.filter((e) => e.at > firstReject && (!firstAccept || e.at < firstAccept) && visibleAt(e.at, state.storyAt))
    : [];
  const carry = obj(ix.latest.carryovers_out);
  const names = pk.household.people.map((x) => String(x.name).split(' ')[0]);
  const plan = obj(pk.planning_reference_2026);
  const related = arr(pk.household.related_returns).map(obj);
  const outside = (pk.firm.deadlines as Record<string, unknown>[]).filter((d) => /outside/i.test(String(d.what)));

  const refLink = (r: string, i = 0, all: string[] = [r]) => {
    const c = refClaim(ix, r);
    const label = m(refText(resolveRef(ix, r, ix.latest.version)));
    const sep = i < all.length - 1 ? <span aria-hidden="true" className={s.note}> · </span> : null;
    return <span key={r}>{c ? <a className={s.link} style={{ color: 'var(--acc)' }} title={m(r)} href={claimHref(p.sp, c)}>{label}</a> : <span title={m(r)}>{label}</span>}{sep}</span>;
  };

  if (isExaminer) {
    const exam = notices.filter((n) => arr(n.items_under_examination).length);
    return (
      <Page label="Filing and after" h1="Items under examination"
        tags={<><Tag tone="neu">As of {when(state.storyAt)}</Tag>{state.frozen ? <Tag tone="acc">As filed, locked</Tag> : null}</>}
        intro="The return as filed and the items the letter asks about, with the documents they rest on. Read only.">
        {exam.length === 0 ? <p className={s.note}>No examination letter at this story time.</p> : null}
        <div className={s.box}>
          {accepted.map((e) => (
            <div key={String(e.submission_id)} className={s.boxRow}><Tag tone="pas">Accepted</Tag><strong>{humanize(String(e.jurisdiction))} return as filed</strong><span className={s.note}>{when(String(e.date))} · submission {m(e.submission_id)}</span></div>
          ))}
          {accepted.length === 0 ? <div className={s.boxRow}><span className={s.note}>No accepted return at this story time.</span></div> : null}
        </div>
        {exam.map((n) => (
          <section key={String(n.id)} className={s.box}>
            <div className={s.boxRow}><Tag tone="acc">{m(n.type)}</Tag><strong>Tax year {String(n.tax_year ?? "")}</strong><span className={s.note}>Dated {day(String(n.dated))} · response due {day(String(n.response_due ?? ''))}</span>{n.document ? refLink(String(n.document)) : null}</div>
            {arr(n.items_under_examination).map((it, i) => <div key={i} className={s.boxRow}><span className={s.grow}>{m(it)}</span></div>)}
          </section>
        ))}
        <Designed title="Examination response pack" text="Per item: the claim, its source pages, the finalized value as filed and the sign-offs, assembled for the examiner." />
      </Page>
    );
  }

  if (isClient) {
    // Plain words only: no internal text, no version names, no references, no staff names; PINs never shown.
    const signed = pk.timeline.find((e) => /8879/.test(e.event) && visibleAt(e.at, state.storyAt));
    const money = pk.timeline.filter((e) => /paid|refund/i.test(e.event) && visibleAt(e.at, state.storyAt));
    const where = (j: string) => {
      const mine = efile.filter((e) => e.jurisdiction === j);
      const last = mine[mine.length - 1];
      return last ? last : null;
    };
    const agencyName = (j: string) => (j === 'federal' ? 'the IRS' : j === 'california' ? 'California (FTB)' : humanize(j));
    const fedPay = obj(ext.federal).paid_with_form_4868;
    return (
      <Page label="Filing" h1="Filing your return"
        tags={<>{state.frozen ? <Tag tone="pas">Filed and accepted</Tag> : <Tag tone="neu">Not filed yet</Tag>}</>}
        intro="Where your return is, what was sent, and what comes next. Your tax team handles the filing; nothing here needs you unless it says so.">
        <section className={s.section} aria-labelledby="fil-c-where">
          <h2 className={s.h2} id="fil-c-where">Where your return is</h2>
          <div className={s.box}>
            {['federal', 'california'].map((j) => {
              const e = where(j);
              return (
                <div key={j} className={s.boxRow}>
                  <span className={s.when}>{j === 'federal' ? 'Federal return' : 'California return'}</span>
                  <span className={s.body}>
                    {!e ? <span><Tag tone="neu">Not sent yet</Tag> Your tax team sends it once you have approved and signed.</span>
                      : e.status === 'accepted' ? <span><Tag tone="pas">Accepted</Tag> Accepted by {agencyName(j)} on {day(String(e.date))}.</span>
                      : e.status === 'rejected' ? <span><Tag tone="blk">Sent back</Tag> {agencyName(j)} sent it back on {day(String(e.date))}. Your tax team is fixing it. Their reason: {arr(e.errors).map(obj).map((er) => m(er.message)).join(' ')}</span>
                      : <span><Tag tone="wrn">Waiting</Tag> Held until the federal return is accepted.</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section className={s.section} aria-labelledby="fil-c-steps">
          <h2 className={s.h2} id="fil-c-steps">What has happened</h2>
          <div className={s.box}>
            {extVisible ? <div className={s.boxRow}><span className={s.when}>{day(extEvent!.at)}</span><span className={s.body}>Your tax team asked for more time to file{typeof fedPay === 'number' && fedPay > 0 ? ` and paid ${m(fedPay)} to the IRS with the request` : ''}.</span></div> : null}
            {signed ? <div className={s.boxRow}><span className={s.when}>{day(signed.at)}</span><span className={s.body}>You approved the return and signed the e-file authorization.</span></div> : null}
            {money.map((e) => <div key={e.id} className={s.boxRow}><span className={s.when}>{day(e.at)}</span><span className={s.body}>{t(e.detail)}</span></div>)}
            {!extVisible && !signed && !money.length ? <div className={s.boxRow}><span className={s.note}>Nothing yet.</span></div> : null}
          </div>
        </section>
        {arr(plan.federal_estimate_due_dates).length || arr(plan.california_estimate_due_dates).length ? (
          <section className={s.section} aria-labelledby="fil-c-next">
            <h2 className={s.h2} id="fil-c-next">Next year&rsquo;s estimated payments</h2>
            <div className={s.box}>
              {arr(plan.federal_estimate_due_dates).length ? <div className={s.boxRow}><span className={s.when}>To the IRS</span><span className={s.body}>{arr(plan.federal_estimate_due_dates).map((d) => day(String(d))).join(', ')}</span></div> : null}
              {arr(plan.california_estimate_due_dates).length ? <div className={s.boxRow}><span className={s.when}>To California</span><span className={s.body}>{arr(plan.california_estimate_due_dates).map((d) => day(String(d))).join(', ')}</span></div> : null}
            </div>
            <p className={s.note} style={{ margin: 0 }}>Your tax team will tell you the amounts.</p>
          </section>
        ) : null}
        <ClientSigning ws={p.ws} ix={ix} role={role} state={state} />
      </Page>
    );
  }

  return (
    <Page label="Filing and after" h1={isClient ? 'Filing your return' : 'Filing, e-file and after'}
      tags={<>
        <Tag tone="neu">As of {when(state.storyAt)}</Tag>
        <Tag tone="neu">Stage: {state.stage}</Tag>
        {state.frozen ? <Tag tone="acc" title="The return as accepted; it cannot be edited, later work attaches to it">As filed, locked</Tag> : null}
      </>}
      intro={isClient
        ? 'Where your return is, what was sent, and what comes next. Your tax team handles the filing.'
        : `Everything up to story time. ${later ? `${later} later events stay hidden until the story clock reaches them.` : ''}`}>

      <section className={s.section} aria-labelledby="fil-freeze">
        <h2 className={s.h2} id="fil-freeze">The filed record</h2>
        <div className={s.box} style={{ padding: '14px 16px' }}>
          {state.frozen
            ? <span><Tag tone="acc">As filed, locked</Tag> Accepted on {when(freezeAt)}. The as-filed record is read only; any later change is an amendment on top of it.</span>
            : freezeAt
              ? <span><Tag tone="neu">Open</Tag> Not yet accepted at story time. The record locks at federal acceptance.</span>
              : <span><Tag tone="neu">Open</Tag> No federal acceptance in the agency records.</span>}
        </div>
      </section>

      <StaffSigning ix={ix} state={state} />

      <section className={s.section} aria-labelledby="fil-ext">
        <h2 className={s.h2} id="fil-ext">Extension</h2>
        {extVisible && Object.keys(ext).length ? (
          <div className={s.box}>
            <div className={s.boxRow}><span className={s.when}>{when(extEvent!.at)}</span><span className={s.body}>{isClient ? 'Your tax team asked for more time to file and sent a payment with the request.' : t(extEvent!.detail)}<span className={s.note}>Based on {m(ext.based_on_version)} · computed {when(String(ext.computed_at))}</span></span></div>
            {!isClient ? (['federal', 'california'] as const).map((j) => ext[j] ? (
              <div key={j} className={s.boxRow}><span className={s.when}>{humanize(j)}</span><span className={s.body}><Rows data={obj(ext[j])} m={m} /></span></div>
            ) : null) : null}
          </div>
        ) : <p className={s.note} style={{ margin: 0 }}>No extension at this story time.</p>}
      </section>

      <section className={s.section} aria-labelledby="fil-efile">
        <h2 className={s.h2} id="fil-efile">E-file</h2>
        <div className={s.box}>
          {efile.length === 0 ? <div className={s.boxRow}><span className={s.note}>Nothing transmitted at this story time.</span></div> : null}
          {efile.map((e) => (
            <div key={String(e.submission_id)} className={s.boxRow}>
              <span className={s.when}>{when(String(e.date))}</span>
              <span className={s.body}>
                <span className={s.row} style={{ gap: 6 }}>
                  <Tag tone={e.status === 'accepted' ? 'pas' : e.status === 'rejected' ? 'blk' : 'wrn'}>{humanize(String(e.status))}</Tag>
                  <strong>{humanize(String(e.jurisdiction))}</strong>
                  {!isClient ? <span className={s.mono}>Submission {m(e.submission_id)}</span> : null}
                </span>
                {arr(e.errors).map(obj).map((er, i) => <span key={i}>{!isClient ? <span className={s.mono}>{m(er.code)} </span> : null}{m(er.message)}</span>)}
              </span>
            </div>
          ))}
          {fixEvents.length ? (
            <div className={s.boxRow} style={{ background: 'var(--bg)' }}>
              <span className={s.when}><span className={s.lbl}>The fix</span></span>
              <span className={s.body}>
                {fixEvents.map((e) => <span key={e.id}>{when(e.at)} · {humanize(e.event)}{e.refs.length ? ': ' : ''}{e.refs.map(refLink)}</span>)}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className={s.section} aria-labelledby="fil-tl">
        <h2 className={s.h2} id="fil-tl">Timeline to story time</h2>
        <div className={s.box}>
          {timeline.map((e) => (
            <div key={e.id} className={s.boxRow}>
              <span className={s.when}>{when(e.at)}</span>
              <span className={s.body}>
                <strong style={{ fontWeight: 600 }}>{humanize(e.event)}</strong>
                {e.detail ? <span>{t(e.detail)}</span> : null}
                {!isClient && (e.actor || e.refs.length) ? <span className={s.row} style={{ gap: 6 }}>{e.actor ? <span className={s.note}>{m(pk.firm.staff.find((x) => x.id === e.actor)?.name ?? e.actor)}</span> : null}{e.refs.map(refLink)}</span> : null}
              </span>
            </div>
          ))}
        </div>
        <p className={s.note} style={{ margin: 0 }}>Signature PINs and full identifiers are removed from every entry.</p>
      </section>

      {notices.length && !isClient ? (
        <section className={s.section} aria-labelledby="fil-not">
          <h2 className={s.h2} id="fil-not">Agency notices</h2>
          <div className={s.box}>
            {notices.map((n) => (
              <div key={String(n.id)} className={s.boxRow}>
                <span className={s.when}>{day(String(n.dated))}</span>
                <span className={s.body}>
                  <span className={s.row} style={{ gap: 6 }}><Tag tone="acc">{m(n.agency)} {m(n.type)}</Tag><span>Tax year {String(n.tax_year ?? "")}</span>{n.document ? refLink(String(n.document)) : null}</span>
                  {n.summary ? <span>{m(n.summary)}</span> : null}
                  {n.status ? <span className={s.note}>{m(n.status)}</span> : null}
                  {arr(n.items_under_examination).map((it, i) => <span key={i}>· {m(it)}</span>)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isClient ? (
        <section className={s.section} aria-labelledby="fil-carry">
          <h2 className={s.h2} id="fil-carry">Carryovers out of {ix.latest.version}</h2>
          {Object.keys(carry).length ? (
            <div className={s.cols}>
              {Object.entries(carry).map(([j, v]) => (
                <div key={j} className={s.box}><div className={s.boxRow}><span className={s.lbl}>{humanize(j)}</span></div><div style={{ padding: '0 0 6px' }}><Rows data={obj(v)} m={m} names={names} /></div></div>
              ))}
            </div>
          ) : <NotInPacket what="Carryovers out" />}
          <p className={s.note} style={{ margin: 0 }}>From the latest version as computed; adjustments we make are not recomputed by the engine.</p>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="fil-next">
        <h2 className={s.h2} id="fil-next">Next year</h2>
        {Object.keys(plan).length ? (
          <div className={s.box}>
            {arr(plan.federal_estimate_due_dates).length ? <div className={s.boxRow}><span className={s.when}>Federal estimates due</span><span className={s.body}>{arr(plan.federal_estimate_due_dates).map((d) => day(String(d))).join(', ')}</span></div> : null}
            {plan.federal_safe_harbor ? <div className={s.boxRow}><span className={s.when}>Federal safe harbor</span><span className={s.body}>{m(plan.federal_safe_harbor)}</span></div> : null}
            {arr(plan.california_estimate_due_dates).length ? <div className={s.boxRow}><span className={s.when}>California estimates due</span><span className={s.body}>{arr(plan.california_estimate_due_dates).map((d, i) => {
              const pct = arr(plan.california_installment_percentages)[i];
              return `${day(String(d))}${typeof pct === 'number' ? ` (${Math.round(pct * 100)}%)` : ''}`;
            }).join(', ')}</span></div> : null}
            {plan.california_safe_harbor ? <div className={s.boxRow}><span className={s.when}>California safe harbor</span><span className={s.body}>{m(plan.california_safe_harbor)}</span></div> : null}
            {arr(plan.known_2026_changes_for_this_household).map((c, i) => <div key={i} className={s.boxRow}><span className={s.when}>{i === 0 ? 'Known changes' : ''}</span><span className={s.body}>{m(c)}</span></div>)}
          </div>
        ) : <NotInPacket what="Next-year plan" />}
      </section>

      {!isClient ? (
        <section className={s.section} aria-labelledby="fil-rel">
          <h2 className={s.h2} id="fil-rel">Related returns and outside filings</h2>
          <div className={s.scroll}>
            <table className={s.table}>
              <thead><tr><th>Who</th><th>Return or filing</th><th>Prepared by or due</th><th>In this packet</th></tr></thead>
              <tbody>
                {related.map((r, i) => (
                  <tr key={'r' + i}><td>{m(r.who)}</td><td>{m(r.return)}</td><td>{m(r.prepared_by)}</td><td>{r.in_this_packet === false ? 'No' : m(r.in_this_packet)}</td></tr>
                ))}
                {outside.map((d, i) => (
                  <tr key={'o' + i}><td>Outside this engagement</td><td>{m(d.what)}</td><td>Due {day(String(d.date))}</td><td>No</td></tr>
                ))}
                {related.length + outside.length === 0 ? <tr><td colSpan={4}>Not in the packet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={s.section} aria-labelledby="fil-designed">
        <h2 className={s.h2} id="fil-designed">Designed, not built in this round</h2>
        <div className={s.designedGrid}>
          {!isClient ? <Designed title="Examination response pack" text="For a later letter: each item under examination with its claims, source pages, finalized value and sign-offs." /> : null}
          {!isClient ? <Designed title="Penalty and interest estimate" text="Late-payment interest and penalty from the packet's post-filing rates, by day paid, labelled as an estimate." /> : null}
          <Designed title="Attaching a real file" text="Uploading a new document to a claim. Notes on claims are built; file upload is not." />
        </div>
      </section>
    </Page>
  );
}
