# Interactive 3D Solar System Simulation - Architecture Document

**Version:** 2.1
**Date:** 2026-03-05
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
- Single monolithic script.js (~32,700 lines)
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
│   ├── script.js               # Main application (~43,000 lines)
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
│       ├── model-parameters.json      # Model constants (H, Earth params, planet configs)
│       ├── astro-reference.json       # IAU/JPL reference values (J2000 elements, periods)
│       ├── fitted-coefficients.json   # Pipeline output (harmonics, parallax, corrections)
│       ├── meeus-lunar-tables.json    # Meeus Ch.47 lunar correction tables
│       ├── constellations.json        # 88 IAU constellation line patterns
│       └── stars.json                 # Yale Bright Star Catalog (~9,000 stars)
│
├── data/
│   ├── 01-holistic-year-objects-data.xlsx  # Full H export (perihelion, precession)
│   ├── 02-solar-measurements.csv          # Cardinal points, year lengths (full H)
│   ├── reference-data.json                # JPL-enriched verification data
│   └── balance-presets.json               # 743 balance configurations
│
├── tools/
│   ├── fit/                    # Pipeline fitting scripts (Steps 1-9)
│   ├── verify/                 # Law verification and balance analysis
│   ├── explore/                # Exploratory analysis scripts
│   ├── lib/                    # Shared libraries (constants, scene-graph, orbital-engine)
│   └── results/                # Baseline values and pipeline logs
│
├── docs/                       # Documentation (docs 00-71)
│
├── package.json                # Dependencies and scripts
├── .gitignore
└── README.md
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **3D Engine** | Three.js | ^0.183.0 | WebGL rendering, scene management |
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

The monolithic script.js (~43,000 lines) is organized into logical sections. Constants are grouped by source file (A = model-parameters.json, B = fitted-coefficients.json, C = astro-reference.json, D = meeus-lunar-tables.json, E = derived, F = display-only).

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSTANTS & FORMULAS (Lines 17-2078)                               │
│  A. Model parameters: H, Earth params, Moon, planet configs         │
│  B. Fitted coefficients: year harmonics, predictive formula (429    │
│     terms × 7 planets), parallax/gravitation/elongation corrections,│
│     obliquity & cardinal point harmonics, balance presets           │
│  C. Astro references: J2000 elements, body diameters, inclination  │
│     reference data, ASTRO_REFERENCE object                          │
│  D. Moon Meeus tables (Ch.47 lunar corrections)                     │
│  E. Derived constants: year lengths, precession periods, mass       │
│     fractions, planet inclinations (Fibonacci Laws)                 │
│  E3. OrbitalFormulas library (50+ methods: Kepler solver, anomaly   │
│     conversions, frame transforms, Laplace coefficients)            │
│  F. Display-only constants                                          │
├─────────────────────────────────────────────────────────────────────┤
│  OBJECT DEFINITIONS (Lines ~2082-4550)                              │
│  - Data objects for every celestial body (Type I/II/III)            │
│  - Planet hierarchical precession layers                            │
│  - Moon precession layers                                           │
│  - Obliquity cycles, planet parallax corrections                    │
├─────────────────────────────────────────────────────────────────────┤
│  MASTER ARRAYS & SCENE SETUP (Lines ~4550-7590)                     │
│  - planetObjects / tracePlanets arrays                              │
│  - Global state object 'o' (~line 5003)                             │
│  - Renderer, camera, orbit controls                                 │
│  - createPlanet calls and hierarchy wiring (.add() calls)           │
│  - Invariable plane system, node markers                            │
│  - PLANET_TEST_DATES verification data (~8,000 entries)             │
├─────────────────────────────────────────────────────────────────────┤
│  VISUAL SYSTEMS (Lines ~7590-17800)                                 │
│  - Orbit visualization, starfield, constellations                   │
│  - Planet inspector and hierarchy display                           │
│  - Trace path rendering, visual effects                             │
│  - Export functions (planet reports, year analysis, solar day)       │
├─────────────────────────────────────────────────────────────────────┤
│  BALANCE EXPLORER & SCALE (Lines ~17800-20850)                      │
│  - Fibonacci Balance Explorer (interactive config testing)          │
│  - Eccentricity Balance Scale visualization                         │
├─────────────────────────────────────────────────────────────────────┤
│  GUI SETUP (Lines ~20855-22575)                                     │
│  - Tweakpane folder structure (About, Controls, Celestial, Reports, │
│    Tools)                                                           │
│  - Control bindings and event handlers                              │
├─────────────────────────────────────────────────────────────────────┤
│  RENDER LOOP (Lines ~22576-22900)                                   │
│  - Main animation frame callback                                    │
│  - Throttled update cycles (20/10/5/30 Hz)                          │
│  - Performance monitoring                                           │
├─────────────────────────────────────────────────────────────────────┤
│  UPDATE & CALCULATION FUNCTIONS (Lines ~22900-43600)                │
│  - Cardinal point detection (solstice/equinox by declination)       │
│  - Days & Years report, Solar Day report                            │
│  - Position update functions (moveModel, updatePositions)           │
│  - Precession calculations (obliquity, inclination, dynamic)        │
│  - Invariable plane updates and balance trend analysis              │
│  - Year-length formulas (tropical, sidereal, anomalistic)           │
│  - Perihelion longitude and predictive formula evaluation           │
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

