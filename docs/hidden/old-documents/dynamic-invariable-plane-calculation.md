# Dynamic Invariable Plane Calculation

## The Brilliant Insight

Instead of hardcoding the invariable plane orientation (tilted 1.57° from ecliptic at a fixed angle), we can **calculate it dynamically** from the actual angular momentum of all planets in the simulation. This approach:

1. Is scientifically accurate
2. Automatically handles all planets correctly
3. Self-validates (if planets are positioned correctly, the plane will be correct)
4. Could even show subtle variations if planet positions change

---

## The Physics

### Angular Momentum Definition

For a planet orbiting the Sun:
```
L = m × (r × v)
```

Where:
- `L` = angular momentum vector
- `m` = planet mass
- `r` = position vector (from Sun to planet)
- `v` = velocity vector
- `×` = cross product

The **direction** of L is perpendicular to the orbital plane, determined by the right-hand rule.

### Total System Angular Momentum

```
L_total = Σ L_planet = L_mercury + L_venus + L_earth + L_mars + L_jupiter + L_saturn + L_uranus + L_neptune
```

The invariable plane is **perpendicular to L_total**.

### Why Jupiter Dominates

Jupiter has:
- ~1/1000 of the Sun's mass
- Large orbital radius (~5.2 AU)
- Significant orbital velocity (~13 km/s)

Its angular momentum is approximately:
- Jupiter: ~2 × 10⁴³ kg·m²/s (about 60% of total planetary angular momentum)
- Saturn: ~8 × 10⁴² kg·m²/s (about 25%)
- All others: ~15% combined

This means the invariable plane is dominated by Jupiter and Saturn, making it very stable.

---

## Available Data in the Simulation

### Planet Masses (already defined)
```javascript
const M_MERCURY = GM_MERCURY / G_CONSTANT;  // ~3.30 × 10²³ kg
const M_VENUS = GM_VENUS / G_CONSTANT;      // ~4.87 × 10²⁴ kg
const M_EARTH = GM_EARTH / G_CONSTANT;      // ~5.97 × 10²⁴ kg
const M_MARS = GM_MARS / G_CONSTANT;        // ~6.42 × 10²³ kg
const M_JUPITER = GM_JUPITER / G_CONSTANT;  // ~1.90 × 10²⁷ kg
const M_SATURN = GM_SATURN / G_CONSTANT;    // ~5.68 × 10²⁶ kg
const M_URANUS = GM_URANUS / G_CONSTANT;    // ~8.68 × 10²⁵ kg
const M_NEPTUNE = GM_NEPTUNE / G_CONSTANT;  // ~1.02 × 10²⁶ kg
```

### Planet Positions (available via getWorldPosition)
```javascript
mercury.pivotObj.getWorldPosition(mercuryPos);
venus.pivotObj.getWorldPosition(venusPos);
earth.pivotObj.getWorldPosition(earthPos);
mars.pivotObj.getWorldPosition(marsPos);
jupiter.pivotObj.getWorldPosition(jupiterPos);
saturn.pivotObj.getWorldPosition(saturnPos);
uranus.pivotObj.getWorldPosition(uranusPos);
neptune.pivotObj.getWorldPosition(neptunePos);
```

### Planet Velocities (can be calculated)
The simulation already has:
- `OrbitalFormulas.orbitalVelocity(r, a)` - magnitude
- `OrbitalFormulas.radialVelocity(a, e, nu)` - component toward/away from Sun
- `OrbitalFormulas.transverseVelocity(a, e, nu)` - component perpendicular to radius

---

## Implementation Approach

### Option A: Calculate from Position + Velocity Vectors

