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
| `derive-eccentricity-amplitudes.js` | `eccentricityAmplitudeK`, per-planet `orbitalEccentricityAmplitude` + `eccentricityPhaseJ2000` | Derived from Earth's K constant |
| `export-solar-measurements.js` | `data/02-solar-measurements.csv` | Scene-graph simulation (1-year steps, single pass) |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (16 terms) | `data/02-solar-measurements.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×24 terms) + anchors | `data/02-solar-measurements.csv` |
| `year-length-harmonics.js` | `TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS` | `data/02-solar-measurements.csv` |
| `eoc-fractions.js` | Per-planet `eocFraction` | `data/reference-data.json` |
| `parallax-correction.js` | `PARALLAX_DEC/RA_CORRECTION` (up to 78p inner / 68p outer) | `data/reference-data.json` |
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
| `reclassify-tiers.js` | Tier reclassification + JPL enrichment of Tier 1 data | `data/reference-data.json` |
| `verify-pipeline.js` | Pass/fail verification of all 9 targets + correction stack | Scene-graph simulation |

Note: `eoc-constants.js` and `perihelion-offset.js` are **informational/exploratory** only —
`eocEccentricity` and `perihelionPhaseOffset` are already derived analytically in `constants.js`
and require no pipeline step.

## Dependency chain

When model parameters change, refit in this order. The logic:
1. Sun optimizer must run first — it derives the exact Earth geometry constants
   (eccentricityBase, eccentricityAmplitude, obliquity, perihelion longitude)
2. Planet angleCorrection must be solved next — it aligns each planet's perihelion
3. Only after Steps 1–2 is the simulation state correct enough to export input data
4. Earth's perihelion/ERD must be correct before planet ML predictions (4a→4d)
5. Parallax corrections are a final layer on top of scene-graph positions
6. Solar measurements (cardinal points, perihelion/aphelion, world-angles) come
   from a single scene-graph pass at 1-year steps (depends on everything above).
   Fitting scripts downsample by `stepYears` for efficiency.
7. Tropical year is derived from cardinal point harmonics (no separate step)
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
         Iterative solver: obliquity + perihelion longitude constraints
         converge simultaneously (typically 1 pass).
         Updates: model-parameters.json (5 Earth orbital constants)
         Verify: RMS < 0.004°, perihelion longitude < 0.01" from IAU

Step 2:  node tools/optimize.js optimize <planet> startpos   (for each planet)
         → angleCorrection (derived from longitudePerihelion, not a free param)
         Updates: model-parameters.json (startpos + angleCorrection per planet)
         Verify: Scene perihelion RA = longitudePerihelion exactly (diff < 0.000001°)
         Planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

── Phase 2: Generate input data (manual) ──────────────────────────

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         (Perihelion/precession data for all planets, 1-year steps over full H)
         Menu: Analysis → Export Objects Report

── Phase 3: Earth perihelion & ML training ────────────────────────

Step 4a: python/fit_perihelion_harmonics.py   → PERI_HARMONICS_RAW, PERI_OFFSET
         (Earth perihelion longitude & ERD from file 01)
         Downsampled by stepYears for efficiency.
         Updates: fitted-coefficients.json (auto-updated by script)

Step 4b: python/verify_perihelion_erd.py      → pass/fail verification
         (RMSE, max error, J2000 accuracy, ERD analytical vs numerical)
         Must pass before proceeding — ERD errors propagate into all planet ML predictions.

Note: eocEccentricity and perihelionPhaseOffset are derived analytically in constants.js
      from correctionSun and the eccentricity constants — no pipeline step needed.

Step 4c: python/train_precession.py           → tools/lib/python/coefficients/*_coeffs_unified.py
         (429-term ML coefficients, uses perihelion/ERD as features)
         Downsampled by stepYears for efficiency.
         Updates: coefficients/*_coeffs_unified.py + fitted-coefficients.json (auto-written by script)

Step 4d: python/train_observed.py             → tools/lib/python/coefficients/*_coeffs.py
         (225-term observed coefficients)
         Updates: coefficients/*_coeffs.py + fitted-coefficients.json (auto-written by script)

── Phase 4: Planet positions & corrections ────────────────────────

Step 5a: parallax-correction.js               → PARALLAX_DEC/RA_CORRECTION
         Fits up to 78-parameter RA/Dec correction per planet via cross-validation.
         Uses prepareForFitting() to disable parallax layer.
         Updates: fitted-coefficients.json (auto-updated by script)

Step 5b: gravitation-correction.js            → GRAVITATION_CORRECTION + ELONGATION_CORRECTION
         Two-stage post-parallax correction:
         1. Synodic gravitation terms (sin/cos at per-planet periods)
         2. Elongation offset correction (21 basis functions for Mercury/Venus/Mars)
         Uses prepareForFitting() to disable gravitation + elongation layers.
         Updates: fitted-coefficients.json (auto-updated by script)

         Optional diagnostics (skip in standard refit):
         • eoc-fractions.js — scans EoC fraction for Type III planets. No --write.
           Only re-run if planet orbital elements or EoC architecture changes.
         • ascnode-correction.js — scans ascNodeTiltCorrection. No --write.
           Step 2 already optimizes startpos/angleCorrection.

Step 5c: moon-eclipse-optimizer.js            → moonStartposNodal/Apsidal/Moon
         Optimizes Moon's 3 startpos values against 66 solar eclipses (2000–2025)
         Measures Moon-Sun angular separation at each eclipse — should be ~0°
         Independent of the planet correction stack (Steps 5a/5b).
         Updates: model-parameters.json (auto-updated by script)
         Verify: RMS separation < 0.85°, individual eclipses < 2°

── Phase 5: Solar measurements & harmonic fits ─────────────────────

Step 6a: export-solar-measurements.js         → data/02-solar-measurements.csv
         Single-pass scene-graph simulation (~80 min) measuring:
         - Cardinal points: SS (max dec), WS (min dec), VE (dec=0↑), AE (dec=0↓)
         - Perihelion (min wobble-center distance), Aphelion (max distance)
         - World-angle (sidereal position) at each event
         1-year steps over full H. All 6 event types use computeSunPositionFast().
         Output columns: Type, Model Year, JD, RA, Obliquity, World Angle, Distance
         Test range: --start -25000 --end 25000

Step 6b: obliquity-harmonics.js               → SOLSTICE_OBLIQUITY_HARMONICS
         Reads SS obliquity from 02-solar-measurements.csv (downsampled by stepYears).
         16 harmonics, RMSE 0.004", J2000-anchored (exact IAU obliquity).
         Updates: fitted-coefficients.json (auto-updated by script)

Step 6c: cardinal-point-harmonics.js          → CARDINAL_POINT_HARMONICS + ANCHORS
         Reads SS/WS/VE/AE JDs from 02-solar-measurements.csv (downsampled by stepYears).
         24 self-corrected harmonics per type, RMSE 0.03-0.05 min.
         Data-anchored at closest JD to IAU J2000 value, then derived to J2000.
         Tropical year = mean of 4 cardinal point derivatives (no separate step).
         Updates: fitted-coefficients.json (auto-updated by script)

Step 6d: year-length-harmonics.js             → TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS
         Computes year lengths from raw events in 02-solar-measurements.csv:
         - Tropical: mean of 4 cardinal point JD intervals
         - Sidereal: world-angle advancement at cardinal points
         - Anomalistic: mean of perihelion + aphelion intervals
         All downsampled by stepYears. RMSE: tropical 0.002s, sidereal 0.001s,
         anomalistic 0.002s over full H.
         Updates: fitted-coefficients.json (auto-updated by script)

── Phase 5b: Eccentricity amplitudes & balance law verification ──

Step 7a: derive-eccentricity-amplitudes.js    → orbitalEccentricityAmplitude, eccentricityPhaseJ2000
         Derives K from Earth's parameters (eccentricityAmplitude, massFraction,
         earthtiltMean, d=3), then computes per-planet eccentricity amplitudes
         and J2000 phase angles. Must run after Step 1 (which sets Earth's
         eccentricityAmplitude) and before Step 7b (balance verification).
         Updates: model-parameters.json (K + 7 planet amplitudes + phases)

Step 7b: verify-laws.js                       → pass/fail
         Verifies Laws 2 (inclination amplitude), 3 (inclination balance),
         and 5 (eccentricity balance). All must pass.
         eccentricity-balance.js              → convergence report
         Laws 4 and 5 independently predict Saturn's eccentricity.
         balance-search.js                    → balance-presets.json
         Exhaustive search for configs with ≥99.994% balance.

── Phase 6: Verify & sync ─────────────────────────────────────────

Step 8:  verify-pipeline.js                   → pass/fail
         Verifies JSON consistency, earth geometry at J2000 (obliquity, obliquity
         rate, perihelion longitude, e(J2000), all year lengths by formula, cardinal
         point JDs), and checks planet baselines against stored values in
         tools/results/baselines.json. Warns on regressions (>0.001°).
         Must pass before syncing to script.js. Add --write to update baselines.

Step 9:  export-to-script.js --write          → src/script.js
         Reads all 4 JSON files + balance-presets.json and patches script.js.
         Handles: scalar consts, planet properties, arrays (harmonics, Moon tables),
         objects (parallax corrections, cardinal point harmonics + anchors),
         balance presets (from data/balance-presets.json).
         Only run after Step 8 passes.

── Phase 7: Dashboard ─────────────────────────────────────────────

Step 10: node tools/export-dashboard-data.js  → dashboard/data/*.json
         Exports orbital elements, sky positions, and Earth predictions
         for the dashboard visualizations. Uses stepYears intervals.
```

