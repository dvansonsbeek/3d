# Fibonacci Laws of Planetary Motion

This document describes the Fibonacci Laws of Planetary Motion as implemented in the Holistic Universe Model. Six laws connect planetary orbital parameters through Fibonacci numbers: a cycle hierarchy, inclination and eccentricity constants, two independent balance conditions, and a resonance loop.

---

## Overview

The six Fibonacci Laws form a layered architecture:

- **Law 1** (Fibonacci Cycle Hierarchy) — all major precession periods derive from the Holistic Year divided by Fibonacci numbers
- **Laws 2–3** (Inclination Constant + Balance) — each planet's inclination amplitude is quantized by a Fibonacci divisor, and the mass-weighted amplitudes cancel between two phase groups
- **Laws 4–5** (Eccentricity Amplitude Constant + Balance) — a single constant K predicts all 8 eccentricity amplitudes, and the base eccentricities satisfy an independent balance condition
- **Law 6** (Saturn-Jupiter-Earth Resonance) — a closed beat-frequency loop linking three dominant precession periods

For detailed mathematical derivations and formula coefficient breakdowns, see [Formula Derivation](35-formula-derivation.md).

The central formula for inclination amplitudes is:

```
amplitude = ψ / (d × √m)
```

Where:
- `ψ` = Universal coupling constant, derived from Earth
- `d` = Fibonacci divisor (a Fibonacci number: 1, 2, 3, 5, 8, 13, 21, ...)
- `√m` = Square root of planetary mass in solar units

---

## Fundamental Constants

### The Holistic Year

```
H = see Constants Reference for current value
```

### The Universal Constants ψ and K

Two empirical constants, both derived from Earth's fitted parameters, predict all 8 planets' oscillation amplitudes:

```
ψ = d_Earth × inclAmp_Earth × √m_Earth = 3.307 × 10⁻³   (inclination amplitudes)
K = e_amp_Earth × √m_Earth / (sin(tilt_Earth) × √d_Earth) = 3.415 × 10⁻⁶   (eccentricity amplitudes)
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

**Note on Earth's eccentricity:** The J2000 value (0.0167) is used for the balance calculations (Laws 3 and 5), consistent with all other planets. Earth's mean eccentricity over the Holistic Year (0.0153, used in the 3D simulation) differs due to long-term oscillation. The impact on balance is negligible — Earth's eccentricity weight is tiny compared to the gas giants.

---

## The Six Laws

### Law 1: Fibonacci Cycle Hierarchy

All major precession periods derive from the Holistic Year divided by Fibonacci numbers:

| F(n) | Period = H/F(n) | Astronomical meaning |
|------|-----------------|---------------------|
| 3 | H/3 | Earth inclination precession |
| 5 | H/5 | Jupiter perihelion precession |
| 8 | H/8 | Saturn perihelion precession (retrograde) |
| 13 | H/13 | Earth axial precession |
| 21 | H/21 | Beat: axial + obliquity |
| 34 | H/34 | Beat: axial + ecliptic |

Beat frequency rule: `1/H(n) + 1/H(n+1) = 1/H(n+2)` — an algebraic identity from the Fibonacci recurrence.

### Law 2: The Inclination Amplitude Constant

A single constant ψ predicts all eight inclination amplitudes from Fibonacci divisors and mass alone:

```
d × amplitude × √m = ψ     →     amplitude = ψ / (d × √m)
```

ψ = 3.307 × 10⁻³, derived from Earth's fitted inclination amplitude. This holds for all 8 planets with zero free parameters.

### Law 3: The Inclination Balance

The angular-momentum-weighted inclination amplitudes cancel between the two phase groups, conserving the orientation of the invariable plane:

```
Σ(in-phase group) L_j × amp_j = Σ(anti-phase group) L_j × amp_j
```

Substituting Law 2 and simplifying:

```
Σ(in-phase) w_j = Σ(anti-phase) w_j

