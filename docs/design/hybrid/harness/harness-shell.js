// Harness for the hybrid shell (Main.dc.html) and the claim drawer (ClaimDrawer.dc.html).
// Run: node harness-shell.js   (exit code 1 on any failure)
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const DIR = process.env.HS_DIR || path.join(__dirname, 'project');
const ROLES = ['priya', 'marcus', 'daniel', 'helen', 'sam', 'jo', 'ngozi', 'erik', 'next', 'irs'];
const CLIENTS = ['ngozi', 'erik'];
const CLAIMS = ['ca-est', 'atlas', 'rsu', 'theo-ssn', 'heat-pump', 'ext-pay', 'fed-est', 'repairs', 'care-ein', 'iso-lot', 'sehi', 'bright-oak', 'sek-fx', 'form-3520', 'mileage', 'phone-pct', 'sec179', 'payoff-int', 'or-credit', 'excess-ss', 'ca-trace'];
const SHARED = { 'role': 'role', 'dark': 'dark', 'open-claim': 'openClaim', 'go': 'go', 'claim-id': 'claimId', 'revealed': 'revealed', 'reveal': 'reveal', 'reveal-log': 'revealLog', 'as-of': 'asOf', 'as-of-label': 'asOfLabel', 'events': 'events', 'emit': 'emit', 'last-seen': 'lastSeen', 'story-at': 'storyAt' };
const SCREENS = { Home: 'home', ReturnMap: 'map', Areas: 'areas', Documents: 'documents', Checks: 'checks', Review: 'review', Changes: 'changes', Filing: 'filing', Firm: 'firm' };

const failures = [];
let checks = 0;
const fail = (m) => failures.push(m);
const ok = (cond, m) => { checks++; if (!cond) fail(m); };

class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(u) { const p = typeof u === 'function' ? u(this.state, this.props) : u; this.state = Object.assign({}, this.state, p); }
  forceUpdate() {}
}

function load(file, dir) {
  const src = fs.readFileSync(path.join(dir || DIR, file), 'utf8');
  const sm = src.match(/<script type="text\/x-dc" data-dc-script data-props='([^']*)'>([\s\S]*?)<\/script>/);
  if (!sm) throw new Error(file + ': no data-dc-script');
  const body = sm[2];
  // node --check on the extracted class body
  const tmp = path.join(os.tmpdir(), 'hs-' + file.replace(/\W/g, '_') + '.js');
  fs.writeFileSync(tmp, 'class DCLogic {}\n' + body + '\n');
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); checks++; }
  catch (e) { fail(file + ': node --check failed: ' + e.stderr); }
  const Component = new Function('DCLogic', body + '\nreturn Component;')(DCLogic);
  const props = JSON.parse(sm[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
  const xm = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
  const startLine = src.slice(0, src.indexOf('<x-dc>')).split('\n').length;
  // static rules
  ok(src.includes('<script src="./support.js"></script>'), file + ': support.js line missing');
  ok(!src.includes('—'), file + ': contains an em dash');
  ok(/<title>[^<]+<\/title>/.test(src), file + ': no <title>');
  ok(/<div class="\{\{wpClass\}\}">/.test(xm[1]), file + ': root is not <div class="{{wpClass}}">');
  return { file, src, Component, props, markup: xm[1], startLine };
}

// Tokenizer that respects quoted attribute values.
function tokenize(markup, startLine) {
  const out = []; let i = 0; let line = startLine;
  while (i < markup.length) {
    if (markup[i] === '<' && /[a-zA-Z\/!]/.test(markup[i + 1] || '')) {
      let j = i + 1, q = null;
      while (j < markup.length) { const ch = markup[j]; if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '>') break; j++; }
      const t = markup.slice(i, j + 1); out.push({ t, line, tag: true }); line += (t.match(/\n/g) || []).length; i = j + 1;
    } else {
      let j = markup.indexOf('<', i + 1); while (j !== -1 && !/[a-zA-Z\/!]/.test(markup[j + 1] || '')) j = markup.indexOf('<', j + 1);
      if (j === -1) j = markup.length;
      const t = markup.slice(i, j); out.push({ t, line, tag: false }); line += (t.match(/\n/g) || []).length; i = j;
    }
  }
  return out;
}
const tagName = (t) => { const m = t.match(/^<\/?\s*([a-zA-Z][\w-]*)/); return m ? m[1].toLowerCase() : ''; };
const isClose = (t) => /^<\//.test(t);
const attrs = (t) => { const a = {}; const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g; let m; while ((m = re.exec(t))) a[m[1]] = m[3] !== undefined ? m[3] : m[4]; return a; };
function matchClose(toks, i, name) { let d = 0; for (let k = i; k < toks.length; k++) { const x = toks[k]; if (!x.tag || tagName(x.t) !== name) continue; if (isClose(x.t)) { d--; if (d === 0) return k; } else d++; } throw new Error('unclosed <' + name + '> at line ' + toks[i].line); }

function resolve(p, scope) {
  p = p.trim();
  if (p === 'true') return { ok: true, v: true }; if (p === 'false') return { ok: true, v: false };
  if (/^-?\d+(\.\d+)?$/.test(p)) return { ok: true, v: Number(p) };
  if (/^'.*'$|^".*"$/.test(p)) return { ok: true, v: p.slice(1, -1) };
  if (!/^[$\w]+(\.[$\w]+)*$/.test(p)) return { ok: false, v: undefined, why: 'not a dotted path' };
  const parts = p.split('.'); let v = scope[parts[0]];
  for (let k = 1; k < parts.length && v !== undefined && v !== null; k++) v = v[parts[k]];
  return { ok: v !== undefined && v !== null, v };
}

function render(comp, vals, ctx) {
  const toks = tokenize(comp.markup, comp.startLine);
  const errs = [];
  const holeRe = /\{\{([^}]*)\}\}/g;
  const subst = (s, scope, line, where) => s.replace(holeRe, (m, p) => { const r = resolve(p, scope); if (!r.ok) errs.push(comp.file + ':' + line + ' [' + ctx + '] ' + where + ' {{' + p.trim() + '}} is ' + (r.why || String(r.v))); return r.ok ? String(r.v) : ''; });
  let text = '';
  function walk(a, b, scope, live, skipText) {
    for (let i = a; i < b; i++) {
      const x = toks[i];
      if (!x.tag) { const s = subst(x.t, scope, x.line, 'text'); if (live && !skipText) text += s; continue; }
      const name = tagName(x.t); if (isClose(x.t) || x.t.startsWith('<!')) continue;
      const at = attrs(x.t);
      if (name === 'sc-for') {
        const j = matchClose(toks, i, 'sc-for');
        const r = resolve((at.list || '').replace(/[{}]/g, ''), scope);
        if (!r.ok || !Array.isArray(r.v)) errs.push(comp.file + ':' + x.line + ' [' + ctx + '] sc-for list ' + at.list + ' is not an array');
        else r.v.forEach((it, idx) => walk(i + 1, j, Object.assign({}, scope, { [at.as]: it, $index: idx }), live, skipText));
        if (!at['hint-placeholder-count']) errs.push(comp.file + ':' + x.line + ' sc-for without hint-placeholder-count');
        i = j; continue;
      }
      if (name === 'sc-if') {
        const j = matchClose(toks, i, 'sc-if');
        const r = resolve((at.value || '').replace(/[{}]/g, ''), scope);
        if (r.v === undefined || r.v === null) errs.push(comp.file + ':' + x.line + ' [' + ctx + '] sc-if ' + at.value + ' is undefined');
        if (!at['hint-placeholder-val']) errs.push(comp.file + ':' + x.line + ' sc-if without hint-placeholder-val');
        walk(i + 1, j, scope, live && !!r.v, skipText); i = j; continue;
      }
      for (const [k, v] of Object.entries(at)) {
        subst(v, scope, x.line, '<' + name + ' ' + k + '>');
        const whole = v.match(/^\{\{([^}]*)\}\}$/);
        if (/^on[A-Z]/.test(k)) { if (!whole) errs.push(comp.file + ':' + x.line + ' ' + k + ' is not a whole-value hole'); else { const r = resolve(whole[1], scope); if (typeof r.v !== 'function') errs.push(comp.file + ':' + x.line + ' [' + ctx + '] ' + k + ' {{' + whole[1].trim() + '}} is not a function'); } }
      }
      if (name === 'style' || name === 'select' || name === 'helmet' || name === 'svg') { const j = matchClose(toks, i, name); walk(i + 1, j, scope, live, true); i = j; continue; }
      if (live && !skipText && /^(div|p|li|section|h1|h2|h3|button|label|header|nav|aside|main)$/.test(name)) text += ' ';
    }
  }
  walk(0, toks.length, vals, true, false);
  return { errs, text: text.replace(/\s+/g, ' ').trim(), toks };
}

