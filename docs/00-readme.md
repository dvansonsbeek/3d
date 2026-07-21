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
| 80–89 | Per-Planet Setup |
| 90–99 | Climate Analysis |
| 100–109 | ΔT & Historical Eclipse Validation |

---

## Document Index

### 00–09 Getting Started & Overview

| # | Document | Description |
|---|----------|-------------|
| 01 | [Introduction](01-introduction.md) | Core concepts, the two forces, the Earth Fundamental Cycle |
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
| 15 | [Planet Nine Prediction](15-planet-nine-prediction.md) | Falsifiable test: the Fibonacci 4-pair structure forbids a major 9th planet at ETNO distances (canonical 7.5M-config search) |
| 19 | [Dual-Balance Sensitivity Analysis](19-balance-sensitivity-analysis.md) | Per-planet decomposition of the 0.14% eccentricity-balance gap (Law 5) + sensitivity table for Δm/m, Δa/a, Δe/e shifts that would close it. Required shifts are 4–6 orders of magnitude larger than DE440 mass and JPL period precision, formally ruling out single-planet observable mis-measurement. Establishes the asteroid/TNO-bodies hypothesis as the natural next analysis (TNOs at right order of magnitude; main belt too light) |

### 20–29 Technical Reference

| # | Document | Description |
|---|----------|-------------|
| 20 | [Constants Reference](20-constants-reference.md) | **Single source of truth** for all constants, parameters, and their sources |
| 21 | [Orbital Formulas Reference](21-orbital-formulas-reference.md) | Formula implementations and the OrbitalFormulas helper |
| 22 | [Coordinate Frames](22-coordinate-frames.md) | ICRF, ecliptic, equatorial, and invariable plane transformations |
| 23 | [Verification Data Reference](23-verification-data-reference.md) | Astronomical verification data: transits, oppositions, conjunctions |
| 24 | [Moon Kepler Derivation](24-moon-kepler-derivation.md) | The Δa correction for deriving GM_Earth/GM_Moon from the Moon's orbit |
| 25 | [Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) | Generalization of doc 24's Δa to all moon-bearing planets — Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto |
| 26 | [Universal Sun-side Δa Formula](26-universal-sun-side-delta-a.md) | Sun-side mirror of doc 25: exact symmetric Δa for deriving T_planet from heliocentric a — generalizes doc 24's Earth-only Δa = 149.77 km to every planet |
| 27 | [Law-4 TNO Obliquity Predictions](27-law4-tno-obliquity-predictions.md) | Bidirectional reading of Law 4: `sin(tilt) = e_amp·√m·a^(3/2) / (K·√d)` predicts axial obliquity from the secular eccentricity *amplitude*. Distinguishes proxy `e_obs ≈ e_amp` from the resonance-appropriate `e_obs = e_base + ∆`. For Pluto (integrated `e_amp ≈ 0.025`), actual amplitude decomposes into Law-4 intrinsic (~0.001) + Neptune-resonance external (~0.024) — ratio ≈ 1:24. **Law 4 captures the intrinsic; external forcing adds the rest** — not a failed test. **No named TNO is per-body testable** (all above admissibility curve); comets/asteroids also dominated by external forcing (Jupiter scattering, Yarkovsky/YORP). Clean remaining falsifier: population-statistical claim over sub-200-km low-`e` cold-classical-belt KBOs (100 km, a=45 AU, e=0.05 → tilt ≈ 36.6°, LSST 2030–2035). **§7 — scope interpretation**: Law-4 intrinsic dominance ≡ IAU's "cleared neighborhood" — quantitative restatement of planethood |

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
| 37 | [Planetary Precession & Obliquity Cycles](37-planets-precession-cycles.md) | Each planet's up-to-five distinct precession/oscillation phenomena. Investigates whether the Earth's Fibonacci 1/H rate structure extends to the other planets |
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
| 54 | [Vector Balance Analysis](54-vector-balance-analysis.md) | Dynamic angular-momentum vector balance + configuration verification. Default config (Me=21, Ve=34, Ea=3, Ma=5, Ju=5, Sa=3, Ur=21, Ne=34, Saturn anti-phase) shown to be the most likely correct Fibonacci d-value configuration |
| 55 | [Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) | Period table for the 8H = 2,682,536 yr Solar System Resonance Cycle. Every major planetary cycle divides 8H evenly as an integer; documents the System Reset epoch (~-2,649,854) |
| 56 | [WebGeoCalc Explorer](56-webgeocalc-explorer.md) | Tools-menu modal showing actual observed perihelion-precession history (1900–2026 JPL NAIF WebGeoCalc) for each planet. Grounds the framework's `perihelionEclipticYears` calibration in observation rather than secular theory |
| 57 | [Formula Verification](57-formula-verification.md) | Tools-menu modal comparing the framework's predictions against published analytical formulas (Meeus, Chapront, Capitaine, Vondrák, Laskar, Berger, Peters, Harkness) across ±12,000 yr for 9 quantities. Analytical twin of the WebGeoCalc Explorer (doc 56) |

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
| 71 | [Correction Stack Architecture](71-correction-stack-architecture.md) | Layer ordering, prepareForFitting(), parallax + gravitation + elongation |
| 72 | [The Closed Loop](72-the-closed-loop.md) | How PSI and K derive all orbital oscillations from Earth alone |

