# Grand Holistic Octave — Period Table

## Overview

The **Grand Holistic Octave** (8H = 2,682,536 years) is the fundamental super-period of the solar system. Every major planetary cycle — axial precession, perihelion precession, inclination oscillation, ascending node regression, obliquity oscillation, and eccentricity oscillation — divides 8H evenly as an integer.

### System Reset

The **System Reset** is the epoch within each Grand Holistic Octave when all seven fitted planets simultaneously reach their inclination extremes: the seven in-phase planets at minimum inclination, Saturn (anti-phase) at maximum. This occurs once per 8H. The current System Reset is at approximately **-2,649,854** (balanced year anchor n=7, the oldest of the eight anchors in the current octave).

At the System Reset, every planet's ICRF perihelion phase = 180° (in-phase) or 0° (Saturn anti-phase), meaning the inclination oscillations are perfectly synchronized. At intermediate balanced years (n=0 through n=6), only a subset of planets are at their extremes — the others have drifted because their ICRF periods don't divide H evenly.

| Epoch | Year | What's at extreme |
|-------|------|-------------------|
| System Reset (n=7) | ≈ -2,649,854 | All 7 fitted planets |
| Balanced Year (n=0) | ≈ -302,635 | Jupiter, Saturn, Uranus (+ Earth by definition) |
| n=1 through n=6 | intermediate | Planet-dependent subsets |

This document describes the "Grand Holistic Octave Period Table" modal panel, which visualizes all planetary periods as **8H/N** fractions.

## The Six Cycle Types

Each planet has up to six distinct long-period cycles shown in the modal:

### 1. Axial Precession
The rate at which the planet's spin axis precesses (wobbles). For Earth this is the well-known ~25,794-year cycle (H/13). Every planet has its own axial precession rate, though Uranus and Neptune's are extremely long (effectively frozen).

### 2. Perihelion Precession — Ecliptic Frame
The rate at which the perihelion longitude advances in the ecliptic frame. All planets precess prograde except Saturn (retrograde). These periods are H/Fibonacci fractions.

### 3. Perihelion Precession — ICRF Frame (= Inclination Cycle)
The ecliptic rate minus general precession (H/13). This is the rate that drives the inclination oscillation on the invariable plane. Earth is the sole prograde planet in the ICRF. All ICRF periods divide 8H evenly.

### 4. Ascending Node Regression
The rate at which the ascending node on the invariable plane regresses. These rates correspond to the Laplace-Lagrange secular eigenfrequencies (s₁...s₈) — a third level of Fibonacci structure.

### 5. Obliquity Oscillation
The period of the planet's axial tilt oscillation. This is a beat frequency derived from the Fibonacci decomposition of the ecliptic perihelion rate. For Earth: obliquity = beat of inclination (H/3) and ecliptic precession (H/5) = H/8. Venus and Neptune have obliquity cycle = ICRF period (8H/100) — the two-component formula cancels exactly, producing constant obliquity.

### 6. Eccentricity Cycle (Wobble Period)
The wobble period: the beat frequency between the axial precession and the ICRF perihelion precession. This determines how long the eccentricity takes to complete one full oscillation. For Earth this is H/16 = 20,957 yr (the perihelion precession period). Computed via `calcWobblePeriod()`.

## Complete Period Table

All periods expressed as 8H/N where 8H = 2,682,536 years:

| Planet | Axial | Peri. ecl. | ICRF / Incl. | Asc. node | Obliquity | Ecc. cycle |
|--------|:-----:|:----------:|:----------:|:---------:|:---------:|:----------:|
| Mercury | **8H/9** | 8H/11 | 8H/93 | **8H/9** | 8H/3 | 8H/84 |
| Venus | 8H/91 | 8H/6 | 8H/110 | **8H/1** | 8H/110 | 8H/191 |
| **Earth** | **8H/104** | **8H/128** | **8H/24** | **8H/40** | **8H/64** | **8H/128** |
| Mars | 8H/16 | 8H/35 | 8H/69 | **8H/63** | 8H/21 | 8H/53 |
| Jupiter | 8H/21 | 8H/40 | 8H/64 | **8H/36** | 8H/16 | 8H/43 |
| Saturn | 8H/6 | 8H/64 | 8H/168 | **8H/36** | 8H/24 | 8H/162 |
| Uranus | ~∞ | 8H/24 | 8H/80 | **8H/12** | 8H/16 | 8H/80 |
| Neptune | ~∞ | 8H/4 | 8H/100 | **8H/3** | 8H/100 | 8H/100 |

Notes:
- Uranus and Neptune axial precession periods are extremely long (~200M and ~23M years) — effectively frozen
- Venus and Neptune obliquity cycle = |ICRF period| (Venus: 8H/110, Neptune: 8H/100): the two-component formula cancels exactly, producing constant obliquity
- Mercury's axial precession period = ascending node period (Cassini state, confirmed by MESSENGER)
- ICRF perihelion = inclination cycle (same physical driver)
- Earth's eccentricity cycle = perihelion precession period (H/16)

## Periods in Years

