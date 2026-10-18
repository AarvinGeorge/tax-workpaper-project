import { redirect } from 'next/navigation';
import type { PageArgs } from '@/components/work/WorkPage';

export const dynamic = 'force-dynamic';

// Changes is a tab of Review now; the filter (?kind=) and an open claim (?claim=) carry over.
export default async function Page({ params, searchParams }: PageArgs) {
  const { ws, role } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams({ tab: 'log' });
  for (const k of ['kind', 'claim']) { const v = sp[k]; const one = Array.isArray(v) ? v[0] : v; if (one) q.set(k, one); }
  redirect(`/w/${encodeURIComponent(ws)}/${encodeURIComponent(role)}/review?${q.toString()}`);
}
