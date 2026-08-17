import { describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render, screen } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import * as stories from './preview-harness.stories';

/**
 * The pattern every primitive follows from Slice 6 onward: the accessibility
 * gate runs against the *stories*, not against a separate fixture, so the
 * thing that is checked is the thing a reviewer looks at.
 *
 * It rides `turbo run test`, which is why Phase 1 needs no new CI step — the
 * existing Test step covers the preview surface.
 */
const { Accessible } = composeStories(stories);

describe('composed stories', () => {
  it('renders a story outside Storybook', () => {
    render(<Accessible />);
    expect(screen.getByRole('textbox', { name: 'Gloss' })).toBeTruthy();
  });

  it('applies args declared on the story', () => {
    render(<Accessible label="Display name" />);
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeTruthy();
  });

  it('passes axe', async () => {
    const { container } = render(<Accessible />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