| Planet | Axial prec. | Peri. ecl. | ICRF / Incl. | Asc. node | Obliquity | Ecc. cycle |
|--------|--:|--:|--:|--:|--:|--:|
| Mercury | **−298,060** | 243,867 | −28,844 | **−298,060** | 894,179 | 31,935 |
| Venus | +29,478 | −447,089 | −24,387 | **−2,682,536** | 24,387 | 14,045 |
| **Earth** | **−25,794** | **20,957** | **+111,772** | **−67,063** | **41,915** | **20,957** |
| Mars | −167,659 | 76,644 | −38,877 | **−42,580** | 127,740 | 50,614 |
| Jupiter | −127,740 | 67,063 | −41,915 | **−74,515** | 167,659 | 62,385 |
| Saturn | −447,089 | −41,915 | −15,967 | **−74,515** | 111,772 | 16,559 |
| Uranus | ~∞ | 111,772 | −33,532 | **−223,545** | 167,659 | 33,526 |
| Neptune | ~∞ | 670,634 | −26,825 | **−894,179** | 26,825 | 26,857 |

(+ = prograde, − = retrograde, ~∞ = frozen)

## Notable Patterns

### Mirror Symmetry in Periods
- **Venus = Neptune**: ecliptic 8H/4, ICRF 8H/100, obliquity 8H/100, ecliptic precession −96
- **Mercury ↔ Uranus**: ecliptic precession 8H/8 = H (identical)
- **Mars ↔ Jupiter**: axial↔obliquity swap (16↔21), identical sum (37)
- **Earth ICRF = Uranus ecliptic**: both 8H/24
- **Jupiter = Saturn**: ascending node 8H/36 (gas-giant lockstep)
- **Jupiter obliquity = Uranus obliquity**: both 8H/16
- **Mercury axial = Mercury ascending node**: both 8H/9 (Cassini state)

### Fibonacci Connections in 8H/N Divisors
Many divisors are products of small Fibonacci numbers:
- 24 = 3 × 8, 40 = 5 × 8, 64 = 8 × 8, 80 = 5 × 16
- 104 = 8 × 13, 128 = 8 × 16, 168 = 8 × 21
- The new asc-node integers cluster on small factors as well: Mercury 9 = 3², Mars 63 = 7 × 9, Jupiter/Saturn 36 = 4 × 9, Uranus 12 = 4 × 3, Neptune 3 = F₄, Venus 1 (= 8H, a full Grand Octave)

### The Three Fibonacci Levels
1. **Level 1** — Fibonacci d-values (Law 2): d = 3, 5, 21, 34
2. **Level 2** — Ecliptic periods are H/Fibonacci: H/3, H/5, H/8, H/13, H/16
3. **Level 3** — Asc-node periods are 8H/N for the integer set above. The integers were chosen by a 2026-04-09 audit to fit JPL ecliptic-inclination trends in the J2000-fixed frame to <2″/century each. They no longer match the Laplace-Lagrange eigenfrequencies s₁–s₈ exactly — they are an *alternative* integer assignment that produces a tighter JPL trend fit while preserving Jupiter+Saturn lockstep.

### Relationships Between Cycles

Each planet's cycles are connected through beat frequencies:

```
Axial precession ←─── beat ───→ ICRF perihelion = Eccentricity cycle (wobble)
                                       │
                                  (= Inclination cycle)
                                       │
ICRF perihelion ←── beat ──→ Ecliptic perihelion = Obliquity cycle

Ecliptic perihelion ←── minus H/13 ──→ ICRF perihelion

Ascending node ←── matches eigenfrequency s₁...s₈ ──→ Secular theory
```

### Integer Arithmetic Identities

Working in the 8H/N integer domain, every planetary cycle reduces to simple addition and subtraction of N values. Three universal identities connect the six cycle types:

**Identity 1: Frame conversion**
```
N_ICRF = 104 − N_ecl    (for prograde ecliptic planets)
```

| Planet | N_ecl + N_ICRF | = 104? |
|--------|---------------|--------|
| Mercury | 11 + 93 | ✓ |
| Venus | 4 + 100 | ✓ |
| Mars | 35 + 69 | ✓ |
| Jupiter | 40 + 64 | ✓ |
| Uranus | 24 + 80 | ✓ |
| Neptune | 4 + 100 | ✓ |

The number 104 = 8 × 13 is Earth's axial precession N. Earth itself breaks the sum rule (N_ecl=128 > 104, giving prograde ICRF), and Saturn's retrograde ecliptic gives ICRF = 104 + 64 = 168.

**Identity 2: Eccentricity cycle as integer beat**
```
N_ecc = |N_axial ± N_ICRF|
```
Opposite directions (one prograde, one retrograde) → add. Same direction → subtract.

| Planet | Formula | N_ecc |
|--------|---------|-------|
| Mercury | \|9 − 93\| | 84 |
| Venus | 91 + 100 | 191 |
| Earth | 104 + 24 | 128 |
| Mars | \|16 − 69\| | 53 |
| Jupiter | \|21 − 64\| | 43 |
| Saturn | \|6 − 168\| | 162 |
| Uranus | Axial ≈ 0 → Ecc = ICRF | 80 |
| Neptune | Axial ≈ 0 → Ecc = ICRF | 100 |

