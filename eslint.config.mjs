/**
 * Architecture-as-code — the L-GEVITY E gate.
 *
 * "Can architectural rules be encoded as checks?" A boundary described in a
 * document is advice; a boundary in CI is a boundary. This file is the §4 table
 * of IP-unified-architecture.md, executable.
 *
 * SCOPE. `packages/` and `test/` are linted. `src/script.js` (~59,300 lines),
 * `tools/`, `scripts/` and `dashboard/` are pre-migration code — linting them
 * now would produce thousands of findings that say nothing about the
 * architecture and would train everyone to ignore the output. Phase 8's
 * physics extraction is complete; these trees join when `tools/lib`
 * collapses to adapters.
 *
 * `.cjs` IS IN SCOPE — the physics domain modules are CommonJS. The rules
 * blocks matched only *.js/*.mjs until the post-Phase-14 review found the
 * whole extracted core had silently escaped the boundary and purity rules
 * (the Phase-2 planted-violation proofs predate the .cjs modules).
 *
 * `packages/analysis` is exempt by policy (§2f): the declared Python home.
 * (`packages/research` was deleted — the tools/explore relocation was
 * trialled and reverted, Phase 10; the freeze holds in place.)
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
      'packages/analysis/**',
      // Harness workspace — a KEPT git worktree under .claude/worktrees/ is a
      // full duplicate tree; without this ignore it swept 46k phantom lint
      // errors into the chain (measured, P5 K5b session).
      '.claude/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['packages/**/*.js', 'packages/**/*.mjs', 'packages/**/*.cjs'],
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
        { type: 'physics',      pattern: 'packages/physics/*' },
        { type: 'fixtures',     pattern: 'packages/fixtures/*' },
        { type: 'data',         pattern: 'packages/data/*' },
        { type: 'model-values', pattern: 'packages/model-values/*' },
        { type: 'fitting',   pattern: 'packages/fitting/*' },
        { type: 'reference', pattern: 'packages/reference/*' },
        { type: 'adapter',   pattern: 'packages/(api|mcp|render)/*', capture: ['name'] },
        { type: 'app',       pattern: 'packages/(simulator|dashboard)/*', capture: ['name'] },
      ],
      'boundaries/include': ['packages/**/*.js', 'packages/**/*.mjs', 'packages/**/*.cjs'],
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
          // model-values is a data-only published package: its rendered JSON
          // plus a thin index. Nothing external, nothing upward.
          {
            from: { element: { type: 'model-values' } },
            disallow: { to: { module: { origin: 'external' } } },
            message: 'model-values ships rendered values only — no external imports.',
          },
          {
            from: { element: { type: 'model-values' } },
            disallow: { to: { module: { origin: 'core' } } },
            message: 'model-values must not import Node builtins — it is bundled for browsers.',
          },

          // Who may depend on whom. Adapters and apps may use physics and data,
          // never each other, and nothing may depend upward.
          { from: { element: { type: 'physics' } },  disallow: { to: { element: { types: { anyOf: ['data', 'fitting', 'adapter', 'app', 'reference'] } } } }, message: 'physics may depend on nothing but physics (§2b); @essrt/reference is comparison material — the K2/K8 one-way wall.' },
          { from: { element: { type: 'fixtures' } }, disallow: { to: { element: { types: { anyOf: ['data', 'fitting', 'adapter', 'app', 'reference'] } } } }, message: 'fixtures imports only physics (§2b).' },
          { from: { element: { type: 'data' } },     disallow: { to: { element: { types: { anyOf: ['fitting', 'adapter', 'app', 'reference'] } } } }, message: 'data may not depend on its consumers (§2b) — nor on the reference wall (K2/K8).' },
          { from: { element: { type: 'model-values' } }, disallow: { to: { element: { types: { anyOf: ['physics', 'data', 'fitting', 'adapter', 'app', 'reference'] } } } }, message: 'model-values is rendered output — it depends on nothing (the registry generates it).' },
          // NOTE: no fitting→reference policy here — '@essrt/reference'
          // resolves through the workspace symlink and classifies as
          // EXTERNAL origin, so an element-type policy never matches it
          // (proven: a planted require passed). physics/fixtures/
          // model-values catch it via their blanket external bans; for the
          // packages that legitimately import externals (fitting, data) the
          // wall is the scoped core-rule block further down ("K2/K8
          // one-way reference wall").
          { from: { element: { type: 'adapter' } },  disallow: { to: { element: { types: { anyOf: ['adapter', 'app', 'fitting'] } } } }, message: 'adapters may use physics and data, never each other (§2b).' },
          { from: { element: { type: 'app' } },      disallow: { to: { element: { types: { anyOf: ['adapter', 'app', 'fitting'] } } } }, message: 'apps may use physics and data, never each other (§2b).' },
          // The reference package is STANDALONE comparison material (K2/K8):
          // it evaluates published theories from data/ JSON and depends on no
          // model package (adapters and apps may consume IT — one way only).
          { from: { element: { type: 'reference' } }, disallow: { to: { element: { types: { anyOf: ['physics', 'fixtures', 'data', 'model-values', 'fitting', 'adapter', 'app'] } } } }, message: '@essrt/reference is standalone comparison material — it may not depend on the model (K2/K8).' },
          { from: { element: { type: 'reference' } }, disallow: { to: { module: { origin: 'external' } } }, message: '@essrt/reference must import nothing external — it is bundled for browsers and stays self-contained.' },
          { from: { element: { type: 'reference' } }, disallow: { to: { module: { origin: 'core' } } }, message: '@essrt/reference must not import Node builtins — it runs in a browser too.' },
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
    /* .cjs modules are CommonJS — override the parser mode and grant the CJS
     * ambient identifiers the module system itself provides. The boundaries
     * and purity rules from the blocks above still apply; only the language
     * plumbing differs. The type-aware rule is off here: the project service
     * covers *.js/*.mjs and the CJS modules are synchronous factories. */
    files: ['packages/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      parserOptions: { projectService: false },
      globals: {
        require: 'readonly', module: 'writable', exports: 'writable',
        __dirname: 'readonly', __filename: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      // The .cjs modules use the deliberate `x == null` idiom (catches null AND
      // undefined). Rewriting those 31 sites to `===` would change semantics in
      // physics code for zero architectural gain — permit the idiom, nothing else.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  {
    /* ── physics only: purity + documentation ───────────────────────────── */
    files: ['packages/physics/**/*.js', 'packages/physics/**/*.cjs'],
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
    /* K2/K8 — the ONE-WAY reference wall for the packages whose external
     * imports are otherwise legitimate (fitting, data): @essrt/reference
     * (VSOP87 · MPP02 · the published comparison curves) is comparison
     * material, and FITTING the model to it is exactly what the doctrine
     * forbids. The boundaries matrix cannot express this ban — the
     * workspace symlink classifies '@essrt/reference' as external origin,
     * so an element-type policy never fires (proven: a planted require
     * passed) — hence core rules: no-restricted-imports for ESM and a
     * require()-selector for CJS. Both directions fail-proven. */
    files: ['packages/fitting/**/*.js', 'packages/fitting/**/*.mjs', 'packages/fitting/**/*.cjs',
            'packages/data/**/*.js', 'packages/data/**/*.mjs', 'packages/data/**/*.cjs'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@essrt/reference', '@essrt/reference/*', '**/packages/reference/**'],
          message: 'ONE-WAY BOUNDARY (K2/K8): the model chain must not consume @essrt/reference — comparison surfaces only.' }],
      }],
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression[callee.name="require"][arguments.0.value=/^@essrt\\u002freference|packages\\u002freference/]',
        message: 'ONE-WAY BOUNDARY (K2/K8): the model chain must not consume @essrt/reference — comparison surfaces only.',
      }],
    },
  },

  {
    /* The §5c golden-master harness. It runs in Node and drives headless
     * Chromium, and the callbacks handed to `page.evaluate()` execute IN the
     * browser — so this is the one place that legitimately sees both global
     * sets in a single file. Retires with the harness when the monolith
     * fully dissolves (the tools/lib adapter collapse). */
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