const CLIENT_LEAK = [/\bD\d{2}\b/, /\bev-\d{4}\b/, /\bqa-\d+\b/, /\bcall-\d+\b/, /\b(F1040|F540NR|SchA|SchC|SchE|Sch3|F8949|F2441|F6251|F8812)\.[\w]/, /Priya|Marcus|Daniel|Helen|Sam Adeyemi|Jo Kimura/, /tax effect/i, /\bR-[A-Z]/, /audit trail/i, /Blocking|should be/, /\bv[123]\b/];
const IRS_LEAK = [/blocking/i, /should be/i, /tax effect/i, /what is open/i, /check failed/i, /mismatch/i, /F540NR/i, /\bFTB\b/i, /needs review/i, /sign off/i, /adjust/i, /dismiss/i, /california/i, /\bengine\b/i, /\breason\b/i, /proposed/i, /\bv3\b/i];
// H3: one story clock. NAT is the story time each role is exercised at (working roles: v3 computed; Sam and next year: tl-28; examiner: tl-29).
const ASOF = { priya: '2026-06-23T06:05', marcus: '2026-06-23T06:05', daniel: '2026-06-23T06:05', helen: '2026-06-23T06:05', jo: '2026-06-23T06:05', ngozi: '2026-06-23T06:05', erik: '2026-06-23T06:05', sam: '2027-01-15T15:00', next: '2027-01-15T15:00', irs: '2028-01-26T15:00' };
// H3: the renamed sign action names Form 8879 before it happens (term E), so the 8879 pattern now matches only the signing having happened.
const LATER = [/\bD71\b/, /13 Jul/, /3 Aug 2026/, /signed (Form )?(FTB )?8879|8879s? (were |was )?signed/i, /\bD72\b/, /rejected/i, /his card/];
const scan = (text, pats, ctx) => pats.forEach(p => { checks++; const m = text.match(p); if (m) fail('[' + ctx + '] leak ' + p + ' matched "' + text.slice(Math.max(0, m.index - 40), m.index + 40) + '"'); });

// ---------- ClaimDrawer ----------
const drw = load('ClaimDrawer.dc.html');
let drawerRenders = 0;
function drawerVals(props, setup) {
  const c = new drw.Component(props); if (setup) setup(c); return { c, v: c.renderVals() };
}
const noop = () => {};
for (const role of ROLES) {
  for (const claimId of ['', ...CLAIMS, 'noncash', 'no-such-claim']) {
    for (const revealed of [[], ['ssn-theo', 'ssn-ada']]) {
      const ctx = 'drawer ' + role + ' ' + (claimId || '(none)') + (revealed.length ? ' revealed' : '');
      let v;
      try { v = drawerVals({ role, claimId, dark: role === 'jo', openClaim: noop, go: noop, revealed, reveal: noop, revealLog: [], asOf: ASOF[role], asOfLabel: '' }).v; }
      catch (e) { fail('[' + ctx + '] renderVals threw: ' + e.stack); continue; }
      drawerRenders++;
      const r = render(drw, v, ctx); r.errs.forEach(fail); checks++;
      if (process.env.HS_DUMP && ctx === process.env.HS_DUMP) console.log('DUMP ' + ctx + ': ' + r.text);
      if (CLIENTS.includes(role) && claimId) scan(r.text, CLIENT_LEAK, ctx);
      if (role === 'irs' && claimId) scan(r.text, IRS_LEAK, ctx);
      if (ASOF[role] < '2026-07-13' && claimId) scan(r.text, LATER, ctx + ' (asOf ' + ASOF[role] + ')');
      if (claimId === '') ok(r.text.includes('Select any number to see where it came from'), '[' + ctx + '] empty state text missing');
      if (CLAIMS.includes(claimId) && role !== 'irs') ok(v.has === true, '[' + ctx + '] claim not shown');
    }
  }
}
// standalone (no props at all) renders a claim
{ const v = drawerVals({}).v; const r = render(drw, v, 'drawer standalone'); r.errs.forEach(fail); ok(v.has && v.D.title.length > 0, 'standalone drawer shows no claim'); drawerRenders++; }
// behaviour
{
  const calls = []; const mk = (role, claimId, revealed) => drawerVals({ role, claimId, openClaim: noop, go: noop, revealed: revealed || [], reveal: k => calls.push([role, k]), revealLog: [], asOf: ASOF[role] }).v;
  const m = mk('marcus', 'theo-ssn'); ok(m.D.ids.length === 2 && m.D.ids.every(k => k.ad === 'true'), 'marcus Reveal not disabled');
  ok(m.maskNote.includes('No sensitive-data clearance') && m.maskNote.includes('every unmasked view is logged'), 'marcus reason or rule quote missing');
  ok(m.acts[0].ad === 'true', 'marcus can adjust Theo’s SSN without clearance');
  const p = mk('priya', 'theo-ssn'); p.D.ids[0].go(); ok(calls.some(c => c[0] === 'priya' && c[1] === 'ssn-theo'), 'priya Reveal does not call reveal(ssn-theo)');
  ok(/XXX-XX-\d{4}/.test(p.D.value) && p.D.ids.every(k => /^XXX-XX-\d{4}$/.test(k.shown)), 'SSNs not masked to last 4');
  const pr = mk('priya', 'theo-ssn', ['ssn-theo']); ok(pr.D.ids[0].stateWord === 'Revealed this session' && pr.D.ids[1].stateWord === 'Masked', 'revealed state wrong');
  const d = mk('daniel', 'ext-pay'); const so = d.acts.find(a => a.label === 'Sign off'); ok(so && so.ad === 'true' && /may not review or sign off on work they prepared/.test(so.reason), 'Daniel self-review rule not enforced on ext-pay');
  const di = mk('daniel', 'iso-lot'); ok(di.acts.find(a => a.label === 'Sign off').ad === 'false', 'Daniel cannot sign off a prepared item');
  const h = mk('helen', 'ca-est'); ok(h.acts.some(a => a.label === 'Partner sign-off') && /partner sign-off/.test(h.ruleNote), 'Helen partner rule missing');
  const e = mk('marcus', 'care-ein'); ok(e.D.value === '74-3829516' && e.D.ids.length === 0, 'EIN masked or given a reveal');
  ok(mk('irs', 'rsu').notFound === true && mk('irs', 'atlas').D.value === '$151,300', 'examiner scope wrong');
  ok(mk('ngozi', 'theo-ssn').D.need.includes('ends in 3390, as on last year\u2019s return'), 'client Theo ask wording');
  ok(mk('priya', 'theo-ssn').D.title === 'Theo\u2019s SSN differs from his 2024 return' && mk('sam', 'theo-ssn').D.title === 'Theo\u2019s SSN differed from his 2024 return and his card', 'Theo wording by asOf');
  ok(!mk('helen', 'fed-est').acts.some(a => /Partner/.test(a.label)) && mk('priya', 'fed-est').D.effectNote.includes('not over 1,000'), 'fed-est partner rule');
  ok(mk('priya', 'noncash').D.statusWord === 'Adjustment' && mk('priya', 'noncash').D.effectNote.includes('reviewer sign-off is enough') && mk('irs', 'noncash').D.value === '$17,400', 'noncash adjustment');
  ok(['ca-est','atlas','rsu','theo-ssn','heat-pump','fed-est','care-ein','noncash'].every(id => mk('sam', id).D.statusWord === 'Adjusted' || id === 'heat-pump') && mk('sam','ext-pay').D.statusWord !== 'Adjusted', 'adjustment list for Sam');
  ok([...CLAIMS, 'noncash'].filter(id => mk('sam', id).D.statusWord === 'Adjusted').length === 7 && mk('sam', 'heat-pump').D.statusWord === 'Decided' && ['sehi','bright-oak','sek-fx','form-3520','mileage','phone-pct','sec179','payoff-int','or-credit','excess-ss','ca-trace'].every(id => mk('sam', id).D.statusWord === 'Resolved before filing' && mk('sam', id).D.valueEx === true), 'Areas claims read Resolved before filing (Example) for Sam; 8 adjustments unchanged');
  ok(mk('priya', 'noncash').D.effect === 'About +806 federal, +149 California (estimate at v3 rates, Example).' && mk('priya', 'noncash').D.effectNote === 'Under 1,000, so reviewer sign-off is enough.' && !mk('helen', 'noncash').acts.some(a => /Partner/.test(a.label)), 'noncash tax effect wording');
  ok(['priya', 'sam', 'next'].every(r => JSON.stringify(mk(r, 'heat-pump').D).includes('Authority to confirm: Treas. Reg. 1.263(a)-3 (Example)')), 'heat-pump authority wording in working and filed views');
  ok(mk('irs', 'sehi').notFound === true, 'examiner cannot reach Areas claims');
  ok(mk('jo', 'atlas').acts.every(a => !/Adjust|Sign off|Mark prepared/.test(a.label)), 'Jo has value actions');
  ok(mk('sam', 'atlas').D.checked[0].type.startsWith('Signed:'), 'Sam sign-offs not "Signed"');
}

