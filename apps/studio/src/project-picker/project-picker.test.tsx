import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import type { OpenProjectResult, ProjectListView } from '@sayva/application';
import { SyButton, SyStateBlock } from '@sayva/design-system';
import { clearOpenArrival, isOpenArrival, markOpenArrival } from '../workspace-entry/open-arrival';
import { openProjectAction } from './open-project-action';
import { ProjectPickerBody, ProjectPickerFrame, ProjectPickerLoading } from './project-picker.js';

/**
 * The read-only Project Picker, tested against the canonical design (Screens
 * §04) and the frozen `SyStateBlock` contract it renders through.
 *
 * `useRouter` is the one thing jsdom cannot provide — there is no App Router
 * here — so it is replaced by a recorder. Retry's contract is "re-scans",
 * which on a per-request page is exactly `router.refresh()`.
 */

const { refresh, push } = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));
// Both Server Actions reach the server-only Composition Root, so both are
// replaced here. create-project.test.tsx exercises Create;
// open-project-action.test.ts runs Open's against a real workspace.
vi.mock('./create-project-action', () => ({ createProjectAction: vi.fn() }));
vi.mock('./open-project-action', () => ({ openProjectAction: vi.fn() }));
const openAction = vi.mocked(openProjectAction);

afterEach(() => {
  refresh.mockClear();
  push.mockClear();
  openAction.mockReset();
  clearOpenArrival();
});

const ROOT = 'C:/authoring/projects';
const WHERE = `${ROOT}/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva`;
const TRACE = '9b2c1e7a-5d3f-4a8e-9c61-0f4e2d7b8a13';

const listed: ProjectListView = {
  status: 'listed',
  projects: [
    {
      id: 'id-1',
      name: 'ArSL Curriculum',
      updatedAt: '2026-09-28T08:00:00.000Z',
      updatedAgo: '1h ago',
    },
    { id: 'id-2', name: 'BSL Pilot', updatedAt: '2026-09-25T09:00:00.000Z', updatedAgo: '3d ago' },
    {
      id: 'id-3',
      name: 'ASL Foundations',
      updatedAt: '2026-09-14T09:00:00.000Z',
      updatedAgo: '2w ago',
    },
  ],
};
const firstRun: ProjectListView = { status: 'first-run' };

/** The page as the route renders it: the layout's frame around the page's body. */
const picker = (view: ProjectListView) => (
  <ProjectPickerFrame root={ROOT}>
    <ProjectPickerBody root={ROOT} view={view} />
  </ProjectPickerFrame>
);
/** The text an element's `aria-describedby` points at — its accessible description. */
function describedBy(element: Element): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

/** The class list the frozen SyButton gives its secondary variant. */
function classOfSecondaryButton(): string {
  const { container, unmount } = render(<SyButton variant="secondary">x</SyButton>);
  const className = container.querySelector('button')!.className;
  unmount();
  return className;
}

/** The loading boundary inside the same frame. */
const loadingPicker = () => (
  <ProjectPickerFrame root={ROOT}>
    <ProjectPickerLoading root={ROOT} />
  </ProjectPickerFrame>
);
const failed: ProjectListView = { status: 'error', traceId: TRACE, location: WHERE };

