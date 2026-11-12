'use client';

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectListItem, ProjectListView } from '@sayva/application';
import { SyButton, SyStateBlock } from '@sayva/design-system';
import { clearOpenArrival, markOpenArrival } from '@/workspace-entry/open-arrival';
import { CreateProjectDrawer } from './create-project-drawer';
import { DuplicateProjectDrawer } from './duplicate-project-drawer';
import { openProjectAction } from './open-project-action';

/**
 * The pre-shell Project Picker.
 *
 * Canonical source: `Sayva Studio Screens.dc.html` §04 (specified-not-drawn),
 * with its planning-side text in docs/planning/phase-2-project-picker-design.md.
 * The surface sits before `SyAppShell` (ADR-004), so there is no rail, no
 * scope bar and no `SyCollection` — a header, then the list or one state.
 *
 * Specified, not drawn: this adds no spacing, colour or typography of its
 * own. Structure and copy come from the design; every visual treatment comes
 * from a frozen primitive. The row is screen-local composition, not a new
 * component. One layout override exists, approved and local to the Picker:
 * the inline-row error wraps (`INLINE_ROW_ERROR_WRAPS`).
 *
 * Two parts, because the header outlives the scan. `ProjectPickerFrame` is
 * the header and the one drawer — Create or Duplicate — rendered by the
 * route's layout so it stays mounted while the list loads, fails, retries
 * and re-scans — which is what lets a drawer survive the list arriving or
 * changing beneath it (B15). `ProjectPickerBody` and `ProjectPickerLoading`
 * are the list's states, rendered by the page and its loading boundary.
 *
 * Each row's actions are `Open`, then `Duplicate` (§5, ADR-005 OP-08, D1).
 */

/** The product's name — the header's heading. */
const PRODUCT_NAME = 'Sayva Studio';

/** RB-4: the header's line. RB-5: the loading state's accessible name. */
const lookingIn = (root: string) => `Studio is looking in ${root}`;

/** The header's single primary action, and first-run's (§04 appBar, §6). */
const NEW_PROJECT = 'New Project';

/** B6: New Project's stated reason below `bp.md`. */
const NARROW_REASON = 'Creating a project needs a window at least 900px wide.';

/** A row's action (§5), and what its failures say (ADR-005 OP-08, §04 §4). */
const OPEN = 'Open';
const CANT_OPEN_THE_PROJECT = "Can't open the project";
const CANT_FIND_THAT_PROJECT = "Can't find that project";
const RETRY = 'Retry';

/** A row's other action (§5, D1), and its stated reason below `bp.md` (D10). */
const DUPLICATE = 'Duplicate';
const DUPLICATE_NARROW_REASON = 'Duplicating a project needs a window at least 900px wide.';

/**
 * How long an announcement stays in the live region before it is cleared.
 * A screen reader takes the words when the region changes; this leaves room
 * for one that is slow to, and after it, browsing the page finds nothing
 * stale. Clearing announces nothing: the region reports additions only.
 */
const ANNOUNCEMENT_LIFETIME_MS = 2000;

/**
 * The inline-row error's one local override. `SyStateBlock`'s inline size is
 * a single row that never wraps, and a long location — a Windows path has
 * few places to break — pushed the row, and the page, wider than the window.
 *
 * The location is the block's first `p`. It may break anywhere, so no path
 * is clipped or widens the row, at any width: that alone ends the overflow,
 * and from `bp.md` up the row is otherwise unchanged. Below `bp.md` the row
 * also wraps, with the location on a full line of its own, so it is not
 * squeezed into a column beside the heading. The switch is `max-md:`, from
 * the `--breakpoint-md` token, as New Project's is. Nothing changes for any
 * other `SyStateBlock`.
 */
const INLINE_ROW_ERROR_WRAPS =
  '[&>p:first-of-type]:wrap-anywhere max-md:flex-wrap max-md:[&>p:first-of-type]:basis-full';

/** Opens the Create drawer, remembering which control did it (B14). */
type OpenCreate = (opener: HTMLElement | null) => void;

const OpenCreateContext = createContext<OpenCreate | null>(null);

function useOpenCreate(): OpenCreate {
  const openCreate = useContext(OpenCreateContext);
  if (!openCreate) throw new Error('The Project Picker body renders inside ProjectPickerFrame.');
  return openCreate;
}

/** Opens the Duplicate drawer for one Project, remembering which control did it (A07). */
type OpenDuplicate = (projectId: string, opener: HTMLElement) => void;

const OpenDuplicateContext = createContext<OpenDuplicate | null>(null);

