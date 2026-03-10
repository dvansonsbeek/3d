# Optimization Tool — Execution Plan

**Status**: Complete — all phases and execution steps done
**Date**: 2026-03-06 (infrastructure complete), 2026-03-09 (campaign complete)

**Companion document:** [60-optimization-tool-overview.md](60-optimization-tool-overview.md) — Architecture, constraints, reference data, parameter classification

---

## Execution Model

Phases are picked up one-by-one, sequentially. After completing each phase, we checkpoint:

1. **Add** missing information discovered during the phase
2. **Change** information that turned out to be different from what was assumed
3. **Update** subsequent phases if the checkpoint findings affect them

No phase is started until the previous phase's checkpoint is complete and this document is updated. This ensures the plan stays accurate and aligned with reality as understanding deepens.

---

## 7. Implementation Phases

### Phase 1: Deep Assessment of Current Model Completeness
**Output:** Assessment report documenting what the model can and cannot reproduce
**Effort:** Medium
**Risk:** None (read-only analysis)
**Prerequisite:** Should be done first to inform all subsequent phases

Before building any tool, perform a thorough analysis of what the current model can and cannot do. **The assessment must follow the model's own hierarchy** -- from the inside out: Earth -> Sun -> planets. If the Sun's motion is wrong, all planets built on top of it will inherit that error.

#### Fundamental design constraint: Circles only, constant speed

The model uses **only circular orbits at constant angular speed**. This is a deliberate choice that differs from standard Keplerian ellipses. The assessment must determine:
- Where does circular + constant speed accurately reproduce real motion?
- Where does it fail, and by how much?
- Can the failure be corrected by adding another circular movement on top (epicycle-style)? Or does it require elliptical orbits?

The Ptolemaic tradition showed that epicycles (circles on circles) can approximate any smooth periodic motion to arbitrary precision. The question is: how many circles are needed, and does the model currently have enough?

#### Step 1: Assess the Earth chain (8 nodes to barycenter)

The Earth chain is the foundation -- every planet's geocentric position depends on it.

**Actual scene graph wiring** (lines 4888-4896):
```
startingPoint -> earth -> earthInclinationPrecession -> earthEclipticPrecession
  -> earthObliquityPrecession -> earthPerihelionPrecession1
    -> earthPerihelionPrecession2 -> barycenterEarthAndSun -> sun / earthPerihelionFromEarth
```

Note: `earthWobbleCenter` is NOT in the main chain (used for labels/tracking only). `midEccentricityOrbit` is a **sibling** of `earthEclipticPrecession` under `earthInclinationPrecession` (visualization only, not in the positional chain).

**Key geometric mechanism — counter-rotating motions:**
- **Earth** orbits EARTH-WOBBLE-CENTER clockwise at H/13 (mean axial precession)
- **PERIHELION-OF-EARTH** orbits the Sun counter-clockwise at H/3 (inclination precession)
- Because they rotate in **opposite directions**, their meeting frequency is additive: 1/(H/13) + 1/(H/3) = 16/H (perihelion precession cycle, H/16)
- The **observed/experienced** precession period (~25,772 yr currently) differs from the mean (H/13) because the instantaneous rate varies through the cycle. The model's H/13 mean is correct.

**Fibonacci precession periods:**

| Node | Period | Fibonacci | Known comparison | Notes |
|------|--------|-----------|-----------------|-------|
| `earth` | H/13 | 13 | ~25,772 yr (current obs.) | Mean is correct; current obs. rate varies |
| `earthInclinationPrecession` | H/3 | 3 | Inclination precession | Counter-clockwise, drives perihelion-of-earth |
| `earthEclipticPrecession` | H/5 | 5 | ~68,000-70,000 yr | Ecliptic pole precession |
| `earthObliquityPrecession` | H/8 | 8 | ~41,000 yr (Milankovitch) | Retrograde; matches climate records |
| `earthPerihelionPrecession1/2` | H/16 | 16 (=13+3) | ~21,000 yr (climatic) | Counter-rotating pair; from meeting frequency |

**Eccentricity mechanism — two offset circles:**
- `eccentricityBase` = orbital radius of PERIHELION-OF-EARTH around the Sun (see [Constants Reference](20-constants-reference.md))
- `eccentricityAmplitude` = orbital radius of Earth around EARTH-WOBBLE-CENTER (see [Constants Reference](20-constants-reference.md))
- **Observed eccentricity** = distance between Earth and PERIHELION-OF-EARTH at any given time
  - **Maximum** (same side): `eccentricityBase + eccentricityAmplitude` — matches J2000 observed 0.01671022
  - **Minimum** (opposite sides): `eccentricityBase − eccentricityAmplitude`
  - Range: ~0.0139 to ~0.0167, oscillating with the H/16 perihelion cycle
- At J2000 we are near maximum eccentricity (last perihelion alignment: 1246 AD)
- The model correctly reproduces the J2000 eccentricity without additional tuning

**Obliquity mechanism — counter-tilting nodes:**
- `earthEclipticPrecession.orbitTiltb = -earthInvPlaneInclinationAmplitude` (H/5 period)
- `earthObliquityPrecession.orbitTiltb = +earthInvPlaneInclinationAmplitude` (H/8 period, retrograde)
- When both tilts add: max obliquity = 23.414° + 2 × 0.634° = **~24.71°**
- When both tilts cancel: min obliquity = 23.414° − 2 × 0.634° = **~22.21°**
- Total range: ±1.268° from mean — matches Milankovitch cycle and Laskar (1993) within 0.2° for ±10,000 yr

**What's missing (tiny effects, negligible for optimization):**
- Chandler wobble (~433d, <0.7 arcsec)
- Free core nutation (~430d, <0.1 arcsec)
- Secular acceleration of precession — constant-speed approximation is adequate for ~200-year windows

**Assessment conclusion for Earth chain**: The chain is geometrically sound. All precession periods derive from Fibonacci divisions of H (see [Constants Reference](20-constants-reference.md)). The eccentricity and obliquity mechanisms correctly reproduce observed J2000 values and long-term oscillation ranges. The main tunable constants are: `eccentricityBase`, `eccentricityAmplitude`, `earthInvPlaneInclinationAmplitude`, `earthRAAngle`, and `earthtiltMean`.

#### Step 2: Investigate the Sun's apparent motion -- observation or model artifact?

The Sun is a child of `barycenterEarthAndSun` with:
- `speed: Math.PI*2` (one full orbit per model year)
- `orbitRadius: 100` (1 AU in scene units)
- `startPos: correctionSun`

**The standard claim**: In heliocentric astronomy, Earth's elliptical orbit (e ~ 0.0167) causes the Sun's apparent angular speed to vary by +/-3.3%, producing the "equation of center" (~2 deg annual variation). The model's circular Sun orbit at constant speed cannot reproduce this.

**But in our geocentric model**, the Sun orbits the `barycenterEarthAndSun` (= PERIHELION-OF-EARTH) at 1 AU. This point is NOT at Earth's center — it is offset by the eccentricity distance (~0.0167 AU at J2000). The offset arises from the counter-rotating precession layers: `earthPerihelionPrecession2` carries `orbitCentera: -eccentricityBase*100` and `barycenterEarthAndSun` carries `orbitRadius: eccentricityAmplitude*100`. Because the Sun orbits an off-center point at constant speed, its apparent angular speed as seen from Earth naturally varies through the year — faster when the Sun is closer (perihelion), slower when farther (aphelion). **The question is whether this existing mechanism already captures the observed variation, partially captures it, or misses it entirely.**

**What is observationally established (model-independent):**
- The seasons are unequal in length (known since Hipparchus, ~150 BCE)
- The Sun's apparent daily motion varies through the year (~0.953 deg/day to ~1.020 deg/day)
- Different year lengths exist: tropical (~365.2422 days), sidereal (~365.2564 days), anomalistic (~365.2596 days)
- Eclipse timings constrain where the Sun must be at specific moments

**What is model-dependent interpretation:**
- The ~2 deg "equation of center" is derived from Keplerian elliptical orbit analysis
- In a geocentric frame, the same observable phenomenon could decompose differently
- The model's barycenter/eccentricity chain may already account for some or all of this effect

**Analytical finding — off-center circle captures exactly HALF the observed variation:**

The Sun orbits PERIHELION-OF-EARTH (offset by d = e × R ≈ 0.0167 AU) at constant angular speed ω on a circle of radius R = 1 AU. The apparent angular speed as seen from Earth is:

```
dθ/dt = Rω(R + d·cos(ωt)) / (R² + d² + 2dR·cos(ωt))
```

At perihelion (Sun closest): dθ/dt = ω/(1−e) ≈ ω(1+e) = ω × 1.0167
At aphelion (Sun farthest): dθ/dt = ω/(1+e) ≈ ω(1−e) = ω × 0.9833
Variation: **±e = ±1.67%**

The Keplerian ellipse produces **±2e = ±3.34%** because it has TWO compounding effects:
1. Distance variation (closer → larger apparent speed) — captured by our model
2. Speed variation from Kepler's 2nd law (closer → actually moves faster) — NOT captured

**Consequence**: The model's season lengths should be approximately **half as unequal** as observed. This is the residual that needs to be quantified.

**Assessment tasks for Sun**:
1. Compute the Sun's ecliptic longitude from the model at daily intervals for 2000-2020
2. Compare against JPL Horizons Sun ecliptic longitude
3. Measure the residual — expected: ~1-year sinusoidal pattern with amplitude ~1 deg (half of the 2 deg equation of center, since our off-center geometry already captures the other half)
4. **Use the year-length measurement tools** already in the codebase (lines 884-973) to check: do the model's tropical, sidereal, and anomalistic year lengths match observed values? If season lengths are half as unequal as observed, this confirms the analytical prediction.
5. Check: does the 39.5-year Sun-barycenter oscillation show up as a longer-period residual?

**Known limitation — accepted for now:**

The ~1 deg annual residual is an inherent property of the model's "circles only, constant speed" architecture. Kepler's 2nd law (equal areas → variable speed) is fundamentally incompatible with constant angular speed. This is not a calibration issue — it is a structural design choice.

**Why we accept it:**
- The model's strength is long-period precession accuracy (Fibonacci framework), not annual-timescale motion
- The ~1° annual error is **predictable** (sinusoidal, period = 1 year, amplitude ≈ e ≈ 0.0167 rad ≈ 0.96°, phase = perihelion direction)
- It averages out over multi-year windows, so it does not affect precession rate measurements

**Propagation to planets:**
- Every planet's 5-layer hierarchy couples to the Sun's geocentric position via `PerihelionFromEarth` (speed = 2π/year). The ~1° Sun error therefore appears as a **correlated annual systematic** in all planet residuals with the same phase.
- The optimization tool must account for this: subtract the known Sun systematic before analyzing planet-specific residuals, or include it as a known term in the error model.

**Potential future correction (not in current scope):**
- An annual epicycle (additional circle at 2π/year speed, small amplitude) could reproduce the missing speed variation, similar to the Ptolemaic equant concept.
- **Critical concern**: adding non-uniform Sun motion changes the geocentric angle from Earth to the Sun, which would propagate through the planet sandwich pattern (PerihelionFromEarth at ±2π/year). All planet hierarchies assume uniform annual revolution — a Sun correction would require verifying that planet positions are not degraded.
- **Eclipse timing impact**: ~1° Sun error ≈ ~1 day eclipse timing uncertainty. If eclipse-based Tier 1 validation requires sub-day accuracy, this limitation may need to be revisited.
- A similar correction approach exists for Mars orbit (for reference when revisiting).

#### Step 3: Assess the Moon's hierarchy (6 levels)

The Moon provides the **most powerful observational test** for the entire model because:
- Eclipse records go back to 700 BCE -- the deepest observational dataset available
- Lunar Laser Ranging (1969-present) provides cm-precision distance measurements
- The Moon's complex motion (evection, variation, annual equation) tests the model's ability to capture perturbations
- **Eclipse timing directly tests both the Sun's AND the Moon's position simultaneously** -- if the model predicts eclipses at correct times, both Sun and Moon positions must be approximately right

**Scene graph hierarchy** (lines 4901-4906):
```
earth.pivotObj
  -> moonApsidalPrecession           speed: from apsidal period (~8.85 yr)
                                     orbitRadius: -(moonDist/AU)*e*100 (eccentricity offset)
                                     orbitTilta: inclination - moonTilt = -1.542°
    -> moonApsidalNodalPrecession1   speed: -(2π)/(apsidalMeetsNodal/yearDays) (retrograde, ~206d beat)
      -> moonApsidalNodalPrecession2 speed: +(2π)/(apsidalMeetsNodal/yearDays) (cancels #1, sandwich)
        -> moonLunarLevelingCyclePrecession  speed: retrograde, full leveling cycle
          -> moonNodalPrecession     speed: -(2π)/(nodalPrecession/yearDays) (~18.6 yr, retrograde)
                                     orbitTilta: +5.1454° (ecliptic inclination tilt)
            -> moon                  speed: from tropical month
                                     tilt: -6.687°
                                     orbitRadius: (moonDist/AU)*100 (mean distance)
```

