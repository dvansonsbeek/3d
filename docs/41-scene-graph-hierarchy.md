---
docVersion: 1.0
modelVersion: v26.1
coefficients: sha256:ff77fbc9baa370e4
status: current
---

# Scene Graph Hierarchy

This document describes the Three.js scene graph hierarchy used in the ESSRT simulation. Understanding this nested structure is essential because **all astronomical motions are implemented through composed rotations** of parent-child relationships.

**Engine-D rendering (the ONLY planet path since the K5 legacy-chain excision):** the seven planets' rendered positions, orbit rings, traces, perihelion markers, panels and the invariable-plane machinery (heights, mass gauge, Sun-SSB) are computed from the model's own N-body chain (`@essrt/physics/planets/keplerian-chain` + the governed artifact `data/nbody-secular-frequencies.json`); Earth, the Moon and the Sun stay on the hierarchy (the two-engine interface — the Sun's chain hangs from the perihelion-of-Earth construction and every historical gate is calibrated on it). The geometric hierarchy below still exists and rotates, but serves only as anchor scaffolding for the display devices and as the rendering path for the no-chain bodies (Pluto, Halley, Eros); its fitted corrections were deleted with the excision, and the `?keplerChains=0` opt-out is gone. The `Mid-Eccentricity Orbit` node (the one law's base′ reference circle) was removed with the flip.

**Related Documents:**
- [13 - Perihelion Precession](13-mercury-precession-breakdown.md) - How precession affects apparent measurements
- [40 - Architecture](40-architecture.md) - Overall code structure
- [04 - Dynamic Elements Overview](04-dynamic-elements-overview.md) - What orbital elements change over time

**Source:** [Technical Guide](https://www.holisticuniverse.com/en/simulation/technical-guide) on holisticuniverse.com

---

## Overview

The simulation models complex astronomical cycles (precession periods from 18 years to a hundred thousand years and beyond) by nesting rotation layers in a parent-child hierarchy. Each layer applies one rotation, and the final world position of any object is the composition of all parent transformations.

**Key Principle:** A child object inherits all parent rotations. When measuring positions from different reference frames (e.g., Earth-equatorial vs. ecliptic), different portions of this hierarchy apply.

---

## Part 1: Fundamental Calculations

At its core, the entire simulation is based upon two surprisingly simple calculations:

| Concept | Value | Meaning |
|---------|-------|---------|
| **One Solar year** | 2π radians | A complete circle = 6.283185307... |
| **One AU** | 100 scene units | The radius of Earth's orbit |

Since the circumference of a circle is `2π × r`, all calculations derive from these two values:

- **Length of a Solar year:** 1 year = 2π radians = <!--v:meanSolarYearDays-->365.2421905<!--/v--> days (the J2000 mean tropical year, derived from the IAU sidereal year and p_A)
- **Length of an AU:** 100 scene units = <!--v:oneAU-->149,597,870.698828<!--/v--> km (currently)

All other calculations are relative to:
- The solar year as **2π**
- The AU as **100**

**Start Date:** The simulation is aligned to the **June Solstice of 21 June 2000, 00:00 UTC**.

---

## Part 2: The world frame — the J2000 ecliptic (the K-device wheels are deleted)

**Plan 11 step 4.** The scene's world frame IS the J2000 ecliptic: world Y is
the J2000 ecliptic pole and the J2000 equinox lies in the world XZ plane at
the view azimuth `SCENE_EQUINOX_VIEW_AZIMUTH_DEG` = 90° (atan2(x, z)) — the
equinox along world +X, so the June-solstice Sun of the landing epoch stands
at +90° in the top view: the browser's own pose at J2000 (measured 90.0066°
with 0.026° of pole tilt on the pre-plan-11 bundle, both dropped), the frame
the skydome texture and the default camera were authored against. Step 4 had
shipped 158.2265°, the NODE twin's pose (180° − the retired inclination
anchor 21.7735°), which turned the browser's world 68.2265° about the pole
against its skydome while every gate stayed green — every gated quantity is
frame-invariant; the perihelion-at-sun gate now pins the convention against
the frame's own columns.
The frame bridge R = `computeSceneWorldFrameJ2000()` (`@essrt/physics`
earth/frame-of-date — ONE home; browser `_kcR`, Node `_kcR`) maps every
J2000-ecliptic vector to world, and every frame of date — Earth's axis, the
sun plane, the Moon stack, the planets' poles, paths and markers — is placed
from the engine through it (Part 5). No observable rides R: every physical
reading is taken in the placed Earth frame, which is R-invariant by
construction; only the view is R.

The azimuth is the one scene literal the retired K-device scaffold leaves
behind. Until step 4 the scene's Earth precession layers were that scaffold:
five wheels turning uniformly at recorded J2000 periods (the retired unit's
335,317 yr divided by N — inclination 3, ecliptic 5 with tilt −A, obliquity 8
with tilt +A, axial 13 with tilt `earthtiltMean`, perihelion 16) from a
recorded J2000 phase, and R was DERIVED once from their pose at the chain
anchor epoch. Measured on the Node twin before the change, that pose was the
J2000 ecliptic frame to 0.026° of pole tilt with the equinox at the azimuth
above — the azimuth is kept for visual continuity, the tilt is dropped. The
three precession wheels, their tilts, periods and phase, `earthtiltMean` and
`earthRAAngle` are deleted (git history carries them); the perihelion pair
hangs on Earth's pivot. Two display literals remain in `src/script.js`: the
Wobble marker's radius (`WOBBLE_MARKER_RADIUS_SCENE_UNITS`, the former Law-4
amplitude × 100) and the inclination-path loop's angular zero
(`INCLINATION_PATH_ZERO_DEG`).

