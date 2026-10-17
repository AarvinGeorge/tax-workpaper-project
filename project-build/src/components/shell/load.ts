import { cache } from 'react';
import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/server/state';
import { isRoleKey, roles } from '@/domain/policy';
import { isWorkspaceId } from './lib';

/** One workspace load per request, shared by the shell, the screen and the drawer. Unknown ws or role: 404. */
export const getWorkspace = cache(async (ws: string, role: string) => {
  if (!isWorkspaceId(ws) || !isRoleKey(role)) notFound();
  const w = await loadWorkspace(ws, role); // other failures surface as errors, never as a silent 404
  return { ...w, allRoles: roles(w.ix) };
});

export type Workspace = Awaited<ReturnType<typeof getWorkspace>>;
