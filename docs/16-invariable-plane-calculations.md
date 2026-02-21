# Invariable Plane Calculations

This document describes how planet heights above and below the invariable plane are calculated in the Holistic Universe Model.

---

## Overview

For each planet, we calculate:
1. **Height above/below the invariable plane** - In AU, signed (positive = above)
2. **Above/below status** - Boolean flag for quick checks
3. **Dynamic ascending node** - Precesses over time

---

## Orbital Geometry

### Reference Frame

```
                    INVARIABLE PLANE (Z = 0)
    ════════════════════════════════════════════════════
                          ☉ SUN

    Planet orbit (tilted ellipse):

         ↗ Above plane (Z > 0)
        /
       /  ← Highest point (90° from ascending node)
      /
     ○ Ascending Node ────────────────────── ○ Descending Node
      \                                      /
       \                                    /
        \  ← Lowest point                  /
         ↘ Below plane (Z < 0)            ↙
```

### The Formula

For a planet at orbital position, the height above the invariable plane is:

```
height = sin(inclination) × sin(angleFromNode) × distance
```

Where:
- `inclination` = Planet's inclination to the invariable plane
- `angleFromNode` = Angular position from the ascending node
- `distance` = Current distance from the Sun

### Calculating Angle from Ascending Node

```
angleFromNode = trueAnomaly + argumentOfPeriapsis - ascendingNodeOnInvPlane
```

Where:
- `trueAnomaly` = Current position in orbit measured from perihelion
- `argumentOfPeriapsis` = Angle from ascending node to perihelion
- `ascendingNodeOnInvPlane` = Where orbit crosses upward through invariable plane

---

## Implementation

### Constants: Ascending Nodes on Invariable Plane

From Souami & Souchay (2012), J2000.0 epoch:

```javascript
// Original Souami & Souchay values
const mercuryAscendingNodeInvPlaneSouamiSouchay = 32.22;
const venusAscendingNodeInvPlaneSouamiSouchay = 52.31;
const earthAscendingNodeInvPlaneSouamiSouchay = 284.51;
const marsAscendingNodeInvPlaneSouamiSouchay = 352.95;
const jupiterAscendingNodeInvPlaneSouamiSouchay = 306.92;
const saturnAscendingNodeInvPlaneSouamiSouchay = 122.27;
const uranusAscendingNodeInvPlaneSouamiSouchay = 308.44;
const neptuneAscendingNodeInvPlaneSouamiSouchay = 189.28;
const plutoAscendingNodeInvPlaneSouamiSouchay = 107.06;
```

### J2000-Verified Values

Calibrated to match J2000 ecliptic inclinations exactly:

```javascript
// Verified ascending nodes (calibrated with earthAscendingNodeInvPlaneVerified = 284.51°)
// Earth's value from Souami & Souchay (2012)
const mercuryAscendingNodeInvPlaneVerified = 32.83;
const venusAscendingNodeInvPlaneVerified = 54.70;
const earthAscendingNodeInvPlaneVerified = 284.51;
const marsAscendingNodeInvPlaneVerified = 354.87;
const jupiterAscendingNodeInvPlaneVerified = 312.89;
const saturnAscendingNodeInvPlaneVerified = 118.81;
const uranusAscendingNodeInvPlaneVerified = 307.80;
const neptuneAscendingNodeInvPlaneVerified = 192.04;
const plutoAscendingNodeInvPlaneVerified = 101.06;
```

### Output Variables

```javascript
// Height above invariable plane (AU, signed)
o.mercuryHeightAboveInvPlane = 0;
o.venusHeightAboveInvPlane = 0;
o.earthHeightAboveInvPlane = 0;
// ... etc for all planets

// Boolean flags
o.mercuryAboveInvPlane = true;
o.venusAboveInvPlane = true;
o.earthAboveInvPlane = true;
// ... etc

// Dynamic ascending nodes
o.mercuryAscendingNodeInvPlane = 0;  // Primary (verified values)
o.mercuryAscendingNodeInvPlaneSouamiSouchay = 0;  // For comparison
// ... etc
```

---

## Height Calculation Function

