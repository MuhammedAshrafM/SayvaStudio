import { Suspense, use } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import type { CreateProjectResult, ProjectListView } from '@sayva/application';
import { SyButton, SyStateBlock } from '@sayva/design-system';
import { createProjectAction } from './create-project-action';
import { ProjectPickerBody, ProjectPickerFrame, ProjectPickerLoading } from './project-picker.js';

/**
 * The Create slice — Screens §04 §3 as closed by the Create decision closure
 * (B1–B15), driven through the real frame, drawer and frozen primitives.
 *
 * Two seams, both at the edge of what jsdom can host. The Server Action is
 * replaced by a recorder: its real body is one call into the Create command,
 * which @sayva/application's own tests cover against the real contract, and
 * it reaches the server-only Composition Root. And `useRouter` is replaced,
 * because there is no App Router here; the re-scan contract is exactly
 * `router.refresh()`, and `push` is recorded so that opening a Project —
 * which this slice must not do — would show up.
 */

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push, replace: push }) }));
vi.mock('./create-project-action', () => ({ createProjectAction: vi.fn() }));
const action = vi.mocked(createProjectAction);

const ROOT = 'C:/authoring/projects';
const WHERE = `${ROOT}/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva`;

const created = (name: string): CreateProjectResult => ({
  status: 'created',
  project: {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
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
  refresh.mockClear();
  push.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
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

  it('a Retry that succeeds closes the drawer and re-scans', async () => {
    await failOnce();
    action.mockResolvedValueOnce(created('ArSL Curriculum'));
    await act(async () => press(within(drawer()).getByRole('button', { name: 'Retry' })));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('passes an accessibility check, failed', async () => {
    action.mockResolvedValueOnce(writeFailed('t-1'));
    const { container } = render(picker(listed));
    openFromHeader();
    await submit();
    expect(await axe(container)).toHaveNoViolations();
  });
});

// --- success (B1, B14) -----------------------------------------------------------

describe('success — the temporary Create/Open boundary (B1)', () => {
  it('closes the drawer and re-scans the list', async () => {
    action.mockResolvedValue(created('ArSL Curriculum'));
    render(picker(listed));
    openFromHeader();
    type('ArSL Curriculum');
    await submit();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not open the Project, or navigate anywhere', async () => {
    action.mockResolvedValue(created('ArSL Curriculum'));
    render(picker(listed));
    openFromHeader();
    await submit();

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^open/i })).toBeNull();
  });

  it('returns focus to the header New Project that opened it (A07, B14)', async () => {
    action.mockResolvedValue(created('ArSL Curriculum'));
    render(picker(listed));
    const opener = headerNewProject();
    openFromHeader();
    await submit();

    expect(document.activeElement).toBe(opener);
  });

  it('from first-run, introduces no focus target once the list replaces the opener (B14)', async () => {
    action.mockResolvedValue(created('ArSL Curriculum'));
    const { rerender } = render(picker(firstRun));
    const [wide] = screen.getAllByRole('status');
    press(within(wide!).getByRole('button', { name: 'New Project' }));
    await submit();

    // The re-scan's answer: the list, which replaces first-run and its button.
    rerender(picker(listed));
    // Let anything deferred run first — a focus handed over on the next task
    // is still an invented target.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.activeElement).toBe(document.body);
    expect(document.activeElement).not.toBe(headerNewProject());
  });

  it('opens a fresh drawer next time — nothing carried over', async () => {
    action.mockResolvedValueOnce(invalidName).mockResolvedValueOnce(created('X'));
    render(picker(listed));
    openFromHeader();
    await submit();
    type('X');
    await submit();

    openFromHeader();
    expect((nameField() as HTMLInputElement).value).toBe('');
    expect(nameField().getAttribute('aria-invalid')).toBeNull();
    expect(within(drawer()).queryByRole('alert')).toBeNull();
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
