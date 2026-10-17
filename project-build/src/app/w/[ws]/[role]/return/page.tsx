import Link from 'next/link';
import { Shell } from '@/components/shell/Shell';
import { getWorkspace } from '@/components/shell/load';
import { cmpCells, compareVersions, differLine, finalized, FINALIZED, formsOf, swings } from '@/domain/versions';
import { claimHref, fmtValue, parseClaim } from '@/components/shell/lib';
import type { Finding } from '@/domain/contracts';
import { FormTerm, Term } from '@/components/term/Term';

type P = { params: Promise<{ ws: string; role: string }>; searchParams: Promise<Record<string, string | undefined>> };
const SEV: Record<Finding['severity'], [string, string, number]> = { blocker: ['Blocking', 't-blk', 0], check: ['Check failed', 't-wrn', 1], judgment: ['Judgment', 't-wrn', 2], info: ['Note', 't-mut', 3] };

export default async function ReturnScreen({ params, searchParams }: P) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const w = await getWorkspace(ws, role);
  const { ix, state, role: me } = w;
  const latest = ix.latest.version;
  const others = ix.versions.map((v) => v.version).filter((v) => v !== latest);
  const cmp = sp.cmp && (others.includes(sp.cmp) || sp.cmp === 'finalized') ? sp.cmp : null;
  const onlyChanged = !!cmp && sp.only === 'changed';
  const selected = parseClaim(sp.claim);
  const selKey = selected?.kind === 'line' ? selected.key : null;

  const cmpMap = new Map<string, { other: unknown; change: string }>();
  if (cmp) {
    const rows = cmp === 'finalized' ? compareVersions(ix, latest, FINALIZED, finalized(ix, state)).map((r) => ({ ...r, other: r.b }))
      : compareVersions(ix, cmp, latest).map((r) => ({ ...r, other: r.a }));
    for (const r of rows) cmpMap.set(r.key, { other: r.other, change: r.change });
  }
  const changedCount = [...cmpMap.values()].filter((x) => x.change !== 'same').length;

  const sw = new Map(swings(ix).map((s) => [s.key, s]));
  const swingCount = [...sw.values()].filter((s) => s.flag === 'swing').length;
  const visible = w.findings.filter((f) => f.source !== 'ai').filter((f) => !f.firstVisibleAt || f.firstVisibleAt <= state.storyAt);
  const findingOn = new Map<string, Finding>();
  for (const f of visible) for (const c of f.claims) { const prev = findingOn.get(c); if (!prev || SEV[f.severity][2] < SEV[prev.severity][2]) findingOn.set(c, f); }
  const diagOn = new Set<string>();
  for (const d of ix.latest.diagnostics) for (const l of ix.latest.lines) if (d.refs.includes(l.key) || l.sources.some((s) => d.refs.includes(s))) diagOn.add(l.key);

  const keep = { cmp: cmp ?? undefined, only: onlyChanged ? 'changed' : undefined, open: sp.open };
  const q = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v) u.set(k, v); const s = u.toString(); return s ? '?' + s : '?'; };
  const forms = formsOf(ix, latest);
  const cmpLabel = cmp === 'finalized' ? 'Finalized' : cmp;
  const finalizedNote = 'Finalized = the latest version plus applied adjustments. Totals are not recomputed by the engine.';

  return (
    <Shell ws={ws} role={me.key} screen="return" state={state} roleInfo={me} claim={sp.claim} q={sp.q}>
      <div className="screen">
        <div className="screen-head">
          <div>
            <h1 title="Forms and lines">Return</h1>
            <span className="sub">Every line of {latest} ({ix.latest.lines.length.toLocaleString('en-US')} lines on {forms.length} forms). Click any amount to see where it came from.</span>
          </div>
          <span className="small muted num">{latest} computed {ix.latest.computed_at.slice(0, 16).replace('T', ' ')} UTC</span>
        </div>

        <div className="keyrow" role="group" aria-label="Status key">
          <span><span className="tag t-blk">Blocking</span>stops filing<Term k="blocker" /></span>
          <span><span className="tag t-wrn">Check failed</span>our check disagrees</span>
          <span><span className="tag t-wrn">Judgment</span>needs a recorded decision<Term k="judgment" /></span>
          <span><span className="tag t-wrn">Engine warning</span>from the engine only<Term k="engine-diagnostics" /></span>
          <span><span className="tag t-acc">Adjusted</span>changed in this workspace<Term k="adjustment" /></span>
          <span><span className="tag t-wrn">Swing</span>moved past the firm&apos;s variance rule from last year<Term k="swing" /></span>
          <span><span className="tag t-acc">New this year</span>no amount last year</span>
        </div>

        <div className="panel" aria-label="Compare versions">
          <div className="row">
            <span className="lbl">Compare {latest} with</span>
            <Link className={`btn${!cmp ? ' on' : ''}`} aria-pressed={!cmp} href={q({})}>Nothing</Link>
            {others.map((v) => <Link key={v} className={`btn${cmp === v ? ' on' : ''}`} aria-pressed={cmp === v} href={q({ cmp: v, only: onlyChanged ? 'changed' : undefined })}>{v}</Link>)}
            <Link className={`btn${cmp === 'finalized' ? ' on' : ''}`} aria-pressed={cmp === 'finalized'} href={q({ cmp: 'finalized', only: onlyChanged ? 'changed' : undefined })}>Finalized</Link><Term k="finalized-version" />
            {cmp && <Link className={`btn${onlyChanged ? ' on' : ''}`} aria-pressed={onlyChanged} href={q({ cmp, only: onlyChanged ? undefined : 'changed' })}>Only changed lines</Link>}
          </div>
          {cmp && <span className="small num">{differLine(changedCount, cmpLabel!, latest)} {cmp === 'finalized' ? `${finalizedNote} The ${latest} column is the engine's value.` : 'From the packet’s computed versions.'}</span>}
          <span className="small muted num">Last year column: the 2024 return as filed (prior year). {swingCount} line{swingCount === 1 ? '' : 's'} flagged as swings by the firm&apos;s variance rule.</span>
        </div>

        {forms.map((f) => {
          const rows = f.lines.map((k) => ix.line(latest, k)!).filter(Boolean).filter((l) => !onlyChanged || (cmpMap.get(l.key)?.change ?? 'same') !== 'same');
          if (onlyChanged && rows.length === 0) return null;
          const flagged = rows.filter((l) => findingOn.has('line:' + l.key)).length;
                  const open = rows.length <= 40 || rows.some((l) => l.key === selKey) || onlyChanged || sp.open === f.form;
          if (!open) return (
            <section key={f.form} className="form" aria-label={f.label}>
              <div className="row" style={{ padding: '10px 14px', minHeight: 44 }}>
                <h2>{f.label}</h2><FormTerm code={f.form} /><span className="mono muted">{f.form}</span>
                <span className="small muted num">{rows.length} lines{flagged ? ` · ${flagged} with open checks` : ''}</span>
                <Link className="btn" style={{ marginLeft: 'auto' }} scroll={false} href={q({ ...keep, open: f.form })}>Show the {rows.length} lines</Link>
              </div>
            </section>
          );
          return (
            <details key={f.form} className="form" open aria-label={f.label}>
              <summary>
                <h2>{f.label}</h2><FormTerm code={f.form} /><span className="mono muted">{f.form}</span>
                <span className="small muted num" style={{ marginLeft: 'auto' }}>{rows.length} line{rows.length === 1 ? '' : 's'}{flagged ? ` · ${flagged} with open checks` : ''}</span>
              </summary>
              <div className="scroll">
                <table className="lines">
                  <thead><tr><th>Line</th><th className="r">{latest}</th>{cmp && <th className="r">{cmpLabel}</th>}<th className="r">Last year</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.map((l) => {
                      const id = 'line:' + l.key;
                      const cs = state.claims[id];
                      const fnd = findingOn.get(id);
                      const s = sw.get(l.key);
                      const cm = cmpMap.get(l.key);
                      const cell = cmpCells(l.value, cs, cmp, cm?.other);
                      return (
                        <tr key={l.key} className={`${l.key === selKey ? 'sel' : ''}${cm && cm.change !== 'same' ? ' chg' : ''}`}>
                          <td><span style={{ display: 'flex', flexDirection: 'column' }}><span>{l.label}</span><span className="mono muted">{l.key}</span></span></td>
                          <td className="r num"><Link className="valbtn num" scroll={false} href={claimHref(id, keep)} aria-label={`${l.label}: ${fmtValue(cell.latest)}. Show where it came from`} data-line={l.key}>{fmtValue(cell.latest)}</Link>
                            {cell.wasNote && <div className="small muted num">was <span className="del">{fmtValue(l.value)}</span></div>}</td>
                          {cmp && <td className="r num cmp">{cm ? fmtValue(cell.other) : 'Blank'}{cm && cm.change !== 'same' ? <div><span className="tag t-acc">{cm.change === 'changed' ? 'Changed' : cm.change === 'added' ? 'New line' : 'Removed'}</span></div> : null}</td>}
                          <td className="r num">{s?.prior !== null && s?.prior !== undefined ? fmtValue(s.prior) : <span className="muted">None</span>}
                            {s?.flag === 'swing' && <div><span className="tag t-wrn" title="Past the firm's variance rule">Swing {s.delta > 0 ? '+' : ''}{fmtValue(s.delta)}</span></div>}
                            {s?.flag === 'new' && <div><span className="tag t-acc">New this year</span></div>}</td>
                          <td>
                            {fnd ? <Link href={claimHref('finding:' + fnd.id, keep)} className={`tag ${SEV[fnd.severity][1]}`} style={{ textDecoration: 'none' }}>{SEV[fnd.severity][0]}</Link>
                              : diagOn.has(l.key) ? <span className="tag t-wrn">Engine warning</span>
                              : cs?.adjusted ? <span className="tag t-acc">Adjusted</span> : <span className="tag t-pas">No open checks</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>
    </Shell>
  );
}
