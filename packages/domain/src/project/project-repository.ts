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
