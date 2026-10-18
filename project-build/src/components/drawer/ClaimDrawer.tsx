import Link from 'next/link';
import type { Finding, ResolvedRef, RoleInfo, RoleKey, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { getWorkspace } from '../shell/load';
import { can, maskText, maskValue, partnerThreshold, sensitiveTypeOf, signoffLevel, visibleDocIds } from '@/domain/policy';
import { documentLanding, REASON_LABEL, simulatedPage } from '@/domain/docs';
import { refText, resolveRef } from '@/domain/refs';
import { claimHref, examinedLines, fmtDay, fmtStory, fmtValue, isRevealed, parseClaim } from '../shell/lib';
import { highlightSegments, revealReason } from './lib';
import { refClaim } from '../work/lib';
import { DrawerActions, type ActionSpec } from './DrawerActions';
import { retractedSeqs } from '@/domain/events';
import { Term } from '../term/Term';
import { AiMark } from '../work/ui';
import { AiDecision } from './AiDecision';
import { DocNote } from './DocNote';
import { needsPartnerSignoff } from '@/domain/project';
import { effectEstimate } from '@/domain/versions';
import { confidenceWord, suggestionStatus } from '@/domain/ai/merge';
import { humanize } from '@/domain/labels';

type Ctx = { ix: PacketIndex; me: RoleInfo; state: WorkspaceState; revealed: Set<string>; findings: Finding[]; ws: string; role: RoleKey; allRoles: RoleInfo[] };

const SENSITIVE = /^(ssn|itin|tin|account_number|account|routing|routing_number|bank_account|ip_pin|pin|ero_pin|signature_pin)$/i;
/** The masking type of a value: value_type refined by its field name (an IP PIN is typed 'code'). */
function kindOf(c: Ctx, ref: string, valueType: string): string {
  const v = c.ix.valueById.get(ref);
  return v ? sensitiveTypeOf(v) : valueType;
}
const isIdent = (c: Ctx, ref: string, valueType: string) => SENSITIVE.test(kindOf(c, ref, valueType));

// A document's extraction status in the Documents tab's words.
const EXTRACTION: Record<string, string> = { extracted: 'Extracted', partial: 'Partly extracted', not_extracted: 'Not extracted' };

const SEV: Record<Finding['severity'], [string, string]> = {
  blocker: ['Blocking', 't-blk'], check: ['Check failed', 't-wrn'], judgment: ['Judgment', 't-wrn'], info: ['Note', 't-mut'],
};

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '28px 4px' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--ink2)' }}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7" /><path d="M9 16h5" /></svg>
      <p style={{ fontSize: 15, fontWeight: 600 }}>{text}</p>
      <p className="muted" style={{ maxWidth: '40ch' }}>{sub}</p>
    </div>
  );
}

/** One simulated source page with the cited fields highlighted, and the fields' boxes on a page outline. */
function SourcePage({ c, docId, page, selected }: { c: Ctx; docId: string; page: number; selected: string[] }) {
  const sp = simulatedPage(c.ix, docId, page);
  const identIds = sp.fields.filter((f) => isIdent(c, f.valueId, f.valueType)).map((f) => f.valueId);
  const printed = maskText(sp.printed, c.me, isRevealed(c.state, c.role, identIds));
  const fields = sp.fields.map((f) => {
    const v = c.ix.valueById.get(f.valueId);
    const ident = isIdent(c, f.valueId, f.valueType);
    const text = ident ? maskValue(f.text, kindOf(c, f.valueId, f.valueType), c.me, c.revealed.has(f.valueId)) : maskText(f.text, c.me, false);
    return { valueId: f.valueId, text, value: ident ? null : v?.value ?? null, valueType: f.valueType };
  });
  const segs = highlightSegments(printed, fields, selected);
  const sel = sp.fields.filter((f) => selected.includes(f.valueId));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="source-page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="lbl">Source page</span>
        <Link className="srcref" href={claimHref(`doc:${docId}#page${sp.page}`)}>{docId}, page {sp.page} of {sp.pageCount}</Link>
      </div>
      <div style={{ fontWeight: 600 }}>{sp.title}{sp.issuer ? <span className="muted" style={{ fontWeight: 400 }}> · {sp.issuer}</span> : null}</div>
      <div className="page">{segs.map((s, i) => s.mark ? <mark key={i} className={s.mark === 'other' ? 'other' : undefined} title={sp.fields.find((f) => f.valueId === s.valueId)?.label}>{s.text}</mark> : <span key={i}>{s.text}</span>)}</div>
      {sel.length > 0 && (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="minipage" aria-hidden="true">
            {sp.fields.filter((f) => f.position).map((f) => (
              <span key={f.valueId} className={selected.includes(f.valueId) ? 'sel' : undefined}
                style={{ left: `${f.position!.x0 * 100}%`, top: `${f.position!.y0 * 100}%`, width: `${(f.position!.x1 - f.position!.x0) * 100}%`, height: `${Math.max(0.6, (f.position!.y1 - f.position!.y0) * 100)}%` }} />
            ))}
          </div>
          <div className="small" style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sel.slice(0, 6).map((f) => (
              <span key={f.valueId} title={f.position ? `At ${f.position.x0.toFixed(2)}, ${f.position.y0.toFixed(2)} from the top left (the packet's synthetic box)` : 'No position in the packet'}><span className="muted">Field:</span> <span className="mono">{f.field}</span></span>
            ))}
            {sel.length > 6 && <span className="muted">and {sel.length - 6} more fields on this page</span>}
          </div>
        </div>
      )}
      <span className="small muted">Highlighted: the exact text this number depends on. Simulated from the packet&apos;s printed content.</span>
    </div>
  );
}

