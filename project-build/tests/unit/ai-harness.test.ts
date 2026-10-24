// Lane R: the AI harness scores a payload against the ledger of known mistakes.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import type { AiPayload, AiSuggestion } from '@/domain/ai/contract';
import { supersession } from '@/domain/ai/verify';
import { adjudicatedFigures, agentScorecardMarkdown, beyondChecksTier, goldSet, hiddenOnlyLedger, tierFigures, uncheckedLedger, isGrounded, matches, matchesStrict, scorePayload, scorecardMarkdown, shownView, type Adjudication } from '../../ai/lib/harness-core';
import { personNames, redactNames } from '../../ai/lib/reader-core';
import { hiddenCheckIds } from '../../ai/lib/modes';
import { runChecks } from '@/domain/checks/index';

const ix = indexPacket(loadPacket());
const gold = goldSet(ix);

/** A grounded quote from any page of a document. */
function quoteFrom(doc: string) {
  const d = ix.docById.get(doc)!;
  const pg = d.pages.find((p) => p.printed_content.trim().length > 5)!;
  const line = pg.printed_content.split('\n').map((l) => l.trim()).find((l) => l.length > 3)!;
  return { doc, page: pg.page, quote: line };
}
const payload = (suggestions: AiSuggestion[], rejected: AiPayload['rejected'] = []): AiPayload => ({
  schemaVersion: 1, packetSha: 'x', model: 'test', promptVersion: 'reader-v1', runAt: '2026-10-17T00:00:00Z', suggestions, rejected,
});
const sug = (id: string, claims: string[], evidence: AiSuggestion['evidence']): AiSuggestion => ({
  id, kind: 'other', otherKind: 'test', claims, evidence, rationale: 'test', authority: null, confidence: 0.5,
});

describe('AI harness: gold set', () => {
  it('has all 27 ledger entries, each with a line or a document to match on', () => {
    expect(gold).toHaveLength(27);
    for (const g of gold) expect(g.lines.size + g.docs.size, g.id).toBeGreaterThan(0);
  });
  it('the text tier includes the judgment, client-answer, residency, limit families and GT-D05', () => {
    const tier = gold.filter((g) => g.textTier).map((g) => g.id);
    for (const id of ['GT-C05', 'GT-C08', 'GT-A06', 'GT-C04', 'GT-A02', 'GT-C07', 'GT-D04', 'GT-D05']) expect(tier).toContain(id);
    expect(tier).not.toContain('GT-A01');
  });
});

describe('AI harness: grounding', () => {
  it('accepts a verbatim quote with different whitespace and rejects an altered one', () => {
    const q = quoteFrom(ix.packet.documents[0].id);
    const spaced = { ...q, quote: `  ${q.quote.replace(/ /g, '   ')} ` };
    expect(isGrounded(ix, { evidence: [spaced] })).toBe(true);
    expect(isGrounded(ix, { evidence: [{ ...q, quote: q.quote + ' invented words' }] })).toBe(false);
    expect(isGrounded(ix, { evidence: [{ ...q, page: 999 }] })).toBe(false);
    expect(isGrounded(ix, { evidence: [] })).toBe(false);
  });
});

