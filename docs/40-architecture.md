---
docVersion: 1.0
modelVersion: v26.7
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# Interactive 3D Solar System Simulation - Architecture Document

**Version:** 2.1
**Status:** Current Implementation Documentation

> **Scope note (ESSRT).** This document describes the simulation's code architecture and rendering pipeline. The orbital-mechanics implementations (Keplerian solvers, precession cycles, predictive formula system, invariable plane calculations) are scale-invariant by construction. The current architecture additionally supports **deep-time mode** (`DEEP_TIME_MODE_ENABLED` in `src/script.js`, on by default): when the user scrubs the date by millions of years, per-frame integrators update length-of-day, the internal unit (the composed precession clock), planet orbital periods, Moon distance, and ΔT according to the [Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md). The deep-time integrators are tagged in the scene graph (`_dtCycleN`, `_dtMoonIntegrator`, `_dtPlanetIntegrator`, `_dtPerihelionDivisor`) — see [doc 41 §Part 15 — Deep-Time Mode](41-scene-graph-hierarchy.md) for the per-tag specifications.

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

The Interactive 3D Solar System Simulation is a sophisticated WebGL-based astronomical visualization tool that implements the Expanding Solar System Resonance Theory (ESSRT). It provides accurate planetary positions, precession cycles, and orbital mechanics calculations spanning hundreds of thousands of years.

**Key Statistics:**
- Single monolithic script.js (~39,000 lines since plan 18 retired the console-test folder)
- 10 rendered bodies (Sun, Earth, Moon and the seven chain planets)
- 50+ astronomical calculation functions
- Real-time 3D visualization at 60 FPS
- Support for date ranges from millennia (snapshot mode) to millions of years (deep-time mode, the shipped default)

