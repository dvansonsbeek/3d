---
docVersion: 1.0
modelVersion: v16.1
coefficients: sha256:bb6a03c877eedab8
status: current
---

# User Guide: 3D Solar System Simulation

This guide explains how to use the Interactive 3D Solar System Simulation - the heart of ESSRT where theory becomes something you can explore and verify.

## Getting Started

### Accessing the Simulation

Open the simulation at: **https://3d.holisticuniverse.com**

The simulation runs entirely in your browser using Three.js - no installation required.

### Initial View

When you first load the simulation, you'll see:
- The Sun at the center
- Earth and other planets in their orbits
- The current date and time displayed
- Control panels on the sides

---

## Basic Controls

### Mouse Controls

| Action | Result |
|--------|--------|
| **Left-click + drag** | Rotate the 3D view |
| **Scroll wheel** | Zoom in/out |
| **Right-click + drag** | Pan the view |

### Reset View

Click the **RESET** button or the **3D** button in the top right to return to the default view orientation.

### Touch Controls (Mobile/Tablet)

| Action | Result |
|--------|--------|
| **One finger drag** | Rotate view |
| **Pinch** | Zoom in/out |
| **Two finger drag** | Pan view |

### Mobile Layout

On phones and tablets, the interface adapts automatically:

- **Control panel**: Hidden by default. Tap the **gear icon** (⚙) in the top-right corner to open it as an overlay. Tap the dark backdrop or the gear again to close.
- **Planet info panel**: Automatically switches to a 2-column layout (label + value) when the panel is narrow, hiding the unit column.
- **Touch targets**: Buttons and inputs are enlarged for easier tapping on touchscreens.

---

## Time Controls

### Time Speed

The **"1 second equals"** dropdown controls how fast time passes in the simulation:

| Setting | Use Case |
|---------|----------|
| Real-time | Observe current positions |
| 1 day | Watch daily motion |
| 1 month | Track lunar cycles |
| 1 year | Observe annual patterns |
| 10 years | See planetary alignments |
| 100 years | Watch precession begin |
| 1,000 years | Observe significant precession |
| 10,000 years | See axial precession cycle |

### Date/Time Input

You can jump to any date using:
- **Calendar date**: Enter a specific date in Y-M-D format (e.g., "2000-01-01")
- **Time**: Enter time in 24-hour UTC format (e.g., "12:00:00")
- **Julian Day**: Enter the astronomical Julian day number directly

The display shows:
- Current UTC date and time
- Julian Day number (continuous day count since 4713 BC)
- Simulation speed

**Date range**: The simulation supports dates from ancient history to far future, enabling observation of long-term precession cycles.

**Deep-time scrubbing (ESSRT).** When you scrub the date by millions of years, the simulation automatically applies **Expanding Solar System Resonance Theory** scaling — length-of-day, the precession period, planet orbital periods, and the Moon's distance all evolve smoothly according to the two physical drivers (Earth-Moon tidal evolution + solar mass loss). This mode is on by default; the scene-graph stays consistent at any epoch from Hadean (~−4 Gyr) to +200 Myr in the future. See [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) for the full framework.

### Playback Controls

| Button | Function |
|--------|----------|
| **Play/Pause** | Start/stop time progression |
| **Step Forward** | Advance by one time unit |
| **Step Backward** | Go back by one time unit |
| **Reverse** | Run time backwards |

---

## Key Simulation Objects

### EARTH-WOBBLE-CENTER ("The Death Star")

This small grey marker rides Earth's precession frame: it circles Earth once per precession period (<!--v:axialPrecRound-->~25,771<!--/v--> years at J2000) at a fixed display distance, marking the solstice direction — the direction Earth's axis leans within the sun plane. It is a display marker, not a physics node: every instrument measures from Earth itself.

**To observe**: focus on Earth, enable Tracing › Wobble, speed up time to 1,000+ years per second and watch it draw its circle around Earth.

### PERIHELION-OF-EARTH (White Dot)

This white dot marks the point closest to the Sun in Earth's orbit. It moves at the model's measured apsidal rate — in the current era one revolution per <!--v:inclPrecYears-->~111,582<!--/v--> years; the displayed direction follows the model's own N-body dynamics.

