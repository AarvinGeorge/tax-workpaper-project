// The AI payload as untrusted input: load (schema), verify (grounding), merge (findings beside our checks), and the two
// review events. Absent payload changes nothing; held-back suggestions are counted with reasons; AI never blocks filing.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks/index';
import { loadAiPayload, packetShaOf, parseAiPayload } from '@/domain/ai/load';
import { supersession, verifySuggestions } from '@/domain/ai/verify';
import { aiFindings, aiReview, confidenceWord, suggestionStatus } from '@/domain/ai/merge';
import type { AiPayload, AiSuggestion } from '@/domain/ai/contract';
import { EVENT_TYPES } from '@/domain/events';
import { can, roleInfo } from '@/domain/policy';
import { projectWorkspace } from '@/domain/project';
import { notificationsFor } from '@/domain/notify';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import { loadWorkspace, maskFinding, postEvent } from '@/server/state';
import { getStore } from '@/domain/store';
import type { RoleKey, WorkEvent } from '@/domain/contracts';
import { AI_FIXTURE_IDS, aiFixture, writeAiFixture } from '../fixtures/ai-payload';

const ix = indexPacket(loadPacket());
const AT = DEFAULT_STORY_AT(ix);
const dir = mkdtempSync(path.join(tmpdir(), 'taxmark-ai-'));
const file = (name: string, body: unknown) => {
  const f = path.join(dir, name);
  writeFileSync(f, typeof body === 'string' ? body : JSON.stringify(body));
  return f;
};
const SSN_LIKE = ['123', '45', '6789'].join('-'); // synthetic, not from the packet
const clone = (p: AiPayload): AiPayload => JSON.parse(JSON.stringify(p));
const withSug = (over: Partial<AiSuggestion>): AiPayload => {
  const p = clone(aiFixture());
  p.suggestions = [{ ...p.suggestions[0], ...over }];
  return p;
};
const shownIds = (p: AiPayload) => verifySuggestions(ix, p).filter((v) => v.grounded && v.problems.length === 0).map((v) => v.id);
const problemsOf = (p: AiPayload) => verifySuggestions(ix, p)[0].problems.join(' | ');

let saved: string | undefined;
beforeEach(() => { saved = process.env.AI_PAYLOAD_PATH; });
afterEach(() => { if (saved === undefined) delete process.env.AI_PAYLOAD_PATH; else process.env.AI_PAYLOAD_PATH = saved; });

describe('load: tolerant validation', () => {
  it('an absent file means no AI section', () => {
    expect(loadAiPayload(ix, path.join(dir, 'missing.json')).status).toBe('absent');
  });
  it('loads the fixture and ignores unknown extra fields', () => {
    const p = aiFixture() as AiPayload & { extra?: unknown };
    p.extra = { anything: 1 };
    (p.suggestions[0] as AiSuggestion & { note?: string }).note = 'ignored';
    const r = parseAiPayload(p, packetShaOf(ix));
    expect(r.status).toBe('loaded');
    if (r.status !== 'loaded') return;
    expect(r.payload.suggestions).toHaveLength(3);
    expect(r.held).toEqual([]);
  });
  it('quarantines invalid rows with a reason and keeps the rest', () => {
    const p = clone(aiFixture()) as unknown as { suggestions: unknown[] };
    p.suggestions.push({ id: 'ai-x-1', kind: 'not_a_kind', otherKind: null, claims: [], evidence: [], rationale: 'x', authority: null, confidence: 2 });
    p.suggestions.push('not an object');
    p.suggestions.push({ ...(p.suggestions[0] as object) }); // duplicate id
    const r = parseAiPayload(p, packetShaOf(ix));
    expect(r.status).toBe('loaded');
    if (r.status !== 'loaded') return;
    expect(r.payload.suggestions).toHaveLength(3);
    expect(r.held).toHaveLength(3);
    expect(r.held[0].reasons.join(' ')).toMatch(/kind/);
    expect(r.held[0].reasons.join(' ')).toMatch(/evidence/);
    expect(r.held[0].reasons.join(' ')).toMatch(/confidence/);
    expect(r.held[2].reasons.join(' ')).toMatch(/duplicate/i);
  });
  it('refuses a bad envelope without throwing', () => {
    expect(parseAiPayload({ schemaVersion: 2 }, packetShaOf(ix)).status).toBe('refused');
    expect(parseAiPayload(null, packetShaOf(ix)).status).toBe('refused');
    expect(loadAiPayload(ix, file('broken.json', '{not json')).status).toBe('refused');
  });
  it('refuses the whole payload when it was made for another packet', () => {
    const p = clone(aiFixture());
    p.packetSha = '0'.repeat(64);
    const r = parseAiPayload(p, packetShaOf(ix));
    expect(r.status).toBe('refused');
    if (r.status !== 'refused') return;
    expect(r.held).toHaveLength(3);
    for (const h of r.held) expect(h.reasons.join(' ')).toMatch(/different packet/);
  });
  it('the packet hash is the delivered packet’s', () => {
    expect(packetShaOf(ix).slice(0, 12)).toBe('ee01f8508bd2');
  });
  it('is cached per file', () => {
    const f = writeAiFixture(path.join(dir, 'cached.json'));
    expect(loadAiPayload(ix, f)).toBe(loadAiPayload(ix, f));
  });
});

