#!/usr/bin/env python3
"""
Generate the numeric tables of doc 92 from their artifacts. The doc's prose
is hand-written; every table that reports a measurement lives between

    <!-- generated:<id> -->
    ...table...
    <!-- /generated:<id> -->

and is OWNED by this script. Run after the variance-budget or climate-formula
generators: the tables then follow the artifacts instead of drifting as
literals. (The script keeps its historical name: it once also generated the
tables of doc 97, which is archived; its doc 97 blocks are gone with it.)

    python3 scripts/generate_doc97_tables.py          # rewrite the blocks
    python3 scripts/generate_doc97_tables.py --check  # exit 1 if any block is stale
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOC92 = ROOT / "docs" / "92-climate-formula.md"


def rd(name):
    txt = (DATA / name).read_text()
    txt = re.sub(r"\bInfinity\b", "1e308", txt)
    txt = re.sub(r"\bNaN\b", "null", txt)
    return json.loads(txt)


def blocks92():
    """Doc 92 — the Tier A variance budget and the canonical per-regime R²."""
    vb = rd("milankovitch-8h-variance-budget.json"); cf = rd("milankovitch-climate-formula.json")
    n_ext = len(vb["config"]["extended_integers"]); n_add = n_ext - len(vb["config"]["base_integers"])
    B = {}
    f = vb["lr04_full"]
    steps = [("Baseline (25 integers)", f["a0_baseline_25"]["r2"], f["a0_baseline_25"]["r2"], "L1", "25 canonical planet-cycle + Berger-eigenmode beats"),
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
    for doc, B in ((DOC92, blocks92()),):
        changed = apply(doc, B, check)
        if check:
            stale += [f"{doc.name}:{c}" for c in changed]
        else:
            print(f"{doc.name}: {len(changed)} block(s) rewritten ({', '.join(changed) or 'none'}); {len(B)} generated blocks.")
    if check:
        if stale:
            print(f"STALE — generated blocks differ from the artifacts: {', '.join(stale)}"); sys.exit(1)
        print("PASS — generated tables (doc 92) match the artifacts.")


if __name__ == "__main__":
    main()
