# Anomaly Calculation Approach

**Status:** ✅ Implemented

## Overview

This document describes the approach for calculating Mean Anomaly and True Anomaly based on **actual 3D positions** in the model, rather than time-based calculations.

### Current Problem
The existing implementation shows **identical values** for both Mean Anomaly and True Anomaly (e.g., both show 179.46°). This is incorrect because they are calculated from the same Earth-Sun line angle instead of being calculated from their proper geometric definitions.

### Solution
Replace the incorrect calculation with proper position-based geometry:
- **True Anomaly (ν)**: Angle measured at the **Sun** (focus)
- **Mean Anomaly (M)**: Angle measured at **P** (orbit center)

---

## Definitions

### True Anomaly (ν)
The angle measured at the **Sun** (focus of the ellipse) from the perihelion direction to the planet's current position.

- Measured from: **Sun** (one focus of the elliptical orbit)
- Reference direction: Perihelion (green arrow)
- Target: Planet's current position

### Mean Anomaly (M)
The angle measured at **P** (geometric center of the ellipse) from the perihelion direction to the planet's current position.

- Measured from: **P point** (center of the elliptical orbit)
- Reference direction: Perihelion (green arrow)
- Target: Planet's current position

### Eccentric Anomaly (E)
An auxiliary angle used in Kepler's equations to relate Mean and True Anomaly. Not directly visualized but used in traditional calculations.

---

## Key Points in the Model (CONFIRMED)

| Point | Description | Object in Model |
|-------|-------------|-----------------|
| **Sun** | Focus of the ellipse, where the Sun is located | `sun.pivotObj` |
| **P** | Geometric center of the elliptical orbit | `[planet]FixedPerihelionAtSun.pivotObj` ✅ |
| **Perihelion** | The actual perihelion point on the orbit | `[planet]FixedPerihelionAtSun.planetObj` |
| **Planet** | Current position of the planet | Child planet object in Step 5 of hierarchy |
| **Green Arrow** | Points toward perihelion direction from Sun | Perihelion arrow visualization |

### Object Pattern per Planet

| Planet | P (Orbit Center) | Perihelion Point |
|--------|------------------|------------------|
| Mercury | `mercuryFixedPerihelionAtSun.pivotObj` | `mercuryFixedPerihelionAtSun.planetObj` |
| Venus | `venusFixedPerihelionAtSun.pivotObj` | `venusFixedPerihelionAtSun.planetObj` |
| Mars | `marsFixedPerihelionAtSun.pivotObj` | `marsFixedPerihelionAtSun.planetObj` |
| Jupiter | `jupiterFixedPerihelionAtSun.pivotObj` | `jupiterFixedPerihelionAtSun.planetObj` |
| Saturn | `saturnFixedPerihelionAtSun.pivotObj` | `saturnFixedPerihelionAtSun.planetObj` |
| Uranus | `uranusFixedPerihelionAtSun.pivotObj` | `uranusFixedPerihelionAtSun.planetObj` |
| Neptune | `neptuneFixedPerihelionAtSun.pivotObj` | `neptuneFixedPerihelionAtSun.planetObj` |
| Pluto | `plutoFixedPerihelionAtSun.pivotObj` | `plutoFixedPerihelionAtSun.planetObj` |
| Halley's | `halleysFixedPerihelionAtSun.pivotObj` | `halleysFixedPerihelionAtSun.planetObj` |
| Eros | `erosFixedPerihelionAtSun.pivotObj` | `erosFixedPerihelionAtSun.planetObj` |

---

## Geometric Relationship

```
                    Planet (Mars)
                        *
                       /|\
                      / | \
                     /  |  \
                    /   |   \
                   /    |    \
                  /  M  |  ν  \
                 /______|______\
                P       |       Sun
           (center)     |     (focus)
                        |
                        v
                   Perihelion (green arrow)
```

- **M (Mean Anomaly)**: Angle at P between perihelion direction and P→Planet line
- **ν (True Anomaly)**: Angle at Sun between perihelion direction and Sun→Planet line

---

