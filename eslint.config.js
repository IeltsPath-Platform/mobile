// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Build output and generated diagnostics are not source.
    ignores: ['dist/*', '.expo/**', '.expo-*/**'],
  },
  {
    // vitest hoists vi.mock() above the imports, so tests put imports after their mocks on purpose.
    files: ['tests/**'],
    rules: { 'import/first': 'off' },
  },
  {
    // These rules come from the React Compiler ruleset, but the project does not use React Compiler. The code they
    // flag (refs read in render, state synced from effects) runs correctly, so they are reported without failing lint.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]);
