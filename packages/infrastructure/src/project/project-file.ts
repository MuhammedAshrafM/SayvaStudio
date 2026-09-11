import {
  assertProjectSchemaVersion,
  restoreProject,
  CURRENT_PROJECT_SCHEMA_VERSION,
  type Project,
} from '@sayva/domain';

/**
 * The `.sayva` file — ADR-003 SR-03.
 *
 * One Project, one UTF-8 JSON file. The fields are exactly the ones Domain
 * needs to reconstitute a Project through `restoreProject`, with `Date`
 * values as ISO 8601 strings because JSON has no date type. No envelope, no
 * wrapper, nothing else: SR-03 forbids inventing structure the Domain and
 * Application contracts do not already require.
 *
 * `createdBy` is deliberately absent. Domain Model §4 calls it "a reserved
 * no-op in v1 — no auth yet" and `restoreMetadata` does not accept it, so
 * writing it would produce a field nothing can read back.
 *
 * Everything here treats the file as untrusted input. That split is
 * Architecture Blueprint §6's — shape is checked at this boundary, truth is
 * checked by Domain — so this module decides only whether the JSON has the
 * right fields of the right primitive types, and lets `restoreProject`
 * decide whether what they contain is a legal Project.
 */

/** The on-disk shape. Serialized key order is presentational only. */
export type ProjectFile = {
  schemaVersion: number;
  id: string;
  name: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notes?: string;
};

/** The extension that marks a file as a Project. */
export const PROJECT_FILE_EXTENSION = '.sayva';

/**
 * A Project as it is written to disk.
 *
 * `schemaVersion` is the current build's, never the value the Project was
 * loaded with: this build is the one doing the writing. It is emitted first
 * so the compatibility gate sits at the top of the file — cosmetic, since
 * JSON object key order carries no meaning.
 */
export function serializeProject(project: Project): string {
  const file: ProjectFile = {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    id: project.id,
    name: project.name,
    state: project.state,
    createdAt: project.metadata.createdAt.toISOString(),
    updatedAt: project.metadata.updatedAt.toISOString(),
    tags: [...project.metadata.tags],
    ...(project.metadata.notes === undefined ? {} : { notes: project.metadata.notes }),
  };
  // Trailing newline: this is a text file an author may well open.
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * Thrown for a file that is not a readable `.sayva` document at all.
 *
 * Internal to this package — it never reaches a caller, because the
 * repository turns it into a `ProjectFileError` that can name the file. It
 * is exported only so the repository can recognise it and unwrap the real
 * underlying failure instead of nesting two wrappers around it.
 */
export class MalformedProjectFile extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MalformedProjectFile';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new MalformedProjectFile(`"${field}" must be a string, but was ${describe(value)}.`);
  }
  return value;
}

function describe(value: unknown): string {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

/**
 * Parses the contents of a `.sayva` file into a Project.
 *
 * The order is SR-07's and is not incidental: the schema version is read and
 * gated *before* any other field is examined. A file from a newer build may
 * carry a state or a field shape that only looks wrong from here, and
 * reporting it as malformed would name the wrong problem.
 *
 * Throws `MalformedProjectFile` when the bytes are not a readable document,
 * and lets Domain's own `DomainError` through when they are readable but
 * describe something that is not a legal Project. The caller wraps both.
 */
export function deserializeProject(contents: string): Project {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (cause) {
    throw new MalformedProjectFile('not valid JSON.', { cause });
  }

  if (!isRecord(parsed)) {
    throw new MalformedProjectFile(`expected a JSON object, but found ${describe(parsed)}.`);
  }

  const schemaVersion = parsed['schemaVersion'];
  if (typeof schemaVersion !== 'number') {
    throw new MalformedProjectFile(
      `"schemaVersion" must be a number, but was ${describe(schemaVersion)}.`,
    );
  }
  // Domain owns the rule; this boundary only got the value into a shape the
  // rule can be asked about. Throws DomainError for a newer version.
  assertProjectSchemaVersion(schemaVersion);

  const tags = parsed['tags'];
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    throw new MalformedProjectFile(
      `"tags" must be an array of strings, but was ${describe(tags)}.`,
    );
  }

  const notes = parsed['notes'];
  if (notes !== undefined && typeof notes !== 'string') {
    throw new MalformedProjectFile(
      `"notes" must be a string when present, but was ${describe(notes)}.`,
    );
  }

  return restoreProject({
    id: requireString(parsed, 'id'),
    name: requireString(parsed, 'name'),
    schemaVersion,
    // `restoreProject` rejects a state it does not know; this boundary only
    // guarantees it is a string, so the cast hands Domain the check rather
    // than making it here.
    state: requireString(parsed, 'state') as Parameters<typeof restoreProject>[0]['state'],
    createdAt: new Date(requireString(parsed, 'createdAt')),
    updatedAt: new Date(requireString(parsed, 'updatedAt')),
    tags: tags as string[],
    ...(notes === undefined ? {} : { notes }),
  });
}
