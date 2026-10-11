#!/usr/bin/env python3
"""
Does the climate formula need the clock of date? — measured on LR04 and CENOGRID.

The shipped formula evaluates every L1 line at its J2000 period. Two of the
three line families carry the general precession rate p: the obliquity lines
(p + s_i) and the climatic-precession lines (p + g_i). On the composed
lunisolar clock (plan 06 D6; @essrt/physics createModel().lunisolar) p was
faster in the past — Earth spun faster and the Moon was closer — so a p-line's
phase accumulates extra cycles:

    φ_i(t) = 2π [ t / P_i + Δ(t) ],   Δ(t) = ∫₀ᵗ ( 1/T_p(t') − 1/T_p(2000) ) dt'

with t the age in years. Δ(t) is the same for every p-line — it is the number
of extra precession cycles since J2000; the eccentricity lines (g_i − g_j) and
the climate-internal harmonics carry no p and are NOT warped (their
frequencies ride the solar-mass tier, ≡ 1 over these windows). Each p-line is
therefore evaluated on its own warped time τ_i(t) = t + Δ(t)·P_i.

Compared per window, with the module's own fitter and only the L1 design
matrix replaced: the shipped fit (J2000 periods) against the warped fit —
R² L1-only and R² L1+L2+L3. The window means of the period ratio
T_p(t)/T_p(2000) are banked for the named windows as well.

T_p(t) is read from the model through a Node subprocess — the package entry
imported by file path, so a worktree reads its own tree — sampled on a 10-kyr
grid to the model's published 500-Myr domain and integrated here by the
trapezoid rule.

Output: data/evolving-clock-test.json
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SCRIPTS_DIR = Path(__file__).resolve().parent
REPO = SCRIPTS_DIR.parent
sys.path.insert(0, str(SCRIPTS_DIR))
import milankovitch_climate_formula as mcf  # noqa: E402
from milankovitch_climate_formula import (  # noqa: E402
    ClimateFormula, L1_LINES, REGIME_WINDOWS, load_lr04, load_cenogrid, preprocess,
)
from climate_ecs_cross_proxy import load_cheng2016  # noqa: E402  — the U-Th-dated, untuned referee

OUT_PATH = REPO / "data" / "evolving-clock-test.json"
PHYSICS_ENTRY = REPO / "packages" / "physics" / "src" / "index.js"
WARPED_FAMILIES = ("obliquity", "climatic precession")   # the p-carrying families
CLOCK_STEP_KYR = 10.0
CLOCK_MAX_KYR = 500_000.0                                # the model's published domain
LR04_REGIMES = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
CENOGRID_WINDOW = (0, 66000)
CHENG_WINDOW = (0, 640)          # Cheng 2016 Asian-monsoon δ¹⁸O: U-Th dated, no orbital tuning
CLOCK_WINDOWS = {                                        # the doc-99 table
    "post-mpt": (0, 1000), "pleistocene": (0, 3000), "lr04-full": (0, 5320), "epica": (0, 800),
    "inhg-mpt": (1000, 2700), "cenogrid": (0, 66000), "mesozoic": (0, 250000), "phanerozoic": (0, 500000),
}
MATERIAL_DELTA_R2 = 0.0005
# Control 1: the warp scaled by k — k = 0 is the shipped fit, k = 1 the model's clock,
# k = −1 the counter-rotating sign. Where the record's optimum sits is the measurement.
WARP_SCALES = np.round(np.arange(-1.0, 6.0001, 0.1), 2)
# Control 2: a CONSTANT frequency offset δp (″/yr) on the p-lines — "which p does the
# record want?" — scanned at k = 0; then the clock's own gain (k = 1) on top of the
# preferred δp. A phase drift and a frequency offset both raise a line's mean
# frequency inside one window; only the pair of scans tells them apart.
DP_SCAN_ARCSEC = np.round(np.arange(-0.30, 0.6001, 0.02), 3)
ARCSEC_PER_CYCLE = 1_296_000.0
P_ARTIFACT_ARCSEC = float(mcf._L1_ART["config"]["pArcsecPerYr"])   # the general precession the climatic-precession lines carry
P_INERTIAL_ARTIFACT_ARCSEC = float(mcf._L1_ART["config"].get("pInertialArcsecPerYr", P_ARTIFACT_ARCSEC))   # the inertial rate the obliquity lines carry

NODE_CLOCK = """
import { createModel } from %s;
const m = createModel();
const T0 = m.lunisolar.meanPeriodYearsAtYear(2000);
const T = [];
for (let a = 0; a <= %f + 1e-9; a += %f) T.push(m.lunisolar.meanPeriodYearsAtYear(2000 - 1000 * a));
process.stdout.write(JSON.stringify({ modelVersion: m.identity.modelVersion, T0, T }));
"""


def read_clock():
    """T_p(t) on the grid, and the extra precession cycles since J2000 at each grid age."""
    js = NODE_CLOCK % (json.dumps(str(PHYSICS_ENTRY)), CLOCK_MAX_KYR, CLOCK_STEP_KYR)
    r = subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO,
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    ages = np.arange(0.0, CLOCK_MAX_KYR + CLOCK_STEP_KYR / 2, CLOCK_STEP_KYR)
    T = np.asarray(d["T"], dtype=float)
    if len(T) != len(ages):
        raise RuntimeError(f"clock grid mismatch: {len(T)} samples for {len(ages)} ages")
    g = 1.0 / T - 1.0 / d["T0"]                                   # cycles per year, extra
    extra = np.concatenate([[0.0], np.cumsum(0.5 * (g[1:] + g[:-1]) * CLOCK_STEP_KYR * 1000.0)])
    return {"modelVersion": d["modelVersion"], "T0": float(d["T0"]),
            "ages_kyr": ages, "T": T, "extra_cycles": extra}


class ClockWarpedFormula(ClimateFormula):
    """The shipped fitter with the p-carrying lines evaluated on the clock of date."""

    def __init__(self, extra_cycles_at, warped_periods):
        super().__init__()
        self._extra = extra_cycles_at
        self._warped = set(warped_periods)

    def _build_l1_matrix(self, t):
        d = self._extra(t)
        cols = [np.ones(len(t))]
        for P in mcf.L1_PERIODS_KYR:
            tau = t + d * P if P in self._warped else t
            omega = 2 * np.pi / P
            cols.append(np.cos(omega * tau))
            cols.append(np.sin(omega * tau))
        return np.column_stack(cols)


def extra_cycles_fn(clock, scale=1.0, dp_arcsec=0.0):
    """Extra cycles of every p-line at age t (kyr): k·Δ(t) from the clock plus δp·t from a constant offset."""
    df_per_kyr = dp_arcsec / ARCSEC_PER_CYCLE * 1000.0
    return lambda tt: (scale * np.interp(np.asarray(tt, dtype=float), clock["ages_kyr"], clock["extra_cycles"])
                       + df_per_kyr * np.asarray(tt, dtype=float))


def total_r2(t, y, regime, clock, warped, scale, dp_arcsec=0.0):
    if scale == 0.0 and dp_arcsec == 0.0:
        return ClimateFormula().fit(t, y, regime=regime, normalize=True).r2_l1_l2_l3
    return ClockWarpedFormula(extra_cycles_fn(clock, scale, dp_arcsec), warped).fit(
        t, y, regime=regime, normalize=True).r2_l1_l2_l3


def scale_scan(t, y, regime, clock, warped):
    """ΔR² (total) against the shipped fit as the warp is scaled by k."""
    base = total_r2(t, y, regime, clock, warped, 0.0)
    d = [total_r2(t, y, regime, clock, warped, float(k)) - base for k in WARP_SCALES]
    i = int(np.argmax(d))
    at = {f"{k:.1f}": float(v) for k, v in zip(WARP_SCALES, d)}
    return {"scales": [float(k) for k in WARP_SCALES], "delta_r2_total": [float(v) for v in d],
            "best_scale": float(WARP_SCALES[i]), "best_delta_r2_total": float(d[i]),
            "at_minus_one": at["-1.0"], "at_one": at["1.0"], "at_two": at["2.0"]}


def dp_scan(t, y, regime, clock, warped):
    """ΔR² (total) against the shipped fit as a constant frequency offset δp is put on the p-lines (k = 0),
    then the clock's own gain (k = 1) on top of the preferred δp."""
    base = total_r2(t, y, regime, clock, warped, 0.0)
    d = [total_r2(t, y, regime, clock, warped, 0.0, float(dp)) - base for dp in DP_SCAN_ARCSEC]
    i = int(np.argmax(d))
    best = float(DP_SCAN_ARCSEC[i])
    clock_gain = total_r2(t, y, regime, clock, warped, 1.0, best) - (base + d[i])
    return {"dp_arcsec_per_yr": [float(v) for v in DP_SCAN_ARCSEC], "delta_r2_total": [float(v) for v in d],
            "best_dp_arcsec_per_yr": best, "best_delta_r2_total": float(d[i]),
            "implied_p_arcsec_per_yr": P_ARTIFACT_ARCSEC + best,
            "clock_gain_at_best_dp": float(clock_gain)}