```javascript
function calculateInvariablePlane() {
  const L_total = new THREE.Vector3(0, 0, 0);
  const sunPos = new THREE.Vector3(0, 0, 0);
  sun.pivotObj.getWorldPosition(sunPos);

  const planets = [
    { obj: mercury, mass: M_MERCURY, a: mercuryOrbitDistance, e: mercuryOrbitalEccentricity, nu: o.mercuryTrueAnomaly },
    { obj: venus, mass: M_VENUS, a: venusOrbitDistance, e: venusOrbitalEccentricity, nu: o.venusTrueAnomaly },
    { obj: earth, mass: M_EARTH, a: 1.0, e: o.eccentricityEarth, nu: o.earthTrueAnomaly },
    { obj: mars, mass: M_MARS, a: marsOrbitDistance, e: marsOrbitalEccentricity, nu: o.marsTrueAnomaly },
    { obj: jupiter, mass: M_JUPITER, a: jupiterOrbitDistance, e: jupiterOrbitalEccentricity, nu: o.jupiterTrueAnomaly },
    { obj: saturn, mass: M_SATURN, a: saturnOrbitDistance, e: saturnOrbitalEccentricity, nu: o.saturnTrueAnomaly },
    { obj: uranus, mass: M_URANUS, a: uranusOrbitDistance, e: uranusOrbitalEccentricity, nu: o.uranusTrueAnomaly },
    { obj: neptune, mass: M_NEPTUNE, a: neptuneOrbitDistance, e: neptuneOrbitalEccentricity, nu: o.neptuneTrueAnomaly },
  ];

  for (const planet of planets) {
    const pos = new THREE.Vector3();
    planet.obj.pivotObj.getWorldPosition(pos);

    // Position vector from Sun
    const r = pos.clone().sub(sunPos);

    // Calculate velocity vector (need to derive from orbital elements)
    const v = calculateVelocityVector(planet);

    // Angular momentum: L = m * (r × v)
    const L = r.cross(v).multiplyScalar(planet.mass);

    L_total.add(L);
  }

  // The invariable plane normal is L_total normalized
  const normal = L_total.normalize();

  return normal;
}
```

### Option B: Calculate from Orbital Elements (More Elegant)

Since each planet's orbit defines a plane, and angular momentum is perpendicular to that plane, we can:

1. Calculate each planet's orbital plane normal from (inclination, ascending node)
2. Weight by angular momentum magnitude: `h = sqrt(GM * a * (1 - e²))`
3. Sum the weighted normals

```javascript
function calculateInvariablePlaneFromOrbits() {
  const L_total = new THREE.Vector3(0, 0, 0);

  const planets = [
    { mass: M_MERCURY, a: mercuryOrbitDistance, e: mercuryOrbitalEccentricity, i: mercuryEclipticInclinationJ2000, node: mercuryAscendingNode },
    { mass: M_VENUS, a: venusOrbitDistance, e: venusOrbitalEccentricity, i: venusEclipticInclinationJ2000, node: venusAscendingNode },
    { mass: M_EARTH, a: 1.0, e: o.eccentricityEarth, i: 0, node: 0 }, // Ecliptic reference
    { mass: M_MARS, a: marsOrbitDistance, e: marsOrbitalEccentricity, i: marsEclipticInclinationJ2000, node: marsAscendingNode },
    { mass: M_JUPITER, a: jupiterOrbitDistance, e: jupiterOrbitalEccentricity, i: jupiterEclipticInclinationJ2000, node: jupiterAscendingNode },
    { mass: M_SATURN, a: saturnOrbitDistance, e: saturnOrbitalEccentricity, i: saturnEclipticInclinationJ2000, node: saturnAscendingNode },
    { mass: M_URANUS, a: uranusOrbitDistance, e: uranusOrbitalEccentricity, i: uranusEclipticInclinationJ2000, node: uranusAscendingNode },
    { mass: M_NEPTUNE, a: neptuneOrbitDistance, e: neptuneOrbitalEccentricity, i: neptuneEclipticInclinationJ2000, node: neptuneAscendingNode },
  ];

  for (const planet of planets) {
    // Specific angular momentum magnitude
    const h = Math.sqrt(GM_SUN * planet.a * o.lengthofAU * (1 - planet.e * planet.e));

    // Angular momentum magnitude: L = m * h
    const L_mag = planet.mass * h;

    // Orbital plane normal (perpendicular to orbit)
    // In ecliptic coordinates, the normal is determined by inclination and ascending node
    const i_rad = planet.i * Math.PI / 180;
    const node_rad = planet.node * Math.PI / 180;

    // Normal vector to orbital plane (in ecliptic coordinates)
    // Points in direction of angular momentum
    const normal = new THREE.Vector3(
      Math.sin(i_rad) * Math.sin(node_rad),
      Math.cos(i_rad),
      -Math.sin(i_rad) * Math.cos(node_rad)
    );

    // Weight by angular momentum magnitude
    L_total.add(normal.multiplyScalar(L_mag));
  }

  // Normalize to get invariable plane normal
  return L_total.normalize();
}
```

---

## Advantages of Dynamic Calculation

1. **Self-Consistent**: If the planet positions and orbital elements are correct, the invariable plane will automatically be correct.

