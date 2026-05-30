#!/usr/bin/env python3
"""
405-KYR BEAT SEARCH — DOC 55 PLANETARY CYCLE COMBINATIONS
===========================================================

User hypothesis: the 405-kyr cycle is a beat involving Jupiter, Saturn, and
Earth cycles (i.e. constructed from doc-55 8H/N cycles), not the conventional
g₂−g₅ Venus-Jupiter eigenmode.

Methodology: enumerate ALL combinations of 2 and 3 cycles from doc-55's
planetary cycle table. For each combination, compute the beat period:

  Pair:    |1 / (s_i f_i + s_j f_j)|       where s_k ∈ {+1, -1}
  Triplet: |1 / (s_i f_i + s_j f_j + s_k f_k)|

Frequencies f_k = 1/P_k carry doc-55's prograde/retrograde sign. Report all
combinations whose beat period lies within ±3% of 405 kyr.

Three searches:
  A. Jupiter × Saturn × Earth only (user's focus)
  B. All 8 planets, pairs only
  C. All 8 planets, triplets

Output: data/milankovitch-8h-405k-beat-search.json
"""

import json
from itertools import combinations, product
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
OUT_PATH = DATA_DIR / "milankovitch-8h-405k-beat-search.json"

TARGET_PERIOD_YR = 405000.0
TOLERANCE_PCT = 3.0    # ±3% of 405 kyr → ±12 kyr
TOLERANCE_YR = TARGET_PERIOD_YR * TOLERANCE_PCT / 100.0

# ─────────────────────────────────────────────────────────────────────────
# Doc 55 cycle table — signed periods in years (- = retrograde)
# ─────────────────────────────────────────────────────────────────────────
# Each entry: (planet, cycle_type, signed_period_yr, 8H_divisor_label)

EIGHT_H = 2682536.0   # = 8 × H, doc 55 anchor

CYCLES = [
    # Mercury
    ("Mercury", "axial",    -298060, "-8H/9"),
    ("Mercury", "peri_ecl",  243867, "8H/11"),
    ("Mercury", "ICRF",      -28844, "-8H/93"),
    ("Mercury", "asc_node", -298060, "-8H/9"),
    ("Mercury", "obliquity", 894179, "8H/3"),
    ("Mercury", "ecc",        31935, "8H/84"),
    # Venus
    ("Venus",   "axial",      29478, "+8H/91"),
    ("Venus",   "peri_ecl", -447089, "-8H/6"),
    ("Venus",   "ICRF",      -24387, "-8H/110"),
    ("Venus",   "asc_node",-2682536, "-8H/1"),
    ("Venus",   "obliquity",  24387, "8H/110"),
    ("Venus",   "ecc",       141186, "8H/19"),
    # Earth
    ("Earth",   "axial",     -25794, "-8H/104"),
    ("Earth",   "peri_ecl",   20957, "8H/128"),
    ("Earth",   "ICRF",      111772, "+8H/24"),
    ("Earth",   "asc_node",  -67063, "-8H/40"),
    ("Earth",   "obliquity",  41915, "8H/64"),
    ("Earth",   "ecc",        20957, "8H/128"),
    # Mars
    ("Mars",    "axial",    -167659, "-8H/16"),
    ("Mars",    "peri_ecl",   74515, "8H/36"),
    ("Mars",    "ICRF",      -39449, "-8H/68"),
    ("Mars",    "asc_node",  -41915, "-8H/64"),
    ("Mars",    "obliquity", 127740, "8H/21"),
    ("Mars",    "ecc",        51587, "8H/52"),
    # Jupiter (perihelion dynamical: 8H/39, 8H/65, ecc 8H/44)
    ("Jupiter", "axial",    -127740, "-8H/21"),
    ("Jupiter", "peri_ecl",   68783, "8H/39"),
    ("Jupiter", "ICRF",      -41270, "-8H/65"),
    ("Jupiter", "asc_node",  -74515, "-8H/36"),
    ("Jupiter", "obliquity", 167659, "8H/16"),
    ("Jupiter", "ecc",        60967, "8H/44"),
    # Saturn (perihelion dynamical: 8H/65, 8H/169, ecc 8H/163)
    ("Saturn",  "axial",    -447089, "-8H/6"),
    ("Saturn",  "peri_ecl",  -41270, "-8H/65"),
    ("Saturn",  "ICRF",      -15873, "-8H/169"),
    ("Saturn",  "asc_node",  -74515, "-8H/36"),
    ("Saturn",  "obliquity", 111772, "8H/24"),
    ("Saturn",  "ecc",        16457, "8H/163"),
    # Uranus (axial frozen, omit)
    ("Uranus",  "peri_ecl",  111772, "8H/24"),
    ("Uranus",  "ICRF",      -33532, "-8H/80"),
    ("Uranus",  "asc_node", -243867, "-8H/11"),
    ("Uranus",  "obliquity", 167659, "8H/16"),
    ("Uranus",  "ecc",        33532, "8H/80"),
    # Neptune (axial frozen, omit)
    ("Neptune", "peri_ecl",  670634, "8H/4"),
    ("Neptune", "ICRF",      -26825, "-8H/100"),
    ("Neptune", "asc_node", -894179, "-8H/3"),
    ("Neptune", "obliquity",  26825, "8H/100"),
    ("Neptune", "ecc",        26825, "8H/100"),
]