def halves(t, y, window, clock, warped):
    """ΔR² (total) at k = 1 on each half of the window, fitted independently."""
    lo, hi = window
    mid = 0.5 * (lo + hi)
    out = []
    for w in ((lo, mid), (mid, hi)):
        out.append(total_r2(t, y, w, clock, warped, 1.0) - total_r2(t, y, w, clock, warped, 0.0))
    return out


def compare(t, y, regime, label, clock, warped, families):
    extra_at = extra_cycles_fn(clock)
    f_const = ClimateFormula()
    s_const = f_const.fit(t, y, regime=regime, normalize=True)
    f_warp = ClockWarpedFormula(extra_at, warped)
    s_warp = f_warp.fit(t, y, regime=regime, normalize=True)
    lo, hi = REGIME_WINDOWS[regime] if isinstance(regime, str) else regime
    extra_end = float(extra_at([hi])[0])
    longest = max(warped)
    row = {"label": label, "window_kyr": [lo, hi], "n_points": int(s_const.n_samples),
           "r2_const_l1": s_const.r2_l1_only, "r2_const_total": s_const.r2_l1_l2_l3,
           "r2_warp_l1": s_warp.r2_l1_only, "r2_warp_total": s_warp.r2_l1_l2_l3,
           "delta_r2_l1": s_warp.r2_l1_only - s_const.r2_l1_only,
           "delta_r2_total": s_warp.r2_l1_l2_l3 - s_const.r2_l1_l2_l3,
           "extra_cycles_at_window_end": extra_end,
           "max_shift_kyr": extra_end * longest, "max_shift_line_kyr": longest}
    print(f"\n  ── {label} ──  window {lo:.0f}-{hi:.0f} kyr, {row['n_points']} points")
    print(f"    J2000 periods : R² L1 {s_const.r2_l1_only:.4f}, +L3 {s_const.r2_l1_l2_l3:.4f}")
    print(f"    clock of date : R² L1 {s_warp.r2_l1_only:.4f}, +L3 {s_warp.r2_l1_l2_l3:.4f}")
    print(f"    ΔR² (warp − J2000): L1 {row['delta_r2_l1']:+.5f}, total {row['delta_r2_total']:+.5f}; "
          f"extra cycles at window end {extra_end:.3f} → max line shift {row['max_shift_kyr']:.1f} kyr "
          f"(the {longest:.1f}-kyr line)")
    row["scale_scan"] = scale_scan(t, y, regime, clock, warped)
    row["halves_delta_r2_total_at_one"] = halves(t, y, (lo, hi), clock, warped)
    row["dp_scan"] = dp_scan(t, y, regime, clock, warped)
    # Control 3: the same offset scan on ONE family at a time — a convention
    # split (the obliquity lines carrying a different rate than the
    # climatic-precession lines) shows as an offset in one family only.
    row["dp_scan_by_family"] = {fam: dp_scan(t, y, regime, clock, lines)
                                for fam, lines in families.items()}
    ss, dp = row["scale_scan"], row["dp_scan"]
    print(f"    warp-scale scan: best k = {ss['best_scale']:+.1f} (ΔR² {ss['best_delta_r2_total']:+.5f}); "
          f"k = −1 {ss['at_minus_one']:+.5f}, k = 1 {ss['at_one']:+.5f}, k = 2 {ss['at_two']:+.5f}")
    print(f"    halves at k = 1: first {row['halves_delta_r2_total_at_one'][0]:+.5f}, "
          f"second {row['halves_delta_r2_total_at_one'][1]:+.5f}")
    print(f"    δp scan (k = 0): best δp = {dp['best_dp_arcsec_per_yr']:+.2f} ″/yr → p = {dp['implied_p_arcsec_per_yr']:.3f} ″/yr "
          f"(ΔR² {dp['best_delta_r2_total']:+.5f}); the clock (k = 1) on top of it: {dp['clock_gain_at_best_dp']:+.5f}")
    for fam, d in row["dp_scan_by_family"].items():
        print(f"    δp scan, {fam} lines only: best δp = {d['best_dp_arcsec_per_yr']:+.2f} ″/yr (ΔR² {d['best_delta_r2_total']:+.5f})")
    return row


