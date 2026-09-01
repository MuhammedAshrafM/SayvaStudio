import {
  createProject,
  renameProject,
  toProjectId,
  type Clock,
  type IdGenerator,
  type Project,
  type ProjectRepository,
} from '@sayva/domain';
import { ProjectNotFoundError, toProjectView, type ProjectView } from './project-models.js';

/**
 * The five Project use cases — Roadmap Phase 2 scope, and the Architecture
 * Blueprint §4 table minus ImportProject/ExportProject, which the Roadmap
 * defers to Phase 12.
 *
 * Each is a Command or a Query that takes a Request Model, orchestrates
 * Domain objects through a repository, and returns a Response Model
 * (AD-02). None of them knows how storage works: they hold the
 * `ProjectRepository` port, which is exactly what leaves the filesystem
 * adapter free to arrive later without touching this layer.
 */

export type ProjectUseCaseDeps = {
  projects: ProjectRepository;
  ids: IdGenerator;
  clock: Clock;
};

/** Loads a Project or fails loudly. Shared by every use case that takes an id. */
async function load(deps: ProjectUseCaseDeps, id: string): Promise<Project> {
  const project = await deps.projects.findById(toProjectId(id));
  if (project === null) throw new ProjectNotFoundError(id);
  return project;
}

// --- CreateProject --------------------------------------------------------

export type CreateProjectRequest = {
  name: string;
  /**
   * The schema version the calling Studio build writes.
   *
   * Supplied by the caller because no canonical source states either the
   * current build's version or the compatibility rule the Project invariant
   * refers to. See `Project.schemaVersion` in @sayva/domain.
   */
  schemaVersion: number;
  tags?: readonly string[];
};

/** Command. Creates a Project and persists it. */
export async function createProjectUseCase(
  deps: ProjectUseCaseDeps,
  request: CreateProjectRequest,
): Promise<ProjectView> {
  const project = createProject(request, { ids: deps.ids, clock: deps.clock });
  await deps.projects.save(project);
  return toProjectView(project);
}

// --- OpenProject ----------------------------------------------------------

export type OpenProjectRequest = { id: string };

/** Query. Reads one Project without touching its state. */
export async function openProjectUseCase(
  deps: ProjectUseCaseDeps,
  request: OpenProjectRequest,
): Promise<ProjectView> {
  return toProjectView(await load(deps, request.id));
}

/** Query. Every Project, for the list screen. */
export async function listProjectsUseCase(
  deps: ProjectUseCaseDeps,
): Promise<readonly ProjectView[]> {
  return (await deps.projects.findAll()).map(toProjectView);
}

// --- SaveProject ----------------------------------------------------------

export type SaveProjectRequest = {
  id: string;
  /** The only field a Project can currently change. */
  name: string;
};

/**
 * Command. Applies an edit and persists it.
 *
 * Renaming is the whole of "save" in this phase, because `name` is the only
 * mutable field a Project has: the owned Language list arrives with Phase 3,
 * and `schemaVersion` is written once by the build that created the file.
 */
export async function saveProjectUseCase(
  deps: ProjectUseCaseDeps,
  request: SaveProjectRequest,
): Promise<ProjectView> {
  const project = await load(deps, request.id);
  const renamed = renameProject(project, request.name, deps.clock);
  await deps.projects.save(renamed);
  return toProjectView(renamed);
}

// --- DuplicateProject -----------------------------------------------------

export type DuplicateProjectRequest = {
  id: string;
  /** The copy's name. Required, like any Project's — it is a new entity. */
  name: string;
};

/**
 * Command. Copies a Project under a fresh identity.
 *
 * The copy is a genuinely new entity: a new `ProjectId` and new timestamps,
 * never the source's. Domain Model §5 forbids reusing an id, and a copy
 * that carried the original's `createdAt` would be claiming a history it
 * does not have.
 *
 * Only the Project record is copied, which is the whole of it in this
 * phase — Phase 2's freeze point has a Project as "correctly still an empty
 * shell — no Language yet". Duplicating owned Languages and Assets becomes
 * real work when those aggregates exist.
 */
export async function duplicateProjectUseCase(
  deps: ProjectUseCaseDeps,
  request: DuplicateProjectRequest,
): Promise<ProjectView> {
  const source = await load(deps, request.id);
  const copy = createProject(
    { name: request.name, schemaVersion: source.schemaVersion, tags: source.metadata.tags },
    { ids: deps.ids, clock: deps.clock },
  );
  await deps.projects.save(copy);
  return toProjectView(copy);
}

// --- DeleteProject --------------------------------------------------------

export type DeleteProjectRequest = { id: string };

/**
 * Command. Removes a Project.
 *
 * Destructive, per Domain Model §8 — the record goes, rather than a flag
 * being set. The `Deleted` lifecycle state names that outcome; it is never
 * a value a stored Project carries.
 *
 * The load first is not ceremony: it makes deleting something that was
 * never there a `ProjectNotFoundError` rather than a silent success.
 */
export async function deleteProjectUseCase(
  deps: ProjectUseCaseDeps,
  request: DeleteProjectRequest,
): Promise<void> {
  const project = await load(deps, request.id);
  await deps.projects.delete(project.id);
}
