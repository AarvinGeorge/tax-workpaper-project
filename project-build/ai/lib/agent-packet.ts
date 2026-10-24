// Where the agent's packet comes from, the same way the cloud reader gets it (src/server/ai-reader.ts):
//   vault mode (RETURN_ID, BLOB_READ_WRITE_TOKEN, DATA_ENCRYPTION_KEY all set; production): ensureReturnData() fetches the
//     sealed packet from the private Blob store, decrypts it and refuses it unless its SHA-256 equals RETURN_ID; then
//     loadPacket() returns that packet. data/packet.json and the case-study package are never read. Read only: nothing
//     is written to the Blob store (the agent's output stays the local eval file until a switch is approved).
//   file mode (none set; laptop measurement): data/packet.json, or the in-memory altered copy.
// A partial vault configuration throws PartialVaultConfigError (names only the missing variables), as the reader does.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isVaultMode } from '../../src/domain/datamode';
import { indexPacket, loadPacket, loadedPacketSha, type PacketIndex } from '../../src/domain/packet/load';
import type { Packet } from '../../src/domain/packet/types';
import { ensureReturnData } from '../../src/server/data';
import { sha256 } from './reader-core';

type Env = Record<string, string | undefined>;
export type PacketSource = 'vault' | 'file';
export interface AgentPacket { ix: PacketIndex; packetSha: string; source: PacketSource }

export async function loadAgentPacket(o: { env: Env; root: string; packet: 'real' | 'altered' }): Promise<AgentPacket> {
  if (isVaultMode(o.env)) {
    if (o.packet === 'altered') throw new Error('--packet altered is a laptop measurement: run it in file mode (no vault variables set).');
    await ensureReturnData(o.env);
    const packet = loadPacket();
    const sha = loadedPacketSha();
    if (sha !== o.env.RETURN_ID) throw new Error(`Return data failed its integrity check: SHA-256 ${sha.slice(0, 12)} does not match RETURN_ID.`);
    return { ix: indexPacket(packet), packetSha: sha, source: 'vault' };
  }
  if (o.packet === 'altered') {
    const { alteredPacket } = await import('../../tests/fixtures/altered');
    const packet = alteredPacket();
    return { ix: indexPacket(packet), packetSha: sha256(JSON.stringify(packet)), source: 'file' }; // in-memory: hash of its JSON
  }
  const bytes = readFileSync(path.join(o.root, 'data', 'packet.json'));
  return { ix: indexPacket(JSON.parse(bytes.toString('utf8')) as Packet), packetSha: sha256(bytes), source: 'file' };
}
