import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { SyEntityRef, ENTITY_REF_STATES, ENTITY_REF_VARIANTS } from './entity-ref.js';
import * as stories from './entity-ref.stories.js';

const composed = composeStories(stories);

const base = { typeLabel: 'Sign', name: 'Peace be upon you', id: 'SIGN-04812' } as const;

/** Minimal valid props per state — deprecated must state its replacement. */
function propsFor(state: (typeof ENTITY_REF_STATES)[number]) {
  if (state === 'loading') return { typeLabel: 'Sign', id: 'SIGN-04812', state } as const;
  if (state === 'deprecated') return { ...base, state, replacement: 'SIGN-04999' } as const;
  return { ...base, state } as const;
}

describe('SyEntityRef — coverage', () => {
  it('declares the five contracted states', () => {
    expect([...ENTITY_REF_STATES]).toEqual([
      'resolved',
      'loading',
      'deleted',
      'no-permission',
      'deprecated',
    ]);
  });

  it('declares the four contracted variants', () => {
    expect([...ENTITY_REF_VARIANTS]).toEqual(['chip', 'row', 'inline', 'thumbnail']);
  });

  it.each(ENTITY_REF_STATES)('renders state %s', (state) => {
    render(<SyEntityRef {...propsFor(state)} />);
    expect(screen.getByRole('group')).toBeTruthy();
  });

  it.each(ENTITY_REF_VARIANTS)('renders variant %s', (variant) => {
    render(<SyEntityRef {...base} variant={variant} />);
    expect(screen.getByRole('group')).toBeTruthy();
  });
});

describe('SyEntityRef — accessible name is type + name + ID', () => {
  it('names a resolved reference with all three parts', () => {
    render(<SyEntityRef {...base} />);
    expect(screen.getByRole('group', { name: 'Sign, Peace be upon you, SIGN-04812' })).toBeTruthy();
  });

  it('is never a bare ID', () => {
    render(<SyEntityRef {...base} />);
    // The exact-match query below would still pass on a bare ID if the name
    // were just the ID, so assert the parts are all present and that the
    // name is not the ID alone.
    const ref = screen.getByRole('group');
    const label = ref.getAttribute('aria-label')!;
    expect(label).not.toBe('SIGN-04812');
    expect(label).toContain('Sign');
    expect(label).toContain('Peace be upon you');
    expect(label).toContain('SIGN-04812');
  });

  it('keeps the type and ID in the name even before the name resolves', () => {
    render(<SyEntityRef typeLabel="Sign" id="SIGN-04812" state="loading" />);
    const label = screen.getByRole('group').getAttribute('aria-label')!;
    expect(label).not.toBe('SIGN-04812');
    expect(label).toContain('Sign');
    expect(label).toContain('SIGN-04812');
  });

  it('does not repeat the parts to a screen reader, since the label carries them', () => {
    const { container } = render(<SyEntityRef {...base} />);
    // Every visible fragment is aria-hidden; the composed label is the name.
    const visible = container.querySelectorAll('span:not([aria-hidden="true"])');
    for (const node of visible) {
      expect(node.getAttribute('aria-label') ?? node.getAttribute('role')).toBeTruthy();
    }
  });
});

describe('SyEntityRef — the state is announced', () => {
  it.each([
    ['deleted', 'deleted'],
    ['no-permission', 'no permission'],
    ['loading', 'loading'],
  ] as const)('announces %s', (state, spoken) => {
    render(<SyEntityRef {...propsFor(state)} />);
    expect(screen.getByRole('group').getAttribute('aria-label')).toContain(spoken);
  });

  it('says nothing extra when the reference simply resolved', () => {
    render(<SyEntityRef {...base} />);
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      'Sign, Peace be upon you, SIGN-04812',
    );
  });

  it('names the replacement when one is declared', () => {
    render(<SyEntityRef {...base} state="deprecated" replacement="SIGN-04999" />);
    expect(screen.getByRole('group').getAttribute('aria-label')).toContain(
      'deprecated, replaced by SIGN-04999',
    );
  });

  it('says so explicitly when there is no replacement', () => {
    render(<SyEntityRef {...base} state="deprecated" replacement={null} />);
    expect(screen.getByRole('group').getAttribute('aria-label')).toContain(
      'deprecated, no replacement declared',
    );
  });
});

describe('SyEntityRef — unresolvable refs are struck through, never blank', () => {
  it('strikes the name through and shows a deleted note', () => {
    const { container } = render(<SyEntityRef {...base} state="deleted" />);
    expect(container.innerHTML).toContain('line-through');
    expect(container.textContent).toContain('deleted');
    // Never a blank: the name is still rendered.
    expect(container.textContent).toContain('Peace be upon you');
  });

  it('renders a skeleton rather than nothing while loading', () => {
    const { container } = render(<SyEntityRef typeLabel="Sign" id="SIGN-04812" state="loading" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(container.textContent?.trim()).toBe('');
    expect(screen.getByRole('group').getAttribute('aria-label')).toContain('loading');
  });
});

describe('SyEntityRef — keyboard', () => {
  it('opens on Enter', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SyEntityRef {...base} onOpen={onOpen} />);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('peeks on Meta+Enter without opening', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onPeek = vi.fn();
    render(<SyEntityRef {...base} onOpen={onOpen} onPeek={onPeek} />);

    await user.tab();
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onPeek).toHaveBeenCalledTimes(1);
    // The current context is not lost, so the open path must not also fire.
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('peeks on Control+Enter too, for keyboards without a Meta key', async () => {
    const user = userEvent.setup();
    const onPeek = vi.fn();
    render(<SyEntityRef {...base} onOpen={() => {}} onPeek={onPeek} />);

    await user.tab();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onPeek).toHaveBeenCalledTimes(1);
  });

  it('is a native button, so it is never a tabindex trap', () => {
    render(<SyEntityRef {...base} onOpen={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.hasAttribute('tabindex')).toBe(false);
  });
});

describe('SyEntityRef — only openable states are interactive', () => {
  it.each(['resolved', 'deprecated'] as const)('%s is a button when it can be opened', (state) => {
    render(<SyEntityRef {...propsFor(state)} onOpen={() => {}} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it.each(['deleted', 'no-permission', 'loading'] as const)(
    '%s offers no affordance, because there is nowhere to go',
    (state) => {
      render(<SyEntityRef {...propsFor(state)} onOpen={() => {}} />);
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.getByRole('group')).toBeTruthy();
    },
  );

  it('is not interactive without an open handler', () => {
    render(<SyEntityRef {...base} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SyEntityRef — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
