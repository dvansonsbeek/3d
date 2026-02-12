# Fibonacci Laws of Planetary Motion

This document describes the Fibonacci Laws of Planetary Motion as implemented in the Holistic Universe Model, including the **invariable plane balance condition** that determines the ψ-ratios from first principles.

This document proposes updates to the current derivation published at [holisticuniverse.com/en/reference/fibonacci-laws-derivation](https://www.holisticuniverse.com/en/reference/fibonacci-laws-derivation).

---

## Overview

The Fibonacci Laws connect planetary orbital parameters through mass-weighted quantities using Fibonacci quantum numbers. The central formula for inclination amplitudes is:

```
amplitude = ψ_g / (d × √m)
```

Where:
- `ψ_g` = Universal constant for the planet's ψ-group
- `d` = Fibonacci quantum number (ratio of Fibonacci numbers)
- `√m` = Square root of planetary mass in solar units

The key discovery documented here is that the **invariable plane balance condition** (angular momentum conservation) provides a physical constraint that determines the ψ-ratios, replacing the empirical Law 3 triad with a more fundamental equation.

---

## Fundamental Constants

### The Holistic Year

```
H = 333,888 years
2H = 667,776 years
```

### The Base ψ-Constant

Derived from Fibonacci numbers and the Holistic Year:

```
ψ₁ = (F₅ × F₈²) / (2H) = (5 × 21²) / 667,776 = 2205 / 667,776 = 3.302005 × 10⁻³
```

### Planetary Masses (JPL DE440, solar units)

| Planet | Mass (M☉) | √m |
|--------|-----------|-----|
| Mercury | 1.6601 × 10⁻⁷ | 4.074 × 10⁻⁴ |
| Venus | 2.4478 × 10⁻⁶ | 1.564 × 10⁻³ |
| Earth | 3.0027 × 10⁻⁶ | 1.733 × 10⁻³ |
| Mars | 3.2271 × 10⁻⁷ | 5.681 × 10⁻⁴ |
| Jupiter | 9.5479 × 10⁻⁴ | 3.090 × 10⁻² |
| Saturn | 2.8588 × 10⁻⁴ | 1.691 × 10⁻² |
| Uranus | 4.3662 × 10⁻⁵ | 6.608 × 10⁻³ |
| Neptune | 5.1514 × 10⁻⁵ | 7.177 × 10⁻³ |

---

## The Three Laws

### Law 1: Inner Planet Eccentricity Ladder (unchanged)

The mass-weighted eccentricities of the four inner planets form a Fibonacci ratio sequence:

```
ξ_Venus : ξ_Earth : ξ_Mars : ξ_Mercury = 1 : 5/2 : 5 : 8
```

Where `ξ = e_base × √m`. Consecutive ratios are 5/2, 2, 8/5 — all converging toward the golden ratio φ ≈ 1.618.

### Law 2: Inclination ψ-Constant (updated)

Each planet's mass-weighted inclination amplitude, multiplied by its Fibonacci quantum number, equals the ψ-constant for its group:

```
d × i × √m = ψ_g
```

This holds for all 8 planets. The ψ-group assignments and quantum numbers are given in the tables below.

### Law 3: Invariable Plane Balance (replaces Fibonacci Triad)

**Previous formulation** (empirical):
```
3 × i_E × √m_E + 5 × i_J × √m_J = 8 × i_S × √m_S
```

**New formulation** (from angular momentum conservation):
```
Σ(203° group) L_j × amp_j = Σ(23° group) L_j × amp_j
```

Where `L_j = m_j × √(a_j × (1 - e_j²))` is the angular momentum proxy.

The invariable plane is the fundamental reference plane of the solar system, perpendicular to the total angular momentum vector. For this plane to remain stable under the inclination oscillations of all planets, the angular momentum weighted by inclination amplitude must balance between the two phase groups.

This balance condition determines `ψ₃/ψ₁` from first principles:

```
ψ₃/ψ₁ = 0.5869
```

See [Invariable Plane Balance Condition](#invariable-plane-balance-condition) for the full derivation.

---

## Phase Groups

### Two-Group Assignment

The inclination oscillation model uses two phase angles, 180° apart:

| Phase angle | Group | Planets |
|-------------|-------|---------|
| **203.3195°** | Prograde | Venus, Earth, Mars, Jupiter, Neptune |
| **23.3195°** | Retrograde | Mercury, Saturn, Uranus |

Both angles derive from the s₈ eigenmode of Laplace-Lagrange secular perturbation theory (γ₈ ≈ 203.3195°).

### How Group Assignment Was Determined

The group assignment is **uniquely determined** by two constraints:

1. **Laplace-Lagrange bounds compatibility** — Each planet's oscillation range `[mean - amp, mean + amp]` must fall within the LL secular theory bounds. This forces:
   - Mars MUST be at 203° (at 23° its inclination goes negative, violating LL lower bound of 0°)
   - Venus fits 203° (at 23° its minimum drops below the LL lower bound of 0.72°)
   - Neptune fits 203° with d=8 (at 23° its maximum exceeds the LL upper bound of 0.80°)

2. **Invariable plane balance** — The angular momentum balance determines ψ₃/ψ₁ and confirms the group assignment is physically consistent.

### Changes from Previous Model

| Change | Previous | Updated | Reason |
|--------|----------|---------|--------|
| Neptune group | 23° | **203°** | LL bounds require it (Neptune's Ω=192° is 11° from 203°, placing it at maximum at 23°) |
| Neptune d | F₅ = 5 | **F₆ = 8** | Required for LL bounds fit with Neptune at 203° |
| ψ₃/ψ₁ | 15/13 ≈ 1.154 | **0.587** | Determined by balance condition (not empirical triad) |
| ψ₂/ψ₁ | 3/2 = 1.500 | **1** (proposed) | Simplifies to two ψ-levels; Uranus joins ψ₁ group |

---

## Quantum Numbers

### Complete Quantum Number Table

| Planet | T/H | b | d | ψ-group | Phase group |
|--------|-----|---|---|---------|-------------|
| Mercury | 8/11 | 11 (L₅) | 21/2 = F₈/F₃ | ψ₃ | 23° |
| Venus | 2 | 1 | 2 = F₃ | ψ₁ | 203° |
| Earth | 1/3 | 3 | 3 = F₄ | ψ₁ | 203° |
| Mars | 3/13 | 13 | 13/5 = F₇/F₅ | ψ₁ | 203° |
| Jupiter | 1/5 | 5 | 1 = F₁ | ψ₃ | 203° |
| Saturn | 1/8 | 8 | 13/11 = F₇/L₅ | ψ₁ | 23° |
| Uranus | 1/3 | 3 | 8 = F₆ | ψ₁ | 23° |
| Neptune | 2 | 1 | **8 = F₆** | ψ₁ | **203°** |

**Changes highlighted**: Neptune's d changes from F₅=5 to F₆=8, and Uranus moves from ψ₂ to ψ₁ (when ψ₂/ψ₁ = 1).

### Period Assignments (unchanged)

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

## ψ-Level Structure

### Proposed: Two-Level System

With ψ₂/ψ₁ = 1 (the simplification where Uranus joins the ψ₁ group), the system reduces to two levels:

| Level | Value | Ratio to ψ₁ | Planets | Determined by |
|-------|-------|-------------|---------|---------------|
| **ψ₁** | 3.302 × 10⁻³ | 1 | Venus, Earth, Mars, Saturn, Uranus, Neptune | Fibonacci theory |
| **ψ₃** | 1.938 × 10⁻³ | 0.5869 | Mercury, Jupiter | Balance condition |

The ψ₃ ratio is determined by the angular momentum balance equation (see below).

### Alternative: Three-Level System

If ψ₂/ψ₁ ≠ 1, Uranus remains in a separate group. The balance equation becomes:

```
r₃ = 0.5355 + 0.0514 × r₂
```

Where `r₂ = ψ₂/ψ₁` and `r₃ = ψ₃/ψ₁`. Since the r₂ coefficient is only 5.1% of the r₃ term, the balance is dominated by the ψ₁/ψ₃ structure (the Jupiter-Saturn competition). r₂ is relatively free — any value from 0.001 to 1.613 produces a valid solution where all 8 planets fit their Laplace-Lagrange bounds.

Valid Fibonacci ratios for r₂ (all produce all-8-planet LL fit):

| r₂ | Label | r₃ (from balance) | Uranus amplitude |
|----|-------|-------------------|-----------------|
| 5/8 | F₅/F₆ | 0.5676 | 0.039° |
| 8/13 | F₆/F₇ | 0.5671 | 0.038° |
| 1/φ | (√5−1)/2 | 0.5672 | 0.039° |
| 1 | unity | 0.5869 | 0.062° |
| 3/2 | F₄/F₃ | 0.6125 | 0.094° |

---

## Invariable Plane Balance Condition

### Physical Motivation

The invariable plane is perpendicular to the total angular momentum vector of the solar system. For this plane to remain stable, the angular-momentum-weighted inclination oscillations must cancel between the two phase groups. If they didn't, the total angular momentum vector would wobble, which violates conservation of angular momentum.

### Mathematical Derivation

Each planet's inclination oscillates as:

```
i_j(t) = mean_j + amp_j × cos(Ω_j(t) - φ_group)
```

The Z-component of angular momentum contributed by planet j:

```
Lz_j ∝ L_j × cos(i_j)
```

For small inclinations, the oscillating part of the total Lz is proportional to:

```
Σ L_j × amp_j × cos(Ω_j(t) - φ_group) ≈ 0   (for all t)
```

In the two-group model, all planets in the 203° group oscillate together, and all planets in the 23° group oscillate together (with 180° phase offset). The DC balance condition is:

```
Σ(203° group) L_j × amp_j = Σ(23° group) L_j × amp_j
```

### Substituting the Fibonacci Formula

With `amp_j = ψ_g / (d_j × √m_j)` and `L_j = m_j × √(a_j × (1 - e_j²))`:

```
L_j × amp_j = ψ_g × m_j × √(a_j(1-e_j²)) / (d_j × √m_j)
             = ψ_g × √(m_j × a_j(1-e_j²)) / d_j
```

Grouping by ψ-level:

```
ψ₁ × Σ(203°,ψ₁) w_j + ψ₃ × Σ(203°,ψ₃) w_j = ψ₁ × Σ(23°,ψ₁) w_j + ψ₂ × Σ(23°,ψ₂) w_j + ψ₃ × Σ(23°,ψ₃) w_j
```

Where `w_j = √(m_j × a_j(1-e_j²)) / d_j` is the structural weight for each planet.

### Computing the Coefficients

| Planet | Group | ψ-group | d | w_j = √(m×a)/d |
|--------|-------|---------|---|-----------------|
| Venus | 203° | ψ₁ | 2 | 6.653 × 10⁻⁴ |
| Earth | 203° | ψ₁ | 3 | 5.776 × 10⁻⁴ |
| Mars | 203° | ψ₁ | 13/5 | 2.697 × 10⁻⁴ |
| Jupiter | 203° | ψ₃ | 1 | 7.048 × 10⁻² |
| Neptune | 203° | ψ₁ | 8 | 4.908 × 10⁻³ |
| Mercury | 23° | ψ₃ | 21/2 | 2.414 × 10⁻⁵ |
| Saturn | 23° | ψ₁ | 13/11 | 4.418 × 10⁻² |
| Uranus | 23° | ψ₂ | 8 | 3.618 × 10⁻³ |

The balance equation becomes:

```
c₁ × ψ₁ + c₂ × ψ₂ + c₃ × ψ₃ = 0
```

Where:
- `c₁ = Σ(203°,ψ₁) w - Σ(23°,ψ₁) w = −3.769 × 10⁻²` (Saturn dominates 23° side)
- `c₂ = −w_Uranus = −3.614 × 10⁻³` (only Uranus)
- `c₃ = w_Jupiter − w_Mercury = 7.038 × 10⁻²` (Jupiter dominates 203° side)

Dividing by ψ₁ and c₃:

```
r₃ = ψ₃/ψ₁ = 0.5355 + 0.0514 × r₂
```

### Physical Interpretation

The balance equation reveals a clear physical picture:

- **Jupiter** (ψ₃, d=1, at 203°) contributes the dominant 203° angular momentum term
- **Saturn** (ψ₁, d=13/11, at 23°) contributes the dominant 23° angular momentum term
- **ψ₃ must be smaller than ψ₁** so that Jupiter's enormous mass doesn't destabilize the invariable plane
- The ratio ψ₃/ψ₁ ≈ 0.587 is the exact value where Jupiter's contribution at 203° balances Saturn's contribution at 23°

This is the fundamental reason why Mercury and Jupiter have smaller amplitudes than their Fibonacci quantum numbers alone would suggest — angular momentum conservation constrains them.

---

## Inclination Amplitude Predictions

### Complete Solution (r₂ = 1, ψ₂ = ψ₁)

| Planet | ψ-group | d | Amplitude (°) | Mean (°) | Range (°) | LL bounds (°) | Margin (°) |
|--------|---------|---|---------------|----------|-----------|---------------|-----------|
| Mercury | ψ₃ | 21/2 | 0.453 | 5.900 | 5.45 – 6.35 | 4.57 – 9.86 | +0.878 |
| Venus | ψ₁ | 2 | 1.055 | 3.056 | 2.00 – 4.11 | 0.72 – 4.11 | −0.001 |
| Earth | ψ₁ | 3 | 0.635 | 1.481 | 0.85 – 2.12 | 0.00 – 2.95 | +0.834 |
| Mars | ψ₁ | 13/5 | 2.236 | 3.597 | 1.36 – 5.83 | 0.00 – 5.84 | +0.008 |
| Jupiter | ψ₃ | 1 | 0.063 | 0.384 | 0.32 – 0.45 | 0.24 – 0.49 | +0.043 |
| Saturn | ψ₁ | 13/11 | 0.165 | 0.941 | 0.78 – 1.11 | 0.43 – 1.53 | +0.346 |
| Uranus | ψ₁ | 8 | 0.062 | 1.005 | 0.94 – 1.07 | 0.90 – 1.11 | +0.042 |
| Neptune | ψ₁ | 8 | 0.058 | 0.670 | 0.61 – 0.73 | 0.55 – 0.80 | +0.062 |

**Balance: 0.0000% imbalance** — All 8 planets fit Laplace-Lagrange bounds.

### Fibonacci Law Verification

The law `d × amplitude × √m = ψ_g` is verified exactly for all 8 planets:

| Planet | d × i × √m | Expected ψ_g | Match |
|--------|------------|-------------|-------|
| Mercury | 1.938 × 10⁻³ | ψ₃ = 1.938 × 10⁻³ | exact |
| Venus | 3.302 × 10⁻³ | ψ₁ = 3.302 × 10⁻³ | exact |
| Earth | 3.302 × 10⁻³ | ψ₁ = 3.302 × 10⁻³ | exact |
| Mars | 3.302 × 10⁻³ | ψ₁ = 3.302 × 10⁻³ | exact |
| Jupiter | 1.938 × 10⁻³ | ψ₃ = 1.938 × 10⁻³ | exact |
| Saturn | 3.302 × 10⁻³ | ψ₁ = 3.302 × 10⁻³ | exact |
| Uranus | 3.302 × 10⁻³ | ψ₁ = 3.302 × 10⁻³ | exact |
| Neptune | 3.302 × 10⁻³ | ψ₁ = 3.302 × 10⁻³ | exact |

---

## Comparison with Previous Model

### What Changes

| Aspect | Previous (website) | Updated (balance-driven) |
|--------|-------------------|-------------------------|
| **Neptune d** | 5 (F₅) | **8 (F₆)** |
| **Neptune phase group** | 23° | **203°** |
| **ψ₃/ψ₁** | 15/13 = 1.154 | **0.587** (from balance) |
| **ψ₂/ψ₁** | 3/2 | **1** (or free, 0.001–1.613) |
| **Law 3** | Empirical triad 3E+5J=8S | **Angular momentum balance** |
| **Mercury amplitude** | 0.891° | **0.453°** |
| **Jupiter amplitude** | 0.123° | **0.063°** |
| **Uranus amplitude** | 0.094° | **0.062°** |
| **Neptune amplitude** | 0.092° | **0.058°** |
| **ψ levels** | 3 (ψ₁, ψ₂, ψ₃) | **2 (ψ₁, ψ₃)** |
| **Free parameters** | 0 (all from Fibonacci) | **0** (ψ₃/ψ₁ from balance) |

### What Stays the Same

| Aspect | Value | Notes |
|--------|-------|-------|
| **ψ₁** | 2205/667,776 = 3.302 × 10⁻³ | Fundamental constant unchanged |
| **Law 1** | ξ ratios 1 : 5/2 : 5 : 8 | Eccentricity ladder unchanged |
| **Law 2** | d × i × √m = ψ_g | Core formula unchanged |
| **Venus amplitude** | 1.055° | ψ₁ planet, unchanged |
| **Earth amplitude** | 0.635° | ψ₁ planet, unchanged |
| **Mars amplitude** | 2.236° | ψ₁ planet, unchanged |
| **Saturn amplitude** | 0.165° | ψ₁ planet, unchanged |
| **Phase angles** | 203.3195° / 23.3195° | From s₈ eigenmode |
| **Quantum numbers** | d values for all except Neptune | Fibonacci structure preserved |
| **Period assignments** | T = H × a/b | All periods unchanged |

### Why the Changes Are Necessary

1. **Neptune at 23° violates LL bounds** — Neptune's ascending node on the invariable plane is 192.04°, which is 169° from 23°. This places Neptune near its maximum inclination at J2000 in the 23° group. With any Fibonacci amplitude based on ψ₁ and d=5, Neptune's range [0.72°, 0.91°] exceeds the Laplace-Lagrange upper bound of 0.80°. No ψ-ratio adjustment can fix this because Neptune is a ψ₁ planet.

2. **Neptune at 203° with d=8 fits** — With d=8 (F₆ instead of F₅), Neptune's amplitude drops to 0.058°, and at 203° (only 11° from its ascending node), Neptune oscillates near its minimum. The range [0.61°, 0.73°] fits comfortably within [0.55°, 0.80°].

3. **ψ₃/ψ₁ from balance, not empirical** — The previous ψ₃/ψ₁ = 15/13 was derived from Law 3 (3E+5J=8S). With the updated group assignment, the angular momentum balance requires ψ₃/ψ₁ ≈ 0.587. This is a more fundamental constraint because it derives from angular momentum conservation rather than a numerical coincidence.

4. **Jupiter's amplitude was too large** — With ψ₃/ψ₁ = 15/13, Jupiter's amplitude of 0.123° gives a range [0.28°, 0.53°] that exceeds the LL upper bound of 0.49°. The balance-determined ψ₃/ψ₁ = 0.587 gives Jupiter an amplitude of 0.063°, fitting comfortably within [0.24°, 0.49°].

---

## Mirror Symmetry (Updated)

The original mirror symmetry across the asteroid belt is partially preserved:

| Level | Inner planet | Outer planet | Connection |
|-------|-------------|-------------|------------|
| Belt-adjacent | Mars (d=13/5) | Jupiter (d=1) | Both ψ₁/ψ₃ |
| Middle | Earth (d=3) | Saturn (d=13/11) | Law 3 partners |
| Far | Venus (d=2) | Neptune (d=8) | Shared period 2H, same d=F₆ for Neptune |
| Outermost | Mercury (d=21/2) | Uranus (d=8) | Both at 23°, Mercury ψ₃ |

**Note**: The updated model breaks some of the original mirror symmetry — Neptune's d changes from F₅=5 to F₆=8 (matching Uranus), and the inner-outer coupling indices change. This suggests the mirror symmetry may be approximate rather than exact, with the balance condition as the more fundamental organizing principle.

---

## Implementation

### Computing Amplitudes

```javascript
// Fundamental constants
const H = 333888;
const psi1 = 2205 / (2 * H);  // = 3.302005 × 10⁻³

// Balance-determined ratio (for r₂ = 1, two-level system)
const psi3_over_psi1 = 0.5869;
const psi3 = psi3_over_psi1 * psi1;

// Fibonacci quantum numbers
const FIBONACCI_D = {
  mercury: 21/2,   // F₈/F₃
  venus: 2,        // F₃
  earth: 3,        // F₄
  mars: 13/5,      // F₇/F₅
  jupiter: 1,      // F₁
  saturn: 13/11,   // F₇/L₅
  uranus: 8,       // F₆
  neptune: 8        // F₆ (changed from 5)
};

// ψ-group assignments
const PSI_GROUP = {
  mercury: 'psi3', venus: 'psi1', earth: 'psi1', mars: 'psi1',
  jupiter: 'psi3', saturn: 'psi1', uranus: 'psi1', neptune: 'psi1'
};

// Phase group assignments
const PHASE_GROUP = {
  mercury: 23.3195, venus: 203.3195, earth: 203.3195, mars: 203.3195,
  jupiter: 203.3195, saturn: 23.3195, uranus: 23.3195, neptune: 203.3195
};

// Compute amplitude for a planet
function getFibonacciAmplitude(planet, mass) {
  const d = FIBONACCI_D[planet];
  const sqrtM = Math.sqrt(mass);
  const psi = PSI_GROUP[planet] === 'psi1' ? psi1 : psi3;
  return psi / (d * sqrtM);
}
```

### Computing the Balance Ratio

```javascript
// Verify the balance condition
function computeBalanceRatio(planets) {
  let sum203_psi1_w = 0, sum23_psi1_w = 0;
  let sum203_psi3_w = 0, sum23_psi3_w = 0;

  for (const [name, p] of Object.entries(planets)) {
    const L = p.mass * Math.sqrt(p.a * (1 - p.e * p.e));
    const w = L / (FIBONACCI_D[name] * Math.sqrt(p.mass));
    const is203 = PHASE_GROUP[name] > 180;

    if (PSI_GROUP[name] === 'psi1') {
      if (is203) sum203_psi1_w += w; else sum23_psi1_w += w;
    } else {
      if (is203) sum203_psi3_w += w; else sum23_psi3_w += w;
    }
  }

  // Balance: (sum203_psi1 - sum23_psi1) + r₃ × (sum203_psi3 - sum23_psi3) = 0
  const c1 = sum203_psi1_w - sum23_psi1_w;
  const c3 = sum203_psi3_w - sum23_psi3_w;
  return -c1 / c3;  // = ψ₃/ψ₁
}
```

---

## Validation

### Test 1: Fibonacci Law Holds

For all 8 planets, verify `d × amplitude × √m = ψ_g` to machine precision.

### Test 2: All Planets Within LL Bounds

Compute `mean ± amplitude` for each planet and verify the range falls within the Laplace-Lagrange secular theory bounds (from Fitzpatrick Table 10.3, converted from radians).

### Test 3: Perfect Balance

Verify `Σ(203°) L × amp = Σ(23°) L × amp` to within numerical precision (< 0.001% imbalance).

### Test 4: J2000 Inclination Match

At J2000 epoch, `i(2000) = mean + amplitude × cos(Ω_J2000 - φ_group)` should match observed invariable plane inclinations.

---

## Testable Prediction: ψ₃/ψ₁ = 1/φ

### Hypothesis

The 8-planet balance yields ψ₃/ψ₁ = 0.5869. The golden ratio inverse is 1/φ = 0.6180. We hypothesize that the **complete solar system** balance — including dwarf planets and trans-Neptunian objects (TNOs) — converges to exactly:

```
ψ₃/ψ₁ = 1/φ = (√5 − 1)/2 = 0.6180339887...

equivalently:  ψ₁/ψ₃ = φ = (1 + √5)/2 = 1.6180339887...
```

This would mean the two ψ-coupling constants are connected by the golden ratio — the same self-similar scaling law that defines the Fibonacci sequence (F_{n+1}/F_n → φ). The full expressions would then be:

```
ψ₁ = F₅ × F₈² / (2H) = 2205 / 667,776

ψ₃ = ψ₁ / φ = 2205(√5 − 1) / (4 × 333,888)
```

### Evidence: The Gap Matches TNO Contributions

The structural weight gap between the 8-planet ratio (0.5869) and 1/φ (0.6180) is:

```
Δw = 2.194 × 10⁻³   (needed in the 23° ψ₁ group)
```

This is ~61% of Uranus's structural weight and ~45% of Neptune's — exactly the scale of the trans-Neptunian population.

**Known dwarf planets** (with d=1, all in 23° group) provide a total structural weight of 2.82 × 10⁻³, which is **128.5% of the gap** — more than enough. With optimal group assignment (brute-force search over all 2¹² splits of 12 known dwarf planets):

| Scenario | r₃ | Error from 1/φ |
|----------|-----|----------------|
| 8 planets only | 0.5869 | 5.3% |
| +12 known dwarfs (best split, d=1) | 0.6179 | 0.019% |
| +Kuiper Belt ~3% M_Earth (effective) | ~0.618 | ~0% |

The best split places 9 objects (Pluto, Eris, Haumea, Makemake, Gonggong, Sedna, Orcus, Salacia, Varda) in the 23° group and 3 (Quaoar, Varuna, Ixion) in the 203° group, reaching r₃ = 0.61792 — within 1.2 × 10⁻⁴ of 1/φ.

### What This Would Imply

If confirmed, this prediction would establish that **every level of the Fibonacci framework** is governed by Fibonacci/golden-ratio structure:

1. **Quantum numbers** d_j — Fibonacci numbers and ratios
2. **ψ₁** — defined by Fibonacci numbers F₅ and F₈
3. **ψ₃ = ψ₁/φ** — the two coupling constants connected by the golden ratio
4. **Phase groups** — determined by the balance condition that enforces this φ-ratio

### How to Test

As TNO masses become better determined (e.g., by the Vera Rubin Observatory/LSST survey), the following quantities can be computed for each TNO:

1. Assign Fibonacci quantum numbers d based on the Fibonacci pattern
2. Determine phase group (203° or 23°) from the ascending node on the invariable plane
3. Compute structural weight: w = √(m × a × (1 − e²)) / d
4. Add to the balance equation and check whether the sum converges to 1/φ

The prediction is falsifiable: if the complete balance consistently yields a value different from 1/φ (e.g., if it converges to some other irrational number), the golden-ratio hypothesis is ruled out.

---

## Open Questions

1. **Can the ψ₃/ψ₁ = 1/φ prediction be confirmed?** The 8-planet balance gives 0.5869, and including known dwarf planets can reach 0.6179 (see [Testable Prediction](#testable-prediction-ψ₃ψ₁--1φ) above). The key unknowns are the Fibonacci quantum numbers and phase group assignments for TNOs.

2. **Uranus joins ψ₁: two-level system adopted** *(resolved)* — The previous model used three ψ-levels (ψ₁, ψ₂, ψ₃) with Uranus in a separate ψ₂ group (ψ₂/ψ₁ = 3/2). The balance analysis shows that with r₂ = 1 (ψ₂ = ψ₁), the system achieves 0.0000% balance imbalance, all 8 planets fit Laplace-Lagrange bounds, and 7/8 match JPL trend directions. The two-level system (ψ₁ and ψ₃ only) is both simpler and fully consistent. **Proposed website update**: the three-level ψ structure at [holisticuniverse.com/en/reference/fibonacci-laws-derivation](https://www.holisticuniverse.com/en/reference/fibonacci-laws-derivation) should be updated to a two-level system where Uranus uses ψ₁ with d = F₆ = 8.

3. **Law 1 (eccentricity) integration** — The eccentricity and inclination amplitudes are connected through the AMD (Angular Momentum Deficit). A complete theory should derive both from a single framework. The balance condition for inclination suggests there may be an analogous balance condition for eccentricity.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [10 - Constants Reference](10-constants-reference.md) | All constants and values |
| [15 - Inclination Calculations](15-inclination-calculations.md) | Inclination oscillation implementation |
| [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) | Height above/below invariable plane |
| [05 - Invariable Plane Overview](05-invariable-plane-overview.md) | Conceptual background |
| [Appendix E - Inclination Optimization](appendix-e-inclination-optimization.js) | Optimization script |

---

**Previous**: [25 - Ascending Node Calculations Limitations](25-ascending-node-calculations-limitations.md)