Note: `data/02-solar-measurements.csv` is generated by Step 6a (~80 min for full H at 1-year steps).
It contains all solar events (cardinal points + perihelion/aphelion) with world-angles.
All downstream fitting steps (6b-6d) read from this single CSV and downsample by `stepYears`
(currently 23) — no separate exports needed.
Tropical year harmonics are fitted alongside sidereal and anomalistic (Step 6d).
The cardinal-point-derived tropical year (Step 6c) is the authoritative runtime version.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | ALL (1→10) |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `earthtiltMean` | 1, 3→4d, 6a→6d |
| `earthInvPlaneInclinationAmplitude` | 1, 3→4d, 6a→6d |
| `earthInvPlaneInclinationMean` | 3, 6a→6d |
| `correctionSun` | 1, 6a→6d |
| `eccentricityBase` / `eccentricityAmplitude` | 1, 3→4a, 6a→6d |
| `correctionDays` | 3, 6a→6d |
| `useVariableSpeed` | ALL (1→10) |
| Planet `startpos` | 2 (re-solve angleCorrection), 5 |
| Planet `eocFraction` | 3, 5 |
| Planet `solarYearInput` | 2, 4c→4d, 5 |
| Planet `orbitalEccentricityBase` | 2, 5 |
| `perihelionalignmentYear` | 1, 3→4a, 6a→6d |
| `stepYears` | Must divide H evenly. Affects 4a→4d, 6a→6d (downsampling) |
| `siderealYearJ2000` (in yearLengthRef) | Derived: `meansiderealyearlengthinSeconds = siderealYearJ2000 × 86400` |

