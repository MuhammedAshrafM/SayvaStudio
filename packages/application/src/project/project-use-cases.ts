import {
  createProject,
  renameProject,
  toProjectId,
  CURRENT_PROJECT_SCHEMA_VERSION,
  ProjectFileFailure,
  ProjectNameRequiredError,
  type Clock,
  type FailureTracer,
  type IdGenerator,
  type Project,
  type ProjectRepository,
} from '@sayva/domain';
import {
  ProjectNotFoundError,
  toProjectView,
  type CreateProjectResult,
  type ProjectListView,
  type ProjectView,
} from './project-models.js';
import { updatedAgo } from './updated-ago.js';

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

/**
 * The name, and nothing else — the Create decision closure's B9.
 *
 * `schemaVersion` is not here because the build supplies it, never the
 * caller: ADR-003 SR-07 fixed `CURRENT_PROJECT_SCHEMA_VERSION`, and the
 * canonical Create design has the author supply "a name and nothing else".
 * `tags` is not here because no canonical source makes it author-facing.
 */
export type CreateProjectRequest = { name: string };

/**
 * What the Create command needs: the ordinary Project dependencies plus the
 * tracer. Its own type, like `ProjectListUseCaseDeps`, so the tracer reaches
 * this command and the list query and nothing else (ADR-003 SR-11 and its
 * Create extension) — never `ProjectUseCaseDeps` as a whole.
 */
export type CreateProjectUseCaseDeps = ProjectUseCaseDeps & { tracer: FailureTracer };

/**
 * Command. Creates a Project and persists it, reporting one of the three
 * outcomes the canonical Create design shows (Screens §04 §3).
 *
 * Only two failures are outcomes, and each is caught by its exact type:
 *
 * - `ProjectNameRequiredError` — Domain's name rule — is `invalid-name`.
 *   Nothing is written and nothing is traced: the author's name was
 *   refused, the storage never came into it.
 * - `ProjectFileFailure` — the port's failure contract (SR-10) — is
 *   `write-failed`. The tracer is asked once for this occurrence (SR-11's
 *   Create extension), and its `location` travels with the trace ID.
 *
 * Anything else — another invariant, a broken adapter, a bug — is a defect
 * and is rethrown untraced, rather than dressed up as a name the author
 * must fix or a folder they must repair.
 */
export async function createProjectUseCase(
  deps: CreateProjectUseCaseDeps,
  request: CreateProjectRequest,
): Promise<CreateProjectResult> {
  let project: Project;
  try {
    project = createProject(
      { name: request.name, schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION },
      { ids: deps.ids, clock: deps.clock },
    );
  } catch (error) {
    if (error instanceof ProjectNameRequiredError) return { status: 'invalid-name' };
    throw error;
  }

  try {
    await deps.projects.save(project);
  } catch (failure) {
    if (!(failure instanceof ProjectFileFailure)) throw failure;
    return {
      status: 'write-failed',
      traceId: deps.tracer.trace(failure),
      location: failure.location,
    };
  }

  return { status: 'created', project: toProjectView(project) };
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

/**
 * Query. Every Project, most recently edited first.
 *
 * The order is decided here, in the Query's View Model assembly, because
 * AD-07 puts "any decision-worthy logic" there — never in a Server
 * Component — and a list's default order is exactly that kind of decision:
 * left to each consumer, two screens could disagree about what "the project
 * list" is. The canonical Project Picker design (Screens §04) reads
 * "`updatedAt` descending … client-side — no port change", and PP-04 records
 * that as *outside the repository and outside a server-side data query*,
 * which this is. `ProjectRepository.findAll()` is untouched and takes no
 * sort parameter.
 *
 * There is deliberately **no tie-breaker**. Two Projects edited at the same
 * instant compare equal and keep whatever relative order the repository
 * returned them in — `Array.prototype.sort` is stable. No source ranks one
 * equally-recent Project above another, and ordering by name or id here would
 * be inventing a rule the design never stated.
 *
 * The port's array is copied before sorting: it is `readonly`, and sorting it
 * in place would reorder the repository's own result behind its back.
 */
export async function listProjectsUseCase(
  deps: ProjectUseCaseDeps,
): Promise<readonly ProjectView[]> {
  const projects = await deps.projects.findAll();
  return [...projects].sort(mostRecentlyUpdatedFirst).map(toProjectView);
}

function mostRecentlyUpdatedFirst(a: Project, b: Project): number {
  return b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime();
}

/**
 * What the Project list query needs: the ordinary Project dependencies plus
 * the tracer. A separate type rather than a new field on `ProjectUseCaseDeps`,
 * so the tracer reaches this one query and no other use case — ADR-003 SR-11
 * scopes tracing to the Project list's read failure.
 */
export type ProjectListUseCaseDeps = ProjectUseCaseDeps & { tracer: FailureTracer };

/**
 * Query. The Project list as the Project Picker renders it: the list, the
 * first-run state, or a traced read failure.
 *
 * Every choice between those is made here, per AD-07, so a Server Component
 * never has to catch, count or format anything. The Projects themselves come
 * from `listProjectsUseCase` unchanged — same PP-04 order.
 *
 * On a read failure the repository throws a `ProjectFileFailure`, the port's
 * Domain-side failure contract (ADR-003 SR-10). Its `location` goes into the
 * error state; the tracer is asked once for a trace ID for this occurrence
 * (SR-11), minted for it and never derived from the failure — not its
 * location, not a framework digest. Nothing is written to the repository: a
 * failed read changes nothing on disk.
 *
 * Only that failure is caught. Anything else is not a read failure — it is a
 * defect — and is rethrown rather than presented as "Can't read the projects
 * folder", which would name the wrong problem. This narrows the temporary
 * catch-all RB-2 shipped with, which was waiting for exactly this contract.
 *
 * `now` is read once, so every row's `updatedAgo` is measured against the same
 * instant.
 */
export async function viewProjectListUseCase(
  deps: ProjectListUseCaseDeps,
): Promise<ProjectListView> {
  let projects: readonly ProjectView[];
  try {
    projects = await listProjectsUseCase(deps);
  } catch (failure) {
    if (!(failure instanceof ProjectFileFailure)) throw failure;
    return { status: 'error', traceId: deps.tracer.trace(failure), location: failure.location };
  }

  if (projects.length === 0) return { status: 'first-run' };

  const now = deps.clock.now();
  return {
    status: 'listed',
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      updatedAgo: updatedAgo(new Date(project.updatedAt), now),
    })),
  };
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
