---
docVersion: 1.0
modelVersion: v12.0
coefficients: sha256:a4b818dc588e46e8
status: current
---

# 36 — Tilt, Inclination, and Eccentricity: Definitive Balance Calculations

This document records the complete relationship between axial tilt, inclination
to the invariable plane, and orbital eccentricity within the Fibonacci balance
framework. It explains how the perihelion distance is fixed, how tilt and
inclination oscillations produce a small eccentricity fluctuation, and how the
eccentricity balance is maintained at every epoch.

> **Scope note (ESSRT).** The balance laws themselves (Law 3 vector inclination balance, Law 5 scalar eccentricity balance with `δv = K · sin(tilt)`) are scale-invariant — they hold at any epoch. PSI, K, base eccentricities, axial tilts, the per-planet d-values, and the period denominators (H/N, 8H/N) are scale-invariant structural constants. The **literal year-count values** in the period tables (H = <!--v:H-->335,317<!--/v-->; H/16 = <!--v:earthPeriPeriod-->20,957<!--/v-->; 8H/65 = <!--v:saturnPeriPeriod-->41,270<!--/v-->; the balanced-year anchor at -<!--v:systemResetYearBC-->2,649,854 BC<!--/v-->; the perihelion-precession periods <!--v:mercuryPeriPeriod-->243,867<!--/v--> / <!--v:venusPeriPeriod-->447,089<!--/v--> / <!--v:marsPeriPeriod-->74,515<!--/v--> / <!--v:jupiterPeriPeriod-->68,783<!--/v--> / <!--v:twoH-->670,634<!--/v--> yr) are J2000-evaluated. Under [ESSRT](99-expanding-solar-system-resonance-theory.md), H(t) evolves at deep time via Drivers 1 (LOD growth) and 2 (Kepler), scaling every literal year count proportionally. The balance machinery this document describes therefore holds at any epoch with epoch-consistent inputs — §11 ("Why the Balance Holds at All Epochs") makes the temporal robustness explicit.

---

## 1. The Two Balance Laws

### Law 3 — Inclination Balance (Vector)

Each planet's inclination to the invariable plane oscillates:

    i(t) = i_mean + i_amplitude * cos(phase(t))

The balance weight is:

    L  = m * sqrt( a * (1 - e^2) )
    w  = L * i_amplitude / d

where m = planet mass / Sun mass, a = semi-major axis (AU), e = eccentricity,
d = Fibonacci d-value, and i_amplitude = PSI / (d * sqrt(m)).

**Vector balance**: the sum of L * i_amplitude vectors at their respective cycle
anchors (per-planet cycle anchors — ICRF perihelion longitudes where MAX inclination occurs at the balanced year) should cancel. Prograde planets (7) vs anti-phase Saturn.

### Law 5 — Eccentricity Balance (Scalar)

    v = sqrt(m) * a^(3/2) * e / sqrt(d)

**Scalar balance**: the sum of v for the in-phase group must equal the sum of v for
the anti-phase group.

**Group assignment** (the default configuration: Me=21, Ve=34, Ea=3, Ma=5, Ju=5, Sa=3, Ur=21, Ne=34):

| Group       | Planets                                               |
|-------------|-------------------------------------------------------|
| In-phase    | Mercury, Venus, Earth, Mars, Jupiter, Uranus, Neptune |
| Anti-phase  | Saturn (sole member)                                  |

Saturn alone carries 50.0% of total Law 5 weight, making it the decisive planet.

---

## 2. Constants

| Symbol | Value                | Source                                      |
|--------|----------------------|---------------------------------------------|
| H      | <!--v:HPlain-->335317<!--/v-->               | Earth Fundamental Cycle Length                         |
| PSI    | 3.3069e-3 (d_E × amp_E × √m_E) | Inclination amplitude constant (Law 2, from Earth) |
| K      | <!--v:kValue-->3.4143 × 10⁻⁶<!--/v--> | Tilt-eccentricity constant (derived from Earth) |

PSI is defined in `tools/lib/constants.js` (search `PSI`).
K is derived in Section 4 below.

---

## 3. Fibonacci D-Values and Phase Groups (the default configuration)

| Planet  | d  | Phase (deg)  | Group      | Mirror Pair |
|---------|----|--------------|------------|-------------|
| Mercury | 21 | <!--v:mercuryInclCycleAnchor-->234.52<!--/v-->       | In-phase   | Uranus      |
| Venus   | 34 | <!--v:venusInclCycleAnchor-->218.64<!--/v-->       | In-phase   | Neptune     |
| Earth   |  3 |  21.77       | In-phase   | Saturn      |
| Mars    |  5 | <!--v:marsInclCycleAnchor-->236.07<!--/v-->       | In-phase   | Jupiter     |
| Jupiter |  5 | <!--v:jupiterInclCycleAnchor-->287.06<!--/v-->       | In-phase   | Mars        |
| Saturn  |  3 | <!--v:saturnInclCycleAnchor-->116.26<!--/v-->       | Anti-phase | Earth       |
| Uranus  | 21 |  21.33       | In-phase   | Mercury     |
| Neptune | 34 | <!--v:neptuneInclCycleAnchor-->174.04<!--/v-->       | In-phase   | Venus       |