**When H changes:** Update `holisticyearLength` in `model-parameters.json`.
Also update `stepYears` to a value that divides H evenly (factorize H to find options).
All derived values (balancedYear, meanSolarYearDays, cycle periods, etc.) are
computed automatically in `constants.js` — no per-script updates needed.

Current: H=335,317 (= 23 × 61 × 239), stepYears=23.

## How to run

All scripts default to **dry run** (print only). Add `--write` to update JSON files.
Run `export-to-script.js --write` to sync JSON values to `src/script.js`.
This can be done after each `--write` step, or once at the end — it patches all diffs in one pass.

### Automated pipeline runner

Instead of running each step manually, use `run-pipeline.js`:

```bash
node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~15 sec)
node tools/fit/run-pipeline.js --phase2        # Steps 4a-10 (~2.5 hrs, requires Step 3 data)
node tools/fit/run-pipeline.js --all           # Steps 1-2, then 4a-10
node tools/fit/run-pipeline.js --from 5a       # Resume from Step 5a onwards
node tools/fit/run-pipeline.js --iterate 20    # Repeat Steps 5a-5b 20 times
node tools/fit/run-pipeline.js --converge      # Repeat Steps 5a-5b until improvement < 0.001°
```

Output is logged to `tools/results/pipeline.log`. Stops on any step failure.
Step 3 (browser export) is always manual — the runner checks the data file exists.

