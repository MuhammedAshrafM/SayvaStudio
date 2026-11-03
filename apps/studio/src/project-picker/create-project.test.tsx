import { Suspense, startTransition, use, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import type { CreateProjectResult, ProjectListView } from '@sayva/application';
import { SyButton, SyStateBlock } from '@sayva/design-system';
import { clearOpenArrival, isOpenArrival } from '../workspace-entry/open-arrival';
import { createProjectAction } from './create-project-action';
import { openProjectAction } from './open-project-action';
import { ProjectPickerBody, ProjectPickerFrame, ProjectPickerLoading } from './project-picker.js';

/**
 * The Create slice — Screens §04 §3 as closed by the Create decision closure
 * (B1–B15) and the Create-then-Open closure (CO-1 to CO-7), driven through
 * the real frame, drawer and frozen primitives.
 *
 * Two seams, both at the edge of what jsdom can host. The Server Action is
 * replaced by a recorder: its real body is one call into the Create command,
 * which @sayva/application's own tests cover against the real contract, and
 * it reaches the server-only Composition Root. And `useRouter` is replaced,
 * because there is no App Router here. The re-scan contract is exactly
 * `router.refresh()` and opening is `router.push()`; where their order
 * matters, `routed` below gives both the App Router's transition semantics.
 */

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push, replace: push }) }));
vi.mock('./create-project-action', () => ({ createProjectAction: vi.fn() }));
// The Picker's rows import the Open action, which reaches the same
// server-only Composition Root. Open is not exercised here.
vi.mock('./open-project-action', () => ({ openProjectAction: vi.fn() }));
const action = vi.mocked(createProjectAction);

const ROOT = 'C:/authoring/projects';
const WHERE = `${ROOT}/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva`;

/** The id `created()` gives the new Project unless a test names another. */
const CREATED_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const created = (name: string, id = CREATED_ID): CreateProjectResult => ({
  status: 'created',
  project: {
    id,
    name,
    schemaVersion: 1,
    state: 'Created',
    createdAt: '2026-09-29T10:00:00.000Z',
    updatedAt: '2026-09-29T10:00:00.000Z',
    tags: [],
  },
});
const invalidName: CreateProjectResult = { status: 'invalid-name' };
const writeFailed = (traceId: string): CreateProjectResult => ({
  status: 'write-failed',
  traceId,
  location: WHERE,
});

const listed: ProjectListView = {
  status: 'listed',
  projects: [
    { id: 'id-1', name: 'BSL Pilot', updatedAt: '2026-09-28T08:00:00.000Z', updatedAgo: '1d ago' },
  ],
};
const firstRun: ProjectListView = { status: 'first-run' };

const picker = (view: ProjectListView) => (
  <ProjectPickerFrame root={ROOT}>
    <ProjectPickerBody root={ROOT} view={view} />
  </ProjectPickerFrame>
);

beforeEach(() => {
  action.mockReset();
  refresh.mockReset();
  push.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  clearOpenArrival();
});

// --- the route, as the App Router serves it --------------------------------

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

/** What the server answers a re-scan or a navigation with. */
type Payload = { kind: 'picker'; view: ProjectListView } | { kind: 'workspace'; href: string };

/**
 * The route as the App Router serves it, so the hand-off's order can be
 * watched rather than assumed.
 *
 * `router.refresh()` and `router.push()` each start a transition that renders
 * the route from a new server payload — what the App Router itself does — so
 * the screen already shown stays until that payload arrives. Each payload is
 * a deferred this test resolves when it chooses. A `workspace` payload
 * replaces the whole Picker, frame and drawer included, as navigating to
 * `/workspace/{projectId}` does; a `picker` payload keeps the frame mounted
 * and gives the list beneath it a new view.
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
    /** The pending navigation ends back on the Picker — a redirect to `/` (CO-5). */
    returned: (next: ProjectListView) =>
      act(async () => navigations.at(-1)!.payload.resolve({ kind: 'picker', view: next })),
  };
}

