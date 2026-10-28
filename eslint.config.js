// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Deno code (npm:/jsr: specifiers) is linted by `deno lint`, not the app's ESLint.
    ignores: ['dist/*', 'supabase/functions/scan-trip/*'],
  },
]);
