# UI Panels Reference

This document provides technical reference for the UI panels in the 3D Solar System Simulation.

---

## Overview

The simulation includes several interactive panels for inspecting planetary data:

| Panel | Purpose |
|-------|---------|
| **Planet Hierarchy Inspector** | Inspect the 5-step hierarchy chain for each planet |
| **PlanetStats Panel** | Per-planet data display with collapsible groups, charts, and dynamic rows |
| **Invariable Plane Analysis** | View planet heights above/below the invariable plane |
| **Balance Trend Analysis** | Track mass-weighted balance over time |
| **Invariable Plane Balance Explorer** | Test Fibonacci Law assignments interactively |
| **Eccentricity Balance Scale** | Visualize Law 5 balance per target planet (waterfall chart + buildup table) |
| **Solar System Resonance Cycle** | All periods as integer divisors of 8H = 2,682,536 yr at J2000 (8 planets × 6 cycles) |
| **WebGeoCalc Explorer** | Observed perihelion-precession history from JPL WebGeoCalc (1900–2026) per planet — see [doc 56](56-webgeocalc-explorer.md) |
| **Climate Formula Explorer** | L1+L2+L3 climate formula visualized across LR04 / CENOGRID / EPICA / CenCO2PIP, multiple time windows — see [doc 58](58-climate-formula-explorer.md) |
| **ESSRT Explorer** | Deep-time evolution of H, LOD, year length, Moon distance under Expanding Solar System Resonance Theory — see [doc 59](59-essrt-explorer.md) |
| **LOD-Climate Rhythm** | dLOD/dt driver layers (Tidal baseline / GIA / all cycles) vs named climate periods + GISP2 temperature; Σ_stack ↔ Bond 2001 IRD cross-validation — physics in [doc 102](102-gia-alpha-lunar-validation.md) |
| **Formula Verification** | Model vs published celestial-mechanics formulas (±12,000 yr, 9 quantities) — see [doc 57](57-formula-verification.md) |

> **Scope note (ESSRT).** Each panel is intrinsically a present-epoch UI that reads from the live simulation state — what users see at any time reflects whatever date is currently active. When users scrub the simulation date by millions of years, the panels reflect ESSRT-evolved values automatically (per `DEEP_TIME_MODE_ENABLED` in `src/script.js`). The Solar System Resonance Cycle panel displays integer divisors (scale-invariant); the ESSRT Explorer is the dedicated visualization for how those divisors' literal year-counts evolve at deep time. See [doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) for the formalism.

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

1. Open the Tweakpane Tools folder
2. Click "Planet Inspector"
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
| `hierarchyInspector` state | script.js:7547-7597 |
| `PLANET_HIERARCHIES` registry | script.js:6629-6750 |
| `createVisualHelpers()` | script.js:7808+ |
| `updateHierarchyLiveData()` | script.js:11096+ |

---

## PlanetStats Panel

### Purpose

The PlanetStats panel is the primary per-planet data display. When a planet is selected (clicked or via "Look At"), a collapsible sidebar handle appears on the left edge of the screen. Clicking the handle expands the full panel showing orbital parameters, precession data, and interactive charts organized in a tabbed interface.

#### Collapsible Sidebar

The panel uses a collapsible sidebar pattern controlled by the `pl-collapsed` CSS class:

| State | Width | Content |
|-------|-------|---------|
| **Collapsed** (default) | 36px | Handle with "i" icon, "PLANET INFO" label, and chevron |
| **Expanded** | 33.333vw (desktop) / 85vw (mobile) | Full panel with tabs, data rows, and charts |

- Panel always starts collapsed when a planet is first selected
- Click the handle to expand; click the thin left edge strip to collapse
- Close (×) button collapses the panel and hides orbit lines
- Switching to Free Camera keeps the sidebar collapsed with the last planet's data
- Performance: grid rebuild is skipped while collapsed; a fresh rebuild is triggered immediately on expand

#### Mobile Responsive Layout

The panel uses CSS **container queries** to automatically switch between 2-column and 3-column layouts based on actual panel width (not viewport width):