describe('verify: grounding and vetting', () => {
  const p = aiFixture();
  it('shows the grounded suggestion and holds back the fake quote and the unvetted authority, with reasons', () => {
    const v = verifySuggestions(ix, p);
    const by = (id: string) => v.find((x) => x.id === id)!;
    expect(by(AI_FIXTURE_IDS.grounded).grounded).toBe(true);
    expect(by(AI_FIXTURE_IDS.grounded).problems).toEqual([]);
    expect(by(AI_FIXTURE_IDS.fake).grounded).toBe(false);
    expect(by(AI_FIXTURE_IDS.fake).problems.join(' ')).toMatch(/quote not found/i);
    expect(by(AI_FIXTURE_IDS.unvetted).grounded).toBe(true);
    expect(by(AI_FIXTURE_IDS.unvetted).problems.join(' ')).toMatch(/authority not in the vetted list/i);
    expect(shownIds(p)).toEqual([AI_FIXTURE_IDS.grounded]);
  });
  it('normalises whitespace but stays case-sensitive', () => {
    const q = p.suggestions[0].evidence[0];
    const spaced = withSug({ evidence: [{ ...q, quote: '  ' + q.quote.replace(/ /g, '\n  ') + ' ' }] });
    expect(shownIds(spaced)).toHaveLength(1);
    const upper = withSug({ evidence: [{ ...q, quote: q.quote.toUpperCase() }] });
    expect(shownIds(upper)).toHaveLength(0);
  });
  it('flags a missing document or page', () => {
    const q = p.suggestions[0].evidence[0];
    expect(problemsOf(withSug({ evidence: [{ ...q, doc: 'D999' }] }))).toMatch(/no document D999/i);
    expect(problemsOf(withSug({ evidence: [{ ...q, page: 99 }] }))).toMatch(/no page 99/i);
  });
  it('flags a rationale over 30 words', () => {
    expect(problemsOf(withSug({ rationale: Array(31).fill('word').join(' ') }))).toMatch(/over 30 words/);
  });
  it('flags SSN-shaped text anywhere', () => {
    expect(problemsOf(withSug({ rationale: `See ${SSN_LIKE}.` }))).toMatch(/SSN-shaped/);
    expect(problemsOf(withSug({ otherKind: SSN_LIKE.replace(/-/g, '') }))).toMatch(/SSN-shaped/);
  });
});

describe('merge: findings beside our checks', () => {
  const p = aiFixture();
  const f = aiFindings(ix, p, verifySuggestions(ix, p));
  it('turns only shown suggestions into AI findings', () => {
    expect(f.map((x) => x.id)).toEqual([AI_FIXTURE_IDS.grounded]);
    const g = f[0];
    expect(g.source).toBe('ai');
    expect(g.family).toBe('AI suggestion');
    expect(g.severity).toBe('judgment');
    expect(g.ledgerIds).toEqual([]);
    expect(g.claims).toEqual(['line:SchE.14A']);
    const q = p.suggestions[0].evidence[0];
    expect(g.evidence).toEqual([`doc:${q.doc}#page${q.page}`]);
    expect(g.ai).toMatchObject({ kind: 'repair_vs_improvement', model: 'example-model', promptVersion: 'reader-test', confidence: 0.86 });
    expect(g.ai!.quotes[0].quote).toBe(q.quote);
    expect(g.explanation).toBe(p.suggestions[0].rationale);
    expect(g.firstVisibleAt).toBe(ix.docById.get(q.doc)!.received_at);
  });
  it('words confidence plainly', () => {
    expect([confidenceWord(0.9), confidenceWord(0.6), confidenceWord(0.2)]).toEqual(['high', 'medium', 'low']);
  });
  it('aiReview counts held-back suggestions with reasons', () => {
    const r = aiReview(ix, writeAiFixture(path.join(dir, 'review.json')));
    expect(r.present).toBe(true);
    expect(r.findings).toHaveLength(1);
    expect(r.held.map((h) => h.id).sort()).toEqual([AI_FIXTURE_IDS.fake, AI_FIXTURE_IDS.unvetted].sort());
    expect(aiReview(ix, path.join(dir, 'nothing.json'))).toMatchObject({ present: false, findings: [], held: [] });
  });
});

