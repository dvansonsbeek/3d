# 72 — The Closed Loop

Every orbital oscillation in the model — inclination, eccentricity, and obliquity — derives from two empirical constants and a set of observed J2000 anchor values. Nothing is fitted per planet. The loop is fully closed.

## The Two Constants

Both constants are derived from Earth alone:

| Constant | Formula | Value | Controls |
|----------|---------|-------|----------|
| **PSI** (ψ) | d × inclAmp × √m | 3.307 × 10⁻³ | Inclination amplitudes |
| **K** | e_amp × √m × a^1.5 / (sin(tiltMean) × √d) | 3.415 × 10⁻⁶ | Eccentricity amplitudes |

Each planet receives a Fibonacci divisor **d** from the unique mirror-symmetric configuration:

| Mercury | Venus | Earth | Mars | Jupiter | Saturn | Uranus | Neptune |
|---------|-------|-------|------|---------|--------|--------|---------|
| 21 | 34 | 3 | 5 | 5 | 3 | 21 | 34 |

## The Derivation Chain

Starting from the observed J2000 values per planet and the two constants, everything follows:

```
OBSERVED (per planet)
  │  mass, orbital period, semi-major axis
  │  invPlaneInclinationJ2000
  │  orbitalEccentricityJ2000
  │  axialTiltJ2000
  │  longitudePerihelion
  │  orbitalEccentricityBase  (from dual-balance optimizer)
  │
  ├─── SYSTEM RESET ──► Inclination phase angle
  │       │                φ = ω̃_ICRF(t_SR)       (anti-phase)
  │       │                φ = ω̃_ICRF(t_SR) − 180° (in-phase)
  │       │
  ├─── PSI ──► Inclination amplitude = ψ / (d × √m)
  │               │
  │               ├──► Inclination mean = J2000 − amp × cos(ω̃ − φ)
  │               │
  │               └──► Obliquity mean = tiltJ2000 + amp×cos(ωᵢ) − amp×cos(ωₒ)
  │                       │
  └─── K ───────────────► Eccentricity amplitude = K × sin(obliquityMean) × √d / (√m × a^1.5)
                            │
                            └──► Eccentricity phase via law of cosines:
                                   cos(θ) = (base² + amp² − e_J2000²) / (2 × base × amp)
```

The inclination phase angles are not free parameters. They are the ICRF perihelion longitudes evaluated at the System Reset epoch — the unique year where all planets simultaneously reach their inclination extremes. In-phase planets are at minimum (perihelion 180° away), Saturn at maximum (perihelion aligned).

The loop closes because K uses the **model mean obliquity** — which itself depends on the inclination amplitude from PSI. Yet there is no circular dependency: PSI determines inclination amplitudes independently, those determine mean obliquity, and then K determines eccentricity amplitudes.

## What the Constants Predict

For each of the 8 planets, PSI and K together predict:

| Quantity | Formula | Derived from |
|----------|---------|--------------|
| Inclination phase angle | ω̃_ICRF at System Reset | longitudePerihelion + ICRF rate + System Reset |
| Inclination amplitude | ψ / (d × √m) | PSI + Fibonacci d + mass |
| Inclination mean | J2000 − amp × cos(ω̃ − φ) | amplitude + phase + invPlaneInclinationJ2000 |
| Mean obliquity | tiltJ2000 + oscillation offset | inclination amplitude + obliquity cycle |
| Eccentricity amplitude | K × sin(meanTilt) × √d / (√m × a^1.5) | K + mean obliquity + Fibonacci d + mass + distance |
| Eccentricity phase | law of cosines | amplitude + base + orbitalEccentricityJ2000 |

## The Five Cycles

Each planet has up to five distinct periodic motions. Their periods interlock:

### 1. Inclination cycle (ICRF perihelion precession)

The inclination on the invariable plane oscillates at the ICRF perihelion precession rate. This is the ecliptic perihelion rate corrected for the general precession of the ecliptic: 1/P_ICRF = 1/P_ecliptic − 13/H. The ecliptic perihelion period is set from observations (H/d ratios from Law 1).

The inclination amplitude equals the axial tilt amplitude — they are the same oscillation seen from two reference frames.

### 2. Axial precession cycle

The period for each planet's spin axis to precess around its orbit normal. For Earth: H/5. For other planets: set from observations where known, predicted from Fibonacci ratios (H × d-combinations) where not yet observed.

### 3. Obliquity cycle

