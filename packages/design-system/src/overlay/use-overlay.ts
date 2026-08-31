'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/**
 * The overlay substrate.
 *
 * The design contracts this explicitly, and contracts its shape: "Four
 * overlays share one behavioural substrate (focus trap, Esc, stacking, focus
 * restore) — **that substrate is a hook, not a component**" (§11, SyMenu's
 * accessibility cell). So it is a hook.
 *
 * What it provides to every overlay:
 *
 *   Esc          closes the topmost overlay only
 *   restoration  focus returns to the trigger on close (A07)
 *   stacking     reverse-order restoration, maximum depth two (A07, §15.9)
 *
 * Containment is deliberately *not* in that list. Decision D14 ruled that
 * containment is declared per surface rather than conferred by sharing the
 * substrate: the design states "focus trapped and restored" for SyDialog and
 * SyPalette in their own cells and for neither SyMenu nor SyDrawer. The
 * substrate offers it; each surface opts in. See design-open-decisions.json
 * D14, including the caveat that only the SyDialog half is compelled by an
 * explicit statement.
 */

/** Maximum overlay stack depth. A07: "maximum depth two". §15.9 repeats it. */
export const MAX_OVERLAY_DEPTH = 2;

type OverlayEntry = {
  close: () => void;
  modal: boolean;
  surface: () => HTMLElement | null;
  /** Cleared by `releaseFocus` when the user has deliberately moved focus on. */
  restoreFocus: boolean;
};

/**
 * Module-level, because "topmost" and "reverse order" are properties of the
 * set of open overlays, not of any one of them. Nothing outside this module
 * may reach it.
 */
const stack: OverlayEntry[] = [];

/** Test seam: the depth of the live stack. Exported for the substrate's own tests. */
export const overlayDepth = () => stack.length;

/**
 * Focusable candidates, for containment only. Deliberately narrow: elements
 * an author actually puts in an overlay, not every tabbable edge case.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(surface: HTMLElement): HTMLElement[] {
  return [...surface.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute('aria-hidden') && element.tabIndex !== -1,
  );
}

/** Wraps Tab at the surface's edges. Only ever called for a modal surface. */
function containTab(event: KeyboardEvent, surface: HTMLElement | null) {
  if (!surface) return;

  const focusable = focusableWithin(surface);
  if (focusable.length === 0) {
    // Nothing to move to, so the only correct thing is to go nowhere.
    event.preventDefault();
    return;
  }

  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = document.activeElement;
  const inside = active instanceof Node && surface.contains(active);

  if (event.shiftKey && (!inside || active === first)) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault();
    first.focus();
  }
}

export type UseOverlayOptions = {
  /** Whether the surface is on screen. The hook is inert while false. */
  open: boolean;
  /** Called when the substrate decides the surface should close — Esc, today. */
  onRequestClose: () => void;
  /**
   * Whether this surface contains Tab. D14: SyDialog true; SyMenu and
   * SyDrawer false. Not optional — a surface must say which it is.
   */
  modal: boolean;
  /** The surface itself. Containment and restoration both need its bounds. */
  surfaceRef: RefObject<HTMLElement | null>;
  /**
   * The element focus returns to. A07 says "returns focus to its **trigger**",
   * so a surface that knows its trigger names it here rather than leaving the
   * substrate to assume whatever happened to be focused when it opened was
   * the trigger — which it is not when the menu is opened programmatically,
   * or by a click that never moved focus.
   *
   * Falls back to the element focused at the moment of opening.
   */
  triggerRef?: RefObject<HTMLElement | null>;
};

export type UseOverlayResult = {
  /**
   * Give up this overlay's claim on focus for its current opening.
   *
   * A07 is unconditional — "every overlay returns focus to its trigger on
   * close" — and that is the default. But a non-modal surface can also be
   * left by tabbing out of it, and restoring the trigger there would undo the
   * very keystroke the user just pressed. A surface that closes because focus
   * moved on calls this first, so the difference is stated by the surface
   * rather than guessed from where focus happens to be.
   */
  releaseFocus: () => void;
};

export function useOverlay({
  open,
  onRequestClose,
  modal,
  surfaceRef,
  triggerRef,
}: UseOverlayOptions): UseOverlayResult {
  /**
   * Read through a ref so a new closure each render does not re-register the
   * overlay, which would reorder the stack under a re-rendering parent. The
   * ref is updated in an effect rather than during render: a render-phase
   * write is a ref access React does not guarantee the timing of.
   */
  const onRequestCloseRef = useRef(onRequestClose);
  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  });

  const entryRef = useRef<OverlayEntry | null>(null);

  const releaseFocus = useCallback(() => {
    if (entryRef.current) entryRef.current.restoreFocus = false;
  }, []);

  useEffect(() => {
    if (!open) return;

    if (stack.length >= MAX_OVERLAY_DEPTH) {
      throw new Error(
        `Overlay stack would reach depth ${stack.length + 1}; the design contracts a maximum ` +
          `of ${MAX_OVERLAY_DEPTH} (accessibility item A07, and §15.9 "Maximum overlay stack ` +
          `depth: 2"). Close an overlay before opening another.`,
      );
    }

    /**
     * Where focus came from, captured at the moment of opening — the only
     * reliable time, since once the surface takes focus the original element
     * is no longer active. Used only when the surface does not name its own
     * trigger.
     */
    const focusedAtOpen = document.activeElement as HTMLElement | null;

    const entry: OverlayEntry = {
      close: () => onRequestCloseRef.current(),
      modal,
      surface: () => surfaceRef.current,
      restoreFocus: true,
    };
    stack.push(entry);
    entryRef.current = entry;

    /**
     * Bubble phase on `document`, and both halves of that matter.
     *
     * `document` because it is above the React root, which is what makes a
     * React `stopPropagation` inside the overlay — SyField cancelling an
     * inline edit, say — actually shield this listener. Bubble because a
     * capture listener runs before React's synthetic phase and would see the
     * key regardless. Measured, not assumed: see the boundary test in
     * src/primitives/field/field.test.tsx.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      // "Esc closes topmost": only the entry on top of the stack responds.
      if (stack[stack.length - 1] !== entry) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        entry.close();
        return;
      }
      if (event.key === 'Tab' && entry.modal) {
        containTab(event, entry.surface());
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);

      const index = stack.indexOf(entry);
      if (index !== -1) stack.splice(index, 1);
      if (entryRef.current === entry) entryRef.current = null;

      // A07 by default; skipped only when the surface said so, and never onto
      // an element that has since left the document.
      if (!entry.restoreFocus) return;
      const trigger = triggerRef?.current ?? focusedAtOpen;
      if (!trigger || !trigger.isConnected) return;
      trigger.focus();
    };
  }, [open, modal, surfaceRef, triggerRef]);

  return { releaseFocus };
}