function SourceItem({ c, r }: { c: Ctx; r: ResolvedRef }) {
  const ident = !!r.valueType && isIdent(c, r.ref, r.valueType);
  const shown = r.kind === 'value'
    ? (ident ? maskValue(String(r.value ?? ''), kindOf(c, r.ref, r.valueType!), c.me, c.revealed.has(r.ref)) : fmtValue(r.value))
    : ['string', 'number', 'boolean'].includes(typeof r.value) && r.kind !== 'version' ? maskText(fmtValue(r.value), c.me, false) : ''; // objects never print as JSON
  const body = (
    <>
      {/* An extracted value's id (ev-…) is for the record, not the reader: it stays in the tooltip. */}
      <span className="row" style={{ gap: 6 }}>{/^ev-/.test(r.ref) ? null : <span className="mono muted">{r.ref}</span>}{r.sourceKind && <span className="tag t-mut" title="What sort of record this rests on. A label, not a trust score.">{r.sourceKind}</span>}</span>
      <span><strong style={{ fontWeight: 600 }}>{maskText(r.kind === 'value' ? r.label : refText(r), c.me, false)}</strong>{shown ? <span className="num"> · {shown}</span> : null}</span>
      {r.text && r.kind !== 'value' && <span className="small muted">{maskText(r.text, c.me, false).slice(0, 220)}</span>}
    </>
  );
  if (r.docId) return <Link className="srcitem" title={r.ref} href={claimHref(`doc:${r.docId}${r.page ? `#page${r.page}` : ''}`)}>{body}</Link>;
  if (r.kind === 'line') return <Link className="srcitem" href={claimHref('line:' + r.ref.replace(/^line:/, ''))}>{body}</Link>;
  return <div className="srcitem" title={r.ref}>{body}</div>;
}

/** How surely the pipeline read the cited values, once per panel: one number, or the range when they differ. */
function ReadConfidence({ refs }: { refs: ResolvedRef[] }) {
  const n = refs.map((r) => r.confidence).filter((x): x is number => typeof x === 'number');
  if (!n.length) return null;
  const lo = Math.min(...n).toFixed(2), hi = Math.max(...n).toFixed(2);
  return <span className="small muted num">Pipeline read {lo === hi ? lo : `${lo} to ${hi}`}<Term k="read-confidence" />: how surely the text was read, not how far to trust the source.</span>;
}

/** Staff a question can go to: other staff seats that are in the story and can act. */
function colleaguesOf(c: Ctx): { key: RoleKey; name: string }[] {
  return c.allRoles.filter((r) => r.kind === 'staff' && r.key !== c.role && r.key !== 'next' && (!r.activeFrom || r.activeFrom <= c.state.storyAt))
    .map((r) => ({ key: r.key, name: r.name }));
}

function actionsFor(c: Ctx, claimId: string, current: unknown): ActionSpec[] {
  const { ix, me, state } = c;
  if (me.kind !== 'staff') return [];
  const level = signoffLevel(ix, me.key) ?? 'preparer';
  // Buttons mirror the server's policy: ask can() with a well-formed sample payload, so only role and state rules disable them.
  const methods = (ix.packet.firm.starter_standards.verification_types as string[]) ?? [];
  const client = c.allRoles.find((r) => r.kind === 'client')?.key;
  const colleague = colleaguesOf(c)[0]?.key;
  const sample: Record<ActionSpec['kind'], Record<string, unknown>> = {
    adjustment: { value: typeof current === 'number' || typeof current === 'string' ? current : 0, reason: 'x' },
    verification: { method: methods[0] }, signoff: { note: 'x' }, review_note: { text: 'x' },
    question_to_client: { to: client, text: 'x' }, decision: { kind: 'judgment', authority: 'x' },
    question_to_colleague: { to: colleague, text: 'x' },
  };
  const test = (action: ActionSpec['kind']) => can(ix, me, action, { claimId, payload: sample[action] }, state);
  const kinds: [ActionSpec['kind'], string][] = [
    ['adjustment', 'Adjust'], ['verification', 'Verify'], ['signoff', `Sign off as ${level}`], ['review_note', 'Leave a review note'],
    ['question_to_client', 'Ask the client'], ['decision', 'Record a decision'], ['question_to_colleague', 'Ask a colleague'],
  ];
  // Only a line has a value to change; a document or a finding is adjusted through its line.
  return kinds.filter(([kind]) => kind !== 'adjustment' || claimId.startsWith('line:'))
    .map(([kind, label]) => { const r = test(kind); return { kind, label, ok: r.ok, reason: r.reason, level, current }; });
}

function Trail({ c, claimId }: { c: Ctx; claimId: string }) {
  const cs = c.state.claims[claimId];
  const isClient = c.me.kind === 'client';
  if (!cs) return (
    <div className="drw-sec"><span className="lbl">Who checked it</span><span className="small muted">No one has verified or signed off this yet in this workspace.</span></div>
  );
  const name = (k: RoleKey) => c.allRoles.find((r) => r.key === k)?.name ?? k;
  return (
    <>
      <div className="drw-sec">
        <span className="lbl">Sign-offs<Term k="sign-off" /></span>
        {cs.signoffs.length === 0 && <span className="small muted">None yet.</span>}
        {cs.signoffs.map((s) => (
          <div key={s.seq} className="row small"><span className={`tag ${s.stale ? 't-wrn' : 't-pas'}`}>{s.stale ? 'Stale' : 'Signed'}</span><span>{s.level} sign-off by {name(s.role)} on {fmtValue(s.value)}, {fmtDay(s.at)}{s.stale ? '; the value changed since' : ''}{s.note ? `: ${maskText(s.note, c.me, false)}` : ''}</span></div>
        ))}
      </div>
      {!isClient && cs.openNotes.length > 0 && (
        <div className="drw-sec">
          <span className="lbl">Open review notes<Term k="review-note" /> · {cs.openNotes.length}</span>
          {cs.openNotes.map((n) => <div key={n.seq} className="row small"><span className={`tag ${n.payload.blocking ? 't-blk' : 't-acc'}`}>{n.payload.blocking ? 'Blocking' : 'Open'}</span><span>{maskText(String(n.payload.text ?? ''), c.me, false)}</span></div>)}
        </div>
      )}
      {!isClient && <ClientAnswers c={c} claimId={claimId} />}
      {!isClient && (
        <div className="drw-sec">
          <span className="lbl">History · {cs.history.length}</span>
          {cs.history.length === 0 && <span className="small muted">Nothing recorded yet.</span>}
          {[...cs.history].reverse().map((e) => (
            <div key={e.seq} className="row small"><span className="mono muted num">{fmtDay(e.storyAt)}</span><span><strong>{name(e.role)}</strong> {e.type.replace(/_/g, ' ')}{e.payload.value !== undefined ? ` to ${fmtValue(e.payload.value)}` : ''}{e.payload.reason ?? e.payload.note ? `: ${maskText(String(e.payload.reason ?? e.payload.note), c.me, false)}` : ''}{e.payload.method ? ` (${String(e.payload.method).replace(/_/g, ' ')})` : ''}</span></div>
          ))}
        </div>
      )}
    </>
  );
}

/** Questions to the client on this item and their answers: the answer is evidence for the item, kept with it. */
function ClientAnswers({ c, claimId }: { c: Ctx; claimId: string }) {
  const hist = c.state.claims[claimId]?.history ?? [];
  const retracted = retractedSeqs(c.state.events);
  const qs = hist.filter((e) => e.type === 'question_to_client' && !retracted.has(e.seq));
  if (!qs.length) return null;
  const name = (k: unknown) => c.allRoles.find((r) => r.key === k)?.name ?? String(k);
  return (
    <div className="drw-sec" data-testid="client-answers">
      <span className="lbl">Questions to the client · {qs.length}</span>
      {qs.map((q) => {
        const answers = hist.filter((e) => e.type === 'answer_recorded' && Number(e.payload.questionSeq) === q.seq && !retracted.has(e.seq));
        return (
          <div key={q.seq} className="srcitem">
            <span className="small"><strong>{name(q.role)}</strong> asked {name(q.payload.to)}, {fmtDay(q.storyAt)}: {maskText(String(q.payload.text ?? ''), c.me, false)}</span>
            {answers.length === 0 && <span className="small muted">No answer yet.</span>}
            {answers.map((a) => <span key={a.seq} className="small"><span className="tag t-pas">Answer, evidence</span> {name(a.role)}, {fmtDay(a.storyAt)}: {maskText(String(a.payload.text ?? ''), c.me, false)}</span>)}
          </div>
        );
      })}
    </div>
  );
}

function FindingsOn({ c, claimId }: { c: Ctx; claimId: string }) {
  // A document is rarely a check's claim; it is its evidence. Staff see the checks that cite it, so a blocker's own
  // evidence never reads "No open checks".
  const isDoc = claimId.startsWith('doc:') && c.me.kind !== 'client';
  const cites = (f: Finding) => isDoc && f.evidence.some((r) => refClaim(c.ix, r) === claimId);
  const list = c.findings.filter((f) => f.source !== 'ai' && (f.claims.includes(claimId) || cites(f)) && (!f.firstVisibleAt || f.firstVisibleAt <= c.state.storyAt));
  if (c.me.kind === 'client') {
    const plain = list.filter((f) => f.plain);
    if (!plain.length) return null;
    return <div className="drw-sec"><span className="lbl">What we need from you</span>{plain.map((f) => <span key={f.id}>{maskText(f.plain!, c.me, false)}</span>)}</div>;
  }
  return (
    <div className="drw-sec">
      <span className="lbl">{isDoc ? 'Checks that cite this document' : 'Our checks on this'} · {list.length}</span>
      {list.length === 0 && <span className="small"><span className="tag t-pas">No open checks</span> <span className="muted">{isDoc ? 'No check cites this document.' : 'No check in the library fails on this claim.'}</span></span>}
      {list.map((f) => (
        <Link key={f.id} href={claimHref('finding:' + f.id)} className="srcitem">
          <span className="row" style={{ gap: 6 }}><span className={`tag ${SEV[f.severity][1]}`}>{SEV[f.severity][0]}</span><strong style={{ fontWeight: 600 }}>{f.title}</strong></span>
          <span className="small">{maskText(f.explanation, c.me, false)}</span>
        </Link>
      ))}
    </div>
  );
}

const outsideView = (c: Ctx) => c.me.kind !== 'staff';

function LineClaim({ c, key_, claimId }: { c: Ctx; key_: string; claimId: string }) {
  const { ix } = c;
  const l = ix.line(ix.latest.version, key_);
  if (!l) return <p className="muted">There is no line {key_} in {ix.latest.version}.</p>;
  if (c.me.kind === 'examiner' && !examinedLines(ix).includes(key_)) return <Empty text="Not part of this record" sub="Only the items under examination and the documents they cite are shared with the examiner." />;
  if (c.me.kind === 'client' && !c.findings.some((f) => f.plain && f.claims.includes(claimId))) return <Empty text="Not shared with this role" sub="Your tax team shares the items they need your help with on Home." />;
  const cs = c.state.claims[claimId];
  const current = cs ? cs.current : l.value;
  const adjusted = !!cs?.adjusted;
  // Flow-through: a derived figure is recomputed exactly from an adjusted line; a needs-engine one keeps the engine value.
  const derived = !adjusted && !!cs?.derived;
  const engineOnly = !adjusted && !!cs?.needsEngine;
  const fromLinks = (cs?.from ?? []).map((k, i) => <span key={k}>{i ? ' and ' : ''}<Link className="srcref" href={claimHref('line:' + k)}>{ix.line(ix.latest.version, k)?.label ?? k}</Link></span>);
  const est = engineOnly ? effectEstimate(c.state, cs?.from ?? []) : null;
  const retracted = retractedSeqs(c.state.events);
  const lastAdj = [...(cs?.history ?? [])].reverse().find((e) => e.type === 'adjustment' && !retracted.has(e.seq));
  const proposed = !outsideView(c) && lastAdj?.payload.status === 'proposed' ? lastAdj : null;
  const ruleText = l.rule ? ix.packet.engine_reference.rules[l.rule] : null;
  const docScope = visibleDocIds(ix, c.role);
  const refs = (l.sources ?? []).map((s) => resolveRef(ix, s, ix.latest.version)).filter((r) => !docScope || !r.docId || docScope.has(r.docId));
  const pages: { docId: string; page: number; ids: string[] }[] = [];
  for (const r of refs) {
    if (!r.docId || (docScope && !docScope.has(r.docId))) continue;
    const pg = r.page ?? 1;
    const hit = pages.find((p) => p.docId === r.docId && p.page === pg);
    if (hit) { if (r.kind === 'value') hit.ids.push(r.ref); } else pages.push({ docId: r.docId, page: pg, ids: r.kind === 'value' ? [r.ref] : [] });
  }
  const diags = ix.latest.diagnostics.filter((d) => d.refs.some((r) => r === key_ || (l.sources ?? []).includes(r)));
  const isClient = c.me.kind === 'client';
  return (
    <>
      {/* Pinned while the evidence below scrolls, so the number being read never leaves view. */}
      <div className="drw-head">
        <div className="row"><span className={`tag ${adjusted || derived ? 't-acc' : engineOnly ? 't-wrn' : 't-mut'}`}>{adjusted ? 'Adjusted' : derived ? 'Recomputed' : engineOnly ? 'Needs engine re-run' : `As computed, ${ix.latest.version}`}</span>{adjusted ? <Term k="adjustment" /> : <Term k="version" />}<span className="mono muted">{l.key} · {l.jurisdiction}</span></div>
        <h2 style={{ fontSize: 19, lineHeight: 1.3, letterSpacing: '-.01em' }}>{l.label}</h2>
        <div className="row"><span className="drw-big num" data-testid="claim-value">{fmtValue(current)}</span>
          {(adjusted || derived) && <span className="small muted num">was <span className="del">{fmtValue(cs!.original)}</span> in {ix.latest.version}</span>}</div>
        {derived && <div className="row small" data-testid="flow-note"><span>Recomputed from the adjustment to {fromLinks}.</span></div>}
        {engineOnly && <div className="row small" data-testid="flow-note"><span>Depends on the adjustment to {fromLinks} through a computation only the engine can redo, so this is still the {ix.latest.version} figure.{est ? <> Estimated effect of the adjustment{(cs?.from ?? []).length === 1 ? '' : 's'} to {fromLinks}: federal {fmtValue(est.federal)}, California {fmtValue(est.california)} (an estimate, not this line&rsquo;s figure).</> : null}</span></div>}
        {proposed && <div className="row small"><span className="tag t-wrn">Proposed</span><span className="num">Proposed {fmtValue(proposed.payload.value)} by {c.allRoles.find((r) => r.key === proposed.role)?.name.split(' ')[0] ?? proposed.role}, awaiting a reviewer (apply it on Review)</span></div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {cs && needsPartnerSignoff(ix, cs) && <span className="row small"><span className="tag t-wrn">Needs partner sign-off (tax effect over {partnerThreshold(ix).toLocaleString('en-US')})</span><Term k="partner-threshold" /></span>}
        {cs?.effect && <span className="small num">Tax effect estimate: federal {fmtValue(cs.effect.federal)}, California {fmtValue(cs.effect.california)} ({cs.effect.basis}, {cs.effect.version}). Not recomputed by the engine.</span>}
        {l.note && !isClient && <p className="small muted" style={{ maxWidth: '60ch' }}>Engine note: {maskText(String(l.note), c.me, false)}</p>}
      </div>
      {!isClient && (
        <div className="drw-sec">
          <span className="lbl">How it was built</span>
          <span><span className="mono">{l.rule ?? 'No rule'}</span>{ruleText ? <span>: {ruleText}</span> : null}</span>
          {l.inputs.length > 0 && <div className="row small" style={{ gap: 6 }}><span className="muted">Inputs:</span>{l.inputs.map((k) => <Link key={k} className="srcref" href={claimHref('line:' + k)}>{k}</Link>)}</div>}
        </div>
      )}
      {pages.slice(0, 3).map((p) => <SourcePage key={p.docId + p.page} c={c} docId={p.docId} page={p.page} selected={p.ids} />)}
      {pages.length > 3 && <span className="small muted">{pages.length - 3} more source pages: open them from the list below.</span>}
      {refs.length > 0 && (
        <div className="drw-sec">
          <span className="lbl">Where it came from · {refs.length} source{refs.length === 1 ? '' : 's'}</span>
          <ReadConfidence refs={refs} />
          {refs.map((r) => <SourceItem key={r.ref} c={c} r={r} />)}
        </div>
      )}
      {refs.length === 0 && l.inputs.length === 0 && <div className="drw-sec"><span className="lbl">Where it came from</span><span className="small muted">The engine cites no source for this line.</span></div>}
      {/* Evidence first: the actions follow where the number came from. */}
      {c.me.kind === 'staff' && <Actions c={c} claimId={claimId} current={current} title={l.label} />}
      <FindingsOn c={c} claimId={claimId} />
      {!isClient && diags.length > 0 && (
        <div className="drw-sec"><span className="lbl">From the engine<Term k="engine-diagnostics" /> · {diags.length}</span>
          {diags.map((d) => <span key={d.code} className="small"><span className="tag t-wrn">Engine {d.severity}</span> <span className="mono">{d.code}</span> {maskText(d.message, c.me, false)}</span>)}
          <span className="small muted">Engine diagnostics are listed beside our checks, under their own label.</span>
        </div>
      )}
      <Trail c={c} claimId={claimId} />
      {c.me.kind !== 'staff' && <Actions c={c} claimId={claimId} current={current} title={l.label} />}
    </>
  );
}

function Actions({ c, claimId, current, identifiers = [], title }: { c: Ctx; claimId: string; current: unknown; identifiers?: { valueId: string; label: string; revealed: boolean }[]; title: string }) {
  const acts = actionsFor(c, claimId, current);
  const reveal = c.me.kind === 'staff' ? can(c.ix, c.me, 'reveal', { claimId, payload: { what: identifiers[0]?.valueId ?? 'x' } }, c.state) : null;
  const rules = c.ix.packet.firm.starter_standards.rules;
  const maskRule = Array.isArray(rules) ? (rules as string[]).find((t) => /clearance/i.test(t)) : undefined;
  const clients = c.allRoles.filter((r) => r.kind === 'client').map((r) => ({ key: r.key, name: r.name }));
  const colleagues = colleaguesOf(c);
  const methods = (c.ix.packet.firm.starter_standards.verification_types as string[]) ?? [];
  const cs = c.state.claims[claimId];
  const retracted = retractedSeqs(c.state.events);
  const lastAssign = (cs?.history ?? []).filter((e) => e.type === 'assignment' && !retracted.has(e.seq)).pop();
  const nameOf = (k: unknown) => c.allRoles.find((r) => r.key === k)?.name ?? null;
  const assignVerdict = c.me.kind === 'staff' ? can(c.ix, c.me, 'assignment', { claimId, payload: { to: c.role } }, c.state) : { ok: false };
  const assign = {
    ok: assignVerdict.ok, reason: assignVerdict.reason, current: lastAssign ? nameOf(lastAssign.payload.to) : null,
    staff: c.allRoles.filter((r) => r.kind === 'staff' && r.key !== 'next').map((r) => ({ key: r.key, name: r.name })),
  };
  if (c.me.kind !== 'staff') {
    return <div className="drw-sec"><span className="small muted">{c.me.kind === 'client' ? 'Questions from your tax team appear on Home.' : 'Read only.'}</span></div>;
  }
  return (
    <DrawerActions ws={c.ws} role={c.role} claimId={claimId} baseVersion={cs?.version ?? 0} actions={acts}
      reveal={identifiers.length && reveal ? { ok: reveal.ok, reason: reveal.ok ? undefined : revealReason(reveal.reason, maskRule), items: identifiers } : null}
      clients={clients} colleagues={colleagues} methods={methods} frozen={c.state.frozen} assign={assign} title={title} />
  );
}

function DocClaim({ c, docId, page, claimId }: { c: Ctx; docId: string; page?: number; claimId: string }) {
  const d = c.ix.docById.get(docId);
  if (!d) return <p className="muted">There is no document {docId} in the packet.</p>;
  const allowed = visibleDocIds(c.ix, c.role);
  if (allowed && !allowed.has(docId)) return <Empty text="Not shared with this role" sub={c.me.kind === 'client' ? 'This document is not one of yours.' : 'Only the documents behind the items under examination are part of this record.'} />;
  const landing = documentLanding(c.ix, c.state.storyAt).find((x) => x.docId === docId);
  if (landing && !landing.visible) return <Empty text="Not yet received" sub={`This document arrives on ${fmtDay(d.received_at)}, after the story time.`} />;
  const pages = page ? d.pages.filter((p) => p.page === page) : d.pages;
  const vals = c.ix.valuesByDoc.get(docId) ?? [];
  const idents = vals.filter((v) => isIdent(c, v.id, v.value_type)).map((v) => ({ valueId: v.id, label: v.label, revealed: c.revealed.has(v.id) }));
  const isClient = c.me.kind === 'client';
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="row">
          {landing && <span className={`tag ${landing.status === 'landed' ? 't-pas' : 't-mut'}`}>{landing.status === 'landed' ? 'Landed on the return' : 'Did not land'}</span>}{landing && !isClient && <Term k="landed" />}
          <span className="mono muted">{d.id} · {d.document_type.replace(/_/g, ' ')}</span>{/^w-?2/i.test(d.document_type) ? <Term k="w-2" /> : /^1099/i.test(d.document_type) ? <Term k="form-1099" /> : /^k-?1/i.test(d.document_type) ? <Term k="k-1" /> : null}
        </div>
        <h2 style={{ fontSize: 19, lineHeight: 1.3 }}>{maskText(d.title, c.me, false)}</h2>
        <span className="small muted">{d.issuer ?? 'No issuer'} · received {fmtStory(d.received_at)} · {d.page_count} page{d.page_count === 1 ? '' : 's'} · {EXTRACTION[d.extraction.status] ?? humanize(d.extraction.status)}</span>
        {landing?.reason && !isClient && <p className="small"><span className="tag t-mut">{REASON_LABEL[landing.reason.code] ?? humanize(landing.reason.code)}</span> {maskText(landing.reason.text, c.me, false)}</p>}
        {landing && landing.landedLines.length > 0 && !isClient && (
          <div className="row small" style={{ gap: 6 }}><span className="muted">Lands on:</span>{landing.landedLines.slice(0, 12).map((k) => <Link key={k} className="srcref" href={claimHref('line:' + k)}>{k}</Link>)}{landing.landedLines.length > 12 && <span className="muted">and {landing.landedLines.length - 12} more</span>}</div>
        )}
      </div>
      {c.me.kind === 'staff' && <Actions c={c} claimId={'doc:' + docId} current={null} identifiers={idents} title={maskText(d.title, c.me, false)} />}
      {pages.map((p) => <SourcePage key={p.page} c={c} docId={docId} page={p.page} selected={(c.ix.valuesByDoc.get(docId) ?? []).filter((v) => v.page === p.page).map((v) => v.id)} />)}
      {page && d.pages.length > 1 && <Link className="link" href={claimHref('doc:' + docId)}>Show all {d.pages.length} pages</Link>}
      <DocNotes c={c} docId={docId} />
      {!isClient && <FindingsOn c={c} claimId={claimId} />}
      {!isClient && <Trail c={c} claimId={'doc:' + docId} />}
      {c.me.kind !== 'staff' && <Actions c={c} claimId={'doc:' + docId} current={null} identifiers={idents} title={maskText(d.title, c.me, false)} />}
    </>
  );
}

/** Notes attached to a document: evidence kept with it, with who and when; and a way to add one (staff on any document,
 *  clients on their own, as policy allows). */
function DocNotes({ c, docId }: { c: Ctx; docId: string }) {
  const claimId = 'doc:' + docId;
  const retracted = retractedSeqs(c.state.events);
  const notes = (c.state.claims[claimId]?.history ?? []).filter((e) => e.type === 'attach_note' && !retracted.has(e.seq));
  const verdict = can(c.ix, c.me, 'attach_note', { claimId, payload: { text: 'x' } }, c.state);
  const name = (k: RoleKey) => c.allRoles.find((r) => r.key === k)?.name ?? k;
  if (!notes.length && !verdict.ok) return null;
  return (
    <div className="drw-sec">
      <span className="lbl">Notes on this document · {notes.length}</span>
      <div data-testid="doc-notes" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notes.length === 0 && <span className="small muted">No notes yet.</span>}
        {notes.map((n) => (
          <div key={n.seq} className="srcitem">
            <span className="small"><span className="tag t-pas">Note, evidence</span> {name(n.role)}, {fmtDay(n.storyAt)}</span>
            <span>{maskText(String(n.payload.text ?? ''), c.me, false)}</span>
          </div>
        ))}
      </div>
      {verdict.ok && <DocNote ws={c.ws} role={c.role} claimId={claimId} />}
    </div>
  );
}

function FindingClaim({ c, id }: { c: Ctx; id: string }) {
  const f = c.findings.find((x) => x.id === id);
  if (!f) return <p className="muted">No finding {id} at this story time.</p>;
  if (c.me.kind !== 'staff' && !(c.me.kind === 'client' && f.plain)) return <Empty text="Not shared with this role" sub="Internal checks are visible to the firm's staff." />;
  if (f.firstVisibleAt && f.firstVisibleAt > c.state.storyAt) return <Empty text="Not yet in the story" sub={`This check fires once its evidence arrives, on ${fmtDay(f.firstVisibleAt)}.`} />;
  if (f.source === 'ai') return <AiFindingClaim c={c} f={f} />;
  const evidence = f.evidence.map((r) => resolveRef(c.ix, r, c.ix.latest.version));
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="row"><span className={`tag ${SEV[f.severity][1]}`}>{SEV[f.severity][0]}</span><span className="mono muted">{f.checkId} · {f.family}</span></div>
        <h2 style={{ fontSize: 19, lineHeight: 1.3 }}>{f.title}</h2>
        <p style={{ maxWidth: '60ch' }}>{maskText(c.me.kind === 'client' ? f.plain! : f.explanation, c.me, false)}</p>
        {f.effect && <span className="small num">Tax effect estimate: {f.effect.federal !== undefined ? `federal ${fmtValue(f.effect.federal)}` : ''}{f.effect.california !== undefined ? `${f.effect.federal !== undefined ? ', ' : ''}California ${fmtValue(f.effect.california)}` : ''} (estimate, from {f.effect.basis.replace(/_/g, ' ')})</span>}
      </div>
      {c.me.kind === 'staff' && <Actions c={c} claimId={'finding:' + id} current={null} title={f.title} />}
      {f.claims.length > 0 && <div className="drw-sec"><span className="lbl">Sits on</span><div className="row small" style={{ gap: 6 }}>{f.claims.map((k) => <Link key={k} className="srcref" href={claimHref(k)}>{k.replace(/^line:|^doc:/, '')}</Link>)}</div></div>}
      <div className="drw-sec"><span className="lbl">Evidence · {evidence.length}</span><ReadConfidence refs={evidence} />{evidence.map((r) => <SourceItem key={r.ref} c={c} r={r} />)}</div>
      {c.me.kind === 'staff' && <Trail c={c} claimId={'finding:' + id} />}
      {c.me.kind !== 'staff' && <Actions c={c} claimId={'finding:' + id} current={null} title={f.title} />}
    </>
  );
}

