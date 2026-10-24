// AI harness core (lane R): scores a reader payload against the ledger of known mistakes before the reader is trusted.
// Gold for a ledger entry = its claims plus the evidence documents of the findings our deterministic checks produce
// for it. Pure: takes a packet index and a payload, returns numbers and lists.
import type { AiPayload, AiSuggestion } from '../../src/domain/ai/contract';
import type { PacketIndex } from '../../src/domain/packet/load';
import { CHECKS, LEDGER, runChecks } from '../../src/domain/checks/index';
import { isShown, supersession, verifySuggestions } from '../../src/domain/ai/verify';
import { isGrounded, redactNames } from './reader-core';
export { isGrounded };

/** Families whose checks depend on wording in free text: the tier where a reader should add most. */
export const TEXT_TIER_FAMILIES = ['Judgment needed', 'Client answer vs line', 'Residency and sourcing', 'Limit or cap'];
export const TEXT_TIER_EXTRA_IDS = ['GT-D05'];

export const normalizeWs = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The document a packet ref points at, or null (client answers, messages, agency records, etc.). */
export function refDoc(ix: PacketIndex, ref: string): string | null {
  if (ref.startsWith('ev-')) return ix.valueById.get(ref)?.document_id ?? null;
  if (ref.startsWith('doc:')) return ref.slice(4).split('#')[0] || null;
  return null;
}

/** lines and claimLines are the same set: the line keys among the entry's own claims (strict). docs feed the loose match. */
export interface Gold { id: string; title: string; lines: Set<string>; claimLines: Set<string>; docs: Set<string>; textTier: boolean }

export function goldSet(ix: PacketIndex): Gold[] {
  const findings = runChecks(ix);
  const familyOf = new Map(CHECKS.map((c) => [c.id, c.family]));
  return LEDGER.map((e) => {
    const lines = new Set<string>(); const docs = new Set<string>();
    for (const c of e.claims) {
      if (c.startsWith('line:')) lines.add(c.slice(5));
      else { const d = refDoc(ix, c); if (d) docs.add(d); }
    }
    for (const f of findings) {
      if (!f.ledgerIds.includes(e.id)) continue;
      for (const r of f.evidence) { const d = refDoc(ix, r); if (d) docs.add(d); }
    }
    // A replaced document and its successor are one source: either one stands for both.
    for (const [from, to] of supersession(ix)) {
      if (!to) continue;
      if (docs.has(from)) docs.add(to);
      if (docs.has(to)) docs.add(from);
    }
    const textTier = TEXT_TIER_EXTRA_IDS.includes(e.id) || e.checkIds.some((c) => TEXT_TIER_FAMILIES.includes(familyOf.get(c) ?? ''));
    return { id: e.id, title: e.title, lines, claimLines: lines, docs, textTier };
  });
}

const key = (c: string) => c.replace(/^line:/, '');

/** Strict (primary): the suggestion sits on a line the ledger entry itself claims. */
export function matchesStrict(s: Pick<AiSuggestion, 'claims' | 'evidence'>, g: Gold): boolean {
  return s.claims.some((c) => g.claimLines.has(key(c)));
}

/** Loose (secondary): a shared claim line, or any shared evidence document. */
export function matches(s: Pick<AiSuggestion, 'claims' | 'evidence'>, g: Gold): boolean {
  return s.claims.some((c) => g.lines.has(c.replace(/^line:/, ''))) || s.evidence.some((e) => g.docs.has(e.doc));
}

export interface StrictMatch { suggestionId: string; ledgerId: string; title: string; lines: string[]; quotes: string[]; rationale: string }
/** No rationale text: rejected rows were never name-checked, so only structure is kept for printing. */
export interface FormatRejected { reason: string; refs: string[]; kind: string; claims: string[]; words: number; grounded: boolean; ledger: string[] }

export interface Score {
  model: string; promptVersion: string; runAt: string; packetSha: string;
  /** Strict (headline): shared claim line key. */
  ledgerTotal: number; ledgerFound: string[]; recall: number;
  textTierTotal: number; textTierFound: string[]; textTierRecall: number;
  matchedGrounded: number; precision: number;
  /** Ledger entries with no line among their claims: a strict match is impossible for them. */
  strictUnreachable: string[];
  /** Loose (secondary): shared claim line or shared evidence document. */
  loose: { found: string[]; recall: number; textTierFound: string[]; textTierRecall: number; matchedGrounded: number; precision: number };
  strictMatches: StrictMatch[];
  suggestions: number; grounded: number; groundingRate: number;
  unmatched: { id: string; kind: string; claims: string[]; docs: string[]; rationale: string; looseOnly: string[] }[];
  ungrounded: string[];
  claimsNotInPacket: number;
  rejected: number; rejectedReasons: Record<string, number>;
  /** Rows rejected only because the rationale ran over the word limit, scored strictly as what they would add. */
  formatRejected: FormatRejected[]; formatAdds: string[];
  perKind: Record<string, number>;
  /** The agent's bar: ledger mistakes no deterministic check reaches, scored strictly. Recall null when there are none. */
  beyondChecks: BeyondChecks;
}

export interface BeyondChecks { total: number; ids: string[]; found: string[]; recall: number | null }

