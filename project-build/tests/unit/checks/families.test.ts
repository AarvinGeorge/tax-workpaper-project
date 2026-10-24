// Each check on an altered copy: remove the fact that triggers it and it must go silent; change a fact so a new case
// arises and it must fire. Proves every check can produce both answers (a zero proven able to be non-zero).
import { describe, expect, it } from 'vitest';
import type { Packet } from '@/domain/packet/types';
import { altered, byCheck, doc, latestLine, run, value } from './helpers';
import { alteredPacket, REMOVED_FORM } from '../../fixtures/altered';
import { LEDGER } from '@/domain/checks/catalogue';
import { runChecks } from '@/domain/checks';
import { indexPacket } from '@/domain/packet/load';

const latest = (p: Packet) => p.return_versions[p.return_versions.length - 1];
const page = (p: Packet, d: string, n: number) => doc(p, d).pages.find((x) => x.page === n)!;

// [check id, claim it sits on in the real packet, mutation that removes the triggering fact]
const SILENCE: [string, string, (p: Packet) => void][] = [
  ['CHK-LOT-SUPPLEMENT-BASIS', 'line:F8949.B.N1', (p) => { p.extracted_values = p.extracted_values.filter((v) => v.document_id !== 'D11'); }],
  ['CHK-STATE-WAGES-RESIDENCY', 'line:SchCA540NR.1.E', (p) => { p.extracted_values = p.extracted_values.filter((v) => v.document_id !== 'D73'); }],
  ['CHK-PAYMENT-TAX-YEAR', 'line:F540NR.72', (p) => { value(p, 'ev-1076').value = '2025'; value(p, 'ev-1076').text_as_read = '2025'; }],
  ['CHK-PAYMENTS-VS-AGENCY', 'line:F1040.26', (p) => {
    for (const s of p.tax_agency_records.irs_account_transcript_2025 as { transactions: { date: string; amount: unknown }[] }[]) {
      for (const t of s.transactions) if (t.date === '2026-01-15') t.amount = 4000;
    }
  }],
  ['CHK-PAYMENTS-VS-AGENCY', 'line:F540NR.72', (p) => {
    const ftb = p.tax_agency_records.ftb_account as { tax_year_2025_payments: { date: string; amount: number }[] };
    ftb.tax_year_2025_payments.push({ date: '2025-09-15', amount: 3500 });
  }],
  ['CHK-IDENTITY-VS-DOCUMENTS', 'line:F8812.4', (p) => {
    const card = p.extracted_values.find((v) => v.document_id === 'D71' && v.value_type === 'ssn')!;
    p.household.people.find((x) => x.id === 'theo')!.ssn = String(card.value);
  }],
  ['CHK-ANSWER-GATES-DEDUCTION', 'line:Sch1.17', (p) => { p.client.questionnaire.find((q) => q.id === 'qa-25')!.answer = 'No.'; }],
  ['CHK-PRINTED-VS-READ', 'line:F2441.1b', (p) => {
    const v = value(p, 'ev-1045');
    const pg = page(p, 'D62', 1);
    pg.printed_content = pg.printed_content.replace(/Tax ID [\d-]+/, `Tax ID ${v.text_as_read}`);
  }],
  ['CHK-LABEL-VS-DOCUMENT', 'line:F2441.1a', (p) => { const l = latestLine(p, 'F2441.1a'); l.label = l.label.replace('Bright Oak Preschool', 'Bright Oak Kids Club'); }],
  ['CHK-DUP-PAYER', 'line:SchB.1.2', (p) => { const pg = page(p, 'D29', 1); pg.printed_content = pg.printed_content.replace('ending 7731', 'ending 9999'); }],
  ['CHK-FX-RATE-YEAR', 'line:SchB.1.6', (p) => {
    const l = latestLine(p, 'SchB.1.6');
    l.sources = l.sources.map((s) => s.replace('2024_average', '2025_average'));
    l.value = 1871;
  }],
  ['CHK-ANSWER-AFTER-COMPUTATION', 'line:F8949.H.C6', (p) => { p.client.messages = p.client.messages.filter((m) => m.id !== 'msg-07'); }],
  ['CHK-UNREAD-PAGE', 'doc:D31', (p) => { for (const d of p.documents) if (d.extraction.status === 'partial') { d.extraction.status = 'extracted'; d.extraction.reason = null; } }],
  ['CHK-PRIOR-OPEN-ITEM', 'doc:D07', (p) => {
    p.documents.push({ ...structuredClone(doc(p, 'D70')), id: 'D99', title: '2023 Form 3520 as filed', document_type: '3520', tax_year: 2023 });
  }],
  ['CHK-DUP-1099K-BOOKS', 'line:SchC.1', (p) => { p.extracted_values = p.extracted_values.filter((v) => v.id !== 'ev-0109'); }],
  ['CHK-DUP-PAGE', 'line:SchC.44a', (p) => { const v = p.extracted_values.find((x) => x.document_id === 'D23' && x.page === 3 && x.field === 'trip1_miles')!; v.value = 131; }],
  ['CHK-BUSINESS-SHARE-FROM-NOTES', 'line:SchC.25', (p) => { p.client.call_notes = []; }],
  ['CHK-REPAIR-VS-IMPROVEMENT', 'line:SchE.14A', (p) => { page(p, 'D47', 1).printed_content = 'Invoice dated 08/12/2025. Repaired furnace igniter and cleaned coils. Total 11,000.00.'; }],
  ['CHK-CHEAPER-ELECTION', 'line:F4562-C.12', (p) => {
    const a = p.what_if.alternatives.find((x) => x.id === 'equipment_section179')! as { california: { total_tax_change: number } };
    a.california.total_tax_change = 100;
  }],
  ['CHK-SEP-LIMIT', 'line:Sch1.16', (p) => { value(p, 'ev-0485').value = latestLine(p, 'Sch1.16').value as number; }],
  ['CHK-HOME-OFFICE-ONE-HOME', 'line:SchC.30', (p) => { p.household.addresses = (p.household.addresses as unknown[]).slice(1) as typeof p.household.addresses; }],
  ['CHK-PRIOR-YEAR-FIGURE', 'doc:D06', (p) => {
    const ly = p.prior_years.return_2024 as { line_labels: Record<string, string>; notes: Record<string, string> };
    ly.line_labels['SchC.30'] = 'Home office (simplified, 220 sq ft)';
    ly.notes['SchC.30'] = 'Simplified method, 220 sq ft.';
  }],
  ['CHK-DUP-LENDER-STATEMENT', 'line:SchA.8a', (p) => {
    page(p, 'D56', 1).printed_content = page(p, 'D56', 1).printed_content.replace(/\(Interest is reported[^)]*\)/, '');
    page(p, 'D55', 1).printed_content = page(p, 'D55', 1).printed_content.replace(/\(includes[^)]*\)/, '');
  }],
  ['CHK-PRORATION-CREDIT-UNUSED', 'line:SchA.5b', (p) => { p.extracted_values = p.extracted_values.filter((v) => v.id !== 'ev-1027'); }],
  ['CHK-CLIENT-VALUE-VS-DOCUMENT', 'line:F8283.A1.vehicle', (p) => { value(p, 'ev-1054').value = 6000; }],
  ['CHK-OTHER-STATE-CREDIT-LIMIT', 'line:ScheduleS.credit', (p) => { latestLine(p, 'ScheduleS.credit').value = 600; }],
  ['CHK-PENALTY-WITHHOLDING', 'line:F2210.19', (p) => { latestLine(p, 'Sch3.11').value = 0; }],
  ['CHK-LINE-NOT-COMPUTED', 'line:F540NR.61', (p) => { latestLine(p, 'F6251.2i').value = 0; }],
  ['CHK-INPUTS-DO-NOT-SUM', 'line:SchCA540NR.1.D', (p) => {
    for (const l of latest(p).lines) {
      if (/^SchCA540NR\.\d+\.D$/.test(l.key)) {
        const base = l.key.slice(0, -1);
        l.inputs = [base + 'A', base + 'B', base + 'C'].filter((k) => latest(p).lines.some((x) => x.key === k));
      }
    }
  }],
];

