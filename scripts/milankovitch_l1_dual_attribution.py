#!/usr/bin/env python3
"""
TRIPLE ATTRIBUTION — all 32 L1 lattice components attributed in three columns:
  Column 1: Standard Berger / secular-theory label (from canonical JSON).
  Column 2: Solar-system resonance — family-level matches (direct, g-beat,
            s-beat, k+g, k+s, 2|g|, 2|s|). May or may not include Earth;
            covers planet-planet resonances that still force Earth's climate.
            (Identical logic to milankovitch_forward_prediction_tweaked.py.)
  Column 3: Earth-planet best — best Earth-bearing beat from full
            element-element search, scored by physical plausibility.

Why both columns 2 and 3:
  The solar system resonates as a whole — pure planet-planet (g_i − g_j)
  beats can drive Earth's eccentricity even with no explicit Earth term,
  via secular orbital coupling. Column 2 captures these. Column 3 captures
  the cleaner "Earth's k axis modulated by a specific planet's element"
  picture. Both are legitimate; they answer different questions.

Physical-plausibility ranking (Column 3 only):
  Mass weight (gravitational coupling strength for Earth):
    Jupiter 10 > Saturn 7 > Venus 6 > Mars 4 > Mercury 3 > Uranus 2 > Neptune 2
  Element weight (climate-coupling relevance):
    Axial 10 > Obliq 9 > Ecc 7 > Peri_ecl 5 > ICRF 4 > AscNode 3
  Hard requirement: ≥1 Earth term AND ≥1 non-Earth term (Earth-planet structure)
  Preferences:  k-anchor +8, single-Earth (vs Earth-Earth) +10, 2-term > 3-term (-15), sum > diff (-2)

Also reports LR04 4σ peak coverage (Column 2 only — Column 3 only triggers
on the L1 lattice integers, since the Earth-planet search is restricted to
those by the formula's design).

Run:  python3 scripts/milankovitch_l1_dual_attribution.py
"""

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
FORMULA_JSON = DATA_DIR / "milankovitch-climate-formula.json"
SPEC_JSON = DATA_DIR / "milankovitch-8h-divisor-spectrum.json"
OUT_PATH = DATA_DIR / "milankovitch-l1-dual-attribution.json"

H = 335.317
EIGHT_H = 8 * H

# ─────────────────────────────────────────────────────────────────────────
# PLANET_CYCLES — current canonical state (matches public/input/model-parameters.json)
# ─────────────────────────────────────────────────────────────────────────

PLANET_CYCLES = {
    "Mercury": {"Axial":   9, "Peri_ecl": 11, "ICRF":  93, "AscNode":  9, "Obliq":   3, "Ecc":  84},
    "Venus":   {"Axial":  91, "Peri_ecl":  6, "ICRF": 110, "AscNode":  1, "Obliq": 110, "Ecc":  19},
    "Earth":   {"Axial": 104, "Peri_ecl":128, "ICRF":  24, "AscNode": 40, "Obliq":  64, "Ecc": 128},
    "Mars":    {"Axial":  16, "Peri_ecl": 36, "ICRF":  68, "AscNode": 64, "Obliq":  21, "Ecc":  52},
    "Jupiter": {"Axial":  21, "Peri_ecl": 39, "ICRF":  65, "AscNode": 36, "Obliq":  16, "Ecc":  44},
    "Saturn":  {"Axial":   6, "Peri_ecl": 65, "ICRF": 169, "AscNode": 36, "Obliq":  24, "Ecc": 163},
    "Uranus":  {"Axial":   0, "Peri_ecl": 24, "ICRF":  80, "AscNode": 11, "Obliq":  16, "Ecc":  80},
    "Neptune": {"Axial":   0, "Peri_ecl":  4, "ICRF": 100, "AscNode":  3, "Obliq": 100, "Ecc": 100},
}

MASS_WEIGHT = {
    "Jupiter": 10, "Saturn": 7, "Venus": 6, "Mars": 4,
    "Mercury": 3, "Uranus": 2, "Neptune": 2, "Earth": 0,   # Earth handled via +8 bonus
}
ELEMENT_WEIGHT = {
    "Axial": 10, "Obliq": 9, "Ecc": 7, "Peri_ecl": 5,
    "ICRF": 4, "AscNode": 3,
}
EARTH_BONUS = 8