Phase angles anchored to balanced year n=7. d-values, antiPhase, mirror pairs unchanged.

Mirror symmetry: Me-Ur (21), Ve-Ne (34), Ea-Sa (3), Ma-Ju (5).

---

## 4. The Tilt-Eccentricity Connection

### Inclination Amplitude Formula

    i_amplitude = PSI / (d * sqrt(m))

This determines how much a planet's inclination to the invariable plane oscillates.

### Eccentricity Amplitude Formula

The combined effect of axial tilt oscillation and inclination oscillation — which
operate at different periods — produces a real eccentricity fluctuation. The
amplitude of this fluctuation is:

    e_amplitude = K * sin(tilt_mean) * sqrt(d) / (sqrt(m) * a^(3/2))

where K = <!--v:kValue-->3.4143 × 10⁻⁶<!--/v-->, derived from Earth:

    K = e_amp_Earth * sqrt(m_Earth) * a_Earth^(3/2) / (sin(tilt_Earth) * sqrt(d_Earth))
    K = 0.0013559 * sqrt(3.00350e-6) * 1.0 / (sin(<!--v:meanObliquity-->23.41353<!--/v--> deg) * sqrt(3))
    K = 3.4143e-6

### Key Property: Law 5 Weight Change

When computing the Law 5 weight change from eccentricity oscillation:

    delta_v = sqrt(m) * a^(3/2) * e_amplitude / sqrt(d)
            = sqrt(m) * a^(3/2) * K * sin(tilt) * sqrt(d) / (sqrt(m) * a^(3/2) * sqrt(d))
            = K * sin(tilt)

**Mass and distance cancel completely.** The Law 5 weight change depends only on axial
tilt. This means planets with small tilts barely affect the balance regardless of their
mass or position.

---

## 5. Eccentricity Amplitudes from Tilt Formula

| Planet  | Tilt (deg) | e_amplitude   | % of J2000 ecc | Effect on balance |
|---------|------------|---------------|-----------------|-------------------|
| Mercury |   <!--v:mercuryAxialTiltJ2000-->0.03<!--/v-->     | <!--v:mercuryEccAmp-->2.337e-5<!--/v-->      | 0.011%          | Negligible        |
| Venus   |   <!--v:venusAxialTiltJ2000-->2.6392<!--/v-->   | <!--v:venusEccAmp-->9.524e-4<!--/v-->      | 14.057%         | Negligible (tiny v) |
| Earth   |  <!--v:meanObliquity-->23.41353<!--/v-->  | <!--v:eccentricityAmplitude-->0.001356<!--/v-->      | 8.116%          | 0.05% of total    |
| Mars    |  <!--v:marsAxialTiltJ2000-->25.19<!--/v-->     | <!--v:marsEccAmp-->3.056e-3<!--/v-->      | 3.283%          | 0.14% of total    |
| Jupiter |   <!--v:jupiterAxialTiltJ2000-->3.13<!--/v-->     | <!--v:jupiterEccAmp-->1.134e-6<!--/v-->      | 0.002%          | Negligible        |
| Saturn  |  <!--v:saturnAxialTiltJ2000-->26.73<!--/v-->     | <!--v:saturnEccAmp-->5.359e-6<!--/v-->      | 0.010%          | Negligible        |
| Uranus  |  <!--v:uranusAxialTiltJ2000-->82.23<!--/v-->     | <!--v:uranusEccAmp-->2.802e-5<!--/v-->      | 0.059%          | Negligible        |
| Neptune |  <!--v:neptuneAxialTiltJ2000-->28.32<!--/v-->     | <!--v:neptuneEccAmp-->8.037e-6<!--/v-->      | 0.094%          | Negligible        |

### The Physical Mechanism: How Eccentricity Arises from Tilt and Inclination

The following chain describes what happens for each planet:

**Step 1 — Fixed orbital eccentricity (base value).**
Each planet's orbit has a fixed offset between its geometric center and the Sun.
For Earth this offset is eccentricityBase = <!--v:eccentricityBase-->0.015386<!--/v--> (dimensionless; ×a for the offset in AU). This base eccentricity
does not change over time. Only the direction of the perihelion precesses — the
perihelion point rotates around the Sun, but its distance remains the same.

**Step 2 — Mean axial tilt.**
Each planet has a mean axial obliquity. For Earth this is <!--v:meanObliquity-->23.41353<!--/v--> deg.

**Step 3 — Axial tilt oscillation.**
The axial tilt fluctuates over time with a period equal to the obliquity cycle.
The amplitude of this oscillation equals the inclination amplitude (see Step 4).
For Earth: amplitude = <!--v:earthInclAmp-->0.63607<!--/v--> deg.

**Step 4 — Inclination oscillation.**
The inclination to the invariable plane fluctuates with a period equal to the
inclination precession cycle. The amplitude equals the axial tilt amplitude:
i_amplitude = PSI / (d * sqrt(m)). For Earth: amplitude = <!--v:earthInclAmp-->0.63607<!--/v--> deg.

