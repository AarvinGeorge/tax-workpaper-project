// Harness for author H: Home, ReturnMap, Documents.
// For each file: extract the Component class, stub DCLogic, call renderVals() for all 9 roles with no-op props,
// resolve every {{hole}} in the markup (inside sc-for scopes, hidden branches included), call every handler and
// re-render, and fail on any thrown error or undefined hole. Also runs static checks (em dash, expression holes).
const fs = require('fs');
const path = require('path');
const dir = process.env.H_DIR || path.join(__dirname, 'project');
const files = ['Home.dc.html', 'ReturnMap.dc.html', 'Documents.dc.html'];
const roles = ['priya','marcus','daniel','helen','sam','jo','ngozi','erik','next','irs'];
let fail = 0;
const bad = (m) => { fail++; console.log('  FAIL', m); };

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
  if (depth > 5 || o == null) return acc;
  if (typeof o === 'function') { acc.push(o); return acc; }
  if (Array.isArray(o)) o.forEach(x => funcs(x, acc, depth + 1));
  else if (typeof o === 'object') Object.values(o).forEach(x => funcs(x, acc, depth + 1));
  return acc;
}

for (const f of files) {
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log('\n=== ' + f);
  const markup = html.split('<x-dc>')[1].split('</x-dc>')[0];
  const body = html.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  fs.writeFileSync(path.join(__dirname, 'probes', f + '.class.js'), body);
  // static checks
  if (/—/.test(html)) bad('em dash in file');
  if (!html.includes('<script src="./support.js"></script>')) bad('support.js line missing');
  if (!/<div class="\{\{wpClass\}\}">/.test(markup)) bad('root is not <div class="{{wpClass}}">');
  const prefix = { 'Home.dc.html': 'home-', 'ReturnMap.dc.html': 'map-', 'Documents.dc.html': 'doc-' }[f];
  const css = html.split('<style>')[1].split('</style>')[0];
  const classes = [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]).filter(c => !['wp','dark','on','primary','off','pressed'].includes(c));
  const unpref = [...new Set(classes.filter(c => !c.startsWith(prefix)))];
  if (unpref.length) bad('unprefixed CSS classes: ' + unpref.join(','));
  if (/<[a-z]+[^>]*\s(onclick|onchange)=/.test(markup)) bad('lowercase event attribute');
  let tree;
  try { tree = parse(markup); } catch (e) { bad('parse: ' + e.message); continue; }
  let Component;
  try { Component = new Function('DCLogic', body + ';return Component;')(DCLogic); } catch (e) { bad('class does not load: ' + e.message); continue; }
  for (const role of roles) {
    const calls = [];
    const SHELL_AS_OF = { sam:'2027-01-15T15:00', next:'2027-01-15T15:00', irs:'2028-01-26T15:00' };
    const props = { asOf: process.env.H_NO_ASOF ? undefined : (SHELL_AS_OF[role] || '2026-06-23T06:05'), role, dark: role === 'jo', claimId: role === 'priya' ? 'atlas' : '', revealed: [], revealLog: [{ who:'Priya Raman', what:'ssn-theo', when:'09:41', example:false }],
      openClaim: (id) => calls.push('openClaim:' + id), go: (s) => calls.push('go:' + s), reveal: () => {}, emit: (e) => calls.push('emit:' + (e && e.type)) };
    let c, v, out = [];
    try { c = new Component(props); v = c.renderVals(); } catch (e) { bad(role + ' renderVals threw: ' + e.message); continue; }
    out.count = 0; check(tree.root, v, role, out);
    const n0 = out.count;
    // call every handler, re-render after each, check again
    const fs0 = funcs(v, [], 0); let thrown = 0;
    for (const fn of fs0) { try { fn({ target: { value: 'x' }, preventDefault() {}, stopPropagation() {} }); const w = c.renderVals(); const o2 = []; o2.count = 0; check(tree.root, w, role + ' after handler', o2); o2.forEach(x => out.push(x)); } catch (e) { thrown++; bad(role + ' handler threw: ' + e.message); } }
    out.forEach(x => bad(x));
    const ids = [...new Set(calls.filter(x => x.startsWith('openClaim')).map(x => x.slice(10)))];
    const gos = [...new Set(calls.filter(x => x.startsWith('go:')).map(x => x.slice(3)))];
    console.log('  ' + role.padEnd(7) + ' holes resolved ' + String(n0).padStart(4) + ' · handlers ' + String(fs0.length).padStart(3) + ' · openClaim ' + (ids.join(',') || '-') + ' · go ' + (gos.join(',') || '-'));
    // role-specific assertions
    const txt = JSON.stringify(v);
    const ok = (cond, m) => { if (!cond) bad(role + ': ' + m); };
    const allowed = ['ca-est','atlas','rsu','theo-ssn','heat-pump','ext-pay','fed-est','repairs','care-ein','iso-lot','noncash','ca-wages','salt-d02','crypto-c6','gift-brigid','sehi','form-3520'];
    const working = ['priya','marcus','daniel','helen','jo','ngozi','erik'].includes(role);
    const client = role === 'ngozi' || role === 'erik';
    const secBy = (w, l) => (w.sections || []).find(x => x.label === l);
    ids.forEach(id => ok(allowed.includes(id), 'unknown claimId ' + id));
    if (f === 'Home.dc.html') {
      if (role === 'helen') ok(v.approveLabel === 'Approve and send to client: blocked by \u201cCalifornia estimates include a 2024 payment\u201d, and 3 more' && v.approveReason.includes('3 review notes open'), 'helen approve label');
      if (working) { ok(!/his card|D71|13 Jul|10 Jul|8879 signed/i.test(JSON.stringify(v.sections) + JSON.stringify(v.steps)), 'working role sees post-asOf event'); }
      if (['priya','marcus'].includes(role)) ok(ids.includes('noncash'), 'noncash in fix list');
      if (role === 'sam') ok(secBy(v, 'Selected for quality review, 4 Jan 2027: 8 firm adjustments').rows.find(r => r.title.startsWith('Heat pump')).line.includes('Authority to confirm: Treas. Reg. 1.263(a)-3 (Example)'), 'heat-pump authority wording');
      if (role === 'sam') { const rows = secBy(v, 'Selected for quality review, 4 Jan 2027: 8 firm adjustments').rows; ok(rows.length === 8 && rows.every(r => r.tword === 'Signed' && r.ex), 'sam 8 Signed (Example)'); ok(v.steps[0].tword === 'Not done', 'sam step 1 matches row'); }
      if (client) ok(!/v3/i.test(v.asOfLabel), 'client label has v3');
      if (role === 'daniel') { const ext = secBy(v, 'Needs review').rows.find(r => r.hasSign); ok(ext && ext.signReason === 'A person may not review or sign off on work they prepared.' && ext.value === '$36,000', 'daniel ext-pay sign-off disabled'); }
      if (['priya','marcus','daniel','helen','jo'].includes(role)) ok(v.stepsText === '0 of 12 steps done', 'steps text ' + v.stepsText);
      if (['sam','next'].includes(role)) ok(v.stepsText === '1 of 12 steps with evidence in the file', 'filed steps');
      if (client) { ok(v.isClient && !v.showSteps, 'client steps'); for (const w of ['Helen','Daniel','Priya','Marcus','D68','D71','D06','SchC','F540NR','ev-','msg-','Tax effect','Blocking','engine','v3']) ok(!JSON.stringify(v.sections).toLowerCase().includes(w.toLowerCase()), 'client sees ' + w); }
      if (role === 'irs') ok(v.sections.length === 0 && v.showPointer && gos.includes('filing'), 'examiner pointer to filing');
      if (role === 'marcus') ok(v.showMaskNote, 'marcus mask note');
      if (role === 'next') ok(ids.includes('iso-lot'), 'next sees iso-lot');
    }
    if (f === 'ReturnMap.dc.html') {
      if (client || role === 'irs') ok(v.hidden && !v.shown, 'map hidden for ' + role);
      else { ok(v.shown && v.forms.length === 11, 'map forms'); ok(v.forms.every(x => x.tword && x.tcls), 'status word+colour'); }
      if (role === 'daniel') ok(ids.length === 11, 'all 11 claims reachable from the map, got ' + ids.length);
      if (!(client || role === 'irs')) { const L = v.forms.flatMap(x => x.lines); const ln = k => L.find(x => x.key === k); ok(ln('F8812.4').value === '1', 'F8812.4 not money: ' + ln('F8812.4').value); ok(ln('F8949').value === '295' && !txt.includes('302'), 'sale lines 295'); ok(ln('SchA.12').isClaim, 'SchA.12 links noncash'); if (role === 'sam' || role === 'next') { ok(ln('SchA.12').value === '$17,400', 'filed SchA.12'); ok(ln('F1040.37').note.includes('not recomputed'), 'total tagged'); } if (working) ok(!/his card/.test(txt), 'map: card before asOf'); }
    }
    if (f === 'Documents.dc.html') {
      if (client) { ok(v.isClient && !v.isStaff, 'client view'); for (const w of ['Needs a person','From the packet','Daniel','Priya']) ok(!JSON.stringify(v.clientDocs).includes(w), 'client sees ' + w); ok(!JSON.stringify(v.clientDocs).match(/D\d\d/), 'client sees a doc id'); }
      if (role === 'irs') { const exIds = v.examGroups.flatMap(g => g.rows.map(r => r.id)); ok(JSON.stringify(exIds) === JSON.stringify(['D72','D65','D66','D14','D15','D16','D17','D18','D19','D20','D21']), 'examiner docs ' + exIds); ok(!txt.includes('XXX-XX'), 'examiner sees SSN'); }
      if (role === 'daniel') { const c2 = new Component(props); const w = c2.renderVals(); ok(w.gate.withReason === '66' && w.gate.total === '72' && w.gate.person === '5' && w.gate.suggest === '1' && w.sign.ad === 'true' && w.sign.tword === 'Not signed', 'daniel gate 66 of 72, 5/1, sign-off disabled, not signed: ' + JSON.stringify(w.gate)); }
      if (working && !client) { const rowIds = v.groups.flatMap(g => g.rows.map(r => r.id)); ok(!rowIds.includes('D71') && !rowIds.includes('D72') && !v.showLate && !v.gate.hasPost, 'working role sees D71/D72 or late panel'); ok(!rowIds.some(id => id === 'D69' && v.groups.flatMap(g => g.rows).find(r => r.id === 'D69').hasFlag), 'D69 flagged as client late'); ok(v.filters[0].count === '31 of 72 shown', 'chip ' + v.filters[0].count); }
      if (role === 'sam' || role === 'next') { const rowIds = v.groups.flatMap(g => g.rows.map(r => r.id)); ok(rowIds.includes('D71') && !rowIds.includes('D72'), 'filed roles: D71 yes, D72 no'); }
      if (working) ok(!v.showLate && v.late.text === '', 'late panel on the markup path for a working role');
      if (role === 'sam' || role === 'next') ok(v.showLate && v.late.text.includes('signed the list again') && v.late.ex, 'filed roles see the closed late-arrival history');
      if (role === 'ngozi') ok(v.clientTotal === '69' && v.clientLate === '7' && v.clientDocs[0].rec === '22 Jun 2026' && v.clientDocs.length === 8, 'client recent list ' + v.clientTotal + '/' + v.clientLate + '/' + v.clientDocs[0].rec);
      if (role === 'priya') {
        // Priya sets all six reasons and confirms the suggestion: the step closes.
        const c3 = new Component(props); let w = c3.renderVals();
        for (const g of w.groups) for (const r of g.rows) { if (r.canConfirm) r.confirm(); }
        w = c3.renderVals();
        for (const g of w.groups) for (const r of g.rows) { if (r.tword === 'Needs a person') { r.togglePick(); const w2 = c3.renderVals(); const rr = w2.groups.flatMap(x => x.rows).find(x => x.id === r.id); rr.types[0].pick(); } }
        w = c3.renderVals();
        ok(w.gate.withReason === '72' && w.gate.person === '0' && w.gate.suggest === '0' && w.gate.tword === 'Done, waiting for reviewer', 'priya closes the step: ' + JSON.stringify(w.gate));
        console.log('          priya sets 5 reasons + confirms D10 -> gate ' + w.gate.withReason + ' of ' + w.gate.total + ', "' + w.gate.tword + '"');
      }
      if (['priya','marcus','daniel','helen','jo','sam','next'].includes(role)) ok(v.groups.reduce((a, g) => a + g.rows.length, 0) === (working ? 31 : 32) && v.pages.length === 4, 'rows 31 working / 32 filed, pages 4');
    }
  }
}

