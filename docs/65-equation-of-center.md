---
docVersion: 1.0
modelVersion: v12.0
coefficients: sha256:8ba33b5f301719c5
status: current
---

# Equation of Center -- Implementation Reference

**Status**: Complete (Sun + all planets with per-planet EoC fractions)

---

## What It Does

The equation of center adds Kepler's 2nd Law variable speed to the Sun's orbit.
The Sun moves faster near perihelion (January) and slower near aphelion (July):

```
theta += 2 * e * sin(M) + 1.25 * e^2 * sin(2M)
```

Where `e` is the eccentricity and `M` is the mean anomaly from perihelion.

Gated by `useVariableSpeed` flag. When false, all orbits use constant angular
velocity.

---

## The Double-Counting Problem

### Two speed mechanisms in the model

The model approximates an elliptical orbit using a **circular orbit with an
offset center**. Earth sits at `e(t) × 100` units from the circle center — the
full eccentricity of the one H/3 law, carried by the Perihelion Precession 2
centre every frame. This design correctly reproduces the distance variation
between perihelion and aphelion.

However, it also creates **apparent angular speed variation from geometry
alone**: when the Sun is closer to Earth, the same arc length on the circle
subtends a larger angle as seen from Earth. So even without any equation of
center, the Sun already appears to move faster near perihelion -- purely from
the off-center viewing position.

The standard equation of center formula was designed for pure Keplerian orbits
where the mean anomaly advances uniformly and ALL speed variation must be added
by the formula. In our model, the off-center geometry already provides
approximately half of the correct speed variation. Adding the full equation of
center on top would produce roughly double the real effect.

### Quantitative analysis

For a circular orbit of radius `a` centered at point C, observed from point O
displaced by `d = e_geom * a`:

```
apparent angle ~ M + e_geom * sin(M)     (first-order geometric parallax)
```

The real Keplerian equation of center gives:

```
true anomaly ~ M + 2 * e_real * sin(M)   (first-order)
```

The geometric offset provides amplitude `e_geom`, while the full Keplerian
effect has amplitude `2 * e_real`. The geometric offset contributes exactly
**half** the first-order effect for the same eccentricity value.

When we add an explicit EoC with eccentricity `eoc`, the total first-order
amplitude becomes:

```
total = e_geom + 2 * eoc
```

Setting this equal to the desired Keplerian amplitude `2 * e_real`:

```
eoc = e_real - e_geom / 2
```

### Observable consequence of using full eccentricity

With the full geometric eccentricity (0.0154) used in the equation of center,
the season lengths become too asymmetric. The spring/summer half-year is too
long, autumn/winter too short:

| Cardinal Point | Error with full ecc (hours) |
|----------------|-----------------------------|
| Vernal Equinox | -14.9 |
| Summer Solstice | +0.8 |
| Autumnal Equinox | +23.9 |
| Winter Solstice | +8.0 |
| **RMS** | **14.7** |

---

## Derived Parameters (no free parameters)

Both `eocEccentricity` and `perihelionPhaseOffset` are **derived from existing
model constants** -- they are not tunable free parameters.

### eocEccentricity

**Formula (per frame):**
```
eoc(t) = e(t) / 2
```

Where `e(t) = base′·(1 + cos θ₃(t)/2)` is the one eccentricity law (the same
line the Moon channel and the eclipse Sun ride), and the geometric offset
carries the full `e(t)` along the perihelion direction.

**Physics:**
- The geometric offset provides apparent speed variation with amplitude `e_geom = e(t)` (first order)
- The explicit EoC adds `2 * eoc`
- Total must equal the real Keplerian amplitude `2 * e_real` with `e_real = e(t)`
- Therefore: `eoc = e(t) - e(t) / 2 = e(t) / 2`

The higher orders (the geometric offset's exact parallax vs the full Kepler
series) are closed exactly by the exact-Kepler wheel corrector (see § The
Exact-Kepler Wheel below), so the split introduces no residual.

