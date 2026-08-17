import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { SyStateBlock } from './state-block.js';
import { STATE_BLOCK_SIZES, STATE_BLOCK_STATES } from './state-block.variants.js';
import * as stories from './state-block.stories.js';

const composed = composeStories(stories);

/** Minimal, valid props for each of the six states. */
function propsFor(state: (typeof STATE_BLOCK_STATES)[number]) {
  if (state === 'loading') return { state, label: 'Loading signs' } as const;
  if (state === 'error') {
    return {
      state,
      heading: 'Could not load signs',
      traceId: 'a41f-9c02-77be',
      action: { label: 'Retry', onAction: () => {} },
    } as const;
  }
  return { state, heading: `Heading for ${state}` } as const;
}

describe('SyStateBlock — covers every state and size', () => {
  it('declares exactly the six contracted states', () => {
    expect([...STATE_BLOCK_STATES]).toEqual([
      'first-run',
      'filtered-empty',
      'loading',
      'error',
      'no-permission',
      'offline',
    ]);
  });

  it('declares exactly the three contracted sizes', () => {
    expect([...STATE_BLOCK_SIZES]).toEqual(['pane', 'panel', 'inline']);
  });

  it.each(STATE_BLOCK_STATES)('renders %s as a live region', (state) => {
    render(<SyStateBlock {...propsFor(state)} />);
    const expectedRole = state === 'error' ? 'alert' : 'status';
    expect(screen.getByRole(expectedRole)).toBeTruthy();
  });

  it.each(STATE_BLOCK_SIZES)('renders at size %s', (size) => {
    render(<SyStateBlock {...propsFor('first-run')} size={size} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});

describe('SyStateBlock — announcement semantics', () => {
  it('announces an error assertively', () => {
    render(<SyStateBlock {...propsFor('error')} />);
    // role=alert carries an implicit assertive live region.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['first-run', 'filtered-empty'] as const)('announces %s politely', (state) => {
    render(<SyStateBlock {...propsFor(state)} />);
    // role=status carries an implicit polite live region.
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['loading', 'no-permission', 'offline'] as const)(
    'announces %s politely, since only errors interrupt',
    (state) => {
      render(<SyStateBlock {...propsFor(state)} />);
      expect(screen.getByRole('status')).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
});

describe('SyStateBlock — the heading is real', () => {
  it('renders a heading element, not styled text', () => {
    render(<SyStateBlock {...propsFor('first-run')} />);
    expect(screen.getByRole('heading', { name: 'Heading for first-run' })).toBeTruthy();
  });

  it('names the region from its heading', () => {
    render(<SyStateBlock state="offline" heading="You are offline" />);
    expect(screen.getByRole('status', { name: 'You are offline' })).toBeTruthy();
  });

  it('lets the caller set the level for where the block sits', () => {
    render(<SyStateBlock {...propsFor('first-run')} headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
  });

  it('names a loading region from its label, since a skeleton has no heading', () => {
    render(<SyStateBlock state="loading" label="Loading signs" />);
    expect(screen.getByRole('status', { name: 'Loading signs' })).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('SyStateBlock — no decorative illustration', () => {
  it.each(STATE_BLOCK_STATES)('renders no image or graphic for %s', (state) => {
    const { container } = render(<SyStateBlock {...propsFor(state)} />);
    expect(container.querySelectorAll('img, svg, picture, figure')).toHaveLength(0);
  });
});

describe('SyStateBlock — nothing is communicated by colour alone', () => {
  it('states the failure in text, not only in tone', () => {
    render(<SyStateBlock {...propsFor('error')} />);
    expect(screen.getByRole('heading', { name: 'Could not load signs' })).toBeTruthy();
    // AC14: an error without a trace ID fails. It is text on screen.
    expect(screen.getByText(/a41f-9c02-77be/)).toBeTruthy();
  });

  it.each(STATE_BLOCK_STATES)('gives %s readable text content, not just a class', (state) => {
    const { container } = render(<SyStateBlock {...propsFor(state)} />);
    const accessible =
      container.textContent?.trim() ?? screen.getByRole('status').getAttribute('aria-label') ?? '';
    const named = accessible.length > 0 || Boolean(screen.queryByRole('status', { name: /\S/ }));
    expect(named).toBe(true);
  });
});

describe('SyStateBlock — the next action', () => {
  it('is reachable by keyboard and activates', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <SyStateBlock
        state="filtered-empty"
        heading="No signs match these filters"
        action={{ label: 'Clear filters', onAction }}
      />,
    );

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear filters' }));
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not take focus when the state was already there on arrival', () => {
    render(
      <SyStateBlock
        state="filtered-empty"
        heading="No signs match these filters"
        action={{ label: 'Clear filters', onAction: () => {} }}
      />,
    );
    expect(document.activeElement).toBe(document.body);
  });

  it('takes focus when the user caused the state', () => {
    render(
      <SyStateBlock
        state="filtered-empty"
        heading="No signs match these filters"
        userInitiated
        action={{ label: 'Clear filters', onAction: () => {} }}
      />,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear filters' }));
  });

  it('takes focus when a user action turns an existing block into a caused one', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [caused, setCaused] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setCaused(true)}>
            Apply filter
          </button>
          <SyStateBlock
            state="filtered-empty"
            heading="No signs match these filters"
            userInitiated={caused}
            action={{ label: 'Clear filters', onAction: () => {} }}
          />
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Apply filter' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear filters' }));
  });

  it('renders no action when the state has no next step', () => {
    render(<SyStateBlock state="no-permission" heading="You cannot view this vocabulary" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SyStateBlock — every story passes axe', () => {
  const entries = Object.entries(composed);

  it('has a story for every state and every size', () => {
    const argsText = JSON.stringify(
      Object.values(stories).map((story) =>
        typeof story === 'object' && story !== null && 'args' in story ? story.args : null,
      ),
    );
    for (const state of STATE_BLOCK_STATES) {
      expect(argsText, `no story covers state ${state}`).toContain(`"${state}"`);
    }
    for (const size of STATE_BLOCK_SIZES) {
      expect(argsText, `no story covers size ${size}`).toContain(`"${size}"`);
    }
  });

  it.each(entries.map(([name]) => name))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
