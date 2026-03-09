# Constants Reference

This document is the **single source of truth** for all constants used in the Holistic Universe Model simulation. Other documents should reference this document rather than duplicating values.

> **Last synchronized with `tools/lib/constants.js` on 2026-03-09.**

### How other documents should reference constants

- **Rule A — Formulas stay, computed numbers go.** Write "H/13" not a specific year count.
- **Rule B — Theory-intrinsic integers stay inline.** Fibonacci numbers, cycle counts (13, 3, 16), and ratios are part of the theory.
- **Rule C — Approximate values for readability.** Use "H/13 (~25,770 years; see [Constants Reference](20-constants-reference.md))" when a number aids understanding.
- **Rule D — Tables reference this document.** If a doc repeats planet parameters, add: "For current values see [Constants Reference](20-constants-reference.md)."

---

# Parameter Summary (mirrors 3D scene → About panel)

## Free Parameters (6 DOF)

The six true degrees of freedom that define the model. Everything else is derived or taken from observations.

| # | Parameter | Variable | Value | DOF | Section |
|---|-----------|----------|-------|-----|---------|
| 1 | Holistic-Year | `holisticyearLength` | 335,008 years | 1 | [Part 1 — Holistic-Year](#the-holistic-year-h) |
| 2 | Balanced year | `balancedYear` | −302,355 (derived) | 0 | [Part 2 — Time Constants](#time-constants-from-h) |
| 3 | Fibonacci divisors | — | 3, 5, 8, 13, 21, 34 | 3 | [Part 1 — Fibonacci Divisors](#fibonacci-divisor-assignments) |
| 4 | Mean obliquity | `earthtiltMean` | 23.41357° | 1 | [Part 1 — Earth Orbital](#earth-orbital-parameters) |
| 5 | Inclination amplitude | `earthInvPlaneInclinationAmplitude` | 0.635956° | 1 | [Part 1 — Earth Orbital](#earth-orbital-parameters) |
| 6 | Planet config | Config #32 | Unique mirror-symmetric solution | 0 | [Part 1 — Fibonacci Divisors](#fibonacci-divisor-assignments) |

Total: **6 DOF** (items 2 and 6 are derived/constrained, not independently free).

## Calibration Inputs (28)

Reference values from astronomical observations (IAU, JPL, Meeus) used to anchor the model. All are in [Part 3 — External Reference Values](#part-3--external-reference-values).

| Parameter | Variable | Value |
|-----------|----------|-------|
| Perihelion-solstice alignment | `perihelionalignmentYear` | 1246 AD |
| Long. perihelion (J2000) | `perihelionLongitudeJ2000_deg` | 102.947° |
| Obliquity (J2000) | `obliquityJ2000_arcsec` | 84381.406" (23.439279°) |
| Obliquity rate (J2000) | `obliquityRate_arcsecPerCentury` | −46.836769"/cy |
| Obliquity range | — | ~22.1° to ~24.5° |
| Earth incl. (J2000) | `earthInclinationJ2000_deg` | 1.57869° |
| Eccentricity (J2000) | `eccentricityJ2000` | 0.01671022 |
| Sidereal year (J2000) | `siderealYearJ2000` | 365.256363 days |
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

## Model Parameters

All input constants used by the 3D model, grouped by body. Detailed values in Parts 1–4 below.

| Body | Count | Sections |
|------|-------|----------|
| Earth | 26 | [Part 1](#earth-orbital-parameters), [Part 2](#eccentricity-derived-values), [Part 4](#sun--earth-tuned-parameters) |
| Moon | 9 | [Part 3](#lunar-constants-external), [Part 4](#moon-start-positions-tuned) |
| Mercury | 15 | [Part 2](#planet-inclination-parameters-from-ψ-formula), [Part 3](#planetary-orbital-elements-j2000--longitude-of-perihelion--eccentricity), [Part 4](#planet-angle-corrections--start-positions-tuned) |
| Venus | 15 | same sections as Mercury |
| Mars | 15 | same sections as Mercury |
| Jupiter | 15 | same sections as Mercury |
| Saturn | 15 | same sections as Mercury |
| Uranus | 15 | same sections as Mercury |
| Neptune | 15 | same sections as Mercury |

---

# Part 1 — Foundational Model Constants

These constants define the model. Changing any of them changes the theory.

## The Holistic-Year (H)

| Constant | Variable | Value |
|----------|----------|-------|
| Holistic-Year | `holisticyearLength` (H) | **335,008** years |
| Perihelion alignment year | `perihelionalignmentYear` | 1246 AD |
| Obliquity cycle position | `temperatureGraphMostLikely` | 14.5 (of 16) |

The Holistic-Year is divided by Fibonacci-related integers to produce all Earth precession cycles (see Part 2 — Derived Constants).

## Earth Orbital Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Base Eccentricity | `eccentricityBase` | 0.015373 | Base orbital eccentricity |
| Eccentricity Amplitude | `eccentricityAmplitude` | 0.001370 | Oscillation amplitude |
| Mean Obliquity | `earthtiltMean` | 23.41357 deg | Mean axial tilt |
| RA Angle | `earthRAAngle` | 1.258454 | Derived from obliquity cycle position |
| Mean Inclination (inv. plane) | `earthInvPlaneInclinationMean` | 1.481180 deg | Mean orbital inclination to invariable plane |
| Inclination Amplitude | `earthInvPlaneInclinationAmplitude` | 0.635956 deg | Oscillation amplitude |
| Inclination Phase Angle | `earthInclinationPhaseAngle` | 203.3195 deg | Phase offset for inclination oscillation |

## Fibonacci Divisor Assignments

| Planet | Fibonacci Divisor (d) | Phase Group | Mirror Pair | EoC Type |
|--------|----------------------|-------------|-------------|----------|
| Mercury | 21 | 203 deg | Uranus | I |
| Venus | 34 | 203 deg | Neptune | I |
| Earth | 3 | 203 deg | Saturn | — |
| Mars | 5 | 203 deg | Jupiter | II |
| Jupiter | 5 | 203 deg | Mars | III |
| Saturn | 3 | 23 deg (retrograde) | Earth | III |
| Uranus | 21 | 203 deg | Mercury | III |
| Neptune | 34 | 203 deg | Venus | III |

## Model Start & Alignment

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Start Model JD | `startmodelJD` | 2451716.5 | June Solstice 2000 00:00 UTC |
| Start Model Year | `startmodelYear` | 2000.5 | Decimal year of model start |
| Start Angle | `startAngleModel` | 89.91949879 deg | Sun ecliptic longitude at model start |
| Correction Days | `correctionDays` | -0.23328398168087 | Correction for solstice alignment offset |
| Perihelion Alignment JD | `perihelionalignmentJD` | 2176142 | Perihelion-solstice alignment in JD |

## Physical Constants

| Constant | Variable | Value |
|----------|----------|-------|
| Speed of Light | `speedOfLight` | 299,792.458 km/s |
| Astronomical Unit | `currentAUDistance` | 149,597,870.698828 km |

## Equation of Center Toggle

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Variable Speed | `useVariableSpeed` | true | Enables equation of center (Kepler's 2nd law) |

---

# Part 2 — Derived Constants

These are computed from foundational constants. The formula is the definition; the number is a convenience.

## Precession Periods (from H)

| Cycle | Formula | Period (years) | Direction |
|-------|---------|----------------|-----------|
| Inclination Precession | H / 3 | ~111,669 | Counter-clockwise |
| Ecliptic Precession | H / 5 | 67,002 | Counter-clockwise |
| Obliquity Cycle | H / 8 | 41,876 | Clockwise (negative) |
| Axial Precession | H / 13 | ~25,770 | Clockwise (negative) |
| Perihelion Precession | H / 16 | 20,938 | Both directions |

## Time Constants (from H)

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Mean Solar Year | `meanSolarYearDays` | round(inputMeanSolarYear × H/16) / (H/16) | 365.2421912312542 days |
| Mean Sidereal Year | `meanSiderealYearDays` | meanSolarYearDays × (H/13) / ((H/13) - 1) | 365.2563650204 days |
| Mean Anomalistic Year | `meanAnomalisticYearDays` | meanSolarYearDays / (H/16 - 1) + meanSolarYearDays | 365.2596360510 days |
| Mean Length of Day | `meanLengthOfDay` | meanSiderealYearSeconds / meanSiderealYearDays | ~86,400.0 s |
| Mean Sidereal Day | `meanSiderealDay` | (meanSolarYearDays/(meanSolarYearDays+1)) × meanLengthOfDay | 86,164.0902 s |
| Mean Stellar Day | `meanStellarDay` | (meanSiderealDay/(H/13)) / (meanSolarYearDays+1) + meanSiderealDay | 86,164.0993 s |
| Balanced Year | `balancedYear` | perihelionalignmentYear - (14.5 × H/16) | -302,355 |
| Perihelion Cycle Length | `perihelionCycleLength` | H / 16 | 20,938 years |

Input constants used in the formulas above:

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Input Solar Year | `inputMeanSolarYear` | 365.2421897 days | Input mean solar year (Meeus) |
| Sidereal Year (seconds) | `meanSiderealYearSeconds` | 31,558,149.8 s | Mean sidereal year in seconds |

## Eccentricity Derived Values

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Derived Mean Eccentricity | `eccentricityDerivedMean` | sqrt(base² + amplitude²) | 0.015434 |
| EoC Eccentricity | `eocEccentricity` | derivedMean - base/2 | 0.007747 |
| Perihelion Phase Offset | `perihelionPhaseOffset` | (see constants.js derivation) | ~0.470 deg |
| Perihelion Ref JD | `perihelionRefJD` | — | 2451547.042 |

## Universal Coupling Constant (ψ)

| Constant | Formula | Value |
|----------|---------|-------|
| ψ (psi) | 2205 / (2 × H) = F(5) × F(8)² / (2 × H) | 3.291 × 10⁻³ |

Where F(n) are Fibonacci numbers: F(5) = 5, F(8) = 21.

## Planet Inclination Parameters (from ψ formula)

Amplitudes derived from Fibonacci Laws: `amp = ψ / (d × √m)`. Means from J2000 constraint.
See [Fibonacci Laws](10-fibonacci-laws.md), verified by [Appendix E (84)](84-inclination-optimization.js) and [Appendix F (85)](85-inclination-verification.js).

| Planet | Mean (deg) | Amplitude (deg) | Range (deg) | Phase Angle |
|--------|----------|---------------|-----------|-------------|
| Mercury | 6.726620 | 0.384621 | 6.34 - 7.11 | 203.3195 deg |
| Venus | 2.207361 | 0.061866 | 2.15 - 2.27 | 203.3195 deg |
| Earth | 1.481180 | 0.635956 | 0.85 - 2.12 | 203.3195 deg |
| Mars | 2.649893 | 1.158626 | 1.49 - 3.81 | 203.3195 deg |
| Jupiter | 0.329100 | 0.021301 | 0.31 - 0.35 | 203.3195 deg |
| Saturn | 0.931678 | 0.064879 | 0.87 - 1.00 | 23.3195 deg (retrograde) |
| Uranus | 1.000600 | 0.023716 | 0.98 - 1.02 | 203.3195 deg |
| Neptune | 0.722190 | 0.013486 | 0.71 - 0.74 | 203.3195 deg |
| Pluto | 15.716200 | 0.717024 | 15.00 - 16.43 | 203.3195 deg |

**Formula**: `i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)`

## Perihelion Precession Periods (Ecliptic)

| Planet | Variable | Formula | Period (years) |
|--------|----------|---------|----------------|
| Mercury | `perihelionEclipticYears` | H / (1 + 3/8) | ~243,642 |
| Venus | `perihelionEclipticYears` | H × 2 | ~670,016 |
| Earth | `earthPerihelionICRFYears` | H / 3 | ~111,669 |
| Mars | `perihelionEclipticYears` | H / (4 + 1/3) | ~77,310 |
| Jupiter | `perihelionEclipticYears` | H / 5 | 67,002 |
| Saturn | `perihelionEclipticYears` | -H / 8 | -41,876 (retrograde) |
| Uranus | `perihelionEclipticYears` | H / 3 | ~111,669 |
| Neptune | `perihelionEclipticYears` | H × 2 | ~670,016 |

## Planet Orbital Distances (Kepler's Law from H)

| Planet | Orbit Count in H | Distance (AU) | Speed (km/h) |
|--------|-----------------|---------------|---------------|
| Mercury | 1,390,940 | 0.3871 | 172,341 |
| Venus | 544,556 | 0.7233 | 126,081 |
| Mars | 178,124 | 1.5237 | 86,870 |
| Jupiter | 28,255 | 5.1996 | 47,002 |
| Saturn | 11,385 | 9.5312 | 34,702 |
| Uranus | 4,000 | 19.1424 | 24,518 |
| Neptune | 2,040 | 29.9882 | 19,585 |

## Year & Day Amplitude Parameters (Formula Only)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Year Amplitude | `meanSiderealYearAmplitudeSecPerDay` | 60 s | Sidereal year amplitude per day |
| Solar Year Amplitude | `meanSolarYearAmplitudeSecPerDay` | 2.29 s | Solar year amplitude per day |
| Anomalistic Year Amplitude | `meanAnomalisticYearAmplitudeSecPerDay` | 6 s | Anomalistic year amplitude per day |

## Perihelion Longitude Formula Parameters (Formula Only)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mid-Eccentricity Amplitude | `mideccentricitypointAmplitude` | 2.4587 deg | Amplitude of mid-eccentricity-point variation |
| Helion Point Amplitude | `helionpointAmplitude` | 5.05 deg | Amplitude of perihelion-point variation |

Used by `computeLongitudePerihelion()` to estimate Earth's longitude of perihelion from the balanced year and precession cycle.

## Delta-T

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Initial Delta-T | `deltaTStart` | 63.63 s | Starting Delta-T value at model epoch |

## Earth Perihelion Harmonics

The `PERI_HARMONICS` array models Earth's perihelion longitude with 12 Fourier terms.

| Constant | Value | Description |
|----------|-------|-------------|
| `PERI_HARMONICS` | 12-term array | `[period, sin_coeff, cos_coeff]` per term |
| `PERI_OFFSET` | -0.3071 deg | Global offset correction |

Periods are Fibonacci fractions of H: H/16, H/32, H/48, H/64, H/3, H/8, H/29, H/24, H, H/2, H/40.

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

## Intermediate Derived Constants

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| J2000.0 epoch JD | `j2000JD` | startmodelJD - (startmodelYear - 2000) × meanSolarYearDays | ~2451545.0 |
| Julian century | `julianCenturyDays` | 100 × meanSolarYearDays | ~36,524.22 days |
| Total days in H | `totalDaysInH` | H × meanSolarYearDays | ~122,334,851 days |
| Earth rotations/year | `meanEarthRotationsPerYear` | meanSolarYearDays + 1 | 366.2422 |
| Start year corrected | `startModelYearWithCorrection` | startmodelYear + correctionDays / meanSolarYearDays | ~2000.4994 |
| Years balanced→J2000 | `yearsFromBalancedToJ2000` | (startmodelJD - balancedJD) / meanSolarYearDays | ~302,355 |

---

# Part 3 — External Reference Values

These come from external astronomical sources and do not change with the model.

## Obliquity & Inclination (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Obliquity | `obliquityJ2000_arcsec` | 84381.406" (23.439279 deg) | IAU 2006 (Capitaine et al. 2003) |
| Obliquity rate | `obliquityRate_arcsecPerCentury` | -46.836769"/cy | IAU 2006 |
| Earth inclination | `earthInclinationJ2000_deg` | 1.57869 deg | Astronomical Almanac |
| Earth inclination rate | `earthInclinationRate_arcsecPerCentury` | -18"/cy | Astronomical Almanac |
| Eccentricity | `eccentricityJ2000` | 0.01671022 | JPL Horizons |
| Long. of perihelion | `perihelionLongitudeJ2000_deg` | 102.947 deg | JPL Horizons |
| Perihelion passage J2000 | `perihelionPassageJ2000_JD` | 2451547.042 | USNO (2000 Jan 3 13:00 UTC) |
| Obliquity range | - | ~22.1 deg to ~24.5 deg | Laskar 1993 |

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

## Measurement Offset Corrections (Derived)

These offsets arise from measuring from Earth's precessing position rather than fixed reference points.

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Solar Day Offset | `solarDayOffsetMs` | 86400 / (H/16) / 365.2422 × 1000 | ~11.34 ms/day |
| Yearly accumulation | `solarDayOffsetYearlySeconds` | offset × 365.2422 | ~4.14 s/year |
| Wobble Parallax | `wobbleParallaxSeconds` | (r/D) × (T_sid / T_wobble) × T_sid | ~1.748 s |

**Solar Day Offset**: Perihelion precession causes the measured solar day to be ~11.4 ms short. This accumulates to 1 extra day over one perihelion cycle (H/16).

**Wobble Parallax**: Earth orbits the wobble center (radius = `eccentricityAmplitude` AU), creating a parallax effect when measuring the Sun's position. This adds a constant offset to the sidereal year when measured from Earth.

## Year Lengths (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Tropical year (mean) | `tropicalYearMeanJ2000` | 365.2421897 days | Meeus & Savoie 1992 |
| Tropical year (VE) | `tropicalYearVEJ2000` | 365.242374 days | Meeus & Savoie 1992 |
| Tropical year (SS) | `tropicalYearSSJ2000` | 365.241626 days | Meeus & Savoie 1992 |
| Tropical year (AE) | `tropicalYearAEJ2000` | 365.242018 days | Meeus & Savoie 1992 |
| Tropical year (WS) | `tropicalYearWSJ2000` | 365.242740 days | Meeus & Savoie 1992 |
| Tropical year rate | `tropicalYearRateSecPerCentury` | -0.53 s/cy | Meeus & Savoie 1992 |
| Anomalistic year | `anomalisticYearJ2000` | 365.259636 days | JPL Horizons |
| Sidereal year | `siderealYearJ2000` | 365.256363 days | JPL Horizons |

## Day Lengths (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Solar day | `solarDayJ2000` | 86400.0 s | SI definition |
| Sidereal day | `siderealDayJ2000` | 86164.09053083288 s (~23h 56m 4.0905s) | IERS |
| Stellar day | `stellarDayJ2000` | 86164.0989036905 s (~23h 56m 4.0989s) | IERS |

## Precession & Solstice

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| IAU precession period | `iauPrecessionJ2000` | 25,771.57634 years | IAU 2006 |
| June Solstice 2000 JD | `juneSolstice2000_JD` | 2451716.575 | USNO (June 21, 2000 01:48 UTC) |

## Planetary Inclinations to Invariable Plane — Souami & Souchay (2012)

| Planet | Variable | J2000 Value | Source |
|--------|----------|-------------|--------|
| Mercury | `invPlaneInclinationJ2000` | 6.3472858 deg | S&S 2012 |
| Venus | `invPlaneInclinationJ2000` | 2.1545441 deg | S&S 2012 |
| Earth | `invPlaneInclinationJ2000` | 1.57866663 deg | S&S 2012 |
| Mars | `invPlaneInclinationJ2000` | 1.6311858 deg | S&S 2012 |
| Jupiter | `invPlaneInclinationJ2000` | 0.3219652 deg | S&S 2012 |
| Saturn | `invPlaneInclinationJ2000` | 0.9254704 deg | S&S 2012 |
| Uranus | `invPlaneInclinationJ2000` | 0.9946692 deg | S&S 2012 |
| Neptune | `invPlaneInclinationJ2000` | 0.7354155 deg | S&S 2012 |
| Pluto | `invPlaneInclinationJ2000` | 15.5639473 deg | S&S 2012 (adjusted) |

## Ascending Nodes on Invariable Plane — Souami & Souchay (2012)

| Planet | Variable | Value (deg) | Source |
|--------|----------|-----------|--------|
| Earth | `ascendingNodeInvPlane` (S&S) | 284.51 | S&S 2012 |
| Mercury | `ascendingNodeInvPlane` (S&S) | 32.22 | S&S 2012 |
| Venus | `ascendingNodeInvPlane` (S&S) | 52.31 | S&S 2012 |
| Mars | `ascendingNodeInvPlane` (S&S) | 352.95 | S&S 2012 |
| Jupiter | `ascendingNodeInvPlane` (S&S) | 306.92 | S&S 2012 |
| Saturn | `ascendingNodeInvPlane` (S&S) | 122.27 | S&S 2012 |
| Uranus | `ascendingNodeInvPlane` (S&S) | 308.44 | S&S 2012 |
| Neptune | `ascendingNodeInvPlane` (S&S) | 189.28 | S&S 2012 |
| Pluto | `ascendingNodeInvPlane` (S&S) | 107.06 | S&S 2012 |
| Ceres | `ascendingNodeInvPlane` (S&S) | 80.89 | S&S 2012 |

## Ecliptic Inclinations (J2000)

| Planet | Variable | Value (deg) | Source |
|--------|----------|-----------|--------|
| Mercury | `eclipticInclinationJ2000` | 7.00497902 | JPL J2000 |
| Venus | `eclipticInclinationJ2000` | 3.39467605 | JPL J2000 |
| Mars | `eclipticInclinationJ2000` | 1.84969142 | JPL J2000 |
| Jupiter | `eclipticInclinationJ2000` | 1.30439695 | JPL J2000 |
| Saturn | `eclipticInclinationJ2000` | 2.48599187 | JPL J2000 |
| Uranus | `eclipticInclinationJ2000` | 0.77263783 | JPL J2000 |
| Neptune | `eclipticInclinationJ2000` | 1.77004347 | JPL J2000 |
| Pluto | `eclipticInclinationJ2000` | 17.14001 | JPL Horizons |
| Moon | `eclipticInclinationJ2000` | 5.1453964 | — |

### Ecliptic Inclination Trend Rates (JPL)

| Planet | Variable | Rate (deg/century) | Direction | Error vs Model |
|--------|----------|------------------|-----------|----------------|
| Mercury | `eclipticInclinationTrendJPL` | -0.00595 | Decreasing | 0.5"/cy |
| Venus | `eclipticInclinationTrendJPL` | -0.00079 | Decreasing | 21.2"/cy |
| Mars | `eclipticInclinationTrendJPL` | -0.00813 | Decreasing | 13.1"/cy |
| Jupiter | `eclipticInclinationTrendJPL` | -0.00184 | Decreasing | 0.0"/cy |
| Saturn | `eclipticInclinationTrendJPL` | **+0.00194** | **Increasing** | 0.0"/cy |
| Uranus | `eclipticInclinationTrendJPL` | -0.00243 | Decreasing | 1.0"/cy |
| Neptune | `eclipticInclinationTrendJPL` | **+0.00035** | **Increasing** | 0.2"/cy |
| Pluto | `eclipticInclinationTrendJPL` | -0.00100 | Decreasing | 3.9"/cy |

**Source**: [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)

**Note**: Saturn and Neptune show **increasing** inclinations, which requires retrograde phase (Saturn) or special phase alignment (Neptune). Model errors verified by [Appendix F (85)](85-inclination-verification.js).

## Planetary Orbital Elements (J2000) — Longitude of Perihelion & Eccentricity

| Planet | Eccentricity (J2000) | Long. Perihelion (deg) | Source |
|--------|---------------------|----------------------|--------|
| Mercury | 0.20563593 | 77.4569131 | JPL J2000 |
| Venus | 0.00677672 | 131.5765919 | JPL J2000 |
| Mars | 0.09339410 | 336.0650681 | JPL J2000 |
| Jupiter | 0.04838624 | 14.70659401 | JPL J2000 |
| Saturn | 0.05386179 | 92.12794343 | JPL J2000 |
| Uranus | 0.04725744 | 170.7308251 | JPL J2000 |
| Neptune | 0.00859048 | 45.80124471 | JPL J2000 |

## Ascending Nodes on Ecliptic (J2000)

| Planet | Variable | Value (deg) | Source |
|--------|----------|-----------|--------|
| Mercury | `ascendingNode` | 48.33033155 | SPICE |
| Venus | `ascendingNode` | 76.67877109 | SPICE |
| Mars | `ascendingNode` | 49.55737662 | SPICE |
| Jupiter | `ascendingNode` | 100.4877868 | SPICE |
| Saturn | `ascendingNode` | 113.6452856 | SPICE |
| Uranus | `ascendingNode` | 74.00919023 | SPICE |
| Neptune | `ascendingNode` | 131.7853754 | SPICE |
| Pluto | `ascendingNode` | 110.30393 | JPL Horizons |

## Axial Tilts (J2000)

| Body | Variable | Value (deg) | Source |
|------|----------|-----------|--------|
| Sun | `sunTilt` | 7.155 | IAU |
| Mercury | `mercuryTilt` | 0.03 | IAU |
| Venus | `venusTilt` | 2.6392 | IAU (retrograde rotation) |
| Mars | `marsTilt` | 25.19 | IAU |
| Jupiter | `jupiterTilt` | 3.13 | IAU |
| Saturn | `saturnTilt` | 26.73 | IAU |
| Uranus | `uranusTilt` | 82.23 | IAU (near-sideways) |
| Neptune | `neptuneTilt` | 28.32 | IAU |
| Pluto | `plutoTilt` | 57.47 | IAU |

## Mean & True Anomaly at J2000

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

## Lunar Constants (External)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Month | `moonSiderealMonthInput` | 27.32166156 days | Return to same star |
| Anomalistic Month | `moonAnomalisticMonthInput` | 27.55454988 days | Perigee to perigee |
| Nodal Month | `moonNodalMonthInput` | 27.21222082 days | Node to node |
| Mean Distance | `moonDistance` | 384,399.07 km | Mean Earth-Moon distance |
| Orbital Eccentricity | `moonOrbitalEccentricity` | 0.054900489 | |
| Ecliptic Inclination | `moonEclipticInclinationJ2000` | 5.1453964 deg | |
| Moon Tilt | `moonTilt` | 6.687 deg | |

## Minor Bodies (External)

### Pluto

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Orbital Period | `solarYearInput` | 90,465 days | JPL Horizons |
| Eccentricity | `orbitalEccentricity` | 0.2488273 | JPL Horizons |
| Long. Perihelion | `longitudePerihelion` | 224.06891 deg | JPL Horizons |

### Halley's Comet

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 162.26269 deg | JPL (retrograde orbit) |
| Ascending Node (Ecliptic) | `ascendingNode` | 58.42008 deg | JPL Horizons |
| Orbital Period | `solarYearInput` | 27,503 days | JPL |
| Eccentricity | `orbitalEccentricity` | 0.96714291 | JPL |
| Long. Perihelion | `longitudePerihelion` | 111.33249 deg | JPL Horizons |

### Eros

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 10.82760 deg | JPL Horizons |
| Ascending Node (Ecliptic) | `ascendingNode` | 304.30993 deg | JPL Horizons |
| Orbital Period | `solarYearInput` | 642.93 days | JPL |
| Eccentricity | `orbitalEccentricity` | 0.2229512 | JPL |
| Long. Perihelion | `longitudePerihelion` | 178.81322 deg | JPL Horizons |

### Ceres

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 10.59407 deg | JPL Horizons |
| Inv. Plane Inclination | `invPlaneInclinationJ2000` | 0.4331698 deg | S&S 2012 |
| Ascending Node (Ecliptic) | `ascendingNode` | 80.30533 deg | JPL Horizons |
| Orbital Period | `solarYearInput` | 1,680.5 days | JPL |
| Eccentricity | `orbitalEccentricity` | 0.0755347 | JPL |
| Long. Perihelion | `longitudePerihelion` | 73.59769 deg | JPL Horizons |
| Orbit Distance | `orbitDistanceOverride` | 2.76596 AU | JPL Horizons |

## Lunar Mean Longitude Coefficients (Meeus Ch. 47)

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

---

# Part 4 — Tuned/Optimized Parameters

These values result from the optimization campaign (2025-2026) and may change in future campaigns. For the optimization process and history, see [Optimization Tool Overview](60-optimization-tool-overview.md) and [Optimization Execution Plan](61-optimization-execution-plan.md).

## Sun / Earth Tuned Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Correction Sun | `correctionSun` | 0.471334 deg | Degree correction for Sun position (EoC-enabled) |

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

## Planet Orbital Eccentricities (Tuned)

Outer planets use "dual-balanced" eccentricities optimized for both inclination and eccentricity balance:

| Planet | `orbitalEccentricity` | J2000 Value | Delta | Type |
|--------|----------------------|-------------|-------|------|
| Mercury | 0.20563593 | 0.20563593 | 0% | J2000 |
| Venus | 0.00677672 | 0.00677672 | 0% | J2000 |
| Mars | 0.09339410 | 0.09339410 | 0% | J2000 |
| Jupiter | 0.04823000 | 0.04838624 | -0.32% | Dual-balanced |
| Saturn | 0.05378200 | 0.05386179 | -0.15% | Dual-balanced |
| Uranus | 0.04777200 | 0.04725744 | +1.09% | Dual-balanced |
| Neptune | 0.00846248 | 0.00859048 | -1.49% | Dual-balanced |

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

Calibrated to reproduce exact J2000 ecliptic inclinations (optimized by [Appendix A (80)](80-ascending-node-optimization.js)):

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
**Verification**: [Appendix C (82)](82-ascending-node-verification.js) verifies correct J2000 ecliptic inclinations. [Appendix D (83)](83-ascending-node-souami-souchay.js) compares S&S vs Verified values.

## Planet Perihelion Reference Dates (Phase-Optimized)

| Planet | `perihelionRef_JD` | Notes |
|--------|-------------------|-------|
| Mercury | 2460335.9 | Phase-optimized |
| Venus | 2455464.42 | Re-optimized with 36p correction |
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
| Mercury | 36 | 36 | 72 | Full 36p tier |
| Venus | 36 | 36 | 72 | Full 36p tier |
| Mars | 30 | 30 | 60 | 30p tier |
| Jupiter | 36 | 36 | 72 | Full 36p tier |
| Saturn | 24 | 24 | 48 | 24p tier |
| Uranus | 15 | 15 | 30 | 15p tier |
| Neptune | 18 | 18 | 36 | 18p tier |

Tier selection by per-planet LOOCV/k-fold cross-validation. See [Planet Parallax Corrections](67-planet-parallax-corrections.md).

## Predictive Planet Parameters (`PREDICT_PLANETS`)

Per-planet configuration for the predictive perihelion precession formula:

| Planet | Period Formula | Theta0 (deg) | Baseline (arcsec/cy) |
|--------|---------------|---------------|---------------------|
| Mercury | H × 8/11 | 77.4569131 | 1296000/period×100 |
| Venus | H × 2 | 131.5765919 | 1296000/period×100 |
| Mars | H × 3/13 | 336.0650681 | 1296000/period×100 |
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

7 arrays of 273 trained coefficients each, one per planet. These are the regression weights from the Python training pipeline (`docs/scripts/*_coeffs_unified.py`). The dot product of the 273-term feature vector with the coefficient array gives the geocentric precession fluctuation above/below the heliocentric baseline.

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
