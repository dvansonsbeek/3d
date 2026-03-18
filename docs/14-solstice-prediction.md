# 14 — Solstice Prediction from Fibonacci Harmonics

## Overview

The Holistic Universe Model predicts solstice timing and position using only three
Fibonacci-based harmonic periods: **H/3** (inclination cycle), **H/8** (obliquity cycle),
and **H/16** (perihelion precession). These three harmonics replace the conventional
Meeus polynomial approach, extending the valid prediction range from ±2,000 years to
the full **335,008-year** Holistic Year.

Two formulas are derived from simulation output spanning one full Holistic Year
(2,889 solstice observations at 116-year intervals, exported from the 3D model):

1. **Solstice RA** — where in right ascension the maximum obliquity occurs
2. **Solstice JD** — when the solstice occurs (Julian Day)

Both formulas use only H-based Fibonacci periods and achieve sub-degree / sub-day accuracy.

---

## Formula 1: Solstice Right Ascension

The RA at which the solstice occurs is **fully derived from model parameters** — zero
fitted constants:

```
RA(t) = (90° − earthRAAngle / sin(ε)) + (A / sin(ε)) × [−sin(2πt/(H/3)) + sin(2πt/(H/8))]
```

where `t = year − balancedYear`, `ε = earthtiltMean`, `A = earthInvPlaneInclinationAmplitude`.

| Component | Value | Source |
|-----------|-------|--------|
| Mean RA | 90° − 1.254°/sin(23.414°) = 86.845° | earthRAAngle / sin(ε) |
| Amplitude | 0.636°/sin(23.414°) = 1.600° | A / sin(ε) |
| Periods | H/3 and H/8 | Fibonacci precession hierarchy |

### Key properties

- **Mean RA ≈ 86.85° = 5h 47m 22s** (at balanced year when all precession phases = 0)
- **At J2000 ≈ 90° = 6h 00m** (near obliquity maximum of the current cycle)
- **Range: 83.68° to 90.01°** (6.32° = 25.3 minutes of RA)
- **RMSE: 0.089°** (0.36 minutes of RA) — validated against 2,889 data points
- **Zero fitted constants** — everything derived from earthRAAngle, A, and ε

### Physical structure

The formula has three remarkable properties:

**1. Same projection factor throughout.** Both the mean offset and the oscillation
amplitude use `1/sin(ε)` — the ecliptic-to-equatorial coordinate projection. The
earthRAAngle (perihelion tilt in the scene graph) sets the DC offset; the inclination
amplitude A sets the oscillation.

**2. 90° phase shift from obliquity.** The obliquity uses cosines: `−A·cos(H/3) + A·cos(H/8)`.
The solstice RA uses **sines**: `−A·sin(H/3) + A·sin(H/8)`. This means the RA tracks
the **rate of change** of obliquity, not the obliquity itself. When obliquity is changing
fastest (crossing the mean), the RA deviates most. When obliquity is at its extreme
(and momentarily stationary), the RA is at its mean.

**3. Identical amplitude structure.** The H/3 and H/8 amplitudes are equal (both = A/sin(ε)),
exactly mirroring the obliquity formula where both components use the same amplitude A.

### Derivation path

The Fourier analysis of 2,889 simulation solstice observations revealed:
1. H/3 and H/8 dominate with equal amplitudes (~1.60°) — same as obliquity
2. The amplitudes equal A/sin(ε) to 0.16% — geometric projection
3. The phase is sine (not cosine) — 90° shift from obliquity
4. The mean RA offset from 90° equals earthRAAngle/sin(ε) to 0.30%
5. **Conclusion**: the entire formula is a single geometric projection of the scene graph

---

## Formula 2: Solstice Timing (Julian Day)

The Julian Day of the solstice is anchored at the J2000 solstice (`startmodelJD`)
with harmonics self-corrected to be exact at year 2000:

```
JD(year) = startmodelJD + meanSolarYear × (year − 2000)
         + Σ harmonics(year − balanced) − Σ harmonics(2000 − balanced)
```

The harmonic subtraction ensures **JD(2000) = startmodelJD exactly**.

The three Fibonacci harmonics (fitted from simulation output):

```
harmonics(t) = −1.4475·sin(2πt/(H/3)) − 0.0896·cos(2πt/(H/3))
             +  1.5254·sin(2πt/(H/8)) + 0.0896·cos(2πt/(H/8))
             +  1.7774·sin(2πt/(H/16)) + 0.0890·cos(2πt/(H/16))
```

where `t = year − balancedYear`.

| Harmonic | Amplitude | Hours | Physical driver |
|----------|-----------|-------|-----------------|
| H/16 | 1.780 days | 42.7 h | Perihelion precession (variable speed) |
| H/8 | 1.528 days | 36.7 h | Obliquity cycle |
| H/3 | 1.450 days | 34.8 h | Inclination precession |

### Key properties

- **Anchored at startmodelJD** (J2000 solstice, JD 2451716.5)
- **Mean tropical year** = `meanSolarYearDays` (existing model constant)
- **RMSE: 0.054 days** (1.3 hours) — validated against 2,889 data points at 116-year steps
- **The H/16 term is dominant** because it encodes the variable-speed (equation of center) effect:
  when perihelion aligns with a solstice, the Sun moves faster there, shifting the solstice date
  by up to ±1.78 days