/** Ledger entries that no finding of runChecks reaches (by the finding's ledger ids, aliases included). A reader that
 *  only echoes our checks scores nothing here. */
export function uncheckedLedger(ix: PacketIndex): string[] {
  const reached = new Set(runChecks(ix).flatMap((f) => f.ledgerIds));
  return LEDGER.filter((e) => !reached.has(e.id) && !(e.aliases ?? []).some((a) => reached.has(a))).map((e) => e.id);
}

/** Strict recall over the given unreached entries only. */
export function beyondChecksTier(s: Pick<Score, 'ledgerFound'>, unchecked: string[]): BeyondChecks {
  const found = unchecked.filter((id) => s.ledgerFound.includes(id));
  return { total: unchecked.length, ids: [...unchecked], found, recall: unchecked.length ? found.length / unchecked.length : null };
}

const ratio = (a: number, b: number) => (b ? a / b : 0);
const LENGTH_REASON = /^rationale over \d+ words$/;

/** Recall counts grounded suggestions only: an ungrounded suggestion never reaches a screen. */
export function scorePayload(ix: PacketIndex, payload: AiPayload): Score {
  const gold = goldSet(ix);
  const tier = gold.filter((g) => g.textTier);
  const grounded = payload.suggestions.filter((s) => isGrounded(ix, s));
  const side = (m: (s: AiSuggestion, g: Gold) => boolean) => {
    const found = gold.filter((g) => grounded.some((s) => m(s, g)));
    const hit = grounded.filter((s) => gold.some((g) => m(s, g)));
    return {
      found: found.map((g) => g.id), recall: ratio(found.length, gold.length),
      textTierFound: found.filter((g) => g.textTier).map((g) => g.id), textTierRecall: ratio(found.filter((g) => g.textTier).length, tier.length),
      matchedGrounded: hit.length, precision: ratio(hit.length, grounded.length), hit,
    };
  };
  const strict = side(matchesStrict);
  const loose = side(matches);
  const strictMatches: StrictMatch[] = [];
  for (const s of grounded) for (const g of gold) {
    if (!matchesStrict(s, g)) continue;
    strictMatches.push({
      suggestionId: s.id, ledgerId: g.id, title: redactNames(ix, g.title), lines: s.claims.map(key).filter((c) => g.claimLines.has(c)),
      quotes: s.evidence.map((e) => `${e.doc} p${e.page}: ${redactNames(ix, e.quote)}`), rationale: redactNames(ix, s.rationale),
    });
  }
  const perKind: Record<string, number> = {};
  for (const s of payload.suggestions) perKind[s.kind] = (perKind[s.kind] ?? 0) + 1;
  const rejectedReasons: Record<string, number> = {};
  const formatRejected: FormatRejected[] = [];
  for (const r of payload.rejected) {
    const k = r.reason.replace(/:.*$/, '').replace(/\b[A-Z]\d+\b/g, '<doc>').replace(/\bp\d+\b/g, 'p<n>');
    rejectedReasons[k] = (rejectedReasons[k] ?? 0) + 1;
    // Rejected rows are stored as structure only (no quotes, no rationale); older files may still carry both.
    const raw = r.raw as (Partial<AiSuggestion> & { grounded?: boolean; rationaleWords?: number }) | null;
    if (!LENGTH_REASON.test(r.reason) || !raw || !Array.isArray(raw.evidence) || !Array.isArray(raw.claims)) continue;
    const row = { claims: raw.claims.map(key).filter((c) => !!ix.line(ix.latest.version, c)), evidence: raw.evidence };
    const grounded = typeof raw.grounded === 'boolean' ? raw.grounded : isGrounded(ix, row);
    const wordCount = typeof raw.rationaleWords === 'number' ? raw.rationaleWords : String(raw.rationale ?? '').trim().split(/\s+/).filter(Boolean).length;
    formatRejected.push({
      reason: r.reason, refs: [...new Set(raw.evidence.map((e) => `${e.doc} p${e.page}`))],
      kind: redactNames(ix, raw.kind === 'other' ? `other: ${raw.otherKind}` : String(raw.kind)),
      claims: row.claims, words: wordCount,
      grounded, ledger: grounded ? gold.filter((g) => matchesStrict(row, g)).map((g) => g.id) : [],
    });
  }
  const formatAdds = gold.map((g) => g.id).filter((id) => !strict.found.includes(id) && formatRejected.some((f) => f.ledger.includes(id)));
  return {
    model: payload.model, promptVersion: payload.promptVersion, runAt: payload.runAt, packetSha: payload.packetSha,
    ledgerTotal: gold.length, ledgerFound: strict.found, recall: strict.recall,
    textTierTotal: tier.length, textTierFound: strict.textTierFound, textTierRecall: strict.textTierRecall,
    matchedGrounded: strict.matchedGrounded, precision: strict.precision,
    strictUnreachable: gold.filter((g) => !g.claimLines.size).map((g) => g.id),
    loose: { found: loose.found, recall: loose.recall, textTierFound: loose.textTierFound, textTierRecall: loose.textTierRecall, matchedGrounded: loose.matchedGrounded, precision: loose.precision },
    strictMatches,
    suggestions: payload.suggestions.length, grounded: grounded.length, groundingRate: ratio(grounded.length, payload.suggestions.length),
    unmatched: grounded.filter((s) => !strict.hit.includes(s)).map((s) => ({
      id: s.id, kind: redactNames(ix, s.kind === 'other' ? `other: ${s.otherKind}` : s.kind), claims: s.claims,
      docs: [...new Set(s.evidence.map((e) => e.doc))], rationale: redactNames(ix, s.rationale), looseOnly: gold.filter((g) => matches(s, g)).map((g) => g.id),
    })),
    ungrounded: payload.suggestions.filter((s) => !grounded.includes(s)).map((s) => s.id),
    claimsNotInPacket: payload.suggestions.reduce((n, s) => n + s.claims.filter((c) => !ix.line(ix.latest.version, key(c))).length, 0),
    rejected: payload.rejected.length, rejectedReasons, formatRejected, formatAdds, perKind,
    beyondChecks: beyondChecksTier({ ledgerFound: strict.found }, uncheckedLedger(ix)),
  };
}

