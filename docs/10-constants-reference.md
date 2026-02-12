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
| `GM_SUN` | ~1.327 × 10¹¹ km³/s² | Solar gravitational parameter (derived) |

---

## Earth Parameters

### Orbital Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Base Eccentricity | `eccentricityBase` | 0.015321 | Base orbital eccentricity |
| Eccentricity Amplitude | `eccentricityAmplitude` | 0.001431 | Oscillation amplitude |
| Semi-major Axis | - | 1 AU | By definition |
| Orbital Period | - | ~365.2422 days | Mean solar year |

### Axial Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mean Obliquity | `earthtiltMean` | 23.41398° | Mean axial tilt |
| Obliquity Range | - | 22.15° to 24.68° | Full oscillation range |

### Inclination to Invariable Plane

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mean Inclination | `earthInvPlaneInclinationMean` | 1.481592° | Mean orbital inclination |
| Inclination Amplitude | `earthInvPlaneInclinationAmplitude` | 0.633849° | Oscillation amplitude |
| Inclination Range | - | ~0.848° to ~2.115° | Full oscillation range |

### Precession Periods

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Earth Perihelion ICRF | `earthPerihelionICRFYears` | 111,296 years | `holisticyearLength/3` |
| Inclination Phase Angle | `earthInclinationPhaseAngle` | 203.3195° | Phase offset for inclination oscillation |

---

## Planetary Inclinations to Invariable Plane

### Souami & Souchay (2012) J2000 Values

These are the fixed J2000 reference values from Souami & Souchay (2012):

| Planet | Variable | J2000 Value | Source |
|--------|----------|-------------|--------|
| Mercury | `mercuryInvPlaneInclinationJ2000` | 6.3472858° | S&S 2012 |
| Venus | `venusInvPlaneInclinationJ2000` | 2.1545441° | S&S 2012 |
| Earth | `earthInvPlaneInclinationJ2000` | 1.57866663° | S&S 2012 |
| Mars | `marsInvPlaneInclinationJ2000` | 1.6311858° | S&S 2012 |
| Jupiter | `jupiterInvPlaneInclinationJ2000` | 0.3219652° | S&S 2012 |
| Saturn | `saturnInvPlaneInclinationJ2000` | 0.9254704° | S&S 2012 |
| Uranus | `uranusInvPlaneInclinationJ2000` | 0.9946692° | S&S 2012 |
| Neptune | `neptuneInvPlaneInclinationJ2000` | 0.7354155° | S&S 2012 |
| Pluto | `plutoInvPlaneInclinationJ2000` | 15.5639473° | S&S 2012 (adjusted) |

### Dynamic Inclination Parameters (Fibonacci Laws + Balance)

Amplitudes derived from Fibonacci Laws: `amp = ψ_g / (d × √m)`, with ψ₃/ψ₁ from invariable plane balance. Means from J2000 constraint. See [doc 26](26-fibonacci-laws.md), verified by [Appendix E](appendix-e-inclination-optimization.js) and [Appendix F](appendix-f-inclination-verification.js):

| Planet | Mean (°) | Amplitude (°) | Range (°) | Phase Angle | Trend Error |
|--------|----------|---------------|-----------|-------------|-------------|
| Mercury | 5.900556 | 0.452956 | 5.45 - 6.35 | 23.3195° (23° group) | ~0.7"/cy |
| Venus | 3.055450 | 1.055261 | 2.00 - 4.11 | 203.3195° (203° group) | ~20"/cy |
| Earth | 1.481592 | 0.633849 | 0.85 - 2.12 | 203.3195° (203° group) | (reference) |
| Mars | 3.596827 | 2.235621 | 1.36 - 5.83 | 203.3195° (203° group) | ~15"/cy |
| Jupiter | 0.342972 | 0.062713 | 0.28 - 0.41 | 203.3195° (203° group) | ~2"/cy |
| Saturn | 0.941281 | 0.165248 | 0.78 - 1.11 | 23.3195° (23° group, retrograde) | ~0.1"/cy |
| Uranus | 0.979050 | 0.062465 | 0.92 - 1.04 | 23.3195° (23° group) | ~3"/cy |
| Neptune | 0.679019 | 0.057508 | 0.62 - 0.74 | 203.3195° (203° group) | ~2"/cy |
| Pluto | 15.716200 | 0.717024 | 15.00 - 16.43 | 203.3195° | ~6"/cy |

**Formula**: `i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)`

---

## Ascending Nodes on Invariable Plane

### Souami & Souchay (2012) Original Values

| Planet | Variable | Value (°) | Source |
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

