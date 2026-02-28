# UI Panels Reference

This document provides technical reference for the UI panels in the 3D Solar System Simulation.

---

## Overview

The simulation includes several interactive panels for inspecting planetary data:

| Panel | Purpose |
|-------|---------|
| **Planet Hierarchy Inspector** | Inspect the 5-step hierarchy chain for each planet |
| **Invariable Plane Positions** | View planet heights above/below the invariable plane |
| **Balance Trend Analysis** | Track mass-weighted balance over time |
| **Invariable Plane Balance Explorer** | Test Fibonacci Law assignments interactively |

---

## Planet Hierarchy Inspector

### Purpose

Each planet in the Holistic Universe Model is built using a **5-step hierarchical chain** of nested Three.js objects. The Planet Hierarchy Inspector allows visual inspection of this chain for debugging and verification.

### The 5-Step Hierarchy Pattern

For each planet (e.g., Venus), the hierarchy is:

```
barycenterEarthAndSun (root for all planets)
    └── [Planet]PerihelionDurationEcliptic1     (Step 1: Forward ecliptic precession)
            └── [Planet]PerihelionFromEarth     (Step 2: Perihelion position offset)
                    └── [Planet]PerihelionDurationEcliptic2 (Step 3: Reverse ecliptic precession)
                            └── [Planet]RealPerihelionAtSun (Step 4: Heliocentric orbit setup)
                                    └── [planet]            (Step 5: The actual planet)
```

### What Each Step Does

| Step | Object Name Pattern | Purpose |
|------|---------------------|---------|
| 1 | `[Planet]PerihelionDurationEcliptic1` | Forward perihelion precession (+ω rate) |
| 2 | `[Planet]PerihelionFromEarth` | Geocentric transform (+2π/yr) + perihelion offset |
| 3 | `[Planet]PerihelionDurationEcliptic2` | Reverse perihelion precession (−ω, cancels Step 1) |
| 4 | `[Planet]RealPerihelionAtSun` | Heliocentric orbit frame: inclination tilt, −2π/yr |
| 5 | `[planet]` | The actual planet with size, texture, rotation |

### Properties Displayed Per Step

| Property | Description | Units |
|----------|-------------|-------|
| `name` | Human-readable identifier | string |
| `startPos` | Initial angular position | degrees |
| `speed` | Angular velocity | radians per model year |
| `speed (period)` | Derived orbital period | years |
| `tilt` | Axial tilt | degrees |
| `orbitRadius` | Radius of circular orbit | scene units |
| `orbitCenter` | (a, b, c) offset from parent | scene units |
| `orbitTilt` | (a, b) tilt angles | degrees |

### Accessing the Inspector

1. Open the dat.GUI Settings menu
2. Click "🔍 Inspect Planet Hierarchy"
3. Select a planet from the dropdown
4. Use Prev/Next buttons to navigate steps

### Visual Markers

When Step 4 (RealPerihelionAtSun) is selected:

| Marker | Color | Description |
|--------|-------|-------------|
| Ascending node | Magenta ↑ | Where orbit crosses ecliptic going north |
| Descending node | Cyan ↓ | Where orbit crosses ecliptic going south |
| Highest point | Green ↑ | Maximum north (90° after ascending) |
| Lowest point | Red ↓ | Maximum south (90° after descending) |
| Above-plane region | Green | Portion of orbit above ecliptic |
| Below-plane region | Red | Portion of orbit below ecliptic |

### Code Locations

| Component | Location |
|-----------|----------|
| `hierarchyInspector` state | script.js:3660-3695 |
| `PLANET_HIERARCHIES` registry | script.js:3556-3658 |
| `createVisualHelpers()` | script.js:3875-4300 |
| `updateHierarchyLiveData()` | script.js:5040-5812 |

---

## Invariable Plane Positions Panel

### Purpose

Displays all planets' heights relative to the invariable plane, along with a mass-weighted balance indicator.

### Panel Layout

