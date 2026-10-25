// Who produced the AI findings: "AI agent" for an agent payload (promptVersion agent-...), "AI reader" otherwise. The
// screens name the source from the payload instead of hard-coding the reader.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import type { AiPayload } from '@/domain/ai/contract';
import { aiFindings, aiSourceLabel } from '@/domain/ai/merge';
import { verifySuggestions } from '@/domain/ai/verify';
import { AI_READER, aiUseText } from '@/components/info/aiUse';

const ix = indexPacket(loadPacket());
const reader = JSON.parse(readFileSync(path.join(process.cwd(), 'ai/eval/ai-suggestions.json'), 'utf8')) as AiPayload;

describe('AI source tag', () => {
  it('names the agent for agent payloads and the reader otherwise', () => {
    expect(aiSourceLabel('agent-v3')).toBe('AI agent');
    expect(aiSourceLabel('agent-v3-blind')).toBe('AI agent');
    expect(aiSourceLabel('reader-v2')).toBe('AI reader');
    expect(aiSourceLabel(null)).toBe('AI reader');
  });

  it('findings carry the source as their check name', () => {
    const asAgent = { ...reader, promptVersion: 'agent-v3' };
    expect(aiFindings(ix, asAgent, verifySuggestions(ix, asAgent))[0].checkId).toBe('AI agent');
    expect(aiFindings(ix, reader, verifySuggestions(ix, reader))[0].checkId).toBe('AI reader');
  });

  it('the how-AI-was-used text names the source and is otherwise unchanged', () => {
    expect(aiUseText('AI reader')).toBe(AI_READER);
    expect(aiUseText('AI agent')).toBe(AI_READER.replace('An AI reader', 'An AI agent'));
  });

  it('the Checks screen and the side panel take the source from the payload, never a hard-coded "AI reader"', () => {
    for (const f of ['src/components/work/Checks.tsx', 'src/components/drawer/ClaimDrawer.tsx']) {
      const src = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
      expect(src, f).not.toMatch(/AI reader/);
      expect(src, f).toMatch(/aiSourceLabel/);
    }
  });
});