# ── Family-level prediction (Column 2 — solar-system resonance) ──
# Same logic as scripts/milankovitch_forward_prediction_tweaked.py
DIRECT_CYCLES = ["Axial", "Peri_ecl", "AscNode", "Obliq", "Ecc"]
N_MIN, N_MAX = 5, 200


def predict_all_families(cycles_table):
    """Return dict {n -> [(family, source), ...]} for all 7 standard families."""
    from collections import defaultdict
    preds = defaultdict(list)

    # Direct (single divisor)
    for planet, cycles in cycles_table.items():
        for cycle in DIRECT_CYCLES:
            N = cycles.get(cycle, 0)
            if N == 0:
                continue
            if N_MIN <= N <= N_MAX:
                preds[N].append(("direct", f"{planet}.{cycle}"))

    # g-beat (Peri_ecl ± Peri_ecl)
    peris = [(p, c["Peri_ecl"]) for p, c in cycles_table.items() if c["Peri_ecl"] > 0]
    for i in range(len(peris)):
        pa, Na = peris[i]
        for j in range(i + 1, len(peris)):
            pb, Nb = peris[j]
            for kind, val in [("sum", Na + Nb), ("diff", abs(Na - Nb))]:
                if val == 0 or not (N_MIN <= val <= N_MAX):
                    continue
                preds[val].append(("g-beat",
                                   f"{pa}({Na}){'+' if kind=='sum' else '-'}{pb}({Nb})"))

    # s-beat (AscNode ± AscNode)
    nodes = [(p, c["AscNode"]) for p, c in cycles_table.items() if c["AscNode"] > 0]
    for i in range(len(nodes)):
        pa, Na = nodes[i]
        for j in range(i + 1, len(nodes)):
            pb, Nb = nodes[j]
            for kind, val in [("sum", Na + Nb), ("diff", abs(Na - Nb))]:
                if val == 0 or not (N_MIN <= val <= N_MAX):
                    continue
                preds[val].append(("s-beat",
                                   f"{pa}({Na}){'+' if kind=='sum' else '-'}{pb}({Nb})"))

    # k+g (Earth.Axial ± Peri_ecl)
    k = cycles_table["Earth"]["Axial"]
    for planet, N in peris:
        for kind, val in [("k+g", k + N), ("k-g", abs(k - N))]:
            if val == 0 or not (N_MIN <= val <= N_MAX):
                continue
            preds[val].append(("k+g", f"k{'+' if kind=='k+g' else '-'}{planet}.Peri_ecl({N})"))

    # k+s (Earth.Axial ± AscNode)
    for planet, N in nodes:
        for kind, val in [("k+s", k + N), ("k-s", abs(k - N))]:
            if val == 0 or not (N_MIN <= val <= N_MAX):
                continue
            preds[val].append(("k+s", f"k{'+' if kind=='k+s' else '-'}{planet}.AscNode({N})"))

    # 2|g| and 2|s|
    for planet, N in peris:
        val = 2 * N
        if N_MIN <= val <= N_MAX:
            preds[val].append(("2|g|", f"2*{planet}.Peri_ecl({N})"))
    for planet, N in nodes:
        val = 2 * N
        if N_MIN <= val <= N_MAX:
            preds[val].append(("2|s|", f"2*{planet}.AscNode({N})"))

    return dict(preds)


# ── Earth-planet attribution scoring (Column 3) ──
def term_score(planet, element):
    """Score one (planet, element) term — mass + element only, NO Earth bonus here."""
    return MASS_WEIGHT.get(planet, 0) + ELEMENT_WEIGHT.get(element, 0)


def combo_score(terms, signs):
    """Score a multi-term combination — must be Earth–planet structure.
       terms: list of (planet, element, n)
       signs: list of +1/-1 corresponding to each term
    """
    if len(terms) == 0:
        return -1e9
    earth_terms = [t for t in terms if t[0] == "Earth"]
    nonearth_terms = [t for t in terms if t[0] != "Earth"]
    n_earth, n_nonearth = len(earth_terms), len(nonearth_terms)

    # HARD requirement: must be Earth + at least one planet (i.e. ≥1 Earth AND ≥1 non-Earth)
    if n_earth == 0 or n_nonearth == 0:
        return -1e9

    s = sum(term_score(p, e) for p, e, _ in terms)
    # Single Earth term is ideal (Earth-planet, not Earth-Earth-planet)
    if n_earth >= 2:
        s -= 10
    # k-anchor bonus: Earth.Axial is the canonical climatic-precession carrier
    if any((p, e) == ("Earth", "Axial") for p, e, _ in terms):
        s += 8
    # Simplicity: 2-term strongly preferred over 3-term
    if len(terms) == 3:
        s -= 15
    # Sums slightly preferred over differences (constructive beat)
    if any(sg < 0 for sg in signs):
        s -= 2
    else:
        s += 1
    return s


