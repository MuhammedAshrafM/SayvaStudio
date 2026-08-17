import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { CSS_VARIABLES } from '../tokens.js';

/**
 * The typography utilities our `@theme` block creates: `text-body`,
 * `text-heading-md`, `text-caption` and so on.
 *
 * Derived from the generated token list rather than written out, so adding
 * a typography token cannot leave this behind.
 *
 * `--text-body--line-height` and `--text-body--font-weight` are Tailwind's
 * paired sub-properties, not utilities of their own, so the second `--`
 * filters them out.
 */
const FONT_SIZE_UTILITIES = CSS_VARIABLES.filter(
  (name) => name.startsWith('--text-') && !name.includes('--', 2),
).map((name) => name.slice('--text-'.length));

/**
 * tailwind-merge, taught our custom namespaces.
 *
 * Without this it cannot tell `text-caption` (a font size) from
 * `text-status-danger-fg` (a colour): both look like `text-*`, so it treats
 * them as competing for one slot and silently drops whichever came first.
 * That is not hypothetical — it was dropping the label colour from every
 * status badge and the font size from SyButton's primary variant, with no
 * error anywhere, because a merged class list is still a valid class list.
 *
 * Only `font-size` needs teaching. Every other `text-*` utility falls
 * through to tailwind-merge's colour group on its own.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZE_UTILITIES }],
    },
  },
});

/**
 * Joins class names and resolves Tailwind conflicts, last one winning.
 *
 * Two libraries because they solve two different problems and neither
 * solves the other's. `clsx` flattens the conditional shapes a component
 * actually produces — arrays, objects, falsy branches — into one string.
 * `twMerge` then removes classes that Tailwind would have made unreachable:
 * `p-2 p-4` is not "both", it is whichever CSS rule happens to win, which
 * depends on stylesheet order rather than on what the caller wrote.
 *
 * That ordering guarantee is what makes `className` safe to expose as an
 * escape hatch on every primitive: a caller's class always overrides the
 * component's default for the same property, instead of colliding with it.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
