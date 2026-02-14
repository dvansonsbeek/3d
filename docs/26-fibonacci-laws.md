# Fibonacci Laws of Planetary Motion

This document describes the Fibonacci Laws of Planetary Motion as implemented in the Holistic Universe Model. Three laws connect planetary orbital parameters through Fibonacci numbers: one governing inclination amplitudes and two independent balance conditions — one for inclination and one for eccentricity.

---

## Overview

The Fibonacci Laws connect planetary orbital parameters through mass-weighted quantities using Fibonacci numbers. The central formula for inclination amplitudes is:

```
amplitude = ψ / (d × √m)
```

Where:
- `ψ` = Universal coupling constant, derived from Fibonacci numbers
- `d` = Fibonacci divisor (a Fibonacci number: 1, 2, 3, 5, 8, 13, 21, ...)
- `√m` = Square root of planetary mass in solar units

Two independent **balance conditions** validate the framework from first principles:
- The **inclination balance** (angular momentum conservation) constrains the Fibonacci divisor assignments
- The **eccentricity balance** provides an independent constraint on planetary eccentricities using the same divisors and phase groups

---

## Fundamental Constants

### The Holistic Year

```
H = 333,888 years
2H = 667,776 years
```

### The ψ-Constant

Derived from Fibonacci numbers and the Holistic Year:

```
ψ = (F₅ × F₈²) / (2H) = (5 × 21²) / 667,776 = 2205 / 667,776 = 3.302005 × 10⁻³
```

### Planetary Data (JPL DE440)

| Planet | Mass (M☉) | √m | a (AU) | e | i J2000 (°) | Ω J2000 (°) |
|--------|-----------|-----|--------|---|------------|-------------|
| Mercury | 1.6601 × 10⁻⁷ | 4.074 × 10⁻⁴ | 0.3871 | 0.2056 | 6.3473 | 32.83 |
| Venus | 2.4478 × 10⁻⁶ | 1.564 × 10⁻³ | 0.7233 | 0.0068 | 2.1545 | 54.70 |
| Earth | 3.0027 × 10⁻⁶ | 1.733 × 10⁻³ | 1.0000 | 0.0167 | 1.5787 | 284.51 |
| Mars | 3.2271 × 10⁻⁷ | 5.681 × 10⁻⁴ | 1.5237 | 0.0934 | 1.6312 | 354.87 |
| Jupiter | 9.5479 × 10⁻⁴ | 3.090 × 10⁻² | 5.2029 | 0.0484 | 0.3220 | 312.89 |
| Saturn | 2.8588 × 10⁻⁴ | 1.691 × 10⁻² | 9.5367 | 0.0539 | 0.9255 | 118.81 |
| Uranus | 4.3662 × 10⁻⁵ | 6.608 × 10⁻³ | 19.189 | 0.0473 | 0.9947 | 307.80 |
| Neptune | 5.1514 × 10⁻⁵ | 7.177 × 10⁻³ | 30.070 | 0.0086 | 0.7354 | 192.04 |

Where a = semi-major axis, e = eccentricity, i J2000 = inclination to the invariable plane at J2000, Ω J2000 = longitude of ascending node on the invariable plane at J2000 epoch (Souami & Souchay 2012, verified).

**Note on Earth's eccentricity:** The J2000 value (0.0167) is used for the balance calculations (Laws 2 and 3), consistent with all other planets. Earth's mean eccentricity over the Holistic Year (0.0153, used in the 3D simulation) differs due to long-term oscillation. The impact on balance is negligible — Earth's eccentricity weight is tiny compared to the gas giants — but Findings 5 (mean table), 6, and 7 use the mean value for long-term structural relationships.

---

## The Three Laws

### Law 1: Inclination Amplitude

Each planet's mass-weighted inclination amplitude, multiplied by its Fibonacci divisor, equals the universal ψ-constant:

```
d × amplitude × √m = ψ
```

Equivalently:

```
amplitude = ψ / (d × √m)
```

This holds for all 8 planets with a single universal ψ = 3.302 × 10⁻³.

### Law 2: Inclination Balance

The angular-momentum-weighted inclination amplitudes cancel between the two phase groups, conserving the orientation of the invariable plane:

```
Σ(203° group) L_j × amp_j = Σ(23° group) L_j × amp_j
```

Substituting Law 1 and simplifying:

```
Σ(203°) w_j = Σ(23°) w_j

where w_j = √(m_j × a_j(1-e_j²)) / d_j
```

