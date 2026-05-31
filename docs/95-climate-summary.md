# Climate Summary — Gravitational Coupling, Not Insolation, Drives Earth's Climate

> **The capstone synthesis.** Climate is forced by **gravitational coupling among
> solar-system bodies**. Solar insolation is one channel through which that
> coupling reaches Earth — but the *rhythm itself*, captured by the 8H lattice,
> is the more complete description.
>
> This document synthesizes the empirical case made in docs 90–94.
> The 8H integer-divisor lattice (L1) explains **R² = 0.87** of post-MPT LR04
> ice-volume variance; the classical Berger 1978 insolation parameterization
> alone explains only **R² = 0.05** of the same record (17× less). When L1 is
> already in the model, adding *any* insolation parameterization — including
> Laskar 2010's wide-range eccentricity — yields **ΔR² ≈ 0**. The two are not
> independent forcings; they are different projections of the same physics, and
> the lattice is strictly more expressive.

**Status:** synthesis of the doc 90–94 cluster.
No new measurements in this document — all R² values are computed in the cited scripts and reproduced from `data/milankovitch-climate-formula.json`, `data/insolation-extension-results.json`, and `data/insolation-laskar-check-results.json`.

---

## 1. The two paradigms

There are two competing answers to "what drives Earth's climate variability over 10⁴–10⁷-year timescales?"

### 1.1 The classical Milankovitch paradigm (Berger 1978, Laskar 2004)

Climate is driven by **changes in solar insolation** received at high northern latitudes during summer. Insolation is parameterized by Earth's three slowly-varying orbital elements:

- **ε(t)** — obliquity (axial tilt, ~41 kyr period)
- **e(t)** — eccentricity (~95 / 405 kyr beats)
- **ϖ(t)** — longitude of perihelion (~23 kyr climatic precession)

These three are themselves derived from the gravitational coupling among the planets — Laskar 2004 publishes them as sums of fundamental-frequency beats `g_j ± g_k`, `k ± s_j`, etc. But in the classical paradigm, the *climate-relevant* quantity is the insolation those orbital elements produce.

### 1.2 The 8H-lattice paradigm (this framework)

Climate is driven by the **gravitational rhythm of the entire solar system**, parameterized as integer divisors of the 8H = 2,682,536-yr Solar System Resonance Cycle. Each integer corresponds to a specific planet–planet beat or a direct planet-cycle harmonic. The full L1 set is 32 integers (see [doc 93](93-l1-attribution-reference.md) for per-integer attribution).

The two paradigms are **not contradictory** — they describe the same gravitational physics. They differ in:

- **Granularity:** L1 enumerates 32 integer-divisor frequencies; Berger collapses these into 3 time-domain functions.
- **Channel:** Berger's reduction implicitly assumes insolation is the sole transmission mechanism. The lattice paradigm is agnostic about transmission — it captures the rhythm itself.
- **Expressivity:** Adding Berger insolation features to L1+L2+L3 yields ΔR² ≈ 0 (see §3). The lattice contains the variance the projection produces; the reverse is not true.

---

## 2. Why the lattice is more complete

Berger's three insolation features ε(t), e(t), ϖ(t) are themselves *defined* as Fourier projections of the same secular gravitational coupling that L1 enumerates. For example:

| Berger insolation feature | Decomposition into Laskar beats | Corresponding L1 integer |
|---------------------------|---------------------------------|--------------------------|
| Eccentricity 95-kyr beat | g₄ − g₅ (Mars-Jupiter) | n = 28 |
| Eccentricity 405-kyr line | g₂ − g₅ (Venus-Jupiter) | off-lattice → L2 |
| Climatic precession 23.7 kyr | k + g₅ (Jupiter) | n = 113 |
| Climatic precession 22.4 kyr | k + g₂ (Venus) | n = 120 |
| Obliquity 41.2 kyr | k + s₃ (Earth nodal) | n = 65 |

The periods in the first column are computed from the Laskar 2004 eigenmode beats — e.g. for the obliquity row, k + s₃ = 50.29 − 18.85 = 31.44″/yr, giving period 1,296,000 / 31.44 = 41,222 yr ≈ 41.2 kyr. The often-cited textbook rounding "41 kyr" (Berger 1978) and our model's 8H/65 = 41.27 kyr both refer to this same Laskar eigenmode period.

Every Berger insolation peak is *somewhere* in the L1 lattice (see [doc 93](93-l1-attribution-reference.md) for the full mapping). The lattice contains all of Berger, plus integer-divisor structure that Berger's reduction does not surface (planet-planet beats not historically considered insolation-relevant, like 8H/16 Mars Axial, 8H/35 Earth-Mercury-Saturn 3-term beat, etc.).

