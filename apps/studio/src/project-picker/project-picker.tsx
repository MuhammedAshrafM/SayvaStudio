'use client';

import { useId, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectListView } from '@sayva/application';
import { SyStateBlock } from '@sayva/design-system';

/**
 * The pre-shell Project Picker — read-only slice.
 *
 * Canonical source: `Sayva Studio Screens.dc.html` §04 (specified-not-drawn),
 * with its planning-side text in docs/planning/phase-2-project-picker-design.md.
 * The surface sits before `SyAppShell` (ADR-004), so there is no rail, no
 * scope bar and no `SyCollection` — a header, then the list or one state.
 *
 * Specified, not drawn: this adds no spacing, colour, typography or layout of
 * its own. Structure and copy come from the design; every visual treatment
 * comes from a frozen primitive. The row is screen-local composition, not a
 * new component.
 *
 * Not in this slice, and deliberately absent rather than disabled: New
 * Project, in the header and in first-run (RB-6), and every row action. Open
 * has nowhere to hand a Project to until the shell exists, and Duplicate
 * arrives with its own slice. With no row action there is nothing for a
 * focusable row or a row keyboard map to do, so rows are plain list items.
 */

/** The product's name — the header's heading. */
const PRODUCT_NAME = 'Sayva Studio';

/** RB-4: the header's line. RB-5: the loading state's accessible name. */
const lookingIn = (root: string) => `Studio is looking in ${root}`;

/**
 * The single `main` landmark (§10), named by its own heading so the name is
 * the product's rather than new copy. Its heading is an `h1`; the state
 * blocks below keep their default `h2`, which is the level the contract lets
 * the caller choose.
 */
function Frame({ root, children }: { root: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <main aria-labelledby={headingId}>
      <header>
        <h1 id={headingId}>{PRODUCT_NAME}</h1>
        <p>{lookingIn(root)}</p>
      </header>
      {children}
    </main>
  );
}

export function ProjectPicker({ root, view }: { root: string; view: ProjectListView }) {
  return (
    <Frame root={root}>
      <ProjectPickerBody root={root} view={view} />
    </Frame>
  );
}

/** The Suspense fallback while the scan is in flight — skeleton, not spinner. */
export function ProjectPickerLoading({ root }: { root: string }) {
  return (
    <Frame root={root}>
      <SyStateBlock state="loading" label={lookingIn(root)} />
    </Frame>
  );
}

function ProjectPickerBody({ root, view }: { root: string; view: ProjectListView }) {
  switch (view.status) {
    case 'listed':
      // `list` / `listitem`, never `role=grid` — that belongs to SyCollection
      // (§10). Order is the View Model's: PP-04 decides it, this preserves it.
      return (
        <ul>
          {view.projects.map((project) => (
            <li key={project.id}>
              {project.name} <time dateTime={project.updatedAt}>{project.updatedAgo}</time>
            </li>
          ))}
        </ul>
      );

    case 'first-run':
      // RB-6: heading and line now, no action until the Create slice — and
      // nothing standing in for one.
      return (
        <SyStateBlock
          state="first-run"
          heading="No projects yet"
          description={`${lookingIn(root)}. A project is one .sayva file.`}
        />
      );

    case 'error':
      return <ProjectListError traceId={view.traceId} location={view.location} />;
  }
}

/**
 * The canonical error state: heading, the affected location as its line
 * (ADR-003 SR-10), the trace ID through `SyStateBlock`'s own "Trace ID" label
 * (SR-11), and Retry.
 *
 * Retry re-scans: `router.refresh()` re-renders this route on the server,
 * which runs the Project list query again. Nothing is cached in between, so a
 * failure that persists arrives as a new occurrence with a new trace ID.
 *
 * `userInitiated` follows the frozen contract exactly: the action "receives
 * focus on appearance only when the user's action caused the state". An
 * error present on first paint does not take focus; once the author has
 * pressed Retry, a failure that comes back is one they caused.
 *
 * Keyed by trace ID, because each occurrence is its own appearance. The
 * contract's focus runs when the block appears; without the key, a second
 * failure would re-render the first block in place, `userInitiated` would
 * not change, and the returning failure would never hand the author Retry.
 * A new occurrence mounts a new block, which is also announced afresh as the
 * alert it is.
 */
function ProjectListError({ traceId, location }: { traceId: string; location: string }) {
  const router = useRouter();
  const [retried, setRetried] = useState(false);

  return (
    <SyStateBlock
      key={traceId}
      state="error"
      heading="Can't read the projects folder"
      description={location}
      traceId={traceId}
      userInitiated={retried}
      action={{
        label: 'Retry',
        onAction: () => {
          setRetried(true);
          router.refresh();
        },
      }}
    />
  );
}
