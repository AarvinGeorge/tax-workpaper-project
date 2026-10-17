// Harness for author F's files: Changes, Filing, Firm.
// Extracts each file's Component class, stubs DCLogic, renders the template with a mini engine
// (dotted holes, sc-if, sc-for) for all 9 roles, fails on thrown errors or any {{hole}} resolving to undefined,
// calls every bound handler, checks openClaim/go arguments, and scans client and examiner renders for internal text.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = process.env.F_DIR || path.join(__dirname, 'project');
const FILES = ['Changes', 'Filing', 'Firm'];
const ROLES = ['priya','marcus','daniel','helen','sam','jo','ngozi','erik','next','irs'];
const CLAIMS = new Set(['ca-est','atlas','rsu','theo-ssn','heat-pump','ext-pay','fed-est','repairs','care-ein','iso-lot','noncash','crypto-c6','gift-brigid','excess-ss','form-3520','or-credit','sek-fx']);
const SCREENS = new Set(['home','map','documents','checks','review','changes','filing','firm']);
const IDS = new Set(['ssn-ngozi','ssn-erik','ssn-theo','ssn-ada','bank-refund','ip-pin-ngozi']);
let fail = 0; let sink = null; const bad = m => { if (sink) { sink.push(m); return; } fail++; console.log('  FAIL', m); };
const quiet = process.env.F_QUIET === '1';

class DCLogic { constructor(p) { this.props = p || {}; this.state = {}; } setState(s) { this.state = { ...this.state, ...(typeof s === 'function' ? s(this.state) : s) }; } forceUpdate() {} }

