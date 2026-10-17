// Filing screen blocks for the brief's "Client approval and e-file signature" and "the client's copy".
// The client's own projection does not carry the firm's adjustments, so the amounts and the fingerprint are read from a
// staff projection on the server; only those derived amounts reach the client's page. No PIN is asked for or shown.
import type { RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { can, roles, ruleText } from '@/domain/policy';
import { getWorkspace } from '@/components/shell/load';
import { EventButton } from '@/components/work/actions';
import { day, fmt, when } from '@/components/work/lib';
import { Tag } from '@/components/work/ui';
import s from '@/components/work/work.module.css';
import { clientCopy, keyAmounts, returnFingerprint, signatures, SIGN_FORMS, type KeyAmounts, type SigningState } from './signing';

const place = (j: string) => (j === 'federal' ? 'Federal' : j === 'california' ? 'California' : j);
const formName = (k: KeyAmounts) => (k.jurisdiction === 'federal' ? 'Form 1040' : k.form.replace(/^F/, 'Form '));

/** The key amounts per jurisdiction, as one small table. */
export function AmountsTable({ rows, caption, accepted }: { rows: KeyAmounts[]; caption: string; accepted?: Record<string, string | null> }) {
  return (
    <div className={s.scroll}>
      <table className={s.table} aria-label={caption}>
        <thead><tr><th>Return</th><th className={s.r}>Income</th><th className={s.r}>Total tax</th><th className={s.r}>Payments</th><th className={s.r}>Refund or balance due</th>{accepted ? <th>Accepted</th> : null}</tr></thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.jurisdiction}>
              <td>{place(k.jurisdiction)} ({formName(k)})</td>
              <td className={s.r} title={k.income?.label}>{k.income ? fmt(k.income.value) : 'blank'}</td>
              <td className={s.r}>{k.totalTax ? fmt(k.totalTax.value) : 'blank'}</td>
              <td className={s.r}>{k.payments ? fmt(k.payments.value) : 'blank'}</td>
              <td className={s.r}>{k.result ? `${k.result.kind === 'refund' ? 'Refund' : 'Balance due'} ${fmt(k.result.value)}` : 'None'}</td>
              {accepted ? <td>{accepted[k.jurisdiction] ? day(accepted[k.jurisdiction]) : 'Not yet'}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Each spouse's signature: signed when, on which version of the return, and stale if the return changed since. */
export function SignatureRows({ st, plain, me }: { st: SigningState; plain: boolean; me?: string }) {
  return (
    <>
      {st.spouses.map((sp) => {
        const who = plain && sp.key === me ? 'You' : sp.name;
        return (
          <div key={sp.key} className={s.boxRow} data-testid={`signature-${sp.key}`}>
            <span className={s.when}>{sp.name}</span>
            <span className={s.body}>
              {!sp.signed ? <span><Tag tone="neu">Not signed</Tag> {who} {plain && sp.key === me ? 'have' : 'has'} not signed yet.</span>
                : sp.signed.stale ? <span><Tag tone="wrn">Stale</Tag> {who} signed on {when(sp.signed.storyAt)}, but the return changed after that{plain ? '. Please review it and sign again.' : `: signed version ${sp.signed.value}, now ${st.fingerprint}.`}</span>
                : <span><Tag tone="pas">Signed</Tag> {who} signed Form 8879 and FTB 8879 on {when(sp.signed.storyAt)}{plain ? '.' : `, on version ${sp.signed.value}.`}</span>}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Staff Filing: the partner's approval and who of the clients has signed, with stale signatures marked. */
export function StaffSigning({ ix, state }: { ix: PacketIndex; state: WorkspaceState }) {
  const st = signatures(ix, state);
  return (
    <section className={s.section} aria-labelledby="fil-sign" data-testid="staff-signing">
      <h2 className={s.h2} id="fil-sign">Client approval and e-file signature</h2>
      <div className={s.box}>
        <div className={s.boxRow}>
          <span className={s.when}>Partner approval</span>
          <span className={s.body}>{st.approved ? <span><Tag tone="pas">Approved</Tag> The clients may sign.</span> : <span><Tag tone="neu">Not yet</Tag> The clients can sign once the partner approves the return on Review.</span>}</span>
        </div>
        <SignatureRows st={st} plain={false} />
        <div className={s.boxRow}><span className={s.note}>Each spouse signs Form 8879 and FTB 8879 for themself, on version {st.fingerprint} of the finalized return. A signature goes stale when any finalized value changes after it. No PIN is asked for or kept.</span></div>
      </div>
    </section>
  );
}

/** Client Filing: approve and sign, then the client's copy once the return is accepted. */
export async function ClientSigning({ ws, ix, role, state }: { ws: string; ix: PacketIndex; role: RoleInfo; state: WorkspaceState }) {
  const staffKey = roles(ix).find((r) => r.kind === 'staff')?.key;
  const staff = staffKey ? (await getWorkspace(ws, staffKey)).state : state;
  const fp = returnFingerprint(ix, staff);
  const st = signatures(ix, state, fp);
  const amounts = keyAmounts(ix, staff);
  const verdict = can(ix, role, 'client_signature', { claimId: 'return', payload: { forms: [...SIGN_FORMS], value: fp } }, state);
  const copy = clientCopy(ix, state, staff);
  const keep = ruleText(ix, /retain/i);
  return (
    <>
      <section className={s.section} aria-labelledby="fil-c-sign" data-testid="client-signing">
        <h2 className={s.h2} id="fil-c-sign">Approve and sign</h2>
        <div className={s.box}>
          {state.frozen ? (
            <div className={s.boxRow}><span className={s.note}>Your return has been filed, so signing is closed.</span></div>
          ) : !st.approved ? (
            <div className={s.boxRow}><span className={s.note}>Your tax team is still finishing your return. You can sign here once the partner has approved it.</span></div>
          ) : (
            <>
              <div className={s.boxRow}><span className={s.body}>
                <span>Please check these amounts. By signing, you approve the return and allow it to be filed electronically (Form 8879 for the IRS and FTB 8879 for California). Each of you signs for yourself.</span>
                <span className={s.note}>{ix.packet.firm.name}, your tax firm, sends the return once you have both signed. No PIN is needed here.</span>
              </span></div>
              <div className={s.boxRow} style={{ display: 'block' }}><AmountsTable rows={amounts} caption="The amounts you are signing for" /></div>
            </>
          )}
          <SignatureRows st={st} plain me={role.key} />
          {!state.frozen && st.approved ? (
            <div className={s.boxRow}>
              <EventButton ws={ws} role={role.key} primary label="Approve and sign both forms"
                disabledReason={verdict.ok ? null : verdict.reason}
                events={[{ type: 'client_signature', claimId: 'return', payload: { forms: [...SIGN_FORMS], value: fp } }]} />
            </div>
          ) : null}
        </div>
      </section>
      <section className={s.section} aria-labelledby="fil-c-copy" data-testid="client-copy">
        <h2 className={s.h2} id="fil-c-copy">Your copy of the filed return</h2>
        {copy ? (
          <div className={s.box}>
            <div className={s.boxRow} style={{ display: 'block' }}>
              <AmountsTable rows={copy} caption="Your return as filed" accepted={Object.fromEntries(copy.map((c) => [c.jurisdiction, c.acceptedAt]))} />
            </div>
            <div className={s.boxRow}><span className={s.body}>
              <strong>What to keep</strong>
              <span>Keep this copy, the tax documents you gave us and your payment records together, in case a tax agency asks about this year.</span>
              {keep ? <span className={s.note}>Your tax team&rsquo;s rule: {keep}</span> : null}
            </span></div>
          </div>
        ) : <p className={s.note} style={{ margin: 0 }}>Your copy appears here once your return has been filed and accepted.</p>}
      </section>
    </>
  );
}