**Step 5 — Eccentricity fluctuation from combined effect.**
Because the axial tilt oscillation and the inclination oscillation operate at
DIFFERENT periods, their combined effect produces a real eccentricity fluctuation
at the planet's eccentricity cycle — the meeting frequency where axial precession
meets inclination precession. Each planet has its own eccentricity cycle (see
Section 10 and `docs/37-planets-precession-cycles.md`). For Earth the eccentricity
cycle is H/16 = <!--v:earthPeriPeriod-->20,957<!--/v--> years, resulting in an amplitude of <!--v:eccentricityAmplitude-->0.001356<!--/v--> (dimensionless).

**Step 6 — Eccentricity balance is maintained at every epoch.**
The mean perihelion distances (base eccentricities) achieve ~99.9% Law 5 balance.
The fluctuations change each planet's real eccentricity slightly, but because
delta_v = K * sin(tilt) — with mass and distance cancelling — the balance is
preserved at every epoch. The dominant planets (Saturn, Jupiter, Uranus, Neptune
= 99.8% of total weight) have tiny eccentricity amplitudes (< 0.1% of mean),
so the balance barely moves.

### Balance Guard Summary

| Group          | Law 5 weight | Max ecc amplitude | Balance effect |
|----------------|-------------|-------------------|----------------|
| Outer giants   | 99.79%      | < 0.1% of mean    | Negligible     |
| Inner planets  |  0.21%      | up to 14% of mean | Negligible     |

Even in the worst case (all inner planets at maximum amplitude simultaneously),
the total Law 5 balance shifts by less than 0.05%.

---

## 6. Definitive Eccentricity Values

### Base Eccentricities

Every planet has a fixed base eccentricity — the static offset between the orbit
center and the Sun. All planets also fluctuate around this base value, with the
amplitude determined by their axial tilt (Section 4). Mercury's tilt is nearly
zero (0.03 deg), so its fluctuation is negligible. Earth and Mars have large tilts
and therefore the most significant eccentricity oscillations.

**Derivation of base eccentricities:**

- **Earth**: eccentricityBase = <!--v:eccentricityBase-->0.015386<!--/v--> (tuned parameter in the model)
- **Saturn**: 0.05386582 (dual-balance optimized, sole anti-phase group member)
- **Jupiter, Uranus**: Dual-balanced from Law 5 optimization
- **Venus, Mars**: Derived by fitting a cosine to JPL Horizons eccentricity
  data (originally fitted at H/16 period; to be re-fitted with per-planet eccentricity cycles).
  - Mars: JPL data (1700–2500, 10-year steps) fitted cosine gives amplitude
    3.059e-3, matching the tilt prediction (3.066e-3) to within 0.2%
    (ratio 1.00x, R² = 0.867). Fitted mean = 0.09297543.
  - Venus: Base eccentricity derived from balanced-year phase.
    Venus's eccentricity variation is dominated by Laplace-Lagrange secular
    perturbations, not the K-driven tilt mechanism (JPL cosine fit R² = 0.074).
  - Script: `tools/fit/python/planet_eccentricity_jpl.py`

All base eccentricities are now derived at runtime from the balanced-year phase
(same principle as Earth). See [The Closed Loop](72-the-closed-loop.md) for the
full derivation chain. The eccentricity balance (Law 5) emerges naturally at ~99.9%.

### Cosine Fit Validation

Note: the fits below were originally performed using the universal H/16 period.
With per-planet eccentricity cycles, the Mars and Venus fits should be re-run using
their respective periods (Mars: ~51,587 yr, Venus: ~141,186 yr — `wobblePeriod` per doc 37). The
amplitudes are expected to remain similar since they depend on tilt, not period.

| Planet  | Fit Amp       | Tilt-Predicted Amp | Ratio | R²    |
|---------|---------------|--------------------|-------|-------|
| Mars    | 3.059e-3      | 3.066e-3           | 1.00x | 0.867 |
| Venus   | 1.084e-3      | 9.526e-4           | 1.14x | 0.074 |

Mars matches almost exactly. Venus has lower R² because 300 years of JPL data
covers a tiny fraction of the eccentricity cycle.

### J2000 Eccentricities (Model Prediction at Epoch J2000.0)

At J2000, each planet is at some phase of its eccentricity oscillation.
The JPL J2000 values represent the actual eccentricity at that epoch:

| Planet  | J2000 Model   | J2000 JPL     | Diff from JPL |
|---------|---------------|---------------|---------------|
| Mercury | <!--v:mercuryEccJ2000Full-->0.20563593<!--/v-->    | <!--v:mercuryEccJ2000Full-->0.20563593<!--/v-->    |  0.000%       |
| Venus   | <!--v:venusEccJ2000Full-->0.00677672<!--/v-->    | <!--v:venusEccJ2000Full-->0.00677672<!--/v-->    |  0.000%       |
| Earth   | <!--v:j2000Eccentricity-->0.01671022<!--/v-->    | <!--v:j2000Eccentricity-->0.01671022<!--/v-->    |  0.000%       |
| Mars    | 0.09339410    | 0.09339410    |  0.000%       |
| Jupiter | <!--v:jupiterEccJ2000Full-->0.04838624<!--/v-->    | <!--v:jupiterEccJ2000Full-->0.04838624<!--/v-->    |  0.000%       |
| Saturn  | <!--v:saturnEccJ2000Full-->0.05386179<!--/v-->    | <!--v:saturnEccJ2000Full-->0.05386179<!--/v-->    |  0.000%       |
| Uranus  | <!--v:uranusEccJ2000Full-->0.04725744<!--/v-->    | <!--v:uranusEccJ2000Full-->0.04725744<!--/v-->    |  0.000%       |
| Neptune | <!--v:neptuneEccJ2000Full-->0.00859048<!--/v-->    | <!--v:neptuneEccJ2000Full-->0.00859048<!--/v-->    |  0.000%       |

