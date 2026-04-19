# Dynamic Ascending Node Calculation

## Overview

This document describes the dynamic calculation of the longitude of ascending node for all planets in the Holistic Universe Model. The ascending node shifts over time as Earth's obliquity (axial tilt) changes, with the effect depending on the relationship between Earth's orbital inclination and each planet's orbital inclination.

## Implementation Status

**Implemented** — The dynamic ascending node calculation is fully implemented in both `script.js` and `tools/lib/scene-graph.js`. It is used for:

1. **Display values**: `o.<planet>AscendingNode` — shown in the UI
2. **Parallax correction**: The `u = RA − Ω(t)` angle uses the dynamic ascending node
3. **Tilt direction**: The planet container orientation in `moveModel()` / `updateOrbitalPlaneRotations()` uses the dynamic ascending node to set the tilt direction, eliminating systematic Dec drift at Mercury transits (was -0.30°/century, now ~0°)

## Physical Background

### What is the Ascending Node?

The **ascending node** is the point where a planet's orbit crosses the ecliptic plane (Earth's orbital plane) while moving from south to north. Its longitude (Ω) is measured from the vernal equinox direction.

### Why Does it Change?

When Earth's **obliquity** (axial tilt, ~23.4°) changes over time, the ecliptic plane—our reference for measuring other planets' orbital elements—effectively tilts. This causes the line of nodes (where orbital planes intersect) to shift.

The key insight is that **Earth's own orbital inclination** (~1.5° relative to the invariable plane) acts as a threshold:

- **Planets with inclination ABOVE Earth's**: Ascending node **decreases** when obliquity decreases
- **Planets with inclination BELOW Earth's**: Ascending node **increases** when obliquity decreases
- **Planets with inclination EQUAL to Earth's**: Minimal change (effects cancel out)

## Model Parameters

### Earth's Cycles

| Parameter | Value | Description |
|-----------|-------|-------------|
| `earthtiltMean` | see [Constants Reference](20-constants-reference.md) | Mean obliquity |
| `earthInvPlaneInclinationMean` | see [Constants Reference](20-constants-reference.md) | Mean orbital inclination |
| `earthInvPlaneInclinationAmplitude` | see [Constants Reference](20-constants-reference.md) | Amplitude of variation |
| `holisticyearLength` (H) | see [Constants Reference](20-constants-reference.md) | Full cycle length |

### Earth's Inclination Range

Earth's orbital inclination oscillates between:
- **Minimum**: `earthInvPlaneInclinationMean` - `earthInvPlaneInclinationAmplitude`
- **Maximum**: `earthInvPlaneInclinationMean` + `earthInvPlaneInclinationAmplitude`

For current values, see [Constants Reference](20-constants-reference.md).

### Planet Orbital Inclinations

| Planet | Ecliptic Incl. (J2000) | Relation to Earth Incl. Range | Crossover Possible? |
|--------|------------------------|-------------------------------|---------------------|
| Mercury | 7.005° | ABOVE (> 2.12°) | No |
| Venus | 3.395° | ABOVE (> 2.12°) | No |
| Mars | 1.850° | **Within** (0.85° - 2.12°) | **Yes** |
| Jupiter | 1.305° | **Within** (0.85° - 2.12°) | **Yes** |
| Saturn | 2.485° | ABOVE (> 2.12°) | No |
| Uranus | 0.772° | BELOW (< 0.93°) | No |
| Neptune | 1.770° | **Within** (0.85° - 2.12°) | **Yes** |
| Pluto | 17.142° | ABOVE (> 2.12°) | No |

**Note**: The algorithm compares planet **ecliptic inclinations** (from `orbitTilta/orbitTiltb`) against Earth's **invariable plane inclination** (`o.earthInvPlaneInclinationDynamic`). This comparison determines when Earth's tilting reference frame causes direction reversals for the ascending node shift.

## Algorithm

### Core Formula

The base perturbation rate for the ascending node is:

```
dΩ/dε = -sin(Ω) / tan(i(t))
```

