---
docVersion: 1.0
modelVersion: v26.7
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# Orbital Formulas Reference

## Overview

This document provides a complete reference for all orbital calculation functions available in the solar system simulation, including input variables, the `OrbitalFormulas` helper library, and implementation details.

**Related Documents:**
- [Dynamic Orbital Elements Overview](04-orbital-elements.md) - How dynamic systems work together

---

## Part 1: Available Input Variables

### 1.1 Global Constants

#### 1.1.1 Time & Distance Constants

For current values, see [Constants Reference](20-constants-reference.md).

| Variable | Description |
|----------|-------------|
| `meansolaryearlengthinDays` | Mean solar (tropical) year in days — derived from the IAU sidereal year and p_A (`computeMeanTropicalYearJ2000Days`) |
| `meansiderealyearlengthinSeconds` | Mean sidereal year in seconds (derived: `siderealYearJ2000 × 86400`) |
| `meanlengthofday` | Mean solar day in SI seconds |
| `meanSiderealday` | Mean sidereal day in SI seconds (derived) |
| `meanStellarday` | Mean stellar day in SI seconds (derived) |
| `meanAnomalisticYearinDays` | Mean anomalistic year in days (derived) |
| `speedofSuninKM` | Earth's orbital speed around Sun (km/h) |
| `currentAUDistance` / `o.lengthofAU` | Astronomical Unit in km (dynamic) |
| `lightYear` | Light year in km (derived) |

