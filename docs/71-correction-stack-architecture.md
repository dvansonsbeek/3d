# 71 — Correction Stack Architecture

## Overview

Planet positions in the geocentric model go through multiple correction layers after the raw scene-graph computation. Each layer captures a different physical effect that the geometric rotation hierarchy cannot represent exactly. The corrections are applied sequentially in `tools/lib/scene-graph.js` within `computePlanetPosition()`.

The correction stack is defined in `tools/lib/correction-stack.js` — the single source of truth for what layers exist, their order, and how they behave during fitting.

## Correction Layers

Applied in this order to the spherical coordinates `(sph.theta, sph.phi)`:

```
Raw Model Position (from scene-graph rotation hierarchy)
  │
  ├─ 1. PARALLAX           Up to 78 basis functions (inner planets) / 68 (outer)
  │                         Geocentric viewing geometry: distance, time, orbital harmonics,
  │                         mean anomaly (inner planets only)
  │                         Source: PARALLAX_DEC_CORRECTION, PARALLAX_RA_CORRECTION
  │
  ├─ 2. GRAVITATION         Sin/cos at planet-specific synodic periods
  │                         Planet-planet gravitational perturbations
  │                         Source: GRAVITATION_CORRECTION
  │
  ├─ 3. ELONGATION          21 basis functions (inner planets only)
  │                         Viewing angle × Earth perihelion geometry
  │                         Source: ELONGATION_CORRECTION
  │
  └─ 4. MOON MEEUS          6 sin/cos terms (Moon only)
                             Source: MOON_CORRECTION
                             Type: INDEPENDENT
```

## Layer Types

| Type | Behavior during fitting | Examples |
|------|------------------------|----------|
| **fittable** | Disabled when being fitted; active otherwise. Part of the iterative pipeline (Steps 5a/5b). | Parallax, Gravitation, Elongation |
| **independent** | Left as-is during all fitting. Does not interact with other layers. | Moon Meeus |

## Fitting Behavior

The `prepareForFitting()` function disables the layer(s) being fitted so the fitter sees residuals without its own layer's contribution:

```js
const { prepareForFitting } = require('../lib/correction-stack');

// parallax-correction.js:
prepareForFitting(C, sg, 'parallax');
// Disables: parallax
// Active: gravitation, elongation, moon-meeus

// gravitation-correction.js:
prepareForFitting(C, sg, ['gravitation', 'elongation']);
// Disables: gravitation + elongation
// Active: parallax, moon-meeus
```

## Pipeline Interaction

The fitting pipeline (Steps 5a → 5b) can iterate multiple times via `--iterate N` or `--converge`. During each cycle:

1. **Step 5a** (parallax): `prepareForFitting('parallax')` → disables parallax → fits from residuals (with gravitation+elongation still active)
2. **Step 5b** (gravitation+elongation): `prepareForFitting(['gravitation', 'elongation'])` → disables gravitation + elongation → fits from post-parallax residuals

## RA/Dec vs 3D Position

Corrections only adjust the RA/Dec readout values (`obj.ra`, `obj.dec`). They do **not** reposition the planet mesh in the 3D scene — the mesh remains at its uncorrected scene-graph position.

This means there is a small inconsistency: the reported RA/Dec includes the correction, but the visual 3D position does not. For planets this is negligible (corrections are typically < 0.3°, imperceptible at planetary distances).

The **Moon** is the exception. Its Meeus corrections are large (up to ~5° latitude, ~1.2° RA), so a two-stage system repositions the Moon mesh to match the corrected RA/Dec. See [docs/66 — Moon Meeus Corrections](66-moon-meeus-corrections.md) Section 2 for details.

If pixel-perfect planet positioning were ever needed, the same Stage 2 transform (corrected RA/Dec → reposition `pivotObj`) could be applied to planets.

## Data Flow

```
fitted-coefficients.json (lowercase planet keys)
    │
    ├─→ tools/lib/constants/fitted-coefficients.js (loads JSON)
    │       └─→ tools/lib/constants.js (exports as C.PARALLAX_*, C.GRAVITATION_*, etc.)
    │               └─→ tools/lib/scene-graph.js (applies corrections)
    │
    └─→ tools/fit/export-to-script.js (converts lowercase → Capitalized keys)
            └─→ src/script.js (browser simulation)
```

## Planet Name Convention

| Context | Convention | Example |
|---------|-----------|---------|
| JSON files | lowercase | `"mercury": { ... }` |
| Tools (Node.js) | lowercase | `C.planets.mercury`, `baseline('mercury')` |
| `src/script.js` objects | Capitalized | `Mercury: { ... }` |
| `obj.name` in script.js | Capitalized | `obj.name === "Mercury"` |

Conversion functions in `correction-stack.js`:
- `toDisplayName('mercury')` → `'Mercury'`
- `toLowerName('Mercury')` → `'mercury'`

The `export-to-script.js` uses `toDisplayName()` to convert all correction object keys when writing to `script.js`.

## Adding a New Correction Layer

1. Add entry to `CORRECTION_LAYERS` in `tools/lib/correction-stack.js`:
   ```js
   { id: 'my-correction', keys: ['MY_CORRECTION'], type: 'fittable', emptyVal: null }
   ```

2. Add `MY_CORRECTION` to:
   - `tools/lib/constants/fitted-coefficients.js` (load from JSON)
   - `tools/lib/constants.js` (export)

3. Add application code in `tools/lib/scene-graph.js` (after existing corrections)

4. Add data to `public/input/fitted-coefficients.json`

5. Add `@AUTO:MY_CORRECTION` block in `src/script.js` with Capitalized keys

6. Add export block in `tools/fit/export-to-script.js` using `toDisplayName()`

## Key Files

| File | Role |
|------|------|
| `tools/lib/correction-stack.js` | Layer definitions, `prepareForFitting()`, name conversion |
| `tools/lib/scene-graph.js` | Applies all corrections in order |
| `tools/lib/constants.js` | Loads and exports correction data |
| `tools/fit/parallax-correction.js` | Fits Layer 1 (parallax) |
| `tools/fit/gravitation-correction.js` | Fits Layers 2+3 (gravitation + elongation) |
| `public/input/fitted-coefficients.json` | Single source of truth for all coefficients |
| `tools/fit/export-to-script.js` | Syncs JSON → script.js with key conversion |

## Related

- [67 — Planet Parallax Corrections](67-planet-parallax-corrections.md) — Layer 1 details
- [66 — Moon Meeus Corrections](66-moon-meeus-corrections.md) — Layer 4 details
- [65 — Equation of Center](65-equation-of-center.md) — Variable speed (pre-correction)
