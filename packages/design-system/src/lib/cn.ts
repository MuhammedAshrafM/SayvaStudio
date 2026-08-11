import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
 *
 * Note for later slices: `twMerge` groups classes by the Tailwind utility
 * they belong to. Once tokens.css adds custom `@theme` namespaces (Slice 3),
 * conflicts *within* a custom namespace need `extendTailwindMerge` to be
 * resolved correctly — plain `twMerge` only knows the default scale.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
