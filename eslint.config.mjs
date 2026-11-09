import pluginCypress from 'eslint-plugin-cypress'
import globals from 'globals'

export default [
  { ignores: ['app/**', 'node_modules/**', 'reports/**', 'instrumented/**', 'mutants/**', 'coverage/**', 'tools/doc/node_modules/**'] },
  pluginCypress.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser, ...globals.mocha, chai: 'readonly' } },
    rules: { 'cypress/no-unnecessary-waiting': 'warn',
      // chaining assertions after actions is fine for static DOM; kept visible as warnings (re-render-prone todo specs re-query instead)
      'cypress/unsafe-to-chain-command': 'warn', 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] },
  },
  { files: ['cypress.config.js', 'cypress/plugins/**', 'tools/**'], languageOptions: { sourceType: 'commonjs' } },
]
