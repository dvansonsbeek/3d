# 38 — The Eccentricity Balance Scale

## Overview

The planetary eccentricities are determined by a balance scale — not by individual per-planet formulas, but by a system of simultaneous relationships that constrains all 8 eccentricities at once, analogous to how Kepler's T² = a³ relates all periods to distances through a single principle.

The eccentricities used in this balance are the **base eccentricities** — the long-term mean values around which each planet's eccentricity oscillates over its eccentricity cycle. These differ slightly from the J2000 measured values (e.g., Earth's base = 0.015386 vs J2000 = 0.016710).

The balance equation (Law 5) can be expressed as a physical scale:

```
target's perihelion offset = Σ W_j × offset_j   (sum over contributing planets)
```

where each planet has:
- A **weight**: W_j = √(m_j/m_target × d_target/d_j × a_j/a_target) — combining mass, Fibonacci divisor, and distance ratios relative to the target planet
- A **position**: offset_j = e_base_j × a_j — the perihelion offset in AU

Saturn (the sole anti-phase group member) sits alone on one side. The other 7 planets must collectively balance it. The equation can also be solved for any other planet as the target.

---

## The Scale Diagram

```
LEFT side (in-phase group):                RIGHT side (anti-phase group):
┌─────────────────────┐                ┌─────────────────────┐
│ Jupiter  51.2%      │                │ Saturn  100%        │
│ Uranus   37.0%      │       ⚖        │                     │
│ Neptune  11.4%      │                │                     │
│ Mars      0.3%      │                │                     │
│ Earth     0.1%      │                │                     │
│ Mercury   0.03%     │                │                     │
│ Venus     0.01%     │                │                     │
└─────────────────────┘                └─────────────────────┘
```

---

## The Weight Formula

Each planet's weight on the scale relative to the target:

```
W_j = √( m_j/m_target × d_target/d_j × a_j/a_target )
```

This weight has three competing factors:

| Factor | Meaning | Example (Jupiter vs Saturn) |
|--------|---------|------------------|
| m_j/m_target | Mass ratio — heavier → more influence | 3.34 |
| d_target/d_j | Fibonacci ratio — higher d → less influence | 3/5 = 0.60 |
| a_j/a_target | Distance ratio — farther from Sun → more leverage | 0.55 |

**Product for Jupiter: 3.34 × 0.60 × 0.55 = 1.09 → W = √1.09 = 1.046 ≈ 1**

Jupiter's mass advantage is almost exactly cancelled by its Fibonacci disadvantage (d=5 vs Saturn's d=3) and its distance disadvantage (closer to the Sun than Saturn, so less leverage). This three-way cancellation makes Jupiter the natural balance center of the in-phase group.

---

## Building Saturn's Offset (0.512254 AU)

Saturn's perihelion offset is the weighted sum of the in-phase group:

| Planet | Offset (e×a) | × Weight | = Contribution | Cumulative | % of Saturn |
|--------|-------------|----------|---------------|------------|-------------|
| Jupiter | 0.2507 AU | × 1.046 | = 0.2623 AU | 0.2623 AU | 51.2% |
| Uranus | 0.9064 AU | × 0.209 | = 0.1896 AU | 0.4519 AU | 88.2% |
| Neptune | 0.2601 AU | × 0.224 | = 0.0583 AU | 0.5102 AU | 99.6% |
| Mars | 0.1422 AU | × 0.010 | = 0.0014 AU | 0.5116 AU | 99.9% |
| Earth | 0.0154 AU | × 0.033 | = 0.0005 AU | 0.5121 AU | 100.0% |
| Mercury | 0.0795 AU | × 0.002 | = 0.0002 AU | 0.5123 AU | 100.0% |
| Venus | 0.0044 AU | × 0.008 | = 0.0000 AU | 0.5123 AU | 100.0% |
| **Total** | | | | **0.512254 AU** | **= Saturn** |

The scale formulation is a rewriting of the Law 5 balance equation in physical terms. Its value lies in revealing the structure: which planets dominate, how the contributions build up, and why certain ratios emerge.

---

## Every Planet as the Balance Target

The balance equation can be solved for ANY planet — given 7 eccentricities, the 8th is determined. For in-phase planets, Saturn pushes (+) while other in-phase planets pull back (-). The eccentricity is the residual of a tug-of-war.

### Saturn (anti-phase — all contributions positive)

Simply the sum of all in-phase planets' weighted offsets. Jupiter provides the foundation (51%), Uranus and Neptune add the rest.

### Jupiter (in-phase — Saturn pushes, giants pull back)

| Planet | Contribution |
|--------|-------------|
| Saturn | +0.490 AU (pushes) |
| Uranus | -0.181 AU (pulls back) |
| Neptune | -0.056 AU (pulls back) |
| Inner planets | -0.002 AU |
| **Residual** | **= 0.251 AU** |

