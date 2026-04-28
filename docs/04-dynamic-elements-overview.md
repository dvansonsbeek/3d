# Dynamic Orbital Elements: Overview and Planet Behavior

## Executive Summary

This document provides a comprehensive overview of how the Holistic Universe Model calculates **dynamic orbital elements** for all planets. Three interconnected systems work together:

1. **Dynamic Planet Inclination to Invariable Plane** - Each planet's orbital plane oscillates around a mean inclination
2. **Dynamic Ascending Node on Ecliptic** - Where a planet's orbit crosses Earth's orbital plane
3. **Dynamic Ecliptic Inclination** - The angle between a planet's orbital plane and Earth's orbital plane

All systems are driven by orbital plane precession: both Earth's and the other planets' orbital planes oscillate around the invariable plane, following Laplace-Lagrange secular theory.

## System Architecture

```
                     INVARIABLE PLANE
                     (Solar System's fixed reference)
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    Planet's            Earth's              Other
    Orbital             Orbital              Planets'
    Plane               Plane                Orbital
    (OSCILLATES)        (OSCILLATES)         Planes
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────┐
│                                                       │
│   computePlanetInvPlaneInclinationDynamic()               │
│   → Uses ICRF perihelion: i = mean + A·cos(ω̃ - φ)   │
│   → Output: o.<planet>InvPlaneInclinationDynamic         │
│                                                       │
└───────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────┐
│                                                       │
│   updateDynamicInclinations()                         │
│   → Calculates angle between planet & Earth planes    │
│   → Output: o.<planet>EclipticInclinationDynamic            │
│                                                       │
└───────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────┐
│                                                       │
│   calculateDynamicAscendingNodeFromTilts()           │
│   → Calculates where orbits cross the ecliptic       │
│   → Output: o.<planet>AscendingNode                  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## Earth's Driving Cycles

All dynamic orbital element changes are driven by Earth's orbital plane variations:

### Earth's Inclination to Invariable Plane

For current values of mean, amplitude, min, and max, see [Constants Reference](20-constants-reference.md).

| Parameter | Description |
|-----------|-------------|
| Mean | `earthInvPlaneInclinationMean` |
| Minimum | Mean - amplitude |
| Maximum | Mean + amplitude |
| Amplitude | `earthInvPlaneInclinationAmplitude` |
| Period | H/3 years |
| J2000 Value | Above mean, **DECREASING** |

### Earth's Ascending Node on Invariable Plane

| Parameter | Value | Description |
|-----------|-------|-------------|
| J2000 Value | ~284.5° (Verified) | `earthAscendingNodeInvPlaneVerified` |
| Precession Period | H/3 years | holisticyearLength/3 |
| Direction | Increasing | Same direction as inclination cycle |

## The Two Dynamic Systems

### System 1: Dynamic Ascending Node (on Ecliptic)

**Purpose**: Calculate where each planet's orbit crosses Earth's orbital plane. Also drives the **tilt direction** of the planet's container (orbital plane orientation in the 3D scene).

**Documentation**: [31-ascending-node-calculations.md](31-ascending-node-calculations.md)

**Key Formula**:
```
dΩ/dε = -sin(Ω) / tan(i)
```

**Inputs**:
- `currentObliquity` - Earth's axial tilt
- `earthInclination` - Earth's orbital inclination
- Planet's static `orbitTilta` and `orbitTiltb` values (encode Ω and i)

**Output**: `o.<planet>AscendingNode` (degrees, 0-360°)

**Used by**:
- UI display values
- Parallax correction `u` angle: `u = RA − Ω(t)`
- Planet container tilt direction in `moveModel()` / `updateOrbitalPlaneRotations()`

**Direction Rule**:
- If **Earth's inclination > Planet's inclination**: Ω INCREASES when obliquity decreases
- If **Earth's inclination < Planet's inclination**: Ω DECREASES when obliquity decreases

### System 2: Dynamic Ecliptic Inclination

**Purpose**: Calculate the angle between each planet's orbital plane and Earth's orbital plane

**Documentation**: [32-inclination-calculations.md](32-inclination-calculations.md)

**Key Formula**:
```
cos(ecliptic_incl) = sin(i_p)·sin(i_e)·cos(Ω_p - Ω_e) + cos(i_p)·cos(i_e)
```

Where:
- `i_p` = Planet's inclination to invariable plane (**DYNAMIC** - oscillates)
- `i_e` = Earth's inclination to invariable plane (DYNAMIC)
- `Ω_p` = Planet's ascending node on invariable plane (DYNAMIC, precesses)
- `Ω_e` = Earth's ascending node on invariable plane (DYNAMIC, precesses)

**Planet Inclination Oscillation** (ICRF perihelion approach):
```
i_p(t) = mean + amplitude × cos(ω̃_ICRF(t) - cycleAnchor)