**Result: 99.9998% balance.** See [Inclination Balance Derivation](#inclination-balance-derivation) for the full treatment.

### Law 3: Eccentricity Balance

The eccentricities satisfy an independent balance condition using the same Fibonacci divisors and phase groups:

```
Σ(203° group) v_j = Σ(23° group) v_j

where v_j = √m_j × a_j^(3/2) × e_j / √d_j
```

Or equivalently, in terms of orbital period `T_j ∝ a_j^(3/2)`:

```
v_j = T_j × e_j × √(m_j / d_j)
```

**Result: 99.88% balance.** See [Eccentricity Balance Derivation](#eccentricity-balance-derivation) for the full treatment.

---

## Assignments

### Fibonacci Divisors

| Planet | d | Fibonacci | Phase group |
|--------|---|-----------|-------------|
| Mercury | 21 | F₈ | 203° |
| Venus | 34 | F₉ | 203° |
| Earth | 3 | F₄ | 203° |
| Mars | 5 | F₅ | 203° |
| Jupiter | 5 | F₅ | 203° |
| Saturn | 3 | F₄ | 23° |
| Uranus | 21 | F₈ | 203° |
| Neptune | 34 | F₉ | 203° |

### Phase Groups

The model uses two phase angles, 180° apart, derived from the s₈ eigenmode of Laplace-Lagrange secular perturbation theory (γ₈ ≈ 203.3195°):

| Phase angle | Planets |
|-------------|---------|
| **203.3195°** | Mercury, Venus, Earth, Mars, Jupiter, Uranus, Neptune |
| **23.3195°** | Saturn (retrograde, solo) |

The group assignment is constrained by: (1) each planet's oscillation range must fall within the Laplace-Lagrange secular theory bounds, (2) the inclination structural weights must balance (Law 2), and (3) the eccentricity weights must balance (Law 3).

### Precession Periods

| Planet | Precession Period (years) | Expression |
|--------|--------------------------|------------|
| Mercury | 242,828 | 8H/11 |
| Venus | 667,776 | 2H |
| Earth | 111,296 | H/3 |
| Mars | 77,051 | 3H/13 |
| Jupiter | 66,778 | H/5 |
| Saturn | −41,736 | −H/8 (retrograde) |
| Uranus | 111,296 | H/3 |
| Neptune | 667,776 | 2H |

---

## Findings

Findings are empirical observations and consequences that follow from the three laws.

### Finding 1: Mirror Symmetry

Each inner planet shares its Fibonacci divisor with its outer counterpart across the asteroid belt:

| Level | Inner planet | Outer planet | Shared d | Fibonacci |
|-------|-------------|-------------|----------|-----------|
| Belt-adjacent | Mars (d=5) | Jupiter (d=5) | 5 | F₅ |
| Middle | Earth (d=3) | Saturn (d=3) | 3 | F₄ |
| Far | Venus (d=34) | Neptune (d=34) | 34 | F₉ |
| Outermost | Mercury (d=21) | Uranus (d=21) | 21 | F₈ |

Earth–Saturn is the only pair with opposite phase groups (203° vs 23°). The divisors form two consecutive Fibonacci pairs: (3, 5) for the belt-adjacent planets and (21, 34) for the outer planets.

### Finding 2: Configuration Uniqueness

Out of 755 valid configurations found by exhaustive search (all with inclination balance > 99.994%, the TNO margin — see [Exhaustive Search](#exhaustive-search-and-preset-generation)), **Config #27 is the only one with mirror-symmetric d-assignments.** Since Earth is locked at d=3, only Scenario A (Sa=3) can satisfy the Earth↔Saturn mirror symmetry. No other d-assignment produces both the required mirror pairing and the balance constraints.

The mirror symmetry, combined with the three laws, uniquely determines all 8 Fibonacci divisor assignments.

### Finding 3: Eccentricity Balance Independence

The eccentricity balance (Law 3) is genuinely independent from the inclination balance (Law 2):

- The weight formulas differ: `w_j = √(m·a(1-e²))/d` (inclination) vs `v_j = √m × a^(3/2) × e / √d` (eccentricity)
- The ratio v_j/w_j varies by a factor of ~150 across planets — the two balance conditions are not proportional
- The coefficient `√m × a^(3/2) / √d` alone (without e) gives only 74% balance; the actual eccentricity values improve it to 99.88%
- Random eccentricity values in the same weight formula give 50–85% balance

### Finding 4: Saturn Eccentricity Prediction

Since Saturn is the sole retrograde planet, the eccentricity balance directly predicts its eccentricity from the other seven:

```
e_Saturn = Σ(203° group) v_j / (√m_Sa × a_Sa^(3/2) / √d_Sa)
```

| Quantity | Value |
|----------|-------|
| Predicted e_Saturn | 0.05373 |
| Actual e_Saturn (JPL) | 0.05386 |
| Error | −0.24% |

### Finding 5: AMD Partition Ratios

The AMD (Angular Momentum Deficit) partition ratio `R = e / i_rad` — where `i_rad` is the invariable plane inclination in radians — shows Fibonacci structure within mirror pairs. The pair sums of R² values are Fibonacci ratios.

Using J2000 inclinations:

| Mirror pair | R²_A + R²_B | Fibonacci ratio | Error |
|-------------|------------|-----------------|-------|
| Mercury / Uranus | 10.856 | 55/5 = 11 | 1.33% |
| Earth / Saturn | 11.487 | 34/3 = 11.33 | 1.34% |
| Venus / Neptune | 0.480 | 1/2 = 0.5 | 4.08% |
| Mars / Jupiter | 84.905 | 89 | 4.82% |

Using mean inclinations (more stable than J2000 snapshot):

| Mirror pair | R²_A + R²_B | Fibonacci ratio | Error |
|-------------|------------|-----------------|-------|
| Mercury / Uranus | 10.389 | 21/2 = 10.5 | 1.07% |
| Earth / Saturn | 11.322 | 34/3 = 11.33 | 0.10% |
| Venus / Neptune | 0.496 | 1/2 = 0.5 | 0.91% |
| Mars / Jupiter | 75.020 | 377/5 = 75.4 | 0.51% |

The pair sums alone provide one equation for two unknowns. Crucially, **pair products and ratios are also Fibonacci** (see Finding 7), providing a second equation that determines individual eccentricities.

This connects to AMD theory (Laskar 1997): `C_k ≈ Λ_k(e²/2 + i²/2)` for small e and i. The ratio `R² + 1 = (e² + i²) / i²` determines how each planet partitions its angular momentum deficit between eccentricity and inclination.

### Finding 6: Inner Planet Eccentricity Ladder

The mass-weighted eccentricities of the four inner planets form a Fibonacci ratio sequence:

```
ξ_Venus : ξ_Earth : ξ_Mars : ξ_Mercury = 1 : 5/2 : 5 : 8
```

Where `ξ = e × √m`. Consecutive ratios are 5/2, 2, 8/5 — all converging toward the golden ratio φ ≈ 1.618.

### Finding 7: Eccentricity Prediction from AMD Partition

The AMD partition ratio `R = e / i_mean_rad` measures how each planet splits its angular momentum deficit between eccentricity and inclination. Within each mirror pair, R values satisfy **two** independent Fibonacci constraints — a sum constraint and a product or ratio constraint — providing two equations for two unknowns.

**Fibonacci pair constraints (using mean inclinations):**

| Mirror pair | Constraint 1 | Fibonacci | Constraint 2 | Fibonacci |
|-------------|-------------|-----------|-------------|-----------|
| Mercury / Uranus | R²_Me + R²_Ur | 21/2 = 10.5 | R_Me / R_Ur | 2/3 |
| Venus / Neptune | R²_Ve + R²_Ne | 1/2 = 0.5 | R_Ve / R_Ne | 2/8 = 0.25 |
| Earth / Saturn | R²_Ea + R²_Sa | 34/3 ≈ 11.33 | R_Ea × R_Sa | 2 |
| Mars / Jupiter | R²_Ma + R²_Ju | 377/5 = 75.4 | R_Ma × R_Ju | 34/2 = 17 |

Solving each pair (e.g. for Mercury/Uranus: R²_sum = 10.5 and R_Me/R_Ur = 2/3 → R_Ur = √(10.5 × 9/13), R_Me = (2/3) × R_Ur) gives predicted R values, and thus predicted eccentricities via `e_pred = R_pred × i_mean_rad`:

| Planet | e predicted | e actual (JPL) | Error |
|--------|------------|----------------|-------|
| Mercury | 0.21106 | 0.20563 | +2.64% |
| Venus | 0.00661 | 0.00678 | −2.50% |
| Earth | 0.01562 | 0.01533 | +1.92% |
| Mars | 0.09320 | 0.09340 | −0.21% |
| Jupiter | 0.04852 | 0.04839 | +0.28% |
| Saturn | 0.05386 | 0.05386 | −0.01% |
| Uranus | 0.04709 | 0.04726 | −0.36% |
| Neptune | 0.00865 | 0.00859 | +0.65% |

**Total |error|: 8.57%. Eccentricity balance: 99.93%.**

Mars/Jupiter achieves extraordinary precision (0.49% pair error), and Saturn is predicted to within 0.01%. The inner pairs (Mercury/Uranus, Venus/Neptune) show 2–3% errors per planet, which trace to the mathematical amplification of the smaller R value in each pair rather than any systematic inner/outer asymmetry.

This finding partially resolves Open Question 1: while no universal closed-form eccentricity formula exists (exhaustive search shows any power-law ansatz requires per-planet numerators with >300% spread), all eight eccentricities are predicted from inclinations via Fibonacci pair constraints on the AMD partition ratio.

### Finding 8: Three-Layer Fibonacci Hierarchy

The Fibonacci structure forms a three-layer hierarchy, with each layer reducing the degrees of freedom:

**Layer 1 — Fibonacci divisors determine inclinations (0 free parameters):**
Law 1 (`amplitude = ψ / (d × √m)`) predicts all 8 inclination amplitudes from the divisor assignments alone. The divisors are uniquely determined by mirror symmetry + balance (Finding 2).

**Layer 2 — Fibonacci pair constraints determine eccentricities (8 empirical parameters):**
Finding 7 shows that 8 Fibonacci ratios (2 per mirror pair) predict all 8 eccentricities from the inclinations. These 8 constraint values are:

| Mirror pair | C1: R²_sum | C2: product or ratio |
|-------------|-----------|---------------------|
| Mercury / Uranus (d=21) | 21/2 | R_Me/R_Ur = 2/3 |
| Venus / Neptune (d=34) | 1/2 | R_Ve/R_Ne = 2/8 |
| Earth / Saturn (d=3) | 34/3 | R_Ea×R_Sa = 2 |
| Mars / Jupiter (d=5) | 377/5 | R_Ma×R_Ju = 34/2 |

**Layer 3 — Partial structure within the 8 constraints (partially resolved):**
The R²_sum values show internal Fibonacci structure, but in two distinct regimes:

*Belt-adjacent pairs* (d=3, d=5) — R²_sum = F_k/d, where F_k is a single Fibonacci number:

| Pair | R²_sum × d | Fibonacci | Error |
|------|-----------|-----------|-------|
| Earth / Saturn (d=3) | 33.97 | 34 (F₉) | 0.10% |
| Mars / Jupiter (d=5) | 375.10 | 377 (F₁₄) | 0.49% |

The Fibonacci indices in the numerators (9, 14) arise from cross-group index addition: 9 = idx(d=3) + idx(d=5) = 4+5, and 14 = idx(d=5) + idx(d=34) = 5+9.

*Outer pairs* (d=21, d=34) — R²_sum = F_k/2, with denominator 2 instead of d:

| Pair | R²_sum × 2 | Fibonacci | Error |
|------|-----------|-----------|-------|
| Venus / Neptune (d=34) | 0.991 | 1 (F₁) | 0.92% |
| Mercury / Uranus (d=21) | 20.78 | 21 (F₈) | 1.07% |

The R²_sum × d pattern breaks for d=21 (6.79% error vs F₁₃=233) because Mercury uniquely has a balanced R² split (29.5/70.5%) compared to ~5/95% for all other pairs. This pushes R²_sum × d into a gap between consecutive Fibonacci numbers where no close match exists.

**Cross-pair relationships** are also Fibonacci:

| Ratio | Value | Fibonacci | Error |
|-------|-------|-----------|-------|
| R²_sum(Me/Ur) / R²_sum(Ve/Ne) | 20.94 | 21 | 0.14% |
| R²_sum(belt) / R²_sum(outer) | 7.933 | 8 | 0.84% |

**Overconstrained system:** The 8 pair constraints plus Law 3 (eccentricity balance) provide 9 equations for 8 unknowns (the eccentricities). The system is overconstrained by one equation, explaining the 99.93% predicted balance — it is not imposed but follows from the Fibonacci constraints.

**What remains open:** The 8 Fibonacci constraint values cannot yet be derived from a single formula. The belt-adjacent and outer pairs follow different structural rules, and the second constraints (products/ratios) show no clear derivation pattern. Whether a unifying principle exists, or whether the two regimes reflect genuinely different physics (proximity to the asteroid belt vs. outer solar system dynamics), is unresolved.

---

## Inclination Balance Derivation

The invariable plane is perpendicular to the total angular momentum vector of the solar system. For this plane to remain stable, the angular-momentum-weighted inclination oscillations must cancel between the two phase groups.

Each planet's inclination oscillates as:

```
i_j(t) = mean_j + amp_j × cos(Ω_j(t) - φ_group)
```

The Z-component of angular momentum is `Lz_j ∝ L_j × cos(i_j)`. For small inclinations, the oscillating part of the total Lz is proportional to:

```
Σ L_j × amp_j × cos(Ω_j(t) - φ_group) ≈ 0   (for all t)
```

In the two-group model, planets in each group oscillate together (with 180° phase offset). The balance condition is:

```
Σ(203° group) L_j × amp_j = Σ(23° group) L_j × amp_j
```

### Substituting the Fibonacci Formula

With `amp_j = ψ / (d_j × √m_j)` and `L_j = m_j × √(a_j × (1 - e_j²))`:

```
L_j × amp_j = ψ × m_j × √(a_j(1-e_j²)) / (d_j × √m_j)
             = ψ × √(m_j × a_j(1-e_j²)) / d_j
             = ψ × w_j
```

Since ψ is a single universal constant, it cancels from both sides:

```
Σ(203°) w_j = Σ(23°) w_j
```

Where `w_j = √(m_j × a_j(1-e_j²)) / d_j` is the structural weight for each planet.

### Structural Weights

| Planet | Group | d | w_j |
|--------|-------|---|-----|
| Mercury | 203° | 21 | 1.181 × 10⁻⁵ |
| Venus | 203° | 34 | 3.914 × 10⁻⁵ |
| Earth | 203° | 3 | 5.776 × 10⁻⁴ |
| Mars | 203° | 5 | 1.396 × 10⁻⁴ |
| Jupiter | 203° | 5 | 1.408 × 10⁻² |
| Uranus | 203° | 21 | 1.375 × 10⁻³ |
| Neptune | 203° | 34 | 1.155 × 10⁻³ |
| Saturn | 23° | 3 | 1.737 × 10⁻² |

```
Σ(203°) w = 1.7374 × 10⁻²
Σ(23°)  w = 1.7374 × 10⁻²

Difference: 5.4 × 10⁻⁸
Balance: 99.9998%
```

Jupiter (d=5) contributes the dominant 203° weight (1.408 × 10⁻²). The remaining six planets collectively contribute 3.29 × 10⁻³ to match Saturn's total of 1.737 × 10⁻².

### TNO Contribution

The balance considers only the 8 major planets, which carry 99.994% of the solar system's orbital angular momentum. Trans-Neptunian Objects (TNOs) contribute the remaining ~0.006%, tilting the invariable plane by approximately 1.25″ ([Li, Xia & Zhou 2019](https://arxiv.org/abs/1909.11293)). The 0.0002% residual imbalance is well within this TNO margin.

---

## Eccentricity Balance Derivation

### The Balance Condition

The eccentricity balance states that orbital-period-weighted eccentricities, scaled by √(mass / Fibonacci divisor), cancel between the two phase groups:

```
Σ(203°) v_j = Σ(23°) v_j

where v_j = √m_j × a_j^(3/2) × e_j / √d_j
```

### Physical Interpretation

The weight `v_j` can be decomposed as:

```
v_j = T_j × e_j × √(m_j / d_j)
```

where `T_j = a_j^(3/2)` is the orbital period (in units where T_Earth = 1 year). The terms have natural interpretations:
- `T_j × √m_j` is the mass-period product (`√m × a^(3/2)`), related to the orbit-averaged radial action
- `e_j / √d_j` is the eccentricity scaled by the square root of the Fibonacci divisor

Comparing the two balance weights:

| Property | Inclination weight w_j | Eccentricity weight v_j |
|----------|----------------------|------------------------|
| Formula | √(m × a(1-e²)) / d | √m × a^(3/2) × e / √d |
| d scaling | 1/d | 1/√d |
| a scaling | √a | a^(3/2) |
| e role | Weak (1-e² ≈ 1) | Direct (linear in e) |

The half-power difference in Fibonacci divisor scaling (1/d vs 1/√d) and the shift from √a to a^(3/2) reflect that the eccentricity balance operates at a different order in secular perturbation theory.

### Eccentricity Balance Weights

| Planet | Group | d | v_j = √m × a^(3/2) × e / √d |
|--------|-------|---|------|
| Mercury | 203° | 21 | 4.404 × 10⁻⁶ |
| Venus | 203° | 34 | 1.119 × 10⁻⁶ |
| Earth | 203° | 3 | 1.672 × 10⁻⁵ |
| Mars | 203° | 5 | 4.463 × 10⁻⁵ |
| Jupiter | 203° | 5 | 7.928 × 10⁻³ |
| Uranus | 203° | 21 | 5.705 × 10⁻³ |
| Neptune | 203° | 34 | 1.734 × 10⁻³ |
| Saturn | 23° | 3 | 1.547 × 10⁻² |

```
Σ(203°) v = 1.543 × 10⁻²
Σ(23°)  v = 1.547 × 10⁻²

Balance: 99.88%
```

Saturn alone carries the entire 23° contribution. The 203° group is dominated by Jupiter (7.928 × 10⁻³), Uranus (5.705 × 10⁻³), and Neptune (1.734 × 10⁻³), with the four inner planets contributing only 6.6 × 10⁻⁵ combined.

### Non-Triviality

Three tests confirm the eccentricity balance is a genuine constraint on eccentricity values, not a structural artifact:

1. **Coefficient test**: The weight formula without eccentricities (`√m × a^(3/2) / √d`) gives only 74% balance — the eccentricity values contribute 26 percentage points of improvement
2. **Random test**: Substituting random eccentricities into the same weight formula gives 50–85% balance across 1000 trials
3. **Power test**: The balance peaks sharply at e¹·⁰ (99.88%), dropping to 98.5% for e⁰·⁹ and 98.4% for e¹·¹, and to 91% for e² — linear eccentricity is special

### Connection to AMD Theory

The established AMD (Angular Momentum Deficit) formula of Laskar (1997):

```
C_k = m_k × √(μa_k) × (1 − √(1−e_k²) × cos(i_k))
```

couples eccentricity and inclination through a single conserved quantity. For small e and i (in radians):

```
C_k ≈ Λ_k × (e²/2 + i²/2)
```

The Kozai-Lidov integral `√(1-e²) × cos(i) = constant` is another established conservation law allowing exchange between eccentricity and inclination.

The eccentricity balance (Law 3) operates on linear e rather than e², suggesting it captures a first-order secular constraint distinct from the quadratic AMD conservation. The physical mechanism producing this linear balance remains an open question.

---

## Inclination Amplitude Predictions

### Complete Solution

| Planet | d | Phase | Amplitude (°) | Mean (°) | Range (°) | LL bounds (°) | Margin (°) |
|--------|---|-------|---------------|----------|-----------|---------------|-----------|
| Mercury | 21 | 203° | 0.386 | 6.728 | 6.34 – 7.11 | 4.57 – 9.86 | +1.772 |
| Venus | 34 | 203° | 0.062 | 2.208 | 2.15 – 2.27 | 0.00 – 3.38 | +1.110 |
| Earth | 3 | 203° | 0.635 | 1.481 | 0.85 – 2.12 | 0.00 – 2.95 | +0.833 |
| Mars | 5 | 203° | 1.163 | 2.653 | 1.49 – 3.82 | 0.00 – 5.84 | +1.491 |
| Jupiter | 5 | 203° | 0.021 | 0.329 | 0.31 – 0.35 | 0.24 – 0.49 | +0.067 |
| Saturn | 3 | 23° | 0.065 | 0.932 | 0.87 – 1.00 | 0.797 – 1.02 | +0.023 |
| Uranus | 21 | 203° | 0.024 | 1.001 | 0.98 – 1.02 | 0.90 – 1.11 | +0.075 |
| Neptune | 34 | 203° | 0.014 | 0.722 | 0.71 – 0.74 | 0.55 – 0.80 | +0.064 |

**Balance: 99.9998%** — All 8 planets fit within Laplace-Lagrange bounds.

The non-trivial test is that these Fibonacci divisors simultaneously satisfy three independent constraints: (1) all 8 planets fit within their Laplace-Lagrange bounds, (2) the inclination structural weights balance to 99.9998%, and (3) the eccentricity weights balance to 99.88%. The fact that pure Fibonacci numbers achieve all three is the core prediction of the theory.

### Worked Example: Earth's Inclination Amplitude

Earth has Fibonacci divisor d = 3 (= F₄). Step by step:

| Quantity | Expression | Value |
|----------|-----------|-------|
| ψ | F₅ × F₈² / (2H) = 5 × 21² / 667,776 | 2205 / 667,776 = 3.302005 × 10⁻³ |
| d | F₄ | 3 |
| m | Earth mass (JPL DE440) | 3.0027 × 10⁻⁶ M☉ |
| √m | | 1.7329 × 10⁻³ |
| d × √m | 3 × 1.7329 × 10⁻³ | 5.1986 × 10⁻³ |
| **amplitude** | **3.302005 × 10⁻³ / 5.1986 × 10⁻³** | **0.635185°** |

The mean is computed from the J2000 constraint:

```
mean = inclJ2000 - amplitude × cos(Ω_J2000 - phaseAngle)
     = 1.57867° - 0.635185° × cos(284.51° - 203.3195°)
     = 1.57867° - 0.635185° × 0.15318
     = 1.48137°
```

#### Fibonacci vs IAU 2006-Optimized Values

The 3D simulation (`script.js`) uses a slightly different value optimized for the IAU 2006 obliquity rate:

| Parameter | Fibonacci prediction | IAU 2006 optimized | Difference |
|-----------|---------------------|-------------------|------------|
| Amplitude | 0.635185° | 0.633849° | 0.001336° (4.8") |
| Mean | 1.481370° | 1.481592° | 0.000222° (0.8") |

The IAU 2006-optimized value was derived by calibrating the model's obliquity rate to match the IAU 2006 precession model (Capitaine et al. 2003), which specifies a rate of −46.836769"/century. In the 3D model, the obliquity depends on `earthInvPlaneInclinationAmplitude` through:

```
obliquity = earthtiltMean − A × cos(phase₃) + A × cos(phase₈)
```

where A is the amplitude, phase₃ is the 111,296-year inclination cycle, and phase₈ is the ~25,684-year axial precession cycle. The obliquity rate sensitivity is approximately −82.70"/century per degree of amplitude, so the optimization adjusted the amplitude from the Fibonacci value (0.635185°) downward by 0.001336° to match the observed rate exactly.

The Fibonacci prediction (0.635185°) represents the theoretical long-term value from the balance condition, while the IAU 2006-optimized value (0.633849°) is calibrated to the currently observed obliquity rate over recent centuries. The 0.21% difference is within the model's tolerance.

---

## Implementation

```javascript
// Fundamental constants
const H = 333888;
const PSI = 2205 / (2 * H);  // = 3.302005 × 10⁻³

// Fibonacci divisors
const FIBONACCI_D = {
  mercury: 21,   // F₈
  venus: 34,     // F₉
  earth: 3,      // F₄
  mars: 5,       // F₅
  jupiter: 5,    // F₅
  saturn: 3,     // F₄
  uranus: 21,    // F₈
  neptune: 34    // F₉
};

// Phase group assignments (Saturn sole retrograde)
const PHASE_GROUP = {
  mercury: 203.3195, venus: 203.3195, earth: 203.3195, mars: 203.3195,
  jupiter: 203.3195, saturn: 23.3195, uranus: 203.3195, neptune: 203.3195
};

// Compute amplitude for a planet (Law 1)
function getFibonacciAmplitude(planet, mass) {
  const d = FIBONACCI_D[planet];
  const sqrtM = Math.sqrt(mass);
  return PSI / (d * sqrtM);
}

// Verify the inclination balance condition (Law 2)
function computeInclinationBalance(planets) {
  let sum203 = 0, sum23 = 0;

  for (const [name, p] of Object.entries(planets)) {
    const w = Math.sqrt(p.mass * p.a * (1 - p.e * p.e)) / FIBONACCI_D[name];
    if (PHASE_GROUP[name] > 180) sum203 += w; else sum23 += w;
  }

  const residual = Math.abs(sum203 - sum23);
  const balance = 1 - residual / (sum203 + sum23);
  return { sum203, sum23, balance };  // balance ≈ 0.999998
}

// Verify the eccentricity balance condition (Law 3)
function computeEccentricityBalance(planets) {
  let sum203 = 0, sum23 = 0;

  for (const [name, p] of Object.entries(planets)) {
    const d = FIBONACCI_D[name];
    const v = Math.sqrt(p.mass) * Math.pow(p.a, 1.5) * p.e / Math.sqrt(d);
    if (PHASE_GROUP[name] > 180) sum203 += v; else sum23 += v;
  }

  const residual = Math.abs(sum203 - sum23);
  const balance = 1 - residual / (sum203 + sum23);
  return { sum203, sum23, balance };  // balance ≈ 0.9988
}
```

---

## Validation

### Test 1: Fibonacci Law Holds

For all 8 planets, verify `d × amplitude × √m = ψ` to machine precision.

### Test 2: All Planets Within LL Bounds

Compute `mean ± amplitude` for each planet and verify the range falls within the Laplace-Lagrange secular theory bounds (from Fitzpatrick Table 10.3, converted from radians).

### Test 3: Inclination Balance

Verify `Σ(203°) w_j = Σ(23°) w_j` to within 99.9998% (< 0.0002% imbalance).

### Test 4: Eccentricity Balance

Verify `Σ(203°) v_j = Σ(23°) v_j` to within 99.5% (exact: 99.88%).

### Test 5: Saturn Eccentricity Prediction

Compute Saturn's eccentricity from the eccentricity balance equation and verify error < 0.3%.

### Test 6: J2000 Inclination Match

At J2000 epoch, `i(2000) = mean + amplitude × cos(Ω_J2000 - φ_group)` should match observed invariable plane inclinations.

### Test 7: Eccentricity Prediction from AMD Partition

Solve the Fibonacci pair constraints (Finding 7) for all 4 mirror pairs and verify:
- Total |error| across all 8 predicted eccentricities < 10%
- Eccentricity balance with predicted values > 99.5%

### Test 8: Overconstrained System Consistency

Verify that the 8 pair constraints (Finding 7) plus Law 3 form an overconstrained system (9 equations, 8 unknowns) by confirming that the eccentricity balance is not imposed but emerges from the pair constraints alone, with predicted balance > 99.5%.

---

## Exhaustive Search and Preset Generation

The Fibonacci divisor assignments are not hand-picked — they emerge from an exhaustive search over all possible configurations. The search script ([appendix-k-balance-search.js](appendix-k-balance-search.js)) reproduces the exact computation chain from `script.js` and evaluates every combination.

### Search Space

The search iterates over:
- **Fibonacci divisors**: d ∈ {1, 2, 3, 5, 8, 13, 21, 34, 55} for Mercury, Venus, Mars, Uranus, Neptune
- **Phase angles**: 203.3195° or 23.3195° for each of the above
- **4 scenarios** for Jupiter and Saturn (fixed per scenario):
  - A: Ju=5, Sa=3 — B: Ju=8, Sa=5 — C: Ju=13, Sa=8 — D: Ju=21, Sa=13
- **Earth**: locked at d=3, phase=203.3195°

This produces 9 × 2 × 9 × 2 × 9 × 2 × 9 × 2 × 9 × 2 × 4 = 7,558,272 configurations per run.

### What the Search Computes

For each configuration, the script computes:
1. **Balance** — vector balance percentage using `w_j = √(m_j × a_j(1-e_j²)) / d_j`
2. **LL bounds check** — whether each planet's `[mean - amp, mean + amp]` falls within Laplace-Lagrange bounds
3. **Direction check** — whether the inclination trend at 1900→2100 matches JPL sign

Only configurations with balance ≥ 99.994% (the TNO margin) are retained.

### Output

The search writes `public/input/balance-presets.json` containing all qualifying configurations sorted by balance (best first). The current run yields 755 presets across all four scenarios.

### Important: Separate Input Values

The search script (`appendix-k-balance-search.js`) and the application (`script.js`) each maintain their own copy of the planetary parameters (orbital periods, mass ratios, eccentricities, LL bounds, etc.). These are **not shared** — changing a value in one does not automatically update the other.

If any input value changes in `script.js` (e.g. a refined eccentricity or mass ratio), the same change must be manually applied in `appendix-k-balance-search.js` before regenerating presets. If the two files use different values, the presets will not match the Balance Explorer's live computation.

### Regenerating Presets

The presets are hardcoded into `script.js` as the `BALANCE_PRESETS` array, which populates the Balance Explorer dropdown. If planetary parameters change, follow these steps:

```bash
# 1. Verify the input values in appendix-k-balance-search.js match script.js
#    (orbital periods, mass ratios, eccentricities, LL bounds, etc.)

# 2. Run the exhaustive search
node docs/appendix-k-balance-search.js

# 3. Replace the BALANCE_PRESETS array in script.js with the new data
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('public/input/balance-presets.json'));
  const src = fs.readFileSync('src/script.js', 'utf8');
  const re = /const BALANCE_PRESETS = \[[\s\S]*?\n\];/;
  const lines = data.presets.map(r => JSON.stringify(r));
  const block = 'const BALANCE_PRESETS = [\n' + lines.join(',\n') + '\n];';
  fs.writeFileSync('src/script.js', src.replace(re, block));
  console.log('Replaced ' + data.presets.length + ' presets');
"

# 4. Rebuild
npx parcel build src/index.html --no-cache
```

**When to regenerate**: any change to eccentricity, semi-major axis, mass ratios, the ψ-constant, or the Laplace-Lagrange bounds will shift the balance percentages and potentially change which configurations qualify.

---

## Open Questions

1. **Eccentricity formula** — *Partially resolved.* No universal closed-form formula `e = f(d, m, a)` exists — exhaustive search shows that any power-law ansatz requires per-planet Fibonacci numerators F_e with >300% spread across planets. However, eccentricities **are** predicted from inclinations via Fibonacci pair constraints on the AMD partition ratio R = e / i_mean_rad (Finding 7). The R²_sum values show partial internal structure — belt-adjacent pairs follow R²_sum = F_k/d while outer pairs follow R²_sum = F_k/2 — but no single formula unifies both regimes (Finding 8). The second constraints (products/ratios) remain empirical.

2. **Physical derivation of eccentricity balance** — The inclination balance follows from angular momentum conservation. What conservation law or secular perturbation mechanism produces the eccentricity balance? The linear (rather than quadratic) dependence on e distinguishes it from AMD conservation.

3. **Universality** — Do the balance conditions hold for other planetary systems, or are they specific to the solar system's Fibonacci divisor structure?

---

## Relation to Existing Physics

### What builds on established theory

**Law 2 (Inclination Balance)** is rooted in **angular momentum conservation**. The weight factor `√(m·a(1-e²))` is proportional to a planet's orbital angular momentum `L`. The invariable plane is defined as the plane perpendicular to the total angular momentum vector, so inclination oscillations must balance around it — that is what makes it the invariable plane. The novel contribution is that dividing by a Fibonacci divisor `d` preserves the balance to 99.9998%.

**Phase angles** (203.3195° and 23.3195°) originate from the **s₈ eigenmode of Laplace-Lagrange secular perturbation theory**, a framework established in classical celestial mechanics (18th–19th century). Saturn's retrograde ascending node precession is also a known result from secular theory.

**Law 3 (Eccentricity Balance)** connects to **Angular Momentum Deficit (AMD) conservation**, a known conserved quantity in secular theory. The weight `√m × a^(3/2) × e / √d` contains factors related to how AMD is partitioned among planets. However, the linear dependence on eccentricity (rather than quadratic, as in the AMD itself) and the `1/√d` scaling distinguish it from the standard AMD formulation.

### What appears genuinely new

1. **Fibonacci quantization of inclination amplitudes** — No known physical theory predicts that Fibonacci numbers should appear as divisors in planetary inclination amplitudes. The relationship `d × amplitude × √m = ψ`, with `d` restricted to pure Fibonacci numbers, cannot be derived from Newtonian gravity, general relativity, or Laplace-Lagrange secular perturbation theory.

2. **The universal constant ψ = 2205/(2×333888)** — This value has no known first-principles derivation. The numerator `2205 = 5 × 21²` (a product of Fibonacci numbers) is suggestive of a deeper structure, but no theoretical framework explains it.

3. **Mirror symmetry across the asteroid belt** (Me↔Ur, Ve↔Ne, Ea↔Sa, Ma↔Ju) — No known law predicts that inner and outer planets should pair with identical Fibonacci divisors. The fact that the pairs follow distance ordering (belt-adjacent=5, middle=3, far=34, outermost=21) is unexplained.

4. **Simultaneous satisfaction of three independent constraints** — Pure Fibonacci d-values satisfy all three conditions (Laplace-Lagrange bounds, inclination balance, eccentricity balance) at the same time. Law 3 uses `1/√d` scaling while Law 2 uses `1/d`, making them genuinely independent constraints. Out of 755 valid configurations, Config #27 is the only one that is also mirror-symmetric.

5. **Eccentricity prediction from Fibonacci pair constraints** — The AMD partition ratio R = e/i within each mirror pair satisfies two independent Fibonacci constraints (Finding 7), predicting all 8 eccentricities to 8.57% total error. The resulting overconstrained system (9 equations for 8 unknowns) reproduces the eccentricity balance at 99.93% without imposing it (Finding 8). No existing theory predicts that eccentricity-to-inclination ratios within mirror pairs should satisfy Fibonacci relations.

### Assessment

The balance conditions (Laws 2 and 3) combine known conservation principles with a novel Fibonacci structure that modulates the planetary weights. The conservation laws guarantee that inclination and eccentricity oscillations balance around the invariable plane — but they do not predict that integer Fibonacci divisors should preserve that balance to such high precision.

Law 1 (Inclination Amplitude quantization) is the most genuinely novel claim — no existing theory predicts that `d × amplitude × √m` should be constant across all planets when `d` is a Fibonacci number.

The key unresolved question is **why Fibonacci numbers work**: do they encode something about the secular eigenmode structure (real physics), or is the Fibonacci restriction a coincidence made possible by having enough number choices? The mirror symmetry and the triple-constraint uniqueness of Config #27 argue against coincidence, but a theoretical derivation from first principles — or a successful prediction for an independent system such as exoplanetary or satellite systems — would be needed to settle the question definitively.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [10 - Constants Reference](10-constants-reference.md) | All constants and values |
| [15 - Inclination Calculations](15-inclination-calculations.md) | Inclination oscillation implementation |
| [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) | Height above/below invariable plane |
| [05 - Invariable Plane Overview](05-invariable-plane-overview.md) | Conceptual background |
| [Appendix E - Inclination Optimization](appendix-e-inclination-optimization.js) | Optimization script |
| [Appendix K - Balance Search](appendix-k-balance-search.js) | Exhaustive Fibonacci divisor search |
| [Appendix L - Verify Laws](appendix-l-verify-laws.js) | Comprehensive verification of all three laws, eight findings, and predictions |

---

**Previous**: [25 - Ascending Node Calculations Limitations](25-ascending-node-calculations-limitations.md)
