// Harness for the claim drawer (ClaimDrawer.dc.html), round H3, author S2.
// Run: node harness-drawer.js   (exit code 1 on any failure). HD_DIR=<dir> runs it against another copy (used by the mutations).
// The render core (load, tokenizer, hole checker, leak patterns) is copied from harness-shell.js so this file runs alone.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const DIR = process.env.HD_DIR || path.join(__dirname, 'project');
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
const ASOF = { priya: '2026-06-23T06:05', marcus: '2026-06-23T06:05', daniel: '2026-06-23T06:05', helen: '2026-06-23T06:05', jo: '2026-06-23T06:05', ngozi: '2026-06-23T06:05', sam: '2027-01-15T15:00', next: '2027-01-15T15:00', irs: '2028-01-26T15:00' };
const LATER = [/\bD71\b/, /13 Jul/, /3 Aug 2026/, /8879/, /\bD72\b/, /rejected/i, /his card/];
const scan = (text, pats, ctx) => pats.forEach(p => { checks++; const m = text.match(p); if (m) fail('[' + ctx + '] leak ' + p + ' matched "' + text.slice(Math.max(0, m.index - 40), m.index + 40) + '"'); });


// ---------- Round H3 drawer tests ----------
const ROLES = ['priya', 'marcus', 'daniel', 'helen', 'sam', 'jo', 'ngozi', 'erik', 'next', 'irs'];
const OLD = ['ca-est', 'atlas', 'rsu', 'theo-ssn', 'heat-pump', 'ext-pay', 'fed-est', 'repairs', 'care-ein', 'iso-lot', 'noncash', 'sehi', 'bright-oak', 'sek-fx', 'form-3520', 'mileage', 'phone-pct', 'sec179', 'payoff-int', 'or-credit', 'excess-ss', 'ca-trace'];
const NEW = ['ca-wages', 'salt-d02', 'crypto-c6', 'gift-brigid'];
const CLAIMS = [...OLD, ...NEW];
const T0 = '2026-06-23T06:05', T1 = '2026-07-01T20:00', T2 = '2026-07-20T09:00';
const ROLE_AFTER = { sam: '2027-01-15T15:00', next: '2027-01-15T15:00', irs: '2028-01-26T15:00' };
const RENAMED = [/ledger/i, /Dismiss with a reason/, /Approve and e-sign/, /Export response pack/, /Carry forward/, /\bFrozen\b/];
const drw = load('ClaimDrawer.dc.html');
const noop = () => {};
let renders = 0;
const mk = (props, setup) => { const c = new drw.Component(props); if (setup) setup(c); return c; };
const vals = (c) => c.renderVals();
const P = (role, claimId, asOf, extra) => Object.assign({ role, claimId, dark: false, openClaim: noop, go: noop, revealed: [], reveal: noop, revealLog: [], asOf, asOfLabel: '', storyAt: asOf, events: [], emit: noop, lastSeen: {} }, extra || {});
const act = (v, re) => v.acts.find(a => re.test(a.label));

// Sample events from several people, used in the full sweep so live sections render for every role.
const SAMPLE = (claimId) => [
  { seq: 1, at: '2026-06-23T06:06', by: 'priya', who: 'Priya', type: 'adjustment', claimId, groupId: '', retracts: null, text: 'adjusted a line (Example).', before: '14,000', after: '10,500' },
  { seq: 2, at: '2026-06-23T06:07', by: 'daniel', who: 'Daniel', type: 'signoff', claimId, groupId: '', retracts: null, text: 'signed off.' },
  { seq: 3, at: '2026-06-23T06:08', by: 'priya', who: 'Priya', type: 'attach', claimId, groupId: '', retracts: null, text: 'attached call-01 as evidence, see F1040.26 and XXX-XX-3390.', itemIds: ['call-01'] },
  { seq: 4, at: '2026-06-23T06:09', by: 'marcus', who: 'Marcus', type: 'colleague_question', claimId, groupId: '', retracts: null, text: 'asked Helen about it.', to: ['helen'] },
  { seq: 5, at: '2026-06-23T06:10', by: 'ngozi', who: 'Ngozi', type: 'client_answer', claimId, groupId: '', retracts: null, text: 'answered about qa-41 (internal wording).' },
  { seq: 6, at: '2026-06-23T06:11', by: 'priya', who: 'Priya', type: 'undo', claimId, groupId: '', retracts: 3, text: 'undid the attachment.' },
  { seq: 7, at: '2026-06-23T06:12', by: 'helen', who: 'Helen', type: 'signoff_stale', claimId, groupId: '', retracts: null, text: 'Stale: the value changed after you signed', to: ['daniel'] }
];
// The same events as the shell hands them to a client: its own view, plain words, no "by".
const CLIENT_VIEW = (claimId) => [
  { seq: 5, at: '2026-06-23T06:10', who: 'You', type: 'client_answer', claimId, groupId: '', retracts: null, text: 'sent an answer' },
  { seq: 8, at: '2026-06-23T06:14', who: 'Your tax team', type: 'question_to_client', claimId, groupId: '', retracts: null, text: 'sent you a question', to: ['ngozi'] }
];

