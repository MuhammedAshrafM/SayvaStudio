/**
 * SyDialog's contract lists, kept apart from the component so the coverage
 * tests can read them without rendering anything.
 */

/** The two contracted variants. `destructive` also changes the ARIA role. */
export const DIALOG_VARIANTS = ['default', 'destructive'] as const;
export type SyDialogVariant = (typeof DIALOG_VARIANTS)[number];

/**
 * The four contracted states.
 *
 * `default` and `destructive` are the variants observed as states — the
 * design records them on both axes — and `loading` and `error-in-place` are
 * props. All four are declared because the contract names all four, and the
 * manifest coverage test compares this list against it.
 */
export const DIALOG_STATES = ['default', 'destructive', 'loading', 'error-in-place'] as const;
export type SyDialogState = (typeof DIALOG_STATES)[number];
