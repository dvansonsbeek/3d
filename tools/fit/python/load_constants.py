"""
Load model constants from tools/lib/constants.js — the single source of truth.

Instead of parsing JavaScript text (fragile), this module shells out to Node.js
to require() the actual constants module and dump selected values as JSON.
Python scripts import from here instead of duplicating values in constants_scripts.py.

Usage:
    from load_constants import C
    print(C['meanSolarYearDays'])    # 365.2421905
    print(C['planets']['mercury'])   # { name: 'Mercury', ... }
"""

import json
import subprocess
import sys
from pathlib import Path

# Path to the Node.js dumper script (adjacent to this file)
_DUMPER = Path(__file__).resolve().parent / '_dump_constants.js'
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent


def _load_from_node():
    """Run Node.js to extract constants as JSON."""
    result = subprocess.run(
        ['node', str(_DUMPER)],
        capture_output=True, text=True, cwd=str(_REPO_ROOT),
        timeout=10,
    )
    if result.returncode != 0:
        print(f"ERROR loading constants via Node.js:\n{result.stderr}", file=sys.stderr)
        raise RuntimeError(f"Node.js constants dump failed: {result.stderr[:200]}")
    return json.loads(result.stdout)


# Load once at import time
C = _load_from_node()

# ─── Convenience aliases matching constants_scripts.py naming ─────────────
BALANCE_YEAR = C['balancedYear']
MEAN_SOLAR_YEAR_DAYS = C['meanSolarYearDays']
MEAN_SIDEREAL_YEAR_DAYS = C['meanSiderealYearDays']

# Earth parameters: the J2000 obliquity anchor is
# C['ASTRO_REFERENCE']['obliquityJ2000_deg'] (the retired device constants:
# doc 109 §23).

# Fitted coefficients
# (the obliquity of date is the hybrid ε of the one-source movement; the J2000
# precession anchor is the IAU p_A, as a period; the retired records: doc 109 §23)
AXIAL_PRECESSION_J2000_YEARS = C['axialPrecessionJ2000Years']

# Planet data
PLANETS = C['planets']


if __name__ == '__main__':
    # Self-test: print key values
    print(f"BALANCE_YEAR = {BALANCE_YEAR}")
    print(f"MEAN_SOLAR_YEAR_DAYS = {MEAN_SOLAR_YEAR_DAYS}")
    print(f"Planets: {list(PLANETS.keys())}")