**Input constants** (lines 78-88):
| Constant | Value | Purpose |
|----------|-------|---------|
| `moonSiderealMonthInput` | 27.32166156 d | Sidereal month (fixed stars) |
| `moonAnomalisticMonthInput` | 27.55454988 d | Anomalistic month (perigee to perigee) |
| `moonNodalMonthInput` | 27.21222082 d | Nodal month (ascending node to ascending node) |
| `moonDistance` | 384,399.07 km | Mean Earth-Moon distance |
| `moonOrbitalEccentricity` | 0.054900489 | Orbital eccentricity |
| `moonEclipticInclinationJ2000` | 5.1453964° | Inclination to ecliptic |
| `moonTilt` | 6.687° | Moon's axial tilt |
| `moonStartposApsidal/Nodal/Moon` | 330° / 64° / 132.105° | Start positions (aligned to Stellarium) |

**Derived cycles** (lines 992-1011): Synodic and tropical months derived from sidereal month + Holistic Year integer rounding. Apsidal precession (~3,232 days ≈ 8.85 yr), nodal precession (~6,798 days ≈ 18.6 yr), apsidal-nodal beat (~206 days), lunar leveling cycle, draconic year — all derived from the 3 input months.

**Eclipse cycle verification** (lines 22634-22690): Saros (223 synodic = 239 anomalistic = 242 draconic months), Exeligmos (3× Saros), Callippic (940 synodic months = 76 solar years).

**What the hierarchy captures:**
- Apsidal precession (~8.85 yr cycle) — correct period from anomalistic/sidereal month ratio
- Nodal precession (~18.6 yr cycle, retrograde) — correct period from sidereal/nodal month ratio
- Apsidal-nodal beat (~206 day sandwich pair) — realigns perigee with ascending node
- Lunar leveling cycle — full combined precession cycle
- Ecliptic inclination (5.145°) — applied at the nodal precession layer
- Mean orbital distance — applied at the moon object

**Same constant-speed limitation as Sun, but 3.3× larger:**

The Moon's eccentricity (e = 0.0549) is 3.3× Earth's (0.0167). The same off-center circle analysis applies:
- Off-center circle captures: **±e = ±5.49%** angular speed variation ≈ **±3.15°** position error
- Keplerian ellipse produces: **±2e = ±10.98%** (observed)
- **Missing: ~3.15° monthly sinusoidal residual** — much larger than the Sun's ~1°

This is the Moon's **equation of center** (~6.29° full Keplerian amplitude). The model captures half (~3.15°) via the apsidal precession layer's eccentricity offset, but misses the other half from Kepler's 2nd law speed variation.

**Known perturbation terms NOT in the hierarchy:**
| Perturbation | Amplitude | Period | Captured? |
|-------------|-----------|--------|-----------|
| Equation of center (missing half) | ~3.15° | anomalistic month (~27.55d) | Half captured via off-center orbit |
| Evection | ~1.274° | ~31.8 days | **Not captured** — would need additional circle |
| Variation | ~0.658° | ~14.8 days (half synodic) | **Not captured** |
| Annual equation | ~0.186° | ~365.25 days | **Not captured** |
| Parallactic inequality | ~0.036° | ~synodic month | Negligible |

**Total missing short-period variation: ~5.1°** (3.15° + 1.274° + 0.658°). This is substantial for eclipse timing — a 5° Moon position error corresponds to ~10 hours of timing error.

**What the hierarchy DOES get right:**
- The long-period precession cycles (apsidal ~8.85 yr, nodal ~18.6 yr) that determine WHEN eclipses can occur (eclipse seasons, Saros series)
- The eclipse cycle relationships (Saros, Exeligmos, Callippic) which depend on the ratios between month types
- The ecliptic inclination geometry that determines eclipse visibility zones

**Assessment conclusion for Moon:**
The Moon hierarchy correctly models the precession cycles and eclipse cycle arithmetic. However, the constant-speed limitation produces ~5° of missing short-period variation (equation of center + evection + variation). This is a known consequence of the circles-only architecture and mirrors the Sun's limitation at larger scale. For the optimization tool:
- **Precession tuning**: The tool CAN optimize the 3 input months and start positions for best precession period accuracy
- **Eclipse timing**: Expect ~10-hour systematic uncertainty from missing perturbation terms — this is a known floor, not an optimization target
- **RA/Dec comparison**: Monthly residuals will show predictable periodic patterns from the missing terms; the optimizer should model or subtract these before tuning other parameters

**Assessment tasks (remaining for implementation phase):**
1. Verify Saros/Exeligmos/Callippic derived values match known values (arithmetic check)
2. Compare model's nodal precession period against observed ~18.613 yr
3. Compare model's apsidal precession period against observed ~8.849 yr
4. Quantify the actual RA/Dec residual for the Moon against JPL Horizons over a full nodal cycle
5. If eclipse timing residuals show a ~1-year periodic pattern superimposed on the monthly pattern, that confirms the Sun's annual error propagating

#### Step 4: Assess each planet's chain (5 levels) — deep analysis

All planets share the same 5-object hierarchy wiring (lines 4908-4986):
```
barycenter -> PerihelionDurationEcliptic1 -> PerihelionFromEarth
  -> PerihelionDurationEcliptic2 -> RealPerihelionAtSun -> Planet
                                 -> FixedPerihelionAtSun (sibling)
```

**How eccentricity emerges from the hierarchy:**

The planet's orbital center offset from the Sun comes from TWO sources:
1. **PerihelionFromEarth** (`orbitCentera/b`): A fixed positional offset that slowly precesses with the Ecliptic1/2 sandwich pair. This is the PRIMARY eccentricity source.
2. **RealPerihelionAtSun** (`orbitRadius = ElipticOrbit`): A circular offset at a FIXED angle in the stellar frame (the parent chain rotations cancel: ω_prec + 2π − ω_prec − 2π = 0). This adds a SECONDARY offset.

The total offset from the Sun = PD_vector (precessing) + EO_vector (fixed). The produced eccentricity = |total offset| / orbitRadius.

**FixedPerihelionAtSun** is identical to RealPerihelionAtSun but with `orbitRadius: 0` (no EO circle). It marks the Sun-side fixed point; the planet orbits the "Real" sibling.

##### Three distinct eccentricity formula types

The code (lines 1688-1754) uses THREE different formulas, marked by comments "Planet calculations", "Planet calculations TYPE II", and "Planet calculations TYPE III":

**Type I — Mercury, Venus** (lines 1688-1704):
```javascript
PerihelionDistance = d * e * 100          // PD = a × e in scene units
ElipticOrbit      = PerihelionDistance / 2 // EO = PD/2
```
- PD alone produces **exactly** the input eccentricity: PD/(a×100) = e ✓
- EO adds an additional offset at a different angle (determined by `180 − AscendingNode`)
- Combined eccentricity is **larger** than input (e.g., Mercury: 0.272 vs input 0.206)
- `startPos` of RealPerihelionAtSun: `180 − AscendingNode` ("LowestPoint")
- `RealPerihelionAtSun.speed: −2π` (standard counter-rotation)
- Planet speed: **positive** `+2π/(H/count)`

**Type II — Mars, Eros** (lines 1707-1721):
```javascript
RealOrbitalEccentricity = e / (1 + e)                               // RealE ≈ e − e²
ElipticOrbit = ((RealE*d)/2)*100 + (e*d − RealE*d)*100              // Two-component formula
PerihelionDistance = (d*e*100) + ElipticOrbit                        // PD = ae×100 + EO (much larger)
```
- Uses `e/(1+e)` correction AND unique RealPerihelionAtSun speed
- `RealPerihelionAtSun.speed: −2π + 2×ω_planet` (NOT standard −2π!)
- This modified speed makes the EO circle rotate at **2×ω_planet** in the stellar frame (instead of being fixed)
- The rotating EO creates a beat with the planet's orbital frequency, producing eccentricity correction
- Combined eccentricity: **≈ e** (Mars: 0.095 vs input 0.093 — close match)
- Planet speed: **negative** `−2π/(H/count)` — orbits in the model's CW direction
- The negative planet speed + 2×ω_planet frame rotation = +ω_planet net (correct CCW heliocentric orbit)
- `startPos` of RealPerihelionAtSun: `startpos × 2`
- **FixedPerihelionAtSun also uses the modified speed** (same as RealPerihelionAtSun)

**Type III — Jupiter, Saturn, Uranus, Neptune** (lines 1724-1754):
```javascript
RealOrbitalEccentricity = e / (1 + e)                               // RealE
ElipticOrbit = (e*d − RealE*d) * 100                                // EO = e²/(1+e) × d × 100 (very small)
PerihelionDistance = RealE * d * 2 * 100                             // PD = 2 × RealE × a × 100 ≈ 2ae
```
- PD is approximately **TWICE** the eccentricity offset: PD/(a×100) ≈ 2e/(1+e) ≈ 2e
- EO is very small (≈ e² × a × 100)
- Combined eccentricity: **≈ 2e** (Jupiter: 0.091 vs input 0.048 — roughly double)
- `RealPerihelionAtSun.speed: −2π` (standard)
- Planet speed: **positive** `+2π/(H/count)`
- `startPos` of RealPerihelionAtSun: `startpos × 2`

##### Numerical verification of produced eccentricities

Traced through the full Three.js hierarchy numerically (container → orbit → pivot chain):

| Planet | Input e | PD alone | Full (PD+EO) | Ratio |
|--------|---------|----------|--------------|-------|
| Mercury (I) | 0.2056 | 0.2056 ✓ | 0.2725 | 1.32× |
| Venus (I) | 0.0068 | 0.0068 ✓ | ~0.010 | 1.50× |
| Mars (II) | 0.0934 | 0.1441 | 0.0947 ≈ ✓ | 1.01× |
| Jupiter (III) | 0.0484 | 0.0923 | 0.0908 | 1.88× |
| Saturn (III) | 0.0539 | ~0.102 | ~0.100 | ~1.86× |
| Uranus (III) | 0.0473 | ~0.090 | ~0.088 | ~1.86× |
| Neptune (III) | 0.0086 | ~0.017 | ~0.017 | ~1.98× |

**Key finding**: Only Mars (Type II) produces approximately correct eccentricity. Type I produces ~1.3-1.5× excess. Type III produces ~1.9× excess. The EO circle adds excess for Type I, and doesn't meaningfully compensate for Type III.

##### Mars — why the unique speed formula?

Mars's `RealPerihelionAtSun.speed = −2π + 2×2π/(H/marsCount)` creates frame rotation at the planet level:

```
Frame rotation rates (per holistic year):
  Ecliptic1:           +ω_prec  (slow precession)
  PerihelionFromEarth: +2π      (annual co-rotation with Sun)
  Ecliptic2:           −ω_prec  (cancels Ecliptic1)
  RealPerihelionAtSun: −2π + 2ω_mars (NOT standard −2π)
  ─────────────────────────────────
  Net at planet level:  2×ω_mars  (≈ 6.68 rad/yr)
  + Planet own speed:   −ω_mars   (negative!)
  ═════════════════════════════════
  Total orbital rate:   +ω_mars   (correct CCW direction ✓)
```

Without the modified speed, Mars's negative planet speed would produce CW orbit (wrong direction). The 2ω_mars frame rotation compensates, AND makes the EO circle rotate at 2× orbital frequency, creating the eccentricity correction through beat frequency.

##### Saturn — retrograde perihelion precession

Saturn is unique among Type III planets:
- `PerihelionEclipticYears = −H/8` (NEGATIVE → retrograde precession)
- `RealPerihelionAtSun.orbitRadius: −saturnElipticOrbit` (NEGATIVE radius → flips EO circle direction)
- The negative PrecYears reverses the Ecliptic1/2 sandwich rotation directions:
  - Ecliptic1: speed = 2π/(−H/8) = negative (opposite to other planets)
  - Ecliptic2: speed = −2π/(−H/8) = positive
- This correctly models Saturn's retrograde apsidal precession (~−3400 arcsec/century)
- The negative orbitRadius ensures the EO offset is in the correct direction for the reversed precession

##### Planet speed and startPos conventions

| Planet | Planet speed | Direction | RPAS startPos | RPAS speed | EccentricityPerihelion |
|--------|-------------|-----------|---------------|------------|----------------------|
| Mercury | +ω | CCW | `180−AscNode` | −2π | `(PD/2)×e` |
| Venus | +ω | CCW | `180−AscNode` | −2π | `(PD/2)×e` |
| Mars | −ω | CW (model) | `startpos×2` | −2π+2ω | — |
| Jupiter | +ω | CCW | `startpos×2` | −2π | — |
| Saturn | +ω | CCW | `startpos×2` | −2π | — |
| Uranus | +ω | CCW | `startpos×2` | −2π | — |
| Neptune | +ω | CCW | `startpos×2` | −2π | — |

