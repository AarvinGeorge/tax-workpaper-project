// How AI was used, in the app's own words (the brief asks the hand-in to say it): shown on Checks' AI group and in the
// staff "?" dialog. One source so the two never drift.
export const AI_FOUND = 'The mistakes our checks catch were found during an AI-assisted review of the packet and are now caught by deterministic checks.';
export const AI_READER = 'An AI reader read the text of each document in the packet, identifiers masked, and suggested issues with quotes. Its suggestions appear only on the final computed version, after each quote is found on its page, and a person accepts or dismisses each one.';
/** The same text naming who produced the suggestions on screen (aiSourceLabel: "AI agent" or "AI reader"). */
export const aiUseText = (source: 'AI agent' | 'AI reader') => AI_READER.replace('An AI reader', `An ${source}`);
