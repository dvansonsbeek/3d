---
docVersion: 1.0
modelVersion: v25.0
coefficients: sha256:91e2d041c7b6e038
status: current
---

# Equation of Center — Implementation Reference

The scene's Sun wheel realizes Kepler's 2nd-law variable speed through a
**split design**: a circular orbit with an offset center (the geometric
half) plus an explicit equation-of-center term (the analytic half), closed
exactly by a derived corrector (the exact-Kepler wheel). This document is
the reference for that construction: the split derivation, the derived
parameters, the corrector, the layering of the displayed Sun, and the
record of the fitted-harmonic layer deleted at plan 09 step 5a.

---

## What It Does

The equation of center adds Kepler's 2nd Law variable speed to the Sun's orbit.
The Sun moves faster near perihelion (January) and slower near aphelion (July):

```
theta += 2 * e * sin(M) + 1.25 * e^2 * sin(2M)
```

Where `e` is the eccentricity and `M` is the mean anomaly from perihelion.
Always on (the former `useVariableSpeed` toggle is hard-wired true since plan
11 step 2). The 2-term series is accurate to <0.01° for e < 0.21 with no
iteration (`moveModel()` runs every frame for ~80 objects), and the split
residual beyond it is removed exactly by the corrector below.

---

## The Split Design (why half the eccentricity)

The model approximates the elliptical orbit as a **circular orbit with an
offset center**: Earth sits at `e(t) × 100` units from the circle center — the
full eccentricity of date (the N-body series since plan 09 step 6), carried by the Perihelion Precession 2
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
(`perihelionPhaseOffset`, derived the same way, was DELETED at plan 11 step 2:
the engine places the Sun at the certified longitude every frame, so the
scene Sun's EoC phase at the model start reached nothing — the section below
is its record.)

### eocEccentricity

```
eoc(t) = e(t) / 2
```

where `e(t)` is Earth's eccentricity of date — the N-body secular series (the
former one-law line is deleted, plan 09 step 6), and the geometric offset
carries the full `e(t)` along the perihelion direction. At J2000:
`eocEccentricityValue` = <!--v:eocEccentricityValue-->0.00836<!--/v--> (the
constants seed `C.eocEccentricity`; `moveModel` supersedes it per frame with
`e(t)/2`). The higher orders (the offset's exact parallax vs the full Kepler
series) are closed exactly by the exact-Kepler corrector below, so the split
introduces no residual.

### perihelionPhaseOffset (record — deleted at plan 11 step 2)

```
perihelionPhaseOffset = (((startModelYear - 2000) / P₁₆ + 16 × kDeviceWheelPhaseAtJ2000Cycles) * 360   // P₁₆ = the K perihelion wheel's recorded period (wheel 16, deleted with the offset); J2000 origin + the device's recorded J2000 wheel phase (plan 07 R10)
                        + correctionSun                                                                   // the scene Sun's start angle (deleted with the offset)
                        + 360 * (startmodelJD - perihelionRefJD) / yearDays) % 360
```

with `perihelionRefJD = 2451547.042` (Earth perihelion 2000, Jan 3.542;
`ASTRO_REFERENCE.perihelionPassageJ2000_JD`). This aligns the EoC perihelion
direction with the geometric perihelion direction set by the EP1 precession
phase at J2000. Value ~0.51° (analytical; the full scene-graph computation
gives −0.79°, a difference with <0.001° effect on Sun position).

### The parameter table

