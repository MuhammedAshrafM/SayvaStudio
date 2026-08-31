import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { cn } from '../../lib/cn.js';
import { SyMenu, type SyMenuGroup } from './menu.js';
import { MENU_ITEM_TONES, MENU_STATES } from './menu.variants.js';
import * as stories from './menu.stories.js';

const composed = composeStories(stories);

const groups = (overrides: Partial<SyMenuGroup>[] = []): SyMenuGroup[] => [
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'rename', label: 'Rename…', shortcut: '⌘R', onSelect: () => {} },
      { id: 'gloss', label: 'Edit gloss', onSelect: () => {} },
    ],
  },
  {
    id: 'destructive',
    label: 'Destructive',
    items: [{ id: 'delete', label: 'Delete sign', tone: 'destructive', onSelect: () => {} }],
  },
  ...(overrides as SyMenuGroup[]),
];

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Row actions' }));
  return screen.getByRole('menu', { name: 'Row actions' });
};

describe('SyMenu — coverage', () => {
  it('declares the four contracted states', () => {
    expect([...MENU_STATES]).toEqual(['open', 'loading', 'submitting', 'error-in-place']);
  });

  it('declares the two item tones', () => {
    expect([...MENU_ITEM_TONES]).toEqual(['default', 'destructive']);
  });
});

describe('SyMenu — D15: the role is menu', () => {
  it('renders role="menu", not a dialog', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    expect(screen.getByRole('menu', { name: 'Row actions' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders its commands as menuitems', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: /Rename/ })).toBeTruthy();
  });

  it('names the trigger and points it at the menu it opens', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    const trigger = screen.getByRole('button', { name: 'Row actions' });

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    const menu = await open(user);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
  });

  it('groups its commands, so the eight fixed groups have somewhere to live', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    expect(screen.getByRole('group', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Destructive' })).toBeTruthy();
  });
});

describe('SyMenu — keyboard', () => {
  it('puts focus on the first item when it opens', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Rename/ }));
  });

  it('roves focus with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit gloss' }));

    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Rename/ }));
  });

  it('jumps to the last item with End and back with Home', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Delete sign' }));

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Rename/ }));
  });

  it('activates the focused item with Enter and closes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SyMenu
        triggerLabel="Row actions"
        groups={[{ id: 'g', label: 'Edit', items: [{ id: 'a', label: 'Rename…', onSelect }] }]}
      />,
    );
    await open(user);

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps one tab stop for the whole menu, roving it with the cursor', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);

    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('menuitem').map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
  });
});

describe('SyMenu — the substrate contract', () => {
  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    const trigger = screen.getByRole('button', { name: 'Row actions' });
    await open(user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the trigger after a selection too', async () => {
    const user = userEvent.setup();
    render(
      <SyMenu
        triggerLabel="Row actions"
        groups={[{ id: 'g', label: 'Edit', items: [{ id: 'a', label: 'Rename…', onSelect() {} }] }]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Row actions' });
    await open(user);

    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(trigger);
  });

  /**
   * The contract says focus returns to the *trigger*, not to whatever was
   * focused when the menu opened — and those differ whenever the menu is
   * opened by something that does not move focus first. A bare `click()`
   * does exactly that, which is how a Storybook play function opens it, and
   * the browser showed focus landing on the body instead of the trigger.
   */
  it('returns focus to the trigger even when opening never focused it', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    const trigger = screen.getByRole('button', { name: 'Row actions' });

    // fireEvent, not userEvent: a click that does not focus the button.
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).not.toBe(trigger);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  /**
   * D14: SyMenu is non-modal, so Tab is not contained. It leaves, and the
   * menu closes behind it rather than lingering with focus elsewhere.
   */
  it('does not contain Tab — D14', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SyMenu triggerLabel="Row actions" groups={groups()} />
        <button type="button">Next control</button>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Row actions' });
    await open(user);

    await user.tab();

    expect(screen.queryByRole('menu'), 'the menu closes behind the user').toBeNull();
    // And focus is not dragged back to the trigger, which would undo the Tab.
    expect(document.activeElement).not.toBe(trigger);
  });
});