def label(cycle):
    return f"{cycle[0]}.{cycle[1]} ({cycle[3]} = {cycle[2]:+d} yr)"


def beat_period(signed_freqs):
    """Combined beat period from a signed-frequency sum."""
    total = sum(signed_freqs)
    if abs(total) < 1e-15:
        return float("inf")
    return abs(1.0 / total)


def near_target(p):
    return abs(p - TARGET_PERIOD_YR) <= TOLERANCE_YR


# ─────────────────────────────────────────────────────────────────────────
# Searches
# ─────────────────────────────────────────────────────────────────────────

def search_pairs(cycle_list, want_hits_only=True):
    hits = []
    all_combos = []
    n = len(cycle_list)
    for i, j in combinations(range(n), 2):
        c1, c2 = cycle_list[i], cycle_list[j]
        f1 = 1.0 / c1[2]; f2 = 1.0 / c2[2]
        for s1, s2 in product([+1, -1], repeat=2):
            if s1 < 0:
                continue
            p = beat_period([s1 * f1, s2 * f2])
            record = {
                "type": "pair",
                "period_yr": float(p),
                "diff_pct": float(100 * (p - TARGET_PERIOD_YR) / TARGET_PERIOD_YR),
                "expression": f"|{'+' if s1>0 else '-'}f({label(c1)}) {'+' if s2>0 else '-'} f({label(c2)})|",
                "components": [label(c1), label(c2)],
                "signs": [s1, s2],
            }
            all_combos.append(record)
            if near_target(p):
                hits.append(record)
    return (hits, all_combos) if not want_hits_only else hits


def search_triplets(cycle_list, want_hits_only=True):
    hits = []
    all_combos = []
    n = len(cycle_list)
    for i, j, k in combinations(range(n), 3):
        c1, c2, c3 = cycle_list[i], cycle_list[j], cycle_list[k]
        f1 = 1.0 / c1[2]; f2 = 1.0 / c2[2]; f3 = 1.0 / c3[2]
        for s1, s2, s3 in product([+1, -1], repeat=3):
            if s1 < 0:
                continue
            p = beat_period([s1 * f1, s2 * f2, s3 * f3])
            record = {
                "type": "triplet",
                "period_yr": float(p),
                "diff_pct": float(100 * (p - TARGET_PERIOD_YR) / TARGET_PERIOD_YR),
                "expression": (f"|{'+' if s1>0 else '-'}f({label(c1)}) "
                                f"{'+' if s2>0 else '-'} f({label(c2)}) "
                                f"{'+' if s3>0 else '-'} f({label(c3)})|"),
                "components": [label(c1), label(c2), label(c3)],
                "signs": [s1, s2, s3],
            }
            all_combos.append(record)
            if near_target(p):
                hits.append(record)
    return (hits, all_combos) if not want_hits_only else hits


def closest_n(all_combos, n=20):
    """Return n combinations closest to TARGET_PERIOD_YR, deduped by component set."""
    sorted_combos = sorted(all_combos, key=lambda h: abs(h["period_yr"] - TARGET_PERIOD_YR))
    out = []
    seen_components = set()
    for c in sorted_combos:
        key = tuple(sorted(c["components"]))
        if key in seen_components:
            continue
        seen_components.add(key)
        out.append(c)
        if len(out) >= n:
            break
    return out


