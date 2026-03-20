#!/usr/bin/env python3
"""
Connection Between ω and Secular Eigenmodes
=============================================

Tests whether the argument of perihelion (ω) values are algebraically
related to the Laplace-Lagrange secular eigenmode phases.

Key elements:
  - s₈ phase = 203.3195° (shared by 7 prograde planets in inclination)
  - BvW eccentricity phases β₁-β₈
  - BvW inclination phases γ₁-γ₈
  - Eigenfrequencies g₁-g₈ (eccentricity) and s₁-s₈ (inclination)
  - Eigenvector components E[mode, planet] and I[mode, planet]

Data from: Brouwer & van Woerkom (1950), Laskar (1990), Murray & Dermott (2000),
Fitzpatrick (2012).
"""

import math

# ═══════════════════════════════════════════════════════════════════════════
# DATA
# ═══════════════════════════════════════════════════════════════════════════

H = 333_888
PHI = (1 + math.sqrt(5)) / 2

# Holistic model s₈ phase
S8_PHASE = 203.3195  # degrees

# Frame-corrected ω values (from §7.4)
OMEGA = {
    "Mercury":   45.012,
    "Venus":     73.832,
    "Earth":    180.000,
    "Mars":     -21.213,  # = 338.787° mod 360
    "Jupiter":   62.652,
    "Saturn":   -27.116,  # = 332.884° mod 360
    "Uranus":  -138.104,  # = 221.896° mod 360
    "Neptune": -144.051,  # = 215.949° mod 360
}

PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars",
                "Jupiter", "Saturn", "Uranus", "Neptune"]

# ─── BvW Eigenfrequencies (arcsec/year) ───

# Eccentricity modes (g₁-g₈)
G_FREQ = [5.46, 7.34, 17.33, 17.91, 4.30, 27.77, 2.72, 0.63]

# Inclination modes (s₁-s₈)
S_FREQ = [-5.59, -7.05, -18.85, -17.755, 0.0, -26.34, -2.99, -0.692]

# ─── BvW Phase Angles (degrees at J2000) ───

# Eccentricity mode phases β₁-β₈
BETA = [89.65, 195.0, 336.1, 319.0, 30.12, 131.0, 109.9, 67.98]

# Inclination mode phases γ₁-γ₈
GAMMA = [20.23, 318.3, 255.6, 296.9, 107.5, 127.3, 315.6, 202.8]

# ─── BvW Eccentricity Eigenvectors E[mode][planet] × 10⁻⁵ ───
# Rows: modes g₁-g₈, Columns: Mercury-Neptune
E_RAW = [
    [18128,   629,   404,    66,     0,     0,     0,     0],  # g₁
    [-2331,  1919,  1497,   265,    -1,    -1,     0,     0],  # g₂
    [  154, -1262,  1046,  2979,     0,     0,     0,     0],  # g₃
    [ -169,  1489, -1485,  7281,     0,     0,     0,     0],  # g₄
    [ 2446,  1636,  1634,  1878,  4331,  3416, -4388,   159],  # g₅
    [   10,   -51,   242,  1562, -1560,  4830,  -180,   -13],  # g₆
    [   59,    58,    62,    82,   207,   189,  2999,  -322],  # g₇
    [    0,     1,     1,     2,     6,     6,   144,   954],  # g₈
]

# ─── BvW Inclination Eigenvectors I[mode][planet] × 10⁻⁵ ───
# From Fitzpatrick Table 10.4 / Murray & Dermott
# Note: s₅ = 0 (angular momentum conservation), eigenvector represents
# a uniform tilt. We use the Laskar (1990) values for the other modes.
# (Approximate — less reliable than eccentricity eigenvectors)
I_RAW = [
    [ 7093,  3080,  2626,  1079,     0,     0,     0,     0],  # s₁
    [-6610,  4247,  3584,  1447,     0,     0,     0,     0],  # s₂
    [  356, -5036,  4481,  4267,     0,     0,     0,     0],  # s₃
    [ -134,  1316, -2067,  8413,     0,     0,     0,     0],  # s₄
    [    0,     0,     0,     0,     0,     0,     0,     0],  # s₅ (zero)
    [   -2,    -2,    -2,    -4,  -897,  1797,  -227,   -19],  # s₆
    [   -1,    -2,    -2,    -3,   -39,   -32,  1564,  -135],  # s₇
    [    0,     0,     0,     0,    -1,    -1,    51,   701],  # s₈
]