where w_j = √(m_j × a_j(1-e_j²)) / d_j
```

**Result: 99.9972% balance.** See [Inclination Balance Derivation](#inclination-balance-derivation) for the full treatment.

### Law 4: The Eccentricity Amplitude Constant

A single constant K predicts all eight eccentricity amplitudes from Fibonacci divisors, mass, distance, and axial tilt:

```
e_amp = K × sin(tilt) × √d / (√m × a^1.5)
```

K = 3.4149 × 10⁻⁶, derived from Earth's eccentricity amplitude and axial tilt. This is the eccentricity analog of ψ (Law 2) for inclination amplitudes.

**The parallel:**

| | Law 2 (inclination) | Law 4 (eccentricity) |
|---|---|---|
| **Formula** | amp = ψ / (d × √m) | e_amp = K × sin(tilt) × √d / (√m × a^1.5) |
| **Constant** | ψ = 3.307 × 10⁻³ | K = 3.415 × 10⁻⁶ |
| **Variables** | d, m | d, m, a, tilt |
| **Predicts** | 8 inclination amplitudes | 8 eccentricity amplitudes |
| **Free parameters** | 0 | 0 |

Both constants are empirical — derived from Earth's fitted parameters — and predict all 8 planets with zero free parameters. ψ uses only Fibonacci divisors and mass. K additionally uses semi-major axis and axial tilt, coupling the spin and orbital domains.

**Note on base eccentricities:** Laws 2 and 4 predict oscillation *amplitudes*. The base (mean) eccentricities are partially constrained by Law 5, which predicts Saturn's from the other seven. The remaining seven base eccentricities are structural values set at formation, analogous to how the eight mean inclinations are derived from J2000 values rather than predicted by ψ.

### Law 5: The Eccentricity Balance

The eccentricities satisfy an independent balance condition using the same Fibonacci divisors and phase groups:

```
Σ(in-phase group) v_j = Σ(anti-phase group) v_j