Where:
- `Ω` = current ascending node longitude (static at J2000)
- `ε` = Earth's obliquity (dynamic — changes with obliquity cycle)
- `i(t)` = planet's **dynamic** ecliptic inclination (changes over time)

### Dynamic Inputs

The formula depends on three dynamic quantities:

| Input | Source | Period | What changes |
|-------|--------|--------|-------------|
| Earth's obliquity (dε) | `computeObliquityEarth()` | H/3 + H/8 | How much the ecliptic tilts |
| Earth's inclination | `computeInclinationEarth()` | H/3 | Direction of effect (+1 or -1) |
| Planet's ecliptic inclination | `computeEclipticInclination()` | perihelionEclipticYears | Rate factor `1/tan(i)` |

The **planet's ecliptic inclination** is computed via the dot product of the planet's and Earth's orbital plane normal vectors on the invariable plane. Both planes oscillate independently:
- The planet's invariable plane inclination oscillates: `i_planet(t) = mean + amplitude × cos(ω̃_ICRF(t) - cycleAnchor)`
- Earth's invariable plane inclination oscillates at period H/3
- Their ascending nodes on the invariable plane precess linearly

This creates a time-varying ecliptic inclination that modifies the `1/tan(i)` rate factor in the perturbation formula. There is **no circular dependency** — the ecliptic inclination depends on invariable plane quantities (linear precession), not on the ecliptic ascending node being computed.

### Rate-Based Integration

The implementation uses a **rate-based integration approach** that properly handles:

1. **Obliquity direction changes** — When Earth's obliquity reverses from decreasing to increasing (or vice versa), the effect on the ascending node also reverses.

2. **Inclination crossovers** — When Earth's orbital inclination crosses a planet's ecliptic inclination, the direction of the effect reverses for that planet.

3. **Planet inclination oscillation** — The rate `1/tan(i)` varies as the planet's ecliptic inclination changes over its perihelion precession period. This is evaluated at the midpoint of each integration segment.

### Integration Method

The algorithm integrates from the **epoch year (2000 AD)** to the current year:

```javascript
newOmega = staticOmega + integrateEffect(EPOCH_YEAR, currentYear)
```

Where `integrateEffect` performs segment-by-segment integration, splitting at:
- **Obliquity extrema** (local maxima/minima)
- **Inclination crossovers** (when Earth incl = planet incl)

### Segment Integration

For each segment between critical points:

```javascript
// Get obliquity change over segment
const deltaObl = (obliquityEnd - obliquityStart);

// Compute dynamic ecliptic inclination at segment midpoint
const dynIncl = computeEclipticInclination(planetName, midYear);

// Determine direction based on Earth vs planet inclination at midpoint
const inclDirection = (earthInclAtMid > dynIncl) ? +1 : -1;

// Compute perturbation rate using dynamic inclination
const segRate = -sin(Ω) / tan(dynIncl);

// Calculate effect for this segment
const segmentEffect = segRate * inclDirection * deltaObl;
```

### Impact of Dynamic Planet Inclination

Over the 200-year fitting window (1800–2200), the effect of dynamic planet inclination is small because the perihelion precession periods are very long (67,000–670,000 years). Over longer timescales, Mars is the most affected:

| Timescale | Mars i range | Rate change |
|-----------|-------------|-------------|
| 200 yr | 1.83°–1.87° | ±1% |
| 5,000 yr | 1.39°–2.31° | ±25% |
| 10,000 yr | 1.01°–2.69° | ±85% |
| 38,000 yr | 0.69°–3.01° | Full cycle |

## Implementation Details

### Key Functions

#### `calculateDynamicAscendingNodeFromTilts()`

Main calculation function. Exists in both `script.js` and `tools/lib/orbital-engine.js`.