// ---------- Shell ----------
const sh = load('Main.dc.html');
let shellRenders = 0;
// dc-import wiring
{
  const imports = [...sh.markup.matchAll(/<dc-import\s([^>]*)><\/dc-import>/g)].map(m => attrs('<x ' + m[1] + '>'));
  const names = imports.map(a => a.name).sort();
  ok(JSON.stringify(names) === JSON.stringify([...Object.keys(SCREENS), 'ClaimDrawer'].sort()), 'dc-import names: ' + names.join(','));
  for (const a of imports) for (const [attr, prop] of Object.entries(SHARED)) ok(a[attr] === '{{' + prop + '}}', 'dc-import ' + a.name + ' passes ' + attr + '="' + a[attr] + '"');
  const roleSel = sh.markup.match(/<select[^>]*value="\{\{role\}\}"[\s\S]*?<\/select>/)[0];
  const opts = [...roleSel.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m => m[1]);
  ok(JSON.stringify(opts) === JSON.stringify(ROLES), 'switcher option order: ' + opts.join(' '));
  ok(/<select[^>]*value="\{\{role\}\}"/.test(sh.markup) && !/selected=/.test(sh.markup), 'select value binding');
}
function shell() { return new sh.Component({}); }
// Put a fresh shell at a role's natural story time through the real clock (materializes the replayed events).
function at(role, c) { c = c || shell(); if (ASOF[role] !== c.state.storyAt) c.moveStory(ASOF[role], 'harness'); c.setState({ role, toast: null }); return c; }
const visible = { ngozi: ['home', 'documents', 'filing'], erik: ['home', 'documents', 'filing'], irs: ['filing', 'documents'] };
for (const role of ROLES) {
  for (const screen of (visible[role] || Object.values(SCREENS))) {
    for (const chat of [false, true]) {
      const ctx = 'shell ' + role + ' ' + screen + (chat ? ' chat' : '');
      const c = at(role); c.state = Object.assign({}, c.state, { screen, chat, claimId: 'atlas' });
      let v; try { v = c.renderVals(); } catch (e) { fail('[' + ctx + '] renderVals threw: ' + e.stack); continue; }
      shellRenders++;
      const r = render(sh, v, ctx); r.errs.forEach(fail); checks++;
      if (process.env.HS_DUMP && ctx === process.env.HS_DUMP) console.log('DUMP ' + ctx + ': ' + r.text);
      ok(v.scr[screen] === true && Object.values(v.scr).filter(Boolean).length === 1, '[' + ctx + '] one screen mounted');
      ok(v.nav.length === (visible[role] || Object.values(SCREENS)).length, '[' + ctx + '] nav count');
      if (CLIENTS.includes(role)) scan(r.text, CLIENT_LEAK, ctx);
      if (role === 'irs') { scan(r.text, IRS_LEAK, ctx); ok(v.chat.show === false, 'chat shown to examiner'); }
      if (chat && CLIENTS.includes(role)) ok(r.text.includes('Which of my California payments count for 2025?') && !r.text.includes('[Source'), 'client chat wording');
      if (chat && role === 'priya') ok(r.text.includes('totalling 10,500 [Source: D68]. The 15 Sep 2025 payment is marked tax year 2024 on the document.') && r.text.includes('Preview, later round'), 'staff chat wording: ' + r.text.slice(r.text.indexOf('Which'), r.text.indexOf('Which') + 260));
      ok(/(none of our changes applied yet|As filed: the return as this workpaper finalized it|Draft, being prepared by your tax team|Your filed return)/.test(r.text) && r.text.includes(['sam','next','irs'].includes(role) ? 'Stage Filed' : 'Stage Review') && r.text.includes('Saved'), '[' + ctx + '] header version/stage/saved');
      ok(v.asOf === ASOF[role] && typeof v.asOfLabel === 'string' && v.asOfLabel.length > 0, '[' + ctx + '] asOf');
      if (ASOF[role] < '2026-07-13') scan(r.text, LATER, ctx);
      if (['sam', 'next', 'irs'].includes(role)) ok(!r.text.includes('none of our changes applied'), '[' + ctx + '] after-filing role says none applied');
    }
  }
}
// shell behaviour
{
  const pick = (c, r) => c.renderVals().pickRole({ target: { value: r } });
  let c = shell(); let v = c.renderVals();
  ok(c.state.role === 'daniel' && v.role === 'daniel' && c.state.screen === 'home' && c.state.claimId === '', 'defaults');
  ok(c.state.revealLog.length === 3 && c.state.revealLog.every(r => r.example === true) && new Set(c.state.revealLog.map(r => r.who)).size === 3 && new Set(c.state.revealLog.map(r => r.what)).size === 3, 'seed log rows: 3 Example, distinct people and identifiers');
  pick(c, 'marcus'); const before = JSON.stringify(c.state); c.renderVals().reveal('ssn-theo'); ok(JSON.stringify(c.state) === before, 'marcus reveal changed state');
  pick(c, 'priya'); c.renderVals().reveal('ssn-theo'); c.renderVals().reveal('ssn-theo');
  const last = c.state.revealLog[c.state.revealLog.length - 1];
  ok(c.state.revealed.join() === 'ssn-theo' && c.state.revealLog.length === 4, 'priya reveal once: ' + JSON.stringify(c.state.revealed) + ' log ' + c.state.revealLog.length);
  ok(last.who === 'Priya Raman, preparer' && last.what === 'Theo’s SSN' && last.when === 'this session' && last.example === false && !/\d{4}/.test(JSON.stringify(last)), 'log row shape: ' + JSON.stringify(last));
  c.renderVals().reveal('bank-refund'); ok(c.state.revealLog.length === 5 && c.state.revealLog[4].what === 'Refund bank account number', 'second identifier logged');
  pick(c, 'ngozi'); c.renderVals().reveal('ssn-ada'); ok(c.state.revealLog[5] && c.state.revealLog[5].who === 'Ngozi Okafor, client', 'client reveal logged');
  pick(c, 'irs'); c.renderVals().reveal('ip-pin-ngozi'); ok(c.state.revealLog[6] && c.state.revealLog[6].who === 'IRS examiner', 'examiner reveal logged');
  c = shell(); c.renderVals().go('checks'); ok(c.state.screen === 'checks', 'go(checks)');
  c.renderVals().openClaim('rsu'); ok(c.state.claimId === 'rsu', 'openClaim');
  pick(c, 'ngozi'); ok(c.state.screen === 'home', 'ngozi from checks lands on home: ' + c.state.screen);
  c.renderVals().go('map'); ok(c.state.screen === 'home', 'ngozi go(map) not refused');
  c.renderVals().go('filing'); pick(c, 'irs'); ok(c.state.screen === 'filing', 'irs keeps filing');
  ok(c.state.claimId === '', 'irs: non-examined claim not cleared');
  c = shell(); c.renderVals().go('firm'); c.renderVals().openClaim('atlas'); pick(c, 'irs'); ok(c.state.screen === 'filing' && c.state.claimId === 'atlas', 'irs lands on filing, keeps atlas');
  pick(c, 'jo'); ok(c.state.screen === 'filing', 'jo keeps a visible screen');
  c = shell(); c.renderVals().openClaim('ca-est'); c.renderVals().openClaim(''); ok(c.state.claimId === '', 'close drawer');
  c = shell(); c.setState({ role: 'priya' }); c.renderVals().reveal('ssn-theo'); const fv = c.renderVals(); ok(fv.history !== undefined, 'history'); c.setState({ screen: 'firm' });
  const fr = render(sh, c.renderVals(), 'shell firm after reveal'); ok(fr.text.includes('revealed Theo’s SSN') && fr.text.includes('this session'), 'firm history shows the live reveal');
}