**Numerical value at J2000:** `eocEccentricityValue` = <!--v:eocEccentricityValue-->0.00836<!--/v--> (= e(J2000)/2; the constants seed `C.eocEccentricity`, superseded per frame by `e(t)/2` in `moveModel`).

### perihelionPhaseOffset

**Formula:**
```
perihelionPhaseOffset = ((startModelYear - balancedYear) / (H/16) * 360
                        + correctionSun
                        + 360 * (startmodelJD - perihelionRefJD) / yearDays) % 360
```

Where `perihelionRefJD = 2451547.042` (JD of Earth perihelion 2000, Jan 3.542),
stored in `ASTRO_REFERENCE.perihelionPassageJ2000_JD`.

**Physics:** This aligns the EoC perihelion direction with the geometric
perihelion direction set by the EP1 precession phase at J2000. The formula
computes the angular difference between:
1. Where the Sun is at the reference perihelion date (from correctionSun and
   the time offset from model start to perihelion)
2. Where the geometric eccentricity vector points at J2000 (from the EP1
   precession phase, which depends on balancedYear and H/16)

**Numerical value:** ~0.51 degrees (analytical, ignoring small tilt corrections
from earthRAAngle; full scene-graph computation gives -0.79 degrees, but the
difference has negligible effect on Sun position: <0.001 degrees)

### correctionSun

The only remaining tunable parameter. Sets the Sun's starting angular position
on its orbit to align cardinal points (solstices/equinoxes) with observed dates.

| Parameter | Value | How determined |
|-----------|-------|----------------|
| `eocEccentricity` | e(t)/2 (<!--v:eocEccentricityValue-->0.00836<!--/v--> at J2000) | **Derived**: half the one-law eccentricity, per frame |
| `perihelionPhaseOffset` | ~0.51 deg | **Derived**: from EP1 precession phase + correctionSun + perihelion date |
| `correctionSun` | <!--v:correctionSunDeg-->0.49715<!--/v--> | **Tuned**: aligns summer solstice timing + Sun RA |
| `useVariableSpeed` | true | Toggle |

The geometric offset carries `e(t)·û(ϖ)` itself:
- `eccentricityDerivedMean` = <!--v:eccentricityDerivedMean-->0.0155200<!--/v--> — base′, the one law's mean (derived from e(J2000) and the System-Reset anchor)
- `eccentricityAmplitude` = <!--v:eccentricityAmplitude-->0.001356<!--/v--> — the Law-4 input A and the wobble-marker distance; not a scene arm

### Results

Sun baseline vs JPL Horizons at the time of this derivation (2000-2025,
26 yearly dates):
- RMS Total: 0.065 degrees (with IAU precession correction applied)
- RMS Dec: 0.0004 degrees
- Entries: 26

Current state (dense JPL baseline, exact-Kepler wheel — see § The
Exact-Kepler Wheel below): RMS Total 0.0029° — the fitted-correction
path reads 0.0037° on the same run.

Year lengths:
- Mean Tropical Year: 365.242190835 days (IAU: 365.242200, diff +0.10s)
- Mean Sidereal Year: 365.256363246 days (IAU: 365.256363000, diff +0.02s)
- Anomalistic Year: 365.259636199 days (IAU: 365.259636000, diff +0.02s)

### Understanding the ~54 arcsec/yr RA drift

The 0.28° RMS RA error is **not a model error** -- it is a coordinate frame mismatch
between JPL Horizons (fixed ICRF/J2000 equinox) and our model (of-date equatorial
frame where the equinox precesses naturally).

The precession of the equinoxes is 50.29 arcsec/yr in **ecliptic longitude**. However,
the drift we measure is in **Right Ascension**, which requires projecting through the
obliquity of the ecliptic. The standard formula for precession in RA is:

```
Δα = m + n · sin(α) · tan(δ)
```

Where:
- `m = 46.1 arcsec/yr` -- general precession in RA
- `n = 20.04 arcsec/yr` -- precession coupling term from obliquity
- `α` = Sun's RA at measurement point
- `δ` = Sun's Dec at measurement point

