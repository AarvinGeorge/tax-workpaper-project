// The CI eval gate (ai/harness.ts --check): the active producer's committed payload must keep its grounding, recall
// and prompt version against that producer's committed baseline, and must hold no SSN-shaped string. The gate's
// mechanics are tested on the reader's committed payload (stable); the active producer's payload is gated last.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexPacket, loadPacket } from '@/domain/packet/load';
import type { AiPayload } from '@/domain/ai/contract';
import { baselineFrom, evalGate, gateBaseline, MAX_HELD_BACK, MIN_STRICT_RECALL } from '../../ai/lib/harness-core';
import { ACTIVE_PAYLOAD_FILE, ACTIVE_PRODUCER, ACTIVE_PROMPT_VERSION, PRODUCERS } from '../../ai/lib/producer';

const PROMPT_VERSION = PRODUCERS.reader.promptVersion;

const ix = indexPacket(loadPacket());
const payload = JSON.parse(readFileSync(path.join(process.cwd(), PRODUCERS.reader.payloadFile), 'utf8')) as AiPayload;

const g0 = () => evalGate(ix, payload, PROMPT_VERSION);

describe('eval gate', () => {
  it('passes on the committed eval payload', () => {
    const g = evalGate(ix, payload, PROMPT_VERSION);
    expect(g.failures).toEqual([]);
    expect(g.strictFound).toBeGreaterThanOrEqual(MIN_STRICT_RECALL);
    expect(g.rawGrounding).toBe(1);
    expect(g.heldBack).toBeLessThanOrEqual(MAX_HELD_BACK);
  });

  it('fails when the verifier holds back more than the committed baseline', () => {
    expect(evalGate(ix, payload, PROMPT_VERSION, { maxHeldBack: g0().heldBack - 1 }).failures.join(' ')).toMatch(/held back/);
  });

  it('fails when a produced suggestion is not grounded (its quote is not on its page)', () => {
    const s = payload.suggestions[0];
    const bad = { ...s, id: s.id + '-x', evidence: [{ ...s.evidence[0], quote: 'This sentence is not printed on any page of the packet.' }] };
    const f = evalGate(ix, { ...payload, suggestions: [...payload.suggestions, bad] }, PROMPT_VERSION).failures.join(' ');
    expect(f).toMatch(/grounding/);
    expect(f).toMatch(/held back/);
  });

  it('fails when the prompt changed but the payload did not', () => {
    expect(evalGate(ix, payload, PROMPT_VERSION + '-changed').failures.join(' ')).toMatch(/prompt changed: re-run the eval and commit the new eval payload/);
  });

  it('fails below the recall baseline', () => {
    const fewer = { ...payload, suggestions: payload.suggestions.slice(0, 1) };
    expect(evalGate(ix, fewer, PROMPT_VERSION).failures.join(' ')).toMatch(/strict recall/);
  });

  it('fails on an SSN-shaped string anywhere in the payload', () => {
    const leak = { ...payload, rejected: [...payload.rejected, { raw: { note: '123-45-6789' }, reason: 'x' }] };
    expect(evalGate(ix, leak, PROMPT_VERSION).failures.join(' ')).toMatch(/SSN-shaped/);
  });

  it('the reader\'s baseline is its fixed one; a baseline made from a payload is what that payload reaches', () => {
    expect(gateBaseline('reader')).toMatchObject({ minStrict: MIN_STRICT_RECALL, maxHeldBack: MAX_HELD_BACK });
    const b = baselineFrom(ix, 'reader', payload);
    expect(b).toMatchObject({ producer: 'reader', promptVersion: payload.promptVersion, minStrict: g0().strictFound, maxHeldBack: g0().heldBack });
    expect(evalGate(ix, payload, PROMPT_VERSION, b).failures).toEqual([]);
  });

  it('a producer with no committed baseline fails the gate, saying how to make one', () => {
    expect(evalGate(ix, payload, PROMPT_VERSION, null).failures.join(' ')).toMatch(/no committed gate baseline.*--set-baseline/);
  });

  it('the active producer\'s committed payload passes against its committed baseline', () => {
    const active = JSON.parse(readFileSync(path.join(process.cwd(), ACTIVE_PAYLOAD_FILE), 'utf8')) as AiPayload;
    expect(evalGate(ix, active, ACTIVE_PROMPT_VERSION, gateBaseline(ACTIVE_PRODUCER)).failures).toEqual([]);
  });
});
