# Fitting & Derivation Scripts

All scripts that produce fitted coefficients or derived constants live here.
Output values are stored in `public/input/fitted-coefficients.json`.

## `--write` flag convention

All fitting scripts support **dry run** by default (print results only).
Add `--write` to actually update the JSON source-of-truth files.
After all steps complete, run `verify-pipeline.js` (Step 8) to check for regressions,
then `export-to-script.js --write` (Step 9) to sync values to `src/script.js`.

## Scripts

| Script | Produces | Data source |
|--------|----------|-------------|
| `export-cardinal-points.js` | `data/02-cardinal-points.csv` | Scene-graph simulation |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (16 terms) | `data/02-cardinal-points.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×15-21 terms) | `data/02-cardinal-points.csv` |
| `export-year-lengths.js` | `data/03-year-length-analysis.xlsx` | Scene-graph simulation (headless) |
| `year-length-harmonics.js` | `TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS` | `data/03-year-length-analysis.xlsx` |
| `eoc-fractions.js` | Per-planet `eocFraction` | `data/reference-data.json` |
| `parallax-correction.js` | `PARALLAX_DEC/RA_CORRECTION` (up to 42p/planet) | `data/reference-data.json` |
| `parallax-greedy-select.js` | Candidate basis terms for parallax | `data/reference-data.json` |
| `ascnode-correction.js` | `ascNodeTiltCorrection`, `startpos` | `data/reference-data.json` |
| `moon-eclipse-optimizer.js` | `moonStartposNodal/Apsidal/Moon` | 66 solar eclipses (2000–2025) — run separately, not part of standard pipeline |
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
2. Planet angleCorrection must be solved next — it aligns each planet's perihelion
3. Only after Steps 1–2 is the simulation state correct enough to export input data
4. Earth's perihelion/ERD must be correct before planet ML predictions (4a→4d)
5. Parallax corrections are a final layer on top of scene-graph positions
6. Cardinal point data comes from the scene-graph (depends on everything above)
7. Year-length harmonics are fitted from the year-length analysis data
8. `SOLSTICE_OBLIQUITY_MEAN_FITTED` (Step 6b) feeds back into the scene graph,
   creating a circular dependency. For full self-consistency after parameter
   changes, run the pipeline twice. The first pass establishes the correct
   obliquity mean; the second pass ensures all downstream steps use the
   corrected value. In practice the effect is small (~1.5" obliquity shift),
   but a second pass guarantees convergence.

```
── Phase 1: Sun optimizer & planet alignment ──────────────────────

Step 1:  node tools/optimize.js optimize sun correctionSun
         → correctionSun, eccentricityBase, eccentricityAmplitude,
           earthtiltMean, earthInvPlaneInclinationAmplitude (all derived)
         Updates: model-parameters.json (5 Earth orbital constants)
         Verify: RMS < 0.004°, solstice timing < 1 sec error at J2000

Step 2:  node tools/optimize.js optimize <planet> startpos   (for each planet)
         → angleCorrection (derived from longitudePerihelion, not a free param)
         Updates: model-parameters.json (startpos + angleCorrection per planet)
         Verify: Scene perihelion RA = longitudePerihelion exactly (diff < 0.000001°)
         Planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

── Phase 2: Generate input data (manual) ──────────────────────────

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         (Perihelion/precession data for all planets, 29-year steps over full H)
         Menu: Analysis → Export Objects Report

── Phase 3: Earth perihelion & ML training ────────────────────────

Step 4a: python/fit_perihelion_harmonics.py   → PERI_HARMONICS_RAW, PERI_OFFSET
         (Earth perihelion longitude & ERD from file 01)
         Updates: fitted-coefficients.json (auto-updated by script)

Step 4b: python/verify_perihelion_erd.py      → pass/fail verification
         (RMSE, max error, J2000 accuracy, ERD analytical vs numerical)
         Must pass before proceeding — ERD errors propagate into all planet ML predictions.

Note: eocEccentricity and perihelionPhaseOffset are derived analytically in constants.js
      from correctionSun and the eccentricity constants — no pipeline step needed.

