/**
 * The one error type Domain raises.
 *
 * Domain enforces truth unconditionally, inside entity factories and
 * services, "regardless of what any form allowed through" (Architecture
 * Blueprint §6). A violated invariant is therefore thrown, not returned:
 * there is no state in which an invalid entity exists to be inspected.
 *
 * Plain `Error`, because Domain may depend on nothing beyond the language
 * itself (ADR-002 DR-02).
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
