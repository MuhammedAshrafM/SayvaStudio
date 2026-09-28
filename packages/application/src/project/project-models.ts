import type { Project, ProjectState } from '@sayva/domain';

/**
 * The Project Response Model.
 *
 * Plain, serializable data — never a Domain entity (Architecture Blueprint
 * AD-02). Dates cross as ISO-8601 strings rather than `Date` objects: a
 * Response Model has to survive a Server Action boundary, and §6 notes that
 * Next.js "Server Actions must take and return serializable values, which
 * is exactly what a Request/Response Model boundary requires anyway".
 */
export type ProjectView = {
  readonly id: string;
  readonly name: string;
  readonly schemaVersion: number;
  readonly state: ProjectState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly tags: readonly string[];
  readonly notes?: string;
};

/**
 * One row of the Project Picker — only what the row shows.
 *
 * The canonical row carries `name` then `updatedAt` (Screens §04). `id` rides
 * along as the row's identity, not as content. `updatedAt` is the ISO 8601
 * machine value for a `<time datetime>`; `updatedAgo` is RB-3's label for it,
 * computed in the Query so no component formats anything (AD-07).
 */
export type ProjectListItem = {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly updatedAgo: string;
};

/**
 * The Project list as the Project Picker shows it — a Query View Model.
 *
 * AD-07 keeps every decision about which state to show inside a Query use
 * case, so each branch below is one of the canonical states and the page
 * only renders whichever it is handed. Plain and serializable (AD-02).
 *
 * - `listed` — at least one Project, in PP-04 order.
 * - `first-run` — the workspace holds none. Decided here rather than left to
 *   a component checking for an empty array, because the canonical design
 *   treats it as its own state, never as an empty list.
 * - `error` — the list could not be read. `location` is where (ADR-003
 *   SR-10); `traceId` is which occurrence (SR-11). They are separate
 *   contracts and neither stands in for the other.
 */
export type ProjectListView =
  | { readonly status: 'listed'; readonly projects: readonly ProjectListItem[] }
  | { readonly status: 'first-run' }
  | { readonly status: 'error'; readonly traceId: string; readonly location: string };

/** The one place a Domain entity becomes a Response Model. */
export function toProjectView(project: Project): ProjectView {
  return {
    id: project.id,
    name: project.name,
    schemaVersion: project.schemaVersion,
    state: project.state,
    createdAt: project.metadata.createdAt.toISOString(),
    updatedAt: project.metadata.updatedAt.toISOString(),
    tags: [...project.metadata.tags],
    ...(project.metadata.notes === undefined ? {} : { notes: project.metadata.notes }),
  };
}

/**
 * Raised when a use case is handed an id nothing answers to.
 *
 * An Application concern, not a Domain one: the entity is not invalid, it
 * is absent. Domain Model §5 wants a stale reference "detectably broken
 * rather than silently pointing at the wrong thing", and this is what
 * detects it at the use-case boundary.
 */
export class ProjectNotFoundError extends Error {
  constructor(readonly projectId: string) {
    super(`No Project with id "${projectId}".`);
    this.name = 'ProjectNotFoundError';
  }
}