/** An AI suggestion: the rationale, each quote under a link to its page, the authority, who suggested it, and
 *  Accept / Dismiss for staff with write access. */
function AiFindingClaim({ c, f }: { c: Ctx; f: Finding }) {
  const ai = f.ai!;
  const st = suggestionStatus(c.state.events, f.id);
  const first = (k?: RoleKey) => (k ? (c.allRoles.find((r) => r.key === k)?.name ?? k).split(' ')[0] : '');
  const claimId = 'finding:' + f.id;
  const verdict = can(c.ix, c.me, 'suggestion_accepted', { claimId, payload: {} }, c.state);
  const tag = st.status === 'accepted' ? ['t-pas', 'Accepted'] : st.status === 'dismissed' ? ['t-mut', 'Dismissed'] : ['t-wrn', 'Needs review'];
  const m = (t: string) => maskText(t, c.me, false);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="row"><span className={`tag ${tag[0]}`}>{tag[1]}</span><span className="small"><AiMark />AI suggestion</span><Term k="ai-suggestion" /></div>
        <h2 style={{ fontSize: 19, lineHeight: 1.3 }}>{m(f.title)}</h2>
        <p style={{ maxWidth: '60ch' }}>{m(ai.rationale)}</p>
        {st.status === 'accepted' && <span className="small" data-testid="ai-accepted">Suggested by AI, accepted by {first(st.by)}</span>}
        {st.status === 'dismissed' && <span className="small">Dismissed by {first(st.by)}{st.reason ? `: ${m(st.reason)}` : ''}</span>}
      </div>
      <div className="drw-sec">
        <span className="lbl">What it read · {ai.quotes.length}</span>
        {ai.quotes.map((q, i) => (
          <div key={i} className="srcitem" style={{ gap: 6 }}>
            <Link className="srcref" href={claimHref(`doc:${q.doc}#page${q.page}`)}>{m(c.ix.docById.get(q.doc)?.title ?? q.doc)}, page {q.page}</Link>
            <blockquote style={{ margin: 0, paddingLeft: 10, borderLeft: '2px solid var(--acc)' }}>{m(q.quote)}</blockquote>
          </div>
        ))}
        <span className="small muted">Each quote was found word for word on its page before this suggestion was shown.</span>
      </div>
      {ai.authority && <div className="drw-sec"><span className="lbl">Authority</span><span>{ai.authority}</span></div>}
      {f.claims.length > 0 && <div className="drw-sec"><span className="lbl">Sits on</span><div className="row small" style={{ gap: 6 }}>{f.claims.map((k) => <Link key={k} className="srcref" href={claimHref(k)}>{k.replace(/^line:/, '')}</Link>)}</div></div>}
      <div className="drw-sec">
        <span className="lbl">Who suggested it</span>
        <span className="small">Suggested by {ai.model}, prompt {ai.promptVersion}, {fmtDay(ai.runAt)}</span>
        <span className="small">Confidence: {confidenceWord(ai.confidence)} <span className="muted">(the reader&apos;s own estimate; it never skips the quote check)</span></span>
      </div>
      <Trail c={c} claimId={claimId} />
      <AiDecision ws={c.ws} role={c.role} claimId={claimId} status={st.status} ok={verdict.ok} reason={verdict.reason} />
    </>
  );
}

