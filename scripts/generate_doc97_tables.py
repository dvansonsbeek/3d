#!/usr/bin/env python3
"""
Generate the numeric tables of docs/97-paleo-ecs-decomposition.md from their
artifacts. The doc's prose is hand-written; every table that reports a
measurement lives between

    <!-- generated:<id> -->
    ...table...
    <!-- /generated:<id> -->

and is OWNED by this script. Run after any of the climate-ECS / lattice-
stability generators (see doc 97 §7): the tables then follow the artifacts
instead of drifting as literals.

    python3 scripts/generate_doc97_tables.py          # rewrite the blocks
    python3 scripts/generate_doc97_tables.py --check  # exit 1 if any block is stale

Identity labels (which secular beat an integer is) are physics, not data,
and are kept here as static dictionaries.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOC = ROOT / "docs" / "97-paleo-ecs-decomposition.md"


def rd(name):
    txt = (DATA / name).read_text()
    txt = re.sub(r"\bInfinity\b", "1e308", txt)
    txt = re.sub(r"\bNaN\b", "null", txt)
    return json.loads(txt)


def pct(x, d=0):
    return f"{100 * x:.{d}f}%"


def sub(s):
    """k-s7 → k−s₇, g2+g5 → g₂+g₅"""
    return re.sub(r"([gs])(\d)", lambda m: m.group(1) + "₀₁₂₃₄₅₆₇₈₉"[int(m.group(2))], s).replace("-", "−")


BANDS5 = [("Obliquity (35–50 kyr)", "obliquity (35-50)"), ("100-kyr band (75–130 kyr)", "100-kyr band (75-130)"),
          ("Precession (18–26 kyr)", "precession (18-26)"), ("Long (>130 kyr)", "long (>130)"), ("Short (<18 kyr)", "short (<18)")]
BANDS3 = [("Obliquity", "obliquity (35-50)"), ("100-kyr", "100-kyr band (75-130)"), ("Precession", "precession (18-26)")]
BAND_RANGE = {"obliquity (35-50)": (35, 50), "100-kyr band (75-130)": (75, 130), "precession (18-26)": (18, 26)}

ICE_INTERP = {
    "100-kyr band (75-130)": "Ice-sheet feedback dominates post-MPT — consistent with 100-kyr glacial cycles being an ice-volume signal",
    "obliquity (35-50)": "Substantial ice response at obliquity-paced insolation, as predicted by Willeit 2019",
    "precession (18-26)": "High ice-share despite precession being \"fast\" — reflects ice sheet response *integrated* over precession-modulated NH summer insolation",
    "long (>130)": "CO₂/GHG forcing becomes proportionally more important at long periods",
    "short (<18)": "Mixed — Heinrich/D-O scale, partly internal variability",
}
C50_IDENTITY = {9: "g₂−g₇ (Venus-Uranus ecc)", 14: "g₂−g₈ (Venus-Neptune)", 22: "s₁+s₂ (Mercury-Venus nodal)", 25: "s₁−s₄ (100-kyr centroid)",
                28: "g₄-g₅ (Mars-Jupiter ecc)", 65: "k+s₃ obliquity main", 66: "obliquity-band centroid", 68: "k+s₄ obliquity sub",
                113: "k+g₅ climatic precession", 120: "k+g₂ climatic precession"}
C50_BOLD = {28, 65, 66, 68}
C50_IDENTITY_ESSRT = {22: "s₂-s₄ nodal (Berger 121-kyr cousin)", 25: "s₁-s₄ nodal (100-kyr centroid)", 28: "g₄-g₅ (Berger 95-kyr ecc)",
                      65: "k+s₃ (obliquity main, Berger 41-kyr)", 66: "obliquity-band centroid", 68: "k+s₄ (obliquity sub)",
                      113: "k+g₅ climatic precession", 120: "k+g₂ climatic precession"}
FIB_ORDER = ["H/8 obliquity", "H/5 ecliptic", "H/13 axial", "H/3 inclination", "H/16 perihelion"]
FIB_LABEL = {"H/8 obliquity": "H/8 obliquity (8H/64)", "H/5 ecliptic": "H/5 ecliptic", "H/13 axial": "H/13 axial",
             "H/3 inclination": "H/3 inclination", "H/16 perihelion": "H/16 perihelion"}


def band_fice(tight):
    """The §4.7 per-band f_ice as written by climate_ecs_tight.py itself (its own recipe:
    LR04-amplitude-weighted over the L1 lines in the band, low-SNR lines excluded)."""
    return {key: v["f_ice"] for key, v in tight["band_f_ice"].items()}


def blocks():
    ff = rd("climate-ecs-full-forcing.json"); mc = rd("climate-ecs-monte-carlo.json"); sn = rd("climate-ecs-snyder.json")
    cp = rd("climate-ecs-cross-proxy.json"); pr = rd("climate-ecs-per-regime.json"); tg = rd("climate-ecs-tight.json")
    bo = rd("climate-ecs-boron.json"); pub = rd("l1-vs-laskar-50myr-published.json"); fib = rd("l1-fibonacci-stability.json")
    h8 = rd("h8-subband-stability.json")
    B = {}

    # §4.1 CO₂-only vs full forcing
    rows = ["| Band | CO₂-only ECS | Full-forcing ECS | Reduction | Ice share of ΔF |", "|---|---:|---:|---:|---:|"]
    for label, key in BANDS5:
        c, f = ff["by_band"][key]["co2_only"]["weighted_mean_K"], ff["by_band"][key]["full"]["weighted_mean_K"]
        ice = ff["by_band"][key]["ice_share_weighted"]
        bold = key in BAND_RANGE
        fcell = f"**{f:.2f} K**" if bold else f"{f:.2f} K"
        rows.append(f"| {label} | {c:.2f} K | {fcell} | {100 * (1 - f / c):.0f}% | {pct(ice)} |")
    c, f = ff["overall_co2only"]["weighted_mean_K"], ff["overall_full"]["weighted_mean_K"]
    rows.append(f"| **Total ΔT-weighted** | **{c:.2f} K** | **{f:.2f} K** | **{100 * (1 - f / c):.0f}%** | — |")
    B["ecs-co2-vs-full"] = rows

    # §4.2 Monte-Carlo by band
    rows = ["| Band | Median ECS (K) | 90% CI | 50% CI |", "|---|:---:|:---:|:---:|"]
    for label, key in [("Obliquity (35–50)", "obliquity (35-50)"), ("100-kyr band", "100-kyr band (75-130)"),
                       ("Precession (18–26)", "precession (18-26)"), ("Long (>130)", "long (>130)")]:
        b = mc["by_band"][key]
        rows.append(f"| {label} | {b['median']:.2f} | [{b['p5']:.2f}, {b['p95']:.2f}] | [{b['p25']:.2f}, {b['p75']:.2f}] |")
    o = mc["overall"]
    rows.append(f"| **Overall ΔT-weighted** | **{o['median']:.2f}** | **[{o['p5']:.2f}, {o['p95']:.2f}]** | **[{o['p25']:.2f}, {o['p75']:.2f}]** |")
    B["ecs-mc"] = rows
    B["ecs-lit"] = ["| Source | Charney (K) | Method |", "|---|:---:|---|",
                    "| IPCC AR6 best | 3.0 | Multi-line synthesis |", "| IPCC AR6 likely range | 2.5 – 4.0 | — |",
                    "| Sherwood et al. 2020 (66% CI) | 2.6 – 3.9 | Bayesian synthesis |", "| Hansen 2013 paleo | 3.0 ± 0.5 | LGM-to-Holocene time-domain |",
                    "| PALAEOSENS / Köhler 2017 | 3.0 – 4.5 | Multi-proxy paleo |",
                    f"| **This work (8H lattice MC)** | **{o['median']:.2f} [{o['p5']:.2f}–{o['p95']:.2f}]** | **8H integer-lattice frequency-domain** |"]

    # §4.3 ice share
    rows = ["| Band | Ice share | Interpretation |", "|---|:---:|---|"]
    for label, key in [("100-kyr (75–130)", "100-kyr band (75-130)"), ("Obliquity (35–50)", "obliquity (35-50)"),
                       ("Precession (18–26)", "precession (18-26)"), ("Long (>130 kyr)", "long (>130)"), ("Short (<18 kyr)", "short (<18)")]:
        share = ff["by_band"][key]["ice_share_weighted"]
        rows.append(f"| {label} | {pct(share)} | {ICE_INTERP[key]} |")
    B["ice-share"] = rows

    # §4.4 cross-method rows (the LR04×κ bootstrap row is prose; Snyder + Cheng are artifact-bound)
    sob = sn["by_band"]["obliquity (35-50 kyr)"]
    full_ob = ff["by_band"]["obliquity (35-50)"]["full"]["weighted_mean_K"]
    shared = cp["shared_top5_n"]
    B["cross-method"] = ["| Cross-check | Result |", "|---|---|",
                         "| LR04 × κ=2.5 → Charney | Bootstrap CI [4.20, 5.05] K under α_slow = 0.5; consistent with full-forcing "
                         f"{ff['overall_full']['weighted_mean_K']:.1f} K at upper edge |",
                         f"| Snyder GAST direct (no κ) | Bootstrap CI [{sob['p5_K']:.2f}, {sob['p95_K']:.2f}] K obliquity-band CO₂-only → drops to {full_ob:.2f} K under full-forcing |",
                         f"| Cheng 2016 cross-proxy | L1 lattice fits Cheng with R² = {cp['cheng_R2_L1']:.2f} (entirely independent chronology + mechanism); "
                         f"{len(shared)}/5 top-5 lines shared with LR04 ({', '.join('n=' + str(n) for n in shared)}) |"]

    # §4.5 per-regime + §4.6 ΔT shift
    def cell(reg, key):
        b = pr[reg]["by_band"][key]
        return b["ecs_weighted_K"], b["ice_share_weighted"], b["amp_T_weighted_K"]
    rows = ["| Band | post-MPT (0–800 kyr) | iNHG-MPT (1000–2000 kyr) | Δ ice-share |", "|---|:---:|:---:|:---:|"]
    for label, key in BANDS3:
        e1, i1, t1 = cell("post_mpt", key); e2, i2, t2 = cell("inhg_mpt", key)
        d = round(100 * i2) - round(100 * i1)
        dcell = f"**+{d} pp ↑ pre-MPT**" if d >= 20 else (f"+{d} pp ↑ pre-MPT" if d >= 5 else f"{d:+d} pp (flat)")
        i2cell = f"ice **{pct(i2)}**" if i2 >= 0.9 else f"ice {pct(i2)}"
        rows.append(f"| {label} | ECS {e1:.2f} K, ice {pct(i1)}, ΔT {t1:.2f} K | ECS {e2:.2f} K, {i2cell}, ΔT {t2:.2f} K | {dcell} |")
    B["per-regime"] = rows
    rows = ["| Band | post-MPT ΔT (K) | iNHG-MPT ΔT (K) | Ratio (post/pre) |", "|---|---:|---:|:---:|"]
    for label, key in [("Obliquity (35–50)", "obliquity (35-50)"), ("100-kyr band", "100-kyr band (75-130)")]:
        t1 = cell("post_mpt", key)[2]; t2 = cell("inhg_mpt", key)[2]
        r = t1 / t2
        rows.append(f"| {label} | {t1:.2f} | {t2:.2f} | {'**' if r > 1.5 else ''}{r:.2f}×{'**' if r > 1.5 else ''} |")
    B["dt-shift"] = rows

    # §4.7 tightened
    fice = band_fice(tg)
    note = {"obliquity (35-50)": "(HIGHER — ice dominates obliquity response)", "100-kyr band (75-130)": "(≈ same as constant)",
            "precession (18-26)": "(LOWER — precession is more SST-driven than ice)"}
    B["tight-fice"] = ["| Band | f_ice (was 0.6 constant) |", "|---|---:|"] + [
        f"| {label} | {'**' if key == 'obliquity (35-50)' else ''}{fice[key]:.2f}{'**' if key == 'obliquity (35-50)' else ''} {note[key]} |"
        for label, key in [("Obliquity (35–50 kyr)", "obliquity (35-50)"), ("100-kyr band", "100-kyr band (75-130)"), ("Precession (18–26 kyr)", "precession (18-26)")]]
    R = tg["regimes"]
    def tcell(reg, key, bold_ecs=False):
        b = R[reg]["by_band"][key]
        e = f"**{b['ecs_weighted_K']:.2f} K**" if bold_ecs else f"{b['ecs_weighted_K']:.2f} K"
        i = f"ice **{pct(b['ice_share_weighted'])}**" if b["ice_share_weighted"] >= 0.75 else f"ice {pct(b['ice_share_weighted'])}"
        return f"{e}, {i}, ΔT {b['amp_T_weighted_K']:.2f} K"
    rows = ["| Band | Post-MPT (0–800 kyr) | iNHG-MPT (1000–2000 kyr) | Pre-iNHG (2700–5300 kyr) |", "|---|:---:|:---:|:---:|"]
    for label, key in BANDS3:
        rows.append(f"| {label} | {tcell('post_mpt', key, key != 'precession (18-26)')} | {tcell('inhg_mpt', key)} | {tcell('pre_inhg', key)} |")
    B["tight-regimes"] = rows
    rows = ["| Band | post-MPT → iNHG-MPT | iNHG-MPT → pre-iNHG | Net (post → pre) |", "|---|:---:|:---:|:---:|"]
    for label, key in BANDS3:
        s = [round(100 * R[r]["by_band"][key]["ice_share_weighted"]) for r in ("post_mpt", "inhg_mpt", "pre_inhg")]
        a, b_, n = s[1] - s[0], s[2] - s[1], s[2] - s[0]
        fmt = lambda v, bold=False: (f"**{v:+d} pp**" if bold else f"{v:+d} pp").replace("+0 pp", "0 pp")
        rows.append(f"| {label} | {fmt(a, key == 'obliquity (35-50)')} | {fmt(b_)} | {fmt(n)} |")
    B["tight-shift"] = rows

    # §4.8 boron
    ref = bo["cenco2pip_reference"]
    pairs = [("Post-MPT obliquity", "post_mpt", "post_mpt_chalk", "obliquity (35-50)", False),
             ("Post-MPT 100-kyr", "post_mpt", "post_mpt_chalk", "100-kyr band (75-130)", False),
             ("iNHG-MPT obliquity", "inhg_mpt_cenco2pip", "inhg_mpt_dyez", "obliquity (35-50)", True),
             ("iNHG-MPT 100-kyr", "inhg_mpt_cenco2pip", "inhg_mpt_dyez", "100-kyr band (75-130)", False),
             ("Pre-iNHG obliquity", "pre_inhg_cenco2pip", "pre_inhg_dyez", "obliquity (35-50)", True),
             ("Pre-iNHG 100-kyr", "pre_inhg_cenco2pip", "pre_inhg_dyez", "100-kyr band (75-130)", False)]
    rows = ["| Regime / Band | CenCO2PIP (§4.7) | Boron (§4.8) | Δ ECS |", "|---|---:|---:|---:|"]
    for label, rk, bk, band, bold in pairs:
        c = ref[rk][band]["ECS"]; b_ = bo["regimes"][bk]["by_band"][band]["ecs_weighted_K"]
        w = (lambda s: f"**{s}**") if bold else (lambda s: s)
        rows.append(f"| {w(label)} | {w(f'{c:.2f} K')} | {w(f'{b_:.2f} K')} | {w(f'{b_ - c:+.2f}')} |")
    B["boron-compare"] = rows
    rows = ["| Source | Window | ECS (K) | 90% CI |", "|---|---|---:|:---:|"]
    for label, key in [("Dyez 2018", "pre_inhg_dyez"), ("de la Vega 2020", "pre_inhg_delavega"), ("Martinez-Boti 2015", "inhg_boundary_mb")]:
        r = bo["regimes"][key]; b_ = r["by_band"]["obliquity (35-50)"]
        rows.append(f"| {label} | {r['window_kyr'][0]:.0f}–{r['window_kyr'][1]:.0f} kyr | {b_['ecs_weighted_K']:.2f} | [{b_['ecs_p5_K']:.1f}, {b_['ecs_p95_K']:.1f}] |")
    B["boron-sources"] = rows

    # Test C-50 (LA2004 nominal, published)
    eightH = pub["constants"]["8H_yr"] / 1000
    rows = ["| n | Period (kyr) | Identity | Mean shift | Max \\|shift\\| |", "|---|---:|---|---:|---:|"]
    summ = {**{int(k): v for k, v in pub["ecc_drift_summary"].items()}, **{int(k): v for k, v in pub["obliq_drift_summary"].items()}}
    for n in [28, 22, 14, 25, 9, 65, 66, 68, 113, 120]:
        if n not in summ: continue
        s = summ[n]; w = (lambda x: f"**{x}**") if n in C50_BOLD else (lambda x: x)
        rows.append(f"| {w(str(n))} | {w(f'{eightH / n:.1f}')} | {w(C50_IDENTITY[n])} | {s['mean_shift_pct']:+.1f}% | {w(f'{s["max_abs_shift_pct"]:.1f}%')} |")
    B["c50-drift"] = rows
    ess = {**{int(k): v for k, v in pub["ecc_drift_summary_essrt"].items()}, **{int(k): v for k, v in pub["obliq_drift_summary_essrt"].items()}}
    rows = ["| n | P at modern (kyr) | Identity | Max \\|shift\\| modern lattice | Max \\|shift\\| proper-physics lattice | Δ |", "|---|---:|---|---:|---:|---:|"]
    for n in [22, 25, 28, 65, 66, 68, 113, 120]:
        if n not in ess or n not in summ: continue
        m, e = summ[n]["max_abs_shift_pct"], ess[n]["max_abs_shift_essrt_pct"]
        w = (lambda x: f"**{x}**") if n in C50_BOLD else (lambda x: x)
        rows.append(f"| {w(str(n))} | {w(f'{eightH / n:.1f}')} | {w(C50_IDENTITY_ESSRT[n])} | {w(f'{m:.1f}%')} | {w(f'{e:.1f}%')} | {w(f'{e - m:+.1f}%')} |")
    B["c50-essrt"] = rows
    ep = pub["ecc_match_by_epoch"]
    B["c50-epoch"] = ["| Epoch | Median match <5% |", "|---|---:|", f"| Modern (>-10 Myr) | {ep['modern_pct']:.1f}% |",
                      f"| Mid (-30 to -10 Myr) | {ep['mid_pct']:.1f}% |", f"| Deep (< -30 Myr) | {ep['deep_pct']:.1f}% |"]

    # Test C-Fib
    sp, mw = fib["spearman_drift_vs_fibonacci_distance"], fib["mann_whitney_near_vs_far"]
    def verdict(p):
        return "Significant" if p < 0.05 else ("Trending, not significant" if p < 0.10 else "Not significant")
    B["cfib-stats"] = ["| Test | Statistic | p-value | Verdict |", "|---|---:|---:|---|",
                       f"| Spearman ρ (drift vs Fib-distance) | {sp['rho']:+.2f} | {sp['p_value']:.3f} | {verdict(sp['p_value'])} |",
                       f"| Mann-Whitney U (near vs far split) | {mw['U_stat']:.0f} | {mw['p_value']:.2f} | {verdict(mw['p_value'])} |"]
    rows = ["| Nearest Fibonacci | n integers | Median drift | Mean drift |", "|---|---:|---:|---:|"]
    for g in FIB_ORDER:
        r = fib["by_fibonacci"][g]; w = (lambda x: f"**{x}**") if g == "H/8 obliquity" else (lambda x: x)
        rows.append(f"| {w(FIB_LABEL[g])} | {w(str(r['n']))} | {w(f'{r["median_pct"]:.1f}%')} | {w(f'{r["mean_pct"]:.1f}%')} |")
    B["cfib-groups"] = rows

    # Test C-H8: rank of every L1 integer inside the scanned n ∈ [40,110]
    ranked = h8["results_sorted_by_stability"]; total = len(ranked)
    rows = ["| L1 n | Period | Rank | Drift | Beat |", "|---:|---:|---:|---:|:---|"]
    for i, r in enumerate(ranked):
        if not r["in_L1_lattice"]: continue
        rank = f"**{i + 1}/{total}**" if i + 1 == total else f"{i + 1}/{total}"
        rows.append(f"| {r['n']} | {r['predicted_period_yr'] / 1000:.1f} kyr | {rank} | {r['max_abs_shift_pct']:.1f}% | {sub(r['nearest_laskar_beat'])} |")
    B["ch8-l1rows"] = rows
    return B


DOC92 = ROOT / "docs" / "92-climate-formula.md"


def blocks92():
    """Doc 92 — the Tier A variance budget and the canonical per-regime R²."""
    vb = rd("milankovitch-8h-variance-budget.json"); cf = rd("milankovitch-climate-formula.json")
    n_ext = len(vb["config"]["extended_integers"]); n_add = n_ext - len(vb["config"]["base_integers"])
    B = {}
    f = vb["lr04_full"]
    steps = [("Baseline (25 integers)", f["a0_baseline_25"]["r2"], f["a0_baseline_25"]["r2"], "L1", "25 canonical doc-55 + Berger-eigenmode beats"),
             (f"+ {n_add} lattice additions → {n_ext} integers", f["a1_extended_31"]["r2"], f["a1_extended_31"]["delta_r2_vs_a0"], "L1+",
              "6 MTM sidebands + n=141 Berger-quintet completion + n=24 Earth H/3 line (regime-admitted)"),
             ("+ 405-kyr (deployed L2)", f["a2_plus_405k"]["r2"], f["a2_plus_405k"]["delta_r2_vs_a1"], "L2", "Silicate-weathering thermostat fundamental"),
             ("+ 13H (investigated, NOT deployed)", f["a3_plus_13h"]["r2"], f["a3_plus_13h"]["delta_r2_vs_a2"], "L2-investigated", "Tier-A jump rejected by R3-4 stability test"),
             ("+ 9-Myr (investigated, NOT deployed)", f["a4_plus_9m"]["r2"], f["a4_plus_9m"]["delta_r2_vs_a3"], "L2-investigated", "Promoted-but-not-deployed (§3.3)")]
    rows = ["| Component | Cumulative R² | ΔR² (this step) | Layer | Notes |", "|-----------|---------------|-----------------|-------|-------|"]
    for i, (label, r2, d, layer, note) in enumerate(steps):
        rows.append(f"| {label} | {r2:.4f} | {d:.4f} | {layer} | {note} |" if i == 0 else f"| {label} | {r2:.4f} | {d:+.4f} | {layer} | {note} |")
    B["tierA-budget"] = rows
    rows = [f"| Regime | Window | L1 (25) | L1 ({n_ext}) | + full L2 stack |", "|---|---|---:|---:|---:|"]
    for label, key, bold_l2 in [("pre-MPT", "lr04_pre_mpt", False), ("post-MPT", "lr04_post_mpt", True)]:
        r = vb[key]; w = r["summary"]["window_kyr"]; l2 = f"{r['a4_plus_9m']['r2']:.4f}"
        rows.append(f"| {label} | {w[0]:.0f}–{w[1]:.0f} kyr | {r['a0_baseline_25']['r2']:.4f} | **{r['a1_extended_31']['r2']:.4f}** | {'**' + l2 + '**' if bold_l2 else l2} |")
    B["tierA-regimes"] = rows
    rf = cf["regime_fits"]
    B["canonical-r2"] = ["| Regime / record | R² |", "|---|---:|",
                         f"| full LR04 (L1+L2+L3) | **{rf['lr04-full']['r2_l1_l2_l3']:.4f}** |",
                         f"| post-MPT (0–1 Myr) L1+L2+L3 | **{rf['post-mpt']['r2_l1_l2_l3']:.4f}** |",
                         f"| iNHG-MPT (1.0–2.7 Ma) L1+L2+L3 | **{rf['inhg-mpt']['r2_l1_l2_l3']:.4f}** |",
                         f"| pre-iNHG (2.7–5.32 Ma) L1+L2+L3 | **{rf['pre-inhg']['r2_l1_l2_l3']:.4f}** |"]
    return B


def apply(doc, B, check):
    text = doc.read_text()
    changed = []
    for bid, rows in B.items():
        pat = re.compile(rf"(<!-- generated:{re.escape(bid)} -->\n)(.*?)(\n<!-- /generated:{re.escape(bid)} -->)", re.S)
        m = pat.search(text)
        if not m:
            print(f"  MISSING block markers for {bid} in {doc.name}", file=sys.stderr); sys.exit(2)
        body = "\n".join(rows)
        if m.group(2) != body:
            changed.append(bid)
            text = text[:m.start(2)] + body + text[m.end(2):]
    if not check and changed:
        doc.write_text(text)
    return changed


def main():
    check = "--check" in sys.argv
    stale = []
    for doc, B in ((DOC, blocks()), (DOC92, blocks92())):
        changed = apply(doc, B, check)
        if check:
            stale += [f"{doc.name}:{c}" for c in changed]
        else:
            print(f"{doc.name}: {len(changed)} block(s) rewritten ({', '.join(changed) or 'none'}); {len(B)} generated blocks.")
    if check:
        if stale:
            print(f"STALE — generated blocks differ from the artifacts: {', '.join(stale)}"); sys.exit(1)
        print("PASS — generated tables (docs 92, 97) match the artifacts.")


if __name__ == "__main__":
    main()
