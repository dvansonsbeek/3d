# `tools/explore` — frozen research one-offs

**Status: FROZEN.** 88 single-purpose investigation scripts kept as the
provenance behind findings that are written up in `docs/`. They are not
production code, not a library, and not maintained.

## What that means concretely

- **Nothing imports them.** Measured, not assumed: there are zero
  `require()` / `import` edges from anywhere else in the repo into this
  directory. Fourteen of the scripts require each other; those edges stay
  inside the folder.
- **Exempt from lint, typecheck and CI** by policy (§2e). `eslint.config.mjs`
  ignores `tools/**`, and the CI check job's scope is `packages/` only.
- **Read-only against the model.** They consume `tools/lib` and the JSON
  under `public/input/`; they do not define constants and must not be
  edited to. The Python equivalent of that rule is machine-enforced —
  see `tools/check-python-physics.mjs` (§2f).
- **Findings live in `docs/`, not here.** If a result matters, it is written
  up and its numbers land in a tracked `data/*.json`. A script here is the
  working, not the record.

## If you are tempted to change one

Don't fix it — supersede it. These files record what was actually run to
produce a published claim, so editing one silently rewrites history that a
doc already cites. Write the new version in the folder appropriate to its
purpose (`tools/fit`, `packages/`, or `scripts/` for analysis) and let this
one stand.

## Relocation note

Moving this directory into `packages/research` was trialled and reverted.
Two things made it costly rather than tidy: 71 of the 88 files reach the
engine through `require('../lib/…')`, and a two-level walk from
`packages/research/src` lands inside `packages/`, where `packages/data`
already exists — so a path would silently resolve to the wrong target
instead of failing. Because the directory is exempt from every gate,
nothing would have reported the breakage. If it is ever moved, build a
path-resolvability gate first.
