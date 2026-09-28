import { describe, expect, it } from 'vitest';
import { ProjectFileFailure } from '@sayva/domain';
import { ProjectFileError } from './project-file-error.js';

/**
 * ProjectFileError realises the Domain-side failure contract — ADR-003 SR-10.
 *
 * This is the seam the Project Picker's error state depends on: Application
 * recognises a `ProjectFileFailure` and reads its `location`, without ever
 * importing this package. If this stopped being true, every read failure
 * would stop reaching the screen as a file failure.
 */
describe('ProjectFileError', () => {
  const where = 'C:/authoring/projects/3f2504e0-4f89-41d3-9a0c-0305e82c3301.sayva';

  it('is a ProjectFileFailure', () => {
    expect(new ProjectFileError(where, 'is not valid JSON.')).toBeInstanceOf(ProjectFileFailure);
  });

  it('exposes its path as the contract’s location', () => {
    const error = new ProjectFileError(where, 'is not valid JSON.');
    expect(error.location).toBe(where);
    expect(error.path).toBe(where);
  });

  it('keeps its own name and message', () => {
    const error = new ProjectFileError(where, 'is not valid JSON.');
    expect(error.name).toBe('ProjectFileError');
    expect(error.message).toBe(`Project file "${where}" is not valid JSON.`);
  });
});