// ---------- Search (round H2) ----------
{
  const SSN_SHAPED = ['900-00-3390', '900003390', 'XXX-XX-3390', '666-74', '666 74 3390', '123456789'];
  const LAST4 = ['3390', '3309', '1106', '2287', '9134', '9276', '2915', '0017'];
  const IDENT = /\d{3}-\d{2}-\d{4}|(^|\D)\d{9}(\D|$)|\b(2287|9134|1106|3309|3390|9276|0017|2915)\b/;
  const guard = (Comp) => ROLES.every(role => { const c = new Comp({}); if (ASOF[role] !== c.state.storyAt) c.moveStory(ASOF[role], 'harness'); c.state = Object.assign({}, c.state, { role }); const v = c.renderVals(); return Array.isArray(v.searchIndex) && v.searchIndex.length > 0 && !v.searchIndex.some(t => IDENT.test(t)); });
  ok(guard(sh.Component), 'search index holds an SSN, bank, account or IP PIN digit run');
  { // planted: a real SSN in the index must make the guard fail
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-plant-'));
    fs.writeFileSync(path.join(tmp, 'Main.dc.html'), sh.src.replace("'theo-ssn': '',", "'theo-ssn': '900-00-3390',"));
    const planted = load('Main.dc.html', tmp); ok(sh.src.includes("'theo-ssn': '',") && guard(planted.Component) === false, 'planted SSN in the search index was NOT caught'); }
  const run = (role, q) => { const c = at(role); c.state = Object.assign({}, c.state, { screen: (visible[role] || ['home'])[0], q }); const v = c.renderVals(); const r = render(sh, v, 'search ' + role + ' "' + q + '"'); r.errs.forEach(fail); checks++; return { c, v, r }; };
  for (const role of ROLES) {
    for (const g of SSN_SHAPED) { const { v } = run(role, g); ok(v.search.groups.length === 0 && /not searchable/.test(v.search.note), '[search ' + role + '] SSN-shaped "' + g + '" returned results or no refusal note'); }
    for (const g of LAST4) { const { v } = run(role, g); ok(v.search.groups.length === 0, '[search ' + role + '] last-4 guess "' + g + '" matched something'); }
    for (const q of ['theo', 'california', 'payment', 'business', 'mileage', 'social security card', 'D68', 'gross', 'engagement']) {
      const { v, r } = run(role, q);
      const labels = v.search.groups.flatMap(g => g.items.map(i => i.label + ' ' + i.sub)).join(' | ');
      if (CLIENTS.includes(role)) { scan(r.text, CLIENT_LEAK, 'search ' + role + ' "' + q + '"'); ok(v.search.groups.every(g => ['Your questions', 'Your documents'].includes(g.name)), '[search ngozi] group outside her scope: ' + labels); ok(!/Engagement letter|IRS account transcript/i.test(labels), '[search ngozi] firm document: ' + labels); }
      if (role === 'irs') { scan(r.text, IRS_LEAK, 'search irs "' + q + '"'); ok(v.search.groups.every(g => ['Items under examination', 'Documents cited'].includes(g.name)), '[search irs] group outside scope'); }
      if (ASOF[role] < '2026-07-13') ok(!/Social Security card/i.test(labels), '[search ' + role + '] D71 found before it arrived');
      if (['ngozi', 'erik', 'irs'].includes(role)) ok(!v.search.groups.some(g => g.name === 'Areas' || g.name === 'Checks'), '[search ' + role + '] areas or checks offered');
    }
  }
  let t = run('priya', 'mileage'); const num = t.v.search.groups.find(g => g.name === 'Numbers'); ok(num && num.items[0].label === 'Mileage log page counted twice', 'search mileage finds the claim');
  num.items[0].pick(); ok(t.c.state.claimId === 'mileage' && t.c.state.q === '', 'picking a number opens the drawer and clears the query');
  t = run('daniel', 'business'); const ar = t.v.search.groups.find(g => g.name === 'Areas'); ok(!!ar, 'staff search finds the Business area'); ar.items[0].pick(); ok(t.c.state.screen === 'areas', 'picking an area goes to Areas');
  t = run('sam', 'social security card'); ok(t.v.search.groups.some(g => g.name === 'Documents'), 'sam finds D71 after it arrived');
  t = run('ngozi', 'theo'); ok(t.v.search.groups[0].name === 'Your questions' && t.v.search.groups[0].items[0].label === 'Theo’s Social Security number', 'client finds her Theo question');
  t = run('irs', 'gross'); ok(t.v.search.groups[0].items[0].label === 'Schedule C gross receipts, line 1', 'examiner finds the Letter 566 item');
  for (const a of ['3500', '3,500', '13,000', '$13,000', '74-3829156', '68-0412257']) { const x = run('priya', a); ok(x.v.search.groups.some(g => g.name === 'Numbers' && g.count > 0), 'staff amount/EIN search "' + a + '" found nothing'); }
  ok(run('priya', '3500').v.search.groups[0].items[0].label === 'California estimates include a 2024 payment', 'amount 3500 finds the CA estimates');
  ok(run('priya', '35').v.search.groups.length === 0, 'partial amount 35 should not match 3,500');
  ok(run('ngozi', '3,500').v.search.groups[0].items[0].label === 'Your California payment on 15 Sep 2025', 'client amount search');
  ok(run('irs', '151,300').v.search.groups[0].items[0].label === 'Schedule C gross receipts, line 1' && run('irs', '163,700').v.search.groups.length === 0, 'examiner amounts: filed values only');
  t = run('irs', 'california'); ok(t.v.search.groups.length === 0, 'examiner search reaches California');
  const n = shell(); n.renderVals().go('areas'); ok(n.state.screen === 'areas', 'go(areas) for staff'); n.renderVals().pickRole({ target: { value: 'ngozi' } }); ok(n.state.screen === 'home', 'ngozi leaves areas');
  const nav = (() => { const c = shell(); return c.renderVals().nav.map(x => x.label).join(', '); })();
  ok(nav === 'Home, Return map, Areas, Documents, Checks, Review, Changes, Filing and after, Firm', 'nav order: ' + nav);
}

