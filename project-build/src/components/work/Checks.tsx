// Checks inbox: one row per item (a return line or a document) with every signal on it: our rule findings (blockers
// first), the AI's suggestions (named by their source), and whether every value behind it was read confidently. Beside it, the engine's
// diagnostics. Filter by severity, bulk sign-off with one undo.
import type { Finding, Severity } from '@/domain/contracts';
import { refText, resolveRef } from '@/domain/refs';
import s from './work.module.css';
import {
  SEVERITY_ORDER, SEVERITY_WORD, claimHref, findingStatus, fmt, isRetracted, levelOf, masker, one, queryHref, refClaim,
  signed, visibleFinding, when, writeBlock, type WorkProps,
} from './lib';
import { AiMark, Est, NoAccess, Page, Tag } from './ui';
import { aiSourceLabel, confidenceWord, groupAiRows, isAi, suggestionStatus } from '@/domain/ai/merge';
import { lineLabel, personName } from './lib';
import { AI_FOUND, aiSuggestionTerm, aiUseText } from '../info/aiUse';
import { signatures } from '@/components/client/signing';
import { openAtFiling } from '@/components/overview/blockers';
import { confidentRange } from '@/components/drawer/lib';
import { checkItems, engineOn, type Item } from '@/domain/items';
import { Term } from '../term/Term';
import Link from 'next/link';
import { EventButton, GroupSelect, RevealDrawerOnPhone, RowSelect, SignoffNote, SignoffScope, TextAction } from './actions';

export function claimValue(p: WorkProps, claimId: string): unknown {
  const c = p.state.claims[claimId];
  if (c) return c.current;
  if (claimId.startsWith('line:')) return p.ix.line(p.ix.latest.version, claimId.slice(5))?.value ?? null;
  return null;
}