```javascript
function calculatePlanetHeightAboveInvariablePlane(planet) {
  // Get planet's current position in its orbit
  const trueAnomaly = o[`${planet}TrueAnomaly`];

  // Get planet's inclination relative to invariable plane (DYNAMIC)
  const incl_inv = (planet === 'earth')
    ? o.earthInvPlaneInclinationDynamic
    : o[`${planet}InvPlaneInclinationDynamic`];

  // Get ascending node on invariable plane (dynamic, precessing)
  const omega_inv = o[`${planet}AscendingNodeInvPlane`];

  // Get argument of perihelion
  const argPerihelion = PLANET_ARG_PERIHELION[planet];

  // Angular position from ascending node
  const angleFromNode = (trueAnomaly + argPerihelion - omega_inv) * DEG2RAD;

  // Height factor (-1 to +1)
  const heightFactor = Math.sin(incl_inv * DEG2RAD) * Math.sin(angleFromNode);

  // Actual height = heightFactor × current distance from Sun
  const distance = o[`${planet}Distance`];  // in AU
  const height = heightFactor * distance;

  return {
    height: height,              // Signed height (positive = above)
    heightFactor: heightFactor,  // -1 to +1
    isAbove: height > 0,
    angleFromNode: angleFromNode * RAD2DEG
  };
}
```

### Update Function (Called Every Frame)

```javascript
function updatePlanetInvariablePlaneHeights() {
  const planets = ['mercury', 'venus', 'earth', 'mars',
                   'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  for (const planet of planets) {
    const result = calculatePlanetHeightAboveInvariablePlane(planet);
    o[`${planet}HeightAboveInvPlane`] = result.height;
    o[`${planet}AboveInvPlane`] = result.isAbove;
  }
}
```

---

## Ascending Node Precession

### Two Coordinate Systems

The ascending node can be expressed in two coordinate systems with **different precession rates**:

| Coordinate System | Precession Period | Usage |
|-------------------|-------------------|-------|
| **ICRF (inertial)** | ~111,296 years | Physical marker positions in 3D space |
| **Ecliptic (precessing)** | ~20,868 years | Height calculations |

### Why This Matters

