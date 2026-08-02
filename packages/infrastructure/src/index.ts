// Proves both dependency edges actually resolve and compile — not just
// declared in package.json. Remove once a real adapter needs them.
import '@sayva/domain';
import '@sayva/pack-schema';

/**
 * Repository implementations and the filesystem/Zip/Id/Clock adapters land
 * here incrementally, starting with Implementation Roadmap Phase 2
 * (Project Management). PackExporter arrives with Phase 11 (Pack Builder).
 * Empty on purpose until then; see
 * docs/architecture/architecture-blueprint.md §5.
 *
 * Depends on @sayva/domain (to implement its interfaces) and
 * @sayva/pack-schema (to implement PackExporter) — never @sayva/application
 * (Architecture Blueprint AD-01, ADR-002 DR-02/DR-03).
 */
export {};