### Idle-Optimized Render Loop

The render loop is idle-optimized: CPU drops to ~3% when nothing changes (paused, camera still).

```javascript
function render(now) {
  requestAnimationFrame(render);

  // ═══════════════════════════════════════════════════════════════
  // FRAME GATE
  // ═══════════════════════════════════════════════════════════════
  if (now - lastFrameTime < 16.0) return;     // 60 FPS cap
  const delta = (now - lastFrameTime) * 0.001;
  lastFrameTime = now;

  // Camera epsilon: only count movement > 1e-6 per axis
  const CAM_EPS = 1e-6;
  cameraMoved = (Math.abs(x - lastCameraX) > CAM_EPS || ...);

  // IDLE CHECK — skip everything when nothing changed
  const active = o.Run || cameraMoved || positionChanged || needsLabelUpdate;
  if (!active) return;  // no render, no updates, no GPU work

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE FRAME
  // ═══════════════════════════════════════════════════════════════
  forceAllUpdates = positionChanged;  // bypasses all throttles for one frame
  positionChanged = false;

  // controls.target recomputed ONLY when scene moves (not on camera-only moves)
  // This prevents floating-point micro-jitter from getWorldPosition() matrix math
  if (o.Run || forceAllUpdates) {
    controls.target.copy(lookAtObj.pivotObj.getWorldPosition(tmpVec));
  }
  controls.update();

  // ═══════════════════════════════════════════════════════════════
  // THROTTLED UPDATES (only when active)
  // ═══════════════════════════════════════════════════════════════
  // 30 Hz — CSS2D label flag (labelElapsed counter)
  // 20 Hz — UI: date/time strings, Julian Day, camera position
  // 10 Hz — Heavy astronomy: predictions, ascending nodes, anomalies,
  //          inclinations, invariable plane, hierarchy inspector
  // 10 Hz — Position tracking: elongations, perihelion, orientations
  //  5 Hz — DOM labels: planet panel grid rebuild
  // 30 Hz — Visual effects: lighting, flares
  // 10 Hz — Lighting/glow: focus ring, glow animation

  renderer.render(scene, camera);
  if (needsLabelUpdate) CSS2DRenderer.render(scene, camera);  // 30 Hz throttled
}
```

**Key idle detection mechanisms:**
- **`positionChanged`** is set by: `gui.on('change')` global listener, `controls.addEventListener('start')`, `onWindowResize()`, and any code that modifies scene state
- **`cameraMoved`** uses epsilon threshold so OrbitControls damping eventually settles to zero
- **`controls.target`** is NOT recomputed on pure camera movement — only when scene moves. This prevents floating-point jitter from keeping the loop awake indefinitely

### Update Function Call Order

Critical ordering for dependent calculations:

