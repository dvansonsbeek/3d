# Fitting & Derivation Scripts

All scripts that produce fitted coefficients or derived constants live here.
Output values are stored in `public/input/fitted-coefficients.json`.

## Scripts

| Script | Produces | Data source |
|--------|----------|-------------|
| `export-cardinal-points.js` | `data/02-cardinal-points.csv` | Scene-graph simulation |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (12 terms) | `data/02-cardinal-points.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×12 terms) | `data/02-cardinal-points.csv` |
| `year-length-harmonics.js` | `TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS` | `data/03-year-length-analysis.xlsx` |
| `eoc-fractions.js` | Per-planet `eocFraction` | `data/reference-data.json` |
| `parallax-correction.js` | `PARALLAX_DEC/RA_CORRECTION` (up to 42p/planet) | `data/reference-data.json` |
| `parallax-greedy-select.js` | Candidate basis terms for parallax | `data/reference-data.json` |
| `ascnode-correction.js` | `ascNodeTiltCorrection`, `startpos` | `data/reference-data.json` |
| `moon-eclipse-optimizer.js` | `moonStartposNodal/Apsidal/Moon` | 66 solar eclipses (2000–2025) |
| `python/fit_perihelion_harmonics.py` | `PERI_HARMONICS_RAW`, `PERI_OFFSET` | `data/01-holistic-year-objects-data.xlsx` |
| `python/verify_perihelion_erd.py` | pass/fail verification (exits 0=pass, 1=fail) | `data/01-holistic-year-objects-data.xlsx` |
| `python/train_precession.py` | `PREDICT_COEFFS` (429 terms × 7 planets) | `data/01-holistic-year-objects-data.xlsx` |
| `python/train_observed.py` | Observed coefficients (225/328 terms × 7 planets) | `data/01-holistic-year-objects-data.xlsx` |
| `python/greedy_features.py` | Candidate features for ML | `data/01-holistic-year-objects-data.xlsx` |
| `python/planet_eccentricity_jpl.py` | Planet `orbitalEccentricityBase` values | JPL Horizons (cached in `data/`) |

Note: `eoc-constants.js` and `perihelion-offset.js` are **informational/exploratory** only —
`eocEccentricity` and `perihelionPhaseOffset` are already derived analytically in `constants.js`
and require no pipeline step.

## Dependency chain

When model parameters change, refit in this order. The logic:
1. Sun optimizer must run first — it derives the exact Earth geometry constants
2. Planet angleCorrection must be solved next — it aligns each planet's perihelion to its longitudePerihelion
3. Only after steps 1–2 is the simulation state correct enough to export input data
4. Earth's perihelion/ERD must be correct before planet ML predictions
5. ML precession coefficients depend on perihelion/ERD
6. Planet positions in the scene-graph depend on EoC and precession
7. Parallax corrections are a final layer on top of scene-graph positions
8. Cardinal point data comes from the scene-graph (depends on everything above)
9. Obliquity/year-length harmonics are fitted from the cardinal point data
10. `SOLSTICE_OBLIQUITY_MEAN_FITTED` (Step 11) feeds back into the scene graph,
    creating a circular dependency. For full self-consistency after parameter
    changes, run the pipeline twice. The first pass establishes the correct
    obliquity mean; the second pass ensures all downstream steps (ML training,
    cardinal point export) use the corrected value. In practice the effect is
    small (~1.5" obliquity shift), but a second pass guarantees convergence.

```
── Phase 0: Sun optimizer & planet alignment (optimizer tool) ───────

Step 1:  node tools/optimize.js optimize sun correctionSun
         → correctionSun, eccentricityBase, eccentricityAmplitude,
           earthtiltMean, earthInvPlaneInclinationAmplitude (all derived)
         Updates: model-parameters.json + script.js (5 Earth orbital constants)
         Verify: RMS < 0.004°, solstice timing < 1 sec error at J2000

Step 2:  node tools/optimize.js optimize <planet> startpos   (for each planet)
         → angleCorrection (derived from longitudePerihelion, not a free param)
         Updates: model-parameters.json + script.js (angleCorrection per planet)
         Verify: Scene perihelion RA = longitudePerihelion exactly (diff < 0.000001°)
         Planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

