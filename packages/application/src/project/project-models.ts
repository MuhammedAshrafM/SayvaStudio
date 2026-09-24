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
 * The Project list as the Project Picker shows it — a Query View Model.
 *
 * AD-07 keeps the decision "did the list load, or did it fail" inside a
 * Query use case rather than a Server Component, so the page receives one
 * of these and only renders it. Plain and serializable, like every Response
 * Model (AD-02).
 *
 * The `error` branch carries exactly what readiness ruling RB-2 settled and
 * nothing more: the trace ID of this occurrence (ADR-003 SR-11). The affected
 * file location that the canonical error state also shows arrives with
 * SR-10, in the read-only slice — it is not carried here, and the trace ID is
 * never a stand-in for it.
 */
export type ProjectListView =
  | { readonly status: 'listed'; readonly projects: readonly ProjectView[] }
  | { readonly status: 'error'; readonly traceId: string };

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