Where:
  mean        = Laplace-Lagrange midpoint (center of oscillation range)
  amplitude   = half of oscillation range
  ω̃_ICRF(t)  = planet's ICRF perihelion longitude (precesses with time)
  cycleAnchor = per-planet cycle anchor (ICRF perihelion where MAX occurs, at the balanced year)
```

**Inputs**:
- `o.earthInvPlaneInclinationDynamic` - Earth's current inclination to invariable plane
- `o.earthAscendingNodeInvPlane` - Earth's current Ω on invariable plane
- `o.<planet>InvPlaneInclinationDynamic` - Planet's **dynamic** inclination (from oscillation)
- `o.<planet>AscendingNodeInvPlane` - Planet's current Ω on invariable plane

**Output**: `o.<planet>EclipticInclinationDynamic` (degrees)

## How the Systems Work Together

### Shared Dependency: Earth's Orbital Plane

Both systems depend on the orientation of Earth's orbital plane, but in different ways:

| System | Earth Parameter Used | What It Affects |
|--------|---------------------|-----------------|
| Ascending Node (Ecliptic) | Earth's obliquity + inclination | WHERE orbits cross |
| Ecliptic Inclination | Earth's inclination to inv. plane + Ω | HOW TILTED orbits appear |

### Independent Calculations

The two systems calculate **independent** physical quantities:

```
Ascending Node on Ecliptic:
  - WHERE the planet crosses the ecliptic (0°-360° longitude)
  - Changes because the ecliptic itself rotates in space

Ecliptic Inclination:
  - HOW TILTED the planet's orbit is relative to the ecliptic
  - Changes because the ecliptic tilts toward/away from the invariable plane
```

### Why They Use Different Inclination Values

| Calculation | Uses | Reason |
|-------------|------|--------|
| Ascending Node | Static `<planet>EclipticInclinationJ2000` | The crossing point depends on the planet's intrinsic orbit geometry |
| Ecliptic Inclination | **Dynamic** `o.<planet>InvPlaneInclinationDynamic` | The angle between planes uses invariable plane as reference; planets oscillate around a mean |

### Execution Order

The systems must be called in this order in each frame:

```javascript
// script.js (browser):
1. updatePlanetInvariablePlaneHeights()  // Calculates dynamic Ω on invariable plane
2. updateDynamicInclinations()            // Uses Ω values to calculate ecliptic inclinations
3. updateAscendingNodes()                 // Calculates Ω on ecliptic
4. updateOrbitalPlaneRotations()          // Applies both values to 3D visualizations + tilt direction