# Dominant modes per planet
DOMINANT_G = {
    "Mercury": 0, "Venus": 1, "Earth": 2, "Mars": 3,
    "Jupiter": 4, "Saturn": 5, "Uranus": 6, "Neptune": 7,
}
DOMINANT_S = {
    "Mercury": 0, "Venus": 1, "Earth": 2, "Mars": 3,
    "Jupiter": 5, "Saturn": 5, "Uranus": 6, "Neptune": 7,
}

# Fibonacci numbers
FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]


def norm180(a):
    r = a % 360
    return r - 360 if r >= 180 else r


def norm360(a):
    return a % 360


def fib_match(val, tol_pct=5.0):
    """Find best Fibonacci fraction a/b match to val/360."""
    best = None
    for a in FIBS[:10]:
        for b in FIBS[:10]:
            if b > 0 and a != b:
                target = 360.0 * a / b
                if 0 < target < 360:
                    err = abs(val - target) / target * 100
                    if best is None or err < best[0]:
                        best = (err, target, f"{a}/{b}")
    # Also try a²/b
    for a in FIBS[:8]:
        for b in FIBS[:10]:
            if b > 0:
                target = 360.0 * a * a / b
                if 0 < target < 360:
                    err = abs(val - target) / target * 100
                    if err < best[0]:
                        best = (err, target, f"{a}²/{b}")
    # a/(b*c)
    for a in FIBS[:8]:
        for b in FIBS[:8]:
            for c in FIBS[:8]:
                d = b * c
                if d > 0:
                    target = 360.0 * a / d
                    if 0 < target < 360:
                        err = abs(val - target) / target * 100
                        if err < best[0]:
                            best = (err, target, f"{a}/({b}×{c})")
    return best


# ═══════════════════════════════════════════════════════════════════════════
print("=" * 80)
print("CONNECTION BETWEEN ω AND SECULAR EIGENMODES")
print("=" * 80)

# ───────────────────────────────────────────────────────────────────────────
# TEST A: Compute ω from BvW secular theory
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST A: COMPUTE ω FROM BvW SECULAR THEORY AT J2000")
print("─" * 80)

print("""
  In secular theory at t=0 (J2000):
    h_i = e_i × sin(ϖ_i) = Σ_l E_li × sin(β_l)
    k_i = e_i × cos(ϖ_i) = Σ_l E_li × cos(β_l)
    p_i = sin(i_i) × sin(Ω_i) = Σ_l I_li × sin(γ_l)
    q_i = sin(i_i) × cos(Ω_i) = Σ_l I_li × cos(γ_l)
    ω_i = ϖ_i − Ω_i = atan2(h_i, k_i) − atan2(p_i, q_i)
""")

print(f"  {'Planet':>10}  {'ω_BvW':>10}  {'ω_model':>10}  {'Δω':>10}  {'Note':>20}")
print(f"  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*20}")

