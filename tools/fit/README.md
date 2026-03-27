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
| `export-solar-measurements.js` | `data/02-solar-measurements.csv` | Scene-graph simulation (single pass) |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (16 terms) | `data/02-solar-measurements.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×24 terms) | `data/02-solar-measurements.csv` |
| `year-length-harmonics.js` | `SIDEREAL/ANOMALISTIC_YEAR_HARMONICS` | `data/02-solar-measurements.csv` |
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
2. Planet angleCorrection must be solved next — it aligns each planet's perihelion
3. Only after Steps 1–2 is the simulation state correct enough to export input data
4. Earth's perihelion/ERD must be correct before planet ML predictions (4a→4d)
5. Parallax corrections are a final layer on top of scene-graph positions
6. Solar measurements (cardinal points, perihelion/aphelion, world-angles) come
   from a single scene-graph pass (depends on everything above)
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
         Updates: model-parameters.json (5 Earth orbital constants)
         Verify: RMS < 0.004°, solstice timing < 1 sec error at J2000

Step 2:  node tools/optimize.js optimize <planet> startpos   (for each planet)
         → angleCorrection (derived from longitudePerihelion, not a free param)
         Updates: model-parameters.json (startpos + angleCorrection per planet)
         Verify: Scene perihelion RA = longitudePerihelion exactly (diff < 0.000001°)
         Planets: mercury, venus, mars, jupiter, saturn, uranus, neptune

── Phase 2: Generate input data (manual) ──────────────────────────

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         (Perihelion/precession data for all planets, stepYears-year steps over full H)
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
         Fits up to 48-parameter RA/Dec correction per planet via cross-validation.
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
         Single-pass scene-graph simulation (~50 min) measuring:
         - Cardinal points: SS (max dec), WS (min dec), VE (dec=0↑), AE (dec=0↓)
         - Perihelion (min wobble-center distance), Aphelion (max distance)
         - World-angle (sidereal position) at each event
         All 6 event types use computeSunPositionFast() for ~5x speedup.
         Output columns: Type, Model Year, JD, RA, Obliquity, World Angle, Distance
         Default: full H at stepYears-year steps.

Step 6b: obliquity-harmonics.js               → SOLSTICE_OBLIQUITY_HARMONICS
         Reads SS obliquity from 02-solar-measurements.csv.
         16 harmonics, RMSE 0.004", J2000-anchored (exact IAU obliquity).
         Updates: fitted-coefficients.json (auto-updated by script)

Step 6c: cardinal-point-harmonics.js          → CARDINAL_POINT_HARMONICS
         Reads SS/WS/VE/AE JDs from 02-solar-measurements.csv.
         24 self-corrected harmonics per type, RMSE 0.05-0.10 min.
         IAU J2000 anchors (exact at year 2000).
         Tropical year = mean of 4 cardinal point derivatives (no separate step).
         Updates: fitted-coefficients.json (auto-updated by script)

Step 6d: year-length-harmonics.js --type sidereal    → SIDEREAL_YEAR_HARMONICS
         Reads world-angles at cardinal point JDs from 02-solar-measurements.csv.
         Sidereal year = days × 360° / Δ(world-angle), measured at the same
         physical events as the tropical year for consistency.
         Updates: fitted-coefficients.json (auto-updated by script)

Step 6e: year-length-harmonics.js --type anomalistic → ANOMALISTIC_YEAR_HARMONICS
         Reads PERI/APH JDs from 02-solar-measurements.csv.
         Anomalistic year = (peri interval + aph interval) / 2 / step.
         Averaging peri + aph cancels EoC variable-speed bias.
         Updates: fitted-coefficients.json (auto-updated by script)

── Phase 6: Verify & sync ─────────────────────────────────────────

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

Note: `data/02-solar-measurements.csv` is generated by Step 6a (~50 min for full H).
It contains all solar events (cardinal points + perihelion/aphelion) with world-angles.
All downstream fitting steps (6b-6e) read from this single CSV — no separate exports needed.
Tropical year harmonics are derived from cardinal point harmonics (Step 6c), not fitted separately.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | ALL (1→6e) + update `stepYears` in model-parameters.json |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `earthtiltMean` | 1, 3→4d, 6a→6e |
| `earthInvPlaneInclinationAmplitude` | 1, 3→4d, 6a→6e |
| `earthInvPlaneInclinationMean` | 3, 6a→6e |
| `correctionSun` | 1, 6a→6e |
| `eccentricityBase` / `eccentricityAmplitude` | 1, 3→4a, 6a→6e |
| `correctionDays` | 3, 6a→6e |
| `useVariableSpeed` | ALL (1→6e) |
| Planet `startpos` | 2 (re-solve angleCorrection), 5 |
| Planet `eocFraction` | 3, 5 |
| Planet `solarYearInput` | 2, 4c→4d, 5 |
| Planet `orbitalEccentricityBase` | 2, 5 |

**When H changes:** The step size must divide H/16 evenly. Update `stepYears` in
`public/input/model-parameters.json` (foundational section). All export scripts read
this value automatically via `constants.js` — no per-script updates needed.

The following derived values are also computed automatically in `constants.js`:
- `gridYear` — nearest step-aligned year to J2000 (= `balancedYear + round((2000 - balancedYear) / stepYears) × stepYears`)
- `gridYearDeltaFromJ2000` — offset from J2000 (may be non-zero if steps don't land on 2000)
- `cardinalPointYearFractions` — SS/WS/VE/AE year fractions adjusted for `startmodelYear` epoch offset
- `iauObliquityAtGrid` — IAU obliquity shifted from J2000 to grid year
- `cardinalPointAnchorsAtGrid` — cardinal point JD anchors shifted from J2000 to grid year

Step 3 (browser export) must also use a matching step size.

Current: H=334,992, stepYears=21 (H/16=20,937, gridYear=1991.5).

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
node tools/fit/export-solar-measurements.js                                  # Step 6a (~50 min)
node tools/fit/obliquity-harmonics.js --write                                # Step 6b
node tools/fit/cardinal-point-harmonics.js --write                           # Step 6c
node tools/fit/year-length-harmonics.js --write --type sidereal              # Step 6d
node tools/fit/year-length-harmonics.js --write --type anomalistic           # Step 6e

# Phase 6: Verify & sync
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
| Training data (CSV) | `data/02-solar-measurements.csv` |

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
    year-length-harmonics.js     → fitted-coefficients.json  (Steps 6d, 6e)
    optimize.js                  → model-parameters.json     (Steps 1, 2)
```