function useOpenDuplicate(): OpenDuplicate {
  const openDuplicate = useContext(OpenDuplicateContext);
  if (!openDuplicate) throw new Error('The Project Picker body renders inside ProjectPickerFrame.');
  return openDuplicate;
}

/**
 * The frame's one drawer: Create, or Duplicate for one Project. `session`
 * numbers each opening, and keys the drawer, so every session mounts its own
 * `SyDrawer` — its own trigger, its own focus entry — and a session that has
 * ended can never reach the one that replaced it (DP-6).
 */
type DrawerSession =
  | { readonly kind: 'create'; readonly session: number }
  | { readonly kind: 'duplicate'; readonly session: number; readonly projectId: string };

/** Announces, in the frame's live region, that an Open found no Project. */
type AnnounceNotHere = () => void;

const AnnounceNotHereContext = createContext<AnnounceNotHere | null>(null);

function useAnnounceNotHere(): AnnounceNotHere {
  const announce = useContext(AnnounceNotHereContext);
  if (!announce) throw new Error('The Project Picker body renders inside ProjectPickerFrame.');
  return announce;
}

/**
 * The single `main` landmark (§10), named by its own heading. Its heading is
 * an `h1`; the state blocks below keep their default `h2`, and the drawer's
 * title is `SyDrawer`'s own `h2`.
 *
 * The header is present in every state — with the list, and in first-run,
 * loading and error (B15) — because it is rendered once, here, around them.
 *
 * So is the not-found announcement (ADR-005 OP-08): a screen-local
 * assertive live region, here rather than in the list because an Open that
 * finds nothing re-scans, and the region has to outlive the list it reports
 * on. Visually hidden: no canonical source gives it a visual treatment, and
 * a sighted author sees the row go. Each occurrence renders a new node, so
 * the same words are announced again; the region itself is always present,
 * as a live region must be before its content changes. The words are cleared
 * once delivered (`ANNOUNCEMENT_LIFETIME_MS`), so they are not met again
 * later as if new; the next occurrence starts from an empty region.
 *
 * Mounting the frame drops any arrival mark an earlier Open left behind
 * without arriving, so a later visit cannot mistake it for its own.
 *
 * One drawer at a time (DP-6). Activating the control whose drawer is
 * already open does nothing, and keeps what was typed: New Project, from the
 * header or first-run, while Create is open, or the same row's Duplicate
 * while its drawer is. Any other drawer control replaces the open drawer,
 * which ends that session as closing it would.
 */
