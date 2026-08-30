import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Story files must be type-checked.
 *
 * `tsconfig.json` is the build project: it emits to `dist`, so it excludes
 * stories to keep them out of the published output. `check-types` reused it,
 * which meant no story file was ever seen by TypeScript. `SyField`'s Focus
 * story set `autoFocus` — a prop no field accepts — and compiled cleanly,
 * because it was never compiled at all. React dropped the unknown prop, and
 * the story called Focus rendered an ordinary filled field.
 *
 * This asserts the guard rather than the configuration: it puts a story with
 * an invented prop on disk and requires the type checker to reject it, then
 * puts the same story on disk without that prop and requires it to pass. The
 * second half is what makes the first half evidence — without it, a fixture
 * broken for any other reason would look like success.
 */

const PKG = path.resolve(import.meta.dirname, '..');
const TSC = path.join(PKG, 'node_modules', 'typescript', 'bin', 'tsc');
/*
 * Under `src/`, because that is where the build project's exclusion applied
 * and so where a regression would reappear — but in `__fixtures__`, which the
 * class-collision suite's globs skip, so a file that exists only for the
 * duration of one test never lands in another suite's static import graph.
 */
const FIXTURE_DIR = path.join(PKG, 'src', '__fixtures__');
const FIXTURE = path.join(FIXTURE_DIR, 'story-args.stories.tsx');

const fixture = (args: string) => `import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyField } from '../primitives/field/field.js';

const meta = {
  title: 'Fixture/SyField',
  component: SyField,
} satisfies Meta<typeof SyField>;

export default meta;

type Story = StoryObj<typeof SyField>;

export const Fixture: Story = { args: { ${args} } };
`;

/**
 * Runs whatever `check-types` actually is, rather than a reimplementation of
 * it. Invoking `tsc` directly here would leave the wiring untested: pointing
 * the script back at the build project would restore the original hole and
 * every assertion below would still pass.
 */
function checkTypes() {
  const manifest = JSON.parse(readFileSync(path.join(PKG, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const [binary, ...args] = manifest.scripts['check-types']!.split(/\s+/);

  expect(binary, 'check-types is expected to be a tsc invocation').toBe('tsc');

  try {
    execFileSync(process.execPath, [TSC, ...args], {
      cwd: PKG,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { failed: false, output: '' };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { failed: true, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

function withFixture<T>(args: string, run: () => T): T {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(FIXTURE, fixture(args), 'utf8');
  try {
    return run();
  } finally {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  }
}

describe('story args are type-checked', () => {
  it('rejects a prop the component does not have', { timeout: 120_000 }, () => {
    const { failed, output } = withFixture(
      `label: 'Gloss', value: 'X', autoFocus: true`,
      checkTypes,
    );

    expect(failed, 'a story may not invent props').toBe(true);
    expect(output).toContain('story-args.stories.tsx');
    expect(output).toContain('autoFocus');
    // TS2353 is "object literal may only specify known properties", so the
    // failure is the invented prop rather than an unrelated broken fixture.
    expect(output).toContain('TS2353');
  });

  it('accepts the same story once the invented prop is gone', { timeout: 120_000 }, () => {
    const { failed, output } = withFixture(`label: 'Gloss', value: 'X'`, checkTypes);

    expect(failed, output).toBe(false);
  });
});
