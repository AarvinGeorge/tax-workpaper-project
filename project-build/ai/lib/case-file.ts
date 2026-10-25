// The agent's case file (docs/superpowers/plans/2026-10-24-agent-case-file.md, Part A): the starting context our code
// prepares from the packet, in place of the raw README, firm standards, case brief and line list. A short schema card,
// the firm's standards as review steps, the domain digest, a state map of every line (no labels: get_line has them), the
// engine's open items, a compact document index, and the client's free text. Detail comes through the tools by id.
// Statuses come only from the mode's findings (findingsFor), the tool's own proofs and the arithmetic rule list, so a
// blind or hide-checks run learns nothing from the case file that its tools would not tell it. Pure; masked.
import type { PacketIndex } from '../../src/domain/packet/load';
import type { Finding } from '../../src/domain/contracts';
import { proofsFor } from '../../src/domain/proofs';
import { FLOW_RULES } from '../../src/domain/flow';
import { documentLanding } from '../../src/domain/docs';
import { DEFAULT_MODE, findingsFor, type AgentMode } from './modes';
import { leftovers } from './agent-tools';
import { clientContext, masker } from './reader-core';

/** Money and line items listed in the work list (engine warnings are all listed; there are few). */
export const WORK_LIST_TOP = 40;
const TEXT_VALUE_MAX = 40;

type Obj = Record<string, unknown>;
const fmt = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v));

/** Hand-written once from the packet README: what the records are and how ids look. glossary(term) has the full text. */
const SCHEMA_CARD = `## Schema card (the packet; verify with method glossary gives any field's full README entry)
- Truth order: documents[].pages[].printed_content is what is printed. extracted_values is what the pipeline read
  from it (can be wrong, even at high confidence). return_versions are the engine's reading and rules (can be wrong).
- Document (D01..D74): type, issuer, owner, tax year, received date, pages, whether it landed on the return.
- Extracted value (ev-NNNN): one field read from a document page: field (the issuer's box), label, value, type
  (money, date, text, ssn, ...), text as read, confidence.
- Return line (<form>.<line>, e.g. F1040.11, SchE.14A, SchCA540NR.1.E, F8949.<box>.<lot>): value in whole dollars
  (8949 lots in cents; a few lines hold text or dates), rule (an engine rule id), inputs (other line keys), sources
  (value ids, py:/ prior-year pointers, agency:/ agency-record pointers, doc:<id>#page<n>).
- Rule: engine_reference.rules (id -> words). R-SUM, R-CARRY, R-RENTAL-LINE and R-8949-LOT are plain arithmetic on
  the listed inputs; every other rule is a computation only the engine can do. The engine cannot be rerun.
- Versions: v1, v2, v3 (latest, the return under review). Client text: qa-NN answers, msg-NN messages, call-NN notes.
- Prior years: the 2024 return, the prior preparer's memo and open items, carryovers, asset and basis records.
- Agency records: IRS account transcript and FTB account (payments, notices).`;

/** The firm's required steps the agent can work on, as instructions; people's steps (sign-offs, consents) are left out. */
const STEP_WORK: [RegExp, (ix: PacketIndex) => string][] = [
  [/documents accounted/i, () => 'All documents accounted for: every landed document\'s amounts reach a line (work list: uncited_money); a document not on the return has a reason (Documents below).'],
  [/variances/i, (ix) => {
    const vr = ix.packet.firm.starter_standards.variance_review as { flag_if_change_over_percent?: number; and_over_amount?: number } | undefined;
    return `Prior-year variances explained: a line that moved more than ${vr?.flag_if_change_over_percent ?? '?'}% and more than ${(vr?.and_over_amount ?? 0).toLocaleString('en-US')} from last year needs a reason in the documents or the client's text (verify prior_year).`;
  }],
  [/carryovers/i, () => 'Carryovers agreed to prior year: each carryover line against last year\'s records (verify prior_year).'],
  [/estimated payments/i, () => 'Estimated payments agreed to IRS and FTB records: payment lines against the agency transcripts (verify fact_copies).'],
  [/diagnostics/i, () => 'Diagnostics resolved: every engine warning in the work list is explained or is a real issue.'],
  [/due diligence/i, (ix) => {
    const rule = ((ix.packet.firm.starter_standards.rules as string[] | undefined) ?? []).find((r) => /due diligence/i.test(r));
    return `Due diligence: ${rule ?? 'the credits and filing status the firm names'} Check each against the household facts and documents.`;
  }],
  [/prior-year return reviewed/i, () => 'Prior-year return reviewed: last year\'s notes and the prior preparer\'s open items (Client text below) are closed by this year\'s documents.'],
];

function routine(ix: PacketIndex, digest: string): string {
  const steps = ((ix.packet.firm.starter_standards.required_steps as string[] | undefined) ?? [])
    .map((s) => STEP_WORK.find(([re]) => re.test(s))?.[1](ix)).filter((s): s is string => !!s);
  steps.push('Free text: read the client\'s answers, messages and call notes against the lines they gate; a rule cannot.');
  steps.push('Use verify for every number you rely on; never add, subtract or recompute a figure yourself.');
  const types = (ix.packet.firm.starter_standards.verification_types as string[] | undefined) ?? [];
  return [
    '## How to review (the firm\'s standards as steps)',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    `The firm's verification types: ${types.join(', ')}.`,
    '',
    digest.trim(),
  ].join('\n');
}