**Core Capabilities:**
- Accurate planetary positions from the model's own N-body element chain
  (`@essrt/physics/planets/keplerian-chain` + the governed artifact
  `data/nbody-secular-frequencies.json` — the ONLY planet path; the
  geometric chains serve the no-chain bodies Pluto, Halley and Eros and the
  scene scaffolding — doc 41's engine-D rendering note)
- Long-term precession cycles (axial, perihelion, inclination)
- The standard-model reference overlay (K8): VSOP87A ghost bodies for the
  Sun + seven planets with a live per-body Δ readout — one-way reference,
  comparison published either way it falls (docs 50/109 §16)
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

The repository's layout — the browser monolith, the Node engine in `tools/lib/`, the published packages, the gates and generators in `tools/verify/`, the fitters, the shipped artifacts — is stated once in [CLAUDE.md § Key paths](../CLAUDE.md); `npm run test:verify:list` prints the gate/generator classification and `npm run regen:cascade` the artifact order. (The tree that stood here drifted on every count it carried.)

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

The monolithic script.js (~39,000 lines) is organized into logical sections. Constants are grouped by source (A = the scene epoch, the research toggles and the two display literals — the former model-parameters.json, retired leaf by leaf and deleted at plan 11 step 6, B = the shipped fit artifacts under data/ — the former fitted-coefficients.json, deleted at plan 11 step 1, C = astro-reference.json, D = meeus-lunar-tables.json, E = derived, F = display-only).

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSTANTS & FORMULAS (top of file)                                 │
│  A. The scene epoch, the research toggles, the two display literals │
│  B. Fitted coefficients: the ΔT stack, the resonator, the climate   │
│     formula; the frozen balance-preset record                       │
│  C. Astro references: J2000 elements, body diameters, inclination  │
│     reference data, ASTRO_REFERENCE object                          │
│  D. Moon Meeus tables (Ch.47 lunar corrections)                     │
│  E. Derived constants: year lengths, precession periods, the mass   │
│     chain (one home: @essrt/physics earth/mass-chain)               │
│  E3. OrbitalFormulas library (50+ methods: Kepler solver, anomaly   │
│     conversions, frame transforms, Laplace coefficients)            │
│  F. Display-only constants                                          │
├─────────────────────────────────────────────────────────────────────┤
│  OBJECT DEFINITIONS                                                 │
│  - Data objects for every celestial body (Type I/II/III)            │
│  - Planet hierarchical precession layers                            │
│  - Moon precession layers                                           │
│  - The K-device scaffold wheels (recorded J2000 pose periods)       │
├─────────────────────────────────────────────────────────────────────┤
│  MASTER ARRAYS & SCENE SETUP                                        │
│  - planetObjects / tracePlanets arrays                              │
│  - Global state object 'o'                                          │
│  - Renderer, camera, orbit controls                                 │
│  - createPlanet calls and hierarchy wiring (.add() calls)           │
│  - Invariable plane system, node markers                            │
│  - PLANET_TEST_DATES verification data (~8,000 entries)             │
├─────────────────────────────────────────────────────────────────────┤
│  VISUAL SYSTEMS                                                     │
│  - Orbit visualization, starfield, constellations                   │
│  - Planet inspector and hierarchy display                           │
│  - Trace path rendering, visual effects                             │
│  - Export functions (planet reports, year analysis, solar day)       │
├─────────────────────────────────────────────────────────────────────┤
│  GUI SETUP                                                          │
│  - Tweakpane folder structure (About, Controls, Celestial, Reports, │
│    Tools)                                                           │
│  - Control bindings and event handlers                              │
├─────────────────────────────────────────────────────────────────────┤
│  RENDER LOOP                                                        │
│  - Main animation frame callback                                    │
│  - Throttled update cycles (20/10/5/30 Hz)                          │
│  - Performance monitoring                                           │
├─────────────────────────────────────────────────────────────────────┤
│  UPDATE & CALCULATION FUNCTIONS (the back ~2/3 of the file)         │
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

`let o = {` in `src/script.js` is the global state object — the GUI bindings, the time (`o.pos`, `o.julianDay`, `o.Date`, `o.Time`, `o.currentYear`), the flags. The Tweakpane bindings read and write it directly, and any code that changes it sets `positionChanged = true` so the throttled sub-systems run once more (see the render loop below). The field list is the code's; a copy here drifted.

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
  //          inclinations, invariable plane, Planet Orbit Analysis
  // 10 Hz — Position tracking: elongations, perihelion, orientations
  //  5 Hz — DOM labels: planet panel grid rebuild
  // 30 Hz — Visual effects: lighting, flares
  // 10 Hz — Lighting/glow: focus ring, glow animation

  renderer.render(scene, camera);
  if (needsLabelUpdate) CSS2DRenderer.render(scene, camera);  // 30 Hz throttled
}
```

**Key idle detection mechanisms:**
- **`positionChanged`** is set by: `gui.on('change')` global listener (which IGNORES readonly/monitor bindings — Tweakpane 4 monitors re-emit `change` on every 200-ms poll tick whether the value moved or not, and with ~300 of them the handler woke the loop every frame of a paused page; the perf gate's paused-idle row pins the guard), `controls.addEventListener('start')`, `onWindowResize()`, and any code that modifies scene state
- **Any user interaction** (`click`, `change`, `input`, `keydown`, `pointerup` on the document, capture phase) wakes the loop for ONE frame — the structural guard for a UI path that changes scene state without setting the flag (the Show/Hide chips showed the class once the paused loop truly idled); the Show/Hide gate pins it
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
10. updateHierarchyLiveData()                    // Planet Orbit Analysis (orbit of date, live)
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

### The One-Source Movement (Stage C/D)

Earth's rendered movement — ε(t), e(t), ϖ(t), the equinox ψ(t), the
seven planets and the invariable plane — comes from **one source**: the
model's own N-body secular series (`data/nbody-secular-series.json`,
±10 Myr; the NAFF mode tail beyond), evaluated through the
`@essrt/physics` factories (`createDeepOrbitalHistory`,
`createYearLengths`, `createCardinalStructure`, the λ̇ sidereal channel).
The displayed/served year lengths and precession beats are ONE family
from these factories (chart ≡ panel ≡ report ≡ API ≡ Node engine). The
motion model carries no fitted correction: the movements are the composed
precession clock and the N-body series. The scene's world frame is the
J2000 ecliptic and the engine places the Earth frame, the Sun and the Moon
stack in it every frame.

### Precession Cycles (dynamical, J2000)

The published periods are dynamical; the *displayed of-date* values are
the beats of the one-source year-length family (e.g. axial ≈ 25,771.6 yr
at J2000, declining with date). See
[doc 20 § Precession Periods](20-constants-reference.md) for the registry
values.

| Cycle | Source | Description |
|-------|--------|-------------|
| **Axial Precession** | 1,296,000/p_A at J2000 (IAU 2006 input); the composed T_p(t) at deep time | Earth's rotational axis wobble |
| **Perihelion Precession** | the perihelion-of-date beat, 1/T_peri = 1/T_p + 1/T_aps | Closest approach point shifts (climatic precession) |
| **Apsidal Precession** | the one-family anomalistic/sidereal beat | Perihelion revolution vs the fixed stars |
| **Obliquity Cycle** | the beat 2π/(ψ̇ᵢₙ − \|s₃\|) | Axial tilt oscillation (~22.2° - ~24.7°) |
| **Eccentricity Cycle** | the N-body secular series (e.g. the 405.6-kyr g₂ − g₅ line) | Orbital shape variation |

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

### Earth's perihelion device and the planets' Earth-frame rate

```
├── Earth's perihelion of date is the series' ϖ (createModel().earth.perihelionLongitudeDeg)
└── perihelionFrameBreakdown(planetKey, year) → the planet's perihelion rate in two
    coordinates: the chain's ecliptic rate, its equatorial projection at the IAU
    J2000 longitude, and the Earth-frame RA rate as their sum
    (ecliptic × dα/dλ + ∂α/∂ε·ε̇ — doc 13 §1.8, a kinematic identity)
