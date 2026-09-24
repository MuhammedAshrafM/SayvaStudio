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

/**
 * Turns one occurrence of a failure into a trace ID — ADR-003 SR-11.
 *
 * `trace` does two things and they belong together. It mints an identifier
 * for *this* occurrence, and it records that identifier alongside the
 * failure's details somewhere an operator can find it. The pairing is the
 * whole point: a trace ID shown on screen is only a trace if it leads to a
 * record. Without the record it would be a random string under a "Trace ID"
 * label, which is the mislabelling SR-11 exists to avoid.
 *
 * Declared here although Domain never calls it: Architecture Blueprint §5
 * has every Infrastructure adapter implement "an interface Domain declares",
 * and ADR-002 DR-02 leaves Domain the only layer that both Application, the
 * caller, and Infrastructure, the implementer, can see.
 *
 * Deliberately not `IdGenerator`. That port supplies *entity* identity
 * (Domain Model §5); an occurrence of a failure is not an entity.
 */
export interface FailureTracer {
  /** Records this occurrence of `failure` and returns its trace ID. */
  trace(failure: unknown): string;
}
