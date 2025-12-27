# Orbital Formulas Implementation Proposal

## Overview

This document outlines the available input variables in the solar system simulation and proposes additional astronomical formulas that can be calculated and displayed.

**Last Updated:** December 2024

---

## Part 1: Available Input Variables

### 1.1 Global Constants

#### 1.1.1 Time & Distance Constants

| Variable | Value | Description |
|----------|-------|-------------|
| `holisticyearLength` | 298,176 | Length of Holistic-Year in Earth solar years |
| `meansolaryearlengthinDays` | ~365.2422730 (derived) | Mean solar year in days |
| `meansiderealyearlengthinSeconds` | 31,558,149.6846777 | Mean sidereal year in seconds |
| `meanlengthofday` | ~86,399.566 (derived) | Mean solar day in SI seconds |
| `meanSiderealday` | ~86,163.653 (derived) | Mean sidereal day in SI seconds |
| `meanStellarday` | derived | Mean stellar day in SI seconds |
| `meanAnomalisticYearinDays` | derived | Mean anomalistic year in days |
| `speedofSuninKM` | 107,225.047767317 | Earth's orbital speed around Sun (km/h) |
| `currentAUDistance` / `o.lengthofAU` | 149,597,870.698828 | Astronomical Unit in km (dynamic) |
| `lightYear` | derived (~9.46 × 10¹² km) | Light year in km |

#### 1.1.2 Mathematical Constants

| Variable | Value | Description |
|----------|-------|-------------|
| `DEG2RAD` | π/180 | Degrees to radians conversion |
| `RAD2DEG` | 180/π | Radians to degrees conversion |

#### 1.1.3 Galactic Constants

| Variable | Value | Description |
|----------|-------|-------------|
| `sunOrbitPeriod` | derived | Sun's orbital period around Milky Way (years) |
| `milkywayDistance` | 27,500 | Distance to Milky Way center (light-years) |
| `sunSpeed` | 828,000 | Sun's speed around Milky Way (km/h) |
| `greatattractorDistance` | 200,000,000 | Distance to Great Attractor (light-years) |
| `milkywaySpeed` | 2,160,000 | Milky Way speed toward Great Attractor (km/h) |
| `milkywayOrbitPeriod` | derived | Milky Way orbital period around Great Attractor (years) |

#### 1.1.4 Physical Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `speedOfLight` | 299,792.458 km/s | Speed of light (fundamental constant) ✅ |

#### 1.1.5 Derived Constants (Now Implemented ✅)

| Constant | Value | Implementation | Used By |
|----------|-------|----------------|---------|
| `GM_SUN` | ~1.327 × 10¹¹ km³/s² | ✅ Derived from Kepler's 3rd Law | `OrbitalFormulas.orbitalVelocity`, etc. |

**GM_SUN derivation (implemented at line ~307-310):**
```javascript
// GM = (2π)² × a³ / P²
// Where a = semi-major axis (km), P = orbital period (seconds)
const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(currentAUDistance, 3))
             / Math.pow(meansiderealyearlengthinSeconds, 2);
// Result: ~1.32712 × 10¹¹ km³/s²
```

**Advantages of deriving GM:**
- Self-consistent with simulation's orbital mechanics
- No external constant needed
- Automatically adjusts if AU or year length changes

**Note:** The gravitational constant `G` alone is not needed for orbital mechanics. All velocity, energy, and momentum formulas use the combined `GM` (gravitational parameter), not G and M separately.

### 1.2 Per-Planet Static Constants

