// One active AI producer: which pipeline makes the live AI payload, its file and its prompt version. File mode, the
// deploy-time ingest, the CI eval gate, the harness and the behaviour contract all read it, so they cannot disagree.
// Since 24 Oct 2026 (Aarvin) it is the agent; the reader route stays but may not replace the agent's payload.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ACTIVE_PAYLOAD_FILE, ACTIVE_PRODUCER, ACTIVE_PROMPT_VERSION, PRODUCERS } from '../../ai/lib/producer';
import { PROMPT_VERSION } from '../../ai/lib/reader-core';
import { AGENT_PROMPT_VERSION, AGENT_V4_PROMPT_VERSION } from '../../ai/lib/agent-core';
import { aiPayloadPath } from '@/domain/ai/load';

const code = (f: string) => readFileSync(f, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
let saved: string | undefined;
beforeEach(() => { saved = process.env.AI_PAYLOAD_PATH; delete process.env.AI_PAYLOAD_PATH; });
afterEach(() => { if (saved === undefined) delete process.env.AI_PAYLOAD_PATH; else process.env.AI_PAYLOAD_PATH = saved; });

describe('active producer', () => {
  it('is the agent, at the agent-v4 independent (blind) prompt version, with its own payload file', () => {
    expect(ACTIVE_PRODUCER).toBe('agent');
    expect(ACTIVE_PROMPT_VERSION).toBe(`${AGENT_V4_PROMPT_VERSION}-blind`);
    expect(ACTIVE_PROMPT_VERSION).not.toBe(AGENT_PROMPT_VERSION); // agent-v3 stays as a constant, for history
    expect(ACTIVE_PAYLOAD_FILE).toBe('ai/eval/agent-suggestions.json');
    expect(PRODUCERS.reader).toMatchObject({ promptVersion: PROMPT_VERSION, payloadFile: 'ai/eval/ai-suggestions.json' });
  });

  it('the active version is the committed payload\'s own promptVersion (24/25 Oct: agent-v4 independent went live)', () => {
    const payload = JSON.parse(readFileSync(ACTIVE_PAYLOAD_FILE, 'utf8'));
    expect(ACTIVE_PROMPT_VERSION).toBe(payload.promptVersion);
    expect(payload.promptVersion).toBe('agent-v4-blind');
  });

  it('file mode reads the active producer\'s file (AI_PAYLOAD_PATH still overrides)', () => {
    expect(aiPayloadPath()).toBe(path.join(process.cwd(), ACTIVE_PAYLOAD_FILE));
    process.env.AI_PAYLOAD_PATH = '/tmp/x.json';
    expect(aiPayloadPath()).toBe('/tmp/x.json');
  });

  it('the ingest, the eval gate, the harness and the contract read the producer, not a hard-coded file', () => {
    expect(code('scripts/ingest.ts')).toMatch(/ACTIVE_PAYLOAD_FILE/);
    expect(code('scripts/ingest.ts')).not.toMatch(/'ai-suggestions\.json'/);
    expect(code('ai/harness.ts')).toMatch(/evalGate\(.*ACTIVE_PROMPT_VERSION/);
    expect(code('ai/harness.ts')).toMatch(/ACTIVE_PAYLOAD_FILE/);
    expect(code('tests/unit/behaviour-contract.test.ts')).toMatch(/ACTIVE_PAYLOAD_FILE/);
  });

  it('the producer module is light: no SDK or agent loop is pulled into the app through it', () => {
    expect(code('ai/lib/producer.ts')).not.toMatch(/agent-core|reader-core|@anthropic-ai/);
  });
});
