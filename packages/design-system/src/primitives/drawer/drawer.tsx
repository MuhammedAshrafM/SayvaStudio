'use client';

import {
  useEffect,
  useId,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '../../lib/cn.js';
import { useOverlay } from '../../overlay/index.js';
import {
  DRAWER_STATES,
  DRAWER_VARIANTS,
  type SyDrawerState,
  type SyDrawerVariant,
} from './drawer.variants.js';

export type { SyDrawerState, SyDrawerVariant };
export { DRAWER_STATES, DRAWER_VARIANTS };

/**
 * "Dirty state prompts before discard", and the state itself "blocks close".
 *
 * Those are two obligations, and the type carries both: a dirty drawer must
 * supply somewhere for the prompt to come from. The prompt is not rendered
 * here — a blocking decision is a SyDialog, and which one is the caller's —
 * but the drawer refuses to close without asking for it.
 */
type Dirtiness =
  { dirty: true; onRequestDiscard: () => void } | { dirty?: false; onRequestDiscard?: never };

export type SyDrawerProps = {
  open: boolean;
  /** Called when the drawer may close: Esc, or the close control, when clean. */
  onClose: () => void;
  /** The drawer's name. "labelled by title" — so it is required. */
  title: string;
  variant?: SyDrawerVariant;
  /** The body. */
  children: ReactNode;
  /** Footer actions, per the anatomy "title · body · footer actions". */
  footer?: ReactNode;
  /** ⌘Enter submits. Absent when the drawer has nothing to submit. */
  onSubmit?: () => void;
  /** The element focus returns to. A07: "returns focus to its trigger". */
  triggerRef?: RefObject<HTMLElement | null>;
  className?: string;
} & Dirtiness;

const VARIANT_SURFACE: Record<SyDrawerVariant, string> = {
  /*
   * Logical inline-end, not `right`: §9.4 requires logical properties so RTL
   * is a document attribute rather than a stylesheet fork. The block axis is
   * not mirrored by direction, so the sheet's `bottom` is physical on purpose.
   */
  right: 'inset-y-0 end-0 h-full border-s',
  'bottom-sheet': 'inset-x-0 bottom-0 w-full border-t',
};

/**
 * Work beside context, never on top of it.
 *
 * Non-modal per decision D14: the drawer shares the overlay substrate but
 * does not contain Tab, because a surface whose whole purpose is to keep the
 * grid visible must keep it reachable too. `aria-modal="false"` states that
 * rather than leaving it to be inferred from the absence of containment.
 *
 * No scrim, and deliberately none: the design draws no scrim, backdrop or
 * dimming for any overlay, and inventing one here would be a visual decision
 * this package has no source for.
 *
 * Width is not set. §10.8's sizing table has no drawer row, so the surface is
 * content-sized and the application supplies any dimension through
 * `className` — which `cn` guarantees will win.
 */
export function SyDrawer(props: SyDrawerProps) {
  const {
    open,
    onClose,
    title,
    variant = 'right',
    children,
    footer,
    onSubmit,
    triggerRef,
    className,
    dirty = false,
  } = props;

  const titleId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);

  /**
   * Dirty blocks the close and asks instead. Esc still reaches the drawer —
   * the substrate hands it over — but what the drawer does with it changes.
   */
  const requestClose = () => {
    if (dirty) {
      props.onRequestDiscard?.();
      return;
    }
    onClose();
  };

  const { releaseFocus } = useOverlay({
    open,
    onRequestClose: requestClose,
    // D14: non-modal. Tab leaves, because the context beside it is the point.
    modal: false,
    surfaceRef,
    triggerRef,
  });

  /**
   * Focus entry: the surface itself, which is labelled by its title.
   *
   * Not the first control. The design is consistent about not stealing focus
   * onto an action — SyStateBlock's action takes focus "only when the user's
   * action caused the state", and a suggestion is "never focus-stealing" —
   * so a drawer opening announces itself and leaves the first move to the
   * reader.
   */
  useEffect(() => {
    if (open) surfaceRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // "⌘Enter submits" — ⌃Enter too, for keyboards without a Meta key.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && onSubmit) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    if (surfaceRef.current?.contains(next)) return;
    /*
     * Tab left the drawer, which is allowed and expected of a non-modal
     * surface. The drawer stays open — it is beside the work, not in front
     * of it — but the substrate must not later drag focus back to the
     * trigger as though the drawer had been dismissed.
     */
    releaseFocus();
  }

  return (
    /*
     * The rule guards against handlers on decorative elements. This is a
     * dialog surface the contract gives a keyboard shortcut — "⌘Enter
     * submits" — and which has to notice focus leaving it, because being
     * non-modal is the point. Both handlers are the contract, not decoration.
     */
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={surfaceRef}
      role="dialog"
      // D14: this surface does not contain focus, and says so.
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        'fixed z-10 flex min-w-max flex-col gap-300 border-border-default bg-surface-default p-400',
        // elev.2 is the design's token for "Drawers, sheets, side panels".
        'shadow-elev-2',
        VARIANT_SURFACE[variant],
        className,
      )}
    >
      <h2 id={titleId} className="text-heading-sm text-text-primary">
        {title}
      </h2>

      <div className="flex-1 overflow-auto">{children}</div>

      {footer ? <div className="flex items-center justify-end gap-200">{footer}</div> : null}
    </div>
  );
}
