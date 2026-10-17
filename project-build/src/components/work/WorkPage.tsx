// One loader for every work screen: D1's React-cached getWorkspace (lane C's loadWorkspace underneath), so the shell,
// the screen and the drawer share one store read per request. Unknown workspace or role: 404.
import type { ComponentType } from 'react';
import type { ScreenKey } from '@/domain/contracts';
import { Shell } from '@/components/shell/Shell';
import { getWorkspace } from '@/components/shell/load';
import type { WorkProps } from './lib';

export type PageArgs = { params: Promise<{ ws: string; role: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function renderWork(screen: ScreenKey, Screen: ComponentType<WorkProps>, { params, searchParams }: PageArgs) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const w = await getWorkspace(ws, role);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <Shell ws={ws} role={w.role.key} screen={screen} state={w.state} roleInfo={w.role} claim={one(sp.claim)} q={one(sp.q)}>
      <Screen ws={ws} role={w.role} ix={w.ix} findings={w.findings} state={w.state} sp={sp} ai={w.ai} />
    </Shell>
  );
}
