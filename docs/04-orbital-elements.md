---
docVersion: 1.0
modelVersion: v27.0
coefficients: sha256:1d7ef7b022b91f6c
status: current
---

# Orbital Elements: the Chain and the Engine-K Hierarchy

How every body in the simulator gets its orbital elements. There are
two tiers, and knowing which body sits on which tier answers most
"where does this number come from?" questions:

1. **The seven planets — the Keplerian chain.** The model's own
   N-body-derived element chain is **the only planet path**: the
   simulator renders the planets, their orbit rings, traces, perihelion
   markers, panels and the invariable-plane machinery (heights, mass
   gauge, Sun-SSB) from it.
2. **Earth, the Moon and the Sun — the engine-K hierarchy.** The
   certified historical-era devices: Earth's spin/tides/precession-clock machinery
   and the Moon's 3D precession hierarchy. This is the two-engine
   interface; the historical gate suite is calibrated on it.

The geometric elements device that once carried the no-chain bodies was
deleted at plan 07 R5 (the record: [doc 109 §23](109-model-nbody-engine.md)).

---

## Tier 1: The Keplerian Chain (the planets)

The shared implementation is `@essrt/physics/planets/keplerian-chain`
(one home; consumed by `tools/lib/keplerian-chain.js` in Node and by the
browser scene through the embedded chain artifact).

**Source-of-truth doctrine** (plan 02 §P5): the orbital dynamics engine (the N-body chain) is the truth because
it is causally ours. The only inputs are:

1. the **J2000 Horizons state vectors** — the anchor, the numbers left to
   nature; and
2. **element evolution measured by the model's own N-body pipeline** —
   the governed artifact `data/nbody-secular-frequencies.json`: era-typed
   window rates, the multi-mode secular tables, and the derived periodic
   layer, regenerated from the constants whenever they change (a changed
   planet mass propagates engine → artifact → chain).

No Meeus/JPL/Laskar series or rates enter the chain, ever; external
ephemerides are anchors and comparison surfaces only. The model's planet
positions MAY differ from JPL — that difference is published model
content, not a defect.

**What the chain serves, per body and date (JD):**

- **Elements of date** — `a`, `e`, ecliptic inclination and node, longitude
  of perihelion, mean longitude (`_chainElementsOfDate` in the scene), plus
  the inclination and node **on the engine's own invariable plane** (the
  K5c s-frame; published node longitudes go through the derived
  Souami & Souchay origin conversion — see
  [doc 05](05-invariable-plane-overview.md)).
- **Heliocentric positions** — ecliptic-J2000 vectors (`_chainHelioAU`),
  which feed the rendered orbits, the plane heights (`h = r⃗ · ẑ_inv`),
  the mass-weighted balance gauge and the Sun-SSB chart.
- **Secular shapes** — the panels' precession attribution (base mode /
  largest companion / remainder with % shares) reads the chain's own
  secular modes (`_chainSecularShape`); long-window charts evaluate the
  chain's secular skeleton, with the banked deep secular series overriding
  where loaded (default-on; inside each planet's measured boundary the
  override is a no-op — the chain serves).

**Matched pair**: the chain module is hashed as an input of the governed
artifact — terms and evaluation form ship together. The epoch anchor is
J2000.0 (JD 2451545.0, TT); calendar mapping goes through the model's own
JD→year machinery (a half-day slip is 2° of Mercury mean longitude).

The engine's record: [doc 109](109-model-nbody-engine.md)
(the model's own N-body engine, the measured planetary frequencies, and
the retirements).

## Tier 2: The Engine-K Hierarchy (Earth, Moon, Sun)

Earth's own motion — spin, the composed precession clock T_p(t), tides, the cardinal
points, the one-source movement — stays on the engine-K hierarchy and is
documented where it lives: [doc 11](11-length-day-year-formulas.md)
(years and days), [doc 41](41-scene-graph-hierarchy.md) (the Sun's placement),
[doc 40](40-architecture.md) (the one-source movement),
[doc 99](99-expanding-solar-system-resonance-theory.md) (ESSRT).

Earth's invariable-plane inclination and node of date are the one-source
engine reading on every surface (the panel, the API's
`earth.inclinationDeg`/`ascendingNodeDeg`, the registry); the retired
orbital-plane wheels are recorded in [doc 109 §23](109-model-nbody-engine.md).

### Mean versus osculating — which element Earth publishes

Two different things are both called "Earth's eccentricity" or "Earth's
perihelion", and the model publishes one of them on every surface.

The **osculating** element is the ellipse the Earth–Moon barycentre would
follow if every other planet vanished at this instant. It is exact for the
instant and it wobbles: the planets pull the barycentre's orbit about, and the
osculating perihelion swings by a few hundred arcseconds with Jupiter's
11.9-year period, with smaller terms at the other synodic periods. JPL's state
vectors are osculating, and so is the planet chain's Earth anchor (the J2000
seed).

