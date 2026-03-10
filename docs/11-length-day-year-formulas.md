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
- The sidereal year exceeds the tropical year by 1 part in `H/13 − 1` (axial precession)
- The anomalistic year exceeds the tropical year by 1 part in `H/16 − 1` (perihelion precession)


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

### Perihelion Precession Effect on Solar Day

RA-based solar day measurements (tracking the Sun's right ascension from Earth's wobble center or Earth's position) show the mean solar day ~8.5 ms shorter than 86,400 s. This is not an error — it is a real effect of perihelion precession (H/16 ≈ 20,938 yr cycle) slowly shifting the RA reference frame. Methods that use a fixed reference frame or derive from the sidereal day correctly yield ~86,400.000 s.

### J2000 Day-Length Values

| Quantity | Model value | IAU reference | Agreement |
|----------|-------------|---------------|-----------|
| Mean solar day | 86400.000 s | 86400.002 s | 2 ms (tidal drift not modelled) |
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


## J2000 Reference Values

| Quantity | Model value | IAU reference |
|----------|-------------|---------------|
| Tropical year | 365.242191 days | 365.242190 days |
| Sidereal year | 365.256363 days | 365.256363 days |
| Anomalistic year | 365.259636 days | 365.259636 days |
| Mean solar day | 86400.000 s | 86400.002 s |
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

### The 11.4ms Solar Day Offset (Perihelion Precession)

RA-based solar day measurements (Methods A and D) consistently show the mean solar day ~11.4 ms shorter than 86,400 s. This accumulates to exactly **one extra day per perihelion cycle**:

```
11.4 ms/day × 365.24 days/year × H/16 years = 86,812 s ≈ 1.005 days
```

Verification from first principles:

```
Total days in one perihelion cycle: (H/16) × 365.242 = 7,622,683 days
One extra day spread over the cycle: 86400 s / 7,622,683 = 11.34 ms/day  ✓
```

This is analogous to how the sidereal year exceeds the tropical year by one day per axial precession cycle — but here it is perihelion precession (not axial precession) creating the effect. The Sun's apparent RA path shifts slightly each year as perihelion drifts, and over one complete H/16 circuit, this accumulates to exactly one extra solar day.

### Cardinal Point Tropical Year Variation

The tropical year length depends on *which* cardinal point is used to measure it. At the current epoch (perihelion in early January):

| Cardinal point | Year length | Relative to mean | Reason |
|----------------|-------------|-------------------|--------|
| Summer Solstice | 365.241926 days | −23 s (shortest) | Aphelion nearby → fast orbital speed |
| Autumnal Equinox | 365.242129 days | −5 s | Transition |
| Vernal Equinox | 365.242250 days | +5 s | Transition |
| Winter Solstice | 365.242449 days | +23 s (longest) | Perihelion nearby → slow orbital speed |

This pattern reverses when perihelion precesses to July (~11,680 AD): WS becomes shortest, SS becomes longest. The *mean* of all four cardinal points cancels this effect and gives the true mean tropical year. The Fourier harmonics model this mean directly.


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
