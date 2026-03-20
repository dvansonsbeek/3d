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
| `predictive_formula.py` | Feature matrix builder (429-term) and prediction functions for planetary precession. Year-only input. See [PREDICTIVE_FORMULA_GUIDE.mdx](PREDICTIVE_FORMULA_GUIDE.mdx) for full documentation. |
| `observed_formula.py` | Feature matrix builder using observed orbital parameters (perihelion, ERD, obliquity, eccentricity) as inputs. Used to fit against observed data. |

### Fitted coefficients

| Directory | Description |
|-----------|-------------|
| `coefficients/` | Per-planet coefficient modules (`mercury_coeffs.py` … `neptune_coeffs.py`) and unified variants. Imported by `observed_formula.py`. |

### Usage scripts

| File | Description |
|------|-------------|
| `predict_precession.py` | Prediction API — run or import to compute planetary precession values from year input. |
| `validate_precession.py` | Validates trained coefficients against observed Excel data. |

### Documentation

| File | Description |
|------|-------------|
| `PREDICTIVE_FORMULA_GUIDE.mdx` | Full guide to the predictive formula system: ML architecture, 429-term feature matrix, training procedure, and how to extend. |

---

## Usage

### From a script in `scripts/`

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lib', 'python'))
from constants_scripts import H, PHI, PLANET_NAMES
from predictive_formula import build_features, PLANETS
```

### From a script in `tools/fit/python/`

```python
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / 'lib' / 'python'))
from predictive_formula import build_features, PLANETS
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