Step 2b: node tools/fit/moon-eclipse-optimizer.js
         Optimizes Moon's 3 startpos values against 66 solar eclipses (2000–2025)
         Measures Moon-Sun angular separation at each eclipse — should be ~0°
         Updates: model-parameters.json + script.js (moonStartposNodal, moonStartposApsidal, moonStartposMoon, manual)
         Verify: RMS separation < 0.5°, individual eclipses < 1°

         Moon position architecture (two layers):
         1. Geometric orbit: 5 precession layers from 3 month inputs + 3 startpos
            → constants.js (moonSiderealMonthInput, moonAnomalisticMonthInput, moonNodalMonthInput,
              moonStartposApsidal, moonStartposNodal, moonStartposMoon)
         2. Meeus perturbation overlay: 120 terms from published tables (not fitted)
            → tools/lib/constants/meeus-lunar-tables.json (centralized, loaded by scene-graph.js)
            Source: Meeus "Astronomical Algorithms", Chapter 47, Tables 47.A & 47.B
            Note: script.js still has its own copy (browser cannot load JSON at runtime)

── Phase 1: Generate input data (manual) ───────────────────────────

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         (Perihelion/precession data for all planets, 29-year steps over full H)
         Menu: Analysis → Export Objects Report

── Phase 2: Earth orbital geometry ──────────────────────────────────

Step 4:  python/fit_perihelion_harmonics.py   → PERI_HARMONICS_RAW, PERI_OFFSET
         (Earth perihelion longitude & ERD from file 01)
         Updates: fitted-coefficients.json (auto-updated by script)

Step 4b: python/verify_perihelion_erd.py      → pass/fail verification
         (RMSE, max error, J2000 accuracy, ERD analytical vs numerical)
         Must pass before proceeding — ERD errors propagate into all planet ML predictions.

Note: eocEccentricity and perihelionPhaseOffset are derived analytically in constants.js
      from correctionSun and the eccentricity constants — no pipeline step needed.

── Phase 3: Planet precession predictions ───────────────────────────