describe('each check fires on the real packet and goes silent when its fact is removed', () => {
  const real = run(structuredClone(altered(() => {})));
  for (const [checkId, claim, mutate] of SILENCE) {
    it(`${checkId} on ${claim}`, () => {
      expect(byCheck(real, checkId).some((f) => f.claims.includes(claim)), 'fires on the real packet').toBe(true);
      const after = run(altered(mutate));
      expect(byCheck(after, checkId).filter((f) => f.claims.includes(claim))).toEqual([]);
    });
  }

  it('every check in the catalogue has a silence test', () => {
    const tested = new Set(SILENCE.map((s) => s[0]));
    for (const id of LEDGER.flatMap((e) => e.checkIds)) expect(tested.has(id), id).toBe(true);
  });
});

describe('checks fire on new cases they were not written for', () => {
  it('payment tax year: a second payment designated for the prior year adds to the overstatement', () => {
    const p = altered((x) => { value(x, 'ev-1073').value = '2024'; });
    const f = byCheck(run(p), 'CHK-PAYMENT-TAX-YEAR').find((x) => x.claims.includes('line:F540NR.72'))!;
    expect(f.effect?.california).toBe(7000);
  });

  it('counted twice: a third interest line repeating the same payer and account fires too', () => {
    const p = altered((x) => {
      const l = structuredClone(latestLine(x, 'SchB.1.2'));
      l.key = 'SchB.1.9';
      latest(x).lines.push(l);
    });
    expect(byCheck(run(p), 'CHK-DUP-PAYER').some((f) => f.claims.includes('line:SchB.1.9'))).toBe(true);
  });

  it('identity: a spouse whose organizer number differs from a document fires', () => {
    const p = altered((x) => {
      const erik = x.household.people.find((y) => y.id === 'erik')!;
      erik.ssn = erik.ssn!.slice(0, -2) + erik.ssn!.slice(-1) + erik.ssn!.slice(-2, -1);
    });
    const hits = byCheck(run(p), 'CHK-IDENTITY-VS-DOCUMENTS');
    expect(hits.some((f) => f.evidence.includes('household:erik'))).toBe(true);
  });

  it('fx year: a rate from another year on any foreign line fires', () => {
    const p = altered((x) => {
      const l = latestLine(x, 'SchB.1.6');
      l.sources = ['ev-0960', 'ref:fx.SEK.2025_year_end'];
    });
    expect(byCheck(run(p), 'CHK-FX-RATE-YEAR').length).toBe(1);
    const q = altered((x) => { latestLine(x, 'SchB.1.6').sources = ['ev-0960', 'ref:fx.SEK.2025_average']; latestLine(x, 'SchB.1.6').value = 1871; });
    expect(byCheck(run(q), 'CHK-FX-RATE-YEAR').length).toBe(0);
  });

  it('late answer: a client message after the last computation about another lot fires on that lot', () => {
    const p = altered((x) => {
      value(x, 'ev-0921').value = null; value(x, 'ev-0921').text_as_read = '';
      x.client.messages.push({ id: 'msg-99', sent_at: '2026-07-02T10:00:00Z', from: 'Example', to: 'firm', text: 'The ETH lot cost about 3,290 in September 2023.' });
    });
    const hits = byCheck(run(p), 'CHK-ANSWER-AFTER-COMPUTATION');
    expect(hits.some((f) => f.evidence.includes('msg-99'))).toBe(true);
  });

  it('cheaper election: any what-if that lowers tax with no federal cost fires', () => {
    const p = altered((x) => {
      const a = x.what_if.alternatives.find((y) => y.id === 'penalty_annualized')! as { federal: { total_tax_change: number; penalty_change: number } };
      a.federal.penalty_change = -50;
    });
    expect(byCheck(run(p), 'CHK-CHEAPER-ELECTION').length).toBe(2);
  });

  it('trace: a sum line whose inputs do not add up fires', () => {
    const p = altered((x) => { latestLine(x, 'SchA.5d').value = 41291; });
    expect(byCheck(run(p), 'CHK-INPUTS-DO-NOT-SUM').some((f) => f.claims.includes('line:SchA.5d'))).toBe(true);
  });
});

