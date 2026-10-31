import { NextResponse } from 'next/server';
import { stateResponse, stateHead, isWorkspaceId } from '@/server/state';
import { isRoleKey } from '@/domain/policy';

export const dynamic = 'force-dynamic';

/** GET /api/w/:ws/state?role=<key>&after=<seq>   the role's filtered, masked projection.
 *  GET /api/w/:ws/state?role=<key>&head=1       only lastSeq and storyAt (the LiveRefresh poll). */
export async function GET(req: Request, ctx: { params: Promise<{ ws: string }> }) {
  const { ws } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const role = q.get('role');
  if (!isWorkspaceId(ws)) return NextResponse.json({ ok: false, reason: 'Invalid workspace id.' }, { status: 400 });
  if (!isRoleKey(role)) return NextResponse.json({ ok: false, reason: 'Unknown role.' }, { status: 400 });
  if (q.get('head') === '1') return NextResponse.json({ ok: true, ...(await stateHead(ws, role)) }, { headers: { 'cache-control': 'no-store' } });
  const after = Math.max(0, Number(q.get('after') ?? 0) || 0);
  return NextResponse.json({ ok: true, ...(await stateResponse(ws, role, after)) }, { headers: { 'cache-control': 'no-store' } });
}
