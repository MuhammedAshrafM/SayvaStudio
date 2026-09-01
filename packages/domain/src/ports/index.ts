/**
 * The ports Domain declares and Infrastructure implements.
 *
 * Both exist so entity construction stays pure: a factory that called
 * `crypto.randomUUID()` or `new Date()` directly would reach outside the
 * language into the host, which Domain may not do (ADR-002 DR-02), and
 * would be untestable without freezing time (Architecture Blueprint §5).
 */

/**
 * Supplies entity identity.
 *
 * §5 of the Domain Model: "Every entity ID is a client-generated UUID,
 * assigned at creation time inside Studio — never server-assigned, because
 * no server exists in v1."
 */
export interface IdGenerator {
  /** A fresh UUID in canonical 8-4-4-4-12 form. */
  newId(): string;
}

/** Supplies the timestamps `Metadata` records. */
export interface Clock {
  now(): Date;
}
