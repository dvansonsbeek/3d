# Year and Day Length Formulas

> **Scope.** This document describes the **modern-era / within-H Fourier-harmonic picture** — the means derived from `inputmeanlengthsolaryearindays = 365.2422` and Earth Fundamental Cycle `H = 335,317 yr`, with Fourier oscillations fitted across one full H. At deep-time / Phanerozoic / Hadean epochs the **mean values themselves shift** per the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md): H(t) grows under Driver 1 (Earth-Moon tidal evolution → LOD grows) while the sidereal year in seconds shifts under Driver 2 (solar mass loss → Kepler `dT/T = −2 dM/M`). For deep-time work use the epoch-dependent helpers (`meanLodSecondsAtAge`, `meanSiderealYearSecondsAtAge`, `meanHAtAge`, `meanTropicalYearSecondsAtAge`) — see [Doc 20 §"ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the J2000-constant → helper map.

## Architecture

All year and day lengths are derived from a single input constant plus Fourier harmonic corrections. The means are **derived**, not fitted — only the harmonic coefficients are empirical.

```
inputmeanlengthsolaryearindays = 365.2422
        │
        ▼
  ┌─────────────────────────────────────────────────────┐
  │ meanSolarYear = round(input × H/8) / (H/8)         │  Tropical year mean
  │ meanSiderealYear = meanSolarYear × H / (H − 13)    │  Sidereal year mean
  │ meanAnomalisticYear = meanSolarYear × H / (H − 16) │  Anomalistic year mean
  └─────────────────────────────────────────────────────┘
        │
        ├──► Tropical year (runtime):
        │    Mean of 4 cardinal point derivatives
        │    (CARDINAL_POINT_HARMONICS, 24 terms per type)
        │    Measured at solstices (max/min dec) and
        │    equinoxes (dec=0 crossing)
        │
        ├──► Sidereal year: Fourier harmonics (5 terms)
        │    Y(t) = mean + Σ [sᵢ·sin(2πt/Tᵢ) + cᵢ·cos(2πt/Tᵢ)]
        │
        └──► Anomalistic year: Fourier harmonics (8 terms)
             where t = year − balancedYear
        │
        ▼  Derived quantities
  ┌─────────────────────────────────────────────────────┐
  │ dayLength = siderealYearSeconds / siderealYear(days)│
  │ solarYearSec = solarYear(days) × dayLength          │
  │ anomYearSec = anomYear(days) × dayLength            │
  │ siderealDay = solarYearSec / (solarYearSec/86400+1)│
  └─────────────────────────────────────────────────────┘
```

### Key Principle

The **sidereal year in SI seconds is derived** from the IAU sidereal year reference:

```
meansiderealyearlengthinSeconds = siderealYearJ2000 × 86400
```

where `siderealYearJ2000 = 365.25636301` days (from `astro-reference.json`). As orbital elements change over millennia, the sidereal year in *days* changes (via Fourier harmonics), which means the *day length* changes, which in turn affects how many seconds are in a tropical year.


## Mean Year Lengths (Derived)

All three mean year lengths derive from `inputmeanlengthsolaryearindays` and the Earth Fundamental Cycle `H = 335,317`:

| Year type | Formula | Mean (days) |
|-----------|---------|-------------|
| Tropical | `round(input × H/8) / (H/8)` | 365.242203646 |
| Sidereal | `tropical × H / (H − 13)` | 365.256364374 |
| Anomalistic | `tropical × H / (H − 16)` | 365.259632390 |

Note: The tropical year mean is quantized at H/8 resolution (the obliquity cycle). The sidereal and anomalistic means follow algebraically.

The ratios `H/(H−13)` and `H/(H−16)` come from the coin rotation paradox:
- In one axial precession cycle (H/13), there is exactly **1 fewer sidereal year than tropical years** — the precessing equinox "absorbs" one full orbit
- In one perihelion precession cycle (H/16), there is exactly **1 fewer anomalistic year than tropical years** — the precessing perihelion "absorbs" one full orbit
- In one inclination precession cycle (H/3), there is exactly **1 fewer anomalistic year than sidereal years**


## Fourier Harmonic Variations

Year-length variations are modelled as Fourier series around the derived means. Coefficients were fitted from measured data points spanning the full H cycle (stepYears=23 steps). The reference time is `t = year − balancedYear`.

### Tropical Year

The tropical year is measured at the actual solstices and equinoxes (declination extrema and zero-crossings), NOT at RA crossings. The mean tropical year is the average of 4 cardinal point intervals: SS-to-SS, WS-to-WS, VE-to-VE, AE-to-AE.

Two paths compute the tropical year:

- `computeSolarYearDaysDirect(year)` — Step 6d direct year-length Fourier fit (TROPICAL_YEAR_HARMONICS, 12 terms). J2000-anchored to the CSV year-2000 measurement (365.24219037 at J2000). **This is the primary display path — used by the Predictions panel Solar Year (days) row and the modal tropical-year chart.**
- `computeSolarYearDaysFromCardinals(year)` — analytical derivative of the cardinal-point harmonic formula (CARDINAL_POINT_HARMONICS, 24 harmonics per type, averaged over all 4 CPs). Kept for chart consistency in `charts/report` code paths that already display cardinal-point data.

Both paths converge at year 2000 within ~2 μd (Step 6c fit residual vs Step 6d anchor).

### Sidereal Year (5 harmonics)

```
Y_sid(t) = meanSiderealYear + Σ harmonics
```

The sidereal year is measured by tracking the Sun's **world angle** (ICRF) at each cardinal point event, then computing:

```
siderealYear = JD_interval × 360 / (360 − dWA)
```

where `dWA` is the world-angle advancement over one tropical year interval (single-year step). For multi-year spans (stepYears > 1), use `step × 360 − dWA` in the denominator. This is the same formula used by `year-length-harmonics.js`.

Sidereal year variations are much smaller than tropical — the orbital period is nearly constant, with only tiny perturbations from planetary gravitational interactions.

### Anomalistic Year (8 harmonics)

```
Y_anom(t) = meanAnomalisticYear + Σ harmonics
```

The anomalistic year is measured from perihelion-to-perihelion and aphelion-to-aphelion intervals, averaged. The dominant H/24 term is the beat frequency between the inclination (H/3) and obliquity (H/8) cycles.


## Derived Day and Year Quantities

Given the three year lengths from above, all other time quantities are derived. The derivation chain starts from the sidereal year in SI seconds:

```
siderealYearSeconds = siderealYearJ2000 × 86400
        │
        ▼  ÷ siderealYear(days_kinematic) via H/13 identity
  ┌──────────────────────────────────────────────────────────────┐
  │ LOD_mean = siderealYearSeconds / siderealYear(days_kinematic)│
  │          = 86399.999676 s at J2000                           │
  │  ← the KINEMATIC baseline used throughout the sidereal↔      │
  │    tropical conversion chain and the calibrated ΔT stack     │
  └──────────────────────────────────────────────────────────────┘
        │
        ▼  × year lengths in days
  ┌─────────────────────────────────────────────────────┐
  │ solarYearSec = solarYear(days) × LOD_mean           │
  │ anomYearSec  = anomYear(days) × LOD_mean            │
  └─────────────────────────────────────────────────────┘
        │
        ▼  Derived day types
  ┌─────────────────────────────────────────────────────┐
  │ siderealDay = solarYearSec / (solarYearSec/86400+1) │
  │ stellarDay  = siderealDay + precession correction   │
  └─────────────────────────────────────────────────────┘

Separately (physical/USNO branch — does NOT feed the derivation chain above):
  ┌──────────────────────────────────────────────────────────┐
  │ LOD_real = LOD_mean × (1 + 1/((H/5)·mSY)) + Σ DT cycles  │
  │          = 86400.0018 s at J2000                         │
  │  ← anchored at USNO 86400.0018 (joint-optimum vs Espenak,│
  │    2026-07-18; see tools/fit/dt-corrections-fit.js       │
  │    --sweep-usno for the {USNO × deltaTStart} sweep)      │
  │    (used in Predictions panel LOD readout, pure-H/5 ΔT   │
  │     V-curve, physical display — see § "The H/5 LOD       │
  │     Correction")                                         │
  └──────────────────────────────────────────────────────────┘
```

### Day Types

**Solar day** — the time for the Sun to return to the same local meridian (noon to noon). The solar day varies throughout the year due to orbital eccentricity and obliquity (equation of time). The framework maintains **two mean-LOD values**:

- **LOD_mean** = `siderealYearSeconds / siderealYear(days_kinematic)` ≈ 86399.999676 s at J2000 — the kinematic baseline used inside all sidereal↔tropical conversions and the calibrated ΔT correction stack.
- **LOD_real** = LOD_mean + LOD_mean/((H/5) × mSY) + DT cycle sum = 86400.0018 s at J2000 — Layer 3: adds the H/5 ecliptic missing-motion correction (~3.5 ms) + Bond/Hallstatt/Jose5/Jose4 cyclic δLOD. USNO-anchored via joint optimum. Used in the user-facing physical LOD display.

Both fluctuate over millennia as the sidereal year in days changes. See § "The H/5 LOD Correction" below.

**Sidereal day** — the time for Earth to rotate 360° relative to the vernal equinox. Shorter than the solar day because Earth's orbital motion means the Sun drifts ~1°/day eastward, requiring extra rotation to reach the next noon. Formula:

```
siderealDay = solarYearSec / (solarYearSec / 86400 + 1)
```

**Stellar day** — the time for Earth to rotate 360° relative to fixed stars (ICRF). Slightly *longer* than the sidereal day because the vernal equinox precesses westward ~50″/year, so Earth needs less rotation to "catch" the moving equinox than to return to the same fixed star. The precession correction adds ~9.1 ms to the sidereal day.

### J2000 Day-Length Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Mean solar day — **LOD_mean** (H/13 identity) | 86399.999676 s | — (kinematic) |
| Mean solar day — **LOD_real** (Layer 3: +H/5 + DT cycles, physical) | 86400.0018 s | 86400.0018 s (USNO joint-optimum anchor, 2026-07-18) |
| Sidereal day | 86164.091 s | 86164.091 s (IAU) |
| Stellar day | 86164.099 s | 86164.099 s (IAU) |

See § "The H/5 LOD Correction" below for the distinction between the two mean solar day values.

### The H/5 LOD Correction (Kinematic vs Physical)

The framework maintains two distinct LOD values that differ by a small H/5-derived correction:

**LOD_mean** — the kinematic baseline from the H/13 identity:
```
LOD_mean = siderealYearSeconds / (mSY × H/(H−13))
         = 86399.999676 s at J2000
```

**LOD_real** (Layer 3) — the physical LOD, three-part construction:
```
LOD_real = o.lodKinematic + h5Correction(year) + dtCycleLodCorrectionSum(year)

where:
  o.lodKinematic     = IAU_sid_sec / Fourier_sid_days ≈ 86400.00030 s at J2000
  h5Correction(year) = LOD_mean / ((H/5) × mSY)       ≈ 3.527 ms
  dtCycleLodCorrectionSum = sum of Bond/Hallstatt/Jose5/Jose4 cyclic δLOD (~−2.6 ms at J2000)
```

The H/5 correction represents Earth's need to rotate slightly MORE per solar day to catch the Sun on the meridian, because the Sun's apparent motion follows the ecliptic — which precesses at H/5 (the ecliptic precession cycle, ~67,063 yr). Over one solar day (= 1/mSY of one year), the ecliptic advances by 1/((H/5)·mSY) revolutions — requiring that many extra revolutions of Earth rotation:

```
δ_rev = 1 / ((H/5) × mSY)                                ≈ 4.083 × 10⁻⁸ rev/day
δ_LOD = LOD_mean × δ_rev = LOD_mean / ((H/5) × mSY)      ≈ 3.527 ms per solar day
```

**Why H/5 (not H/3):** the correction's reference frame must be the Sun's apparent motion (which follows the ecliptic, precesses at H/5). The H/3 inclination precession applies to the invariable-plane frame, which is not the reference used for the solar-day counting.

**Where each is used:**

| LOD used | Purpose | Code path |
|----------|---------|-----------|
| **LOD_mean** | sidereal↔tropical conversions (day-count identity), calibrated ΔT correction integrand (Bond/Hallstatt/Jose4/5 stack expects this baseline), Meeus JD_UT → JD_TT, eclipse code, live accumulator | `meanDeltaTSecondsAtAge`, `updateDeltaT` |
| **LOD_real** (Layer 3) | User-facing "physical" LOD display, pure-H/5 physics ΔT V-curve | `pureH5DeltaTAtAge`, Predictions panel LOD binding |

**Why other H/N cycles don't appear as explicit corrections:** the H/13 axial precession is ALREADY implicit in LOD_mean via the `H/(H−13)` denominator (over H tropical years the sidereal frame counts H−13 years — the missing 13 IS the axial precession). Adding an explicit H/13 correction would double-count. H/8 obliquity is oscillatory (mean zero). H/16 perihelion motion contributes to the anomalistic year, not to the tropical-day counting relative to the Sun. Only H/5 (ecliptic precession) gives the correct reference for the Sun's apparent motion.


## Precession Periods (Coin Rotation Paradox)

All precession periods emerge from ratios of year lengths:

| Precession | Formula | Mean period |
|------------|---------|-------------|
| Axial | `Y_sid / (Y_sid − Y_trop)` | H/13 ≈ 25,794 yr |
| Perihelion | `Y_anom(s) / (Y_anom(s) − Y_trop(s))` | H/16 ≈ 20,957 yr |
| Inclination | `Y_anom(s) / (Y_anom(s) − Y_sid(s))` | H/3 ≈ 111,772 yr |
| Obliquity | axial × 13/8 | H/8 ≈ 41,915 yr |
| Ecliptic | axial × 13/5 | H/5 ≈ 67,063 yr |

These are time-varying — each uses the instantaneous year lengths at the given epoch, so precession periods themselves oscillate slightly.

The coin rotation paradox manifests at every timescale:

| Timescale | Precession | Cycle absorbed | Offset per cycle |
|-----------|------------|---------------|-----------------|
| Years | Axial (H/13) | 1 fewer sidereal year than tropical years | ~20 min/year |
| Years | Perihelion (H/16) | 1 fewer anomalistic year than tropical years | ~15 min/year |
| Days | Orbital (1 year) | 1 fewer solar day than sidereal days | ~3m 56s/day |
| Days | Axial (H/13) | 1 fewer sidereal day than stellar days | ~9.1 ms/day |


## J2000 Reference Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Tropical year | 365.242190 days | 365.242190 days (IAU) |
| Sidereal year | 365.256363 days | 365.256363 days (IAU) |
| Anomalistic year | 365.259633 days | 365.259636 days (IAU) |
| LOD_mean (kinematic, H/13 identity) | 86399.999676 s | — |
| LOD_real (Layer 3: physical, +H/5 correction + DT cycles) | 86400.0018 s | 86400.0018 s (USNO joint-optimum anchor, 2026-07-18) |
| Sidereal day | 86164.091 s | 86164.091 s (IAU) |
| Stellar day | 86164.099 s | 86164.099 s (IAU) |
| Axial precession | 25,771 yr | 25,771 yr (instantaneous J2000 rate) |


## Physical Insights

### Why Each Harmonic Dominates Its Year Type

| Year type | Dominant harmonic | Physical reason |
|-----------|-------------------|-----------------|
| Tropical | H/8 (obliquity) | Measures solstice/equinox-to-same — steeper ecliptic angle (higher obliquity) means faster equator crossing → shorter tropical year |
| Sidereal | H/8 + H/3 (tiny) | Measures full orbit — nearly constant, with only tiny perturbations from planetary gravitational interactions |
| Anomalistic | H/24 (beat freq) | Measures perihelion-to-perihelion — sensitive to the interplay between inclination and obliquity cycles |

### Cardinal Point Tropical Year Variation (J2000)

The tropical year length depends on *which* cardinal point is used to measure it. At J2000 (perihelion in early January):

| Cardinal point | Year length | Relative to mean | Reason |
|----------------|-------------|-------------------|--------|
| Summer Solstice | 365.241617 days | −51 s (shortest) | Aphelion nearby → fast orbital speed |
| Vernal Equinox | 365.242336 days | +12 s | Transition |
| Autumnal Equinox | 365.242056 days | −13 s | Transition |
| Winter Solstice | 365.242749 days | +47 s (longest) | Perihelion nearby → slow orbital speed |

This pattern reverses when perihelion precesses to July. The *mean* of all four cardinal points cancels this effect and gives the true mean tropical year.

### Self-Consistency of the Derivation Chain

The formulas are self-consistent by construction. The identity

```
siderealYear(seconds) = siderealYear(days) × dayLength
                      = siderealYear(days) × (siderealYearSeconds / siderealYear(days))
                      = siderealYearSeconds  ✓
```

holds at every epoch — it is algebraically tautological. **Within the modern era** the sidereal year in SI seconds is treated as the calibration anchor (`siderealYearJ2000 × 86400`); the within-H Fourier harmonics describe oscillations of the day-count quantities around their means with the anchor held fixed.

**At deep time**, both terms on the right-hand side scale: Driver 1 (Earth-Moon tidal evolution) changes `dayLength`; Driver 2 (solar mass loss) changes the sidereal year in seconds via Kepler's 3rd law (`dT/T = −2 dM/M`). The identity is preserved at every epoch, but neither factor is constant. See [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) for the two-driver derivation and [Doc 20 §"ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the epoch-dependent helpers (`meanSiderealYearSecondsAtAge`, `meanLodSecondsAtAge`).

### The 9.1ms Stellar-Sidereal Day Offset (Axial Precession)

The stellar day (rotation relative to fixed stars) exceeds the sidereal day (rotation relative to the precessing vernal equinox) by ~9.1 ms. This accumulates to exactly **one extra sidereal day per axial precession cycle**:

```
9.12 ms/day × 366.24 sidereal days/year × H/13 years ≈ 1.00 sidereal days
```


## Implementation

### JavaScript (`script.js`)

The tropical year primary display path uses the direct year-length Fourier fit (Step 6d, TROPICAL_YEAR_HARMONICS, 12 terms):

```javascript
function computeSolarYearDaysDirect(currentYear) {
  return evalYearFourier(currentYear, meansolaryearlengthinDays, TROPICAL_YEAR_HARMONICS);
}
```

A secondary derivation via cardinal-point harmonics is kept for chart consistency:

```javascript
function computeSolarYearDaysFromCardinals(currentYear) {
  return (computeSolsticeYearLength(currentYear, 'SS') +
          computeSolsticeYearLength(currentYear, 'WS') +
          computeSolsticeYearLength(currentYear, 'VE') +
          computeSolsticeYearLength(currentYear, 'AE')) / 4;
}
```

The sidereal and anomalistic years use the simpler Fourier evaluator:

```javascript
function evalYearFourier(currentYear, mean, harmonics) {
  const t = currentYear - balancedYear;
  let result = mean;
  for (const [div, sinC, cosC] of harmonics) {
    const phase = 2 * Math.PI * t / (holisticyearLength / div);
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}
```

### Source Files

| File | Role |
|------|------|
| `src/script.js` | Runtime formulas, harmonic coefficients |
| `tools/lib/constants.js` | Pipeline constants (reads from JSON) |
| `public/input/fitted-coefficients.json` | Fitted harmonic coefficients |
| `public/input/astro-reference.json` | IAU reference values |


## Updating Coefficients

If `H` or `inputmeanlengthsolaryearindays` changes:

1. **Means update automatically** — they are derived formulas, not constants
2. **Harmonic coefficients must be refitted** from solar measurement data:
   - Run `export-solar-measurements.js` (step 6a) — full H at stepYears-year steps
   - Tropical year: derived from cardinal point harmonics (step 6c)
   - Sidereal/anomalistic: run `year-length-harmonics.js` (step 6d)
3. **stepYears must divide H evenly** — current: H=335,317, stepYears=23

Training data: `data/02-solar-measurements.csv`

## Related

- [Solstice Prediction](14-solstice-prediction.md) — cardinal point harmonic formulas
- **Solar Day Report** (browser: Reports > Solar Day) — measures 365 noon-to-noon intervals from 6 starting points, visualizes the analemma and equation-of-time bias by starting angle
