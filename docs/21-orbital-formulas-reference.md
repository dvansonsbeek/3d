---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:8c6f14edf5f84905
status: current
---

# Orbital Formulas Reference

## Overview

This document provides a complete reference for all orbital calculation functions available in the solar system simulation, including input variables, the `OrbitalFormulas` helper library, and implementation details.

**Related Documents:**
- [Dynamic Orbital Elements Overview](04-dynamic-elements-overview.md) - How dynamic systems work together
- [Geometric Orbital Elements — the No-Chain Bodies](31-no-chain-body-elements.md) - Inclination oscillation (ICRF perihelion approach) and node shifts with obliquity

---

## Part 1: Available Input Variables

### 1.1 Global Constants

#### 1.1.1 Time & Distance Constants

For current values, see [Constants Reference](20-constants-reference.md).

| Variable | Description |
|----------|-------------|
| `holisticyearLength` | The fitted timing anchor (the correction bases' unit; not a period), Earth solar years |
| `meansolaryearlengthinDays` | Mean solar year in days (rounded to H/8 precision) |
| `meansiderealyearlengthinSeconds` | Mean sidereal year in seconds (derived: `siderealYearJ2000 × 86400`) |
| `meanlengthofday` | Mean solar day in SI seconds |
| `meanSiderealday` | Mean sidereal day in SI seconds (derived) |
| `meanStellarday` | Mean stellar day in SI seconds (derived) |
| `meanAnomalisticYearinDays` | Mean anomalistic year in days (derived) |
| `speedofSuninKM` | Earth's orbital speed around Sun (km/h) |
| `currentAUDistance` / `o.lengthofAU` | Astronomical Unit in km (dynamic) |
| `lightYear` | Light year in km (derived) |

> **ESSRT epoch dependence.** The variables above (`holisticyearLength`, `meansolaryearlengthinDays`, `meansiderealyearlengthinSeconds`, `meanlengthofday`, `meanSiderealday`, `meanStellarday`, `meanAnomalisticYearinDays`) hold **J2000-anchored values** — the model's primary calibration anchor. Under the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md), each of these is epoch-dependent: H(t) grows under Driver 1 (Earth-Moon tidal evolution → LOD growth) and the sidereal year in seconds shifts under Driver 2 (solar mass loss → Kepler's 3rd law). For deep-time / Phanerozoic / Hadean work, replace these globals with the corresponding `mean*AtAge(t_Ma)` helpers in `src/script.js` (`meanHAtAge`, `meanLodSecondsAtAge`, `meanSiderealYearSecondsAtAge`, `meanTropicalYearSecondsAtAge`, etc.) — see [Doc 20 § "ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the complete J2000-constant → helper map.

#### 1.1.2 Mathematical Constants

| Variable | Description |
|----------|-------------|
| `DEG2RAD` | Degrees to radians conversion (π/180) |
| `RAD2DEG` | Radians to degrees conversion (180/π) |

#### 1.1.3 Galactic Constants

| Variable | Description |
|----------|-------------|
| `sunOrbitPeriod` | Sun's orbital period around Milky Way (years, derived) |
| `milkywayDistance` | Distance to Milky Way center (light-years) |
| `sunSpeed` | Sun's speed around Milky Way (km/h) |
| `greatattractorDistance` | Distance to Great Attractor (light-years) |
| `milkywaySpeed` | Milky Way speed toward Great Attractor (km/h) |
| `milkywayOrbitPeriod` | Milky Way orbital period around Great Attractor (years, derived) |

#### 1.1.4 Physical Constants

| Constant | Description |
|----------|-------------|
| `speedOfLight` | Speed of light (km/s) |

#### 1.1.5 Derived Constants

| Constant | Description |
|----------|-------------|
| `GM_SUN` | Gravitational parameter, derived from Kepler's 3rd Law. Used by `OrbitalFormulas.orbitalVelocity`, etc. |

**GM_SUN derivation:**

The chain is **Earth/Moon → Sun**, because Kepler's 3rd law on Earth's orbit returns G(M_Sun + M_Earth), not GM_Sun alone. We back out GM_Sun by subtracting GM_Earth (which itself comes from the Moon's orbit with the `Δa = a_M·μ·m` solar-tidal correction).

```javascript
// Step 1: GM_Earth from Moon's orbit (with Δa solar-tidal correction)
const moonOrbitalShift = moonDistance * (1/(MASS_RATIO_EARTH_MOON+1)) * (moonSiderealMonth/meansiderealyearlengthinDays);
const moonDistanceCorrected = moonDistance + moonOrbitalShift;
const GM_EARTH_MOON_SYSTEM = 4π² · moonDistanceCorrected³ / (moonSiderealMonth × meanlengthofday)²;
const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM × M_E/(M_E + M_M);

// Step 2: GM_Sun from Earth's orbit, minus GM_EARTH_ALONE (M+m correction)
const GM_SUN_PLUS_EARTH = 4π² · currentAUDistance³ / meansiderealyearlengthinSeconds²;
const GM_SUN = GM_SUN_PLUS_EARTH - GM_EARTH_ALONE;
// Result: ~1.32712 × 10¹¹ km³/s²  (matches JPL DE440 to ~0.07 ppm)
```

For the full derivation including the physical interpretation of the Δa correction, see [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md).

**Advantages of deriving GM:**
- Self-consistent with simulation's orbital mechanics
- No external GM constant needed
- Automatically adjusts if AU, year length, or Moon orbit parameters change

**Note:** The gravitational constant `G` alone is not needed for orbital mechanics. All velocity, energy, and momentum formulas use the combined `GM` (gravitational parameter), not G and M separately.

### 1.2 Per-Planet Static Constants

For each planet (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Halley's, Eros):

For current values, see [Constants Reference](20-constants-reference.md).

| Variable Pattern | Description |
|------------------|-------------|
| `{planet}SolarYearInput` | Orbital period input (days) |
| `{planet}OrbitalEccentricity` | Eccentricity (e) |
| `{planet}InvPlaneInclinationMean` | Mean inclination to invariable plane (Laplace-Lagrange midpoint) |
| `{planet}InvPlaneInclinationAmplitude` | Inclination oscillation amplitude (half of L-L range) |
| `{planet}InclinationCycleAnchor` | Cycle anchor for inclination oscillation (ICRF perihelion longitude where MAX inclination occurs, evaluated at the balanced year) |
| `{planet}EclipticInclinationJ2000` | J2000 orbital inclination to ecliptic |
| `{planet}OrbitDistance` | Semi-major axis (a) in AU (derived) |
| `{planet}PerihelionDistance` | Distance at perihelion |
| `{planet}Speed` | Mean orbital velocity (km/h) |
| `{planet}SolarYearCount` | Number of orbits in one anchor interval (derived; a device count) |
| `{planet}PerihelionEcliptic` | Perihelion precession period |
| `{planet}PerihelionEclipticYears` | Perihelion precession cycle length against ecliptic |
| `{planet}AngleCorrection` | Alignment correction angle |
| `{planet}Tilt` | Axial tilt |
| `{planet}RotationPeriod` | Sidereal rotation period (hours) |
| `{planet}AscendingNodeInvPlaneVerified` | J2000-calibrated ascending node to invariable plane |
| `{planet}AscendingNodeInvPlaneSouamiSouchay` | Original Souami & Souchay (2012) ascending node |
| `diameters.{planet}Diameter` | Planet diameter (km) |

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
| `o.{planet}EccentricAnomaly` | `o.mercuryEccentricAnomaly` | Eccentric Anomaly (E) | Live |
| `o.{planet}Elongation` | `o.mercuryElongation` | Elongation from Sun (as seen from Earth) | Live |

#### 1.3.2 Invariable Plane Variables

| Variable Pattern | Example | Description | Updates |
|------------------|---------|-------------|---------|
| `o.{planet}AscendingNodeInvPlane` | `o.mercuryAscendingNodeInvPlane` | Dynamic ascending node to invariable plane (J2000-verified) | Live |
| `o.{planet}AscendingNodeInvPlaneSouamiSouchay` | `o.mercuryAscendingNodeInvPlaneSouamiSouchay` | Dynamic ascending node (original S&S values) | Live |
| `o.{planet}HeightAboveInvPlane` | `o.mercuryHeightAboveInvPlane` | Current height above/below invariable plane (AU) | Live |
| `o.{planet}AboveInvPlane` | `o.mercuryAboveInvPlane` | Boolean: is planet currently above invariable plane | Live |
| `o.{planet}EclipticInclinationDynamic` | `o.mercuryEclipticInclinationDynamic` | Dynamic ecliptic inclination to ecliptic | Live |
| `o.{planet}EclipticInclinationSouamiSouchayDynamic` | `o.mercuryEclipticInclinationSouamiSouchayDynamic` | Ecliptic inclination using S&S ascending nodes | Live |
| `o.{planet}InvPlaneInclinationDynamic` | `o.mercuryInvPlaneInclinationDynamic` | Dynamic inclination to invariable plane (oscillates with Ω) | Live |

#### 1.3.3 Distance Variables

| Variable Pattern | Example | Description | Updates |
|------------------|---------|-------------|---------|
| `{planet}.sunDistAU` | `mercury.sunDistAU` | Current heliocentric distance in AU | Live |

### 1.4 Moon-Specific Variables

#### 1.4.1 Static Constants

For current values, see [Constants Reference](20-constants-reference.md).

| Variable | Description |
|----------|-------------|
| `moonSiderealMonthInput` | Sidereal month (days) |
| `moonAnomalisticMonthInput` | Anomalistic month (days) |
| `moonNodalMonthInput` | Nodal/Draconic month (days) |
| `moonSynodicMonth` | Synodic month (derived) |
| `moonTropicalMonth` | Tropical month, used for orbital speed (derived) |
| `moonDistance` | Mean Earth-Moon distance (km) |
| `moonEclipticInclinationJ2000` | Orbital inclination to ecliptic |
| `moonOrbitalEccentricity` | Eccentricity |
| `moonTilt` | Axial tilt |
| `moonStartposNodal` | Nodal precession start position (calibration) |
| `moonStartposApsidal` | Apsidal precession start position (calibration) |
| `moonStartposMoon` | Moon orbital start position (calibration) |

#### 1.4.2 Dynamic Orbital Elements (computed by `updateMoonOrbitalElements()`)

These variables are computed each frame from the 3D scene geometry, using Earth as the gravitational focus instead of the Sun. The function follows the same pattern as `updatePlanetAnomalies()`.

| Variable | Symbol | Description | Source |
|----------|--------|-------------|--------|
| `o.moonAscendingNode` | Ω | Ecliptic longitude of ascending node (°) | Orbit plane normal from `moonNodalPrecession.containerObj.matrixWorld` |
| `o.moonDescendingNode` | — | Ecliptic longitude of descending node (°) | Ω + 180° |
| `o.moonLongitudeOfPerigee` | ϖ | Ecliptic longitude of perigee (°) | `atan2()` of Earth − orbit center world positions |
| `o.moonArgumentOfPerigee` | ω | Argument of perigee (°) | ϖ − Ω |
| `o.moonTrueAnomaly` | ν | True anomaly — angle at Earth from perigee to Moon (°) | 3D positions: Earth (focus), Moon, orbit center P |
| `o.moonMeanAnomaly` | M | Mean anomaly — angle at orbit center P from perigee to Moon (°) | 3D positions: orbit center P, Moon, perigee direction |
| `o.moonEccentricAnomaly` | E | Eccentric anomaly from Kepler's equation (°) | `OrbitalFormulas.eccentricAnomaly(M, e)` |
| `o.moonDistanceFromEarthKm` | r | Current geocentric distance (km) | 3D distance: `moon.pivotObj` to `earth.pivotObj` |
| `o.moonPhaseAngle` | — | Full 0–360° Sun-Earth-Moon phase angle (°) | 3D positions: Sun, Earth, Moon |
| `o.moonElongation` | — | Angular separation from Sun (0–180°) | `getElongationFromSun(moon)` (pre-existing) |

**Key design difference from planets:** The Moon orbits Earth, not the Sun. The orbit center P is at `moonApsidalPrecession.pivotObj` (offset from Earth by a×e), and Earth replaces the Sun as the gravitational focus in all angle measurements.

**Ascending node extraction:** The ascending node Ω is computed geometrically from the orbit plane normal. The `moonNodalPrecession.containerObj.matrixWorld` encodes all parent transforms (Earth orbital position, apsidal precession through tilted frame, coupling layers). The local Y direction of this matrix gives the orbit normal in world space, from which the line of nodes is derived via cross product with the ecliptic normal (0,1,0).

### 1.5 Earth-Specific Variables

#### 1.5.1 Static Constants

For current values, see [Constants Reference](20-constants-reference.md).

| Variable | Description |
|----------|-------------|
| `earthtiltMean` | Mean obliquity |
| `earthInvPlaneInclinationMean` | Mean orbital inclination to invariable plane |
| `earthInvPlaneInclinationAmplitude` | Amplitude of inclination oscillation |
| `eccentricityBase` | Base eccentricity |
| `eccentricityAmplitude` | Earth's eccentricity amplitude |
| `earthPerihelionICRFYears` | Earth's orbital plane precession against ICRF (H/3) |

#### 1.5.2 Dynamic Orbital Parameters

| Variable | Description |
|----------|-------------|
| `o.earthInvPlaneInclinationDynamic` | Dynamic orbital inclination to invariable plane |
| `o.obliquityEarth` | Dynamic axial tilt (obliquity) |
| `o.eccentricityEarth` | Dynamic orbital eccentricity |
| `o.earthAscendingNodeInvPlane` | Dynamic ascending node to invariable plane |
| `o.earthHeightAboveInvPlane` | Current height above invariable plane (AU) |
| `o.earthAboveInvPlane` | Boolean: is Earth above invariable plane |
| `earthWobbleCenter.sunDistAU` | Current Earth-Sun distance (AU) |

#### 1.5.3 Dynamic Time Variables (Length of Day dependent)

Naming taxonomy: `_Kinematic` = framework kinematic day units; `_Real` = physical LOD (with H/5 ecliptic missing-motion + DT cyclic corrections).

| Variable | Description |
|----------|-------------|
| `o.lodKinematic` | Current epoch-specific kinematic day (SI seconds), = IAU_sid_sec / Fourier sid_days = <!--v:lodKinematicFourierJ2000Seconds-->86,400.000107<!--/v--> s at J2000 (the panel *seconds* basis; the scene's measured-day basis is <!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000427<!--/v--> s; see [doc 11 §Day bases](11-length-day-year-formulas.md#day-types)) |
| `predictions.lodReal` | Physical LOD (Layer 4): `o.lodKinematic + h5Correction + dtCycleLodCorrectionSum`. Displayed as "Solar Day = REAL" in the Predictions panel. |
| `o.siderealDayReal` | Current sidereal day length (SI seconds) |
| `o.stellarDayReal` | Current stellar day length (SI seconds) |
| `o.solarYearDays` | Current solar year length (days) |
| `o.solarYearSeconds` | Current solar year length (SI seconds), = solarYearDays × lodKinematic |
| `o.siderealYearDays` | Current sidereal year length (days) |
| `o.siderealYearSeconds` | Current sidereal year length (SI seconds) — round-trip identity gives IAU value exactly |
| `o.anomalisticYearDays` | Current anomalistic year length (days) |
| `o.anomalisticYearSeconds` | Current anomalistic year length (SI seconds) |
| `o.lengthofAU` | Current length of AU (km) - dynamic |

#### 1.5.4 Dynamic Precession Cycles

| Variable | Description |
|----------|-------------|
| `o.axialPrecession` | Current axial precession cycle (years) — framework identity: H/13 |
| `o.inclinationPrecession` | Apsidal precession beat of date (years) — framework identity: H/3 (the identifier keeps the historical name) |
| `o.perihelionPrecession` | Internal kinematic perihelion beat (years) — framework identity: H/16. The DISPLAYED of-date value is the one-source family's beat (`predictions.perihelionPrecession`) |
| `o.obliquityPrecession` | Current obliquity precession cycle (years) — framework identity: H/8 |
| `o.eclipticPrecession` | Current ecliptic precession cycle (years) — framework identity: H/5 |

#### 1.5.5 Perihelion/Aphelion Dates

| Variable | Description |
|----------|-------------|
| `o.longitudePerihelion` | Computed longitude of perihelion |
| `o.longitudePerihelionDatePer` | Approximate date of perihelion |
| `o.longitudePerihelionDateAp` | Approximate date of aphelion |

---

## Part 2: OrbitalFormulas Reference (by Usage Category)

This section documents all functions in the `OrbitalFormulas` helper object, organized to match the category structure used in `planetStats`. Each category corresponds to a section header in the planet inspector panel.

**Note:** All formulas using GM use the derived constant `GM_SUN` which is calculated from Kepler's 3rd Law using simulation constants (see Part 1, section 1.1.5).

---

### 2.1 General Characteristics

These formulas calculate fundamental properties of celestial bodies.

| Function | Formula | Description |
|----------|---------|-------------|
| `meanDensity(M_kg, R_km)` | ρ = 3M / (4πR³) | Mean density of a body (kg/m³) |
| `keplerPeriod(a_km)` | P = 2π√(a³/GM) | Orbital period from semi-major axis (days) |
| `synodicPeriod(P1_days, P2_days)` | P_syn = \|P₁ × P₂ / (P₁ - P₂)\| | Synodic period between two planets (days) |

**Implementation Note:** Mass (M) and gravitational parameter (GM) for planets are derived from orbital mechanics rather than direct measurement. The chain is Moon → Earth → Sun: `GM_Earth` from the Moon's orbit (with the `Δa = a_M·μ·m` solar-tidal correction, see [doc 24](24-moon-kepler-derivation.md)), then `GM_Sun` from Earth's orbit minus `GM_Earth`. Planet GMs follow from `GM_Sun / massRatio_DE440`.

---

### 2.2 Gravitational Influence Zones

These formulas calculate the gravitational sphere of influence for celestial bodies.

| Function | Formula | Description |
|----------|---------|-------------|
| `hillSphereRadius(a_km, m_body, M_primary)` | r_Hill = a × (m/3M)^(1/3) | Region where body's gravity dominates (km) |
| `sphereOfInfluence(a_km, m_body, M_primary)` | r_SOI = a × (m/M)^(2/5) | Laplace SOI for patched conic approximation (km) |
| `lagrangeL1L2Distance(a_km, m_body, M_primary)` | r_L1 ≈ a × (m/3M)^(1/3) | Approximate L1/L2 distance from smaller body (km) |
| `barycenterDistance(moonDist_km, massRatio)` | d_bary = r/(1 + ratio) | Distance from primary to barycenter (km) |
| `schwarzschildRadius(GM)` | r_s = 2GM/c² | Event horizon radius (km) |
| `tidalForceRatio(M1, M2, r1_km, r2_km)` | ratio = (M₁/M₂) × (r₂/r₁)³ | Compares tidal forces from two bodies |
| `gravitationalPotential(GM, r_km)` | Φ = -GM/r | Gravitational potential energy per unit mass (km²/s²) |
| `tidalAcceleration(GM, r_km, delta_r_km)` | a = 2GM×Δr/r³ | Differential gravitational acceleration (m/s²) |

---

### 2.3 Surface & Physical Properties

These formulas calculate surface-related properties of celestial bodies.

| Function | Formula | Description |
|----------|---------|-------------|
| `surfaceGravity(GM_km3_s2, R_km)` | g = GM/R² | Surface gravitational acceleration (m/s²) |
| `surfaceEscapeVelocity(GM, R_km)` | v_esc = √(2GM/R) | Minimum velocity to escape from surface (km/s) |
| `meanDensity(M_kg, R_km)` | ρ = 3M/(4πR³) | Average density of the body (kg/m³) |

---

### 2.4 Orbital Period & Motion

These formulas calculate orbital timing and angular motion rates.

| Function | Formula | Description |
|----------|---------|-------------|
| `meanMotion(P_days)` | n = 360°/P | Mean angular motion (°/day) |
| `meanMotionFromGM(GM, a_km)` | n = √(GM/a³) | Mean motion from gravitational parameter (rad/s) |
| `keplerPeriod(a_km)` | P = 2π√(a³/GM) | Orbital period from Kepler's 3rd Law (days) |
| `semiMajorAxisFromPeriod(P_seconds, GM)` | a = (GM×P²/4π²)^(1/3) | Semi-major axis from period (km) |
| `synodicPeriod(P1_days, P2_days)` | P_syn = \|P₁P₂/(P₁-P₂)\| | Synodic period between two planets (days) |

---

### 2.5 Orbital Shape & Geometry

These formulas calculate geometric properties of elliptical orbits.

| Function | Formula | Description |
|----------|---------|-------------|
| `semiMinorAxis(a, e)` | b = a × √(1-e²) | Half-width of orbital ellipse (AU) |
| `perihelionDist(a, e)` | q = a × (1-e) | Closest approach to Sun (AU) |
| `aphelionDist(a, e)` | Q = a × (1+e) | Farthest distance from Sun (AU) |
| `semiLatusRectum(a, e)` | p = a × (1-e²) | Orbital radius at ν = 90° (AU) |
| `focalDistance(a, e)` | c = a × e | Distance from ellipse center to focus (AU) |
| `heliocentricDist(a, e, nu_deg)` | r = a(1-e²) / (1+e×cos(ν)) | Distance from orbit equation (AU) |
| `distanceRatioApoPerip(e)` | Q/q = (1+e)/(1-e) | Ratio of aphelion to perihelion distance |
| `radiusOfCurvature(a_km, e, nu_deg)` | ρ = p(1+e²+2e×cos(ν))^1.5 / (1+e×cos(ν))² | Radius of osculating circle (km) |

---

### 2.6 Velocities

These formulas calculate orbital velocities at various points.

| Function | Formula | Description |
|----------|---------|-------------|
| `orbitalVelocity(r_km, a_km)` | v = √(GM(2/r - 1/a)) | Vis-viva equation: instantaneous velocity (km/s) |
| `perihelionVelocity(a_km, e)` | vₚ = √(GM(1+e) / a(1-e)) | Maximum velocity at perihelion (km/s) |
| `aphelionVelocity(a_km, e)` | vₐ = √(GM(1-e) / a(1+e)) | Minimum velocity at aphelion (km/s) |
| `radialVelocity(a_km, e, nu_deg)` | vᵣ = √(GM/p) × e×sin(ν) | Velocity toward/away from Sun (km/s) |
| `transverseVelocity(a_km, e, nu_deg)` | vₜ = √(GM/p) × (1+e×cos(ν)) | Velocity perpendicular to radius (km/s) |
| `escapeVelocity(r_km)` | v_esc = √(2GM/r) | Escape velocity at distance r (km/s) |
| `circularVelocity(r_km)` | v_circ = √(GM/r) | Circular orbit velocity at r (km/s) |
| `velocityRatio(v_km_s, r_km)` | ratio = v / v_circ | Current velocity vs circular velocity |
| `velocityRatioPeriApo(e)` | vₚ/vₐ = (1+e)/(1-e) | Perihelion vs aphelion velocity ratio |

---

### 2.7 Energy & Momentum

These formulas calculate energy and momentum quantities.

| Function | Formula | Description |
|----------|---------|-------------|
| `specificEnergy(a_km)` | ε = -GM/(2a) | Total mechanical energy per unit mass (km²/s²) |
| `specificAngularMomentum(a_km, e)` | h = √(GM × a × (1-e²)) | Angular momentum per unit mass (km²/s) |
| `areaSweepRate(a_km, e)` | dA/dt = h/2 | Kepler's 2nd Law: constant area rate (km²/s) |
| `orbitalEnergyRatio(r_km, a_km)` | ratio = r/a | Position relative to semi-major axis |

---

### 2.8 Orbital Orientation (Ecliptic & Invariable Plane)

These formulas calculate longitude and position parameters.

| Function | Formula | Description |
|----------|---------|-------------|
| `meanLongitude(M_deg, lonPeri_deg)` | L = M + ϖ (mod 360°) | Mean ecliptic longitude (°) |
| `trueLongitude(nu_deg, lonPeri_deg)` | λ = ν + ϖ (mod 360°) | True ecliptic longitude (°) |
| `argumentOfLatitude(omega_deg, nu_deg)` | u = ω + ν | Angle from ascending node in orbital plane (°) |
| `heliocentricLatitude(i_deg, omega_deg, nu_deg)` | sin(β) = sin(i) × sin(u) | Angular distance above/below reference plane (°) |
| `mutualInclination(i1_deg, i2_deg, dOmega_deg)` | cos(I) = cos(i₁)cos(i₂) + sin(i₁)sin(i₂)cos(ΔΩ) | Angle between two orbital planes (°) |

---

### 2.9 Position & Anomalies

These formulas calculate position-related quantities and anomalies.

| Function | Formula | Description |
|----------|---------|-------------|
| `eccentricAnomaly(M_deg, e)` | M = E - e×sin(E) | Newton-Raphson solver for Kepler's equation (°) |
| `flightPathAngle(e, nu_deg)` | tan(γ) = e×sin(ν) / (1+e×cos(ν)) | Angle between velocity and horizontal (°) |
| `trueAnomalyRate(n_deg_day, e, nu_deg)` | dν/dt = n(1+e×cos(ν))² / (1-e²)^1.5 | Rate of change of true anomaly (°/day) |
| `eccentricAnomalyRate(n_deg_day, e, E_deg)` | dE/dt = n / (1-e×cos(E)) | Rate of change of eccentric anomaly (°/day) |
| `phaseAngle(lambda1_deg, lambda2_deg)` | \|λ₁ - λ₂\| | Angular separation as seen from Sun (°) |

---

### 2.10 Time Calculations

These formulas calculate time-related quantities.

| Function | Formula | Description |
|----------|---------|-------------|
| `timeSincePerihelion(P_days, M_deg)` | t = P × M/360° | Days since last perihelion passage |
| `timeToNextPerihelion(P_days, M_deg)` | t = P × (360°-M)/360° | Days until next perihelion passage |

---

### 2.11 Precession & Newtonian Dynamics

These formulas handle precession calculations and secular perturbation theory.

| Function | Formula | Description |
|----------|---------|-------------|
| `precessionRateFromPeriod(period_years)` | Rate = 129,600,000 / P | Convert period to arcsec/century |
| `precessionPeriodFromRate(arcsec_per_century)` | Period = 129,600,000 / Rate | Convert rate to full-cycle period (years) |
| `precessionEclipticToICRF(ecliptic_years, ref_years)` | ICRF = (ecl × ref)/(ref - ecl) | Transform ecliptic to ICRF frame |
| `precessionICRFToEcliptic(ICRF_years, ref_years)` | ecl = (ICRF × ref)/(ICRF + ref) | Transform ICRF to ecliptic frame |
| `holisticPrecessionRatio(prec_period, holistic_year)` | ratio = H / period | Ratio showing resonance structure |
| `precessionFromHolisticRatio(holistic_year, ratio)` | period = H / n | Period from integer ratio |
| `precessionAngularVelocity(arcsec_per_century)` | ω = (rate/100) × (π/648000) | Angular velocity (rad/year) |
| `perturbationStrength(a_p, a_pert, m_pert, M_sun)` | strength = (m/M) × (a_ratio)² | Relative influence of perturbing planet |
| `precessionRatio(rate1_arcsec, rate2_arcsec)` | ratio = rate₁ / rate₂ | Ratio between two precession rates |
| `precessionDecomposition(total, ecliptic)` | {total, ecliptic, perturbations} | Decompose precession into components |
| `holisticRatioDescription(ratio)` | string | Format ratio as readable fraction (e.g., "anchor interval / 4") |

---

### 2.12 Precession Breakdown (Lagrange-Laplace Secular Theory)

Advanced functions for computing secular perturbations.

| Function | Description |
|----------|-------------|
| `laplaceCoefficient_3_2_1(alpha)` | Laplace coefficient b₃/₂⁽¹⁾(α) — used for the diagonal A_ii secular self-precession rate of both inner and outer perturbers |
| `laplaceCoefficient_3_2_2(alpha)` | Laplace coefficient b₃/₂⁽²⁾(α) — helper for off-diagonal A_ij eigenvector-mixing terms; not used by the current breakdown display |
| `eccentricityCorrectionFactor(e_planet, e_perturber)` | First-order eccentricity correction (≈1.0) |
| `inclinationCorrectionFactor(i_mutual_deg)` | g(I) = cos(I_mutual) |
| `meanMotionRadPerYear(period_days)` | Mean motion in rad/year |
| `secularPrecessionContribution(...)` | Full secular precession calculation (arcsec/century) |

The `secularPrecessionContribution` function implements Lagrange-Laplace secular perturbation theory with parameters:
- `n_rad_per_year` - Mean motion of perturbed planet
- `m_perturber` - Mass of perturbing planet (kg)
- `M_sun` - Mass of Sun (kg)
- `a_planet_km`, `a_perturber_km` - Semi-major axes
- `e_planet`, `e_perturber` - Eccentricities
- `i_planet_deg`, `i_perturber_deg` - Inclinations
- `deltaOmega_deg` - Ascending node difference

**Reference:** Murray & Dermott (1999), *Solar System Dynamics*, Chapter 7

---

# Appendix: Extended Formula Documentation

> **Note:** The sections below expand Part 2's one-line entries with full derivations, worked values, and physical interpretation. Section labels (A.5, A.6, A.8) are stable identifiers referenced from other documents.

---

## A.5 Part 2 Formulas - Advanced Calculations

### A.5.1 Mass Calculations

#### 7.1.1 Sun's Mass (M☉)

**Formula:** `M_SUN = GM_SUN / G`

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

#### 7.1.2 Earth's Mass (M⊕)

**Formula:** `M_EARTH_ALONE = GM_EARTH_ALONE / G`

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
// Earth-Moon mass ratio ≈ 81.30 (DE440 SPICE kernel)
// Earth is 81.3 times more massive than Moon
const MASS_RATIO_EARTH_MOON = 81.30056816;

// Earth's fraction: ratio / (ratio + 1) ≈ 0.9879
// Moon's fraction: 1 / (ratio + 1) ≈ 0.0121
```

**Step 3: Earth's own GM and mass**

The Sun's effect enters upstream, as the `moonOrbitalShift` distance
correction (the Sun's tidal coupling to the Earth–Moon barycentric wobble,
closing G(M_E+M_M) to ~3.7 ppm of DE440), so the separation is a pure mass-
ratio split with no further divisor (`tools/lib/constants.js`,
`packages/physics/src/model.js`):

```javascript
// Earth's gravitational parameter: the system GM times Earth's mass fraction
const GM_EARTH_ALONE = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1));
// Result: ~398,600 km³/s² (matches JPL value)

// Earth's mass derived from gravitational parameter (kg)
// M_EARTH_ALONE = GM_EARTH_ALONE / G ≈ 5.97 × 10²⁴ kg
const M_EARTH_ALONE = GM_EARTH_ALONE / G_CONSTANT;
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

#### 7.1.3 Moon's Mass (M☽)

**Formula:** `M_MOON_ALONE = GM_MOON_ALONE / G`

**Derivation:**

The Moon's gravitational parameter uses the same Earth-Moon system GM and solar perturbation correction:

```javascript
// Moon's gravitational parameter (km³/s²)
// GM_Moon = GM_system / (ratio + 1) with same solar perturbation correction
// The entire GM_EARTH_MOON_SYSTEM is affected by solar perturbation
const GM_MOON_ALONE = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1)
              / (1 - moonAtApogee / meanAUDistance);
// Result: ~4,902.8 km³/s² (matches GRAIL value)

// Moon's mass derived from gravitational parameter (kg)
// M_MOON_ALONE = GM_MOON_ALONE / G ≈ 7.35 × 10²² kg
const M_MOON_ALONE = GM_MOON_ALONE / G_CONSTANT;
```

**Display:** Added to Moon's planetStats
- Label: `Mass (M☽)`
- Value: `7.35 × 10²² kg`
- Hover: `Derived from Earth-Moon mass ratio and Kepler's 3rd Law, with solar perturbation correction`

### A.5.2 Escape Velocity

#### 7.2.1 Escape Velocity from Sun (at current distance)

**Symbol:** v_esc

**Formula:** `v_esc = √(2GM/r)`

**Physical Meaning:** The minimum velocity needed to escape the Sun's gravitational influence from the planet's current position.

```javascript
// Escape velocity from Sun at distance r (km/s)
escapeVelocity: (r_km) => Math.sqrt(2 * GM_SUN / r_km)
```

#### 7.2.2 Circular Orbit Velocity (for comparison)

**Symbol:** v_circ

**Formula:** `v_circ = √(GM/r)`

**Physical Meaning:** The velocity needed for a circular orbit at the current distance.

```javascript
// Circular orbit velocity at distance r (km/s)
circularVelocity: (r_km) => Math.sqrt(GM_SUN / r_km)
```

**Note:** `v_esc = √2 × v_circ` always (factor of √2 ≈ 1.414)

#### 7.2.3 Velocity Ratio (v/v_circ)

**Symbol:** v/v_circ

**Formula:** `velocityRatio = v / v_circ`

**Physical Meaning:** How the current velocity compares to a circular orbit:
- `= 1.0`: Circular orbit
- `> 1.0`: Moving faster (near perihelion)
- `< 1.0`: Moving slower (near aphelion)
- `≥ √2`: Escape velocity reached

### A.5.3 Kepler's Laws Verification

#### 7.3.1 Orbital Period from Kepler's 3rd Law

**Formula:** `P = 2π√(a³/GM)`

**Purpose:** Verify that our input orbital periods match what Kepler's 3rd Law predicts.

**Implementation:** `keplerPeriod(a_km)`

#### 7.3.2 Area Sweep Rate (Kepler's 2nd Law)

**Symbol:** dA/dt

**Formula:** `dA/dt = h/2`

**Physical Meaning:** The rate at which the radius vector sweeps out area. Constant for each planet (equal areas in equal times).

```javascript
// Area sweep rate (km²/s)
areaSweepRate: (a_km, e) => OrbitalFormulas.specificAngularMomentum(a_km, e) / 2
```

### A.5.4 3D Position Formulas

#### 7.4.1 Heliocentric Latitude (β)

**Symbol:** β (beta)

**Formula:** `sin(β) = sin(i) × sin(u)` where `u = ω + ν`

**Physical Meaning:** Angular distance above or below the invariable plane.

**Implementation:** (uses dynamic inclination)

**Usage:** All planets now use dynamic inclination (`o.<planet>InvPlaneInclinationDynamic`) instead of fixed J2000 values. This ensures heliocentric latitude reflects the oscillating inclination over secular timescales.

```javascript
// Heliocentric latitude to invariable plane (degrees)
// Uses dynamic inclination that oscillates with ascending node precession
heliocentricLatitude: (inclination_deg, omega_deg, nu_deg) => {
  const i = inclination_deg * Math.PI / 180;
  const u = (omega_deg + nu_deg) * Math.PI / 180;
  return Math.asin(Math.sin(i) * Math.sin(u)) * 180 / Math.PI;
}

// Example usage in planetStats:
OrbitalFormulas.heliocentricLatitude(o.mercuryInvPlaneInclinationDynamic, o.mercuryArgumentOfPeriapsis, o.mercuryTrueAnomaly)
```

### A.5.5 Inter-Planetary Calculations

#### 7.5.1 Generalized Synodic Period

**Formula:** `P_syn = |P₁ × P₂ / (P₁ - P₂)|`

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

#### 7.5.2 Phase Angle Between Planets

**Symbol:** α

**Formula:** `α = |λ₁ - λ₂|` (difference in true longitudes)

**Physical Meaning:** Angular separation between two planets as seen from the Sun.

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

### A.5.6 Time-Based Calculations

#### 7.6.1 True Anomaly Rate

**Symbol:** dν/dt

**Formula:** `dν/dt = n × (1 + e×cos(ν))² / (1 - e²)^(3/2)`

**Physical Meaning:** How fast the true anomaly changes. NOT constant - fastest at perihelion, slowest at aphelion.

```javascript
// True anomaly rate (degrees/day)
trueAnomalyRate: (n_deg_day, e, nu_deg) => {
  const nu = nu_deg * Math.PI / 180;
  const factor = Math.pow(1 + e * Math.cos(nu), 2) / Math.pow(1 - e * e, 1.5);
  return n_deg_day * factor;
}
```

#### 7.6.2 Eccentric Anomaly Rate

**Symbol:** dE/dt

**Formula:** `dE/dt = n / (1 - e×cos(E))`

**Physical Meaning:** Rate of change of eccentric anomaly.

```javascript
// Eccentric anomaly rate (degrees/day)
eccentricAnomalyRate: (n_deg_day, e, E_deg) => {
  const E = E_deg * Math.PI / 180;
  return n_deg_day / (1 - e * Math.cos(E));
}
```

### A.5.7 Radius of Curvature

**Symbol:** ρ (rho)

**Formula:** `ρ = p × (1 + e² + 2e×cos(ν))^(3/2) / (1 + e×cos(ν))²`

**Physical Meaning:** The radius of the osculating circle (the circle that best fits the orbit at the current point). Largest at aphelion, smallest at perihelion.

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

### A.5.8 Orbital Mechanics Ratios

#### 7.8.1 Eccentricity-Based Velocity Ratio

**Symbol:** v_p/v_a

**Formula:** `v_p / v_a = (1 + e) / (1 - e)`

**Physical Meaning:** How much faster a planet moves at perihelion vs aphelion.

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

#### 7.8.2 Eccentricity-Based Distance Ratio

**Symbol:** Q/q

**Formula:** `Q / q = (1 + e) / (1 - e)`

**Physical Meaning:** The ratio of aphelion distance to perihelion distance. Same formula as velocity ratio (conservation of angular momentum).

```javascript
// Distance ratio aphelion vs perihelion
// Q/q = (1 + e) / (1 - e)
distanceRatioApoPerip: (e) => (1 + e) / (1 - e)
```

#### 7.8.3 Orbital Energy Ratio

**Symbol:** r/a

**Formula:** `ratio = r / a`

**Physical Meaning:** Current distance relative to semi-major axis:
- `< 1`: Closer than semi-major axis (between perihelion and semi-major axis point)
- `= 1`: At semi-major axis distance
- `> 1`: Farther than semi-major axis (between semi-major axis point and aphelion)

```javascript
// Orbital Energy Ratio (dimensionless)
orbitalEnergyRatio: (r_km, a_km) => r_km / a_km
```

### A.5.9 Inverse Kepler Formulas

#### 7.9.1 Semi-major Axis from Period

**Symbol:** a

**Formula:** `a = (GM × P² / 4π²)^(1/3)`

**Physical Meaning:** Given an orbital period, calculate the required semi-major axis. Inverse of Kepler's 3rd Law.

```javascript
// Semi-major Axis from Period (km)
// a = (GM × P² / 4π²)^(1/3)
// Inverse of Kepler's 3rd Law
semiMajorAxisFromPeriod: (P_seconds, GM) => {
  return Math.pow(GM * P_seconds * P_seconds / (4 * Math.PI * Math.PI), 1/3);
}
```

#### 7.9.2 Mean Motion from GM

**Symbol:** n

**Formula:** `n = √(GM / a³)`

**Physical Meaning:** Angular velocity in radians per second, derived directly from GM rather than orbital period.

```javascript
// Mean Motion from GM (rad/s)
// n = √(GM / a³)
// Angular velocity in radians per second
meanMotionFromGM: (GM, a_km) => Math.sqrt(GM / Math.pow(a_km, 3))
```

### A.5.10 Tidal Effects

#### 7.10.1 Tidal Acceleration

**Symbol:** a_tidal

**Formula:** `a_tidal = 2 × GM × Δr / r³`

**Physical Meaning:** The differential gravitational acceleration across an extended body. This causes tidal stretching - the near side experiences stronger gravity than the far side.

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
- Δr = 6,371 km (Earth's radius — center to surface)
- Result: ~1.1 × 10⁻⁶ m/s² differential acceleration between Earth's center and surface

---

## A.6 Part 3 Formulas - Gravitational Influence & Surface Properties

### A.6.1 Current GM and Mass Values (Implemented)

For the derivation of `GM_Earth`, `GM_Moon`, and `GM_Sun` from the Moon's and Earth's orbits — including the `Δa = a_M · μ · m` correction that closes the Earth-Moon-Sun three-body residual — see [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md).

#### 8.1.1 Derived from Kepler's 3rd Law

| Body | GM (km³/s²) | Mass (kg) | Derivation Method |
|------|-------------|-----------|-------------------|
| **Sun** | 132,712,430,441 | 1.988 × 10³⁰ | Kepler from Earth's orbit minus GM_Earth (M_Sun only; matches JPL DE440 to 0.07 ppm) |
| **Earth** | 398,601.91 | 5.972 × 10²⁴ | Moon's orbit with Δa = a_M·μ·m correction (matches JPL DE440 to 3.7 ppm) |
| **Moon** | 4,902.82 | 7.346 × 10²² | Same Δa correction, split via M_M/(M_E+M_M) (matches DE440 to 3.7 ppm) |

#### 8.1.2 Derived from Sun/Planet Mass Ratios

| Body | Mass Ratio (Sun/Planet) | GM (km³/s²) | Mass (kg) |
|------|------------------------|-------------|-----------|
| **Mercury** | <!--v:mercuryMassRatioDE440-->6,023,657.94<!--/v--> | ~22,032 | ~3.30 × 10²³ |
| **Venus** | <!--v:venusMassRatioDE440-->408,523.72<!--/v--> | ~324,859 | ~4.87 × 10²⁴ |
| **Mars** | <!--v:marsMassRatioDE440-->3,098,703.59<!--/v--> | ~42,828 | ~6.42 × 10²³ |
| **Jupiter** | <!--v:jupiterMassRatioDE440-->1,047.348625<!--/v--> | ~126,712,756 | ~1.90 × 10²⁷ |
| **Saturn** | <!--v:saturnMassRatioDE440-->3,497.9018<!--/v--> | ~37,940,582 | ~5.69 × 10²⁶ |
| **Uranus** | <!--v:uranusMassRatioDE440-->22,902.944<!--/v--> | ~5,794,558 | ~8.68 × 10²⁵ |
| **Neptune** | <!--v:neptuneMassRatioDE440-->19,412.237<!--/v--> | ~6,836,535 | ~1.02 × 10²⁶ |
| **Pluto** | <!--v:plutoMassRatioDE440-->136,045,556<!--/v--> | ~975 | ~1.46 × 10²² |

#### 8.1.3 Small Bodies (Direct Measurements/Estimates)

| Body | GM (km³/s²) | Mass (kg) | Measurement Method |
|------|-------------|-----------|-------------------|
| **Halley's Comet** | ~1.47 × 10⁻⁵ | ~2.2 × 10¹⁴ | Estimated from size/density |
| **433 Eros** | ~4.46 × 10⁻⁴ | 6.687 × 10¹⁵ | NEAR Shoemaker (precise) |

### A.6.2 Gravitational Influence Zones

#### 8.2.1 Hill Sphere Radius

**Symbol:** r_Hill

**Formula:** `r_Hill = a × (m / 3M)^(1/3)`

**Physical Meaning:** The region around a body where its gravity dominates over the primary's gravity. Satellites must orbit within this radius to remain bound.

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

#### 8.2.2 Sphere of Influence (Laplace)

**Symbol:** r_SOI

**Formula:** `r_SOI = a × (m / M)^(2/5)`

**Physical Meaning:** The region where the body's gravitational influence is stronger than the perturbation from the primary. Used in patched conic approximation for spacecraft trajectories.

```javascript
sphereOfInfluence: (a_km, m_body, M_primary) => {
  return a_km * Math.pow(m_body / M_primary, 2/5);
}
```

#### 8.2.3 Lagrange Point Distances (L1 and L2)

**Formula (approximate):** `r_L1 ≈ r_L2 ≈ a × (m / 3M)^(1/3)`

Same formula as Hill sphere radius.

**Implementation:** `lagrangeL1L2Distance()`

### A.6.3 Surface & Physical Properties

#### 8.3.1 Surface Gravity

**Symbol:** g

**Formula:** `g = GM / R²`

**Physical Meaning:** Gravitational acceleration at the surface.

**Implementation:** (using diameters object for radii)
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

#### 8.3.2 Surface Escape Velocity

**Symbol:** v_esc_surface

**Formula:** `v_esc = √(2GM/R)`

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

#### 8.3.3 Mean Density

**Symbol:** ρ

**Formula:** `ρ = M / V = 3M / (4πR³)`

```javascript
meanDensity: (M_kg, R_km) => {
  const R_m = R_km * 1000;
  const V = (4/3) * Math.PI * Math.pow(R_m, 3);
  return M_kg / V;
}
```

### A.6.4 Orbital Energy & Dynamics

#### 8.4.1 Gravitational Potential at Distance

**Symbol:** Φ

**Formula:** `Φ = -GM/r`

```javascript
gravitationalPotential: (GM, r_km) => -GM / r_km
```

#### 8.4.2 Orbital Energy Ratio

**Formula:** `ε/ε_circ = r/a`

```javascript
orbitalEnergyRatio: (r_km, a_km) => r_km / a_km
```

### A.6.5 Three-Body Dynamics

#### 8.5.1 Barycenter Distance from Earth Center

**Symbol:** d_bary

**Formula:** `d_bary = moonDistance / (1 + MASS_RATIO_EARTH_MOON)`

**Physical Meaning:** Distance from Earth's center to the Earth-Moon barycenter.

**Result:** ~4,670 km (inside Earth, which has radius ~6,371 km)

```javascript
barycenterDistance: () => moonDistance / (1 + MASS_RATIO_EARTH_MOON)
```

#### 8.5.2 Tidal Force Ratio (Sun vs Moon on Earth)

**Formula:** `F_Sun / F_Moon = (M_Sun / M_Moon) × (r_Moon / r_Sun)³`

**Expected Result:** ~0.46 (Sun's tidal force is about 46% of Moon's)

### A.6.6 Schwarzschild Radius (Theoretical)

**Symbol:** r_s

**Formula:** `r_s = 2GM / c²`

**Physical Meaning:** The radius at which escape velocity equals speed of light. If all mass were compressed within this radius, it would form a black hole.

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

## A.8 Precession & Newtonian Dynamics

This section documents the perihelion precession formulas - purely Newtonian mechanics derived from observed precession rates.

### Method overview

| Method | Used in UI |
|--------|:----------:|
| `precessionRateFromPeriod` | ✅ |
| `precessionPeriodFromRate` | — |
| `precessionEclipticToICRF` | ✅ |
| `precessionICRFToEcliptic` | — |
| `holisticPrecessionRatio` | ✅ |
| `precessionFromHolisticRatio` | — |
| `precessionAngularVelocity` | ✅ |
| `perturbationStrength` | — |
| `precessionDecomposition` | — |
| `precessionRatio` | — |

**Note:** Methods marked — are utility/inverse functions available for calculations but not displayed in planetStats.

### 10.1 Precession Rate Fundamentals

#### 10.1.1 Precession Rate from Period

**Symbol:** ω̇ (omega-dot)

**Formula:** `precessionRate = 1,296,000 / period_years × 100`

**Simplified:** `precessionRate = 129,600,000 / period_years`

**Where:**
- <!--v:arcsecInCircle-->1,296,000<!--/v--> = 360° × 3600 arcsec/degree (full circle in arcseconds)
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

**Example Values:** For current precession periods and their H-based formulas, see [Constants Reference — Perihelion Precession Periods](20-constants-reference.md#perihelion-precession-periods-ecliptic). Rates are computed as `129,600,000 / period`.

#### 10.1.2 Precession Period from Rate

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

### 10.2 Reference Frame Transformations

#### 10.2.1 Ecliptic to ICRF Transformation

**Formula:** `ICRF_period = (ecliptic_period × reference_period) / (ecliptic_period - reference_period)`

**Where:**
- `ecliptic_period` = precession period against the ecliptic
- `reference_period` = nodal precession period (H/13)

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
- Ecliptic period: ~<!--v:mercuryPeriPeriod-->243,867<!--/v--> years
- Reference (the J2000 axial precession period): <!--v:axialPrecRound-->~25,771<!--/v--> years
- ICRF period: ~<!--v:mercuryPeriPeriodICRF-->28,844<!--/v--> years

#### 10.2.2 ICRF to Ecliptic Transformation

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

### 10.3 Earth Fundamental Cycle Relationships

#### 10.3.1 Precession Ratio to Earth Fundamental Cycle

**Formula:** `ratio = holisticyearLength / precession_period`

**Physical Meaning:** Shows how precession periods relate to the Earth Fundamental Cycle (H).

**Observed Patterns:**
| Planet | Ratio | Expression |
|--------|-------|------------|
| Mercury | 1.375 | holisticyearLength / (1+3/8) |
| Venus | -0.75 | -holisticyearLength × 8/6 (retrograde) |
| Earth | 16 | holisticyearLength / 16 |
| Mars | 4.5 | holisticyearLength / (4+4/8) |
| Jupiter | 4.875 | holisticyearLength / (4+7/8) |
| Saturn | -8.125 | -holisticyearLength / (8+1/8) (retrograde) |
| Uranus | 3 | holisticyearLength / 3 |
| Neptune | ~0.5 | holisticyearLength * 2 |

**Implementation:**
```javascript
// Ratio of Earth Fundamental Cycle to precession period
// Shows resonance structure in Newtonian precession
holisticPrecessionRatio: (precession_period, holistic_year) => {
  if (precession_period === 0) return Infinity;
  return holistic_year / precession_period;
}
```

#### 10.3.2 Precession Period from Holistic Ratio

**Formula:** `precession_period = holisticyearLength / n`

**Where:** `n` is the ratio (positive for prograde, negative for retrograde)

**Implementation:**
```javascript
// Precession period from Earth Fundamental Cycle ratio
// period = holisticyearLength / n
precessionFromHolisticRatio: (holistic_year, ratio) => {
  if (ratio === 0) return Infinity;
  return holistic_year / ratio;
}
```

### 10.4 Newtonian Perturbation Analysis

#### 10.4.1 Angular Momentum Precession Rate

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

#### 10.4.2 Perturbation Strength Estimate

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

### 10.5 Precession Decomposition

#### 10.5.1 Total Observed Precession

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

#### 10.5.2 Precession Ratio Between Planets

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

### 10.6 Current Precession Values (Implemented)

For current computed values, see [Constants Reference](20-constants-reference.md).

| Planet | Ecliptic Period | ICRF Period | Holistic Ratio |
|--------|-----------------|-------------|----------------|
| **Mercury** | `mercuryPerihelionEcliptic` | derived | 8Y / 11 (Y = the anchor interval; device) |
| **Venus** | `venusPerihelionEcliptic` | derived | −8Y / 6 (retrograde) |
| **Earth** | H/16 | derived | 16 |
| **Mars** | `marsPerihelionEcliptic` | derived | 8Y / 36 |
| **Jupiter** | `jupiterPerihelionEcliptic` | derived | 8Y / 39 |
| **Saturn** | `saturnPerihelionEcliptic` | derived | −8Y / 65 (retrograde) |
| **Uranus** | `uranusPerihelionEcliptic` | derived | H / 3 |
| **Neptune** | `neptunePerihelionEcliptic` | derived | H × 2 |

**Note:** Venus and Saturn both precess retrograde in the ecliptic frame (opposite to orbital motion).

### 10.7 Formula Quick Reference

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
z_max = sin(i_inv)          Mean maximum height above invariable plane (AU)
                            (Actual max varies slightly with eccentricity:
                             at perihelion: z_max = (1-e)·sin(i_inv)
                             at aphelion:   z_max = (1+e)·sin(i_inv))
β = arcsin(sin(i_inv)·sin(u)) Heliocentric latitude
```

### Inclination Oscillation (ICRF perihelion approach)
```
i(t) = mean + A·cos(ω̃_ICRF(t) - cycleAnchor)   Dynamic inclination to invariable plane

Where:
  mean        = <planet>InvPlaneInclinationMean      Laplace-Lagrange midpoint
  A           = <planet>InclinationAmplitude          Half of oscillation range
  ω̃_ICRF(t)  = Current ICRF perihelion longitude (ecliptic rate - general precession H/13)
  cycleAnchor = <planet>InclinationCycleAnchor        ICRF perihelion where MAX occurs (at balanced year)

Mean derivation:
  mean = i_J2000 - A·cos(ω̃_J2000 - cycleAnchor)    From known J2000 constraint

Note: Saturn is anti-phase (cos sign flipped): MAX inclination at balanced year,
      while all other planets are at MIN.
```

---

## Appendix B: Variable Cross-Reference

### Static Constants by Planet

For current values, see [Constants Reference](20-constants-reference.md).

| Planet | Eccentricity | Inclination (inv) | Semi-major (AU) | Period (days) |
|--------|--------------|-------------------|-----------------|---------------|
| Mercury | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Venus | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Earth | dynamic | dynamic | 1.000 | `meanSolarYearDays` |
| Mars | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Jupiter | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Saturn | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Uranus | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Neptune | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |
| Pluto | `orbitalEccentricityBase` | `invPlaneInclinationMean` | derived | `solarYearInput` |

**How values are sourced:**
- **Eccentricity**: Derived at runtime from balanced-year phase (`planets.{name}.orbitalEccentricityBase`)
- **Inclination (inv)**: Derived from the retired ψ formula (see [doc 10, the six relations — historical record](10-fibonacci-laws.md))
- **Semi-major axis**: Derived from period via Kepler's 3rd Law: `a = (H / solarYearCount)^(2/3)` where `solarYearCount = round(H × meanSolarYearDays / solarYearInput)` — the integer number of orbits in one H (doc 20 § Quantization)
- **Period**: Input constant per planet (`planets.{name}.solarYearInput`)

> **Display note (post-K5).** These device constants remain the scene-scaffold
> and no-chain-body parameters. The planetStats "Orbital Period & Motion" rows
> for the seven chain planets no longer display them: they read the chain's
> measured window mean motion (governed artifact `windowElementRates`,
> deg per Julian year, window 1800–2100) — P = 360°/n, synodic =
> 360°/|n_planet − n_Earth|, orbits-per-H a derived non-integer. The integer
> orbit counts survive only for Pluto/Halley/Eros, where the geometric device
> is the model path (doc 31).

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
- `EclipticInclinationDynamic` - Ecliptic inclination to ecliptic
- `EclipticInclinationSouamiSouchayDynamic` - Ecliptic inclination (S&S method)
- `InvPlaneInclinationDynamic` - Dynamic inclination to invariable plane (oscillates)

Plus `{planet}.sunDistAU` for current heliocentric distance.

### Moon Live Variables

The Moon has its own set of `o.moon*` variables computed by `updateMoonOrbitalElements()`, using Earth as the gravitational focus:

| Variable | Symbol | Description |
|----------|--------|-------------|
| `o.moonAscendingNode` | Ω | Ascending node on ecliptic (°) |
| `o.moonDescendingNode` | — | Descending node on ecliptic (°) |
| `o.moonLongitudeOfPerigee` | ϖ | Longitude of perigee (°) |
| `o.moonArgumentOfPerigee` | ω | Argument of perigee (°) |
| `o.moonTrueAnomaly` | ν | True anomaly (°) |
| `o.moonMeanAnomaly` | M | Mean anomaly (°) |
| `o.moonEccentricAnomaly` | E | Eccentric anomaly (°) |
| `o.moonDistanceFromEarthKm` | r | Geocentric distance (km) |
| `o.moonPhaseAngle` | — | Full phase angle 0–360° (°) |
| `o.moonElongation` | — | Elongation from Sun 0–180° (°) |

The Moon POSITION tab (tab 2) also displays derived values using `OrbitalFormulas` helpers with lunar parameters:
- Mean/True Longitude (L, λ), Argument of Latitude (u), Flight Path Angle (γ)
- Ecliptic Latitude (β), True/Eccentric Anomaly Rates (dν/dt, dE/dt)
- Radius of Curvature (ρ), Time since/to perigee
- Lunar age (days since New Moon), Lunar phase name (8 traditional phases)
