# Dynamic Ascending Node Calculation

## Overview

This document describes the dynamic calculation of the longitude of ascending node for all planets in the Holistic Universe Model. The ascending node shifts over time as Earth's obliquity (axial tilt) changes, with the effect depending on the relationship between Earth's orbital inclination and each planet's orbital inclination.

## Implementation Status

**Implemented** - The dynamic ascending node calculation is fully implemented in `script.js`.

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
| `earthtiltMean` | 23.41398° | Mean obliquity |
| `earthInvPlaneInclinationMean` | 1.481592° | Mean orbital inclination |
| `earthInvPlaneInclinationAmplitude` | 0.633849° | Amplitude of variation |
| `holisticyearLength` | 333,888 years | Full cycle length |

### Earth's Inclination Range

Earth's orbital inclination oscillates between:
- **Minimum**: 1.482° - 0.634° = **0.848°**
- **Maximum**: 1.482° + 0.634° = **2.115°**

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
dΩ/dε = -sin(Ω) / tan(i)
```

Where:
- `Ω` = current ascending node longitude
- `ε` = Earth's obliquity
- `i` = planet's orbital inclination

### Rate-Based Integration

The implementation uses a **rate-based integration approach** that properly handles:

1. **Obliquity direction changes** - When Earth's obliquity reverses from decreasing to increasing (or vice versa), the effect on the ascending node also reverses.

2. **Inclination crossovers** - When Earth's orbital inclination crosses a planet's inclination, the direction of the effect reverses for that planet.

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

// Determine direction based on Earth vs planet inclination at midpoint
const inclDirection = (earthInclAtMid > planetInclination) ? +1 : -1;

// Calculate effect for this segment
const segmentEffect = baseDOmegaDeps * inclDirection * deltaObl;
```

## Implementation Details

### Key Functions

#### `calculateDynamicAscendingNodeFromTilts()`

