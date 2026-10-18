import Link from 'next/link';
import type { ReactNode } from 'react';
import type { RoleInfo, RoleKey, ScreenKey, WorkspaceState, WorkEvent } from '@/domain/contracts';
import { getWorkspace } from './load';
import { maskText } from '@/domain/policy';
import { stageAt, visibleAt } from '@/domain/clock';
import { humanize } from '@/domain/labels';
import { RoleSwitcher } from './RoleSwitcher';
import { ResetButton } from './ResetButton';
import { ClientSwitcher } from './ClientSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Bell } from './Bell';
import { claimLabel, notificationsFor } from '@/domain/notify';
import { LiveRefresh } from './LiveRefresh';
import { ScrollHint } from './ScrollHint';
import { claimHref, fmtDay, fmtStory, fmtValue, notYetText, screenHint, screenLabel, screenPath, searchPacket } from './lib';
import { NoAccess } from '../work/ui';
import { Term } from '../term/Term';
import { ClaimDrawer } from '../drawer/ClaimDrawer';
import { ClockControl, ReturnToLatest } from './StoryClock';
import { Info } from '../info/Info';

export interface ShellProps {
  ws: string; role: RoleKey; screen: ScreenKey; state?: WorkspaceState; roleInfo?: RoleInfo;
  /** the ?claim= value; the drawer opens on it */
  claim?: string;
  /** the ?q= value of the header search */
  q?: string;
  children: ReactNode;
}

export function roleLabel(r: RoleInfo): string {
  if (r.kind === 'client') return `${r.name}, ${r.title.toLowerCase()}`;
  if (r.kind === 'examiner' || !r.staffId) return r.name;
  if (r.key === 'next') return `${r.name} (${r.title.toLowerCase()})`;
  return `${r.name}, ${r.title.split(',')[0].toLowerCase()}`;
}

function rule(rules: unknown, re: RegExp): string | null {
  return Array.isArray(rules) ? ((rules as string[]).find((t) => re.test(t)) ?? null) : null;
}

function bannerText(r: RoleInfo, rules: unknown, frozen: boolean): string {
  const partner = rule(rules, /partner sign-off/i);
  const locked = 'As filed, locked. You can read the filed record and its full history; anything new attaches as a later event.';
  if (r.kind === 'client') return 'Here is what we need from you. You can answer questions and send documents; you sign Form 8879 (e-file signature authorization) once your tax team has finished.';
  if (r.kind === 'examiner') return 'Read only. You see the items under examination, as filed, and only the documents they cite.';
  if (r.key === 'next') return 'The 2025 return is read only. You can read every number, its source and its history.';
  if (r.key === 'sam') return 'Read only. You see the filed record with its full internal history.';
  if (frozen && r.key !== 'jo') return locked;
  switch (r.key) {
    case 'priya': return 'You can adjust values, ask the client, verify, record decisions and sign off as preparer. Sensitive numbers are masked; a reveal is logged.';
    case 'marcus': return 'You can adjust values, ask the client, verify and sign off as preparer. You cannot reveal full SSNs or bank numbers: no sensitive-data clearance.';
    case 'daniel': return 'You can leave review notes, verify, apply proposed adjustments and sign off as reviewer.';
    case 'helen': return `You approve the return once nothing blocks it.${partner ? ` Firm rule: “${partner}”` : ''}`;
    case 'jo': return 'You see who viewed what, time against budget and file status, and you move the story clock from the bar above. Return values are read only for you.';
    default: return '';
  }
}

/** The banner sentence with a help mark after it for the one term it leans on most. */
function banner(r: RoleInfo, rules: unknown, frozen: boolean): ReactNode {
  const text = bannerText(r, rules, frozen);
  const k = r.kind === 'client' ? 'form-8879'
    : frozen && r.key !== 'jo' && r.kind === 'staff' && r.key !== 'next' && r.key !== 'sam' ? null
    : r.key === 'marcus' || r.key === 'priya' ? 'sensitive-data-clearance'
    : r.key === 'daniel' ? 'review-note'
    : r.key === 'helen' ? 'partner-threshold'
    : null;
  return <>{text}{k ? <Term k={k} /> : null}</>;
}

