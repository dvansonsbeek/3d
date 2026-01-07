# Inclination Calculations

This document describes how planetary orbital inclinations are calculated in the Holistic Universe Model. Inclination calculations involve two distinct but related concepts:

1. **Inclination to the Invariable Plane** - How much each planet's orbital plane tilts relative to the solar system's fundamental reference plane (oscillates over time)
2. **Inclination to the Ecliptic** - How much each planet's orbital plane tilts relative to Earth's orbital plane (changes as both planes move)

---

## Physical Background

### The Invariable Plane

The **invariable plane** is the fundamental reference plane of the solar system—perpendicular to the total angular momentum vector. Unlike the ecliptic, the invariable plane is truly fixed in space.

### Why Inclinations Change

Each planet's orbital plane precesses around the invariable plane due to gravitational torques from other planets. This precession has two coupled effects:

1. **Ascending node (Ω) rotates** - The line where the orbital plane crosses the invariable plane precesses over time
2. **Inclination oscillates** - As the plane precesses, it tilts toward and away from the invariable plane

These effects are geometrically linked—they're two aspects of the same physical precession motion.

### Reference Frames

```
                    INVARIABLE PLANE (fixed)
                    =======================
                           ↑
                           | Planet's inclination (oscillates)
                           ↓
                    PLANET'S ORBITAL PLANE
                           ↑
                           | Earth's inclination (oscillates 0.93° - 2.06°)
                           ↓
    ─────────────────── ECLIPTIC (tilts over time) ───────────────────
```

The **ecliptic inclination** (what we traditionally measure) depends on both:
- The planet's own inclination to the invariable plane
- Earth's inclination to the invariable plane

---

## Part 1: Inclination Oscillations to the Invariable Plane

### The Ω-Based Approach

The model calculates dynamic inclination using the planet's ascending node position:

```
i(t) = mean + amplitude × cos(Ω(t) - phaseAngle)
```

Where:
- `mean` = Laplace-Lagrange midpoint of the oscillation range
- `amplitude` = Half of the oscillation range
- `Ω(t)` = Current ascending node on invariable plane
- `phaseAngle` = Universal phase angle (203° prograde, 23° retrograde)

### Why This Works

When an orbital plane precesses around the invariable plane:
- At `Ω(t) = phaseAngle`: `cos(0°) = +1` → **Maximum inclination** (mean + amplitude)
- At `Ω(t) = phaseAngle + 90°`: `cos(90°) = 0` → Mean inclination
- At `Ω(t) = phaseAngle + 180°`: `cos(180°) = -1` → **Minimum inclination** (mean - amplitude)

### Universal Phase Angles (s₈ Eigenmode)

All planets use a **universal phase angle** derived from the s₈ eigenmode of Laplace-Lagrange secular theory (γ₈ = 202.8° ≈ 203°):

| Planet | Phase Angle | Precession Direction | Inclination Trend at J2000 |
|--------|-------------|---------------------|---------------------------|
| Mercury | 203° | Prograde | Decreasing |
| Venus | 203° | Prograde | Decreasing |
| Earth | 203° | Prograde | Decreasing |
| Mars | 203° | Prograde | Decreasing |
| Jupiter | 203° | Prograde | Decreasing |
| **Saturn** | **23°** | **Retrograde** | **Increasing** |
| Uranus | 203° | Prograde | Decreasing |
| Neptune | 203° | Prograde | Increasing |
| Pluto | 203° | Prograde | Decreasing |

**Key insight**: Saturn uses 23° (= 203° - 180°) because its ascending node precesses in the **opposite direction** (retrograde). The 180° offset compensates for the reversed precession direction.

### Inclination Constants

All values optimized for **exact J2000 invariable plane inclination match** (verified by [Appendix F](appendix-f-inclination-verification.js)):

| Planet | Mean (°) | Amplitude (°) | J2000 Value (°) | Range (°) | Trend Error |
|--------|----------|---------------|-----------------|-----------|-------------|
| Mercury | 8.0911 | 1.7697 | 6.3473 | 6.32 - 9.86 | 0.5"/cy |
| Venus | 3.0538 | 1.0568 | 2.1545 | 2.00 - 4.11 | 21.2"/cy |
| Earth | 1.4951 | 0.564 | 1.578 | 0.93 - 2.06 | (reference) |
| Mars | 3.6034 | 2.2368 | 1.6312 | 1.37 - 5.84 | 13.1"/cy |
| Jupiter | 0.3589 | 0.1087 | 0.3220 | 0.25 - 0.47 | 0.0"/cy |
| Saturn | 0.9382 | 0.1261 | 0.9255 | 0.81 - 1.06 | 0.0"/cy |
| Uranus | 1.0183 | 0.0926 | 0.9947 | 0.93 - 1.11 | 1.0"/cy |
| Neptune | 0.6451 | 0.0920 | 0.7354 | 0.55 - 0.74 | 0.2"/cy |
| Pluto | 15.7116 | 0.7123 | 15.5639 | 15.00 - 16.42 | 5.1"/cy |

