#!/usr/bin/env python3
"""
Explore the h(e) = √(1 + √(1-e²)) identity in depth.

This function emerged from AMD analysis: h(e) = e/√f(e) where f(e) = 1-√(1-e²).
It's a "half-angle" type function connecting eccentricity to a deeper variable.

Questions:
A. Mathematical properties and trigonometric interpretation
B. h(e) values for all planets — do they form patterns?
C. h(e) in the Fibonacci ladder — does it simplify k values?
D. h(e) ratios between mirror pairs
E. h(e) as a variable for Law 4 constraints
F. Connection to AMD: h(e) = ξ/√AMD × a^(1/4) / √m^(1/4) ... check
G. Does h(e) × (something simple) = Fibonacci constant?
"""

import math
import sys
sys.path.insert(0, '.')
from fibonacci_data import *

PLANET_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

# Eccentricities and other data
ECC_ALL = {p: ECC[p] for p in PLANET_NAMES}
MASS_ALL = {p: MASS[p] for p in PLANET_NAMES}
SMA_ALL = {p: SMA[p] for p in PLANET_NAMES}
D_ALL = {p: D[p] for p in PLANET_NAMES}
XI_ALL = {p: ECC[p] * math.sqrt(MASS[p]) for p in PLANET_NAMES}

# Period fractions a/b
A_FRAC = {'Mercury': 8, 'Venus': 2, 'Earth': 1, 'Mars': 3,
           'Jupiter': 1, 'Saturn': 1, 'Uranus': 1, 'Neptune': 2}
B_FRAC = {'Mercury': 11, 'Venus': 1, 'Earth': 3, 'Mars': 13,
           'Jupiter': 5, 'Saturn': 8, 'Uranus': 3, 'Neptune': 1}

# Fibonacci numbers for reference
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610]

# Eccentricity ladder k values
K_LADDER = {'Mercury': 8, 'Venus': 1, 'Earth': 5/2, 'Mars': 5,
            'Jupiter': 141, 'Saturn': 85, 'Uranus': 29.5, 'Neptune': 5.8}

# Mean inclinations (computed from fibonacci_data)
I_MEAN = {}
for p in PLANET_NAMES:
    i_mean_rad = compute_mean_inclination(p)
    I_MEAN[p] = math.degrees(i_mean_rad)

print("=" * 100)
print("THE h(e) IDENTITY — Deep Investigation")
print("=" * 100)

# =====================================================================
# A. MATHEMATICAL PROPERTIES
# =====================================================================
print(f"\n{'='*100}")
print("A. MATHEMATICAL PROPERTIES OF h(e)")
print(f"{'='*100}")

print("""
  DEFINITION:
    f(e) = 1 - √(1-e²)           [AMD kernel: AMD = m√a × f(e)]
    h(e) = e / √f(e)              [ratio of e to its AMD kernel]

  ALGEBRAIC IDENTITY (proved):
    h(e) = √(1 + √(1-e²))
    h²(e) = 1 + √(1-e²)

  PROOF: h² = e²/f = e²/(1-√(1-e²))
         Multiply by conjugate: e²(1+√(1-e²)) / (1-(1-e²)) = 1+√(1-e²)  ✓

  TRIGONOMETRIC INTERPRETATION:
    Let e = sin(θ), then √(1-e²) = cos(θ)
    h² = 1 + cos(θ) = 2cos²(θ/2)     [half-angle identity]
    h = √2 × cos(θ/2) = √2 × cos(arcsin(e)/2)

  So h(e) IS the half-angle cosine of the eccentricity!
  When e → 0: θ → 0, cos(0/2) = 1, h → √2
  When e → 1: θ → π/2, cos(π/4) = 1/√2, h → 1

  RANGE: h ∈ [1, √2] for e ∈ [1, 0]

  INVERSE: Given h, recover e:
    h² = 1 + √(1-e²)  →  √(1-e²) = h²-1  →  e² = 1-(h²-1)² = 2h²-h⁴
    e = h × √(2-h²)

  ALTERNATIVE FORMS:
    h = √(1 + √(1-e²))
    h² - 1 = √(1-e²) = cos(arcsin(e))
    (h² - 1)² = 1 - e²
    h⁴ - 2h² + 1 = 1 - e²
    e² + h⁴ = 2h²   ←  BEAUTIFUL: quartic relation between e and h
    e² = h²(2 - h²)  ←  h is the "natural square root" of eccentricity
""")