Main calculation function. Location: [script.js:9198](../src/script.js#L9198)

```javascript
function calculateDynamicAscendingNodeFromTilts(
  orbitTilta,        // Encodes sin(Ω) * inclination
  orbitTiltb,        // Encodes cos(Ω) * inclination
  currentObliquity,  // Current Earth obliquity (degrees)
  earthInclination,  // Current Earth inclination (degrees)
  currentYear        // Current year for integration
)
```

#### `integrateEffect(fromYear, toYear)`

Inner helper that performs the segment-based integration, handling:
- Finding obliquity extrema via sampling
- Finding inclination crossovers
- Summing effects across all segments

#### `getObliquityAtYear(year)`

Computes Earth's obliquity at any year using the formula:

```javascript
obliquity = earthtiltMean
  - earthInvPlaneInclinationAmplitude * cos(phase3)
  + earthInvPlaneInclinationAmplitude * cos(phase8)
```

Where `phase3` and `phase8` correspond to the 111,296-year and 41,736-year cycles.

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
| Main calculation function | [script.js:9198-9350](../src/script.js#L9198-L9350) |
| Helper functions | [script.js:9113-9177](../src/script.js#L9113-L9177) |
| Update function | [script.js:9379-9444](../src/script.js#L9379-L9444) |
| Planet tilt definitions | [script.js:84-228](../src/script.js#L84-L228) |
| Earth cycle parameters | [script.js:42-44](../src/script.js#L42-L44) |

## Relationship to Ecliptic Inclination

### Two Independent Physical Effects

The dynamic ascending node calculation and the dynamic ecliptic inclination (`o.<planet>EclipticInclinationDynamic`) model **two separate physical phenomena**:

| Effect | What Changes | What Stays Fixed | Timescale |
|--------|-------------|------------------|-----------|
| **Ascending Node Shift** | Where the planet's orbit crosses the ecliptic | Planet's orbital inclination relative to invariable plane | ~333,888 years |
| **Ecliptic Inclination** | How tilted the planet appears from Earth's perspective | Planet's orbital plane in space | ~111,296 years |

### Why We Use Static Inclination (Not EclipticInclinationDynamic)

The ascending node calculation correctly uses the **static** `<planet>EclipticInclinationJ2000` (extracted from `orbitTilta/orbitTiltb`), not the dynamic `<planet>EclipticInclinationDynamic`. Here's why:

1. **The planet's orbital plane doesn't change** - only our reference frame (the ecliptic) tilts over time
2. The formula `dΩ/dε = -sin(Ω) / tan(i)` uses `i` = the planet's inclination to the **invariable plane** (or equivalently, to the mean ecliptic), not the current ecliptic
3. The ascending node calculation already accounts for Earth's tilting reference frame through the `currentObliquity` and `earthInclination` parameters

### Physical Reasoning

The **ascending node** is defined as where a planet's orbit crosses the **reference plane** (ecliptic). When Earth's obliquity changes:
- The ecliptic plane tilts slightly relative to the invariable plane
- This changes *where* other planets' orbits cross this tilted plane
- But it doesn't change the planet's actual orbital tilt in space

The **ecliptic inclination** measures the angle between two orbital planes:
- Earth's orbital plane (which tilts with the 111,296-year cycle)
- The planet's orbital plane (which stays essentially fixed in space)

### What Each Calculation Uses

| Calculation | Uses | Why |
|------------|------|-----|
| `calculateDynamicAscendingNodeFromTilts` | Static `<planet>EclipticInclinationJ2000` (from orbitTilta/b) | Measures intrinsic planet orbit property |
| `updateDynamicInclinations` | Static `<planet>EclipticInclinationJ2000` + dynamic Earth tilt | Calculates apparent angle between planes |
| `updateOrbitOrientations` | Dynamic `o.<planet>EclipticInclinationDynamic` | Rotates the visual orbit ring in 3D |

### Why NOT to Use EclipticInclinationDynamic Here

Using `EclipticInclinationDynamic` in the ascending node formula would be **double-counting** the effect of Earth's tilting reference frame:

1. The ascending node formula already accounts for Earth's tilt through:
   - The `earthInclination` parameter (used for direction determination)
   - The `currentObliquity` parameter (used for rate calculation)

2. The `EclipticInclinationDynamic` also incorporates Earth's tilt (that's what makes it "ecliptic")

3. Combining them would apply the Earth tilt effect twice, producing incorrect results

### Summary

The two systems are **independent and both correct**:
- The ascending node calculation models how the crossing point shifts as Earth's reference frame tilts
- The ecliptic inclination calculation models how the angle between orbits appears to change

Both use the static `<planet>EclipticInclinationJ2000` as their base, but apply different transformations to model different physical effects.

---

## Related Documents

- [Dynamic Elements Overview](04-dynamic-elements-overview.md) - Master overview of all dynamic systems
- [Inclination Calculations](15-inclination-calculations.md) - Planet inclination oscillation using Ω-based approach
- [Constants Reference](10-constants-reference.md) - All constants and source values
- [Appendix A - Ascending Node Optimization](appendix-a-ascending-node-optimization.js) - Numerical optimization to calculate ascending nodes
- [Appendix C - Ascending Node Verification](appendix-c-ascending-node-verification.js) - Verifies J2000-verified ascending nodes
- [Appendix D - Ascending Node Comparison](appendix-d-ascending-node-souami-souchay.js) - Compares S&S vs Verified accuracy
- [Appendix B - Analytical Ascending Nodes](appendix-b-analytical-ascending-nodes.js) - Analytical (closed-form) calculation

## Testing

To verify the implementation:

1. **At year 2000**: All ascending nodes should match the static reference values
2. **Moving forward in time**: Ascending nodes should change smoothly
3. **At obliquity extrema (~12500 AD)**: Direction should reverse for all planets
4. **At inclination crossovers (~9700 AD for Jupiter)**: Direction should reverse only for that planet
5. **No discontinuities**: Values should transition smoothly through all critical points
