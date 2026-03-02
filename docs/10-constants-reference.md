# Constants Reference

This document is the **single source of truth** for all constants used in the Holistic Universe Model simulation. Other documents should reference this document rather than duplicating values.

---

## Fundamental Constants

### The Holistic-Year

| Constant | Value | Description |
|----------|-------|-------------|
| `holisticyearLength` | **333,888** years | The complete Holistic-Year cycle |
| Axial Precession | ~25,684 years | `holisticyearLength / 13` |
| Inclination Precession | 111,296 years | `holisticyearLength / 3` |
| Perihelion Precession | 20,868 years | `holisticyearLength / 16` |

### Time Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `inputmeanlengthsolaryearindays` | 365.2421897 | Input solar year in days |
| `meansolaryearlengthinDays` | 365.2421890 | Mean solar year rounded to HY/16 precision |
| `meansiderealyearlengthinSeconds` | 31,558,149.724 | Mean sidereal year in seconds |
| `meanlengthofday` | ~86,400 | Mean solar day in SI seconds |
| Reference Date | December 14, 1245 AD | Perihelion-solstice alignment |
| J2000 Epoch | January 1, 2000, 12:00 TT | Standard astronomical epoch |

### Physical Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `speedOfLight` | 299,792.458 km/s | Speed of light |
| `currentAUDistance` | 149,597,870.698828 km | Astronomical Unit |
| `GM_SUN` | ~1.327 x 10^11 km^3/s^2 | Solar gravitational parameter (derived) |

---

## Calibration Reference Values (IAU / JPL)

These are the external reference values used to calibrate and validate the model. They are stored in the `ASTRO_REFERENCE` object in `script.js`.

### Obliquity & Inclination (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Obliquity | `obliquityJ2000_arcsec` | 84381.406" (23.439279 deg) | IAU 2006 (Capitaine et al. 2003) |
| Obliquity rate | `obliquityRate_arcsecPerCentury` | -46.836769"/cy | IAU 2006 |
| Earth inclination | `earthInclinationJ2000_deg` | 1.57869 deg | Astronomical Almanac |
| Eccentricity | `eccentricityJ2000` | 0.01671022 | JPL Horizons |
| Long. of perihelion | `perihelionLongitudeJ2000_deg` | 102.947 deg | JPL Horizons |
| Obliquity range | - | ~22.1 deg to ~24.5 deg | Laskar 1993 |

### Year Lengths (J2000)

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

### Day Lengths (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Solar day | `solarDayJ2000` | 86400.0 s | SI definition |
| Sidereal day | `siderealDayJ2000` | 86164.09053083288 s (~23h 56m 4.0905s) | IERS |
| Stellar day | `stellarDayJ2000` | 86164.0989036905 s (~23h 56m 4.0989s) | IERS |

### Precession & Solstice

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| IAU precession period | `iauPrecessionJ2000` | 25,771.57634 years | IAU 2006 |
| June Solstice 2000 JD | `juneSolstice2000_JD` | 2451716.575 | USNO (June 21, 2000 01:48 UTC) |

---

## Earth Parameters

### Orbital Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Base Eccentricity | `eccentricityBase` | 0.015321 | Base orbital eccentricity |
| Eccentricity Amplitude | `eccentricityAmplitude` | 0.0014226 | Oscillation amplitude |
| Semi-major Axis | - | 1 AU | By definition |
| Orbital Period | - | ~365.2422 days | Mean solar year |
| Mid-ecc. Amplitude | `mideccentricitypointAmplitude` | 2.4587 deg | Mid-eccentricity point amplitude (formula only) |
| Helion Point Amplitude | `helionpointAmplitude` | 5.05 deg | Helion point amplitude (formula only) |

### Axial Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mean Obliquity | `earthtiltMean` | 23.41398 deg | Mean axial tilt |
| Obliquity Range | - | 22.15 deg to 24.68 deg | Full oscillation range |
| RA Angle | `earthRAAngle` | 1.258454 | Derived from obliquity cycle position, mean tilt, and inclination amplitude |

### Inclination to Invariable Plane

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mean Inclination | `earthInvPlaneInclinationMean` | 1.481592 deg | Mean orbital inclination |
| Inclination Amplitude | `earthInvPlaneInclinationAmplitude` | 0.633849 deg | Oscillation amplitude |
| Inclination Range | - | ~0.848 deg to ~2.115 deg | Full oscillation range |

