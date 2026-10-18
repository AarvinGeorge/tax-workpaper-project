import { Shell } from '@/components/shell/Shell';
import { getWorkspace } from '@/components/shell/load';
import { AreasScreen } from '@/components/work/Areas';
import { OverviewHead } from '@/components/overview/OverviewHead';
import type { PageArgs } from '@/components/work/WorkPage';

export const dynamic = 'force-dynamic';

// Areas is a tab of the Return overview for staff: the overview head replaces the screen's own header.
export default async function Page({ params, searchParams }: PageArgs) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const w = await getWorkspace(ws, role);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const head = w.role.kind === 'staff' ? <OverviewHead ws={ws} w={w} tab="areas" /> : undefined;
  return (
    <Shell ws={ws} role={w.role.key} screen="areas" state={w.state} roleInfo={w.role} claim={one(sp.claim)} q={one(sp.q)}>
      <AreasScreen head={head} ws={ws} role={w.role} ix={w.ix} findings={w.findings} state={w.state} sp={sp} ai={w.ai} />
    </Shell>
  );
}