At J2000, **Earth and Mars are above their base eccentricities** (Earth: <!--v:earthEccJ2000-->0.01671<!--/v--> vs base <!--v:earthEccBase-->0.01539<!--/v-->; Mars: <!--v:marsEccJ2000-->0.09339<!--/v--> vs base <!--v:marsEccBase-->0.09165<!--/v-->), while **Venus is below its base** (<!--v:venusEccJ2000-->0.00678<!--/v--> vs <!--v:venusEccBase-->0.00771<!--/v-->). The differences reflect each planet's phase in its own eccentricity oscillation at the J2000 epoch. The outer giants (Jupiter, Saturn, Uranus, Neptune) have base eccentricities calibrated very close to their J2000 values (differences ≤ 1.5×10⁻⁵, well below 0.1%), so their J2000 model values match the base values at the precision shown above. The current phase-derived calibration makes the outer-planet differences much smaller than under earlier calibrations, where Laplace-Lagrange secular exchange was invoked to explain ~0.2–1.1% offsets (see Section 10).

### Law 5 Weight Contributions

| Planet  | % of total |
|---------|-----------|
| Saturn  |   50.00%  |
| Jupiter |   25.59%  |
| Uranus  |   18.52%  |
| Neptune |    5.69%  |
| Mars    |    0.14%  |
| Earth   |    0.05%  |
| Mercury |    0.01%  |
| Venus   |    0.00%  |

---

## 7. Definitive Inclination Values

### Inclination to the Invariable Plane

| Planet  | Mean Incl (deg) | Amplitude (deg) | J2000 Incl (deg) | Range (deg)      |
|---------|-----------------|------------------|-------------------|------------------|
| Mercury |  <!--v:mercuryInclMean-->6.703228<!--/v-->       | <!--v:mercuryInclAmp-->0.386501<!--/v-->         | <!--v:mercuryInclJ2000-->6.3472858<!--/v-->         | 6.32 to 7.09    |
| Venus   |  <!--v:venusInclMean-->2.151359<!--/v-->       | <!--v:venusInclAmp-->0.062168<!--/v-->         | <!--v:venusInclJ2000-->2.1545441<!--/v-->         | 2.09 to 2.21    |
| Earth   |  <!--v:earthInclMean-->1.48113<!--/v--> | <!--v:earthInclAmp-->0.63607<!--/v--> | <!--v:earthInclJ2000-->1.57869<!--/v--> | 0.85 to 2.12    |
| Mars    |  <!--v:marsInclMean-->1.833263<!--/v-->       | <!--v:marsInclAmp-->1.164287<!--/v-->         | <!--v:marsInclJ2000-->1.6311858<!--/v-->         | 0.67 to 3.00    |
| Jupiter |  <!--v:jupiterInclMean-->0.321086<!--/v-->       | <!--v:jupiterInclAmp-->0.021405<!--/v-->         | <!--v:jupiterInclJ2000-->0.3219652<!--/v-->         | 0.30 to 0.34    |
| Saturn  |  <!--v:saturnInclMean-->0.984969<!--/v-->       | <!--v:saturnInclAmp-->0.065196<!--/v-->         | <!--v:saturnInclJ2000-->0.9254704<!--/v-->         | 0.92 to 1.05    |
| Uranus  |  <!--v:uranusInclMean-->1.015183<!--/v-->       | <!--v:uranusInclAmp-->0.023832<!--/v-->         | <!--v:uranusInclJ2000-->0.9946692<!--/v-->         | 0.99 to 1.04    |
| Neptune |  <!--v:neptuneInclMean-->0.743803<!--/v-->       | <!--v:neptuneInclAmp-->0.013552<!--/v-->         | <!--v:neptuneInclJ2000-->0.7354155<!--/v-->         | 0.73 to 0.76    |

### Amplitude Derivation

Inclination amplitudes are derived from the PSI formula:

    i_amplitude = PSI / (d * sqrt(m))

