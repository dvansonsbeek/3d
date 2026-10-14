# Fitting & Derivation Scripts

> **Phase 9 (9-3a–9-3h):** the implementations live in
> **`packages/fitting/src/`** (`@essrt/fitting`) — moved with `git mv`, history
> preserved. Every `tools/fit/*.js` path documented below still works: each is
> a one-line shim into the package (argv/env pass through), kept so this
> README, the pipeline steps, and muscle memory stay valid. Exception still
> living here: `python/` (§2f). The verify suite stays in `tools/verify`
> with its run-suite classification until `tools/lib` becomes adapters.

All scripts that produce fitted coefficients or derived constants live here.
Output values are stored in their `data/*.json` artifacts (the ΔT stack:
`data/deltaT-4flag-fit.json`) and the `public/input/*.json` inputs;
`public/input/fitted-coefficients.json` carries only its description since
plan 09 deleted the last fitted family it held.

> **P5 note (post-excision):** the seven planets render from the orbital dynamics engine's
> governed artifact (`tools/verify/nbody-secular.js --write` is that path's
> regeneration). The parallax / gravitation / elongation correction fitters
> (former Steps 5a–5b) and their `PARALLAX_*`/`GRAVITATION_`/`ELONGATION_
> CORRECTION` keys were **retired with the K5 legacy-chain excision** — the
> corrected geometric RA/Dec path they fitted no longer exists.
> The planet **predictive-precession device** (`PREDICT_COEFFS_PHYSICAL` /
> `_UNIFIED` / `_OBSERVED`, the Step 4c/4d trainers, the 7g evaluator and
> `data/planet-prediction-fit-stats.json`) was **retired at plan 06 R8**:
> the arrays were trained on the Step-3 workbook exported 2026-08-28 —
> BEFORE the P5 flip and the K5 excision — and reproduced the retired
> geometric scene's exported Earth-frame RA rate, a self-fit of the
> simulator. The Earth-frame rate is now the
> equatorial projection of the chain's motion (doc 13 §1.8, zero fitted
> constants). Earth, Moon and Sun fitting is unaffected; it remains the
> shipped path.

## Design rule for scene-graph corrections

**The motion model carries NO fitted correction since plan 09** — the frozen
era device (its unit, counters and combs) is deleted; the movements are the
composed precession clock and the N-body series. Any correction ever added
again to the motion model (scene-graph rotations in `moveModel` or
`tools/lib/scene-graph.js`) MUST be a BOUNDED harmonic basis on a named
physical period. NO polynomial-in-T terms.

The retired combs' form, for the record: Σ Aₙ·sin(2π·t/(U/n)) + Bₙ·cos(2π·t/(U/n))
for integer n on the comb unit U (335,317 yr) — each n an integer tied to a
cycle the device named (the annual term n = U, its harmonics, the planets'
lattice integers). Arbitrary fit frequencies and DC offsets were not allowed.

**Why:** Polynomial-in-T corrections (T, T², T³, …) are not cyclic:
they grow without bound, compound across epochs, and silently destroy
the model's structural claims.

**Failure case (2026-06):** A `+0.0003032·T_jc²` polynomial was added to the
Sun's scene-graph angle (intended to match Meeus Ch.25 secular drift). It
gives ~arcseconds at modern epochs but reaches ~30,000° (~83 rotations) at
±10 Myr. Visible symptom: Sun displaced from planet-orbit center because
the correction was applied only to the Sun, not to planets — disabled in
4 locations and documented in `feedback_no_polynomial_corrections.md`.
The Sun-longitude harmonics that followed (`SUN_LONGITUDE_HARMONICS`, Step 0 —
a whitelisted comb on the retired unit's divisors, removed from every scene
path at plan 06 R4 when the Sun came to be placed at the certified longitude
from the engine's frame of date) were DELETED with their fitter and registry
keys at plan 09 step 5a. Record: [doc 109 §22](../../docs/109-model-nbody-engine-and-lattice-test.md)
and git history.

**Allowed exception:** standalone consumer-side calls (e.g. `_eclSunLon`
for one-off eclipse longitude reads) MAY keep Meeus polynomial terms —
they are short-window calculations consumed at a single epoch, not part
of the cyclic scene-graph motion.

## Runtime formula conventions

The coefficients this pipeline produces feed **runtime evaluation formulas**
in `src/script.js` and the engine (`tools/lib`, published as
`@essrt/physics`). The Holistic website wires the package factories directly
through its adapter (`src/lib/essrt.ts`), so website-side identity is by
construction. Several design choices at the runtime layer must stay in sync
with the basis those coefficients were fit on. Changing them does **not**
require re-running any fit — but they must be identical in the simulator and
the engine or the two calculators drift apart.

### The retired cardinal-point conventions (record)

Options A and B that stood here — the snapshot phase basis the cardinal-point
RA/JD/year-length harmonics were fitted and evaluated on (an integrated-phase
form drifted by hours across ±12 kyr), and the deep-time drift of the
cardinal JD's linear term — belonged to the frozen cardinal evaluator
(`createCardinalModel`, `computeSolsticeRA/JD/YearLength`), DELETED with its
coefficients at plan 09 step 7a. The cardinal instants are the one certified
Sun's crossings (`createModel().cardinal`). Record: [doc 109 §22](../../docs/109-model-nbody-engine-and-lattice-test.md),
`public/input/model-version.json` `_v24Note`.

### mSY convention: epoch-local (`/LOD`), not SI (`/86400`)

Days-per-year at epoch is computed as `T_tropical_s(t_Ma) / LOD_s(t_Ma)`
— the **epoch-local** convention where a "day" tracks the actual rotation
period: simulator `meanYearInDaysAtAge`, engine `deepLod.yearInDaysAtAge`
(the website adapter wires the same, `src/lib/essrt.ts`). At J2000 both
equal the IAU anchor exactly; at deep time they diverge from the
SI-anchored `/86400` form by a few percent at ±100 Myr.

The simulator also exposes `meanTropicalYearDaysAtAge` (SI /86400) — that
one is used deliberately by `recomputeTimeUnitsForEpoch` for a
Kepler-invariant scene JD, and the two are not interchangeable.

### The J2000 day is the SI day (86,400 s)

The J2000 length-of-day used to derive `meansiderealyearlengthinSeconds`
and downstream period conversions is the SI day — the day the IAU year
inputs are stated in (`ASTRO_REFERENCE.siderealYearJ2000 × 86400` in the
simulator; the engine agrees, and the website inherits it through the
published package constants). It supersedes the hand-tuned Method B shim
(× 86400.00001 s) and the retired device identity's 86,399.99968 s, whose
+0.32 ms/day bias the ΔT stack had absorbed (plan 09).

### Sidereal-year J2000 anchor: IAU 365.25636308 d

Both the simulator's `meansiderealyearlengthinDays` and the website's
`SIDEREAL_YEAR_J2000_DAYS` are anchored at the IAU J2000 value
`365.25636308 d`, and since plan 09 so is every runtime's J2000 sidereal
year: the retired device's kinematic form (the rounded mean solar year
scaled by its precession identity, ~365.256361 d — 150 ms/yr short of IAU,
and the source of a ~4 μs drift in the derived `meanlengthofday`) is deleted, the J2000 day is the SI day, and under deep
time the year lengths of date are the one-source family over the Layer-0
tidal mean day (`T_sid_s(t) / LOD_s(t)`), which is the IAU value at J2000
exactly.

