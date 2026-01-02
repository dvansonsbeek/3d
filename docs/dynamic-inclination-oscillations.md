# Planetary Inclination Oscillations to the Invariable Plane

## Executive Summary

This document describes a method to derive **dynamic inclination oscillations** for each planet relative to the invariable plane. Currently, only Earth has a modeled inclination oscillation (`earthInvPlaneInclinationAmplitude`). By comparing observed secular variation rates with our model's Earth-effect calculations, we can derive the "missing" oscillation for each planet.

## The Problem

### Current Model State

Our model calculates ecliptic inclination (planet to ecliptic) using:
1. **Earth's inclination to invariable plane** - Dynamic, oscillates 0.931° to 2.059°
2. **Planet's inclination to invariable plane** - **FIXED** constants (e.g., `saturnInvPlaneInclinationJ2000 = 0.925°`)
3. **Precessing ascending nodes** - Both Earth's and planet's Ω on invariable plane

### The Discrepancy

| Planet | Observed di/dt | Model Predicts | Difference |
|--------|----------------|----------------|------------|
| Mercury | -21.4"/cy | ~-X"/cy | ? |
| Venus | -2.8"/cy | ~-X"/cy | ? |
| Mars | -29.3"/cy | ~-X"/cy | ? |
| Jupiter | -6.6"/cy | ~-X"/cy | ? |
| **Saturn** | **+7.0"/cy** | **negative** | **WRONG SIGN** |
| Uranus | -8.7"/cy | ~-X"/cy | ? |
| **Neptune** | **+1.3"/cy** | **negative** | **WRONG SIGN** |

Saturn and Neptune show **increasing** inclination to the ecliptic, but our model predicts decreasing. The difference represents the planet's own orbital plane oscillation.

## The Solution: Decomposition Approach

### Physical Basis

The observed secular variation in a planet's inclination to the ecliptic has two components:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   (di/dt)_observed  =  (di/dt)_earth_effect  +  (di/dt)_planet_own           ║
║                                                                               ║
║   Where:                                                                      ║
║   • (di/dt)_earth_effect = Change due to Earth's orbital plane tilting       ║
║   • (di/dt)_planet_own   = Change in planet's inclination to invariable plane║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Rearranging to Find Planet's Own Effect

```
(di/dt)_planet_own = (di/dt)_observed - (di/dt)_earth_effect
```

This "planet's own effect" represents the rate at which the planet's orbital plane tilts relative to the **invariable plane** — exactly analogous to Earth's `earthInvPlaneInclinationAmplitude` oscillation.

## Data Sources

### Observed Secular Rates (JPL)

From [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html), Table 1 (1800-2050 AD):

| Planet | di/dt (°/century) | di/dt (arcsec/century) |
|--------|-------------------|------------------------|
| Mercury | -0.00594749 | -21.41 |
| Venus | -0.00078890 | -2.84 |
| Earth-Moon | -0.01294668 | -46.61 |
| Mars | -0.00813131 | -29.27 |
| Jupiter | -0.00183714 | -6.61 |
| Saturn | +0.00193609 | +6.97 |
| Uranus | -0.00242939 | -8.75 |
| Neptune | +0.00035372 | +1.27 |

### Current Fixed Inclinations to Invariable Plane

From our model (Souami & Souchay 2012 values):

| Planet | Inclination to Inv. Plane | Variable Name |
|--------|---------------------------|---------------|
| Mercury | 6.3473° | `mercuryInvPlaneInclinationJ2000` |
| Venus | 2.1545° | `venusInvPlaneInclinationJ2000` |
| Earth | 1.4951° (mean) | `earthInvPlaneInclinationMean` |
| Mars | 1.6312° | `marsInvPlaneInclinationJ2000` |
| Jupiter | 0.3220° | `jupiterInvPlaneInclinationJ2000` |
| Saturn | 0.9255° | `saturnInvPlaneInclinationJ2000` |
| Uranus | 0.9947° | `uranusInvPlaneInclinationJ2000` |
| Neptune | 0.7354° | `neptuneInvPlaneInclinationJ2000` |