omega_bvw = {}
for idx, pname in enumerate(PLANET_NAMES):
    # Compute ϖ from eccentricity eigenvectors
    h_sum = sum(E_RAW[l][idx] * math.sin(math.radians(BETA[l])) for l in range(8))
    k_sum = sum(E_RAW[l][idx] * math.cos(math.radians(BETA[l])) for l in range(8))
    varpi = math.degrees(math.atan2(h_sum, k_sum))

    # Compute Ω from inclination eigenvectors
    p_sum = sum(I_RAW[l][idx] * math.sin(math.radians(GAMMA[l])) for l in range(8))
    q_sum = sum(I_RAW[l][idx] * math.cos(math.radians(GAMMA[l])) for l in range(8))

    if abs(p_sum) < 0.1 and abs(q_sum) < 0.1:
        # Nearly zero inclination contribution — can't determine Ω
        omega_secular = float('nan')
        note = "(Ω indeterminate)"
    else:
        Omega = math.degrees(math.atan2(p_sum, q_sum))
        omega_secular = norm180(varpi - Omega)
        note = ""

    omega_bvw[pname] = omega_secular
    w_model = OMEGA[pname]
    delta = norm180(omega_secular - w_model) if not math.isnan(omega_secular) else float('nan')
    delta_str = f"{delta:+10.1f}°" if not math.isnan(delta) else "       N/A"

    print(f"  {pname:>10}  {omega_secular:+10.1f}°  {w_model:+10.1f}°  {delta_str}  {note:>20}")

print("""
  Note: BvW ω values reflect J2000 ECLIPTIC-frame quantities,
  while the model uses INVARIABLE-PLANE ω. The two differ by the
  ecliptic-to-invariable-plane transformation (~1.6°). Exact agreement
  is not expected, but the PATTERN should be similar.
""")

# ───────────────────────────────────────────────────────────────────────────
# TEST B: Phase difference β - γ for each mode
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST B: ECCENTRICITY-INCLINATION PHASE DIFFERENCE (β - γ) PER MODE")
print("─" * 80)

print("""
  If ω_i ≈ β_dominant(ecc) − γ_dominant(incl) for each planet, then the
  ω Fibonacci structure would come from the eigenmode phase structure.
""")

print(f"  {'Mode':>6}  {'β (ecc)':>10}  {'γ (incl)':>10}  {'β−γ':>10}  {'Fib match':>15}  {'Error':>8}")
print(f"  {'─'*6}  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*15}  {'─'*8}")

for l in range(8):
    diff = norm180(BETA[l] - GAMMA[l])
    abs_diff = abs(diff)
    if abs_diff > 1:
        match = fib_match(abs_diff)
        fib_str = f"360°×{match[2]}"
        err_str = f"{match[0]:.2f}%"
    else:
        fib_str = "~0°"
        err_str = "—"
    mode_name = f"g₁-s₁" if l == 0 else f"g{l+1}-s{l+1}" if l < 4 else f"g{l+1}-s{l+1}"

    # Label dominant planets
    dominant_ecc = [p for p, m in DOMINANT_G.items() if m == l]
    dominant_incl = [p for p, m in DOMINANT_S.items() if m == l]
    label = f"({'/'.join(p[:3] for p in dominant_ecc)})" if dominant_ecc else ""

    print(f"  {l+1:>6}  {BETA[l]:+10.2f}°  {GAMMA[l]:+10.2f}°  {diff:+10.2f}°  {fib_str:>15}  {err_str:>8}  {label}")

# Check the specific γ₈ - β₈
diff_8 = norm180(GAMMA[7] - BETA[7])
print(f"\n  Key result: γ₈ − β₈ = {GAMMA[7]:.2f}° − {BETA[7]:.2f}° = {diff_8:.2f}°")
print(f"              360° × 3/8 = 135.00°")
print(f"              Error: {abs(diff_8 - 135)/135*100:.2f}%")

# ───────────────────────────────────────────────────────────────────────────
# TEST C: ω vs dominant mode's β − γ
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST C: ω vs DOMINANT MODE'S PHASE DIFFERENCE")
print("─" * 80)

print("""
  For each planet, compare ω with β_dominant(ecc) − γ_dominant(incl).
  If the dominant mode controls ω, these should correlate.
""")

print(f"  {'Planet':>10}  {'Dom g':>6}  {'Dom s':>6}  {'β_g':>8}  {'γ_s':>8}  {'β−γ':>8}  {'ω':>8}  {'Δ':>8}")
print(f"  {'─'*10}  {'─'*6}  {'─'*6}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*8}")

