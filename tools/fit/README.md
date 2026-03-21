# Fitting & Derivation Scripts

All scripts that produce fitted coefficients or derived constants live here.
Output values are stored in `public/input/fitted-coefficients.json`.

## `--write` flag convention

All fitting scripts support **dry run** by default (print results only).
Add `--write` to actually update the JSON source-of-truth files.
After writing, run `export-to-script.js --write` to sync values to `src/script.js`.

## Scripts

| Script | Produces | Data source |
|--------|----------|-------------|
| `export-cardinal-points.js` | `data/02-cardinal-points.csv` | Scene-graph simulation |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (12 terms) | `data/02-cardinal-points.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×12 terms) | `data/02-cardinal-points.csv` |
| `export-year-lengths.js` | `data/03-year-length-analysis.xlsx` | Scene-graph simulation (headless) |
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
| `export-to-script.js` | Syncs all JSON values → `src/script.js` | All 4 JSON files in `public/input/` |
| `verify-pipeline.js` | Pass/fail verification of all 9 targets | Scene-graph simulation |

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

Step 7:  eoc-fractions.js                     → per-planet eocFraction  (DIAGNOSTIC, skip in standard refit)
         Scans EoC fraction 0→1 for Type III planets (Jupiter, Saturn, Uranus, Neptune)
         Informational only — no --write flag. Values rarely change (<0.01° impact).
         Only re-run if planet orbital elements or EoC architecture changes.

Step 8:  ascnode-correction.js                → startpos per planet  (DIAGNOSTIC, skip in standard refit)
         Scans ascNodeTiltCorrection (derived from startpos), re-optimizes startpos
         Informational only — no --write flag. Step 2 already optimizes startpos/angleCorrection.
         Only re-run if ascending node reference values or inclination model changes.

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

Step 13a: export-year-lengths.js               → data/03-year-length-analysis.xlsx
          Measures tropical (RA crossings), sidereal (world-angle crossings),
          and anomalistic (WobbleCenter→Sun peri+aph mean) year lengths.
          Uses headless scene-graph — no browser needed.
          Default: full H at 29-year steps (11,553 points, ~90 min).
          Custom range: --start -23200 --end 25800 --step 100

          Year-length measurement method (same 3 types as browser report):

          1. TROPICAL YEAR — Sun RA crossing intervals
             Finds when Sun RA crosses 4 cardinal angles (0°, 90°, 180°, 270°).
             For each angle, measures the interval between crossing at year Y
             and crossing at year Y−N (where N = step size in years).
             Mean tropical year = average of all 4 intervals, divided by N.
             This is the same RA-crossing method as sunRACrossingForYear()
             in the browser.

          2. SIDEREAL YEAR — Sun world-angle crossing intervals
             Finds when the Sun's world-space angle (atan2(z, x) in the
             Three.js scene) crosses 4 reference angles (0°, 90°, 180°, 270°).
             Mean sidereal year = average of 4 intervals / N.
             Same method as the browser's getSunWorldAngle() sidereal
             measurement.

          3. ANOMALISTIC YEAR — perihelion + aphelion mean interval
             Finds perihelion (minimum WobbleCenter→Sun distance) and
             aphelion (maximum distance) for each target year.
             Mean anomalistic year = (perihelion interval + aphelion interval)
             / (2 × N). Averaging peri + aph cancels EoC variable-speed bias.
             Same method as browser's perihelionForYearMethodB() and
             aphelionForYearMethodB().

          Key difference from browser "Days, Years & Precession" report:
          The browser report uses 1-year steps (interval = crossing(Y) −
          crossing(Y−1)), giving exact year-to-year values including
          short-term fluctuations. The headless tool uses N-year steps
          (default 29), dividing by N to get a smoothed average. This
          smoothing is intentional for Step 13b harmonic fitting — it
          suppresses noise and lets the Fourier fit focus on long-period
          signals (H/2, H/3, H/8 etc.).

Step 13b: year-length-harmonics.js            → TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS
          Reads data/03-year-length-analysis.xlsx, fits Fourier harmonics.
          Updates: fitted-coefficients.json (auto-updated by script)

── Phase 6: Sync & verify ─────────────────────────────────────────

Step 14: export-to-script.js --write          → src/script.js
         Reads all 4 JSON files and patches corresponding values in script.js.
         Handles: scalar consts, planet properties, arrays (harmonics, Moon tables),
         objects (parallax corrections, cardinal point harmonics).
         Dry run (no --write) shows diffs without changing script.js.

Step 15: verify-pipeline.js                   → pass/fail
         Runs scene-graph simulation for all 9 targets (Sun, Moon, 7 planets)
         and verifies RMS errors are within tolerance.
```

Note: `export-to-script.js --write` should be run after any `--write` step that
updates a JSON file. The browser simulation (`src/script.js`) cannot load JSON
at runtime, so all values must be patched into the script.

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

All scripts default to **dry run** (print only). Add `--write` to update JSON files.
After each `--write` step, run `export-to-script.js --write` to sync to `src/script.js`.

