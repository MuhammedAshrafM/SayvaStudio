import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { cn } from '../../lib/cn.js';
import { SyButton } from '../button/index.js';
import { SyDrawer } from './drawer.js';
import { DRAWER_STATES, DRAWER_STATES_BLOCKED, DRAWER_VARIANTS } from './drawer.variants.js';
import * as stories from './drawer.stories.js';

const composed = composeStories(stories);

const base = {
  title: 'Bulk edit',
  children: <p>Body</p>,
} as const;

describe('SyDrawer — coverage', () => {
  it('declares the five contracted states', () => {
    expect([...DRAWER_STATES]).toEqual(['closed', 'open', 'resizing', 'dirty', 'stacked max 2']);
  });

  it('declares the two contracted variants', () => {
    expect([...DRAWER_VARIANTS]).toEqual(['right', 'bottom-sheet']);
  });

  it.each(DRAWER_VARIANTS)('renders variant %s', (variant) => {
    render(<SyDrawer {...base} open variant={variant} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Bulk edit' })).toBeTruthy();
  });
});

describe('SyDrawer — D16: resizing is declared and inert', () => {
  it('keeps resizing in the contracted state list', () => {
    expect([...DRAWER_STATES]).toContain('resizing');
  });

  it('names it as blocked rather than implemented', () => {
    expect([...DRAWER_STATES_BLOCKED]).toEqual(['resizing']);
  });

  /**
   * The whole of D16: the design gives no width range, no handle and no
   * persistence rule, so there must be nothing here that implies one. A
   * resize affordance appearing later without a ruling is the regression.
   */
  it('renders no resize affordance and sets no width', () => {
    const { container } = render(<SyDrawer {...base} open onClose={() => {}} />);
    const surface = screen.getByRole('dialog');

    expect(container.querySelector('[class*="resize"]')).toBeNull();
    expect(surface.className).not.toMatch(/\bresize/);
    expect(container.querySelector('[aria-label*="Resize" i]')).toBeNull();
    expect(container.querySelector('[role="separator"][aria-orientation]')).toBeNull();
    // No invented width: only `min-w-max`, which is content-driven.
    expect(surface.className).not.toMatch(/\bw-\d/);
    expect(surface.className).not.toMatch(/\bmax-w-/);
  });
});

describe('SyDrawer — closed is a state, not a hidden surface', () => {
  it('renders nothing at all when closed', () => {
    const { container } = render(<SyDrawer {...base} open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.textContent).toBe('');
  });
});

describe('SyDrawer — accessibility', () => {
  it('is a dialog labelled by its title', () => {
    render(<SyDrawer {...base} open onClose={() => {}} />);
    const surface = screen.getByRole('dialog', { name: 'Bulk edit' });
    const labelledBy = surface.getAttribute('aria-labelledby')!;
    expect(document.getElementById(labelledBy)?.textContent).toBe('Bulk edit');
  });

  it('renders the title as a real heading', () => {
    render(<SyDrawer {...base} open onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Bulk edit' })).toBeTruthy();
  });

  /** D14: non-modal, and it says so rather than leaving it to be inferred. */
  it('declares itself non-modal', () => {
    render(<SyDrawer {...base} open onClose={() => {}} />);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false');
  });

  it('takes focus on the surface rather than stealing it onto an action', () => {
    render(
      <SyDrawer {...base} open onClose={() => {}} footer={<SyButton>Apply to 12</SyButton>} />,
    );
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('renders the footer actions the anatomy calls for', () => {
    render(
      <SyDrawer {...base} open onClose={() => {}} footer={<SyButton>Apply to 12</SyButton>} />,
    );
    expect(screen.getByRole('button', { name: 'Apply to 12' })).toBeTruthy();
  });
});

describe('SyDrawer — keyboard', () => {
  it('closes on Escape when there is nothing unsaved', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SyDrawer {...base} open onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits on ⌘Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SyDrawer {...base} open onClose={() => {}} onSubmit={onSubmit} />);

    screen.getByRole('dialog').focus();
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits on Ctrl+Enter too, for keyboards without a Meta key', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SyDrawer {...base} open onClose={() => {}} onSubmit={onSubmit} />);

    screen.getByRole('dialog').focus();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does nothing on plain Enter, which belongs to whatever is focused', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SyDrawer {...base} open onClose={() => {}} onSubmit={onSubmit} />);

    screen.getByRole('dialog').focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('SyDrawer — dirty blocks the close and prompts instead', () => {
  it('refuses to close on Escape, and asks', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onRequestDiscard = vi.fn();
    render(<SyDrawer {...base} open onClose={onClose} dirty onRequestDiscard={onRequestDiscard} />);

    await user.keyboard('{Escape}');
    expect(onRequestDiscard).toHaveBeenCalledTimes(1);
    // "blocks close": the drawer does not go anywhere on its own.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes normally once it is clean again', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SyDrawer {...base} open onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SyDrawer — the substrate contract', () => {
  /** Controlled, so the harness owns `open` the way an application would. */
  function Harness({ dirty = false }: { dirty?: boolean }) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    return (
      <div>
        <SyButton ref={triggerRef} onClick={() => setOpen(true)}>
          Bulk edit
        </SyButton>
        <button type="button">Next control</button>
        {dirty ? (
          <SyDrawer
            {...base}
            open={open}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
            dirty
            onRequestDiscard={() => {}}
          />
        ) : (
          <SyDrawer {...base} open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} />
        )}
      </div>
    );
  }

  it('returns focus to the trigger on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Bulk edit' });

    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  /** The case the browser found on SyMenu: a click that never moved focus. */
  it('returns focus to the trigger even when opening never focused it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Bulk edit' });

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.activeElement).not.toBe(trigger);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  /**
   * D14: non-modal. Tab leaves the drawer — and unlike a menu, the drawer
   * stays open, because it is beside the work rather than in front of it.
   */
  it('does not contain Tab, and stays open when focus leaves — D14', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Bulk edit' }));
    const surface = screen.getByRole('dialog');
    expect(document.activeElement).toBe(surface);

    await user.tab();

    expect(document.activeElement).not.toBe(surface);
    expect(surface.contains(document.activeElement)).toBe(false);
    expect(screen.getByRole('dialog'), 'the drawer stays beside the work').toBeTruthy();
  });
});

describe('SyDrawer — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed]!;
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('carries no unreachable classes', () => {
    const { container } = render(<SyDrawer {...base} open onClose={() => {}} />);
    const normalise = (value: string) => value.split(/\s+/).filter(Boolean).join(' ');
    for (const element of container.querySelectorAll<HTMLElement>('[class]')) {
      const raw = normalise(element.getAttribute('class') ?? '');
      expect(normalise(cn(raw)), `<${element.tagName.toLowerCase()}> ${raw}`).toBe(raw);
    }
  });
});
