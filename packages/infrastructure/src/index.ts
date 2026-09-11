// The @sayva/pack-schema edge has no real consumer yet — PackExporter
// arrives with Roadmap Phase 11 — so this import stands in for it, proving
// the declared dependency actually resolves and compiles rather than only
// being listed in package.json. The @sayva/domain edge no longer needs one:
// the Project repository below imports it for real.
import '@sayva/pack-schema';

/**
 * `@sayva/infrastructure` — repository implementations and the
 * filesystem/Zip/Id/Clock adapters (Architecture Blueprint §5).
 *
 * Node APIs are used here and nowhere else. ADR-003 SR-01 fixes the storage
 * mechanism as direct Node `fs`, and SR-02 keeps this package server-only:
 * it is reachable through the Composition Root alone (AD-05), never from a
 * Client Component (§6), and never by Application or Domain, which hold the
 * ports and nothing else (AD-01, ADR-002 DR-02/DR-03).
 *
 * Filled in by the phase that needs each adapter. Project arrives with
 * Phase 2; PackExporter with Phase 11.
 */
export { createCryptoIdGenerator } from './crypto-id-generator.js';
export { createSystemClock } from './system-clock.js';

export { createFilesystemProjectRepository } from './project/filesystem-project-repository.js';
export { ProjectFileError } from './project/project-file-error.js';
export { PROJECT_FILE_EXTENSION } from './project/project-file.js';
