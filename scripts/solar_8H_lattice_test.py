#!/usr/bin/env python3
"""
Cross-domain test of the 8H Solar System Resonance Cycle.

Hypothesis
----------
If 8H = 2,682,536 yr is a real solar-system synchronization period (and not
just a mathematical convenience that fits paleoclimate), then solar activity
cycles — which are well-measured for centuries and reconstructed for
millennia — should preferentially land on 8H/N integer divisors for SOME
small integers N.

The Stefani / Scafetta / Wolff-Patrone planetary-tidal solar dynamo hypothesis
already argues solar cycles arise from planetary tidal forcing on the Sun.
This framework predicts a FIXED integer lattice that those proposed
mechanisms would have to satisfy. If the major solar cycles (Schwabe, Hale,
Gleissberg, Suess, Eddy, Hallstatt) sit on 8H/N for any specific N — and if
the spectrum has NO orphan peaks between integer-N positions — that's strong
cross-domain evidence for the 8H synchronization being physical.

Data
----
- SILSO monthly mean sunspot number (1749-2026, ~277 yr instrumental)
  https://www.sidc.be/SILSO
  → covers Schwabe (11), Hale (22), Gleissberg (88) — marginal for Suess (210)

- Steinhilber et al. 2012 PNAS solar modulation 14C/10Be (-7400 BC to 1988 AD)
  22-yr averages, ~9400 yr coverage
  → covers Suess (210), Eddy (1000), Hallstatt (2300)

Method
------
1. Load each record, detrend, normalize.
2. Compute periodogram + Welch's method PSD.
3. Identify dominant spectral peaks.
4. For each peak at period P, compute n_real = 8H/P and check distance to
   nearest integer:  ε(N) = |n_real - round(n_real)| / round(n_real).
5. ε < ~1% means the peak sits "on lattice"; ε > 5% is "off lattice".
6. Compare to a Monte Carlo null (random peak periods) for significance.

Output
------
- Per-record table of peak periods, nearest 8H/N integers, lattice fit
- Joint statistical test: are observed peaks closer to 8H/N integers than
  random peaks would be?
- data/solar-8H-lattice-test.json
"""

import json
import math
from pathlib import Path
import numpy as np

# Suppress scipy deprecation warnings
import warnings
warnings.filterwarnings("ignore")

# 8H Solar System Resonance Cycle (years)
H = 335_317
EIGHT_H = 8 * H   # 2,682,536 yr

SILSO_FILE = Path("/home/dennis/code/3d/data/silso-monthly-sunspot.csv")
STEINHILBER_FILE = Path("/home/dennis/code/3d/data/steinhilber-2012-solar.txt")
OUTPUT = Path("/home/dennis/code/3d/data/solar-8H-lattice-test.json")

# Known solar cycle periods (from heliophysics literature)
KNOWN_CYCLES = {
    "Schwabe":   11.07,   # Hathaway 2010
    "Hale":      22.14,   # 2x Schwabe (magnetic polarity)
    "Gleissberg": 88.0,   # ~80-110 range
    "Suess (de Vries)": 210.0,
    "Eddy":     1000.0,
    "Hallstatt (Bray)": 2300.0,
}


def load_silso():
    """Load SILSO monthly sunspot record. Returns (decimal_years, value)."""
    years, vals = [], []
    with open(SILSO_FILE) as f:
        for line in f:
            parts = line.strip().split(';')
            if len(parts) < 4:
                continue
            try:
                yr = float(parts[2])
                v = float(parts[3])
                if v < 0:    # missing-data marker
                    continue
            except ValueError:
                continue
            years.append(yr); vals.append(v)
    return np.asarray(years), np.asarray(vals)


def load_steinhilber():
    """Load Steinhilber 2012 solar modulation (column 4 = Phi MV).

    Year column is in years BP relative to 1950. Convert to calendar AD.
    """
    years_ad, phi = [], []
    in_data = False
    with open(STEINHILBER_FILE) as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            # Skip header rows; data starts after "Year ... PhiErr ..." line
            if "Year" in s and "1.PCErr" in s and "Phi" in s:
                in_data = True
                continue
            if not in_data:
                continue
            parts = s.split()
            if len(parts) < 4:
                continue
            try:
                yr_bp = float(parts[0])           # year BP (relative to 1950)
                phi_val = float(parts[3])         # solar modulation MV
                yr_ad = 1950 - yr_bp
            except ValueError:
                continue
            years_ad.append(yr_ad); phi.append(phi_val)
    a = np.asarray(years_ad); v = np.asarray(phi)
    # Sort chronologically
    order = a.argsort()
    return a[order], v[order]