---

## Part 3: Object Structure

Every object in the scene follows this internal structure:

```
containerObj (orbitContainer)
└── orbitObj          → Rotation layer (rotation.y = angular position)
    ├── orbitLine     → Orbit path visualization (optional)
    ├── pivotObj      → Translation layer (position on ellipse); children attach here
    └── rotationAxis  → Axial tilt + daily rotation
        └── planetObj → The actual sphere mesh
```

Note: `pivotObj` and `rotationAxis` are **siblings** under `orbitObj`, not top-level children of `containerObj`. The hierarchy wiring (`.add()` calls) attaches child objects to `pivotObj`. The visual mesh lives under `rotationAxis`.

### 2.1 Component Purposes

| Component | Purpose | How Updated |
|-----------|---------|-------------|
| **containerObj** | Orbital plane orientation (tilt) | `rotation.x`, `rotation.z` set from ascending node + inclination |
| **orbitObj** | Angular position in orbit | `rotation.y = speed × pos - startPos` every frame |
| **pivotObj** | Radial position (distance from focus) | `position.set(x, 0, z)` for elliptical orbits |
| **rotationAxis** | Axial tilt and daily spin | `rotation.z` = axial tilt, `rotation.y` = day rotation |
| **planetObj** | Visual mesh (sphere with textures) | No transform updates |

### 2.2 Rotation Formula

For each object every frame:

```
θ = speed × pos - startPos × (π/180)
```

Where:
- `speed` = angular velocity (radians per simulation year)
- `pos` = current simulation time
- `startPos` = initial phase offset (degrees, converted to radians)

---

## Part 4: Complete Scene Hierarchy

The complete nesting order from the technical guide:

```
startingPoint (scene root)                            ← the world frame: the J2000 ecliptic (Part 2)
└── Earth (pivot; its container turned π/2 for the June-solstice start view)
    ├── earth.rotationAxis                            ← ENGINE-PLACED: [ŝ×ĝ, ŝ, ĝ] of date through R
    ├── EARTH-WOBBLE-CENTER (marker)                  ← display-only, placed from the rendered axis in the sun plane
    ├── Inclination path loop                         ← display-only
    ├── Perihelion Precession 1                       ← ENGINE-PLACED: the sun plane [ĝ, n̂, ĝ×n̂], angle ϖ_Sun(t)
    │   └── Perihelion Precession 2                   ← angle −ϖ_Sun(t), offset arm −e(t)·100
    │       └── Barycenter (pivot)
    │           ├── Sun                               ← sibling, NOT parent; wheel angle from the certified longitude
    │           ├── PERIHELION-OF-EARTH               ← sibling
    │           └── [All planet chains]               ← siblings of Sun; every rendered planet quantity is the chain's
    │
    └── Moon Hierarchy (see Part 8)                   ← base ENGINE-PLACED on the ecliptic of date; layers from the lunar arguments
```

