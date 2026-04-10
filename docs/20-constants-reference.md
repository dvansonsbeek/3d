# Constants Reference

This document is the **single source of truth** for all constants used in the Holistic Universe Model simulation. Other documents should reference this document rather than duplicating values.

> **Last synchronized with `tools/lib/constants.js` on 2026-03-29.**

### Code organization

Constants in `src/script.js` are organized into 11 numbered sections with sub-headers:

1. Foundational Model Constants — 2. Model Start & Physical Constants — 3. Sun & Moon Input Constants — 4. Planet Input Constants (4a. major planets, 4b. minor bodies, 4c. ascending nodes) — 5. Inclination System (5a–5d) — 6. Predictive Formula System — 7. Body Diameters — 8. Astronomical Reference Values / ASTRO_REFERENCE (8a–8g) — 9. Derived Constants (9a–9e) — 10. Mass Calculations (10a–10b) — 11. Orbital Formulas (11a–11c)

The shared tools module `tools/lib/constants.js` mirrors these with its own 14-section structure.

### How other documents should reference constants

- **Rule A — Formulas stay, computed numbers go.** Write "H/13" not a specific year count.
- **Rule B — Theory-intrinsic integers stay inline.** Fibonacci numbers, cycle counts (13, 3, 16), and ratios are part of the theory.
- **Rule C — Approximate values for readability.** Use "H/13 (~25,794 years; see [Constants Reference](20-constants-reference.md))" when a number aids understanding.
- **Rule D — Tables reference this document.** If a doc repeats planet parameters, add: "For current values see [Constants Reference](20-constants-reference.md)."

---

## Parameter Summary (mirrors 3D scene → About panel)

### Free Parameters (6 DOF)

The six true degrees of freedom that define the model. Everything else is derived or taken from observations.