/** `listed` once a re-scan finds the created Project, newest first. */
const listedWithCreated = (name = 'ArSL Curriculum', id = CREATED_ID): ProjectListView => ({
  status: 'listed',
  projects: [
    { id, name, updatedAt: '2026-09-29T10:00:00.000Z', updatedAgo: '0m ago' },
    ...(listed.status === 'listed' ? listed.projects : []),
  ],
});

// --- helpers -------------------------------------------------------------

/** The header's New Project from bp.md up — the enabled one. */
const headerNewProject = () =>
  within(screen.getByRole('heading', { level: 1 }).closest('header')!).getAllByRole('button', {
    name: 'New Project',
  })[0]!;

/** A real click moves focus to the button first, which jsdom's click does not. */
function press(button: HTMLElement) {
  button.focus();
  fireEvent.click(button);
}

const drawer = () => screen.getByRole('dialog', { name: 'New Project' });
const nameField = () => screen.getByRole('textbox', { name: 'Project name' });
const createButton = () => within(drawer()).getByRole('button', { name: 'Create Project' });
const cancelButton = () => within(drawer()).getByRole('button', { name: 'Cancel' });

function openFromHeader() {
  press(headerNewProject());
  return drawer();
}

function type(value: string) {
  fireEvent.change(nameField(), { target: { value } });
}

/** Submits and lets the action's promise settle. */
async function submit(via: 'button' | 'cmd-enter' = 'button') {
  await act(async () => {
    if (via === 'button') press(createButton());
    else fireEvent.keyDown(drawer(), { key: 'Enter', metaKey: true });
  });
}

function describedBy(element: Element): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

/** The className a frozen primitive renders for a given configuration. */
function classOf(node: React.ReactElement, pick: (container: HTMLElement) => Element) {
  const { container, unmount } = render(node);
  const className = pick(container).className;
  unmount();
  return className;
}

// --- the drawer ------------------------------------------------------------

