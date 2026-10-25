---
docVersion: 1.0
modelVersion: v26.7
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# Climate Formula — Architecture, Variance Decomposition & Implementation

> **TL;DR.** The canonical climate formula's orbital layer (L1) is **the engine's own physical line set** — 25 Berger/Laskar-style beats of Earth's secular modes (|g_i − g_j| eccentricity, p + s_i obliquity, p + g_i climatic precession, at relative mode amplitude ≥ 0.1) **plus the 405.6-kyr g₂ − g₅ fundamental and its 2nd/3rd harmonics** (the former L2 carbon-thermostat family, folded in) — read from `data/l1-physical-lines.json`, one home (plan 06 T1; §2's generated table), **+ up to 6 Heaviside step terms** (L3), fitted per regime with sequential ridge regression. The 33-integer comb (periods as integer fractions of an eight-unit base) whose variance decomposition led there is RETIRED: the pre-registered test T1 measured the comb against the physical lines and retired the labels, and the comb-era measurement sections of this document were replaced at plan 09 step 7e by one record table, [doc 109 §22](109-model-nbody-engine.md). Per-regime fits reach **R² = <!--v:canonR2PostMpt-->0.7804<!--/v--> post-MPT**, **R² = <!--v:canonR2Epica-->0.7238<!--/v--> EPICA CO₂**, **R² = 0.7626 CenCO2PIP 0–66 Ma**; the full-LR04 fit is **R² = <!--v:canonR2Full-->0.3329<!--/v-->** (L1+L2+L3). This doc decomposes the residual into a layered taxonomy — **(L1) orbital lines**, **(L2) climate-system internal periodic** (canonical: 405-kyr silicate-weathering thermostat + its 202 / 135 kyr harmonics; investigated but not deployed: the 4.36-Myr Boulila libration, 9-Myr long-period carbon resonance), **(L3) boundary-condition shifts** (MPT regime change, iNHG, Cenozoic secular trend, tectonic gateways), **(L4) chronology**, **(L5) stochastic residual** — and reports measured ΔR² for each addition.

