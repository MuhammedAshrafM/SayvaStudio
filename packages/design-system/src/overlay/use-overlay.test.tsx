import { useEffect, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_OVERLAY_DEPTH, overlayDepth, useOverlay } from './use-overlay.js';

/**
 * The substrate's own tests.
 *
 * SyMenu exercises the non-modal path in anger; containment has no consumer
 * until SyDialog (Slice 13), so it is proved here directly rather than left
 * unproved until then.
 */

/** A minimal overlay: a trigger, and a surface with two focusable things. */
function Surface({
  modal,
  label = 'Surface',
  onClosed,
  closeOnFocusOut = false,
}: {
  modal: boolean;
  label?: string;
  onClosed?: () => void;
  /**
   * Whether tabbing out closes the surface. Off by default so the stacking
   * tests can open a second overlay without the first dismissing itself the
   * moment the pointer lands on the other trigger.
   */
  closeOnFocusOut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  const { releaseFocus } = useOverlay({
    open,
    onRequestClose: () => {
      setOpen(false);
      onClosed?.();
    },
    modal,
    surfaceRef,
  });

  // A real overlay takes focus when it opens; the restoration contract only
  // means anything against a surface that did.
  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open {label}
      </button>
      {open ? (
        <div
          ref={surfaceRef}
          data-testid={`surface-${label}`}
          onBlur={(event) => {
            if (!closeOnFocusOut) return;
            const next = event.relatedTarget;
            if (next instanceof Node && surfaceRef.current?.contains(next)) return;
            // The user moved on rather than dismissing: say so, so the
            // substrate does not drag focus back to the trigger.
            releaseFocus();
            setOpen(false);
          }}
        >
          <button type="button" ref={firstRef}>
            {label} first
          </button>
          <button type="button">{label} last</button>
        </div>
      ) : null}
      <button type="button">After {label}</button>
    </div>
  );
}

describe('useOverlay — the stack', () => {
  it('starts empty and returns to empty', async () => {
    const user = userEvent.setup();
    expect(overlayDepth()).toBe(0);

    const { unmount } = render(<Surface modal={false} />);
    await user.click(screen.getByRole('button', { name: 'Open Surface' }));
    expect(overlayDepth()).toBe(1);

    unmount();
    expect(overlayDepth()).toBe(0);
  });

  it('refuses a third overlay, because the design caps the stack at two', async () => {
    const user = userEvent.setup();
    // React surfaces an error thrown in an effect by tearing the tree down;
    // the assertion is that opening a third is what does it.
    render(
      <>
        <Surface modal={false} label="A" />
        <Surface modal={false} label="B" />
        <Surface modal={false} label="C" />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    await user.click(screen.getByRole('button', { name: 'Open B' }));
    expect(overlayDepth()).toBe(MAX_OVERLAY_DEPTH);

    await expect(user.click(screen.getByRole('button', { name: 'Open C' }))).rejects.toThrow(
      /maximum of 2|depth 3/,
    );
  });
});

describe('useOverlay — Esc closes the topmost only', () => {
  it('closes the overlay on Escape', async () => {
    const user = userEvent.setup();
    render(<Surface modal={false} />);

    await user.click(screen.getByRole('button', { name: 'Open Surface' }));
    expect(screen.getByTestId('surface-Surface')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('surface-Surface')).toBeNull();
  });

  it('closes only the one on top, and then the one beneath', async () => {
    const user = userEvent.setup();
    const closedA = vi.fn();
    const closedB = vi.fn();
    render(
      <>
        <Surface modal={false} label="A" onClosed={closedA} />
        <Surface modal={false} label="B" onClosed={closedB} />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Open A' }));
    await user.click(screen.getByRole('button', { name: 'Open B' }));

    await user.keyboard('{Escape}');
    // B was opened last, so B is topmost and A is untouched.
    expect(closedB).toHaveBeenCalledTimes(1);
    expect(closedA).not.toHaveBeenCalled();
    expect(screen.queryByTestId('surface-B')).toBeNull();
    expect(screen.getByTestId('surface-A')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(closedA).toHaveBeenCalledTimes(1);
  });
});

describe('useOverlay — focus restoration (A07)', () => {
  it('returns focus to the trigger on close', async () => {
    const user = userEvent.setup();
    render(<Surface modal={false} />);

    const trigger = screen.getByRole('button', { name: 'Open Surface' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(document.activeElement).toBe(trigger);
  });

  it('restores stacked overlays in reverse order', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Surface modal={false} label="A" />
        <Surface modal={false} label="B" />
      </>,
    );

    const triggerA = screen.getByRole('button', { name: 'Open A' });
    const triggerB = screen.getByRole('button', { name: 'Open B' });

    await user.click(triggerA);
    await user.click(triggerB);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(triggerB);

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(triggerA);
  });

  it('leaves focus alone when the surface says the user moved on', async () => {
    const user = userEvent.setup();
    render(<Surface modal={false} label="Plain" closeOnFocusOut />);

    await user.click(screen.getByRole('button', { name: 'Open Plain' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Plain first' }));

    // Tabbing out of a non-modal surface closes it — and restoring the
    // trigger here would undo the very keystroke that closed it.
    await user.tab();
    await user.tab();

    expect(screen.queryByTestId('surface-Plain')).toBeNull();
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Open Plain' }));
  });
});

describe('useOverlay — containment is opt-in (D14)', () => {
  it('a modal surface wraps Tab at its last focusable', async () => {
    const user = userEvent.setup();
    render(<Surface modal label="Modal" />);

    await user.click(screen.getByRole('button', { name: 'Open Modal' }));
    const first = screen.getByRole('button', { name: 'Modal first' });
    const last = screen.getByRole('button', { name: 'Modal last' });

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it('a modal surface wraps Shift+Tab at its first focusable', async () => {
    const user = userEvent.setup();
    render(<Surface modal label="Modal" />);

    await user.click(screen.getByRole('button', { name: 'Open Modal' }));
    const first = screen.getByRole('button', { name: 'Modal first' });
    const last = screen.getByRole('button', { name: 'Modal last' });

    first.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('a non-modal surface lets Tab leave', async () => {
    const user = userEvent.setup();
    render(<Surface modal={false} label="Plain" />);

    await user.click(screen.getByRole('button', { name: 'Open Plain' }));
    const last = screen.getByRole('button', { name: 'Plain last' });

    last.focus();
    await user.tab();
    // Out of the surface entirely — the whole point of "beside context".
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After Plain' }));
  });
});