This is why **adding Berger insolation features to L1+L2+L3 yields ΔR² = 0**: the information is already there, parameterized at a finer-grained level.

---

## 3. The empirical case in one table

All numbers from the canonical regression scripts:

| Test | LR04 (post-MPT, 0–1000 kyr) | LR04 (0–500 kyr, Laskar window) | EPICA CO₂ (0–800 kyr) |
|------|----------------------------:|--------------------------------:|----------------------:|
| **L1 alone** (32 lattice integers) | **R² = 0.870** | R² ≈ 0.93 | R² ≈ 0.80 |
| **L1+L2+L3** (canonical formula) | **R² = 0.8735** | **R² = 0.9424** | **R² = 0.8452** |
| Berger insolation alone (model e/ϖ) | R² = 0.049 | R² = 0.188 | R² = 0.096 |
| **Berger insolation alone (Laskar e/ϖ)** | — | **R² = 0.293** | **R² = 0.172** |
| L1+L2+L3 + Berger insolation (model) | R² = 0.8776 → ΔR² = +0.0041 | R² = 0.9436 → +0.00123 | R² = 0.8494 → +0.0042 |
| **L1+L2+L3 + Berger insolation (Laskar)** | — | **R² = 0.9424 → +0.00000** | **R² = 0.9230 → +0.00001** |

Three lines tell the story:

1. **The 8H lattice (L1) carries the variance.** R² = 0.87 on post-MPT LR04 — the lattice alone, 32 sinusoids at fixed gravitational-rhythm frequencies.
2. **Classical insolation alone explains very little.** R² = 0.05 (with our model's e) → R² = 0.29 (with Laskar's full-range e). Significant absolute, but **a fraction of what L1 captures.**
3. **The two parameterizations carry overlapping, not independent, information.** Adding Laskar's better-parameterized insolation to L1+L2+L3 yields **ΔR² = 0.000** on LR04 and **ΔR² = 0.00001** on EPICA. The lattice already contains all of it.

The third line is the crux. Berger insolation's R² = 0.29 (Laskar e) is real — it's just *already inside L1*.

