# Planet Hierarchy Inspector - Calculation Logic

## Overview

The Planet Hierarchy Inspector displays orbital plane information for Step 4 objects (PerihelionFromSun). This document describes how the calculations work, including the **dynamic ascending node** feature that updates orbital plane visualizations in real-time as Earth's obliquity changes.

**Related Documentation:**
- [Dynamic Ascending Node Calculation](./dynamic-ascending-node-calculation.md) - Full details on the ascending node calculation algorithm

---

## 1. Orbital Tilt Encoding

### How tilt values are stored in `createPlanet`

Each planet's orbital inclination is encoded using two values:

```javascript
orbitTilta: Math.cos(((-90 - Ω) * Math.PI) / 180) * -i
orbitTiltb: Math.sin(((-90 - Ω) * Math.PI) / 180) * -i
```

Where:
- `Ω` (Omega) = Longitude of the ascending node (degrees from vernal equinox)
- `i` = Orbital inclination (degrees)

### Simplified Form

The encoding can be simplified using trigonometric identities:
- `cos(-90° - Ω) = -sin(Ω)`
- `sin(-90° - Ω) = -cos(Ω)`

Therefore:
- `orbitTilta = -sin(Ω) * -i = sin(Ω) * i`
- `orbitTiltb = -cos(Ω) * -i = cos(Ω) * i`

### Example: Venus
```javascript
const venusOrbitalInclination = 3.394667;    // i = 3.39°
const venusAscendingNode = 76.67877109;      // Ω = 76.68°

// Calculated values:
// orbitTilta = sin(76.68°) * 3.39 ≈ 3.30°
// orbitTiltb = cos(76.68°) * 3.39 ≈ 0.79°
```

### Application in createPlanet

The tilt is applied to `orbitContainer` using Euler angles:
```javascript
orbitContainer.rotation.x = pd.orbitTilta * Math.PI/180;
orbitContainer.rotation.z = pd.orbitTiltb * Math.PI/180;
```

---

## 2. Coordinate Systems

### Three.js World Coordinates
- **Y-axis**: Up (perpendicular to ecliptic plane)
- **X-axis**: Right (toward vernal equinox, 0°)
- **Z-axis**: Toward camera when looking down Y (toward 90°/summer solstice)

### Ecliptic Plane
- The ecliptic plane is at `y = 0`
- Points with `y > 0` are **above** the ecliptic (north)
- Points with `y < 0` are **below** the ecliptic (south)

### Ecliptic Longitude (when viewed from above/north)
- **0°** = Right (+X direction, vernal equinox)
- **90°** = Top (+Z direction, summer solstice)
- **180°** = Left (-X direction, autumnal equinox)
- **270°** = Bottom (-Z direction, winter solstice)

### Model Start Position
- The model starts at **June 21** (summer solstice)
- June 21 corresponds to ecliptic longitude **90°**

---

## 3. Object Hierarchy (CRITICAL)

### The Three.js Scene Graph for Planets

```
orbitContainer (rotation.x = orbitTilta, rotation.z = orbitTiltb)
├── inclinationPlane ← Visualization added HERE (inherits tilt only)
│   ├── eclipticLine (blue dashed circle at y=0)
│   ├── orbitLine (white circle showing orbital path)
│   ├── aboveHalfPlane (green mesh for y > 0 in world space)
│   ├── belowHalfPlane (red mesh for y < 0 in world space)
│   ├── ascendingNode (magenta sphere with up arrow)
│   ├── descendingNode (cyan sphere with down arrow)
│   ├── highestPointMarker (green sphere at max north, 90° after ascending)
│   ├── lowestPointMarker (red sphere at max south, 90° after descending)
│   └── nodesLine (yellow dashed line connecting nodes)
└── orbit (rotation.y = orbital position, changes with animation)
    ├── orbitLine (rotation.x = PI/2)
    └── pivot (position.x = semi-major axis)
        └── rotationAxis → planet mesh
```

### Why This Hierarchy Matters

