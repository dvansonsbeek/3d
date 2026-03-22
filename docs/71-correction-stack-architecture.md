# 71 — Correction Stack Architecture

## Overview

Planet positions in the geocentric model go through multiple correction layers after the raw scene-graph computation. Each layer captures a different physical effect that the geometric rotation hierarchy cannot represent exactly. The corrections are applied sequentially in `tools/lib/scene-graph.js` within `computePlanetPosition()`.

The correction stack is defined in `tools/lib/correction-stack.js` — the single source of truth for what layers exist, their order, and how they behave during fitting.

## Correction Layers

Applied in this order to the spherical coordinates `(sph.theta, sph.phi)`:

```
Raw Model Position (from scene-graph rotation hierarchy)
  │
  ├─ 1. PARALLAX           Up to 48 basis functions per planet
  │                         Geometric: distance, time, orbital harmonics
  │                         Source: PARALLAX_DEC_CORRECTION, PARALLAX_RA_CORRECTION
  │
  ├─ 2. CONJUNCTION         Sin/cos at planet-specific synodic periods
  │                         Source: CONJUNCTION_CORRECTION
  │
  ├─ 3. ELONGATION          15 basis functions (inner planets only)
  │                         Elongation × Earth perihelion geometry
  │                         Source: ELONGATION_CORRECTION
  │
  ├─ 4. PLANET OFFSET       Time-dependent inclination projection correction
  │                         Phase drifts with precession, amplitude scales with inclination
  │                         Source: PLANET_OFFSET_CORRECTION
  │                         Type: POST-HOC (never refitted in pipeline)
  │
  └─ 5. MOON MEEUS          6 sin/cos terms (Moon only)
                             Source: MOON_CORRECTION
                             Type: INDEPENDENT
```

## Layer Types

| Type | Behavior during fitting | Examples |
|------|------------------------|----------|
| **fittable** | Disabled when being fitted; active otherwise. Part of the iterative pipeline (Steps 5a/5c). | Parallax, Conjunction, Elongation |
| **post-hoc** | **Always disabled** during any fitting pass. Fitted once from special data, never refitted. | Planet Offset |
| **independent** | Left as-is during all fitting. Does not interact with other layers. | Moon Meeus |

## Why Post-Hoc Matters

The parallax correction has 48 free parameters per planet — enough to model almost any smooth pattern. If a post-hoc correction is active during parallax fitting, the parallax will try to compensate for it, creating a feedback loop:

1. Post-hoc shifts Mercury Dec by +0.13°
2. Parallax sees this and allocates parameters to cancel it
3. Next iteration, post-hoc still adds +0.13°, but parallax now overcorrects
4. Coefficients diverge with each refit cycle

The `prepareForFitting()` function prevents this by automatically disabling all post-hoc layers during any fitting pass:

```js
const { prepareForFitting } = require('../lib/correction-stack');

// parallax-correction.js:
prepareForFitting(C, sg, 'parallax');
// Disables: parallax + planet-offset (post-hoc)
// Active: conjunction, elongation, moon-meeus

// conjunction-correction.js:
prepareForFitting(C, sg, ['conjunction', 'elongation']);
// Disables: conjunction + elongation + planet-offset (post-hoc)
// Active: parallax, moon-meeus
```

## Pipeline Interaction

The fitting pipeline (Steps 5a → 5c) can iterate multiple times via `--iterate N` or `--converge`. During each cycle:

1. **Step 5a** (parallax): `prepareForFitting('parallax')` → disables parallax + all post-hoc → fits from raw model residuals
2. **Step 5c** (conjunction+elongation): `prepareForFitting(['conjunction', 'elongation'])` → disables conjunction + elongation + all post-hoc → fits from post-parallax residuals
3. After fitting, the post-hoc corrections are automatically re-applied when the next `computePlanetPosition()` call runs

The post-hoc corrections (e.g., PLANET_OFFSET_CORRECTION) sit in the JSON throughout and are never modified by the pipeline. They are the "last mile" correction applied on top of everything else.

## Data Flow

```
fitted-coefficients.json (lowercase planet keys)
    │
    ├─→ tools/lib/constants/fitted-coefficients.js (loads JSON)
    │       └─→ tools/lib/constants.js (exports as C.PARALLAX_*, C.CONJUNCTION_*, etc.)
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
   { id: 'my-correction', keys: ['MY_CORRECTION'], type: 'post-hoc', emptyVal: null }
   ```

2. Add `MY_CORRECTION` to:
   - `tools/lib/constants/fitted-coefficients.js` (load from JSON)
   - `tools/lib/constants.js` (export)

3. Add application code in `tools/lib/scene-graph.js` (after existing corrections)

4. Add data to `public/input/fitted-coefficients.json`

5. Add `@AUTO:MY_CORRECTION` block in `src/script.js` with Capitalized keys

6. Add export block in `tools/fit/export-to-script.js` using `toDisplayName()`

If the type is `post-hoc`, it will automatically be disabled during all fitting passes — no need to edit any fitting scripts.

## Key Files

| File | Role |
|------|------|
| `tools/lib/correction-stack.js` | Layer definitions, `prepareForFitting()`, name conversion |
| `tools/lib/scene-graph.js` (lines 889-1060) | Applies all corrections in order |
| `tools/lib/constants.js` (lines 262-280) | Loads and exports correction data |
| `tools/fit/parallax-correction.js` | Fits Layer 1 (parallax) |
| `tools/fit/conjunction-correction.js` | Fits Layers 2+3 (conjunction + elongation) |
| `public/input/fitted-coefficients.json` | Single source of truth for all coefficients |
| `tools/fit/export-to-script.js` | Syncs JSON → script.js with key conversion |

## Related

- [67 — Planet Parallax Corrections](67-planet-parallax-corrections.md) — Layer 1 details
- [72 — Planet Offset Correction](72-planet-offset-correction.md) — Layer 4 details (post-hoc, time-dependent)
- [66 — Moon Meeus Corrections](66-moon-meeus-corrections.md) — Layer 5 details
- [65 — Equation of Center](65-equation-of-center.md) — Variable speed (pre-correction)
