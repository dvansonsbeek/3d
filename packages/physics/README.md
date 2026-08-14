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

## The assembled model — `createModel()`

The canonical assembly, wired once inside the package:

```js
import { createModel, DEFAULT_CONSTANTS } from '@essrt/physics';

const model = createModel();
model.identity.modelVersion;          // 'v10.0' + both content hashes
model.epoch.hAtYear(2000 - 380e6);    // 306189 — Devonian H (the Wells 1963 match)
model.earth.obliquityDeg(2000);       // 23.4393
model.cardinal.jd(2000, 'SS');        // 2451716.575 — June solstice 2000 (USNO)
model.lengths.tropicalYearDays(2000); // 365.24219

// Counterfactual (§2d): inject different constants, get a different solar
// system — self-identifying, with its own constants hash.
const cf = createModel({
  ...DEFAULT_CONSTANTS,
  foundational: { ...DEFAULT_CONSTANTS.foundational, holisticyearLength: 400000 },
});
cf.epoch.hAtYear(2000);               // 400000
cf.identity.counterfactual;           // true
```

The surface groups: `time` (exact JD ↔ model-year conversion on the SI
axis the fits were anchored on — callers holding a JD convert here, never
with their own formula), `identity` (version + hashes + citation DOI), `epoch`
(H, LOD, α, ΔT, deep-time quantities at any year ±500 Myr), `earth`
(obliquity, eccentricity, inclination, perihelion), `lengths` (year and
day lengths), `cardinal` (solstice/equinox JD, RA, year length), `moon`
(distance and months at epoch, plus the apparent-position chain on the
JD(UT) axis — ecliptic longitude, latitude and distance from the shared
Meeus series over framework-native arguments), `eclipse` (geocentric
solar/lunar eclipse search over a JD window, greatest-eclipse convention),
`climate` (the L1 orbital-forcing formula) and `planets` (the Fibonacci-law
records and orientation at epoch). Validation targets are refused as
inputs — a counterfactual cannot move the goalposts it is judged by.

## Underneath: a parts library

`createModel()` is assembly over unassembled factories. Each factory
receives everything through one deps object — plain numbers plus
functions — and no module imports another; that is what makes
counterfactuals first-class and lets the same core run in Node and the
browser. For custom wiring (different α channel, subset assembly), use
the factories directly: the reference adapter is `tools/lib/` in the
[public repository](https://github.com/dvansonsbeek/3d) — the hosted
simulator and the project's verification gates run on it. A service
surface over `createModel()` lives in the same repository
(`packages/api`, an OpenAPI 3.1 handler with zero runtime dependencies)
— build-only until the hosting decision.

## Provenance

Every value derives from the model parameters and fitted coefficients in
this package; the fitting pipeline, verification gates, dataset manifest and
documentation live in the [public repository](https://github.com/dvansonsbeek/3d).
Preprint: <https://doi.org/10.21203/rs.3.rs-8758810/v4>.

## Licence

AGPL-3.0-or-later. Commercial licensing: dennis@holisticuniverse.com.
