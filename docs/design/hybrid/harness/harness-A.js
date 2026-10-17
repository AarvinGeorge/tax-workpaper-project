// Harness for author A: Areas.dc.html (same style as harness-H.js). Round H3: 10 roles (erik), story clock, events/emit,
// related returns, renames, ca-wages and salt-d02.
// Extract the Component class, stub DCLogic, call renderVals() for all 9 roles with no-op props, resolve every
// {{hole}} in the markup (inside sc-for scopes, sc-if branches included), call every handler and re-render, fail on any
// thrown error or undefined hole. Static checks, role assertions, a client/examiner leak scan, the claim ids against
// AREAS-CLAIMS.md, and two mutations that must make the checks fail (proof the harness can fail).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const dir = process.env.A_DIR || path.join(__dirname, 'project');
const FILE = 'Areas.dc.html';
const roles = ['priya','marcus','daniel','helen','sam','jo','ngozi','erik','next','irs'];

class DCLogic { constructor(p) { this.props = p || {}; this.state = {}; } setState(s) { this.state = Object.assign({}, this.state, typeof s === 'function' ? s(this.state) : s); } forceUpdate() {} }

function parse(markup) {
  const re = /<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="(\w+)"[^>]*>|<\/sc-for>|\{\{\s*([^}]*?)\s*\}\}/g;
  const root = { kids: [] }; const stack = [root]; let m, holes = 0;
  while ((m = re.exec(markup))) {
    const line = markup.slice(0, m.index).split('\n').length;
    if (m[1]) { const n = { list: m[1], as: m[2], kids: [], line }; stack[stack.length - 1].kids.push(n); stack.push(n); }
    else if (m[0] === '</sc-for>') { stack.pop(); }
    else { holes++; stack[stack.length - 1].kids.push({ hole: m[3], line }); }
  }
  if (stack.length !== 1) throw new Error('unbalanced sc-for');
  return { root, holes };
}
function lookup(scope, p) {
  if (/^(true|false|-?\d+(\.\d+)?)$/.test(p)) return true;
  if (!/^[\w$]+(\.[\w$]+)*$/.test(p)) return { expr: true };
  let cur = scope;
  for (const seg of p.split('.')) { if (cur == null) return undefined; cur = cur[seg]; }
  return cur;
}
function check(node, scope, where, out) {
  for (const k of node.kids) {
    if (k.hole !== undefined) {
      const v = lookup(scope, k.hole);
      if (v && v.expr) out.push('expression hole {{' + k.hole + '}} line ' + k.line);
      else if (v === undefined) out.push('undefined {{' + k.hole + '}} line ' + k.line + ' ' + where);
      out.count++;
    } else {
      const list = lookup(scope, k.list);
      if (!Array.isArray(list)) { out.push('sc-for list not an array {{' + k.list + '}} line ' + k.line + ' ' + where); continue; }
      list.forEach((item, i) => check(k, Object.assign({}, scope, { [k.as]: item, $index: i }), where + ' ' + k.as + '[' + i + ']', out));
    }
  }
}
function funcs(o, acc, depth) {
  if (depth > 12 || o == null) return acc;   // record cells sit 9 levels down
  if (typeof o === 'function') { acc.push(o); return acc; }
  if (Array.isArray(o)) o.forEach(x => funcs(x, acc, depth + 1));
  else if (typeof o === 'object') Object.values(o).forEach(x => funcs(x, acc, depth + 1));
  return acc;
}
// Visible strings only (functions dropped), for leak scans.
const visible = (v) => JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x);