/** A 'doc:X' or 'doc:X#pageN' ref that adds nothing because a cited reading sits on that document (and page). */
function docCovered(p: WorkProps, r: string, refs: string[]): boolean {
  const m = /^doc:([^#]+)(?:#page(\d+))?$/.exec(r);
  if (!m) return false;
  return refs.some((x) => {
    const v = p.ix.valueById.get(x);
    return !!v && v.document_id === m[1] && (m[2] === undefined || Number(m[2]) === v.page);
  });
}

export function Evidence({ p, refs }: { p: WorkProps; refs: string[] }) {
  const m = masker(p.state, p.role);
  if (!refs.length) return null;
  const current = one(p.sp.claim);
  // Readable labels, one per reference, separated; the raw reference stays in the tooltip. A link opens on the right
  // without reloading the page (the row stays open, the list keeps its place); the one open now is marked.
  return (
    <span className={s.row} style={{ gap: 6 }}>
      <span className={s.lbl}>Evidence</span>
      {/* A document or page link is dropped when a reading on that document (and page) is already cited; readings stay. */}
      {refs.filter((r) => !docCovered(p, r, refs)).map((r, i, kept) => {
        const c = refClaim(p.ix, r);
        const label = m(refText(resolveRef(p.ix, r, p.ix.latest.version)));
        const sep = i < kept.length - 1 ? <span aria-hidden="true" className={s.note}> ·</span> : null;
        return c
          ? <span key={r}><Link scroll={false} prefetch={false} className={`${s.link} ${s.evLink} ${c === current ? s.evOn : ''}`} href={claimHref(p.sp, c)} title={m(r)} data-ref={r}
              aria-current={c === current ? 'true' : undefined}>{label}{c === current ? <span className={s.evHint} aria-hidden="true"> · open</span> : null}</Link>{sep}</span>
          : <span key={r} title={m(r)} data-ref={r}>{label}{sep}</span>;
      })}
    </span>
  );
}

function effectText(f: Finding): string {
  if (!f.effect) return '';
  const parts: string[] = [];
  if (typeof f.effect.federal === 'number' && f.effect.federal) parts.push(`Fed ${signed(f.effect.federal)}`);
  if (typeof f.effect.california === 'number' && f.effect.california) parts.push(`CA ${signed(f.effect.california)}`);
  return parts.join(' · ');
}

export function ChecksScreen(p: WorkProps) {
  const { role, state, ix, ws } = p;
  if (!role.screens.includes('checks')) return <NoAccess role={role} screen="checks" />;
  const m = masker(state, role);
  const sev = one(p.sp.sev) as Severity | 'ai' | undefined;
  const checks = p.findings.filter((f) => !isAi(f));
  const visible = checks.filter((f) => visibleFinding(f, state.storyAt));
  const later = checks.length - visible.length;
  // AI suggestions: a separate group after our checks; dismissed ones leave the inbox (they stay in the record).
  const ai = p.findings.filter((f) => isAi(f) && visibleFinding(f, state.storyAt))
    .map((f) => ({ f, st: suggestionStatus(state.events, f.id) })).filter((x) => x.st.status !== 'dismissed');
  const aiOn = !!p.ai?.present && role.kind === 'staff';
  const aiSource = aiSourceLabel(p.ai?.meta?.promptVersion);
  const held = aiOn ? p.ai!.held : [];
  // One row per item: our findings and the AI's suggestions on the same line or document share a row (src/domain/items.ts).
  const items = checkItems(visible, aiOn ? ai : []);
  const engine = engineOn(ix, items); // the engine's own warnings that name an item, by reference only
  const shownItems = items.filter((it) => !sev || (sev === 'ai' ? it.ai.length > 0 : it.severity === sev));
  const shown = shownItems.flatMap((it) => it.checks);
  const counts = Object.fromEntries(SEVERITY_ORDER.map((k) => [k, items.filter((it) => it.severity === k).length]));
  const aiItems = items.filter((it) => it.ai.length > 0).length;
  const open = visible.filter((f) => !findingStatus(f, state).cleared);
  const openItems = items.filter((it) => it.checks.some((f) => !findingStatus(f, state).cleared) || it.ai.some((x) => x.st.status === 'needs_review')).length;
  // Lines an adjustment reaches through a computation only the engine can redo block approval too (src/domain/flow.ts):
  // listed here as blocker rows so this count agrees with the overview and Review.
  const engineBlockers = state.blockers.filter((b) => /^Needs engine re-run: /.test(b.title));
  const openBlockers = open.filter((f) => f.severity === 'blocker').length + engineBlockers.length; // same cleared rule as the rows
  // Approved by the firm's record or filed: the blockers no longer stop anything; they were open at filing.
  const closed = state.frozen || signatures(ix, state).byRecord;
  const block = writeBlock(role, state);
  const level = levelOf(ix, role);
  const diags = ix.latest.diagnostics;

  // Last bulk sign-off by this role that is still in force: one undo reverses the whole group.
  const bulk = [...state.events].reverse().find((e) => e.type === 'signoff' && e.role === role.key && e.groupId?.startsWith('bulk-') && !isRetracted(state.events, e.seq));
  const bulkGroup = bulk ? state.events.filter((e) => e.groupId === bulk.groupId && e.type === 'signoff' && !isRetracted(state.events, e.seq)) : [];

  // Rows this role can still sign: open (not cleared or adjusted), not yet signed, and the role signs off at all.
  const canSign = !!level && !block;
  const signable = canSign ? shown.filter((f) => !findingStatus(f, state).cleared && !findingStatus(f, state).signed).map((f) => 'finding:' + f.id) : [];
  const blockerIds = shown.filter((f) => f.severity === 'blocker').map((f) => 'finding:' + f.id);
  const current = one(p.sp.claim);
  const holdsCurrent = (f: Finding) => !!current && (current === 'finding:' + f.id || f.claims.includes(current) || f.evidence.some((r) => refClaim(ix, r) === current));
  const signableIn = (it: Item<AiItem>) => it.checks.map((f) => 'finding:' + f.id).filter((id) => signable.includes(id));
  const aiTitleOf = (f: Finding) => aiRowTitle(p, f);

  let lastGroup: Severity | 'ai' | null = null;
  return (
    <Page label="Checks" h1="Checks inbox"
      tags={<>
        <Tag tone="neu">As of {when(state.storyAt)}</Tag>{' '}
        {closed ? <Tag tone="neu">{openAtFiling(openBlockers)}</Tag> : <Tag tone="blk">{openBlockers} blockers</Tag>}{' '}
        <Tag tone="wrn">{openItems} items open</Tag>{' '}
        {later ? <Tag tone="neu" title="Findings that depend on a document or message later in the story">{later} later in the story</Tag> : null}
      </>}
      >

      <div role="group" aria-label="Filter by severity" className={s.row}>
        <a className={`${s.chip} ${!sev ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', null)} aria-current={!sev ? 'true' : undefined}>All <span className={s.num}>{items.length}</span></a>
        {SEVERITY_ORDER.map((k) => (
          <a key={k} className={`${s.chip} ${sev === k ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', k)} aria-current={sev === k ? 'true' : undefined}>
            {SEVERITY_WORD[k]} <span className={s.num}>{counts[k]}</span>
          </a>
        ))}
        {aiOn ? (
          <a className={`${s.chip} ${sev === 'ai' ? s.chipOn : ''}`} href={queryHref(p.sp, 'sev', 'ai')} aria-current={sev === 'ai' ? 'true' : undefined}>
            <AiMark label="" />AI <span className={s.num}>{aiItems}</span>
          </a>
        ) : null}
      </div>


      <div className={s.cols}>
        <div className={s.section} style={{ gap: 16 }}>
        <section className={s.section} aria-labelledby="chk-ours">
          <RevealDrawerOnPhone claim={current ?? null} />
          <h2 className={s.h2} id="chk-ours" tabIndex={-1}>Items <span className={s.note}>({shownItems.length})</span><Term k="blocker" /></h2>
          <p className={`${s.note} ${s.row}`} style={{ margin: 0, gap: 6 }} data-testid="pill-key">
            <span className={s.row} style={{ gap: 6 }}><Tag tone="blk">Blocker</Tag><Tag tone="wrn">Check</Tag><Tag tone="acc">Judgment</Tag><Tag tone="neu">Info</Tag><span>our rule checks;</span></span>
            <span className={s.row} style={{ gap: 6 }}><Tag tone="neu"><AiMark label="" />AI</Tag><span>the {aiSource} flagged this item, a person decides;</span></span>
            <span className={s.row} style={{ gap: 6 }}><Tag tone="wrn">Engine warning</Tag><span>the engine&apos;s own note names this item;</span></span>
            <span style={{ flexBasis: '100%', lineHeight: 1.7 }}><Tag tone="neu">Confident mistake</Tag> <span>flagged by our checks, though every value behind it was read at 0.95 or above. The checks were built from the mistakes our external investigation found.</span></span>
          </p>
          <SignoffScope ws={ws} role={role.key} level={level ?? 'preparer'} items={signable} blockers={blockerIds}>
          <div className={s.box}>
            <div className={`${s.chkRow} ${s.chkSel} ${s.chkHead}`}><span>{canSign ? <Term k="sign-off" /> : null}</span><span>Status</span><span>What</span><span className={s.right}>Amount</span><span className={s.hideSm}>Tax effect</span></div>
            {(!sev || sev === 'blocker') && engineBlockers.map((b) => (
              <div key={b.claimId} className={`${s.chkRow} ${s.chkSel}${current === b.claimId ? ` ${s.rowOn}` : ''}`} data-engine-blocker={b.claimId} aria-current={current === b.claimId ? 'true' : undefined}>
                <span />
                <span><Tag tone={closed ? 'neu' : 'blk'}>{closed ? 'Open' : 'Blocker'}</Tag></span>
                <span><Link scroll={false} prefetch={false} className={s.title} href={claimHref(p.sp, b.claimId)}>{m(b.title)}</Link>
                  <span className={s.mono} style={{ display: 'block' }}>{b.claimId.replace(/^line:/, '')}</span></span>
                <span className={s.right}><Link scroll={false} prefetch={false} className={s.amt} href={claimHref(p.sp, b.claimId)}>{m(claimValue(p, b.claimId))}</Link></span>
                <span className={`${s.note} ${s.hideSm}`}>Clears when the engine re-runs</span>
              </div>
            ))}
            {shownItems.length === 0 && !engineBlockers.length ? <div className={s.boxRow}><span className={s.note}>No items at this story time for this filter.</span></div> : null}
            {shownItems.map((it) => {
              const grp = it.severity ?? 'ai';
              const showGrp = grp !== lastGroup;
              lastGroup = grp;
              const lead = it.checks[0];
              // The row's pill speaks for what is still open on it: the first finding not cleared or signed, else the lead.
              const live = it.checks.find((f) => { const x = findingStatus(f, state); return !x.cleared && !x.signed; }) ?? lead;
              const st = live ? findingStatus(live, state) : null;
              const on = [...it.checks.map((f) => f.id), ...it.ai.map((x) => x.f.id)].some((id) => current === 'finding:' + id);
              const holds = !on && !!current && (current === it.key || it.checks.some(holdsCurrent) || it.ai.some((x) => holdsCurrent(x.f)));
              const sure = it.checks.length ? confidentRange(it.checks.flatMap((f) => f.evidence).map((r) => resolveRef(ix, r, ix.latest.version))) : null;
              const aiOpen = it.ai.some((x) => x.st.status === 'needs_review');
              const amountClaim = it.key.startsWith('finding:') ? null : it.key;
              const grpIds = shownItems.filter((x) => (x.severity ?? 'ai') === grp).flatMap(signableIn);
              return (
                <div key={it.key}>
                  {showGrp ? <div className={s.grp}><GroupSelect word={grp === 'ai' ? 'AI only' : SEVERITY_WORD[grp]} ids={grpIds}><span className={s.lbl}>{grp === 'ai' ? 'Flagged by the AI only' : SEVERITY_WORD[grp]}</span>{grp === 'judgment' ? <Term k="judgment" /> : grp === 'ai' ? <Term k="ai-suggestion" text={aiSuggestionTerm(aiSource)} /> : null}</GroupSelect></div> : null}
                  <div className={`${s.chkRow} ${s.chkSel}${on ? ` ${s.rowOn}` : ''}`} data-item={it.key} data-severity={it.severity ?? 'ai'} aria-current={on ? 'true' : undefined} data-holds={holds ? '' : undefined}>
                    <RowSelect ids={signableIn(it)} title={m(lead ? it.checks.map((f) => f.title).join('; ') : aiTitleOf(it.ai[0].f))} />
                    <span className={s.tags}>
                      {st ? <Tag tone={st.tone}>{st.word}</Tag> : <Tag tone={aiOpen ? 'wrn' : 'pas'}>{aiOpen ? 'Needs review' : 'Accepted'}</Tag>}
                      {it.ai.length ? <Tag tone="neu" title={`The ${aiSource} flagged this item; a person accepts or dismisses each suggestion`}><AiMark label="" />AI</Tag> : null}
                      {engine.has(it.key) ? <span className={s.hideSm}><Tag tone="wrn" title="The engine's own diagnostic names this item; shown as it wrote it, not one of our checks">Engine warning</Tag></span> : null}
                      {sure ? <span className={s.hideSm}><Tag tone="neu" title="Flagged by our checks, though every value behind it was read at 0.95 or above; confidence gave no warning">Confident mistake</Tag></span> : null}
                    </span>
                    <details className={s.peek} open={on || holds || undefined}>
                      <summary>
                        {it.checks.length
                          ? it.checks.map((f, i) => <span key={f.id} className={s.title} style={{ display: 'block', marginTop: i ? 6 : 0 }}>{m(f.title)}</span>)
                          : <span className={s.title} style={{ display: 'block' }}><AiMark />{aiTitleOf(it.ai[0].f)}</span>}
                        <span className={s.mono} style={{ display: 'block' }}>{it.key.startsWith('finding:') ? '' : it.key.replace(/^line:|^doc:/, '')}{it.checks.length && it.ai.length ? <span className={s.note}> · {it.ai.length} AI suggestion{it.ai.length === 1 ? '' : 's'}</span> : null}</span>
                      </summary>
                      <div className={s.peekBody}>
                        {it.checks.map((f) => <CheckEntry key={f.id} p={p} f={f} titled={it.checks.length > 1} level={level} block={block} />)}
                        {groupAiRows(it.ai, (f) => aiTitleOf(f)).map((row) => <AiEntry key={row.items[0].f.id} p={p} row={row} titled={it.checks.length > 0} />)}
                        {(engine.get(it.key) ?? []).map((d) => (
                          <div key={d.code} className={s.row} style={{ gap: 6 }} data-engine-note={d.code}>
                            <span className={s.note}>The engine&apos;s own note on this item</span>
                            <Tag tone={d.severity === 'error' ? 'blk' : d.severity === 'warning' ? 'wrn' : 'neu'}>{d.severity}</Tag>
                            <span className={s.mono}>{d.code}</span>
                            <span style={{ fontSize: 13, flex: '1 1 100%' }}>{m(d.message)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                    <span className={s.right}>{amountClaim ? <Link scroll={false} prefetch={false} className={s.amt} href={claimHref(p.sp, amountClaim)} aria-label={`Where ${fmt(claimValue(p, amountClaim))} came from`}>{m(claimValue(p, amountClaim))}</Link> : null}</span>
                    <span className={`${s.num} ${s.hideSm}`} style={{ color: 'var(--ink2)', fontSize: 12.5 }}>{lead ? <>{effectText(lead)} {lead.effect ? <Est /> : null}</> : it.ai[0].f.ai ? `${confidenceWord(it.ai[0].f.ai.confidence)} confidence` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </SignoffScope>
          {bulkGroup.length ? (
            <div className={s.toast} role="status">
              <span>{bulkGroup.length} sign-offs saved together at {when(bulk!.at)}.</span>
              <EventButton ws={ws} role={role.key} small label="Undo"
                events={[{ type: 'undo', groupId: bulk!.groupId, payload: { reason: 'Bulk sign-off undone' } }]} />
            </div>
          ) : null}
          {!canSign ? <p className={s.note} style={{ margin: 0 }}>{block ?? `${role.title} does not sign off work.`}</p> : null}
          {aiOn ? <AiFoot p={p} held={held} count={ai.length} items={aiItems} /> : null}
        </section>
        </div>

        <section className={s.section} aria-labelledby="chk-engine">
          <h2 className={s.h2} id="chk-engine">From the engine <span className={s.note}>({diags.length}, {ix.latest.version})</span><Term k="engine-diagnostics" /></h2>
          <p className={s.note} style={{ margin: 0 }}>The engine’s own diagnostics, shown as it reported them. They are not our checks and are not counted as findings.</p>
          <div className={s.box}>
            {diags.length === 0 ? <div className={s.boxRow}><span className={s.note}>The engine reported nothing.</span></div> : null}
            {diags.map((d, i) => {
              // Which of our items this warning names (engineOn, the same join as the row pills), or none.
              const by = items.filter((it) => (engine.get(it.key) ?? []).includes(d));
              return (
              <div key={d.code + i} className={s.boxRow} data-diag={d.code}>
                <Tag tone={d.severity === 'error' ? 'blk' : d.severity === 'warning' ? 'wrn' : 'neu'}>{d.severity}</Tag>
                <span className={s.body} style={{ flex: '1 1 220px' }}>
                  <span className={s.mono}>{d.code}</span>
                  <span style={{ fontSize: 13 }}>{m(d.message)}</span>
                  <Evidence p={p} refs={d.refs} />
                  {by.length
                    ? <span className={s.note}>{by.some((it) => it.checks.length) ? 'Covered by our check' : 'Named by an AI suggestion (not one of our checks)'}: {by.map((it, j) => <span key={it.key}>{j ? '; ' : ''}<Link scroll={false} prefetch={false} className={s.link} href={claimHref(p.sp, it.key)}>{m(it.checks[0]?.title ?? (it.ai[0] ? aiTitleOf(it.ai[0].f) : it.key))}</Link></span>)}</span>
                    : <span><Tag tone="neu">Not covered by our checks</Tag></span>}
                </span>
              </div>
              );
            })}
          </div>
        </section>
      </div>
    </Page>
  );
}

type AiItem = { f: Finding; st: ReturnType<typeof suggestionStatus> };

/** How an AI suggestion is named in the list: the line and amount it concerns, then what it says. */
function aiRowTitle(p: WorkProps, f: Finding): string {
  const m = masker(p.state, p.role);
  const c0 = f.claims[0];
  if (!c0?.startsWith('line:')) return m(f.title);
  const kind = /^[A-Z][a-z]/.test(f.title) ? f.title.charAt(0).toLowerCase() + f.title.slice(1) : f.title;
  return m(`${lineLabel(p.ix, c0.slice(5))}, ${fmt(claimValue(p, c0))}: ${kind}`);
}

/** One of our rule findings inside its item: what it found, the evidence, and the actions on it. */
function CheckEntry({ p, f, titled, level, block }: { p: WorkProps; f: Finding; titled: boolean; level: string | null; block: string | null }) {
  const m = masker(p.state, p.role);
  const st = findingStatus(f, p.state);
  return (
    <div className={s.body} style={{ gap: 8 }} data-finding={f.id} data-severity={f.severity}>
      {titled ? <span className={s.row} style={{ gap: 6 }}><Tag tone={st.tone}>{st.word}</Tag><strong className={s.title}>{m(f.title)}</strong></span> : null}
      <p style={{ margin: 0, maxWidth: '78ch' }}>{m(f.explanation)}</p>
      <Evidence p={p} refs={f.evidence} />
      <span className={s.note}>Our check {f.checkId} · {f.family}</span>
      <div className={s.row}>
        <Link scroll={false} prefetch={false} className={`${s.btn} ${s.small}`} href={claimHref(p.sp, 'finding:' + f.id)}>Open the finding</Link>
      </div>
      <SignoffNote id={'finding:' + f.id} level={level ?? 'preparer'} />
      {!st.cleared ? (
        <TextAction ws={p.ws} role={p.role.key} label="Clear with a reason" placeholder="Why this needs no change"
          disabledReason={block} build={{ type: 'finding_cleared', claimId: 'finding:' + f.id, payload: {}, field: 'reason' }} />
      ) : null}
    </div>
  );
}

/** An AI suggestion inside its item (the same suggestion repeated on the item is one entry with a count). */
function AiEntry({ p, row, titled }: { p: WorkProps; row: { title: string; items: AiItem[] }; titled: boolean }) {
  const m = masker(p.state, p.role);
  const { f, st } = row.items[0];
  const by = st.by ? personName(p.ix, st.by).split(' ')[0] : '';
  const more = row.items.slice(1);
  return (
    <div className={s.body} style={{ gap: 8 }} data-finding={f.id} data-ai="">
      <span className={s.row} style={{ gap: 6 }}>{st.status === 'accepted' ? <Tag tone="pas">Accepted</Tag> : <Tag tone="wrn">Needs review</Tag>}
        {titled ? <strong className={s.title}><AiMark />{row.title}</strong> : <span className={s.note}><AiMark label="Suggested by AI" />AI suggestion</span>}
        {more.length ? <Tag tone="neu">{row.items.length} suggestions</Tag> : null}</span>
      <p style={{ margin: 0, maxWidth: '78ch' }}>{m(f.explanation)}</p>
      <Evidence p={p} refs={f.evidence} />
      {st.status === 'accepted' ? <span className={s.note}>Suggested by AI, accepted by {by}</span> : null}
      <div className={s.row}>
        <Link scroll={false} prefetch={false} className={`${s.btn} ${s.small}`} href={claimHref(p.sp, 'finding:' + f.id)}>{st.status === 'accepted' ? 'Open the suggestion' : 'Review the suggestion'}</Link>
      </div>
      {more.length ? (
        <div className={s.body}>
          <span className={s.lbl}>The same suggestion, {more.length} more</span>
          {more.map((x) => (
            <span key={x.f.id} data-finding-also={x.f.id} className={s.row} style={{ gap: 8 }}>
              <span className={s.note} style={{ maxWidth: '60ch' }}>{m(x.f.explanation)}</span>
              <Link scroll={false} prefetch={false} className={s.link} href={claimHref(p.sp, 'finding:' + x.f.id)}>{st.status === 'accepted' ? 'Open it' : 'Review it'}</Link>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Under the list: how the AI that made the suggestions works, and any suggestion held back by verification. */
function AiFoot({ p, held, count, items }: { p: WorkProps; held: { id: string | null; reasons: string[] }[]; count: number; items: number }) {
  const m = masker(p.state, p.role);
  return (
    <div className={s.body} data-testid="ai-suggestions">
      <p className={s.note} style={{ margin: 0 }} data-testid="ai-count"><AiMark label="" />{count} AI suggestion{count === 1 ? '' : 's'} on {items} item{items === 1 ? '' : 's'}{count > items ? ' (some items carry more than one)' : ''}; open a row to see each one.</p>
      <p className={s.note} style={{ margin: 0, maxWidth: '90ch' }}>{aiUseText(aiSourceLabel(p.ai?.meta?.promptVersion))} {AI_FOUND}</p>
      {held.length ? (
        <details className={s.note} data-testid="ai-held">
          <summary>{held.length} AI suggestion{held.length === 1 ? '' : 's'} held back: failed verification</summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {held.map((h, i) => <li key={(h.id ?? '') + i}><span className={s.mono}>{m(h.id ?? 'no id')}</span> {m(h.reasons.join(' '))}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