def find_combos(target_n):
    """Find all 1-term (direct), 2-term and 3-term combos = target_n.
    Returns list of dicts: {kind, terms, signs, score, label}.
    """
    cycles = []
    for planet, elems in PLANET_CYCLES.items():
        for elem, n in elems.items():
            if n > 0:
                cycles.append((planet, elem, n))

    results = []

    # NOTE: 1-term direct skipped — does not satisfy "Earth–planet beat" requirement.
    # A direct match (e.g. Mars.Axial = 8H/16) is captured in the Berger column when
    # applicable; here we want Earth's response to a planet's forcing.

    # 2-term sums and differences
    for i in range(len(cycles)):
        for j in range(i, len(cycles)):
            p1, e1, n1 = cycles[i]
            p2, e2, n2 = cycles[j]
            if (p1, e1) == (p2, e2):
                continue
            if n1 + n2 == target_n:
                t = [(p1, e1, n1), (p2, e2, n2)]
                sg = [+1, +1]
                results.append({
                    "kind": "2-term sum",
                    "terms": t, "signs": sg,
                    "score": combo_score(t, sg),
                    "label": f"{p1}.{e1}({n1}) + {p2}.{e2}({n2})",
                })
            if n1 - n2 == target_n:
                t = [(p1, e1, n1), (p2, e2, n2)]
                sg = [+1, -1]
                results.append({
                    "kind": "2-term diff",
                    "terms": t, "signs": sg,
                    "score": combo_score(t, sg),
                    "label": f"{p1}.{e1}({n1}) - {p2}.{e2}({n2})",
                })
            if n2 - n1 == target_n:
                t = [(p1, e1, n1), (p2, e2, n2)]
                sg = [-1, +1]
                results.append({
                    "kind": "2-term diff",
                    "terms": t, "signs": sg,
                    "score": combo_score(t, sg),
                    "label": f"{p2}.{e2}({n2}) - {p1}.{e1}({n1})",
                })

    # 3-term — only with at least one Earth-Axial anchor (climatic precession form)
    earth_anchors = [(p, e, n) for p, e, n in cycles
                     if p == "Earth" and e in ("Axial", "Obliq")]
    for pa, ea, na in earth_anchors:
        for i in range(len(cycles)):
            for j in range(i, len(cycles)):
                p1, e1, n1 = cycles[i]
                p2, e2, n2 = cycles[j]
                if (p1, e1) == (pa, ea) or (p2, e2) == (pa, ea):
                    continue
                for s1 in (+1, -1):
                    for s2 in (+1, -1):
                        v = na + s1 * n1 + s2 * n2
                        if v == target_n:
                            t = [(pa, ea, na), (p1, e1, n1), (p2, e2, n2)]
                            sg = [+1, s1, s2]
                            label = (f"{pa}.{ea}({na}) "
                                     f"{'+' if s1>0 else '-'} {p1}.{e1}({n1}) "
                                     f"{'+' if s2>0 else '-'} {p2}.{e2}({n2})")
                            results.append({
                                "kind": "3-term",
                                "terms": t, "signs": sg,
                                "score": combo_score(t, sg),
                                "label": label,
                            })

    # de-dup labels keeping the highest scoring
    by_label = {}
    for r in results:
        L = r["label"]
        if L not in by_label or r["score"] > by_label[L]["score"]:
            by_label[L] = r
    final = sorted(by_label.values(), key=lambda x: -x["score"])
    return final


