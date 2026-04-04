# Inclination Calculations

This document describes how planetary orbital inclinations are calculated in the Holistic Universe Model. Inclination calculations involve two distinct but related concepts:

1. **Inclination to the Invariable Plane** - How much each planet's orbital plane tilts relative to the solar system's fundamental reference plane (oscillates over time)
2. **Inclination to the Ecliptic** - How much each planet's orbital plane tilts relative to Earth's orbital plane (changes as both planes move)

---

## Physical Background

### The Invariable Plane

The **invariable plane** is the fundamental reference plane of the solar system—perpendicular to the total angular momentum vector. Unlike the ecliptic, the invariable plane is truly fixed in space.

### Why Inclinations Change

Each planet's orbital plane precesses around the invariable plane due to gravitational torques from other planets. This precession has two effects:

1. **Ascending node (Ω) rotates** - The line where the orbital plane crosses the invariable plane precesses over time
2. **Inclination oscillates** - The plane tilts toward and away from the invariable plane

The inclination oscillation is driven by the ICRF perihelion longitude (ω̃), not the ascending node. The ICRF perihelion rate equals the ecliptic perihelion rate minus the general precession rate (H/13).

### Reference Frames

```
                    INVARIABLE PLANE (fixed)
                    =======================
                           ↑
                           | Planet's inclination (oscillates)
                           ↓
                    PLANET'S ORBITAL PLANE
                           ↑
                           | Earth's inclination (oscillates 0.85° - 2.12°)
                           ↓
    ─────────────────── ECLIPTIC (tilts over time) ───────────────────
```

The **ecliptic inclination** (what we traditionally measure) depends on both:
- The planet's own inclination to the invariable plane
- Earth's inclination to the invariable plane

---

## Part 1: Inclination Oscillations to the Invariable Plane

### The ICRF Perihelion Approach

The model calculates dynamic inclination using the planet's ICRF perihelion longitude:

```
i(t) = mean + amplitude × cos(ω̃_ICRF(t) - phaseAngle)
```

Where:
- `mean` = Computed from J2000 constraint (mean = inclJ2000 - amplitude × cos(ω̃_J2000 - phaseAngle))
- `amplitude` = Fibonacci-derived: ψ / (d × √m), see [Fibonacci Laws](10-fibonacci-laws.md)
- `ω̃_ICRF(t)` = Current ICRF perihelion longitude (ecliptic perihelion minus general precession)
- `phaseAngle` = Per-planet phase angle from balanced year (see table below)

### Why This Works

The ICRF perihelion longitude tracks each planet's apsidal precession in an inertial frame. As the perihelion sweeps through its cycle:
- At `ω̃_ICRF(t) = phaseAngle`: `cos(0°) = +1` → **Maximum inclination** (mean + amplitude)
- At `ω̃_ICRF(t) = phaseAngle + 90°`: `cos(90°) = 0` → Mean inclination
- At `ω̃_ICRF(t) = phaseAngle + 180°`: `cos(180°) = -1` → **Minimum inclination** (mean - amplitude)

For Saturn (anti-phase), the sign is flipped: MAX at balanced year (where others are at MIN).

### Per-Planet Phase Angles

Each planet has its own phase angle, derived from the ICRF perihelion longitude at the balanced year (n=0, ~302,635 BC). At the balanced year, all in-phase planets reach minimum inclination and Saturn (anti-phase) reaches maximum:

| Planet | Phase Angle | Balance Group | ICRF Direction | Incl. Trend at J2000 |
|--------|-------------|---------------|----------------|---------------------------|
| Mercury | 99.52° | In-phase | Retrograde | Decreasing |
| Venus | 79.82° | In-phase | Retrograde | Decreasing |
| Earth | 21.77° | In-phase | Prograde | Decreasing |
| Mars | 96.95° | In-phase | Retrograde | Decreasing |
| Jupiter | 291.18° | In-phase | Retrograde | Decreasing |
| **Saturn** | **120.38°** | **Anti-phase** | **Retrograde** | **Increasing** |
| Uranus | 21.33° | In-phase | Retrograde | Decreasing |
| Neptune | 354.04° | In-phase | Retrograde | Decreasing |
| Pluto | 203.32° | — | Retrograde | Decreasing |

**Key insights**:
- Phase angles are the ICRF perihelion longitude at the balanced year (when inclination is at extremum)
- Balance groups are determined by the **invariable plane balance condition**: Σ(in-phase) w = Σ(anti-phase) w
- Saturn is **anti-phase**: its inclination is at MAX when all other planets are at MIN
- Earth is the **sole planet** with prograde ICRF perihelion motion (+H/3); all others are retrograde
- Phase angles cluster near Laplace-Lagrange eigenmodes (γ₁-γ₈) within 1-10°

