# Fitting & Derivation Scripts

All scripts that produce fitted coefficients or derived constants live here.
Output values are stored in `public/input/fitted-coefficients.json`.

## Design rule for scene-graph corrections

**Any correction added to the framework's motion model (scene-graph rotations
in `moveModel` or `tools/lib/scene-graph.js`) MUST be harmonic on H-lattice
divisors. NO polynomial-in-T terms.**

Concrete form: a correction must be expressible as

```
Σ Aₙ·sin(2π·t/(H/n)) + Bₙ·cos(2π·t/(H/n))     for integer n
```

where each n is an integer that ties to a known physical cycle (Earth annual
= H, its harmonics 2H, 3H, planet perihelion period H/m for m matching the
planet's lattice integer, etc.). Arbitrary fit frequencies and DC offsets
are NOT allowed.

**Why:** the framework is fundamentally cyclic — every period is H, a
multiple of H, or H/N for integer N. The deep-time claim is that the *same
lattice* describes motion across the full Solar System Resonance Cycle
(2.68 Myr). Polynomial-in-T corrections (T, T², T³, …) are not cyclic:
they grow without bound, compound across epochs, and silently destroy
the framework's structural claims.

**Failure case (2026-06):** A `+0.0003032·T_jc²` polynomial was added to the
Sun's scene-graph angle (intended to match Meeus Ch.25 secular drift). It
gives ~arcseconds at modern epochs but reaches ~30,000° (~83 rotations) at
±10 Myr. Visible symptom: Sun displaced from planet-orbit center because
the correction was applied only to the Sun, not to planets — disabled in
4 locations and documented in `feedback_no_polynomial_corrections.md`.
The accompanying `SUN_LONGITUDE_HARMONICS` 4th term (divisor=168, period
1996 yr) had `gcd(168, H) = 1` — also a violation of this rule. **Status
2026-06 (Phase Z-B):** The Sun harmonic correction has been RE-ENABLED with
the H-lattice filter applied at runtime — the [168] term is automatically
skipped, only the 3 year-multiple terms (1 yr, ½ yr, ⅓ yr) and any future
lunar-precession or small-precession-divisor terms are applied. Sun-only
application (NOT barycenter) keeps planet baselines pristine. See Step 0.

**Allowed exception:** standalone consumer-side calls (e.g. `_eclSunLon`
for one-off eclipse longitude reads) MAY keep Meeus polynomial terms —
they are short-window calculations consumed at a single epoch, not part
of the cyclic scene-graph motion.

## `--write` flag convention

All fitting scripts support **dry run** by default (print results only).
Add `--write` to actually update the JSON source-of-truth files.
After all steps complete, run `verify-pipeline.js` (Step 8) to check for regressions,
then `export-to-script.js --write` (Step 9) to sync values to `src/script.js`.

## Scripts

| Script | Produces | Data source |
|--------|----------|-------------|
| `derive-eccentricity-amplitudes.js` | Verification only (no output) | Verifies K-derived amplitudes match runtime |
| `export-solar-measurements.js` | `data/02-solar-measurements.csv` | Scene-graph simulation (1-year steps, single pass) |
| `obliquity-harmonics.js` | `SOLSTICE_OBLIQUITY_HARMONICS` (16 terms) | `data/02-solar-measurements.csv` |
| `cardinal-point-harmonics.js` | `CARDINAL_POINT_HARMONICS` (4×24 terms) + anchors | `data/02-solar-measurements.csv` |
| `year-length-harmonics.js` | `TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS` | `data/02-solar-measurements.csv` |
| `sun-longitude-harmonics.js` | `SUN_LONGITUDE_MEAN`, `SUN_LONGITUDE_HARMONICS` (H-lattice terms; **see design rule above** — only divisors n where H/n maps to a known physical cycle are allowed) | Scene-graph Sun vs Meeus Ch.25 (computed in-script, no CSV). **Status 2026-06 (Phase Z-B): ENABLED** — Sun-only application with runtime H-lattice filter (skips legacy [168] term automatically). Closes ~96% of the framework's 200" Sun-vs-Meeus residual. |
| `eoc-fractions.js` | Per-planet `eocFraction` | `data/reference-data.json` |
| `parallax-correction.js` | `PARALLAX_DEC/RA_CORRECTION` (up to 78p inner / 68p outer) | `data/reference-data.json` |
| `parallax-greedy-select.js` | Candidate basis terms for parallax | `data/reference-data.json` |
| `ascnode-correction.js` | `ascNodeTiltCorrection`, `startpos` | `data/reference-data.json` |
| `moon-eclipse-optimizer.js` | `moonStartposNodal/Apsidal/Moon` | 66 solar eclipses (2000–2025) — run separately, not part of standard pipeline |
| `python/fit_perihelion_harmonics.py` | `PERI_HARMONICS_RAW`, `PERI_OFFSET` | `data/01-holistic-year-objects-data.xlsx` |
| `python/verify_perihelion_erd.py` | pass/fail verification (exits 0=pass, 1=fail) | `data/01-holistic-year-objects-data.xlsx` |
| `python/train_precession_physical.py` | `PREDICT_COEFFS_PHYSICAL` (~2421 terms × 7 planets) | `data/01-holistic-year-objects-data.xlsx` |
| `python/train_observed.py` | Observed coefficients (225/328 terms × 7 planets) | `data/01-holistic-year-objects-data.xlsx` |
| `python/greedy_features_physical.py` | Candidate features for ML (physical-beat basis) | `data/01-holistic-year-objects-data.xlsx` |
| `python/planet_eccentricity_jpl.py` | Planet `orbitalEccentricityBase` values | JPL Horizons (cached in `data/`) |
| `../../scripts/fibonacci_significance.py` | `data/significance-results.json` (combined p + sigma via Stouffer's Z with correlation correction; Fisher's reported for transparency; 11 tests × 3 null distributions) | `tools/lib/python/constants_scripts.py` |
| `export-to-script.js` | Syncs all JSON values → `src/script.js` | All 4 JSON files in `public/input/` |
| `export-to-holistic.js` | Syncs all values → Holistic website repo (manual, not in pipeline) | `fitted-coefficients.json` + `model-parameters.json` + `data/balance-presets.json` + `data/significance-results.json` |
| `reclassify-tiers.js` | Tier reclassification + JPL enrichment of Tier 1 data | `data/reference-data.json` |
| `verify-pipeline.js` | Pass/fail verification of all 9 targets + correction stack | Scene-graph simulation |

Note: `eocEccentricity` and `perihelionPhaseOffset` are derived analytically in
`constants.js` and require no pipeline step. The historical numerical-verification
scripts (`eoc-constants.js`, `perihelion-offset.js`) now live in
[`tools/explore/`](../explore/).

## Dependency chain

When model parameters change, refit in this order. The logic:
0. **Step 0 (Sun longitude harmonics) runs FIRST as a prerequisite.** The
   harmonics capture a structural property of the framework (the ~8%
   eccentricity-definition gap between the framework's
   `eccentricityDerivedMean` and Meeus IAU). They shift the scene-graph
   Sun by up to ±49" at Jan/Jul, so every downstream step needs to see
   them already applied. Running Step 0 first means Steps 1 → 5a → 5b
   all calibrate against the corrected Sun frame in a single pass.
   The coefficients themselves are stable across normal refits — re-run
   Step 0 only when H, the eccentricity definition, or the Meeus
   reference changes.
1. Sun optimizer (Step 1) runs second — with Step 0's harmonics already
   applied, correctionSun calibration converges directly to the optimal
   value (no need to re-run to absorb a harmonic shift later).
   Derives the exact Earth geometry constants (eccentricityBase,
   eccentricityAmplitude, obliquity, perihelion longitude).
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
9. The Sun T² polynomial correction (Meeus Ch.25 +0.0003032°/T²) that
   formerly paired with the Sun harmonics has been **REMOVED 2026-06**
   per the H-lattice design rule (polynomial-in-T terms grow without
   bound at deep time and destroy the lattice claim). See the design
   rule near the top of this README.

```
── Phase 0: Pre-fit Sun harmonic structure (prerequisite, run once) ──

Step 0:  node tools/fit/sun-longitude-harmonics.js --write
         → SUN_LONGITUDE_MEAN, SUN_LONGITUDE_HARMONICS
         Captures the STRUCTURAL Sun residual (framework
         eccentricityDerivedMean ≈ 0.01545 vs Meeus IAU 0.01671 — an ~8%
         definitional gap that propagates through 2e·sin(M) to produce a
         ~280" annual harmonic). The fitted coefficients are a fixed
         property of the framework, not of any single calibration round.

         Why this is "Step 0" rather than a regular fitting step:
         - Coefficients are stable across normal refits — re-run only
           when H, the eccentricity definition, or the underlying physics
           reference (Meeus Ch.25) changes. (Same "stable across normal
           refits" pattern as fibonacci_significance.py / Step 7d.)
         - Running it FIRST means Step 1 calibrates correctionSun with
           harmonics already applied → single-pass convergence. If 6f
           ran after Step 1 (legacy order), Step 1 would need to re-run
           to absorb the ~3" shift introduced by the harmonics' annual
           swing at the Jan/Jul calibration dates.
         - It does NOT depend on Steps 1-2 having been refreshed: the
           existing correctionSun from any prior round is a good enough
           sampling base (a small correctionSun offset only shifts the
           residual's MEAN component, not the amplitude coefficients).

         For a clean fresh fit, disable existing harmonics first so the
         fitter samples the RAW residual rather than the post-correction
         (near-zero) residual:
           SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write

         Output: ~7" RMS scene-graph Sun vs Meeus Ch.25 in the modern
         window (down from 198" raw). Three H-lattice-compliant terms
         survive the runtime filter (1 yr, ½ yr, ⅓ yr); legacy [168]
         term is silently filtered. See "Step 6f legacy reference"
         further below for the full Phase Z-B technical detail (active
         coefficients, architecture choice, A/B toggle, refit caveats).

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

Step 2-sync: node tools/fit/export-to-script.js --write
         After Steps 1–2, sync model-parameters.json changes (startpos,
         angleCorrection, and any modified Fibonacci fractions) to src/script.js.
         The browser simulation reads from script.js, so this sync is REQUIRED
         before Step 3's browser export — otherwise Step 3 will use the old
         pre-optimization values.

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         (Perihelion/precession data for all planets, 1-year steps over full H)
         Menu: Analysis → Export Objects Report

         IMPORTANT — pre-export protocol (in this order):
           1. Run "Step 2-sync" above first (so the browser reads the new
              startpos / angleCorrection values).
           2. Reload the browser tab after the sync.
           3. In the browser console, run:
                disableDeepTimeMode()
              Confirm `isDeepTimeMode()` returns `false`. This is the ONLY
              step in the entire pipeline that requires the toggle off —
              all other steps run in Node or Python, which have no
              deep-time chain and are J2000-locked by construction.
              Step 10 (dashboard export) is intentionally deep-time-aware;
              don't disable for that one.
           4. Verify `holisticyearLength` returns `335317` (or
              `335316.9999...` — the physics-derived J2000 value, see
              memory note `meanlengthofday-j2000-value`; the ~1e-10 delta
              is below ML training noise).
           5. Set the range fields in the test panel:
                Test mode:    Range
                Range Start:  -108814024         (JD; model year -302635, date -302629-06-10)
                Range End:     13657896          (JD; model year  +32682, date  32681-12-12)
                Range Pieces:  335318            (= H + 1; first and last JD are the
                                                 SAME phase position in the H cycle —
                                                 H-period closure point, so 335,317
                                                 unique year-steps + 1 endpoint repeat)
           6. Click Analysis → Export Objects Report. Long-running (minutes
              to hours depending on machine). Output is a TSV trio
              `Holistic_objects_*.tsv` (large dataset path), since the
              335,318-row export exceeds the 5000-row Excel threshold.
           7. Rename / save the perihelion data as
              `data/01-holistic-year-objects-data.xlsx` (overwriting the
              existing file). The Python training scripts auto-downsample
              by `stepYears = 23`, so 1-year resolution at export is correct
              — don't pre-downsample in the browser.
           8. AFTER the export completes, restore production state by
              running `enableDeepTimeMode()` in the console.

         Why the toggle off: the browser's render path applies deep-time
         corrections per JD when `DEEP_TIME_MODE_ENABLED = true`. The ML
         training pipeline (Step 4c, 4d) expects J2000-anchored kinematic
         data; deep-time evolution is layered at runtime via the
         `mean*AtAge` helpers AFTER ML output. Exporting with deep-time
         on would bake the evolution into the coefficients, causing
         double-counting at runtime and distorting the Fibonacci balance
         laws (Step 7c). See gating audit and `disableDeepTimeMode()`
         implementation in `src/script.js`.

         Sanity check on the H-period closure:
           Row 1 (year -302,635) and row 335,318 (year +32,682) sit at
           the SAME phase position in the H cycle (they are H years
           apart). The exported values — Earth perihelion longitude,
           ascending node, eccentricity, obliquity, all planet
           perihelion ICRF angles — should match between the two rows
           to within numerical noise. This is the framework's cyclical
           closure property and a quick correctness check on the export.

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

Step 4c: python/train_precession_physical.py  → tools/lib/python/coefficients/*_coeffs_physical.py
         (~2421-term physical-beat ML coefficients, all feature frequencies
          derived from model-parameters.json — no hardcoded H_DIV_X constants)
         Downsampled by stepYears for efficiency.
         Updates: coefficients/*_coeffs_physical.py + fitted-coefficients.json
                  (PREDICT_COEFFS_PHYSICAL key, auto-written by script).
         Auto-updates when JSON periods change — but coefficients need retraining.

         Standalone per-planet mode (useful for iteration — ~7× faster):
           python3 tools/fit/python/train_precession_physical.py --planet venus
           python3 tools/fit/python/train_precession_physical.py --planet venus --write
         Valid planets: mercury, venus, mars, jupiter, saturn, uranus, neptune.
         When --planet is used with --write, only that planet's entry is replaced
         in fitted-coefficients.json (other planets' coefficients are preserved).

         Residual-analysis tool:
           python3 tools/fit/python/greedy_features_physical.py --planet venus
         Ranks candidate features by |correlation| with residuals. Used to
         identify missing physical-beat structure (e.g. the GROUP K/L terms
         capturing 8H/N sidebands were discovered this way).

         The legacy 429-term script (train_precession.py) and its 429-term
         greedy_features.py are archived in scripts/archive/.

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

Step 6f legacy reference — see Step 0 above. The sun-longitude-harmonics
         fit is now invoked as Step 0 (prerequisite, runs before Step 1)
         instead of as part of Phase 5, because its coefficients are
         structural and don't need re-fitting alongside the iterative
         pipeline. The technical detail below remains accurate; only
         the pipeline position has changed.

         sun-longitude-harmonics.js                 → SUN_LONGITUDE_MEAN + SUN_LONGITUDE_HARMONICS
         Fits an H-lattice harmonic correction Δλ(t) to the residual
         between the scene-graph Sun and the Meeus Ch.25 reference Sun.
         Captures EoC residuals the analytical 2e·sin(M) + 1.25e²·sin(2M)
         misses — most importantly the year-period oscillation that comes
         from the framework's `eccentricityDerivedMean ≈ 0.01545` differing
         from Meeus IAU J2000 eccentricity 0.01671 by ~8%.

         ✓ STATUS (2026-06, Phase Z-B): ENABLED. The fitted coefficients
         are loaded from fitted-coefficients.json and applied at runtime
         to the SUN NODE in the scene-graph (Sun-only, NOT barycenter).
         Runtime filter restricts application to design-rule-compliant
         divisors only:
           - Year-multiple: divisor ≥ round(H) AND divisor % round(H) === 0
             (covers 1 yr, 0.5 yr, 0.333 yr, ... up to 1/20 yr)
           - Small precession: divisor ∈ {3, 5, 8, 13, 16} (Earth Fibonacci)
           - Lunar precession: divisor ∈ {18015, 37900} (nodal/apsidal ICRF)
         Any other divisor (e.g. legacy [168]) is silently skipped at
         runtime — design-rule violation safeguard. See `lessons-learned-
         lunar-framework-native.md` Addendum 5 for the full Z investigation.

         Architecture choice (Sun-only vs barycenter): the correction is
         Earth-Sun-geometry-specific (the eccentricity-difference signature
         is unique to Earth's orbit), so applying at the barycenter level
         would also rotate the 7 planets — degrading their baselines by
         30–180" each. Sun-only application keeps planet baselines
         pristine. Tradeoff: the visible Sun is offset from the strict
         planet-orbit center by up to ±25" (down from ±300" with the bad
         [168] term included) — typically invisible at normal zoom levels.

         Coefficients (active under H-lattice filter):
           [335317, sin= 0.076405, cos= 0.013550]  →  1 yr period, ~280" amp
           [670634, sin= 0.002478, cos= 0.000226]  →  ½ yr period, ~9" amp
           [1005951, sin= 0.000033, cos= 0.000009] →  ⅓ yr period, ~0.1" amp
         The legacy [168, 0.0048, -0.0050] term remains in JSON but is
         FILTERED OUT at runtime (gcd(168, H) = 1).

         Toggle: `let SUN_HARMONICS_ENABLED = true;` (src/script.js)
                 env `SUN_HARMONICS_DISABLED=1` (Node tools)
         Use to A/B test the impact of the correction.

         Measured impact (Phase Z-B verification):
           - Scene-graph Sun vs Meeus residual: 197.77" → 7.39" RMS (96% reduction)
           - Sun JPL baseline (sparse Jan/Jul dates): 11.5" → 14.8" RMS
             (small regression at sparse calibration dates, since they
             happen to sit at orbital phases where the annual correction
             reaches ±49" — recoverable via correctionSun recalibration)
           - All planet baselines: unchanged
           - Eclipse audit (browser) modern eclipses: ΔJD typically 1-2 min
             (vs 6.40 min pre-Z-B per lessons-learned Addendum 4)

         Greedy re-test (Phase Z verification): re-running the fitter under
         Z-B's strict-design candidate pool finds NO additional H-lattice
         terms above the 0.05" improvement threshold. Long-period drift
         proxies (H/152, H/167, H/168 with periods 2000+ yr) are found by
         greedy but ALL violate the design rule (gcd(n, H) = 1) and are
         rejected per the lessons-learned policy. The current 3-term set
         is the COMPLETE H-lattice-compliant correction available.

         The Sun T² polynomial (`+0.0003032·T_jc²`) that previously paired
         with this step has been REMOVED from the design — it is not
         lattice-compatible (polynomial in T, not harmonic) and grows
         without bound at deep time. See design rule near top of this README.

         Updates: fitted-coefficients.json (when --write); coefficients
         are loaded by constants.js and applied automatically at runtime.
         Standalone use:
           node tools/fit/sun-longitude-harmonics.js              # dry run
           node tools/fit/sun-longitude-harmonics.js --range 500  # ±500 yr
           node tools/fit/sun-longitude-harmonics.js --write      # persist
         CAVEAT: changing SUN_LONGITUDE_HARMONICS shifts what every
         downstream step sees. The Step 0 ordering exists exactly to
         absorb this: running Step 0 first means Steps 1 → 5a → 5b
         all naturally calibrate against the corrected Sun, with no
         follow-up re-fits needed. If you must re-run this script
         AFTER the main pipeline (e.g. ad-hoc diagnostic refit), then
         also re-run Step 1 (correctionSun) and Steps 5a/5b (planet
         baselines) afterwards — Venus and Saturn are the most
         sensitive (inner+outer that lean hardest on Sun-relative
         geometry in the correction stack).

── Phase 5b: Eccentricity amplitudes & balance law verification ──

Step 7a: derive-eccentricity-amplitudes.js    → verification only (no output)
         Verifies that K-derived eccentricity amplitudes from constants.js
         are internally consistent. All values are now computed at runtime:
         - K from Earth: K = e_amp × √m × a^1.5 / (sin(meanObliquity) × √d)
         - All 7 planet amplitudes from K using model mean obliquity
         - All bases from balanced-year phase
         - All phases from the eccentricity cycle timing
         No --write option. Run to verify after Earth parameter changes.

Step 7b: balance-search.js                    → balance-presets.json
         Exhaustive search for configs with ≥99.994% inclination balance.
         Writes data/balance-presets.json (synced to script.js by Step 9).
         Count changes when eccentricity values change (affects w = √(m·a(1-e²))/d).

Step 7c: verify-laws.js                       → pass/fail
         Verifies Laws 2 (inclination amplitude), 3 (inclination balance),
         and 5 (eccentricity balance). All must pass.
         Key targets:
         - Inclination balance (Law 3) — natural phase-derived value ≈99.9975%
         - Eccentricity balance (Law 5) — natural phase-derived value ≈99.8632%
         - All 8 planet inclination amplitudes match ψ/(d×√m) (Law 2)
         - All eccentricities consistent with J2000 observed values
         eccentricity-balance.js              → convergence report
         Laws 4 and 5 independently predict Saturn's eccentricity.
         For per-planet sensitivity decomposition of the residual balance
         gaps, see tools/verify/dual-balance-optimizer.js and doc 19.

Step 7d: fibonacci_significance.py            → data/significance-results.json
         Monte Carlo + permutation significance test for the Fibonacci structure.
         11 tests across 3 null distributions (permutation, log-uniform MC,
         uniform MC); 100,000 trials per MC null. Of the 11 tests, 7 are
         structural (5 multiset-invariant under permutation + 2 tautological —
         Laws 2 and 4 are internally consistent by construction) and 4 are
         empirical (Laws 3, 5; Findings 4 and 6). Computes Stouffer's Z
         combined p-value with Brown-style correlation correction (variance
         inflation factor 2.5 for the shared v_j dependency) + sigma
         equivalents across all three null distributions. Fisher's combined
         also reported for transparency.
         Run-time: ~2-3 minutes (single threaded).
         Stable across normal refits — only re-run before publication or when
         the significance test definitions themselves change.
         **Required by export-to-holistic.js** — the website combined p-values,
         sigma range, and test counts all derive from this output.

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

Manual:  export-to-holistic.js --write        → Holistic website repo
         (NOT in automated pipeline — run manually after Step 9)
         Requires Steps 7b (balance-search.js) and 7d
         (fibonacci_significance.py) to have run first — both produce JSON
         files this script reads (data/balance-presets.json,
         data/significance-results.json).
         Syncs all fitted values to the Holistic website TypeScript files:
         - constants.ts: harmonics, Earth scalars, eccentricity + inclination
           records, BALANCE_RESULTS, SIGNIFICANCE_RESULTS
         - coefficients.ts: 429-term prediction coefficients (7 planets)
         - model-values.ts: display strings (auto-derived from above imports)

── Phase 7: Dashboard ─────────────────────────────────────────────

Step 10: node tools/export-dashboard-data.js  → dashboard/data/*.json
         Exports orbital elements, sky positions, and Earth predictions
         for the dashboard visualizations. Uses stepYears intervals.

         Uses tools/lib/deep-time.js (ESSRT Architecture α chain ported
         from src/script.js — dual-source per IP-dashboard-deep-time-
         alignment.md Q1) so per-year values match production tweakpane
         displays. Dashboard time range (±300 kyr) is well within the
         deep-time chain's validated range. Adds three deep-time arrays
         to earth.json: holisticYearAtYear, auKmAtYear, moonDistanceKmAtYear.

         When updating src/script.js mean*AtAge functions, the equivalent
         in tools/lib/deep-time.js MUST be updated in parallel — they are
         the same chain in two locations.
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
| `SUN_LONGITUDE_HARMONICS` / `SUN_LONGITUDE_MEAN` | **Step 0 is the source.** Re-run Step 0 only when H, the eccentricity definition, or Meeus reference changes — then re-run the full pipeline (1 → 2 → … → 9) so all downstream steps re-calibrate against the new Sun frame. The harmonics are NOT re-fit as part of ordinary refits. Runtime H-lattice filter automatically skips design-rule-violating divisors. |
| ~~Sun T² polynomial (inline in `moveModel`)~~ | **REMOVED 2026-06** — violates design rule (polynomial-in-T not cyclic). Do not re-introduce. |
| `eccentricityBase` / `eccentricityAmplitude` | **0, 1, 3→4a, 6a→6d** (re-fit Step 0 because eccentricity gap definition changed; then re-run pipeline) |
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
# Phase 0: Pre-fit Sun harmonic structure (prerequisite, run once)
# Skip on routine refits — coefficients are stable. Re-run only when H,
# eccentricity definition, or Meeus reference changes. Disable existing
# harmonics first so the fitter samples the RAW residual:
SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write   # Step 0 (~1 sec)

# Phase 1: Sun optimizer & planet alignment
# (Step 1 will calibrate correctionSun WITH Step 0's harmonics already
# applied → single-pass convergence, no follow-up re-run required.)
node tools/optimize.js optimize sun correctionSun --write                    # Step 1
node tools/optimize.js optimize mercury startpos --write                     # Step 2
node tools/optimize.js optimize venus startpos --write                       # Step 2
node tools/optimize.js optimize mars startpos --write                        # Step 2
node tools/optimize.js optimize jupiter startpos --write                     # Step 2
node tools/optimize.js optimize saturn startpos --write                      # Step 2
node tools/optimize.js optimize uranus startpos --write                      # Step 2
node tools/optimize.js optimize neptune startpos --write                     # Step 2

# Step 2-sync: push startpos/angleCorrection + any Fibonacci changes to script.js
# so the browser simulation uses the post-optimization values
node tools/fit/export-to-script.js --write                                   # Step 2-sync

# Phase 2: Generate input data (manual)
# Reload the browser after Step 2-sync, THEN:
#   browser console: disableDeepTimeMode()   ← REQUIRED for J2000-locked export
# Set range fields: Start=-108814024 End=13657896 Pieces=335318
#   (JD coords; spans a full H period; first==last JD = phase closure)
# Export from browser: Analysis → Export Objects Report                      # Step 3
# After export: browser console: enableDeepTimeMode()   ← restore production
# Save as data/01-holistic-year-objects-data.xlsx
# (See Phase 2 detailed pre-export protocol earlier in this README for the
#  full reasoning + sanity checks. This is the ONLY step requiring the
#  toggle off — all Node/Python steps are J2000-locked by construction.)

# Phase 3: Earth perihelion & ML training
python3 tools/fit/python/fit_perihelion_harmonics.py --write                 # Step 4a
python3 tools/fit/python/verify_perihelion_erd.py                            # Step 4b (must pass)
python3 tools/fit/python/train_precession_physical.py --write                # Step 4c
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
# (Sun longitude harmonics moved to Phase 0 — see top of this block.
# It does NOT need to re-run here as part of routine refits.)

# Phase 5b: Balance law verification
node tools/verify/balance-search.js                                          # Step 7b (balance presets)
node tools/verify/verify-laws.js                                             # Step 7c (must pass)
node tools/verify/eccentricity-balance.js                                    # Step 7c (convergence report)
python3 scripts/fibonacci_significance.py --trials 100000                    # Step 7d (~2-3 min, before export-to-holistic.js)

# Phase 6: Verify & sync
node tools/fit/verify-pipeline.js                                            # Step 8 (must pass)
node tools/fit/verify-pipeline.js --write                                    # update baselines.json
node tools/fit/export-to-script.js --write                                   # Step 9 (only after Step 8 passes)

# Phase 7: Dashboard
node tools/export-dashboard-data.js                                          # Step 10

# Manual: Sync to Holistic website (NOT in pipeline runner)
# Requires Steps 7b (balance-search) and 7d (fibonacci_significance.py) to have run.
node tools/fit/export-to-holistic.js --write                                 # → constants.ts, model-values.ts, etc.
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
    train_precession_physical.py → fitted-coefficients.json  (Step 4c)
    train_observed.py            → fitted-coefficients.json  (Step 4d)
    parallax-correction.js       → fitted-coefficients.json  (Step 5a)
    gravitation-correction.js    → fitted-coefficients.json  (Step 5b)
    moon-eclipse-optimizer.js    → model-parameters.json     (Step 5c)
    obliquity-harmonics.js       → fitted-coefficients.json  (Step 6b)
    cardinal-point-harmonics.js  → fitted-coefficients.json  (Step 6c)
    year-length-harmonics.js     → fitted-coefficients.json  (Step 6d)
    optimize.js                  → model-parameters.json       (Steps 1, 2)
    balance-search.js            → data/balance-presets.json    (Step 7b)
    fibonacci_significance.py    → data/significance-results.json (Step 7d)
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
