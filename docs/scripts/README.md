# Fibonacci Laws — Investigation & Verification Scripts

Python scripts for investigating, verifying, and reproducing the results of the [Fibonacci Laws of Planetary Motion](https://doi.org/10.21203/rs.3.rs-8758810/v1) paper.

These scripts were used during the research to discover and verify the six Fibonacci Laws that connect planetary orbital tilts, eccentricities, and precession rates to the Holistic-Year timescale (H = 333,888 years).

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the statistical significance test
python fibonacci_significance.py

# Verify J2000 eccentricity formation constraints
python fibonacci_j2000_eccentricity.py

# Investigate the R ≈ 311 Fibonacci primitive root prime
python fibonacci_311_deep.py

# Test TRAPPIST-1 exoplanet Fibonacci structure
python fibonacci_trappist1_deep.py
```

---

## Script Overview

### Core Data Module

| Script | Description |
|--------|-------------|
| `fibonacci_data.py` | Shared constants (H, PHI, planet masses, orbital elements) and utility functions — imported by most other scripts |

### Key Investigation Scripts

| Script | Description |
|--------|-------------|
| `fibonacci_significance.py` | Statistical significance of the Fibonacci Laws (7.5σ, p ≤ 7.1 × 10⁻¹⁴) |
| `fibonacci_j2000_eccentricity.py` | J2000 eccentricities as formation-epoch Fibonacci constraints |
| `fibonacci_311_deep.py` | Deep investigation of R ≈ 311 as a Fibonacci primitive root prime |
| `fibonacci_311_analysis.py` | Analysis of the 311 constant across planetary systems |
| `fibonacci_trappist1_deep.py` | TRAPPIST-1 exoplanet system: Fibonacci period ratios and super-period = 311 × P_b |
| `fibonacci_exoplanet_test.py` | Broader exoplanet Fibonacci ratio tests |
| `fibonacci_balance_year_verify.py` | Verification of the balance year concept |
| `fibonacci_law4_search.py` | Search for Law 4 (perihelion argument) formulas |
| `fibonacci_law4_verify.py` | Verification of Law 4 results |

### Perihelion Precession Analysis

| Script | Description |
|--------|-------------|
| `fibonacci_omega_verify.py` | Perihelion precession rate verification for all planets |
| `fibonacci_omega_earth_verify.py` | Earth-specific perihelion precession verification |
| `fibonacci_omega_balance_year_verify.py` | Balance year perihelion verification |
| `fibonacci_omega_arg_comparison.py` | Argument of perihelion comparison across methods |

### Predictive Formula System

| Script | Description |
|--------|-------------|
| `predictive_formula.py` | Main feature building and prediction logic |
| `observed_formula.py` | Training on observed data |
| `train_precession.py` | Train unified precession model from simulation data |
| `train_observed.py` | Train observed formula coefficients |
| `validate_precession.py` | Validate predictions against data |
| `predict_precession.py` | Prediction interface |
| `*_coeffs_unified.py` | Per-planet precession coefficients (Mercury through Neptune) |

### Documentation

| File | Description |
|------|-------------|
| `PREDICTIVE_FORMULA_GUIDE.mdx` | Detailed guide to the predictive formula system |

### Archive

The `archive/` directory contains earlier investigation scripts that were superseded by the active scripts above. They are preserved for research reproducibility.

---

## Data Files

| File | Description |
|------|-------------|
| `holistic-year-objects-data.csv` | Simulation output data: orbital parameters across one Holistic-Year (333,888 years) (predictive formula scripts depend on this file) |
| [`../appendix-h-holistic-year-objects-data.xlsx`](../appendix-h-holistic-year-objects-data.xlsx) | Excel version of the same data with additional sheets (perihelion scripts depend on this file — it must be present in the parent `docs/` directory) |

---

## Dependencies

- **Python** 3.8+
- **numpy** — numerical computations
- **pandas** — data manipulation
- **openpyxl** — Excel file reading (used by perihelion scripts)

All dependencies are standard scientific Python packages.

---

## Related Resources

- [Preprint: Fibonacci Laws of Planetary Motion](https://doi.org/10.21203/rs.3.rs-8758810/v1)
- [Interactive 3D Simulation](https://3d.holisticuniverse.com)
- [Model Documentation](https://www.holisticuniverse.com)
- [Data Visualization](https://data.holisticuniverse.com)

---

## License

These scripts are part of the [Interactive 3D Solar System Simulation](https://github.com/dvansonsbeek/3d) project and are released under the [GNU General Public License v3.0](../../LICENSE).