The `--iterate` / `--converge` flags repeat the planet correction fitting steps (5a parallax →
5b gravitation + elongation) iteratively. Each pass, the parallax sees cleaner residuals
and reallocates its terms, allowing the elongation correction to capture more signal.
Typically converges in 15-20 passes. Venus improves from ~0.10° to ~0.05°.
The Moon step (5c) runs once after the iteration completes.

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
node tools/fit/gravitation-correction.js --write                             # Step 5b
# node tools/fit/eoc-fractions.js              # optional diagnostic
# node tools/fit/ascnode-correction.js          # optional diagnostic
node tools/fit/moon-eclipse-optimizer.js --write                             # Step 5c

# Phase 5: Solar measurements & harmonic fits
node tools/fit/export-solar-measurements.js                                  # Step 6a (~80 min)
node tools/fit/obliquity-harmonics.js --write                                # Step 6b
node tools/fit/cardinal-point-harmonics.js --write                           # Step 6c
node tools/fit/year-length-harmonics.js --write                              # Step 6d

# Phase 5b: Balance law verification
node tools/verify/verify-laws.js                                             # Step 7 (must pass)
node tools/verify/eccentricity-balance.js                                    # Step 7 (convergence report)
node tools/verify/balance-search.js                                          # Step 7 (balance presets)

# Phase 6: Verify & sync
node tools/fit/verify-pipeline.js                                            # Step 8 (must pass)
node tools/fit/verify-pipeline.js --write                                    # update baselines.json
node tools/fit/export-to-script.js --write                                   # Step 9 (only after Step 8 passes)

# Phase 7: Dashboard
node tools/export-dashboard-data.js                                          # Step 10
```

## Where outputs are stored

| Output type | Location |
|-------------|----------|
| Model parameters (JSON) | `public/input/model-parameters.json` ← single source of truth |
| Fitted coefficients (JSON) | `public/input/fitted-coefficients.json` ← single source of truth |
| ML coefficients (Python) | `tools/lib/python/coefficients/*_coeffs*.py` |
| Browser simulation | `src/script.js` ← patched by `export-to-script.js` |
| Solar measurements (CSV) | `data/02-solar-measurements.csv` (1-year steps, ~120 MB) |
| Browser export (Excel) | `data/01-holistic-year-objects-data.xlsx` (1-year steps, ~300 MB) |
| Dashboard data | `dashboard/data/*.json` |

Note: Large data files (>100 MB) are excluded from git via `.gitignore`.
They are generated locally by steps 3 and 6a.

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
    gravitation-correction.js    → fitted-coefficients.json  (Step 5b)
    moon-eclipse-optimizer.js    → model-parameters.json     (Step 5c)
    obliquity-harmonics.js       → fitted-coefficients.json  (Step 6b)
    cardinal-point-harmonics.js  → fitted-coefficients.json  (Step 6c)
    year-length-harmonics.js     → fitted-coefficients.json  (Step 6d)
    optimize.js                  → model-parameters.json     (Steps 1, 2)
    balance-search.js            → data/balance-presets.json  (Step 7)
```

## Correction Stack

Planet positions go through 4 correction layers after the raw scene-graph computation.
The architecture is managed by `tools/lib/correction-stack.js` with `prepareForFitting()`
to safely disable layers during fitting.

**Layers:** Parallax (78p) → Gravitation → Elongation (21p) → Moon Meeus

Steps 5a and 5b use `prepareForFitting()` which disables the target layer(s) so the
fitter sees residuals without its own layer's contribution.

For full details see [docs/71 — Correction Stack Architecture](../../docs/71-correction-stack-architecture.md).

## Python-Node.js bridge

Python scripts cannot parse JavaScript directly. Instead, `load_constants.py` calls
`_dump_constants.js` via `subprocess`, which runs Node.js to load `constants.js` and
outputs all constants as JSON to stdout. Python reads this JSON, so all Python scripts
automatically use the same values as the Node.js tooling — no manual sync needed.

All Python scripts that read the Excel data downsample by `stepYears` (read from
constants) for fitting efficiency. This gives the same RMSE as the full dataset but runs much faster.

## Related documentation

- [Predictive Formula Guide](../lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — ML architecture, feature matrix (429 terms), how to extend
- [Solstice Prediction](../../docs/14-solstice-prediction.md) — Cardinal point harmonics, obliquity formula derivation
- [Equation of Center](../../docs/65-equation-of-center.md) — EoC derivation and constants
- [Parallax Corrections](../../docs/67-planet-parallax-corrections.md) — Parallax correction formula and tiers
- [Correction Stack Architecture](../../docs/71-correction-stack-architecture.md) — Layer ordering, prepareForFitting()