### Precession Periods

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Earth Perihelion ICRF | `earthPerihelionICRFYears` | 111,296 years | `holisticyearLength/3` |
| Inclination Phase Angle | `earthInclinationPhaseAngle` | 203.3195 deg | Phase offset for inclination oscillation |

### Model Start & Alignment

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Perihelion Alignment Year | `perihelionalignmentYear` | 1246 AD | Perihelion aligned with December solstice (Meeus) |
| Perihelion Alignment JD | `perihelionalignmentJD` | 2176142 | Same alignment in Julian Day |
| Start Model JD | `startmodelJD` | 2451716.5 | June Solstice 2000 00:00 UTC |
| Start Model Year | `startmodelYear` | 2000.5 | Decimal year of model start |
| Start Angle | `startAngleModel` | 89.91949879 deg | Sun ecliptic longitude at model start (just before 90 deg at 01:47 UTC) |
| Correction Days | `correctionDays` | -0.231598615646362 | Correction for solstice alignment offset |
| Correction Sun | `correctionSun` | 0.277377 deg | Degree correction for solstice at ~01:47 UTC |
| Obliquity Cycle Position | `temperatureGraphMostLikely` | 14.5 | Position (0-16) in the obliquity cycle; 14.5/16 x HY from balanced year |
| Delta-T Start | `deltaTStart` | 63.63 s | Initial Delta-T value (formula only, commented out by default) |

### Year & Day Amplitude Parameters (Formula Only)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Year Amplitude | `meansiderealyearAmplitudeinSecondsaDay` | 3208 s | Sidereal year amplitude per day |
| Solar Year Amplitude | `meansolaryearAmplitudeinSecondsaDay` | 2.29 s | Solar year amplitude per day |
| Anomalistic Year Amplitude | `meanAnomalisticYearAmplitudeinSecondsaDay` | 6 s | Anomalistic year amplitude per day |

---

## Planetary Inclinations to Invariable Plane

### Souami & Souchay (2012) J2000 Values

These are the fixed J2000 reference values from Souami & Souchay (2012):

| Planet | Variable | J2000 Value | Source |
|--------|----------|-------------|--------|
| Mercury | `mercuryInvPlaneInclinationJ2000` | 6.3472858 deg | S&S 2012 |
| Venus | `venusInvPlaneInclinationJ2000` | 2.1545441 deg | S&S 2012 |
| Earth | `earthInvPlaneInclinationJ2000` | 1.57866663 deg | S&S 2012 |
| Mars | `marsInvPlaneInclinationJ2000` | 1.6311858 deg | S&S 2012 |
| Jupiter | `jupiterInvPlaneInclinationJ2000` | 0.3219652 deg | S&S 2012 |
| Saturn | `saturnInvPlaneInclinationJ2000` | 0.9254704 deg | S&S 2012 |
| Uranus | `uranusInvPlaneInclinationJ2000` | 0.9946692 deg | S&S 2012 |
| Neptune | `neptuneInvPlaneInclinationJ2000` | 0.7354155 deg | S&S 2012 |
| Pluto | `plutoInvPlaneInclinationJ2000` | 15.5639473 deg | S&S 2012 (adjusted) |

### Dynamic Inclination Parameters (Fibonacci Laws + Balance)

Amplitudes derived from Fibonacci Laws: `amp = psi / (d x sqrt(m))`, with single universal psi = 2205/(2x333888). Means from J2000 constraint. See [doc 26](26-fibonacci-laws.md), verified by [Appendix E](appendix-e-inclination-optimization.js) and [Appendix F](appendix-f-inclination-verification.js):

| Planet | Mean (deg) | Amplitude (deg) | Range (deg) | Phase Angle | Trend Error |
|--------|----------|---------------|-----------|-------------|-------------|
| Mercury | 6.727893 | 0.385911 | 6.34 - 7.11 | 203.3195 deg (203 deg group) | ~1.6"/cy |
| Venus | 2.207538 | 0.062074 | 2.15 - 2.27 | 203.3195 deg (203 deg group) | ~21.7"/cy |
| Earth | 1.481592 | 0.633849 | 0.85 - 2.12 | 203.3195 deg (203 deg group) | (reference) |
| Mars | 2.653311 | 1.162513 | 1.49 - 3.82 | 203.3195 deg (203 deg group) | ~17.9"/cy |
| Jupiter | 0.329124 | 0.021372 | 0.31 - 0.35 | 203.3195 deg (203 deg group) | ~3.0"/cy |
| Saturn | 0.931699 | 0.065097 | 0.87 - 1.00 | 23.3195 deg (23 deg group, retrograde) | ~5.4"/cy |
| Uranus | 1.000619 | 0.023796 | 0.98 - 1.02 | 203.3195 deg (203 deg group) | ~2.7"/cy |
| Neptune | 0.722146 | 0.013531 | 0.71 - 0.74 | 203.3195 deg (203 deg group) | ~1.7"/cy |
| Pluto | 15.716200 | 0.717024 | 15.00 - 16.43 | 203.3195 deg | ~5.6"/cy |

