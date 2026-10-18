import { FormsTab } from '@/components/overview/FormsTab';

type P = { params: Promise<{ ws: string; role: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function ReturnScreen({ params, searchParams }: P) {
  const { ws, role } = await params;
  return FormsTab({ ws, role, sp: await searchParams, screen: 'return' });
}