| Panel width | Columns | What's shown |
|------------|---------|-------------|
| > 380px | 3 | Label, Value, Unit |
| ≤ 380px | 2 | Label, Value (unit column hidden) |

The value column (`auto`) always gets priority over the label column (`minmax(0,1fr)`), which truncates with ellipsis when space is tight.

Panel width varies by device:
- **Desktop**: 33.333vw ≈ 640px → 3 columns
- **iPad landscape**: 33.333vw ≈ 393px → 3 columns
- **iPad portrait**: 33.333vw ≈ 270px → 2 columns
- **iPhone portrait**: 85vw ≈ 352px → 2 columns
- **iPhone landscape**: 33.333vw ≈ 299px → 2 columns

#### Tweakpane Mobile Toggle

On mobile/tablet, the Tweakpane control panel is hidden by default to give the 3D scene full screen space:

- A **gear icon** (⚙) button appears in the top-right corner on screens < 768px wide or < 500px tall
- Tapping the gear slides the Tweakpane panel in as an overlay (85vw on portrait, 50vw on landscape)
- A dark **backdrop overlay** appears behind the panel; tapping it closes the panel
- Touch targets are enlarged on touch devices via `@media (pointer: coarse)`

### Tabbed View

Rows are distributed across tabs to reduce scrolling. The tab bar appears between the planet header and the data rows.

#### Tab Layout by Planet Type

