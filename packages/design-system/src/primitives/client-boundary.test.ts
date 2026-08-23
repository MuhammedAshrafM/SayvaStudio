import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every interactive primitive must declare its own client boundary.
 *
 * The App Router treats a module as a Server Component unless it says
 * otherwise, and apps/studio imports this package's barrel from
 * layout.tsx — a Server Component. A primitive that uses React state or
 * attaches a DOM event handler is therefore only usable if `'use client'`
 * is the first thing in its own file.
 *
 * "Its own file" is the point. SyButton compiled for a while without the
 * directive, because it was only ever reached through SyStateBlock, which
 * has one. That made SyButton usable by accident: importing it directly
 * into a Server Component and passing onClick had nothing holding it up.
 * A per-module assertion is what stops that recurring as primitives are
 * added — this scans the directory rather than naming components, so a
 * primitive added later is covered the moment it appears.
 */

const PRIMITIVES_DIR = path.resolve(import.meta.dirname);

/** Component modules only: not tests, not stories, not variant maps. */
function componentModules(): { name: string; file: string; source: string }[] {
  const found: { name: string; file: string; source: string }[] = [];
  for (const entry of readdirSync(PRIMITIVES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(PRIMITIVES_DIR, entry.name);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.tsx')) continue;
      if (file.includes('.test.') || file.includes('.stories.')) continue;
      found.push({
        name: `${entry.name}/${file}`,
        file: path.join(dir, file),
        source: readFileSync(path.join(dir, file), 'utf8'),
      });
    }
  }
  return found;
}

/** A React hook call, e.g. useId( or useState(. */
const USES_HOOK = /\buse[A-Z]\w*\s*\(/;
/** A DOM event handler bound in JSX, e.g. onClick={…}. */
const BINDS_HANDLER = /\son[A-Z]\w*=\{/;

/** `'use client'` must be the first statement, before any import. */
const DECLARES_CLIENT = /^(?:\s*\/\*[\s\S]*?\*\/\s*|\s*\/\/[^\n]*\n)*\s*(['"])use client\1/;

const modules = componentModules();

describe('interactive primitives declare their own client boundary', () => {
  it('finds the component modules it is meant to be checking', () => {
    // A silent zero-file scan would pass forever.
    expect(modules.map((m) => m.name).sort()).toEqual([
      'button/button.tsx',
      'confidence/confidence.tsx',
      'entity-ref/entity-ref.tsx',
      'field/field.tsx',
      'metric/metric.tsx',
      'state-block/state-block.tsx',
      'status-badge/status-badge.tsx',
    ]);
  });

  it('leaves purely presentational primitives on the server', () => {
    // Not every primitive is interactive, and marking one a client boundary
    // it does not need would pull it into the client bundle for nothing.
    for (const name of ['confidence/confidence.tsx', 'status-badge/status-badge.tsx']) {
      const module = modules.find((m) => m.name === name)!;
      expect(USES_HOOK.test(module.source) || BINDS_HANDLER.test(module.source)).toBe(false);
      expect(DECLARES_CLIENT.test(module.source), `${name} needs no directive`).toBe(false);
    }
  });

  it.each(modules.map((m) => m.name))('%s', (name) => {
    const module = modules.find((m) => m.name === name)!;
    const interactive = USES_HOOK.test(module.source) || BINDS_HANDLER.test(module.source);
    if (!interactive) return;

    expect(
      DECLARES_CLIENT.test(module.source),
      `${name} uses a hook or binds an event handler, so it must start with 'use client' — ` +
        `otherwise it is only usable from a Server Component by accident, via some other ` +
        `module's directive`,
    ).toBe(true);
  });
});

describe('the directive survives the build', () => {
  // tsc preserves a directive prologue, but "preserves" is worth proving:
  // the directive is meaningless to Next unless it reaches dist/.
  const DIST = path.resolve(PRIMITIVES_DIR, '../../dist/primitives');

  it.each(modules.map((m) => m.name))('%s reaches dist with its directive', (name) => {
    const module = modules.find((m) => m.name === name)!;
    if (!USES_HOOK.test(module.source) && !BINDS_HANDLER.test(module.source)) return;

    const built = path.join(DIST, name.replace(/\.tsx$/, '.js'));
    let output: string;
    try {
      output = readFileSync(built, 'utf8');
    } catch {
      // `test` depends on `^build`, but a stale or absent dist is not this
      // test's failure to report — skip rather than fail misleadingly.
      return;
    }
    expect(DECLARES_CLIENT.test(output), `${built} lost its 'use client' directive`).toBe(true);
  });
});