// ---------- Round H3: story clock, events, swings, compare, attach, Erik, terminology ----------
console.log('\n=== H3 feature assertions');
const load = (f) => { const html = fs.readFileSync(path.join(dir, f), 'utf8'); const body = html.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0]; return { html, markup: html.split('<x-dc>')[1].split('</x-dc>')[0], C: new Function('DCLogic', body + ';return Component;')(DCLogic) }; };
const H = load('Home.dc.html'), M = load('ReturnMap.dc.html'), Dd = load('Documents.dc.html');
const T = (c, m) => { if (!c) bad('H3: ' + m); };
const mk = (X, role, extra) => { const c = new X.C(Object.assign({ role, asOf: '2026-06-23T06:05', claimId: '', revealed: [], revealLog: [], openClaim() {}, go() {}, reveal() {} }, extra || {})); return c; };
const rv = (X, role, extra) => mk(X, role, extra).renderVals();
const sec = (v, l) => (v.sections || []).find(x => x.label === l);
const J = (x) => JSON.stringify(x);
// Home: "Since you last looked" from events and lastSeen
const EV = [
  { seq: 1, at: '2026-06-01T10:00', who: 'Priya Raman', type: 'prepared', text: 'Priya prepared Schedule C' },
  { seq: 2, at: '2026-06-02T10:00', who: 'Priya Raman', type: 'prepared', text: 'Priya prepared Schedule E' },
  { seq: 3, at: '2026-06-23T06:06', who: 'Priya Raman', type: 'adjustment', claimId: 'ca-est', text: 'Priya adjusted F540NR.72 to 10,500' },
  { seq: 4, at: '2026-06-23T06:07', who: 'Priya Raman', type: 'signoff_stale', claimId: 'ca-est', text: 'Stale: the value changed after you signed' },
  { seq: 5, at: '2026-06-23T06:08', who: 'Priya Raman', type: 'undo', retracts: 3, text: 'Priya undid the adjustment' },
  { seq: 6, at: '2026-06-23T06:09', who: 'Priya Raman', type: 'adjustment', claimId: 'theo-ssn', text: 'Theo’s SSN corrected from XXX-XX-3309 to XXX-XX-3390' },
  { seq: 7, at: '2026-06-23T06:10', who: '', type: 'client_approved_and_signed_8879', text: 'Signed. Taxpayer PIN 10101; spouse PIN 20202' },
  { seq: 8, at: '2026-06-23T06:11', who: 'Priya Raman', type: 'question_to_client', to: ['ngozi'], claimId: 'ca-est', text: 'Priya asks Ngozi about the 15 Sep payment (D68)', clientText: 'Your tax team has a question for you' }
];
{ const v = rv(H, 'daniel', { events: EV, lastSeen: { daniel: 2 } }); T(v.sinceCount === 5 && sec(v, 'Since you last looked').count === 5, 'since count from events (expect 5: retracted seq 3 hidden): ' + v.sinceCount);
  T(J(sec(v, 'Since you last looked')).includes('Stale: the value changed after you signed') && !J(sec(v, 'Since you last looked')).includes('adjusted F540NR.72 to 10,500'), 'since shows stale, hides retracted');
  T(J(v).includes('3390'), 'daniel sees the identifier last 4 in event text'); }
{ const v = rv(H, 'daniel', { events: EV, lastSeen: { daniel: 8 } }); T(v.sinceCount === 0 && J(sec(v, 'Since you last looked')).includes('Nothing new since you last looked'), 'since count 0 after last seen 8'); }
{ const v = rv(H, 'marcus', { events: EV, lastSeen: {} }); T(!J(sec(v, 'Since you last looked')).includes('3390') && !J(sec(v, 'Since you last looked')).includes('3309'), 'marcus sees identifier digits in event text'); }
for (const r of roles) { const v = rv(H, r, { events: EV, lastSeen: {} }); T(!/PIN[^.;,]{0,12}\d{4,6}/i.test(J(v)) && !/10101|20202/.test(J(v)), 'PIN shown to ' + r); }
{ const n = rv(H, 'ngozi', { events: EV, lastSeen: {} }), e = rv(H, 'erik', { events: EV, lastSeen: {} });
  const sn = J(sec(n, 'Since you last looked')), se = J(sec(e, 'Since you last looked'));
  T(n.sinceCount === 1 && sn.includes('Your tax team has a question for you') && !/Priya|D68|F540NR/.test(sn), 'ngozi sees only her addressed event in plain words: ' + sn.slice(0, 200));
  T(e.sinceCount === 0, 'erik sees ngozi’s question (' + e.sinceCount + ')'); }
{ const v = rv(H, 'irs', { asOf: '2028-01-26T15:00', events: EV, lastSeen: {} }); T(v.sinceCount === 0 && v.sections.length === 0, 'examiner gets live events'); }
{ const v = rv(H, 'daniel'); T(v.sinceCount === 17, 'default seed replays the 17 packet events up to 23 Jun 06:05, got ' + v.sinceCount); }
// Home: deadlines and assignments on the story clock
{ const d = rv(H, 'daniel'), p = rv(H, 'priya'), j = rv(H, 'jo');
  const rowsD = sec(d, 'Your assignments and deadlines').rows, rowsP = sec(p, 'Your assignments and deadlines').rows;
  const rev = rowsD.find(r => r.title === 'Internal: review complete'), hand = rowsP.find(r => r.title === 'Internal: preparer hand-off to review'), ext = rowsD.find(r => r.title.startsWith('Extended due date'));
  T(rev && rev.tword === 'Late' && rev.line.includes('76 days late'), 'review complete 76 days late at 23 Jun: ' + (rev && rev.line));
  T(hand && hand.tword === 'Late' && hand.line.includes('88 days late'), 'hand-off 88 days late: ' + (hand && hand.line));
  T(ext && ext.tword === 'Due' && ext.line.includes('114 days away'), 'extended due 114 days away: ' + (ext && ext.line));
  T(rowsD.some(r => r.title === 'Reviewer of the 2025 return') && rowsP.some(r => r.title === 'Preparer of the 2025 return'), 'assignment at start');
  T(sec(j, 'Deadlines').rows.length === 6, 'jo sees all 6 firm deadlines');
  const a = rv(H, 'daniel', { events: [{ seq: 1, at: '2026-06-23T06:05', type: 'assignment', assignee: 'daniel', who: 'Helen Strand', claimId: 'rsu', text: 'Helen assigned the RSU basis to you' }] });
  T(J(sec(a, 'Your assignments and deadlines')).includes('Helen assigned the RSU basis to you'), 'assignment event lands in the assignee’s queue');
  const early = sec(rv(H, 'daniel', { asOf: '2026-04-01T09:00' }), 'Your assignments and deadlines').rows.find(r => r.title === 'Internal: review complete');
  T(early && early.tword === 'Due' && early.line.includes('7 days away'), 'review complete due in 7 days on 1 Apr: ' + (early && early.line)); }