const EXISTING = ['ca-est','atlas','rsu','theo-ssn','heat-pump','ext-pay','fed-est','repairs','care-ein','iso-lot','noncash','ca-wages','salt-d02'];   // ca-wages, salt-d02: drawer claims added by S2 in H3
const NEW = ['sehi','bright-oak','sek-fx','form-3520','mileage','phone-pct','sec179','payoff-int','or-credit','excess-ss','ca-trace'];
const PRIORITY = { 'GT-A06/C03':'sehi', 'GT-A08':'bright-oak', 'GT-B02':'sek-fx', 'GT-B05/C09':'form-3520', 'GT-C02':'mileage', 'GT-C04':'phone-pct', 'GT-C06':'sec179', 'GT-D01':'payoff-int', 'GT-D04':'or-credit', 'GT-D05':'excess-ss', 'GT-D06':'ca-trace' };
const LEDGER27 = ['A01','A02','A03','A04','A05','A06','A07','A08','B01','B02','B03','B04','B05','C01','C02','C04','C05','C06','C07','C08','C10','D01','D02','D03','D04','D05','D06'];
const AREA_NAMES = ['Intake and engagement','Wages and stock compensation','Investments and digital assets','Business','Rentals and sale','Pass-throughs and basis','Deductions and credits','California','Partner review'];
const BLOCKED = 'Approve and send to client: blocked by “California estimates include a 2024 payment”, and 3 more';
const NONCASH = 'Tax effect: about +806 federal, +149 California (estimate at v3 rates, Example). Under 1,000, so reviewer sign-off is enough.';   // H3 E: "ledger" never on screen
const AUTH = 'Authority to confirm: Treas. Reg. 1.263(a)-3 (Example)';
const SHELL_ASOF = { priya:'2026-06-23T06:05', marcus:'2026-06-23T06:05', daniel:'2026-06-23T06:05', helen:'2026-06-23T06:05', jo:'2026-06-23T06:05', ngozi:'2026-06-23T06:05', erik:'2026-06-23T06:05', sam:'2027-01-15T15:00', next:'2027-01-15T15:00', irs:'2028-01-26T15:00' };

