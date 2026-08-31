/**
 * SyDrawer's contract lists, kept apart from the component so the coverage
 * tests can read them without rendering anything.
 */

/**
 * The two contracted variants.
 *
 * The design says "right drawer; bottom sheet at narrow widths" but never
 * names the width at which the switch happens. It is not invented here, and
 * it does not need to be: SyAppShell "owns responsive behaviour — no screen
 * defines its own breakpoint handling", so which variant applies is the
 * shell's decision and arrives as a prop.
 */
export const DRAWER_VARIANTS = ['right', 'bottom-sheet'] as const;
export type SyDrawerVariant = (typeof DRAWER_VARIANTS)[number];

/**
 * The five contracted states, named exactly as the design records them so
 * the manifest coverage test can compare the two lists.
 *
 * Three are observed rather than set: `closed` and `open` follow the `open`
 * prop, and `stacked max 2` is the overlay substrate's business — it refuses
 * a third overlay rather than letting one exist.
 *
 * `resizing` is declared and inert. It is explicitly SyDrawer's own state in
 * the design, but §10.8's sizing table carries rows for the rail, the sidebar
 * and the inspector and none for a drawer, so there is no width range, no
 * handle and no persistence rule to build from. Decision D16 is open, and
 * the agreed handling is exactly this: declare it, render no affordance,
 * mark it blocked. Nothing here may invent a dimension.
 */
export const DRAWER_STATES = ['closed', 'open', 'resizing', 'dirty', 'stacked max 2'] as const;
export type SyDrawerState = (typeof DRAWER_STATES)[number];

/**
 * Which drawer states this package actually implements.
 *
 * Split out so the gap is a value the tests can assert rather than a comment
 * anyone can contradict.
 */
export const DRAWER_STATES_BLOCKED = ['resizing'] as const;