### 80–89 Per-Planet Setup

| # | Document | Description |
|---|----------|-------------|
| 80 | [Mercury Scene Graph Setup](80-mercury-setup.md) | Why each value in Mercury's 5-layer scene graph hierarchy is set the way it is. Companion to docs 41 (Scene Graph Hierarchy) and 51 (Planet Inspector) |

### 90–99 Climate Analysis

| # | Document | Description |
|---|----------|-------------|
| 90 | [Milankovitch Language of the Holistic Model](90-milankovitch-language.md) | Model framework: five H-divisor Milankovitch periods (H/3 inclination, H/5 ecliptic, H/8 obliquity, H/13 axial, H/16 perihelion precession) closed by Fibonacci beat algebra; Berger 1978 climatic-precession spectrum (~23.7/22.4/19.0 kyr peaks) matched <0.4 %; eigenmode convergence at H/3 and H/5 |
| 91 | [Milankovitch Evidence & Hypothesis Tests](91-milankovitch-evidence.md) | Combined evidence + hypothesis-test document. Empirical tests on LR04 + Cheng 2016 + EPICA + CENOGRID: 25/31-component 8H Orbital Forcing Formula, per-planet contributions (Mars dominance), 100-kyr-band centroid = Mercury–Mars s₁−s₄ nodal beat at n=25, MPT amplitude-growth analysis, pre-registered super-cycle hypothesis NULL on 20 ICS boundaries + spectral nulls on CENOGRID (§§8–11), fourteen falsifiable follow-up tests A–N (§12, 16 positive / 2 partials / 5 nulls), dedicated 405-kyr off-lattice characterization as a Layer-2 carbon-cycle silicate-weathering thermostat resonance (§13), combined interpretation (§14), Exocene naming convention (§15) |
| 92 | [Climate Formula — Architecture, Variance Decomposition & Implementation](92-climate-formula.md) | The canonical L1 + L2 + L3 climate formula with the modular per-regime ridge-fit architecture, complete LR04 + CENOGRID variance decomposition into five layers (L1 orbital lattice / L2 climate-system periodic / L3 boundary-condition shifts / L4 chronology / L5 stochastic), and the Climate Formula Explorer modal implementation in `src/script.js`. Per-regime LR04 R² = 0.87 post-MPT (vs 0.23 single-regime); EPICA CO₂ cross-proxy R² = 0.84; CenCO2PIP deep-time CO₂ R² = 0.76. Stitched per-regime evaluation lifts Full-LR04 chart R² to 0.93. Sections §10–§14 cover EPICA carbon-amplification ratios, CenCO2PIP synthesis, stitched routing rules, the 8-tab modal reference, and the reproducing pipeline (script chain → JSON → `export-to-script.js` sync → `CLIMATE_FORMULA_COEFFS` const) |
| 93 | [L1 Lattice Attribution Reference](93-l1-attribution-reference.md) | Per-L1-integer dual attribution: Berger / secular-theory label **vs** our model's best Earth–planet beat from PLANET_CYCLES, scored by physical plausibility. Three-step status (no Berger / planet ≠ / mech ≠ / agree) on all 32 components. Companion `93-l1-attribution-reference-baseline.md` runs the same analysis with pre-2026-05-28 PLANET_CYCLES (no Mars/Uranus tweaks) so the framework's tweak rationale is auditable. Generated by `scripts/milankovitch_l1_dual_attribution.py` (`--tweaked` / `--baseline`) |
| 94 | [Insolation Extension Test (strong null)](94-insolation-null-test.md) | Tests whether adding classical Berger 1978 insolation features (obliquity ε(t), eccentricity e(t), climatic-precession e·sin(ϖ) / e·cos(ϖ)) to the L1+L2+L3 climate formula improves R². **Strong null:** max ΔR² = +0.0041 across LR04 regimes + EPICA. Classical insolation alone explains only R² = 0.049 of post-MPT LR04 (vs L1 alone at 0.870). The 8H gravitational-coupling lattice already encodes all insolation-relevant variance |
| 95 | [Climate Summary — Gravitational Coupling, Not Insolation](95-climate-summary.md) | Capstone synthesis of docs 90–94. Climate is forced by gravitational coupling among solar-system bodies; solar insolation is one channel, but the rhythm itself (8H lattice, R² = 0.87 post-MPT LR04) is the more complete description |
| 96 | [Related Work — 2024 Literature Context](96-related-work.md) | Positions the framework relative to active 2018–2024 revisions to classical Milankovitch theory: 405-kyr metronome stability, Mars-Earth 2.4-Myr gravitational coupling, 9-Myr/36-Myr Grand cycles, red-noise/orbital balance, tidal-vs-insolation community gap |
| 97 | [Paleoclimate ECS Spectrum via 8H Lattice Decomposition](97-paleo-ecs-decomposition.md) | Frequency-resolved decomposition of L1 lattice amplitudes per orbital band → Charney climate sensitivity ECS estimate from paleoclimate δ¹⁸O |
| 98 | [The Mechanism Behind the 8H/L1 Lattice](98-lattice-mechanism.md) | Active research doc establishing that the 8H/L1 lattice is real spectral structure in solar-system orbital dynamics. Action-angle closure of obliquity-sector secular dynamics forces eigenfrequencies onto integer divisors of 8H |
| 99 | [Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) | The Solar System Resonance Cycle (8H) and integer-divisor lattice as structural invariants; H(t) expands monotonically with geological time, driven by Earth-Moon tidal evolution (Driver 1) and solar mass loss (Driver 2). L1 integer LABELS are scale-invariant; LITERAL PERIODS scale with current H. Deep-time predictions: Hadean Moon at Roche limit at Patterson's Pb-Pb Earth age; Devonian H ≈ 309,083 yr matching Wells 1963 + Wu et al. 2024 to ~1%; future tidal-lock asymptote at ~87 R_⊕ |

