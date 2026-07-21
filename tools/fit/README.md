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

**Status 2026-07-15:** Sun harmonic whitelist further tightened. Previously
clause (d) `sharesFactorWithH` (gcd(d, H) > 1) admitted mid-range divisors
like 84, 92, 115, 122 with 400-600" amplitudes at ~3000-4000 yr periods —
these are **fit artifacts** (empirical residual compensation), not
physically-motivated cycles. Under H values with rich small-prime
factorization (e.g. H=335,320 = 2³·5·83·101), clause (d) admitted many such
divisors, silently shifting Phase 1 optimizer outputs (earthInvPlaneInclinationAmplitude
drifted by 90 arcsec, correctionSun by ~0.6 arcsec). Clause (d) has been
**removed** from all three whitelist sites: `tools/fit/sun-longitude-harmonics.js`,
`src/script.js#sunLongitudeCorrection`, and `tools/lib/scene-graph.js`.
Sun harmonics are now strictly limited to (a) year-multiples of H, (b) small
precession divisors 1..20, and (c) lunar-precession divisors. Any future
Sun fit will produce a clean 3-term physical fit regardless of H.

**Allowed exception:** standalone consumer-side calls (e.g. `_eclSunLon`
for one-off eclipse longitude reads) MAY keep Meeus polynomial terms —
they are short-window calculations consumed at a single epoch, not part
of the cyclic scene-graph motion.

## Runtime formula conventions

The coefficients this pipeline produces feed **runtime evaluation formulas**
in `src/script.js` and the Holistic website's `src/lib/orbital/`. Several
design choices at the runtime layer must stay in sync with the basis those
coefficients were fit on. Changing them does **not** require re-running any
fit — but they must be identical in the simulator and the website or the
two calculators drift apart.

### Option A — Snapshot phase basis (RA, JD, year-length)

Cardinal-point RA/JD/year-length harmonics are fit on the J2000-frozen
scene-graph, which advances phase as

```
phase(year) = 2π · N · (year − ANCHOR_YEAR) / H
```

Runtime evaluation **must use this same snapshot form**. The earlier
"Phase 9.10b integrated phase" form (`2π · N · ∫ 1/H(t) dt`) drifts by hours
across ±12 kyr because integrated phase and snapshot phase only agree at
the anchor year, not at every epoch. Both `computeSolsticeRA/JD/YearLength`
(simulator) and `calcCardinalPointRA/JD/YearLen` + `calcSolarYear` (website)
use snapshot phase.

### Option B — Deep-time mSY drift

Under deep-time (simulator: `DEEP_TIME_MODE_ENABLED`; website: any t_Ma ≠ 0),
the linear term of the cardinal-point JD formula uses the **epoch-evolved
mean tropical year** in place of the J2000 constant:

```
JD(Y) = anchor + mSY(t_Ma) · (Y − 2000) + Σ harmonics
```

This makes the JD track the deep-time-mutated year length instead of
freezing at J2000. The correction is zero at J2000 by construction
(mSY(0) = mSY_J2000) so it doesn't touch modern-era accuracy.
`computeSolsticeYearLength`/`calcCardinalPointYearLen` apply the same shift
to their base length (derivative of the drift is `≈ mSY(t_Ma) − mSY_J2000`).

### mSY convention: epoch-local (`/LOD`), not SI (`/86400`)