// Home: working roles at a later clock see the filed record read only; self-review rule still holds at 23 Jun
{ const v = rv(H, 'priya', { asOf: '2027-01-15T15:00' }); T(v.heading === 'As filed, locked' && sec(v, 'Filed with 8 firm adjustments').rows.length === 8, 'priya at a filed clock sees As filed, locked'); }
{ const v = rv(H, 'daniel'); const ext = sec(v, 'Needs review').rows.find(r => r.hasSign); T(ext && ext.signReason === 'A person may not review or sign off on work they prepared.', 'ext-pay self-review rule'); }
// Home: Erik is a client like Ngozi, questions per spouse, each signs
{ const n = rv(H, 'ngozi'), e = rv(H, 'erik');
  const qids = (role, t) => { const ids = []; const c = mk(H, role, { asOf: t || '2026-06-23T06:05', openClaim: (id) => ids.push(id) }); const w = c.renderVals(); sec(w, 'Questions for you').rows.forEach(r => r.open()); return { ids, rows: sec(w, 'Questions for you').rows }; };
  const qn = qids('ngozi'), qe = qids('erik');
  T(J(qn.ids) === J(['theo-ssn','fed-est','gift-brigid','ca-est']), 'ngozi questions follow the spouse table: ' + qn.ids);
  T(J(qe.ids) === J(['atlas','sehi','form-3520','crypto-c6','noncash','ca-est']), 'erik questions follow the spouse table: ' + qe.ids);
  T(!!sec(n, 'Documents to upload') && !sec(e, 'Documents to upload'), 'heat-pump permit is Ngozi’s');
  T(qids('erik', '2026-07-01T09:00').rows.find(r => r.title.startsWith('Your bitcoin')).tword === 'Answered' && qids('ngozi', '2026-07-01T09:00').rows.find(r => r.title.startsWith('Your gift')).tword === 'Question', 'answers mark per spouse on the clock');
  T(!!sec(e, 'Sign Form 8879 (e-file signature authorization)') && J(sec(e, 'Sign Form 8879 (e-file signature authorization)')).includes('each sign Form 8879'), 'erik signs separately');
  const rj = rv(H, 'erik', { asOf: '2026-07-13T18:00' }); T(J(rj.sections).includes('The IRS returned your return; we need Theo’s Social Security card'), 'rejection in plain words for erik'); }
