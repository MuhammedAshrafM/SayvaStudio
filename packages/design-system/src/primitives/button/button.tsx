'use client';

import { useId, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn.js';
import { buttonVariants } from './button.variants.js';

/** The four tone variants. `icon-only` is handled separately — it needs a label. */
export type SyButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

export type SyButtonSize = 'sm' | 'md' | 'lg';

type ButtonBase = Omit<ComponentPropsWithRef<'button'>, 'disabled' | 'children' | 'title'> & {
  size?: SyButtonSize;
  /**
   * Keeps the label, swaps the icon for a spinner, sets `aria-busy`, and —
   * deliberately — does not disable the button, because a disabled element
   * loses focus. The contract requires focus to survive (§Primitives:
   * "Label persists, spinner replaces the icon, aria-busy set, focus kept").
   * Activation is suppressed while busy instead.
   */
  loading?: boolean;
};

/**
 * A disabled button must carry a reason. The contract is explicit — disabled
 * "always paired with a stated reason" — so the type makes omitting it a
 * compile error rather than a review note.
 */
type DisabledProps =
  { disabled: true; disabledReason: string } | { disabled?: false; disabledReason?: never };

/**
 * `icon-only` requires `label` at the type level. Runtime validation would
 * only catch it once the story ran; this catches it while it is typed.
 */
type ContentProps =
  | { variant?: SyButtonTone; children: ReactNode; icon?: ReactNode; label?: never }
  | { variant: 'icon-only'; icon: ReactNode; label: string; children?: never };

export type SyButtonProps = ButtonBase & DisabledProps & ContentProps;

/**
 * The busy indicator. Component-local markup rather than a glyph from an
 * icon set, because which icon set the product uses is open decision D6 and
 * this must not pre-empt it.
 *
 * `animate-spin` under `prefers-reduced-motion` is already neutralised by
 * base.css, which collapses animation-duration to 0 and iteration-count to
 * 1 — §9.2's "Nothing loops".
 */
function Spinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-[var(--icon-dense)] animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="6" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
    </svg>
  );
}

export function SyButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  label,
  children,
  className,
  disabled,
  disabledReason,
  onClick,
  type = 'button',
  ...rest
}: SyButtonProps) {
  const iconOnly = variant === 'icon-only';
  const reasonId = useId();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      // Busy, not disabled: the button keeps focus and keeps its label, so
      // activation has to be suppressed here instead.
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  const button = (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? label : undefined}
      aria-describedby={disabled ? reasonId : undefined}
      className={cn(buttonVariants({ variant, size, iconOnly }), className)}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );

  if (!disabled) return button;

  return (
    <>
      {button}
      {/*
        Outside the button on purpose. A button's accessible name is its
        contents, so a reason rendered inside would be appended to the name
        — "Approve Approval is blocked…" — instead of describing it.
        sr-only is layout-neutral, so this changes nothing visually; the
        visible statement is the screen's job, as the Sign editor's blocked
        Approve banner shows.
      */}
      <span id={reasonId} className="sr-only">
        {disabledReason}
      </span>
    </>
  );
}