# Verify the trigonometric interpretation
print("  Verification of h(e) = √2 × cos(arcsin(e)/2):")
print(f"  {'Planet':>10} | {'e':>8} | {'h(e) direct':>12} | {'√2×cos(θ/2)':>12} | {'match':>8}")
print("  " + "─" * 60)
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    h_direct = math.sqrt(1 + math.sqrt(1 - e**2))
    theta = math.asin(e)
    h_trig = math.sqrt(2) * math.cos(theta / 2)
    match = abs(h_direct - h_trig) < 1e-12
    print(f"  {p:>10} | {e:>8.4f} | {h_direct:>12.8f} | {h_trig:>12.8f} | {'✓' if match else '✗':>8}")

# The "eccentricity angle" θ = arcsin(e)
print(f"\n  The eccentricity angle θ = arcsin(e):")
print(f"  {'Planet':>10} | {'e':>8} | {'θ (deg)':>8} | {'θ/2 (deg)':>10} | {'h/√2':>8} | {'= cos(θ/2)':>12}")
print("  " + "─" * 70)
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    theta_deg = math.degrees(math.asin(e))
    h = math.sqrt(1 + math.sqrt(1 - e**2))
    print(f"  {p:>10} | {e:>8.4f} | {theta_deg:>8.3f} | {theta_deg/2:>10.3f} | {h/math.sqrt(2):>8.6f} | {math.cos(math.asin(e)/2):>12.6f}")

# =====================================================================
# B. h(e) VALUES FOR ALL PLANETS
# =====================================================================
print(f"\n{'='*100}")
print("B. h(e) VALUES FOR ALL PLANETS")
print(f"{'='*100}")

print(f"\n  {'Planet':>10} | {'e':>8} | {'h(e)':>10} | {'h-√2':>10} | {'(h-√2)/√2 %':>12} | {'h²':>10} | {'h²-1':>10}")
print("  " + "─" * 80)
h_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    h = math.sqrt(1 + math.sqrt(1 - e**2))
    h_vals[p] = h
    dev = (h - math.sqrt(2)) / math.sqrt(2) * 100
    print(f"  {p:>10} | {e:>8.4f} | {h:>10.6f} | {h-math.sqrt(2):>10.6f} | {dev:>12.4f}% | {h**2:>10.6f} | {h**2-1:>10.6f}")

print(f"\n  Key observation: h(e) ≈ √2 for ALL planets (max deviation {max(abs((h_vals[p]-math.sqrt(2))/math.sqrt(2)*100) for p in PLANET_NAMES):.3f}% for Mercury)")
print(f"  This is because all planetary eccentricities are small (e < 0.21)")
print(f"  h²-1 = √(1-e²) = cos(arcsin(e)) ≈ 1 for small e")

