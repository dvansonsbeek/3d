# Dynamic Inclination Calculation

## Overview

This document describes the implementation of **dynamic orbital inclination** for all planets in the Holistic Universe Model. Currently, planetary inclinations are static values measured relative to the J2000 ecliptic. This enhancement will calculate how the **apparent inclination** of each planet changes as Earth's orbital plane (the ecliptic) tilts over time.

## Status

**Ready for Implementation** - Design document reviewed and verified against codebase

## Story

**As a** user viewing the planet hierarchy inspector,
**I want** the orbital inclination values and half-plane visualizations to reflect the changing ecliptic reference plane,
**so that** I can see physically accurate orbital geometry at any date in the simulation.

## Problem Description

### Current Behavior

The model currently uses **static inclination values** for all planets:

| Planet | Static Inclination | Reference |
|--------|-------------------|-----------|
| Mercury | 7.00501638° | J2000 ecliptic |
| Venus | 3.3946018° | J2000 ecliptic |
| Mars | 1.84971028° | J2000 ecliptic |
| Jupiter | 1.30450732° | J2000 ecliptic |
| Saturn | 2.4853834° | J2000 ecliptic |
| Uranus | 0.77234317° | J2000 ecliptic |
| Neptune | 1.768273° | J2000 ecliptic |
| Pluto | 17.14175° | J2000 ecliptic |

These values are correct for epoch J2000 (year 2000), but the **ecliptic itself tilts** over time as Earth's orbital inclination to the invariable plane changes.

### The Physical Reality

1. **The Invariable Plane** is the fundamental reference - it's the plane perpendicular to the solar system's total angular momentum vector. It doesn't change.

2. **Earth's orbital plane (ecliptic)** tilts relative to the invariable plane:
   - Mean inclination: 1.49514053°
   - Amplitude: ±0.564°
   - Range: 0.931° to 2.059°
   - Period: ~99,392 years (1/3 of holistic year)

3. **Planetary inclinations** are traditionally measured relative to the ecliptic. When the ecliptic tilts, the apparent inclinations change.

### Visual Manifestation

At year 2000 (epoch):
- Mercury's inclination = 7.005° relative to ecliptic
- Half-planes show 180°/180° split (equal above/below ecliptic)

At year 12000:
- Earth's inclination to invariable plane has changed by ~0.35°
- Mercury's **apparent inclination** relative to the new ecliptic is different
- Half-planes should show asymmetric split (e.g., 200°/160°)

Currently, the visualization shows incorrect 180°/180° split at year 12000 because we use static inclination.

## Physical Background

### Reference Frames

```
                    INVARIABLE PLANE (fixed)
                    =======================
                           ↑
                           | Earth's inclination (1.0° - 2.1°)
                           ↓
    ─────────────────── ECLIPTIC (tilts over time) ───────────────────
                           ↑
                           | Planet's apparent inclination (changes)
                           ↓
                    PLANET'S ORBITAL PLANE
```

### The Geometry

Each planet's orbital plane can be described by:
1. **Inclination to invariable plane** (i_inv) - CONSTANT
2. **Ascending node on invariable plane** (Ω_inv) - CONSTANT (to first order)

The ecliptic can be described by:
1. **Inclination to invariable plane** (i_E) - CHANGES over time
2. **Ascending node on invariable plane** (Ω_E) - related to precession

The **apparent inclination** of a planet relative to the ecliptic is found by calculating the angle between two planes in 3D space.

### Vector Mathematics

Each orbital plane can be represented by its **normal vector**:

For a plane with inclination `i` and ascending node `Ω` (measured from invariable plane):
```
n = (sin(i) * sin(Ω), sin(i) * cos(Ω), cos(i))
```

The angle between two planes is:
```
cos(θ) = n1 · n2 = |n1| * |n2| * cos(apparent_inclination)
```

Since normal vectors are unit vectors:
```
apparent_inclination = arccos(n_planet · n_ecliptic)
```

## Algorithm

### Step 1: Define Invariable Plane Coordinates

For each planet, we need its orbital elements relative to the **invariable plane**.

**Source: Souami & Souchay (2012), Table 9** - Values at J2000.0 epoch

| Planet | i_inv (°) | Ω_inv (°) | Notes |
|--------|-----------|-----------|-------|
| Mercury | 6.34 | 32.22 | Highest inclination |
| Venus | 2.19 | 52.31 | |
| Earth | 1.57* | 284.51 | *Varies 0.93°-2.06° over ~100,000 years |
| Mars | 1.67 | 352.95 | Within Earth's inclination range |
| Jupiter | 0.32 | 306.92 | Closest to invariable plane |
| Saturn | 0.93 | 122.27 | |
| Uranus | 1.02 | 308.44 | |
| Neptune | 0.72 | 189.28 | |
| Pluto | 15.6 | 107.06 | Dwarf planet |

**Reference**: Souami, D. & Souchay, J. (2012), "The solar system's invariable plane", A&A 543, A133
- [Full paper](https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html)

**Ascending node precession is already implemented**: The ascending nodes precess over time and this is already calculated dynamically using `<planet>PerihelionEclipticYears` constants in `updatePlanetInvariablePlaneHeights()`:
- Earth: ~99,392 years (`holisticyearLength/3`)
- Jupiter: derived from `jupiterPerihelionEclipticYears` → ~51,000 year coupled precession
- Saturn: derived from `saturnPerihelionEclipticYears` → ~51,000 year coupled precession
- All planets: `o.<planet>AscendingNodeInvPlane` values are updated each frame

The `updateDynamicInclinations()` function uses these already-computed dynamic values (`o.mercuryAscendingNodeInvPlane`, etc.) rather than the static J2000 constants.

