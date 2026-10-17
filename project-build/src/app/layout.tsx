import type { Metadata } from 'next';
import { Instrument_Sans, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const sans = Instrument_Sans({ variable: '--font-sans', subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const serif = Source_Serif_4({ variable: '--font-serif', subsets: ['latin'], weight: ['400', '600'] });
const mono = IBM_Plex_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Workpaper',
  description: 'A web-native tax workpaper: every number traced to its source, checks that do not trust the engine, roles and an audit trail.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
