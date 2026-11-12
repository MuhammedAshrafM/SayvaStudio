import { Suspense, startTransition, use, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import type {
  CreateProjectResult,
  DuplicateProjectResult,
  OpenProjectResult,
  ProjectListView,
} from '@sayva/application';
import { SyButton } from '@sayva/design-system';
import { clearOpenArrival, isOpenArrival } from '../workspace-entry/open-arrival';
import { createProjectAction } from './create-project-action';
import { duplicateProjectAction } from './duplicate-project-action';
import { DuplicateProjectDrawer } from './duplicate-project-drawer';
import { openProjectAction } from './open-project-action';
import { ProjectPickerBody, ProjectPickerFrame } from './project-picker.js';

/**
 * The Duplicate slice — Screens §04 §7 as closed by the Duplicate closure
 * (D1–D10), driven through the real frame, drawer and frozen primitives.
 *
 * The seams are create-project.test.tsx's: each Server Action is replaced by
 * a recorder — its real body is one call into a use case that
 * @sayva/application tests against the real contract, and
 * duplicate-project-action.test.ts runs Duplicate's against a real
 * workspace — and `useRouter` is replaced, because there is no App Router
 * here. Where the order of a re-scan matters, `routed` gives `refresh()` and
 * `push()` the App Router's transition semantics.
 */

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push, replace: push }) }));
vi.mock('./duplicate-project-action', () => ({ duplicateProjectAction: vi.fn() }));
vi.mock('./create-project-action', () => ({ createProjectAction: vi.fn() }));
vi.mock('./open-project-action', () => ({ openProjectAction: vi.fn() }));
const action = vi.mocked(duplicateProjectAction);
const createAction = vi.mocked(createProjectAction);
const openAction = vi.mocked(openProjectAction);

const ROOT = 'C:/authoring/projects';
const SOURCE = 'id-2';
const COPY_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const READ_WHERE = `${ROOT}/${SOURCE}.sayva`;
const WRITE_WHERE = `${ROOT}/${COPY_ID}.sayva`;

const listed: ProjectListView = {
  status: 'listed',
  projects: [
    {
      id: 'id-1',
      name: 'ArSL Curriculum',
      updatedAt: '2026-09-28T08:00:00.000Z',
      updatedAgo: '1h ago',
    },
    { id: SOURCE, name: 'BSL Pilot', updatedAt: '2026-09-25T09:00:00.000Z', updatedAgo: '3d ago' },
    {
      id: 'id-3',
      name: 'ASL Foundations',
      updatedAt: '2026-09-14T09:00:00.000Z',
      updatedAgo: '2w ago',
    },
  ],
};
const projects = listed.status === 'listed' ? listed.projects : [];
const firstRun: ProjectListView = { status: 'first-run' };
const listFailed: ProjectListView = {
  status: 'error',
  traceId: '0d1e2f3a-4b5c-4d6e-8f70-9a8b7c6d5e4f',
  location: ROOT,
};
/** What a re-scan finds once the copy is written: newest first, as PP-04 orders it. */
const listedWithCopy: ProjectListView = {
  status: 'listed',
  projects: [
    {
      id: COPY_ID,
      name: 'BSL Pilot — Spring',
      updatedAt: '2026-09-29T10:00:00.000Z',
      updatedAgo: '0m ago',
    },
    ...projects,
  ],
};
/** What a re-scan finds once a file is gone. */
const listedWithout = (id: string): ProjectListView => ({
  status: 'listed',
  projects: projects.filter((p) => p.id !== id),
});

const duplicated = (name = 'BSL Pilot — Spring'): DuplicateProjectResult => ({
  status: 'duplicated',
  project: {
    id: COPY_ID,
    name,
    schemaVersion: 1,
    state: 'Created',
    createdAt: '2026-09-29T10:00:00.000Z',
    updatedAt: '2026-09-29T10:00:00.000Z',
    tags: [],
  },
});
const invalidName: DuplicateProjectResult = { status: 'invalid-name' };
const notHere: DuplicateProjectResult = { status: 'not-here' };
const cantRead = (traceId: string): DuplicateProjectResult => ({
  status: 'cant-read',
  traceId,
  location: READ_WHERE,
});
const writeFailed = (traceId: string): DuplicateProjectResult => ({
  status: 'write-failed',
  traceId,
  location: WRITE_WHERE,
});

