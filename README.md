# ESSRT — Interactive 3D Solar System Simulation

[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](LICENSE)
[![Model version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdvansonsbeek%2F3d%2Fmain%2Fpublic%2Finput%2Fmodel-version.json&query=%24.modelVersion&label=model&color=green)](public/input/model-version.json)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-orange.svg)](https://threejs.org/)
[![npm @essrt/physics](https://img.shields.io/npm/v/%40essrt%2Fphysics?label=%40essrt%2Fphysics)](https://www.npmjs.com/package/@essrt/physics)
[![npm @essrt/model-values](https://img.shields.io/npm/v/%40essrt%2Fmodel-values?label=%40essrt%2Fmodel-values)](https://www.npmjs.com/package/@essrt/model-values)

![Solar System Simulation](https://raw.githubusercontent.com/dvansonsbeek/3d/main/public/readme.png)

> **[Live Demo](https://3d.holisticuniverse.com)** — the simulation in your browser, auto-deployed from every verified commit. Visits are counted with [GoatCounter](https://www.goatcounter.com/) — cookieless, no personal data; see the [privacy policy](https://holisticuniverse.com/en/privacypolicy).
>
> **[Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4)** — the accompanying research paper

One seed, one derived clock and one codebase produce Earth's precession, timekeeping, eclipses and the orbital climate lines together — and the chain's evolution through geological time is gated by the rock record.

This repository is the simulator and the model behind the **Expanding Solar System Resonance Theory (ESSRT)**. The physics composed here is standard — Newtonian N-body integration with the first-order relativistic correction, the averaged precession equation, tidal dissipation, secular perturbation theory — and the component results reproduce the established ones. What is new is the integration: one cited J2000 state and one derived clock give the planets' orbits, Earth's precession, obliquity, eccentricity and day and year lengths, the eclipse geometry, the climate formula's line positions and the clock's evolution through geological time, from one closed chain. Because the chain is closed end to end, one input constant can be perturbed and the whole system re-run — which is what turns an integration into a source of testable consequences, and those consequences, at geological time, are the part that can be wrong.

---

## One Seed, One Clock

The model has two engines and one clock.

- **The N-body engine — the planets.** Standard Newtonian gravity with the first-order relativistic correction, integrated from one cited J2000 heliocentric state (JPL Horizons vectors, DE440 mass ratios) with **zero fitted constants**. It supplies every planet's orbit of date, the secular modes, the <!--v:earthDeepBeatPeriodKyr-->405.6<!--/v-->-kyr eccentricity metronome, and Earth's own eccentricity, inclination, node and perihelion of date. Mercury's relativistic perihelion share emerges as derived physics inside its measured advance.
- **The clock — Earth's spin and time.** The mean lunisolar precession period, <!--v:lunisolarPeriodJ2000Yr-->25,771.4<!--/v--> years at J2000, is derived from the model's own sidereal and tropical year laws and agrees with the IAU value to eight parts in a million. Earth's other spin-side periods are read against it as ratios of periods, and the clock lengthens through geological time as tides slow the spin.

Two of Earth's precession motions rotate in **opposite directions**, so their frequencies add:

| Motion | Direction | Period at J2000 |
|--------|-----------|-----------------|
| Axial precession (the clock) | Clockwise | <!--v:axialPrecRound-->~25,771<!--/v--> years |
| Apsidal precession (the orbit's own motion, a J2000 reading) | Counter-clockwise | <!--v:inclPrecYears-->~111,635<!--/v--> years |

Their beat is the perihelion-of-date cycle, <!--v:periPrecYears-->~20,938<!--/v--> years (1/T_peri = 1/T_p + 1/T_aps), the carrier of the climatic-precession band. The apsidal period is <!--v:lunisolarApsidalPerPrecessionJ2000-->4.332<!--/v--> precession periods today and wanders between <!--v:lunisolarApsidalPerPrecessionWanderMin-->1.08<!--/v--> and <!--v:lunisolarApsidalPerPrecessionWanderMax-->9.81<!--/v--> across ±26 kyr: the ratio is a reading of two different clocks, not a gearing between them. The obliquity band is the beat of the clock against the orbit's own nodal mode, <!--v:obliqBeatJ2000Kyr-->41.2<!--/v--> kyr today. The simulator's Lunisolar Clock panel shows the live ratios.

A third layer — a fitted timing anchor of <!--v:holisticYear-->335,317<!--/v--> years, calibrated on the 1246 AD perihelion–solstice alignment — is the unit of the small periodic corrections that bring the time-domain machinery onto the observed cardinal points, day lengths and eclipses. It is bookkeeping, not a cycle: it scales with the precession period at deep time and is not a period of anything the model computes. The full parameter accounting is three ledgers — zero fitted constants on the planetary side, the derived clock, and five named device constants of the frozen era machinery — in the [Constants Reference](docs/20-constants-reference.md). **Nothing is tuned per phenomenon**: move the anchor by a few years and the cardinal points, the day lengths and the eclipses stop matching the record together.

---

## How Far It Holds

The same machinery, checked against independent records across six orders of magnitude in time:

| Surface | Reference | Agreement |
|---|---|---|
| Position of the Sun | JPL Horizons | <!--v:frameworkSunVsJplRms-->1.03<!--/v-->″ RMS — the Meeus Ch. 25 reference reads <!--v:meeusCh25SunVsJplRms-->1.02<!--/v-->″ |
| Positions of the seven planets | JPL Horizons, 2000–2099 | <!--v:jupiterChainVsJplRms2000sArcsec-->10.3<!--/v-->″ (Jupiter) to <!--v:marsChainVsJplRms2000sArcsec-->35.7<!--/v-->″ (Mars); every target inside 0.012° across 1800–2100 |
| Cardinal points (equinoxes and solstices) | JPL Horizons, −3000 to +2000 | <!--v:cardinalVsHorizonsMeanMin-->−0.71<!--/v--> min mean |
| Solar eclipses | <!--v:solarAudit26Total-->26<!--/v-->-event documented audit, −762 to 2026 CE | <!--v:solarAudit26ScanReach-->21<!--/v-->/<!--v:solarAudit26Total-->26<!--/v--> with the umbra reaching the observation site |
| Lunar eclipse timings | Stephenson 2016, <!--v:lunarEventsTotal-->267<!--/v-->-event set | <!--v:lunarResidualMinutes-->20.2<!--/v--> min mean \|residual\|, with zero parameters fitted to eclipse data |
| Earth's obliquity | La2004 | <!--v:epsHybridEraRms13KyrArcsec-->50<!--/v-->″ rms over 13 kyr |
| Climate record | CenCO2PIP, 0–66 Ma | R² = <!--v:canonCenco2pipTotal-->0.692<!--/v--> |
| Devonian day count | Wells 1963 coral growth bands, 380 Ma | <!--v:anchorWellsFlagship380Pred-->399.96<!--/v--> days per year predicted against the paleontological 400 (<!--v:anchorWellsFlagship380DeltaPct-->−0.01<!--/v--> %) |
| Deep-time precession | Dated Precambrian sections | gated at 1.4 and 2.46 Ga |

The numbers were derived from measurement, not theorized, and the same engine produces all of them. The deep-time rows are predictions, not fits: the parameters are anchored on modern data and projected through the physics chain.

---

## Deep Time — the Two Expansions

The clock is not fixed. Two physically independent drivers stretch the model's periods across geological time:

- **Driver 1 — Earth–Moon tidal evolution.** The day lengthens, the Moon recedes, and the mean lunisolar precession period follows the composed torque rate — Earth's spin carrying the solar and lunar torques, the lunar torque growing as the Moon was closer. The axial precession period was <!--v:axialPrecAtDevonian-->21,699<!--/v--> years in the Devonian, is <!--v:axialPrecRound-->~25,771<!--/v--> years today and reaches <!--v:axialPrecAt200MyrFuture-->28,208<!--/v--> years in 200 Myr; the obliquity band follows the beat of that precession against the orbit's nodal mode.
- **Driver 2 — solar mass loss.** Every orbit slowly expands by Kepler's third law. The long-eccentricity band stays at its modern class, scaled only by the measured solar-mass history.

The climate formula rides the engine's own orbital lines — the beats of the N-body chain's secular modes with the precession clock, together with the 405.6-kyr eccentricity family ([Doc 92](docs/92-climate-formula.md)). Their *periods* are what the model commits to: a significant climate peak that is none of them would falsify the orbital-forcing layer. The deep-time theory, its predictions and the Earth–Moon genesis epoch are in [Doc 99 — ESSRT](docs/99-expanding-solar-system-resonance-theory.md).

**The model stands falsifiable on three pre-registered legs:**

1. **The deep-time scaling split.** Earth's axial precession must follow the composed lunisolar rate — spin from the recession history, the lunar torque growing with the Moon's approach — and the obliquity band its beat against the orbital mode s₃, while the 405-kyr band does not scale. The precession side is gated against the published constants at 1.4 and 2.46 Ga and tested afresh by every newly dated Precambrian section.
2. **Historical-era exactness.** The fail-proven gate suite: eclipses, the LOD/ΔT stack, cardinal points, the paleo anchors — where an unexplained *improvement* fails too.
3. **Two-expansions consistency.** The rock-measured long-eccentricity period must track the engine's beat under the measured solar-mass history.

---

## How It Works in the Scene

The Sun is still the centre of the solar system. The scene uses a geo-heliocentric frame — viewing from Earth's perspective — to make the two counter-rotating precession motions visible:

- **Earth's wobble centre** circles Earth clockwise in <!--v:axialPrecRound-->~25,771<!--/v--> years — axial precession.
- **Earth's perihelion point** wobbles counter-clockwise around the Sun in <!--v:inclPrecYears-->~111,635<!--/v--> years — apsidal precession.
- The two motions **meet every <!--v:periPrecYears-->~20,938<!--/v--> years** — perihelion precession.
- Earth orbits its perihelion point in one solar year; the seven planets follow their own N-body element chains, Kepler ellipses of date.

Obliquity, inclination and the precession movements all follow from these two motions read against one clock. They are reference points, not forces. For the full account see [holisticuniverse.com](https://holisticuniverse.com).

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) **20 or newer** — for the simulation and the tooling. The headless-browser tests pull in Playwright, which requires ≥20; CI runs Node 22
- [Python 3](https://www.python.org/) (optional) — for the fitting pipeline's Python steps (`tools/fit/python/`) and the analysis scripts (`scripts/`)

### Installation

```bash
git clone https://github.com/dvansonsbeek/3d.git
cd 3d
npm install
npm start
```

The simulation opens in your browser at `http://localhost:1234`.

### Use the Model as a Package

The complete physics core — constants, fitted coefficients, every factory —
is published as [`@essrt/physics`](https://www.npmjs.com/package/@essrt/physics)
(AGPL-3.0), and the rendered display values as
[`@essrt/model-values`](https://www.npmjs.com/package/@essrt/model-values).
Every published version immutably ships one recorded model identity
(`modelVersion` + coefficient hashes), so any number you compute from a pinned
version is reproducible forever:

```bash
npm install @essrt/physics @essrt/model-values
```

```js
import { createModel } from '@essrt/physics';
const model = createModel();
model.lunisolar.meanPeriodYearsAtYear(2000);         // the clock at J2000
model.lunisolar.meanPeriodYearsAtYear(2000 - 380e6); // the Devonian clock
```

### Python Analysis Scripts (Optional)

The `scripts/` directory holds the analysis and verification scripts: the climate formula and its spectral tests on the paleoclimate records (LR04, Cheng 2016, CENOGRID, EPICA, CenCO2PIP), the LOD/ΔT stack, the paleo anchors and the null tests. Python here only *reads* the model through one bridge and never defines physics — a boundary the check chain enforces.

```bash
pip install -r requirements.txt   # numpy, pandas, openpyxl, scipy, astropy
python3 scripts/milankovitch_climate_formula.py
```

Most datasets these scripts need are committed under `data/`. Two are not ours to
redistribute and must be fetched separately — SILSO sunspot numbers and the
Snyder (2016) source data — so the scripts using them report a missing file
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
- Of the 24 scripts in `tools/verify/`, only the five gates can actually fail —
  the rest print analysis without asserting anything. `test:verify` runs the real
  gates and deliberately skips the twelve generators, which regenerate tracked
  data files rather than checking them. The suite fails on any unclassified
  script, so the inventory cannot silently drift.

---

## Features

- Interactive 3D solar system with textured planets, rings, shadows and starfield; the seven planets render from the model's own N-body element chain
- **The Derived Sun**: the apparent solar longitude assembled from framework structure with zero fitted solar constants — <!--v:frameworkSunVsJplRms-->1.03<!--/v-->″ RMS against JPL Horizons, where the Meeus Ch. 25 reference reads <!--v:meeusCh25SunVsJplRms-->1.02<!--/v-->″ — and the same longitude drives the eclipse chain and the visible scene
- **The Derived Moon**: a framework-native lunar theory in Meeus Ch. 47's form with every constant derived, attributed or anchored by design — periodic amplitudes reproduced from gravity alone, the secular budget closed against primary sources with zero free parameters, and the geometric series Moon measured against JPL Horizons' apparent Moon over 1970–2049
- Deep-time mode as the shipped default: scrub the time slider across geological timescales and the whole scene — Earth, Moon, the seven planets and the reference frames — moves to the epoch
- Time controls: play, pause, speed adjustment and date navigation; click any planet to focus the camera and see its orbital data
- Planet info sidebar with per-planet data, charts and precession analysis
- **Earth Climate Analysis** — a Tools-menu modal plotting the canonical climate formula over four proxy records across eight time-window tabs (CenCO2PIP 66 Myr → forward projection of the next natural glaciation)
- Console tests for year length, day length and calibration; export of solstice dates and object positions
- Built with [Three.js](https://threejs.org/) and [Tweakpane v4](https://tweakpane.github.io/docs/)

---

## Deep-Time Implementation — Hadean to +200 Myr

The model's parameters apply at **all epochs from the Hadean (4.5 Gyr ago, the Moon at the rigid Roche limit) through J2000 and into the future tidal-lock asymptote at ~<!--v:tidalLockRE-->87.1<!--/v--> R_⊕**. [Doc 99](docs/99-expanding-solar-system-resonance-theory.md) documents the canonical chain from the epoch through the length of day, the mean lunisolar precession period, the AU, solar mass loss, the Kepler year, the Moon's distance and synodic month, the anomalistic year, the stellar and sidereal days and the planets' orbital and synodic periods. The chain is anchored to modern Lunar Laser Ranging and the [Farhat 2022](https://www.aanda.org/articles/aa/full_html/2022/09/aa44329-22/aa44329-22.html) lunar-distance evolution; the deep-time outputs are then validated against external anchors the model was **not** fit against:

- **Wells 1963** (Devonian coral growth bands at 380 Ma): <!--v:anchorWellsFlagship380Pred-->399.96<!--/v--> days per year predicted against Wells's paleontological count of 400 (<!--v:anchorWellsFlagship380DeltaPct-->−0.01<!--/v--> %)
- **Wu et al. 2024** (650-Myr cyclostratigraphy): the predicted day length and precession rate match the reconstruction across the Phanerozoic to within ~1 %
- **The Earth–Moon genesis epoch**: the model places the Moon at the rigid Roche limit 4.498 Gyr ago — between Patterson's 1956 Pb-Pb Earth age (4.55 Gyr) and the Hf-W giant-impact date (4.42 Gyr) — with no Hadean constraint in the fit

The full evidence — the published anchors, per-anchor tolerances, the documented deviations and the gate that re-checks all of it on every CI run — is assembled in the [Deep-Time Validation Dossier (Doc 106)](docs/106-deep-time-validation-dossier.md). The deep-time layer carries a regime-aware lunar-recession history: bit-identical through the gated 0–1000 Ma era, and beyond it a fitted staircase following Farhat 2022's resonant-crossing result plus two explicit solar angular-momentum channels, matching eleven published mid-Precambrian anchors within 1.3σ.

---

## Related Findings — Mass Calibration Chain

The model's gravitational parameters (`GM_Sun`, `GM_Earth`, `GM_Moon`, `GM_planet`) are computed from a self-consistent chain rather than copied from a reference table. The chain re-parameterizes classical perturbation results (Hill 1878, Brown 1908, Brouwer 1959) into compact closed forms and verifies the synthesis against JPL DE440. The physics is classical; the contribution is synthesis and presentation:

- **[Doc 24 — The Δa Mass Derivation](docs/24-moon-kepler-derivation.md)** — Part I re-parameterizes Hill–Brown's solar perturbation on the lunar orbit as `Δa = a_M·μ·m`, reproducing the textbook 384,748 km Kepler-effective Moon distance from the geometric LLR value and giving `GM_Earth` to 3.7 ppm against DE440. Part II packages three classical terms as one closed-form mass-from-moon formula, verified against 22 moons of 7 planets to 3–340 ppm. Part III is the exact Sun-side identity that makes the two-body Kepler form algebraically identical to `T = 2π·√(a³/(μ_S+μ_E))` for every planet.

These are calibration findings, not structural claims, and not improvements on Newton. `GM_Earth` and `GM_Moon` come out to ~4 ppm and `GM_Sun` to 0.07 ppm against DE440 — at the precision floor of Kepler-from-moon-orbit derivations and inside the ~22 ppm uncertainty in `G` that bounds any mass-in-kg statement.

---

## Documentation

Detailed documentation is in the [`/docs`](docs/00-readme.md) folder, organized by category:

| Range | Category | Start here |
|-------|----------|------------|
| 00–09 | Getting Started & Overview | [Introduction](docs/01-introduction.md), [User Guide](docs/02-user-guide.md), [Glossary](docs/03-glossary.md) |
| 10–19 | Theory & Model | [Day & Year Length Formulas](docs/11-length-day-year-formulas.md), [Perihelion Precession](docs/13-mercury-precession-breakdown.md) |
| 20–29 | Technical Reference | [Constants Reference](docs/20-constants-reference.md), [Formulas](docs/21-orbital-formulas-reference.md) |
| 40–49 | Architecture & Code | [Architecture](docs/40-architecture.md), [Scene Graph](docs/41-scene-graph-hierarchy.md) |
| 90–99 | Climate Analysis | [Climate Formula (Doc 92)](docs/92-climate-formula.md), [Insolation Null Test (Doc 94)](docs/94-insolation-null-test.md), [ESSRT (Doc 99)](docs/99-expanding-solar-system-resonance-theory.md) |
| 100–109 | ΔT, Historical Eclipse & Deep-Time Validation | [GIA α(t) lunar validation (Doc 102)](docs/102-gia-alpha-lunar-validation.md), [-135 Babylonian case study (Doc 103)](docs/103-135-babylonian-case-study.md), [Millennial rotation swing (Doc 104)](docs/104-millennial-rotation-swing.md), [ΔT stack flag audit (Doc 105)](docs/105-dt-stack-flag-audit.md), [Deep-Time Validation Dossier (Doc 106)](docs/106-deep-time-validation-dossier.md) |

**Investigation & Verification:**
- [Python Scripts](scripts/) — the climate formula and its spectral tests, the LOD/ΔT stack, the paleo anchors and the null tests
- [Climate Formula (Doc 92)](docs/92-climate-formula.md) — spectral analysis of five paleoclimate records (LR04, Cheng 2016, CENOGRID, EPICA CO₂, CenCO2PIP) and the canonical **climate formula** on the engine's own orbital lines, with its in-app Explorer modal and reproducing pipeline; [Doc 94](docs/94-insolation-null-test.md) is the insolation null test
- [Historical Eclipse Validation (Docs 102–103)](docs/102-gia-alpha-lunar-validation.md) — the model's ΔT formula, with **zero parameters fitted to eclipse data in the α(t) machinery**, tested on two independent tracks: a <!--v:solarAudit26Total-->26<!--/v-->-event solar-eclipse audit spanning −762 BCE to 2026 CE (see the website's [Solar Eclipse Validation](https://holisticuniverse.com/model/historical-eclipse-validation)) and a <!--v:lunarEventsTotal-->267<!--/v-->-event primary-source lunar timing test — **<!--v:lunarResidualMinutes-->20.2<!--/v-->-min mean \|residual\|**, with **<!--v:lunarEventsBeatingNasa-->121<!--/v-->/267 events (<!--v:lunarBeatingNasaPct-->45.3<!--/v-->%) closer to observation than NASA Espenak/Meeus's polynomial**. [Doc 103](docs/103-135-babylonian-case-study.md) is the −135 Babylonian case study: predicted UT within 9 minutes of the documented time, umbra centreline <!--v:babylon135BestGapKm-->169<!--/v--> km from Babylon within the scan window
- [The Derived Moon — Doc 66](docs/66-moon-meeus-corrections.md) — the framework's lunar theory: Meeus Ch. 47 with every constant derived, attributed or anchored by design, certified statistically indistinguishable from the pure-Meeus polynomials across the 12,064-event NASA lunar canon while remaining bounded at deep time
- [Fitting Pipeline](tools/fit/README.md) — the Sun optimizer, Earth perihelion harmonics, the solar-measurements window export and the obliquity, cardinal-point and year-length harmonics

---

## Fitting Pipeline

The model's constants are stored as JSON under `public/input/` — `model-parameters.json`, `astro-reference.json`, `fitted-coefficients.json`, `meeus-lunar-tables.json` and `climate-formula-coefficients.json`. When a model parameter changes, the fitting pipeline recalibrates the derived coefficients so the simulation matches JPL Horizons.

```bash
node tools/fit/run-pipeline.js --phase1        # Step 1, the Sun optimizer (~15 s)
node tools/fit/run-pipeline.js --phase2        # Steps 4a–10 (~1 h, requires the Step 3 browser export)
node tools/fit/run-pipeline.js --all           # Step 1, then 4a–10
node tools/fit/run-pipeline.js --from 5c       # resume from a step onwards
```

The pipeline runs in phases: Sun geometry → perihelion harmonics → Moon → solar measurements and harmonic fits → campaign artifacts → verify → regenerate the constants module `src/script.js` imports. Step 3 (the browser data export) is always manual. Step 6a2 exports the cardinal points, perihelion/aphelion and world angles of a −4000…+4000 window in one scene-graph pass; steps 6b–6d fit harmonics from that data. See [tools/fit/README.md](tools/fit/README.md) for the full reference.

The cardinal points (solstices and equinoxes) are **derived, not independently fitted**: their dates come from the tropical year-length model plus one shared braiding term ([the braid law, Doc 99](docs/99-expanding-solar-system-resonance-theory.md)), reaching 0.28–0.37 min RMS per event over ±270,000 years, with the seasonal spread emerging from the geometry rather than from per-point fitting.

**Safety**: Step 8 (`verify-pipeline.js`) validates all results against IAU reference values before Step 9 regenerates the constants module. If a parameter change produces unrealistic values — year lengths off IAU by more than a second, obliquity off J2000 by more than 0.01″, planet baselines that regress — the pipeline stops and reports which checks failed.

---

## Quick Facts

- **The clock**: the mean lunisolar precession period, <!--v:lunisolarPeriodJ2000Yr-->25,771.4<!--/v--> years at J2000, lengthening under tidal evolution
- **Axial precession**: <!--v:axialPrecRound-->~25,771<!--/v--> years
- **Apsidal precession**: <!--v:inclPrecYears-->~111,635<!--/v--> years, a J2000 reading of the orbit's own motion
- **Perihelion precession**: <!--v:periPrecYears-->~20,938<!--/v--> years — the beat of the two, 1/T_peri = 1/T_p + 1/T_aps
- **Obliquity band**: <!--v:obliqBeatJ2000Kyr-->41.2<!--/v--> kyr — the beat of the clock against the orbit's nodal mode
- **Model parameters**: two engines, three ledgers — zero fitted constants on the planetary side, the derived clock, and five named device constants of the frozen era machinery; everything else is derived or anchored to observation ([Constants Reference](docs/20-constants-reference.md))

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
