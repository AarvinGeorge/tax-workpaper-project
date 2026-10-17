// Integration: render each child with the asOf the SHELL computes for each role (not the child's own default).
// Written after review-5 found the shell passed date-only asOf while Filing compares datetimes.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, 'project');
const ROLES = ['priya','marcus','daniel','helen','sam','jo','ngozi','erik','next','irs'];
// H3: one story clock per workspace. Each role is exercised at its natural story time, reached through the shell's own clock.
const NAT = { sam: '2027-01-15T15:00', next: '2027-01-15T15:00', irs: '2028-01-26T15:00' };
const shellAt = (role) => { const m = new Main({}); if (NAT[role]) m.moveStory(NAT[role], 'harness'); m.setState({ role }); return m; };
class DCLogic { constructor(p) { this.props = p || {}; this.state = {}; } setState(s) { this.state = { ...this.state, ...(typeof s === 'function' ? s(this.state) : s) }; } forceUpdate() {} }
function load(name) {
  const src = fs.readFileSync(path.join(dir, name + '.dc.html'), 'utf8');
  const body = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(src)[1];
  const ctx = { DCLogic, console }; vm.createContext(ctx);
  vm.runInContext(body + '\n;globalThis.__C = Component;', ctx);
  return ctx.__C;
}
const noop = () => {};
const Main = load('Main'), Filing = load('Filing');
let fail = 0; const bad = m => { fail++; console.log('  FAIL', m); };
const expectHappened = { working: 'Return computed', sam: 'Next year', next: 'Next year', irs: 'Letter 566 received' };
for (const role of ROLES) {
  const m = shellAt(role);
  const mv = m.renderVals();
  const asOf = mv.asOf, asOfLabel = mv.asOfLabel;
  if (!asOf) { bad(role + ': shell gives no asOf'); continue; }
  const f = new Filing({ role, asOf, asOfLabel, dark: false, openClaim: noop, go: noop, claimId: '', revealed: [], reveal: noop, revealLog: [] });
  const fv = f.renderVals();
  const key = ['sam','next','irs'].includes(role) ? role : 'working';
  const row = (fv.timeline || []).find(e => e.title.includes(expectHappened[key]));
  if (!row) bad(`${role}: no timeline row containing "${expectHappened[key]}"`);
  else if (row.tword !== 'Happened') bad(`${role}: "${row.title}" shows "${row.tword}" with shell asOf ${asOf}`);
  else console.log(`  ok ${role} asOf=${asOf} "${row.title}" Happened`);
}
// Round H2: Areas through the shell's asOf, and the drawer for every Areas claim.
const Areas = load('Areas'), Drawer = load('ClaimDrawer');
const AREA_IDS = ['sehi','bright-oak','sek-fx','form-3520','mileage','phone-pct','sec179','payoff-int','or-credit','excess-ss','ca-trace'];
for (const role of ROLES) {
  const m = shellAt(role); const mv = m.renderVals();
  if (['ngozi','erik','irs'].includes(role)) { if (mv.nav.some(n => n.label === 'Areas')) bad(role + ': Areas offered'); continue; }
  const opened = new Set(); const rec = (id) => opened.add(id);
  let av; try { av = new Areas({ role, asOf: mv.asOf, asOfLabel: mv.asOfLabel, dark: false, openClaim: rec, go: noop, claimId: '', revealed: [], reveal: noop, revealLog: [] }).renderVals(); }
  catch (e) { bad(role + ': Areas threw with shell asOf ' + mv.asOf + ': ' + e.message); continue; }
  const txt = JSON.stringify(av, (k, v) => typeof v === 'function' ? undefined : v);
  const working = mv.asOf < '2026-07-13';
  if (working && /his card|D71/.test(txt)) bad(role + ': Areas shows the card before it arrived (asOf ' + mv.asOf + ')');
  if (!working && !/his card/.test(txt)) bad(role + ': Areas after filing does not show the card (asOf ' + mv.asOf + ')');
  // Call every handler Areas exposes (setState stubbed) and record which claims it opens.
  const seen = new Set(); const walk = (o, d) => { if (!o || d > 6 || seen.has(o)) return; if (typeof o === 'function') { try { o({ target: { value: '' }, preventDefault: noop }); } catch (e) {} return; } if (typeof o !== 'object') return; seen.add(o); for (const k of Object.keys(o)) walk(o[k], d + 1); };
  walk(av, 0);
  const ids = AREA_IDS.filter(id => opened.has(id));
  const unknown = [...opened].filter(id => !new Drawer({ role, claimId: id, asOf: mv.asOf, openClaim: noop, go: noop, revealed: [], reveal: noop, revealLog: [] }).renderVals().has);
  if (unknown.length) bad(role + ': Areas opens claims the drawer does not know: ' + unknown.join(','));
  if (ids.length !== AREA_IDS.length) bad(role + ': Areas opens ' + ids.length + ' of the 11 new claims');
  for (const id of AREA_IDS) {
    const dv = new Drawer({ role, claimId: id, asOf: mv.asOf, asOfLabel: mv.asOfLabel, openClaim: noop, go: noop, revealed: [], reveal: noop, revealLog: [] }).renderVals();
    if (!dv.has) bad(role + ': drawer has no claim ' + id);
  }
  console.log(`  ok ${role} Areas asOf=${mv.asOf} opens ${opened.size} claims incl. ${ids.length}/11 new, all known to the drawer`);
}
// Round H3: every child renders with the shell's events, emit, lastSeen and storyAt, before and after a simulated colleague,
// and anything a child emits through its handlers lands in the shell as an event with computed recipients.
const KIDS = ['Home','ReturnMap','Areas','Documents','Checks','Review','Changes','Filing','Firm','ClaimDrawer'];
const Kc = {}; for (const k of KIDS) { try { Kc[k] = load(k); } catch (e) { bad(k + ': failed to load: ' + e.message); } }
const wellFormed = (e, storyAt) => e.seq > 0 && e.at === storyAt && typeof e.type === 'string' && !!e.who;
// Mutation proof for the validator: a planted event dated off the story clock must be rejected.
{ const m = new Main({}); const r = m.emit({ type: 'prepared', text: 'x' }); const e = m.state.events.find(x => x.seq === r);
  if (!wellFormed(e, m.state.storyAt)) bad('validator rejects a good event'); if (wellFormed(Object.assign({}, e, { at: '2026-01-01T00:00' }), m.state.storyAt)) bad('validator accepts an event dated off the clock'); }
