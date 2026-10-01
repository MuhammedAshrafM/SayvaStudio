'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectListView } from '@sayva/application';
import { SyButton, SyStateBlock } from '@sayva/design-system';
import { CreateProjectDrawer } from './create-project-drawer';

/**
 * The pre-shell Project Picker.
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
 * Two parts, because the header outlives the scan. `ProjectPickerFrame` is
 * the header and the Create drawer, rendered by the route's layout so it
 * stays mounted while the list loads, fails, retries and re-scans — which is
 * what lets a drawer opened from the header survive the list arriving (B15).
 * `ProjectPickerBody` and `ProjectPickerLoading` are the list's states,
 * rendered by the page and its loading boundary.
 *
 * Not built, and deliberately absent rather than disabled: every row action.
 * Open has nowhere to hand a Project to until the shell exists (B1), and
 * Duplicate arrives with its own slice.
 */

/** The product's name — the header's heading. */
const PRODUCT_NAME = 'Sayva Studio';

/** RB-4: the header's line. RB-5: the loading state's accessible name. */
const lookingIn = (root: string) => `Studio is looking in ${root}`;

/** The header's single primary action, and first-run's (§04 appBar, §6). */
const NEW_PROJECT = 'New Project';

/** B6: New Project's stated reason below `bp.md`. */
const NARROW_REASON = 'Creating a project needs a window at least 900px wide.';

/** Opens the Create drawer, remembering which control did it (B14). */
type OpenCreate = (opener: HTMLElement | null) => void;

const OpenCreateContext = createContext<OpenCreate | null>(null);

function useOpenCreate(): OpenCreate {
  const openCreate = useContext(OpenCreateContext);
  if (!openCreate) throw new Error('The Project Picker body renders inside ProjectPickerFrame.');
  return openCreate;
}

/**
 * The single `main` landmark (§10), named by its own heading. Its heading is
 * an `h1`; the state blocks below keep their default `h2`, and the drawer's
 * title is `SyDrawer`'s own `h2`.
 *
 * The header is present in every state — with the list, and in first-run,
 * loading and error (B15) — because it is rendered once, here, around them.
 */
export function ProjectPickerFrame({ root, children }: { root: string; children: ReactNode }) {
  const headingId = useId();
  const [creating, setCreating] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const openCreate = useCallback<OpenCreate>((opener) => {
    openerRef.current = opener;
    setCreating(true);
  }, []);
  const closeCreate = useCallback(() => setCreating(false), []);

  return (
    <main aria-labelledby={headingId}>
      <header>
        <h1 id={headingId}>{PRODUCT_NAME}</h1>
        <p>{lookingIn(root)}</p>
        <NewProject onOpen={openCreate} />
      </header>
      <OpenCreateContext.Provider value={openCreate}>{children}</OpenCreateContext.Provider>
      <CreateProjectDrawer open={creating} onClose={closeCreate} triggerRef={openerRef} />
    </main>
  );
}

/**
 * The header's New Project, in both of the forms §8 gives it.
 *
 * From `bp.md` up it opens the Create drawer. Below it — `bp.sm`, "Read and
 * review only" — it stays visible and disabled, with its stated reason (B6).
 * `SyButton` gives the reason to assistive technology and leaves the visible
 * statement to the screen ("Disabled is never used without an adjacent
 * stated reason"), so the screen states it too; that copy is hidden from
 * assistive technology only because the button already carries it.
 *
 * The switch is `md:` / `max-md:`, which compile from the `--breakpoint-md`
 * token, so no width is written here: the token stays the one source for
 * where `bp.sm` ends.
 */
function NewProject({ onOpen }: { onOpen: OpenCreate }) {
  return (
    <>
      <SyButton className="max-md:hidden" onClick={(event) => onOpen(event.currentTarget)}>
        {NEW_PROJECT}
      </SyButton>
      <div className="md:hidden">
        <SyButton disabled disabledReason={NARROW_REASON}>
          {NEW_PROJECT}
        </SyButton>
        <p aria-hidden="true">{NARROW_REASON}</p>
      </div>
    </>
  );
}

/** The Suspense fallback while the scan is in flight — skeleton, not spinner. */
export function ProjectPickerLoading({ root }: { root: string }) {
  return <SyStateBlock state="loading" label={lookingIn(root)} />;
}

export function ProjectPickerBody({ root, view }: { root: string; view: ProjectListView }) {
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
      return <FirstRun root={root} />;

    case 'error':
      return <ProjectListError traceId={view.traceId} location={view.location} />;
  }
}

/**
 * First-run: heading, line, and New Project as its action — RB-6's boundary
 * ends with the Create slice.
 *
 * Below `bp.md` it renders no action and nothing in its place (B6).
 * `SyStateBlock`'s action has no disabled form, and its frozen contract is
 * not widened to give it one, so the narrow form is the same block without
 * the action. Only one of the two is ever displayed.
 */
function FirstRun({ root }: { root: string }) {
  const openCreate = useOpenCreate();
  const heading = 'No projects yet';
  const description = `${lookingIn(root)}. A project is one .sayva file.`;

  return (
    <>
      <SyStateBlock
        className="max-md:hidden"
        state="first-run"
        heading={heading}
        description={description}
        action={{
          label: NEW_PROJECT,
          // The action's own button has focus when it is used, by pointer or
          // key; it is the control focus returns to (B14).
          onAction: () =>
            openCreate(
              document.activeElement instanceof HTMLElement ? document.activeElement : null,
            ),
        }}
      />
      <SyStateBlock
        className="md:hidden"
        state="first-run"
        heading={heading}
        description={description}
      />
    </>
  );
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