export function ProjectPickerFrame({ root, children }: { root: string; children: ReactNode }) {
  const headingId = useId();
  const [drawer, setDrawer] = useState<DrawerSession | null>(null);
  // The occurrence being announced, counted from 1; 0 while there is none.
  const [notFound, setNotFound] = useState(0);
  const openerRef = useRef<HTMLElement | null>(null);
  const sessions = useRef(0);

  const openCreate = useCallback<OpenCreate>(
    (opener) => {
      if (drawer?.kind === 'create') return;
      openerRef.current = opener;
      sessions.current += 1;
      setDrawer({ kind: 'create', session: sessions.current });
    },
    [drawer],
  );
  const openDuplicate = useCallback<OpenDuplicate>(
    (projectId, opener) => {
      if (drawer?.kind === 'duplicate' && drawer.projectId === projectId) return;
      openerRef.current = opener;
      sessions.current += 1;
      setDrawer({ kind: 'duplicate', session: sessions.current, projectId });
    },
    [drawer],
  );
  // Only the session still open can close the drawer.
  const closeDrawer = useCallback(
    (session: number) => setDrawer((open) => (open?.session === session ? null : open)),
    [],
  );
  const announceNotHere = useCallback<AnnounceNotHere>(() => setNotFound((n) => n + 1), []);

  useEffect(() => {
    clearOpenArrival();
  }, []);

  // A later occurrence restarts the lifetime for its own words.
  useEffect(() => {
    if (notFound === 0) return;
    const clear = setTimeout(() => setNotFound(0), ANNOUNCEMENT_LIFETIME_MS);
    return () => clearTimeout(clear);
  }, [notFound]);

  return (
    <main aria-labelledby={headingId}>
      <header>
        <h1 id={headingId}>{PRODUCT_NAME}</h1>
        <p>{lookingIn(root)}</p>
        <NewProject onOpen={openCreate} />
      </header>
      <OpenCreateContext.Provider value={openCreate}>
        <OpenDuplicateContext.Provider value={openDuplicate}>
          <AnnounceNotHereContext.Provider value={announceNotHere}>
            {children}
          </AnnounceNotHereContext.Provider>
        </OpenDuplicateContext.Provider>
      </OpenCreateContext.Provider>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {notFound > 0 ? <span key={notFound}>{CANT_FIND_THAT_PROJECT}</span> : null}
      </div>
      {drawer?.kind === 'create' ? (
        <CreateProjectDrawer
          key={drawer.session}
          open
          onClose={() => closeDrawer(drawer.session)}
          triggerRef={openerRef}
        />
      ) : null}
      {drawer?.kind === 'duplicate' ? (
        <DuplicateProjectDrawer
          key={drawer.session}
          projectId={drawer.projectId}
          onClose={() => closeDrawer(drawer.session)}
          onNotHere={announceNotHere}
          triggerRef={openerRef}
        />
      ) : null}
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

/**
 * A row's Retry and the re-scan it started: the row, the view it was pressed
 * on, and — once it arrives — the view that answered it.
 */
type RowRetry = {
  readonly projectId: string;
  readonly on: ProjectListView;
  readonly answer?: ProjectListView;
};

/**
 * The list's states, and where focus goes when a row's Retry is answered.
 *
 * Every re-scan answers with a new view, so the answer to a row's Retry is
 * the first view after the one it was pressed on. Focus follows that answer
 * and nothing else — the author's action caused it:
 * - still unreadable: the list's own error appears (findAll), and its Retry
 *   takes focus;
 * - repaired: the row returns, and its `Open` takes focus;
 * - removed: the row is gone, and focus is left alone (Ruling 6).
 * The next view after the answer is someone else's re-scan — a not-here, the
 * list's own Retry, a Create — so the Retry is spent and moves nothing more.
 * The intent lives here because the list it came from does not outlive an
 * error answer.
 */
export function ProjectPickerBody({ root, view }: { root: string; view: ProjectListView }) {
  const [retry, setRetry] = useState<RowRetry | null>(null);

  // Adjusted while rendering, as React prescribes for state that follows a
  // prop: the first new view is recorded as the answer, a later one ends it.
  if (retry && view !== retry.on && view !== retry.answer) {
    setRetry(retry.answer ? null : { ...retry, answer: view });
  }
  const answered = retry?.answer === view ? retry.projectId : null;

  switch (view.status) {
    case 'listed':
      return (
        <ProjectList
          projects={view.projects}
          restored={answered}
          onRetry={(projectId) => setRetry({ projectId, on: view })}
        />
      );

    case 'first-run':
      return <FirstRun root={root} />;

    case 'error':
      return (
        <ProjectListError
          traceId={view.traceId}
          location={view.location}
          answersRowRetry={answered !== null}
        />
      );
  }
}

/** A row Open found unreadable: the failure's trace ID and location. */
type UnreadableRow = { readonly traceId: string; readonly location: string };

/**
 * The listed Projects, each with its `Open` — ADR-005 OP-08, Screens §04 §4.
 *
 * `list` / `listitem`, never `role=grid`, which belongs to SyCollection
 * (§10). The order is the View Model's: PP-04 decides it, this preserves it.
 *
 * Open reads the Project before it navigates, through the read-only action
 * OP-10 allows, and acts on the Query's own classification:
 * - `opened` marks the arrival as Open's and navigates to the workspace URL,
 *   which resolves the Project again (OP-02). Nothing is handed across.
 * - `not-here` re-scans, so the row is gone, and the frame announces it.
 *   Focus is not moved: nothing names a target for it.
 * - `cant-read` replaces the row in place with the inline-row error. Its
 *   Retry re-scans; only an Open produces this state, so Retry takes focus.
 *   The error stays until the re-scan answers, and where focus goes then is
 *   `ProjectPickerBody`'s: a row that returns hands its `Open` focus.
 *
 * One Open at a time across the whole list. Server Actions run one after
 * another, so a second Open would otherwise navigate after the first. While
 * one reads or navigates, the transition is pending and every Open ignores
 * activation — its own `SyButton` loading state already does — and none is
 * disabled, since a disabled button needs a stated reason. The active one
 * keeps its label, is `aria-busy` and keeps focus.
 *
 * `Duplicate` follows `Open` on every row that shows one, so Tab reaches
 * Open, then Duplicate (D1). A row replaced by Open's can't-read error shows
 * neither. Below `bp.md` the list states Duplicate's reason once, above the
 * rows, rather than beside each of them (D10).
 */
function ProjectList({
  projects,
  restored,
  onRetry,
}: {
  projects: readonly ProjectListItem[];
  /** The row a Retry's answer brought back, if this view is that answer. */
  restored: string | null;
  onRetry: (projectId: string) => void;
}) {
  const router = useRouter();
  const announceNotHere = useAnnounceNotHere();
  const [opening, setOpening] = useState<string | null>(null);
  const [pending, startOpening] = useTransition();
  const [unreadable, setUnreadable] = useState<Readonly<Record<string, UnreadableRow>>>({});
  const restoredOpen = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (restored) restoredOpen.current?.focus();
  }, [restored]);

  function open(projectId: string) {
    if (pending) return;
    setOpening(projectId);
    startOpening(async () => {
      const result = await openProjectAction(projectId);
      startOpening(() => {
        if (result.status === 'opened') {
          markOpenArrival(projectId);
          router.push(`/workspace/${encodeURIComponent(projectId)}`);
        } else if (result.status === 'not-here') {
          announceNotHere();
          router.refresh();
        } else {
          setUnreadable((rows) => ({
            ...rows,
            [projectId]: { traceId: result.traceId, location: result.location },
          }));
        }
      });
    });
  }

  /**
   * The row's Retry re-scans (OP-08). Its failure is forgotten in the same
   * transition, so the error — and Retry, with focus — stays until the
   * re-scan answers rather than flashing back to a row that may be gone.
   */
  function retry(projectId: string) {
    startTransition(() => {
      setUnreadable((rows) =>
        Object.fromEntries(Object.entries(rows).filter(([id]) => id !== projectId)),
      );
      onRetry(projectId);
      router.refresh();
    });
  }

  return (
    <>
      {/* D10: Duplicate's reason, stated once for the list. Each disabled
          Duplicate already gives it to assistive technology, so this copy is
          hidden from it, as New Project's is. */}
      <p className="md:hidden" aria-hidden="true">
        {DUPLICATE_NARROW_REASON}
      </p>
      <ul>
        {projects.map((project) => {
          const failure = unreadable[project.id];
          return (
            <li key={project.id}>
              {failure ? (
                <SyStateBlock
                  key={failure.traceId}
                  className={INLINE_ROW_ERROR_WRAPS}
                  state="error"
                  size="inline"
                  heading={CANT_OPEN_THE_PROJECT}
                  description={failure.location}
                  traceId={failure.traceId}
                  userInitiated
                  action={{ label: RETRY, onAction: () => retry(project.id) }}
                />
              ) : (
                <>
                  {project.name} <time dateTime={project.updatedAt}>{project.updatedAgo}</time>{' '}
                  <SyButton
                    ref={project.id === restored ? restoredOpen : undefined}
                    variant="secondary"
                    loading={pending && opening === project.id}
                    onClick={() => open(project.id)}
                  >
                    {OPEN}
                  </SyButton>{' '}
                  <DuplicateAction projectId={project.id} />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * A row's Duplicate, in both of the forms §8 gives it (D10), as New Project
 * has them: from `bp.md` up a ghost `SyButton` that opens the drawer, and
 * below it the same button disabled, with its reason given to assistive
 * technology by `SyButton`. The disabled form is wrapped so that its reason
 * leaves the accessibility tree with it from `bp.md` up.
 */
function DuplicateAction({ projectId }: { projectId: string }) {
  const openDuplicate = useOpenDuplicate();
  return (
    <>
      <SyButton
        className="max-md:hidden"
        variant="ghost"
        onClick={(event) => openDuplicate(projectId, event.currentTarget)}
      >
        {DUPLICATE}
      </SyButton>
      <span className="md:hidden">
        <SyButton variant="ghost" disabled disabledReason={DUPLICATE_NARROW_REASON}>
          {DUPLICATE}
        </SyButton>
      </span>
    </>
  );
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
 * pressed Retry, a failure that comes back is one they caused. So is one
 * that answers a row's Retry — the file is still unreadable, and findAll
 * fails the whole list (`answersRowRetry`).
 *
 * Keyed by trace ID, because each occurrence is its own appearance. The
 * contract's focus runs when the block appears; without the key, a second
 * failure would re-render the first block in place, `userInitiated` would
 * not change, and the returning failure would never hand the author Retry.
 * A new occurrence mounts a new block, which is also announced afresh as the
 * alert it is.
 */
function ProjectListError({
  traceId,
  location,
  answersRowRetry,
}: {
  traceId: string;
  location: string;
  answersRowRetry: boolean;
}) {
  const router = useRouter();
  const [retried, setRetried] = useState(false);

  return (
    <SyStateBlock
      key={traceId}
      state="error"
      heading="Can't read the projects folder"
      description={location}
      traceId={traceId}
      userInitiated={retried || answersRowRetry}
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
