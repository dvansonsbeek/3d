# 14 — Cardinal Point Prediction from Fibonacci Harmonics

## Overview

The Holistic Universe Model predicts the timing and position of all four cardinal
points (VE, SS, AE, WS) using **12 Fibonacci-based harmonics** per cardinal point:
5 fundamentals (H/3, H/5, H/8, H/13, H/16) plus 7 overtones that are **sums of
Fibonacci fundamentals** (H/6=3+3, H/11=3+8, H/19=3+16, H/24=8+16, H/32=16+16, etc.).

These harmonics replace the conventional Meeus polynomial approach, extending
the valid prediction range from ±2,000 years to the full **335,008-year** Holistic Year.

Three formulas are provided for each cardinal point:

1. **Cardinal Point RA** — the right ascension where the event occurs
2. **Cardinal Point JD** — when the event occurs (Julian Day)
3. **Cardinal Point Year Length** — the time between consecutive events (derivative of JD)

**Key result:** With one astronomical observation per cardinal point (the J2000 date)
and the model's existing constants, all cardinal point dates across the full
335,008-year Holistic Year can be predicted to **2.7–5.3 minutes** accuracy.
The RA position requires **zero observations** — it is fully derived from model parameters.

| Cardinal Point | Detection | RMSE (JD) | J2000 Anchor |
|----------------|-----------|-----------|--------------|
| **SS** (Summer Solstice) | Max declination | **2.7 min** | 2451716.575 (Jun 21, 01:48 UTC) |
| **VE** (Vernal Equinox) | Dec crosses 0° ascending | **3.0 min** | 2451623.738 (Mar 20, 05:42 UTC) |
| **AE** (Autumnal Equinox) | Dec crosses 0° descending | **5.0 min** | 2451810.304 (Sep 22, 19:18 UTC) |
| **WS** (Winter Solstice) | Min declination | **5.3 min** | 2451900.067 (Dec 21, 01:37 UTC) |

---

## Formula 1: Cardinal Point Right Ascension

The RA at which a cardinal point occurs is **fully derived from model parameters** — zero
fitted constants:

```
RA(t) = (baseRA − earthRAAngle / sin(ε)) + (A / sin(ε)) × [−sin(2πt/(H/3)) + sin(2πt/(H/8))]
```

where `t = year − balancedYear`, `ε = earthtiltMean`, `A = earthInvPlaneInclinationAmplitude`,
and `baseRA` = 90° (SS), 270° (WS), 0° (VE), 180° (AE).

| Component | Value | Source |
|-----------|-------|--------|
| Mean RA offset | 1.25363°/sin(23.414°) = 3.155° | earthRAAngle / sin(ε) |
| Amplitude | 0.636°/sin(23.414°) = 1.600° | A / sin(ε) |
| Periods | H/3 and H/8 | Fibonacci precession hierarchy |

### Key properties

- **Same formula for all 4 cardinal points** — only baseRA changes (0°, 90°, 180°, 270°)
- **Mean SS RA ≈ 86.85° = 5h 47m 22s** (at balanced year when all precession phases = 0)
- **At J2000: SS ≈ 90°, WS ≈ 270°, VE ≈ 0°, AE ≈ 180°** (near current obliquity maximum)
- **Range: 6.32°** (25.3 minutes of RA) oscillation over the full Holistic Year
- **RMSE: 0.089°** (0.36 minutes of RA) — validated against 11,553 simulation data points
- **Zero fitted constants** — everything derived from earthRAAngle, A, and ε

### Physical structure

**1. Same projection factor throughout.** Both the mean offset and the oscillation
amplitude use `1/sin(ε)` — the ecliptic-to-equatorial coordinate projection. The
earthRAAngle (perihelion tilt in the scene graph) sets the DC offset; the inclination
amplitude A sets the oscillation.

**2. 90° phase shift from obliquity.** The obliquity uses cosines: `−A·cos(H/3) + A·cos(H/8)`.
The RA uses **sines**: `−A·sin(H/3) + A·sin(H/8)`. The RA tracks the **rate of change**
of obliquity, not the obliquity itself.

**3. Identical amplitude structure.** The H/3 and H/8 amplitudes are equal (both = A/sin(ε)),
exactly mirroring the obliquity formula where both components use the same amplitude A.

