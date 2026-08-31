/**
 * SyMenu's contract lists, kept apart from the component so the coverage
 * tests can read them without rendering anything.
 *
 * The design contracts one variant — "elev.1 popover" — so there is no
 * variant axis to model: the popover treatment is the component. Sizes are
 * UNSPECIFIED BY DESIGN and none are invented.
 */

/**
 * The four contracted states.
 *
 * `open` is observed rather than set: it follows the trigger, and the
 * component owns it. The other three are props. All four are declared
 * because the contract names all four, and the manifest coverage test
 * compares this list against it.
 */
export const MENU_STATES = ['open', 'loading', 'submitting', 'error-in-place'] as const;
export type SyMenuState = (typeof MENU_STATES)[number];

/**
 * An item's tone.
 *
 * `destructive` is presentational, not domain. The design's eight fixed
 * groups — Open, Edit, Relate, Lifecycle, Validate, Duplicate, Copy link,
 * Destructive (last) — are the entity action registry's, and decision D3
 * keeps that vocabulary in apps/studio. This package renders whatever
 * groups it is handed, in the order it is handed them.
 */
export const MENU_ITEM_TONES = ['default', 'destructive'] as const;
export type SyMenuItemTone = (typeof MENU_ITEM_TONES)[number];