```bash
# Phase 0: Sun optimizer & planet alignment
node tools/optimize.js optimize sun correctionSun --write
# For each planet (mercury, venus, mars, jupiter, saturn, uranus, neptune):
node tools/optimize.js optimize mercury startpos --write
node tools/optimize.js optimize venus startpos --write
node tools/optimize.js optimize mars startpos --write
node tools/optimize.js optimize jupiter startpos --write
node tools/optimize.js optimize saturn startpos --write
node tools/optimize.js optimize uranus startpos --write
node tools/optimize.js optimize neptune startpos --write
# Moon
node tools/fit/moon-eclipse-optimizer.js --write
# Sync to script.js
node tools/fit/export-to-script.js --write

# Phase 1: Generate input data (manual)
# Export from browser: Analysis → Export Objects Report → save as data/01-holistic-year-objects-data.xlsx

# Phase 2: Earth orbital geometry
cd tools/fit/python && python3 fit_perihelion_harmonics.py --write && cd ../../..
cd tools/fit/python && python3 verify_perihelion_erd.py && cd ../../..   # must pass before continuing
node tools/fit/export-to-script.js --write

# Phase 3: Planet precession predictions
cd tools/fit/python && python3 train_precession.py --write && cd ../../..
cd tools/fit/python && python3 train_observed.py --write && cd ../../..

# Phase 4: Planet positions & corrections
# node tools/fit/eoc-fractions.js           # DIAGNOSTIC — skip in standard refit
# node tools/fit/ascnode-correction.js       # DIAGNOSTIC — skip in standard refit
node tools/fit/parallax-correction.js --write
node tools/fit/export-to-script.js --write

# Phase 5: Cardinal point data & harmonics
node tools/fit/export-cardinal-points.js
node tools/fit/obliquity-harmonics.js --write
node tools/fit/cardinal-point-harmonics.js --write
node tools/fit/export-year-lengths.js          # generates data/03-year-length-analysis.xlsx (~90 min)
node tools/fit/year-length-harmonics.js --write

# Phase 6: Sync & verify
node tools/fit/export-to-script.js --write
node tools/fit/verify-pipeline.js
```

## Where outputs are stored

| Output type | Location |
|-------------|----------|
| Model parameters (JSON) | `public/input/model-parameters.json` ← single source of truth |
| Fitted coefficients (JSON) | `public/input/fitted-coefficients.json` ← single source of truth |
| ML coefficients (Python) | `tools/lib/python/coefficients/*_coeffs*.py` |
| Browser simulation | `src/script.js` ← patched by `export-to-script.js` |
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
public/input/ (single source of truth)
    ├── model-parameters.json     ← Model parameters (H, corrections, planet configs)
    ├── astro-reference.json      ← External reference data (IAU, JPL, Meeus)
    ├── fitted-coefficients.json  ← Fitting pipeline output (harmonics, parallax)
    └── meeus-lunar-tables.json   ← Moon Meeus Ch. 47 tables
         │
         ├──→ JSON.parse (loaded at require-time)
         │    tools/lib/constants.js            ← Builds all constants + derived values
         │    tools/lib/constants/
         │        ├── fitted-coefficients.js    ← Loads fitted JSON + buildFittedCoefficients()
         │        └── utils.js                  ← Derivation helpers (orbitTilt, inclination, etc.)
         │         ↓ Node.js JSON dump
         │    tools/fit/python/_dump_constants.js  ← Exports constants as JSON to stdout
         │         ↓ subprocess (Node.js invoked by Python)
         │    tools/fit/python/load_constants.py   ← Python bridge: calls _dump_constants.js
         │         ↓ import
         │    tools/lib/python/constants_scripts.py    ← Python constants (dicts, derived values)
         │         ↓ import
         │    tools/lib/python/predictive_formula.py   ← 429-term ML feature matrix
         │    tools/lib/python/observed_formula.py     ← 225-term observed feature matrix
         │
         └──→ export-to-script.js --write
              src/script.js   ← Browser simulation (cannot load JSON at runtime)

Fitting scripts write to JSON, then export-to-script.js syncs to script.js:
    fit_perihelion_harmonics.py  → fitted-coefficients.json → export-to-script.js → script.js
    obliquity-harmonics.js       → fitted-coefficients.json → export-to-script.js → script.js
    cardinal-point-harmonics.js  → fitted-coefficients.json → export-to-script.js → script.js
    year-length-harmonics.js     → fitted-coefficients.json → export-to-script.js → script.js
    parallax-correction.js       → fitted-coefficients.json → export-to-script.js → script.js
    optimize.js                  → model-parameters.json    → export-to-script.js → script.js
```

### Python-Node.js bridge

Python scripts cannot parse JavaScript directly. Instead, `load_constants.py` calls
`_dump_constants.js` via `subprocess`, which runs Node.js to load `constants.js` and
outputs all constants as JSON to stdout. Python reads this JSON, so all Python scripts
automatically use the same values as the Node.js tooling — no manual sync needed.

## Related documentation

- [Predictive Formula Guide](../lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — ML architecture, feature matrix (429 terms), how to extend
- [Solstice Prediction](../../docs/14-solstice-prediction.md) — Cardinal point harmonics, obliquity formula derivation
- [Equation of Center](../../docs/65-equation-of-center.md) — EoC derivation and constants
- [Parallax Corrections](../../docs/67-planet-parallax-corrections.md) — Parallax correction formula and tiers