def dedupe_hits(hits, tol_yr=100):
    """Remove near-duplicate beat periods. Keep the one with the simplest description."""
    sorted_hits = sorted(hits, key=lambda h: abs(h["diff_pct"]))
    kept = []
    seen_components = set()
    for h in sorted_hits:
        # use sorted-tuple of component labels (set) as a dedup key
        key = tuple(sorted(h["components"]))
        if key in seen_components:
            continue
        seen_components.add(key)
        kept.append(h)
    return kept


# ─────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 72)
    print("405-KYR BEAT SEARCH — DOC 55 PLANETARY CYCLE COMBINATIONS")
    print("=" * 72)
    print(f"  Target: {TARGET_PERIOD_YR/1000:.1f} kyr (Laskar g₂−g₅)")
    print(f"  Tolerance: ±{TOLERANCE_PCT}% = ±{TOLERANCE_YR/1000:.1f} kyr")
    print(f"  Cycles in table: {len(CYCLES)}")

    # ── A: Focus on Jupiter, Saturn, Earth ────────────────────────────────
    jse = [c for c in CYCLES if c[0] in ("Jupiter", "Saturn", "Earth")]
    print(f"\n  A. Jupiter+Saturn+Earth only ({len(jse)} cycles)")
    a_pairs, a_pairs_all = search_pairs(jse, want_hits_only=False)
    a_trips, a_trips_all = search_triplets(jse, want_hits_only=False)
    print(f"     pairs near 405 kyr (±3%):    {len(a_pairs)}")
    print(f"     triplets near 405 kyr (±3%): {len(a_trips)}")
    a_all_combos = a_pairs_all + a_trips_all
    a_closest = closest_n(a_all_combos, n=15)
    print(f"     {len(a_closest)} CLOSEST combinations (any tolerance):")
    for h in a_closest:
        print(f"     • {h['period_yr']:>10.1f} yr ({h['diff_pct']:+7.2f}%)  {h['expression']}")

    # ── B: All 8 planets, pairs only ──────────────────────────────────────
    print(f"\n  B. All 8 planets, PAIRS ({len(CYCLES)} cycles)")
    b_pairs, b_pairs_all = search_pairs(CYCLES, want_hits_only=False)
    print(f"     pair combinations within ±3%: {len(b_pairs)}")
    b_closest = closest_n(b_pairs_all, n=20)
    print(f"     {len(b_closest)} CLOSEST pairs:")
    for h in b_closest:
        print(f"     • {h['period_yr']:>10.1f} yr ({h['diff_pct']:+7.2f}%)  {h['expression']}")

    # ── C: All 8 planets, triplets ────────────────────────────────────────
    print(f"\n  C. All 8 planets, TRIPLETS")
    c_trips, c_trips_all = search_triplets(CYCLES, want_hits_only=False)
    print(f"     triplet combinations within ±3%: {len(c_trips)}")
    c_closest = closest_n(c_trips_all, n=25)
    print(f"     {len(c_closest)} CLOSEST triplets:")
    for h in c_closest:
        print(f"     • {h['period_yr']:>10.1f} yr ({h['diff_pct']:+7.2f}%)  {h['expression']}")

    out = {
        "target_period_yr": TARGET_PERIOD_YR,
        "tolerance_pct": TOLERANCE_PCT,
        "tolerance_yr": TOLERANCE_YR,
        "n_cycles_total": len(CYCLES),
        "A_jupiter_saturn_earth": {
            "n_cycles": len(jse),
            "n_pairs_within_3pct": len(a_pairs),
            "n_triplets_within_3pct": len(a_trips),
            "hits_within_3pct": dedupe_hits(a_pairs + a_trips),
            "closest_15_combinations": a_closest,
        },
        "B_all_planets_pairs": {
            "n_within_3pct": len(b_pairs),
            "hits_within_3pct": dedupe_hits(b_pairs),
            "closest_20_pairs": b_closest,
        },
        "C_all_planets_triplets": {
            "n_within_3pct": len(c_trips),
            "hits_within_3pct": dedupe_hits(c_trips),
            "closest_25_triplets": c_closest,
        },
    }
    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()
