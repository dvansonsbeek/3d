---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:78f99d98186e50d9
status: current
---

# Milankovitch Language of the Holistic Model

> **TL;DR.** The model has **five** natural Milankovitch-band periods, all read against one clock — the mean lunisolar precession period — and connected by frame arithmetic: **apsidal precession (<!--v:inclPrecYears-->~111,570<!--/v--> yr; historically "inclination precession" in this framework), nodal (ecliptic) precession (<!--v:eclPrecYears-->~68,751<!--/v--> yr, the s₃ mode), the obliquity beat (<!--v:obliqCycleYears-->~41,224<!--/v--> yr), axial precession (<!--v:earthAxialPeriod-->25,771<!--/v--> yr), and perihelion-of-date precession (<!--v:periPrecYears-->~20,936<!--/v--> yr)**. Two of them are beats of the others — obliquity = axial − nodal, perihelion-of-date = axial + apsidal — frame arithmetic that holds at every epoch (§3). Standard secular theory gives the same periods because they ARE the same quantities: the model's values are its own engine's (the chain's apsidal tangent, the dominant nodal mode, the composed precession rate), and Berger 1978's climatic-precession peaks are the p + g_i lines of the shipped climate formula ([doc 92 §2](92-climate-formula.md)). *Note: in this framework the perihelion-of-date period is **perihelion precession** (the rotation of Earth's apsidal line in the ecliptic frame), distinct from **climatic precession** (~23.7 kyr dominant, e·sin ϖ — the p + g₀ line). The earlier presentation — five integer divisors of one master cycle closing as an integer algebra — is retired ([retired record](retired-record.md)): the integers were J2000 readings of these periods against the fitted anchor, and the live ratios wander.*
>
> For the **100-kyr ice age problem**, the model's <!--v:inclPrecYears-->~111,570<!--/v-->-yr apsidal-precession period lies in the same Rayleigh-limited band as the empirical centroid (Mercury-Mars s₁−s₄ nodal beat at ~107 kyr) — both sit on the *inclination-side / orbital-plane* family of eigenmode beats that Muller & MacDonald (1997, *PNAS*) argued for spectrally over direct eccentricity.
>
> Companion docs: [91 — Milankovitch Evidence & Hypothesis Tests](91-milankovitch-evidence.md) (the comb-era empirical tests — 14 hypothesis tests + the 405-kyr characterization; historical record, plan 06 T1); [92 — Climate Formula: Architecture, Variance & Implementation](92-climate-formula.md) (canonical L1+L2+L3 modular formula + per-regime ridge fits across LR04 / CENOGRID / EPICA / CenCO2PIP + Climate Formula Explorer modal).

**Related documents:**
- [10 — The six relations (historical record)](10-fibonacci-laws.md)
- [31 — Geometric Orbital Elements](31-no-chain-body-elements.md)
- [99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — Deep-time scaling of H(t); how Milankovitch periods evolve under Drivers 1 and 2
- Website: [model/eigenfrequencies](https://www.holisticuniverse.com/en/model/eigenfrequencies) — full eigenfrequency / divisor / Berger comparison
- Website: [model/supporting-evidence](https://www.holisticuniverse.com/en/model/supporting-evidence) §1 (100-kyr problem) and §12 (eigenfrequency convergence)
- Source: `src/script.js` `perihelionCycleLength` and the `eclipticPrecessionPeriod` family

> **Scope note (ESSRT).** The beat identities (obliquity = axial − nodal; perihelion-of-date = axial + apsidal) are frame arithmetic and hold at any epoch. The periods are J2000 values of dynamical quantities: the apsidal and nodal periods are the orbital engine's (they drift only with the solar-mass history); the axial precession and the beats that contain it ride the composed lunisolar clock at deep time ([doc 99](99-expanding-solar-system-resonance-theory.md)'s generated tables) — sub-percent over the LR04 1.2-Myr window (verified ~0.05 % over 1 Myr). The earlier scope note's "scale-invariant integers" and the 3H/13H multiples are retired: the 13H Boulila libration failed cross-window stability (doc 92 §8.4 R3-4) and the integers were J2000 readings.

---

## 1. Background — Milankovitch Theory and the MPT

Earth's Pleistocene climate is dominated by glacial-interglacial cycles attributed to periodic changes in Earth's orbit (Milankovitch 1941). Standard parameters:

| Orbital element | Standard period(s) | Insolation effect |
|---|---|---|
| Climatic precession (e · sin ω̃) | 19, 22, 23 kyr triplet | Strong seasonal forcing at low-mid lat |
| Obliquity (axial tilt) | ~41 kyr | Strong high-latitude seasonal contrast |
| Eccentricity | 95, 124, 405 kyr (beats ~100) | Direct ~0.2 % only; presumed amplified |
| Inclination / orbital-plane beats | ~70 kyr (s₃), ~110 kyr (s₁−s₄ centroid) | Inclination-side family; the model's 111.6-kyr apsidal period is discussed in §5.3 |

The **Mid-Pleistocene Transition (~1.2 → 0.7 Myr ago)** changed the dominant ice age period from **~41 kyr (obliquity-paced)** to **~100 kyr**, with no change in orbital forcing. The mechanism (Earth-system feedbacks, CO₂ thresholds, ice-sheet thickness) is outside this analysis. What the model *can* address: which orbital cycle's period best matches the post-MPT spectral peak.

The "100-kyr problem" is that standard eccentricity has *split* peaks at 95 & 124 kyr and a much stronger 405-kyr term that **doesn't appear** in the climate record. Standard rescue: nonlinear ice-sheet amplification of eccentricity. Minority view (Muller & MacDonald 1995, 1997): the peak is at ~110 kyr, matching orbital inclination, not eccentricity.

---

## 2. The Model's Five Natural Milankovitch Periods

The clock is the **mean lunisolar precession period**, <!--v:lunisolarPeriodJ2000Yr-->25,771.4<!--/v--> years at J2000 — the period of the composed torque rate on Earth's spin. Earth's other long cycles are dynamical quantities read against it: the apsidal and nodal periods from the N-body chain, the two beats by frame arithmetic. (The fitted anchor `holisticyearLength`, set on the 1246 AD perihelion–solstice alignment, is the correction bases' unit, not a period; its integer fractions were the earlier presentation of this table — [doc 10](10-fibonacci-laws.md) keeps that derivation as the record.)

| Cycle | What it is | Years (J2000) | Source |
|---|---|---:|---|
| **Apsidal precession** | the N-body chain's secular apsidal tangent | **<!--v:inclPrecYears-->~111,570<!--/v-->** | Earth's apsidal line vs the fixed stars (ICRF perihelion); §5.3 proposes an orbital-plane component at this period |
| **Nodal (ecliptic) precession** | the dominant nodal mode s₃ of Earth's orbit on the invariable plane | **<!--v:eclPrecYears-->~68,751<!--/v-->** | Earth's orbital plane regression = **nodal regression** (`f_nodal` in §3); Jupiter's ecliptic perihelion period (<!--v:jupiterPeriPeriod-->68,783<!--/v--> yr, a window-epoch device value) sits nearby |
| **Obliquity oscillation** | the beat 2π/(ψ̇ − \|s₃\|) of the composed precession against the nodal mode | **<!--v:obliqCycleYears-->~41,224<!--/v-->** | Beat: f_axial − f_nodal; falsification leg 1 at deep time |
| **Axial precession** | the composed lunisolar torque rate's period | **<!--v:earthAxialPeriod-->25,771<!--/v-->** | Earth's spin-axis equinox precession |
| **Perihelion-of-date precession** | the of-date year laws' beat: f_axial + f_apsidal | **<!--v:periPrecYears-->~20,936<!--/v-->** | Also the carrier of the Berger climatic-precession band (~19–24 kyr); the dominant Berger peak is the p + g₀ line at 23.76 kyr (doc 92 §2). |

None of the five is fitted to a Milankovitch value: the apsidal and nodal periods are the N-body chain's, the axial precession is the composed torque rate's period, and the two beats follow from those three by frame arithmetic. (The earlier statement here — "all five are integer divisors of H, locked by integer arithmetic" — is retired: 111,772 / 67,063 / 41,915 / 25,794 / 20,957 were the fitted anchor's fractions, 0.1–2.5 % off the dynamical values above.)

---

## 3. The beat identities — frame arithmetic

The five cycles are not independently chosen — they satisfy four **kinematic beat-frequency identities**. These are geometric facts (the obliquity of a precessing axis relative to a precessing orbital plane *is* the difference of the two motions) — they hold for any precessing system, not just Earth's, and at every epoch:

| Physical identity | Rate form (1/T) | J2000 reading against the fitted anchor (retired as structure) |
|---|---|---|
| f_obliquity = f_axial − f_nodal | 1/T_obl = 1/T_p − 1/T_nodal | 13 − 5 = 8 |
| f_perihelion = f_axial + f_apsidal | 1/T_peri = 1/T_p + 1/T_aps | 13 + 3 = 16 |
| f_apsidal = f_obliquity − f_nodal | 1/T_aps = 1/T_obl − 1/T_nodal | 8 − 5 = 3 |
| f_nodal = f_axial − f_obliquity | 1/T_nodal = 1/T_p − 1/T_obl | 13 − 8 = 5 |

Only the first two are physically independent — the rest follow algebraically. The right-hand column is what the identities looked like when the five periods were read as integer fractions of the fitted anchor: the arithmetic closed because the readings were rounded to integers that happen to add, not because the periods are locked. The obliquity row is the one physical beat the model predicts at deep time (2π/(ψ̇ − |s₃|), falsification leg 1).

The identities are geometric facts of any precessing axis and orbit; they hold at every epoch. The former reading that they "close only because the divisors are those particular integers" is retired ([retired record](retired-record.md)): the integers were the J2000 values of the five periods against the fitted anchor, and the live ratios wander — T_aps/T_p runs <!--v:lunisolarApsidalPerPrecessionWanderMin-->0.83<!--/v-->–<!--v:lunisolarApsidalPerPrecessionWanderMax-->9.89<!--/v--> across ±26 kyr (the simulator's Lunisolar Clock panel). Any two of the three primary rates (axial, apsidal, nodal) plus the identities fix the two beats.

---

## 4. Comparison with Standard Secular Theory — Direct Matches

> **A note on eigenmode labelling.** The secular eigenmodes g_j (apsidal) and s_j (nodal) are **mathematical objects** — eigenvalues of the Laplace-Lagrange perturbation matrix capturing gravitational coupling between all eight planets. Both Berger 1978 and the Holistic model accept the eigenmodes. What differs is **attribution**: Berger labels each g_j / s_j by the planet whose contribution dominates that mode (g₅ = "Jupiter", g₂ = "Venus", …), while the Holistic model treats the eigenmodes as **composite modes of the multi-planet system** and does not equate them to single-planet quantities. The model's planet-specific cycles are per-planet quantities (e.g., Jupiter's ecliptic perihelion period 68.78 kyr, its ICRF perihelion period 41.27 kyr and its axial period — three distinct device cycles, none equal to 1/g₅; the per-planet integer tabulation is archived, [retired record](retired-record.md), and [doc 109](109-model-nbody-engine-and-lattice-test.md) carries the measured frequencies). The "(Jupiter)" / "(Mercury)" / etc. labels in the tables that follow are Berger's convention, retained for consistency with the literature.

### 4.1 Standard Milankovitch periods

None of the five model periods is fitted to a Milankovitch value — they are the engine's own dynamical quantities (the chain's apsidal tangent, the dominant nodal mode, the composed precession rate) and the two beats of those by frame arithmetic. Each matches the independently published standard value:

| Model | Standard value | Source | Deviation |
|---|---|---|---|
| apsidal <!--v:inclPrecYears-->~111,570<!--/v--> yr | ~111,700 yr (apsidal precession incl GR) | Bretagnon 1974, Standish 1992 | ≈ 0.1 % |
| nodal <!--v:eclPrecYears-->~68,751<!--/v--> yr | 68,761 yr (s₃ Earth nodal eigenfrequency) | Laskar 2004 | ≈ 0.01 % (the same mode) |
| obliquity beat <!--v:obliqCycleYears-->~41,224<!--/v--> yr | ~41,000 yr (Berger obliquity peak); 41,222 yr as k + s₃ | Berger 1978; Laskar 2004 | ≈ 0.5 % / 0.01 % |
| axial <!--v:earthAxialPeriod-->25,771<!--/v--> yr | ~25,772 yr (axial precession k) | IAU 2006 | ≈ 0.00 % |
| perihelion-of-date <!--v:periPrecYears-->~20,936<!--/v--> yr | 19/22/23 kyr triplet centroid ~22 kyr | Berger 1978 | **< 5 %** (within band) |

### 4.2 Berger 1978 climatic-precession spectrum

The Berger climatic-precession spectrum is a **set of six** peaks from `g_j + k` beats (apsidal eigenfrequencies plus axial precession k). In the shipped climate formula these ARE the lines: p + g_i on the engine's own g-modes (the five at relative amplitude ≥ 0.1 are in [doc 92 §2](92-climate-formula.md)'s generated table, 19.0–23.8 kyr). The comb era matched each Berger peak to an integer divisor of the eight-unit base instead — the table below is that record (the labels were retired by T1):

| Berger period (yr) | Eigenmode (Berger label) | comb-era divisor n (record) | Deviation | comb-era attribution (record) |
|---:|---|---:|---:|---|
| 23,716 | g₅ + k (Jupiter) | n = 113 → 23,739 | 0.10 % | Earth.Axial(104) + Mercury.Obliq(3) + Saturn.Axial(6) (3-term) |
| 23,159 | g₁ + k (Mercury) | n = 116 → 23,125 | 0.15 % | — (not in canonical L1) |
| 22,428 | g₂ + k (Venus) | n = 120 → 22,354 | 0.33 % | **Earth.Axial(104) + Jupiter.Obliq(16)** (clean 2-term beat) |
| 19,155 | g₃ + k (Earth) | n = 141 → 19,025 | 0.68 % | **In canonical L1 as the Berger-quintet completion (k+g₃, doc 92 §2.3)** |
| 18,976 | g₄ + k (Mars) | n = 141 → 19,025 | 0.26 % | — (nearest n=141 is attributed to k+g₃; k+g₄ enters via sideband n=152) |
| 16,469 | g₆ + k (Saturn) | n = 163 → <!--v:saturnEccCycle-->16,457<!--/v--> | 0.07 % | — (not in canonical L1) |

All six peaks match an integer-divisor position. **Berger names each peak after a single planet** (g_j + k convention) while the Holistic model derives the same LR04 lattice peaks via **multi-planet beats from PLANET_CYCLES** — see [doc 93 — L1 attribution reference](93-l1-attribution-reference.md) for all 33 L1 lattice components with full ranked attribution alternatives. The structural decomposition is `n = 104 + δ_j` where 104 = 8 × 13 is Earth's axial precession integer (see website [eigenfrequencies.mdx §"Berger climatic precession peaks"](https://www.holisticuniverse.com/model/eigenfrequencies#berger-climatic-precession-peaks)).

### 4.3 Eigenfrequency convergence at H/3 and H/5

The Laskar (La2004) secular solution decomposes eccentricity and inclination into eight g_j and s_j eigenmodes. **Multiple independent combinations converge on H/3 and H/5**:

**The apsidal period, <!--v:inclPrecYears-->~111,570<!--/v--> yr**, sits among three combinations:

| Combination | Physical meaning | Period (yr) | Deviation |
|---|---|---:|---:|
| Total apsidal rate (Earth) | Earth perihelion precession (~11.6″/yr) | ~111,000 | ≈ 0.5 % |
| g₃ − g₁ | Earth–Mercury eccentricity beat | 109,950 | ≈ 1.5 % |
| \|s₂ − s₃\| | Venus–Earth inclination beat | 109,851 | ≈ 1.6 % |

**The nodal period, <!--v:eclPrecYears-->~68,751<!--/v--> yr**, IS the s₃ mode; one beat sits near it:

| Combination | Physical meaning | Period (yr) | Deviation |
|---|---|---:|---:|
| s₃ | Earth nodal regression eigenfrequency | 68,761 | ≈ 0.01 % (the model's value is this mode) |
| \|s₂ − s₆\| | Venus–Saturn inclination beat | 67,158 | **0.14 %** |

The ~111-kyr region is "crowded": three distinct physical mechanisms all land within ±1.6 % of the apsidal period. This convergence is **not** required by any theory we know — secular eigenfrequencies depend on all planet masses and semi-major axes, and there is no a-priori reason for these combinations to converge.

### 4.4 Deep-time multiples of the anchor (3H, 13H) — retired

Kept as the record: the 13H Boulila match failed cross-window stability (amplitude CV 42–50 %, phase circular std ≈ uniform — doc 92 §8.4 R3-4), and with the integer framing retired the multiples of the fitted anchor carry no claim.

| Multiple | Years | Matched geological cycle | Standard | Deviation |
|---|---:|---|---:|---:|
| **3H** | <!--v:threeH-->1,005,951<!--/v--> | g₁ − g₅ Mercury–Jupiter eccentricity envelope | ~980,000 yr | **2.6 %** |
| **13H** | <!--v:thirteenH-->4,359,121<!--/v--> | Earth–Mars secular resonance libration (Boulila 2018) | ~4,500,000 yr | **3.1 %** |

The Boulila et al. 2018 *EPSL* result identifies a ~4.5 Myr cycle in Mesozoic-Cenozoic sediments from the resonant argument θ = 2(g₄ − g₃) − (s₄ − s₃). The model's 13H falls within range.

**Five and eight times the anchor do not match known cycles** — and the multiple pattern is retired with the integer framing.

---

## 5. The 100-kyr Problem — How the Model Speaks to It

(For the full position statement see [website supporting-evidence §1](https://www.holisticuniverse.com/en/model/supporting-evidence).)

### 5.1 The standard attribution and its problems

The standard story attributes the post-MPT ~100-kyr ice age cycle to **eccentricity**. Specific problems:

1. **Spectral mismatch.** Eccentricity has a *split* peak at ~95 and ~125 kyr; climate records show a *single narrow peak* near ~100 kyr (Muller & MacDonald 1997).
2. **The 405-kyr absence.** Eccentricity's theoretically *strongest* term is the 405-kyr g₂−g₅ Venus-Jupiter beat, which is largely absent from climate records of the past 1.2 Myr (doc 91 §7.1 quantifies the absence: amplitude ratio 0.12 vs the 100-kyr peak in post-MPT LR04).
3. **Weak forcing.** Eccentricity changes Earth's annual-mean insolation by only ~0.2 %, requiring rescue amplification mechanisms (CO₂ thresholds, ice-sheet nonlinearity) that aren't independently established.

### 5.2 The Muller-MacDonald inclination alternative

**Muller & MacDonald (1997, *PNAS* 94, 8329)** argued spectrally that the cycle is **inclination-driven** at ~110 kyr. Quoting their key finding:

> "The shape of the peak is incompatible with both linear and nonlinear models that attribute the cycle to eccentricity."

Their spectral evidence has **never been refuted**; what was rejected was their proposed mechanism (interplanetary dust accretion). Recent work (Barker 2025 *Science*; Mitsui 2025 *Earth System Dynamics*; Lisiecki 2023 *Nature Geoscience*) keeps the question open.

### 5.3 The model's position

The model's broader claim — that the 100-kyr cycle sits in the **inclination-side / orbital-plane family** of eigenmode beats rather than direct eccentricity — is empirically supported by doc 91 §4:

- The 100-kyr-band centroid is the **Mercury-Mars s₁−s₄ nodal beat at n=25 = 107.3 kyr** — a planet-pair orbital-plane coupling (not an eccentricity beat).
- The 405-kyr g₂−g₅ eccentricity term is essentially absent in post-MPT LR04 (amplitude ratio 0.12 vs the 100-kyr peak — doc 91 §7.1).
- Bispectral analysis finds no significant 95k + 125k eccentricity-beat phase coupling (doc 91 §7.2, replicating M-M 1997).

Within that inclination-side family, the model **proposes** a specific dust-free mechanism:

$$\text{Apsidal precession period (~111.6 kyr)} \;\rightarrow\; \text{second obliquity component at that period} \;\rightarrow\; \text{standard Milankovitch insolation forcing} \;\rightarrow\; \text{ice sheets}$$

Earth's actual obliquity would then have **two** components — one at the obliquity beat ≈ 41 kyr (the well-known Berger 1978 obliquity cycle) and a second at the apsidal period ≈ 112 kyr. Standard secular theory distributes that component across smaller spectral terms rather than recognising it as one peak. Every step after "second obliquity component" is standard Milankovitch physics; the mechanism needs no new forcing.

Important distinction: the apsidal period (111.6 kyr) and the empirically dominant Mercury-Mars nodal beat at 107.3 kyr lie within one Rayleigh element of each other at T = 1.2 Myr (ΔP ≈ 10 kyr at P = 110 kyr — doc 91 §4.3), so the data cannot single out the apsidal period specifically. The empirical signal is consistent with the inclination-side family but does not confirm the model's specific second-obliquity proposal. That proposal remains **theoretical** within the broader empirically-supported framework.

Full mechanism statement: [website supporting-evidence §6](https://www.holisticuniverse.com/en/model/supporting-evidence).

**Why the 100-kyr cycle only emerged at the MPT (visibility-mechanism candidates):**

- **Farley 1995 *Nature*** evidence: ³He measurements show interplanetary dust accretion *did* increase at ~1 Ma, consistent with dust as the visibility-mechanism even if not the only one.
- **Willeit et al. 2019 *Science Advances***: ice-sheet threshold mechanism — progressive CO₂ decline at MPT allowed ice sheets to grow past obliquity-sensitive size, "silencing" the 41-kyr pacemaker and letting the always-present 111.7-kyr inclination signal become climatically visible.

The model treats the inclination cycle as a *permanent formation-epoch feature* of the solar system; the MPT is then about when this cycle became climatically *detectable*, not when it began.

---

## 6. Scope and Empirical Evidence

This document is the *framework* — what the model says about Milankovitch.

The empirical evidence lives in [doc 91 — Milankovitch Evidence & Hypothesis Tests](91-milankovitch-evidence.md): spectral analysis of LR04 + Cheng 2016 + EPICA + CENOGRID, the comb-era 33-component formula (record), per-planet contributions, the MPT amplitude-growth analysis, a pre-registered super-cycle hypothesis test (NULL), fourteen falsifiable follow-up tests (16 positives / 2 partials / 5 nulls), and the 405-kyr off-lattice characterization as a Layer-2 carbon-cycle thermostat resonance.

The canonical L1 + L2 + L3 modular formula — per-regime ridge fitting across LR04 / CENOGRID / EPICA / CenCO2PIP, stitched per-regime evaluation, and the Climate Formula Explorer modal in `src/script.js` — is documented in [doc 92 — Climate Formula: Architecture, Variance & Implementation](92-climate-formula.md).

**Five headline findings from doc 91 §1**:

1. Every significant LR04 climate peak sits at one of the engine's own secular beat lines — the pre-registered test T1 showed the physical line set matches or beats the comb in every LR04 regime and beats a same-size random null ([doc 92 §2](92-climate-formula.md)); the comb-era reading "integer divisor of the eight-unit base (32 of 33 with clean interpretations)" is retired, its attribution work kept in doc 93.
2. **Mars dominates the per-planet climate fingerprint** (two exclusive direct matches in LR04 full, three more in pre-MPT).
3. **The 100-kyr glacial cycle is an inclination-side eigenmode beat** (Mercury-Mars s₁−s₄ nodal at 107 kyr), not direct eccentricity forcing — vindicates Muller-MacDonald 1997's framing.
4. Pre-MPT and post-MPT differ in **climate sensitivity, not orbital forcing**.
5. Forward projection: the next natural glacial maximum is predicted at ~58,000 years from now (~ 60,000 CE), with the strongest glacial in the next 250 kyr at ~198,000 years from now. Orbital-only — see [doc 92 §9.7](92-climate-formula.md#97-forward-projection-scope) and doc 58 for the anthropogenic-CO₂ caveat (Ganopolski 2016 framing).

The framework laid out in §§ 1–5 of this document (five spin-tier periods read against one clock, the beat identities, the Berger 1978 spectrum as the p + g_i lines, eigenmode convergence at the apsidal and nodal periods, cross-planet validation) **stands independently** of the specific 100-kyr-cycle attribution. See [doc 91 §4.8](91-milankovitch-evidence.md#48-what-stands-independently-of-the-100-kyr-cycle-attribution) for what remains robust regardless of how the 100-kyr question resolves.

**What the model addresses and does not** (scope):

| Question | Within scope? |
|---|---|
| Match of the model's spin-tier periods to standard Milankovitch values | **Yes** — §§ 2, 4 |
| Whether the 100-kyr cycle is best attributed to the apsidal/inclination-side period or eccentricity beats | **Yes** — see doc 91 §§ 3, 4, 7 |
| Mechanism by which inclination forcing becomes climatically visible at MPT | **Partial** — model cites Farley dust + Willeit threshold as compatible; doesn't discriminate |
| Cause of the MPT itself (ice-sheet response change) | **No** — Earth-system physics, outside scope |
| Future climate prediction | **No** — requires ice-sheet dynamics |

---

## 7. References

**Standard Milankovitch and the 100-kyr problem**
1. Berger, A. (1978). Long-term variations of daily insolation and Quaternary climatic changes. *J. Atmos. Sci.* 35, 2362.
2. Berger, A. & Loutre, M. F. (1991). *Quat. Sci. Rev.* 10, 297.
3. Laskar, J. et al. (2004). A long-term numerical solution for the insolation quantities of the Earth. *A&A* 428, 261.
4. Lisiecki, L. E. & Raymo, M. E. (2005). LR04 stack of 57 benthic δ¹⁸O records. *Paleoceanography* 20, PA1003.

**Muller-MacDonald inclination hypothesis**
5. Muller, R. A. & MacDonald, G. J. (1995). Glacial cycles and orbital inclination. *Nature* 377, 107.
6. Muller, R. A. & MacDonald, G. J. (1997). Glacial cycles and astronomical forcing. *PNAS* 94, 8329.

**Mechanism / supporting**
7. Farley, K. A. (1995). Cenozoic variations in the flux of interplanetary dust recorded by ³He in deep-sea sediments. *Nature* 376, 153.
8. Willeit, M. et al. (2019). Mid-Pleistocene transition triggered by gradual CO₂ removal. *Science Advances* 5, eaav7337.

**Recent open-debate papers**
9. Barker, S. et al. (2025). Distinct roles for precession, obliquity, and eccentricity in Pleistocene 100-kyr glacial cycles. *Science* 387, eadp3491.
10. Mitsui, T. et al. (2025). On the 100-kyr cycle of Pleistocene glaciations. *Earth Sys. Dyn.* 16, 1569.
11. Lisiecki, L. E. (2023). Precession pacing of Late Pleistocene ice-sheet changes. *Nature Geoscience*.

**Deep-time cycles**
12. Boulila, S., Vahlenkamp, M., De Vleeschouwer, D., Laskar, J., Yamamoto, Y., Pälike, H., et al. (2018). Towards a robust and consistent middle Eocene astronomical timescale. *Earth and Planetary Science Letters* 486, 94–107. https://doi.org/10.1016/j.epsl.2018.01.003

**Holistic model**
13. eigenfrequencies.mdx — full eigenfrequency / divisor / Berger comparison
14. supporting-evidence.mdx §1 (100-kyr problem) and §12 (eigenfrequency convergence)