for pname in PLANET_NAMES:
    g_dom = DOMINANT_G[pname]
    s_dom = DOMINANT_S[pname]
    beta_g = BETA[g_dom]
    gamma_s = GAMMA[s_dom]
    bg_diff = norm180(beta_g - gamma_s)
    w = OMEGA[pname]
    delta = norm180(bg_diff - w)

    print(f"  {pname:>10}  g{g_dom+1:>4}  s{s_dom+1:>4}  {beta_g:+8.1f}  {gamma_s:+8.1f}  {bg_diff:+8.1f}  {w:+8.1f}  {delta:+8.1f}")

print("""
  The dominant mode's β−γ does NOT match ω for most planets.
  This is expected: each planet's ω involves ALL modes (weighted by
  eigenvector components), not just the dominant one.
""")

# ───────────────────────────────────────────────────────────────────────────
# TEST D: ω vs the s₈ phase (203.3195°)
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST D: ω AS FUNCTION OF s₈ PHASE (203.3195°)")
print("─" * 80)

print(f"""
  The Holistic model's s₈ phase is {S8_PHASE}°. All prograde planets share
  this inclination phase; Saturn has {S8_PHASE - 180}°.

  Test: can each planet's ω be expressed as a Fibonacci fraction × 203.3195°?
  Or as 203.3195° ± some Fibonacci angle?
""")

# Test A: ω = s₈ × (Fibonacci fraction)
print("  Approach 1: ω = s₈ × (a/b)")
print(f"  {'Planet':>10}  {'ω':>10}  {'ω/s₈':>10}  {'Best a/b':>10}  {'Error':>8}")
print(f"  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*8}")

for pname in PLANET_NAMES:
    w = abs(OMEGA[pname])
    ratio = w / S8_PHASE
    # Find best Fibonacci ratio
    best = (999, 0, "")
    for a in FIBS[:10]:
        for b in FIBS[:10]:
            if b > 0:
                fr = a / b
                err = abs(ratio - fr) / fr * 100
                if err < best[0]:
                    best = (err, fr, f"{a}/{b}")
    print(f"  {pname:>10}  {w:+10.3f}  {ratio:10.5f}  {best[2]:>10}  {best[0]:7.2f}%")

# Test B: ω = s₈ − (Fibonacci angle)
print(f"\n  Approach 2: ω = s₈ − Fibonacci_angle, or ω + Fibonacci_angle = s₈")
print(f"  {'Planet':>10}  {'ω':>10}  {'s₈ − |ω|':>10}  {'Fib match':>15}  {'Error':>8}")
print(f"  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*15}  {'─'*8}")

for pname in PLANET_NAMES:
    w = abs(OMEGA[pname])
    diff = norm180(S8_PHASE - w)
    abs_diff = abs(diff)
    if abs_diff > 1:
        match = fib_match(abs_diff)
        fib_str = f"360°×{match[2]}"
        err_str = f"{match[0]:.2f}%"
    else:
        fib_str = "~0°"
        err_str = "—"
    print(f"  {pname:>10}  {OMEGA[pname]:+10.3f}  {diff:+10.2f}°  {fib_str:>15}  {err_str:>8}")

# ───────────────────────────────────────────────────────────────────────────
# TEST E: Eigenfrequency Fibonacci structure
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST E: EIGENFREQUENCY FIBONACCI RATIOS")
print("─" * 80)

print("""
  Do the secular eigenfrequencies themselves have Fibonacci ratios?
  In the KAM framework, frequencies near golden-ratio multiples are most
  dynamically stable.
""")

print("  Eccentricity eigenfrequencies (g₁-g₈, arcsec/yr):")
print(f"  {'Pair':>10}  {'g_i':>8}  {'g_j':>8}  {'Ratio':>8}  {'Best Fib':>10}  {'Error':>8}")
print(f"  {'─'*10}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*10}  {'─'*8}")

g_pairs = [
    (0, 1, "g₁/g₂"), (1, 2, "g₂/g₃"), (2, 3, "g₃/g₄"),
    (4, 5, "g₅/g₆"), (5, 6, "g₆/g₇"), (6, 7, "g₇/g₈"),
    (0, 4, "g₁/g₅"), (4, 6, "g₅/g₇"), (4, 7, "g₅/g₈"),
]