// 1. Sweep: every role x claim x story time x event state x panel state renders with no hole and no leak.
for (const role of ROLES) {
  const times = ROLE_AFTER[role] ? [T0, ROLE_AFTER[role]] : [T0, T1, T2];
  for (const asOf of times) for (const claimId of ['', ...CLAIMS, 'no-such-claim']) for (const withEv of [false, true]) for (const panel of ['none', 'msg', 'file', 'note', 'ask']) {
    if (panel !== 'none' && (!claimId || !withEv)) continue;
    const ctx = 'drawer ' + role + ' ' + (claimId || '(none)') + ' @' + asOf + (withEv ? ' +events' : '') + ' panel=' + panel;
    let v, c;
    try {
      c = mk(P(role, claimId, asOf, { events: withEv ? ((role === 'ngozi' || role === 'erik') && panel === 'none' ? [...SAMPLE(claimId), ...CLIENT_VIEW(claimId)] : SAMPLE(claimId)) : [] }));
      v = vals(c);
      if (panel === 'ask') { const a = act(v, /^Ask a colleague$/); if (a) { a.go(); v = vals(c); } }
      else if (panel !== 'none') { const a = act(v, /^Attach evidence$/); if (a) { a.go(); v = vals(c); const k = v.att.kinds.find(x => (panel === 'msg' ? /Message|message/ : panel === 'file' ? /^File$/ : /^Note$/).test(x.label)); if (k) { k.go(); v = vals(c); } } }
    } catch (e) { fail('[' + ctx + '] renderVals threw: ' + e.stack); continue; }
    renders++;
    const r = render(drw, v, ctx); r.errs.forEach(fail); checks++;
    if (process.env.HD_DUMP && ctx === process.env.HD_DUMP) console.log('DUMP ' + ctx + ': ' + r.text);
    if ((role === 'ngozi' || role === 'erik') && claimId) scan(r.text, CLIENT_LEAK, ctx);
    if (role === 'irs' && claimId) scan(r.text, IRS_LEAK, ctx);
    if (asOf < '2026-07-13' && claimId) scan(r.text, LATER, ctx);
    scan(r.text, RENAMED, ctx + ' (renames)');
    if (role === 'marcus') { checks++; const t = JSON.stringify([v.liveRows, v.evidence, v.thread]); if (/3390|3309|1106|XXX-XX-\d{4}/.test(t)) fail('[' + ctx + '] identifier digits in Marcus event text'); }
    if (role === 'sam' && asOf < '2027-01-04' && claimId) ok(v.notFound && /joins on 4 Jan 2027/.test(v.notFoundText), '[' + ctx + '] Sam before 4 Jan 2027 sees the record');
    const notYet = (role === 'sam' && asOf < '2027-01-04') || (role === 'next' && asOf < '2027-01-15');
    if (claimId && CLAIMS.includes(claimId) && role !== 'irs' && !notYet) ok(v.has === true, '[' + ctx + '] claim not shown');
    for (const a of v.acts) ok(typeof a.go === 'function', '[' + ctx + '] action without handler: ' + a.label);
  }
}
// standalone, no props at all
{ const c = mk({}); const v = vals(c); const r = render(drw, v, 'standalone'); r.errs.forEach(fail); ok(v.has && v.D.title.length > 0, 'standalone shows no claim'); renders++;
  act(v, /^Mark prepared$/) ? 0 : 0;
  const d = vals(c); const sg = act(d, /^Leave a review note$/); sg.go(); ok(c.state.localEvents.length === 1 && c.state.localEvents[0].type === 'review_note' && c.state.localEvents[0].seq === 1, 'standalone emit does not keep a local event');
  const r2 = render(drw, vals(c), 'standalone after emit'); r2.errs.forEach(fail); ok(vals(c).S.live === true, 'standalone live section missing after a local event'); }

// 2. data-props and roles
ok(drw.props.role.options.join(',') === 'priya,marcus,daniel,helen,sam,jo,ngozi,erik,next,irs', 'role options (erik after ngozi): ' + drw.props.role.options.join(','));
ok(NEW.every(id => drw.props.claimId.options.includes(id)), 'new claim ids missing from data-props');
ok(['events', 'emit', 'lastSeen', 'storyAt'].every(k => drw.props[k] && drw.props[k].editor === null), 'events/emit/lastSeen/storyAt not declared');

// 3. U15: the two biggest findings have drawer entries with packet facts.
{ const w = vals(mk(P('priya', 'ca-wages', T0)));
  ok(w.D.value === '$218,400' && w.D.hl === 'Box 16 111,300.00' && w.D.effect.includes('California −5,685') && w.D.others.some(o => o.text.includes('22,469.00')) && w.D.docRef === 'D09 · page 1' && w.D.pos.startsWith('ev-0047'), 'ca-wages facts');
  const s = vals(mk(P('priya', 'salt-d02', T0)));
  ok(s.D.value === '$13,420' && s.D.hl.includes('6,912.00') && s.D.effect.startsWith('Federal +1,462') && s.D.effect.includes('California +332') && act(s, /^Adjust to \$6,508$/), 'salt-d02 facts');
  ok(vals(mk(P('sam', 'ca-wages', ROLE_AFTER.sam))).D.statusWord === 'Resolved before filing' && vals(mk(P('sam', 'salt-d02', ROLE_AFTER.sam))).D.valueEx === true, 'new claims after filing read Resolved before filing (Example)');
  ok(vals(mk(P('helen', 'ca-wages', T0))).acts.some(a => a.label === 'Partner sign-off'), 'ca-wages over 1,000 without partner sign-off'); }

