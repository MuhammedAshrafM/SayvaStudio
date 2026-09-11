/**
 * A `.sayva` file that cannot be turned into a Project.
 *
 * Distinct from `DomainError` on purpose. A `DomainError` says a Project is
 * not legal; this says a *file* is not usable — and it names which one,
 * because "Project name is required" is true but tells an author nothing
 * about which of their projects will not open.
 *
 * The underlying failure is always kept as `cause`: a corrupt file carries a
 * `SyntaxError`, an unreadable one carries the `fs` error, and a file whose
 * contents are well-formed but describe something illegal — an empty name, a
 * schema version this build cannot read — carries the `DomainError` itself.
 * Callers that need to tell those apart inspect `cause` rather than parsing
 * this message.
 */
export class ProjectFileError extends Error {
  /** The file this failure is about. Absolute. */
  readonly path: string;

  constructor(filePath: string, reason: string, options?: { cause?: unknown }) {
    super(`Project file "${filePath}" ${reason}`, options);
    this.name = 'ProjectFileError';
    this.path = filePath;
  }
}