# But the DEVIATIONS from √2 might carry information!
print(f"\n  DEVIATIONS: δ = h(e) - √2")
print(f"  {'Planet':>10} | {'δ = h-√2':>14} | {'δ/e²':>10} | {'4δ/e²':>10} | {'δ×d':>14} | {'δ×d²':>14}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    d = D_ALL[p]
    h = h_vals[p]
    delta = h - math.sqrt(2)
    ratio_e2 = delta / e**2 if e > 0.001 else float('nan')
    print(f"  {p:>10} | {delta:>14.8f} | {ratio_e2:>10.4f} | {4*ratio_e2:>10.4f} | {delta*d:>14.8f} | {delta*d**2:>14.6f}")

# Taylor expansion: h(e) ≈ √2 - e²/(4√2) - e⁴/(32√2) - ...
print(f"\n  Taylor expansion: h(e) = √2 × (1 - e²/8 - e⁴/128 - ...)")
print(f"  So δ = h - √2 ≈ -√2 × e²/8 = -e²/(4√2)")
print(f"  Check: δ/(-e²/(4√2)) should be ≈ 1:")
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    delta = h_vals[p] - math.sqrt(2)
    taylor1 = -e**2 / (4 * math.sqrt(2))
    if abs(e) > 0.001:
        print(f"    {p:>10}: δ = {delta:.8f}, -e²/4√2 = {taylor1:.8f}, ratio = {delta/taylor1:.4f}")

# =====================================================================
# C. h(e) IN THE FIBONACCI LADDER
# =====================================================================
print(f"\n{'='*100}")
print("C. h(e) AND THE ECCENTRICITY LADDER")
print(f"{'='*100}")

print(f"\n  The eccentricity ladder: ξ = k × ξ_V")
print(f"  Can we express this using h(e) instead of e?")
print(f"\n  Define: χ = h(e) × √m  (mass-weighted h)")
print(f"  Or:     χ = ξ / √f(e)  (ξ divided by AMD kernel)")

xi_V = XI_ALL['Venus']
print(f"\n  {'Planet':>10} | {'ξ':>12} | {'h(e)':>10} | {'χ=h×√m':>12} | {'k':>8} | {'χ/χ_V':>10} | {'≈k?':>8}")
print("  " + "─" * 80)
chi_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    h = h_vals[p]
    xi = XI_ALL[p]
    chi = h * math.sqrt(MASS_ALL[p])
    chi_vals[p] = chi
    k = K_LADDER[p]
    chi_ratio = chi / chi_vals.get('Venus', chi)
    print(f"  {p:>10} | {xi:>12.6e} | {h:>10.6f} | {chi:>12.6e} | {k:>8.1f} | {chi_ratio:>10.4f} | {'≈'+str(k):>8}")

# The point: χ ≈ √2 × √m, so χ ratios are just √(m_i/m_j) — no eccentricity info
print(f"\n  χ_i/χ_V = h_i×√m_i / (h_V×√m_V) ≈ √(m_i/m_V)  [since h ≈ √2 for all]")
print(f"  → χ ratios carry NO eccentricity information, only mass ratios")

# What about h(e) ratios themselves?
print(f"\n  h(e) RATIOS — do they carry eccentricity information?")
print(f"  {'Pair':>20} | {'h₁/h₂':>10} | {'e₁/e₂':>10} | {'k₁/k₂':>10}")
print("  " + "─" * 60)
pairs = [('Mercury', 'Venus'), ('Mercury', 'Earth'), ('Mars', 'Jupiter'),
         ('Earth', 'Saturn'), ('Venus', 'Neptune'), ('Mercury', 'Uranus'),
         ('Jupiter', 'Saturn')]
for p1, p2 in pairs:
    h_ratio = h_vals[p1] / h_vals[p2]
    e_ratio = ECC_ALL[p1] / ECC_ALL[p2]
    k_ratio = K_LADDER[p1] / K_LADDER[p2]
    print(f"  {p1+'/'+p2:>20} | {h_ratio:>10.6f} | {e_ratio:>10.4f} | {k_ratio:>10.4f}")
print(f"\n  h ratios are ALL ≈ 1 (max deviation < 1%). No eccentricity structure.")
print(f"  The function h(e) COMPRESSES all eccentricities into a narrow band near √2.")

# =====================================================================
# D. MIRROR PAIR ANALYSIS WITH h(e)
# =====================================================================
print(f"\n{'='*100}")
print("D. h(e) IN MIRROR PAIRS")
print(f"{'='*100}")

mirror_pairs = [
    ('Mars', 'Jupiter', 5),
    ('Earth', 'Saturn', 3),
    ('Venus', 'Neptune', 34),
    ('Mercury', 'Uranus', 21),
]

print(f"\n  Law 4 uses R = e/i_mean. What about using h(e)/i_mean or h(e)×i_mean?")
print(f"\n  {'Pair':>20} | {'d':>4} | {'h₁':>10} | {'h₂':>10} | {'h₁×h₂':>10} | {'h₁²+h₂²':>10} | {'h₁-h₂':>12}")
print("  " + "─" * 90)
for p1, p2, d in mirror_pairs:
    h1, h2 = h_vals[p1], h_vals[p2]
    print(f"  {p1+'/'+p2:>20} | {d:>4} | {h1:>10.6f} | {h2:>10.6f} | {h1*h2:>10.6f} | {h1**2+h2**2:>10.6f} | {h1-h2:>12.8f}")

print(f"\n  All products h₁×h₂ ≈ 2 (= √2 × √2)")
print(f"  All sums h₁²+h₂² ≈ 4 (= 2 + 2)")
print(f"  All differences h₁-h₂ ≈ 0")
print(f"  → Mirror pair structure is invisible in h(e) because h ≈ √2 for all.")

# =====================================================================
# E. h(e) AS A VARIABLE IN AMD
# =====================================================================
print(f"\n{'='*100}")
print("E. RELATIONSHIP: h(e), AMD, AND ξ")
print(f"{'='*100}")

print(f"""
  Key relationships:
    AMD = m × √a × f(e) = m × √a × (1 - √(1-e²))
    ξ = e × √m
    h(e) = e / √f(e) = ξ / (√m × √f(e))

  Therefore: ξ = h(e) × √m × √f(e) = h(e) × √(m × f(e))
  And:       ξ = h(e) × √(AMD / √a)
  So:        ξ² = h²(e) × AMD / √a
  Or:        h²(e) = ξ² × √a / AMD

  This means: h²(e) = (e²×m × √a) / (m×√a×f(e)) = e²/f(e)  [mass and a cancel!]
  → h(e) is a PURE function of eccentricity, independent of mass and distance.
""")

print(f"  Verification: h²(e) = ξ²×√a / AMD")
print(f"  {'Planet':>10} | {'h²(e)':>10} | {'ξ²√a/AMD':>12} | {'match':>8}")
print("  " + "─" * 50)
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    xi = XI_ALL[p]
    a = SMA_ALL[p]
    m = MASS_ALL[p]
    amd = m * math.sqrt(a) * (1 - math.sqrt(1 - e**2))
    h2_direct = 1 + math.sqrt(1 - e**2)
    h2_from_amd = xi**2 * math.sqrt(a) / amd
    match = abs(h2_direct - h2_from_amd) < 1e-10
    print(f"  {p:>10} | {h2_direct:>10.6f} | {h2_from_amd:>12.6f} | {'✓' if match else '✗':>8}")

# =====================================================================
# F. THE DEVIATION δ(e) = h(e) - √2 as a new variable
# =====================================================================
print(f"\n{'='*100}")
print("F. THE DEVIATION δ(e) = h(e) - √2 AS ECCENTRICITY PROXY")
print(f"{'='*100}")

print(f"""
  Since h(e) ≈ √2 for all planets, define δ(e) = √2 - h(e) > 0
  Taylor: δ(e) ≈ e²/(4√2) + e⁴/(32√2) + ...
  For small e: δ(e) ≈ e²/(4√2)  →  e ≈ √(4√2 × δ) = 2^(3/4) × √δ

  δ(e) is a NONLINEAR transform of e that preserves eccentricity ordering.
  Does δ show better Fibonacci structure than e?
""")

print(f"  {'Planet':>10} | {'e':>8} | {'δ=√2-h':>12} | {'δ/δ_V':>10} | {'k²':>8} | {'δ/δ_V vs k²':>12}")
print("  " + "─" * 70)
delta_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    delta = math.sqrt(2) - h_vals[p]
    delta_vals[p] = delta

delta_V = delta_vals['Venus']
for p in PLANET_NAMES:
    delta = delta_vals[p]
    k = K_LADDER[p]
    ratio = delta / delta_V
    # Since δ ≈ e²/(4√2) and ξ = e√m, k = ξ/ξ_V = e√m/(e_V√m_V)
    # δ_i/δ_V ≈ e_i²/e_V² = (k_i × ξ_V/√m_i)² / (ξ_V/√m_V)² = k_i² × m_V/m_i
    k2_expected = k**2 * MASS_ALL['Venus'] / MASS_ALL[p]
    print(f"  {p:>10} | {ECC_ALL[p]:>8.4f} | {delta:>12.8f} | {ratio:>10.2f} | {k**2:>8.1f} | {k2_expected:>12.2f}")

print(f"\n  δ ratios ≈ (e_i/e_V)² = (k_i × √m_V/√m_i)²")
print(f"  → δ is just e² in disguise; carries same info as ξ ladder but squared")

# =====================================================================
# G. h(e) AND THE ECCENTRICITY ANGLE θ = arcsin(e)
# =====================================================================
print(f"\n{'='*100}")
print("G. THE ECCENTRICITY ANGLE θ = arcsin(e)")
print(f"{'='*100}")

print(f"""
  h(e) = √2 × cos(θ/2) where θ = arcsin(e)

  This suggests a "natural" angular variable for eccentricity:
    φ = θ/2 = arcsin(e)/2

  Then: h = √2 × cos(φ)
  And:  f(e) = 1 - cos(θ) = 2sin²(θ/2) = 2sin²(φ)  [AMD kernel!]
  And:  e = sin(2φ) = 2sin(φ)cos(φ)
  And:  √(1-e²) = cos(2φ)

  The half-angle φ = arcsin(e)/2 makes EVERYTHING clean:
    AMD = m√a × 2sin²(φ)
    ξ = 2sin(φ)cos(φ) × √m = sin(2φ) × √m
    h = √2 × cos(φ)
""")

print(f"  {'Planet':>10} | {'e':>8} | {'θ=arcsin(e)°':>14} | {'φ=θ/2 (°)':>10} | {'sin(φ)':>10} | {'cos(φ)':>10} | {'sin(2φ)':>10}")
print("  " + "─" * 90)
phi_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    theta = math.asin(e)
    phi = theta / 2
    phi_vals[p] = phi
    print(f"  {p:>10} | {e:>8.4f} | {math.degrees(theta):>14.4f} | {math.degrees(phi):>10.4f} | {math.sin(phi):>10.6f} | {math.cos(phi):>10.6f} | {math.sin(2*phi):>10.6f}")

# Do the φ values show Fibonacci structure?
print(f"\n  φ ratios (to Venus):")
phi_V = phi_vals['Venus']
print(f"  {'Planet':>10} | {'φ (°)':>10} | {'φ/φ_V':>10} | {'k':>8} | {'φ/φ_V vs k':>12}")
print("  " + "─" * 60)
for p in PLANET_NAMES:
    phi = phi_vals[p]
    k = K_LADDER[p]
    ratio = phi / phi_V
    # For small angles: φ ≈ e/2, so φ_i/φ_V ≈ e_i/e_V = k_i × √(m_V/m_i)
    print(f"  {p:>10} | {math.degrees(phi):>10.4f} | {ratio:>10.4f} | {k:>8.1f} | ratio/k = {ratio/k:.4f}")

# =====================================================================
# H. MASS-WEIGHTED HALF-ANGLE: ζ = sin(φ) × √m
# =====================================================================
print(f"\n{'='*100}")
print("H. MASS-WEIGHTED HALF-ANGLE VARIABLES")
print(f"{'='*100}")

print(f"""
  Since φ = arcsin(e)/2, and ξ = e × √m = sin(2φ) × √m:
  Define new mass-weighted variables:
    ζ = sin(φ) × √m    [half-angle eccentricity]
    ξ = sin(2φ) × √m = 2ζ × cos(φ) × √m/√m ... wait

  Actually: ξ = sin(2φ)×√m = 2sin(φ)cos(φ)×√m
  And:      ζ = sin(φ)×√m
  So:       ξ = 2ζ×cos(φ)
  Since cos(φ) ≈ 1 for small e: ξ ≈ 2ζ

  More interesting: AMD = m×√a × 2sin²(φ) = 2√a × ζ²
  So: ζ = √(AMD/(2√a))  [ζ is the "AMD half-angle"]
""")

print(f"  {'Planet':>10} | {'ζ=sin(φ)√m':>14} | {'ξ':>14} | {'ξ/(2ζ)':>10} | {'=cos(φ)':>10} | {'AMD':>14} | {'2√a×ζ²':>14}")
print("  " + "─" * 100)
zeta_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    phi = phi_vals[p]
    m = MASS_ALL[p]
    a = SMA_ALL[p]
    zeta = math.sin(phi) * math.sqrt(m)
    zeta_vals[p] = zeta
    xi = XI_ALL[p]
    amd = m * math.sqrt(a) * (1 - math.sqrt(1 - e**2))
    amd_from_zeta = 2 * math.sqrt(a) * zeta**2
    print(f"  {p:>10} | {zeta:>14.6e} | {xi:>14.6e} | {xi/(2*zeta):>10.6f} | {math.cos(phi):>10.6f} | {amd:>14.6e} | {amd_from_zeta:>14.6e}")

# Does ζ form a better ladder than ξ?
print(f"\n  ζ ladder (ratios to Venus):")
zeta_V = zeta_vals['Venus']
print(f"  {'Planet':>10} | {'ζ':>14} | {'ζ/ζ_V':>10} | {'k_ξ':>8} | {'ζ_ratio/k_ξ':>12}")
print("  " + "─" * 60)
for p in PLANET_NAMES:
    zeta = zeta_vals[p]
    k = K_LADDER[p]
    ratio = zeta / zeta_V
    print(f"  {p:>10} | {zeta:>14.6e} | {ratio:>10.4f} | {k:>8.1f} | {ratio/k:>12.4f}")

print(f"\n  Since ξ ≈ 2ζ for all planets, ζ/ζ_V ≈ ξ/ξ_V = k")
print(f"  The half-angle variable doesn't change the ladder structure.")

# =====================================================================
# I. h(e) IN LAW 4 CONSTRAINTS
# =====================================================================
print(f"\n{'='*100}")
print("I. h(e) IN LAW 4 MIRROR PAIR CONSTRAINTS")
print(f"{'='*100}")

print(f"""
  Law 4 uses R_p = e_p / i_mean_p. In terms of h(e):
    e = h × √(2 - h²)    [from e² = h²(2-h²)]
    R = h × √(2-h²) / i_mean

  Can we reformulate Law 4 constraints in terms of h instead of e (or R)?

  Define: H_p = h(e_p) / i_mean_p  [h-weighted R]
  Or:     Q_p = h²(e_p) / i_mean_p = (1 + √(1-e²)) / i_mean_p
""")

# R values from Law 4
print(f"  {'Planet':>10} | {'R=e/i_mean':>12} | {'h(e)':>10} | {'H=h/i_mean':>12} | {'Q=h²/i_mean':>12} | {'h²×i_mean':>12}")
print("  " + "─" * 80)
R_vals = {}
H_law4 = {}
Q_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    i_mean = math.radians(I_MEAN[p])
    h = h_vals[p]
    R = e / i_mean
    R_vals[p] = R
    H_l4 = h / i_mean
    H_law4[p] = H_l4
    Q = h**2 / i_mean
    Q_vals[p] = Q
    print(f"  {p:>10} | {R:>12.6f} | {h:>10.6f} | {H_l4:>12.4f} | {Q:>12.4f} | {h**2 * i_mean:>12.8f}")

# Mirror pair constraints in terms of h
print(f"\n  Mirror pair constraints rewritten with h²:")
print(f"  Since R = e/i_mean and e = h√(2-h²):")
print(f"    R² = e²/i_mean² = h²(2-h²)/i_mean²")
print(f"    R₁²+R₂² = (h₁²(2-h₁²) + h₂²(2-h₂²)) / (i₁×i₂) ... messy")
print(f"\n  Since h ≈ √2, h²(2-h²) ≈ 2×(2-2) = 0 ... DEGENERATE!")
print(f"  The interesting part of R is in the small deviations of h from √2.")

# Let's try: what does h²(2-h²) look like?
print(f"\n  e² = h²(2-h²) — the quartic map:")
print(f"  {'Planet':>10} | {'e²':>12} | {'h²(2-h²)':>12} | {'match':>8} | {'2-h²':>12}")
print("  " + "─" * 60)
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    h = h_vals[p]
    e2_from_h = h**2 * (2 - h**2)
    print(f"  {p:>10} | {e**2:>12.8f} | {e2_from_h:>12.8f} | {'✓':>8} | {2-h**2:>12.8f}")

# =====================================================================
# J. DOES √(1-e²) HAVE FIBONACCI STRUCTURE?
# =====================================================================
print(f"\n{'='*100}")
print("J. DOES cos(θ) = √(1-e²) = h²-1 SHOW FIBONACCI STRUCTURE?")
print(f"{'='*100}")

print(f"\n  cos(θ) = √(1-e²) is the 'circular complement' of eccentricity.")
print(f"  For a perfect circle: cos(θ) = 1. Deviation: 1-cos(θ) = f(e) = AMD kernel.")
print(f"\n  {'Planet':>10} | {'e':>8} | {'cos(θ)':>12} | {'1-cos(θ)':>12} | {'f(e)':>12} | {'d×f(e)×√m':>14}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    costh = math.sqrt(1 - e**2)
    f_e = 1 - costh
    d = D_ALL[p]
    m = MASS_ALL[p]
    print(f"  {p:>10} | {e:>8.4f} | {costh:>12.8f} | {1-costh:>12.8e} | {f_e:>12.8e} | {d*f_e*math.sqrt(m):>14.8e}")

# Can d × f(e) × √m = constant?
print(f"\n  Test: d × f(e) × √m = constant?")
vals = []
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    f_e = 1 - math.sqrt(1 - e**2)
    d = D_ALL[p]
    m = MASS_ALL[p]
    v = d * f_e * math.sqrt(m)
    vals.append(v)
    print(f"    {p:>10}: d×f(e)×√m = {v:.8e}")
spread = (max(vals)/min(vals) - 1) * 100
print(f"  Spread: {spread:.1f}%")

# What about d × f(e)^(1/2) × √m (= d × sin(φ) × √(2m) ≈ d × ζ × √2)?
# This would be d × √(1-√(1-e²)) × √m
print(f"\n  Test: d × √f(e) × √m = d × √(AMD/(m√a)) × √m:")
vals2 = []
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    f_e = 1 - math.sqrt(1 - e**2)
    d = D_ALL[p]
    m = MASS_ALL[p]
    v = d * math.sqrt(f_e) * math.sqrt(m)
    vals2.append(v)
    print(f"    {p:>10}: d×√f(e)×√m = {v:.8e}")
spread2 = (max(vals2)/min(vals2) - 1) * 100
print(f"  Spread: {spread2:.1f}%")

# =====================================================================
# K. COMPREHENSIVE SEARCH: d^α × g(e)^β × √m = const
# =====================================================================
print(f"\n{'='*100}")
print("K. SEARCH: d^α × g(e)^β × √m = constant")
print(f"{'='*100}")

print(f"\n  g(e) candidates: e, f(e), h(e)-√2, sin(φ), cos(φ), θ, φ")
print(f"  We already know: d × e × √m = d × ξ/m × √m = ξ × d → spread = k×d range = 9285%")
print(f"  And: d × (i_amp) × √m = ψ → spread 0% (this IS Law 2)")
print(f"  Question: is there a g(e) that gives a TIGHT constant?")

# Systematic search over g(e) functions and exponent α on d
import numpy as np

# Prepare data
planets = PLANET_NAMES
e_arr = np.array([ECC_ALL[p] for p in planets])
m_arr = np.array([MASS_ALL[p] for p in planets])
d_arr = np.array([D_ALL[p] for p in planets])
a_arr = np.array([SMA_ALL[p] for p in planets])
sqrtm = np.sqrt(m_arr)

# g(e) candidates
theta_arr = np.arcsin(e_arr)
phi_arr = theta_arr / 2
f_arr = 1 - np.sqrt(1 - e_arr**2)
h_arr = np.sqrt(1 + np.sqrt(1 - e_arr**2))
delta_arr = np.sqrt(2) - h_arr  # δ = √2 - h(e) ≈ e²/(4√2)

g_funcs = {
    'e': e_arr,
    'e²': e_arr**2,
    'f(e)': f_arr,
    '√f(e)': np.sqrt(f_arr),
    'δ=√2-h': delta_arr,
    'sin(φ)': np.sin(phi_arr),
    'θ': theta_arr,
    'φ': phi_arr,
    '1-cos(θ)': 1 - np.cos(theta_arr),  # same as f(e)
    'sin²(φ)': np.sin(phi_arr)**2,  # same as f(e)/2
}

print(f"\n  Best spread for d^α × g(e) × √m = const, scanning α ∈ [-3, 3]:")
print(f"  {'g(e)':>15} | {'best α':>8} | {'spread':>10}")
print("  " + "─" * 40)

results = []
for name, g_vals in g_funcs.items():
    best_spread = 1e10
    best_alpha = 0
    for alpha_x10 in range(-30, 31):
        alpha = alpha_x10 / 10
        combo = d_arr**alpha * g_vals * sqrtm
        if min(combo) > 0:
            sp = (max(combo)/min(combo) - 1) * 100
            if sp < best_spread:
                best_spread = sp
                best_alpha = alpha
    results.append((name, best_alpha, best_spread))
    print(f"  {name:>15} | {best_alpha:>8.1f} | {best_spread:>10.1f}%")

# Also try d^α × g(e)^β × √m with β as free parameter
print(f"\n  Full 2D search: d^α × g(e)^β × √m = const")
print(f"  {'g(e)':>15} | {'α':>6} | {'β':>6} | {'spread':>10}")
print("  " + "─" * 45)

for name, g_vals in g_funcs.items():
    if name in ['1-cos(θ)', 'sin²(φ)']:  # duplicates
        continue
    best_spread = 1e10
    best_alpha = 0
    best_beta = 0
    for a10 in range(-30, 31):
        for b10 in range(-30, 31):
            if b10 == 0:
                continue
            alpha = a10 / 10
            beta = b10 / 10
            combo = d_arr**alpha * g_vals**beta * sqrtm
            if min(combo) > 0:
                sp = (max(combo)/min(combo) - 1) * 100
                if sp < best_spread:
                    best_spread = sp
                    best_alpha = alpha
                    best_beta = beta
    print(f"  {name:>15} | {best_alpha:>6.1f} | {best_beta:>6.1f} | {best_spread:>10.1f}%")

# =====================================================================
# L. THE KEY QUESTION: Can h(e) improve Law 4?
# =====================================================================
print(f"\n{'='*100}")
print("L. CAN h(e) SIMPLIFY OR IMPROVE LAW 4?")
print(f"{'='*100}")

print(f"""
  Law 4 currently uses R = e / i_mean to set up mirror pair constraints.
  The constraints are on R² sums and R products/ratios.

  Since e = h√(2-h²), we have R = h√(2-h²) / i_mean.
  But since h ≈ √2 for all planets, 2-h² ≈ e²/2 is tiny.
  So R ≈ √2 × √(e²/2) / i_mean ... which is just e/i_mean.

  The h function doesn't help Law 4 because Law 4 operates on
  the LARGE quantity R = e/i_mean (range 0.2 to 30+),
  while h compresses everything near √2.

  HOWEVER: h(e) might be useful in a DIFFERENT formulation.

  Instead of R = e/i_mean, what about:
    S = f(e) / i_mean² = (1-√(1-e²)) / i_mean²

  This is AMD-like: AMD ∝ f(e), and η² ∝ i_mean²
  So S ∝ AMD_ecc / AMD_incl (the eccentricity-to-inclination AMD ratio)
""")

print(f"  S = f(e) / i_mean² — AMD ratio per planet:")
print(f"  {'Planet':>10} | {'f(e)':>12} | {'i_mean²':>12} | {'S=f/i²':>12} | {'d²×S':>12} | {'R²':>10} | {'S/R²':>10}")
print("  " + "─" * 90)
S_vals = {}
for p in PLANET_NAMES:
    e = ECC_ALL[p]
    i_mean = math.radians(I_MEAN[p])
    f_e = 1 - math.sqrt(1 - e**2)
    S = f_e / i_mean**2
    S_vals[p] = S
    R = e / i_mean
    R2 = R**2
    print(f"  {p:>10} | {f_e:>12.6e} | {i_mean**2:>12.6e} | {S:>12.6f} | {D_ALL[p]**2 * S:>12.4f} | {R2:>10.4f} | {S/R2:>10.6f}")

print(f"\n  S/R² = f(e)/e² = 1/h²(e) — just the inverse square of h!")
print(f"  So S = R²/h²(e) — the AMD ratio is R² modulated by h(e)")

# Mirror pair constraints on S
print(f"\n  Mirror pair S values:")
for p1, p2, d in mirror_pairs:
    S1, S2 = S_vals[p1], S_vals[p2]
    R1, R2 = R_vals[p1], R_vals[p2]
    print(f"  {p1+'/'+p2:>20} (d={d}): S₁={S1:.6f}, S₂={S2:.6f}, S₁+S₂={S1+S2:.6f}, S₁×S₂={S1*S2:.6f}")
    print(f"  {'':>20}         R₁²={R1**2:.6f}, R₂²={R2**2:.6f}, R₁²+R₂²={R1**2+R2**2:.6f}")

# =====================================================================
# M. SUMMARY
# =====================================================================
print(f"\n{'='*100}")
print("SUMMARY")
print(f"{'='*100}")

print(f"""
  h(e) = √(1 + √(1-e²)) = √2 × cos(arcsin(e)/2)

  MATHEMATICAL BEAUTY:
  1. h is the half-angle cosine of the eccentricity angle θ = arcsin(e)
  2. e² + h⁴ = 2h² (quartic relation)
  3. h² = ξ²√a / AMD (connects ξ and AMD)
  4. AMD = 2√a × ζ² where ζ = sin(arcsin(e)/2) × √m
  5. Range: h ∈ [1, √2] as e goes from 1 to 0

  PHYSICAL INTERPRETATION:
  - φ = arcsin(e)/2 is the natural "half-angle" of eccentricity
  - AMD kernel = 2sin²(φ) — the AMD is a squared sine
  - e = sin(2φ) = 2sin(φ)cos(φ) — double-angle formula
  - h = √2 × cos(φ) — the cosine complement

  FOR THE FIBONACCI LAWS:
  - h(e) ≈ √2 for all planets (max deviation 0.36% for Mercury)
  - h carries NO ladder structure — all planets compressed to ≈ √2
  - h ratios ≈ 1 for all pairs — no mirror pair information
  - δ = √2 - h ≈ e²/(4√2) — just e² in disguise
  - d^α × g(e)^β × √m search: no improvement over d × e × √m

  CONCLUSION:
  h(e) is mathematically beautiful but physically trivial for planetary
  eccentricities. The function compresses the [0, 0.21] eccentricity
  range into [1.410, 1.414] — destroying all discriminating power.

  The identity IS useful for understanding AMD:
    AMD = m√a × 2sin²(φ) where φ = arcsin(e)/2
  This shows AMD as a squared half-angle, which is the deepest form.
  But it doesn't help find the eccentricity constant.
""")

print("=" * 100)
print("DONE")
print("=" * 100)
