# Planet Hierarchy Inspector - Requirements & Design

**Status:** ✅ Implemented

**Related Documentation:**
- [Calculation Logic](./planet-hierarchy-inspector-calculations.md) - How the calculations work
- [Dynamic Ascending Node](./dynamic-ascending-node-calculation.md) - Ascending node dynamics

## Problem Statement

Each planet in the Holistic Universe Model is built using a **5-step hierarchical chain** of nested Three.js objects. Each step adds a specific astronomical behavior (precession, orbital mechanics, etc.).

Debugging and verifying these chains is difficult because:
1. Settings are spread across multiple object definitions
2. Calculated values (speeds, positions) are hard to verify at runtime
3. The parent-child relationships are established separately from the object definitions
4. There's no easy way to inspect the current state of each hierarchy level

## The 5-Step Hierarchy Pattern

For each planet (e.g., Venus), the hierarchy is:

```
startingPoint (root)
    └── [Planet]PerihelionDurationICRF      (Step 1: ICRF precession)
            └── [Planet]PerihelionFromEarth (Step 2: Perihelion position offset)
                    └── [Planet]PerihelionDurationEcliptic (Step 3: Ecliptic precession)
                            └── [Planet]PerihelionFromSun   (Step 4: Heliocentric orbit setup)
                                    └── [planet]            (Step 5: The actual planet)
```

### What Each Step Does

| Step | Object Name Pattern | Purpose |
|------|---------------------|---------|
| 1 | `[Planet]PerihelionDurationICRF` | Handles perihelion precession in the ICRF (International Celestial Reference Frame) |
| 2 | `[Planet]PerihelionFromEarth` | Positions the perihelion point as seen from Earth, sets orbital eccentricity offset |
| 3 | `[Planet]PerihelionDurationEcliptic` | Handles perihelion precession relative to the ecliptic plane |
| 4 | `[Planet]PerihelionFromSun` | Sets up the heliocentric orbit (distance from Sun, orbital inclination) |
| 5 | `[planet]` | The actual planet with its size, texture, rotation, orbital speed |

## Key Properties to Inspect Per Step

### Common Properties (All Steps)

| Property | Description | Units |
|----------|-------------|-------|
| `name` | Human-readable identifier | string |
| `startPos` | Initial angular position | degrees |
| `speed` | Angular velocity | radians per model year |
| `tilt` | Axial tilt of the object | degrees |
| `orbitRadius` | Radius of circular orbit (or 0 if positioned by parent) | scene units |
| `orbitCentera` | X offset from parent center | scene units |
| `orbitCenterb` | Z offset from parent center | scene units |
| `orbitCenterc` | Y offset from parent center | scene units |
| `orbitTilta` | Orbit plane tilt around X axis | degrees |
| `orbitTiltb` | Orbit plane tilt around Z axis | degrees |

### Derived/Runtime Properties

| Property | Description | Source |
|----------|-------------|--------|
| `containerObj` | Three.js Object3D container | Created by `createPlanet()` |
| `orbitObj` | The orbit line/ellipse | Created by `createPlanet()` |
| `pivotObj` | The pivot point for child attachment | Created by `createPlanet()` |
| `planetObj` | The visible mesh (sphere) | Created by `createPlanet()` |

### Calculated Values to Display

| Value | Calculation | Meaning |
|-------|-------------|---------|
| Speed in years | `(2 * Math.PI) / speed` | How many years for one complete rotation |
| Speed in arcsec/century | `1296000 / speedInYears` | Standard astronomical unit |
| Current rotation | `orbitObj.rotation.y` | Current angle in radians |
| World position | `pivotObj.getWorldPosition()` | Actual XYZ in scene |

## Function Requirements

### Primary Function: `inspectPlanetHierarchy(planetName)`

**Purpose:** Walk through all 5 steps of a planet's hierarchy and display comprehensive information about each level.

**Input:** Planet name (string) - e.g., "venus", "mars", "jupiter"

