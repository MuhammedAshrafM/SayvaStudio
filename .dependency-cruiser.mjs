import { nodes, allowedDependencies } from './tooling/dependency-graph.mjs';

/**
 * Enforces ADR-002's package dependency graph via dependency-cruiser,
 * generated from tooling/dependency-graph.mjs (DR-10) — not duplicated
 * here. This is the whole-repo, CI-facing counterpart to ESLint's
 * boundaries rule (Slice 11): different tool, same graph, same edges.
 *
 * Deliberately built from `forbidden` rules, not dependency-cruiser's
 * `allowed` mechanism. `allowed` applies its default-disallow globally
 * to every edge in the scanned graph — external npm packages, Node
 * builtins, tooling packages like @sayva/eslint-config, even .next/
 * build output all got flagged in testing, none of which DR-02 has an
 * opinion about. Boundaries' `elements` naturally scopes to only the
 * six known package types; dependency-cruiser has no equivalent
 * concept, so the same scoping has to be built explicitly: each
 * `forbidden` rule's `from`/`to` patterns only ever match paths inside
 * our six known packages, so anything else — external or internal —
 * simply never matches any rule and passes through untouched, the
 * same as it does for boundaries.
 */
const forbidden = nodes.flatMap(({ type: fromType, path: fromPath }) => {
  const allowedTypes = allowedDependencies[fromType] ?? [];
  const disallowedNodes = nodes.filter(
    (node) => node.type !== fromType && !allowedTypes.includes(node.type),
  );

  if (disallowedNodes.length === 0) {
    return [];
  }

  return [
    {
      name: `no-${fromType}-to-disallowed`,
      severity: 'error',
      comment: `ADR-002 DR-02/DR-03: ${fromType} may not depend on ${disallowedNodes
        .map((node) => node.type)
        .join(', ')}`,
      from: { path: `^${fromPath}/` },
      to: { path: disallowedNodes.map((node) => `^${node.path}/`).join('|') },
    },
  ];
});

export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'A circular dependency between packages would make the DR-02 graph meaningless.',
      from: {},
      to: { circular: true },
    },
    ...forbidden,
  ],
  options: {
    tsPreCompilationDeps: true,
    // `doNotFollow` still resolves the target (so an edge to it is
    // recorded and checked against the rules above) but doesn't
    // recurse into *its* dependencies — the right primitive for both
    // of these, and distinct from `exclude` below, which hides a path
    // entirely. Using `exclude` for `dist` here originally broke
    // detection completely: @sayva/domain resolves to
    // packages/domain/dist/index.js, so excluding `dist` excluded the
    // one thing every cross-package edge actually needs to resolve to.
    doNotFollow: {
      path: '(^|/)(node_modules|dist)(/|$)',
    },
    // True noise only — never a valid resolution target for anything
    // in tooling/dependency-graph.mjs.
    exclude: {
      path: '(^|/)(\\.next|\\.turbo|coverage)(/|$)',
    },
  },
};