## When does a coefficient re-fit actually need to run?

The obliquity / cardinal-point / year-length harmonics no longer exist:
plan 09 deleted the frozen era device and every coefficient it carried
(steps 2–7a the combs and the counters, 7b the unit function, 7c the inputs
the unit, the step length and the device's rounded tropical year). The
coupling list that stood here — the parameters whose change invalidated the
frozen coefficients — is void; the scene scaffold's pose constants
(`earthtiltMean`, `earthInvPlaneInclinationAmplitude`,
`kDeviceInclinationPhaseJ2000Deg`, `kDeviceWheelPhaseAtJ2000Cycles`,
`kDeviceWheelPeriodYears`) remain as recorded J2000 poses the engine places
the Earth frame over, not laws. See "The frozen era clock" below for the
record.

The ΔT correction stack (Phase 8) is the fitted family that still re-fits.
It is a post-integration overlay applied only to the historical ΔT curve —
it firewalls off from the LOD physics and does not feed Step 6a. Its refit
trigger is discussed under "Phase 8: ΔT correction stack" in the pipeline
below and in the "What triggers a refit?" table further down.

## `--write` flag convention

All fitting scripts support **dry run** by default (print results only).
Add `--write` to actually update the JSON source-of-truth files.
After all steps complete, run `verify-pipeline.js` (Step 8) to check for regressions,
then `npm run constants:generate` (Step 9).

## Scripts

| Script | Produces | Data source |
|--------|----------|-------------|
| `export-solar-measurements.js` | `data/02-solar-measurements-window.csv` via `npm run fit:6a2` (the full-period `data/02-solar-measurements.csv` is retired; written only on demand) | Scene-graph simulation (1-year steps, single pass) |
| `sun-longitude-harmonics.js` — DELETED at plan 09 step 5a with its two keys (the comb left every Sun path at plan 06 R4) | nothing (formerly `SUN_LONGITUDE_MEAN`, `SUN_LONGITUDE_HARMONICS`) | record: doc 109 §22 |
| `sun-planetary-completion-fit.js` | NOTHING (read-only, the Step-0 companion — 20.3h, SUPERSEDED by Stage D2) | JPL Horizons live (960 all-phase + 179 syzygy epochs, network required — so it can never be a gate). Was the dev record behind the v1 fitted 10-term table; the shipped table is now the DERIVED 70-term extraction on FRAMEWORK-native carriers (FQ-5 N3: `tools/explore/d2-derived-sun.mjs` → `n2-sun-framework-carriers.mjs` → `n3-carrier-swap-preview.mjs`; the carrier rates are injected live from the planet records by `model.js`), so its coefficient-drift part no longer applies — its syzygy + NASA-centerline scoreboards remain valid verification. After ANY planet-record period change, re-run the N3 extraction chain and re-embed the table + its `PAIRED_SUN_HARMONICS_SHA256` by hand — the test:model fingerprint gate enforces the pairing. |
| `ascnode-correction.js` | `ascNodeTiltCorrection`, `startpos` | `data/reference-data.json` |
| `moon-eclipse-optimizer.js` | NOTHING (RETIRED at plan 06 R3 item 1 — kept as the record) | Formerly `moonMeeusLpCorrection` + `MOON_CORRECTION` against 58 solar eclipses (2000–2025) + a JPL baseline. Both are retired: measured against Horizons' apparent Moon the series needs no anchor (−1.0″ ± 1.5″, 1970–2049), the +32.75″ was the eclipse tier's mean Sun compensated (κ + the I2 long inequality + the trend-ΔT offset), and the RA/Dec patches were fitted around the retired D5 aberration layer (docs/66 §1.4). `moonStartpos*` values are J2000-element anchored via the in-sim meters (docs/66 §4) and are NO LONGER fitted |
| (`python/fit_perihelion_harmonics.py` / `python/verify_perihelion_erd.py`) | DELETED at plan 09 step 4 with `PERI_HARMONICS_RAW` / `PERI_OFFSET` — Earth's perihelion of date is the series' ϖ (`createModel().earth.perihelionLongitudeDeg`) | — |
| `dt-corrections-fit.js` | `data/deltaT-4flag-fit.json` — cascaded LSQ fit of the 4-flag ΔT correction stack (Bond 1466 yr, Hallstatt 2430 yr, Jose5 897 yr, Jose4 716 yr — fitted periods stated in years, `period_yr`; the former divisor labels n = 1830/1104/2989/3749 survive only as identifiers) against the Stephenson 2016 residual. Sole authoritative source of the shipped `BOND_/HALLSTATT_/JOSE5_/JOSE4_ COS_/SIN_COEFF_S` constants. See "Phase 8" below. **JOINT WORLD (since 2026-07-23): `--joint` is the AUTHORITATIVE fit** — 4 flags + Core-mantle swing in one equality-constrained solve (hard USNO closure row, amplitude caps, resonator phases locked as unit shapes, free intercept = trend anchor). `--joint --write` ships the coefficients + anchors atomically (current joint optimum: USNO 86,400.0017, deltaTStart 55.85, Espenak fit-target RMS 12.60 s, full-window 31.27 s — read the live values from `data/deltaT-4flag-fit.json → optimum` and the stage-3 validation artifact, never from this sentence). The legacy single-shot cascade remains as a stage-wise diagnostic — **its `fit_metrics.stage_*` entries in `deltaT-4flag-fit.json` rank the flags differently from the shipped fit and must not be used to judge whether a flag earns its place** (worked example and the correct method in [doc 105](../../docs/105-dt-stack-flag-audit.md)); the resonator is default-ON runtime-wide (opt-out `DT_RESONATOR_DISABLED=1`; `DT_CORRECTIONS_DISABLED=1` alone still yields the fully-raw fitting residual via the integrator master-gate). | Stephenson 2016 spline (`public/input/stephenson-2016-deltaT-polynomial.json`) − pure-tidal framework model (`tools/lib/deep-time.js`, bypassed via `DT_CORRECTIONS_DISABLED=1`) |
| `data/core-mantle-resonator-stage1.json` (artifact — no shipped generator) | the **Core-mantle swing (Resonator driver)** shipped block: a 2-kick EPISODE (windowed damped oscillation, T₀ ≈ 3,916 yr stated in years in the artifact (`T0_yr`), Q, kick epochs/coefficients, phase-locked drive tone). Selection rule: pinned-T₀ guard-passers first (guard-aware solver — modern-window δLOD penalty rows). **Regeneration in the joint world: amplitudes refit automatically via `--joint --write` (tone menu derives from the active flags — generic over flag count). The episode CONVENTION (T₀ ≈ 3,916 yr — once labelled by a divisor of the retired unit, now a period in years — Q = 1.8, epochs −1600/+1600, impulse-consistent shapes) is a DOCUMENTED CONVENTION, not a build-time derivation — it is not re-derivable from anything in this repo. Its evidence is the tracked result JSONs (`data/core-mantle-resonator-*.json`) plus the docs/104 narrative; the stage-1/stage-3/impulse scripts that originally established it ran against the pre-joint world, cannot reproduce today's numbers, and are deliberately not shipped.** Kick epochs are a documented CONVENTION, not data-pinned — see the stage-3 stability artifact before moving them. | Stephenson residual after the shipped stack (node bridge to `tools/lib/deep-time.js`) + `data/deltaT-4flag-fit.json` (parents' phases for the locked tones) |
| `data/core-mantle-resonator-stage3-stability.json` (artifact — no shipped generator) | kick-epoch stability: coordinate refinement, ridge map + 2% stability box, era jackknife. Verdict 2026-07: epochs NOT data-pinnable (broad t_exc/T₀ ridge, era-dependent jackknife) → shipped epochs stand as convention. | same residual |
| `validate-resonator.js` | `data/core-mantle-resonator-stage3-validation.json` — runtime OFF/ON validation sweep of the CURRENT world (pipeline step: run after every `--joint --write` + sync): J2000 invariants, Layer-3 USNO anchor, Stephenson/Espenak-window RMS, deep-time bit-identity ±200 Myr. Joint-world reference values: ON Stephenson RMS ≈ 31.3 s, Espenak window ≈ 12.1 s. | production chain (`tools/lib/deep-time.js`) |
| `../constants/generate.mjs` | Generates the constants module `src/script.js` imports, from `public/input/*.json` plus `data/{balance-presets,deltaT-4flag-fit,core-mantle-resonator-stage1}.json`. Emits values verbatim — no formatting, no rounding | the JSON source files |
| `../constants/migrate-script-blocks.mjs` | One-off migration helper: replaces an embedded literal with its import, but only after proving the two bit-identical. `--adopt=NAME` for a deliberate value change | `src/script.js` |
| `reclassify-tiers.js` | Tier reclassification + JPL enrichment of Tier 1 data | `data/reference-data.json` |
| `verify-pipeline.js` | Pass/fail verification of all 9 targets + correction stack | Scene-graph simulation |

