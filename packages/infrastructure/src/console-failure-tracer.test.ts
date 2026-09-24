import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createConsoleFailureTracer } from './console-failure-tracer.js';

/**
 * The failure tracer — ADR-003 SR-11.
 *
 * A trace ID is only a trace if it leads somewhere, so these tests check the
 * pairing as much as the identifier: every value returned must also appear in
 * the diagnostic line written for the same occurrence.
 */

/** Canonical 8-4-4-4-12. Local on purpose: a trace ID is not a ProjectId. */
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let errorSpy: MockInstance<(typeof console)['error']>;

beforeEach(() => {
  // Captured rather than printed: the line is what is under test.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('createConsoleFailureTracer — the trace ID', () => {
  it('is a canonical UUID', () => {
    expect(createConsoleFailureTracer().trace(new Error('x'))).toMatch(CANONICAL_UUID);
  });

  it('is distinct for every occurrence', () => {
    const tracer = createConsoleFailureTracer();
    const ids = new Set(Array.from({ length: 1000 }, () => tracer.trace(new Error('x'))));
    expect(ids.size).toBe(1000);
  });

  it('identifies the occurrence, not the kind of failure', () => {
    // The same failure, twice, is two occurrences. A category code would
    // return the same value both times — which is exactly what SR-11 rejected.
    const tracer = createConsoleFailureTracer();
    const failure = new Error('Project file "C:/p/a.sayva" not valid JSON.');

    expect(tracer.trace(failure)).not.toBe(tracer.trace(failure));
  });

  it('is never the file path the failure names', () => {
    const where = 'C:/authoring/projects/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva';
    const failure = Object.assign(new Error(`Project file "${where}" could not be read.`), {
      path: where,
    });

    const traceId = createConsoleFailureTracer().trace(failure);

    expect(traceId).not.toBe(where);
    expect(where).not.toContain(traceId);
    expect(traceId).toMatch(CANONICAL_UUID);
  });

  it("is never the framework's error digest", () => {
    const failure = Object.assign(new Error('boom'), { digest: '2102856004' });

    const traceId = createConsoleFailureTracer().trace(failure);

    expect(traceId).not.toBe('2102856004');
    expect(traceId).toMatch(CANONICAL_UUID);
  });
});

describe('createConsoleFailureTracer — the record it leads to', () => {
  it('writes exactly one diagnostic line per occurrence', () => {
    const tracer = createConsoleFailureTracer();
    tracer.trace(new Error('one'));
    tracer.trace(new Error('two'));

    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('puts the returned trace ID in that line, under the label the interface shows', () => {
    const traceId = createConsoleFailureTracer().trace(new Error('boom'));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toBe(`Trace ID ${traceId}`);
  });

  it('records the failure itself next to it, so the detail is findable', () => {
    const failure = new Error('Project file "C:/p/a.sayva" not valid JSON.');
    createConsoleFailureTracer().trace(failure);

    expect(errorSpy.mock.calls[0]?.[1]).toBe(failure);
  });
});

describe('createConsoleFailureTracer — what it cannot do', () => {
  const source = readFileSync(path.join(import.meta.dirname, 'console-failure-tracer.ts'), 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);

  it('persists nothing — it has no way to reach a file', () => {
    // SR-11: the trace ID lives in the page state and one diagnostic line,
    // never in a store. A module that imports no filesystem API cannot write
    // one.
    expect(imports.sort()).toEqual(['@sayva/domain', 'node:crypto']);
  });

  it('never reads a framework digest off the failure', () => {
    expect(source).not.toMatch(/\.digest\b/);
  });
});
