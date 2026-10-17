// The vault envelope: AES-256-GCM, 1 version byte | 12-byte IV | 16-byte tag | ciphertext, bound to its blob path.
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { aiBlobPath, packetBlobPath, seal, unseal, vaultKey } from '@/server/vault';

const SHA = 'ee01f8508bd2fd9854754b82fd9c4a055bdc55e2778a132002a25381c412ad19';
const key = randomBytes(32);
const plain = Buffer.from(JSON.stringify({ hello: 'packet', n: 42 }));

describe('vault envelope', () => {
  it('round-trips and has the documented layout', () => {
    const sealed = seal(plain, key, 'returns/x/packet.json.enc');
    expect(sealed[0]).toBe(1);
    expect(sealed.length).toBe(1 + 12 + 16 + plain.length);
    expect(sealed.includes(Buffer.from('packet'))).toBe(false); // ciphertext, not plaintext
    expect(unseal(sealed, key, 'returns/x/packet.json.enc').equals(plain)).toBe(true);
  });

  it('uses a fresh IV each time', () => {
    expect(seal(plain, key, 'p').subarray(1, 13).equals(seal(plain, key, 'p').subarray(1, 13))).toBe(false);
  });

  it('detects tampering: one flipped byte anywhere throws', () => {
    const sealed = seal(plain, key, 'p');
    for (const i of [0, 5, 20, sealed.length - 1]) {
      const bad = Buffer.from(sealed);
      bad[i] ^= 0x01;
      expect(() => unseal(bad, key, 'p')).toThrow();
    }
  });

  it('refuses the wrong key and a blob moved to another path', () => {
    const sealed = seal(plain, key, 'p');
    expect(() => unseal(sealed, randomBytes(32), 'p')).toThrow();
    expect(() => unseal(sealed, key, 'q')).toThrow();
  });

  it('reads DATA_ENCRYPTION_KEY as base64 of exactly 32 bytes, with a clear error otherwise', () => {
    expect(vaultKey({ DATA_ENCRYPTION_KEY: key.toString('base64') }).equals(key)).toBe(true);
    expect(() => vaultKey({})).toThrow(/DATA_ENCRYPTION_KEY/);
    expect(() => vaultKey({ DATA_ENCRYPTION_KEY: randomBytes(16).toString('base64') })).toThrow(/32 bytes/);
  });

  it('names blobs by the return hash and refuses anything else', () => {
    expect(packetBlobPath(SHA)).toBe(`returns/${SHA}/packet.json.enc`);
    expect(aiBlobPath(SHA)).toBe(`returns/${SHA}/ai-suggestions.json.enc`);
    expect(() => packetBlobPath('../etc')).toThrow();
  });
});