### 100–109 ΔT & Historical Eclipse Validation

| # | Document | Description |
|---|----------|-------------|
| 102 | [Pure-tidal + GIA L1-orbital-coupled α(t) validates against historical lunar record](102-gia-alpha-lunar-validation.md) | Higher-resolution lunar-timing test on 270 primary-source observations (Stephenson, Morrison & Hohenkerk 2016; Babylonian, Greek, Chinese, Arab). Framework's mean \|residual\| against 267 events is **21.3 min**, with **108/267 events (40.4%) falling closer to observation than NASA Espenak/Meeus's polynomial**. The **L1-orbital-coupled α(t) GIA correction** is derived from independent satellite gravimetry (Cox & Chao 2002 dJ₂/dt with J₂→α conversion factor 2.0 in the Peltier ICE-6G LOD-coupling range) plus the L1 orbital layer of the canonical Climate Formula — zero parameters fitted to eclipse data. Full Munk-MacDonald (~5-6 ms/cy) non-tidal-speedup rejected; α(t) captures the GIA-scale portion. Residual decomposes into the framework-native **4-flag 8H-lattice stack (Bond 8H/1830 = 1466 yr + Hallstatt 8H/1104 = 2430 yr + Jose5 8H/2989 = 897 yr + Jose4 8H/3749 = 716 yr)** plus observation noise. Framework's independent validation is the 26-event solar-eclipse alignment audit ([Solar Eclipse Validation](https://holisticuniverse.com/model/historical-eclipse-validation)) — 12/26 confirmed+off-peak, 6 regional, 2 with residual ΔT-signal, 6 geographic (historical attribution debates, unrelated to physics) |
| 103 | [-135 Babylonian solar eclipse case study](103-135-babylonian-case-study.md) | Focused case study of the -135 Apr 15 Babylonian eclipse. Framework's audit-26 BestGap = **22 km** at the documented site — the tightest per-event match in the audit. Component-level decomposition of the residual attributes it to Sun ecliptic-longitude drift, framework ΔT convention, and framework GMST convention. Meeus Ch. 47 Moon polynomial exonerated (all modern lunar theories converge within 0.001° at year -135) |