where v_j = √m_j × a_j^(3/2) × e_j / √d_j
```

Or equivalently, in terms of orbital period `T_j ∝ a_j^(3/2)`:

```
v_j = T_j × e_j × √(m_j / d_j)
```

**Result: 99.8865% balance** (phase-derived base eccentricities). See [Eccentricity Balance Derivation](#eccentricity-balance-derivation) for the full treatment and [Eccentricity Balance Scale](38-eccentricity-scale.md) for a physical interpretation as a balance scale.

The eccentricity amplitudes used in the balance are predicted by Law 4 (the K constant). See [Eccentricity Balance Scale](38-eccentricity-scale.md) for a physical interpretation of the balance as a scale.

### Law 6: Saturn-Jupiter-Earth Resonance

Saturn's retrograde precession creates a closed beat-frequency loop linking the three dominant precession periods:

```
Jupiter + Saturn → Axial:       1/(H/5) + 1/(H/8) = 1/(H/13)
Jupiter − Saturn → Earth incl:  1/(H/5) − 1/(−H/8) = 1/(H/3)
Axial − Earth   → Obliquity:    1/(H/13) − 1/(H/3) = 1/(H/8) → Saturn
```

Each frequency sum/difference returns another Fibonacci period (H/5, H/8, H/13, H/3). The loop closes because the Fibonacci recurrence `F(n) + F(n+1) = F(n+2)` maps directly to beat frequencies: `1/H(n) + 1/H(n+1) = 1/H(n+2)`.

---

## Assignments

### Fibonacci Divisors

| Planet | d | Fibonacci | Phase group |
|--------|---|-----------|-------------|
| Mercury | 21 | F₈ | In-phase |
| Venus | 34 | F₉ | In-phase |
| Earth | 3 | F₄ | In-phase |
| Mars | 5 | F₅ | In-phase |
| Jupiter | 5 | F₅ | In-phase |
| Saturn | 3 | F₄ | Anti-phase |
| Uranus | 21 | F₈ | In-phase |
| Neptune | 34 | F₉ | In-phase |

### Phase Groups

Each planet has a per-planet phase angle — the ICRF perihelion longitude at a balanced-year anchor. All seven fitted planets share the same anchor: **n=7, year ≈ -2,649,854**, the **System Reset** — the epoch within each Grand Holistic Octave when all planets simultaneously reach their inclination extremes (in-phase at minimum, Saturn at maximum). This occurs once per 8H. Earth is locked to its own n=0 reference for the IAU obliquity constraint. See [Grand Holistic Octave Periods](55-grand-holistic-octave-periods.md#system-reset) for details.

| Planet | Phase Angle | Group | Anchor |
|--------|-------------|-------|--------|
| Mercury | 234.52° | In-phase | n=7 |
| Venus | 259.82° | In-phase | n=7 |
| Earth | 21.77° | In-phase | n=0 (locked) |
| Mars | 231.95° | In-phase | n=7 |
| Jupiter | 291.18° | In-phase | n=7* |
| **Saturn** | **120.38°** | **Anti-phase** | n=7* |
| Uranus | 21.33° | In-phase | n=7* |
| Neptune | 174.04° | In-phase | n=7 |

\* Jupiter, Saturn, and Uranus have ICRF perihelion periods that divide H exactly, so their phase value at n=7 coincides numerically with their phase at n=0 (and at any other anchor).

The group assignment is constrained by: (1) each planet's oscillation range must fall within the Laplace-Lagrange secular theory bounds, (2) the inclination structural weights must balance (Law 3), and (3) the eccentricity weights must balance (Law 5). The phase angles produce a total JPL ecliptic-inclination trend error of ~4.3″/century across all 7 fitted planets in the [J2000-fixed frame](32-inclination-calculations.md#two-frames--be-careful-which-one-you-mean), with all 7 directions matching JPL.

### Ecliptic Perihelion Periods

| Planet | Expression |
|--------|------------|
| Mercury | H × 8/11 |
| Venus | 2H |
| Earth | H/3 |
| Mars | H × 8/35 |
| Jupiter | H/5 |
| Saturn | H/8 |
| Uranus | H/3 |
| Neptune | 2H |

The inclination oscillation uses the **ICRF perihelion period** (ecliptic rate − general precession H/13). All ICRF periods divide 8H = 2,682,536 years (the Grand Holistic Octave).

---

## Findings

Findings are empirical observations and consequences that follow from the six laws.

### Finding 1: Mirror Symmetry

Each inner planet shares its Fibonacci divisor with its outer counterpart across the asteroid belt:

| Level | Inner planet | Outer planet | Shared d | Fibonacci |
|-------|-------------|-------------|----------|-----------|
| Belt-adjacent | Mars (d=5) | Jupiter (d=5) | 5 | F₅ |
| Middle | Earth (d=3) | Saturn (d=3) | 3 | F₄ |
| Far | Venus (d=34) | Neptune (d=34) | 34 | F₉ |
| Outermost | Mercury (d=21) | Uranus (d=21) | 21 | F₈ |

Earth–Saturn is the only pair with opposite balance groups (in-phase vs anti-phase). The divisors form two consecutive Fibonacci pairs: (3, 5) for the belt-adjacent planets and (21, 34) for the outer planets.

### Finding 2: Configuration Uniqueness

The exhaustive search evaluates 7,558,272 candidates (see [Exhaustive Search](#exhaustive-search-and-preset-generation)). Five successive physical filters narrow these to a single mirror-symmetric solution:

| Filter | Surviving |
|--------|----------|
| Inclination balance ≥ 99.994% (TNO margin) | 767 |
| + Eccentricity balance ≥ 99% | 94 |
| + Per-config optimised anchor gives LL bounds 8/8 | 49 |
| + Direction match + rate error ≤ 5″ (Jupiter–Saturn shared ascending node) | 41 |
| + Mirror symmetry | **1** |

Each of the 94 candidates passing both balance thresholds is evaluated at its own optimal anchor position (*n*) and ascending node integers (*N* per planet), making the LL and direction checks fair — not biased toward any single configuration. Jupiter and Saturn are constrained to share the same *N*.

The sole mirror-symmetric survivor is the **default configuration** (Me=21, Ve=34, Ea=3, Ma=5, Ju=5, Sa=3, Ur=21, Ne=34), ranking #8 of 41 by eccentricity balance (99.89%). All 41 candidates are available for comparison in the [interactive Balance Explorer](https://3d.holisticuniverse.com).

**Key structural constraints:**

- **Mirror symmetry requires Scenario A.** Since Earth is locked at d=3, the Earth↔Saturn mirror pair forces Sa=3, which only occurs in Scenario A (Ju=5, Sa=3). Scenarios B/C/D have zero mirror-symmetric candidates.
- **LL bounds impose a floor of d ≥ 5** for the free mirror pairs (Mercury↔Uranus and Venus↔Neptune).
- **Balance selects one.** Among those 36 LL-valid mirror + Saturn-solo configs, only the default configuration achieves balance ≥ 99.994%.

The mirror symmetry, combined with the six laws, uniquely determines all 8 Fibonacci divisor assignments.

### Finding 3: Eccentricity Balance Independence

The eccentricity balance (Law 5) is genuinely independent from the inclination balance (Law 3):

- The weight formulas differ: `w_j = √(m·a(1-e²))/d` (inclination) vs `v_j = √m × a^(3/2) × e / √d` (eccentricity)
- The ratio v_j/w_j varies by a factor of ~150 across planets — the two balance conditions are not proportional
- The coefficient `√m × a^(3/2) / √d` alone (without e) gives only 74% balance; the actual eccentricity values improve it to 99.89%
- Random eccentricity values in the same weight formula give 50–85% balance

The two balances also differ structurally. The inclination balance is a **global** property — all mass in the solar system contributes (TNOs provide a 0.0002% correction). The eccentricity balance is a **closed-system** property of the 8 planets — the mirror pairs act as "communicating vessels" exchanging Angular Momentum Deficit (AMD), and TNOs cannot participate because (a) they lack paired counterparts, (b) the a^(3/2) weighting makes them far too heavy for any Fibonacci d-factor, and (c) they are test particles that cannot shape the eigenmode structure. See [eccentricity-balance.js](../tools/verify/eccentricity-balance.js) for the quantitative analysis.

### Finding 4: Saturn Eccentricity Prediction from Law 5

Since Saturn is the sole retrograde planet, the eccentricity balance (Law 5) directly predicts its eccentricity from the other seven:

```
e_Saturn = Σ(in-phase group) v_j / (√m_Sa × a_Sa^(3/2) / √d_Sa)
```

| Source | e_Saturn | vs J2000 |
|--------|----------|----------|
| Law 5 prediction (eccentricity balance) | 0.053728 | −0.23% |
| J2000 observed (JPL DE440) | 0.053858 | — |

**Why this is significant:** Saturn's eccentricity oscillates secularly between ~0.01 and ~0.09 (a factor-of-9 dynamic range). Law 5 — an equation involving all eight planets simultaneously — predicts the J2000 value to within 0.23% from a single balance condition that was originally derived from Fibonacci d-values chosen to satisfy Law 3 (inclination balance), not Law 5. This is a non-trivial cross-validation: the d-values were not optimized for eccentricity, yet they produce an eccentricity balance equation that predicts Saturn's eccentricity to within ~0.2% of the observed value.

**Epoch independence:** The agreement is not specific to the J2000 epoch. The mirror pairs act as communicating vessels that exchange AMD (Angular Momentum Deficit) secularly: when Saturn's eccentricity rises, Earth's falls, and vice versa. When all four pairs co-evolve with AMD conservation, Law 5's balance stays within 99.8–99.9% across Saturn's entire upper secular range (e = 0.054–0.088), compared to a 36–100% swing if Saturn oscillated alone. See [epoch-independence.js](../tools/verify/epoch-independence.js) for the full analysis.

With phase-derived base eccentricities, Law 5's balance reaches 99.8865% — naturally, with no forced constraints. See [eccentricity-balance.js](../tools/verify/eccentricity-balance.js) for the static analysis.

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
Σ(in-phase group) L_j × amp_j = Σ(anti-phase group) L_j × amp_j
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
Σ(in-phase) w_j = Σ(anti-phase) w_j
```

