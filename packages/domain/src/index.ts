/**
 * `@sayva/domain` — Entities, Value Objects, Repository interfaces and
 * Domain Services.
 *
 * Zero dependencies, by design (Architecture Blueprint AD-01, ADR-002
 * DR-02) — nothing beyond the language itself may ever be added here.
 *
 * Populated incrementally, one aggregate per Roadmap phase. Project
 * arrives with Phase 2; the remaining six aggregates follow in Phases 3-9.
 * See docs/architecture/domain-model.md for the full catalog.
 */
export { DomainError } from './errors.js';

export type { Clock, FailureTracer, IdGenerator } from './ports/index.js';

export { createMetadata, restoreMetadata, touchMetadata } from './shared/metadata.js';
export type { Metadata } from './shared/metadata.js';

export {
  assertProjectSchemaVersion,
  createProject,
  isProjectId,
  newProjectId,
  renameProject,
  restoreProject,
  toProjectId,
  CURRENT_PROJECT_SCHEMA_VERSION,
  ProjectFileFailure,
  PROJECT_STATES,
  PROJECT_TRANSITIONS_BLOCKED,
} from './project/index.js';
export type {
  CreateProjectInput,
  Project,
  ProjectId,
  ProjectRepository,
  ProjectState,
  RestoreProjectInput,
} from './project/index.js';
