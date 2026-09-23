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
| `predictive_formula.py` | Earth's perihelion / ERD / obliquity / eccentricity helpers (`calc_earth_perihelion`, `calc_erd`, `calc_obliquity`, `calc_eccentricity`) used by `verify_perihelion_erd.py` (Step 4b) and the doc-14 cardinal helpers. Its 429-term `build_features` is a legacy of the retired planet predict device and has no consumer. |
| `planet_beats.py` | Derives the six fundamental periods per planet (ecl, icrf, obliq, asc, axial, wobble) plus all pairwise internal and Earth-cross beat frequencies. |

> The planet **predictive-precession device** that lived here —
> `predictive_formula_physical.py` (the ~2,421-term feature matrix),
> `observed_formula.py`, `predict_precession.py`, `validate_precession.py`,
> the per-planet `coefficients/` modules and `PREDICTIVE_FORMULA_GUIDE.mdx`
> — was **retired at plan 06 R8**: it fitted the RETIRED geometric scene's
> exported Earth-frame perihelion-RA rate against the simulator's own export.
> The record is `docs/retired-record.md`; the Earth-frame rate is now the
> equatorial projection of the lattice motion (doc 13 §1.8).

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
