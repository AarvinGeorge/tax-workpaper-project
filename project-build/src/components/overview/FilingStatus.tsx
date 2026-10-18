// Filing status under the overview figures (staff), following the story clock: per jurisdiction what was sent and what
// came back, the extension when visible, the lock once accepted, and each agency notice. The data reads are the staff
// Filing screen's (efile, extension, notices); no new domain logic.
import Link from 'next/link';
import type { WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { visibleAt } from '@/domain/clock';
import { claimHref, fmtDay, fmtValue } from '@/components/shell/lib';
import { arr, humanize, obj } from '@/components/work/lib';
import { Term } from '@/components/term/Term';

export function FilingStatus({ ix, state, mask }: { ix: PacketIndex; state: WorkspaceState; mask: (t: string) => string }) {
  const pk = ix.packet;
  const agency = obj(pk.tax_agency_records);
  const efile = arr(agency.efile).map(obj).filter((e) => visibleAt(String(e.date), state.storyAt));
  // This return's filing status: a notice about another tax year (the 2023 CP2000) is not part of it; it stays on Documents.
  const taxYear = Number(pk.household.tax_year);
  const notices = arr(agency.notices).map(obj)
    .filter((n) => visibleAt(String(n.dated) + 'T23:59:59Z', state.storyAt) && (!taxYear || Number(n.tax_year) === taxYear));
  const ext = obj(pk.what_if.extension);
  const extEvent = pk.timeline.find((e) => /extension/i.test(e.event));
  const extVisible = extEvent ? visibleAt(extEvent.at, state.storyAt) : false;
  const paid = Object.entries(obj(ext.federal)).find(([k]) => /^paid_with/.test(k))?.[1];
  const tone = (st: string) => (st === 'accepted' ? 't-pas' : st === 'rejected' ? 't-blk' : 't-wrn');
  return (
    <section className="filestat" aria-label="Filing status" data-testid="filing-status">
      {['federal', 'california'].map((j) => {
        const mine = efile.filter((e) => e.jurisdiction === j);
        return (
          <div key={j}>
            <span className="k">{humanize(j)}</span>
            <span>{mine.length === 0 ? <span className="tag t-mut">Not sent</span> : mine.map((e, i) => (
              <span key={String(e.submission_id)}>
                {i > 0 ? <span className="muted"> then </span> : null}
                <span className={`tag ${tone(String(e.status))}`}>{humanize(String(e.status))} {fmtDay(String(e.date))}</span>
                {arr(e.errors).length ? `: ${arr(e.errors).map(obj).map((er) => mask(String(er.message ?? ''))).join(' ')}` : ''}
                {e.status === 'rejected' ? <Term k="efile-rejection" /> : null}
              </span>
            ))}</span>
          </div>
        );
      })}
      {extVisible && Object.keys(ext).length ? (
        <div><span className="k">Extension<Term k="extension" /></span>
          <span>Filed {fmtDay(extEvent!.at)}{typeof paid === 'number' && paid > 0 ? ` with ${fmtValue(paid)}` : ''}{ext.based_on_version ? `, estimated from ${String(ext.based_on_version)}` : ''}</span>
        </div>
      ) : null}
      {state.frozen ? <div><span className="k">Record</span><span><span className="tag t-acc">As filed, locked</span> a later change is an amendment on top</span></div> : null}
      {notices.map((n) => (
        <div key={String(n.id)}><span className="k">Notice</span>
          <span>{n.document
            ? <Link href={claimHref('doc:' + String(n.document))}>{mask(`${String(n.agency)} ${String(n.type)}`)}</Link>
            : mask(`${String(n.agency)} ${String(n.type)}`)} dated {fmtDay(String(n.dated))}{/566/.test(String(n.type)) ? <Term k="letter-566" /> : null}</span>
        </div>
      ))}
    </section>
  );
}
