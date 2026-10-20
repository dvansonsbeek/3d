---
docVersion: 1.0
modelVersion: v26.2
coefficients: sha256:ff77fbc9baa370e4
status: current
---

# Constants Reference

This document is the **single source of truth** for all constants used in the ESSRT simulation. Other documents should reference this document rather than duplicating values.

> **Synchronized with `tools/lib/constants.js`** — the frontmatter `coefficients` hash records the exact coefficient state this doc tracks.

### Code organization

Constants in `src/script.js` are organized into 11 numbered sections with sub-headers:

1. Foundational Model Constants — 2. Model Start & Physical Constants — 3. Sun & Moon Input Constants — 4. Planet Input Constants (4a. major planets, 4b. minor bodies, 4c. ascending nodes) — 5. Inclination System (5a–5d) — 6. Predictive Formula System — 7. Body Diameters — 8. Astronomical Reference Values / ASTRO_REFERENCE (8a–8g) — 9. Derived Constants (9a–9e) — 10. Mass Calculations (10a–10b) — 11. Orbital Formulas (11a–11c)

The shared tools module `tools/lib/constants.js` mirrors these with its own 14-section structure.

### How other documents should reference constants

- **Rule A — Registry keys stay, hand-computed numbers go.** Write a registry value tag (the `v:` marker with the key name) or the named quantity, never a hand-derived year count. (Plan 06 S5: "H/13" is no longer a period; since plan 09 the J2000 axial precession period is 1,296,000/p_A on the IAU 2006 input, registry `axialPrecYears`.)
- **Rule B — Device integers stay inline where they are devices.** The K-device scaffold's wheel indices (3, 5, 8, 13, 16) are identifiers of the scene's recorded pose; they are not stated as periods or laws on presentation surfaces (plan 06 D3/P6). The correction combs and the frozen clock's counters the rule once also covered are deleted (plan 09).
- **Rule C — Approximate values for readability.** Use "the axial precession period (<!--v:axialPrecRound-->~25,772<!--/v--> years; see [Constants Reference](20-constants-reference.md))" when a number aids understanding.
- **Rule D — Tables reference this document.** If a doc repeats planet parameters, add: "For current values see [Constants Reference](20-constants-reference.md)."

---

### ESSRT epoch dependence — most tabulated values are J2000-anchored

Per the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md), the model has two distinct categories of "constants":

- **Device integers** — DELETED. The K-device scaffold's wheel indices were identifiers of the scene's recorded J2000 pose (`kDeviceWheelPeriodYears`, keyed by index), never periods or laws; plan 11 step 4 deleted the wheels and the block, and the scene's world frame is the J2000 ecliptic with every frame of date engine-placed. The physical periods below are dynamical values, and the climate formula rides the engine's own orbital lines (plan 06 T1). (The correction combs' divisors and the frozen clock's counters were the other device integers until plan 09 deleted them.)
- **Epoch-dependent periods, lengths, and seconds-values** — these evolve at deep time: the spin-tier periods with the composed lunisolar precession clock, the orbital periods with the solar-mass history. **Most numeric values tabulated below** (sidereal year = 365.25636 days; LOD = 86,400 s; Moon distance = 384,399 km; planet orbital periods in years; etc.) are **J2000-epoch values** — the model's primary calibration anchor. They apply to the modern era; for deep-time / future-projection work, use the epoch-dependent helpers in `src/script.js`:

| J2000-anchored constant in this doc | Epoch-dependent helper (accepts `t_Ma` argument) |
|---|---|
| `meanLengthOfDay` (~86,400.0 s) | `meanLodSecondsAtAge(t_Ma)` |
| `meanSiderealYearSeconds` (`siderealYearJ2000 × 86400`) | `meanSiderealYearSecondsAtAge(t_Ma)` |
| Tropical year (from `meanSolarYearDays`) | `meanTropicalYearSecondsAtAge(t_Ma)` |
| Moon distance (`moonDistance` = <!--v:moonOrbitalRadius-->384,399.07<!--/v--> km) | `meanMoonDistanceMetresAtAge(t_Ma)` |
| Planet orbital periods (Part 4 `solarYearInput`) | `meanPlanetOrbitalPeriodAtAge(t_Ma, T_p_J2000_s)` |
| α(t) GIA correction → ΔT | `meanDeltaTSecondsAtAge(t_Ma)` |

