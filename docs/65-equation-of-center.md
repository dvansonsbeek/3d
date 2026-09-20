---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:3f803b0a4e2b0b3c
status: current
---

# Equation of Center — Implementation Reference

The scene's Sun wheel realizes Kepler's 2nd-law variable speed through a
**split design**: a circular orbit with an offset center (the geometric
half) plus an explicit equation-of-center term (the analytic half), closed
exactly by a derived corrector (the exact-Kepler wheel). This document is
the reference for that construction: the split derivation, the derived
parameters, the corrector, the layering of the displayed Sun, and the
legacy fitted-harmonic layer that remains in the registry.

---

## What It Does

The equation of center adds Kepler's 2nd Law variable speed to the Sun's orbit.
The Sun moves faster near perihelion (January) and slower near aphelion (July):

```
theta += 2 * e * sin(M) + 1.25 * e^2 * sin(2M)
```

Where `e` is the eccentricity and `M` is the mean anomaly from perihelion.
Gated by `useVariableSpeed`; when false, all orbits use constant angular
velocity. The 2-term series is accurate to <0.01° for e < 0.21 with no
iteration (`moveModel()` runs every frame for ~80 objects), and the split
residual beyond it is removed exactly by the corrector below.

---

## The Split Design (why half the eccentricity)

The model approximates the elliptical orbit as a **circular orbit with an
offset center**: Earth sits at `e(t) × 100` units from the circle center — the
full eccentricity of the one H/3 law, carried by the Perihelion Precession 2
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

Both `eocEccentricity` and `perihelionPhaseOffset` are **derived from existing
model constants** — not tunable.

### eocEccentricity

```
eoc(t) = e(t) / 2
```

where `e(t) = base′·(1 + cos θ₃(t)/2)` is the one eccentricity law (the same
line the Moon channel and the eclipse Sun ride), and the geometric offset
carries the full `e(t)` along the perihelion direction. At J2000:
`eocEccentricityValue` = <!--v:eocEccentricityValue-->0.00836<!--/v--> (the
constants seed `C.eocEccentricity`; `moveModel` supersedes it per frame with
`e(t)/2`). The higher orders (the offset's exact parallax vs the full Kepler
series) are closed exactly by the exact-Kepler corrector below, so the split
introduces no residual.

### perihelionPhaseOffset

```
perihelionPhaseOffset = ((startModelYear - balancedYear) / (H/16) * 360
                        + correctionSun
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
| `perihelionPhaseOffset` | ~0.51 deg | **Derived**: from EP1 precession phase + correctionSun + perihelion date |
| `correctionSun` | <!--v:correctionSunDeg-->0.49715<!--/v--> | **Tuned**: aligns summer solstice timing + Sun RA (the one tunable) |
| `useVariableSpeed` | true | Toggle |

The geometric offset carries `e(t)·û(ϖ)` itself:
- `eccentricityDerivedMean` = <!--v:eccentricityDerivedMean-->0.0155200<!--/v--> — base′, the one law's mean (derived from e(J2000) and the System-Reset anchor)
- `eccentricityAmplitude` = <!--v:eccentricityAmplitude-->0.001356<!--/v--> — the Law-4 input A and the wobble-marker distance; not a scene arm

### Start-date independence

`eocEccentricity` and `perihelionPhaseOffset` are start-date independent
(derived from the law and the J2000 precession state; the perihelion
direction precesses dynamically via `perihelionPrecessionRate * pos`).
`correctionSun` is start-date dependent by construction — it aligns the Sun
at model start.

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

Combined mechanism share ~100%; the offset magnitude tracks the H/16 e-law
to six decimals at every probe epoch.

**The corrector.** In difference form the mean longitude cancels, so the
exact-Kepler completion is a pure function of the branch's own live values —
zero constants, no anchor or frame quantity:

```
Δλ = EoC_full(e) − EoC_half(e − base/2) − geoTerm(d⃗, θ_sun)
d⃗  = −base·û(θ_p1) + amp·û(θ_p1 + θ_p2)      (live peri-layer phases)
θ  += Δλ / J                                   (first-order Jacobian)
```

Shipped in both runtimes and **default ON** (`FQ3_EXACT_SUN` in
`tools/lib/scene-graph.js`, `FQ3_EXACT_SUN_ENABLED` in `src/script.js`;
`=0` restores the fitted legacy path). The offset vector reads the
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
θ_with_harms   = θ_with_EoC − Δλ_harmonics(t)                       ← Z-B (legacy path only; skipped when FQ3 is on)
θ_displayed    = θ_with_harms + w(t)·(λ_certified − λ_twin)         ← the δ overlay (owns accuracy)
```

