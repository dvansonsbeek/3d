---
docVersion: 1.0
modelVersion: v13.0
coefficients: sha256:9e0460662933228f
status: current
---

# Holistic Universe Model — Documentation

This is the technical documentation for the [3D Solar System Simulation](https://3d.holisticuniverse.com). It covers the theory, calculations, architecture, and tooling behind the model. If you're looking for the scientific background, visit [holisticuniverse.com](https://holisticuniverse.com).

**Who is this for?**
- **Curious readers** — start with the [Introduction](01-introduction.md) and [the Six Relations](10-fibonacci-laws.md)
- **Users of the simulation** — see the [User Guide](02-user-guide.md)
- **Contributors & developers** — the [Architecture](40-architecture.md) and [Constants Reference](20-constants-reference.md) are your starting points

Document **numbers are stable identifiers**, not a reading order — the
archival of retired-machinery docs left gaps in the numbering, and the
sections below give the intended reading order instead.
[The retired record](retired-record.md) says what was archived, where,
and why.

---

## Reading Order

### Start here

| # | Document | Description |
|---|----------|-------------|
| 01 | [Introduction](01-introduction.md) | Core concepts, the two forces, the Earth Fundamental Cycle |
| 02 | [User Guide](02-user-guide.md) | How to use the 3D simulation — controls, panels, features |
| 03 | [Glossary](03-glossary.md) | Essential terms and definitions |

### The model

| # | Document | Description |
|---|----------|-------------|
| 99 | [Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) | The theory: the Solar System Resonance Cycle (8H) and integer-divisor lattice as structural invariants of the Earth–Moon spin/tide system; H(t) expands with geological time under Earth-Moon tidal evolution (Driver 1) and solar mass loss (Driver 2); the two-tier scaling split (spin periods move with H, the 405-kyr metronome does not) confirmed at 1.4 and 2.46 Ga; the deep-time predictions and the falsification criteria |
| 10 | [The Six Relations](10-fibonacci-laws.md) | The Fibonacci relations with per-relation measured statuses — precession cycles, inclination and eccentricity constants, balance observations, resonance |
| 108 | [The derived Earth-orbit vector](108-derived-earth-orbit-vector.md) | Earth's eccentricity and perihelion as one rotating vector: e is frame-invariant, H/16 belongs to ϖ_of-date (13 + 3 = 16), and the model's H/16 and H/3 laws are LOCAL J2000 rates of that vector; a zero-fitted-constant Laplace–Lagrange e(t) on the framework's own planets reproduces La2004 (corr 0.967 over 250 kyr) — standard secular dynamics, not lattice evidence |
| 109 | [The model's own N-body: audit, engine, frequencies, lattice test](109-model-nbody-engine-and-lattice-test.md) | The re-evaluation record: the Wisdom–Holman engine reproduces every planet's rates from Newton + the measured masses (Mercury's −43″/cy closed by the 1PN term alone); the secular g/s to 0.1–1%; the lattice tested at its own quantity type (divisors retyped as means / present-epoch / window values); the bound experiments (§12) that left H/3 as the epoch-local tangent of Earth's free eccentricity vector |
| 98 | [The Mechanism Behind the 8H/L1 Lattice](98-lattice-mechanism.md) | Active research doc: why the 8H/L1 lattice is real spectral structure — action-angle closure of obliquity-sector secular dynamics forcing eigenfrequencies onto integer divisors of 8H |

### Earth: time & motion

| # | Document | Description |
|---|----------|-------------|
| 11 | [Day & Year Length Formulas](11-length-day-year-formulas.md) | Tropical year and day length: measurement methods, validation, the frozen-era laws and the one-source year lengths |
| 14 | [Solstice Prediction](14-solstice-prediction.md) | Solstice RA and timing from the H/3, H/8, H/16 harmonics — the cardinal-point machinery |
| 65 | [Equation of Center](65-equation-of-center.md) | The Sun wheel's variable-speed construction: the geometric/analytic split, the derived exact-Kepler corrector (default path), the certified-Sun δ overlay, and the registry-resident legacy harmonic layer |
| 13 | [Perihelion Precession](13-mercury-precession-breakdown.md) | The two perihelion coordinates and their methods, the Earth-frame projection account (§1.8, gate-pinned for all seven planets), and the Laplace–Lagrange comparison |

### The planets

| # | Document | Description |
|---|----------|-------------|
| 04 | [Orbital Elements: the Chain and the Devices](04-dynamic-elements-overview.md) | The three tiers: the Keplerian chain (THE planet path — source-of-truth doctrine, elements of date, secular shapes), the engine-K hierarchy (Earth/Moon/Sun), and the no-chain bodies |
| 05 | [The Invariable Plane](05-invariable-plane-overview.md) | The plane the model banks from its own chain artifact (K5c s-frame + derived Souami & Souchay origin conversion), heights, nodes, crossings, and the two live self-checks |
| 31 | [Geometric Orbital Elements — the No-Chain Bodies](31-no-chain-body-elements.md) | The inclination-oscillation and node-regression device for Pluto/Halley/Eros, Earth's engine-K devices, and the probe-pinned reference implementations |
| 68 | [Orbital Period Calibration](68-orbital-period-calibration.md) | The legacy device-chain period calibration against ancient observations (the rendered planets read the chain) |
| 72 | [The Closed Loop](72-the-closed-loop.md) | How PSI and K derive the orbital-oscillation amplitudes from Earth alone — the retired law framework's construction record |

### The Moon

| # | Document | Description |
|---|----------|-------------|
| 66 | [Moon Meeus Corrections](66-moon-meeus-corrections.md) | The Derived Moon: the framework-native fundamental arguments, the full Ch. 47 series + derived extension tails, the Cassini tilt derivation, and the current accuracy gates |
| 24 | [The Δa Mass Derivation](24-moon-kepler-derivation.md) | GM_Earth/GM_Moon from the Moon's orbit via Δa; the universal mass-from-moon formula for all moon-bearing planets; the exact symmetric Sun-side Δa identity and the Sun-SSB chart |

### Deep time & validation

| # | Document | Description |
|---|----------|-------------|
| 106 | [Deep-Time Validation Dossier](106-deep-time-validation-dossier.md) | The single entry point for "how well does the model match the geological and historical record, and how would we know if it stopped?" Four evidence classes, gate-backed (41 paleo anchors, Phanerozoic MAD <!--v:paleoMadPhanPct-->0.18<!--/v-->%), including **the honesty ledger** — documented deviations asserted as bands so an unexplained improvement fails CI too |
| 102 | [Pure-tidal + GIA α(t) vs the historical lunar record](102-gia-alpha-lunar-validation.md) | 267 primary-source lunar observations (Stephenson 2016): framework mean \|residual\| **20.2 min** vs NASA's fitted polynomial at 20.0 min — a 2-s excess over Stephenson's own fit, with zero ΔT-polynomial fitting; the α(t) GIA channel from independent satellite gravimetry; the 4-flag 8H-lattice stack; the full hypothesis-testing and residual-decomposition record |
| 104 | [The Millennial Rotation Swing](104-millennial-rotation-swing.md) | The core–mantle identification of the post-stack residual: one aperiodic swing, independently confirmed against archeomagnetic core-flow ΔLOD (r = +0.91), the lattice closed under difference tones, and the low-Q Magneto-Coriolis eigenmode reading |
| 105 | [ΔT stack: what each flag buys](105-dt-stack-flag-audit.md) | Audit of the four ΔT correction flags under pre-fixed criteria: the shipped set is optimal in- and out-of-sample (Espenak RMS <!--v:deltaTEspenakRmsSeconds-->12.5<!--/v--> s); the two measurement traps (stage_* metrics rank backwards; Jose5/Jose4 are a coupled pair) |
| 103 | [-135 Babylonian solar eclipse case study](103-135-babylonian-case-study.md) | The flagship ancient event: BestGap <!--v:babylon135BestGapKm-->366<!--/v--> km (off-peak verdict), documented UT matched to 9 minutes, local magnitude 0.988, the ΔT-free cascade selecting the traditional date uniquely — plus the component decomposition and the α(t) sensitivity proof |
| 107 | [Ancient-record review — identification adjudication](107-ancient-record-review.md) | Local-circumstance re-testing of the audit's ancient rows: every first-hand record validates at its traditional date; the "geographic" verdicts are identification errors in second-hand chains; the Lu −708 record identified uniquely by the chronology-free ganzhi filter |

### Climate

| # | Document | Description |
|---|----------|-------------|
| 90 | [Milankovitch Language of the Holistic Model](90-milankovitch-language.md) | The model's Milankovitch framework: five H-divisor periods closed by beat algebra; all six Berger 1978 climatic-precession peaks matched within 0.7% |
| 91 | [Milankovitch Evidence & Hypothesis Tests](91-milankovitch-evidence.md) | Empirical tests on LR04 + Cheng 2016 + EPICA + CENOGRID: the 8H Orbital Forcing Formula, per-planet contributions, pre-registered super-cycle nulls, fourteen falsifiable follow-up tests, and the 405-kyr off-lattice characterization |
| 92 | [Climate Formula — Architecture, Variance Decomposition & Implementation](92-climate-formula.md) | The canonical L1 + L2 + L3 climate formula: per-regime ridge-fit architecture, five-layer variance decomposition, LR04 R² = 0.87 post-MPT (0.93 stitched), EPICA CO₂ cross-proxy R² = 0.84, and the reproducing pipeline |
| 93 | [L1 Lattice Attribution Reference](93-l1-attribution-reference.md) | Per-L1-integer dual attribution (Berger label vs the model's best Earth–planet beat), scored by physical plausibility, on all 33 components — generator-owned |
| 94 | [Insolation Extension Test (strong null)](94-insolation-null-test.md) | Adding classical Berger insolation features to the climate formula buys ΔR² ≤ +0.0041 — the 8H lattice already encodes the insolation-relevant variance |
| 95 | [Climate Summary — Gravitational Coupling, Not Insolation](95-climate-summary.md) | Capstone synthesis of docs 90–94 |
| 96 | [Related Work — Literature Context](96-related-work.md) | The framework relative to the 2018–2024 revisions of classical Milankovitch theory |

### Reference

| # | Document | Description |
|---|----------|-------------|
| 20 | [Constants Reference](20-constants-reference.md) | **Single source of truth** for all constants, parameters, and their sources |
| 21 | [Orbital Formulas Reference](21-orbital-formulas-reference.md) | Formula implementations and the OrbitalFormulas helper |
| 22 | [Coordinate Frames](22-coordinate-frames.md) | ICRF, ecliptic, equatorial, and invariable plane transformations |
| 23 | [Verification Data Reference](23-verification-data-reference.md) | The embedded verification datasets: transits, oppositions, conjunctions, Tycho's Mars observations — and the independent-observation RMS findings |

### Architecture & UI

| # | Document | Description |
|---|----------|-------------|
| 40 | [Architecture](40-architecture.md) | Code structure, file organization, module responsibilities, and the one-source movement |
| 41 | [Scene Graph Hierarchy](41-scene-graph-hierarchy.md) | Three.js nested rotation layers — the engine-K hierarchy and the chain rendering path |
| 50 | [UI Panels Reference](50-ui-panels-reference.md) | Tweakpane control panel and sidebar implementations |
| 51 | [Planet Inspector Reference](51-planet-inspector-reference.md) | Planet hierarchy inspector — calculation logic and display |
| 52 | [Analysis & Export Tools](52-analysis-export-tools.md) | Report generation, data export, and console validation tests |
| 56 | [WebGeoCalc Explorer](56-webgeocalc-explorer.md) | Tools-menu modal showing observed perihelion-precession history (JPL NAIF WebGeoCalc) per planet — tests the chain's own ϖ(t) against observation |
| 57 | [Formula Verification](57-formula-verification.md) | Tools-menu modal comparing the model's predictions against published analytical formulas (Meeus, Chapront, Capitaine, Vondrák, Laskar, Berger, Bills & Ray) across the 11 verification categories |
| 58 | [Climate Formula Explorer](58-climate-formula-explorer.md) | Tools-menu modal visualizing the climate formula against LR04 / CENOGRID / EPICA / CenCO2PIP |
| 59 | [ESSRT Explorer](59-essrt-explorer.md) | Tools-menu modal for the deep-time evolution of H, LOD, year length and Moon distance under ESSRT |

### The record

| Document | Description |
|---|-------------|
| [Retired record](retired-record.md) | What was archived out of this tree, by family — the fitted correction stack, the balance constructions, the withdrawn predictions, the planet lattice-period claims — with the honest-withdrawal statements |

---

## Appendices

**Verification scripts** — standalone Node.js scripts that verify, compute, or analyze model parameters. Run with `node tools/verify/<filename>`. (`npm run test:verify:list` classifies all 31: 6 gate · 3 liftable · 12 narrative · 10 generator.)

| Script | Description |
|--------|-------------|
| [ascending-node-optimization.js](../tools/verify/ascending-node-optimization.js) | Numerical optimization to calculate ascending node values |
| [analytical-ascending-nodes.js](../tools/verify/analytical-ascending-nodes.js) | Analytical (closed-form) calculation using spherical trigonometry |
| [ascending-node-verification.js](../tools/verify/ascending-node-verification.js) | Verifies J2000-verified values produce correct ecliptic inclinations |
| [ascending-node-souami-souchay.js](../tools/verify/ascending-node-souami-souchay.js) | Compares Souami & Souchay original vs verified ascending node accuracy |
| [inclination-optimization.js](../tools/verify/inclination-optimization.js) | Computes the derived inclination amplitudes and means with balance verification |
| [inclination-verification.js](../tools/verify/inclination-verification.js) | Verifies inclination parameters against J2000 and JPL trends |
| [mercury-precession-centuries.js](../tools/verify/mercury-precession-centuries.js) | Mercury perihelion precession analysis by century |
| [balance-search.js](../tools/verify/balance-search.js) | Exhaustive search + deep analysis: five-stage pipeline with per-config optimised anchor, ascending nodes, and base eccentricities; generates data/balance-presets.json |
| [verify-laws.js](../tools/verify/verify-laws.js) | Narrative-class record of the retired law suite's checks and findings |
| [configuration-analysis.js](../tools/verify/configuration-analysis.js) | Historical: four-filter intersection analysis of 7.56M configs (superseded by the sequential pipeline in balance-search.js) |
| [eccentricity-balance.js](../tools/verify/eccentricity-balance.js) | Pair decomposition, Law 5 sensitivity analysis |
| [epoch-independence.js](../tools/verify/epoch-independence.js) | AMD exchange across mirror pairs, balance stability across Saturn's secular cycle |

> **Note:** `ascending-node-optimization.js` and `analytical-ascending-nodes.js` calculate the same ascending node values using different methods (numerical vs analytical). Both produce identical results, proving the geometric validity of the approach.

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
| `constants.js` | All model constants for the Node tools, loaded from the JSON source of truth in `public/input/`. `src/script.js` reads the same JSON through the generated module (`npm run constants:generate`) |
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

The planet-facing optimization programme is retired (the planets render
from the engine-D element chain, which is not fitted per planet); the
tool remains for Moon-side steps and chain-vs-JPL diagnostics. The full
programme documentation is archived — see [the retired record](retired-record.md).

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
| `import-vsop87.js` | Import the truncated VSOP87A series for the Standard-Model (K8) reference overlay |
| `import-elp-mpp02.js` | Import the ELP/MPP02 lunar series (reference overlay + lunar cross-checks) |
| `patch-planet-test-dates.js` | Patch test dates for planet verification |

### `tools/explore/` — Investigation Scripts

Ad-hoc analysis and exploration scripts used during development. See the scripts themselves for descriptions — each has a header comment explaining its purpose.

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
| Earth Fundamental Cycle (H) | <!--v:H-->335,317<!--/v--> years | Complete cycle unifying all precession movements |
| Axial Precession | H/13 (<!--v:axialPrecRound-->~25,794<!--/v--> yr) | Earth's wobble around the EARTH-WOBBLE-CENTER |
| Apsidal Precession | H/3 (<!--v:inclPrecYears-->~111,772<!--/v--> yr) | PERIHELION-OF-EARTH orbit period |
| Perihelion Precession | H/16 (<!--v:periPrecYears-->~20,957<!--/v--> yr) | Combined cycle where axial meets inclination |
| Obliquity Range | ~22.1° – ~24.5° | Earth's axial tilt oscillation |

For all constants and their sources, see the [Constants Reference](20-constants-reference.md).