**Output:** Console output (formatted table) AND optional on-screen overlay

### Information to Display Per Step

```
╔═══════════════════════════════════════════════════════════════════╗
║  STEP 1: Venus Perihelion Duration ICRF                          ║
╠═══════════════════════════════════════════════════════════════════╣
║  SETTINGS (from object definition)                               ║
║  ─────────────────────────────────────────────────────────────────║
║  name:           "Venus Perihelion Duration ICRF"                 ║
║  startPos:       0                                                ║
║  speed:          -0.0002739... (raw radians/year)                 ║
║  speed (years):  22,937.08 years per revolution                   ║
║  speed (arcsec): 56.47 arcsec/century                             ║
║  tilt:           0°                                               ║
║  orbitRadius:    0                                                ║
║  orbitCenter:    (0, 0, 0)                                        ║
║  orbitTilt:      (0°, 0°)                                         ║
║  visible:        false                                            ║
║  isNotPhysicalObject: true                                        ║
║                                                                   ║
║  RUNTIME STATE (current values)                                   ║
║  ─────────────────────────────────────────────────────────────────║
║  containerObj:   Object3D (exists: ✓)                             ║
║  orbitObj:       Object3D (rotation.y: 0.0034 rad)                ║
║  pivotObj:       Object3D (exists: ✓)                             ║
║  planetObj:      Mesh (exists: ✓)                                 ║
║  World Position: (0.00, 0.00, 0.00)                               ║
║                                                                   ║
║  PARENT → CHILD CONNECTION                                        ║
║  ─────────────────────────────────────────────────────────────────║
║  Parent: startingPoint.pivotObj                                   ║
║  Child:  venusPerihelionFromEarth.containerObj                    ║
║  Connection verified: ✓                                           ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Additional Features

1. **Step-by-Step Navigation**
   - Press Enter or click "Next" to advance to next step
   - Press "P" or click "Previous" to go back
   - Press "Q" or click "Close" to exit

2. **Visual Highlighting**
   - Highlight the current step's objects in the 3D scene
   - Show connection lines between parent and child pivots
   - Temporarily make invisible objects visible with a distinct color

3. **Validation Checks**
   - Verify parent-child connections exist
   - Check for NaN or undefined values
   - Warn if speed is 0 when it shouldn't be
   - Warn if orbitRadius conflicts with orbitCenter values

4. **Export Option**
   - Copy all step data to clipboard as JSON
   - Log to console in a format suitable for bug reports

## Planet Registry

To make the function work, we need a registry mapping planet names to their hierarchy:

```javascript
const PLANET_HIERARCHIES = {
  venus: {
    steps: [
      venusPerihelionDurationICRF,
      venusPerihelionFromEarth,
      venusPerihelionDurationEcliptic,
      venusPerihelionFromSun,
      venus
    ],
    connections: [
      { parent: startingPoint, child: venusPerihelionDurationICRF },
      { parent: venusPerihelionDurationICRF, child: venusPerihelionFromEarth },
      { parent: venusPerihelionFromEarth, child: venusPerihelionDurationEcliptic },
      { parent: venusPerihelionDurationEcliptic, child: venusPerihelionFromSun },
      { parent: venusPerihelionFromSun, child: venus }
    ]
  },
  // ... similar for mercury, mars, jupiter, etc.
};
```

## UI Design Options

### Option A: Console Only (Simplest)
- All output goes to browser console
- Use `console.group()` and `console.table()` for formatting
- No UI changes needed

### Option B: Overlay Panel
- Floating panel similar to planet info panel
- Step-by-step navigation with buttons
- Visual highlighting in 3D scene

### Option C: dat.GUI Integration
- Add an "Inspector" folder to existing GUI
- Dropdown to select planet
- Step navigation buttons
- Values displayed in GUI fields

## Recommended Implementation: Option A + B Hybrid

1. **Console output** for detailed data (always available)
2. **Simple overlay** for navigation and highlighting
3. **Keyboard shortcuts** for quick access

## Usage Example

```javascript
// Start inspection for Venus
inspectPlanetHierarchy('venus');

