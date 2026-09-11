// Flat ESLint config. Covers what the project's own check scripts cannot:
// JavaScript/TypeScript correctness, and the React Hooks rules that matter most
// here — every simulation is a canvas driven by refs and effects, where a stale
// dependency shows up as a demo that quietly stops responding rather than as a
// crash.
//
// Formatting is Prettier's job, not ESLint's, so no stylistic rules live here.

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Third-party design tooling is maintained upstream, outside the site runtime.
    ignores: ['build/**', '.docusaurus/**', 'node_modules/**', 'static/**', '.local/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Browser + React source.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {jsx: true},
      },
    },
    plugins: {'react-hooks': reactHooks},
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Unused arguments are often part of a signature the caller dictates;
      // an underscore prefix marks them as deliberate.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Node scripts and config files.
  {
    files: ['scripts/**/*.mjs', '*.config.{ts,mjs}', 'sidebars.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Tests run under Vitest's globals-free API (explicit imports), so they need
  // no extra environment beyond Node.
  {
    files: ['src/**/*.test.{ts,tsx,js}'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
