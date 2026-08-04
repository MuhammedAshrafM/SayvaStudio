# tooling/

## `dependency-graph.mjs`

The single source of truth for Sayva Studio's package dependency graph (ADR-002 DR-10). `packages/eslint-config/boundaries.js` and the root `.dependency-cruiser.mjs` both read it directly. Neither file should ever redefine an edge — only translate this one file's data into its own tool's config shape.

Two tools enforcing the same graph is deliberate (ADR-002's layered enforcement), not redundant: boundaries catches a violation at edit-time, per package; dependency-cruiser catches it whole-repo, including transitive edges and circular dependencies neither tool's per-file view would otherwise show. Both read the same data, so they can't drift apart on _what_ the graph is — only differ in _when_ and _how broadly_ they check it.

## Adding a new package to the graph

1. **Decide its allowed dependencies first — this is an architectural decision, not a graph edit.** A new package or a new allowed edge requires an ADR-002 amendment (DR-11), the same review and approval every other edge in this graph already went through. Don't skip straight to step 2 because it's easy to.
2. Once approved, add exactly one entry to `nodes` (`{ type, path }`) and exactly one entry to `allowedDependencies` (an array — empty if the package depends on nothing in this workspace) in `tooling/dependency-graph.mjs`.
3. **That's the entire graph change.** Nothing else needs editing. `boundaries.js` derives `elements` and `policies` from this file automatically; every package's `eslint.config.js` imports that same `boundaries.js` — so the new package's allowed edges are enforced everywhere the moment the graph updates, with zero other files touched. See the verification note below — this isn't an assumption, it's been tested.
4. The new package still needs its own ordinary scaffolding, same as every package in Slices 5–7: a `package.json` depending on `@sayva/eslint-config` and `eslint`, its own `eslint.config.js` (identical 3-line pattern: `import base/react` + `import boundaries` + `export default [...base, ...boundaries]`), and a `lint` script. That's package setup, not graph maintenance — it doesn't touch the graph itself, and skipping it just means the package has no lint config, not that the graph is wrong.
5. Verify the same way Slice 11 did: run `pnpm run lint` inside the new package, and inside any package now allowed to depend on it. Then deliberately add a forbidden import and confirm it's caught, the same real-`git commit` test used throughout this phase — a config that looks right isn't the same as one that's been shown to fail correctly.

## Why this file lives outside every package

`tooling/dependency-graph.mjs` isn't a workspace package and isn't part of the graph it describes — it can't be, the same way a map isn't a location on itself. `packages/eslint-config` importing it via a relative path (`../../tooling/dependency-graph.mjs`) is intentional, not a boundary violation: this directory is shared root-level configuration, exempt from the package dependency rules the same way `tsconfig.json` and `turbo.json` are.