Note: `eocEccentricity` and `perihelionPhaseOffset` are derived analytically in
`constants.js` and require no pipeline step. The historical numerical-verification
scripts (`eoc-constants.js`, `perihelion-offset.js`) now live in
[`tools/explore/`](../explore/).

## Publishing to the website (Phase-14 flow)

Since the website split, the Holistic website carries NO fitted tables or
value computations of its own — it consumes two published npm packages:

- **`@essrt/physics`** — the complete engine core incl. all fitted
  coefficients (the calculator's adapter `src/lib/essrt.ts` wires its
  factories directly).
- **`@essrt/model-values`** — the 850+ rendered display keys the MDX
  `<V k="…"/>` tags and the paper macros read.

A refit reaches the website by REGENERATING and REPUBLISHING, never by
file sync:

```bash
# 3d repo — after the fit lands and gates are green
npm run constants:generate       # Step 9 (regenerates the packaged constants)
npm run values:package:write     # re-renders @essrt/model-values from the
                                 # registry + re-stamps both doc trees (§10)
# bump versions per the two-axis contract (see tools/verify/version-pinning.js),
# then publish both packages:
(cd packages/physics      && npm publish --access public --otp=…)
(cd packages/model-values && npm publish --access public --otp=…)

# Holistic repo — consume the new versions
pnpm update @essrt/physics @essrt/model-values
npx tsx docs/paper/generate-tex-values.ts       # refreshes docs/paper/model-values.tex
```

Anti-staleness is enforced, not remembered: `npm run values:package`
(in `check` and `check:docs`) fails naming the drifted keys whenever the
packaged values lag the registry, and the version-pinning gate refuses a
model change that isn't paired with a version bump.

## Dependency chain

When model parameters change, refit in this order. The logic:
0. (Step 0, the Sun-longitude harmonics — DELETED at plan 09 step 5a with
   its fitter and keys; record: doc 109 §22.)
1. Sun optimizer (Step 1) runs first. It derives the scene scaffold's Earth
   geometry constants (eccentricityBase, eccentricityAmplitude, obliquity,
   perihelion longitude).
2. (Planet angleCorrection / startpos — retired with the K5 excision: the
   planets render from the N-body chain.)
3. Only after Step 1 is the simulation state correct enough to export data.
4. (Earth's perihelion comb, Steps 4a/4b, is DELETED at plan 09 step 4 —
   Earth's perihelion of date is the series' ϖ; the planet ML trainers,
   Steps 4c/4d, are retired at plan 06 R8.)
5. (Parallax corrections — retired with the K5 excision.)
6. Solar measurements (cardinal points, perihelion/aphelion, world-angles) come
   from a single scene-graph pass at 1-year steps (depends on everything above)
   — the window CSV, Step 6a2.
7. The J2000 tropical year is DERIVED in one home from the IAU sidereal year
   and p_A; the year lengths of date are the one-source family (no fitted
   step — the cardinal-point harmonics it was once read from are deleted).
