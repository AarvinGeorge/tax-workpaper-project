// The agent's case file (ai/lib/case-file.ts): the starting context our code prepares from the packet, instead of the
// raw README, standards, brief and line list. Real packet, no network.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { LEDGER, runChecks } from '@/domain/checks/index';
import { proofsFor } from '@/domain/proofs';
import { FLOW_RULES } from '@/domain/flow';
import { SSN_SHAPED } from '@/domain/ai/verify';
import { hiddenCheckIds, type AgentMode } from '../../ai/lib/modes';
import { informationalUncited, leftovers } from '../../ai/lib/agent-tools';
import { loadContextFiles } from '../../ai/lib/agent-core';
import { clientContext, returnLinesContext, sharedContext } from '../../ai/lib/reader-core';
import { WORK_LIST_TOP, buildCaseFile, caseFile, caseFileSections } from '../../ai/lib/case-file';

const ix = indexPacket(loadPacket());
const { digest } = loadContextFiles(process.cwd());
const blind: AgentMode = { kind: 'blind' };
const hide: AgentMode = { kind: 'hide-checks', seed: 7 };
const rows = (text: string) => {
  const part = text.split('\n## ').find((s) => s.startsWith('State map'))!;
  return part.split('\n').filter((l) => /^\S+ \| .* \| \S* \| [PFOE]$/.test(l)).map((l) => { const c = l.split(' | '); return { key: c[0], status: c[c.length - 1] }; });
};
const realSsns = [...new Set(JSON.stringify(ix.packet).match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? [])];

describe('case file: contents', () => {
  const text = caseFile(ix, digest);
  it('has the schema card, the review routine, the digest, the state map, the work list, documents and client text; no brief', () => {
    for (const h of ['## Schema card', '## How to review', '# How a US individual return is reviewed', '## State map', '## Work list', '## Documents', '## Client questionnaire answers']) expect(text, h).toContain(h);
    expect(text).not.toContain('Case Study: Redesign the Tax Workpaper');
    expect(text).not.toContain('## Packet README');
  });

  it('the review routine carries the firm\'s variance rule from the packet', () => {
    const vr = ix.packet.firm.starter_standards.variance_review as { flag_if_change_over_percent: number; and_over_amount: number };
    const routine = text.split('\n## ').find((s) => s.startsWith('How to review'))!;
    expect(routine).toContain(`${vr.flag_if_change_over_percent}%`);
    expect(routine).toContain(vr.and_over_amount.toLocaleString('en-US'));
    expect(routine).toMatch(/^1\. /m);
  });

  it('every latest line appears once in the state map, without its label', () => {
    const r = rows(text);
    expect(r.map((x) => x.key).sort()).toEqual(ix.latest.lines.map((l) => l.key).sort());
    const labelled = ix.latest.lines.find((l) => l.label.length > 25)!;
    const part = text.split('\n## ').find((s) => s.startsWith('State map'))!;
    expect(part).not.toContain(labelled.label);
  });

  it('statuses: F exactly on lines our findings claim; P on proved lines without a finding', () => {
    const claimed = new Set(runChecks(ix).flatMap((f) => f.claims));
    for (const { key, status } of rows(text)) {
      expect(status === 'F', key).toBe(claimed.has(`line:${key}`));
      if (!claimed.has(`line:${key}`)) expect(status === 'P', key).toBe(proofsFor(ix, key).length > 0);
    }
    expect(new Set(rows(text).map((x) => x.status))).toEqual(new Set(['P', 'F', 'O', 'E']));
  });

  it('the work list gives counts by kind, every uncovered engine warning, and at most the top amounts', () => {
    const all = leftovers(ix);
    const part = text.split('\n## ').find((s) => s.startsWith('Work list'))!;
    for (const k of ['unproven_line', 'uncovered_engine_warning', 'uncited_money']) expect(part).toContain(`${k}: ${all.filter((x) => x.kind === k).length}`);
    const items = part.split('\n').filter((l) => /^- /.test(l));
    const warnings = all.filter((x) => x.kind === 'uncovered_engine_warning').length;
    expect(items.length).toBe(warnings + Math.min(WORK_LIST_TOP, all.length - warnings));
    expect(WORK_LIST_TOP).toBe(40);
  });

  it('is deterministic', () => {
    expect(caseFile(ix, digest)).toBe(text);
  });
});

