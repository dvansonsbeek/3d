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

Empirical tests on the LR04 benthic δ¹⁸O stack and the U-Th-dated Cheng 2016 speleothem record, building toward the **25-component 8H integer-divisor climate formula** for Earth's orbital forcing.

**Main pipeline** (produces the formula and per-planet attribution):

| Script | Description |
|--------|-------------|
| `milankovitch_8h_divisor_spectrum.py` | Single-component OLS amplitude scan over all integer divisors of 8H = 2,682.536 kyr on LR04 (full, 0–1200, 0–700, pre-MPT) and Cheng 2016. Identifies which integers carry significant climate-spectral power; source of the §2.2 integer table. Output: `data/milankovitch-8h-divisor-spectrum.json` |
| `milankovitch_8h_closure_test.py` | **8H integer-lattice closure test** (doc 17 §7.3). Fits all 200 integer divisors of 8H jointly to LR04 (R² = 0.443), then scans the residual at non-integer positions to test whether any orphan peaks land off the lattice. Verdict: no orphan peaks land in empty regions of the 8H lattice — every above-noise residual peak sits between two adjacent integers, consistent with cycle-length non-stationarity. Third independent empirical confirmation of the framework. Output: `data/milankovitch-8h-closure-test.json` |
| `milankovitch_8h_beat_decomposition.py` | Enumerates physical interpretations (climatic-precession k+g_j, obliquity k+s_j, eccentricity g_j−g_k, nodal s_j−s_k, or direct doc-55 planet apsidal/nodal) for each peak from the divisor-spectrum scan. Uses Laskar 2004 secular eigenfrequencies. Output: `data/milankovitch-8h-beat-decomposition.json` |
| `milankovitch_planet_climate_match.py` | Per-planet match counts: cross-references LR04 peaks against the full doc 55 8H/n period table (8 planets × 6 cycle types) to identify which planets contribute directly to Earth's climate. Output: `data/milankovitch-planet-climate-match.json` |
| `milankovitch_climate_formula.py` | The headline result: joint multi-component OLS fit of the 25 active integer divisors against LR04 (R² = 0.232, condition number 1.5). Produces fitted amplitudes + phases, validates against past 200 kyr, and forward-projects 250 kyr to identify the next natural glaciation peak. Output: `data/milankovitch-climate-formula.json` — also consumed by `src/script.js` (Orbital Forcing Formula Explorer modal). |

**Supporting tests** (specific empirical questions):

| Script | Description |
|--------|-------------|
| `milankovitch_spectral_tests.py` | Spectral analysis (Lomb-Scargle, multitaper, Hinich bispectrum). Documents the 405-kyr absence test and the chronology-bias test (LR04 vs Cheng2016 share the same FFT bin, refuting a ~10% dating offset). Output: `data/milankovitch-spectral-results.json` |
| `milankovitch_candidate_amplitudes.py` | Standard Berger candidate set vs Holistic H-divisor set (head-to-head AIC/R²) across LR04 full / post-MPT / pre-MPT / Cheng2016 full / Cheng halves / LR04 sub-windows. Includes H/18 cross-window replication and MPT growth ratios for both candidate sets. Output: `data/milankovitch-candidate-amplitudes.json` |
| `milankovitch_temporal_structure.py` | Non-stationarity diagnostics: cycle-length distribution by band, restricted (prominence-thresholded) cycle counting, and sliding-window single-component OLS amplitude tests across T ∈ {300, 400, 500, 600, 700, 800} kyr for binning-artifact robustness. Output: `data/milankovitch-temporal-structure.json` |
| `mpt_transition_analysis.py` | Comparative amplitude analysis across the Mid-Pleistocene Transition (pre-MPT vs post-MPT intervals). Documents 1.75×–2.19× amplitude growth in the 80–125 kyr band. Output: `data/mpt-transition-analysis.json` |

**Doc 18 — 8H super-cycle test + fourteen follow-up tests** (each a pre-registered falsifiable test of a specific framework prediction):