| # | Parameter | Variable | Value | DOF | Section |
|---|-----------|----------|-------|-----|---------|
| 1 | Holistic-Year | `holisticyearLength` | 335,317 years | 1 | [Part 1 — Holistic-Year](#the-holistic-year-h) |
| 2 | Balanced year | `balancedYear` | −302,635 (derived) | 0 | [Part 2 — Time Constants](#time-constants) |
| 3 | Fibonacci divisors | — | 3, 5, 8, 13, 21, 34 | 3 | [Part 1 — Fibonacci Divisors](#fibonacci-divisor-assignments) |
| 4 | Mean obliquity | `earthtiltMean` | 23.41354° | 1 | [Part 1 — Earth Parameters](#earth-parameters) |
| 5 | Inclination amplitude | `earthInvPlaneInclinationAmplitude` | 0.63603° | 1 | [Part 1 — Earth Parameters](#earth-parameters) |
| 6 | Planet config | Config #1 | Unique mirror-symmetric solution | 0 | [Part 1 — Fibonacci Divisors](#fibonacci-divisor-assignments) |

Total: **6 DOF** (items 2 and 6 are derived/constrained, not independently free).

### Calibration Inputs (28)

Reference values from astronomical observations (IAU, JPL, Meeus) used to anchor the model. All are in [Part 3 — External Reference Values](#part-3--external-reference-values).

| Parameter | Variable | Value |
|-----------|----------|-------|
| Perihelion-solstice alignment | `perihelionalignmentYear` | 1246.03125 AD |
| Long. perihelion (J2000) | `perihelionLongitudeJ2000_deg` | 102.947° |
| Obliquity (J2000) | `obliquityJ2000_arcsec` | 84381.406" (23.439279°) |
| Obliquity rate (J2000) | `obliquityRate_arcsecPerCentury` | −46.836769"/cy |
| Obliquity range | — | ~22.1° to ~24.5° |
| Earth incl. (J2000) | `earthInclinationJ2000_deg` | 1.57869° |
| Eccentricity (J2000) | `eccentricityJ2000` | 0.01671022 |
| Sidereal year (J2000) | `siderealYearJ2000` | 365.25636301 days |
| Tropical year mean (J2000) | `tropicalYearMeanJ2000` | 365.2421897 days |
| Tropical year VE (J2000) | `tropicalYearVEJ2000` | 365.242374 days |
| Tropical year SS (J2000) | `tropicalYearSSJ2000` | 365.241626 days |
| Tropical year AE (J2000) | `tropicalYearAEJ2000` | 365.242018 days |
| Tropical year WS (J2000) | `tropicalYearWSJ2000` | 365.242740 days |
| Anomalistic year (J2000) | `anomalisticYearJ2000` | 365.259636 days |
| Tropical year rate | `tropicalYearRateSecPerCentury` | −0.53 s/cy |
| Axial precession (J2000) | `iauPrecessionJ2000` | 25,771.58 years |
| June Solstice 2000 JD | `juneSolstice2000_JD` | 2451716.575 |
| Solar day (J2000) | `solarDayJ2000` | 86400.0 s |
| Sidereal day (J2000) | `siderealDayJ2000` | 86164.090531 s |
| Stellar day (J2000) | `stellarDayJ2000` | 86164.098904 s |
| Perihelion passage JD | `perihelionPassageJ2000_JD` | 2451547.042 |
| Moon mean anomaly (J2000) | `moonMeanAnomalyJ2000_deg` | 134.9634° |
| Moon mean anomaly rate | `moonMeanAnomalyRate_degPerDay` | 13.06499295°/day |
| Moon elongation (J2000) | `moonMeanElongationJ2000_deg` | 297.8502° |
| Moon elongation rate | `moonMeanElongationRate_degPerDay` | 12.19074912°/day |
| Sun mean anomaly (J2000) | `sunMeanAnomalyJ2000_deg` | 357.5291° |
| Sun mean anomaly rate | `sunMeanAnomalyRate_degPerDay` | 0.98560028°/day |
| Moon arg. latitude (J2000) | `moonArgLatJ2000_deg` | 93.2720993° |

---

# Part 1 — Foundational Model Constants

These constants define the model. Changing any of them changes the theory.

## The Holistic-Year (H)

| Constant | Variable | Value |
|----------|----------|-------|
| Holistic-Year | `holisticyearLength` (H) | **335,317** years |
| Perihelion alignment year | `perihelionalignmentYear` | 1246.03125 AD |
| Obliquity cycle position | `temperatureGraphMostLikely` | 14.5 (of 16) |

The Holistic-Year is divided by Fibonacci-related integers to produce all Earth precession cycles (see [Part 2 — Derived Constants](#part-2--derived-constants)).

## Earth Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Base Eccentricity | `eccentricityBase` | 0.015386 | Base orbital eccentricity (derived from perihelion longitude) |
| Eccentricity Amplitude | `eccentricityAmplitude` | 0.001356 | Oscillation amplitude (derived from base + e(J2000) constraint) |
| Mean Obliquity | `earthtiltMean` | 23.41354 deg | Mean axial tilt (derived from obliquity at J2000) |
| RA Angle | `earthRAAngle` | ~1.254 | **Derived**: `2A − A²/ε` where A = inclination amplitude, ε = earthtiltMean |
| Mean Inclination (inv. plane) | `earthInvPlaneInclinationMean` | 1.48128 deg | Mean orbital inclination to invariable plane (derived) |
| Inclination Amplitude | `earthInvPlaneInclinationAmplitude` | 0.63603 deg | Oscillation amplitude (derived from obliquity rate) |
| Inclination Phase Angle | `earthInclinationPhaseAngle` | 21.77 deg | ICRF perihelion at balanced year (phase offset for inclination oscillation) |
| Perihelion Ref JD | `perihelionRefJD` | 2451547.042 | JD of Earth perihelion 2000 (Jan 3.542) |

## Fibonacci Divisor Assignments

| Planet | Fibonacci Divisor (d) | Phase Group | Mirror Pair | EoC Type |
|--------|----------------------|-------------|-------------|----------|
| Mercury | 21 | In-phase (234.52°) | Uranus | I |
| Venus | 34 | In-phase (259.82°) | Neptune | I |
| Earth | 3 | In-phase (21.77°) | Saturn | — |
| Mars | 5 | In-phase (231.95°) | Jupiter | II |
| Jupiter | 5 | In-phase (291.18°) | Mars | III |
| Saturn | 3 | Anti-phase (120.38°) | Earth | III |
| Uranus | 21 | In-phase (21.33°) | Mercury | III |
| Neptune | 34 | In-phase (174.04°) | Venus | III |

Phase angles re-anchored 2026-04-09 to balanced year n=7 (≈ -2,649,854 BC). See [10-fibonacci-laws.md § Phase Groups](10-fibonacci-laws.md#phase-groups) and [32-inclination-calculations.md § Per-Planet Phase Angles](32-inclination-calculations.md#per-planet-phase-angles).

## Model Start & Alignment

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Start Model JD | `startmodelJD` | 2451716.5 | June Solstice 2000 00:00 UTC |
| Start Model Year | `startmodelYear` | 2000.5 | Decimal year of model start |
| Start Angle | `startAngleModel` | 89.91949879 deg | Sun ecliptic longitude at model start |
| Correction Days | `correctionDays` | -0.8288 | Correction for solstice alignment offset |
| Variable Speed | `useVariableSpeed` | true | Enables equation of center (Kepler's 2nd law) |

## Physical Constants

| Constant | Variable | Value |
|----------|----------|-------|
| Speed of Light | `speedOfLight` | 299,792.458 km/s |
| Astronomical Unit | `currentAUDistance` | 149,597,870.698828 km |
| Mean Sidereal Year | `meanSiderealYearSeconds` | siderealYearJ2000 × 86400 (derived) |
| Gravitational Constant | `G_CONSTANT` | 6.6743 × 10⁻²⁰ km³/(kg·s²) |
| Earth/Moon Mass Ratio | `MASS_RATIO_EARTH_MOON` | 81.3007 |

### DE440 Sun/Planet Mass Ratios

| Planet | `massRatioDE440` (M_Sun / M_Planet) |
|--------|-------------------------------------|
| Mercury | 6,023,625.5 |
| Venus | 408,523.72 |
| Mars | 3,098,703.59 |
| Jupiter | 1,047.348625 |
| Saturn | 3,497.9018 |
| Uranus | 22,902.944 |
| Neptune | 19,412.237 |

---

# Part 2 — Derived Constants

These are computed from foundational constants. The formula is the definition; the number is a convenience.

## Precession Periods (from H)

| Cycle | Formula | Period (years) | Direction |
|-------|---------|----------------|-----------|
| Inclination Precession | H / 3 | ~111,772 | Counter-clockwise |
| Ecliptic Precession | H / 5 | ~67,063 | Counter-clockwise |
| Obliquity Cycle | H / 8 | ~41,915 | Clockwise (negative) |
| Axial Precession | H / 13 | ~25,794 | Clockwise (negative) |
| Perihelion Precession | H / 16 | ~20,957 | Both directions |

## Time Constants

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Mean Solar Year | `meanSolarYearDays` | round(inputMeanSolarYear × H/8) / (H/8) | 365.242203646 days |
| Mean Sidereal Year | `meanSiderealYearDays` | meanSolarYearDays × (H/13) / ((H/13) - 1) | 365.256364374 days |
| Mean Anomalistic Year | `meanAnomalisticYearDays` | meanSolarYearDays / (H/16 - 1) + meanSolarYearDays | 365.259632390 days |
| Mean Length of Day | `meanLengthOfDay` | meanSiderealYearSeconds / meanSiderealYearDays | ~86,400.0 s |
| Mean Sidereal Day | `meanSiderealDay` | (meanSolarYearDays/(meanSolarYearDays+1)) × meanLengthOfDay | 86,164.0902 s |
| Mean Stellar Day | `meanStellarDay` | (meanSiderealDay/(H/13)) / (meanSolarYearDays+1) + meanSiderealDay | 86,164.0993 s |
| Balanced Year | `balancedYear` | perihelionalignmentYear - (14.5 × H/16) | -302,635 |
| Perihelion Alignment JD | `perihelionalignmentJD` | startmodelJD - meanSolarYearDays × (startModelYearWithCorrection - perihelionalignmentYear) | ~2,176,153 |
| Perihelion Cycle Length | `perihelionCycleLength` | H / 16 | ~20,957 years |
| Total Days in H | `totalDaysInH` | H × meanSolarYearDays | ~122,471,920 days |
| J2000.0 epoch JD | `j2000JD` | startmodelJD - (startmodelYear - 2000) × meanSolarYearDays | ~2451545.0 |
| Julian century | `julianCenturyDays` | 36525 (100 × 365.25) | 36,525 days (IAU Julian century) |
| Earth rotations/year | `meanEarthRotationsPerYear` | meanSolarYearDays + 1 | 366.2422 |
| Start year corrected | `startModelYearWithCorrection` | startmodelYear + correctionDays / meanSolarYearDays | ~2000.4977 |
| Years balanced→J2000 | `yearsFromBalancedToJ2000` | (startmodelJD - balancedJD) / meanSolarYearDays | ~302,635 |

Input constants used in the formulas above:

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Input Solar Year | `inputMeanSolarYear` | 365.2422 days | Input mean solar year |
| Sidereal Year (seconds) | `meanSiderealYearSeconds` | siderealYearJ2000 × 86400 | Derived from IAU sidereal year reference |

## Eccentricity Derived Values

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Derived Mean Eccentricity | `eccentricityDerivedMean` | sqrt(base² + amplitude²) | ~0.01545 |
| EoC Eccentricity | `eocEccentricity` | derivedMean - base/2 | ~0.00776 |
| Perihelion Phase Offset | `perihelionPhaseOffset` | (see constants.js derivation) | ~0.481 deg |

## Ascending Node Frame Corrections

When orbital plane tilt is moved from `RealPerihelionAtSun.containerObj` (above annual rotation) to `planet.containerObj` (below), the ascending node direction changes reference frame. These corrections compensate for that shift. **Derived, not tuned.**

| Planet | `ascNodeTiltCorrection` | Formula |
|--------|------------------------|---------|
| Mercury | ~131.67 | 180 - ascendingNode |
| Venus | ~103.32 | 180 - ascendingNode |
| Mars | ~130.44 | 180 - ascendingNode |
| Jupiter | ~27.70 | 2 × startpos |
| Saturn | ~22.64 | 2 × startpos |
| Uranus | ~89.76 | 2 × startpos |
| Neptune | ~95.92 | 2 × startpos |

Type I/II (inner): `180 - ascendingNode` (anti-node direction). Type III (outer): `2 × startpos` (compensates orbital phase in tilt frame).

## Mass Computation & Universal Constants

### Planet Mass Fractions (M_planet / M_Sun)

Non-Earth planets: `massFraction[p] = 1 / massRatioDE440[p]` (the GM chain cancels).

Earth mass is derived from Moon orbital mechanics:
```
GM_Earth_Moon = 4π²·d³ / T²   (d = moonDistance, T = moonSiderealMonth × meanLengthOfDay)
GM_Earth = GM_Earth_Moon × (M_Earth / (M_Earth + M_Moon)) × (meanLengthOfDay / meanSiderealDay)
massFraction.earth = (GM_Earth / G) / M_Sun
```

| Planet | `massFraction` |
|--------|---------------|
| Mercury | 1.660 × 10⁻⁷ |
| Venus | 2.448 × 10⁻⁶ |
| Earth | 3.004 × 10⁻⁶ |
| Mars | 3.227 × 10⁻⁷ |
| Jupiter | 9.548 × 10⁻⁴ |
| Saturn | 2.859 × 10⁻⁴ |
| Uranus | 4.366 × 10⁻⁵ |
| Neptune | 5.151 × 10⁻⁵ |

### Universal Coupling Constant (ψ)

| Constant | Formula | Value |
|----------|---------|-------|
| ψ (psi) | d_E × amp_E × √m_E (from Earth) | 3.307 × 10⁻³ |
| K | e_amp_E × √m_E / (sin(tilt_E) × √d_E) (from Earth) | 3.415 × 10⁻⁶ |

Where F(n) are Fibonacci numbers: F(5) = 5, F(8) = 21.

### J2000 Eccentricities (eccJ2000)

All 8 planets, combining inner planet J2000 values with outer planet pre-dual-balance values:

| Planet | `eccJ2000` | Source |
|--------|-----------|--------|
| Mercury | 0.20563593 | J2000 (same as model) |
| Venus | 0.00677672 | J2000 (same as model) |
| Earth | 0.01671022 | J2000 (from ASTRO_REFERENCE) |
| Mars | 0.09339410 | J2000 (same as model) |
| Jupiter | 0.04838624 | J2000 (base derived from phase) |
| Saturn | 0.05386179 | J2000 (base derived from phase) |
| Uranus | 0.04725744 | J2000 (base derived from phase) |
| Neptune | 0.00859048 | J2000 (base derived from phase) |

## Planet Inclination Parameters (from ψ formula)

Amplitudes derived from Fibonacci Laws: `amp = ψ / (d × √m)`. Means from J2000 constraint.
See [Fibonacci Laws](10-fibonacci-laws.md), verified by [Inclination Optimization](../tools/verify/inclination-optimization.js) and [Inclination Verification](../tools/verify/inclination-verification.js).

| Planet | Mean (deg) | Amplitude (deg) | Range (deg) | Phase Angle | ICRF Period |
|--------|----------|---------------|-----------|-------------|-------------|
| Mercury | 6.701170 | 0.384267 | 6.32 - 7.09 | 234.52° | 8H/93 ≈ 28,844 yr |
| Venus | 2.192804 | 0.061809 | 2.13 - 2.25 | 259.82° | 2H/25 ≈ 26,825 yr |
| Earth | 1.481134 | 0.636032 | 0.85 - 2.12 | 21.77° | H/3 ≈ 111,772 yr |
| Mars | 1.913480 | 1.157559 | 0.76 - 3.07 | 231.95° | 8H/69 ≈ 38,877 yr |
| Jupiter | 0.319566 | 0.021281 | 0.30 - 0.34 | 291.18° | H/8 ≈ 41,915 yr |
| Saturn | 0.982568 | 0.064819 | 0.92 - 1.05 | 120.38° (anti-phase) | H/5 ≈ 67,063 yr |
| Uranus | 1.015064 | 0.023695 | 0.99 - 1.04 | 21.33° | H/16 ≈ 20,957 yr |
| Neptune | 0.743755 | 0.013474 | 0.73 - 0.76 | 174.04° | 2H/25 ≈ 26,825 yr |
| Pluto | 15.716200 | 0.717024 | 15.00 - 16.43 | 203.32° | H/14 ≈ 23,951 yr |

**Formula**: `i(t) = mean + amplitude × cos(ω̃_ICRF(t) - phaseAngle)` (Saturn: sign flipped, anti-phase)

## Planet Orbital Distances & Periods

| Planet | Orbit Count in H | Distance (AU) | Period (years) | Speed (km/h) |
|--------|-----------------|---------------|----------------|---------------|
| Mercury | 1,392,228 | 0.3871 | 0.2409 | 172,341 |
| Venus | 545,059 | 0.7233 | 0.6151 | 126,081 |
| Mars | 178,287 | 1.5237 | 1.8811 | 86,870 |
| Jupiter | 28,282 | 5.1996 | 11.8596 | 47,002 |
| Saturn | 11,396 | 9.5312 | 29.4296 | 34,702 |
| Uranus | 4,004 | 19.1424 | 83.7520 | 24,518 |
| Neptune | 2,042 | 29.9882 | 164.2196 | 19,585 |

## Perihelion Precession Periods (Ecliptic)

| Planet | Formula | Period (years) |
|--------|---------|----------------|
| Mercury | H / (1 + 3/8) | ~243,867 |
| Venus | H × 2 | ~670,634 |
| Earth | H / 16 | ~20,957 |
| Mars | H / (4 + 3/8) | ~76,644 |
| Jupiter | H / 5 | ~67,063 |
| Saturn | -H / 8 | ~-41,915 (retrograde) |
| Uranus | H / 3 | ~111,772 |
| Neptune | H × 2 | ~670,634 |

## Moon Derived Cycles

All Moon cycles are derived from the 3 input months (sidereal, anomalistic, nodal) and H. Integer rounding to `totalDaysInH = H × meanSolarYearDays` ensures exact cycle closure over the Holistic-Year.

| Cycle | Variable | Formula | Value (days) |
|-------|----------|---------|-------------|
| Sidereal Month | `moonSiderealMonth` | totalDaysInH / ceil(totalDaysInH / input) | ~27.3217 |
| Anomalistic Month | `moonAnomalisticMonth` | totalDaysInH / ceil(totalDaysInH / input) | ~27.5545 |
| Nodal Month | `moonNodalMonth` | totalDaysInH / ceil(totalDaysInH / input) | ~27.2122 |
| Synodic Month | `moonSynodicMonth` | (from sidereal count - 1 + 13 - H) | ~29.5306 |
| Tropical Month | `moonTropicalMonth` | (from sidereal count - 1 + 13) | ~27.3216 |

| Cycle | Variable | Value (days) | Value (years) |
|-------|----------|-------------|--------------|
| Apsidal Precession (Earth frame) | `moonApsidalPrecessionDaysEarth` | ~3,232 | ~8.851 |
| Apsidal Precession (ICRF) | `moonApsidalPrecessionDaysICRF` | ~3,233 | ~8.852 |
| Nodal Precession (Earth frame) | `moonNodalPrecessionDaysEarth` | ~6,793 | ~18.600 |
| Nodal Precession (ICRF) | `moonNodalPrecessionDaysICRF` | ~6,798 | ~18.613 |
| Apsidal-Nodal Beat | `moonApsidalMeetsNodalDays` | ~206 | — |
| Lunar Leveling Cycle | `moonLunarLevelingCycleDays` | ~61,250 | ~167.7 |
| Draconic Year (ICRF) | `moonDraconicYearICRF` | ~346.620 | — |
| Draconic Year (Earth frame) | `moonDraconicYearEarth` | ~346.597 | — |
| Full Moon Cycle (Earth frame) | `moonFullMoonCycleEarth` | ~411.78 | — |
| Full Moon Cycle (ICRF) | `moonFullMoonCycleICRF` | ~411.86 | — |

Eclipse cycles (from derived months): Saros = 223 synodic ≈ 6585.32 days, Exeligmos = 3 × Saros, Callippic = 940 synodic ≈ 76 solar years.

## Year-Length Fourier Harmonics

Year-length variations are modelled with Fourier harmonics. The **means are derived** from `inputmeanlengthsolaryearindays` via `round(input × H/8) / (H/8)` and the standard sidereal/anomalistic ratios. Only the harmonic coefficients are fitted (from data spanning full H at stepYears=23 steps).

Each array entry: `[period_divisor, sin_coeff, cos_coeff]` — period = H / divisor.

| Array | Terms | RMS | Dominant term |
|-------|-------|-----|---------------|
| `TROPICAL_YEAR_HARMONICS` | 12 | 0.002 s | H/8 (obliquity) |
| `SIDEREAL_YEAR_HARMONICS` | 5 | 0.001 s | H/8 + H/3 |
| `ANOMALISTIC_YEAR_HARMONICS` | 8 | 0.002 s | H/24 (beat) |

Note: The tropical year at runtime uses `CARDINAL_POINT_HARMONICS` (24 terms per type, derivative-based), not `TROPICAL_YEAR_HARMONICS`. The latter is used by pipeline tools only.

## Earth Perihelion Harmonics

The `PERI_HARMONICS` array models Earth's perihelion longitude with 25 Fourier terms (RMSE 0.0006°, J2000 exact).

| Constant | Value | Description |
|----------|-------|-------------|
| `PERI_HARMONICS` | 25-term array | `[period, sin_coeff, cos_coeff]` per term |
| `PERI_OFFSET` | ~-0.260 deg | Global offset correction (J2000-anchored) |

## Delta-T

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Initial Delta-T | `deltaTStart` | 63.63 s | Starting Delta-T value at model epoch |

## Perihelion Longitude Formula Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mid-Eccentricity Amplitude | `mideccentricitypointAmplitude` | 2.4587 deg | Amplitude of mid-eccentricity-point variation |
| Helion Point Amplitude | `helionpointAmplitude` | 5.05 deg | Amplitude of perihelion-point variation |

Used by `computeLongitudePerihelion()` to estimate Earth's longitude of perihelion from the balanced year and precession cycle.

---

# Part 3 — External Reference Values

These come from external astronomical sources and do not change with the model.

## Earth J2000 Reference Values

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Obliquity | `obliquityJ2000_arcsec` | 84381.406" (23.439279 deg) | IAU 2006 (Capitaine et al. 2003) |
| Obliquity rate | `obliquityRate_arcsecPerCentury` | -46.836769"/cy | IAU 2006 |
| Obliquity range | - | ~22.1 deg to ~24.5 deg | Laskar 1993 |
| Earth inclination | `earthInclinationJ2000_deg` | 1.57869 deg | Astronomical Almanac |
| Earth inclination rate | `earthInclinationRate_arcsecPerCentury` | -18"/cy | Astronomical Almanac |
| Eccentricity | `earthEccentricityJ2000` | 0.01671022 | JPL Horizons |
| Long. of perihelion | `earthPerihelionLongitudeJ2000` | 102.947 deg | JPL Horizons |
| Perihelion passage J2000 | `perihelionRefJD` | 2451547.042 | USNO (2000 Jan 3 13:00 UTC) |
| IAU precession period | `iauPrecessionJ2000` | 25,771.57634 years | IAU 2006 |
| June Solstice 2000 JD | `juneSolstice2000_JD` | 2451716.575 | USNO (June 21, 2000 01:48 UTC) |

## Year & Day Lengths (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Tropical year (mean) | `tropicalYearMeanJ2000` | 365.2421897 days | Meeus & Savoie 1992 |
| Tropical year (VE) | `tropicalYearVEJ2000` | 365.242374 days | Meeus & Savoie 1992 |
| Tropical year (SS) | `tropicalYearSSJ2000` | 365.241626 days | Meeus & Savoie 1992 |
| Tropical year (AE) | `tropicalYearAEJ2000` | 365.242018 days | Meeus & Savoie 1992 |
| Tropical year (WS) | `tropicalYearWSJ2000` | 365.242740 days | Meeus & Savoie 1992 |
| Tropical year rate | `tropicalYearRateSecPerCentury` | -0.53 s/cy | Meeus & Savoie 1992 |
| Anomalistic year | `anomalisticYearJ2000` | 365.259636 days | JPL Horizons |
| Sidereal year | `siderealYearJ2000` | 365.25636301 days | JPL Horizons (adjusted for LOD=86400) |
| Solar day | `solarDayJ2000` | 86400.0 s | SI definition |
| Sidereal day | `siderealDayJ2000` | 86164.09053083288 s (~23h 56m 4.0905s) | IERS |
| Stellar day | `stellarDayJ2000` | 86164.0989036905 s (~23h 56m 4.0989s) | IERS |

## Coin Rotation Offsets (Derived)

These offsets arise from the coin rotation paradox — precessing reference frames cause systematic measurement biases that cancel with multi-angle averaging.

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Perihelion Coin Rotation | `perihelionCoinRotationMs` | meanlengthofday / (H/16) / meansolaryearlengthinDays × 1000 | ~11.34 ms/day |
| Yearly accumulation | `perihelionCoinRotationYearlySeconds` | offset × meansolaryearlengthinDays | ~4.14 s/year |
| Axial Coin Rotation | `axialCoinRotationMs` | meanSiderealday / (H/13) / (meansolaryearlengthinDays + 1) × 1000 | ~9.12 ms/sidereal day |
| Yearly accumulation | `axialCoinRotationYearlySeconds` | offset × (meansolaryearlengthinDays + 1) | ~3.34 s/year |

**Perihelion Coin Rotation**: Theoretical value derived from 1 extra solar day per H/16 cycle.

**Axial Coin Rotation**: Axial precession (H/13) causes the stellar day to exceed the sidereal day by ~9.1 ms. This accumulates to 1 extra sidereal day over one axial precession cycle. See [Year and Day Length Formulas](11-length-day-year-formulas.md) for details.

## Moon Constants (External)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Month | `moonSiderealMonthInput` | 27.32166156 days | Return to same star |
| Anomalistic Month | `moonAnomalisticMonthInput` | 27.55454988 days | Perigee to perigee |
| Nodal Month | `moonNodalMonthInput` | 27.21222082 days | Node to node |
| Mean Distance | `moonDistance` | 384,399.07 km | Mean Earth-Moon distance |
| Orbital Eccentricity | `moonOrbitalEccentricity` | 0.054900489 | |
| Ecliptic Inclination | `moonEclipticInclinationJ2000` | 5.1453964 deg | |
| Moon Tilt | `moonTilt` | 6.687 deg | |

### Lunar Mean Longitude Coefficients (Meeus Ch. 47)

| Constant | Variable | Value |
|----------|----------|-------|
| Moon Mean Anomaly J2000 | `moonMeanAnomalyJ2000_deg` | 134.9634 deg |
| Moon Mean Anomaly Rate | `moonMeanAnomalyRate_degPerDay` | 13.06499295 |
| Moon Mean Elongation J2000 | `moonMeanElongationJ2000_deg` | 297.8502 deg |
| Moon Mean Elongation Rate | `moonMeanElongationRate_degPerDay` | 12.19074912 |
| Moon Mean Elongation J2000 (full) | `moonMeanElongationJ2000Full_deg` | 297.8502042 deg |
| Moon Mean Elongation Rate | `moonMeanElongationRate_degPerCentury` | 445267.1115168 |
| Moon Arg. of Latitude J2000 | `moonArgLatJ2000_deg` | 93.2720993 deg |
| Moon Arg. of Latitude Rate | `moonArgLatRate_degPerCentury` | 483202.0175273 |
| Sun Mean Anomaly J2000 | `sunMeanAnomalyJ2000_deg` | 357.5291 deg |
| Sun Mean Anomaly Rate | `sunMeanAnomalyRate_degPerDay` | 0.98560028 |

The per-day rates are used for EoC phase computation; the per-century rates are used for the Meeus Ch. 47 ecliptic latitude correction (see [Moon Meeus Corrections](66-moon-meeus-corrections.md)).

## Planet J2000 Orbital Elements

### Eccentricities & Longitudes of Perihelion

| Planet | Eccentricity (J2000) | Long. Perihelion (deg) | Source |
|--------|---------------------|----------------------|--------|
| Mercury | 0.20563593 | 77.4569131 | JPL J2000 |
| Venus | 0.00677672 | 131.5765919 | JPL J2000 |
| Mars | 0.09339410 | 336.0650681 | JPL J2000 |
| Jupiter | 0.04838624 | 14.70659401 | JPL J2000 |
| Saturn | 0.05386179 | 92.12794343 | JPL J2000 |
| Uranus | 0.04725744 | 170.7308251 | JPL J2000 |
| Neptune | 0.00859048 | 45.80124471 | JPL J2000 |

### Ecliptic Inclinations & Ascending Nodes

| Planet | Inclination (deg) | Ascending Node (deg) | Source |
|--------|------------------|---------------------|--------|
| Mercury | 7.00497902 | 48.33033155 | JPL/SPICE |
| Venus | 3.39467605 | 76.67877109 | JPL/SPICE |
| Mars | 1.84969142 | 49.55737662 | JPL/SPICE |
| Jupiter | 1.30439695 | 100.4877868 | JPL/SPICE |
| Saturn | 2.48599187 | 113.6452856 | JPL/SPICE |
| Uranus | 0.77263783 | 74.00919023 | JPL/SPICE |
| Neptune | 1.77004347 | 131.7853754 | JPL/SPICE |
| Pluto | 17.14001 | 110.30393 | JPL Horizons |
| Moon | 5.1453964 | — | — |

### Ecliptic Inclination Trend Rates

JPL publishes these trends in the **J2000-fixed** ecliptic frame ("mean ecliptic and equinox of J2000"). The model error column below is the difference between the model's J2000-fixed-frame trend and JPL's catalog value, after the 2026-04-09 audit re-fit `ascendingNodeCyclesIn8H` and the n=7 phase anchor.

| Planet | Rate (deg/century) | Direction | Model Error |
|--------|------------------|-----------|-------------|
| Mercury | -0.00595 | Decreasing | ~0.4"/cy |
| Venus | -0.00079 | Decreasing | ~1.7"/cy |
| Mars | -0.00813 | Decreasing | ~0.4"/cy |
| Jupiter | -0.00184 | Decreasing | ~0.0"/cy |
| Saturn | **+0.00194** | **Increasing** | ~1.7"/cy |
| Uranus | -0.00243 | Decreasing | ~0.1"/cy |
| Neptune | **+0.00035** | **Increasing** | ~0.0"/cy |
| Pluto | -0.00100 | Decreasing | (not fitted) |

**Source**: [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)

**Note**: All 7 fitted planets now match JPL trend direction in the J2000-fixed frame. Total trend error is ~4.3″/century across the 7 planets. See [32-inclination-calculations.md § Two Frames](32-inclination-calculations.md#two-frames--be-careful-which-one-you-mean) for the frame distinction. Model errors verified by [Inclination Verification](../tools/verify/inclination-verification.js).

### Mean & True Anomaly at J2000

| Planet | Mean Anomaly (deg) | True Anomaly (deg) | Source |
|--------|-------------------|-------------------|--------|
| Mercury | 156.6364301 | 164.1669319 | JPL J2000 |
| Venus | 324.9668371 | 324.5198504 | JPL J2000 |
| Mars | 109.2630844 | 118.9501056 | JPL J2000 |
| Jupiter | 32.47179744 | 35.69428061 | JPL J2000 |
| Saturn | 325.663876 | 321.7910116 | JPL J2000 |
| Uranus | 145.7292678 | 148.5142459 | JPL J2000 |
| Neptune | 262.5003424 | 261.2242728 | JPL J2000 |
| Pluto | 15.55009 | 26.31965048 | JPL J2000 |

### Axial Tilts

| Body | Value (deg) | Source |
|------|-----------|--------|
| Sun | 7.155 | IAU |
| Mercury | 0.03 | IAU |
| Venus | 2.6392 | IAU (retrograde rotation) |
| Mars | 25.19 | IAU |
| Jupiter | 3.13 | IAU |
| Saturn | 26.73 | IAU |
| Uranus | 82.23 | IAU (near-sideways) |
| Neptune | 28.32 | IAU |
| Pluto | 57.47 | IAU |

## Invariable Plane — Souami & Souchay (2012)

### Inclinations

| Planet | J2000 Value (deg) | Source |
|--------|------------------|--------|
| Mercury | 6.3472858 | S&S 2012 |
| Venus | 2.1545441 | S&S 2012 |
| Earth | 1.57866663 | S&S 2012 |
| Mars | 1.6311858 | S&S 2012 |
| Jupiter | 0.3219652 | S&S 2012 |
| Saturn | 0.9254704 | S&S 2012 |
| Uranus | 0.9946692 | S&S 2012 |
| Neptune | 0.7354155 | S&S 2012 |
| Pluto | 15.5639473 | S&S 2012 (adjusted) |

### Ascending Nodes (S&S original values)

| Planet | Value (deg) | Source |
|--------|-----------|--------|
| Earth | 284.51 | S&S 2012 |
| Mercury | 32.22 | S&S 2012 |
| Venus | 52.31 | S&S 2012 |
| Mars | 352.95 | S&S 2012 |
| Jupiter | 306.92 | S&S 2012 |
| Saturn | 122.27 | S&S 2012 |
| Uranus | 308.44 | S&S 2012 |
| Neptune | 189.28 | S&S 2012 |
| Pluto | 107.06 | S&S 2012 |
| Ceres | 80.89 | S&S 2012 |

## Perihelion Precession Rates (1900–2100)

Observed linear trend rates from JPL SPICE/WebGeoCalc. These fluctuate over time and are not valid for long-term predictions.

| Planet | Rate (arcsec/cy) | Range | Source |
|--------|-----------------|-------|--------|
| Mercury | ~570–575 | min–max | JPL SPICE |
| Venus | ~0–400 | min–max | JPL SPICE |
| Earth | 1163 | single value | JPL SPICE |
| Mars | ~1550–1650 | min–max | JPL SPICE |
| Jupiter | ~800–1800 | min–max | JPL SPICE |
| Saturn | ~-3400 to -2000 | retrograde | JPL SPICE |
| Uranus | ~1100–1300 | min–max | JPL SPICE |
| Neptune | ~-200 to 200 | min–max | JPL SPICE |

## Laplace-Lagrange Inclination Bounds

Theoretical orbital inclination ranges from secular perturbation theory.

| Planet | Min (deg) | Max (deg) | Source |
|--------|----------|----------|--------|
| Mercury | 4.57 | 9.86 | Farside Table 10.4 |
| Venus | 0.00 | 3.38 | Farside Table 10.4 |
| Earth | 0.00 | 2.95 | Farside Table 10.4 |
| Mars | 0.00 | 5.84 | Farside Table 10.4 |
| Jupiter | 0.241 | 0.489 | Farside Table 10.4 |
| Saturn | 0.797 | 1.02 | Farside Table 10.4 |
| Uranus | 0.902 | 1.11 | Farside Table 10.4 |
| Neptune | 0.554 | 0.800 | Farside Table 10.4 |

**Source**: [Farside physics textbook (Brouwer & van Woerkom)](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html)

### Inclination Phase Angles

Each planet has a per-planet phase angle (ICRF perihelion longitude at one of the eight balanced-year anchors). After the 2026-04-09 audit, the seven fitted planets share anchor n=7 (≈ -2,649,854 BC, the start of the current Grand Holistic Octave); Earth is locked to its IAU-derived n=0 reference.

| Planet | Phase Angle | Anchor | Notes |
|--------|-------------|--------|-------|
| Mercury | 234.52° | n=7 | |
| Venus | 259.82° | n=7 | |
| Earth | 21.77° | n=0 | locked, IAU reference |
| Mars | 231.95° | n=7 | |
| Jupiter | 291.18° | n=7* | |
| Saturn | 120.38° | n=7* | anti-phase |
| Uranus | 21.33° | n=7* | |
| Neptune | 174.04° | n=7 | |
| Pluto | 203.32° | — | not fitted |

\* Jupiter, Saturn, and Uranus have ICRF periods that divide H exactly; their phase at n=7 numerically coincides with their phase at n=0 (and any other anchor).

The eigenmode-cluster claim from earlier model versions (phase angles ≈ Laplace-Lagrange γ₁–γ₈) no longer holds in detail under the n=7 anchor — the alignment was specific to the n=0 phase set. See [10-fibonacci-laws.md § Phase Groups](10-fibonacci-laws.md#phase-groups).

The `EIGENMODE_PHASES` array in `script.js` provides Laplace-Lagrange reference values:

| Value | Label | Source |
|-------|-------|--------|
| 202.8° | γ₈ | Farside Table 10.1 |
| 20.23° | γ₁ | Farside Table 10.1 |
| 255.6° | γ₃ | Farside Table 10.1 |
| 296.9° | γ₄ | Farside Table 10.1 |
| 127.3° | γ₆ | Farside Table 10.1 |
| 315.6° | γ₇ | Farside Table 10.1 |
| 318.3° | γ₂ | Farside Table 10.1 |

f₅ = 0 (invariable plane, no evolution) is excluded — 7 active Laplace-Lagrange modes remain.

## Minor Bodies

### Pluto

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Orbital Period | `solarYearInput` | 90,465 days | JPL Horizons |
| Eccentricity | `orbitalEccentricityBase` | 0.2488273 | JPL Horizons |
| Long. Perihelion | `longitudePerihelion` | 224.06891 deg | JPL Horizons |
| Sun/Pluto Mass Ratio | `MASS_RATIO_SUN_PLUTO` | 136,047,200 | DE440 |
| GM | `GM_PLUTO` | ~975.5 km³/s² | Derived from Charon orbit |

### Halley's Comet

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 162.26269 deg | JPL (retrograde orbit) |
| Ascending Node (Ecliptic) | `ascendingNode` | 58.42008 deg | JPL Horizons |
| Orbital Period | `solarYearInput` | 27,503 days | JPL |
| Eccentricity | `orbitalEccentricityBase` | 0.96714291 | JPL |
| Long. Perihelion | `longitudePerihelion` | 111.33249 deg | JPL Horizons |
| Mass | `M_HALLEYS` | ~2.2 × 10¹⁴ kg | Estimated (~11×8×8 km, ~0.6 g/cm³) |

### Eros

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 10.82760 deg | JPL Horizons |
| Ascending Node (Ecliptic) | `ascendingNode` | 304.30993 deg | JPL Horizons |
| Orbital Period | `solarYearInput` | 642.93 days | JPL |
| Eccentricity | `orbitalEccentricityBase` | 0.2229512 | JPL |
| Long. Perihelion | `longitudePerihelion` | 178.81322 deg | JPL Horizons |
| Mass | `M_EROS` | 6.687 × 10¹⁵ kg | NEAR Shoemaker (2000–2001) |

### Ceres

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 10.59407 deg | JPL Horizons |
| Inv. Plane Inclination | `invPlaneInclinationJ2000` | 0.4331698 deg | S&S 2012 |
| Ascending Node (Ecliptic) | `ascendingNode` | 80.30533 deg | JPL Horizons |
| Orbital Period | `solarYearInput` | 1,680.5 days | JPL |
| Eccentricity | `orbitalEccentricityBase` | 0.0755347 | JPL |
| Long. Perihelion | `longitudePerihelion` | 73.59769 deg | JPL Horizons |
| Orbit Distance | `orbitDistanceOverride` | 2.76596 AU | JPL Horizons |
| GM | `GM_CERES` | 62.6274 km³/s² | Dawn spacecraft (2015–2018) |

---

# Part 4 — Tuned/Optimized Parameters

These values result from the optimization campaign (2025-2026) and may change in future campaigns. For the optimization process and history, see [Optimization Tool Overview](60-optimization-tool-overview.md) and [Optimization Execution Plan](61-optimization-execution-plan.md).

## Sun / Earth Tuned Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Correction Sun | `correctionSun` | 0.49552 deg | Degree correction for Sun position (dynamic EoC); optimizer step 1 |

## Planet Orbital Periods (Tuned)

| Planet | Variable | Value (days) | J2000 Reference (days) |
|--------|----------|-------------|----------------------|
| Mercury | `solarYearInput` | 87.9686 | 87.96845 |
| Venus | `solarYearInput` | 224.695 | 224.6965 |
| Mars | `solarYearInput` | 686.931 | 686.934 |
| Jupiter | `solarYearInput` | 4330.5 | 4330.595 |
| Saturn | `solarYearInput` | 10747.0 | 10746.6 |
| Uranus | `solarYearInput` | 30586 | 30583 |
| Neptune | `solarYearInput` | 59980 | 59896 |

## Planet Orbital Eccentricities (Base)

Base eccentricities represent the long-term oscillation midpoint. They are derived at runtime from the balanced-year phase (same principle as Earth). The eccentricity balance (Law 5) emerges naturally at ~99.9%.

Note: these values are computed at runtime by constants.js — not stored in JSON. The table below shows approximate values for reference.
| Uranus | 0.04735744 | 0.04725744 | +0.21% | Dual-balance optimized |
| Neptune | 0.00860931 | 0.00859048 | +0.22% | Dual-balance optimized |

## Planet Eccentricity Amplitudes & Coupling Constant

Eccentricity oscillation amplitudes from the tilt formula: `e_amp = K × sin(tilt) × √d / (√m × a^(3/2))`. See [doc 35 §4-5](35-tilt-and-definitive-balance-calculations.md).

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Coupling constant K | `eccentricityAmplitudeK` | 3.4149201316e-6 | Universal tilt-eccentricity coupling |

| Planet | `orbitalEccentricityAmplitude` | % of Base | Regime |
|--------|-------------------------------|-----------|--------|
| Mercury | 8.436789e-5 | 0.041% | Tilt-driven (tilt ~0, negligible) |
| Venus | 9.625389e-4 | 15.5% | Tilt-driven |
| Earth | 1.37032e-3 | 8.9% | Tilt-driven |
| Mars | 3.073636e-3 | 3.3% | Tilt-driven |
| Jupiter | 1.149908e-6 | 0.002% | Laplace-Lagrange dominant |
| Saturn | 5.403008e-6 | 0.010% | Laplace-Lagrange dominant |
| Uranus | 2.831008e-5 | 0.060% | Laplace-Lagrange dominant |
| Neptune | 8.098033e-6 | 0.093% | Laplace-Lagrange dominant |

Inner planets (Mercury–Mars): tilt amplitude fully explains the J2000−base difference.
Outer planets (Jupiter–Neptune): tilt amplitude is negligible; J2000−base differences come from Laplace-Lagrange secular eigenmode exchange.

## Planet Eccentricity Phase Constants (J2000)

Phase angles for the eccentricity oscillation are now derived at runtime from the balanced-year phase: `phase = (2000 - balancedYear) / wobblePeriod × 360°`. Earth's phase is independently determined by the Sun optimizer. The phases are no longer stored in JSON — they are computed by constants.js and script.js (section E2d).

## Per-Planet EoC Fractions

The Equation of Center fraction determines how much of a planet's Keplerian variable-speed behavior is captured by the EoC formula vs the geometric offset. See [Equation of Center](65-equation-of-center.md).

| Planet | `eocFraction` | Type | Description |
|--------|--------------|------|-------------|
| Mercury | -0.527 | I | Negative (inferior planet geometry) |
| Venus | 0.436 | I | Below geometric 0.50 |
| Mars | -0.066 | II | Near-zero (Earth-crossing) |
| Jupiter | 0.484 | III | Near geometric prediction of 0.50 |
| Saturn | 0.543 | III | Above 0.50 |
| Uranus | 0.50 | III | Exactly geometric |
| Neptune | 0.50 | III | Exactly geometric |

## Planet Angle Corrections & Start Positions (Tuned)

| Planet | `angleCorrection` (deg) | `startpos` (deg) |
|--------|------------------------|------------------|
| Mercury | 0.971049 | 83.53 |
| Venus | -2.784782 | 249.312 |
| Mars | -2.107087 | 121.47 |
| Jupiter | 0.92974 | 13.85 |
| Saturn | -0.17477 | 11.32 |
| Uranus | -0.733732 | 44.88 |
| Neptune | 2.33091 | 47.96 |

## J2000-Verified Ascending Nodes (Optimized)

Calibrated to reproduce exact J2000 ecliptic inclinations (optimized by [Ascending Node Optimization](../tools/verify/ascending-node-optimization.js)):

| Planet | `ascendingNodeInvPlane` | Delta from S&S |
|--------|------------------------|--------------|
| Earth | 284.51 | 0.00 deg (S&S 2012) |
| Mercury | 32.83 | +0.61 deg |
| Venus | 54.70 | +2.39 deg |
| Mars | 354.87 | +1.92 deg |
| Jupiter | 312.89 | +5.97 deg |
| Saturn | 118.81 | -3.46 deg |
| Uranus | 307.80 | -0.64 deg |
| Neptune | 192.04 | +2.76 deg |
| Pluto | 101.06 | -6.00 deg |

See [34-j2000-calibration.md](34-j2000-calibration.md) for the methodology.
**Verification**: [Ascending Node Verification](../tools/verify/ascending-node-verification.js) verifies correct J2000 ecliptic inclinations. [Ascending Node Souami-Souchay](../tools/verify/ascending-node-souami-souchay.js) compares S&S vs Verified values.

## Planet Perihelion Reference Dates (Phase-Optimized)

| Planet | `perihelionRef_JD` | Notes |
|--------|-------------------|-------|
| Mercury | 2460335.9 | Phase-optimized |
| Venus | 2455464.42 | Re-optimized with 42p correction |
| Mars | 2456505.6 | Re-optimized with Dec correction |
| Jupiter | 2464224.5 | Phase-optimized (-6 deg from 2023-Jan-21) |
| Saturn | 2452875.9 | Phase-optimized (+1 deg from 2003-Jul-26) |
| Uranus | 2439699.8 | Phase-optimized (+5 deg from 1966-May-20) |
| Neptune | 2409432.4 | Phase-optimized (+17 deg from 1876-Aug-27) |

## Moon Start Positions (Tuned)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Apsidal Start | `moonStartposApsidal` | 347.622 deg | Apsidal precession start |
| Nodal Start | `moonStartposNodal` | -83.630 deg | Nodal precession start |
| Moon Start | `moonStartposMoon` | 131.930 deg | Orbital position start |

## Parallax Correction Tiers

Per-planet empirical parallax correction for geocentric RA and Dec. Coefficients stored in `ASTRO_REFERENCE.raCorrection` and `ASTRO_REFERENCE.decCorrection` in `tools/lib/constants.js`.

| Planet | RA Parameters | Dec Parameters | Total | Selection |
|--------|-------------|---------------|-------|-----------|
| Mercury | 42 | 42 | 84 | Full 42p tier |
| Venus | 42 | 42 | 84 | Full 42p tier |
| Mars | 30 | 30 | 60 | 30p tier |
| Jupiter | 42 | 42 | 84 | Full 42p tier |
| Saturn | 36 | 36 | 72 | 36p tier |
| Uranus | 24 | 24 | 48 | 24p tier |
| Neptune | 24 | 24 | 48 | 24p tier |

Tier selection by per-planet LOOCV/k-fold cross-validation. See [Planet Parallax Corrections](67-planet-parallax-corrections.md).

## Predictive Planet Parameters (`PREDICT_PLANETS`)

Per-planet configuration for the predictive perihelion precession formula:

| Planet | Period Formula | Theta0 (deg) | Baseline (arcsec/cy) |
|--------|---------------|---------------|---------------------|
| Mercury | H × 8/11 | 77.4569131 | 1296000/period×100 |
| Venus | H × 2 | 131.5765919 | 1296000/period×100 |
| Mars | H × 8/35 | 336.0650681 | 1296000/period×100 |
| Jupiter | H / 5 | 14.70659401 | 1296000/period×100 |
| Saturn | H / 8 | 92.12794343 | -1296000/period×100 (retrograde) |
| Uranus | H / 3 | 170.7308251 | 1296000/period×100 |
| Neptune | H × 2 | 45.80124471 | 1296000/period×100 |

### Predictive Normalization Constants

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Obliquity mean | `PREDICT_OBLIQ_MEAN` | 23.414 deg | Normalization center for obliquity features |
| Eccentricity base | `PREDICT_ECC_BASE` | 0.015321 | Training normalization (frozen at training-time value) |
| Eccentricity amplitude | `PREDICT_ECC_AMP` | 0.0014226 | Training normalization (frozen at training-time value) |
| Eccentricity mean | `PREDICT_ECC_MEAN` | sqrt(base² + amp²) ≈ 0.01539 | Normalization center |

### Predictive Coefficients (`PREDICT_COEFFS`)

7 arrays of 429 trained coefficients each, one per planet. These are the regression weights from the Python training pipeline (`tools/lib/python/coefficients/*_coeffs_unified.py`). The dot product of the 429-term feature vector with the coefficient array gives the geocentric precession fluctuation above/below the heliocentric baseline.

---

## References

### Primary Source

- **Souami, D. & Souchay, J. (2012)**: "The solar system's invariable plane"
  - Publication: Astronomy & Astrophysics, 543, A133
  - URL: https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html
  - Used for: Invariable plane inclinations and ascending nodes for all planets

### JPL/NASA Data Sources

- **JPL Horizons System**
  - URL: https://ssd.jpl.nasa.gov/horizons/
  - Used for: J2000 ecliptic orbital elements (inclination, eccentricity, ascending node, mean anomaly)

- **JPL Approximate Positions of the Planets**
  - URL: https://ssd.jpl.nasa.gov/planets/approx_pos.html
  - Used for: Longitude of perihelion reference values

- **JPL SPICE Toolkit**
  - URL: https://naif.jpl.nasa.gov/naif/toolkit.html
  - Used for: High-precision ascending node values (preferred over Horizons where available)

### Standard Values

- **IAU (International Astronomical Union)**
  - Used for: Astronomical Unit definition, epoch definitions, obliquity (IAU 2006 precession model)
  - J2000 Epoch: January 1, 2000, 12:00 TT (JD 2451545.0)

- **IERS (International Earth Rotation Service)**
  - Used for: Length of day, Earth rotation parameters, sidereal/stellar day definitions

- **Meeus & Savoie (1992)**
  - Publication: "The history of the tropical year", J. British Astronomical Association, 102(1), 40-42
  - Used for: Cardinal tropical year lengths, tropical year rate

- **USNO (United States Naval Observatory)**
  - Used for: Solstice timing reference (June Solstice 2000 JD)

---

**Previous**: [Glossary](03-glossary.md)
**Next**: [Orbital Formulas Reference](21-orbital-formulas-reference.md)
