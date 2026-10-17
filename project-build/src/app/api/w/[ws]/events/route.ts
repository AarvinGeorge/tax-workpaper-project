import { NextResponse } from 'next/server';
import { postEvent, isWorkspaceId } from '@/server/state';
import { isRoleKey } from '@/domain/policy';

export const dynamic = 'force-dynamic';

/** POST /api/w/:ws/events?role=<key>   body: { type, claimId?, payload, baseVersion?, groupId?, retracts? }
 *  (role may also be given in the body as `role`; the path's workspace and the server's clock are always used). */
export async function POST(req: Request, ctx: { params: Promise<{ ws: string }> }) {
  const { ws } = await ctx.params;
  if (!isWorkspaceId(ws)) return NextResponse.json({ ok: false, reason: 'Invalid workspace id.' }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Body must be JSON.' }, { status: 400 });
  }
  const role = new URL(req.url).searchParams.get('role') ?? (body as { role?: unknown } | null)?.role;
  if (!isRoleKey(role)) return NextResponse.json({ ok: false, reason: 'Unknown role.' }, { status: 400 });
  const r = await postEvent(ws, role, body);
  if (!r.ok) return NextResponse.json(r, { status: r.status });
  return NextResponse.json({ ok: true, seq: r.event.seq, event: r.event });
}