```
┌─────────────────────────────────────────────┐
│ INVARIABLE PLANE POSITIONS            [−]   │
├─────────────────────────────────────────────┤
│ Mercury    +0.0234 AU   ▲ ABOVE             │
│ Venus      −0.0081 AU   ▼ BELOW             │
│ Earth      −0.0123 AU   ▼ BELOW             │
│ Mars       +0.0312 AU   ▲ ABOVE             │
│ Jupiter    +0.0024 AU   ▲ ABOVE             │
│ Saturn     −0.0051 AU   ▼ BELOW             │
│ Uranus     +0.0083 AU   ▲ ABOVE             │
│ Neptune    −0.0041 AU   ▼ BELOW             │
├─────────────────────────────────────────────┤
│ BALANCE                                     │
│ Above: 4 planets    Below: 4 planets        │
│ Mass-weighted: +0.000012 (balanced)         │
└─────────────────────────────────────────────┘
```

### Mass-Weighted Balance Calculation

The balance is calculated as:

```
Balance = Σ (m_i × z_i) / M_total

Where:
  m_i     = mass of planet i (Earth masses)
  z_i     = height above invariable plane (AU)
  M_total = total mass of all planets
```

### Planet Masses

| Planet | Mass (Earth = 1) | % of Total |
|--------|------------------|------------|
| Mercury | 0.0553 | 0.01% |
| Venus | 0.815 | 0.18% |
| Earth | 1.000 | 0.22% |
| Mars | 0.107 | 0.02% |
| **Jupiter** | **317.8** | **71.14%** |
| **Saturn** | **95.16** | **21.30%** |
| Uranus | 14.54 | 3.25% |
| Neptune | 17.15 | 3.84% |

**Key insight**: Jupiter (71%) and Saturn (21%) dominate. The "balance" is essentially determined by these two gas giants.

### Data Sources

| Property | Source Function |
|----------|-----------------|
| `o.mercuryHeightAboveInvPlane` | `updatePlanetInvariablePlaneHeights()` |
| `o.venusHeightAboveInvPlane` | `updatePlanetInvariablePlaneHeights()` |
| ... | ... |
| `o.massWeightedBalance` | `updateInvariablePlaneBalance()` |

### Coordinate System Notes

Height calculations use **ecliptic-rate ascending nodes** (~20,868 year period) rather than ICRF-rate (~111,296 years). This is necessary because Earth's position (`sun.ra`) is measured in precessing ecliptic coordinates.

---

## Balance Trend Analysis

### Purpose

Tracks the mass-weighted balance over time to validate that the invariable plane is correctly positioned. Over long timescales, the balance should average to approximately zero.

### Panel Layout

```
┌─────────────────────────────────────────────────────┐
│ ▼ Balance Trend Analysis                            │
│   ├── [▶ Start Tracking] / [⏹ Stop Tracking]       │
│   ├── Tracking Active          [toggle]             │
│   ├── Started (year)           2000.5               │
│   ├── Years Tracked            243.6                │
│   ├── Sample Count             245                  │
│   ├── Cumulative Sum           -0.130754            │
│   ├── Lifetime Avg (AU)        -0.000534            │
│   ├── Min Seen (AU)            -0.075274            │
│   ├── Max Seen (AU)            +0.073276            │
│   └── [↺ Reset Tracking]                            │
└─────────────────────────────────────────────────────┘
```

### How to Use

1. **Start Tracking**: Click "▶ Start Tracking" to begin recording samples
2. **Run Simulation**: Advance the simulation (samples once per simulated year)
3. **Monitor Progress**: Aim for 165+ years (one Neptune orbit) for meaningful results
4. **Analyze Results**: "Lifetime Avg (AU)" should converge toward zero
5. **Stop/Reset**: Click "⏹ Stop Tracking" or "↺ Reset Tracking"

### Field Descriptions

| Field | Description |
|-------|-------------|
| **Tracking Active** | Whether tracking is recording samples |
| **Started (year)** | Simulation year when tracking began |
| **Years Tracked** | Total simulated years since start |
| **Sample Count** | Number of yearly samples collected |
| **Cumulative Sum** | Running total of all balance samples |
| **Lifetime Avg (AU)** | **KEY METRIC**: Should converge to ~0 |
| **Min Seen (AU)** | Most negative balance observed |
| **Max Seen (AU)** | Most positive balance observed |

### Interpreting Results

