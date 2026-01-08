# Coordinate Frames Reference

This document describes the coordinate reference frames and transformations used in the Holistic Universe Model simulation.

**Last Updated:** January 2026

**Related Documents:**
- [11 - Orbital Formulas Reference](11-orbital-formulas-reference.md) - Calculation functions
- [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) - Height calculations
- [14 - Ascending Node Calculations](14-ascending-node-calculations.md) - Node precession

---

## Overview

The simulation uses multiple coordinate reference frames to accurately represent planetary positions and orbital elements. Understanding these frames is essential for interpreting the data displayed.

| Frame | Origin | Reference Plane | Primary Use |
|-------|--------|-----------------|-------------|
| **ICRF** | Solar System Barycenter | Equator of J2000 | Fixed inertial reference |
| **Ecliptic** | Sun | Earth's orbital plane | Traditional astronomy |
| **Equatorial** | Earth | Earth's equator | RA/Dec positions |
| **Invariable Plane** | Sun | Total angular momentum | Fundamental physics |
| **Heliocentric** | Sun | Ecliptic or Invariable | Distance calculations |

---

## Part 1: Reference Frame Definitions

### 1.1 ICRF (International Celestial Reference Frame)

The ICRF is the fundamental celestial reference frame defined by the positions of extragalactic radio sources (quasars). It is essentially fixed in space.

**Characteristics:**
- Origin at solar system barycenter
- Axes aligned with J2000.0 mean equator and equinox
- Does not rotate or precess
- Used as the "fixed" background reference

**In the simulation:**
- Perihelion precession periods are given in ICRF coordinates
- Example: `earthPerihelionICRFYears = 99,392 years`

### 1.2 Ecliptic Coordinates

The ecliptic frame uses Earth's orbital plane as the reference.

**Characteristics:**
- Origin at the Sun
- Fundamental plane is Earth's orbital plane (ecliptic)
- Zero longitude points toward vernal equinox (J2000)
- The ecliptic plane itself precesses around the invariable plane

**Key variables:**
| Variable | Description |
|----------|-------------|
| Ecliptic longitude (λ) | Angle measured along ecliptic from vernal equinox |
| Ecliptic latitude (β) | Angle above/below ecliptic plane |
| Ecliptic inclination | Planet's orbital tilt relative to ecliptic |

**Calculation (line 18825):**
```
Ecliptic longitude = Ascending node + Argument of periapsis + True anomaly
```

### 1.3 Equatorial Coordinates

The equatorial frame uses Earth's equator as the reference plane.

**Characteristics:**
- Origin at Earth (geocentric) or Sun (heliocentric)
- Fundamental plane is Earth's equatorial plane
- Projected onto celestial sphere for RA/Dec

**Key variables:**
| Variable | Symbol | Range |
|----------|--------|-------|
| Right Ascension | RA, α | 0h to 24h (or 0° to 360°) |
| Declination | Dec, δ | -90° to +90° |

### 1.4 Invariable Plane Coordinates

The invariable plane is the most fundamental reference for the solar system.

**Characteristics:**
- Origin at Sun (or barycenter)
- Plane perpendicular to total angular momentum vector
- Essentially fixed over astronomical timescales
- All planetary orbits precess around this plane

**Key constants:**
| Constant | Value | Description |
|----------|-------|-------------|
| Inclination to ecliptic | 1.578° | At J2000 |
| Ascending node on ecliptic | 107.58° | Where invariable plane crosses up through ecliptic |

### 1.5 Heliocentric Coordinates

Sun-centered coordinates used for orbital mechanics.

**Characteristics:**
- Origin at Sun's center
- Can use ecliptic or invariable plane as reference
- Distance measured in AU

---

## Part 2: Frame Transformations

### 2.1 Ecliptic to Equatorial

Converts ecliptic longitude to Right Ascension using the obliquity of the ecliptic.

**Formula:**
```
RA = atan2(sin(λ) × cos(ε), cos(λ))
```

Where:
- λ = ecliptic longitude
- ε = obliquity (~23.44°)
- RA = Right Ascension

**Implementation (lines 11758-11779):**

| Function | Input | Output |
|----------|-------|--------|
| `longitudeToRARad(longitudeDeg, obliquityDeg)` | Ecliptic longitude (°) | RA (radians) |
| `longitudeToRAHMS(longitudeDeg, obliquityDeg)` | Ecliptic longitude (°) | RA (HMS string) |

