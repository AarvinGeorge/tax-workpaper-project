import { redirect } from 'next/navigation';
import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { FilingScreen } from '@/components/work/Filing';
import { getWorkspace } from '@/components/shell/load';

export const dynamic = 'force-dynamic';

// Staff Filing is retired: its essentials live on the Return overview and Review. Clients and the examiner keep theirs.
export default async function Page(args: PageArgs) {
  const { ws, role } = await args.params;
  const w = await getWorkspace(ws, role);
  if (w.role.kind === 'staff') redirect(`/w/${encodeURIComponent(ws)}/${encodeURIComponent(role)}`);
  return renderWork('filing', FilingScreen, args);
}
