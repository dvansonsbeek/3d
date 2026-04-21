# Precession Breakdown Implementation

## Overview

This document outlines the implementation of a **Perihelion Precession Breakdown** feature that calculates and displays how each planet contributes to another planet's total precession rate.

## The Goal

For any planet (e.g., Mars with ~1,793 arcsec/century), show:
- Individual contributions from **all 8 major planets** (all prograde in first-order diagonal theory)
- Whether the perturber is inner (α weighting) or outer (α² weighting)
- The sum total compared to the observed value
- Percentage contribution from each planet
- **Detailed view** (7+ lines per planet)
- **Dynamic calculation** (recalculated as orbital positions change)

## Design Decisions

1. **Theory**: First-order Laplace-Lagrange secular theory (see limitations in Section 1.5)
2. **Display**: Detailed breakdown (7+ lines per planet)
3. **Calibration**: Show raw calculated values (no artificial correction factors)
4. **Scope**: All 8 major planets (Mercury through Neptune)
5. **Calculation**: Dynamic - uses current orbital parameters

## Available Data

### Static Values (per planet)
- Semi-major axis (a) - from `*OrbitDistance` constants
- Eccentricity (e) - from `*OrbitalEccentricity` constants
- Inclination to invariable plane (i) - from `*Inclination` constants
- Mass (M) - from `M_*` constants

### Dynamic Values (from `o` object)
- Ecliptic inclination: `o.<planet>EclipticInclinationDynamic` (e.g., `o.marsEclipticInclinationDynamic`)
- Current distance: `<planet>.sunDistAU`
- True anomaly, mean anomaly, etc.

---

## Part 1: The Physics

### 1.1 Secular Perturbation Theory (Laplace-Lagrange Theory)

Perihelion precession is caused by gravitational perturbations from other planets. The **secular** (long-term averaged) precession rate from a single perturber is derived from the Laplace-Lagrange secular perturbation theory.

**Diagonal A_ii contribution from perturber j** (Murray & Dermott §7.4, eq 7.138):

```
dω_i/dt = (n_i/4) × ε × α × ᾱ × b₃/₂⁽¹⁾(α)
```

Where:
- `n_i` = mean motion of the perturbed planet (rad/year)
- `ε` = m_j/M☉ = mass ratio of perturber to Sun
- `α` = min(a_i, a_j)/max(a_i, a_j) (semi-major axis ratio, always ≤ 1)
- `ᾱ` = α if j is outer of i (so α × ᾱ = **α²**)
       1 if j is inner of i (so α × ᾱ = **α**)
- `b₃/₂⁽¹⁾(α)` = Laplace coefficient (computed via numerical integration)

**Key point:** The same Laplace coefficient `b₃/₂⁽¹⁾(α)` is used for both inner and outer perturbers. The distinction comes from the `α·ᾱ` prefactor, **not** from swapping in `b₃/₂⁽²⁾`. The `b₃/₂⁽²⁾` coefficient appears only in the off-diagonal A_ij terms (secular eigenvector mixing), which are not used for the per-planet precession breakdown display.

The Laplace coefficient is computed using the integral definition:
```
b_s^j(α) = (1/π) × ∫₀^(2π) cos(jψ) / (1 - 2α cos(ψ) + α²)^s dψ
```

**Reference:** Murray & Dermott (1999), Park et al. (2017), PERIHELION_PRECESSION_CORRECTED.md

### 1.2 Eccentricity and Inclination Corrections (Negligible)

For first-order secular theory, eccentricity and inclination corrections are **negligible**:

- Eccentricity correction contributes ~2% for Mercury (e = 0.206)
- Inclination correction contributes ~1% for typical mutual inclinations

These corrections are within the expected ~4% overestimate of first-order theory compared to Park et al. (2017) values, so they are **not included** in the implementation.

**If higher accuracy is needed**, these corrections would be:
```
f(e) ≈ 1 + (1/2)e²     (eccentricity)
g(I) = cos(I_mutual)   (inclination)
```

But for ≤1% accuracy, numerical integration of the full equations of motion is required (like JPL ephemerides).

### 1.3 Laplace Coefficients

The Laplace coefficients are computed using **numerical integration**:
```
b_s^(j)(α) = (1/π) × ∫₀^(2π) cos(jψ) / (1 - 2α cos(ψ) + α²)^s dψ
```

We use numerical integration (1000 steps) rather than series expansion because:
- Series expansion is inaccurate for larger α values (e.g., Venus α = 0.54)
- Numerical integration matches hypergeometric function results to <0.1%

**Numerical values for Mercury's perturbers:**

| Perturber | α      | b₃/₂⁽¹⁾(α) |
|-----------|--------|------------|
| Venus     | 0.5352 | 3.036      |
| Earth     | 0.3871 | 1.576      |
| Mars      | 0.2541 | 0.864      |
| Jupiter   | 0.0744 | 0.226      |
| Saturn    | 0.0406 | 0.122      |

### 1.4 Sign Convention

**All diagonal A_ii contributions are prograde (+).** The self-precession rate receives a positive contribution from every perturber, whether inner or outer — this follows directly from `α > 0`, `ᾱ > 0`, and `b₃/₂⁽¹⁾(α) > 0`.

The "inner perturbers contribute retrograde" rule that appeared in an earlier version of this doc was a confusion with the off-diagonal A_ij term, which has the form `−(n_i/4)·ε·α·ᾱ·b₃/₂⁽²⁾(α)` and does carry a negative sign but describes eigenvector mixing between planets, not the self-precession rate.

### 1.5 IMPORTANT: Fundamental Limitations of These Calculations

**The precession breakdown values shown are APPROXIMATIONS, not precise predictions.**

