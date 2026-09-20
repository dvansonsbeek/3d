---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:b8b18424a3435e20
status: current
---

# Geometric Orbital Elements — the No-Chain Bodies

The seven chain planets and Earth read their displayed and
machinery-consumed elements (nodes, inclinations, heights) from the
engine-D element chain — the element set of date against the engine's own
banked invariable plane ([doc 04](04-dynamic-elements-overview.md),
[doc 05](05-invariable-plane-overview.md)). This document describes the
**geometric-elements device** that remains in the code for everything the
chain does not serve:

- the **no-chain bodies** — Pluto, Halley's Comet, Eros (and Ceres, which
  carries the same S&S-style node constants);
- **Earth's engine-K devices** — the H/3 inclination oscillation and −H/5
  node regression that anchor the certified historical-era machinery;
- the **probe-pinned reference implementations**
  (`calculateDynamicAscendingNodeFromTilts`,
  `computePlanetInvPlaneInclinationDynamic`), which the historical gate
  suite is calibrated on.

The constants documented here (`ascendingNodeCyclesIn8H`, the inclination
means/amplitudes/cycle anchors, the verified J2000 nodes) ship in
`public/input/model-parameters.json` and `tools/lib/constants.js`.

> **Scope note (ESSRT).** The oscillation formula (`i(t) = mean + amplitude × cos(ω̃_ICRF(t) − cycleAnchor)`), the two-normal dot product for ecliptic inclination, and the perturbation formula `dΩ/dε = −sin(Ω)/tan(i)` are scale-invariant. Period denominators are Fibonacci divisors (H/3, H/5, H/13, 8H/N) that stay constant at any epoch; literal year counts, the balanced-year anchors, and the J2000 calibration constants are J2000-anchored snapshots. Under [ESSRT](99-expanding-solar-system-resonance-theory.md), H(t) evolves at deep time via Drivers 1 (LOD growth) and 2 (Kepler), scaling every literal year count proportionally while leaving the divisor structure intact.

---

## Part 1: The Inclination Oscillation (invariable plane)

### The ICRF Perihelion Approach

The device computes a body's dynamic inclination to the invariable plane
from its ICRF perihelion longitude:

```
i(t) = mean + amplitude × cos(ω̃_ICRF(t) - cycleAnchor)
```

Where:
- `mean` = computed from the J2000 constraint (mean = inclJ2000 − amplitude × cos(ω̃_J2000 − cycleAnchor))
- `amplitude` = the Law-4 construction ψ / (d × √m), see [doc 10](10-fibonacci-laws.md)
- `ω̃_ICRF(t)` = current ICRF perihelion longitude (ecliptic perihelion minus general precession H/13)
- `cycleAnchor` = per-body anchor: the ICRF perihelion longitude where MAX inclination occurs (MIN for Saturn, the anti-phase body)

As the perihelion sweeps its cycle: at `ω̃ = anchor`, maximum inclination
(mean + amplitude); at `anchor + 90°`, mean; at `anchor + 180°`, minimum.

```javascript
function computePlanetInvPlaneInclinationDynamic(planet, currentYear) {
  const icrfRate = 360 / icrfPeriod;               // negative for retrograde bodies
  const periLongCurrent = periLongJ2000 + icrfRate * (currentYear - 2000);
  const phaseRad = (periLongCurrent - cycleAnchor) * Math.PI / 180;
  const sign = (planet === 'saturn') ? -1 : 1;     // Saturn is anti-phase
  return mean + sign * amplitude * Math.cos(phaseRad);
}
```

### Per-Planet Cycle Anchors

All seven fitted planets share the same balanced-year anchor — **n=7,
year ≈ -<!--v:systemResetYearPlain-->2,649,854<!--/v-->**, the oldest of
the eight anchors in the current 8H octave:

| Planet | Cycle Anchor | Balance Group | n | Balanced Year | ICRF Direction | Incl. Trend at J2000 |
|--------|-------------|---------------|----------|-------------|----------------|----------------------|
| Mercury | <!--v:mercuryInclCycleAnchor-->234.52<!--/v-->° | In-phase | n=7 | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | Retrograde | Decreasing |
| Venus | <!--v:venusInclCycleAnchor-->218.64<!--/v-->° | In-phase | n=7 | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | Retrograde | Decreasing |
| Earth | 21.77° | In-phase | n=0 (locked) | <!--v:balancedYear-->-302,635<!--/v--> | Prograde | Decreasing |
| Mars | <!--v:marsInclCycleAnchor-->236.07<!--/v-->° | In-phase | n=7 | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | Retrograde | Decreasing |
| Jupiter | <!--v:jupiterInclCycleAnchor-->287.06<!--/v-->° | In-phase | n=7 (= n=0)* | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | Retrograde | Decreasing |
| **Saturn** | **<!--v:saturnInclCycleAnchor-->116.26<!--/v-->°** | **Anti-phase** | n=7 (= n=0)* | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | **Retrograde** | **Increasing** |
| Uranus | 21.33° | In-phase | n=7 (= n=0)* | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | Retrograde | Decreasing |
| Neptune | <!--v:neptuneInclCycleAnchor-->174.04<!--/v-->° | In-phase | n=7 | -<!--v:systemResetYearPlain-->2,649,854<!--/v--> | Retrograde | Decreasing |
| Pluto | <!--v:plutoInclCycleAnchor-->203.32<!--/v-->° | — | — | — | Retrograde | — |

