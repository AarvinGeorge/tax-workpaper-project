// The "?" dialog's Demo section, first for every role (it was the overview's Start here card): what Taxmark is, the
// packet in five counts, one thing to try, every role to open, and how this workspace saves.
import Link from 'next/link';
import type { RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { roles } from '@/domain/policy';
import { fmtDay, roleLabel, screenPath } from '../shell/lib';
import { Term } from '../term/Term';

export function Demo({ ix, state, ws }: { ix: PacketIndex; state: WorkspaceState; role: RoleInfo; ws: string }) {
  const c = ix.counts;
  const all = roles(ix);
  return (
    <div className="start" data-testid="demo" style={{ border: 0, padding: 0, background: 'none' }}>
      <p>Taxmark is a web-native workpaper for one household&apos;s {String(ix.packet.household.tax_year ?? '')} return: click any number to see the page and field it came from, the rule that built it, who checked it and what is still open.</p>
      <div className="counts num" data-testid="counts">
        <span><strong>{c.documents.toLocaleString('en-US')}</strong> documents</span>
        <span><strong>{c.values.toLocaleString('en-US')}</strong> values read from them</span>
        <span><strong>{c.versions}</strong> computed versions</span>
        <span><strong>{c.lines.toLocaleString('en-US')}</strong> lines on {ix.latest.version}</span>
        <span><strong>{c.timeline}</strong> events in the timeline</span>
      </div>
      <p>Try: open <Link href={screenPath(ws, 'daniel', 'checks')}>Checks as Daniel</Link>, click California estimates, then switch role in “Viewing as” to see what each person may see and do.</p>
      <div>
        <span className="lbl">The roles · {all.length}</span>
        <div className="rolelist">
          {all.map((r) => (
            <Link key={r.key} href={screenPath(ws, r.key, r.screens[0])}>
              <span className="t" style={{ fontWeight: 600 }}>{roleLabel(r)}</span>
              <span className="small muted">{r.kind === 'client' ? ' · client view' : r.kind === 'examiner' ? ' · read only, items under examination' : r.clearance ? '' : ' · no sensitive-data clearance'}{r.activeFrom && r.activeFrom > state.storyAt ? ` · joins ${fmtDay(r.activeFrom)}` : ''}</span>
            </Link>
          ))}
        </div>
      </div>
      <p className="small muted">Every action is saved as an event in this workspace<Term k="workspace" /> (/w/{ws}); open the root link again for a clean copy. Anything not in the packet is tagged <span className="ex">Example</span><Term k="example-tag" />.</p>
    </div>
  );
}
