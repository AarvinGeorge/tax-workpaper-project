// GET (Vercel Cron, daily) and POST (manual run): the AI reader in the cloud. Auth: Authorization: Bearer <CRON_SECRET>.
// See src/server/ai-reader.ts.
import { handleAiReader } from '@/server/ai-reader';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  return handleAiReader(req);
}

export async function POST(req: Request) {
  return handleAiReader(req);
}