// tools/lib/scene-graph.js (tools):
// moveModel() handles steps 2-4 internally:
//   - computeDynamicEclipticInclination() for tilt magnitude
//   - calculateDynamicAscendingNodeFromTilts() for tilt direction
//   - Dynamic ascending node also used in parallax u computation
```

## Planet Behavior Table

### Ascending Node Direction (on Ecliptic)

Based on the relationship between Earth's inclination (~1.58° at J2000, decreasing) and each planet's inclination:

| Planet | Incl. to Ecliptic | vs Earth Mean | vs Earth J2000 (1.579°) | Ω Direction (2000-2100) |
|--------|-------------------|------------------------|-------------------------|-------------------------|
| Mercury | 7.005° | ABOVE | ABOVE | **DECREASING** ↓ |
| Venus | 3.395° | ABOVE | ABOVE | **DECREASING** ↓ |
| Mars | 1.850° | ABOVE | ABOVE | **DECREASING** ↓ |
| Jupiter | 1.305° | BELOW | BELOW | **INCREASING** ↑ |
| Saturn | 2.485° | ABOVE | ABOVE | **DECREASING** ↓ |
| Uranus | 0.772° | BELOW | BELOW | **INCREASING** ↑ |
| Neptune | 1.768° | ABOVE | ABOVE | **DECREASING** ↓ |
| Pluto | 17.142° | ABOVE | ABOVE | **DECREASING** ↓ |

**Note**: Mars (1.850°), Jupiter (1.305°), and Neptune (1.768°) have **ecliptic inclinations** within Earth's **invariable plane inclination** range (0.85°-2.12°). The ascending node algorithm compares these values, so these planets experience Ω direction reversals whenever Earth's inclination crosses theirs over the H/3 ≈ 111,772-year inclination-oscillation cycle (driven by Earth's ICRF perihelion). Note that Earth's ascending node Ω itself regresses on a separate −H/5 ≈ 67,063-year cycle.

### Ecliptic Inclination Direction

Based on the geometric relationship between Earth's and each planet's orbital planes on the invariable plane:

| Planet | Incl. to Inv. Plane | vs Earth Mean | Expected Trend* | Actual Trend (Model) |
|--------|---------------------|---------------|-----------------|----------------------|
| Mercury | `mercuryInvPlaneInclinationMean` | ABOVE | Decreasing ↓ | Decreasing ↓ |
| Venus | `venusInvPlaneInclinationMean` | ABOVE | Decreasing ↓ | Decreasing ↓ |
| Mars | `marsInvPlaneInclinationMean` | ABOVE | Decreasing ↓ | Decreasing ↓ |
| Jupiter | `jupiterInvPlaneInclinationMean` | BELOW | Decreasing ↓ | Decreasing ↓ |
| **Saturn** | `saturnInvPlaneInclinationMean` | BELOW | **Should ↑** | **Increasing ↑** ✓ |
| Uranus | `uranusInvPlaneInclinationMean` | BELOW | Decreasing ↓ | Decreasing ↓ |
| Neptune | `neptuneInvPlaneInclinationMean` | BELOW | Decreasing ↓ | Decreasing ↓ |
| Pluto | `plutoInvPlaneInclinationMean` | ABOVE | Decreasing ↓ | Decreasing ↓ |

*Expected based on observed astronomical data trends

### The Saturn Trend Resolution

Saturn's published JPL ecliptic-inclination trend (`+0.00194°/century`, increasing) initially appeared to disagree with the model. The disagreement turned out to have **two independent causes**, both since resolved:

1. **Frame mismatch**: JPL's `dI/dt` is published against the **J2000-fixed** ecliptic ("mean ecliptic and equinox of J2000"), not the moving ecliptic of date. The model's `fbeCalcApparentIncl()` originally compared the moving-frame trend against the J2000-frame catalog value, which was meaningless. After the [frame correction](32-inclination-calculations.md#two-frames--be-careful-which-one-you-mean), Saturn's direction matches JPL.

2. **Asc-node integer assignment**: Saturn (and the other six fitted planets) now use `ascendingNodeCyclesIn8H` integers chosen to match the J2000-frame JPL trends to <2″/century. See [55-solar-system-resonance-cycle-periods.md](55-solar-system-resonance-cycle-periods.md) for the full integer assignment.

The total trend error across all 7 fitted planets in the J2000-fixed frame is now ~4.3″/century, all directions match JPL, and Saturn's residual is the second-largest (1.7″) after a small structural Saturn LL-bound excess (~0.025°) that is being tracked separately.

## Detailed Planet Behavior

For all per-planet values (inclinations to ecliptic and invariable plane, ascending nodes, ecliptic inclination ranges), see [Constants Reference](20-constants-reference.md).

Key behavioral notes:

- **Mercury, Venus, Saturn, Pluto**: Always above Earth's inclination — Ω always decreases
- **Jupiter, Uranus**: Always below Earth's inclination — Ω always increases
- **Mars, Neptune**: WITHIN Earth's inclination range — crossovers possible, Ω direction reverses during H/3-year cycle
- **Jupiter**: Closest to invariable plane (smallest inclination), smallest ecliptic inclination variation
- **Saturn**: Inclination to inv. plane is **below** Earth's current value (Saturn anomaly resolved — see below)
- **Mars**: Crossover epoch ~55,000 years from now
- **Jupiter**: Crossover epoch ~9,700 years from now

## Summary of Collaborative Behavior

### What Drives Each System

| System | Primary Driver | Secondary Driver | Period |
|--------|---------------|------------------|--------|
| Planet Inclination to Inv. Plane | Orbital plane precession | Laplace-Lagrange eigenmodes | Planet-specific (see below) |
| Ascending Node (Ecliptic) | Earth's obliquity changes | Earth's inclination crossovers | H years |
| Ecliptic Inclination | Earth's + planet's inclination changes | Ω precession on inv. plane | H/3 years |

**Planet Inclination-Oscillation Periods** (the planet's *ICRF perihelion* period, which drives the cosine in `i(t) = mean + amp · cos(ω̃_ICRF(t) − φ)`). The ascending node Ω evolves on a *separate* `−(8H)/N` schedule listed in [55-solar-system-resonance-cycle-periods.md](55-solar-system-resonance-cycle-periods.md). For current computed values see [Constants Reference](20-constants-reference.md):

| Planet | Ecliptic formula | Ecliptic period (yr) | ICRF period (yr) | ICRF direction |
|--------|------------------|---------------------|------------------|----------------|
| Mercury | H × 8/11 | 243,867 | 28,844 | Retrograde |
| Venus | −8H/6 | 447,089 | 24,387 | Retrograde |
| Earth | H / 16 (ecliptic) / H / 3 (ICRF) | 20,957 | 111,772 | **Prograde (sole)** |
| Mars | H × 8/35 | 76,644 | 38,877 | Retrograde |
| Jupiter | H / 5 | 67,063 | 41,915 | Retrograde |
| Saturn | −H / 8 | 41,915 | 15,967 | Retrograde |
| Uranus | H / 3 | 111,772 | 33,532 | Retrograde |
| Neptune | H × 2 | 670,634 | 26,825 | Retrograde |

The ICRF period is derived from the ecliptic period by subtracting the general precession rate (H/13): `1/P_ICRF = 1/P_ecliptic − 13/H`. Earth is the only planet with a prograde ICRF perihelion. All ICRF periods divide 8H = 2,682,536 years exactly (the Solar System Resonance Cycle). The inclination oscillation is driven by the ICRF period, not the ecliptic period.

### The Key Insight

The three systems are **geometrically linked** through orbital plane precession:

1. **Planet inclination oscillation**: Each planet's orbital plane precesses around the invariable plane, causing its inclination to oscillate. The phase of this oscillation is driven by the ICRF perihelion longitude: `i(t) = mean + A × cos(ω̃_ICRF(t) - cycleAnchor)`

2. **Ecliptic inclination**: Depends on BOTH Earth's and the planet's dynamic inclinations to the invariable plane, plus their ascending node difference.

3. **Ascending node on ecliptic**: Measures WHERE orbits cross, driven by Earth's obliquity changes.

All three are **temporally correlated** through their shared precession periods.

### Why NOT to Mix Them

Using `o.<planet>EclipticInclinationDynamic` in the ascending node calculation would be **double-counting** the effect:

```
WRONG:
  Ascending node uses ecliptic inclination (which already includes Earth tilt effect)
  + Also uses obliquity/inclination directly
  = Earth tilt effect applied TWICE

