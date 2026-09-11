import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@sayva/domain';

/**
 * `IdGenerator` backed by the platform's cryptographic RNG — Architecture
 * Blueprint §5: "UUID generation, abstracted so Domain factories never call
 * `crypto` directly — keeps entity construction pure and testable".
 *
 * This module is the one place in the workspace that calls `randomUUID`,
 * which is the entire point of the port: Domain may not reach outside the
 * language into the host (ADR-002 DR-02), and a factory that minted its own
 * ids could not be tested without stubbing a global.
 *
 * Client-generated, per Domain Model §5 — "never server-assigned, because no
 * server exists in v1". No version is pinned: §5 says "UUID" and stops
 * there, the same reason `ProjectId` accepts any canonical 8-4-4-4-12 form
 * rather than requiring a v4 nibble.
 */
export function createCryptoIdGenerator(): IdGenerator {
  return {
    newId: () => randomUUID(),
  };
}