describe('workspace: absent changes nothing, present adds AI for staff only', () => {
  it('absent payload: findings are exactly the checks', async () => {
    process.env.AI_PAYLOAD_PATH = path.join(dir, 'absent.json');
    const w = await loadWorkspace('ws-ai-absent', 'daniel');
    expect(w.findings).toEqual(runChecks(ix));
    expect(w.ai.present).toBe(false);
  });
  it('present payload: staff get the checks unchanged plus the AI findings; clients and the examiner none', async () => {
    process.env.AI_PAYLOAD_PATH = writeAiFixture(path.join(dir, 'ws.json'));
    const checks = runChecks(ix);
    const d = await loadWorkspace('ws-ai-present', 'daniel');
    expect(d.findings.slice(0, checks.length)).toEqual(checks);
    expect(d.findings.filter((x) => x.source === 'ai').map((x) => x.id)).toEqual([AI_FIXTURE_IDS.grounded]);
    expect(d.ai.held).toHaveLength(2);
    for (const r of ['ngozi', 'erik', 'irs'] as RoleKey[]) {
      const w = await loadWorkspace('ws-ai-present', r);
      expect(w.findings.some((x) => x.source === 'ai')).toBe(false);
      expect(w.ai.present).toBe(false);
      expect(w.ai.held).toEqual([]);
    }
  });
  it('AI findings never block approval', async () => {
    process.env.AI_PAYLOAD_PATH = writeAiFixture(path.join(dir, 'block.json'));
    const w = await loadWorkspace('ws-ai-block', 'helen');
    expect(w.findings.some((x) => x.source === 'ai')).toBe(true);
    expect(w.state.blockers.some((b) => b.claimId.startsWith('finding:ai-'))).toBe(false);
    // Same blockers as with no AI at all.
    expect(w.state.blockers).toEqual(projectWorkspace(ix, [], 'helen', runChecks(ix)).blockers);
    expect(can(ix, 'helen', 'approve', 'return', w.state).reason ?? '').not.toMatch(/AI suggestion|Suggested by AI/);
  });
});

