// The behaviour contract: what the app produces today on the real packet, recorded once and compared on every run.
// Any difference fails, so a change cannot alter what already works without someone deciding it should. To accept an
// approved change in behaviour, regenerate with `npx vitest run tests/unit/behaviour-contract.test.ts -u` in the same
// commit and say why in docs/decisions.md.
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { runChecks } from '@/domain/checks';
import { projectWorkspace } from '@/domain/project';
import { DEFAULT_STORY_AT } from '@/domain/clock';
import { proofsFor } from '@/domain/proofs';
import { aiReview } from '@/domain/ai/merge';
import { documentLanding } from '@/domain/docs';
import type { RoleKey, WorkEvent } from '@/domain/contracts';

const ix = indexPacket(loadPacket());
const findings = runChecks(ix);
const AT = DEFAULT_STORY_AT(ix);
let seq = 0;
const ev = (role: RoleKey, type: WorkEvent['type'], extra: Partial<WorkEvent> = {}): WorkEvent =>
  ({ seq: ++seq, ws: 'contract', at: '2026-10-24T00:00:00Z', storyAt: AT, role, type, payload: {}, ...extra });
const json = (x: unknown) => JSON.stringify(x, null, 1) + '\n';

describe('behaviour contract (real packet)', () => {
  it('findings: every check result, its severity, claims, ledger ids and first visible time', async () => {
    const rows = findings.map((f) => ({ id: f.id, severity: f.severity, claims: f.claims, ledgerIds: f.ledgerIds, firstVisibleAt: f.firstVisibleAt ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id));
    await expect(json(rows)).toMatchFileSnapshot('../contract/findings.json');
  });

  it('blockers and stage each role sees at the default story time', async () => {
    const out = Object.fromEntries((['priya', 'daniel', 'helen', 'ngozi', 'irs'] as RoleKey[]).map((r) => {
      const s = projectWorkspace(ix, [], r, findings);
      return [r, { stage: s.stage, blockers: s.blockers.map((b) => `${b.claimId} | ${b.title}`) }];
    }));
    await expect(json(out)).toMatchFileSnapshot('../contract/blockers.json');
  });

  it('the demo adjustment: California payments to 10,500 and what it moves', async () => {
    const s = projectWorkspace(ix, [ev('daniel', 'adjustment', { claimId: 'line:F540NR.72', payload: { value: 10500, status: 'applied', reason: 'D68' } })], 'helen', findings);
    const moved = Object.values(s.claims).filter((c) => c.adjusted || c.derived || c.needsEngine)
      .map((c) => ({ claim: c.claimId, current: c.current, adjusted: c.adjusted, derived: !!c.derived, needsEngine: !!c.needsEngine }))
      .sort((a, b) => a.claim.localeCompare(b.claim));
    await expect(json({ blockers: s.blockers.map((b) => b.claimId), moved })).toMatchFileSnapshot('../contract/demo-adjustment.json');
  });

  it('proofs on every line (Checked by Taxmark)', async () => {
    const out = ix.latest.lines.map((l) => ({ line: l.key, proofs: proofsFor(ix, l.key).map((p) => `${p.method}: ${p.text}`) })).filter((x) => x.proofs.length);
    await expect(json(out)).toMatchFileSnapshot('../contract/proofs.json');
  });

  it('the AI layer: which suggestions are shown and which are held back, with reasons', async () => {
    const r = aiReview(ix, path.join(process.cwd(), 'ai/eval/ai-suggestions.json'));
    const out = { present: r.present, shown: r.findings.map((f) => `${f.id} | ${f.claims.join(',')}`).sort(), held: r.held.map((h) => `${h.id} | ${h.reasons.join('; ')}`).sort() };
    await expect(json(out)).toMatchFileSnapshot('../contract/ai.json');
  });

  it('where every document landed, or why not', async () => {
    const out = documentLanding(ix, AT).map((d) => `${d.docId} | ${d.status} | ${d.reason?.code ?? ''} | ${d.landedLines.length} lines`);
    await expect(json(out)).toMatchFileSnapshot('../contract/documents.json');
  });
});
