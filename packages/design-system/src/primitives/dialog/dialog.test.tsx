import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { cn } from '../../lib/cn.js';
import { SyButton } from '../button/index.js';
import { SyDialog } from './dialog.js';
import { DIALOG_STATES, DIALOG_VARIANTS } from './dialog.variants.js';
import * as stories from './dialog.stories.js';

const composed = composeStories(stories);

const base = {
  title: 'Publish 12 signs?',
  confirm: { label: 'Publish 12 signs', onSelect: () => {} },
  children: <p>The 12 selected signs become publicly visible.</p>,
} as const;

describe('SyDialog — coverage', () => {
  it('declares the four contracted states', () => {
    expect([...DIALOG_STATES]).toEqual(['default', 'destructive', 'loading', 'error-in-place']);
  });

  it('declares the two contracted variants', () => {
    expect([...DIALOG_VARIANTS]).toEqual(['default', 'destructive']);
  });

  it('renders nothing at all when closed', () => {
    const { container } = render(<SyDialog {...base} open={false} onCancel={() => {}} />);
    expect(container.textContent).toBe('');
  });
});

describe('SyDialog — roles and labelling', () => {
  it('is a dialog labelled by its title', () => {
    render(<SyDialog {...base} open onCancel={() => {}} />);
    const surface = screen.getByRole('dialog', { name: 'Publish 12 signs?' });
    const labelledBy = surface.getAttribute('aria-labelledby')!;
    expect(document.getElementById(labelledBy)?.textContent).toBe('Publish 12 signs?');
  });

  /** "alertdialog for destructive" — stated outright in the contract. */
  it('becomes an alertdialog when the decision is destructive', () => {
    render(<SyDialog {...base} open variant="destructive" onCancel={() => {}} />);
    expect(screen.getByRole('alertdialog', { name: 'Publish 12 signs?' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stays a plain dialog otherwise', () => {
    render(<SyDialog {...base} open onCancel={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  /** D14: this is the surface the design says traps, and it says so. */
  it('declares itself modal', () => {
    render(<SyDialog {...base} open onCancel={() => {}} />);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });

  it('describes itself by its body, so the impact is announced with the title', () => {
    render(<SyDialog {...base} open onCancel={() => {}} />);
    const describedBy = screen.getByRole('dialog').getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toContain('publicly visible');
  });
});

describe('SyDialog — the anatomy: title, impact as text, named confirm and cancel', () => {
  it('names the action and its count on the confirm button, never a generic word', () => {
    render(<SyDialog {...base} open onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Publish 12 signs' })).toBeTruthy();
    for (const generic of ['OK', 'Yes', 'Confirm']) {
      expect(screen.queryByRole('button', { name: generic })).toBeNull();
    }
  });

  it('offers cancel, in the specimen’s own word', () => {
    render(<SyDialog {...base} open onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('takes a third way out, as the drawn specimen does', () => {
    const onSelect = vi.fn();
    render(
      <SyDialog
        {...base}
        open
        variant="destructive"
        onCancel={() => {}}
        alternative={{ label: 'Deprecate instead', onSelect }}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Deprecate instead' })).toBeTruthy();
  });

  /**
   * "impact preview is text, not a warning icon alone". The body must carry
   * readable content, and the dialog must not substitute a glyph for it.
   */
  it('states the impact in text', () => {
    render(
      <SyDialog {...base} open variant="destructive" onCancel={() => {}}>
        <p>Soft delete, recoverable for 30 days.</p>
      </SyDialog>,
    );
    expect(screen.getByText(/recoverable for 30 days/)).toBeTruthy();
  });

  it('carries no decorative glyph standing in for the impact', () => {
    const { container } = render(
      <SyDialog {...base} open variant="destructive" onCancel={() => {}}>
        <p>Soft delete, recoverable for 30 days.</p>
      </SyDialog>,
    );
    // The only aria-hidden mark a dialog may carry is the error marker, and
    // there is no error here.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });

  it('tones the confirm action to the decision', () => {
    const { container: plain } = render(<SyDialog {...base} open onCancel={() => {}} />);
    expect(plain.innerHTML).toContain('bg-accent-default');

    const { container: danger } = render(
      <SyDialog {...base} open variant="destructive" onCancel={() => {}} />,
    );
    expect(danger.innerHTML).toContain('border-status-danger-fg');
  });
});

describe('SyDialog — loading and error in place', () => {
  it('keeps the label and marks the dialog busy while the decision runs', () => {
    render(<SyDialog {...base} open loading onCancel={() => {}} />);
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
    // The label persists — SyButton's own contract, reused here.
    const confirm = screen.getByRole('button', { name: /Publish 12 signs/ });
    expect(confirm.getAttribute('aria-busy')).toBe('true');
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a failure in place rather than closing', () => {
    render(
      <SyDialog
        {...base}
        open
        onCancel={() => {}}
        error="Two signs are missing a reference clip"
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('missing a reference clip');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish 12 signs' })).toBeTruthy();
  });
});

describe('SyDialog — keyboard and the substrate contract', () => {
  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<SyDialog {...base} open onCancel={onCancel} />);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('takes focus on the surface rather than arming an action', () => {
    render(<SyDialog {...base} open variant="destructive" onCancel={() => {}} />);
    // Arming "Delete" under the return key is how a confirmation becomes an
    // accident.
    expect(document.activeElement).toBe(screen.getByRole('alertdialog'));
  });

  /** D14: containment, which is the half the design states outright. */
  it('contains Tab, wrapping at the last action', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SyDialog
          {...base}
          open
          onCancel={() => {}}
          alternative={{ label: 'Deprecate instead', onSelect: () => {} }}
        />
        <button type="button">Outside</button>
      </>,
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Publish 12 signs' });

    confirm.focus();
    await user.tab();
    expect(document.activeElement).toBe(cancel);
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Outside' }));
  });

  it('contains Shift+Tab, wrapping at the first action', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SyDialog {...base} open onCancel={() => {}} />
        <button type="button">Outside</button>
      </>,
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Publish 12 signs' });

    cancel.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
  });

  function Harness() {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    return (
      <div>
        <SyButton ref={triggerRef} onClick={() => setOpen(true)}>
          Publish
        </SyButton>
        <SyDialog {...base} open={open} onCancel={() => setOpen(false)} triggerRef={triggerRef} />
      </div>
    );
  }

  it('returns focus to the trigger on cancel', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Publish' });

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the trigger even when opening never focused it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Publish' });

    fireEvent.click(trigger);
    expect(document.activeElement).not.toBe(trigger);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });
});

describe('SyDialog — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed]!;
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('carries no unreachable classes', () => {
    const { container } = render(
      <SyDialog {...base} open variant="destructive" onCancel={() => {}} />,
    );
    const normalise = (value: string) => value.split(/\s+/).filter(Boolean).join(' ');
    for (const element of container.querySelectorAll<HTMLElement>('[class]')) {
      const raw = normalise(element.getAttribute('class') ?? '');
      expect(normalise(cn(raw)), `<${element.tagName.toLowerCase()}> ${raw}`).toBe(raw);
    }
  });
});
