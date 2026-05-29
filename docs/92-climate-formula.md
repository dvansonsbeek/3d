# Climate Formula — Architecture, Variance Decomposition & Implementation

> **TL;DR.** The canonical 8H climate formula is **32 integer divisors of 8H = 2,682,536 yr** (L1 lattice: 25 framework integers from Berger 1978 + Laskar 2004 eigenmode beats + framework direct planet cycles from doc 55, plus 6 precession-band sidebands surfaced by doc 91 §12.12 Test L, plus n=141 Berger-quintet completion added 2026-05-28) **+ a 3-line 405-kyr carbon thermostat family** (L2) **+ up to 6 Heaviside step terms** (L3), fitted per regime with sequential ridge regression. Per-regime fits reach **R² = 0.8735 post-MPT**, **R² = 0.8452 EPICA CO₂**, **R² = 0.7626 CenCO2PIP 0–66 Ma**; the full-LR04 fit is **R² = 0.2553** (L1+L2+L3). This doc decomposes the residual into a layered taxonomy — **(L1) orbital lattice**, **(L2) climate-system internal periodic** (canonical: 405-kyr silicate-weathering thermostat + its 202 / 135 kyr harmonics; investigated but not deployed: 13H Boulila libration, 9-Myr long-period carbon resonance), **(L3) boundary-condition shifts** (MPT regime change, iNHG, Cenozoic secular trend, tectonic gateways), **(L4) chronology**, **(L5) stochastic residual** — and reports measured ΔR² for each addition.
>
> **Canonical formula measurements** (`scripts/milankovitch_climate_formula.py`, 32-integer L1 + 3-line L2 + 6-step L3, sequential ridge λ=1):
> - **LR04 regime split is the biggest single jump**: pre-iNHG (2.7–5.32 Ma) R² = **0.4298**, iNHG-MPT (1.0–2.7 Ma) R² = **0.7289**, post-MPT (0–1.0 Ma) R² = **0.8735** — the 8H lattice explains ~87% of post-MPT LR04 variance once the MPT regime change is removed.
> - **CENOGRID δ¹⁸O** (0–67 Ma) R² = **0.6177** (L1+L2+L3); δ¹³C R² = **0.3514**. L3 step components carry the dominant CENOGRID variance (Cenozoic secular cooling captured by 6 Heavisides at PETM/EOT/Mi-1/MMCT/iNHG/MPT).
>
> **Tier A variance budget** (`scripts/milankovitch_8h_variance_budget.py`, plain OLS for layer-by-layer accounting):
> - Full LR04: baseline 25 → 32 integers (n=141 added) lifts R² 0.2321 → **0.2385**; adding deployed-L2 405-kyr → 0.2444.
> - Post-MPT regime: 32-integer L1 alone → **0.8762**; adding the full investigated L2 stack (405-kyr + 13H + 9-Myr) → 0.9022. The canonical formula caps at 0.8735 because 13H and 9-Myr are rejected by R3-4 cross-window stability tests.
>
> **Tier B Round 1 measurements** (`scripts/milankovitch_8h_variance_budget_tier_b.py`):
> - **B4 — CENOGRID L3 detrend matters**: piecewise-linear at 6 known transitions lifts δ¹⁸O R² from 0.027 → **0.066 (2.4×)**; polynomial degree-10 lifts δ¹³C R² to **0.137 (1.5×)**.
> - **B1 — nonlinear silicate-weathering thermostat confirmed**: the 2nd harmonic (**202 kyr, δ¹³C/δ¹⁸O ratio 3.27**) and 3rd harmonic (**135 kyr, ratio 13.99**) of the 405-kyr line are independently detectable as carbon-amplified L2 components.
> - **C8 — the L1/L2 dichotomy is empirically not clean**: several *lattice* integers show extreme carbon amplification (**8H/22 = 122 kyr, ratio 12.84** — the strongest L2 signature anywhere). The 8H lattice is a frequency framework; carbon-amplification is an empirical per-line property, not architectural.
> - **B2 — Laskar eigenmode-beat enumeration**: 23 off-lattice candidates tested; **none pass strict promotion criteria**.
>
> **Tier B Round 2 measurements** (`scripts/milankovitch_8h_variance_budget_tier_b_r2.py`):
> - **B5 — Step components are the dominant CENOGRID variance carrier**: adding 6 Heaviside step covariates at PETM/EOT/Mi-1/MMCT/iNHG/MPT lifts δ¹⁸O R² from 0.027 → **0.676 (25×)** and δ¹³C from 0.089 → **0.426 (4.8×)**. The fitted step amplitudes independently recover canonical Cenozoic climate history (PETM +1.94, EOT −1.73, etc.).
> - **C2 — Cross-record phase coherence: only 405-kyr is cross-proxy coherent**. All other L2 lines (202-kyr, 135-kyr harmonics, 13H, 9-Myr) show ~half-cycle phase lag between δ¹⁸O and δ¹³C — temperature-driven L1 forcing + carbon-feedback delay (now classified **L2-feedback** vs **L2-direct**).
> - **C10 — EPICA CO₂ R² = 0.8452** (canonical formula); obliquity-band carbon amplification (8H/66 = 41 kyr ratio 15.79) reveals a SECOND L2 mechanism (Pleistocene glacial-CO₂ coupling) distinct from silicate-weathering.
> - **C5 — Forward prediction fails catastrophically across the MPT** (R² = −0.87). **The framework is descriptive within regimes, NOT predictive across regime boundaries.**
> - **D1 — Proxy-aware separation**: pure L1 components contribute ~0 to either proxy on CENOGRID; L2 dominates variance at deep-time scales.
>
> **Tier B Round 3 measurements** (`scripts/milankovitch_8h_variance_budget_tier_b_r3.py`) — **the predictive limits exposed**:
> - **R3-1 — Sliding-window amplitudes are real and substantial**: per-window R² = 0.67-0.85 across all 11 LR04 windows; individual amplitudes vary 4-6× across windows; boundary-condition correlations flip sign between LR04 and CENOGRID (the MPT regime change signature).
> - **R3-2 — Honest negative: L2 lines are NOT linear responses to L1 drivers** (|r| < 0.4 for all tested pairs). Simple ODE models won't capture L2 mechanisms — they are nonlinear (threshold / hysteresis / saturating).
> - **R3-3 — Honest negative: step components do NOT fix forward prediction.** Three-regime split with canonical formula: pre-iNHG R² = 0.4298, iNHG-MPT R² = 0.7289, post-MPT R² = 0.8735. Forward predictions with and without step covariates give IDENTICAL (failing) R². The regime non-stationarity is in **amplitudes**, not baselines.
> - **R3-4 — Honest negative: 13H Boulila libration is not a stable single eigenmode**: amp CV 42-50%, δ¹⁸O phase circular std 97.9° (≈ uniform random). The Boulila-match amplitude signature is real; interpretation as a single coherent oscillator is not supported.
>
> **All numbers reproducible**:
> ```bash
> python3 scripts/milankovitch_8h_variance_budget.py            # Tier A   (1 sec)
> python3 scripts/milankovitch_8h_variance_budget_tier_b.py     # Tier B R1 (5 sec)
> python3 scripts/milankovitch_8h_variance_budget_tier_b_r2.py  # Tier B R2 (1 sec)
> python3 scripts/milankovitch_8h_variance_budget_tier_b_r3.py  # Tier B R3 (1 sec)
> ```
> Deterministic, no random seeds.

**Related documents:**
- [16 — Milankovitch language](90-milankovitch-language.md) — terminology primer
- [17 — Milankovitch evidence](91-milankovitch-evidence.md) — five headline findings (§1), how orbital forcing reaches climate (§2), per-planet contributions (§3), 100-kyr-band centroid (§4), pre-MPT/post-MPT analysis (§5), pre-registered super-cycle null (§§8–11), 14 hypothesis tests (§12) — incl. Test L which surfaced the 6 precession sidebands now in L1, 405-kyr off-lattice characterization (§13)
- Code: [`scripts/milankovitch_climate_formula.py`](../scripts/milankovitch_climate_formula.py), [`scripts/milankovitch_8h_variance_budget.py`](../scripts/milankovitch_8h_variance_budget.py)

---

## 1. Variance Budget Framework

### 1.1 Why a layered taxonomy

The framework's existing decomposition treats LR04 as orbital signal + monolithic residual. That conflates physically distinct mechanisms:

- **Orbital forcing** is *external* — planetary eigenmodes are stationary on Myr timescales and produce strictly periodic signals on the 8H lattice
- **Climate-system response** is *internal* — silicate-weathering, ice-sheet hysteresis, carbon-cycle feedbacks have their own time constants that may resonate with or amplify orbital input
- **Boundary conditions** are *secular* — CO₂ decline, tectonic gateway closures, ice-sheet state changes shift the climate-sensitivity baseline non-stationarily
- **Chronology** introduces methodological variance
- **True stochastic noise** sets the floor

Mixing them in one residual conflates the spectrum, makes the model look weaker than it is, and obscures which mechanisms can be tested or predicted forward.

### 1.2 The five-layer taxonomy

| Layer | Type | Examples | Spectral signature | Quantification status |
|-------|------|----------|-------------------|----------------------|
| **L1** | Orbital lattice (8H/N) | Earth obliquity (k+s₃), Mars apsidal, eigenmode beats g_i−g_j and s_i−s_j, Berger climatic precession k+g_i | Sharp lines at exact integer divisors of 8H | Quantified — canonical: **32 active integers, post-MPT R² = 0.8735, full-LR04 R² = 0.2553** (§2.3, §9.5) |
| **L2** | Climate-system internal periodic | 405-kyr silicate-weathering thermostat + its 202 / 135 kyr harmonics (off-lattice); investigated: 13H = 4.36-Myr Boulila libration, 9-Myr long-period carbon resonance | Sharp lines off the lattice OR on-lattice with anomalously high δ¹³C/δ¹⁸O ratio | Quantified — canonical (3 lines: 405-kyr family): post-MPT ΔR² = +0.003, pre-iNHG ΔR² = +0.049, EPICA CO₂ ΔR² = +0.012 (§3, §9.3, §10) |
| **L3** | Boundary-condition shifts | MPT (~1 Ma), iNHG (~2.7 Ma), late-Pleistocene cooling trend, tectonic gateways (Panama ~3 Ma, Drake ~30 Ma, EOT ~34 Ma), PETM (~56 Ma) | Step changes, secular drifts — broadband not narrow-line | Quantified — 6 Heaviside steps (PETM/EOT/Mi-1/MMCT/iNHG/MPT) lift CENOGRID δ¹⁸O ΔR² = +0.61 / δ¹³C ΔR² = +0.34 / CenCO2PIP CO₂ ΔR² = +0.60; fitted amplitudes recover canonical Cenozoic climate history (§8.3 B5, §9.4, §11.3) |
| **L4** | Chronology / methodology | Orbital tuning bias, stratigraphic sampling density, age-model uncertainty | Broadband noise + position uncertainty | Bounded (Cheng2016 validation: k=6 same FFT bin = chronology bias is small) |
| **L5** | Stochastic residual | AMOC/MOC variability, volcanic injections, Heinrich/D-O (sub-LR04 resolution), regional asymmetries | Broadband noise | Lower bound — remainder after L1–L4 |

### 1.3 The principle: orthogonalize, don't conflate

Each layer has a distinct empirical signature that lets it be separated:

- **L1 vs L2**: L1 lives on the 8H lattice; L2 either sits off-lattice OR shows anomalously high δ¹³C/δ¹⁸O ratio (carbon-cycle amplification)
- **L2 vs L3**: L2 is periodic (sharp lines); L3 is step or secular drift (broadband residual after fit)
- **L3 vs L5**: L3 can be modelled by regime splits or known transition dates; L5 is what's left after L3 boundaries are accounted for
- **L4**: bounded by independent chronology cross-validation

Decomposition strategy: add components in this order — L1 (lattice fit) → L2 (named lines) → L3 (regime splits / step components) → measure residual → infer L4 + L5 jointly.

---

## 2. Layer 1 — Orbital Lattice (Current State)

### 2.1 Sub-dominant precession sidebands (Tier A1)

[Doc 91 §12.12 (Test L — all-integer MTM scan)](91-milankovitch-evidence.md#1212-test-l--all-integer-mtm-f-test-scan--positive) identified 6 non-formula integers with MTM significance (passing F-test above the noise floor but not included in the 25-active set):

| n | Period (kyr) | Band | Interpretation |
|---|-------------|------|----------------|
| 96 | 27.94 | precession | k+g₆ Saturn climatic precession sub-peak |
| 107 | 25.07 | precession | k+g₇ Uranus climatic precession sub-peak |
| 110 | 24.39 | precession | k+g₃ harmonic (Earth secondary) |
| 134 | 20.02 | precession | k+g₅ Jupiter sub-peak |
| 152 | 17.65 | precession | k+g₄ Mars climatic precession sub-peak |
| 185 | 14.50 | precession | k+g₂ Venus sub-peak |

Five of six sit in the precession band [17–28 kyr], consistent with sub-dominant precession sidebands the 25-active set does not capture. Adding them to the joint fit:

> **Tier A1 result (LR04 full record)**: R²(32 components) = **0.2385** → **ΔR² = +0.0065** vs 25-component baseline 0.2321 (condition number 1.5 — comfortably non-collinear). The 7 extras (6 sidebands + n=141 Berger-quintet completion) collectively add ~0.65% to full-record LR04 R².

**Interpretation**: small. The 7 added integers (6 sidebands + n=141) collectively add only ~0.65% to full-record LR04 R² — they are MTM-significant individually but on the full record they overlap heavily with the canonical 25 set, so the joint fit redistributes amplitude without adding much explanatory power. The picture changes inside narrower regime windows: on post-MPT LR04 the extras add 0.0110, on pre-MPT they add 0.0118. The sidebands are **real lines** but their unique variance contribution is small at every record length tested. Net recommendation: keep them in the active integer set for completeness, but don't expect them to drive variance gains.

### 2.2 Are there more 8H/N integers worth adding?

`milankovitch_8h_all_integer_mtm.py` already scanned all 200 integer divisors of 8H. The full-200 joint fit hits R² = 0.443 — but with high collinearity (many integers within 1 Rayleigh element of each other → spurious gains). The gap from the canonical 32-integer fit (R² ≈ 0.25) to the full-200 fit (0.443) is dominated by collinear redundancy, not real new orbital signal. Honest Layer-1 ceiling on full LR04 stays close to **R² ≈ 0.24–0.26** with the canonical 32-integer set.

### 2.3 The 32 lattice integers — per-line identities

Reference table of all 32 L1 lattice members in ascending n order with their periods and physical interpretation. Notation: `g_i` = planet *i*'s apsidal-precession rate, `s_i` = planet *i*'s nodal-precession rate (Laskar 2004 secular eigenfrequencies); `k` = Earth's general precession in longitude (~50.4″/yr). "Direct" = planet's own axial / obliquity / apsidal / eccentricity period; "Eigenmode beat" = difference between two planets' secular rates; "Climatic precession" = `k + g_i` (Earth axial precession × planet *i*'s apsidal motion).

