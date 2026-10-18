// The Return overview's head, shared by its four tabs (Forms, Areas, Documents, What-ifs): the three figures, the filing
// status, the tab bar (on the first screen), and on the Forms tab what stops filing (one line that opens the list on
// Checks) or, after filing, the filed record. The tabs are the existing routes, so every deep link and the side panel
// keep working. The old Start here card is the "?" dialog's Demo section.
import Link from 'next/link';
import type { Workspace } from '@/components/shell/load';
import { claimHref, fmtValue, screenPath } from '@/components/shell/lib';
import { keyAmounts, signatures } from '@/components/client/signing';
import { maskText } from '@/domain/policy';
import type { ScreenKey } from '@/domain/contracts';
import { AfterFiling } from './AfterFiling';
import { blockerLine } from './blockers';
import { notComputedText } from '@/domain/clock';
import { FilingStatus } from './FilingStatus';
import { basisText, effectEstimate } from '@/domain/versions';

export type OverviewTab = 'forms' | 'areas' | 'documents' | 'whatifs';
const TABS: { key: OverviewTab; screen: ScreenKey; label: string }[] = [
  { key: 'forms', screen: 'return', label: 'Forms' }, { key: 'areas', screen: 'areas', label: 'Areas' }, { key: 'documents', screen: 'documents', label: 'Documents' },
  { key: 'whatifs', screen: 'whatifs', label: 'What-ifs' },
];

export function OverviewHead({ ws, w, tab }: { ws: string; w: Workspace; tab: OverviewTab }) {
  const { ix, state, role: me } = w;
  const mask = (t: string) => maskText(t, me, false);
  // The finalized figures: the latest version plus applied adjustments, as the version label says; never re-estimated.
  const rows = keyAmounts(ix, state);
  const fed = rows.find((r) => r.jurisdiction === 'federal');
  const ca = rows.find((r) => r.jurisdiction === 'california');
  const notComputed = notComputedText(ix);
  const basis = notComputed ?? basisText(ix.latest.version, state);
  // A figure the flow-through cannot recompute keeps the engine value, says so, and shows the adjustments' estimate.
  const est = effectEstimate(state);
  const cards = [
    { label: 'Adjusted gross income', a: fed?.income, est: undefined },
    { label: 'Federal tax', a: fed?.totalTax, est: est?.federal },
    { label: 'California tax', a: ca?.totalTax, est: est?.california },
  ];
  const visible = (k: ScreenKey) => me.screens.includes(k);
  const closed = state.frozen || signatures(ix, state).byRecord;
  const stop = blockerLine(ws, me.key, state.blockers, closed);
  const visibleFindings = w.findings.filter((f) => f.source !== 'ai' && (!f.firstVisibleAt || f.firstVisibleAt <= state.storyAt));

  return (
    <>
      <div className="screen-head"><div>
        <h1>Return overview</h1>
        {notComputed ? <span className="sub">{notComputed}.</span> : null}
      </div></div>

      <div className="kpis" data-testid="kpis" role="group" aria-label="The return in three figures">
        {cards.map((k) => (
          <Link key={k.label} className="kpi" href={k.a ? screenPath(ws, me.key, 'return') + claimHref('line:' + k.a.key) : screenPath(ws, me.key, 'return')}>
            <span className="kpi-l">{k.label}</span>
            <span className="kpi-v num">{k.a ? fmtValue(k.a.value) : notComputed ? 'Not computed' : 'Blank'}</span>
            {k.a?.needsEngine && <span className="row small"><span className="tag t-wrn">Needs engine re-run</span>{k.est ? <span className="muted num">estimate {k.est > 0 ? '+' : ''}{fmtValue(k.est)}</span> : null}</span>}
            <span className="small muted">{basis}</span>
          </Link>
        ))}
      </div>

      <FilingStatus ix={ix} state={state} mask={mask} />

      <nav className="ov-tabs" aria-label="Return overview tabs">
        {TABS.filter((t) => visible(t.screen)).map((t) => (
          <Link key={t.key} className="ov-tab" href={screenPath(ws, me.key, t.screen)} aria-current={t.key === tab ? 'page' : undefined}>{t.label}</Link>
        ))}
      </nav>


      {tab === 'forms' && (state.frozen
        ? <AfterFiling ws={ws} ix={ix} state={state} me={me} findings={visibleFindings} mask={mask} />
        : stop && (
          <section aria-label="Blocking approval" style={{ display: 'flex', flexDirection: 'column' }}>
            <Link className="qrow" href={stop.href}>
              <span className={`tag ${closed ? 't-mut' : 't-blk'}`}>{closed ? 'Open' : 'Blocking'}</span><span className="grow"><span>{stop.text}</span></span><span className="small muted">Open on {stop.where}</span>
            </Link>
          </section>
        ))}

    </>
  );
}
