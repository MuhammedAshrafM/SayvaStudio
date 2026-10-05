/**
 * `@sayva/application` — Use Cases and Request/Response Models.
 *
 * Depends on @sayva/domain only (Architecture Blueprint AD-01/AD-02,
 * ADR-002 DR-02) — never Infrastructure, never a framework. A use case
 * holds ports, so the concrete adapter behind one can change without this
 * layer noticing.
 *
 * Populated one aggregate per Roadmap phase. Project arrives with Phase 2;
 * see docs/architecture/architecture-blueprint.md §4 for the full table.
 */
export {
  createProjectUseCase,
  deleteProjectUseCase,
  duplicateProjectUseCase,
  listProjectsUseCase,
  openProjectUseCase,
  saveProjectUseCase,
  viewProjectListUseCase,
  ProjectNotFoundError,
  toProjectView,
} from './project/index.js';
export type {
  CreateProjectRequest,
  CreateProjectResult,
  CreateProjectUseCaseDeps,
  DeleteProjectRequest,
  DuplicateProjectRequest,
  OpenProjectRequest,
  OpenProjectResult,
  OpenProjectUseCaseDeps,
  ProjectListItem,
  ProjectListUseCaseDeps,
  ProjectListView,
  ProjectUseCaseDeps,
  ProjectView,
  SaveProjectRequest,
} from './project/index.js';