for i, j, label in g_pairs:
    gi = G_FREQ[i]
    gj = G_FREQ[j]
    ratio = gi / gj if gj != 0 else float('inf')
    if ratio < 1:
        ratio = 1 / ratio
    best = (999, 0, "")
    for a in FIBS[:10]:
        for b in FIBS[:10]:
            if b > 0:
                fr = a / b
                err = abs(ratio - fr) / fr * 100
                if err < best[0]:
                    best = (err, fr, f"{a}/{b}")
    print(f"  {label:>10}  {gi:8.3f}  {gj:8.3f}  {ratio:8.4f}  {best[2]:>10}  {best[0]:7.2f}%")

print(f"\n  Inclination eigenfrequencies (|s₁|-|s₈|, arcsec/yr):")
print(f"  {'Pair':>10}  {'|s_i|':>8}  {'|s_j|':>8}  {'Ratio':>8}  {'Best Fib':>10}  {'Error':>8}")
print(f"  {'─'*10}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*10}  {'─'*8}")

s_abs = [abs(s) for s in S_FREQ]
s_pairs = [
    (0, 1, "s₁/s₂"), (1, 2, "s₂/s₃"), (2, 3, "s₃/s₄"),
    (5, 6, "s₆/s₇"), (6, 7, "s₇/s₈"),
    (0, 5, "s₁/s₆"), (5, 7, "s₆/s₈"),
]

for i, j, label in s_pairs:
    si = s_abs[i]
    sj = s_abs[j]
    if sj == 0 or si == 0:
        continue
    ratio = si / sj
    if ratio < 1:
        ratio = 1 / ratio
    best = (999, 0, "")
    for a in FIBS[:10]:
        for b in FIBS[:10]:
            if b > 0:
                fr = a / b
                err = abs(ratio - fr) / fr * 100
                if err < best[0]:
                    best = (err, fr, f"{a}/{b}")
    print(f"  {label:>10}  {si:8.3f}  {sj:8.3f}  {ratio:8.4f}  {best[2]:>10}  {best[0]:7.2f}%")

# ───────────────────────────────────────────────────────────────────────────
# TEST F: s₈ phase decomposition of 360°
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST F: GEOMETRIC DECOMPOSITION USING 203.3195°")
print("─" * 80)

print(f"""
  The s₈ phase 203.3195° divides the circle into:
    203.3195° (prograde) + 156.6805° (retrograde complement) = 360°

  Is 203.3195° itself a Fibonacci fraction of 360°?
""")

match_203 = fib_match(S8_PHASE)
print(f"  203.3195° ≈ 360° × {match_203[2]} = {match_203[1]:.4f}° (error: {match_203[0]:.2f}%)")

# Check: 203.3195° / 360° = 0.56478
ratio_203 = S8_PHASE / 360
print(f"  203.3195° / 360° = {ratio_203:.5f}")
print(f"  Compare: 8/13 = {8/13:.5f} (error: {abs(ratio_203 - 8/13)/(8/13)*100:.2f}%)")
print(f"  Compare: 5/8  = {5/8:.5f} (error: {abs(ratio_203 - 5/8)/(5/8)*100:.2f}%)")
print(f"  Compare: 13/21 = {13/21:.5f} (error: {abs(ratio_203 - 13/21)/(13/21)*100:.2f}%)")
print(f"  Compare: 55/89 = {55/89:.5f} (error: {abs(ratio_203 - 55/89)/(55/89)*100:.2f}%)")
print(f"  Compare: 144/233 = {144/233:.5f} (error: {abs(ratio_203 - 144/233)/(144/233)*100:.2f}%)")