Note: Venus has **negative rotationSpeed** (retrograde axial rotation), but positive orbital speed.

##### Constant-speed limitation per planet (same as Sun/Moon analysis)

Off-center circle at constant speed produces ±e angular variation. Kepler's 2nd law produces ±2e. The model captures HALF:

| Planet | e | Missing variation (±e) | Max angular error |
|--------|------|---------------------|------------------|
| Mercury | 0.2056 | ±20.6% | ~±23.6° over orbit |
| Venus | 0.0068 | ±0.7% | ~±0.8° |
| Mars | 0.0934 | ±9.3% | ~±10.7° |
| Jupiter | 0.0484 | ±4.8% | ~±5.5° |
| Saturn | 0.0539 | ±5.4% | ~±6.2° |
| Uranus | 0.0473 | ±4.7% | ~±5.4° |
| Neptune | 0.0086 | ±0.9% | ~±1.0° |

For Type III planets, these errors COMPOUND with the ~2× eccentricity excess. Mercury has the largest constant-speed error but correct eccentricity (from PD alone). Jupiter has smaller constant-speed error but ~2× excess eccentricity.

##### Orbit plane tilt — static approximation

All planets use static `orbitTilta/b` on RealPerihelionAtSun:
```javascript
orbitTilta: cos((−90−AscNode)×π/180) × −EclipticInclination
orbitTiltb: sin((−90−AscNode)×π/180) × −EclipticInclination
```
This encodes the J2000 ecliptic inclination at the J2000 ascending node angle. In reality:
- The ascending node drifts (nodal precession) — NOT modeled
- The inclination oscillates — modeled via `computePlanetInclination()` function (line ~30453+)

The `computePlanetInclination()` function applies time-dependent inclination corrections, but the ascending node remains fixed at J2000 values.

##### Perihelion precession pair — sandwich pattern

All planets use `PerihelionDurationEcliptic1` (+ω_prec) and `PerihelionDurationEcliptic2` (−ω_prec) to isolate the perihelion precession from the annual cycle. The precession rates are:

| Planet | PerihelionEclipticYears | Fibonacci | Arcsec/century |
|--------|----------------------|-----------|----------------|
| Mercury | H/(1+3/8) | — | ~575 |
| Venus | H×2 | — | ~400 |
| Mars | H/(4+1/3) | — | ~1,600 |
| Jupiter | H/5 | 5 | ~1,800 |
| Saturn | −H/8 | 8 (retrograde) | ~−3,400 |
| Uranus | H/3 | 3 | ~1,100 |
| Neptune | H×2 | — | ~400 |

Mercury and Mars use non-Fibonacci periods (rational fractions of H). Jupiter, Saturn, and Uranus use clean Fibonacci divisions. Venus and Neptune share the same period (H×2).

##### Assessment conclusion for planet chains

1. **Eccentricity accuracy varies by type**: Type II (Mars) ≈ correct. Type I (Mercury, Venus) ~30-50% excess. Type III (outer planets) ~90% excess. This is a **significant architectural finding** — the three different formula types produce very different eccentricity accuracy.

2. **Constant-speed limitation**: Same as Sun/Moon. Missing ±e angular variation per orbit. Mercury has the largest absolute error (~24°). Low-eccentricity planets (Venus, Neptune) are barely affected.

3. **Mars is architecturally unique**: Different RPAS speed, negative planet speed, different PD/EO formulas. This creates a rotating EO circle that corrects eccentricity through beat frequency — the most sophisticated eccentricity mechanism in the model.

4. **Saturn handles retrograde precession** via negative PrecYears and negative orbitRadius — clean and correct.

5. **Static ascending nodes**: All planets have fixed J2000 ascending nodes. Over millennia, this introduces declination errors as the actual nodes drift.

6. **For the optimization tool**: The eccentricity excess (especially Type III ~2×) means that perihelion/aphelion distances will be wrong, affecting planet-Sun distance calculations. The tool should measure this discrepancy and potentially flag it as a structural issue distinct from parameter tuning.

#### Step 5: Quantify and prioritize

Classification system:
- **Category A** — Correctable by parameter tuning (startPos, AngleCorrection, etc.)
- **Category B** — Partially correctable by tuning; residual remains
- **Category C** — Requires new movement (additional circle/node) or structural change
- **Category D** — Architectural design choice; accepted limitation

##### Master issue table — ordered by angular error magnitude

| # | Issue | Error magnitude | Time scale | Body | Category | Notes |
|---|-------|----------------|------------|------|----------|-------|
| 1 | **Mercury constant-speed** | ±23.6° per orbit | 88 days | Mercury | D | Half of ±2e equation of center missing |
| 2 | **Type III eccentricity ~2×** | Perihelion/aphelion distances off by ~4-5% | Per orbit | Jup/Sat/Ura/Nep | B/C | PD formula gives ~2e instead of e; optimizer should recommend improved setup |
| 3 | **Mars constant-speed** | ±10.7° per orbit | 687 days | Mars | D | Same ±e limitation |
| 4 | **Type I eccentricity excess** | ~30-50% excess eccentricity | Per orbit | Mercury, Venus | B/C | EO adds excess on top of correct PD; optimizer should recommend improved setup |
| 5 | **Moon equation of center (missing half)** | ~3.15° | 27.55 days | Moon | D/C | Off-center circle captures half; epicycle needed for other half |
| 6 | **Jupiter constant-speed** | ±5.5° per orbit | 11.9 years | Jupiter | D | Compounded with ~2× eccentricity excess |
| 7 | **Saturn constant-speed** | ±6.2° per orbit | 29.5 years | Saturn | D | Compounded with ~2× eccentricity excess |
| 8 | **Uranus constant-speed** | ±5.4° per orbit | 84 years | Uranus | D | Compounded with ~2× eccentricity excess |
| 9 | **Moon evection** | ~1.274° | 31.8 days | Moon | C | Not captured; needs additional circle |
| 10 | **Sun constant-speed** | ~1° annual | 365.25 days | Sun (all planets) | D | Propagates as correlated systematic to all planets |
| 11 | **Neptune constant-speed** | ~1.0° per orbit | 165 years | Neptune | D | Low eccentricity, small effect |
| 12 | **Venus constant-speed** | ~0.8° per orbit | 225 days | Venus | D | Nearly circular, barely affected |
| 13 | **Moon variation** | ~0.658° | 14.8 days | Moon | C | Not captured |
| 14 | **Static ascending nodes** | Degrees over millennia | ~10,000+ yr | All planets | B | J2000 nodes don't precess; inclination IS modeled dynamically |
| 15 | **Moon annual equation** | ~0.186° | 365.25 days | Moon | C | Not captured |
| 16 | **Perihelion precession rate** | Constant vs slightly variable | ~10,000+ yr | All planets | D | Fibonacci framework uses fixed periods |
| 17 | **Chandler wobble, nutation** | <1 arcsec | ~433 days | Earth | D | Negligible |

##### Analysis by category

**Category A — Parameter tuning (what the optimizer CAN fix):**
- `startPos` values for all bodies — shifts initial angular position
- `AngleCorrection` — fine-tunes perihelion alignment
- `correctionSun` — Sun's initial position
- Precession-layer start positions — alignment of precession phases
- The 3 Moon input months — fine-tune precession cycle periods
- `eccentricityBase` and `eccentricityAmplitude` — Earth eccentricity at J2000

These affect positional accuracy at specific epochs without changing the model architecture.

**Category B — Partially correctable:**
- Static ascending nodes: the optimizer could tune J2000 node values for best fit over a specific time window, but cannot model the drift. Over ±200 years from J2000, this is adequate. Over millennia, declination errors grow.
- Planet inclination: `computePlanetInclination()` already models time-dependent inclination, but coupled with static nodes, accuracy degrades over long time spans.

**Category B/C — Eccentricity formula improvements (optimizer target):**

The three eccentricity formula types (I, II, III) represent an **initial direction** for modeling planet orbits, not a final answer. The fact that Type II (Mars) produces correct eccentricity while Type I and III do not proves the architecture CAN work — it just hasn't been fully optimized yet. The optimizer should be empowered to:

- **Recommend different PD/EO values** within the existing Type I/II/III formulas (Category B — parameter tuning)
- **Propose a new formula type** (Type IV, V, ...) if existing types cannot achieve target accuracy (Category C)
- **Suggest additional orbit circles** that don't exist in the current 5-level chain — e.g., Mars's rotating EO concept (modified RPAS speed) could potentially be generalized to other planets
- **Potentially unify** all planets under a single improved pattern, using Mars's Type II approach as the proven reference

The key insight: Mars's architecture demonstrates that correct eccentricity IS achievable within the circles-only framework. The rotating EO circle (RPAS speed = −2π + 2ω) creates a beat-frequency correction that brings eccentricity from ~1.5× down to ~1.0×. This mechanism could be adapted for Type III planets.

**Category C — Requires new hierarchy nodes:**
- **Moon perturbations** (evection, variation, annual equation): Each would need an additional circle in the Moon hierarchy. Evection alone (~1.274°) would require a node with period ~31.8 days. Adding all three would bring the Moon chain from 6 to 9 levels.
- **Equation of center correction** (all bodies): An additional epicycle at the body's orbital frequency with amplitude ≈ e×R could capture the missing half of the equation of center. This is equivalent to the Ptolemaic concept of the equant. Mars already has a partial version of this via its modified RPAS speed.

**Category D — Accepted architectural limitations:**
- **Constant-speed on circles**: This is the model's fundamental design choice. It accurately captures long-period behavior (precession cycles, Fibonacci resonances) but misses short-period speed variations. The missing ±e effect is a predictable, analytically-known residual that can be modeled or subtracted.
- For the optimization tool, these D-category residuals should be treated as **known systematics**, not optimization targets. The optimizer should either:
  1. Subtract the predicted constant-speed residual before fitting
  2. Include it as a known term in the error model
  3. Focus on long-period (multi-year) accuracy where these errors average out

##### Priority ranking for the optimization tool

**Tier 1 — Must understand before optimizing:**
1. Sun's ~1° annual systematic → propagates to ALL planets. The optimizer must account for this correlated error.
2. Type III eccentricity excess → affects Sun-planet distances for outer planets. Need to determine: does 2× eccentricity distort geocentric RA/Dec, or does it mostly affect the radial (distance) component?
3. Moon's ~5° combined short-period errors → sets a floor on eclipse timing accuracy (~10 hours).

**Tier 2 — Measure during optimization:**
4. Type I eccentricity excess → quantify actual RA/Dec impact for Mercury and Venus.
5. Mars eccentricity (correct within ~1%) → validates that Type II architecture works well.
6. Constant-speed limitation per planet → compute predicted residual curves to subtract from optimization fits.

**Tier 3 — Address if optimization residuals demand it:**
7. Static ascending nodes → only matters for multi-millennial accuracy.
8. Moon perturbation terms (evection, variation) → only if eclipse timing accuracy is a primary goal.
9. Missing planet-planet gravitational perturbations → only matters for high-precision ephemeris work.

##### Key questions for Step 6

1. **Does the Type III eccentricity excess (~2×) significantly affect geocentric RA/Dec accuracy, or is it primarily a radial (distance) error?** This determines whether eccentricity formula improvement is urgent or can wait.

2. **Can Mars's rotating-EO approach (modified RPAS speed) be generalized to fix Type I and III planets?** Mars proves correct eccentricity is achievable — the question is whether the same mechanism works for inner and outer planets.

3. **Is there a single unified formula that works for ALL planets?** The current three ad-hoc types suggest the model developer tried different approaches. The optimizer should seek a universal solution.

#### Step 6: Decision — what to address before optimization

Based on the Step 1-5 assessment, here is the decision framework:

**Two-stage approach: measure first, then optimize both parameters AND structure.**

The model's circles-only, constant-speed, Fibonacci-precession architecture is the foundation — that stays. But the eccentricity formulas (Type I/II/III) and the specific orbit configurations are an **initial direction**, not a finished product. Mars (Type II) proves that correct eccentricity IS achievable within this architecture. The optimizer should be empowered to recommend improvements to all planet setups.

**Stage 1 — Measure and understand (before optimization):**

| Issue | Decision | Rationale |
|-------|----------|-----------|
| Sun ~1° annual systematic | **Model and subtract** | Analytically predictable; amplitude ≈ 0.96°, period = 1 year, phase = perihelion direction |
| Type III eccentricity ~2× | **Measure RA/Dec impact** | Quantify how much the ~2× excess distorts geocentric angular positions (not just distances) |
| Type I EO excess | **Measure RA/Dec impact** | Quantify for Mercury and Venus |
| Moon ~5° missing perturbations | **Accept as known floor** | Eclipse timing floor ≈ 10 hours. Optimizer should not try to tune away this structural gap |
| Constant-speed per planet | **Compute predicted residual curves** | For each planet, generate the expected ±e sinusoidal residual. Subtract before fitting |
| Mars eccentricity (≈ correct) | **Use as reference architecture** | Type II proves correct eccentricity is achievable; benchmark for what "correct" looks like |

