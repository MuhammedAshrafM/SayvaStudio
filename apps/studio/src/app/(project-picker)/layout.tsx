import type { ReactNode } from 'react';
import { workspaceRoot } from '@/composition-root';
import { ProjectPickerFrame } from '@/project-picker/project-picker';

/**
 * Rendered per request, like the page it wraps: the workspace root is
 * deployment configuration (ADR-003 SR-09), and a build must not need it.
 */
export const dynamic = 'force-dynamic';

/**
 * The Project Picker's header and Create drawer, around its list.
 *
 * A layout rather than part of the page because the header outlives the
 * scan. The page's loading boundary sits *inside* this layout, so the header
 * — New Project included — is present in every state (B15), and a Create
 * drawer opened while the list is still loading is not unmounted when the
 * list arrives. `router.refresh()` re-renders the server parts without
 * remounting this client frame, so a re-scan leaves the drawer's state alone.
 *
 * A route group, not a route: `(project-picker)` adds no URL segment, and
 * the Picker stays at the application root (§04 §11). It scopes this layout
 * to the Picker, so nothing that later sits beside it inherits its header.
 */
export default function ProjectPickerLayout({ children }: { children: ReactNode }) {
  return <ProjectPickerFrame root={workspaceRoot()}>{children}</ProjectPickerFrame>;
}