```
1. updatePredictions()                          // Year lengths, precession, obliquity
       ↓
2. updateAscendingNodes()                       // Orbital plane intersections
       ↓
3. updatePlanetAnomalies()                      // Mean/True anomaly for all planets
       ↓
3b. updateMoonOrbitalElements()                 // Moon anomalies (Earth as focus), Ω, ϖ, phase
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
| **Moon Orbital Elements** | Geocentric anomalies, Ω, ϖ, phase | `updateMoonOrbitalElements()` |

### Precession Cycles

| Cycle | Period | Description |
|-------|--------|-------------|
| **Axial Precession** | H/13 | Earth's rotational axis wobble |
| **Perihelion Precession** | H/3 | Closest approach point shifts |
| **Inclination Precession** | H/3 | Orbital plane tilt variation |
| **Obliquity Cycle** | H/8 | Axial tilt oscillation (~22.2° - ~24.7°) |
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

### Predictive Formula System

A 429-term feature matrix system for computing dynamic geocentric perihelion precession rates:

```
Architecture:
├── PERI_HARMONICS (21 terms) → Earth perihelion longitude model
├── calcEarthPerihelionPredictive(year) → Earth perihelion at any year
├── calcERD(year) → Earth Rate Deviation (derivative)
├── buildPredictiveFeatures(year, period, theta0) → 429-term feature vector
│   └── 25 groups: angle terms, obliquity, eccentricity, ERD, periodic,
│       cross-terms, beat frequencies, Venus-specific, higher harmonics
├── PREDICT_COEFFS (7 × 429 trained arrays) → per-planet coefficients
└── predictGeocentricPrecession(year, planetKey) → total rate (″/century)
    └── baseline + dot(features, coefficients)
```

Ported from Python (`tools/lib/python/predictive_formula.py`). Reuses existing `computeObliquityEarth()` and `computeEccentricityEarth()`.

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
│  ├─▼ Calibration Inputs (75)    (from astro-reference.json: Earth & Time 26, Moon 14, Planets 5×7)
│  ├─▼ Model Parameters (70)      (from model-parameters.json: Earth 11, Moon 3, Planets 8×7)
│  └─ Website link                (holisticuniverse.com)
│
├─ Date                          [binding: text input]
├─ Time                          [binding: text input]
├─ JD                            [binding: numeric]
├─ Perihelion Date               [hidden]
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
│  ├─▼ Planet Positions, Perihelion & Inclination
│  ├─▼ Days & Years (combined solstice/equinox + year lengths)
│  └─▼ Solar Day (analemma + day length by starting angle)
│
└─▼ Tools
   ├─ Planet Inspector           [button]
   ├─ Invariable Plane Inspector [button]
   ├─ Eccentricity Balance Scale [button]
   ├─ Data Explorer              [button → holisticuniverse.com]
   ├─▼ Console Tests (F12)       (buttons, not toggles)
   ├─▼ Camera
   └─▼ Debug
```

---

## Performance Optimizations

### Implemented Strategies

| Strategy | Implementation | Benefit |
|----------|---------------|---------|
| **Idle Early-Return** | Single `active` check skips entire frame when nothing changes | ~3% CPU when idle (down from ~10%) |
| **60 FPS Cap** | Skip frame if < 16ms since last | Prevents unnecessary work |
| **Camera Epsilon** | Only detect movement > 1e-6 per axis | OrbitControls damping settles to zero |
| **Controls Target Guard** | Only recompute `controls.target` when scene moves | Prevents getWorldPosition() micro-jitter |
| **CSS2D 30Hz Throttle** | Label renderer only called when `needsLabelUpdate` | Reduces DOM layout work |
| **Throttled Updates** | Different Hz for UI/Astronomy/Effects | Reduces CPU load |
| **Object Pooling** | Pre-allocated Vector3/Matrix4 | Avoids GC pressure |
| **Geometry Reuse** | Shared sphere geometry, scaled per planet | Reduces memory |
| **Visibility Culling** | Optional bodies can be hidden | Reduces draw calls |
| **Label Throttling** | DOM updates at 5 Hz | Reduces layout thrashing |
| **GUI Change Listener** | `gui.on('change')` sets `positionChanged = true` | Wakes idle loop only when needed |

### Performance Budgets

| Metric | Target | Actual |
|--------|--------|--------|
| FPS (Desktop) | 60 | 60 ✅ |
| FPS (Mobile) | 30 | ~30 ✅ |
| CPU Idle (paused, camera still) | <5% | ~3% ✅ |
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

### Kepler Equation Solver (`OrbitalFormulas.eccentricAnomaly`, line 1135)

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