const VERB: Partial<Record<WorkEvent['type'], string>> = {
  adjustment: 'adjusted', review_note: 'left a review note on', note_resolved: 'resolved a note on', signoff: 'signed off',
  question_to_client: 'asked the client about', answer_recorded: 'recorded an answer on', reason_set: 'set a reason on',
  reveal: 'revealed an identifier on', clock_moved: 'moved the story clock', undo: 'undid an action on', assignment: 'assigned',
  attach_note: 'attached a note to', time_logged: 'logged time', verification: 'verified', decision: 'recorded a decision on',
  question_to_colleague: 'asked a colleague about', finding_cleared: 'cleared a finding on',
  suggestion_accepted: 'accepted an AI suggestion on', suggestion_dismissed: 'dismissed an AI suggestion on',
};

const claimTitle = claimLabel;

const OVERVIEW_TABS: ScreenKey[] = ['return', 'areas', 'documents', 'whatifs'];

export async function Shell({ ws, role, screen, claim, q, children, ...given }: ShellProps) {
  const w = await getWorkspace(ws, role);
  const { ix } = w;
  const state = given.state ?? w.state;
  const me = given.roleInfo ?? w.role;
  const isClient = me.kind === 'client';
  const mask = (t: string) => maskText(t, me, false);
  const rules = ix.packet.firm.starter_standards.rules;
  const notYet = notYetText(me.name, me.activeFrom, state.storyAt);
  // The one gate for every screen route: a role opens only the screens in its list; a typed URL gets the refusal.
  const allowed = me.screens.includes(screen);
  const adjusted = Object.values(state.claims).filter((c) => c.adjusted).length;
  const version = isClient
    ? (state.frozen ? 'Your filed return' : 'Draft, being prepared by your tax team')
    : state.frozen ? 'As filed'
    : ix.latest.computed === false ? 'No return computed yet'
    : adjusted ? `${ix.latest.version} plus ${adjusted} adjustment${adjusted === 1 ? '' : 's'} (finalized, not recomputed)`
    : `${ix.latest.version}, none of our changes applied yet`;
  const people = (ix.packet.household.people ?? []).filter((p) => p.role === 'taxpayer' || p.role === 'spouse');
  const client = people.map((p) => String(p.name).split(' ').slice(-1)[0]).join(' and ');
  const taxYear = String(ix.packet.household.tax_year ?? '');
  const clientLabel = `${client || 'Return'}${taxYear ? `, ${taxYear}` : ''}`;
  const results = q ? searchPacket(ix, q) : null;
  const canSee = (k: ScreenKey) => me.screens.includes(k);
  const roleName = (k: RoleKey) => { const r = w.allRoles.find((x) => x.key === k); return r ? r.name.split(' ')[0] : k; };
  const history = [...state.events].reverse().slice(0, 8);
  const bellItems = me.kind === 'examiner' ? null : notificationsFor(ix, state.events, role, state.storyAt).map((x) => ({
    id: x.id, at: x.at, text: x.text, when: fmtStory(x.at),
    href: screenPath(ws, role, isClient || !x.claimId ? 'home' : screen) + (isClient || !x.claimId ? '' : claimHref(x.claimId)),
  }));
  const drawerOpen = !!claim;
  // The clock: every timeline event, grouped by stage, plus the current story time when it is not one of them.
  const clockOptions = [...ix.packet.timeline].map((t) => ({ at: t.at, label: `${fmtStory(t.at)} · ${humanize(t.event)}` }));
  if (!clockOptions.some((o) => o.at === state.storyAt)) clockOptions.push({ at: state.storyAt, label: `${fmtStory(state.storyAt)} · current story time` });
  clockOptions.sort((a, b) => a.at.localeCompare(b.at));
  const clockGroups: { stage: string; options: typeof clockOptions }[] = [];
  for (const o of clockOptions) {
    const stage = stageAt(ix, o.at);
    const g = clockGroups[clockGroups.length - 1];
    if (g && g.stage === stage) g.options.push(o); else clockGroups.push({ stage, options: [o] });
  }
  // Viewing the past is said up front: the story time is before the latest point this workspace has reached.
  const past = !!state.frontierAt && !visibleAt(state.frontierAt, state.storyAt);
  const lastMove = [...state.events].reverse().find((e) => e.type === 'clock_moved');

  return (
    <div className="wp" data-role={role} data-screen={screen}>
      <header className="sh-head">
        <div className="sh-brand"><strong>Taxmark</strong>{me.kind === 'staff'
          ? <ClientSwitcher label={clientLabel} />
          : <span className="muted">{clientLabel}</span>}</div>
        <div className="sh-meta num">
          <span><span className="muted">Version</span>{!isClient && <Term k="version" />} {version}{!isClient && !state.frozen && adjusted ? <Term k="finalized-version" /> : null}</span>
          <span><span className="muted">Stage</span> {state.stage}</span>
          <span className="tag t-pas" title="Every action is saved as an event in this workspace">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>Saved
          </span>
          {state.frozen && <span className="tag t-acc" title="Accepted by the agency; later events attach to the record, nothing in it changes">As filed, locked</span>}
          {state.frozen && !isClient && <Term k="as-filed-locked" />}
        </div>
        {!isClient && me.kind !== 'examiner' && (
          <form role="search" className="sh-search" action={screenPath(ws, role, 'home')} method="get">
            <label style={{ flex: 1 }}><span className="vh">Search lines, documents, amounts and EINs</span>
              <input className="input" type="search" name="q" defaultValue={q ?? ''} placeholder="Search lines, documents, amounts, EINs" />
            </label>
          </form>
        )}
        <div className="sh-tools">
        <RoleSwitcher ws={ws} role={role} screen={screen}
          options={w.allRoles.map((r) => ({ key: r.key, label: roleLabel(r), screens: r.screens }))} />
        {bellItems && <Bell ws={ws} role={role} storyAt={state.storyAt} items={bellItems} />}
        <ThemeToggle />
        </div>
      </header>

      <div className={`sh-story${past ? ' past' : ''}`} role="group" aria-label="Story clock">
        <span className="num" title="The one story clock for this workspace; times are UTC"><strong>Story time</strong><Term k="story-clock" /> {fmtStory(state.storyAt)}</span>
        <ClockControl key={state.storyAt} ws={ws} role={role} groups={clockGroups} current={state.storyAt} />
        {past && (
          <span className="row sh-past" style={{ gap: 8 }}>
            <span>You are viewing {fmtStory(state.storyAt)}, an earlier point in the story. Nothing can be changed here.{lastMove ? <span className="muted"> {lastMove.role === role ? 'You' : roleName(lastMove.role)} moved the clock last.</span> : null}</span>
            <ReturnToLatest ws={ws} role={role} current={state.storyAt} latest={state.frontierAt} />
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}><ResetButton ws={ws} role={role} /></span>
        <Info ix={ix} state={state} role={me} ws={ws} />
      </div>

      <div className="sh-banner" role="note">
        <span><span className="muted">Viewing as</span> <strong>{roleLabel(me)}</strong></span>
        <span style={{ flex: '1 1 360px' }}>{banner(me, rules, state.frozen)}</span>
      </div>

      {results && (
        <section className="sh-results" aria-label="Search results">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="lbl">Results for “{results.q}”</span>
            <Link className="btn" href={screenPath(ws, role, screen)}>Clear search</Link>
          </div>
          {results.identifierRefused && <p className="warnline">Identifier digits are never searchable. Search by name, line, amount or EIN instead.</p>}
          {!results.identifierRefused && results.lines.length + results.documents.length + results.eins.length === 0 && <p className="small muted">Nothing matches. Try a line key such as F1040.1a, a label word, an amount or a document id.</p>}
          <div className="sh-results-grid">
            {results.lines.length > 0 && <div><span className="lbl">Lines · {results.lines.length}</span>
              {results.lines.map((l) => <Link key={l.key} className="sh-hit" href={screenPath(ws, role, canSee('return') ? 'return' : screen) + claimHref('line:' + l.key)}><span style={{ fontWeight: 600 }}>{l.label}</span><span className="small muted num">{l.key} · {fmtValue(l.value)}</span></Link>)}</div>}
            {results.documents.length > 0 && <div><span className="lbl">Documents · {results.documents.length}</span>
              {results.documents.map((d) => <Link key={d.id} className="sh-hit" href={screenPath(ws, role, 'documents') + claimHref('doc:' + d.id)}><span style={{ fontWeight: 600 }}>{d.title}</span><span className="small muted">{d.id}{d.issuer ? ` · ${d.issuer}` : ''}</span></Link>)}</div>}
            {results.eins.length > 0 && <div><span className="lbl">EINs · {results.eins.length}</span>
              {results.eins.map((e) => <Link key={e.valueId} className="sh-hit" href={screenPath(ws, role, 'documents') + claimHref('doc:' + e.docId)}><span className="num" style={{ fontWeight: 600 }}>{e.ein}</span><span className="small muted">{e.label} · {e.docId}</span></Link>)}</div>}
          </div>
        </section>
      )}

      <div className="sh-frame">
        <aside className="sh-pane-l" aria-label="Screens and history">
          <nav aria-label="Screens" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="lbl" style={{ padding: '0 10px 6px' }}>{isClient ? 'Your return' : 'Screens'}</div>
            {/* Staff: Home, Return, Areas and Documents are one entry, the Return overview, whose tabs are those routes. */}
            {me.screens.filter((k) => me.kind !== 'staff' || !OVERVIEW_TABS.includes(k)).map((k) => {
              const overview = me.kind === 'staff' && k === 'home';
              const current = k === screen || (overview && OVERVIEW_TABS.includes(screen));
              return (
                <Link key={k} className="sh-nav" href={screenPath(ws, role, k)} aria-current={current ? 'page' : undefined}>
                  <span className="t">{overview ? 'Return overview' : screenLabel(k, me.kind)}</span>
                  <span className="small muted">{overview ? 'Figures, open items, forms, areas, documents, what-ifs' : screenHint(k, me.kind)}</span>
                </Link>
              );
            })}
          </nav>
          <div>
            <div className="lbl" style={{ padding: '0 10px 6px' }}>{isClient ? 'Your activity' : 'History'}</div>
            <div className="small muted" style={{ padding: '0 10px 4px' }}>Story dates in UTC.</div>
            {history.length === 0 && <div className="small muted" style={{ padding: '6px 10px' }}>Nothing recorded in this workspace yet.</div>}
            {history.map((e) => (
              <div key={e.seq} className="sh-hist">
                <span className="num muted">{fmtDay(e.storyAt)}</span>
                <span><strong>{e.role === role ? 'You' : roleName(e.role)}</strong> {VERB[e.type] ?? e.type} {e.claimId ? <Link href={claimHref(e.claimId)}>{mask(claimTitle(ix, e.claimId))}</Link> : null}{e.type === 'adjustment' && typeof e.payload.reason === 'string' && e.payload.reason.trim() ? <span className="muted">: {mask(e.payload.reason)}</span> : null}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="sh-pane-c" aria-label={me.kind === 'staff' && (screen === 'home' || OVERVIEW_TABS.includes(screen)) ? 'Return overview' : screenLabel(screen, me.kind)}>
          {notYet ? (
            <div className="screen">
              <h1>Not yet in the story</h1>
              <p className="sub">{notYet} Move the story clock in the bar above to see this role&apos;s view.</p>
            </div>
          ) : allowed ? children : <NoAccess role={me} screen={screen} />}
        </main>

        <aside className={`sh-pane-r${drawerOpen ? ' open' : ''}`} aria-label="Source of the selected number">
          {!notYet && allowed && <ClaimDrawer ws={ws} role={role} claimId={claim ?? ''} />}
        </aside>
      </div>
      <ScrollHint />
      <LiveRefresh ws={ws} role={role} storyAt={state.storyAt} lastSeq={state.events.reduce((m, e) => Math.max(m, e.seq), 0)} />
    </div>
  );
}

export default Shell;