const picker = (view: ProjectListView) => (
  <ProjectPickerFrame root={ROOT}>
    <ProjectPickerBody root={ROOT} view={view} />
  </ProjectPickerFrame>
);

beforeEach(() => {
  action.mockReset();
  createAction.mockReset();
  openAction.mockReset();
  refresh.mockReset();
  push.mockReset();
});
afterEach(() => {
  clearOpenArrival();
});

// --- the route, as the App Router serves it --------------------------------

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

type Payload = { kind: 'picker'; view: ProjectListView } | { kind: 'workspace'; href: string };

/**
 * The route as the App Router serves it — create-project.test.tsx's harness.
 * `refresh()` and `push()` each start a transition that renders the route
 * from a deferred server payload, so the screen already shown stays until
 * the test resolves it. A `picker` payload keeps the frame, and the drawer in
 * it, mounted; a `workspace` payload replaces the whole Picker.
 */
async function routed(view: ProjectListView) {
  const rescans: Deferred<Payload>[] = [];
  const navigations: { href: string; payload: Deferred<Payload> }[] = [];
  let show!: (payload: Promise<Payload>) => void;

  function Screen({ payload }: { payload: Promise<Payload> }) {
    const shown = use(payload);
    return shown.kind === 'workspace' ? <main aria-label="Workspace Entry" /> : picker(shown.view);
  }
  function Route() {
    const [payload, setPayload] = useState(() =>
      Promise.resolve<Payload>({ kind: 'picker', view }),
    );
    show = setPayload;
    return (
      <Suspense fallback={null}>
        <Screen payload={payload} />
      </Suspense>
    );
  }

  refresh.mockImplementation(() => {
    const payload = deferred<Payload>();
    rescans.push(payload);
    startTransition(() => show(payload.promise));
  });
  push.mockImplementation((href: string) => {
    const payload = deferred<Payload>();
    navigations.push({ href, payload });
    startTransition(() => show(payload.promise));
  });

  await act(async () => {
    render(<Route />);
  });

  return {
    rescans,
    navigations,
    /** The pending re-scan answers with this list. */
    rescanned: (next: ProjectListView) =>
      act(async () => rescans.at(-1)!.resolve({ kind: 'picker', view: next })),
    /** The pending navigation lands on the Workspace Entry. */
    arrived: () =>
      act(async () =>
        navigations.at(-1)!.payload.resolve({ kind: 'workspace', href: navigations.at(-1)!.href }),
      ),
  };
}

// --- helpers -------------------------------------------------------------

const rowNamed = (name: string) =>
  screen.getAllByRole('listitem').find((item) => item.firstChild?.textContent === name)!;
/** A row's Duplicate from bp.md up — the enabled one. */
const duplicateOf = (name: string) =>
  within(rowNamed(name)).getAllByRole('button', { name: 'Duplicate' })[0]!;
const openOf = (name: string) => within(rowNamed(name)).getByRole('button', { name: 'Open' });
const headerNewProject = () =>
  within(screen.getByRole('heading', { level: 1 }).closest('header')!).getAllByRole('button', {
    name: 'New Project',
  })[0]!;

/** A real click moves focus to the button first, which jsdom's click does not. */
function press(button: HTMLElement) {
  button.focus();
  fireEvent.click(button);
}

const drawer = () => screen.getByRole('dialog', { name: 'Duplicate' });
const queryDrawer = () => screen.queryByRole('dialog', { name: 'Duplicate' });
const nameField = () => within(drawer()).getByRole('textbox', { name: 'Project name' });
const confirmButton = () => within(drawer()).getByRole('button', { name: 'Duplicate Project' });
const cancelButton = () => within(drawer()).getByRole('button', { name: 'Cancel' });
const retryButton = () => within(drawer()).getByRole('button', { name: 'Retry' });
const liveRegion = () => document.querySelector('[aria-live="assertive"]')!;