def clock_window_means(clock):
    out = {}
    for name, (lo, hi) in CLOCK_WINDOWS.items():
        m = (clock["ages_kyr"] >= lo) & (clock["ages_kyr"] <= hi)
        ratio = clock["T"][m] / clock["T0"]
        extra = float(np.interp(hi, clock["ages_kyr"], clock["extra_cycles"])
                      - np.interp(lo, clock["ages_kyr"], clock["extra_cycles"]))
        out[name] = {"window_kyr": [lo, hi], "mean_period_ratio": float(ratio.mean()),
                     "period_correction_pct": float(100.0 * (ratio.mean() - 1.0)),
                     "extra_cycles_over_window": extra}
    return out


def main():
    clock = read_clock()
    warped = [float(x["periodKyr"]) for x in L1_LINES if x["family"] in WARPED_FAMILIES]
    unwarped = [float(x["periodKyr"]) for x in L1_LINES if x["family"] not in WARPED_FAMILIES]
    families = {fam: [float(x["periodKyr"]) for x in L1_LINES if x["family"] == fam] for fam in WARPED_FAMILIES}
    print("=" * 92)
    print("  TEST: do the p-carrying L1 lines need the clock of date?")
    print("=" * 92)
    print(f"  model {clock['modelVersion']}, T_p(2000) = {clock['T0']:.2f} yr; "
          f"{len(warped)} warped lines ({', '.join(WARPED_FAMILIES)}), {len(unwarped)} unwarped")

    means = clock_window_means(clock)
    print(f"\n  {'window':<12}{'kyr':>16}{'mean T_p/T_p0':>15}{'period corr.':>14}{'extra cycles':>14}")
    for name, m in means.items():
        print(f"  {name:<12}{m['window_kyr'][0]:>7.0f}-{m['window_kyr'][1]:<8.0f}{m['mean_period_ratio']:>15.5f}"
              f"{m['period_correction_pct']:>+13.3f}%{m['extra_cycles_over_window']:>14.3f}")

    results = {}
    ages, vals = load_lr04()
    for regime in LR04_REGIMES:
        t, y = preprocess(ages, vals, REGIME_WINDOWS[regime])
        results[regime] = compare(t, y, regime, f"LR04 {regime}", clock, warped, families)
    ages_c, _d13c, d18o = load_cenogrid()
    t, y = preprocess(ages_c, d18o, CENOGRID_WINDOW)
    results["cenogrid"] = compare(t, y, CENOGRID_WINDOW, "CENOGRID 0-66 Myr", clock, warped, families)
    ages_ch, y_ch = load_cheng2016()
    t, y = preprocess(ages_ch, y_ch, CHENG_WINDOW)
    results["cheng"] = compare(t, y, CHENG_WINDOW, "Cheng 2016 0-640 kyr", clock, warped, families)

    max_total = max(r["delta_r2_total"] for r in results.values())
    any_material = any(r["delta_r2_total"] > MATERIAL_DELTA_R2 for r in results.values())
    max_clock_after_dp = max(r["dp_scan"]["clock_gain_at_best_dp"] for r in results.values())
    any_clock_after_dp = any(r["dp_scan"]["clock_gain_at_best_dp"] > MATERIAL_DELTA_R2 for r in results.values())
    dp_lr04 = [results[k]["dp_scan"]["best_dp_arcsec_per_yr"] for k in LR04_REGIMES]
    print()
    print("=" * 92)
    print(f"  {'window':<22}{'ΔR² L1':>10}{'ΔR² total':>12}{'extra cycles':>14}{'max shift':>12}"
          f"{'best k':>8}{'k=−1':>10}{'halves (k=1)':>22}{'best δp':>9}{'p':>8}{'clock|δp':>10}")
    for key, r in results.items():
        h = r["halves_delta_r2_total_at_one"]
        dp = r["dp_scan"]
        print(f"  {r['label'][:22]:<22}{r['delta_r2_l1']:>+10.5f}{r['delta_r2_total']:>+12.5f}"
              f"{r['extra_cycles_at_window_end']:>14.3f}{r['max_shift_kyr']:>10.1f} kyr"
              f"{r['scale_scan']['best_scale']:>+8.1f}{r['scale_scan']['at_minus_one']:>+10.5f}"
              f"{h[0]:>+11.5f}{h[1]:>+11.5f}{dp['best_dp_arcsec_per_yr']:>+9.2f}{dp['implied_p_arcsec_per_yr']:>8.3f}"
              f"{dp['clock_gain_at_best_dp']:>+10.5f}")
    print(f"\n  (the line artifact's rates: p = {P_ARTIFACT_ARCSEC:.3f} ″/yr on the climatic-precession lines, "
          f"p_inertial = {P_INERTIAL_ARTIFACT_ARCSEC:.3f} ″/yr on the obliquity lines; δp is the constant offset the record prefers on top)")
    print(f"\n  Clock alone (k = 1): max ΔR² total {max_total:+.5f}"
          f"{' — material' if any_material else ' — not material'} (threshold {MATERIAL_DELTA_R2}).")
    print(f"  Clock on top of the preferred δp: max {max_clock_after_dp:+.5f}"
          f"{' — material in at least one window' if any_clock_after_dp else ' — not material in any window'}.")
    print(f"  Preferred δp over the LR04 windows: {min(dp_lr04):+.2f} … {max(dp_lr04):+.2f} ″/yr "
          f"(p = {P_ARTIFACT_ARCSEC + min(dp_lr04):.3f} … {P_ARTIFACT_ARCSEC + max(dp_lr04):.3f}); "
          f"Cheng 2016 (untuned): {results['cheng']['dp_scan']['best_dp_arcsec_per_yr']:+.2f} ″/yr.")

    OUT_PATH.write_text(json.dumps({
        "method": ("Shipped fit (every L1 line at its J2000 period) vs the same fitter with the p-carrying "
                   "lines (obliquity p+s_i, climatic precession p+g_i) evaluated on the composed lunisolar "
                   "clock of date: each such line on its own warped time τ = t + Δ(t)·P, Δ(t) the extra "
                   "precession cycles since J2000; eccentricity lines and the climate-internal harmonics unwarped."),
        "clock_source": {"package": "@essrt/physics", "entry": str(PHYSICS_ENTRY.relative_to(REPO)),
                         "api": "createModel().lunisolar.meanPeriodYearsAtYear(year)",
                         "modelVersion": clock["modelVersion"], "T_p_2000_yr": clock["T0"],
                         "grid_step_kyr": CLOCK_STEP_KYR, "grid_max_kyr": CLOCK_MAX_KYR},
        "warped_families": list(WARPED_FAMILIES),
        "warped_lines_kyr": warped, "unwarped_lines_kyr": unwarped,
        "controls": {"warp_scale_scan": "ΔR² total against the shipped fit with the warp scaled by k over "
                                        f"[{WARP_SCALES[0]}, {WARP_SCALES[-1]}] step 0.1 (k = 1 the model's clock, "
                                        "k = −1 the counter-rotating sign); best k per window",
                     "halves": "ΔR² total at k = 1 on each half of the window, fitted independently",
                     "dp_scan": "ΔR² total against the shipped fit with a constant frequency offset δp (″/yr) "
                                f"on the p-lines over [{DP_SCAN_ARCSEC[0]}, {DP_SCAN_ARCSEC[-1]}] step 0.02 at k = 0; "
                                "the preferred δp, the implied p, and the clock's gain (k = 1) on top of it",
                     "dp_scan_by_family": "the same δp scan on one family at a time (obliquity lines only; "
                                          "climatic-precession lines only), the other family at its shipped periods"},
        "p_artifact_arcsec_per_yr": P_ARTIFACT_ARCSEC,
        "p_inertial_artifact_arcsec_per_yr": P_INERTIAL_ARTIFACT_ARCSEC,
        "clock_window_means": means,
        "results": results,
        "verdict": {"max_delta_r2_total": max_total, "material_threshold": MATERIAL_DELTA_R2,
                    "any_material": any_material,
                    "max_clock_gain_after_preferred_dp": max_clock_after_dp,
                    "any_clock_gain_after_preferred_dp": any_clock_after_dp,
                    "preferred_dp_lr04_min": min(dp_lr04), "preferred_dp_lr04_max": max(dp_lr04),
                    "preferred_dp_cheng": results["cheng"]["dp_scan"]["best_dp_arcsec_per_yr"]},
    }, indent=2))
    print(f"\n  Wrote: {OUT_PATH.relative_to(REPO)}")


if __name__ == "__main__":
    main()