// 4. Renames (E)
{ const p = vals(mk(P('priya', 'atlas', T0)));
  ok(p.acts.some(a => a.label === 'Clear with a reason'), 'Clear with a reason missing');
  ok(vals(mk(P('irs', 'atlas', ROLE_AFTER.irs))).acts[0].label === 'Examination response', 'Examination response label');
  ok(vals(mk(P('sam', 'iso-lot', ROLE_AFTER.sam))).D.statusWord === 'Carryover', 'Carryover word');
  ok(vals(mk(P('priya', 'noncash', T0))).D.effect === 'About +806 federal, +149 California (estimate at v3 rates, Example).', 'noncash wording after the rename');
  ok(vals(mk(P('sam', 'atlas', ROLE_AFTER.sam))).D.valueNote.startsWith('As filed, locked'), 'As filed, locked'); }

// 5. Erik is a client exactly like Ngozi; questions addressed per spouse.
for (const id of CLAIMS) {
  const n = vals(mk(P('ngozi', id, T1))), e = vals(mk(P('erik', id, T1)));
  ok(JSON.stringify(Object.keys(n.S).filter(k => n.S[k])) === JSON.stringify(Object.keys(e.S).filter(k => e.S[k]).filter(k => k !== 'askedOf' || n.S.askedOf)), 'erik and ngozi see different sections on ' + id);
  ok(e.headLbl === 'Where this comes from' && !e.acts.some(a => /Ask a colleague|Adjust|Sign off/.test(a.label)), 'erik gets staff actions on ' + id);
}
{ const n = vals(mk(P('ngozi', 'atlas', T0))), e = vals(mk(P('erik', 'atlas', T0)));
  ok(n.D.askedOf.startsWith('Asked of Erik') && n.acts[0].ad === 'true' && e.D.askedOf === 'Asked of you.' && e.acts[0].ad === 'false', 'atlas question addressed to Erik');
  ok(vals(mk(P('erik', 'fed-est', T0))).D.askedOf.startsWith('Asked of Ngozi') && vals(mk(P('ngozi', 'ca-est', T0))).D.askedOf === 'Asked of both of you.', 'per-spouse addressing'); }

// 6. U10: attach evidence (file, message or note), offered packet items by story time, Marcus warning, identifier refusal.
{ const got = []; const em = (e) => got.push(e);
  let c = mk(P('priya', 'heat-pump', T0, { emit: em })); act(vals(c), /^Attach evidence$/).go(); let v = vals(c);
  ok(v.att.open && v.att.isMsg && v.att.items.length === 1 && v.att.items[0].label.startsWith('call-01'), 'heat-pump does not offer call-01');
  v.att.items[0].go(); ok(got.length === 1 && got[0].type === 'attach' && got[0].itemIds[0] === 'call-01' && got[0].claimId === 'heat-pump' && /^attached call-01/.test(got[0].text), 'attaching call-01 does not emit');
  const a0 = vals(mk(P('priya', 'crypto-c6', T0))); ok(!a0.att.items.some(i => /msg-07/.test(i.label)), 'msg-07 offered before it arrived');
  c = mk(P('priya', 'crypto-c6', T1)); act(vals(c), /^Attach evidence$/).go(); ok(vals(c).att.items.some(i => i.label.startsWith('msg-07')), 'msg-07 not offered after 30 Jun');
  c = mk(P('ngozi', 'crypto-c6', T1)); act(vals(c), /^Attach evidence$/).go(); ok(vals(c).att.items.some(i => i.label === 'Erik’s message of 30 Jun 2026'), 'client offer wording');
  ok(vals(mk(P('priya', 'gift-brigid', T1))).att.items.some(i => i.label.startsWith('msg-08')), 'msg-08 not offered');
  // note: Marcus warning, identifier refused, a clean note emits
  got.length = 0; c = mk(P('marcus', 'atlas', T0, { emit: em })); act(vals(c), /^Attach evidence$/).go(); vals(c).att.kinds[2].go(); v = vals(c);
  ok(v.att.isNote && v.att.warn && /Do not type SSNs/.test(v.att.warnText), 'Marcus note warning missing');
  v.att.setNote({ target: { value: 'Card number 123-45-6789 per call' } }); vals(c).att.saveNote(); v = vals(c);
  ok(got.length === 0 && v.att.hasErr && /looks like an identifier/.test(v.att.err), 'identifier in a note not refused');
  v.att.setNote({ target: { value: 'Paywell deposits tie to page 3' } }); vals(c).att.saveNote();
  ok(got.length === 1 && got[0].type === 'attach' && /attached a note/.test(got[0].text), 'clean note not emitted');
  ok(!vals(mk(P('priya', 'atlas', T0))).att.warn, 'Priya shown the Marcus warning');
  got.length = 0; c = mk(P('ngozi', 'theo-ssn', T0, { emit: em })); act(vals(c), /^Attach evidence$/).go(); vals(c).att.kinds[1].go(); vals(c).att.pickFile(); ok(got.length === 1 && /attached a file/.test(got[0].text) && got[0].plain === 'added a file', 'client file attach does not emit');
  ok(!vals(mk(P('irs', 'atlas', ROLE_AFTER.irs))).acts.some(a => /Attach/.test(a.label)) && !vals(mk(P('jo', 'atlas', T0))).acts.some(a => /Attach/.test(a.label)), 'examiner or Jo can attach');
  const ev = vals(mk(P('priya', 'heat-pump', T0, { events: [{ seq: 9, at: '2026-06-23T06:20', who: 'Priya', type: 'attach', claimId: 'heat-pump', retracts: null, itemIds: ['call-01'], text: 'attached call-01 as evidence for SchE.14A.' }] })));
  ok(ev.S.evidence && ev.evidence.length === 1 && ev.att.items[0].btn === 'Attached', 'attached evidence not listed or still attachable');
  const sv = vals(mk(P('sam', 'atlas', ROLE_AFTER.sam))); act(sv, /^Attach evidence$/); ok(sv.att.sub.includes('filed record'), 'after filing, attach does not say it attaches to the filed record'); }