At the June solstice (α ≈ 90°, δ ≈ 23.44°):

```
Δα = 46.1 + 20.04 · sin(90°) · tan(23.44°)
   = 46.1 + 20.04 · 1.0 · 0.4336
   = 46.1 + 8.69
   = 54.8 arcsec/yr
```

This matches our observed baseline drift of ~54.1 arcsec/yr to within 1.3%. The extra
~4.5 arcsec/yr beyond the raw 50.29 comes from the obliquity projection term -- precession
tilts the equatorial coordinate grid relative to the ecliptic, and at the solstice position
this tilt maximally affects RA.

After correcting for this frame drift, the true Sun model error is ~0.003 degrees.

---

## Start-Date Independence

| Parameter | Start-date dependent? | Explanation |
|-----------|-----------------------|-------------|
| `eocEccentricity` | No | Derived from mean eccentricity over full precession cycle |
| `perihelionPhaseOffset` | No | Derived from precession phases and perihelion reference date |
| `correctionSun` | Yes | Aligns Sun position at model start (June 21 2000); would differ for March 21 start |

Both derived constants use the *mean* geometric eccentricity and the J2000
precession state. Since the perihelion direction already precesses dynamically
via `perihelionPrecessionRate * pos`, the fixed offset correctly anchors the
J2000 reference direction. No dynamic update is needed.

---

## How It Works -- Technical Detail

### The Coordinate System

In `moveModel()`, each object's angular position is:
```
theta = speed * pos - startPos * (PI / 180)
```

For the Sun: `speed = 2*PI` (one full orbit per year), `startPos = correctionSun`.

### Mean Anomaly from Perihelion

The equation of center requires the mean anomaly M measured from perihelion:
```
perihelionPhase = perihelionPhaseJ2000 + perihelionPrecessionRate * pos
M = theta - perihelionPhase
```

The perihelion phase is computed from:
- Sun's theta at model start: `-correctionSun * PI/180`
- Angular distance from model start to perihelion: `2*PI * (days_since_perihelion / year_length)`
- Earth perihelion 2000: JD <!--v:perihelionPassageJD-->2451547.042<!--/v--> (January 3.542), stored in `ASTRO_REFERENCE.perihelionPassageJ2000_JD`
- Plus the derived `perihelionPhaseOffset`

The phase precesses dynamically at `2*PI / (H/16)` radians per simulation year.

### The Series Expansion

We use a 2-term series expansion instead of iterative Kepler equation solving:
```
correction = 2*e*sin(M) + 1.25*e^2*sin(2*M)
```

Accurate to <0.01 deg for eccentricity < 0.21. No iteration needed.
`moveModel()` runs every animation frame for ~80 objects -- performance matters.

---

## Shared Parameter: correctionSun

`correctionSun` serves dual purposes:
1. Sun's `startPos` -- where it begins on its orbit
2. Planet `PerihelionFromEarth` nodes also use it as their `startPos`

Changing `correctionSun` shifts all planet RA values by the same amount (~0.18
degrees for the current change). Planet `startpos` values have been
re-optimized to absorb this offset.

---

## Code Locations

- `src/script.js`:
  - Input constants: line ~48 (`useVariableSpeed`)
  - Astronomical reference: `ASTRO_REFERENCE.perihelionPassageJ2000_JD` (line ~862)
  - Derived constants: after `eccentricityDerivedMean`: `eocEccentricity`, `perihelionPhaseOffset`
  - Sun object definition (`eccentricity: eocEccentricity`, `perihelionPhaseJ2000`)
  - `moveModel` (equation of center gate and formula)
- `tools/lib/constants.js`: derived-constants block
- `tools/lib/scene-graph.js`: Sun eccentricity in the body defs; `moveModel`
- `tools/explore/eoc-constants.js`: numerical verification script

---

## Planet EoC — Now Implemented