### Inclination Constants

All values derived from **Fibonacci Laws** (amplitude = ψ / (d × √m)) with means computed for **exact J2000 invariable plane inclination match** (verified by [Inclination Optimization](../tools/verify/inclination-optimization.js) and [Inclination Verification](../tools/verify/inclination-verification.js)):

For current values, see [Constants Reference](20-constants-reference.md).

| Planet | Mean | Amplitude |
|--------|------|-----------|
| Mercury | `mercuryInvPlaneInclinationMean` | `mercuryInvPlaneInclinationAmplitude` |
| Venus | `venusInvPlaneInclinationMean` | `venusInvPlaneInclinationAmplitude` |
| Earth | `earthInvPlaneInclinationMean` | `earthInvPlaneInclinationAmplitude` |
| Mars | `marsInvPlaneInclinationMean` | `marsInvPlaneInclinationAmplitude` |
| Jupiter | `jupiterInvPlaneInclinationMean` | `jupiterInvPlaneInclinationAmplitude` |
| Saturn | `saturnInvPlaneInclinationMean` | `saturnInvPlaneInclinationAmplitude` |
| Uranus | `uranusInvPlaneInclinationMean` | `uranusInvPlaneInclinationAmplitude` |
| Neptune | `neptuneInvPlaneInclinationMean` | `neptuneInvPlaneInclinationAmplitude` |
| Pluto | `plutoInvPlaneInclinationMean` | `plutoInvPlaneInclinationAmplitude` |

### Implementation

```javascript
function computePlanetInvPlaneInclinationDynamic(planet, currentYear) {
  // Get planet-specific constants
  const mean = mercuryInvPlaneInclinationMean;
  const amplitude = mercuryInvPlaneInclinationAmplitude;
  const icrfPeriod = mercuryPerihelionICRFYears;     // |ICRF period|
  const periLongJ2000 = mercuryLongitudePerihelion;   // ICRF perihelion at J2000
  const phaseAngle = mercuryInclinationPhaseAngle;    // 99.52°

  // Calculate current ICRF perihelion longitude
  const yearsSinceJ2000 = currentYear - 2000;
  const icrfRate = 360 / icrfPeriod;  // negative for retrograde planets
  const periLongCurrent = periLongJ2000 + icrfRate * yearsSinceJ2000;

  // Calculate inclination from ICRF perihelion position
  const phaseDeg = periLongCurrent - phaseAngle;
  const phaseRad = phaseDeg * Math.PI / 180;

  // Saturn is anti-phase: flip the cosine sign
  const sign = (planet === 'saturn') ? -1 : 1;
  return mean + sign * amplitude * Math.cos(phaseRad);
}
```

### ICRF Perihelion Periods

The inclination oscillation period equals the absolute ICRF perihelion period for each planet. The ICRF rate = ecliptic rate − general precession (H/13):

| Planet | Ecliptic Period | ICRF Period | ICRF Direction |
|--------|----------------|-------------|----------------|
| Mercury | `H × 8/11` | `8H/93` ≈ 28,844 yr | Retrograde |
| Venus | `H × 2` | `2H/25` ≈ 26,825 yr | Retrograde |
| Earth | `H / 3` | `H/3` ≈ 111,772 yr | Prograde (sole) |
| Mars | `H × 8/35` | `8H/69` ≈ 38,877 yr | Retrograde |
| Jupiter | `H / 5` | `H/8` ≈ 41,915 yr | Retrograde |
| Saturn | `H / 8` | `H/5` ≈ 67,063 yr | Retrograde |
| Uranus | `H / 3` | `H/16` ≈ 20,957 yr | Retrograde |
| Neptune | `H × 2` | `2H/25` ≈ 26,825 yr | Retrograde |
| Pluto | `H` | `H/14` ≈ 23,951 yr | Retrograde |

For computed period values, see [Constants Reference](20-constants-reference.md).

### Grand Holistic Octave (8H)

All ICRF perihelion periods divide evenly into 8H = 2,682,536 years (the "Grand Holistic Octave"), ensuring all 8 planets return simultaneously to their balanced-year configuration. This is a structural consequence of the Fibonacci period ratios.

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
- Using Earth's ascending node (284.51° - Souami & Souchay 2012)
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

Values calibrated with `earthAscendingNodeInvPlaneVerified = 284.51°` (Souami & Souchay 2012):