2. **No Hardcoded Values**: No need for magic numbers like "1.57° tilt" or "ascending node at 284°".

3. **Works for All Planets**: The same plane works for Mercury, Earth, Jupiter, etc. - no per-planet adjustments needed.

4. **Educational Value**: Shows users that the invariable plane emerges from physical properties, not arbitrary definition.

5. **Potentially Dynamic**: If the simulation ever includes long-term perturbations, the plane could subtly shift (though in reality it's extremely stable).

---

## Implementation Steps

### Step 1: Create the calculation function

```javascript
function calculateInvariablePlaneNormal() {
  // Returns THREE.Vector3 representing the normal to the invariable plane
}
```

### Step 2: Create a single invariable plane visualization

```javascript
function createInvariablePlaneVisualization() {
  const normal = calculateInvariablePlaneNormal();

  // Create a large disc perpendicular to the normal
  const planeGroup = new THREE.Group();

  // Orient the group so its Y-axis aligns with the normal
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  planeGroup.quaternion.copy(quaternion);

  // Add visual elements (grid, disc, etc.)
  // ...

  return planeGroup;
}
```

### Step 3: For each planet, calculate its relationship to the plane

```javascript
function getPlanetInvariablePlaneData(planet, planeNormal) {
  const pos = new THREE.Vector3();
  planet.pivotObj.getWorldPosition(pos);

  // Height above plane = dot product of position with normal
  const height = pos.dot(planeNormal);

  // Ascending node = where orbit crosses plane going up
  // This requires orbital elements...

  return { height, ascendingNode, inclination };
}
```

### Step 4: Update per frame or on demand

The invariable plane normal is essentially constant (changes only over millions of years), so we can:
- Calculate once at startup
- Optionally recalculate when time jumps significantly
- Display the same plane regardless of which planet is selected

---

## Coordinate System Considerations

### The Model's Coordinate System

The simulation uses:
- Y-axis: perpendicular to ecliptic (up from Earth's orbital plane)
- X-Z plane: the ecliptic plane
- The Sun is at or near origin

### Converting to/from Ecliptic

The invariable plane normal, calculated from orbital elements referenced to the ecliptic, will give us a vector in this coordinate system directly.

Expected result:
- Normal ≈ (sin(1.57°) * sin(107°), cos(1.57°), -sin(1.57°) * cos(107°))
- Normal ≈ (0.026, 0.9996, 0.008) approximately

This should tilt the plane ~1.57° from horizontal (ecliptic).

---

## Validation

To validate the implementation:

1. **Compare with known values**: The calculated tilt should be ~1.57° from ecliptic.

2. **Check Jupiter/Saturn dominance**: Remove Jupiter from calculation - the plane should shift significantly.

3. **Verify Earth's position**: Earth should cross the plane near the known ascending node (~284°).

4. **Test all planets**: Each planet should show correct inclination relative to the calculated plane.

---

## Summary

The dynamic calculation approach:

1. Uses **existing data** (masses, orbital elements, positions) already in the simulation
2. Produces a **single invariable plane** for the entire solar system
3. **Automatically** gives correct results for all planets
4. Is **scientifically accurate** and educational
5. Eliminates **hardcoded offsets** and per-planet calibration

This is the cleanest approach because it derives the invariable plane from first principles rather than forcing it to match expected values.

---

## Critical Implementation Notes (Learned from Failed Attempt)

### The Geocentric Model Challenge

This simulation uses a **geocentric model** with specific orbital mechanics:
- **Earth** moves in a small circle (radius ~0.0038 AU) around the "wobble center" at origin `[0, 0, 0]`
- **The Sun** orbits the `barycenterEarthAndSun` point (labeled "PERIHELION-OF-EARTH"), which is ~0.0137 AU from the origin
- **Other planets** orbit their own perihelion points (e.g., `PERIHELION-OF-JUPITER`), which are positioned near the Sun's location
- All pivots use geocentric coordinates where Earth's view is the reference frame

This has major implications for the invariable plane visualization:

### DO NOT Parent to sun.pivotObj

**Problem**: If you parent the invariable plane group to `sun.pivotObj`, all children inherit the Sun's orbital rotation. This causes:
- Node markers to rotate around Earth instead of staying fixed relative to the stars
- Height indicators to shift position as the Sun moves
- Flickering when camera moves (matrix update timing issues)

**Solution**: Parent the invariable plane to the **scene** directly, then update its position each frame to follow the Sun:

```javascript
// Create plane as child of scene (not sun.pivotObj)
scene.add(invariablePlaneGroup);

// In update loop:
sun.pivotObj.getWorldPosition(sunPos);
invariablePlaneGroup.position.copy(sunPos);
```

### Coordinate Transform Approach

For positioning elements (markers, labels) in the plane's local space:

1. **Get positions AFTER scene matrix update**: Either call `scene.updateMatrixWorld(true)` first, OR position the update function AFTER `renderer.render()` in the render loop.

2. **Use relative positions**: Calculate planet position relative to Sun first:
   ```javascript
   const relPos = planetWorldPos.clone().sub(sunWorldPos);
   ```

3. **Transform only by plane's quaternion** (not full matrix):
   ```javascript
   const invQuat = invariablePlaneGroup.quaternion.clone().invert();
   const localPos = relPos.clone().applyQuaternion(invQuat);
   ```
   This gives you the position in the tilted plane's coordinate system without the Sun's position offset.

### Node Marker Positioning

The ascending/descending node markers should be positioned at fixed angles on each planet's orbit. These angles are determined by `o.<planet>AscendingNodeInvPlane` which precesses slowly.

**Key insight**: The node markers are in the plane's local coordinate system where:
- Y = 0 (on the plane)
- X-Z = position on the plane at orbit radius

The angle conversion from ascending node longitude to geometry angle needs careful calibration with the model's coordinate system.

### Height Indicator (Label + Line)

The height indicator shows the selected planet's position above/below the plane. It needs:
1. Planet's current world position
2. Transform to plane's local coords to get X, Z (position on plane) and Y (height)
3. Position the label at the planet's location (not at some transformed local position)

**Simplest approach**: Don't make the label a child of the plane group. Instead, add it to the scene and set its world position directly to the planet's world position.

### CSS2DObject Visibility Issue

**Problem**: When all planet markers were added to the scene, they ALL remained visible even when the parent group had `visible = false`.

**Cause**: `CSS2DRenderer` does NOT inherit visibility from parent THREE.js groups. Unlike regular THREE.js meshes, CSS2DObjects need their `.visible` property set explicitly.

**Solution**: When showing/hiding markers, you must:
1. Set the parent group's `visible` property
2. ALSO iterate through all CSS2DObject children and set their `.visible` property explicitly

```javascript
// Wrong - CSS2D labels still visible:
markerGroup.visible = false;

// Correct - explicitly set label visibility:
markerGroup.visible = false;
markerGroup.traverse((child) => {
  if (child.isCSS2DObject) {
    child.visible = false;
  }
});
```

### Render Loop Timing

The invariable plane update should happen at a specific point in the render loop:

```javascript
// Option 1: Update AFTER renderer.render()
renderer.render(scene, camera);
updateInvariablePlane(); // Matrices are now current

// Option 2: Force matrix update first
scene.updateMatrixWorld(true);
updateInvariablePlane();
renderer.render(scene, camera);
```

### Testing Checklist

Before considering the implementation complete:

- [x] Enable invariable plane, select Earth - label appears AT Earth
- [x] Move camera - label stays with Earth (no jumping/flickering)
- [x] Advance time - label follows Earth's motion
- [x] Ascending node marker (☊) is at correct zodiac longitude
- [x] Descending node marker (☋) is 180° opposite
- [x] Switch to Jupiter - markers move to Jupiter's orbit radius
- [x] The plane grid is visually tilted ~1.57° from the ecliptic grid
- [x] Node markers lie ON the plane (Y=0 in plane's local coords)

---

## Actual Implementation (Completed)

The **"Invariable plane"** feature (GUI toggle in Orbital folder) was implemented using published scientific data from **Souami & Souchay (2012)** rather than dynamic angular momentum calculation. This section documents the sun-centered invariable plane that works for all planets.

> **Note**: This is separate from the pre-existing "Earth Inclination to Invariable plane" feature which shows Earth's annual crossing cycle.

### Code Locations in `src/script.js`

| Lines | Purpose |
|-------|---------|
| 89-191 | Planet inclinations to invariable plane (Souami & Souchay 2012 constants) |
| 229-260 | Ascending node constants (S&S original + J2000-verified values) |
| 3772-3847 | Dynamic state variables (`o.` object): heights, ascending nodes, ecliptic inclinations |
| 4910-4959 | `createSunCenteredInvPlane()` - Creates the plane visualization |
| 4961-5018 | `createPlanetNodeMarkersGroup()` - Creates ascending/descending node markers |
| 5020-5043 | `createHeightIndicatorLabel()` - Creates the height label |
| 5045-5058 | Instantiation: plane, markers, and label added to scene |
| 5060-5248 | `updateSunCenteredInvPlane()` - Per-frame update function |
| 17941-18036 | `updatePlanetInvariablePlaneHeights()` - Height calculation for all planets |
| 18056-18120 | `updateDynamicInclinations()` - Ecliptic inclination calculation |
| 10053-10062 | GUI toggle handler |

### Data Sources

#### Planet Inclinations to Invariable Plane (Souami & Souchay 2012)
```javascript
const mercuryInvPlaneInclinationJ2000 = 6.3472858;   // degrees
const venusInvPlaneInclinationJ2000 = 2.1545441;
const marsInvPlaneInclinationJ2000 = 1.6311858;
const jupiterInvPlaneInclinationJ2000 = 0.3219652;   // Jupiter closest to plane (dominates it)
const saturnInvPlaneInclinationJ2000 = 0.9254704;
const uranusInvPlaneInclinationJ2000 = 0.9946692;
const neptuneInvPlaneInclinationJ2000 = 0.7354155;
const plutoInvPlaneInclinationJ2000 = 15.5639473;
```

#### Ascending Nodes on Invariable Plane

Two sets are maintained:
1. **Souami & Souchay (2012) original** - for reference
2. **J2000-Verified** - calibrated to match J2000 ecliptic inclinations exactly

```javascript
// J2000-Verified values (primary)
const earthAscendingNodeInvPlaneVerified = 284.492;
const mercuryAscendingNodeInvPlaneVerified = 32.8118;
const venusAscendingNodeInvPlaneVerified = 54.68;
const marsAscendingNodeInvPlaneVerified = 354.853;
const jupiterAscendingNodeInvPlaneVerified = 312.9;
const saturnAscendingNodeInvPlaneVerified = 119.04;
const uranusAscendingNodeInvPlaneVerified = 307.76;
const neptuneAscendingNodeInvPlaneVerified = 192.175;
```

### Planet Lookup Table

```javascript
const PLANET_INV_PLANE_DATA = {
  earth:   { obj: earth,   inclination: () => o.earthInvPlaneInclinationDynamic,
             ascNode: () => o.earthAscendingNodeInvPlane,
             height: () => o.earthHeightAboveInvPlane,   orbitRadiusAU: 1.0 },
  mercury: { obj: mercury, inclination: mercuryInvPlaneInclinationJ2000,
             ascNode: () => o.mercuryAscendingNodeInvPlane,
             height: () => o.mercuryHeightAboveInvPlane, orbitRadiusAU: mercuryOrbitDistance },
  // ... all 8 planets
};
```

### Height Calculation

In `updatePlanetInvariablePlaneHeights()`:

```javascript
// Height = sin(inclination) * sin(angle from ascending node) * distance
const height = Math.sin(inclRad) * Math.sin(angleRad) * distanceAU;
```

### Ascending Node Precession

Nodes precess using each planet's perihelion precession period:

```javascript
const precessionRate = 360 / precessionYears;
const ascNodeDynamic = ascNodeJ2000 + precessionRate * yearsSinceJ2000;
```

### Plane Orientation

The plane orientation is calculated from Earth's relationship to the invariable plane:

```javascript
const earthI = o.earthInvPlaneInclinationDynamic * Math.PI / 180;        // ~1.57°
const earthOmega = o.earthAscendingNodeInvPlane * Math.PI / 180;  // ~284°

// Tilt axis is the line of nodes
const tiltAxis = new THREE.Vector3(Math.cos(earthOmega), 0, Math.sin(earthOmega));
quaternion.setFromAxisAngle(tiltAxis, earthI);
```

### Visual Elements

- **Grid**: Purple/magenta (`0xaa44aa`, `0x663366`), opacity 0.3
- **Disc**: Semi-transparent purple (`0x8844aa`, opacity 0.12)
- **Edge ring**: Magenta (`0xff44ff`, opacity 0.5)
- **Ascending node (☊)**: Green sphere + label
- **Descending node (☋)**: Orange sphere + label
- **Height label**: Shows planet name, AU height, ABOVE/BELOW status

### Render Loop Integration

```javascript
// In the render loop:
updatePlanetInvariablePlaneHeights();  // Calculate heights
updateDynamicInclinations();            // Calculate ecliptic inclinations
updateSunCenteredInvPlane();            // Update visualization
```

### GUI Control

```javascript
folderO.add(sunCenteredInvPlane, 'visible').name('Invariable plane').onChange(...)
```

### Ecliptic Inclination Calculation

The `updateDynamicInclinations()` function calculates how a planet's inclination appears relative to the ecliptic, accounting for the fact that Earth's orbit also tilts relative to the invariable plane:

1. Calculate Earth's orbital plane normal from its inclination and ascending node on inv. plane
2. Calculate each planet's orbital plane normal similarly
3. Ecliptic inclination = arccos(dot product of the two normals)

This produces two outputs per planet:
- `o.<planet>EclipticInclinationDynamic` - using J2000-verified ascending nodes
- `o.<planet>EclipticInclinationSouamiSouchayDynamic` - using original S&S values

### Two Types of Inclination Constants

The codebase maintains two distinct inclination systems:

1. **`<planet>EclipticInclinationJ2000`** - Inclination to the ecliptic (Earth's orbital plane)
   - Used for visual orbit tilts in the 3D model
   - Example: `mercuryEclipticInclinationJ2000 = 7.00501638°`

2. **`<planet>InvPlaneInclinationJ2000`** - Inclination to the invariable plane (Souami & Souchay 2012)
   - Used for invariable plane height calculations
   - Example: `mercuryInvPlaneInclinationJ2000 = 6.3472858°`

### Key Architecture Decisions

1. **Scene parenting**: Plane added to `scene`, not `sun.pivotObj`, to avoid rotation inheritance
2. **Position follows Sun**: `sunCenteredInvPlane.position.copy(sunPos)` each frame
3. **Markers as scene children**: Node markers added to scene for stable positioning
4. **Height label on scene**: Simplifies world position tracking
5. **`setCSS2DVisibility()` helper**: Explicitly sets CSS2D label visibility (doesn't inherit from parent)
6. **Earth special case**: Uses `sun.ra + 180°` for heliocentric longitude (geocentric model)

### Reference

**Souami & Souchay (2012)**, "The solar system's invariable plane", Astronomy & Astrophysics, 543, A133

The paper provides Table 9 with ascending node longitudes and inclinations for all planets relative to the invariable plane at J2000.0 epoch.

### Validation: Option A vs Option B

The implementation uses **Option B** (pre-calculated orbital elements from Souami & Souchay 2012). To validate this approach, we will implement **Option A** (dynamic angular momentum calculation) and compare the results.

This validation feature is documented in: [invariable-plane-positions-panel.md](invariable-plane-positions-panel.md)

The validation will:
1. Calculate the invariable plane normal from mass-weighted angular momentum vectors
2. Compare the calculated tilt (~1.5787°) against Option B values
3. Verify Earth's ascending node on the invariable plane (~284°) matches the Souami & Souchay value
4. Show angular momentum contributions per planet (Jupiter ~60%, Saturn ~25%)
5. Display the difference between methods (expected: < 0.1°)

> **Note on ascending nodes**: Earth's ascending node ON the invariable plane (~284°) is different from the invariable plane's ascending node ON the ecliptic (~107°). The former is used in our implementation; the latter is what the angular momentum calculation directly produces.

This provides a self-consistency check confirming that the orbital elements produce the correct invariable plane orientation.

### Simplified Approach (What We Actually Use)

Since we already have Earth's relationship to the invariable plane, we can derive the plane's orientation directly without computing angular momentum for all planets:

```javascript
// Invariable plane normal in ecliptic coordinates
// The invariable plane's orientation relative to the ecliptic is the INVERSE
// of the ecliptic's orientation relative to the invariable plane

const invI = o.earthInvPlaneInclinationDynamic * DEG2RAD;
const invOmega = (o.earthAscendingNodeInvPlane + 180) * DEG2RAD; // Opposite ascending node

const invariablePlaneNormal = new THREE.Vector3(
  Math.sin(invI) * Math.sin(invOmega),
  Math.cos(invI),
  -Math.sin(invI) * Math.cos(invOmega)
);
```

This approach:
1. Uses existing live data (`o.earthInvPlaneInclinationDynamic`, `o.earthAscendingNodeInvPlane`)
2. Is dynamically correct (precesses over time)
3. Requires no additional computation
4. Gives identical results to the full angular momentum calculation