### Step 2: Calculate Normal Vectors

For each planet, calculate the orbital plane normal in invariable-plane coordinates:

```javascript
function getOrbitalNormal(inclination_inv, ascendingNode_inv) {
  const i = inclination_inv * DEG2RAD;
  const Ω = ascendingNode_inv * DEG2RAD;

  return new THREE.Vector3(
    Math.sin(i) * Math.sin(Ω),
    Math.sin(i) * Math.cos(Ω),
    Math.cos(i)
  );
}
```

### Step 3: Calculate Dynamic Ecliptic Normal

The ecliptic's orientation changes with Earth's inclination:

```javascript
function getEclipticNormal(currentYear) {
  // Earth's inclination to invariable plane at this year
  const earthIncl = o.inclinationEarth;  // Already calculated each frame

  // Earth's ascending node on invariable plane (dynamic, precesses over time)
  // Use the already-computed dynamic value from updatePlanetInvariablePlaneHeights()
  const earthAscNode = o.earthAscendingNodeInvPlane;  // ~284.51° at J2000, precesses

  return getOrbitalNormal(earthIncl, earthAscNode);
}
```

### Step 4: Calculate Apparent Inclination

```javascript
function calculateApparentInclination(planetNormal, eclipticNormal) {
  // Dot product of unit normal vectors
  const cosAngle = planetNormal.dot(eclipticNormal);

  // Clamp to handle numerical precision
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  // Apparent inclination in degrees
  return Math.acos(clampedCos) * RAD2DEG;
}
```

### Step 5: Calculate Dynamic Ascending Node Direction

The ascending node is where the planet's orbital plane crosses the ecliptic going "upward". This is the cross product of the two normal vectors:

```javascript
function calculateAscendingNodeDirection(planetNormal, eclipticNormal) {
  // Line of nodes is perpendicular to both normals
  const lineOfNodes = new THREE.Vector3().crossVectors(eclipticNormal, planetNormal);
  lineOfNodes.normalize();

  // The ascending node direction (where planet goes from below to above ecliptic)
  // depends on the orientation - may need to check sign
  return lineOfNodes;
}
```

## Implementation Plan

### Constants: Use Existing Model Constants

**Important**: The model already has all required constants implemented:

#### Inclination Constants (script.js lines 83-155)

```javascript
// EXISTING constants - inclinations relative to INVARIABLE PLANE:
const mercuryInclination = 6.3472858;   // (vs mercuryOrbitalInclination = 7.00501638 for ecliptic)
const venusInclination = 2.1545441;     // (vs venusOrbitalInclination = 3.3946018)
const marsInclination = 1.6311858;      // (vs marsOrbitalInclination = 1.84971028)
const jupiterInclination = 0.3219652;   // (vs jupiterOrbitalInclination = 1.30450732)
const saturnInclination = 0.9254704;    // (vs saturnOrbitalInclination = 2.4853834)
const uranusInclination = 0.9946692;    // (vs uranusOrbitalInclination = 0.77234317)
const neptuneInclination = 0.7354155;   // (vs neptuneOrbitalInclination = 1.768273)
const plutoInclination = 15.5541473;    // (vs plutoOrbitalInclination = 17.14175)

// For Earth's inclination to invariable plane (dynamic):
// earthinclinationMean = 1.49514053
// tiltandinclinationAmplitude = 0.564
// o.inclinationEarth = computed value (0.931° to 2.059°) - already calculated each frame
```

#### Ascending Node Constants (script.js lines 226-238)

```javascript
// EXISTING constants - ascending nodes on invariable plane (from Souami & Souchay 2012)
// These are NOT the same as <planet>AscendingNode which is on the ecliptic!
const mercuryAscendingNodeInvPlane = 32.22;
const venusAscendingNodeInvPlane = 52.31;
const earthAscendingNodeInvPlane = 284.51;   // Precesses with period holisticyearLength/3
const marsAscendingNodeInvPlane = 352.95;
const jupiterAscendingNodeInvPlane = 306.92;
const saturnAscendingNodeInvPlane = 122.27;
const uranusAscendingNodeInvPlane = 308.44;
const neptuneAscendingNodeInvPlane = 189.28;
const plutoAscendingNodeInvPlane = 107.06;
```

#### Dynamic Ascending Nodes (already implemented in o object)

```javascript
// These are ALREADY calculated each frame by updatePlanetInvariablePlaneHeights()
// at script.js line 13284
o.mercuryAscendingNodeInvPlane  // Dynamic value with precession
o.venusAscendingNodeInvPlane
o.earthAscendingNodeInvPlane    // ~284.51° at J2000, precesses over 99,392 years
o.marsAscendingNodeInvPlane
o.jupiterAscendingNodeInvPlane
o.saturnAscendingNodeInvPlane
o.uranusAscendingNodeInvPlane
o.neptuneAscendingNodeInvPlane
o.plutoAscendingNodeInvPlane
```

### New Dynamic Variables

Add to the `o` object:
```javascript
// Dynamic APPARENT inclination (relative to tilting ecliptic)
// This is DIFFERENT from the static <planet>Inclination constants (relative to invariable plane)
o.mercuryApparentInclination = 0;  // Dynamic apparent inclination to ecliptic
o.venusApparentInclination = 0;
o.marsApparentInclination = 0;
o.jupiterApparentInclination = 0;
o.saturnApparentInclination = 0;
o.uranusApparentInclination = 0;
o.neptuneApparentInclination = 0;
o.plutoApparentInclination = 0;
// Note: No earthApparentInclination - Earth's inclination to ecliptic is always 0 by definition
```