**Formula**: `i(t) = mean + amplitude x cos(omega(t) - phaseAngle)`

---

## Ascending Nodes on Invariable Plane

### Souami & Souchay (2012) Original Values

| Planet | Variable | Value (deg) | Source |
|--------|----------|-----------|--------|
| Earth | `earthAscendingNodeInvPlaneSouamiSouchay` | 284.51 | S&S 2012 |
| Mercury | `mercuryAscendingNodeInvPlaneSouamiSouchay` | 32.22 | S&S 2012 |
| Venus | `venusAscendingNodeInvPlaneSouamiSouchay` | 52.31 | S&S 2012 |
| Mars | `marsAscendingNodeInvPlaneSouamiSouchay` | 352.95 | S&S 2012 |
| Jupiter | `jupiterAscendingNodeInvPlaneSouamiSouchay` | 306.92 | S&S 2012 |
| Saturn | `saturnAscendingNodeInvPlaneSouamiSouchay` | 122.27 | S&S 2012 |
| Uranus | `uranusAscendingNodeInvPlaneSouamiSouchay` | 308.44 | S&S 2012 |
| Neptune | `neptuneAscendingNodeInvPlaneSouamiSouchay` | 189.28 | S&S 2012 |
| Pluto | `plutoAscendingNodeInvPlaneSouamiSouchay` | 107.06 | S&S 2012 |
| Ceres | `ceresAscendingNodeInvPlaneSouamiSouchay` | 80.89 | S&S 2012 |

### J2000-Verified Ascending Nodes

These values are calibrated to reproduce exact J2000 ecliptic inclinations (optimized by [Appendix A](appendix-a-ascending-node-optimization.js)):

| Planet | Variable | Value (deg) | Delta from S&S |
|--------|----------|-----------|------------|
| Earth | `earthAscendingNodeInvPlaneVerified` | 284.51 | 0.00 deg (S&S 2012) |
| Mercury | `mercuryAscendingNodeInvPlaneVerified` | 32.83 | +0.61 deg |
| Venus | `venusAscendingNodeInvPlaneVerified` | 54.70 | +2.39 deg |
| Mars | `marsAscendingNodeInvPlaneVerified` | 354.87 | +1.92 deg |
| Jupiter | `jupiterAscendingNodeInvPlaneVerified` | 312.89 | +5.97 deg |
| Saturn | `saturnAscendingNodeInvPlaneVerified` | 118.81 | -3.46 deg |
| Uranus | `uranusAscendingNodeInvPlaneVerified` | 307.80 | -0.64 deg |
| Neptune | `neptuneAscendingNodeInvPlaneVerified` | 192.04 | +2.76 deg |
| Pluto | `plutoAscendingNodeInvPlaneVerified` | 101.06 | -6.00 deg |

See [18-j2000-calibration.md](18-j2000-calibration.md) for the methodology.

**Verification**: [Appendix C](appendix-c-ascending-node-verification.js) verifies that these values produce correct J2000 ecliptic inclinations. [Appendix D](appendix-d-ascending-node-souami-souchay.js) compares the error between S&S and Verified values.

---

## Ecliptic Inclinations (J2000)

These are the standard J2000 ecliptic inclinations from JPL:

| Planet | Variable | Value (deg) | Source |
|--------|----------|-----------|--------|
| Mercury | `mercuryEclipticInclinationJ2000` | 7.00497902 | JPL J2000 |
| Venus | `venusEclipticInclinationJ2000` | 3.39467605 | JPL J2000 |
| Mars | `marsEclipticInclinationJ2000` | 1.84969142 | JPL J2000 |
| Jupiter | `jupiterEclipticInclinationJ2000` | 1.30439695 | JPL J2000 |
| Saturn | `saturnEclipticInclinationJ2000` | 2.48599187 | JPL J2000 |
| Uranus | `uranusEclipticInclinationJ2000` | 0.77263783 | JPL J2000 |
| Neptune | `neptuneEclipticInclinationJ2000` | 1.77004347 | JPL J2000 |
| Pluto | `plutoEclipticInclinationJ2000` | 17.14001 | JPL Horizons |
| Moon | `moonEclipticInclinationJ2000` | 5.1453964 | - |

