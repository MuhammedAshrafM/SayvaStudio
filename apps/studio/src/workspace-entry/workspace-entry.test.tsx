import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import { WorkspaceEntry, WorkspaceEntryLoading } from './workspace-entry.js';
import type { WorkspaceResult } from './workspace-entry-copy.js';

/**
 * The Workspace Entry, tested against its canonical design (Screens §04.1)
 * and the frozen `SyStateBlock` contract it renders through.
 *
 * `useRouter` is the one thing jsdom cannot provide — there is no App Router
 * here — so it is replaced by a recorder. Retry's contract is "re-runs the
 * resolution", which on a per-request page is exactly `router.refresh()`.
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  refresh.mockClear();
});

const PROJECT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const WHERE = `C:/authoring/projects/${PROJECT_ID}.sayva`;
const TRACE = '9b2c1e7a-5d3f-4a8e-9c61-0f4e2d7b8a13';
const ANOTHER_TRACE = '1d6f3b2a-7c4e-4f9a-8b5d-2e0c9a7f6b31';

const opened: WorkspaceResult = {
  status: 'opened',
  project: {
    id: PROJECT_ID,
    name: 'ArSL Curriculum',
    schemaVersion: 1,
    state: 'Created',
    createdAt: '2026-09-11T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
    tags: ['pilot'],
  },
};
const cantRead = (traceId = TRACE): WorkspaceResult => ({
  status: 'cant-read',
  traceId,
  location: WHERE,
});

/** Every element a Tab key could reach. */
const tabStops = (container: HTMLElement) =>
  container.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');