**Notes:**
- Obliquity defaults to `o.obliquityEarth` (dynamic, ~23.44°)
- Output RA is in range [0, 2π) radians or [0h, 24h)
- HMS format: "7h 40m 32.45s"

### 2.2 Ecliptic to ICRF (Precession)

Converts precession periods between ecliptic and ICRF frames.

**Formula (Ecliptic → ICRF):**
```
ICRF_period = (ecliptic × reference) / (ecliptic - reference)
```

**Formula (ICRF → Ecliptic):**
```
ecliptic_period = (ICRF × reference) / (ICRF + reference)
```

Where:
- reference = general precession period (~22,937 years = holisticyearLength/13)

**Implementation (lines 916-931):**

| Function | Description |
|----------|-------------|
| `precessionEclipticToICRF(ecliptic_years, reference_years)` | Convert to ICRF frame |
| `precessionICRFToEcliptic(ICRF_years, reference_years)` | Convert to ecliptic frame |

**Physical meaning:**
- ICRF rates measure precession against fixed stars
- Ecliptic rates measure precession against the moving ecliptic
- The difference accounts for the ecliptic's own precession

### 2.3 Ecliptic to Invariable Plane

Transforms coordinates from ecliptic frame to invariable plane frame.

**Step 1: Calculate ascending node on invariable plane (ICRF)**
```
Ω_inv(t) = Ω_J2000 + (360° / P_prec) × (t - 2000)
```

**Step 2: Convert to ecliptic coordinates**
```
1/ecliptic_rate = 1/ICRF_rate + 1/general_rate
```
(Rates add because both orbital plane and ecliptic precess in same direction)

**Step 3: Calculate height above invariable plane**
```
height = sin(i_inv) × sin(λ - Ω_inv) × r
```

Where:
- i_inv = inclination to invariable plane
- Ω_inv = ascending node on invariable plane
- λ = ecliptic longitude
- r = heliocentric distance

**Implementation (lines 18737-18847):**
- Function: `updatePlanetInvariablePlaneHeights()`
- Outputs: `o.{planet}HeightAboveInvPlane` (AU), `o.{planet}AboveInvPlane` (boolean)

### 2.4 Heliocentric Latitude

Calculates the angle above/below a reference plane.

**Formula:**
```
sin(β) = sin(i) × sin(u)
```

Where:
- β = heliocentric latitude
- i = orbital inclination
- u = argument of latitude = ω + ν (argument of periapsis + true anomaly)

**Implementation (lines 728-731):**
```javascript
heliocentricLatitude(i_deg, omega_deg, nu_deg)
```

---

## Part 3: Dynamic Inclination Calculations

### 3.1 Dynamic Inclination to Invariable Plane

Planetary inclinations oscillate as the ascending node precesses (Laplace-Lagrange secular theory).

**Formula:**
```
i(t) = i_mean + A × cos(Ω(t) - offset)
```

Where:
- i_mean = Laplace-Lagrange mean inclination
- A = oscillation amplitude
- Ω(t) = current ascending node
- offset = geometric phase offset (calibrated to J2000)

**Implementation (lines 19905-20026):**
- Function: `computePlanetInvPlaneInclinationDynamic(planet, currentYear)`
- Calibration: Guarantees i(2000) = i_J2000 for each planet

### 3.2 Dynamic Ecliptic Inclination

The apparent inclination to the ecliptic changes as both the planet's orbit and Earth's orbit precess.

**Method:**

1. Calculate ecliptic normal vector from Earth's orbital plane:
```
n_ecl = (sin(i_E) × sin(Ω_E), sin(i_E) × cos(Ω_E), cos(i_E))
```

2. Calculate planet's orbital plane normal similarly

3. Angle between normals = ecliptic inclination:
```
i_app = arccos(n_ecl · n_planet)
```

**Implementation (lines 19109-19191):**
- Function: `updateDynamicInclinations()`
- Two versions calculated:
  - `o.{planet}EclipticInclinationDynamic` (J2000-verified nodes)
  - `o.{planet}EclipticInclinationSouamiSouchayDynamic` (original S&S nodes)

### 3.3 Earth Obliquity