### Ecliptic Inclination Trend Rates (JPL)

These are the observed secular variation rates for ecliptic inclinations:

| Planet | Variable | Rate (deg/century) | Direction | Error vs Model |
|--------|----------|------------------|-----------|----------------|
| Mercury | `mercuryEclipticInclinationTrendJPL` | -0.00595 | Decreasing | 0.5"/cy |
| Venus | `venusEclipticInclinationTrendJPL` | -0.00079 | Decreasing | 21.2"/cy |
| Mars | `marsEclipticInclinationTrendJPL` | -0.00813 | Decreasing | 13.1"/cy |
| Jupiter | `jupiterEclipticInclinationTrendJPL` | -0.00184 | Decreasing | 0.0"/cy |
| Saturn | `saturnEclipticInclinationTrendJPL` | **+0.00194** | **Increasing** | 0.0"/cy |
| Uranus | `uranusEclipticInclinationTrendJPL` | -0.00243 | Decreasing | 1.0"/cy |
| Neptune | `neptuneEclipticInclinationTrendJPL` | **+0.00035** | **Increasing** | 0.2"/cy |
| Pluto | `plutoEclipticInclinationTrendJPL` | -0.00100 | Decreasing | 3.9"/cy |

**Source**: [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)

**Note**: Saturn and Neptune show **increasing** inclinations, which requires retrograde phase (Saturn) or special phase alignment (Neptune). Model errors verified by [Appendix F](appendix-f-inclination-verification.js).

---

## Planetary Orbital Elements (J2000)

### Orbital Period, Eccentricity, and Longitude of Perihelion

| Planet | Period (days) | Eccentricity | Long. Perihelion (deg) | Source |
|--------|--------------|-------------|----------------------|--------|
| Mercury | 87.96845 | 0.20563593 | 77.4569131 | JPL J2000 |
| Venus | 224.6965 | 0.00677672 | 131.5765919 | JPL J2000 |
| Mars | 686.934 | 0.09339410 | 336.0650681 | JPL J2000 |
| Jupiter | 4330.595 | 0.04838624 | 14.70659401 | JPL J2000 |
| Saturn | 10746.6 | 0.05386179 | 92.12794343 | JPL J2000 |
| Uranus | 30583 | 0.04725744 | 170.7308251 | JPL J2000 |
| Neptune | 59896 | 0.00859048 | 45.80124471 | JPL J2000 |

### Angle Correction and Start Position

These values align each planet's perihelion and orbital position to match J2000 observations at the model start date (JD 2451716.5):

| Planet | Variable (correction) | Angle Correction (deg) | Variable (startpos) | Start Position (deg) |
|--------|----------------------|----------------------|--------------------|--------------------|
| Mercury | `mercuryAngleCorrection` | 0.984366 | `mercuryStartpos` | 84.205 |
| Venus | `venusAngleCorrection` | -2.782986 | `venusStartpos` | 249.69 |
| Mars | `marsAngleCorrection` | -2.10564 | `marsStartpos` | 121.512 |
| Jupiter | `jupiterAngleCorrection` | 1.097601 | `jupiterStartpos` | 13.76 |
| Saturn | `saturnAngleCorrection` | -0.175436 | `saturnStartpos` | 11.397 |
| Uranus | `uranusAngleCorrection` | -0.774123 | `uranusStartpos` | 44.71 |
| Neptune | `neptuneAngleCorrection` | 2.400885 | `neptuneStartpos` | 47.95 |

---

## Perihelion Precession Periods (Ecliptic)

| Planet | Variable | Formula | Period (years) |
|--------|----------|---------|----------------|
| Mercury | `mercuryPerihelionEclipticYears` | `holisticyearLength/(1+(3/8))` | ~242,828 |
| Venus | `venusPerihelionEclipticYears` | `holisticyearLength*2` | ~667,776 |
| Earth | `earthPerihelionICRFYears` | `holisticyearLength/3` | 111,296 |
| Mars | `marsPerihelionEclipticYears` | `holisticyearLength/(4+(1/3))` | ~77,051 |
| Jupiter | `jupiterPerihelionEclipticYears` | `holisticyearLength/5` | 66,778 |
| Saturn | `saturnPerihelionEclipticYears` | `-holisticyearLength/8` | -41,736 (retrograde) |
| Uranus | `uranusPerihelionEclipticYears` | `holisticyearLength/3` | 111,296 |
| Neptune | `neptunePerihelionEclipticYears` | `holisticyearLength*2` | ~667,776 |