> **ESSRT epoch dependence.** The variables above (`meansolaryearlengthinDays`, `meansiderealyearlengthinSeconds`, `meanlengthofday`, `meanSiderealday`, `meanStellarday`, `meanAnomalisticYearinDays`) hold **J2000-anchored values** — the model's primary calibration anchor. Under the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md), the day and year values are epoch-dependent: the spin-tier periods follow the composed lunisolar precession period under Driver 1 (Earth-Moon tidal evolution → LOD growth) and the sidereal year in seconds shifts under Driver 2 (solar mass loss → Kepler's 3rd law). (The fitted anchor unit `holisticyearLength` that once headed this table is deleted — plan 09 step 7c; `model-version.json` `_v24Note`.) For deep-time / Phanerozoic / Hadean work, replace the day/year globals with the corresponding `mean*AtAge(t_Ma)` helpers in `src/script.js` (`meanLunisolarPrecessionPeriodYearsAtAge`, `meanLodSecondsAtAge`, `meanSiderealYearSecondsAtAge`, `meanTropicalYearSecondsAtAge`, etc.) — see [Doc 20 § "ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the complete J2000-constant → helper map.

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

The chain is **Earth/Moon → Sun**, because Kepler's 3rd law on Earth's orbit returns G(M_Sun + M_Earth), not GM_Sun alone. We back out GM_Sun by subtracting GM_Earth (which itself comes from the Moon's orbit with the `Δa = a_M·μ·m` solar-tidal correction). ONE home since plan 13 B3: `@essrt/physics/earth/mass-chain` (`computeMassChainJ2000`; the Moon's J2000 periods beside it, `computeMoonPeriodsJ2000`) — the package model, the Node constants module and the browser read the same function.

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

For the full derivation including the physical interpretation of the Δa correction, see [24 — Moon Kepler Derivation](24-delta-a-mass-derivation.md).

**Advantages of deriving GM:**
- Self-consistent with simulation's orbital mechanics
- No external GM constant needed
- Automatically adjusts if AU, year length, or Moon orbit parameters change

**Note:** The gravitational constant `G` alone is not needed for orbital mechanics. All velocity, energy, and momentum formulas use the combined `GM` (gravitational parameter), not G and M separately.

### 1.2 Per-Planet Static Constants

For each planet (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune):

For current values, see [Constants Reference](20-constants-reference.md).

The seven planets' live elements of date come from the N-body chain (`_chainElementsOfDate`), not from these constants. The constants are the J2000 catalogue inputs the chain is anchored on, the scene scaffolding's device parameters, and derived display values.

| Variable Pattern | Description |
|------------------|-------------|
| `{planet}SolarYearInput` | Orbital period input (days; `astro-reference.json`) |
| `{planet}OrbitalEccentricity` | J2000 eccentricity (catalogue input; the chain's eccentricity of date is the live value) |
| `{planet}EclipticInclinationJ2000` | J2000 orbital inclination to the ecliptic (catalogue input) |
| `{planet}OrbitDistance` | Semi-major axis (a) in AU (derived) |
| `{planet}PerihelionDistance` | Distance at perihelion |
| `{planet}Speed` | Mean orbital velocity (km/h) |
| `{planet}PerihelionEcliptic` | The chain's inertial apsidal period, 1,296,000/g (years) |
| `{planet}Tilt` | Axial tilt |
| `{planet}RotationPeriod` | Sidereal rotation period (hours) |
| `planets.{planet}.ascendingNodeInvPlane` | The closed-form J2000 node on the invariable plane — a reference derivation, `planetOrbitalElements.<p>.ascendingNodeInvPlaneClosedForm` in `astro-reference.json` since plan 11 step 2 (the Node twin keeps the field name); the chain planets' node of date is the chain's ([doc 20 § Ascending Nodes](20-constants-reference.md#ascending-nodes-on-the-invariable-plane-at-j2000)) |
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
| `o.{planet}AscendingNodeInvPlane` | `o.mercuryAscendingNodeInvPlane` | The chain's ascending node of date on the invariable plane | Live |
| `o.{planet}HeightAboveInvPlane` | `o.mercuryHeightAboveInvPlane` | Current height above/below the invariable plane (AU) — the exact projection of the chain's heliocentric vector | Live |
| `o.{planet}AboveInvPlane` | `o.mercuryAboveInvPlane` | Boolean: is the planet currently above the invariable plane | Live |
| `o.{planet}EclipticInclinationDynamic` | `o.mercuryEclipticInclinationDynamic` | The chain's inclination of date to the ecliptic | Live |
| `o.{planet}InvPlaneInclinationDynamic` | `o.mercuryInvPlaneInclinationDynamic` | The chain's inclination of date to the invariable plane | Live |

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
| `moonSynodicMonth` | Synodic month (derived; the anomalistic and draconic months come from the lunar month chain, `@essrt/physics/moon/month-chain`) |
| `moonTropicalMonth` | Tropical month, used for orbital speed (derived) |
| `moonDistance` | Mean Earth-Moon distance (km) |
| `moonEclipticInclinationJ2000` | Orbital inclination to ecliptic |
| `moonOrbitalEccentricity` | Eccentricity |
| `moonTilt` | Axial tilt |
| `moonStartposNodal` | Nodal precession start position (calibration) |
| `moonStartposApsidal` | Apsidal precession start position (calibration) |

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

Earth carries no scene-side static constants: its J2000 obliquity and
elements are the `astro-reference.json` inputs ([Constants
Reference](20-constants-reference.md)), the rendered obliquity of date is the
hybrid integration, the published inclination and node are the engine's
one-source orbit normal, the published eccentricity is the N-body series,
and the published apsidal period is `inclPrecYears`. The scene's world frame
is the J2000 ecliptic (`@essrt/physics` `computeSceneWorldFrameJ2000`) and
the Earth frame is placed from the engine every frame; the Wobble marker's
display radius is the scene literal `WOBBLE_MARKER_RADIUS_SCENE_UNITS`.

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

Naming taxonomy: `lodKinematic` = the kinematic day of date (the Layer-0 tidal mean length of day, the year laws' denominator in days); `lodReal` = the physical LOD on the tidal history with the ΔT stack (`computeLodRealSecondsAtEpoch`). The day bases are named in [doc 11 §Day bases](11-length-day-year-formulas.md#day-types).

| Variable | Description |
|----------|-------------|
| `o.lodKinematic` | Current epoch-specific kinematic day (SI seconds), the Layer-0 tidal mean LOD of date = <!--v:lodKinematicFourierJ2000Seconds-->86,400.000000<!--/v--> s at J2000 — ω₀, the SI day (plan 09: ONE J2000 day basis; the scene's day basis <!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000000<!--/v--> s is the same day; see [doc 11 §Day bases](11-length-day-year-formulas.md#day-types)) |
| `predictions.lodReal` | Physical LOD: `computeLodRealSecondsAtEpoch(year)` — the tidal history with the ΔT stack. Displayed as the solar day in the Predictions panel. |
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
| `o.axialPrecession` | The clock of date: the beat of the sidereal and tropical year laws (`computeAxialPrecessionYears`) |
| `o.inclinationPrecession` | The apsidal beat of the year laws, anomalistic/(anomalistic − sidereal) (years; the identifier keeps the historical name) |
| `o.perihelionPrecession` | The kinematic perihelion-of-date beat, anomalistic/(anomalistic − solar) (years). The DISPLAYED of-date value is the one-source family's beat (`predictions.perihelionPrecession`) |
| `predictions.eclipticPrecession` | The displayed nodal period of date — the chain's, `_chainNodeInvPlanePeriodYears('earth', jd)` |

The published obliquity period is the beat of the spin axis's inertial rate
against the nodal mode (`obliqBeatJ2000Kyr`; [doc 110](110-calculation-map.md) §4.4).

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

**Implementation Note:** Mass (M) and gravitational parameter (GM) for planets are derived from orbital mechanics rather than direct measurement. The chain is Moon → Earth → Sun: `GM_Earth` from the Moon's orbit (with the `Δa = a_M·μ·m` solar-tidal correction, see [doc 24](24-delta-a-mass-derivation.md)), then `GM_Sun` from Earth's orbit minus `GM_Earth`. Planet GMs follow from `GM_Sun / massRatio_DE440`.

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
| `precessionAngularVelocity(arcsec_per_century)` | ω = (rate/100) × (π/648000) | Angular velocity (rad/year) |
| `perturbationStrength(a_p, a_pert, m_pert, M_sun)` | strength = (m/M) × (a_ratio)² | Relative influence of perturbing planet |
| `precessionRatio(rate1_arcsec, rate2_arcsec)` | ratio = rate₁ / rate₂ | Ratio between two precession rates |
| `precessionDecomposition(total, ecliptic)` | {total, ecliptic, perturbations} | Decompose precession into components |

(`holisticPrecessionRatio`, `precessionFromHolisticRatio` and `holisticRatioDescription` — the anchor-ratio helpers of the retired integer framing — are still defined in the helper object but have no caller.)

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

## A.5–A.8 The formula appendices — removed

Three appendices restated every Part 2 formula with the code of the `OrbitalFormulas` object copied in (about 850 lines, three homes for one formula). The formulas live once, in `src/script.js` (`OrbitalFormulas`); the GM chain is [doc 24](24-delta-a-mass-derivation.md) (one home `@essrt/physics` `earth/mass-chain`); the frame transforms are [doc 22](22-coordinate-frames.md); the shipped periods are the registry's ([doc 20](20-constants-reference.md)). The appendices are archived out of the tree.

## A.6 Part 3 Formulas - Gravitational Influence & Surface Properties

### A.6.1 Current GM and Mass Values (Implemented)

For the derivation of `GM_Earth`, `GM_Moon`, and `GM_Sun` from the Moon's and Earth's orbits — including the `Δa = a_M · μ · m` correction that closes the Earth-Moon-Sun three-body residual — see [24 — Moon Kepler Derivation](24-delta-a-mass-derivation.md).

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

The inclination of date to the invariable plane is the chain's element (`_chainElementsOfDate(k, jd).inclInvPlaneDeg`) for the seven planets and the engine's one-source orbit normal for Earth; there is no inclination law.

---

## Appendix B: Variable Cross-Reference

### Static Constants by Planet

For current values, see [Constants Reference](20-constants-reference.md).

| Planet | Eccentricity | Inclination (inv) | Semi-major (AU) | Period (days) |
|--------|--------------|-------------------|-----------------|---------------|
| Mercury | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Venus | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Earth | one-source series | one-source engine normal | 1.000 | `meanSolarYearDays` |
| Mars | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Jupiter | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Saturn | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Uranus | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Neptune | chain, of date | chain, of date | derived | `orbitalPeriodInputDays` |
| Pluto | `orbitalEccentricityBase` (JSON input) | `invPlaneInclinationMean` (JSON input) | derived | `orbitalPeriodInputDays` |

**How values are sourced:**
- **Eccentricity**: the chain's element of date (`_chainElementsOfDate(k, jd).e`)
- **Inclination (inv)**: the chain's element of date (`.inclInvPlaneDeg`)
- **Semi-major axis**: the chain's element of date for the seven planets; for the no-chain bodies derived from the observed period input via Kepler's third law (`_planetGeom.<k>`, `@essrt/physics` `planets/geometry`)
- **Period**: Input constant per planet (`planets.{name}.orbitalPeriodInputDays`)

> **Display note.** These constants are the scene-scaffold and no-chain-body
> parameters. The planetStats "Orbital Period & Motion" rows for the seven
> chain planets read the chain's measured window mean motion (governed
> artifact `windowElementRates`, deg per Julian year, window 1800–2100) —
> P = 360°/n, synodic = 360°/|n_planet − n_Earth|. Pluto, Halley and Eros,
> where the geometric device is the model path (the archived doc 31), ride
> their observed period inputs.

### Live Variables Summary

All planets have these `o.{planet}` variables:
- `Perihelion` - Longitude of perihelion (ϖ)
- `AscendingNode` - Ascending node on ecliptic (Ω)
- `DescendingNode` - Descending node on ecliptic
- `ArgumentOfPeriapsis` - Argument of periapsis (ω)
- `MeanAnomaly` - Mean anomaly (M)
- `TrueAnomaly` - True anomaly (ν)
- `Elongation` - Elongation from Sun
- `AscendingNodeInvPlane` - The chain's ascending node of date on the invariable plane
- `HeightAboveInvPlane` - Height above the invariable plane (AU)
- `AboveInvPlane` - Boolean: above the invariable plane
- `EclipticInclinationDynamic` - The chain's inclination of date to the ecliptic
- `InvPlaneInclinationDynamic` - The chain's inclination of date to the invariable plane

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
