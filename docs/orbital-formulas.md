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