## Why They Differ

The Sun is not at the center of the ellipse - it's at one of the two foci. The distance from the center (P) to the focus (Sun) is `a × e`, where:
- `a` = semi-major axis
- `e` = eccentricity

For Mars (e ≈ 0.0934):
- At **perihelion**: Both angles = 0°
- At **aphelion**: Both angles = 180°
- At **quadrature** (90° from perihelion): ν > M (True Anomaly is ahead of Mean Anomaly)

The difference between ν and M is called the **Equation of the Center**.

---

## Implementation Approach

### Required World Positions

1. **Sun position**: `sun.pivotObj.getWorldPosition()`
2. **P position** (orbit center): `[planet]FixedPerihelionAtSun.pivotObj.getWorldPosition()`
3. **Planet position**: Child planet's world position (Step 5 in hierarchy)
4. **Perihelion position**: `[planet]FixedPerihelionAtSun.planetObj.getWorldPosition()`

### Calculation Steps

#### Step 1: Get World Positions
```javascript
// Get Sun position
const sunPos = new THREE.Vector3();
sun.pivotObj.getWorldPosition(sunPos);

// Get P (orbit center) position - USE fixedPerihelionAtSun, NOT realPerihelionAtSun
const pPos = new THREE.Vector3();
fixedPerihelionAtSun.pivotObj.getWorldPosition(pPos);

// Get Planet position (child planet in Step 5)
const planetPos = new THREE.Vector3();
childPlanet.planetObj.getWorldPosition(planetPos);

// Get Perihelion position (the actual perihelion point marker)
const perihelionPos = new THREE.Vector3();
fixedPerihelionAtSun.planetObj.getWorldPosition(perihelionPos);
```

#### Step 2: Calculate Perihelion Direction Vector
```javascript
// Perihelion direction from Sun
const periDirFromSun = new THREE.Vector3()
  .subVectors(perihelionPos, sunPos)
  .normalize();

// Perihelion direction from P (should be same direction)
const periDirFromP = new THREE.Vector3()
  .subVectors(perihelionPos, pPos)
  .normalize();
```

#### Step 3: Calculate Planet Direction Vectors
```javascript
// Planet direction from Sun (for True Anomaly)
const planetDirFromSun = new THREE.Vector3()
  .subVectors(planetPos, sunPos)
  .normalize();

// Planet direction from P (for Mean Anomaly)
const planetDirFromP = new THREE.Vector3()
  .subVectors(planetPos, pPos)
  .normalize();
```

#### Step 4: Calculate Angles
```javascript
// True Anomaly: angle at Sun
// Using atan2 for proper quadrant handling in XZ plane (ecliptic)
const periAngleSun = Math.atan2(periDirFromSun.z, periDirFromSun.x);
const planetAngleSun = Math.atan2(planetDirFromSun.z, planetDirFromSun.x);
let trueAnomaly = planetAngleSun - periAngleSun;

// Mean Anomaly: angle at P
const periAngleP = Math.atan2(periDirFromP.z, periDirFromP.x);
const planetAngleP = Math.atan2(planetDirFromP.z, planetDirFromP.x);
let meanAnomaly = planetAngleP - periAngleP;

// Normalize to 0-360° range
trueAnomaly = ((trueAnomaly * 180 / Math.PI) % 360 + 360) % 360;
meanAnomaly = ((meanAnomaly * 180 / Math.PI) % 360 + 360) % 360;
```

---

## Visualization (CONFIRMED)

### Existing Visualization (KEEP)
- **Earth-Sun line arc**: The existing arc visualization showing the angle from perihelion to the Earth-Sun line - **keep as-is**
- **Toggle**: "Show Anomalies Visualization (Step 4)" - use this existing toggle

### New Visualization Elements

#### 1. Direction Lines

| Line | Color | From | To | Purpose |
|------|-------|------|-----|---------|
| **P → Planet** | **Red** (`0xff0000`) | `fixedPerihelionAtSun.pivotObj` | Planet world position | Shows direction for Mean Anomaly measurement |
| **Sun → Planet** | **Amber** (`0xffbf00`) | `sun.pivotObj` | Planet world position | Shows direction for True Anomaly measurement |

