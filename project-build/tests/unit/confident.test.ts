// The finding panel's "Confidence gave no warning" note: shown only when every extracted value behind a finding was
// read in the pipeline's top band.
import { describe, expect, it } from 'vitest';
import { confidentRange } from '@/components/drawer/lib';

const v = (confidence?: number) => ({ confidence });

describe('confidentRange', () => {
  it('gives the range when every value was read at 0.95 or above', () => {
    expect(confidentRange([v(0.98), v(0.99), v(0.99)])).toEqual({ lo: '0.98', hi: '0.99' });
    expect(confidentRange([v(0.99)])).toEqual({ lo: '0.99', hi: '0.99' });
  });
  it('gives nothing when any value was read below 0.95', () => {
    expect(confidentRange([v(0.99), v(0.6)])).toBeNull();
    expect(confidentRange([v(0.94)])).toBeNull();
  });
  it('gives nothing when no ref carries a read confidence', () => {
    expect(confidentRange([])).toBeNull();
    expect(confidentRange([v(undefined), v(undefined)])).toBeNull();
  });
  it('ignores refs without a confidence (documents, lines) when values are present', () => {
    expect(confidentRange([v(undefined), v(0.97)])).toEqual({ lo: '0.97', hi: '0.97' });
  });
});