All planets now have equation of center with per-planet `eocFraction` values
that scale the orbital eccentricity. The same double-counting principle applies:
the geometric orbit offset provides ~50% of the speed variation, so the EoC
uses approximately half the eccentricity.

Per-planet fractions and implementation details:
- **Type I** (Mercury, Venus): see [62-type-i-inner-planets.md](62-type-i-inner-planets.md)
- **Type II** (Mars): see [63-type-ii-earth-crossers.md](63-type-ii-earth-crossers.md)
- **Type III** (Jupiter–Neptune): see [64-type-iii-outer-planets.md](64-type-iii-outer-planets.md)

---

## Sun Longitude Harmonics — Phase Z-B Correction Layer

> **Not on the display path.** The displayed Sun's accuracy is owned by
> the CERTIFIED framework-native Sun (E4/E5: L₀ + mean tropical rate +
> the f(Y) year-harmonic drift + the derived cos-ε torque term; e = the
> one H/3 eccentricity law; ZERO fitted sun constants;
> 0.95″ vs JPL) — the wheel rides it through a δ overlay
> (`E5_WHEEL_SUN_ENABLED`, the moveModel sun block, inside the
> clock-convention window), and with `FQ3_EXACT_SUN(_ENABLED)` on (the
> default in both runtimes) the moveModel sun does not evaluate the Z-B
> correction at all — the split error Z-B absorbs is derived and removed
> at the geometry level (see § The Exact-Kepler Wheel below). Meeus
> Ch. 25 is the eclipse finders' un-injected default, not the certified
> reference. The fitted Z-B terms remain registry constants (Step 0 is
> their fitter; the planetary completion's PAIRED hash fingerprints
> them; `computeSunPositionFast` — the declared Step-6a instrument — and
> the legacy A/B path apply them), but nothing on the display path
> consumes them. This section documents what Z-B is (the in-window
> absorber of the geometric-split wheel's annual imperfection).

### What it adds

Layered **on top of** the EoC formula above, the Sun Longitude Harmonics
correction closes a residual ~200" annual oscillation between the framework's
kinematic Sun (geometric off-center orbit + 2-term EoC) and the Meeus Ch.25
reference Sun. The residual originates from a **definitional difference in
Earth's eccentricity**: the legacy path's mean eccentricity
(`eccentricityDerivedMean` = <!--v:eccentricityDerivedMean-->0.0155200<!--/v-->, the one law's base′)
differs from Meeus's IAU J2000 value (<!--v:j2000Eccentricity-->0.01671022<!--/v-->). This eccentricity gap propagates through
the first-order EoC term `2e·sin(M)` to produce a sin(M)+cos(M) residual of
amplitude ~280" at the annual frequency.

### The correction formula

```
λ_corrected = λ_kinematic − Δλ(t)

Δλ(t) = SUN_LONGITUDE_MEAN + Σₙ [Aₙ·sin(φₙ) + Bₙ·cos(φₙ)]
φₙ    = 2π · (year − balancedYear) / (H / nₙ)
```

Coefficients are stored in `fitted-coefficients.json` and were originally
fit by `tools/fit/sun-longitude-harmonics.js` against the scene-graph Sun
vs Meeus Ch.25 residual across ±100 yr around J2000 (smart J2000-anchored,
so the correction reproduces the measured Δλ at J2000 exactly).

### Runtime H-lattice filter

Not all stored harmonics are applied at runtime. The `sunLongitudeCorrection`
function in [src/script.js](../src/script.js) (mirrored in
[tools/lib/scene-graph.js](../tools/lib/scene-graph.js)) filters terms by
divisor type, applying ONLY:

| Allowed | Example divisors |
|---|---|
| Year-multiple: divisor ≥ round(H) AND divisor % round(H) == 0 | <!--v:HPlain-->335317<!--/v--> (1 yr), 670634 (½ yr), <!--v:threeH-->1,005,951<!--/v--> (⅓ yr), … |
| Small precession: divisor ∈ [1, 20] | 3, 5, 8, 13, 16 (Earth Fibonacci hierarchy) |
| Lunar precession ICRF | 18015 (nodal, 18.6 yr), 37899 (apsidal, 8.85 yr) |

Any other divisor is **silently skipped** at runtime — this is a design-rule
safeguard. The legacy `[168, 0.0048, -0.0050]` term (period 1996 yr,
`gcd(168, H) = 1`) was removed from the JSON entirely during the Phase-9
Espenak-swap coefficient regeneration; the runtime filter remains as the
safeguard for any future out-of-lattice term.

The design rule (see [tools/fit/README.md](../tools/fit/README.md) "Design
rule: only cyclic, lattice-compatible corrections"): every correction
divisor must share a factor with H = <!--v:holisticYearFactors-->23 × 61 × 239<!--/v-->. The framework is
fundamentally cyclic — polynomial-in-T corrections and arbitrary fit
frequencies are NOT allowed because they don't extrapolate cleanly to
deep time.

### Active coefficients (2026-06)

After the runtime filter:

| Divisor | Period | sin coefficient | cos coefficient | Amplitude |
|---:|---|---:|---:|---:|
| <!--v:HPlain-->335317<!--/v--> | 1 yr | +0.076336 ° | +0.013429 ° | ~279" (dominant) |
| 670634 | ½ yr | +0.002478 ° | +0.000221 ° | ~9" |
| <!--v:threeH-->1,005,951<!--/v--> | ⅓ yr | +0.000034 ° | +0.000008 ° | ~0.1" |

(The legacy 168-divisor row is gone from the JSON — see above.)

`SUN_LONGITUDE_MEAN = -0.0018807 °` (~−6.8", the constant DC component from
the smart J2000 anchor — small per the design rule "should be ≈ 0 in a
well-formed model").

### Architecture: Sun-only application

The correction is applied to the **Sun node only**, not at the barycenter
level. Architectural reasoning:

- The correction is **Earth-Sun-geometry-specific** (the eccentricity-
  difference signature is unique to Earth's orbit around the Sun)
- Applying at the barycenter would also rotate the 7 planet chains
  (Sun + planets share the barycenter as parent)
- Planets carry their own corrections and were calibrated against the
  un-corrected Sun frame — barycenter rotation would degrade their
  baselines by 30–180" each
- **Sun-only application** keeps planet baselines pristine while still
  closing the 96% Sun-vs-Meeus residual

### Visual integrity

The Sun shifts up to ±25" relative to the strict planet-orbit center over
the annual cycle. This is well below typical visible resolution (Sun
diameter renders ~1.4 million km; ±25" = ±18,000 km offset = ~1.3 % of
Sun's diameter). The previous visual "black spot" bug that caused this
correction to be disabled in 2026-06 was driven mostly by the now-filtered
legacy [168] term, which contributed a near-constant ~25" offset
*in addition to* the annual oscillation. Without it, the residual visual
offset averages to zero over each year.

### A/B testing toggle

To disable for comparison:
- **Browser (src/script.js)**: edit `let SUN_HARMONICS_ENABLED = true;` to
  `false` and reload. Toggle is at the top of script.js near the other
  framework flags (e.g., `DEEP_TIME_MODE_ENABLED`).
- **Node tools (tools/lib/scene-graph.js)**: set environment variable
  `SUN_HARMONICS_DISABLED=1` when invoking. Example:
  `SUN_HARMONICS_DISABLED=1 node tools/optimize.js baseline sun`

Post-SW note: with the E5 δ overlay active (`E5_WHEEL_SUN_ENABLED` /
`E5_WHEEL_SUN`), toggling Z-B alone no longer isolates the displayed
Sun — the δ is defined against the legacy stack INCLUDING Z-B, so a
clean A/B of the display requires toggling the δ overlay too.

The toggle bypasses the entire correction; useful for measuring the
correction's impact on any downstream consumer.

### Measured impact (Phase Z-B verification)

| Metric | Before Z-B | After Z-B | Change |
|---|---|---|---|
| Scene-graph Sun vs Meeus Ch.25 (dense, ±100 yr) | 197.77" RMS | **7.39" RMS** | **96 % reduction** |
| Sun JPL baseline (sparse Jan/Jul dates) | 11.5" RMS | 14.8" RMS | +3.3" regression (recoverable via correctionSun) |
| All planet baselines (Mercury–Neptune, Moon) | unchanged | unchanged | — |
| Scene-graph-based eclipse audit (modern, post-1900) | ~6.40 min RMS | ~2-3 min RMS | ~3× improvement |
| Meeus-path eclipse timing (`_eclSunLon` direct) | 0.90 min RMS | 0.90 min RMS | unchanged (Z-B doesn't reach this path) |

### Why no further H-lattice terms can be added

A greedy re-fit under Z-B confirmed: no additional H-lattice-compliant
candidates improve RMSE above the 0.05" threshold. Long-period drift-proxy
terms (e.g. H/152 at 2206 yr, H/167 at 2008 yr) are found by greedy but
ALL violate the H-lattice design rule (`gcd(n, H) = 1`) and are rejected
per `docs/archive/old-documents/lessons-learned-lunar-framework-native.md` Addendum 5
(Path A2 lesson on drift proxies).

The current 3-term active set (1 yr, ½ yr, ⅓ yr) is therefore the
complete correction available **within this fitted-harmonic family**.
The ceiling was ultimately passed by a different route entirely: the
E4/E5 certified Sun DERIVES the long-term drift (the f(Y) year
harmonics + the cos-ε torque term) instead of fitting it, and the SW δ
overlay carries that onto the display — see the supersession note at
the top of this section. The residual drift vs Meeus quoted here
(~161" RMS at ±1000 yr) described the pre-E4 state.

### Relationship to the EoC formula above

The full Sun longitude computation now layers four terms in order:

```
θ_kinematic    = base scene-graph rotation (constant rate × pos − startPos)
θ_with_EoC     = θ_kinematic + 2·e·sin(M) + 1.25·e²·sin(2M)        ← EoC (this doc above)
θ_with_harms   = θ_with_EoC − Δλ_harmonics(t)                       ← Phase Z-B
θ_displayed    = θ_with_harms + w(t)·(λ_certified − λ_twin)         ← SW δ overlay (owns accuracy)
```

The δ overlay (weight w(t) = 1 in the corpus era, tapering off at the
clock-convention boundary) steers the world-frame Sun onto the
certified E4/E5 chain; the three legacy layers below it are byte-
identical to the pre-SW scene.

The EoC correction captures the Kepler 2nd-law speed variation analytically
to the precision allowed by the `eocEccentricity = 0.007753` value (derived
from the framework's own `eccentricityDerivedMean`). The Phase Z-B
correction then captures what's *missed* because that value differs from
Meeus's IAU eccentricity. Both layers preserve the framework's cyclic
character (no polynomial-in-T terms).

### Pipeline position — Step 0 (structural prerequisite)

This correction is a **prerequisite**, not part of the iterative fitting
pipeline. In `tools/fit/README.md` it's invoked as **Step 0** (Phase 0),
ahead of the Sun optimizer (Step 1).

Why "Step 0" rather than a regular fitting step:

- The coefficients capture a STRUCTURAL property of the framework (the
  ~8 % gap between `eccentricityDerivedMean ≈ 0.01545` and Meeus IAU
  `0.01671`) — not a freshly-measured residual that drifts between
  refits.
- They are **stable across normal refits**. Re-run Step 0 only when
  `H`, the eccentricity definition, or the Meeus Ch.25 reference itself
  changes. (Same "stable across normal refits" pattern as
  `fibonacci_significance.py` / Step 7d.)
- Running Step 0 **first** means Step 1 (`correctionSun`) calibrates
  with the ~280" annual harmonic ALREADY applied → converges to the
  true optimum in a single pass. The legacy `Step 1 → 6f → Step 1`
  re-run cycle (Step 1 re-run absorbing the ~3" sparse-date Sun JPL
  regression) is no longer needed.

For a clean fresh fit, disable existing harmonics first so the fitter
samples the RAW residual:

```
SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write   # Step 0
node tools/optimize.js optimize sun correctionSun --write                    # Step 1
# … then proceed normally through Steps 2 → 9.
```

For ad-hoc diagnostic re-fits AFTER the main pipeline (rare), re-running
the harmonics fit invalidates `correctionSun` and the planet correction
stack — follow up with Step 1 + Steps 5a/5b in that case (Venus and
Saturn are the most sensitive — inner+outer that lean hardest on
Sun-relative geometry).

See [tools/fit/README.md](../tools/fit/README.md) Phase 0 / Step 0 for
the full pipeline integration.

### Code locations

- `src/script.js`:
  - `SUN_LONGITUDE_MEAN`, `SUN_LONGITUDE_HARMONICS` constants
  - `sunLongitudeCorrection(jd)` function with runtime filter
  - `SUN_HARMONICS_ENABLED` toggle flag
  - Application gate in `moveModel`: `if (SUN_HARMONICS_ENABLED && obj === sun) θ -= sunLongitudeCorrection(jd) * D2R`
- `tools/lib/scene-graph.js`:
  - Application gate in `moveModel` (Sun-only, env-toggle aware)
  - Mirror in `animateFast` (used by `computeSunPositionFast`)
- `public/input/fitted-coefficients.json`:
  - `SUN_LONGITUDE_MEAN`, `SUN_LONGITUDE_HARMONICS` (JSON source of truth)
- `tools/fit/sun-longitude-harmonics.js`:
  - Greedy harmonic fitter (re-run produces fresh coefficients)
- `tools/explore/sun-annual-correction.js`:
  - Standalone Z-B verification tool (re-runs the validation)

### Full investigation trail

See `docs/archive/old-documents/lessons-learned-lunar-framework-native.md` (untracked archive)
Addendum 5 for the complete record of approaches tried (Phase S-A strict-
design fit, Phase Z-1 tidal-force perturbation prototype, Phase Z-A
classical corrections diagnostic, Phase Z-B annual harmonic integration)
and what was learned from each.

---

## The Exact-Kepler Wheel (FQ-3) — the split error derived and removed

The Z-B section above absorbed the geometric-split wheel's annual
imperfection with three fitted terms. The FQ-3 campaign (plan §12i)
first ATTRIBUTED that imperfection exactly, then replaced the fitted
absorber with a derived corrector.

**The attribution (W0, instrument
`tools/explore/fq3-wheel-sun-attribution.mjs`).** The raw wheel's error
against the analytic full-Kepler twin measures 278.98″ annual + 8.93″
semiannual + 0.11″ third-harmonic + 4.93″ constant — identical to the
fitted Z-B content (279.0″/8.96″/0.13″, mean −6.77″) to 0.1″: the
absorber was exactly the split error, nothing else. The mechanism
closes in two named parts:

1. **Amplitudes** — the split composition (parent center-offset at
   magnitude e toward the perihelion direction, plus the sun node's
   2nd-order EoC at `eocEccentricity = e − base/2`) differs from full
   Kepler at first order by exactly `e − base` = 273.1″ at J2000;
   closure 97.7% annual / 98.9% semi / 100% third.
2. **Phase** — the wheel's REALIZED offset-vector direction (the
   composition `−base·û(θ_p1) + amp·û(θ_p1+θ_p2)` of the peri-layer
   phases) sits 1.035° from the law's ϖ direction, predicting a 62.3″
   annual-quadrature component vs the measured 61.8″ residual.

Combined mechanism share ~100%; the offset magnitude tracks the
H/16 e-law to six decimals at every probe epoch.

**The corrector (W1).** In difference form the mean longitude cancels,
so the exact-Kepler completion is a pure function of the branch's own
live values — zero constants, no anchor or frame quantity:

```
Δλ = EoC_full(e) − EoC_half(e − base/2) − geoTerm(d⃗, θ_sun)
d⃗  = −base·û(θ_p1) + amp·û(θ_p1 + θ_p2)      (live peri-layer phases)
θ  += Δλ / J                                   (first-order Jacobian)
```

Shipped in both runtimes (`FQ3_EXACT_SUN` in `tools/lib/scene-graph.js`,
`FQ3_EXACT_SUN_ENABLED` in `src/script.js`; default ON, `=0` restores
the fitted path). The offset vector reads the already-animated parent
phases, so the form is integrated-phase correct in deep-time mode by
construction. One convention trap is recorded in the code comment:
node-ry angles are λ-handed — only the raw world-frame `atan2(z,x)`
extraction runs opposite ecliptic longitude.

**Measured (W2, instrument `tools/explore/fq3-w1-verify.mjs`).**
twin − wheel: 279.0″ annual / 197.4″ sd → **0.80″ annual / 0.57″ sd**;
the legacy control reproduces the W0 numbers byte-identically; deep
time stays bounded (17.8″ at −135, 29.4″ at −3000, 6.6″ at +20000);
the Sun-vs-JPL optimizer baseline improves 0.0037° → 0.0029°; planet
baselines unchanged at recorded precision (the sub-5″ fixture-visible
planet shifts are the documented scaffold coupling through the
corrections' heliocentric-distance regressor). The ~4.4″ constant
residual against the twin is anchor-class — named and left honest, not
absorbed. The certified eclipse chain is untouched by construction
(tier-driven since the umbra strangler); the audit artifact regenerated
with every value reproduced.

---

## Verification Checklist

After any future changes to this system:

1. Run year analysis report in browser -- check cardinal point timing
2. Verify season lengths: VE-SS ~92.7d, SS-AE ~93.7d, AE-WS ~89.9d
3. Check precession period is still <!--v:mainstreamAxialPrecExact-->~25,771<!--/v--> years
4. Check year lengths match IAU to within a few seconds
5. Verify Sun visually speeds up in January and slows down in July
6. Check equation of center display in UI shows correct values
7. No NaN values in any object positions
8. Run `node tools/optimize.js diagnose sun` -- eccentricity ratio ~1.08
9. Run `node tools/optimize.js baseline sun` -- RA drift ~54 arcsec/yr (frame effect)

### FQ-3 (exact-Kepler wheel) verification

- `node tools/explore/fq3-w1-verify.mjs` — expect twin − wheel ~0.80″
  annual / ~0.57″ sd; the control
  (`FQ3_EXACT_SUN=0 SUN_HARMONICS_DISABLED=1`) must reproduce the W0
  content (279.0″ annual / 197.4″ sd).
- `node tools/optimize.js baseline all` — planet baselines unchanged;
  Sun RMS Total ~0.0029°.

### Phase Z-B (Sun Longitude Harmonics) verification — legacy path
(`FQ3_EXACT_SUN=0`; the display default no longer evaluates Z-B)

10. Confirm `SUN_HARMONICS_ENABLED = true` in `src/script.js`
11. Run `node tools/explore/sun-annual-correction.js` -- expect:
    - Raw residual ~198" RMS (without correction)
    - After current 3-term fit: ~7" RMS in modern window (96% closure)
    - L-2h problem-eclipse residuals all ≤ 10"
12. A/B test the toggle: compare `SUN_HARMONICS_DISABLED=1 node tools/optimize.js baseline sun`
    vs default. Sparse-date JPL RMS should regress by ~3" with Z-B enabled
    (recoverable via Step 1 recalibration of `correctionSun`)
13. All planet baselines unchanged: `node tools/optimize.js baseline all` should show
    no significant differences vs disabled state (Z-B is Sun-only)
14. Browser eclipse audit modern-era ΔJD values ~1-2 min (vs 6.40 min pre-Z-B)
15. Greedy refit `node tools/fit/sun-longitude-harmonics.js` (dry run) should
    NOT find new H-lattice-compliant terms above the 0.05" threshold
    (drift-proxy terms H/152, H/167 may be found but are design-rule violations)
