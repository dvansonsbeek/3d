---
docVersion: 1.0
modelVersion: v26.6
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# Equation of Center — Implementation Reference

The scene's Sun wheel realizes Kepler's 2nd-law variable speed through a
**split design**: a circular orbit with an offset center (the geometric
half) plus an explicit equation-of-center term (the analytic half), closed
exactly by a derived corrector (the exact-Kepler wheel). This document is
the reference for that construction: the split derivation, the derived
parameters, the corrector and the layering of the displayed Sun.

---

## What It Does

The equation of center adds Kepler's 2nd Law variable speed to the Sun's orbit.
The Sun moves faster near perihelion (January) and slower near aphelion (July):

```
theta += 2 * e * sin(M) + 1.25 * e^2 * sin(2M)
```

Where `e` is the eccentricity and `M` is the mean anomaly from perihelion.
Always on. The 2-term series is accurate to <0.01° for e < 0.21 with no
iteration (`moveModel()` runs every frame for ~80 objects), and the split
residual beyond it is removed exactly by the corrector below.

---

## The Split Design (why half the eccentricity)

The model approximates the elliptical orbit as a **circular orbit with an
offset center**: Earth sits at `e(t) × 100` units from the circle center — the
full eccentricity of date (the N-body series), carried by the Perihelion Precession 2
centre every frame. This reproduces the distance variation exactly, but it
also creates apparent angular speed variation **from geometry alone**: when
the Sun is closer, the same arc subtends a larger angle. The off-center
viewing position already supplies about half the Keplerian speed variation.

For a circular orbit of radius `a` centered at C, observed from O displaced
by `d = e_geom · a`:

```
apparent angle ~ M + e_geom · sin(M)       (first-order geometric parallax)
true anomaly   ~ M + 2 · e_real · sin(M)   (first-order Kepler)
```

The geometric offset contributes exactly **half** the first-order effect, so
an explicit EoC with eccentricity `eoc` gives total amplitude
`e_geom + 2·eoc`, and matching Kepler requires:

```
eoc = e_real − e_geom / 2  =  e(t) / 2
```

**Observable consequence of using the full eccentricity instead** (measured —
the double-counting signature): season lengths become too asymmetric —

| Cardinal Point | Error with full ecc (hours) |
|----------------|-----------------------------|
| Vernal Equinox | -14.9 |
| Summer Solstice | +0.8 |
| Autumnal Equinox | +23.9 |
| Winter Solstice | +8.0 |
| **RMS** | **14.7** |

---

## Derived Parameters (no free parameters)

`eocEccentricity` is **derived from existing model constants** — not tunable.
The EoC phase needs no offset: the engine places the Sun at the certified
longitude every frame.

### eocEccentricity

```
eoc(t) = e(t) / 2
```

where `e(t)` is Earth's eccentricity of date — the N-body secular series — and the geometric offset
carries the full `e(t)` along the perihelion direction. At J2000:
`eocEccentricityValue` = <!--v:eocEccentricityValue-->0.00836<!--/v--> (the
constants seed `C.eocEccentricity`; `moveModel` supersedes it per frame with
`e(t)/2`). The higher orders (the offset's exact parallax vs the full Kepler
series) are closed exactly by the exact-Kepler corrector below, so the split
introduces no residual.

### The parameter table

| Parameter | Value | How determined |
|-----------|-------|----------------|
| `eocEccentricity` | e(t)/2 (<!--v:eocEccentricityValue-->0.00836<!--/v--> at J2000) | **Derived**: half the eccentricity of date, per frame |

The geometric offset carries `e(t)·û(ϖ)` itself — the series' eccentricity
along the series' perihelion direction. Nothing here is tunable and nothing
depends on the model's start date: the Sun's wheel rests at zero and the
engine places the Sun at the certified longitude every frame.

---

## The Exact-Kepler Wheel — the split error derived and removed

The split composition (parent center-offset at magnitude e toward the
perihelion direction, plus the sun node's 2nd-order EoC at `e − base/2`)
differs from full Kepler by a residual that is **fully attributed**
(measured with the FQ3 wheel–Sun attribution instrument, since deleted with
the wheel it measured; the attribution is recorded here):

1. **Amplitudes** — the split differs from full Kepler at first order by
   exactly `e − base` (273.1″ at J2000); closure 97.7% annual / 98.9%
   semiannual / 100% third-harmonic against the raw wheel's measured error
   (278.98″ / 8.93″ / 0.11″ + 4.93″ constant).
2. **Phase** — the wheel's REALIZED offset-vector direction (the composition
   `−base·û(θ_p1) + amp·û(θ_p1+θ_p2)` of the peri-layer phases) sits 1.035°
   from the law's ϖ direction, predicting a 62.3″ annual-quadrature component
   vs the measured 61.8″.

Combined mechanism share ~100%; the offset magnitude tracked the shipped
eccentricity to six decimals at every probe epoch.

**The corrector.** In difference form the mean longitude cancels, so the
exact-Kepler completion is a pure function of the branch's own live values —
zero constants, no anchor or frame quantity:

```
Δλ = EoC_full(e) − EoC_half(e − base/2) − geoTerm(d⃗, θ_sun)
d⃗  = −base·û(θ_p1) + amp·û(θ_p1 + θ_p2)      (live peri-layer phases)
θ  += Δλ / J                                   (first-order Jacobian)
```

Shipped in both runtimes. The offset vector reads the
already-animated parent phases, so the form is integrated-phase correct in
deep-time mode by construction. One convention trap is recorded in the code
comment: node-ry angles are λ-handed — only the raw world-frame `atan2(z,x)`
extraction runs opposite ecliptic longitude.

