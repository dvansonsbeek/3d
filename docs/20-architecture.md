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
- Single monolithic script.js (~30,000 lines)
- 13 celestial bodies with full orbital mechanics
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
│  │  │ (Tweakpane)  │  │ (Simulation) │  │     (Three.js)           │ │ │
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
│  │  │   Three.js   │  │  Tweakpane   │  │    Parcel    │             │ │
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
│   ├── script.js               # Main application (~30,000 lines)
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
| **UI Controls** | Tweakpane | ^4.0.5 | Parameter control panels |
| **Bundler** | Parcel | ^2.16.4 | Build system, dev server, HMR |
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
│  SECTION 1: INPUT CONSTANTS (Lines 17-801)                          │
│  - Holistic Year parameters (333,888-year cycle)                    │
│  - Earth orbital parameters (tilt, eccentricity, precession)        │
│  - All planet orbital elements (Mercury through Neptune)            │
│  - Moon parameters (sidereal, anomalistic, nodal months)            │
│  - Physical constants (diameters, masses, distances, GM values)     │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 2: ORBITAL FORMULAS LIBRARY (Lines 804-1359)               │
│  - OrbitalFormulas object with 50+ methods                          │
│  - Kepler equation solver                                           │
│  - Anomaly conversions (mean, eccentric, true)                      │
│  - Velocity calculations, Laplace coefficients                      │
│  - Frame conversion (Ecliptic ↔ ICRF)                               │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 3: DERIVED VALUES (Lines 1361-1829)                        │
│  - Derived orbital parameters (Kepler's 3rd Law)                    │
│  - Mean motion calculations                                         │
│  - Precession period derivations                                    │
│  - Julian Day conversions, calendar systems                         │
│  - Coordinate transforms (Equatorial ↔ Ecliptic)                    │
│  - Solstice/Equinox detection, RA/Dec calculations                  │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 4: OBJECT DEFINITIONS (Lines 1834-3708)                    │
│  - Data objects for every celestial body and helper                  │
│  - Planet hierarchical precession layers                             │
│  - Moon precession layers                                           │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 5: MASTER ARRAYS & SCENE SETUP (Lines 3713-4624)           │
│  - planetObjects / tracePlanets arrays                               │
│  - Global state object 'o' definition (~line 3900)                  │
│  - Renderer initialization (WebGL, shadows, tone mapping)           │
│  - Camera setup (perspective, orbit controls)                       │
│  - createPlanet calls and hierarchy wiring (.add() calls)           │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 6: PLANET SYSTEMS & VISUAL EFFECTS (Lines 4625-11854)      │
│  - Orbit visualization, starfield, constellations                   │
│  - Invariable plane system and hierarchy inspector                  │
│  - Trace path rendering, visual effects                             │
│  - Export functions (solstice, year analysis, bulk, planet reports)  │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 7: GUI SETUP (Lines 11855-12818)                           │
│  - Tweakpane folder structure (addFolder/addBinding/addButton)      │
│  - Control bindings and event handlers                              │
│  - Prediction displays                                              │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 8: RENDER LOOP (Lines 12838-13025)                         │
│  - Main animation frame callback                                    │
│  - Throttled update cycles (20/10/5/30 Hz)                          │
│  - Performance monitoring                                           │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 9: UPDATE & CALCULATION FUNCTIONS (Lines 13026-29992)      │
│  - Position update functions (moveModel, updatePositions)           │
│  - Precession calculations (obliquity, inclination, dynamic)        │
│  - Invariable plane updates and balance trend analysis              │
│  - createPlanet function                                            │
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
| `gui` | Tweakpane instance | All control panels |

---

## State Management

### The `o` State Object

The global state object `o` contains all simulation state:

```javascript
let o = {
  // ═══════════════════════════════════════════════════════════════
  // TIME & SIMULATION CONTROL
  // ═══════════════════════════════════════════════════════════════
  pos: 0,                        // Current position in time (years from epoch)
  Run: false,                    // Simulation running flag
  speed: 1,                      // Speed multiplier (-5 to +5)

  // ═══════════════════════════════════════════════════════════════
  // DATE/TIME DISPLAY
  // ═══════════════════════════════════════════════════════════════
  Date: "",                      // Current date string (set dynamically)
  Time: "00:00:00",              // Current time string (GUI bound)
  julianDay: "",                 // Julian Day Number (set dynamically)

  // ═══════════════════════════════════════════════════════════════
  // EARTH ORBITAL PARAMETERS (computed at runtime by updatePredictions)
  // ═══════════════════════════════════════════════════════════════
  eccentricityEarth: 0,          // Current orbital eccentricity
  obliquityEarth: 0,             // Current axial tilt (degrees)
  earthInvPlaneInclinationDynamic: 0,  // Inclination to invariable plane

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

  // ... additional properties ...
};

// Visual settings are on a separate params object:
const params = { sizeBoost: 0 };   // Planet size multiplier
```

### State Update Flow

```
GUI Input Change
    │
    ▼
Tweakpane onChange callback
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
  // POSITION TRACKING (10 Hz / 100ms) — second 10Hz block
  // ═══════════════════════════════════════════════════════════════
  posElapsed += delta;
  if (posElapsed >= 0.1) {
    posElapsed = 0;
    // - updateElongations()
    // - updatePerihelion()
    // - updateOrbitOrientations()
    // - golden.update()
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
  // LIGHTING & GLOW (10 Hz / 100ms) — third 10Hz block
  // ═══════════════════════════════════════════════════════════════
  lightElapsed += delta;
  if (lightElapsed >= 0.1) {
    lightElapsed = 0;
    // - updateFocusRing()
    // - animateGlow()
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
1. updatePredictions()                          // Year lengths, precession, obliquity
       ↓
2. updateAscendingNodes()                       // Orbital plane intersections
       ↓
3. updatePlanetAnomalies()                      // Mean/True anomaly for all planets
       ↓
4. updatePlanetInvariablePlaneHeights()         // Height above/below plane
       ↓
5. updateDynamicInclinations()                  // Planet inclination oscillations
       ↓
6. updateInvariablePlaneBalance()               // Mass-weighted balance calculation
       ↓
7. updateBalanceTrendAnalysis()                 // Yearly samples when tracking
       ↓
8. updateBalanceMinMax()                        // Min/max every frame
       ↓
9. calculateInvariablePlaneFromAngularMomentum()  // Option A validation
       ↓
10. updateHierarchyLiveData()                    // Live hierarchy inspector
       ↓
11. updateInclinationPathMarker()                // Inclination visualization
       ↓
12. updateInvariablePlanePosition()              // Invariable plane scene object
       ↓
13. updateSunCenteredInvPlane()                  // Sun-centered invariable plane
```

---

## Astronomical Features

### Implemented Orbital Mechanics

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Keplerian Orbits** | Elliptical orbits using 6 orbital elements | `OrbitalFormulas.eccentricAnomaly()` |
| **True Anomaly** | Actual position in orbit | Newton-Raphson iteration |
| **Heliocentric Positions** | 3D coordinates relative to Sun | Spherical → Cartesian transform |
| **Orbital Velocity** | Speed at any point in orbit | Vis-viva equation |

### Precession Cycles

| Cycle | Period | Description |
|-------|--------|-------------|
| **Axial Precession** | ~25,684 years | Earth's rotational axis wobble |
| **Perihelion Precession** | ~111,296 years | Closest approach point shifts |
| **Inclination Precession** | ~111,296 years | Orbital plane tilt variation |
| **Obliquity Cycle** | ~41,736 years | Axial tilt oscillation (22.1° - 24.5°) |
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
| Mars | Planet | Full Keplerian | - |
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

The GUI is built with Tweakpane v4, using `addBinding()` for data-bound controls,
`addButton()` for actions, and `addFolder()` for collapsible sections.

```
Tweakpane Root ("Fibonacci Laws of Planetary Motion")
│
├─▼ About                          (collapsed)
│  ├─▼ The Six Laws               (custom DOM, full-width)
│  ├─▼ Free Parameters (6 DOF)    (0 DOF items dimmed)
│  ├─▼ Calibration Inputs (20)    (from ASTRO_REFERENCE)
│  ├─▼ Model Parameters (125)     (Earth 25, Moon 9, 7 planets × 13)
│  └─ Website link                (holisticuniverse.com)
│
├─ Date                          [binding: text input]
├─ Time                          [binding: text input]
├─ JD                            [binding: numeric]
├─ Perihelion Date               [binding: read-only display]
│
├─▼ Simulation Controls
│  ├─ Run                        [binding: toggle]
│  ├─ 1 second equals            [binding: dropdown]
│  ├─ Speed                      [binding: slider -5 to +5]
│  ├─ Step Forward               [button]
│  ├─ Step Backward              [button]
│  ├─ Reset                      [button]
│  ├─ Now                        [button]
│  ├─ Enable Tracing             [binding: toggle]
│  │  └─▼ Trace Selection
│  │     ├─ Mercury              [binding: checkbox]
│  │     ├─ Venus                [binding: checkbox]
│  │     └─ ... all planets
│  └─ Look At                    [binding: planet dropdown]
│
├─▼ Model Predictions               (compact inline Δ format, 1 row per prediction)
│  ├─ Day Lengths                Model value  Δ IAU (inline)
│  ├─ Solar Year                 Model value  Δ IAU (inline)
│  ├─ Sidereal Year              Model value  Δ IAU (inline)
│  ├─ Anomalistic Year           Model value  Δ IAU (inline)
│  ├─ Precession Periods         Model value  Δ IAU (inline)
│  └─ Orbital Elements           Model value  Δ ref (inline)
│
├─▼ Observed Positions               (3D scene measurements)
│  ├─▼ Perihelion Angles          Geocentric / Heliocentric pairs
│  ├─▼ Elongations
│  ├─▼ [Planet subfolders]        RA, Dec, distances
│  ├─▼ Helper Objects
│  └─▼ Invariable Plane Analysis
│     ├─ Balance Explorer           [button]
│     ├─ Mercury–Neptune (AU)       [live values]
│     ├─ Mass Balance (AU)          [live value]
│     ├─ Planets Above / Below      [counts]
│     │
│     ├─▼ Validate position (Option A vs B)
│     │  ├─ Calc. Tilt (°)          [~1.5787°]
│     │  ├─ Calc. Asc.Node (°)      [~107°]
│     │  ├─ Jupiter L (%)           [~60%]
│     │  ├─ Saturn L (%)            [~25%]
│     │  └─ A vs B Diff (°)         [<0.1°]
│     │
│     └─▼ Balance Trend Analysis
│        ├─ Start/Stop Tracking     [button]
│        ├─ Tracking Active         [binding: toggle]
│        ├─ Started (year)          [binding: value]
│        ├─ Years Tracked           [binding: value]
│        ├─ Sample Count            [binding: value]
│        ├─ Cumulative Sum          [binding: value]
│        ├─ Lifetime Avg (AU)       [KEY METRIC]
│        ├─ Min Seen (AU)           [binding: value]
│        ├─ Max Seen (AU)           [binding: value]
│        └─ Reset Tracking          [button]
│
├─▼ Visualization                    (visual toggles)
│  ├─ Zodiac                     [binding: toggle]
│  ├─ Stars                      [binding: toggle]
│  ├─ Constellations             [binding: toggle]
│  ├─ Celestial Sphere           [binding: toggle]
│  ├─ Ecliptic                   [binding: toggle]
│  ├─ Invariable Plane           [binding: toggle]
│  ├─▼ Tracing                  (chip-grid toggles by planet)
│  └─▼ Show / Hide              (chip-grid toggles by planet)
│
├─▼ Reports                       [observed category]
│  ├─▼ Planet Positions & Orbits
│  ├─▼ Solstices & Equinoxes
│  └─▼ Year Length Analysis
│
└─▼ Tools
   ├─ Planet Inspector           [button]
   ├─ Invariable Plane Inspector [button]
   ├─▼ Console Tests (F12)       (buttons, not toggles)
   ├─▼ Camera
   └─▼ Debug
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

### Kepler Equation Solver (`OrbitalFormulas.eccentricAnomaly`, line 809)

```javascript
// Newton-Raphson iteration for eccentric anomaly
// Input: M in degrees, e (eccentricity)
// Output: E in degrees
eccentricAnomaly: (M_deg, e) => {
  const M = M_deg * Math.PI / 180;
  let E = M; // Initial guess
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E * 180 / Math.PI;
},
```

### True Anomaly (`updatePlanetAnomalies`, line ~26774)

True anomaly is computed geometrically from world-space positions using `atan2`, not from the eccentric anomaly. The function reads each planet's 3D position relative to the Sun and computes the angular position directly.

### Height Above Invariable Plane (`updatePlanetInvariablePlaneHeights`)

Height is calculated inside `updatePlanetInvariablePlaneHeights()` using dot product of the planet's world position vector with the invariable plane normal.

### Mass-Weighted Balance (`updateInvariablePlaneBalance`)

The balance calculation lives inside `updateInvariablePlaneBalance()`, summing `mass × height` for all 8 planets and dividing by total mass.

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
2. **Tweakpane v4** - https://tweakpane.github.io/docs/
3. **Meeus, Jean** - "Astronomical Algorithms" (1998)
4. **Souami & Souchay** - "The solar system's invariable plane" (2012)
5. **NASA JPL Horizons** - https://ssd.jpl.nasa.gov/horizons/
6. **Holistic Universe Model** - https://www.holisticuniverse.com