// Home: blocker list follows Checks: crypto-c6 after msg-07 (30 Jun 18:02), gift-brigid after msg-08 (1 Jul 16:40)
{ const lab = (t) => rv(H, 'helen', { asOf: t }).approveLabel;
  T(lab('2026-06-30T18:01').endsWith('and 3 more') && lab('2026-06-30T18:02').endsWith('and 4 more') && lab('2026-07-01T16:40').endsWith('and 5 more'), 'helen blocker count on the clock: ' + [lab('2026-06-30T18:01'), lab('2026-07-01T16:40')]);
  const ids = []; const c = mk(H, 'priya', { asOf: '2026-07-02T09:00', openClaim: (id) => ids.push(id) }); const w = c.renderVals(); sec(w, 'To fix, blockers first').rows.slice(0, 6).forEach(r => r.open());
  T(J(ids) === J(['ca-est','atlas','rsu','theo-ssn','crypto-c6','gift-brigid']) && sec(w, 'To fix, blockers first').rows.slice(0, 6).every(r => r.tword === 'Blocking'), 'answered-after-computation items are blockers: ' + ids); }
// ReturnMap: swing flags (firm variance rule) and compare versions
{ const v = rv(M, 'daniel'); const Ls = v.forms.flatMap(f => f.lines); const ln = (k, i) => Ls.filter(x => x.key === k)[i || 0];
  T(ln('F1040.1a').swWord === 'Swing' && ln('F1040.1a').swText.includes('+56,361 (+36%)'), 'wages swing: ' + ln('F1040.1a').swText);
  T(ln('SchE.3A').swWord === 'Within the rule', 'rents within the rule');
  T(ln('SchA.12').swWord === 'New this year' && ln('F1040.37').swWord === 'New this year', 'new this year');
  T(ln('F540NR.72').swWord === 'Swing' && ln('F540NR.17').swWord === 'Not compared', 'CA swing / no like-for-like');
  const n = Ls.filter(x => x.swWord === 'Swing').length; T(n === 16 && v.swingSummary.startsWith('16 lines swing'), 'swing count 16, got ' + n);
  const c = mk(M, 'daniel'); let w = c.renderVals(); T(!w.cmpShown, 'compare closed by default'); w.toggleCmp(); w = c.renderVals(); T(w.cmpShown && w.cmpRows.length === 8, 'compare shows Form 1040');
  const r33 = w.cmpRows.find(r => r.key === 'F1040.33'); T(r33.cells[2].changed && !r33.cells[1].changed && r33.cells[4].text === 'Not filed yet', 'F1040.33 changed in v3 only, not filed yet');
  // every numeric line: "Changed" agrees with the values themselves, on every form
  for (const cf of w.cmpForms) { cf.pick(); const x = c.renderVals(); for (const r of x.cmpRows) { const t = r.cells.map(q => q.text); if (r.cells[1].changed !== (t[0] !== t[1]) || r.cells[2].changed !== (t[1] !== t[2])) bad('H3: compare "Changed" disagrees with values on ' + r.key + ' ' + J(t)); } }
  const mid = mk(M, 'daniel', { asOf: '2026-03-10T09:00' }); mid.setState({ cmp: true }); const wm = mid.renderVals();
  T(wm.cmpRows[0].cells[1].text === 'Not computed yet' && wm.versionNote.includes('v1') && !wm.forms.some(f => f.lines.some(l => l.isClaim)), 'story time between v1 and v2');
  T(rv(M, 'daniel', { asOf: '2026-03-01T09:00' }).noVersion, 'no version before v1');
  const sc = mk(M, 'sam', { asOf: '2027-01-15T15:00' }); sc.setState({ cmp: true }); const ws = sc.renderVals(); T(ws.cmpRows.find(r => r.key === 'F1040.26').cells[4].text === '$12,000', 'as filed column for a filed clock');
  T(rv(M, 'priya', { asOf: '2027-01-15T15:00' }).filed, 'filed derives from the story clock, not the role'); }