// 7. U12: ask a colleague, a thread distinct from review notes.
{ const got = []; const em = (e) => got.push(e);
  const c = mk(P('priya', 'atlas', T0, { emit: em })); act(vals(c), /^Ask a colleague$/).go(); let v = vals(c);
  ok(v.ask.open && v.ask.to === 'helen' && v.ask.colleagues.length === 6 && !v.ask.colleagues.some(o => o.key === 'priya'), 'ask panel');
  v.ask.send(); ok(got.length === 0 && vals(c).ask.hasErr, 'empty question sent');
  vals(c).ask.setText({ target: { value: 'Is the 12,400 inside the Atlas deposits?' } }); vals(c).ask.setTo({ target: { value: 'daniel' } }); vals(c).ask.send();
  ok(got.length === 1 && got[0].type === 'colleague_question' && got[0].to[0] === 'daniel' && got[0].claimId === 'atlas' && got[0].type !== 'review_note', 'question not emitted as a colleague question');
  const th = vals(mk(P('daniel', 'atlas', T0, { events: [Object.assign({ seq: 11, at: '2026-06-23T06:30', groupId: '', retracts: null, who: 'Priya' }, got[0])] })));
  ok(th.S.thread && th.thread.length === 1 && th.thread[0].head.startsWith('Priya Raman to Daniel Ortiz') && th.ask.title === 'Reply to Priya', 'thread or reply missing');
  ok(vals(mk(P('priya', 'heat-pump', T0))).thread.filter(t => t.ex).length === 2, 'Example thread on heat-pump not tagged');
  ok(['ngozi', 'erik', 'irs'].every(r => !vals(mk(P(r, 'atlas', r === 'irs' ? ROLE_AFTER.irs : T0))).acts.some(a => /Ask a colleague/.test(a.label))), 'client or examiner can ask a colleague');
  ok(vals(mk(P('ngozi', 'atlas', T0, { events: [Object.assign({ seq: 11, at: '2026-06-23T06:30', groupId: '', retracts: null, who: 'Priya' }, got[0])] }))).S.thread === false, 'client sees the staff thread'); }

// 8. U16: answer arrived after the last computation blocks approval.
{ const d0 = vals(mk(P('daniel', 'crypto-c6', T0))); ok(!d0.S.late && d0.D.statusWord === 'Engine warning', 'late state before msg-07 arrived');
  const d1 = vals(mk(P('daniel', 'crypto-c6', T1)));
  ok(d1.S.late && d1.D.statusWord === 'Answer arrived after the last computation' && d1.late.word === 'Blocks approval' && d1.D.fails.some(f => f.word === 'Blocks approval'), 'late state missing on crypto-c6');
  ok(act(d1, /^Sign off$/).ad === 'true' && /answer arrived after the last computation/i.test(act(d1, /^Sign off$/).reason), 'late answer does not block Daniel');
  ok(act(vals(mk(P('helen', 'crypto-c6', T1))), /^Partner sign-off$/).ad === 'true', 'late answer does not block Helen');
  ok(vals(mk(P('priya', 'gift-brigid', T1))).D.statusWord === 'Answer arrived after the last computation' && vals(mk(P('priya', 'gift-brigid', '2026-07-01T16:00'))).S.late === false, 'gift-brigid late state by time');
  const applied = vals(mk(P('daniel', 'gift-brigid', T1, { events: [{ seq: 3, at: T1, who: 'Priya', type: 'attach', claimId: 'gift-brigid', retracts: null, itemIds: ['msg-08'], text: 'attached msg-08.' }] })));
  ok(applied.late.word === 'Answer recorded' && !applied.D.fails.some(f => f.word === 'Blocks approval'), 'recording msg-08 does not clear the block');
  const cl = vals(mk(P('erik', 'crypto-c6', T1))); ok(cl.D.statusWord === 'Answer received, not yet applied' && cl.late.text.startsWith('We received your message'), 'client late wording');
  ok(vals(mk(P('sam', 'crypto-c6', ROLE_AFTER.sam))).D.history.includes('never included it'), 'filed record does not say v3 never included msg-07'); }

