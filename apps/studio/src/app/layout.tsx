import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Proves the design-system dependency edge actually resolves and compiles —
// not just declared in package.json (ADR-002 DR-02). Remove once a real
// component needs it.
import '@sayva/design-system';

export const metadata: Metadata = {
  title: 'Sayva Studio',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
