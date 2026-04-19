# 80 — Mercury: Scene Graph Setup

This document explains **why** each value in Mercury's 5-layer scene graph hierarchy is set the way it is. It serves as a companion to the [Planet Inspector](51-planet-inspector-reference.md) and the [Scene Graph Hierarchy](41-scene-graph-hierarchy.md).

## Mercury at a glance

| Quantity | Value | Source |
|----------|-------|--------|
| Semi-major axis | 0.38711 AU | Kepler's 3rd law from H × 8/11 period |
| Eccentricity (J2000) | 0.20564 | JPL J2000 |
| Base eccentricity | 0.20563 | Phase-derived (≈ J2000, amp negligible) |
| Eccentricity amplitude | 2.34×10⁻⁵ | K formula × sin(0.0084°) — tiny |
| Inclination (J2000, inv. plane) | 6.3473° | JPL J2000 |
| Mean inclination | 6.7032° | Derived from PSI / (d × √m) |
| Inclination amplitude | 0.3865° | PSI / (d × √m), d = 21 |
| Mean obliquity | 0.0084° | Two-cosine formula at System Reset anchor |
| **Ecliptic perihelion** | **243,867 yr** | **H × 8/11 (Fibonacci Law 1)** |
| **Axial precession** | **−298,060 yr** | **−8H/9 (Cassini state, MESSENGER)** |
| **Obliquity cycle** | **894,179 yr** | **8H/3 (Fibonacci 11 = 3 + 8)** |
| **Eccentricity cycle** | **31,935 yr** | **2H/21 (beat: \|9 − 93\|/8H)** |
| **Inclination cycle (= ICRF peri)** | **28,844 yr** | **8H/93 (drives the inclination oscillation)** |
| Orbit center (scene) | (−6.4682, −1.3244, 0) | Derived from base × direction |
| Inclination phase at J2000 | 22.94° (just past MIN, heading to MAX; next MIN ≈ 3838 AD) | Current angle in inclination cycle (intuitive convention) |
| Eccentricity phase at J2000 | 104.12° (past mean rising, heading to MAX) | Current angle in eccentricity cycle (intuitive convention) |
| Spin axis tilt | −0.03° | JPL J2000 (nearly zero) |

**Two distinct phases — two different oscillations**

Both phases are computed in the ICRF frame and describe **where Mercury currently is** in each cycle (not where the cycle starts). We use the **intuitive convention** for both: **0° = MIN, 180° = MAX**.

| | Inclination | Eccentricity |
|---|---|---|
| **Cycle period** | 28,844 yr (8H/93 = ICRF perihelion) | 31,935 yr (2H/21 = beat freq) |
| **Phase 0°** | MIN inclination (6.3167°) | MIN eccentricity (base − amp) |
| **Phase 90°** | mean, rising | mean, rising (System Reset for in-phase) |
| **Phase 180°** | MAX inclination (7.0897°) | MAX eccentricity (base + amp) |
| **Phase 270°** | mean, falling | mean, falling (System Reset for Saturn) |
| **Current phase at J2000** | **22.94°** (just past MIN) | **104.12°** (past mean rising, heading to MAX) |
| **Current value at J2000** | 6.3473° (≈ MIN, only 0.031° above) | 0.20564 (essentially constant) |

**How to read Mercury's inclination phase (22.94°)**:
- At J2000, Mercury is **22.94° past MIN**, climbing toward MAX
- 22.94° / 360° × 28,844 yr = **1,838 years past MIN**
- Mercury reached its minimum inclination around year **162 AD**
- Will reach the next MAX inclination around year **16,261 AD** (90° away in cycle)
- Will reach the next MIN inclination around year **28,838 AD** (full cycle later)

**How to read Mercury's eccentricity phase (104.12°)**:
- 90° = "mean rising" alignment at the System Reset (where all in-phase planets pass through mean simultaneously)
- 104.12° = 14.12° past that alignment, still heading toward MAX (180°)
- Time since System Reset alignment: 14.12° / 360° × 31,935 yr = ~1,253 years
- But because Mercury's amplitude is so tiny (2×10⁻⁵), the actual eccentricity hardly moves throughout the entire cycle.

### Note on the model parameter `inclinationCycleAnchor`

The model stores `inclinationCycleAnchor = 234.52°` for Mercury. This is **not** the user-facing phase value above — it's the ICRF perihelion longitude at which Mercury reaches its inclination MAX, used as the anchor for the formula `i(t) = mean + amp × cos(ω̃_ICRF(t) − 234.52°)`. In formula coordinates, MAX occurs when cos = +1 (ω̃_ICRF = 234.52°) and MIN when cos = −1 (ω̃_ICRF = 234.52° + 180°).

