import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors.js';
import { ProjectFileFailure } from './project-repository.js';

/**
 * The repository port's failure contract — ADR-003 SR-10.
 *
 * Small on purpose: it is a shape the rest of the system relies on, so what
 * is tested is exactly that shape.
 */
describe('ProjectFileFailure', () => {
  const where = 'C:/authoring/projects/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva';

  it('is an Error that says where the failure happened', () => {
    const failure = new ProjectFileFailure('could not be read', where);

    expect(failure).toBeInstanceOf(Error);
    expect(failure.location).toBe(where);
    expect(failure.message).toBe('could not be read');
    expect(failure.name).toBe('ProjectFileFailure');
  });

  it('keeps the underlying failure as its cause', () => {
    const cause = new DomainError('Project name is required and must not be empty.');
    expect(new ProjectFileFailure('x', where, { cause }).cause).toBe(cause);
  });

  it('is not a DomainError — a storage failure, not a broken invariant', () => {
    expect(new ProjectFileFailure('x', where)).not.toBeInstanceOf(DomainError);
  });

  it('carries a location and nothing that could be mistaken for a trace ID', () => {
    // SR-10 and SR-11 are separate contracts: where it failed, and which
    // occurrence it was. This type owns only the first.
    const failure = new ProjectFileFailure('x', where);
    // `name` is Error's own identifier, set in the constructor; `location` is
    // the one piece of data the contract adds.
    expect(Object.keys(failure).sort()).toEqual(['location', 'name']);
    expect(failure).not.toHaveProperty('traceId');
  });
});
