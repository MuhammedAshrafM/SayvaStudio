import { describe, expect, it } from 'vitest';
import * as domain from './index';

/**
 * The package's public surface.
 *
 * This began as a Phase 0 smoke test asserting the package exported
 * nothing — which was the truth then, and which its own comment said would
 * be replaced "starting with Phase 2's first Use Case". Phase 2 arrived, so
 * it now pins what the surface actually is: ADR-002 DR-05 makes this barrel
 * the only way in, and an accidental export is as much a boundary change as
 * an accidental import.
 */
const EXPECTED_SURFACE = [
  'CURRENT_PROJECT_SCHEMA_VERSION',
  'DomainError',
  'PROJECT_STATES',
  'PROJECT_TRANSITIONS_BLOCKED',
  'ProjectFileFailure',
  'assertProjectSchemaVersion',
  'createMetadata',
  'createProject',
  'isProjectId',
  'newProjectId',
  'renameProject',
  'restoreMetadata',
  'restoreProject',
  'toProjectId',
  'touchMetadata',
];

describe('@sayva/domain public surface', () => {
  it('exports exactly what it means to', () => {
    expect(Object.keys(domain).sort()).toEqual(EXPECTED_SURFACE);
  });

  it('reaches for nothing beyond the language itself', async () => {
    // DR-02: zero dependencies. The barrel loading at all is the check —
    // a stray `node:` or framework import would fail resolution here.
    await expect(import('./index')).resolves.toBeTypeOf('object');
  });
});