| Planet | S&S Value (°) | Verified Value (°) | Δ from S&S |
|--------|---------------|--------------------|-----------|
| Mercury | 32.22 | 32.83 | +0.61° |
| Venus | 52.31 | 54.70 | +2.39° |
| Earth | 284.51 | 284.51 | 0.00° |
| Mars | 352.95 | 354.87 | +1.92° |
| Jupiter | 306.92 | 312.89 | +5.97° |
| Saturn | 122.27 | 118.81 | -3.46° |
| Uranus | 308.44 | 307.80 | -0.64° |
| Neptune | 189.28 | 192.04 | +2.76° |
| Pluto | 107.06 | 101.06 | -6.00° |

### Earth's Ascending Node

The value 284.51° for `earthAscendingNodeInvPlaneVerified` is the original Souami & Souchay (2012) value for Earth's ascending node on the invariable plane at J2000.

---

## Part 4: Long-Term Behavior

### Ecliptic Inclination Variations

The ecliptic inclination of each planet varies cyclically due to:
1. **Earth's inclination** oscillating between 0.85° and 2.12°
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

**Mars** has an invariable plane inclination range (1.36° - 5.84°) that overlaps Earth's range (0.85° - 2.12°). When their inclinations are equal and ascending nodes align, Mars's orbital plane can become **nearly parallel to the ecliptic** (ecliptic inclination approaching 0°).

**Saturn** (0.78° - 1.11°) and **Uranus** (0.92° - 1.04°) also have ranges that overlap Earth's minimum values. These planets can experience very low ecliptic inclinations when the geometry aligns.

**Jupiter** (0.28° - 0.41°) and **Neptune** (0.62° - 0.74°) have inclination ranges entirely **below** Earth's minimum (0.85°), so their planes can never become exactly parallel to the ecliptic, but they can get relatively close (minimum ecliptic inclination ~0.4° for Jupiter).

---

## Validation

### At J2000 (Year 2000)

Dynamic inclinations should match static J2000 values within 0.01°.

### Trend Verification

After implementation, ecliptic inclination rates should match JPL observed values:

| Planet | JPL Rate (°/cy) | Expected Trend | Match |
|--------|-----------------|----------------|-------|
| Mercury | -0.00595 | Decreasing | ✓ |
| Venus | -0.00079 | Decreasing | ✓ |
| Mars | -0.00813 | Decreasing | ✓ |
| Jupiter | -0.00184 | Decreasing | ✓ |
| Saturn | **+0.00194** | **Increasing** (retrograde) | ✓ |
| Uranus | -0.00243 | Decreasing | ✓ |
| Neptune | +0.00035 | Decreasing (balance model) | ✗ |

**Note**: Neptune's trend direction (✗) is a known consequence of the balance-driven group assignment. The magnitude is very small (+0.00035°/cy) and within the uncertainty of the model.

---

## UI Display

### Planet Inspector Panel

The planet information panels display four invariable plane values:

| UI Label | Description |
|----------|-------------|
| **Ascending Node on Inv. Plane (Ω)** | Current ascending node in ecliptic coordinates |
| **Descending Node on Inv. Plane** | Ascending node + 180° |
| **ω̃ at Max Inclination** | ICRF perihelion longitude where inclination reaches maximum (= phase angle) |
| **Current Oscillation Phase** | Position in oscillation cycle (0° = max, 180° = min) |

**Note**: The ascending node values use ecliptic coordinates (precession period H/16), while the oscillation phase uses ICRF perihelion coordinates (per-planet ICRF period).

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
| [10 - Fibonacci Laws](10-fibonacci-laws.md) | Fibonacci Laws derivation with balance condition |
| [20 - Constants Reference](20-constants-reference.md) | All inclination and ascending node constants |
| [31 - Ascending Node Calculations](31-ascending-node-calculations.md) | Ascending node precession |
| [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md) | Height above/below invariable plane |
| [Ascending Node Optimization](../tools/verify/ascending-node-optimization.js) | Numerical optimization to calculate ascending node values |
| [Ascending Node Verification](../tools/verify/ascending-node-verification.js) | Verification that J2000-verified ascending nodes produce correct ecliptic inclinations |
| [Ascending Node Souami-Souchay](../tools/verify/ascending-node-souami-souchay.js) | Comparison of S&S vs Verified ascending node accuracy |
| [Inclination Optimization](../tools/verify/inclination-optimization.js) | Optimization script to calculate mean/amplitude values |
| [Inclination Verification](../tools/verify/inclination-verification.js) | Verification script for mean/amplitude values |
| [Analytical Ascending Nodes](../tools/verify/analytical-ascending-nodes.js) | Analytical (closed-form) calculation of ascending nodes |

---

**Previous**: [31 - Ascending Node Calculations](31-ascending-node-calculations.md)
**Next**: [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md)
