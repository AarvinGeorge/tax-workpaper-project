// harness-R.js: checks Checks.dc.html and Review.dc.html outside the canvas.
// For each file: extract the Component class, node --check it, stub DCLogic, call renderVals() for all 9 roles
// (plus a variant with a claim selected, Theo's SSN revealed and dark on), check every {{hole}} in the template
// resolves (hidden branches included), call every handler returned and re-render, and scan the visible text of the
// client and examiner views for internal text. Exit code 1 on any problem.
// H3: 10 roles (erik added), the story clock, the shared event list (events / emit / lastSeen), and feature assertions
// (new rows, computed blockers, assign, grouped bulk, undo, since-you-last-looked, stale sign-offs, edit refused, per-recipient
// wording, renames), each proven able to fail by a source mutation.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const DIR = process.env.R_DIR || path.join(__dirname, 'project');
const FILES = ['Checks.dc.html', 'Review.dc.html'];
const ROLES = ['priya','marcus','daniel','helen','sam','jo','ngozi','erik','next','irs'];
let problems = 0;
const actionsReport = {};
const fail = (m) => { problems++; console.log('  FAIL ' + m); };

class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p) { const u = typeof p === 'function' ? p(this.state, this.props) : p; this.state = Object.assign({}, this.state, u); }
  forceUpdate() {}
}

function resolve(p, scope) {
  p = p.trim();
  if (p === 'true') return true; if (p === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  let v = scope;
  for (const k of p.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}
function holes(text, scope, errs, ctx) {
  for (const m of text.matchAll(/\{\{([^}]*)\}\}/g)) {
    const p = m[1].trim();
    if (!/^[\w$.]+$/.test(p)) errs.push(ctx + ': expression hole {{' + p + '}}');
    else if (resolve(p, scope) === undefined) errs.push(ctx + ': undefined hole {{' + p + '}}');
  }
}
// Find the next control tag (sc-for or sc-if) and its matching close.
function nextBlock(tpl, from) {
  const re = /<(sc-for|sc-if)\b/g; re.lastIndex = from;
  const m = re.exec(tpl); if (!m) return null;
  const name = m[1], open = m.index, tagEnd = tpl.indexOf('>', open);
  let depth = 1, j = tagEnd + 1;
  const oTok = '<' + name, cTok = '</' + name + '>';
  while (depth > 0) {
    const no = tpl.indexOf(oTok, j), nc = tpl.indexOf(cTok, j);
    if (nc < 0) throw new Error('unclosed <' + name + '> at ' + open);
    if (no >= 0 && no < nc) { depth++; j = no + oTok.length; } else { depth--; j = nc + cTok.length; }
  }
  return { name, open, tag: tpl.slice(open, tagEnd + 1), body: tpl.slice(tagEnd + 1, j - cTok.length), end: j };
}
// Walk: check holes everywhere (hidden branches too) and build the visible text.
function walk(tpl, scope, errs, ctx) {
  let out = '', i = 0;
  for (;;) {
    const b = nextBlock(tpl, i);
    const seg = tpl.slice(i, b ? b.open : tpl.length);
    holes(seg, scope, errs, ctx);
    out += seg.replace(/\{\{([^}]*)\}\}/g, (_, p) => { const v = resolve(p, scope); return typeof v === 'function' ? '' : String(v); });
    if (!b) return out;
    holes(b.tag, scope, errs, ctx);
    if (b.name === 'sc-for') {
      const lm = b.tag.match(/list="\{\{([^}]*)\}\}"/), am = b.tag.match(/as="(\w+)"/);
      if (!/hint-placeholder-count=/.test(b.tag)) errs.push(ctx + ': sc-for without hint-placeholder-count');
      const list = lm ? resolve(lm[1], scope) : undefined;
      if (!Array.isArray(list)) errs.push(ctx + ': sc-for list is not an array: ' + (lm ? lm[1] : b.tag));
      else list.forEach((it, k) => { out += walk(b.body, Object.assign({}, scope, { [am[1]]: it, $index: k }), errs, ctx + ' ' + am[1] + '[' + k + ']'); });
    } else {
      const vm = b.tag.match(/value="\{\{([^}]*)\}\}"/);
      if (!/hint-placeholder-val=/.test(b.tag)) errs.push(ctx + ': sc-if without hint-placeholder-val');
      const v = vm ? resolve(vm[1], scope) : undefined;
      const body = walk(b.body, scope, errs, ctx + ' (if ' + (vm ? vm[1].trim() : '?') + ')');
      if (v) out += body;
    }
    i = b.end;
  }
}
const visibleText = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// Collect handler functions in the returned values (top level, arrays of objects, and one more level down).
function handlers(vals) {
  const out = [];
  const visit = (v, where, depth) => {
    if (typeof v === 'function') out.push([where, v]);
    else if (Array.isArray(v) && depth < 4) v.forEach((x, k) => visit(x, where + '[' + k + ']', depth + 1));
    else if (v && typeof v === 'object' && depth < 4) Object.keys(v).forEach(k => visit(v[k], where + '.' + k, depth + 1));
  };
  Object.keys(vals).forEach(k => visit(vals[k], k, 0));
  return out;
}
// Internal text the client and the examiner must never see on these screens.
const CLIENTS = ['ngozi','erik','irs'];
const LEAK = [/\bD\d{2}\b/i, /Priya|Daniel|Helen|Marcus|Sam Adeyemi|Jo Kimura/i, /F540NR|SchC|Sch3|F1040|F8949|SchE|F2441/i, /tax effect/i, /blocking|should be/i, /ev-\d{4}/i, /GT-[A-D]\d/i, /engine v3|adjusted by the firm|proposed/i];