describe('SyMenu — items', () => {
  it('shows the shortcut per item', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    expect(screen.getByText('⌘R')).toBeTruthy();
  });

  it('states why an unpermitted item cannot be used, and ties it to the item', async () => {
    const user = userEvent.setup();
    render(
      <SyMenu
        triggerLabel="Row actions"
        groups={[
          {
            id: 'g',
            label: 'Lifecycle',
            items: [
              {
                id: 'publish',
                label: 'Publish',
                disabled: true,
                disabledReason: 'Needs an approved review',
                onSelect() {},
              },
            ],
          },
        ]}
      />,
    );
    await open(user);

    const item = screen.getByRole('menuitem', { name: /Publish/ });
    expect(item.getAttribute('aria-disabled')).toBe('true');

    const describedBy = item.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toContain('Needs an approved review');
  });

  it('does not activate a disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SyMenu
        triggerLabel="Row actions"
        groups={[
          {
            id: 'g',
            label: 'Lifecycle',
            items: [
              {
                id: 'publish',
                label: 'Publish',
                disabled: true,
                disabledReason: 'Needs an approved review',
                onSelect,
              },
            ],
          },
        ]}
      />,
    );
    await open(user);

    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('selects with the pointer without the surface closing under it', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SyMenu
        triggerLabel="Row actions"
        groups={[{ id: 'g', label: 'Edit', items: [{ id: 'a', label: 'Rename…', onSelect }] }]}
      />,
    );
    await open(user);

    // mousedown fires before blur, so the item is still there to be chosen.
    await user.click(screen.getByRole('menuitem', { name: /Rename/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  /**
   * P5 — colour is never the only signal. The destructive group is set apart
   * structurally by a separator and named by its group label, so the tone is
   * carrying emphasis rather than meaning.
   */
  it('sets the destructive group apart by more than its colour', async () => {
    const user = userEvent.setup();
    const { container } = render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    expect(container.querySelector('[role="separator"]')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Destructive' })).toBeTruthy();
    expect(container.innerHTML).toContain('text-status-danger-fg');
  });
});

describe('SyMenu — the three content states', () => {
  it('says so while its contents are loading', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={[]} loading />);
    const menu = await open(user);

    expect(screen.getByText(/Loading actions/)).toBeTruthy();
    expect(menu.getAttribute('aria-busy')).toBe('true');
  });

  it('reports a submission in flight in the caller’s own words', async () => {
    const user = userEvent.setup();
    render(
      <SyMenu triggerLabel="Row actions" groups={groups()} submitting="Submitting for review…" />,
    );
    const menu = await open(user);

    expect(screen.getByRole('status')).toHaveProperty('textContent', 'Submitting for review…');
    expect(menu.getAttribute('aria-busy')).toBe('true');
  });

  it('shows a failure in place rather than closing', async () => {
    const user = userEvent.setup();
    render(<SyMenu triggerLabel="Row actions" groups={groups()} error="Could not submit" />);
    await open(user);

    expect(screen.getByRole('alert').textContent).toContain('Could not submit');
    // In place: the menu is still open behind the message.
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });
});

describe('SyMenu — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed]!;
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe with the menu open, not only at rest', async () => {
    const user = userEvent.setup();
    const { container } = render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);
    expect(await axe(container)).toHaveNoViolations();
  });

  /**
   * The class-collision guard sweeps every story, but a story renders the
   * menu closed — its surface is only on screen after a play function that
   * `composeStories` does not run. So the open surface is checked here.
   */
  it('carries no unreachable classes while open', async () => {
    const user = userEvent.setup();
    const { container } = render(<SyMenu triggerLabel="Row actions" groups={groups()} />);
    await open(user);

    const normalise = (value: string) => value.split(/\s+/).filter(Boolean).join(' ');
    for (const element of container.querySelectorAll<HTMLElement>('[class]')) {
      const raw = normalise(element.getAttribute('class') ?? '');
      expect(normalise(cn(raw)), `<${element.tagName.toLowerCase()}> ${raw}`).toBe(raw);
    }
  });
});