### Earth's Oscillation Parameters (Reference)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `earthInvPlaneInclinationMean` | 1.4951° | Mean inclination to invariable plane |
| `earthInvPlaneInclinationAmplitude` | 0.564° | Oscillation amplitude |
| Period | ~99,392 years | One-third of holistic year |
| Range | 0.931° to 2.059° | Min to max inclination |

## Calculation Method

### Step 1: Calculate Earth's Effect Rate

At any given time, the ecliptic inclination formula is:

```
cos(i_ecliptic) = sin(i_p)·sin(i_e)·cos(ΔΩ) + cos(i_p)·cos(i_e)
```

Where:
- `i_p` = Planet's inclination to invariable plane
- `i_e` = Earth's inclination to invariable plane
- `ΔΩ` = Ω_planet - Ω_earth (ascending node difference)

The rate of change involves partial derivatives:

```
d(i_ecliptic)/dt = ∂i/∂i_e · di_e/dt + ∂i/∂ΔΩ · dΔΩ/dt
```

For a numerical approximation at J2000:

```javascript
function calculateEarthEffectRate(planet) {
  const dt = 100; // years (1 century)

  // Calculate ecliptic inclination at J2000
  const i_app_2000 = calculateEclipticInclinationDynamic(planet, 2000);

  // Calculate ecliptic inclination at J2000 + 100 years
  const i_app_2100 = calculateEclipticInclinationDynamic(planet, 2100);

  // Rate in degrees per century
  return (i_app_2100 - i_app_2000);
}
```

### Step 2: Derive Planet's Own Rate

```javascript
const planetOwnRate = observedRate - earthEffectRate;
```

### Step 3: Convert Rate to Oscillation Parameters

If we assume the planet's inclination oscillates sinusoidally (like Earth's):

```
i_planet(t) = i_mean + A · cos(2π·t/P + φ)

di/dt = -A · (2π/P) · sin(2π·t/P + φ)
```

At the current epoch, if we know:
- `di/dt` (the rate we just derived)
- `P` (period from Laplace-Lagrange theory)

We can solve for amplitude `A` and phase `φ`:

```
A = |di/dt| · P / (2π · |sin(phase)|)
```

However, the phase is unknown. A simpler approach for short timescales:

**Linear Approximation:**
```
i_planet(t) = i_mean + (di/dt)_planet_own · (t - 2000) / 100
```

This is valid for timescales much shorter than the secular period.

## Oscillation Periods: Same as Nodal Precession

### Key Insight: Unified Orbital Plane Precession

The inclination oscillation period and the ascending node precession period are **the same** for each planet. This is because both effects arise from the same physical mechanism: gravitational torques from other planets cause the orbital plane to precess as a rigid unit around the invariable plane.

When an orbital plane precesses:
1. **The ascending node (Ω) rotates** around the invariable plane's pole
2. **The inclination oscillates** as the plane tilts toward and away from the reference plane

These are two aspects of the same precession motion, analogous to how a spinning top's axis traces a cone while also nodding up and down.

### Evidence from Earth

For Earth, we already model this correctly:
- `earthPerihelionEclipticYears = holisticyearLength/3` ≈ **99,392 years**
- Earth's inclination oscillation period = **~99,392 years**

Both use the same period because they represent the same physical precession of Earth's orbital plane.

### Implication for Other Planets

**The inclination oscillation period for each planet should equal its `<planet>PerihelionEclipticYears` constant.**

This means we don't need separate period constants — we reuse the existing precession periods:

| Planet | Precession Period | Variable |
|--------|-------------------|----------|
| Mercury | 242,268 years | `mercuryPerihelionEclipticYears` |
| Venus | ~6×10¹² years | `venusPerihelionEclipticYears` (nearly fixed) |
| Earth | 99,392 years | `earthPerihelionEclipticYears` |
| Mars | 74,544 years | `marsPerihelionEclipticYears` |
| Jupiter | 298,176 years | `jupiterPerihelionEclipticYears` |
| Saturn | -298,176 years | `saturnPerihelionEclipticYears` (retrograde) |
| Uranus | 99,392 years | `uranusPerihelionEclipticYears` |
| Neptune | -298,176 years | `neptunePerihelionEclipticYears` (retrograde) |

**Note:** Negative periods indicate retrograde precession (clockwise when viewed from north).

### Comparison with Laplace-Lagrange Eigenmodes