```javascript
// script.js version:
function calculateDynamicAscendingNodeFromTilts(
  orbitTilta,        // Encodes sin(Ω) * inclination
  orbitTiltb,        // Encodes cos(Ω) * inclination
  currentObliquity,  // Current Earth obliquity (degrees)
  earthInclination,  // Current Earth inclination (degrees)
  currentYear,       // Current year for integration
  planetName         // Optional: enables dynamic ecliptic inclination
)

// orbital-engine.js version:
function calculateDynamicAscendingNodeFromTilts(
  orbitTilta,        // Encodes sin(Ω) * inclination
  orbitTiltb,        // Encodes cos(Ω) * inclination
  currentYear,       // Current year for integration
  planetName         // Optional: enables dynamic ecliptic inclination
)
```

#### `getEclipticInclinationAtYear(planetName, year)` (script.js only)

Computes the dynamic ecliptic inclination at any year using the dot product of planet and Earth normal vectors on the invariable plane. Used by the integration loop when `planetName` is provided.

The tools-side equivalent is `computeEclipticInclination()` in `orbital-engine.js`.

#### `integrateEffect(fromYear, toYear)`

Inner helper that performs the segment-based integration, handling:
- Finding obliquity extrema via sampling
- Finding inclination crossovers
- Computing dynamic ecliptic inclination at each segment midpoint (when `planetName` provided)
- Summing effects across all segments

#### `getObliquityAtYear(year)`

Computes Earth's obliquity at any year using the formula:

```javascript
obliquity = earthtiltMean
  - earthInvPlaneInclinationAmplitude * cos(phase3)
  + earthInvPlaneInclinationAmplitude * cos(phase8)
```

Where `phase3` and `phase8` correspond to the H/3 and H/8 cycles.

#### `getEarthInclinationAtYear(year)`

Computes Earth's orbital inclination at any year:

```javascript
inclination = earthInvPlaneInclinationMean
  - earthInvPlaneInclinationAmplitude * cos(phase3)
```

#### `findInclinationCrossingYear()`

Finds the year when Earth's inclination equals a target value (for detecting crossovers).

### Update Function

