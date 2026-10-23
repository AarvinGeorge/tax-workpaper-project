// Rebuilds the generated parts of docs/handin/errors-found.md from the app's own catalogue and its checks' output on
// the real packet: the mistakes table, the blocker and net-effect sentence, and the per-mistake notes. The prose
// around them is left as written. Run: npx tsx scripts/errors-found.ts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { indexPacket, loadPacket } from '../src/domain/packet/load';
import { CHECKS, LEDGER, runChecks } from '../src/domain/checks';

const DOC = path.join(process.cwd(), '..', 'docs', 'handin', 'errors-found.md');
const SEVERITY: Record<string, string> = { blocker: 'Blocker', check: 'Check failed', judgment: 'Judgment', info: 'Note' };
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;

const ix = indexPacket(loadPacket());
const findings = runChecks(ix);
const family = new Map(CHECKS.map((c) => [c.id, c.family]));

let fedTotal = 0; let caTotal = 0; let blockers = 0;
const rows: string[] = [];
for (const e of LEDGER) {
  const hits = findings.filter((f) => f.ledgerIds.includes(e.id));
  if (!hits.length) throw new Error(`${e.id}: no finding on the real packet`);
  const main = hits.find((f) => f.claims.some((c) => e.claims.includes(c))) ?? hits[0];
  const caught = [...new Set(hits.map((f) => family.get(f.checkId)!))].join('; ');
  const fed = main.effect?.federal ?? 0; const ca = main.effect?.california ?? 0;
  fedTotal += fed; caTotal += ca;
  if (main.severity === 'blocker') blockers++;
  const parts = [fed ? `${signed(fed)} federal` : '', ca ? `${signed(ca)} California` : ''].filter(Boolean);
  const effect = (main.effect && (fed || ca || main.effect.federal === 0) ? parts.join(', ') || 'no tax change' : 'no dollar effect')
    + (e.caveat ? ` (${e.caveat})` : '');
  const id = e.aliases?.length ? `${e.id} (also ${e.aliases.join(', ')})` : e.id;
  rows.push(`| ${id} | ${e.title} | ${caught} | ${SEVERITY[main.severity]} | ${effect} |`);
}

let md = readFileSync(DOC, 'utf8');
const table = ['| Id | The mistake | Caught by | In the app | Tax effect of the fix |', '|---|---|---|---|---|', ...rows].join('\n');
md = md.replace(/\| Id \| The mistake \|[^\n]*\n\|---[^\n]*\n(?:\| GT-[^\n]*\n)+/, `${table}\n`);
md = md.replace(/\*\*\d+ of the 27 are blockers:\*\*[\s\S]*?\(each estimate taken alone;\nfixes interact\)\./,
  `**${blockers} of the 27 are blockers:** the partner cannot approve the return while any is open. Net estimated effect of\n`
  + `fixing all 27: **${signed(fedTotal)} federal, ${signed(caTotal)} California** (each estimate taken alone;\nfixes interact).`);
md = md.replace(/(Per mistake, in the catalogue's own notes:\n\n)(?:- \*\*GT-[^\n]*\n)+/,
  `$1${LEDGER.map((e) => `- **${e.id}.** ${e.surfaced}`).join('\n')}\n`);
writeFileSync(DOC, md);
console.log(`errors-found.md: ${rows.length} rows, ${blockers} blockers, net ${signed(fedTotal)} federal, ${signed(caTotal)} California`);