## Correction Stack

Planet positions go through 4 correction layers after the raw scene-graph computation.
The architecture is managed by `tools/lib/correction-stack.js` with `prepareForFitting()`
to safely disable layers during fitting.

**Layers:** Parallax (68p) → Gravitation → Elongation (21p) → Moon Meeus

Steps 5a and 5b use `prepareForFitting()` which disables the target layer(s) so the
fitter sees residuals without its own layer's contribution.

For full details see [docs/71 — Correction Stack Architecture](../../docs/71-correction-stack-architecture.md).

## Python-Node.js bridge

Python scripts cannot parse JavaScript directly. Instead, `load_constants.py` calls
`_dump_constants.js` via `subprocess`, which runs Node.js to load `constants.js` and
outputs all constants as JSON to stdout. Python reads this JSON, so all Python scripts
automatically use the same values as the Node.js tooling — no manual sync needed.

## Related documentation

- [Predictive Formula Guide](../lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — ML architecture, feature matrix (429 terms), how to extend
- [Solstice Prediction](../../docs/14-solstice-prediction.md) — Cardinal point harmonics, obliquity formula derivation
- [Equation of Center](../../docs/65-equation-of-center.md) — EoC derivation and constants
- [Parallax Corrections](../../docs/67-planet-parallax-corrections.md) — Parallax correction formula and tiers
- [Correction Stack Architecture](../../docs/71-correction-stack-architecture.md) — Layer ordering, prepareForFitting()