#### 2. Anomaly Arcs (NEW)

| Arc | Color | Style | Center | Sweep |
|-----|-------|-------|--------|-------|
| **Mean Anomaly Arc** | **Red** (`0xff0000`) | Dashed | P (orbit center) | From perihelion direction to P→Planet direction |
| **True Anomaly Arc** | **Amber** (`0xffbf00`) | Solid | Sun (focus) | From perihelion direction to Sun→Planet direction |

**Arc Details:**
- **Radius**: Based on orbit visualization size (proportional to ellipticOrbitRadius)
- **Mean Anomaly Arc radius**: Slightly smaller than True Anomaly Arc for visual distinction
- **Arcs sweep counter-clockwise** from perihelion (0°) to current planet position

### Visual Reference
```
                        Planet
                           *
                          /|
               Red line  / | Amber line
             (P→Planet) /  | (Sun→Planet)
                       /   |
            .-"""-.   /    |   .-"""-.
           /   M   \ /     |  /   ν   \
          |   arc   |      | |   arc   |
           \       / P     Sun \       /
            `-...-´  (center)   `-...-´
              │                    │
              └── Red dashed       └── Amber solid
                  (at P)               (at Sun)
```

### Integration
- Add all elements to the existing `anomalyGroup` in the hierarchy inspector
- Elements should be visible when "Show Anomalies Visualization (Step 4)" is checked
- All elements update dynamically as the planet moves
- Arcs are positioned at their respective centers (P for Mean, Sun for True)

---

## Expected Values at Model Start (21 Jun 2000)

For Mars:
| Anomaly | Expected Value | Source |
|---------|----------------|--------|
| Mean Anomaly (M) | 109.26° | `marsMeanAnomaly` constant |
| True Anomaly (ν) | 118.95° | `marsTrueAnomaly` constant |

The difference (ν - M ≈ 9.69°) is the Equation of the Center for Mars at this position.

---

## Comparison with Time-Based Approach

### Time-Based (Traditional Kepler)
1. Calculate M from time since perihelion passage
2. Solve Kepler's equation to get E (Eccentric Anomaly)
3. Calculate ν from E

### Position-Based (Proposed)
1. Get actual 3D positions from model
2. Calculate angles directly from geometry
3. No need to solve Kepler's equation

### Advantages of Position-Based
- Uses actual model state (what you see is what you measure)
- No dependency on time calculations
- Self-consistent with the 3D visualization
- Works regardless of how the model internally handles orbital mechanics

### Potential Concerns
- Requires accurate P point position (orbit center, not Sun)
- Must ensure perihelion direction is consistent
- 3D positions may have slight numerical errors

---

## Questions Resolved ✅

| Question | Answer |
|----------|--------|
| **P Point Location** | `fixedPerihelionAtSun.pivotObj` (NOT realPerihelionAtSun) |
| **Visualization Lines** | Red (P→Planet) and Amber (Sun→Planet) |
| **Existing Arc** | Keep the Earth-Sun line arc as-is |
| **Toggle Control** | Use existing "Show Anomalies Visualization (Step 4)" |
| **Applies to** | All planets in the Planet Hierarchy Inspector |

---

## Implementation Plan

### Phase 1: Update PLANET_HIERARCHIES Registry
Add `fixedPerihelionAtSun` reference to each planet entry so we can access the P point.

**Location:** `script.js` around line 4179-4288

```javascript
// Example for Mars:
mars: {
  label: 'Mars',
  fixedPerihelion: marsFixedPerihelionAtSun,  // ADD THIS
  steps: [...]
}
```

### Phase 2: Fix Anomaly Calculation
Replace the incorrect calculation in `updateHierarchyLiveData()`.

**Location:** `script.js` around line 7770-7843

**Current (WRONG):**
```javascript
const meanAnomalyRad = arcAngle;  // Same angle for both
const trueAnomalyRad = arcAngle;  // Same angle for both
```