8. The solstice-obliquity comb (`SOLSTICE_OBLIQUITY_MEAN_FITTED` /
   `_HARMONICS`) is deleted (plan 09): the obliquity of date is the hybrid
   everywhere, so the old circular dependency (second full pipeline pass,
   ~1.5" effect) is gone with it.
9. The Sun T² polynomial correction (Meeus Ch.25 +0.0003032°/T²) that
   formerly paired with the Sun harmonics has been **REMOVED 2026-06**
   per the bounded-basis design rule (polynomial-in-T terms grow without
   bound at deep time and destroy the bounded-basis property). See the design
   rule near the top of this README.

```
── Phase 0: Pre-fit Sun harmonic structure (DELETED) ───────────────

Step 0:  DELETED at plan 09 step 5a — the Sun-longitude harmonic fitter and
         its keys SUN_LONGITUDE_MEAN / SUN_LONGITUDE_HARMONICS are gone (a
         whitelisted comb on the retired unit's divisors that had touched
         no scene path since plan 06 R4). Nothing runs here. Record: doc
         109 §22 and git history.

── Phase 1: Sun optimizer & planet alignment ──────────────────────

Step 1:  node tools/optimize.js optimize sun correctionSun
         → correctionSun, eccentricityBase, eccentricityAmplitude,
           earthtiltMean, earthInvPlaneInclinationAmplitude (all derived)
         Iterative solver: obliquity + perihelion longitude constraints
         converge simultaneously (typically 1 pass).
         Updates: model-parameters.json (5 Earth orbital constants)
         Verify: RMS < 0.004°, perihelion longitude < 0.01" from IAU

(Step 2 — per-planet startpos alignment — RETIRED for the planets with the
K5 legacy-chain excision: the seven planets render from the engine-D
Keplerian chain, anchored by the governed artifact's elements, not by
fitted scene angles. The `optimize <planet> startpos` command remains as a
diagnostic only.)

── Phase 2: Generate input data (manual) ──────────────────────────

Step 2-sync: npm run constants:generate && npm run build
         Regenerate the constants module from the JSON Step 1 wrote, then
         rebuild the bundle — the browser reads the built bundle, so without
         this every browser-side reading shows pre-optimization values.

Step 3:  Export from browser GUI              → data/01-holistic-year-objects-data.xlsx
         NO LIVE CONSUMER. The full-period objects export (one row per year
         of the retired unit, its first and last rows a closure point of
         the retired cycle) fed Steps 4a–4d only: the perihelion comb
         (4a/4b, DELETED at plan 09 step 4) and the planet ML trainers
         (4c/4d, retired at plan 06 R8). The unit, its phase anchor and
         `stepYears` are deleted (plan 09 step 7c), so the export's range
         protocol no longer exists. The detailed pre-export protocol is
         in git history.

── Phase 3: Earth perihelion & ML training ────────────────────────

Steps 4a/4b (python/fit_perihelion_harmonics.py → PERI_HARMONICS_RAW,
         PERI_OFFSET; python/verify_perihelion_erd.py): DELETED at plan 09
         step 4. The 25-term perihelion comb on H-divisors was fitted to the
         file-01 export's `Earth Perihelion ICRF` column (an RA, converted to
         ecliptic longitude of date before fitting — git history carries the
         script and the trap: fitting the RA directly carried a
         tan²(ε/2)·sin 2λ wave, 2.47° at H/32). Earth's perihelion of date is
         the series' ϖ (`createModel().earth.perihelionLongitudeDeg`); the
         scene's perihelion has followed it since v16.0, and the registry's
         plausibility row periLongModel2000AD vs periLongJ2000 (0.02°) gates
         the published value. Measured before deletion, comb − series: 0.03°
         at 2000, −1.6° at −4000, −20° at −26 kyr (data/era-device-readers.json).

Note: eocEccentricity and perihelionPhaseOffset are derived analytically in constants.js
      from correctionSun and the eccentricity constants — no pipeline step needed.

(Steps 4c–4d — the planet predictive-precession trainers
`train_precession_physical.py` (~2,421 physical-beat terms per planet) and
`train_observed.py`, with the residual ranker `greedy_features_physical.py`
— were RETIRED at plan 06 R8 together with their `PREDICT_COEFFS_*` keys and
`tools/lib/python/coefficients/`: they fitted the RETIRED geometric scene's
exported Earth-frame RA rate against the simulator's own export. The ids are
kept as shared vocabulary.)

── Phase 4: Moon ───────────────────────────────────────────────────

(Steps 5a–5b — the parallax and gravitation/elongation planet-correction
fitters — were RETIRED with the K5 legacy-chain excision: the planets
render from the engine-D Keplerian chain, and the corrected geometric
RA/Dec path they fitted no longer exists. The id 5c is kept — this
numbering is shared vocabulary.)

         Optional diagnostics (skip in standard refit):
         • ascnode-correction.js — scans ascNodeTiltCorrection. No --write.
           Step 2 already optimizes startpos/angleCorrection.

Step 5c: moon-eclipse-optimizer.js            → (RETIRED, plan 06 R3 item 1)
         Formerly fitted the Lp bias and the 3-term RA/Dec correction vs
         JPL. Both constants are gone: the Moon's series needs no anchor
         against Horizons' apparent Moon, and the eclipse location tier now
         rides apparent places (the Sun's κ, the Moon's relative
         light-time) instead of a fitted Moon offset. The id 5c is kept —
         this numbering is shared vocabulary; the script stays as the record.
         moonStartpos* values are J2000-element anchored via the in-sim
         meters (docs/66 §4) — NO LONGER fitted; the startPos scan in
         the tool is a flat-gradient diagnostic only, never written.
         Updates: model-parameters.json (Lp) + fitted-coefficients.json
         Verify: RMS separation < 0.85° (geocentric-parallax floor ~0.81°), individual eclipses < 2°

── Phase 5: Solar measurements & harmonic fits ─────────────────────

Step 6a: export-solar-measurements.js         → data/02-solar-measurements.csv
         RETIRED AS A KEPT FILE: the full-period export (one row per year
         of the retired unit, 160 MB) was the C-4b-era campaign record,
         stale against every later movement arc, read by no gate or fitter —
         deleted. The exporter still writes one on demand (2 h 24 m); the
         measurement list below describes what either export contains.

Step 6a2 (owner, 2026-09-16): `npm run fit:6a2`
         → data/02-solar-measurements-window.csv (gitignored)
         The SAME exporter over −4000..+4000 (8,001 years × 6 events =
         48,006 rows, ~5 min) instead of the retired full-period run (one row
         per year of the retired unit × 6 events, ~2.0 M rows, 2 h 24 m) — the LIVING check
         artifact ("do not generate 335,318 calculations — only
         ~50,000, or 10,000"); pass --start/--end for a smaller window.
         The full 6a CSV is retired (above): against the post-C-4b
         movement arcs it measured SS@−997 off by 2.9 h.
         CHECK: `npm run check:csv-smoke` regenerates the FULL 6a2
         range into a scratch file and compares EVERY row against the
         6a2 artifact BIT-EXACTLY (~25 min since plan 06 R4: the
         exporter's fast Sun rides the engine Earth frame and evaluates
         the certified longitude per probe, measured 36 s per 200 yr; the
         pre-R4 window's instants were the K wheel Sun's — 20 min off in
         1500–2500, 27 h at −4000 — the re-base is the intended move) —
         compare-only (never writes the artifact), local-only (CI
         SKIPs), fail-proven via ESSRT_CSV_SMOKE_PLANT=1. A mismatch =
         the movement changed: bug, or an intended change → re-base
         with fit:6a2 and say so in the commit.
         Single-pass scene-graph simulation (~2 h measured — see "Observed
         timings" below; it is the pipeline bottleneck) measuring:
         - Cardinal points: SS (max dec), WS (min dec), VE (dec=0↑), AE (dec=0↓)
         - Perihelion (min wobble-center distance), Aphelion (max distance)
         - World-angle (sidereal position) at each event
         1-year steps over the requested range. All 6 event types use computeSunPositionFast().
         Output columns: Type, Model Year, JD, RA, Obliquity, World Angle, Distance
         Test range: --start -25000 --end 25000
         ONE-SOURCE MOVEMENT (Stage C-4b onward; the ONLY Node scene since
         plan 06 Phase 3 S3c / item 3): the scene's ε(t)/e(t) come from the
         banked engine series (tools/lib/scene-graph.js), so the CSV measures
         the one-source movement. There is no switch any more — the former
         `SG_ONE_SOURCE` env and `setOneSourceMovement` setter are gone with
         the K-device branches they selected; an absent series artifact is a
         loud error. BEFORE any regeneration: back up
         the current CSV outside the repo (gitignored — no git
         recovery). The CSV is the banked RECORD of the one-source
         movement (validation/research consumers); no fitting step reads
         it — the harmonic clock it once fed is deleted (next section, the
         record).

## The frozen era clock

(Record — nothing in this section runs.) The harmonic-clock coefficients
were FROZEN at their last K-movement fit (cardinal interior RMSE 0.23-0.37
min, tropical 0.002 s class): the certified era clock. They never re-fit
again, and plan 09 deleted them family by family: SOLSTICE_OBLIQUITY_* (the obliquity rides the hybrid),
TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS with YEAR_LENGTH_J2000_ANCHOR
(the J2000 year lengths are the IAU inputs on the SI day, the year lengths
of date the one-source family); and last, at step 7a, the CARDINAL_POINT_*
family with its package evaluator and the clock's own counter (the ∫dt/H_era
phase table, `cyclesBetweenYears`, `eraClockHAtAge`) — doc 110 §5.2/§5.5
keep the last render as a static record, and fitted-coefficients.json
carries no coefficient block since. Plan 06 R1 (measured): the
CARDINAL_POINT_* family and the comb-based Sun drift left the runtime —
the cardinal instants are the apparent crossings of the one certified Sun
whose mean longitude integrates the one-source tropical year (against JPL
Horizons' own crossings over ±3000 yr the shipped instants are within a
minute in 1000–3000 and about two minutes in the ancient era, where the fitted device
sat hours — `tools/verify/sun-vs-horizons.js`; the era-clock year carried
no secular drift). A harmonic re-fit
against the one-source CSV is a CROSS-FAMILY fit, and it was MEASURED
(2026-09): cardinal interior RMS 8.8-16 min (30-60×), equinox J2000
anchors ±2 h off IAU, day-scale amplitudes chasing the engine's
off-lattice secular spectrum (s-modes, g-modes, the 405-kyr g₂−g₅ beat —
the documented off-lattice case). The retired fitters (obliquity-, year-length-, cardinal-point-harmonics —
the §10 derived form, the 8%/side edge trim and the §10g joint sidebands)
are preserved in git history (commit 16d7c87f); the untracked local
archive tools/fit/archive/ keeps working copies. At the D4 flip the movement's consumers
read the one-source evaluator directly. With the coefficients deleted, the
FROZEN-CLOCK COUPLING marks the trigger table once carried are void: no
parameter change invalidates a clock that no longer exists. Plan-level
record: [doc 109 §22](../../docs/109-model-nbody-engine-and-lattice-test.md),
`public/input/model-version.json` `_v24Note`.

Step 6f (sun-longitude-harmonics.js → SUN_LONGITUDE_MEAN +
         SUN_LONGITUDE_HARMONICS, later run as Step 0): DELETED at plan 09
         step 5a with its keys. It fitted a whitelisted harmonic correction
         on the retired unit's divisors to the scene Sun's residual against
         Meeus Ch.25 (197.77″ → 7.39″ RMS, Phase Z-B); from plan 06 R4 it
         touched no scene path. Its coefficients, whitelist, toggles and
         refit caveats are in git history.

── Phase 5b: Eccentricity amplitudes & balance law verification ──

Steps 7a, 7b, 7d, 7e: deleted with the integer laws (plan 07 R6) — the
         K-derived amplitude check, the balance search, the law verifier and
         the significance test. `data/balance-presets.json` and
         `data/significance-results.json` stay as frozen records that no
         step regenerates.

Step 7c: DT_CORRECTIONS_DISABLED=1 dt-corrections-fit.js --joint --write
         → data/deltaT-4flag-fit.json + data/core-mantle-resonator-stage1.json
           + astro-reference.json deltaTStart          (JOINT WORLD, 2026-07-23)
         AUTHORITATIVE fit: 4 flags + the Core-mantle swing (Resonator)
         episode in ONE equality-constrained solve — hard USNO closure row
         (anchor met exactly, resonator included), amplitude caps at FIXED
         convention values (cap-creep warning in the code), impulse-
         consistent resonator shapes (sin-only kicks, compensated tone,
         phases locked), composite selection (best Espenak s.t. full-window
         RMS ≤ 40 s). Then republish the website packages (values:package:write) and run
         tools/fit/validate-resonator.js. The legacy
         single-shot cascade (plain --write) remains a stage-wise DIAGNOSTIC
         (collinearity warnings, Stage-E phantom check) — do not ship from
         it. See dt-corrections-fit.js header + docs/104.
         Only re-run when the tidal LOD physics, its anchor or the
         Stephenson input changes (each shifts the framework model ΔT
         curve, altering the residual to fit).
         Automated in the pipeline as of 2026-07-15.

Steps 7f-7i: campaign-artifact generators     → data/*.json (inputs-stamped)
         The §12h anti-staleness generators. Each owns a campaign artifact,
         stamps an `inputs` block (sha256 of every input file including the
         generator itself), and is verified by the artifact-freshness gate
         (`npm run check:artifacts`, part of `npm run check` and
         `check:docs`) — the gate fails naming the exact regeneration
         command whenever an input moves without a re-run. All four run in
         the automated pipeline by default.

         7f: node tools/verify/cassini-results.js --write
             → data/cassini-moontilt-results.json (runs both Cassini labs
             live via their --json result lines; fast)
         (7g — the prediction-fit evaluator → planet-prediction-fit-stats.json —
             RETIRED with the planet predict device at plan 06 R8)
         7h: node tools/verify/lod-climate-correlation.js --write
             → data/lod-climate-correlation-summary.json (Pearson r of the
             ΔT-stack ΣLOD vs the tracked climate proxies; seconds)
         7i: node tools/verify/eclipse-audit.js --write
             → data/eclipse-audit-summary.json, all four sections: L-5b
             lunar + L-7 solar primary-source comparisons, the 26-preset
             alignment audit and the Babylon −135 scan row on the proven
             scene-umbra Node twin (~2-4 min). Plain --write REFUSES on
             divergence from the recorded values (a legitimate refit makes
             this step fail loudly); `--rebaseline` is the conscious
             re-measurement path.

── Phase 6: Verify & sync ─────────────────────────────────────────

Step 8:  verify-pipeline.js                   → pass/fail
         Verifies JSON consistency, earth geometry at J2000 (obliquity, obliquity
         rate, perihelion longitude, e(J2000), all year lengths by formula, cardinal
         point JDs), and checks planet baselines against stored values in
         tools/results/baselines.json. Warns on regressions (>0.001°).
         Must pass before Step 9. Add --write to update baselines.

Step 9:  npm run constants:generate           → generated constants module
         Regenerates the module src/script.js imports. tools/lib reads the
         JSON directly and needs nothing from this step.
         Safe to run at any point — there is no publish gate; `npm run check`
         and the headless-browser golden masters are the verification.
         Rebuild (`npm run build`) if the browser is about to read the values.

Publish: the website consumes the published packages — after Step 9, run
         `npm run values:package:write`, bump versions per the two-axis
         contract, and `npm publish` both packages (full commands in
         "Publishing to the website (Phase-14 flow)" above). The registry
         also reads the frozen records data/balance-presets.json and
         data/significance-results.json, which no step regenerates.

── Phase 7: (retired) ─────────────────────────────────────────────

Step 10 was the Data Explorer dashboard export; the dashboard is retired.
         The rule it carried still holds: when
         updating src/script.js mean*AtAge functions, the equivalent in
         tools/lib/deep-time.js MUST be updated in parallel — they are
         the same chain in two locations.
```

── Phase 8: ΔT correction stack (Bond + Hallstatt + Jose5 + Jose4) ─

Step 11 (= pipeline step 7c — the runner executes it in a normal pass;
         this section is the deep dive):
         DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --joint --write
         → data/deltaT-4flag-fit.json + resonator JSON + deltaTStart
         (JOINT WORLD — authoritative; the cascade description below is the
         legacy diagnostic path, retained for its stage-wise instrumentation)
         Cascaded LSQ fit of the sub-Milankovitch harmonic ΔT correction stack
         (periods stated in years; the n labels below are former divisor
         identifiers, not inputs)
         against the Stephenson 2016 residual over years -720 → 2016:
           Stage A: Bond (n=1830, 1466 yr) solo (unconstrained; the primary anchor)
           Stage B: Bond + Hallstatt (n=1104, 2430 yr) joint; Hallstatt cap-only to 80 s
           Stage C: Bond + Hallstatt + Jose5 (n=2989, 897 yr) joint; Jose5 cap-only to 50 s
           Stage D: + Jose4 (n=3749; 4×Jose 715 yr); free-fit 35 s (below 50 s prior — no cap)
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

         Independent of the orbital steps (1–10) — the 4 correction
         cycles are post-integration cosmetic corrections to the framework's
         historical ΔT curve, not part of the LOD physics. They do NOT feed
         Step 6a and do NOT affect the
         model-values registry.

         Candidate identification: the comb-era cross-archive scan (deleted
         with its artifacts at plan 09 step 7e; docs/109 §22 is its record)
         cross-validated candidate periods against multiple paleoclimate
         archives (Steinhilber solar Φ, Stephenson ΔT, Cheng speleothem,
         EPICA CO2, LR04). Jose4 was selected as the tightest structural
         anchor (0.083% to 4×Jose) with cross-archive coherence in
         Steinhilber + EPICA.

         Rollback history (research trail): Eddy (999 yr) and Emp862
         (862 yr) were tested as 5th/6th flags and rolled back —
         Eddy caused L-5b regression via Bond-amp inflation; Emp862 made the
         6-cycle fit rank-deficient. Both are documented in the fit tool's
         CONFIG.cycles rollback comments. See docs/102 § "Companion
         harmonics" for the investigation trail.

         After the joint fit: Step 9 regenerates the constants module for
         `src/script.js` (`tools/lib/deep-time.js` reads the JSONs directly),
         and the website receives the BOND_/HALLSTATT_/JOSE5_/JOSE4_ and
         RES_* resonator constants inside the republished `@essrt/physics`
         (see "Publishing to the website").

         Then re-run the browser L-5b test and confirm the model-residual
         RMS and medieval-bump shape are unchanged (verdict stays
         ✓ CONSISTENT — read the live numbers from the L-5b panel and
         data/eclipse-audit-summary.json, not from this README).
         A Node-vs-Python fit variance of a few degrees in Hallstatt/Jose5
         phase is expected (different LSQ implementations converge to nearby
         local optima); accept if L-5b regression is < ~10 s in either metric.

> **The retired clock and its fit basis (record).** The harmonic-clock
> coefficients were last fit (Phase D) against the K-movement CSV produced by
> the deep-time-ON, pos↔JD-integrated engine, on the corrected basis:
> per-row cycle axis (R12/R13), event-row anchors (R14), shipped divisor
> sets (R10), and the §10 derived cardinal form (R5/R7/R8/R9) with its
> runtime mirrors (R11). That was THE LAST FIT; the coefficients are
> deleted (plan 09 — see "The frozen era clock" above). The full-period CSV
> it was fitted on is no longer kept; the K-movement fit basis lives in the
> off-repo backup.
>
> The rule it taught stands for every fitted family (today the ΔT stack):
> coefficients and runtime evaluation form are a MATCHED PAIR. Any change
> to either side must land with its counterpart — shipping one without
> the other is a ~1162-minute-class error
> (`holisticuniverse/docs/plans/IP-deeptime-scene-graph-alignment_new.md` §5).

Note: the Step 6a exporter writes all solar events (cardinal points +
perihelion/aphelion) with world-angles, one block per year. No fitting step
reads its output any more (the harmonic clock is deleted — see "The frozen
era clock"); the kept artifact is the 6a2 window CSV, the full-period file is
retired. The J2000 tropical year is derived in one home from the IAU
sidereal year and p_A; the year lengths of date are the one-source family.

## What triggers a refit?

| Parameter changed | Steps to rerun |
|-------------------|----------------|
| `H` (holisticyearLength) | DELETED at plan 09 step 7c — no longer an input. The ΔT stack's periods are stated in years in the fitted coefficients (`period_yr`), not derived from a unit. |
| `longitudePerihelion` (any planet) | 2 (that planet only) |
| `solarYearInput` (any planet) / `moonSiderealMonthInput` / `yearLengthRef.siderealYear` | **The Sun-completion carriers ride these** (FQ-5 N3: `model.js` computes the carrier rates live; plan 06 I2: SIDEREAL — record rate minus the model's J2000 precession, Earth the sidereal year). Re-run the extraction chain (`tools/explore/n2-sun-framework-carriers.mjs` → `i2-sidereal-carrier-table.mjs` for the 70 short-period rows, `i2-long-inequality.mjs` for the two long-period rows on the model's own WH engine), re-embed the TERMS + `PAIRED_CARRIER_RATES_SHA256` in `eclipse/sun-planetary-completion.cjs` — the test:model fingerprint gate FAILS until you do (fail-proven). Plus the planet's own step 2 where applicable. |
| `earthtiltMean` | 1, 6a2 (window CSV) |
| `earthInvPlaneInclinationAmplitude` | 1, 6a2 (window CSV) |
| `earthInvPlaneInclinationMean` | 6a2 (window CSV) |
| `correctionSun` | 1, 6a2 (window CSV) |
| `SUN_LONGITUDE_HARMONICS` / `SUN_LONGITUDE_MEAN` | DELETED at plan 09 step 5a with Step 0 — nothing to rerun. |
| ~~Sun T² polynomial (inline in `moveModel`)~~ | **REMOVED 2026-06** — violates design rule (polynomial-in-T not cyclic). Do not re-introduce. |
| `eccentricityBase` / `eccentricityAmplitude` | 1, 6a2 (window CSV) — scaffold constants; Earth's e of date is the N-body series |
| `correctionDays` | 6a2 (window CSV) |
| `useVariableSpeed` | ALL (1→10) |
| Planet `startpos` | — (Steps 2/5a-5b retired — K5 excision; legacy scene angle) |
| Planet `eocFraction` | 3 (5a-5b retired — K5 excision) |
| Planet `solarYearInput` | see the Sun-completion carriers row above (Steps 4c/4d retired at plan 06 R8; 2/5a-5b with the K5 excision) |
| Planet `orbitalEccentricityBase` | — (Steps 2/5a-5b retired — K5 excision; legacy law constant) |
| `perihelionalignmentYear` | 1, 6a2 (window CSV) |
| `stepYears` | DELETED at plan 09 step 7c (the retired unit's lattice grid; since plan 07 R10 the grid year was J2000 and its delta identically 0). |
| `siderealYearJ2000` (in yearLengthRef) | Derived: `meansiderealyearlengthinSeconds = siderealYearJ2000 × 86400` |
| Bond / Hallstatt / Jose5 / Jose4 period (`period_yr`, stated in years) | Step 11 (= 7c; independent of the orbital steps). The 4-flag ΔT stack has no upstream dependency on Steps 1–10; the fit re-runs against the Stephenson residual, reaches `src/script.js` and `tools/lib/deep-time.js` through the JSON (Step 9 / direct read), and the website via the republished `@essrt/physics` (see "Publishing to the website"). |
| `_TAPER_FULL_HALFWIDTH_YR` / `_TAPER_TOTAL_HALFWIDTH_YR` (Holocene taper) | None — the taper is applied at runtime and does not affect the shipped cos/sin coefficients. Verify L-5b after change. |
| Stephenson polynomial (`public/input/stephenson-2016-deltaT-polynomial.json`) | Step 11 (= 7c). Fit target changed → all four cycles re-fit. |

**The retired unit (plan 09 step 7c).** `holisticyearLength` (335,317 yr =
23 × 61 × 239), `stepYears` (23) and `inputmeanlengthsolaryearindays`
(365.2422 d) left `model-parameters.json`; the literals gate fails if any
returns. What the unit's small-integer divisors posed — the K scaffold wheels
— is the recorded `earth.kDeviceWheelPeriodYears` block (the exact doubles of
the former 335,317/N, keyed by wheel index), a scene pose and not a law; the
J2000 mean tropical year is DERIVED from the IAU sidereal year and p_A
(`computeMeanTropicalYearJ2000Days`), and the deep-time clock is T_p(t).

## How to run

All scripts default to **dry run** (print only). Add `--write` to update JSON files.
Run `npm run constants:generate` to regenerate the module `src/script.js` imports.
This can be done after each `--write` step, or once at the end.

### Pre-requisite — regenerate constants after foundational-constant edits

If you have just edited one of the source-of-truth JSON files
(`public/input/model-parameters.json`, `public/input/astro-reference.json`)
— e.g. changing `correctionDays`, `perihelionalignmentYear`, a scaffold pose
constant, or any Meeus/IAU anchor —
**run `npm run constants:generate` FIRST** so the generated module reflects the
new JSON state before any pipeline step touches it:

```bash
npm run constants:generate                   # Regenerate constants (pre-Phase 0)
npm run build                                # only if the browser will read them
```

Why this matters:
- The Node pipeline (`tools/lib/constants.js`) reads JSON directly, so it
  always sees the new values.
- The browser (`src/script.js`) imports the generated module, and nothing but
  this command regenerates it. Skip it and every browser-side reading runs
  against stale constants.
- The browser also runs the BUNDLE, not the source — rebuild after
  regenerating, or leave `npm run dev` running so Parcel picks it up.
- Regeneration is idempotent: the module is a pure function of the JSON.
  `npm run test:constants` is the same generator in check mode and prints
  `PASS — generated modules match the JSON` when nothing has drifted.
- The tool is auto-invoked again in Step 2-sync after the Step 1 optimizer
  runs — that later invocation will also carry any leftover JSON diffs.

This step is a no-op on routine refits (JSON unchanged) but essential when
foundational constants have been edited (e.g. a scaffold pose constant or
an IAU anchor).

### Automated pipeline runner

Instead of running each step manually, use `run-pipeline.js`:

```bash
node tools/fit/run-pipeline.js --list          # print the step plan (dry run, writes nothing)
node tools/fit/run-pipeline.js --phase1        # Step 1 only (Step 2 retired — K5 excision)
node tools/fit/run-pipeline.js --phase2        # the Phase-2 steps (see the defect note below)
node tools/fit/run-pipeline.js --all           # Step 1, then Phase 2
node tools/fit/run-pipeline.js --from 6a2      # Resume from Step 6a2 onwards
```

Output is logged to `tools/results/pipeline.log`. Stops on any step failure.

**Known defect (v24.0).** The runner's step list
(`packages/fitting/src/run-pipeline.cjs`) still names Steps 4a–4d and 7g,
whose scripts are deleted (4a/4b at plan 09 step 4) or retired (4c/4d/7g at
plan 06 R8), and still refuses Phase 2 without the Step-3 export file, which
has no live consumer. `--phase2` / `--all` therefore stop at 4a and
`--from 6a2` stops at 7g. Until the runner is trimmed, run the live steps
manually (next section).

**Observed timings (2026-07-15 recalibration; the deleted steps are struck):**
- Phase 1 (Step 1): **~15 s** (the Sun optimizer; first run needs `baseline sun` JPL cache refresh. Was ~2 min with the retired per-planet Step 2)
- ~~Steps 4b-d (ML training): ~10 min combined~~ — deleted / retired
- Step 5c (Moon): **~1 min** (5a-5b retired — K5 excision)
- **Step 6a2 (window CSV export): ~25 min** — the pipeline's longest step since the full-period Step 6a (~2 hours) was retired.
- Steps 7a-7c, 8-9 (balance, ΔT joint fit, verify, constants): ~5-10 min combined
- Steps 7f-7i (campaign-artifact generators): ~5 min combined, dominated by 7i (eclipse audit, ~2-4 min; 7g retired at plan 06 R8)
- **TOTAL Phase 2: ~1 hour** dominated by Step 6a2.

### Manual step-by-step

```bash
# Pre-requisite: sync JSON → script.js after any foundational-constant edit
# (correctionDays, perihelionalignmentYear, scaffold pose constants, Meeus/IAU anchors).
# No-op if src/script.js is already in sync with JSON.
npm run constants:generate                                                   # Pre-Phase 1

# (Phase 0 — Step 0, the Sun-longitude harmonic fit — DELETED at plan 09 step 5a.)

# Phase 1: Sun optimizer & planet alignment
node tools/optimize.js optimize sun correctionSun --write                    # Step 1
# (Step 2 — per-planet startpos — retired with the K5 excision)

# Step 2-sync: push Step 1's values to script.js
# so the browser simulation uses the post-optimization values
npm run constants:generate && npm run build                                  # Step 2-sync

# (Phase 2, Step 3 — the browser objects export — has no live consumer since
#  Steps 4a–4d left; see Step 3 above.)

# Phase 3: Earth perihelion & ML training
# (Steps 4a–4b — the perihelion comb fitter and verifier — deleted at plan 09 step 4;
#  Steps 4c–4d — the planet predict trainers — retired at plan 06 R8)

# Phase 4: Moon (Steps 5a-5b retired — K5 excision)
# node tools/fit/ascnode-correction.js          # optional diagnostic
node tools/fit/moon-eclipse-optimizer.js --write                             # Step 5c

# Phase 5: Solar measurements & harmonic fits
npm run fit:6a2                                                              # Step 6a2 → the window CSV (−4000…+4000; ~25 min) — re-base it when the engine's frame of date moves
npm run check:csv-smoke                                                      # the bit-exact window compare
# (The full-period Step 6a export is retired as a kept file — see Step 6a;
# `node tools/fit/export-solar-measurements.js` still writes one on demand, ~2 h.)
# (The obliquity / year-length / cardinal harmonic fits are retired and their
# coefficients deleted, plan 09; see "The frozen era clock". Nothing runs after 6a2.)

# (Phase 5b, the balance-law verification — Steps 7a/7b/7d/7e — is deleted
# with the integer laws, plan 07 R6.)

# Phase 6: Verify & sync
node tools/fit/verify-pipeline.js                                            # Step 8 (must pass)
node tools/fit/verify-pipeline.js --write                                    # update baselines.json
npm run constants:generate                                                   # Step 9

# Phase 8: Sub-Milankovitch ΔT correction stack (independent of Phases 1–7)
# Automated in the runner as step 7c. Re-run standalone only on Phase-8 triggers (see
# "What triggers a refit?" table): a change to a Bond/Hallstatt/Jose5/Jose4 period,
# a refresh of the Stephenson polynomial input, or a change to the tidal LOD physics.
# The DT_CORRECTIONS_DISABLED=1 env var is REQUIRED for --write — it bypasses
# the currently-shipped corrections so the fit sees the absolute residual, not
# a delta on top of shipped.
# --joint is the AUTHORITATIVE fit. Plain --write is the legacy stage-wise
# cascade — a diagnostic only; never ship from it (see Step 11 above).
DT_CORRECTIONS_DISABLED=1 \
  node tools/fit/dt-corrections-fit.js --joint --write                        # Step 11 → deltaT-4flag-fit.json + resonator + deltaTStart
node tools/fit/validate-resonator.js                                          # OFF/ON validation sweep
npm run constants:generate                                                    # → src/script.js (Step 9)
# After the fit: re-run browser L-5b and confirm the ✓ CONSISTENT verdict.

# Publish to the website:
npm run values:package:write     # re-render @essrt/model-values + re-stamp docs
# bump versions (two-axis contract), then publish both packages — see
# "Publishing to the website (Phase-14 flow)" for the full command block.
```

## Where outputs are stored

| Output type | Location |
|-------------|----------|
| Model parameters (JSON) | `public/input/model-parameters.json` ← single source of truth |
| Fitted coefficients (JSON) | the ΔT stack: `data/deltaT-4flag-fit.json` + `data/core-mantle-resonator-stage1.json`; `public/input/fitted-coefficients.json` carries only its description since plan 09 |
| ML coefficients (Python) | retired at plan 06 R8 (`tools/lib/python/coefficients/` deleted) |
| Browser simulation | `src/script.js` ← imports the generated constants module |
| Solar measurements (CSV) | `data/02-solar-measurements-window.csv` (−4000…+4000, 1-year steps, 3.7 MB, gitignored; the full-period file is retired) |
| Browser export (Excel) | `data/01-holistic-year-objects-data.xlsx` (1-year steps, ~300 MB; no live consumer — see Step 3) |

Note: Large data files (>100 MB) are excluded from git via `.gitignore`.
They are generated locally (Step 3, and Step 6a on demand).

## Single source of truth — JSON files

All input data lives in 4 JSON files in `public/input/`:

| File | Contents | Who writes |
|------|----------|-----------|
| `model-parameters.json` | Model theory parameters (corrections, the scaffold's recorded J2000 pose, planet configs) | Manual / optimizer |
| `astro-reference.json` | IAU/JPL/Meeus reference data | Manual (external sources) |
| `fitted-coefficients.json` | Its description only — the harmonic, parallax and obliquity families it once held are deleted (K5, plan 09) | — |
| `meeus-lunar-tables.json` | Moon perturbation tables (Meeus Ch. 47) | Manual (reference data) |

## Constants flow

```
public/input/ (single source of truth)
    ├── model-parameters.json     ← Model parameters (corrections, scaffold pose, planet configs)
    ├── astro-reference.json      ← External reference data (IAU, JPL, Meeus)
    ├── fitted-coefficients.json  ← description only (its families are deleted, plan 09)
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
         │    (tools/lib/python/predictive_formula.py — the kinematic mirror — retired at plan 09 step 5a)
         │
         └──→ npm run constants:generate
              src/script.js   ← Browser simulation (imports the generated module;
                                generated at build time, not fetched at runtime)

Fitting scripts write to JSON, then `constants:generate` (Step 9) regenerates the module:
    optimize.js                  → model-parameters.json       (Step 1)
    dt-corrections-fit.js        → data/deltaT-4flag-fit.json  (Step 7c / 11)
```

## Correction Stack (RETIRED — K5 excision)

The planet positions formerly went through fitted correction layers
(Parallax → Gravitation → Elongation) after the raw scene-graph computation,
managed by a `correction-stack` registry with `prepareForFitting()`. That
whole stack retired with the K5 legacy-chain excision — the planets render
from the engine-D Keplerian chain, which has no fitted display corrections.
The Moon Meeus layer (`MOON_CORRECTION`, Step 5c) is unaffected.
The Correction Stack Architecture record (doc 71) is archived.

## ΔT stack diagnostic hooks (dt-corrections-fit.js)

Three environment variables turn the fitter into a cross-validation instrument.
All are diagnostic-only and **refuse `--write`/`--sync-code`**; with every one
unset, output is byte-identical to the shipped run.

| variable | effect |
|---|---|
| `DT_FIT_WINDOW="start:end[:step]"` | train on a sub-window; the held-out complement of −720…2017 is scored automatically, against an intercept-only baseline |
| `DT_FLAGS="bond,hallstatt,jose5,jose4"` | restrict the joint design matrix to a subset of flags |
| `DT_FIT_DUMP=<path>` | write the joint solution (coefficients, anchors, amplitudes) to an arbitrary path |

```bash
# in-sample: what does a configuration buy?
DT_FLAGS="bond,hallstatt" DT_CORRECTIONS_DISABLED=1 \
  node tools/fit/dt-corrections-fit.js --joint

# out-of-sample: can it predict the pre-CE era it never saw?
DT_FLAGS="bond,hallstatt" DT_FIT_WINDOW="0:2017" DT_CORRECTIONS_DISABLED=1 \
  node tools/fit/dt-corrections-fit.js --joint
```

Two traps, both documented with worked examples in
[doc 105](../../docs/105-dt-stack-flag-audit.md):

- **Never judge a flag from `fit_metrics.stage_*`** — those are legacy cascade
  diagnostics and rank the flags differently from `--joint`.
- **Never judge Jose5 or Jose4 singly.** They are a coupled pair (897 yr and
  715.5 yr); each looks poor without the other while the pair is optimal. Use
  leave-one-out, not a cumulative cascade.

## Python-Node.js bridge

Python scripts cannot parse JavaScript directly. Instead, `load_constants.py` calls
`_dump_constants.js` via `subprocess`, which runs Node.js to load `constants.js` and
outputs all constants as JSON to stdout. Python reads this JSON, so all Python scripts
automatically use the same values as the Node.js tooling — no manual sync needed.

(The Python scripts that read the Excel export and downsampled it by
`stepYears` — Steps 4a–4d — are deleted or retired, and `stepYears` left the
inputs at plan 09 step 7c.)

## Related documentation

- The cardinal instants ride the certified Sun (`createModel().cardinal`); the retired cardinal-point combs' record (doc 14) is archived
- [Equation of Center](../../docs/65-equation-of-center.md) — EoC derivation and constants
- Parallax Corrections — archived; the fitted parallax layer was deleted in the K5 excision
- Correction Stack Architecture — archived; the layer-ordering + prepareForFitting() record lives in git history