const emitted = {}; KIDS.forEach(k => { emitted[k] = 0; });
for (const role of ROLES) {
  for (const phase of ['start', 'after simulate']) {
    const m = shellAt(role);
    if (phase === 'after simulate') { m.setState({ role: 'daniel' }); m.simulate(); m.setState({ role }); }
    const mv = m.renderVals();
    if (mv.notYet.show) { bad(role + ': not active at its natural story time'); continue; }
    for (const k of KIDS) {
      if (!Kc[k]) continue;
      const props = { role, dark: false, openClaim: noop, go: noop, claimId: k === 'ClaimDrawer' ? 'ca-est' : '', revealed: [], reveal: noop, revealLog: mv.revealLog,
        asOf: mv.asOf, asOfLabel: mv.asOfLabel, events: mv.events, emit: mv.emit, lastSeen: mv.lastSeen, storyAt: mv.storyAt };
      let cv; try { const c = new Kc[k](props); cv = c.renderVals(); } catch (e) { bad(role + ' ' + phase + ': ' + k + ' threw with shell events: ' + e.message); continue; }
      const before = m.state.events.length;
      const seen = new Set(); const walk = (o, d) => { if (!o || d > 6 || seen.has(o)) return; if (typeof o === 'function') { if (o === mv.emit || o === mv.openClaim || o === mv.go || o === mv.reveal) return; try { o({ target: { value: 'x' }, preventDefault: noop }); } catch (e) {} return; } if (typeof o !== 'object') return; seen.add(o); for (const key of Object.keys(o)) walk(o[key], d + 1); };
      walk(cv, 0);
      const added = m.state.events.slice(before).filter(e => e.type !== 'edit' && e.type !== 'signoff_stale');
      emitted[k] += added.length;
      for (const e of added) { if (!wellFormed(e, m.state.storyAt)) bad(k + ' emitted a malformed event as ' + role + ': ' + JSON.stringify(e)); try { m.rec(e); } catch (x) { bad('recipient rule threw on ' + k + ' event ' + e.type); } }
    }
  }
}
console.log('  H3 children rendered with shell events for ' + ROLES.length + ' roles x 2 phases; events emitted through child handlers: ' + KIDS.map(k => k + ' ' + emitted[k]).join(', '));
// ---------- Round H3b: act through the shell, then re-render (review 7, M2, M3, should-fix 1 and 7) ----------
{
  const kid = (name, m, mv, claimId) => new Kc[name]({ role: m.state.role, dark: false, openClaim: noop, go: noop, claimId: claimId || '', revealed: [], reveal: noop, revealLog: mv.revealLog,
    asOf: mv.asOf, asOfLabel: mv.asOfLabel, events: mv.events, emit: mv.emit, lastSeen: mv.lastSeen, storyAt: mv.storyAt, blockers: mv.blockers, stage: mv.stage, spouseOf: mv.spouseOf });
  const tryit = (label, f) => { try { const r = f(); if (r !== true) bad('H3b ' + label + ': ' + r); else console.log('  ok H3b ' + label); } catch (e) { bad('H3b ' + label + ' threw: ' + e.message); } };
  // (a1) Checks: Priya marks repairs prepared; the re-rendered item is prepared, not "new", and Mark prepared is off.
  tryit('Checks Mark prepared through the shell', () => { const m = new Main({}); m.setState({ role: 'priya' }); let mv = m.renderVals();
    const it = kid('Checks', m, mv).renderVals().items.find(i => i.id === 'repairs'); const a = it.acts.find(x => x.label === 'Mark prepared'); if (!a) return 'no Mark prepared on repairs'; a.run();
    mv = m.renderVals(); const it2 = kid('Checks', m, mv).renderVals().items.find(i => i.id === 'repairs'); const a2 = it2.acts.find(x => x.label === 'Mark prepared');
    return (it2.grp !== 'Since you last looked' && (!a2 || a2.dis === true || a2.dis === 'true')) || 'after: grp="' + it2.grp + '" tword="' + it2.tword + '" Mark prepared dis=' + (a2 && a2.dis); });
  // (a2) Review: send to reviewer flips the button.
  tryit('Review send to reviewer through the shell', () => { const m = new Main({}); m.setState({ role: 'priya' }); let mv = m.renderVals(); const b0 = kid('Review', m, mv).renderVals().mergeBtns[0]; b0.run();
    mv = m.renderVals(); const b1 = kid('Review', m, mv).renderVals().mergeBtns[0]; return (b1.label !== b0.label) || 'button still "' + b1.label + '"'; });
  // (a3) Firm: Jo reassigns; the row names the new assignee and Marcus is notified.
  tryit('Firm Jo reassign through the shell', () => { const m = new Main({}); m.setState({ role: 'jo' }); let mv = m.renderVals(); const r0 = kid('Firm', m, mv).renderVals().asgRows[0]; if (!r0.move) return 'no move on asgRows[0]'; r0.move();
    mv = m.renderVals(); const r1 = kid('Firm', m, mv).renderVals().asgRows[0]; m.setState({ role: 'marcus' }); const mb = m.renderVals().bell.count;
    return (r1.who !== r0.who && /Marcus/.test(r1.who) && mb > 0) || 'row who "' + r0.who + '" -> "' + r1.who + '", marcus bell ' + mb; });
  // (a4) Filing: Ngozi signs Form 8879, then a fresh Filing still shows it signed.
  tryit('Filing Ngozi signs 8879 then remount', () => { const m = new Main({}); m.moveStory('2026-07-10T20:00', 'h'); m.setState({ role: 'ngozi' }); let mv = m.renderVals(); const F = kid('Filing', m, mv); F.setState({ preview: true });
    const card = (F.renderVals().sigCards || [])[0]; if (!card) return 'no sigCards'; const f0 = card.forms[0]; if (!f0.sign) return 'no sign on the 8879 card'; f0.sign();
    mv = m.renderVals(); const F2 = kid('Filing', m, mv); F2.setState({ preview: true }); const t = F2.renderVals().sigCards[0].forms[0].tword; return (!/Not signed/i.test(t)) || 'fresh Filing says "' + t + '"'; });
  // (a5) Drawer: attach, then Undo; the evidence list shows it, then shows it withdrawn or gone.
  tryit('attach then undo through the shell', () => { const m = new Main({}); m.setState({ role: 'priya' }); let mv = m.renderVals();
    const s = mv.emit({ type: 'document_attached', claimId: 'fed-est', kind: 'note', itemIds: [], text: 'attached a note: the IRS record shows 12,000' }); if (!s) return 'emit refused';
    mv = m.renderVals(); const d1 = kid('ClaimDrawer', m, mv, 'fed-est').renderVals(); const n1 = (d1.evidence || []).length; if (!d1.undo.show) return 'no Undo after attaching (evidence ' + n1 + ')'; d1.undo.go();
    mv = m.renderVals(); const d2 = kid('ClaimDrawer', m, mv, 'fed-est').renderVals(); const live2 = (d2.evidence || []).filter(v => !v.undone && !v.withdrawn).length;
    return (n1 >= 1 && live2 < n1 && m.state.events[m.state.events.length - 1].retracts === s) || 'evidence ' + n1 + ' -> ' + live2; });
  // (b) Clock backwards: jump to 15 Jul, then back to 23 Jun; every child's view shrinks (no D71, no rejection).
  tryit('clock backwards shrinks every child', () => { const m = new Main({}); m.setState({ role: 'priya' }); m.renderVals().jumpPick({ target: { value: 'tl-24' } });
    let mv = m.renderVals(); const late = {}; for (const k of KIDS) late[k] = JSON.stringify(kid(k, m, mv, k === 'ClaimDrawer' ? 'theo-ssn' : '').renderVals(), (kk, v) => typeof v === 'function' ? undefined : v);
    m.renderVals().jumpPick({ target: { value: 'tl-17' } }); mv = m.renderVals(); const probs = [];
    if (mv.events.some(e => e.at > mv.storyAt)) probs.push('shell view has future events');
    // Filing's timeline may list later events as "Later in this story (not yet happened)" (FIX-ROUND-H1 item 1); only happened rows count.
    for (const k of KIDS) { const v = kid(k, m, mv, k === 'ClaimDrawer' ? 'theo-ssn' : '').renderVals(); if (k === 'Filing' && Array.isArray(v.timeline)) v.timeline = v.timeline.filter(r => r.tword === 'Happened');
      const t = JSON.stringify(v, (kk, x) => typeof x === 'function' ? undefined : x);
      if (/\bD71\b|rejected|his card/.test(t)) probs.push(k + ' still shows D71 or the rejection: "' + t.match(/.{0,50}(\bD71\b|rejected|his card).{0,30}/)[0] + '"'); }
    return probs.length ? probs.join('; ') : true; });
  // (c) After Priya adjusts ca-est, Helen's button text is identical in Home, Checks, Review, Filing and Firm.
  tryit('Helen blocker text identical in five screens', () => { const m = new Main({}); m.setState({ role: 'priya' }); m.renderVals().emit({ type: 'adjustment', claimId: 'ca-est', text: 'adjusted F540NR line 72 from 14,000 to 10,500', before: '14,000', after: '10,500' });
    m.setState({ role: 'helen' }); const mv = m.renderVals(); const want = 'Approve and send to client: blocked by “' + mv.blockers[0].title + '”, and ' + (mv.blockers.length - 1) + ' more';
    const got = {}; for (const k of ['Home', 'Checks', 'Review', 'Filing', 'Firm']) { const t = JSON.stringify(kid(k, m, mv).renderVals(), (kk, v) => typeof v === 'function' ? undefined : v); const mm = t.match(/blocked by \\?“[^”]*\\?”(, and \d+ more)?/); got[k] = mm ? mm[0].replace(/\\/g, '') : '(none)'; }
    const tail = want.slice(want.indexOf('blocked by')); const off = Object.entries(got).filter(([, v]) => v !== tail);
    return off.length ? 'want "' + tail + '"; ' + off.map(([k, v]) => k + ' "' + v + '"').join('; ') : true; });
  // (d) Marcus never receives identifier digits in event-borne text (the shell's events, and what each child renders from them).
  // Masked display XXX-XX-3390 is the masking rule for every role (call 4), so the child scan looks for the planted note's "card ends 3390".
  tryit('Marcus sees no identifier digits in any child', () => { const m = new Main({}); m.setState({ role: 'priya' }); m.renderVals().emit({ type: 'attach', claimId: 'theo-ssn', text: 'attached a note: Theo card ends 3390', clientText: 'card ends 3390', itemIds: [] });
    m.moveStory('2026-07-15T02:10', 'h'); m.setState({ role: 'marcus' }); const mv = m.renderVals(); const probs = []; const re = /(SSN|identifier|card|account|ends|ending|XXX-XX-)\D{0,12}\b\d{4}\b/i;
    const em = JSON.stringify(mv.events).match(re); if (em) probs.push('shell events "' + em[0] + '"');
    for (const k of KIDS) { const t = JSON.stringify(kid(k, m, mv, k === 'ClaimDrawer' ? 'theo-ssn' : '').renderVals(), (kk, v) => typeof v === 'function' ? undefined : v); const mm = t.match(/card ends \d{4}/i); if (mm) probs.push(k + ' "' + mm[0] + '"'); }
    return probs.length ? probs.join('; ') : true; });
}
console.log('failures:', fail); process.exit(fail ? 1 : 0);