**The ascending/descending nodes shift over time** due to changes in Earth's obliquity. However, they do NOT depend on:
- `startPos` (where the planet starts in its orbit)
- `orbit.rotation.y` (the planet's current orbital position)

**Therefore**, the `inclinationPlane` visualization must be added to `orbitContainer`, NOT to `pivot` or any child of `orbit`. This ensures it inherits only the orbital tilt, not the orbital position rotation.

### Dynamic Updates

The `orbitContainer.rotation` is updated each frame by `updateOrbitalPlaneRotations()` to reflect the current dynamic ascending node. See [Dynamic Ascending Node Calculation](./dynamic-ascending-node-calculation.md) for details.

---

## 4. Node Definitions

### Ascending Node
- The point where the orbit crosses the ecliptic going from **south to north** (below to above)
- At this point, the planet is moving from `y < 0` to `y > 0`
- Marked with a **magenta sphere** with an **up arrow**

### Descending Node
- The point where the orbit crosses the ecliptic going from **north to south** (above to below)
- At this point, the planet is moving from `y > 0` to `y < 0`
- Marked with a **cyan sphere** with a **down arrow**

### Venus Ascending Node
- Located at ecliptic longitude **76.68°**
- This corresponds to approximately **June 8** in the calendar

---

## 5. Visualization Implementation

### Local vs World Coordinate Systems

The visualization is added to `orbitContainer`, so:
- **LOCAL y=0 plane** = the tilted orbital plane (appears tilted in world space)
- **WORLD y=0 plane** = the ecliptic

### Transform Matrix

To check where local points appear in world space, we use a transform matrix matching the parent's Euler rotation:

```javascript
const localToWorld = new THREE.Matrix4();
localToWorld.makeRotationFromEuler(new THREE.Euler(tiltaRad, 0, tiltbRad, 'XYZ'));
```

### Finding Node Positions

1. Sample points on the LOCAL orbital plane (flat circle at local y=0)
2. Transform each point to WORLD space using `localToWorld`
3. Find where the transformed points cross WORLD y=0
4. Store the LOCAL positions for placing markers (parent transform handles world placement)

```javascript
for (let i = 0; i < numSamples; i++) {
  // Points on LOCAL orbital plane
  const p1Local = new THREE.Vector3(planeRadius * Math.cos(angle1), 0, planeRadius * Math.sin(angle1));

  // Transform to WORLD space
  const p1World = p1Local.clone().applyMatrix4(localToWorld);

  // Find crossings of WORLD y=0
  if (p1World.y <= 0 && p2World.y > 0) {
    // DESCENDING node (planet orbits clockwise, so loop direction is opposite)
    descendingNodePos.lerpVectors(p1Local, p2Local, t);  // Store LOCAL position
  } else if (p1World.y >= 0 && p2World.y < 0) {
    // ASCENDING node
    ascendingNodePos.lerpVectors(p1Local, p2Local, t);   // Store LOCAL position
  }
}
```

### Half-Plane Coloring

- **Green half-plane**: Segments where WORLD y > 0 (above ecliptic)
- **Red half-plane**: Segments where WORLD y < 0 (below ecliptic)

The geometry uses LOCAL positions (flat at y=0), but the coloring decision uses WORLD y positions.

---

## 6. Reference Values

### Venus Orbital Parameters
| Parameter | Value | Source |
|-----------|-------|--------|
| Orbital inclination | 3.394667° | Model constant |
| Ascending node longitude | 76.67877109° | Model constant |

### Calendar Dates to Ecliptic Longitude (Approximate)
| Date | Ecliptic Longitude |
|------|-------------------|
| March 20 (Vernal equinox) | 0° |
| June 8 (Venus asc. node) | ~76.68° |
| June 21 (Summer solstice) | 90° |
| September 22 (Autumnal equinox) | 180° |
| December 21 (Winter solstice) | 270° |

---

## 7. Key Code Locations

| Component | File | Description |
|-----------|------|-------------|
| Venus constants | [script.js:91-103](../src/script.js#L91-L103) | Orbital parameters |
| hierarchyInspector state | [script.js:3660-3695](../src/script.js#L3660-L3695) | Inspector state with all marker references |
| Inclination visualization creation | [script.js:4022-4296](../src/script.js#L4022-L4296) | Node detection and half-plane rendering |
| Live data updates | [script.js:5586-5771](../src/script.js#L5586-L5771) | Dynamic marker position updates |
| Dynamic ascending node calculation | [script.js:9436-9588](../src/script.js#L9436-L9588) | Main calculation function |
| updateAscendingNodes() | [script.js:9617-9684](../src/script.js#L9617-L9684) | Updates all planet ascending nodes |
| updateOrbitalPlaneRotations() | [script.js:9699-9730](../src/script.js#L9699-L9730) | Updates container rotations |

---

## 8. Dynamic Ascending Node Updates

### Overview

The ascending node is NOT fixed—it shifts over time as Earth's obliquity changes. The implementation updates the visual markers in real-time.

### Update Flow (Each Frame)

1. **`updateAscendingNodes()`** calculates new ascending node values for all planets using `calculateDynamicAscendingNodeFromTilts()`
2. **`updateOrbitalPlaneRotations()`** updates the `containerObj.rotation` for each planet's RealPerihelionAtSun object
3. **`updateHierarchyLiveData()`** recalculates LOCAL marker positions based on current container rotation

### What Gets Updated

| Element | Update Method |
|---------|---------------|
| Container rotation | `updateOrbitalPlaneRotations()` - rotates entire orbital plane |
| Ascending/descending nodes | Sample orbit, find world y=0 crossings |
| Highest/lowest point markers | Sample orbit, find max/min world y positions |
| Half-plane geometries | Rebuild triangle indices based on world y positions |
| Line of nodes | Update vertex positions to connect nodes |
| Node arrows | Move to new node positions |

### Marker Position Algorithm

```javascript
// Build transform matrix from current container rotation
const localToWorld = new THREE.Matrix4();
localToWorld.makeRotationFromEuler(new THREE.Euler(tiltaRad, 0, tiltbRad, 'XYZ'));

// Sample orbit points and find ecliptic crossings
for (let i = 0; i < numSamples; i++) {
  const localPt = new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
  const worldPt = localPt.clone().applyMatrix4(localToWorld);

  // Ascending node: world y goes from negative to positive
  // Descending node: world y goes from positive to negative
  // Highest point: maximum world y
  // Lowest point: minimum world y
}
```

### Half-Plane Geometry Rebuild

The green/red half-planes show which parts of the orbit are above/below the ecliptic. When the ascending node changes, the half-plane geometries must be rebuilt:

```javascript
const rebuildHalfDiscGeometry = (mesh, isAbove) => {
  const indices = [];
  // Only include triangles where midpoint world Y matches isAbove
  for (let i = 1; i < orbitPoints.length; i++) {
    const midWorldY = (orbitPointsWorld[i-1].y + orbitPointsWorld[i].y) / 2;
    if ((midWorldY > 0) === isAbove) {
      indices.push(0, i, i + 1);  // Triangle from center to edge segment
    }
  }
  mesh.geometry.setIndex(indices);
  mesh.geometry.computeVertexNormals();
};
```

---

## 9. Historical Issues (Resolved)

### Issue: Visualization rotated with orbital position
**Symptom**: Changing `startPos` caused the ascending node marker to move.

**Cause**: The `inclinationPlane` was added to `pivotObj`, which is a child of `orbit`. Since `orbit.rotation.y` changes with the planet's orbital position, the visualization rotated incorrectly.

**Fix**: Add `inclinationPlane` to `containerObj` (the `orbitContainer`) instead of `pivotObj`. This ensures the visualization only inherits the orbital tilt, not the orbital position.

```javascript
// WRONG - rotates with orbital position
obj.pivotObj.add(hierarchyInspector.inclinationPlane);

// CORRECT - only inherits tilt
obj.containerObj.add(hierarchyInspector.inclinationPlane);
```

### Issue: Static ascending nodes
**Symptom**: Node markers stayed fixed at epoch 2000 positions even when simulating far into future/past.

**Cause**: The ascending node visualization was created once at initialization using static `orbitTilta`/`orbitTiltb` values.

**Fix**: Added `updateOrbitalPlaneRotations()` to dynamically update container rotations, and extended `updateHierarchyLiveData()` to recalculate marker positions each frame based on current container rotation.

---

## 10. Ecliptic Position Calculations

The Planet Hierarchy Inspector shows real-time ecliptic position data for the selected planet.

### Values Displayed

| Field | Source | Description |
|-------|--------|-------------|
| Height above ecliptic | `planetObj.getWorldPosition().y` | Actual world Y coordinate |
| Height ratio (%) | `worldY / maxY * 100` | Percentage of max height for this orbit |
| Angle from ascending node | `eclipticLongitude - ascNodeAngle` | Planet's position in its orbit relative to ascending node |
| Ascending node longitude | `o.[planet]AscendingNode` | Dynamic ascending node value |

### Ecliptic Longitude Calculation

```javascript
// Get planet's world position
planet.pivotObj.getWorldPosition(vec);

// Calculate ecliptic longitude from X,Z coordinates
// 0° = +X (vernal equinox), 90° = +Z (summer solstice)
const eclipticLongitude = Math.atan2(vec.z, vec.x) * 180 / Math.PI;

// Angle from ascending node
const angleFromAsc = ((eclipticLongitude - ascNodeAngleDeg) % 360 + 360) % 360;
```

### Important Notes

- **Height above ecliptic** is the actual 3D world Y position, not a formula
- **Angle from ascending node** uses the dynamic ascending node, updated each frame
- These values can be used to verify the orbital mechanics are working correctly
