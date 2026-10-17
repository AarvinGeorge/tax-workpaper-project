// Firm: standards quoted, staff and clearance, view log (reveal events), time against budget, deadlines on the story
// clock, and the story clock control. Copies Firm.dc.html.
import { deadlines } from '@/domain/clock';
import s from './work.module.css';
import { arr, day, fmt, humanize, liveEvents, masker, obj, personName, ruleList, when, writeBlock, type WorkProps } from './lib';
import { NoAccess, Page, Tag } from './ui';
import { ClockControl, TimeForm } from './actions';

// Where each firm rule acts in this app (matched on the rule's own words, so a changed standard still lands somewhere).
const ACTS: [RegExp, string][] = [
  [/may not review/i, 'Review: sign-off disabled on your own adjustment'],
  [/partner sign-off/i, 'Review: partner items; approval waits for them'],
  [/authority/i, 'Drawer: decisions record their authority'],
  [/due diligence/i, 'Drawer: due diligence decisions'],
  [/review notes block/i, 'Review: blocking notes stop approval'],
  [/clearance|masked/i, 'Everywhere: last 4 only; reveals logged below'],
  [/retained/i, 'Filing: the as-filed record is locked, not deleted'],
];

export function FirmScreen(p: WorkProps) {
  const { role, state, ix, ws } = p;
  if (!role.screens.includes('firm')) return <NoAccess role={role} screen="firm" />;
  const m = masker(state, role);
  const firm = ix.packet.firm;
  const std = firm.starter_standards;
  const rules = ruleList(ix);
  const steps = arr(std.required_steps).map(String);
  const verifs = arr(std.verification_types).map(String);
  const levels = arr(std.review_levels).map(String);
  const variance = obj(std.variance_review);
  const budget = Object.entries(obj(firm.budget_hours)).map(([k, v]) => ({ key: k, hours: Number(v) }));
  const logged = liveEvents(state.events).filter((e) => e.type === 'time_logged');
  const byArea = new Map<string, number>();
  for (const e of logged) byArea.set(String(e.payload.area), (byArea.get(String(e.payload.area)) ?? 0) + Number(e.payload.hours ?? 0));
  const totalBudget = budget.reduce((a, b) => a + b.hours, 0);
  const totalLogged = [...byArea.values()].reduce((a, b) => a + b, 0);
  const dl = deadlines(ix, state.storyAt);
  const block = writeBlock(role, state);
  const clockBlock = role.kind !== 'staff' ? 'Only firm staff move the story clock.' : null;
  const clockOptions = [...ix.packet.timeline]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((t) => ({ at: t.at, label: `${when(t.at)} · ${humanize(t.event)}` }));
  if (!clockOptions.some((o) => o.at === state.storyAt)) clockOptions.unshift({ at: state.storyAt, label: `${when(state.storyAt)} · current story time` });
  const staffName = (id: string | null | undefined) => firm.staff.find((x) => x.id === id)?.name ?? id ?? '';

  return (
    <Page label="Firm" h1={`${firm.name}: standards, people and time`}
      tags={<><Tag tone="neu">As of {when(state.storyAt)}</Tag>{role.key !== 'jo' ? <Tag tone="neu">Read only</Tag> : null}</>}
      intro="The firm's starter standards as delivered in the packet, quoted where they act in the app; who is on the engagement and what they may see; who viewed sensitive data; time against budget; deadlines measured on the story clock.">

      <section className={s.section} aria-labelledby="firm-clock">
        <h2 className={s.h2} id="firm-clock">Story clock</h2>
        <div className={s.box} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Story time is <strong>{when(state.storyAt)}</strong> · stage {state.stage}{state.frozen ? ' · as filed, locked' : ''}. Events and documents after it are hidden from everyone.</span>
          <ClockControl ws={ws} role={role.key} options={clockOptions} current={state.storyAt} disabledReason={clockBlock} />
        </div>
      </section>

      <section className={s.section} aria-labelledby="firm-std">
        <div className={s.row}><h2 className={s.h2} id="firm-std">Firm standards</h2><span className={s.note}>{m(std.note ?? '')}</span></div>
        <div className={s.box}>
          <div className={s.boxRow}><span className={s.lbl}>Rules ({rules.length})</span></div>
          {rules.map((r) => {
            const acts = ACTS.find(([re]) => re.test(r))?.[1];
            return (
              <div key={r} className={s.boxRow}>
                <span className={s.grow}>“{m(r)}”</span>
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
            <div className={s.boxRow}><span className={s.lbl}>Verification types</span></div>
            <ul style={{ margin: 0, padding: '10px 16px 6px 34px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {verifs.map((x) => <li key={x}>{humanize(x)}</li>)}
            </ul>
            <div className={s.boxRow}><span className={s.lbl}>Review levels</span><span>{levels.map(humanize).join(', ')}</span></div>
            <div className={s.boxRow}><span className={s.lbl}>Variance review</span>
              <span>Compare to {humanize(String(variance.compare_to ?? ''))}; flag when the change is over {fmt(variance.flag_if_change_over_percent)}% and over {fmt(variance.and_over_amount)}.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="firm-staff">
        <h2 className={s.h2} id="firm-staff">People and clearance</h2>
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

      <section className={s.section} aria-labelledby="firm-log">
        <h2 className={s.h2} id="firm-log">View log</h2>
        <p className={s.note} style={{ margin: 0 }}>Every unmasked view of an identifier: who, which, when. The value itself is never logged.</p>
        <div className={s.box}>
          {state.reveals.length === 0 ? <div className={s.boxRow}><span className={s.note}>No reveals in this workspace at this story time.</span></div> : null}
          {state.reveals.map((r) => (
            <div key={r.seq} className={s.boxRow}><span className={s.when}>{when(r.at)}</span><strong>{personName(ix, r.role)}</strong><span className={s.grow}>{m(r.what)}</span></div>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="firm-time">
        <h2 className={s.h2} id="firm-time">Time against budget</h2>
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

      <section className={s.section} aria-labelledby="firm-dl">
        <h2 className={s.h2} id="firm-dl">Deadlines on the story clock</h2>
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
    </Page>
  );
}
