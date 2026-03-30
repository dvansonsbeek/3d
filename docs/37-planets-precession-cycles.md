# 37 — Planetary Precession & Obliquity Cycles

## Overview

Each planet has up to five distinct precession/oscillation phenomena. For Earth,
all rates are Fibonacci multiples of 1/H. This document investigates whether the
same structure extends to the other planets.

| # | Phenomenon | Earth example | Description |
|---|-----------|---------------|-------------|
| 1 | Inclination precession (ascending node) | H/3 | Orbital plane precesses against invariable plane |
| 2 | Ecliptic precession | H/5 | Intermediate layer linking obliquity and axial precession |
| 3 | Obliquity cycle | H/8 | Axial tilt angle oscillates |
| 4 | Axial precession | H/13 | Spin axis traces a cone (direction changes, tilt stays same) |
| 5 | Perihelion precession (ecliptic) | H/16 | Perihelion point advances against ecliptic |

**Earth's Fibonacci rate identities** (rates ω = 1/period, in units of 1/H):

```
 8 = 5 + 3    obliquity = ecliptic + inclination
13 = 8 + 5    axial = obliquity + ecliptic
16 = 13 + 3   perihelion ecl = axial + inclination
```

---

## Reference: Secular Eigenfrequencies

The solar system has 8 fundamental apsidal frequencies (g₁–g₈) and 8 nodal
frequencies (s₁–s₈) from Laplace-Lagrange secular perturbation theory. Each
planet's actual precession is a superposition of all 8 modes. The table below
uses Laskar 2004 values (Table 3, 20–50 Myr numerical integration), which
supersede the earlier Brouwer & van Woerkom (1950) analytical solution.

| Mode | g_i ("/yr) | Apsidal period | \|s_i\| ("/yr) | Nodal period | \|g_i\|≈\|s_i\|? | Planet |
|------|-----------|----------------|-------------|--------------|--------------|--------|
| 1 | 5.59 | 231,842 yr | 5.59 | 231,842 yr | **0.0%** | Mercury |
| 2 | 7.452 | 173,913 yr | 7.05 | 183,830 yr | 5.4% | Venus |
| 3 | 17.368 | 74,620 yr | 18.850 | 68,753 yr | **8.5%** | Earth |
| 4 | 17.916 | 72,336 yr | 17.755 | 72,991 yr | **0.9%** | Mars |
| 5 | 4.257 | 304,438 yr | 0.000 | ∞ (inv. plane) | ∞ | Jupiter |
| 6 | 28.245 | 45,884 yr | 26.348 | 49,187 yr | 6.7% | Saturn |
| 7 | 3.088 | 419,689 yr | 2.993 | 433,010 yr | 3.1% | Uranus |
| 8 | 0.673 | 1,925,705 yr | 0.692 | 1,872,832 yr | 2.7% | Neptune |

Frequencies from Laskar, J. et al. (2004), *A&A* 428, 261–285, Table 3. Periods computed as 1,296,000″ / rate. These are **external reference values** from numerical integration, not model outputs. The Holistic Universe Model assigns a single H-based period per planet (see the next table), which corresponds to the *dominant* eigenmode for each planet.

### Are apsidal and nodal precession the same?

For most planets, |g_i| ≈ |s_i| to within a few percent. Mercury and Mars are
nearly identical (0.0% and 0.9%). Earth is the notable exception (8.5%), but
Earth has its special 6-layer hierarchy in the model. Jupiter is unique: s₅ = 0
because the invariable plane (Jupiter-dominated) doesn't precess by definition.

**Conclusion**: The model's assumption that ascending node and perihelion
precess at the same rate is well-supported by the eigenfrequency data for most
planets. The exception is Earth, which is handled separately with its full
precession hierarchy.

---

### Perihelion longitude advance (dϖ/dt)