| Metric | Expected Value | Meaning |
|--------|----------------|---------|
| **Lifetime Avg** | ±0.001 AU or smaller | ✅ Plane correctly positioned |
| **Lifetime Avg** | Oscillating around 0 | ✅ Normal behavior |
| **Lifetime Avg** | Steady drift away from 0 | ❌ Possible error |
| **Min/Max Seen** | ±0.07 AU | Normal oscillation range |

### State Variables

```javascript
o.balanceTrackingActive = false;     // Is tracking recording?
o.balanceTrackingStartYear = 0;      // Year when tracking started
o.balanceYearsTracked = 0;           // Duration (years)
o.balanceSampleCount = 0;            // Number of samples
o.balanceCumulativeSum = 0;          // Running sum
o.balanceLifetimeAverage = 0;        // Cumulative / count
o.balanceMinSeen = 0;                // Minimum observed
o.balanceMaxSeen = 0;                // Maximum observed
```

---

## Invariable Plane Balance Explorer

### Purpose

An interactive modal for testing different planetary group assignments and Fibonacci divisors for the Fibonacci Laws of Planetary Motion. Users can experiment with alternative configurations and see instant feedback on inclination balance (Law 3), eccentricity balance (Law 5), Laplace-Lagrange bounds, and ecliptic trend matching.

### Accessing the Explorer

1. Open the dat.GUI Settings menu
2. Expand "Invariable Plane Positions"
3. Click "Invariable Plane Balance Explorer"

### Key Features

| Feature | Description |
|---------|-------------|
| **Phase angle selection** | Choose between model phases (203°/23°), Laplace-Lagrange eigenmodes, or custom angles |
| **Fibonacci divisor dropdown** | Common Fibonacci values (1–55) plus custom input |
| **Editable precession periods** | Modify ascending node precession rates |
| **755 presets** | Pre-computed configurations with ≥99.994% inclination balance |
| **Dual balance display** | Inclination (Law 3) and eccentricity (Law 5) balance percentages |
| **Per-planet results table** | Amplitude, mean, range, LL bounds check, trend comparison |
| **Earth locked** | Earth's parameters (d=3, 203°) are derived from the temperature model and cannot be changed |

### Default Configuration Result

- Inclination balance: **99.9998%**
- Eccentricity balance: **99.88%**
- LL bounds: **8/8 pass**
- Trend directions: **7/7 match**

### Full Reference

See [27 - Balance Explorer Reference](27-balance-explorer-reference.md) for complete documentation including calculation details, all controls, and interpretation guide.

---

## Validation: Angular Momentum Calculation

### Purpose

Validates that the invariable plane orientation calculated from orbital elements matches the published Souami & Souchay (2012) values.

### Displayed Values

| Field | Expected | Description |
|-------|----------|-------------|
| Calc. Tilt (°) | ~1.5787° | Calculated plane tilt from ecliptic |
| Calc. Asc.Node (°) | ~107° | Calculated ascending node |
| Jupiter L (%) | ~60% | Jupiter's angular momentum contribution |
| Saturn L (%) | ~25% | Saturn's angular momentum contribution |
| A vs B Diff (°) | < 0.01° | Difference between calculated and published |

### Calculation Method

The calculation sums mass-weighted angular momentum vectors:

```javascript
L_total = Σ (m_i × √(GM_☉ × a_i × (1 - e_i²))) × n̂_i
```

Where `n̂_i` is the orbital plane normal for each planet.

The tilt is then: `arccos(L_total.y / |L_total|)`

### Achieved Accuracy

| Source | Tilt Value | Error |
|--------|------------|-------|
| Souami & Souchay (2012) | 1.5787° | Reference |
| Our calculation | 1.5786° | 0.0001° (0.36 arcsec) |

This 99.994% accuracy validates that our orbital elements are consistent with published values.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [21 - Planet Inspector Reference](21-planet-inspector-reference.md) | Planet inspector calculations |
| [27 - Balance Explorer Reference](27-balance-explorer-reference.md) | Balance explorer calculations and controls |
| [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) | Height calculation formulas |
| [10 - Constants Reference](10-constants-reference.md) | Planet masses and orbital elements |

---

**Previous**: [21 - Planet Inspector Reference](21-planet-inspector-reference.md)
