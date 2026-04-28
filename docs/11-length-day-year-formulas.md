# Year and Day Length Formulas

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

In the browser, `computeLengthofsolarYear(year)` computes the derivative of the cardinal point harmonic formula (CARDINAL_POINT_HARMONICS, 24 harmonics per type) and averages all 4 types.

The simpler `TROPICAL_YEAR_HARMONICS` (12 terms) is fitted from the same data and used by the pipeline tools. It is not used at runtime in the browser — only the cardinal point derivative approach is authoritative.

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
        ▼  ÷ siderealYear(days) from Fourier
  ┌─────────────────────────────────────────────────────┐
  │ dayLength = siderealYearSeconds / siderealYear(days)│
  └─────────────────────────────────────────────────────┘
        │
        ▼  × year lengths in days
  ┌─────────────────────────────────────────────────────┐
  │ solarYearSec = solarYear(days) × dayLength          │
  │ anomYearSec  = anomYear(days) × dayLength           │
  └─────────────────────────────────────────────────────┘
        │
        ▼  Derived day types
  ┌─────────────────────────────────────────────────────┐
  │ siderealDay = solarYearSec / (solarYearSec/86400+1)│
  │ stellarDay  = siderealDay + precession correction   │
  └─────────────────────────────────────────────────────┘
```

### Day Types

**Solar day** — the time for the Sun to return to the same local meridian (noon to noon). The solar day varies throughout the year due to orbital eccentricity and obliquity (equation of time). The model computes the **length of day** (LOD) as `siderealYearSeconds / siderealYear(days)`, which gives the mean solar day for a given epoch (≈ 86,400 seconds at J2000). The LOD fluctuates over millennia as the sidereal year in days changes.

**Sidereal day** — the time for Earth to rotate 360° relative to the vernal equinox. Shorter than the solar day because Earth's orbital motion means the Sun drifts ~1°/day eastward, requiring extra rotation to reach the next noon. Formula:

```
siderealDay = solarYearSec / (solarYearSec / 86400 + 1)
```

**Stellar day** — the time for Earth to rotate 360° relative to fixed stars (ICRF). Slightly *longer* than the sidereal day because the vernal equinox precesses westward ~50″/year, so Earth needs less rotation to "catch" the moving equinox than to return to the same fixed star. The precession correction adds ~9.1 ms to the sidereal day.

### J2000 Day-Length Values

| Quantity | Model value | IAU reference |
|----------|-------------|---------------|
| Mean solar day | 86400.000 s | 86400.000 s |
| Sidereal day | 86164.091 s | 86164.091 s |
| Stellar day | 86164.099 s | 86164.099 s |


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

| Quantity | Model value | IAU reference |
|----------|-------------|---------------|
| Tropical year | 365.242190 days | 365.242190 days |
| Sidereal year | 365.256363 days | 365.256363 days |
| Anomalistic year | 365.259633 days | 365.259636 days |
| Mean solar day | 86400.000 s | 86400.000 s |
| Sidereal day | 86164.091 s | 86164.091 s |
| Stellar day | 86164.099 s | 86164.099 s |
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

The formulas are self-consistent by construction:

```
siderealYear(seconds) = siderealYear(days) × dayLength
                      = siderealYear(days) × (siderealYearSeconds / siderealYear(days))
                      = siderealYearSeconds  ✓
```

No matter how year lengths vary over millennia, the sidereal year in SI seconds remains constant — it is the orbital period, determined by Kepler's 3rd law and the Sun's gravitational field.

### The 9.1ms Stellar-Sidereal Day Offset (Axial Precession)

The stellar day (rotation relative to fixed stars) exceeds the sidereal day (rotation relative to the precessing vernal equinox) by ~9.1 ms. This accumulates to exactly **one extra sidereal day per axial precession cycle**:

```
9.12 ms/day × 366.24 sidereal days/year × H/13 years ≈ 1.00 sidereal days
```


## Implementation

### JavaScript (`script.js`)

The tropical year uses the derivative of the cardinal point harmonics (24 harmonics per type, averaged over 4 types):

```javascript
function computeLengthofsolarYear(currentYear) {
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
