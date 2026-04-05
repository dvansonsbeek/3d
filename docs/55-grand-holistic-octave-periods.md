# Grand Holistic Octave — Period Table

## Overview

The **Grand Holistic Octave** (8H = 2,682,536 years) is the fundamental super-period of the solar system. Every major planetary cycle — axial precession, perihelion precession, inclination oscillation, ascending node regression, obliquity oscillation, and eccentricity oscillation — divides 8H evenly as an integer.

This document describes the "Grand Holistic Octave Period Table" modal panel, which visualizes all planetary periods as **8H/N** fractions.

## The Seven Cycle Types

Each planet has up to seven distinct long-period cycles. All are driven by the same underlying Fibonacci/H structure:

### 1. Axial Precession
The rate at which the planet's spin axis precesses (wobbles). For Earth this is the well-known ~25,794-year cycle (H/13). Every planet has its own axial precession rate, though Uranus and Neptune's are extremely long (effectively frozen).

### 2. Perihelion Precession — Ecliptic Frame
The rate at which the perihelion longitude advances in the ecliptic frame. All planets precess prograde except Saturn (retrograde). These periods are H/Fibonacci fractions.

### 3. Perihelion Precession — ICRF Frame (= Inclination Cycle)
The ecliptic rate minus general precession (H/13). This is the rate that drives the inclination oscillation on the invariable plane. Earth is the sole prograde planet in the ICRF. All ICRF periods divide 8H evenly.

### 4. Ascending Node Regression
The rate at which the ascending node on the invariable plane regresses. These rates correspond to the Laplace-Lagrange secular eigenfrequencies (s₁...s₈) — a third level of Fibonacci structure.

### 5. Obliquity Oscillation
The period of the planet's axial tilt oscillation. This is a beat frequency between the axial precession and the ICRF perihelion precession. For Earth: obliquity = beat of inclination (H/3) and ecliptic precession (H/5) = H/8. Venus and Neptune have no obliquity cycle (tidally damped / frozen).

### 6. Eccentricity Cycle (Perihelion Precession Beat)
The wobble period: the beat frequency between the axial precession and the ICRF perihelion precession. This determines how long the eccentricity takes to complete one full oscillation. For Earth this is H/16 (the perihelion precession period). For planets, it varies based on their axial and ICRF rates.

### 7. Solar Year (Orbital Period)
The planet's orbital period around the Sun, from Kepler's third law. While short compared to the other cycles, the solar year count within H determines the semi-major axis and connects to the eccentricity balance.

## Complete Period Table

All periods expressed as 8H/N where 8H = 2,682,536 years:

| Planet | Axial | Peri. ecl. | Peri. ICRF | Asc. node | Obliquity | Ecc. cycle |
|--------|:-----:|:----------:|:----------:|:---------:|:---------:|:----------:|
| Mercury | 8H/11 | 8H/11 | 8H/93 | 8H/12 | 8H/3 | 8H/82 |
| Venus | 8H/91 | 8H/4 | 8H/100 | 8H/15 | — | 8H/191 |
| **Earth** | **8H/104** | **8H/128** | **8H/24** | **8H/40** | **8H/64** | **8H/80** |
| Mars | 8H/16 | 8H/35 | 8H/69 | 8H/37 | 8H/21 | 8H/53 |
| Jupiter | 8H/21 | 8H/40 | 8H/64 | 8H/55 | 8H/16 | 8H/43 |
| Saturn | 8H/6 | 8H/64 | 8H/168 | 8H/55 | 8H/24 | 8H/162 |
| Uranus | ~∞ | 8H/24 | 8H/80 | 8H/6 | 8H/16 | 8H/80 |
| Neptune | ~∞ | 8H/4 | 8H/100 | 8H/1 | — | 8H/100 |

Notes:
- Uranus and Neptune axial precession periods are extremely long (~200M and ~23M years) — effectively frozen
- Venus and Neptune obliquity is tidally damped / frozen — no oscillation
- Mercury's axial precession period = ecliptic perihelion period (spin-orbit resonance)
- ICRF perihelion = inclination cycle (same physical driver)

## Periods in Years

| Planet | Axial prec. | Peri. ecl. | Peri. ICRF | Asc. node | Obliquity | Ecc. cycle |
|--------|--:|--:|--:|--:|--:|--:|
| Mercury | −243,867 | 243,867 | −28,844 | −223,545 | 894,179 | 32,714 |
| Venus | +29,587 | 670,634 | −26,825 | −178,836 | — | 14,069 |
| **Earth** | **+25,794** | **20,957** | **+111,772** | **−67,063** | **41,915** | **33,532** |
| Mars | −167,659 | 76,644 | −38,877 | −72,501 | 125,744 | 50,614 |
| Jupiter | −125,744 | 67,063 | −41,915 | −48,773 | 167,659 | 62,872 |
| Saturn | −447,089 | −41,915 | −15,967 | −48,773 | 111,772 | 16,559 |
| Uranus | +204,543,370 | 111,772 | −33,532 | −447,089 | 167,659 | 33,526 |
| Neptune | −22,801,556 | 670,634 | −26,825 | −2,682,536 | — | 26,857 |

(+ = prograde, − = retrograde)

