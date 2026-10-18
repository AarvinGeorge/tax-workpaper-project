// The Return overview's head, shared by its three tabs (Forms, Areas, Documents): the three figures, the tab bar (on
// the first screen), Start here, and on the Forms tab the approval queue (blockers before filing, the filed record after). The tabs are the existing routes,
// so every deep link and the side panel keep working.
import Link from 'next/link';
import { roleLabel } from '@/components/shell/Shell';
import { StartHere } from '@/components/shell/StartHere';
import type { Workspace } from '@/components/shell/load';
import { claimHref, fmtDay, fmtStory, fmtValue, screenPath } from '@/components/shell/lib';
import { keyAmounts } from '@/components/client/signing';
import { maskText } from '@/domain/policy';
import type { ScreenKey } from '@/domain/contracts';
import { Term } from '@/components/term/Term';
import { AfterFiling } from './AfterFiling';
import { notComputedText } from '@/domain/clock';

export type OverviewTab = 'forms' | 'areas' | 'documents';
const TABS: { key: OverviewTab; screen: ScreenKey; label: string }[] = [
  { key: 'forms', screen: 'return', label: 'Forms' }, { key: 'areas', screen: 'areas', label: 'Areas' }, { key: 'documents', screen: 'documents', label: 'Documents' },
];

export function OverviewHead({ ws, w, tab }: { ws: string; w: Workspace; tab: OverviewTab }) {
  const { ix, state, role: me } = w;
  const mask = (t: string) => maskText(t, me, false);
  const c = ix.counts;
  // The finalized figures: the latest version plus applied adjustments, as the version label says; never re-estimated.
  const rows = keyAmounts(ix, state);
  const fed = rows.find((r) => r.jurisdiction === 'federal');
  const ca = rows.find((r) => r.jurisdiction === 'california');
  const n = Object.values(state.claims).filter((x) => x.adjusted).length;
  const notComputed = notComputedText(ix);
  const basis = notComputed ?? `${ix.latest.version}${n ? ` plus ${n} adjustment${n === 1 ? '' : 's'}, not recomputed` : ', as computed'}`;
  const cards = [
    { label: 'Adjusted gross income', a: fed?.income },
    { label: 'Federal tax', a: fed?.totalTax },
    { label: 'California tax', a: ca?.totalTax },
  ];
  const visible = (k: ScreenKey) => me.screens.includes(k);
  const tryLink = screenPath(ws, 'daniel', 'checks');
  // A blocker on a line or finding opens on Checks; one on the whole return (an approval note) opens on Review.
  const blockerHref = (id: string) => screenPath(ws, me.key, id === 'return' ? 'review' : 'checks') + claimHref(id);
  const visibleFindings = w.findings.filter((f) => f.source !== 'ai' && (!f.firstVisibleAt || f.firstVisibleAt <= state.storyAt));

  return (
    <>
      <div className="screen-head"><div>
        <h1>Return overview</h1>
        <span className="sub">{notComputed ? `${notComputed}. ` : 'The return, its open questions and its sources in one place. '}As of {fmtStory(state.storyAt)}.</span>
      </div></div>

      <div className="kpis" data-testid="kpis" role="group" aria-label="The return in three figures">
        {cards.map((k) => (
          <Link key={k.label} className="kpi" href={k.a ? screenPath(ws, me.key, 'return') + claimHref('line:' + k.a.key) : screenPath(ws, me.key, 'return')}>
            <span className="kpi-l">{k.label}</span>
            <span className="kpi-v num">{k.a ? fmtValue(k.a.value) : notComputed ? 'Not computed' : 'Blank'}</span>
            <span className="small muted">{basis}</span>
          </Link>
        ))}
      </div>

      <nav className="ov-tabs" aria-label="Return overview tabs">
        {TABS.filter((t) => visible(t.screen)).map((t) => (
          <Link key={t.key} className="ov-tab" href={screenPath(ws, me.key, t.screen)} aria-current={t.key === tab ? 'page' : undefined}>{t.label}</Link>
        ))}
      </nav>

      <StartHere>
        <p>Taxmark is a web-native workpaper for one household&apos;s {String(ix.packet.household.tax_year ?? '')} return: click any number to see the page and field it came from, the rule that built it, who checked it and what is still open.</p>
        <div className="counts num" data-testid="counts">
          <span><strong>{c.documents.toLocaleString('en-US')}</strong> documents</span>
          <span><strong>{c.values.toLocaleString('en-US')}</strong> values read from them</span>
          <span><strong>{c.versions}</strong> computed versions</span>
          <span><strong>{c.lines.toLocaleString('en-US')}</strong> lines on {ix.latest.version}</span>
          <span><strong>{c.timeline}</strong> events in the timeline</span>
        </div>
        <p>Try: open <Link href={tryLink}>Checks as Daniel</Link>, click California estimates, then switch role in “Viewing as” to see what each person may see and do.</p>
        <div>
          <span className="lbl">The roles · {w.allRoles.length}</span>
          <div className="rolelist">
            {w.allRoles.map((r) => (
              <Link key={r.key} href={screenPath(ws, r.key, r.screens[0])}>
                <span className="t" style={{ fontWeight: 600 }}>{roleLabel(r)}</span>
                <span className="small muted">{r.kind === 'client' ? ' · client view' : r.kind === 'examiner' ? ' · read only, items under examination' : r.clearance ? '' : ' · no sensitive-data clearance'}{r.activeFrom && r.activeFrom > state.storyAt ? ` · joins ${fmtDay(r.activeFrom)}` : ''}</span>
              </Link>
            ))}
          </div>
        </div>
        <p className="small muted">Every action is saved as an event in this workspace<Term k="workspace" /> (/w/{ws}); open the root link again for a clean copy. Anything not in the packet is tagged <span className="ex">Example</span><Term k="example-tag" />.</p>
      </StartHere>

      {tab === 'forms' && (state.frozen
        ? <AfterFiling ws={ws} ix={ix} state={state} me={me} findings={visibleFindings} mask={mask} />
        : state.blockers.length > 0 && (
          <section aria-label="Blocking approval" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="lbl" style={{ paddingBottom: 8 }}>Blocking approval · <span className="num">{state.blockers.length}</span></h2>
            {state.blockers.map((b) => (
              <Link key={b.claimId + b.title} className="qrow" href={blockerHref(b.claimId)}>
                <span className="tag t-blk">Blocking</span><span className="grow"><span>{mask(b.title)}</span></span>
              </Link>
            ))}
          </section>
        ))}

    </>
  );
}
