# 🌌 Fibonacci Laws of Planetary Motion — Interactive 3D Solar System Simulation

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Version](https://img.shields.io/badge/version-6-green.svg)](https://github.com/dvansonsbeek/3d)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-orange.svg)](https://threejs.org/)

![Solar System Simulation](https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/readme.png)

> **[🚀 Live Demo](https://3d.holisticuniverse.com)** — Experience the simulation in your browser
>
> **[📄 Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v1)** — Read the accompanying research paper

Interactive 3D simulation of the Fibonacci Laws of Planetary Motion. Six laws and only 6 free parameters model the precession, eccentricity, inclination, obliquity and perihelion movements of all planets from a geo-heliocentric frame of reference. The Holistic-Year cycle of 333,888 years unifies axial precession (~25,684 yr, H/13), inclination precession (~111,296 yr, H/3) and perihelion precession (~20,868 yr, H/16) through Fibonacci number ratios. Earth is defined by 25 parameters, the Moon by 9, and each planet by 13.

---

## 📦 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/dvansonsbeek/3d.git

# Navigate to project directory
cd 3d

# Install dependencies
npm install

# Start development server
npm start
```

The simulation will open in your browser at `http://localhost:1234`

### Build for Production

```bash
npm run build
```

---

## 🔭 The Model Explained

### How it is modelled

- The **EARTH-WOBBLE-CENTER** is the center of our solar system.
- Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~25,684 solar years, also known as Axial precession and therefore the Axial tilt changes.
- The **PERIHELION-OF-EARTH** is orbiting the EARTH-WOBBLE-CENTER - and therefore Earth - counter-clockwise in a period of 111,296 solar years, also known as Inclination precession and therefore the inclination tilt changes.
- Axial precession meets Inclination precession every 20,868 years.
- Our Sun is orbiting the PERIHELION-OF-EARTH in a period of 1 solar year.
- Therefore it shows as if the Sun is orbiting Earth.

### What is actually happening

- The Sun is (still) the center of our solar system.
- Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~25,684 solar years, also known as Axial precession and therefore the Axial tilt changes.
- The PERIHELION-OF-EARTH is wobbling around the Sun counter-clockwise in a period of 111,296 solar years, also known as Inclination precession and therefore the inclination tilt changes.
- Axial precession meets Inclination precession every 20,868 years.
- Earth is orbiting the PERIHELION-OF-EARTH - close to the Sun - in a period of 1 solar year.
- Therefore it shows Earth is actually orbiting the Sun.
- So we still live in a Heliocentric solar system.
- All planets in our solar system are orbiting their perihelion-point according to Kepler's 3rd law.

### Fibonacci Laws of Planetary Motion

The model implements six Fibonacci Laws connecting planetary orbital parameters through pure Fibonacci numbers:

1. **Law 1 — Fibonacci Cycle Hierarchy**: The Holistic Year H = 333,888 years divided by Fibonacci numbers F(n) produces all major precession periods (H/3 = inclination cycle, H/13 = axial precession, H/16 = perihelion precession), with beat-frequency relationships between them.
2. **Law 2 — The Inclination Constant**: Each planet's inclination amplitude satisfies `d × amplitude × √mass = ψ`, where `d` is a pure Fibonacci number and `ψ = 2205/(2×333888)` is a universal constant. Config #32 (the unique mirror-symmetric configuration) assigns d = 21, 34, 3, 5, 5, 3, 21, 34 to Mercury through Neptune.
3. **Law 3 — The Inclination Balance**: The structural weights `w = √(m·a(1-e²)) / d` of the two phase groups (203° and 23°) balance to **99.9998%**, grounding the theory in conservation of angular momentum. Saturn is the sole retrograde (23°) planet.
4. **Law 4 — The Eccentricity Constant**: The AMD (Angular Momentum Deficit) partition ratio `R² = AMD_planet / AMD_total` for each planet equals a ratio of Fibonacci numbers, linking eccentricity to the same d-assignments.
5. **Law 5 — The Eccentricity Balance**: The eccentricity weights `v = √m × a^(3/2) × e / √d` balance to **99.88%** between the same two phase groups — an independent constraint using different powers of mass, distance, and d.
6. **Law 6 — Saturn-Jupiter-Earth Resonance**: Saturn's inclination precession, Jupiter's inclination precession, and Earth's axial precession form a closed beat-frequency loop, connecting inner and outer solar system dynamics.

The mirror-symmetric d-assignments (Mercury↔Uranus=21, Venus↔Neptune=34, Earth↔Saturn=3, Mars↔Jupiter=5) uniquely identify Config #32 as the only valid configuration out of 755 candidates. See [Fibonacci Laws documentation](docs/26-fibonacci-laws.md) for the full derivation, [Appendix L](docs/appendix-l-verify-laws.js) for comprehensive verification (49/49 checks pass).

### Additional explanation

- The inclination (J2000 value ~1.57869°) and axial tilt together result in the obliquity of Earth's axis (J2000 value +23°26'21").
- There are only two counter movements around Earth working against each other in a ratio of 3:13 ; Inclination:Axial which explains all movements around Earth (precession, eccentricity, obliquity, inclination, etc)
- The currently experienced precession is NOT the mean value and all precession movements are always experienced in the same ratio (e.g. experienced perihelion precession is around 13/16th of Axial precession: ~25,771×13/16 = ~20,939 years)
- The Perihelion precession cycle of 20,868 years determines the natural cycles of the length of solar days, sidereal days, solar years, sidereal years and anomalistic years.
- The EARTH-WOBBLE-CENTER was aligned in 1246 AD with the PERIHELION-OF-EARTH and therefore the length of solar year in days and the length of sidereal year in seconds were MEAN in 1246 AD.

For more details see [holisticuniverse.com](https://holisticuniverse.com).

---

## 🎯 Why 333,888 Years?

This number fits all observations best and aligns all year and day calculations:

1. Historic value longitude of perihelion 90°: 1245-12-14
2. J2000 value longitude of perihelion: 6h51m48s = ~102.95°
3. The Length of solar day, solar year in days, sidereal year in seconds aligned to 3D longitude values and historic values
4. Climate graphs with ~111k cycles as a cycle of 111,296 years (three times 111,296 years = 333,888 years)
5. End of Last Glacial Maximum (LGM) around 23,100 BC when inclination to inv plane was max
6. End of Younger Dryas just after 11000 BC when obliquity was max
7. **KEY EVIDENCE:** Mercury perihelion precession aligned to ~575 arc seconds per century
8. **KEY EVIDENCE:** The difference sidereal day - stellar day leads to the difference solar year - sidereal year
9. **KEY EVIDENCE:** Solar day, sidereal day, tropical year, sidereal year and anomaliztic year all align perfectly with 333,888 year cycle
10. Obliquity correct both historic and current values
11. Orbital Inclination to ICRF correct both historic and current values
12. Eccentricity correct for current values

---

## 🚀 Technical Basics

- Uses a teaching/visualization scale: 1 AU = 100 units; 1 solar year = 2π (the fundamental time angle)
- All other motions are expressed relative to these bases
- The startdate is set to 21-06-2000 00:00 UTC because:
  - Close to actual June solstice (01:47 AM in the morning of 21 June)
  - Earth axis is pointing (close) to Polaris
  - Close to J2000 values so we can check and compare all values

---

## 🏛️ Core Architecture

**Supports:**
- Planet tilts and custom orbit inclinations
- Optional ring textures
- Emissive + textured planets
- Non-planet objects (perihelion, cycles) using `MeshBasicMaterial`
- Starfield background and constellations
- Dynamic ascending nodes and apparent inclinations

---

## 🔦 Lighting & Shadows

- **Primary light:** `DirectionalLight` simulating the Sun
- **Dynamic shadow frustum:** Updated based on focused planet
- **Fallback `PointLight`:** Used when the Sun itself is selected
- **Shadows:** Enabled only for true planets (not trace objects)

---

## 🌈 Materials

- **Planets:** `MeshPhongMaterial` with bump, specular, and emissive options
- **Trace objects:** `MeshBasicMaterial` with optional dimmed texture or fallback color

---

## 🛰️ Scene Structure

Each planet is structured like this:

```
orbitContainer → holds full orbit structure
  └── orbit → holds orbit visuals and pivot
       └── pivotObj → origin point offset to simulate eccentricity
            └── rotationAxis → applies axial tilt
                 └── planetMesh → spherical geometry, holds material
                      ├── ringObj (optional) → Saturn-style rings
                      └── axisHelperObj (optional) → debugging aid
```

---

## 🎯 Camera and Focus System

- Focused object stored in `o.lookAtObj`
- Camera `controls.target` updates each frame to follow focus
- Light and ring center dynamically update with the focused object
- Default focus on Earth

---

## ✨ Visual Effects

- **Focus ring:** Shown around Earth when Sun is selected
- **Sun glow:** Dynamically scaled by camera distance
- **Name tags and constellations:** Fading and scaling based on camera distance
- **Planet info sidebar:** Collapsible panel with per-planet data, charts, and precession analysis (mobile-responsive)
- **Planet Hierarchy Inspector:** Debug and analysis tool for orbital mechanics

---

## 🧠 UI Features

- [Tweakpane v4](https://tweakpane.github.io/docs/) control panel with collapsible folders
- About section with the Six Laws, free parameters, calibration inputs and all model parameters
- Chip-grid toggles for tracing orbits and show/hide of objects
- Time controls (play, pause, speed) and date/time navigation
- Console tests for year length, day length and calibration verification
- Export functionality for solstice dates and object positions
- [Invariable Plane Balance Explorer](docs/27-balance-explorer-reference.md) for interactive Fibonacci Law testing

---

## 📚 Documentation

Detailed documentation is available in the `/docs` folder. Start with the [Documentation Readme](docs/00-readme.md) for the complete reading order.

**Getting Started:**
- [Introduction](docs/01-introduction.md) - Core concepts and the Holistic-Year
- [User Guide](docs/02-user-guide.md) - How to use the 3D simulation
- [Glossary](docs/03-glossary.md) - Essential terms and definitions

**Conceptual Overview:**
- [Dynamic Elements Overview](docs/04-dynamic-elements-overview.md) - How orbital elements change over time
- [Invariable Plane Overview](docs/05-invariable-plane-overview.md) - The invariable plane reference frame
- [Scene Graph Hierarchy](docs/06-scene-graph-hierarchy.md) - Three.js nested rotation layers

**Technical Reference:**
- [Constants Reference](docs/10-constants-reference.md) - All constants and their sources
- [Orbital Formulas Reference](docs/11-orbital-formulas-reference.md) - Formula implementations

**Investigation & Verification Scripts:**
- [Python Scripts](docs/scripts/) - Statistical significance tests, perihelion precession analysis, exoplanet Fibonacci tests, and predictive formula system

---

## 🔜 Roadmap

- [ ] Create 100% correct formulas for solstice dates (beyond J. Meeus formula)
- [ ] Invariable plane improvements
- [ ] Start model at 12-14-1246 for exact eccentricity
- [ ] Confirm correct orbits for the Moon
- [ ] Confirm correct orbits for all planets
- [ ] Add more celestial objects

---

## ⭐ Credits

- [Three.js](https://threejs.org/) - 3D rendering library
- [Tychosium](https://codepen.io/pholmq/pen/XGPrPd) - Inspiration
- [Solar System Scope](https://www.solarsystemscope.com/textures/) - Planet textures
- [Yale Bright Star Catalog](https://github.com/brettonw/YaleBrightStarCatalog) - Star data

---

## 🧾 License

This software is licensed under the **GNU General Public License (GPL-3.0)**.

See the [LICENSE](https://www.gnu.org/licenses/gpl-3.0) for details.

---

## 📩 Contact

For questions about the model or if you want to help develop this further:

- **Email:** [dennis@holisticuniverse.com](mailto:dennis@holisticuniverse.com)
- **Website:** [holisticuniverse.com](https://holisticuniverse.com)
- **GitHub Issues:** [Report a bug or request a feature](https://github.com/dvansonsbeek/3d/issues)