| Planet | Baseline ("/cy) | Period (yr) | H Ratio | H-predicted period | Error |
|--------|----------------|-------------|---------|-------------------|-------|
| Mercury | +531.4 | 243,867 | H × 8/11 | 243,867 yr | — |
| Venus | +193.3 | 670,634 | H × 2 | 670,634 yr | — |
| Earth | +1,159.5 | 111,772 | H/3 | 111,772 yr | — |
| Mars | +1,674.8 | 77,381 | H × 3/13 | 77,381 yr | — |
| Jupiter | +1,932.5 | 67,063 | H/5 | 67,063 yr | — |
| Saturn | −3,092.0 | 41,915 (r) | H/8 | 41,915 yr | — |
| Uranus | +1,159.5 | 111,772 | H/3 | 111,772 yr | — |
| Neptune | +193.3 | 670,634 | H × 2 | 670,634 yr | — |

Source: WebGeoCalc analysis of long-term perihelion longitude evolution.

**Notable patterns:**
- **Venus = Neptune** (both H×2) — inner/outer mirror symmetry
- **Earth = Uranus** (both H/3) — same period, same rate
- **Jupiter = H/5**, **Saturn = H/8** — consecutive Fibonacci denominators
- Saturn is the only planet with retrograde perihelion precession against the ecliptic
- Mercury's H × 8/11: 8 is Fibonacci (F6), 11 is Lucas (L5)

---

## Reference: Axial Precession Rates

| Planet | Rate | Period | Direction | Source |
|--------|------|--------|-----------|--------|
| Mercury | Cassini state (locked) | ~300 kyr | Retrograde | Peale 2006; Margot+ 2012 |
| Venus | ~44"/yr (cone period ~29 kyr) | ~29 kyr | Prograde (obliquity 177°) | Cottereau & Souchay 2009 (A&A) |
| Earth | 50.29"/yr | 25,771 yr | Retrograde | IAU 2006 |
| Mars | 7604 ± 6 mas/yr | 170,400 yr | Retrograde | Konopliv+ 2020 (InSight/RISE) |
| Jupiter | 2.64–3.17 "/yr | 113–136 kyr | Retrograde | Saillenfest+ 2020 (A&A) |
| Saturn | 0.747–0.894 "/yr | 400–480 kyr | Retrograde | Saillenfest+ 2021 (Nature Astron.) |
| Uranus | 0.0075–0.0092 "/yr | ~40–50 Myr (bare) | Prograde (obliquity 98°) | Saillenfest+ 2022 (A&A) |
| Neptune | ~0.005 "/yr (est.) | ~70 Myr (est.) | Retrograde | Ward & Hamilton 2004 (est.) |

Notes:
- Mercury is in a Cassini state: spin axis co-precesses with orbital node.
- Venus and Uranus have prograde precession because obliquity > 90° (cos flips sign).
- Jupiter alpha depends on polar moment of inertia λ (0.220–0.265). Near resonance with s₇.
- Saturn alpha depends on λ (0.200–0.240). Captured in resonance with s₈.

---

## Reference: Obliquity Oscillation

| Planet | Period | Amplitude | Character | Source |
|--------|--------|-----------|-----------|--------|
| Mercury | ~895 kyr | ~0.03° | Regular, tiny | Bills 2005; Yseboodt & Margot 2006 |
| Venus | None | N/A | Tidally damped at 177° | Correia & Laskar 2003 |
| Earth | ~41,000 yr (H/8) | 22.1°–24.5° | Regular (Moon stabilizes) | Laskar+ 1993 |
| Mars | ~124,800 yr | 15°–35° (short-term) | Quasi-periodic, chaotic long-term | Ward 1973; Laskar+ 2004 |
| Jupiter | No regular cycle | 3.1° → 6–37° (Gyr) | Secular trend upward | Saillenfest+ 2020 |
| Saturn | No regular cycle | 26.7° → 65°+ (Gyr) | Resonance-captured, trending up | Saillenfest+ 2021 |
| Uranus | Frozen | ~98° (stable) | Set by ancient impact/satellite | Saillenfest+ 2022 |
| Neptune | Frozen | ~28° (stable) | Set during migration era | Rogoszinski & Hamilton 2020 |

Mars obliquity: the dominant modes are |p + s₃| at ~116 kyr and |p + s₄| at
~129 kyr. The amplitude-weighted average is ~124,800 yr. The published range of
120–128 kyr reflects the superposition. Chaotic diffusion on Myr timescales
allows obliquity to wander 0°–60°+.

---

## DEEP DIVE: Mars

### Known values

| Phenomenon | Observed value | H expression | H rate | Error |
|-----------|---------------|-------------|--------|-------|
| Inclination (inv. plane) | ≈ perihelion ecliptic (g₄ ≈ \|s₄\|) | **3H/13** = 77,381 yr | 13/(3H) | — |
| Obliquity cycle | ~124,800 yr (s₃+s₄ weighted) | **3H/8** = 125,744 yr | 8/(3H) | 0.7% |
| Perihelion ecliptic (ϖ) | 77,381 yr (WebGeoCalc) | **3H/13** = 77,381 yr | 13/(3H) | 0.0% |
| Axial precession | 170,400 yr (InSight) | **H/2** = 167,659 yr | 2/H | 1.7% |

Note: Mars's apsidal eigenfrequency g₄ = 17.916"/yr and nodal eigenfrequency
|s₄| = 17.755"/yr differ by only 0.9%. The model treats inclination and
perihelion ecliptic as precessing at the same rate (3H/13), which is consistent
with the eigenfrequency data.

### Mars vs Earth comparison

| Precession type | Earth rate | Earth period | Mars rate | Mars period |
|----------------|-----------|-------------|----------|-------------|
| Inclination (inv. plane) | 3/H | H/3 = 111,772 yr | 13/(3H) | 3H/13 = 77,381 yr |
| Ecliptic precession | 5/H | H/5 = 67,063 yr | **?** | **?** (predicted 3H/5) |
| Obliquity cycle | 8/H | H/8 = 41,915 yr | 8/(3H) | 3H/8 = 125,744 yr |
| Axial precession | 13/H | H/13 = 25,794 yr | 2/H | H/2 = 167,659 yr |
| Perihelion (ecliptic) | 16/H | H/16 = 20,957 yr | 13/(3H) | 3H/13 = 77,381 yr |
| Perihelion (ICRF) | 3/H | H/3 = 111,772 yr | 26/(3H) | 3H/26 = 38,690 yr |

### Fibonacci analysis

**Earth** — rates in units of 1/H: {3, 5, 8, 13, 16}

All are Fibonacci numbers or sums thereof. Identities:

```
 8 = 5 + 3    obliquity = ecliptic + inclination
13 = 8 + 5    axial = obliquity + ecliptic
16 = 13 + 3   perihelion = axial + inclination
```

**Mars** — rates for obliquity and perihelion ecliptic share a 1/(3H) base:

```
obliquity:        8/(3H)  →  3H/8  = 125,744 yr
perihelion ecl:  13/(3H)  →  3H/13 =  77,381 yr
```

The Fibonacci identity **13 = 8 + 5** predicts:

```
perihelion ecl = obliquity + ecliptic
13/(3H) = 8/(3H) + 5/(3H)
```

This gives a **predicted Mars ecliptic precession = 3H/5 = 201,190 yr**.

**Mars axial precession**: H/2 = 167,659 yr (rate = 2/H = 6/(3H)). The value 6
is not a Fibonacci number, suggesting either:

- (a) H/2 is approximate and the true value follows a different Fibonacci ratio
- (b) Axial precession follows a different structural rule than orbital precessions
- (c) The 3H scaling applies only to orbital-plane phenomena

### Key measurement sources for Mars

- **Axial precession**: Konopliv et al. 2020, "Detection of the Chandler Wobble
  of Mars From Orbiting Spacecraft", *Geophysical Research Letters* — rate
  7604 ± 6 mas/yr from InSight + 3 landers spanning 1976–2019.
- **Perihelion longitude**: WebGeoCalc long-term analysis — dϖ/dt ≈ +1674.8"/cy
  → 77,381 yr = 3H/13 (exact match).
- **Eigenfrequencies**: g₄ = 17.916"/yr (apsidal), s₄ = -17.755"/yr (nodal) —
  differ by only 0.9%, supporting the model's single-rate assumption.
  Source: Laskar et al. 2004, Table 3.
- **Obliquity cycle**: Laskar et al. 2004, "Long term evolution and chaotic
  diffusion of the insolation quantities of Mars", *Icarus* 170, 343–364.
  Ward 1973, "Large-Scale Variations in the Obliquity of Mars", *Science* 181.
  Dominant modes: |p + s₃| at ~116 kyr, |p + s₄| at ~129 kyr.

---

## DEEP DIVE: Earth (reference)

| Phenomenon | Period | H expression | Rate (1/H units) |
|-----------|--------|-------------|------------------|
| Inclination (inv. plane) | 111,772 yr | H/3 | 3 |
| Ecliptic precession | 67,063 yr | H/5 | 5 |
| Obliquity cycle | 41,915 yr | H/8 | 8 |
| Axial precession | 25,794 yr | H/13 | 13 |
| Perihelion (ecliptic) | 20,957 yr | H/16 | 16 |
| Perihelion (ICRF) | 111,772 yr | H/3 | 3 |

Earth's perihelion ICRF = H/3 comes from converting the ecliptic value:

```
precessionEclipticToICRF(H/16, H/13) = (H/16 × H/13) / (H/13 − H/16) = H/3
```

All six precession layers in the model hierarchy:

```
earth (−13/H) → inclination (+3/H) → ecliptic (+5/H) → obliquity (−8/H)
  → perihelion1 (+16/H) → perihelion2 (−16/H)
Net = −13/H  (axial precession rate)
```

---

## Axial Precession Constants (model, `script.js`)

Current H-based fits used in the simulation:

| Planet | Constant | Formula | Period | Direction | Observed | Source |
|--------|----------|---------|--------|-----------|----------|--------|
| Mercury | `mercuryAxialPrecessionYears` | `-mercuryPerihelionEclipticYears` | 243,867 yr | Retrograde | ~300 kyr (Cassini) | Peale 2006 |
| Venus | `venusAxialPrecessionYears` | `H×3/34` (F4/F9) | 29,560 yr | Prograde | ~29 kyr | Cottereau & Souchay 2009 |
| Mars | `marsAxialPrecessionYears` | `-H/2` | 167,659 yr | Retrograde | 170,400 yr | Konopliv+ 2020 |
| Jupiter | `jupiterAxialPrecessionYears` | `-H×3/8` (F4/F6) | 125,744 yr | Retrograde | 113–136 kyr | Saillenfest+ 2020 |
| Saturn | `saturnAxialPrecessionYears` | `-H×4/3` | 446,677 yr | Retrograde | 400–480 kyr | Saillenfest+ 2021 |
| Uranus | `uranusAxialPrecessionYears` | `H×610` (F15) | 204 Myr | Prograde | ~40–50 Myr (bare) | Saillenfest+ 2022 |
| Neptune | `neptuneAxialPrecessionYears` | `-H×68` (2×F9) | 22.8 Myr | Retrograde | ~70 Myr (est.) | Ward & Hamilton 2004 |

Note: These are initial fits subject to revision as the Fibonacci pattern analysis
continues. The Uranus and Neptune observed values have large uncertainties.

---

## Wobble Center Speed Derivation (Eccentricity Cycle)

The wobble center speed (= eccentricity cycle period) for each planet is derived
from two independently known quantities:

1. **Perihelion (ICRF)** — the planet's perihelion precession rate in the
   inertial frame, derived from `PerihelionEclipticYears` via the ecliptic-to-ICRF
   conversion: `T_ICRF = (T_ecl × H/13) / (H/13 − T_ecl)`
2. **Axial precession** — the planet's spin-axis cone rate (`AxialPrecessionYears`)

The wobble is the **meeting frequency** of these two motions:

- **Opposite directions** (one prograde, one retrograde):
  `1/T_wobble = 1/|T_axial| + 1/|T_peri_ICRF|`
- **Same direction** (both retrograde or both prograde):
  `1/T_wobble = |1/|T_axial| − 1/|T_peri_ICRF||`

**Earth verification**: Axial = H/13 (retrograde), Perihelion ICRF = H/3
(prograde) → opposite → 13/H + 3/H = 16/H → **wobble = H/16** ✓

### Part 1: Perihelion (ICRF) (from PerihelionEclipticYears)

| Planet | Perihelion Ecliptic | H expr | → Perihelion (ICRF) | H expr | Dir |
|--------|--------------------|---------|--------------------|--------|-----|
| Mercury | 243,867 yr | H×8/11 | −28,844 yr | −8H/93 | retro |
| Venus | 670,634 yr | H×2 | −26,825 yr | −2H/25 | retro |
| Earth | 20,957 yr | H/16 | +111,772 yr | +H/3 | **pro** |
| Mars | 77,381 yr | 3H/13 | −38,690 yr | −3H/26 | retro |
| Jupiter | 67,063 yr | H/5 | −41,915 yr | −H/8 | retro |
| Saturn | −41,915 yr (r) | −H/8 | −15,967 yr | −H/21 | retro |
| Uranus | 111,772 yr | H/3 | −33,532 yr | −H/10 | retro |
| Neptune | 670,634 yr | H×2 | −26,825 yr | −2H/25 | retro |

Notable ICRF patterns: Jupiter = **H/8** (F6), Saturn = **H/21** (F8).
Earth is the only planet with prograde perihelion ICRF.

### Part 2: Axial Precession (from research)

| Planet | Period | H expression | Direction |
|--------|--------|-------------|-----------|
| Mercury | 243,867 yr | −H×8/11 | Retrograde (Cassini) |
| Venus | 29,560 yr | +H×3/34 | Prograde (obliq 177°) |
| Earth | 25,794 yr | −H/13 | Retrograde |
| Mars | 167,659 yr | −H/2 | Retrograde |
| Jupiter | 125,744 yr | −H×3/8 | Retrograde |
| Saturn | 446,677 yr | −H×4/3 | Retrograde |
| Uranus | 204 Myr | +H×610 | Prograde (obliq 98°) |
| Neptune | 22.8 Myr | −H×68 | Retrograde |

### Part 3: Eccentricity Cycle = Meeting Frequency (axial meets perihelion ICRF)

| Planet | Axial dir | Peri ICRF dir | Formula | Ecc. cycle rate | Period | H expr |
|--------|-----------|---------------|---------|-------------|--------|--------|
| Mercury | retro | retro | same: \|diff\| | 82/(8H) | 32,714 yr | 4H/41 |
| Venus | pro | retro | opp: sum | 143/(6H) | 14,069 yr | 6H/143 |
| Earth | retro | pro | opp: sum | 16/H | 20,957 yr | **H/16** |
| Mars | retro | retro | same: \|diff\| | 20/(3H) | 50,298 yr | 3H/20 |
| Jupiter | retro | retro | same: \|diff\| | 16/(3H) | 62,872 yr | **3H/16** |
| Saturn | retro | retro | same: \|diff\| | 81/(4H) | 16,559 yr | 4H/81 |
| Uranus | pro | retro | opp: sum | ≈10/H | 33,532 yr | ≈H/10 |
| Neptune | retro | retro | same: \|diff\| | ≈25/(2H) | 26,825 yr | ≈2H/25 |

Calculation detail:
- **Mercury**: |11/(8H) − 93/(8H)| = 82/(8H) = 41/(4H)
- **Venus**: 34/(3H) + 25/(2H) = 68/(6H) + 75/(6H) = 143/(6H)
- **Earth**: 13/H + 3/H = 16/H ✓
- **Mars**: |2/H − 26/(3H)| = |6/(3H) − 26/(3H)| = 20/(3H)
- **Jupiter**: |8/(3H) − 8/H| = |8/(3H) − 24/(3H)| = 16/(3H)
- **Saturn**: |3/(4H) − 21/H| = |3/(4H) − 84/(4H)| = 81/(4H)
- **Uranus**: 1/(H×610) + 10/H ≈ 10/H (axial negligible)
- **Neptune**: |1/(68H) − 25/(2H)| ≈ 25/(2H) (axial negligible)

Notable: Jupiter's eccentricity cycle = **3H/16** uses Fibonacci 16. For Uranus and Neptune
the extremely slow axial precession makes the eccentricity cycle nearly equal to the
perihelion ICRF rate.

---

## Obliquity Cycle Theory: Fibonacci Decomposition

### The principle

For Earth, the five precession rates form a Fibonacci chain (rates in 1/H):

```
inclination=3, ecliptic=5, obliquity=8, axial=13, perihelion_ecl=16
```

with the additive identities: 8 = 5 + 3, 13 = 8 + 5, 16 = 13 + 3.

The **obliquity identity** is: inclination = obliquity + ecliptic (8 = 5 + 3 rearranged
as 3 = 8 − 5). For non-Earth planets, the model assumes inclination ≈ perihelion
ecliptic (g ≈ s). This allows us to predict the obliquity cycle from the Fibonacci
decomposition of the perihelion ecliptic rate:

**perihelion ecliptic rate = obliquity rate + ecliptic rate**

Each planet's perihelion ecliptic rate has a known H-expression with a rate
numerator N and a rate base. The Fibonacci decomposition N = A + B determines
both the obliquity and ecliptic precession rates.

### Three confirmed predictions

| Planet | Peri ecl rate | Base | N | Decomp | Obliquity | Period | Observed | Error |
|--------|-------------|------|---|--------|-----------|--------|----------|-------|
| Mercury | 11/(8H) | 1/(8H) | 11 | 3 + 8 | 3/(8H) | 8H/3 = 894,179 yr | ~895 kyr | 0.2% |
| Earth | 8/H (obliquity level) | 1/H | 8 | 5 + 3 | 8/H | H/8 = 41,915 yr | ~41,000 yr | 2% |
| Mars | 13/(3H) | 1/(3H) | 13 | 8 + 5 | 8/(3H) | 3H/8 = 125,744 yr | ~124,800 yr | 0.7% |

All three confirmed obliquity cycles involve the Fibonacci number **8** in the period
expression: 8H/3, H/8, 3H/8.

### Cross-planet connections

Three cross-planet period matches link obliquity cycles to other planets' precession:

| Connection | Period | Significance |
|-----------|--------|-------------|
| Mars obliquity = Jupiter axial | 3H/8 = 125,744 yr | Exact match, mirror pair (d=5) |
| Mercury obliquity ≈ 2 × Saturn axial | 8H/3 ≈ 2 × H×4/3 | 894,179 ≈ 894,178 yr |
| Earth obliquity = Saturn peri ecl = Jupiter peri ICRF | H/8 = 41,915 yr | Same Fibonacci rate (8/H) |

The Mars-Jupiter connection is the strongest: both are mirror pairs (d=5) and the
match is exact. If this reciprocity extends: **Jupiter obliquity = Mars axial = H/2**.

### Predictions for all planets

| Planet | Peri ecl | N | Decomp | Obliquity prediction | Ecliptic prediction | Status |
|--------|---------|---|--------|---------------------|---------------------|--------|
| Mercury | H×8/11 | 11 | 3 + 8 | **8H/3 = ~894,179 yr** | H = 335,317 yr | ✓ Confirmed |
| Venus | H×2 | 1 | — | N/A | N/A | ✓ Consistent (tidally damped) |
| Earth | H/16 | 8 | 5 + 3 | **H/8 = ~41,915 yr** | H/5 = ~67,063 yr | ✓ Confirmed |
| Mars | 3H/13 | 13 | 8 + 5 | **3H/8 = ~125,744 yr** | 3H/5 = ~201,190 yr | ✓ Confirmed |
| Jupiter | H/5 | 5 | 2 + 3 | **H/2 = ~167,659 yr** | H/3 = ~111,772 yr | Prediction |
| Saturn | H/8 (r) | 8 | 5 + 3 | **H/5 = ~67,063 yr** or **H/3 = ~111,772 yr** | H/3 or H/5 | Ambiguous |
| Uranus | H/3 | 3 | 2 + 1 | **H/2 = ~167,659 yr** or **H = 335,317 yr** | H or H/2 | Ambiguous |
| Neptune | H×2 | 1 | — | N/A | N/A | ✓ Consistent (frozen) |

### Resolving ambiguities

**Jupiter** (5 = 2 + 3): The Mars-Jupiter mirror-pair reciprocity resolves this
uniquely. Mars obliquity = Jupiter axial (confirmed), therefore Jupiter obliquity =
Mars axial = **H/2 = ~167,659 yr**. This selects obliquity = 2/H and ecliptic = 3/H.

**Saturn** (8 = 5 + 3): Earth and Saturn are mirror pairs (d=3). Earth's Fibonacci
triple is {inclination=3, ecliptic=5, obliquity=8}. If the mirror swaps inclination
and obliquity, Saturn's triple would be {inclination=8, ecliptic=5, obliquity=3},
giving Saturn obliquity = **H/3 = ~111,772 yr**. The alternative is H/5 = ~67,063 yr.
Both are testable predictions.

**Uranus** (3 = 2 + 1): Mercury and Uranus are mirror pairs (d=21). No clear
reciprocity resolves the ambiguity. The two options are **H/2 = ~167,659 yr** and
**H = 335,317 yr** (one full Holistic cycle). Uranus's obliquity is currently
frozen at ~98° (set by an ancient impact/satellite migration), so any underlying
Fibonacci obliquity cycle may be suppressed.

**Venus and Neptune** (rate numerator = 1): The number 1 cannot be decomposed
into a sum of two positive integers. The Fibonacci framework predicts no obliquity
decomposition is possible, which is consistent with Venus (tidally damped at 177°)
and Neptune (frozen at ~28°).

### Eccentricity cycle as meeting frequency of obliquity components

The eccentricity cycle is the meeting frequency of axial precession and perihelion
ICRF precession. For planets with confirmed obliquity cycles, the ratio of
eccentricity cycle rate to obliquity rate shows a pattern:

| Planet | Ecc cycle rate | Obliq rate | Ratio |
|--------|---------------|------------|-------|
| Earth | 16/H | 8/H | **2** |
| Mars | 20/(3H) | 8/(3H) | **5/2** |
| Jupiter | 16/(3H) | 2/H = 6/(3H) | **8/3** |

The ratios 2, 5/2, 8/3 have Fibonacci numerators (2, 5, 8) and sequential
denominators (1, 2, 3), connecting the eccentricity and obliquity cycles through
the Fibonacci sequence.

### Physical interpretation

The obliquity oscillation arises from the interaction between a planet's spin axis
precession and its orbital plane precession. The orbital plane precesses at the
inclination rate (= perihelion ecliptic rate in this model). The Fibonacci
decomposition reveals that this single observed rate contains two hidden components:

1. **Ecliptic precession** — an intermediate precession linking the orbital plane
   to the spin dynamics
2. **Obliquity cycle** — the beat between ecliptic and inclination precession

For Earth, these components are directly observable as separate layers in the
6-layer precession hierarchy. For other planets, the decomposition predicts them
from a single observable (the perihelion ecliptic rate).

The cross-planet connections (Mars obliquity = Jupiter axial, etc.) suggest that
the precession structure is not independent per planet but coupled across the
solar system through the Fibonacci mirror-pair framework.

### Summary of testable predictions

| # | Prediction | Value | Current status | How to test |
|---|-----------|-------|----------------|-------------|
| 1 | Jupiter obliquity cycle | H/2 = ~167,659 yr | "No regular cycle" (Saillenfest+ 2020) | Long-term numerical integration of spin-axis evolution |
| 2 | Saturn obliquity cycle | H/3 = ~111,772 yr or H/5 = ~67,063 yr | "No regular cycle" (Saillenfest+ 2021) | Long-term numerical integration |
| 3 | Uranus obliquity cycle | H/2 = ~167,659 yr or H = 335,317 yr | "Frozen at 98°" (Saillenfest+ 2022) | Extremely long timescale simulation |
| 4 | Mars ecliptic precession | 3H/5 = ~201,190 yr | Not measured | Secular perturbation analysis |
| 5 | Jupiter ecliptic precession | H/3 = ~111,772 yr | Not measured | Secular perturbation analysis |
| 6 | Mercury ecliptic precession | H = 335,317 yr | Not measured | Secular perturbation analysis |
| 7 | Mars-Jupiter reciprocity | Mars obliq = Ju axial, Ju obliq = Mars axial | Mars confirmed, Jupiter untested | Jupiter spin-axis modeling |

Note: Current literature describes Jupiter and Saturn as having no regular obliquity
cycle because their obliquities are trending upward over Gyr timescales due to
satellite-driven resonance capture. The Fibonacci predictions represent an underlying
periodic structure that may be modulated or obscured by these secular trends.
Identifying the predicted periods in numerical integrations — even as transient
oscillations superimposed on the trend — would constitute a confirmation.

---

## Open Questions

1. **Mars axial at H/2**: rate 6/(3H) is not Fibonacci. Could the true value be
   closer to 3H/5 = 201,190 yr (rate 5/(3H))? The InSight measurement is quite
   precise at 170,400 yr, ruling out 201 kyr. Perhaps axial precession follows a
   different rule.

2. **Mars ecliptic precession**: predicted at 3H/5 = 201,190 yr from the
   identity 13 = 8 + 5. Not yet verified against any observation. See the
   obliquity cycle theory section above for the full set of ecliptic precession
   predictions.

3. **Saturn obliquity ambiguity**: the Fibonacci decomposition 8 = 5 + 3 gives
   two options (H/5 or H/3). The Earth-Saturn mirror-pair argument favors H/3
   but is not conclusive. Long-term numerical integration of Saturn's spin-axis
   evolution could resolve this.

4. **Perihelion Fibonacci pattern**: The WebGeoCalc perihelion rates reveal a
   striking Fibonacci structure: Jupiter=H/5, Saturn=H/8 (retrograde), Earth=Uranus=H/3,
   Venus=Neptune=H×2. This extends the Fibonacci framework beyond Earth.

5. **Frame dependence**: Axial precession is measured in ICRF. Inclination
   precession is measured against the ecliptic (or invariable plane). The
   conversion uses Earth's general precession (H/13) as reference:
   - Ecliptic → ICRF: `T_ICRF = (T_ecl × T_ref) / (T_ref − T_ecl)`
   - ICRF → Ecliptic: `T_ecl = (T_ICRF × T_ref) / (T_ICRF + T_ref)`

6. **Invariable plane reference**: JPL ascending node rates (dΩ/dt) are measured
   against the ecliptic, which itself precesses. These cannot be used to derive
   precession rates against the invariable plane. Souami & Souchay (2012)
   provide J2000 snapshot positions relative to the invariable plane, but not
   rates. The eigenfrequency analysis (g_i ≈ |s_i| for most planets) supports
   the model's single-rate assumption.

7. **Jupiter obliquity verification**: The Mars-Jupiter reciprocity predicts
   Jupiter obliquity = H/2 = 167,659 yr. Current literature (Saillenfest+ 2020)
   describes Jupiter's obliquity as trending upward rather than oscillating
   regularly. Identifying a ~167 kyr oscillation superimposed on the secular
   trend would confirm the prediction.

---

## Bibliography

### Axial Precession
- Cottereau, L. & Souchay, J. (2009). "Rotation of rigid Venus: a complete precession-nutation model." *A&A* 507, 1635–1648.
- Konopliv, A. S. et al. (2020). "Detection of the Chandler Wobble of Mars From Orbiting Spacecraft." *Geophysical Research Letters* 47.
- Konopliv, A. S. et al. (2021). "Mars precession rate from InSight lander." *Planetary and Space Science* 199, 105208.
- Le Maistre, S. et al. (2023). "Spin state and deep interior structure of Mars from InSight radio tracking." *Nature* 619, 733–737.
- Peale, S. J. (2006). "The free precession and libration of Mercury." *Icarus* 178, 4–18.
- Margot, J.-L. et al. (2012). "Mercury's moment of inertia from spin and gravity data." *J. Geophys. Res.* 117, E00L09.
- Saillenfest, M. et al. (2020). "The future large obliquity of Jupiter." *A&A* 640, A11.
- Saillenfest, M. et al. (2021). "The large obliquity of Saturn explained by the fast migration of Titan." *Nature Astronomy* 5, 345–349.
- Saillenfest, M. et al. (2022). "Tilting Uranus via the migration of an ancient satellite." *A&A* 668, A108.
- Ward, W. R. & Hamilton, D. P. (2004). "Tilting Saturn. I." *Astronomical Journal* 128, 2501.

### Obliquity Cycles
- Bills, B. G. (2005). "Forced obliquity variations of Mercury." *J. Geophys. Res.* 110, E04006.
- Correia, A. C. M. & Laskar, J. (2003). "Long-term evolution of the spin of Venus." *Icarus* 163, 24–45.
- Laskar, J. & Robutel, P. (1993). "The chaotic obliquity of the planets." *Nature* 361, 608–612.
- Laskar, J. et al. (2004). "Long term evolution and chaotic diffusion of the insolation quantities of Mars." *Icarus* 170, 343–364.
- Rogoszinski, Z. & Hamilton, D. P. (2020). "Tilting Ice Giants with a Spin-Orbit Resonance." *Astrophysical Journal* 888, 60.
- Schorghofer, N. (2008). "Temperature response of Mars to Milankovitch cycles." *GRL* 35, L18201.
- Ward, W. R. (1973). "Large-Scale Variations in the Obliquity of Mars." *Science* 181, 260–262.
- Ward, W. R. (1979). "Present obliquity oscillations of Mars." *J. Geophys. Res.* 84, 237.
- Yseboodt, M. & Margot, J.-L. (2006). "Evolution of Mercury's obliquity." *Icarus* 181, 327–337.

### Orbital Elements & Eigenfrequencies
- Brouwer, D. & van Woerkom, A. J. J. (1950). "The secular variations of the orbital elements of the principal planets." *Astronomical Papers American Ephemeris* 13, Part 2.
- Standish, E. M. & Williams, J. G. (1992). "Orbital Ephemerides of the Sun, Moon and Planets." Via JPL `ssd.jpl.nasa.gov/planets/approx_pos.html`.
- WebGeoCalc (JPL/NAIF). Long-term perihelion longitude evolution analysis. `wgc.jpl.nasa.gov`.
- Fitzpatrick, R. (2012). *An Introduction to Celestial Mechanics*. Cambridge University Press. Ch. 10: Secular perturbation theory.

### General Precession
- IAU (2006). Capitaine, N. et al. "Expressions for IAU 2000 precession quantities." *A&A* 412, 567–586.
