/**
 * The single source of truth for Sayva Studio's package dependency graph
 * (ADR-002 DR-10). ESLint's boundaries config reads this file directly;
 * dependency-cruiser will too, once it's wired in a later slice. Neither
 * encodes the graph on its own — this file does, once.
 *
 * Do not add or change an edge here without a corresponding ADR-002
 * amendment (DR-11). This file makes an already-approved graph
 * enforceable — it is not where the graph itself gets decided.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This file lives at the workspace root, so its own directory *is* the
// root every consumer needs to resolve package paths against — computed
// once here rather than hardcoded or re-derived by each consumer.
export const rootPath = path.dirname(fileURLToPath(import.meta.url));

export const nodes = [
  { type: 'domain', path: 'packages/domain' },
  { type: 'pack-schema', path: 'packages/pack-schema' },
  { type: 'design-system', path: 'packages/design-system' },
  { type: 'application', path: 'packages/application' },
  { type: 'infrastructure', path: 'packages/infrastructure' },
  { type: 'studio', path: 'apps/studio' },
];

/**
 * type -> the types it may depend on. Matches ADR-002 DR-02's table
 * exactly. An empty array means "depends on nothing in this workspace."
 *
 * @type {Record<string, string[]>}
 */
export const allowedDependencies = {
  domain: [],
  'pack-schema': [],
  'design-system': [],
  application: ['domain'],
  infrastructure: ['domain', 'pack-schema'],
  studio: ['application', 'infrastructure', 'design-system'],
};
