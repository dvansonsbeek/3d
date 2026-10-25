---
docVersion: 1.0
modelVersion: v26.7
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# The calculation map: every published quantity, traced to its formula, its code and its live value

**Purpose.** The model became hard for its own author to check. This document
is the audit's instrument: for each published quantity — chain by chain —
the inputs, the formula, the engine that owns it, its type, the code that
computes it (file:line) and its **live value**, written by
`tools/docs/render-calculation-map.mjs` from the same evaluators the model
runs (so a number here can never be stale; `npm run docs:tables` fails if
it is). The acceptance test is external: a chain counts as understood when
the owner reproduces its values in a spreadsheet from this page alone.

**The H-role column** is the audit's record: it classified where the retired
fitted unit (13.011 × the J2000 luni-solar precession period) once entered
each formula — as a unit (**U**), as a proxy for the tidal spin history
(**P**), as a comb basis (**C**) or as a lattice claim (**L**). Since plan 09
(model v24.0) no formula carries it; the dispositions are [doc 109 §23](109-model-nbody-engine.md).


Types follow plan 02 D1: **A** long-term frequency/mean · **B** present-epoch
rate · **C** window trend · **L** local law valid over a stated span.

---

## Chain 1 — Earth's eccentricity into the lunar chain

The Moon's own orbital eccentricity is an input constant
(`moonOrbitalEccentricityBase` = 0.054900489, astro-reference; it enters
only the Layer-0 angular-momentum factor √(1 − e²) and the panel's ellipse
geometry). What the *derived* Moon actually consumes is **Earth's**
eccentricity e_E(t): the Sun's mean perturbation on the lunar node and
perigee scales as (1 − e_E²)^(−3/2), and Meeus's E-factor multiplies every
series term that carries the solar anomaly M.

### 1.1 The three evaluators of e_E — one physical quantity, three homes

