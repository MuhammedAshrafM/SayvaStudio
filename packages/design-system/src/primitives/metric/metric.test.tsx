import { describe, expect, it, vi } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';
import { SyMetric, METRIC_SIZES, METRIC_STATES } from './metric.js';
import * as stories from './metric.stories.js';

const composed = composeStories(stories);

const base = {
  label: 'Dataset coverage',
  figure: '78%',
  denominator: 'of 62 categories',
} as const;

describe('SyMetric — coverage', () => {
  it('declares the six contracted states', () => {
    expect([...METRIC_STATES]).toEqual(['ok', 'warning', 'error', 'no-data', 'loading', 'stale']);
  });

  it('declares the three contracted sizes', () => {
    expect([...METRIC_SIZES]).toEqual(['lg', 'md', 'sm']);
  });

  it.each(METRIC_STATES)('renders state %s', (state) => {
    render(<SyMetric {...base} state={state} />);
    expect(screen.getByRole('group', { name: /Dataset coverage/ })).toBeTruthy();
  });

  it.each(METRIC_SIZES)('renders size %s', (size) => {
    render(<SyMetric {...base} size={size} />);
    expect(screen.getByRole('group', { name: /Dataset coverage/ })).toBeTruthy();
  });
});

describe('SyMetric — the denominator is part of the accessible name', () => {
  it('names the figure with its denominator, so it is a fact not a rumour', () => {
    render(<SyMetric {...base} />);
    expect(screen.getByRole('group', { name: 'Dataset coverage, of 62 categories' })).toBeTruthy();
  });

  it('keeps the denominator in the name while loading', () => {
    render(<SyMetric {...base} state="loading" />);
    expect(
      screen.getByRole('group', { name: 'Dataset coverage, loading, of 62 categories' }),
    ).toBeTruthy();
  });

  it('renders the denominator as visible text too', () => {
    render(<SyMetric {...base} />);
    expect(screen.getByText('of 62 categories')).toBeTruthy();
  });
});

describe('SyMetric — loading keeps the title and denominator', () => {
  it('withholds only the figure', () => {
    render(<SyMetric {...base} state="loading" />);
    expect(screen.getByText('Dataset coverage')).toBeTruthy();
    expect(screen.getByText('of 62 categories')).toBeTruthy();
    expect(screen.queryByText('78%')).toBeNull();
  });
});

describe('SyMetric — AC16: a bar always states its number as text', () => {
  it('renders the figure beside the bar', () => {
    render(<SyMetric {...base} figure="184 MB" bar={{ fraction: 0.74 }} />);
    expect(screen.getByText('184 MB')).toBeTruthy();
  });

  it('hides the bar from assistive technology, since the figure carries it', () => {
    const { container } = render(<SyMetric {...base} bar={{ fraction: 0.74 }} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar).toBeTruthy();
    expect(bar?.className).toContain('bg-viz-track');
  });

  it.each(['default', 'warning', 'danger'] as const)('uses the %s viz ramp step', (level) => {
    const { container } = render(<SyMetric {...base} bar={{ fraction: 0.5, level }} />);
    expect(container.innerHTML).toContain(`bg-viz-fill-${level}`);
  });

  it('cannot render a bar without a figure, because figure is required', () => {
    // Type-level guarantee; asserted here as behaviour: the figure is always
    // rendered whenever a bar is.
    const { container } = render(<SyMetric {...base} bar={{ fraction: 0.4 }} />);
    expect(container.textContent).toContain('78%');
  });
});

describe('SyMetric — every metric is a door (P10)', () => {
  it('is not focusable when it links nowhere', () => {
    render(<SyMetric {...base} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('becomes a button when it opens its underlying list', () => {
    render(<SyMetric {...base} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'Dataset coverage, of 62 categories' })).toBeTruthy();
  });

  it('opens on Enter from the keyboard', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SyMetric {...base} onOpen={onOpen} />);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('SyMetric — figures are tabular', () => {
  it('applies tabular numerals to the figure', () => {
    const { container } = render(<SyMetric {...base} />);
    expect(container.innerHTML).toContain('tabular-nums');
  });
});

describe('SyMetric — trend states sign and unit as text', () => {
  it('renders the trend verbatim rather than as a glyph', () => {
    render(<SyMetric {...base} trend="+1.6 pts since last release" />);
    expect(screen.getByText('+1.6 pts since last release')).toBeTruthy();
  });
});

describe('SyMetric — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