**Stage 2 — Optimize (parameters AND structure recommendations):**

The optimizer operates at two levels:

*Level 1 — Parameter tuning (Category A):*
- `startPos` for all bodies (initial angular position)
- `AngleCorrection` for all planets (perihelion alignment)
- `correctionSun` (Sun's initial position)
- The 3 Moon input months (precession cycle periods)
- `eccentricityBase` and `eccentricityAmplitude` (Earth eccentricity)
- Precession layer start positions
- PD and EO values within existing formulas

*Level 2 — Structural recommendations (Category B/C):*
- **Recommend improved eccentricity formulas**: If residual analysis shows that Type I or Type III planets have systematic eccentricity errors that parameter tuning cannot fix, the optimizer should propose alternative formulas (Type IV, V, etc.)
- **Recommend additional orbit circles**: If residual patterns show periodic signals that existing hierarchy nodes cannot capture, propose new nodes (amplitude, period, phase)
- **Generalize Mars's approach**: The rotating EO circle (modified RPAS speed) could potentially be adapted for other planets. The optimizer should test whether applying Mars's −2π + 2ω pattern to outer planets improves eccentricity
- **Unify formula types**: The long-term goal is a single consistent eccentricity mechanism for all planets, not three ad-hoc variants

**What the optimizer should PRESERVE (non-negotiable):**
- The circles-only, constant-speed paradigm — this is the model's identity
- Fibonacci precession periods (H/3, H/5, H/8, H/13) — these are the model's core framework
- The 5-level planet hierarchy structure (barycenter → Ecliptic1 → PerihelionFromEarth → Ecliptic2 → RPAS → Planet) — but additional nodes CAN be added within or alongside this chain
- The Earth chain (8 nodes) — proven sound in Step 1
- The Moon chain (6 levels) — structurally correct for precession cycles

**Risk mitigation:**
- The Sun's ~1° systematic will make the optimizer "see" a correlated annual error in all planets. If not accounted for, it will distort planet parameters to absorb Sun error. **Solution**: subtract Sun systematic before planet fitting, or fit Sun position independently first.
- When recommending structural changes (Level 2), the optimizer must verify that improvements for one planet don't regress others. Cross-validation is essential.
- Eccentricity formula changes should be proposed as **recommendations with evidence** (residual analysis, comparison against JPL), not applied automatically.

**Phase 1 assessment is now COMPLETE.** Proceed to Phase 2 (Fibonacci Resonance Exploration Scripts) to build the numerical foundation before the optimization engine.

### Phase 2: Fibonacci Resonance Exploration Scripts
**Output:** Numerical verification of orbit counts, conjunction periods, and resonance loop
**Effort:** Low-Medium
**Risk:** None (read-only analysis + standalone scripts)
**Priority:** Jupiter-Saturn-Earth first (the 3-5-8-13-21 loop)
**Status:** COMPLETE

Before building the full optimization engine, create standalone Node.js exploration scripts in `tools/explore/` to validate the Fibonacci orbital structure:

**Shared module:** `tools/explore/constants.js` -- All constants and derived formulas extracted from `script.js` (lines 25-186, 884-1011, 1687-1770). Replicates exact calculations including `Math.round`/`Math.ceil` rounding. This becomes the foundation for Phase 5.

1. **`orbit-counts.js`** -- Compute all `SolarYearCount` values from the formula `round(H x meanSolarYear / SolarYearInput)`. Verify Fibonacci relationships between orbit counts. Show how `SolarYearInput` maps to integer orbit counts and their sensitivity to input changes (how much must `SolarYearInput` change to cross a rounding boundary?).

2. **`conjunction-periods.js`** -- Calculate conjunction periods from orbit count ratios. Focus on Jupiter-Saturn great conjunctions (~19.86 years): `1/(1/T_Jupiter - 1/T_Saturn)`. Compare predicted conjunction dates against observed/computed dates from `PLANET_TEST_DATES`. Extend to other planet pairs.

3. **`resonance-loop.js`** -- Numerically verify the 3-5-8-13-21 beat frequency loop:
   - `1/(H/5) + 1/(H/8) = 1/(H/13)` (Jupiter + Saturn -> Axial precession)
   - `1/(H/5) - 1/(H/8) = -1/(H/3)` (Jupiter - Saturn -> Earth inclination, retrograde)
   - All Fibonacci consecutive pairs: F(n)/H + F(n+1)/H = F(n+2)/H
   Check loop closure and quantify any residuals.

4. **`alignment-explorer.js`** -- For Jupiter-Saturn: when do they align? How many great conjunctions in H years? Do the orbit counts predict alignment patterns that match the ~19.86-year cycle? Extend to other mirror pairs.

5. **`moon-cycles.js`** -- Verify the Moon's derived cycle calculations:
   - Compute synodic, tropical, anomalistic, and draconic months from the 3 input months
   - Verify Saros cycle: does 223 x synodic = 239 x anomalistic = 242 x draconic (to within hours)?
   - Verify nodal precession period (~18.6 years) and apsidal precession (~8.85 years)
   - Compare model's eclipse year (draconic year) against known value (~346.62 days)

6. **`year-lengths.js`** -- Verify the model's year-length calculations:
   - Compare model's tropical, sidereal, and anomalistic year lengths against observed values
   - Check the seasonal length asymmetry: does the model reproduce the unequal seasons?
   - Verify day length derivations (solar, sidereal, stellar)
   - Confirm frequency relationship: 1/tropical = 1/sidereal + 1/precession (EXACT)

**Goal**: Establish a solid numerical foundation for the Jupiter-Saturn-Earth chain AND the Moon/Sun chain before any parameter optimization. Once these are verified, extend the analysis outward following the mirror pair structure: Mars (d=5 with Jupiter) -> Mercury/Uranus (d=21) -> Venus/Neptune (d=34).

These scripts serve dual purpose: (a) validate understanding of the model structure, (b) become building blocks for the optimization engine's core math.

#### Phase 2 Results — Checkpoint

All 6 scripts + shared constants module created in `tools/explore/`. Run with `node tools/explore/<script>.js`.

##### Key findings:

**1. Orbit counts and Kepler's 3rd law (orbit-counts.js):**
- All `SolarYearCount` values match `script.js` exactly
- Kepler's 3rd law (`a³/T² = 1`) holds to machine precision for all planets (by construction — `a = T^(2/3)`)
- Semi-major axis accuracy vs JPL: inner planets < 0.002% error, outer planets 0.06-0.36% error (increases with distance)
- Period accuracy: inner planets < 70 ppm, outer planets up to 4738 ppm (Neptune) — the rounding to integer orbit counts introduces larger errors for planets with fewer orbits in H
- **Sensitivity**: Mercury is most fragile (only 0.000013 day margin before count changes), Neptune most robust (13.9 day margin). This is directly proportional to period length.

**2. Resonance loop (resonance-loop.js):**
- ALL Fibonacci beat frequency identities are **algebraically EXACT** (zero residual) — this is pure number theory (F(n) + F(n+1) = F(n+2))
- Earth meeting frequency: 1/(H/13) + 1/(H/3) = 1/(H/16) — EXACT (16 = 13 + 3)
- Psi-constant: ψ = (5 × 21²) / (2 × H) = 3.291 × 10⁻³ (H=335,008)
- Clean Fibonacci perihelion precession: Jupiter (H/5), Saturn (-H/8), Uranus (H/3). Others use rational fractions of H.

**3. Conjunction periods (conjunction-periods.js):**
- Jupiter-Saturn great conjunction: **19.8601 years** (model) vs ~19.859 years (known) — 0.001 year difference
- 16,812 great conjunctions in H years (divisible by 2 and 3)
- ALL Earth-planet synodic periods match known values within 0.01 days (< 0.002% error)
- Conjunction counts divisible by multiple Fibonacci numbers: Mercury-Uranus by {2,3,8,21,34}, Venus-Neptune by {2,3,8,13}

**4. Alignment patterns (alignment-explorer.js):**
- Jupiter-Saturn trigon: conjunctions advance by ~-117.0° (close to -120° = 360°/3)
- Full trigon rotation: ~3.08 conjunctions ≈ 61.1 years
- Predicted great conjunction dates show ~0.3-1.3 year systematic offset from known dates — this reflects the approximate startpos values, not a structural issue
- Earth-Mars opposition period: 779.93 days vs known 779.94 days — excellent

**5. Moon cycles (moon-cycles.js):**
- All derived month lengths match known values to < 0.5 seconds (< 0.2 ppm)
- Saros cycle: 223 synodic = 6585.32 days, matching known value to 0.06 hours
- 242 draconic months differ from 223 synodic months by only 0.83 hours (confirms Saros eclipse repetition)
- Apsidal precession: 8.851 years (model) vs ~8.849 years (known) — 12 hours difference
- Nodal precession: Earth frame = 18.600 yr, **ICRF frame = 18.613 yr** (exact match to known 18.613 yr — the ICRF value is the correct physical comparison)
- Draconic year: 346.620 days — matches known ~346.62 days to 0.004 hours
- Full Moon Cycle: 411.783 days — matches known ~411.78 days to 0.003 days
- Metonic cycle: 235 synodic = 19 solar years to within 2.1 hours

**6. Year lengths (year-lengths.js):**
- Mean solar year: model rounds input to 365.2421890 days (0.06 seconds shorter than input) — this ensures integer day count in H/16 years
- Mean sidereal year: 365.2564103 days — 4.1 seconds longer than known (0.13 ppm)
- Mean anomalistic year: 365.2596923 days — 4.9 seconds longer than known (0.15 ppm)
- Frequency relationship 1/tropical = 1/sidereal + 1/precession: **EXACT** (algebraic identity from the derivation)
- Day length: model solar day = 86399.989 seconds (11.3 ms short of 86400 — this IS the perihelion precession contribution, accumulated over H/16 years = exactly 1 extra day)
- Season asymmetry: model captures ~50% of observed asymmetry (±0.97° vs Kepler's ±1.92°) — confirms the constant-speed limitation analysis from Phase 1

##### What these results confirm:
1. The Fibonacci resonance loop is mathematically exact — no numerical drift
2. The orbit count rounding creates discrete but small period errors
3. Conjunction periods emerge correctly from the orbit count framework
4. The Moon cycle derivations are internally consistent and match known values
5. Year-length relationships are algebraically exact within the model
6. The constant-speed limitation (capturing half of Kepler's equation of center) is confirmed numerically

**Phase 2 is COMPLETE.** The numerical foundation is verified. Proceed to Phase 3 (Compile Reference Data).

#### Phase 3 Checkpoint (completed)

##### What was built:
1. **`tools/export-reference-data.js`** — Parses PLANET_TEST_DATES from script.js (regex, not eval), assigns tier/weight/source/reliability metadata per entry, outputs `config/reference-data.json`
2. **`tools/enrich-with-jpl.js`** — Queries JPL Horizons REST API for missing RA/Dec values on all Tier 2 entries, with response caching (`config/jpl-cache.json`) and 1 req/sec rate limiting
3. **`config/reference-data.json`** — The compiled reference dataset with 678 entries fully annotated
4. **`config/jpl-cache.json`** — Cached JPL Horizons responses (288 entries) for reproducibility

##### Key results:
- 678 entries parsed from PLANET_TEST_DATES across 10 bodies (mercury through eros)
- Tier distribution: Tier 2 = 298 (modern ephemeris range 1800-2200), Tier 3 = 380 (extrapolation/ancient)
- Entry types: 'NASA date' (175 Mercury/Venus transits), 'Opposition' (196 Mars), 'Occultation' (297 mutual planetary events), 'Model start date' (10)
- JPL enrichment: 288 API calls, 0 errors — all Tier 2 entries now have both RA and Dec
- RA coverage: 298/678 (44.0%) — all Tier 2 entries covered
- Dec coverage: 468/678 (69.0%) — all Tier 2 + many Tier 3 entries
- Date reliable: 330 entries (48.7%) — transit/opposition dates with historical observation records
- Position reliable: 0 (0.0%) — ALL positions are computed from ephemeris, none from direct observation
- JPL query: geocentric (CENTER=500@399), astrometric RA/Dec in decimal degrees (ANG_FORMAT=DEG)
- Non-enrichable bodies (pluto, halleys, eros): 3 entries with model start date positions only

##### Tier system revised to sub-tiers (1A/1B/1C/1D/2/3):
- **1A** (weight 10): Modern direct observation, < 1 arcsec (LLR, modern eclipses, radar)
- **1B** (weight 7-9): Telescope-era observation, 1-40 arcsec (transit contact times, Flamsteed)
- **1C** (weight 5-6): Pre-telescope precision, 1-2 arcmin (Tycho Brahe)
- **1D** (weight 2-4): Ancient/medieval, 10-60 arcmin (Ptolemy, Babylonian)
- **2** (weight 1): Modern fitted ephemeris (JPL DE441, computed)
- **3** (weight 0): Extrapolation (comparison only)

##### Tycho Brahe Mars data compiled (Tier 1C — first true observational data):
- **923 Mars declination observations** (1582-1600) from Uraniborg
- Source: *Tychonis Brahe Dani Opera Omnia*, vols. 10 & 13 (digitized by Wayne Pafko, 2000)
- Accuracy: 1-2 arcminutes (0.017-0.033°) — the most precise pre-telescope planetary measurements
- Data type: declination only (no RA); 322 negative (south), 601 positive (north)
- Dec range: -27.98° to +27.30°; JD range: 2299198.5 to 2305532.88
- Files: `config/tycho-mars-raw.csv` (raw CSV), `tools/import-tycho-mars.js` (parser)
- Densest coverage: 1595 (294 obs), 1593 (135 obs), 1591 (104 obs)
- These are **positionReliable: true** — actual measurements, not computed from ephemeris

##### Tier 1 placeholders remaining (TO BE COMPILED):
- 1A: Lunar Laser Ranging (1969-present), modern eclipse timings (1900-2025)
- 1B: Mercury transit contact times (RGO Bulletin 181, 1677-1973), Venus transit contact times (1639-2012)
- 1D: Historical eclipse records (Stephenson 1997, 700 BCE-1600 CE)

##### Grand total: 1,601 reference entries
- 678 from PLANET_TEST_DATES (Tier 2/3, JPL-enriched)
- 923 from Tycho Brahe (Tier 1C, first observational data)

**Phase 3 is COMPLETE.** Reference data compiled with tiered observation system. Proceed to Phase 4 (Update PLANET_TEST_DATES with Tier System).

### Phase 3: Compile Reference Data (`reference-data.json`)
**Files:** `config/reference-data.json`
**Effort:** Medium
**Risk:** Low
**Prerequisite:** Must be done before any optimization

Before writing any optimization code, compile the "single source of truth" reference dataset:

1. **Export PLANET_TEST_DATES** into JSON with per-entry metadata:
   - `tier`: 1 (observed event date), 2 (computed position value), 3 (extrapolation)
   - `weight`: 2-10 (tier 1, scaled by era), 1 (tier 2 modern), 0 (tier 3)
   - `source`: original URL/citation
   - `dateReliable`: true/false (is the event date itself observationally confirmed?)
   - `positionReliable`: true/false (is the dec/RA/longitude from actual measurement?)

2. **Enrich with JPL Horizons RA/Dec** for all modern-era dates (1800-2200):
   - Query JPL for each PLANET_TEST_DATES entry that currently lacks RA
   - Mark these as `tier: 2, positionReliable: false` (computed, not observed)

3. **Add observed transit contact times** (Tier 1 positional data):
   - Mercury transits with observed contact times (1677-1973, from RGO Bulletin 181)
   - Venus transits with observed contact times (1639, 1761, 1769, 1874, 1882, 2004, 2012)
   - These constrain planet position to solar-disk precision (~0.25 deg)

4. **Add Moon/eclipse reference data** (Tier 1 -- the richest observational dataset):
   - **Historical eclipse records**: Stephenson's catalog (700 BCE-1600 CE) -- dates and locations of reliably observed eclipses (weight 2-4 by era)
   - **Modern eclipse timings** (1900-2025) -- precise contact times from observatory records (weight 10)
   - **Lunar Laser Ranging** (1969-present) -- cm-precision Earth-Moon distance at known times (weight 10)
   - **Lunar occultation timings** -- Moon covering stars at precisely recorded times, constraining Moon's position to arcsecond precision
   - **Saros cycle eclipse sequences** -- series of related eclipses spanning centuries, testing long-term accuracy

5. **Cross-validate with INPOP** for a sample of dates to confirm DE441 agreement

### Phase 4: Update PLANET_TEST_DATES with Tier System
**Files:** `src/script.js` (lines 6825-7580)
**Effort:** Medium
**Risk:** Low (data annotation, no logic changes)
**Prerequisite:** Phase 3 (reference data compiled with tier/weight metadata)

Update the existing `PLANET_TEST_DATES` in-code data structure to include tier and reliability metadata per entry. This enables the **planet hierarchy inspector** (report generation pipeline) to distinguish between trustworthy observational data and derived ephemeris data when comparing against the model.

**Changes to each entry:**

```javascript
// Before:
{ jd: 2307579.3, dec: '-14.68', type: 'position', label: 'NASA date', showOnScreen: true }

// After:
{ jd: 2307579.3, dec: '-14.68', type: 'position', label: 'NASA date', showOnScreen: true,
  tier: 2, weight: 1, source: 'NASA GSFC Transit Catalog (Espenak), computed from JPL DE404',
  dateReliable: true, positionReliable: false, notes: '' }
```

**Per-entry fields to add:**

| Field | Type | Purpose |
|-------|------|---------|
| `tier` | 1/2/3 | 1 = observed event, 2 = modern fitted ephemeris, 3 = extrapolation |
| `weight` | number | Optimization weight: 2-10 (tier 1, scaled by era), 1 (tier 2 modern), 0 (tier 3) |
| `source` | string | Original data source citation |
| `dateReliable` | boolean | Is the event date itself observationally confirmed? |
| `positionReliable` | boolean | Is the dec/RA from actual measurement (not computed)? |
| `notes` | string | Additional context, caveats, or references for this entry |

**Tier assignment rules (from Section 4.3 audit):**
- Transit/opposition/conjunction **dates** that were historically observed -> `dateReliable: true`
- All current **dec/RA values** -> `positionReliable: false` (computed from DE/VSOP87)
- Entries within 1800-2200 -> `tier: 2, weight: 1`
- Entries before 1800 or after 2200 -> `tier: 3, weight: 0`
- Future addition of actual observed contact times -> `tier: 1, weight: 8-10 (by era), positionReliable: true`

**Also add new Tier 1 entries** where available:
- Mercury transit contact times from historical records (1677-1973)
- Venus transit records (1639, 1761, 1769, 1874, 1882, 2004, 2012)
- These provide positional constraints to ~0.25 deg without relying on any ephemeris model

**Add Moon test dates** (currently no Moon entries exist in PLANET_TEST_DATES):
- Eclipse dates with observed contact times (the strongest Tier 1 data available)
- Modern eclipse timings (1900-2025) as high-weight validation points
- Historical eclipse records from Stephenson's catalog as lower-weight ancient data

**Impact on planet hierarchy inspector:** The report generation pipeline (`generatePlanetReport()`, line 21120) can then filter or weight comparisons by tier, showing separate accuracy metrics for observational data vs. derived data. Entries with `positionReliable: false` are flagged as "ephemeris reference" rather than "observation." The Moon/eclipse data enables a new report section for lunar accuracy.

#### Phase 4 Checkpoint (completed)

##### What was built:
1. **`tools/patch-planet-test-dates.js`** — Reads reference-data.json metadata, rewrites the PLANET_TEST_DATES block in script.js with annotated entries and appended Tycho data
2. **Updated `src/script.js`** — PLANET_TEST_DATES now has 1,601 entries (was 678), lines 6825-8485

##### Changes to script.js:
- **678 existing entries annotated** with `tier` (2 or 3) and `weight` (1 or 0)
- **288 JPL RA values added** to Tier 2 entries that previously lacked RA (format: decimal degrees with ° suffix)
- **923 Tycho Brahe Mars entries added** as `type: 'observation'`, `label: 'Tycho Brahe'`, `tier: '1C'`, `weight: 5`
- All inline comments preserved (source URLs, section headers)
- `node --check` passes — zero syntax errors
- Backward-compatible: `generatePlanetReport()` continues to work since new fields (tier, weight) are simply ignored by existing code

##### Entry counts by planet (after patch):
| Planet | Total | T1C | T2 | T3 | RA |
|--------|-------|-----|----|----|-----|
| mercury | 95 | 0 | 55 | 40 | 55 |
| venus | 91 | 0 | 8 | 83 | 8 |
| mars | 1,132 | 923 | 144 | 65 | 144 |
| jupiter | 118 | 0 | 31 | 87 | 31 |
| saturn | 95 | 0 | 27 | 68 | 27 |
| uranus | 18 | 0 | 1 | 17 | 1 |
| neptune | 49 | 0 | 29 | 20 | 29 |
| pluto | 1 | 0 | 1 | 0 | 1 |
| halleys | 1 | 0 | 1 | 0 | 1 |
| eros | 1 | 0 | 1 | 0 | 1 |
| **Total** | **1,601** | **923** | **298** | **380** | **298** |

##### Key insight:
Mars now has 923 Tier 1C observations (weight 5) vs 144 Tier 2 ephemeris entries (weight 1). For the first time, the dataset has actual observed positions that outweigh computed positions. The optimization tool can now validate Mars declination against Tycho Brahe's measurements — the same data that led Kepler to discover elliptical orbits.

**Phase 4 is COMPLETE.** PLANET_TEST_DATES annotated and expanded. Proceed to Phase 5 (Constants & Core Math).

### Phase 5: Constants & Core Math
**Files:** `tools/lib/constants.js`, `tools/lib/orbital-engine.js`
**Effort:** Medium
**Risk:** Low (direct extraction from script.js)

- Extract all constants from script.js lines 25-460, **including Moon constants** (lines 78-88: 3 input months, distance, inclination, eccentricity, tilt, 3 start positions)
- Replicate derived quantities (lines 960-990, 1687-1770): orbit distances, speeds, ellipse parameters
- **Replicate Moon derived cycles** (lines 992-1010): synodic/tropical/anomalistic/draconic months, nodal/apsidal precession periods, Saros/Exeligmos/Callippic cycles
- **Replicate year-length calculations** (lines 884-973): tropical, sidereal, anomalistic year lengths and their relationships
- Port orbital functions: obliquity, eccentricity, inclination computations (lines 30453-30990)
- Port date conversion utilities
- Port predictive formula system (PERI_HARMONICS, calcEarthPerihelionPredictive, calcERD)
- Port planet inclination dynamics (computePlanetInvPlaneInclinationDynamic)

#### Phase 5 Checkpoint

**Status**: COMPLETE (2026-03-06)

**What was built:**

| File | Purpose | Contents |
|------|---------|----------|
| `tools/lib/constants.js` (497 lines) | Canonical constants module | All input constants, derived values, Moon cycles, planet data, date utilities, formatting helpers |
| `tools/lib/orbital-engine.js` (264 lines) | Time-dependent orbital functions | 15 exported functions computing orbital elements as f(year) |
| `tools/explore/constants.js` (2 lines) | Backward-compat re-export | `module.exports = require('../lib/constants')` |

**Constants module (`tools/lib/constants.js`) includes:**
- All 17 global input constants (H, eccentricityBase, earthtiltMean, etc.)
- All 10 Moon input constants + 3 startpos values
- Per-planet data objects (8 planets) with inclination mean/amplitude filled in
- Additional bodies (Pluto, Halley's, Eros, Ceres)
- Year-length formula constants (3 amplitude values)
- Predictive formula constants (PERI_HARMONICS array with 12 terms, PERI_OFFSET)
- All derived globals (perihelionCycleLength, balancedYear, balancedJD, meanSolarYearDays, etc.)
- All Moon derived cycles (synodic, tropical, anomalistic, draconic months + precession periods)
- Planet derived calculations (orbit distance, speed, eccentricity types I/II/III)
- Date conversion utilities (jdToCalendar, calendarToJD, jdToYear, yearToJD, jdToDateString)
- Formatting helpers (pad, padLeft, fmt, fmtInt, printTable)

**Orbital engine (`tools/lib/orbital-engine.js`) exports:**
- `computeEccentricityEarth(year)` — cosine formula with H/16 cycle
- `computeObliquityEarth(year)` — two-cosine formula (H/3 + H/8 cycles)
- `computeInclinationEarth(year)` — single cosine with H/3 cycle
- `computeObliquityIntegrals(year)` — deviation components from mean
- `computeLengthOfSolarYear(obliquity)` — tropical year from obliquity
- `computeLengthOfSiderealYear(eccentricity)` — sidereal year from eccentricity
- `computeLengthOfAnomalisticYearRealLOD(ecc, lod)` — with apsidal correction
- `computeAxialPrecession(sidYearSec, solYearDays)` — standard
- `computeAxialPrecessionRealLOD(sidYearSec, solYearDays, lod)` — variable LOD
- `calcEarthPerihelionPredictive(year)` — 12-harmonic predictive formula
- `calcERD(year)` — Earth Rate of Deviation (derivative of harmonics)
- `calcPlanetPerihelionLong(theta0, period, year)` — linear precession
- `computePlanetInvPlaneInclinationDynamic(planet, year, jd)` — ascending-node-based oscillation
- `computeEarthOrbitalElements(year)` — composite convenience function

**Verification results (year 2000):**
- Eccentricity: 0.01671044 (expected ~0.01671)
- Obliquity: 23.4393° (expected ~23.44°)
- Perihelion longitude: 102.95° (expected ~102.9°)
- Precession: 25,859 years (expected ~25,772 — known model vs IAU difference)
- All 6 explore scripts pass with re-exported constants

**Key finding:** Planet inclination mean/amplitude values were stored as individual globals in script.js (lines 345-398), not in the per-planet objects. These have now been populated in the constants module's `planets` object for tool use.

**Phase 5 is COMPLETE.** Constants and orbital engine extracted. Proceed to Phase 6 (Scene Graph Engine).

### Phase 6: Scene Graph Engine
**File:** `tools/lib/scene-graph.js`
**Effort:** High (most complex part)
**Risk:** Medium (must exactly match Three.js behavior)

- Implement Matrix4 class (column-major, 4×4 multiply, compose from Euler XYZ, inverse)
- Implement Spherical conversion matching Three.js (theta=atan2(x,z), phi=acos(y/r))
- Build Node class with parent-child hierarchy and updateWorldMatrix()
- Build Earth hierarchy chain (8 precession layers: inclination H/3, ecliptic H/5, obliquity H/8, perihelion H/16 ×2, barycenter)
- **Build Moon hierarchy chain** (6 levels under Earth: apsidal precession -> apsidal-nodal 1 -> apsidal-nodal 2 -> lunar leveling cycle -> nodal precession -> Moon)
- Build per-planet chains (4 perihelion layers + planet = 5 levels each, under barycenter)
- Replicate createPlanet's 3-level structure (container → orbit → pivot + rotationAxis as siblings)
- Replicate moveModel logic (ellipse vs circular, anomaly calculation)
- Extract RA/Dec via earth.rotationAxis.worldToLocal → spherical coordinates
- Validate against PLANET_TEST_DATES reference values

#### Phase 6 Checkpoint

**Status**: COMPLETE (2026-03-06)

**What was built:**

`tools/lib/scene-graph.js` (~480 lines) — Standalone scene graph engine that computes geocentric RA/Dec for any planet, the Moon, or the Sun at any Julian Day.

**Architecture:**
- `Mat4` class: 4×4 matrix operations (multiply, compose from Euler XYZ, inverse, transformPoint)
- `Node` class: Scene graph node with position/rotation, parent-child hierarchy, world matrix computation
- `makeObjectNodes()`: Replicates Three.js createPlanet's 3-level structure (container → orbit → pivot + rotationAxis)
- `buildSceneGraph()`: Constructs the full hierarchy (Earth chain + 7 planet chains + Moon chain + Sun)
- `moveModel(graph, pos)`: Animates all objects for a given simulation position
- `computePlanetPosition(target, jd)`: Main entry point — JD → RA/Dec + distances

**Hierarchy replicated (from script.js lines 4887-4978):**
```
root (startingPoint)
  └─ earth.container (static 90° Y rotation)
     └─ earth.orbit → earth.pivot
        ├─ earthInclinationPrecession (H/3)
        │  └─ earthEclipticPrecession (H/5, tilt -amplitude)
        │     └─ earthObliquityPrecession (H/8, tilt +amplitude)
        │        └─ earthPerihelionPrecession1 (H/16, tilt -earthRAAngle)
        │           └─ earthPerihelionPrecession2 (H/16 counter, offset -ecc_base)
        │              └─ barycenter (offset ecc_amplitude)
        │                 ├─ sun
        │                 └─ [planet chains] × 7
        └─ moonApsidalPrecession
           └─ moonApsidalNodalPrecession1
              └─ moonApsidalNodalPrecession2
                 └─ moonLunarLevelingCycle
                    └─ moonNodalPrecession
                       └─ moon
```

**Each planet chain (under barycenter):**
```
PerihelionDurationEcliptic1 → PerihelionFromEarth → PerihelionDurationEcliptic2 → RealPerihelionAtSun → planet
```

**Key implementation details:**
- Euler XYZ compose matches Three.js source exactly (verified against Three.js Euler.js)
- `rotationAxis` is a sibling of `pivot` under `orbit`, not a child (matching createPlanet line 32385)
- Type I planets (Mercury, Venus): `realPeriStartPos = 180 - ascendingNode`, speed = `-2π`
- Type II (Mars): `realPeriStartPos = startpos*2`, speed includes synodic correction
- Type III (Jupiter+): `realPeriStartPos = startpos*2`, speed = `-2π`; Saturn has negative elliptic orbit radius
- Mars planet speed is negative (retrograde in model frame)

**Validation results at model start (JD 2451716.5 = 21 Jun 2000):**

| Target | Model RA | Reference RA | RA Error | Dec |
|--------|----------|--------------|----------|-----|
| Mercury | 111.193° (7.4129h) | 111.193° (7.4129h) | 0.0004° | +21.14° |
| Sun | 89.917° (5.9944h) | ~90° (6h, solstice) | ~0.08° | +23.44° |
| Moon | 317.486° (21.166h) | — | — | -10.22° |

**Validation at historical dates (Mercury, model-vs-JPL):**

| Date | RA Error | Dec Error | Notes |
|------|----------|-----------|-------|
| 2000 (start) | 0.0004° | 0.30° | Near-perfect match |
| 1802 | 0.38° | 3.50° | Model drift over 200 years |
| 1831 | 1.49° | 2.54° | Expected model-vs-reality deviation |

The growing errors at historical dates are the **model's own prediction error** vs JPL truth — not scene graph bugs. This is exactly what Phase 8 (Optimization Engine) will measure and minimize.

**Phase 6 is COMPLETE.** Scene graph engine matches script.js output. Proceed to Phase 7 (JPL Horizons Integration).

### Phase 7: JPL Horizons Integration
**File:** `horizons-client.js`
**Effort:** Low
**Risk:** Low (API already tested and working)

- Implement REST client with `fetch` (Node.js 18+)
- Response parser for RA/Dec extraction
- Result caching to `config/reference-cache.json`
- Rate limiting (avoid hammering NASA's servers)

#### Phase 7 Checkpoint (completed)

**File:** `tools/lib/horizons-client.js` (~175 lines)

**API:**
- `getPosition(target, jd)` — single JD query with cache, returns `{ra, dec}` in degrees
- `getPositions(target, jdList)` — batch query (up to 50 per API call), only fetches uncached dates
- `TARGET_CODES` — planet name → JPL body code mapping (mercury→199 through neptune→899, plus sun→10, moon→301)

**Features:**
- Uses Node.js built-in `fetch` (no dependencies)
- Disk cache at `config/jpl-cache.json` (shared with pipeline scripts, 288+ pre-existing entries)
- 200ms rate limiting between API calls
- Batch grouping: uncached dates grouped into batches of 50, cached dates returned instantly
- Parses `$$SOE`..`$$EOE` block from JPL JSON response
- Geocentric astrometric RA/Dec in decimal degrees (CENTER=500@399, QUANTITIES=1, ANG_FORMAT=DEG)

**Validation:**
- Mars at JD 2451716.5: returned RA=93.294°, Dec=24.208° (matches JPL reference)
- Batch of 3 dates: 1 cached + 2 uncached fetched in single API call (815ms)
- Cache repeat: 0ms (instant)

### Phase 8: Optimization Engine
**File:** `optimizer.js`
**Effort:** Medium
**Risk:** Low (standard algorithms)

Three strategies, in order of complexity:

**A. Sensitivity Scan**
- Vary one parameter at a time, measure total positional error
- Produces sensitivity profile: "Startpos affects RA by X minutes per degree"
- Good for understanding which parameters matter most

**B. Nelder-Mead Simplex Optimization**
- Multi-parameter optimization (2-5 params simultaneously)
- Objective: minimize weighted sum of squared RA/Dec errors
- Derivative-free, robust for this problem size (~5-13 parameters per planet)
- Standard algorithm, ~80 lines of code

**C. Residual Pattern Discovery**
- After optimization, analyze remaining errors vs time
- Autocorrelation or Lomb-Scargle periodogram to find periodic patterns
- Periodic residuals -> suggest new sinusoidal perturbation term (amplitude, period, phase)
- This is how new physics gets discovered from residuals

#### Phase 8 Checkpoint (completed)

**Files:**
- `tools/lib/optimizer.js` (~650 lines) — Engine with diagnostics + optimization for planets, Sun, and Moon
- `tools/optimize.js` (~250 lines) — CLI interface
- `tools/lib/horizons-client.js` (~210 lines) — JPL Horizons API client with disk cache
- Added `_invalidateGraph()` to `tools/lib/scene-graph.js`
- Added `rebuildDerived()` to `tools/lib/constants.js`

**Targets supported:** All 7 planets + Sun + Moon

**Diagnostics:**
- `scanOrbit(target)` — Scans full orbit, measures actual perihelion/aphelion distances, effective eccentricity. Works for planets (Sun dist), sun (Earth-Sun dist), moon (Earth-Moon dist)
- `decomposeLayerPositions(target, jd)` — Shows world position + reference distance of each layer in the chain. Different layer lists for sun (Earth chain), moon (Moon chain), and planets
- `trackPerihelion(target, yearStart, yearEnd, nOrbits)` — Tracks closest approach distance and RA. For sun: Earth perihelion; for moon: lunar perigee

**Baseline & Optimization:**
- `baseline(target, overrides?, refDates?)` — Computes model RA/Dec errors. Uses reference-data.json for planets; accepts custom refDates for sun/moon (auto-fetched from JPL via `baseline-jpl` command)
- `sensitivityScan(planet, param, lo, hi, steps)` — Single-parameter sweep with error curve
- `nelderMead(planet, paramNames, options)` — Multi-parameter Nelder-Mead simplex optimization
- `withOverrides(planet, overrides, fn)` — Temporarily patches constants, rebuilds derived values + scene graph

**Parameter injection:** Mutate-restore pattern. Overrides are applied to `C.planets[key]`, derived values rebuilt via `rebuildDerived()`, scene graph invalidated. Originals restored in `finally` block. Sun/Moon parameters bypass `rebuildDerived()`.

**Tunable parameters by target:**
- Planets: startpos, angleCorrection, solarYearInput, longitudePerihelion, ascendingNode, eclipticInclinationJ2000, orbitalEccentricity, perihelionEclipticYears
- Sun: correctionSun, eccentricityBase, eccentricityAmplitude, earthRAAngle, earthtiltMean
- Moon: moonStartposApsidal, moonStartposNodal, moonStartposMoon, moonTilt, moonEclipticInclinationJ2000, moonOrbitalEccentricity

**CLI commands:**
```
node tools/optimize.js eccentricity                    # All-target orbit scan (incl Sun, Moon)
node tools/optimize.js diagnose <target>               # Full diagnostic report
node tools/optimize.js baseline <target>               # RA/Dec errors vs reference data
node tools/optimize.js baseline-jpl <target>           # RA/Dec errors vs live JPL data
node tools/optimize.js scan <target> <param>           # Sensitivity sweep
node tools/optimize.js optimize <target> [params]      # Nelder-Mead optimization
```

**Key finding — Eccentricity Discrepancy:**
The model constructs orbits using circles + offsets, not Keplerian ellipses. The effective eccentricity differs from input by type:
- Type I (Mercury, Venus): model_e / input_e ≈ 1.33–1.43×
- Type II (Mars): model_e / input_e ≈ 1.01× (nearly correct)
- Type III (Jupiter–Neptune): model_e / input_e ≈ 1.88–1.98× (close to 2/(1+e))
- Sun (Earth orbit): model_e / input_e ≈ 1.086×
- Moon: model_e / input_e ≈ 0.997× (nearly perfect)

This is a structural property of the geometric construction, not a parameter tuning issue. Mars's Type II formula includes extra correction terms that compensate; the other types don't.

**Validation results:**
- Mars baseline: RMS 5.01° (144 reference entries), Nelder-Mead improved to 4.90° (2.1%)
- Mercury baseline: RMS 3.95° (55 entries), scan found startpos=81.4 gives 3.54° (10% better)
- Modest improvement from parameter tuning confirms the remaining error is structural
- Sun baseline (vs JPL): RMS 0.55° RA, growing from 0.51° (2000) to 0.90° (2025), Dec errors negligible (<0.006°)
- Moon baseline (vs JPL): RMS 6.27° with oscillating errors, expected for the complex 6-layer Moon chain

### Phase 9: CLI Interface & Reporting (completed)

**Status:** Built as part of Phase 8. The CLI (`tools/optimize.js`) provides all planned commands. No separate `reporter.js` needed — reporting is integrated into each command.

**Implemented commands:**
```bash
node tools/optimize.js eccentricity                        # All-target eccentricity comparison
node tools/optimize.js diagnose <target>                   # Full diagnostic (orbit scan, layers, perihelion tracking, baseline)
node tools/optimize.js baseline <target>                   # RA/Dec errors vs reference-data.json
node tools/optimize.js baseline-jpl <target>               # RA/Dec errors vs live JPL Horizons
node tools/optimize.js scan <target> <param> [--range=lo,hi] [--steps=N]  # Sensitivity sweep
node tools/optimize.js optimize <target> [params] [--max-iter=N]           # Nelder-Mead optimization
```

**Not yet implemented** (from original plan):
- `discover` — Residual pattern analysis (could be added if needed)
- `auto` — Full autonomous optimization loop (the workflow is documented in Section 8 below but not automated into a single command)

---

## 8. Execution Plan — Optimization Campaign

**Status**: COMPLETE
**Date**: 2026-03-06 (started), 2026-03-09 (completed)
**Prerequisite**: All infrastructure phases (1-9) complete

All tooling is built and validated. This section documents the execution plan and results from the systematic optimization campaign.

### 8.1 Guiding Principles

1. **Measure before changing**: Every optimization step starts with a baseline measurement and ends with a validation measurement
2. **Foundation first**: Sun errors propagate to ALL planets; Moon errors set eclipse timing limits. Fix the foundation before tuning individual planets.
3. **Isolated before cascading**: Tune low-risk params (`startpos`, `angleCorrection`) before touching params that cascade (`solarYearInput`, Earth globals)
4. **Respect structural constraints**: Never change observational data, Fibonacci structure, or H. Report Category D limitations (constant-speed) but don't try to optimize them away.
5. **Cross-validate**: After tuning any target, re-check all other targets for regressions

### 8.2 Parameters — What Can and Cannot Change

**NEVER change (observational/structural):**
- `eclipticInclinationJ2000`, `orbitalEccentricity`, `ascendingNode`, `longitudePerihelion` (JPL/SPICE data)
- `holisticyearLength` (335,008 — core model constant, tuned to align precession with IAU)
- `perihelionEclipticYears` (derived from H — Fibonacci structure)
- `moonEclipticInclinationJ2000`, `moonOrbitalEccentricity`, `moonDistance` (observational)

**CAN tune (free parameters):**
- Per-planet: `startpos`, `angleCorrection` (isolated, low risk)
- Per-planet: `solarYearInput` (cascading — watch for integer orbit count boundary)
- Per-planet: `invPlaneInclinationMean`, `invPlaneInclinationAmplitude` (inclination tuning)
- Sun/Earth: `correctionSun`, `earthRAAngle`, `earthtiltMean` (HIGH IMPACT — affects all targets)
- Sun/Earth: `eccentricityBase`, `eccentricityAmplitude` (eccentricity mechanism)
- Moon: `moonStartposApsidal`, `moonStartposNodal`, `moonStartposMoon`, `moonTilt`

### 8.3 Execution Steps

#### Step 1: Full Baseline Report (all targets)

**Goal**: Establish the "before" snapshot — current RMS errors for every target against reference data.

##### What the baseline measures

The baseline computes model RA/Dec (from the standalone scene graph engine) at specific Julian Dates, then compares against reference RA/Dec values. The error is the angular difference in degrees.

**Two comparison modes:**

| Mode | Reference source | Dates | Targets |
|------|-----------------|-------|---------|
| `baseline` | `reference-data.json` (PLANET_TEST_DATES enriched with JPL) | Event-specific: transits, oppositions, conjunctions (~1800-2200) | Planets only |
| `baseline-jpl` | Live JPL Horizons API | Consistent yearly intervals: 26 JDs from Jun 2000 to Jun 2025 | All targets |

**`baseline` mode (planets, reference-data.json):**
- Uses only entries with `ra != null && dec != null && weight > 0`
- This means only **Tier 2** entries (enriched with JPL RA/Dec via the Horizons API)
- Tier 3 entries (weight=0) are excluded
- Tier 1C Tycho Brahe data (923 Mars observations) has dec only, no RA — excluded from RMS
- Reference RA/Dec values originate from JPL DE404/DE405 (computed, not observed)
- Coverage varies greatly: Mars=144 entries, Mercury=55, Jupiter=31, Saturn=27, Venus=8, Uranus=1
- Date ranges differ per planet: Mercury 1802-2200+, Mars 1829-2197, etc.

**`baseline-jpl` mode (all targets, JPL Horizons):**
- Fetches geocentric astrometric RA/Dec from JPL Horizons at 26 yearly dates (2000-2025)
- Consistent date coverage across all targets — enables apples-to-apples comparison
- Dates are June 21 each year (aligned with model start epoch)
- Results cached in `config/jpl-cache.json` for reproducibility

**Metrics computed per target:**
- **RMS RA** — root-mean-square RA error in degrees (weighted by entry weight)
- **RMS Dec** — root-mean-square Dec error in degrees
- **RMS Total** — combined RA + Dec: `sqrt((sumRA² + sumDec²) / totalWeight)`
- **Max RA** and **Max Dec** — worst single-entry error

**For the master baseline table**: Use `baseline-jpl` for all 9 targets to get consistent comparison. Additionally run `baseline` for planets to capture the event-specific reference data (wider date ranges, more entries).

**Method**:
- Run `baseline-jpl` for all 9 targets (consistent 2000-2025 yearly comparison against JPL)
- Run `baseline` for all 7 planets (event-specific reference-data.json comparison)
- Compile into a master comparison table
- Identify worst and best performers

**Output**: Master baseline table written to `tools/results/baseline-before.md`. Summary numbers copied to Section 8.4 progress table.

#### Step 2: Sun Optimization (foundation)

**Why first**: The Sun's RA error (~0.55° RMS, growing with time) propagates as a correlated annual systematic to ALL planets. Improving the Sun improves every planet's baseline.

**Method**:
1. Sensitivity scan each Sun parameter: `correctionSun`, `earthRAAngle`, `earthtiltMean`, `eccentricityBase`, `eccentricityAmplitude`
2. Identify which params have the steepest error gradients
3. Nelder-Mead optimize the top 2-3 most sensitive params
4. Re-run Sun baseline to confirm improvement
5. Re-run ALL planet baselines to check for regressions or improvements

**Constraint**: `earthRAAngle` and `earthtiltMean` affect ALL targets. Changes here require full cross-validation.

**Known floor**: The ~1° annual sinusoidal residual from constant-speed limitation (Category D) cannot be optimized away. The optimizer should improve the slow RA drift, not the annual oscillation.

#### Step 3: Moon Optimization (eclipse foundation) — COMPLETED

**Why second**: The Moon is the second foundation body. Its original ~6.27° RMS error was the largest.

**What was done** (full details in `docs/66-moon-meeus-corrections.md`):

1. **Lunar perturbations added to moveModel** (θ corrections):
   - Equation of center (half eccentricity: 0.02745) — ~3.14° amplitude
   - Evection: -1.274° × sin(M' - 2D) — period 31.8 days
   - Variation: +0.658° × sin(2D) — period 14.77 days
   - Annual equation: -0.186° × sin(M) — period 365.25 days

2. **Meeus Ch. 47 ecliptic latitude correction** (Dec correction):
   - 13-term Fourier series for Moon's ecliptic latitude β
   - Applied as post-hoc correction in `updatePositions()`: equatorial → ecliptic → replace β → equatorial
   - Fixes the 5-layer hierarchy's node phase errors (draconitic month 30.9 vs 27.2 days)

3. **Visual 3D position correction** (eclipse visibility):
   - After computing corrected RA/Dec, the Moon's `pivotObj.position` is also updated
   - Uses pre-computed matrices (no extra `updateWorldMatrix` calls) for performance
   - The orbit ring shows the geometric circular path; the Moon mesh shows the Meeus-corrected position
   - Solar eclipses are now visually visible in the 3D scene

4. **StartPos optimized** against both JPL (7-day sampling) and solar eclipses (58 NASA GSFC events 2000-2025):
   - moonStartposApsidal: 330 → 347.622
   - moonStartposNodal: 64 → -83.630
   - moonStartposMoon: 132 → 131.930

5. **Apsidal tilt fix**: `orbitTilta: 0` (was `moonEclipticInclinationJ2000 - moonTilt`)

**Results**:
- Eclipse RMS (Moon-Sun separation): **1.26°** (was ~3.5° before Meeus latitude)
- JPL Dec RMS: **0.02°** (was 5.26°)
- JPL RA RMS: **0.25°** (was 3.41°, remainder is frame drift)
- 8 eclipses match within 0.5° (visually convincing), best: 2020-Jun-21 at 0.16°
- JPL-verified: Moon Dec above Sun at 2020-Jun-21 eclipse (both JPL and model agree)

#### Step 4: Jupiter and Saturn (resonance core)

**Why next**: Jupiter and Saturn form the 3-5-8-13-21 resonance loop with Earth. Their accuracy anchors the outer solar system.

**Method (for each)**:
1. Sensitivity scan `startpos` and `angleCorrection` (isolated, safe)
2. Nelder-Mead optimize those 2 params
3. Sensitivity scan `solarYearInput` — check if improvement exists without crossing integer orbit count boundary
4. If `solarYearInput` shows improvement AND doesn't change orbit count, include it in optimization
5. Document the remaining error and its character (systematic drift? periodic? random?)

**Jupiter-Saturn cross-check**: After tuning both, verify the great conjunction period (~19.86 yr) is preserved. The conjunction period is determined by orbit count ratios — if orbit counts don't change, the conjunction period is automatically preserved.

#### Step 5: Mars (Type II reference)

**Why here**: Mars shares d=5 with Jupiter (mirror pair). It has the most reference data (144 Tier 2 + 923 Tier 1C Tycho observations) and the best eccentricity match (Type II ≈ 1.01×).

**Method**:
1. Scan and optimize `startpos`, `angleCorrection`
2. Run baseline against both Tier 2 (JPL) and Tier 1C (Tycho Brahe) entries separately
3. Check whether Tier 1C accuracy improves or degrades — Tycho data (1582-1600) tests the model 400 years from its calibration epoch
4. Document Mars as the reference architecture for correct eccentricity

#### Step 6: Remaining planets (Mercury/Uranus, Venus/Neptune)

**Order**: Follow mirror pairs — Mercury+Uranus (d=21), then Venus+Neptune (d=34).

**Method**: Same scan → optimize → validate cycle as Step 4. For Mercury, note the large constant-speed error (±23.6°) as Category D — the optimizer should not chase this.

#### Step 7: Cross-Validation and Final Report

**Method**:
1. Run baselines for ALL 9 targets with any parameter changes applied
2. Compare against Step 1 baseline table
3. Produce a summary: per-target improvement (%), parameters changed, remaining error, error category (tunable vs structural)
4. Document recommended parameter values for `script.js`
5. If any target regressed, investigate and resolve before finalizing

**Decision point**: After Step 7, decide whether to:
- Apply the optimized values to `script.js` (conservative — parameter tuning only)
- Investigate structural improvements (Type IV eccentricity formula, new perturbation nodes)
- Add `discover` command for residual pattern analysis

### 8.4 Progress Tracking

| Step | Target | Status | Before RMS | After RMS | Params Changed |
|------|--------|--------|-----------|-----------|----------------|
| 1 | All | DONE | See below | — | H=335008, useVariableSpeed: true, dynamic perihelion phase |
| 2 | Sun | DONE | 0.714° | 0.003° | eocEccentricity & perihelionPhaseOffset derived; correctionSun: 0.5292; earthRAAngle: 1.282779; validated 1600-2200 (600yr) |
| 3 | Moon | DONE | 6.267° | 0.01° | Full Meeus Ch. 47 (60L+60B), RA+Dec override; see `docs/66-moon-meeus-corrections.md` |
| 4a | Jupiter | DONE | 1.974° | 0.06° | solarYearInput: 4330.5, eocFraction: 0.484, startpos: 13.85, 36p parallax |
| 4b | Saturn | DONE | 3.291° | 0.10° | solarYearInput: 10747, eocFraction: 0.543, startpos: 11.32, 24p parallax |
| 5 | Mars | DONE | 3.121° | 0.02° | solarYearInput: 686.931, eocFraction: -0.066, startpos: 121.47, 30p parallax |
| 6a | Mercury | DONE | 4.908° | 0.01° | eocFraction: -0.527, startpos: 83.53, 36p parallax |
| 6b | Uranus | DONE | 1.372° | 0.01° | eocFraction: 0.5, startpos: 44.88, 15p parallax |
| 6c | Venus | DONE | 3.709° | 0.24° | solarYearInput: 224.695, eocFraction: 0.436, startpos: 249.312, 36p parallax |
| 6d | Neptune | DONE | 1.496° | 0.01° | eocFraction: 0.5, startpos: 47.96, 18p parallax |
| 7 | All | DONE | — | All ≤0.24° | Cross-validated; see `docs/67-planet-parallax-corrections.md` §5 |

**Step 1 results** (JPL Horizons 2000-2025, 26 yearly dates): Full report at `tools/results/baseline-before.md` and `docs/69-optimization-baseline.md`

**Step 2 results — Sun optimization (updated for H=335,008, derived EoC constants):**
- Constants changed:
  - `eocEccentricity`: now **derived** as `eccentricityDerivedMean - eccentricityBase/2` = 0.007747
  - `perihelionPhaseOffset`: was hardcoded 2°, now **derived** from EP1 precession phase + correctionSun + perihelion date = ~0.51°
  - `correctionSun`: 0.5292 (optimized for Sun RA across 26 JPL reference points 2000-2025, validated across 1600-2200)
  - `earthRAAngle`: 1.282779 (re-tuned for solstice timing alignment after correctionSun change)
  - `perihelionRefJD`: 2451547.042 (moved to ASTRO_REFERENCE in script.js)
- Two free parameters eliminated: eocEccentricity and perihelionPhaseOffset are now pure physics derivations
- Sun RMS: **0.003°** — 20× improvement from 0.065° (with IAU precession frame correction)
- Validated across 600 years (1600-2200) with only ~0.23 arcsec/century drift from slight precession rate mismatch
- Full derivation analysis: `tools/explore/derive-eoc-constants.js`
- Documentation: `docs/65-equation-of-center.md`

**Steps 3-7 results — Planet optimization campaign:**

The remaining steps were executed as a systematic campaign covering:

1. **Per-planet EoC fractions** (Type I/II/III): Derived empirically via `tools/explore/derive-eoc-fractions.js`. Each planet gets `eocFraction × orbitalEccentricity` as its effective EoC eccentricity.

2. **Orbital period calibration**: `solarYearInput` values tuned using ISAW ancient observation data (800 BCE–1650 CE) to minimize long-term drift. See `docs/68-orbital-period-calibration.md`.

3. **Empirical parallax correction**: Up to 36-parameter correction per planet (basis functions A–AK), fitted by linear least squares against enriched JPL reference data. Per-planet tier selection via LOOCV/k-fold CV. Venus, Jupiter, Saturn enriched to ~2500 reference points. See `docs/67-planet-parallax-corrections.md`.

4. **IAU precession correction**: `tools/lib/precession.js` applies IAU 1976 precession to convert JPL J2000 RA/Dec to of-date frame before comparison, resolving the frame mismatch documented in Section 8.5.

**Final results** (all 9 targets, 2000–2200):

| Target | Before | After | Improvement |
|--------|--------|-------|-------------|
| Sun | 0.714° | 0.065° | 91% |
| Moon | 6.267° | 0.01° | 99.8% |
| Mercury | 4.908° | 0.01° | 99.8% |
| Venus | 3.709° | 0.24° | 93.5% |
| Mars | 3.121° | 0.02° | 99.4% |
| Jupiter | 1.974° | 0.06° | 97.0% |
| Saturn | 3.291° | 0.10° | 97.0% |
| Uranus | 1.372° | 0.01° | 99.3% |
| Neptune | 1.496° | 0.01° | 99.3% |

All 9 targets within 0.24°. Seven under 0.10°. Average improvement: 97%.

### 8.5 JPL Reference Frame Limitation — Critical Finding

**The Sun's apparent 0.113° RMS error against JPL is almost entirely a coordinate frame mismatch, not a model error.**

**Analysis:**
The Sun RA error grows linearly at 54.1 arcsec/yr. After removing this linear trend, the residual is only **0.003°** (0.01 arcsec). The linear drift matches the **precession of the equinoxes** projected into RA at the June solstice position:

```
Predicted frame drift at RA ≈ 90° (solstice):
  Δα = m + n·sin(α)·tan(δ) = 46.1 + 20.04·sin(90°)·tan(23.44°) = 54.8 arcsec/yr

Observed drift: 54.1 arcsec/yr (match to 1.3%)
```

**Root cause:**
- **JPL Horizons** returns astrometric RA/Dec in the **ICRF frame** (fixed to J2000 equinox, tied to distant quasars). This frame does not precess — the equinox direction is frozen at the year 2000 position.
- **Our model** computes RA/Dec in the **of-date equatorial frame** — the Earth chain precesses (the `earth` node rotates at -2π/(H/13)), so the `rotationAxis` reference follows the current equinox, as it does in physical reality.
- The difference between these frames is exactly the general precession: ~50.3 arcsec/yr in ecliptic longitude, projecting to ~54.8 arcsec/yr in RA at the solstice.

**Implication:**
The model's of-date coordinates are arguably **more physically meaningful** than JPL's frozen J2000 frame. JPL's ICRF is an arbitrary convention — they previously used B1950, switched to J2000 in 1984, and the frame will need updating again as the equinox continues to precess. The model tracks the actual moving equinox naturally through its precession layers.

**Resolution — IAU 1976 Precession Correction (implemented):**

The frame mismatch was resolved by implementing IAU 1976 precession correction in `tools/lib/precession.js`. The `j2000ToOfDate()` function converts JPL J2000 RA/Dec to the model's of-date frame before comparison. This is applied automatically in the optimizer's baseline function.

Impact of the correction:
- Jupiter: 1.91° → 0.37° (81% improvement)
- Saturn: 1.31° → 0.46° (65% improvement)
- Uranus: 1.76° → 0.20° (89% improvement)
- Sun: frame drift eliminated, true model error visible

All baselines reported in the progress table above include the precession correction.

---

## 9. Autonomous Claude Workflow (reference)

Once the tool is built, Claude runs this self-improving loop in two stages:

```
+-----------------------------------------------------+
|  STAGE A -- Fibonacci Chain Validation (Phase 2)     |
|  (Jupiter -> Saturn -> Earth first)                  |
+-----------------------------------------------------+
|  A1. Run exploration scripts to verify orbit counts  |
|      and conjunction periods                         |
|  A2. Compare great conjunction dates against         |
|      observed/computed dates                         |
|  A3. Verify 3-5-8-13-21 beat frequency loop closure |
+-----------------------------------------------------+
|  STAGE B -- Per-Planet Optimization (Phases 8-9)     |
|  (following planet priority order below)             |
+-----------------------------------------------------+
|  B1. REPORT                                          |
|      node tools/optimize.js report                   |
|      -> Baseline accuracy per planet                 |
|      -> Identify worst-performing planet             |
+-----------------------------------------------------+
|  B2. SCAN                                            |
|      node tools/optimize.js scan <planet> <params>   |
|      -> Which parameters matter most?                |
|      -> Sensitivity profiles                         |
+-----------------------------------------------------+
|  B3. OPTIMIZE                                        |
|      node tools/optimize.js optimize <planet>        |
|      -> Run Nelder-Mead on top-sensitivity params    |
|      -> Output improved parameter values             |
+-----------------------------------------------------+
|  B4. VALIDATE                                        |
|      node tools/optimize.js validate <planet>        |
|      -> Confirm improvement against JPL Horizons     |
|      -> Check no regression on other planets         |
+-----------------------------------------------------+
|  B5. DISCOVER                                        |
|      node tools/optimize.js discover <planet>        |
|      -> Analyze residual patterns                    |
|      -> Suggest new perturbation terms if found      |
+-----------------------------------------------------+
|  B6. ITERATE                                         |
|      -> Update parameters.json                       |
|      -> Repeat for next planet                       |
|      -> When all planets improved, report summary    |
+-----------------------------------------------------+
```

**Priority order**: Sun/Moon (foundation -- eclipse timing tests both) -> Jupiter -> Saturn -> Earth (the 3-5-8-13-21 core) -> Mars (shares d=5 with Jupiter) -> Mercury/Uranus (d=21 pair) -> Venus/Neptune (d=34 pair)

---

## 10. Key Source Files

| File | Lines | What to extract/reference |
|------|-------|--------------------------|
| `src/script.js` | 28-447 | All input constants (including Moon constants at lines 78-88) |
| `src/script.js` | 2160-4220 | Planet and Moon object creation (orbital parameters) |
| `src/script.js` | 5074-5172 | Scene graph hierarchy wiring |
| `src/script.js` | 29078+ | `updatePositions()` -- RA/Dec computation |
| `src/script.js` | 29453+ | `moveModel()` -- orbital position updates + EoC |
| `src/script.js` | 31916-32000 | Obliquity, eccentricity, inclination functions |
| `tools/lib/constants.js` | all | Shared constants (mirrors script.js) |
| `tools/lib/scene-graph.js` | all | Standalone scene-graph engine |
| `tools/lib/optimizer.js` | all | Nelder-Mead optimizer |
| `tools/lib/precession.js` | all | IAU 1976 precession correction |
| `docs/41-scene-graph-hierarchy.md` | all | Complete scene graph hierarchy documentation |
| `docs/10-fibonacci-laws.md` | all | Six Fibonacci Laws, mirror pairs, resonance loop, psi-constant |
| `docs/hidden/testscripts/*.js` | all | ~80 existing standalone optimization scripts |

---

## 11. Verification Plan

1. **Reference data audit**: Every entry in `reference-data.json` has tier, weight, source, and reliability flags
2. **PLANET_TEST_DATES updated**: All in-code entries annotated with tier/weight/source/dateReliable/positionReliable/notes
3. **Matrix chain validation**: Compute Mercury RA at JD 2451716.5 -> must match 7.412897222h (+/-0.1 min of time)
4. **All-planet cross-check**: Compare standalone engine output for all `PLANET_TEST_DATES` entries with RA values -> must match browser simulation within 0.01 deg
5. **JPL baseline**: Run `validate` for years 2000-2020 -> establish error metrics before optimization
6. **INPOP cross-check**: For a sample of dates, verify JPL and INPOP agree (confirming Tier 2 data is consistent)
7. **Round-trip test**: After optimization, plug improved values into `script.js` constants -> browser simulation shows same improvement
8. **Regression check**: Optimizing one planet must not degrade others (Earth parameters are shared)
9. **Tier-weighted scoring**: Report separate accuracy metrics per tier (Tier 1 accuracy matters most)
10. **Fibonacci chain verification**: Exploration scripts confirm orbit counts, conjunction periods match observations, and 3-5-8-13-21 beat loop closes exactly
11. **Moon cycle verification**: Model's Saros, nodal precession (18.6yr), and apsidal precession (8.85yr) periods match known values
12. **Eclipse timing test**: Model predicts known modern eclipses (1900-2025) within acceptable timing error
13. **Year-length verification**: Model's tropical, sidereal, and anomalistic year lengths match observed values; seasonal length asymmetry is reproduced
14. **Sun annual motion investigation**: Residual between model's Sun position and observed Sun position quantified; determination made whether existing eccentricity chain captures the annual variation

---

## 12. Open Questions

### Resolved (from source reliability investigation)

1. ~~**What counts as a source?**~~ **RESOLVED:** ALL current PLANET_TEST_DATES data is computed from JPL DE/VSOP87 models. The NASA GSFC transit catalogs are predictions, not observations. Only the event dates (not positions) qualify as Tier 1. We need to add actual observed transit contact times and cross-validate with the independent INPOP ephemeris.

2. ~~**Are NASA transit catalogs observed?**~~ **RESOLVED:** No. Confirmed on NASA's own transit page: predictions are computed from algorithms in the Explanatory Supplement and Meeus.

### Still Open -- Epistemological

3. **Circular reasoning risk**: Optimizing to match JPL makes our model a worse version of JPL. The model's value lies in its structural simplicity (Holistic-Year framework, Fibonacci relationships). Optimization should preserve structure and only tune free parameters.

4. **Historical vs modern accuracy**: The model spans 300,000+ years; JPL is reliable for ~500 years. Should we weight modern-era accuracy (where JPL is a good proxy) or prioritize matching ancient observed events (where JPL itself may be wrong)?

5. **Tier 1 data effort**: How much effort to invest in digitizing historical observations (RGO Bulletin 181, Newcomb's Mercury transit analysis, Babylonian diary entries, eclipse records) before building the optimization engine? This is high-value but time-consuming. Eclipse records are the most abundant ancient dataset.

6. **Sun's equation of center -- observation or model artifact?** The ~2 deg annual variation in the Sun's apparent speed is real (unequal seasons, known since antiquity). But in our geocentric model, the Sun orbits an off-center point (perihelion-of-earth), which naturally produces non-uniform apparent motion. Is the existing eccentricity chain already capturing this effect? The Phase 1 investigation (using eclipse timing and year-length tools) must answer this before we decide whether to add an epicycle or tune existing parameters. We must not assume the standard heliocentric interpretation without testing it against our model's actual behavior.

### Still Open -- Technical

7. **Scene graph scope**: Start with simplified model or build full 8-node Earth hierarchy + 6-layer Moon hierarchy from the start?

8. **Which bodies first?**: Sun/Moon first (foundation, eclipse tests), then Jupiter-Saturn-Earth (resonance core), then other planets?

9. **Moon perturbation terms**: The Moon has dozens of known perturbation terms (evection, variation, annual equation, parallactic inequality). How many are captured by the existing 6-level hierarchy vs. needing new nodes?

10. **New perturbation terms**: Auto-add correction terms from pattern discovery, or report for manual review?

11. **Integration with browser model**: Generate a patch file for `script.js` or output new constant values for manual update?