Jupiter is the **balance center** of the in-phase group. Its offset is what remains after Uranus and Neptune partially cancel Saturn's push. If only Jupiter and Saturn existed, their offsets would be nearly equal (W ≈ 1). The additional contributions of Uranus and Neptune on the in-phase side are what push Saturn's total offset to ≈ 2× Jupiter's.

### Earth (in-phase — tiny residual of a massive tug-of-war)

| Planet | Contribution |
|--------|-------------|
| Saturn | **+15.43 AU** (pushes) |
| Jupiter | -7.90 AU (pulls back) |
| Uranus | -5.71 AU (pulls back) |
| Neptune | -1.75 AU (pulls back) |
| Mars | -0.04 AU |
| Mercury, Venus | -0.02 AU |
| **Residual** | **= 0.015 AU** |

Earth's small eccentricity (0.015) is NOT because it is weakly influenced. Saturn's weighted contribution is 15 AU, but the other gas giants pull back almost as hard. The eccentricity is the tiny residual — just 0.1% of Saturn's push.

### Venus (smallest eccentricity — most complete cancellation)

| Planet | Contribution |
|--------|-------------|
| Saturn | **+67.7 AU** (pushes) |
| Jupiter | -34.6 AU |
| Uranus | -25.1 AU |
| Neptune | -7.7 AU |
| Mars, Earth, Mercury | -0.3 AU |
| **Residual** | **= 0.004 AU** |

Venus has the most nearly perfect cancellation in the solar system. The gas giants balance each other to 99.99% at Venus's position on the scale, leaving a perihelion offset of just 0.004 AU.

---

## The Jupiter/Saturn 1:2 Ratio

The observation that Saturn's perihelion offset (0.512 AU) is approximately twice Jupiter's (0.251 AU) is a **derived consequence** of the balance, not a fundamental law.

The ratio arises because:
- Jupiter contributes 51.2% of Saturn's offset (W ≈ 1 means Jupiter's own offset passes through nearly unchanged)
- Uranus and Neptune contribute 48.4% more — almost as much as Jupiter itself
- Total: Jupiter's offset × (1 + 0.48/0.51) ≈ Jupiter's offset × 1.95 ≈ 2× Jupiter

If Uranus and Neptune contributed exactly as much as Jupiter, the ratio would be exactly 2. They contribute 94.6% of Jupiter's share, giving 1:1.95 ≈ 1:2.

---

## The e×a×m Ratio ≈ 2:1

> **Note**: This is a secondary observation, not the balance law itself.

The product e × a × m summed over each group shows a near-2:1 ratio:

```
Σ(in-phase) e×a×m = 2.925 × 10⁻⁴
Saturn   e×a×m = 1.464 × 10⁻⁴
Ratio = 1.997 ≈ 2
```

The actual balance law uses e × a^1.5 × √m / √d (balanced at 1:1). The 2:1 ratio in e×a×m arises because Jupiter dominates 81.8% of the in-phase sum, and the Jupiter/Saturn e×a×m ratio of 1.63 is amplified by the other planets to ≈ 2.

---

## The Eccentricity Amplitude Constant

While eccentricity base values are determined by the balance system (no single formula), the eccentricity **amplitude** — how much each planet's eccentricity oscillates over time — has a genuine universal constant:

```
e_amp = K × sin(tilt) × √d / (√m × a^1.5)
```

K = 3.4149 × 10⁻⁶ — derived from Earth's mean parameters (obliquity = 23.41354°, eccentricity amplitude = 0.001356). This is the eccentricity analog of the ψ-constant for inclination amplitudes.

Each planet's eccentricity oscillates around its base value over an **eccentricity cycle** (the meeting frequency of axial and perihelion precession in ICRF). For Earth this cycle is ~20,957 years; other planets have their own cycle periods. At any given time:

```
e(t) = √(e_base² + e_amp²) + (-e_amp - h₁·cos θ)·cos θ
```

where θ = 360° × (t - t₀) / cycle_period and h₁ = √(e_base² + e_amp²) - e_base. The J2000 eccentricity is simply e(2000) — a snapshot of this oscillation. The base value is what the balance scale determines; the amplitude determines how far the planet departs from it.

### Candidate relations between K and ψ

Two numerical coincidences have been found relating K to the inclination constant ψ = 2205/(2H):

| Relation | Value | Error vs K |
|----------|-------|-----------|
| K ≈ ψ²/π | 3.4411 × 10⁻⁶ | 0.77% |
| K ≈ ψ^(11/5) | 3.4453 × 10⁻⁶ | 0.89% |

- **ψ²/π** would imply eccentricity oscillations are a second-order effect of inclination coupling (ψ²), divided by π. However, π has no clear physical derivation in this context — why π and not 2π (full orbit) or 4π² (Kepler)?
- **ψ^(11/5)** uses L₅/F₅ = 11/5, connecting the 5th Lucas number to the 5th Fibonacci number. This keeps everything in the Fibonacci/Lucas framework without transcendental constants, but 11 is not a Fibonacci number.