function openDuplicate(name = 'BSL Pilot') {
  press(duplicateOf(name));
  return drawer();
}

function type(value: string) {
  fireEvent.change(nameField(), { target: { value } });
}

/** Submits and lets the action's promise settle. */
async function submit(via: 'button' | 'cmd-enter' = 'button') {
  await act(async () => {
    if (via === 'button') press(confirmButton());
    else fireEvent.keyDown(drawer(), { key: 'Enter', metaKey: true });
  });
}

/** Resolves a held action result and lets what it starts run. */
const answer = <T,>(held: Deferred<T>, value: T) => act(async () => held.resolve(value));

function describedBy(element: Element): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

function classOf(node: React.ReactElement) {
  const { container, unmount } = render(node);
  const className = container.querySelector('button')!.className;
  unmount();
  return className;
}

// --- the row (D1) ----------------------------------------------------------

describe('the row — Open, then Duplicate (D1)', () => {
  it("opens the Duplicate drawer for that row's Project", async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openDuplicate('BSL Pilot');
    await submit();
    expect(action).toHaveBeenCalledWith(SOURCE, '');
  });

  it('shows no Duplicate on a row Open found unreadable — the inline error replaces both', async () => {
    const unreadable: OpenProjectResult = {
      status: 'cant-read',
      traceId: 't-open',
      location: READ_WHERE,
    };
    openAction.mockResolvedValue(unreadable);
    render(picker(listed));

    await act(async () => press(openOf('BSL Pilot')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    const row = screen.getAllByRole('listitem')[1]!;
    expect(within(row).getByRole('alert')).toBeTruthy();
    expect(within(row).queryByRole('button', { name: 'Duplicate' })).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Open' })).toBeNull();
    // The other rows keep both actions.
    expect(
      within(rowNamed('ArSL Curriculum')).getAllByRole('button', { name: 'Duplicate' }),
    ).toHaveLength(2);
  });
});

// --- the drawer (D2) -------------------------------------------------------

describe('the drawer (D2)', () => {
  it('is SyDrawer: a non-modal dialog labelled by its title, "Duplicate"', () => {
    render(picker(listed));
    const dialog = openDuplicate();

    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Duplicate' })).toBeTruthy();
  });

  it('holds one field, "Project name", empty — never prefilled', () => {
    render(picker(listed));
    const dialog = openDuplicate();

    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1);
    expect((nameField() as HTMLInputElement).value).toBe('');
  });

  it('never names the source inside the drawer', () => {
    render(picker(listed));
    const dialog = openDuplicate('BSL Pilot');
    expect(within(dialog).queryByText(/BSL Pilot/)).toBeNull();
  });

  it('has Cancel (secondary) and Duplicate Project (primary) as its footer actions', () => {
    render(picker(listed));
    openDuplicate();

    expect(cancelButton().className).toBe(classOf(<SyButton variant="secondary">x</SyButton>));
    expect(confirmButton().className).toBe(classOf(<SyButton>x</SyButton>));
    expect(
      within(drawer())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cancel', 'Duplicate Project']);
  });

  it('takes focus into its panel, not the name field', () => {
    render(picker(listed));
    const dialog = openDuplicate();
    expect(document.activeElement).toBe(dialog);
  });

  it('passes an accessibility check, open', async () => {
    const { container } = render(picker(listed));
    openDuplicate();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// --- validation (D3) -------------------------------------------------------

describe('validation — Domain decides, on submission only (D3)', () => {
  it('shows nothing while the author types, and calls nothing', () => {
    render(picker(listed));
    openDuplicate();
    for (const value of ['', '   ', 'A', '']) type(value);

    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText('Give the project a name.')).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('sends the source and what was typed, untouched — Domain judges it', async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openDuplicate();
    type('   ');
    await submit();
    expect(action).toHaveBeenCalledWith(SOURCE, '   ');
  });

  it('shows "Give the project a name." on the field when the name is refused, and stays open', async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openDuplicate();
    await submit();

    expect(nameField().getAttribute('aria-invalid')).toBe('true');
    expect(describedBy(nameField())).toContain('Give the project a name.');
    expect(drawer()).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('submits on ⌘Enter too, per SyDrawer', async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openDuplicate();
    await submit('cmd-enter');

    expect(action).toHaveBeenCalledTimes(1);
    expect(nameField().getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the message while the author types, until the next result replaces it', async () => {
    action.mockResolvedValueOnce(invalidName).mockResolvedValueOnce(writeFailed('t-1'));
    render(picker(listed));
    openDuplicate();
    await submit();

    type('BSL Pilot — Spring');
    expect(nameField().getAttribute('aria-invalid')).toBe('true');

    await submit();
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(within(drawer()).getByRole('alert')).toBeTruthy();
  });

  it('passes an accessibility check, invalid', async () => {
    action.mockResolvedValue(invalidName);
    const { container } = render(picker(listed));
    openDuplicate();
    await submit();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// --- busy (D4) ---------------------------------------------------------------

describe('busy — SyButton loading, the drawer open (D4)', () => {
  async function busy() {
    const held = deferred<DuplicateProjectResult>();
    action.mockReturnValue(held.promise);
    render(picker(listed));
    openDuplicate();
    type('BSL Pilot — Spring');
    await submit();
    return held;
  }

  it("keeps the drawer open and the name, with Duplicate Project in SyButton's loading state", async () => {
    await busy();

    expect(drawer()).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('BSL Pilot — Spring');
    expect(confirmButton().getAttribute('aria-busy')).toBe('true');
    expect(confirmButton().textContent).toContain('Duplicate Project');
    // Loading, not disabled: focus stays on it (SyButton's contract).
    expect(confirmButton().hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(confirmButton());
  });

  it('keeps Cancel available', async () => {
    await busy();
    expect(cancelButton().hasAttribute('disabled')).toBe(false);
    expect(cancelButton().getAttribute('aria-busy')).toBeNull();
  });

  it('refuses a second submission, by click and by ⌘Enter', async () => {
    await busy();
    await submit();
    await submit('cmd-enter');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('passes an accessibility check, busy', async () => {
    await busy();
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

// --- duplicated (D5) ---------------------------------------------------------

describe('duplicated — close, re-scan, focus back, nothing opens (D5)', () => {
  it('closes the drawer without waiting for the re-scan it starts', async () => {
    const route = await routed(listed);
    action.mockResolvedValue(duplicated());
    openDuplicate();
    type('BSL Pilot — Spring');
    await submit();

    // Closed while the one re-scan is still unanswered — unlike D6.
    expect(queryDrawer()).toBeNull();
    expect(route.rescans).toHaveLength(1);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    await route.rescanned(listedWithCopy);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it("returns focus to the source row's Duplicate, and it stays there as the copy arrives first", async () => {
    const route = await routed(listed);
    action.mockResolvedValue(duplicated());
    const trigger = duplicateOf('BSL Pilot');
    openDuplicate('BSL Pilot');
    type('BSL Pilot — Spring');
    await submit();

    expect(document.activeElement).toBe(trigger);
    await route.rescanned(listedWithCopy);

    expect(screen.getAllByRole('listitem').map((item) => item.firstChild?.textContent)).toEqual([
      'BSL Pilot — Spring',
      'ArSL Curriculum',
      'BSL Pilot',
      'ASL Foundations',
    ]);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.isConnected).toBe(true);
  });

  it('opens nothing, marks no arrival and announces nothing', async () => {
    action.mockResolvedValue(duplicated());
    render(picker(listed));
    openDuplicate();
    type('BSL Pilot — Spring');
    await submit();

    expect(push).not.toHaveBeenCalled();
    expect(isOpenArrival(COPY_ID)).toBe(false);
    expect(liveRegion().textContent).toBe('');
  });
});

// --- not here (D6) -----------------------------------------------------------

describe('the source is not here — busy until the re-scan settles (D6)', () => {
  async function missing() {
    const route = await routed(listed);
    action.mockResolvedValue(notHere);
    openDuplicate('BSL Pilot');
    type('BSL Pilot — Spring');
    await submit();
    return route;
  }

  it('stays open and busy while the list re-scans, and announces nothing yet', async () => {
    const route = await missing();

    expect(route.rescans).toHaveLength(1);
    expect(drawer()).toBeTruthy();
    expect(confirmButton().getAttribute('aria-busy')).toBe('true');
    expect(liveRegion().textContent).toBe('');
    // Still busy: a second submission is refused.
    await submit();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('closes once the re-scan has rendered, then announces exactly "Can\'t find that project"', async () => {
    const route = await missing();
    await route.rescanned(listedWithout(SOURCE));

    expect(screen.queryByText('BSL Pilot')).toBeNull();
    expect(queryDrawer()).toBeNull();
    expect(liveRegion().textContent).toBe("Can't find that project");
    expect(push).not.toHaveBeenCalled();
  });

  it('sends focus to no removed control — it is left where the drawer leaves it', async () => {
    const route = await missing();
    await route.rescanned(listedWithout(SOURCE));
    expect(document.activeElement).toBe(document.body);
  });

  it('settles on first-run too, when the source was the last Project', async () => {
    const route = await missing();
    await route.rescanned(firstRun);

    expect(screen.getAllByRole('heading', { name: 'No projects yet' }).length).toBeGreaterThan(0);
    expect(queryDrawer()).toBeNull();
    expect(liveRegion().textContent).toBe("Can't find that project");
    expect(document.activeElement).toBe(document.body);
  });

  it("settles on the list's own error too, and its Retry takes no focus", async () => {
    const route = await missing();
    await route.rescanned(listFailed);

    expect(screen.getByRole('heading', { name: "Can't read the projects folder" })).toBeTruthy();
    expect(queryDrawer()).toBeNull();
    // Both are assertive: the list's alert and then this announcement — the
    // overlap risk is recorded, and no delay is added between them.
    expect(liveRegion().textContent).toBe("Can't find that project");
    expect(document.activeElement).toBe(document.body);
  });

  it('returns focus to the source row by A07 when the re-scan still lists it', async () => {
    const route = await missing();
    await route.rescanned(listed);

    expect(queryDrawer()).toBeNull();
    expect(document.activeElement).toBe(duplicateOf('BSL Pilot'));
    expect(liveRegion().textContent).toBe("Can't find that project");
  });

  it('announces nothing when the author closes the drawer during the wait — the re-scan stands', async () => {
    const route = await missing();
    press(cancelButton());
    expect(queryDrawer()).toBeNull();

    await route.rescanned(listedWithout(SOURCE));
    expect(liveRegion().textContent).toBe('');
    expect(route.rescans).toHaveLength(1);
  });
});

// --- can't read and write-failed (D7, D8) -----------------------------------

describe.each([
  ['the source cannot be read (D7)', cantRead, READ_WHERE],
  ['the copy cannot be written (D8)', writeFailed, WRITE_WHERE],
] as const)('%s', (_label, failure, where) => {
  async function failOnce(traceId = 't-1') {
    action.mockResolvedValueOnce(failure(traceId));
    render(picker(listed));
    openDuplicate();
    type('BSL Pilot — Spring');
    await submit();
  }

  it('keeps the drawer open and the typed name', async () => {
    await failOnce();
    expect(drawer()).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('BSL Pilot — Spring');
  });

  it(`shows "Can't duplicate the project", the location and the trace ID, below the field`, async () => {
    await failOnce('t-1');
    const panel = within(drawer()).getByRole('alert');

    expect(
      within(panel).getByRole('heading', { level: 3, name: "Can't duplicate the project" }),
    ).toBeTruthy();
    expect(panel.textContent).toContain(where);
    expect(panel.textContent).toContain('t-1');
    // Never on the field: its invalid state is the name's alone.
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
  });

  it("hands Retry focus, because the author's submission caused the state", async () => {
    await failOnce();
    expect(document.activeElement).toBe(retryButton());
  });

  it('does not re-scan the list, and opens and announces nothing', async () => {
    await failOnce();
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(liveRegion().textContent).toBe('');
  });

  it('passes an accessibility check', async () => {
    await failOnce();
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

// --- Retry (D9) --------------------------------------------------------------

describe('Retry — the whole command again, with the name now in the field (D9)', () => {
  async function failed() {
    action.mockResolvedValueOnce(cantRead('t-1'));
    render(picker(listed));
    openDuplicate();
    type('BSL Pilot — Spring');
    await submit();
  }

  it('sends the source and the current field value, not the one that failed', async () => {
    await failed();
    action.mockResolvedValueOnce(writeFailed('t-2'));
    type('BSL Pilot — Autumn');
    await act(async () => press(retryButton()));

    expect(action).toHaveBeenNthCalledWith(2, SOURCE, 'BSL Pilot — Autumn');
  });

  it('shows a refused name on the field, replacing the panel', async () => {
    await failed();
    action.mockResolvedValueOnce(invalidName);
    type('');
    await act(async () => press(retryButton()));

    expect(nameField().getAttribute('aria-invalid')).toBe('true');
    expect(within(drawer()).queryByRole('alert')).toBeNull();
  });

  it('gives a second failure its own panel, which hands Retry focus again', async () => {
    await failed();
    action.mockResolvedValueOnce(writeFailed('t-2'));
    await act(async () => press(retryButton()));

    const panel = within(drawer()).getByRole('alert');
    expect(panel.textContent).toContain('t-2');
    expect(panel.textContent).not.toContain('t-1');
    expect(document.activeElement).toBe(retryButton());
  });

  it('closes and re-scans when it succeeds', async () => {
    await failed();
    action.mockResolvedValueOnce(duplicated());
    await act(async () => press(retryButton()));

    expect(queryDrawer()).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

// --- sessions (DP-6) ---------------------------------------------------------

describe('one drawer at a time — sessions', () => {
  describe('the same trigger does nothing', () => {
    it("keeps the open Duplicate drawer and what was typed when that row's Duplicate is pressed again", () => {
      render(picker(listed));
      const first = openDuplicate('BSL Pilot');
      type('Draft');
      press(duplicateOf('BSL Pilot'));

      expect(drawer()).toBe(first);
      expect((nameField() as HTMLInputElement).value).toBe('Draft');
    });

    it("keeps the open Create drawer and what was typed when the header's New Project is pressed again", () => {
      render(picker(listed));
      press(headerNewProject());
      const first = screen.getByRole('dialog', { name: 'New Project' });
      fireEvent.change(within(first).getByRole('textbox', { name: 'Project name' }), {
        target: { value: 'Draft' },
      });
      press(headerNewProject());

      const again = screen.getByRole('dialog', { name: 'New Project' });
      expect(again).toBe(first);
      expect((within(again).getByRole('textbox') as HTMLInputElement).value).toBe('Draft');
    });

    it("treats first-run's New Project and the header's as the same drawer", () => {
      render(picker(firstRun));
      const [wide] = screen.getAllByRole('status');
      press(within(wide!).getByRole('button', { name: 'New Project' }));
      const first = screen.getByRole('dialog', { name: 'New Project' });
      fireEvent.change(within(first).getByRole('textbox'), { target: { value: 'Draft' } });

      press(within(wide!).getByRole('button', { name: 'New Project' }));
      press(headerNewProject());
      expect(screen.getByRole('dialog', { name: 'New Project' })).toBe(first);
      expect((within(first).getByRole('textbox') as HTMLInputElement).value).toBe('Draft');
    });
  });

  describe('another trigger replaces the drawer, with a fresh SyDrawer', () => {
    it("mounts a new drawer for another row's Duplicate: empty, and focus in its panel", () => {
      render(picker(listed));
      const first = openDuplicate('BSL Pilot');
      type('Draft');
      press(duplicateOf('ASL Foundations'));

      const second = drawer();
      expect(second).not.toBe(first);
      expect(first.isConnected).toBe(false);
      expect((nameField() as HTMLInputElement).value).toBe('');
      expect(document.activeElement).toBe(second);
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });

    it("sends the new drawer's submissions for its own row", async () => {
      action.mockResolvedValue(invalidName);
      render(picker(listed));
      openDuplicate('BSL Pilot');
      press(duplicateOf('ASL Foundations'));
      await submit();
      expect(action).toHaveBeenCalledWith('id-3', '');
    });

    it("returns focus to the new drawer's own trigger when it closes", () => {
      render(picker(listed));
      openDuplicate('BSL Pilot');
      press(duplicateOf('ASL Foundations'));
      press(cancelButton());
      expect(document.activeElement).toBe(duplicateOf('ASL Foundations'));
    });

    it('replaces Duplicate with Create when New Project is pressed', () => {
      render(picker(listed));
      openDuplicate();
      press(headerNewProject());

      expect(queryDrawer()).toBeNull();
      const create = screen.getByRole('dialog', { name: 'New Project' });
      expect(document.activeElement).toBe(create);
    });

    it('replaces Create with Duplicate when a row’s Duplicate is pressed', () => {
      render(picker(listed));
      press(headerNewProject());
      openDuplicate();

      expect(screen.queryByRole('dialog', { name: 'New Project' })).toBeNull();
      expect(document.activeElement).toBe(drawer());
    });
  });

  describe('Cancel and Escape end the session', () => {
    it.each([
      ['Cancel', () => press(cancelButton())],
      ['Escape', () => fireEvent.keyDown(drawer(), { key: 'Escape' })],
    ] as const)('%s closes the drawer and returns focus to its Duplicate', (_label, close) => {
      render(picker(listed));
      openDuplicate('BSL Pilot');
      close();

      expect(queryDrawer()).toBeNull();
      expect(document.activeElement).toBe(duplicateOf('BSL Pilot'));
    });
  });

  describe('a late result from an ended session', () => {
    async function heldThenClosed(end: 'cancel' | 'escape' | 'replace') {
      const held = deferred<DuplicateProjectResult>();
      action.mockReturnValueOnce(held.promise);
      render(picker(listed));
      openDuplicate('BSL Pilot');
      type('BSL Pilot — Spring');
      await submit();
      if (end === 'cancel') press(cancelButton());
      if (end === 'escape') fireEvent.keyDown(drawer(), { key: 'Escape' });
      if (end === 'replace') press(duplicateOf('ASL Foundations'));
      return held;
    }

    it.each(['cancel', 'escape'] as const)(
      'a copy written after %s still re-scans — and shows, announces and focuses nothing',
      async (end) => {
        const held = await heldThenClosed(end);
        const focused = document.activeElement;
        await answer(held, duplicated());

        expect(refresh).toHaveBeenCalledTimes(1);
        expect(queryDrawer()).toBeNull();
        expect(liveRegion().textContent).toBe('');
        expect(document.activeElement).toBe(focused);
        expect(push).not.toHaveBeenCalled();
      },
    );

    it('a source gone after Cancel re-scans, and announces nothing', async () => {
      const held = await heldThenClosed('cancel');
      await answer(held, notHere);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(liveRegion().textContent).toBe('');
    });

    it.each([
      ['a refused name', invalidName],
      ['an unreadable source', cantRead('t-late')],
      ['a failed write', writeFailed('t-late')],
    ] as const)('%s after Cancel changes nothing at all', async (_label, late) => {
      const held = await heldThenClosed('cancel');
      await answer(held, late);

      expect(refresh).not.toHaveBeenCalled();
      expect(queryDrawer()).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it.each([
      ['a copy written', duplicated()],
      ['a source gone', notHere],
      ['a refused name', invalidName],
      ['a failed write', writeFailed('t-late')],
    ] as const)(
      '%s after replacement leaves the new drawer exactly as it was',
      async (_label, late) => {
        const held = await heldThenClosed('replace');
        const replacement = drawer();
        type('Second draft');
        nameField().focus();
        await answer(held, late);

        expect(drawer()).toBe(replacement);
        expect((nameField() as HTMLInputElement).value).toBe('Second draft');
        expect(nameField().getAttribute('aria-invalid')).toBeNull();
        expect(within(drawer()).queryByRole('alert')).toBeNull();
        expect(confirmButton().getAttribute('aria-busy')).toBeNull();
        expect(document.activeElement).toBe(nameField());
        expect(liveRegion().textContent).toBe('');
      },
    );
  });

  /**
   * The drawer's own guard, apart from the frame. Through the frame an ended
   * session's drawer is also unmounted and its close is bound to its session,
   * so either of those alone hides whether the drawer itself refuses a late
   * result. Here its parent ignores `onClose` and keeps it mounted, so only
   * the drawer's guard stands between a late result and the screen.
   */
  describe('the drawer itself ignores a result that arrives after its session ended', () => {
    function standalone() {
      const onClose = vi.fn();
      const onNotHere = vi.fn();
      render(
        <DuplicateProjectDrawer
          projectId={SOURCE}
          onClose={onClose}
          onNotHere={onNotHere}
          triggerRef={{ current: null }}
        />,
      );
      return { onClose, onNotHere };
    }

    it.each([
      ['a copy written', duplicated(), 1],
      ['a source gone', notHere, 1],
      ['a refused name', invalidName, 0],
      ['an unreadable source', cantRead('t-late'), 0],
      ['a failed write', writeFailed('t-late'), 0],
    ] as const)(
      '%s after Cancel: closes nothing again, announces and shows nothing',
      async (_label, late, rescans) => {
        const held = deferred<DuplicateProjectResult>();
        action.mockReturnValueOnce(held.promise);
        const { onClose, onNotHere } = standalone();
        type('BSL Pilot — Spring');
        await submit();
        press(cancelButton());
        expect(onClose).toHaveBeenCalledTimes(1);

        await answer(held, late);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onNotHere).not.toHaveBeenCalled();
        expect(refresh).toHaveBeenCalledTimes(rescans);
        expect(within(drawer()).queryByRole('alert')).toBeNull();
        expect(nameField().getAttribute('aria-invalid')).toBeNull();
      },
    );
  });

  describe("Create's sessions keep Create-then-Open's rules when replaced (CO-4)", () => {
    const created: CreateProjectResult = {
      status: 'created',
      project: { ...(duplicated() as { project: never }).project, name: 'ArSL Curriculum' },
    };

    it('a Create replaced during its write re-scans and opens nothing', async () => {
      const held = deferred<CreateProjectResult>();
      createAction.mockReturnValueOnce(held.promise);
      render(picker(listed));
      press(headerNewProject());
      fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), {
        target: { value: 'ArSL Curriculum' },
      });
      await act(async () => press(screen.getByRole('button', { name: 'Create Project' })));
      openDuplicate();

      await answer(held, created);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
      expect(isOpenArrival(COPY_ID)).toBe(false);
      expect(drawer()).toBeTruthy();
    });

    it('a Create replaced while its list re-scans never navigates', async () => {
      const route = await routed(listed);
      createAction.mockResolvedValueOnce(created);
      press(headerNewProject());
      fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), {
        target: { value: 'ArSL Curriculum' },
      });
      await act(async () => press(screen.getByRole('button', { name: 'Create Project' })));
      expect(route.rescans).toHaveLength(1);

      openDuplicate();
      await route.rescanned(listedWithCopy);

      expect(push).not.toHaveBeenCalled();
      expect(isOpenArrival(COPY_ID)).toBe(false);
      expect(drawer()).toBeTruthy();
    });
  });
});

// --- Open during a Duplicate -------------------------------------------------

describe('Open during an in-flight Duplicate', () => {
  it('navigates as usual; the late copy only re-scans, on whatever route is shown', async () => {
    const route = await routed(listed);
    const held = deferred<DuplicateProjectResult>();
    action.mockReturnValueOnce(held.promise);
    const opened: OpenProjectResult = {
      status: 'opened',
      project: { ...(duplicated() as { project: never }).project, id: 'id-1' },
    };
    openAction.mockResolvedValueOnce(opened);

    openDuplicate('BSL Pilot');
    type('BSL Pilot — Spring');
    await submit();
    await act(async () => press(openOf('ArSL Curriculum')));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(route.navigations.map((n) => n.href)).toEqual(['/workspace/id-1']);
    await route.arrived();
    expect(screen.getByRole('main', { name: 'Workspace Entry' })).toBeTruthy();

    await answer(held, duplicated());
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(route.navigations).toHaveLength(1);
  });
});
