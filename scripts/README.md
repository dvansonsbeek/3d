# Fibonacci Laws — Investigation & Verification Scripts

Python (and a few JavaScript) scripts for investigating, verifying, and reproducing the results of the [Fibonacci Laws of Planetary Motion](https://www.holisticuniverse.com).

These scripts were used during the research to discover and verify the six Fibonacci Laws that connect planetary orbital tilts, eccentricities, and precession rates to the Earth Fundamental Cycle timescale (H; see [Constants Reference](../docs/20-constants-reference.md)).

> **How this README is organized.** Each section lists the **canonical entry-point script(s)** for a given topic with a short description, followed by a one-line note pointing at the supporting scripts in the same folder (and the doc that catalogs them per test). This README is intentionally curated — for the full per-test mapping, see the corresponding doc. Browse the folder directly for the supporting scripts.

---

## Quick Start

```bash
# Run the statistical significance test (~2–3 min, 100k MC trials)
python fibonacci_significance.py
# → writes data/significance-results.json (consumed by tools/fit/export-to-holistic.js)

# Verify J2000 eccentricity formation constraints
python fibonacci_j2000_eccentricity.py

# Run the canonical 32-component climate formula fit
python milankovitch_climate_formula.py
# → writes data/milankovitch-climate-formula.json
#   (consumed by src/script.js Orbital Forcing Formula Explorer)

# Run the deep-time Architecture α canonical 9-step chain at Devonian
python devonian_cross_check.py
```

---

## Script Overview

> **Shared library** (`constants_scripts.py`, `predictive_formula.py`, `observed_formula.py`, `coefficients/`) lives in [`tools/lib/python/`](../tools/lib/python/README.md). All scripts here load it via `sys.path` at startup.

### Statistical Significance

| Script | Description |
|--------|-------------|
| `fibonacci_significance.py` | Statistical significance of the Fibonacci Laws. 11 tests across 3 null distributions (permutation, log-uniform Monte Carlo, uniform Monte Carlo). Headline combined p spans 1.4 × 10⁻⁴ to 6.8 × 10⁻⁶ (3.6σ–4.4σ). Output: `data/significance-results.json` |
| `test_fibonacci_significance.py` | Regression test: locks in the 11 observed test statistics to guard against silent drift when underlying constants change. |

### The Six Laws

| Script | Laws tested | Description |
|--------|-------------|-------------|
| `fibonacci_eccentricity_scale.py` | Laws 4, 5 | The solar system as an eccentricity balance scale — K constant + per-planet breakdowns |
| `fibonacci_eccentricity_structure.py` | Laws 4, 5 | Two-component decomposition (base + amplitude), mirror pair conservation |
| `fibonacci_psi_amd.py` | Law 2 | AMD interpretation of ψ — mass cancellation, amplitude budget |
| `predict_tilt_from_eccentricity.py` | Law 4 | K amplitude constant — universality, tilt prediction, K-ψ relations |

Plus `fibonacci_amd_structure.py` and `fibonacci_law4_balance_search.py` for systematic AMD-based and single-balance-equation investigations.

### Formation & Exoplanet Tests

| Script | Description |
|--------|-------------|
| `fibonacci_j2000_eccentricity.py` | J2000 eccentricities as formation-epoch Fibonacci constraints (p < 10⁻⁵) |
| `fibonacci_trappist1_deep.py` | TRAPPIST-1: Fibonacci period ratios, super-period = 311 × P_b, additive triads |
| `fibonacci_311_deep.py` | Deep investigation of R = 311 as a Fibonacci primitive root prime |

Plus `fibonacci_311_analysis.py` (R = ψ/ξ_V = 311 factor analysis) and `fibonacci_exoplanet_test.py` (broader TRAPPIST-1 + Kepler-90 tests).

### Milankovitch & Paleoclimate (Docs 90–95)

Empirical tests on LR04 + Cheng 2016 + EPICA + CENOGRID paleoclimate records, building toward the canonical 32-component 8H integer-divisor climate formula (L1 + L2 + L3, sequential ridge fit per regime).

**Main pipeline** (produces the formula + per-planet attribution):

| Script | Description |
|--------|-------------|
| `milankovitch_climate_formula.py` | **The headline result.** Canonical three-layer climate formula — 32 L1 integers + 3 L2 thermostat lines + 6 L3 Heaviside step transitions, fit per regime with sequential ridge regression. Per-regime R²: post-MPT = 0.87, EPICA CO₂ = 0.85, CenCO2PIP 0–66 Ma = 0.76. Forward-projects 250 kyr (next natural glaciation peak ~58 kyr ahead). Output: `data/milankovitch-climate-formula.json` — also consumed by `src/script.js` (Orbital Forcing Formula Explorer modal). |
| `milankovitch_8h_divisor_spectrum.py` | Single-component OLS amplitude scan over all integer divisors of 8H = 2,682.536 kyr. Source of the §2.2 integer table. |
| `milankovitch_8h_closure_test.py` | **8H integer-lattice closure test** (doc 91 §7.3). Fits all 200 divisors jointly to LR04 (R² = 0.443) and scans residuals at non-integer positions. No orphan peaks land in empty regions of the lattice. |
| `milankovitch_8h_beat_decomposition.py` | Enumerates physical interpretations (climatic-precession k+g_j, obliquity k+s_j, eccentricity g_j−g_k, etc.) using Laskar 2004 secular eigenfrequencies. |
| `milankovitch_planet_climate_match.py` | Per-planet match counts: cross-references LR04 peaks against the doc 55 8H/n period table (8 planets × 6 cycle types). |

**Spectral / supporting tests** (~4 scripts): `milankovitch_spectral_tests.py` (Lomb-Scargle + multitaper + Hinich bispectrum; 405-kyr absence + LR04-vs-Cheng chronology-bias), `milankovitch_candidate_amplitudes.py` (Berger candidates vs Holistic H-divisors head-to-head), `milankovitch_temporal_structure.py` (non-stationarity diagnostics), `mpt_transition_analysis.py` (pre-MPT vs post-MPT amplitude growth).

**Pre-registered Tests A–N + 8H super-cycle** (doc 91 §10 + §12): ~17 scripts including `milankovitch_8h_super_cycle_test.py` (NULL result), `milankovitch_8h_cenogrid_spectral.py`, `milankovitch_8h_cenogrid_windowed.py`, plus one script per test (`milankovitch_8h_13h_boulila_check.py` for Test A, `milankovitch_8h_cheng_*.py` for Test B0/B1/B2/B3, `milankovitch_8h_random_period_null.py` for Test C, etc. through Test N). See [doc 91](../docs/91-milankovitch-evidence.md) §12 for the per-test mapping.

**405-kyr investigation** (doc 92 §6): 7 scripts `milankovitch_8h_405k_*.py` characterizing the 405-kyr line as a carbon-cycle internal resonance rather than a Venus-Jupiter beat (404.5 kyr line centre, 2.59× amplitude decline from Paleocene to Pliocene, δ¹³C/δ¹⁸O ratio 1.53× at 405 kyr). See [doc 92](../docs/92-climate-formula.md) §6.

**Variance budget + follow-ups** (doc 92): ~10 scripts including the variance-budget cluster (`milankovitch_8h_variance_budget*.py` Tier A/B rounds 1-3), `milankovitch_inclination_test.py`, `milankovitch_insolation_extension.py`, `milankovitch_insolation_laskar_check.py`, `milankovitch_l1_dual_attribution.py`, `milankovitch_late_pliocene_analogue.py`, `milankovitch_timing_offset_diagnosis.py`, `fit_methodology_diagnostics.py`, plus `climate_formula_mwp_check.py` (Medieval Warm Period climate-formula check).

### Paleoclimate ECS Decomposition (Doc 97)

Climate sensitivity (Charney ECS) decomposition across paleoclimate eras using the 8H L1 lattice. Cross-proxy validation on LR04, EPICA, Snyder GAST, and multiple boron-isotope CO₂ reconstructions (0–67 Ma). See [doc 97](../docs/97-paleo-ecs-decomposition.md).

| Script | Description |
|--------|-------------|
| `climate_ecs_tight.py` | **Tightened ECS** — frequency-dependent ice fraction (replaces constant f_ice=0.6), regime-conditional forcing kernels, refined error budget. Recommended entry point. |
| `climate_ecs_cross_proxy.py` | Cross-proxy validation of L1 amplitude structure across δ¹⁸O / CO₂ / GAST. |

Plus 8 supporting scripts: `climate_ecs_boron.py` (boron-isotope CO₂ reconstructions), `climate_ecs_full_forcing.py` (CO₂ + ice-albedo + GHGs), `climate_ecs_monte_carlo.py`, `climate_ecs_per_regime.py`, `climate_ecs_phase_lag.py`, `climate_ecs_snyder.py`, `cenogrid_l1_lattice_extension.py`, `cenogrid_mtm_ftest.py`.

### Lattice Mechanism (Doc 98)

Physical mechanism behind the 8H lattice: action-angle closure, Chirikov resonance overlap, commensurability. See [doc 98](../docs/98-lattice-mechanism.md).

| Script | Description |
|--------|-------------|
| `action_closure_test.py` | **Experiment A** — Action-angle closure test for the 8H period. Tests whether all 32 L1 integers' action vectors close on themselves modulo 8H. |
| `chirikov_resonance_test.py` | **Experiment B** — Chirikov resonance overlap criterion at each L1 integer. |
| `eight_h_derivation_test.py` | **Experiment 1** — derives 8H from Laskar eigenfrequency / LA2004 spectral data, validating the closure period. |

Plus mechanism follow-ups + sub-lattice + stability scans (~12 scripts): `laplace_lagrange_first_principles.py` (Laplace-Lagrange secular eigenfrequencies from first principles), `solar_8H_lattice_test.py` (cross-domain test in solar-activity records), `equilibrium_libration_test.py`, `lod_oscillation_signature_test.py`, `paleo_lod_comparison.py`, `paleo_l1_renumbering.py`, `eight_h_history.py`, `h8_subband_scan.py`, `h_multiple_scan.py`, `l1_invariant_test.py`, `l1_fibonacci_stability_test.py`, `stability_sublattice_full_scan.py`, `precession_band_disambiguation.py`.

### Deep-Time Architecture α (Doc 99)

The deep-time extension framework — canonical 9-step chain from `t_Ma` through LOD, H, AU, M_Sun, Kepler year, Moon distance, Moon period, anomalistic year, stellar/sidereal days, planet orbital + synodic periods. See [doc 99 — Expanding Solar System Resonance Theory (ESSRT)](../docs/99-expanding-solar-system-resonance-theory.md).

| Script | Description |
|--------|-------------|
| `devonian_cross_check.py` | **Canonical 9-step chain verification at Devonian (t = 380 Ma).** All J2000 values match IAU to ppb precision; produces deep-time predictions for LOD (79,204 s), H (307,391 yr), Moon distance (370,402 km), Moon synodic month, anomalistic year, stellar/sidereal days, and planet orbital periods. Single source of truth for Architecture α numerics. |
| `test_evolving_8h_climate_formula.py` | Tests whether time-evolving 8H(t) improves the climate formula vs constant 8H_now. **Result: NULL** at Phanerozoic (ΔR² < 0.002). |

### Eclipse Data Pipeline (Docs 100–103)

Scripts that fetch and parse the historical eclipse datasets used by the ΔT validation work in [doc 101](../docs/101-pure-tidal-eclipses.md), [doc 102](../docs/102-gia-alpha-lunar-validation.md), and [doc 103](../docs/103-135-babylonian-case-study.md):

| Script | Description |
|--------|-------------|
| `fetch_nasa_lunar_canon.py` | Scrapes NASA 5-Millennium Canon of Lunar Eclipses (12,064 events, −1999 BCE to +3000 CE) → `public/input/lunar-eclipses-nasa.json`. |
| `fetch_nasa_historical_lunar.py` | Parses NASA "Lunar Eclipses of Historical Interest" (28 famous events). |
| `parse_stephenson_lunar.py` | Parses Stephenson, Morrison & Hohenkerk 2016 timed-lunar supplementary tables (270 observations across S01/S02/S04/S05/S07/S09) → `public/input/lunar-eclipses-stephenson-2016.json`. |
| `parse_stephenson_solar.py` | Parses Stephenson 2016 timed-solar tables (89 observations across S03/S06/S08) → `public/input/solar-eclipses-stephenson-2016.json`. |
| `parse_stephenson_deltaT_polynomial.py` | Parses Stephenson 2016 piecewise ΔT polynomial for direct comparison against the framework's pure-tidal + α(t) ΔT. |
| `stephenson_observation_density.py` | Observation-density analysis across Stephenson 2016 tables for diagnostic context (which centuries are well-observed, which are sparse). |

### Framework vs Laskar / N-body comparisons

Direct head-to-head tests against Laskar 2004 secular eigenmode theory + tidal-dissipation models.

| Script | Description |
|--------|-------------|
| `framework_vs_laskar_models.py` | Direct comparison: framework's bounded-oscillator models vs LA2004's secular-eigenmode + tidal-dissipation models. |
| `l1_vs_laskar_eigenmodes.py` | Tests whether the 8H L1 integers correspond to Laskar 2004 secular eigenmode beats — discriminates between framework interpretations. |
| `nbody_50myr_backward.py` | Extends the in-repo 10-Myr forward N-body integration backward to −50 Myr — independent ground truth against the framework's L1 lattice. |

Plus `l1_vs_laskar_50myr.py` and `l1_vs_laskar_published_50myr.py` for forward-integrated and published-LA2004 50-Myr validations.

### Falsifiable Predictions

| Script | Description |
|--------|-------------|
| `planet_nine_analysis.py` | Planet Nine prediction — falsifiable test from the Fibonacci balance laws. Two-tier structure (Law-4 compliance pre-check + full 7.5M-config v-balance search) confirms rejection of a major 9th planet at ETNO distances. See [doc 15](../docs/15-planet-nine-prediction.md). |
| `tno_balance_test.py` | TNO contribution to Law 5 balance — population-summed and individual approaches. |
| `tno_obliquity_prediction.py` | Law-4 TNO obliquity predictions — derives expected TNO axial tilts from the K amplitude constant. |

### Browser-Modal Data Exports

One-shot utilities that prepare data for the in-app modals. Outputs are committed; no re-runs expected unless source data updates.

| Script | Description |
|--------|-------------|
| `export_climate_formula_browser.py` | Climate Formula coefficients → `public/input/climate-formula-data.json` (Orbital Forcing Formula Explorer modal). |
| `export_cenogrid_browser.py` | Westerhold 2020 CENOGRID (δ¹⁸O + δ¹³C, 67-Myr) → `public/input/cenogrid-data.json`. |
| `export_cenco2pip_browser.py` | CenCO2PIP atmospheric CO₂ proxy → `public/input/cenco2pip-data.json`. |
| `export_epica_browser.py` | EPICA Dome C atmospheric CO₂ (Bereiter 2015) → `public/input/epica-co2-data.json`. |
| `extract_insolation_features.js` | Extracts Berger 1978 insolation features (obliquity ε(t), eccentricity e(t), climatic-precession e·sin(ϖ) / e·cos(ϖ)) for the L1+L2+L3-vs-insolation tests (doc 94). |
| `mass_uncertainty_monte_carlo.py` | Monte Carlo over planetary mass uncertainties → marginalized Law 5 balance distribution. |

### Bond cycle (deferred research artifacts)

The 8H/1825 = 1,469.88 yr "Bond cycle" lattice harmonic was investigated as a candidate explanation for the residual after α(t) GIA correction in doc 102. It fits the Holocene ΔT residual extremely well (cross-validation R² = +0.97 BCE-from-CE) but its integration into the live LOD chain was deferred because it broke the J2000 LOD anchor. The following research scripts are preserved as artifacts:

`export_bond_cycle_residual_fit.py`, `lod_residual_lattice_fit.py`, `lod_residual_lattice_cv.py`, `lod_residual_bond_devries_cv.py`. See [doc 102](../docs/102-gia-alpha-lunar-validation.md) §"Bond cycle" for the status discussion.

### Utility scripts

`test_phase0_inline.js` and `verify_cumul_integral.js` — JavaScript test/verification utilities for the deep-time chain's cumulative-integral implementation.

### Archived scripts

Completed search scripts moved to `archive/`:
- `fibonacci_law4_reformulation_search.py` — R² pair reformulation search (concluded: at noise level)
- `fibonacci_law4_verify.py` — R² pair constraint verification (superseded by Law 4 = K constant)
- `milankovitch_amplitude_fit.py` — early 8-candidate multi-component fit (superseded by `milankovitch_candidate_amplitudes.py` and `milankovitch_climate_formula.py`)
- `generate_lr04_json.py` — one-shot utility converting `data/lr04-stack.txt` to `public/input/lr04-data.json` (output committed; no re-runs expected)

---

## Data Files

| File | Description |
|------|-------------|
| [`../data/01-holistic-year-objects-data.xlsx`](../data/01-holistic-year-objects-data.xlsx) | Excel data file with planet perihelions, fluctuations, Earth eccentricity/obliquity. All Fibonacci-Law scripts read from this via `constants_scripts.py`. |
| [`../data/lr04-stack.txt`](../data/lr04-stack.txt) | LR04 benthic δ¹⁸O stack (Lisiecki & Raymo 2005, *Paleoceanography* 20, PA1003) — 5.3 Myr orbitally-tuned marine climate record. |
| [`../data/cheng2016-speleothem.txt`](../data/cheng2016-speleothem.txt) | Cheng 2016 U-Th-dated Asian Monsoon speleothem record (*Science* 352, 343) — 640-kyr non-tuned chronology bias control. |
| [`../data/epica-co2-bereiter2015.txt`](../data/epica-co2-bereiter2015.txt) | Bereiter et al. 2015 (*GRL* 42, 542) EPICA Dome C composite atmospheric CO₂ record — 0–800 kyr BP, Antarctic ice cores. |
| [`../data/westerhold2020-cenogrid.tab`](../data/westerhold2020-cenogrid.tab) | Westerhold et al. 2020 (*Science* 369, 1383) CENOGRID — 67-Myr astronomically tuned benthic δ¹⁸O+δ¹³C reference splice. |

---

## Dependencies

- **Python** 3.8+
- **numpy** — numerical computations
- **pandas** — data manipulation
- **openpyxl** — Excel file reading

All dependencies are standard scientific Python packages.

---

## Related Resources

- [Interactive 3D Simulation](https://3d.holisticuniverse.com)
- [Model Documentation](https://www.holisticuniverse.com)
- [Fitting Pipeline](../tools/fit/README.md)

---

## License

These scripts are part of the [Interactive 3D Solar System Simulation](https://github.com/dvansonsbeek/3d) project and are released under the [GNU General Public License v3.0](../../LICENSE).
