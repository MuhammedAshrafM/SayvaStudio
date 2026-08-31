import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { render } from '@testing-library/react';
import { cn } from './cn.js';

/**
 * The guard against silently unreachable classes.
 *
 * `cva` composes its base and its variants by concatenation, not resolution.
 * When a base and a variant set the same CSS property — `text-text-primary`
 * in the base, `text-status-danger-fg` in the `error` variant — both survive
 * into the class attribute, and which one paints is decided by the order
 * Tailwind happened to emit its utilities in, not by the variant. The result
 * is a variant that is declared, tested for its presence in the class string,
 * and never visible. `SyStateBlock`'s error heading spent Slices 7 to 10
 * rendering in text.primary for exactly this reason.
 *
 * `cn` resolves it — that is what tailwind-merge is for — so the defect is
 * not "a collision exists" but "a collision reached the DOM unresolved".
 * That is what the first test checks, and it checks the rendered DOM rather
 * than the source, so it is blind to how a class list was assembled: cva,
 * a hand-written string, a caller's `className`, or anything added later.
 */

/*
 * `src/__fixtures__` is excluded deliberately. `story-args.typecheck.test.ts`
 * writes a story file there and deletes it again, and an eager glob resolves
 * to static imports at transform time — a transient file inside the pattern
 * would be imported by this suite whether or not it still exists.
 */
const storyModules = import.meta.glob(['../**/*.stories.tsx', '!../__fixtures__/**'], {
  eager: true,
}) as Record<string, Record<string, unknown>>;

/** Every story file this package ships, by name. */
const EXPECTED_STORY_FILES = [
  'button.stories.tsx',
  'confidence.stories.tsx',
  'drawer.stories.tsx',
  'entity-ref.stories.tsx',
  'field.stories.tsx',
  'menu.stories.tsx',
  'metric.stories.tsx',
  'preview-harness.stories.tsx',
  'state-block.stories.tsx',
  'status-badge.stories.tsx',
];

/** Whitespace is not meaningful in a class attribute; ordering is. */
const normalise = (value: string) => value.split(/\s+/).filter(Boolean).join(' ');

describe('no element reaches the DOM with classes Tailwind would make unreachable', () => {
  // A glob that matched nothing would make every assertion below vacuous, and
  // naming the files means a deleted story file fails here rather than
  // quietly shrinking the sweep.
  it('found every story module', () => {
    const found = Object.keys(storyModules)
      .map((path) => path.split('/').pop())
      .sort();
    expect(found).toEqual(EXPECTED_STORY_FILES);
  });

  const cases = Object.entries(storyModules).flatMap(([path, module]) =>
    Object.entries(composeStories(module as never)).map(
      ([name, Story]) => [`${path.split('/').pop()} → ${name}`, Story] as const,
    ),
  );

  it('has stories to check', () => {
    expect(cases.length).toBeGreaterThan(80);
  });

  it.each(cases)('%s', (_label, Story) => {
    const { container } = render(<Story />);

    for (const element of container.querySelectorAll<HTMLElement>('[class]')) {
      const raw = normalise(element.getAttribute('class') ?? '');
      const resolved = normalise(cn(raw));

      if (raw === resolved) continue;

      const dropped = raw.split(' ').filter((c) => !resolved.split(' ').includes(c));
      throw new Error(
        `<${element.tagName.toLowerCase()}> carries classes that cannot all apply.\n` +
          `  rendered: ${raw}\n` +
          `  reachable: ${resolved}\n` +
          `  unreachable: ${dropped.join(', ')}\n` +
          `  Route the class list through cn() so the later value wins on purpose.`,
      );
    }
  });
});

/**
 * The same defect caught at the source, so a variant combination no story
 * happens to render is covered too.
 */
describe('every cva result reaching a className goes through cn()', () => {
  const sources = Object.keys(
    import.meta.glob(['../**/*.tsx', '!../__fixtures__/**'], { eager: false }),
  ).filter((path) => !path.includes('.test.') && !path.includes('.stories.'));

  it('found the component sources', () => {
    expect(sources.length).toBeGreaterThanOrEqual(7);
  });

  it.each(sources)('%s', (path) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');

    // `className={someVariants(...)}` — a cva result used raw. The safe form
    // is `className={cn(someVariants(...), ...)}`.
    const bypasses = [...source.matchAll(/className=\{\s*([A-Za-z0-9_]*[Vv]ariants)\(/g)].map(
      (match) => match[1],
    );

    expect(bypasses, `${path} uses a cva result as a className without cn()`).toEqual([]);
  });
});