For each planet (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Halley's, Eros):

| Variable Pattern | Example (Mercury) | Description |
|------------------|-------------------|-------------|
| `{planet}SolarYearInput` | 87.96813 days | Orbital period input |
| `{planet}OrbitalEccentricity` | 0.20562928 | Eccentricity (e) |
| `{planet}Inclination` | 6.3472858° | Inclination to invariable plane (fixed) |
| `{planet}OrbitalInclination` | 7.00487° | J2000 orbital inclination to ecliptic |
| `{planet}OrbitDistance` | 0.387 AU | Semi-major axis (a) - derived |
| `{planet}PerihelionDistance` | varies | Distance at perihelion |
| `{planet}Speed` | varies km/h | Mean orbital velocity |
| `{planet}SolarYearCount` | derived | Number of orbits in Holistic-Year |
| `{planet}PerihelionICRF` | varies | Perihelion precession period |
| `{planet}PerihelionEclipticYears` | varies | Perihelion precession cycle length against ecliptic |
| `{planet}AngleCorrection` | varies | Alignment correction angle |
| `{planet}Tilt` | 0.034° | Axial tilt |
| `{planet}RotationPeriod` | 1407.6 hours | Sidereal rotation period |
| `{planet}AscendingNodeInvPlaneVerified` | 32.8118° (Mercury) | J2000-calibrated ascending node to invariable plane |
| `{planet}AscendingNodeInvPlaneSouamiSouchay` | 32.22° (Mercury) | Original Souami & Souchay (2012) ascending node |
| `diameters.{planet}Diameter` | 4,879.4 km | Planet diameter |

### 1.3 Per-Planet Live/Dynamic Variables (accessible via `o.`)

#### 1.3.1 Core Orbital Elements

| Variable Pattern | Example | Description | Updates |
|------------------|---------|-------------|---------|
| `o.{planet}Perihelion` | `o.mercuryPerihelion` | Longitude of perihelion (ϖ) | Live |
| `o.{planet}AscendingNode` | `o.mercuryAscendingNode` | Longitude of ascending node on ecliptic (Ω) | Live |
| `o.{planet}DescendingNode` | `o.mercuryDescendingNode` | Longitude of descending node on ecliptic | Live |
| `o.{planet}ArgumentOfPeriapsis` | `o.mercuryArgumentOfPeriapsis` | Argument of periapsis (ω) | Live |
| `o.{planet}MeanAnomaly` | `o.mercuryMeanAnomaly` | Mean Anomaly (M) | Live |
| `o.{planet}TrueAnomaly` | `o.mercuryTrueAnomaly` | True Anomaly (ν) | Live |
| `o.{planet}EccentricAnomaly` | `o.mercuryEccentricAnomaly` | Eccentric Anomaly (E) ✅ NEW | Live |
| `o.{planet}Elongation` | `o.mercuryElongation` | Elongation from Sun (as seen from Earth) | Live |

#### 1.3.2 Invariable Plane Variables (✅ Already Implemented)

| Variable Pattern | Example | Description | Updates |
|------------------|---------|-------------|---------|
| `o.{planet}AscendingNodeInvPlane` | `o.mercuryAscendingNodeInvPlane` | Dynamic ascending node to invariable plane (J2000-verified) | Live |
| `o.{planet}AscendingNodeInvPlaneSouamiSouchay` | `o.mercuryAscendingNodeInvPlaneSouamiSouchay` | Dynamic ascending node (original S&S values) | Live |
| `o.{planet}HeightAboveInvPlane` | `o.mercuryHeightAboveInvPlane` | Current height above/below invariable plane (AU) | Live |
| `o.{planet}AboveInvPlane` | `o.mercuryAboveInvPlane` | Boolean: is planet currently above invariable plane | Live |
| `o.{planet}ApparentInclination` | `o.mercuryApparentInclination` | Dynamic apparent inclination to ecliptic | Live |
| `o.{planet}ApparentInclinationSouamiSouchay` | `o.mercuryApparentInclinationSouamiSouchay` | Apparent inclination using S&S ascending nodes | Live |

#### 1.3.3 Distance Variables (✅ Already Implemented)

| Variable Pattern | Example | Description | Updates |
|------------------|---------|-------------|---------|
| `{planet}.sunDistAU` | `mercury.sunDistAU` | Current heliocentric distance in AU | Live |

### 1.4 Moon-Specific Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `moonSiderealMonthInput` | 27.32166156 days | Sidereal month |
| `moonAnomalisticMonthInput` | 27.55454988 days | Anomalistic month |
| `moonNodalMonthInput` | 27.21222082 days | Nodal/Draconic month |
| `moonSynodicMonth` | derived | Synodic month |
| `moonDistance` | 384,399.07 km | Mean Earth-Moon distance |
| `moonOrbitalInclination` | 5.1453964° | Orbital inclination |
| `moonOrbitalEccentricity` | 0.054900489 | Eccentricity |

### 1.5 Earth-Specific Variables

#### 1.5.1 Static Constants

| Variable | Value | Description |
|----------|-------|-------------|
| `earthtiltMean` | 23.42723° | Mean obliquity |
| `earthinclinationMean` | 1.49514053° | Mean orbital inclination to invariable plane |
| `tiltandinclinationAmplitude` | 0.564° | Amplitude of inclination/obliquity variation |
| `eccentricityMean` | 0.01370018 | Mean eccentricity |
| `eccentricityAmplitude` | 0.00308211 | Earth's eccentricity amplitude |
| `earthPerihelionEclipticYears` | 99,392 (holisticyearLength/3) | Earth's orbital plane precession against ICRF |

#### 1.5.2 Dynamic Orbital Parameters

| Variable | Description |
|----------|-------------|
| `o.inclinationEarth` | Dynamic orbital inclination to invariable plane |
| `o.obliquityEarth` | Dynamic axial tilt (obliquity) |
| `o.eccentricityEarth` | Dynamic orbital eccentricity |
| `o.earthAscendingNodeInvPlane` | Dynamic ascending node to invariable plane |
| `o.earthHeightAboveInvPlane` | Current height above invariable plane (AU) |
| `o.earthAboveInvPlane` | Boolean: is Earth above invariable plane |
| `earthWobbleCenter.sunDistAU` | Current Earth-Sun distance (AU) |

#### 1.5.3 Dynamic Time Variables (Length of Day dependent)

| Variable | Description |
|----------|-------------|
| `o.lengthofDay` | Current solar day length (SI seconds) |
| `o.lengthofsiderealDayRealLOD` | Current sidereal day length (SI seconds) |
| `o.lengthofstellarDayRealLOD` | Current stellar day length (SI seconds) |
| `o.lengthofsolarYear` | Current solar year length (days) |
| `o.lengthofsolarYearSecRealLOD` | Current solar year length (SI seconds) |
| `o.lengthofsiderealYear` | Current sidereal year length (SI seconds) |
| `o.lengthofanomalisticYearRealLOD` | Current anomalistic year length (SI seconds) |
| `o.lengthofAU` | Current length of AU (km) - dynamic |

#### 1.5.4 Dynamic Precession Cycles

| Variable | Description |
|----------|-------------|
| `o.axialPrecessionRealLOD` | Current axial precession cycle (years) |
| `o.inclinationPrecessionRealLOD` | Current inclination precession cycle (years) |
| `o.perihelionPrecessionRealLOD` | Current perihelion precession cycle (years) |
| `o.obliquityPrecessionRealLOD` | Current obliquity precession cycle (years) |
| `o.eclipticPrecessionRealLOD` | Current ecliptic precession cycle (years) |

#### 1.5.5 Perihelion/Aphelion Dates

| Variable | Description |
|----------|-------------|
| `o.longitudePerihelion` | Computed longitude of perihelion |
| `o.longitudePerihelionDatePer` | Approximate date of perihelion |
| `o.longitudePerihelionDateAp` | Approximate date of aphelion |

---

## Part 2: Current Implementation Status

### 2.1 ✅ Already Implemented Formulas

These formulas are already calculated and displayed in the simulation:

| Formula | Symbol | Implementation | Location |
|---------|--------|----------------|----------|
| Mean Anomaly | M | `o.{planet}MeanAnomaly` | `updatePlanetAnomalies()` |
| True Anomaly | ν | `o.{planet}TrueAnomaly` | `updatePlanetAnomalies()` |
| Eccentric Anomaly | E | `o.{planet}EccentricAnomaly` | `updatePlanetAnomalies()` |
| Equation of Center | ν - M | Displayed in planet labels | planetStats |
| Argument of Periapsis | ω | `o.{planet}ArgumentOfPeriapsis` | `updateOrbitOrientations()` |
| Heliocentric Distance | r | `{planet}.sunDistAU` | Real-time 3D position |
| Height Above Invariable Plane | z | `o.{planet}HeightAboveInvPlane` | `updateInvariablePlaneHeights()` |
| Apparent Inclination | i_app | `o.{planet}ApparentInclination` | `updateDynamicInclinations()` |
| Elongation | - | `o.{planet}Elongation` | `updateElongations()` |
| Synodic Period | P_syn | Calculated for Earth-planet pairs | planetStats |
| **Gravitational Parameter** | **GM** | `GM_SUN` (derived constant) | Sun's planetStats |
| **Current Orbital Velocity** | **v** | `OrbitalFormulas.orbitalVelocity()` | All planets' planetStats |
| **Time Since Perihelion** | **t** | `OrbitalFormulas.timeSincePerihelion()` | All planets' planetStats |
| **Time to Next Perihelion** | **t_next** | `OrbitalFormulas.timeToNextPerihelion()` | All planets' planetStats |
| **Perihelion Distance** | **q** | `OrbitalFormulas.perihelionDist()` | All planets' planetStats |
| **Aphelion Distance** | **Q** | `OrbitalFormulas.aphelionDist()` | All planets' planetStats |
| **Flight Path Angle** | **γ** | `OrbitalFormulas.flightPathAngle()` | All planets' planetStats |
| **Radial Velocity** | **vᵣ** | `OrbitalFormulas.radialVelocity()` | All planets' planetStats |
| **Transverse Velocity** | **vₜ** | `OrbitalFormulas.transverseVelocity()` | All planets' planetStats |
| **Mean Motion** | **n** | `OrbitalFormulas.meanMotion()` | All planets' planetStats |
| **Perihelion Velocity** | **vₚ** | `OrbitalFormulas.perihelionVelocity()` | All planets' planetStats |
| **Aphelion Velocity** | **vₐ** | `OrbitalFormulas.aphelionVelocity()` | All planets' planetStats |
| **True Longitude** | **λ** | `OrbitalFormulas.trueLongitude()` | All planets' planetStats |
| **Mean Longitude** | **L** | `OrbitalFormulas.meanLongitude()` | All planets' planetStats |
| **Specific Orbital Energy** | **ε** | `OrbitalFormulas.specificEnergy()` | All planets' planetStats |
| **Specific Angular Momentum** | **h** | `OrbitalFormulas.specificAngularMomentum()` | All planets' planetStats |
| **Semi-minor Axis** | **b** | `OrbitalFormulas.semiMinorAxis()` | All planets' planetStats |
| **Semi-latus Rectum** | **p** | `OrbitalFormulas.semiLatusRectum()` | All planets' planetStats |
| **Focal Distance** | **c** | `OrbitalFormulas.focalDistance()` | All planets' planetStats |
| **Argument of Latitude** | **u** | `OrbitalFormulas.argumentOfLatitude()` | All planets' planetStats |

**Helper Object: `OrbitalFormulas`** - Available for all orbital calculations:
- `eccentricAnomaly(M_deg, e)` - Newton-Raphson solver for Kepler's equation
- `meanMotion(P_days)` - Mean angular motion (°/day)
- `semiMinorAxis(a, e)` - Semi-minor axis calculation
- `perihelionDist(a, e)` / `aphelionDist(a, e)` - Apsidal distances
- `semiLatusRectum(a, e)` / `focalDistance(a, e)` - Geometric parameters
- `heliocentricDist(a, e, nu_deg)` - Distance from orbit equation
- `flightPathAngle(e, nu_deg)` - Flight path angle
- `meanLongitude(M_deg, lonPeri_deg)` / `trueLongitude(nu_deg, lonPeri_deg)` - Longitude calculations
- `argumentOfLatitude(omega_deg, nu_deg)` - Argument of latitude
- `timeSincePerihelion(P_days, M_deg)` / `timeToNextPerihelion(P_days, M_deg)` - Time calculations
- `orbitalVelocity(r_km, a_km)` - Vis-viva equation
- `perihelionVelocity(a_km, e)` / `aphelionVelocity(a_km, e)` - Apsidal velocities
- `radialVelocity(a_km, e, nu_deg)` - Velocity component toward/away from Sun
- `transverseVelocity(a_km, e, nu_deg)` - Velocity component perpendicular to radius
- `specificEnergy(a_km)` / `specificAngularMomentum(a_km, e)` - Energy and momentum

### 2.2 ✅ Recently Implemented (via OrbitalFormulas helper)

All formulas below now have implementations available in the `OrbitalFormulas` object.
They can be called on-demand or wired into the update loop and planetStats as needed.

| Formula | Symbol | Status | Notes |
|---------|--------|--------|-------|
| **Eccentric Anomaly** | **E** | ✅ **DONE** | Calculated in `updatePlanetAnomalies()`, displayed in planetStats |
| **Orbital Velocity** | **v** | ✅ **DONE** | Displayed in all planets' planetStats (vis-viva equation) |
| **Perihelion Distance** | **q** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Aphelion Distance** | **Q** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Flight Path Angle** | **γ** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Mean Motion** | **n** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Semi-minor Axis** | **b** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Semi-latus Rectum** | **p** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Focal Distance** | **c** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Mean Longitude** | **L** | ✅ **DONE** | Displayed in all planets' planetStats |
| **True Longitude** | **λ** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Argument of Latitude** | **u** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Time Since Perihelion** | **t** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Time to Next Perihelion** | **t_next** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Perihelion/Aphelion Velocity** | **v_p, v_a** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Specific Energy** | **ε** | ✅ **DONE** | Displayed in all planets' planetStats |
| **Specific Angular Momentum** | **h** | ✅ **DONE** | Displayed in all planets' planetStats |

**Note:** `GM_SUN` is now derived from Kepler's 3rd Law using existing constants, making all velocity and energy formulas available.

---

## Part 3: Proposed New Formulas

### 3.1 #1 PRIORITY - Eccentric Anomaly (E)

**Why this is the most important missing formula:**

1. **Completes the anomaly chain**: You have M (Mean) and ν (True), but E (Eccentric) bridges them mathematically
2. **Essential for velocity calculations**: The vis-viva equation and velocity decomposition use E
3. **Verifies the M→ν calculation**: The relationship `M → E → ν` can validate your existing True Anomaly
4. **No additional data needed**: You already have M and e (eccentricity) for all planets

**Symbol:** E

**Formula:** Solve Kepler's equation: `M = E - e·sin(E)`

**Solution Method:** Newton-Raphson iteration (cannot be solved algebraically):
```javascript
function solveEccentricAnomaly(M_rad, e, tolerance = 1e-8) {
  let E = M_rad; // Initial guess
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M_rad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}
```

**Physical Meaning:** The angle at the ellipse center from perihelion, projected onto an auxiliary circle. Bridges Mean Anomaly (uniform motion) to True Anomaly (actual position).

**Dependencies:** M (have), e (have)

**Verification:** Once E is calculated, you can verify: `tan(ν/2) = √((1+e)/(1-e)) · tan(E/2)`

---

### 3.2 HIGH PRIORITY - Geometric (No GM Required)

These formulas use only the orbital elements we already have.

#### 3.2.1 Mean Motion (n)

**Symbol:** n
**Formula:** `n = 360° / P` (degrees/day) or `n = 2π / P` (radians/day)
**Physical Meaning:** The constant angular velocity a planet would have if following uniform circular motion.
**Dependencies:** P (have)
**Priority:** ★★★★★ Fundamental rate

---

#### 3.2.2 Semi-minor Axis (b)

**Symbol:** b
**Formula:** `b = a · √(1 - e²)`
**Physical Meaning:** Half-width of the orbital ellipse at its narrowest point.
**Dependencies:** a (have), e (have)
**Priority:** ★★★★☆ Completes ellipse geometry

---

#### 3.2.3 Perihelion Distance (q)

**Symbol:** q
**Formula:** `q = a · (1 - e)`
**Physical Meaning:** Closest approach to the Sun.
**Dependencies:** a (have), e (have)
**Priority:** ★★★★★ Key orbital parameter
**Note:** Partially exists as `{planet}PerihelionDistance` but calculated differently

---

#### 3.2.4 Aphelion Distance (Q)

**Symbol:** Q
**Formula:** `Q = a · (1 + e)`
**Physical Meaning:** Farthest distance from the Sun.
**Dependencies:** a (have), e (have)
**Priority:** ★★★★★ Key orbital parameter

---

#### 3.2.5 Current Heliocentric Distance (r) - Formula Verification

**Symbol:** r
**Formula:** `r = a · (1 - e²) / (1 + e · cos(ν))`
**Alternative:** `r = a · (1 - e · cos(E))`
**Physical Meaning:** Current distance from Sun based on position in orbit.
**Dependencies:** a (have), e (have), ν (have)
**Priority:** ★★★★★ Essential for position
**Note:** ✅ Already implemented as `{planet}.sunDistAU` - can be used to verify formula

---

#### 3.2.6 Semi-latus Rectum (p or ℓ)

**Symbol:** p or ℓ
**Formula:** `p = a · (1 - e²)`
**Physical Meaning:** The orbital radius when ν = 90° (perpendicular to major axis).
**Dependencies:** a (have), e (have)
**Priority:** ★★★☆☆ Useful for orbital equations

---

#### 3.2.7 Focal Distance (c)

**Symbol:** c
**Formula:** `c = a · e`
**Physical Meaning:** Distance from ellipse center to focus (where Sun is located).
**Dependencies:** a (have), e (have)
**Priority:** ★★★☆☆ Ellipse geometry

---

#### 3.2.8 Flight Path Angle (γ)

**Symbol:** γ (gamma)
**Formula:** `tan(γ) = e · sin(ν) / (1 + e · cos(ν))`
**Physical Meaning:** Angle between velocity vector and local horizontal. Zero at perihelion/aphelion, maximum at ν ≈ 90°.
**Dependencies:** e (have), ν (have)
**Priority:** ★★★★☆ Shows velocity direction

---

#### 3.2.9 Mean Longitude (L)

**Symbol:** L
**Formula:** `L = M + ϖ` (mod 360°)
**Physical Meaning:** Angular position from vernal equinox assuming uniform motion.
**Dependencies:** M (have), ϖ (have)
**Priority:** ★★★☆☆ Ephemeris calculations

---

#### 3.2.10 True Longitude (λ)

**Symbol:** λ
**Formula:** `λ = ν + ϖ` (mod 360°)
**Physical Meaning:** Actual angular position from vernal equinox.
**Dependencies:** ν (have), ϖ (have)
**Priority:** ★★★★☆ Actual ecliptic longitude

---

#### 3.2.11 Argument of Latitude (u)

**Symbol:** u
**Formula:** `u = ω + ν`
**Physical Meaning:** Angle in orbital plane from ascending node to planet.
**Dependencies:** ω (have), ν (have)
**Priority:** ★★★☆☆ 3D position reference
**Note:** This is used internally in `updateInvariablePlaneHeights()` but not displayed

---

#### 3.2.12 Time Since Perihelion

**Formula:** `t = P · M / 360°`
**Physical Meaning:** Days elapsed since last perihelion passage.
**Dependencies:** P (have), M (have)
**Priority:** ★★★★☆ Temporal context

---

#### 3.2.13 Time to Next Perihelion

**Formula:** `t_next = P · (360° - M) / 360°`
**Physical Meaning:** Days until next perihelion passage.
**Dependencies:** P (have), M (have)
**Priority:** ★★★★☆ Prediction

---

### 3.3 MEDIUM PRIORITY - Physics (Requires GM Constant)

These require adding the gravitational parameter: `GM_sun = 1.32712440018 × 10²⁰ m³/s²`
Or in convenient units: `GM_sun = 1.327124 × 10¹¹ km³/s²`

#### 3.3.1 Orbital Velocity (Vis-viva Equation)

**Symbol:** v
**Formula:** `v = √(GM · (2/r - 1/a))`
**Physical Meaning:** Instantaneous orbital speed at any distance r.
**Dependencies:** GM (need to add), r (have as sunDistAU), a (have)
**Priority:** ★★★★★ Fundamental dynamics

---

#### 3.3.2 Perihelion Velocity (v_p)

**Symbol:** v_p
**Formula:** `v_p = √(GM · (1 + e) / (a · (1 - e)))`
**Physical Meaning:** Maximum orbital velocity (at closest approach).
**Dependencies:** GM (need), a (have), e (have)
**Priority:** ★★★★☆ Velocity extremum

---

#### 3.3.3 Aphelion Velocity (v_a)

**Symbol:** v_a
**Formula:** `v_a = √(GM · (1 - e) / (a · (1 + e)))`
**Physical Meaning:** Minimum orbital velocity (at farthest distance).
**Dependencies:** GM (need), a (have), e (have)
**Priority:** ★★★★☆ Velocity extremum

---

#### 3.3.4 Specific Angular Momentum (h)

**Symbol:** h
**Formula:** `h = √(GM · a · (1 - e²))`
**Physical Meaning:** Angular momentum per unit mass. Constant throughout orbit (conserved).
**Dependencies:** GM (need), a (have), e (have)
**Priority:** ★★★★☆ Conservation law

---

#### 3.3.5 Specific Orbital Energy (ε)

**Symbol:** ε (epsilon)
**Formula:** `ε = -GM / (2a)`
**Physical Meaning:** Total mechanical energy per unit mass. Negative for bound orbits.
**Dependencies:** GM (need), a (have)
**Priority:** ★★★★★ Conservation law

---

#### 3.3.6 Radial Velocity (v_r)

**Symbol:** v_r
**Formula:** `v_r = √(GM/p) · e · sin(ν)`
**Physical Meaning:** Velocity component toward/away from Sun.
**Dependencies:** GM (need), p (calculable), e (have), ν (have)
**Priority:** ★★★☆☆ Velocity decomposition

---

#### 3.3.7 Transverse Velocity (v_θ)

**Symbol:** v_θ
**Formula:** `v_θ = √(GM/p) · (1 + e · cos(ν))`
**Physical Meaning:** Velocity component perpendicular to radius (tangential).
**Dependencies:** GM (need), p (calculable), e (have), ν (have)
**Priority:** ★★★☆☆ Velocity decomposition

---

#### 3.3.8 Escape Velocity (from Sun at distance r)

**Symbol:** v_esc
**Formula:** `v_esc = √(2GM/r)`
**Physical Meaning:** Minimum velocity to escape Sun's gravity from current position.
**Dependencies:** GM (need), r (have as sunDistAU)
**Priority:** ★★★☆☆ Reference velocity

---

### 3.4 LOWER PRIORITY - Advanced/Specialized

#### 3.4.1 Orbital Period from Kepler's 3rd Law

**Formula:** `P = 2π · √(a³/GM)`
**Note:** We already have P, but this verifies the relationship.

---

#### 3.4.2 Area Sweep Rate (Kepler's 2nd Law)

**Formula:** `dA/dt = h/2 = constant`
**Physical Meaning:** Equal areas in equal times.

---

#### 3.4.3 Synodic Period (between any two planets)

**Formula:** `P_syn = |P₁ · P₂ / (P₁ - P₂)|`
**Note:** ✅ Already calculated for Earth-planet pairs; could generalize to any planet pair.

---

#### 3.4.4 Hill Sphere / Sphere of Influence

**Formula:** `r_Hill ≈ a · (m_planet / (3 · M_sun))^(1/3)`
**Note:** Requires planetary masses.

---

#### 3.4.5 Heliocentric Latitude to Invariable Plane (β)

**Symbol:** β (beta)
**Formula:** `sin(β) = sin(i_inv) · sin(u)` where `u = ω + ν`
**Physical Meaning:** Angular distance above/below the invariable plane.
**Dependencies:** i_inv (have as {planet}Inclination), ω (have), ν (have)
**Priority:** ★★★★☆ 3D position understanding
**Note:** ✅ Partially implemented - used internally to calculate `HeightAboveInvPlane`

---

### 3.5 About Mass Calculations

**Cannot directly calculate planetary mass** from orbital elements alone.

To derive mass, you need:
- **For Sun:** Use any planet's a and P: `M_sun = 4π²a³ / (GP²)`
- **For Earth:** Use Moon's orbital data: `M_earth = 4π²a_moon³ / (GP_moon²)`
- **For other planets:** Need satellite orbital data

**Available for Earth-Moon:**
- `moonDistance` = 384,399.07 km
- `moonSiderealMonth` = 27.32166156 days

This allows: `M_earth ≈ 5.97 × 10²⁴ kg` (can verify against known value)

---

## Part 4: Implementation Approach

### 4.1 Implemented UI: Inline Formulas in planetStats

Formulas are added inline to each planet's existing `planetStats` entries (not in a separate collapsible section). Each formula entry includes:
- **label**: Display name with symbol
- **value**: Calculated value via `OrbitalFormulas` helper with decimal precision
- **hover**: Tooltip explaining the formula

**Placement within planetStats:**

1. **Geometric Parameters** (b, p, c) - Added after Aphelion distance entry
2. **Velocities** (v, vₚ, vₐ, vᵣ, vₜ) - Added after Mean orbital speed entry
3. **Energy & Momentum** (ε, h) - Added after Aphelion velocity entry
4. **Longitudes** (λ, L) - Added after Argument of Periapsis entry
5. **Argument of Latitude** (u) - Added after Mean Longitude entry
6. **Time calculations** - Added after True Anomaly entry
7. **Mean Motion** (n) - Added after orbital period entry

**Units implemented:**
- Velocities: km/s (converted from km/h where needed)
- Distances: AU
- Angles: degrees (°)
- Energy: km²/s²
- Angular Momentum: km²/s

### 4.2 Implementation Phases (All Complete ✅)

#### Phase 1: Core Infrastructure ✅
1. ✅ Derived GM_SUN from Kepler's 3rd Law using existing constants
2. ✅ Created `OrbitalFormulas` helper object with all formula methods
3. ✅ Used inline entries in existing planetStats (no collapsible UI needed)

#### Phase 2: Geometric Formulas (No GM) ✅
1. ✅ Eccentric Anomaly solver (Newton-Raphson) - in `updatePlanetAnomalies()`
2. ✅ Mean Motion (n)
3. ✅ Geometry: b, q, Q, p, c
4. ✅ Angles: γ, L, λ, u
5. ✅ Time calculations (time since/to perihelion)

#### Phase 3: Physics Formulas (With GM) ✅
1. ✅ Vis-viva velocity
2. ✅ Perihelion/Aphelion velocities
3. ✅ Radial/Transverse velocity components
4. ✅ Specific energy and angular momentum

#### Phase 4: Enhancements ✅
1. ✅ Added hover tooltips explaining each formula

### 4.3 Implemented Code Structure

**GM_SUN derived from Kepler's 3rd Law (lines ~307-310):**
```javascript
// Derived from: GM = (2π)² × a³ / P²
// Using Earth's semi-major axis (AU in km) and sidereal year (seconds)
const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(currentAUDistance, 3))
             / Math.pow(meansiderealyearlengthinSeconds, 2);
// Result: ~1.32712 × 10¹¹ km³/s²
```

**OrbitalFormulas helper object (lines ~312-380):**
```javascript
const OrbitalFormulas = {
  eccentricAnomaly: (M_deg, e) => { /* Newton-Raphson solver */ },
  meanMotion: (P_days) => 360 / P_days,
  semiMinorAxis: (a, e) => a * Math.sqrt(1 - e * e),
  perihelionDist: (a, e) => a * (1 - e),
  aphelionDist: (a, e) => a * (1 + e),
  semiLatusRectum: (a, e) => a * (1 - e * e),
  focalDistance: (a, e) => a * e,
  heliocentricDist: (a, e, nu_deg) => { /* orbit equation */ },
  flightPathAngle: (e, nu_deg) => { /* velocity direction */ },
  meanLongitude: (M_deg, lonPeri_deg) => (M_deg + lonPeri_deg + 360) % 360,
  trueLongitude: (nu_deg, lonPeri_deg) => (nu_deg + lonPeri_deg + 360) % 360,
  argumentOfLatitude: (omega_deg, nu_deg) => (omega_deg + nu_deg + 360) % 360,
  timeSincePerihelion: (P_days, M_deg) => P_days * M_deg / 360,
  timeToNextPerihelion: (P_days, M_deg) => P_days * (360 - M_deg) / 360,
  orbitalVelocity: (r_km, a_km) => Math.sqrt(GM_SUN * (2/r_km - 1/a_km)),
  perihelionVelocity: (a_km, e) => Math.sqrt(GM_SUN * (1 + e) / (a_km * (1 - e))),
  aphelionVelocity: (a_km, e) => Math.sqrt(GM_SUN * (1 - e) / (a_km * (1 + e))),
  radialVelocity: (a_km, e, nu_deg) => { /* radial component */ },
  transverseVelocity: (a_km, e, nu_deg) => { /* tangential component */ },
  specificEnergy: (a_km) => -GM_SUN / (2 * a_km),  // Returns km²/s²
  specificAngularMomentum: (a_km, e) => Math.sqrt(GM_SUN * a_km * (1 - e * e))  // Returns km²/s
};
```

**planetStats entry pattern (example for Mercury):**
```javascript
{label : () => `Semi-minor axis (b)`,
 value : [ { v: () => OrbitalFormulas.semiMinorAxis(mercuryOrbitDistance, mercuryOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
 hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`]},
