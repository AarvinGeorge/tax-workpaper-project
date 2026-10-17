// Lane R: the AI reader. No network: every API call goes to an injected fake fetch.
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import { AI_AUTHORITIES } from '@/domain/ai/contract';
import { supersession } from '@/domain/ai/verify';
import {
  OUTPUT_SCHEMA, PROMPT_VERSION, SYSTEM_PROMPT, buildRequest, documentContext, personNames, callApi, costUsd, parseResponse, runReader, validateRow, type FetchLike,
} from '../../ai/lib/reader-core';

const ix = indexPacket(loadPacket());
const KEY = 'sk-test-not-a-real-key';
const docWithPages = ix.packet.documents.find((d) => d.pages.length && d.pages[0].printed_content.length > 40)!;
const quote = docWithPages.pages[0].printed_content.split('\n').find((l) => l.trim().length > 10)!.trim();
const goodRow = () => ({
  kind: 'document_not_reflected', otherKind: null, claims: [ix.latest.lines[0].key, 'NOT.A.LINE'],
  evidence: [{ doc: docWithPages.id, page: docWithPages.pages[0].page, quote }],
  rationale: 'The page says something the return does not reflect.', authority: null, confidence: 0.6,
});

const okResponse = (rows: unknown[], usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 1000 }) => ({
  status: 200, headers: { get: () => null },
  json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ suggestions: rows }) }], usage }),
  text: async () => '',
});

describe('AI reader: request building and privacy', () => {
  it('no request body for any document contains an SSN-shaped string or a real SSN in any form', () => {
    const raw = JSON.stringify(ix.packet);
    const real = [...new Set(raw.match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? [])];
    expect(real.length).toBeGreaterThan(0); // the measurement can find something
    for (const d of ix.packet.documents) {
      const body = JSON.stringify(buildRequest(ix, d.id, 'claude-sonnet-5-5', KEY).body);
      expect(body, d.id).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
      for (const s of real) {
        expect(body.includes(s), d.id).toBe(false);
        expect(body.includes(s.replace(/-/g, '')), d.id).toBe(false);
      }
    }
  });

  it('the API key is only in the header, never the body', () => {
    const req = buildRequest(ix, docWithPages.id, 'claude-sonnet-5-5', KEY);
    expect(req.headers['x-api-key']).toBe(KEY);
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(JSON.stringify(req.body)).not.toContain(KEY);
  });

  it('asks for a json_schema output with the vetted authorities and caches the shared context', () => {
    type Body = { max_tokens: number; thinking: unknown; output_config: { format: { type: string } }; system: { text: string; cache_control?: unknown }[]; messages: { content: string }[] };
    const body = buildRequest(ix, docWithPages.id, 'claude-sonnet-5-5', KEY).body as unknown as Body;
    expect(body.max_tokens).toBe(8000);
    expect(body.thinking).toEqual({ type: 'adaptive', display: 'omitted' });
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.system[1].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.messages[0].content).toContain(quote);
    for (const a of AI_AUTHORITIES) expect(body.system[0].text).toContain(a);
  });

  it('the schema closes every object and uses no unsupported constraints', () => {
    const walk = (x: unknown): void => {
      if (!x || typeof x !== 'object') return;
      const s = x as Record<string, unknown>;
      if (s.type === 'object') expect(s.additionalProperties).toBe(false);
      for (const k of ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems']) expect(s[k]).toBeUndefined();
      Object.values(s).forEach(walk);
    };
    walk(OUTPUT_SCHEMA);
  });
});

