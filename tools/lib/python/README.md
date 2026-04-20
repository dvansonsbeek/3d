# Python Library — `tools/lib/python/`

Shared Python library for the Holistic Universe Model. Provides constants, formula builders, fitted coefficients, and prediction utilities used by training scripts and research analysis.

All constants originate from `tools/lib/constants.js` (the single source of truth) and are loaded at import time via a Node.js bridge — no values are hardcoded here.

---

## Contents

### Constants bridge

| File | Description |
|------|-------------|
| `constants_scripts.py` | All model constants and derived values (H, PHI, masses, eccentricities, inclinations, orbital periods). Loads from `tools/lib/constants.js` via `load_constants.py`. Import with `from constants_scripts import *` or named imports. |

> `load_constants.py` and `_dump_constants.js` (the Node.js bridge) live in `tools/fit/python/` alongside the training scripts that depend on them.

### Formula libraries

| File | Description |
|------|-------------|
| `predictive_formula_physical.py` | **Primary** feature matrix builder (~2421-term) for planetary precession prediction. All feature frequencies derive from `model-parameters.json` via `planet_beats.py` — no hardcoded H_DIV_X constants. See [PREDICTIVE_FORMULA_GUIDE.mdx](PREDICTIVE_FORMULA_GUIDE.mdx) for full documentation. |
| `planet_beats.py` | Derives the six fundamental periods per planet (ecl, icrf, obliq, asc, axial, wobble) plus all pairwise internal and Earth-cross beat frequencies. Single source for all physical-beat feature frequencies. |
| `predictive_formula.py` | Legacy 429-term feature builder + shared helpers (`calc_earth_perihelion`, `calc_erd`, `calc_obliquity`, `calc_eccentricity`). The 429-term `build_features` is deprecated but the helper functions are still imported by `predictive_formula_physical.py` and `verify_perihelion_erd.py`. |
| `observed_formula.py` | Feature matrix builder using observed orbital parameters (perihelion, ERD, obliquity, eccentricity) as inputs. Used to fit against observed data. |

### Fitted coefficients

| Directory | Description |
|-----------|-------------|
| `coefficients/` | Per-planet coefficient modules. `*_coeffs_physical.py` (7 files, 2421 terms) are the **active** predictive coefficients consumed by `predict_precession.py`, `validate_precession.py`, and the sync pipeline. `*_coeffs.py` are for `observed_formula.py`. Legacy `*_coeffs_unified.py` (429-term) are archived in `scripts/archive/`. |

### Usage scripts

| File | Description |
|------|-------------|
| `predict_precession.py` | Prediction API — run or import to compute planetary precession values from year input. |
| `validate_precession.py` | Validates trained coefficients against observed Excel data. |

### Documentation

| File | Description |
|------|-------------|
| `PREDICTIVE_FORMULA_GUIDE.mdx` | Full guide to the physical-beat predictive formula: 2421-term ML architecture, feature groups A/B/C+D+E/F/I/J/K/L, training procedure, and how to extend. |

---

## Usage

### From a script in `scripts/`

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lib', 'python'))
from constants_scripts import H, PHI, PLANET_NAMES
from predictive_formula_physical import build_features_physical
```

### From a script in `tools/fit/python/`

```python
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / 'lib' / 'python'))
from predictive_formula_physical import build_features_physical
```

### From the same directory

```python
from constants_scripts import H, PHI
from predictive_formula import build_features
from observed_formula import build_feature_matrix
```

---

## Requirements

Python 3.8+, numpy, pandas, openpyxl. Install with:

```bash
pip install -r ../../requirements.txt
```

Node.js is required to load constants (the bridge runs `node _dump_constants.js` at import time).
