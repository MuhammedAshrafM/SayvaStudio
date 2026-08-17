import type { ReactNode } from 'react';
import { cn } from '../../lib/cn.js';

/**
 * The five status token families. These are design tokens, not domain
 * states.
 *
 * The canonical contract lists this component's states as the six editorial
 * lifecycle values — Draft, In Review, Changes Requested, Approved,
 * Published, Deprecated. Decision D3 keeps those out of the design system:
 * @sayva/design-system depends on nothing in the workspace (ADR-002 DR-02),
 * and re-declaring a domain union here would be that coupling in all but
 * name. apps/studio owns the lifecycle → (glyph, tone, label) mapping.
 */
export const STATUS_BADGE_TONES = ['neutral', 'success', 'warning', 'danger', 'info'] as const;
export type SyStatusBadgeTone = (typeof STATUS_BADGE_TONES)[number];

/** inline sits in a grid row; detail sits in an entity header. */
export const STATUS_BADGE_VARIANTS = ['inline', 'detail'] as const;
export type SyStatusBadgeVariant = (typeof STATUS_BADGE_VARIANTS)[number];

export type SyStatusBadgeProps = {
  /** The accessible name. Never conveyed by colour alone (§9.4, P5). */
  label: string;
  tone: SyStatusBadgeTone;
  variant?: SyStatusBadgeVariant;
  /**
   * Decorative, and aria-hidden. The caller supplies it: which icon set the
   * product uses is open decision D6, and the label already carries meaning.
   */
  glyph?: ReactNode;
  /** e.g. "stale" or "blocked" — read as part of the accessible name. */
  modifier?: string;
  className?: string;
};

/**
 * A complete triplet per tone (AC15): the ground, the edge and the figure all
 * come from the same status family, so no component composes a status ground
 * of its own.
 */
const TONE_CLASSES: Record<SyStatusBadgeTone, string> = {
  neutral: 'bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border',
  success: 'bg-status-success-bg text-status-success-fg border-status-success-border',
  warning: 'bg-status-warning-bg text-status-warning-fg border-status-warning-border',
  danger: 'bg-status-danger-bg text-status-danger-fg border-status-danger-border',
  info: 'bg-status-info-bg text-status-info-fg border-status-info-border',
};

const VARIANT_CLASSES: Record<SyStatusBadgeVariant, string> = {
  inline: 'gap-100 px-200 py-050 text-caption rounded-xs',
  detail: 'gap-200 px-300 py-100 text-body rounded-sm',
};

/** Lifecycle state of any entity, told by label and glyph rather than colour. */
export function SyStatusBadge({
  label,
  tone,
  variant = 'inline',
  glyph,
  modifier,
  className,
}: SyStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border',
        TONE_CLASSES[tone],
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {glyph ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {glyph}
        </span>
      ) : null}
      <span>{label}</span>
      {modifier ? <span className="text-caption">· {modifier}</span> : null}
    </span>
  );
}