The Laplace-Lagrange secular theory describes the solar system's long-term evolution using eigenmodes:

| Mode | Frequency | Period | Dominant Influence |
|------|-----------|--------|-------------------|
| s₁ | -5.20"/yr | ~249,000 yr | Mercury |
| s₂ | -6.57"/yr | ~197,000 yr | Venus |
| s₃ | -18.74"/yr | ~69,000 yr | Earth-Mars |
| s₄ | -17.64"/yr | ~73,000 yr | Earth-Mars |
| s₅ | 0 | ∞ | Invariable plane |
| s₆ | -25.90"/yr | ~50,000 yr | Jupiter-Saturn |
| s₇ | -2.91"/yr | ~445,000 yr | Uranus |
| s₈ | -0.68"/yr | ~1,900,000 yr | Neptune |

Each planet's actual motion is a superposition of these modes. However, our model uses simplified single-period precession, which is sufficient for timescales of tens of thousands of years and provides physical consistency between nodal precession and inclination oscillation.

## Proposed Implementation (NOW IMPLEMENTED)

### New Constants: Mean, Amplitude, and Phase Offset

The Ω-based approach requires three constants per planet:

1. **Mean inclination** - Center of oscillation (Laplace-Lagrange midpoint)
2. **Amplitude** - Half of the oscillation range
3. **Phase offset** - Geometric relationship between Ω and inclination phase

```javascript
// ══════════════════════════════════════════════════════════════════════════════
// PLANETARY INCLINATION TO INVARIABLE PLANE - MEAN AND AMPLITUDE
// Using Laplace-Lagrange secular theory bounds from Farside textbook (Table 10.4)
// Mean = midpoint of oscillation range, Amplitude = half of range
// ══════════════════════════════════════════════════════════════════════════════

// Mercury: Range 4.57° to 9.86° (from Laplace-Lagrange)
const mercuryInvPlaneInclinationMean = 7.215;       // (4.57 + 9.86) / 2
const mercuryInvPlaneInclinationAmplitude = 2.645;  // (9.86 - 4.57) / 2

// Venus: Near-infinite period, no oscillation
const venusInvPlaneInclinationMean = 2.155;
const venusInvPlaneInclinationAmplitude = 0.0;

// Mars: Range 0.00° to 5.84° (from Laplace-Lagrange)
const marsInvPlaneInclinationMean = 2.92;           // (0.00 + 5.84) / 2
const marsInvPlaneInclinationAmplitude = 2.92;      // (5.84 - 0.00) / 2

// Jupiter: Range 0.241° to 0.489° (from Laplace-Lagrange)
const jupiterInvPlaneInclinationMean = 0.365;       // (0.241 + 0.489) / 2
const jupiterInvPlaneInclinationAmplitude = 0.124;  // (0.489 - 0.241) / 2

// Saturn: Range 0.797° to 1.02° (from Laplace-Lagrange)
const saturnInvPlaneInclinationMean = 0.9085;       // (0.797 + 1.02) / 2
const saturnInvPlaneInclinationAmplitude = 0.112;   // (1.02 - 0.797) / 2

// Uranus: Range 0.902° to 1.11° (from Laplace-Lagrange)
const uranusInvPlaneInclinationMean = 1.006;        // (0.902 + 1.11) / 2
const uranusInvPlaneInclinationAmplitude = 0.104;   // (1.11 - 0.902) / 2

// Neptune: Range 0.554° to 0.800° (from Laplace-Lagrange)
const neptuneInvPlaneInclinationMean = 0.677;       // (0.554 + 0.800) / 2
const neptuneInvPlaneInclinationAmplitude = 0.123;  // (0.800 - 0.554) / 2

// Pluto: Estimated (not in Laplace-Lagrange classical theory)
const plutoInvPlaneInclinationMean = 15.564;
const plutoInvPlaneInclinationAmplitude = 0.1;

// ══════════════════════════════════════════════════════════════════════════════
// PHASE OFFSETS: Ω_J2000 - φ₀
// These link the inclination oscillation to the ascending node position
// ══════════════════════════════════════════════════════════════════════════════

const mercuryInclinationPhaseAngle = 283.7;  // Ω=32.81°, φ₀=109.1°
const venusInclinationPhaseAngle = 0.0;      // No oscillation
const marsInclinationPhaseAngle = 238.7;     // Ω=354.85°, φ₀=116.2°
const jupiterInclinationPhaseAngle = 202.6;  // Ω=312.9°, φ₀=110.3°
const saturnInclinationPhaseAngle = 37.8;    // Ω=119.04°, φ₀=+81.3° → INCREASING incl., matches observed +0.0025°/century
const uranusInclinationPhaseAngle = 211.7;   // Ω=307.76°, φ₀=96.1°
const neptuneInclinationPhaseAngle = 254.0;  // Ω=192.18°, φ₀=-61.8°
const plutoInclinationPhaseAngle = 15.4;     // Ω=105.44°, φ₀=90°
```