// 9. Stale sign-off live from events; partner gate; Daniel can sign once resolved.
{ const adj = (seq, after, who) => ({ seq, at: '2026-06-23T06:0' + seq, who: who || 'Priya', type: 'adjustment', claimId: 'ca-est', groupId: '', retracts: null, text: 'adjusted F540NR.72.', before: '14,000', after });
  const so = { seq: 2, at: '2026-06-23T06:02', who: 'Daniel', type: 'signoff', claimId: 'ca-est', groupId: '', retracts: null, text: 'Daniel signed off.' };
  const cur = vals(mk(P('daniel', 'ca-est', T0, { events: [adj(1, '10,500'), so] })));
  ok(cur.S.signoffs && cur.signoffs[0].word === 'Current', 'current sign-off');
  ok(act(vals(mk(P('daniel', 'ca-est', T0, { events: [adj(1, '10,500')] }))), /^Sign off$/).ad === 'false', 'Daniel cannot sign an adjusted item');
  const st = vals(mk(P('daniel', 'ca-est', T0, { events: [adj(1, '10,500'), so, adj(3, '10,000')] })));
  ok(st.signoffs[0].word === 'Stale' && st.signoffs[0].text.startsWith('Stale: the value changed after you signed'), 'stale sign-off not shown');
  ok(vals(mk(P('helen', 'ca-est', T0, { events: [adj(1, '10,500'), so] }))).acts.find(a => a.label === 'Partner sign-off').ad === 'false', 'partner sign-off not enabled by a current reviewer sign-off');
  ok(vals(mk(P('helen', 'ca-est', T0, { events: [adj(1, '10,500'), so, adj(3, '10,000')] }))).acts.find(a => a.label === 'Partner sign-off').ad === 'true', 'partner sign-off enabled on a stale sign-off');
  const lv = vals(mk(P('priya', 'ca-est', T0, { events: [adj(1, '10,500')] }))); ok(lv.D.value === '$10,500' && lv.D.valueNote.includes('engine v3: $14,000'), 'live value not shown');
  const undone = vals(mk(P('priya', 'ca-est', T0, { events: [adj(1, '10,500'), { seq: 2, at: T0, who: 'Priya', type: 'undo', claimId: 'ca-est', retracts: 1, text: 'undid.' }] })));
  ok(undone.D.value === '$14,000' && undone.liveRows.some(r => r.word === 'Undone'), 'undo not applied');
  const sw = vals(mk(P('daniel', 'ca-est', T0, { events: [adj(1, '10,500'), so, { seq: 3, at: T0, who: 'Priya', type: 'undo', claimId: 'ca-est', retracts: 1, text: 'undid.' }] })));
  ok(sw.signoffs[0].word === 'Stale', 'undo after a sign-off does not make it stale'); }

// 10. U2: edit refused when someone else changed the number and you have not seen it; undo emits a compensating event.
{ const pe = { seq: 5, at: '2026-06-23T06:07', by: 'priya', who: 'Priya', type: 'adjustment', claimId: 'ca-est', groupId: '', retracts: null, text: 'adjusted F540NR.72 from $14,000 to $10,500.', before: '14,000', after: '10,500' };
  // shown alone: the drawer applies the rule itself on lastSeen
  const c = mk(P('marcus', 'ca-est', T0, { events: [pe], emit: undefined, lastSeen: { marcus: 0 } }));
  act(vals(c), /^Adjust to/).go(); let v = vals(c);
  ok(c.state.localEvents.length === 0 && v.refuse.show && v.refuse.text === 'Priya changed this at 06:07; review her change first' && v.refuse.before === '$14,000' && v.refuse.after === '$10,500', 'edit not refused: ' + JSON.stringify(v.refuse));
  v.refuse.ack(); act(vals(c), /^Adjust to/).go(); ok(c.state.localEvents.length === 1 && c.state.localEvents[0].type === 'adjustment' && c.state.localEvents[0].before === '10,500' && c.state.localEvents[0].by === 'marcus', 'adjust after review not emitted from the current value');
  const c2 = mk(P('marcus', 'ca-est', T0, { events: [pe], emit: undefined, lastSeen: { marcus: 5 } })); act(vals(c2), /^Adjust to/).go(); ok(c2.state.localEvents.length === 1, 'seen change still refuses');
  // with the shell: its emit decides; the drawer shows the refusal and the difference
  const got = []; const shellNo = (e) => { got.push(e); return 0; };
  const c5 = mk(P('marcus', 'ca-est', T0, { events: [pe], emit: shellNo })); act(vals(c5), /^Adjust to/).go(); v = vals(c5);
  ok(got.length === 1 && got[0].type === 'adjustment' && v.refuse.show && v.refuse.text === 'Priya changed this at 06:07; review her change first' && v.refuse.after === '$10,500' && /Not recorded/.test(v.msg), 'shell refusal not shown');
  const em = (e) => { got.push(e); return got.length; };
  const c3 = mk(P('priya', 'ca-est', T0, { events: [pe], emit: em })); got.length = 0; const u = vals(c3).undo; ok(u.show, 'undo not offered'); u.go(); ok(got.length === 1 && got[0].type === 'undo' && got[0].retracts === 5, 'undo does not emit a compensating event');
  const c4 = mk(P('priya', 'ca-est', T2, { events: [pe], emit: em })); got.length = 0; vals(c4).undo.go(); ok(got.length === 0, 'undo allowed after the record is locked'); }

// 11. Story clock: a working role after acceptance sees the filed record read only.
{ const v = vals(mk(P('priya', 'atlas', T2)));
  ok(v.D.valueNote.startsWith('As filed, locked') && v.noAct.startsWith('As filed, locked') && !v.acts.some(a => /Adjust|Mark prepared|Clear/.test(a.label)) && v.acts.some(a => a.label === 'Attach evidence'), 'locked record for priya after acceptance');
  ok(vals(mk(P('daniel', 'theo-ssn', T0))).D.title === 'Theo’s SSN differs from his 2024 return', 'Theo wording at 23 Jun'); }

