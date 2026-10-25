// Who produced the AI findings: "AI agent" for an agent payload (promptVersion agent-...), "AI reader" otherwise. The
// screens name the source from the payload instead of hard-coding the reader.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import type { AiPayload } from '@/domain/ai/contract';
import { aiFindings, aiSourceLabel, activeAiSourceLabel } from '@/domain/ai/merge';
import { verifySuggestions } from '@/domain/ai/verify';
import { AI_AGENT, AI_READER, aiFlaggedText, aiSuggestionTerm, aiUseText } from '@/components/info/aiUse';
import { TERMS } from '@/components/term/terms';

const ix = indexPacket(loadPacket());
const reader = JSON.parse(readFileSync(path.join(process.cwd(), 'ai/eval/ai-suggestions.json'), 'utf8')) as AiPayload;

describe('AI source tag', () => {
  it('names the agent for agent payloads and the reader otherwise', () => {
    expect(aiSourceLabel('agent-v3')).toBe('AI agent');
    expect(aiSourceLabel('agent-v3-blind')).toBe('AI agent');
    expect(aiSourceLabel('reader-v2')).toBe('AI reader');
    expect(aiSourceLabel(null)).toBe('AI reader');
  });

  it('with no payload meta (refused or absent) the label is the active producer, the agent, not the reader', () => {
    expect(activeAiSourceLabel(null)).toBe('AI agent');
    expect(activeAiSourceLabel(undefined)).toBe('AI agent');
    expect(activeAiSourceLabel('reader-v2')).toBe('AI reader');
    expect(activeAiSourceLabel('agent-v3')).toBe('AI agent');
    for (const f of ['src/components/work/Checks.tsx', 'src/components/info/Info.tsx']) {
      expect(readFileSync(f, 'utf8'), f).toMatch(/activeAiSourceLabel/);
    }
  });

  it('findings carry the source as their check name', () => {
    const asAgent = { ...reader, promptVersion: 'agent-v3' };
    expect(aiFindings(ix, asAgent, verifySuggestions(ix, asAgent))[0].checkId).toBe('AI agent');
    expect(aiFindings(ix, reader, verifySuggestions(ix, reader))[0].checkId).toBe('AI reader');
  });

  it('says how the AI works once per source: the agent investigated the whole packet, the reader read each document', () => {
    expect(aiUseText('AI agent')).toBe(AI_AGENT);
    expect(AI_AGENT).toMatch(/AI agent investigated the whole packet with the app.s own tools/);
    expect(AI_AGENT).not.toMatch(/read the text of each document|AI reader/);
    expect(AI_AGENT).toMatch(/final computed version/);
    expect(AI_AGENT).toMatch(/a person accepts or dismisses each one/);
    expect(aiUseText('AI reader')).toBe(AI_READER);
    expect(AI_READER).toMatch(/AI reader read the text of each document/);
  });

  it('the Legends pill and the glossary term name the source', () => {
    expect(aiFlaggedText('AI agent')).toMatch(/^the AI agent flagged this item/);
    expect(aiFlaggedText('AI reader')).toMatch(/^the AI reader flagged this item/);
    expect(aiSuggestionTerm('AI agent')).toMatch(/AI agent proposed/);
    expect(aiSuggestionTerm('AI agent')).not.toMatch(/reader/);
    expect(aiSuggestionTerm('AI reader')).toMatch(/AI reader proposed/);
    // the glossary default never names a source: every site must pass its own
    expect(TERMS['ai-suggestion'].text).not.toMatch(/AI reader|AI agent/);
  });

  it('every site that shows the ai-suggestion term passes the source text', () => {
    for (const f of ['src/components/work/Checks.tsx', 'src/components/drawer/ClaimDrawer.tsx']) {
      const src = readFileSync(f, 'utf8');
      const marks = src.match(/<Term k="ai-suggestion"[^>]*>/g) ?? [];
      expect(marks.length, f).toBeGreaterThan(0);
      for (const m of marks) expect(m, f).toMatch(/text=\{aiSuggestionTerm\(/);
    }
  });

  it('Legends and the "?" dialog take the source from the payload', () => {
    const src = (f: string) => readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
    expect(src('src/components/info/Legends.tsx')).not.toMatch(/AI reader/);
    expect(src('src/components/info/Info.tsx')).not.toMatch(/AI_READER/);
    expect(src('src/components/info/Info.tsx')).toMatch(/aiSource/);
  });

  it('the Checks screen and the side panel take the source from the payload, never a hard-coded "AI reader"', () => {
    for (const f of ['src/components/work/Checks.tsx', 'src/components/drawer/ClaimDrawer.tsx']) {
      const src = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
      expect(src, f).not.toMatch(/AI reader/);
      expect(src, f).toMatch(/[aA]iSourceLabel/);
    }
  });
});