def main():
    DOC_PATH = SCRIPT_DIR.parent / "docs" / "93-l1-attribution-reference.md"

    formula = json.loads(FORMULA_JSON.read_text())
    spec = json.loads(SPEC_JSON.read_text())
    L1 = formula["post_mpt_formula"]["L1_coefficients"]
    lr04 = {p["n"]: p for p in spec["results"]["LR04 full"]["peaks"]}
    family_preds = predict_all_families(PLANET_CYCLES)

    print("=" * 130)
    print("L1 LATTICE TRIPLE ATTRIBUTION")
    print("=" * 130)
    print()

    rows = []
    for n_str in sorted(L1.keys(), key=int):
        n = int(n_str)
        entry = L1[n_str]
        period = EIGHT_H / n
        amp = entry["amp"]
        berger_label = entry["label"]
        lr04_4sig = n in lr04

        combos = find_combos(n)
        best = combos[0] if combos else None
        fams = family_preds.get(n, [])

        rows.append({
            "n": n,
            "period_kyr": period,
            "amp": amp,
            "lr04_4sigma": lr04_4sig,
            "berger_label": berger_label,
            "families": fams,
            "n_families": len(set(f for f, _ in fams)),
            "our_best": best,
            "all_combos": combos,  # full ranked list — nothing dropped
        })

    # ── Main table — three columns ──
    print(f"{'n':>4} {'T(kyr)':>8} {'amp':>7} {'4σ':>3}  "
          f"{'Berger / secular':<45}  "
          f"{'Solar-system families (count, first 2)':<46}  "
          f"{'Earth-planet best'}")
    print(f"{'-'*4} {'-'*8} {'-'*7} {'-'*3}  {'-'*45}  {'-'*46}  {'-'*45}")

    n_unmatched_ep = 0
    n_unmatched_family = 0
    for r in rows:
        n = r["n"]
        sig = "yes" if r["lr04_4sigma"] else "-"
        b = r["berger_label"]
        if len(b) > 44: b = b[:41] + "..."
        # Family column
        if r["families"]:
            fam_names = sorted(set(f for f, _ in r["families"]))
            first2 = " | ".join(f"[{f}]{s}" for f, s in r["families"][:2])
            if len(r["families"]) > 2:
                first2 += f" (+{len(r['families'])-2})"
            if len(first2) > 45: first2 = first2[:42] + "..."
            fam_col = f"{r['n_families']}fam: {first2}"
        else:
            fam_col = "(no family match)"
            n_unmatched_family += 1
        if len(fam_col) > 46: fam_col = fam_col[:43] + "..."
        # Earth-planet column
        o = r["our_best"]
        if o:
            ours = f"[{o['kind']}] {o['label']}  (s={o['score']})"
        else:
            ours = "(no Earth-planet match)"
            n_unmatched_ep += 1
        print(f"{n:>4} {r['period_kyr']:>8.3f} {r['amp']:>7.4f} {sig:>3}  "
              f"{b:<45}  {fam_col:<46}  {ours}")
    print()

    # ── LR04 4σ coverage check (Column 2 logic, like original script) ──
    print("─" * 130)
    print("LR04 4σ PEAK COVERAGE — solar-system families (replicates original forward_prediction_tweaked.py check)")
    print("─" * 130)
    observed_4sigma = set(lr04.keys())
    family_hits = sum(1 for n in observed_4sigma if n in family_preds)
    ep_hits = sum(1 for r in rows if r["lr04_4sigma"] and r["our_best"])
    family_gaps = sorted(n for n in observed_4sigma if n not in family_preds)
    print(f"  Total LR04 4σ peaks:                 {len(observed_4sigma)}")
    print(f"  Covered by solar-system families:    {family_hits} / {len(observed_4sigma)}")
    print(f"  Covered by Earth-planet attribution: {ep_hits} / {len([r for r in rows if r['lr04_4sigma']])} (among L1 lattice 4σ peaks)")
    if family_gaps:
        print(f"  Solar-system family GAPS: {family_gaps}")
    else:
        print("  No solar-system family gaps — all 4σ peaks covered.")
    print()

    # ── Family-level breakdown ──
    print("─" * 130)
    print("FAMILY-LEVEL 4σ COVERAGE BREAKDOWN (which family explains which peak)")
    print("─" * 130)
    print(f"{'Family':<10}  {'4σ peaks hit':>12}")
    for fam in ["direct", "g-beat", "s-beat", "k+g", "k+s", "2|g|", "2|s|"]:
        hits = sum(1 for n in observed_4sigma
                   if any(f == fam for f, _ in family_preds.get(n, [])))
        print(f"{fam:<10}  {hits:>12}")
    print()

    # ── L1 lattice summary ──
    print("─" * 130)
    print("L1 LATTICE ATTRIBUTION SUMMARY")
    print("─" * 130)
    n_total = len(rows)
    print(f"  Total L1 lattice components:                  {n_total}")
    print(f"  With solar-system family attribution:         {n_total - n_unmatched_family} / {n_total}")
    print(f"  With Earth-planet attribution:                {n_total - n_unmatched_ep} / {n_total}")
    print()

    # ── Where our attribution clearly DIVERGES from Berger ──
    print("─" * 110)
    print("WHERE OUR ATTRIBUTION DIVERGES FROM BERGER (different physical mechanism)")
    print("─" * 110)
    print("These warrant updated descriptions in the JSON + documentation:")
    print()
    for r in rows:
        if not r["our_best"]:
            continue
        b = r["berger_label"].lower()
        ours = r["our_best"]["label"].lower()
        # heuristic divergence flag: Berger names a planet not present in our top combo
        berger_planets = []
        for kw in ["mercury","venus","earth","mars","jupiter","saturn","uranus","neptune"]:
            if kw in b:
                berger_planets.append(kw)
        our_planets = [p for p, _, _ in r["our_best"]["terms"]]
        our_planet_lc = [p.lower() for p in our_planets]
        if berger_planets and not any(bp in our_planet_lc for bp in berger_planets):
            print(f"  n={r['n']:>3}  T={r['period_kyr']:.2f}  amp={r['amp']:.4f}")
            print(f"        Berger:    {r['berger_label']}")
            print(f"        Our model: {r['our_best']['label']}  (score={r['our_best']['score']})")
            print()

    # ── JSON output ──
    out = {
        "meta": {
            "script": "milankovitch_l1_dual_attribution.py",
            "H_kyr": H, "EIGHT_H_kyr": EIGHT_H,
            "scoring_earth_planet": {
                "mass_weight": MASS_WEIGHT,
                "element_weight": ELEMENT_WEIGHT,
                "k_anchor_bonus": 8,
                "single_earth_bonus": 10,
                "three_term_penalty": -15,
                "sum_bonus": 1,
                "diff_penalty": -2,
                "hard_requirement": "≥1 Earth term AND ≥1 non-Earth term",
            },
        },
        "planet_cycles": PLANET_CYCLES,
        "rows": [
            {
                "n": r["n"],
                "period_kyr": r["period_kyr"],
                "amp_normalized": r["amp"],
                "lr04_4sigma": r["lr04_4sigma"],
                "berger_label": r["berger_label"],
                "solar_system_families": [
                    {"family": f, "source": s} for f, s in r["families"]
                ],
                "n_families": r["n_families"],
                "our_best_earth_planet": r["our_best"],
                "all_earth_planet_combos": r["all_combos"],
            }
            for r in rows
        ],
    }
    OUT_PATH.write_text(json.dumps(out, indent=2, default=str))
    print(f"[saved] {OUT_PATH}")

    # ── Write the markdown reference document (top 5 per integer) ──
    write_reference_doc(rows, DOC_PATH)