Where `w_j = √(m_j × a_j(1-e_j²)) / d_j` is the structural weight for each planet.

### Structural Weights

| Planet | Group | d | w_j |
|--------|-------|---|-----|
| Mercury | In-phase | 21 | 1.181 × 10⁻⁵ |
| Venus | In-phase | 34 | 3.914 × 10⁻⁵ |
| Earth | In-phase | 3 | 5.776 × 10⁻⁴ |
| Mars | In-phase | 5 | 1.396 × 10⁻⁴ |
| Jupiter | In-phase | 5 | 1.408 × 10⁻² |
| Uranus | In-phase | 21 | 1.375 × 10⁻³ |
| Neptune | In-phase | 34 | 1.155 × 10⁻³ |
| Saturn | Anti-phase | 3 | 1.737 × 10⁻² |

```
Σ(in-phase) w = 1.7374 × 10⁻²
Σ(anti-phase)  w = 1.7374 × 10⁻²

Difference: 9.6 × 10⁻⁷
Balance: 99.9972%
```

Jupiter (d=5) contributes the dominant in-phase weight (1.408 × 10⁻²). The remaining six planets collectively contribute 3.29 × 10⁻³ to match Saturn's total of 1.737 × 10⁻².

### TNO Contribution

The balance considers only the 8 major planets, which carry 99.994% of the solar system's orbital angular momentum. Trans-Neptunian Objects (TNOs) contribute the remaining ~0.006%, tilting the invariable plane by approximately 1.25″ ([Li, Xia & Zhou 2019](https://arxiv.org/abs/1909.11293)). The 0.0002% residual imbalance is well within this TNO margin.

---

## Eccentricity Balance Derivation

### The Balance Condition

The eccentricity balance states that orbital-period-weighted eccentricities, scaled by √(mass / Fibonacci divisor), cancel between the two phase groups:

```
Σ(in-phase) v_j = Σ(anti-phase) v_j

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
| Mercury | In-phase | 21 | 4.404 × 10⁻⁶ |
| Venus | In-phase | 34 | 1.119 × 10⁻⁶ |
| Earth | In-phase | 3 | 1.672 × 10⁻⁵ |
| Mars | In-phase | 5 | 4.463 × 10⁻⁵ |
| Jupiter | In-phase | 5 | 7.928 × 10⁻³ |
| Uranus | In-phase | 21 | 5.705 × 10⁻³ |
| Neptune | In-phase | 34 | 1.734 × 10⁻³ |
| Saturn | Anti-phase | 3 | 1.547 × 10⁻² |

```
Σ(in-phase) v = 1.543 × 10⁻²
Σ(anti-phase)  v = 1.547 × 10⁻²

