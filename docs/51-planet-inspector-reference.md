---
docVersion: 2.0
modelVersion: v14.0
coefficients: sha256:bb6a03c877eedab8
status: current
---

# Planet Inspector — the orbit of date from the N-body chain

## Overview

The Planet Inspector (Tools → Planet Inspector) shows, for one of the seven
chain planets, the orbit the scene actually renders: the N-body element
chain's elements of date, the orbit plane against the ecliptic of date with
its nodes and extremes, the perihelion, the true and mean anomalies, and the
position report against the NASA/JPL test dates. Everything it displays comes
from the same evaluators the scene uses to place the planet; nothing in the
inspector is computed on its own path.

**Related documentation:**
- [41 — Scene graph hierarchy](41-scene-graph-hierarchy.md) — the engine frame of date and the chain placement
- [31 — Geometric orbital elements, the no-chain bodies](31-no-chain-body-elements.md) — Pluto, Halley and Eros keep the device construction and are not in the inspector
- [52 — Analysis and export tools](52-analysis-export-tools.md) — the position report

---

## 1. What replaced the hierarchy walk

Until plan 06 R10 the inspector walked the K device's five nested wheels per
planet (PerihelionDurationEcliptic1 → PerihelionFromEarth →
PerihelionDurationEcliptic2 → RealPerihelionAtSun → planet) and showed each
wheel's settings, runtime rotation, wiring validation and hierarchy path. Since
the K5 excision those wheels are scene scaffolding: the planet meshes, the
orbit rings and the perihelion markers are placed every frame from the N-body
chain. The wheel pivots kept turning at the K start angle, so the old
anomaly visual, which measured angles at a wheel pivot, opened 90° rotated
from the rendered planet and measured nothing from the Sun. The walk, the
settings, the runtime state, the validation, the hierarchy path, the
solar-period reference and the "P2" device point are gone. The orbit visual
was the valuable part and is rebuilt on the chain.

## 2. Sources

| Quantity | Source |
|---|---|
| Elements of date (a, e, i, Ω, ϖ, λ̄, M) | `_kcElementsOfDate(planet, o.julianDay)` — `@essrt/physics/planets/keplerian-chain` with the banked secular-series override, at the engine year (true TT) |
| Heliocentric points of the orbit | `_kcHelioAU(planet, jd)` over one Kepler-III period, through the frame bridge `_kcR` into world axes |
| Rendered planet | the planet mesh's world position (light-time retarded, as the eye sees it) |
| Ecliptic of date (pole n̂, equinox ĝ) | the sun-plane container's world basis `[ĝ, n̂, ĝ×n̂]`, placed from the engine every frame (R4) |
| Sun | the Sun mesh's world position |

The elements are in the fixed J2000 ecliptic frame, the frame every reference
table publishes. The of-date geometry (inclination to the rendered ecliptic,
node longitude of date, argument of latitude, heights) is measured against
n̂ and ĝ in world space. At J2000 the two frames coincide; away from it they
part by the motion of the ecliptic.

## 3. The visual

All helpers live in one `THREE.Group` in world coordinates and are rebuilt
when the planet or a checkbox changes.

