/**
 * Architecture-as-code — the L-GEVITY E gate.
 *
 * "Can architectural rules be encoded as checks?" A boundary described in a
 * document is advice; a boundary in CI is a boundary. This file is the §4 table
 * of IP-unified-architecture.md, executable.
 *
 * SCOPE. `packages/` and `test/` are linted. `src/script.js` (64,714 lines),
 * `tools/`, `scripts/` and `dashboard/` are pre-migration code — linting them
 * now would produce thousands of findings that say nothing about the
 * architecture and would train everyone to ignore the output. They join as
 * Phase 8 extracts.
 *
 * `packages/research` and `packages/analysis` are exempt by policy (§2e, §2f):
 * frozen one-offs and Python respectively.
 */
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

export default [
  {
    // Everything outside packages/ is pre-migration; see SCOPE above.
    ignores: [
      'node_modules/**', 'dist/**', '.parcel-cache/**',
      'src/**', 'tools/**', 'scripts/**', 'dashboard/**', 'public/**',
      'data/**', 'docs/**', 'web-bundles/**',
      'packages/research/**', 'packages/analysis/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['packages/**/*.js', 'packages/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        // Type information — required by no-floating-promises, and the reason
        // jsconfig.json exists at all (§13.2).
        projectService: { allowDefaultProject: ['*.js', '*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
      import: importPlugin,
      jsdoc,
      '@typescript-eslint': tseslint.plugin,
    },
    settings: {
      'boundaries/elements': [
        { type: 'physics',   pattern: 'packages/physics/*' },
        { type: 'fixtures',  pattern: 'packages/fixtures/*' },
        { type: 'data',      pattern: 'packages/data/*' },
        { type: 'fitting',   pattern: 'packages/fitting/*' },
        { type: 'adapter',   pattern: 'packages/(api|mcp|render)/*', capture: ['name'] },
        { type: 'app',       pattern: 'packages/(simulator|dashboard)/*', capture: ['name'] },
      ],
      'boundaries/include': ['packages/**/*.js', 'packages/**/*.mjs'],
    },
    rules: {
      /* ── §2b dependency rules ─────────────────────────────────────────── */

      /* v7 replaces boundaries/external + boundaries/element-types with this one
       * selector-based rule.
       *
       * `checkAllOrigins: true` is the non-obvious part and the whole reason a
       * first attempt at this migration silently passed: WITHOUT it the rule only
       * considers dependencies between local entities, so `import 'three'` inside
       * physics is never even examined. It is the difference between an enforced
       * boundary and a decorative one.
       *
       * `external` and `core` are separate origins — 'three' is external,
       * 'node:fs' and 'fs' are core — so both need a policy. Proven: 8/8 planted
       * violations rejected, clean and relative imports pass. */
      'boundaries/dependencies': ['error', {
        default: 'allow',
        checkAllOrigins: true,
        policies: [
          // physics imports NOTHING but itself and language built-ins.
          {
            from: { element: { type: 'physics' } },
            disallow: { to: { module: { origin: 'external' } } },
            message: 'physics must import nothing external (§2b). Not three, not next.',
          },
          {
            from: { element: { type: 'physics' } },
            disallow: { to: { module: { origin: 'core' } } },
            message: 'physics must not import Node builtins (§2b) — it runs in a browser too.',
          },
          {
            from: { element: { type: 'fixtures' } },
            disallow: { to: { module: { origin: 'external' } } },
            message: 'fixtures imports only physics (§2b).',
          },

          // Who may depend on whom. Adapters and apps may use physics and data,
          // never each other, and nothing may depend upward.
          { from: { element: { type: 'physics' } },  disallow: { to: { element: { types: { anyOf: ['data', 'fitting', 'adapter', 'app'] } } } }, message: 'physics may depend on nothing but physics (§2b).' },
          { from: { element: { type: 'fixtures' } }, disallow: { to: { element: { types: { anyOf: ['data', 'fitting', 'adapter', 'app'] } } } }, message: 'fixtures imports only physics (§2b).' },
          { from: { element: { type: 'data' } },     disallow: { to: { element: { types: { anyOf: ['fitting', 'adapter', 'app'] } } } }, message: 'data may not depend on its consumers (§2b).' },
          { from: { element: { type: 'adapter' } },  disallow: { to: { element: { types: { anyOf: ['adapter', 'app', 'fitting'] } } } }, message: 'adapters may use physics and data, never each other (§2b).' },
          { from: { element: { type: 'app' } },      disallow: { to: { element: { types: { anyOf: ['adapter', 'app', 'fitting'] } } } }, message: 'apps may use physics and data, never each other (§2b).' },
        ],
      }],

      'import/no-cycle': ['error', { maxDepth: Infinity }],
      'import/no-self-import': 'error',

      /* ── §4 general ───────────────────────────────────────────────────── */
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-empty': ['error', { allowEmptyCatch: false }],   // no silent failures
      '@typescript-eslint/no-floating-promises': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  {
    /* ── physics only: purity + documentation ───────────────────────────── */
    files: ['packages/physics/**/*.js'],
    rules: {
      // A platform global in the core makes it un-runnable server-side and
      // un-bundleable offline — §8 calls purity an NFR, not a style preference.
      'no-restricted-globals': ['error',
        { name: 'document', message: 'physics must not touch the DOM (§2b).' },
        { name: 'window',   message: 'physics must not touch the DOM (§2b).' },
        { name: 'process',  message: 'physics must not read the environment (§2b).' },
        { name: 'localStorage', message: 'physics must not touch storage (§2b).' },
        { name: 'fetch',    message: 'physics must not perform I/O (§2b).' },
      ],
      'jsdoc/require-jsdoc': ['warn', {
        publicOnly: true,
        require: { FunctionDeclaration: true, ArrowFunctionExpression: true },
      }],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-returns': 'warn',
    },
  },

  {
    /* Test harnesses are TOOLING, not physics — even though they live under
     * packages/physics/test/. They must read the filesystem to walk the module
     * tree and delete globals to do their job, so the purity rules that apply to
     * the code under test cannot apply to the harness that tests it. */
    files: ['packages/*/test/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly', process: 'readonly', globalThis: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', Buffer: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
      },
    },
    rules: {
      'boundaries/dependencies': 'off',
      'no-restricted-globals': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
    },
  },

  {
    /* `@essrt/fixtures` reads its JSON from disk at call time rather than importing
     * it, so a stale fixture cannot be baked into a bundle and consumers need no
     * import-attributes support. That makes it Node-side test infrastructure that
     * legitimately uses `node:` builtins — nothing shipped to a browser imports
     * it. `core` is not banned for fixtures by §2b (only `external` is, and only
     * physics is barred from both), so this grants globals, not an exemption. */
    files: ['packages/fixtures/src/**/*.js'],
    languageOptions: {
      globals: { URL: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },

  {
    /* `@essrt/fitting` is the production fitting pipeline — Node-only tooling
     * (§2a); nothing shipped to a browser imports it. Fitters log progress
     * and read the environment, so Node globals are legitimate here (the
     * boundaries rules above still bar physics from ever importing it). */
    files: ['packages/fitting/src/**/*.js', 'packages/fitting/src/**/*.cjs'],
    languageOptions: {
      globals: {
        console: 'readonly', process: 'readonly', URL: 'readonly', Buffer: 'readonly',
        __dirname: 'readonly', require: 'readonly', module: 'readonly',
      },
    },
  },

  {
    /* The §5c golden-master harness. It runs in Node and drives headless
     * Chromium, and the callbacks handed to `page.evaluate()` execute IN the
     * browser — so this is the one place that legitimately sees both global
     * sets in a single file. Retires at Phase 8 with the harness. */
    files: ['test/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly', process: 'readonly', globalThis: 'readonly',
        URL: 'readonly', Buffer: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        window: 'readonly', document: 'readonly',
      },
    },
  },
];