**New (CORRECT):**
```javascript
// Get required positions
const sunPos = new THREE.Vector3();
const pPos = new THREE.Vector3();
const planetPos = new THREE.Vector3();
const perihelionPos = new THREE.Vector3();

sun.pivotObj.getWorldPosition(sunPos);
fixedPerihelionAtSun.pivotObj.getWorldPosition(pPos);
childPlanet.planetObj.getWorldPosition(planetPos);
fixedPerihelionAtSun.planetObj.getWorldPosition(perihelionPos);

// Perihelion direction from Sun (for True Anomaly reference)
const periDirFromSun = new THREE.Vector3().subVectors(perihelionPos, sunPos).normalize();

// Perihelion direction from P (for Mean Anomaly reference)
const periDirFromP = new THREE.Vector3().subVectors(perihelionPos, pPos).normalize();

// Planet direction from Sun (for True Anomaly)
const planetDirFromSun = new THREE.Vector3().subVectors(planetPos, sunPos).normalize();

// Planet direction from P (for Mean Anomaly)
const planetDirFromP = new THREE.Vector3().subVectors(planetPos, pPos).normalize();

// Calculate True Anomaly (angle at Sun)
const periAngleSun = Math.atan2(-periDirFromSun.z, periDirFromSun.x);
const planetAngleSun = Math.atan2(-planetDirFromSun.z, planetDirFromSun.x);
let trueAnomalyRad = planetAngleSun - periAngleSun;

// Calculate Mean Anomaly (angle at P)
const periAngleP = Math.atan2(-periDirFromP.z, periDirFromP.x);
const planetAngleP = Math.atan2(-planetDirFromP.z, planetDirFromP.x);
let meanAnomalyRad = planetAngleP - periAngleP;

// Normalize to 0-360° range
const trueAnomalyDeg = ((trueAnomalyRad * 180 / Math.PI) % 360 + 360) % 360;
const meanAnomalyDeg = ((meanAnomalyRad * 180 / Math.PI) % 360 + 360) % 360;

window._trueAnomaly = trueAnomalyDeg;
window._meanAnomaly = meanAnomalyDeg;
```

### Phase 3: Add Visualization Lines
Add the P→Planet (Red) and Sun→Planet (Amber) lines to `createVisualHelpers()`.

**Location:** `script.js` around line 5951-5966 (in the anomaly visualization section)

```javascript
// P → Planet line (Red) - for Mean Anomaly visualization
const pToPlanetGeo = new THREE.BufferGeometry();
pToPlanetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const pToPlanetMat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
hierarchyInspector.pToPlanetLine = new THREE.Line(pToPlanetGeo, pToPlanetMat);
hierarchyInspector.anomalyGroup.add(hierarchyInspector.pToPlanetLine);

// Sun → Planet line (Amber) - for True Anomaly visualization
const sunToPlanetGeo = new THREE.BufferGeometry();
sunToPlanetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const sunToPlanetMat = new THREE.LineBasicMaterial({ color: 0xffbf00, linewidth: 2 });
hierarchyInspector.sunToPlanetLine = new THREE.Line(sunToPlanetGeo, sunToPlanetMat);
hierarchyInspector.anomalyGroup.add(hierarchyInspector.sunToPlanetLine);
```

### Phase 4: Add Anomaly Arcs
Add the Mean Anomaly Arc (Red, dashed, centered at P) and True Anomaly Arc (Amber, solid, centered at Sun).

**Location:** `script.js` around line 5970-5993

