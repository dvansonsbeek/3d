# 39 — Eccentricity Structure Exploration

## Overview

This document records the exploratory analysis of planetary eccentricity structure — what patterns exist beyond the balance scale (doc 38), what was tested and rejected, and what open gaps remain. It serves as a research log documenting both positive findings and exhaustive negative results.

The key conclusion: **no universal eccentricity constant exists** (analogous to the ψ-constant for inclination). Eccentricity base values are determined by the balance system (Laws 4 + 5), not by a single per-planet formula. However, the eccentricity *amplitude* does have a universal constant K.

---

## Two-Component Decomposition

Each planet's base eccentricity decomposes into two physically distinct parts:

```
e_base = e_structural + e_amplitude
```

where:
- **e_structural** — the tilt-independent foundation, carrying >84% of e_base for all planets
- **e_amplitude** — the oscillation amplitude, fully explained by the universal K constant

| Planet | e_base | e_amplitude | e_structural | structural % |
|--------|--------|-------------|-------------|-------------|
| Mercury | 0.205636 | 8.350e-5 | 0.205552 | 99.96% |
| Venus | 0.006796 | 9.526e-4 | 0.005805 | 85.90% |
| Earth | 0.015386 | 1.356e-3 | 0.014030 | 91.19% |
| Mars | 0.092975 | 3.042e-3 | 0.089934 | 96.73% |
| Jupiter | 0.048215 | 1.138e-6 | 0.048214 | 100.00% |
| Saturn | 0.053745 | 5.347e-6 | 0.053740 | 99.99% |
| Uranus | 0.047344 | 2.802e-5 | 0.047316 | 99.94% |
| Neptune | 0.008686 | 8.014e-6 | 0.008678 | 99.91% |

The gas giants have negligible amplitudes (tiny axial tilts → tiny sin(tilt)), so their base and structural values are nearly identical. The inner planets, especially Venus and Earth, have significant amplitude contributions.

### Eccentricity Time-Variation Formula

The observed eccentricity at any time is the geometric distance between two circular orbits — the law of cosines:

```
e(t) = sqrt(base² + amp² - 2·base·amp·cos(θ))
```

where `θ = 2π·(year - refYear) / (H/16)` and `refYear` is derived from the J2000 phase angle.

This formula arises from the model's geocentric geometry: Earth orbits the wobble-center at radius `amplitude`, while the wobble-center (perihelion point) orbits the Sun at radius `base`. The distance between Earth and Sun varies as the two orbits precess relative to each other with period H/16.

**Phase at J2000** (`eccentricityPhaseJ2000`): derived analytically from the law of cosines inverted at J2000:

```
cos(θ_J2000) = (base² + amp² - e_J2000²) / (2·base·amp)
phase = acos(cos(θ_J2000)) × 180/π
```

All base eccentricities, amplitudes, and phases are now derived at runtime from the balanced-year phase and K constant (see constants.js section E2d and the closed-loop document [doc 72](72-the-closed-loop.md)). Every planet's J2000 eccentricity is reachable within one oscillation amplitude of its phase-derived base.

### Balance with structural eccentricities

- **Base eccentricities**: ~99.86% Law 5 balance (phase-derived, not forced)
- **Structural eccentricities**: ~99.98% balance (removing amplitudes adds ~0.02% imbalance)
- **J2000 eccentricities**: 99.88% balance (a snapshot with current oscillation phases)

This confirms that the structural component carries the balance, and the amplitude is a perturbation on top.

---

## Mirror Pair Conservation Laws

### Discovery

Within each mirror pair, the structural eccentricities satisfy a power-law conservation:

```
e_in × a_in^α ≈ e_out × a_out^α
```

where α is a simple fraction, often with a Fibonacci denominator:

| Mirror pair | α | Fraction | Error | Fibonacci denom? |
|-------------|---|----------|-------|-----------------|
| Mars / Jupiter | +0.500 | 1/2 | 0.94% | Yes (F₃) |
| Earth / Saturn | −0.600 | −3/5 | 0.78% | Yes (F₅) |
| Mercury / Uranus | +0.375 | 3/8 | 0.60% | Yes (F₆) |
| Venus / Neptune | −0.136 | −3/22 | 0.12% | No (22 is not Fibonacci) |

Three of four pairs have Fibonacci-denominator exponents. The Venus/Neptune pair's best fit (−3/22) does not have a Fibonacci denominator, which may indicate this pattern is approximate rather than fundamental.

### Predictions from conservation

Given one planet's eccentricity, the conservation law predicts its mirror partner's:

| Reference | Predicted | Error |
|-----------|-----------|-------|
| Mars → Jupiter | 0.0484 | ~1% |
| Jupiter → Mars | 0.0934 | ~1% |
| Earth → Saturn | 0.0539 | ~1% |
| Saturn → Earth | 0.0154 | ~1% |

These predictions are independent of the balance equation and provide a cross-check.

### Caveat

These conservation laws may be an artifact of the tuned balance + specific d-values rather than an independent physical law. With only 2 planets per pair, overfitting is a risk.

---

## Statistical Significance

The structure script runs five statistical tests to assess whether the observed patterns could arise by chance:

### Test A: Single pair conservation
For random planet pairs (log-uniform e and a), the probability of finding a simple-fraction α that matches within 1.1% is ~20%. Not significant alone.

### Test B: All 4 pairs simultaneously
P(all 4 match) = P(single)⁴ ≈ 0.16%. Unlikely but not extraordinary.

### Test C: Fixed orbits, random eccentricities
Using actual solar system distances but random eccentricities, the probability that all 4 mirror pairs show Fibonacci-denominator α within 1.1% drops to ~0.01%.