The beat frequency of the inclination and axial cycles: 1/P_obliquity = |1/P_inclination − 1/P_axial|. Since inclination and axial tilt share the same amplitude (from PSI), the obliquity oscillation is their interference pattern. Confirmed for Mercury (0.2% vs observed), Earth (2%), and Mars (0.7%).

### 4. Eccentricity cycle (perihelion wobble)

The beat frequency of the axial precession and the ICRF inclination precession: 1/P_wobble = |1/P_axial − 1/P_ICRF|. This is the period over which the eccentricity oscillates around its base value with the K-derived amplitude. For Earth: |1/(H/5) − 1/(H/3)| = 16/H, giving the H/16 perihelion precession cycle.

### 5. Ascending node cycle (invariable plane)

The rate at which each planet's ascending node on the invariable plane regresses. These are set as integer divisors of the Grand Holistic Octave (8H): each planet has an integer number of ascending node cycles in 8H. This ensures the eigenmode decomposition of the vector balance achieves 100% at all times.

Not to be confused with the ascending node on the ecliptic, which is the commonly tabulated quantity. The invariable plane ascending node is the dynamically meaningful one for the balance laws.

## The Balance Laws

The Fibonacci divisors and balance groups produce two independent balance conditions:

- **Inclination balance** (Law 3): The angular-momentum-weighted inclination oscillations of seven in-phase planets balance against Saturn's anti-phase oscillation. Result: **100.0000%**.

- **Eccentricity balance** (Law 5): The same divisors and groups produce a balance on base eccentricities. Result: **99.9993%**. This predicts Saturn's eccentricity from the other seven planets to 0.001%.

Both balances use the same planet configuration — no separate tuning.

The base eccentricities (mean eccentricities around which each planet oscillates) are determined by the dual-balance optimizer: it finds the values closest to J2000 observed eccentricities that simultaneously satisfy both balance conditions. For Venus, Mars, and Jupiter the optimizer lands exactly on J2000. For Mercury it shifts slightly (-0.15%) to accommodate the tilt oscillation. For Saturn, Uranus, and Neptune it adjusts by <0.5% to close the balance. Only Earth's base eccentricity is independently fitted (by the Sun optimizer).

## System Reset

The System Reset epoch (≈ −2,649,854) is the year where all 7 non-Earth planets simultaneously reach their inclination extremes:

- In-phase planets (Mercury, Venus, Mars, Jupiter, Uranus, Neptune): all at **minimum** inclination
- Anti-phase planet (Saturn): at **maximum** inclination

The inclination phase angles are a direct consequence: each planet's phase angle equals its ICRF perihelion longitude at the System Reset (minus 180° for in-phase planets). This is not a coincidence — the System Reset defines the phase geometry. The phase angles are derived, not fitted.

The System Reset occurs once per Grand Holistic Octave (8H = 2,682,536 years). It is the moment when the inclination oscillation "resets" — all planets return to their extreme positions simultaneously, like the hands of a clock aligning at midnight.

## The Complete Picture

The model has 6 free parameters:

1. **H** — the Holistic Year (335,317 years) — 1 DOF
2. **Fibonacci divisors** — {3, 5, 8, 13, 21, 34} — 3 DOF (assumed, not derived)
3. **Mean obliquity** — Earth's mean axial tilt (23.4135°) — 1 DOF
4. **Inclination amplitude** — Earth's invariable-plane amplitude (0.6360°) — 1 DOF
5. **Planet configuration** — which d goes to which planet — 0 DOF (unique solution from exhaustive search)

From these free parameters, the model derives:

**From Law 1 (Fibonacci cycle hierarchy):**
- Ecliptic perihelion periods (H/d ratios, observed inputs)
- Axial precession periods (H × d-combinations, some predicted)

**From PSI and K (derived from Earth):**
- All 8 inclination amplitudes and means
- All 8 eccentricity amplitudes and phases
- All 8 mean obliquities
- All obliquity cycle periods (beat of inclination and axial)
- All eccentricity cycle periods (beat of axial and ICRF inclination)

**From the configuration:**
- Two independent balance conditions (inclination 100%, eccentricity 99.999%)
- The System Reset epoch and all inclination phase angles
- All ascending node cycles (integer divisors of 8H)

The J2000 observed values serve as anchors — the model does not predict them, but uses them as boundary conditions to solve for means and phases. The test is whether two constants (PSI and K) derived from Earth alone correctly predict the amplitudes for the other seven planets. They do.