describe('entry — New Project opens the Create drawer', () => {
  it('opens from the header', () => {
    render(picker(listed));
    expect(openFromHeader()).toBeTruthy();
  });

  it('opens from first-run, the same drawer', () => {
    render(picker(firstRun));
    const [wide] = screen.getAllByRole('status');
    press(within(wide!).getByRole('button', { name: 'New Project' }));
    expect(drawer()).toBeTruthy();
  });

  it('is SyDrawer: a non-modal dialog labelled by its title, "New Project" (B3)', () => {
    render(picker(listed));
    const dialog = openFromHeader();

    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect(within(dialog).getByRole('heading', { level: 2, name: 'New Project' })).toBeTruthy();
  });

  it('holds one field, "Project name", and nothing else to fill in (B7)', () => {
    render(picker(listed));
    const dialog = openFromHeader();

    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1);
    expect(nameField()).toBeTruthy();
    expect(within(dialog).queryByRole('combobox')).toBeNull();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
  });

  it('has Cancel (secondary) and Create Project (primary) as its footer actions (B4, B13)', () => {
    render(picker(listed));
    openFromHeader();

    const secondary = classOf(<SyButton variant="secondary">x</SyButton>, (c) =>
      c.querySelector('button')!,
    );
    const primary = classOf(<SyButton>x</SyButton>, (c) => c.querySelector('button')!);
    expect(cancelButton().className).toBe(secondary);
    expect(createButton().className).toBe(primary);
    expect(
      within(drawer())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cancel', 'Create Project']);
  });

  it('passes an accessibility check, open', async () => {
    const { container } = render(picker(listed));
    openFromHeader();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// --- validation (B13) -------------------------------------------------------

describe('validation — Domain decides, on submission only (B12, B13)', () => {
  it('shows nothing while the author types, whatever they type', () => {
    render(picker(listed));
    openFromHeader();

    for (const value of ['', '   ', 'A', '']) type(value);
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText(/Give the project a name\./)).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('sends what was typed to the Create command, untouched — Domain judges it', async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openFromHeader();
    type('   ');
    await submit();

    expect(action).toHaveBeenCalledWith('   ');
  });

  it('shows "Give the project a name." on the field when the name is refused', async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openFromHeader();
    await submit();

    expect(nameField().getAttribute('aria-invalid')).toBe('true');
    expect(describedBy(nameField())).toContain('Give the project a name.');
    expect(drawer()).toBeTruthy();
  });

  it('submits on ⌘Enter too, per SyDrawer', async () => {
    action.mockResolvedValue(invalidName);
    render(picker(listed));
    openFromHeader();
    await submit('cmd-enter');

    expect(action).toHaveBeenCalledTimes(1);
    expect(nameField().getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the message while the author types, until the next result replaces it', async () => {
    action.mockResolvedValueOnce(invalidName).mockResolvedValueOnce(writeFailed('t-1'));
    render(picker(listed));
    openFromHeader();
    await submit();

    type('ArSL Curriculum');
    expect(nameField().getAttribute('aria-invalid')).toBe('true');

    await submit();
    // Replaced by the write failure — which is never shown on the field.
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('passes an accessibility check, invalid', async () => {
    action.mockResolvedValue(invalidName);
    const { container } = render(picker(listed));
    openFromHeader();
    await submit();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// --- a failed write (B2) ------------------------------------------------------

describe('a failed write (B2)', () => {
  async function failOnce(traceId = 't-1') {
    action.mockResolvedValueOnce(writeFailed(traceId));
    render(picker(listed));
    openFromHeader();
    type('ArSL Curriculum');
    await submit();
  }

  it('keeps the drawer open and the typed name in the field', async () => {
    await failOnce();
    expect(drawer()).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('ArSL Curriculum');
  });

  it('shows the frozen error state: heading, location, and the real trace ID', async () => {
    await failOnce('9b2c1e7a-5d3f-4a8e-9c61-0f4e2d7b8a13');
    const alert = within(drawer()).getByRole('alert');

    expect(
      within(alert).getByRole('heading', { level: 3, name: "Can't create the project" }),
    ).toBeTruthy();
    expect(within(alert).getByText(WHERE)).toBeTruthy();
    expect(alert.textContent).toContain('Trace ID 9b2c1e7a-5d3f-4a8e-9c61-0f4e2d7b8a13');
  });

  it('is the panel size, below the name field', async () => {
    await failOnce();
    const alert = within(drawer()).getByRole('alert');

    const panel = classOf(
      <SyStateBlock
        state="error"
        size="panel"
        heading="h"
        traceId="t"
        action={{ label: 'r', onAction: () => {} }}
      />,
      (c) => c.querySelector('[role="alert"]')!,
    );
    expect(alert.className).toBe(panel);
    expect(
      nameField().compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('is never shown on the field', async () => {
    await failOnce();
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(describedBy(nameField())).toBe('');
    expect(screen.queryByText(/Give the project a name\./)).toBeNull();
  });

  it('hands Retry focus, because the author caused it', async () => {
    await failOnce();
    expect(document.activeElement).toBe(within(drawer()).getByRole('button', { name: 'Retry' }));
  });

  it('Retry re-runs Create with the name currently in the field', async () => {
    await failOnce();
    type('ArSL Curriculum 2');
    action.mockResolvedValueOnce(writeFailed('t-2'));
    await act(async () => press(within(drawer()).getByRole('button', { name: 'Retry' })));

    expect(action).toHaveBeenLastCalledWith('ArSL Curriculum 2');
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('a Retry that fails again is a new occurrence: new trace ID, Retry focused again', async () => {
    await failOnce('t-1');
    action.mockResolvedValueOnce(writeFailed('t-2'));
    const firstRetry = within(drawer()).getByRole('button', { name: 'Retry' });
    await act(async () => press(firstRetry));

    const alert = within(drawer()).getByRole('alert');
    expect(alert.textContent).toContain('Trace ID t-2');
    expect(alert.textContent).not.toContain('Trace ID t-1');
    const secondRetry = within(alert).getByRole('button', { name: 'Retry' });
    expect(secondRetry).not.toBe(firstRetry);
    expect(document.activeElement).toBe(secondRetry);
  });

  it('a Retry that succeeds opens the Project the same way: busy, re-scan, mark, navigate', async () => {
    const route = await routed(listed);
    openFromHeader();
    type('ArSL Curriculum');
    action.mockResolvedValueOnce(writeFailed('t-1'));
    await submit();
    action.mockResolvedValueOnce(created('ArSL Curriculum'));

    await act(async () => press(within(drawer()).getByRole('button', { name: 'Retry' })));

    expect(drawer()).toBeTruthy();
    expect(createButton().getAttribute('aria-busy')).toBe('true');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();

    await route.rescanned(listedWithCreated());

    expect(isOpenArrival(CREATED_ID)).toBe(true);
    expect(push).toHaveBeenCalledWith(`/workspace/${CREATED_ID}`);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('passes an accessibility check, failed', async () => {
    action.mockResolvedValueOnce(writeFailed('t-1'));
    const { container } = render(picker(listed));
    openFromHeader();
    await submit();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// --- success: Create then Open (CO-1 to CO-6) ------------------------------------

describe('success — the new Project opens (Create-then-Open, CO-1 to CO-6)', () => {
  /** Opens the drawer from the header, types a name and submits it; the write succeeds. */
  async function createFromHeader(result = created('ArSL Curriculum')) {
    const route = await routed(listed);
    openFromHeader();
    type(result.status === 'created' ? result.project.name : 'x');
    action.mockResolvedValueOnce(result);
    await submit();
    return route;
  }

  it('keeps the drawer open and Create Project busy while the list re-scans (CO-3)', async () => {
    await createFromHeader();

    expect(drawer()).toBeTruthy();
    expect(createButton().getAttribute('aria-busy')).toBe('true');
    expect(createButton().textContent).toBe('Create Project');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not mark or navigate until the re-scan has landed (CO-6)', async () => {
    await createFromHeader();

    expect(push).not.toHaveBeenCalled();
    expect(isOpenArrival(CREATED_ID)).toBe(false);
    // The list beneath is still the one before the write.
    expect(screen.queryByText('ArSL Curriculum')).toBeNull();
  });

  it('then marks the arrival as Open’s and navigates to the workspace URL, in that order', async () => {
    const order: string[] = [];
    const route = await createFromHeader();
    const navigate = push.getMockImplementation()!;
    push.mockImplementation((href: string) => {
      // Recorded at the moment the navigation starts.
      order.push(
        `navigate ${href}; marked=${isOpenArrival(CREATED_ID)}; ` +
          `listed=${screen.queryByText('ArSL Curriculum') !== null}`,
      );
      navigate(href);
    });

    await route.rescanned(listedWithCreated());

    expect(order).toEqual([`navigate /workspace/${CREATED_ID}; marked=true; listed=true`]);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('opens by navigating only — no second read through the Open action (CO-1)', async () => {
    const route = await createFromHeader();
    await route.rescanned(listedWithCreated());

    expect(vi.mocked(openProjectAction)).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('encodes the ProjectId into the URL, and marks the id itself', async () => {
    const odd = 'a b/c?d#e';
    const route = await createFromHeader(created('Odd', odd));

    await route.rescanned(listedWithCreated('Odd', odd));

    expect(push).toHaveBeenCalledWith('/workspace/a%20b%2Fc%3Fd%23e');
    expect(isOpenArrival(odd)).toBe(true);
  });

  it('stays open and busy while navigating, and the Workspace Entry replaces it whole', async () => {
    const route = await createFromHeader();
    await route.rescanned(listedWithCreated());

    // Navigating: nothing has closed the drawer or shown the list on its own.
    expect(drawer()).toBeTruthy();
    expect(createButton().getAttribute('aria-busy')).toBe('true');

    await route.arrived();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: 'Sayva Studio' })).toBeNull();
    expect(screen.getByRole('main', { name: 'Workspace Entry' })).toBeTruthy();
  });

  it('never hands focus back to New Project on the way — Create Project keeps it', async () => {
    const route = await routed(listed);
    const opener = headerNewProject();
    openFromHeader();
    type('ArSL Curriculum');
    action.mockResolvedValueOnce(created('ArSL Curriculum'));
    await submit();
    expect(document.activeElement).toBe(createButton());

    await route.rescanned(listedWithCreated());
    expect(document.activeElement).toBe(createButton());

    await route.arrived();
    expect(document.activeElement).not.toBe(opener);
  });

  describe('one Project per submission', () => {
    it('refuses Create Project and ⌘Enter while the list re-scans', async () => {
      await createFromHeader();

      press(createButton());
      fireEvent.keyDown(drawer(), { key: 'Enter', metaKey: true });
      fireEvent.keyDown(drawer(), { key: 'Enter', ctrlKey: true });
      await act(async () => {});

      expect(action).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('refuses Create Project and ⌘Enter while navigating', async () => {
      const route = await createFromHeader();
      await route.rescanned(listedWithCreated());

      press(createButton());
      fireEvent.keyDown(drawer(), { key: 'Enter', metaKey: true });
      await act(async () => {});

      expect(action).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledTimes(1);
    });
  });

  it('from first-run, the same hand-off', async () => {
    const route = await routed(firstRun);
    const [wide] = screen.getAllByRole('status');
    press(within(wide!).getByRole('button', { name: 'New Project' }));
    type('ArSL Curriculum');
    action.mockResolvedValueOnce(created('ArSL Curriculum'));
    await submit();

    expect(drawer()).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    await route.rescanned(listedWithCreated());

    expect(isOpenArrival(CREATED_ID)).toBe(true);
    expect(push).toHaveBeenCalledWith(`/workspace/${CREATED_ID}`);
  });

  it('frees the drawer when the navigation ends back on the Picker (CO-5) — no new surface', async () => {
    const route = await createFromHeader();
    await route.rescanned(listedWithCreated());

    // The Project was gone by the time its route resolved: `/` again.
    await route.returned(listed);

    expect(drawer()).toBeTruthy();
    expect(createButton().getAttribute('aria-busy')).toBeNull();
    expect(within(drawer()).queryByRole('alert')).toBeNull();
    expect(document.querySelector('[aria-live="assertive"]')!.textContent).toBe('');
  });

  it('passes an accessibility check while handing off', async () => {
    const route = await createFromHeader();
    await route.rescanned(listedWithCreated());
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('a refused name or a failed write never opens anything', () => {
  it.each([
    ['a refused name', invalidName],
    ['a failed write', writeFailed('t-1')],
  ])('%s: no re-scan, no mark, no navigation', async (_label, result) => {
    await routed(listed);
    openFromHeader();
    type('anything');
    action.mockResolvedValueOnce(result);
    await submit();

    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(isOpenArrival(CREATED_ID)).toBe(false);
    expect(drawer()).toBeTruthy();
    expect(createButton().getAttribute('aria-busy')).toBeNull();
  });
});

// --- in flight -------------------------------------------------------------

describe('while the write is in flight', () => {
  it('shows Create Project busy, keeps its label, and refuses a second submission', async () => {
    let settle!: (result: CreateProjectResult) => void;
    action.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(picker(listed));
    openFromHeader();

    press(createButton());
    press(createButton());
    fireEvent.keyDown(drawer(), { key: 'Enter', metaKey: true });

    expect(action).toHaveBeenCalledTimes(1);
    expect(createButton().getAttribute('aria-busy')).toBe('true');
    expect(createButton().textContent).toBe('Create Project');
    await act(async () => settle(created('X')));
  });

  it('shows nothing from a result that arrives after the author closed the drawer', async () => {
    let settle!: (result: CreateProjectResult) => void;
    action.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    render(picker(listed));
    openFromHeader();
    press(createButton());
    press(cancelButton());

    openFromHeader();
    await act(async () => settle(writeFailed('late')));

    expect(within(drawer()).queryByRole('alert')).toBeNull();
  });
});

// --- closed while in flight (CO-4) -------------------------------------------

describe('closed while the write is in flight — re-scan only (CO-4)', () => {
  /** Submits from the header with the write held open; returns its settle. */
  async function submitHeld(route: Awaited<ReturnType<typeof routed>>) {
    const write = deferred<CreateProjectResult>();
    action.mockReturnValueOnce(write.promise);
    openFromHeader();
    type('ArSL Curriculum');
    press(createButton());
    await act(async () => {});
    return { route, write };
  }

  it.each([
    ['Cancel', () => press(cancelButton())],
    [
      'Esc',
      () => {
        createButton().focus();
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      },
    ],
  ])(
    'after %s, a success re-scans so the Project is listed, and opens nothing',
    async (_label, dismiss) => {
      const { route, write } = await submitHeld(await routed(listed));
      const opener = headerNewProject();

      dismiss();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(opener);

      await act(async () => write.resolve(created('ArSL Curriculum')));
      expect(refresh).toHaveBeenCalledTimes(1);
      await route.rescanned(listedWithCreated());

      expect(push).not.toHaveBeenCalled();
      expect(isOpenArrival(CREATED_ID)).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('ArSL Curriculum')).toBeTruthy();
      expect(document.activeElement).toBe(opener);
    },
  );

  it('closed while the list re-scans: the re-scan stands, nothing opens', async () => {
    const route = await routed(listed);
    openFromHeader();
    type('ArSL Curriculum');
    action.mockResolvedValueOnce(created('ArSL Curriculum'));
    await submit();
    expect(refresh).toHaveBeenCalledTimes(1);

    // While the re-scan is in flight, the route is suspended: act must be awaited.
    await act(async () => press(cancelButton()));
    await route.rescanned(listedWithCreated());

    expect(push).not.toHaveBeenCalled();
    expect(isOpenArrival(CREATED_ID)).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('ArSL Curriculum')).toBeTruthy();
  });

  it('leaves a later opening alone: idle, its own text, and nothing opened for it', async () => {
    const { route, write } = await submitHeld(await routed(listed));
    press(cancelButton());

    // A new opening while the first write is still in flight.
    openFromHeader();
    expect(createButton().getAttribute('aria-busy')).toBeNull();
    type('BSL Pilot 2');

    await act(async () => write.resolve(created('ArSL Curriculum')));
    await route.rescanned(listedWithCreated());

    expect(drawer()).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('BSL Pilot 2');
    expect(createButton().getAttribute('aria-busy')).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(isOpenArrival(CREATED_ID)).toBe(false);
  });

  it('a later opening still creates and opens its own Project', async () => {
    const { route, write } = await submitHeld(await routed(listed));
    press(cancelButton());
    openFromHeader();
    type('BSL Pilot 2');
    const second = '9b2c1e7a-5d3f-4a8e-9c61-0f4e2d7b8a13';
    action.mockResolvedValueOnce(created('BSL Pilot 2', second));

    await submit();
    await act(async () => write.resolve(created('ArSL Curriculum')));
    await route.rescanned(listedWithCreated('BSL Pilot 2', second));

    expect(action).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(`/workspace/${second}`);
    expect(isOpenArrival(second)).toBe(true);
    expect(isOpenArrival(CREATED_ID)).toBe(false);
  });

  it('opens a fresh drawer after Cancel — nothing carried over', async () => {
    action.mockResolvedValueOnce(invalidName);
    render(picker(listed));
    openFromHeader();
    await submit();
    press(cancelButton());

    openFromHeader();
    expect((nameField() as HTMLInputElement).value).toBe('');
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(within(drawer()).queryByRole('alert')).toBeNull();
    expect(createButton().getAttribute('aria-busy')).toBeNull();
  });
});

// --- dismissal (B4, B5) ---------------------------------------------------------

describe('dismissal — never dirty (B5)', () => {
  it('Cancel closes directly, typed name and all', () => {
    render(picker(listed));
    openFromHeader();
    type('ArSL Curriculum');
    press(cancelButton());

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('Esc closes directly', () => {
    render(picker(listed));
    openFromHeader();
    type('ArSL Curriculum');
    // Focus on a footer action, outside the field: Esc is the drawer's.
    createButton().focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows no discard prompt — no SyDialog on this surface', () => {
    render(picker(listed));
    openFromHeader();
    type('ArSL Curriculum');
    createButton().focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
  });

  it("inside the field, Esc first reverts the edit — SyField's frozen contract — then closes", () => {
    render(picker(listed));
    openFromHeader();
    nameField().focus();
    type('ArSL');
    fireEvent.keyDown(nameField(), { key: 'Escape' });

    expect(drawer()).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('');

    fireEvent.keyDown(nameField(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to the opener on Cancel', () => {
    render(picker(listed));
    const opener = headerNewProject();
    openFromHeader();
    press(cancelButton());
    expect(document.activeElement).toBe(opener);
  });
});

// --- boundaries -------------------------------------------------------------

describe('the frame outlives the list (B15) — the layout/page split', () => {
  /**
   * Why the header and drawer live in the route's layout: the page's loading
   * boundary sits inside it. These pin the two consequences, through a real
   * Suspense boundary and a real re-render rather than by inspecting the
   * component tree.
   */
  it('keeps the drawer, and what was typed, while the list resolves beneath it', async () => {
    let resolveView!: (view: ProjectListView) => void;
    const pending = new Promise<ProjectListView>((resolve) => (resolveView = resolve));
    function Page() {
      return <ProjectPickerBody root={ROOT} view={use(pending)} />;
    }
    await act(async () => {
      render(
        <ProjectPickerFrame root={ROOT}>
          <Suspense fallback={<ProjectPickerLoading root={ROOT} />}>
            <Page />
          </Suspense>
        </ProjectPickerFrame>,
      );
    });

    // Still loading — and New Project is already there to press. While a
    // child is suspended, React's act defers a commit until it is awaited, so
    // each step is awaited here; a browser has no act queue to wait on.
    expect(screen.getByRole('status', { name: `Studio is looking in ${ROOT}` })).toBeTruthy();
    await act(async () => press(headerNewProject()));
    const dialog = drawer();
    const field = nameField();
    await act(async () => type('Half typed'));
    expect(screen.queryByRole('list')).toBeNull();

    await act(async () => resolveView(listed));

    expect(screen.getByRole('list')).toBeTruthy();
    expect(drawer()).toBe(dialog);
    expect(nameField()).toBe(field);
    expect((nameField() as HTMLInputElement).value).toBe('Half typed');
  });

  it('keeps the drawer, and what was typed, across a re-scan', () => {
    const { rerender } = render(picker(listed));
    const dialog = openFromHeader();
    type('Half typed');

    // What router.refresh() delivers: the same frame, a new list beneath it.
    rerender(
      picker({
        status: 'listed',
        projects: [
          {
            id: 'id-0',
            name: 'ArSL Curriculum',
            updatedAt: '2026-09-29T09:00:00.000Z',
            updatedAgo: '1h ago',
          },
          ...(listed.status === 'listed' ? listed.projects : []),
        ],
      }),
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(drawer()).toBe(dialog);
    expect((nameField() as HTMLInputElement).value).toBe('Half typed');
  });
});

describe('what this slice does not do', () => {
  it.each(['n', 'N'])('binds no "%s" shortcut — deferred to a later slice (B8)', (key) => {
    render(picker(listed));
    fireEvent.keyDown(document.body, { key });
    fireEvent.keyDown(headerNewProject(), { key });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the narrow New Project opens nothing', () => {
    render(picker(listed));
    const narrow = screen.getAllByRole('button', { name: 'New Project' })[1]!;
    fireEvent.click(narrow);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
