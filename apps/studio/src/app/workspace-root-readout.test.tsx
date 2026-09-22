import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from '@sayva/vitest-config/axe';
import { WorkspaceRootReadout } from './workspace-root-readout.js';

/**
 * PP-03's proof that the app's testing topology works, written against real
 * app code rather than a component invented to exercise the framework.
 *
 * `WorkspaceRootReadout` is PP-02's Server→Client serialization proof, and
 * until PP-03 it had no unit coverage at all — it was verified by reading the
 * running page. These assertions are about what it actually promises: a root
 * arrives as a prop and is rendered as plain text.
 *
 * Between them they demonstrate the three things the topology has to do —
 * Vitest executes here, jsdom and Testing Library can render and query a
 * React component, and `toHaveNoViolations` runs a real accessibility
 * assertion — without inventing a Project Picker test to do it.
 */

const ROOT = 'C:/authoring/sayva-projects';

describe('WorkspaceRootReadout', () => {
  it('renders the root it is given', () => {
    render(<WorkspaceRootReadout root={ROOT} />);

    expect(screen.getByTestId('workspace-root').textContent).toBe(ROOT);
  });

  it('renders it as text, not as a control', () => {
    // ADR-003 SR-09: the root is displayed only — "the picker cannot change
    // it". A textbox or a link here would be the first step towards a root
    // switcher, which SR-09 and the canonical design both rule out.
    render(<WorkspaceRootReadout root={ROOT} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the path verbatim, without shortening it', () => {
    // An author checking where Studio looked needs the whole path. A
    // truncated or prettified one answers a different question.
    const awkward = 'D:/a path/with spaces/and-a-very-long-tail/projects';
    render(<WorkspaceRootReadout root={awkward} />);

    expect(screen.getByTestId('workspace-root').textContent).toBe(awkward);
  });

  it('passes an accessibility check', async () => {
    // DoD §5: "An automated accessibility check passes with no new
    // violations." This is that check, at the grain design-system already
    // runs it, rather than only at e2e.
    const { container } = render(<WorkspaceRootReadout root={ROOT} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