---

## Ascending Nodes on Ecliptic (J2000)

| Planet | Variable | Value (deg) | Source |
|--------|----------|-----------|--------|
| Mercury | `mercuryAscendingNode` | 48.33033155 | SPICE |
| Venus | `venusAscendingNode` | 76.67877109 | SPICE |
| Mars | `marsAscendingNode` | 49.55737662 | SPICE |
| Jupiter | `jupiterAscendingNode` | 100.4877868 | SPICE |
| Saturn | `saturnAscendingNode` | 113.6452856 | SPICE |
| Uranus | `uranusAscendingNode` | 74.00919023 | SPICE |
| Neptune | `neptuneAscendingNode` | 131.7853754 | SPICE |
| Pluto | `plutoAscendingNode` | 110.30393 | JPL Horizons |

---

## Minor Bodies

### Halley's Comet

| Parameter | Variable | Value | Notes |
|-----------|----------|-------|-------|
| Ecliptic Inclination | `halleysEclipticInclinationJ2000` | 162.26269 deg | Retrograde orbit |
| Inv. Plane Inclination | `halleysInvPlaneInclinationJ2000` | 150 deg | Placeholder |
| Ascending Node (Ecliptic) | `halleysAscendingNode` | 58.42008 deg | JPL Horizons |
| Phase Angle | `halleysInclinationPhaseAngle` | 23 deg | Retrograde |

### Eros

| Parameter | Variable | Value | Notes |
|-----------|----------|-------|-------|
| Ecliptic Inclination | `erosEclipticInclinationJ2000` | 10.82760 deg | JPL Horizons |
| Inv. Plane Inclination | `erosInvPlaneInclinationJ2000` | 9.25 deg | Estimated |
| Ascending Node (Ecliptic) | `erosAscendingNode` | 304.30993 deg | JPL Horizons |

### Ceres

| Parameter | Variable | Value | Notes |
|-----------|----------|-------|-------|
| Ecliptic Inclination | `ceresEclipticInclinationJ2000` | 10.59407 deg | JPL Horizons |
| Inv. Plane Inclination | `ceresInvPlaneInclinationJ2000` | 0.4331698 deg | S&S 2012 |
| Ascending Node (Ecliptic) | `ceresAscendingNode` | 80.30533 deg | JPL Horizons |

---

## Lunar Constants

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Month | `moonSiderealMonthInput` | 27.32166156 days | Return to same star |
| Anomalistic Month | `moonAnomalisticMonthInput` | 27.55454988 days | Perigee to perigee |
| Nodal Month | `moonNodalMonthInput` | 27.21222082 days | Node to node |
| Synodic Month | `moonSynodicMonth` | ~29.53 days | New moon to new moon |
| Mean Distance | `moonDistance` | 384,399.07 km | Mean Earth-Moon distance |
| Orbital Eccentricity | `moonOrbitalEccentricity` | 0.054900489 | |
| Ecliptic Inclination | `moonEclipticInclinationJ2000` | 5.1453964 deg | |
| Nodal Precession | - | ~18.6 years | Period of node regression |
| Apsidal Precession | - | ~8.85 years | Period of apse rotation |
| Start Pos. Apsidal | `moonStartposApsidal` | 330 deg | Aligned with Stellarium data |
| Start Pos. Nodal | `moonStartposNodal` | 64 deg | Aligned to major/minor lunar standstill |
| Start Pos. Moon | `moonStartposMoon` | 132.105 deg | ~21h09m57s at model start JD 2451716.5 |

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
  - Planets: All major planets, Pluto, Halley's Comet, Eros

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

### Model-Specific Values

The following values are derived from the Holistic Universe Model theory:

| Value | Derivation |
|-------|------------|
| Holistic Year (333,888 years) | Model foundation |
| Precession periods (HY/3, HY/5, HY/8, HY/13, HY/16) | Integer divisions of Holistic Year |
| Mean obliquity (23.41398 deg) | Model prediction |
| Eccentricity base (0.015321) / amplitude (0.0014226) | Model prediction |
| Perihelion alignment (1246 AD) | Historical constraint |
| Obliquity cycle position (14.5) | Fitted to climate data |
| All start positions and angle corrections | Fitted to J2000 observations |

---

**Previous**: [Glossary](03-glossary.md)
**Next**: [Orbital Formulas Reference](11-orbital-formulas-reference.md)
