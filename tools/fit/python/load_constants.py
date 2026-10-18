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
# (plan 09 step 7c: `H` — the frozen era unit — left the model; the research
# scripts that scan the retired 8H/n lattice carry 335,317 as a named record.)
BALANCE_YEAR = C['balancedYear']
MEAN_SOLAR_YEAR_DAYS = C['meanSolarYearDays']
MEAN_SIDEREAL_YEAR_DAYS = C['meanSiderealYearDays']

# Earth parameters
# (plan 11 step 2: EARTH_INCLINATION_MEAN and EARTH_BASE_ECCENTRICITY — the
# retired device's mean inclination and Law-5 base — are deleted with their
# constants; no script read them. Plan 11 step 4: EARTH_OBLIQUITY_MEAN,
# EARTH_INCLINATION_AMPLITUDE, EARTH_RA_ANGLE and EARTH_ECCENTRICITY_AMPLITUDE
# — the K-device scaffold's pose — are deleted with the scaffold; the J2000
# obliquity anchor is C['ASTRO_REFERENCE']['obliquityJ2000_deg'].)
# (plan 07 R6: EARTH_ECCENTRICITY_K — the K constant inverted from Earth's
# calibration — went with the K law; it had no consumer outside this module.)

# Derived (plan 09 step 7c: PERIHELION_CYCLE_LENGTH = H/16 and TOTAL_DAYS_IN_H
# = H × mSY — the device's wheel period and day count — left with the unit)
# (plan 11 step 2: ECCENTRICITY_DERIVED_MEAN — the one law's base′ alias — is
# deleted with the scene constant; no script read it.)

# Fitted coefficients
# (plan 09: SOLSTICE_OBLIQUITY_MEAN / SOLSTICE_OBLIQUITY_HARMONICS retired — the
# obliquity of date is the hybrid ε of the one-source movement, not a comb;
# step 7a: CARDINAL_POINT_ANCHORS / CARDINAL_POINT_HARMONICS — the frozen
# cardinal record — deleted with the coefficients)
# (plan 09: the three year-length combs are deleted; the J2000 precession
# anchor is the IAU p_A, as a period)
AXIAL_PRECESSION_J2000_YEARS = C['axialPrecessionJ2000Years']

# Planet data
PLANETS = C['planets']


if __name__ == '__main__':
    # Self-test: print key values
    print(f"BALANCE_YEAR = {BALANCE_YEAR}")
    print(f"MEAN_SOLAR_YEAR_DAYS = {MEAN_SOLAR_YEAR_DAYS}")
    print(f"Planets: {list(PLANETS.keys())}")
