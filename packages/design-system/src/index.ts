/**
 * The design system's single public surface (ADR-002 DR-05). Components are
 * re-exported here with their prop types; nothing else is reachable from
 * outside the package.
 */
export { SyButton } from './primitives/button/index.js';
export type { SyButtonProps, SyButtonSize, SyButtonTone } from './primitives/button/index.js';

export { SyConfidence } from './primitives/confidence/index.js';
export type {
  SyConfidenceProps,
  SyConfidenceState,
  SyConfidenceVariant,
} from './primitives/confidence/index.js';

export { SyDrawer } from './primitives/drawer/index.js';
export type { SyDrawerProps, SyDrawerState, SyDrawerVariant } from './primitives/drawer/index.js';

export { SyEntityRef } from './primitives/entity-ref/index.js';
export type {
  SyEntityRefProps,
  SyEntityRefState,
  SyEntityRefVariant,
} from './primitives/entity-ref/index.js';

export { SyField } from './primitives/field/index.js';
export type {
  SyFieldOption,
  SyFieldProps,
  SyFieldState,
  SyFieldVariant,
} from './primitives/field/index.js';

export { SyMenu } from './primitives/menu/index.js';
export type {
  SyMenuGroup,
  SyMenuItem,
  SyMenuItemTone,
  SyMenuProps,
  SyMenuState,
} from './primitives/menu/index.js';

export { SyMetric } from './primitives/metric/index.js';
export type {
  SyMetricBar,
  SyMetricProps,
  SyMetricSize,
  SyMetricState,
} from './primitives/metric/index.js';

export { SyStateBlock } from './primitives/state-block/index.js';
export type {
  SyStateBlockAction,
  SyStateBlockProps,
  SyStateBlockSize,
  SyStateBlockState,
} from './primitives/state-block/index.js';

export { SyStatusBadge } from './primitives/status-badge/index.js';
export type {
  SyStatusBadgeProps,
  SyStatusBadgeTone,
  SyStatusBadgeVariant,
} from './primitives/status-badge/index.js';

/**
 * The overlay substrate. The design contracts it by name and by shape —
 * "that substrate is a hook, not a component" — so it is part of the public
 * surface rather than an internal detail of the overlays that use it.
 */
export { MAX_OVERLAY_DEPTH, useOverlay } from './overlay/index.js';
export type { UseOverlayOptions } from './overlay/index.js';