```

### 4.4 Files Modified

1. **script.js** (main file):
   - Added `GM_SUN` derived constant (~line 307-310)
   - Added `OrbitalFormulas` helper object (~line 312-380)
   - Added Eccentric Anomaly calculation to `updatePlanetAnomalies()` for all planets
   - Added formula entries to `planetStats` for all 10 planets (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Halley's, Eros)
   - Each planet has: geometric parameters (b, p, c), velocities (v, vₚ, vₐ, vᵣ, vₜ), energy/momentum (ε, h), longitudes (λ, L, u), time calculations, and mean motion

---

## Part 5: Priority Summary

### Must Have (Phase 1-2)
| Formula | Symbol | Why Essential | Status |
|---------|--------|---------------|--------|
| Eccentric Anomaly | E | Completes M → E → ν chain | ✅ **DONE** |
| Mean Motion | n | Fundamental orbital rate | ✅ Available |
| Heliocentric Distance | r | Current position from Sun | ✅ Implemented |
| Perihelion/Aphelion Distance | q, Q | Orbital extrema | ✅ **DONE** |
| Semi-minor Axis | b | Ellipse geometry | ✅ Available |

### Should Have (Phase 3)
| Formula | Symbol | Why Important | Status |
|---------|--------|---------------|--------|
| Orbital Velocity (vis-viva) | v | Dynamics understanding | ✅ **DONE** |
| Flight Path Angle | γ | Velocity direction | ✅ **DONE** |
| Time since/to Perihelion | t | Temporal context | ✅ **DONE** |
| True/Mean Longitude | λ, L | Ecliptic position | ✅ Available |

### Nice to Have (Phase 4)
| Formula | Symbol | Why Useful | Status |
|---------|--------|------------|--------|
| Specific Energy | ε | Conservation law | ✅ Available |
| Angular Momentum | h | Conservation law | ✅ Available |
| Radial/Transverse Velocity | vᵣ, vₜ | Velocity decomposition | ✅ **DONE** |
| Escape Velocity | v_esc | Reference | ✅ Available |

### Already Implemented ✅
| Formula | Symbol | Location |
|---------|--------|----------|
| Mean Anomaly | M | `o.{planet}MeanAnomaly` |
| True Anomaly | ν | `o.{planet}TrueAnomaly` |
| Eccentric Anomaly | E | `o.{planet}EccentricAnomaly` |
| Equation of Center | ν - M | planetStats display |
| Height Above Inv. Plane | z | `o.{planet}HeightAboveInvPlane` |
| Apparent Inclination | i_app | `o.{planet}ApparentInclination` |
| Ascending Node (Inv. Plane) | Ω_inv | `o.{planet}AscendingNodeInvPlane` |
| Heliocentric Distance | r | `{planet}.sunDistAU` |
| Elongation | - | `o.{planet}Elongation` |
| Gravitational Parameter | GM | `GM_SUN` (derived constant) |
| Current Orbital Velocity | v | `OrbitalFormulas.orbitalVelocity()` |
| Perihelion Distance | q | `OrbitalFormulas.perihelionDist()` |
| Aphelion Distance | Q | `OrbitalFormulas.aphelionDist()` |
| Flight Path Angle | γ | `OrbitalFormulas.flightPathAngle()` |
| Time Since Perihelion | t | `OrbitalFormulas.timeSincePerihelion()` |
| Time to Next Perihelion | t_next | `OrbitalFormulas.timeToNextPerihelion()` |
| Radial Velocity | vᵣ | `OrbitalFormulas.radialVelocity()` |
| Transverse Velocity | vₜ | `OrbitalFormulas.transverseVelocity()` |
| Mean Motion | n | `OrbitalFormulas.meanMotion()` |
| Perihelion Velocity | vₚ | `OrbitalFormulas.perihelionVelocity()` |
| Aphelion Velocity | vₐ | `OrbitalFormulas.aphelionVelocity()` |
| True Longitude | λ | `OrbitalFormulas.trueLongitude()` |
| Mean Longitude | L | `OrbitalFormulas.meanLongitude()` |
| Specific Orbital Energy | ε | `OrbitalFormulas.specificEnergy()` |
| Specific Angular Momentum | h | `OrbitalFormulas.specificAngularMomentum()` |
| Semi-minor Axis | b | `OrbitalFormulas.semiMinorAxis()` |
| Semi-latus Rectum | p | `OrbitalFormulas.semiLatusRectum()` |
| Focal Distance | c | `OrbitalFormulas.focalDistance()` |
| Argument of Latitude | u | `OrbitalFormulas.argumentOfLatitude()` |

---

## Part 6: Part 2 Formulas - Advanced Calculations

### 6.1 Mass Calculations

#### 6.1.1 Sun's Mass (M☉)

**Formula:** `M_SUN = GM_SUN / G`

**Implementation:** ✅ Complete
```javascript
// Gravitational constant
const G = 6.6743e-20;  // km³/(kg·s²)