Uranus and Neptune: Ecc = ICRF is the structural definition of "frozen axial" — when N_axial = 0, the beat reduces to the ICRF rate alone.

**Identity 3: Obliquity decomposition**
```
N_ecl = N_obliq + N_eclPrec
```

| Planet | N_ecl | = N_obliq + N_eclPrec | EclPrec period |
|--------|-------|----------------------|----------------|
| Mercury | 11 | 3 + 8 | H (335,317 yr) |
| Venus | 4 | 100 + (−96) | 8H/96 (27,943 yr) |
| Earth | 128 | 64 + 64 | H/8 (41,915 yr) |
| Mars | 35 | 21 + 14 | 8H/14 (191,610 yr) |
| Jupiter | 40 | 16 + 24 | H/3 (111,772 yr) |
| Saturn | 64 | 24 + 40 | H/5 (67,063 yr) |
| Uranus | 24 | 16 + 8 | H (335,317 yr) |
| Neptune | 4 | 100 + (−96) | 8H/96 (27,943 yr) |

**Mirror pairs share identical ecliptic precession N:**
- Mercury ↔ Uranus: N_eclPrec = 8 (period = H)
- Venus ↔ Neptune: N_eclPrec = −96 (period = 8H/96)

Earth ↔ Saturn and Mars ↔ Jupiter have different ecliptic precessions, but cross-pair links appear: Jupiter's ecliptic precession (24) = Saturn's obliquity (24), and Saturn's ecliptic precession (40) = Jupiter's ecliptic perihelion (40).

### Mars–Jupiter Axial–Obliquity Swap

The d=5 mirror pair exhibits exact reciprocity in the integer domain:

| | Mars | Jupiter |
|---|---|---|
| Axial N | 16 | **21** |
| Obliquity N | **21** | 16 |
| \|Axial − Obliq\| | **5 = d** | **5 = d** |
| Axial + Obliq | **37** | **37** |

Mars's obliquity = Jupiter's axial, and vice versa. The difference |Axial − Obliq| equals the Fibonacci divisor d = 5 for both. The sum Axial + Obliq = 37 is identical for both.

Cross-pair |Axial − Obliq| values link to other planets' N values:
- Venus: |91 − 100| = 9 = Mercury's Cassini N
- Mercury: |9 − 3| = 6 = Saturn's axial N
- Earth: |104 − 64| = 40 = Earth's ascending node N

### Earth's Unique Cycle Chain
```
Axial precession (H/13 = 8H/104)
    ↕ counter-rotate
Inclination precession (H/3 = 8H/24)
    ↓ combine
Perihelion precession (H/16 = 8H/128)
    ↓ beat with ecliptic (H/5 = 8H/40)
Obliquity oscillation (H/8 = 8H/64)
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

### Implementation
A single modal panel with a **Years / 8H/N toggle** button:
- **Years mode** (default): shows periods in years with thousand separators
- **8H/N mode**: shows the integer divisor N

### Color Coding
- **Green**: prograde precession (positive period)
- **Red**: retrograde precession (negative period)
- **White/neutral**: oscillation periods (obliquity, eccentricity — no direction)
- **∞**: frozen (axial precession > 10 Myr)
- **—**: N/A (Venus/Neptune obliquity)

### Layout
- Header with title, subtitle ("8H = 2,682,536 years"), and toggle button
- 8 rows × 6 columns grid with planet color dots
- Earth row highlighted
- Footer with planet/cycle count and H value

## Related Documentation

- [Fibonacci Laws](10-fibonacci-laws.md) — The six laws and their derivation
- [Vector Balance Analysis](54-vector-balance-analysis.md) — the default configuration verification and eigenfrequency connection
- [Balance Explorer Reference](53-balance-explorer-reference.md) — Interactive balance testing
- [Ascending Node Calculations](31-ascending-node-calculations.md) — Dynamic ascending node model
- [Inclination Calculations](32-inclination-calculations.md) — ICRF perihelion inclination model
- [Planets Precession Cycles](37-planets-precession-cycles.md) — Per-planet precession analysis, observed rates (WebGeoCalc, Laskar 2004, InSight), obliquity cycle theory, and two-component obliquity formula

## Verification

Run `node tools/explore/grand-holistic-octave-periods.js` to verify all periods divide 8H evenly.

## Code Location

| Component | Location |
|-----------|----------|
| Period table modal | `createGHOPanel()` / `openGHOPanel()` in `src/script.js` |
| Period computation | `ghoComputeData()` in `src/script.js` |
| Wobble period formula | `calcWobblePeriod()` in `src/script.js` |
| Axial precession values | `axialPrecessionYears` in planet objects, `src/script.js` |
| Obliquity cycles | `mercuryObliquityCycle` etc. in `src/script.js` |
| Ascending node cycles | `ascendingNodeCyclesIn8H` in planet objects |
| Button | Tools folder in Tweakpane: "Grand Holistic Octave" |
| CSS | `.gho-*` classes in `src/style.css` |
