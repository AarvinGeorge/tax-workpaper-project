// Proofs the tool runs itself on a return line, named by the firm's own verification types: the "Checked by Taxmark"
// part of a number's receipt. A proof states an agreement (the value equals its source, its inputs add up, a carryover
// equals last year's record); it never says the number is right, because a confident mistake agrees with its own
// source. That is why our checks test numbers against other sources. Read from the packet's schema; no ids named here.
import type { PacketIndex } from './packet/load';
import { fmt, isSumRule, num, reachable, valuesOf } from './checks/util';

export interface Proof { method: string; text: string; refs: string[] }

const pointer = (root: unknown, ptr: string): unknown =>
  ptr.split('/').slice(1).reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined), root);
const near = (a: number, b: number) => Math.abs(a - b) < 1;

export function proofsFor(ix: PacketIndex, key: string): Proof[] {
  const line = ix.line(ix.latest.version, key);
  const value = num(line?.value);
  if (!line || value === null) return [];
  const types = new Set((ix.packet.firm.starter_standards.verification_types as string[] | undefined) ?? []);
  const out: Proof[] = [];

  // Agreed to source document: the value equals one extracted source, or all of them added.
  const vals = valuesOf(ix, line).filter((v) => num(v.value) !== null);
  if (types.has('agreed_to_source_document') && vals.length) {
    // One source matching counts only when it is a real amount (not a sub-dollar figure against a 0 field) and the only
    // value cited from its document: one field of a form cited for several (a lot's proceeds and basis) can match by chance.
    const fromDoc = (d: string) => vals.filter((v) => v.document_id === d).length;
    const one = vals.find((v) => Math.abs(num(v.value)!) >= 1 && fromDoc(v.document_id) === 1 && near(Math.abs(num(v.value)!), Math.abs(value)));
    const total = vals.reduce((s, v) => s + num(v.value)!, 0);
    // Adding is a receipt only for like amounts: separate documents, or one field repeated (a log's page totals), never
    // different fields of one form (a lot's proceeds plus its basis).
    const alike = [...new Set(vals.map((v) => v.document_id))].every((d) => new Set(vals.filter((v) => v.document_id === d).map((v) => v.field.replace(/\d+/g, '#'))).size === 1);
    if (one) {
      out.push({ method: 'agreed_to_source_document', text: `Agrees with ${one.label} on ${ix.docById.get(one.document_id)?.title ?? one.document_id}: ${fmt(num(one.value)!)}`, refs: [one.id] });
    } else if (vals.length > 1 && alike && near(Math.abs(total), Math.abs(value))) {
      out.push({ method: 'agreed_to_source_document', text: `Equals its ${vals.length} source amounts added: ${vals.map((v) => fmt(num(v.value)!)).join(' + ')} = ${fmt(total)}`, refs: vals.map((v) => v.id) });
    }
  }

  // Recalculated: a line equal to its one input line is carried from it; a sum line whose listed inputs produce its value.
  const only = (line.inputs || []).length === 1 ? num(ix.line(ix.latest.version, line.inputs[0])?.value) : null;
  if (types.has('recalculated') && only !== null && near(only, value)) {
    out.push({ method: 'recalculated', text: `Carried from ${line.inputs[0]}: ${fmt(value)}`, refs: [`line:${line.inputs[0]}`] });
  } else if (types.has('recalculated') && isSumRule(ix, line) && (line.inputs || []).length > 1) {
    const ins = (line.inputs || []).map((k) => num(ix.line(ix.latest.version, k)?.value));
    if (ins.every((x) => x !== null) && ins.length <= 12 && reachable(value, ins as number[])) {
      out.push({ method: 'recalculated', text: `Recalculated from its ${ins.length} input line${ins.length === 1 ? '' : 's'} (${(line.inputs || []).join(', ')}): ${fmt(value)}`, refs: (line.inputs || []).map((k) => `line:${k}`) });
    }
  }

  // Agreed to prior year: a carryover equals last year's carryover record (one entry or several added).
  const py = (line.sources || []).filter((s) => s.startsWith('py:'));
  if (types.has('agreed_to_prior_year') && py.length) {
    const prior = py.map((s) => num(pointer(ix.packet.prior_years, s.slice(3))));
    const sum = prior.reduce<number>((s, x) => s + (x ?? 0), 0);
    if (prior.every((x) => x !== null) && near(Math.abs(sum), Math.abs(value))) {
      out.push({ method: 'agreed_to_prior_year', text: `Equals last year’s carryover record: ${prior.length > 1 ? `${prior.map((x) => fmt(x!)).join(' + ')} = ` : ''}${fmt(Math.abs(sum))}`, refs: py });
    }
  }
  return out;
}
