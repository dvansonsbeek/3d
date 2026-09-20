---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:3f803b0a4e2b0b3c
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

**The H-role column** (holisticuniverse plan 06 §3). Every place the
legacy constant H (`holisticyearLength`, 13 × the luni-solar precession
period) enters a formula is one of four things:

| role | meaning | disposition under plan 06 |
|---|---|---|
| **U** | a unit — H = 13 × T_p as a number, divisors as phase counters | stays in code (identifiers keep names); leaves presentation |
| **P** | physics by proxy — H(t) standing in for the tidal precession/spin history | re-expressed on T_p(t) / ω(t); H(t) becomes derived |
| **C** | a comb basis — harmonics on integer divisors of H (or of its eightfold multiple) used as a fitting basis | numerics stay; declared as a bounded Fourier basis |
| **L** | a lattice claim — "X = H/n is structural" | retired or restated as a J2000 reading / its physical form |
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
| **H/3 line** | e(t) = base′·(1 + cos θ(t)/2), θ = θ₀ + 2π·cycles(2000→t, divisor 3), base′ = e₀/(1 + cos θ₀/2), θ₀ = ϖ_ICRF(J2000) − 21.77° | e₀ = 0.01671022 (IAU, astro-reference), ϖ_ICRF(J2000) = 102.94719°, anchor 21.77° | K · L (the epoch-local tangent, 5 % era ≈ −2,600…+2,850) | **L** (H/3 phase counter — the "3" is a J2000 reading; plan 06 restates) | eclipse Sun equation of centre, Besselian Sun distance, cardinal braid — the certified CLOCK side only | `packages/physics/src/moon/ecc-channel.cjs` 60–90 |
| **banked series** | e = \|z(t)\| sampled from the same N-body run (`data/nbody-secular-series.json`, 2-kyr grid inside ±10 Myr; the mode table beyond) | the run itself | D · A | — | the scene's readouts, the Eccentricity Path exhibit, the FV charts | `src/script.js` `_sceneEccTargetAt`, `tools/lib/deep-orbital-history.js` |

The deep-mode channel and the H/3 line agree within ~8×10⁻⁵ across the
historical era and diverge beyond it (0.0034 vs 0.0079 at the 28,832 AD
minimum); the series and the mode table agree in-era and sit ~1×10⁻³ apart
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
| 7′ | the H entry point in this chain | the tropical month and the apsidal/nodal "cycles per H" scale with H(t) and H(t)²: `tropicalMonthSecondsAtAge` uses 13·M_sid/(H·T_yr); `apsidalCyclesOfDateAtAge` = N₀·(H(t)/H₀)² — H here is the tidal precession history by proxy | `meanHAtAge` | `month-chain.cjs` 140–176 — **H-role P**: re-express on T_p(t) (plan 06 Phase 3) |

### 1.3 Live values — the spreadsheet check

Rows are evaluated by the script from the deep channel exactly as steps 1–5
compose them (T = (year − 2000)/100; the of-date angles wrapped to 0–360°).

<!-- generated:calcmap-e-chain-values -->
| year | T (cy) | e — deep modes | e — H/3 law | E = e/e₀ | (g/g₀)^s_ϖ | (g/g₀)^s_Ω | I(T, s_ϖ) (cy) | I(T, s_Ω) (cy) | perigee ϖ of date (°) | node Ω of date (°) |
|---|---|---|---|---|---|---|---|---|---|---|
| 2000 | 0.00 | 0.0167024 | 0.0167102 | 1.000000 | 1.0000000 | 1.0000000 | 0.0000e+0 | 0.0000e+0 | 83.3531 | 125.0444 |
| 1246 | -7.54 | 0.0170702 | 0.0170341 | 1.022019 | 1.0000449 | 1.0000190 | -1.6991e-4 | -7.1859e-5 | 2.2982 | 308.5710 |
| -584 | -25.84 | 0.0178848 | 0.0178076 | 1.070788 | 1.0001477 | 1.0000625 | -1.9461e-3 | -8.2305e-4 | 52.1195 | 64.7180 |
| -2584 | -45.84 | 0.0186439 | 0.0186251 | 1.116238 | 1.0002479 | 1.0001048 | -5.9258e-3 | -2.5061e-3 | 15.6516 | 230.6990 |
| -10000 | -120.00 | 0.0202205 | 0.0212388 | 1.210629 | 1.0004693 | 1.0001984 | -3.4110e-2 | -1.4425e-2 | 182.9123 | 49.2984 |

Anchors the rows above use: e₀ (JPL J2000 seed, the deep channel's anchor) = 0.0167024357 · e(J2000) IAU (the H/3 law's anchor) = 0.01671022 · g₀ = (1 − e₀²)^(−3/2) = 1.0004186030 · ϖ̇₀ = LPR − MPR = 4069.0137287 °/cy · Ω̇₀ = LPR − FR = -1934.1362891 °/cy · s_ϖ = 2.407, s_Ω = 1.018.
<!-- /generated:calcmap-e-chain-values -->

The Δe² carrier's coefficient (step 6), derived — not a constant:

