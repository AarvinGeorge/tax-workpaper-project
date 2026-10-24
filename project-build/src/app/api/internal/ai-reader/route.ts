// GET and POST (manual runs; the nightly schedule was removed on 24 Oct 2026, as the demo packet never changes): the AI reader in the cloud. Auth: Authorization: Bearer <CRON_SECRET>.
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