// 12. Per-recipient wording of events: Marcus never sees identifier digits; clients see only household events in plain words.
{ const e = [{ seq: 1, at: T0, by: 'priya', who: 'Priya', type: 'adjustment', claimId: 'theo-ssn', retracts: null, text: 'corrected Theo’s SSN from XXX-XX-3309 to XXX-XX-3390 (ends 3390).', before: '', after: '' }];
  const m = vals(mk(P('marcus', 'theo-ssn', T0, { events: e }))); ok(m.liveRows.length === 1 && !/\d{4}/.test(m.liveRows[0].text) && m.liveRows[0].text.includes('an identifier'), 'Marcus sees identifier digits: ' + m.liveRows[0].text);
  ok(vals(mk(P('priya', 'theo-ssn', T0, { events: e }))).liveRows[0].text.includes('XXX-XX-3390'), 'Priya scrubbed');
  const n = vals(mk(P('ngozi', 'fed-est', T0, { events: SAMPLE('fed-est') })));
  ok(n.liveRows.length === 1 && n.liveRows[0].text === 'You sent an answer.', 'client sees staff events or internal wording: ' + JSON.stringify(n.liveRows));
  const nv = vals(mk(P('ngozi', 'fed-est', T0, { events: CLIENT_VIEW('fed-est') })));
  ok(nv.liveRows.map(r => r.text).join(' | ') === 'You sent an answer. | Your tax team sent you a question.', 'client view rows: ' + JSON.stringify(nv.liveRows));
  const got = []; const c = mk(P('priya', 'theo-ssn', T0, { emit: (x) => got.push(x) })); act(vals(c), /^Use the number/).go(); ok(got.length === 1 && got[0].ident === true && !/XXX-XX-\d{4}|\b\d{3}-?\d{2}-?\d{4}\b|3390|3309/.test(got[0].text), 'SSN correction event carries digits or no ident flag');
  const q = []; const cq = mk(P('priya', 'atlas', T0, { emit: (x) => q.push(x) })); act(vals(cq), /^Ask the client$/).go(); ok(q.length === 1 && q[0].type === 'question_to_client' && q[0].to.join() === 'erik' && /^sent you a question/.test(q[0].plain), 'client question shape'); }

// 12b. A stale notice addressed to the signer reads in the third person for everyone else.
{ const ev = SAMPLE('ca-est'); ok(vals(mk(P('marcus', 'ca-est', T0, { events: ev }))).liveRows.some(r => r.text === 'Stale: the value changed after Daniel signed.') && vals(mk(P('daniel', 'ca-est', T0, { events: ev }))).liveRows.some(r => r.text === 'Stale: the value changed after you signed.'), 'stale notice wording per reader'); }

// 14. Round H3b (review 7).
// M1: the card D71 arrives 13 Jul 2026 19:02; compare full timestamps, not the date.
{ const d = vals(mk(P('daniel', 'theo-ssn', '2026-07-13T18:00'))), n = vals(mk(P('ngozi', 'theo-ssn', '2026-07-13T18:00')));
  ok(d.D.title === 'Theo’s SSN differs from his 2024 return' && !/card/.test(JSON.stringify(d.D.others)) && !/card/.test(n.D.value), 'H3b M1: card shown before 19:02 on 13 Jul: ' + d.D.title + ' / ' + n.D.value);
  ok(vals(mk(P('daniel', 'theo-ssn', '2026-07-13T19:02'))).D.title === 'Theo’s SSN differed from his 2024 return and his card', 'H3b M1: card not shown at 19:02'); }
// Decision 4: spouse from the shell's spouseOf; the fallback table includes noncash (Erik).
{ const n = vals(mk(P('ngozi', 'theo-ssn', T0, { spouseOf: (id) => id === 'theo-ssn' ? 'erik' : 'both' })));
  ok(/^Asked of Erik/.test(n.D.askedOf), 'H3b spouse: spouseOf prop ignored: ' + n.D.askedOf);
  const q = []; const c = mk(P('priya', 'noncash', T0, { emit: (x) => q.push(x) })); act(vals(c), /^Ask the client$/).go();
  ok(q.length === 1 && q[0].to.join() === 'erik', 'H3b spouse: noncash question not addressed to Erik: ' + (q[0] && q[0].to));
  ok(drw.props.spouseOf && drw.props.spouseOf.editor === null, 'H3b spouse: spouseOf not declared'); }
// Review 7 item 4: clients after filing never see "Needs your answer" or an answer button.
for (const r of ['ngozi', 'erik']) for (const id of ['ca-est', 'theo-ssn', 'atlas', 'crypto-c6']) for (const t of ['2026-07-14T16:22', '2027-01-15T15:00']) {
  const v = vals(mk(P(r, id, t)));
  ok(!/^Needs/.test(v.D.statusWord) && !v.acts.some(a => /^(Answer|Upload)$/.test(a.label)) && !/^Asked of/.test(v.D.askedOf), 'H3b filed client ' + r + ' ' + id + ' @' + t + ': ' + v.D.statusWord + ' / ' + v.acts.map(a => a.label).join(','));
}
// Decision 2: events keep who as the role key and add whoName for display.
{ const e = [{ seq: 4, at: '2026-06-23T06:07', who: 'priya', whoName: 'Priya Raman', type: 'adjustment', claimId: 'ca-est', groupId: '', retracts: null, text: 'adjusted F540NR.72 from 14,000 to 10,500', before: '14,000', after: '10,500', to: [] }];
  const pv = vals(mk(P('priya', 'ca-est', T0, { events: e }))), dv = vals(mk(P('daniel', 'ca-est', T0, { events: e })));
  ok(pv.undo.show && dv.liveRows[0].text === 'Priya Raman adjusted F540NR.72 from 14,000 to 10,500.' && dv.D.valueNote.startsWith('Adjusted by Priya Raman'), 'H3b events: who as role key not read: ' + JSON.stringify([pv.undo.show, dv.liveRows[0] && dv.liveRows[0].text, dv.D.valueNote])); }