describe('AI harness: scoring', () => {
  it('a payload hitting every gold entry scores full recall and precision', () => {
    const all = gold.map((g, i) => {
      const doc = [...g.docs].find((d) => ix.docById.get(d)?.pages.some((p) => p.printed_content.trim().length > 5));
      return sug(`s${i}`, [...g.lines], [quoteFrom(doc ?? ix.packet.documents[0].id)]);
    });
    const s = scorePayload(ix, payload(all));
    // Strict: only entries whose own claims include a line can be matched.
    const withLines = gold.filter((g) => g.claimLines.size).map((g) => g.id);
    expect(s.ledgerFound).toEqual(withLines);
    expect(s.loose.found).toHaveLength(27);
    expect(s.loose.recall).toBe(1);
    expect(s.groundingRate).toBe(1);
  });

  it('an empty payload scores zero, and ungrounded suggestions do not count towards recall', () => {
    expect(scorePayload(ix, payload([])).recall).toBe(0);
    const g = gold.find((x) => x.lines.size)!;
    const bad = sug('u1', [[...g.lines][0]], [{ ...quoteFrom(ix.packet.documents[0].id), quote: 'words that are on no page at all zzq' }]);
    const s = scorePayload(ix, payload([bad]));
    expect(s.recall).toBe(0);
    expect(s.ungrounded).toEqual(['u1']);
  });

  it('lists grounded suggestions that match nothing, and counts rejected rows and kinds', () => {
    const goldDocs = new Set(gold.flatMap((g) => [...g.docs]));
    const free = ix.packet.documents.find((d) => !goldDocs.has(d.id) && d.pages.some((p) => p.printed_content.trim().length > 5));
    expect(free).toBeDefined();
    const s = scorePayload(ix, payload([sug('n1', [], [quoteFrom(free!.id)])], [{ raw: {}, reason: 'unknown kind x' }]));
    expect(s.precision).toBe(0);
    expect(s.unmatched.map((u) => u.id)).toEqual(['n1']);
    expect(s.rejected).toBe(1);
    expect(s.perKind).toEqual({ other: 1 });
  });

  it('matches on a shared line key or a shared evidence document', () => {
    const g = gold.find((x) => x.lines.size && x.docs.size)!;
    expect(matches({ claims: [[...g.lines][0]], evidence: [] }, g)).toBe(true);
    expect(matches({ claims: [], evidence: [{ doc: [...g.docs][0], page: 1, quote: '' }] }, g)).toBe(true);
    expect(matches({ claims: ['NOPE'], evidence: [{ doc: 'NOPE', page: 1, quote: '' }] }, g)).toBe(false);
  });

  it('strict matching needs a shared claim line key; a shared document alone is loose only', () => {
    const g = gold.find((x) => x.claimLines.size && x.docs.size)!;
    expect(matchesStrict({ claims: [[...g.claimLines][0]], evidence: [] }, g)).toBe(true);
    expect(matchesStrict({ claims: [], evidence: [{ doc: [...g.docs][0], page: 1, quote: '' }] }, g)).toBe(false);
    expect(matchesStrict({ claims: ['line:' + [...g.claimLines][0]], evidence: [] }, g)).toBe(true);
  });

  it('a document-only overlap scores in loose recall, not in strict recall', () => {
    const g = gold.find((x) => x.docs.size && [...x.docs].some((d) => ix.docById.get(d)?.pages.some((p) => p.printed_content.trim().length > 5)))!;
    const doc = [...g.docs].find((d) => ix.docById.get(d)?.pages.some((p) => p.printed_content.trim().length > 5))!;
    const s = scorePayload(ix, payload([sug('d1', [], [quoteFrom(doc)])]));
    expect(s.recall).toBe(0);
    expect(s.ledgerFound).toEqual([]);
    expect(s.loose.found).toContain(g.id);
    expect(s.precision).toBe(0);
    expect(s.loose.precision).toBe(1);
  });

  it('lists every strict match with the shared lines and the quotes, for a person to adjudicate', () => {
    const g = gold.find((x) => x.claimLines.size)!;
    const line = [...g.claimLines][0];
    const ev = quoteFrom(ix.packet.documents[0].id);
    const s = scorePayload(ix, payload([sug('m1', [line], [ev])]));
    expect(s.strictMatches).toEqual([{ suggestionId: 'm1', ledgerId: g.id, title: redactNames(ix, g.title), lines: [line], quotes: [`${ev.doc} p${ev.page}: ${redactNames(ix, ev.quote)}`], rationale: 'test' }]);
    const md = scorecardMarkdown(s, null, {}, '2026-10-17');
    expect(md).toContain('## Reviewed matches');
    expect(md).toMatch(/\| m1 \| .*\| *\|$/m); // verdict cell left empty
  });

  it('scores rows rejected only for length separately, as what they would add', () => {
    const g = gold.find((x) => x.claimLines.size)!;
    const line = [...g.claimLines][0];
    const raw = { kind: 'other', otherKind: 'x', claims: [line], evidence: [quoteFrom(ix.packet.documents[0].id)], rationale: Array(32).fill('w').join(' '), authority: null, confidence: 0.5 };
    const s = scorePayload(ix, payload([], [{ raw, reason: 'rationale over 30 words' }, { raw: {}, reason: 'unknown kind x' }]));
    expect(s.recall).toBe(0);
    expect(s.formatRejected).toHaveLength(1);
    expect(s.formatRejected[0]).toMatchObject({ grounded: true, words: 32, ledger: [g.id] });
    expect(s.formatAdds).toEqual([g.id]);
    expect(scorecardMarkdown(s, null, {}, '2026-10-17')).toContain('## Rejected by format');
  });

  it('treats a replaced document and its successor as one source in the loose match', () => {
    const [old, succ] = [...supersession(ix)].find(([, to]) => !!to) as [string, string];
    const g = gold.find((x) => x.docs.has(succ) || x.docs.has(old))!;
    expect(g).toBeDefined();
    const other = g.docs.has(succ) ? old : succ;
    expect(matches({ claims: [], evidence: [{ doc: other, page: 1, quote: '' }] }, g)).toBe(true);
  });

  it('compares the previous prompt version with this one', () => {
    const v1 = scorePayload(ix, { ...payload([]), promptVersion: 'reader-v1' });
    const v2 = scorePayload(ix, { ...payload([]), promptVersion: 'reader-v2' });
    const md = scorecardMarkdown(v2, null, { costUsd: 1.5 }, '2026-10-17', { score: v1, meta: { costUsd: 1.45 } });
    expect(md).toContain('## reader-v1 vs reader-v2');
    expect(md).toContain('| Measure | reader-v1 | reader-v2 |');
    expect(md).toContain('| Approximate cost | $1.45 | $1.50 |');
  });

  it('never prints a person\'s name: rejected rows show no rationale, kept rationales are redacted', () => {
    const name = personNames(ix)[0];
    const g = gold.find((x) => x.claimLines.size)!;
    const ev = quoteFrom(ix.packet.documents[0].id);
    const raw = { kind: 'other', otherKind: 'x', claims: [[...g.claimLines][0]], evidence: [ev], rationale: `${name} ` + Array(31).fill('w').join(' '), authority: null, confidence: 0.5 };
    const kept = sug('k1', [], [quoteFrom(ix.packet.documents[1].id)]);
    kept.rationale = `Ask ${name} about this.`;
    const s = scorePayload(ix, payload([kept], [{ raw, reason: 'rationale over 30 words' }]));
    const md = scorecardMarkdown(s, null, {}, '2026-10-17');
    expect(md).toContain('## Rejected by format');
    expect(md).toContain(`${ev.doc} p${ev.page}`);
    expect(md).not.toMatch(new RegExp(`\\b${name}\\b`));
  });

  it('redacts names in ledger titles and quotes in the reviewed-matches table', () => {
    const names = personNames(ix);
    const g = gold.find((x) => x.claimLines.size && names.some((n) => x.title.includes(n)))!;
    expect(g).toBeDefined();
    const s = scorePayload(ix, payload([sug('t1', [[...g.claimLines][0]], [quoteFrom(ix.packet.documents[0].id)])]));
    const md = scorecardMarkdown(s, null, {}, '2026-10-17');
    for (const n of names) expect(md, n).not.toMatch(new RegExp(`(^|[^\\p{L}])${n}(?![\\p{L}])`, 'u'));
    expect(md).toContain('[name]');
  });

  it('scores what a reviewer would see: held-back suggestions leave the shown view, with their reasons', () => {
    const g = gold.find((x) => x.claimLines.size)!;
    const good = sug('g1', [[...g.claimLines][0]], [quoteFrom(ix.packet.documents[0].id)]);
    const bad = sug('b1', [[...g.claimLines][0]], [{ ...quoteFrom(ix.packet.documents[0].id), quote: 'nowhere on any page zzq words' }]);
    const v = shownView(ix, payload([good, bad]));
    expect(v.shown).toBe(1);
    expect(v.heldBack).toBe(1);
    expect(Object.keys(v.reasons).join(' ')).toMatch(/quote not found/);
    expect(v.score.ledgerFound).toEqual([g.id]);
    const md = scorecardMarkdown(scorePayload(ix, payload([good, bad])), null, {}, '2026-10-17', undefined, v);
    expect(md).toContain('## As produced vs as shown after verification');
    expect(md).toContain('| Held back by the verifier | 0 | 1 |');
  });

  it('states its limits', () => {
    const md = scorecardMarkdown(scorePayload(ix, payload([])), null, {}, '2026-10-17');
    expect(md).toContain('## Limits');
    expect(md).toMatch(/27 is a small set/);
    expect(md).toMatch(/hold-out/);
  });

  describe('with a second model\'s adjudication', () => {
    const lineOf = (id: string) => [...gold.find((g) => g.id === id)!.claimLines][0];
    const tierIds = gold.filter((g) => g.textTier && g.claimLines.size).map((g) => g.id);
    const plainIds = gold.filter((g) => !g.textTier && g.claimLines.size).map((g) => g.id);
    const [t1, t2] = tierIds; const [p1] = plainIds;
    const d0 = ix.packet.documents[0].id;
    const s = scorePayload(ix, payload([
      sug('a1', [lineOf(t1)], [quoteFrom(d0)]), sug('a2', [lineOf(t2)], [quoteFrom(d0)]),
      sug('a3', [lineOf(p1)], [quoteFrom(d0)]), sug('a4', [], [quoteFrom(d0)]),
    ]));
    const adj: Adjudication = {
      promptVersion: 'reader-v1', reviewer: 'Second model', file: 'docs/reviews/x.md',
      matches: [
        { suggestionId: 'a1', ledgerId: t1, verdict: 'SAME', reason: 'Same defect.' },
        { suggestionId: 'a2', ledgerId: t2, verdict: 'DIFFERENT', reason: 'Right line, wrong problem.' },
        { suggestionId: 'a3', ledgerId: p1, verdict: 'PARTIAL', reason: 'Right direction, incomplete.' },
      ],
      beyond: [{ suggestionId: 'a4', verdict: 'REAL-NEW', reason: 'A new defect.' }],
    };
    it('computes adjudicated recall, text tier and same-issue precision from the verdicts', () => {
      const f = adjudicatedFigures(s, adj, gold);
      expect(f.same).toEqual([t1]);
      expect(f.sameOrPartial.sort()).toEqual([t1, p1].sort());
      expect(f.tierSame).toEqual([t1]);
      expect(f.sameSuggestions).toBe(1);
      expect(f.differentTier).toEqual([t2]);
    });
    it('puts adjudicated recall in the headline, fills verdicts and adds Beyond the ledger', () => {
      const md = scorecardMarkdown(s, null, {}, '2026-10-17', undefined, undefined, adj);
      expect(md).toContain('## Headline: adjudicated recall (read by a second model)');
      expect(md).toContain('| Recall, same issue | 1 of 27 (4%) |');
      expect(md).toContain('| Recall, same or partial | 2 of 27 (7%) |');
      expect(md).toContain('| Precision, same issue | 1 of 4 (25%) |');
      expect(md).toMatch(/\| a1 \| .* \| SAME: Same defect\. \|/);
      expect(md).toMatch(/\| a2 \| .* \| DIFFERENT: Right line, wrong problem\. \|/);
      expect(md).toContain('## Automatic measure (strict)');
      expect(md).toContain(`were DIFFERENT issues`);
      expect(md).toContain('## Beyond the ledger');
      expect(md).toContain('| a4 | REAL-NEW | A new defect. |');
      expect(md.indexOf('## Headline: adjudicated')).toBeLessThan(md.indexOf('## Automatic measure (strict)'));
    });
  });

  it('the scorecard is plain markdown with the headline table and no em dashes', () => {
    const md = scorecardMarkdown(scorePayload(ix, payload([])), null, { calls: 3, costUsd: 0.01, tokens: '1 in' }, '2026-10-17');
    expect(md).toContain('| Recall, strict (shared claim line) | 0 of 27 (0%)');
    expect(md).toContain('| Recall, loose (shared line or document) | 0 of 27 (0%)');
    expect(md).toContain('No payload for the altered packet yet');
    expect(md).not.toContain('—');
  });
});