// ---------- Round H3: story clock, events, bell, toast, colleague, Erik, attribution ----------
let h3Mut = 0;
{
  // mutant(from, to): a copy of Main with one change; each guard below must pass on Main and fail on its mutant.
  const mutant = (from, to) => {
    if (!sh.src.includes(from)) { fail('mutation anchor not found: ' + from.slice(0, 80)); return null; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-h3-'));
    fs.writeFileSync(path.join(tmp, 'Main.dc.html'), sh.src.replace(from, to));
    return load('Main.dc.html', tmp).Component;
  };
  const prove = (name, guard, from, to) => {
    let g; try { g = guard(sh.Component); } catch (e) { g = false; fail('[h3 ' + name + '] threw: ' + e.stack); }
    ok(g === true, '[h3 ' + name + '] guard fails on Main');
    const M = mutant(from, to); if (!M) return;
    let gm; try { gm = guard(M); } catch (e) { gm = false; }
    h3Mut++; ok(gm === false, '[h3 ' + name + '] mutation NOT caught: ' + from.slice(0, 60) + ' -> ' + to.slice(0, 60));
  };
  const mk = (C) => new C({});
  const pickR = (c, r) => c.renderVals().pickRole({ target: { value: r } });
  const STRIP = /\b\d{5}\b/;

  // A. Story clock: default, Play steps to the next packet event, 29 jump targets, asOf = storyAt.
  prove('clock default and play', (C) => { const c = mk(C); let v = c.renderVals();
    if (v.storyAt !== '2026-06-23T06:05' || v.asOf !== v.storyAt || v.clock.label !== '23 Jun 2026, 06:05') return false;
    v.playSeason(); v = c.renderVals();
    const last = c.state.events.slice(-2);
    return v.storyAt === '2026-06-30T18:02' && v.asOf === '2026-06-30T18:02' && last[0].src === 'tl-18' && last[0].replayed === true && last[1].type === 'clock' && /Play the season/.test(last[1].text); },
    "const n = D.TL.find(t => t.at > this.state.storyAt); if (n)", "const n = D.TL.find(t => t.at > '2099'); if (n)");
  prove('29 timeline events incl. extension', (C) => { const v = mk(C).renderVals(); const ids = v.clock.options.map(o => o.id);
    return ids.length === 29 && ids.includes('extension-2026-04-14') && ids.filter(i => /^tl-\d\d$/.test(i)).length === 28 && !ids.includes('tl-13'); },
    "      ['extension-2026-04-14', '2026-04-14T15:00',", "      ['extension-X', '2026-04-14T15:00',");
  prove('future jump labels carry no content', (C) => { const v = mk(C).renderVals(); return v.clock.options.filter(o => /later in the story/.test(o.label)).every(o => /^\d{1,2} \w{3} \d{4}, \d\d:\d\d \(later in the story\)$/.test(o.label)) && v.clock.options.some(o => /later in the story/.test(o.label)); },
    "if (t.at > storyAt) return fmtAt(t.at) + ' (later in the story)';", "if (t.at > storyAt) return fmtAt(t.at) + ' ' + t.text + ' (later in the story)';");
  // Stage word from the clock.
  prove('stage from storyAt', (C) => { const st = (a) => { const c = mk(C); c.moveStory(a, 'h'); return c.renderVals().R.stage; };
    return mk(C).renderVals().R.stage === 'Review' && st('2026-07-10T20:05') === 'Approval' && st('2026-07-13T17:04') === 'Filing' && st('2026-07-14T16:22') === 'Filed' && st('2026-07-14T16:21') === 'Filing'; },
    "T_ACC: '2026-07-14T16:22'", "T_ACC: '2026-07-14T16:20'");
  prove('working role later sees As filed, locked', (C) => { const c = mk(C); c.moveStory('2026-07-14T16:22', 'h'); pickR(c, 'priya'); const v = c.renderVals(); const r = render({ ...sh, Component: C }, v, 'h3 priya filed');
    return v.R.snapshot === true && r.text.includes('As filed, locked') && v.R.version === 'As filed: the return as this workpaper finalized it' && /^As filed, locked/.test(v.R.banner); },
    "const banner = R0.client || R0.staffAfter || !filed ? R0.banner : (R0.lockedBanner || LOCKED);", "const banner = R0.banner;");
  // Roles exist from a time.
  prove('sam joins on 4 Jan 2027', (C) => { const c = mk(C); pickR(c, 'sam'); let v = c.renderVals(); const r = render({ ...sh, Component: C }, v, 'h3 sam early'); r.errs.forEach(fail);
    if (!(v.notYet.show && v.notYet.text === 'Sam joins on 4 Jan 2027' && v.notYet.btn === 'Move the story to 4 Jan 2027' && v.nav.length === 0 && Object.values(v.scr).every(x => !x) && v.claimId === '' && v.events.length === 0)) return false;
    v.notYet.move(); v = c.renderVals(); return v.storyAt === '2027-01-04T15:00' && !v.notYet.show && v.nav.length === 9 && v.R.stage === 'Filed'; },
    "sam: '2027-01-04T15:00', next:", "sam: '2026-01-04T15:00', next:");
  ok((() => { const c = shell(); pickR(c, 'irs'); const v = c.renderVals(); return v.notYet.text === 'The examiner’s Letter 566 arrives on 26 Jan 2028' && v.notYet.btn === 'Move the story to 26 Jan 2028'; })(), '[h3] examiner notice');
  ok((() => { const c = shell(); pickR(c, 'next'); const v = c.renderVals(); return v.notYet.btn === 'Move the story to 15 Jan 2027'; })(), '[h3] next year notice');

  // B. Events: seeded, monotonic seq, replayed flag, Example tags, emit appends at storyAt.
  ok((() => { const c = shell(); const e = c.state.events; return e.length > 20 && e.every((x, i) => x.seq === i + 1) && e.every(x => x.replayed) && e.some(x => x.src === 'tl-17') && !e.some(x => x.src === 'tl-18') && e.filter(x => x.example).length === 3; })(), '[h3] seeded events');
  prove('emit appends', (C) => { const c = mk(C); pickR(c, 'priya'); const n = c.state.events.length; const r = c.renderVals().emit({ type: 'prepared', text: 'marked wages prepared', who: 'helen' });
    const e = c.state.events[c.state.events.length - 1]; return r === n + 1 && c.state.events.length === n + 1 && e.seq === n + 1 && e.at === c.state.storyAt && e.who === 'priya' && e.whoName === 'Priya Raman' && e.by === 'priya'; },
    "who: role, whoName: K.NAMES[role] || role, by: role, type: String", "who: ev.who || role, whoName: K.NAMES[role] || role, by: role, type: String");
  prove('undo marks withdrawn', (C) => { const c = mk(C); pickR(c, 'priya'); const r = c.renderVals().emit({ type: 'adjustment', claimId: 'atlas', text: 'adjusted' }); c.renderVals().emit({ type: 'undo', retracts: r, text: 'undid' });
    const v = c.renderVals(); return typeof r === 'number' && v.events.find(e => e.seq === r).withdrawn === true && v.events[v.events.length - 1].retracts === r; },
    "withdrawn: retracted.has(e.seq), assignee", "withdrawn: false, assignee");
  prove('undo after a sign-off goes stale', (C) => { const c = mk(C); pickR(c, 'priya'); const r = c.renderVals().emit({ type: 'adjustment', claimId: 'atlas' }); pickR(c, 'daniel'); c.renderVals().emit({ type: 'signoff', claimId: 'atlas' }); pickR(c, 'priya'); c.renderVals().emit({ type: 'undo', retracts: r });
    const st = c.state.events.filter(e => e.type === 'signoff_stale'); return st.length === 1 && st[0].to[0] === 'daniel' && st[0].text === 'Stale: the item you signed was withdrawn'; },
    "if (orig && CHG.includes(orig.type)) more", "if (false) more");
  prove('filed record refuses changes', (C) => { const c = mk(C); c.moveStory('2026-07-20T14:00', 'h'); pickR(c, 'priya'); const n = c.state.events.length; const r = c.renderVals().emit({ type: 'adjustment', claimId: 'atlas' });
    return r === 0 && /As filed, locked/.test(c.lastRefusal) && c.state.events.length === n; },
    "if (filed && changes) {", "if (false && changes) {");

  // lastSeen: leaving a role advances it; a late joiner never sees earlier work as new.
  prove('lastSeen per person', (C) => { const c = mk(C); const s0 = c.state.lastSeen.daniel; pickR(c, 'priya'); const s1 = c.state.lastSeen.daniel; c.renderVals().emit({ type: 'adjustment', claimId: 'atlas', text: 'x' });
    pickR(c, 'daniel'); const v = c.renderVals(); const newer = v.events.filter(e => e.seq > v.lastSeen.daniel);
    const c2 = mk(C); c2.moveStory('2027-01-04T15:00', 'h'); const v2 = c2.renderVals(); const pre = c2.state.events.filter(e => e.at < '2027-01-04T15:00').reduce((m, e) => Math.max(m, e.seq), 0);
    return s0 < s1 && newer.length === 1 && newer[0].type === 'adjustment' && v2.lastSeen.sam >= pre; },
    "lastSeen: Object.assign({}, s.lastSeen, { [s.role]: this._seq }) };", "lastSeen: s.lastSeen };");

  // Recipient rules, one case per rule in the brief.
  const R = (C, ev) => { const c = mk(C); return c.rec(Object.assign({ at: '2026-06-23T06:05', by: 'priya' }, ev)).join(' '); };
  prove('recipient rules', (C) =>
    R(C, { type: 'assignment', assignee: 'marcus' }) === 'marcus' &&
    R(C, { type: 'review_note', by: 'daniel', to: ['marcus'] }) === 'priya marcus' &&
    R(C, { type: 'signoff_stale', by: '', to: ['daniel'] }) === 'daniel' &&
    R(C, { type: 'adjustment', claimId: 'ca-est' }) === 'daniel helen' && R(C, { type: 'adjustment', claimId: 'fed-est' }) === 'daniel' && R(C, { type: 'proposal', claimId: 'sehi', overThreshold: true }) === 'daniel helen' &&
    R(C, { type: 'question_to_client', to: ['erik'] }) === 'erik' && R(C, { type: 'question_to_client', to: 'both' }) === 'ngozi erik' && R(C, { type: 'question_to_client', to: 'ngozi' }) === 'ngozi' && R(C, { type: 'question', claimId: 'theo-ssn' }) === 'ngozi' && R(C, { type: 'question', claimId: 'atlas' }) === 'erik' &&
    R(C, { type: 'question', claimId: 'crypto-c6' }) === 'erik' && R(C, { type: 'question', claimId: 'gift-brigid' }) === 'ngozi' && R(C, { type: 'question', claimId: 'salt-d02' }) === 'ngozi erik' && R(C, { type: 'question', claimId: 'ext-pay' }) === 'ngozi erik' && R(C, { type: 'question', claimId: 'repairs' }) === 'ngozi' &&
    R(C, { type: 'clock' }) === '' &&
    R(C, { type: 'client_answer', by: 'erik' }) === 'priya' &&
    R(C, { type: 'efile_rejected', by: '' }) === 'priya daniel ngozi erik' &&
    R(C, { type: 'approval_requested', by: 'daniel' }) === 'helen' &&
    R(C, { type: 'client_approval_requested', by: 'helen' }) === 'ngozi erik' &&
    R(C, { type: 'deadline', by: '', to: ['daniel'] }) === 'daniel jo' &&
    R(C, { type: 'prepared', itemIds: ['a', 'b'] }) === 'daniel' &&
    R(C, { type: 'area-reviewed', by: 'daniel' }) === 'priya' && R(C, { type: 'document_attached', by: 'erik' }) === 'priya' &&
    R(C, { type: 'some_unknown_type', to: ['helen'] }) === '' && R(C, { type: 'edit' }) === '' &&
    R(C, { type: 'notice', src: 'tl-29', at: '2028-01-26T15:00', by: '', to: ['helen', 'sam', 'ngozi'] }) === 'helen sam ngozi' &&
    R(C, { type: 'quality_review', src: 'tl-27', at: '2026-06-23T06:05', by: '', to: ['sam', 'helen'] }) === 'helen',
    "case 'efile_rejected': add('priya', 'daniel', 'ngozi', 'erik'); break;", "case 'efile_rejected': add('priya', 'daniel', 'ngozi'); break;");

  // Per-recipient wording at read time.
  prove('marcus never sees identifier digits', (C) => { const c = mk(C); pickR(c, 'priya'); c.renderVals().emit({ type: 'adjustment', claimId: 'theo-ssn', text: 'corrected Theo’s SSN to XXX-XX-3390', ident: true }); pickR(c, 'marcus');
    const v = c.renderVals(); const e = v.events[v.events.length - 1]; return e.text === 'an identifier was corrected' && !/\d{4}/.test(e.text + e.who + (e.before || '') + (e.after || '')); },
    "else if (r === 'marcus' && (e.ident ||", "else if (r === 'nobody' && (e.ident ||");
  prove('clients: plain words, own items only', (C) => { const c = mk(C); c.moveStory('2026-07-13T17:04', 'h'); pickR(c, 'priya'); c.renderVals().emit({ type: 'question_to_client', to: ['erik'], claimId: 'atlas', text: 'Ask Erik about Atlas card sales (D21)', clientText: 'can you tell us about the Atlas card payments?' });
    pickR(c, 'ngozi'); const n = c.renderVals(); pickR(c, 'erik'); const e = c.renderVals();
    const rej = (v) => v.events.find(x => x.type === 'efile_rejected');
    return rej(n).whoName + ' ' + rej(n).text === 'The IRS returned your return; we need Theo’s Social Security card' && rej(e).forMe && !n.events.some(x => x.type === 'question_to_client') && e.events.some(x => x.type === 'question_to_client' && x.text === 'can you tell us about the Atlas card payments?' && x.claimId === 'atlas') && ![...n.events, ...e.events].some(x => /D\d\d|Priya|v3/.test(x.text + x.whoName)); },
    "if (K.CLIENTS.includes(r)) return e.by === r ||", "if (K.CLIENTS.includes(r)) return true ||");
  prove('examiner gets no live events', (C) => { const c = mk(C); c.moveStory('2028-01-26T15:00', 'h'); pickR(c, 'irs'); const v = c.renderVals(); return v.events.length === 0 && v.bell.count === 0 && /no live updates/.test(v.bell.emptyText); },
    "if (r === 'irs') return false;\n      if (e.at > storyAt)", "if (r === 'irs') return true;\n      if (e.at > storyAt)");
  prove('tl-20 PINs in no channel', (C) => { const c = mk(C); c.moveStory('2028-01-26T15:00', 'h');
    return ROLES.every(r => { pickR(c, r); const v = c.renderVals(); return !STRIP.test(JSON.stringify(v.events.map(e => e.text)) + v.clock.options.map(o => o.label).join() + v.history.map(h => h.what).join()) && !/PIN \d/.test(JSON.stringify(c.state.events)); }); },
    "'signed Form 8879 and FTB 8879 (msg-09)'", "'signed Form 8879 and FTB 8879. Taxpayer PIN 12345; spouse PIN 54321'");

  // C. Bell: count proven non-zero, row opens the claim and marks read, Mark all read, Today/Earlier.
  prove('bell count and read state', (C) => { const c = mk(C); let v = c.renderVals(); const n0 = v.bell.count; if (!(n0 === 3 && v.bell.has)) return false;
    v.toggleBell(); v = c.renderVals(); const r = render({ ...sh, Component: C }, v, 'h3 bell'); r.errs.forEach(fail);
    if (!(r.text.includes('Notifications for Daniel') && v.bell.groups[0].name === 'Today' && v.bell.groups.some(g => g.name === 'Earlier') && r.text.includes('Mark all read'))) return false;
    const row = v.bell.groups[0].rows[0]; row.pick(); v = c.renderVals(); if (v.bell.count !== n0 - 1 || c.state.bell !== false) return false;
    v.markAllRead(); v = c.renderVals(); const ls = v.lastSeen.daniel === c._seq; pickR(c, 'priya'); const p = c.renderVals().bell.count; return ls && v.bell.count === 0 && p === 3; },
    "const unread = notes.filter(isUnread).length;", "const unread = 0;");
  prove('bell row opens the claim', (C) => { const c = mk(C); pickR(c, 'priya'); let v = c.renderVals(); v.toggleBell(); v = c.renderVals();
    const row = v.bell.groups.flatMap(g => g.rows).find(x => /review note on California estimates/.test(x.what)); if (!row || row.num !== 'California estimated payments · ') return false; row.pick(); return c.state.claimId === 'ca-est'; },
    "if (canClaim) { this.setState({ read, bell: false }); openClaim(e.claimId); }", "if (canClaim) { this.setState({ read, bell: false }); }");
  prove('deadline warnings on the clock', (C) => { const v = mk(C).renderVals(); const t = v.bell.overdue.map(o => o.word + ' ' + o.text).join(' | ');
    const c = mk(C); pickR(c, 'priya'); const tp = c.renderVals().bell.overdue.map(o => o.text).join(' | '); pickR(c, 'helen');
    return t.includes('Overdue Internal review complete, due 8 Apr 2026: 76 days late.') && t.includes('15 Oct 2026: 114 days away') && tp.includes('due 27 Mar 2026: 88 days late') && c.renderVals().bell.overdue.length === 0; },
    "const n = days(x[0], storyAt);", "const n = days(storyAt, x[0]);");
  // Toast: a new notification while the panel is closed; none while it is open; aria-live region in markup.
  ok(/<div class="sh-toastzone" aria-live="polite">/.test(sh.markup) && /\.sh-toast\{[^}]*animation:sh-fade 6s/.test(sh.src) && /this\.setState\(\{ toast: null \}\); \}, 6000\)/.test(sh.src), '[h3] toast region, 6 s fade and timer');
  prove('toast on a new notification', (C) => { const c = mk(C); c.renderVals().simulate(); let v = c.renderVals(); const r = render({ ...sh, Component: C }, v, 'h3 toast'); r.errs.forEach(fail);
    if (!(v.toast.show && v.toast.who === 'Priya Raman' && /14,000 to 10,500/.test(v.toast.what) && r.text.includes('View'))) return false;
    v.toast.view(); v = c.renderVals(); if (!(c.state.bell && !v.toast.show)) return false;
    c.renderVals().simulate(); return !c.renderVals().toast.show; },
    "const toast = !s.bell && mine.length ?", "const toast = false && mine.length ?");

  // Simulate a colleague: Priya's change notifies Daniel, his sign-off goes stale, a later edit is refused with the difference.
  prove('simulate a colleague', (C) => { const c = mk(C); c.renderVals().emit({ type: 'signoff', claimId: 'ca-est', text: 'signed off' }); let v = c.renderVals(); v.toggleBell(); v = c.renderVals(); if (!v.bell.canSim) return false;
    v.simulate(); v = c.renderVals(); const ev = c.state.events; const adj = ev.find(e => e.sim); const stale = ev.find(e => e.type === 'signoff_stale');
    if (!(adj && adj.type === 'value_changed' && adj.by === 'priya' && adj.at === '2026-06-23T06:07' && v.storyAt === '2026-06-23T06:07' && stale && stale.to[0] === 'daniel' && stale.text === 'Stale: the value changed after you signed')) return false;
    if (!v.events.find(e => e.seq === stale.seq).forMe || !v.events.find(e => e.seq === adj.seq).forMe) return false;
    pickR(c, 'marcus'); const n = c.state.events.length; const r = c.renderVals().emit({ type: 'adjustment', claimId: 'ca-est', text: 'adjusted' }); v = c.renderVals(); const t = render({ ...sh, Component: C }, v, 'h3 refused'); t.errs.forEach(fail);
    if (!(r === 0 && c.lastRefusal === 'Priya changed this at 06:07; review her change first' && t.text.includes('Edit refused') && t.text.includes('Her change: 14,000 to 10,500.') && c.state.events.length === n + 1 && c.state.events[n].type === 'edit')) return false;
    v.refused.review(); return c.state.claimId === 'ca-est' && c.renderVals().emit({ type: 'adjustment', claimId: 'ca-est' }) > 0; },
    "      if (other) {\n        const reason", "      if (false) {\n        const reason");
  ok(['ngozi', 'erik', 'irs', 'sam', 'next'].every(r => { const c = at(r); return c.renderVals().bell.canSim === false; }) && ['priya', 'marcus', 'daniel', 'helen', 'jo'].every(r => at(r).renderVals().bell.canSim === true), '[h3] Simulate a colleague: working staff only');

  prove('emit keeps to: both', (C) => { const c = mk(C); pickR(c, 'priya'); const s = c.renderVals().emit({ type: 'question_to_client', to: 'both', claimId: 'theo-ssn', clientText: 'which payments count?' });
    pickR(c, 'ngozi'); const n = c.renderVals().events.find(e => e.seq === s); pickR(c, 'erik'); const e = c.renderVals().events.find(x => x.seq === s); return !!(n && n.forMe && e && e.forMe); },
    "return raw.flatMap(r => r === 'both' ? K.CLIENTS : [r])", "return raw.flatMap(r => [r])");
  // Spouse table is canonical (coordinator H3) and the four new drawer claims are searchable and named in the bell.
  prove('canonical spouse table', (C) => { const K = C.K(); const want = { erik: ['atlas', 'sehi', 'form-3520', 'crypto-c6', 'noncash'], ngozi: ['theo-ssn', 'fed-est', 'heat-pump', 'ca-wages', 'gift-brigid'], both: ['ca-est', 'salt-d02'] };
    return Object.entries(want).every(([sp, ids]) => ids.every(id => K.SPOUSE[id] === sp)) && Object.keys(K.SPOUSE).length === 12; },
    "'crypto-c6': 'erik', 'noncash': 'erik',", "'crypto-c6': 'ngozi', 'noncash': 'erik',");
  prove('new claims in search', (C) => { const q = (role, s) => { const c = mk(C); c.setState({ role, q: s }); return c.renderVals().search.groups; };
    const n = q('priya', '5,685'); const s = q('daniel', 'seller'); const cr = q('priya', 'crypto lot c6'); const g = q('priya', 'St. Brigid gift');
    const e = q('erik', 'bitcoin'); const ng = q('ngozi', 'bitcoin');
    return n[0] && n[0].items[0].label === 'California wages include Halvorsen pay earned in Texas' && s[0] && s[0].items[0].label === 'Home property tax includes the seller’s share' && cr[0].items[0].label === 'Crypto lot C6 at zero basis and the transfer-in date' && g[0].items[0].label === 'St. Brigid gift read at low confidence' && e[0] && e[0].items[0].label === 'The bitcoin you moved to Coinhaven' && ng.length === 0; },
    "['crypto-c6', 'Crypto lot C6 at zero basis and the transfer-in date', 'F8949.H.C6 BTC 0.05, sold 18 Jun 2025'], ", "");
  // Clock moves are history only; a Play run across several events gives one grouped toast.
  prove('clock is history only, one grouped toast', (C) => { const c = mk(C); c.renderVals().jumpPick({ target: { value: 'tl-23' } }); const v = c.renderVals();
    const clocks = c.state.events.filter(e => e.type === 'clock'); const inBell = v.bell.groups.flatMap(g => g.rows).some(r => /moved the story/.test(r.what)); const tn = c.state.toast ? c.state.toast.n : 0;
    pickR(c, 'priya'); const p = c.renderVals(); const clockFor = p.events.filter(e => e.type === 'clock' && e.forMe).length;
    return clocks.length === 1 && !inBell && clockFor === 0 && v.history.some(h => /moved the story/.test(h.what)) && v.toast.show && /\(and \d+ more\)$/.test(v.toast.what) && tn >= 3; },
    "      case 'clock': break;", "      case 'clock': K.ORDER.forEach(r => add(r)); break;");

  // D. Erik: switcher, nav, plain words, own questions in search.
  { const roleSel = sh.markup.match(/<select[^>]*value="\{\{role\}\}"[\s\S]*?<\/select>/)[0]; ok(roleSel.includes('<option value="erik">Erik Lindqvist (client, spouse)</option>') && roleSel.indexOf('"erik"') === roleSel.indexOf('"ngozi"') + roleSel.slice(roleSel.indexOf('"ngozi"')).indexOf('"erik"') && /ngozi">[^<]*<\/option>\s*<option value="erik"/.test(roleSel), '[h3] Erik right after Ngozi'); }
  prove('erik search: his questions', (C) => { const c = mk(C); pickR(c, 'erik'); c.setState({ q: 'atlas' }); const v = c.renderVals(); c.setState({ q: 'theo' }); const w = c.renderVals();
    return v.search.groups[0] && v.search.groups[0].name === 'Your questions' && v.search.groups[0].items[0].label === 'Card payments from Atlas Outdoor Gear' && !(w.search.groups.find(g => g.name === 'Your questions')); },
    "erik: [['atlas', 'Card payments from Atlas Outdoor Gear'],", "erik: [['theo-ssn', 'Theo’s Social Security number'],");

  // F. Attribution and the draft guard.
  ok(sh.markup.includes('Actions are recorded as the role you choose (no sign-in in this demo)'), '[h3] attribution line');
  prove('draft guard on role switch', (C) => { const c = mk(C); c.renderVals().emit({ type: 'draft', text: 'Half a review note' }); const n = c.state.events.length; pickR(c, 'priya'); let v = c.renderVals();
    const r = render({ ...sh, Component: C }, v, 'h3 draft'); r.errs.forEach(fail);
    if (!(c.state.role === 'daniel' && v.pending.show && r.text.includes('Discard your draft as Daniel?') && c.state.events.length === n)) return false;
    v.pending.keep(); v = c.renderVals(); if (v.pending.show || c.state.role !== 'daniel') return false;
    pickR(c, 'priya'); c.renderVals().pending.discard(); return c.state.role === 'priya' && c.state.draft === null; },
    "if (s.draft && s.draft.role === s.role) { this.setState({ pendingRole: r }); return; }", "");

  // E. Nav hints with the CPA term; renamed words gone from the shell.
  prove('nav title hints', (C) => { const v = mk(C).renderVals(); const t = {}; v.nav.forEach(n => { t[n.label] = n.title; });
    return t['Checks'] === 'Review checks and engine diagnostics' && t['Changes'] === 'Adjustments and change log' && t['Return map'] === 'Forms and lines' && t['Areas'] === 'Summary by area' && v.nav.every(n => n.title); },
    "checks: 'Review checks and engine diagnostics'", "checks: 'Checks'");
  ok(/title="\{\{n\.title\}\}"/.test(sh.markup), '[h3] nav title bound');
  // "rent ledger" stays: it is D50's printed title.
  for (const w of ['Ledger findings', 'ledger estimate', 'Frozen', 'Filed snapshot', 'Approve and e-sign', 'Dismiss with a reason', 'dismiss with a reason', 'Export response pack', 'export a response pack', 'Carry forward']) ok(!sh.src.includes(w), '[h3] old term still in the shell: ' + w);

  // Children get events pre-scoped to the viewer, never with internal fields for clients.
  ok((() => { const c = at('ngozi'); const v = c.renderVals(); return v.events.length > 0 && v.events.every(e => e.before === undefined && e.after === undefined); })(), '[h3] client events carry no before/after');
  // Shell renders clean at every role across five story times (before v1, mid season, signing, filed, examination).
  for (const t of ['2026-01-12T17:06', '2026-03-24T15:00', '2026-07-10T20:05', '2026-07-14T16:22', '2028-01-26T15:00']) for (const role of ROLES) {
    const c = shell(); c.moveStory(t, 'h'); c.setState({ role }); c.state.bell = true;
    let v; try { v = c.renderVals(); } catch (e) { fail('[h3 ' + role + ' ' + t + '] threw: ' + e.stack); continue; }
    const r = render(sh, v, 'h3 ' + role + ' ' + t); r.errs.forEach(fail); checks++;
    if (CLIENTS.includes(role)) scan(r.text, CLIENT_LEAK, 'h3 ' + role + ' ' + t);
    if (role === 'irs') scan(r.text, IRS_LEAK, 'h3 irs ' + t);
    if (t < '2026-07-10T20:05') scan(r.text, LATER, 'h3 ' + role + ' ' + t);
    ok(!STRIP.test(r.text), '[h3 ' + role + ' ' + t + '] a 5-digit run is on screen');
  }
}
console.log('H3: ' + h3Mut + ' mutations, each caught by its guard');

// ---------- Round H3b (review 7): written before the fix; each must fail on the H3 shell ----------
let h3bMut = 0;
{
  const mutant = (from, to) => { if (!sh.src.includes(from)) { fail('[h3b] mutation anchor not found: ' + from.slice(0, 80)); return null; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-h3b-')); fs.writeFileSync(path.join(tmp, 'Main.dc.html'), sh.src.replace(from, to)); return load('Main.dc.html', tmp).Component; };
  const prove = (name, guard, from, to) => {
    let g; try { g = guard(sh.Component); } catch (e) { g = false; fail('[h3b ' + name + '] threw: ' + e.message); }
    ok(g === true, '[h3b ' + name + '] guard fails on Main');
    if (g !== true || !from) return;
    const M = mutant(from, to); if (!M) return; let gm; try { gm = guard(M); } catch (e) { gm = false; }
    h3bMut++; ok(gm === false, '[h3b ' + name + '] mutation NOT caught');
  };
  const mk = (C) => new C({});
  const as = (c, r) => c.setState({ role: r });
  // Shared props reach every child.
  { const imports = [...sh.markup.matchAll(/<dc-import\s([^>]*)><\/dc-import>/g)].map(m => attrs('<x ' + m[1] + '>'));
    for (const a of imports) for (const [k, p] of [['blockers', 'blockers'], ['stage', 'stage'], ['spouse-of', 'spouseOf']]) ok(a[k] === '{{' + p + '}}', '[h3b] dc-import ' + a.name + ' passes ' + k); }
  // M2: one blocker list from events + storyAt.
  prove('blockers from events', (C) => {
    const ids = (v) => (v.blockers || []).map(b => b.claimId).join(' ');
    const c = mk(C); let v = c.renderVals(); if (ids(v) !== 'ca-est atlas rsu theo-ssn' || v.blockers[0].title !== 'California estimates include a 2024 payment' || v.blockers[3].title !== 'Theo’s SSN differs from his 2024 return') return false;
    as(c, 'priya'); const s = c.renderVals().emit({ type: 'adjustment', claimId: 'ca-est', text: 'adjusted' }); v = c.renderVals(); if (ids(v) !== 'atlas rsu theo-ssn' || v.blockers[0].title !== 'Card sales counted twice in business income') return false;
    c.renderVals().emit({ type: 'undo', retracts: s }); v = c.renderVals(); if (ids(v) !== 'ca-est atlas rsu theo-ssn') return false;
    const d = mk(C); d.moveStory('2026-07-01T16:40', 'h'); v = d.renderVals(); if (ids(v) !== 'ca-est atlas rsu theo-ssn crypto-c6 gift-brigid' || v.blockers[4].title !== 'Answer arrived after the last computation: crypto lot C6 basis') return false;
    d.moveStory('2026-06-30T18:01', 'h'); if (ids(d.renderVals()) !== 'ca-est atlas rsu theo-ssn') return false;
    const f = mk(C); f.moveStory('2026-07-14T16:22', 'h'); return Array.isArray(f.renderVals().blockers) && f.renderVals().blockers.length === 0; },
    "const BLOCKS = [", "const BLOCKS = [['ext-pay', 'x'], ");
  prove('stage and spouseOf props', (C) => { const v = mk(C).renderVals(); const sp = v.spouseOf;
    return v.stage === v.R.stage && v.stage === 'Review' && typeof sp === 'function' && sp('atlas') === 'erik' && sp('noncash') === 'erik' && sp('ca-wages') === 'ngozi' && sp('ca-est') === 'both' && sp('salt-d02') === 'both' && sp('rsu') === 'ngozi' && sp('no-such') === 'both'; },
    "'noncash': 'erik',\n", "'noncash': 'ngozi',\n");
  // M3: events keep every field; who is the role key, whoName the display name; bell names the actor once.
  prove('events keep every field', (C) => { const c = mk(C); as(c, 'ngozi'); const s = c.renderVals().emit({ type: 'client_signed', signer: 'ngozi', form: '8879', slot: 'taxpayer', from: 'x', itemIds: ['f8879'], clientText: 'You signed Form 8879' });
    const e = c.renderVals().events.find(x => x.seq === s); as(c, 'priya'); const p = c.renderVals().events.find(x => x.seq === s);
    return !!e && e.who === 'ngozi' && e.by === 'ngozi' && e.whoName === 'You' && p.whoName === 'Ngozi Okafor' && e.text === 'signed Form 8879' && e.signer === 'ngozi' && e.form === '8879' && e.slot === 'taxpayer' && e.from === 'x' && e.itemIds[0] === 'f8879' && e.clientText === 'You signed Form 8879' && p.who === 'ngozi' && p.signer === 'ngozi'; },
    "const out = Object.assign({}, e, {", "const out = Object.assign({}, {");
  prove('bell names the actor once', (C) => { const c = mk(C); as(c, 'priya'); c.renderVals().emit({ type: 'prepared', text: 'Priya Raman marked wages prepared' }); as(c, 'daniel'); const v = c.renderVals();
    const row = v.bell.groups.flatMap(g => g.rows).find(r => /wages prepared/.test(r.what) && !r.ex); return !!row && row.who === 'Priya Raman' && row.what === 'marked wages prepared'; },
    "if (t.startsWith(n + ' ')) return t.slice(n.length + 1);", "");
  // M4: the promised notifications.
  const R = (C, ev) => mk(C).rec(Object.assign({ at: '2026-06-23T06:05', by: 'jo' }, ev)).join(' ');
  prove('recipient rules H3b', (C) => R(C, { type: 'deadline_warning', by: '', assignee: 'daniel' }) === 'daniel jo' && R(C, { type: 'standards_published' }) === 'priya marcus daniel helen' &&
    R(C, { type: 'standards_published', at: '2027-01-20T00:00' }) === 'priya marcus daniel helen sam next' &&
    R(C, { type: 'send_back', by: 'daniel' }) === 'priya' && R(C, { type: 'sent_back', by: 'daniel' }) === 'priya' && R(C, { type: 'sent_to_review', by: 'priya' }) === 'daniel' && R(C, { type: 'review_requested', by: 'priya' }) === 'daniel' &&
    R(C, { type: 'client_signed', by: 'ngozi' }) === 'priya daniel helen' && R(C, { type: 'quality_finding', by: 'sam', at: '2027-01-05T00:00' }) === 'priya daniel helen',
    "case 'standards_published':", "case 'standards_published_x':");
  // Should-fix 1: Marcus receives no identifier digits, including "ends 3390", in any field.
  prove('marcus sees no identifier tails', (C) => { const c = mk(C); as(c, 'priya');
    const s1 = c.renderVals().emit({ type: 'attach', claimId: 'fed-est', text: 'attached a note: IRS shows 3,000; Theo card ends 3390', clientText: 'SSN XXX-XX-3390' });
    const s2 = c.renderVals().emit({ type: 'review_note', claimId: 'rsu', text: 'basis 19,100 confirmed; account ending 4417 checked' });
    as(c, 'marcus'); const v = c.renderVals(); const e1 = v.events.find(x => x.seq === s1), e2 = v.events.find(x => x.seq === s2);
    const bad = /(SSN|identifier|card|account|ends|ending|PIN|XXX-XX-)\D{0,12}\b\d{3,4}\b/i; const all = JSON.stringify([e1, e2]);
    return !bad.test(all) && !/3390|4417/.test(all) && /19,100/.test(e2.text) && /identifier/.test(e1.text) && /identifier/.test(e2.text); },
    "if (isMarcus) out[k] = scrubId(out[k]);", "");
  // Should-fix 5 / decision 6: Simulate moves the clock and says so (history only).
  prove('simulate records its clock move', (C) => { const c = mk(C); c.renderVals().simulate(); const ev = c.state.events; const clk = ev.filter(e => e.type === 'clock');
    return clk.length === 1 && clk[0].at === '2026-06-23T06:07' && c.rec(clk[0]).length === 0 && c.renderVals().history.some(h => /moved the story/.test(h.what)); },
    "this.commit([clock, adj, ...stale], { storyAt: d });", "this.commit([adj, ...stale], { storyAt: d });");
  // Should-fix 7: moving the clock backwards shrinks every view.
  prove('clock backwards shrinks the view', (C) => { const c = mk(C); c.moveStory('2026-07-15T02:10', 'h'); as(c, 'priya'); const late = c.renderVals().events.length;
    c.moveStory('2026-06-23T06:05', 'h'); const v = c.renderVals(); return late > v.events.length && v.events.every(e => e.at <= v.storyAt) && !v.events.some(e => /D71|rejected/.test(e.text)); },
    "if (e.at > storyAt) return false;", "");
}
console.log('H3b: ' + h3bMut + ' mutations, each caught by its guard');

console.log('ClaimDrawer.dc.html: ' + drawerRenders + ' renders (10 roles x 24 claim ids incl. none, noncash, unknown x 2 reveal states, + standalone)');
console.log('Main.dc.html: ' + shellRenders + ' renders (10 roles x each visible screen x chat open/closed)');
console.log('checks run: ' + checks + ', failures: ' + failures.length);
failures.slice(0, 60).forEach(f => console.log('FAIL ' + f));
process.exit(failures.length ? 1 : 0);
