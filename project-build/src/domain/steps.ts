// The firm's required steps as closed-world gates. Three of the firm's own steps (starter_standards.required_steps) are
// whole populations a person must account for: the engine's diagnostics, the documents and the money on them, and the
// prior-year variances. Every item stays open until a verification naming its step explains it, and the projection
// blocks approval while any is open, so a discrepancy no check was written for still reaches a person.
// Everything is read from the packet's schema; no document id, line key or code is named here.
import type { WorkEvent } from './contracts';
import type { PacketIndex } from './packet/load';
import { documentLanding } from './docs';
import { swings } from './versions';

/** The firm's wording for each gated step (matched, so the step applies only when the firm lists it). */
export const STEP_WORDING = {
  diagnostics: /diagnostics resolved/i,
  documents: /documents accounted for/i,
  variances: /variances explained/i,
} as const;

export interface StepItem {
  step: string; kind: 'diagnostic' | 'document' | 'amounts' | 'variance' | 'form';
  claimId: string; title: string; detail: string; refs: string[]; explained: boolean;
}
export interface StepState { step: string; items: StepItem[]; open: number }

// Documents the packet itself already accounts for: counted once elsewhere, replaced, or after filing.
const SETTLED = new Set(['duplicate', 'superseded', 'post_filing']);
const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Every gated step the firm lists, with its items as of the index's story time. `events` are the live events. */
export function firmSteps(pix: PacketIndex, events: WorkEvent[]): StepState[] {
  const listed = ((pix.packet.firm.starter_standards.required_steps as string[] | undefined) ?? []).map(String);
  const computed = pix.latest.computed !== false;
  const explained = (step: string, claimId: string) =>
    events.some((e) => e.type === 'verification' && e.claimId === claimId && e.payload.step === step);
  const out: StepState[] = [];
  for (const [kind, re] of Object.entries(STEP_WORDING) as [keyof typeof STEP_WORDING, RegExp][]) {
    const step = listed.find((s) => re.test(s));
    if (!step) continue;
    const raw = !computed ? [] : kind === 'diagnostics' ? diagnosticItems(pix) : kind === 'documents' ? documentItems(pix) : varianceItems(pix);
    const items = raw.map((i) => ({ ...i, step, explained: explained(step, i.claimId) }));
    out.push({ step, items, open: items.filter((i) => !i.explained).length });
  }
  return out;
}

type Raw = Omit<StepItem, 'step' | 'explained'>;

function diagnosticItems(pix: PacketIndex): Raw[] {
  const seen = new Map<string, number>();
  return pix.latest.diagnostics.map((d) => {
    const n = (seen.get(d.code) ?? 0) + 1;
    seen.set(d.code, n);
    return { kind: 'diagnostic', claimId: `diag:${d.code}${n > 1 ? `#${n}` : ''}`, title: d.message, detail: `${d.severity} from the engine (${pix.latest.version})`, refs: d.refs || [] };
  });
}

function documentItems(pix: PacketIndex): Raw[] {
  const out: Raw[] = [];
  const cited = new Set(pix.latest.lines.flatMap((l) => l.sources || []));
  const moneyOf = (docId: string) => (pix.valuesByDoc.get(docId) || []).filter((v) => v.value_type === 'money' && typeof v.value === 'number' && v.value !== 0);
  for (const d of documentLanding(pix, pix.latest.computed_at)) {
    if (!d.visible) continue;
    const amounts = moneyOf(d.docId);
    if (!amounts.length) continue;
    if (d.status === 'not_landed') {
      if (d.reason && SETTLED.has(d.reason.code)) continue;
      out.push({ kind: 'document', claimId: `doc:${d.docId}`, title: d.title,
        detail: `No line on the return uses it. The system's guess: ${d.reason?.text ?? 'none'}`, refs: [] });
      continue;
    }
    const loose = amounts.filter((v) => !cited.has(v.id));
    if (!loose.length) continue;
    out.push({ kind: 'amounts', claimId: `doc:${d.docId}`, title: d.title,
      detail: `${loose.length} amount${loose.length === 1 ? '' : 's'} on it reach no line: ${loose.slice(0, 6).map((v) => `${v.label || v.field} ${money(v.value as number)}`).join('; ')}${loose.length > 6 ? '; …' : ''}`,
      refs: loose.map((v) => v.id) });
  }
  return out;
}

function varianceItems(pix: PacketIndex): Raw[] {
  const out: Raw[] = [];
  const dropped = new Map<string, string[]>();
  for (const s of swings(pix)) {
    if (s.flag !== 'swing') continue;
    const line = pix.line(pix.latest.version, s.key);
    if (!line) { const form = s.key.split('.')[0]; dropped.set(form, [...(dropped.get(form) ?? []), s.key]); continue; }
    if ((line.inputs || []).length) continue; // a total: explained through the lines it adds up
    out.push({ kind: 'variance', claimId: `line:${s.key}`, title: s.label,
      detail: `Last year ${money(s.prior ?? 0)}, now ${money(s.current)} (${s.delta >= 0 ? '+' : ''}${money(s.delta)})`, refs: s.priorRef ? [s.priorRef] : [] });
  }
  const forms = new Set(pix.latest.lines.map((l) => l.form));
  for (const [form, keys] of dropped) {
    const title = forms.has(form) ? `${form}: lines from last year not on this year's form` : `${form} was on last year's return and is not on this one`;
    out.push({ kind: 'form', claimId: `form:${form}`, title,
      detail: `${keys.length} line${keys.length === 1 ? '' : 's'} over the firm's variance rule: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', …' : ''}`, refs: [] });
  }
  return out;
}