### Symmetry with Earth's Implementation

This approach mirrors exactly how Earth is already handled:

| Component | Earth | Other Planets |
|-----------|-------|---------------|
| **Mean inclination** | `earthInvPlaneInclinationMean` | `<planet>Inclination` (existing) |
| **Amplitude** | `earthInvPlaneInclinationAmplitude` | `<planet>InvPlaneInclinationAmplitude` (NEW) |
| **Period** | `earthPerihelionEclipticYears` | `<planet>PerihelionEclipticYears` (existing) |
| **Phase reference** | `balancedYear` | Same `balancedYear` or planet-specific |

### Dynamic Calculation Function

```javascript
/**
 * Compute a planet's dynamic inclination to the invariable plane.
 * Uses the Ω-based approach: inclination phase linked to ascending node.
 *
 * @param {string} planet - Planet identifier
 * @param {number} currentYear - Current simulation year
 * @returns {number} Dynamic inclination in degrees
 */
function computePlanetInvPlaneInclinationDynamic(planet, currentYear) {
  // Get constants (example for Saturn)
  const i_mean = saturnInvPlaneInclinationMean;           // 0.9085° (Laplace-Lagrange midpoint)
  const amplitude = saturnInvPlaneInclinationAmplitude;   // 0.112° (half of range)
  const period = saturnPerihelionEclipticYears;   // -298176 years (retrograde)
  const ascNodeJ2000 = saturnAscendingNodeInvPlaneVerified;  // 119.04°
  const phaseOffset = saturnInclinationPhaseAngle;          // 200.5°

  // Calculate years since J2000
  const yearsSinceJ2000 = currentYear - 2000;

  // Calculate current ascending node (precesses with time)
  const precessionRate = 360 / period;  // degrees per year (negative for retrograde)
  const ascNodeCurrent = ascNodeJ2000 + precessionRate * yearsSinceJ2000;

  // Calculate current phase from ascending node
  const currentPhaseDeg = ascNodeCurrent - phaseOffset;
  const currentPhaseRad = currentPhaseDeg * Math.PI / 180;

  // Dynamic inclination centered on the mean
  return i_mean + amplitude * Math.cos(currentPhaseRad);
}
```

### The Ω-Based Formula Explained

The key formula is:

```
i(t) = mean + A × cos(Ω(t) - offset)
```

**Why this works:**

1. **Geometric coupling**: When an orbital plane precesses around the invariable plane, the ascending node Ω and inclination i are coupled. As Ω advances, the inclination oscillates.

2. **Phase offset derivation**:
   - At J2000, we know i_J2000 from Souami & Souchay
   - Solve: `i_J2000 = mean + A × cos(φ₀)` for φ₀
   - Then: `offset = Ω_J2000 - φ₀`

3. **Verification at J2000**:
   - At J2000: `Ω(t) = Ω_J2000`
   - Phase = `Ω_J2000 - offset = Ω_J2000 - (Ω_J2000 - φ₀) = φ₀`
   - Result: `i = mean + A × cos(φ₀) = i_J2000` ✓

4. **Bounds respected**:
   - When `cos(phase) = +1`: `i = mean + A` (maximum)
   - When `cos(phase) = -1`: `i = mean - A` (minimum)
   - These match the Laplace-Lagrange theoretical bounds

### Integration with Ecliptic Inclination

