import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Project, ProjectId, ProjectRepository } from '@sayva/domain';
import {
  deserializeProject,
  serializeProject,
  MalformedProjectFile,
  PROJECT_FILE_EXTENSION,
} from './project-file.js';
import { ProjectFileError } from './project-file-error.js';

/**
 * `ProjectRepository` backed by the local filesystem — ADR-003.
 *
 * SR-01 fixes the mechanism as direct Node `fs`; SR-02 keeps that confined
 * to this package, reachable only through the Composition Root. Nothing
 * here is visible to Application or Domain, which hold the port and nothing
 * else (AD-01).
 *
 * The layout is one UTF-8 JSON file per Project (SR-03), named after its
 * `ProjectId` (SR-04), inside a workspace root supplied by the caller
 * (SR-05). Writes go through a temporary sibling and a rename (SR-06).
 */

/** `<workspace root>/<ProjectId>.sayva` — SR-04. */
function fileNameFor(id: string): string {
  return `${id}${PROJECT_FILE_EXTENSION}`;
}

/** The `ProjectId` a file name claims, or `null` if it is not a Project file. */
function idFromFileName(fileName: string): string | null {
  if (!fileName.endsWith(PROJECT_FILE_EXTENSION)) return null;
  return fileName.slice(0, -PROJECT_FILE_EXTENSION.length);
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT';
}

/**
 * Builds the adapter against a workspace root.
 *
 * The root is a constructor argument and has no default — SR-05. Choosing
 * where an author's projects live belongs to the Composition Root (AD-05),
 * and a root baked in here would also make every test share one real
 * directory. An empty root is rejected rather than silently resolving to the
 * process working directory, which would scatter `.sayva` files wherever
 * Studio happened to be started from.
 */
export function createFilesystemProjectRepository(workspaceRoot: string): ProjectRepository {
  if (workspaceRoot.trim() === '') {
    throw new Error(
      'A filesystem ProjectRepository needs a workspace root; received an empty path. ' +
        'The root is supplied by the Composition Root (ADR-003 SR-05).',
    );
  }
  const root = path.resolve(workspaceRoot);
  const pathFor = (id: string): string => path.join(root, fileNameFor(id));

  /**
   * Reads one `.sayva` file.
   *
   * Every failure that is not "the file is absent" becomes a
   * `ProjectFileError` naming the path, with the original error as its
   * `cause` — a bare `DomainError` about an empty name is true but says
   * nothing about *which* of an author's projects will not open.
   */
  async function read(filePath: string): Promise<Project | null> {
    let contents: string;
    try {
      contents = await readFile(filePath, 'utf8');
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new ProjectFileError(filePath, 'could not be read.', { cause: error });
    }

    let project: Project;
    try {
      project = deserializeProject(contents);
    } catch (error) {
      throw new ProjectFileError(filePath, messageOf(error), { cause: underlying(error) });
    }

    // SR-04: the file name is the identity. Without this, copying
    // `a.sayva` to `b.sayva` would make `findById(b)` return a Project whose
    // id is `a` — a wrong answer that looks like a right one all the way up
    // through the use cases.
    const claimed = idFromFileName(path.basename(filePath));
    if (claimed !== project.id) {
      throw new ProjectFileError(
        filePath,
        `contains project "${project.id}", but its name claims "${String(claimed)}".`,
      );
    }
    return project;
  }

  return {
    async findById(id: ProjectId): Promise<Project | null> {
      return read(pathFor(id));
    },

    /**
     * Every Project in the workspace root.
     *
     * Only `*.sayva` files count (SR-05), which is what keeps a sibling
     * `Assets/` directory and an interrupted write's temporary file from
     * being mistaken for Projects. A root that does not exist yet is an
     * empty workspace, not an error — nothing has been saved into it.
     *
     * One unreadable file fails the whole call. The port returns
     * `readonly Project[]` with no channel for partial failure, so the
     * choice is between failing loudly and silently omitting a Project an
     * author still has on disk. Skipping would look exactly like deletion.
     * Making the list screen tolerant would change the Domain port, which
     * ADR-003 records as undecided rather than deciding it here.
     */
    async findAll(): Promise<readonly Project[]> {
      let entries;
      try {
        entries = await readdir(root, { withFileTypes: true });
      } catch (error) {
        if (isNotFound(error)) return [];
        throw new ProjectFileError(root, 'could not be listed.', { cause: error });
      }

      const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(PROJECT_FILE_EXTENSION))
        .map((entry) => path.join(root, entry.name));

      const projects = await Promise.all(files.map(read));
      // A file listed a moment ago and gone now read as `null`; it was
      // deleted mid-scan, so it is simply not in the result.
      return projects.filter((project): project is Project => project !== null);
    },

    /**
     * Writes a Project, atomically — SR-06.
     *
     * The temporary file is a sibling of its destination because a rename is
     * atomic only within one filesystem. What this buys precisely: a crash
     * between the write and the rename leaves a `*.tmp` file, which is not a
     * `.sayva` file, so `findById` and `findAll` never see it and whatever
     * was saved before is still intact and readable.
     *
     * No `fsync`, on the file or the directory — against a power loss rather
     * than a process crash a renamed file may still be incompletely flushed.
     * SR-06 says so explicitly rather than implying durability it does not
     * provide.
     */
    async save(project: Project): Promise<void> {
      // A root that cannot be created is the port's failure contract too
      // (ADR-003 SR-10, extended by the Create decision closure, B11), located
      // at the root itself. Without this the Node error escaped the port
      // raw, and a caller could not tell a storage failure from a defect.
      try {
        await mkdir(root, { recursive: true });
      } catch (error) {
        throw new ProjectFileError(root, 'could not be created.', { cause: error });
      }
      const destination = pathFor(project.id);
      const temporary = `${destination}.${randomUUID()}.tmp`;

      try {
        await writeFile(temporary, serializeProject(project), 'utf8');
        await rename(temporary, destination);
      } catch (error) {
        await rm(temporary, { force: true });
        throw new ProjectFileError(destination, 'could not be written.', { cause: error });
      }
    },

    /**
     * Removes a Project — Domain Model §8's "explicit and destructive".
     *
     * Idempotent: deleting a Project that is already gone succeeds. The use
     * case loads before it deletes, so anything missing here lost a race
     * between the two, and the caller's intent — that it not be there — is
     * satisfied either way.
     */
    async delete(id: ProjectId): Promise<void> {
      const filePath = pathFor(id);
      try {
        await rm(filePath, { force: true });
      } catch (error) {
        throw new ProjectFileError(filePath, 'could not be deleted.', { cause: error });
      }
    },
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The failure worth keeping as a `ProjectFileError`'s `cause`.
 *
 * `MalformedProjectFile` is this package's own internal carrier — wrapping
 * it would bury the thing a caller actually wants to see (the `SyntaxError`
 * from a corrupt file) one level deeper than `ProjectFileError` documents.
 * A carrier with nothing underneath it is itself the most specific failure
 * there is, so it stays.
 */
function underlying(error: unknown): unknown {
  if (error instanceof MalformedProjectFile && error.cause !== undefined) return error.cause;
  return error;
}