| Script | Description |
|--------|-------------|
| `milankovitch_8h_super_cycle_test.py` | **Pre-registered super-cycle test** (doc 18 §3–§4). Tests whether 20 major Phanerozoic events cluster at integer multiples of 8H or H. Result: **NULL** (8H p=0.23, H p=0.50). Output: `data/milankovitch-8h-super-cycle-test.json` |
| `milankovitch_8h_cenogrid_spectral.py` | **§4.5 global-spectral complement.** Asks whether the *continuous* CENOGRID 67-Myr record shows enhanced MTM F-test power at any integer multiple of H from 1H (Earth Fundamental Cycle = 335 kyr) to 8H (Solar System Resonance Cycle = 2.68 Myr). Unique to CENOGRID — LR04 (5.3 Myr) cannot resolve 8H. Result: **NULL on all 16 cells** (8 nH × 2 proxies, F = 0.10–2.30 vs F-crit 4.46; p_random_null > 0.15). Positive control (405 kyr) detected cleanly (F = 17–20). Consistent with framework's predictive structure — climate forcing operates at 8H/n integer *divisors*, not at integer *multiples* of H. Output: `data/milankovitch-8h-cenogrid-spectral.json` |
| `milankovitch_8h_cenogrid_windowed.py` | **§4.6 windowed Plio-Pleistocene complement.** Sharpens §4.5 — tests whether the Plio-Pleistocene window (0–5.37 Ma = 2×8H) specifically shows H-multiple amplification that the global average dilutes. Tiles 0–64.4 Ma into 12 non-overlapping 5.37-Myr windows; evaluates F + OLS amplitude at 1H..8H in each. Result: **doubly NULL** — W1 reaches F-critical at no nH and ranks in the bottom half of windows for amplitude at every nH (5H δ¹⁸O and 8H δ¹³C are *lowest* of all 12). 405-kyr positive control significant in 5–6/12 warmhouse windows, matching the §6.2 Paleocene→Pliocene weakening. Across 192 cells only 5 reach F ≥ 4.46 (less than the α=0.05 chance expectation of ~10). Output: `data/milankovitch-8h-cenogrid-windowed.json` |
| `milankovitch_8h_13h_boulila_check.py` | **Test A** (doc 18 §5.1). Numerical cross-check: 13H = 4.359 Myr vs Boulila 2020 published libration period (4.5 Myr, range 3.7–4.8 Myr). Result: POSITIVE, 3.1% match, within published range. Output: `data/milankovitch-13H-boulila-test.json` |
| `milankovitch_8h_cheng_closure_test.py` | **Test B0** (doc 18 §5.2.0). Attempted strict 8H integer-divisor closure on Cheng 2016 U-Th-dated speleothem (T = 640 kyr). Single-component scan (joint fit invalid because T < 8H). Result: NULL with methodological caveat — Fourier resolution insufficient to resolve adjacent lattice integers. Output: `data/milankovitch-8h-cheng-closure-test.json` |
| `milankovitch_8h_cheng_chronology_validation.py` | **Test B1/B2/B3** (doc 18 §5.2.1–§5.2.3). Three chronology-validation angles that DON'T need adjacent-integer resolution: (B1) multi-band centroid agreement LR04 vs Cheng across 100k/41k/23k bands — **POSITIVE 3/3**; (B2) permutation test on Cheng amplitudes at formula vs random integers — null trending (p=0.11, underpowered); (B3) magnitude-squared coherence LR04 ↔ Cheng — partial (1/3 bands). B1 is the gold-standard chronology-independence confirmation, replacing the methodologically-blocked closure test. Output: `data/milankovitch-8h-cheng-chronology-validation.json` |
| `milankovitch_8h_random_period_null.py` | **Test C** (doc 18 §5.3). Random-period null baseline: does the 25-component 8H formula's R² = 0.232 beat random 25-component models? Three nulls × 1000 trials each. Result: POSITIVE on all three (p ≤ 0.007). Output: `data/milankovitch-random-period-null.json` |
| `milankovitch_8h_bispectral_inclination.py` | **Test D** (doc 18 §5.4). Hinich bicoherence on full LR04 testing inclination-eigenspace assignment. D1 (100k self-coupling) null (p=0.11). **D2 (100k × 41k cross-coupling) POSITIVE (p=0.01)** — direct support for the framework's prediction that the 100-kyr cycle and the obliquity band share inclination-eigenspace phase information. Output: `data/milankovitch-8h-bispectral-inclination.json` |
| `milankovitch_8h_bl2002_comparison.py` | **Test E** (doc 18 §5.5). Compares the 8H formula's forward projection (next glaciation 38 kyr ahead) against the Berger & Loutre 2002 astronomical prediction (50 kyr). Result: POSITIVE convergence within 25%. Output: `data/milankovitch-bl2002-comparison.json` |
| `milankovitch_8h_cross_validation.py` | **Test F** (doc 18 §5.6). Out-of-sample cross-validation: three train/test splits. F1/F2 (temporal splits across the MPT) collapse — confirming amplitude non-stationarity. F3 (even/odd parity) POSITIVE (R² 0.237 vs 0.239) — integer-divisor positions are stable; only amplitudes change. Output: `data/milankovitch-8h-cross-validation.json` |
| `milankovitch_8h_phase_prediction.py` | **Test G** (doc 18 §5.7). Phase-prediction accuracy: does the formula correctly time the past-1-Myr MIS glacial maxima? Result: median \|offset\| = 6.0 kyr (≈ 1 Rayleigh element), p = 0.006 vs random ±20 kyr null. **POSITIVE.** Output: `data/milankovitch-8h-phase-prediction.json` |
| `milankovitch_8h_epica_cross_proxy.py` | **Test H** (doc 18 §5.8). EPICA Dome C CO₂ (Bereiter 2015, atmospheric trapped-gas record, independent of marine δ¹⁸O) — three sub-tests. H1: band centroids EPICA vs LR04 — **POSITIVE 3/3** (the cross-proxy headline). H2: permutation on formula amplitudes — null (CO₂ spectral shape differs). H3: interglacial timing — null (non-linear CO₂-temperature lag). Output: `data/milankovitch-8h-epica-cross-proxy.json`. Input: `data/epica-co2-bereiter2015.txt` |
| `milankovitch_8h_westerhold_cenozoic.py` | **Test I** (doc 18 §5.9). Deep-time generalization across the 67-Myr Cenozoic using Westerhold 2020 CENOGRID. Five climate-state windows (Icehouse / Coolhouse / Warmhouse / Hothouse). Permutation test significant in **5/5 windows** (p ≤ 0.008); **14/15 band peaks land on the 8H lattice** across 67 Myr. The dominant integer within each band hops between framework integers (n=22/25/28 etc.) as climate state changes — same MPT non-stationarity pattern generalized to deep time. Output: `data/milankovitch-8h-westerhold-cenozoic.json`. Input: `data/westerhold2020-cenogrid.tab` |
| `milankovitch_8h_mtm_f_test.py` | **Test J** (doc 18 §5.10). Per-line significance via Thomson multi-taper F-test (DPSS K=5, NW=3). At each of the 25 framework integers, computes F-statistic and compares to F(2,8) critical value. Result: **7/25 framework integers significant** at α=0.05 (vs null expected 0.84 → p < 0.0001). Strongest lines: n=73 (F=14.2), n=50 (F=12.7), n=68 (F=9.3). Output: `data/milankovitch-8h-mtm-f-test.json` |
| `milankovitch_8h_wavelet_stability.py` | **Test K** (doc 18 §5.11). Sliding-window (600 kyr / 300-kyr step) band-peak tracking across LR04. Obliquity CV 1.0%, precession CV 6.4% — extraordinarily stable. The 100k band shows higher apparent drift (CV 14%) but the drift is **integer-to-integer hopping between framework integers** (n=21/22/25/28/30/31), mean distance 2.26 kyr to nearest framework integer. Output: `data/milankovitch-8h-wavelet-stability.json` |
| `milankovitch_8h_all_integer_mtm.py` | **Test L** (doc 18 §5.12). Extends Test J to ALL 200 8H/n integers. Result: framework integers significant at 28.0% (7/25), non-framework at 3.4% (6/175) — **enrichment ratio 8.2×**. Framework's specific integer selection is statistically meaningful. Output: `data/milankovitch-8h-all-integer-mtm.json` |
| `milankovitch_8h_xval_phase.py` | **Test M** (doc 18 §5.13). Train on one MPT regime, predict glacial-maximum timing in the OTHER regime. Result: median \|offset\| 16–17 kyr both directions (vs Test G full-fit 6 kyr) — **PARTIAL generalization**. Phase information degrades by ~1 precession cycle across the MPT but isn't lost. Output: `data/milankovitch-8h-xval-phase.json` |
| `milankovitch_8h_405k_head_to_head.py` | **Test N** (doc 18 §5.14). Measures where the empirical 405-kyr line sits in CENOGRID. Result: at 402.9–406.0 kyr across Eocene/Oligocene/Paleocene-Eocene intervals — off the 8H integer-divisor lattice. Triggers the §6 dedicated investigation. Output: `data/milankovitch-8h-405k-head-to-head.json` |