```javascript
const arcSegments = 64; // Smooth arc

// Mean Anomaly Arc (Red, dashed) - centered at P
const meanArcGeo = new THREE.BufferGeometry();
const meanArcPositions = new Float32Array((arcSegments + 1) * 3);
meanArcGeo.setAttribute('position', new THREE.BufferAttribute(meanArcPositions, 3));
const meanArcMat = new THREE.LineDashedMaterial({
  color: 0xff0000,
  linewidth: 2,
  dashSize: 3,
  gapSize: 2
});
hierarchyInspector.meanAnomalyArcAtP = new THREE.Line(meanArcGeo, meanArcMat);
hierarchyInspector.anomalyGroup.add(hierarchyInspector.meanAnomalyArcAtP);

// True Anomaly Arc (Amber, solid) - centered at Sun
const trueArcGeo = new THREE.BufferGeometry();
const trueArcPositions = new Float32Array((arcSegments + 1) * 3);
trueArcGeo.setAttribute('position', new THREE.BufferAttribute(trueArcPositions, 3));
const trueArcMat = new THREE.LineBasicMaterial({ color: 0xffbf00, linewidth: 2 });
hierarchyInspector.trueAnomalyArcAtSun = new THREE.Line(trueArcGeo, trueArcMat);
hierarchyInspector.anomalyGroup.add(hierarchyInspector.trueAnomalyArcAtSun);

// Store arc radii for updates
hierarchyInspector._meanArcAtPRadius = ellipticOrbitRadius * 0.3;  // Smaller radius
hierarchyInspector._trueArcAtSunRadius = ellipticOrbitRadius * 0.4; // Slightly larger
```

### Phase 5: Update Lines and Arcs Dynamically
Update all visualization elements in the animation loop.

**Location:** `script.js` around line 7846-7890

```javascript
// Update P → Planet line
if (hierarchyInspector.pToPlanetLine) {
  const positions = hierarchyInspector.pToPlanetLine.geometry.attributes.position.array;
  positions[0] = pPos.x; positions[1] = pPos.y; positions[2] = pPos.z;
  positions[3] = planetPos.x; positions[4] = planetPos.y; positions[5] = planetPos.z;
  hierarchyInspector.pToPlanetLine.geometry.attributes.position.needsUpdate = true;
}

// Update Sun → Planet line
if (hierarchyInspector.sunToPlanetLine) {
  const positions = hierarchyInspector.sunToPlanetLine.geometry.attributes.position.array;
  positions[0] = sunPos.x; positions[1] = sunPos.y; positions[2] = sunPos.z;
  positions[3] = planetPos.x; positions[4] = planetPos.y; positions[5] = planetPos.z;
  hierarchyInspector.sunToPlanetLine.geometry.attributes.position.needsUpdate = true;
}

// Update Mean Anomaly Arc (centered at P)
if (hierarchyInspector.meanAnomalyArcAtP) {
  const arcRadius = hierarchyInspector._meanArcAtPRadius;
  const positions = hierarchyInspector.meanAnomalyArcAtP.geometry.attributes.position.array;
  const arcSegments = 64;

  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = periAngleP + t * meanAnomalyRad; // From perihelion to planet direction
    // Arc is centered at P position
    positions[i * 3] = pPos.x + arcRadius * Math.cos(angle);
    positions[i * 3 + 1] = pPos.y;
    positions[i * 3 + 2] = pPos.z - arcRadius * Math.sin(angle);
  }
  hierarchyInspector.meanAnomalyArcAtP.geometry.attributes.position.needsUpdate = true;
  hierarchyInspector.meanAnomalyArcAtP.computeLineDistances(); // Required for dashed line
}

// Update True Anomaly Arc (centered at Sun)
if (hierarchyInspector.trueAnomalyArcAtSun) {
  const arcRadius = hierarchyInspector._trueArcAtSunRadius;
  const positions = hierarchyInspector.trueAnomalyArcAtSun.geometry.attributes.position.array;
  const arcSegments = 64;

  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = periAngleSun + t * trueAnomalyRad; // From perihelion to planet direction
    // Arc is centered at Sun position
    positions[i * 3] = sunPos.x + arcRadius * Math.cos(angle);
    positions[i * 3 + 1] = sunPos.y;
    positions[i * 3 + 2] = sunPos.z - arcRadius * Math.sin(angle);
  }
  hierarchyInspector.trueAnomalyArcAtSun.geometry.attributes.position.needsUpdate = true;
}
```

### Phase 6: Cleanup
Add cleanup for all new visualization elements in `removeVisualHelpers()`.