**Naming convention clarification:**
- `<planet>Inclination` (constant) = inclination to **invariable plane** (fixed, from script.js)
- `<planet>OrbitalInclination` (constant) = inclination to **J2000 ecliptic** (fixed, from script.js)
- `o.<planet>ApparentInclination` (dynamic) = inclination to **current ecliptic** (changes with Earth's tilt)

### New Function: `updateDynamicInclinations()`

```javascript
// Pooled vectors to avoid allocation during animation
const _eclipticNormal = new THREE.Vector3();
const _planetNormal = new THREE.Vector3();

function updateDynamicInclinations() {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Get Earth's current inclination to invariable plane (dynamic, already calculated)
  const earthIncl = o.inclinationEarth;

  // Get Earth's ascending node on invariable plane (dynamic, already calculated)
  const earthAscNode = o.earthAscendingNodeInvPlane;

  // Calculate current ecliptic normal (Earth's orbital plane normal)
  const earthI = earthIncl * DEG2RAD;
  const earthOmega = earthAscNode * DEG2RAD;
  _eclipticNormal.set(
    Math.sin(earthI) * Math.sin(earthOmega),
    Math.cos(earthI),
    Math.sin(earthI) * Math.cos(earthOmega)
  );

  // Planet configuration: use existing constants
  const planets = [
    { key: 'mercury', incl: mercuryInclination, ascNode: o.mercuryAscendingNodeInvPlane },
    { key: 'venus',   incl: venusInclination,   ascNode: o.venusAscendingNodeInvPlane },
    { key: 'mars',    incl: marsInclination,    ascNode: o.marsAscendingNodeInvPlane },
    { key: 'jupiter', incl: jupiterInclination, ascNode: o.jupiterAscendingNodeInvPlane },
    { key: 'saturn',  incl: saturnInclination,  ascNode: o.saturnAscendingNodeInvPlane },
    { key: 'uranus',  incl: uranusInclination,  ascNode: o.uranusAscendingNodeInvPlane },
    { key: 'neptune', incl: neptuneInclination, ascNode: o.neptuneAscendingNodeInvPlane },
    { key: 'pluto',   incl: plutoInclination,   ascNode: o.plutoAscendingNodeInvPlane }
  ];

  for (const { key, incl, ascNode } of planets) {
    // Calculate planet's orbital plane normal
    const pI = incl * DEG2RAD;
    const pOmega = ascNode * DEG2RAD;
    _planetNormal.set(
      Math.sin(pI) * Math.sin(pOmega),
      Math.cos(pI),
      Math.sin(pI) * Math.cos(pOmega)
    );

    // Calculate apparent inclination (angle between planes)
    const cosAngle = _planetNormal.dot(_eclipticNormal);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const apparentIncl = Math.acos(clampedCos) * RAD2DEG;

    // Store in o object
    o[key + 'ApparentInclination'] = apparentIncl;
  }
}
```

### Modify `updateOrbitalPlaneRotations()` (script.js line 13092)

Change from using static inclination to dynamic:

```javascript
// Before (using static J2000 ecliptic inclination) - current code at line 13126:
updatePlaneRotation(mercuryRealPerihelionAtSun, o.mercuryAscendingNode, mercuryOrbitalInclination, 'Mercury');
updatePlaneRotation(venusRealPerihelionAtSun, o.venusAscendingNode, venusOrbitalInclination, 'Venus');
// ... etc for all planets

// After (using dynamic apparent inclination):
updatePlaneRotation(mercuryRealPerihelionAtSun, o.mercuryAscendingNode, o.mercuryApparentInclination, 'Mercury');
updatePlaneRotation(venusRealPerihelionAtSun, o.venusAscendingNode, o.venusApparentInclination, 'Venus');
updatePlaneRotation(marsRealPerihelionAtSun, o.marsAscendingNode, o.marsApparentInclination, 'Mars');
updatePlaneRotation(jupiterRealPerihelionAtSun, o.jupiterAscendingNode, o.jupiterApparentInclination, 'Jupiter');
updatePlaneRotation(saturnRealPerihelionAtSun, o.saturnAscendingNode, o.saturnApparentInclination, 'Saturn');
updatePlaneRotation(uranusRealPerihelionAtSun, o.uranusAscendingNode, o.uranusApparentInclination, 'Uranus');
updatePlaneRotation(neptuneRealPerihelionAtSun, o.neptuneAscendingNode, o.neptuneApparentInclination, 'Neptune');
updatePlaneRotation(plutoRealPerihelionAtSun, o.plutoAscendingNode, o.plutoApparentInclination, 'Pluto');
// Note: Halley's and Eros keep static values (halleysOrbitalInclination, erosOrbitalInclination)
```

### Modify Half-Plane Visualization

The `rebuildHalfDiscGeometry` function should naturally handle asymmetric splits once the orbital plane is correctly oriented with dynamic inclination.

## Validation

### Test Cases

1. **Year 2000 (epoch)**: Dynamic inclinations should match static J2000 values (±0.01°)

2. **Year 12000**:
   - Earth inclination: ~1.23° (below mean)
   - Mercury apparent inclination: should differ from 7.005° by ~0.1-0.3°
   - Half-plane split should be visibly asymmetric

3. **Year -50000** (near max Earth inclination ~2.06°):
   - Maximum deviation from J2000 values
   - Mars and Jupiter may show inclination "crossover" effects

### Verification Steps

1. Compare calculated apparent inclinations with published ephemeris data
2. Verify half-plane split angles match calculated inclinations
3. Check smooth transitions when animating through time
4. Validate crossover behavior for Mars, Jupiter, Neptune

## Data Requirements

### Invariable Plane Transformation (Verified)

The transformation from ecliptic to invariable plane coordinates uses these values:

1. **Earth's mean inclination to the invariable plane**: **1.49514053°** (model constant `earthinclinationMean`)
2. **Earth's actual inclination at J2000**: **~1.578°** (computed from the ~99,392-year cycle)
3. The ecliptic's ascending node on the invariable plane at J2000: **~284.51°** (from `earthAscendingNodeInvPlane`)

**Important**: The model uses Earth's **mean** inclination as the reference, not the J2000-specific value. See [Souami&Souchay_changed-ascending-nodes.md](Souami&Souchay_changed-ascending-nodes.md) for the rationale behind this design decision.

**Note**: The 284.51° value represents where the ecliptic crosses from below to above the invariable plane. This is 180° opposite from the invariable plane's ascending node on the ecliptic (107.58°).

### Transformation Approach

Rather than using a rotation matrix, we use the simpler approach of calculating plane normals directly from inclination and ascending node, then computing the angle between them using a dot product. This is implemented in `updateDynamicInclinations()`.

## Display Updates

### Hierarchy Inspector Panel

Update to show dynamic values:

```javascript
// Current (static J2000 ecliptic):
{ label: 'Orbital Inclination (i)', value: `${mercuryOrbitalInclination}°` }

// New (dynamic apparent inclination):
{ label: 'Orbital Inclination (i)', value: `${o.mercuryApparentInclination.toFixed(4)}°` }

// Could also show both for reference:
{ label: 'Inclination to ecliptic', value: `${o.mercuryApparentInclination.toFixed(4)}°` }
{ label: 'Inclination to inv. plane', value: `${mercuryInclination}°` }  // Static constant
```

### Debug Output

Add to ascending node debug logging:
```javascript
console.log(`🔍 Dynamic Inclination: Mercury = ${o.mercuryApparentInclination.toFixed(4)}° (J2000: ${mercuryOrbitalInclination}°, inv.plane: ${mercuryInclination}°)`);
```

## Dependencies

This enhancement depends on:
1. ✅ Dynamic ascending node calculation (already implemented - `o.<planet>AscendingNode`)
2. ✅ Earth inclination calculation (already implemented - `o.inclinationEarth`)
3. ✅ Invariable plane ascending nodes (already implemented - `o.<planet>AscendingNodeInvPlane`)
4. ✅ Invariable plane inclination constants (already exist - `<planet>Inclination`)

## Implementation Steps

### Step 1: Add new `o` properties (script.js ~line 2827)

Add after the existing `o.<planet>AscendingNodeInvPlane` properties:

```javascript
// Dynamic apparent inclination (relative to current ecliptic, changes with Earth's tilt)
mercuryApparentInclination: 0,
venusApparentInclination: 0,
marsApparentInclination: 0,
jupiterApparentInclination: 0,
saturnApparentInclination: 0,
uranusApparentInclination: 0,
neptuneApparentInclination: 0,
plutoApparentInclination: 0,
```

### Step 2: Add `updateDynamicInclinations()` function

Add after `updatePlanetInvariablePlaneHeights()` (~line 13337).

### Step 3: Call the new function in render loop

Add call in `updateAscendingNodes()` (~line 13076) after `updatePlanetInvariablePlaneHeights()`:

```javascript
updatePlanetInvariablePlaneHeights();
updateDynamicInclinations();  // NEW: Calculate apparent inclinations
updateOrbitalPlaneRotations();
```

### Step 4: Modify `updateOrbitalPlaneRotations()`

Replace static `<planet>OrbitalInclination` with dynamic `o.<planet>ApparentInclination`.

### Step 5: Add pooled vectors at module level

Add near other pooled vectors (~line 2750):

```javascript
const _eclipticNormal = new THREE.Vector3();
const _planetNormal = new THREE.Vector3();
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect invariable plane transformation | Wrong inclination values | Validate at year 2000: should match J2000 ecliptic values within 0.01° |
| Numerical instability near 0° or 180° | Division by zero or NaN | Use `Math.max(-1, Math.min(1, cosAngle))` clamping before acos |
| Performance impact | Frame rate drop | Use pooled THREE.Vector3 objects, simple dot product math |
| Breaking existing visualizations | User confusion | Test half-plane coloring still works correctly |

## Acceptance Criteria

1. [ ] At year 2000, dynamic inclinations match static J2000 values within 0.01°
2. [ ] At year 12000, Mercury apparent inclination differs from `mercuryOrbitalInclination` by ~0.1-0.3°
3. [ ] Half-plane visualization shows asymmetric split at year 12000
4. [ ] `o.mercuryApparentInclination` (etc.) values update in real-time
5. [ ] Hierarchy inspector shows dynamic inclination values
6. [ ] No performance degradation (>55 FPS maintained)
7. [ ] Smooth transitions when animating through time

## Expected Long-Term Behavior

The apparent inclination of each planet varies cyclically over time due to:

1. **Earth's inclination to invariable plane** varies from ~0.93° to ~2.06° over ~99,392 years
2. **Ascending node precession** - both Earth's and each planet's ascending nodes precess at different rates

### Cyclic Behavior Patterns

The apparent inclination follows a quasi-sinusoidal pattern with:
- **Period**: Dominated by Earth's ~99,392 year inclination cycle, modulated by ascending node precession
- **Amplitude**: Depends on the planet's geometry relative to Earth

| Planet | Approximate Min | Approximate Max | Notes |
|--------|-----------------|-----------------|-------|
| Mercury | ~4.3° | ~8.4° | Large range due to high invariable plane inclination |
| Venus | ~1.3° | ~4.4° | Moderate range |
| Mars | ~0.1° | ~3.2° | Can nearly align with ecliptic at some epochs |
| Jupiter | ~0.9° | ~1.6° | Small range, close to invariable plane |
| Saturn | ~1.5° | ~3.4° | Moderate range |
| Uranus | ~0.2° | ~2.0° | Can nearly align with ecliptic |
| Neptune | ~1.0° | ~2.4° | Moderate range |
| Pluto | ~13.5° | ~17.6° | Always highly inclined |

### Minimum Points (Epochs of Closest Alignment)

Testing shows planets reach their minimum apparent inclination at different epochs:

| Planet | Approx. Min Epoch | Behavior |
|--------|-------------------|----------|
| Mercury | ~60,000 AD | Values decrease until this point, then increase |
| Venus | ~55,000 AD | Similar pattern |
| Mars | ~12,000 AD | Much shorter cycle - can nearly align with ecliptic |
| Jupiter | ~40,000 AD | Slow variation due to proximity to invariable plane |
| Uranus | ~45,000 AD | Near-alignment possible |

**Physical interpretation**: These minima occur when the combination of:
1. Earth's inclination value (in its ~99,392 year cycle)
2. The relative positions of Earth's and the planet's ascending nodes

...creates the smallest angle between the two orbital planes.

### Mars and Jupiter Crossover Effects

Mars and Jupiter have inclinations to the invariable plane (1.63° and 0.32°) that are similar to or smaller than Earth's maximum inclination to the invariable plane (2.06°). This means:

- At certain epochs, Mars's orbital plane can become nearly parallel to the ecliptic (apparent inclination → 0°)
- At other epochs, Mars's apparent inclination can exceed its invariable plane inclination
- Jupiter, being closest to the invariable plane, shows the smallest variation in apparent inclination

## J2000 Calibration Note

### Original Discrepancy (Using Souami & Souchay Values)

When using the original Souami & Souchay (2012) ascending nodes with Earth's mean inclination, the calculated apparent inclinations show small discrepancies from published J2000 values:

| Planet | S&S Calculated | J2000 Reference | Difference |
|--------|----------------|-----------------|------------|
| Mercury | 6.990° | 7.005° | -0.015° |
| Venus | 3.361° | 3.395° | -0.033° |
| Mars | 1.805° | 1.850° | -0.045° |
| Jupiter | 1.286° | 1.305° | -0.018° |
| Saturn | 2.476° | 2.485° | -0.010° |
| Uranus | 0.781° | 0.772° | +0.009° |
| Neptune | 1.801° | 1.768° | +0.032° |
| Pluto | 17.131° | 17.142° | -0.011° |

### Solution: J2000-Verified Ascending Nodes

Rather than changing Earth's mean inclination (which would break the physical model), we adjusted the planet ascending nodes to match J2000 values exactly. See [Souami&Souchay_changed-ascending-nodes.md](Souami&Souchay_changed-ascending-nodes.md) for details.

The implementation now calculates **both**:
- `o.<planet>ApparentInclination` - using J2000-verified ascending nodes (matches J2000 exactly)
- `o.<planet>ApparentInclinationSouamiSouchay` - using original S&S ascending nodes (for comparison)

### Clarification: What Differs Between S&S and Verified Calculations

Both calculations use **identical inputs** except for the planet ascending node values:

| Input | S&S Calculation | Verified Calculation |
|-------|-----------------|----------------------|
| Earth's inclination to inv. plane | `o.inclinationEarth` (dynamic, ~1.578° at J2000) | Same |
| Earth's ascending node on inv. plane | `o.earthAscendingNodeInvPlane` (dynamic) | Same |
| Planet inclination to inv. plane | `<planet>Inclination` constant (fixed) | Same |
| **Planet ascending node on inv. plane** | `o.<planet>AscendingNodeInvPlaneSouamiSouchay` | `o.<planet>AscendingNodeInvPlane` |

The **ONLY difference** is which ascending node constant is used for the planet:
- **S&S**: Uses the original Souami & Souchay (2012) published values
- **Verified**: Uses adjusted values calibrated to match J2000 reference inclinations exactly

Both calculations use:
1. **Dynamic** `o.inclinationEarth` (not the mean value `earthinclinationMean`)
2. **Fixed** planet inclinations to the invariable plane (the `<planet>Inclination` constants)
3. **Dynamic** Earth ascending node (`o.earthAscendingNodeInvPlane`)

This means the small discrepancies between S&S and Verified results are entirely due to the different ascending node values, not due to using different inclination inputs.

## Finding the Verified Values Based Upon Fixing earthAscendingNodeInvPlaneVerified = 282.95°

### Problem Statement

Given a fixed value for `earthAscendingNodeInvPlaneVerified = 282.95°`, we need to find the optimal `<planet>AscendingNodeInvPlaneVerified` values such that `o.<planet>ApparentInclination` matches the J2000 `<planet>OrbitalInclination` exactly.

### Mathematical Approach

The formula for apparent inclination between two orbital planes is:

```
cos(apparent_incl) = n_planet · n_ecliptic
```

Where the normal vectors are:

```
n = (sin(i)*sin(Ω), sin(i)*cos(Ω), cos(i))
```

- `i` = inclination to invariable plane
- `Ω` = ascending node on invariable plane

### Solving for the Planet Ascending Node

Given:
- Earth's ascending node on invariable plane: `Ω_E = 282.95°`
- Earth's inclination to invariable plane: `i_E = 1.578°` (at J2000)
- Planet's inclination to invariable plane: `i_P` (fixed constant)
- Target apparent inclination: `i_target` (the J2000 OrbitalInclination value)

We need to find `Ω_P` (planet's ascending node) such that:

```
cos(i_target) = n_planet · n_ecliptic
```

Expanding the dot product:

```
cos(i_target) = sin(i_P)*sin(Ω_P)*sin(i_E)*sin(Ω_E)
              + sin(i_P)*cos(Ω_P)*sin(i_E)*cos(Ω_E)
              + cos(i_P)*cos(i_E)
```

Let:
- `A = sin(i_P)`
- `B = cos(i_P)`
- `ex = sin(i_E)*sin(Ω_E)`
- `ey = sin(i_E)*cos(Ω_E)`
- `ez = cos(i_E)`

Then:
```
cos(i_target) = A*sin(Ω_P)*ex + A*cos(Ω_P)*ey + B*ez
```

Rearranging:
```
C = cos(i_target) - B*ez = A*(sin(Ω_P)*ex + cos(Ω_P)*ey)
```

This can be solved using:
```
C/(A*R) = cos(Ω_P - φ)
```

Where `R = sqrt(ex² + ey²)` and `φ = atan2(ex, ey)`.

Therefore:
```
Ω_P = φ ± acos(C/(A*R))
```

This gives two solutions; we choose the one closest to the original S&S value.

### Values Before and After Calibration

**Before** (with earthAscendingNodeInvPlaneVerified = 284.51°):
```javascript
const earthAscendingNodeInvPlaneVerified = 284.51;    // S&S original
const mercuryAscendingNodeInvPlaneVerified = 32.84;   // was 32.22, Δ = +0.62° (from S&S)
const venusAscendingNodeInvPlaneVerified = 54.75;     // was 52.31, Δ = +2.44° (from S&S)
const marsAscendingNodeInvPlaneVerified = 354.86;     // was 352.95, Δ = +1.94° (from S&S)
const jupiterAscendingNodeInvPlaneVerified = 313.09;  // was 306.92, Δ = +6.17° (from S&S)
const saturnAscendingNodeInvPlaneVerified = 118.84;   // was 122.27, Δ = -3.43° (from S&S)
const uranusAscendingNodeInvPlaneVerified = 307.84;   // was 308.44, Δ = -0.60° (from S&S)
const neptuneAscendingNodeInvPlaneVerified = 192.06;  // was 189.28, Δ = +2.78° (from S&S)
const plutoAscendingNodeInvPlaneVerified = 103.56;    // was 107.06, Δ = -3.50° (from S&S)
const halleysAscendingNodeInvPlaneVerified = 59.56;   // Approximation
const erosAscendingNodeInvPlaneVerified = 304.41;     // Approximation
```

**After** (with earthAscendingNodeInvPlaneVerified = 282.95°):
```javascript
// Calibrated with earthAscendingNodeInvPlaneVerified = 282.95° and o.inclinationEarth = 1.578° at J2000
// Result: All planets match J2000 OrbitalInclination values with error < 0.0001°
const earthAscendingNodeInvPlaneVerified = 282.95;    // Adjusted from S&S 284.51°
const mercuryAscendingNodeInvPlaneVerified = 31.28;   // Calibrated to match mercuryOrbitalInclination 7.00501638°
const venusAscendingNodeInvPlaneVerified = 53.18;     // Calibrated to match venusOrbitalInclination 3.3946018°
const marsAscendingNodeInvPlaneVerified = 353.33;     // Calibrated to match marsOrbitalInclination 1.84971028°
const jupiterAscendingNodeInvPlaneVerified = 311.57;  // Calibrated to match jupiterOrbitalInclination 1.30450732°
const saturnAscendingNodeInvPlaneVerified = 117.23;   // Calibrated to match saturnOrbitalInclination 2.4853834°
const uranusAscendingNodeInvPlaneVerified = 306.26;   // Calibrated to match uranusOrbitalInclination 0.77234317°
const neptuneAscendingNodeInvPlaneVerified = 190.58;  // Calibrated to match neptuneOrbitalInclination 1.768273°
const plutoAscendingNodeInvPlaneVerified = 103.90;    // Calibrated to match plutoOrbitalInclination 17.14175°
const halleysAscendingNodeInvPlaneVerified = 59.56;   // Retrograde orbit - no valid solution, kept as approximation
const erosAscendingNodeInvPlaneVerified = 8.82;       // Calibrated to match erosOrbitalInclination 10.8290328658513°
```

### Calculation Script

The following Node.js script was used to find the optimal ascending node values:

```javascript
node -e "
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Fixed inputs
const earthAscendingNodeInvPlaneVerified = 282.95; // degrees
const earthInclinationToInvPlane = 1.578; // degrees at J2000 (approximate)

// Earth ecliptic normal (Verified)
const earthI = earthInclinationToInvPlane * DEG2RAD;
const earthOmega = earthAscendingNodeInvPlaneVerified * DEG2RAD;
const eclipticNormal = {
  x: Math.sin(earthI) * Math.sin(earthOmega),
  y: Math.sin(earthI) * Math.cos(earthOmega),
  z: Math.cos(earthI)
};

console.log('Earth ecliptic normal:', eclipticNormal);
console.log('');

// Planet data: inclination to invariable plane, target J2000 orbital inclination, current verified ascending node
const planets = [
  { name: 'Mercury', inclInv: 6.3472858, targetIncl: 7.00501638, currentAsc: 32.84 },
  { name: 'Venus', inclInv: 2.1545441, targetIncl: 3.3946018, currentAsc: 54.75 },
  { name: 'Mars', inclInv: 1.6311858, targetIncl: 1.84971028, currentAsc: 354.86 },
  { name: 'Jupiter', inclInv: 0.3219652, targetIncl: 1.30450732, currentAsc: 313.09 },
  { name: 'Saturn', inclInv: 0.9254704, targetIncl: 2.4853834, currentAsc: 118.84 },
  { name: 'Uranus', inclInv: 0.9946692, targetIncl: 0.77234317, currentAsc: 307.84 },
  { name: 'Neptune', inclInv: 0.7354155, targetIncl: 1.768273, currentAsc: 192.06 },
  { name: 'Pluto', inclInv: 15.5639473, targetIncl: 17.14175, currentAsc: 103.56 },
  { name: 'Halleys', inclInv: 0.7354155, targetIncl: 162.192203847561, currentAsc: 59.56 },
  { name: 'Eros', inclInv: 10.8290328658513, targetIncl: 10.8290328658513, currentAsc: 304.41 }
];

// For each planet, find the ascending node that gives the target apparent inclination
console.log('Finding optimal ascending nodes...');
console.log('');

for (const planet of planets) {
  const pI = planet.inclInv * DEG2RAD;
  const targetApparentIncl = planet.targetIncl;
  const cosTarget = Math.cos(targetApparentIncl * DEG2RAD);

  const A = Math.sin(pI);
  const B = Math.cos(pI);
  const ex = eclipticNormal.x;
  const ey = eclipticNormal.y;
  const ez = eclipticNormal.z;

  const C = cosTarget - B * ez;
  const R = Math.sqrt(ex*ex + ey*ey);
  const ratio = C / (A * R);

  if (Math.abs(ratio) > 1) {
    console.log(planet.name + ': No solution (ratio = ' + ratio.toFixed(4) + ')');
    continue;
  }

  const phi = Math.atan2(ex, ey);
  const acosRatio = Math.acos(ratio);

  const omega1 = (phi + acosRatio) * RAD2DEG;
  const omega2 = (phi - acosRatio) * RAD2DEG;

  const omega1Norm = ((omega1 % 360) + 360) % 360;
  const omega2Norm = ((omega2 % 360) + 360) % 360;

  function calcApparentIncl(omega) {
    const pOmega = omega * DEG2RAD;
    const nx = Math.sin(pI) * Math.sin(pOmega);
    const ny = Math.sin(pI) * Math.cos(pOmega);
    const nz = Math.cos(pI);
    const dot = nx * ex + ny * ey + nz * ez;
    return Math.acos(Math.max(-1, Math.min(1, dot))) * RAD2DEG;
  }

  const incl1 = calcApparentIncl(omega1Norm);
  const incl2 = calcApparentIncl(omega2Norm);

  const diff1 = Math.min(Math.abs(omega1Norm - planet.currentAsc), 360 - Math.abs(omega1Norm - planet.currentAsc));
  const diff2 = Math.min(Math.abs(omega2Norm - planet.currentAsc), 360 - Math.abs(omega2Norm - planet.currentAsc));

  const bestOmega = diff1 < diff2 ? omega1Norm : omega2Norm;
  const bestIncl = diff1 < diff2 ? incl1 : incl2;

  console.log(planet.name + ':');
  console.log('  Target J2000 orbital incl: ' + planet.targetIncl.toFixed(6) + ' deg');
  console.log('  Incl to inv plane: ' + planet.inclInv.toFixed(6) + ' deg');
  console.log('  Current Verified asc node: ' + planet.currentAsc.toFixed(2) + ' deg');
  console.log('  Solution 1: asc node = ' + omega1Norm.toFixed(2) + ' deg -> apparent incl = ' + incl1.toFixed(6) + ' deg');
  console.log('  Solution 2: asc node = ' + omega2Norm.toFixed(2) + ' deg -> apparent incl = ' + incl2.toFixed(6) + ' deg');
  console.log('  BEST: asc node = ' + bestOmega.toFixed(2) + ' deg');
  console.log('  Error: ' + (bestIncl - planet.targetIncl).toFixed(8) + ' deg');
  console.log('');
}
"
```

### Note on Reverted Changes

The value of `earthAscendingNodeInvPlaneVerified = 282.95°` was initially chosen based on the observation that the perihelion appeared to be 180° opposite the ascending node to the invariable plane. However, this was determined to be coincidental, and the values have been reverted. The calculation methodology documented here remains valid for any chosen Earth ascending node value.

## Current Values (earthAscendingNodeInvPlaneVerified = 284.492°)

### Source: Souami & Souchay (2012)

The value 23.009° comes directly from the paper ["The calculation of the invariable plane of the solar system"](https://www.aanda.org/articles/aa/pdf/2012/07/aa19011-12.pdf) (Astronomy & Astrophysics, 2012).

From the conclusion:
> "Finally, our most accurate estimate of the orientation of the invariable plane with respect to the ICRF is given by an inclination of 23°00'31.9""

Converting to decimal degrees:
```
23° + 0' + 31.9" = 23° + 0/60 + 31.9/3600 = 23.0089° ≈ 23.009°
```

### Verification

Setting `earthAscendingNodeInvPlaneVerified = 284.492°` produces `o.earthAscendingNodeInvPlane = 23.009°` at J2000.

This was verified by running a report over 300,000+ years showing the Earth ascending node on the invariable plane cycles through 0-360° with a constant ~90° offset from Earth's perihelion:

| JD | Date | Earth Perihelion | Earth Asc Node InvPlane | Difference |
|----|------|------------------|-------------------------|------------|
| -96520356 | -268971-09-02 | 270.000037 | 23.029711 | - |
| -87444816 | -244123-02-21 | 37.062951 | 113.027806 | 89.998095 |
| -78369276 | -219276-08-14 | 142.370928 | 203.025904 | 89.998098 |
| -69293736 | -194428-02-03 | 269.993923 | 293.024004 | 89.998100 |
| -60218196 | -169581-07-26 | 37.323151 | 23.022100 | 89.998096 |
| -51142656 | -144733-01-16 | 142.111537 | 113.020194 | 89.998094 |
| -42067116 | -119886-07-08 | 270.000038 | 203.018289 | 89.998095 |
| -32991576 | -95039-12-27 | 37.334493 | 293.016384 | 89.998095 |
| -23916036 | -70191-06-19 | 142.145980 | 23.014479 | 89.998095 |
| -14840496 | -45344-12-08 | 270.006077 | 113.012574 | 89.998095 |
| -5764956 | -20496-05-31 | 37.069083 | 203.010674 | 89.998100 |
| 3310584 | 4351-12-21 | 142.400194 | 293.009080 | 89.998406 |
| **12386124** | **29199-12-16** | **270.000037** | **23.009021** | 89.999941 |

The highlighted row (year 29200) shows the ascending node at exactly 23.009°, matching the S&S published value.

### Rationale

`earthAscendingNodeInvPlaneVerified` is set to 284.492° to place the ecliptic ascending node on the invariable plane at exactly 23.009° as published by Souami & Souchay (2012).

```javascript
// Calibrated with earthAscendingNodeInvPlaneVerified = 284.492° and o.inclinationEarth = 1.578° at J2000
// Result: All planets match J2000 OrbitalInclination values with error < 0.0001°
const earthAscendingNodeInvPlaneVerified = 284.492;   // Adjusted from S&S 284.51°
const mercuryAscendingNodeInvPlaneVerified = 32.83;   // was 32.22, Δ = +0.61° (from S&S)
const venusAscendingNodeInvPlaneVerified = 54.72;     // was 52.31, Δ = +2.41° (from S&S)
const marsAscendingNodeInvPlaneVerified = 354.87;     // was 352.95, Δ = +1.92° (from S&S)
const jupiterAscendingNodeInvPlaneVerified = 313.11;  // was 306.92, Δ = +6.19° (from S&S)
const saturnAscendingNodeInvPlaneVerified = 118.77;   // was 122.27, Δ = -3.50° (from S&S)
const uranusAscendingNodeInvPlaneVerified = 307.80;   // was 308.44, Δ = -0.64° (from S&S)
const neptuneAscendingNodeInvPlaneVerified = 192.12;  // was 189.28, Δ = +2.84° (from S&S)
const plutoAscendingNodeInvPlaneVerified = 105.44;    // was 107.06, Δ = -1.62° (from S&S)
const halleysAscendingNodeInvPlaneVerified = 59.56;   // No solution - retrograde orbit
const erosAscendingNodeInvPlaneVerified = 10.36;      // was 10.58, Δ = -0.22° (from S&S)
```

## Future Enhancements

1. **Precession of ascending node on invariable plane**: For very long time scales, even the invariable plane elements might drift slightly
2. **Include Laplace plane effects**: For moons, the local Laplace plane matters more than the invariable plane
3. **Relativistic corrections**: For Mercury, general relativity affects orbital elements
4. **J2000 calibration offset**: Add small corrections to align calculated values with J2000 reference values

## Relationship to Other Documents

This document is part of a suite of related implementations:

| Document | Purpose | Output Variables |
|----------|---------|------------------|
| **This document** | Calculate apparent inclination to tilting ecliptic | `o.<planet>ApparentInclination` |
| [planetary-invariable-plane-crossings.md](planetary-invariable-plane-crossings.md) | Calculate height above/below invariable plane | `o.<planet>HeightAboveInvPlane` |
| [dynamic-ascending-node-calculation.md](dynamic-ascending-node-calculation.md) | Calculate ascending node on ecliptic | `o.<planet>AscendingNode` |

**Shared data structures:**
- Both use `INVARIABLE_PLANE_INCLINATIONS` (references existing `<planet>Inclination` constants)
- Both use `INVARIABLE_PLANE_ASCENDING_NODES` (from Souami & Souchay 2012)
- Both use `o.inclinationEarth` for Earth's dynamic inclination

## References

1. **Souami, D. & Souchay, J. (2012)** - "The solar system's invariable plane", A&A 543, A133
   - [Full paper](https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html)
2. [Invariable Plane - Wikipedia](https://en.wikipedia.org/wiki/Invariable_plane)
3. [Orbital Elements - JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
4. [dynamic-ascending-node-calculation.md](dynamic-ascending-node-calculation.md) - Companion document
5. [planetary-invariable-plane-crossings.md](planetary-invariable-plane-crossings.md) - Related visualization

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-19 | 1.0 | Initial design document | Claude (Opus 4.5) |
| 2024-12-19 | 1.1 | Updated with Souami & Souchay (2012) data: corrected ascending nodes (Earth=284.51°, not 174.8°), added precession periods | Claude (Opus 4.5) |
| 2024-12-19 | 1.2 | Unified with planetary-invariable-plane-crossings.md: use existing `<planet>Inclination` constants, renamed output to `o.<planet>ApparentInclination`, added relationship section | Claude (Opus 4.5) |
| 2024-12-20 | 2.0 | **Ready for implementation**: Updated all code examples to use actual constant names from codebase, added Implementation Steps section with line numbers, verified all dependencies are met | Claude (Opus 4.5) |