\* Uranus's ICRF perihelion period (H/10) divides H exactly, so its n=7 phase coincides with n=0; Jupiter (8H/65) and Saturn (8H/169) carry non-integer cycles per H, so their per-anchor phases differ.

Key facts:
- Earth's anchor is set independently from the IAU obliquity model and
  locked to n=0 — consistent with n=7 because Earth's H/3 ICRF return
  divides H exactly (3×).
- Saturn is anti-phase: at MAX inclination at n=7 while the others are at MIN.
- Earth is the sole body with prograde ICRF perihelion motion (+H/3).
- The means and amplitudes live under `<planet>InvPlaneInclinationMean` /
  `…Amplitude` — see [Constants Reference](20-constants-reference.md).

### ICRF Perihelion Periods

The oscillation period is the absolute ICRF perihelion period (ICRF rate =
ecliptic rate − general precession H/13). Literal values J2000-evaluated:

| Planet | Ecliptic Period | ICRF Period | ICRF Direction |
|--------|----------------|-------------|----------------|
| Mercury | `H × 8/11` | `8H/93` ≈ <!--v:mercuryPeriPeriodICRF-->28,844<!--/v--> yr | Retrograde |
| Venus | `−8H/6` | `8H/110` ≈ <!--v:venusPeriPeriodICRF-->24,387<!--/v--> yr | Retrograde |
| Earth | `H / 16` | `H/3` ≈ <!--v:earthPeriPeriodICRF-->111,772<!--/v--> yr | Prograde (sole) |
| Mars | `H × 8/36` | `8H/68` ≈ <!--v:marsPeriPeriodICRF-->39,449<!--/v--> yr | Retrograde |
| Jupiter | `8H/39` | `8H/65` ≈ <!--v:jupiterPeriPeriodICRF-->41,270<!--/v--> yr | Retrograde |
| Saturn | `−8H/65` | `8H/169` ≈ <!--v:saturnPeriPeriodICRF-->15,873<!--/v--> yr | Retrograde |
| Uranus | `H / 3` | `H/10` ≈ <!--v:uranusPeriPeriodICRF-->33,532<!--/v--> yr | Retrograde |
| Neptune | `H × 2` | `2H/25` ≈ <!--v:neptunePeriPeriodICRF-->26,825<!--/v--> yr | Retrograde |
| Pluto | `H` | `H/12` ≈ <!--v:plutoPeriPeriodICRF-->27,943<!--/v--> yr | Retrograde |

All ICRF perihelion periods divide evenly into 8H = <!--v:eightH-->2,682,536<!--/v--> years
at J2000, so all bodies return simultaneously to their balanced-year
configuration.

---

## Part 2: Ecliptic Inclination from Two Normals

The device's ecliptic inclination is the angle between the body's and
Earth's orbital-plane normals, each built in invariable-plane coordinates
from `(i, Ω)`:

```
n = (sin(i)·sin(Ω), sin(i)·cos(Ω), cos(i))
cos(i_ecliptic) = n_planet · n_earth
```

with both inclinations from Part 1's oscillation law and both nodes from
Part 3's linear regressions. The result is written each frame to
`o.<body>EclipticInclinationDynamic` (and
`o.<body>InvPlaneInclinationDynamic` for the invariable-plane value) by
`updateDynamicInclinations()`.

### Two Frames — Be Careful Which One You Mean

A body's "ecliptic inclination" is two distinct quantities that agree
only at the J2000 instant:

1. **Inclination to the J2000 ecliptic** (fixed in inertial space) — the
   frame JPL publishes (*"mean ecliptic and equinox of J2000"*,
   [Approximate Positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html)).
2. **Inclination to the ecliptic of date** — the reference plane itself
   moves: Earth's plane oscillates at H/3 and its node regresses at −H/5,
   shifting the reference by ~0.01°/cy.