Earth's axial tilt oscillates with the holistic year cycle.

**Formula:**
```
i = i_mean - A × cos(phase)
```

**Range:** ~0.93° to ~2.05° (inclination to invariable plane)

**Implementation (lines 19862-19881):**
- Function: `computeInclinationEarth()`
- Related: `computeObliquityEarth()` for axial tilt

---

## Part 4: Transformation Chain

The following diagram shows how coordinates transform between frames:

```
                    ICRF (Fixed Stars)
                          ↑
                          | precession rates
                          ↓
    INVARIABLE PLANE ←→ ECLIPTIC COORDINATES
          ↓                      ↓
    height above/below      via obliquity ε
          ↓                      ↓
    z-coordinate        EQUATORIAL (RA/Dec)
```

### 4.1 Complete Position Calculation

To calculate a planet's position in equatorial coordinates:

1. **Orbital elements** → True anomaly (ν)
2. **True anomaly + orbital elements** → Ecliptic longitude (λ)
3. **Ecliptic longitude + obliquity** → Right Ascension (RA)
4. **Heliocentric latitude formula** → Declination (Dec)

### 4.2 Height Above Invariable Plane

To calculate a planet's height above the invariable plane:

1. **Get current ascending node** (accounts for ICRF and ecliptic precession)
2. **Calculate ecliptic longitude** from orbital elements
3. **Apply height formula** with inclination and distance

---

## Part 5: Key Constants

### 5.1 Earth Parameters

| Constant | Value | Description |
|----------|-------|-------------|
| `earthInvPlaneInclinationMean` | 1.49514° | Mean orbital inclination to invariable plane |
| `earthInvPlaneInclinationAmplitude` | 0.564° | Oscillation amplitude |
| `earthAscendingNodeInvPlaneSouamiSouchay` | 284.51° | J2000 ascending node (S&S) |
| `earthAscendingNodeInvPlaneVerified` | 284.51° | J2000 ascending node (S&S 2012) |
| `earthPerihelionICRFYears` | 99,392 | Orbital plane precession period (ICRF) |

### 5.2 Obliquity

| Constant | Value | Description |
|----------|-------|-------------|
| `earthtiltMean` | 23.42723° | Mean obliquity |
| Default fallback | 23.4393° | Used when dynamic value unavailable |

### 5.3 General Precession

| Constant | Value | Description |
|----------|-------|-------------|
| General precession | ~22,937 years | holisticyearLength/13 |
| Holistic year | 298,176 years | Complete precession cycle |

---

## Part 6: Implementation Details

### 6.1 Three.js Rotation

The simulation uses Three.js quaternions for 3D rotations:

```javascript
const quaternion = new THREE.Quaternion();
quaternion.setFromAxisAngle(tiltAxis, angle);
```

### 6.2 Tilt Matrices

Reusable matrices for coordinate transformations:

```javascript
const _liveDataInvTiltMatrix = new THREE.Matrix4();
const _liveDataTiltMatrix = new THREE.Matrix4();
```

### 6.3 Function Locations

| Function | Line | Purpose |
|----------|------|---------|
| `longitudeToRARad()` | 11758 | Ecliptic → Equatorial |
| `longitudeToRAHMS()` | 11784 | Ecliptic → RA (HMS format) |
| `precessionEclipticToICRF()` | 917 | Precession frame conversion |
| `precessionICRFToEcliptic()` | 927 | Inverse precession conversion |
| `heliocentricLatitude()` | 728 | Latitude calculation |
| `updatePlanetInvariablePlaneHeights()` | 18737 | Height above invariable plane |
| `updateDynamicInclinations()` | 19109 | Dynamic inclination updates |
| `computePlanetInvPlaneInclinationDynamic()` | 19905 | Laplace-Lagrange inclination |

---

## Part 7: References

### 7.1 Academic Sources

- **Souami & Souchay (2012)** - "The solar system's invariable plane" - Defines invariable plane orientation
- **Murray & Dermott (1999)** - "Solar System Dynamics" - Laplace-Lagrange secular theory

### 7.2 Data Sources

- **JPL Horizons** - Reference ephemerides for validation
- **IAU** - Standard values for astronomical constants

---

**Previous**: [18 - J2000 Calibration](18-j2000-calibration.md)
**Next**: [20 - Architecture](20-architecture.md)