// 13. With the real shell (Main.dc.html): the drawer reads the shell's events and emits through the shell's emit.
if (fs.existsSync(path.join(DIR, 'Main.dc.html')) || fs.existsSync(path.join(__dirname, 'project', 'Main.dc.html'))) {
  const shDir = fs.existsSync(path.join(DIR, 'Main.dc.html')) ? DIR : path.join(__dirname, 'project');
  let sh; try { sh = load('Main.dc.html', shDir); } catch (e) { fail('shell did not load: ' + e.message); }
  if (sh) {
    const shell = new sh.Component({});
    const pickRole = (r) => { shell.renderVals().pickRole({ target: { value: r } }); if (shell.state.role !== r) { const pv = shell.renderVals(); if (pv.pending && typeof pv.pending.discard === 'function') pv.pending.discard(); } };
    const drawerFor = (claimId) => { const sv = shell.renderVals(); return mk({ role: sv.role, claimId, dark: false, openClaim: noop, go: noop, revealed: sv.revealed, reveal: noop, revealLog: [], asOf: sv.asOf, asOfLabel: sv.asOfLabel, storyAt: sv.storyAt, events: sv.events, emit: sv.emit, lastSeen: sv.lastSeen }); };
    // Priya adjusts ca-est through the drawer; the shell records it as an adjustment by priya.
    pickRole('priya');
    const n0 = shell.state.events.length;
    act(vals(drawerFor('ca-est')), /^Adjust to/).go();
    const added = shell.state.events.slice(n0);
    ok(added.some(e => e.type === 'adjustment' && e.by === 'priya' && e.claimId === 'ca-est' && e.after === '10,500'), 'shell did not record the drawer adjustment: ' + JSON.stringify(added.map(e => [e.type, e.by, e.after])));
    // Daniel signs off; then Priya changes it again; Daniel's drawer shows the sign-off stale.
    pickRole('daniel');
    const dv = vals(drawerFor('ca-est')); const so = act(dv, /^Sign off$/);
    ok(so && so.ad === 'false', 'Daniel cannot sign the adjusted ca-est through the shell');
    if (so) so.go();
    ok(shell.state.events.some(e => e.type === 'signoff' && e.by === 'daniel' && e.claimId === 'ca-est'), 'shell did not record the sign-off');
    pickRole('priya'); act(vals(drawerFor('ca-est')), /^Adjust to/).go();
    pickRole('daniel'); const ds = vals(drawerFor('ca-est'));
    ok(ds.S.signoffs && ds.signoffs.some(r => r.word === 'Stale'), 'stale sign-off not shown from the shell events: ' + JSON.stringify(ds.signoffs));
    const rr = render(drw, ds, 'with shell daniel ca-est'); rr.errs.forEach(fail);
    // Simulate a colleague, then Marcus tries to change the same number: refused by the shell, shown in the drawer.
    pickRole('marcus'); vals(drawerFor('ca-est')); shell.renderVals().simulate();
    const mc = drawerFor('ca-est'); const n1 = shell.state.events.length; act(vals(mc), /^Adjust to/).go(); const mv = vals(mc);
    ok(mv.refuse.show && /changed this at \d\d:\d\d; review (her|his|their) change first/.test(mv.refuse.text), 'shell refusal not shown in the drawer: ' + JSON.stringify(mv.refuse.text) + ' ' + mv.msg);
    ok(!shell.state.events.slice(n1).some(e => e.type === 'adjustment'), 'refused change was recorded');
    // Clients: Erik sees plain words only from the shell's view.
    pickRole('erik'); const ev = vals(drawerFor('atlas')); const er = render(drw, ev, 'with shell erik atlas'); er.errs.forEach(fail); scan(er.text, CLIENT_LEAK, 'with shell erik atlas');
    renders += 3;
  }
}

console.log('ClaimDrawer.dc.html: ' + renders + ' renders (10 roles x 27 claim ids incl. none and unknown x story times x events x panels, + standalone)');
console.log('checks run: ' + checks + ', failures: ' + failures.length);
failures.slice(0, 60).forEach(f => console.log('FAIL ' + f));
let exitCode = failures.length ? 1 : 0;