describe('resolved — the Project opened', () => {
  it('is one main landmark, named by the Project name', () => {
    render(<WorkspaceEntry result={opened} />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'ArSL Curriculum' })).toBeTruthy();
  });

  it('shows the name as the h1, then the zero-Language heading and line', () => {
    render(<WorkspaceEntry result={opened} />);
    const headings = screen.getAllByRole('heading');

    expect(headings.map((h) => [h.tagName, h.textContent])).toEqual([
      ['H1', 'ArSL Curriculum'],
      ['H2', 'No languages yet'],
    ]);
    expect(screen.getByText('This project is open and has no sign languages.').tagName).toBe('P');
  });

  it('uses the type tokens §04.1 names, and lets the name wrap rather than truncate', () => {
    render(<WorkspaceEntry result={opened} />);

    const name = screen.getByRole('heading', { level: 1 });
    expect(name.className.split(' ')).toEqual(['text-heading-lg', 'wrap-break-word']);
    expect(screen.getByRole('heading', { level: 2 }).className).toBe('text-heading-md');
    expect(screen.getByText(/has no sign languages/).className).toBe('text-body');
  });

  it('shows nothing else from the Project — no id, state, tags or dates', () => {
    const { container } = render(<WorkspaceEntry result={opened} />);
    expect(container.textContent).toBe(
      'ArSL CurriculumNo languages yetThis project is open and has no sign languages.',
    );
  });

  it('has no Tab stop and moves no focus', () => {
    const { container } = render(<WorkspaceEntry result={opened} />);
    expect(tabStops(container)).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<WorkspaceEntry result={opened} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("can't read — a ProjectFileFailure", () => {
  it('is one main landmark, named by the error heading', () => {
    render(<WorkspaceEntry result={cantRead()} />);
    expect(screen.getAllByRole('main')).toHaveLength(1);

    const main = screen.getByRole('main', { name: "Can't open the project" });
    expect(main.getAttribute('aria-label')).toBe(within(main).getByRole('heading').textContent);
  });

  it("uses the fixed heading at SyStateBlock's default h2, and has no h1", () => {
    render(<WorkspaceEntry result={cantRead()} />);
    const headings = screen.getAllByRole('heading');

    expect(headings).toHaveLength(1);
    expect(headings[0]?.tagName).toBe('H2');
    expect(headings[0]?.textContent).toBe("Can't open the project");
  });

  it('names the location in the approved line', () => {
    render(<WorkspaceEntry result={cantRead()} />);
    expect(screen.getByText(`Studio couldn't read ${WHERE}.`)).toBeTruthy();
  });

  it("shows the trace ID through SyStateBlock's own label", () => {
    render(<WorkspaceEntry result={cantRead()} />);
    expect(screen.getByText(/^Trace ID/).textContent).toBe(`Trace ID ${TRACE}`);
  });

  it('is announced assertively', () => {
    render(<WorkspaceEntry result={cantRead()} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('offers Retry as its only Tab stop, and Retry re-runs the resolution', () => {
    const { container } = render(<WorkspaceEntry result={cantRead()} />);
    expect([...tabStops(container)].map((el) => el.textContent)).toEqual(['Retry']);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('gives Retry no loading state — a temporary boundary of this slice', () => {
    render(<WorkspaceEntry result={cantRead()} />);
    const retry = screen.getByRole('button', { name: 'Retry' });

    fireEvent.click(retry);
    expect(retry.getAttribute('aria-busy')).toBeNull();
  });

  it('does not take focus on a document load', () => {
    render(<WorkspaceEntry result={cantRead()} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('hands focus to Retry when a failure comes back after the author retried', () => {
    const { rerender } = render(<WorkspaceEntry result={cantRead()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    (document.activeElement as HTMLElement | null)?.blur();

    // The refreshed route resolves again and fails again: a new occurrence.
    rerender(<WorkspaceEntry result={cantRead(ANOTHER_TRACE)} />);

    expect(screen.getByText(/^Trace ID/).textContent).toBe(`Trace ID ${ANOTHER_TRACE}`);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }));
  });

  it('mounts each occurrence as a new alert, so it is announced afresh', () => {
    const { rerender } = render(<WorkspaceEntry result={cantRead()} />);
    const first = screen.getByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    rerender(<WorkspaceEntry result={cantRead(ANOTHER_TRACE)} />);

    expect(screen.getByRole('alert')).not.toBe(first);
  });

  it('gives way to the resolved state when a Retry succeeds', () => {
    const { rerender } = render(<WorkspaceEntry result={cantRead()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    rerender(<WorkspaceEntry result={opened} />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('main', { name: 'ArSL Curriculum' })).toBeTruthy();
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<WorkspaceEntry result={cantRead()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('loading — the resolution pending', () => {
  it('is a busy main landmark holding SyStateBlock loading, named "Opening the project"', () => {
    render(<WorkspaceEntryLoading />);

    const main = screen.getByRole('main');
    expect(main.getAttribute('aria-busy')).toBe('true');
    expect(within(main).getByRole('status', { name: 'Opening the project' })).toBeTruthy();
  });

  it('is a skeleton hidden from assistive technology, not a spinner, and has no heading', () => {
    const { container } = render(<WorkspaceEntryLoading />);
    const region = screen.getByRole('status');

    expect(region.children).toHaveLength(1);
    expect(region.children[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(tabStops(container)).toHaveLength(0);
  });

  it('passes an accessibility check', async () => {
    const { container } = render(<WorkspaceEntryLoading />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('what this surface must not show — any state', () => {
  const states = [
    ['resolved', () => <WorkspaceEntry result={opened} />],
    ["can't read", () => <WorkspaceEntry result={cantRead()} />],
    ['loading', () => <WorkspaceEntryLoading />],
  ] as const;

  it.each(states)('has no return control and no link (%s)', (_label, ui) => {
    const { container } = render(ui());
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(screen.queryByText(/\bback\b|\breturn\b/i)).toBeNull();
  });

  it.each(states)('has no shell furniture — one main and no other landmark (%s)', (_label, ui) => {
    render(ui());
    expect(screen.getAllByRole('main')).toHaveLength(1);
    for (const role of ['banner', 'navigation', 'complementary', 'contentinfo', 'search']) {
      expect(screen.queryAllByRole(role)).toHaveLength(0);
    }
  });
});
