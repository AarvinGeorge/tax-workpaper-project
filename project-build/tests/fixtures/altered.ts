// Altered packet for every lane's tests: built in memory from the real packet, never written to disk.
// Three alterations, each a way the real packet could differ next season:
//   1. every person is renamed (household, staff, client users) everywhere their full name appears;
//   2. one form's lines are removed from every return version (with the references to them);
//   3. one extra staff member is added.
// Code under test must compute from the data, so it keeps working (and changes its output) on this copy.
import { loadPacket } from '@/domain/packet/load';
import type { Packet, Staff } from '@/domain/packet/types';

/** The form whose lines are removed. Tests may name ids; domain code may not. */
export const REMOVED_FORM = 'F2441';

/** The extra staff member added to firm.staff. */
export const EXTRA_STAFF: Staff = {
  id: 'st-99', name: 'Example Extra Reviewer', role: 'reviewer', credential: 'CPA',
  sensitive_data_clearance: false, active_from: null, note: 'Example: added by the altered test fixture.',
};

/** Real full name -> altered name, built from the packet (not hard-coded), in the order applied. */
export function renameMap(p: Packet = loadPacket()): [string, string][] {
  const names = new Set<string>();
  for (const x of p.household.people) names.add(x.name);
  for (const x of p.firm.staff) names.add(x.name);
  for (const x of p.firm.client_users) names.add(x.name);
  // Longest first, so 'A B-C' is replaced before 'C' could match inside it.
  return [...names].sort((a, b) => b.length - a.length).map((n, i) => [n, `Example Person ${String(i + 1).padStart(2, '0')}`]);
}

export function alteredPacket(): Packet {
  const real = loadPacket();
  let text = JSON.stringify(real);
  for (const [from, to] of renameMap(real)) text = text.split(from).join(to);
  const p = JSON.parse(text) as Packet;

  const removed = new Set<string>();
  for (const rv of p.return_versions) {
    for (const l of rv.lines) if (l.form === REMOVED_FORM) removed.add(l.key);
  }
  for (const rv of p.return_versions) {
    rv.lines = rv.lines.filter((l) => !removed.has(l.key));
    for (const l of rv.lines) l.inputs = (l.inputs || []).filter((k) => !removed.has(k));
    rv.changes_from_previous = rv.changes_from_previous.filter((c) => !removed.has(c.key));
  }
  for (const a of p.what_if.alternatives) {
    const cl = a.changed_lines as { key: string }[] | undefined;
    if (Array.isArray(cl)) a.changed_lines = cl.filter((c) => !removed.has(c.key));
  }

  p.firm.staff.push({ ...EXTRA_STAFF });
  return p;
}
