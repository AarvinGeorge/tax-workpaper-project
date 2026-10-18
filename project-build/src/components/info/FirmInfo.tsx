// The firm reference behind the "?" button, moved unchanged in content from the retired Firm screen: standards quoted
// where they act in the app, people and clearance, time against budget (with Log time), and deadlines on the story clock.
import type { RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { deadlines } from '@/domain/clock';
import s from '../work/work.module.css';
import { arr, day, fmt, humanize, liveEvents, masker, obj, ruleList, writeBlock } from '../work/lib';
import { Tag } from '../work/ui';
import { Term } from '../term/Term';
import { TimeForm } from '../work/actions';

type P = { ix: PacketIndex; state: WorkspaceState; role: RoleInfo; ws: string };

// Where each firm rule acts in this app (matched on the rule's own words, so a changed standard still lands somewhere).
const ACTS: [RegExp, string][] = [
  [/may not review/i, 'Review: sign-off disabled on your own adjustment'],
  [/partner sign-off/i, 'Review: partner items; approval waits for them'],
  [/authority/i, 'Drawer: decisions record their authority'],
  [/due diligence/i, 'Drawer: due diligence decisions'],
  [/review notes block/i, 'Review: blocking notes stop approval'],
  [/clearance|masked/i, 'Everywhere: last 4 only; reveals logged on Review, View log'],
  [/retained/i, 'Filing: the as-filed record is locked, not deleted'],
];

export function FirmStandards({ ix, state, role }: P) {
  const m = masker(state, role);
  const std = ix.packet.firm.starter_standards;
  const rules = ruleList(ix);
  const steps = arr(std.required_steps).map(String);
  const verifs = arr(std.verification_types).map(String);
  const levels = arr(std.review_levels).map(String);
  const variance = obj(std.variance_review);
  return (
    <section className={s.section} aria-labelledby="firm-std">
      {std.note ? <span className={s.note}>{m(std.note)}</span> : null}
      <div className={s.box}>
        <div className={s.boxRow}><span className={s.lbl}>Rules ({rules.length})</span></div>
        {rules.map((r) => {
          const acts = ACTS.find(([re]) => re.test(r))?.[1];
          return (
            <div key={r} className={s.boxRow}>
              <span className={s.grow}>“{m(r)}”{/due diligence/i.test(r) ? <Term k="due-diligence" /> : /partner sign-off/i.test(r) ? <Term k="partner-threshold" /> : null}</span>
              {acts ? <span className={s.note}>{acts}</span> : <Tag tone="neu">Not enforced in this build</Tag>}
            </div>
          );
        })}
      </div>
      <div className={s.cols}>
        <div className={s.box}>
          <div className={s.boxRow}><span className={s.lbl}>The {steps.length} required steps</span></div>
          <ol style={{ margin: 0, padding: '10px 16px 12px 40px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {steps.map((x) => <li key={x}>{m(x)}</li>)}
          </ol>
        </div>
        <div className={s.box}>
          <div className={s.boxRow}><span className={s.lbl}>Verification types<Term k="verification" /></span></div>
          <ul style={{ margin: 0, padding: '10px 16px 6px 34px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {verifs.map((x) => <li key={x}>{humanize(x)}</li>)}
          </ul>
          <div className={s.boxRow}><span className={s.lbl}>Review levels<Term k="sign-off" /></span><span>{levels.map(humanize).join(', ')}</span></div>
          <div className={s.boxRow}><span className={s.lbl}>Variance review<Term k="swing" /></span>
            <span>Compare to {humanize(String(variance.compare_to ?? ''))}; flag when the change is over {fmt(variance.flag_if_change_over_percent)}% and over {fmt(variance.and_over_amount)}.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function People({ ix, state, role }: P) {
  const m = masker(state, role);
  const firm = ix.packet.firm;
  const staffName = (id: string | null | undefined) => firm.staff.find((x) => x.id === id)?.name ?? id ?? '';
  return (
    <section className={s.section} aria-labelledby="firm-staff">
      <div className={`${s.box} ${s.scroll}`}>
        <table className={s.table}>
          <thead><tr><th>Name</th><th>Role</th><th>Credential</th><th>Sensitive data</th><th>Active from</th><th>Note</th></tr></thead>
          <tbody>
            {firm.staff.map((x) => (
              <tr key={x.id}>
                <td>{m(x.name)}</td><td>{humanize(x.role)}</td><td>{m(x.credential ?? '')}</td>
                <td><Tag tone={x.sensitive_data_clearance ? 'pas' : 'wrn'}>{x.sensitive_data_clearance ? 'Cleared' : 'No clearance'}</Tag></td>
                <td className={s.num}>{x.active_from && x.active_from > state.storyAt ? <>{day(x.active_from)} <Tag tone="neu">Later</Tag></> : day(x.active_from)}</td>
                <td>{m(x.note ?? '')}</td>
              </tr>
            ))}
            {firm.client_users.map((c) => (
              <tr key={c.id}><td>{m(c.name)}</td><td>{humanize(c.role)}</td><td></td><td><Tag tone="neu">Own items only</Tag></td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.note} style={{ margin: 0 }}>Assignment at the start: {Object.entries(obj(firm.assignment_at_start)).map(([k, v]) => `${humanize(k)} ${staffName(String(v))}`).join(' · ')}</p>
    </section>
  );
}

export function TimeBudget({ ix, state, role, ws }: P) {
  const firm = ix.packet.firm;
  const budget = Object.entries(obj(firm.budget_hours)).map(([k, v]) => ({ key: k, hours: Number(v) }));
  const logged = liveEvents(state.events).filter((e) => e.type === 'time_logged');
  const byArea = new Map<string, number>();
  for (const e of logged) byArea.set(String(e.payload.area), (byArea.get(String(e.payload.area)) ?? 0) + Number(e.payload.hours ?? 0));
  const totalBudget = budget.reduce((a, b) => a + b.hours, 0);
  const totalLogged = [...byArea.values()].reduce((a, b) => a + b, 0);
  const block = writeBlock(role, state);
  return (
    <section className={s.section} aria-labelledby="firm-time">
      <div className={`${s.box} ${s.scroll}`}>
        <table className={s.table}>
          <thead><tr><th>Area</th><th className={s.r}>Budget (h)</th><th className={s.r}>Logged (h)</th><th className={s.r}>Left (h)</th><th>Status</th></tr></thead>
          <tbody>
            {budget.map((b) => {
              const l = byArea.get(b.key) ?? 0;
              return (
                <tr key={b.key}>
                  <td>{humanize(b.key)}</td><td className={s.r}>{fmt(b.hours)}</td><td className={s.r}>{fmt(l)}</td><td className={s.r}>{fmt(Math.round((b.hours - l) * 100) / 100)}</td>
                  <td>{l > b.hours ? <Tag tone="wrn">Over budget</Tag> : l > 0 ? <Tag tone="pas">Within</Tag> : <Tag tone="neu">None logged</Tag>}</td>
                </tr>
              );
            })}
            <tr><td><strong>Total</strong></td><td className={s.r}><strong>{fmt(totalBudget)}</strong></td><td className={s.r}><strong>{fmt(totalLogged)}</strong></td><td className={s.r}>{fmt(Math.round((totalBudget - totalLogged) * 100) / 100)}</td><td></td></tr>
          </tbody>
        </table>
      </div>
      <p className={s.note} style={{ margin: 0 }}>Budget from the packet. Logged time is what people record in this workspace; the packet has no time records.</p>
      {role.kind === 'staff' ? <TimeForm ws={ws} role={role.key} areas={budget.map((b) => ({ key: b.key, label: humanize(b.key) }))} disabledReason={block} /> : null}
    </section>
  );
}

export function Deadlines({ ix, state, role }: Omit<P, 'ws'>) {
  const m = masker(state, role);
  const dl = deadlines(ix, state.storyAt);
  return (
    <section className={s.section} aria-labelledby="firm-dl">
      <div className={s.box}>
        {dl.map((d) => (
          <div key={d.what + d.date} className={s.boxRow}>
            <span className={s.when}>{day(d.date)}</span>
            <span className={s.grow}>{m(d.what)}</span>
            <Tag tone={d.status === 'passed' ? 'neu' : d.status === 'due_soon' ? 'wrn' : 'acc'}>
              {d.status === 'passed' ? `Passed ${Math.abs(d.daysLeft)} days ago` : d.status === 'due_soon' ? `Due in ${d.daysLeft} days` : `In ${d.daysLeft} days`}
            </Tag>
          </div>
        ))}
      </div>
    </section>
  );
}
