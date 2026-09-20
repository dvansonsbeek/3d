---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:b8b18424a3435e20
status: current
---

# The Invariable Plane

The invariable plane is the model's fundamental reference plane. This
document covers the concept, the plane the model actually uses (the
engine's own banked plane from the chain artifact), how heights, nodes
and the invariable-plane argument of periapsis are computed, and the two
live self-checks (angular-momentum validation and the mass-weighted
balance gauge).

> **Scope note (ESSRT).** The invariable plane itself (perpendicular to total angular momentum) is fixed in space; the angular-momentum conservation argument that defines it is scale-invariant. Earth's kinematic identities quoted here (−H/5 node regression ≈ <!--v:hDiv5-->67,063<!--/v--> yr, the H/3 ≈ <!--v:earthPeriPeriodICRF-->111,570<!--/v-->-yr ICRF perihelion cycle) are scale-invariant divisors whose literal year values are J2000-evaluated; under [ESSRT](99-expanding-solar-system-resonance-theory.md), H(t) evolves at deep time via Drivers 1 (LOD growth) and 2 (Kepler), scaling literal year counts proportionally while leaving the structure intact.

---

## What is the Invariable Plane?

The **invariable plane** is the plane passing through the solar system's barycenter perpendicular to its total angular momentum vector. It is the most fundamental reference plane for the solar system because:

1. **It is truly fixed** — unlike the ecliptic, it doesn't change over time (< 0.1 mas variation over 100 years; the model treats it as fixed)
2. **Defined by physics** — perpendicular to the total angular momentum
3. **Dominated by the giant planets** — Jupiter contributes 61.6%, Saturn 24.9%, Neptune 8.0%, Uranus 5.4% (orbital angular momentum ∝ m·√a); it lies within 0.32° of Jupiter's orbital plane

The **ecliptic** (Earth's orbital plane), by contrast, precesses around the invariable plane, so ecliptic inclinations measured at different epochs aren't directly comparable. Measured against the invariable plane, all planetary motions sit on equal footing.

---

## The Plane the Model Uses

The model's working invariable plane is **the engine's own**: the plane banked in the governed chain artifact (`CHAIN_ARTIFACT.invariablePlane`), computed from the model's own N-body dynamics — not an imported constant. Its working basis is the **s-frame**: ẑ = the banked plane normal, x̂ = ecliptic-X projected into the plane, ŷ = ẑ × x̂. This one basis serves everything downstream: the heights above the plane, the per-planet node fields, the mass-weighted balance gauge, and the Sun-SSB offset ([doc 24](24-moon-kepler-derivation.md) Part III).

### External reference: Souami & Souchay (2012)

The definitive published orientation is [Souami & Souchay (2012)](https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html), *"The solar system's invariable plane"*, A&A — at J2000.0: inclination to ecliptic **1°34'43.3" ≈ 1.5787°**, ascending node on ecliptic **<!--v:invPlaneAscNode-->107.582<!--/v-->°**.

For published surfaces (panels, reports), the chain's node longitudes are expressed in the Souami & Souchay origin (the plane's ascending node on the ICRF equator) via a **derived** conversion (`@essrt/physics/planets/inv-plane-frame`: banked plane + J2000 mean obliquity, zero fitted constants). This derivation closed the former ≈3.4° two-convention gap against La2010: the chain node lands on La2010's to 0.0001° at J2000, with a +0.04° mean offset over −500 kyr → 0.

### Two frames, two node values — don't conflate

| Viewpoint | Value | Meaning |
|-----------|-------|---------|
| Invariable plane's ascending node on ecliptic | 107.58° | Where the invariable plane crosses *up* through the ecliptic |
| Earth's ascending node on the invariable plane | <!--v:earthAscNodeJ2000-->284.51<!--/v-->° | Where Earth's orbit crosses *up* through the invariable plane |

These differ by ~177° (not exactly 180°) because the "mean ecliptic" is a defined plane, not identical to Earth's instantaneous orbit.

---

## Heights, Nodes and Crossings

Every planet's orbit is tilted relative to the invariable plane, so every planet spends half of each orbit above it and half below, crossing at the ascending node (below → above) and descending node (above → below).

### How the model computes them

For the **chain bodies** (the seven planets and Earth), each frame:

- **Height** = the exact projection `h = r⃗ · ẑ_inv` of the chain's heliocentric position vector onto the banked plane normal — no trigonometric reconstruction.
- **Nodes** (`o.<planet>AscendingNodeInvPlane`, and the ecliptic node) come from the chain's element set of date.
- **Inclination trend coloring** in the UI comes from the chain's own slope (±100 yr), not a phase rule.

Implementation: `updatePlanetInvariablePlaneHeights()` in [src/script.js](../src/script.js), fed by the Keplerian chain (`@essrt/physics/planets/keplerian-chain`).

For the **no-chain bodies** (Pluto, Halley, Eros — legacy scene scaffolding, see [doc 04](04-dynamic-elements-overview.md)), the geometric construction remains:

```
height = sin(i_inv) × sin(angleFromNode) × distance
angleFromNode = trueAnomaly + argumentOfPeriapsis − ascendingNodeOnInvPlane
```

with the node precessing linearly from its J2000 anchor at the body's ecliptic perihelion period.

### Earth's crossings

Earth crosses the invariable plane **twice per year**:

| Crossing | When | Heliocentric longitude |
|----------|------|------------------------|
| **Ascending** (below → above) | Early July (~July 4) | ~284.5° |
| **Descending** (above → below) | Early January (~January 4) | ~104.5° |

Earth is **above** the plane July → January and **below** it January → July. Maximum height at the current ~1.57° inclination: sin(1.57°) × 1 AU ≈ 0.027 AU ≈ 4 million km.

### Maximum heights by planet

The maximum height depends on inclination × distance:

| Planet | Max height (AU) | Notes |
|--------|-----------------|-------|
| Mercury | ~0.05 | High inclination × close distance |
| Venus | ~0.03 | |
| Earth | ~0.027 | At current ~1.57° inclination |
| Mars | ~0.05 | Eccentricity varies the distance |
| Jupiter | ~0.029 | Tiny inclination × large distance |
| Saturn | ~0.15 | |
| Uranus | ~0.34 | |
| Neptune | ~0.39 | Small inclination × huge distance |

---

## The Two Angles: Inclination vs Node

Each orbital plane has **two distinct angles** evolving at different rates — a common confusion worth separating:

- **Inclination** `i(t)` — the "nodding" of the orbital plane. Changes **how far** above/below the plane the planet gets; it does not change the fact of two crossings per orbit.
- **Ascending node** `Ω(t)` — the "spinning" of the line of nodes. Shifts **where/when** the crossings happen.

For the planets both angles are now **dynamical outputs of the chain** (elements of date; the long-term curves are engine D's own secular modes). For Earth the model's kinematic identities apply: Ω regresses at the ecliptic precession rate **−H/5 ≈ −<!--v:hDiv5-->67,063<!--/v--> yr** (confirmed by La2010), while Earth's inclination to the invariable plane oscillates on the **H/3 ≈ <!--v:earthPeriPeriodICRF-->111,570<!--/v-->-yr** ICRF perihelion cycle — two different angles, two different rates.

Earth's charted model inclination `i_inv(t)` is the **one-source** reading: the engine's own Earth-orbit normal (secular series inside ±10 Myr, mode tail beyond) against the artifact's invariable plane — it matches La2010 at rms 0.003° over −500 kyr.

```
Year 2000:  Earth's orbit tilted ~1.57° → max height ≈ 0.027 AU
Year 50000 (near minimum tilt):  ~0.85° → max height ≈ 0.015 AU
— Earth still crosses the plane twice per year in both cases.
```

### The invariable-plane argument of periapsis

`ω_inv` — the in-orbit-plane angle from the orbit's ascending node **on the invariable plane** to the perihelion direction — is computed by an exact vector construction (perihelion unit vector and orbit normal in ecliptic-J2000, node direction = ẑ_inv × n̂_orbit; `_kcArgPeriInvPlaneDeg` in [src/script.js](../src/script.js)). No frame-mixed shortcut (such as differencing an equatorial-frame ϖ against an ICRF node) is used. For Earth, ω_inv sits near 180° − i_inv ≈ 178.4°: Earth's perihelion lies very close to its descending node on the invariable plane.

---

## Angular Momentum Validation (Option A vs B)

The simulation verifies the plane's orientation two independent ways.

**Option A — computed from angular momentum.** `calculateInvariablePlaneFromAngularMomentum()` builds each planet's angular-momentum vector from `h = √(GM☉·a·(1−e²))`, `L = m·h`, and the orbit's `(i, Ω)`, sums them, and reads the tilt and node of the total:

| Planet | L (% of total) |
|--------|----------------|
| Mercury | 0.003% |
| Venus | 0.06% |
| Earth | 0.08% |
| Mars | 0.01% |
| **Jupiter** | **61.6%** |
| **Saturn** | **24.9%** |
| Uranus | 5.4% |
| Neptune | 8.0% |

**Option B — the published reference** (Souami & Souchay 2012 values above).

Expected agreement: tilt 1.5787° ± 0.01°, node ~107° ± 0.5°, A-vs-B difference < 0.1°. The check is a live self-consistency gate: if the two diverge, the orbital-element data is inconsistent.

---

## Mass-Weighted Balance Tracking

Because the plane is defined by total angular momentum, the mass-weighted average height of all planets should oscillate around zero over long timescales. The simulation tracks this as a live gauge:

- **Mass Balance (AU)** = `Σ(mass × height) / total_mass`, computed each frame (`updateInvariablePlaneBalance()`), plus counts of planets currently above/below.
- **Trend analysis** (`startBalanceTracking()` / `updateBalanceTrendAnalysis()`) records yearly samples; over periods exceeding Neptune's ~165-yr orbit the lifetime average should converge toward zero.

---

## Visualization in the Simulation

Enable via **Celestial Tools > Earth Inclination to Invariable plane**: a translucent disc centered on the Sun, Earth's current height line, crossing markers (ascending green, descending red), and high/low markers (yellow/blue). Each planet's inspector shows its ascending node on the invariable plane (ecliptic convention: `o.<planet>AscendingNodeInvPlaneEcliptic`), its current signed height, and above/below status.

---

## Summary

- The invariable plane is fixed, physics-defined, and giant-planet-dominated; the model banks **its own** plane from the chain artifact and expresses node longitudes in the Souami & Souchay origin via a derived, zero-fitted-constant conversion (0.0001° vs La2010 at J2000).
- Chain bodies get exact projected heights (`r⃗ · ẑ_inv`) and element-of-date nodes; only the no-chain bodies (Pluto, Halley, Eros) keep the geometric sin(i)·sin(u)·r construction.
- Inclination and node are two distinct angles at two distinct rates — for Earth: i_inv on the H/3 ICRF-perihelion cycle, Ω at −H/5 — and every planet still crosses the plane twice per orbit regardless of tilt.
- Two live self-checks (angular-momentum Option A vs B, mass-weighted balance) continuously verify the geometry.

---

## Related Documents

- [04 - Orbital Elements Overview](04-dynamic-elements-overview.md) — the chain (the only planet path) and the no-chain bodies
- [20 - Constants Reference](20-constants-reference.md) — all invariable-plane constants
- [22 - Coordinate Frames](22-coordinate-frames.md) — frame transformations
- [24 - The Δa Mass Derivation](24-moon-kepler-derivation.md) — Part III: the Sun-SSB chart served from the same s-frame basis
- [99 - Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — deep-time scaling of H(t)
