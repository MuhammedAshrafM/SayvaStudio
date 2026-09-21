import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Studio's stylesheet, which in turn imports the design system's public CSS
// surface (ADR-002 DR-16). The root layout is where it belongs: every route
// renders inside it, so the token layer is present before any component is.
//
// This also replaces the Phase 0 placeholder `import '@sayva/design-system'`,
// which existed only to prove the dependency edge resolved. The edge now has
// a real consumer.
import './globals.css';

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
