import { workspaceRoot } from '@/composition-root';
import { WorkspaceRootReadout } from './workspace-root-readout';

/**
 * Rendered per request, not at build time.
 *
 * The workspace root is deployment configuration (ADR-003 SR-09), and a build
 * should not need it: prerendering this page would make `next build` fail on
 * any machine that has not set `SAYVA_WORKSPACE_ROOT`, including CI, which
 * has no projects directory and no business having one. Failing loudly is
 * meant to happen when Studio *runs*, not when it compiles.
 */
export const dynamic = 'force-dynamic';

/**
 * A Server Component, so it may call the Composition Root (Blueprint §6).
 * It invokes no use case and decides nothing — AD-07 allows exactly this
 * much: read a value, render it.
 */
export default function HomePage() {
  return (
    <main>
      <h1>Sayva Studio</h1>
      <WorkspaceRootReadout root={workspaceRoot()} />
    </main>
  );
}