describe('AI harness: the tier no deterministic check reaches (agent bar)', () => {
  it('computes which ledger entries no finding reaches; none on the real packet, some on the altered one', async () => {
    const { alteredPacket } = await import('../fixtures/altered');
    expect(uncheckedLedger(ix)).toEqual([]);
    expect(uncheckedLedger(indexPacket(alteredPacket())).length).toBeGreaterThan(0); // the measurement can be non-zero
  });

  it('scores only the unreached entries', () => {
    const g = gold.find((x) => x.claimLines.size)!;
    const s = scorePayload(ix, payload([sug('b1', [[...g.claimLines][0]], [quoteFrom(ix.packet.documents[0].id)])]));
    expect(s.beyondChecks).toEqual({ total: 0, ids: [], found: [], recall: null });
    expect(beyondChecksTier(s, [g.id])).toEqual({ total: 1, ids: [g.id], found: [g.id], recall: 1 });
    const other = gold.find((x) => x.id !== g.id)!;
    expect(beyondChecksTier(s, [other.id])).toEqual({ total: 1, ids: [other.id], found: [], recall: 0 });
  });

  it('the handed-in scorecard is unchanged by the new tier', () => {
    expect(scorecardMarkdown(scorePayload(ix, payload([])), null, {}, '2026-10-17')).not.toMatch(/no deterministic check reaches/);
  });

  it('ledger entries reached only by hidden checks: computed from the real checks and the ledger', () => {
    const findings = runChecks(ix);
    const reachers = (id: string) => findings.filter((f) => f.ledgerIds.includes(id)).map((f) => f.checkId);
    const hidden = hiddenCheckIds(7);
    const only = hiddenOnlyLedger(ix, hidden);
    expect(only.length).toBeGreaterThan(0); // the seed hides the only checks of some entries, so this measures something
    for (const id of only) expect(reachers(id).every((c) => hidden.includes(c)), id).toBe(true);
    for (const g of gold.filter((x) => !only.includes(x.id))) expect(reachers(g.id).some((c) => !hidden.includes(c)) || !reachers(g.id).length, g.id).toBe(true);
    expect(hiddenOnlyLedger(ix, [])).toEqual([]);
  });

  it('tier figures: strict and same-issue recall on exactly the tier, with grounding', () => {
    const [a, b] = gold.filter((x) => x.claimLines.size);
    const s = scorePayload(ix, payload([sug('t1', [[...a.claimLines][0]], [quoteFrom(ix.packet.documents[0].id)]), sug('t2', [[...b.claimLines][0]], [quoteFrom(ix.packet.documents[0].id)])]));
    const adj: Adjudication = { promptVersion: 'reader-v1', reviewer: 'x', file: 'x', beyond: [], matches: [
      { suggestionId: 't1', ledgerId: a.id, verdict: 'SAME', reason: 'r' }, { suggestionId: 't2', ledgerId: b.id, verdict: 'DIFFERENT', reason: 'r' }] };
    expect(tierFigures(s, [a.id, b.id], adj, gold)).toEqual({ total: 2, strict: [a.id, b.id], same: [a.id], grounded: 2, suggestions: 2 });
    expect(tierFigures(s, [b.id], undefined, gold)).toEqual({ total: 1, strict: [b.id], same: null, grounded: 2, suggestions: 2 });
  });

  it('the agent scorecard prints, per mode, strict and same-issue recall on that mode\'s tier with grounding', () => {
    const g = gold.find((x) => x.claimLines.size)!;
    const reader = scorePayload(ix, payload([sug('r1', [[...g.claimLines][0]], [quoteFrom(ix.packet.documents[0].id)])]));
    const empty = (v: string) => scorePayload(ix, { ...payload([]), promptVersion: v, model: 'claude-opus-5-5' });
    const shown = shownView(ix, payload([]));
    const adj: Adjudication = { promptVersion: 'reader-v1', reviewer: 'x', file: 'x', beyond: [], matches: [{ suggestionId: 'r1', ledgerId: g.id, verdict: 'SAME', reason: 'r' }] };
    const hiddenTier = hiddenOnlyLedger(ix, hiddenCheckIds(7));
    const md = agentScorecardMarkdown({ label: 'reader-v2', score: reader, shown, meta: { costUsd: 1.5, seconds: 110, calls: 74 }, adjudication: adj }, [
      { label: 'agent-v1', score: empty('agent-v1'), shown, meta: { costUsd: 4.2, seconds: 600, turns: 22, toolCalls: 80, servedModels: ['claude-opus-5-5'] }, mode: 'default', tier: [] },
      { label: 'agent-v1-blind', score: empty('agent-v1-blind'), shown, meta: {}, mode: 'blind', tier: gold.map((x) => x.id) },
      { label: 'agent-v1-hide-7', score: empty('agent-v1-hide-7'), shown, meta: {}, mode: 'hide-checks', seed: 7, tier: hiddenTier },
    ], [], gold, '2026-10-24');
    expect(md).toContain('# AI agent vs reader scorecard');
    expect(md).toMatch(/## Mode default: ledger mistakes no deterministic check reaches/);
    expect(md).toMatch(/every ledger mistake is reached by a deterministic check/);
    expect(md).toContain('## Mode blind: all 27 ledger mistakes (no run_checks, no find_fact_copies)');
    expect(md).toContain('| Measure | reader-v2 | agent-v1-blind |');
    expect(md).toContain(`| Recall, strict | 1 of 27 (4%) | 0 of 27 (0%) |`);
    expect(md).toContain(`| Recall, same issue (adjudicated) | 1 of 27 (4%) | not adjudicated |`);
    expect(md).toMatch(/reader-v2 figures are those of docs\/handin\/ai-scorecard\.md/);
    expect(md).toContain(`## Mode hide-checks, seed 7: ledger entries reached only by hidden checks (${hiddenTier.length})`);
    expect(md).toContain(`Entries: ${hiddenTier.join(', ')}.`);
    expect(md).toMatch(/\| Grounding rate \| 1 of 1 \(100%\) \| none to score \|/);
    expect(md).toContain('| Approximate cost | $1.50 | $4.20 | not recorded | not recorded |');
    expect(md).toContain('| Served model | not recorded | claude-opus-5-5 | not recorded | not recorded |');
    expect(md).not.toContain('—');
  });
});
