import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Newer eslint-plugin-react-hooks turns this on as an error; it flags
      // pre-existing prop->state sync effects in App.jsx. Keep it visible as a
      // warning (doesn't block CI) until those effects are refactored.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Node-context files: build/test config and the Vitest test suite.
    files: ['vitest.config.js', 'test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