function parse(tpl) {
  const re = /<sc-for\s([^>]*)>|<\/sc-for>|<sc-if\s([^>]*)>|<\/sc-if>|\{\{\s*([^}]+?)\s*\}\}/g;
  const root = { kind: 'root', kids: [] }; const stack = [root]; let last = 0, m;
  const attr = (s, n) => { const r = new RegExp(n + '="([^"]*)"').exec(s); return r ? r[1] : null; };
  while ((m = re.exec(tpl))) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.kids.push({ kind: 'text', s: tpl.slice(last, m.index) });
    last = re.lastIndex;
    if (m[1] !== undefined) { const n = { kind: 'for', list: attr(m[1], 'list').replace(/[{}\s]/g, ''), as: attr(m[1], 'as'), kids: [] }; top.kids.push(n); stack.push(n); }
    else if (m[0] === '</sc-for>' || m[0] === '</sc-if>') stack.pop();
    else if (m[2] !== undefined) { const n = { kind: 'if', val: attr(m[2], 'value').replace(/[{}\s]/g, ''), kids: [] }; top.kids.push(n); stack.push(n); }
    else { const before = tpl.slice(Math.max(0, m.index - 40), m.index); const ev = /\son[A-Z]\w*="$/.test(before); top.kids.push({ kind: 'hole', p: m[3], ev }); }
  }
  if (last < tpl.length) root.kids.push({ kind: 'text', s: tpl.slice(last) });
  if (stack.length !== 1) throw new Error('unbalanced sc-for/sc-if');
  return root;
}
function lookup(p, scope) {
  if (p === 'true') return true; if (p === 'false') return false; if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  const seg = p.split('.'); let v;
  for (let i = scope.length - 1; i >= 0; i--) if (Object.prototype.hasOwnProperty.call(scope[i], seg[0])) { v = scope[i][seg[0]]; break; }
  for (const s of seg.slice(1)) v = v == null ? undefined : v[s];
  return v;
}
// strict: evaluate every branch; returns rendered html of the visible branch set
function render(node, scope, ctx, visible) {
  let out = '';
  for (const k of node.kids) {
    if (k.kind === 'text') out += k.s;
    else if (k.kind === 'hole') {
      const v = lookup(k.p, scope);
      if (v === undefined) ctx.undef.add(k.p + ' @' + ctx.where);
      if (typeof v === 'function') ctx.handlers.push(v);
      else if (v !== undefined && v !== null && typeof v === 'object') ctx.undef.add('object in hole ' + k.p);
      out += k.ev ? '' : String(v);
    } else if (k.kind === 'if') {
      const v = lookup(k.val, scope);
      if (v === undefined) ctx.undef.add('sc-if ' + k.val + ' @' + ctx.where);
      const inner = render(k, scope, ctx, visible && !!v);
      if (visible && v) out += inner;
    } else if (k.kind === 'for') {
      const list = lookup(k.list, scope);
      if (!Array.isArray(list)) { ctx.undef.add('sc-for list ' + k.list + ' not an array @' + ctx.where); continue; }
      list.forEach((it, i) => { const s = { [k.as]: it, $index: i }; out += render(k, [...scope, s], ctx, visible); });
    }
  }
  return out;
}
function stripHidden(html) {
  // remove elements whose style is exactly display:none (the files' hide convention), with their content
  let guard = 0;
  for (;;) {
    const m = /<([a-z0-9-]+)\b[^>]*style="display:none"[^>]*>/i.exec(html); if (!m || guard++ > 5000) break;
    const tag = m[1]; let depth = 1, i = m.index + m[0].length; const open = new RegExp('<' + tag + '\\b|</' + tag + '>', 'gi'); open.lastIndex = i; let x;
    while (depth && (x = open.exec(html))) depth += x[0][1] === '/' ? -1 : 1;
    html = html.slice(0, m.index) + html.slice(x ? open.lastIndex : html.length);
  }
  return html;
}
const text = html => stripHidden(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const sampleLog = [ { who: 'Priya Raman', what: 'Theo\u2019s SSN (dependent 2)', when: 'This session, 10:41', example: false }, { who: 'Daniel Ortiz', what: 'Bank account for the refund', when: '24 Jun 2026, 09:03', example: true } ];
// The shell's one "now" per role (FIX-ROUND-H1 item 1): v3 computed 2026-06-23T06:05Z for working roles.
const AS_OF = r => (r === 'sam' || r === 'next') ? ['2027-01-15T15:00', 'Filed'] : r === 'irs' ? ['2028-01-26T15:00', 'Letter 566, 26 Jan 2028'] : ['2026-06-23T06:05', 'As of 23 Jun 2026, v3'];
const WORKING = ['priya','marcus','daniel','helen','jo','ngozi','erik'];
const LEAK = {
  ngozi: [/\bPriya\b/i, /\bDaniel\b/i, /\bHelen\b/i, /\bMarcus\b/i, /\bSam Adeyemi\b/i, /\bJo Kimura\b/i, /\bev-\d/i, /\bD\d\d\b/, /tax effect/i, /\bF540/i, /\bSchC\b/i, /\bSch3/i, /engine/i, /\bv3\b/i, /\brule\b/i, /blocking/i, /pipeline/i, /changes applied/i, /\bledger\b/i, /PIN\s*\d{4}/i],
  erik: null,
  irs: [/blocking/i, /should be/i, /tax effect/i, /California/i, /\bFTB\b/i, /\bSSN\b/i, /Theo/i, /3309/, /3390/, /FBAR/i, /pipeline/i, /engine/i, /sign off/i, /adjust/i, /proposed/i, /reject/i, /\bv3\b/i, /reason/i, /history/i, /later in this story/i]
};
LEAK.erik = LEAK.ngozi;
const STAFF_LEAK = [/\bledger\b/i, /\bFrozen\b/, /Carry forward to/, /Export response pack/, /Dismiss with a reason/, /Approve and e-sign/, /PIN\s*\d{4}/i];
const log = (...a) => { if (!quiet && !sink) console.log(...a); };

function checkFile(F, html) {
  log('\n== ' + F + '.dc.html');
  for (const must of ['<script src="./support.js"></script>', '<title>', 'class="{{wpClass}}"', "data-dc-script"]) if (!html.includes(must)) bad(F + ' missing ' + must);
  if (/\u2014/.test(html)) bad(F + ' contains an em dash');
  const body = html.split('data-dc-script')[1].split('>').slice(1).join('>').split('</script>')[0];
  const props = JSON.parse(html.match(/data-props='([^']*)'/)[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
  for (const k of ['role','dark','openClaim','go','claimId','revealed','reveal','revealLog']) if (!(k in props)) bad(F + ' data-props missing ' + k);
  for (const k of ['events','emit','lastSeen','storyAt']) if (!(k in props)) bad(F + ' data-props missing ' + k);
  if (!props.role.options.includes('erik')) bad(F + ' role options lack erik');
  if (!sink) fs.writeFileSync(path.join(__dirname, 'probes', 'class-' + F + '.js'), 'class DCLogic{}\n' + body);
  const tpl = html.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const tree = parse(tpl);
  const Component = vm.runInNewContext(body + ';Component', { DCLogic, console });
  // render alone with no props at all (artboard default)
  try { const c0 = new Component({}); const ctx0 = { undef: new Set(), handlers: [], where: 'no props' }; render(tree, [c0.renderVals()], ctx0, true); if (ctx0.undef.size) bad(F + ' alone: undefined ' + [...ctx0.undef].join(', ')); } catch (e) { bad(F + ' alone threw ' + e.message); }
  for (const role of ROLES) {
    const calls = { open: [], go: [], reveal: [], emit: [] };
    const revealed = []; const events = [];
    const emit = ev => { calls.emit.push(ev); events.push({ ...ev, seq: 100 + events.length }); };
    const p = { role, events, emit, lastSeen: {}, dark: role === 'jo', claimId: 'atlas', revealed, revealLog: sampleLog, asOf: AS_OF(role)[0], asOfLabel: AS_OF(role)[1],
      openClaim: id => calls.open.push(id), go: k => calls.go.push(k), reveal: k => { calls.reveal.push(k); if (role !== 'marcus') revealed.push(k); } };
    let c, vals, out;
    try { c = new Component(p); vals = c.renderVals(); } catch (e) { bad(F + '/' + role + ' renderVals threw ' + e.message); continue; }
    const ctx = { undef: new Set(), handlers: [], where: role };
    try { out = render(tree, [vals], ctx, true); } catch (e) { bad(F + '/' + role + ' render threw ' + e.message); continue; }
    if (ctx.undef.size) bad(F + '/' + role + ' undefined holes: ' + [...ctx.undef].join(', '));
    // call every handler, re-render after each
    let nH = 0;
    for (const h of ctx.handlers) { try { h({ target: { value: 'x', checked: true } }); nH++; const v2 = c.renderVals(); const ctx2 = { undef: new Set(), handlers: [], where: role + ' after handler' }; render(tree, [v2], ctx2, true); if (ctx2.undef.size) bad(F + '/' + role + ' after handler: ' + [...ctx2.undef].join(', ')); } catch (e) { bad(F + '/' + role + ' handler threw ' + e.message); } }
    for (const id of calls.open) if (!CLAIMS.has(id)) bad(F + '/' + role + ' openClaim with unknown id "' + id + '"');
    for (const k of calls.go) if (!SCREENS.has(k)) bad(F + '/' + role + ' go with unknown screen "' + k + '"');
    for (const k of calls.reveal) if (!IDS.has(k)) bad(F + '/' + role + ' reveal with unknown id "' + k + '"');
    if (role === 'marcus' && calls.reveal.length) bad(F + '/marcus called reveal');
    const t = text(out);
    if (!['ngozi','erik','irs'].includes(role)) for (const re of STAFF_LEAK) { const m = re.exec(t); if (m) bad(F + '/' + role + ' old term or PIN ' + re + ' near "' + t.slice(Math.max(0, m.index - 40), m.index + 40) + '"'); }
    for (const re of (LEAK[role] || [])) { const m = re.exec(t); if (m) bad(F + '/' + role + ' shows internal text ' + re + ' near "' + t.slice(Math.max(0, m.index - 50), m.index + 40) + '"'); }
    // per-file expectations
    if (F === 'Changes') {
      const ents = vals.entries || [];
      if (['ngozi','erik','irs'].includes(role)) { if (!vals.noAccess) bad('Changes visible to ' + role); }
      else {
        if (ents.map(e => e.id).join(',') !== 'ca-est,atlas,rsu,theo-ssn,heat-pump,fed-est,care-ein,noncash') bad('Changes: adjustment list ' + ents.map(e => e.id).join(','));
        if (vals.filters.find(f => f.label === 'Need partner sign-off').count !== 4) bad('Changes: partner count');
        if (ents.find(e => e.id === 'noncash').effect !== 'Tax effect: about +806 federal, +149 California (estimate at v3 rates, Example). Under 1,000, so reviewer sign-off is enough.') bad('Changes: noncash wording');
        if (!ents.find(e => e.id === 'heat-pump').basis.startsWith('Authority to confirm: Treas. Reg. 1.263(a)-3 (Example)')) bad('Changes: heat-pump authority wording ' + role);
        if (WORKING.includes(role) && /D71|3 Aug 2026|his card/.test(t)) bad('Changes: cites evidence after asOf for ' + role);
        if (['sam','next'].includes(role) && ents.some(e => !/Signed/.test(e.signoffs) || e.signExStyle !== '')) bad('Changes: filed sign-offs');
        if (['sam','next','jo'].includes(role) && ents.some(e => e.acts.length)) bad('Changes: actions shown to read-only ' + role);
        if (role === 'daniel' && ents.some(e => e.id === 'ext-pay')) bad('Changes: ext-pay listed as an adjustment');
        if (role === 'marcus') { const a = ents.find(e => e.id === 'theo-ssn').acts[0]; if (a.ad !== 'true' || !/clearance/.test(a.reason)) bad('Changes: Marcus can type SSN'); }
        if (role === 'helen' && ents.filter(e => e.acts.some(a => a.label === 'Partner sign-off')).map(e => e.id).join(',') !== 'ca-est,atlas,rsu,heat-pump') bad('Changes: Helen partner sign-off list');
      }
      log('  ' + role.padEnd(6), vals.noAccess ? 'no access: ' + vals.noAccessTitle : (vals.versionText + ' | entries ' + ents.length + ' | actions on first: ' + (ents[0].acts.map(a => a.label + (a.ad === 'true' ? ' (disabled)' : '')).join(', ') || 'none (read only)')), '| handlers', nH, '| openClaim', [...new Set(calls.open)].join(',') || '-');
    }
    if (F === 'Filing') {
      if (role === 'irs') { if (!vals.canExport || vals.letterItems.length !== 2 || vals.showCarry || vals.timeline.length !== 3) bad('Filing: examiner view'); }
      if (['ngozi','erik'].includes(role) && (vals.showTimeline || vals.showLetter || vals.showCarry || vals.showFrozen)) bad('Filing: client sees internal sections');
      if (['priya','marcus','daniel','helen','sam','jo','next'].includes(role)) {
        const iso = vals.carry[0]; if (!iso || iso.vals.map(v => v.v).join('/') !== '12,000/52,000/3,871') bad('Filing: ISO lot values');
        if (!vals.openItems.some(o => /California AMT not computed/.test(o.title))) bad('Filing: CA AMT open item');
      }
      if (role === 'next' && !vals.carry.every(c => c.canAdd)) bad('Filing: next cannot add to plan');
      if (vals.showCarry && vals.carry.find(c => /heat pump/.test(c.title)).exStyle !== '') bad('Filing: heat-pump carry row lacks Example');
      if (WORKING.includes(role) && vals.timeline.some((x, i) => x.tword === 'Happened' && /8879|rejected|card received|accepted|Letter 566/.test(x.title))) bad('Filing: post-asOf event shown as happened for ' + role);
      if (WORKING.includes(role) && /D71|his card/.test(JSON.stringify(vals.carry))) bad('Filing: carry cites D71 for ' + role);
      if (role === 'irs' && vals.letterItems.some(it => it.hasHist)) bad('Filing: examiner sees history');
      log('  ' + role.padEnd(6), vals.versionText, '| approval:', vals.appr && vals.showApproval ? vals.appr.tword + ' / ' + vals.appr.title : 'hidden', '| timeline', vals.showTimeline ? vals.timeline.map(x => x.tword[0]).join('') : 'hidden', '| letter', vals.showLetter ? vals.letter.tword : 'hidden', '| carry', vals.showCarry ? vals.carry.length : 'hidden', '| export', vals.canExport);
    }
    if (F === 'Firm') {
      if (['ngozi','erik','irs'].includes(role)) { if (!vals.noAccess) bad('Firm visible to ' + role); }
      else {
        const live = vals.logRows.filter(r => r.liveStyle === ''); if (live.length !== 1 || vals.logRows.length !== sampleLog.length) bad('Firm: log rows must be revealLog only, got ' + vals.logRows.length);
        if (role === 'jo' !== vals.isJo) bad('Firm: edit button gate');
        const mr = vals.rules.find(r => r.tightened); if (!mr || mr.starter !== 'Staff without sensitive-data clearance see SSNs, bank and account numbers and IP PINs masked; every unmasked view is logged.' || mr.tword !== 'Tightened from the starter rule') bad('Firm: masking rule');
        if (vals.steps.length !== 12 || vals.rules.length !== 7 || vals.verifs.length !== 5) bad('Firm: standards counts');
        if (vals.budget[vals.budget.length - 1].budget !== '22.0') bad('Firm: budget total');
      }
      log('  ' + role.padEnd(6), vals.noAccess ? 'no access: ' + vals.noAccessTitle : ('edit standards: ' + (vals.isJo ? 'yes' : 'no') + ' | log rows ' + vals.logRows.length + ' (live ' + vals.logRows.filter(r => !r.liveStyle).length + ') | budget total ' + vals.budget[vals.budget.length - 1].budget + ' h | status ' + vals.status.length), '| handlers', nH);
    }
  }
  h3(F, Component, tree);
  h3b(F, Component, tree);
}


// ---- H3 feature assertions (story clock, events, what-ifs, sign flow, client's copy, outside filings, penalty, deadlines) ----
function mount(Component, tree, role, asOf, events, extra) {
  const calls = { open: [], go: [], emit: [] };
  const ev = events || [];
  const p = Object.assign({ role, asOf, storyAt: asOf, asOfLabel: 'Story', events: ev, lastSeen: {}, revealed: [], revealLog: [],
    emit: e => { calls.emit.push(e); ev.push({ ...e, seq: 200 + ev.length }); }, openClaim: id => calls.open.push(id), go: k => calls.go.push(k), reveal: () => {} }, extra || {});
  const c = new Component(p);
  const v = () => c.renderVals();
  const txt = () => { const ctx = { undef: new Set(), handlers: [], where: role + ' h3' }; const o = render(tree, [c.renderVals()], ctx, true); if (ctx.undef.size) bad('h3 ' + role + ' undefined ' + [...ctx.undef].join(',')); return text(o); };
  return { c, v, txt, calls, ev };
}
function h3(F, Component, tree) {
  const V3 = '2026-06-23T06:05';
  if (F === 'Changes') {
    const m = mount(Component, tree, 'daniel', V3);
    const chips = m.v().wiChips;
    if (chips.length !== 6) bad('H3 Changes: what-if count ' + chips.length + ' (want 5 alternatives + extension)');
    const t0 = m.txt(); if (!/Not a change; nothing is saved to the return/.test(t0)) bad('H3 Changes: what-if label missing');
    chips.forEach((ch, i) => { m.v().wiChips[i].pick(); });
    m.v().wiChips[2].pick(); const w = m.v().wi;
    if (!w || w.rows[0].chg !== '+3,633' || w.rows[3].chg !== '+896') bad('H3 Changes: hvac what-if numbers ' + JSON.stringify(w && w.rows));
    m.v().wiChips[5].pick(); if (!/36,000/.test(JSON.stringify(m.v().wi.rows))) bad('H3 Changes: extension what-if lacks 36,000');
    if (m.calls.emit.length) bad('H3 Changes: what-if emitted ' + m.calls.emit.length + ' events (must never notify)');
    // actions emit; bulk is one grouped event; undo retracts it
    const ent = m.v().entries.find(e => e.id === 'atlas'); ent.acts.find(a => a.label === 'Sign off as reviewer').go();
    const e1 = m.calls.emit[0]; if (!e1 || e1.type !== 'signoff' || e1.claimId !== 'atlas') bad('H3 Changes: sign-off did not emit signoff on atlas');
    if (!/Saved/.test(m.v().liveRows.map(r => r.state).join())) bad('H3 Changes: emitted action not shown in Recorded in this story');
    const pm = mount(Component, tree, 'priya', V3);
    pm.v().entries[0].toggle(); pm.v().entries[1].toggle(); pm.v().entries[2].toggle(); pm.v().bulkSend();
    if (pm.calls.emit.length !== 1 || pm.calls.emit[0].type !== 'sent_to_review' || !pm.calls.emit[0].groupId) bad('H3 Changes: bulk send must emit exactly one grouped event, got ' + pm.calls.emit.length);
    pm.v().undo(); const u = pm.calls.emit[1];
    if (!u || u.type !== 'undo' || u.retracts !== pm.ev[0].seq) bad('H3 Changes: undo must retract the grouped event seq');
    if (!/Undone/.test(pm.v().liveRows.map(r => r.state).join())) bad('H3 Changes: retracted event not shown as Undone');
    // Marcus never sees identifier digits in event text
    const mm = mount(Component, tree, 'marcus', V3, [{ seq: 5, type: 'ssn_typed', who: 'priya', claimId: 'theo-ssn', text: 'Theo SSN corrected to XXX-XX-3390', at: V3 }]);
    if (/3390/.test(JSON.stringify(mm.v().liveRows))) bad('H3 Changes: Marcus sees identifier digits in an event');
    // story clock: a working role after acceptance is read only, as filed, locked
    const late = mount(Component, tree, 'daniel', '2026-08-01T09:00');
    if (late.v().entries.some(e => e.acts.length) || late.v().readOnlyWord !== 'As filed, locked') bad('H3 Changes: working role after acceptance not locked');
    // a colleague's adjustment event shows on the entry
    const sim = mount(Component, tree, 'daniel', V3, [{ seq: 9, type: 'adjustment', who: 'priya', claimId: 'ca-est', text: 'F540NR line for 2025 estimates set to 10,500', at: '2026-06-23T06:07' }]);
    if (!sim.v().entries.find(e => e.id === 'ca-est').hasLive) bad('H3 Changes: live adjustment event not shown on its entry');
    for (const r of ['ngozi', 'erik']) if (!mount(Component, tree, r, V3).v().noAccess) bad('H3 Changes: client ' + r + ' has access');
  }
  if (F === 'Filing') {
    // sign flow per spouse
    const ng = mount(Component, tree, 'ngozi', V3);
    if (ng.v().sigCards.some(c => c.forms.some(f => f.canSign))) bad('H3 Filing: signing open before approval without preview');
    ng.v().togglePreview();
    const own = ng.v().sigCards[0].forms, other = ng.v().sigCards[1].forms;
    if (!own.every(f => f.canSign) || other.some(f => f.canSign)) bad('H3 Filing: Ngozi must sign only her own two forms');
    if (!/Form 8879/.test(own[0].label) || !/FTB 8879/.test(own[1].label)) bad('H3 Filing: sign buttons must name Form 8879 and FTB 8879');
    own[0].sign();
    const se = ng.calls.emit[0]; if (!se || se.type !== 'client_signed' || se.signer !== 'ngozi' || se.form !== '8879') bad('H3 Filing: signing did not emit client_signed');
    if (!ng.v().hasSnap) bad('H3 Filing: no signed snapshot after signing');
    const er = mount(Component, tree, 'erik', V3, ng.ev); er.v().togglePreview();
    const ev = er.v(); if (ev.sigCards[0].forms[0].tword !== 'Signed' || !ev.sigCards[1].forms.every(f => f.canSign)) bad('H3 Filing: Erik must see Ngozi signed (from events) and sign his own');
    const tE = er.txt(); for (const re of LEAK.ngozi) { const mm = re.exec(tE); if (mm) bad('H3 Filing: erik preview leak ' + re); }
    // after tl-20: both signed from the packet; PINs never shown
    const after = mount(Component, tree, 'erik', '2026-08-25T12:00');
    if (!after.v().sigCards.every(c => c.forms.every(f => f.tword === 'Signed'))) bad('H3 Filing: packet signatures not shown after 10 Jul');
    // client's copy
    const cp = after.v(); if (!cp.copyReady || cp.copyRows.length < 6 || !/9276/.test(JSON.stringify(cp.copyRows))) bad('H3 Filing: client copy incomplete at 25 Aug ' + cp.copyRows.length);
    if (ng.v().copyReady) bad('H3 Filing: client copy shown before acceptance');
    if (!/IRS returned your return; we need Theo/.test(mount(Component, tree, 'ngozi', '2026-07-13T18:00').v().appr.title)) bad('H3 Filing: rejection not in plain words for the client');
    // outside filings
    const d = mount(Component, tree, 'daniel', V3).v();
    const names = d.outside.map(o => o.title).join(' | ');
    for (const k of ['FBAR', '1099-NEC', '2023 Form 3520', 'Form 5330', 'Oregon composite', 'Arizona composite', 'Ada', 'Form 709']) if (!names.includes(k)) bad('H3 Filing: outside filings lack ' + k);
    if (d.outside.find(o => /Form 709/.test(o.title)).need !== 'Not needed') bad('H3 Filing: Form 709 must read Not needed');
    if (d.outside.find(o => /3520/.test(o.title)).exStyle !== '') bad('H3 Filing: 3520 judgment lacks Example');
    if (!mount(Component, tree, 'daniel', '2026-01-25T00:00').v().outside.some(o => o.need === 'Not known yet')) bad('H3 Filing: outside filings ignore the story clock');
    // penalty and interest
    const pen = r => { const k = {}; r.forEach(x => { k[x.k] = x.v; }); return k; };
    const p1 = pen(mount(Component, tree, 'daniel', '2026-07-21T00:00').v().pen.rows);
    if (p1['Interest, 7% a year'] !== 'about 78' || p1['Failure-to-pay penalty, 4 months at 0.5%'] !== 'about 84.40' || p1['Days after the due date'] !== '96') bad('H3 Filing: penalty after 20 Jul ' + JSON.stringify(p1));
    const p0 = pen(d.pen.rows); if (p0['Interest, 7% a year'] !== 'about 56' || p0['Days after the due date'] !== '69') bad('H3 Filing: penalty at 23 Jun ' + JSON.stringify(p0));
    const dm = mount(Component, tree, 'helen', V3); dm.v().penDecisions[0].record();
    if (!dm.calls.emit.length || dm.calls.emit[0].type !== 'penalty_decision') bad('H3 Filing: 2210 decision did not emit');
    if (!/regular/i.test(d.penDecisions[0].title)) bad('H3 Filing: 2210 method decision missing');
    // shared blocker rule: 4 at v3 (byte-identical), 6 once msg-07 and msg-08 have arrived
    const BL4 = '“California estimates include a 2024 payment”, and 3 more', BL6 = '“California estimates include a 2024 payment”, and 5 more';
    const h0 = mount(Component, tree, 'helen', V3).v(), h6 = mount(Component, tree, 'helen', '2026-07-02T09:00').v();
    if (!h0.appr.text.includes(BL4) || h0.blockerCount !== 4 || !h6.appr.text.includes(BL6) || h6.blockerCount !== 6) bad('H3 Filing: blocker list on the story clock ' + h0.blockerCount + '/' + h6.blockerCount);
    if (mount(Component, tree, 'helen', '2026-06-30T18:30').v().blockerCount !== 5) bad('H3 Filing: msg-07 alone must make 5 blockers');
    // examiner and renames
    const ir = mount(Component, tree, 'irs', '2028-01-26T15:00').v();
    if (ir.showPenalty || ir.showOutside || ir.showCopy || ir.exportLabel !== 'Examination response') bad('H3 Filing: examiner view H3 sections or rename');
    const sam = mount(Component, tree, 'sam', '2027-01-15T15:00').v();
    if (sam.frz.tword !== 'As filed, locked' || sam.carry[0].tword !== 'Carryover') bad('H3 Filing: renames As filed, locked / Carryover');
  }
  if (F === 'Firm') {
    const jo = mount(Component, tree, 'jo', V3);
    const s = jo.v().status;
    const rv = s.find(x => x.what === 'Internal: review complete'), ho = s.find(x => x.what === 'Internal: preparer hand-off to review');
    if (!rv || rv.tword !== 'Overdue by 76 days' || !ho || ho.tword !== 'Overdue by 88 days') bad('H3 Firm: deadline warnings at 23 Jun ' + (rv && rv.tword) + ' / ' + (ho && ho.tword));
    if (!/extension moved the filing date/.test(s.find(x => /Extended due date/.test(x.what)).note)) bad('H3 Firm: extension context missing');
    rv.warn(); const w = jo.calls.emit[0]; if (!w || w.type !== 'deadline_warning') bad('H3 Firm: deadline warning did not emit');
    const before = jo.calls.emit.length; jo.v().status.find(x => x.what === 'Internal: review complete').warn(); if (jo.calls.emit.length !== before) bad('H3 Firm: deadline warning sent twice');
    jo.v().asgRows[0].move(); const a = jo.calls.emit.find(e => e.type === 'assignment');
    if (!a || a.assignee !== 'marcus') bad('H3 Firm: reassign did not emit assignment to marcus');
    if (jo.v().asgRows[0].who !== 'Marcus Bell') bad('H3 Firm: assignment event not applied');
    jo.v().publish(); if (jo.v().versionTag !== 'Version 3') bad('H3 Firm: published version not shown');
    if (mount(Component, tree, 'daniel', V3).v().status.some(x => x.canWarn)) bad('H3 Firm: non-admin can send deadline warnings');
    const BTN4h = 'Approve and send to client: blocked by “California estimates include a 2024 payment”, and 3 more';
    const f4 = mount(Component, tree, 'daniel', V3).v(), f6 = mount(Component, tree, 'daniel', '2026-07-02T09:00').v();
    if (f4.blockerCount !== 4 || !f4.status[0].note.includes('Four blockers open. Helen’s button: ' + BTN4h + '.') || f6.blockerCount !== 6 || !/Six blockers open\. Helen’s button: Approve and send to client: blocked by “California estimates include a 2024 payment”, and 5 more\./.test(f6.status[0].note)) bad('H3 Firm: blocker list on the story clock');
    const sam0 = mount(Component, tree, 'jo', V3).v().staffRows.find(r => r.name === 'Sam Adeyemi');
    const sam1 = mount(Component, tree, 'jo', '2027-01-15T15:00').v().staffRows.find(r => r.name === 'Sam Adeyemi');
    if (sam0.active !== 'Joins on 4 Jan 2027' || sam1.active !== 'Active') bad('H3 Firm: Sam active_from not on the story clock');
    const filed = mount(Component, tree, 'jo', '2026-08-01T00:00').v();
    if (filed.status.find(x => x.what === 'Internal: review complete').tword !== 'Missed' || filed.asgRows[0].canMove) bad('H3 Firm: after filing, deadlines and assignment state');
  }
}

// ---- H3b: blockers and stage come from the shell's props (M2, decision 1 and 4); Marcus digits (decision 5) ----
const B3 = [ { claimId:'atlas', title:'Card sales counted twice in business income' }, { claimId:'rsu', title:'RSU shares sold with a zero cost basis' }, { claimId:'theo-ssn', title:'Theo’s SSN differs from his 2024 return' } ];
const BTN3 = 'Approve and send to client: blocked by “Card sales counted twice in business income”, and 2 more';
const BTN4 = 'Approve and send to client: blocked by “California estimates include a 2024 payment”, and 3 more';
function h3b(F, Component, tree) {
  const V3 = '2026-06-23T06:05';
  if (F === 'Filing') {
    const hp = mount(Component, tree, 'helen', V3, [], { blockers: B3 });
    const v = hp.v(); const t = hp.txt();
    if (v.blockerCount !== 3 || !t.includes(BTN3)) bad('H3b Filing: blockers prop not used (count ' + v.blockerCount + ')');
    if (!mount(Component, tree, 'helen', V3).txt().includes(BTN4)) bad('H3b Filing: default Helen button text not byte-identical');
    const sp = mount(Component, tree, 'daniel', '2026-07-11T09:00', [], { stage: 'Filing' }).v();
    if ((sp.frz.rows.find(r => r.k === 'Stage') || {}).v !== 'Filing') bad('H3b Filing: stage prop not used');
    if ((mount(Component, tree, 'daniel', '2026-07-11T09:00').v().frz.rows.find(r => r.k === 'Stage') || {}).v !== 'Approval') bad('H3b Filing: standalone stage must match the shell (Approval after signing)');
  }
  if (F === 'Firm') {
    const v = mount(Component, tree, 'daniel', V3, [], { blockers: B3 }).v();
    if (v.blockerCount !== 3 || !v.status[0].note.includes('“Card sales counted twice in business income”, and 2 more')) bad('H3b Firm: blockers prop not used');
    const sp = mount(Component, tree, 'daniel', '2026-07-11T09:00', [], { stage: 'Filing' }).v();
    if (!/^Filing/.test(sp.status[0].what)) bad('H3b Firm: stage prop not used (' + sp.status[0].what + ')');
    if (!/^Approval/.test(mount(Component, tree, 'daniel', '2026-07-11T09:00').v().status[0].what)) bad('H3b Firm: standalone stage must match the shell');
  }
  if (F === 'Changes') {
    const v = mount(Component, tree, 'daniel', V3, [], { blockers: B3 }).v();
    if (v.blockerCount !== 3 || v.filters.find(f => f.label === 'Blocking filing').count !== 3 || v.entries.find(e => e.id === 'ca-est').blockStyle === '') bad('H3b Changes: blockers prop not used');
    const d = mount(Component, tree, 'daniel', V3).v();
    if (d.blockerCount !== 4 || d.filters.find(f => f.label === 'Blocking filing').count !== 4) bad('H3b Changes: default blockers changed');
    const mm = mount(Component, tree, 'marcus', V3, [{ seq: 7, type: 'adjustment', who: 'priya', claimId: 'care-ein', text: 'Theo’s number now ends 3390', at: V3 }]);
    if (/\b\d{3,4}\b/.test(JSON.stringify(mm.v().liveRows.map(r => r.text)))) bad('H3b Changes: Marcus sees identifier digits');
  }
}

function runAll(srcs) { for (const F of FILES) checkFile(F, srcs[F]); }
const real = {}; for (const F of FILES) real[F] = fs.readFileSync(path.join(dir, F + '.dc.html'), 'utf8');
runAll(real);
console.log('\nfailures:', fail);

// Mutations: each must make at least one assertion fail, matching its pattern.
const MUT = [
  ['Changes', "const pickWi = id => this.setState({ wi: st.wi === id ? '' : id });", "const pickWi = id => { emit({ type:'whatif' }); this.setState({ wi: st.wi === id ? '' : id }); };", /what-if emitted/],
  ['Changes', "f:[81962, 85595, 4220, 7853, 164, 164]", "f:[81962, 85594, 4220, 7853, 164, 164]", /hvac what-if/],
  ['Changes', "{ retracts: ev && typeof ev.seq === 'number' ? ev.seq : null,", "{ retracts: null,", /undo must retract/],
  ['Changes', "send('sent_to_review', null,", "ids.forEach(i => send('sent_to_review', i, i)); if (0) send('sent_to_review', null,", /exactly one grouped/],
  ['Changes', "(estimate at v3 rates, Example)", "(ledger estimate at v3 rates, Example)", /noncash wording|old term/],
  ['Changes', "if (role === 'marcus' && (e.claimId", "if (false && (e.claimId", /Marcus sees identifier/],
  ['Changes', "const readOnly = role === 'sam' || role === 'next' || role === 'jo' || filed;", "const readOnly = role === 'sam' || role === 'next' || role === 'jo';", /not locked/],
  ['Changes', "const isClient = role === 'ngozi' || role === 'erik';", "const isClient = role === 'ngozi';", /erik|client erik/],
  ['Filing', "const canSign = signOpen && role === s.id && !sg;", "const canSign = signOpen && !sg;", /only her own/],
  ['Filing', "label:'Sign FTB 8879 (California e-file signature authorization)'", "label:'Approve and e-sign'", /name Form 8879|old term/],
  ['Filing', "events.filter(e => e.type === 'client_signed' && !retracted.has(e.seq)", "[].filter(e => e.type === 'client_signed' && !retracted.has(e.seq)", /Erik must see Ngozi/],
  ['Filing', "if (at('ref')) copyRows.push", "if (false) copyRows.push", /client copy incomplete/],
  ['Filing', "const copyReady = at('fed') && !isIrs;", "const copyReady = !isIrs;", /client copy shown before/],
  ['Filing', "need:'Not needed', ncls:'fil-t-pas'", "need:'Required', ncls:'fil-t-pas'", /Form 709 must/],
  ['Filing', "const known = now >= o.known;", "const known = true;", /story clock/],
  ['Filing', "const ftp = BAL * 0.005 * months;", "const ftp = BAL * 0.005 * (months - 1);", /penalty after 20 Jul/],
  ['Filing', "tword:'As filed, locked', tcls:'fil-t-acc',", "tword:'Frozen', tcls:'fil-t-acc',", /renames|old term/],
  ['Filing', "Taxpayer PIN never", "x", null],
  ['Firm', "if (late > 0) return { tword: (o && o.outside)", "if (late > 1000) return { tword: (o && o.outside)", /deadline warnings at 23 Jun/],
  ['Firm', "canWarn: isJo && !!x.r.overdue,", "canWarn: !!x.r.overdue,", /non-admin/],
  ['Firm', "send('assignment', text, { slot:'preparer', assignee: other });", "send('assignment', text, { slot:'preparer' });", /reassign did not emit/],
  ['Firm', "const on = today >= from;", "const on = true;", /active_from/],
  ['Firm', "if (w) return; send('deadline_warning'", "send('deadline_warning'", /sent twice/],
  ['Filing', ".concat(now >= '2026-07-01T16:40' ?", ".concat(false ?", /blocker list on the story clock/],
  ['Firm', ".concat(now >= '2026-07-01T16:40' ?", ".concat(false ?", /blocker list on the story clock/],
  ['Filing', "const BLOCKERS = Array.isArray(P.blockers) ? P.blockers.filter(b => b && typeof b.title === 'string') : FALLBACK_BLOCKERS;", 'const BLOCKERS = FALLBACK_BLOCKERS;', /H3b Filing: blockers prop/],
  ['Firm', "const BLOCKERS = Array.isArray(P.blockers) ? P.blockers.filter(b => b && typeof b.title === 'string') : FALLBACK_BLOCKERS;", 'const BLOCKERS = FALLBACK_BLOCKERS;', /H3b Firm: blockers prop/],
  ['Changes', "const BLOCKERS = Array.isArray(P.blockers) ? P.blockers.filter(b => b && typeof b.title === 'string') : FALLBACK_BLOCKERS;", 'const BLOCKERS = FALLBACK_BLOCKERS;', /H3b Changes: blockers prop/],
  ['Filing', "const STAGE = (typeof P.stage === 'string' && P.stage) ? P.stage :", 'const STAGE = false ? P.stage :', /H3b Filing: stage prop/],
  ['Firm', "const STAGE = (typeof P.stage === 'string' && P.stage) ? P.stage :", 'const STAGE = false ? P.stage :', /H3b Firm: stage prop/],
  ['Firm', "NOWV_PLACEHOLDER", "x", null],
  ['Filing', ": NOW_REJ_PLACEHOLDER", "x", null],
  ['Firm', "NOW_A >= '2026-07-10T20:05' ? 'Approval' : 'Review');", "x", null],
  ['Changes', "|| /(number|ends|card|PIN|account|routing)[^.\\d]{0,24}\\d{3,4}\\b/i.test(t)", "", /Marcus sees identifier digits/],
  ['Firm', "now >= '2026-07-10T20:05' ? 'Approval' : 'Review');", "now >= '2026-07-10T20:05' ? 'Filing' : 'Review');", /standalone stage/],
].filter(m => m[3]);
let caught = 0, missed = 0;
for (const [F, a, b, re] of MUT) {
  if (!real[F].includes(a)) { console.log('  MUTATION SETUP FAIL (text not found):', F, a.slice(0, 60)); missed++; continue; }
  const srcs = { ...real, [F]: real[F].replace(a, b) };
  sink = [];
  try { checkFile(F, srcs[F]); } catch (e) { sink.push('threw ' + e.message); }
  const got = sink; sink = null;
  if (got.some(m => re.test(m))) caught++; else { missed++; console.log('  MUTATION NOT CAUGHT:', F, a.slice(0, 70), '| got', got.slice(0, 3).join(' ; ')); }
}
console.log('mutations caught:', caught, 'of', caught + missed);
process.exit(fail || missed ? 1 : 0);