The clocks evolve under two physically independent drivers: **Driver 1** = Earth-Moon tidal evolution (LOD grows, Moon recedes; the composed lunisolar precession period T_p(t) follows it); **Driver 2** = solar mass loss (every planet's orbit slowly expands via Kepler's 3rd law). At Devonian (380 Ma) T_p ≈ <!--v:axialPrecAtDevonian-->21,235<!--/v--> yr; at +200 Myr T_p ≈ <!--v:axialPrecAt200MyrFuture-->28,315<!--/v--> yr. (The unit H(t) that scaled with it — 13.011 periods, a fit constant's multiple — left the model at plan 09 step 7b.) The K-device wheel periods are a J2000 pose and do not scale; no observable rides them.

For the canonical derivation chain from `t_Ma` through LOD, the composed precession period, AU, M_Sun, Kepler year, Moon distance, Moon period, anomalistic year, stellar/sidereal days, and planet orbital + synodic periods, see [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) and the `mean*AtAge` family — ONE home since plan 13 B2, `@essrt/physics/deltat/deep-time-chain` (`createDeepTimeChain`; `tools/lib/deep-time.js` and the package model are its consumers). (The per-planet integer-label tabulation on the anchor's eight-unit interval is archived.)

---

## Parameter Accounting

**This section is the canonical parameter accounting.** The model is two
engines, and its numbers fall into three ledgers. No single "N free
parameters" headline is published — the ledgers are the accounting. Other
documents (and the simulator's About panel) should reference this section
rather than carrying their own counts. (The former "6 DOF / Config #7"
accounting is retired; [doc 109](109-model-nbody-engine-and-lattice-test.md)
is the evidence record, and git history carries the old section.)

### Ledger 1 — the orbital dynamics engine's inputs (the planets — cited, not fitted)

Free parameters: **none**. The planetary side is derived from published
measurements taken as-is:

| Input | Source |
|---|---|
| One J2000 heliocentric state (positions + velocities, all eight planets) | JPL Horizons vectors, one epoch |
| Mass ratios | JPL DE440 |
| Relativistic correction | 1PN, standard form |
| The planets' spin inputs — J₂ (at its source's reference radius), C/MR² (class named: gravity-constrained / spin-inferred / interior-model), the IAU J2000 pole and signed rotation rate, the regular satellites' GM and orbits | `astro-reference.json` `planetSpinPhysical` (cited per value in its `_description`); the precession constant is DERIVED from them in `planets/spin-channel.cjs` (plan 06 Phase 7) |

Everything downstream — the element chains, the secular g/s mode tables,
the 405.6-kyr eccentricity metronome, the obliquity hybrid — is derived
from that seed. Integrator order and step are reproducibility conventions,
not parameters.

**Earth's published orbit rides this ledger.** e(t), the inclination and
node, ϖ of date and the obliquity hybrid derive from the same N-body seed,
the IAU 2006 J2000 obliquity (the hybrid's initial condition, plan 06 S3b)
and the precession anchor p_A (Ledger 2). None of the K-device scaffold's
pose constants enter them.

### Ledger 2 — the lunisolar precession channel (Earth's spin & time)

The channel's constants are derived or cited; two measured histories sit
behind fail-proven gates. None is a free parameter:

| Constant | Status | Value | Source |
|---|---|---|---|
| Precession anchor p₀ | cited input | <!--v:axialPrecExact-->25,771.58<!--/v--> yr | 1,296,000 / p_A with p_A the IAU 2006 general precession in longitude, 50.28796195 ″/yr (`generalPrecessionJ2000_arcsecPerYr`; plan 09 — before it, the retired year combs' beat at 2000, 25,771.395 yr, 8 ppm faster). The deep-time rate composes ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] |
| Solar torque share f_S | derived at runtime | <!--v:earthPrecSolarShareJ2000Pct-->31.6<!--/v--> % | GM☉, the lunar constants and the J2000 obliquity (`precession-composed` `computeSolarTorqueShare`) |
| Lunar recession history | CITED INPUT + the LLR slope, paleo-TESTED | `data/astrogeo22-earth-moon.json` (the shape), `alpha1PerMa` (the J2000 slope) | plan 12 option A: the Earth–Moon distance history is Farhat, Auclair-Desrotour, Boué & Laskar 2022's published solution (the AstroGeo22 ephemeris, 0–4,429 Ma), read as the ratio a(t)/a(0) on the model's observed J2000 distance; the J2000 slope is the LLR rate <!--v:modernLLRRecessionCmYr-->3.82<!--/v--> cm/yr (Dickey 1994 / Chapront 2002, cited). Nothing is fitted to the rock record: the 45-anchor paleo gate tests the derived day length, distance and precession on it, every band naming its cause (the former quartic's α₃/α₄ and the rock-fitted regime knots are deleted) |
| GIA channel | k derived, τ measured | τ = <!--v:alphaGiaRelaxationKyr-->6<!--/v--> kyr | the polar moment's lagged response to the climate formula's L1 ice proxy: k derived at runtime from the Cox & Chao 2002 dJ₂/dt; τ measured against the historical ΔT record through the joint fitter (plan 06 D7) |
| Oblateness of date | cited + derived | dJ₂/dt = <!--v:j2RateJ2000Per1e11Yr-->−2.7<!--/v--> ×10⁻¹¹ /yr (`j2RateJ2000PerYr`), J₂ = `earthJ2` | the OBSERVED satellite rate (Cox & Chao 2002) scales the GIA channel's second observable, J₂(t)/J₂₀ (`climate/l1-orbital` `j2RatioAt`) — the precession rate is proportional to the dynamical ellipticity, so the spin integration multiplies it into the rate of date. Stored as its own input: the precession side is anchored on the observation, independent of the J₂→α conversion of the length-of-day side |
| Solar torque of date | derived at runtime | 1 + f_S·([(1 − e²)/(1 − e₀²)]^(−3/2) − 1) | the solar share's own (1 − e²)^(−3/2) evaluated at the one-source eccentricity of date (`earth/deep-orbital-history`); +<!--v:precOfDateSolarTorqueMeanLastMyrPct-->0.032<!--/v--> % on the million-year mean |
| Solar mass loss | cited | luminosity/c² + wind | published constants (`deriveEpochParams`) — the Driver-2 stretch of every heliocentric period; the μ(t) the two-expansions consistency leg tests |

#### The K-device scene pose — recorded constants (5)

These are the recorded J2000 pose of the scene's K-device scaffold — NOT
constants of the published Earth orbit or clock (Ledgers 1–2). The frozen
era device they once belonged to (plan 06 D8) — the fitted unit, its
counters and every correction comb — is deleted (plan 09; `model-version.json`
`_v24Note`). No observable rides them: the engine places the Earth frame,
the Sun and the Moon stack over the scaffold. They left at plan 11 step 4,
and the file that carried them, `model-parameters.json`, is DELETED at step 6
— `astro-reference.json` is the one input file (its `timeReference` holds the
scene epoch); the planets' display names, the file's last leaf, are code
(`@essrt/physics` `planets/display-names`).

| # | Constant | Variable | Value | Anchored by |
|---|-----------|----------|-------|-------------|
| 1–5 | DELETED (plan 11 step 4). The K wheels' recorded periods (111,772.3 / 67,063.4 / 41,914.6 / 25,793.6 scene years — the retired unit's 335,317/N), the mean obliquity `earthtiltMean` (23.41353°), the inclination amplitude `earthInvPlaneInclinationAmplitude` (0.63607°), the inclination wheel's phase `kDeviceInclinationPhaseJ2000Deg` (81.17719°) and the wheels' phase `kDeviceWheelPhaseAtJ2000Cycles` (0.908498525) were the scene scaffolding's J2000 pose. Measured on the Node twin before their deletion, that pose was the J2000 ecliptic frame to 0.026° of pole tilt, with the J2000 equinox at view azimuth 90.0066° in the browser (the Node twin's pose read 158.2265° = 180° − the retired inclination anchor; step 4 first shipped that one and turned the browser's world 68.2° against its skydome — corrected). The scene's world frame IS the J2000 ecliptic now (`@essrt/physics` `computeSceneWorldFrameJ2000`: world Y the J2000 ecliptic pole, the equinox along world +X, view azimuth 90° — the only scene literal the pose leaves, kept for visual continuity); the three precession wheels are deleted and every frame of date is placed from the engine through it in both twins. Two display literals remain in `src/script.js`: the Wobble marker's radius (`WOBBLE_MARKER_RADIUS_SCENE_UNITS`, the former A × 100) and the inclination loop's zero (`INCLINATION_PATH_ZERO_DEG`). | — | — | — |

The wheel indices are pose identifiers — not degrees of freedom and not
laws; what the three pre-registered falsification legs test is the
physics: the composed precession clock, the obliquity beat, the
two-expansions μ-consistency. (The deleted correction bases had measured
their phase from J2000 since plan 07 R10: they were fitted against an
origin t₀ counted back from the 1246 AD alignment by 14.5 perihelion-of-date
beats, and that origin was rotated out of every coefficient exactly — so
neither the beat count nor any earlier epoch is an input of the model.)
Earth's eccentricity is not a parameter: e(J2000) is an observed
calibration input, and e of date is the N-body series.

### Ledger 3 — the fitted correction stack (named, gated, hashed)

The fitted artifacts under the coefficients hash (shown in the simulator's
About → Model Identity) are the shipped `data/` fits that
`tools/constants/generate.mjs` embeds: the ΔT stack (`DT_STACK`), the
core-mantle resonator (`DT_RESONATOR`) and the climate formula
(`CLIMATE_FORMULA_COEFFS`); beside them sit the measured osculating-mean
offset (`EARTH_OSCULATING_MEAN_OFFSET`, derived, not fitted), the literature
Meeus lunar term tables and the frozen balance-search record. The GIA τ is
the banked fitted record `data/deep-time-fitted.json` (plan 11 step 1; the
recession knots and the quartic's α₃/α₄ left it at plan 12 option A — the
distance history is the cited input above; the deep-time block of the
constants is ASSEMBLED from it, from astro-reference's LLR α₁ and Cox & Chao
block, and from the ΔT stack's own `shipped_taper` — one home per leaf, under
the constants hash). The regime fitter in the tree no longer reproduces those
knots on the current engine (measured; the artifact's note records the
divergence) — a refit is a campaign under the paleo-anchors gate, never a
side effect. Every fit is fitter-owned, provenance-tracked, and behind
fail-proven gates; the paleo-anchors gate fails on an unexplained
*improvement* too. None of them touch the planetary dynamics (Ledger 1).
`fitted-coefficients.json` is deleted (plan 11 step 1), having held only its
description since plan 09: the year-length harmonics and the
cardinal-point family were the FROZEN era clock's basis — a device, not the
published year lengths (plan 06 Phase 3 S2) — and plan 09 deleted them
family by family with the obliquity, perihelion, Sun-longitude and RA-day
combs, the cardinal record last with the clock's own counter (step 7a):
the published tropical, sidereal and anomalistic years of date and the
precession periods ride the one-family route (`model.yearLengths`, doc 110
chain 3.2 route B).

### Core Calibration Inputs (28 — Earth, Sun & Moon)

The 28 Earth/Sun/Moon reference values from astronomical observations (IAU,
JPL, Meeus) used to anchor the model, tabulated below. The **per-planet**
calibration inputs (J2000 orbital elements, orbital periods, mass ratios,
axial tilts) are tabulated in [Part 3 — External Reference Values](#part-3--external-reference-values)
and [Part 4 — Tuned/Optimized Parameters](#part-4--tunedoptimized-parameters);
they anchor per-planet geometry but carry no model freedom.

| Parameter | Variable | Value |
|-----------|----------|-------|
| Perihelion-solstice alignment | `perihelionalignmentYear` | <!--v:periAlignYear-->1246.03125<!--/v--> AD |
| Long. perihelion (J2000) | `perihelionLongitudeJ2000_deg` | <!--v:earthPerihelionLongitudeJ2000-->102.947<!--/v-->° — the IAU/Standish MEAN element; the series' secular element at J2000 is <!--v:earthSeriesPeriLongJ2000-->102.918<!--/v-->°, <!--v:earthConventionGapPeriArcsec-->105<!--/v-->″ lower (two conventions, labelled not reconciled) |
| Obliquity (J2000) | `obliquityJ2000_arcsec` | <!--v:obliquityJ2000Arcsec-->84381.406<!--/v-->" (<!--v:obliquityJ2000Deg-->23.439279<!--/v-->°) |
| Obliquity rate (J2000) | `obliquityRate_arcsecPerCentury` | −46.836769"/cy |
| Obliquity range | — | <!--v:mainstreamObliqRange-->~22.1° to ~24.5°<!--/v--> |
| Earth incl. (J2000) | `earthInclinationJ2000_deg` | <!--v:earthInclJ2000-->1.57869<!--/v-->° |
| Eccentricity (J2000) | `eccentricityJ2000` | <!--v:j2000Eccentricity-->0.01671022<!--/v--> — the IAU/Standish MEAN element; the series' secular element at J2000 is <!--v:earthSeriesEccJ2000-->0.01670244<!--/v-->, <!--v:earthConventionGapEcc-->7.8e-6<!--/v--> lower (two conventions) |
| Sidereal year (J2000) | `siderealYearJ2000` | <!--v:siderealYearInputDays-->365.256363004<!--/v--> days |
| Tropical year mean (J2000) | `tropicalYearMeanJ2000` — DERIVED | <!--v:tropicalYearMeanJ2000Days-->365.242190469<!--/v--> days — the beat of the sidereal year and p_A, 1/T = 1/T_sid + p_A/(1,296,000″·365.25 d), one home (`computeMeanTropicalYearJ2000Days`; plan 09 — the Meeus & Savoie 1992 input 365.2421897, 66 ms shorter, left the registry) |
| Tropical year VE (J2000) | `tropicalYearVEJ2000` | <!--v:tropicalYearVEJ2000Days-->365.242374<!--/v--> days |
| Tropical year SS (J2000) | `tropicalYearSSJ2000` | <!--v:tropicalYearSSJ2000Days-->365.241626<!--/v--> days |
| Tropical year AE (J2000) | `tropicalYearAEJ2000` | <!--v:tropicalYearAEJ2000Days-->365.242018<!--/v--> days |
| Tropical year WS (J2000) | `tropicalYearWSJ2000` | 365.242740 days |
| Anomalistic year (J2000) | derived — the law of date at 2000 | <!--v:anomalisticYearJ2000Days-->365.2596350<!--/v--> days (the series' own apsidal rate on the sidereal year; Simon 1994's mean element <!--v:anomalisticYearSimon1994Days-->365.259636<!--/v--> is a citation, <!--v:anomalisticYearSimon1994DeltaSeconds-->-0.088<!--/v--> s) |
| Tropical year rate | `tropicalYearRateSecPerCentury` | −0.53 s/cy |
| June Solstice 2000 JD | `juneSolstice2000_JD` | <!--v:juneSolstice2000JD-->2451716.575<!--/v--> |
| Cardinal instants 2000 (VE / SS / AE / WS, UTC) | `cardinalPointAnchors` | <!--v:cardinalAnchorVE2000JD-->2451623.816<!--/v--> / <!--v:cardinalAnchorSS2000JD-->2451716.575<!--/v--> / <!--v:cardinalAnchorAE2000JD-->2451810.2271<!--/v--> / <!--v:cardinalAnchorWS2000JD-->2451900.0674<!--/v--> |
| Solar day (J2000) | `solarDayJ2000` | 86400.0 s |
| Sidereal day (IAU, on the SI day of 86,400 s) | `siderealDayJ2000` | <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> s |
| Stellar day (IAU 2000A, on the SI day of 86,400 s) | `stellarDayJ2000` | <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s |
| Perihelion passage JD | `perihelionPassageJ2000_JD` | <!--v:perihelionPassageJD-->2451547.042<!--/v--> |
| Moon mean anomaly (J2000) | `moonMeanAnomalyJ2000_deg` | <!--v:moonMeanAnomalyJ2000Deg-->134.9634<!--/v-->° |
| Moon mean anomaly rate | `moonMeanAnomalyRate_degPerDay` | <!--v:moonMeanAnomalyRateDegPerDay-->13.06499295<!--/v-->°/day |
| Moon elongation (J2000) | `moonMeanElongationJ2000_deg` | <!--v:moonMeanElongationJ2000Deg-->297.8502<!--/v-->° |
| Moon elongation rate | `moonMeanElongationRate_degPerDay` | <!--v:moonMeanElongationRateDegPerDay-->12.19074912<!--/v-->°/day |
| Sun mean anomaly (J2000) | `sunMeanAnomalyJ2000_deg` | <!--v:sunMeanAnomalyJ2000Deg-->357.5291<!--/v-->° |
| Sun mean anomaly rate | `sunMeanAnomalyRate_degPerDay` | <!--v:sunMeanAnomalyRateDegPerDay-->0.98560028<!--/v-->°/day |
| Moon arg. latitude (J2000) | `moonArgLatJ2000_deg` | <!--v:moonArgLatJ2000Deg-->93.2720993<!--/v-->° |

---

# Part 1 — Foundational Model Constants

These constants define the model. Changing any of them changes the theory.

## The perihelion alignment year — and the retired timing anchor

| Constant | Variable | Value |
|----------|----------|-------|
| Perihelion alignment year | `perihelionalignmentYear` | <!--v:periAlignYear-->1246.03125<!--/v--> AD |

**Retired (plan 09, the record).** The frozen era device's unit — the "fitted timing anchor" `holisticyearLength`, 335,317 years, fitted on the 1246 AD perihelion–solstice alignment of the IAU mean elements (Meeus; the model's own series crosses two years later, at 1247.7 AD) — was the unit of the correction combs, the era clock's counters and the lattice grid (`stepYears`), together with the device's rounded mean-tropical-year input `inputmeanlengthsolaryearindays` = 365.2422 d. Plan 09 deleted the combs family by family, then the counters (step 7a), the unit function (7b) and finally the inputs themselves (7c): the time machinery rides the composed lunisolar precession clock T_p(t) (the IAU p_A at J2000, <!--v:axialPrecExact-->25,771.58<!--/v--> years) and the N-body series' elements of date, the J2000 mean tropical year is DERIVED from the IAU sidereal year and p_A, and the K-device scaffold's wheels turn at recorded periods (`kDeviceWheelPeriodYears`, above). It was never a period: the unit stood at 13.011 precession periods, a fit constant (plan 06 S5). (Plan 07 R10 had already removed the phase origin's inputs `temperatureGraphMostLikely` and `systemResetN`; the combs measured their phase from J2000.) The literals gate fails if any of these inputs returns.

## Earth Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Base Eccentricity | (`eccentricityBase` — DELETED, plan 11 step 2) | was 0.015386 | The Law-5 constant of the retired K law; its last reader was a fallback the panel always pre-empted. The perihelion wheel's offset base′ (`eccentricityBaseDerived`) went with it — the engine places the offset arm at the series' e of date every frame, and the rest pose before the first frame is e(J2000). Earth's published e of date is the N-body series (the H/3 law is deleted, plan 09 step 6) |
| Eccentricity Amplitude | (`eccentricityAmplitude` — DELETED, plan 11 step 4) | was 0.001356 | The Law-4 K input A, lately only the Wobble marker's display radius (now the scene literal `WOBBLE_MARKER_RADIUS_SCENE_UNITS`); the K law it calibrated is retired. Its derivation record: the 1246 triangle closure e(J2000)² = base² + A² + 2·base·A·cos φ on the H/16 beat from the <!--v:periAlignYearRound-->1246.03<!--/v--> perihelion–solstice alignment reproduced this value (the closure's registry keys — the phase, the derived A and the ±5 % alignment-year test — left with the eccentricity law at plan 09 step 6). A does not enter any e(t): Earth's eccentricity of date is the N-body series |
| Mean Obliquity | (`earthtiltMean` — DELETED, plan 11 step 4) | was 23.41353 deg | The K scaffold's mean tilt; the rendered obliquity of date is the hybrid spin integration, its J2000 anchor the astro-reference input |
| RA Angle | (`earthRAAngle` — DELETED, plan 11 step 4) | was ~1.254 | The scaffold's derived `2A − A²/ε`, the perihelion wheel's tilt; the perihelion pair's container is world-placed every frame |
| Mean Inclination (inv. plane) | (`earthInvPlaneInclinationMean` — DELETED, plan 11 step 2) | the engine's mean over ±10 Myr is <!--v:earthInclMean-->1.28741<!--/v--> deg | The retired device's mean (inclJ2000 − A·cos(the K phase)) was the invariable-plane disc's init pose, rewritten from the engine's one-source normal every frame; the registry's `earthInclMean`/`Min`/`Max` are the engine's ±10-Myr statistics since plan 11 step 2 |
| Inclination Amplitude | (`earthInvPlaneInclinationAmplitude` — DELETED, plan 11 step 4) | was 0.63607 deg | The K scaffold's tilt amplitude (the ecliptic and obliquity wheels' ±A); the engine's inclination statistics are `earthInclMean/Min/Max` |
| Inclination Cycle Anchor | (`earthInclinationCycleAnchor` — DELETED, plan 09 step 6) | was 21.77° | the eccentricity law's phase anchor (the perihelion longitude at maximum inclination); the scene pose it also set is the recorded `kDeviceInclinationPhaseJ2000Deg` = ϖ_J2000 − 21.77° |
| Perihelion Ref JD | `perihelionRefJD` | <!--v:perihelionPassageJD-->2451547.042<!--/v--> | JD of Earth perihelion 2000 (Jan 3.542) |

(The per-planet divisor, phase-group and mirror-pair table of the retired
integer-law framing stood here. Its inputs left `model-parameters.json` at
plan 07 R8 and nothing in the model reads them.)

## Model Start & Alignment

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Start Model JD | `startmodelJD` (`astro-reference` `timeReference.sceneEpochJD` since plan 11 step 5) | <!--v:startModelJD-->2,451,716.5<!--/v--> | June Solstice 2000 00:00 UTC — the scene's time origin (pos = 0) |
| Start Model Year | `startmodelYear` (`timeReference.sceneEpochYear`) | <!--v:startModelYear-->2000.5<!--/v--> | The epoch's year label — the age-anchor convention every deep-time read takes its t_Ma from, NOT the calendar decimal year of the JD (2000.4699) |
| Start Angle | (`startAngleModel` — DELETED, plan 11 step 4) | was 89.91949879 deg | The inclination-path loop's angular zero (with the K inclination phase); the zero is the scene literal `INCLINATION_PATH_ZERO_DEG` in `src/script.js` |
| Correction Days | (`correctionDays` — DELETED, plan 11 step 5) | was −0.8288 | The retired scaffold Sun's fine timing; the SI-year label, the lunar and planet integrators and the perihelion calendar anchor on the epoch itself (measured: the package Moon moved 0.0006″ in era, the perihelion calendar's rounded day-0 one day) |
| Variable Speed | (`useVariableSpeed` — hard-wired true, plan 11 step 2) | true | The equation of centre and the certified Moon override are the scene, not a toggle; the false branch was a 6.5°-of-Moon diagnostic nobody ran |

## Physical Constants

| Constant | Variable | Value |
|----------|----------|-------|
| Speed of Light | `speedOfLight` | <!--v:speedOfLight-->299,792.458<!--/v--> km/s |
| Astronomical Unit | `currentAUDistance` | <!--v:oneAU-->149,597,870.698828<!--/v--> km |
| Mean Sidereal Year | `meanSiderealYearSeconds` | siderealYearJ2000 × 86400 (derived) |
| Gravitational Constant | `G_CONSTANT` | 6.6743 × 10⁻²⁰ km³/(kg·s²) |
| Earth/Moon Mass Ratio | `MASS_RATIO_EARTH_MOON` | <!--v:massRatioEarthMoon-->81.30056816<!--/v--> |

### DE440 Sun/Planet Mass Ratios

| Planet | `massRatioDE440` (M_Sun / M_Planet) |
|--------|-------------------------------------|
| Mercury | <!--v:mercuryMassRatioDE440-->6,023,657.94<!--/v--> |
| Venus | <!--v:venusMassRatioDE440-->408,523.72<!--/v--> |
| Mars | <!--v:marsMassRatioDE440-->3,098,703.59<!--/v--> |
| Jupiter | <!--v:jupiterMassRatioDE440-->1,047.348625<!--/v--> |
| Saturn | <!--v:saturnMassRatioDE440-->3,497.9018<!--/v--> |
| Uranus | <!--v:uranusMassRatioDE440-->22,902.944<!--/v--> |
| Neptune | <!--v:neptuneMassRatioDE440-->19,412.237<!--/v--> |

---

# Part 2 — Derived Constants

These are computed from foundational constants. The formula is the definition; the number is a convenience.

## Precession Periods (J2000, dynamical)

| Cycle | Formula | Period (years) | Direction |
|-------|---------|----------------|-----------|
| Apsidal Precession | the beat of the one-family anomalistic and sidereal years, T_anom·T_sid/(T_anom − T_sid) — the movement's own apsidal rate | <!--v:inclPrecYears-->~111,635<!--/v--> | Counter-clockwise |
| Ecliptic Precession | 1,296,000/\|s₃\|, the N-body chain's dominant nodal mode | <!--v:eclPrecYears-->~68,751<!--/v--> | Counter-clockwise |
| Obliquity Cycle | the beat 1,296,000/(ψ̇ᵢₙ − \|s₃\|) of the spin axis's inertial rate against s₃ (the instantaneous limit) | <!--v:obliqCycleYears-->~41,099<!--/v--> | Clockwise (negative) |
| Axial Precession | 1,296,000 / p_A — the IAU 2006 general precession input (plan 09; the fit-era label H/13 read 25,794 and the retired year combs' beat read 25,771.4) | <!--v:axialPrecRound-->~25,772<!--/v--> | Clockwise (negative) |
| Perihelion Precession | the perihelion-of-date beat, 1/T_peri = 1/T_p + 1/T_aps | <!--v:periPrecYears-->~20,938<!--/v--> | Both directions |

(Plan 06 S6: these were H/3, H/5, H/8 and H/16 of the retired unit, +0.18 %,
−2.5 %, +1.7 % and +0.10 % off the dynamical values; the scene's K-device
wheels kept those numbers as recorded pose periods until plan 11 step 4
deleted the wheels.)

## Time Constants

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Mean Solar Year | `meanSolarYearDays` | derived from the IAU sidereal year and p_A, `computeMeanTropicalYearJ2000Days` (plan 09; was the Meeus & Savoie input 365.2421897, 66 ms shorter, and before it round(inputMeanSolarYear × H/8)/(H/8), +1.2 s) | <!--v:meanSolarYearDaysFull-->365.242190469006<!--/v--> days |
| Mean Sidereal Year | `meanSiderealYearDays` | the IAU sidereal year, `yearLengthRef.siderealYear` (plan 09; the H/13 construction meanSolarYearDays × (H/13)/((H/13) − 1), 1 µd above it, is deleted) | <!--v:meanSiderealYearDaysFull-->365.256363004<!--/v--> days |
| Mean Anomalistic Year | (the law of date at 2000) | derived: the one-family anomalistic year at 2000 — the sidereal year and the series' own apsidal rate (plan 09 step 4d; before it the Simon 1994 input 365.259636, 87 ms longer; before step 3 meanSolarYearDays × (H/16)/(H/16 − 1), 0.3 s low) | <!--v:anomalisticYearDaysFull-->365.259634985<!--/v--> days |
| Mean Length of Day | `meanLengthOfDay` | the SI day ω₀, `yearLengthRef.solarDay` (plan 09; was meanSiderealYearSeconds over the H/13 sidereal days, 86,399.99968 s) | ~86,400.0 s |
| Mean Sidereal Day | `meanSiderealDay` | (meanSolarYearDays/(meanSolarYearDays+1)) × meanLengthOfDay | <!--v:meanSiderealDaySeconds-->86,164.0905329<!--/v--> s |
| Mean Stellar Day | `meanStellarDay` | (meanSiderealDay/T_p) / (meanSolarYearDays+1) · cos ε + meanSiderealDay — T_p the J2000 precession period 1,296,000/p_A (S5 retired the counter H/13) | <!--v:meanStellarDaySeconds-->86,164.0989084<!--/v--> s |
| Phase origin of the K-device wheels' pose | `balancedYear` | 2000 (J2000, by construction — plan 07 R10) | the former fitted origin perihelionalignmentYear − 14.5 × H/16 was rotated out of every comb coefficient exactly (the combs are deleted since, plan 09); the name stays as the scene's phase-origin variable |
| Perihelion Alignment JD | `perihelionalignmentJD` | round(startmodelJD - meanSolarYearDays × (startmodelYear - perihelionalignmentYear)) — on the scene epoch itself since plan 11 step 5 (the deleted −0.83-d correction had held the rounded day-0 one day later) | ~<!--v:periAlignJD-->2,176,153<!--/v--> |
| J2000.0 epoch JD | `j2000JD` | startmodelJD - (startmodelYear - 2000) × meanSolarYearDays | ~2451545.0 |
| Julian century | `julianCenturyDays` | 36525 (100 × 365.25) | 36,525 days (IAU Julian century) |
| Earth rotations/year | `meanEarthRotationsPerYear` | meanSolarYearDays + 1 | 366.2422 |
| Start year corrected | (`startModelYearWithCorrection` — DELETED, plan 11 step 5) | was startmodelYear + correctionDays / meanSolarYearDays ≈ 2000.4977; every anchor is `startmodelYear` now (the Node export name stays as an alias for two frozen explore scripts) | — |
| Years from the phase origin to J2000 | `yearsFromBalancedToJ2000` | (startmodelJD - balancedJD) / meanSolarYearDays | ≈ 0 since plan 07 R10 (the origin is J2000; kept as a code variable) |

Input constants used in the formulas above:

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Year (seconds) | `meanSiderealYearSeconds` | siderealYearJ2000 × 86400 | Derived from IAU sidereal year reference |

## Eccentricity Derived Values

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Derived Mean Eccentricity | `eccentricityDerivedMean` | e(J2000) / (1 + cos θ₀/2) | the retired single-line law's base′ — the scene's flag-off fallback and the Node twin only; the published e is the N-body series |
| EoC Eccentricity | `eocEccentricity` | e(J2000) / 2 | ~<!--v:eocEccentricityValue-->0.00836<!--/v--> — the Sun node's rest-pose EoC half; the scene's per-frame value is the series' e(t)/2 |
| Perihelion Phase Offset | (`perihelionPhaseOffset` — DELETED, plan 11 step 2) | was ~0.483 deg | the scene Sun's EoC phase at the model start, built from the deleted wheel 16 and `correctionSun`; the engine places the Sun at the certified longitude every frame |

## Ascending Node Frame Corrections (DELETED, plan 11 step 3)

The per-planet `ascNodeTiltCorrection` (180 − Ω for the inner planets, 2 × the
scaffold start angle for the outer ones) compensated the legacy position path
for moving the orbit tilt from the `RealPerihelionAtSun` wheel to the planet's
own container. It is deleted with the start angles: the engine-D chain places
every rendered planet quantity, each planet's rotation axis is placed from the
spin channel's pole of date (`_kcPlacePlanetPole`), and the planet containers
take the plain node tilt.

## Mass Computation & Universal Constants

### Planet Mass Fractions (M_planet / M_Sun)

Non-Earth planets: `massFraction[p] = 1 / massRatioDE440[p]` (the GM chain cancels).

Earth mass is derived from Moon orbital mechanics:
```
GM_Earth_Moon = 4π²·d³ / T²   (d = moonDistance, T = moonSiderealMonth × meanLengthOfDay)
GM_Earth = GM_Earth_Moon × (M_Earth / (M_Earth + M_Moon)) × (meanLengthOfDay / meanSiderealDay)
massFraction.earth = (GM_Earth / G) / M_Sun
```

| Planet | `massFraction` |
|--------|---------------|
| Mercury | <!--v:mercuryMassFraction-->1.660 × 10⁻⁷<!--/v--> |
| Venus | <!--v:venusMassFraction-->2.448 × 10⁻⁶<!--/v--> |
| Earth | <!--v:earthMassFraction-->3.004 × 10⁻⁶<!--/v--> |
| Mars | <!--v:marsMassFraction-->3.227 × 10⁻⁷<!--/v--> |
| Jupiter | <!--v:jupiterMassFraction-->9.548 × 10⁻⁴<!--/v--> |
| Saturn | <!--v:saturnMassFraction-->2.859 × 10⁻⁴<!--/v--> |
| Uranus | <!--v:uranusMassFraction-->4.366 × 10⁻⁵<!--/v--> |
| Neptune | <!--v:neptuneMassFraction-->5.151 × 10⁻⁵<!--/v--> |

### Universal Coupling Constant (ψ)

| Constant | Formula | Value |
|----------|---------|-------|
| ψ (psi) — RETIRED (plan 07 R5), the recorded value | d_E × amp_E × √m_E (from Earth) | <!--v:psiValue-->3.3070 × 10⁻³<!--/v--> |
| K | e_amp_E × √m_E / (sin(tilt_E) × √d_E) (from Earth) | <!--v:kValue-->3.4143 × 10⁻⁶<!--/v--> |

### J2000 Eccentricities (eccJ2000)

All 8 planets — the observed J2000 values the chains' eccentricity of date is anchored on:

| Planet | `eccJ2000` | Source |
|--------|-----------|--------|
| Mercury | <!--v:mercuryEccJ2000Full-->0.20563593<!--/v--> | J2000 (same as model) |
| Venus | <!--v:venusEccJ2000Full-->0.00677672<!--/v--> | J2000 (same as model) |
| Earth | <!--v:j2000Eccentricity-->0.01671022<!--/v--> | J2000 (from ASTRO_REFERENCE) |
| Mars | 0.09339410 | J2000 (same as model) |
| Jupiter | <!--v:jupiterEccJ2000Full-->0.04838624<!--/v--> | J2000 (base derived from phase) |
| Saturn | <!--v:saturnEccJ2000Full-->0.05386179<!--/v--> | J2000 (base derived from phase) |
| Uranus | <!--v:uranusEccJ2000Full-->0.04725744<!--/v--> | J2000 (base derived from phase) |
| Neptune | <!--v:neptuneEccJ2000Full-->0.00859048<!--/v--> | J2000 (base derived from phase) |

## Planet Inclination Parameters (the ψ law — RETIRED, plan 07 R5)

The ψ law — amplitudes `amp = ψ / (d × √m)`, means from the J2000 constraint
— is DELETED from the code (the ψ/K law module of `@essrt/physics`, the
`tools/lib/constants.js` loop, the browser's `_FL` loop and the Python bridge's
`INCL_AMP`/`INCL_MEAN`). The per-planet mean and amplitude below are now the
CHAIN's series range (the registry's `chainInclStats`); the law's
verification instruments, `inclination-optimization` and
`inclination-verification`, went at plan 07 R6.

| Planet | Mean (deg) | Range over ±10 Myr (deg) | Inertial apsidal period |
|--------|----------|---------------|-------------|
| Mercury | <!--v:mercuryInclMean-->6.690391<!--/v--> | <!--v:mercuryInclMin-->0.14<!--/v-->–<!--v:mercuryInclMax-->10.97<!--/v--> | <!--v:mercuryPeriPeriodICRF-->232,437<!--/v--> yr |
| Venus | <!--v:venusInclMean-->1.538475<!--/v--> | <!--v:venusInclMin-->0.00<!--/v-->–<!--v:venusInclMax-->3.46<!--/v--> | <!--v:venusPeriPeriodICRF-->174,997<!--/v--> yr |
| Earth | <!--v:earthInclMean-->1.28741<!--/v--> | <!--v:earthInclMin-->0.034<!--/v-->–<!--v:earthInclMax-->2.942<!--/v--> (the K scaffold's amplitude 0.636 is deleted, plan 11 step 4) | <!--v:earthPeriPeriodICRF-->111,635<!--/v--> yr |
| Mars | <!--v:marsInclMean-->4.205698<!--/v--> | <!--v:marsInclMin-->0.07<!--/v-->–<!--v:marsInclMax-->6.80<!--/v--> | <!--v:marsPeriPeriodICRF-->72,335<!--/v--> yr |
| Jupiter | <!--v:jupiterInclMean-->0.362449<!--/v--> | <!--v:jupiterInclMin-->0.20<!--/v-->–<!--v:jupiterInclMax-->0.49<!--/v--> | <!--v:jupiterPeriPeriodICRF-->304,456<!--/v--> yr |
| Saturn | <!--v:saturnInclMean-->0.891489<!--/v--> | <!--v:saturnInclMin-->0.77<!--/v-->–<!--v:saturnInclMax-->1.02<!--/v--> | <!--v:saturnPeriPeriodICRF-->45,883<!--/v--> yr |
| Uranus | <!--v:uranusInclMean-->1.019406<!--/v--> | <!--v:uranusInclMin-->0.88<!--/v-->–<!--v:uranusInclMax-->1.16<!--/v--> | <!--v:uranusPeriPeriodICRF-->330,515<!--/v--> yr |
| Neptune | <!--v:neptuneInclMean-->0.668880<!--/v--> | <!--v:neptuneInclMin-->0.44<!--/v-->–<!--v:neptuneInclMax-->0.80<!--/v--> | <!--v:neptunePeriPeriodICRF-->2,136,797<!--/v--> yr |

The mean and range are the chain's over the banked ±10-Myr series (a
multi-mode quantity has no single amplitude — the former half-range key
`<p>InclAmp` left the registry at model-values 23.0.0, its "mean ± amplitude"
reading being the retired ψ law's framing); the
period is the chain's 1,296,000/|g| (Earth: the one-family route). The
retired law's per-planet phase anchors (`inclinationCycleAnchor`, the
`i(t) = mean + amplitude × cos(ω̃_ICRF(t) − anchor)` form, Saturn anti-phase)
left `model-parameters.json` at plan 07 R8; doc 31 records their values.

## Planet Orbital Distances & Periods

| Planet | Orbit Count in H | Distance (AU) | Period (years) |
|--------|-----------------|---------------|----------------|
| Mercury | 1,392,228 | <!--v:mercurySemiMajor-->0.3871<!--/v--> | 0.2408 |
| Venus | 545,059 | <!--v:venusSemiMajor-->0.7233<!--/v--> | 0.6152 |
| Mars | 178,289 | <!--v:marsSemiMajor-->1.5237<!--/v--> | 1.8808 |
| Jupiter | 28,281 | <!--v:jupiterSemiMajor-->5.1996<!--/v--> | 11.8566 |
| Saturn | 11,396 | <!--v:saturnSemiMajor-->9.5310<!--/v--> | 29.4243 |
| Uranus | 4,004 | <!--v:uranusSemiMajor-->19.1408<!--/v--> | 83.7417 |
| Neptune | 2,048 | <!--v:neptuneSemiMajor-->29.9282<!--/v--> | 163.7270 |

## Perihelion Precession Periods (Ecliptic)

| Planet | Formula (against the equinox of date) | Period (years) |
|--------|---------|----------------|
| Mercury | 1,296,000/(g + p_A) | ~<!--v:mercuryPeriPeriod-->23,199<!--/v--> |
| Venus | 1,296,000/(g + p_A) | ~<!--v:venusPeriPeriod-->22,463<!--/v--> |
| Earth | the perihelion-of-date beat of the one-family year laws, 1/T_peri = 1/T_p + 1/T_aps | <!--v:periPrecYears-->~20,938<!--/v--> |
| Mars | 1,296,000/(g + p_A) | ~<!--v:marsPeriPeriod-->19,002<!--/v--> |
| Jupiter | 1,296,000/(g + p_A) | ~<!--v:jupiterPeriPeriod-->23,760<!--/v--> |
| Saturn | 1,296,000/(g + p_A) | ~<!--v:saturnPeriPeriod-->16,503<!--/v--> |
| Uranus | 1,296,000/(g + p_A) | ~<!--v:uranusPeriPeriod-->23,907<!--/v--> |
| Neptune | 1,296,000/(g + p_A) | ~<!--v:neptunePeriPeriod-->25,464<!--/v--> |

g is the planet's leading secular apsidal eigenfrequency from the N-body
chain, p_A the J2000 general precession (plan 07; the registry's
`<planet>PeriFormula` keys name each mode). Every g is positive, so every
period is: the minus signs and "(retrograde)" labels the former lattice
descriptors on the retired unit carried (Y/(1 + 3/8), −8Y/6, …) are gone with
them; doc 109 is their record. Saturn's retrograde motion is its ERA-WINDOW
rate, <!--v:saturnPeriRateNowArcsecCy-->−1,576.6<!--/v--> ″/cy (1800–2100,
the Great Inequality's local slope) — a different quantity from its secular
mode. The chain's g comes from the run with 1PN switched on, so Mercury's
row already carries the relativistic eigen-level shift (+0.473 ″/yr, the
artifact's `note1PN`). The era-window rate is where the split is stated,
Newtonian plus the derived relativistic supplement:
<!--v:mercuryPeriRateEclipticArcsecCy-->529.03<!--/v--> +
<!--v:mercuryPeriAnomalyGrArcsecCy-->42.98<!--/v--> =
<!--v:mercuryPeriRateWithRelativisticArcsecCy-->572.0<!--/v--> ″/cy
(design choice A — additive and stated, never folded into a divisor; see
[doc 13 §1.8](13-mercury-precession-breakdown.md)).

## Moon Derived Cycles

All Moon cycles derive from the IAU inputs — the sidereal month and the two equinox-of-date precession periods (apsidal, nodal) — and the certified J2000 precession period T_p (plan 09). The retired era device rounded the months onto whole counts over eight anchor intervals (`totalDaysInH / ceil(totalDaysInH / input)`, "exact cycle closure over the anchor interval") and counted the precession periods as eighth-integers over the same span; those counts are gone, and the counts a fitter still needs (the Step-0 Sun harmonics' lunar divisors) are real-valued.

| Cycle | Variable | Formula | Value (days) |
|-------|----------|---------|-------------|
| Sidereal Month | `moonSiderealMonth` | the input `moonSiderealMonthInput` | ~27.3217 |
| Apsidal precession, star-referenced | `moonApsidalPrecessionDaysEarth` | 1/(1/T_apsidal,of-date − 1/T_p) | ~3,232.6 |
| Nodal precession, star-referenced | `moonNodalPrecessionDaysEarth` | 1/(1/T_nodal,of-date + 1/T_p) | ~6,793.4 |
| Anomalistic Month | `moonAnomalisticMonth` | 1/(1/T_sid − 1/T_apsidal,star) | ~27.5545 |
| Nodal Month | `moonNodalMonth` | 1/(1/T_sid + 1/T_nodal,star) | ~27.2122 |
| Synodic Month | `moonSynodicMonth` | T_sid·T_yr/(T_yr − T_sid), T_yr the sidereal year | ~29.5306 |
| Tropical Month | `moonTropicalMonth` | 1/(1/T_sid + 1/T_p,days) | ~27.3216 |

| Cycle | Variable | Value (days) | Value (years) |
|-------|----------|-------------|--------------|
| Apsidal Precession (star-referenced) | `moonApsidalPrecessionDaysEarth` | ~3,232.60 | ~8.8506 |
| Apsidal Precession (equinox-of-date) | `moonApsidalPrecessionDaysICRF` | ~3,231.49 | ~8.8475 |
| Nodal Precession (star-referenced) | `moonNodalPrecessionDaysEarth` | ~6,793.43 | ~18.5994 |
| Nodal Precession (equinox-of-date) | `moonNodalPrecessionDaysICRF` | ~6,798.33 | ~18.6132 |

> **Frame note (legacy naming):** the `…ICRF`-named variables hold the EQUINOX-OF-DATE periods (the Meeus/IERS observables) and the `…Earth`-named variables hold the STAR-REFERENCED (inertial) periods — the labels predate the frame audit. The star-referenced periods are reproduced from first principles by the planetary laboratory at ±1×10⁻⁴.
| Apsidal-Nodal Beat | `moonApsidalMeetsNodalDays` | ~206 | — |
| Lunar Leveling Cycle | `moonLunarLevelingCycleDays` | ~61,250 | ~167.7 |
| Draconic Year (ICRF) | `moonDraconicYearICRF` | ~346.620 | — |
| Draconic Year (Earth frame) | `moonDraconicYearEarth` | ~346.597 | — |
| Full Moon Cycle (Earth frame) | `moonFullMoonCycleEarth` | ~<!--v:fullMoonCycleEarth-->411.78<!--/v--> | — |
| Full Moon Cycle (ICRF) | `moonFullMoonCycleICRF` | ~411.86 | — |

Eclipse cycles (from derived months): Saros = 223 synodic ≈ 6585.32 days, Exeligmos = 3 × Saros, Callippic = 940 synodic ≈ 76 solar years.

## Year-Length Harmonics (retired)

The three year-length Fourier combs (`TROPICAL_YEAR_HARMONICS` 12 terms, `SIDEREAL_YEAR_HARMONICS` 6, `ANOMALISTIC_YEAR_HARMONICS` 8 — `[period_divisor, sin, cos]` rows on divisors of the unit H, fitted to the 335,318-row full-period export) and their J2000 anchor `YEAR_LENGTH_J2000_ANCHOR` are deleted at plan 09, together with the means they rode (the input mean solar year rounded onto 1/(H/8) and the H/(H−13), H/(H−16) ratios): the J2000 year lengths are the IAU inputs (the tropical year derived from them), the year lengths of date are the one-source family (`createYearLengths` in `@essrt/physics`; doc 11 § "Year Lengths of Date"). The `CARDINAL_POINT_HARMONICS` derivative route (23 harmonics per type + ECC/JOINT/DERIVED families) was deleted last, at plan 09 step 7a; the cardinal year lengths are the intervals between the certified Sun's crossings (`createModel().cardinal.yearLengthDays`), and doc 110 §5.2/§5.5 is the record.

## Sun Longitude — the certified chain and the legacy harmonics

The certified apparent solar longitude is **assembled, not fitted** (E4/E5
framework-native Sun, `packages/physics/src/model.js`, exported as
`eclipse.frameworkSunDeps`): the mean longitude as the INTEGRAL of the
one-source tropical year of date (route B, SI seconds — plan 06 R1;
formerly the frozen era clock's closed-form drift with the comb ripple and
the torque factors, measured 12 min off in the medieval era) + equation of
centre on the banked series' e(t) and ϖ(t) plus the derived mean-element
offset (`data/earth-osculating-mean-offset.json`, plan 06 layer B —
formerly the H/16 + derived-H/3 laws). It carries **zero fitted solar
constants**; accuracy <!--v:frameworkSunVsJplRms-->1.03<!--/v-->″ RMS vs JPL (modern window 1970–2049; the Meeus Ch. 25 basis on the same completion: <!--v:meeusCh25SunVsJplRms-->1.02<!--/v-->″). The former era-clock Sun read 0.80″ in that window — the modern-window cost of the physical year, accepted for its behaviour over millennia (plan 06 R1).
The scene wheel displays the same longitude via the δ overlay
(δ = λ_certified − λ_realized, the wheel's own longitude read from the scene
geometry; clock-convention window). See
[doc 99 § The framework-native Sun](99-expanding-solar-system-resonance-theory.md#the-framework-native-sun-e4e5--the-certified-apparent-solar-longitude).

The **legacy fitted family** is deleted (the record):

| Constant | Value | Description |
|----------|-------|-------------|
| `SUN_LONGITUDE_HARMONICS` | DELETED at plan 09 step 5a (was a 3-term comb on the periods H, 2H, 3H) | Fitted sun-longitude harmonics, ~279″ annual span. Already RETIRED from every scene path before deletion (FQ-3 took it off the display Sun; plan 06 R4 took it off the Step-6a instrument too — the fast Sun rides the engine Earth frame with the certified longitude); gone with its Step-0 fitter |
| `SUN_LONGITUDE_MEAN` | DELETED at plan 09 step 5a (was −0.0019°) | Fitted mean offset (~−6.9″) — a constant offset on the Sun, gone with the comb and its Step-0 fitter |

## Earth Perihelion Harmonics (retired)

The 25-term Fourier comb `PERI_HARMONICS` + `PERI_OFFSET` (Earth's perihelion longitude on divisors of the unit H, RMSE 0.0006° against the file-01 export, J2000 exact) is deleted at plan 09 step 4. Earth's perihelion of date is the series' ϖ in every runtime (doc 110 chain 1.1) — the scene's perihelion had followed it since v16.0, and the comb's last live readers were the browser's device-tier `o.longitudePerihelion`, the registry's `periLongModel*` rows and the Python mirror. Two readings of the one series, named: the PUBLISHED perihelion of date (the registry rows, the eclipses, the cardinal points) is the Sun channel's `createModel().sun.perihelionLongitudeDegAt` — the series' secular mean plus the measured osculating-mean offset `EARTH_OSCULATING_MEAN_OFFSET.dPomArcsec`, the osculating-mean apsidal direction that Meeus's and Standish's mean elements tabulate (within 0.001° of Meeus at 1000–3000 AD); the bare series mean `createModel().earth.perihelionLongitudeDeg` sits a constant 0.0195° below it. Measured before deletion, comb − bare series: 0.03° at 2000, −1.6° at −4000, −20° at −26 kyr, −87° at −270 kyr (`data/era-device-readers.json`).

## Delta-T

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Initial Delta-T | `deltaTStart` | <!--v:deltaTStart-->56.08<!--/v--> s | Long-term ΔT trend value at J2000 (paired with `usno_target_lod_s` = <!--v:usnoLodJ2000-->86,400.0012<!--/v--> at the joint optimum against Espenak). Not the IERS instantaneous observation (63.63 s at J2000) — the trend value passing through J2000, which excludes industrial-era Earth-rotation acceleration our cyclic model doesn't capture. |

---

# Part 3 — External Reference Values

These come from external astronomical sources and do not change with the model.

## Earth J2000 Reference Values

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Obliquity | `obliquityJ2000_arcsec` | <!--v:obliquityJ2000Arcsec-->84381.406<!--/v-->" (<!--v:obliquityJ2000Deg-->23.439279<!--/v--> deg) | IAU 2006 (Capitaine et al. 2003) |
| Obliquity rate | `obliquityRate_arcsecPerCentury` | <!--v:obliquityRateArcsecPerCy-->-46.836769<!--/v-->"/cy | IAU 2006 |
| Obliquity range | - | ~22.1 deg to ~24.5 deg | Laskar 1993 |
| Earth inclination | `earthInclinationJ2000_deg` | <!--v:earthInclJ2000-->1.57869<!--/v--> deg | Astronomical Almanac |
| Earth inclination rate | `earthInclinationRate_arcsecPerCentury` | -18"/cy | Astronomical Almanac |
| Eccentricity | `earthEccentricityJ2000` | <!--v:j2000Eccentricity-->0.01671022<!--/v--> | JPL Keplerian-elements table (Standish & Williams) — the IAU MEAN element; the N-body series' secular element is <!--v:earthSeriesEccJ2000-->0.01670244<!--/v--> (≡ JPL's osculating seed state, La2004) |
| Long. of perihelion | `earthPerihelionLongitudeJ2000` | <!--v:earthPerihelionLongitudeJ2000-->102.947<!--/v--> deg | JPL Keplerian-elements table (Standish & Williams) — the IAU MEAN element, a 1800–2050 fit; the series' secular element is <!--v:earthSeriesPeriLongJ2000-->102.918<!--/v--> deg; the eclipse Sun's derived mean element 102.937 deg (Sun-side table above) |
| Perihelion passage J2000 | `perihelionRefJD` | <!--v:perihelionPassageJD-->2451547.042<!--/v--> | USNO (2000 Jan 3 13:00 UTC) |
| June Solstice 2000 JD | `juneSolstice2000_JD` | <!--v:juneSolstice2000JD-->2451716.575<!--/v--> | USNO (June 21, 2000 01:48 UTC) |
| Cardinal instants 2000 (VE / SS / AE / WS) | `cardinalPointAnchors` | <!--v:cardinalAnchorVE2000JD-->2451623.816<!--/v--> / <!--v:cardinalAnchorSS2000JD-->2451716.575<!--/v--> / <!--v:cardinalAnchorAE2000JD-->2451810.2271<!--/v--> / <!--v:cardinalAnchorWS2000JD-->2451900.0674<!--/v--> | USNO "Earth's Seasons" 2000 (Mar 20 07:35 · Jun 21 01:48 · Sep 22 17:27 · Dec 21 13:37 UTC, minute precision); reference data, no runtime reader — the cardinal instants are `createModel().cardinal` (plan 06 R4d: the VE/AE entries had been retired-device anchors 112 min off) |

## Year & Day Lengths (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Tropical year (mean) | `tropicalYearMeanJ2000` | <!--v:tropicalYearMeanJ2000Days-->365.242190469<!--/v--> days | derived: the IAU sidereal year and p_A (plan 09; the Meeus & Savoie 1992 input is retired) |
| Tropical year (VE) | `tropicalYearVEJ2000` | <!--v:tropicalYearVEJ2000Days-->365.242374<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (SS) | `tropicalYearSSJ2000` | <!--v:tropicalYearSSJ2000Days-->365.241626<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (AE) | `tropicalYearAEJ2000` | <!--v:tropicalYearAEJ2000Days-->365.242018<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (WS) | `tropicalYearWSJ2000` | 365.242740 days | Meeus & Savoie 1992 |
| Tropical year rate | `tropicalYearRateSecPerCentury` | -0.53 s/cy | Meeus & Savoie 1992 |
| Anomalistic year (mean element) | `simon1994AnomalisticYearDays` | <!--v:anomalisticYearSimon1994Days-->365.259636<!--/v--> days | Simon et al. 1994 — a citation since plan 09 step 4d; the model's J2000 value is the law of date (<!--v:anomalisticYearJ2000Days-->365.2596350<!--/v--> d) |
| Sidereal year | `siderealYearJ2000` | <!--v:siderealYearInputDays-->365.256363004<!--/v--> days | JPL Horizons (adjusted for LOD=86400) |
| Solar day | `solarDayJ2000` | 86400.0 s | SI definition |
| Scene day basis at J2000 | `measuredMeanSolarDayJ2000Seconds` | <!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000000<!--/v--> s | The SI day ω₀ — ONE J2000 day basis since plan 09 (the comb-era "measured mean solar day", IAU sidereal seconds over the retired Step-6c sidereal anchor, 86,400.00032 s, is retired with the comb) measured year lengths are counted in. ONE J2000 basis: LOD_mean, the scene basis and `o.lodKinematic` at J2000 (<!--v:lodKinematicFourierJ2000Seconds-->86,400.000000<!--/v--> s) are all ω₀; LOD_real is the Layer-4 observable; see [doc 11 §Day bases](11-length-day-year-formulas.md#day-types) |
| Sidereal day | `siderealDayJ2000` | 86164.09053083288 s (~23h 56m 4.0905s) | IERS |
| Stellar day | `stellarDayJ2000` | 86164.0989036905 s (~23h 56m 4.0989s) | IERS |

## Coin Rotation Offsets (Derived)

These offsets arise from the coin rotation paradox — precessing reference frames cause systematic measurement biases that cancel with multi-angle averaging.

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Axial Coin Rotation | `axialCoinRotationMs` | meanSiderealday / T_p / (meansolaryearlengthinDays + 1) × 1000 — T_p the certified J2000 precession period | ~<!--v:axialCoinRotationMs-->9.13<!--/v--> ms/sidereal day |
| Yearly accumulation | `axialCoinRotationYearlySeconds` | offset × (meansolaryearlengthinDays + 1) | ~3.34 s/year |

**Perihelion Coin Rotation**: the constants `perihelionCoinRotationMs` / `…YearlySeconds` (1 extra solar day per H/16 cycle, ~11.29 ms/day) are deleted (plan 09 step 4b); the simulator's solar-day scan derives the perihelion coin rotation from the displayed perihelion-of-date period.

**Axial Coin Rotation**: Axial precession (one turn per T_p) accumulates exactly 1 extra sidereal day over one axial precession cycle — 9.12 ms per sidereal day. This is a count on the **ecliptic** lattice and is deliberately *not* projected. It is **not** the physical stellar−sidereal day offset, which is the same rate projected onto the **equator** (precession in right ascension, m = p·cos ε) and is therefore ~8.37 ms. See [Year and Day Length Formulas](11-length-day-year-formulas.md) for details.

## Moon Constants (External)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Month | `moonSiderealMonthInput` | <!--v:moonSiderealMonthInput-->27.32166156<!--/v--> days | Return to same star |
| Anomalistic Month | `moonAnomalisticMonth` | 27.55454988 days | Perigee to perigee — DERIVED from the sidereal month and the star-referenced apsidal period (§ Moon Derived Cycles), not an input |
| Nodal Month | `moonNodalMonth` | 27.21222082 days | Node to node — DERIVED from the sidereal month and the star-referenced nodal period, not an input |
| Mean Distance | `moonDistance` | <!--v:moonOrbitalRadius-->384,399.07<!--/v--> km | Mean Earth-Moon distance |
| Orbital Eccentricity | `moonOrbitalEccentricity` | <!--v:moonOrbitalEccentricityFull-->0.054900489<!--/v--> | |
| Ecliptic Inclination | `moonEclipticInclinationJ2000` | <!--v:moonEclipticInclination-->5.1573<!--/v--> deg | Dynamical mean osculating inclination (v4 E3c); the Brown/ELP theory constant <!--v:moonInclinationConstantBrownELP-->5.1453964<!--/v--> (latitude sinF normalization) is kept as `moonInclinationConstantBrownELP` |
| Moon Tilt | `moonTilt` | <!--v:moonAxialTilt-->6.687<!--/v--> deg | |

### Lunar Mean Longitude Coefficients (Meeus Ch. 47)

| Constant | Variable | Value |
|----------|----------|-------|
| Moon Mean Anomaly J2000 | `moonMeanAnomalyJ2000_deg` | <!--v:moonMeanAnomalyJ2000Deg-->134.9634<!--/v--> deg |
| Moon Mean Anomaly Rate | `moonMeanAnomalyRate_degPerDay` | <!--v:moonMeanAnomalyRateDegPerDay-->13.06499295<!--/v--> |
| Moon Mean Elongation J2000 | `moonMeanElongationJ2000_deg` | <!--v:moonMeanElongationJ2000Deg-->297.8502<!--/v--> deg |
| Moon Mean Elongation Rate | `moonMeanElongationRate_degPerDay` | <!--v:moonMeanElongationRateDegPerDay-->12.19074912<!--/v--> |
| Moon Mean Elongation J2000 (full) | `moonMeanElongationJ2000Full_deg` | <!--v:moonMeanElongationJ2000FullDeg-->297.8502042<!--/v--> deg |
| Moon Mean Elongation Rate | `moonMeanElongationRate_degPerCentury` | <!--v:moonMeanElongationRateDegPerCentury-->445267.1115168<!--/v--> |
| Moon Arg. of Latitude J2000 | `moonArgLatJ2000_deg` | <!--v:moonArgLatJ2000Deg-->93.2720993<!--/v--> deg |
| Moon Arg. of Latitude Rate | `moonArgLatRate_degPerCentury` | <!--v:moonArgLatRateDegPerCentury-->483202.0175273<!--/v--> |
| Sun Mean Anomaly J2000 | `sunMeanAnomalyJ2000_deg` | <!--v:sunMeanAnomalyJ2000Deg-->357.5291<!--/v--> deg |
| Sun Mean Anomaly Rate | `sunMeanAnomalyRate_degPerDay` | <!--v:sunMeanAnomalyRateDegPerDay-->0.98560028<!--/v--> |

The per-day rates are used for EoC phase computation; the per-century rates are used for the Meeus Ch. 47 ecliptic latitude correction (see [Moon Meeus Corrections](66-moon-meeus-corrections.md)).

## Planet J2000 Orbital Elements

### Eccentricities & Longitudes of Perihelion

| Planet | Eccentricity (J2000) | Long. Perihelion (deg) | Source |
|--------|---------------------|----------------------|--------|
| Mercury | <!--v:mercuryEccJ2000Full-->0.20563593<!--/v--> | <!--v:mercuryPeriLongJ2000Full-->77.4569131<!--/v--> | JPL J2000 |
| Venus | <!--v:venusEccJ2000Full-->0.00677672<!--/v--> | <!--v:venusPeriLongJ2000Full-->131.5765919<!--/v--> | JPL J2000 |
| Mars | 0.09339410 | <!--v:marsPeriLongJ2000Full-->336.0650681<!--/v--> | JPL J2000 |
| Jupiter | <!--v:jupiterEccJ2000Full-->0.04838624<!--/v--> | <!--v:jupiterPeriLongJ2000Full-->14.70659401<!--/v--> | JPL J2000 |
| Saturn | <!--v:saturnEccJ2000Full-->0.05386179<!--/v--> | <!--v:saturnPeriLongJ2000Full-->92.12794343<!--/v--> | JPL J2000 |
| Uranus | <!--v:uranusEccJ2000Full-->0.04725744<!--/v--> | <!--v:uranusPeriLongJ2000Full-->170.7308251<!--/v--> | JPL J2000 |
| Neptune | <!--v:neptuneEccJ2000Full-->0.00859048<!--/v--> | <!--v:neptunePeriLongJ2000Full-->45.80124471<!--/v--> | JPL J2000 |

### Ecliptic Inclinations & Ascending Nodes

| Planet | Inclination (deg) | Ascending Node (deg) | Source |
|--------|------------------|---------------------|--------|
| Mercury | <!--v:mercuryEclInclJ2000Full-->7.00497902<!--/v--> | <!--v:mercuryAscNodeEclJ2000-->48.33033155<!--/v--> | JPL/SPICE |
| Venus | <!--v:venusEclInclJ2000Full-->3.39467605<!--/v--> | <!--v:venusAscNodeEclJ2000-->76.67877109<!--/v--> | JPL/SPICE |
| Mars | <!--v:marsEclInclJ2000Full-->1.84969142<!--/v--> | <!--v:marsAscNodeEclJ2000-->49.55737662<!--/v--> | JPL/SPICE |
| Jupiter | <!--v:jupiterEclInclJ2000Full-->1.30439695<!--/v--> | <!--v:jupiterAscNodeEclJ2000-->100.4877868<!--/v--> | JPL/SPICE |
| Saturn | <!--v:saturnEclInclJ2000Full-->2.48599187<!--/v--> | <!--v:saturnAscNodeEclJ2000-->113.6452856<!--/v--> | JPL/SPICE |
| Uranus | <!--v:uranusEclInclJ2000Full-->0.77263783<!--/v--> | <!--v:uranusAscNodeEclJ2000-->74.00919023<!--/v--> | JPL/SPICE |
| Neptune | <!--v:neptuneEclInclJ2000Full-->1.77004347<!--/v--> | <!--v:neptuneAscNodeEclJ2000-->131.7853754<!--/v--> | JPL/SPICE |
| Pluto | <!--v:plutoEclInclJ2000Full-->17.14001<!--/v--> | <!--v:plutoAscNodeEclJ2000-->110.30393<!--/v--> | JPL Horizons |
| Moon | <!--v:moonEclipticInclination-->5.1573<!--/v--> (dynamical mean osc; theory constant <!--v:moonInclinationConstantBrownELP-->5.1453964<!--/v-->) | — | — |

### Ecliptic Inclination Trend Rates

JPL publishes these trends in the **J2000-fixed** ecliptic frame ("mean ecliptic and equinox of J2000"). They are the catalogue's values, kept here as the reference beside the chain: the rendered planets' inclination of date is the N-body chain's element, gated against Horizons over 1800–2100 ([doc 109](109-model-nbody-engine-and-lattice-test.md)).

| Planet | Rate (deg/century) | Direction |
|--------|------------------|-----------|
| Mercury | <!--v:mercuryEclInclTrendDegPerCy-->-0.00595<!--/v--> | Decreasing |
| Venus | <!--v:venusEclInclTrendDegPerCy-->-0.00079<!--/v--> | Decreasing |
| Mars | <!--v:marsEclInclTrendDegPerCy-->-0.00813<!--/v--> | Decreasing |
| Jupiter | <!--v:jupiterEclInclTrendDegPerCy-->-0.00184<!--/v--> | Decreasing |
| Saturn | **+<!--v:saturnEclInclTrendDegPerCy-->0.00194<!--/v-->** | **Increasing** |
| Uranus | <!--v:uranusEclInclTrendDegPerCy-->-0.00243<!--/v--> | Decreasing |
| Neptune | **+<!--v:neptuneEclInclTrendDegPerCy-->0.00035<!--/v-->** | **Increasing** |
| Pluto | -0.00100 | Decreasing |

**Source**: [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html). See [doc 05 § Two frames](05-invariable-plane-overview.md#two-frames-two-node-values--dont-conflate) for why a trend quoted against the ecliptic of date can flip sign.

### Mean & True Anomaly at J2000

| Planet | Mean Anomaly (deg) | True Anomaly (deg) | Source |
|--------|-------------------|-------------------|--------|
| Mercury | <!--v:mercuryMeanAnomalyJ2000-->156.6364301<!--/v--> | <!--v:mercuryTrueAnomalyJ2000-->164.1669319<!--/v--> | JPL J2000 |
| Venus | <!--v:venusMeanAnomalyJ2000-->324.9668371<!--/v--> | <!--v:venusTrueAnomalyJ2000-->324.5198504<!--/v--> | JPL J2000 |
| Mars | <!--v:marsMeanAnomalyJ2000-->109.2630844<!--/v--> | <!--v:marsTrueAnomalyJ2000-->118.9501056<!--/v--> | JPL J2000 |
| Jupiter | <!--v:jupiterMeanAnomalyJ2000-->32.47179744<!--/v--> | <!--v:jupiterTrueAnomalyJ2000-->35.69428061<!--/v--> | JPL J2000 |
| Saturn | <!--v:saturnMeanAnomalyJ2000-->325.663876<!--/v--> | <!--v:saturnTrueAnomalyJ2000-->321.7910116<!--/v--> | JPL J2000 |
| Uranus | <!--v:uranusMeanAnomalyJ2000-->145.7292678<!--/v--> | <!--v:uranusTrueAnomalyJ2000-->148.5142459<!--/v--> | JPL J2000 |
| Neptune | <!--v:neptuneMeanAnomalyJ2000-->262.5003424<!--/v--> | <!--v:neptuneTrueAnomalyJ2000-->261.2242728<!--/v--> | JPL J2000 |
| Pluto | 15.55009 | 26.31965048 | JPL J2000 |

### Axial Tilts

| Body | Value (deg) | Source |
|------|-----------|--------|
| Sun | 7.155 | IAU |
| Mercury | <!--v:mercuryAxialTiltJ2000-->0.03<!--/v--> | IAU |
| Venus | <!--v:venusAxialTiltJ2000-->2.6392<!--/v--> | IAU (retrograde rotation) |
| Mars | <!--v:marsAxialTiltJ2000-->25.19<!--/v--> | IAU |
| Jupiter | <!--v:jupiterAxialTiltJ2000-->3.13<!--/v--> | IAU |
| Saturn | <!--v:saturnAxialTiltJ2000-->26.73<!--/v--> | IAU |
| Uranus | <!--v:uranusAxialTiltJ2000-->82.23<!--/v--> | IAU (near-sideways) |
| Neptune | <!--v:neptuneAxialTiltJ2000-->28.32<!--/v--> | IAU |
| Pluto | 57.47 | IAU |

## Invariable Plane — Souami & Souchay (2012)

### Inclinations

| Planet | J2000 Value (deg) | Source |
|--------|------------------|--------|
| Mercury | <!--v:mercuryInclJ2000-->6.3472858<!--/v--> | S&S 2012 |
| Venus | <!--v:venusInclJ2000-->2.1545441<!--/v--> | S&S 2012 |
| Earth | 1.57866663 | S&S 2012 |
| Mars | <!--v:marsInclJ2000-->1.6311858<!--/v--> | S&S 2012 |
| Jupiter | <!--v:jupiterInclJ2000-->0.3219652<!--/v--> | S&S 2012 |
| Saturn | <!--v:saturnInclJ2000-->0.9254704<!--/v--> | S&S 2012 |
| Uranus | <!--v:uranusInclJ2000-->0.9946692<!--/v--> | S&S 2012 |
| Neptune | <!--v:neptuneInclJ2000-->0.7354155<!--/v--> | S&S 2012 |
| Pluto | <!--v:plutoInclJ2000-->15.5639473<!--/v--> | S&S 2012 (adjusted) |

### Ascending Nodes (S&S original values)

| Planet | Value (deg) | Source |
|--------|-----------|--------|
| Earth | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | S&S 2012 |
| Mercury | 32.22 | S&S 2012 |
| Venus | 52.31 | S&S 2012 |
| Mars | <!--v:marsOmegaSS-->352.95<!--/v--> | S&S 2012 |
| Jupiter | <!--v:jupiterOmegaSS-->306.92<!--/v--> | S&S 2012 |
| Saturn | <!--v:saturnOmegaSS-->122.27<!--/v--> | S&S 2012 |
| Uranus | <!--v:uranusOmegaSS-->308.44<!--/v--> | S&S 2012 |
| Neptune | <!--v:neptuneOmegaSS-->189.28<!--/v--> | S&S 2012 |
| Pluto | <!--v:plutoOmegaSS-->107.06<!--/v--> | S&S 2012 |
| Ceres | 80.89 | S&S 2012 |

## Perihelion Precession Rates (1900–2100)

Observed linear trend rates from JPL SPICE/WebGeoCalc. These fluctuate over time and are not valid for long-term predictions.

| Planet | Rate (arcsec/cy) | Range | Source |
|--------|-----------------|-------|--------|
| Mercury | ~570 | single value | JPL SPICE |
| Venus | ~0 | single value | JPL SPICE |
| Earth | 1,164 (heliocentric; 6,186 wrt equinox) | single value | JPL SPICE |
| Mars | ~1550–1650 | min–max | JPL SPICE |
| Jupiter | ~800–1800 | min–max | JPL SPICE |
| Saturn | ~-3400 to -2000 | retrograde | JPL SPICE |
| Uranus | ~1100–1300 | min–max | JPL SPICE |
| Neptune | ~-200 to 200 | min–max | JPL SPICE |

## Laplace-Lagrange Inclination Bounds

Theoretical orbital inclination ranges from secular perturbation theory.

| Planet | Min (deg) | Max (deg) | Source |
|--------|----------|----------|--------|
| Mercury | 4.57 | 9.86 | Farside Table 10.4 |
| Venus | 0.00 | 3.38 | Farside Table 10.4 |
| Earth | 0.00 | 2.95 | Farside Table 10.4 |
| Mars | 0.00 | 5.84 | Farside Table 10.4 |
| Jupiter | 0.241 | 0.489 | Farside Table 10.4 |
| Saturn | 0.797 | 1.02 | Farside Table 10.4 |
| Uranus | 0.902 | 1.11 | Farside Table 10.4 |
| Neptune | 0.554 | 0.800 | Farside Table 10.4 |

**Source**: [Farside physics textbook (Brouwer & van Woerkom)](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html)

### Inclination Cycle Anchors — retired (plan 07 R8)

The per-planet cycle anchors (the ψ law's phase inputs, `inclinationCycleAnchor`,
and the System-Reset n=7 convention they were evaluated at) left
`model-parameters.json` with the law; nothing in the model reads them. Earth's
anchor (21.77°) phased the eccentricity channel; it left astro-reference with
that law at plan 09 step 6 (the scene pose it also set, the recorded
`kDeviceInclinationPhaseJ2000Deg`, left with the K scaffold at plan 11 step 4).
The retired values are archived; the eigenmode-cluster claim of earlier
versions is withdrawn with them.

The `EIGENMODE_PHASES` array in `script.js` provides Laplace-Lagrange reference values:

| Value | Label | Source |
|-------|-------|--------|
| 202.8° | γ₈ | Farside Table 10.1 |
| 20.23° | γ₁ | Farside Table 10.1 |
| 255.6° | γ₃ | Farside Table 10.1 |
| 296.9° | γ₄ | Farside Table 10.1 |
| 127.3° | γ₆ | Farside Table 10.1 |
| 315.6° | γ₇ | Farside Table 10.1 |
| 318.3° | γ₂ | Farside Table 10.1 |

f₅ = 0 (invariable plane, no evolution) is excluded — 7 active Laplace-Lagrange modes remain.

## Minor Bodies

### Pluto

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Orbital Period | `solarYearInput` | <!--v:plutoOrbitalPeriodInputDays-->90,465<!--/v--> days | JPL Horizons |
| Eccentricity | `orbitalEccentricityBase` | <!--v:plutoEccJ2000Full-->0.2488273<!--/v--> | JPL Horizons |
| Long. Perihelion | `longitudePerihelion` | <!--v:plutoPeriLongJ2000Full-->224.06891<!--/v--> deg | JPL Horizons |
| Sun/Pluto Mass Ratio | `MASS_RATIO_SUN_PLUTO` | <!--v:plutoMassRatioDE440-->136,045,556<!--/v--> | DE440 |
| GM | `GM_PLUTO_ALONE` | ~870 km³/s² | Pluto alone (matches Wikipedia / DE440 BODY999). System value ~975.5 km³/s² also stored as `GM_PLUTO_SYSTEM`. |

### Halley's Comet

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | <!--v:halleysEclInclJ2000Full-->162.26269<!--/v--> deg | JPL (retrograde orbit) |
| Ascending Node (Ecliptic) | `ascendingNode` | <!--v:halleysAscNodeEclJ2000-->58.42008<!--/v--> deg | JPL Horizons |
| Orbital Period | `solarYearInput` | <!--v:halleysOrbitalPeriodInputDays-->27,503<!--/v--> days | JPL |
| Eccentricity | `orbitalEccentricityBase` | <!--v:halleysEccJ2000Full-->0.96714291<!--/v--> | JPL |
| Long. Perihelion | `longitudePerihelion` | <!--v:halleysPeriLongJ2000Full-->111.33249<!--/v--> deg | JPL Horizons |
| Mass | `M_HALLEYS` | ~2.2 × 10¹⁴ kg | Estimated (~11×8×8 km, ~0.6 g/cm³) |

### Eros

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 10.82760 deg | JPL Horizons |
| Ascending Node (Ecliptic) | `ascendingNode` | <!--v:erosAscNodeEclJ2000-->304.30993<!--/v--> deg | JPL Horizons |
| Orbital Period | `solarYearInput` | <!--v:erosOrbitalPeriodInputDays-->642.93<!--/v--> days | JPL |
| Eccentricity | `orbitalEccentricityBase` | <!--v:erosEccJ2000Full-->0.2229512<!--/v--> | JPL |
| Long. Perihelion | `longitudePerihelion` | <!--v:erosPeriLongJ2000Full-->178.81322<!--/v--> deg | JPL Horizons |
| Mass | `M_EROS` | 6.687 × 10¹⁵ kg | NEAR Shoemaker (2000–2001) |

### Ceres

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | <!--v:ceresEclInclJ2000Full-->10.59407<!--/v--> deg | JPL Horizons |
| Inv. Plane Inclination | `invPlaneInclinationJ2000` | <!--v:ceresInvPlaneInclJ2000-->0.4331698<!--/v--> deg | S&S 2012 |
| Ascending Node (Ecliptic) | `ascendingNode` | <!--v:ceresAscNodeEclJ2000-->80.30533<!--/v--> deg | JPL Horizons |
| Orbital Period | `solarYearInput` | <!--v:ceresOrbitalPeriodInputDays-->1,680.5<!--/v--> days | JPL |
| Eccentricity | `orbitalEccentricityBase` | <!--v:ceresEccJ2000Full-->0.0755347<!--/v--> | JPL |
| Long. Perihelion | `longitudePerihelion` | <!--v:ceresPeriLongJ2000Full-->73.59769<!--/v--> deg | JPL Horizons |
| Orbit Distance | `orbitDistanceOverride` | 2.76596 AU | JPL Horizons |
| GM | `GM_CERES` | 62.6274 km³/s² | Dawn spacecraft (2015–2018) |

---

# Part 4 — Tuned/Optimized Parameters

These values result from the retired optimization campaign; the campaign write-ups are archived.

## Sun / Earth Tuned Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Correction Sun | (`correctionSun` — DELETED, plan 11 step 2) | was 0.49715 deg | the scene Sun's fitted start angle (the retired optimizer's Step 1); the engine places the Sun at the certified longitude every frame, so it reached nothing |

## Planet Orbital Periods (Tuned)

| Planet | Variable | Value (days) |
|--------|----------|-------------|
| Mercury | `solarYearInput` | <!--v:mercuryOrbitalPeriodInputDays-->87.9683<!--/v--> |
| Venus | `solarYearInput` | <!--v:venusOrbitalPeriodInputDays-->224.695<!--/v--> |
| Mars | `solarYearInput` | <!--v:marsOrbitalPeriodInputDays-->686.93<!--/v--> |
| Jupiter | `solarYearInput` | <!--v:jupiterOrbitalPeriodInputDays-->4330.53<!--/v--> |
| Saturn | `solarYearInput` | <!--v:saturnOrbitalPeriodInputDays-->10747<!--/v--> |
| Uranus | `solarYearInput` | <!--v:uranusOrbitalPeriodInputDays-->30586<!--/v--> |
| Neptune | `solarYearInput` | <!--v:neptuneOrbitalPeriodInputDays-->59800<!--/v--> |

Stored in `astro-reference.json`. These start from the JPL solar-year periods and carry small pipeline refinements (the calibration record, doc 68, is archived).

## Planet Orbital Eccentricities (Base) — RETIRED (plan 07 R6)

The base-eccentricity construction (the System-Reset midpoint from the balanced-year phase) was the K law's; it is deleted with the law. A planet's eccentricity of date has one home, the N-body chain ([Constants: Planet J2000 Orbital Elements](#planet-j2000-orbital-elements) carries the observed J2000 values the chains are anchored on).

With it went the Law-4 amplitude construction `e_amp = K × sin(tilt) × √d / (√m × a^(3/2))` and the planets' eccentricity phase constants on the balanced-year phase — nothing in the shipped code derives them any more. The recorded K value stays frozen in the [ψ/K section](#universal-coupling-constant-ψ) above (plan 07: `kValue` is a record, not a derivation).

## Per-Planet EoC Fractions — DELETED (plan 11 step 2)

The per-planet `eocFraction` constants (how much of a planet's Keplerian
variable speed the EoC formula carried against the geometric offset, see
[Equation of Center](65-equation-of-center.md)) are deleted: since the K5
legacy-chain excision the chain places every rendered planet, and the
fraction's only reader was a field nothing set (measured by the plan 11 reach
audit: a 0.25 shift in every fraction moved no position at any epoch). The
recorded values — Mercury −0.527, Venus 0.436, Mars −0.066224, Jupiter 0.495,
Saturn 0.54, Uranus 0.53, Neptune 0.585 — stand in git history.

## Planet Start Positions (legacy scaffolding since the K5 excision)

DELETED (plan 11 step 3). These were the retired pipeline Step 2's fitted
scene start angles (Mercury 83.65°, Venus 249.29°, Mars 121.46°, Jupiter
13.89°, Saturn 11.28°, Uranus 44.90°, Neptune 47.96° — git history carries
the doubles). Since the K5 legacy-chain excision they positioned only the
geometric scaffolding; their one remaining reach (plan 11 step 0b) was each
planet's pole azimuth and Saturn's ring plane, which turned once per orbit
with the wheel. Each planet's rotation axis is now placed in world from the
spin channel's pole of date through the frame bridge, as Earth's axis is
(`_kcPlacePlanetPole`; the Node twin mirrors it), and the scaffold wheels rest
at zero. The planets' `type` (the wheel ellipse family) and the
`perihelionPassageRef` JDs (the planet equation-of-centre branch) left with
them; the family is a code taxonomy in `@essrt/physics` planets/geometry. The
paired `angleCorrection` (the perihelion marker's fitted RA→λ conversion) was
deleted at plan 11 step 2: the chain placement overwrote the marker every
frame.

## Ascending Nodes on the Invariable Plane at J2000

Three node sets coexist, all in the Souami & Souchay longitude origin (the plane's ascending node on the ICRF equator), and all closed against the same observation — JPL's J2000 ecliptic inclination — through the spherical-triangle identity `cos i_ecl = cos i_P · cos i_E + sin i_P · sin i_E · cos(Ω_P − Ω_E)`:

- **S&S 2012** — the published nodes (`ascendingNodesSouamiSouchay` in `astro-reference.json`), mean-element values that miss the J2000 ecliptic inclinations by tens of arcseconds to a few arcminutes.
- **Closed-form verified** — Ω solved from the identity with JPL's `i_ecl`, the S&S `i_P` and Earth's S&S `(i_E, Ω_E)`; `ascendingNodeInvPlaneClosedForm` in `astro-reference.json` (a reference derivation; plan 11 step 2 moved it there from `model-parameters.json`, where the no-chain scaffolding once read it). Derived by [ascending-node-optimization.js](../tools/explore/ascending-node-optimization.js) (numerical) and [analytical-ascending-nodes.js](../tools/explore/analytical-ascending-nodes.js) (closed form); checked by [ascending-node-verification.js](../tools/explore/ascending-node-verification.js) and [ascending-node-souami-souchay.js](../tools/explore/ascending-node-souami-souchay.js).
- **Chain J2000** — the N-body chain's node of date at 2000 on the model's own banked plane, converted to the S&S origin by the derived conversion ([doc 05](05-invariable-plane-overview.md)); the value every rendered planet, the API and the registry's `<planet>OmegaJ2000` read. Its closure runs the identity on the chain's own `(i, Ω)` pairs, Earth's chain node included, so it is the chain's J2000 ecliptic inclination against the catalog.

| Planet | S&S 2012 | closure (″) | Closed-form verified | closure (″) | Chain J2000 | closure (″) |
|--------|---------:|------------:|---------------------:|------------:|------------:|------------:|
| Earth | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | (reference) | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | (reference) | <!--v:earthChainAscNodeInvSSJ2000Deg-->284.0401<!--/v--> | (reference) |
| Mercury | <!--v:mercuryOmegaSS-->32.22<!--/v--> | <!--v:mercuryEclInclSSClosureArcsec-->-52.0<!--/v--> | <!--v:mercuryOmegaVerified-->32.83<!--/v--> | <!--v:mercuryEclInclVerifiedClosureArcsec-->+0.2<!--/v--> | <!--v:mercuryOmegaJ2000-->32.49<!--/v--> | <!--v:mercuryEclInclChainClosureArcsec-->+1.6<!--/v--> |
| Venus | <!--v:venusOmegaSS-->52.31<!--/v--> | <!--v:venusEclInclSSClosureArcsec-->-117.6<!--/v--> | <!--v:venusOmegaVerified-->54.70<!--/v--> | <!--v:venusEclInclVerifiedClosureArcsec-->-0.1<!--/v--> | <!--v:venusOmegaJ2000-->51.49<!--/v--> | <!--v:venusEclInclChainClosureArcsec-->+2.0<!--/v--> |
| Mars | <!--v:marsOmegaSS-->352.95<!--/v--> | <!--v:marsEclInclSSClosureArcsec-->-159.1<!--/v--> | <!--v:marsOmegaVerified-->354.87<!--/v--> | <!--v:marsEclInclVerifiedClosureArcsec-->< 0.1<!--/v--> | <!--v:marsOmegaJ2000-->353.10<!--/v--> | <!--v:marsEclInclChainClosureArcsec-->-5.4<!--/v--> |
| Jupiter | <!--v:jupiterOmegaSS-->306.92<!--/v--> | <!--v:jupiterEclInclSSClosureArcsec-->-63.0<!--/v--> | <!--v:jupiterOmegaVerified-->312.89<!--/v--> | <!--v:jupiterEclInclVerifiedClosureArcsec-->+0.1<!--/v--> | <!--v:jupiterOmegaJ2000-->313.59<!--/v--> | <!--v:jupiterEclInclChainClosureArcsec-->-0.5<!--/v--> |
| Saturn | <!--v:saturnOmegaSS-->122.27<!--/v--> | <!--v:saturnEclInclSSClosureArcsec-->-35.3<!--/v--> | <!--v:saturnOmegaVerified-->118.81<!--/v--> | <!--v:saturnEclInclVerifiedClosureArcsec-->< 0.1<!--/v--> | <!--v:saturnOmegaJ2000-->120.39<!--/v--> | <!--v:saturnEclInclChainClosureArcsec-->-4.8<!--/v--> |
| Uranus | <!--v:uranusOmegaSS-->308.44<!--/v--> | <!--v:uranusEclInclSSClosureArcsec-->+32.5<!--/v--> | <!--v:uranusOmegaVerified-->307.80<!--/v--> | <!--v:uranusEclInclVerifiedClosureArcsec-->< 0.1<!--/v--> | <!--v:uranusOmegaJ2000-->308.62<!--/v--> | <!--v:uranusEclInclChainClosureArcsec-->+0.4<!--/v--> |
| Neptune | <!--v:neptuneOmegaSS-->189.28<!--/v--> | <!--v:neptuneEclInclSSClosureArcsec-->+112.5<!--/v--> | <!--v:neptuneOmegaVerified-->192.04<!--/v--> | <!--v:neptuneEclInclVerifiedClosureArcsec-->< 0.1<!--/v--> | <!--v:neptuneOmegaJ2000-->191.35<!--/v--> | <!--v:neptuneEclInclChainClosureArcsec-->-7.8<!--/v--> |
| Pluto | <!--v:plutoOmegaSS-->107.06<!--/v--> | — | <!--v:plutoOmegaJ2000-->101.06<!--/v--> | (script) | — (no-chain body) | — |

The verified and chain nodes are different constructions and differ by up to a few degrees: the closed form solves for Ω from the inclination alone (hence a sign ambiguity, resolved toward S&S) on S&S's Earth, while the chain carries JPL's full J2000 element set, node included, rotated into the model's own banked plane — Earth's chain node differs from the S&S value by the same construction. Pluto's closure is reported by the verification script, not the registry.

## Planet Perihelion Reference Dates (Phase-Optimized)

| Planet | `perihelionRef_JD` | Notes |
|--------|-------------------|-------|
| Mercury | 2460335.9 | Phase-optimized |
| Venus | 2455464.42 | Re-optimized with 42p correction |
| Mars | 2456505.6 | Re-optimized with Dec correction |
| Jupiter | 2464224.5 | Phase-optimized (-6 deg from 2023-Jan-21) |
| Saturn | 2452875.9 | Phase-optimized (+1 deg from 2003-Jul-26) |
| Uranus | 2439699.8 | Phase-optimized (+5 deg from 1966-May-20) |
| Neptune | 2409432.4 | Phase-optimized (+17 deg from 1876-Aug-27) |

## Moon Start Positions (DELETED)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Apsidal Start | (`moonStartposApsidal` — DELETED, plan 11 step 3) | was 347.5476 deg | the orbit RING's fitted J2000 perigee phase; the apsidal layer is engine-placed every frame at ϖ − 90° from the lunar arguments (ϖ = L′ − M′) |
| Nodal Start | (`moonStartposNodal` — DELETED, plan 11 step 3) | was 64.0435 deg | the orbit RING's fitted J2000 node phase; the nodal layer is engine-placed every frame at Ω − 180° (Ω = L′ − F) — ring ≡ markers ≡ the placed Moon ([doc 66 §4](66-moon-meeus-corrections.md)) |
| Moon Start | (`moonStartposMoon` — DELETED, plan 11 step 2) | was 67.8443 deg | the scene Moon's start angle; the certified series override places the rendered Moon's direction and distance every frame, so it reached only the Node twin's geometric pivot |

## Planet perihelion parameters (the retired predictive formula)

The per-planet **predictive formula system** — `PREDICT_PLANETS` (device
period, θ₀, lattice baseline per planet), the normalization constants and the
`PREDICT_COEFFS_*` arrays (~2,421 fitted terms per planet) — was **retired at
plan 06 R8**: the arrays reproduced the
right-ascension rate of the perihelion marker in the retired geometric scene,
a regression of the simulator against itself, and the planets now render from
the N-body chain. What remains of the same quantities: the planets' J2000
perihelion longitudes (`longitudePerihelion`, §4) and their inertial apsidal
periods (`perihelionEclipticYears` — since plan 07 R1 the chain's 1,296,000/g,
no longer a lattice fraction) give the secular rate 1,296,000/period × 100 ″/cy
per planet (`<p>PeriRateEclipticArcsecCy` in the registry; `<p>ModelBaseline`
is the chain's era window rate);
the Earth-frame right-ascension rate of that motion is its equatorial
projection (doc 13 §1.8 — one formula, no fitted constants).

---

## References

### Primary Source

- **Souami, D. & Souchay, J. (2012)**: "The solar system's invariable plane"
  - Publication: Astronomy & Astrophysics, 543, A133
  - URL: https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html
  - Used for: Invariable plane inclinations and ascending nodes for all planets

### JPL/NASA Data Sources

- **JPL Horizons System**
  - URL: https://ssd.jpl.nasa.gov/horizons/
  - Used for: J2000 ecliptic orbital elements (inclination, eccentricity, ascending node, mean anomaly)

- **JPL Approximate Positions of the Planets**
  - URL: https://ssd.jpl.nasa.gov/planets/approx_pos.html
  - Used for: Longitude of perihelion reference values

- **JPL SPICE Toolkit**
  - URL: https://naif.jpl.nasa.gov/naif/toolkit.html
  - Used for: High-precision ascending node values (preferred over Horizons where available)

### Standard Values

- **IAU (International Astronomical Union)**
  - Used for: Astronomical Unit definition, epoch definitions, obliquity (IAU 2006 precession model)
  - J2000 Epoch: January 1, 2000, 12:00 TT (JD 2451545.0)

- **IERS (International Earth Rotation Service)**
  - Used for: Length of day, Earth rotation parameters, sidereal/stellar day definitions

- **Meeus & Savoie (1992)**
  - Publication: "The history of the tropical year", J. British Astronomical Association, 102(1), 40-42
  - Used for: Cardinal tropical year lengths, tropical year rate

- **USNO (United States Naval Observatory)**
  - Used for: Solstice timing reference (June Solstice 2000 JD)

---

**Next**: [Orbital Formulas Reference](21-orbital-formulas-reference.md)