// Sun's mass from gravitational parameter
const M_SUN = GM_SUN / G;  // ≈ 1.989 × 10³⁰ kg
```

**Display:** Added to Sun's planetStats
- Label: `Mass (M☉)`
- Value: `1.988 × 10³⁰ kg`
- Hover: `Derived from GM_SUN / G where G is the gravitational constant`

#### 6.1.2 Earth's Mass (M⊕)

**Formula:** `M_EARTH = GM_EARTH / G`

**Derivation Approach:**

The Earth's gravitational parameter is derived through a multi-step process that accounts for the Moon's presence and solar perturbation effects:

**Step 1: Earth-Moon System GM from Kepler's 3rd Law**
```javascript
// Earth+Moon system gravitational parameter from Moon's orbit (km³/s²)
// GM_system = (2π)² × a³ / P² - this gives G(M_Earth + M_Moon)
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3))
                            / Math.pow(moonSiderealMonth * meanlengthofday, 2);
```

**Step 2: Mass Ratio Separation**
```javascript
// Earth-Moon mass ratio ≈ 81.30
// Earth is 81.3 times more massive than Moon
const MASS_RATIO_EARTH_MOON = 81.3007;

// Earth's fraction: ratio / (ratio + 1) ≈ 0.9879
// Moon's fraction: 1 / (ratio + 1) ≈ 0.0121
```

**Step 3: Solar Perturbation Correction**
```javascript
// Solar perturbation correction factor using Moon's apogee ratio to AU
// The 1/(1 - moonApogee/AU) factor ≈ 1.00271 corrects for solar perturbation effects:
// - Kepler's law applied to Moon's orbit uses observed distance/period which include solar effects
// - At apogee, Moon is closest to Earth's Hill sphere edge, maximizing solar influence
// - The quadrupole solar perturbation (~5.6×10⁻³) scales with orbital size ratio
// - Reference: https://farside.ph.utexas.edu/teaching/celestial/Celestial/node100.html
// - This represents the "effective radius" reconciling Kepler-derived with measured GM values
```

**Final Implementation:**
```javascript
// Earth's gravitational parameter (corrected for Moon's mass and solar perturbation)
// GM_Earth = GM_system × (ratio / (ratio + 1)) / (1 - moonApogee/AU)
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1))
               / (1 - moonAtApogee / meanAUDistance);