// Console output appears immediately
// Overlay panel opens for navigation
// Current step (1) is highlighted in scene

// User presses Enter or clicks "Next"
// Advances to Step 2, updates console and highlighting

// User presses "Q" or clicks "Close"
// Cleanup, restore original visibility states
```

## Implementation Phases

### Phase 1: Core Function (Console Only)
- Create planet registry
- Implement `inspectPlanetHierarchy()` with console output
- Add validation checks
- Test with Venus

### Phase 2: Visual Highlighting
- Temporarily modify object colors/visibility
- Add connection line visualization
- Cleanup/restore on exit

### Phase 3: Navigation UI
- Create overlay panel HTML/CSS
- Implement step navigation
- Add keyboard shortcuts

### Phase 4: Export & Comparison
- Export to JSON
- Compare two planets side-by-side
- Detect anomalies across all planets

## Design Decisions (Confirmed)

1. **Output format:** Visual overlay panel (similar to planet info panel)
2. **Planets to support:** All planets - selectable from dropdown
3. **Comparison mode:** Not needed for now
4. **Auto-validation:** Yes - warn about NaN, zero speeds, broken connections
5. **How to trigger:** dat.GUI Settings menu - first menu item

---

## Detailed Implementation Specification

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  PLANET HIERARCHY INSPECTOR                                    [×]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Planet: [Venus ▼]                                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  STEP 2 of 5: Venus Perihelion From Earth                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  SETTINGS                                                           │
│  ───────────────────────────────────────────────────────────────   │
│  name             │ "PERIHELION VENUS"                              │
│  startPos         │ -89.78° (-90 + 0.22)                            │
│  speed (raw)      │ 6.2832 rad/year                                 │
│  speed (period)   │ 1.00 years per revolution                       │
│  tilt             │ 0°                                              │
│  orbitRadius      │ 0                                               │
│  orbitCenter      │ (0.847, 0, -0.123)                              │
│  orbitTilt        │ (0°, 0°)                                        │
│  visible          │ false                                           │
│                                                                     │
│  RUNTIME STATE                                                      │
│  ───────────────────────────────────────────────────────────────   │
│  Current rotation │ 0.0034 rad (0.19°)                              │
│  World position   │ (45.23, 0.00, -12.45)                           │
│  Objects created  │ ✓ container  ✓ orbit  ✓ pivot  ✓ planet        │
│                                                                     │
│  VALIDATION                                                         │
│  ───────────────────────────────────────────────────────────────   │
│  ✓ All values valid                                                 │
│  ✓ Parent connection verified                                       │
│  ✓ Child connection verified                                        │
│                                                                     │
│  HIERARCHY PATH                                                     │
│  ───────────────────────────────────────────────────────────────   │
│  startingPoint                                                      │
│    └── venusPerihelionDurationICRF                                  │
│          └── ★ venusPerihelionFromEarth  ← YOU ARE HERE             │
│                └── venusPerihelionDurationEcliptic                  │
│                      └── venusPerihelionFromSun                     │
│                            └── venus                                │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │ ◀ Prev   │  │  Next ▶  │  │  Highlight in Scene              │  │
│  └──────────┘  └──────────┘  └──────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Visual Highlighting in Scene

When "Highlight in Scene" is active:
1. Current step's object glows with a distinct color (yellow/gold)
2. Parent object shows connection line to current step
3. Child object shows connection line from current step
4. Other objects in the hierarchy are dimmed but visible
5. Objects not in hierarchy are fully dimmed

### Axis Helpers & Direction Visualization

For each step, show visual indicators for:

#### 1. AxesHelper (XYZ orientation)
- Red arrow = X axis (local)
- Green arrow = Y axis (local)
- Blue arrow = Z axis (local)
- Attached to the current step's `pivotObj`
- Size proportional to the object's scale

#### 2. StartPos Direction Arrow
- Shows the initial angular position (`startPos`)
- Golden/yellow arrow pointing in the direction of `startPos` degrees
- Example: if `startPos = 45°`, arrow points at 45° from the reference axis
- Label showing the angle value

#### 3. Orbit Center Offset Arrow
- Shows the `orbitCenter` offset from parent
- Cyan/light blue arrow from parent pivot to current position
- Shows (a, b, c) offset values

#### 4. Orbit Tilt Visualization
- Shows `orbitTilta` and `orbitTiltb` as rotation indicators
- Arc or plane indicator showing the tilt angles
- Different colors for each tilt axis

#### 5. Speed/Rotation Direction
- Curved arrow showing rotation direction (clockwise vs counter-clockwise)
- Based on sign of `speed` value
- Green = positive (counter-clockwise), Red = negative (clockwise)

```
Visual Legend (shown in panel):
─────────────────────────────────
🔴 X-axis (local right)
🟢 Y-axis (local up)
🔵 Z-axis (local forward)
🟡 StartPos direction (45°)
🔷 Orbit center offset
⟳  Rotation direction (speed > 0)
⟲  Rotation direction (speed < 0)
```

#### Toggle Options in Panel
```
┌─────────────────────────────────────────────┐
│  VISUAL HELPERS                             │
│  ─────────────────────────────────────────  │
│  [x] Show Axes (XYZ)                        │
│  [x] Show StartPos Direction                │
│  [x] Show Orbit Center Offset               │
│  [ ] Show Orbit Tilt Planes                 │
│  [x] Show Rotation Direction                │
│  [ ] Show All Steps (not just current)      │
└─────────────────────────────────────────────┘
```

### Planet Registry Structure

```javascript
const PLANET_HIERARCHIES = {
  mercury: {
    label: 'Mercury',
    steps: [
      { obj: mercuryPerihelionDurationICRF, parentRef: 'startingPoint' },
      { obj: mercuryPerihelionFromEarth, parentRef: 'mercuryPerihelionDurationICRF' },
      { obj: mercuryPerihelionDurationEcliptic, parentRef: 'mercuryPerihelionFromEarth' },
      { obj: mercuryPerihelionFromSun, parentRef: 'mercuryPerihelionDurationEcliptic' },
      { obj: mercury, parentRef: 'mercuryPerihelionFromSun' }
    ]
  },
  venus: {
    label: 'Venus',
    steps: [
      { obj: venusPerihelionDurationICRF, parentRef: 'startingPoint' },
      { obj: venusPerihelionFromEarth, parentRef: 'venusPerihelionDurationICRF' },
      { obj: venusPerihelionDurationEcliptic, parentRef: 'venusPerihelionFromEarth' },
      { obj: venusPerihelionFromSun, parentRef: 'venusPerihelionDurationEcliptic' },
      { obj: venus, parentRef: 'venusPerihelionFromSun' }
    ]
  },
  // ... mars, jupiter, saturn, uranus, neptune, pluto, halleys, eros
};
```

### Validation Checks

| Check | Severity | Message |
|-------|----------|---------|
| `speed` is NaN | Error | "Speed is NaN - calculation error" |
| `speed` is 0 for precession step | Warning | "Speed is 0 - no rotation will occur" |
| `startPos` is NaN | Error | "Start position is NaN" |
| `orbitCenter` has NaN | Error | "Orbit center has NaN values" |
| `containerObj` missing | Error | "Container object not created" |
| `pivotObj` missing | Error | "Pivot object not created" |
| Parent-child link broken | Error | "Not attached to parent's pivot" |
| `orbitRadius` > 0 AND `orbitCenter` != 0 | Warning | "Both radius and offset set - may conflict" |

### dat.GUI Integration

Add to Settings folder (first item):

```javascript
// In the Settings folder setup
const settingsFolder = gui.addFolder('Settings');

