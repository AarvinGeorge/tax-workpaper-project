import { redirect } from 'next/navigation';
import type { PageArgs } from '@/components/work/WorkPage';

export const dynamic = 'force-dynamic';

// Firm is retired: its reference sits behind the "?" button, which ?info=1 opens.
export default async function Page({ params }: PageArgs) {
  const { ws, role } = await params;
  redirect(`/w/${encodeURIComponent(ws)}/${encodeURIComponent(role)}?info=1`);
}