<!-- generated:calcmap-kpl -->
| term | value | where it comes from |
|---|---|---|
| T2_LP (Meeus L′ T² coefficient) | -0.0015786 °/cy² | Meeus Ch. 47 polynomial, literal |
| T2_LP_TIDAL = (−25.86″/cy²)/2 | -3.591667e-3 °/cy² | LLR tidal n̈/2 |
| t2obl = (J₂ figure + Lieske ṗ_A T²)/3600 | 3.621194e-4 °/cy² | astro-reference elpW1T2Decomposition: 0.1925 + 1.11113 ″/cy² |
| Δ(e²) per century at J2000 = e(+50 yr)² − e(−50 yr)² | -1.669874e-6 | the deep channel (the doc-66 value −2332 °/cy per e² was derived on the H/3 line's slope) |
| **K_PL = 2·(T2_LP − T2_LP_TIDAL − t2obl)/Δ(e²)** | **-1977.33 °/cy per e²** | arguments.cjs kPlValue() — the same budget numerator, the live channel's slope |
<!-- /generated:calcmap-kpl -->

The deep-time lunar periods (step 7), from the Node engine's month chain
(`tools/lib/deep-time.js` → `packages/physics/src/moon/month-chain.cjs`):

<!-- generated:calcmap-lunar-periods -->
| age (Ma) | sidereal month (d) | perigee period (yr) | node period (yr) | H(t) (yr) | (g/g₀)^s_ϖ | (g/g₀)^s_Ω |
|---|---|---|---|---|---|---|
| 0 | 27.321662 | 8.85038 | 18.59952 | 335317.0 | 1.0000000 | 1.0000000 |
| 0.002584 | 27.321651 | 8.84907 | 18.59837 | 335316.6 | 1.0001477 | 1.0000625 |
| 0.01 | 27.321621 | 8.84654 | 18.59613 | 335315.6 | 1.0004353 | 1.0001841 |
| 0.1 | 27.321253 | 8.82099 | 18.57354 | 335301.9 | 1.0033466 | 1.0014140 |
| 1 | 27.317580 | 8.81322 | 18.56805 | 335166.3 | 1.0043663 | 1.0018443 |
| 10 | 27.280854 | 8.78496 | 18.55722 | 333813.4 | 1.0089493 | 1.0037752 |
| 380 | 25.771659 | 9.38690 | 19.72031 | 282328.9 | 0.9994087 | 0.9997499 |
| 650 | 24.643977 | 9.81344 | 20.61884 | 248541.1 | 0.9996124 | 0.9998361 |
<!-- /generated:calcmap-lunar-periods -->

### 1.4 Findings from this chain (to act on)

1. **doc 66 is stale on the carrier**: §Fundamental Arguments says the L′
   planetary carrier integrates "along the derived H/3 line" with
   K_PL = −2332 °/cy per e²; the code integrates the deep channel and
   derives K_PL from *its* J2000 slope (table 1.3). The budget numerator is
   the same; the in-window T² is matched by construction either way; the
   deep-time carrier differs. Fix the sentence; the code is right.
2. **The only H in this chain is a proxy** (step 7′): the month chain scales
   the tropical month and the cycles-per-H with H(t) where the physics is
   the tidal precession history. Candidate for the first Phase-3
   re-expression — small, self-contained, and the plan-06 baseline fixture
   pins every value it must preserve.
3. **Two J2000 anchors for one quantity** (JPL seed vs IAU element,
   7.8×10⁻⁶ apart) — a certification split, not a physics one, but the map
   must say which surface uses which; this chain does.

---

## Chain 2 — the lunisolar precession: the Earth clock

This is the chain plan 06 turns on. The luni-solar precession of Earth's
spin axis is what the legacy constant H was a proxy for. The model computes
it in **three places** that must be read together: the *mean* tidal-tier
clock (2.1, where H(t) is derived from the day length), the *of-date*
precession period (2.2, a beat of the year lengths, driven by the hybrid's
own equinox motion), and the *torque composition* (2.3, the physical rate:
Earth's spin × the solar + lunar torques on the recession history).

### 2.1 The mean tidal clock — LOD(t) → ω(t) → H(t)

| step | quantity | formula | inputs | H-role | code |
|---|---|---|---|---|---|
| 1 | Moon distance a_M(t) | t ≤ jointMa: the calibrated quartic a₀·(1 + α₁t + α₃t³ + α₄t⁴) (Farhat 2022, LLR-anchored); beyond: monotone cubic Hermite through the regime knots to the Roche crossing at genesis (Driver 1½, regime-aware) | α₁, α₃, α₄; the knot table; a₀ = 384,399.07 km | — | `deltat/recession-history.cjs` 66–110 |
| 2 | Earth's moment-of-inertia factor α(t) | α_J2000 − alphaClimateScale·(L1(t) − L1(2000)) — the climate-lattice (GIA) modulation of I/MR²; α_J2000 = 0.330695 | the L1 climate formula | **C** (the L1 comb evaluates its integer-divisor lines) | `model.js` 156–166 (twins: `tools/lib/deep-time.js` 186–199) |
| 3 | day length LOD(t) | 2π·I(t) / (L_EM(t) − L_M(t)), I = α·M_E·R_E², L_M = m_M·√(GM_EM·a_M)·√(1 − e_M²) — angular-momentum conservation in the Earth–Moon system; L_EM constant inside the gated era, time-dependent beyond (the ocean-leak/thermal-pump solar channels) | steps 1–2; L_EM from Layer 0 (chain 1's √(1 − e_M²) factor) | — | `deltat/deep-time.cjs` 80–86; L_EM `layer0/derive-params.js` 63–64 |
| 4 | spin rate ω(t) | 2π / LOD(t) | step 3 | — | (implicit) |
| 5 | the frozen era clock's counter H_era(t) | **H_J2000 · LOD(t)/LOD_J2000** — pure spin scaling, the pre-Phase-3 "H/13 identity" | H_J2000 = 335,317 (the fitted primitive), LOD_J2000 = 86,399.99968 s (the kinematic day) | **L** — a DEVICE convention: the ∫dt/H phase table, the cardinal era clock and the year-length comb family were fitted against it and ship with it (plan 06 D8: two named counters) | `deltat/deep-time.cjs` `eraClockHAtAge` |
| 6 | **H(t), the unit** | **H_era(t) / [f_S + (1 − f_S)·(a₀/a_M(t))³]** — the internal unit, scaling WITH the composed lunisolar precession period: H(t)/T_p(t) = H₀/T_p(J2000) = 13.011 at every epoch — NOT 13 of them (S5); ψ̇(t) = p₀·[ω/ω₀]·[f_S + (1 − f_S)(a₀/a_M)³], p₀ = 1,296,000/T_p(J2000) | step 5; a_M(t) (step 1); f_S = 0.3165 from the shared constants (`derive-params`); T_p(J2000) = 25,771.4 yr, the certified year laws' beat at 2000 (2.2 route B) | **U** (the unit) on the composed physics of 2.3 | `deltat/deep-time.cjs` `hAtAge` (one formula home: `earth/precession-composed`) |
| 7 | tropical year of age | T_sid(t) · (1 − 13/H(t)) — the unit's CALENDAR convention: one turn per H(t)/13, which is 0.086 % from one turn per T_p(t) (S5 kept it unchanged so nothing certified moves — the deep JD↔year calendar and the kinematic day/year identities ride it; restating this tier on T_p is the Phase 6 / D2 decision) | step 6; T_sid(t) = T₀(1 − Δm)² (Driver 2) | **U/L** (the calendar's 13/H — a device convention, not a precession claim) | `deltat/deep-time.cjs` `tropicalYearSecondsAtAge` (the frozen clock's twin on H_era: `eraClockTropicalYearSecondsAtAge`) |

Plan 06 Phase 3 made the unit follow the composed physics of 2.3, and
the former step 5 is the frozen devices' own counter under its own name.
Numerically the two agree wherever (a₀/a_M)³ ≈ 1 (0.999995 at 26 kyr) and
split at depth (0.68 at 2.46 Ga); the frozen devices' coefficients keep
their counter, so nothing certified moves. **S5 (one J2000 precession
reading)** then anchored the composed rate on the model's own derived
J2000 period — 25,771.4 yr, the certified year laws' beat, IAU to 8×10⁻⁶
— instead of on H₀/13 = 25,793.6, and retired "H = 13·T_p" as a claim:
H₀ was fitted on the 1246 AD perihelion–solstice alignment (the
perihelion-of-date beat, finding 1), so H₀/13 is the fit anchor's reading,
0.086 % slow, and is not a period of anything the model computes (nor a
window mean: the published period averages 25,598 yr over ±26 kyr). The
unit and the clock scale together; their ratio 13.011 is a fit constant.
The `hAtAge` values did not move (the formula is unchanged); the composed
rate rose 0.086 % everywhere (paleo rows: +0.94 % / −3.68 % against
Xiamaling / Lantink, both inside tolerance).

### 2.2 The of-date precession period — TWO year-length beats

The model exposes two of-date precession evaluators. Both are
T_p = T_sid/(T_sid − T_trop) — the beat of the sidereal and tropical years
of date — but each reads a different pair of years, and they agree at
J2000 only (table 2.4, columns A and B).

| route | sidereal year of date | tropical year of date | H-role | code |
|---|---|---|---|---|
| **(A) the comb pair** — `model.epoch.axialPrecessionYearsAtYear` (the tweakpane identity) | base T_sid(t)/LOD(t) from the tidal chain + the SIDEREAL_YEAR_HARMONICS comb (6 lines on divisors of H) | base T_sid(1 − 13/H(t))/LOD(t) + the TROPICAL_YEAR_HARMONICS comb (12 lines) | **C + P** (fitted combs on H divisors; H(t) in both bases) | `model.js` 401–431, 559, 1194–1197 |
| **(B) the one-family route** — `model.yearLengths.axialPrecessionYearsAtYear` ("THE ONE HOME for the of-date year lengths") | the D6 λ̇ channel: massLossLaw(y)/lamDotRel(y), the engine's own banked mean-longitude drift | T_sid(y)·(1 − p(y)/360) with p(y) the year-over-year retrograde advance of the hybrid's equinox node (ŝ×n̂) — the lunisolar α-integration of ŝ against the engine's n̂(t), self-anchored so the realized J2000 rate equals 360/T_p,J2000 exactly | — | `earth/year-lengths.cjs` 60–97; `earth/sidereal-year-channel.cjs`; `earth/deep-orbital-history.cjs` 186–232, 315–345 |
| the hybrid's own α(t) at deep time | — | — | **P**: α(t) = ψ̇(t)/cos ε₀ with ψ̇(t) = 2π/(T_p,J2000 · H(t)/H₀) — H(t)/H₀ ≡ T_p,composed(t)/T_p,J2000 (Phase 3; since S5 the composed clock's p₀ IS this same T_p,J2000) | `model.js` 518–522; `deep-orbital-history.cjs` 192–200 |

At J2000 both read 25,771.40 yr = 50.2883 ″/yr — the IAU value (50.2879)
to 8×10⁻⁶. This is the model's ONE J2000 precession reading (S5): the
composed clock's anchor p₀, the hybrid's self-anchor target and every
published face (`lunisolar`, the registry, the panels) read it. H/13 reads
25,793.6 yr = 50.2450 ″/yr — the fit anchor's reading, retired as a period
(finding 1). Away from J2000 the two routes part (finding 5).

### 2.3 The torque composition — the physical rate

ψ̇(t) = [ω(t)/ω₀] · p₀ · ( f_S + (1 − f_S)·(a₀/a_M(t))³ ),  μ = 1

— the spin-and-tides side supplies ω(t) and a_M(t) (the recession
history), the orbital side the solar term; f_S is the solar share of the
J2000 torque. The
composition lives in the **registry** (`tools/docs/model-values.mjs`, "the
two-engine composed precession") and in its instrument twin
`tools/explore/w3-precession-crosscoupling.mjs` — **not in the physics
package** (finding 2 below).

<!-- generated:calcmap-torque-split -->
| term | value | formula / source |
|---|---|---|
| solar torque factor | 3.965677e-14 km³/s²/km³ | GM☉/AU³ · (1 − e_E²)^(−3/2), e_E = 0.01671022 (IAU J2000) |
| lunar torque factor | 8.565827e-14 | GM_M/a_M³ · (1 − e_M²)^(−3/2) · (1 − 1.5 sin² i_M), a_M = 384399.07 km, e_M = 0.054900489, i_M = 5.1573° |
| **f_S, the solar share** | **31.65 %** | sol/(sol + lun) — literature ≈ 31.6 % |
| p₀, the composition's J2000 anchor | 50.2883 ″/yr | 1,296,000 / T_p(J2000), the certified of-date year laws' beat at 2000 (route B, table 2.4) — the model's ONE J2000 reading (plan 06 S5; IAU 50.2879 to 8×10⁻⁶). The former 1,296,000/(H/13) = 50.2450 was the fit anchor's reading, 0.086 % slow |
| α = p₀ / cos ε₀ | 54.811 ″/yr | the hybrid's precession constant (ε₀ = 23.439279444444445°); literature ≈ 54.9 |
<!-- /generated:calcmap-torque-split -->

### 2.4 Live values — the spreadsheet check

The mean tidal clock and the composition, by age:

<!-- generated:calcmap-tidal-clock -->
| age (Ma) | a_M (km) | LOD (h) | ω/ω₀ = LOD₀/LOD | α (I/MR²) | H_era(t) = H₀·LOD/LOD₀ (yr) — the frozen era clock’s counter | (a₀/a)³ | **H(t), the unit (yr)** | **T_p = 1,296,000/ψ̇ (yr)** | ψ̇ (″/yr) | H(t)/T_p |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 384399 | 24.000 | 1.00000 | 0.330695 | 335317 | 1.0000 | **335317** | **25771.4** | 50.29 | 13.01121 |
| 0.01 | 384399 | 24.000 | 1.00000 | 0.330695 | 335316 | 1.0000 | **335316** | **25771.3** | 50.29 | 13.01121 |
| 0.1 | 384395 | 23.999 | 1.00002 | 0.330695 | 335309 | 1.0000 | **335302** | **25770.2** | 50.29 | 13.01121 |
| 1 | 384361 | 23.994 | 1.00025 | 0.330695 | 335235 | 1.0003 | **335166** | **25759.8** | 50.31 | 13.01121 |
| 10 | 384017 | 23.941 | 1.00246 | 0.330695 | 334495 | 1.0030 | **333813** | **25655.8** | 50.51 | 13.01121 |
| 100 | 380577 | 23.423 | 1.02464 | 0.330695 | 327252 | 1.0304 | **320583** | **24639.0** | 52.60 | 13.01121 |
| 380 | 369749 | 21.915 | 1.09513 | 0.330695 | 306189 | 1.1236 | **282329** | **21698.9** | 59.73 | 13.01121 |
| 650 | 358901 | 20.569 | 1.16679 | 0.330695 | 287384 | 1.2286 | **248541** | **19102.1** | 67.85 | 13.01121 |
| 1400 | 337532 | 18.482 | 1.29853 | 0.330695 | 258228 | 1.4771 | **194727** | **14966.1** | 86.60 | 13.01121 |
| 2460 | 322504 | 17.007 | 1.41122 | 0.330695 | 237607 | 1.6933 | **161207** | **12389.9** | 104.60 | 13.01121 |

T_p(t) is the composed lunisolar precession period on the model’s ONE J2000 reading — 1,296,000/ψ̇ with p₀ = 1,296,000/T_p(J2000) = 50.2883 ″/yr, T_p(J2000) the certified of-date year laws’ beat at 2000 (route B, 2.2; plan 06 S5) — `@essrt/physics/earth/precession-composed` built inside `deltat/deep-time.cjs`, one home: the hybrid precesses on it, the paleo-anchors gate checks the ψ̇ column. H(t) = H_era/[f_S + (1 − f_S)(a₀/a)³] is the internal UNIT (identifier `hAtAge`, plan 06 P4): it scales WITH T_p — the last column is constant, 13.01121 — but is NOT 13 periods: H₀ was fitted on the 1246 AD perihelion–solstice alignment (the perihelion-of-date beat), so H₀/13 = 25793.6 yr was the fit anchor’s reading, 0.086 % slow, and is not a period of anything the model computes (the "H = 13·T_p" claim is retired: docs/retired-record.md). H_era is the FROZEN era clock’s own phase convention (pure spin scaling), shipped with the frozen coefficients as a named device constant (D8: two named counters), not a physical claim. External readings for the ψ̇ column: IAU J2000 50.288 ″/yr (measured); Wu et al. 2024 at 650 Ma 67.64 ″/yr; Meyers & Malinverno 2018 at 1400 Ma 85.79 ± 2.72 ″/yr; Lantink et al. 2022 at 2460 Ma 108.6 ± 8.5 ″/yr (all three cyclostratigraphic inferences through an assumed astronomical model — theory-vs-inference, doc 99; the last two are gate rows `xiamaling-prec-1400` / `lantink-prec-2460`).
<!-- /generated:calcmap-tidal-clock -->

The of-date precession, by year (the hybrid's ε alongside, from the
one-source movement):

<!-- generated:calcmap-ofdate-precession -->
| year | T_p (A) comb pair (yr) — the frozen device | p (A) (″/yr) | **T_p (B) one-family (yr) — PUBLISHED** (`epoch.axialPrecessionYearsAtYear`, API/MCP) | p (B) (″/yr) | (A) − (B) (yr) | T_p composed (yr) — the deep-time clock, same J2000 anchor (S5) | ε, hybrid (°) |
|---|---|---|---|---|---|---|---|
| -10000 | 26293.30 | 49.2901 | **26462.34** | 48.9753 | -169.04 | 25771.3 | 24.15915 |
| -2584 | 26069.06 | 49.7141 | **26258.00** | 49.3564 | -188.94 | 25771.3 | 23.98231 |
| -584 | 25946.80 | 49.9484 | **26061.40** | 49.7287 | -114.60 | 25771.4 | 23.76559 |
| 0 | 25908.26 | 50.0227 | **25997.94** | 49.8501 | -89.68 | 25771.4 | 23.69483 |
| 1246 | 25823.50 | 50.1868 | **25857.85** | 50.1202 | -34.35 | 25771.4 | 23.53707 |
| 2000 | 25771.40 | 50.2883 | **25771.40** | 50.2883 | -0.00 | 25771.4 | 23.43928 |
| 5000 | 25571.19 | 50.6820 | **25446.49** | 50.9304 | 124.70 | 25771.4 | 23.06398 |
| 10000 | 25342.65 | 51.1391 | **25103.91** | 51.6254 | 238.74 | 25771.5 | 22.65355 |
<!-- /generated:calcmap-ofdate-precession -->

### 2.5 Findings from this chain (to act on)

1. **Three J2000 precession rates coexist**, and the map now shows all
   three: IAU 50.2879 ″/yr (input), the of-date year-length beat
   50.2883 (the dynamical value, table 2.4), and H/13 = 50.2450 (the
   structural clock AND the composition's anchor p₀). The 0.086 % gap
   (plan 06 test T3) has its attribution here: H_J2000 was fitted on the
   1246 AD perihelion–solstice alignment + the J2000 longitude of perihelion
   — the *perihelion-of-date* beat (H/16) — not on the axial rate. So the
   structural clock starts 0.086 % slow at J2000 by construction of the
   fit, and doc 99's composition table inherits it ("50.2 vs IAU 50.29").
   **RESOLVED (plan 06 S5).** The anchor IS the derived rate: p₀ =
   1,296,000/T_p(J2000) with T_p(J2000) the certified year laws' beat
   (route B, 25,771.4 yr), one home (`certifiedAxialPrecessionJ2000Years`
   in `model.js`; its tools-lib/browser/website twins), read by the
   composed clock, the hybrid's self-anchor and every published face. The
   third reading is gone from every surface; "H = 13·T_p" is retired
   (H/T_p = 13.011, a fit constant — `docs/retired-record.md`). H/13
   survives only as the unit's calendar convention (2.1 step 7) and in the
   kinematic day/year identities (chain 3) — device tier; plan-06 D2
   decided it stays a named device (relabel, not re-base: the 0.086 % is
   the anchor ratio, constant at every epoch beyond ±2 Myr).
2. **The physical rate has no home in the physics package — RESOLVED
   (D6/Phase 3).** The composition (2.3) lives in
   `earth/precession-composed`, built inside the deep-time factory; the
   unit `hAtAge` and `lunisolarPrecessionRateArcsecPerYrAtAge` are its
   surface, and Phase 3 S3 published it as `model.lunisolar` — in periods
   and ratios, no unit and no integer: the mean period T_p and its rate,
   the composition's terms, the of-date beat, the apsidal period T_aps and
   the ratios T_aps/T_p and T_peri/T_p — with the panel's "Lunisolar Clock"
   folder and the registry's `lunisolar*` keys.
3. **H(t)'s deep-time content was ω(t) and nothing else — RESOLVED
   (Phase 3).** The former clock scaled with the day length only; the
   composition adds the lunar 1/a³ term, and at 650 Ma that is the
   difference between 58.6 and 67.8 ″/yr against Wu's 67.64. The unit is
   now 13 composed periods (2.1 step 6); the spin-only form survives as
   the frozen era clock's counter `eraClockHAtAge` (2.1 step 5), a device
   convention with its own name, and the retired claim is recorded in
   `docs/retired-record.md`. Every "spin-family period scales with H(t)"
   statement now means "scales with the composed precession period".
4. **The α(t) step carries a comb** (2.1 step 2, role C): the
   moment-of-inertia modulation evaluates the L1 climate formula's
   integer-divisor lines. If test T1 retires the comb, this is one of its
   consumers.
5. **Two of-date precession evaluators, one name — RESOLVED (Phase 3
   S2).** Route (A) (the comb pair) and route (B) (the one-family hybrid
   route) were both called "the axial precession of date", agree at J2000
   by anchoring, and differ by 0.07 % at −10 kyr and 0.7 % at +10 kyr
   (table 2.4). Route (B) is the physics (the spin integrated against the
   engine's orbit) and is now THE published T_p(t): the API/MCP
   `axialPrecessionYears`, `model.epoch.axialPrecessionYearsAtYear`, the
   registry's precession keys, the panels — inside the banked tiers
   (±2 Myr, `ONE_FAMILY_WINDOW_YEARS`), with the unit's secular mean H(t)/13
   beyond (the window named, as the rule requires). Route (A) is the
   frozen era clock's device: it feeds the kinematic-day stack (chain 3.3)
   and anchors the lunar chain's (d′) rate completion (M0(a): moving that
   would shift lunar timing 3–15 min across the eclipse era), and is
   published nowhere else. Both stay pinned in the plan-06 baseline fixture.

---

## Chain 3 — the year lengths and the day

Where the fitted comb bases first appear. Everything here is the certified
clock device (the spin-and-tides side) except where the one-family route
(chain 2.2 B) supplies the of-date alternative.

### 3.1 The J2000 identities (model.js 86–98, 120)

<!-- generated:calcmap-j2000-identities -->
| quantity | value | formula | H-role |
|---|---|---|---|
| input tropical year (days) | 365.2422 | `inputmeanlengthsolaryearindays` (model-parameters.json) | — |
| **meanSolarYearDays** | 365.242203646102 | round(input · H/8) / (H/8) — snapped so H/8 = 41914.625 yr holds a WHOLE number of days (15,308,990) | **L** (the whole-days-per-cycle constraint of the H fit) |
| sidereal year (days, IAU) | 365.256363004 | `yearLengthRef.siderealYear` (astro-reference) | — |
| kinematic sidereal year (days) | 365.256364373822 | meanSolarYearDays · H/(H − 13) — one calendar turn per H/13, the unit's convention (S5: a device identity, 0.086 % from one turn per the published T_p) | **U/L** (the 13, device) |
| **LOD_mean** (the kinematic day, s) | 86399.999675974 | sidereal seconds / kinematic sidereal days — the FIRST of the three day lengths (SI 86,400 · LOD_mean · LOD_real 86,400.0014) | — |
| anomalistic year (days) | 365.2596323900 | meanSolarYearDays · (H/16)/(H/16 − 1) — one perihelion-of-date beat per H/16 | **L** (the 16) |
| **total days in H** | 122,471,920 | H · meanSolarYearDays — an INTEGER by construction of the snap above; the day-count invariant of doc 99 | **U** |
<!-- /generated:calcmap-j2000-identities -->

The snap in the second row is worth a plain sentence: the input tropical
year (365.2422 d) is rounded so that one eighth of H contains a whole
number of days. That is the "whole days per cycle" constraint the H fit
satisfied (doc 99's day-count invariant is an integer *by this
construction*). Under plan 06 it is a role-L item: a lattice-shaped
constraint on the comb unit, to be stated as such.

### 3.2 The year lengths of date — two families

| family | sidereal | tropical | anomalistic | H-role | code |
|---|---|---|---|---|---|
| **(A) the comb family** (`model.lengths`, the certified era device) | base T_sid(t)/LOD(t) + SIDEREAL comb | (A) base T_sid(1 − 13/H(t))/LOD(t) + TROPICAL comb (`tropicalYearDirectDays`); (A′) the certified cardinal form (`tropicalYearDays`): mean of the four cardinal-interval year lengths, each = lincoef + Δ(mSY) + the tropical comb − ½ its derivative + the cardinal harmonics' derivative + the eccentricity terms on the H/16 phase | base trop·(H/16)/(H/16 − 1) + ANOMALISTIC comb | **C** (three fitted combs, 12 + 6 + 8 lines on divisors of H, phase = div × cycles since the balanced year) + **P** (H(t) in the bases) + **L** (13 and 16 in the bases) | `model.js` 397–431, 553–559; `cardinal/index.cjs` 238–319 |
| **(B) the one-family route** (`model.yearLengths`) | D6 λ̇ channel | T_sid(1 − p/360), p from the hybrid's equinox | the mean-element construction on the chain's apsidal tangent, T_sid·360/(360 − ϖ̇) | — | `earth/year-lengths.cjs` 60–97 |

The comb coefficients live in `public/input/fitted-coefficients.json`
(TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS, rows [div, sin, cos]) — Ledger
3 of the parameter accounting. They were fitted to the scene's own
solstice/equinox geometry (tools/fit README, Step 6c); "on the lattice" is
a property of the basis chosen, not a finding.

<!-- generated:calcmap-year-lengths-of-date -->
| year | sid (A) comb (d) — device | **sid (B) one-family (d) — published** | trop (A) comb (d) — device | trop (A′) cardinal (d) — device | **trop (B) one-family (d) — published** | anom (A) comb (d) — device | **anom (B) one-family (d) — published** |
|---|---|---|---|---|---|---|---|
| -10000 | 365.257363 | 365.256351 | 365.243472 | 365.243472 | 365.242548 | 365.260631 | 365.259119 |
| -2584 | 365.256701 | 365.256357 | 365.242690 | 365.242689 | 365.242447 | 365.259970 | 365.259444 |
| -584 | 365.256552 | 365.256360 | 365.242475 | 365.242475 | 365.242345 | 365.259822 | 365.259527 |
| 0 | 365.256510 | 365.256361 | 365.242412 | 365.242412 | 365.242312 | 365.259780 | 365.259551 |
| 1246 | 365.256418 | 365.256362 | 365.242274 | 365.242274 | 365.242237 | 365.259689 | 365.259604 |
| 2000 | 365.256363 | 365.256363 | 365.242190 | 365.242190 | 365.242190 | 365.259633 | 365.259637 |
| 5000 | 365.256129 | 365.256365 | 365.241845 | 365.241845 | 365.242011 | 365.259399 | 365.259781 |
| 10000 | 365.255694 | 365.256373 | 365.241282 | 365.241282 | 365.241823 | 365.258963 | 365.260136 |

Comb divisors (the H-divisor harmonics each (A) family adds to its tidal-chain base): tropical 3, 5, 6, 8, 11, 13, 14, 16, 19, 22, 24, 27 · sidereal 3, 5, 8, 9, 16, 32 · anomalistic 3, 8, 9, 17, 18, 19, 20, 24 (phase = div × cycles since the balanced year).
<!-- /generated:calcmap-year-lengths-of-date -->

### 3.3 The day lengths

| quantity | formula | H-role | code |
|---|---|---|---|
| LOD kinematic of date | T_sid,mass-loss(t) / sidereal-year-days(A)(y) — the tidal-tier year in seconds over the comb-family year in days | C + P | `model.js` 433 |
| measured solar day | LOD kinematic + RA-day-offset(y)/1000; RA offset = −14.194 − 5.64·cos(phase₁₆) − 1.684·cos(phase₈) ms (fitted; phases on the H/16 and H/8 counters) | **C + L** | `model.js` 434–437, 577 |
| sidereal day | solar-year-seconds / (tropical-year-days(A′) + 1) | (inherits A′) | `model.js` 561–564 |
| stellar day | sidereal day + the RA-projection term (solar-year/(days+1)/(H(t)/13)/(days+1))·cos ε — one extra rotation per precession | **U/P** (the 13, H(t)) | `model.js` 566–575 |
| LOD tidal mean | 2πI(t)/(L_EM − L_M) (chain 2.1 step 3) | — | `deltat/deep-time.cjs` 80–86 |
| LOD actual | mean(t) × kinematic-sidereal-days(J2000) / sidereal-year-days(A)(y) — the comb ripple on the tidal mean | C | `deltat/deep-time.cjs` 198–205 |
| LOD with cycle corrections | tidal mean + the ΔT-stack cycle sum (Bond, Hallstatt, Jose5, Jose4 — cycles labeled as integer divisors of the eightfold unit, amplitudes fitted) | **C** | `deltat/deep-time.cjs` 187–193; `deltat/cycles.cjs` |

<!-- generated:calcmap-day-lengths -->
| year | LOD kinematic of date (s) | measured solar day (s) | RA day offset (ms) | sidereal day (s) | stellar day (s) | LOD tidal mean (s) | LOD actual (s) |
|---|---|---|---|---|---|---|---|
| -10000 | 86399.76319 | 86399.74183 | -21.358 | 86163.8552 | 86163.8635 | 86399.76311 | 86399.76352 |
| -2584 | 86399.92002 | 86399.90722 | -12.796 | 86164.0111 | 86164.0194 | 86399.91964 | 86399.92034 |
| -584 | 86399.95515 | 86399.94531 | -9.838 | 86164.0460 | 86164.0543 | 86399.95473 | 86399.95547 |
| 0 | 86399.96525 | 86399.95599 | -9.256 | 86164.0560 | 86164.0644 | 86399.96482 | 86399.96557 |
| 1246 | 86399.98686 | 86399.97831 | -8.554 | 86164.0775 | 86164.0858 | 86399.98643 | 86399.98718 |
| 2000 | 86400.00011 | 86399.99160 | -8.508 | 86164.0906 | 86164.0990 | 86399.99968 | 86400.00043 |
| 5000 | 86400.05536 | 86400.04449 | -10.866 | 86164.1455 | 86164.1539 | 86400.05497 | 86400.05568 |
| 10000 | 86400.15827 | 86400.14080 | -17.469 | 86164.2478 | 86164.2562 | 86400.15807 | 86400.15859 |
<!-- /generated:calcmap-day-lengths -->

### 3.4 Findings from this chain (to act on)

1. **The comb bases are three fitted Fourier series on divisors of H**
   (26 lines in all) sitting on tidal-chain bases — exactly role C: the
   numerics are certified (the goldens pin them), the *lattice* wording
   around them is not earned by the fit. Plan 06 P3 applies verbatim.
2. **The (A)/(B) family split is the same finding as chain 2's finding 5 —
   RESOLVED with it (Phase 3 S2)**: at ±10 kyr the two sidereal years
   differ by ~0.7 ms/day-equivalent (365.257068 vs 365.256351 d at
   −10 kyr) — invisible in-era, decisive for which family is published.
   (B) is published (`model.yearLengths`, the seamed `epoch.*AtYear`
   surfaces, the registry's year and rate keys, the panels' year rows);
   (A)/(A′) are the frozen era clock's device family (`model.lengths`),
   feeding the kinematic-day stack of 3.3 and nothing else.
3. **The whole-days snap** (3.1) is the clearest example in the model of a
   lattice-shaped constraint on a fitted constant; it belongs in Ledger 2's
   statement of how H_J2000 was fitted.

---

## Chain 4 — the obliquity

Two devices compute ε(t) and both are live. The **K law** is a fitted
16-harmonic comb on divisors of H (the spin-and-tides side's certified era
device; the flag-off scene path and several direct callers). The **hybrid**
integrates one torque law on the dynamical orbit plane of the N-body chain
(the default scene target since D1-revised; zero fitted constants). The
scene itself carries a third, geometric construction — two tilted wheels —
that the K comb was fitted to.

### 4.1 The K law — a fitted comb on divisors of H

| item | formula / value | H-role | code |
|---|---|---|---|
| ε(y) | ε̄ + Σₖ [s_k·sin φ_k + c_k·cos φ_k], 16 lines | **C** | `model.js` 326–334 (`obliquityDeg`); `script.js` 57964 (`computeObliquityEarth`) |
| phase φ_k | integrated: 2π·div_k × (cycles since the balanced year), H(t)-aware through `cyclesBetweenYears`; snapshot twin: 2π·t/(H/div_k) on the linear count (`obliquitySnapshotDeg`, the form the chain certification used) | **P** (H(t) in the count) + **L** (the divisors) | `model.js` 853–860 |
| ε̄ | `SOLSTICE_OBLIQUITY_MEAN_FITTED` = 23.453384071928113° | — (fitted) | `fitted-coefficients.json` |
| divisors | 2, 3, 5, 6, 8, 9, 11, 13, 14, 16, 17, 19, 22, 24, 27, 32 (`SOLSTICE_OBLIQUITY_HARMONICS`, rows [div, sin, cos]) | **L** | `fitted-coefficients.json` — Ledger 3 |
| what it was fitted to | the scene's own solstice Sun declination (4.2), RMSE 0.005″ — a fit of a comb to the scene's wheel geometry, not to an external record | — | `script.js` 57962 (header comment) |

Phase 3 S3b routed the geometry callers that bypassed the scene target —
the eclipse sub-solar point, the conjunction tier, the shadow machinery's
RA/Dec conversions, the apparent Moon's RA/Dec, the RA-projection panel
and the cardinal panel's solstice-obliquity row — through
`_sceneEpsTargetDeg`, which returns the hybrid whenever the series has
loaded and the K comb only as the pre-load fallback (plan 06 D5: the
`?hybridSpin=0` opt-out is gone). What still reads the comb by design is
the DEVICE tier: the kinematic-day stack (the stellar day's RA projection,
chain 3.3), the lunar ARGUMENTS' obliquity-rate term (a device-anchored
matched triple), the hybrid's own J2000 anchor ε₀, and the console
diagnostics that name the formula. In the package the same split is
`model.earth.obliquityDeg` (the hybrid — the API's earth route and
cross-validation curves, the registry's obliquity keys, the dashboard)
versus `model.earth.obliquityCombDeg` (the device).

### 4.2 The scene's tilt geometry — the device the comb was fitted to

The scene does not rotate Earth's axis by a number; it composes two wheels.
`earthObliquityPrecession` (`script.js` 6986–7007) is a retrograde wheel on
H/8 tilted by **A** = `earthInvPlaneInclinationAmplitude`;
`earthPerihelionPrecession1` (7009–7030) is a prograde wheel on H/16 tilted
by **−earthRAAngle**, with

    earthRAAngle = 2A − A²/ε̄      (`model.js` 106; `script.js` 1019 — derived, not adjustable)

The Sun's declination at the June solstice is the scene's ε; the K comb
(4.1) reproduces that declination to 0.005″, which is why its 8 and 16
lines are the wheels' own fundamentals and the other fourteen are the
wheel composition's overtones. The in-browser "Verify Earth Parameters"
test (39218) searches the A that best matches the IAU tropical-year
references — the A-solve is a calibration of this geometry against IAU,
performed once, not a runtime loop. H-role: **L** (the 8 and 16 wheels are
the structural claim in its purest form: "obliquity cycle = H/8").

Under the hybrid flag `_hybridTiltCorr` (10351–10361) wraps
`earth.rotationAxis` and rotates it onto the hybrid's ŝ(t) each update; the
wheels still turn underneath but no longer set the axis.

### 4.3 The hybrid — one torque law on the dynamical orbit plane

| step | formula | H-role | code |
|---|---|---|---|
| orbit normal n̂(t) | from Earth's ζ = sin(i/2)·e^{iΩ} modes (`nbody-deep-secular-modes.json`; era tier 8 terms, deep tier 16), JPL-seed anchored | — | `deep-orbital-history.cjs` 179–187 |
| spin-axis law | dŝ/dt = α(t)·(ŝ·n̂)·(ŝ×n̂), RK4, unit-renormalised each step | — | 273–290 |
| α(t) | ψ̇(t)/cos ε₀ × K_LUNI, ψ̇(t) = 2π/T_p(t) from the injected axial-precession evaluator (route A of chain 2.2 — the certified year-length machinery; constant α when no evaluator is injected) | **P** (ψ̇(t) ∝ the composed rate) on the derived T_p(J2000) anchor (S5: the same anchor as p₀) | 189–203, 272 |
| K_LUNI | the self-anchor: a ±0.5-yr probe of the integrated equinox rate at J2000 is corrected onto the target 360°/T_p(J2000); a ratio ≈ 1 with no new constant | — | 243–271 |
| ŝ(0) | built FROM n̂(0): tilt ε₀ (IAU 23.4392794°) about the equinox direction projected into the orbit plane — ε(J2000) ≡ ε₀ by construction, frame-invariant | — | 234–242 |
| ε(t) | acos(ŝ·n̂) | — | 298–316 (`sampleAt`); `tools/lib/deep-orbital-history.js` 161 (`epsDeg`) |
| surfaces | banked series inside ±10 Myr, α(t)-coupled integration on the ζ tail beyond (α on the composed ψ̇(t), plan 06 D6); the scene's `_epsHybridSeriesAt`; the Node one-source movement (`createOneSourceMovement`) | — | `script.js` 20771; `tools/lib/deep-orbital-history.js` 59–161 |

Inputs: ε₀ and T_p(J2000) only. Since S5 there is ONE α reading,
54.811 ″/yr = the derived J2000 rate 50.2883 / cos ε₀ (the registry's
`lunisolarTorqueConstantJ2000ArcsecPerYr`, the verdict artifact and the
hybrid's own K_LUNI target agree); the former 54.764 rode H/13 (50.245)
and is retired with it.

### 4.4 The obliquity beat — falsification leg 1

The pre-registered form is the beat **2π/(ψ̇(t) − |s₃|)** with s₃ the
dominant Earth ζ mode (the orbital side, dynamical under the measured solar
mass) and ψ̇(t) the spin precession. Plan 06 D6 (decided from finding 3
below) fixed WHICH ψ̇(t), Phase 3 made the unit follow it, and S5 anchored
it: the registry keys `obliqBeat*Kyr` evaluate ψ̇(t) = 1,296,000/T_p(t)
with T_p(t) the composed lunisolar period on the derived J2000 anchor
(25,771.4 yr; `meanLunisolarPrecessionPeriodYearsAtAge`, one home) — the
evaluator the hybrid's injection scales on, the tidal-clock table of 2.1
tabulates and the paleo-anchors gate rows `xiamaling-prec-1400` /
`lantink-prec-2460` read. The unit's tidal-mean year pair still beats at
H(t)/13 — the calendar device, 0.086 % apart (the 4.5 block tabulates both
and asserts each against its own home). The pre-Phase-3 reading on the
frozen era clock's counter H_era/13 (pure spin scaling, missing the lunar
1/a³ growth) is retired to `docs/retired-record.md`. The alternative
`obliqH8Scaled*Kyr` (name kept) is the "obliquity period ∝ T_p" reading —
the J2000 beat held proportional to T_p(t), identical to the beat today —
carried for the discrimination (D8 iii); S5 retired its former T_p·13/8
(= H/8) form.

### 4.5 Live values — the spreadsheet check

Obliquity by the three routes, ±50 kyr (La2004 on its 1-kyr grid; the
hybrid and the K law at the exact years):

<!-- generated:calcmap-obliquity-values -->
| year | ε hybrid (°) | ε K law (°) | ε La2004 (°) | hybrid − K law (″) | hybrid − La2004 (″) | K law − La2004 (″) |
|---|---|---|---|---|---|---|
| -48000 | 24.41100 | 24.14159 | 24.41134 | 970 | -1 | -971 |
| -28000 | 22.23035 | 23.47788 | 22.22990 | -4491 | 2 | 4493 |
| -20000 | 22.80567 | 24.07349 | 22.80525 | -4564 | 2 | 4566 |
| -10000 | 24.15915 | 24.52945 | 24.15921 | -1333 | -0 | 1333 |
| -2584 | 23.98231 | 24.01380 | — | -113 | — | — |
| -584 | 23.76559 | 23.77333 | — | -28 | — | — |
| 0 | 23.69483 | 23.69908 | 23.69494 | -15 | -0 | 15 |
| 1246 | 23.53707 | 23.53762 | — | -2 | — | — |
| 2000 | 23.43928 | 23.43934 | 23.43929 | -0 | -0 | 0 |
| 5000 | 23.06398 | 23.06503 | 23.06390 | -4 | 0 | 4 |
| 10000 | 22.65355 | 22.61823 | 22.65342 | 127 | 0 | -127 |
| 20000 | 23.06311 | 22.76933 | 23.06303 | 1058 | 0 | -1057 |
| 30000 | 23.90883 | 23.41005 | 23.90927 | 1796 | -2 | -1797 |
| 50000 | 22.60679 | 22.55623 | 22.60721 | 182 | -2 | -184 |

dε/dt at J2000 (″/cy): hybrid series -46.80 (the published ε, S3b) · K law -46.82 (the device) · IAU 2006 -46.84 · banked verdict integrations: era-tier ζ -48.00, full-tier ζ -38.91 (data/obliquity-hybrid-verdict.json).
α at J2000 (″/yr): p₀/cos ε₀ = 54.811 with p₀ = 1,296,000/(H/13) (the form the registry and the shipped hybrid use) · 54.811 in the verdict artifact (ψ̇ = the of-date beat 50.288 ″/yr) — the two J2000 precession readings of chain 2, finding 2.
Banked window rms vs La2004 (″), hybrid / fitted K law: ±13 kyr 50 / 711 · ±50 kyr 427 / 2721 · ±130 kyr 488 / 2243 · ±270 kyr 490 / 2919 (era-tier ζ). La2004 is a THEORY reference, not an observation.
<!-- /generated:calcmap-obliquity-values -->

The beat at the deep anchors, both ψ̇ readings:

<!-- generated:calcmap-obliquity-beat -->
| age (Ma) | **T_p(t) = 1,296,000/ψ̇, the composed period (yr)** | H(t)/13 (yr) — the unit’s calendar beat (device; 0.086 % apart, S5) | ψ̇ (″/yr) | H_era(t)/13 (yr) — the frozen clock’s counter, for the record | beat 2π/(ψ̇ − \|s₃\|) (kyr) — the SHIPPED `obliqBeat*Kyr` form | beat(J2000)·T_p(t)/T_p(J2000) (kyr) — "obliquity period ∝ T_p", `obliqH8Scaled*Kyr` |
|---|---|---|---|---|---|---|
| 0 | **25771.395** | 25793.615 | 50.288 | 25793.615 | 41.22 | 41.22 |
| 380 | **21698.896** | 21717.604 | 59.727 | 23553.014 | 31.71 | 34.71 |
| 650 | **19102.079** | 19118.548 | 67.846 | 22106.459 | 26.45 | 30.56 |
| 1400 | **14966.114** | 14979.018 | 86.596 | 19863.695 | 19.13 | 23.94 |
| 2460 | **12389.891** | 12400.573 | 104.601 | 18277.481 | 15.11 | 19.82 |

s₃ = the dominant Earth ζ mode of data/nbody-deep-secular-modes.json = -18.8506 ″/yr (amplitude 0.00832); beat = 1,296,000/(ψ̇ − |s₃|) yr. Plan 06 D6 → Phase 3 → S5: ψ̇(t) is the composed lunisolar rate on the model’s one J2000 reading (T_p(J2000) = 25771.4 yr, the certified year laws’ beat). The unit’s tidal-mean year pair still beats at H(t)/13 (third column) — that 13/H is the unit’s CALENDAR convention (the kinematic day/year identities, the deep JD↔year calendar), kept unchanged in S5 so nothing certified moves; it is not a precession claim (plan-06 D2 decided: that tier stays a named device — beyond ±2 Myr the calendar beat sits a constant 0.086 % above the composed period, the anchor ratio, so a re-base would buy nothing physical). Registry keys `obliqBeatJ2000Kyr`/`obliqBeat1400MaKyr`/`obliqBeat2460MaKyr` are the sixth column; `obliqH8Scaled*Kyr` (name kept) is the seventh, the pure precession-scaling alternative "obliquity period ∝ T_p" — the J2000 beat held proportional to T_p(t), identical to the beat today and the discriminated alternative at depth (D8 iii; S5 retired its former T_p·13/8 = H/8 form). The pre-Phase-3 "structural" beat on H_era/13 is recorded in docs/retired-record.md.
<!-- /generated:calcmap-obliquity-beat -->

### 4.6 Findings from this chain (to act on)

1. **The hybrid reproduces La2004 to ≤ 4″ over ±50 kyr with zero fitted
   constants; the K law departs by up to 1.27° (−4564″ at −20 kyr).**
   Inside ±2.6 kyr the K comb stays within 113″ — it is an era device, and
   its extrapolation is not obliquity physics. This is the numeric case for
   plan 06 Phase 3's retirement of the K obliquity device: the hybrid IS the
   model's obliquity; the comb is a bounded Fourier fit to the scene's wheel
   geometry (4.2), and "on the lattice" describes the basis, not the sky.
   (La2004 is another theory; the agreement proves the calculation, not the
   physics — the falsifiable content is 4.4.)
2. **Four caller sites bypass the hybrid flag — RESOLVED (Phase 3 S3b).**
   The geometry callers (eclipse sub-solar point, conjunction tier, the
   shadow machinery, the apparent Moon's RA/Dec, the RA-projection panel,
   the solstice-obliquity row) now read `_sceneEpsTargetDeg`; the
   stellar-day RA projection stays on the comb as part of the kinematic-day
   device. In-era the change is ≤ 15″ at year 0 (≈ 0.5 km of sub-solar
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
   H(t) the unit — 13 composed periods at every epoch (2.1 step 6) — so the
   hybrid's injection reads period₀·H(t)/H₀ again, now correct by
   definition, and the structural reading left the registry for
   `docs/retired-record.md`. The two agree wherever (a₀/a_M)³ ≈ 1, so
   in-era values are untouched (the hybrid's period factor moves 0.02 % at
   ±1 Myr, 0.1 % at ±5 Myr).
4. **The J2000 obliquity rate depends on the ζ representation**: banked
   series −46.79, era-tier integration −48.00, full-tier −38.91, K law
   −46.82, IAU −46.84 ″/cy. The shipped series matches IAU to 0.04 ″/cy; the
   direct integrations do not — a note for anyone re-deriving the rate from
   the artifact rather than the series.
5. **The scene's obliquity is a geometric composition of two H-divisor
   wheels** (4.2) — the last place where "obliquity cycle = H/8" is
   structural rather than a label. Under plan 06 the wheels keep turning as
   the scene's era scaffolding, the axis follows the hybrid, and the
   presentation states the beat.

---

## Chain 5 — the cardinal points and the clock

The four events of the year — March equinox (VE), June solstice (SS),
September equinox (AE), December solstice (WS) — and the phase counter
every comb in the model reads. Two devices compute the events. The **frozen
era clock** (`createCardinalModel`, the §10 derived form) returns absolute
event JDs and their exact derivative from fitted coefficients that are
frozen at the last spin-and-tides-side fit (the fitters are retired, git
16d7c87f). The **one-source cardinal structure** (`createCardinalStructure`)
returns the equation-of-centre layer — per-point year lengths, crossing
offsets, the e(t)-spread, the anomalistic year — from the N-body movement's
own e(t) and ϖ(t) with zero fitted constants; it deliberately carries no
absolute dates. The scene's panel rows are a third path (5.4).

### 5.1 The clock — the phase counter every comb reads

| item | definition | H-role | code |
|---|---|---|---|
| the ∫dt/H(t) table | cumulative ∫1/H over 10-kyr cells, TRAPEZOID rule, LINEAR interpolation, ±500 Myr; H(t) under the constant-moment-of-inertia α (the climate-modulated α integrates into a linear phase drift — measured ~18 s of cardinal JD); table zero at the cell nearest `startmodelYear` 2000.5; drift reference `startModelYearWithCorrection` = 2000.5 + correctionDays/mSY = 2000.4977 (two constants half a day apart — do not unify) | **P** (H(t) stands for ω(t)) + **U** | `phase/index.cjs` 55–100; `model.js` 285–300 |
| cyclesBetween(A, B, N) | N × (∫_A^B dt/H − j2000Drift), j2000Drift = ∫_A^{ref} dt/H − (ref − A)/H_J2000; the anchor is identified by CALL SHAPE (R3): (anchor, movingYear, N) or (J2000, anchor, N) — the correction depends on the FIXED endpoint only, so the integrated count equals the snapshot count at J2000 and keeps its shape at depth | **U** (the count) | `phase/index.cjs` 130–152 |
| the out-of-domain fallback | N·(B − A)/H_J2000 (the snapshot count) when the table is undefined (past the tidal-lock asymptote) | **U** | `model.js` 305–308 |
| **the balanced year** | `perihelionalignmentYear` 1246.03125 − `temperatureGraphMostLikely` 14.5 × H/16 = **−302,635** — the phase origin of EVERY comb: the obliquity 16 lines, the year-length 26, the cardinal 92 sinusoids + 8 equation-of-centre orders + 26 joint sidebands, the RA-day-offset 2, the inclination line, the H/3 eccentricity line | **L** (an origin expressed as 14.5 perihelion-of-date cycles before the 1246 alignment — half-integer, so the θ₁₆ phase at 1246 is π) | `model.js` 90–91; `script.js` 1029, 1035 (`BALANCED_YEAR_J2000_FIXED`) |

The balanced year is part of the matched pair: every fitted coefficient was
produced against this origin, so moving it re-phases all of them. docs/20
lists it as "Obliquity cycle position 14.5 (of 16)"; the registry key is
`balancedYear`.

### 5.2 The frozen era clock — the §10 derived form

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
| Ih | the tropical comb integrated with the fit's own linear H(c) = h0 + h1·c; minus the Euler–Maclaurin half-sample | `TROPICAL_YEAR_HARMONICS`, h0, h1 | **C + P** | 129–161 |
| sinusoids | δ_X on 2π·div·c, c = cycles since the balanced year (integrated) | `CARDINAL_POINT_HARMONICS` | **C** | 205–208 |
| equation-of-centre orders | e(t)ⁿ·[sin, cos](n·θ₁₆), e(t) the H/3 line (chain 1.1), θ₁₆ = 2π·16·c — the perihelion-OF-DATE phase the equation of centre is seen through; {order, sin, cos}, NOT sinusoids (read as H/16 + H/32 harmonics they are wrong by the whole ~1.78 d braid) | `CARDINAL_POINT_ECC_TERMS`, e(t) | **L** (the H/16 count for T_peri(t), which wanders — chain 2) | 209–217 |
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
clock". FROZEN-CLOCK COUPLING: the coefficients are a certified artifact of
the shipped parameter set.

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

### 5.4 The scene's panel — three sources for one row

| condition | dates and RA | year length | code |
|---|---|---|---|
| default (one-source movement on) | SOLVED from the rendered scene: Newton on the scene Sun's declination (equinoxes) / parabolic-vertex passes (solstices), SEEDED by the frozen device's JD, then shifted by a per-type constant = adjusted anchor − the scene's own year-2000 event (so 2000 reads the registry anchor) | difference of two solved JDs (the anchor shift cancels) | `script.js` 45320–45386, 57436–57457 |
| before the series has loaded (the former `?hybridSpin=0` opt-out is gone — plan 06 D5) | the frozen device (5.2) directly | `computeSolsticeYearLength` | 57458–57468 |
| the fit instrument | `solsticeForYear` — the Step 6a measurement the coefficients were fitted to | — | 36431 |

### 5.5 Live values — the spreadsheet check

Constants and anchors of the frozen device:

<!-- generated:calcmap-cardinal-anchors -->
| quantity | value | what it is | H-role |
|---|---|---|---|
| balanced year (phase origin of EVERY comb) | -302635.00000 | `perihelionalignmentYear` 1246.03125 − `temperatureGraphMostLikely` 14.5 × H/16 — 14.5 perihelion-of-date cycles before the 1246 alignment ("obliquity cycle position 14.5 of 16", docs/20) | **L** (the offset is counted in H/16 units) |
| meanSolarYearDays | 365.242203646102 | the whole-days snap of chain 3.1 | **L** |
| lincoef (d/yr) | 365.24218961601 | the fitted linear term of ΣT_trop — used VERBATIM (recomputing it from the 1-yr anchor injects a −12,276 s ramp) | — (fitted) |
| h0, h1 | 335292.3561, 27.571083 | H inside the Ih integral as h0 + h1·c (c = cycles since the balanced year): the fit's own linear H(c) | **P** |
| harmonic divisors (per point, 23 lines each) | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 22, 23, 24, 29, 40, 48 | δ_X sinusoids on 2π·div·c | **C** |
| equation-of-centre orders | 1, 2 (phase 2π·16·c; e(t) from the H/3 law) | e(t)ⁿ·[sin, cos](n·θ₁₆) — the braid; ~1.78 d amplitude | **L** (the perihelion-of-date phase counted as H/16) |
| joint sidebands (shared by the four points) | 26 terms, orders 1, 2 × divisors 20, 21, 25, 26, 27, 28, 30, 31, 33, 34, 35, 36, 37 | phase order·λ_X − 2π·div·c, λ_X = SS 0°, AE 90°, WS 180°, VE 270°; COUNTER-rotating (the load-bearing minus sign) | **C** |

| point | shipped anchor `CARDINAL_POINT_ANCHORS_ADJUSTED` (JD, date) | legacy base key `CARDINAL_POINT_ANCHORS` (JD, date) | shipped − legacy (h) |
|---|---|---|---|
| VE | 2451623.816651 (2000 03-20 07:36) | 2451623.737525 (2000 03-20 05:42) | 1.899 |
| SS | 2451716.575000 (2000 06-21 01:48) | 2451716.575000 (2000 06-21 01:48) | 0.000 |
| AE | 2451810.224091 (2000 09-22 17:23) | 2451810.304175 (2000 09-22 19:18) | -1.922 |
| WS | 2451900.065845 (2000 12-21 13:35) | 2451900.067346 (2000 12-21 13:37) | -0.036 |

USNO 2000 instants for comparison (UTC): VE Mar 20 07:35 · SS Jun 21 01:48 (`juneSolstice2000_JD`, astro-reference) · AE Sep 22 17:27 · WS Dec 21 13:37. The shipped set is the one every runtime reads (model.js, script.js, tools/lib); the legacy key is exported by the constants generator but consumed only by the archived fitter.
<!-- /generated:calcmap-cardinal-anchors -->

The June-solstice JD decomposed term group by term group (the rebuild
that produces these columns is asserted bit-identical to the shipped
device first):

<!-- generated:calcmap-cardinal-decomposition -->
| year | lincoef·(Y−2000) (d) | drift Simpson (d) | Ih (d) | Σ sinusoids − δ(2000) (d) | equation-of-centre orders (d) | joint sidebands (d) | JD_SS − anchor (d) | cycles since the balanced year, integrated | linear (Y − bY)/H |
|---|---|---|---|---|---|---|---|---|---|
| -10000 | -4382906.2754 | 0.02155 | -2.17476 | -0.15117 | 0.11758 | 0.00306 | -4382908.45913 | 0.8727114 | 0.8727115 |
| -2584 | -1674270.1972 | 0.00702 | -0.38503 | -0.06334 | 2.48830 | -0.00072 | -1674268.15097 | 0.8948279 | 0.8948279 |
| -584 | -943785.8180 | 0.00378 | -0.12539 | -0.01218 | 1.54218 | 0.00051 | -943784.40908 | 0.9007924 | 0.9007924 |
| 0 | -730484.3792 | 0.00288 | -0.07549 | -0.00315 | 1.19622 | 0.00055 | -730483.25822 | 0.9025340 | 0.9025340 |
| 1246 | -275392.6110 | 0.00105 | -0.01081 | 0.00396 | 0.43642 | 0.00027 | -275392.18008 | 0.9062499 | 0.9062499 |
| 2000 | 0.0000 | 0.00000 | 0.00000 | -0.00000 | 0.00000 | 0.00000 | -0.00000 | 0.9084985 | 0.9084985 |
| 5000 | 1095726.5688 | -0.00379 | -0.16868 | -0.05919 | -1.12411 | -0.00006 | 1095725.21303 | 0.9174453 | 0.9174453 |
| 10000 | 2921937.5169 | -0.00868 | -1.08615 | -0.13416 | -0.14045 | 0.00041 | 2921936.14789 | 0.9323565 | 0.9323565 |

The six component columns sum to the eighth exactly (the rebuild is asserted bit-identical to the shipped `cardinal.jd` before this table is written). Every term is zero at 2000 by construction — the self-correction δ_X(2000) pins the anchor.
<!-- /generated:calcmap-cardinal-decomposition -->

The four events and the year lengths:

<!-- generated:calcmap-cardinal-events -->
| year | VE | SS | AE | WS | SS→SS interval (d) | `yearLengthDays(SS)` derivative form (d) | mean of four (d) | one-family mean tropical year (s) | e |
|---|---|---|---|---|---|---|---|---|---|
| -10000 | -10000 03-26 04:41 | -10000 06-22 14:47 | -10000 09-19 23:16 | -10000 12-23 04:45 | 365.243182 | 365.244183 | 365.243472 | 31556957.13 | 0.02124 |
| -2584 | -2584 03-22 17:13 | -2584 06-24 22:11 | -2584 09-23 03:24 | -2584 12-20 14:25 | 365.242045 | 365.242385 | 365.242689 | 31556947.89 | 0.01863 |
| -584 | -584 03-21 11:34 | -584 06-23 15:59 | -584 09-23 15:32 | -584 12-21 03:06 | 365.241726 | 365.241918 | 365.242475 | 31556938.83 | 0.01781 |
| 0 | 0 03-20 20:09 | 0 06-22 19:36 | 0 09-23 06:31 | 0 12-20 22:45 | 365.241670 | 365.241819 | 365.242412 | 31556935.88 | 0.01756 |
| 1246 | 1246 03-20 14:27 | 1246 06-21 21:29 | 1246 09-23 04:30 | 1246 12-21 12:21 | 365.241616 | 365.241673 | 365.242274 | 31556929.31 | 0.01703 |
| 2000 | 2000 03-20 07:36 | 2000 06-21 01:48 | 2000 09-22 17:23 | 2000 12-21 13:35 | 365.241625 | 365.241627 | 365.242190 | 31556925.22 | 0.01671 |
| 5000 | 5000 03-20 20:11 | 5000 06-19 06:55 | 5000 09-20 23:57 | 5000 12-22 03:20 | 365.241899 | 365.241666 | 365.241845 | 31556909.60 | 0.01541 |
| 10000 | 10000 03-19 19:40 | 10000 06-17 05:21 | 10000 09-16 01:06 | 10000 12-18 06:42 | 365.242381 | 365.241713 | 365.241282 | 31556892.71 | 0.01326 |

Dates are TT on the proleptic Gregorian calendar, from the JD the device returns; the `year` argument is the calendar year of the event.
<!-- /generated:calcmap-cardinal-events -->

The e(t)-spread by both devices, the anomalistic year, the RA:

<!-- generated:calcmap-cardinal-spread -->
| year | frozen device: T_X − mean (s) VE · SS · AE · WS | one-source structure: T_X − mean (s) VE · SS · AE · WS | structure anomalistic year (s) | RA of VE (°), frozen device | e |
|---|---|---|---|---|---|
| -10000 | 10.2 · 61.5 · -8.5 · -63.2 | 7.9 · 55.0 · -6.3 · -56.6 | 31558387.90 | 357.7403 | 0.02124 |
| -2584 | -49.4 · -26.3 · 48.7 · 27.1 | -48.1 · -25.1 · 47.2 · 26.0 | 31558415.97 | 359.6531 | 0.01863 |
| 0 | -14.7 · -51.2 · 15.7 · 50.2 | -15.0 · -50.5 · 16.1 · 49.5 | 31558425.22 | 359.9592 | 0.01756 |
| 2000 | 16.2 · -48.6 · -15.2 · 47.6 | 16.0 · -48.6 · -14.9 · 47.5 | 31558432.62 | 0.0143 | 0.01671 |
| 5000 | 43.2 · -15.5 · -43.8 · 16.1 | 44.2 · -15.1 · -45.0 · 15.8 | 31558445.07 | 359.7965 | 0.01541 |
| 10000 | 10.9 · 37.2 · -10.4 · -37.7 | 12.7 · 37.8 · -12.2 · -38.3 | 31558475.72 | 358.7825 | 0.01326 |

RA formula constants: raMean = base − earthRAAngle/sin ε̄ = base − 3.157955°, amplitude A/sin ε̄ = 1.600721° on −sin(2π·3·c) + sin(2π·8·c) (base 0/90/180/270° for VE/SS/AE/WS). Balanced year used by both devices: -302635.00000.
<!-- /generated:calcmap-cardinal-spread -->

### 5.6 Findings from this chain (to act on)

1. **The balanced year is −302,635, not 1246.** Every comb's phase origin
   sits 14.5 perihelion-of-date cycles (14.5 × H/16 = 303,881 yr) before
   the alignment year; docs/20 names it only as "obliquity cycle position
   14.5 (of 16)". It is a convention the coefficients were fitted under
   (matched pair), and a role-L item for plan 06: state it as a phase
   origin, not as a position in a structural cycle.
2. **Two anchor sets live in the coefficients file.** The shipped
   `CARDINAL_POINT_ANCHORS_ADJUSTED` matches the USNO 2000 instants to the
   minute (SS exact; VE +1, AE −4, WS −2 min) and is what every runtime
   reads — model.js, script.js (its `CARDINAL_POINT_ANCHORS` const IS the
   adjusted set), tools/lib, and the one-source panel through its runtime
   offset. The legacy base key `CARDINAL_POINT_ANCHORS` has its equinoxes
   1.9 h off (VE −1.90 h, AE +1.92 h — a pre-refit year-label artefact) and
   is still exported by the constants generator, read only by the archived
   fitter. A stale-list hazard of the "one structural list, one home" class:
   retire the base key or mark it historical.
3. **Two independent constructions give the same e(t)-spread** — the
   fitted braid (5.2) and the closed-form equation of centre on the
   movement's e(t), ϖ(t) (5.3) agree to ~1–4 s across ±10 kyr (5.5). The
   structure needs no H at all: it is the Phase-3 successor for the
   year-length layer, and it already feeds `yearLengths.cardinal` and the
   anomalistic year. Absolute dates stay with the frozen device until a
   mean-sun crossing chain exists (the per-renderer ±2–13 min twin-stack
   split recorded in the structure's header).
4. **The device's H inventory**: the ×16 count in the braid phase and in
   the anomalistic identity (L), the 13 in a(t) (U/L), H(t) in three places
   — the drift integrand, Ih's h0 + h1·c and the derivative's dc/dY (P) —
   and 92 + 26 comb lines on H divisors (C). Under plan 06 the P items
   re-express on T_p(t), the C items are declared a bounded basis, the L
   items are restated; the certified numerics do not move (the baseline
   fixture pins them).
5. **The year-length row and the event dates are in different day units by
   design**: T_X's drift part rides the real-LOD (days-of-date) convention
   while JD_X integrates SI days — 365.243888 vs 365.243182 d at −10000
   (61 s), equal at J2000 to the 118 ms fit-basis gap. A displayed rate
   must name its window; a displayed length must name its day.
