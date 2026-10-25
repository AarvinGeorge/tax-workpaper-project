// How AI was used, in the app's own words (the brief asks the hand-in to say it): shown on Checks' AI group and in the
// staff "?" dialog. One source so the two never drift.
export const AI_FOUND = 'The mistakes our checks catch were found during an AI-assisted review of the packet and are now caught by deterministic checks.';
export const AI_READER = 'An AI reader read the text of each document in the packet, identifiers masked, and suggested issues with quotes. Its suggestions appear only on the final computed version, after each quote is found on its page, and a person accepts or dismisses each one.';
export const AI_AGENT = 'An AI agent investigated the whole packet with the app’s own tools, identifiers masked, and suggested issues with quotes. Its suggestions appear only on the final computed version, after each quote is found on its page, and a person accepts or dismisses each one.';
export type AiUseSource = 'AI agent' | 'AI reader';
/** How the suggestions on screen were produced, per source (aiSourceLabel: "AI agent" or "AI reader"). */
export const aiUseText = (source: AiUseSource) => (source === 'AI agent' ? AI_AGENT : AI_READER);
/** The Legends pill text for the AI mark. */
export const aiFlaggedText = (source: AiUseSource) => `the ${source} flagged this item; a person accepts or dismisses each suggestion`;
/** The glossary entry for "AI suggestion"; with no source (the dictionary default) it names none. */
export const aiSuggestionTerm = (source?: AiUseSource) => `An issue ${source ? `an ${source}` : 'the AI'} proposed from the packet’s text, shown only after each quote was found on its page. Staff accept or dismiss it; it never blocks filing.`;
