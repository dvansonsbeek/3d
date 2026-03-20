# Fitting & Derivation Scripts

All scripts that produce fitted coefficients or derived constants live here.
Output values are stored in `tools/lib/constants/fitted-coefficients.js`.

## Scripts

| Script | Produces | Data source |
|--------|----------|-------------|
| `export-cardinal-points.js` | `data/02-cardinal-points.csv` | Scene-graph simulation |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (12 terms) | `data/02-cardinal-points.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×12 terms) | `data/02-cardinal-points.csv` |
| `year-length-harmonics.js` | `TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS` | `data/03-year-length-analysis.xlsx` |
| `eoc-constants.js` | `eocEccentricity`, `perihelionPhaseOffset` | Scene-graph simulation |
| `eoc-fractions.js` | Per-planet `eocFraction` | `data/reference-data.json` |
| `perihelion-offset.js` | `perihelionPhaseOffset` (analytical) | Constants only |
| `parallax-correction.js` | `PARALLAX_DEC/RA_CORRECTION` (up to 42p/planet) | `data/reference-data.json` |
| `parallax-greedy-select.js` | Candidate basis terms for parallax | `data/reference-data.json` |
| `ascnode-correction.js` | `ascNodeTiltCorrection`, `startpos` | `data/reference-data.json` |
| `python/fit_perihelion_harmonics.py` | `PERI_HARMONICS_RAW`, `PERI_OFFSET` | `data/01-holistic-year-objects-data.xlsx` |
| `python/train_precession.py` | `PREDICT_COEFFS` (429 terms × 7 planets) | `data/01-holistic-year-objects-data.xlsx` |
| `python/train_observed.py` | Observed coefficients (225/328 terms × 7 planets) | `data/01-holistic-year-objects-data.xlsx` |
| `python/greedy_features.py` | Candidate features for ML | `data/01-holistic-year-objects-data.xlsx` |
| `python/planet_eccentricity_jpl.py` | Planet `orbitalEccentricityBase` values | JPL Horizons (cached in `data/`) |

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

```
── Phase 0: Sun optimizer & planet alignment (optimizer tool) ───────

Step 1:  node tools/optimize.js optimize sun correctionSun
         → correctionSun, eccentricityBase, eccentricityAmplitude,
           earthtiltMean, earthInvPlaneInclinationAmplitude (all derived)
         Verify: RMS < 0.004°, solstice timing < 1 sec error at J2000

Step 2:  node tools/optimize.js optimize <planet> startpos   (for each planet)
         → angleCorrection (derived from longitudePerihelion, not a free param)
         Verify: Scene perihelion RA = longitudePerihelion exactly (diff < 0.000001°)
         Planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

── Phase 1: Generate input data (manual) ───────────────────────────

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         (Perihelion/precession data for all planets, 29-year steps over full H)
         Menu: Analysis → Export Objects Report

── Phase 2: Earth orbital geometry ──────────────────────────────────

Step 4:  python/fit_perihelion_harmonics.py   → PERI_HARMONICS_RAW, PERI_OFFSET
         (Earth perihelion longitude & ERD from file 01)

Step 5:  eoc-constants.js                     → eocEccentricity, perihelionPhaseOffset
         (Equation of center derived from scene-graph geometry)

── Phase 3: Planet precession predictions ───────────────────────────

Step 6:  python/train_precession.py           → tools/lib/python/coefficients/*_coeffs_unified.py
         (429-term ML coefficients, uses perihelion/ERD as features)

Step 7:  python/train_observed.py             → tools/lib/python/coefficients/*_coeffs.py
         (225-term observed coefficients)

── Phase 4: Planet positions & corrections ──────────────────────────

Step 8:  eoc-fractions.js                     → per-planet eocFraction
Step 9:  ascnode-correction.js                → ascNodeTiltCorrection, startpos
Step 10: parallax-correction.js               → PARALLAX_DEC/RA_CORRECTION

── Phase 5: Cardinal point data & harmonics ─────────────────────────

Step 11: export-cardinal-points.js            → data/02-cardinal-points.csv
         (runs full scene-graph simulation — depends on all above)

Step 12: obliquity-harmonics.js               → SOLSTICE_OBLIQUITY_HARMONICS
Step 13: cardinal-point-harmonics.js          → CARDINAL_POINT_HARMONICS
Step 14: year-length-harmonics.js             → TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS
```

Note: `data/03-year-length-analysis.xlsx` (491 pts, 100-yr steps) is also exported
from the browser GUI (Menu: Analysis → Year Length Report) and used by step 11.
Only needs regenerating if H or year-length-affecting parameters change.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | ALL (1→14) |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `earthtiltMean` | 1, 3→7, 11→14 |
| `earthInvPlaneInclinationAmplitude` | 1, 3→7, 11→14 |
| `earthInvPlaneInclinationMean` | 3, 11→14 |
| `correctionSun` | 1, 5, 11→14 |
| `eccentricityBase` / `eccentricityAmplitude` | 1, 3→5, 11→14 |
| `correctionDays` | 3, 11→14 |
| `useVariableSpeed` | ALL (1→14) |
| Planet `startpos` | 2 (re-solve angleCorrection), 10 |
| Planet `eocFraction` | 3, 10 |
| Planet `solarYearInput` | 2, 6→7, 10 |
| Planet `orbitalEccentricityBase` | 2, 8, 10 |

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

# Phase 1: Generate input data (manual)
# Export from browser: Analysis → Export Objects Report → save as data/01-holistic-year-objects-data.xlsx

# Phase 2: Earth orbital geometry
python3 tools/fit/python/fit_perihelion_harmonics.py
node tools/fit/eoc-constants.js

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
| Fitted JS coefficients | `tools/lib/constants/fitted-coefficients.js` |
| Parallax corrections | `tools/lib/constants/fitted-coefficients.js` (attached to ASTRO_REFERENCE) |
| ML coefficients (Python) | `tools/lib/python/coefficients/*_coeffs*.py` |
| Training data (CSV/JSON) | `data/02-cardinal-points.csv`, `data/cardinal-points-training.json` |

## Constants flow

```
tools/lib/constants.js          ← Single source of truth (JS)
    ↓ require()
tools/lib/constants/
    ├── fitted-coefficients.js  ← All fitted output
    ├── astro-reference.js      ← External reference data
    └── utils.js                ← Date/formatting helpers
    ↓ Node.js JSON dump
tools/fit/python/load_constants.py  ← Python bridge (auto-sync)
    ↓ import
tools/lib/python/constants_scripts.py    ← Python physics library (zero hardcoded values)
    ↓ import
tools/lib/python/predictive_formula.py   ← Predictive formulas
tools/lib/python/observed_formula.py     ← Observed formulas
```

## Related documentation

- [Predictive Formula Guide](../lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — ML architecture, feature matrix (429 terms), how to extend
- [Solstice Prediction](../../docs/14-solstice-prediction.md) — Cardinal point harmonics, obliquity formula derivation
- [Equation of Center](../../docs/65-equation-of-center.md) — EoC derivation and constants
- [Parallax Corrections](../../docs/67-planet-parallax-corrections.md) — Parallax correction formula and tiers
