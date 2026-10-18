'use client';
import s from './work.module.css';

/** The browser's own print dialog makes the PDF; there is no server PDF. */
export function PrintButton() {
  return <button type="button" className={`${s.btn} ${s.primary}`} onClick={() => window.print()}>Print or save as PDF</button>;
}