| Planet | Variable | Value (°) | Δ from S&S |
|--------|----------|-----------|------------|
| Earth | `earthAscendingNodeInvPlaneVerified` | 284.51 | 0.00° (S&S 2012) |
| Mercury | `mercuryAscendingNodeInvPlaneVerified` | 32.83 | +0.61° |
| Venus | `venusAscendingNodeInvPlaneVerified` | 54.70 | +2.39° |
| Mars | `marsAscendingNodeInvPlaneVerified` | 354.87 | +1.92° |
| Jupiter | `jupiterAscendingNodeInvPlaneVerified` | 312.89 | +5.97° |
| Saturn | `saturnAscendingNodeInvPlaneVerified` | 118.81 | -3.46° |
| Uranus | `uranusAscendingNodeInvPlaneVerified` | 307.80 | -0.64° |
| Neptune | `neptuneAscendingNodeInvPlaneVerified` | 192.04 | +2.76° |
| Pluto | `plutoAscendingNodeInvPlaneVerified` | 101.06 | -6.00° |

See [18-j2000-calibration.md](18-j2000-calibration.md) for the methodology.

**Verification**: [Appendix C](appendix-c-ascending-node-verification.js) verifies that these values produce correct J2000 ecliptic inclinations. [Appendix D](appendix-d-ascending-node-souami-souchay.js) compares the error between S&S and Verified values.

---

## Ecliptic Inclinations (J2000)

These are the standard J2000 ecliptic inclinations from JPL:

| Planet | Variable | Value (°) | Source |
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

| Planet | Variable | Rate (°/century) | Direction | Error vs Model |
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

## Perihelion Precession Periods (ICRF)

| Planet | Variable | Formula | Period (years) |
|--------|----------|---------|----------------|
| Mercury | `mercuryPerihelionICRFYears` | `holisticyearLength/(1+(3/8))` | ~242,828 |
| Venus | `venusPerihelionICRFYears` | `holisticyearLength*2` | ~667,776 |
| Earth | `earthPerihelionICRFYears` | `holisticyearLength/3` | 111,296 |
| Mars | `marsPerihelionICRFYears` | `holisticyearLength/(4+(1/3))` | ~77,051 |
| Jupiter | `jupiterPerihelionICRFYears` | `holisticyearLength/5` | 66,778 |
| Saturn | `saturnPerihelionICRFYears` | `-holisticyearLength/8` | -41,736 (retrograde) |
| Uranus | `uranusPerihelionICRFYears` | `holisticyearLength/3` | 111,296 |
| Neptune | `neptunePerihelionICRFYears` | `holisticyearLength*2` | ~667,776 |

---

## Ascending Nodes on Ecliptic (J2000)

| Planet | Variable | Value (°) | Source |
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
| Ecliptic Inclination | `halleysEclipticInclinationJ2000` | 162.26269° | Retrograde orbit |
| Inv. Plane Inclination | `halleysInvPlaneInclinationJ2000` | 150° | Placeholder |
| Ascending Node (Ecliptic) | `halleysAscendingNode` | 58.42008° | JPL Horizons |
| Phase Angle | `halleysInclinationPhaseAngle` | 23° | Retrograde |

### Eros

| Parameter | Variable | Value | Notes |
|-----------|----------|-------|-------|
| Ecliptic Inclination | `erosEclipticInclinationJ2000` | 10.82760° | JPL Horizons |
| Inv. Plane Inclination | `erosInvPlaneInclinationJ2000` | 9.25° | Estimated |
| Ascending Node (Ecliptic) | `erosAscendingNode` | 304.30993° | JPL Horizons |

### Ceres

| Parameter | Variable | Value | Notes |
|-----------|----------|-------|-------|
| Ecliptic Inclination | `ceresEclipticInclinationJ2000` | 10.59407° | JPL Horizons |
| Inv. Plane Inclination | `ceresInvPlaneInclinationJ2000` | 0.4331698° | S&S 2012 |
| Ascending Node (Ecliptic) | `ceresAscendingNode` | 80.30533° | JPL Horizons |

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
| Ecliptic Inclination | `moonEclipticInclinationJ2000` | 5.1453964° | |
| Nodal Precession | - | ~18.6 years | Period of node regression |
| Apsidal Precession | - | ~8.85 years | Period of apse rotation |

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
  - Used for: Astronomical Unit definition, epoch definitions
  - J2000 Epoch: January 1, 2000, 12:00 TT (JD 2451545.0)

- **IERS (International Earth Rotation Service)**
  - Used for: Length of day, Earth rotation parameters

### Model-Specific Values

The following values are derived from the Holistic Universe Model theory:

| Value | Derivation |
|-------|------------|
| Holistic Year (333,888 years) | Model foundation |
| Precession periods (HY/3, HY/5, HY/8, HY/13, HY/16) | Integer divisions of Holistic Year |
| Mean obliquity (23.41398°) | Model prediction |
| Eccentricity mean/amplitude | Model prediction |

---

**Previous**: [Glossary](03-glossary.md)
**Next**: [Orbital Formulas Reference](11-orbital-formulas-reference.md)
