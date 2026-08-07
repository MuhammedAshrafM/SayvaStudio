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
 * `import/resolver: { typescript: { alwaysTryTypes: true } }` (DR-14)
 * — deliberately not `eslint-import-resolver-node`. Every package's
 * `exports["."].types` points at its TypeScript source
 * (`./src/index.ts`), not its build output; only `exports["."].default`
 * points at `dist/`. A plain Node resolver only ever follows `default`,
 * so it needs a prior build before it can find a cross-package import
 * at all — meaning it can't classify the import's target type, so this
 * rule never gets the chance to flag it. `eslint-import-resolver-
 * typescript` reads the `types` condition instead, resolving straight
 * to source, so a violation is catchable the moment it's typed —
 * before any build has ever run. Verified: with zero `dist/` anywhere
 * in the workspace, this correctly flagged a deliberately-forbidden
 * import and correctly passed a legitimate one. See DR-14 for the
 * full investigation — this fixes a real gap, not a hypothetical one:
 * the plain Node resolver silently passed every cross-package import,
 * forbidden or not, on a freshly cloned, unbuilt checkout.
 */
export default [
  {
    plugins: { boundaries: boundariesPlugin },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
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
