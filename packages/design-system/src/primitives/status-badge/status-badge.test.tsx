import { describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import { SyStatusBadge, STATUS_BADGE_TONES, STATUS_BADGE_VARIANTS } from './status-badge.js';
import * as stories from './status-badge.stories.js';

const composed = composeStories(stories);

describe('SyStatusBadge — coverage', () => {
  it('declares the five status token families', () => {
    expect([...STATUS_BADGE_TONES]).toEqual(['neutral', 'success', 'warning', 'danger', 'info']);
  });

  it('declares the two placements the contract names', () => {
    expect([...STATUS_BADGE_VARIANTS]).toEqual(['inline', 'detail']);
  });

  it.each(STATUS_BADGE_TONES)('renders tone %s', (tone) => {
    render(<SyStatusBadge tone={tone} label="Approved" />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it.each(STATUS_BADGE_VARIANTS)('renders variant %s', (variant) => {
    render(<SyStatusBadge tone="success" label="Approved" variant={variant} />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });
});

describe('SyStatusBadge — D3: no domain lifecycle in the design system', () => {
  it('takes a caller-supplied label rather than a lifecycle union', () => {
    // Any string works, because the component knows nothing about the six
    // editorial states. apps/studio owns that mapping.
    render(<SyStatusBadge tone="info" label="Some entirely unrelated label" />);
    expect(screen.getByText('Some entirely unrelated label')).toBeTruthy();
  });

  it('exposes tones named after tokens, not after domain states', () => {
    for (const tone of STATUS_BADGE_TONES) {
      expect(['draft', 'in review', 'approved', 'published', 'deprecated']).not.toContain(tone);
    }
  });
});

describe('SyStatusBadge — never colour alone (P5, §9.4)', () => {
  it.each(STATUS_BADGE_TONES)('states %s in words, not only in tone', (tone) => {
    render(<SyStatusBadge tone={tone} label={`Label for ${tone}`} />);
    expect(screen.getByText(`Label for ${tone}`)).toBeTruthy();
  });

  it('hides the glyph from assistive technology, so the label is the name', () => {
    const { container } = render(
      <SyStatusBadge
        tone="success"
        label="Published"
        glyph={<svg data-testid="glyph" viewBox="0 0 8 8" />}
      />,
    );
    const glyphWrapper = container.querySelector('[aria-hidden="true"]');
    expect(glyphWrapper).toBeTruthy();
    expect(glyphWrapper?.querySelector('svg')).toBeTruthy();
  });

  it('reads the modifier as part of the badge text', () => {
    render(<SyStatusBadge tone="info" label="In review" modifier="stale" />);
    expect(screen.getByText('In review')).toBeTruthy();
    expect(screen.getByText(/stale/)).toBeTruthy();
  });
});

describe('SyStatusBadge — AC15: complete triplets', () => {
  it.each(STATUS_BADGE_TONES)('%s uses its own ground, edge and figure', (tone) => {
    const { container } = render(<SyStatusBadge tone={tone} label="Approved" />);
    const className = container.firstElementChild!.className;
    // All three come from the same status family; none is hand-made.
    expect(className).toContain(`bg-status-${tone}-bg`);
    expect(className).toContain(`text-status-${tone}-fg`);
    expect(className).toContain(`border-status-${tone}-border`);
  });

  it('composes no ground of its own for a status it did not define', () => {
    const { container } = render(<SyStatusBadge tone="danger" label="Blocked" />);
    const className = container.firstElementChild!.className;
    const grounds = className.split(/\s+/).filter((token) => token.startsWith('bg-'));
    expect(grounds).toEqual(['bg-status-danger-bg']);
  });
});

describe('SyStatusBadge — not interactive by default', () => {
  it('renders no button role', () => {
    render(<SyStatusBadge tone="success" label="Approved" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SyStatusBadge — every story passes axe', () => {
  it.each(Object.keys(composed))('%s', async (name) => {
    const Story = composed[name as keyof typeof composed];
    const { container } = render(<Story />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
