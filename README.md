# Fibonacci Laws of Planetary Motion — Interactive 3D Solar System Simulation

[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-10-green.svg)](https://github.com/dvansonsbeek/3d/releases/tag/v10)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-orange.svg)](https://threejs.org/)
[![npm @essrt/physics](https://img.shields.io/npm/v/%40essrt%2Fphysics?label=%40essrt%2Fphysics)](https://www.npmjs.com/package/@essrt/physics)
[![npm @essrt/model-values](https://img.shields.io/npm/v/%40essrt%2Fmodel-values?label=%40essrt%2Fmodel-values)](https://www.npmjs.com/package/@essrt/model-values)

![Solar System Simulation](https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/readme.png)

> **[Live Demo](https://3d.holisticuniverse.com)** — Experience the simulation in your browser (auto-deployed from every verified commit)
>
> **[Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4)** — Read the accompanying research paper

What if the orbits of all eight planets, the wobble of Earth's axis, and the rhythm of ice ages are all governed by the same mathematical structure?

This interactive 3D simulation visualizes the **Fibonacci Laws of Planetary Motion** — six laws that connect every planet's orbital tilt, shape, and precession to a single timescale. Built with just **6 free parameters**, the simulation accurately reproduces the geocentric positions of the Sun, Moon, and all seven planets — verified against JPL Horizons ephemeris data (~1800–2200 AD) and over 700 historical astronomical observations (~2000 BC to ~4000 AD). From the same geometric framework, it simultaneously produces obliquity, eccentricity, perihelion precession, and inclination oscillation for all planets.

---

## Two Motions, One Ratio

The model starts from a single observation: two of Earth's precession motions rotate in **opposite directions**.

| Motion | Direction | Cycle |
|--------|-----------|-------|
| Axial Precession | Clockwise | <!--v:axialPrecRound-->~25,794<!--/v--> years |
| Inclination Precession | Counter-clockwise | <!--v:inclPrecYears-->~111,772<!--/v--> years |

These two counter-rotating motions interact in a **Fibonacci ratio of 3:13**. From this starting point, the model derives what is normally calculated separately: precession of the equinoxes, obliquity oscillation, eccentricity cycles, Milankovitch beat frequencies, the length of days and years, and the orbital-forcing component of climate (the timing of glacial-interglacial cycles).

Everything comes together in the **Earth Fundamental Cycle (H)**: a <!--v:H-->335,317<!--/v-->-year master cycle at J2000 (H slowly evolves on geological timescales via Earth-Moon tidal evolution — see the deep-time section below) from which Earth's major precession periods emerge as Fibonacci divisions (H/3, H/5, H/8, H/13) — and this simulation visualizes it all in one interactive view.

---

## The Solar System Resonance Cycle (8H) — ESSRT

Earth's H is the model's master cycle, but it isn't the largest. **Eight Earth Fundamental Cycles — 8H = <!--v:eightH-->2,682,536<!--/v--> years at J2000 — is the Solar System Resonance Cycle**: the super-period at which every major planetary cycle (axial precession, perihelion precession, inclination oscillation, ascending node regression, obliquity oscillation, eccentricity oscillation) across all eight planets divides evenly as an integer. This is the **8H integer-divisor lattice** that the climate work (docs 90–92) demonstrates from the LR04 + CENOGRID paleoclimate records, the Fibonacci Laws use (Law 6 lock at 8H/65, axial precession H/13 = 8H/104), and the deep-time framework expands across geological time.

The unifying theory is the **Expanding Solar System Resonance Theory (ESSRT)** ([Doc 99](docs/99-expanding-solar-system-resonance-theory.md)):

- The **L1 integer labels** (n = 9, 12, …, 65, 66, 68, …, 185 — 32 components in total) are **scale-invariant** structural constants of the solar system. Same integers at every epoch.
- The **literal periods** scale with the current value of H(t): in the Devonian H ≈ <!--v:hAtDevonian-->306,189<!--/v--> yr, today H = <!--v:H-->335,317<!--/v--> yr, in 200 Myr H ≈ <!--v:hAt200MyrFuture-->352,600<!--/v--> yr — but `8H/65` is still the obliquity beat, `8H/104` is still axial precession, etc.
- Two physically independent drivers expand H(t): **Driver 1** is Earth-Moon tidal evolution (Moon recedes 3.82 cm/yr at J2000, Earth's length-of-day grows); **Driver 2** is solar mass loss (every planet's orbit slowly expands via Kepler's 3rd law). Both act simultaneously; the structural invariant `H × days/year` ≈ <!--v:totalDaysInH-->122,471,920<!--/v--> couples them at the per-planet observational level.

ESSRT therefore unifies the **modern-era 8H climate lattice** (docs 90–92), the **deep-time predictions** (see deep-time section below), and the **future projections** (tidal-lock asymptote at ~<!--v:tidalLockRE-->87.1<!--/v--> R_⊕) into a single coherent framework with the **same 6 free parameters** throughout. The Solar System Resonance Cycle Period Table is in [Doc 55](docs/55-solar-system-resonance-cycle-periods.md).

---

## The Six Fibonacci Laws

The model implements six laws — anchored on Earth and extending to all eight planets through Fibonacci numbers:

1. **Fibonacci Cycle Hierarchy** — Earth's major precession periods divide H by Fibonacci numbers (H/3, H/5, H/8, H/13). A hierarchy unique to Earth.
2. **Inclination Amplitude Constant** — A single constant ψ predicts all eight inclination amplitudes from Fibonacci divisors and mass alone
3. **The Inclination Balance** — Seven planets' angular-momentum-weighted oscillations balance against Saturn alone (anti-phase) to <!--v:balanceInclPct-->99.9974%<!--/v-->
4. **Eccentricity Amplitude Constant** — A single constant K predicts all eight eccentricity amplitudes from Fibonacci divisors, mass, distance, and axial tilt
5. **The Eccentricity Balance** — Seven planets' eccentricities balance against Saturn alone using the same Fibonacci divisors and phase groups as Law 3 (<!--v:balanceEccPct-->99.8636%<!--/v-->)
6. **Saturn-Jupiter-Earth Resonance** — Jupiter's ICRF perihelion and Saturn's ecliptic perihelion lock to one period, 8H/65 (a structural balance, not a coincidence); this is the obliquity beat in Earth's climate record, one 8H-lattice step from Earth's Fibonacci obliquity H/8 (= 8H/64). The gas giants drive Earth's spin-axis dynamics through their mutual resonance lock

The Fibonacci divisors follow a mirror symmetry: Mercury↔Uranus, Venus↔Neptune, Earth↔Saturn, Mars↔Jupiter. Out of <!--v:configSearchSpace-->7,558,272<!--/v--> candidate configurations, four successive physical filters (inclination balance ≥99.994%, eccentricity balance ≥99%, Laplace–Lagrange bounds, direction match) narrow the field to <!--v:deepSurvivorCount-->15<!--/v--> deep-analysis survivors — of which mirror symmetry then picks out only one (Config #7).

See the [Fibonacci Laws documentation](docs/10-fibonacci-laws.md) for the full derivation, and [verify-laws.js](tools/verify/verify-laws.js) for comprehensive verification (49/50 checks pass — the one carried failure is Saturn's Laplace–Lagrange bound, documented).

---

## How It Works

The Sun is still the center of our solar system. The model uses a geo-heliocentric frame — viewing from Earth's perspective — to make the two counter-rotating precession motions visible:

- **Earth wobbles** clockwise around a reference point (the EARTH-WOBBLE-CENTER) in <!--v:axialPrecRound-->~25,794<!--/v--> years — this is axial precession
- **Earth's perihelion point** wobbles counter-clockwise around the Sun in <!--v:inclPrecYears-->~111,772<!--/v--> years — this is inclination precession
- These two motions **meet every <!--v:periPrecYears-->~20,957<!--/v--> years** — producing perihelion precession
- Earth orbits its perihelion point (close to the Sun) in 1 solar year, and all planets orbit their own perihelion points following Kepler's 3rd law

The result: obliquity, eccentricity, inclination, and all precession movements emerge from just two opposing forces in a 3:13 ratio.

For more details see [holisticuniverse.com](https://holisticuniverse.com).

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) **20 or newer** — for the simulation and optimization tools. The headless-browser tests pull in Playwright, which requires ≥20; CI runs Node 22
- [Python 3](https://www.python.org/) (optional) — needed for ML training (`tools/fit/python/`) and statistical analysis (`scripts/`)

### Installation

```bash
git clone https://github.com/dvansonsbeek/3d.git
cd 3d
npm install
npm start
```

The simulation will open in your browser at `http://localhost:1234`

### Use the Model as a Package

The complete physics core — constants, fitted coefficients, every factory —
is published as [`@essrt/physics`](https://www.npmjs.com/package/@essrt/physics)
(AGPL-3.0), and the 1,000+ rendered display values as
[`@essrt/model-values`](https://www.npmjs.com/package/@essrt/model-values).
Every published version immutably ships one recorded model identity
(`modelVersion` + coefficient hashes), so any number you compute from a pinned
version is reproducible forever:

```bash
npm install @essrt/physics @essrt/model-values
```

### Orbital Data Explorer (Dashboard)

An interactive data dashboard for exploring planetary orbital elements across a full Earth Fundamental Cycle:

```bash
npm run dashboard:export   # generate JSON data from the orbital engine
npm run dashboard          # start dashboard at http://localhost:5050
```

Features: multi-planet overlay, synchronized zoom/pan, light/dark mode, CSV export, range presets (Full H, H/3, H/5, H/8, H/13, H/16), and obliquity decomposition for Earth.

### Python Analysis Scripts (Optional)

The `scripts/` directory contains statistical analysis and verification scripts (Fibonacci significance tests, exoplanet tests, eccentricity analysis, Milankovitch spectral analysis on LR04 + Cheng2016 paleoclimate records producing the **8H Orbital Forcing Formula**, Planet Nine falsification). To use them:

```bash
pip install -r requirements.txt   # numpy, pandas, openpyxl, scipy, astropy
python3 scripts/fibonacci_significance.py
```

Most datasets these scripts need are committed under `data/`. Two are not ours to
redistribute and must be fetched separately — SILSO sunspot numbers and the
Snyder (2016) source data — so the scripts using them will report a missing file
until you do. [data/PROVENANCE.md](data/PROVENANCE.md) gives the download step
for each, and the source, citation and licence for every dataset in `data/`.

### Build for Production

```bash
npm run build
```

### Verification

```bash
npm run check             # the full gate chain (~9 min): lint, typecheck, boundaries,
                          # purity, layer identities, constants, counterfactual,
                          # planet model, createModel parity, fixtures, literals, python-physics pins,
                          # docs freshness, artifact freshness, data provenance,
                          # doc values, packaged model-values, model gates, pipeline
npm run check:docs        # scoped tier (~20 s) for docs/registry/marker edits
npm run check:engine      # scoped tier (~2 min) for tools/lib + packages/physics edits
npm run test:browser      # golden masters in headless Chromium (builds first)
npm run test:verify:list  # how the 24 tools/verify scripts classify
npm run values:package    # packaged @essrt/model-values vs the live registry
npm run check:artifacts   # campaign artifacts vs their recorded input hashes
```

`npm run check` is the gate that must stay green — CI runs the full chain on
every push, so the scoped tiers are a local convenience keyed to what a change
touches. Every check in it has been shown to fail on a deliberately planted
violation, not merely to pass on clean code — the golden masters detect a
change of one floating-point ULP, and the artifact-freshness gate fails naming
the exact regeneration command when any input of a generated `data/*.json`
moves without a re-run.

Two things worth knowing before you read a red result as breakage:

- `npm run test:transparency` (referential transparency, 84 probes) is **green
  and required in CI** — a year's computed values do not depend on which epoch
  the scene happens to be set to, bit-exact on the round trip. Red there is a
  regression of a closed acceptance criterion, not a tracked state.
- Of the 24 scripts in `tools/verify/`, only the six gates can actually fail —
  the rest print analysis without asserting anything. `test:verify` runs the real
  gates and deliberately skips the four generators (`balance-search.js` plus the
  three campaign-artifact generators), which regenerate tracked data files rather
  than checking them. The suite fails on any unclassified script, so the
  inventory cannot silently drift again.

---

## Features

- Interactive 3D solar system with textured planets, rings, shadows, and starfield
- Equation of center (variable speed) and empirical parallax corrections for all planets
- **The Derived Moon (DLT-1)**: a framework-native lunar theory in Meeus Ch. 47's form with every constant derived, attributed, or anchored by design — periodic amplitudes reproduced from gravity alone (top-20 longitude at 100.0±0.1%, latitude family at 100.02%), the secular T²/T³ budget closed against primary sources with zero free parameters, analytic aberration replacing the fitted correction, and a J2000-anchored 5-layer precession hierarchy; RMS 0.0012° vs JPL Horizons over 6,088 positions
- Time controls: play, pause, speed adjustment, and date navigation
- Click any planet to focus the camera and see its orbital data
- Planet info sidebar with per-planet data, charts, and precession analysis
- [Eccentricity Balance Scale](docs/38-eccentricity-scale.md) for visualizing Law 5 balance per planet
- [Invariable Plane Balance Explorer](docs/53-balance-explorer-reference.md) for interactive Fibonacci Law testing
- **Orbital Forcing Formula Explorer** — Tools-menu modal plotting the 8H formula on top of LR04 across five tabs (full record → forward projection of the next natural glaciation)
- Console tests for year length, day length, and calibration verification
- Export functionality for solstice dates and object positions
- Built with [Three.js](https://threejs.org/) and [Tweakpane v4](https://tweakpane.github.io/docs/)

---

## Deep-Time Implementation — Hadean to +200 Myr

The simulation is not limited to the modern era. The model's 6 free parameters apply at **all epochs from the Hadean (4.5 Gyr ago, Moon at the Roche limit) through J2000 and into the future tidal-lock asymptote at ~87 R_⊕**. A toggle in the developer panel enables deep-time mode, after which the time slider can be scrubbed across geological timescales and the entire 3D scene — Earth, Moon, all seven planets, plus the perihelion-ecliptic frames — updates in real time to the physically correct positions for the target epoch.

The framework is documented in [Doc 99 — Expanding Solar System Resonance Theory (ESSRT)](docs/99-expanding-solar-system-resonance-theory.md): a canonical 9-step chain from `t_Ma` through length-of-day (LOD), the Earth Fundamental Cycle H(t), AU, solar mass loss, Kepler year, Moon distance, Moon synodic month, anomalistic year, stellar/sidereal days, and planet orbital + synodic periods. The chain is anchored to modern Lunar Laser Ranging and the [Farhat 2022](https://www.aanda.org/articles/aa/full_html/2022/09/aa44329-22/aa44329-22.html) lunar-distance evolution polynomial; deep-time outputs are then independently validated against three external anchors that the model was **not** fit against:

- **Wells 1963** (Devonian coral growth bands at 380 Ma): predicted Earth Fundamental Cycle H ≈ <!--v:hAtDevonian-->306,189<!--/v--> yr matches Wells's paleontological day-count essentially exactly (−0.01 %)
- **Wu et al. 2024** (650-Myr cyclostratigraphy from sedimentary records): predicted H(t) matches Wu's reconstruction across the entire Phanerozoic to within ~1 %
- **Patterson 1956 Pb-Pb Earth age** (4.55 Gyr): the model places the Moon at the Roche limit at that epoch — **no Hadean constraint was used in the fit**; the result emerges from the same proper-physics chain that produces the modern Moon distance

The full evidence — 33 published anchors, per-anchor tolerances, the documented deviations, and the gate that re-checks all of it on every CI run — is assembled in the [Deep-Time Validation Dossier (Doc 106)](docs/106-deep-time-validation-dossier.md).

Because the 6 free parameters are fit against modern J2000 data and then projected backward and forward via the proper-physics chain, the deep-time match is a **falsifiable prediction, not a fit**. The same 6 free parameters that reproduce the modern solar system to JPL Horizons precision (~1800–2200 AD) also reproduce paleontological day-counts at Devonian, cyclostratigraphic precession at 650 Ma, and the Hadean Moon-distance constraint at Earth formation — internally consistent across **the full 4.5-Gyr lifetime of the solar system**.

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
| 60–69 | Optimization & Fitting | [Overview](docs/60-optimization-tool-overview.md), [Fitting Pipeline](tools/fit/README.md), [Moon Implementation (Doc 66)](docs/66-moon-meeus-corrections.md) |
| 70–79 | Verification | [Ascending Node Limitations](docs/70-ascending-node-limitations.md) |
| 80–89 | Per-Planet Setup | [Mercury Scene Graph Setup](docs/80-mercury-setup.md) |
| 90–99 | Climate Analysis | [Climate Formula (Doc 92)](docs/92-climate-formula.md), [Climate Summary (Doc 95)](docs/95-climate-summary.md), [ESSRT (Doc 99)](docs/99-expanding-solar-system-resonance-theory.md) |
| 100–109 | ΔT, Historical Eclipse & Deep-Time Validation | [GIA α(t) lunar validation (Doc 102)](docs/102-gia-alpha-lunar-validation.md), [-135 Babylonian case study (Doc 103)](docs/103-135-babylonian-case-study.md), [Millennial rotation swing (Doc 104)](docs/104-millennial-rotation-swing.md), [ΔT stack flag audit (Doc 105)](docs/105-dt-stack-flag-audit.md), [Deep-Time Validation Dossier (Doc 106)](docs/106-deep-time-validation-dossier.md) |

**Investigation & Verification:**
- [Python Scripts](scripts/) — Statistical significance tests, exoplanet Fibonacci tests, eccentricity analysis, Milankovitch paleoclimate tests
- [Milankovitch & Climate (Docs 90–92)](docs/90-milankovitch-language.md) — Spectral analysis of five paleoclimate records (LR04, Cheng 2016, CENOGRID, EPICA CO₂, CenCO2PIP) demonstrating the 8H integer-divisor lattice, the 32-component **8H Orbital Forcing Formula**, and the canonical climate formula with its in-app Explorer modal. Doc 90 states the framework, [doc 91](docs/91-milankovitch-evidence.md) the evidence and falsifiable hypothesis tests, [doc 92](docs/92-climate-formula.md) the formula and reproducing pipeline.
- [Historical Eclipse Validation (Docs 102–103)](docs/102-gia-alpha-lunar-validation.md) — The model's ΔT formula, with **zero parameters fitted to eclipse data in the α(t) machinery**, tested on two independent tracks: a 26-event solar-eclipse alignment audit spanning −762 BCE to 2026 CE (the framework agrees with the documented UT on every event; see the website's [Solar Eclipse Validation](https://holisticuniverse.com/model/historical-eclipse-validation)), and a 267-event primary-source lunar timing test — **<!--v:lunarResidualMinutes-->20.2<!--/v-->-min mean \|residual\|**, with **<!--v:lunarEventsBeatingNasa-->117<!--/v-->/267 events (<!--v:lunarBeatingNasaPct-->43.8<!--/v-->%) falling closer to observation than NASA Espenak/Meeus's polynomial**. [Doc 103](docs/103-135-babylonian-case-study.md) is the −135 Babylonian case study: predicted UT within 16 minutes of the documented time.
- [The Derived Moon — Doc 66 technical record](docs/66-moon-meeus-corrections.md) — the framework's lunar theory, **"The Derived Moon" (DLT-1)**: Meeus Ch. 47 with every constant derived, attributed, or anchored by design — periodic amplitudes reproduced from gravity alone, the secular budget closed against primary sources with zero free parameters, and certified statistically indistinguishable from the pure-Meeus polynomials across the 12,064-event NASA lunar canon while remaining bounded at deep time.
- [Fitting Pipeline](tools/fit/README.md) — Pipeline: Earth perihelion harmonics, ML precession prediction, parallax corrections, solar measurements, obliquity/cardinal-point/year-length harmonics
- [Predictive Formula Guide](tools/lib/python/PREDICTIVE_FORMULA_GUIDE.mdx) — ~2421-term physical-beat ML system for planetary precession prediction (R² > 0.99999 per planet; superseded the 429-term unified system on 2026-04-20)

---

## Fitting Pipeline

The model's constants are stored as JSON under `public/input/` — `model-parameters.json`, `astro-reference.json`, `fitted-coefficients.json`, `meeus-lunar-tables.json` and `climate-formula-coefficients.json`. When you change any model parameter (e.g., H, eccentricityBase, planet orbital elements), the fitting pipeline recalibrates all derived coefficients so the simulation matches JPL Horizons observations.

```bash
node tools/fit/run-pipeline.js --all           # full pipeline (~2.5 hrs)
node tools/fit/run-pipeline.js --phase1        # Steps 1-2 only (~2 min)
node tools/fit/run-pipeline.js --phase2        # Steps 4a-10 (~2.5 hrs, requires Step 3 data)
node tools/fit/run-pipeline.js --from 5a       # resume from Step 5a onwards
```

The pipeline runs in phases: Sun geometry → planet alignment → perihelion harmonics → ML training → parallax corrections → solar measurements & harmonic fits → verify → regenerate the constants module `src/script.js` imports. Step 3 (browser data export) is always manual. Step 6a (solar measurements) exports all cardinal points, perihelion/aphelion, and world-angles in a single scene-graph pass; steps 6b–6d fit harmonics from that data. See [tools/fit/README.md](tools/fit/README.md) for the full reference.

The cardinal points (solstices/equinoxes) are **derived, not independently fitted**: their dates come from the tropical year-length model plus one shared braiding term ([the braid law, doc 99](docs/99-expanding-solar-system-resonance-theory.md)), reaching 0.28–0.37 min RMS per event over ±270,000 years with the seasonal spread emerging from the geometry rather than from per-point fitting.

**Safety**: Step 8 (`verify-pipeline.js`) validates all results against IAU reference values before Step 9 regenerates the constants module. If any parameter change produces unrealistic values — e.g., year lengths that differ from IAU by more than 1 second, obliquity that doesn't match J2000 within 0.01", or planet baselines that regress — the pipeline stops and reports which checks failed. This prevents invalid parameter changes from propagating into the simulation.

---

## Quick Facts

- **Master cycle**: <!--v:H-->335,317<!--/v--> years at J2000 (the Earth Fundamental Cycle, H; slowly evolves under deep-time tidal evolution)
- **Axial precession**: <!--v:axialPrecRound-->~25,794<!--/v--> years (H/13)
- **Inclination precession**: <!--v:inclPrecYears-->~111,772<!--/v--> years (H/3)
- **Perihelion precession**: <!--v:periPrecYears-->~20,957<!--/v--> years (H/16)
- **Model parameters**: only **6 free parameters** for the entire model; everything else is derived or anchored to astronomical observations (the full accounting is in the [Constants Reference](docs/20-constants-reference.md))

---

## Citing

If you use this software or the model's results, cite the
[preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4) — machine-readable
citation metadata is in [CITATION.cff](CITATION.cff) (GitHub's "Cite this
repository" button). When quoting computed numbers, cite them as
*model vX.Y (package A.B.C)*: every published `@essrt/*` package version
immutably records the model identity it was built from, so any pinned
version reproduces its numbers forever.

## Credits

Built on the work of others. Full attribution, licences and data provenance are
in [NOTICE](NOTICE) — that is the authoritative list; this is the short version.

**Incorporated under copyleft**

- [Tychosium](https://codepen.io/pholmq/pen/XGPrPd) — © 2018 Simon Shack, Patrik
  Holmqvist (GPL). The simulator began from this source.
- [ytliu0/ElpMpp02](https://github.com/ytliu0/ElpMpp02) — © Y.-T. Liu (GPL-3.0).
  `tools/lib/elp-mpp02.js` is a port of its reference implementation, and the
  ELP/MPP02 series data came through it.

**Libraries** — [Three.js](https://threejs.org/) (rendering) ·
[Tweakpane](https://tweakpane.github.io/docs/) (UI) ·
[Plotly.js](https://plotly.com/javascript/) (dashboard charts) ·
[SheetJS](https://sheetjs.com/) (spreadsheets)

**Data** — [Yale Bright Star Catalog](https://github.com/brettonw/YaleBrightStarCatalog)
(stars) · [Solar System Scope](https://www.solarsystemscope.com/textures/)
(textures) · IMCCE and Chapront & Francou (ELP lunar series) · paleoclimate and
historical eclipse records — per-dataset sources, citations and licences in
[data/PROVENANCE.md](data/PROVENANCE.md)

## License

This software is licensed under the **GNU Affero General Public License v3.0
(AGPL-3.0)**. The full text is in [LICENSE](LICENSE).

**What this means for you**

- You may **use, study, modify and redistribute** this software freely.
- Any derivative work must also be released under AGPL-3.0, with attribution.
- **Network clause:** if you run a modified version as a network service, you
  must make your modified source available to its users. This is the difference
  between AGPL and plain GPL, and it is deliberate.

The licence boundary is tagged. [`v9`](https://github.com/dvansonsbeek/3d/releases/tag/v9)
is the final release under GPL-3.0; [`v10`](https://github.com/dvansonsbeek/3d/releases/tag/v10)
is the first under AGPL-3.0. Anyone who received the project at or before `v9`
holds an irrevocable GPL-3.0 grant over it, which carries no network clause;
AGPL-3.0 applies from `v10` onward.

**Commercial licensing.** If AGPL-3.0 does not suit your use — for example you
wish to build on this model without the reciprocal source obligations —
enquiries are welcome. Contact
[dennis@holisticuniverse.com](mailto:dennis@holisticuniverse.com).

**Why AGPL.** The model is intended to be openly studied and independently
reproducible — the accompanying [preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4)
depends on that. Copyleft keeps derivative versions open and attributed rather
than diverging into closed forks, and the network clause ensures the same holds
for hosted services.

## Contact

For questions about the model or if you want to help develop this further:

- **Email:** [dennis@holisticuniverse.com](mailto:dennis@holisticuniverse.com)
- **Website:** [holisticuniverse.com](https://holisticuniverse.com)
- **GitHub Issues:** [Report a bug or request a feature](https://github.com/dvansonsbeek/3d/issues)
