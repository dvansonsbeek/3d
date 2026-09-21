---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:78f99d98186e50d9
status: current
---

# Orbital Elements: the Chain and the Devices

How every body in the simulator gets its orbital elements. There are
three tiers, and knowing which body sits on which tier answers most
"where does this number come from?" questions:

1. **The seven planets — the Keplerian chain.** The model's own
   N-body-derived element chain is **the only planet path**: the
   simulator renders the planets, their orbit rings, traces, perihelion
   markers, panels and the invariable-plane machinery (heights, mass
   gauge, Sun-SSB) from it.
2. **Earth, the Moon and the Sun — the engine-K hierarchy.** The
   certified historical-era devices: Earth's spin/tides/H(t) machinery
   and the Moon's 3D precession hierarchy. This is the two-engine
   interface; the historical gate suite is calibrated on it.
3. **The no-chain bodies — Pluto, Halley's Comet, Eros.** Legacy scene
   scaffolding: the geometric elements device documented in
   [doc 31](31-no-chain-body-elements.md).

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
  of perihelion, mean longitude (`_kcElementsOfDate` in the scene), plus
  the inclination and node **on the engine's own invariable plane** (the
  K5c s-frame; published node longitudes go through the derived
  Souami & Souchay origin conversion — see
  [doc 05](05-invariable-plane-overview.md)).
- **Heliocentric positions** — ecliptic-J2000 vectors (`_kcHelioAU`),
  which feed the rendered orbits, the plane heights (`h = r⃗ · ẑ_inv`),
  the mass-weighted balance gauge and the Sun-SSB chart.
- **Secular shapes** — the panels' precession attribution (base mode /
  largest companion / remainder with % shares) reads the chain's own
  secular modes (`_kcSecularShape`); long-window charts evaluate the
  chain's secular skeleton, with the banked deep secular series overriding
  where loaded (default-on; inside each planet's measured boundary the
  override is a no-op — the chain serves).

**Matched pair**: the chain module is hashed as an input of the governed
artifact — terms and evaluation form ship together. The epoch anchor is
J2000.0 (JD 2451545.0, TT); calendar mapping goes through the model's own
JD→year machinery (a half-day slip is 2° of Mercury mean longitude).

The re-evaluation records: [doc 108](108-derived-earth-orbit-vector.md)
(the derived Earth-orbit vector), [doc 109](109-model-nbody-engine-and-lattice-test.md)
(the model's own N-body engine, the measured planetary frequencies, and
the lattice tested at its own quantity type).

## Tier 2: The Engine-K Hierarchy (Earth, Moon, Sun)

Earth's own motion — spin, precession devices, tides, H(t), the cardinal
points, the one-source movement — stays on the engine-K hierarchy and is
documented where it lives: [doc 11](11-length-day-year-formulas.md)
(years and days), [doc 14](14-solstice-prediction.md) (cardinal points),
[doc 40](40-architecture.md) (the one-source movement),
[doc 99](99-expanding-solar-system-resonance-theory.md) (ESSRT).

Earth's engine-K orbital-plane devices (the H/3 inclination oscillation
and −H/5 node regression) are part of the geometric device of
[doc 31](31-no-chain-body-elements.md); Earth's *displayed* invariable-
plane values come from the chain like the planets'.

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
[doc 66](66-moon-meeus-corrections.md) for the Moon's correction
framework.

## Tier 3: The No-Chain Bodies (Pluto, Halley's, Eros)

These render from the geometric elements device — the inclination
oscillation law, the two-normal ecliptic inclination, and the
tilt-derived ecliptic node — documented in full in
[doc 31](31-no-chain-body-elements.md). The same document covers the
probe-pinned reference implementations and the fitted J2000 constants
they carry.

---

## Frame Discipline

Two rules keep element comparisons honest across all three tiers:

- **J2000-fixed vs of-date.** JPL's published `dI/dt` values are against
  the mean ecliptic of J2000, a fixed plane; the ecliptic of date moves
  (~0.01°/cy) — enough to flip several planets' apparent inclination-trend
  signs. Compare in the J2000-fixed frame
  ([doc 31 §Two Frames](31-no-chain-body-elements.md#two-frames--be-careful-which-one-you-mean)).
- **Equinox vs ICRF.** An ecliptic rate of date and an inertial (ICRF)
  rate differ by the general precession (H/13); the scene's equatorial
  frame co-moves with its star field, so scene measurements cannot
  separate the two — the conversion is a formula applied outside the
  scene ([doc 13 §1.5a/§1.8](13-mercury-precession-breakdown.md)).

## Code Locations

| Function | Location | Purpose |
|----------|----------|---------|
| `keplerian-chain.cjs` | `packages/physics/src/planets/` | THE chain implementation (elements of date, positions, secular evaluation) |
| `_kcElementsOfDate()` / `_kcHelioAU()` | [script.js](../src/script.js) | Scene bindings of the chain |
| `updatePlanetInvariablePlaneHeights()` | [script.js](../src/script.js) | Chain projections (heights, nodes); legacy construction for no-chain bodies |
| `updateDynamicInclinations()` | [script.js](../src/script.js) | Legacy device inclinations (no-chain bodies, engine-K) |
| `updateAscendingNodes()` / `updateOrbitalPlaneRotations()` | [script.js](../src/script.js) | Ecliptic nodes and 3D plane orientation |
| `updateMoonOrbitalElements()` | [script.js](../src/script.js) | Moon Ω, ϖ, anomalies, phase (Earth as focus) |

## References

1. [31 - Geometric Orbital Elements — the No-Chain Bodies](31-no-chain-body-elements.md)
2. [05 - The Invariable Plane](05-invariable-plane-overview.md)
3. [108 - The Derived Earth-Orbit Vector](108-derived-earth-orbit-vector.md) · [109 - The Model's Own N-body](109-model-nbody-engine-and-lattice-test.md)
4. [20 - Constants Reference](20-constants-reference.md)
5. Souami, D. & Souchay, J. (2012), "The solar system's invariable plane", A&A 543, A133
