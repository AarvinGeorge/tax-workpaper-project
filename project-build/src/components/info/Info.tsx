// What the "?" dialog holds, in order: Legends, Deadlines, then for staff the firm reference (standards, people, time).
// Clients and the examiner see Legends and Deadlines only.
import type { ReactNode } from 'react';
import type { RoleInfo, WorkspaceState } from '@/domain/contracts';
import type { PacketIndex } from '@/domain/packet/load';
import { Term } from '../term/Term';
import { InfoDialog } from './InfoDialog';
import { Legends } from './Legends';
import { Deadlines, FirmStandards, People, TimeBudget } from './FirmInfo';

function Sec({ id, title, open, children }: { id: string; title: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="info-sec" open={open}>
      <summary><h3 id={id}>{title}</h3></summary>
      <div className="info-body">{children}</div>
    </details>
  );
}

export function Info({ ix, state, role, ws }: { ix: PacketIndex; state: WorkspaceState; role: RoleInfo; ws: string }) {
  const staff = role.kind === 'staff';
  const p = { ix, state, role, ws };
  return (
    <InfoDialog>
      <Sec id="info-legends" title="Legends" open><Legends /></Sec>
      <Sec id="firm-dl" title="Deadlines on the story clock"><Deadlines {...p} /></Sec>
      {staff ? <>
        <Sec id="firm-std" title="Firm standards"><FirmStandards {...p} /></Sec>
        <Sec id="firm-staff" title={<>People and clearance<Term k="sensitive-data-clearance" /></>}><People {...p} /></Sec>
        <Sec id="firm-time" title="Time against budget"><TimeBudget {...p} /></Sec>
      </> : null}
    </InfoDialog>
  );
}