describe('AI reader: row validation', () => {
  it('keeps a good row and drops claim keys that are not return lines', () => {
    const v = validateRow(ix, goodRow());
    expect(v.reason).toBeUndefined();
    expect(v.row!.claims).toEqual([ix.latest.lines[0].key]);
  });
  it.each([
    ['unknown kind', { kind: 'made_up' }, /unknown kind/],
    ['authority off the list', { authority: 'IRC 9999' }, /authority/],
    ['missing document', { evidence: [{ doc: 'NO-SUCH', page: 1, quote: 'x' }] }, /does not exist/],
    ['missing page', { evidence: [{ doc: docWithPages.id, page: 999, quote: 'x' }] }, /does not exist/],
    ['no evidence', { evidence: [] }, /no evidence/],
    ['long rationale', { rationale: Array(31).fill('word').join(' ') }, /30 words/],
    ['confidence out of range', { confidence: 1.5 }, /confidence/],
    ['other without label', { kind: 'other', otherKind: null }, /otherKind/],
  ])('rejects %s', (_n, patch, re) => {
    expect(validateRow(ix, { ...goodRow(), ...patch }).reason).toMatch(re);
  });
  it('reports refusals and truncation as reasons, not rows', () => {
    expect(parseResponse({ stop_reason: 'refusal', content: [] }).reason).toMatch(/refused/);
    expect(parseResponse({ stop_reason: 'max_tokens', content: [] }).reason).toMatch(/max_tokens/);
    expect(parseResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'nope' }] }).reason).toMatch(/not JSON/);
  });
});

