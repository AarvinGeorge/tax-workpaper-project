// The active AI producer: which pipeline makes the live AI payload, the committed file that holds it, and its prompt
// version. File mode (src/domain/ai/load.ts), the deploy-time ingest (scripts/ingest.ts), the CI eval gate and the
// harness (ai/harness.ts), the behaviour contract and the reader route's guard all read this one setting, so they
// cannot disagree. Since 24 Oct 2026 (Aarvin) it is the agent: one AI source on live, tagged as the agent. Switching
// producers is one change here, plus that producer's committed payload and gate baseline (ai/harness.ts --set-baseline).
import { AGENT_PROMPT_VERSION, READER_PROMPT_VERSION } from './versions';

export type ProducerName = 'reader' | 'agent';
export interface Producer { promptVersion: string; payloadFile: string }
export const PRODUCERS: Record<ProducerName, Producer> = {
  reader: { promptVersion: READER_PROMPT_VERSION, payloadFile: 'ai/eval/ai-suggestions.json' },
  agent: { promptVersion: AGENT_PROMPT_VERSION, payloadFile: 'ai/eval/agent-suggestions.json' },
};

export const ACTIVE_PRODUCER: ProducerName = 'agent';
export const ACTIVE_PROMPT_VERSION: string = PRODUCERS[ACTIVE_PRODUCER].promptVersion;
/** Relative to project-build. */
export const ACTIVE_PAYLOAD_FILE: string = PRODUCERS[ACTIVE_PRODUCER].payloadFile;