describe('events: accept and dismiss, staff with write access only', () => {
  it('adds the two event types', () => {
    expect(EVENT_TYPES).toContain('suggestion_accepted');
    expect(EVENT_TYPES).toContain('suggestion_dismissed');
  });
  it('staff accept and dismiss (dismiss needs a reason); clients, the examiner and read-only seats are refused', async () => {
    process.env.AI_PAYLOAD_PATH = writeAiFixture(path.join(dir, 'events.json'));
    const ws = 'ws-ai-ev-' + Date.now().toString(36);
    const claimId = 'finding:' + AI_FIXTURE_IDS.grounded;
    for (const r of ['ngozi', 'erik', 'irs', 'sam'] as RoleKey[]) {
      const res = await postEvent(ws, r, { type: 'suggestion_accepted', claimId, payload: {} });
      expect(res.ok, r).toBe(false);
    }
    const noReason = await postEvent(ws, 'daniel', { type: 'suggestion_dismissed', claimId, payload: {} });
    expect(noReason.ok).toBe(false);
    const unknown = await postEvent(ws, 'daniel', { type: 'suggestion_accepted', claimId: 'finding:' + AI_FIXTURE_IDS.fake, payload: {} });
    expect(unknown.ok).toBe(false);
    const ok = await postEvent(ws, 'priya', { type: 'suggestion_accepted', claimId, payload: {} });
    expect(ok.ok).toBe(true);
    let events = await getStore().list(ws);
    expect(suggestionStatus(events, AI_FIXTURE_IDS.grounded)).toMatchObject({ status: 'accepted', by: 'priya' });
    const dis = await postEvent(ws, 'daniel', { type: 'suggestion_dismissed', claimId, payload: { reason: 'Already handled by our check' } });
    expect(dis.ok).toBe(true);
    events = await getStore().list(ws);
    expect(suggestionStatus(events, AI_FIXTURE_IDS.grounded)).toMatchObject({ status: 'dismissed', by: 'daniel', reason: 'Already handled by our check' });
    expect(suggestionStatus([], AI_FIXTURE_IDS.grounded).status).toBe('needs_review');
  });
  it('an undone decision goes back to needs review', () => {
    const e = (seq: number, type: WorkEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
      ({ seq, ws: 'w', at: AT, storyAt: AT, role: 'daniel', type, payload: {}, ...extra });
    const id = AI_FIXTURE_IDS.grounded;
    const events = [e(1, 'suggestion_accepted', { claimId: 'finding:' + id }), e(2, 'undo', { retracts: 1 })];
    expect(suggestionStatus(events, id).status).toBe('needs_review');
  });
  it('sends no notifications for AI suggestions', () => {
    const e = (seq: number, role: RoleKey, type: WorkEvent['type'], payload = {}): WorkEvent =>
      ({ seq, ws: 'w', at: AT, storyAt: AT, role, type, claimId: 'finding:' + AI_FIXTURE_IDS.grounded, payload });
    const events = [e(1, 'priya', 'suggestion_accepted'), e(2, 'daniel', 'suggestion_dismissed', { reason: 'x' })];
    for (const r of ['priya', 'daniel', 'helen', 'jo'] as RoleKey[]) expect(notificationsFor(ix, events, r)).toEqual([]);
  });
});

describe('verify: evidence only from a superseded document', () => {
  // The reader-v1 payload, kept by lane R as a frozen file (never the live data/ai-suggestions.json, which changes).
  const realFile = path.join(process.cwd(), 'data', 'ai-suggestions.v1.json');
  const real = loadAiPayload(ix, realFile);
  const verified = real.status === 'loaded' ? verifySuggestions(ix, real.payload) : [];
  const v = (id: string) => verified.find((x) => x.id === id)!;

  it('maps each superseded document to the one that replaced it, from the packet', () => {
    const m = supersession(ix);
    expect(m.get('D30')).toBe('D31');
    expect(m.has('D31')).toBe(false);
    // Derived from marked_corrected too: with documents_superseded emptied, D30 still maps to D31.
    const p = JSON.parse(JSON.stringify(ix.packet));
    for (const rv of p.return_versions) rv.documents_superseded = [];
    expect(supersession(indexPacket(p)).get('D30')).toBe('D31');
    // Superseded with no identifiable successor: null.
    const q = JSON.parse(JSON.stringify(ix.packet));
    q.return_versions[q.return_versions.length - 1].documents_superseded.push('D47');
    expect(supersession(indexPacket(q)).get('D47')).toBeNull();
  });

  it('holds back the three D30-only cases from the reader-v1 payload', () => {
    expect(real.status).toBe('loaded');
    for (const id of ['ai-document_not_reflected-4', 'ai-document_not_reflected-5', 'ai-date_or_year_mismatch-1']) {
      expect(v(id), id).toBeDefined();
      expect(v(id).problems).toContain('Evidence only from a superseded document (D30, replaced by D31)');
    }
  });

  it('keeps the M18 case, whose quotes are also on D31, and re-points its evidence to D31', () => {
    const s = v('ai-document_not_reflected-3');
    expect(s.grounded).toBe(true);
    expect(s.problems).toEqual([]);
    expect(s.evidence.every((e) => e.doc === 'D31')).toBe(true);
    expect(s.evidence.some((e) => e.page === 32)).toBe(true);
  });

  it('synthetic: superseded-only held back, found-on-successor kept and re-pointed, mixed evidence untouched', () => {
    const d30 = ix.docById.get('D30')!;
    const d31Text = ix.docById.get('D31')!.pages.map((pg) => pg.printed_content.replace(/\s+/g, ' '));
    const pick = (onSuccessor: boolean) => {
      for (const pg of d30.pages) for (const part of pg.printed_content.split(/;\s*/)) {
        const q = part.trim();
        if (q.length < 25 || /\d{3}-\d{2}-\d{4}/.test(q)) continue;
        if (d31Text.some((t) => t.includes(q.replace(/\s+/g, ' '))) === onSuccessor) return { doc: 'D30', page: pg.page, quote: q };
      }
      throw new Error('no quote');
    };
    const only = withSug({ evidence: [pick(false)], authority: null });
    expect(verifySuggestions(ix, only)[0].problems).toEqual(['Evidence only from a superseded document (D30, replaced by D31)']);
    const kept = verifySuggestions(ix, withSug({ evidence: [pick(true)], authority: null }))[0];
    expect(kept.problems).toEqual([]);
    expect(kept.evidence[0].doc).toBe('D31');
    const mixed = withSug({ evidence: [pick(false), aiFixture().suggestions[0].evidence[0]] });
    expect(verifySuggestions(ix, mixed)[0].problems).toEqual([]);
  });
});

describe('verify: a quote too short to prove anything', () => {
  const base = aiFixture().suggestions[0].evidence[0];
  const TOO_SHORT = 'Quote too short to prove anything';
  it('holds back a suggestion whose only quote is "Tax ID" (the reader-v2 ai-other-7 case on D62)', () => {
    expect(ix.docById.get('D62')!.pages[0].printed_content).toContain('Tax ID');
    const p = withSug({ evidence: [{ doc: 'D62', page: 1, quote: 'Tax ID' }], authority: null });
    const r = verifySuggestions(ix, p)[0];
    expect(r.grounded).toBe(true);
    expect(r.problems).toEqual([TOO_SHORT]);
  });
  it('keeps line items that carry an amount (the reader-v2 Spotify and 15 Sep payment cases)', () => {
    for (const [doc, quote] of [['D15', 'Spotify Family 216.00'], ['D67', '09/15/2025 3,000.00']]) {
      const r = verifySuggestions(ix, withSug({ evidence: [{ doc, page: 1, quote }], authority: null }))[0];
      expect(r.grounded, quote).toBe(true);
      expect(r.problems, quote).toEqual([]);
    }
  });
  it('is short when under 8 characters, or under 3 words with no digit, after whitespace normalisation', () => {
    const on = (quote: string) => verifySuggestions(ix, withSug({ evidence: [{ doc: 'D15', page: 1, quote }], authority: null }))[0].problems;
    expect(on('216.00')).toEqual([TOO_SHORT]);                      // 6 characters, digits do not save it
    expect(on('Spotify  Family')).toContain(TOO_SHORT);             // 2 words, no digit (not on the page either)
    expect(on('  Spotify\n Family   216.00 ')).toEqual([]);          // normalised: 3 words with an amount
  });
  it('a short quote is fine beside a long enough one', () => {
    const p = withSug({ evidence: [{ doc: 'D62', page: 1, quote: 'Tax ID' }, base] });
    expect(verifySuggestions(ix, p)[0].problems).toEqual([]);
  });
});

describe('review fixes: who may review, when, and what the API sends', () => {
  const claimId = 'finding:' + AI_FIXTURE_IDS.grounded;
  const fresh = () => 'ws-ai-rv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  beforeEach(() => { process.env.AI_PAYLOAD_PATH = writeAiFixture(path.join(dir, 'review-fixes.json')); });

  it('S1: a staff seat without a sign-off level (the firm administrator) is refused', async () => {
    const r = await postEvent(fresh(), 'jo', { type: 'suggestion_accepted', claimId, payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/does not review AI suggestions/);
  });
  it('S2: a suggestion not yet visible at the story clock cannot be reviewed', async () => {
    const ws = fresh();
    const quoted = aiFixture().suggestions[0].evidence[0].doc;
    const before = new Date(Date.parse(ix.docById.get(quoted)!.received_at) - 86_400_000).toISOString();
    expect((await postEvent(ws, 'daniel', { type: 'clock_moved', payload: { to: before } })).ok).toBe(true);
    const r = await postEvent(ws, 'daniel', { type: 'suggestion_accepted', claimId, payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not in the story yet/);
  });
  it('S4: a read-only staff seat that is active at the clock is refused for having no write access', async () => {
    const ws = fresh();
    const samFrom = roleInfo(ix, 'sam')!.activeFrom!;
    const after = new Date(Date.parse(samFrom) + 7 * 86_400_000).toISOString();
    expect((await postEvent(ws, 'daniel', { type: 'clock_moved', payload: { to: after } })).ok).toBe(true);
    const r = await postEvent(ws, 'sam', { type: 'suggestion_accepted', claimId, payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/read-only access/);
  });
  it('refuses a second accept, with a clear reason', async () => {
    const ws = fresh();
    expect((await postEvent(ws, 'priya', { type: 'suggestion_accepted', claimId, payload: {} })).ok).toBe(true);
    const again = await postEvent(ws, 'daniel', { type: 'suggestion_accepted', claimId, payload: {} });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toMatch(/already accepted/i);
  });
  it('S3: the API masks AI quotes and rationale for the role, like the explanation', () => {
    const acct = 'account 12345678';
    const f = { ...aiFindings(ix, aiFixture(), verifySuggestions(ix, aiFixture()))[0] };
    f.ai = { ...f.ai!, rationale: `See ${acct}.`, quotes: [{ doc: 'D47', page: 1, quote: `Paid from ${acct}` }] };
    const out = maskFinding(f, roleInfo(ix, 'marcus')!);
    expect(JSON.stringify(out)).not.toContain('12345678');
    expect(out.ai!.rationale).toMatch(/5678/);
    expect(out.ai!.quotes[0].quote).toMatch(/5678/);
  });
});
