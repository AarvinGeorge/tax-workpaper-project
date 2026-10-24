// The check library: deterministic checks over the packet's schema that do not trust the engine. Engine diagnostics
// are not findings (the UI shows them beside, labelled "From the engine"); a line the engine says it did not compute is
// checked from its rule and inputs (CHK-LINE-NOT-COMPUTED), never from the diagnostic.
import type { PacketIndex } from '../packet/load';
import type { Finding, Severity } from '../contracts';
import { LEDGER } from './catalogue';
import { asIso, refTime } from './reftime';
import { type Check, type Draft, partnerThreshold } from './util';
import { agencyChecks } from './families/agency';
import { blankReadChecks } from './families/blank-read';
import { clientAnswerChecks } from './families/client-answer';
import { countedTwiceChecks } from './families/counted-twice';
import { disagreeChecks } from './families/disagree';
import { electionChecks } from './families/election';
import { identityChecks } from './families/identity';
import { ignoredFieldChecks } from './families/ignored-field';
import { judgmentChecks } from './families/judgment';
import { lateAnswerChecks } from './families/late-answer';
import { limitChecks } from './families/limit';
import { openItemChecks } from './families/open-item';
import { priorYearChecks } from './families/prior-year';
import { residencyChecks } from './families/residency';
import { traceChecks } from './families/trace';

export const CHECKS: Check[] = [
  ...disagreeChecks, ...countedTwiceChecks, ...agencyChecks, ...identityChecks, ...ignoredFieldChecks, ...limitChecks,
  ...lateAnswerChecks, ...openItemChecks, ...residencyChecks, ...electionChecks, ...blankReadChecks, ...judgmentChecks,
  ...clientAnswerChecks, ...priorYearChecks, ...traceChecks,
];

/** Checks whose findings are about the trace, not the tax: shown as info. */
const INFO_FAMILIES = new Set(['Trace gap']);
const ORDER: Record<Severity, number> = { blocker: 0, judgment: 1, check: 2, info: 3 };

/** The computation at which a line first carried its current value (unchanged through to the latest). */
function lineSince(ix: PacketIndex, key: string): string | null {
  const latest = ix.line(ix.latest.version, key);
  if (!latest) return null;
  let since = ix.latest.computed_at;
  for (let i = ix.versions.length - 1; i >= 0; i--) {
    const l = ix.line(ix.versions[i].version, key);
    if (!l || JSON.stringify(l.value) !== JSON.stringify(latest.value)) break;
    since = ix.versions[i].computed_at;
  }
  return since;
}

function finalize(ix: PacketIndex, check: Check, d: Draft, threshold: number): Finding {
  const times: string[] = [];
  for (const r of d.trigger ?? d.evidence) { const t = refTime(ix, r); if (t) times.push(asIso(t)); }
  // Visible once any claim line carries its current value (the earliest such computation).
  const since = d.claims.filter((c) => c.startsWith('line:')).map((c) => lineSince(ix, c.slice(5))).filter((t): t is string => !!t)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  if (since) times.push(since);
  const firstVisibleAt = times.length ? times.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)) : ix.versions[0]?.computed_at;
  const big = Math.max(Math.abs(d.effect?.federal ?? 0), Math.abs(d.effect?.california ?? 0));
  const severity: Severity = d.stopsEfile || big > threshold ? 'blocker'
    : d.judgment ? 'judgment' : INFO_FAMILIES.has(check.family) ? 'info' : 'check';
  const ledgerIds = LEDGER.filter((e) => e.checkIds.includes(check.id) && d.claims.some((c) => e.claims.includes(c)))
    .flatMap((e) => [e.id, ...(e.aliases ?? [])]);
  return {
    id: `${check.id}:${d.claims[0] ?? d.evidence[0] ?? 'packet'}`,
    checkId: check.id, family: check.family, title: d.title, severity,
    claims: d.claims, evidence: [...new Set(d.evidence)], explanation: d.explanation, plain: d.plain,
    effect: d.effect, ledgerIds, firstVisibleAt,
  };
}

/** Runs every check on the packet. Independent of the story clock; `asOf` keeps only findings visible by then. */
export function runChecks(ix: PacketIndex, asOf?: string): Finding[] {
  const threshold = partnerThreshold(ix);
  const out: Finding[] = [];
  const ids = new Set<string>();
  for (const check of CHECKS) {
    for (const d of check.run(ix)) {
      const f = finalize(ix, check, d, threshold);
      let id = f.id; let n = 2;
      while (ids.has(id)) id = `${f.id}#${n++}`;
      ids.add(id);
      out.push({ ...f, id });
    }
  }
  const shown = asOf ? out.filter((f) => !f.firstVisibleAt || Date.parse(f.firstVisibleAt) <= Date.parse(asOf)) : out;
  // A safety-net check never repeats what a specific check, visible at the same time, already says about the claim.
  const net = new Set(CHECKS.filter((c) => c.yields).map((c) => c.id));
  const specific = new Set(shown.filter((f) => !net.has(f.checkId)).flatMap((f) => f.claims));
  const visible = shown.filter((f) => !net.has(f.checkId) || !f.claims.some((c) => specific.has(c)));
  return visible.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export { LEDGER, refTime };