// Result: ~398,600 km³/s² (matches JPL value)

// Earth's mass derived from gravitational parameter (kg)
// M_EARTH = GM_EARTH / G ≈ 5.97 × 10²⁴ kg
const M_EARTH = GM_EARTH / G_CONSTANT;
```

**Why Solar Perturbation Correction?**
- Raw Kepler-derived GM from Moon's orbit is ~397,500 km³/s² (underestimates by ~0.27%)
- The Sun perturbs Moon's orbit, making observed a and P slightly different from pure two-body values
- The correction factor 1/(1 - moonApogee/AU) ≈ 1.00271 reconciles this difference
- After correction: ~398,600 km³/s² matching JPL's measured value

**Display:** Added to Earth's planetStats
- Label: `Mass (M⊕)`
- Value: `5.97 × 10²⁴ kg`
- Hover: `Derived from Moon's orbital period and distance using Kepler's 3rd Law, with solar perturbation correction`

#### 6.1.3 Moon's Mass (M☽)

**Formula:** `M_MOON = GM_MOON / G`

**Derivation:**

The Moon's gravitational parameter uses the same Earth-Moon system GM and solar perturbation correction:

```javascript
// Moon's gravitational parameter (km³/s²)
// GM_Moon = GM_system / (ratio + 1) with same solar perturbation correction
// The entire GM_EARTH_MOON_SYSTEM is affected by solar perturbation
const GM_MOON = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1)
              / (1 - moonAtApogee / meanAUDistance);
// Result: ~4,902.8 km³/s² (matches GRAIL value)

// Moon's mass derived from gravitational parameter (kg)
// M_MOON = GM_MOON / G ≈ 7.35 × 10²² kg
const M_MOON = GM_MOON / G_CONSTANT;
```

**Display:** Added to Moon's planetStats
- Label: `Mass (M☽)`
- Value: `7.35 × 10²² kg`
- Hover: `Derived from Earth-Moon mass ratio and Kepler's 3rd Law, with solar perturbation correction`

### 6.2 Escape Velocity

#### 6.2.1 Escape Velocity from Sun (at current distance)

**Symbol:** v_esc

**Formula:** `v_esc = √(2GM/r)`

**Physical Meaning:** The minimum velocity needed to escape the Sun's gravitational influence from the planet's current position.

**Implementation:** ✅ Complete
```javascript
// Escape velocity from Sun at distance r (km/s)
escapeVelocity: (r_km) => Math.sqrt(2 * GM_SUN / r_km)
```

#### 6.2.2 Circular Orbit Velocity (for comparison)

**Symbol:** v_circ

**Formula:** `v_circ = √(GM/r)`

**Physical Meaning:** The velocity needed for a circular orbit at the current distance.

**Implementation:** ✅ Complete
```javascript
// Circular orbit velocity at distance r (km/s)
circularVelocity: (r_km) => Math.sqrt(GM_SUN / r_km)
```

**Note:** `v_esc = √2 × v_circ` always (factor of √2 ≈ 1.414)

#### 6.2.3 Velocity Ratio (v/v_circ)

**Symbol:** v/v_circ

**Formula:** `velocityRatio = v / v_circ`

**Physical Meaning:** How the current velocity compares to a circular orbit:
- `= 1.0`: Circular orbit
- `> 1.0`: Moving faster (near perihelion)
- `< 1.0`: Moving slower (near aphelion)
- `≥ √2`: Escape velocity reached

### 6.3 Kepler's Laws Verification

#### 6.3.1 Orbital Period from Kepler's 3rd Law

**Formula:** `P = 2π√(a³/GM)`

**Purpose:** Verify that our input orbital periods match what Kepler's 3rd Law predicts.

**Implementation:** ✅ Complete as `keplerPeriod(a_km)`

#### 6.3.2 Area Sweep Rate (Kepler's 2nd Law)

**Symbol:** dA/dt

**Formula:** `dA/dt = h/2`

**Physical Meaning:** The rate at which the radius vector sweeps out area. Constant for each planet (equal areas in equal times).

**Implementation:** ✅ Complete
```javascript
// Area sweep rate (km²/s)
areaSweepRate: (a_km, e) => OrbitalFormulas.specificAngularMomentum(a_km, e) / 2
```

### 6.4 3D Position Formulas

#### 6.4.1 Heliocentric Latitude (β)

**Symbol:** β (beta)

**Formula:** `sin(β) = sin(i) × sin(u)` where `u = ω + ν`

**Physical Meaning:** Angular distance above or below the ecliptic plane (or invariable plane).

**Implementation:** ✅ Complete
```javascript
// Heliocentric latitude to ecliptic (degrees)
heliocentricLatitude: (inclination_deg, omega_deg, nu_deg) => {
  const i = inclination_deg * Math.PI / 180;
  const u = (omega_deg + nu_deg) * Math.PI / 180;
  return Math.asin(Math.sin(i) * Math.sin(u)) * 180 / Math.PI;
}
```

### 6.5 Inter-Planetary Calculations

#### 6.5.1 Generalized Synodic Period

**Formula:** `P_syn = |P₁ × P₂ / (P₁ - P₂)|`

**Implementation:** ✅ Complete
```javascript
// Synodic period between any two planets (days)
synodicPeriod: (P1_days, P2_days) => {
  if (P1_days === P2_days) return Infinity;
  return Math.abs(P1_days * P2_days / (P1_days - P2_days));
}
```

**Example Values:**
| Planet Pair | Synodic Period |
|-------------|----------------|
| Mercury-Venus | 144.5 days |
| Mars-Jupiter | 816.5 days |
| Jupiter-Saturn | 7,253 days (~19.9 years) |
| Uranus-Neptune | 171.4 years |

#### 6.5.2 Phase Angle Between Planets

**Symbol:** α

**Formula:** `α = |λ₁ - λ₂|` (difference in true longitudes)

**Physical Meaning:** Angular separation between two planets as seen from the Sun.

**Implementation:** ✅ Complete
```javascript
// Phase angle between two planets (degrees, 0-180)
phaseAngle: (lambda1_deg, lambda2_deg) => {
  let diff = Math.abs(lambda1_deg - lambda2_deg);
  if (diff > 180) diff = 360 - diff;
  return diff;
}
```

**Special Values:**
- `0°` = Conjunction (same side of Sun)
- `180°` = Opposition (opposite sides of Sun)
- `90°` = Quadrature

### 6.6 Time-Based Calculations

#### 6.6.1 True Anomaly Rate

**Symbol:** dν/dt

**Formula:** `dν/dt = n × (1 + e×cos(ν))² / (1 - e²)^(3/2)`

**Physical Meaning:** How fast the true anomaly changes. NOT constant - fastest at perihelion, slowest at aphelion.

**Implementation:** ✅ Complete
```javascript
// True anomaly rate (degrees/day)
trueAnomalyRate: (n_deg_day, e, nu_deg) => {
  const nu = nu_deg * Math.PI / 180;
  const factor = Math.pow(1 + e * Math.cos(nu), 2) / Math.pow(1 - e * e, 1.5);
  return n_deg_day * factor;
}
```

#### 6.6.2 Eccentric Anomaly Rate

**Symbol:** dE/dt

**Formula:** `dE/dt = n / (1 - e×cos(E))`

**Physical Meaning:** Rate of change of eccentric anomaly.

**Implementation:** ✅ Complete
```javascript
// Eccentric anomaly rate (degrees/day)
eccentricAnomalyRate: (n_deg_day, e, E_deg) => {
  const E = E_deg * Math.PI / 180;
  return n_deg_day / (1 - e * Math.cos(E));
}
```

