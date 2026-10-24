// The active producer: which pipeline makes the stored and committed eval payload, and at which prompt version. The CI
// eval gate (ai/harness.ts --check) and the cloud reader's idempotency (src/server/ai-reader.ts) both read this one
// constant, so they cannot disagree. Today it is the reader; the agent (ai/agent.ts, AGENT_PROMPT_VERSION) stays
// CLI-only until it is measured and approved. Switching producers is one change here, plus a new eval payload.
import { PROMPT_VERSION as READER_PROMPT_VERSION } from './reader-core';

export const ACTIVE_PRODUCER = 'reader' as const;
export const ACTIVE_PROMPT_VERSION: string = READER_PROMPT_VERSION;