(Plan 11 step 4: the three K-device precession wheels that sat between Earth's
pivot and the perihelion pair are deleted; Earth's own axial wheel rests.)

---

## Part 5: Earth Precession Layers

> **Plan 06 R4 — one Earth frame.** The layers below are the model's
> animation of Earth's cycles; they are no longer where the physics frame
> comes from. Every frame, after the layers have animated, the engine's
> one-source sample at the true-TT instant is turned into the Earth frame of
> date (`@essrt/physics/earth/frame-of-date`: the ecliptic pole n̂ of date,
> the equinox ĝ ∝ ŝ×n̂, the spin axis ŝ) and PLACED — the perihelion wheel's
> container takes [X = ĝ, Y = n̂, Z = ĝ×n̂] (the sun plane), the apsidal wheel
> pair turns ±ϖ_Sun(t) (the offset arm −e(t)·û toward the Sun's aphelion), the
> Sun sits on the wheel at the angle that realizes the certified longitude on
> the offset circle, `earth.rotationAxis` takes [X = ŝ×ĝ, Y = ŝ, Z = ĝ]
> (RA 0 IS the equinox of date), and the Moon stack's root container takes
> [X = n̂×ĝ, Y = n̂, Z = ĝ] — the ring's plane on the ecliptic of date, its
> node zero on the true equinox (the scene convention's longitude zero is a
> quarter turn from ĝ); on the device's flat J2000 base the ring's plane had
> read 0.5° at −3 kyr and 8.7° at −5 Myr off the rendered Moon's orbit plane,
> now 0.1–0.2° at every epoch. `_applyEngineEarthFrame` in both twins,
> identical ops; the J2000 pose of the K device is the bridge everything is
> placed relative to. Four relative corrections that used to sit on the K
> geometry (tilt, equinox azimuth, apsidal delta, the δ Newton read) are gone
> — the measured reasons: the
> K sun plane and the RA frame's ecliptic parted by 20.5″ at J2000 and 10′ at
> −3000, the rendered Sun −19″/+19″ in declination against Horizons at the
> 2000 equinoxes (−0.28″/+0.19″ after). The engine sampler's time coordinate
> is Julian years from J2000 TT — not the scene's SI-year counter, which sits
> 10.3 d off at J2000 and drifts 0.0078 d/yr (measured as a 1.417″ frame
> rotation when fed to the absolute equinox longitude).
>
> **The engine year — one argument (R4b).** Every read of the one-source
> sample — the frame above, `o.obliquityEarth`, the Predictions ε/e rows, the
> Earth ϖ-of-date rows, the solstice ε of the cardinal panel, the offset arm's
> e(t), the Moon's ecliptic→equatorial ε, the shadow-direction and sun-light ε
> — takes ONE argument, `_engineYearTT(jdUT)` in the browser and
> `_osmYearForJD(jdUT)` in the Node twin (identical ops): the scene's true TT
> (UT + the bridge + the ΔT curve in deep-time mode) in Julian years from J2000.
> Before R4b the panel rows and the Moon conversion sampled the SI-year counter
> at UT while the frame sampled TT: in-era the two coordinates differ by 0.013″
> of ε, but ΔT on the model's LOD history is 3,505 yr at −5.34 Myr, and the
> owner saw the Positions panel's solstice declination 22.6944° (the rendered
> axis) against a Predictions obliquity of 22.5347° at the same instant — the
> rendered Moon converted with an ε 0.16° from the axis it was placed in. After:
> the two surfaces agree to 0.0000″ at that epoch, browser ≡ Node for the
> planets to ≤0.004″ at every probed epoch out to −5.34 Myr. The K-device
> wheels (uniform at their recorded J2000 rates since plan 09 step 5c) keep
> their own SI coordinate — they are not engine reads (the balanced-year
> formulas that shared it left at step 5d). The
> Moon-argument obliquity CARRIER (C·∫(ε−ε₀) inside the lunar chain) samples
> ε at `2000 + t·100` with t in Julian centuries of TT from J2000 — the
> engine-year axis already (verified R5 follow-up; an earlier note here
> called it an SI-coordinate read, which it never was). The SI-year
> coordinate (`jdToSIyear(jdTT)`) enters the lunar arguments only where
> cycles are COUNTED — the chain integrals, the rate-completion table and the
> anchors' timeline conversion — a coordinate proportional to TT, the right
> axis for counting. The browser-vs-Node Moon split at deep time that this
> paragraph once recorded as open was the first-frame race in the argument
> factory (Part 8, R5), not a coordinate.

### 5.1 Earth Layer (Core)

The Earth object: its container is turned π/2 for the June-solstice start
view, its orbit node rests (plan 11 step 4 — the K axial wheel is deleted) and
its rotation axis is ENGINE-PLACED every frame:

| Property | Value | Meaning |
|----------|-------|---------|
| orbitRadius | 0 | Earth sits at the scene origin; every instrument measures from `earth.planetObj` (measuring from a displaced wobble centre would run the perihelion 8% fast — the offset chain carries the full e(t)·û(ϖ) itself). The visible wobble-centre marker is a display-only *child* of Earth at the literal radius `WOBBLE_MARKER_RADIUS_SCENE_UNITS` (the former Law-4 amplitude × 100), placed each frame from the rendered axis projected into the sun plane (the solstice direction); nothing reads it |
| speed | 0 | plan 11 step 4: the K axial wheel (recorded 25,793.6 yr) no longer turns this node — the pivot frame is the fixed world frame |
| rotationSpeed | 2π × sidereal rotations per SI year — **locked to the J2000 sidereal day** in both modes (see §14.4) | Daily spin |
| tilt | 0 (rest pose) | `earth.rotationAxis` takes [X = ŝ×ĝ, Y = ŝ, Z = ĝ] of date through R every frame; before the series artifact arrives the J2000 frame from the embedded anchors is placed, so the rest pose never renders |

### 5.2–5.4 The three K precession wheels (DELETED, plan 11 step 4)

The "Inclination Precession" (wheel 3 — physically the apsidal wheel, period
111,772.3 yr), "Ecliptic Precession" (wheel 5, 67,063.4 yr, tilt −A) and
"Obliquity Cycle" (wheel 8, 41,914.6 yr, tilt +A) layers sat between Earth's
pivot and the perihelion pair, each turning uniformly at its recorded J2000
period from the recorded phase (Part 6). They carried the scaffold's J2000
pose, which the frame bridge read once; since the bridge IS the J2000 ecliptic
(Part 2) and every node they parented is engine-placed in world, they are
deleted with their tilts, periods and phase. The model's precession periods
are the dynamical values of [Constants Reference](20-constants-reference.md)
Part 2 (T_p, the obliquity beat, the apsidal and nodal modes), which the wheels
read 0.09–2 % off.

### 5.5 Perihelion Precession 1 & 2

Both layers are ENGINE-PLACED (R4): Perihelion 1's container takes the sun
plane [X = ĝ, Y = n̂, Z = ĝ×n̂] of date through R, the pair turns ±ϖ_Sun(t):

| Property | Perihelion 1 | Perihelion 2 |
|----------|--------------|--------------|
| speed / startPos | 0 / 0 (rest) — the angle is set every frame | 0 / 0 (rest) — the angle is set every frame |
| orbitTilta | 0 (plan 11 step 4: the scaffold's −`earthRAAngle` tilt is gone — the container is world-placed) | 0 |
| orbitCentera | 0 | −e(t) × 100 — **animated every frame** |

**Purpose:** the paired inverse rotations realize the perihelion direction
of date on the offset circle: the apsidal wheel's arm −e(t)·û points at the
Sun's aphelion and the Sun rides the inner wheel at the angle that realizes
the certified longitude.

**Earth's eccentricity in the scene.** Earth's
eccentricity is the N-body secular series on every path (plan 09 step 6: the
former one-law e(t) = base′·(1 + cos θ₃(t)/2) on the inclination wheel's phase is
deleted; base′ stays as the perihelion wheel's pose). The scene
realizes it as ONE arm: Perihelion Precession 2's centre carries
−e(t)·100 every frame (`moveModel` in both twins), pointing at the
perihelion phase +180° — an ellipse centre, measured θ_p1 ≡ the Sun's
perihelion phase at every epoch. There is no second arm: the Barycenter
sits at the Sun's orbit centre itself (`eccentricityAmplitude` is the
Law-4 input and the wobble-marker distance, not a scene arm). The full
vector matters beyond the Sun: the
planet chains replicate the Sun *geometrically* (centre + circle, no
equation of centre), so a constant mean offset left them 0.0012 AU short
(Venus −80″ vs JPL, measured). The Sun node then carries only half its
equation of centre (`eocEccentricity` = e(J2000)/2, overridden per frame
with e(t)/2) and the FQ-3 corrector closes it exactly on the same
realized offset.

### 5.6 Summary Table

| Layer | Placement |
|-------|-----------|
| Earth (axis) | ENGINE-PLACED every frame: [ŝ×ĝ, ŝ, ĝ] of date through R |
| Perihelion 1 (the sun plane) | ENGINE-PLACED: [ĝ, n̂, ĝ×n̂] of date, angle ϖ_Sun(t) |
| Perihelion 2 (the offset arm) | angle −ϖ_Sun(t), arm −e(t)·100 |
| Sun | the wheel angle that realizes the certified longitude on the offset circle |
| Moon stack base | ENGINE-PLACED: [n̂×ĝ, n̂, ĝ] of date; the layers from the lunar arguments (Part 8) |

(Plan 11 step 4: the K-device wheels — Earth's axial 13, inclination 3,
ecliptic 5, obliquity 8 — and their recorded periods are deleted.)

---

## Part 6: The Balanced Year (retired as an input — plan 07 R10)

The **balanced year** t₀ = −302,635 was the fitted phase origin of the retired
correction combs and of the precession layers' `startPos` values (the 14.5-cycle
offset of the perihelion wheel that positioned the obliquity fluctuation against
the paleoclimate record). It is no longer an input, and the combs are deleted
(plan 09; from R10 to their deletion they measured their phase from J2000, the
coefficients rotated exactly). The precession layers kept their J2000 pose
through one recorded device constant, `kDeviceWheelPhaseAtJ2000Cycles` =
0.908498525276082 (numerically the retired origin's offset to J2000 in the
retired unit), until plan 11 step 4 deleted the wheels and the constant with
them.

**Why it mattered:** the K-device wheels were the scene's scaffold, not a law
— the engine placed the Earth frame, the Sun and the Moon stack over them (the
frame bridge read the pose once) — but the scene's world frame and every
world-axis reader saw their pose. Measured (plan 07 R10): dropping the
constant tilted the scaffold 1.25° and moved the NASA-convention umbra
diagnostic, which then rotated the annual aberration about world Y as the
ecliptic pole, by 0.45″ while every observable stayed bit-close. Since step 4
the world frame is the J2000 ecliptic itself (Part 2), so world Y IS the J2000
ecliptic pole and that class of world-axis reading is exact by construction.

---

## Part 7: Sun and Perihelion Point

### 7.1 Barycenter Sun

| Property | Value | Meaning |
|----------|-------|---------|
| orbitRadius | 0 | The Sun's orbit centre itself — the one eccentricity law has a single arm, carried by Perihelion Precession 2 (see §5.5) |

### 7.2 Sun Position

| Property | Value | Meaning |
|----------|-------|---------|
| orbitRadius | 100 (1 AU) | Always 1 AU from perihelion point |
| speed | 2π | Exactly one solar year |
| startPos | 0 | The rest pose — the engine places the Sun at the certified longitude every frame (R4); the fitted start angle `correctionSun` is deleted (plan 11 step 2) |
| rotation tilt | -7.155° | Solar axis inclination |

**The Sun on the wheel (plan 06 R4).** The Sun's wheel angle is SET, every
frame, to the value that realizes the certified completed longitude
`sunLonCompletedDegAtJD` (true TT: the finder-axis API plus the bridge) on the
offset circle — two Newton steps in plain geometry
(`solveWheelAngleForLongitude`), no scene read. The wheel's own longitude
stack (linear tropical rate, EoC, the retired fitted harmonics and FQ-3
corrector, the layer-B δ Newton read with its clock-convention taper) is
superseded: the K wheel animates, the engine places. Both runtimes carry the
identical placement (`_applyEngineEarthFrame`). Since the certified Sun is
defined over the whole ±500 Myr domain, the former 3,000–20,000-yr taper
between "the TT-clock Sun" and "the UT scene" is gone: every body of date —
Sun, axis, sun plane, Moon, planets — rides one clock, true TT. (The planets
caught up in R9: until then `_kcElementsOfDate` and the Node `_kcHelioAU`
turned the scene's UT JD straight into the chain year, so the chain — a
dynamical-time construct anchored at J2000.0 TT — lagged the Sun by ΔT of
mean motion: Mercury 9″ at J2000, 0.8° at −500, 3.5° at −3000, an arbitrary
phase at deep time; invisible to the cross-engine gate because both twins
shared the convention, and to the browser golden because no row pinned a
planet. Both twins now take the one engine year; the browser golden carries
105 planet rows and the cross-engine gate compares them, parity ≤2e-6″.
Against the UT-keyed JPL cache the 2000–2099 RMS moved Mercury 20.1 → 16.2″,
Venus 38.3 → 32.4″; the 1650–1900 buckets slipped 1–5″ because the scene
clock's ΔT is the model's MEAN curve — 80 s at 1650 and 38 s at 1700 where
the historical ΔT is 50 and 9 s — not the historical stack; a Phase-5-class
question for the clock, noted in plan 06.) Measured
history worth keeping: the analytic twin `_frameworkSunLon` that the δ block
fell back on parted from the wheel by 84″ around 500 AD, 250″ at −500 and
810″ at −2500 (an error the rendered Sun carried 1:1 before layer B); reading
the longitude against the K sun-plane's node instead of the RA frame moved the
Sun and the chain planets ~55″ at J2000 — the two frames parted by 51.6″ at
J2000 and ~1,470″ at −3000, which R4 resolved by placing BOTH from the engine
(the equinox IS the sun plane's node on the equator, by construction). The
eclipse umbra never reads the wheel: since U1 the package besselian in
`@essrt/physics` is the **single umbra implementation** end to end — the scene
consumes its output.

**The chain frame bridge** (ecliptic-J2000 → scene world, the one rotation
every chain planet, orbit ring, perihelion marker and Standard-Model ghost is
placed through, and the pose the engine Earth frame is placed RELATIVE to;
`_kcDeriveFrameR` / `_kcFrameR`, identical ops) is the scene's **J2000 pose**:
the K device geometry at the chain anchor epoch — the sun-plane normal as the
pole, the axis frame's RA = 0 direction projected onto that plane as the
longitude origin — read once, with no correction. The device is deterministic
there, so the bridge is too: nothing derived from a first frame's Sun, nothing
to re-derive when the series artifact lands. What the landing block DOES do is
request one paused frame (and drop the umbra tier's one-JD memo with the tier
model it served): the rebuilt package model's chain-cycle tables and the Moon
factory's normalisations are lazy builds (~1.2 s), and nothing renders while
paused, so without that frame they landed on the first Play frame — the
measured "wait before the scene starts" — while the paused scene kept showing
the pre-landing K pose. Since that frame, the paused scene shows the hybrid
pose from landing on. History (plan 06 R3): the former
**Earth-direction triad** (the chain Earth's heliocentric direction matched to
the scene's Earth–Sun direction at two instants) was a body match that folded
the chain Earth's +3.5″ offset from the certified Sun at J2000 (the chain
carries no lunar equation) into every planet's placement — and, in the browser,
the first frame's analytic-twin Sun (+11.6″ before the series artifact arrives)
into every Standard-Model ghost: the overlay's Sun read 8.2″ where the certified
Sun is 0.8″ from VSOP87. R3's frames form fixed that and exposed the next
defect: the K sun plane and the RA frame's ecliptic were 20.5″ apart at J2000
(the node line 51.6″ from RA = 0), 58″ at year 0 and 10′ at −3000 — the
rendered Sun −19″/+19″ in declination against Horizons at the 2000 equinoxes
(0.3–0.5″ at the solstices), the rendered Sun and Moon on ecliptics 10′ apart in
the Babylonian era, and the planets' JPL declinations carrying the same tilt.
R4 placed the whole Earth frame from the engine (Part 5), so the two planes are
one and a second Moon bridge is no longer needed. After R4, against Horizons:
ΔDec −0.28″ (March) / +0.19″ (September) at the 2000 equinoxes, browser ≡ Node
to 0.000″; the planets' 2000–2099 JPL RMS improved on every target (Jupiter
19.2 → 9.5″, Neptune 20.3 → 11.5″, Venus 44.1 → 38.3″, Mercury 25.2 → 20.1″).
The Node fast Sun path (`computeSunPositionFast`, the Step 6a instrument) rides
the same frame — before R4 it was the bare K wheel Sun, 8–18″ from the scene
Sun in 2000; the 6a2 window CSV is re-based on it.

---

## Part 8: Moon Hierarchy

The Moon has its own set of precession cycles nested within Earth's frame:

```
earth.pivotObj
└── moonApsidalPrecession.containerObj              ← of-date ~8.8476 yr apsidal advance (carries perigee offset)
    └── moonApsidalNodalPrecession1.containerObj    ← ~5.997 yr beat (pair, geometrically inert)
        └── moonApsidalNodalPrecession2.containerObj    ← ~5.997 yr (reverse of pair)
            └── moonLunarLevelingCyclePrecession.containerObj    ← apsidal canceller (−8.8476 yr of-date; mirrors the apsidal layer)
                └── moonNodalPrecession.containerObj    ← ~18.613 yr nodal regression (of-date) — rotates the tilted plane below
                    └── moon.containerObj    ← carries the 5.14° inclination tilt (below the nodal spin)
                        └── moon.orbitObj    ← draconitic (nodal-month) clock, 27.2122 d
```

**The rendered Moon is the shared series on the framework-native arguments,
and the two runtimes must agree (plan 06 R5).** The browser and the Node
engine build the same `@essrt/physics` Moon-argument factory with the same
injected chains and the same one-source ε, at the same true-TT instant — yet
the rendered Moon parted from the Node twin by 0.27″ at year 0, 6.7″ at
±100 kyr and 100″ at −5.34 Myr (Lp, D, Mp, F shifted together, M untouched;
latitude and distance moved in the Moon's own rate proportion, the signature
of a phase error in the mean longitude). Measured cause: the factory's lazy
normalisations — the obliquity carrier's (ε₀, C) and the self-measured rate
anchors — initialise on the first Moon evaluation, the first frame, before
the secular-series artifact has landed, so in the browser they read the
flag-off K-comb ε (the obliquity comb deleted at plan 09; 0.233″ from the one-source ε at 2000) while every later
call reads the hybrid; the Node engine loads the artifact synchronously. A
Node emulation of that race reproduced all five numbers to 0.001″. The
artifact-landing block now resets the factory (`_moonArgsM.reset()`), and the
cross-engine gate carries Moon-series rows (browser fixture lon/lat/dist vs
the engine at the same JD, 0.002″ in-era / 0.02″ deep) so the class cannot
return. Rule: anything a lazy normalisation derives from a flag-dependent
evaluator before the flag settles must be re-derived when it does — the
chain frame bridge (R3) was the first instance, this the second.

**Tilt/spin composition rule.** `createPlanet` applies orbit tilts STATICALLY
on `containerObj`; the animated Y-spin runs inside it. A layer's own spin can
therefore never rotate its own tilt — an orbit PLANE follows only its PARENT
rotations. Any layer that must visibly rotate a tilted plane needs the tilt
placed on a CHILD container (this is why the Moon's 5.14° inclination lives
on the moon container below the nodal spin; with the tilt on the nodal layer
itself, the plane silently followed the parent sum — prograde — masked by the
RA/Dec override).

### 8.1 Moon Precession Cycles (framework-native composition)

| Layer | Period | Physical Meaning |
|-------|--------|------------------|
| **Apsidal Precession** | +3,231.53 days (~8.8476 years, of-date) | Lunar perigee advance — of-date rate, so the ring's perigee tracks the Meeus perigee |
| **Apsidal-Nodal 1** | −2,190 days (~5.997 years) | Apsidal-nodal beat (pair, inert) |
| **Apsidal-Nodal 2** | +2,190 days (reverse) | Counter-rotation of the pair |
| **Lunar Leveling Cycle** | −3,231.53 days (apsidal canceller, of-date pair) | Cancels the apsidal rotation for the plane; the 16.886-yr leveling beat remains a derived display quantity |
| **Nodal Precession** | −6,798.33 days (18.6132 years, of-date) | Lunar node regression — drives the orbit plane (tilt sits below its spin) |
| **Moon** | +27.2122 days (draconitic / nodal month) | In-plane clock; layer sum = tropical month by the exact integer identity N_drac = N_trop + N_nodI |

---

## Part 9: Outer Planet Hierarchy

All seven planets, Mercury to Neptune, are **siblings** of the Sun under `barycenterEarthAndSun`, not children of the Sun. (Pluto, Halley's Comet and Eros left the scene with plan 07.)

```
barycenterEarthAndSun.pivotObj
├── sun.containerObj                                           ← sibling
├── earthPerihelionFromEarth.containerObj                      ← sibling
├── [Planet]PerihelionFromEarth.containerObj                   ← sibling (one per planet): the "Perihelion at Earth" marker + trace
├── [planet].containerObj → orbitObj → [pivotObj, rotationAxis → planetObj]   ← sibling (one per planet)
├── [Next Planet]PerihelionFromEarth.containerObj              ← sibling
├── [next planet].containerObj
│     └── ...
```

### 9.1 Planet Perihelion Precession Pattern

The two counter-rotating apsidal wheels that bracketed `PerihelionFromEarth`
(`PerihelionDurationEcliptic1/2`, turning at the retired device's perihelion
period) are deleted in both runtimes (plan 07 R7), and so are the
`[Planet]RealPerihelionAtSun` ellipse wheel and the `[Planet]FixedPerihelionAtSun`
marker that hung on each planet's annual wheel (plan 11 follow-up): their last
visible reach, the focused planet's orbit-plane grid, had sat 1.36 AU from the
rendered Sun since the annual wheel parted from the engine-placed Sun's wheel
zero, and is a scene child placed at the Sun now. The Node twin
`tools/lib/scene-graph.js` mirrors this wiring. What remains is the marker layer
and the planet: since the K5 excision the planet meshes, the orbit rings and the
perihelion markers are placed every frame from the N-body chain, and each
planet's perihelion period is the chain's inertial apsidal period
1,296,000/g — the values are in [Constants Reference](20-constants-reference.md).

---

## Part 10: How Rotations Compose

### 10.1 The Transformation Chain

To find any object's world position, the engine computes the product of all parent transformation matrices:

```
WorldMatrix = M_earth × M_inclinationPrecession × M_eclipticPrecession
            × M_obliquityPrecession × M_perihelion1 × M_perihelion2
            × M_barycenter × M_planet
```

### 10.2 Reference Frame Implications

**When measuring from Earth's equatorial frame:** All precession layers apply, causing apparent fluctuations in measurements.

**When measuring from ecliptic frame:** Bypass Earth's precession layers by reading directly from the planet's `precessionLayer.orbitObj.rotation.y`.

This is why Mercury's perihelion precession appears to fluctuate when measured from Earth but is constant in the ecliptic frame (see [13 - Perihelion Precession](13-mercury-precession-breakdown.md)).

---

## Part 11: RA/Declination Calculation

The browser calculates celestial positions deterministically:

1. **Query** three.js world positions for Earth, Sun, and target body
2. **Transform** planet vector to Earth's rotational frame via `worldToLocal()`
3. **Convert** Cartesian to spherical coordinates
4. **Map** θ (theta) → Right Ascension, φ (phi) → Declination
5. **Format** as sexagesimal strings (12h34m56s / ±12°34′56″)

Updates occur after every precession frame, reflecting live tilt changes.

---

## Part 12: Mathematical Constants

For current values, see [Constants Reference](20-constants-reference.md).

| Constant | Value | Description |
|----------|-------|-------------|
| 1 Solar year | 2π radians | `meanSolarYearDays` days |
| 1 AU | 100 scene units | <!--v:oneAU-->149,597,870.698828<!--/v--> km |
| World frame | `SCENE_EQUINOX_VIEW_AZIMUTH_DEG` (`@essrt/physics` earth/frame-of-date) | The J2000 ecliptic as the world frame: world Y its pole, the J2000 equinox along world +X (azimuth 90°) — the one scene literal, the browser's own pre-plan-11 pose (plan 11 step 4, Part 2) |
| Mean obliquity | (`earthtiltMean` — DELETED, plan 11 step 4) | The K scaffold's mean tilt; the rendered obliquity of date is the hybrid, its J2000 anchor the astro-reference input |
| Inclination amplitude | (`earthInvPlaneInclinationAmplitude` — DELETED, plan 11 step 4) | The K scaffold's tilt amplitude (the deleted ecliptic/obliquity wheels' ±A) |
| Base eccentricity | (`eccentricityBase` — DELETED, plan 11 step 2) | was the retired Law-5 balance eccentricity; no reader left |
| Mean eccentricity | (`eccentricityBaseDerived` — DELETED, plan 11 step 2) | The perihelion wheel's offset base′ was the scaffold's J2000 pose; the engine places the offset arm at the series' e(t) every frame, and the rest pose before the first frame is e(J2000) |
| Eccentricity amplitude | (`eccentricityAmplitude` — DELETED, plan 11 step 4) | The Law-4 input A, lately only the Wobble marker's display radius — now the scene literal `WOBBLE_MARKER_RADIUS_SCENE_UNITS` |

---

## Part 13: Key Composition Principles

### 13.1 Balancing Counter-Motions

The perihelion precession layers demonstrate a key principle: "Both have complete opposite values for 'Startpos' and 'Speed' because the movement of Axial precession and Inclination precession are balancing out in both ways."

This applies throughout the model:
- Axial precession (clockwise) vs. Inclination precession (counter-clockwise)
- Ecliptic tilt (-amplitude) vs. Obliquity tilt (+amplitude)
- Perihelion 1 (forward) vs. Perihelion 2 (reverse)

### 13.2 Nested Rotation Benefits

1. **Composability** - Each cycle is independent; changing one doesn't affect others
2. **Accuracy** - Rotations compose mathematically correctly via matrix multiplication
3. **Performance** - GPU handles matrix multiplication efficiently
4. **Flexibility** - Easy to add new precession cycles
5. **Reference Frames** - Can measure from any frame by choosing hierarchy depth

---

## Part 14: Summary Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SCENE HIERARCHY                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  startingPoint (scene root — the world frame IS the J2000 ecliptic)          │
│    └── Earth (pivot; axis ENGINE-PLACED every frame)                          │
│          │                                                                    │
│          ├── Moon Hierarchy (base ENGINE-PLACED; layers from the arguments)   │
│          │                                                                    │
│          └── Perihelion 1 (ENGINE-PLACED: the sun plane, angle ϖ_Sun(t))     │
│                │                                                              │
│                └── Perihelion 2 (angle −ϖ_Sun(t), offset arm −e(t)·100)      │
│                      │                                                        │
│                      └── Barycenter                                           │
│                            ├── Sun (sibling; the certified longitude)         │
│                            └── All Planet Chains (the N-body chain)           │
│                                                                               │
│  (plan 11 step 4: the K-device wheels are deleted)                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 15: Deep-Time Mode (DEEP_TIME_MODE_ENABLED)

The scene graph described above operates in two rendering modes, selected by the `DEEP_TIME_MODE_ENABLED` flag in `src/script.js`.

### 15.1 Snapshot mode (`DEEP_TIME_MODE_ENABLED = false`)

Modern-era / J2000-anchored simulation. Each frame's rotation is the standard snapshot multiplication described in §2.2:

```
θ = obj.speed × pos − obj.startPos × (π/180)
```

This is correct when the rate `obj.speed` has been constant since simulation start — i.e., across the modern era (~±10 millennia around J2000). The K wheels' recorded periods P_N and the per-planet periods are held at their J2000-anchored values.

### 15.2 Integrator mode (`DEEP_TIME_MODE_ENABLED = true` — the shipped default)

Deep-time / Phanerozoic / Hadean simulation. The same scene graph is rendered, but each frame's rotation is computed via **per-node integrator tags** that account for the epoch-dependent evolution of the precession period T_p(t), LOD(t), and planet orbital periods per the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md) — and the Earth frame itself is engine-placed every frame (Part 5). The tag families:

| Tag | Time base | Used for | Integrator |
|---|---|---|---|
| (`_dtCycleN`, `_dtCycleSign`, `_dtCycleAnchor`, `_dtRotN` — DELETED, plan 11 step 4) | — | were the K-device wheels (Earth's axial wheel, the three precession wheels, the wobble marker's texture spin) — a uniform turn per recorded wheel period from the recorded J2000 phase | the wheels are gone; the Earth frame is engine-placed every frame (R4) |
| `_dtMoonIntegrator`, `_dtMoonAnchor`, `_dtMoonSign` | UT (`_currentYearSI`) | Moon-chain nodes (5 nodes) | `obj._dtMoonIntegrator(anchor, year)` |
| `_dtPlanetIntegrator`, `_dtPlanetAnchor`, `_dtPlanetSign` | TT (`_currentYearSI_TT`) | Planet orbital nodes (Mercury–Neptune, 7 nodes) | `obj._dtPlanetIntegrator(anchor, year)` |
| (`_dtPerihelionDivisor`, `_dtPerihelionAnchor` — retired) | — | the equation-of-centre perihelion phase keeps its snapshot form for the Moon, Pluto and the no-chain bodies; the Sun's angle is the engine's (R4) | the chain planets' tags left at plan 07 R7, the Sun's at plan 09 step 5c |

The asymmetric time-base treatment (Moon-chain stays on UT, planet orbitals go to TT) is principled, not arbitrary: the eclipse-visibility validation was co-developed under the Moon-chain UT convention, while planets have no analogous validation tied to the time-base choice.

### 15.3 Both modes use the same scene graph

The scene-graph hierarchy from Parts 3, 7, and 8 is identical in both modes. The only difference is **how each node's rotation is computed each frame**:

- **Snapshot mode** reads `obj.speed` and `obj.startPos` directly (the J2000-anchored values mutated by `setEpoch()` if needed)
- **Integrator mode** reads the `_dt*` tags and computes the integrated cycle count via the appropriate epoch-dependent helper (`meanLodSecondsAtAge`, `meanLunisolarPrecessionPeriodYearsAtAge`, `meanPlanetOrbitalPeriodAtAge`, etc. — see [Doc 20 § "ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the full helper map)

Integrator mode preserves bit-equivalence to snapshot mode at the J2000 anchor (`anchor === STARTMODEL_YEAR_SI` → integrator returns 0 cycles → composition reduces to the snapshot path). At deep time, integrator mode produces physically-correct positions while snapshot mode would silently apply the J2000 rate retroactively to the full simulated interval.

### 15.4 Earth's daily spin and the ΔT / LOD layering — three consumers

The dLOD/dt layers (L1 tidal baseline · L2 + GIA α(t) · L3 + 4-flag ΔT stack · L4 + Core-mantle swing) are consumed at three distinct places in `src/script.js`, each deliberately using a different depth:

| Consumer | Layers applied | Where / why |
|---|---|---|
| **Ephemeris & eclipse chain** | **Full Layer 4** | `meanDeltaTSecondsAtAge()` integrates the Layer-2 LOD (tidal + GIA) with the ecliptic missing-motion kinematic term (on the nodal period T_s₃, doc 11; the code identifier keeps its historical `h5` name), then adds the 4-flag stack + the Core-mantle swing post-integration (each component zero-anchored at J2000). Feeds `_eclDeltaT()` → JD_UT → JD_TT inside every Meeus wrapper (`_eclSunLon`, `_eclMoonLon`, …) and the TT-anchored planet integrators (`_currentYearSI_TT`). All validated rotation claims (26-event solar audit, 267-event lunar test, ΔT charts) run through this path. |
| **Deep-time epoch anchors** | **Layer 2 only** | `recomputeEpochAnchors()` sets `meanlengthofday` from `meanLodSecondsAtAge()` (tidal + GIA). The stack + swing are a zero-mean ±ms *modulation* around the epoch mean, so folding them into the mean-LOD anchor would inject a phase-dependent offset into every derived day count. `meanLodSecondsWithCorrectionsAtAge()` exists for consistency with the corrected ΔT curve and is consumed only by the ESSRT modal display. |
| **Visible scene-graph spin** | **None over time (J2000-locked)** | `earth.rotationSpeed` is a constant J2000 sidereal rate (`updateEarthForEpoch()`). The scene graph applies spin as `pos × rate` (a multiplier, not `∫dt/LOD(t)`), so an epoch-mutated rate would be retroactively applied to the whole elapsed span (~163° spurious drift — "eclipse over America renders over Turkey at −584"). The lock gives a stable JD ↔ orientation convention; it is explicitly **not** a ΔT claim — physically-correct orientation lives in the ephemeris chain above. |

In short: **the full corrected curve (Layer 4) governs all validated rotation physics, Layer 2 governs epoch means, and the rendered globe uses a fixed J2000 convention.** Deep-time LOD and precession-period evolution remains visible in the calculator displays and the ESSRT modal, which read `meanLodSecondsAtAge()` / `_axialPrecessionPeriodYearsAtAge()` directly.

### 15.5 References

- [Doc 99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — canonical chain from `t_Ma` through LOD, T_p, AU, M_Sun, Kepler year, Moon distance, planet orbital + synodic periods
- [Doc 20 § "ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) — J2000-constant → `mean*AtAge(t_Ma)` helper map

---

**Previous**: [40 - Architecture](40-architecture.md)
**Next**: [50 - UI Panels Reference](50-ui-panels-reference.md)
