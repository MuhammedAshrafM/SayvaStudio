import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { SyButton } from './button.js';
import * as stories from './button.stories.js';

const composed = composeStories(stories);

describe('SyButton — accessible name', () => {
  it('takes its name from the label, which is the verb', () => {
    render(<SyButton>Approve</SyButton>);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  it('names an icon-only button from its required label', () => {
    render(<SyButton variant="icon-only" label="Row actions" icon={<svg aria-hidden="true" />} />);
    expect(screen.getByRole('button', { name: 'Row actions' })).toBeTruthy();
  });

  it('keeps a decorative leading icon out of the name', () => {
    render(<SyButton icon={<svg aria-hidden="true" />}>Attach media</SyButton>);
    // Exact match: an icon leaking into the name would make this fail.
    expect(screen.getByRole('button', { name: 'Attach media' })).toBeTruthy();
  });
});

describe('SyButton — keyboard (§16 keyboard completeness)', () => {
  it('is reachable by Tab and activates on Enter', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SyButton onClick={onClick}>Approve</SyButton>);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Approve' }));
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates on Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SyButton onClick={onClick}>Approve</SyButton>);

    await user.tab();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is a native button, so it is never a tabindex trap', () => {
    render(<SyButton>Approve</SyButton>);
    const button = screen.getByRole('button', { name: 'Approve' });
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('tabindex')).toBe(false);
  });
});

describe('SyButton — loading', () => {
  it('keeps the label and sets aria-busy', () => {
    render(<SyButton loading>Building pack</SyButton>);
    const button = screen.getByRole('button', { name: 'Building pack' });
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('is not disabled while loading, because a disabled element loses focus', () => {
    render(<SyButton loading>Building pack</SyButton>);
    const button = screen.getByRole('button', { name: 'Building pack' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('preserves focus when a focused button becomes busy', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [busy, setBusy] = useState(false);
      return (
        <SyButton loading={busy} onClick={() => setBusy(true)}>
          Build pack
        </SyButton>
      );
    }

    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Build pack' });
    await user.tab();
    expect(document.activeElement).toBe(button);

    await user.keyboard('{Enter}');

    // Same element, still focused, still named — the whole point of using
    // aria-busy rather than disabled.
    expect(screen.getByRole('button', { name: 'Build pack' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('suppresses activation while busy', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SyButton loading onClick={onClick}>
        Building pack
      </SyButton>,
    );

    await user.click(screen.getByRole('button', { name: 'Building pack' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('swaps the icon for the spinner rather than adding to it', () => {
    const { container, rerender } = render(
      <SyButton icon={<svg data-testid="leading" aria-hidden="true" />}>Build pack</SyButton>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    rerender(
      <SyButton loading icon={<svg data-testid="leading" aria-hidden="true" />}>
        Build pack
      </SyButton>,
    );
    // Still one glyph: the spinner replaced the icon, it did not join it.
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('svg')?.classList.contains('animate-spin')).toBe(true);
  });
});

describe('SyButton — disabled always states a reason', () => {
  const reason = 'Approval is blocked: reference clip missing (media.missing)';

  it('is inert', () => {
    render(
      <SyButton disabled disabledReason={reason}>
        Approve
      </SyButton>,
    );
    expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('associates the reason with the button', () => {
    render(
      <SyButton disabled disabledReason={reason}>
        Approve
      </SyButton>,
    );
    const button = screen.getByRole('button', { name: 'Approve' });
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe(reason);
  });

  it('keeps the reason out of the accessible name', () => {
    render(
      <SyButton disabled disabledReason={reason}>
        Approve
      </SyButton>,
    );
    // A reason rendered inside the button would make the name
    // "Approve Approval is blocked…" and this exact match would fail.
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  it('carries no describedby when it is not disabled', () => {
    render(<SyButton>Approve</SyButton>);
    expect(screen.getByRole('button', { name: 'Approve' }).hasAttribute('aria-describedby')).toBe(
      false,
    );
  });
});

describe('SyButton — variants and sizes are distinct', () => {
  it('gives every tone a different class set', () => {
    const tones = ['primary', 'secondary', 'ghost', 'danger'] as const;
    const seen = tones.map((variant) => {
      const { container } = render(<SyButton variant={variant}>Approve</SyButton>);
      return container.querySelector('button')!.className;
    });
    expect(new Set(seen).size).toBe(tones.length);
  });

  it('gives every size a different class set', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const seen = sizes.map((size) => {
      const { container } = render(<SyButton size={size}>Approve</SyButton>);
      return container.querySelector('button')!.className;
    });
    expect(new Set(seen).size).toBe(sizes.length);
  });

  it('lets a caller override a default rather than colliding with it', () => {
    const { container } = render(<SyButton className="rounded-md">Approve</SyButton>);
    const className = container.querySelector('button')!.className;
    expect(className).toContain('rounded-md');
    expect(className).not.toContain('rounded-sm');
  });
});

describe('SyButton — every story passes axe', () => {
  // The gate runs against the stories, so what is checked is what a
  // reviewer looks at in the preview.
  const entries = Object.entries(composed);

  it('covers the whole contract in stories', () => {
    expect(entries.length).toBeGreaterThanOrEqual(16);
  });

  it.each(entries.map(([name]) => name))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
