# User Guide: 3D Solar System Simulation

This guide explains how to use the Interactive 3D Solar System Simulation - the heart of the Holistic Universe Model where theory becomes something you can explore and verify.

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
- Perihelion date (when Earth is closest to the Sun)
- Simulation speed

**Date range**: The simulation supports dates from ancient history to far future, enabling observation of long-term precession cycles.

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

This gray sphere represents the gravitational center around which Earth's axis wobbles over ~25,684 years. It's the pivot point for axial precession.

**To observe**: Speed up time to 1,000+ years and watch Earth orbit this point.

### PERIHELION-OF-EARTH (White Dot)

This white dot marks the point closest to the Sun in Earth's orbit. It slowly moves counter-clockwise over ~111,296 years.

**To observe**: Speed up time to 10,000+ years and watch it drift through the zodiac.

### MID-ECCENTRICITY-POINT

A helper point used for calculating day and year lengths. It maintains a fixed distance from Earth, representing the mean orbital distance.

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

### Planet Inspector

Click on any planet to open detailed information:

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

### Objects Show/Hide

Toggle visibility of various elements:

| Object | Description |
|--------|-------------|
| **Planets** | Show/hide individual planets |
| **Orbits** | Show orbital paths |
| **Moon** | Show Earth's Moon |
| **Moon Nodes** | Show lunar nodal precession |
| **Moon Apsides** | Show lunar apsidal precession |
| **Invariable Plane** | Show the plane and crossings |
| **Ecliptic** | Show Earth's orbital plane |

### Celestial Tools

| Tool | Description |
|------|-------------|
| **Polar Line** | Shows Earth's axis orientation pointing toward Polaris |
| **Star Names** | Labels for prominent stars |
| **Constellations** | Constellation outlines |
| **Zodiac Wheel** | The 12 zodiac constellations centered on Earth |

### Trace Paths

Enable traces to see the path a body has traveled over time. Useful for:
- Venus's 5-petal pattern (8 years)
- Moon's nodal regression
- Planetary conjunctions

### Planet Size and Orbits

In the **Settings > Planets show/hide** folder:

| Control | Description |
|---------|-------------|
| **Orbits** | Toggle all orbital path lines on/off |
| **Size** | Slider (0.4 - 1.4) to scale planet sizes for visibility |
| **Individual planets** | Toggle each planet's visibility |

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

### Hierarchy Inspector

When the Hierarchy Inspector panel is open:

| Key | Action |
|-----|--------|
| **←** or **P** | Previous step |
| **→** or **N** | Next step |
| **Escape** or **Q** | Close inspector |

---

## Common Exploration Tasks

### Watch Axial Precession (~25,684 years)

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

1. Go to date **December 14, 1245**
2. Note perihelion aligns with December solstice
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
