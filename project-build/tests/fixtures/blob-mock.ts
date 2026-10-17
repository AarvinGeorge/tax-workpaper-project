// An in-memory stand-in for @vercel/blob 2.8.0's get and put (private access), for vi.mock. No network.
// Kept on globalThis so a test that resets modules still sees the same store.
type Call = { op: 'get' | 'put'; pathname: string; options: Record<string, unknown> };
const g = globalThis as unknown as { __blobMock?: { blobs: Map<string, Buffer>; calls: Call[] } };
g.__blobMock ??= { blobs: new Map(), calls: [] };
export const blobs = g.__blobMock.blobs;
export const calls = g.__blobMock.calls;

export const blobMock = {
  async get(pathname: string, options: Record<string, unknown>) {
    calls.push({ op: 'get', pathname, options });
    const b = blobs.get(pathname);
    if (!b) return null;
    return { statusCode: 200, stream: new Response(new Uint8Array(b)).body, headers: new Headers(), blob: { pathname, size: b.length } };
  },
  async put(pathname: string, body: Buffer, options: Record<string, unknown>) {
    calls.push({ op: 'put', pathname, options });
    if (blobs.has(pathname) && !options.allowOverwrite) throw new Error('This blob already exists');
    blobs.set(pathname, Buffer.from(body));
    return { pathname, url: `https://example.private.blob/${pathname}` };
  },
};

export function resetBlobs() { blobs.clear(); calls.length = 0; }