| Parameter | Value | How determined |
|-----------|-------|----------------|
| `eocEccentricity` | e(t)/2 (<!--v:eocEccentricityValue-->0.00836<!--/v--> at J2000) | **Derived**: half the one-law eccentricity, per frame |
| `perihelionPhaseOffset` | DELETED (plan 11 step 2; was ~0.51 deg) | was derived from the EP1 wheel phase + correctionSun + the perihelion date — the engine-placed Sun made it unreachable |
| `correctionSun` | DELETED (plan 11 step 2; was 0.49715 deg) | was the one tunable (summer-solstice timing + Sun RA, the retired optimizer's Step 1) — the engine-placed Sun made it unreachable |
| `useVariableSpeed` | true (hard-wired, plan 11 step 2) | was a toggle |

The geometric offset carries `e(t)·û(ϖ)` itself:
- `eccentricityDerivedMean` (DELETED at plan 11 step 2; was 0.0155200) — base′ of the retired single-line law (derived from e(J2000) and the System-Reset anchor); the legacy path's constant, not a published value — the published e is the N-body series
- `eccentricityAmplitude` (DELETED at plan 11 step 4; was 0.001356) — the Law-4 input A, lately only the Wobble marker's display distance (now the scene literal `WOBBLE_MARKER_RADIUS_SCENE_UNITS`); never a scene arm

### Start-date independence (record)

`eocEccentricity` is start-date independent (derived from e(J2000)). The
deleted `perihelionPhaseOffset` was too (the J2000 precession state); the
deleted `correctionSun` was start-date dependent by construction — it aligned
the scene Sun at the model start, a job the engine-placed Sun does every frame.

---

## The Exact-Kepler Wheel — the split error derived and removed

The split composition (parent center-offset at magnitude e toward the
perihelion direction, plus the sun node's 2nd-order EoC at `e − base/2`)
differs from full Kepler by a residual that is **fully attributed**
(instrument `tools/explore/fq3-wheel-sun-attribution.mjs`):

1. **Amplitudes** — the split differs from full Kepler at first order by
   exactly `e − base` (273.1″ at J2000); closure 97.7% annual / 98.9%
   semiannual / 100% third-harmonic against the raw wheel's measured error
   (278.98″ / 8.93″ / 0.11″ + 4.93″ constant).
2. **Phase** — the wheel's REALIZED offset-vector direction (the composition
   `−base·û(θ_p1) + amp·û(θ_p1+θ_p2)` of the peri-layer phases) sits 1.035°
   from the law's ϖ direction, predicting a 62.3″ annual-quadrature component
   vs the measured 61.8″.

Combined mechanism share ~100%; the offset magnitude tracked the then-shipped
eccentricity law (since replaced by the N-body series, plan 09 step 6) to six
decimals at every probe epoch.

**The corrector.** In difference form the mean longitude cancels, so the
exact-Kepler completion is a pure function of the branch's own live values —
zero constants, no anchor or frame quantity:

```
Δλ = EoC_full(e) − EoC_half(e − base/2) − geoTerm(d⃗, θ_sun)
d⃗  = −base·û(θ_p1) + amp·û(θ_p1 + θ_p2)      (live peri-layer phases)
θ  += Δλ / J                                   (first-order Jacobian)
```

Shipped in both runtimes (the former `FQ3_EXACT_SUN` /
`FQ3_EXACT_SUN_ENABLED` toggles are retired, plan 06 R4, and the fitted
legacy path they restored is deleted, plan 09 step 5a). The offset vector reads the
already-animated parent phases, so the form is integrated-phase correct in
deep-time mode by construction. One convention trap is recorded in the code
comment: node-ry angles are λ-handed — only the raw world-frame `atan2(z,x)`
extraction runs opposite ecliptic longitude.

**Measured** (`tools/explore/fq3-w1-verify.mjs`): twin − wheel
0.80″ annual / 0.57″ sd (the fitted legacy control reads 279.0″/197.4″);
deep time stays bounded (17.8″ at −135, 29.4″ at −3000, 6.6″ at +20000);
Sun-vs-JPL optimizer baseline 0.0029° (the fitted path reads 0.0037° on the
same run); planet baselines unchanged at recorded precision. The ~4.4″
constant residual against the twin is anchor-class — named and left honest,
not absorbed. The certified eclipse chain is untouched by construction
(tier-driven since the umbra strangler).

---

## The Displayed Sun — four layers

```
θ_kinematic    = base scene-graph rotation (constant rate × pos − startPos)
θ_with_EoC     = θ_kinematic + 2·e·sin(M) + 1.25·e²·sin(2M)        ← EoC + exact-Kepler corrector (default path)
θ_with_harms   = θ_with_EoC − Δλ_harmonics(t)                       ← Z-B (record: deleted at plan 09 step 5a; Δλ_harmonics ≡ 0)
θ_displayed    = θ_with_harms + w(t)·(λ_certified − λ_realized)     ← the δ overlay (owns accuracy)
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

Note for A/B tests: the δ is defined against the legacy stack INCLUDING
Z-B, so a clean A/B of the display requires toggling the δ overlay too,
not Z-B alone.

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
orbit per year), `startPos = 0` since plan 11 step 2 (the fitted
`correctionSun` is deleted — `_applyEngineEarthFrame` sets the Sun's wheel
angle from the certified longitude after this branch, every frame, so what
follows is the rest pose before the first engine frame). The mean anomaly from
perihelion:

```
perihelionPhase = perihelionPhaseJ2000 + perihelionPrecessionRate * pos
M = theta − perihelionPhase
```

with `perihelionPhaseJ2000` the angular distance from model start to the
perihelion passage (JD <!--v:perihelionPassageJD-->2451547.042<!--/v-->,
January 3.542); `perihelionPrecessionRate` is 0 (plan 11 step 2 deleted the K
perihelion wheel 16 whose recorded rate it carried — the Sun's published
perihelion of date is the N-body series', placed by the engine).

### The former shared parameter correctionSun (record)

`correctionSun` served as the Sun's `startPos` and the planet
`PerihelionFromEarth` nodes' `startPos`; the planets' `startpos` values were
calibrated against it. Deleted at plan 11 step 2 — every surface it reached
is engine-placed. The planets' `startpos` values, the `perihelionPassageRef`
JDs and the planets' equation-of-centre branch they phased followed at plan
11 step 3 (the chain had overridden the wheels' Kepler motion since K5).

---

## The Deleted Fitted Layer (Z-B Sun-longitude harmonics — record)

What it was: a harmonic absorber on the retired unit's divisors of the geometric-split wheel's
annual imperfection, fit against the Meeus Ch. 25 residual across ±100 yr
around J2000 (smart J2000-anchored). **DELETED at plan 09 step 5a** — the comb
left every Sun path at plan 06 R4 (the Sun is the certified longitude on the
engine Earth frame) and its keys, evaluator and Step-0 fitter are gone; what
follows is the record of what it was:

```
λ_corrected = λ_kinematic − Δλ(t)
Δλ(t) = SUN_LONGITUDE_MEAN + Σₙ [Aₙ·sin(φₙ) + Bₙ·cos(φₙ)],   φₙ = 2π·(year − 2000)/(H/nₙ)   (plan 07 R10: phase from J2000)
```

Active terms after the runtime divisor-whitelist filter (year-multiple divisors,
small precession divisors 1–20, lunar-precession divisors only; anything
else silently skipped as a design-rule safeguard):

| Divisor | Period | sin coefficient | cos coefficient | Amplitude |
|---:|---|---:|---:|---:|
| 335317 | 1 yr | +0.076336 ° | +0.013429 ° | ~279" (dominant) |
| 670634 | ½ yr | +0.002478 ° | +0.000221 ° | ~9" |
| 1,005,951 | ⅓ yr | +0.000034 ° | +0.000008 ° | ~0.1" |

(The divisors are the retired comb unit's 1×, 2× and 3× — a comb-era record; the unit, 335,317 yr, left the model at plan 09 step 7c.)

with `SUN_LONGITUDE_MEAN = −0.0018807°` (a constant offset on the Sun — one of the reasons the comb could not stay). On the legacy path it closed the
scene-vs-Meeus residual 197.77″ → 7.39″ RMS in the modern window, planet
baselines untouched (the correction is applied to the **Sun node only** —
the eccentricity-difference signature is Earth-Sun-specific, and a
barycenter application would rotate the planet chains and degrade their
baselines).

The residual it absorbs originates from a definitional eccentricity
difference: the legacy path's `eccentricityDerivedMean`
(0.0155200, the retired single-line law's base′ — deleted at plan 11 step 2)
vs Meeus's IAU J2000 value (<!--v:j2000Eccentricity-->0.01671022<!--/v-->),
propagating through `2e·sin(M)` as a ~280″ annual term.

**Design rule of the retired comb** (see [tools/fit/README.md](../tools/fit/README.md)): every
correction divisor had to share a factor with the comb unit
(335,317 = 23 × 61 × 239). The framework was
fundamentally cyclic — polynomial-in-T corrections and arbitrary fit
frequencies were not allowed because they don't extrapolate cleanly to deep
time. A greedy re-fit under Z-B found no further lattice-compliant terms
above the 0.05″ threshold; the drift-proxy candidates it surfaced (the unit's
152nd and 167th) violated the rule and were rejected.

**Pipeline position (record).** It was fitted as Step 0, ahead of Step 1
(`correctionSun`), by `tools/fit/sun-longitude-harmonics.js`; the fitter, the
keys and the evaluator are deleted (plan 09 step 5a; git history carries them),
and Step 1 with `correctionSun` followed at plan 11 step 2 — the engine places
the Sun, so nothing is fitted beneath it any more.

Toggles: `SUN_HARMONICS_ENABLED` (src/script.js), env
`SUN_HARMONICS_DISABLED=1` (Node tools).

---

## Planet EoC

The per-planet `eocFraction` constants (the same half-eccentricity split
principle applied to each planet's wheel) were DELETED at plan 11 step 2 —
their only reader was a field nothing set. The planets' displayed positions and
accuracy are owned by the Keplerian chain ([doc 04](04-dynamic-elements-overview.md));
the per-planet EoC write-ups of the retired geometric path are archived.

---

## Code Locations

- `src/script.js`: `ASTRO_REFERENCE.perihelionPassageJ2000_JD`; the derived EoC constant `eocEccentricity`; the Sun object definition (`eccentricity: eocEccentricity`, `perihelionPhaseJ2000`); the `moveModel` sun block (EoC gate, FQ3 corrector, Z-B gate, δ overlay); flags `FQ3_EXACT_SUN_ENABLED`, `E5_WHEEL_SUN_ENABLED`, `SUN_HARMONICS_ENABLED`
- `tools/lib/constants.js`: derived-constants block
- `tools/lib/scene-graph.js`: Sun eccentricity in the body defs; `moveModel`; `FQ3_EXACT_SUN`; the `animateFast` mirror (used by `computeSunPositionFast`)
- `public/input/fitted-coefficients.json`: `SUN_LONGITUDE_MEAN`, `SUN_LONGITUDE_HARMONICS` (DELETED at plan 09 step 5a)
- `tools/fit/sun-longitude-harmonics.js` (Step 0 fitter — DELETED at plan 09 step 5a) · `tools/explore/eoc-constants.js` (numerical verification), `tools/explore/perihelion-offset.js`, `tools/explore/fq3-wheel-sun-attribution.mjs` / `fq3-w1-verify.mjs` (attribution + corrector verification) — all four DELETED at plan 11 step 2 with their inputs (`correctionSun`, `perihelionPhaseOffset`, `eccentricityBase`, wheel 16); git history keeps them

---

## Verification Checklist

After any change to this system:

1. Run the year analysis report in the browser — check cardinal point timing
2. Verify season lengths: VE-SS ~92.7d, SS-AE ~93.7d, AE-WS ~89.9d
3. Check the precession period is still <!--v:mainstreamAxialPrecExact-->~25,771<!--/v--> years
4. Check year lengths match IAU to within a few seconds
5. Verify the Sun visually speeds up in January and slows down in July
6. Check the equation-of-center display in the UI
7. No NaN values in any object positions
8. (`node tools/optimize.js diagnose sun` — eccentricity ratio ~1.08 — the optimizer is DELETED, plan 11 step 2)
9. (`node tools/optimize.js baseline sun` — RA drift ~54 arcsec/yr (frame effect) — deleted with the optimizer; the Sun's record is `tools/verify/sun-vs-horizons.js`)
10. (`node tools/explore/fq3-w1-verify.mjs` — twin − wheel ~0.80″ annual / ~0.57″ sd; the control reproduced the raw split error (279.0″ annual / 197.4″ sd) — the instrument is DELETED at plan 11 step 2 with its inputs; the numbers stand as the record)
11. (`node tools/optimize.js baseline all` — deleted with the optimizer; the planets' record is `data/chain-vs-jpl-rms.json`)
12. Legacy path (`FQ3_EXACT_SUN=0`): the annual-correction instrument (deleted at plan 09 step 7e; record in [doc 109 §22](109-model-nbody-engine-and-lattice-test.md)) read a raw residual ~198″ RMS, ~7″ RMS with the 3-term fit; its greedy dry-run found no new terms above 0.05″