// Documents: attach (staff, both clients), emits, read back from events
{ const got = []; const c = mk(Dd, 'priya', { emit: (e) => got.push(e) }); let w = c.renderVals();
  w.att.toggle(); w = c.renderVals(); w.att.kinds[2].pick(); w = c.renderVals(); w.att.setNote({ target: { value: 'Permit number on the invoice' } }); w = c.renderVals();
  w.att.links.find(l => l.label.startsWith('Heat pump')).pick(); w = c.renderVals(); w.att.submit();
  T(got.length === 1 && got[0].type === 'document_attached' && got[0].claimId === 'heat-pump' && got[0].who === 'priya', 'attach emits document_attached: ' + J(got));
  const w2 = rv(Dd, 'daniel', { events: got.map((e, i) => Object.assign({ seq: i + 1, at: '2026-06-23T06:05' }, e)) }); T(w2.att.hasList && w2.att.count === '1', 'attachment read back from events');
  const alone = mk(Dd, 'priya'); let a = alone.renderVals(); a.att.toggle(); a = alone.renderVals(); a.att.submit(); a = alone.renderVals(); T(a.att.count === '1', 'standalone default emit keeps the attachment'); }
{ const got = []; const c = mk(Dd, 'marcus', { emit: (e) => got.push(e) }); let w = c.renderVals(); w.att.toggle(); w = c.renderVals(); w.att.kinds[2].pick(); w = c.renderVals();
  T(w.att.warn, 'marcus note warning'); w.att.setNote({ target: { value: 'Theo 900-00-3390' } }); w = c.renderVals(); w.att.submit(); w = c.renderVals();
  T(got.length === 0 && /Not attached/.test(w.msg), 'marcus identifier note refused'); }
{ const items = (t) => { const c = mk(Dd, 'priya', { asOf: t }); c.setState({ attOpen: true, attKind: 'packet' }); return c.renderVals().att.items.map(x => x.id).join(','); };
  T(items('2026-06-23T06:05') === 'call-01' && items('2026-07-02T09:00') === 'call-01,msg-07,msg-08', 'packet items appear on the story clock'); }
{ const got = []; const n = rv(Dd, 'ngozi', { emit: (e) => got.push(e) }); T(n.otherSpouse === 'Erik' && n.clientNeeds.length === 1, 'ngozi needs the permit'); n.clientNeeds[0].upload();
  T(got[0] && got[0].type === 'document_attached' && got[0].clientText === 'You sent the heat pump permit' && got[0].to.includes('priya'), 'client upload emits with plain words');
  const e = rv(Dd, 'erik'); T(e.isClient && !e.isStaff && e.otherSpouse === 'Ngozi' && e.clientNeeds.length === 0 && !e.att.can, 'erik is a client');
  const rej = rv(Dd, 'ngozi', { asOf: '2026-07-13T18:00' }); T(rej.clientNeeds.some(x => x.title.startsWith('The IRS returned your return')), 'ngozi asked for the card after the rejection');
  const after = mk(Dd, 'ngozi'); let x = after.renderVals(); x.clientNeeds[0].upload(); x = after.renderVals(); T(x.clientNeeds.length === 0 && x.clientSent.length === 1, 'permit request closes once sent'); }
{ const got = []; const c = mk(Dd, 'daniel', { emit: (e) => got.push(e) }); c.setState({ confirmed: { D10: true }, set: { D13: 'a', D15: 'a', D47: 'a', D54: 'a', D73: 'a' } }); c.renderVals().sign.go(); T(got.length === 1 && got[0].type === 'signoff', 'document list sign-off emits'); }
T(!rv(Dd, 'sam').att.can && rv(Dd, 'priya', { asOf: '2027-01-15T15:00' }).att.sub.includes('filed record') && rv(Dd, 'priya', { asOf: '2027-01-15T15:00' }).gate.tword === 'Done at filing', 'attach after filing / read-only roles');
// Documents: Undo uses the seq that emit returns; a refused emit (0) is reported
{ const evs = []; let next = 40; const emit = (e) => { const ev = Object.assign({ seq: next++, at: '2026-06-23T06:05' }, e); evs.push(ev); return ev.seq; };
  const c = mk(Dd, 'priya', { emit, events: evs }); let w = c.renderVals(); w.att.toggle(); w = c.renderVals(); w.att.submit(); w = c.renderVals();
  T(/event 40/.test(w.msg) && w.att.list[0].canUndo, 'attach reports the returned seq and offers Undo: ' + w.msg);
  w.att.list[0].undo(); const u = evs.find(x => x.type === 'undo'); w = c.renderVals();
  T(u && u.retracts === 40 && !w.att.hasList, 'undo emits retracts: 40 and the attachment leaves the list');
  T(!rv(Dd, 'daniel', { events: evs.slice(0, 1) }).att.list[0].canUndo, 'only the attacher may undo');
  const r = mk(Dd, 'priya', { emit: () => 0 }); let x = r.renderVals(); x.att.toggle(); x = r.renderVals(); x.att.submit(); x = r.renderVals(); T(/refused/.test(x.msg), 'refused attach reported'); }

