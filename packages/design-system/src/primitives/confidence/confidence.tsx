import { cn } from '../../lib/cn.js';

export const CONFIDENCE_STATES = ['high', 'medium', 'low', 'unavailable', 'stale'] as const;
export type SyConfidenceState = (typeof CONFIDENCE_STATES)[number];

export const CONFIDENCE_VARIANTS = ['inline', 'column', 'detail'] as const;
export type SyConfidenceVariant = (typeof CONFIDENCE_VARIANTS)[number];

export type SyConfidenceProps = {
  /**
   * The figure, 0–1. Null only when the state is `unavailable`.
   *
   * AI RULE 3: "Confidence is a number. Shown numerically with its threshold
   * and its reasons. Never a bare colour, never a vague high."
   */
  value: number | null;
  /** high / medium / low is the band; the design supplies no thresholds to derive it from. */
  state: SyConfidenceState;
  /** The threshold that applies, e.g. 0.8 — drawn as "thr 0.80". */
  threshold?: number;
  variant?: SyConfidenceVariant;
  /** Which model produced it, e.g. "translate-arsl 1.2.0". */
  model?: string;
  className?: string;
};

const VARIANT_BOX: Record<SyConfidenceVariant, string> = {
  inline: 'inline-flex flex-row items-baseline gap-100',
  column: 'inline-flex flex-col items-start gap-050',
  detail: 'flex flex-col items-start gap-100',
};

const VARIANT_FIGURE: Record<SyConfidenceVariant, string> = {
  inline: 'text-body',
  column: 'text-body',
  detail: 'text-heading-sm',
};

const format = (value: number) => value.toFixed(2);

/**
 * A confidence figure, its band label and the threshold that applies.
 *
 * Number first, band second — §9.4. The bar is decoration and carries no
 * meaning of its own, so it takes a single fill rather than encoding the
 * band in colour: the band is a word.
 */
export function SyConfidence({
  value,
  state,
  threshold,
  variant = 'inline',
  model,
  className,
}: SyConfidenceProps) {
  const unavailable = state === 'unavailable' || value === null;

  // The numeric value is always in the accessible name.
  const spokenValue = unavailable ? 'unavailable' : format(value);
  const accessibleName = [
    `Confidence ${spokenValue}`,
    unavailable ? null : state,
    threshold === undefined ? null : `threshold ${format(threshold)}`,
    model ?? null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <span role="group" aria-label={accessibleName} className={cn(VARIANT_BOX[variant], className)}>
      <span className={cn('tabular-nums text-text-primary', VARIANT_FIGURE[variant])}>
        {spokenValue}
      </span>

      <span className="text-caption text-text-secondary">
        {unavailable ? 'unavailable' : state}
      </span>

      {threshold === undefined ? null : (
        <span className="text-caption tabular-nums text-text-tertiary">
          thr {format(threshold)}
        </span>
      )}

      {model ? <span className="text-mono text-text-tertiary">{model}</span> : null}

      {unavailable || variant === 'inline' ? null : (
        <span aria-hidden="true" className="block h-100 w-full rounded-full bg-viz-track">
          <span
            className="block h-full rounded-full bg-viz-fill-default"
            style={{ inlineSize: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
          />
        </span>
      )}
    </span>
  );
}
