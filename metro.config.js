const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some dependencies (zustand's `exports` map, among others) publish an ESM
// build under the "import" condition that references `import.meta` — safe
// inside a real ES module, but the web static export bundles everything
// into one classic (non-module) <script>, where `import.meta` is a hard
// SyntaxError that crashes the whole bundle before any code runs (surfaced
// live as the app staying stuck on its initial loading spinner forever).
// Dropping "import" from the condition list makes Metro resolve every
// package's plain CJS build instead, which has no such restriction.
config.resolver.unstable_conditionNames = ['require', 'react-native', 'default'];

module.exports = config;