describe('case file: the answer key and identifiers never appear', () => {
  it.each([['default', { kind: 'default' } as AgentMode], ['blind', blind], ['hide-checks', hide]])('%s: no ledger id or title, no check id, no SSN shape', (_n, mode) => {
    const text = caseFile(ix, digest, mode);
    expect(text).not.toMatch(/GT-[A-Z]\d\d/);
    expect(text).not.toMatch(/CHK-[A-Z]/);
    for (const e of LEDGER) { expect(text.includes(e.title), e.id).toBe(false); expect(text.includes(e.surfaced), e.id).toBe(false); }
    expect(realSsns.length).toBeGreaterThan(0);
    expect(SSN_SHAPED.test(text)).toBe(false);
    for (const s of realSsns) expect(text.includes(s.replace(/-/g, ''))).toBe(false);
  });

  it('blind: no F status, and the same text as a case file built with no findings at all', () => {
    const text = caseFile(ix, digest, blind);
    expect(rows(text).some((x) => x.status === 'F')).toBe(false);
    expect(text).toBe(buildCaseFile(ix, digest, [], leftovers(ix, blind)));
    for (const f of runChecks(ix)) expect(text.includes(f.explanation), f.checkId).toBe(false);
  });

  it('hide-checks: a line only a hidden check claims is not F; no hidden finding text', () => {
    const text = caseFile(ix, digest, hide);
    const hidden = new Set(hiddenCheckIds(7));
    const all = runChecks(ix);
    const kept = new Set(all.filter((f) => !hidden.has(f.checkId)).flatMap((f) => f.claims));
    const onlyHidden = all.filter((f) => hidden.has(f.checkId)).flatMap((f) => f.claims).filter((c) => c.startsWith('line:') && !kept.has(c));
    expect(onlyHidden.length).toBeGreaterThan(0); // the seed really hides line findings, so this measures something
    const st = new Map(rows(text).map((x) => [x.key, x.status]));
    for (const c of onlyHidden) expect(st.get(c.slice(5)), c).not.toBe('F');
  });
});

describe('case file: size', () => {
  it('sections are measured, and the whole is smaller than the old context (22,890 tokens by chars/4)', () => {
    const s = caseFileSections(ix, digest);
    expect(s.map((x) => x.name)).toContain('State map');
    const total = Math.round(s.reduce((n, x) => n + x.text.length, 0) / 4);
    expect(total).toBeLessThan(22_890);
  });
});

describe('reader context split (the reader\'s text is unchanged)', () => {
  it('sharedContext is the return lines and the client text, joined as before', () => {
    expect(sharedContext(ix)).toBe(`${returnLinesContext(ix)}\n\n${clientContext(ix)}`);
    expect(returnLinesContext(ix).startsWith(`## Latest return version ${ix.latest.version}: lines`)).toBe(true);
    expect(clientContext(ix).startsWith('## Client questionnaire answers')).toBe(true);
  });
});

describe('case file: work list ranking and informational fields', () => {
  it('open (O) items come before engine-only (E) lines, which are labelled', () => {
    const open = leftovers(ix, blind);
    const isE = (x: Record<string, unknown>) => {
      if (x.kind !== 'unproven_line') return false;
      const l = ix.line(ix.latest.version, String(x.key));
      return !!l && (l.inputs ?? []).length > 0 && !(l.rule && FLOW_RULES.includes(l.rule));
    };
    const items = (text: string) => text.split('\n## ').find((x) => x.startsWith('Work list'))!.split('\n').filter((l) => /^- (line|value) /.test(l));
    const listed = items(caseFile(ix, digest, blind));
    const firstE = listed.findIndex((l) => /engine-only/.test(l));
    if (firstE >= 0) expect(listed.slice(firstE).every((l) => /engine-only/.test(l))).toBe(true);
    const openCount = open.filter((x) => x.kind !== 'uncovered_engine_warning' && !isE(x)).length;
    expect(listed.filter((l) => !/engine-only/.test(l))).toHaveLength(Math.min(WORK_LIST_TOP, openCount)); // open items fill the list first
    expect(open.some(isE)).toBe(true); // engine-only lines exist, so the ranking was tested
    const eOnly = items(buildCaseFile(ix, digest, [], open.filter(isE)));
    expect(eOnly.length).toBeGreaterThan(0);
    expect(eOnly.every((l) => /engine-only/.test(l))).toBe(true);
  });

  it('informational fields leave the uncited money: Social Security/Medicare wage boxes, mortgage principal, 1099-B summary totals', () => {
    const dropped = informationalUncited(ix).map((v) => v.id).sort();
    expect(dropped).toEqual(['ev-0018', 'ev-0037', 'ev-0703', 'ev-0907', 'ev-1031', 'ev-1033', 'ev-1083', 'ev-1084', 'ev-1085', 'ev-1086', 'ev-1087', 'ev-1088']);
    const refs = new Set(leftovers(ix, blind).filter((x) => x.kind === 'uncited_money').map((x) => x.ref));
    for (const id of dropped) expect(refs.has(id), id).toBe(false);
    expect(refs.size).toBeGreaterThan(30); // the rest stay
  });
});