```

### Celestial Bodies

| Body | Type | Orbital Elements | Special Features |
|------|------|------------------|------------------|
| Sun | Star | Wheel longitude = legacy stack + δ overlay (λ_certified − λ_realized, the wheel's own longitude read from the scene geometry; clock-convention window) | Lens flare, glow; certified E4/E5 longitude |
| Mercury | Planet | Full Keplerian | Perihelion precession demo |
| Venus | Planet | Full Keplerian | Retrograde rotation |
| Earth | Planet | Full Keplerian | Clouds, atmosphere shader, axial tilt |
| Moon | Satellite | Earth-centered | Apsidal/nodal precession |
| Mars | Planet | Full Keplerian | - |
| Jupiter | Planet | Full Keplerian | Great Red Spot texture |
| Saturn | Planet | Full Keplerian | Ring system |
| Uranus | Planet | Full Keplerian | Extreme axial tilt |
| Neptune | Planet | Full Keplerian | - |

Pluto, Halley's Comet and Eros were rendered here until the no-chain bodies
were removed: they had no element chain, and all four no-chain bodies shared
one placeholder perihelion fraction — a single 27,943-yr period standing in
for four unrelated orbits, against Pluto's true apsidal period of order
3.7 Myr. Pluto's mass, semi-major axis and node remain as INPUTS to the
invariable-plane angular-momentum sum, which follows Souami & Souchay's
ten-body convention; Ceres remains a force-only perturber in the N-body run.

---

## GUI Structure

### Main Panel Organization

The pane's folder tree is the code's — `setupGUI()`, the `addFolder` titles; [doc 50](50-ui-panels-reference.md) is the panel reference and [doc 02](02-user-guide.md) the user's walkthrough. A copy of the tree here drifted on every folder rename.

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
| **GUI Change Listener** | `gui.on('change')` sets `positionChanged = true` for INPUT changes; monitor (readonly) ticks are ignored | Wakes idle loop only when needed — a paused, untouched page costs nothing per frame |
| **Loop-driven monitors** | The pane's ~319 readonly rows have no poll timers (disposed after `setupGUI()`); the render loop's 5-Hz DOM tick re-reads only the rows in expanded folders / selected tab pages | A paused page runs no monitor reads or DOM rewrites (was ~1,600/s); collapsed folders cost nothing while playing |

### Performance Budgets

| Metric | Target | Actual |
|--------|--------|--------|
| FPS (Desktop) | 60 | 60 ✅ |
| FPS (Mobile) | 30 | ~30 ✅ |
| CPU Idle (paused, camera still) | <5% | ~3% ✅ |
| Initial Load | <3s | ~2.5s ✅ |
| Bundle Size | <3MB | ~2.7MB ✅ |
| Memory (Desktop) | <500MB | not re-measured since the texture set changed |

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
- **ESSRT** - Long-term cycle parameters

### No External APIs

The application is fully self-contained with no runtime API dependencies. All calculations are deterministic based on the input time.

---

## Key Algorithms

### Kepler Equation Solver (`OrbitalFormulas.eccentricAnomaly`)

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

### True Anomaly (`updatePlanetAnomalies`)

True anomaly is computed geometrically from world-space positions using `atan2`, not from the eccentric anomaly. The function reads each planet's 3D position relative to the Sun and computes the angular position directly. (Planet *mean* anomaly, by contrast, is the textbook `M = M₀ + n·Δt` with a Kepler-equation solve — the position-based alternative was rejected. The Moon keeps the geometric method.)

### Height Above Invariable Plane (`updatePlanetInvariablePlaneHeights`)

Height is calculated inside `updatePlanetInvariablePlaneHeights()` using dot product of the planet's world position vector with the invariable plane normal.

### Mass-Weighted Balance (`updateInvariablePlaneBalance`)

The balance calculation lives inside `updateInvariablePlaneBalance()`, summing `mass × height` for all 8 planets and dividing by total mass.

---

## Future Considerations

### Known Limitations

1. **GPU-bound frame rate** — on a large high-ratio display the draw, not the loop's JavaScript, sets the frame rate; the adaptive pixel ratio drops to 1 under 30 fps, and `index.html?perf=1` measures it ([doc 52](52-analysis-export-tools.md) Part 4b)
2. **Memory** — the textures are the bulk of the page's memory
3. **No persistence** — state is lost on page refresh
4. **Single thread** — a jump to a deep epoch integrates Earth's spin axis from J2000 on the main thread (65 s to −200 Myr headless); the decisions that would make it instant are plan 19's in the private repo

---

## References

### External
1. **Three.js Documentation** - https://threejs.org/docs/
2. **Tweakpane v4** - https://tweakpane.github.io/docs/
3. **Meeus, Jean** - "Astronomical Algorithms" (1998)
4. **Souami & Souchay** - "The solar system's invariable plane" (2012)
5. **NASA JPL Horizons** - https://ssd.jpl.nasa.gov/horizons/
6. **holisticuniverse.com** - https://www.holisticuniverse.com

### Internal
- [41 — Scene Graph Hierarchy](41-scene-graph-hierarchy.md) — full scene-graph structure with §Part 15 covering deep-time integrator tags
- [99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — deep-time scaling formalism that the integrators implement
