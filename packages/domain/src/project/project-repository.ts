import type { Project } from './project.js';
import type { ProjectId } from './project-id.js';

/**
 * The Project port — Architecture Blueprint §3, and AD-01: repository
 * interfaces live in Domain and are implemented in Infrastructure, because
 * Domain Services need to see them.
 *
 * The four operations are the Blueprint's own: findById, findAll, save,
 * delete.
 *
 * Every one returns a Promise, and that is a consequence rather than a
 * preference: the Blueprint defers the storage mechanism to a later
 * decision (§9 — direct Node `fs`, an Electron/Tauri host, or the browser
 * File System Access API), and two of those three are asynchronous only.
 * A synchronous port would have decided that question by accident.
 *
 * `delete` removes the record. Domain Model §8 makes deletion "explicit and
 * destructive", so there is no soft-delete flag to set instead.
 */
export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>;
  findAll(): Promise<readonly Project[]>;
  save(project: Project): Promise<void>;
  delete(id: ProjectId): Promise<void>;
}

/**
 * The port's failure contract — ADR-003 SR-10.
 *
 * A repository that cannot read or write where Projects are kept throws one
 * of these. It carries the affected `location` because the canonical Project
 * Picker's error state names it, and it is declared here, beside the port,
 * because that is the only place both Application and Infrastructure can see
 * (ADR-002 DR-02). Application catches it without ever importing
 * Infrastructure; Infrastructure's own error type extends it and stays an
 * implementation detail.
 *
 * `location` is where the failure happened — the folder that could not be
 * listed, or the Project file that could not be read — in whatever form the
 * storage uses. It is never a trace ID: that is a separate contract (SR-11)
 * and the two are not interchangeable.
 *
 * Not a `DomainError`. That type means a Project broke an invariant; this
 * means the place Projects are stored could not be used. The cause, when
 * there is one — a `DomainError` for a file whose contents are illegal,
 * among others — travels as `cause`.
 */
export class ProjectFileFailure extends Error {
  readonly location: string;

  constructor(message: string, location: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProjectFileFailure';
    this.location = location;
  }
}