**Location:** `script.js` around line 6426-6451

```javascript
hierarchyInspector.pToPlanetLine = null;
hierarchyInspector.sunToPlanetLine = null;
hierarchyInspector.meanAnomalyArcAtP = null;
hierarchyInspector.trueAnomalyArcAtSun = null;
hierarchyInspector._meanArcAtPRadius = null;
hierarchyInspector._trueArcAtSunRadius = null;
```

### Phase 7: Add to hierarchyInspector State Object
Add new properties to track the visualization elements.

**Location:** `script.js` around line 5122-5127 (hierarchyInspector state object)

```javascript
// Add these to the hierarchyInspector object:
pToPlanetLine: null,
sunToPlanetLine: null,
meanAnomalyArcAtP: null,
trueAnomalyArcAtSun: null,
_meanArcAtPRadius: null,
_trueArcAtSunRadius: null,
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/script.js` | Registry update, calculation fix, visualization lines, anomaly arcs |

---

## Verification

### Expected Values at Model Start (21 Jun 2000)

For Mars:
| Anomaly | Expected Value | Source |
|---------|----------------|--------|
| Mean Anomaly (M) | ~109° | `marsMeanAnomaly` constant |
| True Anomaly (ν) | ~119° | `marsTrueAnomaly` constant |

**Key Check:** ν - M ≈ 9.69° (Equation of the Center for Mars)

### Visual Verification

**Lines:**
1. Red line (P→Planet) should originate from orbit center (P)
2. Amber line (Sun→Planet) should originate from the Sun

**Arcs:**
3. Red dashed arc (Mean Anomaly) centered at P, sweeping from perihelion to P→Planet direction
4. Amber solid arc (True Anomaly) centered at Sun, sweeping from perihelion to Sun→Planet direction

**Behavior:**
5. At perihelion: both lines nearly overlap, both angles ≈ 0°, arcs are minimal
6. At aphelion: both lines nearly overlap, both angles ≈ 180°, arcs are semicircles
7. At quadrature: lines diverge, True Anomaly > Mean Anomaly, arcs show different sweep angles

---

## Implementation Summary

| Phase | Description |
|-------|-------------|
| **Phase 1** | Update PLANET_HIERARCHIES registry with `fixedPerihelion` reference |
| **Phase 2** | Fix anomaly calculation (separate True and Mean Anomaly) |
| **Phase 3** | Add visualization lines (Red P→Planet, Amber Sun→Planet) |
| **Phase 4** | Add anomaly arcs (Red dashed at P, Amber solid at Sun) |
| **Phase 5** | Dynamic updates for lines and arcs in animation loop |
| **Phase 6** | Cleanup in `removeVisualHelpers()` |
| **Phase 7** | Add properties to `hierarchyInspector` state object |

### Additional: Global Anomaly Values for All Planets

In addition to the hierarchy inspector visualization, the anomalies are calculated for ALL planets and stored in the `o` object for programmatic access.

**Location:** `script.js` around line 13297-13371 (`updateAllPlanetAnomalies()` function)

**Output Properties:**
```javascript
o.mercuryTrueAnomaly    // True Anomaly in degrees (0-360)
o.mercuryMeanAnomaly    // Mean Anomaly in degrees (0-360)
o.venusTrueAnomaly
o.venusMeanAnomaly
o.marsTrueAnomaly
o.marsMeanAnomaly
// ... same pattern for all planets including halleys and eros
```

These values are updated each frame and can be used for:
- Data export
- Debug displays
- Other calculations that need anomaly values

---

## Summary

| Item | Decision |
|------|----------|
| **Calculation method** | Position-based from actual 3D model |
| **P point object** | `[planet]FixedPerihelionAtSun.pivotObj` |
| **Lines** | Red (P→Planet), Amber (Sun→Planet) |
| **Arcs** | Red dashed (Mean at P), Amber solid (True at Sun) |
| **Existing arc** | Keep as-is |
| **Toggle** | Use existing "Show Anomalies Visualization (Step 4)" |
| **Scope** | All planets in hierarchy inspector |