def find_peaks_simple(periods, power, n_top=10, min_period=None, max_period=None):
    """Find top-n_top local maxima of power(period) with period in range."""
    mask = np.ones_like(power, dtype=bool)
    if min_period is not None:
        mask &= (periods >= min_period)
    if max_period is not None:
        mask &= (periods <= max_period)
    p_sub = periods[mask]
    pw_sub = power[mask]
    # Local maxima: power > both neighbors
    is_max = np.zeros_like(pw_sub, dtype=bool)
    is_max[1:-1] = (pw_sub[1:-1] > pw_sub[:-2]) & (pw_sub[1:-1] > pw_sub[2:])
    peak_p = p_sub[is_max]
    peak_pw = pw_sub[is_max]
    # Top n_top by power
    order = (-peak_pw).argsort()[:n_top]
    return peak_p[order], peak_pw[order]


def fit_lattice(period_yr):
    """Return (n_real, n_nearest, fractional_error) for a period vs 8H/N lattice."""
    n_real = EIGHT_H / period_yr
    n_near = int(round(n_real))
    if n_near <= 0:
        return n_real, 0, 1.0
    err = abs(n_real - n_near) / n_near
    return n_real, n_near, err


def analyze_record(label, years, vals, min_period, max_period):
    """Compute periodogram, find peaks, test lattice fit."""
    from scipy.signal import welch, detrend

    # Resample to uniform grid (some records are sparse)
    dt = np.median(np.diff(years))
    t_uniform = np.arange(years.min(), years.max(), dt)
    v_uniform = np.interp(t_uniform, years, vals)

    # Detrend
    v_dt = detrend(v_uniform)

    # Welch PSD
    fs = 1.0 / dt        # samples per year
    nperseg = min(len(v_dt) // 4, 512)
    f, psd = welch(v_dt, fs=fs, nperseg=nperseg, noverlap=nperseg // 2,
                   window='hann', scaling='density')
    # Frequency in cycles/yr → period in yr
    nonzero = f > 0
    periods = 1.0 / f[nonzero]
    pwr = psd[nonzero]

    # Find top peaks in the period range we care about
    peak_periods, peak_powers = find_peaks_simple(
        periods, pwr, n_top=15, min_period=min_period, max_period=max_period
    )

    print(f"\n  ── {label} ──")
    print(f"     n samples = {len(t_uniform)}, dt = {dt:.2f} yr, "
          f"baseline = {years.max()-years.min():.0f} yr")
    print(f"     period search range: {min_period:.1f} - {max_period:.1f} yr")
    print()
    print(f"     {'Peak P (yr)':>15}{'8H/P = n_real':>18}{'nearest N':>14}"
          f"{'frac err':>12}{'on-lattice?':>16}")
    table = []
    for p, pw in zip(peak_periods, peak_powers):
        n_real, n_near, err = fit_lattice(p)
        on_lattice = "✓ (<1%)" if err < 0.01 else ("? (<5%)" if err < 0.05 else "✗")
        print(f"     {p:>15.3f}{n_real:>18.1f}{n_near:>14d}"
              f"{100*err:>10.3f}%{on_lattice:>16}")
        table.append({
            "period_yr": float(p),
            "power": float(pw),
            "n_real": float(n_real),
            "n_nearest_integer": int(n_near),
            "fractional_error": float(err),
            "on_lattice_pct1": err < 0.01,
            "on_lattice_pct5": err < 0.05,
        })

    return periods, pwr, table


def known_cycles_table():
    """Compute lattice fit for the canonical solar cycle periods."""
    print("\n  ── Canonical solar cycles vs 8H/N lattice ──")
    print(f"     {'Cycle':<22}{'P (yr)':>10}{'n_real':>14}{'nearest N':>12}"
          f"{'frac err':>12}")
    out = []
    for name, P in KNOWN_CYCLES.items():
        n_real, n_near, err = fit_lattice(P)
        print(f"     {name:<22}{P:>10.2f}{n_real:>14.1f}{n_near:>12d}"
              f"{100*err:>10.3f}%")
        out.append({
            "name": name, "period_yr": P,
            "n_real": float(n_real),
            "n_nearest_integer": int(n_near),
            "fractional_error": float(err),
        })
    return out


def monte_carlo_null(n_peaks_per_record, n_records=2, n_trials=10000,
                    min_periods=(2, 50), max_periods=(50, 5000)):
    """Compute the null distribution of mean fractional error.

    Draw n_peaks random periods log-uniformly in each record's range, fit
    lattice, get mean fractional error. Repeat n_trials times.
    """
    rng = np.random.default_rng(42)
    nulls = []
    for _ in range(n_trials):
        errs = []
        for i, (lo, hi) in enumerate(zip(min_periods, max_periods)):
            # Log-uniform sample of periods
            log_p = rng.uniform(math.log(lo), math.log(hi), size=n_peaks_per_record)
            ps = np.exp(log_p)
            for p in ps:
                _, _, e = fit_lattice(p)
                errs.append(e)
        if errs:
            nulls.append(float(np.mean(errs)))
    return np.asarray(nulls)


def main():
    print("=" * 90)
    print("  Cross-domain test: 8H Solar System Resonance Cycle in solar activity")
    print(f"  8H = {EIGHT_H:,} yr  (H = {H:,} yr)")
    print("=" * 90)

    # Test the canonical solar cycles first
    canonical = known_cycles_table()

    # Load and analyze SILSO instrumental record
    print("\n  Loading SILSO monthly sunspot record ...")
    yrs_silso, ss = load_silso()
    print(f"    n = {len(yrs_silso)}, {yrs_silso.min():.1f} - {yrs_silso.max():.1f} AD")

    periods_silso, pwr_silso, peaks_silso = analyze_record(
        "SILSO sunspot (1749-2026 AD, ~277 yr baseline)",
        yrs_silso, ss,
        min_period=5, max_period=120,
    )

    # Load and analyze Steinhilber reconstruction
    print("\n  Loading Steinhilber 2012 solar modulation reconstruction ...")
    yrs_st, phi = load_steinhilber()
    print(f"    n = {len(yrs_st)}, {yrs_st.min():.1f} - {yrs_st.max():.1f} AD")

    periods_st, pwr_st, peaks_st = analyze_record(
        "Steinhilber 2012 (-7400 BC to 1988 AD, ~9400 yr, 22-yr averaged)",
        yrs_st, phi,
        min_period=80, max_period=4500,
    )

    # ── Joint statistical test ──
    print()
    print("=" * 90)
    print("  Joint statistical test: are solar peaks closer to 8H/N integers")
    print("  than random periods drawn from the same range?")
    print("=" * 90)

    obs_errs = ([p["fractional_error"] for p in peaks_silso[:5]] +
                [p["fractional_error"] for p in peaks_st[:5]])
    mean_obs = float(np.mean(obs_errs))

    null_dist = monte_carlo_null(
        n_peaks_per_record=5, n_records=2, n_trials=10000,
        min_periods=(5, 80), max_periods=(120, 4500),
    )
    null_mean = float(np.mean(null_dist))
    null_p5 = float(np.percentile(null_dist, 5))
    null_p25 = float(np.percentile(null_dist, 25))
    p_value = float(np.mean(null_dist <= mean_obs))

    print(f"  Observed mean fractional error (top-5 peaks per record, 10 total): "
          f"{100*mean_obs:.2f}%")
    print(f"  Null mean fractional error (10,000 trials, random periods): "
          f"{100*null_mean:.2f}%")
    print(f"  Null 5%-ile: {100*null_p5:.2f}%,   25%-ile: {100*null_p25:.2f}%")
    print(f"  P-value (fraction of null with error ≤ observed): {p_value:.4f}")
    print()
    if p_value < 0.05:
        verdict = "✓ Observed peaks significantly closer to integers than chance."
    elif p_value < 0.20:
        verdict = "? Marginal evidence; observed below null median but not significant."
    else:
        verdict = ("✗ Observed peaks NOT systematically on the 8H lattice. "
                   "Null hypothesis (random integer N) cannot be rejected.")
    print(f"  Verdict: {verdict}")
    # Note: the test is one-sided (we expect observed < null if hypothesis is true).

    # Output
    OUTPUT.write_text(json.dumps({
        "method": (
            "Test if solar activity spectral peaks sit on 8H/N integer divisors. "
            "Peaks identified via Welch PSD. Each peak period P → n_real = 8H/P. "
            "Lattice fit = fractional error to nearest integer. Joint test vs "
            "Monte Carlo null (random periods in same range)."
        ),
        "constants": {"H_yr": H, "8H_yr": EIGHT_H},
        "canonical_cycles": canonical,
        "silso_peaks": peaks_silso,
        "steinhilber_peaks": peaks_st,
        "joint_test": {
            "observed_mean_fractional_error": mean_obs,
            "null_mean_fractional_error": null_mean,
            "null_p5": null_p5,
            "null_p25": null_p25,
            "p_value": p_value,
        },
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()