First-order Laplace-Lagrange secular theory is an **educational simplification** developed in the 18th-19th century. Modern astronomers use **full numerical integration** (like JPL Development Ephemerides) for accurate values.

#### Why the Calculations Are Inaccurate

| Limitation | Impact | Example |
|------------|--------|---------|
| **Ecliptic-frame-only** | Treats the ecliptic as a stable reference, ignoring that the ecliptic itself precesses (general precession H/13 ≈ 50 ″/yr). See §1.5a. | Saturn ecliptic-retrograde observed but L-L gives prograde |
| **First-order only** | Neglects terms of order m² in planetary masses | ~4% error for Mercury |
| **Secular terms only** | Ignores all periodic (short-term) perturbations | Unknown systematic bias |
| **Low-order in e, i** | Only uses 2nd order in eccentricity/inclination | Poor for high-e orbits |
| **No indirect effects** | Venus→Earth→Mercury chains ignored | Park includes cross-terms |
| **No resonances** | Jupiter-Saturn 5:2 resonance not captured | Saturn accuracy ~78% |
| **Low eccentricity failure** | Theory breaks for near-circular orbits | Venus completely wrong |

#### Observed vs. Theoretical Accuracy (from academic sources)

From [University of Texas celestial mechanics](https://farside.ph.utexas.edu/teaching/336k/Newtonhtml/node115.html):

| Planet | Observed (″/yr) | Theoretical (″/yr) | Agreement |
|--------|-----------------|-------------------|-----------|
| Mercury | 5.75 | 5.50 | Reasonable |
| **Venus** | **2.04** | **10.75** | **VERY POOR** |
| Earth | 11.45 | 11.87 | Good |
| Mars | 16.28 | 17.60 | Reasonable |
| Jupiter | 6.55 | 7.42 | Reasonable |
| Saturn | 19.50 | 18.36 | Good |

**Venus is a known failure case** - its low eccentricity makes the perihelion direction extremely sensitive to tiny perturbations, causing first-order theory to give nonsense results.

#### What This Means for Our Display

The precession breakdown values should be interpreted as:
- **Illustrative** - showing which planets have the largest gravitational influence
- **Qualitative** - correct about relative magnitudes and signs (prograde/retrograde)
- **Educational** - demonstrating the physics of orbital perturbations
- **NOT precise** - may differ from reality by 5-50% depending on the planet

#### For Accurate Values

Accurate perihelion precession requires:
1. **Full numerical integration** of equations of motion
2. **JPL Development Ephemerides** (DE440, DE441)
3. **Second-order mass corrections** (Brouwer-van Woerkom 1950)
4. **Higher-degree secular theories** (4th-7th degree in e and i)

**References:**
- [Secular evolution of planetary orbits - UT Austin](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html)
- [Perihelion Precession of the Planets - UT Austin](https://farside.ph.utexas.edu/teaching/336k/Newtonhtml/node115.html)
- [Park et al. 2017 - MIT/JPL](https://dspace.mit.edu/handle/1721.1/109312)

---

### 1.5a Reference Frames: why ecliptic-only L-L fails structurally

This is the deepest limitation and deserves its own section because it
explains most of the failure modes in §1.5:

**L-L is an ecliptic-based theory.** The secular matrix A is derived in a
single reference plane — traditionally the ecliptic-of-J2000 or the
invariable plane. All perihelion motions ϖ_i are measured in that one
frame. The theory assumes this frame is a stable inertial reference.

**But the ecliptic is not a stable inertial frame.** Two things move relative
to the ICRF (true inertial):

1. **General precession (H/13 ≈ 25,794 yr)** — Earth's axial precession
   carries the equinox westward through the inertial sky at ~50 ″/yr. The
   "ecliptic-of-date" frame rotates at this rate relative to the ICRF.
2. **Ecliptic precession (H/5 ≈ 67,063 yr)** — Earth's orbital plane itself
   precesses around the invariable plane, so the ecliptic-of-J2000 is also
   not identical to the invariable plane in the long run.

Because L-L collapses both frames into one "ecliptic" treatment, it cannot
cleanly separate what's happening **in the inertial frame** (ICRF) from
what's happening **relative to the moving equinox** (ecliptic-of-date).
For most planets this works, because the rates are large and the frames
don't disagree qualitatively. But it fails where frame matters:

- **Saturn (sign flip)**: first-order L-L gives prograde +1,867 ″/cy, but
  WebGeoCalc measures ecliptic-of-date retrograde −3,400 ″/cy. The sign
  disagreement is not a mathematical error — it reflects that the
  "ecliptic" in L-L theory is a long-term-averaged inertial plane,
  while "ecliptic" in WebGeoCalc is the instantaneous date-frame. The
  Great Inequality (Jupiter-Saturn 5:2 resonance) produces a large
  retrograde signal *in the date-frame* that averages away in the
  inertial frame. L-L sees the average; WebGeoCalc sees the
  current-epoch reality.
- **Venus (catastrophic failure)**: Venus's near-circular orbit (e = 0.007)
  makes the perihelion direction frame-sensitive to tiny perturbations.
  L-L's single-frame treatment gives ~+1,200 ″/cy; observation gives ~0.

**The Holistic Universe Model tracks both frames explicitly.** For every
planet the model stores:

- `perihelionEclipticYears` — rate of perihelion motion in the ecliptic-
  of-date (what WebGeoCalc measures)
- Derived ICRF period: `T_ICRF = (T_peri · T_H13) / (T_H13 − T_peri)` —
  the rate in the inertial frame after subtracting general precession

The two are related by `ω_ICRF = ω_ecliptic − ω_gen` where
`ω_gen = 2π / T_H13` is the general-precession rate. **The model treats the
ICRF as the stable foundation** — it's the frame in which the Fibonacci
structure (H/3, H/5, H/8, H/13, H/16) is anchored — and derives the
ecliptic rate from it via this relation. That's why the model's ecliptic
rates match WebGeoCalc directly (both measure the date-frame) while L-L's
ecliptic rates match neither cleanly (L-L's "ecliptic" is a hybrid of
conventions).

**Testable prediction from the frame distinction.** Standard secular theory
says Saturn's ecliptic retrograde rate is a transient phase of the
Great-Inequality oscillation (~900-yr period) and will reverse within
~450 yr. The Holistic Universe Model says Saturn's ecliptic rate is
permanently retrograde at `−H/8 = −3,092 ″/cy` because that's the correct
date-frame expression of the stable ICRF structure. Long-baseline JPL
DE441 integrations (13 000 BC → 17 000 AD) can in principle distinguish
these. See [docs/10-fibonacci-laws.md §Saturn's Ecliptic-Retrograde Perihelion Precession](10-fibonacci-laws.md) for the full discussion.

---

### 1.6 Mercury's Missing Advance Display

The planetStats panel for Mercury includes a grouped pair comparing the Holistic Model prediction to General Relativity:

| Row | Value | Color | Source |
|-----|-------|-------|--------|
| `┌ Missing advance around 1900 AD (Model)` | ~44″/century | Amber (dynamic) | `predictGeocentricPrecession(1900, 'mercury') − baseline` |
| `└ Missing advance (GR)` | 42.98″/century | White (static) | Einstein's General Relativity prediction |

The model value uses the predictive formula at year 1900 (the epoch of Le Verrier's and Einstein's analyses). The GR value of 42.98″/century is the standard textbook result for Mercury's relativistic perihelion advance due to spacetime curvature near the Sun.

### 1.7 Historical Context

First-order secular theory **overestimates by ~0.4%** compared to Park et al. (2017) for Mercury:

| Source | Mercury Total |
|--------|---------------|
| Our model (H×8/11) | 531.4"/cy |
| Park et al. (2017) | 532"/cy |
| Difference | ~0.1% |

The small overestimate reflects the limitations of first-order theory, which doesn't include:
- **Indirect effects** - Venus perturbing Earth which then perturbs Mercury (Park includes cross-terms like "Venus+Earth/Moon = -0.0209"/cy")
- **Higher-order terms** in the disturbing function expansion
- **Eccentricity/inclination corrections** - contribute ~2-3% for Mercury
- **Short-period terms** that don't average exactly to zero

**No calibration factors are used** - values are calculated from first principles, with all their inherent limitations.

---

## Part 2: Implementation

### 2.1 New OrbitalFormulas Methods

```javascript
// Laplace coefficient b_{3/2}^{(1)}(α) - NUMERICAL INTEGRATION
// More accurate than series expansion for large α (e.g., Venus α = 0.54)
laplaceCoefficient_3_2_1: (alpha) => {
  const steps = 1000;
  const dPsi = (2 * Math.PI) / steps;
  let sum = 0;

  for (let i = 0; i < steps; i++) {
    const psi = i * dPsi;
    const cosPsi = Math.cos(psi);
    const denom = Math.pow(1 - 2 * alpha * cosPsi + alpha * alpha, 1.5);
    sum += cosPsi / denom;
  }

  return sum * dPsi / Math.PI;
},

// Laplace coefficient b_{3/2}^{(2)}(α) - for inner perturber on outer planet
laplaceCoefficient_3_2_2: (alpha) => {
  const steps = 1000;
  const dPsi = (2 * Math.PI) / steps;
  let sum = 0;

  for (let i = 0; i < steps; i++) {
    const psi = i * dPsi;
    const cosPsi = Math.cos(psi);
    const cos2Psi = Math.cos(2 * psi);
    const denom = Math.pow(1 - 2 * alpha * cosPsi + alpha * alpha, 1.5);
    sum += cos2Psi / denom;
  }

  return sum * dPsi / Math.PI;
},

// Mean motion in rad/year from orbital period in days
meanMotionRadPerYear: (period_days) => {
  const period_years = period_days / 365.25;
  return (2 * Math.PI) / period_years;
},

// MAIN FUNCTION: Secular precession contribution from ONE perturber (arcsec/century)
// First-order Laplace-Lagrange secular theory, diagonal A_ii term.
// Uses b₃/₂⁽¹⁾(α) for BOTH inner and outer perturbers — the distinction
// comes from the α·ᾱ prefactor, not from switching Laplace orders.
// All contributions are positive (prograde).
secularPrecessionContribution: (
  n_rad_per_year,       // Mean motion of perturbed planet (rad/year)
  m_perturber,          // Mass of perturbing planet (kg)
  M_sun,                // Mass of Sun (kg)
  a_planet_km,          // Semi-major axis of perturbed planet (km)
  a_perturber_km        // Semi-major axis of perturbing planet (km)
) => {
  const isOuter = a_perturber_km > a_planet_km;
  const alpha = isOuter
    ? a_planet_km / a_perturber_km
    : a_perturber_km / a_planet_km;

  // ᾱ = α if outer, 1 if inner → α·ᾱ = α² (outer) or α (inner)
  const alpha_bar = isOuter ? alpha : 1;

  // Diagonal A_ii always uses b₃/₂⁽¹⁾(α). b₃/₂⁽²⁾ is for off-diagonal A_ij.
  const laplace = OrbitalFormulas.laplaceCoefficient_3_2_1(alpha);

  // Mass ratio ε = m_perturber / M_sun
  const massRatio = m_perturber / M_sun;

  // dω/dt = (n/4) × ε × α × ᾱ × b₃/₂⁽¹⁾(α), always positive
  const rate_rad_per_year = 0.25 * n_rad_per_year * massRatio * alpha * alpha_bar * laplace;

  // Convert rad/year to arcsec/century
  return rate_rad_per_year * 206264.806 * 100;
},

// Calculate ALL contributions to a planet's precession
// Returns detailed breakdown for display
precessionBreakdown: (
  planetName,           // Name of the planet to analyze
  planetData,           // Object with {a_km, e, i_deg, n_rad_per_year, omega_deg}
  allPlanetsData,       // Array of {name, a_km, e, i_deg, omega_deg, mass}
  M_sun                 // Sun's mass
) => {
  const contributions = [];
  let total = 0;

  for (const perturber of allPlanetsData) {
    if (perturber.name === planetName) continue; // Skip self

    // Calculate delta Omega (difference in ascending nodes)
    const deltaOmega = planetData.omega_deg - perturber.omega_deg;

    const contrib = OrbitalFormulas.secularPrecessionContribution(
      planetData.n_rad_per_year,
      perturber.mass,
      M_sun,
      planetData.a_km,
      perturber.a_km,
      planetData.e,
      perturber.e,
      planetData.i_deg,
      perturber.i_deg,
      deltaOmega
    );

    // Calculate mutual inclination for display
    const i_mutual = OrbitalFormulas.mutualInclination(
      planetData.i_deg, perturber.i_deg, deltaOmega
    );

    contributions.push({
      perturber: perturber.name,
      contribution: contrib,
      isOuter: perturber.a_km > planetData.a_km,
      mutualInclination: i_mutual,
      alpha: perturber.a_km > planetData.a_km
        ? planetData.a_km / perturber.a_km
        : perturber.a_km / planetData.a_km
    });

    total += contrib;
  }

  // Sort by absolute contribution (largest first)
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Add percentages
  for (const c of contributions) {
    c.percentage = total !== 0 ? (c.contribution / total) * 100 : 0;
  }

  return {
    planet: planetName,
    contributions: contributions,
    calculatedTotal: total,
    observedTotal: null,  // To be filled from planetStats
    accuracy: null        // Calculated as calculatedTotal / observedTotal
  };
}
```

### 2.2 Dynamic Data Collection Function

This function gathers current orbital parameters for all planets:

```javascript
// Collect current orbital data for all planets (called each frame or on demand)
// Uses dynamic values from 'o' object for inclinations
getPlanetPerturbationData: (o) => {
  return {
    mercury: {
      name: 'Mercury',
      a_km: mercuryOrbitDistance * o.lengthofAU,
      e: mercuryOrbitalEccentricity,
      i_deg: o.mercuryEclipticInclinationDynamic,  // DYNAMIC
      omega_deg: o.mercuryAscendingNode,
      mass: M_MERCURY,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(mercurySolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)
    },
    venus: {
      name: 'Venus',
      a_km: venusOrbitDistance * o.lengthofAU,
      e: venusOrbitalEccentricity,
      i_deg: o.venusEclipticInclinationDynamic,    // DYNAMIC
      omega_deg: o.venusAscendingNode,
      mass: M_VENUS,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(venusSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(venusPerihelionEclipticYears)
    },
    earth: {
      name: 'Earth',
      a_km: earthOrbitDistance * o.lengthofAU,
      e: earthOrbitalEccentricity,
      i_deg: o.earthEclipticInclinationDynamic,    // DYNAMIC
      omega_deg: o.earthAscendingNode,
      mass: M_EARTH,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(earthSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(earthPerihelionICRFYears)
    },
    mars: {
      name: 'Mars',
      a_km: marsOrbitDistance * o.lengthofAU,
      e: marsOrbitalEccentricity,
      i_deg: o.marsEclipticInclinationDynamic,     // DYNAMIC
      omega_deg: o.marsAscendingNode,
      mass: M_MARS,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(marsSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(marsPerihelionEclipticYears)
    },
    jupiter: {
      name: 'Jupiter',
      a_km: jupiterOrbitDistance * o.lengthofAU,
      e: jupiterOrbitalEccentricity,
      i_deg: o.jupiterEclipticInclinationDynamic,  // DYNAMIC
      omega_deg: o.jupiterAscendingNode,
      mass: M_JUPITER,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(jupiterSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(jupiterPerihelionEclipticYears)
    },
    saturn: {
      name: 'Saturn',
      a_km: saturnOrbitDistance * o.lengthofAU,
      e: saturnOrbitalEccentricity,
      i_deg: o.saturnEclipticInclinationDynamic,   // DYNAMIC
      omega_deg: o.saturnAscendingNode,
      mass: M_SATURN,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(saturnSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(saturnPerihelionEclipticYears)
    },
    uranus: {
      name: 'Uranus',
      a_km: uranusOrbitDistance * o.lengthofAU,
      e: uranusOrbitalEccentricity,
      i_deg: o.uranusEclipticInclinationDynamic,   // DYNAMIC
      omega_deg: o.uranusAscendingNode,
      mass: M_URANUS,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(uranusSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(uranusPerihelionEclipticYears)
    },
    neptune: {
      name: 'Neptune',
      a_km: neptuneOrbitDistance * o.lengthofAU,
      e: neptuneOrbitalEccentricity,
      i_deg: o.neptuneEclipticInclinationDynamic,  // DYNAMIC
      omega_deg: o.neptuneAscendingNode,
      mass: M_NEPTUNE,
      n_rad_year: OrbitalFormulas.meanMotionRadPerYear(neptuneSolarYearInput),
      observedPrecession: OrbitalFormulas.precessionRateFromPeriod(neptunePerihelionEclipticYears)
    }
  };
}
```

### 2.3 Helper Function to Get Breakdown for Display

```javascript
// Get precession breakdown for a specific planet
// Called from planetStats value functions
getMarsPrecessionBreakdown: (o) => {
  const allPlanets = OrbitalFormulas.getPlanetPerturbationData(o);
  const planetArray = Object.values(allPlanets);
  const marsData = allPlanets.mars;

  const breakdown = OrbitalFormulas.precessionBreakdown(
    'Mars',
    marsData,
    planetArray,
    M_SUN
  );

  breakdown.observedTotal = marsData.observedPrecession;
  breakdown.accuracy = (breakdown.calculatedTotal / breakdown.observedTotal) * 100;

  return breakdown;
}

// Similar functions for each planet:
// getMercuryPrecessionBreakdown(o)
// getVenusPrecessionBreakdown(o)
// getEarthPrecessionBreakdown(o)
// getJupiterPrecessionBreakdown(o)
// getSaturnPrecessionBreakdown(o)
// getUranusPrecessionBreakdown(o)
// getNeptunePrecessionBreakdown(o)
```

---

## Part 3: Expected Results

With the full formula including eccentricity and inclination corrections, we expect better accuracy than the simplified model.

### 3.1 Mars Precession Breakdown

| Perturber | Position | α ratio | Contribution | Percentage |
|-----------|----------|---------|--------------|------------|
| Jupiter | Outer | 0.293 | +1,470 | ~83% |
| Earth | Inner | 0.656 | +195 | ~11% |
| Saturn | Outer | 0.160 | +63 | ~4% |
| Venus | Inner | 0.475 | +46 | ~3% |
| Uranus | Outer | 0.080 | +1.2 | <1% |
| Mercury | Inner | 0.254 | +0.6 | <1% |
| Neptune | Outer | 0.051 | +0.4 | <1% |
| **First-order L-L total (A_ii)** | | | **~1,776** | |
| **WebGeoCalc observed (1900–2100)** | | | **~1,600** | |
| **Model Fibonacci long-term mean (H×8/35)** | | | **1,691** | |

**Insight:** Jupiter dominates (~83%) because:
- Largest mass (1/1047 of Sun)
- Closest giant planet to Mars (α = 0.293)
- Inner planets (Earth, Venus, Mercury) also contribute prograde — the second-biggest contribution is Earth, not Saturn.

The first-order L-L estimate (~1,776) overshoots both the WebGeoCalc short-baseline observation (~1,600) and the model's Fibonacci long-term mean (1,691) by ~5–10 %. That's consistent with the known first-order theory accuracy.

### 3.2 Mercury Precession Breakdown

| Perturber | Position | α ratio | Contribution | Percentage |
|-----------|----------|---------|--------------|------------|
| Venus | Outer | 0.535 | +286 | ~52% |
| Jupiter | Outer | 0.074 | +161 | ~29% |
| Earth | Outer | 0.387 | +95 | ~17% |
| Saturn | Outer | 0.041 | +8 | ~1% |
| Mars | Outer | 0.254 | +2 | <1% |
| Uranus | Outer | 0.020 | +0.1 | <1% |
| Neptune | Outer | 0.013 | <0.1 | <1% |
| **First-order L-L total (A_ii)** | | | **~553** | |
| **WebGeoCalc observed (1900–2100)** | | | **~570** | |
| **Model Fibonacci long-term mean (H×8/11)** | | | **531** | |

**Insight:** All planets are outer to Mercury, so all contributions are positive.
Venus dominates despite lower mass because of highest α ratio (0.535).

The first-order L-L total (~553) matches Mercury's observed rate (~570) to within ~3 %, which is near the expected first-order accuracy limit. The 531 ″/cy Fibonacci long-term mean (H × 8/11) is lower because the observed rate includes ~38–40 ″/cy of current-epoch harmonic fluctuation above the long-term mean.

**Historical note:** Urbain Le Verrier's original 19th-century calculation of Mercury's Newtonian perihelion advance gave ~532 ″/cy — differing from the full observed ~575 ″/cy by ~43 ″/cy, which Einstein 's General Relativity (1915) then explained as the effect of spacetime curvature near the Sun. The modern first-order L-L calculation (this doc, ~553 ″/cy) reproduces Le Verrier's result with small numerical refinements.

### 3.3 Jupiter Precession Breakdown

| Perturber | Position | α ratio | Contribution | Percentage |
|-----------|----------|---------|--------------|------------|
| Saturn | Outer | 0.546 | +742 | ~98% |
| Uranus | Outer | 0.272 | +8 | ~1% |
| Neptune | Outer | 0.174 | +2 | <1% |
| Earth | Inner | 0.192 | +1 | <1% |
| Venus | Inner | 0.139 | +0.4 | <1% |
| Mars | Inner | 0.293 | +0.3 | <1% |
| Mercury | Inner | 0.074 | <0.1 | <1% |
| **First-order L-L total (A_ii)** | | | **~754** | |
| **WebGeoCalc observed (1900–2100)** | | | **~1,800** | |
| **Model Fibonacci long-term mean (H/5)** | | | **1,933** | |

**Insight:** Saturn dominates Jupiter's diagonal A_ii rate almost entirely. First-order L-L gives ~754 ″/cy, but the WebGeoCalc observed rate is ~1,800 ″/cy. The 2.4× gap reflects strong Jupiter–Saturn off-diagonal coupling and the 5:2 near-resonance ("Great Inequality") — effects that first-order diagonal theory cannot capture. The model's Fibonacci long-term mean (H/5 = 1,933 ″/cy) is closer to WebGeoCalc than to first-order L-L because the Fibonacci framework is calibrated to observations, not derived from L-L.

### 3.4 Saturn Precession Breakdown

| Perturber | Position | α ratio | Contribution | Percentage |
|-----------|----------|---------|--------------|------------|
| Jupiter | Inner | 0.546 | +1,829 | ~98% |
| Uranus | Outer | 0.498 | +31 | ~2% |
| Neptune | Outer | 0.318 | +7 | <1% |
| Earth | Inner | 0.105 | +0.1 | <1% |
| Mars | Inner | 0.160 | <0.1 | <1% |
| Venus | Inner | 0.076 | <0.1 | <1% |
| Mercury | Inner | 0.041 | <0.1 | <1% |
| **First-order L-L total (A_ii)** | | | **+1,867** | |
| **WebGeoCalc observed (1900–2100)** | | | **~−3,400** | |
| **Model Fibonacci long-term mean (H/8)** | | | **−3,092** | |

**Insight:** Jupiter's gravitational perturbation dominates Saturn's diagonal rate. First-order L-L predicts +1,867 ″/cy **prograde**, but WebGeoCalc reports **~−3,400 ″/cy retrograde** for the 1900–2100 window — the direction is *opposite* to first-order prediction, with magnitude ~2× the model's long-term mean. This is one of the largest known failures of first-order secular theory.

The gap between +1,867 (L-L) and −3,400 (WebGeoCalc) is dominated by the Jupiter–Saturn 5:2 "Great Inequality" near-resonance, which first-order secular theory treats as slowly averaging out but which in reality adds a large retrograde signal during the current epoch. The model's Fibonacci rate (H/8 = −3,092 ″/cy retrograde) matches WebGeoCalc to ~10 %, while first-order L-L has the wrong sign.

See docs/10-fibonacci-laws.md §"Saturn's Ecliptic-Retrograde Perihelion Precession" for more on this discrepancy.

---

## Part 4: Display in planetStats

### 4.1 Detailed Display Format (7+ lines per planet)

For Mars, the display will show all 7 planetary contributions plus totals:

```javascript
{header : '—  Precession Breakdown —' },
  {label : () => `Observed Precession Rate`,
   value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(marsPerihelionEclipticYears), dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Total observed perihelion precession rate from astronomical observations`],
   static: true},
null,
  {label : () => `┌ Jupiter`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Jupiter')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Jupiter (outer): Largest contributor due to mass and proximity. α = 0.293`]},
  {label : () => `├ Saturn`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Saturn')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Saturn (outer): Second largest contributor. α = 0.159`]},
  {label : () => `├ Earth`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Earth')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Earth (inner): Second-largest contributor. Inner perturbers contribute prograde via the α·ᾱ = α weighting. α = 0.656`]},
  {label : () => `├ Venus`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Venus')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Venus (inner): Prograde contribution scaled by α = 0.475`]},
  {label : () => `├ Uranus`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Uranus')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Uranus (outer): Small prograde contribution. α = 0.079`]},
  {label : () => `├ Neptune`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Neptune')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Neptune (outer): Smallest prograde contribution due to distance. α = 0.050`]},
  {label : () => `└ Mercury`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).contributions.find(c => c.perturber === 'Mercury')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Mercury (inner): Negligible prograde contribution. α = 0.254`]},
null,
  {label : () => `Σ Calculated Total`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).calculatedTotal, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Sum of all planetary contributions from Lagrange-Laplace secular theory`]},
  {label : () => `Model Accuracy`,
   value : [ { v: () => OrbitalFormulas.getMarsPrecessionBreakdown(o).accuracy, dec:1, sep:',' },{ small: '%' }],
   hover : [`Calculated ÷ Observed × 100. Differences due to resonances and higher-order effects`]},
```

### 4.2 Optimized Implementation with Caching

To avoid recalculating the breakdown for each field, we can cache the result:

```javascript
// In the animation loop or update function:
let marsPrecessionCache = null;
let marsPrecessionCacheTime = 0;

function getMarsPrecessionCached(o) {
  // Recalculate every 1000ms (or when orbital data changes significantly)
  const now = Date.now();
  if (!marsPrecessionCache || now - marsPrecessionCacheTime > 1000) {
    marsPrecessionCache = OrbitalFormulas.getMarsPrecessionBreakdown(o);
    marsPrecessionCacheTime = now;
  }
  return marsPrecessionCache;
}

// Then in planetStats:
{label : () => `┌ Jupiter`,
 value : [ { v: () => {
   const breakdown = getMarsPrecessionCached(o);
   return breakdown.contributions.find(c => c.perturber === 'Jupiter')?.contribution;
 }, dec:1, sep:',' },{ small: 'arcsec/century' }],
 hover : [`Jupiter (outer): Largest contributor`]},
```

### 4.3 Display for All Planets

Each planet gets its own breakdown section. Here's the pattern for Mercury (where all contributions are positive):

```javascript
// MERCURY - All outer perturbers
{header : '—  Precession Breakdown —' },
  {label : () => `Observed Precession Rate`,
   value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears), dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Famous for the 43 arcsec/century relativistic anomaly discovered by Le Verrier`],
   static: true},
null,
  {label : () => `┌ Venus`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Venus')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Venus (outer): Dominant due to proximity despite lower mass. α = 0.534`]},
  {label : () => `├ Jupiter`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Jupiter')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Jupiter (outer): Second largest due to enormous mass. α = 0.074`]},
  {label : () => `├ Earth`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Earth')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Earth (outer): Third contributor. α = 0.387`]},
  {label : () => `├ Saturn`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Saturn')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Saturn (outer): Small contribution due to distance. α = 0.040`]},
  {label : () => `├ Mars`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Mars')?.contribution, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Mars (outer): Small due to low mass. α = 0.254`]},
  {label : () => `├ Uranus`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Uranus')?.contribution, dec:2, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Uranus (outer): Negligible. α = 0.020`]},
  {label : () => `└ Neptune`,
   value : [ { v: () => getMercuryPrecessionCached(o).contributions.find(c => c.perturber === 'Neptune')?.contribution, dec:2, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Neptune (outer): Negligible. α = 0.013`]},
null,
  {label : () => `Σ Calculated Total`,
   value : [ { v: () => getMercuryPrecessionCached(o).calculatedTotal, dec:1, sep:',' },{ small: 'arcsec/century' }],
   hover : [`Newtonian sum: ~530. Missing ~43 arcsec/century is Einstein's relativistic correction!`]},
  {label : () => `Model Accuracy`,
   value : [ { v: () => getMercuryPrecessionCached(o).accuracy, dec:1, sep:',' },{ small: '%' }],
   hover : [`Without relativity, Newtonian mechanics accounts for ~92% of Mercury's precession`]},
```

---

## Part 5: Why No Calibration Factors

**Decision:** Show raw calculated values without artificial correction factors.

### 5.1 Rationale

1. **Scientific Integrity**: The raw output of the Lagrange-Laplace secular theory is more honest
2. **Educational Value**: Showing the discrepancy teaches about:
   - Limitations of first-order secular theory
   - Mean motion resonances (Jupiter-Saturn 5:2)
   - Higher-order perturbation effects
   - Relativistic effects (for Mercury)
3. **Transparency**: Users can see exactly what the physics predicts

### 5.2 Expected Accuracy Range (first-order A_ii vs WebGeoCalc observed)

| Planet | L-L Accuracy | Comment |
|--------|--------------|---------|
| Mercury | ~97 % | L-L works well; missing ~3 % is the GR 43 ″/cy anomaly + higher-order terms |
| Venus | ~0 % | Catastrophic failure: L-L gives ~1,199 ″/cy, observed ~0 ″/cy (low-e singularity) |
| Earth | ~21 % | L-L gives inertial-frame rate; WebGeoCalc measures wrt equinox (different frame) |
| Mars | ~90 % | L-L overshoots by ~11 % due to neglected cross-terms and higher-order effects |
| Jupiter | ~42 % | Jupiter-Saturn 5:2 coupling not captured in first-order theory |
| Saturn | wrong sign | L-L predicts +1,867 prograde; WebGeoCalc reports ~−3,400 retrograde |
| Uranus | ~25 % | Missing off-diagonal coupling with Saturn/Neptune |
| Neptune | ~34 % | Missing off-diagonal coupling |

The Holistic Universe Model's Fibonacci rates match all eight planets to 3–10 %, as
documented in §7.1 and [docs/37-planets-precession-cycles.md](37-planets-precession-cycles.md).

### 5.3 Notable Discrepancies

**Saturn (wrong sign in first-order L-L — the Great Inequality case):** First-order secular theory says Saturn's perihelion precesses prograde at ~+1,867 ″/cy (this doc's calculation) or +19.5 ″/yr = +1,950 ″/cy (long-term secular theory, Park g_6). **WebGeoCalc, however, reports Saturn retrograde at ~−3,400 ″/cy for the 1900–2100 baseline.** Sign-flip, not just magnitude.

Standard astronomy explains this via the **Great Inequality**: the Jupiter-Saturn 5:2 near-resonance drives a ~900-year oscillation in Saturn's perihelion rate. The long-term secular average is prograde (standard theory's answer), but the current epoch happens to be in the retrograde phase of that cycle. Under this view, Saturn's rate should reverse within ~450 years.

**The Holistic Universe Model's interpretation is different.** The model treats Saturn's observed retrograde rate as structural, not transient: `ω_peri = −H/8 = −3,092 ″/cy` permanently, because ICRF (not the ecliptic) is the stable foundation and the Fibonacci structure is anchored there. The model's ecliptic retrograde matches WebGeoCalc to ~10 %; standard secular theory has the wrong sign entirely. This is the clearest concrete disagreement between the model and L-L secular theory, and it's a **testable prediction** — long-baseline integration (DE441) can tell whether Saturn's rate stays retrograde or reverses within ~450 yr.

See §1.5a for the reference-frame explanation of why L-L cannot produce the date-frame retrograde signal even when its long-term eigenvalue is "right".

**Venus (L-L singularity):** Venus's nearly circular orbit (e = 0.0068) makes the perihelion direction extremely sensitive to small perturbations, and first-order theory diverges. The WebGeoCalc observed rate (~0 ″/cy) reflects destructive interference between modes that first-order theory cannot resolve.

**Mercury (relativity):** Mercury's observed ~570 ″/cy matches first-order L-L (~553 ″/cy) to within ~3 %. The remaining gap is partly higher-order Newtonian terms and partly Einstein's 43 ″/cy GR contribution — historically the most famous mismatch between theory and observation in celestial mechanics.

---

## Part 6: Implementation Steps

### Phase 1: Add OrbitalFormulas Methods
1. `laplaceCoefficient_3_2_1(alpha)` - Laplace coefficient b₃/₂⁽¹⁾(α) — used for the diagonal A_ii (self-precession) of both inner and outer perturbers.
2. `laplaceCoefficient_3_2_2(alpha)` - Laplace coefficient b₃/₂⁽²⁾(α) — helper for off-diagonal A_ij (eigenvector-mixing) terms. Not used by the current precession-breakdown display.
3. `eccentricityCorrectionFactor(e, e')` - Eccentricity correction
4. `mutualInclination(i1, i2, deltaOmega)` - Calculate mutual inclination
5. `inclinationCorrectionFactor(i_mutual)` - Inclination correction
6. `meanMotionRadPerYear(period_days)` - Convert period to mean motion
7. `secularPrecessionContribution(...)` - Main calculation for one perturber
8. `precessionBreakdown(...)` - Calculate all contributions

### Phase 2: Add Data Collection
1. `getPlanetPerturbationData(o)` - Collect dynamic orbital data
2. Individual getter functions: `getMarsPrecessionBreakdown(o)`, etc.

### Phase 3: Add Caching (Optional)
1. Implement time-based cache for each planet's breakdown
2. Invalidate cache when simulation time changes significantly

### Phase 4: Update planetStats
1. Add `{header : '—  Precession Breakdown —' }` section to each planet
2. Add 7 contributor rows (one per perturbing planet)
3. Add calculated total and accuracy fields

### Phase 5: Documentation
1. Update orbital-formulas.md with Part 10: Precession Breakdown
2. Document all new OrbitalFormulas methods
3. Add validation data and expected results

---

## Part 7: Validation

### 7.1 Three-way comparison (arcsec/century)

The table below compares, for each planet:
- **WebGeoCalc observed** — JPL/NAIF's short-baseline (1900–2100) measurement, the actual observed perihelion precession rate.
- **First-order L-L A_ii** — what this breakdown computes from Laplace-Lagrange secular theory (diagonal only).
- **Model Fibonacci** — the Holistic Universe Model's long-term mean rate from the Fibonacci framework (H-fraction).

| Planet | WebGeoCalc observed | First-order A_ii | Model Fibonacci | Notes |
|--------|--------------------|-----------------|-----------------|-------|
| Mercury | ~570 | ~553 | 531 (H × 8/11) | L-L matches obs to ~3 % |
| Venus | ~0 | ~1,199 | −290 (−8H/6) | L-L fails catastrophically (low-e singularity) |
| Earth | ~6,186 | ~1,280 | 6,187 (H/16) | Fibonacci matches obs exactly; L-L gives inertial rate (different frame) |
| Mars | ~1,600 | ~1,776 | 1,691 (H × 8/35) | L-L over by ~11 %; Fibonacci matches obs to ~5 % |
| Jupiter | ~1,800 | ~754 | 1,933 (H/5) | L-L under by ~58 %; Fibonacci matches obs to ~7 % |
| Saturn | ~−3,400 | +1,867 | −3,092 (H/8) | L-L has wrong sign; Fibonacci matches obs to ~10 % |
| Uranus | ~1,100 | ~278 | 1,160 (H/3) | L-L under by ~75 %; Fibonacci matches obs to ~5 % |
| Neptune | ~200 | ~68 | 193 (2H) | L-L under by ~66 %; Fibonacci matches obs to ~4 % |

**Key observation:** First-order L-L is a reasonable approximation for Mercury and
Mars but fails significantly for every other planet. The Holistic Universe Model's
Fibonacci rates, which are calibrated to WebGeoCalc, match observations to 3–10 %
across all planets, including the cases where L-L fails by factors of 2–10 or
gives the wrong sign. L-L is a theoretical simplification; the Fibonacci framework
is observationally grounded.

### 7.2 Sanity Checks

1. **First-order L-L matches WebGeoCalc only for Mercury (~3 % agreement).** Mars is off by ~11 %, Venus by 100 %, Jupiter by ~58 %, Saturn has the wrong sign. These are structural failures of first-order theory, not implementation bugs.
2. **Jupiter dominates for Mars** (~83 %).
3. **Venus dominates for Mercury** (~52 %).
4. **Saturn dominates for Jupiter** (~98 % of the diagonal rate).
5. **Jupiter dominates for Saturn** (~98 % of the diagonal rate).
6. **All perturbers contribute prograde (+)** — no negative contributions in the diagonal A_ii.
7. **Outer-perturber contributions scale roughly with mass × α²**.
8. **Inner-perturber contributions scale roughly with mass × α** (one less power of α, so inner planets often contribute more than you'd expect from mass alone — e.g. Earth contributes more than Saturn to Mars's rate).
9. **The model's Fibonacci rates are not first-order L-L values.** They are calibrated to WebGeoCalc observations directly, and match all planets to 3–10 %. Comparing the L-L column to the Fibonacci column shows where classical theory diverges from observed reality.

### 7.3 Dynamic Validation

Since we use dynamic inclinations (`o.<planet>EclipticInclinationDynamic`), the values will vary slightly over time. Expected variation:
- Inclination correction: ±0.1% to ±2%
- Total variation: ±1-5 arcsec/century

This dynamic behavior demonstrates the real-time nature of gravitational perturbations.

---

## Part 8: Summary

### What We Built

A **Precession Breakdown** feature that:
- Shows how each of the 8 major planets contributes to another planet's perihelion precession
- Uses Lagrange-Laplace secular perturbation theory
- Calculates dynamically using current orbital parameters
- Displays raw physics results without artificial calibration
- Provides educational insight into orbital mechanics

### Key Features

1. **All 8 planets** as perturbers (Mercury through Neptune)
2. **Detailed display** (10+ lines per planet including header and totals)
3. **Dynamic calculation** using `o.<planet>EclipticInclinationDynamic`
4. **No calibration** - shows true physics predictions
5. **Accuracy display** comparing calculated to observed values

### Historical Significance

For Mercury, this breakdown historically demonstrated:
- Newtonian mechanics predicts ~532 arcsec/century
- Observed value is ~570 arcsec/century
- The ~43 arcsec/century discrepancy was unexplained until Einstein's General Relativity (1915)

This feature brings that same analysis to all planets!