/** The right-hand panel: where the selected number came from, what was done to it, who checked it, what is open. */
export async function ClaimDrawer({ ws, role, claimId }: { ws: string; role: RoleKey; claimId: string }) {
  const w = await getWorkspace(ws, role);
  const revealed = new Set(w.state.reveals.filter((x) => x.role === role).map((x) => x.what));
  const c: Ctx = { ix: w.ix, me: w.role, state: w.state, revealed, findings: w.findings, ws, role, allRoles: w.allRoles };
  const p = parseClaim(claimId);
  return (
    <section className="drw" aria-label="Where this number came from" data-testid="drawer">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="lbl">{p?.kind === 'doc' ? 'Document' : p?.kind === 'finding' ? 'Finding' : 'Where this number came from'}</span>
        {p && <Link className="btn" href="?" aria-label="Close the panel" scroll={false}>Close</Link>}
      </div>
      {!p && (claimId
        ? <p className="muted">That link does not name a line, document or finding.</p>
        : c.me.kind === 'staff'
          ? <Empty text="Pick any number" sub="Click a value on the Return, a document or a check. Its source page, the rule that built it, who checked it and what is open appear here." />
          : <Empty text="Pick a document" sub="Open a document from the list to read it here." />)}
      {p?.kind === 'line' && <LineClaim c={c} key_={p.key} claimId={'line:' + p.key} />}
      {p?.kind === 'doc' && <DocClaim c={c} docId={p.key} page={p.page} claimId={'doc:' + p.key} />}
      {p?.kind === 'finding' && <FindingClaim c={c} id={p.key} />}
    </section>
  );
}

export default ClaimDrawer;
