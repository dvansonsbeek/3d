# Interactive 3D Solar System Simulation - Architecture Document

**Version:** 2.0
**Date:** 2025-12-29
**Status:** Current Implementation Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Code Architecture](#code-architecture)
6. [State Management](#state-management)
7. [Render Loop Architecture](#render-loop-architecture)
8. [Astronomical Features](#astronomical-features)
9. [GUI Structure](#gui-structure)
10. [Performance Optimizations](#performance-optimizations)
11. [Data Sources](#data-sources)
12. [Key Algorithms](#key-algorithms)
13. [Future Considerations](#future-considerations)

---

## Executive Summary

The Interactive 3D Solar System Simulation is a sophisticated WebGL-based astronomical visualization tool that implements the Holistic Universe Model. It provides accurate planetary positions, precession cycles, and orbital mechanics calculations spanning hundreds of thousands of years.

**Key Statistics:**
- Single monolithic script.js (~21,000 lines)
- 11 celestial bodies with full orbital mechanics
- 50+ astronomical calculation functions
- Real-time 3D visualization at 60 FPS
- Support for date ranges spanning ±50,000 years

**Core Capabilities:**
- Accurate planetary positions using Keplerian orbital mechanics
- Long-term precession cycles (axial, perihelion, inclination)
- Invariable plane visualization and validation
- Multiple calendar systems (Gregorian, Julian, Perihelion)
- Interactive time control with variable speed simulation

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Browser Environment                            │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        Application Layer                           │ │
│  │                                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │ │
│  │  │  UI Controls │  │ Time Engine  │  │     3D Renderer          │ │ │
│  │  │  (dat.GUI)   │  │ (Simulation) │  │     (Three.js)           │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘ │ │
│  │         │                 │                      │                 │ │
│  │         └────────┬────────┴──────────┬───────────┘                 │ │
│  │                  │                   │                             │ │
│  │         ┌────────▼───────────────────▼────────┐                    │ │
│  │         │      Core State Management          │                    │ │
│  │         │      (o: simulation state)          │                    │ │
│  │         └────────┬───────────────────┬────────┘                    │ │
│  │                  │                   │                             │ │
│  │    ┌─────────────▼─────┐    ┌────────▼────────┐                    │ │
│  │    │ Astronomy Library │    │  Planet System  │                    │ │
│  │    │ - Julian Day      │    │  - Orbital Mech │                    │ │
│  │    │ - Coordinates     │    │  - Precession   │                    │ │
│  │    │ - Calendars       │    │  - Positioning  │                    │ │
│  │    │ - OrbitalFormulas │    │  - Invariable   │                    │ │
│  │    └───────────────────┘    └─────────────────┘                    │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                       Foundation Layer                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │ │
│  │  │   Three.js   │  │   dat.GUI    │  │    Parcel    │             │ │
│  │  │   (WebGL)    │  │  (Controls)  │  │  (Bundler)   │             │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Static Assets: Textures (~25MB), Star Data (JSON), Constellation Data   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (GUI/Controls)
    │
    ▼
State Update (o object)
    │
    ├─▶ Time Calculations ──▶ Julian Day / Calendar Conversions
    │
    ├─▶ Orbital Mechanics ──▶ Planet Positions (X, Y, Z)
    │
    ├─▶ Precession Cycles ──▶ Axial/Perihelion/Inclination Angles
    │
    ├─▶ Invariable Plane ──▶ Height calculations / Balance tracking
    │
    ▼
Scene Update (Three.js)
    │
    ├─▶ Mesh Transforms (position, rotation, scale)
    │
    ├─▶ Camera Updates (focus, zoom, orbit controls)
    │
    ├─▶ Lighting & Shadows
    │
    ├─▶ Visual Effects (glows, flares, traces)
    │
    └─▶ Label Updates (CSS2D renderer)
    │
    ▼
WebGL Render (60 FPS target)
```

---

## Project Structure

```
/home/dennis/code/3d/
├── src/
│   ├── index.html              # Entry point (minimal HTML wrapper)
│   ├── script.js               # Main application (~21,000 lines)
│   └── style.css               # GUI and label styling
│
├── public/
│   ├── textures/               # Planetary textures (~25MB total)
│   │   ├── earth/              # Earth day, night, clouds, specular, bump maps
│   │   ├── planets/            # Mercury through Neptune textures
│   │   ├── sun/                # Solar surface texture
│   │   ├── moon/               # Lunar surface texture
│   │   └── skybox/             # Background starfield
│   │
│   └── input/
│       ├── constellations.json # 88 IAU constellation line patterns
│       └── stars.json          # Yale Bright Star Catalog (~9,000 stars)
│
├── dist/                       # Parcel production build output
│
├── docs/
│   ├── architecture.md         # This document
│   ├── orbital-formulas.md     # Mathematical reference
│   ├── invariable-plane-positions-panel.md
│   ├── invariable-plane-dynamic-calculation.md
│   └── hidden/                 # Development documentation
│       ├── todo/               # Feature specifications
│       └── ...
│
├── package.json                # Dependencies and scripts
├── .gitignore
└── README.md
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **3D Engine** | Three.js | ^0.175.0 | WebGL rendering, scene management |
| **UI Controls** | dat.GUI | ^0.7.9 | Parameter control panels |
| **Bundler** | Parcel | ^2.16.3 | Build system, dev server, HMR |
| **Language** | JavaScript | ES2021 | Application logic |
| **Rendering** | WebGL 2.0 | - | Hardware-accelerated graphics |
| **Labels** | CSS2DRenderer | Three.js | HTML labels in 3D space |
| **Performance** | Stats.js | - | FPS monitoring |

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGL 2.0 | ✅ 56+ | ✅ 51+ | ✅ 15+ | ✅ 79+ |
| ES6 Modules | ✅ 61+ | ✅ 60+ | ✅ 11+ | ✅ 79+ |
| ResizeObserver | ✅ 64+ | ✅ 69+ | ✅ 13.1+ | ✅ 79+ |

---

## Code Architecture

### script.js Organization

The monolithic script.js is organized into logical sections:

```
┌─────────────────────────────────────────────────────────────────────┐
│  SECTION 1: INPUT CONSTANTS (Lines 16-280)                          │
│  - Holistic Year parameters (298,176-year cycle)                    │
│  - Earth orbital parameters (tilt, eccentricity, precession)        │
│  - All planet orbital elements (Mercury through Neptune)            │
│  - Moon parameters (sidereal, anomalistic, nodal months)            │
│  - Physical constants (diameters, masses, distances)                │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 2: CALCULATED CONSTANTS (Lines 283-440)                    │
│  - Derived orbital parameters (Kepler's 3rd Law)                    │
│  - Gravitational parameters (GM values)                             │
│  - Mean motion calculations                                         │
│  - Precession period derivations                                    │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 3: ORBITAL FORMULAS LIBRARY (Lines 443-1010)               │
│  - OrbitalFormulas object with 50+ methods                          │
│  - Kepler equation solver                                           │
│  - Anomaly conversions (mean, eccentric, true)                      │
│  - Velocity calculations                                            │
│  - Perturbation theory (Lagrange-Laplace)                          │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 4: ASTRONOMICAL FUNCTIONS (Lines 1010-3500)                │
│  - Julian Day conversions                                           │
│  - Calendar systems (Gregorian, Julian, Perihelion)                 │
│  - Coordinate transforms (Equatorial ↔ Ecliptic)                    │
│  - Solstice/Equinox detection                                       │
│  - RA/Dec calculations                                              │
│  - Elongation calculations                                          │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 5: STATE OBJECT (Lines 3550-3870)                          │
│  - Global state object 'o' definition                               │
│  - All simulation parameters                                        │
│  - GUI-bound values                                                 │
│  - Live calculation results                                         │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 6: THREE.JS SCENE SETUP (Lines 3956-5600)                  │
│  - Renderer initialization (WebGL, shadows, tone mapping)           │
│  - Camera setup (perspective, orbit controls)                       │
│  - Lighting (ambient, directional, point lights)                    │
│  - Planet mesh creation                                             │
│  - Starfield and constellation rendering                            │
│  - Visual effects (glows, rings, traces)                           │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 7: PLANET SYSTEMS (Lines 5600-9500)                        │
│  - Individual planet setup (Earth, Moon, all planets)               │
│  - Orbit visualization                                              │
│  - Invariable plane system                                          │
│  - Hierarchy inspector                                              │
│  - Trace path rendering                                             │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 8: GUI SETUP (Lines 9766-10388)                            │
│  - dat.GUI folder structure                                         │
│  - Control bindings                                                 │
│  - Event handlers                                                   │
│  - Prediction displays                                              │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 9: RENDER LOOP (Lines 10392-10572)                         │
│  - Main animation frame callback                                    │
│  - Throttled update cycles                                          │
│  - Performance monitoring                                           │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 10: UPDATE FUNCTIONS (Lines 10572-21000)                   │
│  - Position update functions                                        │
│  - Precession calculations                                          │
│  - Invariable plane updates                                         │
│  - Balance trend analysis                                           │
│  - Export functions                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Objects and Namespaces

| Object | Purpose | Key Methods/Properties |
|--------|---------|----------------------|
| `o` | Global state | All simulation state, GUI bindings |
| `OrbitalFormulas` | Astronomy library | 50+ orbital mechanics functions |
| `scene` | Three.js scene | Root of 3D scene graph |
| `camera` | Perspective camera | View frustum, position |
| `renderer` | WebGL renderer | Render settings, shadow maps |
| `controls` | OrbitControls | Camera interaction |
| `gui` | dat.GUI instance | All control panels |

---

## State Management

### The `o` State Object

The global state object `o` contains all simulation state:

```javascript
const o = {
  // ═══════════════════════════════════════════════════════════════
  // TIME & SIMULATION CONTROL
  // ═══════════════════════════════════════════════════════════════
  pos: 0,                        // Current position in time (days from epoch)
  runIt: false,                  // Simulation running flag
  speed: 1,                      // Speed multiplier (-5 to +5)
  timeUnit: 'sDay',              // Time unit per second

  // ═══════════════════════════════════════════════════════════════
  // DATE/TIME DISPLAY
  // ═══════════════════════════════════════════════════════════════
  Date: "2025-01-01",            // Current date string (GUI bound)
  Time: "00:00:00",              // Current time string (GUI bound)
  julianDay: 2451545.0,          // Julian Day Number
  currentYear: 2025,             // Decimal year

  // ═══════════════════════════════════════════════════════════════
  // EARTH ORBITAL PARAMETERS (Live Calculated)
  // ═══════════════════════════════════════════════════════════════
  eccentricityEarth: 0.0167,     // Current orbital eccentricity
  obliquityEarth: 23.44,         // Current axial tilt (degrees)
  earthInvPlaneInclinationDynamic: 1.57,  // Inclination to invariable plane
  longitudeOfPerihelion: 102.9,  // Longitude of perihelion (degrees)

  // ═══════════════════════════════════════════════════════════════
  // PLANET ANOMALIES (Per-planet calculations)
  // ═══════════════════════════════════════════════════════════════
  mercuryMeanAnomaly: 0,         mercuryTrueAnomaly: 0,
  venusMeanAnomaly: 0,           venusTrueAnomaly: 0,
  earthMeanAnomaly: 0,           earthTrueAnomaly: 0,
  marsMeanAnomaly: 0,            marsTrueAnomaly: 0,
  jupiterMeanAnomaly: 0,         jupiterTrueAnomaly: 0,
  saturnMeanAnomaly: 0,          saturnTrueAnomaly: 0,
  uranusMeanAnomaly: 0,          uranusTrueAnomaly: 0,
  neptuneMeanAnomaly: 0,         neptuneTrueAnomaly: 0,

  // ═══════════════════════════════════════════════════════════════
  // INVARIABLE PLANE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  mercuryHeightAboveInvPlane: 0,
  venusHeightAboveInvPlane: 0,
  earthHeightAboveInvPlane: 0,
  // ... all planets ...
  massWeightedBalance: 0,        // Mass-weighted height balance
  planetsAboveInvPlane: 0,       // Count above plane
  planetsBelowInvPlane: 0,       // Count below plane

  // ═══════════════════════════════════════════════════════════════
  // BALANCE TREND ANALYSIS
  // ═══════════════════════════════════════════════════════════════
  balanceTrackingActive: false,
  balanceTrackingStartYear: 0,
  balanceYearsTracked: 0,
  balanceSampleCount: 0,
  balanceCumulativeSum: 0,
  balanceLifetimeAverage: 0,
  balanceMinSeen: 0,
  balanceMaxSeen: 0,

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION (Option A vs B)
  // ═══════════════════════════════════════════════════════════════
  calculatedPlaneTilt: 0,
  calculatedAscendingNode: 0,
  jupiterAngularMomentumPercent: 0,
  saturnAngularMomentumPercent: 0,
  optionABDifference: 0,

  // ═══════════════════════════════════════════════════════════════
  // VISUAL SETTINGS
  // ═══════════════════════════════════════════════════════════════
  showOrbits: true,
  showStars: true,
  showConstellations: false,
  showInvariablePlane: true,
  sizeBoost: 0.5,                // Planet size multiplier

  // ... additional properties ...
};
```

### State Update Flow

```
GUI Input Change
    │
    ▼
dat.GUI onChange callback
    │
    ▼
Update o.property
    │
    ▼
Trigger dependent calculations (if any)
    │
    ▼
Render loop picks up changes
    │
    ▼
Update 3D scene accordingly
```

---

## Render Loop Architecture

### Hierarchical Throttling System

The render loop uses multiple update frequencies to balance responsiveness with performance:

```javascript
function render() {
  requestAnimationFrame(render);

  const delta = clock.getDelta();

  // ═══════════════════════════════════════════════════════════════
  // EVERY FRAME (60 FPS)
  // ═══════════════════════════════════════════════════════════════
  // - Delta time calculation
  // - FPS monitoring
  // - Adaptive quality scaling
  // - Camera movement detection
  // - OrbitControls update
  // - Three.js render call

  // ═══════════════════════════════════════════════════════════════
  // UI UPDATES (20 Hz / 50ms)
  // ═══════════════════════════════════════════════════════════════
  uiElapsed += delta;
  if (uiElapsed >= 0.05) {
    uiElapsed = 0;
    // - Date/Time string updates
    // - Julian Day display
    // - Camera position display
  }

  // ═══════════════════════════════════════════════════════════════
  // HEAVY ASTRONOMY (10 Hz / 100ms)
  // ═══════════════════════════════════════════════════════════════
  astroElapsed += delta;
  if (astroElapsed >= 0.1) {
    astroElapsed = 0;
    // - Ascending node updates
    // - Planet anomaly calculations
    // - Invariable plane heights
    // - Dynamic inclinations
    // - Balance trend analysis
    // - Angular momentum validation
  }

  // ═══════════════════════════════════════════════════════════════
  // VISUAL EFFECTS (30 Hz / 33ms)
  // ═══════════════════════════════════════════════════════════════
  visualElapsed += delta;
  if (visualElapsed >= 0.033) {
    visualElapsed = 0;
    // - Lighting updates for focus
    // - Lens flare updates
  }

  // ═══════════════════════════════════════════════════════════════
  // DOM LABELS (5 Hz / 200ms)
  // ═══════════════════════════════════════════════════════════════
  labelElapsed += delta;
  if (labelElapsed >= 0.2) {
    labelElapsed = 0;
    // - CSS2D label position updates
  }
}
```

### Update Function Call Order

Critical ordering for dependent calculations:

```
1. updateAscendingNodes()           // Orbital plane intersections
       ↓
2. updatePlanetAnomalies()          // Mean/True anomaly for all planets
       ↓
3. updatePlanetInvariablePlaneHeights()  // Height above/below plane
       ↓
4. updateDynamicInclinations()      // Apparent inclination to ecliptic
       ↓
5. updateInvariablePlaneBalance()   // Mass-weighted balance calculation
       ↓
6. updateBalanceTrendAnalysis()     // Yearly samples when tracking
       ↓
7. updateBalanceMinMax()            // Min/max every frame
       ↓
8. calculateInvariablePlaneFromAngularMomentum()  // Option A validation
```

---

## Astronomical Features

### Implemented Orbital Mechanics

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Keplerian Orbits** | Elliptical orbits using 6 orbital elements | `OrbitalFormulas.keplerSolve()` |
| **True Anomaly** | Actual position in orbit | Newton-Raphson iteration |
| **Heliocentric Positions** | 3D coordinates relative to Sun | Spherical → Cartesian transform |
| **Orbital Velocity** | Speed at any point in orbit | Vis-viva equation |

### Precession Cycles

| Cycle | Period | Description |
|-------|--------|-------------|
| **Axial Precession** | ~22,937 years | Earth's rotational axis wobble |
| **Perihelion Precession** | ~99,392 years | Closest approach point shifts |
| **Inclination Precession** | ~99,392 years | Orbital plane tilt variation |
| **Obliquity Cycle** | ~41,000 years | Axial tilt oscillation (22.1° - 24.5°) |
| **Eccentricity Cycle** | ~413,000 years | Orbital shape variation |

### Invariable Plane System

The invariable plane is perpendicular to the total angular momentum of the solar system:

```
Features:
├── Visual plane representation (semi-transparent disc)
├── Planet height calculations (above/below plane)
├── Mass-weighted balance indicator
├── Balance trend analysis (long-term tracking)
├── Option A vs B validation
│   ├── Option A: Dynamic calculation from angular momentum
│   └── Option B: Souami & Souchay 2012 orbital elements
└── Angular momentum contribution display (Jupiter ~60%, Saturn ~25%)
```

### Celestial Bodies

| Body | Type | Orbital Elements | Special Features |
|------|------|------------------|------------------|
| Sun | Star | Fixed at origin | Lens flare, glow |
| Mercury | Planet | Full Keplerian | Perihelion precession demo |
| Venus | Planet | Full Keplerian | Retrograde rotation |
| Earth | Planet | Full Keplerian | Clouds, atmosphere shader, axial tilt |
| Moon | Satellite | Earth-centered | Apsidal/nodal precession |
| Mars | Planet | Full Keplerian | Two moons (visual) |
| Jupiter | Planet | Full Keplerian | Great Red Spot texture |
| Saturn | Planet | Full Keplerian | Ring system |
| Uranus | Planet | Full Keplerian | Extreme axial tilt |
| Neptune | Planet | Full Keplerian | - |
| Pluto | Dwarf | Full Keplerian | Optional visibility |
| Halley's Comet | Comet | Full Keplerian | Optional, 76-year orbit |
| Eros (433) | Asteroid | Full Keplerian | Optional |

---

## GUI Structure

### Main Panel Organization

```
dat.GUI Root (300px width)
│
├─ Date Input                    [Y-M-D picker]
├─ Time Input                    [HH:MM:SS]
├─ Julian Day                    [numeric]
├─ Perihelion Date               [read-only display]
│
├─▼ Simulation Controls
│  ├─ Run                        [toggle]
│  ├─ 1 second equals            [dropdown: sDay → 1000 years]
│  ├─ Speed                      [slider: -5 to +5]
│  ├─ Step Forward               [button]
│  ├─ Step Backward              [button]
│  ├─ Reset                      [button]
│  ├─ Now                        [button]
│  ├─ Enable Tracing             [toggle]
│  │  └─▼ Trace Selection
│  │     ├─ Mercury              [checkbox]
│  │     ├─ Venus                [checkbox]
│  │     └─ ... all planets
│  └─ Look At                    [planet dropdown]
│
├─▼ Predictions: Holistic Universe Model
│  ├─▼ Length of Days
│  ├─▼ Solar Year
│  ├─▼ Sidereal Year
│  ├─▼ Anomalistic Year
│  ├─▼ Precession Cycles
│  └─▼ Orbital Elements
│
├─▼ Invariable Plane Positions
│  ├─ Mercury (AU)               [live value]
│  ├─ Venus (AU)                 [live value]
│  ├─ ... all planets
│  ├─ Mass Balance (AU)          [live value]
│  ├─ Planets Above              [count]
│  ├─ Planets Below              [count]
│  │
│  ├─▼ Validate position (Option A vs B)
│  │  ├─ Calc. Tilt (°)          [~1.5787°]
│  │  ├─ Calc. Asc.Node (°)      [~107°]
│  │  ├─ Jupiter L (%)           [~60%]
│  │  ├─ Saturn L (%)            [~25%]
│  │  └─ A vs B Diff (°)         [<0.1°]
│  │
│  └─▼ Balance Trend Analysis
│     ├─ Start/Stop Tracking     [button]
│     ├─ Tracking Active         [toggle]
│     ├─ Started (year)          [value]
│     ├─ Years Tracked           [value]
│     ├─ Sample Count            [value]
│     ├─ Cumulative Sum          [value]
│     ├─ Lifetime Avg (AU)       [KEY METRIC]
│     ├─ Min Seen (AU)           [value]
│     ├─ Max Seen (AU)           [value]
│     └─ Reset Tracking          [button]
│
└─▼ Settings
   ├─ Planet Inspector           [button]
   ├─ Planet Size                [slider]
   ├─ Show Orbits                [toggle]
   ├─ Show Stars                 [toggle]
   ├─ Show Constellations        [toggle]
   └─ ... visual options
```

---

## Performance Optimizations

### Implemented Strategies

| Strategy | Implementation | Benefit |
|----------|---------------|---------|
| **Adaptive Quality** | Reduce pixel ratio when FPS < 30 | Maintains responsiveness |
| **Throttled Updates** | Different Hz for UI/Astronomy/Effects | Reduces CPU load |
| **Object Pooling** | Pre-allocated Vector3/Matrix4 | Avoids GC pressure |
| **Geometry Reuse** | Shared sphere geometry, scaled per planet | Reduces memory |
| **Visibility Culling** | Optional bodies can be hidden | Reduces draw calls |
| **Label Throttling** | DOM updates at 5 Hz | Reduces layout thrashing |

### Performance Budgets

| Metric | Target | Actual |
|--------|--------|--------|
| FPS (Desktop) | 60 | 60 ✅ |
| FPS (Mobile) | 30 | ~25 ⚠ |
| Initial Load | <3s | ~2.5s ✅ |
| Bundle Size | <3MB | ~2.7MB ✅ |
| Memory (Desktop) | <500MB | ~400MB ✅ |

---

## Data Sources

### Static Data Files

| File | Size | Contents |
|------|------|----------|
| `stars.json` | ~2MB | Yale Bright Star Catalog (~9,000 entries) |
| `constellations.json` | ~100KB | 88 IAU constellation line patterns |
| `textures/` | ~25MB | Planetary surface textures (2K-4K) |

### Embedded Constants

All orbital elements are embedded in script.js from authoritative sources:

- **JPL Horizons** - Planetary ephemerides (J2000 epoch)
- **Souami & Souchay 2012** - Invariable plane parameters
- **NASA Planetary Fact Sheet** - Physical constants
- **Holistic Universe Model** - Long-term cycle parameters

### No External APIs

The application is fully self-contained with no runtime API dependencies. All calculations are deterministic based on the input time.

---

## Key Algorithms

### Kepler Equation Solver

```javascript
// Newton-Raphson iteration for eccentric anomaly
function keplerSolve(M, e, tolerance = 1e-8) {
  let E = M; // Initial guess
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}
```

### True Anomaly from Eccentric Anomaly

```javascript
function trueAnomalyFromEccentric(E, e) {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}
```

### Height Above Invariable Plane

```javascript
function calculateHeightAboveInvPlane(position, invPlaneNormal) {
  // Dot product gives signed distance from plane
  return position.dot(invPlaneNormal);
}
```

### Mass-Weighted Balance

```javascript
function calculateMassWeightedBalance() {
  let weightedSum = 0;
  const planets = ['mercury', 'venus', 'earth', 'mars',
                   'jupiter', 'saturn', 'uranus', 'neptune'];

  for (const planet of planets) {
    const height = o[`${planet}HeightAboveInvPlane`];
    const mass = PLANET_MASSES[planet];
    weightedSum += mass * height;
  }

  return weightedSum / TOTAL_PLANET_MASS;
}
```

---

## Future Considerations

### Potential Improvements

1. **Modularization** - Split monolithic script.js into ES6 modules
2. **TypeScript** - Add type safety for orbital parameters
3. **Testing** - Unit tests for astronomical calculations
4. **Web Workers** - Offload heavy calculations from main thread
5. **Texture Compression** - Use KTX2 for smaller downloads
6. **Code Splitting** - Lazy load optional celestial bodies

### Known Limitations

1. **Mobile Performance** - FPS drops below 30 on some devices
2. **Memory Usage** - High-resolution textures consume ~400MB
3. **No Persistence** - State is lost on page refresh
4. **Single Thread** - All calculations on main thread

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-01 | Winston (Architect) | Initial proposal for refactoring |
| 2.0 | 2025-12-29 | Claude (Opus 4.5) | Complete rewrite documenting actual implementation |

---

## References

1. **Three.js Documentation** - https://threejs.org/docs/
2. **dat.GUI** - https://github.com/dataarts/dat.gui
3. **Meeus, Jean** - "Astronomical Algorithms" (1998)
4. **Souami & Souchay** - "The solar system's invariable plane" (2012)
5. **NASA JPL Horizons** - https://ssd.jpl.nasa.gov/horizons/
6. **Holistic Universe Model** - https://www.holisticuniverse.com
