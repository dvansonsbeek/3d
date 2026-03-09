# Scene Graph Hierarchy

This document describes the Three.js scene graph hierarchy used in the Holistic Universe Model simulation. Understanding this nested structure is essential because **all astronomical motions are implemented through composed rotations** of parent-child relationships.

**Last Updated:** January 2026

**Related Documents:**
- [13 - Perihelion Precession](12-perihelion-precession.md) - How precession affects apparent measurements
- [20 - Architecture](40-architecture.md) - Overall code structure
- [04 - Dynamic Elements Overview](04-dynamic-elements-overview.md) - What orbital elements change over time

**Source:** [Technical Guide](https://www.holisticuniverse.com/en/simulation/technical-guide) on the Holistic Universe website

---

## Overview

The simulation models complex astronomical cycles (precession periods from 18 years to H+ years) by nesting rotation layers in a parent-child hierarchy. Each layer applies one rotation, and the final world position of any object is the composition of all parent transformations.

**Key Principle:** A child object inherits all parent rotations. When measuring positions from different reference frames (e.g., Earth-equatorial vs. ecliptic), different portions of this hierarchy apply.

---

## Part 1: Fundamental Calculations

At its core, the entire simulation is based upon two surprisingly simple calculations:

| Concept | Value | Meaning |
|---------|-------|---------|
| **One Solar year** | 2π radians | A complete circle = 6.283185307... |
| **One AU** | 100 scene units | The radius of Earth's orbit |

Since the circumference of a circle is `2π × r`, all calculations derive from these two values:

- **Length of a Solar year:** 1 year = 2π radians = 365.2421897 days
- **Length of an AU:** 100 scene units = 149,597,870.698828 km (currently)

All other calculations are relative to:
- The solar year as **2π**
- The AU as **100**

**Start Date:** The simulation is aligned to the **June Solstice of 21 June 2000, 00:00 UTC**.

---

## Part 2: The Holistic Year Structure

All Earth precession cycles derive from the **Holistic Year** (H) divided by integers. See [Constants Reference](20-constants-reference.md) for the current value of H and all derived periods:

| Cycle | Divisor | Formula | Direction |
|-------|---------|---------|-----------|
| **Holistic Year** | 1 | H | - |
| **Inclination Precession** | 3 | H / 3 | Counter-clockwise |
| **Ecliptic Precession** | 5 | H / 5 | Counter-clockwise |
| **Obliquity Cycle** | 8 | H / 8 | Clockwise (negative) |
| **Axial Precession** | 13 | H / 13 | Clockwise (negative) |
| **Perihelion Precession** | 16 | H / 16 | Both directions |

This rational subdivision creates the interconnected cycles that produce Earth's climate variations and astronomical phenomena.

---

## Part 2: Object Structure

Every object in the scene follows this internal structure:

```
containerObj (orbitContainer)
└── orbitObj          → Rotation layer (rotation.y = angular position)
    ├── orbitLine     → Orbit path visualization (optional)
    ├── pivotObj      → Translation layer (position on ellipse); children attach here
    └── rotationAxis  → Axial tilt + daily rotation
        └── planetObj → The actual sphere mesh
```

Note: `pivotObj` and `rotationAxis` are **siblings** under `orbitObj`, not top-level children of `containerObj`. The hierarchy wiring (`.add()` calls) attaches child objects to `pivotObj`. The visual mesh lives under `rotationAxis`.

### 2.1 Component Purposes

| Component | Purpose | How Updated |
|-----------|---------|-------------|
| **containerObj** | Orbital plane orientation (tilt) | `rotation.x`, `rotation.z` set from ascending node + inclination |
| **orbitObj** | Angular position in orbit | `rotation.y = speed × pos - startPos` every frame |
| **pivotObj** | Radial position (distance from focus) | `position.set(x, 0, z)` for elliptical orbits |
| **rotationAxis** | Axial tilt and daily spin | `rotation.z` = axial tilt, `rotation.y` = day rotation |
| **planetObj** | Visual mesh (sphere with textures) | No transform updates |

### 2.2 Rotation Formula

For each object every frame:

```
θ = speed × pos - startPos × (π/180)
```

Where:
- `speed` = angular velocity (radians per simulation year)
- `pos` = current simulation time
- `startPos` = initial phase offset (degrees, converted to radians)

---

## Part 3: Complete Scene Hierarchy

The complete nesting order from the technical guide:

```
startingPoint (scene root)
└── Earth (pivot)                                     ← Axial Precession: H/13
    ├── Inclination Precession (container)            ← H/3
    │   ├── Mid-Eccentricity Orbit (container)        ← Reference for eccentricity
    │   │
    │   └── Ecliptic Precession (container)           ← H/5
    │       └── Obliquity Cycle (container)           ← H/8
    │           └── Perihelion Precession 1           ← H/16
    │               └── Perihelion Precession 2       ← H/16 (reverse)
    │                   └── Barycenter (pivot)
    │                       ├── Sun                   ← sibling, NOT parent
    │                       ├── PERIHELION-OF-EARTH   ← sibling
    │                       └── [All planet chains]   ← siblings of Sun
    │
    └── Moon Hierarchy (see Part 7)
```

Each nesting layer applies its rotation to all children, creating composite precession movements.

---

## Part 4: Earth Precession Layers

### 4.1 Earth Layer (Core)

The Earth object itself represents **Axial Precession**:

| Property | Value | Meaning |
|----------|-------|---------|
| orbitRadius | -`eccentricityAmplitude` × 100 | Derived from constants |
| speed | -2π / (H/13) | Clockwise axial precession |
| rotationSpeed | 2π × (mean solar year + 1 day) | Daily rotation |
| tilt | -`earthtiltMean` | Mean axial tilt (obliquity) |

### 4.2 Inclination Precession

| Property | Value | Meaning |
|----------|-------|---------|
| speed | +2π / (H/3) | Counter-clockwise |
| startPos | Calculated from balanced year | Phase alignment |

**Purpose:** Opposes Earth's axial precession motion. The inclination precession and axial precession are "balancing out in both ways" - they have opposite directions.

### 4.3 Ecliptic Precession

| Property | Value | Meaning |
|----------|-------|---------|
| speed | +2π / (H/5) | Counter-clockwise |
| orbitTiltb | -`earthInvPlaneInclinationAmplitude` | Negative tilt amplitude |

**Purpose:** Models the ecliptic plane's precession component.

### 4.4 Obliquity Cycle

| Property | Value | Meaning |
|----------|-------|---------|
| speed | -2π / (H/8) | Clockwise |
| orbitTiltb | +`earthInvPlaneInclinationAmplitude` | Positive tilt amplitude (opposite of ecliptic) |

**Purpose:** Explains Earth's temperature variation cycles. The obliquity oscillates between approximately ~22.2° and ~24.7°.

**Key insight:** The ecliptic and obliquity layers have **opposite tilt values** (-`earthInvPlaneInclinationAmplitude` and +`earthInvPlaneInclinationAmplitude`) that balance each other.

### 4.5 Perihelion Precession 1 & 2

Both layers use the same period but opposite signs:

| Property | Perihelion 1 | Perihelion 2 |
|----------|--------------|--------------|
| speed | +2π / (H/16) | -2π / (H/16) |
| orbitTilta | -`earthRAAngle` | 0 |
| orbitCentera | 0 | -eccentricityBase × 100 |

**Purpose:** "Both have complete opposite values for 'Startpos' and 'Speed' because the movement of Axial precession and Inclination precession are balancing out in both ways."

The paired inverse rotations maintain equilibrium during Earth's two counter-motions.

### 4.6 Summary Table

| Layer | Period | Speed Sign | orbitTiltb |
|-------|--------|------------|------------|
| Earth (Axial) | H/13 | Negative | - |
| Inclination | H/3 | Positive | - |
| Ecliptic | H/5 | Positive | -`earthInvPlaneInclinationAmplitude` |
| Obliquity | H/8 | Negative | +`earthInvPlaneInclinationAmplitude` |
| Perihelion 1 | H/16 | Positive | - |
| Perihelion 2 | H/16 | Negative | - |

---

## Part 5: The Balanced Year

The **Balanced Year** is a critical concept for understanding the model's phase alignments.

**Value:** Derived from `perihelionalignmentYear - (14.5 × H/16)`. See [Constants Reference](20-constants-reference.md) for current value.

**Definition:** The moment when all tilt and inclination parameters aligned oppositely yet symmetrically.

**Calculation:**
```
balancedYear = perihelionAlignmentYear - (14.5 × holisticyearLength/16)
```

This 14.5-cycle offset positions the obliquity fluctuation to correctly explain paleoclimate temperature cycles.

**Why it matters:** All `startPos` values for precession layers are calculated relative to this balanced year, ensuring the cycles are properly phased.

---

## Part 6: Sun and Perihelion Point

### 6.1 Barycenter Sun

| Property | Value | Meaning |
|----------|-------|---------|
| orbitRadius | eccentricityAmplitude × 100 | Marks center of Sun's oscillation |

### 6.2 Sun Position

| Property | Value | Meaning |
|----------|-------|---------|
| orbitRadius | 100 (1 AU) | Always 1 AU from perihelion point |
| speed | 2π | Exactly one solar year |
| startPos | `correctionSun` | June 21, 2000 alignment correction |
| rotation tilt | -7.155° | Solar axis inclination |

---

## Part 7: Moon Hierarchy

The Moon has its own set of precession cycles nested within Earth's frame:

```
earth.pivotObj
└── moonApsidalPrecession.containerObj              ← ~8.85 year apsidal cycle
    └── moonApsidalNodalPrecession1.containerObj    ← ~206 day beat
        └── moonApsidalNodalPrecession2.containerObj    ← ~206 day (reverse)
            └── moonLunarLevelingCyclePrecession.containerObj    ← Lunar Leveling cycle
                └── moonNodalPrecession.containerObj    ← ~18.6 year nodal cycle
                    └── moon.containerObj
                        └── moon.orbitObj    ← ~27.3 day lunar month
```

### 7.1 Moon Precession Cycles

| Layer | Period | Physical Meaning |
|-------|--------|------------------|
| **Apsidal Precession** | ~3,233 days (~8.85 years) | Lunar perigee precession |
| **Apsidal-Nodal 1** | ~2,190 days (~6 years) | Apsidal-nodal beat frequency |
| **Apsidal-Nodal 2** | ~2,190 days (~6 years, reverse) | Counter-rotation for beat |
| **Lunar Leveling Cycle** | ~6,167 days (~16.9 years) | Long-term lunar cycle |
| **Nodal Precession** | ~6,794 days (~18.6 years) | Lunar node regression |
| **Moon** | ~27.32 days | Sidereal lunar month |

---

## Part 8: Outer Planet Hierarchy

All planets from Mercury to Neptune (plus Pluto, Halley's Comet, and Eros) are **siblings** of the Sun under `barycenterEarthAndSun`, not children of the Sun.

```
barycenterEarthAndSun.pivotObj
├── sun.containerObj                                           ← sibling
├── earthPerihelionFromEarth.containerObj                      ← sibling
├── [Planet]PerihelionDurationEcliptic1.containerObj            ← sibling (one per planet)
│     └── [Planet]PerihelionFromEarth.containerObj
│           └── [Planet]PerihelionDurationEcliptic2.containerObj    ← Reverse precession
│                 ├── [Planet]RealPerihelionAtSun.containerObj
│                 │     └── [planet].containerObj → orbitObj → [pivotObj, rotationAxis → planetObj]
│                 └── [Planet]FixedPerihelionAtSun.containerObj     ← sibling
├── [Next Planet]PerihelionDurationEcliptic1.containerObj       ← sibling
│     └── ...
```

### 8.1 Planet Perihelion Precession Pattern

Each planet has a 4-layer precession structure with forward and reverse components (similar to Earth's perihelion layers).

For current computed values, see [Constants Reference](20-constants-reference.md).

| Planet | H Formula | Direction |
|--------|-----------|-----------|
| Mercury | H / (1+3/8) | Prograde |
| Venus | H × 2 | Prograde |
| Mars | H / (4+1/3) | Prograde |
| Jupiter | H / 5 | Prograde |
| Saturn | H / 8 | **Retrograde** |
| Uranus | H / 3 | Prograde |
| Neptune | H × 2 | Prograde |

**Note:** Saturn's negative value indicates retrograde precession (clockwise motion). Venus and Neptune share the same formula.

---

## Part 9: How Rotations Compose

### 9.1 The Transformation Chain

To find any object's world position, the engine computes the product of all parent transformation matrices:

```
WorldMatrix = M_earth × M_inclinationPrecession × M_eclipticPrecession
            × M_obliquityPrecession × M_perihelion1 × M_perihelion2
            × M_barycenter × M_planet
```

### 9.2 Reference Frame Implications

**When measuring from Earth's equatorial frame:** All precession layers apply, causing apparent fluctuations in measurements.

**When measuring from ecliptic frame:** Bypass Earth's precession layers by reading directly from the planet's `precessionLayer.orbitObj.rotation.y`.

This is why Mercury's perihelion precession appears to fluctuate when measured from Earth but is constant in the ecliptic frame (see [13 - Perihelion Precession](12-perihelion-precession.md)).

---

## Part 10: RA/Declination Calculation

The browser calculates celestial positions deterministically:

1. **Query** three.js world positions for Earth, Sun, and target body
2. **Transform** planet vector to Earth's rotational frame via `worldToLocal()`
3. **Convert** Cartesian to spherical coordinates
4. **Map** θ (theta) → Right Ascension, φ (phi) → Declination
5. **Format** as sexagesimal strings (12h34m56s / ±12°34′56″)

Updates occur after every precession frame, reflecting live tilt changes.

---

## Part 11: Mathematical Constants

For current values, see [Constants Reference](20-constants-reference.md).

| Constant | Value | Description |
|----------|-------|-------------|
| 1 Solar year | 2π radians | `meanSolarYearDays` days |
| 1 AU | 100 scene units | 149,597,870.698828 km |
| Mean obliquity | `earthtiltMean` | Earth's mean axial tilt |
| Inclination amplitude | `earthInvPlaneInclinationAmplitude` | Earth's orbital tilt oscillation |
| Base eccentricity | `eccentricityBase` | Earth's base orbital eccentricity |
| Eccentricity amplitude | `eccentricityAmplitude` | Earth's eccentricity oscillation |

---

## Part 12: Key Composition Principles

### 12.1 Balancing Counter-Motions

The perihelion precession layers demonstrate a key principle: "Both have complete opposite values for 'Startpos' and 'Speed' because the movement of Axial precession and Inclination precession are balancing out in both ways."

This applies throughout the model:
- Axial precession (clockwise) vs. Inclination precession (counter-clockwise)
- Ecliptic tilt (-amplitude) vs. Obliquity tilt (+amplitude)
- Perihelion 1 (forward) vs. Perihelion 2 (reverse)

### 12.2 Nested Rotation Benefits

1. **Composability** - Each cycle is independent; changing one doesn't affect others
2. **Accuracy** - Rotations compose mathematically correctly via matrix multiplication
3. **Performance** - GPU handles matrix multiplication efficiently
4. **Flexibility** - Easy to add new precession cycles
5. **Reference Frames** - Can measure from any frame by choosing hierarchy depth

---

## Part 13: Summary Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SCENE HIERARCHY                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  startingPoint (scene root)                                                   │
│    └── Earth (Axial Precession: H/13, clockwise)                             │
│          │                                                                    │
│          ├── Moon Hierarchy (apsidal, nodal, Lunar Leveling cycles)           │
│          │                                                                    │
│          └── Inclination Precession (H/3, CCW)                               │
│                │                                                              │
│                └── Ecliptic Precession (H/5, -amplitude)                     │
│                      │                                                        │
│                      └── Obliquity Cycle (H/8, +amplitude)                   │
│                            │                                                  │
│                            └── Perihelion 1 (H/16, fwd)                      │
│                                  │                                            │
│                                  └── Perihelion 2 (H/16, reverse)           │
│                                        │                                      │
│                                        └── Barycenter                        │
│                                              ├── Sun (sibling)               │
│                                              └── All Planet Chains           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

**Previous**: [05 - Invariable Plane Overview](05-invariable-plane-overview.md)
**Next**: [10 - Constants Reference](20-constants-reference.md)
