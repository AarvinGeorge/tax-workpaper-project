// The prompt versions of the two AI producers, in a module with no dependencies, so the app can name the active
// producer (producer.ts) without pulling the reader's or the agent's code into its bundle. Change a version whenever
// that producer's prompt changes (the CI eval gate then asks for a new committed payload).
export const READER_PROMPT_VERSION = 'reader-v2';
export const AGENT_PROMPT_VERSION = 'agent-v3';
/** agent-v4 (prompt-v4.ts), chosen with --prompt v4. Its independent (blind) mode is the live producer since 24/25 Oct 2026. */
export const AGENT_V4_PROMPT_VERSION = 'agent-v4';
/** The live agent payload's own promptVersion: agent-v4 in independent (blind) mode (agent-core promptVersionFor). */
export const AGENT_LIVE_PROMPT_VERSION = `${AGENT_V4_PROMPT_VERSION}-blind`;