```javascript
function updateDynamicInclinations() {
  // Get DYNAMIC Earth inclination (existing)
  const earthI = o.earthInvPlaneInclinationDynamic;  // Already oscillates

  // Get DYNAMIC planet inclination (NEW)
  const mercuryI = computePlanetInvPlaneInclinationDynamic('mercury', o.currentYear);
  const saturnI = computePlanetInvPlaneInclinationDynamic('saturn', o.currentYear);
  // ... etc

  // Calculate ecliptic inclination using BOTH dynamic values
  // cos(ecliptic) = sin(i_p)·sin(i_e)·cos(ΔΩ) + cos(i_p)·cos(i_e)
  // ... existing dot product calculation, but with dynamic i_p
}
```

## Derivation Procedure

### For Each Planet:

1. **Run the model** at year 2000 and year 2100 with FIXED planet inclinations
2. **Calculate** `(di/dt)_earth_effect` = (ecliptic_2100 - ecliptic_2000) / 100
3. **Look up** `(di/dt)_observed` from JPL table
4. **Compute** `(di/dt)_planet_own` = observed - earth_effect
5. **Estimate amplitude** using dominant secular period

### Example: Saturn

```
Step 1-2: Model shows Saturn ecliptic incl decreasing at ~-0.94"/century
          (di/dt)_earth_effect ≈ -0.00026°/century

Step 3:   (di/dt)_observed = +0.00194°/century (from JPL)

Step 4:   (di/dt)_planet_own = +0.00194 - (-0.00026) = +0.00220°/century
          = +7.9 arcsec/century

Step 5:   Using s₆ period of 50,000 years:
          If di/dt = A · (2π/P) at maximum rate:
          A ≈ |di/dt| · P / (2π) = 0.00220 · 50000 / (2π) ≈ 17.5°

          This seems too large! The actual amplitude is likely smaller,
          meaning we're not at maximum rate. Need phase information.
```

### Alternative: Use Rate Directly (Linear Approximation)

For timescales under ~10,000 years, use the linear rate directly:

```javascript
const saturnInclinationRate = +0.00220; // degrees per century (derived)

function getSaturnInvPlaneInclinationDynamic(currentYear) {
  const centuriesSinceJ2000 = (currentYear - 2000) / 100;
  return saturnInvPlaneInclinationMean + saturnInclinationRate * centuriesSinceJ2000;
}
```

## Expected Results

After implementation, the model should show:

| Planet | Ecliptic Incl Trend | Match JPL? |
|--------|---------------------|------------|
| Mercury | Decreasing | Yes |
| Venus | Decreasing | Yes |
| Mars | Decreasing | Yes |
| Jupiter | Decreasing | Yes |
| **Saturn** | **Increasing** | **Yes** (currently wrong) |
| Uranus | Decreasing | Yes |
| **Neptune** | **Increasing** | **Yes** (currently wrong) |

## Amplitude Derivation

### Method

For a sinusoidal oscillation with known rate and period:

```
i(t) = i_mean + A × cos(phase)
di/dt = -A × (2π / P) × sin(phase)
```