# ─────────────────────────────────────────────────────────────────────────
# Markdown reference document generator
# ─────────────────────────────────────────────────────────────────────────


def fmt_combo(c):
    """Render a single combo as a compact label."""
    kind = c["kind"]
    return f"`[{kind}]` {c['label']}  · score = {c['score']}"


# ── 3-step divergence analysis ──
#   Step 1: Does Berger predict this peak from secular theory?
#           (Look for g_i, s_i, k+g, k+s patterns — not just "Mars Axial = 8H/n")
#   Step 2: Planet match — does Berger name a planet our combo doesn't?
#   Step 3: Mechanism match — same element-type structure (k+g vs k+obliq etc.)?

PLANET_KW = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]

# Secular frequency index → planet mapping (Laskar / Bretagnon convention)
SECULAR_INDEX_TO_PLANET = {
    "1": "mercury", "2": "venus", "3": "earth", "4": "mars",
    "5": "jupiter", "6": "saturn", "7": "uranus", "8": "neptune",
}

# Map Unicode subscript digits → ASCII digit
SUBSCRIPT_DIGITS = {"₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8"}


def berger_predicts(berger_label):
    """Step 1: True if Berger secular theory predicts this peak.

    Heuristic: label contains g_i, s_i, k+g, k+s, k-g, k-s, 2|g, 2|s patterns.
    "Mars Axial = 8H/16" alone counts as 'direct framework only', not Berger.
    """
    bl = berger_label.lower()
    secular_markers = [
        "g₁", "g₂", "g₃", "g₄", "g₅", "g₆", "g₇", "g₈",
        "s₁", "s₂", "s₃", "s₄", "s₅", "s₆", "s₇", "s₈",
        "k+g", "k-g", "k+s", "k-s", "2|g", "2|s",
    ]
    return any(m in bl for m in secular_markers)


