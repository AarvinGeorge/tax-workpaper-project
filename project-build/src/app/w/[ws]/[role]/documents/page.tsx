import Link from 'next/link';
import { Shell } from '@/components/shell/Shell';
import { getWorkspace } from '@/components/shell/load';
import { documentLanding, REASON_LABEL } from '@/domain/docs';
import { maskText, visibleDocIds } from '@/domain/policy';
import { claimHref, fmtDay, parseClaim } from '@/components/shell/lib';
import type { DocLanding } from '@/domain/contracts';
import type { ReactNode } from 'react';
import { Term } from '@/components/term/Term';
import { OverviewHead } from '@/components/overview/OverviewHead';

type P = { params: Promise<{ ws: string; role: string }>; searchParams: Promise<Record<string, string | undefined>> };

const REASON = REASON_LABEL;

export default async function Documents({ params, searchParams }: P) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const w = await getWorkspace(ws, role);
  const { ix, state, role: me } = w;
  const mask = (t: string) => maskText(t, me, false);
  const all = documentLanding(ix, state.storyAt).filter((d) => d.visible);

  // Who may see which documents: clients their own (belongs_to), the examiner only what the examined items cite.
  let scope = all;
  let head = 'Documents';
  let sub: ReactNode = <>Every document with where it landed<Term k="landed" /> on the return, or the typed reason it did not.</>;
  const allowed = visibleDocIds(ix, me.key);
  if (allowed) scope = all.filter((d) => allowed.has(d.docId));
  if (me.kind === 'client') {
    head = 'Your documents';
    sub = `The ${scope.length} documents on file for you and your household, and when each arrived.`;
  } else if (me.kind === 'examiner') {
    head = 'Documents cited by the items under examination';
    sub = 'Read only. The notice and the documents behind its items. Other documents are not part of this record.';
  }

  const codes = [...new Set(scope.map((d) => d.reason?.code).filter(Boolean))] as NonNullable<DocLanding['reason']>['code'][];
  const filter = sp.status ?? 'all';
  const rows = scope.filter((d) => filter === 'all' || d.status === filter || d.reason?.code === filter);
  const selected = parseClaim(sp.claim);
  const selDoc = selected?.kind === 'doc' ? selected.key : null;
  const staff = me.kind === 'staff';
  const href = (status?: string) => (status && status !== 'all' ? `?status=${status}` : '?');
  const pill = (key: string, label: string, n: number) => (
    <Link key={key} className={`btn${filter === key ? ' on' : ''}`} aria-pressed={filter === key} href={href(key)}>{label} <span className="num muted">{n}</span></Link>
  );
  const hidden = ix.counts.documents - all.length;
  const said = new Map<string, number>();
  for (const d of rows) if (d.reason?.text) said.set(d.reason.text, (said.get(d.reason.text) ?? 0) + 1);
  const shared = new Set([...said].filter(([, n]) => n > 1).map(([t]) => t));

  return (
    <Shell ws={ws} role={me.key} screen="documents" state={state} roleInfo={me} claim={sp.claim} q={sp.q}>
      <div className="screen">
        {staff ? (
          <>
            <OverviewHead ws={ws} w={w} tab="documents" />
            <span className="small muted num">{scope.length} shown{hidden > 0 ? ` · ${hidden} arrive later in the story` : ''}</span>
          </>
        ) : (
          <div className="screen-head">
            <div><h1>{head}</h1><span className="sub">{sub}</span></div>
            <span className="small muted num">{scope.length} shown{hidden > 0 ? ` · ${hidden} arrive later in the story` : ''}</span>
          </div>
        )}
        {staff && (
          <div className="row" role="group" aria-label="Filter documents">
            {pill('all', 'All', scope.length)}
            {pill('landed', 'Landed', scope.filter((d) => d.status === 'landed').length)}
            {pill('not_landed', 'Did not land', scope.filter((d) => d.status === 'not_landed').length)}
            {codes.map((c) => pill(c, REASON[c] ?? c, scope.filter((d) => d.reason?.code === c).length))}
          </div>
        )}
        <section aria-label="Document list" data-testid="doc-list">
          {rows.length === 0 && <p className="small muted">No document matches this filter.</p>}
          {rows.map((d) => (
            <Link key={d.docId} className={`docrow${d.docId === selDoc ? ' sel' : ''}`} href={claimHref('doc:' + d.docId, { status: sp.status })} scroll={false} data-doc={d.docId}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span><span className="mono muted">{d.docId}</span> <span style={{ fontWeight: 500 }}>{mask(d.title)}</span></span>
                <span className="small muted row" style={{ gap: 6 }}><span className="kind">{d.type.replace(/_/g, ' ')}</span>{d.issuer ?? ''}</span>
                <span className="small muted num">Received {fmdDay(d.receivedAt)}{d.owner ? ` · ${d.owner.replace(':', ', ')}` : ''}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {staff ? <>
                  <span><span className={`tag ${d.status === 'landed' ? 't-pas' : d.reason?.code === 'unused' ? 't-wrn' : 't-mut'}`}>{d.status === 'landed' ? 'Landed' : REASON[d.reason?.code ?? 'unused']}</span></span>
                  {/* A reason sentence several rows share says no more than their tag; it stays in the panel. */}
                  <span className="small">{d.status === 'landed' ? `On ${d.landedLines.slice(0, 4).join(', ')}${d.landedLines.length > 4 ? ` and ${d.landedLines.length - 4} more` : ''}` : (shared.has(d.reason?.text ?? '') ? '' : mask(d.reason?.text ?? ''))}</span>
                </> : <span><span className="tag t-pas">Received</span></span>}
              </span>
              <span className="small num" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {staff ? <><span><strong>{d.usedValues}</strong> of {d.totalValues} values used</span><span className="muted">{d.landedLines.length} line{d.landedLines.length === 1 ? '' : 's'}</span></> : <span className="muted">Open</span>}
              </span>
            </Link>
          ))}
        </section>
      </div>
    </Shell>
  );
}

const fmdDay = (iso: string) => fmtDay(iso);