### Implementation

```javascript
function computePlanetInvPlaneInclinationDynamic(planet, currentYear) {
  // Get planet-specific constants
  const mean = mercuryInvPlaneInclinationMean;
  const amplitude = mercuryInvPlaneInclinationAmplitude;
  const period = mercuryPerihelionICRFYears;
  const ascNodeJ2000 = mercuryAscendingNodeInvPlaneVerified;
  const phaseAngle = mercuryInclinationPhaseAngle;  // 203°

  // Calculate current ascending node
  const yearsSinceJ2000 = currentYear - 2000;
  const precessionRate = 360 / period;
  const ascNodeCurrent = ascNodeJ2000 + precessionRate * yearsSinceJ2000;

  // Calculate inclination from ascending node position
  const phaseDeg = ascNodeCurrent - phaseAngle;
  const phaseRad = phaseDeg * Math.PI / 180;

  return mean + amplitude * Math.cos(phaseRad);
}
```

### Oscillation Period = Nodal Precession Period

The inclination oscillation period equals the ascending node precession period for each planet. This is because both effects arise from the same physical mechanism:

| Planet | Period (years) | Period Expression |
|--------|----------------|-------------------|
| Mercury | ~242,268 | `holisticyearLength/(1+(3/13))` |
| Venus | ~646,048 | `holisticyearLength*(2+(1/6))` |
| Earth | ~99,392 | `holisticyearLength/3` |
| Mars | ~74,544 | `holisticyearLength/4` |
| Jupiter | ~59,635 | `holisticyearLength/5` |
| Saturn | ~-37,272 | `-holisticyearLength/8` (retrograde) |
| Uranus | ~99,392 | `holisticyearLength/3` |
| Neptune | ~646,048 | `holisticyearLength*(2+(1/6))` |

---

## Part 2: Ecliptic Inclination Calculation

### The Problem