// ---------- Mutations: each new assertion group can fail (run only on the real file) ----------
if (!process.env.HD_DIR) {
  const src = fs.readFileSync(path.join(DIR, 'ClaimDrawer.dc.html'), 'utf8');
  const MUT = [
    ['erik not a client', "const isClient = role === 'ngozi' || role === 'erik'", "const isClient = role === 'ngozi'", /erik/],
    ['late answer never blocks', 'const lateBlocks = !!late && !lateApplied && !isAfter;', 'const lateBlocks = false;', /late/],
    ['stale never computed', "const stale = changeSeqs.some(q => q > s.seq) || evs.some(x => /signoff_stale/", "const stale = false && evs.some(x => /signoff_stale/", /stale/],
    ['identifier note accepted', 'if (IDLIKE.test(t)) { setAtt(', 'if (false) { setAtt(', /identifier in a note/],
    ['edit never refused', "if (a.type === 'adjust' && !shellEmit && unseenOther) {", 'if (false) {', /edit not refused/],
    ['shell refusal ignored', "if (!(r === 0 || r === false || (r && typeof r === 'object' && r.ok === false))) return false;", "return false;", /shell refusal not shown/],
    ['Marcus not scrubbed', "const scrub = (t) => role === 'marcus' ?", 'const scrub = (t) => false ?', /Marcus sees identifier digits|identifier digits in Marcus/],
    ['msg-07 offered early', 'x.claims[claimId] && x.at <= asOf', 'x.claims[claimId]', /msg-07 offered before/],
    ['ca-wages effect wrong', "effect: 'California −5,685", "effect: 'California −5,000", /ca-wages facts/],
    ['Dismiss label back', "A('Clear with a reason', { type: 'clear' })", "A('Dismiss with a reason', { type: 'clear' })", /Clear with a reason missing|renames/],
    ['clients can ask colleagues', 'const canAsk = STAFF.includes(role);', 'const canAsk = !isIrs;', /client or examiner can ask|erik gets staff actions/],
    ['attach does not emit', "if (refused(rec('evidence', 'attached ' + x.label", "if (refused((() => 0)('evidence', 'attached ' + x.label", /attaching call-01 does not emit/],
    ['no Marcus warning', "warn: role === 'marcus', warnText: marcusWarn, hasErr: !!attS.err", "warn: false, warnText: marcusWarn, hasErr: !!attS.err", /Marcus note warning/],
    ['undo not compensating', "rec('undo', 'undid: ' + mineLast.text, { retracts: mineLast.seq, ", "rec('undo', 'undid: ' + mineLast.text, { ", /compensating/],
    ['client sees staff events', "const clientSees = (e) => e.view || ['ngozi', 'erik'].includes(e.by) || e.to.includes(role);", 'const clientSees = (e) => true;', /client sees staff events|leak/],
    ['client gets internal wording', "const say1 = (e) => isClient ? (e.plain || e.clientText || (e.view && !SHORT[e.who] ? e.text : GEN[e.type] || 'updated this item')) : scrub(e.text);", 'const say1 = (e) => scrub(e.text);', /client sees staff events|leak/],
    ['H3b date-only card compare', "if (asOf < '2026-07-13T19:02') {", "if (asOf < '2026-07-13') {", /H3b M1/],
    ['H3b spouseOf ignored', "const to = ['ngozi', 'erik', 'both'].includes(fromShell) ? fromShell : (TO[claimId] || c0.to || 'both');", "const to = TO[claimId] || c0.to || 'both';", /H3b spouse: spouseOf prop ignored/],
    ['H3b noncash missing from fallback', "'noncash': 'erik', 'theo-ssn'", "'theo-ssn'", /noncash question not addressed/],
    ['H3b filed client still asked', "const clientFiled = isClient && asOf >= ACCEPTED;", "const clientFiled = false;", /H3b filed client/],
    ['H3b who as role key unread', "by: e.by || (SHORT[e.who] ? e.who : e.who === 'You'", "by: e.by || (false ? e.who : e.who === 'You'", /H3b events/],
    ['clock lock off', 'const lockedByClock = !roleAfter && !isClient && asOf >= ACCEPTED;', 'const lockedByClock = false;', /locked record/],
    ['partner gate ignores the reviewer', 'const ok = reviewerCurrent && !lateBlocks;', 'const ok = !lateBlocks;', /partner sign-off enabled on a stale|partner sign-off not enabled/],
    ['questions not addressed per spouse', "const mine = to === 'both' || to === role;", 'const mine = true;', /addressed to Erik/],
    ['salt-d02 effect wrong', "effect: 'Federal +1,462: the total", "effect: 'Federal +1,000: the total", /salt-d02 facts/],
    ['sam sees the record before joining', "const notYet = JOINS[role] && asOf < JOINS[role][0] ? JOINS[role][1] : '';", "const notYet = '';", /Sam before 4 Jan 2027|leak/],
    ['undo allowed when locked', "if (isAfter && !isClient) { say('Undo refused", "if (false) { say('Undo refused", /undo allowed after/]
  ];
  const root = path.join(os.tmpdir(), 'hd-mut-' + process.pid);
  let killed = 0;
  for (const [name, a, b, expect] of MUT) {
    if (src.split(a).length !== 2) { console.log('MUTATION ' + name + ': anchor not found once'); exitCode = 1; continue; }
    const d = path.join(root, name.replace(/\W+/g, '-')); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'ClaimDrawer.dc.html'), src.replace(a, b));
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { HD_DIR: d }), encoding: 'utf8' });
    const hit = r.status === 1 && expect.test(r.stdout);
    killed += hit ? 1 : 0;
    console.log('MUTATION ' + (hit ? 'killed  ' : 'SURVIVED') + ' ' + name + ' (exit ' + r.status + ')');
    if (!hit) exitCode = 1;
  }
  console.log('mutations killed: ' + killed + ' of ' + MUT.length);
}
process.exit(exitCode);
