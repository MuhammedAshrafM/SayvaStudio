// Proves the domain dependency edge actually resolves and compiles —
// not just declared in package.json. Remove once a real Use Case needs it.
import '@sayva/domain';

/**
 * Use Cases and Request/Response Models land here incrementally, starting
 * with Implementation Roadmap Phase 2 (Project Management). Empty on
 * purpose until then; see docs/architecture/architecture-blueprint.md §4.
 *
 * Depends on @sayva/domain only (Architecture Blueprint AD-01/AD-02,
 * ADR-002 DR-02) — never Infrastructure, never a framework.
 */
export {};