| Element | Colour | Construction |
|---|---|---|
| Orbit outline | white | the chain orbit sampled over one period (257 points), fanned from the Sun |
| Orbit fan | green above / red below | the fan's triangles split by the ring points' height above the ecliptic of date |
| Ecliptic ring | blue, dashed | a circle of radius a in the ecliptic of date around the Sun |
| Ascending / descending node | magenta ↑ / cyan ↓ | the sampled orbit's crossings of the ecliptic of date, interpolated between samples; yellow dashed line of nodes |
| Highest / lowest point | green ↑ / red ↓ | the samples of maximum / minimum height |
| Perihelion "P" + green line | green | the perihelion direction of the chain elements (Ω, i, ω = ϖ − Ω, the same rotation as the chain's element-to-position), at distance a(1 − e) from the Sun |
| Sun → planet line, ν arc | amber | the true anomaly swept at the Sun in the orbit plane, from the perihelion direction to the rendered planet |
| M arc | cyan, dashed | the chain's mean anomaly (λ̄ − ϖ) swept at the Sun beside ν — an angle, not a geometric point |
| Locator ring | cyan torus | around the rendered planet, facing the camera |

The orbit is resampled when the epoch has moved by more than 1/720 of the
period and at most four times a second (the same floor the orbit rings use);
the planet-dependent parts move every frame. A resample bridges UT → TT once
(the engine year at the current JD) and steps its vertices in Julian years, as
the scene rings do: the shape over one period does not need ΔT per vertex, and
the vertex at the current date reads the mesh's own year exactly. The mesh,
panels and traces keep the exact per-JD route.

## 4. The camera

**Orbit view** looks down onto the ecliptic of date at the Sun with the
equinox ĝ to the right, so ecliptic longitudes run counter-clockwise. The
camera sits 3° off the pole toward longitude 270°: a camera exactly on the
pole axis leaves three.js's `lookAt` to choose the roll from a fallback
perturbation, which is where the former inspector's rotated start came from.
**Planet view** looks from behind the planet toward the Sun. While the
inspector is open the animation loop follows the inspector's target (the Sun
mesh or the planet mesh) instead of the "Look at" body.

## 5. Readouts

**Chain elements of date:** a, e, i and Ω (J2000 ecliptic), the inclination
to the invariable plane and the ascending node on it (Souami & Souchay
origin — the planet panel's rows), ϖ, ω = ϖ − Ω, λ̄, the Kepler-III period
a^3/2 in years, the perihelion and aphelion distances. Two inclinations are
deliberately shown: Mercury's 7.005° is to the ecliptic (JPL 7.00498°), its
6.345° is to the invariable plane; they are different planes, not a
discrepancy.

Against the Horizons osculating elements (`public/input/jpl-horizons-planet-elements.json`)
the chain's i, Ω and e at 2003 agree to ≤0.0014°, ≤0.03° and ≤2e-4 for all
seven planets, and at −2997 to ≤0.024°, ≤0.23° and ≤3e-3 (Uranus e).

**Orbit geometry (live):** the Sun→planet distance of the rendered planet, ν
at the Sun, the chain's M, ν − M, the inclination to the ecliptic of date, the
ascending node longitude of date, the argument of latitude (0° at the
ascending node, 90° at the highest point), the height above the ecliptic of
date and its share of the maximum, the hemisphere, and the planet's RA/Dec
against the Sun's Dec (at a transit the two agree).

A consistency check worth knowing: ν from the geometry and ν from Kepler's
equation on the chain's M and e agree to the size of the chain's periodic
terms (about 0.01° for Mercury and Venus at J2000).

## 6. Position report

The report compares the rendered planet's RA/Dec with the NASA transit
catalogue dates and the model-start reference, with Excel export and
clipboard copy; it is generated on demand (the button walks the scene through
the test dates and restores the epoch). Its longitude rows still read the
`o.<planet>PerihelionEcliptic` / `o.<planet>AscendingNode` channels; see doc
52 for the report format.

## 7. Keyboard

| Key | Action |
|---|---|
| ← or P | previous planet |
| → or N | next planet |
| Escape or Q | close |

## 8. Code locations

| Component | Location |
|---|---|
| `PLANET_HIERARCHIES` (the targets; `chain: false` bodies are report-only) | `src/script.js` |
| `hierarchyInspector` state, `computeInspectorOrbitFrame()` | `src/script.js` |
| `createVisualHelpers()`, `updateInspectorVisuals()`, `clearVisualHelpers()` | `src/script.js` |
| `focusInspectorCamera()`, `createInspectorPanel()`, `updateInspectorDisplay()` | `src/script.js` |
| `updateHierarchyLiveData()` (per-frame, from the animation loop) | `src/script.js` |
| `window.__test__.inspectorProbe()` (headless probe: group size, angles, equinox on screen) | `src/script.js` |