def berger_planets(berger_label):
    """Return the full set of planets Berger names — by surface keyword OR by secular index."""
    bl = berger_label.lower()
    planets = {kw for kw in PLANET_KW if kw in bl}
    # Decode subscript indices: g₂, s₃, k+g₅, k-s₄, etc.
    i = 0
    while i < len(berger_label):
        ch = berger_label[i]
        if ch in ("g", "s", "G", "S") and i + 1 < len(berger_label):
            nxt = berger_label[i + 1]
            if nxt in SUBSCRIPT_DIGITS:
                planets.add(SECULAR_INDEX_TO_PLANET[SUBSCRIPT_DIGITS[nxt]])
        i += 1
    return planets


def berger_mechanism(berger_label):
    """Classify Berger's mechanism by surface pattern."""
    bl = berger_label.lower()
    # Accept both ASCII '-' and Unicode minus '−' (U+2212) as the beat operator
    has_minus = ("-" in berger_label) or ("−" in berger_label)
    if "k+g" in bl or "k-g" in bl or "k−g" in bl: return "k+g"
    if "k+s" in bl or "k-s" in bl or "k−s" in bl: return "k+s"
    if "2|g" in bl: return "2|g|"
    if "2|s" in bl: return "2|s|"
    if any(g in bl for g in ["g₁","g₂","g₃","g₄","g₅","g₆","g₇","g₈"]) and has_minus:
        return "g-beat"
    if any(s in bl for s in ["s₁","s₂","s₃","s₄","s₅","s₆","s₇","s₈"]) and has_minus:
        return "s-beat"
    return "direct"


def our_mechanism(best_combo):
    """Classify our top combo by element-type structure.
       Returns string like 'k+obliq', 'k+peri_ecl', 'k+axial', etc.
    """
    if best_combo is None:
        return None
    terms = best_combo["terms"]
    # Earth.Axial anchor (k)?
    has_k = any((p, e) == ("Earth", "Axial") for p, e, _ in terms)
    non_anchor = [(p, e) for p, e, _ in terms if (p, e) != ("Earth", "Axial")]
    if has_k and len(terms) == 2:
        _, e2 = non_anchor[0]
        return {"Peri_ecl": "k+g", "AscNode": "k+s",
                "Obliq": "k+obliq", "Axial": "k+axial",
                "Ecc": "k+ecc", "ICRF": "k+ICRF"}.get(e2, "k+other")
    if has_k and len(terms) == 3:
        # 3-term: classify by the two non-anchor element types
        elts = sorted([e for _, e in non_anchor])
        return f"k + ({elts[0]}, {elts[1]})"
    # Non-Earth.Axial-anchored
    return "non-k"


def divergence_status(berger_label, best_combo):
    """Returns one of:
       'no_berger'          — Berger has no secular prediction (Step 1 fails)
       'planet_diverge'     — Berger names a planet our combo doesn't (Step 2)
       'mechanism_diverge'  — same planet, different mechanism (Step 3)
       'agree'              — planet AND mechanism match
    """
    if not berger_predicts(berger_label):
        return "no_berger"
    if best_combo is None:
        return "no_berger"
    # Compare non-Earth planet sets via symmetric difference.
    # Berger naming only Earth + we naming Earth+Jupiter = divergence (Jupiter not in Berger).
    # Berger naming Earth+Venus + we naming Earth+Jupiter = divergence (different non-Earth planets).
    b_nonearth = berger_planets(berger_label) - {"earth"}
    o_nonearth = {p.lower() for p, _, _ in best_combo["terms"]} - {"earth"}
    if b_nonearth.symmetric_difference(o_nonearth):
        return "planet_diverge"
    # Step 3: mechanism comparison
    bm = berger_mechanism(berger_label)
    om = our_mechanism(best_combo)
    if om and bm in om:  # loose match: k+g ⊂ "k + (Peri_ecl, ...)" or exact "k+g"
        return "agree"
    if bm == om:
        return "agree"
    # Otherwise, planets match but mechanism doesn't
    return "mechanism_diverge"


STATUS_LABEL = {
    "no_berger":         "(no Berger)",
    "planet_diverge":    "**PLANET ≠**",
    "mechanism_diverge": "**MECH ≠**",
    "agree":             "agree",
}