describe('the header — every state', () => {
  it.each([
    ['listed', listed],
    ['first-run', firstRun],
    ['error', failed],
  ] as const)('names the product and the location being listed (%s)', (_label, view) => {
    render(picker(view));

    expect(screen.getByRole('heading', { level: 1, name: 'Sayva Studio' })).toBeTruthy();
    // RB-4: the canonical line, verbatim.
    expect(screen.getByText(`Studio is looking in ${ROOT}`)).toBeTruthy();
  });

  it.each([
    ['listed', () => render(picker(listed))],
    ['first-run', () => render(picker(firstRun))],
    ['error', () => render(picker(failed))],
    ['loading', () => render(loadingPicker())],
  ] as const)('carries New Project in every state (B15) — %s', (_label, show) => {
    show();
    const header = screen.getByRole('heading', { level: 1 }).closest('header')!;
    const [wide, narrow] = within(header).getAllByRole('button', { name: 'New Project' });

    // From bp.md up: the enabled primary action.
    expect(wide!.hasAttribute('disabled')).toBe(false);
    expect(wide!.className).toContain('max-md:hidden');
    // Below it: the same action, disabled, inside the narrow-only wrapper.
    expect(narrow!.hasAttribute('disabled')).toBe(true);
    expect(narrow!.closest('.md\\:hidden')).not.toBeNull();
  });

  it('states the narrow reason beside the disabled New Project, and to assistive technology', () => {
    render(picker(listed));
    const narrow = screen.getAllByRole('button', { name: 'New Project' })[1]!;
    const reason = 'Creating a project needs a window at least 900px wide.';

    // B6, verbatim: the button's description, and the visible statement
    // SyButton leaves to the screen ("an adjacent stated reason").
    expect(describedBy(narrow)).toBe(reason);
    const wrapper = narrow.closest('.md\\:hidden')!;
    const visible = [...wrapper.querySelectorAll('p')].find((p) => p.textContent === reason);
    expect(visible).toBeTruthy();
    // Said once to a screen reader, not twice: the description carries it.
    expect(visible!.getAttribute('aria-hidden')).toBe('true');
  });

  it('is one main landmark, named by its heading', () => {
    render(picker(listed));

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'Sayva Studio' })).toBeTruthy();
  });

  it('shows the location as plain text, not as a control', () => {
    // SR-09: the author sees the root and cannot change it.
    render(picker(listed));

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('listed', () => {
  it('lists every Project as a list item — not a grid', () => {
    render(picker(listed));

    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    // role=grid is SyCollection's, which this surface does not use (WS-03).
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('keeps the order the query decided (PP-04)', () => {
    render(picker(listed));

    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(names).toEqual([
      'ArSL Curriculum 1h ago Open',
      'BSL Pilot 3d ago Open',
      'ASL Foundations 2w ago Open',
    ]);
  });

  it('shows updatedAt as RB-3 relative time, with the machine value in <time datetime>', () => {
    const { container } = render(picker(listed));

    const times = [...container.querySelectorAll('time')];
    expect(times.map((time) => time.textContent)).toEqual(['1h ago', '3d ago', '2w ago']);
    expect(times.map((time) => time.getAttribute('datetime'))).toEqual([
      '2026-09-28T08:00:00.000Z',
      '2026-09-25T09:00:00.000Z',
      '2026-09-14T09:00:00.000Z',
    ]);
  });

  it('gives each row exactly one action, Open, as a secondary SyButton (§5)', () => {
    // Duplicate, the design's other row action, is its own slice.
    const { container } = render(picker(listed));
    const secondary = classOfSecondaryButton();

    for (const item of screen.getAllByRole('listitem')) {
      const buttons = within(item).getAllByRole('button');
      expect(buttons.map((b) => b.textContent)).toEqual(['Open']);
      expect(buttons[0]!.className).toBe(secondary);
      expect(within(item).queryByRole('link')).toBeNull();
    }
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(picker(listed));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('first-run', () => {
  /**
   * First-run renders in the two forms §8 gives it: with New Project from
   * `bp.md` up, and without any action below it (B6). Only one is ever
   * displayed — `md:` / `max-md:` decide which, from the `--breakpoint-md`
   * token — but jsdom applies no stylesheet, so both are in the tree here
   * and are told apart by the class that hides each. The real widths are
   * verified in a browser.
   */
  const blocks = () => {
    const [wide, narrow] = screen.getAllByRole('status');
    return { wide: wide!, narrow: narrow! };
  };

  it('is its own state with the canonical heading and line, in both forms', () => {
    render(picker(firstRun));

    expect(screen.getAllByRole('heading', { level: 2, name: 'No projects yet' })).toHaveLength(2);
    expect(
      screen.getAllByText(`Studio is looking in ${ROOT}. A project is one .sayva file.`),
    ).toHaveLength(2);
  });

  it('is never a bare empty list', () => {
    render(picker(firstRun));

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('offers New Project as its action from bp.md up — RB-6 ends with Create', () => {
    render(picker(firstRun));
    const { wide } = blocks();

    expect(wide.className).toContain('max-md:hidden');
    expect(
      within(wide)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['New Project']);
  });

  it('renders no action below bp.md, and nothing in its place (B6)', () => {
    render(picker(firstRun));
    const { narrow } = blocks();

    expect(narrow.className).toContain('md:hidden');
    expect(narrow.className).not.toContain('max-md:hidden');
    expect(within(narrow).queryAllByRole('button')).toHaveLength(0);
    expect(within(narrow).queryAllByRole('link')).toHaveLength(0);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(picker(firstRun));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('error', () => {
  it('uses the canonical heading and names the affected location', () => {
    render(picker(failed));

    expect(
      screen.getByRole('heading', { level: 2, name: "Can't read the projects folder" }),
    ).toBeTruthy();
    // SR-10: the line is the location.
    expect(screen.getByText(WHERE)).toBeTruthy();
  });

  it('shows the trace ID through the frozen SyStateBlock label', () => {
    render(picker(failed));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(`Trace ID ${TRACE}`);
  });

  it('keeps the location and the trace ID apart', () => {
    // SR-10 and SR-11 are separate contracts: the path is never shown as
    // the trace ID, nor the trace ID as the location.
    render(picker(failed));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).not.toContain(`Trace ID ${WHERE}`);
    expect(within(alert).getByText(WHERE).textContent).toBe(WHERE);
  });

  it('is announced assertively', () => {
    // A16: assertive for errors. The contract gives errors role=alert.
    render(picker(failed));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('offers Retry, which re-scans', () => {
    render(picker(failed));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not take focus on first paint', () => {
    render(picker(failed));
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Retry' }));
  });

  it('hands focus to Retry when a failure comes back after the author retried', () => {
    const { rerender } = render(picker(failed));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    (document.activeElement as HTMLElement | null)?.blur();
    // The re-scan failed again: a new occurrence, so a new trace ID.
    rerender(picker({ ...failed, traceId: 'a-new-occurrence' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('alert').textContent).toContain('Trace ID a-new-occurrence');
  });

  it('offers nothing but Retry', () => {
    render(picker(failed));
    const alert = screen.getByRole('alert');
    expect(
      within(alert)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Retry']);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(picker(failed));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('loading', () => {
  it('is a skeleton named by the canonical label', () => {
    render(loadingPicker());

    // RB-5: the region's accessible name.
    expect(screen.getByRole('status', { name: `Studio is looking in ${ROOT}` })).toBeTruthy();
  });

  it('is not a spinner', () => {
    const { container } = render(loadingPicker());

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('keeps the header while the scan is in flight', () => {
    render(loadingPicker());
    expect(screen.getByRole('heading', { level: 1, name: 'Sayva Studio' })).toBeTruthy();
  });

  it('passes an accessibility check', async () => {
    const { container } = render(loadingPicker());
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('what this slice must not show — any state', () => {
  const every = [
    ['listed', () => render(picker(listed))],
    ['first-run', () => render(picker(firstRun))],
    ['error', () => render(picker(failed))],
    ['loading', () => render(loadingPicker())],
  ] as const;

  it.each(every)('offers no Duplicate, Delete, Archive or Rename action (%s)', (_label, show) => {
    show();
    // Checked on the controls, not on all text: a Project's name is the
    // author's content and may contain any of these words. New Project and
    // Open are no longer on this list — their slices bring them.
    const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')];
    for (const control of controls) {
      expect(control.textContent).not.toMatch(/duplicate|delete|archive|rename/i);
    }
  });

  it.each(every)('offers Open only on a listed row (%s)', (label, show) => {
    show();
    const opens = screen.queryAllByRole('button', { name: 'Open' });

    expect(opens).toHaveLength(label === 'listed' ? 3 : 0);
    for (const open of opens) expect(open.closest('li')).not.toBeNull();
  });

  it.each(every)(
    'disables nothing but the narrow New Project, which states its reason (%s)',
    (_label, show) => {
      const { container } = show();
      const disabled = [...container.querySelectorAll('[disabled], [aria-disabled="true"]')];

      // B6 is the one canonical disabled control; nothing else stands in for anything.
      expect(disabled.map((control) => control.textContent)).toEqual(['New Project']);
      expect(describedBy(disabled[0]!)).toBe(
        'Creating a project needs a window at least 900px wide.',
      );
    },
  );

  it.each(every)('never shows the PP-02 proof label (%s)', (_label, show) => {
    show();
    expect(screen.queryByText(/Workspace root:/)).toBeNull();
  });
});

describe('Open — ADR-005 OP-08, the approved Picker Open rulings', () => {
  const IDS = ['id-1', 'id-2', 'id-3'] as const;

  const openButtons = () => screen.getAllByRole('button', { name: 'Open' });
  const row = (index: number) => screen.getAllByRole('listitem')[index]!;
  const openIn = (index: number) => within(row(index)).getByRole('button', { name: 'Open' });
  const liveRegion = () => document.querySelector('[aria-live="assertive"]')!;

  /** Lets the action's promise and the transitions it starts run to the end. */
  const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

  function deferred() {
    let resolve!: (result: OpenProjectResult) => void;
    const promise = new Promise<OpenProjectResult>((done) => (resolve = done));
    return { promise, resolve };
  }

  const opened = (id: string): OpenProjectResult => ({
    status: 'opened',
    project: {
      id,
      name: 'ArSL Curriculum',
      schemaVersion: 1,
      state: 'Created',
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-28T08:00:00.000Z',
      tags: [],
    },
  });
  const notHere: OpenProjectResult = { status: 'not-here' };
  const unreadable = (traceId = TRACE): OpenProjectResult => ({
    status: 'cant-read',
    traceId,
    location: WHERE,
  });

  /** The same list without one row — what a re-scan returns once its file is gone. */
  const listedWithout = (id: string): ProjectListView =>
    listed.status === 'listed'
      ? { status: 'listed', projects: listed.projects.filter((p) => p.id !== id) }
      : listed;

  describe('the control', () => {
    it.each(IDS.map((id, index) => [id, index] as const))(
      "reads the row's own ProjectId (%s)",
      async (id, index) => {
        openAction.mockResolvedValue(notHere);
        render(picker(listed));

        fireEvent.click(openIn(index));
        await settle();

        expect(openAction).toHaveBeenCalledTimes(1);
        expect(openAction).toHaveBeenCalledWith(id);
      },
    );

    it('is a native button, so Enter and Space activate it — no tabindex, no role override', () => {
      render(picker(listed));
      for (const open of openButtons()) {
        expect(open.tagName).toBe('BUTTON');
        expect(open.getAttribute('type')).toBe('button');
        expect(open.hasAttribute('tabindex')).toBe(false);
        expect(open.hasAttribute('role')).toBe(false);
      }
    });

    it("puts the Open buttons in the rows' visual order, which is the Tab order", () => {
      render(picker(listed));
      const order = openButtons().map((open) => open.closest('li')!.textContent);
      expect(order).toEqual(screen.getAllByRole('listitem').map((item) => item.textContent));
    });

    it('stays available below bp.md: never disabled, never hidden by a breakpoint (§8)', () => {
      render(picker(listed));
      for (const open of openButtons()) {
        expect(open.hasAttribute('disabled')).toBe(false);
        expect(open.closest('.md\\:hidden, .max-md\\:hidden')).toBeNull();
      }
    });

    it('keeps its visible label and adds no aria-label (blocked item 13)', () => {
      render(picker(listed));
      for (const open of openButtons()) {
        expect(open.textContent).toBe('Open');
        expect(open.hasAttribute('aria-label')).toBe(false);
      }
    });
  });

  describe('one Open in flight (Ruling 4)', () => {
    it('shows SyButton loading while the read is in flight: label kept, aria-busy, focus kept', async () => {
      const pending = deferred();
      openAction.mockReturnValue(pending.promise);
      render(picker(listed));
      const open = openIn(1);
      open.focus();

      fireEvent.click(open);

      expect(open.getAttribute('aria-busy')).toBe('true');
      expect(open.textContent).toBe('Open');
      expect(document.activeElement).toBe(open);
      expect(openIn(0).getAttribute('aria-busy')).toBeNull();
      expect(openIn(2).getAttribute('aria-busy')).toBeNull();

      await act(async () => pending.resolve(notHere));
    });

    it('ignores a second activation of the same Open', async () => {
      const pending = deferred();
      openAction.mockReturnValue(pending.promise);
      render(picker(listed));

      fireEvent.click(openIn(0));
      fireEvent.click(openIn(0));
      fireEvent.click(openIn(0));

      expect(openAction).toHaveBeenCalledTimes(1);
      await act(async () => pending.resolve(notHere));
    });

    it("ignores every other row's Open until the first one finishes", async () => {
      const pending = deferred();
      openAction.mockReturnValue(pending.promise);
      render(picker(listed));

      fireEvent.click(openIn(0));
      fireEvent.click(openIn(1));
      fireEvent.click(openIn(2));

      expect(openAction).toHaveBeenCalledTimes(1);
      expect(openAction).toHaveBeenCalledWith('id-1');

      await act(async () => pending.resolve(notHere));
      await settle();

      // Finished: Open works again.
      openAction.mockResolvedValue(notHere);
      fireEvent.click(openIn(1));
      await settle();
      expect(openAction).toHaveBeenLastCalledWith('id-2');
    });

    it('does not stay stuck when a navigation completes without leaving the Picker', async () => {
      openAction.mockResolvedValue(opened('id-1'));
      render(picker(listed));

      fireEvent.click(openIn(0));
      await settle();
      expect(push).toHaveBeenCalledTimes(1);

      // Here `push` returns and nothing unmounts — an interrupted navigation.
      expect(openIn(0).getAttribute('aria-busy')).toBeNull();
      openAction.mockResolvedValue(notHere);
      fireEvent.click(openIn(1));
      await settle();
      expect(openAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('opened', () => {
    it("marks the arrival as Open's, then navigates to the workspace URL", async () => {
      openAction.mockResolvedValue(opened('id-2'));
      render(picker(listed));

      fireEvent.click(openIn(1));
      await settle();

      expect(isOpenArrival('id-2')).toBe(true);
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith('/workspace/id-2');
      expect(refresh).not.toHaveBeenCalled();
    });

    it('encodes the ProjectId into the URL', async () => {
      const odd = 'a b/c?d#e';
      openAction.mockResolvedValue(opened(odd));
      render(
        picker({
          status: 'listed',
          projects: [
            { id: odd, name: 'Odd', updatedAt: '2026-09-28T08:00:00.000Z', updatedAgo: '1h ago' },
          ],
        }),
      );

      fireEvent.click(openIn(0));
      await settle();

      expect(push).toHaveBeenCalledWith('/workspace/a%20b%2Fc%3Fd%23e');
      expect(isOpenArrival(odd)).toBe(true);
    });

    it('still navigates when the list changed while the read was in flight', async () => {
      const pending = deferred();
      openAction.mockReturnValue(pending.promise);
      const { rerender } = render(picker(listed));

      fireEvent.click(openIn(0));
      rerender(picker(listedWithout('id-1')));
      await act(async () => pending.resolve(opened('id-1')));
      await settle();

      // The read was clean; the workspace route resolves it again (OP-02).
      expect(push).toHaveBeenCalledWith('/workspace/id-1');
    });
  });

  describe('not here (Rulings 5 and 6)', () => {
    it('never navigates, re-scans, and announces exactly "Can\'t find that project"', async () => {
      openAction.mockResolvedValue(notHere);
      render(picker(listed));

      fireEvent.click(openIn(0));
      await settle();

      expect(push).not.toHaveBeenCalled();
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(liveRegion().textContent).toBe("Can't find that project");
      expect(isOpenArrival('id-1')).toBe(false);
    });

    it('uses an assertive, atomic, visually hidden live region present before any announcement', () => {
      render(picker(listed));
      const region = liveRegion();

      expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(region.className).toBe('sr-only');
      expect(region.textContent).toBe('');
      expect(region.closest('main')).not.toBeNull();
    });

    it('announces each occurrence afresh, as a new node', async () => {
      openAction.mockResolvedValue(notHere);
      render(picker(listed));

      fireEvent.click(openIn(0));
      await settle();
      const first = liveRegion().firstElementChild;

      fireEvent.click(openIn(1));
      await settle();
      const second = liveRegion().firstElementChild;

      expect(first).not.toBeNull();
      expect(second).not.toBe(first);
      expect(liveRegion().textContent).toBe("Can't find that project");
    });

    describe('once delivered, the words are cleared', () => {
      // The clearing is timed, so these tests own the clock. `settle` waits
      // on a real timer, so they settle by advancing the fake one instead.
      const settleOnFakeTimers = () => act(() => vi.advanceTimersByTimeAsync(0));
      const elapse = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

      /** Every announcement the region makes: each node added with words in it. */
      function recordAnnouncements(region: Element): string[] {
        const said: string[] = [];
        new MutationObserver((changes) => {
          for (const change of changes)
            for (const node of change.addedNodes) if (node.textContent) said.push(node.textContent);
        }).observe(region, { childList: true, subtree: true, characterData: true });
        return said;
      }

      afterEach(() => {
        vi.useRealTimers();
      });

      async function notFoundOnce(index = 0) {
        fireEvent.click(openIn(index));
        await settleOnFakeTimers();
      }

      it('keeps the words long enough to be announced, then empties the region', async () => {
        vi.useFakeTimers();
        openAction.mockResolvedValue(notHere);
        render(picker(listed));

        await notFoundOnce();
        expect(liveRegion().textContent).toBe("Can't find that project");
        await elapse(1000);
        expect(liveRegion().textContent).toBe("Can't find that project");

        await elapse(1000);
        expect(liveRegion().textContent).toBe('');
        expect(liveRegion().childElementCount).toBe(0);
        // The region itself stays, ready for the next occurrence.
        expect(liveRegion().getAttribute('aria-live')).toBe('assertive');
      });

      it('announces the same words again after clearing, from an empty region', async () => {
        vi.useFakeTimers();
        openAction.mockResolvedValue(notHere);
        render(picker(listed));
        const said = recordAnnouncements(liveRegion());

        await notFoundOnce(0);
        await elapse(2000);
        expect(liveRegion().textContent).toBe('');

        await notFoundOnce(1);
        expect(liveRegion().textContent).toBe("Can't find that project");
        expect(said).toEqual(["Can't find that project", "Can't find that project"]);
      });

      it('announces nothing when it clears — one announcement per occurrence', async () => {
        vi.useFakeTimers();
        openAction.mockResolvedValue(notHere);
        render(picker(listed));
        const said = recordAnnouncements(liveRegion());

        await notFoundOnce();
        await elapse(5000);

        expect(said).toEqual(["Can't find that project"]);
        expect(liveRegion().textContent).toBe('');
      });

      it('gives an occurrence that arrives while the last is shown its own node and full time', async () => {
        vi.useFakeTimers();
        openAction.mockResolvedValue(notHere);
        render(picker(listed));
        const said = recordAnnouncements(liveRegion());

        await notFoundOnce(0);
        const first = liveRegion().firstElementChild;
        await elapse(1500);
        await notFoundOnce(1);

        expect(liveRegion().firstElementChild).not.toBe(first);
        expect(liveRegion().childElementCount).toBe(1);
        expect(said).toEqual(["Can't find that project", "Can't find that project"]);
        // The second occurrence's words outlast the first one's lifetime.
        await elapse(1000);
        expect(liveRegion().textContent).toBe("Can't find that project");
        await elapse(1000);
        expect(liveRegion().textContent).toBe('');
      });

      it('neither navigates nor shows a trace ID while announcing or after clearing', async () => {
        vi.useFakeTimers();
        openAction.mockResolvedValue(notHere);
        render(picker(listed));

        await notFoundOnce();
        await elapse(2000);

        expect(push).not.toHaveBeenCalled();
        expect(isOpenArrival('id-1')).toBe(false);
        expect(screen.queryByText(/Trace ID/)).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
      });
    });

    it('shows no trace ID and adds no error block', async () => {
      openAction.mockResolvedValue(notHere);
      render(picker(listed));

      fireEvent.click(openIn(0));
      await settle();

      expect(screen.queryByText(/Trace ID/)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('moves no focus when the row is gone — focus is left to the browser', async () => {
      openAction.mockResolvedValue(notHere);
      const { rerender } = render(picker(listed));
      const open = openIn(0);
      open.focus();

      fireEvent.click(open);
      await settle();
      expect(document.activeElement).toBe(open);

      // The re-scan comes back without the row.
      rerender(picker(listedWithout('id-1')));

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(document.activeElement).toBe(document.body);
    });

    it('passes an accessibility check after announcing', async () => {
      openAction.mockResolvedValue(notHere);
      const { container } = render(picker(listed));
      fireEvent.click(openIn(0));
      await settle();
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("can't read — the inline-row error (OP-08)", () => {
    async function openUnreadable(index = 1, traceId = TRACE) {
      openAction.mockResolvedValue(unreadable(traceId));
      const view = render(picker(listed));
      fireEvent.click(openIn(index));
      await settle();
      return view;
    }

    it('never navigates and replaces only that row with the frozen error, inline size', async () => {
      await openUnreadable(1);

      expect(push).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
      const alert = within(row(1)).getByRole('alert');
      expect(within(alert).getByRole('heading', { name: "Can't open the project" })).toBeTruthy();
      expect(within(alert).getByText(WHERE)).toBeTruthy();
      expect(alert.textContent).toContain(`Trace ID ${TRACE}`);
      expect(within(row(1)).queryByRole('button', { name: 'Open' })).toBeNull();
      // The other rows keep their Open.
      expect(within(row(0)).getByRole('button', { name: 'Open' })).toBeTruthy();
      expect(within(row(2)).getByRole('button', { name: 'Open' })).toBeTruthy();
      expect(isOpenArrival('id-2')).toBe(false);
    });

    it("hands Retry focus, because the author's Open caused the state", async () => {
      await openUnreadable(1);
      expect(document.activeElement).toBe(within(row(1)).getByRole('button', { name: 'Retry' }));
    });

    it('offers nothing but Retry inside the row', async () => {
      await openUnreadable(1);
      expect(
        within(row(1))
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Retry']);
    });

    it('Retry re-scans, and a repaired file returns as a normal row', async () => {
      const { rerender } = await openUnreadable(1);

      fireEvent.click(within(row(1)).getByRole('button', { name: 'Retry' }));
      expect(refresh).toHaveBeenCalledTimes(1);
      rerender(picker(listed));

      expect(within(row(1)).getByRole('button', { name: 'Open' })).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('Retry re-scans, and a removed file leaves no row', async () => {
      const { rerender } = await openUnreadable(1);

      fireEvent.click(within(row(1)).getByRole('button', { name: 'Retry' }));
      rerender(picker(listedWithout('id-2')));

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it("Retry re-scans, and a still-unreadable file shows the list's own error (findAll)", async () => {
      const { rerender } = await openUnreadable(1);

      fireEvent.click(within(row(1)).getByRole('button', { name: 'Retry' }));
      rerender(picker({ ...failed, traceId: 'a-new-occurrence' }));

      expect(screen.getByRole('heading', { name: "Can't read the projects folder" })).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toContain('Trace ID a-new-occurrence');
    });

    describe("focus once Retry's re-scan answers (F1)", () => {
      /**
       * A re-scan's answer, as the route delivers it: a new view, even when
       * nothing in it changed. The picker tells an answer from the view it
       * already has by exactly that.
       */
      const rescanned = (view: ProjectListView): ProjectListView => structuredClone(view);

      const retryRow = (index: number) =>
        fireEvent.click(within(row(index)).getByRole('button', { name: 'Retry' }));

      it("hands the list's own Retry focus when the file is still unreadable", async () => {
        const { rerender } = await openUnreadable(1);

        retryRow(1);
        rerender(picker(rescanned({ ...failed, traceId: 'a-new-occurrence' })));

        const alert = screen.getByRole('alert');
        expect(
          within(alert).getByRole('heading', { name: "Can't read the projects folder" }),
        ).toBeTruthy();
        expect(document.activeElement).toBe(within(alert).getByRole('button', { name: 'Retry' }));
      });

      it("hands the returning row's Open focus when the file was repaired", async () => {
        const { rerender } = await openUnreadable(1);

        retryRow(1);
        rerender(picker(rescanned(listed)));

        expect(document.activeElement).toBe(openIn(1));
        expect(openIn(1).closest('li')!.textContent).toContain('BSL Pilot');
        expect(screen.queryByRole('alert')).toBeNull();
      });

      it('moves no focus when the file was removed — the row is gone (Ruling 6)', async () => {
        const { rerender } = await openUnreadable(1);

        retryRow(1);
        rerender(picker(listedWithout('id-2')));

        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(document.activeElement).toBe(document.body);
      });

      it('moves no focus when the removed file was the last one — first-run', async () => {
        openAction.mockResolvedValue(unreadable());
        const only: ProjectListView = {
          status: 'listed',
          projects: [
            {
              id: 'id-2',
              name: 'BSL Pilot',
              updatedAt: '2026-09-25T09:00:00.000Z',
              updatedAgo: '3d ago',
            },
          ],
        };
        const { rerender } = render(picker(only));
        fireEvent.click(openIn(0));
        await settle();

        retryRow(0);
        rerender(picker(firstRun));

        expect(screen.getAllByRole('heading', { name: 'No projects yet' }).length).toBeGreaterThan(
          0,
        );
        expect(document.activeElement).toBe(document.body);
      });

      it('waits for the answer: the view Retry was pressed on moves nothing', async () => {
        const { rerender } = await openUnreadable(1);

        retryRow(1);
        // Re-rendered, but not re-scanned: the same view Retry was pressed on.
        rerender(picker(listed));
        expect(document.activeElement).not.toBe(openIn(1));

        rerender(picker(rescanned(listed)));
        expect(document.activeElement).toBe(openIn(1));
      });

      it('takes no focus for a background re-scan — the failure stays, focus stays put', async () => {
        const { rerender } = await openUnreadable(1);
        (document.activeElement as HTMLElement | null)?.blur();

        // A re-scan no Retry started — another row's not-here, or a Create.
        rerender(picker(rescanned(listed)));

        expect(within(row(1)).getByRole('alert')).toBeTruthy();
        expect(document.activeElement).toBe(document.body);
      });

      it("takes no focus for a list error nobody's Retry caused", () => {
        const { rerender } = render(picker(listed));

        rerender(picker(rescanned(failed)));

        expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Retry' }));
      });

      it('is spent once answered: the next re-scan, restored or failed, moves no focus', async () => {
        const { rerender } = await openUnreadable(1);
        retryRow(1);
        rerender(picker(rescanned(listed)));
        expect(document.activeElement).toBe(openIn(1));
        (document.activeElement as HTMLElement | null)?.blur();

        rerender(picker(rescanned(listed)));
        expect(document.activeElement).toBe(document.body);

        rerender(picker(rescanned({ ...failed, traceId: 'someone-elses-re-scan' })));
        expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Retry' }));
      });

      it("keeps the list error's own Retry rule: a failure after its Retry takes focus", async () => {
        const { rerender } = await openUnreadable(1);
        retryRow(1);
        rerender(picker(rescanned({ ...failed, traceId: 'first' })));
        (document.activeElement as HTMLElement | null)?.blur();

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        (document.activeElement as HTMLElement | null)?.blur();
        rerender(picker(rescanned({ ...failed, traceId: 'second' })));

        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }));
      });

      it('passes an accessibility check after a repaired row returns with focus', async () => {
        const { container, rerender } = await openUnreadable(1);
        retryRow(1);
        rerender(picker(rescanned(listed)));
        expect(await axe(container)).toHaveNoViolations();
      });
    });

    describe('wrapping, locally — a long location never widens the row (F2)', () => {
      /** The override the picker adds; jsdom has no layout, so the browser measures the rest. */
      const OVERRIDE = [
        '[&>p:first-of-type]:wrap-anywhere',
        'max-md:flex-wrap',
        'max-md:[&>p:first-of-type]:basis-full',
      ];

      it('lets the location break anywhere, and the row wrap below bp.md', async () => {
        await openUnreadable(1);
        const alert = within(row(1)).getByRole('alert');

        expect(alert.className.split(/\s+/)).toEqual(expect.arrayContaining(OVERRIDE));
      });

      it("aims at the location: it is the block's first p, ahead of the trace ID", async () => {
        await openUnreadable(1);
        const alert = within(row(1)).getByRole('alert');

        expect(alert.querySelector(':scope > p:first-of-type')!.textContent).toBe(WHERE);
        expect(alert.querySelector(':scope > p:last-of-type')!.textContent).toBe(
          `Trace ID ${TRACE}`,
        );
      });

      it("only adds to the frozen inline error's own classes — nothing removed", async () => {
        const frozen = render(
          <SyStateBlock
            state="error"
            size="inline"
            heading="x"
            description="y"
            traceId="z"
            action={{ label: 'Retry', onAction: () => {} }}
          />,
        );
        const own = frozen.getByRole('alert').className.split(/\s+/);
        frozen.unmount();

        await openUnreadable(1);
        const classes = within(row(1)).getByRole('alert').className.split(/\s+/);

        expect(classes.filter((c) => !OVERRIDE.includes(c)).sort()).toEqual([...own].sort());
      });

      it('changes no other SyStateBlock — the list error keeps its frozen classes', () => {
        render(picker(failed));
        const classes = screen.getByRole('alert').className.split(/\s+/);

        for (const override of OVERRIDE) expect(classes).not.toContain(override);
      });
    });

    it('gives a second failure on the same row its own trace ID and hands Retry focus again', async () => {
      const { rerender } = await openUnreadable(1);
      fireEvent.click(within(row(1)).getByRole('button', { name: 'Retry' }));
      rerender(picker(listed));
      (document.activeElement as HTMLElement | null)?.blur();

      openAction.mockResolvedValue(unreadable('a-second-occurrence'));
      fireEvent.click(openIn(1));
      await settle();

      expect(row(1).textContent).toContain('Trace ID a-second-occurrence');
      expect(document.activeElement).toBe(within(row(1)).getByRole('button', { name: 'Retry' }));
    });

    it('ignores a failure for a row the list no longer has', async () => {
      const pending = deferred();
      openAction.mockReturnValue(pending.promise);
      const { rerender } = render(picker(listed));

      fireEvent.click(openIn(0));
      rerender(picker(listedWithout('id-1')));
      await act(async () => pending.resolve(unreadable()));
      await settle();

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('passes an accessibility check', async () => {
      const { container } = await openUnreadable(1);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('the arrival mark (Ruling 2)', () => {
    it('is dropped when the Picker mounts, so a stale mark cannot outlive it', () => {
      markOpenArrival('id-3');
      render(picker(listed));
      expect(isOpenArrival('id-3')).toBe(false);
    });
  });

  it('passes an accessibility check while an Open is pending', async () => {
    const pending = deferred();
    openAction.mockReturnValue(pending.promise);
    const { container } = render(picker(listed));
    fireEvent.click(openIn(0));

    expect(await axe(container)).toHaveNoViolations();
    await act(async () => pending.resolve(notHere));
  });
});