// Add as FIRST item
settingsFolder.add({
  inspectHierarchy: () => openHierarchyInspector()
}, 'inspectHierarchy').name('🔍 Inspect Planet Hierarchy');

// ... rest of settings
```

### CSS Styling

The panel will use the same glass-morphism style as the planet info panel for consistency:
- Frosted glass background
- Subtle border
- Smooth animations
- Responsive sizing

---

## Implementation Status

### Phase 1: Core Infrastructure ✅
- [x] Create planet registry with all planets
- [x] Create `openHierarchyInspector()` function
- [x] Add dat.GUI menu item
- [x] Create basic overlay HTML/CSS

### Phase 2: Step Display ✅
- [x] Implement step navigation (prev/next)
- [x] Display all properties for current step
- [x] Calculate and display derived values (period from speed)
- [x] Show hierarchy tree with current position

### Phase 3: Validation ✅
- [x] Implement all validation checks
- [x] Display validation results with icons
- [x] Color-code errors (red) and warnings (yellow)

### Phase 4: Visual Highlighting ✅
- [x] Highlight current step's objects in 3D scene
- [x] Draw connection lines between steps
- [x] Orbital plane visualization with half-planes
- [x] Ascending/descending node markers
- [x] Highest/lowest point markers
- [x] **Dynamic updates** - markers move with ascending node changes

### Phase 5: Live Data ✅
- [x] Real-time ecliptic position display
- [x] Celestial coordinates (RA/Dec)
- [x] Orbital anomalies (Mean/True)
- [x] Dynamic ascending node longitude
- [x] Argument of periapsis

---

## Files Modified

| File | Changes |
|------|---------|
| `src/script.js` | Planet registry, inspector function, live data updates, dynamic ascending nodes |
| `src/style.css` | Inspector panel styles |

---

## Key Code Locations

| Component | Location |
|-----------|----------|
| `hierarchyInspector` state object | [script.js:3660-3695](../src/script.js#L3660-L3695) |
| `PLANET_HIERARCHIES` registry | [script.js:3556-3658](../src/script.js#L3556-L3658) |
| `createVisualHelpers()` | [script.js:3875-4300](../src/script.js#L3875-L4300) |
| `updateHierarchyLiveData()` | [script.js:5040-5812](../src/script.js#L5040-L5812) |
| `updateAscendingNodes()` | [script.js:9617-9684](../src/script.js#L9617-L9684) |
| `updateOrbitalPlaneRotations()` | [script.js:9699-9730](../src/script.js#L9699-L9730) |

---

## Dynamic Features

The Planet Hierarchy Inspector includes **real-time dynamic updates**:

### Ascending Node Dynamics
- Ascending nodes shift as Earth's obliquity changes over time
- Visual markers (nodes, half-planes, highest/lowest points) update each frame
- See [Dynamic Ascending Node Calculation](./dynamic-ascending-node-calculation.md) for algorithm details

### Live Data Display
When Step 4 (RealPerihelionAtSun) is selected, the inspector shows:
- **Celestial Coordinates**: Planet RA/Dec, Sun Dec comparison
- **Ecliptic Position**: Height above ecliptic, angle from ascending node
- **Orbital Elements**: Dynamic ascending node longitude, argument of periapsis
- **Orbital Anomalies**: Mean and True anomaly with visual representation

### Visual Markers Updated Dynamically
| Marker | Description |
|--------|-------------|
| Magenta sphere ↑ | Ascending node (orbit crosses ecliptic going north) |
| Cyan sphere ↓ | Descending node (orbit crosses ecliptic going south) |
| Green sphere ↑ | Highest point (max north, 90° after ascending) |
| Red sphere ↓ | Lowest point (max south, 90° after descending) |
| Green half-plane | Portion of orbit above ecliptic |
| Red half-plane | Portion of orbit below ecliptic |
| Yellow dashed line | Line of nodes (connects ascending/descending) |

