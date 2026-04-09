# Holistic Universe Model — Documentation

This is the technical documentation for the [3D Solar System Simulation](https://3d.holisticuniverse.com). It covers the theory, calculations, architecture, and tooling behind the model. If you're looking for the scientific background, visit [holisticuniverse.com](https://holisticuniverse.com).

**Who is this for?**
- **Curious readers** — start with the [Introduction](01-introduction.md) and [Fibonacci Laws](10-fibonacci-laws.md)
- **Users of the simulation** — see the [User Guide](02-user-guide.md)
- **Contributors & developers** — the [Architecture](40-architecture.md), [Constants Reference](20-constants-reference.md), and [Optimization Tool](60-optimization-tool-overview.md) are your starting points

---

## Document Structure

Documents are organized in numbered ranges by category, with gaps for future additions:

| Range | Category |
|-------|----------|
| 00–09 | Getting Started & Overview |
| 10–19 | Theory & Model |
| 20–29 | Technical Reference |
| 30–39 | Calculations & Implementations |
| 40–49 | Architecture & Code Structure |
| 50–59 | UI, Features & Tools |
| 60–69 | Optimization Tool |
| 70–79 | Verification & Investigation |
| 80–97 | Appendices (code scripts) |
| 98–99 | Appendices (data/spreadsheets) |

---

## Document Index

### 00–09 Getting Started & Overview

| # | Document | Description |
|---|----------|-------------|
| 01 | [Introduction](01-introduction.md) | Core concepts, the two forces, the Holistic-Year |
| 02 | [User Guide](02-user-guide.md) | How to use the 3D simulation — controls, panels, features |
| 03 | [Glossary](03-glossary.md) | Essential terms and definitions |
| 04 | [Dynamic Elements Overview](04-dynamic-elements-overview.md) | How orbital elements change over time |
| 05 | [Invariable Plane Overview](05-invariable-plane-overview.md) | The invariable plane extension (Souami & Souchay work) |

### 10–19 Theory & Model

| # | Document | Description |
|---|----------|-------------|
| 10 | [Fibonacci Laws](10-fibonacci-laws.md) | Six Fibonacci Laws: precession cycles, inclination and eccentricity constants, balance conditions, resonance |
| 11 | [Day & Year Length Formulas](11-length-day-year-formulas.md) | Tropical year and day length: measurement methods, validation, proposed formulas |
| 12 | [Perihelion Precession](12-perihelion-precession.md) | Perihelion longitude and precession rate calculations |
| 13 | [Mercury Precession Breakdown](13-mercury-precession-breakdown.md) | Mercury's perihelion precession by contributing planet |
| 14 | [Solstice Prediction](14-solstice-prediction.md) | Solstice RA and timing from Fibonacci harmonics (H/3, H/8, H/16) |

### 20–29 Technical Reference

| # | Document | Description |
|---|----------|-------------|
| 20 | [Constants Reference](20-constants-reference.md) | **Single source of truth** for all constants, parameters, and their sources |
| 21 | [Orbital Formulas Reference](21-orbital-formulas-reference.md) | Formula implementations and the OrbitalFormulas helper |
| 22 | [Coordinate Frames](22-coordinate-frames.md) | ICRF, ecliptic, equatorial, and invariable plane transformations |
| 23 | [Verification Data Reference](23-verification-data-reference.md) | Astronomical verification data: transits, oppositions, conjunctions |

### 30–39 Calculations & Implementations

| # | Document | Description |
|---|----------|-------------|
| 30 | [Anomaly Calculations](30-anomaly-calculations.md) | Mean, True, and Eccentric Anomaly |
| 31 | [Ascending Node Calculations](31-ascending-node-calculations.md) | Ascending node precession on ecliptic and invariable plane |
| 32 | [Inclination Calculations](32-inclination-calculations.md) | Inclination oscillations and ecliptic inclination |
| 33 | [Invariable Plane Calculations](33-invariable-plane-calculations.md) | Height above/below invariable plane, plane crossings |
| 34 | [J2000 Calibration](34-j2000-calibration.md) | J2000-verified ascending nodes methodology |
| 35 | [Formula Derivation](35-formula-derivation.md) | Planetary precession formula derivation: Fibonacci hierarchy, resonance loops, coefficient breakdowns |
| 36 | [Tilt & Balance Calculations](36-tilt-and-definitive-balance-calculations.md) | Tilt, inclination, and eccentricity: definitive balance calculations across all epochs |
| 38 | [Eccentricity Balance Scale](38-eccentricity-scale.md) | Eccentricity as a balance system: weight formula, per-planet breakdowns, amplitude constant |
| 39 | [Eccentricity Structure Exploration](39-eccentricity-structure-exploration.md) | Two-component decomposition, mirror pair conservation, statistical significance, exhaustive negative results |

### 40–49 Architecture & Code Structure

| # | Document | Description |
|---|----------|-------------|
| 40 | [Architecture](40-architecture.md) | Code structure, file organization, and module responsibilities |
| 41 | [Scene Graph Hierarchy](41-scene-graph-hierarchy.md) | Three.js nested rotation layers — how the model builds orbital mechanics |

### 50–59 UI, Features & Tools

| # | Document | Description |
|---|----------|-------------|
| 50 | [UI Panels Reference](50-ui-panels-reference.md) | Tweakpane control panel and sidebar implementations |
| 51 | [Planet Inspector Reference](51-planet-inspector-reference.md) | Planet hierarchy inspector — calculation logic and display |
| 52 | [Analysis & Export Tools](52-analysis-export-tools.md) | Report generation, data export, and console validation tests |
| 53 | [Balance Explorer Reference](53-balance-explorer-reference.md) | Invariable Plane Balance Explorer — interactive Fibonacci Law testing |

### 60–69 Optimization Tool

| # | Document | Description |
|---|----------|-------------|
| 60 | [Overview](60-optimization-tool-overview.md) | Architecture and constraints |
| 61 | [Execution Plan](61-optimization-execution-plan.md) | Step-by-step execution plan |
| 62 | [Type I Inner Planets](62-type-i-inner-planets.md) | Mercury & Venus implementation |
| 63 | [Type II Earth-Crossers](63-type-ii-earth-crossers.md) | Mars eccentricity corrections & calibration |
| 64 | [Type III Outer Planets](64-type-iii-outer-planets.md) | Jupiter, Saturn, Uranus, Neptune implementation |
| 65 | [Equation of Center](65-equation-of-center.md) | Variable-speed orbit implementation |
| 66 | [Moon Meeus Corrections](66-moon-meeus-corrections.md) | Meeus-based moon corrections |
| 67 | [Planet Parallax Corrections](67-planet-parallax-corrections.md) | Geocentric parallax correction implementation |
| 68 | [Orbital Period Calibration](68-orbital-period-calibration.md) | Calibration with ancient observations |
| 69 | [Baseline Report](69-optimization-baseline.md) | Baseline measurements before optimization |

### 70–79 Verification & Investigation

| # | Document | Description |
|---|----------|-------------|
| 70 | [Ascending Node Limitations](70-ascending-node-limitations.md) | Limitations of ascending node model and JPL discrepancy |

### 80–99 Appendices

**Verification scripts** — standalone Node.js scripts that verify, compute, or analyze model parameters. Run with `node tools/verify/<filename>`.

| Script | Description |
|--------|-------------|
| [ascending-node-optimization.js](../tools/verify/ascending-node-optimization.js) | Numerical optimization to calculate ascending node values |
| [analytical-ascending-nodes.js](../tools/verify/analytical-ascending-nodes.js) | Analytical (closed-form) calculation using spherical trigonometry |
| [ascending-node-verification.js](../tools/verify/ascending-node-verification.js) | Verifies J2000-verified values produce correct ecliptic inclinations |
| [ascending-node-souami-souchay.js](../tools/verify/ascending-node-souami-souchay.js) | Compares Souami & Souchay original vs verified ascending node accuracy |
| [inclination-optimization.js](../tools/verify/inclination-optimization.js) | Computes Fibonacci-derived inclination amplitudes and means with balance verification |
| [inclination-verification.js](../tools/verify/inclination-verification.js) | Verifies inclination parameters against J2000 and JPL trends |
| [mercury-precession-centuries.js](../tools/verify/mercury-precession-centuries.js) | Mercury perihelion precession analysis by century |
| [balance-search.js](../tools/verify/balance-search.js) | Exhaustive search of all Fibonacci divisor configurations; generates data/balance-presets.json |
| [verify-laws.js](../tools/verify/verify-laws.js) | Comprehensive verification of all six laws + findings |
| [configuration-analysis.js](../tools/verify/configuration-analysis.js) | Filter intersection analysis of all 7.56M Fibonacci divisor configurations |
| [eccentricity-balance.js](../tools/verify/eccentricity-balance.js) | Pair decomposition, Law 5 sensitivity analysis |
| [epoch-independence.js](../tools/verify/epoch-independence.js) | AMD exchange across mirror pairs, balance stability across Saturn's secular cycle |

> **Note:** Scripts 80 and 81 calculate the same ascending node values using different methods (numerical vs analytical). Both produce identical results, proving the geometric validity of the approach.

**Data & spreadsheets (98–99)**

| # | File | Description |
|---|------|-------------|
| 98 | [Holistic Year Objects Data](../data/01-holistic-year-objects-data.xlsx) | Planetary positions and orbital elements spanning one complete Holistic Year |

---

## Project Infrastructure

Beyond the documentation, the project includes several tool directories that power the optimization, verification, and data pipelines.

### `tools/lib/` — Core Engine

The shared libraries that both the simulation (`src/script.js`) and the optimization tool use:

| File | Description |
|------|-------------|
| `constants.js` | All model constants (mirrors `src/script.js` config) — the code-level single source of truth |
| `scene-graph.js` | Headless scene graph: builds the same orbital hierarchy as Three.js without a browser |
| `orbital-engine.js` | Computes planet positions for any date using the scene graph |
| `optimizer.js` | Parameter optimization engine with JPL reference comparison |
| `precession.js` | IAU 1976 precession correction (J2000 → of-date frame conversion) |
| `horizons-client.js` | JPL Horizons API client for fetching reference ephemeris data |

### `tools/optimize.js` — CLI Entry Point

The main command-line tool for running optimizations:

```bash
node tools/optimize.js <command> <target>
```

See [Optimization Tool Overview](60-optimization-tool-overview.md) for full documentation.

### `tools/pipeline/` — Reference Data Pipeline

Scripts that fetch, enrich, and export reference data from JPL Horizons:

| File | Description |
|------|-------------|
| `enrich-with-jpl.js` | Fetch JPL ephemeris data for reference dates |
| `enrich-planet-reference.js` | Generate enriched planet reference data |
| `generate-moon-reference.js` | Generate moon reference data |
| `add-jpl-reference-points.js` | Add JPL data points to reference dataset |
| `export-reference-data.js` | Export reference data to config files |
| `import-tycho-mars.js` | Import Tycho Brahe Mars observations |
| `patch-planet-test-dates.js` | Patch test dates for planet verification |

### `tools/explore/` — Investigation Scripts

Ad-hoc analysis and exploration scripts used during development:

| File | Description |
|------|-------------|
| `conjunction-finder.js` | Find planetary conjunctions and validate against observations |
| `resonance-loop.js` | Saturn–Jupiter–Earth resonance loop analysis (Law 6) |
| `year-lengths.js` | Measure tropical/sidereal/anomalistic year lengths |
| `moon-cycles.js` | Moon cycle analysis (synodic, anomalistic, nodal) |
| ... | And ~10 more investigation scripts |

### `tools/fit/` — Fitting & Derivation Scripts

Centralized scripts for fitting harmonics, deriving constants, and generating training data.
Run in dependency order when model parameters change (see `tools/fit/README.md`).

| File | Description |
|------|-------------|
| `export-solar-measurements.js` | Single-pass export: cardinal points, perihelion/aphelion, world-angles |
| `obliquity-harmonics.js` | Fit 16-harmonic obliquity formula (J2000-anchored) |
| `cardinal-point-harmonics.js` | Fit 24-harmonic JD formula per cardinal point (IAU-anchored) |
| `year-length-harmonics.js` | Fit sidereal + anomalistic year harmonics from solar measurements |
| `eoc-constants.js` | Derive Equation of Center constants from first principles |
| `eoc-fractions.js` | Derive per-planet EoC fractions from reference data |
| `perihelion-offset.js` | Derive perihelion phase offset analytically |
| `parallax-correction.js` | Fit extended parallax correction coefficients (up to 42p) |
| `parallax-greedy-select.js` | Greedy forward selection for parallax model terms |
| `ascnode-correction.js` | Optimize ascending node tilt corrections |

### `data/` — Runtime Data

| File | Description |
|------|-------------|
| `reference-data.json` | JPL-verified reference positions for all planets (used by optimizer) |
| `jpl-cache.json` | Cached JPL Horizons API responses |
| `tycho-mars-raw.csv` | Tycho Brahe's Mars opposition observations (1580–1600) |

### `scripts/` — Python Analysis

Statistical analysis and verification scripts. Install dependencies with `pip install -r requirements.txt`.

| File | Description |
|------|-------------|
| `fibonacci_significance.py` | Fisher's exact test for statistical significance of Fibonacci structure |
| `fibonacci_exoplanet_test.py` | TRAPPIST-1 exoplanet system Fibonacci test |
| `fibonacci_eccentricity_scale.py` | Eccentricity balance scale: weight formula, per-planet breakdowns, offset ratios |
| `fibonacci_eccentricity_structure.py` | Structural decomposition, mirror pair conservation, 10-direction exploration, statistical tests |
| `predict_tilt_from_eccentricity.py` | K amplitude constant (Law 4) investigation |

> The shared Python library (`constants_scripts.py`, `predictive_formula.py`, `observed_formula.py`, `coefficients/`) lives in [`tools/lib/python/`](../tools/lib/python/README.md).

See the [Python Scripts README](../scripts/README.md) and [Predictive Formula Guide](../tools/lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) for details.

---

## Key Concepts

| Concept | Value | Description |
|---------|-------|-------------|
| Holistic-Year (H) | 335,317 years | Complete cycle unifying all precession movements |
| Axial Precession | H/13 (~25,794 yr) | Earth's wobble around the EARTH-WOBBLE-CENTER |
| Inclination Precession | H/3 (~111,772 yr) | PERIHELION-OF-EARTH orbit period |
| Perihelion Precession | H/16 (~20,957 yr) | Combined cycle where axial meets inclination |
| Obliquity Range | ~22.1° – ~24.5° | Earth's axial tilt oscillation |

For all constants and their sources, see the [Constants Reference](20-constants-reference.md).
