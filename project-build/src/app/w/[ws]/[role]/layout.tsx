import type { ReactNode } from 'react';

// Each screen renders <Shell> itself so the shell and drawer can read the screen's ?claim= and ?q= values.
export const dynamic = 'force-dynamic';

export default function RoleLayout({ children }: { children: ReactNode }) {
  return children;
}