### Test D: Combined — conservation + balance
Requiring BOTH all 4 α to be Fibonacci-denominator fractions AND Law 5 balance ≥ 99.9%: **0 occurrences in 200,000 trials** (P < 0.0005%).

### Test E: Permutation test
Shuffling the 8 actual eccentricity values among the 8 planets (8! = 40,320 permutations): only ~0.8% of assignments produce Fibonacci-denominator α for all 4 pairs. Combined with balance, the probability is negligible.

**Conclusion**: The mirror pair conservation + balance combination is statistically significant (P < 10⁻⁵), but the conservation alone is only marginally significant (P ≈ 0.8%).

---

## Inner vs Outer Planet Dichotomy

The structural eccentricities follow different scaling laws for inner and outer planets:

- **Outer planets**: e_struct × m × a^2.5 / √i_amp ≈ constant (RSD ~8.5%)
- **Inner planets**: e_struct × m ≈ constant (RSD ~36%)

The gap factor between groups is ~500,000 (across the asteroid belt). This dichotomy suggests that different physical mechanisms dominate eccentricity determination in the inner and outer solar system.

---

## Exhaustive Negative Results

Ten directions were explored in search of a universal eccentricity constant (analogous to ψ for inclination). All were rejected:

| Direction | Approach | Result |
|-----------|----------|--------|
| 1 | R = e/i_mean as function of physical quantities | Best RSD 63% |
| 2 | AMD partition fractions | Tautology — restates e |
| 3 | AMD/L ratio | Tautology — e²/2 + i²/2 |
| 4 | Eccentricity vector conservation | Vectors don't cancel |
| 5 | Formation damping model e = e₀ × exp(−t/τ) | No correlation |
| 6 | Obliquity-eccentricity angular coupling | Best RSD 69% |
| 7 | Secular eigenfrequencies g₁–g₈ | r = 0.31, no correlation |
| 8 | Jupiter coupling × resonance proximity | No combination < 60% RSD |
| 9 | 3-body perturbation from two neighbors | No combination < 60% RSD |
| 10 | Multivariate regression | 5 parameters needed for R² > 0.99 |

### The regression formula (exploratory, not a law)

The best multivariate fit (5 parameters, R² = 0.9945):

```
e = χ × a^0.59 × m^(-0.48) × tilt^(-0.40) × i_amp^(-0.35) × T_prec^(-1.44)
```

Substituting known relations:

```
e ≈ χ'' × a^(3/5) × m^(-1/3) × tilt^(-2/5) × d^(1/3) × (b/a_frac)^(7/5)
```

where χ'' ≈ 1.31 × 10⁻⁴ (RSD = 12.8%, max error = 23.6%).

**Caveat**: 5 parameters for 8 data points leaves only 3 degrees of freedom. The exponents are not clean fractions. This is a regression, not a law.

### Theoretical floor

| Parameters | R² | Interpretation |
|-----------|-----|---------------|
| 2 | 0.70 | 70% of variance explained |
| 3 | 0.81 | 81% |
| 4 | 0.985 | 98.5% |
| 5 | 0.994 | 99.4% |

The remaining 1–2% may require formation history rather than orbital mechanics.

---

## Key Difference from Inclination

Inclination amplitudes depend only on mass and Fibonacci divisor (no distance):

```
i_amp = ψ / (d × √m)    ← 2 factors, universal constant ψ
```

Eccentricity depends on distance, mass, tilt, Fibonacci divisor, AND precession period:

```
e ≈ f(a, m, tilt, d, T_prec)    ← 5 factors, no clean factorization
```

This fundamental difference explains why no single eccentricity constant exists. The eccentricity is determined by the *system* of balance equations (Laws 4 + 5), not by a per-planet formula.

---

## Open Gaps

1. **Venus/Neptune α = −3/22**: Why is 22 not Fibonacci when the other three pairs have Fibonacci denominators? Is there a better fraction, or is this pair genuinely different?

2. **Inner planet scaling**: The e × m ≈ constant relation for inner planets has 36% RSD — too poor for a law. What determines the inner planet eccentricities beyond the balance?

3. **Physical mechanism for conservation**: What secular perturbation process produces e × a^α = constant within mirror pairs? Is this a consequence of AMD exchange?

4. **The 5-parameter regression**: Are the exponents (3/5, −1/3, −2/5, 1/3, 7/5) physically meaningful, or artifacts of overfitting? A 9th planet or exoplanet system could test this.

5. **Structural vs amplitude balance**: ~~unresolved~~ **resolved**. Base eccentricities are now derived from the balanced-year phase. The eccentricity balance emerges naturally at ~99.9% — no forcing. The ~0.1% residual may reflect minor body contributions or planetary mass uncertainties. See [The Closed Loop](72-the-closed-loop.md).

---

## References

- [Fibonacci Laws](10-fibonacci-laws.md) — Laws 4 and 5 (eccentricity constant and balance)
- [Eccentricity Balance Scale](38-eccentricity-scale.md) — The balance scale visualization and interpretation
- [Tilt and Balance Calculations](36-tilt-and-definitive-balance-calculations.md) — Detailed derivations
- [fibonacci_eccentricity_structure.py](../scripts/fibonacci_eccentricity_structure.py) — Exhaustive 10-direction exploration with statistical significance tests
- [fibonacci_eccentricity_scale.py](../scripts/fibonacci_eccentricity_scale.py) — Balance scale numerical exploration
- **Interactive visualization**: Tools → "Eccentricity Balance Scale" in the 3D simulation