Balance: 99.8865%
```

Saturn alone carries the entire anti-phase contribution. The in-phase group is dominated by Jupiter (7.928 × 10⁻³), Uranus (5.705 × 10⁻³), and Neptune (1.734 × 10⁻³), with the four inner planets contributing only 6.6 × 10⁻⁵ combined.

### Mirror Pair Decomposition

The gap decomposes by mirror pair into four contributions that nearly cancel:

| Pair | d | Gap contribution | % of total gap |
|------|---|-----------------|----------------|
| Earth ↔ Saturn | 3 | +1.545 × 10⁻² | +42,504% |
| Mars ↔ Jupiter | 5 | −7.973 × 10⁻³ | −21,928% |
| Mercury ↔ Uranus | 21 | −5.710 × 10⁻³ | −15,704% |
| Venus ↔ Neptune | 34 | −1.735 × 10⁻³ | −4,773% |
| **Sum** | | **3.636 × 10⁻⁵** | **100%** |

Four numbers spanning ±42,000% cancel to leave a negligible residual. The Earth–Saturn pair dominates because Saturn (anti-phase group) is 925× heavier than Earth in eccentricity weight, creating a large surplus. The three in-phase-only pairs (Mars–Jupiter, Mercury–Uranus, Venus–Neptune) collectively compensate, with Jupiter and Uranus providing the bulk of the compensation. The balance emerges from the "communicating vessel" structure of AMD exchange between paired planets.

### Non-Triviality

Three tests confirm the eccentricity balance is a genuine constraint on eccentricity values, not a structural artifact:

1. **Coefficient test**: The weight formula without eccentricities (`√m × a^(3/2) / √d`) gives only 74% balance — the eccentricity values contribute 26 percentage points of improvement
2. **Random test**: Substituting random eccentricities into the same weight formula gives 50–85% balance across 1000 trials
3. **Power test**: The balance peaks sharply at e¹·⁰ (99.89%), dropping to 98.5% for e⁰·⁹ and 98.4% for e¹·¹, and to 91% for e² — linear eccentricity is special

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

The eccentricity balance (Law 5) operates on linear e rather than e², suggesting it captures a first-order secular constraint distinct from the quadratic AMD conservation. The physical mechanism producing this linear balance remains an open question.

---

## Eccentricity Constant — Open Placeholder

**What the amplitude laws predict vs what remains open:**

- **Predicted**: all 8 inclination oscillation amplitudes (Law 2, from ψ)
- **Predicted**: all 8 eccentricity oscillation amplitudes (Law 4, from K)
- **Predicted**: Saturn's base eccentricity (Law 5, from the other seven, to ~0.2%)
- **Not predicted**: the remaining 7 base eccentricities — structural values set at formation, analogous to the 8 mean inclinations

---

## Inclination Amplitude Predictions

### Complete Solution

| Planet | d | Phase | Amplitude (°) | Mean (°) | Range (°) | LL bounds (°) | Margin (°) |
|--------|---|-------|---------------|----------|-----------|---------------|-----------|
| Mercury | 21 | In-phase | 0.386 | 6.728 | 6.34 – 7.11 | 4.57 – 9.86 | +1.772 |
| Venus | 34 | In-phase | 0.062 | 2.208 | 2.15 – 2.27 | 0.00 – 3.38 | +1.110 |
| Earth | 3 | In-phase | 0.636 | 1.481 | 0.85 – 2.12 | 0.00 – 2.95 | +0.833 |
| Mars | 5 | In-phase | 1.163 | 2.653 | 1.49 – 3.82 | 0.00 – 5.84 | +1.491 |
| Jupiter | 5 | In-phase | 0.021 | 0.329 | 0.31 – 0.35 | 0.24 – 0.49 | +0.067 |
| Saturn | 3 | Anti-phase | 0.065 | 0.932 | 0.87 – 1.00 | 0.797 – 1.02 | +0.023 |
| Uranus | 21 | In-phase | 0.024 | 1.001 | 0.98 – 1.02 | 0.90 – 1.11 | +0.075 |
| Neptune | 34 | In-phase | 0.014 | 0.722 | 0.71 – 0.74 | 0.55 – 0.80 | +0.064 |

**LL bounds: 8/8 pass** — All 8 planets' inclination ranges fit within Laplace-Lagrange secular theory bounds.

The non-trivial test is that these Fibonacci divisors simultaneously satisfy three independent constraints: (1) all 8 planets fit within their Laplace-Lagrange bounds (within 0.03° uncertainty), (2) the inclination structural weights balance to 99.9972% (Law 3), and (3) the eccentricity weights balance to 99.8865% (Law 5). The fact that pure Fibonacci numbers achieve all three is the core prediction of the theory.

### Worked Example: Earth's Inclination Amplitude

Earth has Fibonacci divisor d = 3 (= F₄). Step by step:

| Quantity | Expression | Value |
|----------|-----------|-------|
| ψ | d_E × amp_E × √m_E | 3.307 × 10⁻³ |
| d | F₄ | 3 |
| m | Earth mass (JPL DE440) | 3.0027 × 10⁻⁶ M☉ |
| √m | | 1.7331 × 10⁻³ |
| d × √m | 3 × 1.7331 × 10⁻³ | 5.1992 × 10⁻³ |
| **amplitude** | **3.307 × 10⁻³ / 5.1992 × 10⁻³** | **0.636 °** |

The mean is computed from the J2000 constraint:

```
mean = inclJ2000 - amplitude × cos(ω̃_J2000 - phaseAngle)
     = 1.57867° - 0.636° × cos(102.947° - 21.77°)
     = 1.57867° - 0.636° × cos(81.177°)
     = 1.57867° - 0.636° × 0.15315
     = 1.48188°
