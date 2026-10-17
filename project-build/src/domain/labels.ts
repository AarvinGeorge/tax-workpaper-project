// Readable labels from raw packet keys ("irs_transcript_pulled", "passive_1450_fremont"). Pure, no packet data.

const ACRONYM: Record<string, string> = {
  irs: 'IRS', ftb: 'FTB', ira: 'IRA', sep: 'SEP', amt: 'AMT', ssn: 'SSN', ein: 'EIN', itin: 'ITIN', pin: 'PIN', rsu: 'RSU',
  espp: 'ESPP', hsa: 'HSA', llc: 'LLC', nol: 'NOL', agi: 'AGI', qbi: 'QBI', mfj: 'MFJ', ero: 'ERO', fx: 'FX', us: 'US',
  ca: 'CA', k1: 'K-1', efile: 'e-file', scorp: 'S corp', id: 'ID', california: 'California',
};
const isYear = (w: string) => /^\d{4}$/.test(w) && Number(w) >= 1900 && Number(w) <= 2100;
const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);

/** A raw key as words: acronyms upper case, words after a street number capitalised, given proper names capitalised. */
export function humanize(s: string, names?: unknown): string {
  // names is ignored unless it is a list, so humanize can be passed straight to Array.map.
  const list = Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string' && n.length > 0) : [];
  const proper = new Map(list.map((n) => [n.toLowerCase(), n]));
  const words = s.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  let street = false;
  const out = words.map((w) => {
    const lw = w.toLowerCase();
    if (/^\d+$/.test(w)) { street = w.length >= 2 && !isYear(w); return w; }
    if (ACRONYM[lw]) return ACRONYM[lw];
    if (proper.has(lw)) return proper.get(lw)!;
    return street ? cap(w) : w;
  });
  const t = out.join(' ');
  return cap(t);
}