### 6.7 Radius of Curvature

**Symbol:** ρ (rho)

**Formula:** `ρ = p × (1 + e² + 2e×cos(ν))^(3/2) / (1 + e×cos(ν))²`

**Physical Meaning:** The radius of the osculating circle (the circle that best fits the orbit at the current point). Largest at aphelion, smallest at perihelion.

**Implementation:** ✅ Complete
```javascript
// Radius of curvature (km)
radiusOfCurvature: (a_km, e, nu_deg) => {
  const p = a_km * (1 - e * e);
  const nu = nu_deg * Math.PI / 180;
  const cosNu = Math.cos(nu);
  const numerator = Math.pow(1 + e*e + 2*e*cosNu, 1.5);
  const denominator = Math.pow(1 + e*cosNu, 2);
  return p * numerator / denominator;
}
```

### 6.8 Orbital Mechanics Ratios

#### 6.8.1 Eccentricity-Based Velocity Ratio

**Symbol:** v_p/v_a

**Formula:** `v_p / v_a = (1 + e) / (1 - e)`

**Physical Meaning:** How much faster a planet moves at perihelion vs aphelion.

**Implementation:** ✅ Complete
```javascript
// Velocity ratio at perihelion vs aphelion
// v_p/v_a = (1 + e) / (1 - e)
velocityRatioPeriApo: (e) => (1 + e) / (1 - e)
```

**Example Values:**
| Planet | e | v_p/v_a |
|--------|---|---------|
| Mercury | 0.206 | 1.52 |
| Earth | 0.017 | 1.03 |
| Pluto | 0.249 | 1.66 |
| Halley's | 0.967 | ~59.8 |

#### 6.8.2 Eccentricity-Based Distance Ratio

**Symbol:** Q/q

**Formula:** `Q / q = (1 + e) / (1 - e)`

**Physical Meaning:** The ratio of aphelion distance to perihelion distance. Same formula as velocity ratio (conservation of angular momentum).

**Implementation:** ✅ Complete
```javascript
// Distance ratio aphelion vs perihelion
// Q/q = (1 + e) / (1 - e)
distanceRatioApoPerip: (e) => (1 + e) / (1 - e)
```

#### 6.8.3 Orbital Energy Ratio

**Symbol:** r/a

**Formula:** `ratio = r / a`

**Physical Meaning:** Current distance relative to semi-major axis:
- `< 1`: Closer than semi-major axis (between perihelion and semi-major axis point)
- `= 1`: At semi-major axis distance
- `> 1`: Farther than semi-major axis (between semi-major axis point and aphelion)

**Implementation:** ✅ Complete
```javascript
// Orbital Energy Ratio (dimensionless)
orbitalEnergyRatio: (r_km, a_km) => r_km / a_km
```

### 6.9 Inverse Kepler Formulas

#### 6.9.1 Semi-major Axis from Period

**Symbol:** a

**Formula:** `a = (GM × P² / 4π²)^(1/3)`

**Physical Meaning:** Given an orbital period, calculate the required semi-major axis. Inverse of Kepler's 3rd Law.

**Implementation:** ✅ Complete
```javascript
// Semi-major Axis from Period (km)
// a = (GM × P² / 4π²)^(1/3)
// Inverse of Kepler's 3rd Law
semiMajorAxisFromPeriod: (P_seconds, GM) => {
  return Math.pow(GM * P_seconds * P_seconds / (4 * Math.PI * Math.PI), 1/3);
}
```

#### 6.9.2 Mean Motion from GM

**Symbol:** n

**Formula:** `n = √(GM / a³)`

**Physical Meaning:** Angular velocity in radians per second, derived directly from GM rather than orbital period.

**Implementation:** ✅ Complete
```javascript
// Mean Motion from GM (rad/s)
// n = √(GM / a³)
// Angular velocity in radians per second
meanMotionFromGM: (GM, a_km) => Math.sqrt(GM / Math.pow(a_km, 3))
```

### 6.10 Tidal Effects

#### 6.10.1 Tidal Acceleration

**Symbol:** a_tidal

**Formula:** `a_tidal = 2 × GM × Δr / r³`

**Physical Meaning:** The differential gravitational acceleration across an extended body. This causes tidal stretching - the near side experiences stronger gravity than the far side.

**Implementation:** ✅ Complete
```javascript
// Tidal Acceleration (m/s²)
// a_tidal = 2 × GM × Δr / r³
// Differential gravitational acceleration across an extended body
tidalAcceleration: (GM, r_km, delta_r_km) => {
  return 2 * GM * delta_r_km / Math.pow(r_km, 3) * 1000;  // Convert to m/s²
}
```