**To observe**: Speed up time to 10,000+ years and watch it drift through the zodiac.

### The Invariable Plane

The invariable plane is the solar system's fundamental reference plane, perpendicular to its total angular momentum. When enabled, you can see:
- The plane itself (translucent disk)
- Where each planet crosses above/below it
- Current height of planets above/below the plane

---

## Information Panels

### Celestial Positions Panel

Displays real-time astronomical coordinates for all bodies:

| Column | Meaning |
|--------|---------|
| **RA** | Right Ascension (hours, minutes, seconds) |
| **Dec** | Declination (degrees) |
| **Dist** | Distance from Earth (AU or km) |

Use these values to verify against other planetariums like Stellarium.

### Planet Information Panel (planet stats)

Click on any planet to show a collapsible sidebar handle on the left edge. Click the handle to expand the full information panel (the Planet Orbit Analysis under Tools is a different view: the orbit of date from the N-body chain, doc 51):

**Orbital Elements:**
- Semi-major axis (a)
- Eccentricity (e)
- Inclination (i)
- Ascending Node (Ω)
- Argument of Periapsis (ω)
- Mean Anomaly (M)
- True Anomaly (ν)

**Derived Values:**
- Current orbital velocity
- Distance from Sun
- Time since/to perihelion
- Height above invariable plane

### Invariable Plane Positions Panel

Shows which planets are currently above or below the invariable plane:
- **Above**: Positive height value
- **Below**: Negative height value
- **Crossing**: Near zero, transitioning

---

## Visualization Options

### Show / Hide

The **Show / Hide** folder contains a chip-grid of toggle buttons grouped by planet (Sun, Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Halley's, Eros). Click any chip to toggle visibility of that object. For the seven chain planets a group holds the planet, **Perihelion at Sun** (the perihelion point of the orbit of date, Sun + a(1−e) in the chain's perihelion direction, with a Sun → P line — the same construction as the Planet Orbit Analysis' P) and **Perihelion at Earth** (the geocentric direction marker at the legacy display radius); the device wheels behind the planets (the ecliptic-duration and fixed/real-perihelion wheels) and the retired eccentricity-cycle wobble centres have no chips. Pluto, Halley's and Eros have no group (they render as before). The Moon's group is the Moon, **Apsidal Precession** — the perigee of date, Earth + a(1−e) in the orbit plane at the argument F − M′ with an Earth → perigee line, advancing once per ~8.85 yr — and **Nodal Precession** — the line of nodes, the ascending ↑ and descending ↓ nodes on the mean-distance circle at the longitude L′ − F with a dashed line through Earth, regressing once per ~18.6 yr; both are drawn from the framework-native lunar arguments on the ecliptic of date (focus on Earth and zoom in to the Moon's orbit to see them). The Moon's device wheels have no chips, and neither do Earth's five precession wheels (the Earth frame is placed from the engine; Earth's group is the Earth, its Wobble Center and its Perihelion). The Sun's group is the Sun, **Sun barycenter** — the Solar System Barycenter as the mass-weighted sum of the chain's heliocentric positions of date (the same sum as the Sun panel's Sun-SSB rows), with a Sun → SSB line and the barycenter's path around the Sun over ±25 years (focus on the Sun and zoom in: the loops span about two solar radii) — and **Sun barycenter at Earth**, the same vector and path drawn from Earth's centre: a transposed display, not a position, so the Sun's wobble reads where the camera usually sits (the loops reach past the Moon's orbit).

### Celestial Tools

| Tool | Description |
|------|-------------|
| **Polar Line** | Shows Earth's axis orientation pointing toward Polaris |
| **Star Names** | Labels for prominent stars |
| **Constellations** | Constellation outlines |
| **Zodiac constellations (IAU)** | The band of the thirteen IAU constellations the ecliptic crosses, centred on Earth and fixed to the stars (J2000 boundaries carried with the precession) — the equinox of date and the perihelion marker precess through it |
| **Zodiac signs** | The twelve equal 30° signs of the tropical zodiac, Aries 0° at the vernal equinox of date — fixed to the seasons; the inner ring turns with the equinox against the constellation band, the precession of the equinoxes as the drift between the two |

### Trace Paths

