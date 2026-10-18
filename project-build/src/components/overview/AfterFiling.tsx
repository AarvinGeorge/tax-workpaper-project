import Link from 'next/link';
import { claimHref, fmtStory, fmtValue, screenPath } from '@/components/shell/lib';
import type { Finding, RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { visibleAt } from '@/domain/clock';
import { humanize } from '@/domain/labels';
import { findingStatus } from '@/components/work/lib';
import { Term } from '@/components/term/Term';

const SUMMARY = /^(adjusted gross income|total tax|amount you owe|overpaid tax)$/i;

/** Home once the return is accepted: no approval queue. The return as filed, then what this role does now. */
export function AfterFiling({ ws, ix, state, me, findings, mask }: { ws: string; ix: PacketIndex; state: WorkspaceState; me: RoleInfo; findings: Finding[]; mask: (t: string) => string }) {
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