`updateAscendingNodes()` is called each frame to update all planet ascending nodes. Location: [script.js:9379](../src/script.js#L9379)

## Worked Example: Mars (2000 → 2100)

This section demonstrates exactly how the rate calculation works using Mars as an example.

### Mars Parameters

| Parameter | Value |
|-----------|-------|
| Static ascending node (Ω) | 49.557° |
| Orbital inclination (i) | 1.850° |

### Step 1: Calculate Base Perturbation Rate

Using the core formula `dΩ/dε = -sin(Ω) / tan(i)`:

```
sin(49.557°) ≈ 0.761
tan(1.850°)  ≈ 0.0323

baseDOmegaDeps = -sin(Ω) / tan(i)
               = -0.761 / 0.0323
               ≈ -23.6 (degrees per degree of obliquity change)
```

### Step 2: Determine Direction

Compare Earth's inclination to Mars' inclination:

| Parameter | Value |
|-----------|-------|
| Earth inclination at 2000 | ~1.578° |
| Mars inclination | 1.850° |
| Comparison | Earth < Mars |
| `inclDirection` | -1 |

Since Earth's inclination is **below** Mars' inclination, the direction factor is **-1**.

### Step 3: Calculate Obliquity Change

Earth's obliquity is **decreasing** during this period (we are past the last maximum):

```
Obliquity at 2000: ~23.439°
Obliquity at 2100: ~23.426°

deltaObl ≈ -0.013° (per century)
```

### Step 4: Calculate Final Effect

```
effect = baseDOmegaDeps × inclDirection × deltaObl
       = (-23.6) × (-1) × (-0.013°)
       = -0.307°
```

### Result

| Year | Mars Ascending Node |
|------|---------------------|
| 2000 | 49.5559° |
| 2100 | 49.2508° |
| **Change** | **-0.305°** |

The calculated effect (-0.307°) matches the observed change (-0.305°) very closely!

### Understanding the Sign Chain

The ascending node **decreases** because:

1. **Base rate is negative**: `sin(49.557°) > 0`, so `-sin(Ω)/tan(i) < 0`
2. **Direction is negative**: Earth incl < Mars incl → `inclDirection = -1`
3. **Obliquity change is negative**: Obliquity is decreasing → `deltaObl < 0`

```
negative × negative × negative = negative → Ω decreases
```

### Formula Origin

The calculation combines:

- **Perturbation formula** `dΩ/dε = -sin(Ω) / tan(i)` — from celestial mechanics theory
- **Direction rule** (Earth incl vs planet incl) — derived from analyzing how the ecliptic plane shifts
- **Obliquity and inclination values** — from the Holistic Universe Model's cycle definitions

## Worked Example: Jupiter (2000 → 2100)

This example shows why Jupiter's ascending node **increases** over the same period (opposite to Mars).

### Jupiter Parameters

| Parameter | Value |
|-----------|-------|
| Static ascending node (Ω) | 100.488° |
| Orbital inclination (i) | 1.305° |

### Step 1: Calculate Base Perturbation Rate

Using the core formula `dΩ/dε = -sin(Ω) / tan(i)`:

```
sin(100.488°) ≈ 0.983
tan(1.305°)   ≈ 0.0228

baseDOmegaDeps = -sin(Ω) / tan(i)
               = -0.983 / 0.0228
               ≈ -43.1 (degrees per degree of obliquity change)
```

Note: Jupiter has a larger base rate than Mars because:
1. Its ascending node is closer to 90° (sin is larger)
2. Its inclination is smaller (tan is smaller in denominator)

### Step 2: Determine Direction

Compare Earth's inclination to Jupiter's inclination:

| Parameter | Value |
|-----------|-------|
| Earth inclination at 2000 | ~1.578° |
| Jupiter inclination | 1.305° |
| Comparison | Earth > Jupiter |
| `inclDirection` | **+1** |

Since Earth's inclination is **above** Jupiter's inclination, the direction factor is **+1**.

**This is the key difference from Mars!** Mars has inclination 1.850° which is above Earth's ~1.578°, so Mars gets `inclDirection = -1`.

### Step 3: Calculate Obliquity Change

Earth's obliquity is **decreasing** during this period (same as Mars example):

```
Obliquity at 2000: ~23.439°
Obliquity at 2100: ~23.426°

deltaObl ≈ -0.013° (per century)
```

### Step 4: Calculate Final Effect

```
effect = baseDOmegaDeps × inclDirection × deltaObl
       = (-43.1) × (+1) × (-0.013°)
       = +0.560°
```

### Result

| Year | Jupiter Ascending Node |
|------|------------------------|
| 2000 | 100.4904° |
| 2100 | 101.0495° |
| **Change** | **+0.559°** |

The calculated effect (+0.560°) matches the observed change (+0.559°) very closely!

### Understanding the Sign Chain

The ascending node **increases** because:

1. **Base rate is negative**: `sin(100.488°) > 0`, so `-sin(Ω)/tan(i) < 0`
2. **Direction is positive**: Earth incl > Jupiter incl → `inclDirection = +1`
3. **Obliquity change is negative**: Obliquity is decreasing → `deltaObl < 0`

```
negative × positive × negative = positive → Ω increases
```

### Comparison: Mars vs Jupiter

| Factor | Mars | Jupiter |
|--------|------|---------|
| Inclination | 1.850° | 1.305° |
| vs Earth (~1.578°) | Above | Below |
| `inclDirection` | -1 | +1 |
| Base rate | -23.6 | -43.1 |
| Obliquity change | -0.013° | -0.013° |
| **Final effect** | **-0.305°** | **+0.559°** |

The opposite direction factors cause Mars and Jupiter to drift in **opposite directions** when obliquity decreases!

## Expected Behavior

### Timeline Example for Jupiter (inclination 1.305°)

| Year | Earth Incl. | Obliquity | Jupiter Ω Effect |
|------|-------------|-----------|------------------|
| 2000 AD | ~1.58° | ~23.44° | Baseline (100.49°) |
| 2000 → 9700 AD | Decreasing | Decreasing | Increasing |
| ~9700 AD | ~1.30° | - | **Peak** (crossover) |
| 9700 → 12500 AD | < 1.30° | Decreasing | Decreasing |
| ~12500 AD | - | Minimum | **Reversal** |
| 12500 AD → future | - | Increasing | Direction reverses |

### Key Observations

1. **At epoch (2000 AD)**: All planets show their static reference values
2. **Obliquity extrema**: All planets reverse their ascending node drift direction
3. **Inclination crossover**: Only affects planets whose ecliptic inclination falls within Earth's invariable plane inclination range (Mars, Jupiter, Neptune)
4. **Continuous behavior**: No discontinuous jumps at any transition point

## Tilt Encoding

The orbital plane orientation is encoded in `orbitTilta` and `orbitTiltb`:

```javascript
orbitTilta = sin(Ω) * inclination
orbitTiltb = cos(Ω) * inclination
```

To extract the static ascending node and inclination:

```javascript
staticOmega = atan2(orbitTilta, orbitTiltb)  // in degrees, normalized to 0-360
inclination = sqrt(orbitTilta² + orbitTiltb²)
```

## Static Reference Values (Epoch 2000 AD)

These are the ascending node values encoded in the `orbitTilta`/`orbitTiltb` parameters:

| Planet | Ascending Node (Ω) |
|--------|-------------------|
| Mercury | 48.33033155° |
| Venus | 76.67877109° |
| Mars | 49.55737662° |
| Jupiter | 100.4877868° |
| Saturn | 113.6452856° |
| Uranus | 73.98118815° |
| Neptune | 131.7853754° |
| Pluto | 110.30347° |
| Halley's Comet | 59.5607834844° |
| Eros | 304.4115785804° |

## Code Locations

| Component | Location |
|-----------|----------|
| Main calculation (script.js) | `calculateDynamicAscendingNodeFromTilts()` in `script.js` |
| Main calculation (tools) | `calculateDynamicAscendingNodeFromTilts()` in `tools/lib/orbital-engine.js` |
| Update ascending nodes | `updateAscendingNodes()` in `script.js` |
| Tilt direction (script.js) | `updateOrbitalPlaneRotations()` in `script.js` |
| Tilt direction (tools) | `moveModel()` in `tools/lib/scene-graph.js` |
| Parallax u computation | `computePlanetPosition()` in `tools/lib/scene-graph.js` |
| Planet tilt definitions | `planets.*` at top of `script.js` |

## Relationship to Ecliptic Inclination

### Two Independent Physical Effects

The dynamic ascending node calculation and the dynamic ecliptic inclination (`o.<planet>EclipticInclinationDynamic`) model **two separate physical phenomena**:

| Effect | What Changes | What Stays Fixed | Timescale |
|--------|-------------|------------------|-----------|
| **Ascending Node Shift** | Where the planet's orbit crosses the ecliptic | Planet's orbital inclination relative to invariable plane | H years |
| **Ecliptic Inclination** | How tilted the planet appears from Earth's perspective | Planet's orbital plane in space | H/3 years |

### Dynamic Ecliptic Inclination in the Rate Formula

As of 2026-03-24, the ascending node calculation uses the **dynamic ecliptic inclination** `computeEclipticInclination(planetName, year)` in the perturbation rate `1/tan(i)`. This is NOT double-counting — the obliquity change `dε` drives the AMOUNT of effect, while the dynamic `i(t)` modifies the RATE at which that effect converts into ascending node shift. These are independent roles:

| Role | Parameter | What it controls |
|------|-----------|-----------------|
| **Driver** | `dε` (obliquity change) | How much the ecliptic tilts per segment |
| **Direction** | Earth incl vs planet incl | Sign of the effect (+1 or -1) |
| **Rate factor** | `1/tan(i(t))` | How efficiently the tilt converts to node shift |

The dynamic ecliptic inclination accounts for BOTH Earth's and the planet's orbital plane oscillations simultaneously, correctly capturing how the angle between the two planes varies over the planet's perihelion precession period.

### Physical Completeness Analysis

The implementation captures the dominant physical effect correctly. Here is an assessment of all relevant effects:

**What IS modeled:**

| Effect | Mechanism | Status |
|--------|-----------|--------|
| Reference frame tilt | Obliquity-driven `dΩ/dε = -sin(Ω)/tan(i)` | ✅ Complete |
| Earth inclination direction | `inclDirection = earthIncl > planetIncl ? +1 : -1` | ✅ Complete |
| Planet inclination oscillation | Dynamic `i(t)` in rate factor `1/tan(i)` | ✅ Complete |
| Inclination crossovers | Segment splitting when Earth crosses planet inclination | ✅ Complete |
| Obliquity extrema | Segment splitting at direction reversals | ✅ Complete |

**Theoretical subtleties (not modeled, with justification):**

1. **H/8 contamination in obliquity driver**: The formula uses obliquity change (`dε`) which includes both the H/3 orbital plane tilt and the H/8 axial precession. Strictly, only the H/3 component (orbital inclination change) tilts the ecliptic. The H/8 component is axial precession which does NOT move the ecliptic plane. However: the H/8 amplitude in obliquity is smaller than H/3, the calibration (ascNodeToolCorrection, parallax coefficients) was fitted WITH this behavior, and over 200 years the difference is negligible.

2. **Planet's invariable-plane node precession**: Each planet's ascending node on the invariable plane precesses linearly at rate `360/perihelionEclipticYears`. This rotation of the planet's orbital plane around the invariable-plane normal is a separate physical effect from the ecliptic reference frame tilting. It is partially captured through the dynamic ecliptic inclination (which uses the precessing invariable-plane node in its dot product calculation), but not directly modeled as a separate ascending node shift. The effect is absorbed by the empirical parallax correction layer.

3. **Full N-body gravitational precession**: The complete gravitational ascending node precession rates (18–1053 arcsec/century from JPL) are much larger than what the geometric model produces. This is a known limitation — the model captures the secular oscillation pattern but not the absolute rates. See [doc 70](70-ascending-node-limitations.md) for details.

**Verdict**: For a geocentric circular-orbit model, the ascending node calculation is as complete as it can be without switching to a full gravitational N-body approach. The remaining theoretical gaps are small and absorbed by the empirical correction layers.

### Summary

The two systems are **independent and both correct**:
- The ascending node calculation models how the crossing point shifts as Earth's reference frame tilts
- The ecliptic inclination calculation models how the angle between orbits appears to change

Both use the static `<planet>EclipticInclinationJ2000` as their base, but apply different transformations to model different physical effects.

---

## Related Documents

- [Dynamic Elements Overview](04-dynamic-elements-overview.md) - Master overview of all dynamic systems
- [Inclination Calculations](32-inclination-calculations.md) - Planet inclination oscillation using ICRF perihelion approach
- [Constants Reference](20-constants-reference.md) - All constants and source values
- [Ascending Node Optimization](../tools/verify/ascending-node-optimization.js) - Numerical optimization to calculate ascending nodes
- [Ascending Node Verification](../tools/verify/ascending-node-verification.js) - Verifies J2000-verified ascending nodes
- [Ascending Node Souami-Souchay](../tools/verify/ascending-node-souami-souchay.js) - Compares S&S vs Verified accuracy
- [Analytical Ascending Nodes](../tools/verify/analytical-ascending-nodes.js) - Analytical (closed-form) calculation

## Testing

To verify the implementation:

1. **At year 2000**: All ascending nodes should match the static reference values
2. **Moving forward in time**: Ascending nodes should change smoothly
3. **At obliquity extrema (~12500 AD)**: Direction should reverse for all planets
4. **At inclination crossovers (~9700 AD for Jupiter)**: Direction should reverse only for that planet
5. **No discontinuities**: Values should transition smoothly through all critical points