## Notable Patterns

### Mirror Symmetry in Periods
- **Venus = Neptune**: ecliptic 8H/4, ICRF 8H/100
- **Earth ICRF = Uranus ecliptic**: both 8H/24
- **Jupiter = Saturn**: ascending node 8H/55
- **Jupiter obliquity = Uranus obliquity**: both 8H/16
- **Mercury axial = Mercury ecliptic**: both 8H/11 (spin-orbit resonance)

### Fibonacci Connections in 8H/N Divisors
Direct Fibonacci numbers: 1, 3, 4, 6, 16, 21, 24, 40, 55, 64, 80, 100, 104, 128

Many are products of small Fibonacci numbers:
- 24 = 3 × 8, 40 = 5 × 8, 64 = 8 × 8, 80 = 5 × 16
- 104 = 8 × 13, 128 = 8 × 16, 168 = 8 × 21

### The Three Fibonacci Levels
1. **Level 1** — Fibonacci d-values (Law 2): d = 3, 5, 21, 34
2. **Level 2** — Ecliptic periods are H/Fibonacci: H/3, H/5, H/8, H/13, H/16
3. **Level 3** — Eigenfrequencies are 8H/N: ascending node cycles match Laskar's s₁–s₈

### Relationships Between Cycles

Each planet's cycles are connected through beat frequencies:

```
Axial precession ←─── beat ───→ ICRF perihelion = Eccentricity cycle
                                       │
                                  (= Inclination cycle)
                                       │
ICRF perihelion ←── beat ──→ Ecliptic perihelion = Obliquity cycle

Ecliptic perihelion ←── minus H/13 ──→ ICRF perihelion

Ascending node ←── matches eigenfrequency s₁...s₈ ──→ Secular theory
```

### Earth's Unique Cycle Chain
```
Axial precession (H/13 = 8H/104)
    ↕ counter-rotate
Inclination precession (H/3 = 8H/24)
    ↓ combine
Perihelion precession (H/16 = 8H/128)
    ↓ beat with ecliptic (H/5 = 8H/40)
Obliquity oscillation (H/8 = 8H/64)
    ↕ same period
Eccentricity oscillation (H/8 = 8H/64)
```

### The Grand Holistic Octave as Synchronization Point
Every 8H years, ALL planetary cycles return to their starting configuration:
- All ecliptic perihelions complete integer revolutions
- All ICRF perihelions complete integer revolutions  
- All ascending nodes complete integer regressions
- All axial precessions complete integer cycles
- All inclination, obliquity, and eccentricity oscillations complete integer cycles

This is what makes 8H the fundamental super-period of the solar system.

## UI Panel Design

### Approach: Two-Tab Modal

The data has two natural views:

**Tab 1: "8H/N Table"** — The compact overview
- Rows: 8 planets
- Columns: 7 cycle types
- Cell content: **8H/N** as the primary display
- Hover: shows period in years and H-fraction
- Color coding by cycle type
- Mirror pairs highlighted

**Tab 2: "Cycle Connections"** — How cycles relate  
- Per-planet expandable cards
- Shows the beat-frequency chain for each planet
- Fibonacci decomposition of each N value
- Connection lines between related cycles

### Header
- Title: "Grand Holistic Octave"
- Subtitle: "8H = 2,682,536 years"
- "All planetary periods divide 8H evenly"

### Color Scheme
| Cycle Type | Color | Reason |
|-----------|-------|--------|
| Axial precession | Blue | Spin axis |
| Perihelion ecliptic | Orange | Orbit shape |
| ICRF / Inclination | Green | Invariable plane tilt |
| Ascending node | Purple | Plane intersection |
| Obliquity | Cyan | Axial tilt oscillation |
| Eccentricity | Yellow | Orbit shape oscillation |

### Footer
- Total unique 8H/N divisors count
- Link to Fibonacci Laws documentation
- "Verified: node tools/explore/grand-holistic-octave-periods.js"

## Related Documentation

- [Fibonacci Laws](10-fibonacci-laws.md) — The six laws and their derivation
- [Vector Balance Analysis](54-vector-balance-analysis.md) — Config #1 verification and eigenfrequency connection
- [Balance Explorer Reference](53-balance-explorer-reference.md) — Interactive balance testing
- [Ascending Node Calculations](31-ascending-node-calculations.md) — Dynamic ascending node model
- [Inclination Calculations](32-inclination-calculations.md) — ICRF perihelion inclination model
- [Planets Precession Cycles](37-planets-precession-cycles.md) — Per-planet precession analysis

## Verification

Run `node tools/explore/grand-holistic-octave-periods.js` to verify all periods divide 8H evenly.

## Code Location

| Component | Location |
|-----------|----------|
| Period table modal | `src/script.js` (TBD) |
| Period computation | `tools/explore/grand-holistic-octave-periods.js` |
| Axial precession values | `axialPrecessionYears` in planet objects, `src/script.js` |
| Obliquity cycles | `mercuryObliquityCycle` etc. in `src/script.js` |
| Eccentricity cycles | `calcWobblePeriod()` in `src/script.js` |
| Ascending node cycles | `ascendingNodeCyclesIn8H` in planet objects |
