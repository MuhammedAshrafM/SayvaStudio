// TEMPORARY — Slice 15 deliberate CI-failure test. Forbidden per ADR-002
// DR-02 (domain depends on nothing). Reverted immediately after CI proves
// it fails for this reason.
import '@sayva/application';

/**
 * Entities, Value Objects, Repository interfaces, and Domain Services land
 * here incrementally, starting with Implementation Roadmap Phase 2
 * (Project Management) and continuing through every content-authoring
 * phase. Empty on purpose until then; see docs/architecture/domain-model.md
 * for the full entity catalog this package will eventually implement.
 *
 * Zero dependencies, by design (Architecture Blueprint AD-01, ADR-002
 * DR-02) — nothing beyond the language itself may ever be added here.
 */
export {};
