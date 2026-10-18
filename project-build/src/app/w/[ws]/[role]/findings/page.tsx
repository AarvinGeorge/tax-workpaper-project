import { redirect } from 'next/navigation';
import type { PageArgs } from '@/components/work/WorkPage';

export const dynamic = 'force-dynamic';

// Findings (the hand-found answer key) left the app: every mistake it listed is surfaced on Checks. An open claim carries over.
export default async function Page({ params, searchParams }: PageArgs) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const c = Array.isArray(sp.claim) ? sp.claim[0] : sp.claim;
  redirect(`/w/${encodeURIComponent(ws)}/${encodeURIComponent(role)}/checks${c ? '?claim=' + encodeURIComponent(c) : ''}`);
}
