---
docVersion: 1.0
modelVersion: v26.4
coefficients: sha256:4af192da697c09a0
status: current
---

# 110 — The calculation map: every published quantity, traced to its formula, its code and its live value

**Purpose.** The model became hard for its own author to check. This document
is the audit's instrument: for each published quantity — chain by chain —
the inputs, the formula, the engine that owns it, its type, the code that
computes it (file:line) and its **live value**, written by
`tools/docs/render-calculation-map.mjs` from the same evaluators the model
runs (so a number here can never be stale; `npm run docs:tables` fails if
it is). The acceptance test is external: a chain counts as understood when
the owner reproduces its values in a spreadsheet from this page alone.

**The H-role column** (holisticuniverse plan 06 §3) is the audit's record.
It classified every place the retired fitted unit H (13.011 × the J2000
luni-solar precession period) entered a formula; since plan 09 (model
v24.0) H enters no formula, and the column says what each step's former
H entry was and where it went. The roles:

| role | meaning | disposition |
|---|---|---|
| **U** | a unit — H = 13.011 × T_p as a number, divisors as phase counters | DELETED at plan 09 (the counters at step 7a, the unit function at 7b, the J2000 constant and its inputs at 7c — `model-version.json` `_v24Note`) |
| **P** | physics by proxy — H(t) standing in for the tidal precession/spin history | re-expressed on T_p(t) / ω(t); H(t) left the physics at plan 09 step 7b |
| **C** | a comb basis — harmonics on integer divisors of H (or of its eightfold multiple) used as a fitting basis | every comb DELETED at plan 09 (steps 2–7a); the ΔT cycle stack and the L1 climate lines state their periods in years (plan 06 T1/T5) |
| **L** | a lattice claim — "X = H/n is structural" | retired; the K-device wheels that last carried the numbers as a recorded J2000 pose are deleted too (plan 11 step 4) |
| — | H does not enter | — |

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
| **mean-element offset** | Δϖ = <!--v:sunMeanOffsetPomArcsec-->+70.08<!--/v-->″, Δe = <!--v:sunMeanOffsetE-->+5.81e-6<!--/v--> added to the series for the SUN only — the 1890–2110 mean of (osculating − secular) EMB e and ϖ from the Horizons J2000 seed integrated as a nine-body system (the lab RK4, daily samples), the chain as the secular reference | the seed vectors, the chain, the lab derivative | P (fully derived; the JPL Sun sample is a validation only: all-phase sd 3.23″ → 1.59″, the former K law 1.58″) | — | eclipse Sun equation of centre, Besselian Sun distance, cardinal braid — the mean elements of the era (Simon 1994's 102.937°, 0.0167086 reproduced to 0.2″); the published Earth surface stays the secular series | `tools/verify/earth-osculating-offset.js` → `data/earth-osculating-mean-offset.json`; `model.js` `sunPerihelionDegAt` / `sunEccentricityAt` |
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
| 5 | Meeus E-factor, bounded | E(t) = e(t)/e₀ (≡ 1 at J2000); replaces 1 − 0.002516T − 0.0000074T²; every series term carrying M is multiplied by E, terms with 2M by E² | step 1 | `model.js` 936; `series.cjs` 180–181 |
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

### 1.4 Findings from this chain (to act on)

1. **doc 66 is stale on the carrier**: §Fundamental Arguments says the L′
   planetary carrier integrates "along the derived H/3 line" with
   K_PL = −2332 °/cy per e²; the code integrates the deep channel and
   derives K_PL from *its* J2000 slope (table 1.3). The budget numerator is
   the same; the in-window T² is matched by construction either way; the
   deep-time carrier differs. Fix the sentence; the code is right.
2. **The only H in this chain was a proxy — RESOLVED (plan 09 step 5c)**
   (step 7′): the month chain scaled the tropical month and the
   cycles-per-H with H(t) where the physics is the tidal precession
   history. The tropical month now removes one equinox turn per T_p(t), and
   the cycles-per-H and their H² scaling are deleted.
3. **Two J2000 anchors for one quantity** (JPL seed vs IAU element,
   7.8×10⁻⁶ apart) — a certification split, not a physics one, but the map
   must say which surface uses which; this chain does.

---

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
| 2 | Earth's moment-of-inertia factor α(t) | α_J2000 − alphaClimateScale·(L1(t) − L1(2000)) — the climate (GIA) modulation of I/MR²; α_J2000 = 0.330695 | the L1 climate formula | — (the L1 lines are the engine's own orbital lines + the 405-kyr family, `data/l1-physical-lines.json`, plan 06 T1; formerly **C**, integer-divisor lines) | `model.js` 156–166 (twins: `tools/lib/deep-time.js` 186–199) |
| 3 | day length LOD(t) | 2π·I(t) / (L_EM(t) − L_M(t)), I = α·M_E·R_E², L_M = m_M·√(GM_EM·a_M)·√(1 − e_M²) — angular-momentum conservation in the Earth–Moon system; L_EM constant inside the gated era, time-dependent beyond (the ocean-leak/thermal-pump solar channels) | steps 1–2; L_EM from Layer 0 (chain 1's √(1 − e_M²) factor) | — | `deltat/deep-time.cjs` 80–86; L_EM `layer0/derive-params.js` 63–64 |
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
| the hybrid's own α(t) — the precession constant of date | — | — | **P**: α(t) = ψ̇(t)/cos ε₀ with ψ̇(t) = 2π/T_p,composed(t), the injected `lunisolarPrecessionPeriodYearsAtAge` (plan 09 step 7b; Phase 3 had written it as T_p,J2000 · H(t)/H₀, the same number) — **times the two factors of date** (2.3): the solar torque at the eccentricity of date and J₂(t)/J₂₀ from the GIA channel, both exactly 1 at J2000 | `model.js` (the `oneSourceM` wiring); `deep-orbital-history.cjs` (`alphaAtGeneral`); `climate/l1-orbital.cjs` (`j2RatioAt`) |

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
composition lives in the **registry** (`tools/docs/model-values.mjs`, "the
two-engine composed precession") and in its instrument twin
`tools/explore/w3-precession-crosscoupling.mjs` — **not in the physics
package** (finding 2 below).

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

### 2.5 Findings from this chain (to act on)

1. **Three J2000 precession rates coexisted**: IAU 2006 50.2880 ″/yr
   (input), the of-date year-length beat 50.2883 (the S5-era dynamical
   value), and H/13 = 50.2450 (the structural clock AND, before S5, the
   composition's anchor p₀). Since plan 09 there is one — p_A. The 0.086 % gap
   (plan 06 test T3) has its attribution here: H_J2000 was fitted on the
   1246 AD perihelion–solstice alignment + the J2000 longitude of perihelion
   — the *perihelion-of-date* beat (H/16) — not on the axial rate. So the
   structural clock started 0.086 % slow at J2000 by construction of the
   fit, and doc 99's composition table inherited it ("50.2 vs IAU 50.29").
   **RESOLVED (plan 06 S5), re-anchored (plan 09).** Plan 06 S5 made the
   anchor the derived rate (the certified year combs' beat at 2000,
   25,771.4 yr); plan 09 deleted those combs and made p₀ the IAU 2006
   general precession p_A = 50.28796195 ″/yr (T_p = 25,771.575 yr, an input
   in astro-reference.json), one home (`certifiedAxialPrecessionJ2000Years`
   in `model.js`; its tools-lib/browser/website twins), read by the
   composed clock, the hybrid's self-anchor and every published face. The
   derived reading sat 8 ppm above p_A, and that 8 ppm was absorbing a
   sidereal-year input mismatch against DE441 (the Sun-vs-Horizons record
   gained a +1″ per millennium slope on p_A — a sidereal-year-input
   finding, not a precession one). "H = 13·T_p" is retired
   (H/T_p = 13.011, a fit constant). The calendar's "one turn per H/13"
   left too (plan 09 step 5d): the tropical year of date is the sidereal
   year less one equinox turn per the composed T_p(t) (2.1 step 7), and
   the kinematic day/year identities of chain 3 were deleted at step 3 (the
   J2000 day is the SI day, the years are the IAU inputs). Plan-06 D2 had
   kept the calendar convention as a named device; the 0.086 % it carried
   was 1.0 s of year at J2000 and 1.1 h of calendar at ±4 kyr.
2. **The physical rate has no home in the physics package — RESOLVED
   (D6/Phase 3).** The composition (2.3) lives in
   `earth/precession-composed`, built inside the deep-time factory;
   `lunisolarPrecessionRateArcsecPerYrAtAge` is its surface (the unit
   `hAtAge` was too, until plan 09 step 7b), and Phase 3 S3 published it as `model.lunisolar` — in periods
   and ratios, no unit and no integer: the mean period T_p and its rate,
   the composition's terms, the of-date beat, the apsidal period T_aps and
   the ratios T_aps/T_p and T_peri/T_p — with the panel's "Lunisolar Clock"
   folder and the registry's `lunisolar*` keys.
3. **H(t)'s deep-time content was ω(t) and nothing else — RESOLVED
   (Phase 3).** The former clock scaled with the day length only; the
   composition adds the lunar 1/a³ term, and at 650 Ma that is the
   difference between 58.6 and 67.8 ″/yr against Wu's 67.64. Phase 3 made
   the unit 13.011 composed periods; the spin-only form survived as the
   frozen era clock's counter `eraClockHAtAge` (2.1 step 5), a device
   convention with its own name, until plan 09 step 7a deleted it with the
   last comb, and step 7b deleted the unit. A former "spin-family period
   scales with H(t)" statement means "scales with the composed precession
   period" T_p(t), which the physics now reads directly.
4. **The α(t) step carried a comb — RESOLVED (plan 06 T1)** (2.1 step 2):
   the moment-of-inertia modulation evaluates the L1 climate formula, whose
   lines are now the engine's own orbital lines plus the 405-kyr family
   (`data/l1-physical-lines.json`, one home), not integer divisors.
5. **Two of-date precession evaluators, one name — RESOLVED (Phase 3
   S2).** Route (A) (the comb pair) and route (B) (the one-family hybrid
   route) were both called "the axial precession of date", agree at J2000
   by anchoring, and differ by 0.07 % at −10 kyr and 0.7 % at +10 kyr
   (table 2.4). Route (B) is the physics (the spin integrated against the
   engine's orbit) and is now THE published T_p(t): the API/MCP
   `axialPrecessionYears`, `model.epoch.axialPrecessionYearsAtYear`, the
   registry's precession keys, the panels — inside the banked tiers
   (±2 Myr, `ONE_FAMILY_WINDOW_YEARS`), with the composed lunisolar period
   on the same J2000 anchor beyond (the window named, as the rule
   requires). Route (A), the frozen era clock's comb pair, is DELETED at
   plan 09: the kinematic-day stack (chain 3.3) rides the tidal mean, and
   the lunar chain's (d′) rate completion rides the published period (M0(a)
   had measured a 3–15 min lunar-timing shift for that move; the eclipse
   and lunar records were re-baselined on it).

---

## Chain 3 — the year lengths and the day

Since plan 09 the J2000 year lengths are the IAU inputs on the SI day, and
the year lengths of date are the one-family route (chain 2.2 B) over the
kinematic day of date, the tidal chain's mean length of day. The certified
clock device's year-length comb family that lived here is deleted; its
record is kept below where a retired reading explains a present one.

### 3.1 The J2000 identities (model.js)

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
| the same years in DAYS of the epoch (`model.lengths.siderealYearDays` / `tropicalYearDays` / `anomalisticYearDays`; the browser's `*YearDaysOfDate`) | (B) ÷ the kinematic day of date | (B) ÷ the kinematic day of date | (B) ÷ the kinematic day of date (null beyond the one-family window) | — (P via the tidal chain's day) | `model.js` `dayLengthSeconds` |

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
| LOD kinematic of date | the tidal mean 2πI(t)/(L_EM − L_M) (chain 2.1 step 3) — exactly ω₀ = 86,400 s at J2000 (plan 09; the retired form was the tidal-tier year in seconds over the comb-family year in days, the comb's λ̇ ripple written as a day ripple) | — (P via the tidal chain) | `model.js` `dayLengthSeconds`; `deltat/deep-time.cjs` 80–86 |
| (measured solar day — DELETED, plan 09 step 5b) | was LOD kinematic + RA-day-offset(y)/1000 with the fitted comb −14.194 − 5.64·cos(phase₁₆) − 1.684·cos(phase₈) ms on the H/16 and H/8 counters — the equation of time's WINDOW term of the Framework-Verification instrument (365 noons from the June solstice end 0.2422 d short of the year; the two lines are the e·cos(90° − ϖ) and tan²(ε/2) terms of dEoT/dt at the solstice), a property of the window, not of the sky — docs/11 § "The retired RA day offset" | — | (deleted) |
| sidereal day | solar-year-seconds / (tropical-year-days + 1) | — | `model.js` `siderealDaySeconds` |
| stellar day | sidereal day + the RA-projection term (solar-year/(days+1)/T_p(t)/(days+1))·cos ε — one extra rotation per precession turn, T_p(t) the composed lunisolar period (S5: its certified J2000 anchor past the chain's domain), not the counter H(t)/13 (7 µs slow) | **P** (rides T_p, none) | `model.js` `stellarDaySeconds` |
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

### 3.4 Findings from this chain (to act on)

1. **The comb bases were three fitted Fourier series on divisors of H**
   (26 lines in all) sitting on tidal-chain bases — exactly role C: the
   numerics were certified (the goldens pinned them), the *lattice* wording
   around them was not earned by the fit. **DELETED (plan 09)** — the
   goldens re-recorded on the one family.
2. **The (A)/(B) family split is the same finding as chain 2's finding 5 —
   RESOLVED with it (Phase 3 S2), CLOSED at plan 09**: at ±10 kyr the two
   sidereal years differed by ~0.7 ms/day-equivalent (365.257068 vs
   365.256351 d at −10 kyr) — invisible in-era, decisive for which family
   is published. (B) is published (`model.yearLengths`, the seamed
   `epoch.*AtYear` surfaces, the registry's year and rate keys, the panels'
   year rows, and since plan 09 `model.lengths` in days of the epoch);
   (A)/(A′) no longer exist — the kinematic-day stack of 3.3 rides the
   tidal mean.
3. **The whole-days snap** (3.1) was the clearest example in the model of a
   lattice-shaped constraint on a fitted constant; it belongs in Ledger 2's
   statement of how H_J2000 was fitted, and is retired with the device's
   year means (plan 09).

---

## Chain 4 — the obliquity

One evaluator computes ε(t): the **hybrid** integrates one torque law on
the dynamical orbit plane of the N-body chain (zero fitted constants). The
scene itself carries a geometric construction — two tilted wheels — that
pose the Earth frame; the engine places the frame from the hybrid (R4).

### 4.1 The K law — deleted (plan 09)

The 16-harmonic solstice-obliquity comb on divisors of H (ε̄ +
Σₖ [s_k·sin φ_k + c_k·cos φ_k]; `SOLSTICE_OBLIQUITY_MEAN_FITTED` /
`SOLSTICE_OBLIQUITY_HARMONICS`, Ledger 3) was the frozen era device's
obliquity — a comb fitted to the scene's own solstice Sun declination
(4.2), RMSE 0.005″ to the wheel geometry and 1.27° off La2004 at −20 kyr.
Plan 09 routed every reader to the hybrid and deleted the record: the
browser's `computeObliquityEarth` and `OBLIQUITY_MEAN`, the Node engine's
`computeObliquityEarth`, the package's `obliquityCombDeg` and the eclipse
tier's `obliquityDegAt` (the besselian read the comb), the Python mirror's
`calc_obliquity`, and the two JSON keys. The stellar day's RA projection
(chain 3.3) now takes the IAU J2000 obliquity input (the comb's fitted mean
sat 0.014° lower — 2e-11 of the day). Git history carries the comb.

Phase 3 S3b routed the geometry callers that bypassed the scene target —
the eclipse sub-solar point, the conjunction tier, the shadow machinery's
RA/Dec conversions, the apparent Moon's RA/Dec, the RA-projection panel
and the cardinal panel's solstice-obliquity row — through
`_sceneEpsTargetDeg`, which is the hybrid at every epoch (the series
loader rebuilds the one-source history and drops the ε samplers, so the
deep mode table serves only until the series lands). In the package the
one surface is `model.earth.obliquityDeg` (the API's earth route and
cross-validation curves, the registry's obliquity keys, the lunar
arguments' obliquity-rate term and the eclipse tier).

### 4.2 The scene's tilt geometry — the device the comb was fitted to (deleted, plan 11 step 4)

The scene's J2000 pose composed two wheels: `earthObliquityPrecession`, a
retrograde wheel at the recorded period P₈ = 41,914.625 yr tilted by **A** =
`earthInvPlaneInclinationAmplitude`, and `earthPerihelionPrecession1`, tilted
by **−earthRAAngle** = −(2A − A²/ε̄), with the periods the recorded pose block
`earth.kDeviceWheelPeriodYears` and the phase `kDeviceWheelPhaseAtJ2000Cycles`.
Plan 11 step 4 deleted the wheels, the tilts and the block: the scene's world
frame is the J2000 ecliptic (`@essrt/physics` `computeSceneWorldFrameJ2000`),
the perihelion pair hangs on Earth's pivot and is world-placed every frame, and
the record of the retired RA formula below is text, not a live constant.

The Sun's declination at the June solstice is the scene's ε; the deleted K
comb (4.1) reproduced that declination to 0.005″, which is why its 8 and 16
lines were the wheels' own fundamentals and the other fourteen the wheel
composition's overtones. The in-browser "Verify Earth Parameters"
test (`verifyEarthParameters`, deleted at plan 11 step 2 with the scene
constants it tuned) searched the A that best matches the IAU
tropical-year references — the A-solve is a calibration of this geometry
against IAU, performed once, not a runtime loop. H-role: — (formerly **L**:
the 8 and 16 wheels were the structural claim in its purest form,
"obliquity cycle = H/8"; they are now a recorded pose).

Since plan 06 R4 the engine PLACES the Earth frame (`_applyEngineEarthFrame`,
relative to the J2000 pose `_kcDeriveFrameR`): the axis is the hybrid's ŝ(t)
on the ecliptic of date each update; the wheels still turn underneath but
set nothing observable.

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
`obliqH8Scaled*Kyr` (name kept) is the "obliquity period ∝ T_p" reading —
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

### 4.6 Findings from this chain (to act on)

1. **The hybrid reproduces La2004 to ≤ 4″ over ±50 kyr with zero fitted
   constants; the K law departed by up to 1.27° (−4564″ at −20 kyr).**
   Inside ±2.6 kyr the K comb stayed within 113″ — it was an era device, and
   its extrapolation was not obliquity physics. This was the numeric case for
   plan 06 Phase 3's retirement of the K obliquity device, and plan 09
   deleted it (4.1): the hybrid IS the model's obliquity; the comb was a
   bounded Fourier fit to the scene's wheel geometry (4.2), and "on the
   lattice" described the basis, not the sky. (La2004 is another theory; the
   agreement proves the calculation, not the physics — the falsifiable
   content is 4.4.)
2. **Four caller sites bypass the hybrid flag — RESOLVED (Phase 3 S3b).**
   The geometry callers (eclipse sub-solar point, conjunction tier, the
   shadow machinery, the apparent Moon's RA/Dec, the RA-projection panel,
   the solstice-obliquity row) now read `_sceneEpsTargetDeg`; the
   stellar-day RA projection rode the comb's fitted mean as part of the
   kinematic-day device until plan 09 moved it to the IAU J2000 obliquity
   input. In-era the change is ≤ 15″ at year 0 (≈ 0.5 km of sub-solar
   latitude), 33″ across the eclipse era (measured over the audit's 14,579
   obliquity calls) and 113″ at −2584; at deep time it is degrees. Measured
   before switching: the eclipse audit's recorded values do not depend on
   the obliquity source (every value reproduced with the hybrid substituted
   in the Node twin) — the residuals live in ecliptic longitude and time.
3. **The model carried two deep-time ψ̇(t) — RESOLVED by plan 06 D6.** As
   found, the published beat rode the structural ψ̇ (H(t)/13) while the
   tidal-clock table of chain 2.4 published the composed ψ̇, and they split
   at depth (at 2.46 Ga the beat read 24.9 kyr structural vs 15.1 kyr
   composed; the hybrid's α(t) also rode the structural route). Decided:
   the composed rate is the leg-1 ψ̇(t) — it is the textbook torque physics
   AND the rock's reading (Wu 2024 at 650 Ma; Meyers & Malinverno 2018 and
   Lantink 2022 now gate rows the structural clock fails by 24 % and 35 %).
   One home (`earth/precession-composed`), the hybrid's injections switched
   to it, `obliqBeat*Kyr` re-derived on it (4.4, 4.5). Phase 3 then made
   H(t) the unit — 13.011 composed periods at every epoch — so the
   hybrid's injection read period₀·H(t)/H₀ again, correct by definition,
   and the structural reading left the registry; plan 09 step 7b deleted
   the unit, and the injection reads T_p(t) directly. The two
   agree wherever (a₀/a_M)³ ≈ 1, so
   in-era values are untouched (the hybrid's period factor moves 0.02 % at
   ±1 Myr, 0.1 % at ±5 Myr).
4. **The J2000 obliquity rate depends on the ζ representation**: banked
   series −46.79, era-tier integration −48.00, full-tier −38.91 (the
   deleted K law read −46.82), IAU −46.84 ″/cy. The shipped series matches IAU to 0.04 ″/cy; the
   direct integrations do not — a note for anyone re-deriving the rate from
   the artifact rather than the series.
5. **The scene's obliquity pose is a geometric composition of two wheels**
   (4.2) — once the last place where "obliquity cycle = H/8" was
   structural. The wheels keep turning as the scene's scaffolding at the
   recorded pose periods (plan 09 step 7c), the axis follows the hybrid,
   and the presentation states the beat.

---

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

### 5.1 The clock — the phase counter every comb read (DELETED, plan 09 step 7a — the record)

The frozen era clock's counter was deleted with the last comb that read it
(the cardinal record, below). What it was, for the record:

| item | definition | H-role | code (last revision, git history) |
|---|---|---|---|
| the ∫dt/H_era table | cumulative ∫1/H_era over 10-kyr cells, TRAPEZOID rule, LINEAR interpolation, ±500 Myr, H_era = H₀·LOD/LOD₀ under the constant-moment-of-inertia α (the climate-modulated α integrates into a linear phase drift — measured ~18 s of cardinal JD); table zero at the cell nearest `startmodelYear` 2000.5; drift reference `startModelYearWithCorrection` = 2000.5 + correctionDays/mSY = 2000.4977 (two constants half a day apart). The grid survives as the deep calendar's and the pos table's (`phase/deep-calendar.cjs`). | **P** (H_era stands for ω(t)) + **U** | `phase/index.cjs` `createPhaseMachinery` |
| cyclesBetween(A, B, N) | N × (∫_A^B dt/H_era − j2000Drift), j2000Drift = ∫_A^{ref} dt/H_era − (ref − A)/H_J2000; the anchor identified by CALL SHAPE (R3): (anchor, movingYear, N) or (J2000, anchor, N) — the correction depends on the FIXED endpoint only, so the integrated count equalled the snapshot count at J2000 and kept its shape at depth | **U** (the count) | `phase/index.cjs`; the engines' `cyclesBetweenYears`, `model.js` `epoch.cyclesBetween` |
| the out-of-domain fallback | N·(B − A)/H_J2000 (the snapshot count) when the table was undefined (past the tidal-lock asymptote) | **U** | `model.js` |
| **the balanced year** | `perihelionalignmentYear` 1246.03125 − `temperatureGraphMostLikely` 14.5 × H/16 = **−302,635** — the phase origin of EVERY comb until plan 07 R10: the obliquity 16 lines, the year-length 26, the cardinal 92 sinusoids + 8 equation-of-centre orders + 26 joint sidebands, the RA-day-offset 2, the inclination line, the H/3 eccentricity line | **L** (an origin expressed as 14.5 perihelion-of-date cycles before the 1246 alignment — half-integer, so the θ₁₆ phase at 1246 is π) | `script.js` `BALANCED_YEAR_J2000_FIXED` (a scaffold pose anchor since) |

Plan 07 R10 had moved the phase origin to J2000: the former origin (the
"balanced year", −302,635) was part of the matched pair — every fitted
coefficient was produced against it — and it was moved by rotating every
(sin, cos) pair exactly (`tools/fit/reorigin-combs-j2000.mjs`, measured
bit-identical on every surface over ±300 kyr, deleted at step 7a with the
last comb), not by refitting. Plan 09 then deleted the combs family by
family (steps 2–6) and the counter itself at step 7a: `createPhaseMachinery`,
the engines' `cyclesBetweenYears` / `integralInverseHFromYears` /
`phaseAdvanceSnapshot`, `epoch.cyclesBetween`, the era clock's
`eraClockHAtAge` and its year twins, and the exporter's `Cycle` column. The
movement counts nothing in anchor units: the wheels turn uniformly at
recorded J2000 rates (step 5c), the Moon rides its chain, the calendar
integrates the tropical year of date (step 5d).

### 5.2 The frozen era clock — the §10 derived form (RETIRED from the runtime at plan 06 R1, DELETED with its coefficients at plan 09 step 7a — kept as the record; code columns name the last revision, git history)

    JD_X(Y)  = anchor_X + ΣT_trop(Y) + δ_X(Y) − δ_X(2000)
    ΣT_trop  = lincoef·(Y − 2000) + drift(Y) + Ih(Y)
    drift(Y) = ∫₂₀₀₀^Y [a(t) − mSY] dt,  a(t) = T_sid,tidal(t)/86400 · (1 − 13/H(t))
    Ih(Y)    = ∫₂₀₀₀^Y (tropical comb) dt in closed form, H(c) = h0 + h1·c INSIDE the integral
    δ_X(Y)   = Σ [s, c]·[sin, cos](2π·div·c)                      23 sinusoids per point
             + Σₙ e(t)ⁿ·[s, c]·[sin, cos](n·2π·16·c)              n = 1, 2 — the braid
             + Σ [s, c]·[sin, cos](order·λ_X − 2π·div·c)          26 joint sidebands, shared
    T_X(Y)   = the exact term-by-term derivative of JD_X (drift part in the real-LOD convention)

| step | what | inputs | H-role | code |
|---|---|---|---|---|
| anchor_X | the shipped J2000 event JD — "adjusted" = data-anchored at the K scene's measured 2000 event nearest the IAU instant (commit 6eb144df); matches USNO to the minute; table below | `CARDINAL_POINT_ANCHORS_ADJUSTED` | — | `cardinal/index.cjs` 198–203 |
| drift | composite Simpson on 2000-yr NODE SPACING (≥ 64 nodes) + the Euler–Maclaurin endpoint term; a(t) is the tidal-tier sidereal year with the kinematic 13/H(t) precession factor | `deep-time.cjs` T_sid(t), H(t) | **P** (H(t)) + **U/L** (the 13) | 108–127; `model.js` 459–464 |
| Ih | the tropical comb integrated with the fit's own linear H(c) = h0 + h1·c; minus the Euler–Maclaurin half-sample | `TROPICAL_YEAR_HARMONICS` (deleted at plan 09 — the record render below passes an empty comb, Ih ≡ 0), h0, h1 | **C + P** | 129–161 |
| sinusoids | δ_X on 2π·div·c, c = cycles since the balanced year (integrated) | `CARDINAL_POINT_HARMONICS` | **C** | 205–208 |
| equation-of-centre orders | e(t)ⁿ·[sin, cos](n·θ₁₆), e(t) the published series in the record's render (the fit rode the H/3 line, deleted at plan 09 step 6), θ₁₆ = 2π·16·c — the perihelion-OF-DATE phase the equation of centre is seen through; {order, sin, cos}, NOT sinusoids (read as H/16 + H/32 harmonics they are wrong by the whole ~1.78 d braid) | `CARDINAL_POINT_ECC_TERMS`, e(t) | **L** (the H/16 count for T_peri(t), which wanders — chain 2) | 209–217 |
| joint sidebands | phase order·λ_X − 2π·div·c, λ_X = 0/90/180/270° for SS/AE/WS/VE; COUNTER-rotating — the load-bearing minus sign (the co-rotating sense captures nothing, measured) | `CARDINAL_POINT_JOINT_TERMS` | **C** | 218–227 |
| self-correction | δ_X(2000) subtracted so JD_X(2000) ≡ anchor_X exactly | — | — | 173–196, 228 |
| T_X(Y) | the derivative: lincoef + [mSY_realLOD(t) − mSY] + comb − ½ comb′ + Σ k·(dc/dY)·[…] with dc/dY = 1/H(t); the equation-of-centre derivative rides de/dt of the one law | `meanHAtAgeMa`, `meanYearRealLodDays`, `eccentricityRateAt` | **P** | 238–298 |
| tropical year | mean of the four T_X (Σδ_X ≡ 0 cancels the braid) — the `tropicalYearDays` of chain 3.2 (A′) | — | — | 314–321 |
| RA of the point | base − earthRAAngle/sin ε̄ + (A/sin ε̄)·(−sin 2π·3·c + sin 2π·8·c) — zero fitted constants; describes where the SCENE puts the point | A, ε̄ | **L** (the 3 and 8 wheels) | 300–312 |

What the coefficients were fitted to: the K scene's own measured events
(Step 6a export — 335,318 events per type over the full H window, the
scene's Sun-declination extremum/zero-crossing instrument `solsticeForYear`,
`script.js` 36431), interior RMSE 0.23–0.37 min after the 8 %/side edge
trim, tropical-year class 0.002 s. A refit against the one-source movement
was MEASURED as a cross-family fit (interior RMS 8.8–16 min, equinox
anchors ±2 h off IAU) and rejected — tools/fit README "The frozen era
clock". FROZEN-CLOCK COUPLING: the coefficients were a certified artifact of
the parameter set they shipped with.

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

Constants and anchors of the frozen device — the LAST RENDER before the
device and its coefficients were deleted (plan 09 step 7a), kept as static
text; the two tables below no longer regenerate:

| quantity | value | what it is | H-role |
|---|---|---|---|
| phase origin of EVERY comb | 2000 (J2000) | plan 07 R10: the former fitted origin — `perihelionalignmentYear` 1246.03125 − 14.5 × H/16 = −302,635, "obliquity cycle position 14.5 of 16" — was rotated out of every (sin, cos) pair exactly (c0 = 0.908498525276082 anchor units, `tools/fit/reorigin-combs-j2000.mjs`); its inputs left the JSON | — (no offset counted) |
| meanSolarYearDays | 365.242203646102 | the whole-days snap of chain 3.1 | **L** |
| lincoef (d/yr) | 365.24218961601 | the fitted linear term of ΣT_trop — used VERBATIM (recomputing it from the 1-yr anchor injects a −12,276 s ramp) | — (fitted) |
| h0, h1 | 335317.4044, 27.571083 | H inside the Ih integral as h0 + h1·c (c = cycles since J2000; h0 absorbed h1·c0 at the re-origin): the fit's own linear H(c) | **P** |
| harmonic divisors (per point, 23 lines each) | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 22, 23, 24, 29, 40, 48 | δ_X sinusoids on 2π·div·c | **C** |
| equation-of-centre orders | 1, 2 (phase 2π·16·c; e(t) from the H/3 law) | e(t)ⁿ·[sin, cos](n·θ₁₆) — the braid; ~1.78 d amplitude | **L** (the perihelion-of-date phase counted as H/16) |
| joint sidebands (shared by the four points) | 26 terms, orders 1, 2 × divisors 20, 21, 25, 26, 27, 28, 30, 31, 33, 34, 35, 36, 37 | phase order·λ_X − 2π·div·c, λ_X = SS 0°, AE 90°, WS 180°, VE 270°; COUNTER-rotating (the load-bearing minus sign) | **C** |

| point | shipped anchor `CARDINAL_POINT_ANCHORS_ADJUSTED` (JD, date) | legacy base key `CARDINAL_POINT_ANCHORS` (JD, date) | shipped − legacy (h) |
|---|---|---|---|
| VE | 2451623.816651 (2000 03-20 07:36) | 2451623.737525 (2000 03-20 05:42) | 1.899 |
| SS | 2451716.575000 (2000 06-21 01:48) | 2451716.575000 (2000 06-21 01:48) | 0.000 |
| AE | 2451810.224091 (2000 09-22 17:23) | 2451810.304175 (2000 09-22 19:18) | -1.922 |
| WS | 2451900.065845 (2000 12-21 13:35) | 2451900.067346 (2000 12-21 13:37) | -0.036 |

USNO 2000 instants for comparison (UTC, minute precision — the registry `cardinalPointAnchors`, astro-reference, ONE home since R4d): VE 2451623.8160 (2000 03-20 07:35) · SS 2451716.5750 (2000 06-21 01:48) · AE 2451810.2271 (2000 09-22 17:27) · WS 2451900.0674 (2000 12-21 13:37). Plan 06 R1: NO runtime reads either fitted anchor set any more — the shipped instants are the apparent crossings of the one Sun (`createModel().cardinal`, delegated to by script.js and tools/lib); both fitted keys were deleted from the coefficients file with the device (plan 09 step 7a — the table above is their last render). (R4c closed the last reader: the simulator's cardinal panel had re-solved the events on the rendered scene and bridged them to the ADJUSTED set with a J2000 offset; it now reads `cardinal.jdNearUT` seeded at the displayed calendar year's midpoint — the model year and the calendar year part by 0.0078 d/yr, 114 yr at −5.34 Myr. R4d: the registry's VE/AE entries had been retired-device anchors 112 min off the USNO instants; corrected.)

The June-solstice JD decomposed term group by term group (the rebuild that
produced these columns was asserted bit-identical to the retired device
first; last render, static since step 7a):

| year | lincoef·(Y−2000) (d) | drift Simpson (d) | Ih (d) | Σ sinusoids − δ(2000) (d) | equation-of-centre orders (d) | joint sidebands (d) | JD_SS − anchor (d) | cycles since the balanced year, integrated | linear (Y − bY)/H |
|---|---|---|---|---|---|---|---|---|---|
| -10000 | -4382906.2754 | 0.02155 | 0.00000 | -0.15117 | 0.14919 | 0.00306 | -4382914.80512 | -0.0357871 | -0.0357870 |
| -2584 | -1674270.1972 | 0.00702 | 0.00000 | -0.06334 | 2.45885 | -0.00072 | -1674269.15292 | -0.0136707 | -0.0136706 |
| -584 | -943785.8180 | 0.00378 | 0.00000 | -0.01218 | 1.53588 | 0.00051 | -943784.71979 | -0.0077061 | -0.0077061 |
| 0 | -730484.3792 | 0.00288 | 0.00000 | -0.00315 | 1.19327 | 0.00055 | -730483.44893 | -0.0059645 | -0.0059645 |
| 1246 | -275392.6110 | 0.00105 | 0.00000 | 0.00396 | 0.43630 | 0.00027 | -275392.21117 | -0.0022486 | -0.0022486 |
| 2000 | 0.0000 | 0.00000 | 0.00000 | -0.00000 | -0.00000 | 0.00000 | 0.00012 | 0.0000000 | 0.0000000 |
| 5000 | 1095726.5688 | -0.00379 | 0.00000 | -0.05919 | -1.11617 | -0.00006 | 1095724.72184 | 0.0089468 | 0.0089468 |
| 10000 | 2921937.5169 | -0.00869 | 0.00000 | -0.13416 | -0.10746 | 0.00041 | 2921932.91384 | 0.0238580 | 0.0238580 |


| year | retired device − shipped crossing (min): VE · SS · AE · WS |
|---|---|
| -10000 | 12480.8 · 12315.4 · 12554.2 · 12729.6 |
| -2584 | 1966.2 · 1954.8 · 1919.3 · 1925.8 |
| -584 | 599.1 · 618.9 · 617.0 · 595.7 |
| 0 | 374.4 · 379.1 · 380.3 · 371.2 |
| 1246 | 51.5 · 60.2 · 62.9 · 64.0 |
| 2000 | 0.9 · -0.2 · -5.0 · -2.4 |
| 5000 | 932.7 · 961.6 · 962.1 · 937.1 |
| 10000 | 6055.1 · 6268.6 · 6566.0 · 6335.0 |

Plan 06 R1: this decomposition is the RETIRED device's (the record — its coefficients were deleted at plan 09 step 7a); the shipped `cardinal.jd` is the apparent crossing of the one Sun, and the second table is the measured gap between the two (the 2000 row is the anchor convention: the device was pinned to the USNO instants, the crossing carries the mean-longitude anchor L0 and aberration/nutation derived). The six component columns sum to the eighth exactly. Every term is zero at 2000 by construction — the self-correction δ_X(2000) pins the anchor.

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

### 5.6 Findings from this chain (to act on)

1. **The balanced year was −302,635, not 1246 — RESOLVED by plan 07 R10.**
   Every comb's phase origin sat 14.5 perihelion-of-date cycles (14.5 ×
   H/16 = 303,881 yr) before the alignment year; docs/20 named it only as
   "obliquity cycle position 14.5 (of 16)". It was a convention the
   coefficients were fitted under (matched pair); the origin is now J2000,
   the coefficients rotated exactly. The finding as first written: state it as a phase
   origin, not as a position in a structural cycle.
2. **Two anchor sets lived in the coefficients file — CLOSED (plan 06
   R1/R4c, deleted at plan 09 step 7a).** The adjusted
   `CARDINAL_POINT_ANCHORS_ADJUSTED` matched the USNO 2000 instants to the
   minute (SS exact; VE +1, AE −4, WS −2 min); the legacy base key
   `CARDINAL_POINT_ANCHORS` had its equinoxes 1.9 h off (VE −1.90 h,
   AE +1.92 h — a pre-refit year-label artefact). R1/R4c left no runtime
   reader, and both keys left the file with the device; the registry's
   `cardinalPointAnchors` (USNO, astro-reference) is the one home.
3. **Two independent constructions give the same e(t)-spread** — the
   fitted braid (5.2) and the closed-form equation of centre on the
   movement's e(t), ϖ(t) (5.3) agree to ~1–4 s across ±10 kyr (5.5). The
   structure needs no H at all: it is the Phase-3 successor for the
   year-length layer, and it already feeds `yearLengths.cardinal` and the
   anomalistic year. The absolute dates left the frozen device at plan 06
   R1: they are the apparent crossings of the one certified Sun.
4. **The device's H inventory** (the record): the ×16 count in the braid
   phase and in the anomalistic identity (L), the 13 in a(t) (U/L), H(t) in
   three places — the drift integrand, Ih's h0 + h1·c and the derivative's
   dc/dY (P) — and 92 + 26 comb lines on H divisors (C). All of it was
   deleted with the device at plan 09 step 7a.
5. **The device's year-length row and its event dates were in different
   day units by design**: T_X's drift part rode the real-LOD (days-of-date)
   convention while JD_X integrated SI days — 365.243888 vs 365.243182 d at −10000
   (61 s), equal at J2000 to the 118 ms fit-basis gap. A displayed rate
   must name its window; a displayed length must name its day.

---

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
