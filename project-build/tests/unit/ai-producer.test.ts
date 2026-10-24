// One active-producer prompt version, shared by the CI eval gate and the cloud reader's idempotency, so the two can
// never disagree about which payload is current. Today the producer is the reader (the agent is CLI-only until measured).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACTIVE_PRODUCER, ACTIVE_PROMPT_VERSION } from '../../ai/lib/producer';
import { PROMPT_VERSION } from '../../ai/lib/reader-core';
import { AGENT_PROMPT_VERSION } from '../../ai/lib/agent-core';

const code = (f: string) => readFileSync(f, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

describe('active producer', () => {
  it('is the reader today, at the reader\'s prompt version (behaviour unchanged)', () => {
    expect(ACTIVE_PRODUCER).toBe('reader');
    expect(ACTIVE_PROMPT_VERSION).toBe(PROMPT_VERSION);
    expect(ACTIVE_PROMPT_VERSION).not.toBe(AGENT_PROMPT_VERSION);
  });

  it('the eval gate and the cron idempotency both read the one constant', () => {
    expect(code('ai/harness.ts')).toMatch(/evalGate\(.*ACTIVE_PROMPT_VERSION\)/);
    expect(code('src/server/ai-reader.ts')).toMatch(/cur\.promptVersion === ACTIVE_PROMPT_VERSION/);
    expect(code('tests/unit/eval-gate.test.ts')).toMatch(/ACTIVE_PROMPT_VERSION/);
  });
});
