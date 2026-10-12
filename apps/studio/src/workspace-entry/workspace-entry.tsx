'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SyStateBlock } from '@sayva/design-system';
import {
  CANT_OPEN_THE_PROJECT,
  NO_LANGUAGES_LINE,
  NO_LANGUAGES_YET,
  OPENING_THE_PROJECT,
  RETRY,
  couldNotRead,
  type WorkspaceResult,
} from './workspace-entry-copy';

/**
 * The temporary pre-shell Workspace Entry, at `/workspace/{projectId}`.
 *
 * Canonical source: `Sayva Studio Screens.dc.html` §04.1 (specified-not-drawn),
 * with its planning-side text in docs/planning/phase-2-workspace-entry-design.md
 * and its recipe, `workspace-entry`, in the vendored inventory. Governed by
 * ADR-004 WS-05 and ADR-005 OP-01 to OP-08. It is replaced by the shell.
 *
 * One `main` landmark holding exactly one state: the resolved Project, its
 * loading state, or can't read. No banner, navigation or complementary
 * landmark, and no return control of any kind (WS-05): returning is by
 * navigating to `/`. Not here never reaches this component — the route
 * redirects first (F7).
 *
 * Temporary boundaries of this first slice, each a ruling rather than an
 * oversight:
 * - Retry has no loading state. `SyStateBlock`'s action has none to pass,
 *   and the frozen contract is not widened.
 * - Loading is `SyStateBlock`'s own two-bar skeleton, not §04.1's three
 *   lines, for the same reason.
 * - Focus is never moved on arrival. Focus to the h1 after Open (WE-A3), and
 *   after a Retry that succeeds, arrive with the Picker's Open.
 * - Loading has no tab title of its own — see `WorkspaceEntryLoading`.
 */
export function WorkspaceEntry({ result }: { result: WorkspaceResult }) {
  return result.status === 'opened' ? (
    <OpenedProject name={result.project.name} />
  ) : (
    <CantOpenTheProject traceId={result.traceId} location={result.location} />
  );
}

/**
 * Resolved: the Project's name as the h1, then the zero-Language state as
 * screen-local text under it — §04.1 Decision 3. Not `SyStateBlock`: its
 * anatomy names one next action, and none is possible here.
 *
 * Type tokens only, as §04.1 names them: `heading.lg` for the name, which is
 * plain text rather than mono and wraps rather than truncating; `heading.md`
 * and `body` for the zero-Language heading and line. No Tab stop.
 */
function OpenedProject({ name }: { name: string }) {
  const headingId = useId();

  return (
    <main aria-labelledby={headingId}>
      <h1 id={headingId} className="text-heading-lg wrap-break-word">
        {name}
      </h1>
      <h2 className="text-heading-md">{NO_LANGUAGES_YET}</h2>
      <p className="text-body">{NO_LANGUAGES_LINE}</p>
    </main>
  );
}

/**
 * Can't read: `SyStateBlock`'s frozen error state at pane size, the main
 * landmark's sole content — §04.1 Decision 5.
 *
 * Its heading keeps the block's default h2 and this state has no h1 (WE-A2).
 * The landmark is named by an `aria-label` carrying the error heading's own
 * text, as approved: `SyStateBlock` keeps its heading id internal, so the
 * landmark cannot point at it, and the accessible name is the same either
 * way. No new string.
 *
 * Retry re-runs the resolution: `router.refresh()` renders the route again
 * on the server, which resolves the Project again. A failure that persists is
 * a new occurrence with a new trace ID; a Project that has become readable
 * replaces this state.
 *
 * Focus follows the frozen contract, as the Picker's error state does: the
 * action "receives focus on appearance only when the user's action caused
 * the state". On first paint Retry does not take focus; once the author has
 * pressed it, a failure that comes back does. Keyed by trace ID because each
 * occurrence is its own appearance — without the key the block would update
 * in place and never hand focus back.
 */
function CantOpenTheProject({ traceId, location }: { traceId: string; location: string }) {
  const router = useRouter();
  const [retried, setRetried] = useState(false);

  return (
    <main aria-label={CANT_OPEN_THE_PROJECT}>
      <SyStateBlock
        key={traceId}
        state="error"
        size="pane"
        heading={CANT_OPEN_THE_PROJECT}
        description={couldNotRead(location)}
        traceId={traceId}
        userInitiated={retried}
        action={{
          label: RETRY,
          onAction: () => {
            setRetried(true);
            router.refresh();
          },
        }}
      />
    </main>
  );
}

/**
 * Loading — shown while the resolution is pending on first paint, as the
 * route's loading boundary. `SyStateBlock`'s loading state at pane size,
 * named "Opening the project", inside a busy main landmark. No heading and
 * nothing focusable.
 *
 * Without §04.1's loading tab title, "Opening the project — Sayva Studio",
 * because no existing mechanism can show it. Next streams the route's
 * `generateMetadata` titles, so none exists until the resolution does; and
 * React leaves a `<title>` rendered inside a Suspense fallback out of the
 * server HTML. Recorded as an open item rather than solved by a new one.
 */
export function WorkspaceEntryLoading() {
  return (
    <main aria-busy="true">
      <SyStateBlock state="loading" size="pane" label={OPENING_THE_PROJECT} />
    </main>
  );
}
