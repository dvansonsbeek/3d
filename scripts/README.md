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

### Archived Scripts

Completed search scripts moved to `archive/`:
- `fibonacci_law4_reformulation_search.py` — R² pair reformulation search (concluded: at noise level)
- `fibonacci_law4_verify.py` — R² pair constraint verification (superseded by Law 4 = K constant)

---

## Data Files

| File | Description |
|------|-------------|
| [`../data/01-holistic-year-objects-data.xlsx`](../data/01-holistic-year-objects-data.xlsx) | Excel data file with planet perihelions, fluctuations, Earth eccentricity/obliquity. All scripts read from this via `constants_scripts.py`. |

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