export interface ShownView { score: Score; shown: number; heldBack: number; reasons: Record<string, number> }

/** What a reviewer would actually see: the backend's verifier (lane U) applied first, then the same scoring. */
export function shownView(ix: PacketIndex, payload: AiPayload): ShownView {
  const verified = verifySuggestions(ix, payload);
  const shown: AiSuggestion[] = verified.filter(isShown).map(({ grounded: _g, problems: _p, ...s }) => s);
  const reasons: Record<string, number> = {};
  for (const v of verified.filter((x) => !isShown(x))) {
    const keys = new Set(v.problems.map((p) => p.replace(/^Quote \d+: /, '').replace(/\([^)]*\)/g, '').replace(/\b[A-Z]\d+\b/g, '<doc>').replace(/\bpage \d+\b/g, 'page <n>').replace(/\.$/, '').trim()));
    if (!keys.size) keys.add('not grounded');
    for (const k of keys) reasons[k] = (reasons[k] ?? 0) + 1;
  }
  return { score: scorePayload(ix, { ...payload, suggestions: shown }), shown: shown.length, heldBack: verified.length - shown.length, reasons };
}

/** A second model's reading of each strict match (and of the unmatched suggestions). Verdicts come from a person or a
 *  reviewing model, never from the harness. */
export interface Adjudication {
  promptVersion: string; reviewer: string; file: string;
  matches: { suggestionId: string; ledgerId: string; verdict: 'SAME' | 'PARTIAL' | 'DIFFERENT'; reason: string }[];
  beyond: { suggestionId: string; verdict: 'REAL-NEW' | 'REAL-DUPLICATE' | 'NOT-REAL' | 'UNSURE'; reason: string }[];
}
export interface AdjudicatedFigures { same: string[]; sameOrPartial: string[]; tierSame: string[]; tierSameOrPartial: string[]; differentTier: string[]; sameSuggestions: number }