function runAll(html, quiet) {
  let fail = 0;
  const bad = (m) => { fail++; if (!quiet) console.log('  FAIL', m); };
  const log = (m) => { if (!quiet) console.log(m); };
  const markup = html.split('<x-dc>')[1].split('</x-dc>')[0];
  const body = html.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  // static checks
  if (/—/.test(html)) bad('em dash in file');
  if (!html.includes('<script src="./support.js"></script>')) bad('support.js line missing');
  if (!/<div class="\{\{wpClass\}\}">/.test(markup)) bad('root is not <div class="{{wpClass}}">');
  const css = html.split('<style>')[1].split('</style>')[0];
  const classes = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]).filter(c => !['wp','dark','on','primary'].includes(c));
  const unpref = [...new Set(classes.filter(c => !c.startsWith('area-')))];
  if (unpref.length) bad('unprefixed CSS classes: ' + unpref.join(','));
  if (/<[a-z]+[^>]*\s(onclick|onchange)=/.test(markup)) bad('lowercase event attribute');
  if (/<(dialog|[a-z-]*modal)/i.test(markup)) bad('modal element');
  if (/https?:\/\/(?!fonts\.(googleapis|gstatic)\.com)/.test(html)) bad('network other than Google Fonts');
  const fontLine = '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans';
  if (!html.includes(fontLine)) bad('font link differs from A');
  // tokens identical to ReturnMap (copied verbatim from A)
  try {
    const ref = fs.readFileSync(path.join(dir, 'ReturnMap.dc.html'), 'utf8');
    const tok = (h) => (h.match(/^\.wp\{--bg[^\n]*\n\.wp\.dark\{[^\n]*/m) || [''])[0];
    if (!tok(html) || tok(html) !== tok(ref)) bad('token block differs from the other screens');
  } catch (e) { /* ReturnMap absent: skip */ }
  // node --check on the class body
  const tmp = path.join(os.tmpdir(), 'areas-class-' + process.pid + '.js');
  fs.writeFileSync(tmp, body);
  try { cp.execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { bad('node --check: ' + String(e.stderr || e.message).split('\n')[0]); }
  fs.unlinkSync(tmp);
  let tree;
  try { tree = parse(markup); } catch (e) { bad('parse: ' + e.message); return fail; }
  let Component;
  try { Component = new Function('DCLogic', body + ';return Component;')(DCLogic); } catch (e) { bad('class does not load: ' + e.message); return fail; }

  let claimsDoc = '';
  try { claimsDoc = fs.readFileSync(path.join(dir, '..', 'AREAS-CLAIMS.md'), 'utf8'); } catch (e) { bad('AREAS-CLAIMS.md missing'); }
  NEW.forEach(id => { if (!new RegExp('^### `' + id + '`', 'm').test(claimsDoc)) bad('AREAS-CLAIMS.md has no section for ' + id); });

  for (const variant of ['shell', 'alone']) {
    for (const role of roles) {
      const calls = [];
      const props = variant === 'alone' ? { role } : { role, dark: role === 'jo', claimId: role === 'priya' ? 'sehi' : '', revealed: ['ssn-theo'], revealLog: [{ who:'Priya Raman', what:'ssn-theo', when:'09:41', example:false }],
        openClaim: (id) => calls.push('openClaim:' + id), go: (s) => calls.push('go:' + s), reveal: () => calls.push('reveal'), asOf: SHELL_ASOF[role], asOfLabel: ['sam','next','irs'].includes(role) ? 'Filed' : ['ngozi','erik'].includes(role) ? 'As of 23 Jun 2026' : 'As of 23 Jun 2026, v3', storyAt: SHELL_ASOF[role], events: [], emit: (e) => calls.push('emit:' + e.type), lastSeen: {} };
      let c, v; const out = [];
      try { c = new Component(props); v = c.renderVals(); } catch (e) { bad(variant + ' ' + role + ' renderVals threw: ' + e.message); continue; }
      // open every area so the expanded path is exercised too
      if (v.areas) v.areas.forEach(a => { if (!a.isOpen) a.toggle(); });
      try { v = c.renderVals(); } catch (e) { bad(role + ' renderVals after toggles threw: ' + e.message); continue; }
      out.count = 0; check(tree.root, v, variant + ' ' + role, out);
      const n0 = out.count;
      const fs0 = funcs(v, [], 0);
      // Call every handler and re-render after each; check every hole once more after all of them (state then holds every toggle, proposal and review).
      for (const fn of fs0) { try { fn({ target: { value: 'x' }, preventDefault() {}, stopPropagation() {} }); c.renderVals(); } catch (e) { bad(role + ' handler threw: ' + e.message); } }
      try { const w = c.renderVals(); const o2 = []; o2.count = 0; check(tree.root, w, role + ' after all handlers', o2); o2.forEach(x => out.push(x)); } catch (e) { bad(role + ' re-render threw: ' + e.message); }
      out.forEach(x => bad(x));
      if (variant === 'alone') continue;
      const ids = [...new Set(calls.filter(x => x.startsWith('openClaim')).map(x => x.slice(10)))];
      const gos = [...new Set(calls.filter(x => x.startsWith('go:')).map(x => x.slice(3)))];
      log('  ' + role.padEnd(7) + ' holes resolved ' + String(n0).padStart(5) + ' · handlers ' + String(fs0.length).padStart(3) + ' · openClaim ' + ids.length + ' ids · go ' + (gos.join(',') || '-'));
      const ok = (cond, m) => { if (!cond) bad(role + ': ' + m); };
      const txt = visible(v);
      const working = ['priya','marcus','daniel','helen','jo'].includes(role);
      const filed = role === 'sam' || role === 'next';
      ids.forEach(id => ok(EXISTING.includes(id) || NEW.includes(id), 'unknown claimId ' + id));
      ok(!/\b\d{3}-\d{2}-\d{4}\b/.test(txt), 'an unmasked SSN pattern');
      ok(!/reveal/.test(calls.join()), 'Areas called reveal');
      if (role === 'ngozi' || role === 'erik' || role === 'irs') {
        ok(v.hidden && !v.shown && v.areas.length === 0 && v.rel.rows.length === 0, 'screen not hidden');
        ok(gos.includes(role === 'irs' ? 'filing' : 'home'), 'pointer go');
        ok(!calls.some(x => x.startsWith('emit')), 'hidden screen emitted an event');
        for (const w of ['GT-','Blocking','engine','Daniel','Priya','Helen','SchC','F540NR','v3','ev-','D0','D1','D2','D3','D4','D5','D6','D7','Tax effect','ledger','XXX-XX','adjust']) ok(!txt.toLowerCase().includes(w.toLowerCase()), 'leak: ' + w);
        continue;
      }
      ok(JSON.stringify(v.areas.map(a => a.name)) === JSON.stringify(AREA_NAMES), 'area names/order');
      ok(v.areas.every(a => a.tword && a.tcls && a.budget.endsWith(' h budget')), 'status word+colour, budget');
      const all = v.areas.flatMap(a => a.findings);
      const gtText = all.map(f => f.gt).join(' ');
      LEDGER27.forEach(g => ok(new RegExp('GT-(?:[A-D]\\d\\d/)?' + g + '\\b|GT-' + g + '/').test(gtText), 'ledger ' + g + ' not shown'));
      ok(all.length === 27, 'finding rows ' + all.length + ' (27 distinct entries; A06=C03 and B05=C09 each one row)');
      Object.entries(PRIORITY).forEach(([g, id]) => { const f = all.find(x => x.gt === g); ok(f && f.isClaim && ids.includes(id), g + ' not clickable to ' + id); });
      NEW.forEach(id => ok(ids.includes(id), 'new claim not reachable: ' + id));
      ok(ids.length === 24, 'claims reachable ' + ids.length + ' (13 existing incl. ca-wages and salt-d02 + 11 from AREAS-CLAIMS)');
      ok(!/ledger/i.test(txt), 'the word ledger on screen');
      ok(!/Recorded this session|Carries to 2026|frozen/i.test(txt), 'old terminology');
      const fA02 = all.find(f => f.gt === 'GT-A02'), fD02 = all.find(f => f.gt === 'GT-D02');
      ok(fA02 && fA02.isClaim && ids.includes('ca-wages'), 'GT-A02 not clickable to ca-wages');
      ok(fD02 && fD02.isClaim && ids.includes('salt-d02'), 'GT-D02 not clickable to salt-d02');
      ok(v.legend.every(g => g.def), 'legend hover definitions');
      ok(v.rel.rows.length === 5 && v.rel.rows[0].agree.includes('someone can claim you as a dependent') && v.rel.rows[0].agree.includes('Form 8812 line 6'), 'related returns: Ada must agree with Form 8812');
      ok(v.rel.rows.every(x => x.word && x.cls), 'related returns status word+colour');
      ok(ids.includes('or-credit') && v.rel.rows[2].hasLink, 'related returns: Oregon composite links Schedule S');
      ok(!calls.some(x => x.startsWith('emit')) || ['priya','marcus','daniel'].includes(role), 'read-only role emitted an event');
      ok(txt.includes(NONCASH), 'noncash wording');
      ok(txt.includes(AUTH), 'heat-pump authority wording');
      ok(!/partner sign-off would apply/.test(all.find(f => f.gt === 'GT-D03').effect), 'noncash marked partner');
      if (working) {
        ok(!/his card|D71|msg-07|30 Jun 2026|13 Jul 2026|14 Jul 2026|3 Aug 2026/.test(txt), 'working role sees a post-asOf event');
        ok(txt.includes('Theo’s SSN differs from his 2024 return'), 'theo wording working');
      }
      if (filed) {
        ok(txt.includes('differed from his 2024 return and his card'), 'theo wording filed');
        const b = v.areas.find(a => a.key === 'business').summary.find(s => s.key === 'SchC.1');
        ok(b.cy === '$151,300' && b.ex, 'filed SchC.1');
        ok(v.areas.every(a => a.findings.every(f => f.tex)), 'filed statuses tagged Example');
        const allF = v.areas.flatMap(a => a.findings);
        ok(allF.filter(f => f.tword === 'Resolved before filing').length === 19 && allF.filter(f => f.tword === 'Adjusted before filing').length === 8, 'filed: 19 resolved, 8 adjusted');
        ok(!/Not adjusted before filing|Open after filing/.test(txt), 'filed: old unresolved wording');
        const RES = { 'GT-A06/C03':'$0', 'GT-A08':'Bright Oak Kids Club', 'GT-B02':'$1,871', 'GT-C02':'8,100 miles', 'GT-C04':'$2,172', 'GT-D01':'$19,697', 'GT-D04':'$635', 'GT-D05':'About $27' };
        Object.entries(RES).forEach(([g, val]) => { const f = allF.find(x => x.gt === g); ok(f && f.value === val, 'filed corrected value ' + g + ' ' + (f && f.value)); });
        ok(v.areas.every(a => a.tword === 'Filed'), 'filed area status');
        if (role === 'next') ok(v.areas.find(a => a.key === 'intake').carry.includes('Form 3520'), 'next carries the 3520 question');
        ok(!v.areas.some(a => a.hasAct || a.findings.some(f => f.hasAct)), 'filed role has an action');
      }
      if (role === 'next') ok(v.areas.find(a => a.key === 'wages').hasCarry, 'next carry-forward');
      if (role === 'jo' || role === 'sam') ok(!v.areas.some(a => a.hasAct || a.findings.some(f => f.hasAct)), 'read-only role has an action');
      if (role === 'helen') { const p = v.areas.find(a => a.key === 'partner'); ok(p.hasAct && p.actDis && p.actLabel === BLOCKED, 'helen blocked label'); }
      if (role === 'daniel') {
        const c2 = new Component(props); let w = c2.renderVals();
        const ded = w.areas.find(a => a.key === 'deduct');
        ok(ded.hasAct && ded.actDis && ded.actReason.includes('A person may not review or sign off on work they prepared.'), 'daniel self-review on deductions');
        const pass = w.areas.find(a => a.key === 'pass');
        ok(pass.hasAct && !pass.actDis, 'daniel can review pass-throughs');
        pass.act(); w = c2.renderVals();
        ok(w.areas.find(a => a.key === 'pass').tword === 'Reviewed', 'pass-throughs reviewed after click');
        ok(w.areas.find(a => a.key === 'business').actDis, 'business review should wait on failing checks');
        log('          daniel marks Pass-throughs reviewed -> "' + w.areas.find(a => a.key === 'pass').tword + '"; Deductions disabled: self-review');
      }
      if (role === 'priya' || role === 'marcus') {
        const c3 = new Component(props); let w = c3.renderVals();
        const f = w.areas.find(a => a.key === 'business').findings.find(x => x.gt === 'GT-A06/C03');
        ok(f.hasAct && !f.actDis, 'propose on SEHI');
        f.act(); w = c3.renderVals();
        const f2 = w.areas.find(a => a.key === 'business').findings.find(x => x.gt === 'GT-A06/C03');
        ok(f2.actDis && f2.actLabel === 'Proposal recorded' && f2.hasUndo, 'proposal recorded');   // H3: label was "Recorded this session"; actions now emit events
      }
      if (role === 'marcus') ok(/no sensitive-data clearance/.test(txt), 'marcus clearance note');
      if (role === 'priya') ok(v.areas.some(a => a.findings.some(f => f.on === 'on')), 'selected claim highlighted');
    }
  }

  // ---- Round H3: static text in the markup (terminology), then the story clock, events and related returns.
  const staticText = markup.replace(/\{\{[^}]*\}\}/g, ' ').replace(/<[^>]+>/g, ' ');
  if (/ledger/i.test(staticText)) bad('the word ledger in the markup');
  if (/Carries to 2026|Recorded this session|frozen/i.test(staticText)) bad('old terminology in the markup');
  if (!/As filed, locked/.test(staticText)) bad('"As filed, locked" missing from the markup');
  if (!markup.includes('title="{{g.def}}"')) bad('legend hover definitions not wired');
  const mk = (role, extra) => { const calls = []; const ems = [];
    const props = Object.assign({ role, openClaim: (id) => calls.push(id), go: () => {}, emit: (e) => ems.push(e), events: [], asOf: '2026-06-23T06:05', storyAt: '2026-06-23T06:05' }, extra || {});
    const c = new Component(props); return { c, v: c.renderVals(), calls, ems }; };
  const sehiOf = (v) => v.areas.find(a => a.key === 'business').findings.find(x => x.gt === 'GT-A06/C03');
  try {
    // 1. A proposal emits one event; the event carries claim, type and the over-1,000 flag; Undo emits a retraction of its seq.
    let t = mk('priya');
    sehiOf(t.v).act();
    if (!(t.ems.length === 1 && t.ems[0].type === 'proposal' && t.ems[0].claimId === 'sehi' && t.ems[0].overThreshold === true && t.ems[0].who === 'Priya Raman')) bad('H3 proposal did not emit {type:proposal, claimId:sehi, overThreshold}: ' + JSON.stringify(t.ems));
    const seeded = [{ seq: 41, at: '2026-06-23T06:05', who: 'Marcus Bell', type: 'proposal', claimId: 'sehi', findingId: 'GT-A06/C03', text: 'x' }];
    t = mk('priya', { events: seeded });
    let f = sehiOf(t.v);
    if (!(f.actDis && f.hasUndo && f.recNote.includes('Marcus Bell'))) bad('H3 a proposal in events is not shown as recorded by its author');
    f.undo();
    if (!(t.ems.length === 1 && t.ems[0].type === 'undo' && t.ems[0].retracts === 41)) bad('H3 undo did not emit retracts: 41: ' + JSON.stringify(t.ems));
    t = mk('priya', { events: seeded.concat([{ seq: 42, type: 'undo', retracts: 41, who: 'Priya Raman' }]) });
    if (sehiOf(t.v).actDis) bad('H3 a retracted proposal still shows as recorded');
    // 2. Daniel's area review emits and is read back from events.
    t = mk('daniel');
    t.v.areas.find(a => a.key === 'pass').act();
    if (!(t.ems.length === 1 && t.ems[0].type === 'area-reviewed' && t.ems[0].area === 'pass')) bad('H3 area review did not emit');
    t = mk('daniel', { events: [{ seq: 50, type: 'area-reviewed', area: 'pass', who: 'Daniel Ortiz' }] });
    if (t.v.areas.find(a => a.key === 'pass').tword !== 'Reviewed') bad('H3 area review in events not shown');
    // 3. One story clock: a working role after acceptance (tl-23) sees the filed record, locked, with no action.
    for (const r of ['daniel', 'priya', 'helen']) {
      t = mk(r, { asOf: '2026-08-01T12:00', storyAt: '2026-08-01T12:00' });
      const anyAct = t.v.areas.some(a => a.hasAct || a.findings.some(x => x.hasAct));
      if (!(t.v.filed && t.v.locked && !anyAct && t.v.areas.every(a => a.tword === 'Filed'))) bad('H3 ' + r + ' at a clock after acceptance is not "As filed, locked"');
    }
    t = mk('daniel', { asOf: '2026-07-14T16:21' });
    if (t.v.filed || t.v.locked) bad('H3 locked one minute before acceptance');
    // 4. Related returns measured on the clock: at 5 Mar 2026 the Ridgeline K-1 and the 2023 Woodworks K-1 have not arrived.
    t = mk('priya', { asOf: '2026-03-05T00:00' });
    const rr = t.v.rel.rows;
    if (!(rr[3].got === 'Not received yet' && rr[4].word === 'Waiting for the K-1' && /D39/.test(rr[1].got) && !/D40/.test(rr[1].got))) bad('H3 related returns not gated on the story clock');
    if (!t.v.hasEarly) bad('H3 no notice when the clock is before v3');
    t = mk('priya');
    if (t.v.hasEarly || t.v.rel.rows.some(x => /Not received yet/.test(x.got))) bad('H3 at v3 something reads not received / early');
    // 5. Erik is treated exactly like Ngozi.
    const e1 = mk('erik').v, n1 = mk('ngozi').v;
    if (!(e1.hidden && e1.hiddenText === n1.hiddenText)) bad('H3 erik differs from ngozi');
  } catch (e) { bad('H3 block threw: ' + e.message); }
  return fail;
}

const html = fs.readFileSync(path.join(dir, FILE), 'utf8');
console.log('=== ' + FILE);
const fail = runAll(html, false);

// Mutations: each must produce failures, or the harness proves nothing.
const muts = [
  ['drop a field the template reads (f.tex)', html.replace('tword, tcls, tex,\n        hasAct', 'tword, tcls,\n        hasAct')],
  ['leak internal text to the client', html.replace("'This page is for your tax team.", "'GT-A05 Blocking. This page is for your tax team.")],
  ['change the noncash wording', html.replace('Under 1,000, so reviewer sign-off is enough.\' },', 'Under 1,000.\' },')],
  ['revert filed findings to unresolved', html.replace("tword = 'Resolved before filing';", "tword = 'Not adjusted before filing';")],
  ['show Theo’s card to a working role', html.replace("const cardIn = asOf >= '2026-07-13T19:02';", "const cardIn = true;")],
  // H3 mutations, one per new assertion group
  ['bring back "Ledger findings"', html.replace('Findings in this area</h3>', 'Ledger findings in this area</h3>')],
  ['unlink GT-A02 from ca-wages', html.replace("claim:'ca-wages', st:'chk'", "claim:'', st:'chk'")],
  ['unlink GT-D02 from salt-d02', html.replace("claim:'salt-d02', st:'chk'", "claim:'', st:'chk'")],
  ['a proposal stops emitting', html.replace("emit({ type: 'proposal'", "(() => {})({ type: 'proposal'")],
  ['undo forgets the seq', html.replace('retracts: ev ? ev.seq : null', 'retracts: null')],
  ['retractions ignored', html.replace('if (e && e.retracts != null) retracted[e.retracts] = true;', '')],
  ['events not read back', html.replace("(k in done) ? { on: !!done[k], ev: done[k] ? evProposal(k) : null } : { on: !!evProposal(k), ev: evProposal(k) }", "{ on: !!done[k], ev: null }")],
  ['locked by role only, not by the clock', html.replace("|| asOf >= ACCEPTED;", ";")],
  ['related returns ignore the clock', html.replace('const got = (at) => asOf >= at;', 'const got = (at) => true;')],
  ['Ada row loses the Form 8812 agreement', html.replace('on Form 8812 line 6 (1 × 500)', 'on the return')],
  ['erik not hidden', html.replace("const isClient = role === 'ngozi' || role === 'erik';", "const isClient = role === 'ngozi';")],
  ['legend loses its definitions', html.replace(' title="{{g.def}}"', '')]
];
let mutOk = 0;
for (const [name, m] of muts) {
  if (m === html) { console.log('  MUTATION NOT APPLIED: ' + name); continue; }
  const n = runAll(m, true);
  console.log('  mutation "' + name + '" -> ' + n + ' failures' + (n > 0 ? ' (caught)' : ' (NOT CAUGHT)'));
  if (n > 0) mutOk++;
}
const total = fail + (muts.length - mutOk);
console.log('\nfailures: ' + fail + ' · mutations caught: ' + mutOk + ' of ' + muts.length);
process.exit(total ? 1 : 0);