// ---------- Round H3b (review 7): props from the shell, spouse table, Marcus wording, full timestamps ----------
console.log('\n=== H3b assertions');
{ // M2: blockers come from the shell's prop
  const B = [{ claimId:'atlas', title:'Card sales counted twice in business income' }, { claimId:'rsu', title:'RSU shares sold with a zero cost basis' }, { claimId:'theo-ssn', title:'Theo’s SSN differs from his 2024 return' }];
  const h = rv(H, 'helen', { blockers: B });
  T(h.approveLabel === 'Approve and send to client: blocked by “Card sales counted twice in business income”, and 2 more', 'H3b helen label from blockers prop: ' + h.approveLabel);
  const ids = []; const w = rv(H, 'priya', { blockers: B, openClaim: (id) => ids.push(id) }); sec(w, 'To fix, blockers first').rows.filter(r => r.tword === 'Blocking').forEach(r => r.open());
  T(J(ids) === J(['atlas','rsu','theo-ssn']), 'H3b priya blockers from prop: ' + ids);
  T(J(sec(rv(H, 'helen', { blockers: B }), 'Blockers').rows.map(r => r.title)) === J(B.map(b => b.title)), 'H3b helen blockers section from prop');
  T(rv(H, 'helen', { blockers: [] }).approveLabel === 'Approve and send to client', 'H3b no blockers, plain label'); }
{ // stage from the shell
  T(rv(H, 'priya', { stage: 'Filed' }).heading === 'As filed, locked', 'H3b Home uses stage prop');
  T(rv(M, 'priya', { stage: 'Filed' }).filed, 'H3b ReturnMap uses stage prop');
  T(rv(Dd, 'priya', { stage: 'Filed' }).gate.tword === 'Done at filing', 'H3b Documents uses stage prop'); }
{ // spouse from spouseOf; nothing asked where the drawer needs nothing from the client
  const qs = (role, extra) => { const ids = []; const w = rv(H, role, Object.assign({ openClaim: (id) => ids.push(id) }, extra || {})); const s0 = sec(w, 'Questions for you'); (s0 ? s0.rows : []).forEach(r => r.open()); return ids; };
  T(!qs('ngozi').includes('ca-wages') && !qs('ngozi').includes('salt-d02') && !qs('erik').includes('salt-d02'), 'H3b no question for claims that need nothing from the client');
  const only = (id) => id === 'ca-est' ? 'ngozi' : (id === 'atlas' ? 'ngozi' : 'erik');
  T(qs('ngozi', { spouseOf: only }).includes('atlas') && !qs('erik', { spouseOf: only }).includes('atlas') && !qs('erik', { spouseOf: only }).includes('ca-est'), 'H3b questions follow spouseOf prop'); }
{ // clients after filing never see an open question
  const EVQ = [{ seq: 1, at: '2026-06-23T07:00', who: 'priya', whoName: 'Priya Raman', type: 'question_to_client', to: ['ngozi'], claimId: 'ca-est', text: 'Priya asks about the 15 Sep payment', clientText: 'Needs your answer: your 15 Sep 2025 California payment' }];
  for (const r of ['ngozi','erik']) { const v = rv(H, r, { asOf: '2027-01-15T15:00', events: EVQ, lastSeen: {} }); const t = J(v.sections);
    T(!/Needs your answer/i.test(t) && !(v.sections.flatMap(x => x.rows).some(x => x.tword === 'Question')), 'H3b ' + r + ' after filing sees an open question'); } }
{ // Marcus: no identifier digits, "an identifier was corrected"
  const EVM = [{ seq: 1, at: '2026-06-23T07:00', who: 'priya', whoName: 'Priya Raman', type: 'adjustment', claimId: 'theo-ssn', text: 'Priya: Theo card ends 3390' }, { seq: 2, at: '2026-06-23T07:01', who: 'priya', whoName: 'Priya Raman', type: 'adjustment', claimId: 'theo-ssn', text: 'Theo SSN last 4 changed 3309 to 3390' }];
  const t = J(sec(rv(H, 'marcus', { events: EVM, lastSeen: {} }), 'Since you last looked'));
  T(!/\b\d{3,4}\b/.test(t.replace(/\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}/g, '')) && /an identifier was corrected/.test(t), 'H3b marcus event text: ' + t.slice(0, 260));
  const d = rv(Dd, 'marcus', { events: [{ seq: 3, at: '2026-06-23T07:00', who: 'priya', type: 'document_attached', claimId: 'theo-ssn', text: 'Priya attached a note: card ends 3390' }] });
  T(d.att.list.length === 1 && !/3390/.test(J(d.att.list)), 'H3b marcus attachment text has no identifier digits'); }
{ // M3: who is the role key; whoName is for display
  const EVW = [{ seq: 1, at: '2026-06-23T07:00', who: 'priya', whoName: 'Priya Raman', type: 'prepared', text: 'Marked prepared' }];
  T(J(sec(rv(H, 'daniel', { events: EVW, lastSeen: {} }), 'Since you last looked')).includes('Priya Raman'), 'H3b Home shows whoName');
  const n = rv(Dd, 'ngozi', { events: [{ seq: 2, at: '2026-06-23T07:00', who: 'ngozi', type: 'document_attached', claimId: 'heat-pump', clientText: 'You sent the heat pump permit' }] });
  T(n.clientNeeds.length === 0 && n.clientSent.length === 1, 'H3b client sent list matches role-key who');
  T(rv(Dd, 'priya', { events: [{ seq: 4, at: '2026-06-23T07:00', who: 'priya', whoName: 'Priya Raman', type: 'document_attached', text: 'x' }] }).att.list[0].canUndo, 'H3b undo matches role-key who');
  const got = []; const c = mk(Dd, 'priya', { emit: (e) => { got.push(e); return 9; } }); let w = c.renderVals(); w.att.toggle(); w = c.renderVals(); w.att.submit();
  T(got[0] && got[0].who === 'priya', 'H3b emits who as the role key: ' + (got[0] && got[0].who)); }
{ // M1: full timestamps, never date-only
  const rowIds = (t) => rv(Dd, 'daniel', { asOf: t }).groups.flatMap(g => g.rows.map(r => r.id));
  T(!rowIds('2026-03-27T10:00').includes('D73') && rowIds('2026-03-27T16:30').includes('D73'), 'H3b D73 arrives at 16:30, not at midnight');
  T(rv(Dd, 'ngozi', { asOf: '2026-07-13T18:00' }).clientTotal === '69' && rv(Dd, 'ngozi', { asOf: '2026-06-22T10:00' }).clientTotal === '67', 'H3b client totals on full timestamps: ' + rv(Dd, 'ngozi', { asOf: '2026-07-13T18:00' }).clientTotal + '/' + rv(Dd, 'ngozi', { asOf: '2026-06-22T10:00' }).clientTotal); }
// Terminology (Fable section 5) and the event list replacing session-only messages
for (const X of [H, M, Dd]) for (const r of roles) for (const t of ['2026-06-23T06:05', '2027-01-15T15:00']) {
  const txt = J(rv(X, r, { asOf: t })) + X.markup.replace(/<script[\s\S]*$/, '');
  for (const re of [/ledger/i, /Carry forward/, /\bCarry\b/, /Frozen/, /Approve and e-sign/, /Dismiss with a reason/, /Export response pack/, /Recorded for this session/, /Mock:/]) if (re.test(txt)) { bad('H3: term ' + re + ' on screen for ' + r); break; }
}
console.log('\nfailures: ' + fail);
process.exit(fail ? 1 : 0);
