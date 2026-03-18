# Year and Day Length Formulas

## Architecture

All year and day lengths are derived from a single input constant plus Fourier harmonic corrections. The means are **derived**, not fitted — only the harmonic coefficients are empirical.

```
inputmeanlengthsolaryearindays = 365.2421897
        │
        ▼
  ┌─────────────────────────────────────────────────────┐
  │ meanSolarYear = round(input × H/16) / (H/16)       │  Tropical year mean
  │ meanSiderealYear = meanSolarYear × H / (H − 13)    │  Sidereal year mean
  │ meanAnomalisticYear = meanSolarYear × H / (H − 16) │  Anomalistic year mean
  └─────────────────────────────────────────────────────┘
        │
        ▼  + Fourier harmonics (fitted coefficients)
  ┌─────────────────────────────────────────────────────┐
  │ Y(t) = mean + Σ [sᵢ·sin(2πt/Tᵢ) + cᵢ·cos(2πt/Tᵢ)]│
  │ where t = year − balancedYear                       │
  └─────────────────────────────────────────────────────┘
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

The **sidereal year in SI seconds is constant** (31,558,149.8 s — the orbital period). As orbital elements change over millennia, the sidereal year in *days* changes, which means the *day length* changes, which in turn affects how many seconds are in a tropical year. This single fixed value anchors the entire system.


## Mean Year Lengths (Derived)

All three mean year lengths derive from `inputmeanlengthsolaryearindays` and the Holistic Year `H = 335,008`:

| Year type | Formula | Mean (days) |
|-----------|---------|-------------|
| Tropical | `round(input × H/16) / (H/16)` | 365.242191231254 |
| Sidereal | `tropical × H / (H − 13)` | 365.256365020373 |
| Anomalistic | `tropical × H / (H − 16)` | 365.259636051010 |

The ratios `H/(H−13)` and `H/(H−16)` come from the coin rotation paradox:
- In one axial precession cycle (H/13), there is exactly **1 fewer sidereal year than tropical years** — the precessing equinox "absorbs" one full orbit
- In one perihelion precession cycle (H/16), there is exactly **1 fewer anomalistic year than tropical years** — the precessing perihelion "absorbs" one full orbit
- In one inclination precession cycle (H/3), there is exactly **1 fewer anomalistic year than sidereal years**


## Fourier Harmonic Variations

Year-length variations are modelled as Fourier series around the derived means. Coefficients were fitted from 491 measured data points spanning ±25,000 years (100-year steps). The reference time is `t = year − balancedYear`, where `balancedYear = 1246 − 14.5 × (H/16) = −302,355`.

### Tropical Year (3 harmonics, RMS = 0.006 s)

```
Y_trop(t) = meanSolarYear + Σ harmonics
```

| Period | sin coeff | cos coeff | Amplitude |
|--------|-----------|-----------|-----------|
| H/8 (obliquity, 41,876 yr) | −1.3157e−06 | −2.1016e−05 | 1.819 s |
| H/3 (inclination, 111,669 yr) | +6.7451e−07 | +7.9555e−06 | 0.690 s |
| H/16 (perihelion, 20,938 yr) | −6.1457e−09 | −3.6226e−07 | 0.031 s |

The dominant H/8 term (obliquity cycle) causes the tropical year to vary by ±1.8 seconds over ~42,000 years. Higher obliquity → steeper equator crossing → shorter tropical year.

### Sidereal Year (2 harmonics, RMS = 0.003 s)

```
Y_sid(t) = meanSiderealYear + Σ harmonics
```

| Period | sin coeff | cos coeff | Amplitude |
|--------|-----------|-----------|-----------|
| H/8 (obliquity, 41,876 yr) | −1.2551e−06 | −1.7833e−08 | 0.108 s |
| H/3 (inclination, 111,669 yr) | +5.7942e−07 | +1.0194e−07 | 0.051 s |

Sidereal year variations are 15× smaller than tropical — the orbital period is nearly constant, with tiny perturbations from planetary gravitational interactions.

### Anomalistic Year (4 harmonics, RMS = 0.011 s)

```
Y_anom(t) = meanAnomalisticYear + Σ harmonics
```

| Period | sin coeff | cos coeff | Amplitude |
|--------|-----------|-----------|-----------|
| H/8 (obliquity, 41,876 yr) | −2.1120e−07 | +2.5447e−08 | 0.018 s |
| H/3 (inclination, 111,669 yr) | −6.7556e−08 | −5.9637e−10 | 0.006 s |
| H/16 (perihelion, 20,938 yr) | −5.0745e−08 | +8.6658e−08 | 0.009 s |
| H/24 (beat freq, 13,959 yr) | −4.4323e−07 | +1.8459e−08 | 0.038 s |

The H/24 = H/(3×8) term is the beat frequency between the inclination and obliquity cycles.


## Derived Day and Year Quantities

Given the three year lengths from above, all other time quantities are derived. The derivation chain starts from the fixed sidereal year in SI seconds:

```
siderealYearSeconds (fixed: 31,558,149.8 s)
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

