import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@sayva/vitest-config/axe';

/**
 * Exercises the component test harness itself, on plain markup rather than
 * on a design-system component — there are none yet.
 *
 * Without this, `@sayva/vitest-config/react` ships unexercised: the jsdom
 * environment, the .tsx include glob, the RTL cleanup and the axe matcher
 * would all sit unproven until the first primitive lands in Slice 6, and a
 * broken harness would surface as a confusing component failure rather than
 * as what it is. It is deliberately about the four capabilities Slice 6
 * depends on, and nothing else.
 */
describe('component test harness', () => {
  it('renders into a DOM and finds elements by role and accessible name', () => {
    render(
      <button type="button" aria-label="Attach media">
        <span aria-hidden="true">+</span>
      </button>,
    );
    // Queried the way every component test will query — by role and name,
    // never by test id.
    expect(screen.getByRole('button', { name: 'Attach media' })).toBeTruthy();
  });

  it('drives the keyboard, so keyboard completeness is testable (§16)', async () => {
    const user = userEvent.setup();
    const pressed: string[] = [];
    render(
      <button type="button" onClick={() => pressed.push('click')}>
        Approve
      </button>,
    );

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Approve' }));
    await user.keyboard('{Enter}');
    expect(pressed).toEqual(['click']);
  });

  it('cleans the DOM between tests despite globals being off', () => {
    // If setup-react.js stopped calling cleanup, the button rendered by the
    // test above would still be here and this query would find two.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('runs axe and passes on accessible markup', async () => {
    const { container } = render(
      <label>
        Gloss
        <input name="gloss" />
      </label>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
