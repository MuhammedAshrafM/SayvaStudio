import { describe, expect, it } from 'vitest';
import * as application from './index';

/**
 * The package's public surface.
 *
 * A Phase 0 smoke test until Phase 2 gave it something real to assert. It
 * pinned "exports nothing yet", which was true then and is the thing that
 * changed. What it guards now is the boundary itself: ADR-002 DR-05 makes
 * this barrel the only way in, so an accidental export widens the contract
 * as surely as an accidental import would.
 */
const EXPECTED_SURFACE = [
  'ProjectNotFoundError',
  'createProjectUseCase',
  'deleteProjectUseCase',
  'duplicateProjectUseCase',
  'listProjectsUseCase',
  'openProjectUseCase',
  'saveProjectUseCase',
  'toProjectView',
  'viewProjectListUseCase',
];

describe('@sayva/application public surface', () => {
  it('exports exactly what it means to', () => {
    expect(Object.keys(application).sort()).toEqual(EXPECTED_SURFACE);
  });

  it('resolves its @sayva/domain dependency through the real toolchain', async () => {
    // The one allowed edge (DR-02). Loading proves it resolves through
    // domain's exports map, not by reaching past it.
    await expect(import('@sayva/domain')).resolves.toBeTypeOf('object');
  });
});
