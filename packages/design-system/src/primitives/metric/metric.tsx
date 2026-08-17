'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/cn.js';

export const METRIC_STATES = ['ok', 'warning', 'error', 'no-data', 'loading', 'stale'] as const;
export type SyMetricState = (typeof METRIC_STATES)[number];

export const METRIC_SIZES = ['lg', 'md', 'sm'] as const;
export type SyMetricSize = (typeof METRIC_SIZES)[number];

/**
 * The decorative bar. AC16 — "Every element using a viz.* fill states its
 * value as text beside it" — is satisfied by construction rather than by a
 * lint rule: a bar can only exist alongside the figure, which is required.
 */
export type SyMetricBar = {
  /** 0–1. Drives the fill width only; the number a reader acts on is `figure`. */
  fraction: number;
  /** Which viz ramp step: at or above target, below target, or below floor. */
  level?: 'default' | 'warning' | 'danger';
};

export type SyMetricProps = {
  /** What is being measured. */
  label: string;
  /**
   * The figure, as text — "78%", "4,812", "+1.6 pts". A string because the
   * design requires sign and unit to be written out, not inferred.
   */
  figure: ReactNode;
  /**
   * Required, and part of the accessible name. §13.7: "78% alone is a
   * rumour; 78% of 62 categories is a fact."
   */
  denominator: string;
  /** Stated in words with sign and unit, never as a bare arrow. */
  trend?: string;
  target?: string;
  state?: SyMetricState;
  size?: SyMetricSize;
  bar?: SyMetricBar;
  /** Present when the metric links to the list behind it (P10: every metric is a door). */
  onOpen?: () => void;
  className?: string;
};

const SIZE_FIGURE: Record<SyMetricSize, string> = {
  lg: 'text-display',
  md: 'text-heading-lg',
  sm: 'text-heading-sm',
};

const SIZE_BOX: Record<SyMetricSize, string> = {
  lg: 'gap-200 p-400',
  md: 'gap-100 p-300',
  sm: 'gap-100 p-200',
};

const STATE_FIGURE: Record<SyMetricState, string> = {
  ok: 'text-text-primary',
  warning: 'text-status-warning-fg',
  error: 'text-status-danger-fg',
  'no-data': 'text-text-tertiary',
  loading: 'text-text-tertiary',
  stale: 'text-text-tertiary',
};

const BAR_FILL = {
  default: 'bg-viz-fill-default',
  warning: 'bg-viz-fill-warning',
  danger: 'bg-viz-fill-danger',
} as const;

/** A figure with its denominator, trend and target. */
export function SyMetric({
  label,
  figure,
  denominator,
  trend,
  target,
  state = 'ok',
  size = 'md',
  bar,
  onOpen,
  className,
}: SyMetricProps) {
  const body = (
    <>
      <span className="text-label text-text-secondary">{label}</span>

      {/* Loading keeps the title and the denominator visible; only the
          figure is withheld. */}
      <span className={cn('tabular-nums', SIZE_FIGURE[size], STATE_FIGURE[state])}>
        {state === 'loading' ? (
          <span
            aria-hidden="true"
            className="inline-block h-400 w-800 rounded-sm bg-surface-subtle"
          />
        ) : (
          figure
        )}
      </span>

      <span className="text-caption text-text-secondary">{denominator}</span>

      {trend ? (
        <span className="text-caption tabular-nums text-text-secondary">{trend}</span>
      ) : null}
      {target ? <span className="text-caption text-text-tertiary">{target}</span> : null}

      {bar ? (
        // Decoration. The figure above is what a reader acts on, which is
        // the whole of AC16.
        <span aria-hidden="true" className="block h-100 w-full rounded-full bg-viz-track">
          <span
            className={cn('block h-full rounded-full', BAR_FILL[bar.level ?? 'default'])}
            style={{ inlineSize: `${Math.min(Math.max(bar.fraction, 0), 1) * 100}%` }}
          />
        </span>
      ) : null}
    </>
  );

  // The denominator is part of the accessible name, so a screen reader hears
  // the fact rather than the rumour.
  const accessibleName =
    state === 'loading' ? `${label}, loading, ${denominator}` : `${label}, ${denominator}`;

  const shell = cn('flex flex-col text-start', SIZE_BOX[size], className);

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} aria-label={accessibleName} className={shell}>
        {body}
      </button>
    );
  }

  return (
    <div role="group" aria-label={accessibleName} className={shell}>
      {body}
    </div>
  );
}