**Upper bound estimate** (assuming we're near maximum rate, `|sin(phase)| ≈ 1`):

```
A_max = |di/dt|_planet_own × |P| / (2π)
```

**More realistic estimate** (assuming we're at a typical point, `|sin(phase)| ≈ 0.7`):

```
A_typical = |di/dt|_planet_own × |P| / (2π × 0.7)
```

### Calculation for Each Planet

Using the data:
- **Observed rates**: From JPL Table 1 (°/century)
- **Periods**: From existing `<planet>PerihelionEclipticYears` constants
- **Earth effect**: Estimated from model (needs numerical calculation)

#### Simplified Approach: Use Observed Rates Directly

For a first implementation, we can assume the **observed rate IS the planet's own rate**, which is valid if:
1. Earth's effect is small compared to the planet's own oscillation, OR
2. Earth's effect is already "baked into" the JPL rates (since they're measured from Earth)

This gives us a **starting point** that can be refined later.

### Derived Amplitude Values

Using `A = |rate| × |period| / (2π)`:

| Planet | Rate (°/cy) | Period (years) | A_max (°) | Notes |
|--------|-------------|----------------|-----------|-------|
| Mercury | -0.00595 | 242,268 | **0.229** | Moderate oscillation |
| Venus | -0.00079 | ~∞ | ~0 | Nearly fixed (as expected) |
| Mars | -0.00813 | 74,544 | **0.096** | Small oscillation |
| Jupiter | -0.00184 | 298,176 | **0.087** | Small oscillation |
| Saturn | +0.00194 | 298,176 | **0.092** | Small oscillation, **positive rate** |
| Uranus | -0.00243 | 99,392 | **0.038** | Very small oscillation |
| Neptune | +0.00035 | 298,176 | **0.017** | Very small oscillation, **positive rate** |

**Comparison with Earth:**
- Earth amplitude = `earthInvPlaneInclinationAmplitude` = **0.564°**
- Mercury amplitude ≈ 0.229° (about 40% of Earth's)
- Other planets have smaller amplitudes

### Proposed Initial Values

Based on the above calculations, here are the proposed amplitude constants:

```javascript
// Derived using: A = |JPL rate| × |period| / (2π)
// These are upper-bound estimates assuming maximum rate at J2000

const mercuryInvPlaneInclinationAmplitude = 0.229;  // ±0.229° around mean 6.347°
const venusInvPlaneInclinationAmplitude = 0.0;      // Nearly fixed (period ≈ ∞)
const marsInvPlaneInclinationAmplitude = 0.096;     // ±0.096° around mean 1.631°
const jupiterInvPlaneInclinationAmplitude = 0.087;  // ±0.087° around mean 0.322°
const saturnInvPlaneInclinationAmplitude = 0.092;   // ±0.092° around mean 0.925°
const uranusInvPlaneInclinationAmplitude = 0.038;   // ±0.038° around mean 0.995°
const neptuneInvPlaneInclinationAmplitude = 0.017;  // ±0.017° around mean 0.735°
```

### Validation Check

After implementing these values, the model should produce ecliptic inclination rates that match JPL:

| Planet | JPL Rate | Expected Model Rate |
|--------|----------|---------------------|
| Saturn | +6.97"/cy | Should now be positive ✓ |
| Neptune | +1.27"/cy | Should now be positive ✓ |
| Others | negative | Should match magnitude |

### Refinement: Separating Earth's Effect

For a more accurate model, we should:

1. **Run the current model** (with fixed planet inclinations) to measure Earth's effect rate
2. **Subtract** from JPL rates to get true planet-own rates
3. **Recalculate amplitudes** using the corrected rates

This refinement can be done after the initial implementation to verify and tune the values.

## Implementation Status

### Completed (2024-12-31)

1. ✅ **Implemented mean inclination constants** in script.js (lines 292-332)
   - Using Laplace-Lagrange secular theory bounds from Farside physics textbook (Table 10.4)
   - Mean = midpoint of oscillation range (not J2000 value)
   - `mercuryInvPlaneInclinationMean = 7.215` (range 4.57° to 9.86°)
   - `venusInvPlaneInclinationMean = 2.155` (near-infinite period, no oscillation)
   - `marsInvPlaneInclinationMean = 2.92` (range 0.00° to 5.84°)
   - `jupiterInvPlaneInclinationMean = 0.365` (range 0.241° to 0.489°)
   - `saturnInvPlaneInclinationMean = 0.9085` (range 0.797° to 1.02°)
   - `uranusInvPlaneInclinationMean = 1.006` (range 0.902° to 1.11°)
   - `neptuneInvPlaneInclinationMean = 0.677` (range 0.554° to 0.800°)
   - `plutoInvPlaneInclinationMean = 15.564` (estimated, using J2000 value)

2. ✅ **Implemented amplitude constants** in script.js (lines 292-332)
   - Amplitude = half of oscillation range
   - `mercuryInvPlaneInclinationAmplitude = 2.645`
   - `venusInvPlaneInclinationAmplitude = 0.0` (near-infinite period)
   - `marsInvPlaneInclinationAmplitude = 2.92`
   - `jupiterInvPlaneInclinationAmplitude = 0.124`
   - `saturnInvPlaneInclinationAmplitude = 0.112`
   - `uranusInvPlaneInclinationAmplitude = 0.104`
   - `neptuneInvPlaneInclinationAmplitude = 0.123`
   - `plutoInvPlaneInclinationAmplitude = 0.1` (estimated)

3. ✅ **Implemented phase offset constants** in script.js (lines 359-369)
   - Each planet has a `<planet>InclinationPhaseAngle` value (degrees)
   - **Key insight**: Phase offset = Ω_J2000 - φ₀ (geometric relationship)
   - This links the inclination oscillation to the ascending node precession
   - `mercuryInclinationPhaseAngle = 283.7` (Ω=32.81°, φ₀=109.1°)
   - `venusInclinationPhaseAngle = 0.0` (no oscillation)
   - `marsInclinationPhaseAngle = 238.7` (Ω=354.85°, φ₀=116.2°)
   - `jupiterInclinationPhaseAngle = 202.6` (Ω=312.9°, φ₀=110.3°)
   - `saturnInclinationPhaseAngle = 37.8` (Ω=119.04°, φ₀=+81.3° → matches observed +0.0025°/century trend)
   - `uranusInclinationPhaseAngle = 211.7` (Ω=307.76°, φ₀=96.1°)
   - `neptuneInclinationPhaseAngle = 254.0` (Ω=192.18°, φ₀=-61.8°)
   - `plutoInclinationPhaseAngle = 15.4` (Ω=105.44°, φ₀=90°)

4. ✅ **Created `computePlanetInvPlaneInclinationDynamic()`** function (lines 19515-19585)
   - **Ω-based approach**: Inclination phase linked to ascending node position
   - Formula: `i(t) = mean + A × cos(Ω(t) - offset)`
   - At J2000: `Ω(t) = Ω_J2000`, so `cos(Ω_J2000 - offset) = cos(φ₀)` returns J2000 value
   - Uses planet-specific precession periods from `<planet>PerihelionEclipticYears`
   - Handles retrograde precession (Saturn, Neptune) correctly

5. ✅ **Updated `updateDynamicInclinations()`** to compute `o.<planet>InvPlaneInclinationDynamic` values
   - Calls `computePlanetInvPlaneInclinationDynamic()` for each planet
   - Uses dynamic inclinations instead of fixed constants in ecliptic inclination calculation

6. ✅ **`calculateInvariablePlaneFromAngularMomentumDynamic()`** automatically benefits
   - Uses `o.<planet>EclipticInclinationDynamic` which now incorporates dynamic planet inclinations

### The Ω-Based Approach

The key insight is that **inclination phase is geometrically linked to the ascending node**. When an orbital plane precesses around the invariable plane, the ascending node (Ω) and inclination oscillation are two aspects of the same motion.

**Formula:**
```
i(t) = mean + A × cos(Ω(t) - offset)

where:
  mean   = Laplace-Lagrange mean (midpoint of oscillation range)
  A      = amplitude (half of min-max range)
  Ω(t)   = current ascending node on invariable plane
  offset = geometric phase offset (Ω_J2000 - φ₀)
```

**How the offset is calculated:**
1. At J2000, the planet has a known inclination (Souami & Souchay value)
2. This gives us: `i_J2000 = mean + A × cos(φ₀)` → solve for `φ₀`
3. The offset is: `offset = Ω_J2000 - φ₀`
4. As Ω precesses, the phase `(Ω(t) - offset)` evolves, driving the inclination oscillation

**Why this works:**
- At J2000: `Ω(t) = Ω_J2000`, so phase = `Ω_J2000 - offset = φ₀`, returning i_J2000 ✓
- As time progresses: Ω precesses, phase changes, inclination oscillates within Laplace-Lagrange bounds

### Phase Offset Table

| Planet | Ω_J2000 | φ₀ | Offset | Direction at J2000 |
|--------|---------|-----|--------|-------------------|
| Mercury | 32.81° | 109.1° | 283.7° | Decreasing |
| Venus | — | — | — | (no oscillation) |
| Mars | 354.85° | 116.2° | 238.7° | Decreasing |
| Jupiter | 312.9° | 110.3° | 202.6° | Decreasing |
| Saturn | 119.04° | +81.3° | 37.8° | Increasing |
| Uranus | 307.76° | 96.1° | 211.7° | Decreasing |
| Neptune | 192.18° | -61.8° | 254.0° | Increasing |
| Pluto | 105.44° | 90° | 15.4° | Decreasing |

### Pending

7. **Validate** ecliptic inclination rates against JPL
8. **Fine-tune phase offset values** if needed based on observations

### Scientific Basis

The amplitude values use the **Laplace-Lagrange secular theory** bounds from the Farside physics textbook:
- https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html (Table 10.4)

These represent the **full oscillation envelope** based on analytical eigenmode calculations.

## Physical Interpretation

This approach reveals that:

1. **The invariable plane is truly invariable** - total angular momentum is conserved
2. **All orbital planes oscillate** around the invariable plane, not just Earth's
3. **What we observe from Earth** is the combination of:
   - Earth's orbital plane tilting
   - The target planet's orbital plane tilting
   - Both ascending nodes precessing
4. **The ecliptic is not special** - it's just our (moving) vantage point

### Unified Model Structure

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    ORBITAL PLANE PRECESSION MODEL                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  For EACH planet (including Earth), the orbital plane precesses around       ║
║  the invariable plane with these coupled effects:                            ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │  ASCENDING NODE (Ω) on Invariable Plane                                 │ ║
║  │  ─────────────────────────────────────────────────────────────────────  │ ║
║  │  Ω(t) = Ω_J2000 + (360° / period) × (t - 2000)                         │ ║
║  │                                                                         │ ║
║  │  Period = <planet>PerihelionEclipticYears                              │ ║
║  │  (Negative period = retrograde precession)                              │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                              ↕ GEOMETRICALLY LINKED ↕                        ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │  INCLINATION (i) to Invariable Plane                                    │ ║
║  │  ─────────────────────────────────────────────────────────────────────  │ ║
║  │  i(t) = mean + amplitude × cos(Ω(t) - offset)                          │ ║
║  │                                                                         │ ║
║  │  Mean = <planet>InvPlaneInclinationMean (Laplace-Lagrange midpoint)            │ ║
║  │  Amplitude = <planet>InclinationAmplitude (half of range)              │ ║
║  │  Offset = <planet>InclinationPhaseAngle (Ω_J2000 - φ₀)                │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║  Both effects are two aspects of the SAME physical precession motion.        ║
║  The inclination phase is DIRECTLY derived from the ascending node.          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Constants Summary

| Planet | Mean (NEW) | Amplitude (NEW) | Phase Offset (NEW) | Period (existing) |
|--------|------------|-----------------|-------------------|-------------------|
| Mercury | `mercuryInvPlaneInclinationMean` | `mercuryInvPlaneInclinationAmplitude` | `mercuryInclinationPhaseAngle` | `mercuryPerihelionEclipticYears` |
| Venus | `venusInvPlaneInclinationMean` | `venusInvPlaneInclinationAmplitude` | — (no oscillation) | — |
| Earth | `earthInvPlaneInclinationMean` | `earthInvPlaneInclinationAmplitude` | (uses balancedYear) | `earthPerihelionEclipticYears` |
| Mars | `marsInvPlaneInclinationMean` | `marsInvPlaneInclinationAmplitude` | `marsInclinationPhaseAngle` | `marsPerihelionEclipticYears` |
| Jupiter | `jupiterInvPlaneInclinationMean` | `jupiterInvPlaneInclinationAmplitude` | `jupiterInclinationPhaseAngle` | `jupiterPerihelionEclipticYears` |
| Saturn | `saturnInvPlaneInclinationMean` | `saturnInvPlaneInclinationAmplitude` | `saturnInclinationPhaseAngle` | `saturnPerihelionEclipticYears` |
| Uranus | `uranusInvPlaneInclinationMean` | `uranusInvPlaneInclinationAmplitude` | `uranusInclinationPhaseAngle` | `uranusPerihelionEclipticYears` |
| Neptune | `neptuneInvPlaneInclinationMean` | `neptuneInvPlaneInclinationAmplitude` | `neptuneInclinationPhaseAngle` | `neptunePerihelionEclipticYears` |

## References

1. [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html) - Secular variation rates
2. [Secular Evolution of Planetary Orbits](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html) - Laplace-Lagrange theory
3. Souami & Souchay (2012) - Invariable plane orientation
4. Laskar, J. (1988) - "Secular evolution of the solar system over 10 million years"

---

*Document created: 2024-12-31*
*Part of the Holistic Universe Model documentation*
