import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import type { ProjectListView } from '@sayva/application';
import { ProjectPickerBody, ProjectPickerFrame, ProjectPickerLoading } from './project-picker.js';

/**
 * The read-only Project Picker, tested against the canonical design (Screens
 * §04) and the frozen `SyStateBlock` contract it renders through.
 *
 * `useRouter` is the one thing jsdom cannot provide — there is no App Router
 * here — so it is replaced by a recorder. Retry's contract is "re-scans",
 * which on a per-request page is exactly `router.refresh()`.
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
// The Server Action reaches the server-only Composition Root; the header's
// Create drawer imports it, so it is replaced here. create-project.test.tsx
// exercises it.
vi.mock('./create-project-action', () => ({ createProjectAction: vi.fn() }));

afterEach(() => {
  refresh.mockClear();
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
    expect(names).toEqual(['ArSL Curriculum 1h ago', 'BSL Pilot 3d ago', 'ASL Foundations 2w ago']);
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

  it('gives rows no actions and no focus stops', () => {
    // Open has nowhere to go until the shell exists; Duplicate is its own
    // slice. A focusable row with nothing to do would be a trap.
    const { container } = render(picker(listed));

    for (const item of screen.getAllByRole('listitem')) {
      expect(within(item).queryByRole('button')).toBeNull();
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

  it.each(every)(
    'offers no Open, Duplicate, Delete, Archive or Rename action (%s)',
    (_label, show) => {
      show();
      // Checked on the controls, not on all text: a Project's name is the
      // author's content and may contain any of these words. New Project is
      // no longer on this list — the Create slice brings it.
      const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')];
      for (const control of controls) {
        expect(control.textContent).not.toMatch(/\bopen\b|duplicate|delete|archive|rename/i);
      }
    },
  );

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