```

#### How ψ is derived from Earth

Earth's inclination amplitude (`earthInvPlaneInclinationAmplitude` = 0.6360°) is fitted by calibrating the obliquity rate to match the IAU 2006 precession model (Capitaine et al. 2003), which specifies a rate of −46.836769"/century. In the 3D model, the obliquity depends on the amplitude through:

```
obliquity = earthtiltMean − A × cos(phase₃) + A × cos(phase₈)
```

where A is the amplitude, phase₃ is the H/3 inclination cycle, and phase₈ is the H/8 obliquity cycle (the Fibonacci beat of the H/5 ecliptic precession and the H/3 inclination precession, via 3 + 5 = 8). The obliquity rate sensitivity is approximately −82.70"/century per degree of amplitude.

ψ is then computed as `3 × A × √m_Earth`, and all 7 non-Earth amplitudes follow from `ψ / (d × √m)`. For current values, see [Constants Reference](20-constants-reference.md).

---

## Implementation

```javascript
// Fundamental constants
const H = 335317; // See Constants Reference for current value
const PSI = 3 * earthInclAmp * Math.sqrt(earthMass);  // = 3.307 × 10⁻³ (from Earth)

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

// Per-planet phase angles (ICRF perihelion at balanced year n=7 ≈ -2,649,854 BC)
// Re-fit 2026-04-09 to match JPL ecliptic-inclination trends in the J2000-fixed frame.
const PHASE_ANGLE = {
  mercury: 234.52, venus: 259.82, earth: 21.77, mars: 231.95,
  jupiter: 291.18, saturn: 120.38, uranus: 21.33, neptune: 174.04
};
// Saturn is anti-phase (MAX at balanced year, others at MIN).
// Earth is locked to its IAU-derived n=0 reference; the other 7 share anchor n=7.

// Compute amplitude for a planet (Law 2)
function getFibonacciAmplitude(planet, mass) {
  const d = FIBONACCI_D[planet];
  const sqrtM = Math.sqrt(mass);
  return PSI / (d * sqrtM);
}

// Verify the inclination balance condition (Law 3)
function computeInclinationBalance(planets) {
  let sumPro = 0, sumAnti = 0;

  for (const [name, p] of Object.entries(planets)) {
    const w = Math.sqrt(p.mass * p.a * (1 - p.e * p.e)) / FIBONACCI_D[name];
    if (name !== 'saturn') sumPro += w; else sumAnti += w;
  }

  const residual = Math.abs(sumPro - sumAnti);
  const balance = 1 - residual / (sumPro + sumAnti);
  return { sumPro, sumAnti, balance };  // balance ≈ 0.999998
}