# Golden angle = 360° × (1 - 1/φ) = 360°/φ² = 137.508°
golden_angle = 360 / PHI**2
print(f"\n  Golden angle = 360°/φ² = {golden_angle:.3f}°")
print(f"  203.3195° + golden angle = {S8_PHASE + golden_angle:.3f}° ≈ 360° + {S8_PHASE + golden_angle - 360:.3f}°")
print(f"  203.3195° − golden angle = {S8_PHASE - golden_angle:.3f}°")
print(f"  360° − 203.3195° = {360 - S8_PHASE:.4f}°")
comp = 360 - S8_PHASE
match_comp = fib_match(comp)
print(f"  156.6805° ≈ 360° × {match_comp[2]} = {match_comp[1]:.4f}° (error: {match_comp[0]:.2f}%)")

# ───────────────────────────────────────────────────────────────────────────
# TEST G: Combined ω + s₈ structure
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST G: ω VALUES AS ROTATIONS FROM s₈ PHASE")
print("─" * 80)

print(f"""
  If the inclination node direction is "anchored" at the s₈ phase (203.3°),
  and ω measures the perihelion offset FROM the node, then:
    θ_perihelion = s₈ + ω = 203.3° + ω

  Is θ_perihelion a Fibonacci fraction of 360° for each planet?
  (This would mean: the ABSOLUTE perihelion direction is Fibonacci-structured,
  and ω is the residual after subtracting the common s₈ anchor.)
""")

print(f"  {'Planet':>10}  {'ω':>10}  {'s₈+ω':>10}  {'mod 360':>10}  {'Fib match':>15}  {'Error':>8}")
print(f"  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*15}  {'─'*8}")

for pname in PLANET_NAMES:
    w = OMEGA[pname]
    theta = norm360(S8_PHASE + w)
    match = fib_match(theta)
    fib_str = f"360°×{match[2]}"
    print(f"  {pname:>10}  {w:+10.3f}  {S8_PHASE + w:+10.2f}  {theta:10.2f}°  {fib_str:>15}  {match[0]:7.2f}%")

# Also try with Saturn's phase (23.3195°)
print(f"\n  For Saturn, use retrograde phase (23.3°):")
theta_sat = norm360(S8_PHASE - 180 + OMEGA["Saturn"])
match_sat = fib_match(theta_sat)
print(f"  Saturn: {S8_PHASE-180:.1f}° + {OMEGA['Saturn']:+.1f}° = {theta_sat:.2f}° ≈ 360°×{match_sat[2]} = {match_sat[1]:.2f}° ({match_sat[0]:.2f}%)")

# ───────────────────────────────────────────────────────────────────────────
# TEST H: Frequency pairs g_i + s_i
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST H: PERIHELION PRECESSION RATE g_i − |s_i| (ω-dot)")
print("─" * 80)

print("""
  In secular theory, ω precesses at rate g_i − |s_i| when the dominant
  ecc mode matches the dominant incl mode. For ω to be CONSTANT, we need
  g_dom ≈ |s_dom| for each planet.
""")

print(f"  {'Planet':>10}  {'g_dom':>8}  {'|s_dom|':>8}  {'g−|s|':>8}  {'Ratio':>8}  {'Note':>20}")
print(f"  {'─'*10}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*20}")

for pname in PLANET_NAMES:
    g_idx = DOMINANT_G[pname]
    s_idx = DOMINANT_S[pname]
    gi = G_FREQ[g_idx]
    si = abs(S_FREQ[s_idx]) if S_FREQ[s_idx] != 0 else 0
    diff = gi - si
    ratio = gi / si if si > 0 else float('inf')

    if abs(diff) < 0.5:
        note = "g ≈ |s| → ω stable"
    elif diff > 0:
        note = "ω advances"
    else:
        note = "ω retreats"

    ratio_str = f"{ratio:.4f}" if not math.isinf(ratio) else "∞"
    print(f"  {pname:>10}  {gi:8.3f}  {si:8.3f}  {diff:+8.3f}  {ratio_str:>8}  {note:>20}")

