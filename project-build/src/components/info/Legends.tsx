// Every status tag the app uses, each with its one-line meaning and term link. The Forms tab's status key moved here,
// and the Checks pill key is repeated here in full for staff (only staff have Checks), so the dialog answers what any pill means.
import type { ReactNode } from 'react';
import { Term } from '../term/Term';
import { aiFlaggedText, aiSuggestionTerm, type AiUseSource } from './aiUse';

const TAGS: { tag: string; tone: string; text: string; term?: string }[] = [
  { tag: 'Blocking', tone: 't-blk', text: 'stops filing', term: 'blocker' },
  { tag: 'Check failed', tone: 't-wrn', text: 'our check disagrees' },
  { tag: 'Judgment', tone: 't-wrn', text: 'needs a recorded decision', term: 'judgment' },
  { tag: 'Engine warning', tone: 't-wrn', text: 'from the engine only', term: 'engine-diagnostics' },
  { tag: 'Note', tone: 't-mut', text: 'a finding for information; nothing to act on' },
  { tag: 'No open checks', tone: 't-pas', text: 'nothing open on this line' },
  { tag: 'Adjusted', tone: 't-acc', text: 'changed in this workspace', term: 'adjustment' },
  { tag: 'Proposed', tone: 't-wrn', text: 'an adjustment waiting for a reviewer to apply it' },
  { tag: 'Swing', tone: 't-wrn', text: 'moved past the firm’s variance rule from last year', term: 'swing' },
  { tag: 'New this year', tone: 't-acc', text: 'no amount last year' },
  { tag: 'Signed', tone: 't-pas', text: 'a sign-off covers this value', term: 'sign-off' },
  { tag: 'Stale', tone: 't-wrn', text: 'the value changed after it was signed', term: 'stale-signoff' },
  { tag: 'As filed, locked', tone: 't-acc', text: 'accepted by the agency; later work attaches on top', term: 'as-filed-locked' },
];

// The pills on a Checks item, in the order the item stacks them.
const PILLS: { key: string; tag: ReactNode; tone: string; text: string; term?: string }[] = [
  { key: 'Blocker', tag: 'Blocker', tone: 't-blk', text: 'an open item that stops partner approval: a problem our check found, or a line waiting for the engine to re-run', term: 'blocker' },
  { key: 'Open', tag: 'Open', tone: 't-mut', text: 'a blocker still open when the return was signed or filed' },
  { key: 'Check', tag: 'Check', tone: 't-wrn', text: 'our check disagrees; it does not stop approval' },
  { key: 'Judgment', tag: 'Judgment', tone: 't-acc', text: 'our check needs a recorded decision', term: 'judgment' },
  { key: 'Info', tag: 'Info', tone: 't-mut', text: 'our check notes it; nothing to act on' },
  { key: 'AI', tag: <><span aria-hidden="true">✦ </span>AI</>, tone: 't-mut', text: '', term: 'ai-suggestion' },
  { key: 'Needs review', tag: 'Needs review', tone: 't-wrn', text: 'an AI suggestion no one has decided yet (Accepted once someone has)' },
  { key: 'Engine warning', tag: 'Engine warning', tone: 't-wrn', text: 'the engine’s own warning names this item, quoted as it wrote it; not one of our checks', term: 'engine-diagnostics' },
  { key: 'Confident mistake', tag: 'Confident mistake', tone: 't-mut', text: 'flagged by our checks, though every value behind it was read at 0.95 or above. The checks were built from the mistakes our external investigation found.', term: 'read-confidence' },
  { key: 'Cleared', tag: 'Cleared', tone: 't-pas', text: 'closed with a reason, or by an adjustment (Adjusted)' },
  { key: 'Signed off', tag: 'Signed off', tone: 't-pas', text: 'a sign-off covers this finding', term: 'sign-off' },
];

export function Legends({ checks, aiSource }: { checks: boolean; aiSource: AiUseSource }) {
  return (
    <>
      <ul className="legend" aria-label="Status tags">
        {TAGS.map((t) => (
          <li key={t.tag}><span className={`tag ${t.tone}`}>{t.tag}</span><span>{t.text}{t.term ? <Term k={t.term} /> : null}</span></li>
        ))}
        <li><span><span className="ex">Example</span></span><span>not in the packet: an illustration<Term k="example-tag" /></span></li>
      </ul>
      {checks ? <>
        <h4 className="legend-cap" id="legend-checks">Pills on Checks</h4>
        <ul className="legend" aria-labelledby="legend-checks">
          {PILLS.map((t) => (
            <li key={t.key}><span className={`tag ${t.tone}`}>{t.tag}</span><span>{t.key === 'AI' ? aiFlaggedText(aiSource) : t.text}{t.term ? <Term k={t.term} text={t.key === 'AI' ? aiSuggestionTerm(aiSource) : undefined} /> : null}</span></li>
          ))}
        </ul>
      </> : null}
    </>
  );
}
