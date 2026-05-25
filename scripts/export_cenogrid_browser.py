#!/usr/bin/env python3
"""
EXPORT CENOGRID DATA FOR BROWSER MODAL
========================================

Generates `public/input/cenogrid-data.json`, a downsampled CENOGRID record
for the "Climate Formula Explorer" modal in src/script.js.

Source: data/westerhold2020-cenogrid.tab (LOESS-smoothed columns)
Target: ~2,700 evenly-binned samples over 0-67 Myr

CENOGRID native has ~24K samples — too dense for browser SVG rendering at the
67-Myr scale. Binning to 25-kyr resolution preserves all visible structure
(the chart is ~900 pixels wide → ~3 binned samples per pixel) while keeping
the JSON under 100 KB.

Both δ¹⁸O and δ¹³C are included (proxy subtoggle in the modal).

Output: public/input/cenogrid-data.json
Run:    python3 scripts/export_cenogrid_browser.py
"""

import json
from pathlib import Path

import numpy as np

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from milankovitch_climate_formula import load_cenogrid  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_PATH = SCRIPT_DIR.parent / "public" / "input" / "cenogrid-data.json"

DT_KYR = 25.0  # 25-kyr bins → ~2,700 samples over 67 Myr


def main():
    print("Loading CENOGRID native...")
    ages_kyr, d13c, d18o = load_cenogrid()
    print(f"  {len(ages_kyr)} native samples, 0-{ages_kyr.max()/1000:.1f} Ma")

    # Sort + dedupe
    order = np.argsort(ages_kyr)
    a_sorted = ages_kyr[order]
    d18o_sorted = d18o[order]
    d13c_sorted = d13c[order]
    keep = np.concatenate([[True], np.diff(a_sorted) > 0])
    a_sorted = a_sorted[keep]
    d18o_sorted = d18o_sorted[keep]
    d13c_sorted = d13c_sorted[keep]

    # Bin to DT_KYR resolution via linear interpolation
    grid = np.arange(0, a_sorted.max() + DT_KYR, DT_KYR)
    d18o_binned = np.interp(grid, a_sorted, d18o_sorted)
    d13c_binned = np.interp(grid, a_sorted, d13c_sorted)

    out = {
        "source": "Westerhold et al. 2020, Science 369, 1383 (CENOGRID, LOESS-smoothed)",
        "doi": "10.1126/science.aba6853",
        "binning_kyr": DT_KYR,
        "n_samples": int(len(grid)),
        "age_range_kyr": [float(grid.min()), float(grid.max())],
        "age_kyr_BP": [round(float(x), 1) for x in grid],
        "d18o_per_mille": [round(float(x), 4) for x in d18o_binned],
        "d13c_per_mille": [round(float(x), 4) for x in d13c_binned],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump(out, f)  # no indent → smaller
    print(f"Wrote {OUT_PATH}")
    print(f"  Size: {OUT_PATH.stat().st_size / 1024:.1f} KB ({len(grid)} binned samples)")


if __name__ == "__main__":
    main()
