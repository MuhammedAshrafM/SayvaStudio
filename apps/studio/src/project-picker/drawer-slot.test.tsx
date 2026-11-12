import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ProjectListView } from '@sayva/application';
import { ProjectPickerBody, ProjectPickerFrame } from './project-picker.js';

/**
 * The frame's one drawer slot (DP-6): only the session that is open can
 * close it.
 *
 * Both drawers are replaced by stubs that record the `onClose` each session
 * was given. The real drawers never call a replaced session's `onClose` —
 * their own guard and their unmounting see to that — so through them this
 * rule of the frame's can never be reached on its own. Calling a recorded
 * `onClose` after its session was replaced is exactly the case the rule
 * exists for.
 */

const { refresh, push, sessions } = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  sessions: [] as { kind: 'create' | 'duplicate'; projectId?: string; onClose: () => void }[],
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock('./create-project-action', () => ({ createProjectAction: vi.fn() }));
vi.mock('./open-project-action', () => ({ openProjectAction: vi.fn() }));
vi.mock('./duplicate-project-action', () => ({ duplicateProjectAction: vi.fn() }));
vi.mock('./create-project-drawer', async () => {
  const { createElement, useState } = await import('react');
  return {
    CreateProjectDrawer: ({ onClose }: { onClose: () => void }) => {
      // Recorded once per session: each one is mounted fresh.
      useState(() => sessions.push({ kind: 'create', onClose }));
      return createElement('div', { role: 'dialog', 'aria-label': 'New Project' });
    },
  };
});
vi.mock('./duplicate-project-drawer', async () => {
  const { createElement, useState } = await import('react');
  return {
    DuplicateProjectDrawer: ({
      projectId,
      onClose,
    }: {
      projectId: string;
      onClose: () => void;
    }) => {
      useState(() => sessions.push({ kind: 'duplicate', projectId, onClose }));
      return createElement('div', { role: 'dialog', 'aria-label': `Duplicate ${projectId}` });
    },
  };
});

afterEach(() => {
  sessions.length = 0;
});

const ROOT = 'C:/authoring/projects';
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
  ],
};

function show() {
  render(
    <ProjectPickerFrame root={ROOT}>
      <ProjectPickerBody root={ROOT} view={listed} />
    </ProjectPickerFrame>,
  );
}

const duplicateIn = (index: number) =>
  within(screen.getAllByRole('listitem')[index]!).getAllByRole('button', { name: 'Duplicate' })[0]!;
const headerNewProject = () =>
  within(screen.getByRole('heading', { level: 1 }).closest('header')!).getAllByRole('button', {
    name: 'New Project',
  })[0]!;
const dialogs = () => screen.queryAllByRole('dialog').map((d) => d.getAttribute('aria-label'));

describe('the drawer slot — only the open session can close it (DP-6)', () => {
  it("ignores a replaced Duplicate session's onClose, and closes on the open one's", () => {
    show();
    fireEvent.click(duplicateIn(0));
    fireEvent.click(duplicateIn(1));
    expect(dialogs()).toEqual(['Duplicate id-2']);

    const [replaced, open] = sessions;
    act(() => replaced!.onClose());
    expect(dialogs()).toEqual(['Duplicate id-2']);

    act(() => open!.onClose());
    expect(dialogs()).toEqual([]);
  });

  it("ignores a replaced Create session's onClose once Duplicate has taken the slot", () => {
    show();
    fireEvent.click(headerNewProject());
    fireEvent.click(duplicateIn(0));
    expect(dialogs()).toEqual(['Duplicate id-1']);

    act(() => sessions[0]!.onClose());
    expect(sessions[0]!.kind).toBe('create');
    expect(dialogs()).toEqual(['Duplicate id-1']);
  });

  it("ignores a closed session's onClose after the same drawer is opened again", () => {
    show();
    fireEvent.click(duplicateIn(0));
    act(() => sessions[0]!.onClose());
    fireEvent.click(duplicateIn(0));
    expect(dialogs()).toEqual(['Duplicate id-1']);

    act(() => sessions[0]!.onClose());
    expect(dialogs()).toEqual(['Duplicate id-1']);
  });
});