The δ overlay (`E5_WHEEL_SUN_ENABLED`; weight w(t) = 1 in the corpus era,
tapering off at the clock-convention boundary — a TT-clock Sun would clash
with the deliberately-UT deep-time scene) steers the world-frame Sun onto
the certified framework-native Sun of the eclipse chain
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
orbit per year), `startPos = correctionSun`. The mean anomaly from
perihelion:

```
perihelionPhase = perihelionPhaseJ2000 + perihelionPrecessionRate * pos
M = theta − perihelionPhase
```

with `perihelionPhaseJ2000` composed from the Sun's theta at model start
(−correctionSun), the angular distance from model start to the perihelion
passage (JD <!--v:perihelionPassageJD-->2451547.042<!--/v-->, January 3.542),
and the derived `perihelionPhaseOffset`. The phase precesses at
`2π / (H/16)` radians per simulation year.

### Shared parameter: correctionSun

`correctionSun` serves dual purposes: the Sun's `startPos`, and the planet
`PerihelionFromEarth` nodes' `startPos`. Changing it shifts all planet RA
values by the same amount; planet `startpos` values are calibrated against
it.

---

## The Legacy Fitted Layer (Z-B Sun-longitude harmonics)

> **Not on the display path.** With `FQ3_EXACT_SUN(_ENABLED)` on (the
> default in both runtimes) the moveModel sun does not evaluate this
> correction — the split error it absorbed is derived and removed at the
> geometry level. The fitted terms remain registry constants
> (`fitted-coefficients.json`; Step 0 is their fitter; the planetary
> completion's PAIRED hash fingerprints them; `computeSunPositionFast` —
> the declared Step-6a instrument — and the legacy A/B path apply them).

What it is: an anchor-divisor harmonic absorber of the geometric-split wheel's
annual imperfection, fit against the Meeus Ch. 25 residual across ±100 yr
around J2000 (smart J2000-anchored):

```
λ_corrected = λ_kinematic − Δλ(t)
Δλ(t) = SUN_LONGITUDE_MEAN + Σₙ [Aₙ·sin(φₙ) + Bₙ·cos(φₙ)],   φₙ = 2π·(year − balancedYear)/(H/nₙ)
```

Active terms after the runtime divisor-whitelist filter (year-multiple divisors,
small precession divisors 1–20, lunar-precession divisors only; anything
else silently skipped as a design-rule safeguard):

| Divisor | Period | sin coefficient | cos coefficient | Amplitude |
|---:|---|---:|---:|---:|
| <!--v:HPlain-->335317<!--/v--> | 1 yr | +0.076336 ° | +0.013429 ° | ~279" (dominant) |
| 670634 | ½ yr | +0.002478 ° | +0.000221 ° | ~9" |
| <!--v:threeH-->1,005,951<!--/v--> | ⅓ yr | +0.000034 ° | +0.000008 ° | ~0.1" |

with `SUN_LONGITUDE_MEAN = −0.0018807°`. On the legacy path it closes the
scene-vs-Meeus residual 197.77″ → 7.39″ RMS in the modern window, planet
baselines untouched (the correction is applied to the **Sun node only** —
the eccentricity-difference signature is Earth-Sun-specific, and a
barycenter application would rotate the planet chains and degrade their
baselines).