The user-facing **22.94°** is derived as: `((ω̃_ICRF(J2000) − 234.52°) − 180° + 360°) mod 360°`. The −180° shift converts from the cycle anchor (MAX at 0°) to the intuitive convention (MIN at 0°).

## The 5-Layer Hierarchy

Mercury's position in the simulation is computed by nesting five scene-graph containers. Each layer adds one physical effect. When the simulation runs, the combined rotation of all layers produces Mercury's apparent motion as seen from Earth's geocentric reference frame.

```
barycenterEarthAndSun (the Sun)
  └── mercuryPerihelionDurationEcliptic1    STEP 1: Forward ecliptic precession
        └── mercuryPerihelionFromEarth      STEP 2: Annual orbit of the perihelion point
              └── mercuryPerihelionDurationEcliptic2    STEP 3: Reverse ecliptic precession
                    ├── mercuryRealPerihelionAtSun      STEP 4: Elliptical orbit + orbital plane tilt
                    │     └── mercury                   STEP 5: The planet itself (annual orbit)
                    └── mercuryFixedPerihelionAtSun     (fixed reference — no orbit radius)
```

**Why two ecliptic layers (Steps 1 + 3)?** The ecliptic perihelion precesses slowly over hundreds of thousands of years. But the annual orbit (Step 2) must happen in a non-precessing frame — otherwise the orbit center would drift during each year. The solution: Step 1 adds the precession, Step 2 does the annual orbit in the precessing frame, Step 3 subtracts the precession. The net effect on the planet's position is zero precession from Steps 1+3 combined, but the perihelion point (Step 2) correctly precesses. This is a standard "sandwich" technique in scene-graph animation.

---

## Step 1: mercuryPerihelionDurationEcliptic1

**Purpose**: Rotate the entire sub-tree at Mercury's ecliptic perihelion precession rate.

| Property | Value | How it's derived |
|----------|-------|-----------------|
| speed | `+2π / perihelionEclipticYears` = +2π / 243,867 rad/yr | From `planets.mercury.perihelionEclipticYears` (= H × 8/11, a Fibonacci ratio). Positive = prograde. |
| startPos | 0° | No initial offset — the precession starts from the reference orientation. |
| orbitRadius | 0 | Pure rotation, no translation. |
| orbitCenter | (0, 0, 0) | No offset — rotation around the parent's origin (the Sun). |
| tilt | 0° | No tilt — precession is in the ecliptic plane. |

**Why this value?** Mercury's ecliptic perihelion period is H × 8/11 ≈ 243,867 years. This comes from the [Fibonacci cycle hierarchy](10-fibonacci-laws.md) (Law 1): Mercury's period ratio 8/11 is the ratio of two Fibonacci-adjacent numbers minus one step. The ecliptic rate is the observable precession in the simulation's reference frame.

---

## Step 2: mercuryPerihelionFromEarth (PERIHELION MERCURY)

**Purpose**: Place the "perihelion point" at the correct position relative to the Sun, orbiting once per year. This is the point around which Mercury orbits — it represents where Mercury's perihelion is located in the geocentric frame.

| Property | Value | How it's derived |
|----------|-------|-----------------|
| speed | 2π rad/yr (= 1 year period) | Orbits once per year — tracks the Sun's apparent annual motion in the geocentric frame. |
| startPos | 0° | The initial angle within the annual cycle. |
| orbitRadius | 0 | Not on a circular orbit — positioned via orbitCenter offset. |
| **orbitCenter** | **(−6.4682, −1.3244, 0)** | **See derivation below** |
| tilt | 0° | In the ecliptic plane. |

### Why orbitCenter = (−6.4682, −1.3244, 0)

The orbit center places Mercury's perihelion point at the correct distance and direction from the Sun. It encodes two things:

