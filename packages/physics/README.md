# @essrt/physics

The physics core of **ESSRT** — the Expanding Solar System Resonance Theory —
as implemented by the [Holistic Universe Model](https://3d.holisticuniverse.com)
([source, AGPL-3.0](https://github.com/dvansonsbeek/3d)). Pure computation:
no I/O, no globals, no DOM, constants injected. The package ships the
**complete model**, including the fitted coefficients, so an installed copy
reproduces the hosted simulator bit-for-bit on the shared golden masters.

## Versioning — two axes, deliberately

- **Package semver** (this package's `version`) tracks the **API axis** —
  what `import` gives you.
- **Model identity** rides *inside* every published version: the
  `essrt.modelVersion` field in `package.json` plus `CONSTANTS_HASH` and
  `COEFFICIENTS_HASH` in `src/constants/`. A refit or structural model
  change always lands as a new package version — npm's immutability then
  guarantees a pinned version's results never change.

Cite results as *model vX.Y (package A.B.C)*.

## Usage

```js
import { DEFAULT_CONSTANTS, FITTED_COEFFICIENTS, createEpochPrimitives } from '@essrt/physics';
```

Domain modules are CJS subpath exports, each a `create*` factory taking its
dependencies explicitly (the injectable-constants design — counterfactual
runs are first-class):

```js
const { createEclipseFinders } = require('@essrt/physics/eclipse/finders');
const { createPredictivePrecession } = require('@essrt/physics/planets/predict');
```

See the `exports` map in `package.json` for the full surface: moon
(arguments/series/apparent/ecc-channel/month-chain), planets (geometry,
corrections, predict, model, fibonacci-laws, …), deltat (cycles, deep-time,
historical), cardinal points, phase, chain-cycles, sun, climate, eclipse
finders, and the published reference curves.

For rendered display values (day/year lengths, precession rates, orbital
elements as preformatted strings), see
[`@essrt/model-values`](https://www.npmjs.com/package/@essrt/model-values) —
generated from this engine at the same model version.

## Provenance

Every value derives from the model parameters and fitted coefficients in
this package; the fitting pipeline, verification gates, dataset manifest and
documentation live in the [public repository](https://github.com/dvansonsbeek/3d).
Preprint: <https://doi.org/10.21203/rs.3.rs-8758810/v4>.

## Licence

AGPL-3.0-or-later. Commercial licensing: dennis@holisticuniverse.com.