export function adjudicatedFigures(real: Score, adj: Adjudication, gold: Pick<Gold, 'id' | 'textTier'>[]): AdjudicatedFigures {
  const ids = (v: string[]) => gold.map((g) => g.id).filter((id) => adj.matches.some((m) => m.ledgerId === id && v.includes(m.verdict)));
  const tier = new Set(gold.filter((g) => g.textTier).map((g) => g.id));
  const same = ids(['SAME']); const sameOrPartial = ids(['SAME', 'PARTIAL']);
  const strictTier = real.textTierFound;
  return {
    same, sameOrPartial, tierSame: same.filter((id) => tier.has(id)), tierSameOrPartial: sameOrPartial.filter((id) => tier.has(id)),
    differentTier: strictTier.filter((id) => !sameOrPartial.includes(id) && adj.matches.some((m) => m.ledgerId === id && m.verdict === 'DIFFERENT')),
    sameSuggestions: new Set(adj.matches.filter((m) => m.verdict === 'SAME').map((m) => m.suggestionId)).size,
  };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const cell = (s: string) => s.replace(/\|/g, '/').replace(/—/g, '-');

export interface RunMeta { calls?: number; costUsd?: number | null; tokens?: string }

/** The scorecard in plain words (docs/handin/ai-scorecard.md). No em dashes. */
export function scorecardMarkdown(real: Score, altered: Score | null, meta: RunMeta = {}, today = new Date().toISOString().slice(0, 10), previous?: { score: Score; meta: RunMeta }, shown?: ShownView, adjudication?: Adjudication, gold?: Pick<Gold, 'id' | 'textTier'>[]): string {
  const adj = adjudication && adjudication.promptVersion === real.promptVersion ? adjudication : undefined;
  const L: string[] = [];
  const frac = (n: number, d: number, r: number) => `${n} of ${d} (${pct(r)})`;
  L.push('# AI reader scorecard', '');
  L.push(`Scored ${today}. Model ${real.model}, prompt ${real.promptVersion}, run at ${real.runAt}. Packet SHA-256 starts ${real.packetSha.slice(0, 12)}.`);
  if (meta.calls !== undefined || meta.costUsd !== undefined) {
    L.push(`Calls: ${meta.calls ?? 'not recorded'}. Tokens: ${meta.tokens ?? 'not recorded'}. Approximate cost: ${meta.costUsd == null ? 'not recorded' : `$${meta.costUsd.toFixed(2)}`}.`);
  }
  L.push('', 'The reader is scored against the ledger of known mistakes. Only grounded suggestions count (every quote appears word for',
    'word on the page it names); ungrounded ones never reach a screen.', '',
    '- **Strict (the headline):** a suggestion finds a mistake only when it sits on a return line that the mistake itself claims.',
    '- **Loose (secondary):** a shared claim line, or any shared evidence document. Loose overstates: one document can hold several unrelated mistakes.',
    '- A strict match is still only a candidate: the "Reviewed matches" table below is for a person to say whether it is the same issue.', '');
  if (previous) {
    const a = previous.score; const b = real;
    const money = (m: RunMeta) => (m.costUsd == null ? 'not recorded' : `$${m.costUsd.toFixed(2)}`);
    L.push(`## ${a.promptVersion} vs ${b.promptVersion}`, '', `| Measure | ${a.promptVersion} | ${b.promptVersion} |`, '|---|---|---|');
    L.push(`| Recall, strict | ${frac(a.ledgerFound.length, a.ledgerTotal, a.recall)} | ${frac(b.ledgerFound.length, b.ledgerTotal, b.recall)} |`);
    L.push(`| Recall, strict, text tier | ${frac(a.textTierFound.length, a.textTierTotal, a.textTierRecall)} | ${frac(b.textTierFound.length, b.textTierTotal, b.textTierRecall)} |`);
    L.push(`| Precision, strict | ${frac(a.matchedGrounded, a.grounded, a.precision)} | ${frac(b.matchedGrounded, b.grounded, b.precision)} |`);
    L.push(`| Recall, loose | ${frac(a.loose.found.length, a.ledgerTotal, a.loose.recall)} | ${frac(b.loose.found.length, b.ledgerTotal, b.loose.recall)} |`);
    L.push(`| Grounding rate | ${frac(a.grounded, a.suggestions, a.groundingRate)} | ${frac(b.grounded, b.suggestions, b.groundingRate)} |`);
    L.push(`| Rejected | ${a.rejected} | ${b.rejected} |`);
    L.push(`| Approximate cost | ${money(previous.meta)} | ${money(meta)} |`, '');
  }
  let fig: AdjudicatedFigures | undefined;
  if (adj) {
    const total = real.ledgerTotal;
    const goldList = gold ?? real.ledgerFound.map((id) => ({ id, textTier: real.textTierFound.includes(id) }));
    fig = adjudicatedFigures(real, adj, goldList);
    L.push('## Headline: adjudicated recall (read by a second model)', '',
      `${adj.reviewer} read every strict match against the ledger and the packet and judged whether it names the same mistake for the`,
      `same reason (SAME), the right line and direction with incomplete reasoning (PARTIAL), or the right line but a different`,
      `problem (DIFFERENT). Source: \`${adj.file}\`.`, '');
    L.push('| Measure | Result |', '|---|---|');
    L.push(`| Recall, same issue | ${frac(fig.same.length, total, ratio(fig.same.length, total))} |`);
    L.push(`| Recall, same or partial | ${frac(fig.sameOrPartial.length, total, ratio(fig.sameOrPartial.length, total))} |`);
    L.push(`| Recall, text tier (same issue) | ${frac(fig.tierSame.length, real.textTierTotal, ratio(fig.tierSame.length, real.textTierTotal))} |`);
    L.push(`| Precision, same issue | ${frac(fig.sameSuggestions, real.grounded, ratio(fig.sameSuggestions, real.grounded))} |`);
    const partialOnly = fig.sameOrPartial.filter((id) => !fig!.same.includes(id));
    const different = real.ledgerFound.filter((id) => !fig!.sameOrPartial.includes(id));
    L.push('', `Same issue: ${fig.same.join(', ') || 'none'}. Partial only: ${partialOnly.join(', ') || 'none'}. Strict-matched but a different issue: ${different.join(', ') || 'none'}.`, '');
  }
  L.push(adj ? '## Automatic measure (strict)' : '## Headline (strict)', '', '| Measure | Result | What it means |', '|---|---|---|');
  L.push(`| Recall, strict (shared claim line) | ${frac(real.ledgerFound.length, real.ledgerTotal, real.recall)} | Known mistakes the reader put a grounded suggestion on |`);
  L.push(`| Recall, strict, text tier | ${frac(real.textTierFound.length, real.textTierTotal, real.textTierRecall)} | Mistakes that depend on wording in free text, where code checks are weakest |`);
  L.push(`| Precision, strict | ${frac(real.matchedGrounded, real.grounded, real.precision)} | Grounded suggestions on a line a known mistake claims; the rest may still be real issues |`);
  L.push(`| Grounding rate | ${frac(real.grounded, real.suggestions, real.groundingRate)} | Suggestions whose quotes were all found on the page |`);
  L.push(`| Rejected by the reader | ${real.rejected} | Rows that failed the reader's own checks before the payload was written |`);
  L.push(`| Claims on lines not in the return | ${real.claimsNotInPacket} | Should be zero; unknown line keys are dropped at read time |`);
  L.push('', `Strict found: ${real.ledgerFound.join(', ') || 'none'}. Text tier: ${real.textTierFound.join(', ') || 'none'}.`);
  if (fig && fig.differentTier.length) {
    L.push('', `Note: the strict text-tier hits ${fig.differentTier.join(', ')} were DIFFERENT issues on adjudication, so the ${pct(real.textTierRecall)} strict text-tier recall must not be quoted.`);
  }
  if (real.strictUnreachable.length) L.push('', `Cannot match strictly (their ledger claims name a document, not a line): ${real.strictUnreachable.join(', ')}.`);
  if (shown) {
    const a = real; const b = shown.score;
    L.push('', '## As produced vs as shown after verification', '',
      'The backend verifier (the same code the app runs) holds back a suggestion whose quote is missing or too short to ground it alone,',
      'whose only evidence is a replaced document, whose authority is off the list, or whose text is too long or SSN-shaped.', '');
    L.push(`| Measure | As produced (${a.suggestions}) | As shown (${shown.shown}) |`, '|---|---|---|');
    L.push(`| Recall, strict | ${frac(a.ledgerFound.length, a.ledgerTotal, a.recall)} | ${frac(b.ledgerFound.length, b.ledgerTotal, b.recall)} |`);
    L.push(`| Recall, strict, text tier | ${frac(a.textTierFound.length, a.textTierTotal, a.textTierRecall)} | ${frac(b.textTierFound.length, b.textTierTotal, b.textTierRecall)} |`);
    L.push(`| Precision, strict | ${frac(a.matchedGrounded, a.grounded, a.precision)} | ${frac(b.matchedGrounded, b.grounded, b.precision)} |`);
    L.push(`| Grounding rate | ${frac(a.grounded, a.suggestions, a.groundingRate)} | ${frac(b.grounded, b.suggestions, b.groundingRate)} |`);
    L.push(`| Held back by the verifier | 0 | ${shown.heldBack} |`);
    const lost = a.ledgerFound.filter((id) => !b.ledgerFound.includes(id));
    L.push('', `Lost by verification: ${lost.join(', ') || 'none'}.`);
    if (Object.keys(shown.reasons).length) {
      L.push('', '| Held back because | Suggestions |', '|---|---|');
      for (const [k, n] of Object.entries(shown.reasons)) L.push(`| ${cell(k)} | ${n} |`);
    }
  }
  L.push('', '## Loose (secondary)', '', '| Measure | Result |', '|---|---|');
  L.push(`| Recall, loose (shared line or document) | ${frac(real.loose.found.length, real.ledgerTotal, real.loose.recall)} |`);
  L.push(`| Recall, loose, text tier | ${frac(real.loose.textTierFound.length, real.textTierTotal, real.loose.textTierRecall)} |`);
  L.push(`| Precision, loose | ${frac(real.loose.matchedGrounded, real.grounded, real.loose.precision)} |`);
  const looseOnly = real.loose.found.filter((id) => !real.ledgerFound.includes(id));
  L.push('', `Found only by the loose rule: ${looseOnly.join(', ') || 'none'}.`);
  L.push('', '## Reviewed matches', '', 'One row per strict match. Verdict is for a person: same issue, or different issue.',
    'People\'s first names are shown as [name], in ledger titles and in quotes.', '');
  if (!real.strictMatches.length) L.push('None.');
  else {
    L.push('| Suggestion | Ledger | Line | Quote | Verdict |', '|---|---|---|---|---|');
    for (const m of real.strictMatches) {
      const v = adj?.matches.find((x) => x.suggestionId === m.suggestionId && x.ledgerId === m.ledgerId);
      L.push(`| ${m.suggestionId} | ${m.ledgerId}: ${cell(m.title)} | ${m.lines.join(', ')} | ${m.quotes.map((q) => cell(q)).join('<br>')} | ${v ? `${v.verdict}: ${cell(v.reason)}` : ''} |`);
    }
  }
  L.push('', '## Suggestions by kind', '', '| Kind | Count |', '|---|---|');
  for (const [k, n] of Object.entries(real.perKind).sort()) L.push(`| ${k} | ${n} |`);
  if (!Object.keys(real.perKind).length) L.push('| none | 0 |');
  if (Object.keys(real.rejectedReasons).length) {
    L.push('', '## Why rows were rejected', '', '| Reason | Count |', '|---|---|');
    for (const [k, n] of Object.entries(real.rejectedReasons)) L.push(`| ${cell(k)} | ${n} |`);
  }
  if (real.formatRejected.length) {
    const w = real.formatRejected.map((f) => f.words);
    const g = real.formatRejected.filter((f) => f.grounded).length;
    L.push('', `## Rejected by format (${Math.min(...w)}-${Math.max(...w)} words), ${g === real.formatRejected.length ? 'all grounded' : `${g} of ${real.formatRejected.length} grounded`}`, '',
      'These rows failed only the 30-word limit on the rationale. They are not in the payload and not counted above.',
      'Scored strictly, they would add these mistakes to recall: ' + (real.formatAdds.join(', ') || 'none') + '.', '');
    L.push('Rationale text is not printed: these rows were rejected before the name check.', '');
    L.push('| Quotes from | Reason | Kind | Lines | Words | Grounded | Strict ledger match |', '|---|---|---|---|---|---|---|');
    for (const f of real.formatRejected) {
      L.push(`| ${f.refs.join(', ')} | ${cell(f.reason)} | ${cell(f.kind)} | ${f.claims.join(', ') || 'none'} | ${f.words} | ${f.grounded ? 'yes' : 'no'} | ${f.ledger.join(', ') || 'none'} |`);
    }
  }
  L.push('', '## Grounded suggestions on no ledger line (for a person to read)', '',
    'These are not counted as wrong. The ledger may have missed them; a reviewer decides. "Loose" names any entry they share a document with.', '');
  if (!real.unmatched.length) L.push('None.');
  else {
    L.push('| Id | Kind | Lines | Documents | Loose | Rationale |', '|---|---|---|---|---|---|');
    for (const u of real.unmatched) L.push(`| ${u.id} | ${cell(u.kind)} | ${u.claims.join(', ') || 'none'} | ${u.docs.join(', ')} | ${u.looseOnly.join(', ') || 'none'} | ${cell(u.rationale)} |`);
  }
  if (adj && adj.beyond.length) {
    const count = (v: string) => adj.beyond.filter((b) => b.verdict === v).length;
    L.push('', '## Beyond the ledger', '',
      `${adj.reviewer} checked each of the ${real.unmatched.length} grounded suggestions on no ledger line against the packet: ${count('REAL-NEW')} real new mistake,`,
      `${count('REAL-DUPLICATE')} duplicates of known mistakes, ${count('NOT-REAL')} not real${count('UNSURE') ? `, ${count('UNSURE')} unsure` : ''}.`, '');
    L.push('| Suggestion | Verdict | Reason |', '|---|---|---|');
    for (const b of adj.beyond) L.push(`| ${b.suggestionId} | ${b.verdict} | ${cell(b.reason)} |`);
  }
  if (real.ungrounded.length) L.push('', `Ungrounded (quarantined) suggestions: ${real.ungrounded.join(', ')}.`);
  L.push('', '## Limits', '',
    '- 27 is a small set: one household, one season. A single suggestion moves recall by about 4 points.',
    '- reader-v2 was revised after seeing reader-v1 scored on the same 27 mistakes. The changes were to format (a shorter',
    '  rationale) and to document supersession (telling the reader which document replaced which), not to answers: no ledger',
    '  text, id or hint is in any prompt (checked by searching every request body). The figures are still not a clean test.',
    '- The altered packet (people renamed, one form removed, a staff member added) is the hold-out check.',
    '- The ledger is what we found, not everything that is wrong; unmatched suggestions may be real issues.');
  L.push('', '## Altered packet', '');
  if (!altered) L.push('No payload for the altered packet yet (run `npx tsx ai/reader.ts --packet altered`).');
  else {
    L.push('The altered packet renames every person, removes one form from every return version and adds a staff member.',
      'The same mistakes are still in it, so recall should hold; suggestions that cite lines missing from it are false alarms.', '');
    L.push('| Measure | Result |', '|---|---|');
    L.push(`| Recall, strict | ${frac(altered.ledgerFound.length, altered.ledgerTotal, altered.recall)} |`);
    L.push(`| Recall, strict, text tier | ${frac(altered.textTierFound.length, altered.textTierTotal, altered.textTierRecall)} |`);
    L.push(`| Precision, strict | ${frac(altered.matchedGrounded, altered.grounded, altered.precision)} |`);
    L.push(`| Recall, loose | ${frac(altered.loose.found.length, altered.ledgerTotal, altered.loose.recall)} |`);
    L.push(`| Grounding rate | ${frac(altered.grounded, altered.suggestions, altered.groundingRate)} |`);
    L.push(`| Claims on lines not in this packet (false alarms) | ${altered.claimsNotInPacket} |`);
    L.push(`| Rejected by format | ${altered.formatRejected.length} (would add ${altered.formatAdds.join(', ') || 'none'}) |`);
    L.push('', `Strict found: ${altered.ledgerFound.join(', ') || 'none'}.`);
  }
  return L.join('\n') + '\n';
}

export function summaryLine(s: Score): string {
  return `strict recall ${s.ledgerFound.length}/${s.ledgerTotal} (${pct(s.recall)}); strict text tier ${s.textTierFound.length}/${s.textTierTotal} (${pct(s.textTierRecall)}); `
    + `strict precision ${s.matchedGrounded}/${s.grounded} (${pct(s.precision)}); loose recall ${s.loose.found.length}/${s.ledgerTotal}; `
    + `grounding ${s.grounded}/${s.suggestions} (${pct(s.groundingRate)}); rejected ${s.rejected} (format ${s.formatRejected.length}, would add ${s.formatAdds.length})`;
}

/** The measured baselines for the CI gate, from the committed reader-v2 eval payload, 17 Oct 2026: strict recall as
 *  shown (after the backend verifier) 16 of 27 (17 before the verifier); 1 of 40 suggestions held back by the verifier. */
export const MIN_STRICT_RECALL = 16;
export const MAX_HELD_BACK = 1;
const SSN_DASHED = /\b\d{3}-\d{2}-\d{4}\b/;

export interface GateResult { failures: string[]; strictFound: number; ledgerTotal: number; rawGrounding: number; produced: number; shown: number; heldBack: number }

/** The CI eval gate over the committed eval payload, scored through the backend verifier. Fails on: any produced
 *  suggestion whose quotes are not on its page (raw grounding below 100%), more suggestions held back by the verifier
 *  than the baseline, strict recall as shown below the baseline, a prompt version that differs from the code's, or any
 *  SSN-shaped string (dashed, or any of this packet's SSNs without dashes) anywhere in the payload. */
export function evalGate(ix: PacketIndex, payload: AiPayload, codePromptVersion: string, o: { minStrict?: number; maxHeldBack?: number } = {}): GateResult {
  const minStrict = o.minStrict ?? MIN_STRICT_RECALL;
  const maxHeldBack = o.maxHeldBack ?? MAX_HELD_BACK;
  const failures: string[] = [];
  const raw = scorePayload(ix, payload);
  const shown = shownView(ix, payload);
  if (raw.groundingRate < 1) failures.push(`raw grounding ${raw.grounded}/${raw.suggestions} is below 100% (ungrounded: ${raw.ungrounded.join(', ')})`);
  if (shown.heldBack > maxHeldBack) failures.push(`${shown.heldBack} suggestion(s) held back by the verifier, above the baseline ${maxHeldBack}`);
  const found = shown.score.ledgerFound.length;
  if (found < minStrict) failures.push(`strict recall as shown ${found}/${shown.score.ledgerTotal} is below the baseline ${minStrict}`);
  if (payload.promptVersion !== codePromptVersion) {
    failures.push(`prompt changed: re-run the eval and commit the new eval payload (payload ${payload.promptVersion}, code ${codePromptVersion})`);
  }
  const text = JSON.stringify(payload);
  const realSsns = [...new Set(JSON.stringify(ix.packet).match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? [])].map((s) => s.replace(/-/g, ''));
  if (SSN_DASHED.test(text) || realSsns.some((s) => text.includes(s))) failures.push('the payload holds an SSN-shaped string');
  return { failures, strictFound: found, ledgerTotal: shown.score.ledgerTotal, rawGrounding: raw.groundingRate, produced: raw.suggestions, shown: shown.shown, heldBack: shown.heldBack };
}

export interface AgentRunFigures { costUsd?: number | null; seconds?: number; calls?: number; turns?: number; toolCalls?: number; servedModels?: string[] }
export interface ScoredRun { label: string; score: Score; shown: ShownView; meta: AgentRunFigures; adjudication?: Adjudication }
/** An agent run with its measurement mode and the ledger ids of the tier that mode is scored on (computed by the
 *  harness from the real checks and the ledger: never from the agent's output). */
export interface ModeRun extends ScoredRun { mode: 'default' | 'blind' | 'hide-checks'; seed?: number; tier: string[] }

/** Ledger entries that some finding reaches and that only hidden checks reach: the hide-checks mode's tier. */
export function hiddenOnlyLedger(ix: PacketIndex, hidden: string[]): string[] {
  const h = new Set(hidden);
  const findings = runChecks(ix);
  return LEDGER.filter((e) => {
    const ids = [e.id, ...(e.aliases ?? [])];
    const by = findings.filter((f) => f.ledgerIds.some((x) => ids.includes(x)));
    return by.length > 0 && by.every((f) => h.has(f.checkId));
  }).map((e) => e.id);
}

export interface TierFigures { total: number; strict: string[]; same: string[] | null; grounded: number; suggestions: number }
/** Strict and same-issue (adjudicated; null without verdicts) recall on exactly the given ledger ids, with grounding. */
export function tierFigures(s: Score, ids: string[], adj: Adjudication | undefined, gold: Pick<Gold, 'id' | 'textTier'>[]): TierFigures {
  const same = adj ? adjudicatedFigures(s, adj, gold).same : null;
  return {
    total: ids.length, strict: ids.filter((id) => s.ledgerFound.includes(id)), same: same ? ids.filter((id) => same.includes(id)) : null,
    grounded: s.grounded, suggestions: s.suggestions,
  };
}

/** The agent-vs-reader scorecard (ai/eval/agent-scorecard.md), kept apart from the handed-in docs/handin/ai-scorecard.md.
 *  One section per agent run, each scored on its mode's tier, so recall cannot be bought by echoing our checks. */
export function agentScorecardMarkdown(reader: ScoredRun, agents: ModeRun[], altered: ScoredRun[], gold: Pick<Gold, 'id' | 'textTier'>[], today = new Date().toISOString().slice(0, 10)): string {
  const L: string[] = [];
  const frac = (n: number, d: number) => (d ? `${n} of ${d} (${pct(n / d)})` : 'none to score');
  const head = (rs: ScoredRun[]) => [`| Measure | ${rs.map((r) => r.label).join(' | ')} |`, `|---|${rs.map(() => '---|').join('')}`];
  const row = (name: string, rs: ScoredRun[], f: (r: ScoredRun) => string) => `| ${name} | ${rs.map(f).join(' | ')} |`;
  const nr = 'not recorded';
  L.push('# AI agent vs reader scorecard', '', `Scored ${today}. Same harness, same ledger, same strict match as docs/handin/ai-scorecard.md (whose figures are not changed).`,
    'Each agent run is scored on the tier its mode allows, beside the reader on the same tier. Same issue counts a second',
    'model\'s SAME verdicts (ai/adjudication-<version>.json); a run without verdicts shows "not adjudicated".', '');
  for (const a of agents) {
    const pair = [reader, a];
    if (a.mode === 'default') {
      L.push('## Mode default: ledger mistakes no deterministic check reaches', '',
        'Only ledger mistakes no deterministic check reaches are scored, so a suggestion that repeats one of our checks earns nothing.', '');
      if (!a.tier.length) {
        L.push(`On this packet every ledger mistake is reached by a deterministic check (${gold.length} of ${gold.length}), so this tier has no entries`,
          'and cannot rank the runs. Use the blind and hide-checks modes below, grounded suggestions beyond the ledger (read by a person),', 'and cost and time.', '');
        continue;
      }
    } else if (a.mode === 'blind') {
      L.push(`## Mode blind: all ${gold.length} ledger mistakes (no run_checks, no find_fact_copies)`, '',
        'The agent sees none of our checks\' results, so recall on every ledger mistake is a fair comparison.',
        'The reader-v2 figures are those of docs/handin/ai-scorecard.md (same payload, same strict rule, same verdicts).', '');
    } else {
      L.push(`## Mode hide-checks, seed ${a.seed}: ledger entries reached only by hidden checks (${a.tier.length})`, '',
        'A seeded half of the check ids was hidden from the agent\'s tools; these are the ledger entries only those checks reach.', '');
    }
    if (a.mode !== 'blind') L.push(`Entries: ${a.tier.join(', ') || 'none'}.`, '');
    const fig = pair.map((r) => tierFigures(r.score, a.tier, r.adjudication, gold));
    L.push(...head(pair));
    L.push(`| Recall, strict | ${fig.map((f) => frac(f.strict.length, f.total)).join(' | ')} |`);
    L.push(`| Recall, same issue (adjudicated) | ${fig.map((f) => (f.same ? frac(f.same.length, f.total) : 'not adjudicated')).join(' | ')} |`);
    L.push(`| Grounding rate | ${fig.map((f) => frac(f.grounded, f.suggestions)).join(' | ')} |`);
    L.push(`| Found, strict | ${fig.map((f) => f.strict.join(', ') || 'none').join(' | ')} |`, '');
  }
  const runs: ScoredRun[] = [reader, ...agents];
  L.push('## All tiers', '', ...head(runs));
  L.push(row('Recall, strict', runs, (r) => frac(r.score.ledgerFound.length, r.score.ledgerTotal)));
  L.push(row('Recall, strict, text tier', runs, (r) => frac(r.score.textTierFound.length, r.score.textTierTotal)));
  L.push(row('Recall, strict, as shown', runs, (r) => frac(r.shown.score.ledgerFound.length, r.shown.score.ledgerTotal)));
  L.push(row('Precision, strict', runs, (r) => frac(r.score.matchedGrounded, r.score.grounded)));
  L.push(row('Grounding rate', runs, (r) => frac(r.score.grounded, r.score.suggestions)));
  L.push(row('Held back by the verifier', runs, (r) => String(r.shown.heldBack)));
  L.push(row('Grounded suggestions on no ledger line', runs, (r) => String(r.score.unmatched.length)));
  L.push(row('Rejected', runs, (r) => String(r.score.rejected)), '');
  L.push('## Run', '', ...head(runs));
  L.push(row('Approximate cost', runs, (r) => (r.meta.costUsd == null ? nr : `$${r.meta.costUsd.toFixed(2)}`)));
  L.push(row('Seconds', runs, (r) => (r.meta.seconds == null ? nr : String(r.meta.seconds))));
  L.push(row('Turns / tool calls', runs, (r) => `${r.meta.turns ?? nr} / ${r.meta.toolCalls ?? nr}`));
  L.push(row('HTTP calls', runs, (r) => (r.meta.calls == null ? nr : String(r.meta.calls))));
  L.push(row('Served model', runs, (r) => r.meta.servedModels?.join(', ') || nr), '');
  if (altered.length) {
    L.push('## Altered packet', '', ...head(altered));
    L.push(row('No-check tier, strict', altered, (r) => `${frac(r.score.beyondChecks.found.length, r.score.beyondChecks.total)}${r.score.beyondChecks.total ? ` (entries ${r.score.beyondChecks.ids.join(', ')})` : ''}`));
    L.push(row('Recall, strict', altered, (r) => frac(r.score.ledgerFound.length, r.score.ledgerTotal)));
    L.push(row('Claims on lines not in this packet', altered, (r) => String(r.score.claimsNotInPacket)));
    L.push(row('Grounding rate', altered, (r) => frac(r.score.grounded, r.score.suggestions)), '');
  }
  return L.join('\n') + '\n';
}