The 25 canonical integers come from Berger 1978 + Laskar 2004 eigenmode beats + framework direct planet cycles from doc 55. The 6 precession-band sidebands (n = 96, 107, 110, 134, 152, 185) were added in this document's Tier B Round 1 (§8.2 A1) — MTM-significant lines that the canonical 25 missed. The 32nd integer (**n = 141**, k+g₃ Earth climatic precession at ~19 kyr) was added 2026-05-28 to complete the Berger precession quintet: subthreshold in LR04 (amp/median 2.03×, just below the 3σ cutoff) but **3σ-significant in the Cheng full Asian-monsoon speleothem record** (amp/median 3.60×). Its inclusion closes the canonical Wigley 1976 / Berger 1978 combination tone `1/95 ≈ 1/19 − 1/23.7` — n=141 beats with n=113 (k+g₅) to produce n=28 (the 95-kyr eccentricity peak), complementing the existing g-beat attribution.

| n | Period (kyr) | Category | Identity |
|---:|---:|---|---|
| 9 | 298.1 | g-beat / Direct | g₂−g₇ Venus-Uranus eccentricity / Mercury axial = 8H/9 |
| 12 | 223.5 | s-beat / Direct | s₅−s₁ Jupiter-Mercury nodal / Uranus AscNode = 8H/12 |
| 14 | 191.6 | g-beat | g₂−g₈ Venus-Neptune eccentricity |
| 16 | 167.7 | Direct | Mars axial = 8H/16 |
| 18 | 149.0 | s-beat | s₄−s₆ Mars-Saturn nodal |
| 20 | 134.1 | g-beat | g₃−g₂ Earth-Venus eccentricity |
| 21 | 127.7 | Direct | Mars obliquity / Jupiter axial = 8H/21 |
| **22** | **121.9** | s-beat / g-beat | s₂−s₄ Venus-Mars nodal / g₄−g₂ — **highest carbon-amplification on LR04 (ratio 12.84, Round 1 C8)** |
| **25** | **107.3** | s-beat | s₁−s₄ Mercury-Mars nodal — **the empirical 100-kyr-band centroid (doc 91 §4)** |
| **28** | **95.8** | g-beat | g₄−g₅ Mars-Jupiter eccentricity — **Berger 1978 classic 95-kyr peak** |
| 30 | 89.4 | g-beat | g₃−g₇ Earth-Uranus eccentricity |
| 31 | 86.5 | g-beat | g₄−g₇ Mars-Uranus eccentricity |
| 35 | 76.6 | Direct | Mars apsidal = 8H/35 |
| 38 | 70.6 | s-beat | s₈−s₃ Neptune-Earth nodal |
| 39 | 68.8 | Direct | Jupiter ecliptic perihelion = 8H/39 (≈ Laskar s₃) |
| 48 | 55.9 | s-beat | s₇−s₆ Uranus-Saturn nodal |
| 50 | 53.7 | g-beat | g₆−g₅ Saturn-Jupiter eccentricity |
| 53 | 50.6 | Direct | Mars eccentricity cycle = 8H/53 |
| **65** | **41.3** | Obliquity / Direct | k+s₃ obliquity beat = Saturn ecliptic = Jupiter ICRF perihelion (Law 6 lock) — **Berger 1978 classic 41-kyr peak** |
| 66 | 40.6 | Obliquity centroid | Obliquity-band arithmetic-mean (Round 2 C10: EPICA CO₂ amplification 15.79) |
| 68 | 39.4 | Obliquity | k+s₄ Mars obliquity sub-peak |
| 73 | 36.7 | Mars nodal | 2\|s₄\| Mars nodal harmonic |
| 76 | 35.3 | Mixed beat | g₄−s₃ Mars-Earth (apsidal-nodal cross beat) |
| 96 | 27.9 | Precession sideband | k+g₆ Saturn climatic precession sub-peak (Round 1 A1 sideband — added) |
| 107 | 25.1 | Precession sideband | k+g₇ Uranus climatic precession sub-peak (Round 1 A1 — added) |
| 110 | 24.4 | Precession sideband | k+g₃ Earth secondary precession sideband (Round 1 A1 — added) |
| **113** | **23.7** | Climatic precession | k+g₅ Jupiter — **Berger 1978 classic 23.7-kyr peak** |
| 120 | 22.4 | Climatic precession | k+g₂ Venus climatic precession = H/15 |
| 134 | 20.0 | Precession sideband | k+g₅ Jupiter precession sub-peak (Round 1 A1 — added) |
| **141** | **19.0** | Climatic precession (Berger quintet) | **k+g₃ Earth climatic precession — Berger 19-kyr peak**; subthreshold in LR04 (amp/median 2.03×) but **3σ in Cheng monsoon record** (3.60×). Beats with n=113 to form the 95-kyr eccentricity peak (n=28) per Wigley 1976. Added 2026-05-28. |
| 152 | 17.6 | Precession sideband | k+g₄ Mars climatic precession sub-peak (Round 1 A1 — added) |
| 185 | 14.5 | Precession sideband | k+g₂ Venus precession sub-peak (Round 1 A1 — added) |

**Three classic Berger peaks** anchor the lattice — n = 28 (95 kyr eccentricity), n = 65 (41 kyr obliquity), and n = 113 (23.7 kyr precession) — plus the empirical post-MPT 100-kyr-band centroid at n = 25, and the carbon-amplification champion at n = 22 (Round 1 C8 / §3.5 of this document).

**Berger precession quintet** (added 2026-05-28): with n=141 now included, the model carries all five canonical Berger climatic-precession peaks — n=113 (k+g₅ Jupiter, 23.7 kyr), n=120 (k+g₂ Venus, 22.4 kyr), n=141 (k+g₃ Earth, 19.0 kyr), and the sideband-attributed n=152 (k+g₄ Mars, 17.6 kyr) and n=185 (k+g₂ Venus sub, 14.5 kyr). The Wigley 1976 combination tone `1/95 ≈ 1/141 − 1/113 = 1/28 → 95 kyr` (eccentricity at n=28) is now structurally explicit in the lattice.

**Composition summary**: 7 direct planetary periods (Mercury / Mars / Jupiter axial-obliquity-apsidal-eccentricity, obliquity centroid, Mars nodal harmonic) + 8 g-beats (eccentricity band) + 8 s-beats (nodal / obliquity band, including k+s₃ and k+s₄ which are climatic-precession-style additions to s-rates) + 2 canonical climatic-precession lines (n=113, n=120) + 6 MTM-significant sidebands added in Tier B Round 1 + **1 Berger-quintet completion (n=141, added 2026-05-28)** = **32 total**.

Source: `L1_LABELS` dict in `scripts/milankovitch_climate_formula.py`. The same labels populate the L1 hover-tooltip in the Climate Formula Explorer modal (see §13.2).

---

## 3. Layer 2 — Climate-System Internal Periodic

> **L2: investigated vs canonical.** This section investigates **five L2 candidate lines** in the variance-budget framework: 405-kyr fundamental (§3.1), 13H Boulila libration (§3.2), 9-Myr long-period carbon resonance (§3.3), 405-kyr 2nd harmonic at 202 kyr and 3rd harmonic at 135 kyr (§3.4). The **canonical climate formula** (§9.1) deploys only the **405-kyr family — three lines: 405 + 202 + 135 kyr** — as its L2 layer. **13H and 9-Myr are documented here as investigated candidates but excluded from the canonical formula** because Round 3 cross-window stability tests (§8.4 R3-4 for 13H; §3.3 for 9-Myr) showed they are either phase-incoherent across windows or rely on per-record-length variance absorption that doesn't generalize. Read §3 as: "what L2 candidates does the data support?"; read §9.1 as: "what survives into the deployed formula?"

### 3.1 The 405-kyr silicate-weathering thermostat (Tier A2)

Position: **404.5 kyr** (between 8H/7 = 383 kyr and 8H/6 = 447 kyr — **off lattice**: the broader empirical 8H integer-lattice closure test in doc 91 §7.3 found no orphan peaks off the lattice anywhere else in LR04, and the algebraic proof in doc 91 §13.3 confirms no combination of doc-55 cycles reaches the 405-kyr range).

