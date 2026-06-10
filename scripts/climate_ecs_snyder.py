#!/usr/bin/env python3
"""
ECS from canonical climate formula L1 lattice — direct-temperature version.

Replaces the δ¹⁸O × κ pathway with Snyder 2016's direct GAST reconstruction
(Nature 538, 226, Source Data Figure 1, sheet 1a-GAST reconstruction).

What this answers
-----------------
The LR04+EPICA analysis (climate_ecs_full.py) gave obliquity-band Charney
sensitivity = 4.06 K [3.85–5.03] under κ=2.5 K/‰. The κ calibration was the
dominant systematic — under reasonable κ ∈ [1.5, 4.0] the answer spans
3.0–8.9 K.

Snyder's GAST is global mean surface air temperature anomaly in K, derived
via a published Bayesian framework over 54 SST records. Using GAST directly:

    ECS(n) = A_T(n) [K] × 3.71 / ΔF(n)         (no κ ANYWHERE)

If Snyder-GAST gives a similar 3-5 K obliquity-band Charney result, the
calibration objection collapses and the model's ECS estimate stands.

Method
------
  1. Load Snyder GAST (col `0.5` = median) over the post-MPT window
  2. Load EPICA CO₂ over the same window
  3. Fit canonical climate formula to each
  4. Per L1 line: ECS = A_T × 3.71 / [5.35 × ln(1 + A_CO2 / CO2_ref)]
  5. Block bootstrap (N=200) → 90% CI on ECS, lag, etc.
  6. Compare per-band to the LR04+EPICA result

Snyder GAST is anomaly relative to 0-5 ka average — fine for Fourier
amplitude/phase extraction (the formula's long-term trend is captured by
intercept and pre-detrend).

Source: Snyder, C.W. (2016). Evolution of global temperature over the past
two million years. Nature 538, 226-228. doi:10.1038/nature19798
"""

import json
import math
import sys
from pathlib import Path
import numpy as np

# Suppress openpyxl "Unknown extension" warning on Snyder file
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (   # noqa
    ClimateFormula, EIGHT_H, L1_LATTICE_INTEGERS,
    REGIME_WINDOWS, load_epica_co2, preprocess,
)

# ── Constants ────────────────────────────────────────────────────────────────
ALPHA = 5.35
F_2X = ALPHA * math.log(2)
SLOW_FEEDBACK_FRACTIONS = [0.3, 0.4, 0.5]

N_BOOT = 200
BLOCK_KYR = 30
RNG_SEED = 20260605

SNYDER_FILE = Path("/home/dennis/code/3d/data/Snyder_Data_Figures/Source Data - Figure 1.xlsx")
OUTPUT_FILE = Path("/home/dennis/code/3d/data/climate-ecs-snyder.json")

BANDS = {
    "obliquity (35-50 kyr)": [(35, 50)],
    "100-kyr band (75-130)": [(75, 130)],
    "precession (18-26)":    [(18, 26)],
    "long (>130)":           [(130, 1000)],
    "short (<18)":           [(0, 18)],
}


# ── Loaders ──────────────────────────────────────────────────────────────────
def load_snyder_gast():
    """Load Snyder 2016 GAST median over 1-2003 kyr BP.

    Returns: (ages_kyr, T_K) where T is global mean SAT anomaly in K.
    """
    import openpyxl
    wb = openpyxl.load_workbook(SNYDER_FILE, data_only=True)
    ws = wb["1a-GAST reconstruction"]
    ages, t_median, t_lo, t_hi = [], [], [], []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < 2:
            continue  # skip header rows
        if row[0] is None or row[2] is None:
            continue
        try:
            ages.append(float(row[0]))
            t_lo.append(float(row[1]))      # 2.5%
            t_median.append(float(row[2]))  # 50% (best estimate)
            t_hi.append(float(row[3]))      # 97.5%
        except (TypeError, ValueError):
            continue
    wb.close()
    return (np.asarray(ages), np.asarray(t_median),
            np.asarray(t_lo), np.asarray(t_hi))


# ── Bootstrap helpers (copied from climate_ecs_full.py) ──────────────────────
def fit_and_extract(t, y, regime):
    f = ClimateFormula()
    f.fit(t, y, regime=regime, normalize=True)
    return dict(f._l1_a), dict(f._l1_b), f._fit_y_std


def block_bootstrap_indices(n, block_n, rng):
    if block_n >= n:
        block_n = n
    n_blocks = (n + block_n - 1) // block_n
    starts = rng.integers(0, n - block_n + 1, size=n_blocks)
    idx = np.concatenate([np.arange(s, s + block_n) for s in starts])[:n]
    return idx