def write_reference_doc(rows, DOC_PATH):
    lines = []
    lines.append("# L1 Lattice Attribution Reference — Berger vs Our Model")
    lines.append("")
    lines.append("> **One entry per L1 lattice integer.** For each integer this doc lists "
                 "(a) the standard Berger / secular-theory attribution, "
                 "(b) all solar-system family matches (planet-planet beats), and "
                 "(c) the top-5 Earth-planet beat candidates ranked by physical plausibility "
                 "(Jupiter > smaller planets; Axial/Obliq > other elements; 2-term > 3-term; "
                 "Earth-bearing required). The complete ranked list (often 20+ combos for some n) "
                 "is preserved in the companion JSON.")
    lines.append("")
    lines.append("**Generated by:** [`scripts/milankovitch_l1_dual_attribution.py`]"
                 "(../scripts/milankovitch_l1_dual_attribution.py)")
    lines.append("")
    lines.append("**PLANET_CYCLES used:** the current canonical state (matches "
                 "`public/input/model-parameters.json` and `src/script.js`).")
    lines.append("")

    # ── Scope note: where L1 ends and L2/L3 begin ──
    lines.append("## Scope — this doc covers L1 only (32 of 41 formula components)")
    lines.append("")
    lines.append("The canonical climate formula has **three layers** totalling **41 components**:")
    lines.append("")
    lines.append("| Layer | Count | Nature | Attribution framework | Where documented |")
    lines.append("|-------|------:|--------|------------------------|-------------------|")
    lines.append("| **L1** | 32 | Orbital lattice — integer divisors of 8H | Berger secular theory **vs** Earth-planet beat (this doc) | doc 93 (here) |")
    lines.append("| **L2** | 3 | Off-lattice carbon thermostat (405, 202, 135 kyr) | Silicate-weathering / carbon-cycle internal resonance — **NOT** orbital beats | [doc 92 §3](92-climate-formula.md) |")
    lines.append("| **L3** | 6 | Heaviside step components (PETM, EOT, Mi-1, MMCT, iNHG, MPT) | Tectonic / cryosphere regime shifts — **NOT** periodic | [doc 92 §4](92-climate-formula.md) |")
    lines.append("| **Total** | **41** | | | |")
    lines.append("")
    lines.append("**Why L2 and L3 are excluded from this doc:** the Earth-planet beat search "
                 "assumes orbital integer-divisor structure. L2 is off-lattice (405 kyr is not a "
                 "divisor of 8H = 2,682,536 yr) and arises from carbon-cycle internal resonance, "
                 "not orbital forcing directly. L3 is non-periodic — boundary-condition step shifts "
                 "at known Cenozoic transitions. Different mechanism class, different attribution.")
    lines.append("")
    lines.append("**The n=7 LR04 4σ peak is L2's shadow, not L1.** The LR04 full-record spectrum "
                 "has a 4σ peak at T = 383.22 kyr (= 8H/7). The well-established 405-kyr "
                 "eccentricity line sits 21.8 kyr away and is **off the 8H lattice** — its spectral "
                 "energy leaks into the nearest lattice bin (n=7), which the divisor-spectrum then "
                 "detects but classifies as \"Unpredicted\" (no family-level beat predicts 383 kyr "
                 "exactly). Including n=7 in L1 would double-count with L2. It is correctly "
                 "excluded from the canonical L1 list of 32 integers.")
    lines.append("")
    lines.append("So the 32 components in this doc are the complete L1 set. For L2 + L3 "
                 "attribution, see [doc 92](92-climate-formula.md).")
    lines.append("")

    # ── Summary table ──
    lines.append("## Summary table — Berger vs our model top-1, with 3-step status")
    lines.append("")
    lines.append("**3-step status classification:**")
    lines.append("1. **(no Berger)** — Berger / secular theory does not predict this peak; "
                 "the framework label is direct-divisor only (e.g. \"Mars Axial = 8H/16\").")
    lines.append("2. **PLANET ≠** — Berger predicts the peak but names a different non-Earth planet "
                 "than our top-1 combo.")
    lines.append("3. **MECH ≠** — Same planet, but Berger's mechanism (k+g / k+s / g-beat / etc.) "
                 "differs from our combo's element-type structure.")
    lines.append("4. **agree** — Berger predicts it AND our top-1 names the same planet AND uses "
                 "the same mechanism.")
    lines.append("")
    lines.append("| n | T (kyr) | amp | LR04 4σ | Berger / secular | Our model top-1 | 3-step status |")
    lines.append("|---|--------:|----:|:-------:|------------------|-----------------|:-------------:|")
    status_counts = {"agree": 0, "mechanism_diverge": 0, "planet_diverge": 0, "no_berger": 0}
    for r in rows:
        b = r["berger_label"]
        if len(b) > 60:
            b = b[:57] + "..."
        if r["our_best"]:
            ours = f"`[{r['our_best']['kind']}]` {r['our_best']['label']}"
        else:
            ours = "—"
        status = divergence_status(r["berger_label"], r["our_best"])
        status_counts[status] += 1
        sig = "✓" if r["lr04_4sigma"] else ""
        lines.append(f"| {r['n']} | {r['period_kyr']:.3f} | {r['amp']:.4f} | {sig} | "
                     f"{b} | {ours} | {STATUS_LABEL[status]} |")
    lines.append("")
    lines.append("**Status tally:**")
    lines.append(f"- _agree_: {status_counts['agree']} components — Berger predicts AND we match")
    lines.append(f"- _MECH ≠_: {status_counts['mechanism_diverge']} — same planet, different mechanism")
    lines.append(f"- _PLANET ≠_: {status_counts['planet_diverge']} — different planet entirely")
    lines.append(f"- _(no Berger)_: {status_counts['no_berger']} — Berger has no secular prediction")
    lines.append(f"- **Total:** {sum(status_counts.values())} L1 components")
    lines.append("")

    # ── Per-integer detail blocks ──
    lines.append("---")
    lines.append("")
    lines.append("## Per-integer details (sorted by n)")
    lines.append("")

    for r in rows:
        n = r["n"]
        T = r["period_kyr"]
        amp = r["amp"]
        sig = "**LR04 4σ peak**" if r["lr04_4sigma"] else "(subthreshold in LR04 full record)"
        lines.append(f"### n = {n}   ·   T = {T:.3f} kyr   ·   amp = {amp:.4f}")
        lines.append("")
        lines.append(f"_{sig}_")
        lines.append("")
        lines.append(f"- **Berger / secular theory:** {r['berger_label']}")

        # Family matches
        if r["families"]:
            fam_lines = [f"  - `[{f}]` {s}" for f, s in r["families"][:10]]
            extra = ""
            if len(r["families"]) > 10:
                extra = f"\n  - _… {len(r['families']) - 10} more in JSON_"
            lines.append("- **Solar-system family matches** "
                         f"({r['n_families']} families, {len(r['families'])} total combos):")
            lines.extend(fam_lines)
            if extra:
                lines.append(extra.strip())
        else:
            lines.append("- **Solar-system family matches:** _none — family-orphan_")

        # Earth-planet top 5
        all_c = r["all_combos"]
        if all_c:
            top5 = all_c[:5]
            rest = len(all_c) - len(top5)
            lines.append("- **Earth-planet beat candidates (top 5):**")
            for i, c in enumerate(top5, 1):
                marker = " ⭐" if i == 1 else ""
                lines.append(f"  {i}. {fmt_combo(c)}{marker}")
            if rest > 0:
                lines.append(f"  - _… {rest} more combos in JSON (full ranked list)_")
        else:
            lines.append("- **Earth-planet beat candidates:** _none found_")

        # 3-step status note
        status = divergence_status(r["berger_label"], r["our_best"])
        if status == "no_berger":
            lines.append("- **3-step status:** _(no Berger)_ — Berger / secular theory does not "
                         "predict this peak; our model attributes it via an Earth-planet beat.")
        elif status == "planet_diverge":
            bp = ", ".join(sorted(berger_planets(r["berger_label"]) - {"earth"}))
            op = ", ".join(sorted({p for p, _, _ in r["our_best"]["terms"] if p != "Earth"}))
            lines.append(f"- **3-step status:** **PLANET ≠** — Berger names {bp}; "
                         f"our top-1 names {op}.")
        elif status == "mechanism_diverge":
            bm = berger_mechanism(r["berger_label"])
            om = our_mechanism(r["our_best"])
            lines.append(f"- **3-step status:** **MECH ≠** — same planet, but Berger says `{bm}` "
                         f"while our top-1 is `{om}`.")
        else:
            lines.append("- **3-step status:** _agree_ — Berger predicts this peak, names the "
                         "same planet, and uses the same mechanism class.")
        lines.append("")

    DOC_PATH.write_text("\n".join(lines) + "\n")
    print(f"[saved] {DOC_PATH}")


if __name__ == "__main__":
    main()