Superseded methodology docs (35-event RMS test, 19-event visibility test) preserved in `docs/hidden/old-documents/` as historical baselines: `100-deltat-validation.md`, `101-pure-tidal-eclipses.md`.

### Appendices

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
| [balance-search.js](../tools/verify/balance-search.js) | Exhaustive search + deep analysis: five-stage pipeline (7.5M → 42 survivors) with per-config optimised anchor, ascending nodes, and base eccentricities (fair ranking); generates data/balance-presets.json |
| [verify-laws.js](../tools/verify/verify-laws.js) | Comprehensive verification of all six laws + findings |
| [configuration-analysis.js](../tools/verify/configuration-analysis.js) | Historical: four-filter intersection analysis of 7.56M configs (superseded by the sequential pipeline in balance-search.js) |
| [eccentricity-balance.js](../tools/verify/eccentricity-balance.js) | Pair decomposition, Law 5 sensitivity analysis |
| [epoch-independence.js](../tools/verify/epoch-independence.js) | AMD exchange across mirror pairs, balance stability across Saturn's secular cycle |

> **Note:** Scripts 80 and 81 calculate the same ascending node values using different methods (numerical vs analytical). Both produce identical results, proving the geometric validity of the approach.

**Data & spreadsheets**

| File | Description |
|------|-------------|
| [Earth Fundamental Cycle Objects Data](../data/01-holistic-year-objects-data.xlsx) | Planetary positions and orbital elements spanning one complete Earth Fundamental Cycle |

---

## Project Infrastructure

Beyond the documentation, the project includes several tool directories that power the optimization, verification, and data pipelines.

### `tools/lib/` — Core Engine

The shared libraries that both the simulation (`src/script.js`) and the optimization tool use:

| File | Description |
|------|-------------|
| `constants.js` | All model constants — the single source of truth that feeds `src/script.js` via `export-to-script.js` |
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

Ad-hoc analysis and exploration scripts used during development (~30 scripts). See the scripts themselves for descriptions — each has a header comment explaining its purpose.

### `tools/fit/` — Fitting & Derivation Scripts

Centralized scripts for fitting harmonics, deriving constants, and generating training data.
Run in dependency order when model parameters change. See [`tools/fit/README.md`](../tools/fit/README.md) for the complete script listing, dependency chain, and step-by-step pipeline instructions.

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
| `fibonacci_significance.py` | Monte Carlo + permutation significance analysis for the Fibonacci structure (11 tests across 3 null distributions, Stouffer's Z combining with correlation correction) |
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
| Earth Fundamental Cycle (H) | 335,317 years | Complete cycle unifying all precession movements |
| Axial Precession | H/13 (~25,794 yr) | Earth's wobble around the EARTH-WOBBLE-CENTER |
| Inclination Precession | H/3 (~111,772 yr) | PERIHELION-OF-EARTH orbit period |
| Perihelion Precession | H/16 (~20,957 yr) | Combined cycle where axial meets inclination |
| Obliquity Range | ~22.1° – ~24.5° | Earth's axial tilt oscillation |

For all constants and their sources, see the [Constants Reference](20-constants-reference.md).