**Solar day** — the time for the Sun to return to the same local meridian (noon to noon). Equals exactly 86,400 seconds by definition in the model's fixed-frame measurement. The solar day varies throughout the year due to orbital eccentricity and obliquity (equation of time), but the *mean* solar day is constant for a given epoch.

**Sidereal day** — the time for Earth to rotate 360° relative to the vernal equinox. Shorter than the solar day because Earth's orbital motion means the Sun drifts ~1°/day eastward, requiring extra rotation to reach the next noon. Formula:

```
siderealDay = solarYearSec / (solarYearSec / 86400 + 1)
```

The sidereal day shows zero variation across measurements within an epoch — it is constant for a given year.

**Stellar day** — the time for Earth to rotate 360° relative to fixed stars (ICRF). Slightly *longer* than the sidereal day because the vernal equinox precesses westward ~50″/year, so Earth needs less rotation to "catch" the moving equinox than to return to the same fixed star. The precession correction is:

```
stellarDay = siderealDay × (1 + 1/(precessionPeriod × rotationsPerYear))
```

This adds ~9.1 ms to the sidereal day at the current epoch.

### RA Solar Day Measurement Offset

RA-based solar day measurements (tracking the Sun's right ascension from Earth's wobble center or Earth's position) show the mean solar day ~14.2 ms shorter than `meanlengthofday`. This has been confirmed by the "Solar day multiepoch" test: 65 measurements evenly distributed across one full holistic year (H), mean offset −14.194 ms/day. The physical cause is not yet fully explained and requires further investigation. Methods that use a fixed reference frame or derive from the sidereal day correctly yield `meanlengthofday` ≈ 86,400 s.

### J2000 Day-Length Values

| Quantity | Model value | IAU reference | Agreement |
|----------|-------------|---------------|-----------|
| Mean solar day (derived) | 86400.000 s | 86400.002 s | 2 ms (tidal drift not modelled) |
| Mean solar day (measured) | 86399.9913 s | — | RA Day Offset at J2000: −8.3 ms |
| Sidereal day | 86164.0905 s | 86164.0905 s | 0.003 ms |
| Stellar day | 86164.0997 s | 86164.0989 s | 0.8 ms |
| Stellar − sidereal | 9.13 ms | 8.37 ms | — |


## Precession Periods (Coin Rotation Paradox)

All precession periods emerge from ratios of year lengths:

| Precession | Formula | Mean period |
|------------|---------|-------------|
| Axial | `Y_sid / (Y_sid − Y_trop)` | H/13 ≈ 25,770 yr |
| Perihelion | `Y_anom(s) / (Y_anom(s) − Y_trop(s))` | H/16 ≈ 20,938 yr |
| Inclination | `Y_anom(s) / (Y_anom(s) − Y_sid(s))` | H/3 ≈ 111,669 yr |
| Obliquity | axial × 13/8 | H/8 ≈ 41,876 yr |
| Ecliptic | axial × 13/5 | H/5 ≈ 67,002 yr |

These are time-varying — each uses the instantaneous year lengths at the given epoch, so precession periods themselves oscillate slightly.

The coin rotation paradox manifests at every timescale — years, days, and seconds all follow the same pattern of "1 fewer cycle per precession period":

| Timescale | Precession | Cycle absorbed | Offset per cycle |
|-----------|------------|---------------|-----------------|
| Years | Axial (H/13) | 1 fewer sidereal year than tropical years | ~20 min/year |
| Years | Perihelion (H/16) | 1 fewer anomalistic year than tropical years | ~15 min/year |
| Days | Orbital (1 year) | 1 fewer solar day than sidereal days | ~3m 56s/day |
| Days | Axial (H/13) | 1 fewer sidereal day than stellar days | ~9.1 ms/day |


## J2000 Reference Values

| Quantity | Model value | IAU reference |
|----------|-------------|---------------|
| Tropical year | 365.242191 days | 365.242190 days |
| Sidereal year | 365.256363 days | 365.256363 days |
| Anomalistic year | 365.259636 days | 365.259636 days |
| Mean solar day (derived) | 86400.000 s | 86400.002 s |
| Mean solar day (measured) | 86399.9913 s | — |
| Sidereal day | 86164.0905 s | 86164.0905 s |
| Stellar day | 86164.0997 s | 86164.0989 s |
| Axial precession | 25,772 yr | 25,772 yr |


## Physical Insights

### Why Each Harmonic Dominates Its Year Type

The Fourier analysis reveals an elegant separation of physical dependencies:

| Year type | Dominant harmonic | Physical reason |
|-----------|-------------------|-----------------|
| Tropical | H/8 (obliquity) | Measures equinox-to-equinox — steeper ecliptic angle (higher obliquity) means faster equator crossing → shorter tropical year |
| Sidereal | H/8 + H/3 (tiny) | Measures full orbit — nearly constant, with only tiny perturbations from planetary gravitational interactions |
| Anomalistic | H/24 (beat freq) | Measures perihelion-to-perihelion — sensitive to the interplay between inclination and obliquity cycles |

The tropical year depends primarily on Earth's axial orientation (obliquity), while the sidereal year depends on the actual orbital dynamics. This makes physical sense: obliquity affects the *reference frame* for measuring the tropical year, while orbital mechanics determine the sidereal year.

### Self-Consistency of the Derivation Chain

The formulas are self-consistent by construction:

```
siderealYear(seconds) = siderealYear(days) × dayLength
                      = siderealYear(days) × (siderealYearSeconds / siderealYear(days))
                      = siderealYearSeconds  ✓  (always exactly 31,558,149.8 s)
```

No matter how year lengths vary over millennia, the sidereal year in SI seconds remains constant — it is the orbital period, determined by Kepler's 3rd law and the Sun's gravitational field. All variation in other quantities ultimately traces back to changes in how many *days* fit into this fixed number of seconds.

### The 14.2ms RA Solar Day Offset (Unknown Cause)

RA-based solar day measurements (Methods A and D) consistently show the mean solar day ~14.2 ms shorter than `meanlengthofday`. This has been confirmed by the "Solar day multiepoch" test across 65 epochs spanning one full holistic year H. The physical cause of the mean offset is not yet fully explained and requires further investigation. Perihelion precession produces a sinusoidal modulation (~7.1 ms amplitude, period H/16) that cancels in the mean and does not explain the constant offset.

#### Fourier Decomposition of the Offset

A regression analysis of the 65-epoch dataset (R² = 0.994, RMS = 0.324 ms) reveals two modulation components on top of the unexplained mean:

```
offset(t) = −14.194 − 5.640 × cos(2π·t/(H/16)) − 1.684 × cos(2π·t/(H/8))   [ms/day]
```

where `t` is time in tropical years relative to the balanced reference epoch.

Equivalent linear form using orbital parameters at each epoch:

```
offset ≈ −45.92 + 4116.85 × ecc − 1.3494 × obliq   [ms/day]
```

where `ecc` is orbital eccentricity and `obliq` is axial obliquity in degrees.

| Component | Period | Amplitude | Driver |
|-----------|--------|-----------|--------|
| Mean offset | — | −14.194 ms | unknown (constant term) |
| Cosine term 1 | H/16 = 20,938 yr | ±5.640 ms | Eccentricity (perihelion precession) |
| Cosine term 2 | H/8 = 41,876 yr | ±1.684 ms | Obliquity (obliquity cycle) |

The dominant modulation tracks eccentricity over the perihelion precession cycle (H/16), and the secondary term tracks obliquity over the obliquity cycle (H/8). The constant mean of −14.194 ms itself remains unexplained from first principles.

### The 9.1ms Stellar-Sidereal Day Offset (Axial Precession)

The stellar day (rotation relative to fixed stars) exceeds the sidereal day (rotation relative to the precessing vernal equinox) by ~9.1 ms. This accumulates to exactly **one extra sidereal day per axial precession cycle**:

```
9.12 ms/day × 366.24 sidereal days/year × H/13 years = 86,064 s ≈ 1.00 sidereal days
```

Verification from first principles:

```
Total sidereal days in one axial precession cycle: (H/13) × 366.242 = 9,440,850 sidereal days
One extra sidereal day spread over the cycle: 86164 s / 9,440,850 = 9.13 ms/sidereal day  ✓
```

The two offsets form a symmetric pair — both arising from the coin rotation paradox:

| Effect | Daily offset | Days/year | Precession cycle | Accumulates to |
|--------|-------------|-----------|-----------------|----------------|
| RA solar day offset | ~14.2 ms | 365.24 solar | unknown | unknown (under investigation) |
| Stellar-sidereal offset | ~9.1 ms | 366.24 sidereal | H/13 (axial) | 1 extra sidereal day |

### Cardinal Point Tropical Year Variation

The tropical year length depends on *which* cardinal point is used to measure it. At the current epoch (perihelion in early January):

| Cardinal point | Year length | Relative to mean | Reason |
|----------------|-------------|-------------------|--------|
| Summer Solstice | 365.241660 days | −46 s (shortest) | Aphelion nearby → fast orbital speed |
| Vernal Equinox | 365.242077 days | −10 s | Transition |
| Autumnal Equinox | 365.242318 days | +10 s | Transition |
| Winter Solstice | 365.242709 days | +45 s (longest) | Perihelion nearby → slow orbital speed |

This pattern reverses when perihelion precesses to July (~11,680 AD): WS becomes shortest, SS becomes longest. The *mean* of all four cardinal points cancels this effect and gives the true mean tropical year. The Fourier harmonics model this mean directly.

For long-term prediction of individual solstice dates (including the variable-speed effect), see [Solstice Prediction from Fibonacci Harmonics](14-solstice-prediction.md) — a 3-harmonic formula valid across the full 335,008-year Holistic Year.


## Implementation

### JavaScript (`script.js`)

```javascript
// Fourier evaluator (shared by all three year types)
function evalYearFourier(currentYear, mean, harmonics) {
  const t = currentYear - balancedYear;
  let result = mean;
  for (const [div, sinC, cosC] of harmonics) {
    const phase = 2 * Math.PI * t / (holisticyearLength / div);
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}

// Year-length functions
function computeLengthofsolarYear(currentYear) {
  return evalYearFourier(currentYear, meansolaryearlengthinDays, TROPICAL_YEAR_HARMONICS);
}
function computeLengthofsiderealYear(currentYear) {
  return evalYearFourier(currentYear, meansiderealyearlengthinDays, SIDEREAL_YEAR_HARMONICS);
}
function computeLengthofanomalisticYearRealLOD(currentYear, lengthofDay) {
  return evalYearFourier(currentYear, meanAnomalisticYearinDays, ANOMALISTIC_YEAR_HARMONICS) * lengthofDay;
}
```

### Python (`predictive_formula.py`)

```python
def _eval_fourier(t, mean, harmonics):
    result = mean
    for period, sin_c, cos_c in harmonics:
        phase = 2 * math.pi * t / period
        result += sin_c * math.sin(phase) + cos_c * math.cos(phase)
    return result

def calc_solar_year(year):
    return _eval_fourier(year - ANCHOR_YEAR, TROPICAL_YEAR_MEAN, TROPICAL_YEAR_HARMONICS)
```

### Source Files

| File | Role |
|------|------|
| `src/script.js` | Runtime formulas, harmonic coefficients at line ~75 |
| `tools/lib/constants.js` | Optimization tool constants |
| `tools/lib/orbital-engine.js` | Optimization tool year-length functions |
| `docs/scripts/constants_scripts.py` | Single source of truth for Python |
| `docs/scripts/predictive_formula.py` | Python implementation |


## Updating Coefficients

If `H` or `inputmeanlengthsolaryearindays` changes:

1. **Means update automatically** — they are derived formulas, not constants
2. **Harmonic coefficients must be refitted** from model measurement data:
   - Run the model's year-length analysis over ±25,000 years at 100-year steps
   - Export to Excel (491 data points)
   - Fit sin/cos coefficients with means fixed to derived values
   - Update `TROPICAL_YEAR_HARMONICS`, `SIDEREAL_YEAR_HARMONICS`, `ANOMALISTIC_YEAR_HARMONICS` in all source files

Training data: `docs/96_Holistic_year_analysis_491_years.xlsx` (sheet "Detailed")