CORRECT:
  Ascending node uses STATIC orbital inclination (ecliptic-based)
  + Uses obliquity/inclination directly
  = Each effect applied ONCE
```

## Moon Dynamic Orbital Elements

The Moon's dynamic elements are computed separately from the planets by `updateMoonOrbitalElements()`. Unlike planets, the Moon's dynamics are **not driven by Earth's invariable plane oscillation** — they are driven by the Moon's own precession cycles modeled in the 3D scene hierarchy.

### How the Moon Differs from Planets

| Aspect | Planets | Moon |
|--------|---------|------|
| **Ascending node source** | `calculateDynamicAscendingNodeFromTilts()` — from orbit tilt values | Orbit plane normal from `moonNodalPrecession.containerObj.matrixWorld` |
| **What drives Ω** | Earth's obliquity + inclination changes | 3D nodal precession chain (~18.6 yr retrograde) |
| **What drives ω/ϖ** | Perihelion precession from `apparentRaFromPdA()` | 3D apsidal precession chain (~8.85 yr prograde) |
| **Anomaly focus** | Sun | Earth |
| **Inclination oscillation** | ICRF perihelion: `i = mean + A·cos(ω̃ − φ)` | Not applicable (fixed 5.14° to ecliptic) |

### Moon Dynamic Variables

10 dynamic `o.moon*` variables are computed each frame (Ω, ϖ, ω, ν, M, E, distance, phase angle, elongation, descending node). See [Section 1.4.2 of the Orbital Formulas Reference](21-orbital-formulas-reference.md) for the complete variable list with symbols, descriptions, and 3D sources.

### 3D Precession Hierarchy

The Moon's precessions are encoded as nested Y-rotations in the scene graph:
```
earth.pivotObj
  └── moonApsidalPrecession    (Y-rot: ~8.85yr prograde, tilt: −1.54°)
      └── coupling layers       (apsidal-nodal interaction)
          └── moonNodalPrecession  (Y-rot: ~18.6yr retrograde, tilt: 5.14°)
              └── moon             (Y-rot: ~27.3 day orbital motion)