The Earth-plane drift is larger than several planets' trends and flips
their sign (e.g. Mercury: increasing in the moving frame, +0.00488°/cy;
decreasing in the J2000-fixed frame, −0.00605°/cy vs JPL
<!--v:mercuryEclInclTrendDegPerCy-->-0.00595<!--/v-->°/cy). Only
inclination needs this frame correction among the Keplerian elements —
eccentricity, a, and ω are frame-independent; ϖ's frame dependence is
negligible over rate-comparison windows; Ω's was handled in the fit; and
positions are compared in the ICRF directly. **Always compare against the
J2000-fixed frame when comparing to JPL `dI/dt`.** The device's fitted
constants match JPL's J2000-fixed trends in sign for all seven fitted
planets, ~4.3″/century total error.

---

## Part 3: Node Regressions and the Tilt-Derived Ecliptic Node

### Ascending node on the invariable plane (linear regression)

Each body's Ω on the invariable plane regresses linearly from its J2000
anchor. For the fitted planets the period is `−(8H)/N` with N stored as
`ascendingNodeCyclesIn8H` (integers fit to JPL J2000-frame ecliptic-
inclination trends; Jupiter and Saturn share N=36 — the gas-giant pair's
nodes regress in lockstep); Earth regresses at `−H/5` (the ecliptic
precession rate, ≈ <!--v:hDiv5-->67,063<!--/v--> yr); the no-chain bodies
(Pluto, Halley's, Eros) use their ecliptic perihelion period as the
regression period.

```javascript
Ω(t) = Ω_J2000 + (360 / period) × (year − 2000)     // period negative: retrograde
```

The canonical engine implementation is `computeAscendingNodeInvPlane()`
in [tools/lib/orbital-engine.js](../tools/lib/orbital-engine.js).

### Verified J2000 node anchors

Two sets of J2000 starting values are maintained: the published Souami &
Souchay (2012) nodes, and **verified** values calibrated so the two-normal
construction reproduces the JPL J2000 ecliptic inclinations exactly
(closed form: `Ω_P = atan2(ex, ey) ± acos(C/(A·R))` with
`C = cos(i_target) − cos(i_P)·ez`, `A = sin(i_P)`, `R = √(ex²+ey²)`),
given Earth's reference Ω of <!--v:earthAscNodeJ2000-->284.51<!--/v-->°
(S&S 2012):

| Body | S&S Value (°) | Verified Value (°) | Δ from S&S |
|--------|---------------|--------------------|-----------|
| Mercury | 32.22 | 32.83 | +0.61° |
| Venus | 52.31 | 54.70 | +2.39° |
| Earth | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | 0.00° |
| Mars | <!--v:marsOmegaSS-->352.95<!--/v--> | <!--v:marsOmegaJ2000-->354.87<!--/v--> | +1.92° |
| Jupiter | <!--v:jupiterOmegaSS-->306.92<!--/v--> | <!--v:jupiterOmegaJ2000-->312.89<!--/v--> | +5.97° |
| Saturn | <!--v:saturnOmegaSS-->122.27<!--/v--> | <!--v:saturnOmegaJ2000-->118.81<!--/v--> | -3.46° |
| Uranus | <!--v:uranusOmegaSS-->308.44<!--/v--> | <!--v:uranusOmegaJ2000-->307.80<!--/v--> | -0.64° |
| Neptune | <!--v:neptuneOmegaSS-->189.28<!--/v--> | <!--v:neptuneOmegaJ2000-->192.04<!--/v--> | +2.76° |
| Pluto | <!--v:plutoOmegaSS-->107.06<!--/v--> | <!--v:plutoOmegaJ2000-->101.06<!--/v--> | -6.00° |

### The tilt-derived ecliptic ascending node

The **ecliptic** ascending node (`o.<body>AscendingNode`) responds to
Earth's changing obliquity: as the ecliptic tilts, the line of nodes
shifts. The device (`calculateDynamicAscendingNodeFromTilts`, in both
`src/script.js` and `tools/lib/orbital-engine.js`) integrates

```
dΩ/dε = −sin(Ω) / tan(i(t))
```

from the J2000 anchor, segment by segment, splitting at obliquity extrema
and at inclination crossovers, with three roles kept separate:

| Role | Parameter | What it controls |
|------|-----------|-----------------|
| **Driver** | `dε` (obliquity change per segment) | How much the ecliptic tilts |
| **Direction** | Earth incl vs body incl at the segment midpoint | Sign of the effect (+1 / −1) |
| **Rate factor** | `1/tan(i(t))` (dynamic ecliptic inclination at midpoint) | How efficiently tilt converts to node shift |

Earth's own invariable-plane inclination acts as the threshold: bodies
inclined **above** Earth's see their node **decrease** when obliquity
decreases; bodies **below**, increase; bodies whose inclination falls
inside Earth's range (0.85°–2.12°) can cross over and reverse direction.
The J2000 orientation is encoded as `orbitTilta = sin(Ω)·i`,
`orbitTiltb = cos(Ω)·i` (so `Ω = atan2(a, b)`, `i = √(a²+b²)`).

**Worked example — Mars, 2000 → 2100:** base rate
`−sin(49.557°)/tan(1.850°) ≈ −23.6` °/° of obliquity change; Earth's
inclination (~1.578°) is below Mars's (1.850°), so direction = −1;
obliquity decreases by ~0.013° over the century. Effect =
(−23.6) × (−1) × (−0.013°) = **−0.307°** — matching the integrated result
(49.5559° → 49.2508°, −0.305°). Jupiter over the same century moves the
**opposite** way (+0.56°): its inclination (1.305°) sits below Earth's,
flipping the direction factor to +1.

### Known bounds of the geometric device

1. The obliquity driver `dε` includes both the H/3 orbital-plane and H/8
   axial components, though strictly only H/3 tilts the ecliptic — the
   H/8 amplitude is smaller and the calibration was fitted with this
   behavior; over centuries the difference is negligible.
2. The body's invariable-plane node precession is captured only through
   the dynamic ecliptic inclination, not as a separate node shift.
3. The device produces the secular oscillation pattern, not the full
   N-body gravitational node rates — for the chain planets those rates
   come from the chain itself, which is why the chain replaced this
   construction for them.

---

## J2000 Static Reference Values

Ecliptic ascending nodes encoded in `orbitTilta`/`orbitTiltb` (epoch 2000):

| Body | Ascending Node (Ω) |
|--------|-------------------|
| Mercury | <!--v:mercuryAscNodeEclJ2000-->48.33033155<!--/v-->° |
| Venus | <!--v:venusAscNodeEclJ2000-->76.67877109<!--/v-->° |
| Mars | <!--v:marsAscNodeEclJ2000-->49.55737662<!--/v-->° |
| Jupiter | <!--v:jupiterAscNodeEclJ2000-->100.4877868<!--/v-->° |
| Saturn | <!--v:saturnAscNodeEclJ2000-->113.6452856<!--/v-->° |
| Uranus | 74.00919023° |
| Neptune | <!--v:neptuneAscNodeEclJ2000-->131.7853754<!--/v-->° |
| Pluto | 110.30393° |
| Halley's Comet | 58.42008° |
| Eros | 304.30993° |

J2000 ecliptic inclinations (reference targets for the calibration):
Mercury 7.00501638°, Venus 3.3946018°, Mars 1.84971028°, Jupiter
1.30450732°, Saturn 2.4853834°, Uranus 0.77234317°, Neptune 1.768273°,
Pluto 17.14175°.

---

## Code Locations

| Component | Location |
|-----------|----------|
| Inclination oscillation | `computePlanetInvPlaneInclinationDynamic()` in `src/script.js` |
| Ecliptic inclination (two normals) | `updateDynamicInclinations()` in `src/script.js`; `computeEclipticInclination()` in `tools/lib/orbital-engine.js` |
| Ecliptic node (tilt-derived) | `calculateDynamicAscendingNodeFromTilts()` in `src/script.js` and `tools/lib/orbital-engine.js` |
| Invariable-plane node (linear) | `computeAscendingNodeInvPlane()` in `tools/lib/orbital-engine.js` |
| Frame updates | `updateAscendingNodes()`, `updateOrbitalPlaneRotations()` in `src/script.js`; `moveModel()` in `tools/lib/scene-graph.js` |
| Constants | `public/input/model-parameters.json` (`ascendingNodeCyclesIn8H`, means/amplitudes/anchors) |

Verification scripts: [inclination-verification.js](../tools/verify/inclination-verification.js), [ascending-node-verification.js](../tools/verify/ascending-node-verification.js), [ascending-node-souami-souchay.js](../tools/verify/ascending-node-souami-souchay.js), [analytical-ascending-nodes.js](../tools/verify/analytical-ascending-nodes.js).

---

## Related Documents

- [04 - Orbital Elements Overview](04-dynamic-elements-overview.md) — the chain (the only planet path) and where this device still applies
- [05 - The Invariable Plane](05-invariable-plane-overview.md) — the plane, heights, and node conventions
- [10 - The Six Relations](10-fibonacci-laws.md) — the Law-4 amplitude construction and balance groups
- [20 - Constants Reference](20-constants-reference.md) — all inclination and node constants
- [99 - Expanding Solar System Resonance Theory](99-expanding-solar-system-resonance-theory.md) — deep-time scaling of H(t)
