// Fix round F1 (app review 1): pure helpers behind the screen fixes. Each test was written failing first.
import { describe, expect, it } from 'vitest';
import { loadPacket, indexPacket } from '@/domain/packet/load';
import { humanize } from '@/domain/labels';
import { refText, resolveRef } from '@/domain/refs';
import { runChecks } from '@/domain/checks';
import { notYetText } from '@/components/shell/lib';
import { revealReason } from '@/components/drawer/lib';
import { cmpCells, differLine } from '@/domain/versions';

const p = loadPacket();
const ix = indexPacket(p);

describe('F1 item 7: "Not yet in the story" compares instants and shows the time', () => {
  it('says nothing once the role is active', () => {
    expect(notYetText('Priya', '2027-01-15T15:00:00Z', '2027-01-15T15:00:00Z')).toBeNull();
    expect(notYetText('Priya', null, '2027-01-15T09:00:00Z')).toBeNull();
  });
  it('shows both times on the same day, never two identical dates', () => {
    const t = notYetText('Priya', '2027-01-15T15:00:00Z', '2027-01-15T09:30:00Z')!;
    expect(t).toContain('15:00');
    expect(t).toContain('09:30');
  });
});

describe('F1 item 6: labels from raw keys', () => {
  it('keeps acronyms and street names readable', () => {
    expect(humanize('irs_transcript_pulled')).toBe('IRS transcript pulled');
    expect(humanize('passive_1450_fremont')).toBe('Passive 1450 Fremont');
    expect(humanize('passive_1200_barton_hills')).toBe('Passive 1200 Barton Hills');
    expect(humanize('minimum_tax_credit_from_2025_amt')).toBe('Minimum tax credit from 2025 AMT');
    expect(humanize('efile_accepted_california')).toBe('E-file accepted California');
    expect(humanize('ira_nondeductible_basis_ngozi', ['Ngozi'])).toBe('IRA nondeductible basis Ngozi');
  });
  it('quotes the firm rule once in the reveal refusal', () => {
    const rule = 'Only staff with sensitive-data clearance may reveal full identifiers.';
    expect(revealReason(rule, rule)).toBe(`Firm rule: “${rule}”`);
    expect(revealReason('Not allowed.', rule)).toBe(`Not allowed. Firm rule: “${rule}”`);
    expect(revealReason('Not allowed.', undefined)).toBe('Not allowed.');
  });
});

describe('F1 item 5: evidence reads as words, never raw JSON', () => {
  it('a household reference reads as the person and their role', () => {
    const person = p.household.people.find((x) => x.role === 'dependent')!;
    const t = refText(resolveRef(ix, `household:${person.id}`));
    expect(t).toContain(person.name);
    expect(t).not.toMatch(/[{}[\]"]/);
  });
  it('every evidence reference of every finding reads without JSON', () => {
    const findings = runChecks(ix);
    let n = 0;
    for (const f of findings) for (const r of f.evidence) { n++; expect(refText(resolveRef(ix, r)), r).not.toMatch(/[{}]|":/); }
    expect(n).toBeGreaterThan(0);
  });
});

describe('F1 item 2: compare with Finalized', () => {
  it('the latest column is the engine value, the Finalized column the adjusted value', () => {
    const line = ix.latest.lines.find((l) => typeof l.value === 'number' && l.value !== 0)!;
    const c = cmpCells(line.value, { adjusted: true, current: 123 }, 'finalized', 123);
    expect(c.latest).toBe(line.value);
    expect(c.other).toBe(123);
    expect(c.wasNote).toBe(false);
    const plain = cmpCells(line.value, { adjusted: true, current: 123 }, null, undefined);
    expect(plain.latest).toBe(123);
    expect(plain.wasNote).toBe(true);
  });
  it('agrees in number', () => {
    expect(differLine(1, 'Finalized', 'v3')).toBe('1 line differs between Finalized and v3.');
    expect(differLine(2, 'v1', 'v3')).toBe('2 lines differ between v1 and v3.');
  });
});