Step 5:  python/train_precession.py           → tools/lib/python/coefficients/*_coeffs_unified.py
         (429-term ML coefficients, uses perihelion/ERD as features)
         Updates: coefficients/*_coeffs_unified.py (auto-written by script)

Step 6:  python/train_observed.py             → tools/lib/python/coefficients/*_coeffs.py
         (225-term observed coefficients)
         Updates: coefficients/*_coeffs.py (auto-written by script)

── Phase 4: Planet positions & corrections ──────────────────────────

Step 7:  eoc-fractions.js                     → per-planet eocFraction
         Scans EoC fraction 0→1 for Type III planets (Jupiter, Saturn, Uranus, Neptune)
         Updates: model-parameters.json + script.js (eocFraction per Type III planet, manual)

Step 8:  ascnode-correction.js                → startpos per planet
         Scans ascNodeTiltCorrection (derived from startpos), re-optimizes startpos
         Updates: model-parameters.json + script.js (startpos per planet, manual)
         Note: ascNodeTiltCorrection is derived (2*startpos or 180-ascendingNode)

Step 9:  parallax-correction.js               → PARALLAX_DEC/RA_CORRECTION
         Fits up to 42-parameter RA/Dec correction per planet via cross-validation
         Updates: fitted-coefficients.json (auto-updated by script)

── Phase 5: Cardinal point data & harmonics ─────────────────────────

Step 10: export-cardinal-points.js            → data/02-cardinal-points.csv
         (runs full scene-graph simulation — depends on all above)

Step 11: obliquity-harmonics.js               → SOLSTICE_OBLIQUITY_HARMONICS
         Updates: fitted-coefficients.json (auto-updated by script)

Step 12: cardinal-point-harmonics.js          → CARDINAL_POINT_HARMONICS
         Updates: fitted-coefficients.json (auto-updated by script)

Step 13: year-length-harmonics.js             → TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS
         Updates: fitted-coefficients.json (auto-updated by script)
```

Note: `data/03-year-length-analysis.xlsx` (491 pts, 100-yr steps) is also exported
from the browser GUI (Menu: Analysis → Year Length Report) and used by step 10.
Only needs regenerating if H or year-length-affecting parameters change.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | ALL (1→13) |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `earthtiltMean` | 1, 3→6, 10→13 |
| `earthInvPlaneInclinationAmplitude` | 1, 3→6, 10→13 |
| `earthInvPlaneInclinationMean` | 3, 10→13 |
| `correctionSun` | 1, 10→13 |
| `eccentricityBase` / `eccentricityAmplitude` | 1, 3→4, 10→13 |
| `correctionDays` | 3, 10→13 |
| `useVariableSpeed` | ALL (1→13) |
| Planet `startpos` | 2 (re-solve angleCorrection), 9 |
| Planet `eocFraction` | 3, 9 |
| Planet `solarYearInput` | 2, 5→6, 9 |
| Planet `orbitalEccentricityBase` | 2, 7, 9 |
| Moon months (sidereal/anomalistic/nodal) | 2b |
| `moonStartposNodal/Apsidal/Moon` | 2b |

## How to run

```bash
# Phase 0: Sun optimizer & planet alignment
node tools/optimize.js optimize sun correctionSun
# For each planet (mercury, venus, mars, jupiter, saturn, uranus, neptune):
node tools/optimize.js optimize mercury startpos
node tools/optimize.js optimize venus startpos
node tools/optimize.js optimize mars startpos
node tools/optimize.js optimize jupiter startpos
node tools/optimize.js optimize saturn startpos
node tools/optimize.js optimize uranus startpos
node tools/optimize.js optimize neptune startpos
# Moon
node tools/fit/moon-eclipse-optimizer.js

# Phase 1: Generate input data (manual)
# Export from browser: Analysis → Export Objects Report → save as data/01-holistic-year-objects-data.xlsx

# Phase 2: Earth orbital geometry
python3 tools/fit/python/fit_perihelion_harmonics.py
python3 tools/fit/python/verify_perihelion_erd.py   # must pass before continuing

# Phase 3: Planet precession predictions
python3 tools/fit/python/train_precession.py
python3 tools/fit/python/train_observed.py

# Phase 4: Planet positions & corrections
node tools/fit/eoc-fractions.js
node tools/fit/ascnode-correction.js
node tools/fit/parallax-correction.js

# Phase 5: Cardinal point data & harmonics
node tools/fit/export-cardinal-points.js
node tools/fit/obliquity-harmonics.js
node tools/fit/cardinal-point-harmonics.js
node tools/fit/year-length-harmonics.js
```

## Where outputs are stored

| Output type | Location |
|-------------|----------|
| Fitted coefficients (JSON) | `public/input/fitted-coefficients.json` ← single source of truth |
| ML coefficients (Python) | `tools/lib/python/coefficients/*_coeffs*.py` |
| Training data (CSV/JSON) | `data/02-cardinal-points.csv`, `data/cardinal-points-training.json` |

## Single source of truth — JSON files

All input data lives in 4 JSON files in `public/input/`:

| File | Contents | Who writes |
|------|----------|-----------|
| `model-parameters.json` | Model theory parameters (H, corrections, planet configs) | Manual / optimizer |
| `astro-reference.json` | IAU/JPL/Meeus reference data | Manual (external sources) |
| `fitted-coefficients.json` | All fitting pipeline output (harmonics, parallax, obliquity) | Fitting scripts (auto) |
| `meeus-lunar-tables.json` | Moon perturbation tables (Meeus Ch. 47) | Manual (reference data) |

## Constants flow

```
public/input/
    ├── model-parameters.json     ← Model parameters (H, corrections, planet configs)
    ├── astro-reference.json      ← External reference data (IAU, JPL, Meeus)
    ├── fitted-coefficients.json  ← Fitting pipeline output (harmonics, parallax)
    └── meeus-lunar-tables.json   ← Moon Meeus Ch. 47 tables
         ↓ JSON.parse (loaded at require-time)
tools/lib/constants.js            ← Builds all constants from JSON + derived values
tools/lib/constants/
    ├── fitted-coefficients.js    ← Loads fitted JSON + buildFittedCoefficients()
    └── utils.js                  ← Date/formatting/derivation helpers
         ↓ Node.js JSON dump (_dump_constants.js)
tools/fit/python/load_constants.py  ← Python bridge (auto-sync)
    ↓ import
tools/lib/python/constants_scripts.py    ← Python physics library
    ↓ import
tools/lib/python/predictive_formula.py   ← Predictive formulas
tools/lib/python/observed_formula.py     ← Observed formulas

Fitting scripts write directly to fitted-coefficients.json:
    obliquity-harmonics.js       → SOLSTICE_OBLIQUITY_HARMONICS, SOLSTICE_OBLIQUITY_MEAN_FITTED
    cardinal-point-harmonics.js  → CARDINAL_POINT_HARMONICS
    fit_perihelion_harmonics.py  → PERI_HARMONICS_RAW, PERI_OFFSET
```

## Related documentation

- [Predictive Formula Guide](../lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — ML architecture, feature matrix (429 terms), how to extend
- [Solstice Prediction](../../docs/14-solstice-prediction.md) — Cardinal point harmonics, obliquity formula derivation
- [Equation of Center](../../docs/65-equation-of-center.md) — EoC derivation and constants
- [Parallax Corrections](../../docs/67-planet-parallax-corrections.md) — Parallax correction formula and tiers