The height calculation uses `sun.ra` (Earth's position), which is measured in **precessing ecliptic coordinates**. If we use the ICRF ascending node (~111,296 year period), the height calculation becomes incorrect when moving away from J2000.

### Implementation

We maintain **two ascending node values** for each planet:

```javascript
// ICRF rate for visual markers
o.<planet>AscendingNodeInvPlane  // ~111,296 year period

// Ecliptic rate for height calculations
o.<planet>AscendingNodeInvPlaneEcliptic  // ~20,868 year period
```

### Precession Calculation

```javascript
// ICRF rate: ~111,296 years
const earthPerihelionICRFYears = holisticyearLength / 3;

// Ecliptic rate: ~20,868 years
const ascNodeInvPlaneEclipticYears = holisticyearLength / 16;

// Calculate dynamic ascending node (ecliptic rate for height)
const precessionRateEcliptic = 360 / ascNodeInvPlaneEclipticYears;
const yearsSinceJ2000 = currentYear - 2000;
const ascNodeDynamicEcliptic = ascNodeJ2000 + precessionRateEcliptic * yearsSinceJ2000;

// Use for height calculation
let angleFromInvAscNode = (eclipticLongitude - ascNodeDynamicEcliptic + 360) % 360;
```

---

## Argument of Perihelion with Respect to the Invariable Plane

### Definition

The **argument of perihelion (ω)** is the angular distance from the ascending node to the perihelion, measured in the orbital plane in the direction of motion:

```
ω = ϖ - Ω
```

Where:
- `ϖ` = longitude of perihelion
- `Ω` = longitude of ascending node

This quantity depends on which reference plane defines the ascending node. For the invariable plane:

```
ω_inv = ϖ - Ω_inv
```

### Why ω_inv is Not Constant

Both the longitude of perihelion and the ascending node on the invariable plane precess at the same underlying ICRF rate (`<planet>PerihelionICRFYears`). If both were computed in the same coordinate frame, their difference would be constant. However, the two values displayed in the planet stats panels are computed in **different reference frames**:

| Value | UI Label | Variable | Frame | Method |
|-------|----------|----------|-------|--------|
| ϖ | Longitude of perihelion (ϖ) | `o.<planet>Perihelion` | Earth equatorial | `apparentRaFromPdA()` |
| Ω_inv | Ascending Node on Inv. Plane (Ω) | `o.<planet>AscendingNodeInvPlane` | ICRF | Linear precession |

The longitude of perihelion is computed by `apparentRaFromPdA()` (line 25830), which:
1. Reads the 3D world positions of the perihelion marker objects
2. Transforms them into Earth's equatorial frame via `earth.rotationAxis.worldToLocal()`
3. Returns the apparent direction as seen from Earth

This Earth-frame transformation introduces oscillations of **±100 arcsec/century** with a period of **~6,500 years** (a harmonic of Earth's precession cycles). The ascending node on the invariable plane, by contrast, is a perfectly stable linear precession in ICRF.

The result: ω_inv oscillates over time despite both underlying quantities sharing the same ICRF precession rate.

### Comparison with Ecliptic Argument of Periapsis

The model also computes the classical ecliptic argument of periapsis:

```javascript
o.<planet>ArgumentOfPeriapsis = (o.<planet>Perihelion - o.<planet>AscendingNode) % 360
```

This uses `o.<planet>AscendingNode` (the **ecliptic** ascending node from `calculateDynamicAscendingNodeFromTilts()`), not the invariable plane ascending node. Both values in this subtraction are in the Earth/ecliptic frame, making them more comparable — though the ecliptic argument of periapsis also fluctuates because both inputs are affected by Earth-frame transformations.

| Quantity | Formula | Constant? |
|----------|---------|-----------|
| ω_ecliptic | ϖ_equatorial − Ω_ecliptic | No (both fluctuate, but in same frame) |
| ω_invariable | ϖ_equatorial − Ω_ICRF | No (frame mismatch causes ~6,500-year oscillation) |

### Resolution

To obtain a stable ω_inv, both values would need to be in the same frame. The model has `perihelionLongitudeEcliptic()` (line 25945) which reads the perihelion longitude directly from the precession layer rotation in ecliptic/ICRF coordinates — this gives a perfectly stable precession rate. Using that instead of `apparentRaFromPdA()` would produce a constant ω_inv.

---

## Expected Values

### Maximum Heights

| Planet | Max Height (AU) | Notes |
|--------|-----------------|-------|
| Mercury | ~0.05 | High inclination × close distance |
| Venus | ~0.03 | Moderate inclination |
| Earth | ~0.027 | At current ~1.57° inclination |
| Mars | ~0.05 | High eccentricity varies distance |
| Jupiter | ~0.029 | Tiny inclination × large distance |
| Saturn | ~0.15 | Moderate inclination × large distance |
| Uranus | ~0.34 | Moderate inclination × very large distance |
| Neptune | ~0.39 | Small inclination × huge distance |

### Earth's Crossing Dates (Year 2000)

| Event | Date | Heliocentric Longitude |
|-------|------|----------------------|
| Ascending (below → above) | Early July | ~284.5° |
| Descending (above → below) | Early January | ~104.5° |

**Verified behavior:**
- Earth is **ABOVE** the invariable plane from July to January
- Earth is **BELOW** the invariable plane from January to July

---

## Test Cases

### Test 1: J2000 Values

At J2000, calculated heights should be consistent with known orbital positions.

### Test 2: Earth Crossing Dates

Earth should show:
- Ascending crossing around July 4th
- Descending crossing around January 4th
- Heights transitioning smoothly through zero

### Test 3: Extreme Heights

Maximum heights should match theoretical values:
```
max_height = sin(inclination) × max_distance
```

### Test 4: Height Sign Changes

Height should change sign exactly at the ascending and descending nodes:
- `angleFromNode ≈ 0°` → height ≈ 0 (ascending)
- `angleFromNode ≈ 180°` → height ≈ 0 (descending)

---

## UI Display

### Planet Stats Panel

All invariable plane values in the planet stats panels show **ecliptic coordinates**:

| UI Label | Variable |
|----------|----------|
| Ascending Node on Inv. Plane (Ω) | `o.<planet>AscendingNodeInvPlaneEcliptic` |
| Descending Node on Inv. Plane | `(Ω + 180) % 360` |
| Height above Inv. Plane | `o.<planet>HeightAboveInvPlane` |
| Above/Below status | `o.<planet>AboveInvPlane` |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [05 - Invariable Plane Overview](05-invariable-plane-overview.md) | Conceptual background |
| [10 - Constants Reference](10-constants-reference.md) | All constants and values |
| [15 - Inclination Calculations](15-inclination-calculations.md) | Dynamic inclination oscillations |

---

**Previous**: [15 - Inclination Calculations](15-inclination-calculations.md)
**Next**: [17 - Mercury Precession Breakdown](17-mercury-precession-breakdown.md)