/** P proved (a receipt from our own code), F a finding sits on it, O open, E a rule only the engine computes. */
function status(ix: PacketIndex, key: string, rule: string | null, inputs: string[], claimed: Set<string>): 'P' | 'F' | 'O' | 'E' {
  if (claimed.has(`line:${key}`)) return 'F';
  if (proofsFor(ix, key).length) return 'P';
  if (inputs.length && !(rule && FLOW_RULES.includes(rule))) return 'E';
  return 'O';
}

function stateMap(ix: PacketIndex, findings: Finding[]): string {
  const m = masker(ix);
  const claimed = new Set(findings.flatMap((f) => f.claims));
  const out = [
    `## State map: every line of the latest return (${ix.latest.version}), key | value | rule | status`,
    'Status: P proved by our code (agreed to source, recalculated, prior year or a third-party record; agreement, not',
    'correctness), F a deterministic check already raises an issue on it, O open (nothing has settled it), E computed by',
    'an engine rule past arithmetic. Labels, inputs and sources: get_line.',
  ];
  for (const l of ix.latest.lines) {
    const v = typeof l.value === 'string' && l.value.length > TEXT_VALUE_MAX ? `${l.value.slice(0, TEXT_VALUE_MAX)}…` : l.value;
    out.push(m(`${l.key} | ${fmt(v)} | ${l.rule ?? ''} | ${status(ix, l.key, l.rule, l.inputs ?? [], claimed)}`));
  }
  return out.join('\n');
}

const amountOf = (x: Obj) => (typeof x.value === 'number' ? Math.abs(x.value) : 0);

function workList(ix: PacketIndex, open: Obj[]): string {
  const m = masker(ix);
  const kinds = ['unproven_line', 'uncovered_engine_warning', 'uncited_money'];
  const warnings = open.filter((x) => x.kind === 'uncovered_engine_warning');
  // Open items first (an O line, or money no line cites), then lines only the engine computes: those the agent can
  // settle come before those it can only question.
  const engineOnly = (x: Obj) => {
    if (x.kind !== 'unproven_line') return false;
    const l = ix.line(ix.latest.version, String(x.key));
    return !!l && (l.inputs ?? []).length > 0 && !(l.rule && FLOW_RULES.includes(l.rule));
  };
  const rest = open.filter((x) => x.kind !== 'uncovered_engine_warning')
    .sort((a, b) => Number(engineOnly(a)) - Number(engineOnly(b)) || amountOf(b) - amountOf(a) || String(a.key ?? a.ref).localeCompare(String(b.key ?? b.ref)))
    .slice(0, WORK_LIST_TOP);
  const item = (x: Obj) => x.kind === 'uncovered_engine_warning'
    ? `- warning ${fmt(x.code)} (${fmt(x.severity)}): ${fmt(x.message)} [${((x.refs as string[]) ?? []).join(', ')}]`
    : x.kind === 'unproven_line' ? `- line ${fmt(x.key)} | ${fmt(x.value)} | ${fmt(x.rule)}${engineOnly(x) ? ' | engine-only (a computation past arithmetic: question it, do not recompute)' : ''}`
      : `- value ${fmt(x.ref)} | ${fmt(x.doc)} p${fmt(x.page)} | ${fmt(x.label)} | ${fmt(x.value)}`;
  return [
    '## Work list: what nothing deterministic has settled (list_open_leftovers pages through all of it)',
    `Counts: ${kinds.map((k) => `${k}: ${open.filter((x) => x.kind === k).length}`).join(', ')}.`,
    `Every engine warning no check covers, then the ${WORK_LIST_TOP} largest other items by amount, open items before engine-only lines.`,
    'Informational fields (Social Security and Medicare wage boxes, mortgage principal, 1099-B summary totals) are left out.',
    ...warnings.map(item).map(m),
    ...rest.map(item).map(m),
  ].join('\n');
}

function documents(ix: PacketIndex): string {
  const m = masker(ix);
  const landing = new Map(documentLanding(ix, '9999-12-31T00:00:00Z').map((d) => [d.docId, d]));
  const out = ['## Documents: id | type | issuer | tax year | on the return'];
  for (const d of ix.packet.documents) {
    const l = landing.get(d.id);
    const where = !l ? '' : l.status === 'landed' ? `landed on ${l.landedLines.length} line(s)` : `not landed: ${l.reason?.code ?? ''}`;
    out.push(m(`${d.id} | ${d.document_type} | ${fmt(d.issuer)} | ${fmt(d.tax_year)} | ${where}`));
  }
  return out.join('\n');
}

export interface Section { name: string; text: string }

/** The case file's sections, from given findings and open items (the mode decides both; see caseFileSections). */
export function buildSections(ix: PacketIndex, digest: string, findings: Finding[], open: Obj[]): Section[] {
  return [
    { name: 'Schema card', text: SCHEMA_CARD },
    { name: 'How to review + digest', text: routine(ix, digest) },
    { name: 'State map', text: stateMap(ix, findings) },
    { name: 'Work list', text: workList(ix, open) },
    { name: 'Documents', text: documents(ix) },
    { name: 'Client text', text: clientContext(ix) },
  ];
}
export const buildCaseFile = (ix: PacketIndex, digest: string, findings: Finding[], open: Obj[]) =>
  buildSections(ix, digest, findings, open).map((s) => s.text).join('\n\n');

export const caseFileSections = (ix: PacketIndex, digest: string, mode: AgentMode = DEFAULT_MODE) =>
  buildSections(ix, digest, findingsFor(ix, mode), leftovers(ix, mode));
export const caseFile = (ix: PacketIndex, digest: string, mode: AgentMode = DEFAULT_MODE) =>
  buildCaseFile(ix, digest, findingsFor(ix, mode), leftovers(ix, mode));