---

## Formula 2: Cardinal Point Timing (Julian Day)

Each cardinal point has its own 12-harmonic Fourier fit, anchored at the observed J2000
value. Harmonics are self-corrected to return the exact anchor at year 2000:

```
JD(year) = anchor + meanSolarYear × (year − 2000)
         + Σ harmonics(year − balanced) − Σ harmonics(2000 − balanced)
```

The 12 harmonics per cardinal point consist of:

| Category | Harmonics | Physical origin |
|----------|-----------|-----------------|
| **Fibonacci fundamentals** | H/3, H/5, H/8, H/13, H/16 | Direct precession chain |
| **Second harmonics** | H/6 (=3+3), H/32 (=16+16) | Overtones of inclination and perihelion |
| **Cross-couplings** | H/11 (=3+8), H/19 (=3+16), H/24 (=8+16) | Interaction between precession cycles |
| **Cardinal-specific** | 2 additional (vary per type) | Higher-order or tertiary couplings |

All overtones are **sums of Fibonacci fundamentals** — they arise from second-order
nonlinear interactions between the precession cycles.

### Amplitude structure across cardinal points

The 5 Fibonacci fundamental amplitudes are nearly identical for all 4 types (~1.49d for H/3,
~1.49d for H/8). The key difference is in the **H/16 phase**, which rotates exactly 90°
between consecutive cardinal points:

| Type | H/16 phase | Physical meaning |
|------|-----------|-----------------|
| **SS** | sin-dominated (+1.77, +0.09) | Perihelion near WS → Sun fast at SS |
| **VE** | cos-dominated (−0.11, +1.78) | 90° shifted from SS |
| **AE** | −cos-dominated (+0.07, −1.79) | Anti-phase to VE |
| **WS** | −sin-dominated (−1.81, −0.09) | Anti-phase to SS |

This 90° phase rotation is the **equation of center rotating with perihelion precession**.
When perihelion is near a cardinal point, the Sun moves fastest there, shifting the timing.

### RMSE by cardinal point

| Type | 5 Fibonacci | 12 Harmonics | Improvement |
|------|-------------|-------------|-------------|
| SS | 107 min | **2.7 min** | 40× |
| VE | 154 min | **3.0 min** | 51× |
| AE | 154 min | **5.0 min** | 31× |
| WS | 96 min | **5.3 min** | 18× |

### Cardinal point year length (derivative)

The time between consecutive cardinal point events varies with the precession cycles.
This is the derivative of the JD formula:

```
yearLength(year, type) = meanSolarYear + Σ [sinC·ω·cos(ωt) − cosC·ω·sin(ωt)]
```

At J2000, the four cardinal point year lengths differ by up to 98 seconds:

| Type | Year length (days) | Relative to mean |
|------|-------------------|------------------|
| SS | 365.24160 | −51 s (shortest) |
| VE | 365.24233 | +12 s |
| AE | 365.24204 | −13 s |
| WS | 365.24274 | +47 s (longest) |

Mean of 4: 365.24218 days (≈ meanSolarYearDays = 365.24219).

### Derivation path

The JD coefficients were extracted from 11,553 simulation data points (29-year steps) by:
1. Fitting a linear trend: slope = `meanSolarYearDays` (fixed, not fitted)
2. Computing residuals: δJD = JD_actual − JD_linear
3. Greedy forward selection: starting with 5 Fibonacci fundamentals, then adding overtones
4. Each round: test all H/div (div=1..55), select the one that reduces RMSE most
5. The 7 overtones are all sums of Fibonacci fundamentals (physically motivated)
6. Adding obliquity/eccentricity cross-terms was tested but provides no additional
   information beyond what the overtone harmonics already capture (the overtones
   ARE the mathematical expansion of the physical cross-terms)
7. Self-correction at J2000 ensures exact anchor values

### Why the amplitudes differ from the mean tropical year harmonics

The existing `TROPICAL_YEAR_HARMONICS` in the model have much smaller amplitudes
(H/8: 1.82s, H/3: 0.69s, H/16: 0.03s). This is because those harmonics describe
the **4-point mean tropical year** (averaged over all four cardinal points), which
cancels the variable-speed effect. The cardinal point timing formula describes a **single
cardinal point**, which includes the full equation-of-center modulation.