// Verify the eccentricity balance condition (Law 5)
function computeEccentricityBalance(planets) {
  let sumPro = 0, sumAnti = 0;

  for (const [name, p] of Object.entries(planets)) {
    const d = FIBONACCI_D[name];
    const v = Math.sqrt(p.mass) * Math.pow(p.a, 1.5) * p.e / Math.sqrt(d);
    if (name !== 'saturn') sumPro += v; else sumAnti += v;
  }

  const residual = Math.abs(sumPro - sumAnti);
  const balance = 1 - residual / (sumPro + sumAnti);
  return { sumPro, sumAnti, balance };  // balance ≈ 0.9988
}
```

---

## Validation

### Test 1: Fibonacci Law Holds

For all 8 planets, verify `d × amplitude × √m = ψ` to machine precision.

### Test 2: All Planets Within LL Bounds

Compute `mean ± amplitude` for each planet and verify the range falls within the Laplace-Lagrange secular theory bounds (from Fitzpatrick Table 10.3, converted from radians).

### Test 3: Inclination Balance

Verify `Σ(in-phase) w_j = Σ(anti-phase) w_j` to 99.9972% balance.

### Test 4: Eccentricity Balance

Verify `Σ(in-phase) v_j = Σ(anti-phase) v_j` to 99.8865% balance.

### Test 5: Saturn Eccentricity Prediction from Law 5

Compute Saturn's eccentricity from the eccentricity balance equation (Law 5). Verify: predicted e_Saturn is within ~0.3% of observed J2000 value (0.053858). This is a single equation in eight unknowns, sufficient to predict Saturn given the other seven.

### Test 6: J2000 Inclination Match

At J2000 epoch, `i(2000) = mean + amplitude × cos(ω̃_J2000 - phaseAngle)` should match observed invariable plane inclinations.

### Test 7: Eccentricity Amplitude Constant (Law 4)

Verifies that `e_amp = K × sin(tilt) × √d / (√m × a^1.5)` holds for all 8 planets with a single K derived from Earth.

### Test 8: Saturn Eccentricity from Law 5

Verifies that Law 5 (eccentricity balance) predicts Saturn's base eccentricity from the other seven planets to ~0.2%.

---

## Exhaustive Search and Preset Generation

The Fibonacci divisor assignments are not hand-picked — they emerge from an exhaustive search over all possible configurations. The search script ([balance-search.js](../tools/verify/balance-search.js)) reproduces the exact computation chain from `script.js` and evaluates every combination.

### Search Space

The search iterates over:
- **Fibonacci divisors**: d ∈ {1, 2, 3, 5, 8, 13, 21, 34, 55} for Mercury, Venus, Mars, Uranus, Neptune
- **Balance group**: in-phase or anti-phase for each of the above
- **4 scenarios** for Jupiter and Saturn (fixed per scenario):
  - A: Ju=5, Sa=3 — B: Ju=8, Sa=5 — C: Ju=13, Sa=8 — D: Ju=21, Sa=13
- **Earth**: locked at d=3, in-phase group

This produces 9 × 2 × 9 × 2 × 9 × 2 × 9 × 2 × 9 × 2 × 4 = 7,558,272 configurations per run.

### What the Search Computes

For each configuration, the script computes:
1. **Balance** — vector balance percentage using `w_j = √(m_j × a_j(1-e_j²)) / d_j`
2. **LL bounds check** — whether each planet's `[mean - amp, mean + amp]` falls within Laplace-Lagrange bounds
3. **Direction check** — whether the inclination trend at 1900→2100 matches JPL sign

Only configurations with balance ≥ 99.994% (the TNO margin) are retained.

### Output

The search writes `data/balance-presets.json` containing the deep-analysis survivors (per-config optimised anchor, ascending nodes, and phase angles), sorted by eccentricity balance. The current run yields 41 presets.

### Shared Input Values

Both the search script (`tools/verify/balance-search.js`) and the application (`script.js`) use `tools/lib/constants.js` as the single source of truth for all planetary parameters. No manual sync is needed.

### Regenerating Presets

```bash
# 1. Run the exhaustive search (writes data/balance-presets.json)
node tools/verify/balance-search.js