The **ecliptic** (Earth's orbital plane) tilts over time as Earth's inclination to the invariable plane changes. This means a planet's inclination measured relative to the ecliptic also changes—even if the planet's orbit relative to the invariable plane were perfectly fixed.

### The Geometry

Each orbital plane can be represented by its **normal vector** in invariable-plane coordinates:

```
n = (sin(i) × sin(Ω), sin(i) × cos(Ω), cos(i))
```

Where:
- `i` = Inclination to invariable plane
- `Ω` = Ascending node on invariable plane

### The Algorithm

The angle between two planes equals the angle between their normal vectors:

```javascript
// Calculate orbital plane normal in invariable plane coordinates
function getOrbitalNormal(inclination, ascendingNode) {
  const i = inclination * DEG2RAD;
  const Ω = ascendingNode * DEG2RAD;

  return new THREE.Vector3(
    Math.sin(i) * Math.sin(Ω),
    Math.sin(i) * Math.cos(Ω),
    Math.cos(i)
  );
}

// Calculate ecliptic inclination using dot product
function calculateEclipticInclination(planetNormal, eclipticNormal) {
  const cosAngle = planetNormal.dot(eclipticNormal);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clampedCos) * RAD2DEG;
}
```

### Full Implementation

```javascript
// Pooled vectors for performance
const _eclipticNormal = new THREE.Vector3();
const _planetNormal = new THREE.Vector3();

function updateDynamicInclinations() {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Earth's DYNAMIC inclination to invariable plane
  const earthIncl = o.earthInvPlaneInclinationDynamic;
  const earthAscNode = o.earthAscendingNodeInvPlane;

  // Calculate current ecliptic normal
  const earthI = earthIncl * DEG2RAD;
  const earthOmega = earthAscNode * DEG2RAD;
  _eclipticNormal.set(
    Math.sin(earthI) * Math.sin(earthOmega),
    Math.cos(earthI),
    Math.sin(earthI) * Math.cos(earthOmega)
  );

  // Planet configuration with DYNAMIC inclinations
  const planets = [
    { key: 'mercury', incl: o.mercuryInvPlaneInclinationDynamic, ascNode: o.mercuryAscendingNodeInvPlane },
    { key: 'venus',   incl: o.venusInvPlaneInclinationDynamic,   ascNode: o.venusAscendingNodeInvPlane },
    { key: 'mars',    incl: o.marsInvPlaneInclinationDynamic,    ascNode: o.marsAscendingNodeInvPlane },
    // ... etc for all planets
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

    // Calculate ecliptic inclination
    const cosAngle = _planetNormal.dot(_eclipticNormal);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const eclipticIncl = Math.acos(clampedCos) * RAD2DEG;

    o[key + 'EclipticInclinationDynamic'] = eclipticIncl;
  }
}
```

### Output Variables

| Variable | Description |
|----------|-------------|
| `o.<planet>InvPlaneInclinationDynamic` | Current inclination to invariable plane (oscillates) |
| `o.<planet>EclipticInclinationDynamic` | Current inclination to ecliptic (calculated from both planes) |

---

## Part 3: J2000 Calibration

### The Calibration Challenge

The model needs to produce exact J2000 ecliptic inclinations while using a physically-based approach. Two sets of ascending node values are maintained:

1. **Souami & Souchay (S&S) values** - Original published values from the 2012 paper
2. **Verified values** - Adjusted values calibrated to match J2000 exactly

### J2000 Ecliptic Inclinations (Reference)

| Planet | J2000 Ecliptic Inclination |
|--------|---------------------------|
| Mercury | 7.00501638° |
| Venus | 3.3946018° |
| Mars | 1.84971028° |
| Jupiter | 1.30450732° |
| Saturn | 2.4853834° |
| Uranus | 0.77234317° |
| Neptune | 1.768273° |
| Pluto | 17.14175° |

### Calibration Method

For each planet, the ascending node is adjusted so that at J2000:
- Using dynamic Earth inclination (~1.578°)
- Using Earth's verified ascending node (284.5304°)
- The calculated ecliptic inclination matches the J2000 reference

The mathematical solution:

```
cos(i_target) = n_planet · n_ecliptic

Expanding:
cos(i_target) = A × sin(Ω_P) × ex + A × cos(Ω_P) × ey + B × ez

Where:
  A = sin(i_P)       [planet inclination to inv. plane]
  B = cos(i_P)
  ex, ey, ez = ecliptic normal components

Solution:
  Ω_P = atan2(ex, ey) ± acos(C / (A × R))

Where:
  C = cos(i_target) - B × ez
  R = sqrt(ex² + ey²)
```

### Verified Ascending Node Values

Values calibrated with `earthAscendingNodeInvPlaneVerified = 284.5304°`:

| Planet | S&S Value (°) | Verified Value (°) | Δ from S&S |
|--------|---------------|--------------------|-----------|
| Mercury | 32.22 | 32.85 | +0.63° |
| Venus | 52.31 | 54.72 | +2.41° |
| Earth | 284.51 | 284.5304 | +0.02° |
| Mars | 352.95 | 354.89 | +1.94° |
| Jupiter | 306.92 | 312.91 | +5.99° |
| Saturn | 122.27 | 118.83 | -3.44° |
| Uranus | 308.44 | 307.82 | -0.62° |
| Neptune | 189.28 | 192.06 | +2.78° |
| Pluto | 107.06 | 101.08 | -5.98° |

### Earth's Ascending Node Derivation

The value 284.5304° for `earthAscendingNodeInvPlaneVerified` is derived geometrically from:

```
earthAscendingNodeInvPlaneVerified = longitudePerihelion + 180° + inclination
                                   = 102.9517° + 180° + 1.5787°
                                   = 284.5304°
```

This formula relates Earth's ascending node on the invariable plane to its perihelion longitude and inclination at the balance year (when axial tilt exactly opposes orbital inclination)

---

## Part 4: Long-Term Behavior

### Ecliptic Inclination Variations

The ecliptic inclination of each planet varies cyclically due to:
1. **Earth's inclination** oscillating between 0.93° and 2.06°
2. **Planet's inclination** oscillating within its Laplace-Lagrange bounds
3. **Both ascending nodes** precessing at different rates

### Expected Ranges

| Planet | Approx. Min | Approx. Max | Notes |
|--------|-------------|-------------|-------|
| Mercury | ~4.3° | ~8.4° | Large range, highest invariable plane inclination |
| Venus | ~1.3° | ~4.4° | Moderate range |
| Mars | ~0.1° | ~3.2° | Can nearly align with ecliptic |
| Jupiter | ~0.9° | ~1.6° | Small range, closest to invariable plane |
| Saturn | ~1.5° | ~3.4° | Moderate range |
| Uranus | ~0.2° | ~2.0° | Can nearly align with ecliptic |
| Neptune | ~1.0° | ~2.4° | Moderate range |
| Pluto | ~13.5° | ~17.6° | Always highly inclined |

### Special Cases: Mars, Saturn, and Uranus

**Mars** has an invariable plane inclination range (1.37° - 5.84°) that overlaps Earth's range (0.93° - 2.06°). When their inclinations are equal and ascending nodes align, Mars's orbital plane can become **nearly parallel to the ecliptic** (ecliptic inclination approaching 0°).

**Saturn** (0.84° - 1.03°) and **Uranus** (0.93° - 1.11°) also have ranges that overlap Earth's minimum values. These planets can experience very low ecliptic inclinations when the geometry aligns.

**Jupiter** (0.27° - 0.43°) and **Neptune** (0.55° - 0.74°) have inclination ranges entirely **below** Earth's minimum (0.93°), so their planes can never become exactly parallel to the ecliptic, but they can get relatively close (minimum ecliptic inclination ~0.5° for Jupiter).

---

## Validation

### At J2000 (Year 2000)

Dynamic inclinations should match static J2000 values within 0.01°.

### Trend Verification

After implementation, ecliptic inclination rates should match JPL observed values:

| Planet | JPL Rate (°/cy) | Expected Trend |
|--------|-----------------|----------------|
| Mercury | -0.00595 | Decreasing ✓ |
| Venus | -0.00079 | Decreasing ✓ |
| Mars | -0.00813 | Decreasing ✓ |
| Jupiter | -0.00184 | Decreasing ✓ |
| Saturn | **+0.00194** | **Increasing** (requires retrograde phase) |
| Uranus | -0.00243 | Decreasing ✓ |
| Neptune | **+0.00035** | **Increasing** ✓ |

---

## UI Display

### Planet Inspector Panel

The planet information panels display four invariable plane values:

| UI Label | Description |
|----------|-------------|
| **Ascending Node on Inv. Plane (Ω)** | Current ascending node in ecliptic coordinates |
| **Descending Node on Inv. Plane** | Ascending node + 180° |
| **Ω at Max Inclination** | Where inclination reaches maximum (precesses) |
| **Current Oscillation Phase** | Position in oscillation cycle (0° = max, 180° = min) |

**Note**: The first three values use ecliptic coordinates (precession period ~18,636 years), while the oscillation phase uses ICRF coordinates (precession period ~99,392 years).

---

## References

1. **Souami, D. & Souchay, J. (2012)** - "The solar system's invariable plane", A&A 543, A133
   - [Full paper](https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html)
2. **JPL Approximate Positions of the Planets** - Secular variation rates
   - https://ssd.jpl.nasa.gov/planets/approx_pos.html
3. **Laplace-Lagrange Secular Theory** - Eigenmode oscillations
   - https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [10 - Constants Reference](10-constants-reference.md) | All inclination and ascending node constants |
| [14 - Ascending Node Calculations](14-ascending-node-calculations.md) | Ascending node precession |
| [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) | Height above/below invariable plane |
| [Appendix A - Ascending Node Optimization](appendix-a-ascending-node-optimization.js) | Numerical optimization to calculate ascending node values |
| [Appendix C - Ascending Node Verification](appendix-c-ascending-node-verification.js) | Verification that J2000-verified ascending nodes produce correct ecliptic inclinations |
| [Appendix D - Ascending Node Comparison](appendix-d-ascending-node-souami-souchay.js) | Comparison of S&S vs Verified ascending node accuracy |
| [Appendix E - Inclination Optimization](appendix-e-inclination-optimization.js) | Optimization script to calculate mean/amplitude values |
| [Appendix F - Inclination Verification](appendix-f-inclination-verification.js) | Verification script for mean/amplitude values |
| [Appendix B - Analytical Ascending Nodes](appendix-b-analytical-ascending-nodes.js) | Analytical (closed-form) calculation of ascending nodes |

---

**Previous**: [14 - Ascending Node Calculations](14-ascending-node-calculations.md)
**Next**: [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md)