Days-per-year at epoch is computed as `T_tropical_s(t_Ma) / LOD_s(t_Ma)`
— the **epoch-local** convention where a "day" tracks the actual rotation
period. Both sides use this: simulator `meanYearInDaysAtAge`
([src/script.js:5339](../../src/script.js#L5339)), website
`meanTropicalYearInDaysAtAge`
([Holistic .../deepTime.ts:387](../../../../Holistic/holisticuniverse/src/lib/orbital/deepTime.ts#L387)).
At J2000 both equal the IAU anchor exactly; at deep time they diverge from
the SI-anchored `/86400` form by a few percent at ±100 Myr.

The simulator also exposes `meanTropicalYearDaysAtAge` (SI /86400) — that
one is used deliberately by `recomputeTimeUnitsForEpoch` for a
Kepler-invariant scene JD, and should **not** be substituted into the
cardinal-point drift term.

### Method B LOD anchor (86400.00001 s, not 86400 s)

The J2000 length-of-day used to derive `meansiderealyearlengthinSeconds`
and downstream period conversions is 86400.00001 s — the physics-derived
value from the angular-momentum-conservation chain at J2000, not the SI
definition. See project memory `meanlengthofday-j2000-value`. Both the
simulator (`ASTRO_REFERENCE.siderealYearJ2000 × 86400.00001`) and the
website (`SIDEREAL_YEAR_J2000_DAYS × 86400.00001`) agree on this
convention.

### Sidereal-year J2000 anchor: IAU 365.25636308 d

Both the simulator's `meansiderealyearlengthinDays` and the website's
`SIDEREAL_YEAR_J2000_DAYS` are anchored at the IAU J2000 value
`365.25636308 d`. The earlier kinematic form
`meansolaryearlengthinDays × (H/13) / ((H/13) − 1)` gave
~365.256361 d — 150 ms/yr short of IAU — and caused a ~4 μs drift in
the runtime-derived `meanlengthofday` off the Method B anchor. Under
deep-time mode both bases are overwritten by `T_sid_s / LOD_s`, which
naturally recovers the IAU anchor at J2000, so the fix only touches
deep-time-OFF behaviour.

## When does a coefficient re-fit actually need to run?

The runtime formula conventions above are display-time concerns and **do
not** require Step 6a / 6c / 6d to re-run. See the "What triggers a refit?"
table further below for the full trigger list.

Situations that do **not** require re-fitting the cardinal-point / year-
length harmonics:

- Switching between Option A snapshot phase and integrated phase for
  RA/JD (this affects runtime evaluation only; the fit basis is fixed at
  snapshot)
- Adding/removing the Option B deep-time drift correction
- Adjusting the LOD anchor between 86400 and 86400.00001 s
- Switching the sidereal-year J2000 anchor between the kinematic form and
  the IAU 365.25636308 d value
- Changing which mSY convention (`/86400` vs `/LOD`) the drift term uses
- Toggling `BOND_/HALLSTATT_/JOSE5_ DT_CORRECTION_ENABLED` on/off. The
  4-flag ΔT correction stack (Phase 8) is a post-integration cosmetic
  overlay applied only to the historical ΔT curve — it firewalls off from
  the LOD physics and does not feed Steps 6a/6c/6d.

The ΔT correction stack has its own separate refit trigger, discussed
under "Phase 8: ΔT correction stack" in the pipeline below and in the
"What triggers a refit?" table further down.

Situations that **do** require Step 6a → 6c → 6d to re-run (roughly:
anything that changes what the scene-graph produces at 1-year steps over
a full H):

- `H` / `holisticyearLength`
- `earthtiltMean` / `earthInvPlaneInclinationAmplitude` / `earthInvPlaneInclinationMean`
- `correctionSun`
- `perihelionalignmentYear`
- `eccentricityBase` / `eccentricityAmplitude`
- Anything else that would change `data/02-solar-measurements.csv`

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
| `dt-corrections-fit.js` | `data/deltaT-4flag-fit.json` — cascaded LSQ fit of the 4-flag ΔT correction stack (Bond 8H/1830, Hallstatt 8H/1104, Jose5 8H/2989, Jose4 8H/3749) against the Stephenson 2016 residual. Sole authoritative source of the shipped `BOND_/HALLSTATT_/JOSE5_/JOSE4_ COS_/SIN_COEFF_S` constants. See "Phase 8" below. | Stephenson 2016 spline (`public/input/stephenson-2016-deltaT-polynomial.json`) − pure-tidal framework model (`tools/lib/deep-time.js`, bypassed via `DT_CORRECTIONS_DISABLED=1`) |
| `../../scripts/lattice_harmonic_scan.py` | `data/lattice-scan-<tag>.json` — universal 8H-lattice harmonic scan across multiple paleoclimate archives (Steinhilber solar Φ, Stephenson ΔT, Cheng speleothem δ18O, EPICA CO2, LR04 δ18O). Enumerates gcd-compliant divisors in a period band, fits each candidate against each dataset, ranks by cross-dataset consistency. Used to identify Jose4 (4×Jose 715 yr) as the 4th flag with cross-archive coherence. | Multiple paleoclimate proxies in `data/` and `public/input/` |
| `export-dt-corrections.js` | Patches `BOND_/HALLSTATT_/JOSE5_ COS_/SIN_COEFF_S` (and `_LATTICE_N`) in `src/script.js`, `tools/lib/deep-time.js`, and website `deepTime.ts`. Also exposes an in-memory API (`loadFitJson`/`applyToSource`) used by `export-to-script.js` and `export-to-holistic.js` as a delegated tail step. | `data/deltaT-4flag-fit.json` |
| `export-to-script.js` | Syncs all JSON values → `src/script.js` (includes DT correction constants via `export-dt-corrections.js` delegate) | 4 JSON files in `public/input/` + `data/deltaT-4flag-fit.json` if present |
| `export-to-holistic.js` | Syncs all values → Holistic website repo (manual, not in pipeline). Covers `constants.ts` (harmonics + fitted scalars), `cardinalPointHarmonics.ts`, `coefficients.ts` (7×2421 terms + `planets.ts buildFeatures`), `deepTime.ts` DT constants (via `export-dt-corrections.js` delegate), and — as of 2026-07-18 — astro-reference scalar anchors (`DELTA_T_START_SECONDS`, `PERIHELION_ALIGNMENT_YEAR`) sourced from `public/input/astro-reference.json`. See **"Syncing to Holistic"** section below for the full command sequence. | `fitted-coefficients.json` + `model-parameters.json` + `data/balance-presets.json` + `data/significance-results.json` + `data/deltaT-4flag-fit.json` if present + `public/input/astro-reference.json` |
| `reclassify-tiers.js` | Tier reclassification + JPL enrichment of Tier 1 data | `data/reference-data.json` |
| `verify-pipeline.js` | Pass/fail verification of all 9 targets + correction stack | Scene-graph simulation |

Note: `eocEccentricity` and `perihelionPhaseOffset` are derived analytically in
`constants.js` and require no pipeline step. The historical numerical-verification
scripts (`eoc-constants.js`, `perihelion-offset.js`) now live in
[`tools/explore/`](../explore/).

## Syncing to Holistic

The Holistic website (`/home/dennis/code/Holistic/holisticuniverse`) mirrors the
simulator's fitted coefficients and scalar anchors so that the orbital calculator,
MDX pages, and paper macros display values that agree with the 3D simulator. The
sync is **not part of the automated pipeline** — run it manually after Step 9.
Failing to run it results in silent drift: the website continues to ship the
previous fit's numbers.

### Command sequence

```bash
# 3D repo — sync all values to Holistic (dry-run first)
cd /home/dennis/code/3d
node tools/fit/export-to-holistic.js            # dry-run, preview changes
node tools/fit/export-to-holistic.js --write    # apply

# Holistic repo — regenerate the derived model-values JSON and paper macros
cd /home/dennis/code/Holistic/holisticuniverse
pnpm run values:generate                        # refreshes src/data/model-values.generated.json
npx tsx docs/paper/generate-tex-values.ts       # refreshes docs/paper/model-values.tex
```

The `values:generate` step is idempotent — it content-compares against the
existing JSON and no-ops when nothing changed. `predev` and `prebuild` also
call it automatically, so if you're about to start `pnpm run dev` you can
skip the explicit call. The paper `.tex` regeneration has no auto-trigger
and must be run by hand when compute.ts changes.

### What each step does

- **`export-to-holistic.js --write`** — writes Holistic's `src/lib/orbital/{constants,coefficients,cardinalPointHarmonics,deepTime}.ts` from the current fit JSONs + `public/input/astro-reference.json`. Delegates the 12 DT correction constants to `export-dt-corrections.js` (same helper the 3D script uses). Content-compares each field and only rewrites what actually changed. **Section 7 (fit-anchored scalars)** additionally patches the website's shipped measurement constants: `usnoLodJ2000` + `deltaTEspenakRmsSeconds` in `src/data/model-values.compute.ts` (from `data/deltaT-4flag-fit.json → optimum`), `ALPHA_CLIMATE_SCALE_NUM` + `DLOD_TIDAL/GIA/ALLCYCLES` in the same file (from `tools/lib/deep-time.js` — the dLOD channels via `dLodDtDecompositionAtAge(-5e-7)`, i.e. model epoch 2000.5), and `ALPHA_CLIMATE_SCALE`/`ALPHA_1` in `deepTime.ts`. Never hand-edit these on the website — they carry "AUTO-SYNCED" comments.
- **`pnpm run values:generate`** — runs `scripts/generate-model-values.mjs` on the Holistic side, which evaluates `src/data/model-values.compute.ts` and writes `src/data/model-values.generated.json`. This is the JSON that MDX pages read via `<V k="..."/>` tags. Downstream of `constants.ts` / `deepTime.ts` / `dayLength.ts`, so must run *after* export-to-holistic completes.
- **`npx tsx docs/paper/generate-tex-values.ts`** — regenerates `docs/paper/model-values.tex` (the `\Mv…` macro file) from the same `MODEL_VALUES` registry. Not auto-triggered; must run by hand when compute.ts or its upstream inputs change.

### What gets synced

| Target file (in Holistic) | Content | Written by |
|---|---|---|
| `src/lib/orbital/constants.ts` | Harmonics, planetary orbital elements, ΔT trend anchor (`DELTA_T_START_SECONDS`), perihelion-alignment year, other scalars | `export-to-holistic.js` |
| `src/lib/orbital/cardinalPointHarmonics.ts` | Cardinal-point Fourier terms (4×24) | `export-to-holistic.js` |
| `src/lib/orbital/coefficients.ts` | Prediction coefficients (7×2421) + `planets.ts` buildFeatures | `export-to-holistic.js` |
| `src/lib/orbital/deepTime.ts` | Bond/Hallstatt/Jose5/Jose4 correction constants (12 total: LATTICE_N + COS_COEFF_S + SIN_COEFF_S per cycle); α(t) anchors `ALPHA_CLIMATE_SCALE` + `ALPHA_1` | delegated to `export-dt-corrections.js`; α anchors by Section 7 |
| `src/data/model-values.compute.ts` | Fit-anchored measurement scalars: `usnoLodJ2000`, `deltaTEspenakRmsSeconds` (from `data/deltaT-4flag-fit.json`), `ALPHA_CLIMATE_SCALE_NUM`, `DLOD_TIDAL/GIA/ALLCYCLES` (from `tools/lib/deep-time.js`) | `export-to-holistic.js` Section 7 |
| `src/data/model-values.generated.json` | 757 derived display keys (day/year lengths, precession rates, orbital elements at J2000, etc.) | `pnpm run values:generate` |
| `docs/paper/model-values.tex` | ~500 `\Mv…` LaTeX macros used in the paper | `npx tsx docs/paper/generate-tex-values.ts` |

### When drift happens (and how to catch it)

`export-to-holistic.js` reports "unchanged" for every field it checks — so
a first run after a refit shows exactly which values shifted. Running it
regularly (or wiring it into a post-fit hook) prevents the drift-then-audit
cycle. Specific stale-value classes we've hit before:

- **Fourier harmonics** (`TROPICAL_YEAR_HARMONICS`, `SIDEREAL_YEAR_HARMONICS`, `OBLIQUITY_HARMONICS`, `PERI_HARMONICS`, cardinal-point terms) — if the fit re-runs but the sync doesn't, downstream J2000 day-length values drift by ~10s of seconds.
- **ΔT stack** (`BOND_/HALLSTATT_/JOSE5_/JOSE4_ COS_/SIN_COEFF_S`) — silent, because deepTime.ts imports directly and the calculator page uses `calcDeltaT` → `meanDeltaTSecondsAtAge`. A stale DT stack shifts ΔT at year 1000 by hundreds of seconds.
- **`DELTA_T_START_SECONDS`** — the ΔT trend anchor. Auto-updated by `dt-corrections-fit.js --sweep-usno`; if not synced, Holistic's absolute-ΔT displays disagree with the simulator's tweakpane by the Δ between the old and new joint-optimum values.
- **Prediction coefficients** (`COEFFICIENTS`) — 2421-term arrays per planet. Stale coefficients silently mis-predict planetary positions in the calculator by up to arcminutes.

The `pnpm run values:generate` step catches drift *indirectly* — it re-derives every J2000 value from the (already-synced) primitives, so out-of-sync sources cascade through. This is why running it as the last step is essential.

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

Step 0:  SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write
         → SUN_LONGITUDE_MEAN, SUN_LONGITUDE_HARMONICS
         Captures the STRUCTURAL Sun residual (framework
         eccentricityDerivedMean ≈ 0.01545 vs Meeus IAU 0.01671 — an ~8%
         definitional gap that propagates through 2e·sin(M) to produce a
         ~280" annual harmonic). The fitted coefficients are a fixed
         property of the framework, not of any single calibration round.

         The `SUN_HARMONICS_DISABLED=1` env var is REQUIRED for --write.
         Without it the fit script measures a DELTA on top of the
         currently applied correction (near-zero at modern epochs),
         and overwriting stored with a delta would break the runtime.
         The script refuses --write without the env var and exits with
         a clear message. Dry-runs (no --write) don't need the env var
         but the numbers won't be absolute either.

         Why this is "Step 0" rather than a regular fitting step:
         - Coefficients are stable across normal refits — re-run only
           when one of these foundational inputs changes:
             · `holisticyearLength` (H) — the H-lattice whitelist and
               the year-multiple seed harmonics all shift with H.
             · `perihelionalignmentYear` or `balancedYear` — the phase
               anchor for every harmonic term moves.
             · `eccentricityBase` / `eccentricityAmplitude` — the
               framework-vs-Meeus eccentricity gap that produces the
               dominant ~280" annual harmonic shifts.
             · `moonApsidalPrecessionDaysInputICRF` /
               `moonNodalPrecessionDaysInputICRF` — the auto-derived
               `N_apsidal` / `N_nodal` divisors on the whitelist shift.
             · Meeus Ch.25 (`_eclSunLon`) or Ch.47 (`_meeusMoonLon`)
               reference reformulation.
             · `SUN_HARMONICS_ENABLED` toggle between framework-native
               and Meeus-parity modes.
           (Same "stable across normal refits" pattern as
           fibonacci_significance.py / Step 7d.)
         - Running it FIRST means Step 1 calibrates correctionSun with
           harmonics already applied → single-pass convergence. If 6f
           ran after Step 1 (legacy order), Step 1 would need to re-run
           to absorb the ~3" shift introduced by the harmonics' annual
           swing at the Jan/Jul calibration dates.
         - It does NOT depend on Steps 1-2 having been refreshed: the
           existing correctionSun from any prior round is a good enough
           sampling base (a small correctionSun offset only shifts the
           residual's MEAN component, not the amplitude coefficients).

         Output: ~7" RMS scene-graph Sun vs Meeus Ch.25 in the modern
         window (1900-2100; down from 198" raw). Three H-lattice-compliant
         terms survive the runtime filter (1 yr, ½ yr, ⅓ yr); legacy
         [168] term is silently filtered. See "Step 6f legacy reference"
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
                Range Start:  -108814024         (JD; model year -302635 = balancedYear)
                Range End:     13657896          (JD; model year  +32682 = balancedYear + H)
                Range Pieces:  335318            (= H + 1; first and last JD are the
                                                 SAME phase position in the H cycle —
                                                 H-period closure point, so 335,317
                                                 unique year-steps + 1 endpoint repeat)
           6. Click Analysis → Export Objects Report. Long-running (minutes
              to hours depending on machine). Output is a TSV trio
              `Holistic_objects_*.tsv` (large dataset path), since the
              335,387-row export exceeds the 5000-row Excel threshold.
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
         Skip criteria: See "When does a coefficient re-fit actually need to
         run?" near the top of this README — runtime formula tweaks (Option
         A/B snapshot vs integrated phase, deep-time mSY drift, Method B
         LOD anchor, IAU sidereal-year anchor) do NOT need Step 6c to re-run.

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
           - Small precession: divisor 1..20 (Earth's Fibonacci named cycles
             — H/3, H/5, H/8, H/13, H/16, etc. — structurally on-lattice
             by fiat even though gcd(d, H) = 1)
           - Lunar precession: divisor ∈ {18015, 37900} (nodal/apsidal ICRF)
           - Mid-range structural: gcd(divisor, H) > 1 (H = 23·61·239, so
             multiples of 23, 61, or 239 qualify). Codifies the gcd rule
             stated in commit 9383161. Newly-allowed candidates in the
             sample range 21..200: 23, 46, 61, 69, 92, 115, 122, 138
             (~2430 yr ≈ Hallstatt), 161, 183, 184.
         Any other divisor (gcd=1 mid-range; e.g. legacy [168]) is silently
         skipped at runtime — design-rule violation safeguard.

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

         Greedy re-test: the fit script now filters its candidate pool
         through `_isRuntimeWhitelisted` (mirroring the runtime filter
         above) before greedy selection, so long-period drift proxies
         like H/152 / H/167 / H/168 (gcd(n, H) = 1 mid-range divisors)
         never enter the search space. Under the whitelist, greedy adds
         at most one slow-secular term (typically H/17, ~20 kyr period)
         above the 3-term seed. The 3-term year-multiple set is the
         dominant physical correction; the H/17 slow term captures
         residual drift within the reference-trustworthy modern window.

         The Sun T² polynomial (`+0.0003032·T_jc²`) that previously paired
         with this step has been REMOVED from the design — it is not
         lattice-compatible (polynomial in T, not harmonic) and grows
         without bound at deep time. See design rule near top of this README.

         Updates: fitted-coefficients.json (when --write); coefficients
         are loaded by constants.js and applied automatically at runtime.
         Standalone use:
           node tools/fit/sun-longitude-harmonics.js              # dry run, 1800-2200 (default)
           SUN_HARMONICS_DISABLED=1 \
             node tools/fit/sun-longitude-harmonics.js --write    # structural refit + persist
         --write REQUIRES `SUN_HARMONICS_DISABLED=1` — the script
         refuses otherwise. See Step 0 above for the rationale.

         Sample window is capped at ±500 yr around J2000 (MAX_RANGE_YEARS
         in the script). Default is ±200 yr (1800-2200), matching the
         Meeus Ch. 25 reference-trustworthy zone. `--range` >200 warns
         about reference-degradation risk; `--range` >500 hard-refuses.
         Do not `--write` at `--range` >200 — the fit will absorb Meeus
         reference drift into its coefficients and regress modern
         eclipse accuracy.
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

Step 7c: dt-corrections-fit.js                → data/deltaT-4flag-fit.json
         Fits the 4-flag sub-Milankovitch ΔT correction stack (Bond +
         Hallstatt + Jose5 + Jose4) against the Stephenson 2016 residual.
         Requires DT_CORRECTIONS_DISABLED=1 env so the residual reflects the
         raw pure-tidal framework, not framework + previously-shipped
         corrections. Bond uses solo-fit phase; Hallstatt/Jose5/Jose4 use
         cap-only shipping (free-fit if below prior amplitude, scaled down
         to prior only if free > prior). See docs/102 § "Companion 8H
         lattice harmonics" and dt-corrections-fit.js header comment.
         Only re-run when H or the tidal LOD anchor changes (H change
         shifts the framework model ΔT curve, altering the residual to fit).
         Automated in the pipeline as of 2026-07-15.

Step 7d: verify-laws.js                       → pass/fail
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

Step 7e: fibonacci_significance.py            → data/significance-results.json
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
         Also delegates a tail step F to export-dt-corrections.js — if
         data/deltaT-4flag-fit.json exists, its Bond/Hallstatt/Jose5 constants
         are patched into script.js in the same run (see Phase 8).
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
         - deepTime.ts: Bond/Hallstatt/Jose5/Jose4 correction constants (delegated
           to export-dt-corrections.js; pulls from data/deltaT-4flag-fit.json
           if present — see Phase 8)

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

── Phase 8: ΔT correction stack (Bond + Hallstatt + Jose5 + Jose4) ─

Step 11: DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --write
         → data/deltaT-4flag-fit.json
         Cascaded LSQ fit of the sub-Milankovitch 8H-lattice ΔT correction stack
         against the Stephenson 2016 residual over years -720 → 2016:
           Stage A: Bond 8H/1830 solo (unconstrained; the primary anchor)
           Stage B: Bond + Hallstatt 8H/1104 joint; Hallstatt cap-only to 80 s
           Stage C: Bond + Hallstatt + Jose5 8H/2989 joint; Jose5 cap-only to 50 s
           Stage D: + Jose4 8H/3749 (4×Jose 715 yr); free-fit 35 s (below 50 s prior — no cap)
         The DT_CORRECTIONS_DISABLED=1 env var makes tools/lib/deep-time.js
         return the pure-tidal framework ΔT, so the sampled residual is the
         absolute fit target — without it the residual would be a DELTA on
         top of the already-shipped corrections and the fit would collapse.
         The --write flag REFUSES to run without the env var for this reason.

         "Cap-only" shipping (introduced with Jose4): the target amplitude
         is treated as a MAX cap, never a floor. If free-fit < prior, use
         the free-fit value as-is (Jose4 case). If free-fit > prior, scale
         DOWN preserving phase (Hallstatt, Jose5). This prevents inflating a
         modest signal above what the joint fit actually finds.

         Runs OUTSIDE the main orbital pipeline (Steps 1–10) — the 4 correction
         cycles are post-integration cosmetic corrections to the framework's
         historical ΔT curve, not part of the LOD physics. They do NOT feed
         Steps 6a/6c/6d and do NOT affect the dashboard's model-values snapshot.

         Candidate identification: `scripts/lattice_harmonic_scan.py` cross-
         validates 8H-lattice divisors against multiple paleoclimate archives
         (Steinhilber solar Φ, Stephenson ΔT, Cheng speleothem, EPICA CO2,
         LR04). Jose4 was selected as the tightest structural anchor
         (0.083% to 4×Jose) with cross-archive coherence in Steinhilber + EPICA.

         Rollback history (research trail): Eddy (8H/2684, 999 yr) and Emp862
         (8H/3111, 862 yr) were tested as 5th/6th flags and rolled back —
         Eddy caused L-5b regression via Bond-amp inflation; Emp862 made the
         6-cycle fit rank-deficient. Both are documented in the fit tool's
         CONFIG.cycles rollback comments and preserved as research artifacts
         in `data/lattice-scan-*.json`. See docs/102 § "Companion 8H lattice
         harmonics" for the full investigation trail.

Step 12: node tools/fit/export-dt-corrections.js --write
         → src/script.js + tools/lib/deep-time.js + website deepTime.ts
         Patches the BOND_/HALLSTATT_/JOSE5_/JOSE4_ COS_/SIN_COEFF_S and
         _LATTICE_N constants in all three code sites from
         data/deltaT-4flag-fit.json. Each target file is backed up as .bak
         before write.

         Alternatively: `node tools/fit/export-to-script.js --write` (Step 9)
         and `node tools/fit/export-to-holistic.js --write` (manual) both
         delegate to export-dt-corrections.js as a tail step and pick up
         data/deltaT-4flag-fit.json automatically — so if you're running the
         full batch sync you don't need Step 12 separately.

         After sync, re-run browser L-5b test to confirm:
           - Model residual RMS near ~1629 s
           - Medieval bump peak near -580 s @ year 1000
           - MWP shape verdict remains ✓ CONSISTENT
         A Node-vs-Python fit variance of a few degrees in Hallstatt/Jose5
         phase is expected (different LSQ implementations converge to nearby
         local optima); accept if L-5b regression is < ~10 s in either metric.

Note: `data/02-solar-measurements.csv` is generated by Step 6a (~80 min for full H at 1-year steps).
It contains all solar events (cardinal points + perihelion/aphelion) with world-angles.
All downstream fitting steps (6b-6d) read from this single CSV and downsample by `stepYears`
(currently 23) — no separate exports needed.
Tropical year harmonics are fitted alongside sidereal and anomalistic (Step 6d).
The cardinal-point-derived tropical year (Step 6c) is the authoritative runtime version.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | ALL (1→10) — and Phase 8 (Steps 11–12) because `BOND_PERIOD_YR = 8·H / BOND_LATTICE_N`, so `ω = 2π/period` re-derives for all four cycles. |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `earthtiltMean` | 1, 3→4d, 6a→6d |
| `earthInvPlaneInclinationAmplitude` | 1, 3→4d, 6a→6d |
| `earthInvPlaneInclinationMean` | 3, 6a→6d |
| `correctionSun` | 1, 6a→6d |
| `SUN_LONGITUDE_HARMONICS` / `SUN_LONGITUDE_MEAN` | **Step 0 is the source.** Re-run Step 0 (`SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write`) when any of these change: (a) `holisticyearLength` — the H-lattice divisor whitelist and the year-multiple seed harmonics all shift; (b) `perihelionalignmentYear` or `balancedYear` — the phase anchor moves; (c) `eccentricityBase` / `eccentricityAmplitude` — the ~8% Meeus vs framework eccentricity gap shifts, changing the ~280" annual harmonic amplitude; (d) `moonApsidalPrecessionDaysInputICRF` / `moonNodalPrecessionDaysInputICRF` — the auto-derived N_apsidal / N_nodal divisors on the whitelist shift; (e) `_eclSunLon` (Meeus Ch.25) or `_meeusMoonLon` change; (f) `SUN_HARMONICS_ENABLED` toggles between framework-native and Meeus-parity mode. After Step 0 --write, re-run the full pipeline (1 → 2 → … → 9) so all downstream steps re-calibrate against the new Sun frame. The harmonics are NOT re-fit as part of ordinary refits. Runtime H-lattice filter automatically skips design-rule-violating divisors. |
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
| Bond / Hallstatt / Jose5 / Jose4 `_LATTICE_N` (divisor of 8H) | Steps 11 → 12 (Phase 8 only, independent of the orbital pipeline). The 4-flag ΔT stack has no upstream dependency on Steps 1–10; the fit re-runs against the Stephenson residual and syncs to code via `export-dt-corrections.js`. |
| `_TAPER_FULL_HALFWIDTH_YR` / `_TAPER_TOTAL_HALFWIDTH_YR` (Holocene taper) | None — the taper is applied at runtime and does not affect the shipped cos/sin coefficients. Verify L-5b after change. |
| Stephenson polynomial (`public/input/stephenson-2016-deltaT-polynomial.json`) | Steps 11 → 12 (Phase 8). Fit target changed → all four cycles re-fit. |

**When H changes:** Update `holisticyearLength` in `model-parameters.json`.
Also update `stepYears` to a value that divides H evenly (factorize H to find options).
All derived values (balancedYear, meanSolarYearDays, cycle periods, etc.) are
computed automatically in `constants.js` — no per-script updates needed.

Current: H=335,317 (= 23 × 61 × 239), stepYears=23. H is prime-poor (only three
distinct prime factors), so the small-integer divisors used by the framework
(H/3 = 111,772.3̄, H/5 = 67,063.4, H/8 = 41,914.625, H/13 = 25,793.6̄,
H/16 = 20,957.3125) are non-integer — the H/8-snapped `mean_solar_year`
matches IAU 365.2422 d to 10 decimals.

## How to run

All scripts default to **dry run** (print only). Add `--write` to update JSON files.
Run `export-to-script.js --write` to sync JSON values to `src/script.js`.
This can be done after each `--write` step, or once at the end — it patches all diffs in one pass.

### Pre-requisite — JSON → script.js sync after foundational-constant edits

If you have just edited one of the source-of-truth JSON files
(`public/input/model-parameters.json`, `public/input/astro-reference.json`)
— e.g. changing `holisticyearLength`, `inputmeanlengthsolaryearindays`,
`correctionDays`, `perihelionalignmentYear`, or any Meeus/IAU anchor —
**run `export-to-script.js --write` FIRST** so `src/script.js` mirrors the
new JSON state before any pipeline step touches it:

```bash
node tools/fit/export-to-script.js --write   # Sync JSON → script.js (pre-Phase 0)
```

Why this matters:
- The Node pipeline (`tools/lib/constants.js`) reads JSON directly, so it
  always sees the new values.
- The browser (`src/script.js`) has its own top-level `const` declarations
  that mirror the JSON — but they don't auto-update. If you skip this sync,
  Phase 2 (browser export) runs against a stale H / mean-solar-year and the
  resulting `data/01-holistic-year-objects-data.xlsx` mismatches every
  downstream fit.
- Running this pre-sync is idempotent: if script.js is already in sync,
  the tool reports "no changes" and exits.
- The tool is auto-invoked again in Step 2-sync after Phase 1 optimizers
  update per-planet `startpos` — that later invocation will also carry
  any leftover JSON diffs.

This step is a no-op on routine refits (JSON unchanged) but essential when
foundational constants have been re-derived (e.g. an H recalibration).

### Automated pipeline runner

Instead of running each step manually, use `run-pipeline.js`:

```bash
node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~2 min)
node tools/fit/run-pipeline.js --phase2        # Steps 4a-10 (~2.5 hrs, requires Step 3 data)
node tools/fit/run-pipeline.js --all           # Steps 1-2, then 4a-10
node tools/fit/run-pipeline.js --from 5a       # Resume from Step 5a onwards
node tools/fit/run-pipeline.js --iterate 20    # Repeat Steps 5a-5b 20 times
node tools/fit/run-pipeline.js --converge      # Repeat Steps 5a-5b until improvement < 0.001°
```

Output is logged to `tools/results/pipeline.log`. Stops on any step failure.
Step 3 (browser export) is always manual — the runner checks the data file exists.

**Observed timings (2026-07-15 H=335,317 recalibration):**
- Phase 1 (Steps 1-2): **~2 min** (8 optimizers, first run needs `baseline sun` JPL cache refresh)
- Step 4a (Perihelion harmonics): **~7 min**
- Steps 4b-d (ML training): **~10 min combined**
- Steps 5a-c (Planet corrections): **~1 min combined**
- **Step 6a (CSV export): ~2 hours** — this is the pipeline bottleneck. Default step timeout raised to 3 h.
- Step 6b (Obliquity): ~90 sec
- **Step 6c (Cardinal-point): ~40 min** — greedy fit × 4 CPs × 24 harmonics per CP. Default step timeout was 10 min (too short); raised to 60 min. Observed to complete in ~30 min.
- Steps 6d-10 (year-length, balance, verify, export, dashboard): ~5-10 min combined
- **TOTAL Phase 2: ~2.5-3 hours** dominated by Step 6a.

The `--iterate` / `--converge` flags repeat the planet correction fitting steps (5a parallax →
5b gravitation + elongation) iteratively. Each pass, the parallax sees cleaner residuals
and reallocates its terms, allowing the elongation correction to capture more signal.
Typically converges in 15-20 passes. Venus improves from ~0.10° to ~0.05°.
The Moon step (5c) runs once after the iteration completes.

### Manual step-by-step

```bash
# Pre-requisite: sync JSON → script.js after any foundational-constant edit
# (H, mean_solar_year, correctionDays, perihelionalignmentYear, Meeus/IAU anchors).
# No-op if src/script.js is already in sync with JSON.
node tools/fit/export-to-script.js --write                                   # Pre-Phase 0

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

# Phase 8: Sub-Milankovitch ΔT correction stack (independent of Phases 1–7)
# Runs OUTSIDE the pipeline runner. Re-run only on Phase-8 triggers (see
# "What triggers a refit?" table): change to a Bond/Hallstatt/Jose5/Jose4 _LATTICE_N,
# or refresh of the Stephenson polynomial input, or change to H.
# The DT_CORRECTIONS_DISABLED=1 env var is REQUIRED for --write — it bypasses
# the currently-shipped corrections so the fit sees the absolute residual, not
# a delta on top of shipped.
DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --write        # Step 11 → data/deltaT-4flag-fit.json
node tools/fit/export-dt-corrections.js --write                               # Step 12 → src/script.js + Node port + website deepTime.ts
# (Or: skip Step 12 explicitly and let Step 9 / manual export-to-holistic.js pick
#  it up as their delegated tail step — either flow produces the same result.)
# After sync: re-run browser L-5b and confirm RMS ~1625 s, medieval bump ~-640 @ 990.

# Manual: Sync to Holistic website (NOT in pipeline runner)
# Requires Steps 7b (balance-search) and 7d (fibonacci_significance.py) to have run.
node tools/fit/export-to-holistic.js --write                                 # → constants.ts, model-values.ts, deepTime.ts, etc.
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