# 2. Sync to script.js
node tools/fit/export-to-script.js --write
```

**When to regenerate**: any change to eccentricity, semi-major axis, mass ratios, the ψ-constant, or the Laplace-Lagrange bounds will shift the balance percentages and potentially change which configurations qualify.

---

## Open Questions

1. **Base eccentricity formula** — Law 4 predicts eccentricity *amplitudes*, and Law 5 predicts Saturn's *base* eccentricity from the other seven. The remaining seven base eccentricities have no known universal formula — exhaustive search shows no power-law ansatz in `(d, m, a, tilt)` produces a universal constant across all 8 planets.

2. **Physical derivation of eccentricity balance** — The inclination balance follows from angular momentum conservation. What conservation law or secular perturbation mechanism produces the eccentricity balance? The linear (rather than quadratic) dependence on e distinguishes it from AMD conservation.

3. **Universality** — Do the balance conditions hold for other planetary systems, or are they specific to the solar system's Fibonacci divisor structure?

---

## Relation to Existing Physics

### What builds on established theory

**Law 3 (Inclination Balance)** is rooted in **angular momentum conservation**. The weight factor `√(m·a(1-e²))` is proportional to a planet's orbital angular momentum `L`. The invariable plane is defined as the plane perpendicular to the total angular momentum vector, so inclination oscillations must balance around it — that is what makes it the invariable plane. The novel contribution is that dividing by a Fibonacci divisor `d` preserves the balance to 99.9972%.

**Phase angles** are per-planet values (ICRF perihelion longitude at the balanced year) that cluster near the **eigenmodes of Laplace-Lagrange secular perturbation theory** (γ₁-γ₈) within 1-10°. Saturn's anti-phase behavior (MAX inclination at balanced year, opposite to all other planets) is consistent with its known retrograde precession in secular theory.

**Law 5 (Eccentricity Balance)** connects to **Angular Momentum Deficit (AMD) conservation**, a known conserved quantity in secular theory. The weight `√m × a^(3/2) × e / √d` contains factors related to how AMD is partitioned among planets. However, the linear dependence on eccentricity (rather than quadratic, as in the AMD itself) and the `1/√d` scaling distinguish it from the standard AMD formulation. The balance operates as a **closed 8-planet system** — the mirror pairs exchange AMD as communicating vessels, while TNOs and other small bodies cannot participate (the a^(3/2) weighting makes them disproportionately heavy, and they lack paired counterparts). This contrasts with the inclination balance (Law 3), which is a global property where all solar system mass contributes.

### What appears genuinely new

1. **Fibonacci quantization of oscillation amplitudes** — No known physical theory predicts that Fibonacci numbers should appear as divisors in planetary inclination or eccentricity amplitudes. The relationships `d × inclAmp × √m = ψ` (Law 2) and `e_amp = K × sin(tilt) × √d / (√m × a^1.5)` (Law 4), with `d` restricted to pure Fibonacci numbers, cannot be derived from Newtonian gravity, general relativity, or Laplace-Lagrange secular perturbation theory.

2. **Two universal amplitude constants ψ and K** — Both are empirical, derived from Earth, and predict all 8 planets with zero free parameters. No known theory explains why they exist or why Fibonacci divisors are the correct modulation.

3. **Mirror symmetry across the asteroid belt** (Me↔Ur, Ve↔Ne, Ea↔Sa, Ma↔Ju) — No known law predicts that inner and outer planets should pair with identical Fibonacci divisors. The fact that the pairs follow distance ordering (belt-adjacent=5, middle=3, far=34, outermost=21) is unexplained.

4. **Simultaneous satisfaction of three independent constraints** — Pure Fibonacci d-values satisfy all three conditions (Laplace-Lagrange bounds, inclination balance, eccentricity balance) at the same time. Law 5 uses `1/√d` scaling while Law 3 uses `1/d`, making them genuinely independent constraints. Out of the valid configurations, only one is also mirror-symmetric — the default configuration.

5. **Saturn eccentricity prediction from Law 5** — Law 5 (eccentricity balance) is one equation in eight unknowns, sufficient to uniquely determine Saturn's eccentricity from the other seven. The prediction (0.05373) matches the J2000 observed value (0.05386) to ~0.23%. The d-values were originally chosen to match Laws 1, 2, and 3 — *not* tuned for eccentricity — yet they produce a Law 5 balance equation that nevertheless predicts Saturn's eccentricity to sub-percent accuracy.

### Assessment

The balance conditions (Laws 3 and 5) combine known conservation principles with a novel Fibonacci structure that modulates the planetary weights. The conservation laws guarantee that inclination and eccentricity oscillations balance around the invariable plane — but they do not predict that integer Fibonacci divisors should preserve that balance to such high precision.

Laws 2 and 4 (the amplitude constants ψ and K) are the most genuinely novel claims — no existing theory predicts that Fibonacci divisors should produce universal constants for either inclination or eccentricity amplitudes across all eight planets.

The key unresolved question is **why Fibonacci numbers work**: do they encode something about the secular eigenmode structure (real physics), or is the Fibonacci restriction a coincidence made possible by having enough number choices? The mirror symmetry and the uniqueness of the default configuration argue against coincidence, but a theoretical derivation from first principles — or a successful prediction for an independent system such as exoplanetary or satellite systems — would be needed to settle the question definitively.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [20 - Constants Reference](20-constants-reference.md) | All constants and values |
| [32 - Inclination Calculations](32-inclination-calculations.md) | Inclination oscillation implementation |
| [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md) | Height above/below invariable plane |
| [05 - Invariable Plane Overview](05-invariable-plane-overview.md) | Conceptual background |
| [Inclination Optimization](../tools/verify/inclination-optimization.js) | Optimization script |
| [Balance Search](../tools/verify/balance-search.js) | Exhaustive search + deep analysis: five-stage pipeline producing 41 survivors with per-config optimised anchor and ascending nodes |
| [Verify Laws](../tools/verify/verify-laws.js) | Comprehensive verification of all six laws, five findings, and predictions |
| [Configuration Analysis](../tools/verify/configuration-analysis.js) | Historical: four-filter intersection analysis of all 7.56M configurations (superseded by the sequential pipeline in balance-search.js) |
| [Eccentricity Balance](../tools/verify/eccentricity-balance.js) | Balance decomposition, sensitivity, TNO closed-system argument |
| [Epoch Independence](../tools/verify/epoch-independence.js) | AMD exchange across mirror pairs, balance stability across Saturn's secular cycle |

---

**Previous**: [70 - Ascending Node Calculations Limitations](70-ascending-node-limitations.md)
