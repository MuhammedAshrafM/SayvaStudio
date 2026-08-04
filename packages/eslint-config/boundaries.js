import boundariesPlugin from 'eslint-plugin-boundaries';
import { rootPath, nodes, allowedDependencies } from '../../tooling/dependency-graph.mjs';

const elements = nodes.map(({ type, path }) => ({ type, pattern: `${path}/**` }));

const policies = Object.entries(allowedDependencies)
  .filter(([, allowed]) => allowed.length > 0)
  .map(([from, allowed]) => ({
    from: { element: { type: from } },
    allow: { element: { types: allowed } },
  }));

/**
 * Enforces ADR-002's package dependency graph as a real ESLint rule,
 * generated from tooling/dependency-graph.mjs (DR-10) — not duplicated
 * here. `default: 'disallow'` matches DR-03: everything not explicitly
 * listed as allowed is a violation, not an oversight.
 *
 * `import/resolver: { node: { preserveSymlinks: false } }` matters more
 * than it looks. pnpm links workspace packages via symlinks; the
 * resolver's own default preserves them, so a cross-package import
 * resolves to `<consumer>/node_modules/@sayva/<target>/...` — a path
 * that still starts with the *consumer's own* package directory, which
 * silently misclassifies every cross-package import as the importing
 * package's own type instead of the target's. `preserveSymlinks: false`
 * makes it follow the symlink to the real source path before
 * classifying, matching how Node's own module resolution already
 * behaves by default. Without this, boundaries doesn't flag violations
 * incorrectly — it simply never has the chance to, because it never
 * sees the target's real type.
 */
export default [
  {
    plugins: { boundaries: boundariesPlugin },
    settings: {
      'import/resolver': { node: { preserveSymlinks: false } },
      'boundaries/root-path': rootPath,
      'boundaries/elements': elements,
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies,
        },
      ],
    },
  },
];
