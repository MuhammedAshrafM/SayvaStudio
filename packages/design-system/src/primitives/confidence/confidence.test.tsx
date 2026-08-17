import { describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import { SyConfidence, CONFIDENCE_STATES, CONFIDENCE_VARIANTS } from './confidence.js';
import * as stories from './confidence.stories.js';

const composed = composeStories(stories);

describe('SyConfidence — coverage', () => {
  it('declares the five contracted states', () => {
    expect([...CONFIDENCE_STATES]).toEqual(['high', 'medium', 'low', 'unavailable', 'stale']);
  });

  it('declares the three contracted variants', () => {
    expect([...CONFIDENCE_VARIANTS]).toEqual(['inline', 'column', 'detail']);
  });

  it.each(CONFIDENCE_STATES)('renders state %s', (state) => {
    render(<SyConfidence value={state === 'unavailable' ? null : 0.75} state={state} />);
    expect(screen.getByRole('group')).toBeTruthy();
  });

  it.each(CONFIDENCE_VARIANTS)('renders variant %s', (variant) => {
    render(<SyConfidence value={0.75} state="medium" variant={variant} />);
    expect(screen.getByRole('group')).toBeTruthy();
  });
});

describe('SyConfidence — AI RULE 3: confidence is a number', () => {
  it('puts the numeric value in the accessible name', () => {
    render(<SyConfidence value={0.86} state="high" />);
    expect(screen.getByRole('group', { name: /Confidence 0\.86/ })).toBeTruthy();
  });

  it('shows the number first and the band label second', () => {
    const { container } = render(<SyConfidence value={0.86} state="high" />);
    const text = container.textContent ?? '';
    expect(text.indexOf('0.86')).toBeLessThan(text.indexOf('high'));
  });

  it('never shows a bare band without its figure', () => {
    render(<SyConfidence value={0.61} state="low" />);
    expect(screen.getByText('0.61')).toBeTruthy();
    expect(screen.getByText('low')).toBeTruthy();
  });

  it('states the threshold that applies', () => {
    render(<SyConfidence value={0.86} state="high" threshold={0.8} />);
    expect(screen.getByText(/thr 0\.80/)).toBeTruthy();
    expect(screen.getByRole('group', { name: /threshold 0\.80/ })).toBeTruthy();
  });

  it('names the model that produced the figure', () => {
    render(<SyConfidence value={0.74} state="stale" model="recognition-arsl 2.3.0" />);
    expect(screen.getByRole('group', { name: /recognition-arsl 2\.3\.0/ })).toBeTruthy();
  });
});

describe('SyConfidence — unavailable is not zero', () => {
  it('says unavailable rather than rendering 0.00', () => {
    render(<SyConfidence value={null} state="unavailable" />);
    expect(screen.getByRole('group', { name: /Confidence unavailable/ })).toBeTruthy();
    expect(screen.queryByText('0.00')).toBeNull();
  });

  it('renders no bar when there is no figure to draw', () => {
    const { container } = render(
      <SyConfidence value={null} state="unavailable" variant="detail" />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

describe('SyConfidence — the bar is decoration', () => {
  it('hides the bar from assistive technology', () => {
    const { container } = render(<SyConfidence value={0.86} state="high" variant="detail" />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar).toBeTruthy();
    expect(bar?.className).toContain('bg-viz-track');
  });

  it('does not encode the band in the fill colour, because the band is a word', () => {
    const high = render(<SyConfidence value={0.9} state="high" variant="detail" />);
    const low = render(<SyConfidence value={0.2} state="low" variant="detail" />);
    const fill = (html: string) => /bg-viz-fill-[\w-]+/.exec(html)?.[0];
    expect(fill(high.container.innerHTML)).toBe(fill(low.container.innerHTML));
  });
});

describe('SyConfidence — not independently interactive', () => {
  it('exposes no interactive role', () => {
    render(<SyConfidence value={0.86} state="high" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('SyConfidence — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
