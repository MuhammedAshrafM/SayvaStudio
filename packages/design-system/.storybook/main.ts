import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Storybook is colocated inside @sayva/design-system on purpose. A separate
 * preview package would be a new node in ADR-002's dependency graph, and
 * DR-11 makes a new node an ADR amendment — for a tool, not an architecture
 * change. Stories living next to the components they document avoids that
 * entirely.
 *
 * The Vite builder is deliberately independent of Next.js, so the preview
 * surface carries none of TD-01's TypeScript pinning risk.
 */
const config: StorybookConfig = {
  /*
   * Two positive globs rather than one recursive one, so `src/__fixtures__`
   * cannot be matched.
   *
   * `story-args.typecheck.test.ts` writes a story file there to prove the
   * type checker rejects invented props, then deletes it. It has to be a real
   * `.stories.tsx` under `src/`, because that is the exact shape the build
   * project used to exclude and so the shape a regression would take. A
   * fixture still on disk — a crashed run, or a task running alongside the
   * tests — would otherwise be published as a story. Storybook does not
   * honour `!` negation in this array, which was measured rather than
   * assumed, so the patterns are narrowed instead.
   *
   * These two cover where stories actually live: the preview harness at the
   * root of `src`, and one file per primitive. The class-collision suite
   * asserts the resulting set by name, so a story file added somewhere else
   * fails there rather than going unnoticed here.
   */
  stories: ['../src/*.stories.@(ts|tsx)', '../src/primitives/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    // A build task should not make outbound network calls. Storybook's
    // telemetry is anonymous and opt-out; opting out keeps `build-storybook`
    // hermetic, which matters more once it runs in CI.
    disableTelemetry: true,
  },
  // The token layer arrives as an `@import 'tailwindcss'` in
  // src/styles/index.css, so the builder needs Tailwind's Vite plugin to
  // turn it into anything. Without this the preview renders unstyled and
  // every token check in it is meaningless.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
  }),
};

export default config;
