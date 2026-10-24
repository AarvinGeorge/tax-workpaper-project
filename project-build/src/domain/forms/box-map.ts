// Information returns and the return line each box must reach: general IRS form semantics (what the IRS matching
// program compares), kept as data. Field names are the packet schema's box names (README); fixed targets are IRS form
// line codes. A target missing from a return is skipped, never an error. No packet ids or names here.

/** How the box total (summed over distinct forms for the year) compares with the line. */
export type BoxMode =
  | 'equal'      // the line equals the boxes added
  | 'at_least'   // the line is at least the boxes added (gross receipts include payments no form reports)
  | 'at_most'    // the line may not exceed the box (a car the charity sold: the deduction is limited to its proceeds)
  | 'net'        // the line equals the box minus another box of the same form (1098-T: tuition less scholarships)
  | 'converted'; // a foreign amount: the line equals it at the tax year's average exchange rate

export interface BoxEntry {
  form: string;             // document_type
  box: string | RegExp;     // field; a RegExp's first group, when 'converted', is the currency code
  minus?: string;           // 'net': the box subtracted
  /** A fixed return line, or the line on that form that cites the document (per-payer lines). */
  line: string | { form: string };
  mode: BoxMode;
}

export const BOX_MAP: BoxEntry[] = [
  { form: 'W-2', box: 'box1', line: 'F1040.1a', mode: 'equal' },
  { form: 'W-2', box: 'box2', line: 'F1040.25a', mode: 'equal' },
  { form: 'W-2', box: 'box17', line: 'F540NR.71', mode: 'equal' },
  { form: 'W-2', box: 'box10', line: 'F2441.12', mode: 'equal' },
  { form: 'W-2', box: 'box12_W', line: 'F8889.9', mode: 'equal' },
  { form: '1099-INT', box: 'box1', line: { form: 'SchB' }, mode: 'equal' },
  { form: '1099-composite', box: 'int_1', line: { form: 'SchB' }, mode: 'equal' },
  { form: '1099-composite', box: 'int_3', line: { form: 'SchB' }, mode: 'equal' },
  { form: '1099-composite', box: 'div_1a', line: { form: 'SchB' }, mode: 'equal' },
  { form: '1099-composite', box: 'div_1b', line: 'F1040.3a', mode: 'equal' },
  { form: '1099-NEC', box: 'box1', line: 'SchC.1', mode: 'at_least' },
  { form: '1099-K', box: 'box1a', line: 'SchC.1', mode: 'at_least' },
  { form: '1099-R', box: 'box1', line: 'F1040.4a', mode: 'equal' },
  { form: '1099-SA', box: 'box1', line: 'F8889.14a', mode: 'equal' },
  { form: '1099-S', box: 'box2', line: 'F4797.21', mode: 'equal' },
  { form: '1098-T', box: 'box1', minus: 'box5', line: 'F8863.27', mode: 'net' },
  { form: '1098-C', box: 'box4c', line: { form: 'F8283' }, mode: 'at_most' },
  { form: 'K-1-1120S', box: 'box1', line: { form: 'SchE' }, mode: 'equal' },
  { form: 'K-1-1065', box: 'box2', line: { form: 'SchE' }, mode: 'equal' },
  // A foreign bank's year-end statement plays the information return's part for foreign interest.
  { form: 'foreign_bank_statement', box: /^interest_([a-z]{3})$/, line: { form: 'SchB' }, mode: 'converted' },
];

/** True when the line agrees with the expected amount under the mode (within a dollar). 'net' and 'converted' are
 *  equalities once the expected amount is computed. */
export function boxAgrees(mode: BoxMode, expected: number, line: number): boolean {
  if (mode === 'at_least') return line >= expected - 1;
  if (mode === 'at_most') return line <= expected + 1;
  return Math.abs(line - expected) < 1;
}