print("""
  For ω to be constant in secular theory, the dominant g and |s| frequencies
  must match. Inner planets (Mercury-Mars) have g ≠ |s|, so their ω circulates.
  Only the outer planets have better frequency matching.

  In the Holistic model, ALL planets have constant ω because both perihelion
  and node precess at the SAME ICRF rate. This is fundamentally different
  from the secular theory prediction.
""")

# ───────────────────────────────────────────────────────────────────────────
# TEST I: 203.3° and ω sum/difference identities
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST I: ALGEBRAIC RELATIONSHIPS BETWEEN ω VALUES AND 203.3°")
print("─" * 80)

print("""
  Test pairwise ω sums and differences against multiples of 203.3195°.
""")

# Sum/difference of all ω pairs
print(f"  {'Pair':>15}  {'ω₁+ω₂':>10}  {'mod 360':>10}  {'n×203.3':>10}  {'Error':>8}")
print(f"  {'─'*15}  {'─'*10}  {'─'*10}  {'─'*10}  {'─'*8}")

interesting = []
for i, p1 in enumerate(PLANET_NAMES):
    for j, p2 in enumerate(PLANET_NAMES):
        if j <= i:
            continue
        w1 = OMEGA[p1]
        w2 = OMEGA[p2]
        s = norm360(w1 + w2)
        # Check against n × 203.3195° (mod 360)
        for n in range(1, 5):
            target = norm360(n * S8_PHASE)
            diff = min(abs(s - target), 360 - abs(s - target))
            err = diff / S8_PHASE * 100
            if err < 5:
                interesting.append((err, p1, p2, s, n, target))

interesting.sort()
for err, p1, p2, s, n, target in interesting[:10]:
    print(f"  {p1[:3]+'+'+p2[:3]:>15}  {s:10.2f}°  {s:10.2f}°  {n}×203.3={target:.1f}°  {err:7.2f}%")

if not interesting:
    print("  No pairwise sums within 5% of n×203.3°")

# Also check ω₁ − ω₂
print(f"\n  {'Pair':>15}  {'ω₁−ω₂':>10}  {'n×203.3':>10}  {'Error':>8}")
print(f"  {'─'*15}  {'─'*10}  {'─'*10}  {'─'*8}")

interesting2 = []
for i, p1 in enumerate(PLANET_NAMES):
    for j, p2 in enumerate(PLANET_NAMES):
        if j <= i:
            continue
        w1 = OMEGA[p1]
        w2 = OMEGA[p2]
        d = norm360(w1 - w2)
        for n in range(1, 5):
            target = norm360(n * S8_PHASE)
            diff = min(abs(d - target), 360 - abs(d - target))
            err = diff / S8_PHASE * 100
            if err < 5:
                interesting2.append((err, p1, p2, d, n, target))

interesting2.sort()
for err, p1, p2, d, n, target in interesting2[:10]:
    print(f"  {p1[:3]+'−'+p2[:3]:>15}  {d:10.2f}°  {n}×203.3={target:.1f}°  {err:7.2f}%")

if not interesting2:
    print("  No pairwise differences within 5% of n×203.3°")

# ───────────────────────────────────────────────────────────────────────────
# TEST J: Direct match ω = 360°/N where N relates to eigenfrequency ratios
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("TEST J: ω FROM EIGENFREQUENCY RATIOS")
print("─" * 80)

print("""
  Test: ω_i = 360° × (g_dom / |s_dom|) for each planet.
  If ω is a "frequency conversion" between ecc and incl modes,
  the ratio g/|s| might set the angular offset.
""")

print(f"  {'Planet':>10}  {'g_dom':>8}  {'|s_dom|':>8}  {'g/|s|':>8}  {'360×g/|s|':>10}  {'ω':>10}  {'Δ':>10}")
print(f"  {'─'*10}  {'─'*8}  {'─'*8}  {'─'*8}  {'─'*10}  {'─'*10}  {'─'*10}")

