// The one dictionary behind every "?" help mark. Plain words, at most 30 words each, US federal and California rules as of
// tax year 2025. Importable from server and client code. tests/unit/terms.test.ts keeps it short, in house style and in use.

export type TermEntry = { label: string; text: string };

export const TERMS: Record<string, TermEntry> = {
  // Forms
  'form-1040': { label: 'Form 1040', text: 'The main US individual income tax return. Every schedule and form on this return feeds a line on it.' },
  'form-540nr': { label: 'Form 540NR', text: 'California’s return for nonresidents and part-year residents. It taxes income received while resident plus California-source income after the move, at the rate a full-year resident would pay.' },
  'sch-ca-540nr': { label: 'Schedule CA (540NR)', text: 'Adjusts federal amounts to California rules, then splits income between what California taxes and what it does not.' },
  'form-8879': { label: 'Form 8879', text: 'The taxpayers’ signed permission for the firm to e-file the federal return. Each spouse signs; the firm keeps it and does not mail it to the IRS.' },
  'ftb-8879': { label: 'FTB 8879', text: 'California’s version of Form 8879. It lets the firm e-file the California return and stays in the firm’s records.' },
  'sch-a': { label: 'Schedule A', text: 'Itemized deductions, such as state and local taxes, mortgage interest and gifts to charity. Used when they add up to more than the standard deduction.' },
  'sch-b': { label: 'Schedule B', text: 'Interest and ordinary dividends, plus Part III questions about foreign accounts and foreign trusts.' },
  'sch-c': { label: 'Schedule C', text: 'Profit or loss from a business run as a sole proprietor. Its net profit also drives self-employment tax and the QBI deduction.' },
  'sch-d': { label: 'Schedule D', text: 'Totals capital gains and losses from Form 8949 and other sources. It applies the yearly capital loss limit and works out any carryover.' },
  'sch-e': { label: 'Schedule E', text: 'Income and loss from rentals, royalties, partnerships, S corporations, estates and trusts. Amounts from K-1s land here.' },
  'sch-se': { label: 'Schedule SE', text: 'Self-employment tax: the Social Security and Medicare tax owed on net earnings from self-employment, such as Schedule C profit.' },
  'form-8949': { label: 'Form 8949', text: 'One row per sale of stock or other capital asset, with dates, proceeds and basis. Its boxes group sales by whether the broker reported basis to the IRS.' },
  'form-4562': { label: 'Form 4562', text: 'Depreciation and amortization for business and rental assets, including bonus depreciation and the section 179 deduction.' },
  'form-4797': { label: 'Form 4797', text: 'Sales of business or rental property. Equipment depreciation is recaptured as ordinary income here; gain from a building’s past depreciation is taxed at up to 25% through Schedule D.' },
  'form-8582': { label: 'Form 8582', text: 'Limits passive activity losses, such as most rental losses, to passive income. The disallowed part is suspended and carries forward.' },
  'form-7203': { label: 'Form 7203', text: 'Tracks an S corporation shareholder’s stock and loan basis. Losses beyond basis are suspended, and distributions beyond basis are taxed as gain.' },
  'form-2210': { label: 'Form 2210', text: 'Works out the penalty for paying too little tax during the year through withholding and estimated payments.' },
  'form-6251': { label: 'Form 6251', text: 'Computes the alternative minimum tax. If the minimum tax is higher than regular tax, the difference is owed as AMT.' },
  'form-8812': { label: 'Schedule 8812', text: 'The child tax credit and the credit for other dependents, including the refundable part, the additional child tax credit.' },
  'form-8863': { label: 'Form 8863', text: 'Education credits: the American opportunity credit and the lifetime learning credit, for qualified tuition and related costs.' },
  'form-8606': { label: 'Form 8606', text: 'Tracks after-tax contributions to traditional IRAs, the IRA basis, so that part is not taxed again when withdrawn or converted.' },
  'form-8938': { label: 'Form 8938', text: 'Statement of specified foreign financial assets, filed with the return above set thresholds. It is a separate filing from the FBAR.' },
  'form-8960': { label: 'Form 8960', text: 'Net investment income tax: 3.8% of the smaller of net investment income or modified AGI above $250,000 on a joint return.' },
  'k-1': { label: 'Schedule K-1', text: 'Each owner’s share of a partnership’s (Form 1065) or S corporation’s (Form 1120-S) income, deductions and credits, reported on the owner’s own return.' },
  'w-2': { label: 'Form W-2', text: 'Wages and tax withheld, from an employer. Box 1 is federal taxable wages; boxes 16 and 17 are state wages and state tax withheld.' },
  'form-1099': { label: 'Forms 1099', text: 'Information returns from payers: 1099-INT for interest, 1099-DIV for dividends, 1099-B for sales of securities, 1099-NEC for contract pay, and others.' },
  'fbar': { label: 'FBAR (FinCEN 114)', text: 'A report of foreign financial accounts, filed separately with FinCEN when the highest balances add up to more than $10,000 during the year.' },
  'letter-566': { label: 'Letter 566', text: 'An IRS letter that opens an examination by mail. It lists the items under review and the records the IRS wants by a response date.' },

  // Tax concepts
  'basis': { label: 'basis', text: 'What an asset cost for tax purposes, adjusted over time for depreciation, improvements or reinvested income. A sale’s gain or loss is the price minus basis.' },
  'carryover': { label: 'carryover', text: 'An amount that could not be used this year, such as a capital loss or a suspended passive loss, carried into a later year’s return.' },
  'passive-loss': { label: 'passive loss', text: 'A loss from a business the taxpayer does not materially work in, or from most rentals. It offsets passive income only; the rest is suspended.' },
  'depreciation': { label: 'depreciation', text: 'Asset cost deducted over its recovery period. Section 179 and bonus (100% for property acquired after 19 Jan 2025) take more up front; California skips bonus, caps 179 at $25,000.' },
  'amt': { label: 'AMT', text: 'Alternative minimum tax: a second calculation that adds back items such as state taxes and some depreciation. The taxpayer pays whichever tax is higher.' },
  'qbi': { label: 'QBI deduction', text: 'Up to 20% of qualified business income from pass-through businesses, subject to income limits (Form 8995). It lowers taxable income, after AGI.' },
  'estimated-tax': { label: 'estimated tax payments', text: 'Payments during the year on income without enough withholding. Federal is four equal parts; California asks for 30%, 40%, 0% and 30%.' },
  'underpayment-penalty': { label: 'underpayment penalty', text: 'A charge, figured like interest, when withholding and estimates fall short during the year (Form 2210, FTB 5805). Meeting a safe harbor avoids it.' },
  'safe-harbor': { label: 'safe harbor', text: 'Paying in at least 90% of this year’s tax, or 100% of last year’s (110% if last year’s AGI was over $150,000), avoids the federal underpayment penalty.' },
  'part-year-resident': { label: 'part-year resident', text: 'Someone who moved into or out of California during the year. California taxes all income while resident and California-source income for the rest.' },
  'extension': { label: 'extension', text: 'More time to file, to October 15, through Form 4868 and California’s automatic extension. Tax is still due by the April deadline.' },
  'efile-rejection': { label: 'e-file rejection', text: 'The agency refused the electronic return and sent an error code. Nothing is filed until the error is fixed and the return is sent again and accepted.' },
  'tie-out': { label: 'tie-out', text: 'Confirming that a number on the return matches its source, such as a W-2 box or a broker total, and that the totals add up.' },
  'due-diligence': { label: 'due diligence', text: 'The questions and records the IRS requires before a preparer claims certain credits, such as the child tax credit, documented on Form 8867.' },
  'election': { label: 'election', text: 'A choice the tax law lets the taxpayer make, such as opting out of bonus depreciation. It is recorded with its authority and can bind later years.' },

  // Review concepts
  'sign-off': { label: 'sign-off', text: 'A preparer, reviewer or partner records that they checked a value, with a note on what they checked. It covers that value; if the value changes, the sign-off goes stale.' },
  'stale-signoff': { label: 'stale sign-off', text: 'The value changed after it was signed. The old sign-off stays in the record but no longer counts, so someone checks and signs again.' },
  'blocker': { label: 'blocker', text: 'An open item that stops partner approval, such as a failed check marked blocking or a blocking review note. Approval opens once all clear.' },
  'review-note': { label: 'review note', text: 'A reviewer’s question or instruction on a number. A note marked blocking stops approval until someone resolves it.' },
  'judgment': { label: 'judgment', text: 'An item the rules leave open to a professional call. It needs a recorded decision with the authority relied on.' },
  'adjustment': { label: 'adjustment', text: 'Our change to a computed value, saved with the original, the reason and the authority. It stays proposed until a reviewer applies it.' },
  'verification': { label: 'verification', text: 'A record of how a value was checked, using one of the firm’s methods, such as matching it to the source document.' },
  'swing': { label: 'swing', text: 'A line that moved from last year by more than the firm’s variance rule, in both percent and dollars. Each swing needs an explanation.' },
  'partner-threshold': { label: 'partner threshold', text: 'The firm rule that an adjustment with a tax effect above a set amount needs the partner’s own sign-off before the return is approved.' },
  'sensitive-data-clearance': { label: 'sensitive-data clearance', text: 'Permission to see full SSNs and bank numbers. Without it a person sees only the last 4 digits; every reveal is logged.' },
  'view-log': { label: 'view log', text: 'Each time someone revealed a full identifier: who, which one and when. The value itself is never written down.' },
  'read-confidence': { label: 'read confidence', text: 'How surely the extraction pipeline read the text on the page, from 0 to 1. It says nothing about whether the document itself is right.' },
  'engine-diagnostics': { label: 'engine diagnostics', text: 'Warnings and errors the tax engine reported about its own run. They are listed for reference, apart from the firm’s own checks.' },
  'landed': { label: 'landed', text: 'A document landed when at least one of its values reaches a line of the return. One that did not land shows the reason.' },

  // App concepts
  'role-switcher': { label: 'Viewing as', text: 'Actions are recorded as the role you choose. There is no sign-in in this demo, so pick the person whose view you want.' },
  'story-clock': { label: 'story clock', text: 'The demo’s shared date. Documents and events after it stay hidden from everyone, so the season replays step by step; moving it is recorded.' },
  'workspace': { label: 'workspace', text: 'One saved copy of the work on this return. Every action is saved here as an event; the packet itself never changes.' },
  'version': { label: 'computed version', text: 'One run of the tax engine over the packet. The latest run is the starting point; our adjustments sit on top of it.' },
  'finalized-version': { label: 'Finalized', text: 'The latest computed version plus the adjustments applied in this workspace. The engine has not recomputed, so totals may not reflect the changes yet.' },
  'as-filed-locked': { label: 'As filed, locked', text: 'The return the agency accepted. Nothing in it changes; later work, such as a letter or an amendment, attaches on top.' },
  'amend-on-top': { label: 'amend on top', text: 'A change after filing becomes an amended return that refers to the filed one. The filed record stays exactly as it was.' },
  'example-tag': { label: 'Example', text: 'Marks anything not in the packet, shown to illustrate how the app works. It is never a fact about this household.' },
  'ai-suggestion': { label: 'AI suggestion', text: 'An issue an AI reader proposed from the packet’s text, shown only after each quote was found on its page. Staff accept or dismiss it; it never blocks filing.' },
  'what-if': { label: 'what-if', text: 'An alternative the engine computed, such as a different election. Reading it changes nothing; acting on it means recording a decision.' },
};

/** Form codes (README form_codes) whose form has a term. Used where form names are dynamic labels. */
export const FORM_TERMS: Record<string, string> = {
  F1040: 'form-1040', F540NR: 'form-540nr', SchCA540NR: 'sch-ca-540nr', SchA: 'sch-a', SchB: 'sch-b', SchC: 'sch-c', SchD: 'sch-d',
  SchE: 'sch-e', SchSE: 'sch-se', F8949: 'form-8949', F4562: 'form-4562', F4797: 'form-4797', F8582: 'form-8582', F7203: 'form-7203',
  F2210: 'form-2210', F6251: 'form-6251', F8812: 'form-8812', F8863: 'form-8863', F8606: 'form-8606', F8938: 'form-8938',
  F8960: 'form-8960', F8995: 'qbi', F8867: 'due-diligence', FTB3885A: 'depreciation', FTB5805: 'underpayment-penalty',
};

/** The term key for a form code ("F4562-C" uses Form 4562's), or null when the form has none. */
export function formTermKey(code: string): string | null {
  return FORM_TERMS[code] ?? FORM_TERMS[code.split('-')[0]] ?? null;
}