> **Scope note (ESSRT).** The L1 lines are the engine's own secular beats, and the layered taxonomy (L1 orbital lines / L2 carbon / L3 boundary shifts) holds at any epoch. The eccentricity lines |g_i − g_j| are fixed at every epoch (planetary g-modes, ∝ 1/μ under the solar-mass history only); the obliquity and climatic-precession lines p + s_i and p + g_i ride the composed precession rate ψ̇(t) at deep time — sub-percent over the LR04 5.3-Myr window covered by the post-MPT / iNHG-MPT / pre-iNHG ridge fits, modest over the 67-Myr CENOGRID window ([doc 99](99-expanding-solar-system-resonance-theory.md)'s generated tables give the lines at each age).
>
> **Canonical formula measurements** (`scripts/milankovitch_climate_formula.py`, the 28-line L1 — 25 orbital lines + the 405-kyr family — + up to 6 L3 steps, sequential ridge λ=1):
> - **LR04 regime split is the biggest single jump**: pre-iNHG (2.7–5.32 Ma) R² = **<!--v:canonR2PreInhg-->0.4547<!--/v-->**, iNHG-MPT (1.0–2.7 Ma) R² = **<!--v:canonR2InhgMpt-->0.6090<!--/v-->**, post-MPT (0–1.0 Ma) R² = **<!--v:canonR2PostMpt-->0.7804<!--/v-->** — the lines explain ~78% of post-MPT LR04 variance once the MPT regime change is removed.
> - **CENOGRID δ¹⁸O** (0–67 Ma) R² = **<!--v:canonCenogridD18oTotal-->0.617<!--/v-->** (L1+L2+L3); δ¹³C R² = **<!--v:canonCenogridD13cTotal-->0.349<!--/v-->**. L3 step components carry the dominant CENOGRID variance (Cenozoic secular cooling captured by 6 Heavisides at PETM/EOT/Mi-1/MMCT/iNHG/MPT).
>
> **The comb-era variance budget** (Tier A and the three Tier B rounds on the 33-integer comb — the sidebands, the 4.36-Myr libration, the harmonic and δ¹³C/δ¹⁸O-ratio diagnostics, the CENOGRID step components, the phase-coherence and forward-prediction tests, the sliding-window amplitudes) was deleted from this document with its scripts and result files at plan 09 step 7e. What those rounds established and still stands in the live formula — the 405-kyr family as the one deployed L2, the six L3 steps, the per-regime fits, the honest negative that the formula is descriptive within regimes and not predictive across them — is carried by §§3–5 and §9; the headline numbers of each retired measurement are the record table in [doc 109 §22](109-model-nbody-engine.md).
>
> **Reproducible**: `python3 scripts/milankovitch_climate_formula.py` (the canonical fit) and `python3 scripts/generate_doc97_tables.py` (this doc's generated §6 table). Deterministic, no random seeds.

**Related documents:**
- Code: [`scripts/milankovitch_climate_formula.py`](../scripts/milankovitch_climate_formula.py)

---

## 1. Variance Budget Framework

### 1.1 Why a layered taxonomy

The model's existing decomposition treats LR04 as orbital signal + monolithic residual. That conflates physically distinct mechanisms:

- **Orbital forcing** is *external* — planetary eigenmodes are stationary on Myr timescales and produce strictly periodic signals at the engine's own secular beat frequencies (§2)
- **Climate-system response** is *internal* — silicate-weathering, ice-sheet hysteresis, carbon-cycle feedbacks have their own time constants that may resonate with or amplify orbital input
- **Boundary conditions** are *secular* — CO₂ decline, tectonic gateway closures, ice-sheet state changes shift the climate-sensitivity baseline non-stationarily
- **Chronology** introduces methodological variance
- **True stochastic noise** sets the floor

Mixing them in one residual conflates the spectrum, makes the model look weaker than it is, and obscures which mechanisms can be tested or predicted forward.

### 1.2 The five-layer taxonomy

| Layer | Type | Examples | Spectral signature | Quantification status |
|-------|------|----------|-------------------|----------------------|
| **L1** | Orbital lines (the engine's secular beats) | Earth obliquity p+s_i, eccentricity beats g_i−g_j, climatic precession p+g_i | Sharp lines at the engine's own beat frequencies | Quantified — canonical: **28 physical lines (25 orbital + the 405-kyr family), post-MPT R² = <!--v:canonR2PostMpt-->0.7804<!--/v-->, full-LR04 R² = <!--v:canonR2Full-->0.3329<!--/v-->** (§2, §9.5) |
| **L2** | Climate-system internal periodic | 405-kyr silicate-weathering thermostat + its 202 / 135 kyr harmonics; investigated: the 4.36-Myr Boulila libration, 9-Myr long-period carbon resonance | Sharp lines with anomalously high δ¹³C/δ¹⁸O ratio (carbon-cycle amplification) | Quantified — canonical (3 lines: 405-kyr family): post-MPT ΔR² = +0.003, pre-iNHG ΔR² = +0.049, EPICA CO₂ ΔR² = +0.012 (§3, §9.3, §10) |
| **L3** | Boundary-condition shifts | MPT (~1 Ma), iNHG (~2.7 Ma), late-Pleistocene cooling trend, tectonic gateways (Panama ~3 Ma, Drake ~30 Ma, EOT ~34 Ma), PETM (~56 Ma) | Step changes, secular drifts — broadband not narrow-line | Quantified — 6 Heaviside steps (PETM/EOT/Mi-1/MMCT/iNHG/MPT) lift CENOGRID δ¹⁸O ΔR² = +0.61 / δ¹³C ΔR² = +0.34 / CenCO2PIP CO₂ ΔR² = +0.60; fitted amplitudes recover canonical Cenozoic climate history (§8.3 B5, §9.4, §11.3) |
| **L4** | Chronology / methodology | Orbital tuning bias, stratigraphic sampling density, age-model uncertainty | Broadband noise + position uncertainty | Bounded (Cheng2016 validation: k=6 same FFT bin = chronology bias is small) |
| **L5** | Stochastic residual | AMOC/MOC variability, volcanic injections, Heinrich/D-O (sub-LR04 resolution), regional asymmetries | Broadband noise | Lower bound — remainder after L1–L4 |

### 1.3 The principle: orthogonalize, don't conflate

Each layer has a distinct empirical signature that lets it be separated:

- **L1 vs L2**: L1 lines are the engine's orbital beats; L2 shows anomalously high δ¹³C/δ¹⁸O ratio (carbon-cycle amplification) — a per-line property (§3.4)
- **L2 vs L3**: L2 is periodic (sharp lines); L3 is step or secular drift (broadband residual after fit)
- **L3 vs L5**: L3 can be modelled by regime splits or known transition dates; L5 is what's left after L3 boundaries are accounted for
- **L4**: bounded by independent chronology cross-validation

Decomposition strategy: add components in this order — L1 (orbital-line fit) → L2 (named lines) → L3 (regime splits / step components) → measure residual → infer L4 + L5 jointly.

---

## 2. Layer 1 — the orbital lines

**Current state (plan 06 T1).** The shipped L1 is the engine's own physical line set, written here from the one home so this document cannot describe a different formula than the one that ships:

<!-- generated:doc92-l1-physical-lines -->
| # | Family | Line | Period (kyr) | rel. amplitude | Note |
|---:|:---|:---|---:|---:|:---|
| 1 | climatic precession | p+g4 | 19.00 | 0.672 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 2 | climatic precession | p+g3 | 19.16 | 0.461 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 3 | climatic precession | p+g2 | 22.45 | 0.862 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 4 | climatic precession | p+g1 | 23.19 | 0.199 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 5 | climatic precession | p+g5 | 23.76 | 1.000 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 6 | obliquity | p+s7 | 27.27 | 0.104 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 7 | obliquity | p+s1 | 28.84 | 0.542 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 8 | obliquity | p+ζ14 | 29.00 | 0.142 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 9 | obliquity | p+ζ9 | 29.62 | 0.101 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 10 | obliquity | p+s2 | 29.81 | 0.479 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 11 | obliquity | p+s4 | 39.56 | 0.485 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 12 | obliquity | p+ζ4 | 40.23 | 0.324 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 13 | obliquity | p+s3 | 40.92 | 1.000 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 14 | obliquity | p+ζ7 | 41.64 | 0.179 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 15 | obliquity | p+s6 | 53.62 | 0.161 | rides the composed precession rate ψ̇(t) at deep time (doc 99) |
| 16 | eccentricity | g4−g5 | 94.88 | 0.779 | planetary g-beat — does not scale with Earth's spin |
| 17 | eccentricity | z6−g5 | 96.85 | 0.110 | planetary g-beat — does not scale with Earth's spin |
| 18 | eccentricity | g3−g5 | 98.84 | 0.535 | planetary g-beat — does not scale with Earth's spin |
| 19 | eccentricity | z5−g5 | 101.01 | 0.155 | planetary g-beat — does not scale with Earth's spin |
| 20 | eccentricity | z7−g5 | 103.12 | 0.105 | planetary g-beat — does not scale with Earth's spin |
| 21 | eccentricity | g4−g1 | 105.14 | 0.155 | planetary g-beat — does not scale with Earth's spin |
| 22 | eccentricity | g3−g1 | 110.03 | 0.106 | planetary g-beat — does not scale with Earth's spin |
| 23 | eccentricity | g4−g2 | 123.85 | 0.672 | planetary g-beat — does not scale with Earth's spin |
| 24 | eccentricity | g3−g2 | 130.69 | 0.461 | planetary g-beat — does not scale with Earth's spin |
| 25 | eccentricity | z5−g2 | 134.50 | 0.133 | planetary g-beat — does not scale with Earth's spin |
| 26 | eccentricity fundamental | g₂−g₅ | 405.63 | — | the engine’s 20-Myr mean beat; the long-eccentricity metronome |
| 27 | climate-internal harmonic | (g₂−g₅)/2 | 202.81 | — | carbon-thermostat 2nd harmonic (doc 92 §3), not orbital forcing |
| 28 | climate-internal harmonic | (g₂−g₅)/3 | 135.21 | — | carbon-thermostat 3rd harmonic (doc 92 §3), not orbital forcing |

25 orbital lines (5 climatic precession, 10 obliquity, 10 eccentricity) at relative mode amplitude ≥ 0.1 within the family, inside 14–300 kyr, lines closer than 0.5 % merged; plus the 3-line 405-kyr family. Built on the engine's own spectrum (`data/t1-engine-frequencies.json`: Earth's z and ζ secular modes from the 20-Myr deep mode table) and two precession rates: the climatic-precession lines p + gᵢ carry the general precession in longitude p = 50.2880 ″/yr at J2000 (the perihelion from the equinox along the ecliptic of date); the obliquity lines p_obl + sᵢ carry the REALIZED pole rate p_obl = 50.5191 ″/yr — the spin axis's inertial rate of date with its three of-date factors (the solar torque at e(t), J₂(t)/J₂₀, cos ε(t)) averaged over the record's own window, 0–5320 kyr (a record sees the window mean; the J2000 instant reads 50.3846, the general precession plus IAU's planetary precession ψ_A − p_A, and the pole turned faster in the past). The shipped coefficient file (`public/input/climate-formula-coefficients.json`) carries exactly these 28 periods in every regime — asserted by this renderer. No integer base, no lattice label.
<!-- /generated:doc92-l1-physical-lines -->

The pre-registered test T1 (its script and artifact were deleted at plan 09 step 7e; the verdict is in the record table, [doc 109 §22](109-model-nbody-engine.md)) fitted this beat model and the 33-integer comb below on the same data, preprocessing, regimes, solver and line count: the physical set matches or beats the comb in every LR04 regime up to ~25 lines and beats a same-size random null, and the comb's short-window edge was carried entirely by its 16 lines without an Earth-forcing counterpart. The labels were retired on that measurement; the per-regime R² of the shipped formula (§9) is the honest price of the split. **§2.1 below marks where the comb-era record stood.**

**T7 — the fixed-phase test: description vs prediction (pre-registered in plan 06 §4, run on LR04; `scripts/t7_fixed_phase_l1.py`, `data/t7-fixed-phase-l1.json`; the model's own histories from `tools/explore/t7-export-orbital-histories.mjs` → `data/t7-model-orbital-histories.json`).** The 28 lines above ride the engine's own frequencies, but their cos/sin pairs are FITTED per regime — a free amplitude and a free phase per line, 56 numbers — and the GIA α(t) channel (doc 102) inherits those phases. T7 replaced the 56 numbers by the model's own e(t), ε(t) and e·sin ϖ(t) (the one-source movement the scene renders, built at 1 kyr over 0–5.4 Ma) with one coefficient each and ONE climate lag, and scored each LR04 regime out of sample (fit one half of the window, score the other, both orders). Both pre-registered outcomes hold. In-window the fixed-phase model reads R² <!--v:t7FixedR2PostMpt-->0.380<!--/v--> / <!--v:t7FixedR2InhgMpt-->0.459<!--/v--> / <!--v:t7FixedR2PreInhg-->0.224<!--/v--> (post-MPT / iNHG–MPT / pre-iNHG) — below the free fit's <!--v:t7FreeR2PostMpt-->0.780<!--/v--> / <!--v:t7FreeR2InhgMpt-->0.609<!--/v--> / <!--v:t7FreeR2PreInhg-->0.455<!--/v-->, as a constrained subset must, and above the 95th percentile of the phase-randomised null (the same regressors with random Fourier phases: <!--v:t7NullP95PostMpt-->0.257<!--/v--> / <!--v:t7NullP95InhgMpt-->0.380<!--/v--> / <!--v:t7NullP95PreInhg-->0.110<!--/v-->). Out of sample the fixed-phase model keeps <!--v:t7FixedHoldoutPostMpt-->0.362<!--/v--> / <!--v:t7FixedHoldoutInhgMpt-->0.448<!--/v--> / <!--v:t7FixedHoldoutPreInhg-->0.151<!--/v--> — while the shipped free-phase L1 has no hold-out skill at half-regime windows at any ridge strength (<!--v:t7FreeHoldoutPostMpt-->−4.50<!--/v--> / <!--v:t7FreeHoldoutInhgMpt-->−6.35<!--/v--> / <!--v:t7FreeHoldoutPreInhg-->−7.24<!--/v--> at the shipped λ = 1; the best any λ reaches is <!--v:t7FreeBestHoldoutPostMpt-->+0.03<!--/v--> / <!--v:t7FreeBestHoldoutInhgMpt-->+0.05<!--/v--> / <!--v:t7FreeBestHoldoutPreInhg-->+0.02<!--/v-->, at a λ that also halves its in-window R²). Under 4-block cross-validation the fixed-phase skill is robust in post-MPT (<!--v:t7FixedBlockCvPostMpt-->+0.343<!--/v-->) and iNHG–MPT (<!--v:t7FixedBlockCvInhgMpt-->+0.451<!--/v-->) and MARGINAL in pre-iNHG (<!--v:t7FixedBlockCvPreInhg-->−0.026<!--/v-->) — the claim is two regimes, not three. What the free fit adds inside the window is ONE band: post-MPT LR04 carries <!--v:t7Record100kSharePostMpt-->0.41<!--/v--> of its variance at 85–135 kyr, the fixed-phase model leaves <!--v:t7Fixed100kLeftPostMpt-->0.21<!--/v--> of it unexplained while matching the precession and obliquity bands nearly as well as the free fit — the 100-kyr band is not generated by a linear response to e, ε, e·sin ϖ, and the Imbrie & Imbrie ice-volume response to the model's own 65°N insolation (variant c) does not recover it either (0.133 in-window). The fitted climate lag is <!--v:t7LagKyrPostMpt-->5.5<!--/v--> / <!--v:t7LagKyrInhgMpt-->5.5<!--/v--> / <!--v:t7LagKyrPreInhg-->4.5<!--/v--> kyr but loosely constrained (half-height range <!--v:t7LagHalfHeightLoPostMpt-->1<!--/v-->–<!--v:t7LagHalfHeightHiPostMpt-->12<!--/v--> kyr post-MPT) — consistent with the 6-kyr GIA relaxation τ measured independently on the historical ΔT record (plan 06 D7; doc 102), not a sharp confirmation of it. La2004's e, ε, ϖ̄ give the same model <!--v:t7La2004R2PostMpt-->0.380<!--/v--> / <!--v:t7La2004R2InhgMpt-->0.458<!--/v--> / <!--v:t7La2004R2PreInhg-->0.220<!--/v--> in-window — the model's histories and Laskar's are interchangeable here (≤ 0.005). READING: the per-regime R² this document quotes are in-window DESCRIPTIONS of the record; the model's own orbital histories carry the transferable part — the model's PREDICTION — at roughly half the in-window R² and with real out-of-sample skill in the two younger regimes. The two are different jobs. For the α(t) hindcast (doc 102), what matters is fidelity to the actual ice history over the last ~30 kyr, where the in-window description is the closer proxy (local R² <!--v:t7Local30kR2Free-->0.92<!--/v--> vs <!--v:t7Local30kR2Fixed-->0.59<!--/v-->, same shape); the two forcings put the α peak at the same <!--v:t7AlphaPeakKyrShipped-->8.4<!--/v--> kyr BP and agree to a few percent to 10 kyr BP, yet the small early difference integrates to a historical ΔT shift of <!--v:t7DeltaTShift2700-->−61<!--/v--> s at 2700 BP before any stack refit — so any move of α(t) is a matched-pair campaign decided on the eclipse-era ΔT (plan 06 §9 item 12). MEASURED (WP2, `tools/explore/t7-alpha-proxy-dt-fit.cjs` → `data/t7-alpha-proxy-dt-fit.json`; the ΔT joint fitter in report mode with α(t) on each proxy, nothing shipped): the shipped L1 reads Espenak RMS <!--v:t7AlphaProxyShippedEspenakRms-->13.46<!--/v--> s / full-window <!--v:t7AlphaProxyShippedFullRms-->28.87<!--/v--> s (the table hook's parity against the unpatched fitter is <!--v:t7AlphaProxyHookParityFull-->0.12<!--/v--> s), the fixed-phase forcing <!--v:t7AlphaProxyFixedEspenakRms-->14.47<!--/v--> / <!--v:t7AlphaProxyFixedFullRms-->38.77<!--/v--> s, the LR04 record itself <!--v:t7AlphaProxyLr04EspenakRms-->37.46<!--/v--> / <!--v:t7AlphaProxyLr04FullRms-->64.38<!--/v--> s — by the pre-registered rule α(t) keeps the shipped L1 (doc 102). DISPOSITION: reframe, not replace — description and prediction are both published, the runtime form is unchanged. CENOGRID waits for the the archived doc 108 §6 secular solution (the mode-table tail beyond ±10 Myr has no trustworthy phases).

## 3. Layer 2 — Climate-System Internal Periodic

> **L2: investigated vs canonical.** This section investigates **five L2 candidate lines** in the variance-budget model: 405-kyr fundamental (§3.1), the 4.36-Myr Boulila libration (§3.2), 9-Myr long-period carbon resonance (§3.3), 405-kyr 2nd harmonic at 202 kyr and 3rd harmonic at 135 kyr (§3.4). The **canonical climate formula** (§9.1) deploys only the **405-kyr family — three lines: 405 + 202 + 135 kyr** — as its L2 layer. **The Boulila libration and the 9-Myr line are documented here as investigated candidates but excluded from the canonical formula** because Round 3 cross-window stability tests (the comb-era R3-4 record in doc 109 §22 for the libration; §3.3 for 9-Myr) showed they are either phase-incoherent across windows or rely on per-record-length variance absorption that doesn't generalize. Read §3 as: "what L2 candidates does the data support?"; read §9.1 as: "what survives into the deployed formula?"

### 3.1 The 405-kyr silicate-weathering thermostat (Tier A2)

Position: **404.5 kyr** in the records; the engine's g₂ − g₅ beat reads 405.63 kyr (§2's generated table, line 26 — the long-eccentricity metronome). (On the retired integer comb it sat between two divisors, 383 and 447 kyr; that comb-era placement is record, doc 109 §22.)

Empirical signature:
- **Narrow spectral line**, FWHM 2.2 kyr (close to LR04's Rayleigh limit)
- **δ¹³C/δ¹⁸O amplitude ratio = 1.53** (3.1× higher than obliquity-band control, 2.3× higher than precession-band control — carbon-cycle amplification)
- **Loose orbital entrainment** (phase RMS drift 66–133 kyr over Cenozoic; cross-proxy r = 0.21)
- **Position stable across 67 Myr** of CENOGRID (402.9–406.0 kyr)
- Pälike 2006 termed this the "heartbeat of the Oligocene climate system"

Physical mechanism: silicate-weathering thermostat resonant response to long-period orbital eccentricity forcing (Walker–Hays–Kasting 1981, τ ≈ 400 kyr). The forcing line is orbital — the g₂ − g₅ eccentricity fundamental; the carbon amplification (below) and the 202 / 135-kyr harmonics are the climate system's internal response ringing at that period.

Fit strategy: add a single explicit `cos(2π·t/404.5) + sin(2π·t/404.5)` pair on top of the L1 fit.

> **Comb-era Tier A2 result** (record, [doc 109 §22](109-model-nbody-engine.md)): on top of the comb baseline the explicit 405-kyr pair added ΔR² ≈ +0.006 on full LR04, +0.0035 on CENOGRID δ¹⁸O and +0.0077 on CENOGRID δ¹³C — ~2× the δ¹⁸O contribution, the carbon-cycle amplification.

**Interpretation**: the 405-kyr line is a real, narrow-line component. Its small absolute ΔR² (~0.6% on LR04) is consistent with it being a "narrow heartbeat" rather than a high-amplitude driver. **The δ¹³C/δ¹⁸O ratio of the ΔR² contributions (0.0077 / 0.0035 = 2.2) confirms the L2 carbon-amplification classification** at the variance-decomposition level, independent of the per-band amplitude-ratio measurements from doc 91 §13 — direct insolation lines would have ratio ≈ 1, this line has > 2. The same diagnostic is reusable for any other candidate L2 line (see Tier B3).

### 3.3 The 9-Myr candidate (Tier A4)

Doc 91 §13.10 (archived) identifies a candidate carbon-cycle line at ~9 Myr with δ¹³C/δ¹⁸O ≈ 2.05 (Boulila-like) but F-statistics insufficient for confirmation (F δ¹³C = 1.61 vs critical 4.46). Position: ~9 Myr, beyond the engine's L1 band (its comb-era placement is record, doc 109 §22).

Test: add a single component at 9,000 kyr. LR04 has only 0.59 cycles in 5.32 Myr (under-resolved by definition); CENOGRID has ~7.4 cycles.

> **Comb-era Tier A4 result** (record, [doc 109 §22](109-model-nbody-engine.md)): the explicit 9-Myr pair added ΔR² +0.0147 on full LR04 (condition number 9.3 — collinearity warning), +0.0187 on CENOGRID δ¹⁸O and +0.0780 on CENOGRID δ¹³C (carbon-amplification ratio 4.2).

**Interpretation — promoted to confirmed Layer-2 candidate**: this is a much larger ΔR² than doc 91 §13.10's marginal F-statistic suggested. On CENOGRID δ¹³C alone, the 9-Myr line accounts for **+7.8% of variance**, making it the single largest Layer-2 contribution on the 67-Myr record — and the δ¹³C/δ¹⁸O variance-decomposition ratio is **0.0780 / 0.0187 = 4.2**, by far the strongest carbon-amplification signature in the suite (vs 2.2 for the 405-kyr line). The earlier F-statistic test in doc 91 §13 used a different power-spectrum-based criterion that under-weighs broadband variance contribution; the joint-fit ΔR² measurement reveals the line's actual decomposition role.

**Promotion criteria**: the line satisfies the model's L2 diagnostic (δ¹³C/δ¹⁸O > 1.0 on amplitude, > 2.0 on variance decomposition), is statistically significant in joint fit (ΔR² > 0.01 on CENOGRID δ¹³C), and is physically interpretable as a long-period carbon-cycle resonance. This document promotes it to **investigated Layer-2 candidate** for the purposes of variance decomposition; doc 91 §13.10's "tentative" framing is consistent. **Note: the 9-Myr line is NOT deployed in the canonical formula (§9.1)** — only the 405-kyr family (405 + 202 + 135 kyr) survives the Round 3 cross-window stability criteria (§8.5).

**LR04 caveat**: the +1.5% on LR04 with condition number 9.3 is unreliable — at 0.59 cycles per record the cos/sin pair is essentially absorbing residual trend. CENOGRID is the right test record for this line.

## 4. Layer 3 — Boundary-Condition Shifts

### 4.1 The MPT regime split (Tier A5)

Doc 91 §5.4 (archived) documents post/pre Mid-Pleistocene Transition amplitude ratios:

| Band | Post/pre ratio | Direction |
|------|---------------|-----------|
| 41-kyr obliquity | 0.72× | shrank |
| 100-kyr ice-age band | 1.64× | grew |
| 23.7-kyr climatic precession | 2.19× | grew |
| 405-kyr long eccentricity | 0.34× | shrank |

These are not consistent with a stationary process. The single-fit R² = <!--v:canonR2Full-->0.3329<!--/v--> on the full 5.3-Myr record forces a compromise between two regimes; an honest decomposition fits each regime independently.

Fit strategy:
- **Pre-MPT**: 1,200 – 3,000 kyr BP (1.8 Myr window, captures the obliquity-dominated regime)
- **Post-MPT**: 0 – 1,000 kyr BP (1.0 Myr window, captures the 100-kyr regime)
- Compare R² per regime to the full-record fit; the increase quantifies L3 variance.

> **Comb-era Tier A5 result, 25-line comb** (record, [doc 109 §22](109-model-nbody-engine.md)): R² 0.7241 pre-MPT, 0.8652 post-MPT.
> **Comb-era Tier A5 result** (record, [doc 109 §22](109-model-nbody-engine.md)): the 33-integer comb reached R² 0.7359 pre-MPT and 0.8803 post-MPT (0.9024 with the three L2 candidates added, condition warnings at the short window). The shipped line set's per-regime fits are §9.

**Interpretation — the biggest finding in this doc**: the regime split is the biggest single improvement in the entire decomposition. Post-MPT R² = **<!--v:canonR2PostMpt-->0.7804<!--/v-->** means **the L1 line set captures ~78 % of post-MPT LR04 variance** in the well-resolved 0–1 Myr window — a dramatically sharper story than the conflated full-record R² = <!--v:canonR2Full-->0.3329<!--/v-->.

The iNHG-MPT R² = <!--v:canonR2InhgMpt-->0.6090<!--/v--> is also far above the full-record value. The MPT itself is the L3 mechanism whose presence inflates the residual when the two regimes are conflated. Implication: **the model's headline figure for LR04 should be R² = <!--v:canonR2PostMpt-->0.7804<!--/v--> (post-MPT) / R² = <!--v:canonR2InhgMpt-->0.6090<!--/v--> (iNHG-MPT) / R² = <!--v:canonR2PreInhg-->0.4547<!--/v--> (pre-iNHG) — not R² = <!--v:canonR2Full-->0.3329<!--/v--> (conflated)**. The conflated number underestimates the model's explanatory power by ~3.4×.

Why this works:
- Pre-MPT is dominated by the 41-kyr obliquity rhythm (the obliquity lines near p+s₃ carry the largest amplitude)
- Post-MPT is dominated by the 100-kyr ice-age band (the 95–135-kyr eccentricity beats carry the largest amplitudes)
- Forcing the same component amplitudes to fit both regimes simultaneously is what the full-record OLS does, and it fails because the relative weights of the lines change across the MPT
- Independent per-regime fits let each window pick its own amplitude structure

### 4.2 iNHG (~2.7 Ma) — onset of Northern Hemisphere glaciation

Before iNHG, LR04 is dominated by 41-kyr obliquity with smaller amplitude. After iNHG, ice volume grows secularly and amplitude ramps up. The §4.1 two-window cut (pre-MPT 1.2–3 Ma / post-MPT 0–1 Ma) straddles iNHG.

The sharper three-regime split — **pre-iNHG (2.7–5.3 Ma) / iNHG-to-MPT (1.0–2.7 Ma) / post-MPT (0–1.0 Ma)** — is **now the canonical fit** (§9.3): R² = <!--v:canonR2PreInhg-->0.4547<!--/v--> / <!--v:canonR2InhgMpt-->0.6090<!--/v--> / <!--v:canonR2PostMpt-->0.7804<!--/v--> respectively. The pre-iNHG R² is genuinely lower than the broader pre-MPT 0.72 because the pre-iNHG regime has no Northern Hemisphere ice sheets and therefore weaker orbital amplification — see §8.4 R3-3.

### 4.3 Cenozoic secular trend (CENOGRID only)

Beyond LR04's 5.3-Myr window, CENOGRID covers 67 Myr of progressive cooling:
- **Cenozoic CO₂ decline** drives long-term ice-volume increase
- **Tectonic gateway closures** are step-change boundary conditions: Tethys (~25 Ma), EOT (~34 Ma), Drake Passage (~30 Ma), Central American Seaway / Panama (~3 Ma)
- **PETM (~56 Ma)** is a one-off carbon excursion not captured by any periodic component
- **K-Pg boundary (~66 Ma)** sits at the CENOGRID edge

For the L1 fit to work on CENOGRID, the secular cooling trend must be removed first (linear detrending alone is a coarse first step; piecewise-linear at known transitions, polynomial detrend, or explicit Heaviside step covariates all do substantially better — see §7.3 and §9.4 below).

> **Comb-era Tier A5-CENOGRID result** (record, [doc 109 §22](109-model-nbody-engine.md)): with **linear detrend only**, the 33-integer L1 fit reached R² ≈ **0.001 on both δ¹⁸O and δ¹³C** — i.e., the orbital lines essentially invisible at 67-Myr scale because the Cenozoic secular cooling dominates the variance budget. The remedy is the canonical L1+L2+L3 pipeline: with 6 Heaviside step covariates absorbing the Cenozoic boundary transitions, the canonical fit reaches **δ¹⁸O R² = 0.6177** and **δ¹³C R² = 0.3514** on the full 67-Myr CENOGRID record.

---

## 5. Layer 4 / Layer 5 — Methodological and Stochastic

### 5.1 Layer 4 — chronology / methodology

The comb-era Cheng chronology validation (its script and artifact deleted at plan 09 step 7e; record in [doc 109 §22](109-model-nbody-engine.md)) established that the 100-kyr-band peak position is the same FFT bin (k=6) on Cheng2016 (U-Th-dated speleothem, orbital-tuning-independent) and LR04 (orbitally-tuned). This bounds the chronology-bias contribution to small: the FFT positions are preserved across radically different age models.

**L4 contribution**: bounded by Cheng2016 cross-validation to small (well within the Rayleigh element).

### 5.2 Layer 5 — stochastic residual lower bound

The comb-era estimate of the L5 floor (from the retired 33-component fit) is archived; the shipped per-regime R² and the reachable ceiling are §6.

## 6. Composite Decomposition — LR04 (5.3 Myr)

### 6.1 The canonical formula per regime

(The comb-era Tier A variance budget and regime-split tables that stood here were deleted with their script at plan 09 step 7e; [doc 109 §22](109-model-nbody-engine.md) keeps their headline numbers.)

**Canonical formula** (sequential ridge λ=1, the physical L1 + the 405-kyr family + 6 L3 steps — `scripts/milankovitch_climate_formula.py`):

<!-- generated:canonical-r2 -->
| Regime / record | R² |
|---|---:|
| full LR04 (L1+L2+L3) | **0.3329** |
| post-MPT (0–1 Myr) L1+L2+L3 | **0.7804** |
| iNHG-MPT (1.0–2.7 Ma) L1+L2+L3 | **0.6090** |
| pre-iNHG (2.7–5.32 Ma) L1+L2+L3 | **0.4547** |
<!-- /generated:canonical-r2 -->

The canonical formula deploys only the three-line 405-kyr family in L2; the comb-era long-period and 9-Myr candidates were rejected by the Round-3 cross-window stability test and are not in the deployed formula ([doc 109 §22](109-model-nbody-engine.md)).

### 6.2 Reachable ceiling — and what it does NOT mean

Per-regime fits with the canonical L1 + 3-line L2 + 6-step L3 pipeline:
- **Post-MPT (0–1 Myr) R² = <!--v:canonR2PostMpt-->0.7804<!--/v-->** (L1+L2+L3; L1-only <!--v:canonR2L1PostMpt-->0.7804<!--/v-->)
- **iNHG-MPT (1.0–2.7 Ma) R² = <!--v:canonR2InhgMpt-->0.6090<!--/v-->**
- **Pre-iNHG (2.7–5.32 Ma) R² = <!--v:canonR2PreInhg-->0.4547<!--/v-->**
- **EPICA CO₂ (0–806 kyr) R² = <!--v:canonR2Epica-->0.7238<!--/v-->**
- **CenCO2PIP (0–66 Ma) R² = <!--v:canonCenco2pipTotal-->0.692<!--/v-->**

The full-record R² = <!--v:canonR2Full-->0.3329<!--/v--> suppresses the formula's explanatory power because forcing one set of component amplitudes to fit physically distinct climate regimes (pre-MPT obliquity-dominated, post-MPT 100-kyr-dominated) is over-constrained.

**Critical caveat (the comb-era forward-prediction test, doc 109 §22)**: **the high R² numbers are DESCRIPTIVE within each regime, NOT PREDICTIVE across regimes.** A formula trained on one regime and applied to another's timestamps predicts worse than the mean. The line set is a frequency model — it says where lines sit, not what their amplitudes and phases are in a regime it was not fitted on; only the 405-kyr line is structurally distinct (the one line with cross-proxy phase coherence). Predictive power across regimes requires modelling how line amplitudes evolve with boundary conditions (CO₂, ice-sheet area) — open work.

### 6.3 What the L5 floor implies

The post-MPT L5 floor of ~<!--v:canonL5FloorPostMpt-->22<!--/v-->% (1 − <!--v:canonR2PostMpt-->0.7804<!--/v-->) sets a fundamental ceiling on any orbital-forcing model of LR04 within this regime. Unless one includes proxies that resolve sub-LR04-resolution physics (high-resolution ice-core proxies for Heinrich/D-O, ENSO reconstructions for tropical Pacific decadal-to-millennial variability), no line formula will exceed that in the post-MPT window — the remaining variance is true climate stochastic, sub-LR04-resolution events, and dating noise.

Pre-MPT L5 floor is larger (~24%), reflecting older record with more chronology uncertainty and a weaker forcing regime (obliquity-only dominance with less amplification).

---

## 8. Path Forward

### 8.6 Tier C (sub-LR04 resolution, out of scope)

Sub-LR04-resolution components (ENSO ~2–7 yr, solar cycles ~11/100/210 yr, Heinrich ~7 kyr, Dansgaard–Oeschger ~1.5 kyr) require non-LR04 proxies (high-resolution ice cores, tree rings, speleothems) and are not part of the LR04 / CENOGRID variance budget. The LR04 ceiling of R² = <!--v:canonR2PostMpt-->0.7804<!--/v--> (post-MPT) already approaches what the 1-kyr binning permits — pursuing these would require swapping the proxy, not extending the model.

---

## 9. The canonical climate formula

The variance-decomposition findings of Tiers A and B Rounds 1-3 are crystallized
into a canonical, deployable formula at
[`scripts/milankovitch_climate_formula.py`](../scripts/milankovitch_climate_formula.py).

> **Why the §9 numbers differ slightly from §§3–8.** §§3–8 (variance-budget research) use **joint OLS** on each fit and report per-component ΔR² — useful for *attribution* of variance to individual lines. §9 (canonical formula) uses **sequential ridge regression** (L1 → residual → L2 → residual → L3) with λ=1 on L1. Sequential ridge trades ~0.6% absolute R² for **forward-projection stability** (§9.5 ridge analysis, measured on the comb: post-MPT OLS max amplitude 17.78 vs ridge 0.32 — ~56× shrinkage of degenerate coefficients). The headline drift to look out for: §4.1 Tier A5 joint-OLS post-MPT R² = 0.8975 (comb) vs the sequential-ridge post-MPT total of the shipped 28-line formula, R² = <!--v:canonR2PostMpt-->0.7804<!--/v--> (§9.3; the comb-era ridge figure was 0.868). Both are correct; they answer different questions (variance attribution vs deployable prediction) on different line sets.

### Inclusion / exclusion summary

The comb-era inclusion table (which integers entered the retired lattice fit, and why) is archived. The shipped set is the 28 physical L1 lines of §2 (the engine's own orbital lines and the 405-kyr family), the L2 terms of §3 and the L3 steps of §4.

### 9.1 Architecture

The formula decomposes into three layers with explicit physical meaning:

```
C(t) = c₀
     + Σ_i [a_i cos(2π·t/P_i) + b_i sin(2π·t/P_i)]        ← L1: the physical orbital lines, periods P_i in kyr (orbital forcing)
     + Σ_p [α_p cos(2π·t/p)   + β_p sin(2π·t/p)]          ← L2: the 405-kyr thermostat family (carbon cycle; folded into the line list)
     + Σ_i γ_i · H(t − t_i)                                ← L3: step components (boundary conditions)
```

Where:
- **L1 lines** = the engine's own beats (§2, generated table from `data/l1-physical-lines.json`): 25 orbital lines + the 405-kyr family. The comb-era description that stood here — 33 of 200 possible divisors: the canonical 25 (Berger eigenmode beats + Mars/Jupiter direct planet cycles) plus 6 MTM-significant precession-band sidebands (96, 107, 110, 134, 152, 185) from Round 1 A1 plus 1 Berger-quintet-completion sideband (141 = k+g₃ Earth at ~19 kyr; subthreshold in LR04 at amp/median 2.03×, 3σ in Cheng monsoon at 3.60×; closes the Wigley 1976 combination tone `1/95 ≈ 1/141 − 1/113`)
- **L2 periods** (3 lines, the silicate-weathering thermostat family) = 405-kyr fundamental + 202.25-kyr 2nd harmonic + 134.83-kyr 3rd harmonic — confirmed carbon-amplified across LR04, CENOGRID, and EPICA
- **L3 transitions** (up to 6, applied only when inside the fit window) = PETM (56 Ma), EOT (34 Ma), Mi-1 (23 Ma), MMCT (14 Ma), iNHG (2.7 Ma), MPT (1 Ma)

### 9.2 Sequential fitting (vs joint OLS)

The formula uses **sequential regression**: L1 is fit first to y, then L2 is fit to L1's residual, then L3 is fit to L1+L2's residual. This gives clean per-layer interpretation:

- **R² L1-only** = best L1 line fit to the raw data
- **ΔR² L2** = *unique* variance L2 explains AFTER L1 (zero if L2 is collinear with L1 at this window length)
- **ΔR² L3** = *unique* variance L3 explains AFTER L1+L2

**Why sequential, not joint OLS?** Sequential fitting resolves the **L1↔L2 collinearity** at short windows. At post-MPT 1000 kyr, the L2 135-kyr 3rd harmonic sits within one Rayleigh element of the L1 eccentricity line at 134.50 kyr (labelled z₅−g₂: a combination mode of the deep table beside g₃, beating against g₂ — not a Laskar pair; the lines are named by Laskar identity only where a mode is Laskar's). Joint OLS finds degenerate cancelling solutions (L1 amplitude +17607, L2 −17608 → cancel) with no physical meaning. Sequential fitting hands all the shared variance to L1 (the more fundamental layer) and reports L2 as the orthogonal remainder. This matches the model's hierarchy: orbital forcing is primary, carbon-cycle response is secondary.

There is a *second*, distinct collinearity problem — **L1↔L1 collinearity** *within* the L1 line set itself — that sequential fitting does **not** solve. The L1 sub-fit therefore uses ridge regularization rather than plain OLS; see §9.5.

### 9.3 Per-regime fits — LR04

Each LR04 window fitted independently using `regime="post-mpt"` / `"inhg-mpt"` / `"pre-inhg"` / `"lr04-full"`. Current totals are in the generated **canonical-r2** block (§9.2 above); the L1/L2/L3 decomposition below is the fit report's split at the 32-integer stage — the n=24 admission lifts the totals, most in pre-iNHG (+0.02, the regime where it is admitted):

| Regime | Window | R² L1 alone | ΔR² L2 unique | ΔR² L3 unique | Total R² (shipped) |
|--------|--------|-------------|---------------|---------------|----------|
| **post-mpt** | 0–1 Ma | **<!--v:canonPostMptL1Only-->0.780<!--/v-->** | <!--v:canonPostMptDeltaL2-->+0.000<!--/v--> | <!--v:canonPostMptDeltaL3-->+0.000<!--/v--> (no transition in window) | **<!--v:canonPostMptTotal-->0.780<!--/v-->** |
| **inhg-mpt** | 1.0–2.7 Ma | <!--v:canonInhgMptL1Only-->0.609<!--/v--> | <!--v:canonInhgMptDeltaL2-->+0.000<!--/v--> | <!--v:canonInhgMptDeltaL3-->+0.000<!--/v--> | <!--v:canonInhgMptTotal-->0.609<!--/v--> |
| **pre-inhg** | 2.7–5.3 Ma | <!--v:canonPreInhgL1Only-->0.455<!--/v--> | <!--v:canonPreInhgDeltaL2-->+0.000<!--/v--> | <!--v:canonPreInhgDeltaL3-->+0.000<!--/v--> | <!--v:canonPreInhgTotal-->0.455<!--/v--> |
| **lr04-full** | 0–5.3 Ma | <!--v:canonLr04FullL1Only-->0.325<!--/v--> | <!--v:canonLr04FullDeltaL2-->+0.000<!--/v--> | <!--v:canonLr04FullDeltaL3-->+0.008<!--/v--> (iNHG + MPT inside window) | <!--v:canonLr04FullTotal-->0.333<!--/v--> |

(L1 fit uses ridge λ=1 — see §9.5. The ridge is a no-op for the three longer regimes because their design matrices are already well-conditioned; the post-MPT total drops 0.006 vs. plain OLS in exchange for forward-projection stability.)

**Observations on the L1/L2/L3 split**:
1. **L1 does the heavy lifting in every regime**. At the 32-integer stage L1 explained 87% of post-MPT variance alone.
2. **L2's unique contribution is largest in pre-iNHG (+0.049)**. This is counterintuitive but physically sensible: pre-iNHG had no Northern Hemisphere ice sheets so L1 ice-sheet amplification is weak, and the silicate-weathering thermostat is *more uniquely visible* relative to L1.
3. **L3 only contributes when the fit window spans a known transition** (full-LR04 picks up iNHG and MPT step components).

### 9.4 Per-regime fits — CENOGRID

Each CENOGRID window fitted independently using `regime="neogene"` / `"post-eot"` / `"cenogrid"`, separately for δ¹⁸O and δ¹³C:

| Proxy | Regime | Window | R² L1 | ΔR² L2 | ΔR² L3 | **Total R²** | n_steps |
|-------|--------|--------|-------|--------|--------|--------------|---------|
| δ¹⁸O | neogene | 0–23 Ma | 0.014 | +0.009 | +0.053 | 0.077 | 3 |
| δ¹⁸O | post-eot | 0–34 Ma | 0.005 | +0.007 | **+0.443** | **0.454** | 4 |
| δ¹⁸O | cenogrid (full) | 0–67 Ma | 0.001 | +0.004 | **+0.613** | **0.618** | 6 |
| δ¹³C | neogene | 0–23 Ma | 0.009 | +0.013 | +0.051 | 0.073 | 3 |
| δ¹³C | post-eot | 0–34 Ma | 0.004 | +0.011 | +0.311 | 0.326 | 4 |
| δ¹³C | cenogrid (full) | 0–67 Ma | 0.001 | +0.008 | **+0.342** | **0.351** | 6 |

**Observations on CENOGRID**:
1. **L1 is essentially absent at CENOGRID scale** (R² = 0.001 on 67 Myr). The 5-kyr binning smears precession content, and the long secular trend dominates.
2. **L3 step components ARE the variance carrier at CENOGRID scale**. They explain ~61% of δ¹⁸O and ~34% of δ¹³C variance over 67 Myr alone.
3. **The fitted step amplitudes recover canonical Cenozoic climate history**:

| Transition | δ¹⁸O step β | δ¹³C step β | Interpretation |
|------------|-------------|-------------|----------------|
| PETM (56 Ma) | **+1.94** | **+1.30** | Warm carbon excursion (matches the canonical PETM signature) |
| EOT (34 Ma) | **−1.69** | −0.65 | Antarctic glaciation onset (strong δ¹⁸O cooling, modest δ¹³C) |
| Mi-1 (23 Ma) | +1.38 | −0.80 | Early Miocene Antarctic deglaciation pulse |
| MMCT (14 Ma) | −0.57 | +0.88 | Mid-Miocene cooling |
| iNHG (2.7 Ma) | −0.95 | +1.33 | NH glaciation onset, carbon-cycle reorganization |
| MPT (1.0 Ma) | +0.96 | −1.33 | δ¹⁸O regime shift (climate sensitivity change) |

These are not curve-fitted noise — they independently recover textbook Cenozoic climate history from the fit alone.

### 9.5 Under-determined L1 & ridge regularization

Whether L1 is well-determined depends on the **fit-window length** against
the **line spacing**. The shipped set has <!--v:fitDiagLineCount-->28<!--/v-->
lines and its families cluster: seven eccentricity beats between 94.9 and
110.0 kyr, four obliquity lines between 39.8 and 42.0 kyr, four more between
29.0 and 30.0 kyr. Lines closer than one Rayleigh element (1/T) of the window
cannot be told apart inside it. Measured on the shipped lines
(`scripts/fit_methodology_diagnostics.py`,
[`data/fit-methodology-diagnostics.json`](../data/fit-methodology-diagnostics.json);
amplitudes in units of the record's standard deviation, L1 layer alone):

| Regime | Window | Rayleigh groups (lines) | Condition # | Max VIF | OLS R² | Ridge λ=1 R² | OLS max\|amp\| | Ridge max\|amp\| |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **post-MPT** | 0–1 Ma | <!--v:fitDiagUnresolvedGroupsPostMpt-->5<!--/v--> (<!--v:fitDiagUnresolvedLinesPostMpt-->21<!--/v-->) | <!--v:fitDiagCondPostMpt-->1.77e+6<!--/v--> | <!--v:fitDiagMaxVifPostMpt-->2.74e+11<!--/v--> | <!--v:fitDiagOlsR2PostMpt-->0.8242<!--/v--> | <!--v:fitDiagRidgeR2PostMpt-->0.7805<!--/v--> | <!--v:fitDiagOlsMaxAmpPostMpt-->75067.998<!--/v--> | <!--v:fitDiagRidgeMaxAmpPostMpt-->2.196<!--/v--> |
| iNHG-MPT | 1.0–2.7 Ma | <!--v:fitDiagUnresolvedGroupsInhgMpt-->6<!--/v--> (<!--v:fitDiagUnresolvedLinesInhgMpt-->21<!--/v-->) | <!--v:fitDiagCondInhgMpt-->3.23e+3<!--/v--> | <!--v:fitDiagMaxVifInhgMpt-->1.47e+6<!--/v--> | <!--v:fitDiagOlsR2InhgMpt-->0.6504<!--/v--> | <!--v:fitDiagRidgeR2InhgMpt-->0.6090<!--/v--> | <!--v:fitDiagOlsMaxAmpInhgMpt-->234.517<!--/v--> | <!--v:fitDiagRidgeMaxAmpInhgMpt-->1.531<!--/v--> |
| pre-iNHG | 2.7–5.3 Ma | <!--v:fitDiagUnresolvedGroupsPreInhg-->4<!--/v--> (<!--v:fitDiagUnresolvedLinesPreInhg-->13<!--/v-->) | <!--v:fitDiagCondPreInhg-->58.9<!--/v--> | <!--v:fitDiagMaxVifPreInhg-->433<!--/v--> | <!--v:fitDiagOlsR2PreInhg-->0.4615<!--/v--> | <!--v:fitDiagRidgeR2PreInhg-->0.4547<!--/v--> | <!--v:fitDiagOlsMaxAmpPreInhg-->4.806<!--/v--> | <!--v:fitDiagRidgeMaxAmpPreInhg-->2.539<!--/v--> |
| lr04-full | 0–5.3 Ma | <!--v:fitDiagUnresolvedGroupsLr04Full-->2<!--/v--> (<!--v:fitDiagUnresolvedLinesLr04Full-->4<!--/v-->) | <!--v:fitDiagCondLr04Full-->5.59<!--/v--> | <!--v:fitDiagMaxVifLr04Full-->8.06<!--/v--> | <!--v:fitDiagOlsR2Lr04Full-->0.3254<!--/v--> | <!--v:fitDiagRidgeR2Lr04Full-->0.3254<!--/v--> | <!--v:fitDiagOlsMaxAmpLr04Full-->0.517<!--/v--> | <!--v:fitDiagRidgeMaxAmpLr04Full-->0.516<!--/v--> |

In a 1-Myr window the whole 95–110-kyr eccentricity cluster, the 40–42-kyr
obliquity quartet, the 29–30-kyr quartet, the 19-kyr precession pair and the
124–135-kyr group are each one Rayleigh element wide. Plain OLS there finds
degenerate cancelling coefficients — amplitudes of tens of thousands of
standard deviations that cancel *inside* the window and **break under
extrapolation**: the L1 layer's forward projection (−250…0 kyr) spans
<!--v:fitDiagLadderOlsForwardPtp-->2195.23<!--/v--> against
<!--v:fitDiagLadderOlsInSamplePtp-->5.16<!--/v--> in sample. The 1.7-Myr
iNHG-MPT window has the same pathology less severely; only the full record
resolves every line.

**The shipped remedy: ridge regression on L1** (λ = 1, intercept un-penalized,
normalized data, in the module's SVD-based augmented least-squares form). It shrinks
the under-determined directions and leaves the resolved ones alone. The
post-MPT ladder:

| Method | R² L1 | Max\|amp\| | Forward range | Forward ptp |
|---|---:|---:|---|---:|
| OLS | <!--v:fitDiagOlsR2PostMpt-->0.8242<!--/v--> | <!--v:fitDiagOlsMaxAmpPostMpt-->75067.998<!--/v--> | [<!--v:fitDiagLadderOlsForwardMin-->-1513.34<!--/v-->, <!--v:fitDiagLadderOlsForwardMax-->681.89<!--/v-->] | <!--v:fitDiagLadderOlsForwardPtp-->2195.23<!--/v--> |
| **Ridge λ=1 (shipped)** | <!--v:fitDiagRidgeR2PostMpt-->0.7805<!--/v--> | <!--v:fitDiagRidgeMaxAmpPostMpt-->2.196<!--/v--> | [<!--v:fitDiagLadderRidgeForwardMin-->-5.79<!--/v-->, <!--v:fitDiagLadderRidgeForwardMax-->4.32<!--/v-->] | <!--v:fitDiagLadderRidgeForwardPtp-->10.11<!--/v--> |

The ridge costs <!--v:fitDiagLadderRidgeMinusOlsR2-->−0.0438<!--/v--> on the
L1 layer's R² post-MPT and shrinks the largest amplitude
<!--v:fitDiagLadderOlsOverRidgeMaxAmp-->34190.5<!--/v-->×; the shipped fit
(L1 ridge + L3) then projects forward at
<!--v:fitDiagForwardGrowthPostMpt-->2.34<!--/v-->× its in-sample
peak-to-peak. Across regimes the ridge acts where the window leaves lines
unresolved — post-MPT and iNHG-MPT — and does nothing on the full record,
where OLS and ridge coincide. The one constant λ = 1 is kept across regimes:
it is the window, not the line set, that decides whether it acts.

Why not thin the line set? A greedy keep-one-per-Rayleigh-element thin keeps
<!--v:fitDiagLadderThinnedLines-->15<!--/v--> of the 28 lines post-MPT and
loses <!--v:fitDiagLadderThinnedMinusRidgeR2-->−0.3548<!--/v--> in R² against
the ridge. Ridge is preferred because it keeps the full set — each line with
its justification in the engine's own spectrum (§2) — while neutralizing the
extrapolation pathology. The cost is larger than it was on the retired comb,
whose integers sat farther apart than the derived beats do: inside a 1-Myr
window the 95–110-kyr beats and the 40–42-kyr obliquity lines are read as
bands, not as lines (the per-line instruments of doc 94 §9 say the same).

### 9.6 API

```python
from milankovitch_climate_formula import ClimateFormula, REGIME_WINDOWS

f = ClimateFormula()
summary = f.fit(t_kyr, y, regime="post-mpt")    # regime-aware sequential fit
print(summary.r2_l1_only, summary.delta_r2_l2, summary.delta_r2_l3)

# Per-layer evaluation at arbitrary timestamps
y_total = f.evaluate(t_kyr, layer="all")
y_l1    = f.evaluate(t_kyr, layer="l1")          # orbital forcing only
y_l2    = f.evaluate(t_kyr, layer="l2")          # carbon thermostat only
y_l3    = f.evaluate(t_kyr, layer="l3")          # step components only

# Full decomposition
decomp = f.decompose(t_kyr)
# → {'intercept': array, 'l1': array, 'l2': array, 'l3': array, 'total': array}

# Persist
state = f.to_dict()         # serializable fitted coefficients + window + L3 transition map
```

### 9.7 Forward projection scope

The formula's predictive power is **honest about its limits**:

- **Within the current (post-MPT) regime**: high confidence, R² = <!--v:canonPostMptTotal-->0.780<!--/v--> (the shipped per-regime fit)
- **Forward 0–250 kyr from now**: stays in post-MPT regime, no scheduled boundary-condition shift — projection is in-scope. With the ridge fix in §9.5, the predicted forward range stays inside the LR04 data range (peak-to-peak ≈ 4.8 ‰ in the full canonical projection — §9.7's table; §9.5's ridge-diagnostic figure alone reads 2.2 ‰); plain OLS would extrapolate to peak-to-peak ≈ 23.7 ‰, which is unphysical.
- **Forward >250 kyr or backward across MPT/iNHG**: out of scope — the C5/R3-3 forward-prediction tests showed R² goes catastrophically negative when crossing regime boundaries

#### Canonical forward projection — next 250 kyr

From `forward_projection_250kyr` in the canonical JSON output:

**Predicted glacial maxima:**

| Years from now | AD date | C(t) normalized | Strength |
|---:|---:|---:|---|
| **58,500** | ~60,500 AD | **+2.27** | **next natural glaciation onset** |
| 106,000 | ~108,000 AD | +0.24 | mild |
| 130,500 | ~132,500 AD | +0.04 | very mild |
| 153,000 | ~155,000 AD | −0.99 | (no glaciation; sits in interglacial) |
| **196,500** | ~198,500 AD | **+2.48** | **strongest in window** |

**Predicted interglacial peaks (between glacial maxima):**

| Years from now | AD date | C(t) normalized |
|---:|---:|---:|
| 92,500 | ~94,500 AD | −0.62 |
| 120,000 | ~122,000 AD | −0.54 |
| 145,000 | ~147,000 AD | −1.44 |
| **164,000** | ~166,000 AD | **−2.31 (warmest in window)** |

**Canonical forward-projection summary:**

| | Canonical (sequential ridge multi-proxy) — comb-era projection record; the shipped 28-line formula's projection is the modal's forward tab |
|---|---:|
| Next glacial onset | **~58,500 yr** |
| Strongest peak in window | ~196,500 yr |
| Warmest interglacial | ~164,000 yr |
| Forward peak-to-peak | **~4.8 ‰ normalized (ridge-bounded, §9.5)** |

The canonical fit agrees qualitatively with [Berger & Loutre 2002](https://www.science.org/doi/10.1126/science.1076120): long current interglacial, next major glaciation delayed beyond the typical ~10–20 kyr.

### 9.8 Reproducing

```bash
python3 scripts/milankovitch_climate_formula.py
# → data/milankovitch-climate-formula.json
```

Output JSON contains:
- Per-regime fitted coefficients for LR04 (post-mpt, inhg-mpt, pre-inhg, lr04-full)
- Per-regime fitted coefficients for CENOGRID δ¹⁸O and δ¹³C (neogene, post-eot, cenogrid)
- Full per-layer R² decomposition for each regime
- L3 step amplitudes per transition (PETM/EOT/Mi-1/MMCT/iNHG/MPT)
- Forward projection 0 → −250 kyr from now (next glacial maxima + interglacial peaks)
- Per-layer contribution breakdown at sample forward-projection epochs

---

## 10. EPICA CO₂ — cross-proxy validation (0–800 kyr)

The same L1 + L2 + L3 formula fitted to **atmospheric CO₂** from Antarctic ice cores tests the structural claim from a fundamentally different recording mechanism than benthic δ¹⁸O.

### 10.1 Dataset

| | EPICA CO₂ |
|---|---|
| Source | Bereiter et al. 2015, *Geophys. Res. Lett.* 42, 542 |
| Mechanism | Atmospheric CO₂ trapped in Antarctic ice bubbles |
| Range | 0–800 kyr (one Bayesian-corrected composite) |
| Resolution | Native ~2 kyr; binned to 2-kyr uniform grid for the modal (~400 samples) |
| Independence | Independent chronology (ice-flow age model), independent recording physics (gas vs. carbonate), CO₂ range 173–314 ppm |
| Local cache | `data/epica-co2-bereiter2015.txt` |
| Browser JSON | `public/input/epica-co2-data.json` |

### 10.2 Fit results (regime `epica-co2`)

Sequential ridge regression on detrended + normalized CO₂ over 0–800 kyr:

| Layer | Cumulative R² | ΔR² |
|---|---:|---:|
| L1 (32-integer comb) only | **0.8336** | 0.8336 |
| + L2 (405k + 202k + 135k) | 0.8452 | +0.0115 |
| + L3 (no transition inside window; MPT at 1000 kyr is the boundary) | 0.8452 | 0.0000 |
| **Total** | **0.8452** | |

(32-integer-stage decomposition; the current canonical EPICA total is <!--v:canonR2Epica-->0.7238<!--/v-->.)

At that stage L1 alone explained **83 %** of CO₂ variance over 800 kyr — strong cross-proxy validation: the same orbital lines that drive ice volume also drive atmospheric carbon-cycle dynamics.

### 10.3 Carbon-amplification ratios

For each L1 line, the ratio of EPICA-fitted amplitude to LR04-post-MPT-fitted amplitude diagnoses whether the line manifests primarily through carbon-cycle dynamics (high ratio) or ice volume (low ratio). The table below is the comb-era record (lines indexed by comb integer n); the shipped coefficient file carries the same diagnostic for the 28 physical lines:

| n | Period (kyr) | LR04 amp | EPICA amp | Ratio | Identity |
|---:|---:|---:|---:|---:|---|
| 14 | 191.6 | 0.107 | 1.171 | **10.97×** | g₂−g₈ Venus-Neptune ecc |
| 18 | 149.0 | 0.086 | 0.601 | **7.00×** | s₄−s₆ Mars-Saturn nodal |
| 16 | 167.7 | 0.191 | 0.967 | **5.07×** | Mars axial (comb-era label) |
| 30 | 89.4 | 0.086 | 0.417 | **4.83×** | g₃−g₇ Earth-Uranus ecc |
| 96 | 27.9 | 0.021 | 0.071 | 3.47× | k+g₆ Saturn climatic precession sub-peak |
| 12 | 223.5 | 0.209 | 0.710 | 3.40× | s₅−s₁ Jupiter-Mercury nodal |
| 66 | 40.6 | 0.278 | 0.511 | 1.84× | obliquity-band centroid |
| 28 | 95.8 | 0.752 | 0.555 | 0.74× | g₄−g₅ Mars-Jupiter ecc (Berger 95k) |

(Top 8 of 32 lines by ratio. Full table is in the `carbon_amplification_ratios` block of `public/input/climate-formula-coefficients.json` under regime `epica-co2`.)

**Interpretation**: Lines like n=14, 18, 16, 30 (ratios 5–11×) are amplified in atmospheric CO₂ relative to ice volume — they manifest primarily through carbon-cycle dynamics (silicate weathering, ocean alkalinity, marine productivity), not through ice-sheet ablation/accretion. The classical Berger 95k line (n=28) shows a low ratio (0.74×), confirming it's primarily an ice-volume signature.

This complements the broader **L2 carbon thermostat** (Section 3): individual L1 lines can also show carbon amplification, refuting any clean "L1 = orbital / L2 = carbon" dichotomy — carbon coupling is a per-line property.

---

## 11. CenCO2PIP CO₂ — deep-time validation (0–66 Ma)

The same L1 + L2 + L3 formula fitted to the **Bayesian Cenozoic CO₂ synthesis** from the CenCO2PIP Consortium tests the model across the entire Cenozoic (16× longer time span than EPICA, ~6× longer than LR04).

### 11.1 Dataset

| | CenCO2PIP CO₂ |
|---|---|
| Source | CenCO2PIP Consortium 2023, *Science* 382, eadi5177 (DOI 10.1126/science.adi5177) |
| Method | Bayesian time-series model synthesizing multi-proxy paleo-CO₂ |
| Proxies pooled | Boron isotopes, phytoplankton, paleosols, stomata, liverworts, paleosols |
| Range | 0–66 Ma at 100-kyr resolution |
| Output | ln(CO₂/ppm) quantiles (2.5%, 25%, 50%, 75%, 97.5%) — we use the 50% median |
| Native CO₂ range | 227–1675 ppm (median trajectory) |
| Archive | SPATIAL-Lab/CenoCO2 v1.2, Zenodo 10471529 (companion to the *Science* paper) |
| Local cache | `data/cenco2pip-100kyr-bayesian.csv` (with header documenting source + units) |
| Browser JSON | `public/input/cenco2pip-data.json` |

### 11.2 Fit results (regime `cenco2pip`)

Sequential ridge regression on detrended + normalized CO₂ over 0–66 Ma:

| Layer | Cumulative R² | ΔR² |
|---|---:|---:|
| L1 (the 28 physical lines) only | <!--v:canonCenco2pipL1Only-->0.047<!--/v--> | <!--v:canonCenco2pipL1Only-->0.047<!--/v--> |
| + L2 (the 405-kyr family) | — | <!--v:canonCenco2pipDeltaL2-->+0.000<!--/v--> |
| + L3 (6 Cenozoic transitions inside window) | **<!--v:canonCenco2pipTotal-->0.692<!--/v-->** | **<!--v:canonCenco2pipDeltaL3-->+0.644<!--/v-->** |
| **Total** | **<!--v:canonCenco2pipTotal-->0.692<!--/v-->** | |

Different signature from EPICA: at 66-Myr scale **L3 carries 60% of the variance**. The orbital L1 oscillations time-average toward zero across many cycles; the Cenozoic CO₂ story is the discrete step-changes at major transitions.

### 11.3 L3 step amplitudes — Cenozoic CO₂ history

| Transition | β (normalized) | Raw jump (ppm) | Interpretation |
|---|---:|---:|---|
| PETM (56 Ma) | −1.880 | −393 | Paleocene-Eocene Thermal Maximum (CO₂ rises into Eocene) |
| EOT (34 Ma) | +1.873 | +392 | Eocene-Oligocene transition (CO₂ drops into Oligocene) |
| Mi-1 (23 Ma) | −0.916 | −192 | Antarctic deglaciation pulse |
| MMCT (14 Ma) | +0.380 | +80 | Mid-Miocene cooling |
| iNHG (2.7 Ma) | −0.740 | −155 | NH glaciation onset |
| MPT (1.0 Ma) | +0.384 | +80 | Climate sensitivity shift |

(Sign convention: β is the step added when t ≥ transition, i.e., for OLDER ages.)

The PETM (−393 ppm older-than-PETM) and EOT (+392 ppm older-than-EOT) signs are correct: the Paleocene was cooler-CO₂ than the Early Eocene; the Late Eocene was higher-CO₂ than the early Oligocene. Both match the canonical CO₂ trajectory.

### 11.4 Cross-proxy convergence

The structural claim of doc 92 — that the **same L1 line set + L2 thermostat + L3 step terms explain three independent climate proxies** — has three confirming fits (comb-era breakdowns; the current totals follow the table):

| Dataset | Window | Proxy | R² breakdown | Total R² |
|---|---|---|---|---:|
| LR04 (Lisiecki & Raymo 2005) | 0–1 Ma (post-MPT) | benthic δ¹⁸O | L1 = <!--v:canonPostMptL1Only-->0.780<!--/v-->, +L2 = <!--v:canonPostMptDeltaL2-->+0.000<!--/v-->, +L3 = <!--v:canonPostMptDeltaL3-->+0.000<!--/v--> | **<!--v:canonPostMptTotal-->0.780<!--/v-->** |
| EPICA (Bereiter 2015) | 0–800 kyr | atmospheric CO₂ | L1 = <!--v:canonEpicaCo2L1Only-->0.724<!--/v-->, +L2 = <!--v:canonEpicaCo2DeltaL2-->+0.000<!--/v-->, +L3 = <!--v:canonEpicaCo2DeltaL3-->+0.000<!--/v--> | **<!--v:canonEpicaCo2Total-->0.724<!--/v-->** |
| CenCO2PIP (Consortium 2023) | 0–66 Ma | atmospheric CO₂ (multi-proxy) | L1 = <!--v:canonCenco2pipL1Only-->0.047<!--/v-->, +L2 = <!--v:canonCenco2pipDeltaL2-->+0.000<!--/v-->, +L3 = <!--v:canonCenco2pipDeltaL3-->+0.644<!--/v--> | **<!--v:canonCenco2pipTotal-->0.692<!--/v-->** |

(Breakdowns are the 32-integer-stage fit reports; current canonical totals: post-MPT <!--v:canonR2PostMpt-->0.7804<!--/v-->, EPICA <!--v:canonR2Epica-->0.7238<!--/v-->, CenCO2PIP 0.7626 — the generated canonical-r2 block in §9.)

The Quaternary fits (LR04 + EPICA) emphasize L1; the Cenozoic-scale fit (CenCO2PIP) emphasizes L3. The L1 line set is the same in all three.

---

## 12. Stitched per-regime evaluation

For chart views that span multiple regimes (Full LR04, Post-MPT extended, CENOGRID δ¹⁸O), a single joint fit dilutes the per-regime amplitudes (recall: lr04-full single fit gives R² = 0.25 vs per-regime stitched gives R² = <!--v:canonR2Stitched-->0.92<!--/v--> against the same LR04 data). The solution is a **stitched evaluation** that routes each time t through the appropriate regime's coefficients.

### 12.1 Routing rules

| Age range | Regime block used |
|---|---|
| **Full LR04** (0–5.3 Ma) and **Post-MPT ext** (0–1.2 Ma) and **CENOGRID δ¹⁸O for last 5.3 Ma** | |
| &nbsp;&nbsp;0 ≤ t < 1000 kyr | `lr04-post-mpt` |
| &nbsp;&nbsp;1000 ≤ t < 2700 kyr | `lr04-inhg-mpt` |
| &nbsp;&nbsp;2700 ≤ t ≤ 5320 kyr | `lr04-pre-inhg` |
| **CENOGRID δ¹⁸O, deep portion** | |
| &nbsp;&nbsp;5320 < t ≤ 67000 kyr | `cenogrid-d18o` |
| **All other tabs** | single regime as declared (e.g., `lr04-post-mpt`, `cenogrid-d13c`, `epica-co2`, `cenco2pip`) |

Implemented in `src/script.js` as `cfmRegimeForAge(t)` + `cfmEvalStitched(t)` (LR04-only stitch) + `cfmEvalStitchedCenogrid(t)` (LR04 + CENOGRID deep-time stitch).

### 12.2 Stitched R² against actual data

Computed in JS at render time, comparing the stitched curve to the actual proxy samples in the visible window:

| Tab | Stitched curve R² | Single-regime baseline R² |
|---|---:|---:|
| Full LR04 (5.3 Myr) | **0.9307** | lr04-full = 0.2537 (3.7× improvement) |
| Post-MPT ext (1.2 Myr) | **0.8643** | lr04-post-mpt = 0.8676 (matches) |
| CENOGRID δ¹⁸O (67 Myr) | **0.9477** | cenogrid-d18o = 0.6177 (1.5× improvement) |

### 12.3 CENOGRID–LR04 calibration offset

The LR04 (Lisiecki & Raymo 2005) and CENOGRID (Westerhold 2020) δ¹⁸O stacks use different reference standards and splicing, producing a systematic offset of **mean(CENOGRID − LR04) = +0.273 ‰** computed over their 0–5.3 Ma overlap (n = 2,115 LR04 samples interpolated against CENOGRID, see `cfmEvalStitchedCenogrid` constant `CENOGRID_LR04_D18O_OFFSET`).

When the stitched CENOGRID-δ¹⁸O view uses LR04 fits for the last 5.3 Ma, this offset is added to LR04-derived values so the formula stays continuous at the 5.3 Ma boundary with the cenogrid-d18o-derived values on the older side. A small residual discontinuity (~0.28 ‰) remains because the empirical offset is a mean over 5.3 Myr — local mismatch at the exact boundary is not perfectly closed.

### 12.4 Why stitching is not used on the forward-projection tab

Forward projection (next 250 kyr from today) is purely within the post-MPT regime — no boundary is crossed. The single `lr04-post-mpt` fit is sufficient. No stitching needed.

---

## 13. Earth Climate Analysis modal (`src/script.js`)

The interactive modal that visualizes the canonical formula across 8 time windows (CenCO2PIP 66M, CENOGRID 67M, LR04 5.3M, LR04 1.2M, EPICA 800k, LR04 700k, LR04 200k, LR04 forward) with layer toggles (Total / L1 / L2 / L3), per-regime R² breakdowns, forward-projection markers, and cross-proxy comparison tables, is documented in its own dedicated panel reference:

→ **[doc 50 § Earth Climate Analysis](50-ui-panels-reference.md)** — the panel reference: tabs, the three toggles (Proxy data / Total / L1 alone), the R² breakdown, the forward-projection markers and the code locations.

The modal is read-only and reads coefficients from the embedded `CLIMATE_FORMULA_COEFFS` block (synced from `public/input/climate-formula-coefficients.json` via the §14 pipeline below).

---

## 14. Reproducing the canonical formula pipeline (browser & modal)

The browser modal is fed by a deterministic, version-controlled pipeline:

```
data/lr04-stack.txt
data/westerhold2020-cenogrid.tab
data/epica-co2-bereiter2015.txt
data/cenco2pip-100kyr-bayesian.csv
       │
       ▼  scripts/milankovitch_climate_formula.py     (fit + report)
       │
       ▼  data/milankovitch-climate-formula.json      (canonical research output)
       │
       ▼  scripts/export_climate_formula_browser.py   (browser-ready coefficients)
       │
       ▼  public/input/climate-formula-coefficients.json   (8 regimes, ~44 KB)
       │
       ▼  scripts/export_cenogrid_browser.py          → public/input/cenogrid-data.json
       ▼  scripts/export_epica_browser.py             → public/input/epica-co2-data.json
       ▼  scripts/export_cenco2pip_browser.py         → public/input/cenco2pip-data.json
       │
       ▼  npm run constants:generate                  (regenerate the constants module)
       │
       ▼  src/script.js                               (imports CLIMATE_FORMULA_COEFFS, ~22 KB)
       │
       ▼  Earth Climate Analysis modal renders the 8 tabs
```

To regenerate after fit changes:

```bash
# 1. Refit the canonical formula
python3 scripts/milankovitch_climate_formula.py
# → data/milankovitch-climate-formula.json (with EPICA + CenCO2PIP evaluations)

# 2. Re-export the browser coefficient block
python3 scripts/export_climate_formula_browser.py
# → public/input/climate-formula-coefficients.json (8 regimes)

# 3. Re-export the proxy data arrays (only needed if dataset files change)
python3 scripts/export_cenogrid_browser.py
python3 scripts/export_epica_browser.py
python3 scripts/export_cenco2pip_browser.py

# 4. Regenerate the constants module src/script.js imports
npm run constants:generate
# → refreshes CLIMATE_FORMULA_COEFFS in packages/physics/src/constants/coefficients.js
```

`constants:generate` regenerates every fitted block at once (BALANCE_PRESETS, the ΔT stack, …); the climate formula is one of them.

To publish the data files (the build ships `public/input/` beside the page; the repository is the browser's fallback):

```bash
git add public/input/climate-formula-coefficients.json \
        public/input/cenogrid-data.json \
        public/input/epica-co2-data.json \
        public/input/cenco2pip-data.json
git commit -m "public/input: update climate-formula coefficients + proxy data"
git push origin main
```

---

<!-- moved from doc 99 (plan 19, tier 3): the measured verdict on clock-scaled line periods -->

## Why the climate formula keeps its J2000 line periods — measured

Two of the three L1 line families carry the precession rate p: the obliquity
lines (p + s_i) and the climatic-precession lines (p + g_i). On the composed
lunisolar clock p was faster in the past — Earth spun faster and the Moon was
closer — so a p-line's phase accumulates extra cycles,
Δ(t) = ∫₀ᵗ (1/T_p(t′) − 1/T_p(2000)) dt′, the same count for every p-line. The
eccentricity lines (g_i − g_j) and the 405-kyr family carry no p and ride the
solar-mass tier. The window means of T_p(t)/T_p(2000) on the composed clock
(`createModel().lunisolar.meanPeriodYearsAtYear`):

| Climate window | kyr | mean T_p(t)/T_p(2000) | period correction | extra precession cycles |
|:---|---:|---:|---:|---:|
| post-MPT (LR04) | 0–1,000 | <!--v:evolvingClockMeanRatioPostMpt-->0.99978<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctPostMpt-->−0.02<!--/v--> % | <!--v:evolvingClockExtraCyclesPostMpt-->0.01<!--/v--> |
| Pleistocene | 0–3,000 | <!--v:evolvingClockMeanRatioPleistocene-->0.99933<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctPleistocene-->−0.07<!--/v--> % | <!--v:evolvingClockExtraCyclesPleistocene-->0.08<!--/v--> |
| LR04 full | 0–5,320 | <!--v:evolvingClockMeanRatioLr04Full-->0.99881<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctLr04Full-->−0.12<!--/v--> % | <!--v:evolvingClockExtraCyclesLr04Full-->0.25<!--/v--> |
| EPICA CO₂ | 0–800 | <!--v:evolvingClockMeanRatioEpica-->0.99982<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctEpica-->−0.02<!--/v--> % | <!--v:evolvingClockExtraCyclesEpica-->0.01<!--/v--> |
| iNHG-MPT | 1,000–2,700 | <!--v:evolvingClockMeanRatioInhgMpt-->0.99917<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctInhgMpt-->−0.08<!--/v--> % | <!--v:evolvingClockExtraCyclesInhgMpt-->0.05<!--/v--> |
| CENOGRID Cenozoic | 0–66,000 | <!--v:evolvingClockMeanRatioCenogrid-->0.98532<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctCenogrid-->−1.47<!--/v--> % | <!--v:evolvingClockExtraCyclesCenogrid-->38.35<!--/v--> |
| Mesozoic | 0–250,000 | <!--v:evolvingClockMeanRatioMesozoic-->0.94583<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctMesozoic-->−5.42<!--/v--> % | <!--v:evolvingClockExtraCyclesMesozoic-->566.43<!--/v--> |
| Phanerozoic (the model's domain) | 0–500,000 | <!--v:evolvingClockMeanRatioPhanerozoic-->0.89503<!--/v--> | <!--v:evolvingClockPeriodCorrectionPctPhanerozoic-->−10.50<!--/v--> % | <!--v:evolvingClockExtraCyclesPhanerozoic-->2368.92<!--/v--> |

Over LR04 the correction is a tenth of a percent — a quarter of a precession
cycle at 5.3 Myr; over CENOGRID 1.5 % and 38 cycles; at the Phanerozoic 10 %.
Anyone fitting pre-Cenozoic spectra with the formula evaluates the p-lines on
the composed clock per epoch.

### The measured verdict — the clock buys nothing; the records resolve p instead

`scripts/test_evolving_clock_climate_formula.py` fits each window twice with
the shipped fitter — every line at its J2000 period, and the p-carrying lines
on their own warped time τ = t + Δ(t)·P — and runs three controls: the warp
scaled by k (k = 1 the model's clock, k = −1 the counter-rotating sign), the
two halves of each window fitted alone, and a constant frequency offset δp on
the p-lines ("which p does the record want?"), with the clock's gain
re-measured on top of the preferred δp.

| Window | ΔR² total, clock alone | sign control (k = −1) | preferred δp | ΔR² at that δp | clock on top of it |
|:---|---:|---:|---:|---:|---:|
| LR04 post-MPT (0–1 Myr) | <!--v:evolvingClockDeltaR2TotalPostMpt-->+0.00049<!--/v--> | <!--v:evolvingClockDeltaR2AtScaleMinusOnePostMpt-->−0.00052<!--/v--> | <!--v:evolvingClockPreferredDeltaPPostMpt-->+0.22<!--/v--> ″/yr | <!--v:evolvingClockDeltaR2AtPreferredPPostMpt-->+0.00564<!--/v--> | <!--v:evolvingClockGainAtPreferredPPostMpt-->−0.00010<!--/v--> |
| LR04 iNHG-MPT (1–2.7 Myr) | <!--v:evolvingClockDeltaR2TotalInhgMpt-->+0.00085<!--/v--> | <!--v:evolvingClockDeltaR2AtScaleMinusOneInhgMpt-->−0.00207<!--/v--> | <!--v:evolvingClockPreferredDeltaPInhgMpt-->+0.04<!--/v--> ″/yr | <!--v:evolvingClockDeltaR2AtPreferredPInhgMpt-->+0.00060<!--/v--> | <!--v:evolvingClockGainAtPreferredPInhgMpt-->−0.00032<!--/v--> |
| LR04 pre-iNHG (2.7–5.3 Myr) | <!--v:evolvingClockDeltaR2TotalPreInhg-->+0.00862<!--/v--> | <!--v:evolvingClockDeltaR2AtScaleMinusOnePreInhg-->−0.03141<!--/v--> | <!--v:evolvingClockPreferredDeltaPPreInhg-->+0.08<!--/v--> ″/yr | <!--v:evolvingClockDeltaR2AtPreferredPPreInhg-->+0.00856<!--/v--> | <!--v:evolvingClockGainAtPreferredPPreInhg-->−0.01389<!--/v--> |
| LR04 full (0–5.3 Myr) | <!--v:evolvingClockDeltaR2TotalLr04Full-->−0.03114<!--/v--> | <!--v:evolvingClockDeltaR2AtScaleMinusOneLr04Full-->−0.01302<!--/v--> | <!--v:evolvingClockPreferredDeltaPLr04Full-->−0.02<!--/v--> ″/yr | <!--v:evolvingClockDeltaR2AtPreferredPLr04Full-->+0.00332<!--/v--> | <!--v:evolvingClockGainAtPreferredPLr04Full-->−0.01735<!--/v--> |
| CENOGRID (0–66 Myr) | <!--v:evolvingClockDeltaR2TotalCenogrid-->+0.00055<!--/v--> | <!--v:evolvingClockDeltaR2AtScaleMinusOneCenogrid-->−0.00008<!--/v--> | <!--v:evolvingClockPreferredDeltaPCenogrid-->+0.04<!--/v--> ″/yr | <!--v:evolvingClockDeltaR2AtPreferredPCenogrid-->+0.00028<!--/v--> | <!--v:evolvingClockGainAtPreferredPCenogrid-->−0.00054<!--/v--> |
| Cheng 2016 (0–640 kyr, U-Th, untuned) | <!--v:evolvingClockDeltaR2TotalCheng-->+0.00023<!--/v--> | <!--v:evolvingClockDeltaR2AtScaleMinusOneCheng-->−0.00024<!--/v--> | <!--v:evolvingClockPreferredDeltaPCheng-->+0.40<!--/v--> ″/yr | <!--v:evolvingClockDeltaR2AtPreferredPCheng-->+0.00791<!--/v--> | <!--v:evolvingClockGainAtPreferredPCheng-->−0.00013<!--/v--> |

Reading:

1. **The clock alone looks like a gain** in the older LR04 regimes, with the
   right sign (the counter-rotating warp loses) and in both halves of each
   window — but the warp-scale scan does not peak at the model's clock: it
   keeps rising past k = 3. The record wants far more phase drift than the
   composed clock carries.
2. **A constant frequency offset explains it.** With the p-lines evaluated at
   p + δp, every LR04 window prefers δp =
   <!--v:evolvingClockPreferredDeltaPMinLr04-->−0.02<!--/v-->…<!--v:evolvingClockPreferredDeltaPMaxLr04-->+0.22<!--/v--> ″/yr,
   and on top of that offset the clock of date subtracts in every window
   (largest gain <!--v:evolvingClockGainAfterPreferredPMax-->−0.00010<!--/v-->).
   The "clock gain" was a frequency offset in disguise: inside one window a
   phase drift and a frequency offset both raise a line's mean frequency.
3. **Two rates, two families.** An obliquity line p + s_i is the spin axis
   precessing in the inertial frame against one of the ecliptic's nodal
   modes, so it carries the spin axis's inertial rate (the self-anchored rate
   the hybrid obliquity integration runs on — the general precession plus the
   planetary mean the N-body ecliptic's motion carries,
   <!--v:spinAxisInertialRateArcsecPerYrJ2000-->50.385<!--/v--> ″/yr at J2000;
   the +0.097 above the general precession is IAU's planetary precession
   ψ_A − p_A); a climatic-precession line p + g_i is the perihelion measured
   from the equinox along the ecliptic of date, so it carries the general
   precession in longitude (<!--v:evolvingClockArtifactPArcsecPerYr-->50.288<!--/v--> ″/yr,
   the model's J2000 precession reading, 1,296,000 ″ over
   <!--v:evolvingClockTpJ2000Yr-->25771<!--/v--> yr). With the obliquity lines
   on the J2000 inertial rate (model v22.0) the per-family scan still wanted
   +0.12…+0.20 ″/yr on the obliquity family alone, nothing resolvable on the
   precession family.
4. **A record sees the window mean, not the J2000 instant.** The spin
   integration turns the pole at α(t)·cos ε(t) with the solar torque at the
   eccentricity of date and J₂(t) from the GIA channel — three factors of
   date, each 1 at J2000, each larger in the past (faster spin, lower mean
   obliquity, higher mean eccentricity). Averaged over the LR04 record that
   rate reads <!--v:spinAxisInertialRateMeanLr04ArcsecPerYr-->50.517<!--/v--> ″/yr
   (the realized pole rate; one home
   `createModel().lunisolar.spinAxisInertialRateMeanArcsecPerYr`), and the
   dominant obliquity line of the model's OWN ε(t) fitted over the record
   sits exactly there: <!--v:obliqCycleRealizedFitLr04Years-->~40,919<!--/v--> yr
   against the window-mean prediction
   <!--v:obliqCycleRealizedLr04Years-->~40,927<!--/v--> (gated to 0.1 % in the
   obliquity-hybrid verdict), with La2004's own series on the same fit at
   <!--v:obliqCycleLa2004FitLr04Years-->~40,900<!--/v-->
   (<!--v:obliqCycleRealizedVsLa2004Pct-->+0.05<!--/v--> %) — and the J2000
   beat 2π/(ψ̇ᵢₙ − |s₃|) = <!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr is the
   instantaneous limit of that mean. The records' preferred offset WAS this
   mean. The shipped obliquity lines now carry it — on the orbital forcing
   alone (model v23.0:
   <!--v:evolvingClockArtifactPInertialArcsecPerYr-->50.519<!--/v--> ″/yr, the
   same mean without the ice-driven J₂(t) factor, because that factor rides
   the climate formula's own post-MPT layer and a forcing line must not
   contain the climate response; 2–3 yr of period from the full physics), and
   scanned one family at a time on them the obliquity lines want δp =
   <!--v:evolvingClockPreferredDeltaPObliquityInhgMpt-->+0.04<!--/v--> ″/yr
   (iNHG-MPT), <!--v:evolvingClockPreferredDeltaPObliquityPreInhg-->+0.06<!--/v-->
   (pre-iNHG) and <!--v:evolvingClockPreferredDeltaPObliquityLr04Full-->−0.02<!--/v-->
   (full record) for gains of
   <!--v:evolvingClockDeltaR2AtPreferredPObliquityInhgMpt-->+0.00057<!--/v-->,
   <!--v:evolvingClockDeltaR2AtPreferredPObliquityPreInhg-->+0.00828<!--/v-->,
   <!--v:evolvingClockDeltaR2AtPreferredPObliquityLr04Full-->+0.00414<!--/v-->
   (were +0.009 / +0.059 / +0.069 on the J2000 rate); the pre-iNHG remainder
   is the regime's own window mean sitting
   above the record-wide one
   (<!--v:spinAxisInertialRateMeanPreInhgArcsecPerYr-->50.564<!--/v--> ″/yr —
   a per-regime line set would carry it; the shipped set carries ONE window,
   the record's, the rule "derive over the window the rows are used in"). The
   climatic-precession lines alone want
   <!--v:evolvingClockPreferredDeltaPPrecessionInhgMpt-->+0.02<!--/v--> ″/yr in
   the one window that resolves them (iNHG-MPT, ΔR²
   <!--v:evolvingClockDeltaR2AtPreferredPPrecessionInhgMpt-->+0.00004<!--/v-->)
   and poorly determined offsets elsewhere. Laskar's precession frequency
   (50.476 ″/yr) is a long-window frequency of his solution, not a J2000
   rate: compare a realized period with a realized period, never a J2000
   beat with it.

**Conclusion.** The composed clock's drift is below what any available
record resolves — the formula keeps fixed line periods, measured on the
right physics (only the p-carrying lines warp) — and the obliquity lines
carry the window mean of the pole rate over the record they are fitted to,
<!--v:obliqCycleRealizedLr04Years-->~40,927<!--/v--> yr for the p+s₃ line,
with the published J2000 beat <!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr as its
instantaneous limit.

---


## See Also

- [99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — the deep-time scaling of the orbital lines (the solar-mass history) and of the precession-carrying lines (the composed clock) over the 67-Myr CENOGRID window
- [109 §22](109-model-nbody-engine.md) — the record table of the comb-era variance-budget scripts deleted at plan 09 step 7e
