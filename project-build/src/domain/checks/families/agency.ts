// Family: tie-out to the agency record. Payments on the return against what the IRS transcript and the FTB account
// actually hold for the tax year.
import type { PacketIndex } from '../../packet/load';
import { type Check, type Draft, fmt, isoDay, lineClaim, num, oneToOne, taxYear } from '../util';

const FAMILY = 'Tie-out to agency record';

interface Txn { date: string; code: string; description: string; amount: unknown }

function irsEstimates(ix: PacketIndex): { total: number; ref: string; txns: Txn[] } | null {
  const recs = ix.packet.tax_agency_records as Record<string, unknown>;
  const key = Object.keys(recs).find((k) => k.startsWith('irs_account_transcript'));
  if (!key) return null;
  const snaps = recs[key] as { as_of: string; transactions: Txn[] }[];
  if (!Array.isArray(snaps) || !snaps.length) return null;
  // The earliest snapshot is the one the firm had while preparing; later snapshots repeat it.
  const i = 0;
  const y = taxYear(ix);
  const txns = snaps[i].transactions.filter((t) => t.code === '670' && /estimated/i.test(t.description)
    && isoDay(t.date) >= `${y}-01-01` && isoDay(t.date) <= `${y + 1}-01-31`);
  return { total: txns.reduce((s, t) => s + (num(t.amount) ?? 0), 0), ref: `agency:/${key}/${i}`, txns };
}

function ftbPayments(ix: PacketIndex): { total: number; ref: string; dates: string[] } | null {
  const recs = ix.packet.tax_agency_records as Record<string, unknown>;
  const ftb = recs.ftb_account as Record<string, unknown> | undefined;
  if (!ftb) return null;
  const key = `tax_year_${taxYear(ix)}_payments`;
  const list = ftb[key] as { date: string; amount: number }[] | undefined;
  if (!Array.isArray(list)) return null;
  return { total: list.reduce((s, p) => s + (num(p.amount) ?? 0), 0), ref: `agency:/ftb_account/${key}`, dates: list.map((p) => p.date) };
}

export const paymentsVsAgency: Check = {
  id: 'CHK-PAYMENTS-VS-AGENCY',
  family: FAMILY,
  run(ix) {
    const out: Draft[] = [];
    for (const line of ix.latest.lines) {
      if (!/estimated tax payments/i.test(line.label)) continue;
      const v = num(line.value);
      if (v === null) continue;
      const agency = line.jurisdiction === 'california' ? ftbPayments(ix) : irsEstimates(ix);
      if (!agency) continue;
      const delta = v - agency.total;
      if (Math.abs(delta) < 1) continue;
      const clientOnly = (line.sources || []).filter((s) => /^(qa|msg|call)-/.test(s));
      const who = line.jurisdiction === 'california' ? 'the FTB account' : 'the IRS account transcript';
      out.push({
        title: `${line.label}: ${fmt(v)} on the return, ${fmt(agency.total)} on ${who}`,
        claims: [lineClaim(line.key)],
        evidence: [...(line.sources || []), agency.ref],
        trigger: [agency.ref],
        explanation: `${line.key} claims ${fmt(v)}; ${who} credits ${fmt(agency.total)} of estimated payments to tax year ${taxYear(ix)}. `
          + (clientOnly.length ? `Part of the line rests only on a client answer (${clientOnly.join(', ')}), never reconciled to the agency. ` : '')
          + `The return ${delta > 0 ? 'overstates' : 'understates'} payments by ${fmt(Math.abs(delta))}.`,
        plain: clientOnly.length ? `Our records show ${fmt(agency.total)} of estimated payments for ${taxYear(ix)}, not ${fmt(v)}. We will use the agency's figure unless you have a receipt.` : undefined,
        effect: oneToOne(line.jurisdiction, delta),
      });
    }
    return out;
  },
};

export const agencyChecks: Check[] = [paymentsVsAgency];
