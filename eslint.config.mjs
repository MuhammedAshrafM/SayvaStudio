import base from '@sayva/eslint-config/base';

// Covers root-level files that don't belong to any workspace package —
// currently just tooling/. Each package under apps/ and packages/ has its
// own eslint.config.js and is linted independently; this file is not a
// substitute for those and doesn't attempt to lint their contents.
export default [...base];