**Measured at adoption** (the attribution instrument has since left the tree;
the numbers stand as the record): twin − wheel 0.80″ annual / 0.57″ sd; deep
time stays bounded (17.8″ at −135, 29.4″ at −3000, 6.6″ at +20000); Sun vs
JPL 0.0029°; planet baselines unchanged at recorded precision. The ~4.4″
constant residual against the twin is anchor-class — named and left honest,
not absorbed. The certified eclipse chain is untouched by construction
(tier-driven since the umbra strangler); its living referee is
`tools/verify/sun-vs-horizons.js`.

---

## The Displayed Sun — three layers

```
θ_kinematic    = base scene-graph rotation (constant rate × pos)
θ_with_EoC     = θ_kinematic + 2·e·sin(M) + 1.25·e²·sin(2M)        ← EoC + exact-Kepler corrector
θ_displayed    = θ_with_EoC + w(t)·(λ_certified − λ_realized)       ← the δ overlay (owns accuracy)
```

The δ overlay (`E5_WHEEL_SUN_ENABLED`; weight w(t) = 1 in the corpus era,
tapering off at the clock-convention boundary — a TT-clock Sun would clash
with the deliberately-UT deep-time scene) steers the world-frame Sun onto
the certified framework-native Sun of the eclipse chain. λ_realized is the
wheel's own longitude of date read from the scene each frame — the Sun's
RA/Dec in the corrected axis frame converted with the scene ε, in two Newton
passes — so the cancellation is exact in the frame the panels, the frame
bridge and the JPL comparisons use; the former analytic twin parted from the
wheel by up to 810″ inside the window (doc 41)
([doc 103](103-135-babylonian-case-study.md) describes that basis). The
displayed Sun's accuracy is owned by the certified chain; the wheel layers
underneath keep the scene's cyclic, bounded-harmonic character.

### Results

Sun vs JPL (dense baseline, exact-Kepler wheel): **RMS Total 0.0029°**
(RMS Dec 0.0004°). Year lengths: mean tropical 365.242190835 d (IAU
365.242200, +0.10 s), mean sidereal 365.256363246 d (+0.02 s), anomalistic
365.259636199 d (+0.02 s).

### The ~54 arcsec/yr RA drift is a frame effect

The apparent RA drift vs JPL Horizons is a coordinate-frame mismatch, not a
model error: JPL outputs in the fixed ICRF/J2000 equinox, the model in the
of-date equatorial frame. Precession in RA is

```
Δα = m + n · sin(α) · tan(δ)     (m = 46.1 ″/yr, n = 20.04 ″/yr)
```

which at the June solstice (α ≈ 90°, δ ≈ 23.44°) gives 54.8 ″/yr — matching
the measured ~54.1 ″/yr baseline drift to 1.3%. After removing the frame
drift, the true Sun model error is the ~0.003° above.

---

## Technical Detail

In `moveModel()`, each object's angular position is
`theta = speed * pos − startPos * (PI/180)`; for the Sun `speed = 2π` (one
orbit per year), `startPos = 0`; `_applyEngineEarthFrame` sets the Sun's wheel
angle from the certified longitude after this branch, every frame, so what
follows is the rest pose before the first engine frame. The mean anomaly from
perihelion:

```
perihelionPhase = perihelionPhaseJ2000 + perihelionPrecessionRate * pos
M = theta − perihelionPhase
```

with `perihelionPhaseJ2000` the angular distance from model start to the
perihelion passage (JD <!--v:perihelionPassageJD-->2451547.042<!--/v-->,
January 3.542); `perihelionPrecessionRate` is 0 — the Sun's published
perihelion of date is the N-body series', placed by the engine. Nothing is
fitted beneath the displayed Sun: the wheel is a rest pose, the EoC and the
corrector are derived, and the δ overlay steers onto the certified longitude.

---

## Planet EoC

The planets carry no equation-of-centre branch of their own: their displayed
positions and accuracy are owned by the Keplerian chain
([doc 04](04-dynamic-elements-overview.md)).

---

## Code Locations

- `src/script.js`: `ASTRO_REFERENCE.perihelionPassageJ2000_JD`; the derived EoC constant `eocEccentricity`; the Sun object definition (`eccentricity: eocEccentricity`, `perihelionPhaseJ2000`); the `moveModel` sun block (the EoC, the exact-Kepler corrector, the δ overlay); `_applyEngineEarthFrame` (the engine placement that follows it every frame)
- `tools/lib/constants.js`: derived-constants block
- `tools/lib/scene-graph.js`: Sun eccentricity in the body defs; `moveModel`; the `animateFast` mirror (used by `computeSunPositionFast`)
- `tools/verify/sun-vs-horizons.js`: the Sun's living referee

---

## Verification Checklist

After any change to this system:

1. Run the year analysis report in the browser — check cardinal point timing
2. Verify season lengths: VE-SS ~92.7d, SS-AE ~93.7d, AE-WS ~89.9d
3. Check the precession period is still <!--v:mainstreamAxialPrecExact-->~25,772<!--/v--> years
4. Check year lengths match IAU to within a few seconds
5. Verify the Sun visually speeds up in January and slows down in July
6. Check the equation-of-center display in the UI
7. No NaN values in any object positions
8. The Sun's referee: `node tools/verify/sun-vs-horizons.js` (the ±3000-yr Horizons record); the planets': `data/chain-vs-jpl-rms.json`
