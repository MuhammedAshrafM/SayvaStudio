import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import type { ProjectListView } from '@sayva/application';
import { ProjectPicker, ProjectPickerLoading } from './project-picker.js';

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
const failed: ProjectListView = { status: 'error', traceId: TRACE, location: WHERE };

describe('the header — every state', () => {
  it.each([
    ['listed', listed],
    ['first-run', firstRun],
    ['error', failed],
  ] as const)('names the product and the location being listed (%s)', (_label, view) => {
    render(<ProjectPicker root={ROOT} view={view} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sayva Studio' })).toBeTruthy();
    // RB-4: the canonical line, verbatim.
    expect(screen.getByText(`Studio is looking in ${ROOT}`)).toBeTruthy();
  });

  it('is one main landmark, named by its heading', () => {
    render(<ProjectPicker root={ROOT} view={listed} />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'Sayva Studio' })).toBeTruthy();
  });

  it('shows the location as plain text, not as a control', () => {
    // SR-09: the author sees the root and cannot change it.
    render(<ProjectPicker root={ROOT} view={listed} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('listed', () => {
  it('lists every Project as a list item — not a grid', () => {
    render(<ProjectPicker root={ROOT} view={listed} />);

    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    // role=grid is SyCollection's, which this surface does not use (WS-03).
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('keeps the order the query decided (PP-04)', () => {
    render(<ProjectPicker root={ROOT} view={listed} />);

    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(names).toEqual(['ArSL Curriculum 1h ago', 'BSL Pilot 3d ago', 'ASL Foundations 2w ago']);
  });

  it('shows updatedAt as RB-3 relative time, with the machine value in <time datetime>', () => {
    const { container } = render(<ProjectPicker root={ROOT} view={listed} />);

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
    const { container } = render(<ProjectPicker root={ROOT} view={listed} />);

    for (const item of screen.getAllByRole('listitem')) {
      expect(within(item).queryByRole('button')).toBeNull();
      expect(within(item).queryByRole('link')).toBeNull();
    }
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<ProjectPicker root={ROOT} view={listed} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('first-run', () => {
  it('is its own state with the canonical heading and line', () => {
    render(<ProjectPicker root={ROOT} view={firstRun} />);

    expect(screen.getByRole('heading', { level: 2, name: 'No projects yet' })).toBeTruthy();
    expect(
      screen.getByText(`Studio is looking in ${ROOT}. A project is one .sayva file.`),
    ).toBeTruthy();
  });

  it('is never a bare empty list', () => {
    render(<ProjectPicker root={ROOT} view={firstRun} />);

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders no New Project action, and nothing in its place', () => {
    // RB-6: no substitute action and no disabled button.
    render(<ProjectPicker root={ROOT} view={firstRun} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText(/new project/i)).toBeNull();
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<ProjectPicker root={ROOT} view={firstRun} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('error', () => {
  it('uses the canonical heading and names the affected location', () => {
    render(<ProjectPicker root={ROOT} view={failed} />);

    expect(
      screen.getByRole('heading', { level: 2, name: "Can't read the projects folder" }),
    ).toBeTruthy();
    // SR-10: the line is the location.
    expect(screen.getByText(WHERE)).toBeTruthy();
  });

  it('shows the trace ID through the frozen SyStateBlock label', () => {
    render(<ProjectPicker root={ROOT} view={failed} />);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(`Trace ID ${TRACE}`);
  });

  it('keeps the location and the trace ID apart', () => {
    // SR-10 and SR-11 are separate contracts: the path is never shown as
    // the trace ID, nor the trace ID as the location.
    render(<ProjectPicker root={ROOT} view={failed} />);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).not.toContain(`Trace ID ${WHERE}`);
    expect(within(alert).getByText(WHERE).textContent).toBe(WHERE);
  });

  it('is announced assertively', () => {
    // A16: assertive for errors. The contract gives errors role=alert.
    render(<ProjectPicker root={ROOT} view={failed} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('offers Retry, which re-scans', () => {
    render(<ProjectPicker root={ROOT} view={failed} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not take focus on first paint', () => {
    render(<ProjectPicker root={ROOT} view={failed} />);
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Retry' }));
  });

  it('hands focus to Retry when a failure comes back after the author retried', () => {
    const { rerender } = render(<ProjectPicker root={ROOT} view={failed} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    (document.activeElement as HTMLElement | null)?.blur();
    // The re-scan failed again: a new occurrence, so a new trace ID.
    rerender(<ProjectPicker root={ROOT} view={{ ...failed, traceId: 'a-new-occurrence' }} />);

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('alert').textContent).toContain('Trace ID a-new-occurrence');
  });

  it('offers nothing but Retry', () => {
    render(<ProjectPicker root={ROOT} view={failed} />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Retry']);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<ProjectPicker root={ROOT} view={failed} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('loading', () => {
  it('is a skeleton named by the canonical label', () => {
    render(<ProjectPickerLoading root={ROOT} />);

    // RB-5: the region's accessible name.
    expect(screen.getByRole('status', { name: `Studio is looking in ${ROOT}` })).toBeTruthy();
  });

  it('is not a spinner', () => {
    const { container } = render(<ProjectPickerLoading root={ROOT} />);

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('keeps the header while the scan is in flight', () => {
    render(<ProjectPickerLoading root={ROOT} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sayva Studio' })).toBeTruthy();
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<ProjectPickerLoading root={ROOT} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('what this slice must not show — any state', () => {
  const every = [
    ['listed', () => render(<ProjectPicker root={ROOT} view={listed} />)],
    ['first-run', () => render(<ProjectPicker root={ROOT} view={firstRun} />)],
    ['error', () => render(<ProjectPicker root={ROOT} view={failed} />)],
    ['loading', () => render(<ProjectPickerLoading root={ROOT} />)],
  ] as const;

  it.each(every)(
    'offers no New Project, Duplicate, Delete, Archive or Rename action (%s)',
    (_label, show) => {
      show();
      // Checked on the controls, not on all text: a Project's name is the
      // author's content and may contain any of these words.
      const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')];
      for (const control of controls) {
        expect(control.textContent).not.toMatch(/new project|duplicate|delete|archive|rename/i);
      }
      // RB-6's one piece of copy is absent as text too, not merely unclickable.
      expect(screen.queryByText(/new project/i)).toBeNull();
    },
  );

  it.each(every)('has no disabled control standing in for one (%s)', (_label, show) => {
    const { container } = show();
    expect(container.querySelectorAll('[disabled], [aria-disabled="true"]')).toHaveLength(0);
  });

  it.each(every)('never shows the PP-02 proof label (%s)', (_label, show) => {
    show();
    expect(screen.queryByText(/Workspace root:/)).toBeNull();
  });
});
