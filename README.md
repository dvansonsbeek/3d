# Fibonacci Laws of Planetary Motion — Interactive 3D Solar System Simulation

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Version](https://img.shields.io/badge/version-8-green.svg)](https://github.com/dvansonsbeek/3d)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-orange.svg)](https://threejs.org/)

![Solar System Simulation](https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/readme.png)

> **[Live Demo](https://3d.holisticuniverse.com)** — Experience the simulation in your browser
>
> **[Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v3)** — Read the accompanying research paper

What if the orbits of all eight planets, the wobble of Earth's axis, and the rhythm of ice ages are all governed by the same mathematical structure?

This interactive 3D simulation visualizes the **Fibonacci Laws of Planetary Motion** — six laws that connect every planet's orbital tilt, shape, and precession to a single timescale. Built with just **6 free parameters**, the simulation accurately reproduces the geocentric positions of the Sun, Moon, and all seven planets — verified against JPL Horizons ephemeris data (~1800–2200 AD) and over 700 historical astronomical observations (~2000 BC to ~4000 AD). From the same geometric framework, it simultaneously produces obliquity, eccentricity, perihelion precession, and inclination oscillation for all planets.

---

## Two Motions, One Ratio

The model starts from a single observation: two of Earth's precession motions rotate in **opposite directions**.

| Motion | Direction | Cycle |
|--------|-----------|-------|
| Axial Precession | Clockwise | ~25,794 years |
| Inclination Precession | Counter-clockwise | ~111,772 years |

These two counter-rotating motions interact in a **Fibonacci ratio of 3:13**. From this starting point, the model derives what is normally calculated separately: precession of the equinoxes, obliquity oscillation, eccentricity cycles, Milankovitch beat frequencies, the length of days and years, and climate patterns including ice ages.

Everything comes together in the **Earth Fundamental Cycle (H)**: a 335,317-year master cycle from which Earth's major precession periods emerge as Fibonacci divisions (H/3, H/5, H/8, H/13) — and this simulation visualizes it all in one interactive view.

---

## The Six Fibonacci Laws

The model implements six laws — anchored on Earth and extending to all eight planets through Fibonacci numbers:

1. **Fibonacci Cycle Hierarchy** — Earth's major precession periods divide H by Fibonacci numbers (H/3, H/5, H/8, H/13). A hierarchy unique to Earth.
2. **Inclination Amplitude Constant** — A single constant ψ predicts all eight inclination amplitudes from Fibonacci divisors and mass alone
3. **The Inclination Balance** — Seven planets' angular-momentum-weighted oscillations balance against Saturn alone (anti-phase) to 99.9975%
4. **Eccentricity Amplitude Constant** — A single constant K predicts all eight eccentricity amplitudes from Fibonacci divisors, mass, distance, and axial tilt
5. **The Eccentricity Balance** — Seven planets' eccentricities balance against Saturn alone using the same Fibonacci divisors and phase groups as Law 3 (99.86%)
6. **Saturn-Jupiter-Earth Resonance** — Earth's H/8 obliquity cycle equals both Jupiter's ICRF perihelion and Saturn's ecliptic perihelion: a triple identity at H/8 by which the gas giants gravitationally drive Earth's spin-axis dynamics through their well-known mutual resonance lock

The Fibonacci divisors follow a mirror symmetry: Mercury↔Uranus, Venus↔Neptune, Earth↔Saturn, Mars↔Jupiter. Out of 7,558,272 candidate configurations, five successive physical filters (inclination balance, eccentricity balance, Laplace–Lagrange bounds, direction match, and mirror symmetry) narrow the field to 43 viable candidates — of which only one is mirror-symmetric.

See the [Fibonacci Laws documentation](docs/10-fibonacci-laws.md) for the full derivation, and [verify-laws.js](tools/verify/verify-laws.js) for comprehensive verification (44/45 checks pass).

---

## How It Works

The Sun is still the center of our solar system. The model uses a geo-heliocentric frame — viewing from Earth's perspective — to make the two counter-rotating precession motions visible:

- **Earth wobbles** clockwise around a reference point (the EARTH-WOBBLE-CENTER) in ~25,794 years — this is axial precession
- **Earth's perihelion point** wobbles counter-clockwise around the Sun in ~111,772 years — this is inclination precession
- These two motions **meet every ~20,957 years** — producing perihelion precession
- Earth orbits its perihelion point (close to the Sun) in 1 solar year, and all planets orbit their own perihelion points following Kepler's 3rd law

The result: obliquity, eccentricity, inclination, and all precession movements emerge from just two opposing forces in a 3:13 ratio.

For more details see [holisticuniverse.com](https://holisticuniverse.com).

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher) — for the simulation and optimization tools
- [Python 3](https://www.python.org/) (optional) — needed for ML training (`tools/fit/python/`) and statistical analysis (`scripts/`)

### Installation

```bash
git clone https://github.com/dvansonsbeek/3d.git
cd 3d
npm install
npm start
```

The simulation will open in your browser at `http://localhost:1234`

### Orbital Data Explorer (Dashboard)

An interactive data dashboard for exploring planetary orbital elements across a full Earth Fundamental Cycle:

```bash
npm run dashboard:export   # generate JSON data from the orbital engine
npm run dashboard          # start dashboard at http://localhost:5050
```

Features: multi-planet overlay, synchronized zoom/pan, light/dark mode, CSV export, range presets (Full H, H/3, H/5, H/8, H/13, H/16), and obliquity decomposition for Earth.

### Python Analysis Scripts (Optional)

The `scripts/` directory contains statistical analysis and verification scripts (Fibonacci significance tests, exoplanet tests, eccentricity analysis, Milankovitch spectral analysis on LR04 + Cheng2016 paleoclimate records, Planet Nine falsification). To use them:

```bash
pip install -r requirements.txt   # numpy, pandas, openpyxl, scipy
python3 scripts/fibonacci_significance.py
```

### Build for Production

```bash
npm run build
```

---

## Features

- Interactive 3D solar system with textured planets, rings, shadows, and starfield
- Equation of center (variable speed) and empirical parallax corrections for all planets
- Time controls: play, pause, speed adjustment, and date navigation
- Click any planet to focus the camera and see its orbital data
- Planet info sidebar with per-planet data, charts, and precession analysis
- [Eccentricity Balance Scale](docs/38-eccentricity-scale.md) for visualizing Law 5 balance per planet
- [Invariable Plane Balance Explorer](docs/53-balance-explorer-reference.md) for interactive Fibonacci Law testing
- Console tests for year length, day length, and calibration verification
- Export functionality for solstice dates and object positions
- Built with [Three.js](https://threejs.org/) and [Tweakpane v4](https://tweakpane.github.io/docs/)

---

## Related Findings — Mass Calibration Chain

The model's gravitational parameters (`GM_Sun`, `GM_Earth`, `GM_Moon`, `GM_planet`) are computed from a self-consistent chain rather than copied from a reference table. The chain re-parameterizes classical 19th–20th century perturbation results (Hill 1878, Brown 1908, Brouwer 1959) into compact closed forms and verifies the synthesis against JPL DE440 reference data. The physics is classical; the contribution is **synthesis and presentation**:

- **[Doc 24 — Moon Kepler Derivation](docs/24-moon-kepler-derivation.md)** — Re-parameterizes Hill-Brown's solar perturbation on the lunar orbit as `Δa = a_M·μ·m` (barycentric wobble × phase-fraction). Reproduces the textbook 384,748 km Kepler-effective Moon distance from the geometric LLR value (384,399 km), giving `GM_Earth` to 3.7 ppm vs DE440 — the precision floor of any Kepler-from-Moon-orbit derivation
- **[Doc 25 — Universal Mass-from-Moon Formula](docs/25-universal-mass-from-moon-formula.md)** — Packages three classical terms (Newton's two-body Kepler + Hill-Brown's solar perturbation + Brouwer's J2 oblateness) as a single closed-form formula and verifies it against 22 moons of 7 planets. Matches DE440 to 3–340 ppm — a synthesis demonstration, not a new physical law
- **[Doc 26 — Universal Sun-side Δa Formula](docs/26-universal-sun-side-delta-a.md)** — An algebraic identity: the symmetric `Δa = a·(1 − ((μ_S+μ_E−μ_b)/(μ_S+μ_E))^(1/3))` makes the elaborate two-body Kepler form algebraically identical to the simple `T = 2π·√(a³/(μ_S+μ_E))` for every planet. Useful as a conceptual lens; the model uses the simple form

These are calibration findings, not Fibonacci Laws, and not improvements on Newton. The physics is fully classical; the contribution is pedagogical — cleaner notation, a closed-form derivation of a textbook value, and a unified-formula demonstration across all moon-bearing planets in DE440. Suitable for an undergraduate astrodynamics or physics-education context.

**Headline numbers:** The model derives `GM_Earth` and `GM_Moon` to ~4 ppm and `GM_Sun` to 0.07 ppm against JPL DE440. These residuals sit at the precision floor of Kepler-from-Moon-orbit derivations (Hill-Brown m⁴-and-beyond terms), and fall inside the ~22 ppm uncertainty in `G` that bounds any mass-in-kg statement.

---

## Documentation

Detailed documentation is available in the [`/docs`](docs/00-readme.md) folder, organized by category:

| Range | Category | Start here |
|-------|----------|------------|
| 00–09 | Getting Started & Overview | [Introduction](docs/01-introduction.md), [User Guide](docs/02-user-guide.md), [Glossary](docs/03-glossary.md) |
| 10–19 | Theory & Model | [Fibonacci Laws](docs/10-fibonacci-laws.md) |
| 20–29 | Technical Reference | [Constants Reference](docs/20-constants-reference.md), [Formulas](docs/21-orbital-formulas-reference.md) |
| 30–39 | Calculations | [Anomaly](docs/30-anomaly-calculations.md), [Ascending Nodes](docs/31-ascending-node-calculations.md), [Inclination](docs/32-inclination-calculations.md) |
| 40–49 | Architecture & Code | [Architecture](docs/40-architecture.md), [Scene Graph](docs/41-scene-graph-hierarchy.md) |
| 50–59 | UI & Tools | [UI Panels](docs/50-ui-panels-reference.md), [Balance Explorer](docs/53-balance-explorer-reference.md) |
| 60–69 | Optimization & Fitting | [Overview](docs/60-optimization-tool-overview.md), [Fitting Pipeline](tools/fit/README.md) |
| 70–79 | Verification | [Ascending Node Limitations](docs/70-ascending-node-limitations.md) |
| 80–99 | Appendices | Code scripts and data spreadsheets |

**Investigation & Verification:**
- [Python Scripts](scripts/) — Statistical significance tests, exoplanet Fibonacci tests, eccentricity analysis, Milankovitch paleoclimate tests
- [Milankovitch Framework (Doc 16)](docs/16-milankovitch-language.md) and [Empirical Evidence (Doc 17)](docs/17-milankovitch-evidence.md) — Empirical tests of the H/3 = 111.77-kyr inclination attribution against LR04 + Cheng2016 U-Th-dated speleothem records
- [Fitting Pipeline](tools/fit/README.md) — Pipeline: Earth perihelion harmonics, ML precession prediction, parallax corrections, solar measurements, obliquity/cardinal-point/year-length harmonics
- [Predictive Formula Guide](tools/lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — 429-term ML system for planetary precession prediction

---

## Fitting Pipeline

The model's constants are stored in 4 JSON files in `public/input/`. When you change any model parameter (e.g., H, eccentricityBase, planet orbital elements), the fitting pipeline recalibrates all derived coefficients so the simulation matches JPL Horizons observations.

```bash
node tools/fit/run-pipeline.js --all           # full pipeline (~2.5 hrs)
node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~15 sec)
node tools/fit/run-pipeline.js --phase2        # Steps 4a-9 (~2.5 hrs)
node tools/fit/run-pipeline.js --from 5        # resume from Step 5
```

The pipeline runs across 6 phases: Sun geometry → planet alignment → perihelion harmonics → ML training → parallax corrections → solar measurements & harmonic fits → verify → sync to script.js. Step 3 (browser data export) is always manual. Step 6a (solar measurements) exports all cardinal points, perihelion/aphelion, and world-angles in a single scene-graph pass; steps 6b-6e fit harmonics from that data. See [tools/fit/README.md](tools/fit/README.md) for the full reference.

**Safety**: Step 8 (`verify-pipeline.js`) validates all results against IAU reference values before syncing to `script.js`. If any parameter change produces unrealistic values — e.g., year lengths that differ from IAU by more than 1 second, obliquity that doesn't match J2000 within 0.01", or planet baselines that regress — the pipeline stops and reports which checks failed. This prevents invalid parameter changes from propagating into the simulation.

---

## Quick Facts

- **Master cycle**: 335,317 years (the Earth Fundamental Cycle, H)
- **Axial precession**: ~25,794 years (H/13)
- **Inclination precession**: ~111,772 years (H/3)
- **Perihelion precession**: ~20,957 years (H/16)
- **Model parameters**: 70 model parameters (Earth 11, Moon 3, 7 planets x 8) and 75 calibration inputs from astronomical observations — with only **6 free parameters** for the entire model

---

## Roadmap

- [ ] Add more celestial objects

---

## Credits

- [Three.js](https://threejs.org/) — 3D rendering library
- [Tychosium](https://codepen.io/pholmq/pen/XGPrPd) — Inspiration
- [Solar System Scope](https://www.solarsystemscope.com/textures/) — Planet textures
- [Yale Bright Star Catalog](https://github.com/brettonw/YaleBrightStarCatalog) — Star data

## License

This software is licensed under the **GNU General Public License (GPL-3.0)**.
See the [LICENSE](https://www.gnu.org/licenses/gpl-3.0) for details.

## Contact

For questions about the model or if you want to help develop this further:

- **Email:** [dennis@holisticuniverse.com](mailto:dennis@holisticuniverse.com)
- **Website:** [holisticuniverse.com](https://holisticuniverse.com)
- **GitHub Issues:** [Report a bug or request a feature](https://github.com/dvansonsbeek/3d/issues)
