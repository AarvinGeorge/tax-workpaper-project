// Copies the packet as delivered into data/packet.json and refuses any copy whose bytes differ.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const PACKET_SHA256 = 'ee01f8508bd2fd9854754b82fd9c4a055bdc55e2778a132002a25381c412ad19';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', '..', 'case-study-project-package', 'okafor_lindqvist_2025_packet (1).json');
const dst = path.join(here, '..', 'data', 'packet.json');
const sha = (b) => createHash('sha256').update(b).digest('hex');
if (existsSync(src)) {
  const bytes = readFileSync(src);
  if (sha(bytes) !== PACKET_SHA256) { console.error('packet hash mismatch at source'); process.exit(1); }
  writeFileSync(dst, bytes);
}
if (!existsSync(dst) || sha(readFileSync(dst)) !== PACKET_SHA256) { console.error('data/packet.json missing or altered'); process.exit(1); }
console.log('packet ok', PACKET_SHA256.slice(0, 12));
