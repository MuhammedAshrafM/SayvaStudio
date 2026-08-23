import { cva } from 'class-variance-authority';

/** text · mono · number · textarea · select · combobox · multi-facet · date. */
export const FIELD_VARIANTS = [
  'text',
  'mono',
  'number',
  'textarea',
  'select',
  'combobox',
  'multi-facet',
  'date',
] as const;
export type SyFieldVariant = (typeof FIELD_VARIANTS)[number];

/**
 * The nine contracted states.
 *
 * Three of them are observed rather than set: `empty` and `filled` follow
 * the value, and `focus` is `:focus-visible`, which base.css owns. The other
 * six are props. All nine are declared here because the contract names all
 * nine, and the manifest coverage test compares this list against it.
 */
export const FIELD_STATES = [
  'empty',
  'filled',
  'focus',
  'invalid',
  'warning',
  'readonly',
  'disabled',
  'loading',
  'suggested',
] as const;
export type SyFieldState = (typeof FIELD_STATES)[number];

/** Variants that offer a list of options rather than free text. */
export const OPTION_VARIANTS = ['select', 'combobox', 'multi-facet'] as const;

/**
 * The control surface.
 *
 * Invalid changes the border colour rather than its width. The contract
 * requires "border + icon + text"; the drawn specimen thickens the edge to
 * 1.5px, which no token expresses, so the treatment stays on the tokenised
 * axis and the icon and message carry the rest.
 */
export const fieldControlVariants = cva(
  'w-full rounded-sm border bg-surface-default px-300 py-200 text-body text-text-primary',
  {
    variants: {
      variant: {
        text: '',
        // §10.3: mono carries IDs, glosses, versions and timecodes.
        mono: 'text-mono',
        number: 'tabular-nums',
        textarea: 'min-h-1200 resize-y',
        select: '',
        combobox: '',
        'multi-facet': '',
        date: 'tabular-nums',
      },
      tone: {
        default: 'border-border-strong',
        invalid: 'border-status-danger-fg',
        warning: 'border-status-warning-fg',
        // The AI register. §10.1 gives accent.ai.subtle to "suggestion
        // wrappers", which is exactly this.
        suggested: 'border-accent-ai-border bg-accent-ai-subtle',
      },
      inert: {
        // Read-only and disabled both read as "not yours to edit now", and
        // the specimen draws them the same way.
        true: 'border-border-default bg-surface-subtle text-text-tertiary',
        false: '',
      },
    },
    defaultVariants: { variant: 'text', tone: 'default', inert: false },
  },
);