def bootstrap_l1(t, y, regime, block_kyr, n_boot, rng):
    dt = float(np.median(np.diff(t)))
    block_n = max(1, int(round(block_kyr / dt)))
    result = {n: {"amplitudes": [], "phases": []} for n in L1_LATTICE_INTEGERS}
    for _ in range(n_boot):
        idx = block_bootstrap_indices(len(t), block_n, rng)
        try:
            a, b, std = fit_and_extract(t, y[idx], regime)
        except Exception:
            continue
        for n in L1_LATTICE_INTEGERS:
            an = a.get(n, 0.0); bn = b.get(n, 0.0)
            result[n]["amplitudes"].append(math.hypot(an, bn) * std)
            result[n]["phases"].append(math.atan2(bn, an))
    return result


def baseline_l1(t, y, regime):
    a, b, std = fit_and_extract(t, y, regime)
    return {n: {
        "amp": math.hypot(a.get(n, 0.0), b.get(n, 0.0)) * std,
        "phase": math.atan2(b.get(n, 0.0), a.get(n, 0.0)),
    } for n in L1_LATTICE_INTEGERS}


def wrap_pi(angle):
    while angle > math.pi: angle -= 2 * math.pi
    while angle <= -math.pi: angle += 2 * math.pi
    return angle


def pct(arr, q):
    return float(np.percentile(np.asarray(arr), q)) if len(arr) else float("nan")


def co2_forcing(delta_co2, co2_ref):
    return ALPHA * math.log(1 + delta_co2 / co2_ref)


