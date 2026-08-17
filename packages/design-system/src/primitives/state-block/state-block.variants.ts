import { cva, type VariantProps } from 'class-variance-authority';

/**
 * SyStateBlock's visual contract. Kept apart from the component so the
 * coverage tests can read the state and size lists without rendering.
 *
 * The contract's anatomy is "heading (real heading) · explanatory line ·
 * one named next action" — text, in every state. There is deliberately no
 * illustration slot and no icon slot: §Structure says "no decorative
 * illustration", and which icon set the product uses is open decision D6.
 */

/** The six absence states. Order follows the canonical contract. */
export const STATE_BLOCK_STATES = [
  'first-run',
  'filtered-empty',
  'loading',
  'error',
  'no-permission',
  'offline',
] as const;

export type SyStateBlockState = (typeof STATE_BLOCK_STATES)[number];

/** The three sizes: a whole pane, a panel section, or a single row. */
export const STATE_BLOCK_SIZES = ['pane', 'panel', 'inline'] as const;

export type SyStateBlockSize = (typeof STATE_BLOCK_SIZES)[number];

export const stateBlockVariants = cva('flex text-start', {
  variants: {
    size: {
      // A whole empty region: the block is the content, so it centres.
      pane: 'flex-col items-center justify-center gap-300 p-800',
      // An inspector section or an overlay body.
      panel: 'flex-col gap-200 p-400',
      // "inline row" — one row inside something already populated.
      inline: 'flex-row items-center gap-300 px-300 py-200',
    },
    state: {
      'first-run': '',
      'filtered-empty': '',
      loading: '',
      // The only state carrying a tone, and never as the sole signal: the
      // heading text says what happened and the trace ID is rendered.
      error: '',
      'no-permission': '',
      offline: '',
    },
  },
  defaultVariants: { size: 'pane', state: 'first-run' },
});

export const stateBlockHeadingVariants = cva('text-text-primary', {
  variants: {
    size: {
      pane: 'text-heading-md',
      panel: 'text-heading-sm',
      inline: 'text-body-strong',
    },
    state: {
      'first-run': '',
      'filtered-empty': '',
      loading: '',
      error: 'text-status-danger-fg',
      'no-permission': '',
      offline: '',
    },
  },
  defaultVariants: { size: 'pane', state: 'first-run' },
});

export type StateBlockVariantProps = VariantProps<typeof stateBlockVariants>;