1. **The distance** = `mercuryPerihelionDistance` = `orbitDistance × realEccentricity × 100`
   - `orbitDistance` = 0.38711 AU (from Kepler's 3rd law: `(H / solarYearCount)^(2/3)`)
   - `realEccentricity` = `e_base / (1 + e_base)` = 0.20563 / 1.20563 = 0.17056. Here `e_base` is `orbitalEccentricityBase` (0.20563) — the model's phase-derived **base** eccentricity (the midpoint of the eccentricity oscillation cycle), essentially equal to the J2000 snapshot (0.20564) because Mercury's amplitude is tiny. The formula converts the orbital eccentricity to the geometric focus offset as a fraction of the semi-major axis.
   - `× 100` = scene-graph scale factor (1 AU = 100 scene units)
   - Result: **6.6024 scene units**

2. **The direction** = `longitudePerihelion + angleCorrection` = 77.457° + 0.972° = **78.429°**
   - `longitudePerihelion` = 77.457° (JPL J2000 ecliptic longitude of Mercury's perihelion)
   - `angleCorrection` = 0.972° (fitted offset so the model's perihelion RA matches JPL at J2000; see [optimization](61-optimization-execution-plan.md))
   - The two components of orbitCenter are the X and Y projections:
     - `orbitCentera` = cos(angle + 90°) × distance = cos(168.43°) × 6.6024 = **−6.4682**
     - `orbitCenterb` = cos(90° − (angle − 90°)) × distance = sin(168.43°) × 6.6024 = **−1.3244**
   - (The `+90°` and the `90−(x−90)` formulas are the simulation's convention for converting ecliptic longitude to scene-graph X/Y coordinates.)

**In plain terms**: the perihelion point is placed 6.60 scene units from the Sun, in the direction 78.4° ecliptic longitude. This matches Mercury's observed perihelion direction at J2000.

### How orbitalEccentricityBase (0.20563) is derived

The base eccentricity is **not** an input — it's derived at runtime from the closed-loop chain PSI → K → eccentricity amplitude → phase → base. Here is the full derivation for Mercury:

**Step A: Semi-major axis** (from Kepler's 3rd law)
```
a = (solarYearInput / meanSolarYearDays)^(2/3)
  = (87.9683 / 365.2422)^(2/3)
  = 0.38711 AU
```

**Step B: Mean obliquity** (axial tilt adjusted for oscillation offset relative to the System Reset anchor)
```
obliquityMean = axialTiltJ2000 + amp×cos(ICRF phase) − amp×cos(obliq phase)
             = 0.03° + oscillation offset
             ≈ 0.0084°
```
Mercury's mean obliquity is nearly zero under the System Reset anchor — very close to the J2000 snapshot (0.03°) because Mercury's amplitude is tiny.

**Step C: Eccentricity amplitude from K** (the universal eccentricity amplitude constant)
```
e_amp = K × sin(|obliquityMean|) × √d / (√m × a^1.5)

Inputs:
  K               = 3.4149×10⁻⁶          (derived from Earth)
  sin(0.0084°)    = 1.466×10⁻⁴           (tilt → tiny)
  √d = √21        = 4.583                 (Mercury's Fibonacci divisor)
  √m              = 4.074×10⁻⁴            (mass fraction √(1.66×10⁻⁷))
  a^1.5           = 0.2408                 (= 0.38711^1.5)

  numerator       = 3.4149×10⁻⁶ × 1.466×10⁻⁴ × 4.583 = 2.295×10⁻⁹
  denominator     = 4.074×10⁻⁴ × 0.2408              = 9.81×10⁻⁵
  e_amp           = 2.295×10⁻⁹ / 9.81×10⁻⁵           ≈ 2.34×10⁻⁵
```
Mercury has an extremely tiny eccentricity amplitude (~0.01% of base) because its mean obliquity is nearly zero — the `sin(tilt)` factor in the K formula makes the amplitude proportional to the tilt. As a consequence, Mercury's eccentricity is essentially constant at the J2000 value over the entire 31,935-year cycle (variation ≤ 0.01%).

**Step D: Phase at J2000** (where in the eccentricity cycle Mercury is right now)

The eccentricity anchor is the **System Reset** (n=7, -2,649,854 BC), when all planets simultaneously reach inclination extremes. At the anchor, in-phase planets are at eccentricity MEAN + rising (phase 90°); Saturn (anti-phase) is at MEAN + falling (phase 270°).

```
anchor = balancedYear − 7H = −2,649,854 (System Reset)
t₂₀₀₀ = 2000 − anchor = 2,651,854 years
wobblePeriod = 31,935 years  (Mercury's eccentricity cycle = 2H/21)
phaseOffset = 90°  (Mercury is in-phase)
θ = 90° + (t₂₀₀₀ / wobblePeriod) × 360° = 90° + 14.12° = 104.12°
cos(θ) = −0.2440
sin(θ) = +0.9698
```


**Step E: Base eccentricity from law of cosines**

The eccentricity oscillation follows `e(t) = √(base² + amp² − 2·base·amp·cos(θ))`. At J2000 we know `e(t₀) = e_J2000 = 0.20564`. Rearranging:

```
e_J2000² = base² + amp² − 2·base·amp·cos(θ)
```

Solving for `base` (choosing the positive root):
```
discriminant = e_J2000² − amp²·sin²(θ) ≈ 0.04229
base = amp·cos(θ) + √discriminant
     ≈ 2.34×10⁻⁵ × (−0.2440) + √0.04229
     ≈ −5.7×10⁻⁶ + 0.20564
     ≈ 0.20563
```

This is the **arithmetic midpoint** of Mercury's eccentricity oscillation — the value it oscillates around over its 31,935-year cycle (2H/21). Because Mercury's amplitude is extremely small (~2×10⁻⁵), the base is essentially equal to the J2000 value.

---

## Step 3: mercuryPerihelionDurationEcliptic2

**Purpose**: Undo the ecliptic precession from Step 1, so that the planet's annual orbit (Step 4) happens in a non-precessing frame.

| Property | Value | How it's derived |
|----------|-------|-----------------|
| speed | `−2π / perihelionEclipticYears` = −2π / 243,867 rad/yr | Exact negative of Step 1. |
| startPos | 0° | Matches Step 1. |
| orbitRadius | 0 | Pure rotation. |
| orbitCenter | (0, 0, 0) | No offset. |

**Why?** Steps 1 and 3 cancel each other out for the planet's position. But the perihelion point (Step 2) sits between them, so it inherits only Step 1's precession — which is the correct ecliptic perihelion drift. This "precession sandwich" is the standard technique; see [architecture](40-architecture.md) for the general pattern.

---

## Step 4: mercuryRealPerihelionAtSun

**Purpose**: Define Mercury's elliptical orbit around the Sun, including the orbital plane tilt.

| Property | Value | How it's derived |
|----------|-------|-----------------|
| speed | −2π rad/yr | Orbits once per year (negative = opposite handedness to Step 2, creating the retrograde apparent motion). |
| startPos | 131.670° | = `180° − ascendingNode` = 180° − 48.330°. Places the starting position at the descending node. |
| **orbitRadius** | **3.3012** | = `mercuryElipticOrbit` = `mercuryPerihelionDistance / 2` = 6.6024 / 2. The semi-minor axis of the projected ellipse (half the perihelion distance). |
| orbitCenter | (100, 0, 0) | Places the orbit center at 100 scene units along the X-axis (= 1 AU = the Sun's distance from Earth in the geocentric frame). |
| **orbitTilta** | computed | = `cos(−90° − ascNode) × −eclipticInclination` = cos(−138.33°) × −7.005° |
| **orbitTiltb** | computed | = `sin(−90° − ascNode) × −eclipticInclination` = sin(−138.33°) × −7.005° |

### Why these tilt values?

The `orbitTilta` and `orbitTiltb` values tilt Mercury's orbital plane relative to the ecliptic:

- **eclipticInclinationJ2000** = 7.005° — Mercury's orbital plane is tilted 7° from the ecliptic (the most tilted of all major planets)
- **ascendingNode** = 48.330° — the direction where Mercury's orbit crosses the ecliptic going north
- The `−90° − ascNode` formula converts the ascending node longitude into the scene graph's tilt axis convention (perpendicular to the node line)
- The two components (cos and sin) decompose the tilt into X and Y axes

### Why startPos = 180° − ascendingNode?

The planet's starting position within its orbit is measured from the ascending node. `180° − ascNode` places Mercury at its **descending node** at the model start date (June 21, 2000). This is the convention: the ascending node defines the reference direction, and the startPos rotates from there.

---

## Step 5: mercury (the planet)

**Purpose**: Mercury itself — the visible planet orbiting within the frame established by Steps 1–4.

| Property | Value | How it's derived |
|----------|-------|-----------------|
| speed | 2π / (H / solarYearCount) rad/yr | = 2π / 0.2409 = 26.088 rad/yr. Mercury completes 4.15 orbits per Earth year. |
| startPos | 83.652° | = `planets.mercury.startpos` — fitted so Mercury's RA at J2000 matches JPL Horizons. |
| tilt | −0.03° | = `−axialTiltJ2000`. Mercury's spin axis tilt (nearly zero). |
| orbitRadius | 38.711 scene units | = `orbitDistance × 100` = 0.38711 AU × 100. |
| orbitCenter | (100 + eccentricityOffset, 0, 0) | The Sun is at (100, 0, 0); the eccentricityOffset = `mercuryPerihelionDistance` ≈ 6.60 from Step 2. This offsets the orbit center from the Sun by `a × e_real`, creating the elliptical shape (Sun at the focus, not the geometric center). |

### Why startPos = 83.652°?

This is the only fitted value per planet (besides angleCorrection). It's optimised by `tools/optimize.js` so that Mercury's computed Right Ascension at J2000 (January 1, 2000) matches JPL Horizons to < 0.01°. The optimizer sweeps startPos until the scene-graph output aligns with the JPL reference. See [Step 2 in the fitting pipeline](../tools/fit/README.md).

---

## Summary: What is derived vs what is observed

| Parameter | Source | Type |
|-----------|--------|------|
| `perihelionEclipticYears` (243,867 yr) | H × 8/11 (Fibonacci Law 1) | Model prediction |
| `longitudePerihelion` (77.457°) | JPL J2000 | Observed input |
| `angleCorrection` (0.972°) | Fitted to match JPL RA at J2000 | Calibration |
| `orbitalEccentricityBase` (0.20563) | Phase-derived from K + J2000 eccentricity | Model derived |
| `ascendingNode` (48.330°) | JPL J2000 | Observed input |
| `eclipticInclinationJ2000` (7.005°) | JPL J2000 | Observed input |
| `startpos` (83.652°) | Fitted to match JPL RA at J2000 | Calibration |
| `solarYearInput` (87.9683 days) | JPL orbital period | Observed input |

The orbit center (−6.4682, −1.3244) is **fully derived** — it follows from the observed perihelion direction and the model-derived eccentricity. No fitting is needed for the orbit center itself.

---

## Mercury's Precession Cycles: Cassini State Derivation

Mercury is in a **Cassini state** — confirmed by MESSENGER spacecraft observations (Margot et al. 2012). In a Cassini state, the spin axis co-precesses with the orbital node: the axial precession rate equals the ascending node regression rate. This single observational constraint, combined with the Fibonacci ecliptic perihelion rate, determines all three of Mercury's long-period cycles as **free predictions**.

### Given inputs

| Input | Value | Source |
|-------|-------|--------|
| Ecliptic perihelion | H × 8/11 = 243,867 yr | Fibonacci Law 1 (model) |
| Ascending node N | 9 cycles in 8H | Fitted to JPL ecliptic-inclination trend |
| Cassini state | axial rate = node rate | MESSENGER observation |

### Derived cycles (free predictions)

**1. Axial precession** (from Cassini state):

```
axial precession = ascending node regression = −8H/9 = −298,060 yr
```

This matches Peale (2006)'s theoretical estimate of ~300,000 yr to 0.7%.

**2. Obliquity cycle** (from Fibonacci decomposition of ecliptic rate):

The ecliptic perihelion rate numerator 11 decomposes as a Fibonacci sum: **11 = 3 + 8**. The obliquity rate is 3/(8H):

```
obliquity cycle = 8H/3 = 894,179 yr
```

This matches Bills (2005)'s theoretical estimate of ~895,000 yr to 0.1%.

**3. Eccentricity cycle** (beat of axial × ICRF perihelion):

Both axial (−9/(8H)) and ICRF perihelion (−93/(8H)) are retrograde, so:

```
ecc rate = |axial rate − ICRF rate| = |−9/(8H) − (−93/(8H))| = 84/(8H)
ecc cycle = 8H/84 = 2H/21 = 31,935 yr
```

Note: 21 is Fibonacci F₈, and 84 = 4 × 21.

### Summary

| Cycle | Period | 8H/N | Compare to | Error |
|-------|--------|------|------------|-------|
| Axial precession | −298,060 yr | 8H/9 | Peale 2006: ~300 kyr | 0.7% |
| Obliquity | 894,179 yr | 8H/3 | Bills 2005: ~895 kyr | 0.1% |
| Eccentricity | 31,935 yr | 8H/84 | ~32 kyr (secular models) | — |

All three literature values are **theoretical** (not directly observed), making them independent predictions from different models. The Holistic Universe Model derives them from the Cassini state + Fibonacci ecliptic rate + ascending node integer, with no fitting to these values.

---

## Related Documents

- [41 — Scene Graph Hierarchy](41-scene-graph-hierarchy.md) — Full tree structure
- [51 — Planet Inspector Reference](51-planet-inspector-reference.md) — Interactive visualization of these layers
- [61 — Optimization Execution Plan](61-optimization-execution-plan.md) — How startPos and angleCorrection are fitted
- [62 — Type I Inner Planets](62-type-i-inner-planets.md) — Mercury and Venus specific details
- [12 — Perihelion Precession](12-perihelion-precession.md) — Conceptual background on the precession sandwich
- [37 — Planetary Precession Cycles](37-planets-precession-cycles.md) — Full precession analysis for all planets
- [55 — Grand Holistic Octave Periods](55-grand-holistic-octave-periods.md) — 8H/N period table