Step 4c: python/train_precession.py           → tools/lib/python/coefficients/*_coeffs_unified.py
         (429-term ML coefficients, uses perihelion/ERD as features)
         Updates: coefficients/*_coeffs_unified.py + fitted-coefficients.json (auto-written by script)

Step 4d: python/train_observed.py             → tools/lib/python/coefficients/*_coeffs.py
         (225-term observed coefficients)
         Updates: coefficients/*_coeffs.py + fitted-coefficients.json (auto-written by script)

── Phase 4: Planet positions & corrections ────────────────────────

Step 5a: parallax-correction.js               → PARALLAX_DEC/RA_CORRECTION
         Fits up to 42-parameter RA/Dec correction per planet via cross-validation
         Updates: fitted-coefficients.json (auto-updated by script)

Step 5b: moon-eclipse-optimizer.js            → moonStartposNodal/Apsidal/Moon
         Optimizes Moon's 3 startpos values against 66 solar eclipses (2000–2025)
         Measures Moon-Sun angular separation at each eclipse — should be ~0°
         Updates: model-parameters.json (auto-updated by script)
         Verify: RMS separation < 0.85°, individual eclipses < 2°

         Optional diagnostics (skip in standard refit):
         • eoc-fractions.js — scans EoC fraction for Type III planets. No --write.
           Only re-run if planet orbital elements or EoC architecture changes.
         • ascnode-correction.js — scans ascNodeTiltCorrection. No --write.
           Step 2 already optimizes startpos/angleCorrection.

── Phase 5: Cardinal point harmonics ──────────────────────────────

Step 6a: export-cardinal-points.js            → data/02-cardinal-points.csv
         (runs full scene-graph simulation — depends on all above, ~35 min)

Step 6b: obliquity-harmonics.js               → SOLSTICE_OBLIQUITY_HARMONICS
         Updates: fitted-coefficients.json (auto-updated by script)

Step 6c: cardinal-point-harmonics.js          → CARDINAL_POINT_HARMONICS
         Updates: fitted-coefficients.json (auto-updated by script)

── Phase 6: Year-length harmonics ─────────────────────────────────

Step 7a: export-year-lengths.js               → data/03-year-length-analysis.xlsx
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
         smoothing is intentional for Step 7b harmonic fitting — it
         suppresses noise and lets the Fourier fit focus on long-period
         signals (H/2, H/3, H/8 etc.).

Step 7b: year-length-harmonics.js             → TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS
         Reads data/03-year-length-analysis.xlsx, fits Fourier harmonics.
         Updates: fitted-coefficients.json (auto-updated by script)

── Phase 7: Verify & sync ─────────────────────────────────────────

Step 8:  verify-pipeline.js                   → pass/fail
         Verifies JSON consistency and checks planet baselines against stored
         values in tools/results/baselines.json. Warns on regressions (>0.001°).
         Must pass before syncing to script.js. Add --write to update baselines.

Step 9:  export-to-script.js --write          → src/script.js
         Reads all 4 JSON files and patches corresponding values in script.js.
         Handles: scalar consts, planet properties, arrays (harmonics, Moon tables),
         objects (parallax corrections, cardinal point harmonics).
         Only run after Step 8 passes.
```

Note: `data/03-year-length-analysis.xlsx` is generated by Step 7a (headless, ~90 min
for full H at 29-year steps). Only needs regenerating if H or year-length-affecting
parameters change. Can also be exported from browser (Menu: Analysis → Year Length Report)
but the headless tool is preferred for full H coverage.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | ALL (1→7b) |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `earthtiltMean` | 1, 3→4d, 6a→7b |
| `earthInvPlaneInclinationAmplitude` | 1, 3→4d, 6a→7b |
| `earthInvPlaneInclinationMean` | 3, 6a→7b |
| `correctionSun` | 1, 6a→7b |
| `eccentricityBase` / `eccentricityAmplitude` | 1, 3→4a, 6a→7b |
| `correctionDays` | 3, 6a→7b |
| `useVariableSpeed` | ALL (1→7b) |
| Planet `startpos` | 2 (re-solve angleCorrection), 5 |
| Planet `eocFraction` | 3, 5 |
| Planet `solarYearInput` | 2, 4c→4d, 5 |
| Planet `orbitalEccentricityBase` | 2, 5 |

## How to run

All scripts default to **dry run** (print only). Add `--write` to update JSON files.
Run `export-to-script.js --write` to sync JSON values to `src/script.js`.
This can be done after each `--write` step, or once at the end — it patches all diffs in one pass.

### Automated pipeline runner

Instead of running each step manually, use `run-pipeline.js`:

```bash
node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~15 sec)
node tools/fit/run-pipeline.js --phase2        # Steps 4a-9 (~2.5 hrs, requires Step 3 data)
node tools/fit/run-pipeline.js --all           # Steps 1-2, then 4a-9
node tools/fit/run-pipeline.js --from 5        # Resume from Step 5 onwards
```

Output is logged to `tools/fit/pipeline.log`. Stops on any step failure.
Step 3 (browser export) is always manual — the runner checks the data file exists.

### Manual step-by-step

```bash
# Phase 1: Sun optimizer & planet alignment
node tools/optimize.js optimize sun correctionSun --write                    # Step 1
node tools/optimize.js optimize mercury startpos --write                     # Step 2
node tools/optimize.js optimize venus startpos --write                       # Step 2
node tools/optimize.js optimize mars startpos --write                        # Step 2
node tools/optimize.js optimize jupiter startpos --write                     # Step 2
node tools/optimize.js optimize saturn startpos --write                      # Step 2
node tools/optimize.js optimize uranus startpos --write                      # Step 2
node tools/optimize.js optimize neptune startpos --write                     # Step 2

# Phase 2: Generate input data (manual)
# Export from browser: Analysis → Export Objects Report                      # Step 3
# Save as data/01-holistic-year-objects-data.xlsx

# Phase 3: Earth perihelion & ML training
python3 tools/fit/python/fit_perihelion_harmonics.py --write                 # Step 4a
python3 tools/fit/python/verify_perihelion_erd.py                            # Step 4b (must pass)
python3 tools/fit/python/train_precession.py --write                         # Step 4c
python3 tools/fit/python/train_observed.py --write                           # Step 4d

# Phase 4: Planet positions & corrections
node tools/fit/parallax-correction.js --write                                # Step 5a
node tools/fit/moon-eclipse-optimizer.js --write                             # Step 5b
# node tools/fit/eoc-fractions.js              # optional diagnostic
# node tools/fit/ascnode-correction.js          # optional diagnostic

# Phase 5: Cardinal point harmonics
node tools/fit/export-cardinal-points.js                                     # Step 6a (~35 min)
node tools/fit/obliquity-harmonics.js --write                                # Step 6b
node tools/fit/cardinal-point-harmonics.js --write                           # Step 6c

# Phase 6: Year-length harmonics
node tools/fit/export-year-lengths.js                                        # Step 7a (~90 min)
node tools/fit/year-length-harmonics.js --write                              # Step 7b

# Phase 7: Verify & sync
node tools/fit/verify-pipeline.js                                            # Step 8 (must pass)
node tools/fit/verify-pipeline.js --write                                    # update baselines.json
node tools/fit/export-to-script.js --write                                   # Step 9 (only after Step 8 passes)
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

Fitting scripts write to JSON, then export-to-script.js (Step 9) syncs to script.js:
    fit_perihelion_harmonics.py  → fitted-coefficients.json  (Step 4a)
    train_precession.py          → fitted-coefficients.json  (Step 4c)
    train_observed.py            → fitted-coefficients.json  (Step 4d)
    parallax-correction.js       → fitted-coefficients.json  (Step 5a)
    moon-eclipse-optimizer.js    → model-parameters.json     (Step 5b)
    obliquity-harmonics.js       → fitted-coefficients.json  (Step 6b)
    cardinal-point-harmonics.js  → fitted-coefficients.json  (Step 6c)
    year-length-harmonics.js     → fitted-coefficients.json  (Step 7b)
    optimize.js                  → model-parameters.json     (Steps 1, 2)
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
