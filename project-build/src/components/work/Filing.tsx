// Filing for clients (where the return is, what happened, approve and sign, their copy) and for the examiner (the items
// under examination, as filed). Staff Filing is retired: its essentials sit on the Return overview, Review and Areas.
import { visibleAt } from '@/domain/clock';
import { redactText } from '@/domain/policy';
import { refText, resolveRef } from '@/domain/refs';
import s from './work.module.css';
import { arr, claimHref, day, humanize, masker, obj, refClaim, when, type WorkProps } from './lib';
import { Designed, NoAccess, Page, Tag } from './ui';
import { Term } from '../term/Term';
import { ClientSigning } from '@/components/client/ClientFiling';

export function FilingScreen(p: WorkProps) {
  const { role, state, ix } = p;
  if (!role.screens.includes('filing')) return <NoAccess role={role} screen="filing" />;
  const m = masker(state, role);
  const t = (x: unknown) => m(redactText(typeof x === 'string' ? x : x == null ? '' : String(x)));
  const pk = ix.packet;
  const isClient = role.kind === 'client';
  const isExaminer = role.kind === 'examiner';
  const agency = obj(pk.tax_agency_records);
  const efile = arr(agency.efile).map(obj).filter((e) => visibleAt(String(e.date), state.storyAt));
  const notices = arr(agency.notices).map(obj).filter((n) => visibleAt(String(n.dated) + 'T23:59:59Z', state.storyAt));
  const ext = obj(pk.what_if.extension);
  const extEvent = pk.timeline.find((e) => /extension/i.test(e.event));
  const extVisible = extEvent ? visibleAt(extEvent.at, state.storyAt) : false;
  const accepted = efile.filter((e) => e.status === 'accepted');
  const plan = obj(pk.planning_reference_2026);

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
            <div className={s.boxRow}><Tag tone="acc">{m(n.type)}</Tag>{/566/.test(String(n.type)) ? <Term k="letter-566" /> : null}<strong>Tax year {String(n.tax_year ?? "")}</strong><span className={s.note}>Dated {day(String(n.dated))} · response due {day(String(n.response_due ?? ''))}</span>{n.document ? refLink(String(n.document)) : null}</div>
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
        tags={<>{state.frozen ? <Tag tone="pas">Filed and accepted</Tag> : <Tag tone="neu">Not filed yet</Tag>}</>}>
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
                      : e.status === 'rejected' ? <span><Tag tone="blk">Sent back</Tag><Term k="efile-rejection" /> {agencyName(j)} sent it back on {day(String(e.date))}. Your tax team is fixing it. Their reason: {arr(e.errors).map(obj).map((er) => m(er.message)).join(' ')}</span>
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
            <h2 className={s.h2} id="fil-c-next">Next year&rsquo;s estimated payments<Term k="estimated-tax" /></h2>
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

  // Staff never reach here (filing is not in their screen list; /filing redirects them to the Return overview).
  return <NoAccess role={role} screen="filing" />;
}