for (const f of FILES) {
  console.log('== ' + f);
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const sm = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  const tm = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
  if (!sm || !tm) { fail('no script or no <x-dc> template'); continue; }
  const tmp = path.join(os.tmpdir(), 'harnessR-' + f.replace(/\W/g, '_') + '.js');
  fs.writeFileSync(tmp, sm[1]);
  const chk = cp.spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  console.log('  node --check: ' + (chk.status === 0 ? 'ok' : 'FAILED ' + chk.stderr.trim()));
  if (chk.status !== 0) { problems++; continue; }
  if (!/<script src="\.\/support\.js"><\/script>/.test(src)) fail('support.js line missing');
  if (/—/.test(src)) fail('em dash found');
  const dp = src.match(/data-props='([^']*)'/); try { JSON.parse(dp[1]); } catch (e) { fail('data-props JSON: ' + e.message); }
  const Component = new Function('DCLogic', sm[1] + '\nreturn Component;')(DCLogic);
  const tpl = tm[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const prefix = f.startsWith('Checks') ? 'chk-' : 'rev-';
  const badCls = new Set();
  for (const m of tpl.matchAll(/class="([^"]*)"/g)) m[1].replace(/\{\{[^}]*\}\}/g, '').split(/\s+/).filter(Boolean).forEach(c => { if (!c.startsWith(prefix) && !['primary','on'].includes(c)) badCls.add(c); });
  console.log('  unprefixed classes in markup: ' + (badCls.size ? [...badCls].join(' ') : 'none (holes give wp / wp dark and prefixed status classes)'));
  for (const variant of ['plain', 'claim+reveal+dark']) {
    for (const role of ROLES) {
      const calls = [];
      const AS = { sam:['2027-01-04T15:00','Filed'], next:['2027-01-15T15:00','Filed'], irs:['2028-01-26T15:00','As of 26 Jan 2028'] }[role] || ['2026-06-23T06:05','Story time: 23 Jun 2026, 06:05'];
      const props = { role, asOf: variant === 'plain' ? undefined : AS[0], asOfLabel: variant === 'plain' ? undefined : AS[1], dark: variant !== 'plain', claimId: variant === 'plain' ? '' : 'ca-est', revealed: variant === 'plain' ? [] : ['ssn-theo'], revealLog: [],
        openClaim: (id) => calls.push('openClaim:' + id), go: (k) => calls.push('go:' + k), reveal: (k) => calls.push('reveal:' + k) };
      const c = new Component(props);
      if (!c.state) c.state = {};
      let vals, errs = [], text = '';
      try { vals = c.renderVals(); text = visibleText(walk(tpl, vals, errs, role)); } catch (e) { fail(role + ' ' + variant + ': renderVals threw ' + e.message); continue; }
      let nh = 0, after = 0;
      for (const [where, fn] of handlers(vals)) {
        nh++;
        const saved = c.state;
        try { fn({ target: { value: 'priya' }, stopPropagation() {}, preventDefault() {} }); const v2 = c.renderVals(); const e2 = []; walk(tpl, v2, e2, role + ' after ' + where); if (e2.length) { errs.push(...e2); } after++; }
        catch (e) { errs.push(role + ': handler ' + where + ' threw ' + e.message); }
        c.state = saved;
      }
      const uniq = [...new Set(errs)];
      uniq.slice(0, 8).forEach(e => fail(variant + ' ' + e));
      if (CLIENTS.includes(role)) LEAK.forEach(re => { const m = text.match(re); if (m) fail(variant + ' ' + role + ' sees internal text "' + m[0] + '"'); });
      // Working roles (now = v3, 23 Jun 2026) must not cite D71 (13 Jul 2026) or later events as received.
      const allStr = JSON.stringify(vals, (k, v) => typeof v === 'function' ? undefined : v);
      if (['priya','marcus','daniel','helen','jo'].includes(role) && /D71|13 Jul 2026|10 Jul 2026|3 Aug 2026/.test(allStr)) fail(variant + ' ' + role + ' carries an event after its now (all values, hidden included): ' + allStr.match(/D71|13 Jul 2026|10 Jul 2026|3 Aug 2026/)[0]);
      // H3 E: renamed terms never appear in rendered values for any role; "ledger" is never on screen.
      { const old = allStr.match(/Dismiss with a reason|Carry forward|Approve and e-sign|Frozen|Export response pack|Ledger findings|\bledger\b/i); if (old) fail(variant + ' ' + role + ' old term on screen: "' + old[0] + '"'); }
      if (!['ngozi','erik','irs','next'].includes(role) && !(f.startsWith('Checks') && role === 'helen') && !/SchA\.12|17,400|20,500/.test(text)) fail(variant + ' ' + role + ' no noncash adjustment shown');
      // H2: noncash is not a partner item; one wording; heat-pump authority wording in every role.
      if (f.startsWith('Checks') && role === 'helen' && vals.items.some(i => i.id === 'noncash')) fail(variant + ' helen has noncash in Waiting for partner');
      if (/noncash/.test(allStr) || /SchA\.12/.test(allStr)) { if (!allStr.includes('Tax effect: about +806 federal, +149 California (estimate at v3 rates, Example)')) fail(variant + ' ' + role + ' noncash wording differs'); if (/Partner sign-off only if over 1,000|Tax effect: Example|ledger estimate/.test(allStr)) fail(variant + ' ' + role + ' old noncash wording'); }
      if (/1\.263\(a\)-3/.test(allStr) && (allStr.match(/Treas\. Reg\. 1\.263\(a\)-3[^"]*/g) || []).some(m => !m.startsWith('Treas. Reg. 1.263(a)-3 (Example)'))) fail(variant + ' ' + role + ' heat-pump authority wording differs');
      if (f.startsWith('Review') && vals.statusTags && vals.statusTags.some(t => /partner sign-off/.test(t.text) && !/^4 /.test(t.text))) fail(variant + ' ' + role + ' partner count not 4');
      // Every enabled action button must change what is rendered (no silent no-ops).
      if (variant === 'plain') {
        const before = JSON.stringify(c.renderVals(), (k, v) => typeof v === 'function' ? undefined : v);
        const enabled = [];
        const scan = (v) => { if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === 'object') { if (typeof v.run === 'function' && v.dis === false && typeof v.label === 'string') enabled.push(v); Object.keys(v).forEach(k => scan(v[k])); } };
        // expand every item so its actions render, then scan
        const all = c.renderVals();
        (all.items || []).forEach(it => { c.state = {}; it.pick(); scan(c.renderVals().items.find(x => x.id === it.id).acts); });
        c.state = {}; scan(c.renderVals());
        let silent = 0;
        enabled.forEach(a => { c.state = {}; const b0 = JSON.stringify(c.renderVals(), (k, v) => typeof v === 'function' ? undefined : v); const calls0 = calls.length; a.run({ target:{ value:'priya' } }); const b1 = JSON.stringify(c.renderVals(), (k, v) => typeof v === 'function' ? undefined : v); if (b0 === b1 && calls.length === calls0) { silent++; if (silent < 3) fail(variant + ' ' + role + ' silent action "' + a.label + '"'); } });
        c.state = {};
        actionsReport[f + ' ' + role] = enabled.length + ' enabled actions, ' + silent + ' silent';
      }
      if (role === 'marcus' && f.startsWith('Checks') && variant === 'plain') {
        // Marcus: expand Theo's SSN item and confirm Reveal is disabled with the reason.
        const it = vals.items.find(x => x.id === 'theo-ssn'); it.pick(); const v3 = c.renderVals();
        const t3 = visibleText(walk(tpl, v3, [], 'marcus-ssn'));
        if (!(v3.revealDis === true && /No sensitive-data clearance/.test(t3) && !/\d{3}-\d{2}-\d{4}/.test(t3))) fail('marcus reveal not disabled or full SSN shown');
        else console.log('  marcus SSN item: Reveal disabled, reason shown, only XXX-XX-#### in text');
        c.state = {};
      }
      if (variant === 'plain') console.log('  ' + role.padEnd(6) + ' holes ' + (uniq.length ? uniq.length + ' problems' : 'ok') + ' · handlers ' + nh + ' called, ' + after + ' re-rendered · ' + summary(f, vals, text));
      else if (!uniq.length) {}
    }
    if (variant !== 'plain') console.log('  variant ' + variant + ': all ' + ROLES.length + ' roles rendered' );
  }
}
// ===== H3 feature assertions. features(srcChecks, srcReview) returns a list of failures tagged [Fn].
// Each is then proven able to fail: a source mutation aimed at that feature must make its tag fail.
function load(src) {
  const sm = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  const tm = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
  return { C: new Function('DCLogic', sm[1] + '\nreturn Component;')(DCLogic), tpl: tm[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '') };
}
// A fake shell: holds events, assigns seq and at like Main does, records emits.
function shellProps(role, extra) {
  const events = [];
  const emitted = [];
  const p = Object.assign({ role, dark:false, claimId:'', revealed:[], revealLog:[], asOf:'2026-06-23T06:05', asOfLabel:'Story time: 23 Jun 2026, 06:05', storyAt:'2026-06-23T06:05', lastSeen:{}, events,
    openClaim:(id) => emitted.push({ open:id }), go:(k) => emitted.push({ go:k }), reveal:() => {} }, extra || {});
  p.emit = (e) => { const seq = events.reduce((m, x) => Math.max(m, x.seq), 0) + 1; const ev = Object.assign({}, e, { seq, at: p.storyAt }); events.push(ev); emitted.push(ev); };
  p.emitted = emitted;
  return p;
}
const ev = (seq, who, type, claimId, text, more) => Object.assign({ seq, at:'2026-06-23T06:07', who, type, claimId, itemId:'', groupId:'g' + seq, retracts:null, text }, more || {});
function render(C, props, state) { const c = new C(props); c.state = Object.assign({}, c.state || {}, state || {}); return { c, v: c.renderVals() }; }
const J = (v) => JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x);
function features(srcC, srcR) {
  const F = [];
  const bad = (tag, m) => F.push('[' + tag + '] ' + m);
  const K = load(srcC), R = load(srcR);
  const HELEN = 'Approve and send to client: blocked by “California estimates include a 2024 payment”, and 3 more';
  // F1 new rows: ca-wages and salt-d02 in every working queue, each opening its claim; partner rule applies if adjusted.
  for (const role of ['priya','marcus','daniel','helen','jo']) {
    const p = shellProps(role); const { v } = render(K.C, p);
    for (const id of ['ca-wages','salt-d02']) {
      const it = v.items.find(i => i.id === id);
      if (!it) { bad('F1', role + ' has no ' + id + ' row'); continue; }
      it.openIt(); if (!p.emitted.some(e => e.open === id)) bad('F1', role + ' ' + id + ' does not open claim ' + id);
    }
  }
  { const { v } = render(K.C, shellProps('priya')); const w = v.items.find(i => i.id === 'ca-wages'), s = v.items.find(i => i.id === 'salt-d02');
    if (!w || !/218,400/.test(w.value) || !/5,685/.test(w.effect) || !/129,569/.test(J(w))) bad('F1', 'ca-wages facts wrong');
    if (!s || !/13,420/.test(s.value) || !/1,462/.test(s.effect) || !/6,508/.test(J(s)) || !/6,912\.00/.test(s.hl)) bad('F1', 'salt-d02 facts wrong'); }
  // F2 blocker count computed from the shared list and the events (no literal).
  for (const [L, which] of [[K, 'Checks'], [R, 'Review']]) {
    const p = shellProps('helen'); let { v } = render(L.C, p);
    const label = () => (which === 'Checks' ? v.topBtns[0] : v.mergeBtns[0]).label;
    if (label() !== HELEN) bad('F2', which + ' Helen default button differs: ' + label());
    p.events.push(ev(1, 'priya', 'adjustment', 'ca-est', 'Priya Raman adjusted F540NR.72 to 10,500'));
    v = render(L.C, p).v;
    if (label() !== 'Approve and send to client: blocked by “Card sales counted twice in business income”, and 2 more') bad('F2', which + ' blocker count not recomputed after an adjustment event: ' + label());
    ['atlas','rsu','theo-ssn'].forEach((id, k) => p.events.push(ev(2 + k, 'priya', 'adjustment', id, 'adjusted')));
    v = render(L.C, p).v;
    const b = which === 'Checks' ? v.topBtns[0] : v.mergeBtns[0];
    if (/blocked by “/.test(b.label)) bad('F2', which + ' still blocked by a blocker after all four adjusted: ' + b.label);
  }
  // F3 assign / reassign emits an assignment (notifies the assignee) and the owner column follows the events.
  { const p = shellProps('daniel'); const { c } = render(K.C, p, { sel:'atlas' });
    const it = c.renderVals().items.find(i => i.id === 'atlas'); const a = it.acts.find(x => /^Reassign to Marcus Bell$/.test(x.label));
    if (!a || a.dis) bad('F3', 'daniel has no enabled "Reassign to Marcus Bell" on atlas');
    else { a.run(); const e = p.events[p.events.length - 1]; if (!e || e.type !== 'assignment' || e.assignee !== 'marcus' || e.claimId !== 'atlas') bad('F3', 'assignment event wrong: ' + J(e));
      const it2 = c.renderVals().items.find(i => i.id === 'atlas'); if (it2.owner !== 'Marcus') bad('F3', 'owner did not follow the assignment: ' + it2.owner); }
    c.state.sel = 'theo-ssn'; const th = c.renderVals().items.find(i => i.id === 'theo-ssn').acts.find(x => /Marcus/.test(x.label));
    if (!th || !th.dis) bad('F3', 'theo-ssn can be reassigned to Marcus (no clearance)'); }
  // F4 bulk actions emit ONE grouped event; F5 undo emits a compensating event with retracts = seq.
  { const p = shellProps('priya'); const { c } = render(K.C, p, { checked:['noncash','repairs','care-ein'] });
    const v = c.renderVals(); const b = v.bulk.find(x => x.label === 'Mark prepared'); const n0 = p.events.length; b.run();
    const got = p.events.slice(n0);
    if (got.length !== 1 || got[0].itemIds.length !== 3 || !got[0].groupId || !/3 items marked prepared/.test(got[0].text)) bad('F4', 'bulk did not emit one grouped event: ' + J(got));
    const v2 = c.renderVals(); if (v2.items.find(i => i.id === 'repairs').tword !== 'Prepared') bad('F4', 'bulk result not shown on the row');
    v2.undo(); const u = p.events[p.events.length - 1];
    if (!u || u.type !== 'undo' || u.retracts !== got[0].seq) bad('F5', 'undo did not emit retracts=' + (got[0] && got[0].seq) + ': ' + J(u));
    if (c.renderVals().items.find(i => i.id === 'repairs').tword === 'Prepared') bad('F5', 'undo did not take effect'); }
  // F6 since you last looked: from events with seq > lastSeen[role], never hard-coded.
  { const p = shellProps('daniel', { lastSeen:{ daniel: 0 } }); p.events.push(ev(1, 'priya', 'adjustment', 'ca-est', 'Priya Raman adjusted F540NR.72 to 10,500'));
    let v = render(K.C, p).v; const first = v.items[0];
    if (!(first.id === 'ca-est' && first.grp === 'Since you last looked')) bad('F6', 'Checks: new event not grouped "Since you last looked"');
    let r = render(R.C, p).v; if (!r.since.some(s => /10,500/.test(s.text))) bad('F6', 'Review: new event not in Since you last looked');
    p.lastSeen = { daniel: 1 };
    v = render(K.C, p).v; if (v.items.some(i => i.grp === 'Since you last looked')) bad('F6', 'Checks: seen event still listed as new');
    r = render(R.C, p).v; if (r.since.length) bad('F6', 'Review: seen event still listed as new');
    const alone = render(K.C, { role:'daniel' }).v; if (alone.items.some(i => i.grp === 'Since you last looked')) bad('F6', 'Checks alone shows a hard-coded Since you last looked group'); }
  // F7 stale sign-off from events (the Simulate a colleague sequence): Daniel signs, Priya changes the value after.
  { const p = shellProps('daniel'); p.events.push(ev(1, 'daniel', 'signoff', 'ca-est', 'Daniel Ortiz signed off “California estimates include a 2024 payment”', { title:'California estimated payments' }));
    let r = render(R.C, p).v; if (!(r.liveSigns.length === 1 && r.liveSigns[0].state === 'Current')) bad('F7', 'Review: sign-off not shown as Current');
    p.events.push(ev(2, 'priya', 'adjustment', 'ca-est', 'Priya Raman adjusted F540NR line for 2025 estimates to 10,500', { from:'14,000', to:'10,500' }));
    r = render(R.C, p).v; if (!(r.liveSigns[0] && r.liveSigns[0].state === 'Stale: the value changed after you signed' && /14,000 to 10,500/.test(r.liveSigns[0].why))) bad('F7', 'Review: sign-off not stale after the change: ' + J(r.liveSigns));
    if (!r.statusTags.some(t => /1 sign-off gone stale/.test(t.text))) bad('F7', 'Review: no stale count in the status strip');
    const k = render(K.C, p).v.items.find(i => i.id === 'ca-est'); if (!/^Stale/.test(k.tword)) bad('F7', 'Checks: Daniel’s row not stale: ' + k.tword); }
  // F8 edit refused: Priya changed this since Marcus last looked; Marcus's adjust is refused with the difference shown, no event.
  { const p = shellProps('marcus', { lastSeen:{ marcus: 0 } }); p.events.push(ev(1, 'priya', 'adjustment', 'ca-est', 'Priya Raman adjusted F540NR line for 2025 estimates to 10,500', { from:'14,000', to:'10,500' }));
    const { c } = render(K.C, p, { sel:'ca-est' }); const a = c.renderVals().items.find(i => i.id === 'ca-est').acts.find(x => x.label === 'Adjust to $10,500');
    const n0 = p.events.length; a.run(); const it = c.renderVals().items.find(i => i.id === 'ca-est');
    if (p.events.length !== n0) bad('F8', 'refused edit still emitted an event');
    if (!(it.refused && it.refuseText === 'Priya changed this at 06:07; review her change first.' && /Before 14,000, now 10,500/.test(it.refuseDiff))) bad('F8', 'no refusal shown: ' + it.refuseText + ' / ' + it.refuseDiff); }
  // F9 per-recipient wording: Marcus never sees identifier digits; the signature PINs never show.
  { for (const role of ['marcus','daniel']) {
      const p = shellProps(role, { lastSeen:{ [role]: 0 } }); p.events.push(ev(1, 'priya', 'adjustment', 'theo-ssn', 'Priya Raman corrected Theo’s SSN from XXX-XX-3309 to XXX-XX-3390'));
      p.events.push(ev(2, 'ngozi', 'client_approved_and_signed_8879', '', 'Client signed Form 8879 with PINs 11111 and 22222'));
      const all = J(render(K.C, p).v) + J(render(R.C, p).v);
      // H3b: the phrase follows the actor's name ("Priya Raman: an identifier was corrected"), so match case-insensitively.
      if (role === 'marcus' && /XXX-XX-3309 to|SSN from/.test(all)) bad('F9', 'marcus sees identifier text in an event');
      if (role === 'marcus' && !/an identifier was corrected/i.test(all)) bad('F9', 'marcus does not get "An identifier was corrected"');
      if (/11111|22222/.test(all)) bad('F9', role + ' sees signature PINs');
      if (role === 'daniel' && !/corrected Theo’s SSN/.test(all)) bad('F9', 'daniel lost the event text'); }
    // Events this file emits never carry a full SSN pattern.
    const p = shellProps('priya'); const { c } = render(K.C, p, { sel:'theo-ssn' }); c.renderVals().items.find(i => i.id === 'theo-ssn').acts.find(x => x.label === 'Use the number on the 2024 return').run();
    if (p.events.some(e => /\d{3}-\d{2}-\d{4}|\b33(09|90)\b/.test(J(e).replace(/ending 33(09|90)/g, '')))) bad('F9', 'emitted SSN event carries digits: ' + J(p.events)); }
  // F10 Erik is a client role: away, plain words, no internal text; questions addressed per spouse.
  { for (const L of [K, R]) { const t = visibleText(walk(L.tpl, render(L.C, shellProps('erik')).v, [], 'erik')); if (!/your tax team/.test(t)) bad('F10', 'erik does not get the client wording'); LEAK.forEach(re => { const m = t.match(re); if (m) bad('F10', 'erik sees "' + m[0] + '"'); }); }
    const p = shellProps('priya'); const { c } = render(K.C, p, { sel:'atlas' }); const a = c.renderVals().items.find(i => i.id === 'atlas').acts.find(x => /^Ask Erik/.test(x.label));
    if (!a) bad('F10', 'atlas question not addressed to Erik'); else { a.run(); const e = p.events[p.events.length - 1]; if (!(e.type === 'question_to_client' && e.to === 'erik' && e.clientText && !/Atlas|SchC|blocking/i.test(e.clientText))) bad('F10', 'question event wrong: ' + J(e)); } }
  // F11 renames and hover definitions.
  { const r = render(R.C, shellProps('daniel')).v; if (r.levels.filter(l => /Sign Form 8879 \(e-file signature authorization\)/.test(l.role)).length !== 2) bad('F11', 'Review levels: one Form 8879 row per spouse missing');
    const k = render(K.C, shellProps('priya'), { sel:'ca-est' }).v; if (!k.items.every(i => i.tdef)) bad('F11', 'a status tag has no hover definition');
    if (!k.items.find(i => i.id === 'ca-est').acts.some(a => a.label === 'Clear with a reason')) bad('F11', '"Clear with a reason" missing'); }
  // F12 story clock: a working role after acceptance sees the filed record locked; Sam before 4 Jan 2027 sees the join notice.
  { const p = shellProps('priya', { asOf:'2026-08-01T12:00', storyAt:'2026-08-01T12:00' }); const k = render(K.C, p).v;
    if (!k.chips.some(c => c.text === 'As filed, locked') || k.items.some(i => i.acts.some(a => !a.dis))) bad('F12', 'priya after filing is not locked');
    const r = render(R.C, p).v; if (r.statusHead !== 'As filed, locked.') bad('F12', 'Review not locked after filing');
    for (const L of [K, R]) { const s = render(L.C, shellProps('sam')).v; if (!(s.showAway && /^Sam joins on 4 Jan 2027\./.test(s.awayText))) bad('F12', 'sam before 4 Jan 2027 not shown the join notice'); } }
  // F13 answers after the last computation: blockers once the clock passes msg-07 / msg-08; unchanged at 23 Jun.
  for (const [L, which] of [[K, 'Checks'], [R, 'Review']]) {
    const label = (v) => (which === 'Checks' ? v.topBtns[0] : v.mergeBtns[0]).label;
    const at = (t) => render(L.C, shellProps('helen', { asOf: t, storyAt: t })).v;
    if (label(at('2026-06-30T18:01')) !== HELEN) bad('F13', which + ' button changed before msg-07 arrived');
    if (label(at('2026-06-30T18:02')) !== 'Approve and send to client: blocked by “California estimates include a 2024 payment”, and 4 more') bad('F13', which + ' msg-07 not a blocker at arrival');
    const v6 = at('2026-07-02T09:00');
    if (label(v6) !== 'Approve and send to client: blocked by “California estimates include a 2024 payment”, and 5 more') bad('F13', which + ' not 6 blockers after both answers: ' + label(v6));
    if (which === 'Review' && !v6.statusTags.some(t => t.text === '6 blockers')) bad('F13', 'Review status strip not 6 blockers');
    if (which === 'Checks') {
      if (!v6.chips.some(c => c.text === '6 blocking filing')) bad('F13', 'Checks chip not 6 blocking filing');
      const p = shellProps('priya', { asOf:'2026-07-02T09:00', storyAt:'2026-07-02T09:00' }); const r = render(L.C, p).v;
      for (const id of ['crypto-c6','gift-brigid']) { const it = r.items.find(i => i.id === id); if (!it || it.tword !== 'Blocking' || !/^Answer arrived after the last computation/.test(it.title)) { bad('F13', id + ' row missing or not blocking'); continue; } it.openIt(); if (!p.emitted.some(e => e.open === id)) bad('F13', id + ' does not open its claim'); }
      if (render(L.C, shellProps('priya')).v.items.some(i => i.id === 'crypto-c6' || i.id === 'gift-brigid')) bad('F13', 'late answers shown at 23 Jun');
    }
  }
  // F14 spouse for client questions: the canonical table.
  { const WANT = { atlas:'erik', noncash:'erik', 'theo-ssn':'ngozi', 'heat-pump':'ngozi', 'ca-wages':'ngozi', 'ca-est':'both', 'salt-d02':'both', 'crypto-c6':'erik', 'gift-brigid':'ngozi' };
    for (const [id, who] of Object.entries(WANT)) {
      const p = shellProps('priya', { asOf:'2026-07-02T09:00', storyAt:'2026-07-02T09:00' }); const { c } = render(K.C, p, { sel:id });
      const it = c.renderVals().items.find(i => i.id === id); const a = it && it.acts.find(x => /^Ask /.test(x.label));
      if (!a) { bad('F14', id + ' has no question action'); continue; }
      a.run(); const e = p.events[p.events.length - 1];
      if (!e || e.to !== who) bad('F14', id + ' question addressed to ' + (e && e.to) + ', want ' + who);
      if (who === 'both' && a.label !== 'Ask Ngozi and Erik (clients)') bad('F14', id + ' label not addressed to both');
    } }
  // ===== H3b (review 7). F15 blockers come from the shell's `blockers` prop when present (one source of truth).
  { const BL = [{ claimId:'atlas', title:'Card sales counted twice in business income' }, { claimId:'rsu', title:'RSU shares sold with a zero cost basis' }];
    for (const [L, which] of [[K, 'Checks'], [R, 'Review']]) {
      const p = shellProps('helen', { blockers: BL }); p.events.push(ev(1, 'priya', 'adjustment', 'rsu', 'adjusted the RSU basis'));
      const v = render(L.C, p).v; const b = which === 'Checks' ? v.topBtns[0] : v.mergeBtns[0];
      if (b.label !== 'Approve and send to client: blocked by “Card sales counted twice in business income”, and 1 more') bad('F15', which + ' ignores the blockers prop: ' + b.label);
      const p0 = shellProps('helen', { blockers: [] }); const v0 = render(L.C, p0).v; const b0 = which === 'Checks' ? v0.topBtns[0] : v0.mergeBtns[0];
      if (/blocked by “/.test(b0.label)) bad('F15', which + ' still blocked with an empty blockers prop');
    }
    const k = render(K.C, shellProps('priya', { blockers: BL })).v; if (!k.chips.some(c => c.text === '2 blocking filing')) bad('F15', 'Checks chip not from the blockers prop'); }
  // F16 stage comes from the shell's `stage` prop when present.
  { const t = '2026-07-14T16:21'; for (const [L, which] of [[K, 'Checks'], [R, 'Review']]) {
      const v = render(L.C, shellProps('priya', { asOf: t, storyAt: t, stage: 'Filed' })).v;
      const isLocked = which === 'Checks' ? v.chips.some(c => c.text === 'As filed, locked') : v.statusHead === 'As filed, locked.';
      if (!isLocked) bad('F16', which + ' ignores stage "Filed"');
      const w = render(L.C, shellProps('priya', { asOf: '2026-07-20T09:00', storyAt: '2026-07-20T09:00', stage: 'Approval' })).v;
      const wl = which === 'Checks' ? w.chips.some(c => c.text === 'As filed, locked') : w.statusHead === 'As filed, locked.';
      if (wl) bad('F16', which + ' locked although the shell says stage "Approval"'); } }
  // F17 spouse comes from the shell's `spouseOf`; standalone the fallback mirrors the shell (RSU -> both, not Erik).
  { const p = shellProps('priya', { spouseOf: (id) => id === 'rsu' ? 'ngozi' : 'both' }); const { c } = render(K.C, p, { sel:'rsu' });
    const a = c.renderVals().items.find(i => i.id === 'rsu').acts.find(x => /^Ask /.test(x.label)); a.run(); const e = p.events[p.events.length - 1];
    if (e.to !== 'ngozi') bad('F17', 'Checks ignores spouseOf: rsu to ' + e.to);
    const q = shellProps('priya'); const r = render(K.C, q, { sel:'rsu' }); r.c.renderVals().items.find(i => i.id === 'rsu').acts.find(x => /^Ask /.test(x.label)).run();
    if (q.events[q.events.length - 1].to !== 'both') bad('F17', 'standalone rsu question not "both" like the shell table');
    for (const id of ['dg-1099', 'dg-caamt']) { const z = shellProps('priya'); const y = render(K.C, z, { sel:id }); y.c.renderVals().items.find(i => i.id === id).acts.find(x => /^Ask /.test(x.label)).run(); if (z.events[z.events.length - 1].to !== 'both') bad('F17', id + ' fallback not both'); } }
  // F18 the actor is the role key (`who`, or `by` when a view renamed `who`); the text never carries the actor's name.
  { for (const shape of ['who-key', 'by-key']) {
      const p = shellProps('priya', { lastSeen:{ priya: 0 } });
      p.emit = (e) => { const seq = p.events.length + 1; const ev2 = Object.assign({}, e, { seq, at: p.storyAt, whoName: 'Priya Raman' }); if (shape === 'by-key') { ev2.by = e.who; ev2.who = 'Priya'; } p.events.push(ev2); };
      const { c } = render(K.C, p, { sel:'repairs' }); c.renderVals().items.find(i => i.id === 'repairs').acts.find(x => x.label === 'Mark prepared').run();
      const it = c.renderVals().items.find(i => i.id === 'repairs');
      if (it.tword !== 'Prepared' || it.grp === 'Since you last looked' || it.acts.some(a => !a.dis && a.label === 'Mark prepared')) bad('F18', shape + ': own action not recognised: ' + it.tword + ' / ' + it.grp);
      if (/Priya/.test(p.events[0].text)) bad('F18', shape + ': emitted text carries the actor name: ' + p.events[0].text);
      const r = render(R.C, p).v; if (r.since.length) bad('F18', shape + ': Review lists my own event as new');
      const q = shellProps('priya'); q.emit = p.emit.bind(null); q.events = p.events; const rv = render(R.C, Object.assign(q, { emit: (e) => { const seq = q.events.length + 1; const ev2 = Object.assign({}, e, { seq, at: q.storyAt }); if (shape === 'by-key') { ev2.by = e.who; ev2.who = 'Priya'; } q.events.push(ev2); } }));
      rv.v.mergeBtns[0].run(); const after = rv.c.renderVals(); if (after.mergeBtns[0].label !== 'Sent to reviewer') bad('F18', shape + ': Review send-to-reviewer never flips'); }
    // Seen from someone else, the actor's name appears exactly once.
    const d = shellProps('daniel', { lastSeen:{ daniel: 0 } }); d.events.push(Object.assign(ev(1, 'priya', 'prepared', '', 'marked “Rental repairs” prepared', { itemId:'repairs' }), { whoName:'Priya Raman' }));
    const k = render(K.C, d).v.items.find(i => i.id === 'repairs'); if (!k || (k.since.match(/Priya/g) || []).length !== 1) bad('F18', 'Daniel sees the actor name not exactly once: ' + (k && k.since)); }
  // F19 Marcus never receives identifier digits, including "ends 3390".
  { const p = shellProps('marcus', { lastSeen:{ marcus: 0 } }); p.events.push(ev(1, 'priya', 'note', 'repairs', 'Theo card ends 3390, see D71'));
    p.events.push(ev(2, 'priya', 'review_note', 'ca-est', 'SSN last four 3309 typed by the client'));
    const all = J(render(K.C, p).v) + J(render(R.C, p).v).replace(/XXX-XX-3390|XXX-XX-3309/g, '');
    const evText = J(render(R.C, p).v.since); if (/\b\d{3,4}\b/.test(evText.replace(/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/g, ''))) bad('F19', 'Marcus sees digits in event text: ' + evText);
    if (!/an identifier was corrected/i.test(evText)) bad('F19', 'Marcus not told "an identifier was corrected"'); }
  // F20 Review note times are story timestamps (Example), hidden before they happen.
  { const v = render(R.C, shellProps('daniel'), { tab:'notes' }).v;
    if (!v.threads.every(t => /^\d{1,2} (Jun) 2026, \d{2}:\d{2}$/.test(t.when))) bad('F20', 'note times not story timestamps: ' + v.threads.map(t => t.when).join(' | '));
    const early = render(R.C, shellProps('daniel', { asOf:'2026-06-22T12:00', storyAt:'2026-06-22T12:00' }), { tab:'notes' }).v;
    if (early.threads.length !== 0) bad('F20', 'notes shown before they were written: ' + early.threads.length); }
  return F;
}
{
  console.log('== H3 feature assertions');
  const sc = fs.readFileSync(path.join(DIR, 'Checks.dc.html'), 'utf8'), sr = fs.readFileSync(path.join(DIR, 'Review.dc.html'), 'utf8');
  let base;
  try { base = features(sc, sr); } catch (e) { base = ['[ALL] threw ' + e.stack.split('\n').slice(0, 2).join(' ')]; }
  base.forEach(m => fail(m));
  console.log('  ' + (base.length ? base.length + ' feature failures' : 'F1-F20 pass on the real files'));
  // Mutations: each must make its own tag fail (proves the assertion can fail).
  const MUT = [
    ['F1', 'C', "const FINDINGS = ['ca-wages','salt-d02'];", "const FINDINGS = [];"],
    ['F2', 'C', 'const nBlock = openBlockers.length;', 'const nBlock = 4;'],
    ['F2', 'R', 'const nBlock = blk.length;', 'const nBlock = 4;'],
    ['F3', 'C', "const noClear = to === 'marcus' && (d.mask || d.id === 'id-tie');", 'const noClear = false;'],
    ['F3', 'C', "const a = evFor(d).filter(e => e.type === 'assignment' && e.assignee);", 'const a = [];'],
    ['F4', 'C', "emit({ type, itemIds: ids, claimId: '', itemId: '', groupId: g, title: text, text: text });", "ids.forEach(id => emit({ type, itemId: id, groupId: g, text: text }));"],
    ['F5', 'C', "if (target) emit({ type:'undo', retracts: target.seq,", "if (target) emit({ type:'undo', retracts: null,"],
    ['F6', 'C', "const seen = typeof LS[role] === 'number' ? LS[role] : replayMax;", 'const seen = 0;'],
    ['F6', 'R', "const seen = typeof LS[role] === 'number' ? LS[role] : replayMax;", 'const seen = 0;'],
    ['F7', 'R', "const later = live.find(e => +e.seq > +sg.seq && keys.some(k => touchesKey(e, k)) && (CHANGE.indexOf(e.type) >= 0 || e.type === 'signoff_stale'));", 'const later = null;'],
    ['F8', 'C', 'if (other) { this.setState(', 'if (false) { this.setState('],
    ['F9', 'C', "const scrubbed = (e) => role === 'marcus' &&", "const scrubbed = (e) => role === 'nobody' &&"],
    ['F9', 'R', ".replace(/\\bPINs?\\b[^.;]*/gi, 'signature PINs (not shown)')", ''],
    ['F10', 'C', "const client = role === 'ngozi' || role === 'erik';", "const client = role === 'ngozi';"],
    ['F11', 'R', "['Erik Lindqvist','Client: Sign Form 8879 (e-file signature authorization)', toClient", "['Erik Lindqvist','Client: Approve', toClient"],
    ['F12', 'C', 'const locked = filed && WORKING.indexOf(role) >= 0;', 'const locked = false;'],
    ['F12', 'R', 'const notYet = START[role] && at16 < START[role][0];', 'const notYet = false;'],
    ['F13', 'C', "const LATE = ['crypto-c6','gift-brigid'].filter(id => !filed && at16 >= D[id].at);", 'const LATE = [];'],
    ['F13', 'R', '.concat(LATE.filter(l => at16 >= l[2]));', '.concat(LATE);'],
    ['F14', 'C', "'ca-est':'both', 'salt-d02':'both' };", "'ca-est':'both', 'salt-d02':'erik' };"],
    ['F14', 'C', "return v === 'ngozi' || v === 'erik' ? v : 'both'; };", "return v === 'erik' ? v : 'ngozi'; };"],
    ['F15', 'C', 'const propBlk = Array.isArray(P.blockers)', 'const propBlk = false && Array.isArray(P.blockers)'],
    ['F15', 'R', 'const propBlk = Array.isArray(P.blockers)', 'const propBlk = false && Array.isArray(P.blockers)'],
    ['F16', 'C', "const filed = typeof P.stage === 'string' && P.stage ? P.stage === 'Filed' :", "const filed ="],
    ['F16', 'R', "const filed = typeof P.stage === 'string' && P.stage ? P.stage === 'Filed' :", "const filed ="],
    ['F17', 'C', "const v = typeof P.spouseOf === 'function' ? P.spouseOf(k) : SPOUSE[k];", "const v = SPOUSE[k] || 'erik';"],
    ['F18', 'C', ".map(e => Object.assign({}, e, { who: actorKey(e),", ".map(e => Object.assign({}, e, {"],
    ['F18', 'R', ".map(e => Object.assign({}, e, { who: actorKey(e),", ".map(e => Object.assign({}, e, {"],
    ['F18', 'C', ": type === 'prepared' ? 'marked “'", ": type === 'prepared' ? NAME[role] + ' marked “'"],
    ['F18', 'C', "const shown = (e) => (e.whoName || NAME[e.who] || 'The workpaper') + (scrubbed(e) ? ': ' : ' ') + say(e);", "const shown = (e) => say(e);"],
    ['F19', 'R', "\\b(identifier|card|ends|ending|last four|last 4|account|PIN)\\b[^.;]{0,30}\\b\\d{3,4}\\b", "\\bnothing\\b"],
    ['F20', 'R', "who: t.who, line: t.line, when: fmt(t.at),", "who: t.who, line: t.line, when: '5:02 am',"],
    ['F20', 'R', "const ordered = base.filter(t => at16 >= t.at).sort(", "const ordered = base.slice().sort("]
  ];
  let proven = 0;
  for (const [tag, which, from, to] of MUT) {
    const src = which === 'C' ? sc : sr;
    if (!src.includes(from)) { fail('mutation ' + tag + ' target not found in ' + (which === 'C' ? 'Checks' : 'Review') + ': ' + from.slice(0, 60)); continue; }
    const m = src.replace(from, to);
    let out; try { out = which === 'C' ? features(m, sr) : features(sc, m); } catch (e) { out = ['[' + tag + '] threw ' + e.message]; }
    if (out.some(x => x.startsWith('[' + tag + ']'))) proven++;
    else fail('mutation for ' + tag + ' (' + (which === 'C' ? 'Checks' : 'Review') + ') did not make ' + tag + ' fail');
  }
  console.log('  mutations: ' + proven + ' of ' + MUT.length + ' made their assertion fail');
}
function summary(f, v, text) {
  if (f.startsWith('Checks')) {
    if (!v.showQueue) return 'away: "' + v.awayText + '"';
    const groups = [...new Set(v.items.map(i => i.grp))];
    return v.items.length + ' items [' + groups.join(' / ') + ']' + (v.topBtns.length ? ' · button "' + v.topBtns[0].label + '"' + (v.topBtns[0].dis ? ' (disabled)' : '') : '');
  }
  if (!v.showReview) return 'away: "' + v.awayText + '"';
  return v.tabs.map(t => t.name + ' ' + t.count).join(', ') + ' · ' + v.mergeBtns.map(b => '"' + b.label + '"' + (b.dis ? ' (disabled)' : '')).join(' ');
}
Object.keys(actionsReport).forEach(k => console.log('  actions ' + k + ': ' + actionsReport[k]));
console.log(problems ? '\nRESULT: ' + problems + ' problem(s)' : '\nRESULT: 0 problems');
process.exit(problems ? 1 : 0);