The **mean** element is that wobble averaged out. What remains is the slow
motion: the perihelion advancing about 1,161″ per century against the fixed
stars (Simon et al. 1994: 1,161.2), the eccentricity falling 4.2e-5 per
century today, and over tens of thousands of years the Laplace–Lagrange swings
that take e between about 0.005 and 0.06. "Mean" therefore does not mean
constant — it is a function of time, and the averaging window decides which
terms count as fast. The model's published e(t) and ϖ(t) are mean elements of
date: the ±10-Myr N-body run averaged over 1 kyr in the frame co-rotating with
the vector (a plain Cartesian average of a rotating, shrinking vector is biased
at every node — [doc 111 §1.27](111-measured-traps-and-gate-origins.md)) and
anchored at J2000 on its own node, where it reads
<!--v:earthMeanPerihelionJ2000Deg-->102.9369<!--/v-->° and
<!--v:earthMeanEccentricityJ2000-->0.0167083<!--/v--> against Simon's 102.9373°
and 0.0167086. The eclipse Sun's equation of centre reads the same function;
the fast wobble reaches the Sun's longitude through the planetary completion's
direct terms, never through the elements. The band in between — periods from a
decade or two up to about two thousand years, the Jupiter–Saturn great
inequality among them — is carried by neither; it is worth 0.4″ on the Sun and
is recorded, not modelled ([doc 109 §23.4](109-model-nbody-engine.md)).

The Framework Verification panel's **Eccentricity** and **Perihelion
Longitude** categories plot these mean elements of date against Meeus's
polynomials inside ±10 kyr and La2004 across ±250 kyr. Its two exhibit
categories **Perihelion — osculating vs mean** and **Eccentricity — osculating
vs mean** (plan 22) draw the osculating orbit beside the mean on their own
windows, shortest first (1990–2030, 1950–2050, 1800–2200, 1000–2500; the
hover steps by 1, 5 or 10 years with the window): the osculating curve is the
generated table `data/earth-osculating-wobble.json` — the model's own
nine-body integration of the J2000 seed with the 1PN term and the lunar
quadrupole over 1000–2500 every 20 days (`tools/verify/earth-osculating-wobble.js`,
whose window mean of osculating − mean reads +0.39″ / 1.8e-7: the series is
the mean element) — so a reader sees the few-hundred-arcsecond Jupiter wobble
around the slowly turning mean, and in the residual view the wobble alone.

### The Moon

The Moon's dynamic elements are computed by `updateMoonOrbitalElements()`
from its own 3D precession hierarchy — not from Earth's plane devices and
not from the chain:

```
earth.pivotObj
  └── moonApsidalPrecession    (Y-rot: ~8.85 yr prograde, tilt: −1.54°)
      └── coupling layers       (apsidal-nodal interaction)
          └── moonNodalPrecession  (Y-rot: ~18.6 yr retrograde, tilt: 5.14°)
              └── moon             (Y-rot: ~27.3-day orbital motion)
```

| Aspect | Planets (chain) | Moon |
|--------|---------|------|
| **Ascending node source** | Element set of date | Orbit plane normal from `moonNodalPrecession.containerObj.matrixWorld` |
| **What drives Ω** | The chain's measured node evolution | 3D nodal precession chain (~18.6 yr retrograde) |
| **What drives ω/ϖ** | The chain's measured perihelion evolution | 3D apsidal precession chain (~8.85 yr prograde) |
| **Anomaly focus** | Sun | Earth |

10 dynamic `o.moon*` variables are computed each frame (Ω, ϖ, ω, ν, M,
E, distance, phase angle, elongation, descending node) — extracted
geometrically from `matrixWorld` rather than analytically. See
[doc 21 §1.4.2](21-orbital-formulas-reference.md) for the full list and
[doc 66](66-derived-moon.md) for the Moon's correction
model.

## The no-chain bodies

Pluto, Halley's Comet and Eros are not rendered: there was no element chain
behind them, and the device that drew them is deleted (plan 07 R5). Ceres is
a force-only perturber in the N-body run (its reference constants remain as
data), and Pluto's observed mass and node are INPUTS to the invariable-plane
angular-momentum sum, which follows Souami & Souchay's ten-body convention.

---

## Frame Discipline

Two rules keep element comparisons honest across both tiers:

- **J2000-fixed vs of-date.** JPL's published `dI/dt` values are against
  the mean ecliptic of J2000, a fixed plane; the ecliptic of date moves
  (~0.01°/cy) — enough to flip several planets' apparent inclination-trend
  signs. Compare in the J2000-fixed frame
  ([doc 05 §Two frames](05-invariable-plane-overview.md#two-frames-two-node-values--dont-conflate)).
- **Equinox vs ICRF.** An ecliptic rate of date and an inertial (ICRF)
  rate differ by the general precession (p_A, the model's J2000 input); the scene's equatorial
  frame co-moves with its star field, so scene measurements cannot
  separate the two — the conversion is a formula applied outside the
  scene ([doc 13 §1.5a/§1.8](13-perihelion-precession.md)).

## Code Locations

| Function | Location | Purpose |
|----------|----------|---------|
| `keplerian-chain.cjs` | `packages/physics/src/planets/` | THE chain implementation (elements of date, positions, secular evaluation) |
| `_chainElementsOfDate()` / `_chainHelioAU()` | [script.js](../src/script.js) | Scene bindings of the chain |
| `updatePlanetInvariablePlaneHeights()` | [script.js](../src/script.js) | Chain projections (heights, nodes) |
| `updateDynamicInclinations()` | [script.js](../src/script.js) | The panels' inclination rows of date |
| `updateAscendingNodes()` / `updateOrbitalPlaneRotations()` | [script.js](../src/script.js) | Ecliptic nodes and 3D plane orientation |
| `updateMoonOrbitalElements()` | [script.js](../src/script.js) | Moon Ω, ϖ, anomalies, phase (Earth as focus) |

## References

1. [05 - The Invariable Plane](05-invariable-plane-overview.md)
2. [109 - The Model's Own N-body](109-model-nbody-engine.md)
3. [20 - Constants Reference](20-constants-reference.md)
4. Souami, D. & Souchay, J. (2012), "The solar system's invariable plane", A&A 543, A133
