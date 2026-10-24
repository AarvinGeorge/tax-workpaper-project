// Explains every item of the firm's gated steps through the API (src/domain/steps.ts), so a test that approves the
// return turns only on what it sets up itself, as clearing every finding blocker does.
import type { APIRequestContext } from '@playwright/test';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { indexAt } from '@/domain/clock';
import { firmSteps } from '@/domain/steps';

export async function explainFirmSteps(rq: APIRequestContext, w: string, role = 'daniel'): Promise<number> {
  const st = await (await rq.get(`/api/w/${w}/state?role=${role}`)).json() as { state: { storyAt: string } };
  const ix = indexPacket(loadPacket());
  let n = 0;
  for (const s of firmSteps(indexAt(ix, st.state.storyAt), [])) {
    for (const i of s.items) {
      const r = await rq.post(`/api/w/${w}/events`, { data: { role, type: 'verification', claimId: i.claimId, payload: { method: 'agreed_to_source_document', note: 'Explained for this test.', step: s.step } } });
      if (!r.ok()) throw new Error(`explaining ${i.claimId} refused: ${await r.text()}`);
      n++;
    }
  }
  return n;
}