For the full breakdowns (per regime, per coefficient), see [doc 94 §3](94-insolation-null-test.md#3-results) (model-insolation test) and [doc 94 §8](94-insolation-null-test.md#8-hardening-test--substituting-laskar-2010-et-and-ϖt) (Laskar hardening test).

---

## 4. What this conclusion does — and does not — claim

### 4.1 What this claim says

- The **8H integer-divisor lattice** is a more complete regression basis for LR04 / EPICA / CenCO2PIP variance than the classical Berger insolation parameterization.
- Climate is forced by the **gravitational coupling rhythm of the solar system** — a many-body phenomenon involving Mercury through Neptune, not Earth-Sun geometry alone.
- The classical Milankovitch paradigm is empirically correct *within its scope* (its named peaks are real lattice integers), but it is **a projection, not the fundamental description**.

### 4.2 What this claim does NOT say

- It does NOT say insolation is irrelevant. Berger 1978's quantitative theory of insolation at any latitude/day is correct — its peaks correspond to specific lattice integers.
- It does NOT say Earth-Sun geometry is unimportant. ε(t), e(t), ϖ(t) are real orbital elements that do shape Earth's seasonal heating.
- It does NOT propose a new transmission mechanism between gravity and climate. Whether the channel is insolation, tidal stress, atmospheric tides, or some combination, the **rhythm** is what L1 captures, and the rhythm explains the variance regardless of channel mix.
- It does NOT claim universal explanatory power. R² collapses across regime boundaries (pre-MPT vs post-MPT, see [doc 92 §6.5](92-climate-formula.md), [doc 91 §5](91-milankovitch-evidence.md)). The framework is **descriptive within regimes, not predictive across boundary-condition shifts.**

### 4.3 What this claim *replaces*

The conventional summary "climate is driven by Milankovitch insolation forcing" is replaced by:

> **Climate is forced by the gravitational coupling among solar-system bodies. Insolation is one channel through which that coupling reaches Earth. The 8H integer-divisor lattice is a more complete description of the rhythm than the classical Berger insolation parameterization — strictly more expressive, no information lost.**

---

## 5. Why this matters

### 5.1 For climate science

- **Fitted lattice coefficients ARE the orbital-forcing signature**, not a separate quantity that needs reconciliation with Berger. The 32 L1 amplitudes (and 3 L2 amplitudes, and 6 L3 step betas) are the canonical decomposition of Cenozoic climate (see [doc 92](92-climate-formula.md)).
- **Off-lattice candidates** for climate forcing (e.g., 13H Boulila libration, 9-Myr long-period carbon resonance) should be tested **on top of L1** to establish independence — many turn out to be lattice shadows under spectral leakage (see [doc 91 §13](91-milankovitch-evidence.md)).
- **L2 silicate-weathering thermostat (405-kyr family) is the most important off-lattice mechanism.** It is independent of L1 because it requires both an orbital trigger AND nonlinear carbon-cycle amplification. It is the second pillar of the canonical formula.
- **L3 boundary-condition steps** at PETM, EOT, Mi-1, MMCT, iNHG, MPT carry the dominant CENOGRID variance — they are not orbital, they are tectonic / cryosphere regime shifts. Forward-prediction across L3 boundaries fails catastrophically (R² ≈ −0.9).

### 5.2 For solar-system dynamics

- The 8H = 2,682,536-yr period **is a real resonance period** for the solar system, not a mathematical artifact. Every L1 integer corresponds to a specific planet–planet beat or planet-cycle harmonic; the lattice is dense at low n (frequencies coalesce around obliquity, precession, and eccentricity bands) and sparse at high n.
- Earth's orbital elements are not independent — they are determined by the secular coupling with the other seven planets. This is well-known (Laskar 2004 derives it explicitly); what this work adds is that the **integer-divisor structure of the resonance period maps directly onto climate variance**.
- The lattice exposes that Berger's "Venus precession", "Jupiter precession", etc., are not separate phenomena — they are individual integer divisors of the same fundamental 8H period.

### 5.3 For the philosophy of orbital forcing

- Climate forcing is not "what insolation does" — it is **what the solar system does**. Insolation is *how* the forcing reaches Earth on the sunward channel, but the forcing itself is gravitational coupling.
- This reframing makes the analogous Holistic-Universe-Model claim about other planets tractable. Mars's polar caps, Saturn's storms, Jupiter's banded clouds — each planet experiences the same 8H rhythm projected through its own physics. The classical insolation framing localizes to Earth and obscures the universal pattern.

### 5.4 An observation about the current era

A consequence visible directly in the dashboard's forward-projection modal (Climate Formula Explorer in [`src/script.js`](../src/script.js)): **the L2 405-kyr carbon-thermostat layer in the canonical formula sits near a warming peak around the present era.** This is a fitted observation from LR04 — the layer's phase is set by the regression, and the cycle position then falls where it falls.

Quantitatively:

| Quantity | Value | Source |
|----------|-------|--------|
| L2 fundamental period | 405 kyr | g₂ − g₅ (Venus–Jupiter eccentricity beat) |
| L2 amplitude (post-MPT fit) | ~0.5–1.0 °C peak-to-trough | [`data/milankovitch-climate-formula.json`](../data/milankovitch-climate-formula.json) |
| Current phase | Near warm peak | Climate Formula Explorer modal |
| L2 rate of change at peak | < 0.005 °C / century | Derivative of fitted sinusoid |

**What this observation does and does not say.** To preempt misreading in either direction:

| Statement | Status |
|-----------|--------|
| The model's L2 layer is currently near a warm peak | ✅ Directly visible in fitted output |
| The natural pre-industrial baseline (~1850 CE) was slightly elevated (~0.3–0.5 °C) above the long-term natural mean | ✅ Implied by L2 phase position |
| L2 explains the ~1.2 °C industrial-era warming | ❌ False — L2's rate is ~300× too slow (cf. industrial-era ~0.7 °C / century vs L2 maximum ~0.005 °C / century) |
| Anthropogenic CO₂ warming is overstated | ❌ Not implied — L2 affects baseline *level*, not recent *rate* |

Two distinct natural-cycle signals point opposite directions for the current era:

- **Precession-driven NH summer insolation (~23 kyr)** is in a declining phase since the Holocene Climate Optimum (~10 kyr BP) → mainstream view: natural trend is *cooling*
- **405-kyr eccentricity carbon thermostat (our L2)** is near peak → our framework: natural baseline slightly *warmer* than long-term mean

Both signals are real; they sit at different timescales. Mainstream Holocene-attribution discussions emphasize the first (precession-cooling); the second (405-kyr-warming-baseline) is rarely cited outside cyclostratigraphy.

This is connected to the "Holocene Temperature Conundrum" — an active scientific debate ([Bova et al. 2021](https://www.nature.com/articles/s41586-022-05536-w)) about why proxy records and climate models disagree on the magnitude and direction of Holocene-era temperature trends. Our framework's fitted L2 phase happens to provide one quantitative element to that conversation. For positioning against the broader literature see [doc 96 §2](96-related-work.md#2-direct-revision-of-classical-tenets--zeebe--lantink-2024-aj) (Zeebe & Lantink 2024 on the 405-kyr metronome) and [doc 96 §5](96-related-work.md#5-methodological-neighbor--cyclostratigraphy-hinnov-acycle) (the cyclostratigraphy tradition).

The observation is offered here as an empirical fact about the model's fitted output — not as a contribution to the anthropogenic-warming debate.

---

## 6. Empirical anchors (one-page reference)

Each row is a measured quantity with a script that reproduces it:

| Quantity | Value | Source / script |
|----------|-------|-----------------|
| 8H Solar System Resonance Cycle | 2,682,536 yr | [doc 55](55-solar-system-resonance-cycle-periods.md), `model-parameters.json` |
| L1 lattice integers | 32 | [doc 93](93-l1-attribution-reference.md) |
| L1 alone, post-MPT LR04 | R² = 0.870 | `scripts/milankovitch_climate_formula.py` |
| L1+L2+L3, post-MPT LR04 | R² = 0.8735 | `data/milankovitch-climate-formula.json` |
| L1+L2+L3, EPICA CO₂ | R² = 0.8452 | same |
| L1+L2+L3, CenCO2PIP (0–66 Ma) | R² = 0.7626 | same |
| Berger insolation alone, LR04 0–500 kyr | R² = 0.293 (Laskar e) | `scripts/milankovitch_insolation_laskar_check.py` |
| Berger insolation added to L1+L2+L3 | ΔR² = 0.00000 (LR04), 0.00001 (EPICA CO₂) | same |
| L3 step at MPT (LR04 jump) | β = +1.13 | `data/milankovitch-climate-formula.json` |
| L1 dual-attribution rate | 32 / 32 integers | [doc 93](93-l1-attribution-reference.md) |
| Forward-projection R² across MPT | −0.87 (failure) | doc 92 Tier B R3-3 |

All numbers reproducible with `python3 scripts/milankovitch_*.py` (deterministic, no random seeds).

---

## 7. The framing in one paragraph

For the climate-modeling community: replace "Milankovitch insolation forcing" with **"solar-system gravitational coupling, projected onto Earth's climate-relevant axes."** The 8H integer-divisor lattice is the canonical decomposition; the Berger insolation parameterization is a special case (a 4-feature projection that loses information relative to the 32-integer lattice).

For everyone else: Earth's climate has rhythms because the solar system has rhythms. The Sun and the other seven planets are pulling on Earth's orbit at all times; the integer-divisor structure of the combined pull is what shows up in deep-sea sediments, in ice cores, and in atmospheric CO₂. We did not "discover" this — it is in Laskar's secular theory already. What this framework adds is an explicit, more-complete decomposition basis and the empirical demonstration that it strictly subsumes the classical insolation parameterization.

For how this conclusion relates to recent peer-reviewed work — Zeebe & Lantink 2024, Dutkiewicz et al. 2024, Wunsch 2003, Roe 2006, Boulila 2019, the cyclostratigraphy tradition, Munk's tidal-vs-insolation gap — see [doc 96 — Related work](96-related-work.md). The framework sits within an active 2024 wave of revisions to classical Milankovitch theory, not in contradiction to it; the genuinely-novel contributions are the **single fundamental-period 8H structure**, the **dual-attribution finding**, and the **empirical ΔR² = 0 result under Laskar 2010 substitution**.

---

## Related documents

- [Doc 90 — Milankovitch language](90-milankovitch-language.md) — terminology primer (g_j, s_j, k, eigenmode beats)
- [Doc 91 — Milankovitch evidence](91-milankovitch-evidence.md) — orbital-forcing → climate mapping, 14 hypothesis tests
- [Doc 92 — Climate formula](92-climate-formula.md) — canonical L1+L2+L3 architecture, regime-aware fits, forward-projection limits
- [Doc 93 — L1 attribution reference](93-l1-attribution-reference.md) — per-integer Berger vs Holistic top-1 attribution
- [Doc 94 — Insolation null test](94-insolation-null-test.md) — empirical basis for the conclusion synthesized here
- [Doc 96 — Related work](96-related-work.md) — position of this framework in the 2024 climate-forcing literature
- [Doc 55 — Solar System Resonance Cycle periods](55-solar-system-resonance-cycle-periods.md) — what each L1 integer is
- [Doc 10 — Fibonacci laws of planetary motion](10-fibonacci-laws.md) — the structural identities the integer divisors encode