Enable traces to see the path a body has traveled over time. Useful for:
- Venus's 5-petal pattern (8 years)
- Moon's nodal regression
- Planetary conjunctions

### Planet Size and Orbits

In the **Visualization** folder:

| Control | Description |
|---------|-------------|
| **Orbits** | Toggle all orbital path lines on/off (also available as a chip in Show / Hide) |
| **Planets Size Boost** | Slider to scale planet sizes for visibility |

### Elongations Display

The **Settings > Elongations show/hide** folder shows the angular separation between the Sun and each planet as seen from Earth:

| Value | Meaning |
|-------|---------|
| **0°** | Conjunction (planet aligned with Sun) |
| **90°** | Quadrature (planet 90° from Sun) |
| **180°** | Opposition (planet opposite to Sun) |

Elongation is useful for determining planet visibility and predicting conjunctions/oppositions.

### Camera Position Display

The **Settings > Camera show/hide** folder shows your current viewpoint:

| Field | Description |
|-------|-------------|
| **RA** | Right Ascension of camera position |
| **Dec** | Declination of camera position |
| **AU distance** | Distance from origin in AU |

---

## Keyboard Shortcuts

### Planet Orbit Analysis (Tools → Planet Orbit Analysis)

When the Planet Orbit Analysis panel is open:

| Key | Action |
|-----|--------|
| **←** or **P** | Previous planet |
| **→** or **N** | Next planet |
| **Escape** or **Q** | Close inspector |

---

## Common Exploration Tasks

### Watch Axial Precession (≈ <!--v:axialPrecRound-->~25,771<!--/v--> years)

1. Set time speed to **10,000 years per second**
2. Enable the **Polar Line**
3. Watch Earth's axis trace a circle against the stars
4. Note how the North Celestial Pole moves away from Polaris

### Observe Moon's Nodal Precession (~18.6 years)

1. Set time speed to **1 year per second**
2. Enable **Moon Nodes**
3. Watch the lunar nodes regress westward
4. One complete cycle takes about 18.6 years

### See Venus's 5-Petal Pattern

1. Set time speed to **1 month per second**
2. Enable trace for Venus
3. Watch for 8 years (simulation time)
4. Venus traces a 5-pointed star pattern relative to Earth

### Track Perihelion-Solstice Alignment

1. Go to date **December 26, 1245** (perihelion alignment epoch)
2. Note perihelion is near the December solstice direction
3. Advance to year **2000**
4. Perihelion now occurs around January 3 (~12.95° shift)

### Compare with Stellarium

1. Note the Julian Day from the simulation
2. Enter the same Julian Day in Stellarium
3. Compare Right Ascension and Declination values
4. Values should match within arcminutes

---

## Verifying Data

### Julian Day Reference

The simulation displays Julian Day (JD) - the continuous count of days since January 1, 4713 BC. This allows precise time comparisons:

| Date | Julian Day |
|------|------------|
| J2000 (Jan 1, 2000, 12:00 TT) | 2451545.0 |
| January 1, 2025 | 2460676.5 |

### Right Ascension Format

RA is displayed in sexagesimal format:
- **12h 34m 56s** = 12 hours, 34 minutes, 56 seconds
- Full circle = 24 hours
- 1 hour = 15 degrees

### Declination Format

Declination is displayed in degrees:
- **+23° 26' 21"** = 23 degrees, 26 arcminutes, 21 arcseconds north
- Range: -90° (south celestial pole) to +90° (north celestial pole)

---

## Tips for Exploration

1. **Start slow**: Use real-time or 1-day speed to understand basic movements
2. **Use traces**: Enable path tracing to visualize complex patterns
3. **Compare dates**: Jump between historical dates to see changes
4. **Verify externally**: Cross-check positions with Stellarium or NASA Horizons
5. **Read the Inspector**: Click planets to understand their current orbital state

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Slow performance | Reduce time speed, hide some objects |
| Can't find an object | Use the Objects panel to ensure it's visible |
| View is disoriented | Click RESET to return to default view |
| Time seems wrong | Check if simulation is paused; verify timezone |

---

**Previous**: [Introduction](01-introduction.md) - Model overview
**Next**: [Glossary](03-glossary.md) - Essential terms defined