```

The Y-rotations through the tilted apsidal frame cause the ascending node to precess in world space. This is extracted geometrically from `matrixWorld` rather than computed analytically.

## Code Locations

| Function | Location | Purpose |
|----------|----------|---------|
| `updatePlanetInvariablePlaneHeights()` | [script.js](../src/script.js) | Updates Ω on invariable plane |
| `updateDynamicInclinations()` | [script.js](../src/script.js) | Calculates dynamic planet inclinations and ecliptic inclinations |
| `computePlanetInvPlaneInclinationDynamic()` | [script.js:19515-19585](../src/script.js#L19515-L19585) | Computes oscillating planet inclination using ICRF perihelion |
| `calculateDynamicAscendingNodeFromTilts()` | [script.js](../src/script.js) | Calculates Ω on ecliptic |
| `updateAscendingNodes()` | [script.js](../src/script.js) | Updates all ascending nodes |
| `updateOrbitalPlaneRotations()` | [script.js](../src/script.js) | Applies to 3D visualizations |
| `updateMoonOrbitalElements()` | [script.js](../src/script.js) | Moon Ω, ϖ, anomalies, phase (Earth as focus) |

### Inclination Oscillation Constants (ICRF perihelion approach)

| Constant Type | Location | Purpose |
|---------------|----------|---------|
| `<planet>InvPlaneInclinationMean` | [script.js:292-332](../src/script.js#L292-L332) | Laplace-Lagrange midpoint (center of oscillation) |
| `<planet>InclinationAmplitude` | [script.js:292-332](../src/script.js#L292-L332) | Half of oscillation range from Laplace-Lagrange bounds |
| `<planet>InclinationCycleAnchor` | [script.js:359-369](../src/script.js#L359-L369) | ICRF perihelion longitude where MAX inclination occurs (evaluated at balanced year) |

## References

1. [31 - Ascending Node Calculations](31-ascending-node-calculations.md) - Detailed ascending node algorithm
2. [32 - Inclination Calculations](32-inclination-calculations.md) - Detailed inclination algorithm and oscillation approach
3. [20 - Constants Reference](20-constants-reference.md) - All planetary constants
4. Souami, D. & Souchay, J. (2012), "The solar system's invariable plane", A&A 543, A133
5. [Farside Physics Textbook - Secular Evolution](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html) - Laplace-Lagrange secular theory, Table 10.4
6. [Inclination Verification](../tools/verify/inclination-verification.js) - Verification script for mean/amplitude values

---

*Document created: 2024-12-21*
*Updated: 2024-12-31 - Added planet inclination oscillation approach*
*Updated: 2026-04-03 - Migrated from Ω-based to ICRF perihelion approach with per-planet cycle anchors*
*Updated: 2025-01-01 - Saturn anomaly resolved (phase offset 37.8°), fixed document references*
*Part of the Holistic Universe Model documentation*
