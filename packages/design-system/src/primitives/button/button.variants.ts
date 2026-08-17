import { cva, type VariantProps } from 'class-variance-authority';

/**
 * SyButton's visual contract, kept apart from the component so the token
 * and hit-area tests can read it without rendering anything.
 *
 * Every colour comes from a semantic token (AC2). The variant treatments
 * below are the ones the canonical screens draw:
 *
 *   primary    accent.default ground, surface.default label   ("New sign")
 *   secondary  surface ground, border.strong edge             ("Request changes")
 *   danger     status.danger.fg edge and label, no fill       ("Delete sign")
 *   disabled   control.disabled.bg / .fg                      ("Approve", blocked)
 *
 * ghost and icon-only carry no drawn specimen; both are treatments of the
 * tokens already named above rather than new colour decisions — ghost drops
 * secondary's edge, icon-only rests at icon.subtle, the token §10.1 defines
 * for "non-text affordances: row menus, unstarred views, chevrons".
 *
 * Note on the primary label: the design has no foreground token for a
 * filled ground — text.primary/secondary/tertiary are all dark-on-light in
 * the light theme. The canonical screen paints #ffffff, which is exactly
 * surface.default's light value, so surface.default is used here rather
 * than a new token being minted. It also behaves correctly in dark, where
 * both sides flip. Recorded as open decision D12.
 */

/**
 * The hit area, not the visual box.
 *
 * §16 requires a 32px target and 44px on touch, but button.sm is 28px tall,
 * so the smallest size cannot satisfy the floor with its own height. A
 * transparent ::after centred on the button carries the target instead,
 * which is why the visual height and the hit area are separate concerns
 * here — shrink one and the other is unaffected.
 */
const HIT_AREA =
  "relative after:absolute after:top-1/2 after:start-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] " +
  'after:min-h-[var(--hit-min)] after:min-w-[var(--hit-min)] ' +
  'pointer-coarse:after:min-h-[var(--hit-touch)] pointer-coarse:after:min-w-[var(--hit-touch)]';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-200',
    'rounded-sm text-body',
    'border border-transparent',
    'transition-colors duration-[var(--dur-instant)]',
    // No focus-visible override anywhere: base.css owns the ring, and §16
    // says it is never removed. Silence here is the point.
    'disabled:cursor-not-allowed',
    'disabled:bg-control-disabled-bg disabled:text-control-disabled-fg disabled:border-status-neutral-border',
    HIT_AREA,
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-accent-default text-surface-default hover:bg-accent-hover',
        secondary:
          'bg-surface-default text-text-primary border-border-strong hover:bg-surface-subtle',
        ghost: 'text-text-primary hover:bg-surface-subtle',
        danger: 'text-status-danger-fg border-status-danger-fg hover:bg-status-danger-bg',
        'icon-only': 'text-icon-subtle hover:bg-surface-subtle',
      },
      size: {
        sm: 'h-[var(--button-sm)]',
        md: 'h-[var(--button-md)]',
        lg: 'h-[var(--button-lg)]',
      },
      iconOnly: {
        true: 'p-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: false, size: 'sm', class: 'px-200' },
      { iconOnly: false, size: 'md', class: 'px-300' },
      { iconOnly: false, size: 'lg', class: 'px-400' },
      { iconOnly: true, size: 'sm', class: 'w-[var(--button-sm)]' },
      { iconOnly: true, size: 'md', class: 'w-[var(--button-md)]' },
      { iconOnly: true, size: 'lg', class: 'w-[var(--button-lg)]' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      iconOnly: false,
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** The design token each size draws its visual height from. */
export const SIZE_HEIGHT_TOKENS = {
  sm: 'button.sm',
  md: 'button.md',
  lg: 'button.lg',
} as const;

/** The token every size's hit area is floored to, and its touch counterpart. */
export const HIT_AREA_TOKENS = {
  pointer: 'hit.min',
  touch: 'hit.touch',
} as const;
