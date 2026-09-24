import { randomUUID } from 'node:crypto';
import type { FailureTracer } from '@sayva/domain';

/**
 * `FailureTracer` backed by the server process's own diagnostic output —
 * ADR-003 SR-11.
 *
 * Every call mints a fresh UUID for that one occurrence and writes it, with
 * the failure, as a single line to stderr through `console.error`. That line
 * is the record the on-screen Trace ID leads to: someone reading "Trace ID
 * 3f2504e0-…" in the Project Picker can find the same value in the server's
 * output next to the full error — the affected file, the cause, the stack.
 * The line starts with the same "Trace ID" label the interface shows, so a
 * search for what is on screen finds it.
 *
 * Deliberately small. It is not a logging system: no levels, no sinks, no
 * files, no telemetry, no configuration. The process's existing output is
 * the only destination, and nothing here stores the trace ID or reads it
 * back. `randomUUID` is the same technique `createCryptoIdGenerator` uses,
 * but the port is not the same one — an occurrence is not an entity.
 */
export function createConsoleFailureTracer(): FailureTracer {
  return {
    trace(failure) {
      const traceId = randomUUID();
      console.error(`Trace ID ${traceId}`, failure);
      return traceId;
    },
  };
}
