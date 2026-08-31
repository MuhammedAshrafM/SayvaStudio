'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { cn } from '../../lib/cn.js';
import { useOverlay } from '../../overlay/index.js';
import { SyButton } from '../button/index.js';
import {
  DIALOG_STATES,
  DIALOG_VARIANTS,
  type SyDialogState,
  type SyDialogVariant,
} from './dialog.variants.js';

export type { SyDialogState, SyDialogVariant };
export { DIALOG_STATES, DIALOG_VARIANTS };

/**
 * A named action.
 *
 * `label` rather than a boolean or a preset, because the contract is that
 * "the confirm button names the action and its count" — "Delete 12 signs",
 * never "OK". The words are the caller's; the design supplies none.
 */
export type SyDialogAction = {
  label: string;
  onSelect: () => void;
};

export type SyDialogProps = {
  open: boolean;
  /** Esc cancels, and so does the cancel action. */
  onCancel: () => void;
  /** The decision being put. "labelled by title", so it is required. */
  title: string;
  variant?: SyDialogVariant;
  /**
   * The body — and for a destructive decision, the impact preview.
   *
   * Text, per the contract: "impact preview is text, not a warning icon
   * alone". Nothing here renders an icon in its place.
   */
  children: ReactNode;
  /** The action being confirmed. Its label names the action and its count. */
  confirm: SyDialogAction;
  /**
   * A way out that is not cancellation — the drawn specimen's "Deprecate
   * instead" beside "Delete sign".
   */
  alternative?: SyDialogAction;
  /** Defaults to the specimen's own word. */
  cancelLabel?: string;
  /** "Loading state in place": the decision stays on screen while it runs. */
  loading?: boolean;
  /** The decision failed. Shown in place rather than closing the dialog. */
  error?: string;
  /** The element focus returns to. A07: "returns focus to its trigger". */
  triggerRef?: RefObject<HTMLElement | null>;
  className?: string;
};

/**
 * Blocking decisions only.
 *
 * Modal per decision D14, which is the half of that ruling the design states
 * outright: "Esc cancels; focus trapped and restored". Containment comes from
 * the shared overlay substrate rather than from anything built here.
 *
 * `alertdialog` when destructive, per the contract. No scrim: the design
 * draws none for any overlay, and inventing one would be a visual decision
 * this package has no source for.
 */
export function SyDialog({
  open,
  onCancel,
  title,
  variant = 'default',
  children,
  confirm,
  alternative,
  cancelLabel = 'Cancel',
  loading = false,
  error,
  triggerRef,
  className,
}: SyDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);

  useOverlay({
    open,
    onRequestClose: onCancel,
    // D14: SyDialog contains Tab. A blocking decision is the one surface the
    // design says traps.
    modal: true,
    surfaceRef,
    triggerRef,
  });

  /**
   * Focus entry: the surface, not an action.
   *
   * Deliberate for a destructive decision — arming "Delete" under the return
   * key is how a confirmation becomes an accident — and consistent with the
   * design's refusal to steal focus elsewhere.
   */
  useEffect(() => {
    if (open) surfaceRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const destructive = variant === 'destructive';

  return (
    <div
      ref={surfaceRef}
      // "alertdialog for destructive" — and a plain dialog otherwise.
      role={destructive ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      aria-busy={loading || undefined}
      tabIndex={-1}
      className={cn(
        /*
         * Centred by auto margins rather than by an offset, and sized by its
         * content: §10.8's sizing table gives no dialog width or position, so
         * neither is invented. An application supplies either through
         * `className`, which `cn` guarantees will win.
         */
        'fixed inset-0 z-10 m-auto flex h-fit min-w-max flex-col gap-300',
        // radius.md is the design's radius for "Palette, elevated cards" —
        // the palette being the other surface at this elevation.
        'rounded-md border border-border-default bg-surface-default p-400',
        // elev.3 is the design's token for "Modal dialogs, command palette".
        'shadow-elev-3',
        className,
      )}
    >
      <h2 id={titleId} className="text-heading-sm text-text-primary">
        {title}
      </h2>

      {/* The impact preview. Text, and only text. */}
      <div id={bodyId} className="text-body text-text-secondary">
        {children}
      </div>

      {error ? (
        // In place: the decision stays on screen so it can be retried.
        <p role="alert" className="text-caption text-status-danger-fg">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-200">
        <SyButton variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </SyButton>

        {alternative ? (
          <SyButton variant="secondary" onClick={alternative.onSelect}>
            {alternative.label}
          </SyButton>
        ) : null}

        {/*
         * Loading keeps the label, swaps the icon for a spinner and sets
         * aria-busy without disabling — SyButton's own contract — so focus
         * survives the wait. "A reviewer approving forty signs should never
         * wait on a modal."
         */}
        <SyButton
          variant={destructive ? 'danger' : 'primary'}
          loading={loading}
          onClick={confirm.onSelect}
        >
          {confirm.label}
        </SyButton>
      </div>
    </div>
  );
}