| evaluator | formula | anchor | engine · type | H-role | consumers | code |
|---|---|---|---|---|---|---|
| **deep-mode channel** | z(t) = Σₖ (reₖ + i·imₖ)·e^{iωₖt} + R, e = \|z\|; R = z_J2000 − Σₖ(reₖ + i·imₖ) so e(J2000) is exact by construction; 18 modes (ω, re, im) from the ±10-Myr NAFF table | e₀ = 0.0167024357, ϖ₀ = 102.918° (the JPL J2000 seed, `CHAIN_ARTIFACT.j2000AnchorElements.earth`) | D · A (beyond ~5 Myr the table is spectrum-class: the attractor, not a pointwise ephemeris) | — | **the entire lunar chain** (this chain) | `packages/physics/src/moon/deep-ecc-channel.cjs` 60–120 |
| **H/3 line (deleted, plan 09 step 6)** | e(t) = base′·(1 + cos θ(t)/2), θ = θ₀ + 2π·cycles(2000→t, divisor 3), base′ = e₀/(1 + cos θ₀/2), θ₀ = ϖ_ICRF(J2000) − 21.77° | e₀ = 0.01671022 (IAU, astro-reference), ϖ_ICRF(J2000) = 102.94719°, anchor 21.77° | K · L (the epoch-local tangent, 5 % era ≈ −2,600…+2,850) | **L** (H/3 phase counter — the "3" is a J2000 reading; plan 06 restates) | RETIRED from the physics package (plan 06 layer B): the eclipse Sun's equation of centre, the Besselian Sun distance and the cardinal braid now ride the banked series plus the derived mean-element offset (next row); DELETED at plan 09 step 6: the browser's `_moonEcc`, the Node twin's `_fwEarthEcc`, the two ecc-channel modules and the 21.77° anchor are gone; the scene keeps the line's J2000 phase as a recorded pose (`kDeviceInclinationPhaseJ2000Deg`) | — (doc 66 §1 is the derivation record) |
| **mean-element offset** | Δϖ = <!--v:sunMeanOffsetPomArcsec-->+70.08<!--/v-->″, Δe = <!--v:sunMeanOffsetE-->+5.81e-6<!--/v--> added to the series for the SUN only — the 1890–2110 mean of (osculating − secular) EMB e and ϖ from the Horizons J2000 seed integrated as a nine-body system (the lab RK4, daily samples), the chain as the secular reference | the seed vectors, the chain, the lab derivative | P (fully derived; the JPL Sun sample is a validation only: all-phase sd 3.23″ → 1.59″, the former K law 1.58″) | — | eclipse Sun equation of centre, Besselian Sun distance, cardinal braid — the mean elements of the era (Simon 1994's 102.937°, 0.0167086 reproduced to 0.2″); the published Earth surface stays the secular series | `tools/verify/earth-osculating-offset.js` → `data/earth-osculating-mean-offset.json`; `model/earth-scalars.js` `sunPerihelionDegAt` / `sunEccentricityAt` |
| **banked series** | e = \|z(t)\| sampled from the same N-body run (`data/nbody-secular-series.json`, 2-kyr grid inside ±10 Myr; the mode table beyond) | the run itself | D · A | — | the scene's readouts, the Eccentricity Path exhibit, the FV charts | `src/script.js` `_sceneEccTargetAt`, `tools/lib/deep-orbital-history.js` |

The deep-mode channel and the retired H/3 line agreed within ~8×10⁻⁵ across the
historical era and diverged beyond it (0.0034 vs 0.0079 at the 28,832 AD
minimum — the measured reason the line could not be the physics); the series and the mode table agree in-era and sit ~1×10⁻³ apart
by 27 kyr (the table pins the unresolved short-period content only at
J2000). The two J2000 anchors differ by 7.8×10⁻⁶ (JPL vector seed vs IAU
mean element) — the reason the first row below shows two e's at 2000.

### 1.2 The steps the lunar chain applies to e_E(t)

| step | quantity | formula | inputs | code |
|---|---|---|---|---|
| 1 | g(e), g₀ | g = (1 − e²)^(−3/2); g₀ = g(e₀) | e₀ from the deep channel | `deep-ecc-channel.cjs` 91–92 |
| 2 | rate modulation | (g(e(t))/g₀)^s, s_ϖ = 2.407 (perigee), s_Ω = 1.018 (node) — the Meeus-EFFECTIVE sensitivities (physical pair 2.479/0.867 after removing the IAU ṗ_A frame term) | step 1 | `deep-ecc-channel.cjs` 96–100; the constants `arguments.cjs` 145 |
| 3 | phase-aware channel integral | I(T, s) = ∫₀ᵀ [(g(e(t′))/g₀)^s − 1] dt′, T in Julian centuries; composite Simpson, step ≤ ~4 kyr | step 2 | `deep-ecc-channel.cjs` 106–118 |
| 4 | perigee and node of date | ϖ(T) = (LP0 − MP0) + ϖ̇₀·(T + I(T, s_ϖ)); Ω(T) = (LP0 − F0) + Ω̇₀·(T + I(T, s_Ω)); ϖ̇₀ = LPR − MPR = 4069.0137 °/cy, Ω̇₀ = LPR − FR = −1934.1363 °/cy (Meeus Ch. 47 J2000 anchors; the rate SPEEDS UP and SLOWS DOWN with the e_E phase — replaces Meeus's frozen T²/T³) | step 3 | `arguments.cjs` 511–512 (era branch; the deep branch adds the rate completions) |
| 5 | Meeus E-factor, bounded | E(t) = e(t)/e₀ (≡ 1 at J2000); replaces 1 − 0.002516T − 0.0000074T²; every series term carrying M is multiplied by E, terms with 2M by E² | step 1 | `model/lunar-theory.js` `fwEFactor`; `series.cjs` 180–181 |
| 6 | the L′ planetary carrier (Δe²) | K_PL · ∫₀ᵀ (e(t′)² − e₀²) dt′ with K_PL derived from the ELP W1 T² budget (table 1.3) | e₀ (the channel's anchor constant, not eccAt(0)) | `arguments.cjs` 199–225 |
| 7 | deep-time lunar periods | perigee period(t) = P₀ · (T_yr(t)/T_yr₀)² · (M_sid₀/M_sid(t)) / (g/g₀)^s_ϖ; node likewise with s_Ω; M_sid(t) from Kepler on the receded distance; T_yr(t) from the mass-loss tier | step 2 + the tidal chain | `month-chain.cjs` 186–206 |
| 7′ | the precession of date in this chain (the former H entry point, re-expressed at plan 09 step 5c) | the tropical month removes one equinox turn per T_p(t): `tropicalMonthSecondsAtAge` = M_sid·(1 − M_sid/(T_p·T_yr)) (was 13 turns per the counter H(t), 0.086 % slow — the chain's J2000 tropical month sat 5.85 ms above the IAU input); the apsidal/nodal "cycles per H" and their H² scaling are deleted — the of-date perigee and node are the count compositions N_trop − N_anom and N_drac − N_trop | `lunisolarPrecessionPeriodYearsAtAge` | `month-chain.cjs` — no H entry point |

### 1.3 Live values — the spreadsheet check

Rows are evaluated by the script from the deep channel exactly as steps 1–5
compose them (T = (year − 2000)/100; the of-date angles wrapped to 0–360°).

<!-- generated:calcmap-e-chain-values -->
| year | T (cy) | e — deep modes | e — the published series | E = e/e₀ | (g/g₀)^s_ϖ | (g/g₀)^s_Ω | I(T, s_ϖ) (cy) | I(T, s_Ω) (cy) | perigee ϖ of date (°) | node Ω of date (°) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2000 | 0.00 | 0.0167024 | 0.0167024 | 1.000000 | 1.0000000 | 1.0000000 | 0.0000e+0 | 0.0000e+0 | 83.3531 | 125.0444 |
| 1246 | -7.54 | 0.0170163 | 0.0170119 | 1.018791 | 1.0000382 | 1.0000162 | -1.4412e-4 | -6.0953e-5 | 2.4031 | 308.5499 |
| -584 | -25.84 | 0.0177517 | 0.0177008 | 1.062823 | 1.0001306 | 1.0000552 | -1.6900e-3 | -7.1472e-4 | 53.1619 | 64.5084 |
| -2584 | -45.84 | 0.0185087 | 0.0183468 | 1.108142 | 1.0002297 | 1.0000972 | -5.2972e-3 | -2.2403e-3 | 18.2092 | 230.1849 |
| -10000 | -120.00 | 0.0206932 | 0.0196358 | 1.238935 | 1.0005392 | 1.0002280 | -3.4623e-2 | -1.4641e-2 | 180.8257 | 49.7176 |

Anchors the rows above use: e₀ (JPL J2000 seed, the deep channel's anchor) = 0.0167024357 · e(J2000) IAU (astro-reference) = 0.01671022 · g₀ = (1 − e₀²)^(−3/2) = 1.0004186030 · ϖ̇₀ = LPR − MPR = 4069.0137287 °/cy · Ω̇₀ = LPR − FR = -1934.1362891 °/cy · s_ϖ = 2.407, s_Ω = 1.018.
<!-- /generated:calcmap-e-chain-values -->

The Δe² carrier's coefficient (step 6), derived — not a constant:

<!-- generated:calcmap-kpl -->
| term | value | where it comes from |
|---|---|---|
| T2_LP (Meeus L′ T² coefficient) | -0.0015786 °/cy² | Meeus Ch. 47 polynomial, literal |
| T2_LP_TIDAL = (−25.86″/cy²)/2 | -3.591667e-3 °/cy² | LLR tidal n̈/2 |
| t2obl = (J₂ figure + Lieske ṗ_A T²)/3600 | 3.621194e-4 °/cy² | astro-reference elpW1T2Decomposition: 0.1925 + 1.11113 ″/cy² |
| Δ(e²) per century at J2000 = e(+50 yr)² − e(−50 yr)² | -1.404195e-6 | the deep channel (the doc-66 value −2332 °/cy per e² was derived on the H/3 line's slope) |
| **K_PL = 2·(T2_LP − T2_LP_TIDAL − t2obl)/Δ(e²)** | **-2351.45 °/cy per e²** | arguments.cjs kPlValue() — the same budget numerator, the live channel's slope |
<!-- /generated:calcmap-kpl -->

The deep-time lunar periods (step 7), from the Node engine's month chain
(`tools/lib/deep-time.js` → `packages/physics/src/moon/month-chain.cjs`):

<!-- generated:calcmap-lunar-periods -->
| age (Ma) | sidereal month (d) | perigee period (yr) | node period (yr) | T_p (yr) | (g/g₀)^s_ϖ | (g/g₀)^s_Ω |
|---|---|---|---|---|---|---|
| 0 | 27.321662 | 8.85038 | 18.59952 | 25771.6 | 1.0000000 | 1.0000000 |
| 0.002584 | 27.321651 | 8.84923 | 18.59850 | 25771.5 | 1.0001306 | 1.0000552 |
| 0.01 | 27.321621 | 8.84624 | 18.59585 | 25771.5 | 1.0004700 | 1.0001987 |
| 0.1 | 27.321253 | 8.81484 | 18.56805 | 25770.4 | 1.0040476 | 1.0017099 |
| 1 | 27.317557 | 8.81349 | 18.56829 | 25759.4 | 1.0043371 | 1.0018320 |
| 10 | 27.280626 | 8.77904 | 18.55200 | 25650.3 | 1.0096392 | 1.0040654 |
| 380 | 25.646057 | 9.43038 | 19.81467 | 21235.4 | 0.9996735 | 0.9998619 |
| 650 | 24.440793 | 9.89326 | 20.78867 | 18435.1 | 0.9997916 | 0.9999119 |
<!-- /generated:calcmap-lunar-periods -->

### 1.4 Findings from this chain — resolved

The audit's findings for this chain (the carrier's one home, the proxy the retired unit stood for) were all resolved at plans 06–09 and are archived; the one-home rule they led to is CLAUDE.md's.


## Chain 2 — the lunisolar precession: the Earth clock

This is the chain plan 06 turns on. The luni-solar precession of Earth's
spin axis is what the legacy constant H was a proxy for. The model computes
it in **three places** that must be read together: the *mean* tidal-tier
clock (2.1, where T_p(t) is composed from the day length and the Moon's
distance), the *of-date*
precession period (2.2, a beat of the year lengths, driven by the hybrid's
own equinox motion), and the *torque composition* (2.3, the physical rate:
Earth's spin × the solar + lunar torques on the recession history).

### 2.1 The mean tidal clock — LOD(t) → ω(t) → T_p(t)

| step | quantity | formula | inputs | H-role | code |
|---|---|---|---|---|---|
| 1 | Moon distance a_M(t) | a₀ · r(t), r the CITED history's ratio a(t)/a(0) (Farhat et al. 2022, AstroGeo22, 0–4,429 Ma at 1 Myr) on a monotone cubic Hermite with the J2000 end-slope = the LLR α₁; forward of J2000 the LLR rate held; null beyond 4,429 Ma (plan 12 option A — no fitted term) | the AstroGeo22 table; α₁; a₀ = 384,399.07 km | — | `deltat/moon-distance-history.cjs` |
| 2 | Earth's moment-of-inertia factor α(t) | α_J2000 − k·[L1(t) − ⟨L1⟩_τ(t)] — the GIA channel: the polar moment's LAGGED response to the ice history the L1 lines proxy (τ the mantle relaxation time; k derived at construction from the observed dJ₂/dt, no stored scale; `climate/l1-orbital` `createAlphaGiaChannel`); α_J2000 = 0.330695 | the L1 climate formula | — (the L1 lines are the engine's own orbital lines + the 405-kyr family, `data/l1-physical-lines.json`, plan 06 T1; formerly **C**, integer-divisor lines) | `deltat/deep-time-chain.js` `alphaGia` (the model reads it through `model/deep-time-chain.js`; twin `tools/lib/deep-time.js`) |
| 3 | day length LOD(t) | 2π·I(t) / (L_EM(t) − L_M(t)), I = α·M_E·R_E², L_M = m_M·√(GM_EM·a_M)·√(1 − e_M²) — angular-momentum conservation in the Earth–Moon system; L_EM constant (the solar channels that once made it time-dependent beyond the era were deleted at plan 12 option A) | steps 1–2; L_EM from Layer 0 (chain 1's √(1 − e_M²) factor) | — | `deltat/deep-time.cjs` 80–86; L_EM `layer0/derive-params.js` 63–64 |
| 4 | spin rate ω(t) | 2π / LOD(t) | step 3 | — | (implicit) |
| 5 | the spin factor ω₀/ω(t) = LOD(t)/LOD₀ | **LOD(t)/LOD_J2000** | LOD_J2000 = ω₀ = 86,400 s (the SI day — plan 09; the device's kinematic day read 86,399.99968) | — (plan 09 steps 7a/7b: the two counters that rode this factor — the frozen era clock's H_era = H₀·LOD/LOD₀, `eraClockHAtAge`, and the unit H(t) = H_era/[torque term], `hAtAge`, 13.011 composed periods at every epoch — are deleted; H₀ = 335,317 was the fitted primitive) | `earth/precession-composed` (the ω₀/ω factor of 2.3) |
| 6 | **T_p(t), the composed lunisolar precession period** | **1,296,000″ / ψ̇(t)**, ψ̇(t) = p₀·[ω₀/ω]·[f_S + (1 − f_S)(a₀/a_M)³], p₀ = 1,296,000/T_p(J2000) | step 5; a_M(t) (step 1); f_S = 0.3165 from the shared constants (`derive-params`); T_p(J2000) = 25,771.575 yr = 1,296,000/p_A, the IAU 2006 general precession input (plan 09; S5 had anchored it on the certified year combs' beat, 25,771.4) | **P** — the published deep-time clock (`epoch.axialPrecessionYearsAtYear`, `lunisolar.meanPeriodYearsAtYear`) | `deltat/deep-time.cjs` `lunisolarPrecessionPeriodYearsAtAge` (one formula home: `earth/precession-composed`) |
| 7 | tropical year of age | 1/T_trop = 1/T_sid(t) + ψ̇(t)/(1,296,000″ · 365.25 d) — the sidereal year less one equinox turn per the composed precession period T_p(t) (plan 09 step 5d; it was the unit's calendar convention T_sid·(1 − 13/H(t)), 0.086 % slow on the equinox term — 1.0 s of year at J2000, 1.1 h of the deep JD↔year calendar at ±4 kyr — which plan 06 D2 had kept as a named device). At J2000 it is the derived mean tropical year of 2.1 step 4c to 5 ns. The deep JD↔year calendar integrates this over the day of date | step 6's ψ̇(t) (ω₀/ω, f_S, a₀/a_M); T_sid(t) = T₀(1 − Δm)² (Driver 2) | **P** (no H) | `deltat/deep-time.cjs` `tropicalYearSecondsFromLod`; layer-0 twin `tropicalYearSecondsCore` (bit-identical, the layer0 gate); the frozen clock's device twin on H_era, `eraClockTropicalYearSecondsAtAge`, was deleted with the era clock at plan 09 step 7a |

Plan 06 Phase 3 made the unit follow the composed physics of 2.3, and the
former step 5 was the frozen devices' own counter under its own name; plan
09 steps 7a/7b deleted both counters — step 6 is the period itself.
Numerically the two had agreed wherever (a₀/a_M)³ ≈ 1 (0.999995 at 26 kyr)
and split at depth (0.68 at 2.46 Ga). **S5 (one J2000 precession
reading)** then anchored the composed rate on the model's own derived
J2000 period — 25,771.4 yr, the certified year laws' beat, IAU to 8×10⁻⁶
— instead of on H₀/13 = 25,793.6 (plan 09 then made the anchor the IAU
2006 p_A itself, 25,771.575 yr, an input: the derived beat's 8 ppm was a
sidereal-year-input residual, finding 2.5-1), and retired "H = 13·T_p" as a claim:
H₀ was fitted on the 1246 AD perihelion–solstice alignment (the
perihelion-of-date beat, finding 1), so H₀/13 is the fit anchor's reading,
0.086 % slow, and is not a period of anything the model computes (nor a
window mean: the published period averages 25,598 yr over ±26 kyr). The
unit and the clock had scaled together, their ratio 13.011 a fit constant;
the unit left the physics at plan 09 step 7b. At S5 the composed
rate rose 0.086 % everywhere (paleo rows: +0.94 % / −3.68 % against
Xiamaling / Lantink, both inside tolerance).

### 2.2 The of-date precession period — the one-family beat

The model exposes ONE of-date precession evaluator (plan 09 — the comb
pair, route (A), is deleted; table 2.4 keeps route (B) against the
composed clock). It is the beat of the sidereal and tropical years of date
— T_p = T_sid·T_trop/(T_sid − T_trop), a duration — quoted in JULIAN years
(÷ 365.25 d), the unit the frame's precession rate is expressed in, so
360°/rate and the beat are the same number; the dimensionless
T_sid/(T_sid − T_trop) counts TROPICAL years and sits 2.1×10⁻⁵ (0.55 yr)
above it — the unit slip the scene-sampled check exposed in 2026-09 (the
retired comb pair read 25,772.0 tropical years where the frame turned once
per 25,771.4 Julian years; the tropical year absorbed the 26 ms).

| route | sidereal year of date | tropical year of date | H-role | code |
|---|---|---|---|---|
| **(B) the one-family route** — `model.yearLengths.axialPrecessionYearsAtYear` ("THE ONE HOME for the of-date year lengths") | the D6 λ̇ channel: massLossLaw(y)/lamDotRel(y), the engine's own banked mean-longitude drift (each node the least-squares quadratic slope of the run's unwrapped L over ±5 kyr) | 1/T_trop = 1/T_sid + p(y)/(360°·365.25 d) with p(y) the year-over-year retrograde advance of the hybrid's equinox in its GENERAL-PRECESSION longitude — the broken angle through the node of the ecliptic of date on the J2000 ecliptic (the p_A of the literature; the projected longitude atan2(g_y, g_x) parts from it with the square of the ecliptic's tilt: 0.05 s of year at ±4 kyr, ~1 s beyond 100 kyr, 5.9″ of Sun at −3000) — the lunisolar α-integration of ŝ against the engine's n̂(t), self-anchored so the realized J2000 rate equals 360/T_p,J2000 per Julian year exactly; the beat T_sid·T_trop/((T_sid − T_trop)·365.25 d) is quoted in Julian years, the unit of that rate | — | `earth/year-lengths.cjs`; `earth/sidereal-year-channel.cjs`; `earth/deep-orbital-history.cjs` (`generalPrecessionLonDeg`) |
| the hybrid's own α(t) — the precession constant of date | — | — | **P**: α(t) = ψ̇(t)/cos ε₀ with ψ̇(t) = 2π/T_p,composed(t), the injected `lunisolarPrecessionPeriodYearsAtAge` (plan 09 step 7b; Phase 3 had written it as T_p,J2000 · H(t)/H₀, the same number) — **times the two factors of date** (2.3): the solar torque at the eccentricity of date and J₂(t)/J₂₀ from the GIA channel, both exactly 1 at J2000 | `model/one-source-movement.js` (the `oneSourceM` wiring); `deep-orbital-history.cjs` (`alphaAtGeneral`); `climate/l1-orbital.cjs` (`j2RatioAt`) |

At J2000 route (B) reads 25,771.575 yr = 50.28796 ″/yr — the IAU 2006 value
exactly (P03's 5,028.796195″/cy, the input `generalPrecessionJ2000_arcsecPerYr`,
plan 09; the S5-era derived beat 25,771.40 sat 8 ppm above it). This is the
model's ONE J2000 precession reading: the composed clock's anchor p₀, the
hybrid's self-anchor target and every published face (`lunisolar`, the
registry, the panels) read it. The retired unit's H₀/13 read 25,793.6 yr =
50.2450 ″/yr — the fit anchor's reading, never a period (finding 1). Away from J2000 the
published route follows the hybrid (finding 5).

### 2.3 The torque composition — the physical rate

ψ̇(t) = [ω(t)/ω₀] · p₀ · ( f_S + (1 − f_S)·(a₀/a_M(t))³ ),  μ = 1

— the spin-and-tides side supplies ω(t) and a_M(t) (the recession
history), the orbital side the solar term; f_S is the solar share of the
J2000 torque. The
composition's ONE home is the physics package
(`earth/precession-composed`, plan 06 D6 — finding 2 below, RESOLVED); the
registry (`tools/docs/model-values.mjs`) and the instrument
`tools/explore/w3-precession-crosscoupling.mjs` read it.

**The precession of date.** The composition above is the SECULAR law: the
deep-time clock T_p(t) rides it (so did the unit H(t), until plan 09 step 7b
deleted it). The spin integration (route B,
the published movement) multiplies it by two factors of date, both exactly
1 at J2000 — ONE home, `earth/deep-orbital-history.cjs`:

```
F_sun(t)   = 1 + f_S · ( [ (1 − e(t)²) / (1 − e₀²) ]^(−3/2) − 1 )      the solar torque at the eccentricity of date
J₂(t)/J₂₀  = 1 − k_J · [ L1′(t) − L1′(2000) ] / J₂₀                     ψ̇ ∝ the dynamical ellipticity (C − A)/C
```

F_sun is the solar-share row below evaluated of date — the same
(1 − e²)^(−3/2), with e(t) the one-source eccentricity the integration
already carries. J₂(t)/J₂₀ is the GIA channel's second observable
(`climate/l1-orbital.cjs` `j2RatioAt`): the ice-age mass redistribution the
length-of-day side carries as α(t), read in its own observable — k_J is
fixed by the OBSERVED dJ₂/dt (input `j2RateJ2000PerYr`, Cox & Chao 2002:
<!--v:j2RateJ2000Per1e11Yr-->−2.7<!--/v--> ×10⁻¹¹ /yr), so the J₂→α conversion of the length-of-day side never
enters. Measured (`tools/verify/equinox-vs-vondrak.js`, theory against
theory): the equinox of date sits within <!--v:equinoxVsVondrakMaxAbsArcsec-->7.9<!--/v-->″ of Vondrák et al. (2011)
over ±3000 yr (<!--v:equinoxVsVondrakMaxAbsInnerArcsec-->0.6<!--/v-->″ inside −500…+2500) where the secular law alone reads
<!--v:equinoxSecularOnlyMaxAbsArcsec-->28.1<!--/v-->″ — the whole of the Sun's former ancient residual against Horizons;
the obliquity holds <!--v:obliqVsLa2004RmsLastMyrArcsec-->14.8<!--/v-->″ rms against La2004 over the last million years
where the secular law alone reads <!--v:obliqSecularOnlyVsLa2004RmsLastMyrArcsec-->80.4<!--/v-->″ (La2004 integrates the same
eccentricity-dependent torque). Over the last Myr F_sun averages
+<!--v:precOfDateSolarTorqueMeanLastMyrPct-->0.032<!--/v--> % (the mean e² sits above today's — <!--v:precOfDateEquinoxShiftAtM1MyrDeg-->4.2<!--/v-->° of equinox at −1 Myr) and
J₂(t)/J₂₀ stays within ±<!--v:precOfDateEllipticityAmpLastMyrPct-->0.02<!--/v--> % with no secular part.

<!-- generated:calcmap-torque-split -->
| term | value | formula / source |
|---|---|---|
| solar torque factor | 3.965677e-14 km³/s²/km³ | GM☉/AU³ · (1 − e_E²)^(−3/2), e_E = 0.01671022 (IAU J2000) |
| lunar torque factor | 8.565827e-14 | GM_M/a_M³ · (1 − e_M²)^(−3/2) · (1 − 1.5 sin² i_M), a_M = 384399.07 km, e_M = 0.054900489, i_M = 5.1573° |
| **f_S, the solar share** | **31.65 %** | sol/(sol + lun) — literature ≈ 31.6 % |
| p₀, the composition's J2000 anchor | 50.2880 ″/yr | the IAU 2006 general precession in longitude p_A (astro-reference `generalPrecessionJ2000_arcsecPerYr`, T_p(J2000) = 25,771.575 yr) — the model's ONE J2000 reading since plan 09 (S5 had anchored it on the retired year combs' beat at 2000, 25,771.395 yr, 8 ppm faster). The former 1,296,000/(H/13) = 50.2450 was the fit anchor's reading, 0.086 % slow |
| α = p₀ / cos ε₀ | 54.811 ″/yr | the hybrid's precession constant (ε₀ = 23.439279444444445°); literature ≈ 54.9 |
<!-- /generated:calcmap-torque-split -->

### 2.4 Live values — the spreadsheet check

The mean tidal clock and the composition, by age:

<!-- generated:calcmap-tidal-clock -->
| age (Ma) | a_M (km) | LOD (h) | ω/ω₀ = LOD₀/LOD | α (I/MR²) | (a₀/a)³ | cos ε̄(t)/cos ε̄₀ (the cited mean obliquity, plan 12 §8) | **T_p = 1,296,000/ψ̇ (yr)** | ψ̇ (″/yr) |
|---|---|---|---|---|---|---|---|---|
| 0 | 384399 | 24.000 | 1.00000 | 0.330695 | 1.0000 | 1.00000 | **25771.6** | 50.29 |
| 0.01 | 384399 | 24.000 | 1.00000 | 0.330695 | 1.0000 | 1.00000 | **25771.5** | 50.29 |
| 0.1 | 384395 | 23.999 | 1.00002 | 0.330695 | 1.0000 | 1.00000 | **25770.4** | 50.29 |
| 1 | 384361 | 23.994 | 1.00025 | 0.330695 | 1.0003 | 1.00002 | **25759.4** | 50.31 |
| 10 | 384015 | 23.941 | 1.00247 | 0.330695 | 1.0030 | 1.00020 | **25650.3** | 50.53 |
| 100 | 380602 | 23.427 | 1.02448 | 0.330695 | 1.0302 | 1.00192 | **24599.3** | 52.68 |
| 380 | 368549 | 21.759 | 1.10301 | 0.330695 | 1.1347 | 1.00755 | **21235.4** | 61.03 |
| 650 | 356928 | 20.340 | 1.17994 | 0.330695 | 1.2491 | 1.01238 | **18435.1** | 70.30 |
| 1400 | 339940 | 18.537 | 1.29470 | 0.330695 | 1.4459 | 1.01861 | **14976.9** | 86.53 |
| 2460 | 321186 | 16.845 | 1.42477 | 0.330695 | 1.7143 | 1.02452 | **11863.3** | 109.24 |

T_p(t) is the composed lunisolar precession period on the model’s ONE J2000 reading — 1,296,000/ψ̇ with p₀ = 1,296,000/T_p(J2000) = 50.2880 ″/yr, T_p(J2000) = 1,296,000/p_A on the IAU 2006 general precession input (plan 09; S5 had the retired year combs’ beat at 2000, 8 ppm faster) — `@essrt/physics/earth/precession-composed` built inside `deltat/deep-time.cjs`, one home: the hybrid precesses on it, the paleo-anchors gate checks the ψ̇ column. (The internal UNIT H(t) = H₀·(ω₀/ω)/[f_S + (1 − f_S)(a₀/a)³] — `hAtAge`, 13.011 composed periods at every epoch, a fit constant’s multiple and not a period of anything the model computes; H₀ was fitted on the 1246 AD perihelion–solstice alignment — left the physics at plan 09 step 7b, after its spin-scaling twin H_era = H₀·LOD/LOD₀, the FROZEN era clock’s counter, left with the last comb at step 7a.) External readings for the ψ̇ column: IAU J2000 50.288 ″/yr (measured); Wu et al. 2024 at 650 Ma 67.64 ″/yr; Meyers & Malinverno 2018 at 1400 Ma 85.79 ± 2.72 ″/yr; Lantink et al. 2022 at 2460 Ma 108.6 ± 8.5 ″/yr (all three cyclostratigraphic inferences through an assumed astronomical model — theory-vs-inference, doc 99; the last two are gate rows `xiamaling-prec-1400` / `lantink-prec-2460`).
<!-- /generated:calcmap-tidal-clock -->

The of-date precession, by year (the hybrid's ε alongside, from the
one-source movement):

<!-- generated:calcmap-ofdate-precession -->
| year | **T_p (B) one-family (yr) — PUBLISHED** (`epoch.axialPrecessionYearsAtYear`, API/MCP) | p (B) (″/yr) | T_p composed (yr) — the deep-time clock, same J2000 anchor (the IAU p_A since plan 09) | ε, hybrid (°) |
|---|---|---|---|---|
| -10000 | **26459.78** | 48.9800 | 25771.4 | 24.15890 |
| -2584 | **26253.47** | 49.3649 | 25771.5 | 23.98229 |
| -584 | **26058.52** | 49.7342 | 25771.5 | 23.76559 |
| 0 | **25995.70** | 49.8544 | 25771.6 | 23.69481 |
| 1246 | **25857.09** | 50.1216 | 25771.6 | 23.53705 |
| 2000 | **25771.58** | 50.2880 | 25771.6 | 23.43928 |
| 5000 | **25447.75** | 50.9279 | 25771.6 | 23.06397 |
| 10000 | **25110.55** | 51.6118 | 25771.7 | 22.65350 |
<!-- /generated:calcmap-ofdate-precession -->

### 2.5 Findings from this chain — resolved

The audit's findings for this chain (three coexisting J2000 precession rates → the one p_A; the composition's home; the deep-time content of the retired unit) were resolved at plans 06–09 and are archived.


## Chain 3 — the year lengths and the day

Since plan 09 the J2000 year lengths are the IAU inputs on the SI day, and
the year lengths of date are the one-family route (chain 2.2 B) over the
kinematic day of date, the tidal chain's mean length of day. The certified
clock device's year-length comb family that lived here is deleted; its
record is kept below where a retired reading explains a present one.

### 3.1 The J2000 identities (model/derived-constants.js)

<!-- generated:calcmap-j2000-identities -->
| quantity | value | formula | H-role |
|---|---|---|---|
| **meanSolarYearDays** | 365.242190469 | DERIVED in one home: 1/T = 1/T_sid + p_A/(1,296,000″·365.25 d) — the beat of `yearLengthRef.siderealYear` and the IAU 2006 p_A per Julian year (`computeMeanTropicalYearJ2000Days`); the calendar's year axis (plan 09: was the Meeus & Savoie 1992 input 365.2421897, 66 ms shorter; before it the device's rounded input 365.2422 snapped onto its lattice, 365.242203646, +1.2 s — that input left model-parameters.json at step 7c) | — |
| sidereal year (days, IAU) | 365.256363004 | `yearLengthRef.siderealYear` (astro-reference) | — |
| **LOD_mean** (the kinematic day ω₀, s) | 86400 | `yearLengthRef.solarDay` — the SI day (plan 09: was sidereal seconds over the H/13 kinematic sidereal days, 86,399.99968 s) | — |
| anomalistic year (days) | 365.259634985 | the one-family law of date at 2000 — the series' own apsidal rate 11.609 ″/yr on the sidereal year (plan 09 step 4d; the Simon 1994 mean element 365.259636 is a citation, 87 ms longer; before step 3 meanSolarYearDays · (H/16)/(H/16 − 1), 0.3 s low) | — |
| **p₀, the J2000 precession anchor** | 50.28796195 ″/yr (T_p = 25771.575 yr) | `earthOrbital.generalPrecessionJ2000_arcsecPerYr` — IAU 2006 p_A (plan 09: was the retired year combs' beat at 2000, 25,771.395 yr) | — |
<!-- /generated:calcmap-j2000-identities -->

The snap that used to sit in the second row — the input tropical year
(365.2422 d) rounded so that one eighth of H contained a whole number of
days, the "whole days per cycle" constraint the H fit satisfied — is gone
with the device's year means (plan 09): the J2000 year lengths are the
inputs, and "total days in H" is no longer an integer by construction (it
was Ledger 2's lattice-shaped constraint on the fitted H; the Step-0 Sun
fitter's lunar counts ride the real-valued product).

### 3.2 The year lengths of date — one family

| family | sidereal | tropical | anomalistic | H-role | code |
|---|---|---|---|---|---|
| **(B) the one-family route** (`model.yearLengths`) — THE SCENE'S FAMILY: the rendered Sun integrates its tropical year and turns with its frame and apsidal line, and the scene-sampled gate (`tools/verify/scene-year-lengths.js`) pins the measured sidereal, tropical and anomalistic years to it within 30 ms | D6 λ̇ channel | 1/T_trop = 1/T_sid + p/(360°·365.25 d), p the hybrid's general-precession rate (broken angle, per Julian year) | 1/T_anom = 1/T_trop − ϖ̇_eq/(360°·365.25 d), ϖ̇_eq the movement's own year-over-year apsidal advance against the equinox (the scene's perihelion; until 2026-09 the planet chain's secular tangent — seconds from the scene within a few millennia, 395 s at +25 kyr) | — | `earth/year-lengths.cjs` |
| the same years in DAYS of the epoch (`model.lengths.siderealYearDays` / `tropicalYearDays` / `anomalisticYearDays`; the browser's `*YearDaysOfDate`) | (B) ÷ the kinematic day of date | (B) ÷ the kinematic day of date | (B) ÷ the kinematic day of date (null beyond the one-family window) | — (P via the tidal chain's day) | `model/year-day-lengths.js` `dayLengthSeconds` |

The comb family (A) — three fitted combs, 12 + 6 + 8 lines on divisors of H
on tidal-chain bases carrying 13/H(t) and (H/16)/(H/16 − 1), with the
cardinal form (A′) — and its coefficients
(TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS, Ledger 3 of the parameter
accounting) are deleted at plan 09. They were fitted to the scene's own
solstice/equinox geometry (tools/fit README, Step 6c); "on the lattice" was
a property of the basis chosen, not a finding, and the comb carried no
secular drift (the tropical comb sat +1.09 s flat where the physical year
drifts −0.53 s/cy).

<!-- generated:calcmap-year-lengths-of-date -->
| year | sid, days of the epoch (`lengths.siderealYearDays`) | **sid one-family (SI d) — published** | trop, days of the epoch (`lengths.tropicalYearDays`) | **trop one-family (SI d) — published** | anom, days of the epoch (`lengths.anomalisticYearDays`) | **anom one-family (SI d) — published** |
|---|---|---|---|---|---|---|
| -10000 | 365.257354 | 365.256350 | 365.243550 | 365.242546 | 365.260158 | 365.259155 |
| -2584 | 365.256698 | 365.256358 | 365.242785 | 365.242445 | 365.259821 | 365.259481 |
| -584 | 365.256551 | 365.256360 | 365.242534 | 365.242343 | 365.259744 | 365.259553 |
| 0 | 365.256508 | 365.256361 | 365.242458 | 365.242310 | 365.259719 | 365.259571 |
| 1246 | 365.256418 | 365.256362 | 365.242293 | 365.242236 | 365.259668 | 365.259612 |
| 2000 | 365.256363 | 365.256363 | 365.242190 | 365.242190 | 365.259635 | 365.259635 |
| 5000 | 365.256134 | 365.256366 | 365.241781 | 365.242014 | 365.259498 | 365.259731 |
| 10000 | 365.255706 | 365.256371 | 365.241160 | 365.241826 | 365.259297 | 365.259962 |
<!-- /generated:calcmap-year-lengths-of-date -->

### 3.3 The day lengths

| quantity | formula | H-role | code |
|---|---|---|---|
| LOD kinematic of date | the tidal mean 2πI(t)/(L_EM − L_M) (chain 2.1 step 3) — exactly ω₀ = 86,400 s at J2000 (plan 09; the retired form was the tidal-tier year in seconds over the comb-family year in days, the comb's λ̇ ripple written as a day ripple) | — (P via the tidal chain) | `model/year-day-lengths.js` `dayLengthSeconds`; `deltat/deep-time.cjs` 80–86 |
| (measured solar day — DELETED, plan 09 step 5b) | was LOD kinematic + RA-day-offset(y)/1000 with the fitted comb −14.194 − 5.64·cos(phase₁₆) − 1.684·cos(phase₈) ms on the H/16 and H/8 counters — the equation of time's WINDOW term of the Framework-Verification instrument (365 noons from the June solstice end 0.2422 d short of the year; the two lines are the e·cos(90° − ϖ) and tan²(ε/2) terms of dEoT/dt at the solstice), a property of the window, not of the sky — docs/11 § "The retired RA day offset" | — | (deleted) |
| sidereal day | solar-year-seconds / (tropical-year-days + 1) | — | `model/one-source-movement.js` `siderealDaySeconds` |
| stellar day | sidereal day + the RA-projection term (solar-year/(days+1)/T_p(t)/(days+1))·cos ε — one extra rotation per precession turn, T_p(t) the composed lunisolar period (S5: its certified J2000 anchor past the chain's domain), not the counter H(t)/13 (7 µs slow) | **P** (rides T_p, none) | `model/one-source-movement.js` `stellarDaySeconds` |
| LOD with cycle corrections | tidal mean + the ΔT-stack cycle sum (Bond, Hallstatt, Jose5, Jose4 — fitted periods stated in years, amplitudes fitted; plan 06 T5 retired their former integer-divisor labels) | — (formerly **C**) | `deltat/deep-time.cjs` 187–193; `deltat/cycles.cjs` |

<!-- generated:calcmap-day-lengths -->
| year | LOD kinematic of date = the Layer-0 tidal mean (s) | sidereal day (s) | stellar day (s) |
|---|---|---|---|
| -10000 | 86399.76259 | 86163.8568 | 86163.8651 |
| -2584 | 86399.91956 | 86164.0136 | 86164.0219 |
| -584 | 86399.95491 | 86164.0455 | 86164.0539 |
| 0 | 86399.96506 | 86164.0620 | 86164.0704 |
| 1246 | 86399.98674 | 86164.0853 | 86164.0936 |
| 2000 | 86400.00000 | 86164.0917 | 86164.1001 |
| 5000 | 86400.05509 | 86164.1432 | 86164.1516 |
| 10000 | 86400.15740 | 86164.2546 | 86164.2630 |
<!-- /generated:calcmap-day-lengths -->

### 3.4 Findings from this chain — resolved

The audit's findings for this chain (the three fitted comb bases, deleted at plan 09; the goldens re-recorded on the one family) are archived.


## Chain 4 — the obliquity

One evaluator computes ε(t): the **hybrid** integrates one torque law on
the dynamical orbit plane of the N-body chain (zero fitted constants). The
engine places the Earth frame from the hybrid every frame (R4); the two
tilted wheels that once posed it were deleted at plan 11 step 4.

### 4.1 The obliquity's readers — one surface

The published obliquity of date is the hybrid (4.3) on every path. In the
browser the geometry callers — the eclipse sub-solar point, the conjunction
tier, the shadow machinery's RA/Dec conversions, the apparent Moon's RA/Dec,
the RA-projection panel and the cardinal panel's solstice-obliquity row —
read `_sceneEpsTargetDeg`, which is the hybrid at every epoch (the series
loader rebuilds the one-source history and drops the ε samplers, so the
deep mode table serves only until the series lands). In the package the
one surface is `model.earth.obliquityDeg` (the API's earth route and
cross-validation curves, the registry's obliquity keys, the lunar
arguments' obliquity-rate term and the eclipse tier). The stellar day's RA
projection (chain 3.3) takes the IAU J2000 obliquity input. The fitted
obliquity comb that preceded the hybrid, and the scene's wheel geometry it
was fitted to, are the record of [doc 109 §23.1](109-model-nbody-engine.md).

### 4.2 The scene's Earth frame — engine-placed

The scene's world frame is the J2000 ecliptic (`@essrt/physics`
`computeSceneWorldFrameJ2000`) and the engine PLACES the Earth frame every
update (`_applyEngineEarthFrame`, relative to the J2000 world frame
`computeSceneWorldFrameJ2000`): the axis is the hybrid's ŝ(t) on the ecliptic of
date; the perihelion pair hangs on Earth's pivot and is world-placed every
frame. The Sun's declination at the June solstice is the scene's ε.
H-role: —.

### 4.3 The hybrid — one torque law on the dynamical orbit plane

| step | formula | H-role | code |
|---|---|---|---|
| orbit normal n̂(t) | from Earth's ζ = sin(i/2)·e^{iΩ} modes (`nbody-deep-secular-modes.json`; era tier 8 terms, deep tier 16), JPL-seed anchored | — | `deep-orbital-history.cjs` 179–187 |
| spin-axis law | dŝ/dt = α(t)·(ŝ·n̂)·(ŝ×n̂), RK4, unit-renormalised each step | — | 273–290 |
| α(t) | ψ̇(t)/cos ε₀ × K_LUNI, ψ̇(t) = 2π/T_p(t) from the injected axial-precession evaluator — the composed lunisolar period `lunisolarPrecessionPeriodYearsAtAge` (chain 2.1 step 6; the comb pair's route A was deleted at plan 09; constant α when no evaluator is injected) | **P** (ψ̇(t) ∝ the composed rate) on the IAU p_A anchor (the same anchor as p₀) | 189–203, 272 |
| K_LUNI | the self-anchor: a ±0.5-yr probe of the integrated equinox rate at J2000 is corrected onto the target 360°/T_p(J2000); a ratio ≈ 1 with no new constant | — | 243–271 |
| ŝ(0) | built FROM n̂(0): tilt ε₀ (IAU 23.4392794°) about the equinox direction projected into the orbit plane — ε(J2000) ≡ ε₀ by construction, frame-invariant | — | 234–242 |
| ε(t) | acos(ŝ·n̂) | — | 298–316 (`sampleAt`); `tools/lib/deep-orbital-history.js` 161 (`epsDeg`) |
| surfaces | banked series inside ±10 Myr, α(t)-coupled integration on the ζ tail beyond (α on the composed ψ̇(t), plan 06 D6); the scene's `_epsHybridSeriesAt`; the Node one-source movement (`createOneSourceMovement`) | — | `script.js` 20771; `tools/lib/deep-orbital-history.js` 59–161 |

Inputs: ε₀ and T_p(J2000) only. Since S5 there is ONE α reading,
54.811 ″/yr = the J2000 rate p₀ / cos ε₀ (p₀ = p_A since plan 09; the registry's
`lunisolarTorqueConstantJ2000ArcsecPerYr`, the verdict artifact and the
hybrid's own K_LUNI target agree); the former 54.764 rode H/13 (50.245)
and is retired with it.

### 4.4 The obliquity beat — falsification leg 1

The pre-registered form is the beat **2π/(ψ̇(t) − |s₃|)** with s₃ the
dominant Earth ζ mode (the orbital side, dynamical under the measured solar
mass) and ψ̇(t) the spin precession. Plan 06 D6 (decided from finding 3
below) fixed WHICH ψ̇(t), Phase 3 made the unit follow it, and S5 anchored
it: the registry keys `obliqBeat*Kyr` evaluate ψ̇(t) = 1,296,000/T_p(t)
with T_p(t) the composed lunisolar period on the J2000 anchor
(25,771.6 yr, the IAU 2006 p_A input since plan 09; `meanLunisolarPrecessionPeriodYearsAtAge`, one home) — the
evaluator the hybrid's injection scales on, the tidal-clock table of 2.1
tabulates and the paleo-anchors gate rows `xiamaling-prec-1400` /
`lantink-prec-2460` read. The deep chain's tidal-mean year pair beats at
T_p(t) counted in sidereal years, + 1 (plan 09 step 5d; it had beaten at the
retired unit's H(t)/13, 0.086 % apart — the 4.5 block asserts the identity
per row). The pre-Phase-3 reading on the frozen era clock's counter H_era/13
(pure spin scaling, missing the lunar 1/a³ growth) is retired with the
clock. The alternative
`obliqPrecScaled*Kyr` is the "obliquity period ∝ T_p" reading —
the J2000 beat held proportional to T_p(t), identical to the beat today —
carried for the discrimination (D8 iii); S5 retired its former T_p·13/8
(= H/8) form.

### 4.5 Live values — the spreadsheet check

Obliquity by the three routes, ±50 kyr (La2004 on its 1-kyr grid; the
hybrid and the K law at the exact years):

<!-- generated:calcmap-obliquity-values -->
| year | ε hybrid (°) | ε La2004 (°) | hybrid − La2004 (″) |
|---|---|---|---|
| -48000 | 24.41105 | 24.41134 | -1 |
| -28000 | 22.23036 | 22.22990 | 2 |
| -20000 | 22.80514 | 22.80525 | -0 |
| -10000 | 24.15890 | 24.15921 | -1 |
| -2584 | 23.98229 | — | — |
| -584 | 23.76559 | — | — |
| 0 | 23.69481 | 23.69494 | -0 |
| 1246 | 23.53705 | — | — |
| 2000 | 23.43928 | 23.43929 | -0 |
| 5000 | 23.06397 | 23.06390 | 0 |
| 10000 | 22.65350 | 22.65342 | 0 |
| 20000 | 23.06276 | 23.06303 | -1 |
| 30000 | 23.90871 | 23.90927 | -2 |
| 50000 | 22.60696 | 22.60721 | -1 |

dε/dt at J2000 (″/cy): hybrid series -46.79 (the published ε, S3b) · IAU 2006 -46.84 · banked verdict integrations: era-tier ζ -48.00, full-tier ζ -38.91 (data/obliquity-hybrid-verdict.json).
α at J2000 (″/yr): p₀/cos ε₀ = 54.811 with p₀ = the IAU 2006 general precession p_A (plan 09 — the form the registry and the shipped hybrid use) · 54.811 in the verdict artifact (ψ̇ = the of-date beat 50.288 ″/yr) — the two J2000 precession readings of chain 2, finding 2.
Banked window rms vs La2004 (″), hybrid on the series / the same hybrid on the 18-mode table: ±13 kyr 50 / 530 · ±50 kyr 427 / 389 · ±130 kyr 488 / 381 · ±270 kyr 490 / 453 (era-tier ζ). La2004 is a THEORY reference, not an observation.
<!-- /generated:calcmap-obliquity-values -->

The beat at the deep anchors, both ψ̇ readings:

<!-- generated:calcmap-obliquity-beat -->
| age (Ma) | **T_p(t) = 1,296,000/ψ̇, the composed period (yr)** | the deep chain’s year beat T_sid/(T_sid − T_trop) — T_p counted in sidereal years, + 1 (plan 09 step 5d; it was the unit’s H(t)/13, 0.086 % apart) | ψ̇ (″/yr) | beat 2π/(ψ̇ − \|s₃\|) (kyr) — the SHIPPED `obliqBeat*Kyr` form | beat(J2000)·T_p(t)/T_p(J2000) (kyr) — "obliquity period ∝ T_p", `obliqH8Scaled*Kyr` |
|---|---|---|---|---|---|
| 0 | **25771.575** | 25772.126 | 50.288 | 41.22 | 41.22 |
| 380 | **21235.375** | 21237.506 | 61.030 | 30.73 | 33.97 |
| 650 | **18435.129** | 18438.036 | 70.301 | 25.19 | 29.49 |
| 1400 | **14976.924** | 14981.563 | 86.533 | 19.15 | 23.96 |
| 2460 | **11863.274** | 11869.497 | 109.245 | 14.34 | 18.98 |

s₃ = the dominant Earth ζ mode of data/nbody-deep-secular-modes.json = -18.8506 ″/yr (amplitude 0.00832); beat = 1,296,000/(ψ̇ᵢₙ − |s₃|) yr at an instant, ψ̇ᵢₙ the spin axis’s inertial rate; a RECORD sees the window mean of the pole rate with its of-date factors (createModel().lunisolar.spinAxisInertialRateMeanArcsecPerYr / obliquityPeriodRealizedYears — the obliquity lines ride the LR04-window mean, v23.0). Plan 06 D6 → Phase 3 → S5: ψ̇(t) is the composed lunisolar rate on the model’s one J2000 reading (T_p(J2000) = 25771.6 yr, 1,296,000/p_A on the IAU 2006 input since plan 09). The third column is the deep chain’s tidal-mean year pair: since plan 09 step 5d its tropical year removes one equinox turn per T_p(t), so the pair’s beat is T_p(t) counted in sidereal years, + 1 (asserted per row); before it the pair beat at the retired unit’s H(t)/13, the calendar convention plan-06 D2 had kept as a named device, 0.086 % above the composed period. Registry keys `obliqBeatJ2000Kyr`/`obliqBeat1400MaKyr`/`obliqBeat2460MaKyr` are the fifth column; `obliqH8Scaled*Kyr` (name kept) is the sixth, the pure precession-scaling alternative "obliquity period ∝ T_p" — the J2000 beat held proportional to T_p(t), identical to the beat today and the discriminated alternative at depth (D8 iii; S5 retired its former T_p·13/8 = H/8 form). The pre-Phase-3 "structural" beat on H_era/13 is retired with the frozen era clock (plan 09 step 7a).
<!-- /generated:calcmap-obliquity-beat -->

### 4.6 Findings from this chain — resolved

The audit's findings for this chain (the hybrid against the retired obliquity device, the two tilted wheels deleted at plan 11, the beat's rate) were resolved at plans 06–11 and are archived.


## Chain 5 — the cardinal points and the clock

The four events of the year — March equinox (VE), June solstice (SS),
September equinox (AE), December solstice (WS) — and the record of the
phase counter every comb read (deleted, 5.1). **Plan 06 R1:** the absolute event instants
are the APPARENT crossings of the one certified Sun (`createModel().cardinal`
— Newton on λ_apparent = 0/90/180/270, aberration and the leading nutation
terms derived; the Sun's mean longitude integrates the one-source tropical
year, chain 1.1). The former device, the **frozen era clock**
(`createCardinalModel`, the §10 derived form in §5.2 below — DELETED with
its coefficients at plan 09 step 7a; §5.2 and §5.5 are its record), returned
event JDs from fitted coefficients frozen at the last spin-and-tides-side fit
(the fitters are retired, git 16d7c87f). THE
OBSERVATION-CLASS VERDICT (plan 06 I1, `tools/verify/sun-vs-horizons.js`
against JPL Horizons' own crossings over ±3000 yr, TT): the shipped instants
sit <!--v:cardinalVsHorizonsMeanMin-->−1.02<!--/v--> min from Horizons on average (sd <!--v:cardinalVsHorizonsSdMin-->1.01<!--/v--> min), within
a minute in 1000–3000 (<!--v:cardinalVsHorizonsMeanP1000Min-->−0.82<!--/v--> / <!--v:cardinalVsHorizonsMeanP2000Min-->0.38<!--/v--> min) and about two minutes early in
the ancient era (<!--v:cardinalVsHorizonsMeanM1000Min-->−1.82<!--/v--> min at −1000..0, <!--v:cardinalVsHorizonsMeanM2000Min-->−1.49<!--/v--> min at −2000..−1000) — the
size of the difference between two equinoxes of date: the model's (within
<!--v:equinoxVsVondrakMaxAbsArcsec-->7.9<!--/v-->″ of Vondrák et al. 2011 over the span, §2.3) and Horizons' own of-date
frame (IAU76/80, a long-term model beyond ±200 yr from 2000). The
retired device sat hours from the same reference (the gap table in §5.3:
4.5 h at 0 AD, 6.5 d at −10000). The **one-source cardinal structure** (`createCardinalStructure`)
returns the equation-of-centre layer — per-point year lengths, crossing
offsets, the e(t)-spread, the anomalistic year — from the N-body movement's
own e(t) and ϖ(t) with zero fitted constants; it deliberately carries no
absolute dates. The scene's panel rows are a third path (5.4).

### 5.1–5.2 The frozen era clock and its counter — the record

The cardinal instants ride the certified Sun (5.3–5.5); the fitted cardinal
clock that preceded them — its phase counter, its §10 derived form and the
coefficients' coupling to the parameter set they shipped with — is the record
of [doc 109 §23.2–23.3](109-model-nbody-engine.md).


### 5.3 The one-source cardinal structure — zero fitted constants

| step | formula | inputs | code |
|---|---|---|---|
| crossing offset Δt_X | −(T_mean/360°)·EoC(M_X), M_X ≈ λ_X − (ϖ(t) + 180°) − EoC(M_X) (one fixed-point pass; the +180° is the Sun's geocentric perigee — the missing half-turn once swapped VE↔AE, SS↔WS in TYPE) | e(t), ϖ(t) from the one-source sampler; T_mean(t) in SI seconds (a days-of-date year hides ~2,400 s of LOD-vs-SI bias at −300 kyr) | `one-source-structure.cjs` 70–100 |
| year length T_X | T_mean(y + ½) + Δt_X(y + 1) − Δt_X(y) — the exact DIFFERENCE form, never rate × span | step 1 | 102–110 |
| D6 correction | T_X × the planetary λ̇ ratio (≡ 1 at J2000) — year LENGTHS only; offsets and spreads stay raw | the λ̇ channel | `year-lengths.cjs` 103–110 |
| anomalistic year | T_mean(y + ½)·360/(360 − Δϖ_yr), Δϖ_yr the year-over-year advance of ϖ relative to the equinox (climatic precession) — no equation of centre at perihelion by definition | ϖ(t) | 122–134 |
| spread | T_X − T_mean, ∝ e(t): ±48 s at e = 0.0167, ±138 s at e = 0.050, phased by perihelion's passage of each cardinal point | — | 140–150 |

Validated against the banked CSV: bias ~1 s / rms ~101 s on the year
lengths (the residual is the ecliptic-plane planetary-precession term the
closed form does not carry). **No H enters this device anywhere.**

### 5.4 The scene's panel — one source

| condition | dates and RA | year length | code |
|---|---|---|---|
| every epoch (plan 06 R4c) | the ONE home `createModel().cardinal.jdNearUT`, seeded at the displayed calendar year's midpoint; RA from `cardinal.raDeg` | the interval to the next crossing, `jdNearUT(seed + one tropical year) − jd` | `script.js` (the cardinal panel's `cpM.jdNearUT`); `computeSolsticeJD` / `computeSolsticeYearLength` delegate to `cardinal.jd` / `cardinal.yearLengthDays` |
| the former fit instrument | `solsticeForYear` — the Step 6a scene measurement the retired coefficients were fitted to; kept as an instrument | — | `script.js` `solsticeForYear` |

Before R4c the panel re-solved the events on the rendered scene, seeded by
the frozen device's JD and bridged to its adjusted anchors; the device and
both anchor sets are deleted (plan 09 step 7a).

### 5.5 Live values — the spreadsheet check

The retired device's last-render constants and its June-solstice decomposition — the static tables that stood here — are archived out of the tree; the device and its coefficients were deleted at plan 09 step 7a and the record is [doc 109 §23.2–23.3](109-model-nbody-engine.md). The shipped `cardinal.jd` is the apparent crossing of the one Sun.


The four events and the year lengths (live, generated):

<!-- generated:calcmap-cardinal-events -->
| year | VE | SS | AE | WS | SS→SS interval (d) | `yearLengthDays(SS)` (d, the crossing interval — the same quantity since R1) | mean of four (d) | one-family mean tropical year (s) | e |
|---|---|---|---|---|---|---|---|---|---|
| -10000 | -10000 03-19 12:22 | -10000 06-16 06:28 | -10000 09-13 14:45 | -10000 12-16 11:58 | 365.244435 | 365.244435 | 365.243550 | 31556957.03 | 0.01964 |
| -2584 | -2584 03-21 18:02 | -2584 06-23 22:08 | -2584 09-22 04:19 | -2584 12-19 16:15 | 365.243911 | 365.243911 | 365.242785 | 31556947.70 | 0.01835 |
| -584 | -584 03-21 04:50 | -584 06-23 08:32 | -584 09-23 08:01 | -584 12-20 20:20 | 365.241643 | 365.241643 | 365.242534 | 31556938.72 | 0.01770 |
| 0 | 0 03-20 15:53 | 0 06-22 15:02 | 0 09-23 01:49 | 0 12-20 18:26 | 365.243502 | 365.243502 | 365.242458 | 31556935.80 | 0.01749 |
| 1246 | 1246 03-20 13:54 | 1246 06-21 20:44 | 1246 09-23 03:40 | 1246 12-21 11:33 | 365.240335 | 365.240335 | 365.242293 | 31556929.30 | 0.01701 |
| 2000 | 2000 03-20 07:35 | 2000 06-21 01:48 | 2000 09-22 17:28 | 2000 12-21 13:37 | 365.242508 | 365.242508 | 365.242190 | 31556925.25 | 0.01670 |
| 5000 | 5000 03-20 08:45 | 5000 06-18 19:07 | 5000 09-20 11:54 | 5000 12-21 15:35 | 365.247245 | 365.247245 | 365.241781 | 31556909.69 | 0.01533 |
| 10000 | 10000 03-16 15:10 | 10000 06-13 23:44 | 10000 09-12 15:25 | 10000 12-14 22:22 | 365.239228 | 365.239228 | 365.241160 | 31556893.07 | 0.01261 |

Dates on the proleptic Gregorian calendar from the TRUE-UT JD of the APPARENT crossing of the one Sun (since plan 06 R3 item 2 the finder-axis root minus the deltaTStart bridge — before it the published instants were 0.9 min late) (plan 06 R1 — formerly the retired device's JD); the `year` argument is the calendar year of the event. The single-year intervals carry nutation and the short-period terms (they match Meeus ch. 27's successive instants to seconds); the mean tropical year is the one-family column.
<!-- /generated:calcmap-cardinal-events -->

The e(t)-spread by both devices, the anomalistic year, the RA:

<!-- generated:calcmap-cardinal-spread -->
| year | crossing intervals: T_X − mean (s) VE · SS · AE · WS | one-source structure: T_X − mean (s) VE · SS · AE · WS | structure anomalistic year (s) | RA of VE (°) — the target by construction since R1 | e |
|---|---|---|---|---|---|
| -10000 | 396.7 · 76.5 · -348.2 · 25.9 | 7.8 · 55.0 · -6.2 · -56.7 | 31558390.96 | 0.0000 | 0.01964 |
| -2584 | 356.2 · 97.3 · 404.9 · -63.9 | -48.1 · -25.1 · 47.2 · 26.0 | 31558419.19 | 0.0000 | 0.01835 |
| 0 | 55.3 · 90.2 · 25.2 · 169.5 | -15.0 · -50.5 · 16.0 · 49.4 | 31558426.97 | 0.0000 | 0.01749 |
| 2000 | 400.5 · 27.4 · -734.8 · -274.6 | 16.0 · -48.6 · -14.9 · 47.5 | 31558432.46 | 0.0000 | 0.01670 |
| 5000 | 218.1 · 472.1 · -195.4 · -117.2 | 44.2 · -15.0 · -45.0 · 15.8 | 31558440.74 | 0.0000 | 0.01533 |
| 10000 | 223.7 · -167.0 · -731.2 · -348.9 | 12.8 · 37.7 · -12.2 · -38.2 | 31558460.72 | 0.0000 | 0.01261 |

Retired device's RA formula constants: the record left with the K-device scaffold (plan 11 step 4 — earthtiltMean, the inclination amplitude A and earthRAAngle = 2A − A²/ε̄ are deleted; git history carries them; the form was base − earthRAAngle/sin ε̄ + (A/sin ε̄)·(−sin 2π·3·c + sin 2π·8·c), base 0/90/180/270° for VE/SS/AE/WS). Since R1 the shipped RA is the target longitude by construction; the device itself is deleted (plan 09 step 7a).
<!-- /generated:calcmap-cardinal-spread -->

### 5.6 Findings from this chain — resolved

The audit's findings for this chain (the balanced-year origin, the device's inventory of the retired unit, the one-source cardinal structure as the successor) were resolved at plans 06–09 and are archived.


## Chain 6 — the planets' spin channel (plan 06 Phase 7)

The Earth channel (chain 2.3) composes ψ̇ from the solar and lunar torques
on the recession history. Chain 6 is the same question for the seven
planets: the precession constant from each planet's OWN quadrupole and spin
with its regular satellites, on the model's OWN orbit and orbit-plane
history. Engine: the orbital dynamics engine's chain and ζ tables + the
cited spin inputs. H-role: **—** (H does not enter; the retired device rows
were **L**).

### 6.1 The formula and its inputs

| step | formula | inputs | code |
|---|---|---|---|
| precession constant | α = (3/2)(n²/ω)(1 − e²)^(−3/2)·(J₂ + q)/(λ + l) | J₂ at its reference radius, λ = C/MR², ω from the signed IAU rotation rate (`astro-reference.json` `planetSpinPhysical`); n = 2π√((1 + μ)/a³) and e from the chain's J2000 anchor elements | `packages/physics/src/planets/spin-channel.cjs` `computePlanetPrecessionConstant` |
| satellite terms | q = ½Σ(m_i/M)(a_i/R)², l = Σ(m_i/M)(a_i/R)²(n_i/ω) | satellite GM and mean orbits (JPL SSD), M = the DE440 system GM minus the satellites; a_i at the same reference radius as J₂ | same |
| the spin | dŝ/dt = α(ŝ·n̂)(ŝ×n̂), ŝ(J2000) = the IAU pole × sign(ω) | the planet's deep ζ table anchored at the chain's J2000 plane; the IAU J2000 pole (ecliptic J2000 via ε₀) | `createPlanetSpinChannel` (RK4, 25-yr steps, ±10 Myr) |
| obliquity, rate, period | ε(t) = acos(ŝ·n̂); ψ̇ = −α cos ε(t); T = 2π/\|ψ̇\| | — | `obliquityDegAtYear`, `spinPrecessionRateArcsecPerYrAtYear`, `axialPrecessionPeriodYearsJ2000` |

Type: α and the J2000 rate are **B** (present-epoch); the band is a **C**
window statement over ±1 Myr. The moment of inertia's class travels with
the row: spin-inferred (a closure), gravity-constrained (a prediction),
interior-model (unmeasured).

### 6.2 Live values — the spreadsheet check

<!-- generated:calcmap-planet-spin -->
| planet | λ = C/MR² (class) | q | l | α ″/yr | ε₀ derived ° | ψ̇₀ ″/yr | T₀ yr | band ±1 Myr ° |
|---|---|---|---|---|---|---|---|---|
| mercury | 0.346 (spin-inferred) | 0.00e+0 | 0.00e+0 | 834.6774 | 0.034 | Cassini-locked (node rate) | — | — |
| venus | 0.337 (spin-inferred) | 0.00e+0 | 0.00e+0 | 44.6713 | 177.362 | 44.6240 | 29,043 | 177.23–178.52 |
| mars | 0.3644 (spin-inferred) | 1.17e-7 | 4.93e-7 | 8.3985 | 25.192 | -7.5997 | 170,532 | 13.12–34.56 |
| jupiter | 0.26393 (gravity-constrained) | 3.03e-2 | 2.63e-3 | 2.6497 | 3.120 | -2.6457 | 489,843 | 2.59–3.93 |
| saturn | 0.2181 (gravity-constrained) | 5.43e-2 | 2.82e-3 | 0.8625 | 26.731 | -0.7703 | 1,682,466 | 26.39–28.53 |
| uranus | 0.225 (interior-model) | 1.61e-2 | 2.44e-3 | 0.0466 | 97.770 | 0.0063 | 205,646,752 | 95.82–98.04 |
| neptune | 0.23 (interior-model) | 2.07e-2 | -4.68e-3 | 0.0139 | 27.848 | -0.0123 | 105,623,757 | 26.47–28.02 |
<!-- /generated:calcmap-planet-spin -->

### 6.3 Findings from this chain (to act on)

1. **Rate against rate.** A precession constant α is not a pole rate; the
   observable is ψ̇ = −α cos ε. A first comparison of α with Saturn's
   long-term pole rate read "+34 %" where rate-vs-rate reads +11 % at the
   gravity-constrained C/MR² and within 7 % inside the Ward–Hamilton band.
2. **The pole is the evaluated IAU expression, not its constant term.** The
   2015 Mars model writes the pole as a precession-cone centre plus a 1.59°
   circle; its constant terms alone put the obliquity at 23.9° against the
   IAU 25.19°. Neptune's constants are the mean pole (the channel's start),
   0.5° from the instantaneous tilt through the Triton nutation.
3. **Closures are not tests.** Where C/MR² was inferred from the measured
   precession (Mars, Venus, Mercury), reproducing the rate verifies the
   formula and the model's own a, e, n — not the moment. The predictions
   are Jupiter and Saturn.