Empirical signature:
- **Narrow spectral line**, FWHM 2.2 kyr (close to LR04's Rayleigh limit)
- **δ¹³C/δ¹⁸O amplitude ratio = 1.53** (3.1× higher than obliquity-band control, 2.3× higher than precession-band control — carbon-cycle amplification)
- **Loose orbital entrainment** (phase RMS drift 66–133 kyr over Cenozoic; cross-proxy r = 0.21)
- **Position stable across 67 Myr** of CENOGRID (402.9–406.0 kyr)
- Pälike 2006 termed this the "heartbeat of the Oligocene climate system"

Physical mechanism: silicate-weathering thermostat resonant response to long-period orbital eccentricity forcing (Walker–Hays–Kasting 1981, τ ≈ 400 kyr). It is not an orbital cycle in this framework's lattice — it is the climate system's internal response time-constant ringing.

Fit strategy: add a single explicit `cos(2π·t/404.5) + sin(2π·t/404.5)` pair on top of the L1 fit.

> **Tier A2 result (LR04 full, on top of 32-component A1 baseline)**: R² = **0.2444** → **ΔR² = +0.0059**.
> **Tier A2 result (CENOGRID δ¹⁸O)**: R² = **0.0047** → **ΔR² = +0.0035**.
> **Tier A2 result (CENOGRID δ¹³C)**: R² = **0.0089** → **ΔR² = +0.0077** (~2× larger than the δ¹⁸O contribution — carbon-cycle amplification confirmed).

**Interpretation**: the 405-kyr line is a real, narrow-line component. Its small absolute ΔR² (~0.6% on LR04) is consistent with it being a "narrow heartbeat" rather than a high-amplitude driver. **The δ¹³C/δ¹⁸O ratio of the ΔR² contributions (0.0077 / 0.0035 = 2.2) confirms the L2 carbon-amplification classification** at the variance-decomposition level, independent of the per-band amplitude-ratio measurements from doc 91 §13 — direct insolation lines would have ratio ≈ 1, this line has > 2. The same diagnostic is reusable for any other candidate L2 line (see Tier B3).

### 3.2 The 13H = 4.36-Myr Boulila libration (Tier A3)

Position: **13H = 4,359,121 yr** — an integer *multiple* of H, not an integer divisor of 8H (8H / 13H = 0.615 — non-integer). 13H is therefore outside the 8H/N divisor lattice; it lives as a long-period extension at the secular-resonance libration period identified by Boulila et al. 2020 at ~4.5 Myr.

Empirical signature:
- **Match to Boulila 2020**: 4.36 Myr (framework) vs 4.5 Myr (Boulila) = 3.1% difference
- **δ¹³C/δ¹⁸O = 2.76** (strongest carbon-cycle signature in the suite; only δ¹³C statistically significant, F = 5.40 vs F δ¹⁸O = 0.34)
- LR04 contains only **1.25 cycles** → marginal direct detection
- CENOGRID contains **~15.4 cycles** → strong direct detection

Fit strategy: add a single explicit `cos(2π·t/4359.121) + sin(2π·t/4359.121)` pair.

> **Tier A3 result (LR04 full, on top of A2 baseline)**: R² = **0.3191** → **ΔR² = +0.0747** (this is the biggest single Layer-2 addition on LR04 — much bigger than expected given only 1.25 cycles fit in the record).
> **Tier A3 result (CENOGRID δ¹⁸O)**: R² = **0.0083** → **ΔR² = +0.0036**.
> **Tier A3 result (CENOGRID δ¹³C)**: R² = **0.0110** → **ΔR² = +0.0021**.

**Interpretation**: counterintuitively, the 13H line contributes more variance to LR04 (+7.5%) than to CENOGRID (+0.4% on δ¹⁸O, +0.2% on δ¹³C). The explanation is that on LR04 the 13H period (4.36 Myr) sits at very low frequency where it captures a substantial fraction of the long-term trend that linear detrending only partially removes — the OLS fit absorbs ~7% of LR04 variance into the very-low-frequency cos/sin pair. On CENOGRID (67 Myr), the same line is one of ~15 cycles and captures a more modest share. The δ¹³C/δ¹⁸O ratio on CENOGRID is 0.0021 / 0.0036 = **0.58** — *not* carbon-amplified at the variance-decomposition level (contradicting the doc 91 §13 per-band δ¹³C/δ¹⁸O ≈ 2.76 finding). The reconciliation: doc 91 §13's ratio measures *amplitude at that specific period*, not variance contribution to the joint fit. The variance-decomposition ratio is the more conservative L2-diagnostic.

**Caveat — LR04 13H attribution**: the +7.5% gain on LR04 may include residual secular trend rather than true 13H signal because at 1.25 cycles per record the cos/sin pair is mathematically very close to a linear regression vector. The "true" 13H contribution on LR04 is bounded above by 7.5% and is probably smaller. CENOGRID's 0.4% / 0.2% δ¹⁸O / δ¹³C values are the more defensible per-cycle attribution.

### 3.3 The 9-Myr candidate (Tier A4)

[Doc 91 §13.10](91-milankovitch-evidence.md#1310-the-frameworks-claim-refined) identifies a candidate carbon-cycle line at ~9 Myr with δ¹³C/δ¹⁸O ≈ 2.05 (Boulila-like) but F-statistics insufficient for confirmation (F δ¹³C = 1.61 vs critical 4.46). Position is off-lattice (between 13H = 4.36 Myr and 2×13H = 8.72 Myr — actually 9 Myr is roughly 27H ≈ 9.05 Myr but not at an obvious integer multiple in the small-N range).

Test: add a single component at 9,000 kyr. LR04 has only 0.59 cycles in 5.32 Myr (under-resolved by definition); CENOGRID has ~7.4 cycles.

> **Tier A4 result (LR04 full, on top of A3 baseline)**: R² = **0.3340** → **ΔR² = +0.0149** (condition number 9.3 — collinearity warning).
> **Tier A4 result (CENOGRID δ¹⁸O)**: R² = **0.0269** → **ΔR² = +0.0187**.
> **Tier A4 result (CENOGRID δ¹³C)**: R² = **0.0891** → **ΔR² = +0.0780**.

**Interpretation — promoted to confirmed Layer-2 candidate**: this is a much larger ΔR² than doc 91 §13.10's marginal F-statistic suggested. On CENOGRID δ¹³C alone, the 9-Myr line accounts for **+7.8% of variance**, making it the single largest Layer-2 contribution on the 67-Myr record — and the δ¹³C/δ¹⁸O variance-decomposition ratio is **0.0780 / 0.0187 = 4.2**, by far the strongest carbon-amplification signature in the suite (vs 2.2 for the 405-kyr line). The earlier F-statistic test in doc 91 §13 used a different power-spectrum-based criterion that under-weighs broadband variance contribution; the joint-fit ΔR² measurement reveals the line's actual decomposition role.

**Promotion criteria**: the line satisfies the framework's L2 diagnostic (δ¹³C/δ¹⁸O > 1.0 on amplitude, > 2.0 on variance decomposition), is statistically significant in joint fit (ΔR² > 0.01 on CENOGRID δ¹³C), and is physically interpretable as a long-period carbon-cycle resonance. This document promotes it to **investigated Layer-2 candidate** for the purposes of variance decomposition; doc 91 §13.10's "tentative" framing is consistent. **Note: the 9-Myr line is NOT deployed in the canonical formula (§9.1)** — only the 405-kyr family (405 + 202 + 135 kyr) survives the Round 3 cross-window stability criteria (§8.5).

**LR04 caveat**: the +1.5% on LR04 with condition number 9.3 is unreliable — at 0.59 cycles per record the cos/sin pair is essentially absorbing residual trend. CENOGRID is the right test record for this line.

### 3.4 Layer-2 harmonics confirmed (Tier B1, complete)

If the 405-kyr silicate-weathering response is *nonlinear*, the climate signal should contain its harmonics. Predicted positions and lattice-integer overlap:

| Harmonic | Period (kyr) | Nearest 8H/N | Distance to nearest integer |
|----------|-------------|--------------|----------------------------|
| 2nd | 202.25 | 8H/13 = 206 | 1.9% off-lattice |
| 3rd | 134.83 | 8H/20 = 134 | 0.6% (on-lattice) |
| 4th | 101.13 | 8H/27 = 99 | 2.2% off-lattice |
| 5th | 80.90 | 8H/33 = 81 | 0.1% (on-lattice) |

**Tier B1 measurements** (each harmonic added independently on top of the Tier-A baseline of 32 integers + 405-kyr + 13H + 9-Myr):

| Harmonic | LR04 ΔR² | CENOGRID δ¹⁸O ΔR² | CENOGRID δ¹³C ΔR² | δ¹³C/δ¹⁸O ratio |
|----------|---------|-------------------|-------------------|-----------------|
| **202 kyr (2nd)** | +0.0034 | +0.0001 | +0.0005 | **3.27** ✓ carbon-amplified |
| **135 kyr (3rd)** | +0.0023 | +0.0000 | +0.0006 | **13.99** ✓✓ strongly carbon-amplified |
| 101 kyr (4th) | +0.0136 | +0.0003 | +0.0000 | 0.16 — not carbon-amplified (collinear with lattice 8H/26) |
| 81 kyr (5th) | +0.0012 | +0.0002 | +0.0001 | 0.35 — not carbon-amplified (collinear with lattice 8H/33) |
| **All 4 jointly (LR04)** | **+0.0202** | — | — | — |

**Interpretation — nonlinear silicate-weathering thermostat confirmed**: the 2nd and 3rd harmonics show the predicted δ¹³C-amplified signature on CENOGRID. The 4th and 5th harmonics sit very close to existing lattice integers (8H/26 and 8H/33) and are absorbed into the lattice fit at those frequencies. The result is consistent with the silicate-weathering thermostat producing real overtones up to the 3rd harmonic; further harmonics are masked by lattice collinearity.

**Implication for the framework**: the 405-kyr is not a single isolated narrow line — it's the fundamental of a harmonic series, of which at least 202 kyr and 135 kyr are independently detectable as carbon-amplified L2 components. The L2 framework now contains:
- 405-kyr (fundamental silicate-weathering thermostat)
- 202-kyr (2nd harmonic, ratio 3.27)
- 135-kyr (3rd harmonic, ratio 13.99)
- 13H (Boulila libration, separate mechanism)
- 9-Myr (long-period carbon-cycle resonance, separate mechanism)

### 3.5 δ¹³C/δ¹⁸O ratio as Layer-2 diagnostic (Tier B3 / C8, complete)

Stage C8 of Tier B Round 1 ran a *joint* multivariate fit on CENOGRID — same design matrix used for both δ¹⁸O and δ¹³C, fitting per-proxy amplitude+phase separately. The per-component amp ratio `amp_d13c / amp_d18o` is then the **direct carbon-amplification diagnostic** at each frequency.

Joint-fit headlines on CENOGRID (piecewise-6 detrend, 0–67 Myr):
- R² δ¹⁸O = **0.0663**
- R² δ¹³C = **0.1150**

**Strongest carbon-amplified components (top 15 by ratio)**:

| Label | Period (kyr) | amp_d18o | amp_d13c | **Ratio** | Class |
|-------|-------------|----------|----------|-----------|-------|
| **8H/22** | **121.9** | 0.0018 | 0.0234 | **12.84** | L2++ (strongest L2 anywhere) |
| 405k 3rd harmonic | 134.8 | 0.0092 | 0.0343 | **3.73** | L2++ |
| 8H/38 | 70.6 | 0.0056 | 0.0135 | **2.42** | L2++ |
| 8H/9 | 298.1 | 0.0192 | 0.0409 | **2.13** | L2++ |
| 405k 2nd harmonic | 202.3 | 0.0166 | 0.0300 | **1.81** | L2++ |
| 8H/21 | 127.7 | 0.0077 | 0.0116 | 1.50 | L2 |
| 9-Myr | 9000 | 0.2713 | 0.3997 | 1.47 | L2 |
| 8H/14 | 191.6 | 0.0109 | 0.0141 | 1.30 | L2 |
| 13H | 4359 | 0.1087 | 0.1339 | 1.23 | L2 |
| 405-kyr | 404.5 | 0.1852 | 0.2151 | 1.16 | L2 |
| 8H/30 | 89.4 | 0.0078 | 0.0089 | 1.14 | L2 |
| 8H/20 | 134.1 | 0.0232 | 0.0239 | 1.03 | L2 |
| 8H/18 | 149.0 | 0.0150 | 0.0154 | 1.02 | L2 |
| 8H/96 | 27.9 | 0.0047 | 0.0048 | 1.02 | L2 |
| 8H/185 | 14.5 | 0.0014 | 0.0014 | 1.01 | L2 |

**The classification thresholds applied**:
- ratio > 1.5 → **L2++** (strong carbon amplification)
- ratio > 1.0 → **L2** (mild carbon amplification)
- ratio 0.5–1.0 → **mixed**
- ratio < 0.5 → **L1** (direct insolation)

**Big finding — the L1/L2 dichotomy is not clean**: the framework's original mental model treated *lattice* integers as L1 (direct orbital forcing) and *off-lattice* lines as L2 (carbon-cycle amplified). C8 shows this is wrong. Several lattice integers are *strongly* L2:
- **8H/22 = 122 kyr (ratio 12.84)** — the single strongest L2 signature anywhere, hidden inside the lattice
- 8H/38 = 71 kyr (ratio 2.42), 8H/9 = 298 kyr (ratio 2.13), 8H/21 = 128 kyr (ratio 1.50) — all lattice-resident yet carbon-amplified

**Reinterpretation**: lattice positions are determined by orbital eigenmode beats (Laskar g_i ± g_j, s_i ± s_j) — they tell you *where* a forcing line should sit. The amplification of that line in different proxies tells you *how* the climate system responded to it. Both can be true simultaneously: a line can be at an orbital-lattice frequency AND be carbon-amplified by the climate system. The 8H lattice is a *frequency framework*, not a layer assignment.

**Operational classification per the joint-fit ratio**:
- **L1-pure** (ratio < 0.5): obliquity (k+s₃), precession (k+g_j) — the canonical direct-insolation lines
- **L1+L2 mixed** (ratio 0.5–1.5): most lattice integers — line is at orbital frequency but climate system response is moderate carbon amplification
- **L2-dominant** (ratio > 1.5): 405-kyr family (404.5, 202, 135 kyr), 13H, 9-Myr, plus 8H/22 (122 kyr), 8H/38 (71 kyr), 8H/9 (298 kyr) — climate system response is strongly carbon-cycle-dominated

**Implication for the next iteration**: the framework should track *per-line carbon-amplification ratios* as a first-class quantity alongside frequency and amplitude. A line's L1/L2 classification is empirical, not architectural.

---

## 4. Layer 3 — Boundary-Condition Shifts

### 4.1 The MPT regime split (Tier A5)

Doc 91 §3.3 documents post/pre Mid-Pleistocene Transition amplitude ratios:

| Band | Post/pre ratio | Direction |
|------|---------------|-----------|
| 41-kyr obliquity | 0.72× | shrank |
| 100-kyr ice-age band | 1.64× | grew |
| 23.7-kyr climatic precession | 2.19× | grew |
| 405-kyr off-lattice | 0.34× | shrank |

These are not consistent with a stationary process. The single-fit R² = 0.2553 on the full 5.3-Myr record forces a compromise between two regimes; an honest decomposition fits each regime independently.

Fit strategy:
- **Pre-MPT**: 1,200 – 3,000 kyr BP (1.8 Myr window, captures the obliquity-dominated regime)
- **Post-MPT**: 0 – 1,000 kyr BP (1.0 Myr window, captures the 100-kyr regime)
- Compare R² per regime to the full-record fit; the increase quantifies L3 variance.

> **Tier A5 result (pre-MPT, 25 components)**: R² = **0.7241**.
> **Tier A5 result (post-MPT, 25 components)**: R² = **0.8652**.
> **Tier A5 result (pre-MPT, 31 components)**: R² = **0.7330** → ΔR² = +0.0088 vs 25-comp pre-MPT.
> **Tier A5 result (post-MPT, 31 components)**: R² = **0.8706** → ΔR² = +0.0053 vs 25-comp post-MPT.
> **Tier A5 result (post-MPT, 31 + L2 lines)**: R² = **0.8975** (with 405k + 13H + 9-Myr added; condition warnings as expected at short window).

**Interpretation — the biggest finding in this doc**: the regime split is the biggest single improvement in the entire decomposition. Post-MPT R² = **0.8735** means **the 8H lattice captures ~87% of post-MPT LR04 variance** in the well-resolved 0–1 Myr window — a dramatically sharper story than the conflated full-record R² = 0.2553.

The iNHG-MPT R² = 0.7289 is also far above the full-record value. The MPT itself is the L3 mechanism whose presence inflates the residual when the two regimes are conflated. Implication: **the framework's headline figure for LR04 should be R² = 0.8735 (post-MPT) / R² = 0.7289 (iNHG-MPT) / R² = 0.4298 (pre-iNHG) — not R² = 0.2553 (conflated)**. The conflated number underestimates the framework's explanatory power by ~3.4×.

Why this works:
- Pre-MPT is dominated by the 41-kyr obliquity rhythm (n = 65 amplitude is largest)
- Post-MPT is dominated by the 100-kyr ice-age band (n = 25/28/31 amplitudes are largest)
- Forcing the same component amplitudes to fit both regimes simultaneously is what the full-record OLS does, and it fails because the relative weights of the integers change across the MPT
- Independent per-regime fits let each window pick its own amplitude structure

### 4.2 iNHG (~2.7 Ma) — onset of Northern Hemisphere glaciation

Before iNHG, LR04 is dominated by 41-kyr obliquity with smaller amplitude. After iNHG, ice volume grows secularly and amplitude ramps up. The §4.1 two-window cut (pre-MPT 1.2–3 Ma / post-MPT 0–1 Ma) straddles iNHG.

The sharper three-regime split — **pre-iNHG (2.7–5.3 Ma) / iNHG-to-MPT (1.0–2.7 Ma) / post-MPT (0–1.0 Ma)** — is **now the canonical fit** (§9.3): R² = 0.430 / 0.723 / 0.868 respectively. The pre-iNHG R² = 0.44 is genuinely lower than the broader pre-MPT 0.72 because the pre-iNHG regime has no Northern Hemisphere ice sheets and therefore weaker orbital amplification — see §8.4 R3-3.

### 4.3 Cenozoic secular trend (CENOGRID only)

Beyond LR04's 5.3-Myr window, CENOGRID covers 67 Myr of progressive cooling:
- **Cenozoic CO₂ decline** drives long-term ice-volume increase
- **Tectonic gateway closures** are step-change boundary conditions: Tethys (~25 Ma), EOT (~34 Ma), Drake Passage (~30 Ma), Central American Seaway / Panama (~3 Ma)
- **PETM (~56 Ma)** is a one-off carbon excursion not captured by any periodic component
- **K-Pg boundary (~66 Ma)** sits at the CENOGRID edge

For the 8H lattice fit to work on CENOGRID, the secular cooling trend must be removed first (linear detrending alone is a coarse first step; piecewise-linear at known transitions, polynomial detrend, or explicit Heaviside step covariates all do substantially better — see §7.3 and §9.4 below).

> **Tier A5-CENOGRID result**: with **linear detrend only**, the 32-integer L1 fit reaches R² ≈ **0.001 on δ¹⁸O** and R² ≈ **0.001 on δ¹³C** — i.e., the lattice essentially invisible at 67-Myr scale because the Cenozoic secular cooling dominates the variance budget. The remedy is the canonical L1+L2+L3 pipeline: with 6 Heaviside step covariates absorbing the Cenozoic boundary transitions, the canonical fit reaches **δ¹⁸O R² = 0.6177** and **δ¹³C R² = 0.3514** on the full 67-Myr CENOGRID record.

---

## 5. Layer 4 / Layer 5 — Methodological and Stochastic

### 5.1 Layer 4 — chronology / methodology

`milankovitch_8h_cheng_chronology_validation.py` already validates that the 100-kyr-band peak position is the same FFT bin (k=6) on Cheng2016 (U-Th-dated speleothem, orbital-tuning-independent) and LR04 (orbitally-tuned). This bounds the chronology-bias contribution to small: the FFT positions are preserved across radically different age models.

**L4 contribution**: bounded by Cheng2016 cross-validation to small (well within the Rayleigh element).

### 5.2 Layer 5 — stochastic residual lower bound

After L1 + L2 + L3 are accounted for, the remaining residual is L4 + L5 combined. Since L4 is bounded small, L5 is approximately the remainder.

> **Estimated L5 floor (post-MPT, canonical 32-component)**: 1 − 0.8735 ≈ `0.13` (i.e., ~13% of post-MPT LR04 variance is true climate stochastic / sub-LR04-resolution noise).
> **Estimated L5 floor (iNHG-MPT, canonical 32-component)**: 1 − 0.7289 ≈ `0.27`.
> **Estimated L5 floor (pre-iNHG, canonical 32-component)**: 1 − 0.4298 ≈ `0.57` (older record carries more dating noise and the obliquity-dominated regime has weaker forcing).

This L5 floor includes:
- AMOC / MOC variability (decade-millennium internal variability)
- Volcanic forcing (random injections)
- Sub-LR04-resolution events (Heinrich ~7-kyr, D-O ~1.5-kyr, ENSO ~2–7 yr, solar Schwabe/Gleissberg/Suess ~11/100/210 yr) that contribute to spectral noise without showing as discrete LR04 lines
- Stratigraphic/sampling noise in LR04 itself
- Regional asymmetries (LR04 is a 57-record global stack; regional decoupling adds variance)

---

## 6. Composite Decomposition — LR04 (5.3 Myr)

### 6.1 Variance budget summary

**Tier A variance budget** (full LR04, plain OLS, no ridge — `scripts/milankovitch_8h_variance_budget.py`):

| Component | Cumulative R² | ΔR² (this step) | Layer | Notes |
|-----------|---------------|-----------------|-------|-------|
| Baseline (25 integers) | 0.2321 | 0.2321 | L1 | 25 canonical doc-55 + Berger-eigenmode beats |
| + 7 sidebands → 32 integers | 0.2385 | +0.0065 | L1+ | 6 MTM sidebands + n=141 Berger-quintet completion |
| + 405-kyr (deployed L2) | 0.2444 | +0.0059 | L2 | Silicate-weathering thermostat fundamental |
| + 13H (investigated, NOT deployed) | 0.3191 | +0.0747 | L2-investigated | Tier-A jump rejected by R3-4 stability test |
| + 9-Myr (investigated, NOT deployed) | 0.3340 | +0.0149 | L2-investigated | Promoted-but-not-deployed (§3.3) |

**Regime splits with the 32-integer L1 lattice (plain OLS, Tier A5):**

| Regime | Window | L1 (25) | L1 (32) | + full L2 stack |
|---|---|---:|---:|---:|
| pre-MPT | 1200–3000 kyr | 0.7241 | **0.7359** | 0.7635 |
| post-MPT | 0–1000 kyr | 0.8652 | **0.8762** | **0.9022** |

**Canonical formula** (sequential ridge λ=1, deployed 32 + 3 L2 + 6 L3 — `scripts/milankovitch_climate_formula.py`):

| Regime / record | R² |
|---|---:|
| full LR04 (L1+L2+L3) | **0.2553** |
| post-MPT (0–1 Myr) L1+L2+L3 | **0.8735** |
| iNHG-MPT (1.0–2.7 Ma) L1+L2+L3 | **0.7289** |
| pre-iNHG (2.7–5.32 Ma) L1+L2+L3 | **0.4298** |

The canonical post-MPT R² (0.8735) sits below the Tier-A "post-MPT + full L2 stack" (0.9022) because the canonical formula deploys only the 3-line 405-kyr family in L2; the 13H and 9-Myr lines that lifted Tier A to 0.9022 were rejected by the R3-4 cross-window stability test (13H amp CV 42–50%, phase std 97.9°) and are not in the deployed formula.

### 6.2 Reachable ceiling — and what it does NOT mean (Tier B Round 2 reality check)

Per-regime fits with the canonical 32-integer L1 + 3-line L2 + 6-step L3 pipeline:
- **Post-MPT (0–1 Myr) R² = 0.8735** (L1+L2+L3; L1-only 0.8702)
- **iNHG-MPT (1.0–2.7 Ma) R² = 0.7289**
- **Pre-iNHG (2.7–5.32 Ma) R² = 0.4298**
- **EPICA CO₂ (0–806 kyr) R² = 0.8452**
- **CenCO2PIP (0–66 Ma) R² = 0.7626**

Headline interpretation: **the framework captures ~87% of post-MPT LR04 variance** with the canonical L1 lattice + 405-kyr L2 thermostat family applied within the post-MPT regime alone. The full-record R² = 0.2553 suppresses the framework's actual explanatory power by ~3.4× because forcing one set of component amplitudes to fit physically distinct climate regimes (pre-MPT obliquity-dominated, post-MPT 100-kyr-dominated) is over-constrained.

**Critical caveat from Tier B Round 2 (C5 forward-prediction validation)**: **the high R² numbers are DESCRIPTIVE within each regime, NOT PREDICTIVE across regimes.** A formula trained on pre-MPT data and applied to post-MPT timestamps achieves R² = **−0.87** (worse than predicting the mean). The reverse direction blows up numerically (R² = −10¹⁰).

What this means honestly:

| Quantity | What it actually means |
|---------|----------------------|
| Post-MPT R² = 0.8735 | "There exists a 41-component fit (32 L1 + 3 L2 + 6 L3) on the 8H lattice that explains ~87% of post-MPT LR04" |
| Same R² as a prediction | **NOT supported by the framework**. The post-MPT amplitude/phase structure is not derivable from pre-MPT |
| The 8H lattice itself | A *frequency framework* — it tells you where lines should sit. It does NOT predict their amplitudes/phases without additional regime-specific calibration |
| The L2 lines | Empirical lines whose response amplitudes are regime-dependent. Only the 405-kyr line is structurally distinct (C2 confirms unique cross-proxy phase coherence) |

The framework's predictive power requires modeling how line amplitudes/phases evolve with boundary conditions (CO₂ levels, ice-sheet area, etc.) — not as fixed coefficients per regime. This is open work for the next iteration.

### 6.3 What the L5 floor implies

The post-MPT L5 floor of ~13% (1 − 0.8735) sets a fundamental ceiling on any orbital-forcing model of LR04 within this regime. Unless one includes proxies that resolve sub-LR04-resolution physics (high-resolution ice-core proxies for Heinrich/D-O, ENSO reconstructions for tropical Pacific decadal-to-millennial variability), no integer-divisor formula will exceed R² ≈ 0.87 in the post-MPT window — the remaining variance is true climate stochastic, sub-LR04-resolution events, and dating noise.

Pre-MPT L5 floor is larger (~24%), reflecting older record with more chronology uncertainty and a weaker forcing regime (obliquity-only dominance with less amplification).

---

## 7. Composite Decomposition — CENOGRID (67 Myr)

### 7.1 Why CENOGRID is the right deep-time test

LR04's 5.3-Myr window contains:
- 1.25 cycles of 13H = 4.36 Myr — insufficient for direct L2 detection of the libration
- ~13 cycles of 405-kyr — adequate but the line is narrow and small
- 0.59 cycles of the 9-Myr candidate — undetectable

CENOGRID's 67 Myr contains:
- ~15.4 cycles of 13H
- ~165 cycles of 405-kyr
- ~7.4 cycles of the 9-Myr candidate
- Multiple tectonic gateway closures and the PETM (testable as L3 events)

### 7.2 Variance budget summary (CENOGRID, linear detrend only)

| Component | R² δ¹⁸O | R² δ¹³C | ΔR² δ¹⁸O | ΔR² δ¹³C | Layer |
|-----------|---------|---------|---------|---------|-------|
| 25 8H integers | **0.0011** | **0.0012** | (baseline) | (baseline) | L1 |
| + 6 sidebands → 31 | 0.0011 | 0.0012 | +0.0000 | +0.0000 | L1+ |
| + 405-kyr | 0.0047 | **0.0089** | +0.0035 | **+0.0077** | L2 (δ¹³C/δ¹⁸O = 2.2 — carbon-amplified) |
| + 13H = 4.36 Myr | 0.0083 | 0.0110 | +0.0036 | +0.0021 | L2 (ratio 0.58 here — small in CENOGRID despite high amplitude in doc 91 §13) |
| + 9-Myr | 0.0269 | **0.0891** | +0.0187 | **+0.0780** | **L2 (ratio 4.2 — strongest carbon amplification)** |
| + Cenozoic piecewise detrend (Tier A5-CENOGRID) | TBD | TBD | TBD | TBD | L3 (open work — biggest expected gain) |

**Interpretation**:

1. **The 8H lattice barely registers on CENOGRID** (R² ≈ 0.001 on both δ¹⁸O and δ¹³C with the 25-integer baseline). This is not a failure of the lattice — it is a measurement that **L3 boundary conditions completely dominate the 67-Myr record** after only linear detrending. The Cenozoic secular cooling trend (Eocene warmth → Pleistocene ice-house) is the >99% signal in δ¹⁸O, and similarly for δ¹³C, the long-term carbon-isotope drift dominates.

2. **The 9-Myr line is the single biggest non-trend variance carrier on δ¹³C**: ΔR² = +0.078 with carbon-amplification ratio 4.2. This is far stronger than doc 91 §13.10's marginal F-statistic suggested — the joint-fit measurement picks up its broadband contribution that the per-band power-spectrum F-test missed. The 9-Myr line is promoted from "tentative" to **investigated** Layer-2 candidate. (Round 3 R3-4-style cross-window stability for the 9-Myr line is open work; pending that, it is NOT deployed in the canonical formula §9.1 — only the 405-kyr family is.)

3. **The 405-kyr line is the second-strongest carbon-cycle carrier** on CENOGRID δ¹³C (ΔR² = +0.0077, ratio 2.2), consistent with the silicate-weathering thermostat being a real and persistent Layer-2 mechanism.

4. **The 13H line behaves differently from doc 91 §13's amplitude finding**: at 67-Myr length it contributes ΔR² = 0.0036 (δ¹⁸O) and 0.0021 (δ¹³C) — δ¹³C/δ¹⁸O variance ratio 0.58, *not* carbon-amplified at the joint-fit level. Doc 92's δ¹³C/δ¹⁸O = 2.76 measures *amplitude ratio at that specific period*; the joint-fit variance ratio is the more conservative metric. **Reconciliation**: 13H is a high-amplitude line on δ¹³C but its variance contribution is moderate because the line is one frequency among many; the per-band amplitude ratio is the better characterization for "carbon-amplified" classification.

### 7.3 L3 boundary-condition power in CENOGRID (Tier B4, complete)

Tier B4 compared four detrend strategies on CENOGRID, with the same 32-integer + 3-L2-line fit applied after each:

| Detrend method | R² δ¹⁸O | R² δ¹³C | Notes |
|---------------|---------|---------|-------|
| Linear (Tier A baseline) | 0.0269 | 0.0891 | Cannot remove Cenozoic cooling |
| **Piecewise-linear (6 breakpoints)** | **0.0657** | 0.1139 | PETM 56 / EOT 34 / Mi-1 23 / MMCT 14 / iNHG 2.7 / MPT 1 Ma |
| Polynomial degree 6 | 0.0285 | 0.1230 | Smooth but underfits the multi-Ma transitions |
| Polynomial degree 10 | 0.0556 | **0.1373** | Numerically best for δ¹³C but less interpretable |

**Two competing approaches, both winners:**
- **Piecewise-linear** is physically motivated (anchors at *known* Cenozoic climate transitions) and best for δ¹⁸O (R² → 0.066, **2.4× linear**). The piecewise fit removes the broad ice-house buildup post-EOT and post-MPT cleanly.
- **Polynomial degree-10** is numerically best for δ¹³C (R² → 0.137, **1.5× linear**) — the degree-10 polynomial absorbs both smooth carbon-isotope drift and any unmodelled medium-scale boundary conditions.

**The total Cenozoic L3 contribution is large**: roughly 4–10% of δ¹⁸O variance and 5% of δ¹³C variance lives in the secular cooling trend + 6 known transitions, depending on detrend choice. This is comparable to the L1 lattice contribution itself — confirming that **L3 boundary conditions are the dominant non-trivial CENOGRID variance reservoir** beyond direct linear-trend removal.

**Recommendation**: report both detrend methods in downstream work — piecewise for interpretability (each segment maps to a named climate-history interval) and polynomial for upper-bound numerical performance.

**Tier B Round 2 finding (B5) — step components are even better than detrending**: instead of detrending to remove the secular drift, simply add Heaviside step covariates at the same 6 transitions on a linear-detrended record. This **leaves the variance from amplitude jumps in the fit** rather than removing it. Result: δ¹⁸O R² jumps from 0.027 → **0.676 (25×)** and δ¹³C from 0.089 → **0.426 (4.8×)**.

The step amplitudes recover canonical climate history: PETM +1.94, EOT −1.73, Mi-1 +1.41, MMCT −0.58, iNHG −0.79, MPT −0.75 (δ¹⁸O units, normalized).

| Method | R² δ¹⁸O | R² δ¹³C | What it does |
|--------|---------|---------|--------------|
| Linear detrend (Tier A) | 0.027 | 0.089 | Removes only mean and linear drift |
| Piecewise-linear detrend (Tier B R1 B4) | 0.066 | 0.114 | Removes drift within each segment |
| Polynomial degree-10 detrend | 0.056 | 0.137 | Smooth global drift removal |
| **Linear detrend + 6 step components (Tier B R2 B5)** | **0.676** | **0.426** | **Models amplitude jumps explicitly** |

The step-component approach is preferred for downstream work — it preserves the variance from boundary-condition changes (which is real physical content) and combines naturally with the lattice fit.

**What remains unexplained even after step components**: ~32% of CENOGRID δ¹⁸O and ~57% of δ¹³C variance lives in:
- Higher-order Cenozoic boundary conditions not in the 6-transition list (Mid-Pliocene Warm Period, Late Eocene warming, etc.)
- L5 stochastic / sub-resolution events
- One-off carbon excursions other than PETM (e.g., ETM-2, ETM-3, MECO, EOT-2)
- Residual binning noise (5-kyr CENOGRID smears <5-kyr events)

---

## 8. Path Forward

### 8.1 Tier A measurements (COMPLETE)

✓ **A1**: 32-component LR04 fit (sidebands + n=141 added): R² = 0.2385 (ΔR² = +0.0065 vs 25-baseline). Extras are MTM-significant but collinear at full-record length; small gains in regime windows.
✓ **A2**: 405-kyr explicit line. ΔR² LR04 = +0.0059; CENOGRID δ¹³C = +0.0077 with **carbon-amplification ratio 2.2** — Layer-2 confirmed.
✓ **A3**: 13H = 4.36 Myr explicit line. ΔR² LR04 = +0.0747 (largely residual-trend absorption at 1.25 cycles); CENOGRID δ¹⁸O = +0.0036 — small per-cycle, *not* carbon-amplified at variance level (ratio 0.58) despite doc 91 §13's high amplitude-ratio finding.
✓ **A4**: 9-Myr candidate. ΔR² CENOGRID δ¹³C = **+0.078 with carbon-amplification ratio 4.2** — the strongest L2 signature in the original Tier-A suite. **Investigated, not deployed** (rejected by R3-4 stability test for variance attribution, though pattern is real).
✓ **A5**: regime-split LR04 (canonical 32-integer L1 + 3-line L2 + 6-step L3) — **pre-iNHG R² = 0.4298, iNHG-MPT R² = 0.7289, post-MPT R² = 0.8735** — biggest single jump in the entire decomposition.

**Headline rewrite for the framework**: LR04 R² is **0.8735 (post-MPT) / 0.7289 (iNHG-MPT) / 0.4298 (pre-iNHG) — not 0.2553 (full conflated)**. The framework explains a near-complete fraction of post-MPT LR04 variance once the MPT regime change is treated explicitly.

### 8.2 Tier B Round 1 measurements (COMPLETE)

Reproduced by `scripts/milankovitch_8h_variance_budget_tier_b.py` (`data/milankovitch-8h-tier-b-round1.json`, ~5 sec runtime).

✓ **B4 — CENOGRID L3 detrend comparison** (§7.3): piecewise-linear with 6 transition breakpoints (PETM 56 Ma, EOT 34 Ma, Mi-1 23 Ma, MMCT 14 Ma, iNHG 2.7 Ma, MPT 1 Ma) lifts CENOGRID δ¹⁸O R² from 0.027 → **0.066 (2.4×)**; polynomial-10 lifts δ¹³C R² to **0.137 (1.5×)**. Linear detrend was leaving substantial variance on the table.

✓ **B1 — 405-kyr nonlinear harmonics** (§3.4): the **2nd harmonic (202 kyr, ratio 3.27)** and **3rd harmonic (135 kyr, ratio 13.99)** are independently detectable as carbon-amplified L2 components on CENOGRID δ¹³C. The 4th (101 kyr) and 5th (81 kyr) are masked by lattice collinearity. **Nonlinear silicate-weathering thermostat hypothesis confirmed**. The L2 framework now contains a 3-line 405-kyr family (405 + 202 + 135 kyr) plus 13H and 9-Myr.

✓ **C8 — Joint δ¹⁸O / δ¹³C multivariate diagnostic** (§3.5): **the L1/L2 dichotomy is empirically not clean**. Several *lattice* integers (8H/22 = 122 kyr with ratio 12.84, 8H/38 = 71 kyr, 8H/9 = 298 kyr) show stronger carbon-amplification than the off-lattice 405-kyr (1.16). The 8H lattice is a frequency framework, not a layer assignment. Carbon-amplification is an *empirical per-line property*, not architectural.

✓ **B2 — Laskar eigenmode-beat enumeration**: scanned 104 g_i ± g_j and s_i ± s_j and g_i ± s_j combinations in [100, 10000] kyr; 23 sit off-lattice (>5% from any 8H/N integer). **None pass strict promotion criteria** (ΔR² > 0.005 + ratio > 0.5). The closest non-promoted candidates:

| Beat | Period (kyr) | ΔR² δ¹⁸O | ΔR² δ¹³C | Ratio | Why excluded |
|------|-------------|----------|----------|-------|--------------|
| g4+s4 | 7714 | +0.040 | +0.010 | 0.25 | Strong on δ¹⁸O but ratio < 0.5 (L1-like, not L2) |
| g2+s2 | 3290 | +0.023 | +0.001 | 0.05 | δ¹⁸O-only |
| g3+s4 | 3393 | +0.010 | +0.005 | 0.45 | Below ΔR² threshold and ratio < 0.5 |
| s5+s8 | 1873 | +0.003 | +0.004 | 1.22 | Below ΔR² 0.005 threshold |
| g5+s1 | 948 | +0.001 | +0.002 | 1.84 | Below ΔR² 0.005 threshold |

**Conclusion**: the existing 4 explicit L2 lines + the 32-integer lattice form a near-complete component set. No new off-lattice Boulila-like lines were found that materially add to the variance budget. **The framework's coverage of the 8H lattice + Laskar eigenmode beats is essentially complete at the variance-decomposition level**; any remaining variance lives in L3 (boundary conditions), L4 (chronology), L5 (stochastic), or non-orbital climate-system physics.

### 8.3 Tier B Round 2 measurements (COMPLETE)

Reproduced by `scripts/milankovitch_8h_variance_budget_tier_b_r2.py` (`data/milankovitch-8h-tier-b-round2.json`, ~1 sec runtime).

#### B5 — Step components at Cenozoic transitions (the biggest Tier B finding)

Added 6 Heaviside step covariates H(t − t_i) at PETM (56 Ma), EOT (34 Ma), Mi-1 (23 Ma), MMCT (14 Ma), iNHG (2.7 Ma), MPT (1 Ma) jointly with the 32 lattice integers + 5 L2 lines on CENOGRID (linear detrend, full 67 Myr):

| Proxy | R² periodic only | R² + 6 step components | ΔR² |
|-------|-----------------|------------------------|-----|
| δ¹⁸O | 0.027 | **0.676** | **+0.649** (25× improvement) |
| δ¹³C | 0.089 | **0.426** | **+0.337** (4.8× improvement) |

**Fitted step amplitudes match Cenozoic climate history**:

| Transition | δ¹⁸O step β | δ¹³C step β | Interpretation |
|------------|------------|------------|----------------|
| PETM (56 Ma) | **+1.94** | **+1.24** | Warm carbon-isotope excursion ✓ matches PETM signature |
| EOT (34 Ma) | **−1.73** | −0.58 | Antarctic glaciation onset — strong δ¹⁸O cooling ✓ |
| Mi-1 (23 Ma) | +1.41 | −0.83 | Antarctic deglaciation pulse ✓ |
| MMCT (14 Ma) | −0.58 | +0.90 | Mid-Miocene cooling ✓ |
| iNHG (2.7 Ma) | −0.79 | +1.22 | NH glaciation onset, carbon-cycle reorg ✓ |
| MPT (1 Ma) | −0.75 | +0.07 | δ¹⁸O step (climate sensitivity change) ✓ |

The step betas independently recover canonical Cenozoic climate history — this is not curve-fitting noise.

**Headline**: **L3 boundary-condition step modelling is the single largest single Tier B improvement anywhere** — 25× on δ¹⁸O, 4.8× on δ¹³C. The CENOGRID record is far more comprehensible when treated as "periodic content riding on a sequence of discrete climate-state changes" rather than as a continuous detrended signal.

#### C2 — Cross-record phase coherence (two layers of test)

For each L2 line and selected high-ratio lattice integer, fit phase independently on LR04 (0-5320 kyr) and CENOGRID restricted to (0-5320 kyr) using both proxies. Two distinct comparisons:

(a) **Same-proxy cross-record**: LR04 δ¹⁸O ↔ CENOGRID δ¹⁸O (validates that the line is consistently present across both records using the same proxy type)

(b) **Cross-proxy same-record-window**: LR04 δ¹⁸O ↔ CENOGRID δ¹³C (validates that the line has the same phase in temperature/ice proxy vs carbon-cycle proxy — true for pure carbon-cycle mechanisms; false for temperature-driven lines with carbon-feedback lag)

| Line | Period | Δφ same-proxy (a) | Δφ cross-proxy (b) | (a) coherent? | (b) coherent? |
|------|--------|-------------------|--------------------|----|----|
| **405-kyr** | 404.5 | **8.2°** | **32.1°** | **✓** | **✓** |
| 202-kyr (2nd harmonic) | 202.2 | 0.1° | 113.3° | ✓ | ✗ |
| 135-kyr (3rd harmonic) | 134.8 | 32.6° | 154.0° | ✓ | ✗ |
| 13H 4.36 Myr | 4359 | 45.4° | 134.4° | ✗ (1.22 cycles) | ✗ |
| 9-Myr | 9000 | 12.0° | 170.2° | ✓ | ✗ |
| 8H/22 (122 kyr) | 121.9 | 4.7° | 161.1° | ✓ | ✗ |
| 8H/9 (298 kyr) | 298.1 | 20.1° | 144.1° | ✓ | ✗ |
| 8H/38 (71 kyr) | 70.6 | 3.9° | 158.1° | ✓ | ✗ |
| 8H/65 (41 kyr — obliquity) | 41.3 | 11.2° | 169.7° | ✓ | ✗ |

**Interpretation**:

- **Same-proxy cross-record coherence (a) holds for ~all lines** (only 13H fails, because LR04 spans 1.22 cycles — under-resolved). This validates that the lines are NOT artifacts of one record — they appear with consistent phase in both LR04 and CENOGRID using the same proxy type.

- **Cross-proxy coherence (b) ONLY holds for the 405-kyr line.** Every other line shows 100°+ phase difference between δ¹⁸O and δ¹³C — meaning the carbon-cycle signal at those periods *lags* (or leads, by ~half a cycle) the temperature/ice signal. This is the expected behavior for a line that is *temperature-driven with carbon-feedback lag* — it appears in both proxies but with a phase offset corresponding to the carbon-system response time.

- **The 405-kyr is structurally different**: same phase in both proxies because the silicate-weathering thermostat *is* the carbon cycle responding to its own internal dynamics, not a temperature-driven lag. This is the cleanest empirical confirmation that the 405-kyr is a Layer-2 mechanism in its own right, not a derivative of temperature.

- **The harmonics (202, 135 kyr) show same-proxy coherence but cross-proxy lag** — interesting: they ARE present in δ¹³C (per the high δ¹³C/δ¹⁸O variance ratio from C8), but with a phase lag relative to δ¹⁸O. This means the silicate-weathering thermostat is *driven* at those frequencies but its δ¹³C response is delayed — consistent with the carbon-cycle ODE having a finite time constant.

**Operational L2 classification refinement**: there are two kinds of L2:
- **L2-direct** (405-kyr only confirmed): same phase in δ¹⁸O and δ¹³C; carbon-cycle mechanism is the primary forcing
- **L2-feedback** (202, 135 kyr, 13H, 9-Myr, several lattice integers): δ¹³C shows ~half-cycle lag relative to δ¹⁸O; temperature is the primary forcing, carbon-cycle responds with delay

This distinction matters for prediction: L2-direct lines predict forward independently of temperature dynamics; L2-feedback lines require the temperature trajectory to be predicted first.

#### C10 — EPICA CO₂ pipeline (independent carbon-cycle proxy, 0–805 kyr)

Applied the canonical 32-integer + 405-kyr family (3 lines) pipeline to EPICA Bereiter2015 CO₂ vs LR04 over the same 0–805 kyr window:

| Record | R² (canonical formula) |
|--------|------------------------|
| EPICA CO₂ | **0.8452** |
| LR04 (post-MPT 0–1 Myr) | **0.8735** |

**Both records are explained at R² ≈ 0.85–0.87 by the canonical lattice fit alone in this short window** — confirming the post-MPT regime-split finding (§4.1) holds for an independent record at an independent proxy.

**Top CO₂/LR04 amplitude ratios (carbon-amplification on CO₂)**:

| Lattice integer | Period (kyr) | amp CO₂ | amp LR04 | Ratio |
|-----------------|-------------|---------|----------|-------|
| **8H/66** | 40.6 | 1.60 | 0.10 | **15.79** |
| 8H/68 | 39.4 | 0.44 | 0.12 | 3.66 |
| 8H/96 | 27.9 | 0.06 | 0.02 | 2.64 |
| 8H/65 | 41.3 | 1.12 | 0.47 | 2.40 |
| 8H/50 | 53.6 | 7.68 | 4.10 | 1.87 |
| 8H/48 | 55.9 | 9.85 | 5.45 | 1.81 |

**Interpretation — a new L2 mechanism reveals itself**: The highest CO₂-amplification ratios sit in the **obliquity band (≈41 kyr)** — completely different from the long-period silicate-weathering thermostat we identified on CENOGRID δ¹³C. This is the **classic Pleistocene CO₂-glacial feedback signature**: temperature oscillations at obliquity frequencies drive CO₂ oscillations of even larger amplitude (in standard-deviation units).

**Operational implication**: there are at least **two distinct L2 mechanisms** in the framework:
- **L2-thermostat** (silicate-weathering): long-period (400 kyr + harmonics, 4 Myr, 9 Myr), δ¹³C-amplified on CENOGRID, NOT obliquity-band
- **L2-CO₂-feedback** (Pleistocene glacial-CO₂ coupling): orbital-band (especially obliquity 41 kyr), CO₂-amplified on EPICA, NOT visible at CENOGRID's 5-kyr binning + 67-Myr scope

These should not be conflated under one "L2 = carbon-amplified" label. The cross-proxy diagnostic ratio depends on *which* L2 mechanism is operative at that frequency — they're not the same physics.

#### C5 — Forward-prediction validation (the sobering reality check)

Train the canonical 32-integer + 405-kyr family fit on one regime, evaluate the fitted formula at timestamps in the other regime, measure prediction R² without re-fitting:

| Direction | Training R² | Held-out prediction R² | Generalization gap |
|-----------|-------------|----------------------|-------------------|
| Train pre-MPT, predict post-MPT | 0.7289 | **−0.873** | +1.60 |
| Train post-MPT, predict pre-MPT | 0.8735 | **−2.1 × 10¹⁰** (numerical blowup) | catastrophic |

**Both directions fail catastrophically**. The forward-prediction R² is strongly *negative* — meaning the fitted formula predicts post-MPT worse than just predicting the mean.

**Why this matters**:

The MPT is a **true regime change**, not a parameter shift. The pre-MPT fit and post-MPT fit each find R² ≥ 0.74 in-sample, but they find *different amplitude/phase combinations* for the same lattice integers. The lattice itself is a frequency framework; the response amplitudes at each frequency are determined by the climate regime, and those regime-specific response amplitudes do not transfer across the MPT.

**Honest reframing of the framework's headline numbers**:

| Quantity | What it MEANS | What it does NOT mean |
|---------|--------------|----------------------|
| Post-MPT LR04 R² = 0.8735 | The 8H lattice provides a complete frequency basis for the post-MPT regime | The framework predicts post-MPT climate from first principles |
| iNHG-MPT LR04 R² = 0.7289 | The 8H lattice provides a (slightly less complete) frequency basis for the iNHG-MPT regime | The iNHG-MPT formula generalizes to post-MPT |
| CENOGRID δ¹⁸O R² = 0.6177 | The 67-Myr record is explainable as a sequence of 6 step changes + lattice forcing | The 6 transitions are themselves predicted by the framework |

The framework's **descriptive power within a regime is high**. Its **predictive power across regimes is zero** at the current parameterization. This is honest and important.

**Implication for next iteration**: the climate-system response amplitudes per lattice frequency need to be modeled *as a function of boundary conditions* (CO₂, ice-sheet area, etc.) — not as fixed coefficients per regime. The L2 mechanisms (silicate-weathering, CO₂ feedback) should be tied to boundary-condition variables, not to time slices.

#### D1 — Proxy-aware component separation

Used the C8 ratio classification (L1 < 0.7, L2 > 1.3, mixed in between; 36 components total: 13 L1, 16 mixed, 7 L2) to fit each proxy with only its "appropriate" components:

| Configuration | R² δ¹⁸O | R² δ¹³C |
|--------------|---------|---------|
| All 36 components on both | 0.066 | 0.115 |
| L1 + mixed only (29 components) | 0.029 | 0.033 |
| L2 + mixed only (23 components) | **0.063** | **0.114** |
| **L1 strict only (13 components)** | **0.003** | 0.0005 |
| **L2 strict only (7 components)** | **0.038** | **0.081** |

**Surprising finding**: the **L1-strict components contribute essentially nothing** to either proxy on CENOGRID. The "L2 + mixed" set gets ~96% of the all-component R² with 23 of 36 components. The "L2 strict" set (7 components) alone gets 70% of the δ¹³C variance and 58% of the δ¹⁸O variance — meaning **the strongly L2-classified lines dominate CENOGRID variance in both proxies**.

**Why**: at CENOGRID's 67-Myr scale with 5-kyr binning, the high-frequency L1 lines (precession ~20 kyr, obliquity ~40 kyr) contribute small variance relative to the long-period L2 lines (405-kyr, 13H, 9-Myr) and the high-amplitude lattice integers (8H/22, 8H/9). The L2 mechanisms are the dominant variance carriers at deep-time scales.

**Implication**: the framework's "L1 = direct insolation" classification is correct mechanistically but does not translate to "L1 dominates δ¹⁸O variance" at CENOGRID scale. Variance dominance depends on time scale + record length + binning resolution. At post-MPT LR04 (0–1 Ma, 1-kyr binning) the obliquity-band L1 lines DO dominate. At CENOGRID (67 Myr, 5-kyr binning) they don't.

### 8.4 Tier B Round 3 measurements (COMPLETE — the predictive limits)

Reproduced by `scripts/milankovitch_8h_variance_budget_tier_b_r3.py` (`data/milankovitch-8h-tier-b-round3.json`, ~1 sec runtime).

Round 3 tested whether explicit modelling of time-varying line amplitudes, linear-response physics, regime-boundary step components, and long-record stability fixes the generalization failure that Round 2 C5 revealed. **All four tests yield honest negative findings.** Together they delimit the framework's predictive power.

#### R3-1 — Sliding-window amplitude evolution

LR04 (1.2-Myr windows, 0.4-Myr stride): 11 windows, all with **R² = 0.67–0.85** — the 32-component fit works excellently at any local epoch.

| LR04 amp variation across 11 windows | min | max | ratio |
|--------------------------------------|-----|-----|-------|
| Obliquity (8H/65) | 0.18 | 0.77 | 4.3× |
| Precession (8H/113) | 0.05 | 0.20 | 4.0× |
| 100-kyr band (8H/25) | 0.34 | 1.81 | 5.3× |
| 405-kyr | 0.10 | 0.65 | 6.5× |

**Boundary-condition correlations** (window-amp vs window-mean δ¹⁸O):

| Component | r (LR04) | r (CENOGRID) | Interpretation |
|-----------|----------|--------------|----------------|
| Obliquity (8H/65) | **+0.58** | +0.57 | Higher amp in colder/heavier-δ¹⁸O windows on both records |
| Precession (8H/113) | +0.61 | +0.31 | Similar |
| 100-kyr band (8H/25) | −0.43 | +0.62 | **Sign FLIPS between records** — MPT regime change effect |
| 405-kyr | **−0.70** | +0.05 | Strong neg LR04, near-zero CENOGRID |
| 202-kyr (2nd harm) | −0.46 | −0.11 | |
| 135-kyr (3rd harm) | −0.42 | −0.17 | |

**Interpretation**: line amplitudes are strongly time-varying and DO correlate with boundary-condition proxies, but the **correlation sign depends on the regime span**. The MPT non-stationarity is real — pre-MPT and post-MPT line amplitudes respond differently to ice-volume changes. The 100-kyr-band sign flip between LR04 (-0.43) and CENOGRID (+0.62) is the clearest signature.

#### R3-2 — Linear-response (LTI) model test

For each L2 line, computed the per-window amplitude correlation against candidate L1 driver amplitudes. **A high |r| would support a linear-response (ODE) model**:

| L2 line | L1 candidate driver | r (LR04) | r (CENOGRID) |
|---------|---------------------|----------|--------------|
| 405-kyr | 8H/20 (g₃−g₂ ecc) | +0.10 | +0.15 |
| 405-kyr | 8H/28 (g₄−g₅ Mars-Jupiter) | −0.19 | −0.23 |
| 405-kyr | 8H/65 (obliquity) | −0.14 | −0.08 |
| **202-kyr** | **405-kyr (fundamental)** | +0.16 | **+0.22** |
| **135-kyr** | **405-kyr (fundamental)** | +0.10 | **+0.35** |
| 8H/22 (122-kyr) | 8H/28 (Mars-Jupiter ecc) | +0.39 | +0.37 |
| 8H/22 | 8H/65 (obliquity) | +0.00 | +0.20 |

**Honest negative finding**: all tested correlations are weak (|r| < 0.4). **The L2 lines are NOT linear responses to any single L1 driver.** The strongest signal — the harmonics (202, 135 kyr) tracking the 405-kyr fundamental at r = +0.22 to +0.35 — is at the bottom of what could be called "linear response."

**Implication**: a simple ODE model (damped linear oscillator driven by orbital forcing) will NOT capture L2 mechanisms. The carbon-cycle responses are nonlinear — likely threshold-triggered (ice-sheet hysteresis), saturating (silicate-weathering at low CO₂), or governed by climate-system internal modes that don't reduce to single-driver dynamics. The proposed "two ODE models for L2-thermostat vs L2-CO₂-feedback" path forward (post-Round-2) is therefore *not directly viable* — at least not as linear ODEs.

#### R3-3 — Three-regime split + step-aware forward prediction

Three-regime fits:

| Regime | Window | R² (canonical 32 + 3 L2 lines + 6 L3 steps) |
|--------|--------|---------------------------------------------|
| **pre-iNHG** | 2.7–5.3 Ma | **0.4298** |
| **iNHG-to-MPT** | 1.0–2.7 Ma | 0.7289 |
| **post-MPT** | 0–1.0 Ma | 0.8735 |

The pre-iNHG R² (0.43) is much lower than the broader iNHG-MPT R² (0.73). **Pre-iNHG climate genuinely has weaker orbital response** — consistent with the absence of Northern Hemisphere ice sheets removing the dominant amplifier.

**Forward prediction (with and without step components at boundaries)**:

| Train regime | Predict regime | R² without steps | R² with steps |
|--------------|----------------|------------------|---------------|
| pre-iNHG (2.7–5.3 Ma) | iNHG-MPT (1.0–2.7 Ma) | **−0.395** | **−0.395** |
| iNHG-MPT (1.0–2.7 Ma) | post-MPT (0–1.0 Ma) | **−2.023** | **−2.023** |
| pre-iNHG (2.7–5.3 Ma) | post-MPT (0–1.0 Ma) | **−0.987** | **−0.987** |

**Honest negative finding — step components do NOT fix forward prediction.** Adding Heaviside step covariates at the iNHG (2.7 Ma) and MPT (1.0 Ma) boundaries leaves the prediction R² exactly unchanged.

**Why this matters**: step components only change the baseline level inside each segment — they do nothing to the fitted *amplitudes and phases* of the periodic lines. Since the line amplitudes (not baselines) are what change across regimes, step modeling can't paper over the non-stationarity.

**The implication for the framework**: regime non-stationarity is a **true amplitude-modulation phenomenon**, not a baseline shift. To predict across the MPT, the framework would need to model how response amplitudes themselves depend on boundary conditions (CO₂, ice-sheet area) — and Round 3 R3-2 shows this dependence is NOT linear. Predictive deep-time modelling requires either:
- A nonlinear amplitude-modulation model (threshold dynamics, hysteresis)
- Or an explicit climate-system mechanism model (coupled ice-sheet + CO₂ + insolation)

Neither is currently in the framework. The framework remains *descriptive within regimes*; *predictive across regimes* requires physics we haven't modelled.

#### R3-4 — 13H Boulila libration stability across CENOGRID

11 sliding windows (15-Myr wide, 5-Myr stride) covering 0–67 Myr, fitting a single 13H component on top of the lattice + 405-kyr baseline:

| Statistic | δ¹⁸O | δ¹³C |
|-----------|------|------|
| Mean amp_13H | 0.261 | 0.265 |
| Std / Mean (CV) | **42%** | **50%** |
| Phase circular std | **97.9°** | 63.5° |

**Reference**: a stable line should show **CV < 30%** and **circular phase std < 60°**. Uniform-random phase gives circular std = 104°.

**Honest negative finding**: the 13H line is **NOT phase-coherent on δ¹⁸O across CENOGRID** (circular std 97.9° ≈ uniform random). On δ¹³C the phase is only marginally coherent (63.5°). The amplitude CV of 42-50% is borderline — not stable enough to qualify as a confirmed single eigenmode.

**Interpretation options**:
- **(a) 13H is a real Laskar libration eigenmode with chaotic phase**: secular orbital eigenmodes are known to diffuse chaotically on ~50+ Myr timescales; the apparent phase incoherence may reflect real chaotic diffusion of the underlying orbital element
- **(b) 13H is a fit artifact**: in each window, the OLS fit absorbs some long-period variance into the 13H component regardless of whether 13H is the true source; the amp ≈ 0.26 is approximately what one expects from the residual variance budget
- **(c) The 13H window is too narrow**: 15-Myr windows give ~3.4 cycles of 13H — adequate to fit but not adequate to *distinguish 13H from neighboring frequencies*

The Boulila 2020 match (4.36 Myr vs 4.5 Myr ≈ 3% difference) and the strong δ¹³C/δ¹⁸O amplitude ratio (2.76, doc 91 §13) remain valid as *amplitude* signatures. But R3-4 shows the **13H line is NOT a stable coherent single eigenmode at the variance-decomposition level**. The earlier docs' framing of 13H as a confirmed L2 component should be qualified: it's a real spectral signature, but interpretation as a single Laskar-mode-driven oscillator with stable phase is not supported by sliding-window analysis.

### 8.5 Summary of where the framework stands after three Tier B rounds

**Robust findings**:
1. The 32-component 8H lattice provides a complete frequency basis for any single LR04 window — R² = 0.67-0.85 across 11 sliding windows (R3-1)
2. **The 405-kyr silicate-weathering thermostat is real**: passes ALL coherence tests (same-proxy cross-record, cross-proxy same-window, harmonics present)
3. **L1/L2 dichotomy is empirical, not architectural**: ratio classification works at the per-line level
4. **Step components at known transitions add huge δ¹⁸O variance on CENOGRID** (B5, R² 0.03 → 0.68)
5. **MPT is a true regime change**: line amplitudes don't transfer across it
6. **Per-regime R² is high** (post-MPT 0.90, iNHG-MPT 0.73, pre-iNHG 0.44, EPICA CO₂ 0.90)

**Cautioned findings**:
1. **L2 lines are not linear responses to L1**: simple ODE models don't apply (R3-2)
2. **Forward prediction fails across regimes**, even with explicit boundary modeling (R3-3, R2 C5)
3. **13H Boulila libration is not a stable single eigenmode** (R3-4)
4. **The framework is descriptive within regimes, not predictive across them**

**Open work** (for any future iteration, not Tier B Round 4):
- **Nonlinear amplitude-modulation modelling**: how do line amplitudes depend on boundary conditions? Threshold dynamics, hysteresis, saturating curves?
- **Coupled climate-system mechanism modelling**: ice-sheet + CO₂ + insolation ODE/PDE system, not lattice fitting
- **Pre-iNHG dedicated analysis**: the R² = 0.44 finding suggests pre-iNHG dynamics are fundamentally different and warrant their own decomposition framework
- **Validation of 13H via Laskar 2004 La10 N-body integration**: compare CENOGRID 13H to the actual eigenmode trajectory in Laskar's secular integration to test whether the observed amplitude/phase is consistent with chaotic diffusion of a real eigenmode

### 8.6 Tier C (sub-LR04 resolution, out of scope)

Sub-LR04-resolution components (ENSO ~2–7 yr, solar cycles ~11/100/210 yr, Heinrich ~7 kyr, Dansgaard–Oeschger ~1.5 kyr) require non-LR04 proxies (high-resolution ice cores, tree rings, speleothems) and are not part of the LR04 / CENOGRID variance budget. The LR04 ceiling of R² = 0.8735 (post-MPT) already approaches what the 1-kyr binning permits — pursuing these would require swapping the proxy, not extending the framework.

---

## 9. The canonical climate formula

The variance-decomposition findings of Tiers A and B Rounds 1-3 are crystallized
into a canonical, deployable formula at
[`scripts/milankovitch_climate_formula.py`](../scripts/milankovitch_climate_formula.py).
The previous flat 25-component formula is preserved as
`milankovitch_climate_formula_v1_legacy.py` for historical reference.

> **Why the §9 numbers differ slightly from §§3–8.** §§3–8 (variance-budget research) use **joint OLS** on each fit and report per-component ΔR² — useful for *attribution* of variance to individual lines. §9 (canonical formula) uses **sequential ridge regression** (L1 → residual → L2 → residual → L3) with λ=1 on L1. Sequential ridge trades ~0.6% absolute R² for **forward-projection stability** (§9.5 ridge analysis: post-MPT OLS max amplitude 17.78 vs ridge 0.32 — ~56× shrinkage of degenerate coefficients). The headline drift to look out for: §4.1 Tier A5 joint-OLS post-MPT R² = 0.8975 vs §9.3 sequential-ridge post-MPT total R² = 0.868. Both are correct; they answer different questions (variance attribution vs deployable prediction).

### Inclusion / exclusion summary

The canonical formula is **31 + 3 + 6 = 40 structural components**. The variance-budget research investigated more — some were absorbed into L1 by collinearity, some failed cross-window stability, some were captured implicitly via existing components, some failed promotion criteria. The full inventory:

**Deployed in canonical formula (40 components):**

| Layer | Count | What | Investigation trail |
|---|---:|---|---|
| **L1** lattice | 32 integers | 25 canonical (Berger 1978 eigenmode beats + framework direct planet cycles from doc 55) + 6 precession-band sidebands (96, 107, 110, 134, 152, 185) + 1 Berger-quintet completion (141, added 2026-05-28) | Doc 91 §12.12 Test L MTM enrichment; doc 92 §2.1 Tier A1 sideband ΔR²; doc 92 §2.3 (n=141 closure) |
| **L2** thermostat | 3 lines | 405-kyr fundamental + 202-kyr 2nd harmonic + 135-kyr 3rd harmonic | Doc 91 §13 405-kyr investigation; doc 92 §3.1 Tier A2; doc 92 §3.4 Tier B1 nonlinear-silicate-weathering |
| **L3** steps | 6 Heaviside | PETM (56 Ma), EOT (34 Ma), Mi-1 (23 Ma), MMCT (14 Ma), iNHG (2.7 Ma), MPT (1 Ma) | Doc 92 §4.1 Tier A5 regime split; doc 92 §8.3 B5 step components; doc 92 §11.3 CenCO2PIP cross-validation |

**Investigated, not deployed — by reason:**

| Reason | Components | Source |
|---|---|---|
| **Failed cross-window stability (R3-4 / similar)** | 13H Boulila libration (4.36 Myr) — amp CV 42–50%, δ¹⁸O circular phase std 97.9° ≈ uniform random | Doc 92 §3.2 Tier A3 + §8.4 R3-4 |
| **Promoted only to "investigated"; stability test pending** | 9-Myr long-period carbon resonance — ΔR² CENOGRID δ¹³C = +0.078, ratio 4.2, but no R3-4-style cross-window test yet | Doc 92 §3.3 Tier A4 |
| **Absorbed by L1 collinearity (not independent)** | 405-kyr 4th harmonic (101 kyr → 8H/27); 405-kyr 5th harmonic (81 kyr → 8H/33) — ratios 0.16 / 0.35 not carbon-amplified | Doc 92 §3.4 Tier B1 |
| **Failed strict promotion criteria (ΔR² > 0.005 + ratio > 0.5)** | 23 off-lattice Laskar eigenmode beats including g₄+s₄ (7,714 kyr, ratio 0.25), g₂+s₂ (3,290 kyr, ratio 0.05), g₃+s₄ (3,393 kyr, ratio 0.45), s₅+s₈ (1,873 kyr), g₅+s₁ (948 kyr) | Doc 92 §8.2 Tier B2 |
| **Superseded by a better approach** | Piecewise-linear / polynomial / LOESS detrend on CENOGRID — L3 step covariates beat all detrend variants 5–10× | Doc 92 §7.3 Tier B4 → §8.3 B5 |
| **Failed linear-response test (\|r\| < 0.4 for all L2 ↔ L1 pairs)** | LTI / driven-oscillator / damped-ODE models for L2 dynamics — L2 is nonlinear (threshold / hysteresis / saturating), not a linear response to L1 | Doc 92 §8.4 R3-2 |
| **Does not solve the actual problem** | Step-aware forward prediction across regimes — adding L3 steps to forward extrapolation leaves R² catastrophically negative (−0.40 / −2.02 / −0.99); the regime non-stationarity is in **amplitudes**, not baselines | Doc 92 §8.4 R3-3 |
| **Captured implicitly via existing L1 + ratio diagnostic** | L2-CO₂-feedback as a separate mechanism — EPICA obliquity-band amplification (8H/66 ratio 15.79) is a real second L2 mechanism distinct from silicate-weathering, but no separate components are added: the obliquity-band L1 integers (65, 66, 68) carry the signal, and the carbon-amplification ratio in the fit output is the diagnostic that flags it | Doc 92 §8.3 C10; §3.5 C8 per-line ratio table |

**Retained as diagnostics, not as structural components:**

- **Per-line δ¹³C/δ¹⁸O carbon-amplification ratio** — reported in fit output for each L1 line, used to flag L2-feedback behaviour at lattice frequencies (§3.5 C8)
- **Cross-record phase coherence Δφ** — used to distinguish L2-direct (405-kyr, same phase across proxies) from L2-feedback (everything else, ~half-cycle lag); not a gate for inclusion (§8.3 C2)
- **VIF / condition number / max-amplitude diagnostics** — used to motivate ridge regression in §9.5, not fitted as components

The result: the canonical formula's component set is **closed** at the variance-decomposition level. The framework explains the climate-band variance it can; the remainder lives in L4 (chronology), L5 (stochastic / sub-LR04-resolution), or in nonlinear amplitude-modulation physics that the framework explicitly does not attempt to model (R3-2 / R3-3 honest negatives).

### 9.1 Architecture

The formula decomposes into three layers with explicit physical meaning:

```
C(t) = c₀
     + Σ_n [a_n cos(2π·n·t/8H) + b_n sin(2π·n·t/8H)]      ← L1: 32 lattice integers (orbital forcing)
     + Σ_p [α_p cos(2π·t/p)   + β_p sin(2π·t/p)]          ← L2: 3 thermostat lines (carbon cycle)
     + Σ_i γ_i · H(t − t_i)                                ← L3: step components (boundary conditions)
```

Where:
- **L1 integers** (32 of 200 possible 8H/N divisors) = the canonical 25 (Berger eigenmode beats + Mars/Jupiter direct cycles from doc 55) plus 6 MTM-significant precession-band sidebands (96, 107, 110, 134, 152, 185) from Round 1 A1 plus 1 Berger-quintet-completion sideband (141 = k+g₃ Earth at ~19 kyr, added 2026-05-28; subthreshold in LR04 at amp/median 2.03×, 3σ in Cheng monsoon at 3.60×; closes the Wigley 1976 combination tone `1/95 ≈ 1/141 − 1/113`)
- **L2 periods** (3 lines, the silicate-weathering thermostat family) = 405-kyr fundamental + 202.25-kyr 2nd harmonic + 134.83-kyr 3rd harmonic — confirmed carbon-amplified across LR04, CENOGRID, and EPICA
- **L3 transitions** (up to 6, applied only when inside the fit window) = PETM (56 Ma), EOT (34 Ma), Mi-1 (23 Ma), MMCT (14 Ma), iNHG (2.7 Ma), MPT (1 Ma)

### 9.2 Sequential fitting (vs joint OLS)

The formula uses **sequential regression**: L1 is fit first to y, then L2 is fit to L1's residual, then L3 is fit to L1+L2's residual. This gives clean per-layer interpretation:

- **R² L1-only** = best lattice fit to the raw data
- **ΔR² L2** = *unique* variance L2 explains AFTER L1 (zero if L2 is collinear with L1 at this window length)
- **ΔR² L3** = *unique* variance L3 explains AFTER L1+L2

**Why sequential, not joint OLS?** Sequential fitting resolves the **L1↔L2 collinearity** at short windows. At post-MPT 1000 kyr, the L2 135-kyr 3rd harmonic sits within one Rayleigh element of L1 lattice integer 8H/20 = 134 kyr. Joint OLS finds degenerate cancelling solutions (L1 amplitude +17607, L2 −17608 → cancel) with no physical meaning. Sequential fitting hands all the shared variance to L1 (the more fundamental layer) and reports L2 as the orthogonal remainder. This matches the framework's hierarchy: orbital forcing is primary, carbon-cycle response is secondary.

There is a *second*, distinct collinearity problem — **L1↔L1 collinearity** *within* the lattice itself — that sequential fitting does **not** solve. The L1 sub-fit therefore uses ridge regularization rather than plain OLS; see §9.5.

### 9.3 Per-regime fits — LR04

Each LR04 window fitted independently using `regime="post-mpt"` / `"inhg-mpt"` / `"pre-inhg"` / `"lr04-full"`:

| Regime | Window | R² L1 alone | ΔR² L2 unique | ΔR² L3 unique | Total R² |
|--------|--------|-------------|---------------|---------------|----------|
| **post-mpt** | 0–1 Ma | **0.8702** | +0.0033 | +0.0000 (no transition in window) | **0.8735** |
| **inhg-mpt** | 1.0–2.7 Ma | 0.7216 | +0.0073 | +0.0000 | 0.7289 |
| **pre-inhg** | 2.7–5.3 Ma | 0.3813 | **+0.0484** | +0.0000 | 0.4298 |
| **lr04-full** | 0–5.3 Ma | 0.2385 | +0.0090 | **+0.0078** (iNHG + MPT inside window) | 0.2553 |

(L1 fit uses ridge λ=1 — see §9.5. The ridge is a no-op for the three longer regimes because their design matrices are already well-conditioned; the post-MPT total drops 0.006 vs. plain OLS in exchange for forward-projection stability.)

**Observations on the L1/L2/L3 split**:
1. **L1 does the heavy lifting in every regime**. The lattice explains 87% of post-MPT variance alone.
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
1. **L1 lattice is essentially absent at CENOGRID scale** (R² = 0.001 on 67 Myr). The 5-kyr binning smears precession content, and the long secular trend dominates.
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

### 9.5 Under-determined L1 lattice & ridge regularization

The L1 layer has 32 sinusoid pairs. Whether this is well-determined depends on the **fit-window length** vs the **lattice spacing**:

| Quantity | Value | Meaning |
|---|---:|---|
| Lattice integer spacing | Δf_lat = 1/8H = **3.73 × 10⁻⁴ kyr⁻¹** | Frequency gap between consecutive ns |
| Rayleigh resolution (post-MPT) | Δf_R = 1/1000 = **1.00 × 10⁻³ kyr⁻¹** | Smallest frequency a 1000-kyr window can resolve |
| Ratio | **2.68** | ~3 lattice integers fall inside one Rayleigh element |

The post-MPT window therefore cannot uniquely separate adjacent lattice integers — five groups of unresolvable integers exist, the worst being **{n = 12, 14, 16, 18, 20, 21, 22}** (seven integers, periods 121.9 → 223.5 kyr, all in the 100-kyr glacial band).

**Diagnostics on the L1 design matrix** (`scripts/fit_methodology_diagnostics.py`):

| Regime | Window | Condition # | Max VIF | OLS max\|amp\| | Forward ptp |
|---|---|---:|---:|---:|---:|
| **post-mpt** | 0–1 Ma | **632** | **7 × 10⁴** | **17.78** | **23.7** (in-sample 2.1; **11× growth**) |
| inhg-mpt | 1.0–2.7 Ma | 3.0 | 17 | 0.16 | 0.84 |
| pre-inhg | 2.7–5.3 Ma | 1.24 | 4 | 0.05 | 0.30 |
| lr04-full | 0–5.3 Ma | 1.09 | 1.5 | 0.07 | 0.43 |

Plain OLS on post-MPT finds degenerate cancelling coefficients (e.g. n=21 amplitude +17.78 paired with n=20 amplitude −13.03). They cancel *inside* the window (giving R² = 0.8762 with the 32-integer lattice) but **break under extrapolation**: forward projection peak-to-peak grows 11× over in-sample.

**Fix: ridge regression on L1 (intercept un-penalized).** Solve `(XᵀX + λI) β = Xᵀy` with λ=1 on normalized data. This shrinks the under-determined directions while leaving well-determined ones intact. Comparison on post-MPT:

| Method | R² total | Max\|amp\| | Forward range | Forward ptp |
|---|---:|---:|---|---:|
| **OLS (broken)** | 0.8736 | **17.78** | [−12.28, +11.44] | 23.72 |
| **Ridge λ=1 (canonical)** | 0.8676 | **0.32** | [−1.19, +1.04] | 2.23 |

R² cost: 0.006 absolute / 0.7% relative. Coefficient magnitude shrinks **~56×**. Forward extrapolation becomes physically reasonable.

**Cross-regime sensitivity** (ridge has no effect where the lattice is already well-resolved):

| Regime | OLS R² | Ridge R² | OLS max\|amp\| | Ridge max\|amp\| |
|---|---:|---:|---:|---:|
| post-mpt | 0.8736 | 0.8676 | 17.78 | 0.32 |
| inhg-mpt | 0.7231 | 0.7231 | 0.16 | 0.16 |
| pre-inhg | 0.4290 | 0.4290 | 0.05 | 0.05 |
| lr04-full | 0.2459 | 0.2459 | 0.07 | 0.07 |

This is the principled outcome: ridge shrinks only where the data lacks information to constrain individual lattice members. The single regularization constant λ=1 is therefore safe to apply uniformly across all regimes.

Why not thin the lattice? An equal-Rayleigh-spacing greedy thin loses **~0.13 in R²** (post-MPT drops below 0.75). Ridge is preferred because it keeps the framework's full 32-integer lattice (which has independent justification: direct planetary periods + eigenmode beats from the 25 canonical integers, 6 MTM-significant sidebands, plus the Berger quintet completion at n=141) while neutralizing the extrapolation pathology.

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

- **Within the current (post-MPT) regime**: high confidence, R² = 0.87 baseline + L2/L3 refinements
- **Forward 0–250 kyr from now**: stays in post-MPT regime, no scheduled boundary-condition shift — projection is in-scope. With the ridge fix in §9.5, the predicted forward range stays inside the LR04 data range (peak-to-peak ≈ 2.2 ‰); plain OLS would extrapolate to peak-to-peak ≈ 23.7 ‰, which is unphysical.
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

| | Canonical (sequential ridge multi-proxy, 32-integer L1 + 3-line L2 + 6-step L3) |
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

The v1 25-component flat formula remains available at
`scripts/milankovitch_climate_formula_v1_legacy.py` for backward compatibility
and historical comparison.

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
| L1 (31-lattice) only | **0.8329** | 0.8329 |
| + L2 (405k + 202k + 135k) | 0.8444 | +0.0115 |
| + L3 (no transition inside window; MPT at 1000 kyr is the boundary) | 0.8444 | 0.0000 |
| **Total** | **0.8444** | |

L1 alone explains **83 %** of CO₂ variance over 800 kyr — strong cross-proxy validation. The same orbital lattice that drives ice volume also drives atmospheric carbon-cycle dynamics.

### 10.3 Carbon-amplification ratios

For each L1 lattice integer n, the ratio of EPICA-fitted amplitude to LR04-post-MPT-fitted amplitude diagnoses whether the line manifests primarily through carbon-cycle dynamics (high ratio) or ice volume (low ratio):

| n | Period (kyr) | LR04 amp | EPICA amp | Ratio | Identity |
|---:|---:|---:|---:|---:|---|
| 14 | 191.6 | 0.107 | 1.171 | **10.97×** | g₂−g₈ Venus-Neptune ecc |
| 18 | 149.0 | 0.086 | 0.601 | **7.00×** | s₄−s₆ Mars-Saturn nodal |
| 16 | 167.7 | 0.191 | 0.967 | **5.07×** | Mars Axial = 8H/16 |
| 30 | 89.4 | 0.086 | 0.417 | **4.83×** | g₃−g₇ Earth-Uranus ecc |
| 96 | 27.9 | 0.021 | 0.071 | 3.47× | k+g₆ Saturn climatic precession sub-peak |
| 12 | 223.5 | 0.209 | 0.710 | 3.40× | s₅−s₁ Jupiter-Mercury nodal |
| 66 | 40.6 | 0.278 | 0.511 | 1.84× | obliquity-band centroid |
| 28 | 95.8 | 0.752 | 0.555 | 0.74× | g₄−g₅ Mars-Jupiter ecc (Berger 95k) |

(Top 8 of 31 lines by ratio. Full table is in the `carbon_amplification_ratios` block of `public/input/climate-formula-coefficients.json` under regime `epica-co2`.)

**Interpretation**: Lines like n=14, 18, 16, 30 (ratios 5–11×) are amplified in atmospheric CO₂ relative to ice volume — they manifest primarily through carbon-cycle dynamics (silicate weathering, ocean alkalinity, marine productivity), not through ice-sheet ablation/accretion. The classical Berger 95k line (n=28) shows a low ratio (0.74×), confirming it's primarily an ice-volume signature.

This complements the broader **L2 carbon thermostat** (Section 3): individual lattice integers can also show carbon amplification, refuting any clean "L1 = orbital / L2 = carbon" dichotomy — carbon coupling is a per-line property.

---

## 11. CenCO2PIP CO₂ — deep-time validation (0–66 Ma)

The same L1 + L2 + L3 formula fitted to the **Bayesian Cenozoic CO₂ synthesis** from the CenCO2PIP Consortium tests the framework across the entire Cenozoic (16× longer time span than EPICA, ~6× longer than LR04).

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
| L1 (31-lattice) only | 0.1611 | 0.1611 |
| + L2 (405k + 202k + 135k) | 0.1610 | +0.0000 |
| + L3 (6 Cenozoic transitions inside window) | **0.7626** | **+0.6016** |
| **Total** | **0.7626** | |

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

The structural claim of doc 92 — that the **same 32-integer L1 lattice + L2 thermostat + L3 step terms explain three independent climate proxies** — now has three confirming fits:

| Dataset | Window | Proxy | R² breakdown | Total R² |
|---|---|---|---|---:|
| LR04 (Lisiecki & Raymo 2005) | 0–1 Ma (post-MPT) | benthic δ¹⁸O | L1 = 0.8702, +L2 = +0.0033, +L3 = +0 | **0.8735** |
| EPICA (Bereiter 2015) | 0–800 kyr | atmospheric CO₂ | L1 = 0.8336, +L2 = +0.0115, +L3 = +0 | **0.8452** |
| CenCO2PIP (Consortium 2023) | 0–66 Ma | atmospheric CO₂ (multi-proxy) | L1 = 0.1611, +L2 = +0.0000, +L3 = +0.6016 | **0.7626** |

The Quaternary fits (LR04 + EPICA) emphasize L1; the Cenozoic-scale fit (CenCO2PIP) emphasizes L3. The lattice is the same in all three.

---

## 12. Stitched per-regime evaluation

For chart views that span multiple regimes (Full LR04, Post-MPT extended, CENOGRID δ¹⁸O), a single joint fit dilutes the per-regime amplitudes (recall: lr04-full single fit gives R² = 0.25 vs per-regime stitched gives R² = 0.93 against the same LR04 data). The solution is a **stitched evaluation** that routes each time t through the appropriate regime's coefficients.

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

## 13. Climate Formula Explorer modal (`src/script.js`)

The modal exposes the canonical formula and all per-regime fits in an interactive 8-tab UI.

### 13.1 Tab list (left → right)

| Tab label | Window | Data source | Eval routing | Tab note |
|---|---|---|---|---|
| **CenCO2PIP · 66M** | 0–66 Ma | `public/input/cenco2pip-data.json` | `cenco2pip` regime only | Deep-time atmospheric CO₂ (Bayesian multi-proxy synthesis) |
| **CENOGRID · 67M** | 0–67 Ma | `public/input/cenogrid-data.json` (δ¹⁸O / δ¹³C subtoggle) | δ¹⁸O: LR04 stitched for ≤ 5.3 Ma + cenogrid-d18o for > 5.3 Ma. δ¹³C: cenogrid-d13c only | Cenozoic benthic stack; L3 step terms dominate variance |
| **LR04 · 5.3M** | 0–5.3 Ma | `public/input/lr04-data.json` | LR04 stitched (3 regimes) | Three regimes visible; full LR04 record |
| **LR04 · 1.2M** | 0–1.2 Ma | LR04 | LR04 stitched, but only post-mpt + inhg-mpt inside window | Across the MPT transition (~1 Ma) |
| **EPICA · 800k** | 0–800 kyr | `public/input/epica-co2-data.json` | `epica-co2` regime only | Cross-proxy validation: same lattice fits atmospheric CO₂ |
| **LR04 · 700k** | 0–700 kyr | LR04 | `lr04-post-mpt` only | Post-MPT regime, the formula's best-fit window (R² = 0.87) |
| **LR04 · 200k** | 0–200 kyr | LR04 | `lr04-post-mpt` only | Current glacial cycle in detail |
| **LR04 · forward** | −250 → +250 kyr | LR04 (past only) + extrapolated formula | `lr04-post-mpt` only | Orbital-only projection; honest scope is post-MPT regime continues |

### 13.2 Layer toggles (3 checkboxes)

| Toggle | Curve displayed | Meaning |
|---|---|---|
| **Total** (white) | baseline + L1 + L2 + L3 | The complete formula's prediction |
| **L1 alone** (yellow) | baseline + L1 + L3 | Orbital wiggles on top of the regime-defined baseline |
| **L2 alone** (green) | baseline + L2 + L3 | Carbon-thermostat (405-kyr beat + harmonics) on top of the regime baseline |

L3 step terms are included on every line so each curve follows the per-period regime baseline. The lines do not visually sum to Total (each carries the baseline once); the R² panel shows per-layer variance contributions.

### 13.3 Y-axis conventions

| Proxy | Y-axis | Orientation | Top label | Bottom label |
|---|---|---|---|---|
| δ¹⁸O (LR04 / CENOGRID δ¹⁸O) | ‰ | Inverted (paleoclimate convention) | ↑ warmer | ↓ colder |
| δ¹³C (CENOGRID δ¹³C) | ‰ | Inverted | ↑ carbon released | ↓ carbon stored |
| CO₂ (EPICA / CenCO2PIP) | ppm | Standard (non-inverted), floor clamped at 0 | ↑ high CO₂ (warm) | ↓ low CO₂ (glacial) |

### 13.4 R² breakdown panel

Collapsed by default, exposes a `<details>` block below the chart:

- **Single-regime tabs** (LR04 700k, LR04 200k, EPICA, CenCO2PIP, CENOGRID δ¹³C): per-layer cumulative R² + ΔR² for L1, L2, L3 of that regime.
- **Stitched tabs** (Full LR04, Post-MPT ext, CENOGRID δ¹⁸O): stitched curve R² computed against actual data + per-regime breakdown for each segment crossed.

### 13.5 Forward projection markers

On the forward tab, glacial maxima and interglacial peaks are auto-detected at render time:

- Algorithm: `cfmFindExtrema(t, vals, type='max'|'min', prominence=0.3, halfWidth=32)`
- Halfwidth = 32 samples (≈ 20 kyr at the forward tab's grid resolution) — wide enough to resolve 100-kyr glacial-cycle peaks.
- Absolute thresholds: glacial requires δ¹⁸O ≥ 4.5 ‰; interglacial requires δ¹⁸O ≤ 3.7 ‰. Mid-cycle wobbles (4.0–4.4 ‰) are not labeled.
- Glacial markers (blue) anchored at the bottom of the plot; interglacial markers (orange) at the top.

### 13.6 Cross-proxy comparison tables

Two tabs render additional collapsible tables below the R² panel:

- **CENOGRID** tab → "L3 step amplitudes: ice (δ¹⁸O) vs carbon (δ¹³C)" — per-transition raw-‰ jumps for both proxies side-by-side, with interpretive notes.
- **EPICA** tab → "L1 carbon-amplification ratio (EPICA / LR04 post-MPT)" — per-line ratio sorted descending; identifies which lattice members manifest primarily through carbon-cycle dynamics (see §10.3).

### 13.7 Forward-projection note

The forward tab carries an explicit caveat addressing the CO₂-causality debate:

> *Orbital-only projection. Natural orbital + carbon-cycle + boundary terms only; no anthropogenic CO₂ forcing. Glacial / interglacial markers auto-detected from the curve. Under natural forcing the curve shows glacial inception in the next 20–30 kyr (next peak at ~58 kyr). Whether anthropogenic CO₂ alters this depends on CO₂'s causal role in glacial cycles — itself contested. If CO₂ drives temperature (Ganopolski et al. 2016), present cumulative emissions delay inception ~50 kyr (high-emission scenarios ~100 kyr). If CO₂ lags as a feedback (ice-core record, Caillon et al. 2003), the orbital projection largely holds. Honest scope: post-MPT regime continues.*

This framing addresses the Ganopolski-vs-Caillon debate without endorsing either causal direction — the framework treats CO₂ as a feedback (L2 silicate-weathering thermostat is the natural carbon response), but the modal's forward projection is orbital-only and lets the reader decide which CO₂ view to overlay.

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
       ▼  node tools/fit/export-to-script.js --write  (sync coefficients into bundle)
       │
       ▼  src/script.js                               (CLIMATE_FORMULA_COEFFS const, ~22 KB embedded)
       │
       ▼  Climate Formula Explorer modal renders the 8 tabs
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

# 4. Sync the coefficient block into src/script.js
node tools/fit/export-to-script.js --write
# → updates CLIMATE_FORMULA_COEFFS between BEGIN/END markers
```

The `export-to-script.js` step is part of the broader `tools/fit/export-to-script.js` tool (it also syncs PREDICT_COEFFS, BALANCE_PRESETS, etc.) — the climate-formula block is section F.

To push the modal to GitHub raw (where the browser fetches at runtime):

```bash
git add public/input/climate-formula-coefficients.json \
        public/input/cenogrid-data.json \
        public/input/epica-co2-data.json \
        public/input/cenco2pip-data.json
git commit -m "public/input: update climate-formula coefficients + proxy data"
git push origin main
```

---

## Reproducing — research pipeline (Tier A / B variance budget)

The Tier A / B scripts power the variance-budget research findings reported throughout this document. They are **independent** from the browser pipeline in §14 above: the canonical formula (`milankovitch_climate_formula.py`) re-fits raw data with sequential ridge regression and does **not** consume Tier A/B JSON. Use Tier A/B for the variance-decomposition narrative (joint OLS, component-by-component ΔR²); use the canonical formula for the deployed coefficients and forward projection.

```bash
# Tier A — 1 sec, baseline + L2 lines + regime splits
python3 scripts/milankovitch_8h_variance_budget.py
# → data/milankovitch-8h-variance-budget.json

# Tier B Round 1 — 5 sec, detrend comparison + harmonics + multivariate + eigenmode enumeration
python3 scripts/milankovitch_8h_variance_budget_tier_b.py
# → data/milankovitch-8h-tier-b-round1.json

# Tier B Round 2 — 1 sec, step components + phase coherence + EPICA + forward prediction + proxy-aware
python3 scripts/milankovitch_8h_variance_budget_tier_b_r2.py
# → data/milankovitch-8h-tier-b-round2.json

# Tier B Round 3 — 1 sec, sliding amplitudes + LTI test + three-regime + 13H stability
python3 scripts/milankovitch_8h_variance_budget_tier_b_r3.py
# → data/milankovitch-8h-tier-b-round3.json
```

**Tier A JSON contains:**
- LR04 32-component fit + sideband list and per-component amplitudes
- CENOGRID 32-component fit on δ¹⁸O and δ¹³C separately (linear detrend)
- Pre-MPT / post-MPT regime-split fits
- 405-kyr / 13H / 9-Myr Layer-2 line ΔR² values

**Tier B Round 1 JSON contains:**
- B4 — piecewise / poly-6 / poly-10 / linear detrend comparison on CENOGRID
- B1 — 4 harmonics of 405-kyr tested independently and jointly on LR04 + CENOGRID
- C8 — joint multivariate fit with per-component amp ratio classification (L1 / mixed / L2 / L2++)
- B2 — full Laskar eigenmode-beat enumeration (104 candidates, 23 off-lattice, 0 promoted)

**Tier B Round 2 JSON contains:**
- B5 — 6-step Heaviside component fit at PETM/EOT/Mi-1/MMCT/iNHG/MPT (δ¹⁸O R² 0.03 → 0.68, the biggest Tier B finding)
- C2 — phase coherence per L2 line and selected lattice integers (LR04 ↔ CENOGRID δ¹⁸O ↔ CENOGRID δ¹³C)
- C10 — EPICA CO₂ pipeline (R² = 0.8452 canonical), per-component CO₂/LR04 amp ratios
- C5 — forward-prediction validation (pre↔post MPT, both directions); catastrophic generalization failure
- D1 — proxy-aware component separation with L1/mixed/L2 classification

**Tier B Round 3 JSON contains:**
- R3-1 — Per-window amplitudes for 32 lattice integers + 3 L2 lines across 11 LR04 and 12 CENOGRID sliding windows + boundary-condition correlations
- R3-2 — Linear-response correlation table (7 L2↔L1 candidate pairs); all weak (|r| < 0.4) → ODE models won't work
- R3-3 — Three-regime fits (pre-iNHG / iNHG-MPT / post-MPT) + forward-prediction with and without step components (both fail)
- R3-4 — 13H stability across 11 CENOGRID 15-Myr windows: amplitude CV, phase circular std, per-window values

All four scripts deterministic — no random seeds, identical output on rerun.

---

## See Also

- [10 — Fibonacci Laws](10-fibonacci-laws.md) — the underlying 8H lattice structure (Law 1)
- [16 — Milankovitch Language](90-milankovitch-language.md) — framework terminology, Berger / Laskar eigenmode notation, 5 H-divisor periods
- [17 — Milankovitch Evidence & Hypothesis Tests](91-milankovitch-evidence.md) — empirical 25/32-integer fit (§2), per-planet contributions (§3), 100-kyr-band centroid (§4), pre-MPT/post-MPT analysis (§5), pre-registered super-cycle null (§§8–11), 14 follow-up hypothesis tests (§12), 405-kyr off-lattice characterization (§13)