The residual it absorbs originates from a definitional eccentricity
difference: the legacy path's `eccentricityDerivedMean`
(<!--v:eccentricityDerivedMean-->0.0155200<!--/v-->, the one law's base′)
vs Meeus's IAU J2000 value (<!--v:j2000Eccentricity-->0.01671022<!--/v-->),
propagating through `2e·sin(M)` as a ~280″ annual term.

**Design rule** (see [tools/fit/README.md](../tools/fit/README.md)): every
correction divisor must share a factor with
H = <!--v:holisticYearFactors-->23 × 61 × 239<!--/v-->. The framework is
fundamentally cyclic — polynomial-in-T corrections and arbitrary fit
frequencies are not allowed because they don't extrapolate cleanly to deep
time. A greedy re-fit under Z-B finds no further lattice-compliant terms
above the 0.05″ threshold; the drift-proxy candidates it surfaces (H/152,
H/167) violate the rule and are rejected.

**Pipeline position — Step 0.** The coefficients capture a structural
property (the eccentricity-definition gap), stable across normal refits;
re-run Step 0 only when H, the eccentricity definition, or the Meeus Ch. 25
reference changes. Running Step 0 first lets Step 1 (`correctionSun`)
converge in a single pass:

```
SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write   # Step 0
node tools/optimize.js optimize sun correctionSun --write                    # Step 1
```

An ad-hoc harmonics re-fit invalidates `correctionSun` (follow with Step 1).

Toggles: `SUN_HARMONICS_ENABLED` (src/script.js), env
`SUN_HARMONICS_DISABLED=1` (Node tools).

---

## Planet EoC

The per-planet `eocFraction` constants (the same half-eccentricity split
principle applied to each planet's wheel) remain in the legacy scene
scaffolding as device anchors. The planets' displayed positions and
accuracy are owned by the Keplerian chain ([doc 04](04-dynamic-elements-overview.md));
the per-planet EoC write-ups of the retired geometric path are archived
([retired record](retired-record.md)).

---

## Code Locations

- `src/script.js`: `useVariableSpeed`; `ASTRO_REFERENCE.perihelionPassageJ2000_JD`; the derived constants after `eccentricityDerivedMean`; the Sun object definition (`eccentricity: eocEccentricity`, `perihelionPhaseJ2000`); the `moveModel` sun block (EoC gate, FQ3 corrector, Z-B gate, δ overlay); flags `FQ3_EXACT_SUN_ENABLED`, `E5_WHEEL_SUN_ENABLED`, `SUN_HARMONICS_ENABLED`
- `tools/lib/constants.js`: derived-constants block
- `tools/lib/scene-graph.js`: Sun eccentricity in the body defs; `moveModel`; `FQ3_EXACT_SUN`; the `animateFast` mirror (used by `computeSunPositionFast`)
- `public/input/fitted-coefficients.json`: `SUN_LONGITUDE_MEAN`, `SUN_LONGITUDE_HARMONICS`
- `tools/fit/sun-longitude-harmonics.js` (Step 0 fitter) · `tools/explore/sun-annual-correction.js` (Z-B verification) · `tools/explore/eoc-constants.js` (numerical verification) · `tools/explore/fq3-wheel-sun-attribution.mjs` / `fq3-w1-verify.mjs` (attribution + corrector verification)

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
8. `node tools/optimize.js diagnose sun` — eccentricity ratio ~1.08
9. `node tools/optimize.js baseline sun` — RA drift ~54 arcsec/yr (frame effect)
10. `node tools/explore/fq3-w1-verify.mjs` — twin − wheel ~0.80″ annual / ~0.57″ sd; the control (`FQ3_EXACT_SUN=0 SUN_HARMONICS_DISABLED=1`) reproduces the raw split error (279.0″ annual / 197.4″ sd)
11. `node tools/optimize.js baseline all` — planet baselines unchanged; Sun RMS Total ~0.0029°
12. Legacy path (`FQ3_EXACT_SUN=0`): `node tools/explore/sun-annual-correction.js` — raw residual ~198″ RMS, ~7″ RMS with the 3-term fit; a greedy dry-run finds no new lattice-compliant terms above 0.05″
