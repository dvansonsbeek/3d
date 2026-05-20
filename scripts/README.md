# Fibonacci Laws — Investigation & Verification Scripts

Python scripts for investigating, verifying, and reproducing the results of the [Fibonacci Laws of Planetary Motion](https://www.holisticuniverse.com).

These scripts were used during the research to discover and verify the six Fibonacci Laws that connect planetary orbital tilts, eccentricities, and precession rates to the Earth Fundamental Cycle timescale (H; see [Constants Reference](../docs/20-constants-reference.md)).

---

## Quick Start

```bash
# Run the statistical significance test (~2–3 min, 100k MC trials)
python fibonacci_significance.py
# → writes data/significance-results.json (consumed by tools/fit/export-to-holistic.js)

# Verify J2000 eccentricity formation constraints
python fibonacci_j2000_eccentricity.py

# Investigate the R = 311 Fibonacci primitive root prime
python fibonacci_311_deep.py

# Test TRAPPIST-1 exoplanet Fibonacci structure
python fibonacci_trappist1_deep.py

# Run Milankovitch spectral analysis on LR04 + Cheng2016 paleoclimate records
python milankovitch_spectral_tests.py
# → writes data/milankovitch-spectral-results.json (consumed by docs/17)
```

---

## Script Overview

> **Shared library** (`constants_scripts.py`, `predictive_formula.py`, `observed_formula.py`, `coefficients/`) lives in [`tools/lib/python/`](../tools/lib/python/README.md). All scripts here load it via `sys.path` at startup.

### Statistical Significance

| Script | Description |
|--------|-------------|
| `fibonacci_significance.py` | Statistical significance of the Fibonacci Laws. 11 tests across 3 null distributions (permutation, log-uniform Monte Carlo, uniform Monte Carlo). Of the 11 tests, 7 are structural (5 multiset-invariant under permutation + 2 tautological — Laws 2 and 4 are internally consistent by construction and cannot be statistically tested) and 4 are empirical (Laws 3, 5; Findings 4 and 6). The 4 empirical tests share the quantity √m · a^(3/2) · e / √d, so their combined p-value uses Stouffer's Z method with a Brown-style correlation correction (variance inflation factor 2.5). Headline combined p spans 1.4 × 10⁻⁴ (permutation, conservative) to 6.8 × 10⁻⁶ (log-uniform Monte Carlo), equivalently 3.6σ–4.4σ — comfortably above the 3σ "evidence" threshold. Output: `data/significance-results.json`. |

### The Six Laws

| Script | Laws tested | Description |
|--------|-------------|-------------|
| `fibonacci_eccentricity_scale.py` | Laws 4, 5 | The solar system as an eccentricity balance scale — Law 5 visualization + K constant (Law 4) |
| `fibonacci_eccentricity_structure.py` | Laws 4, 5 | Two-component decomposition (base + amplitude), mirror pair conservation laws |
| `predict_tilt_from_eccentricity.py` | Law 4 | K amplitude constant investigation — universality, tilt prediction, K-ψ relations |
| `fibonacci_law4_balance_search.py` | Law 5 | Proves exactly one balance equation exists in (m, a, d) space — Law 5 itself |
| `fibonacci_psi_amd.py` | Law 2 | AMD interpretation of ψ: mass cancellation, amplitude budget, eccentricity parallel |
| `fibonacci_amd_structure.py` | Law 2 | Systematic AMD-based investigation of Fibonacci inclination structure (complements `fibonacci_psi_amd.py`) |

### Formation & Structure

| Script | Description |
|--------|-------------|
| `fibonacci_j2000_eccentricity.py` | J2000 eccentricities as formation-epoch Fibonacci constraints (p < 10⁻⁵) |
| `fibonacci_311_deep.py` | Deep investigation of R = 311 as a Fibonacci primitive root prime |
| `fibonacci_311_analysis.py` | R = ψ/ξ_V = 311: factor analysis, systematic search for ψ = f(H, φ, π) |

### Exoplanet Tests

| Script | Description |
|--------|-------------|
| `fibonacci_trappist1_deep.py` | TRAPPIST-1: Fibonacci period ratios, super-period = 311 × P_b, additive triads |
| `fibonacci_exoplanet_test.py` | Broader exoplanet tests: TRAPPIST-1 + Kepler-90 period ratios and ξ-structure |

### Milankovitch & Paleoclimate

Empirical tests on the LR04 benthic δ¹⁸O stack and the U-Th-dated Cheng 2016 speleothem record, building toward the **26-component 8H integer-divisor climate formula** for Earth's orbital forcing.

**Main pipeline** (produces the formula and per-planet attribution):

| Script | Description |
|--------|-------------|
| `milankovitch_8h_divisor_spectrum.py` | Single-component OLS amplitude scan over all integer divisors of 8H = 2,682.536 kyr on LR04 (full, 0–1200, 0–700, pre-MPT) and Cheng 2016. Identifies which integers carry significant climate-spectral power; source of the §2.2 26-integer table. Output: `data/milankovitch-8h-divisor-spectrum.json` |
| `milankovitch_8h_beat_decomposition.py` | Enumerates physical interpretations (climatic-precession k+g_j, obliquity k+s_j, eccentricity g_j−g_k, nodal s_j−s_k, or direct doc-55 planet apsidal/nodal) for each peak from the divisor-spectrum scan. Uses Laskar 2004 secular eigenfrequencies. Output: `data/milankovitch-8h-beat-decomposition.json` |
| `milankovitch_planet_climate_match.py` | Per-planet match counts: cross-references LR04 peaks against the full doc 55 8H/n period table (8 planets × 6 cycle types) to identify which planets contribute directly to Earth's climate. Output: `data/milankovitch-planet-climate-match.json` |
| `milankovitch_climate_formula.py` | The headline result: joint multi-component OLS fit of the 26 active integer divisors against LR04 (R² = 0.238, condition number 1.6). Produces fitted amplitudes + phases, validates against past 200 kyr, and forward-projects 250 kyr to identify the next natural glaciation peak. Output: `data/milankovitch-climate-formula.json` — also consumed by `src/script.js` (Orbital Forcing Formula Explorer modal). |

**Supporting tests** (specific empirical questions):

| Script | Description |
|--------|-------------|
| `milankovitch_spectral_tests.py` | Spectral analysis (Lomb-Scargle, multitaper, Hinich bispectrum). Documents the 405-kyr absence test and the chronology-bias test (LR04 vs Cheng2016 share the same FFT bin, refuting a ~10% dating offset). Output: `data/milankovitch-spectral-results.json` |
| `milankovitch_candidate_amplitudes.py` | Standard Berger candidate set vs Holistic H-divisor set (head-to-head AIC/R²) across LR04 full / post-MPT / pre-MPT / Cheng2016 full / Cheng halves / LR04 sub-windows. Includes H/18 cross-window replication and MPT growth ratios for both candidate sets. Output: `data/milankovitch-candidate-amplitudes.json` |
| `milankovitch_temporal_structure.py` | Non-stationarity diagnostics: cycle-length distribution by band, restricted (prominence-thresholded) cycle counting, and sliding-window single-component OLS amplitude tests across T ∈ {300, 400, 500, 600, 700, 800} kyr for binning-artifact robustness. Output: `data/milankovitch-temporal-structure.json` |
| `mpt_transition_analysis.py` | Comparative amplitude analysis across the Mid-Pleistocene Transition (pre-MPT vs post-MPT intervals). Documents 1.75×–2.19× amplitude growth in the 80–125 kyr band. Output: `data/mpt-transition-analysis.json` |

Used in: [Doc 16](../docs/16-milankovitch-language.md) (model framework) and [Doc 17](../docs/17-milankovitch-evidence.md) (empirical evidence).

### Falsifiable Predictions

| Script | Description |
|--------|-------------|
| `planet_nine_analysis.py` | Planet Nine prediction — falsifiable test from the Fibonacci balance laws. The closed 8-planet structure forbids a major 9th planet at ETNO distances (Doc 15). |

### Regression Tests

| Script | Description |
|--------|-------------|
| `test_fibonacci_significance.py` | Locks in the 11 observed test statistics from `fibonacci_significance.py` to guard against silent drift when underlying constants change. |

### Archived Scripts

Completed search scripts moved to `archive/`:
- `fibonacci_law4_reformulation_search.py` — R² pair reformulation search (concluded: at noise level)
- `fibonacci_law4_verify.py` — R² pair constraint verification (superseded by Law 4 = K constant)
- `milankovitch_amplitude_fit.py` — early 8-candidate multi-component fit (H/3 vs eccentricity-beat head-to-head). Superseded by `milankovitch_candidate_amplitudes.py` (broader head-to-head) and `milankovitch_climate_formula.py` (full 26-component fit).
- `generate_lr04_json.py` — one-shot utility converting `data/lr04-stack.txt` to `public/input/lr04-data.json` for the in-app Orbital Forcing Formula Explorer. Output is committed; no re-runs expected.

---

## Data Files

| File | Description |
|------|-------------|
| [`../data/01-holistic-year-objects-data.xlsx`](../data/01-holistic-year-objects-data.xlsx) | Excel data file with planet perihelions, fluctuations, Earth eccentricity/obliquity. All Fibonacci-Law scripts read from this via `constants_scripts.py`. |
| [`../data/lr04-stack.txt`](../data/lr04-stack.txt) | LR04 benthic δ¹⁸O stack (Lisiecki & Raymo 2005, *Paleoceanography* 20, PA1003) — 5.3 Myr orbitally-tuned marine climate record. Used by the Milankovitch scripts. |
| [`../data/cheng2016-speleothem.txt`](../data/cheng2016-speleothem.txt) | Cheng 2016 U-Th-dated Asian Monsoon speleothem record (*Science* 352, 343) — 640-kyr non-tuned chronology. Used by the Milankovitch scripts as the chronology-bias control. |

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
