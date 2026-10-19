// Review memo: one page, read top to bottom, printable (memoData.ts beside it builds it from the projected state). Opened
// from Review once the return is approved; staff only (the Shell refuses other roles, as for Review).
import { redirect } from 'next/navigation';
import { memoBlock, memoData, type MemoBy } from './memoData';
import type { Amount } from '@/components/client/signing';
import { SEVERITY_ORDER, SEVERITY_WORD, day, fmt, humanize, masker, signed, when, type WorkProps } from './lib';
import { Est } from './ui';
import { PrintButton } from './PrintButton';
import s from './work.module.css';

const by = (b: MemoBy | null) => (b ? `${b.name}, ${when(b.at)}` : '');
/** A recorded sentence, closed with a full stop when it has none, so who and when can follow it. */
const sentence = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function MemoScreen(p: WorkProps) {
  const { ix, state, role, ws } = p;
  const back = `/w/${encodeURIComponent(ws)}/${encodeURIComponent(role.key)}/review`;
  if (memoBlock(ix, state)) redirect(back);
  const d = memoData(ix, state, p.findings);
  if (!d) redirect(back);
  const m = masker(state, role);
  const amount = (a: Amount | undefined) => (!a ? '' : a.needsEngine ? 'Needs engine re-run' : fmt(a.value));
  const resolved = d.resolutions.length;

  return (
    <div className={s.memoWrap}>
      <div className={s.memoTools}>
        <a className={s.link} href={back}>Back to Review</a>
        <PrintButton />
      </div>
      <article className={s.memo} data-testid="memo" aria-labelledby="memo-h">
        <header className={s.memoHead}>
          <span className={s.lbl}>Review memo</span>
          <h1 className={s.memoTitle} id="memo-h">{m(d.household)}{d.taxYear ? `, tax year ${d.taxYear}` : ''}</h1>
          <dl className={s.memoMeta}>
            <div><dt>Return</dt><dd>Version {d.version}, fingerprint <span className={s.num}>{d.fingerprint}</span></dd></div>
            <div><dt>As of</dt><dd>{when(d.storyAt)}</dd></div>
            <div><dt>Printed by</dt><dd>{role.name}, {role.title}</dd></div>
          </dl>
        </header>

        <section className={s.memoSec} aria-labelledby="memo-facts">
          <h2 className={s.memoH2} id="memo-facts">Summary</h2>
          <dl className={s.memoFacts}>
            <div><dt>Approval</dt><dd>{d.approval.kind === 'partner'
              ? `Approved by ${d.approval.name}, ${when(d.approval.at)}.`
              : `Approved per the firm’s record: the clients signed Form 8879 on ${day(d.approval.signedAt)}. No partner approval event in this workspace.`}</dd></div>
            <div data-testid="memo-signatures"><dt>Signatures</dt><dd>{d.signatures.length
              ? d.signatures.map((x) => `${x.name} signed ${day(x.at)}${x.record ? ' (firm’s record)' : ''}${x.stale ? ', before a later change' : ''}`).join('; ') + '.'
              : 'Neither spouse has signed yet.'}</dd></div>
            <div><dt>Counts</dt><dd>{d.changes.length} change{d.changes.length === 1 ? '' : 's'}, {resolved} blocker{resolved === 1 ? '' : 's'} resolved, {d.open.total} check{d.open.total === 1 ? '' : 's'} open.</dd></div>
          </dl>
        </section>

        <section className={s.memoSec} aria-labelledby="memo-fig">
          <h2 className={s.memoH2} id="memo-fig">Figures: {d.basis}</h2>
          <table className={s.memoTable}>
            <thead><tr><th scope="col">Jurisdiction</th><th scope="col">Income</th><th scope="col">Total tax</th><th scope="col">Payments</th><th scope="col">Refund or balance due</th></tr></thead>
            <tbody>
              {d.figures.map((f) => (
                <tr key={f.jurisdiction}>
                  <th scope="row">{humanize(f.jurisdiction)} <span className={s.mono}>{f.form}</span></th>
                  <td>{amount(f.income)}</td><td>{amount(f.totalTax)}</td><td>{amount(f.payments)}</td>
                  <td>{f.result ? (f.result.needsEngine ? 'Needs engine re-run' : `${f.result.kind === 'refund' ? 'Refund' : 'Balance due'} ${fmt(f.result.value)}`) : 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={s.memoSec} aria-labelledby="memo-chg">
          <h2 className={s.memoH2} id="memo-chg">Changes</h2>
          {d.changes.length === 0 ? <p className={s.note}>No changes to the computed return.</p> : null}
          {d.changes.map((c) => (
            <div key={c.key} className={s.memoItem}>
              <div className={s.memoItemHead}>
                <strong>{m(c.label)}</strong> <span className={s.mono}>{c.key}</span>
                <span className={s.num}><span className={s.old}>{m(c.from)}</span> to <strong>{m(c.to)}</strong></span>
              </div>
              <dl className={s.memoFacts}>
                <div><dt>Reason</dt><dd>{m(c.reason) || 'None recorded'} <span className={s.note}>(as recorded)</span></dd></div>
                {c.authority ? <div><dt>Authority</dt><dd>{m(c.authority)}</dd></div> : null}
                {c.effect ? <div><dt>Tax effect</dt><dd className={s.num}>Fed {signed(c.effect.federal)} · CA {signed(c.effect.california)} <Est /> <span className={s.note}>from {c.effect.basis}</span></dd></div> : null}
                <div><dt>Made by</dt><dd>{c.proposedBy ? `Proposed by ${by(c.proposedBy)}; applied by ${by(c.by)}` : by(c.by)}</dd></div>
                <div><dt>Signed off</dt><dd>{c.signoffs.length ? c.signoffs.map((x) => `${cap(x.level)}: ${by(x)}${x.note ? `: ${m(x.note)}` : ''}`).join('; ') : 'Not signed off'}</dd></div>
              </dl>
              {c.moved.length ? (
                <table className={s.memoTable} aria-label={`Lines moved by the change to ${c.key}`}>
                  <thead><tr><th scope="col">Line it moved</th><th scope="col">Engine</th><th scope="col">Now</th></tr></thead>
                  <tbody>
                    {c.moved.map((x) => (
                      <tr key={x.key}><th scope="row">{m(x.label)} <span className={s.mono}>{x.key}</span></th><td>{m(x.from)}</td><td>{x.needsEngine ? 'Needs engine re-run' : m(x.to)}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ))}
        </section>

        <section className={s.memoSec} aria-labelledby="memo-res">
          <h2 className={s.memoH2} id="memo-res">How each blocker was resolved</h2>
          {resolved === 0 ? <p className={s.note}>No blocker was resolved in this workspace.</p> : (
            <ul className={`${s.memoList} ${s.memoStack}`}>
              {d.resolutions.map((r, i) => (
                <li key={i}>
                  <span>{m(r.how === 'note' ? `Blocking review note: ${r.title}` : r.how === 'partner' ? `Over the partner threshold: ${r.title}` : r.title)}</span>
                  <span className={s.note}>{r.how === 'cleared' ? `Cleared: ${sentence(m(r.text ?? 'no reason recorded'))} ${by(r.by)}`
                    : r.how === 'adjusted' ? `Resolved by the change to ${m(r.text)}`
                    : r.how === 'partner' ? `Partner sign-off by ${by(r.by)}${r.text ? `: ${m(r.text)}` : ''}`
                    : `Resolved by ${by(r.by)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.memoSec} aria-labelledby="memo-open">
          <h2 className={s.memoH2} id="memo-open">Open at {when(d.storyAt)}</h2>
          <p>{SEVERITY_ORDER.map((k) => `${d.open.counts[k]} ${SEVERITY_WORD[k].toLowerCase()}${d.open.counts[k] === 1 ? '' : 's'}`).join(', ')}; {d.open.aiNeedsReview} AI suggestion{d.open.aiNeedsReview === 1 ? '' : 's'} not acted on.</p>
          {d.open.titles.length ? (
            <ul className={s.memoList}>
              {d.open.titles.map((t, i) => <li key={i}><span>{m(t.title)}</span><span className={s.note}>{SEVERITY_WORD[t.severity]}</span></li>)}
            </ul>
          ) : null}
          {d.open.total > d.open.titles.length ? <p className={s.note}>And {d.open.total - d.open.titles.length} more, on Checks.</p> : null}
        </section>

        <footer className={s.memoFoot}>Generated from the workspace event log. Amounts in US dollars; times are story time, UTC.</footer>
      </article>
    </div>
  );
}