**Doc 18 §6 — The 405-kyr Investigation** (the 405-kyr empirical climate line sits off the 8H lattice; in this framework's planet motions it is not a Venus-Jupiter beat but a carbon-cycle internal resonance):

| Script | Description |
|--------|-------------|
| `milankovitch_8h_405k_evolution.py` | **§6.2** Amplitude evolution of the 405-kyr cycle across the 67-Myr Cenozoic via sliding 4-Myr windows. Documents 2.59× decline from Paleocene hothouse to Pliocene icehouse. Output: `data/milankovitch-8h-405k-evolution.json` |
| `milankovitch_8h_405k_spread.py` | **§6.2** Line-shape characterisation in 380–450 kyr band. Result: narrow line (FWHM ≈ Rayleigh) centred at 404.5 kyr in full Cenozoic. Output: `data/milankovitch-8h-405k-spread.json` |
| `milankovitch_8h_405k_beat_search.py` | **§6.3** Mathematical proof that no combination of doc-55 cycles can produce 405 kyr — all beats fall on 8H/integer positions, and 405 sits between 8H/7=383 and 8H/6=447. Output: `data/milankovitch-8h-405k-beat-search.json` |
| `milankovitch_8h_405k_precession_subharmonic.py` | **§6.4** Tests the "17×precession ≈ 405" hypothesis. Result: ruled out (r=-0.07 between precession amp and 405-kyr amp; envelope peak at 405.5, not 17×precession 403.6). Output: `data/milankovitch-8h-405k-precession-subharmonic.json` |
| `milankovitch_8h_405k_carbon_cycle.py` | **§6.5** Tests carbon-cycle amplification: δ¹³C/δ¹⁸O amplitude ratio at 405 kyr vs insolation controls. Result: ratio 1.53× at 405 kyr (Cenozoic full) vs <1 at obliquity/precession — POSITIVE for carbon-cycle resonance. Output: `data/milankovitch-8h-405k-carbon-cycle.json` |
| `milankovitch_8h_405k_phase_stability.py` | **§6.6** Hilbert-phase test of 405-kyr cycle. Result: δ¹³C–δ¹⁸O phase residuals correlate at r=0.21 (not r≈1 expected for pure orbital lock) — consistent with entrained internal oscillator. Output: `data/milankovitch-8h-405k-phase-stability.json` |
| `milankovitch_8h_g4g3_carbon_cycle.py` | **§6.7, §6.8** Tests a 2.4-Myr cycle (Laskar labels this g₄−g₃ Mars-Earth) for carbon-cycle amplification (NEGATIVE — ratio 0.20). Bonus: tests 4.5-Myr Boulila/13H — STRONGLY positive (ratio 2.76, F=5.40 in δ¹³C only) — additional confirmation of the 13H framework prediction. Output: `data/milankovitch-8h-g4g3-carbon-cycle.json` |

Used in: [Doc 16](../docs/16-milankovitch-language.md) (model framework), [Doc 17](../docs/17-milankovitch-evidence.md) (empirical evidence), and [Doc 18](../docs/18-8h-super-cycle-test.md) (super-cycle test + framework follow-ups + 405-kyr investigation).

### Falsifiable Predictions

| Script | Description |
|--------|-------------|
| `planet_nine_analysis.py` | Planet Nine prediction — falsifiable test from the Fibonacci balance laws. Two-tier structure: (1) Law-4 compliance pre-check (§3.5) — all candidates fail by 4–7 orders of magnitude; (2) full canonical 7.5M-config v-balance search (§4) — confirms rejection. The closed 8-planet structure forbids a major 9th planet at ETNO distances (Doc 15). |

### Regression Tests

| Script | Description |
|--------|-------------|
| `test_fibonacci_significance.py` | Locks in the 11 observed test statistics from `fibonacci_significance.py` to guard against silent drift when underlying constants change. |

### Archived Scripts

Completed search scripts moved to `archive/`:
- `fibonacci_law4_reformulation_search.py` — R² pair reformulation search (concluded: at noise level)
- `fibonacci_law4_verify.py` — R² pair constraint verification (superseded by Law 4 = K constant)
- `milankovitch_amplitude_fit.py` — early 8-candidate multi-component fit (H/3 vs eccentricity-beat head-to-head). Superseded by `milankovitch_candidate_amplitudes.py` (broader head-to-head) and `milankovitch_climate_formula.py` (full 25-component fit).
- `generate_lr04_json.py` — one-shot utility converting `data/lr04-stack.txt` to `public/input/lr04-data.json` for the in-app Orbital Forcing Formula Explorer. Output is committed; no re-runs expected.

---

## Data Files

| File | Description |
|------|-------------|
| [`../data/01-holistic-year-objects-data.xlsx`](../data/01-holistic-year-objects-data.xlsx) | Excel data file with planet perihelions, fluctuations, Earth eccentricity/obliquity. All Fibonacci-Law scripts read from this via `constants_scripts.py`. |
| [`../data/lr04-stack.txt`](../data/lr04-stack.txt) | LR04 benthic δ¹⁸O stack (Lisiecki & Raymo 2005, *Paleoceanography* 20, PA1003) — 5.3 Myr orbitally-tuned marine climate record. Used by the Milankovitch scripts. |
| [`../data/cheng2016-speleothem.txt`](../data/cheng2016-speleothem.txt) | Cheng 2016 U-Th-dated Asian Monsoon speleothem record (*Science* 352, 343) — 640-kyr non-tuned chronology. Used by the Milankovitch scripts as the chronology-bias control. |
| [`../data/epica-co2-bereiter2015.txt`](../data/epica-co2-bereiter2015.txt) | Bereiter et al. 2015 (*GRL* 42, 542) EPICA Dome C composite atmospheric CO₂ record — 0–800 kyr BP, Antarctic ice cores. Used by `milankovitch_8h_epica_cross_proxy.py` (doc 18 §5.8) as the independent climate-proxy validation. |
| [`../data/westerhold2020-cenogrid.tab`](../data/westerhold2020-cenogrid.tab) | Westerhold et al. 2020 (*Science* 369, 1383) CENOGRID — 67-Myr astronomically tuned benthic δ¹⁸O+δ¹³C reference splice with radiometric anchor points. PANGAEA TableS34 (LOESS-smoothed). Used by `milankovitch_8h_westerhold_cenozoic.py` (doc 18 §5.9) as the deep-time generalization test. |

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