describe('AI reader: calling and the payload', () => {
  it('retries 429 and 5xx, then succeeds', async () => {
    const statuses = [429, 529, 200]; let n = 0;
    const fake: FetchLike = async () => {
      const s = statuses[n++];
      return s === 200 ? okResponse([]) : { status: s, headers: { get: () => null }, json: async () => ({}), text: async () => 'busy' };
    };
    const res = await callApi(buildRequest(ix, docWithPages.id, 'm', KEY), fake, { sleep: async () => {} });
    expect(res.ok).toBe(true);
    expect(res.attempts).toBe(3);
  });
  it('does not retry a 400', async () => {
    let n = 0;
    const fake: FetchLike = async () => { n++; return { status: 400, headers: { get: () => null }, json: async () => ({}), text: async () => 'bad' }; };
    const res = await callApi(buildRequest(ix, docWithPages.id, 'm', KEY), fake, { sleep: async () => {} });
    expect(res.ok).toBe(false);
    expect(n).toBe(1);
  });

  it('runs one call per document up to the limit and writes the contract envelope', async () => {
    let calls = 0;
    const fake: FetchLike = async () => { calls++; return okResponse([goodRow(), { ...goodRow(), kind: 'nonsense' }]); };
    const res = await runReader({ ix, packetSha: 'abc', model: 'claude-sonnet-5-5', apiKey: KEY, fetchImpl: fake, limit: 3, now: () => new Date('2026-10-17T00:00:00Z') });
    expect(calls).toBe(3);
    const p = res.payload;
    expect(p).toMatchObject({ schemaVersion: 1, packetSha: 'abc', model: 'claude-sonnet-5-5', promptVersion: PROMPT_VERSION, runAt: '2026-10-17T00:00:00.000Z' });
    expect(p.suggestions.map((s) => s.id)).toEqual(['ai-document_not_reflected-1', 'ai-document_not_reflected-2', 'ai-document_not_reflected-3']);
    expect(p.rejected).toHaveLength(3);
    expect(res.usage.cache_read_input_tokens).toBe(3000);
    expect(res.costUsd).toBeCloseTo(costUsd(res.usage, 'claude-sonnet-5-5')!, 10);
    expect(JSON.stringify(p)).not.toContain(KEY);
  });

  it('runs the first call alone (it writes the cache), then the rest in parallel', async () => {
    let inFlight = 0; const seen: number[] = [];
    const fake: FetchLike = async () => {
      inFlight++; seen.push(inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--; return okResponse([]);
    };
    await runReader({ ix, packetSha: 'abc', model: 'm', apiKey: KEY, fetchImpl: fake, limit: 5, concurrency: 4 });
    expect(seen[0]).toBe(1);
    expect(Math.max(...seen.slice(1))).toBeGreaterThan(1);
  });

  it('records a failed call as rejected and keeps going', async () => {
    const fake: FetchLike = async () => ({ status: 401, headers: { get: () => null }, json: async () => ({}), text: async () => 'auth' });
    const res = await runReader({ ix, packetSha: 'abc', model: 'm', apiKey: KEY, fetchImpl: fake, limit: 2 });
    expect(res.failedCalls).toBe(2);
    expect(res.payload.rejected[0].reason).toMatch(/HTTP 401/);
  });

  it('refuses to run without a key', async () => {
    await expect(runReader({ ix, packetSha: 'abc', model: 'm', apiKey: '', fetchImpl: async () => okResponse([]) })).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe('AI reader v2: prompt, supersession and names', () => {
  it('is reader-v2 and asks for one sentence of at most 25 words', () => {
    expect(PROMPT_VERSION).toBe('reader-v2');
    expect(SYSTEM_PROMPT).toContain('one sentence, at most 25 words');
  });

  it('states supersession in the header of a replaced document and of its successor', () => {
    const sup = [...supersession(ix)].filter(([, to]) => !!to) as [string, string][];
    expect(sup.length).toBeGreaterThan(0); // the packet has a replaced document, so this can fire
    for (const [old, succ] of sup) {
      const t = ix.docById.get(succ)!.title;
      expect(documentContext(ix, old)).toContain(`This document was replaced by ${succ} (${t}); the return uses the successor's values. Do not raise an issue that the successor corrects.`);
      expect(documentContext(ix, succ)).toContain(`This document corrects ${old}.`);
    }
    const plain = ix.packet.documents.find((d) => !supersession(ix).has(d.id) && ![...supersession(ix).values()].includes(d.id))!;
    expect(documentContext(ix, plain.id)).not.toMatch(/replaced by|This document corrects/);
  });

  it('rejects a rationale that names a person from the household or the firm, by whole word only', () => {
    const names = personNames(ix);
    expect(names.length).toBeGreaterThan(0);
    const first = names[0];
    expect(validateRow(ix, { ...goodRow(), rationale: `${first} could join the plan, so the deduction looks wrong.` }).reason).toMatch(/names a person/);
    expect(validateRow(ix, { ...goodRow(), rationale: `The ${first.toLowerCase()}xyz line looks wrong.` }).reason).toBeUndefined();
  });
});

describe('AI reader: rejected rows carry no raw text', () => {
  it('checks names before length, so a long rationale with a name is rejected for the name', () => {
    const name = personNames(ix)[0];
    expect(validateRow(ix, { ...goodRow(), rationale: `${name} ` + Array(40).fill('w').join(' ') }).reason).toMatch(/names a person/);
  });

  it('stores rejected rows as structure only: no rationale, no quotes', async () => {
    const name = personNames(ix)[0];
    const long = { ...goodRow(), rationale: Array(40).fill('w').join(' ') };
    const named = { ...goodRow(), rationale: `Ask ${name} about it.` };
    const fake: FetchLike = async () => okResponse([long, named]);
    const res = await runReader({ ix, packetSha: 'abc', model: 'm', apiKey: KEY, fetchImpl: fake, limit: 1 });
    expect(res.payload.rejected).toHaveLength(2);
    const text = JSON.stringify(res.payload.rejected);
    expect(text).not.toContain(name);
    expect(text).not.toContain(quote);
    expect(res.payload.rejected[0].raw).toMatchObject({ kind: 'document_not_reflected', rationaleWords: 40, grounded: true,
      evidence: [{ doc: docWithPages.id, page: docWithPages.pages[0].page }] });
  });

  it('no payload file on disk has a household or staff first name in rejected[]', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    const { alteredPacket } = await import('../fixtures/altered');
    const altIx = indexPacket(alteredPacket());
    const files: [string, typeof ix][] = [
      ['ai/eval/ai-suggestions.json', ix], ['ai/eval/ai-suggestions.v1.json', ix],
      ['ai/eval/ai-suggestions.altered.json', altIx], ['ai/eval/ai-suggestions.v1.altered.json', altIx],
    ];
    let checked = 0;
    for (const [f, pix] of files) {
      if (!existsSync(f)) continue;
      checked++;
      const rejected = JSON.stringify((JSON.parse(readFileSync(f, 'utf8')) as { rejected: unknown[] }).rejected);
      for (const n of [...new Set([...personNames(ix), ...personNames(pix)])]) {
        expect(new RegExp(`(^|[^\\p{L}])${n}(?![\\p{L}])`, 'u').test(rejected), `${f} has a first name in rejected[]`).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