**Physical Application:** For the Moon's tidal effect on Earth:
- r = 384,400 km (Moon's distance)
- Δr = 12,742 km (Earth's diameter)
- Result: ~1.1 × 10⁻⁶ m/s² differential acceleration across Earth

---

## Part 7: Part 3 Formulas - Gravitational Influence & Surface Properties

### 7.1 Current GM and Mass Values (Implemented)

#### 7.1.1 Derived from Kepler's 3rd Law

| Body | GM (km³/s²) | Mass (kg) | Derivation Method |
|------|-------------|-----------|-------------------|
| **Sun** | 132,712,828,771 | 1.988 × 10³⁰ | Kepler's 3rd Law from Earth's orbit |
| **Earth** | 398,601.34 | 5.972 × 10²⁴ | Moon's orbit + solar perturbation correction |
| **Moon** | 4,902.80 | 7.346 × 10²² | Same correction as Earth |

#### 7.1.2 Derived from Sun/Planet Mass Ratios

| Body | Mass Ratio (Sun/Planet) | GM (km³/s²) | Mass (kg) |
|------|------------------------|-------------|-----------|
| **Mercury** | 6,023,600 | ~22,032 | ~3.30 × 10²³ |
| **Venus** | 408,523.71 | ~324,859 | ~4.87 × 10²⁴ |
| **Mars** | 3,098,703.59 | ~42,828 | ~6.42 × 10²³ |
| **Jupiter** | 1,047.3486 | ~126,686,534 | ~1.90 × 10²⁷ |
| **Saturn** | 3,497.898 | ~37,931,187 | ~5.68 × 10²⁶ |
| **Uranus** | 22,902.98 | ~5,793,939 | ~8.68 × 10²⁵ |
| **Neptune** | 19,412.24 | ~6,836,529 | ~1.02 × 10²⁶ |
| **Pluto** | 135,200,000 | ~982 | ~1.47 × 10²² |

#### 7.1.3 Small Bodies (Direct Measurements/Estimates)

| Body | GM (km³/s²) | Mass (kg) | Measurement Method |
|------|-------------|-----------|-------------------|
| **Halley's Comet** | ~1.47 × 10⁻⁵ | ~2.2 × 10¹⁴ | Estimated from size/density |
| **433 Eros** | ~4.46 × 10⁻⁴ | 6.687 × 10¹⁵ | NEAR Shoemaker (precise) |

### 7.2 Gravitational Influence Zones

#### 7.2.1 Hill Sphere Radius

**Symbol:** r_Hill

**Formula:** `r_Hill = a × (m / 3M)^(1/3)`

**Physical Meaning:** The region around a body where its gravity dominates over the primary's gravity. Satellites must orbit within this radius to remain bound.

**Implementation:** ✅ Complete
```javascript
hillSphereRadius: (a_km, m_body, M_primary) => {
  return a_km * Math.pow(m_body / (3 * M_primary), 1/3);
}
```

**Example Values:**
| Body | Primary | Hill Sphere Radius |
|------|---------|-------------------|
| Mercury | Sun | ~175,000 km |
| Earth | Sun | ~1,500,000 km |
| Moon | Earth | ~60,000 km |
| Jupiter | Sun | ~53,000,000 km |

#### 7.2.2 Sphere of Influence (Laplace)

**Symbol:** r_SOI

**Formula:** `r_SOI = a × (m / M)^(2/5)`

**Physical Meaning:** The region where the body's gravitational influence is stronger than the perturbation from the primary. Used in patched conic approximation for spacecraft trajectories.

**Implementation:** ✅ Complete
```javascript
sphereOfInfluence: (a_km, m_body, M_primary) => {
  return a_km * Math.pow(m_body / M_primary, 2/5);
}
```

#### 7.2.3 Lagrange Point Distances (L1 and L2)

**Formula (approximate):** `r_L1 ≈ r_L2 ≈ a × (m / 3M)^(1/3)`

Same formula as Hill sphere radius.

**Implementation:** ✅ Complete as `lagrangeL1L2Distance()`

### 7.3 Surface & Physical Properties

#### 7.3.1 Surface Gravity

**Symbol:** g

**Formula:** `g = GM / R²`

**Physical Meaning:** Gravitational acceleration at the surface.

**Implementation:** ✅ Complete (using diameters object for radii)
```javascript
surfaceGravity: (GM_km3_s2, R_km) => {
  return GM_km3_s2 / (R_km * R_km) * 1000;  // Convert km/s² to m/s²
}
```

**Example Values:**
| Body | Surface Gravity (m/s²) |
|------|------------------------|
| Sun | 274.0 |
| Earth | 9.82 |
| Moon | 1.62 |
| Mars | 3.73 |
| Jupiter | 24.79 |

#### 7.3.2 Surface Escape Velocity

**Symbol:** v_esc_surface

**Formula:** `v_esc = √(2GM/R)`

**Implementation:** ✅ Complete
```javascript
surfaceEscapeVelocity: (GM, R_km) => Math.sqrt(2 * GM / R_km)
```

**Example Values:**
| Body | Escape Velocity (km/s) |
|------|------------------------|
| Sun | 617.5 |
| Earth | 11.19 |
| Moon | 2.38 |
| Mars | 5.03 |
| Jupiter | 59.5 |

#### 7.3.3 Mean Density

**Symbol:** ρ

**Formula:** `ρ = M / V = 3M / (4πR³)`

**Implementation:** ✅ Complete
```javascript
meanDensity: (M_kg, R_km) => {
  const R_m = R_km * 1000;
  const V = (4/3) * Math.PI * Math.pow(R_m, 3);
  return M_kg / V;
}
```

### 7.4 Orbital Energy & Dynamics

#### 7.4.1 Gravitational Potential at Distance

**Symbol:** Φ

**Formula:** `Φ = -GM/r`

**Implementation:** ✅ Complete
```javascript
gravitationalPotential: (GM, r_km) => -GM / r_km
```

#### 7.4.2 Orbital Energy Ratio

**Formula:** `ε/ε_circ = r/a`

**Implementation:** ✅ Complete
```javascript
orbitalEnergyRatio: (r_km, a_km) => r_km / a_km
```

### 7.5 Three-Body Dynamics

#### 7.5.1 Barycenter Distance from Earth Center

**Symbol:** d_bary

**Formula:** `d_bary = moonDistance / (1 + MASS_RATIO_EARTH_MOON)`

**Physical Meaning:** Distance from Earth's center to the Earth-Moon barycenter.

**Result:** ~4,670 km (inside Earth, which has radius ~6,371 km)

**Implementation:** ✅ Complete
```javascript
barycenterDistance: () => moonDistance / (1 + MASS_RATIO_EARTH_MOON)
```

#### 7.5.2 Tidal Force Ratio (Sun vs Moon on Earth)

**Formula:** `F_Sun / F_Moon = (M_Sun / M_Moon) × (r_Moon / r_Sun)³`

**Expected Result:** ~0.46 (Sun's tidal force is about 46% of Moon's)

**Implementation:** ✅ Complete

### 7.6 Schwarzschild Radius (Theoretical)

**Symbol:** r_s

**Formula:** `r_s = 2GM / c²`

**Physical Meaning:** The radius at which escape velocity equals speed of light. If all mass were compressed within this radius, it would form a black hole.

**Implementation:** ✅ Complete
```javascript
schwarzschildRadius: (GM) => {
  const c = 299792.458;  // km/s
  return 2 * GM / (c * c);
}
```

**Results:**
| Body | Schwarzschild Radius |
|------|---------------------|
| Sun | ~2.95 km |
| Jupiter | ~2.82 m |
| Earth | ~8.87 mm |
| Moon | ~0.11 mm |

---

## Part 8: Phase 4 Polish - Hover Tooltips & Info Links

### 8.1 Implementation Status

**Phase 4 (Polish):** ✅ **COMPLETED** - December 2024

All planetStats entries now include:
- **Hover tooltips** explaining formulas and physical meaning
- **Wikipedia info links** for key astronomical concepts

### 8.2 Hover Tooltip Pattern

Each formula entry follows this pattern:
```javascript
{label : () => `Longitude of perihelion (ϖ)`,
 value : [ { v: () => o.planetPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
 hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
 info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
```

### 8.3 Implemented Info Links

The following Wikipedia links are added across all planets:

#### Orbital Orientation
- [Longitude of the periapsis](https://en.wikipedia.org/wiki/Longitude_of_the_periapsis)
- [Argument of periapsis](https://en.wikipedia.org/wiki/Argument_of_periapsis)
- [Longitude of the ascending node](https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node)
- [Invariable plane](https://en.wikipedia.org/wiki/Invariable_plane)

#### Position & Anomalies
- [Mean anomaly](https://en.wikipedia.org/wiki/Mean_anomaly)
- [Eccentric anomaly](https://en.wikipedia.org/wiki/Eccentric_anomaly)
- [True anomaly](https://en.wikipedia.org/wiki/True_anomaly)
- [Equation of the center](https://en.wikipedia.org/wiki/Equation_of_the_center)
- [Mean longitude](https://en.wikipedia.org/wiki/Mean_longitude)
- [True longitude](https://en.wikipedia.org/wiki/True_longitude)
- [Argument of latitude](https://en.wikipedia.org/wiki/Argument_of_latitude)
- [Flight path angle](https://en.wikipedia.org/wiki/Flight_path_angle)
- [Phase angle (astronomy)](https://en.wikipedia.org/wiki/Phase_angle_(astronomy))

### 8.4 Bodies Updated

All celestial bodies have been updated with hover tooltips and info links:
- ✅ Earth
- ✅ Mercury
- ✅ Venus
- ✅ Mars
- ✅ Jupiter
- ✅ Saturn
- ✅ Uranus
- ✅ Neptune
- ✅ Pluto
- ✅ Halley's Comet
- ✅ 433 Eros

---

## Part 9: Precession & Newtonian Dynamics

This section documents the perihelion precession formulas - purely Newtonian mechanics derived from observed precession rates.

### Implementation Status

| Section | Method | In OrbitalFormulas | Used in UI |
|---------|--------|:------------------:|:----------:|
| 9.1.1 | `precessionRateFromPeriod` | ✅ | ✅ |
| 9.1.2 | `precessionPeriodFromRate` | ✅ | ❌ |
| 9.2.1 | `precessionEclipticToICRF` | ✅ | ✅ |
| 9.2.2 | `precessionICRFToEcliptic` | ✅ | ❌ |
| 9.3.1 | `holisticPrecessionRatio` | ✅ | ✅ |
| 9.3.2 | `precessionFromHolisticRatio` | ✅ | ❌ |
| 9.4.1 | `precessionAngularVelocity` | ✅ | ✅ |
| 9.4.2 | `perturbationStrength` | ✅ | ❌ |
| 9.5.1 | `precessionDecomposition` | ✅ | ❌ |
| 9.5.2 | `precessionRatio` | ✅ | ❌ |

**Note:** Methods marked ❌ in "Used in UI" are utility/inverse functions available for calculations but not displayed in planetStats.

### 9.1 Precession Rate Fundamentals

#### 9.1.1 Precession Rate from Period

**Symbol:** ω̇ (omega-dot)

**Formula:** `precessionRate = 1,296,000 / period_years × 100`

**Simplified:** `precessionRate = 129,600,000 / period_years`

**Where:**
- 1,296,000 = 360° × 3600 arcsec/degree (full circle in arcseconds)
- Result is in arcseconds per century

**Implementation:**
```javascript
// Precession rate from precession period (arcsec/century)
// Rate = 360° × 3600"/° × 100 years / Period_years
precessionRateFromPeriod: (period_years) => {
  if (!isFinite(period_years) || period_years === 0) return 0;
  return 129600000 / period_years;
}
```

**Example Values:**
| Planet | Precession Period (years) | Rate (arcsec/century) |
|--------|---------------------------|----------------------|
| Mercury | 243,455.91 | ~532 |
| Mars | 74,544 (holistic/4) | ~1,739 |
| Earth | 99,392 (holistic/3) | ~1,304 |
| Jupiter | 298,176 (holistic) | ~435 |
| Saturn | -298,176 (retrograde) | ~-435 |

#### 9.1.2 Precession Period from Rate

**Formula:** `period = 129,600,000 / rate_arcsec_per_century`

**Physical Meaning:** Time for perihelion to complete one full 360° cycle.

**Implementation:**
```javascript
// Precession period from rate (years for full 360° cycle)
// Period = 129,600,000 / Rate_arcsec_per_century
precessionPeriodFromRate: (arcsec_per_century) => {
  if (!isFinite(arcsec_per_century) || arcsec_per_century === 0) return Infinity;
  return 129600000 / arcsec_per_century;
}
```

### 9.2 Reference Frame Transformations

#### 9.2.1 Ecliptic to ICRF Transformation

**Formula:** `ICRF_period = (ecliptic_period × reference_period) / (ecliptic_period - reference_period)`

**Where:**
- `ecliptic_period` = precession period against the ecliptic
- `reference_period` = nodal precession period (holisticyearLength/13 ≈ 22,937 years)

**Physical Meaning:** Converts precession measured against the moving ecliptic to precession against the fixed ICRF (International Celestial Reference Frame).

**Implementation:**
```javascript
// Convert precession against Ecliptic to precession against ICRF
// ICRF_period = (ecliptic × reference) / (ecliptic - reference)
precessionEclipticToICRF: (ecliptic_years, reference_years) => {
  const diff = ecliptic_years - reference_years;
  if (diff === 0) return Infinity;
  return (ecliptic_years * reference_years) / diff;
}
```

**Example for Mercury:**
- Ecliptic period: 243,455.91 years
- Reference (holistic/13): 22,936.62 years
- ICRF period: (243,455.91 × 22,936.62) / (243,455.91 - 22,936.62) ≈ 25,322 years

#### 9.2.2 ICRF to Ecliptic Transformation

**Formula:** `ecliptic_period = (ICRF_period × reference_period) / (ICRF_period + reference_period)`

**Implementation:**
```javascript
// Convert precession against ICRF to precession against Ecliptic
// Inverse of the above transformation
precessionICRFToEcliptic: (ICRF_years, reference_years) => {
  const sum = ICRF_years + reference_years;
  if (sum === 0) return Infinity;
  return (ICRF_years * reference_years) / sum;
}
```

### 9.3 Holistic Year Relationships

#### 9.3.1 Precession Ratio to Holistic Year

**Formula:** `ratio = holisticyearLength / precession_period`

**Physical Meaning:** Shows how precession periods relate to the fundamental holistic year (298,176 years).

**Observed Patterns:**
| Planet | Ratio | Expression |
|--------|-------|------------|
| Mercury | ~1.22 | Custom (243,455.91 years) |
| Venus | ~0 | Essentially no precession |
| Earth | 3 | holisticyearLength / 3 |
| Mars | 4 | holisticyearLength / 4 |
| Jupiter | 1 | holisticyearLength |
| Saturn | -1 | -holisticyearLength (retrograde) |
| Uranus | 3 | holisticyearLength / 3 |
| Neptune | -1 | -holisticyearLength (retrograde) |

**Implementation:**
```javascript
// Ratio of holistic year to precession period
// Shows resonance structure in Newtonian precession
holisticPrecessionRatio: (precession_period, holistic_year) => {
  if (precession_period === 0) return Infinity;
  return holistic_year / precession_period;
}
```

#### 9.3.2 Precession Period from Holistic Ratio

**Formula:** `precession_period = holisticyearLength / n`

**Where:** `n` is the ratio (positive for prograde, negative for retrograde)

**Implementation:**
```javascript
// Precession period from holistic year ratio
// period = holisticyearLength / n
precessionFromHolisticRatio: (holistic_year, ratio) => {
  if (ratio === 0) return Infinity;
  return holistic_year / ratio;
}
```

### 9.4 Newtonian Perturbation Analysis

#### 9.4.1 Angular Momentum Precession Rate

**Symbol:** Ω̇

**Formula:** `Ω̇ = τ / L`

**Where:**
- `τ` = gravitational torque from perturbing planets
- `L` = orbital angular momentum = m × h = m × √(GM × a × (1-e²))

**Physical Meaning:** The precession rate is the ratio of applied torque to angular momentum.

**Implementation:**
```javascript
// Angular momentum (specific, km²/s)
// h = √(GM × a × (1-e²))
// Already implemented as specificAngularMomentum()

// Precession angular velocity (rad/year) from arcsec/century
precessionAngularVelocity: (arcsec_per_century) => {
  // Convert arcsec/century to rad/year
  // 1 arcsec = π/(180×3600) rad, 1 century = 100 years
  return (arcsec_per_century / 100) * (Math.PI / 648000);
}
```

#### 9.4.2 Perturbation Strength Estimate

**Formula:** `strength ∝ (m_perturber / M_sun) × (a / a_perturber)²`

**For outer perturber on inner planet:**
```
strength = (m_perturber / M_sun) × (a_planet / a_perturber)²
```

**For inner perturber on outer planet:**
```
strength = (m_perturber / M_sun) × (a_perturber / a_planet)²
```

**Physical Meaning:** Estimates the relative strength of gravitational perturbation from one planet on another.

**Implementation:**
```javascript
// Newtonian perturbation strength estimate (dimensionless)
// Shows relative influence of perturbing planet
perturbationStrength: (a_planet_km, a_perturber_km, m_perturber, M_sun) => {
  const ratio = a_planet_km < a_perturber_km
    ? Math.pow(a_planet_km / a_perturber_km, 2)
    : Math.pow(a_perturber_km / a_planet_km, 2);
  return (m_perturber / M_sun) * ratio;
}
```

**Example - Jupiter's perturbation on Mercury:**
- a_Mercury ≈ 57.9 million km
- a_Jupiter ≈ 778.5 million km
- m_Jupiter / M_sun ≈ 1/1047
- Strength ≈ (1/1047) × (57.9/778.5)² ≈ 5.3 × 10⁻⁶

### 9.5 Precession Decomposition

#### 9.5.1 Total Observed Precession

**Formula:** `ω̇_total = ω̇_ecliptic_motion + ω̇_planetary_perturbations`

**Components:**
1. **Ecliptic motion contribution** - Due to precession of the ecliptic itself
2. **Planetary perturbations** - Newtonian gravitational effects from other planets

**Implementation:**
```javascript
// Decompose total precession into components
// Returns object with ecliptic and perturbation contributions
precessionDecomposition: (total_arcsec, ecliptic_contribution_arcsec) => {
  return {
    total: total_arcsec,
    ecliptic: ecliptic_contribution_arcsec,
    perturbations: total_arcsec - ecliptic_contribution_arcsec
  };
}
```

#### 9.5.2 Precession Ratio Between Planets

**Formula:** `ratio = ω̇₁ / ω̇₂`

**Physical Meaning:** Compares precession rates between planets, useful for finding resonances.

**Implementation:**
```javascript
// Precession ratio between two planets
// Useful for identifying resonance patterns
precessionRatio: (rate1_arcsec, rate2_arcsec) => {
  if (rate2_arcsec === 0) return Infinity;
  return rate1_arcsec / rate2_arcsec;
}
```

### 9.6 Current Precession Values (Implemented)

| Planet | Ecliptic Period (years) | ICRF Period (years) | Rate (arcsec/century) | Holistic Ratio |
|--------|------------------------|---------------------|----------------------|----------------|
| **Mercury** | 243,455.91 | ~25,322 | ~532 | ~1.22 |
| **Venus** | ~6×10¹² | ~22,937 | ~0 | ~0 |
| **Earth** | 99,392 | ~28,973 | ~1,304 | 3 |
| **Mars** | 74,544 | ~33,182 | ~1,739 | 4 |
| **Jupiter** | 298,176 | ~24,882 | ~435 | 1 |
| **Saturn** | -298,176 | ~-27,135 | ~-435 | -1 |
| **Uranus** | 99,392 | ~28,973 | ~1,304 | 3 |
| **Neptune** | -298,176 | ~-27,135 | ~-435 | -1 |

**Note:** Negative values indicate retrograde precession (opposite to orbital motion).

### 9.7 Formula Quick Reference

```
Precession Conversions:
Rate = 129,600,000 / Period_years          arcsec/century from period
Period = 129,600,000 / Rate                years from arcsec/century

Reference Frame Transformation:
ICRF = (Ecliptic × Reference) / (Ecliptic - Reference)
Ecliptic = (ICRF × Reference) / (ICRF + Reference)

Holistic Relationships:
Period = holisticyearLength / n            where n is integer ratio
Ratio = holisticyearLength / Period        holistic resonance

Angular Velocity:
ω = (arcsec/century / 100) × (π / 648000)  rad/year from arcsec/century
```

---

## Appendix A: Formula Quick Reference

### Anomaly Relationships
```
M = E - e·sin(E)                    Kepler's Equation
tan(ν/2) = √((1+e)/(1-e))·tan(E/2)  E to ν conversion
ν - M = Equation of Center          Already implemented
```

### Ellipse Geometry
```
b = a·√(1-e²)      Semi-minor axis
c = a·e            Focal distance
p = a·(1-e²)       Semi-latus rectum
q = a·(1-e)        Perihelion distance
Q = a·(1+e)        Aphelion distance
```

### Position
```
r = a·(1-e²)/(1+e·cos(ν))   Distance from focus
r = a·(1-e·cos(E))          Alternative using E
λ = ν + ϖ                   True longitude
L = M + ϖ                   Mean longitude
u = ω + ν                   Argument of latitude
```

### Velocities (require GM)
```
v = √(GM·(2/r - 1/a))       Vis-viva equation
v_p = √(GM·(1+e)/(a·(1-e))) Perihelion velocity
v_a = √(GM·(1-e)/(a·(1+e))) Aphelion velocity
```

### Conservation Laws (require GM)
```
h = √(GM·a·(1-e²))          Specific angular momentum
ε = -GM/(2a)                Specific orbital energy
```

### Invariable Plane (already implemented)
```
z = r·sin(i_inv)·sin(u)     Height above invariable plane
β = arcsin(sin(i_inv)·sin(u)) Heliocentric latitude
```

---

## Appendix B: Variable Cross-Reference

### Static Constants by Planet

| Planet | Eccentricity | Inclination (inv) | Semi-major (AU) | Period (days) |
|--------|--------------|-------------------|-----------------|---------------|
| Mercury | 0.20562928 | 6.3472858° | 0.387 | 87.97 |
| Venus | 0.00674819 | 2.1958348° | 0.723 | 224.70 |
| Earth | ~0.0167 (dynamic) | ~1.578° (dynamic) | 1.000 | 365.24 |
| Mars | 0.09344726 | 1.6690088° | 1.524 | 686.97 |
| Jupiter | 0.04966799 | 0.3229076° | 5.203 | 4,332.59 |
| Saturn | 0.0564781 | 0.9254843° | 9.537 | 10,759.22 |
| Uranus | 0.04519611 | 1.0205039° | 19.191 | 30,688.5 |
| Neptune | 0.009457 | 0.7241032° | 30.069 | 60,182.0 |
| Pluto | 0.24880766 | 15.5541618° | 39.482 | 90,560.0 |

### Live Variables Summary

All planets have these `o.{planet}` variables:
- `Perihelion` - Longitude of perihelion (ϖ)
- `AscendingNode` - Ascending node on ecliptic (Ω)
- `DescendingNode` - Descending node on ecliptic
- `ArgumentOfPeriapsis` - Argument of periapsis (ω)
- `MeanAnomaly` - Mean anomaly (M)
- `TrueAnomaly` - True anomaly (ν)
- `Elongation` - Elongation from Sun
- `AscendingNodeInvPlane` - Ascending node on invariable plane (verified)
- `AscendingNodeInvPlaneSouamiSouchay` - Ascending node on invariable plane (S&S)
- `HeightAboveInvPlane` - Height above invariable plane (AU)
- `AboveInvPlane` - Boolean: above invariable plane
- `ApparentInclination` - Apparent inclination to ecliptic
- `ApparentInclinationSouamiSouchay` - Apparent inclination (S&S method)

Plus `{planet}.sunDistAU` for current heliocentric distance.
