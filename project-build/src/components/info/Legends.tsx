// Every status tag the app uses, each with its one-line meaning and term link. The Forms tab's status key moved here.
import { Term } from '../term/Term';

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

export function Legends() {
  return (
    <ul className="legend" aria-label="Status tags">
      {TAGS.map((t) => (
        <li key={t.tag}><span className={`tag ${t.tone}`}>{t.tag}</span><span>{t.text}{t.term ? <Term k={t.term} /> : null}</span></li>
      ))}
      <li><span><span className="ex">Example</span></span><span>not in the packet: an illustration<Term k="example-tag" /></span></li>
    </ul>
  );
}
