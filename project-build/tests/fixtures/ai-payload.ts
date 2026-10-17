// A small AI payload for tests and local runs until lane R's real file lands. Built in memory from the real packet:
// the grounded quote is copied from a page's printed_content by code, never typed in. Three suggestions:
//   1. grounded, with a vetted authority (shown);
//   2. a quote that is not on its page (held back: quote not found);
//   3. a grounded quote with an authority outside the vetted list (held back: authority not vetted).
// No '@' imports, so playwright.config can load it too.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AiPayload, AiSuggestion } from '../../src/domain/ai/contract';

type Page = { page: number; printed_content: string };
type Doc = { id: string; pages: Page[] };

const packetFile = () => path.join(process.cwd(), 'data', 'packet.json');

/** First page whose printed text matches re: its doc, page and the matched text (the quote). */
function findQuote(docs: Doc[], re: RegExp): { doc: string; page: number; quote: string } {
  for (const d of docs) for (const pg of d.pages) {
    const m = re.exec(pg.printed_content);
    if (m) return { doc: d.id, page: pg.page, quote: m[0].trim() };
  }
  throw new Error(`fixture: no page matches ${re}`);
}

export const AI_FIXTURE_IDS = { grounded: 'ai-repair_vs_improvement-1', fake: 'ai-document_not_reflected-1', unvetted: 'ai-other-1' } as const;

export function aiFixture(): AiPayload {
  const bytes = readFileSync(packetFile());
  const docs = (JSON.parse(bytes.toString('utf8')) as { documents: Doc[] }).documents;
  const heat = findQuote(docs, /Installed new [^.]*heat pump[^.]*\./);
  const sweep = findQuote(docs, /Box 1 interest income [\d,.]+\d/);
  const suggestions: AiSuggestion[] = [
    {
      id: AI_FIXTURE_IDS.grounded, kind: 'repair_vs_improvement', otherKind: null, claims: ['SchE.14A'],
      evidence: [{ doc: heat.doc, page: heat.page, quote: heat.quote }],
      rationale: 'The invoice describes a whole new system replacing the old one, which reads as an improvement to depreciate rather than a repair.',
      authority: 'Treas. Reg. 1.263(a)-3: Amounts paid to improve tangible property', confidence: 0.86,
    },
    {
      id: AI_FIXTURE_IDS.fake, kind: 'document_not_reflected', otherKind: null, claims: ['SchE.14A'],
      evidence: [{ doc: heat.doc, page: heat.page, quote: 'The client confirmed this was a routine repair of the old furnace.' }],
      rationale: 'The client says the work was a routine repair.', authority: null, confidence: 0.4,
    },
    {
      id: AI_FIXTURE_IDS.unvetted, kind: 'other', otherKind: 'Interest source', claims: [],
      evidence: [{ doc: sweep.doc, page: sweep.page, quote: sweep.quote }],
      rationale: 'Sweep interest may be reported by two payers.', authority: 'Example Tax Blog (2025): Sweep accounts', confidence: 0.55,
    },
  ];
  return {
    schemaVersion: 1,
    packetSha: createHash('sha256').update(bytes).digest('hex'),
    model: 'example-model', promptVersion: 'reader-test', runAt: '2026-10-17T12:00:00Z',
    suggestions, rejected: [],
  };
}

/** Writes the fixture as JSON to file (for the app, through AI_PAYLOAD_PATH). */
export function writeAiFixture(file: string, payload: AiPayload = aiFixture()): string {
  writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}