The ~98-second spread between cardinal point year lengths documented in
[doc 11](11-length-day-year-formulas.md) manifests here as the H/16 amplitude of
±1.77–1.81 days accumulated over the 20,938-year perihelion precession cycle.

---

## Comparison to Meeus

| Property | Meeus `solarLongitudeDeg()` | Fibonacci harmonics |
|----------|---------------------------|---------------------|
| Valid range | ±2,000 years (safely) | ±167,500 years (full H) |
| Method | Polynomial (T, T², T³) | Fourier (12 Fibonacci harmonics) |
| Cardinal points | SS only (separate formulas for others) | All 4 with same structure |
| Parameters | 6 polynomial coefficients | RA: 0 fitted; JD: 24 fitted + 1 anchor per type |
| Physical basis | Empirical fit to modern data | Derived from precession hierarchy |
| Accuracy at J2000 | ±1 second | JD: exact (anchored at observed value) |
| Accuracy over full H | Diverges beyond ±5,000 yr | RA: 0.089° RMSE; JD: 2.7–5.3 min RMSE |
| Extrapolation | Diverges (polynomial) | Periodic — never diverges |

**The two approaches are complementary**: Meeus for precision calendrics within ±2,000 years,
Fibonacci harmonics for understanding the deep structure of cardinal point drift.

---

## Implications

### 1. Cardinal point RA is fully derived from the scene graph

The RA formula requires **zero fitted constants** for any cardinal point. It is a direct
geometric projection of three model parameters through `1/sin(ε)`. The 0.089° RMSE
against simulation output is a measure of the approximation quality (from ignoring the
small H/16 and higher-order terms in RA), not of free-parameter tuning.

### 2. Only Fibonacci periods and their sums appear

The 5 fundamental periods are pure Fibonacci. The 7 overtones are all sums of two
fundamentals: 6=3+3, 11=3+8, 19=3+16, 24=8+16, 32=16+16. No harmonics outside
this Fibonacci sum structure are needed. This suggests the timing variations arise from
second-order nonlinear coupling between the precession cycles.

### 3. H/16 phase rotates 90° between consecutive cardinal points

The variable-speed effect (equation of center) creates a timing shift that rotates
with perihelion precession. At SS it's sin-dominated, at VE it's cos-dominated,
at AE it's −cos, at WS it's −sin. This is the perihelion precession "sweeping"
through the cardinal points over the 20,938-year H/16 cycle.

### 4. Obliquity mean is derived from the Pythagorean tilt model

