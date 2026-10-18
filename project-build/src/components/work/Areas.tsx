// Areas: the brief's record tables, each read from its packet path, with "not in the packet" where the data is absent.
// Every amount on a return line opens its drawer. Copies Areas.dc.html (collapsible area cards).
import type { ReactNode } from 'react';
import { swings } from '@/domain/versions';
import s from './work.module.css';
import { arr, claimHref, day, fmt, humanize, masker, obj, when, type WorkProps } from './lib';
import { NoAccess, NotInPacket, Page, Tag } from './ui';
import { Term } from '../term/Term';

type M = (t: unknown) => string;

/** Flatten one record to label -> value, one level of nesting ("federal.depreciation_2025"). */
function flatten(r: Record<string, unknown>, skip: string[] = []): [string, unknown][] {
  const out: [string, unknown][] = [];
  for (const [k, v] of Object.entries(r)) {
    if (skip.includes(k)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [a, b] of Object.entries(v as Record<string, unknown>)) out.push([`${k}.${a}`, b]);
    else out.push([k, v]);
  }
  return out;
}
function colLabel(k: string): string {
  return k.split('.').map(humanize).join(': ');
}

/** Array of records as a table; columns are the union of the flattened keys, in first-seen order. */
function RecordTable({ rows, m, skip = [], label }: { rows: Record<string, unknown>[]; m: M; skip?: string[]; label: string }) {
  if (!rows.length) return <NotInPacket what={label} />;
  const flat = rows.map((r) => new Map(flatten(r, skip)));
  const cols: string[] = [];
  for (const f of flat) for (const k of f.keys()) if (!cols.includes(k)) cols.push(k);
  return (
    <div className={s.scroll}>
      <table className={s.table} aria-label={label}>
        <thead><tr>{cols.map((c) => <th key={c} className={typeof flat[0].get(c) === 'number' ? s.r : undefined}>{colLabel(c)}</th>)}</tr></thead>
        <tbody>
          {flat.map((f, i) => (
            <tr key={i}>{cols.map((c) => {
              const v = f.get(c);
              return <td key={c} className={typeof v === 'number' ? s.r : undefined}>{v === undefined || v === null ? '' : Array.isArray(v) ? m(v.join(', ')) : m(v)}</td>;
            })}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A two-column key/value table for one record (nested objects flattened). */
function KV({ data, m, label }: { data: Record<string, unknown>; m: M; label: string }) {
  const rows = flatten(data);
  if (!rows.length) return <NotInPacket what={label} />;
  return (
    <div className={s.scroll}>
      <table className={s.table} aria-label={label}>
        <tbody>{rows.map(([k, v]) => <tr key={k}><td>{colLabel(k)}</td><td className={typeof v === 'number' ? s.r : undefined}>{Array.isArray(v) ? m(v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('; ')) : m(v)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Return lines of the latest version for the given forms (optionally filtered), with last year and our current value. */
function LineTable({ p, m, forms, keyFilter, label }: { p: WorkProps; m: M; forms: string[]; keyFilter?: (k: string) => boolean; label: string }) {
  const { ix, state } = p;
  const prior = obj(obj(ix.packet.prior_years.return_2024).lines);
  const lines = ix.latest.lines.filter((l) => forms.includes(l.form) && (!keyFilter || keyFilter(l.key)));
  if (!lines.length) return <NotInPacket what={label} />;
  const anyPrior = lines.some((l) => l.key in prior);
  return (
    <div className={s.scroll}>
      <table className={s.table} aria-label={label}>
        <thead><tr><th>Line</th><th>Label</th><th className={s.r}>{ix.latest.version}</th><th className={s.r}>Now</th>{anyPrior ? <th className={s.r}>2024</th> : null}<th>Sources</th></tr></thead>
        <tbody>
          {lines.map((l) => {
            const c = state.claims['line:' + l.key];
            return (
              <tr key={l.key}>
                <td className={s.mono} style={{ whiteSpace: 'nowrap' }}>{l.key}</td>
                <td>{m(l.label)}</td>
                <td className={s.r}><a className={s.amt} href={claimHref(p.sp, 'line:' + l.key)}>{m(l.value)}</a></td>
                <td className={s.r}>{c?.adjusted ? <><strong>{m(c.current)}</strong> <Tag tone="acc">Adjusted</Tag></> : ''}</td>
                {anyPrior ? <td className={s.r}>{l.key in prior ? m(prior[l.key]) : ''}</td> : null}
                <td className={s.note}>{l.sources.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Area({ name, headline, children, open }: { name: ReactNode; headline?: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className={s.area} open={open}>
      <summary>
        <svg className={s.chev} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
        <span>{name}</span>
        {headline ? <span className={`${s.note} ${s.num}`} style={{ fontWeight: 400 }}>{headline}</span> : null}
      </summary>
      <div className={s.areaBody}>{children}</div>
    </details>
  );
}
function Sub({ title, children }: { title: ReactNode; children: ReactNode }) {
  return <div className={s.section}><h3 className={s.h3}>{title}</h3>{children}</div>;
}

function SwingTable({ p, m, rows }: { p: WorkProps; m: M; rows: ReturnType<typeof swings> }) {
  return (
    <div className={s.scroll}>
      <table className={s.table} aria-label="Swings against 2024">
        <thead><tr><th>Line</th><th>Label</th><th className={s.r}>2024</th><th className={s.r}>2025</th><th className={s.r}>Change</th><th>Flag</th></tr></thead>
        <tbody>{rows.map((x) => (
          <tr key={x.key}>
            <td className={s.mono}>{x.key}</td><td>{m(x.label)}</td><td className={s.r}>{m(x.prior)}</td>
            <td className={s.r}>{p.ix.line(p.ix.latest.version, x.key) ? <a className={s.amt} href={claimHref(p.sp, 'line:' + x.key)}>{m(x.current)}</a> : <span className={s.note}>not on the 2025 return</span>}</td>
            <td className={s.r}>{m(x.delta)}</td>
            <td>{x.flag === 'swing' ? <Tag tone="wrn">Swing</Tag> : x.flag === 'new' ? <Tag tone="acc">New</Tag> : ''}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

// Form codes (README form_codes) grouped into the brief's record areas. Schema, not packet facts.
const TAX_FORMS = ['F1040', 'Sch1', 'Sch2', 'F6251', 'F8959', 'F8960', 'F2210'];
const BOOKS_FORMS = ['SchC', 'SchSE', 'F8995', 'F4562-C'];
const RENTAL_FORMS = ['SchE', 'F8582', 'F4797', 'F4562-E'];
const K1_FORMS = ['F7203'];
const RETIRE_FOREIGN_FORMS = ['F8606', 'F8889', 'F8938', 'SchB'];
const DEDUCTION_FORMS = ['SchA', 'F8283', 'Sch3', 'F8812', 'F8863', 'F2441', 'F8867'];
const STATE_FORMS = ['SchCA540NR', 'F540NR', 'ScheduleS', 'FTB3885A', 'FTB5805'];
const LIMIT_WORDS = /cap|limit|threshold|per_child|per_dependent|exemption|phaseout|max|rate|base/i;

export function AreasScreen(p: WorkProps) {
  const { role, state, ix } = p;
  if (!role.screens.includes('areas')) return <NoAccess role={role} screen="areas" />;
  const m = masker(state, role);
  const pk = ix.packet;
  const v = ix.latest;
  const py = pk.prior_years;
  const sw = swings(ix);
  const swingRows = sw.filter((x) => x.flag === 'swing');
  const newRows = sw.filter((x) => x.flag === 'new');
  const sales = v.lines.filter((l) => l.form === 'F8949');
  const boxes = [...new Set(sales.map((l) => l.key.split('.')[1]))].sort();
  const k1Docs = pk.documents.filter((d) => /^k-1/i.test(d.document_type));
  const params = Object.entries(pk.engine_reference.parameters).filter(([k, val]) => LIMIT_WORDS.test(k) && (typeof val === 'number' || typeof val === 'string'));
  const agency = obj(pk.tax_agency_records);
  const transcripts = arr(agency.irs_account_transcript_2025).map(obj);
  const ftb = obj(agency.ftb_account);
  const payLines = v.lines.filter((l) => /payment|withh|estimated|extension/i.test(l.label));
  const prep = obj(py.prior_preparer_workpaper);
  const pyNotes = obj(obj(py.return_2024).notes);
  const basis = obj(py.basis_records);
  const carryIn = obj(py.carryovers_into_2025);
  const carryOut = obj(v.carryovers_out);
  const related = arr(pk.household.related_returns).map(obj);
  const outside = (pk.firm.deadlines as Record<string, unknown>[]).filter((d) => /outside/i.test(String(d.what)));

  return (
    <Page head={p.head} label="Areas" h1="Records by area"
      tags={<><Tag tone="neu">{v.version} computed {when(v.computed_at)}</Tag><Tag tone="neu">As of {when(state.storyAt)}</Tag>{state.frozen ? <Tag tone="acc">As filed, locked</Tag> : null}</>}
      intro="The record tables behind the return, each read from its place in the packet. Amounts on return lines open where they came from. Where the packet has no record, the table says so.">

      <Area name="Return summary against last year" headline={<>{swingRows.length} swings<Term k="swing" /> over the firm&apos;s variance rule; {newRows.length} lines new this year</>} open>
        <Sub title={`${v.version} summary`}><KV data={obj(v.summary)} m={m} label="Summary" /></Sub>
        <Sub title={`Against the 2024 return: ${swingRows.length} lines over the firm's variance rule`}>
          {sw.length ? <SwingTable p={p} m={m} rows={swingRows} /> : <NotInPacket what="2024 comparison" />}
          {sw.length > swingRows.length ? (
            <details><summary style={{ cursor: 'pointer' }} className={s.note}>All {sw.length} lines compared with 2024, including {newRows.length} new this year</summary><SwingTable p={p} m={m} rows={sw} /></details>
          ) : null}
        </Sub>
      </Area>

      <Area name="Tax computation" headline={<>Form 1040<Term k="form-1040" /> and the tax schedules, including AMT<Term k="amt" /></>}>
        <LineTable p={p} m={m} forms={TAX_FORMS} label="Tax computation" />
      </Area>

      <Area name={<>Depreciation<Term k="depreciation" /> by asset</>} headline={`${arr(v.assets).length} assets in ${v.version}; federal, California and AMT`}>
        <RecordTable rows={arr(v.assets).map(obj)} m={m} skip={['sources']} label="Depreciation by asset" />
        <Sub title="Prior-year asset records"><RecordTable rows={arr(py.asset_records).map(obj)} m={m} skip={['sources', 'federal', 'california', 'amt_difference']} label="Prior-year asset records" /></Sub>
        <Sub title="Depreciation lines"><LineTable p={p} m={m} forms={['F4562-C', 'F4562-E', 'FTB3885A']} label="Depreciation lines" /></Sub>
      </Area>

      <Area name="Sales detail" headline={<>{sales.length} Form 8949<Term k="form-8949" /> lines in {boxes.length} boxes</>}>
        {boxes.length ? boxes.map((b) => {
          const all = sales.filter((l) => l.key.split('.')[1] === b);
          const total = all.find((l) => /\.total$/.test(l.key));
          const lots = all.filter((l) => l !== total);
          return (
            <div key={b} className={s.box}>
              <div className={s.boxRow}>
                <strong>Box {b}</strong>
                <span className={s.grow}>{total ? m(total.label) : 'No totals line'}</span>
                {total ? <a className={s.amt} href={claimHref(p.sp, 'line:' + total.key)}>{m(total.value)}</a> : null}
              </div>
              <details className={s.boxRow} style={{ display: 'block' }}>
                <summary style={{ cursor: 'pointer' }}>{lots.length} lots</summary>
                <div className={s.scroll} style={{ marginTop: 8 }}>
                  <table className={s.table} aria-label={`Box ${b} lots`}>
                    <thead><tr><th>Line</th><th>Lot</th><th className={s.r}>Gain or loss</th></tr></thead>
                    <tbody>{lots.map((l) => (
                      <tr key={l.key}><td className={s.mono}>{l.key}</td><td>{m(l.label)}</td><td className={s.r}><a className={s.amt} href={claimHref(p.sp, 'line:' + l.key)}>{m(l.value)}</a></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </details>
            </div>
          );
        }) : <NotInPacket what="Form 8949" />}
        <Sub title={<>Schedule D<Term k="sch-d" /></>}><LineTable p={p} m={m} forms={['SchD']} label="Schedule D" /></Sub>
      </Area>

      <Area name="Books to tax" headline={<>Schedule C<Term k="sch-c" />, self-employment<Term k="sch-se" /> and QBI<Term k="qbi" /></>}>
        <LineTable p={p} m={m} forms={BOOKS_FORMS} label="Books to tax" />
      </Area>

      <Area name={<>Rentals and passive losses<Term k="passive-loss" /></>} headline={<>Schedule E<Term k="sch-e" />, Form 8582<Term k="form-8582" />, Form 4797<Term k="form-4797" /></>}>
        <LineTable p={p} m={m} forms={RENTAL_FORMS} label="Rentals and passive losses" />
      </Area>

      <Area name={<>K-1<Term k="k-1" /> lines</>} headline={`${k1Docs.length} K-1 documents`}>
        {k1Docs.length ? k1Docs.map((d) => {
          const vals = ix.valuesByDoc.get(d.id) ?? [];
          return (
            <Sub key={d.id} title={`${m(d.title)} (${d.id})`}>
              {vals.length ? (
                <div className={s.scroll}>
                  <table className={s.table} aria-label={d.title}>
                    <thead><tr><th>Field</th><th>Label</th><th className={s.r}>Value</th><th className={s.r}>Read confidence<Term k="read-confidence" /></th></tr></thead>
                    <tbody>{vals.map((x) => (
                      <tr key={x.id}><td className={s.mono}>{x.field}</td><td>{m(x.label)}</td><td className={s.r}><a className={s.amt} href={claimHref(p.sp, 'doc:' + d.id)}>{m(x.value)}</a></td><td className={s.r}>{fmt(x.confidence)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className={s.note} style={{ margin: 0 }}>No values extracted ({m(d.extraction.status)}{d.extraction.reason ? `: ${m(d.extraction.reason)}` : ''}).</p>}
            </Sub>
          );
        }) : <NotInPacket what="K-1 documents" />}
        <Sub title={<>Shareholder basis<Term k="basis" /> (Form 7203<Term k="form-7203" />)</>}><LineTable p={p} m={m} forms={K1_FORMS} label="Form 7203" /></Sub>
      </Area>

      <Area name="Retirement and foreign items" headline={<>IRA basis<Term k="form-8606" />, HSA, foreign accounts<Term k="fbar" /></>}>
        <LineTable p={p} m={m} forms={RETIRE_FOREIGN_FORMS} keyFilter={(k) => !k.startsWith('SchB.') || /7|8/.test(k.split('.')[1] ?? '')} label="Retirement and foreign items" />
        <Sub title="Exchange rates in the packet"><KV data={obj(pk.fx_rates)} m={m} label="Exchange rates" /></Sub>
      </Area>

      <Area name="Deductions and credits with limits" headline={<>Itemized<Term k="sch-a" />, charitable, child<Term k="form-8812" /> and education<Term k="form-8863" /> credits, dependent care</>}>
        <LineTable p={p} m={m} forms={DEDUCTION_FORMS} label="Deductions and credits" />
        <Sub title="Limits the engine applies (engine_reference.parameters)">
          {params.length ? (
            <div className={s.scroll}><table className={s.table} aria-label="Limits"><tbody>
              {params.map(([k, val]) => <tr key={k}><td className={s.mono}>{k}</td><td className={s.r}>{m(val)}</td></tr>)}
            </tbody></table></div>
          ) : <NotInPacket what="Limits" />}
        </Sub>
      </Area>

      <Area name="Payments" headline={<>Withholding, estimated payments<Term k="estimated-tax" /> and extension<Term k="extension" /> payments, on the return and in the IRS and FTB records</>}>
        <Sub title="Payment lines on the return"><LineTable p={p} m={m} forms={[...new Set(payLines.map((l) => l.form))]} keyFilter={(k) => payLines.some((l) => l.key === k)} label="Payment lines" /></Sub>
        {transcripts.length ? transcripts.map((t, i) => (
          <Sub key={i} title={`IRS account transcript as of ${m(t.as_of)}`}><RecordTable rows={arr(t.transactions).map(obj)} m={m} label="IRS transcript" /></Sub>
        )) : <NotInPacket what="IRS account transcript" />}
        {Object.keys(ftb).length ? Object.entries(ftb).filter(([, val]) => Array.isArray(val)).map(([k, val]) => (
          <Sub key={k} title={`FTB account: ${humanize(k)}${ftb.as_of ? ` (as of ${m(ftb.as_of)})` : ''}`}><RecordTable rows={arr(val).map(obj)} m={m} label={humanize(k)} /></Sub>
        )) : <NotInPacket what="FTB account" />}
      </Area>

      <Area name="State split" headline={<>California part-year<Term k="part-year-resident" />: residency and the 540NR<Term k="form-540nr" /></>}>
        <Sub title="Residency"><RecordTable rows={arr(pk.household.residency).map(obj)} m={m} label="Residency" /></Sub>
        <LineTable p={p} m={m} forms={STATE_FORMS} label="State split" />
      </Area>

      <Area name={<>Carryovers<Term k="carryover" /></>} headline="Into 2025 from the prior year, and out of 2025">
        <div className={s.cols}>
          <Sub title="Into 2025 (prior_years)"><KV data={carryIn} m={m} label="Carryovers into 2025" /></Sub>
          <Sub title={`Out of 2025 (${v.version})`}><KV data={carryOut} m={m} label="Carryovers out" /></Sub>
        </div>
      </Area>

      <Area name="Basis by year" headline="S corporation, partnership, IRA, home">
        {Object.keys(basis).length ? Object.entries(basis).map(([k, val]) => (
          <Sub key={k} title={humanize(k)}><RecordTable rows={arr(val).map(obj)} m={m} label={humanize(k)} /></Sub>
        )) : <NotInPacket what="Basis records" />}
      </Area>

      <Area name="Prior preparer against our changes" headline={prep.source_document ? `Prior workpaper ${m(prep.source_document)}` : undefined}>
        {Object.keys(prep).length ? (
          <>
            {prep.source_document ? <p style={{ margin: 0 }}><a className={s.link} href={claimHref(p.sp, 'doc:' + String(prep.source_document))}>Open the prior preparer’s workpaper</a></p> : null}
            {prep.summary_memo ? <Sub title="Their summary"><p style={{ margin: 0, maxWidth: '80ch' }}>{m(prep.summary_memo)}</p></Sub> : null}
            <Sub title="Their notes"><ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>{arr(prep.notes).map((n, i) => <li key={i}>{m(n)}</li>)}</ul></Sub>
            <Sub title="Open items they left"><ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>{arr(prep.open_items_left_by_prior_preparer).map((n, i) => <li key={i}>{m(n)}</li>)}</ul></Sub>
            {Object.keys(pyNotes).length ? <Sub title="Notes on the 2024 return"><KV data={pyNotes} m={m} label="2024 notes" /></Sub> : null}
          </>
        ) : <NotInPacket what="Prior preparer workpaper" />}
        <Sub title="Our changes in this workspace">
          <p className={s.note} style={{ margin: 0 }}>Every proposed and applied adjustment, with who, why and who signed: <a className={s.link} href={`/w/${p.ws}/${p.role.key}/review`}>Adjustments on Review</a>.</p>
        </Sub>
      </Area>

      <Area name="Related returns and outside filings">
        <div className={s.scroll}>
          <table className={s.table} aria-label="Related returns and outside filings">
            <thead><tr><th>Who</th><th>Return or filing</th><th>Prepared by or due</th><th>In this packet</th></tr></thead>
            <tbody>
              {related.map((r, i) => (
                <tr key={'r' + i}><td>{m(r.who)}</td><td>{m(r.return)}</td><td>{m(r.prepared_by)}</td><td>{r.in_this_packet === false ? 'No' : m(r.in_this_packet)}</td></tr>
              ))}
              {outside.map((d, i) => (
                <tr key={'o' + i}><td>Outside this engagement</td><td>{m(d.what)}</td><td>Due {day(String(d.date))}</td><td>No</td></tr>
              ))}
              {related.length + outside.length === 0 ? <tr><td colSpan={4}>Not in the packet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Area>
    </Page>
  );
}