**SYSTEM/ALONE mass convention** (intentional, see [doc 10 §Universal Constants](10-fibonacci-laws.md#the-universal-constants-ψ-and-k) and [doc 25 §Sun/System vs Sun/Planet-Alone](25-universal-mass-from-moon-formula.md#sunsystem-vs-sunplanet-alone)): Earth uses M_Earth_ALONE in PSI calibration; other planets use M_planet_SYSTEM in the formula. This preserves the model's fitted state — the Moon's perturbation contribution is empirically absorbed into the calibrated `inclAmp_Earth`.

| Planet  | d  | sqrt(m)        | PSI / (d * sqrt(m)) | Actual amplitude | Match |
|---------|-----|----------------|----------------------|------------------|-------|
| Mercury |  21 | 4.0745e-4      | <!--v:mercuryInclAmp-->0.386501<!--/v-->             | <!--v:mercuryInclAmp-->0.386501<!--/v-->         | Yes   |
| Venus   |  34 | 1.5646e-3      | <!--v:venusInclAmp-->0.062168<!--/v-->             | <!--v:venusInclAmp-->0.062168<!--/v-->         | Yes   |
| Earth   |   3 | 1.7331e-3      | 0.636              | <!--v:earthInclAmp-->0.63607<!--/v--> | 0.0% |
| Mars    |   5 | 5.6808e-4      | <!--v:marsInclAmp-->1.164287<!--/v-->             | <!--v:marsInclAmp-->1.164287<!--/v-->         | Yes   |
| Jupiter |   5 | 3.0900e-2      | <!--v:jupiterInclAmp-->0.021405<!--/v-->             | <!--v:jupiterInclAmp-->0.021405<!--/v-->         | Yes   |
| Saturn  |   3 | 1.6908e-2      | <!--v:saturnInclAmp-->0.065196<!--/v-->             | <!--v:saturnInclAmp-->0.065196<!--/v-->         | Yes   |
| Uranus  |  21 | 6.6078e-3      | <!--v:uranusInclAmp-->0.023832<!--/v-->             | <!--v:uranusInclAmp-->0.023832<!--/v-->         | Yes   |
| Neptune |  34 | 7.1772e-3      | <!--v:neptuneInclAmp-->0.013552<!--/v-->             | <!--v:neptuneInclAmp-->0.013552<!--/v-->         | Yes   |

Earth matches by construction: ψ is defined from Earth's amplitude (ψ = 3 × <!--v:earthInclAmp-->0.63607<!--/v--> × √m_E, pinned by the IAU 2006 obliquity rate), so the Fibonacci formula (ψ/(d×√m)) returns it identically.
All other planets match exactly. (The mean-vs-instantaneous distinction for Earth is discussed under "Earth's amplitude" below.)

### Inclination Balance Result

| Check                          | Result       |
|--------------------------------|-------------|
| Law 3 vector balance (mean ecc) | 99.9974%   |
| Law 3 vector balance (J2000 ecc) | 99.9974% |

The inclination balance is not a tuned result — it is a consequence of the
Fibonacci d-values, phase assignments, and PSI formula. The tiny residual
comes from the 1-e² terms in the angular momentum computation (which differ
per planet) and Earth's slightly adjusted amplitude.

---

## 8. Complete 6-Parameter Overview

For each planet, six parameters fully describe the orbital dynamics:

| # | Parameter            | Formula / Source                                | Physical meaning |
|---|----------------------|-------------------------------------------------|------------------|
| 1 | Mean tilt            | Axial obliquity (constant)                      | Base axial tilt  |
| 2 | Amplitude tilt       | = Amplitude inclination = PSI / (d * sqrt(m))   | Obliquity oscillation (Step 3) |
| 3 | Mean eccentricity    | Fixed perihelion distance, phase-derived Law 5   | Base perihelion distance (Step 1) |
| 4 | Amplitude ecc        | K * sin(tilt) * sqrt(d) / (sqrt(m) * a^1.5)     | Tilt+inclination combined effect (Step 5) |
| 5 | Mean inclination     | Invariable plane mean (from Fibonacci balance)   | Orbital plane orientation |
| 6 | Amplitude inclination| = Amplitude tilt = PSI / (d * sqrt(m))           | Inclination oscillation (Step 4) |

### Full Table

| Planet  | 1. Tilt    | 2. Amp Tilt | 3. Mean Ecc  | 4. Amp Ecc    | 5. Mean Incl | 6. Amp Incl |
|---------|------------|-------------|---------------|---------------|--------------|-------------|
| Mercury |   <!--v:mercuryAxialTiltJ2000-->0.03<!--/v-->     | <!--v:mercuryInclAmp-->0.386501<!--/v-->    | <!--v:mercuryEccBase-->0.20563<!--/v-->    | <!--v:mercuryEccAmp-->2.337e-5<!--/v-->      |  <!--v:mercuryInclMean-->6.703228<!--/v-->    | <!--v:mercuryInclAmp-->0.386501<!--/v-->    |
| Venus   |   <!--v:venusAxialTiltJ2000-->2.6392<!--/v-->   | <!--v:venusInclAmp-->0.062168<!--/v-->    | <!--v:venusEccBase-->0.00771<!--/v-->    | <!--v:venusEccAmp-->9.524e-4<!--/v-->      |  <!--v:venusInclMean-->2.151359<!--/v-->    | <!--v:venusInclAmp-->0.062168<!--/v-->    |
| Earth   |  <!--v:meanObliquity-->23.41353<!--/v--> | <!--v:earthInclAmp-->0.63607<!--/v--> | <!--v:earthEccBase-->0.01539<!--/v-->    | <!--v:eccentricityAmplitude-->0.001356<!--/v-->      |  <!--v:earthInclMean-->1.48113<!--/v--> | <!--v:earthInclAmp-->0.63607<!--/v--> |
| Mars    |  <!--v:marsAxialTiltJ2000-->25.19<!--/v-->     | <!--v:marsInclAmp-->1.164287<!--/v-->    | <!--v:marsEccBase-->0.09165<!--/v-->    | <!--v:marsEccAmp-->3.056e-3<!--/v-->      |  <!--v:marsInclMean-->1.833263<!--/v-->    | <!--v:marsInclAmp-->1.164287<!--/v-->    |
| Jupiter |   <!--v:jupiterAxialTiltJ2000-->3.13<!--/v-->     | <!--v:jupiterInclAmp-->0.021405<!--/v-->    | <!--v:jupiterEccBase-->0.04839<!--/v-->    | <!--v:jupiterEccAmp-->1.134e-6<!--/v-->      |  <!--v:jupiterInclMean-->0.321086<!--/v-->    | <!--v:jupiterInclAmp-->0.021405<!--/v-->    |
| Saturn  |  <!--v:saturnAxialTiltJ2000-->26.73<!--/v-->     | <!--v:saturnInclAmp-->0.065196<!--/v-->    | <!--v:saturnEccBase-->0.05387<!--/v-->    | <!--v:saturnEccAmp-->5.359e-6<!--/v-->      |  <!--v:saturnInclMean-->0.984969<!--/v-->    | <!--v:saturnInclAmp-->0.065196<!--/v-->    |
| Uranus  |  <!--v:uranusAxialTiltJ2000-->82.23<!--/v-->     | <!--v:uranusInclAmp-->0.023832<!--/v-->    | <!--v:uranusEccBase-->0.04724<!--/v-->    | <!--v:uranusEccAmp-->2.802e-5<!--/v-->      |  <!--v:uranusInclMean-->1.015183<!--/v-->    | <!--v:uranusInclAmp-->0.023832<!--/v-->    |
| Neptune |  <!--v:neptuneAxialTiltJ2000-->28.32<!--/v-->     | <!--v:neptuneInclAmp-->0.013552<!--/v-->    | <!--v:neptuneEccBase-->0.00860<!--/v-->    | <!--v:neptuneEccAmp-->8.037e-6<!--/v-->      |  <!--v:neptuneInclMean-->0.743803<!--/v-->    | <!--v:neptuneInclAmp-->0.013552<!--/v-->    |

Note: Columns 2 and 6 are identical — the amplitude of axial tilt oscillation IS the
amplitude of inclination oscillation, both derived from PSI / (d * sqrt(m)).

**Earth's amplitude: mean vs instantaneous (historical derivation).**
An earlier full-H-cycle averaging analysis estimated a mean amplitude of
0.632469° against the IAU-rate-constrained **instantaneous amplitude** of
0.636055° (a 0.57% difference, 12.9 arcsec). In the shipped model this
distinction is retired: ψ is *defined from* the IAU-pinned amplitude
(<!--v:earthInclAmp-->0.63607<!--/v-->°), and the IAU obliquity rate at J2000
(<!--v:obliquityRateArcsecPerCy-->-46.836769<!--/v-->"/cy) is the single constraint.
The paragraphs below record the original phase analysis.

This is not an exception but a predictable phase effect. The instantaneous
amplitude depends on where J2000 falls in the H/3 and H/8 cycles:

```
A(J2000) = IAU_rate / [360000 × (2π·sin(φ₃)/(H/3) − 2π·sin(φ₈)/(H/8))]
```

where φ₃ = 2π × (J2000 − balancedYear) / (H/3) and
      φ₈ = 2π × (J2000 − balancedYear) / (H/8).

At J2000, the phases are φ₃ = 261.2° and φ₈ = 96.5°, both near their
maximum rate positions (sin ≈ ±1), making the instantaneous amplitude
slightly larger than the mean. At other epochs the instantaneous amplitude
varies, but averages to the ψ-predicted value over the full cycle.

---

## 9. Perihelion Precession Periods

Each planet's perihelion **direction** (the angle of closest approach) precesses
at its own rate. The perihelion **distance** (base eccentricity) is static —
only the angle moves.

Note: these periods describe the rotation of the perihelion direction around the
orbit. The eccentricity **magnitude** oscillation is a separate phenomenon that
occurs at each planet's eccentricity cycle (see Section 10).

| Planet  | Period (years)      | Fibonacci Expression | Direction  |
|---------|---------------------|----------------------|------------|
| Mercury | <!--v:mercuryPeriPeriod-->243,867<!--/v-->             | H / (1 + 3/8)       | Prograde   |
| Venus   | -<!--v:venusPeriPeriod-->447,089<!--/v--> | -8H / 6              | Retrograde |
| Earth   |  <!--v:earthPeriPeriod-->20,957<!--/v--> | H / 16               | Prograde   |
| Mars    |  <!--v:marsPeriPeriod-->74,515<!--/v-->             | H × 8/36             | Prograde   |
| Jupiter |  <!--v:jupiterPeriPeriod-->68,783<!--/v-->             | 8H / 39              | Prograde   |
| Saturn  | <!--v:jupiterIcrfPeriod-->-41,270<!--/v-->             | -8H / 65             | Retrograde |
| Uranus  | <!--v:earthPeriPeriodICRF-->111,772<!--/v-->             | H / 3                | Prograde   |
| Neptune | <!--v:twoH-->670,634<!--/v-->             | H * 2                | Prograde   |

---

## 10. Predictive Eccentricity Formula

Each planet's eccentricity oscillates around its base value at its own wobble
period (the meeting frequency of axial precession and perihelion ICRF precession):

    e₀ = √(e_base² + e_amp²)           (derived mean)
    θ  = 360° × (t − t_ref) / T_wobble (phase angle)
    e(t) = e₀ + (−e_amp − (e₀ − e_base) × cos θ) × cos θ

At θ = 0°: e = e_base − e_amp (minimum). At θ = 180°: e = e_base + e_amp (maximum).
At θ = 90°/270°: e ≈ e_base (near mean). This is a second-order cosine that is
slightly asymmetric around the base value due to the geometric derivation.

Parameters:
- `e_base` = fixed perihelion-distance eccentricity (Section 6)
- `e_amp` = K × sin(tilt) × √d / (√m × a^(3/2)) (Section 4)
- `T_ecc` = per-planet eccentricity cycle from `calcWobblePeriod()` (see doc 37)
- `t_ref` = 2000 − (φ_J2000 / 360) × T_ecc — reference year anchored to J2000 phase

In code: `computeEccentricityEarth(t, t_ref, T_ecc, e_base, e_amp)` in `src/script.js`.

### Oscillation Period: Per-Planet Eccentricity Cycle

Each planet oscillates at its own eccentricity cycle — the meeting frequency of its
axial precession and perihelion ICRF precession. The eccentricity cycle is computed
by `calcWobblePeriod(perihelionEclipticYears, axialPrecessionYears)` in
`src/script.js`. For Earth, this gives H/16 = <!--v:earthPeriPeriod-->20,957<!--/v--> years. Other planets have
different eccentricity cycles (see `docs/37-planets-precession-cycles.md` for the
full derivation and values).

### Phase Angles

Since each planet oscillates at its own eccentricity cycle, the mirror-pair 180°
offset rule no longer applies. The inner planet phases (Mercury, Venus, Mars)
are derived analytically from JPL J2000 eccentricity data using the per-planet
eccentricity cycle. The outer planet phases (Jupiter, Saturn, Uranus, Neptune) have
negligible eccentricity amplitudes (< 0.01% of base), so their phase angles
have minimal effect on the dynamic balance.

Phase angles are stored as `<planet>EccentricityPhaseJ2000` in `src/script.js`.

### Earth Phase: ω + 90°

Earth's eccentricity phase relates to its longitude of perihelion:

    φ_Earth = ω + 90° = 102.947° + <!--v:periLongModel1246AD-->90.000<!--/v-->° ≈ <!--v:earthEccPhaseJ2000-->192.95<!--/v-->°

This anchors Earth's phase to an observable orbital parameter. The exact
analytical solution gives 193.0129° ≈ ω + 90.07° (0.002% match).

### Inner Planets: Tilt-Driven Regime

The phase is derived from the **System Reset anchor (n=7, -<!--v:systemResetYearBC-->2,649,854 BC<!--/v-->)** with a balance-group offset: `phase = phaseOffset + (2000 - systemReset) / wobblePeriod × 360°`, where `phaseOffset = 90°` for in-phase planets and `270°` for Saturn (anti-phase). At the anchor, every planet passes through its mean eccentricity — in-phase rising, Saturn falling — mirroring the inclination alignment. The base eccentricity follows from the law of cosines with the J2000 eccentricity and K-derived amplitude. All values are computed at runtime by constants.js.

The predictive formula works for these planets because the tilt mechanism is
the dominant source of eccentricity variation over each planet's eccentricity cycle.

### Outer Planets: Tilt Now Sufficient

With the phase-derived base recalibration, the J2000−base differences for the outer planets are small enough that the tilt-derived amplitude alone fits within the cos(φ) ∈ [−1, +1] range:

| Planet  | e_J2000 − e_base | e_amplitude | cos(φ)  | In valid range? |
|---------|------------------|-------------|---------|-----------------|
| Jupiter | −5.82e-8         | 1.134e-6    |  −0.05  | ✓               |
| Saturn  | −4.28e-6         | 5.360e-6    |  −0.80  | ✓               |
| Uranus  | +1.43e-5         | 2.802e-5    |  +0.51  | ✓               |
| Neptune | −6.31e-6         | 8.039e-6    |  −0.79  | ✓               |

This is a notable change from earlier model versions, where the J2000−base differences were one to two orders of magnitude *larger* than the tilt amplitudes (e.g., Jupiter previously +1.71×10⁻⁴ vs amp 1.138×10⁻⁶, a factor of 150) and a Laplace-Lagrange secular-exchange explanation was required to bridge the gap.

The kinematic mismatch that previously ruled out the tilt mechanism for the giants has now been eliminated by the recalibration. Whether tilt is the *physical* driver of outer-planet eccentricity offsets at J2000, or merely numerically compatible with them while Laplace-Lagrange dynamics do the underlying work, is a separate physics question. What we can say firmly is that the tilt-derived amplitudes (~10⁻⁶ to 10⁻⁵) are no longer too small to account for the residuals.

The outer planet phases are set to the value that places the dynamic eccentricity closest to the JPL J2000 observed value: 180° when J2000 > base (maximum eccentricity) and 0° when J2000 < base
(minimum eccentricity). This maximizes the dynamic eccentricity balance at
J2000 (99.8753%) while the amplitude remains negligible.

### Phase Constants (J2000)

Eccentricity phases are now derived at runtime from the balanced-year phase: `phase = (2000 - balancedYear) / wobblePeriod × 360°`. See constants.js and script.js section E2d.

### Other Constants

| Symbol | Value | Source |
|--------|-------|--------|
| K | 3.4143332013e-6 | `eccentricityAmplitudeK` in constants.js |
| T_wobble (Earth) | <!--v:earthPeriPeriod-->20,957<!--/v--> years | `perihelionCycleLength` in script.js |
| T_wobble (per planet) | Varies | `calcWobblePeriod()` in script.js, see doc 37 |
| e_amplitude per planet | See Section 5 table | `orbitalEccentricityAmplitude` in constants.js |
| axial tilt per planet | See Section 8 table | `axialTiltJ2000` in constants.js |

---

## 11. Balance Summary

| Balance Check                    | Result              |
|----------------------------------|---------------------|
| Law 5 base eccentricities        | 99.8636%            |
| Law 5 J2000 eccentricities       | 99.8753%            |
| Law 3 inclination balance         | 99.9974%            |

The Law 5 eccentricity balance reaches 99.8636% with phase-derived base eccentricities (`tools/verify/eccentricity-balance.js`).
The dual-balance optimizer finds outer-planet base eccentricities that honour Law 3 and Law 5 simultaneously to the precision above.

### Why the Balance Holds at All Epochs

The balance is maintained at every epoch because of the mechanism described in
Section 5: the base perihelion distances are fixed and perfectly balanced. The
eccentricity fluctuation from the tilt/inclination interaction changes each
planet's real eccentricity slightly, but the Law 5 weight change is
delta_v = K * sin(tilt) — mass and distance cancel. Since the dominant planets
(99.8% of weight) have tiny tilts or tiny amplitudes relative to their mean
eccentricity, the balance barely shifts.

In summary: the mean perihelion distances produce ~99.9% eccentricity balance,
and the tilt-driven fluctuations preserve that balance at every epoch because
their effect on Law 5 weights is negligible for the dominant planets.

---

## 12. Code References

| Constant / Section                    | File                        | Anchor      |
|---------------------------------------|-----------------------------|-------------|
| eccentricityBase (Earth mean)         | src/script.js               | search `eccentricityBase` |
| eccentricityAmplitude (Earth)         | src/script.js               | search `eccentricityAmplitude` |
| Planet eccentricities (phase-derived) | src/script.js               | constants block |
| Inclination mean/amplitude            | src/script.js               | constants block |
| BALANCE_CONFIG                        | src/script.js               | search `BALANCE_CONFIG` |
| Law 5 formula                         | src/script.js               | search `Law 5` |
| Law 3 formula                         | src/script.js               | search `Law 3` |
| PSI constant                          | tools/lib/constants.js      | search `PSI` |
| Mass fractions                        | tools/lib/constants.js      | search `massFraction` |
| eccentricityAmplitudeK (K)           | tools/lib/constants.js      | search `eccentricityAmplitudeK` |
| orbitalEccentricityAmplitude (per planet) | tools/lib/constants.js  |             |
| axialTiltJ2000 (per planet)           | tools/lib/constants.js      |             |
| Balance search script                 | tools/verify/balance-search.js |          |
| Eccentricity balance script           | tools/verify/eccentricity-balance.js |    |
| Derive K + planet amplitudes/phases  | tools/fit/derive-eccentricity-amplitudes.js | Pipeline Step 7a |
| JPL eccentricity cosine fit          | tools/fit/python/planet_eccentricity_jpl.py | |
| JPL eccentricity cache               | data/planet_eccentricity_cache.json | |

---

## 13. Verification Scripts

Run `node tools/verify/eccentricity-balance.js` to verify Law 5 balance with current
phase-derived eccentricities.

Run `node tools/verify/balance-search.js` to perform exhaustive balance search across
all Fibonacci d-value combinations.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [10 - Fibonacci Laws](10-fibonacci-laws.md) | The six Fibonacci Laws (Law 2 ψ, Law 3 inclination balance, Law 4 K, Law 5 eccentricity balance, Law 6 gas-giant lock) |
| [20 - Constants Reference](20-constants-reference.md) | H, PSI, K, base eccentricities, axial tilts, d-values |
| [25 - Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) | SYSTEM vs ALONE mass convention used in PSI calibration |
| [37 - Planetary Precession Cycles](37-planets-precession-cycles.md) | Per-planet eccentricity cycle derivations referenced in §10 |
| [55 - Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) | Complete 8H/N period table; balanced-year structure (n=7 anchor) |
| [72 - The Closed Loop](72-the-closed-loop.md) | Full derivation chain for phase-derived base eccentricities |
| [99 - Expanding Solar System Resonance Theory](99-expanding-solar-system-resonance-theory.md) | Deep-time scaling of H(t) — balance laws hold at any epoch |