The simple geometric obliquity formula `earthtiltMean − A·cos(H/3) + A·cos(H/8)` has a
mean of 23.41357° (the time-average of cosines is zero). But the obliquity **actually
measured at the summer solstice** (max declination) averages 23.45376° — a systematic
+0.040° (143") offset.

This offset is **physically derived** from the scene graph's 3D geometry. The precession
hierarchy creates three perpendicular tilt components:

1. **ε + δε** — the obliquity oscillation in the tiltb direction (H/3 + H/8)
2. **earthRAAngle · cos(H/16)** — the perihelion tilt rotating in the tilta direction
3. **inclinationMean · sin(H/5)** — the ecliptic tilt rotating perpendicular to both

The measured obliquity is the **Pythagorean sum** of these three perpendicular components:

```
obliquityMean = <sqrt((ε + δε)² + (earthRAAngle·cos(φ₁₆))² + (inclMean·sin(φ₅))²)>
```

where `<...>` denotes the time-average over one full H. This formula uses only existing
model parameters and produces 23.45376° — matching the simulation data to **1.4 arcsec**.

The `computeObliquityEarth()` function computes this derived mean at startup (no hardcoded
value), then adds 12 fitted harmonics for the oscillation. Total RMSE: **1.45 arcsec** over
the full Holistic Year.

The same 12 overtone harmonics appear as in the cardinal point JD fits (H/5, H/6, H/11,
H/13, H/16, H/19, H/24), confirming these are universal second-order interaction terms
of the Fibonacci precession hierarchy.

### 5. Long-term calendar implications

Over the full Holistic Year, the solstice RA drifts by 6.3° (25 minutes of RA).
The "summer solstice at 6h RA" is a temporary coincidence of our epoch.
At the balanced year, the solstice occurs at 5h 47m RA. In ~80,000 years, it will
be at 5h 35m RA (the minimum).

---

## Data Source

Cardinal point observations generated from the headless scene-graph (no browser needed):
- Script: `tools/fit/export-solar-measurements.js` (single-pass, configurable step size)
- File: [../data/02-solar-measurements.csv](../data/02-solar-measurements.csv)
- ~96,000 data points (6 types × ~16,000 steps) spanning one full Holistic Year
- Step: stepYears (from model-parameters.json), grid-aligned
- Columns: Type, Model Year, JD, RA (°), Obliquity (°), World Angle (°), Distance (AU)
- Detection: SS/WS by max/min declination (parabolic interpolation), VE/AE by declination
  zero crossing (linear interpolation)


## Implementation

All three codebases support all 4 cardinal points with an optional `type` parameter
(default 'SS' for backward compatibility):

| File | Functions | Constants |
|------|-----------|-----------|
| `tools/lib/orbital-engine.js` | `computeObliquityEarth(year)`, `computeSolsticeRA(year, type)`, `computeSolsticeJD(year, type)`, `computeSolsticeYearLength(year, type)` | `C.SOLSTICE_OBLIQUITY_MEAN` (derived at startup), `C.SOLSTICE_OBLIQUITY_HARMONICS`, `C.CARDINAL_POINT_*` |
| `src/script.js` | `computeObliquityEarth(year)`, `computeSolsticeRA(year, type)`, `computeSolsticeJD(year, type)`, `computeSolsticeYearLength(year, type)` | `OBLIQUITY_MEAN` (derived at startup), `OBLIQUITY_HARMONICS`, `CARDINAL_POINT_*` |
| `tools/lib/python/predictive_formula.py` | `calc_obliquity(year)`, `calc_solstice_ra(year, type)`, `calc_solstice_jd(year, type)`, `calc_solstice_year_length(year, type)` | `SOLSTICE_OBLIQUITY_MEAN` (derived at import), `SOLSTICE_OBLIQUITY_HARMONICS`, `CARDINAL_POINT_*` |

All implementations return exact J2000 anchor values by construction. Legacy `SOLSTICE_JD_HARMONICS` alias preserved for backward compatibility.

### Constants summary

| Constant | Value | Origin |
|----------|-------|--------|
| `CARDINAL_POINT_ANCHORS` | 4 × JD values | Astronomical observation (J2000 cardinal points) |
| `CARDINAL_POINT_HARMONICS` | 4 × 12 × [div, sin, cos] | Fitted from 11,553 simulation observations per type |
| `SOLSTICE_OBLIQUITY_MEAN` | 23.45376° | **Derived at startup** from Pythagorean tilt model (zero fitting) |
| `SOLSTICE_OBLIQUITY_HARMONICS` | 12 × [div, sin, cos] | Fitted from 11,553 SS observations |
| `earthInvPlaneInclinationMean` | 1.48118° | Model parameter (mean orbital plane tilt to invariable plane) |
| `earthRAAngle` | 1.25363° | Scene graph parameter (perihelion precession tilt) |
| `earthInvPlaneInclinationAmplitude` | 0.63597° | Model parameter (inclination oscillation) |
| `earthtiltMean` | 23.41357° | Model parameter (mean obliquity) |
| `meanSolarYearDays` | 365.24219123 | Derived from H/13 and H |

## Related Documents

- [11 — Day & Year Length Formulas](11-length-day-year-formulas.md) — Mean tropical year harmonics (4-point average)
- [37 — Planetary Precession Cycles](37-planets-precession-cycles.md) — H/3, H/8, H/16 period derivations
- [52 — Analysis Export Tools](52-analysis-export-tools.md) — Solstice & Equinox export (simulation-based detection)
- [65 — Equation of Center](65-equation-of-center.md) — Variable speed driving the H/16 timing term
- [35 — Formula Derivation](35-formula-derivation.md) — Predictive formula system overview
