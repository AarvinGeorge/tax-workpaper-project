// What the "?" dialog holds, in order: Demo (what this is, the packet, the roles), Legends, Deadlines, then for staff
// the firm reference (standards, people, time) and how AI was used. Clients and the examiner see Demo, Legends and the
// deadlines that are not the firm's internal ones.
import type { ReactNode } from 'react';
import type { RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { Term } from '../term/Term';
import { InfoDialog } from './InfoDialog';
import { Legends } from './Legends';
import { Deadlines, FirmStandards, People, TimeBudget } from './FirmInfo';
import { Demo } from './Demo';
import { AI_FOUND, aiUseText } from './aiUse';
import { activeAiSourceLabel } from '@/domain/ai/merge';

function Sec({ id, title, open, children }: { id: string; title: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="info-sec" open={open}>
      <summary><h3 id={id}>{title}</h3></summary>
      <div className="info-body">{children}</div>
    </details>
  );
}

export function Info({ ix, state, role, ws, promptVersion }: { ix: PacketIndex; state: WorkspaceState; role: RoleInfo; ws: string; promptVersion?: string | null }) {
  const aiSource = activeAiSourceLabel(promptVersion);
  const staff = role.kind === 'staff';
  const p = { ix, state, role, ws };
  return (
    <InfoDialog>
      <Sec id="info-demo" title="Demo" open><Demo {...p} /></Sec>
      <Sec id="info-legends" title="Legends"><Legends checks={staff} aiSource={aiSource} /></Sec>
      <Sec id="firm-dl" title="Deadlines on the story clock"><Deadlines {...p} /></Sec>
      {staff ? <>
        <Sec id="firm-std" title="Firm standards"><FirmStandards {...p} /></Sec>
        <Sec id="firm-staff" title={<>People and clearance<Term k="sensitive-data-clearance" /></>}><People {...p} /></Sec>
        <Sec id="firm-time" title="Time against budget"><TimeBudget {...p} /></Sec>
        <Sec id="info-ai" title="How AI was used"><p style={{ margin: 0 }}>{AI_FOUND}</p><p style={{ margin: '8px 0 0' }}>{aiUseText(aiSource)}</p></Sec>
      </> : null}
    </InfoDialog>
  );
}
