import { describe, expect, it } from 'vitest';
import * as application from './index';

/**
 * A smoke test, not a unit test: @sayva/application has no implementation
 * yet (Phase 0 scope — see index.ts). What's actually under test here is
 * the infrastructure — index.ts imports '@sayva/domain' at module scope,
 * so loading this module under Vitest exercises real cross-package
 * resolution through @sayva/domain's package.json exports map (DR-05),
 * the same edge ESLint boundaries and dependency-cruiser already verify
 * statically. This is why it needs @sayva/domain built first — turbo.json's
 * `test` task declares `dependsOn: ["^build"]` for exactly this reason
 * (TD-02, resolved Slice 14). Real behavior gets real tests starting with
 * Phase 2's first Use Case.
 */
describe('@sayva/application entry module', () => {
  it('loads without throwing, resolving its @sayva/domain import, and exports nothing yet', () => {
    expect(application).toBeTypeOf('object');
    expect(Object.keys(application)).toEqual([]);
  });
});
