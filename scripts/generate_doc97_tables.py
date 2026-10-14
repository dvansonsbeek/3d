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
    """Doc 92 — the canonical per-regime R². (Plan 09 step 7e: the comb-era Tier A
    variance-budget blocks `tierA-budget` / `tierA-regimes` left with their script
    and artifact; doc 109 §22 keeps their headline numbers.)"""
    cf = rd("milankovitch-climate-formula.json")
    B = {}
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