| Planet Type | Tabs | Notes |
|-------------|------|-------|
| **Standard planets** (Mercury–Neptune, Pluto, Halley's, Eros) | GENERAL, ORBIT, POSITION, PRECESSION | 4 tabs |
| **Earth** | GENERAL, ORBIT, POSITION, PRECESSION | Same 4 tabs; extra Date Specific + Precession Cycles sections go into PRECESSION |
| **Moon** | GENERAL, ORBIT, CYCLES | 3 tabs; eclipse cycles in CYCLES |
| **Sun** | *(no tab bar)* | All sections shown flat |

#### Tab-to-Section Mapping (Standard Planets)

| Tab 0: GENERAL | Tab 1: ORBIT | Tab 2: POSITION | Tab 3: PRECESSION |
|----------------|--------------|------------------|-------------------|
| General Characteristics | Orbital Period & Motion | Orbital Orientation to Ecliptic | Perihelion Precession |
| Gravitational Influence Zones | Orbital Shape & Geometry | Orbital Orientation to Invariable Plane | Theorized Precession Breakdown |
| Surface & Physical Properties | Velocities | Position & Anomalies | |
| | Energy & Momentum | Time Calculations | |

#### Tab Behavior

- Active tab has bright background; inactive tabs are dimmed
- Switching tabs resets scroll position
- Column widths are cached independently per planet + tab combination
- Switching planets preserves the active tab (tab memory), with fallback to GENERAL if the remembered tab isn't populated for the new planet (e.g., Sun only has tab 0)
- Configuration is in the `TAB_CONFIG` object with `headerMap` and per-planet overrides

### Row Types and Color Coding

Each row has a semantic type that determines its color:

| Type | Property | Color | Meaning |
|------|----------|-------|---------|
| **Constant** | `constant: true` | Green (#8FBC8F) | Derived from model constants, never changes |
| **Static** | `static: true` | White (rgba 255,255,255,.85) | Fixed reference values (e.g., GR prediction) |
| **Observed** | `observed: true` | Blue (#56B4E9) | Values from external observations/references |
| **Dynamic** | (default) | Gold (#EFC04A) | Computed from simulation state, updates in real-time |

### Row Grouping

Within each tab, rows are organized under section headers (e.g., "Perihelion Precession", "Orbital Shape & Geometry"). Related sub-rows use box-drawing characters (`┌ ├ └`) to visually indicate grouped values.

### Inline SVG Charts

Two chart types are embedded as inline SVG within planetStats rows:

#### Perihelion Precession Chart

Shows one full precession cycle with:
- **Blue curve**: geocentric precession rate over time (from predictive formula)
- **Green dashed line**: heliocentric baseline rate
- **Yellow marker**: current simulation year position
- **Red marker**: fixed reference position (year 2000)
- **Cycle windowing**: markers only render when within the current cycle window (no modulo wrapping)

#### Obliquity Chart (Earth only)

Shows one full obliquity cycle (H/8) with:
- **Curve**: obliquity variation over the cycle
- **Markers**: current year and reference positions
- **Same cycle windowing** logic as perihelion chart
- **Phase group peaks**: Hover text on phase angle peak markers includes Glacial Maximum information (no separate LGM marker)

### Predictive Formula Rows

For Mercury through Neptune, the "Perihelion Precession" group includes dynamically computed rows:

| Row | Source | Description |
|-----|--------|-------------|
| **Missing advance of perihelion** | `predictGeocentricPrecession()` − baseline | Fluctuation above/below heliocentric rate at current year |
| **Perihelion precession (Geocentric)** | `predictGeocentricPrecession()` | Total geocentric rate at current year (baseline + fluctuation) |

These use the 429-term predictive formula system (ported from Python) with trained coefficients per planet.

#### Mercury-Specific Rows

Mercury has additional grouped rows comparing the model to General Relativity:

| Row | Value | Color |
|-----|-------|-------|
| `┌ Missing advance around 1900 AD (Model)` | `predictGeocentricPrecession(1900, 'mercury') − baseline` | Amber (dynamic) |
| `└ Missing advance (GR)` | 42.98″/century (fixed) | White (static) |

### Code Locations

| Component | Location |
|-----------|----------|
| `TAB_CONFIG` | script.js:~26140 |
| `planetStats` row definitions | script.js:~21689–26135 |
| `updateDomLabel()` | script.js:~26770 (renders rows, tab filtering, color classes) |
| `buildObliquityChart()` | script.js:~26280 |
| `buildPerihelionChart()` | script.js:~26489 |
| `predictGeocentricPrecession()` | script.js:~30641 |
| Collapsible sidebar CSS | style.css (`.pl-handle`, `.pl-collapsed`, `@keyframes pl-pulse`) |
| Tab bar + color coding CSS | style.css (`.pl-tab-bar`, `.pl-static`, `.pl-dynamic`) |

---

## Invariable Plane Analysis Panel

### Purpose

Displays all planets' heights relative to the invariable plane, along with a mass-weighted balance indicator.

### Panel Layout

```
┌─────────────────────────────────────────────┐
│ INVARIABLE PLANE ANALYSIS             [−]   │
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

Height calculations use **ecliptic-rate ascending nodes** (H/16 period) rather than ICRF-rate (H/3). This is necessary because Earth's position (`sun.ra`) is measured in precessing ecliptic coordinates.

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

1. Expand the "Observed Positions" folder, then the "Invariable Plane Analysis" subfolder
2. Click "Invariable Plane Balance Explorer"

### Key Features

| Feature | Description |
|---------|-------------|
| **Phase angle selection** | Choose between per-planet model phases, Laplace-Lagrange eigenmodes, or custom angles |
| **Fibonacci divisor dropdown** | Common Fibonacci values (1–55) plus custom input |
| **Editable precession periods** | Modify ascending node precession rates |
| **42 presets** | Deep-analysis survivors: pass inclination balance ≥99.994%, eccentricity balance ≥99%, LL bounds, direction match ≤5″ (per-config optimised). Sorted by eccentricity balance. |
| **Dual balance display** | Inclination (Law 3) and eccentricity (Law 5) balance percentages |
| **Per-planet results table** | Amplitude, mean, range, LL bounds check, trend comparison |
| **Earth locked** | Earth's parameters (d=3, in-phase, 21.77°) are derived from the temperature model and cannot be changed |

### Default Configuration Result

- Inclination balance: **~100%** (99.997%)
- Eccentricity balance: **~99.9%**
- LL bounds: **8/8 pass** (Saturn: +0.028° excess, within 0.03° LL uncertainty)
- Trend directions: **7/7 fitted planets match JPL** (J2000-fixed frame)
- Total trend error: **~4.3″/century** across the 7 fitted planets

### Full Reference

See [53 - Balance Explorer Reference](53-balance-explorer-reference.md) for complete documentation including calculation details, all controls, and interpretation guide.

---

## Eccentricity Balance Scale

### Purpose

Visualizes how each planet's base eccentricity is the weighted sum of the other 7 planets' perihelion offsets (Law 5 / eccentricity balance). For a selected target planet, the panel computes per-planet weights from mass, Fibonacci divisor, and semi-major-axis ratios, and shows them as a waterfall SVG chart plus a detailed buildup table. Saturn sits alone on one side (sole anti-phase member); the other 7 balance it.

### Accessing the Scale

1. Open the Tweakpane Tools folder
2. Click "Eccentricity Balance Scale"
3. Use the planet nav bar (dropdown + left/right arrows) to switch targets

### Key Features

| Feature | Description |
|---------|-------------|
| **Waterfall SVG chart** | Green bars (positive push) and red bars (negative pull) showing each planet's contribution to the target's eccentricity |
| **Buildup table** | Columns: Mass, d, offset (AU), weight, contribution, share (%) |
| **Planet nav bar** | Full-width dropdown + arrows; starts at the currently focused planet |
| **Uses base eccentricities** | Long-term mean values (not J2000 instantaneous) — the balance is the model's structural claim |
| **Color coding** | Amber `#f0b040` = eccentricity values, green = positive contribution, red = negative contribution |

### Full Reference

See [38 — The Eccentricity Balance Scale](38-eccentricity-scale.md) for the physics derivation, per-planet weight formulas `W_j = √(m_j/m_target × d_target/d_j × a_j/a_target)`, and the Saturn-eccentricity prediction from the other 7 planets.

---

## Solar System Resonance Cycle

### Purpose

Shows all 8 planets × 6 cycle types (axial precession, ecliptic perihelion, ICRF perihelion / inclination, ascending node regression, obliquity oscillation, eccentricity cycle) as integer divisors of the Solar System Resonance Cycle 8H = 2,682,536 years (at J2000). Every cycle for every planet divides 8H evenly — this is the super-period that resets the whole system once every ~2.68 million years.

### Accessing the Panel

1. Open the Tweakpane Tools folder
2. Click "Solar System Resonance Cycle"
3. Use the **Years / 8H/N** toggle button in the header to switch display modes

### Key Features

| Feature | Description |
|---------|-------------|
| **8 × 6 grid** | Every planet row, every cycle column, one cell per combination |
| **Years / 8H/N toggle** | Values shown as years with thousand separators, or as the 8H/N integer divisor |
| **Color coding** | Green = prograde, red = retrograde, neutral = oscillation (no direction), ∞ = frozen, — = N/A |
| **Earth row highlighted** | Earth is the reference planet for all derived cycles |
| **Scientific-reference hover** | Each cell hover shows observed value, source (WebGeoCalc, Laskar, Cottereau, Saillenfest, etc.), and pass/fail status |

### Full Reference

See [55 — Solar System Resonance Cycle Period Table](55-solar-system-resonance-cycle-periods.md) for the complete period table (both years and 8H/N), the three Fibonacci identities linking cycles, mirror-symmetry patterns, and the Earth cycle chain.

---

## WebGeoCalc Explorer

### Purpose

Shows the actual observed perihelion-precession history of each planet from JPL NAIF WebGeoCalc over 1900–2026, plotted alongside the model's own prediction for direct comparison. For each planet the panel displays three charts (longitude of perihelion ϖ, ascending node Ω, argument of periapsis ω) in the ecliptic-of-date frame. This is the panel that grounds the model's Fibonacci perihelion rates in observation — the rates are calibrated to match what JPL reports, not what first-order secular theory predicts.

### Accessing the Explorer

1. Open the Tweakpane Tools folder
2. Click "WebGeoCalc Explorer"
3. Use the tab row to switch between planets (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune — Earth excluded because its ecliptic inclination is zero by definition)

### Key Features

| Feature | Description |
|---------|-------------|
| **Primary chart (ϖ vs time)** | Blue = observed, yellow = model prediction (`predictGeocentricPrecession` integrated from J2000), with linear OLS trend overlay |
| **Two trend estimates** | Raw OLS (affected by oscillations) and sin+lin (bias-corrected) for each planet |
| **Collapsible charts** | Ascending node Ω and argument of periapsis ω for detailed inspection |
| **Resolvability flag** | Venus, Jupiter, Saturn, Uranus, Neptune are flagged as un-determined: Venus/Jupiter/Uranus/Neptune because their oscillation period exceeds the 126-year baseline (apparent slope flips sign across sub-windows); Saturn because its magnitude varies by ~2× across plausible windows even though direction stays retrograde |
| **Frame note** | Reminder that all angles are in the ecliptic-of-date frame — in ICRF each rate would differ by ~−5,030″/cy (general precession, H/13) |

### Full Reference

See [56 — WebGeoCalc Explorer](56-webgeocalc-explorer.md) for the complete observed-rate table, the data pipeline (`tools/explore/wgc-perihelion-rates.js` → `public/input/wgc-perihelion-data.json`), and why only Mercury and Mars have reliably resolvable trends from the 1900–2026 window. Saturn's direction stays retrograde across windows but its magnitude varies by ~2× (sliding-window range −1,800 to −3,600 ″/cy), so it is also flagged as un-determined.

---

## Climate Formula Explorer

### Purpose

Modal that visualizes the canonical **L1+L2+L3 climate formula** (see [doc 92](92-climate-formula.md)) overlaid on each of the four climate proxy records — CenCO2PIP (66 Myr), CENOGRID (67 Myr), LR04 (5.3 Myr) — with multiple sub-windows on LR04 (1.2 Myr post-MPT extended, 800 kyr EPICA, 700 kyr post-MPT, 200 kyr past, forward projection). Lets the user toggle each layer (Total / L1 / L2 / L3) and switch the CENOGRID proxy between δ¹⁸O and δ¹³C.

### Accessing the Explorer

1. Open the Tweakpane Tools folder
2. Click "Climate Formula Explorer"
3. Use the time-window tabs across the top to switch records
4. Use the layer toggles (Total / L1 / L2 / L3) to add or remove formula layers
5. On CENOGRID, use the δ¹⁸O / δ¹³C sub-toggle

### Key Features

| Feature | Description |
|---------|-------------|
| **Eight time-window tabs** | CenCO2PIP 66M, CENOGRID 67M, LR04 5.3M, LR04 1.2M, EPICA 800k, LR04 700k, LR04 200k, forward projection |
| **Layer toggles** | Total (baseline + L1 + L2 + L3), L1 only (orbital lattice — 31 integer divisors of 8H at J2000), L2 (carbon-cycle thermostat 405/202/135 kyr family), L3 (6 Heaviside step components at PETM/EOT/Mi-1/MMCT/iNHG/MPT) |
| **Proxy chart** | Observed proxy data + the formula evaluated at the same timestamps |
| **CENOGRID proxy sub-toggle** | δ¹⁸O vs δ¹³C |
| **Forward projection tab** | Predicts climate forcing forward — Holocene correctly identified as interglacial; next natural glaciation predicted ~58 kyr ahead |
| **Hover tooltips** | Per-layer breakdown at any timestamp with detailed L1 line composition |

### Full Reference

See [doc 58 — Climate Formula Explorer](58-climate-formula-explorer.md) for the complete panel reference (tab list, layer toggles, Y-axis conventions, R² breakdown, forward-projection markers, code locations). The underlying L1+L2+L3 architecture, per-regime ridge-fit R² values, 32 L1 integers + Berger/Holistic dual attribution, and variance-decomposition Tier B analyses live in [doc 92 — Climate Formula: Architecture, Variance & Implementation](92-climate-formula.md).

---

## ESSRT Explorer

### Purpose

Modal that visualizes the **Expanding Solar System Resonance Theory (ESSRT)** — how the Earth Fundamental Cycle H, length-of-day, sidereal year, Moon distance, and ΔT evolve across deep time. The Solar System Resonance Cycle (8H ≈ 2.68 Myr today) and its integer-divisor lattice are structural invariants, but H itself expands monotonically across geological time via two physically independent drivers: **Earth-Moon tidal evolution (Driver 1)** lengthens LOD; **solar mass loss (Driver 2)** expands every orbit via Kepler's third law. The integers in the lattice stay fixed; only the literal time unit scales.

### Accessing the Explorer

1. Open the Tweakpane Tools folder
2. Click "ESSRT Explorer"
3. Use the **Quantity** tabs (top row) to select what to plot: H, LOD, sidereal year, tropical year, Moon distance, ΔT, etc.
4. Use the **Range** tabs (second row, teal accent) to select the time range: full Hadean → +1 Gyr, Phanerozoic 650 Ma, etc.

### Key Features

| Feature | Description |
|---------|-------------|
| **Quantity tabs (gold)** | H(t), LOD, sidereal/tropical year length, Moon distance, ΔT — all derived from Farhat 2022 Moon-distance polynomial + angular-momentum conservation + Driver 2 solar mass loss |
| **Range tabs (teal)** | Full deep-time (Hadean ~−4.54 Gyr → +1 Gyr), Phanerozoic 650 Ma, finer-grained sub-ranges |
| **Hover tooltip** | Year and value at any point on the chart, with snap-to-nearest-sample |
| **Export buttons** | "Export Full" and "Export Phanerozoic" — produce paper-style SVG (white background) for the selected quantity over those ranges |
| **Validation references** | Curves pass through anchored data points from cyclostratigraphy (Wu 2024, Boulila 2018), tidal-rhythmite measurements (Williams 2000), Devonian coral growth bands (Wells 1963), and the Patterson 1956 Pb-Pb age constraint |

### Full Reference

See [doc 59 — ESSRT Explorer](59-essrt-explorer.md) for the complete panel reference (7 quantity tabs, 2 range tabs, era markers, Wu 2024 anchor overlay, hover tooltip, paper-export buttons, code locations). The underlying theory — Driver 1 (Farhat polynomial + angular-momentum conservation), Driver 2 (Kepler scaling under solar mass loss), the H(t) / LOD(t) / year(t) parameterizations, validation against the published cyclostratigraphy record (sub-percent agreement Hadean → present), and the per-frame integrator architecture (`_dtCycleN`, `_dtMoonIntegrator`, `_dtPlanetIntegrator`) — lives in [doc 99 — Expanding Solar System Resonance Theory](99-expanding-solar-system-resonance-theory.md).

---

## LOD-Climate Rhythm

### Purpose

Modal that plots the framework's **dLOD/dt driver decomposition** (the rate curves behind the tweakpane's *dLOD/dt decomposition* sub-folder) against named historical climate periods and an independent paleoclimate temperature proxy. Where the ESSRT Explorer shows the *secular* deep-time LOD evolution, this modal shows the *millennial-scale cyclic modulation* on top of it — the 4-flag sub-Milankovitch stack (Bond + Hallstatt + Jose5 + Jose4) — and asks: do the framework's predicted warm/cool transitions line up with the climate record?

It is the interactive home of the **Σ_stack ↔ Bond 2001 IRD cross-validation** ([doc 102](102-gia-alpha-lunar-validation.md) § "Defensible scientific position" item 7): Pearson **r = +0.49** on the validated window −4000 BC to +1800 AD (r = +0.38 full overlap), out-of-sample since the stack was fit against the Stephenson 2016 ΔT residual, not any climate proxy. Sign convention "Σ > 0 = LOD above baseline = mass equatorward = warm" holds on **6 of 6** named events in-window.

### Accessing the Panel

1. Open the Tweakpane Tools folder
2. Click "LOD-Climate Rhythm"
3. Pick an **epoch tab** (six windows; default **750–2050 AD**, the culturally-recognizable MWP → LIA → Modern window)
4. Toggle layers with the legend checkboxes; open the three collapsible evidence panels below the chart

### Key Features

| Feature | Description |
|---------|-------------|
| **Layer toggles (7)** | **Tidal baseline** (flat rust dashed, +2.12 ms/cy — pure Moon-recession reference) · **Tidal + GIA** (secular baseline, +1.77 ms/cy at J2000, matches IERS +1.75) · **Tidal + GIA + all cycles** (full observable prediction, +0.76 ms/cy at J2000; also gates the ▲/▼ transition markers) · **Bond cycle** (the 8H/1830 = 1466-yr harmonic isolated, thin dashed) · **Periods** (climate-band shading) · **Temperature (GISP2)** (opt-in proxy overlay, secondary °C axis) · **Temperature (LR04)** (opt-in inverted-δ¹⁸O overlay, green, covers the 200-kyr tab) |
| **Epoch tabs (7)** | 200,000 BC–2050 AD (glacial; fine 3,000-sample grid, crossing triangles suppressed above 120 crossings) · 27,500 BC–2050 AD · 13,000 BC–2050 AD · 4,000 BC–2050 AD · 750–2050 AD (default) · 1,200–2,500 AD (near future) · 13,000 BC–15,000 AD (full). Y-range auto-computed per tab from the currently-visible curves |
| **Climate-period bands** | 19 named periods from mainstream literature (MIS 7 interglacial, Penultimate Glaciation MIS 6, Eemian MIS 5e, Last Glacial Period, LGM, Older/Younger Dryas, Holocene Optimum, 8.2 ka, Bond 4, 4.2 ka, Late Bronze Age Collapse, Iron Age cold, Roman Warm, Late Antique LIA, MWP, LIA incl. Maunder + Dalton, Modern warm) — cold = blue band, warm = red band; wide bands get inline labels, narrow bands get 45° leader labels in the top margin |
| **Transition markers ▲/▼** | Zero-crossings of the stack rate on the Tidal + GIA + all cycles curve: ▲ PEAK (stack at max, rate turns negative → Earth spins up vs baseline → warm episode starts), ▼ TROUGH (stack at min → cooling starts). The matching console test *All cycles (4-flag stack) ↔ climate transitions* scans −5000 to +5000 CE and matches each crossing to the nearest named transition of the correct sign |
| **Temperature overlay** | GISP2 (Alley 2000) Greenland ice-core reconstruction on a secondary right-hand °C-anomaly axis, 27,950 BC–1850 AD at 100-yr resolution — independent reconstruction, not part of any framework fit. A 5-kyr rolling-mean detrend (`lcrDetrendSeries`) removes the Milankovitch-scale trend so Bond-scale oscillations are visible |
| **Evidence panels (3, collapsible)** | *Framework ↔ Bond 2001 IRD correlation (detrended)* — Pearson r for Σ_stack and for the isolated Bond harmonic, plus best-lag cross-correlation (±500 yr scan) · *Sign convention check* — Σ_stack sign vs warm/cold at 10 named events (6/6 within the validated window) · *Bond event ↔ nearest framework ▼ TROUGH crossing* — offsets from Bond 0–8 (1450 CE back to 9150 BC) |
| **Export button** | "Export LOD-Climate graph" — paper-style SVG (white background, ESSRT-export typography) of the current tab with the currently-toggled layers |

### Proxy roles (fixed, no user selector)

- **Chart overlay** = GISP2 (Alley 2000) — smoothest signal across the Holocene window
- **Chart overlay (deep)** = LR04 benthic stack (Lisiecki & Raymo 2005) — derived at load from `public/input/lr04-data.json` (the Climate Formula Explorer's dataset) as inverted δ¹⁸O anomaly vs core-top (positive = warm, same sign convention as Bond IRD); 1-kyr resolution, covers the full 200,000 BC tab where GISP2 ends (~27,950 BC)
- **Correlation target** = Bond 2001 IRD stack — Bond's *own* dataset, the most direct out-of-sample validation of the framework's Bond harmonic (the IRD drift-ice signal is the same physical mass-redistribution signal the 8H/1830 harmonic models, which is why it correlates at +0.49 where GISP2 gives only +0.20)

GISP2 + Bond live in `public/input/climate-proxy.json`; all are loaded/derived by `lcrLoadProxyData()` with GitHub raw-URL fallback.

### Code Locations

| Item | Location |
|------|----------|
| Modal block (comment header → close) | `src/script.js` ~lines 24198–25445, CSS prefix `.lcr-` (reuses `.cfm-*` modal chrome) |
| `LCR_RANGE_TABS` / `LCR_CLIMATE_PERIODS` / `LCR_BOND_EVENTS` / `LCR_SIGN_CHECK_EVENTS` | ~24627 / ~24640 / ~24233 / ~24374 |
| `lcrComputeSeries` (rate curves + crossings, cached per tab) | ~24661 |
| `lcrRenderChart` / `lcrExport` | ~24712 / ~25078 |
| `lcrComputeCorrelations` / `lcrRenderCorrelationPanel` / `lcrRenderSignCheckPanel` / `lcrRenderBondMatchTable` | ~24268 / ~24438 / ~24387 / ~24499 |
| `createLcrPanel` / `openLcrPanel` / `closeLcrPanel` | ~25240 / ~25431 / ~25441 |
| Tools folder button | ~30279 |

### Full Reference

The physics and validation methodology live in [doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) (4-flag stack derivation, Bond IRD cross-validation, sign-convention analysis) and [doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) § "dLOD/dt decomposition at J2000" (the five-row taxonomy — Tidal baseline / GIA / All cycles / Tidal + GIA / Tidal + GIA + all cycles — shared by the tweakpane sub-folder, the dashboard export, and this modal).

---

## Formula Verification

### Purpose

Compares the model's predictions against published closed-form formulas from celestial-mechanics literature (Meeus, Chapront, Capitaine, Vondrák, Laskar, Berger, Peters, Harkness) across nine Earth quantities over a ±12,000-year window. This is the **analytical twin** of the WebGeoCalc Explorer — where WebGeoCalc compares the model against *observed JPL data*, Formula Verification compares it against *published analytical formulas*. Together they validate the model from two independent directions.

### Accessing the Panel

1. Open the Tweakpane Tools folder
2. Click "Formula Verification"
3. Navigate between the 9 categories with the `‹` / `›` arrows or click the category name to open a dropdown

### Key Features

| Feature | Description |
|---------|-------------|
| **Nine categories** | Eccentricity, obliquity, inclination (inv. plane), ascending node (inv. plane), perihelion longitude, tropical year, solar day, sidereal year, axial precession |
| **Main chart** | Model curve (amber) + all reference formulas on a −12,000 BC to +12,000 AD axis, with J2000 gridline |
| **Residual chart** | `reference − model` in arcseconds, seconds, milliseconds, degrees, or AU depending on the category |
| **J2000 comparison table** | Every reference formula's value at J2000 + Δ vs Model, with source links |
| **Export buttons** | "Export for Paper" (±12 k yr) and "Export Cycles" (±~250 k yr, eccentricity/obliquity only) produce publication-grade SVG |
| **Earth-only** | All nine quantities describe Earth's orbit + spin axis; per-planet observational validation lives in the WebGeoCalc Explorer |

### Full Reference

See [57 — Formula Verification](57-formula-verification.md) for the complete reference-formula catalogue (polynomial / trigonometric-series / N-body-tabulated classes), colour coding, interpretation at different time scales (century → 100-kyr), and code locations.

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
| [51 - Planet Inspector Reference](51-planet-inspector-reference.md) | Planet inspector calculations |
| [53 - Balance Explorer Reference](53-balance-explorer-reference.md) | Balance explorer calculations and controls |
| [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md) | Height calculation formulas |
| [20 - Constants Reference](20-constants-reference.md) | Planet masses and orbital elements |
| [38 - Eccentricity Balance Scale](38-eccentricity-scale.md) | Law 5 balance math; Saturn eccentricity prediction |
| [55 - Solar System Resonance Cycle](55-solar-system-resonance-cycle-periods.md) | 8H period table for all planets × cycles |
| [56 - WebGeoCalc Explorer](56-webgeocalc-explorer.md) | Observed perihelion-precession (JPL NAIF, 1900–2026) |
| [57 - Formula Verification](57-formula-verification.md) | Model vs published celestial-mechanics formulas (±12 k yr) |
| [58 - Climate Formula Explorer](58-climate-formula-explorer.md) | Dedicated panel reference for the Climate Formula Explorer modal |
| [59 - ESSRT Explorer](59-essrt-explorer.md) | Dedicated panel reference for the ESSRT Explorer modal |
| [92 - Climate Formula](92-climate-formula.md) | L1+L2+L3 architecture for the Climate Formula Explorer |
| [99 - Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) | Deep-time scaling framework for the ESSRT Explorer |

---

**Previous**: [51 - Planet Inspector Reference](51-planet-inspector-reference.md)
