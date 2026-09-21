import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Infrastructure reads nothing ambient — ADR-003 SR-05 and SR-09.
 *
 * SR-05: "No default, no ambient path, **nothing read from the environment
 * inside the adapter**, no constant compiled into `@sayva/infrastructure`."
 * SR-09 puts the one environment read in the Composition Root and nowhere
 * else.
 *
 * Both are the kind of rule that holds right up until someone adds a
 * convenient fallback, and the failure is silent: an adapter that quietly
 * reads `process.env` still passes every behavioural test in this package,
 * because those tests pass a temporary directory in explicitly. What breaks
 * is the guarantee — that the same adapter can be pointed anywhere by its
 * caller, and that a user's projects never land somewhere nobody chose.
 *
 * So this scans the source rather than exercising behaviour, the same shape
 * as the design system's client-boundary scan. It walks the directory, so a
 * module added later is covered the moment it appears.
 */

const SRC = path.resolve(import.meta.dirname);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!entry.name.endsWith('.ts')) return [];
    if (entry.name.endsWith('.test.ts')) return [];
    return [full];
  });
}

const FILES = sourceFiles(SRC);

/** Every way a module could reach the ambient environment. */
const AMBIENT = [
  ['process.env', /\bprocess\s*\.\s*env\b/],
  ['node:process import', /from\s+['"]node:process['"]/],
  ['bare process import', /from\s+['"]process['"]/],
  ['import.meta.env', /\bimport\s*\.\s*meta\s*\.\s*env\b/],
  ['os.homedir', /\bhomedir\s*\(/],
  ['os.tmpdir', /\btmpdir\s*\(/],
  ['process.cwd', /\bprocess\s*\.\s*cwd\b/],
  ['bare cwd()', /(?<![.\w])cwd\s*\(/],
] as const;

describe('@sayva/infrastructure reads nothing ambient', () => {
  it('has source files to scan', () => {
    // A scan over an empty list is a test that cannot fail.
    expect(FILES.length).toBeGreaterThan(0);
  });

  it.each(AMBIENT)('never reaches for %s', (_label, pattern) => {
    const offenders = FILES.filter((file) => pattern.test(readFileSync(file, 'utf8'))).map((file) =>
      path.relative(SRC, file),
    );

    expect(offenders).toEqual([]);
  });

  it('names the environment variable nowhere', () => {
    // SR-09 gives the variable a name. Knowing that name is the Composition
    // Root's business; a package that never reads the environment has no
    // reason to have heard of it.
    const offenders = FILES.filter((file) =>
      readFileSync(file, 'utf8').includes('SAYVA_WORKSPACE_ROOT'),
    ).map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  it('still takes its root by construction', () => {
    // The positive half: the rule above is only meaningful because the root
    // arrives some other way. If this ever stops being true, the scan above
    // is guarding nothing.
    const repository = readFileSync(
      path.join(SRC, 'project', 'filesystem-project-repository.ts'),
      'utf8',
    );

    expect(repository).toContain('createFilesystemProjectRepository(workspaceRoot: string)');
  });
});