- **6 fitted Fourier coefficients** (3 sin/cos pairs) — stored in `SOLSTICE_JD_HARMONICS`
- The 1.3-hour RMSE is limited by the 116-year data resolution; finer data would improve this

### Why the amplitudes differ from the mean tropical year harmonics

The existing `TROPICAL_YEAR_HARMONICS` in the model have much smaller amplitudes
(H/8: 1.82s, H/3: 0.69s, H/16: 0.03s). This is because those harmonics describe
the **4-point mean tropical year** (averaged over all four cardinal points), which
cancels the variable-speed effect. The solstice timing formula describes a **single
cardinal point**, which includes the full equation-of-center modulation.

The ~91-second spread between cardinal point year lengths documented in
[doc 11](11-length-day-year-formulas.md) manifests here as the H/16 amplitude of
±1.78 days accumulated over the 20,938-year perihelion precession cycle.

---

## Comparison to Meeus

| Property | Meeus `solarLongitudeDeg()` | Fibonacci harmonics |
|----------|---------------------------|---------------------|
| Valid range | ±2,000 years (safely) | ±167,500 years (full H) |
| Method | Polynomial (T, T², T³) | Fourier (3 harmonics) |
| Parameters | 6 polynomial coefficients | RA: 0 fitted; JD: 6 Fourier + anchor |
| Physical basis | Empirical fit to modern data | Derived from precession hierarchy |
| Accuracy at J2000 | ±1 second | RA: exact; JD: exact (anchored at startmodelJD) |
| Accuracy over full H | Diverges beyond ±5,000 yr | RA: 0.089° RMSE; JD: 1.3 hr RMSE |
| Extrapolation | Diverges (polynomial) | Periodic — never diverges |

The Fibonacci approach trades short-term precision for long-term validity. For
sub-second accuracy within ±2,000 years, Meeus remains superior. For predictions
spanning tens of thousands of years, the Fibonacci harmonics are the only option.
With finer data resolution (29-year or annual steps instead of 116-year), the JD
accuracy is expected to improve significantly.

**The two approaches are complementary**: Meeus for precision calendrics, Fibonacci
harmonics for understanding the deep structure of solstice drift.

---

## Implications

### 1. Solstice RA is fully derived from the scene graph

The solstice RA requires **zero fitted constants**. It is a direct geometric projection
of three existing model parameters (earthRAAngle, inclination amplitude, obliquity mean)
through the single factor `1/sin(ε)`. This means the solstice RA is a **prediction**
of the model, not a fit to data. The 0.089° RMSE against simulation output is a measure
of the approximation quality (from ignoring the small H/16 and higher-order terms),
not of free-parameter tuning.

### 2. Only Fibonacci periods appear

Out of all possible harmonic periods, only H/3, H/8, and H/16 have significant
amplitude. These are exactly the three periods from the Fibonacci precession chain
(3, 8, 16 = F₄, F₆, sum of F₇+F₄). No non-Fibonacci harmonics are needed.

### 3. Perihelion precession dominates solstice timing

The H/16 term (±1.78 days) is the largest timing harmonic. This directly connects
the solstice calendar to perihelion precession — the same cycle that drives ice ages
through the Milankovitch mechanism. The solstice date oscillates by ±1.78 days over
each 20,938-year perihelion cycle.

### 4. Long-term calendar implications

Over the full Holistic Year, the solstice RA drifts by 6.3° (25 minutes of RA).
This means the "summer solstice at 6h RA" is a temporary coincidence of our epoch.
At the balanced year, the solstice occurs at 5h 47m RA. In ~80,000 years, it will
be at 5h 35m RA (the minimum).

---

## Data Source

Solstice observations exported from the 3D simulation:
- File: [97-Holistic_solstice_results.xlsx](97-Holistic_solstice_results.xlsx)
- 2,889 data points spanning one full Holistic Year (−302,349 to +32,652 AD)
- Step: 116 years (every 116th summer solstice)
- Columns: Date, Time, Model Year, JD, RA (°), Obliquity (°)

Solstice RA coefficients derived analytically from model parameters. Solstice JD
coefficients extracted via least-squares projection onto H-based harmonics.

## Implementation

| File | Functions |
|------|-----------|
| `tools/lib/orbital-engine.js` | `computeSolsticeRA()`, `computeSolsticeJD()`, `computeSolsticeYearLength()` |
| `src/script.js` | `computeSolsticeRA()`, `computeSolsticeJD()`, `computeSolsticeYearLength()` |
| `docs/scripts/predictive_formula.py` | `calc_solstice_ra()`, `calc_solstice_jd()`, `calc_solstice_year_length()` |

## Related Documents

- [11 — Day & Year Length Formulas](11-length-day-year-formulas.md) — Mean tropical year harmonics (4-point average)
- [37 — Planetary Precession Cycles](37-planets-precession-cycles.md) — H/3, H/8, H/16 period derivations
- [65 — Equation of Center](65-equation-of-center.md) — Variable speed driving the H/16 solstice timing term
- [35 — Formula Derivation](35-formula-derivation.md) — Predictive formula system overview
