// The prompt versions of the two AI producers, in a module with no dependencies, so the app can name the active
// producer (producer.ts) without pulling the reader's or the agent's code into its bundle. Change a version whenever
// that producer's prompt changes (the CI eval gate then asks for a new committed payload).
export const READER_PROMPT_VERSION = 'reader-v2';
export const AGENT_PROMPT_VERSION = 'agent-v3';
/** agent-v4 (prompt-v4.ts), chosen with --prompt v4; not the active producer until Aarvin approves a switch. */
export const AGENT_V4_PROMPT_VERSION = 'agent-v4';
