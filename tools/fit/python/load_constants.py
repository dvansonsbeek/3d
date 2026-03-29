"""
Load model constants from tools/lib/constants.js — the single source of truth.

Instead of parsing JavaScript text (fragile), this module shells out to Node.js
to require() the actual constants module and dump selected values as JSON.
Python scripts import from here instead of duplicating values in constants_scripts.py.

Usage:
    from load_constants import C
    print(C['H'])                    # 335317
    print(C['earthtiltMean'])        # 23.41349
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
H = C['H']
BALANCE_YEAR = C['balancedYear']
MEAN_SOLAR_YEAR_DAYS = C['meanSolarYearDays']
MEAN_SIDEREAL_YEAR_DAYS = C['meanSiderealYearDays']
MEAN_ANOMALISTIC_YEAR_DAYS = C['meanAnomalisticYearDays']

# Earth parameters
EARTH_OBLIQUITY_MEAN = C['earthtiltMean']
EARTH_INCLINATION_MEAN = C['earthInvPlaneInclinationMean']
EARTH_INCLINATION_AMPLITUDE = C['earthInvPlaneInclinationAmplitude']
EARTH_RA_ANGLE = C['earthRAAngle']
EARTH_BASE_ECCENTRICITY = C['eccentricityBase']
EARTH_ECCENTRICITY_AMPLITUDE = C['eccentricityAmplitude']
EARTH_ECCENTRICITY_K = C['eccentricityAmplitudeK']

# Derived
PERIHELION_CYCLE_LENGTH = C['perihelionCycleLength']
TOTAL_DAYS_IN_H = C['totalDaysInH']
ECCENTRICITY_DERIVED_MEAN = C['eccentricityDerivedMean']

# Fitted coefficients
SOLSTICE_OBLIQUITY_MEAN = C['SOLSTICE_OBLIQUITY_MEAN']
SOLSTICE_OBLIQUITY_HARMONICS = [tuple(h) for h in C['SOLSTICE_OBLIQUITY_HARMONICS']]
CARDINAL_POINT_ANCHORS = C['CARDINAL_POINT_ANCHORS']
CARDINAL_POINT_HARMONICS = {
    k: [tuple(h) for h in v] for k, v in C['CARDINAL_POINT_HARMONICS'].items()
}
TROPICAL_YEAR_HARMONICS = [tuple(h) for h in C['TROPICAL_YEAR_HARMONICS']]
SIDEREAL_YEAR_HARMONICS = [tuple(h) for h in C['SIDEREAL_YEAR_HARMONICS']]
ANOMALISTIC_YEAR_HARMONICS = [tuple(h) for h in C['ANOMALISTIC_YEAR_HARMONICS']]

# Planet data
PLANETS = C['planets']


if __name__ == '__main__':
    # Self-test: print key values
    print(f"H = {H}")
    print(f"BALANCE_YEAR = {BALANCE_YEAR}")
    print(f"EARTH_OBLIQUITY_MEAN = {EARTH_OBLIQUITY_MEAN}")
    print(f"EARTH_RA_ANGLE = {EARTH_RA_ANGLE:.6f}")
    print(f"SOLSTICE_OBLIQUITY_MEAN = {SOLSTICE_OBLIQUITY_MEAN:.6f}")
    print(f"MEAN_SOLAR_YEAR_DAYS = {MEAN_SOLAR_YEAR_DAYS}")
    print(f"Planets: {list(PLANETS.keys())}")
    print(f"OBLIQUITY_HARMONICS: {len(SOLSTICE_OBLIQUITY_HARMONICS)} entries")
    print(f"CARDINAL_POINT_HARMONICS: {list(CARDINAL_POINT_HARMONICS.keys())}")