Both are **noted as numerical coincidences**, not claimed as identities. Further investigation is needed. See [predict_tilt_from_eccentricity.py](../scripts/predict_tilt_from_eccentricity.py) for full analysis.

### Tilt prediction from eccentricity

If K is accepted as universal, the formula can be inverted to predict axial tilts from eccentricity data. Using JPL J2000 eccentricities as independent observations:

- **Inner planets (Venus, Earth, Mars)**: tilts predicted to within 0.03° — the eccentricity amplitude is large enough to constrain the fit
- **Outer planets (Jupiter–Neptune)**: tilts cannot be constrained — the gap between balance-derived e_base and JPL's J2000 value exceeds the maximum possible amplitude for any tilt

This inner/outer distinction arises because the amplitude formula produces tiny values for gas giants (large √m × a^1.5 in the denominator), while the base-J2000 gap reflects uncertainties in both the balance system and JPL measurements.

---

## The Kepler Analogy

| Kepler's 3rd Law (1619) | Eccentricity Balance (Law 5) |
|-------------------------|------------------------------|
| T² = a³ | One balance equation in 8 unknowns |
| One equation, all planets | One equation, all planets |
| No free parameters per planet | Saturn determined; the other 7 are inputs |
| Physical basis: gravity | Physical basis: secular perturbation balance |
| Individual T follows from a | Saturn's e follows from the other seven |

Law 5 relates all eight planets through a single principle. Individual values are not predicted by per-planet formulas — the law IS the relationship itself. Given seven of the eight eccentricities, the eighth is uniquely determined.

The current system:
- **Law 5**: Σ(in-phase) √m × a^1.5 × e / √d = Σ(anti-phase) same — one equation, predicts Saturn from the other seven to ~0.001%
- **Law 4**: open placeholder — see [10-fibonacci-laws.md § Law 4](10-fibonacci-laws.md#law-4-the-eccentricity-constant-open--placeholder). The four mirror-pair Fibonacci R² targets earlier framed as Law 4 were shown by three independent searches in 2026 to be at the noise level of the dense Fibonacci/Lucas combination space, and have been retracted as a derivation. Reformulating Law 4 to predict the remaining seven eccentricities (or finding a single physical constant tying eccentricity to a quantity outside `(m, a, d)` space) is an open research question.

Where R = e / i_mean_rad and i_mean is derived from the ψ-constant. The R values still cluster near small Fibonacci ratios as a *descriptive observation*, but not significantly tighter than chance for the candidate space.

---

## Open Questions

1. **What completes Law 4?** Law 5 alone is one equation in eight unknowns; predicting the remaining seven eccentricities requires either three more independent balance equations (none exist in the (m, a, d) parameter space — see [`scripts/fibonacci_law4_balance_search.py`](../scripts/fibonacci_law4_balance_search.py)) or a physical constant tying eccentricity to a quantity outside (m, a, d). Neither has been found.

2. **The R-value clustering**: The R = e/i_mean ratios cluster near small Fibonacci/Lucas combinations descriptively. Is there a physical mechanism behind the clustering that we have not yet uncovered, or is it noise from the dense candidate space (75% of random targets find a Fibonacci/Lucas match within 1%)?

3. **Time evolution**: As eccentricities oscillate (with the amplitude formula), does Law 5's balance stay perfect at every moment? Or does it only balance at specific epochs? See [epoch-independence.js](../tools/verify/epoch-independence.js) for the analysis.

4. **Can K be derived from first principles?** K ≈ ψ²/π (0.77%) and K ≈ ψ^(L₅/F₅) (0.89%) are suggestive but not exact. Is K truly fundamental, or just an empirical fit from Earth? Independent eccentricity amplitude measurements from long-term orbital integrations could test this.

5. **Exoplanet extension**: Can the balance framework (Law 5 alone, until Law 4 is found) predict eccentricities in exoplanet systems? This would be the ultimate test.

---

## References

- [Fibonacci Laws](10-fibonacci-laws.md) — Laws 4 and 5 (eccentricity constant and balance)
- [Tilt and Balance Calculations](36-tilt-and-definitive-balance-calculations.md) — Detailed derivations
- [Eccentricity Balance](../tools/verify/eccentricity-balance.js) — Static analysis
- [fibonacci_eccentricity_scale.py](../scripts/fibonacci_eccentricity_scale.py) — Full numerical exploration
- [fibonacci_eccentricity_structure.py](../scripts/fibonacci_eccentricity_structure.py) — Exhaustive search (10 directions)
- [predict_tilt_from_eccentricity.py](../scripts/predict_tilt_from_eccentricity.py) — K constant investigation and tilt prediction
- **Interactive visualization**: Tools → "Eccentricity Balance Scale" in the 3D simulation