# ── Main analysis ────────────────────────────────────────────────────────────
def main():
    rng = np.random.default_rng(RNG_SEED)

    print("=" * 92)
    print("  ECS spectrum from Snyder 2016 GAST × EPICA CO₂ (DIRECT — no κ calibration)")
    print(f"  Bootstrap N = {N_BOOT}, block ≈ {BLOCK_KYR} kyr")
    print("=" * 92)

    # ── Load + preprocess ──
    print("\n  Loading Snyder 2016 GAST (Nature 538, 226 Source Data Fig 1a) ...")
    ages_s, t_s, t_lo_s, t_hi_s = load_snyder_gast()
    print(f"    raw n = {len(ages_s)}, age range = [{ages_s.min():.0f}, {ages_s.max():.0f}] kyr BP")
    print(f"    T range (median) = [{t_s.min():.2f}, {t_s.max():.2f}] °C anomaly")
    print(f"    T 2.5–97.5%% CI typical width: {np.mean(t_hi_s - t_lo_s):.2f} °C")

    post_mpt = (0, 1000)
    tg_s, yg_s = preprocess(ages_s, t_s, post_mpt, dt_kyr=1.0)
    print(f"    preprocessed: n = {len(tg_s)}, dt = 1 kyr, window = post-MPT (0-1000 kyr)")

    print("\n  Loading EPICA CO₂ ...")
    t_e, y_e = load_epica_co2()
    epica_win = (0, 800)
    tg_e, yg_e = preprocess(t_e, y_e, epica_win, dt_kyr=1.0)
    # EPICA only covers 0-800; we'll have to limit our paired analysis to that window
    # Use raw-data mean as CO₂_ref
    mask_e = (t_e >= epica_win[0]) & (t_e <= epica_win[1])
    co2_ref = float(np.mean(y_e[mask_e]))
    print(f"    CO₂_ref = {co2_ref:.2f} ppm (raw mean, 0-800 kyr)")

    # Re-preprocess Snyder onto same 0-800 window for fair pairing
    tg_s8, yg_s8 = preprocess(ages_s, t_s, (0, 800), dt_kyr=1.0)
    print(f"    Snyder restricted to 0-800 kyr: n = {len(tg_s8)}")

    # ── Baseline fits ──
    print("\n  Baseline fits ...")
    base_T = baseline_l1(tg_s8, yg_s8, (0, 800))
    base_F = baseline_l1(tg_e,  yg_e,  "epica-co2")

    f_check = ClimateFormula()
    summ_T = f_check.fit(tg_s8, yg_s8, regime=(0, 800), normalize=True)
    summ_F = f_check.fit(tg_e, yg_e, regime="epica-co2", normalize=True)
    print(f"    Snyder GAST  R² L1 only = {summ_T.r2_l1_only:.4f}, total = {summ_T.r2_l1_l2_l3:.4f}")
    print(f"    EPICA CO₂   R² L1 only = {summ_F.r2_l1_only:.4f}, total = {summ_F.r2_l1_l2_l3:.4f}")

    # ── Bootstrap ──
    print("\n  Bootstrap Snyder GAST ...")
    boot_T = bootstrap_l1(tg_s8, yg_s8, (0, 800), BLOCK_KYR, N_BOOT, rng)
    print("  Bootstrap EPICA CO₂ ...")
    boot_F = bootstrap_l1(tg_e, yg_e, "epica-co2", BLOCK_KYR, N_BOOT, rng)

    # ── Per-line ECS ──
    spectrum = []
    for n in L1_LATTICE_INTEGERS:
        amp_T0 = base_T[n]["amp"]   # K
        amp_F0 = base_F[n]["amp"]   # ppm
        if amp_T0 <= 0 or amp_F0 <= 0:
            continue

        ph_T0 = base_T[n]["phase"]
        ph_F0 = base_F[n]["phase"]
        # GAST is POSITIVE temperature anomaly (warmer = higher value); CO₂ is
        # also positive (more = higher). So they're expected to be IN-PHASE for
        # orbital-coupled cycles. Concordant if phase separation ≤ 90°.
        sep_rad = abs(wrap_pi(ph_F0 - ph_T0))
        sep_deg = math.degrees(min(sep_rad, math.pi))
        # Signed lag — positive = CO₂ peaks AFTER T (CO₂ lags T)
        period_kyr = EIGHT_H / n
        phase_diff = wrap_pi(ph_T0 - ph_F0)
        lag_kyr = phase_diff * period_kyr / (2 * math.pi)

        dF0 = co2_forcing(amp_F0, co2_ref)
        ecs0 = amp_T0 * F_2X / dF0

        # Bootstrap CI on ECS, lag
        ecs_boot = []
        lag_boot = []
        for at, af, pt, pf in zip(boot_T[n]["amplitudes"], boot_F[n]["amplitudes"],
                                   boot_T[n]["phases"], boot_F[n]["phases"]):
            if at <= 0 or af <= 0: continue
            dF = co2_forcing(af, co2_ref)
            if dF <= 1e-9: continue
            ecs_boot.append(at * F_2X / dF)
            pd = wrap_pi(pt - pf)
            lag_boot.append(pd * period_kyr / (2 * math.pi))

        spectrum.append({
            "n": n,
            "period_kyr": period_kyr,
            "amp_T_K": amp_T0,
            "amp_F_ppm": amp_F0,
            "delta_F_Wm2": dF0,
            "ecs_K": ecs0,
            "ecs_p5_K": pct(ecs_boot, 5),
            "ecs_p95_K": pct(ecs_boot, 95),
            "lag_kyr": lag_kyr,
            "lag_p5_kyr": pct(lag_boot, 5),
            "lag_p95_kyr": pct(lag_boot, 95),
            "phase_sep_deg": sep_deg,
            "phase_concordant": sep_deg <= 90,   # GAST direct → in-phase = concordant
        })

    # ── Print per-line table ──
    print()
    print(f"   {'n':>4}{'P (kyr)':>9}"
          f"{'ΔT (K)':>9}{'ΔF (W/m²)':>11}"
          f"{'ECS [5-95]':>18}"
          f"{'lag [5-95]':>22}{'Δφ':>6}{'?':>3}")
    for r in sorted(spectrum, key=lambda x: x["period_kyr"]):
        ok = "✓" if r["phase_concordant"] else "✗"
        ecs_s = f"{r['ecs_K']:>5.2f} [{r['ecs_p5_K']:.1f}-{r['ecs_p95_K']:.1f}]"
        lag_s = f"{r['lag_kyr']:+5.1f} [{r['lag_p5_kyr']:+.1f}-{r['lag_p95_kyr']:+.1f}]"
        print(f"   {r['n']:>4}{r['period_kyr']:>9.1f}"
              f"{r['amp_T_K']:>9.4f}{r['delta_F_Wm2']:>11.4f}"
              f"{ecs_s:>18}{lag_s:>22}{r['phase_sep_deg']:>6.0f}{ok:>3}")

    # ── Stats ──
    valid = [r for r in spectrum if 0 < r["ecs_K"] < 25]
    concordant = [r for r in valid if r["phase_concordant"]]

    def stats(rows, label):
        if not rows: return None
        ecs = np.array([r["ecs_K"] for r in rows])
        w   = np.array([r["amp_T_K"] for r in rows])
        return {
            "label": label,
            "n_lines": len(rows),
            "mean_K": float(np.mean(ecs)),
            "median_K": float(np.median(ecs)),
            "weighted_mean_K": float(np.average(ecs, weights=w)),
            "p5_K": float(np.percentile(ecs, 5)),
            "p95_K": float(np.percentile(ecs, 95)),
        }

    all_v = stats(valid, "all_valid")
    conc = stats(concordant, "phase_concordant")

    print()
    print("   ── Overall ──")
    if all_v:
        print(f"   All valid       (n={all_v['n_lines']:>2}): "
              f"mean = {all_v['mean_K']:.2f} K, "
              f"median = {all_v['median_K']:.2f} K, "
              f"ΔT-weighted = {all_v['weighted_mean_K']:.2f} K, "
              f"90% CI = [{all_v['p5_K']:.2f}, {all_v['p95_K']:.2f}] K")
    if conc:
        print(f"   Phase-concordant (n={conc['n_lines']:>2}): "
              f"mean = {conc['mean_K']:.2f} K, "
              f"median = {conc['median_K']:.2f} K, "
              f"ΔT-weighted = {conc['weighted_mean_K']:.2f} K, "
              f"90% CI = [{conc['p5_K']:.2f}, {conc['p95_K']:.2f}] K")

    # Per-band
    print()
    print("   ── By band (phase-concordant only) ──")
    print(f"   {'Band':<25}{'n':>4}{'mean':>9}{'median':>10}"
          f"{'ΔT-weight':>12}{'90% CI':>20}")
    band_stats = {}
    for bname, ranges in BANDS.items():
        bs = stats(
            [r for r in concordant
             if any(lo <= r["period_kyr"] <= hi for lo, hi in ranges)],
            bname,
        )
        band_stats[bname] = bs
        if bs and bs["n_lines"] > 0:
            ci = f"[{bs['p5_K']:.2f}-{bs['p95_K']:.2f}]"
            print(f"   {bname:<25}{bs['n_lines']:>4}{bs['mean_K']:>9.2f}"
                  f"{bs['median_K']:>10.2f}{bs['weighted_mean_K']:>12.2f}{ci:>20}")

    # ESS → Charney (only if we have concordant lines)
    if conc:
        print()
        print("   ── ESS → Charney decomposition (ΔT-weighted, concordant) ──")
        ess = conc["weighted_mean_K"]
        print(f"   ESS (direct from Snyder GAST) = {ess:.2f} K")
        for alpha in SLOW_FEEDBACK_FRACTIONS:
            print(f"   Charney @ α_slow={alpha}        = {ess * (1 - alpha):.2f} K")

    # Comparison to LR04+EPICA
    print()
    print("=" * 92)
    print("  COMPARISON to LR04+EPICA result (climate_ecs_full.py)")
    print("=" * 92)
    print()
    print("                              LR04+EPICA (κ=2.5)    Snyder GAST (direct)")
    if band_stats.get("obliquity (35-50 kyr)") and band_stats["obliquity (35-50 kyr)"]:
        obliq = band_stats["obliquity (35-50 kyr)"]
        print(f"  Obliquity-band ECS    :   4.06 K [3.85-5.03]   "
              f"{obliq['weighted_mean_K']:>4.2f} K [{obliq['p5_K']:.2f}-{obliq['p95_K']:.2f}]")
    if band_stats.get("100-kyr band (75-130)") and band_stats["100-kyr band (75-130)"]:
        hk = band_stats["100-kyr band (75-130)"]
        print(f"  100-kyr-band ESS      :   11.07 K [4.49-18.64]  "
              f"{hk['weighted_mean_K']:>5.2f} K [{hk['p5_K']:.2f}-{hk['p95_K']:.2f}]")
    if band_stats.get("precession (18-26)") and band_stats["precession (18-26)"]:
        pr = band_stats["precession (18-26)"]
        print(f"  Precession-band ESS   :   13.22 K [5.38-20.14]  "
              f"{pr['weighted_mean_K']:>5.2f} K [{pr['p5_K']:.2f}-{pr['p95_K']:.2f}]")
    if conc:
        print(f"  Total ΔT-weighted ESS :    8.41 K               "
              f"{conc['weighted_mean_K']:>4.2f} K")
        print(f"  Charney @ α_slow=0.4  :    5.05 K               "
              f"{conc['weighted_mean_K'] * 0.6:>4.2f} K")

    print()
    print("=" * 92)
    print("  IPCC AR6 Charney range  : 2.5-4.0 K (best 3.0)")
    print("  PALAEOSENS              : 3.0-4.5 K (with slow feedbacks)")
    print("  Hansen 2013 ESS         : ~6 K")
    print("=" * 92)

    # ── Output JSON ──
    OUTPUT_FILE.write_text(json.dumps({
        "method": (
            "ECS from Snyder 2016 GAST × EPICA CO₂, direct (no κ calibration). "
            "Block bootstrap N=200, block=30 kyr."
        ),
        "snyder_source": "Nature 538, 226-228 (2016), Source Data Figure 1a",
        "n_bootstrap": N_BOOT,
        "snyder_R2_L1": float(summ_T.r2_l1_only),
        "snyder_R2_total": float(summ_T.r2_l1_l2_l3),
        "co2_ref_ppm": co2_ref,
        "spectrum": spectrum,
        "stats_all_valid": all_v,
        "stats_concordant": conc,
        "by_band": band_stats,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
