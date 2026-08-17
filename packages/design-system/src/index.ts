/**
 * The design system's single public surface (ADR-002 DR-05). Components are
 * re-exported here with their prop types; nothing else is reachable from
 * outside the package.
 */
export { SyButton } from './primitives/button/index.js';
export type { SyButtonProps, SyButtonSize, SyButtonTone } from './primitives/button/index.js';