// Found by the blind re-investigation (24 Oct), after hand-in: kept out of the ledger catalogue for now (Aarvin's call).
describe('a line the engine never computed', () => {
  it('blocks approval, cites its nonzero input, and carries no ledger id', () => {
    const f = byCheck(run(altered(() => {})), 'CHK-LINE-NOT-COMPUTED').find((x) => x.claims.includes('line:F540NR.61'))!;
    expect(f).toBeDefined();
    expect(f.severity).toBe('blocker');
    expect(f.ledgerIds).toEqual([]);
    expect(f.explanation).toMatch(/F6251\.2i/);
    expect(f.evidence.length).toBeGreaterThan(0);
  });

  it('fires on any line whose rule the engine does not compute, not only California AMT', () => {
    const p = altered((x) => {
      x.engine_reference.rules['R-TEST-NOT-COMPUTED'] = 'The engine does not compute this figure.';
      const l = latestLine(x, 'F1040.26');
      l.rule = 'R-TEST-NOT-COMPUTED'; l.value = 0; l.inputs = ['F6251.2i'];
    });
    expect(byCheck(run(p), 'CHK-LINE-NOT-COMPUTED').some((f) => f.claims.includes('line:F1040.26'))).toBe(true);
  });
});

describe('the shared altered fixture (renamed people, one form removed, extra staff)', () => {
  it('still surfaces every ledger finding that does not sit only on the removed form', () => {
    const p = alteredPacket();
    const ix = indexPacket(p);
    const findings = runChecks(ix);
    for (const e of LEDGER) {
      const onRemovedOnly = ['GT-A07', 'GT-A08'].includes(e.id);
      const hit = findings.some((f) => f.ledgerIds.includes(e.id));
      if (onRemovedOnly) {
        expect(findings.filter((f) => f.ledgerIds.includes(e.id)).every((f) => !f.claims.some((c) => c.startsWith(`line:${REMOVED_FORM}.`)))).toBe(true);
      } else expect(hit, e.id).toBe(true);
    }
    for (const f of findings) for (const c of f.claims) if (c.startsWith('line:')) expect(ix.line(ix.latest.version, c.slice(5)), c).toBeDefined();
  });
});