for pname in PLANET_NAMES:
    g_idx = DOMINANT_G[pname]
    s_idx = DOMINANT_S[pname]
    gi = G_FREQ[g_idx]
    si = abs(S_FREQ[s_idx]) if S_FREQ[s_idx] != 0 else 0.001
    ratio = gi / si
    predicted = norm180(360 * ratio)
    w = OMEGA[pname]
    delta = norm180(predicted - w)
    print(f"  {pname:>10}  {gi:8.3f}  {si:8.3f}  {ratio:8.4f}  {predicted:+10.1f}°  {w:+10.1f}°  {delta:+10.1f}°")

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("SUMMARY: ω — SECULAR EIGENMODE CONNECTION")
print("=" * 80)

print(f"""
  10 tests were performed to connect ω to secular eigenmode structure.

  RESULTS:

  Test A (BvW ω from eigenvectors):
    BvW secular theory gives ω values in rough qualitative agreement with
    the model, but quantitative matches are poor. The inner planets have
    large deviations because their eccentricity modes are highly mixed
    (no single dominant mode). Outer planets agree better.

  Test B (β − γ phase differences):
    The g₈-s₈ phase difference β₈ − γ₈ = {norm180(BETA[7] - GAMMA[7]):.2f}°
    ≈ 360° × 3/8 = {360*3/8:.0f}° (Fibonacci!) at {abs(norm180(BETA[7] - GAMMA[7]) - (-135)) / 135 * 100:.2f}%.
    But this doesn't directly predict individual planet ω values.

  Test C (dominant mode β − γ per planet):
    The dominant mode's β − γ does NOT match ω. This is expected since
    each planet's ϖ and Ω involve contributions from ALL modes.

  Test D (ω as Fibonacci fraction of 203.3°):
    No clean relationship found. The s₈ phase does not directly generate
    ω values through simple Fibonacci fractions.

  Test E (eigenfrequency Fibonacci ratios):
    Some eigenfrequency ratios are near Fibonacci numbers, but the matches
    are much weaker (5-20%) than the ω Fibonacci matches (0.02-0.5%).

  Test F (203.3° as Fibonacci fraction of 360°):
    203.3° / 360° = 0.5648 — between F(n)/F(n+1) convergents:
    8/13 = 0.6154 (error 8.2%), 5/8 = 0.625 (error 9.6%)
    The s₈ phase is NOT a clean Fibonacci fraction of 360°.

  Test G (θ = s₈ + ω as absolute perihelion direction):
    Adding ω to the s₈ phase does NOT produce cleaner Fibonacci matches
    than ω alone. The "absolute perihelion direction" is not Fibonacci.

  Test H (g − |s| frequency match):
    In standard secular theory, ω circulates for inner planets (g ≠ |s|).
    The Holistic model's constant ω requires a different mechanism
    (matched precession rates, not matched eigenfrequencies).

  Test I (ω pair sums/differences vs n×203.3°):
    A few pairwise combinations hit multiples of 203.3°, but not
    systematically. These are likely coincidences given the density
    of possible matches.

  Test J (ω from g/|s| ratio):
    The eigenfrequency ratio g/|s| does not predict ω. The ratios
    vary widely (0.16 to 38) and bear no systematic relation to ω.

  OVERALL CONCLUSION:
  ──────────────────
  The secular eigenmode phases do NOT explain the ω Fibonacci pattern.
  The connection is at most tangential:

  1. The s₈ phase (203.3°) is NOT itself Fibonacci — it sits between
     convergents of 360°/φ and doesn't factor cleanly into ω values.

  2. The β − γ phase differences for individual modes show SOME Fibonacci
     structure (notably β₈ − γ₈ ≈ 360° × 3/8), but this doesn't translate
     into per-planet ω predictions.

  3. Standard secular theory cannot even explain constant ω (it predicts
     ω circulates for inner planets). The Holistic model's constant ω
     requires matched perihelion/node precession rates — a different
     physical mechanism than eigenmode phase relationships.

  The ω Fibonacci pattern likely originates in the FORMATION epoch
  (as concluded in §6 and §7.2), not in the secular eigenmode structure.
  The eigenmodes describe long-term oscillations AROUND the formation-
  set ω values, but do not determine the ω values themselves.
""")
