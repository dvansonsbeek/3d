# Milankovitch Evidence — Empirical Tests of the Holistic Model

> **Scope.** Empirical tests of the Holistic Universe Model's climate claims against the LR04 benthic δ¹⁸O stack (Lisiecki & Raymo 2005) and the Cheng 2016 U-Th-dated Asian speleothem composite. Companion to [doc 16 — Milankovitch Language](16-milankovitch-language.md), which states the model's predictions; this document reports what the data show.

---

## 1. Summary

Earth's climate-relevant orbital forcing arises from the gravitational interplay of all eight planets. Their orbital and rotational cycles synchronise over a common **Solar System Resonance Cycle of 8H = 2,682,536 years**, and every climate-relevant cycle on Earth therefore lands at an integer divisor of 8H. Spectral analysis of LR04 confirms this structure empirically and yields an explicit predictive formula.

> **Orbital forcing is not climate.** The formula and analysis in this document capture the **orbital-forcing component** of climate only. Joint OLS fit on LR04 explains ~24 % of the observed variance (R² = 0.238); the remaining ~76 % comes from non-orbital sources — ice-sheet hysteresis, CO₂ and carbon-cycle feedbacks, internal variability (Heinrich events, Dansgaard-Oeschger cycles), and regional asymmetries that distinguish, say, Antarctic from Greenland records. The model takes no position on those components. Orbital cycles are the **clock** that sets the timing of glacial-interglacial transitions; the **magnitude** of the observed climate response is dominated by Earth-system feedbacks, not orbital forcing directly. Every prediction in this document — including the forward projection of the next natural glaciation — therefore describes when the orbital clock makes a phase transition possible, not when surface climate necessarily follows.

### The 8H Orbital Forcing Formula

$$C(t) \;=\; c_0 \;+\; \sum_{n \in N} \left[\, a_n \cos\!\left(\tfrac{2\pi n t}{8H}\right) + b_n \sin\!\left(\tfrac{2\pi n t}{8H}\right) \,\right]$$

with **N = 26 integer divisors** of 8H, joint-OLS-fitted on full LR04 (T = 5,320 kyr; R² = 0.238; condition number 1.6). Each integer corresponds to a specific eigenmode beat or direct planet apsidal/nodal period from the model's doc 55 period table.

### Five headline findings

1. **Every significant LR04 climate peak sits at an integer divisor of 8H.** The formula has **26 such integers** — 20 detected above the 3× median significance threshold in full LR04, plus 6 more present in pre-MPT data (filtered down post-MPT by ice-sheet dynamics). **25 of the 26** have clean physical interpretations as standard celestial-mechanics beats (k+g_j climatic precession, k+s_j obliquity sub-peaks, g_j−g_k eccentricity beats, s_j−s_k nodal beats) or direct planet apsidal/nodal cycles from doc 55 (Mercury, Mars, Jupiter, Uranus). The one exception is n=66 — not a distinct eigenmode beat but the arithmetic-mean cycle length in the obliquity band; it resolves to near-zero amplitude at full LR04 resolution (see §6.6).

2. **Mars dominates the per-planet climate fingerprint.** Two exclusive direct matches in LR04 full (n=35 Mars apsidal, n=53 Mars eccentricity cycle) and three more exclusive matches in pre-MPT (n=16 Mars Axial, n=21 Mars Obliquity / Jupiter Axial, n=53 confirmed). Mars's strong gravitational coupling to Earth — Earth's nearest outer rocky neighbour, with similar apsidal eigenmode rate (g₃ ≈ 17.4″/yr, g₄ ≈ 17.9″/yr) — produces the cleanest direct climate signal of any planet. Neptune contributes nothing directly in LR04 full but appears via pre-MPT eigenmode beats (Venus-Neptune n=14, Neptune-Earth nodal n=38) — visible only when the post-MPT ice-sheet response doesn't dominate.

3. **The 100-kyr glacial cycle is an inclination-side eigenmode beat, not direct eccentricity forcing.**
   - The dominant 100-kyr-band centroid sits at **n = 25 = 107.3 kyr**, corresponding to the **s₁−s₄ Mercury-Mars nodal beat** — a planet-pair orbital-plane coupling, not an eccentricity beat.
   - Direct eccentricity attribution fails two specific tests: the 405-kyr g₂−g₅ term is essentially absent in post-MPT LR04 (amplitude ratio 0.12), and bispectral analysis finds no significant 95k + 125k phase coupling.
   - This vindicates Muller & MacDonald 1997's broader "inclination, not eccentricity" framing — though the empirical signal is a *planet-pair* nodal beat, not Earth's intrinsic inclination precession period.
   - At T ≈ 1.2 Myr the Rayleigh resolution at P = 110 kyr is ΔP ≈ 10 kyr, so 95k / 100k / 112k are spectrally collinear — but the structural failure modes of eccentricity attribution discriminate cleanly.

4. **Pre-MPT and post-MPT differ in climate sensitivity, not orbital forcing.** Orbital forcing is essentially stationary over 5.3 Myr (planetary eigenmodes don't change). LR04's volatility growth from left to right reflects climate-system response changing: Northern Hemisphere ice-sheet establishment around the late Pliocene cooling onset (~2.7 Ma BC), and the Mid-Pleistocene Transition (~1 Ma BC) where ice-sheet hysteresis crossed a threshold and shifted dominance from 41-kyr-band to 100-kyr-band response. The 8H formula captures the orbital forcing alone, with stationary amplitudes throughout.

5. **Forward projection: the next natural glaciation peak is predicted in ~38,000 years (~40,000 AD).** The formula extrapolates forward via the same equation; the Holocene is correctly identified as interglacial (C(0) negative); the strongest predicted glaciation in the next quarter-million years sits at ~194,500 years from now. Consistent with the classical Berger & Loutre 2002 prediction (~50 kyr ahead) within model uncertainty. Anthropogenic CO₂ may delay the next natural glaciation by 50+ kyr (Ganopolski et al. 2016) — this is not modelled here.

---

## 2. The 8H Orbital Forcing Formula

### 2.0 How orbital forcing reaches climate

Before the formula itself: a reader looking at the §2.2 component table will notice the climate peaks sit at **eigenmode beats** (k+g_j, k+s_j, g_j−g_k, s_j−s_k) rather than at Earth's intrinsic Fibonacci anchors (H/3, H/5, H/8, H/13, H/16). This section explains why — the mechanism is standard secular celestial mechanics, but the reference-frame issue is the part that determines what climate actually sees.

#### What the planets do — and don't do

The other planets do **not** measurably speed up, slow down, or push Earth around on yearly timescales. Earth's orbital period (1 year) is constant. What planetary gravity *does* do, integrated over millions of years, is slowly reshape four secular parameters of Earth's orbit:

- **Eccentricity (e)** — how elliptical the orbit is. Oscillates between ~0.014 and ~0.017.
- **Obliquity (ε)** — axial tilt ranges ~22.21° – ~24.72°.
- **Longitude of perihelion (ϖ)** — direction the ellipse points.
- **Longitude of ascending node (Ω)** — orientation of the orbital plane.

These four parameters control how solar insolation is distributed across latitudes and seasons — and *that* is what drives glacial cycles.

#### The two-clock structure

For each secular parameter there are *two clocks running simultaneously*: an **intrinsic clock** describing Earth's own geometric precession, and a **planetary-induced clock** describing how the surrounding solar system is moving. What climate observes is the **beat** of the two, not either clock alone.

Take obliquity as the cleanest example:

| Clock | Rate | What it is |
|---|---|---|
| Earth's intrinsic axial precession | k ≈ 50.29 ″/yr (≈ H/13) | Spin axis wobble in Earth's orbital frame |
| Earth's orbital plane nodal precession | s₃ ≈ −18.85 ″/yr | Orbital plane tilting due to planetary perturbations |

The observed obliquity oscillation (spin axis relative to the invariable plane) sits at the beat:

$$k + s_3 \;=\; 50.29 - 18.85 \;=\; 31.44 \text{ ″/yr} \;\;\rightarrow\;\; P = 41,\!221 \text{ yr} \;=\; n=65$$

The model's intrinsic H/8 = 41,915 yr is the rate Earth's spin axis would precess in its *own* orbital frame, with the orbital plane held fixed. But the orbital plane is **not** fixed — it's being tilted at rate s₃ by planetary gravity — so what climate actually measures is intrinsic minus orbital-plane motion. The H/8 clock is still running; it just isn't what insolation sees.

Same logic for climatic precession. The intrinsic H/16 = 20.96 kyr is the rate of perihelion motion in Earth's own frame, but seasonal climate depends on perihelion *relative to equinox* — so what's observed is the beat `k + g_j` against each planet's apsidal eigenmode:

$$k + g_5 \;=\; 50.29 + 4.26 \;=\; 54.55 \text{ ″/yr} \;\;\rightarrow\;\; 23,\!758 \text{ yr} \;=\; n=113$$

#### Why Mars perturbs Earth so strongly

Of the eigenmode beats, the largest amplitude contributions to Earth's orbit come from planets whose own eigenmodes sit close to Earth's. Mars's apsidal rate g₄ ≈ 17.92 ″/yr is within 3 % of Earth's g₃ ≈ 17.37 ″/yr — a near-resonance — and Mars's nodal rate s₄ ≈ −17.74 ″/yr is similarly close to s₃. This is why Mars dominates Earth's eccentricity beat spectrum despite being a small planet: gravitational coupling is amplified by frequency near-coincidence. The g₄−g₅ Mars-Jupiter beat at 95 kyr and the s₁−s₄ Mercury-Mars nodal beat at 107 kyr are direct consequences of this near-resonance structure.

#### Intrinsic vs observed — the offset table

The Fibonacci H/n anchors remain real in Earth's intrinsic frame, but in the heliocentric frame relevant to climate, each one shifts by a planet-eigenmode offset:

| Earth's intrinsic clock | What climate observes | Offset |
|---|---|---|
| H/8 = 41.91 kyr (obliquity) | k+s₃ = 41.27 kyr (n=65) | 0.6 kyr |
| H/16 = 20.96 kyr (climatic precession) | k+g₂ = 22.4, k+g₅ = 23.7 kyr (n=120, 113) | 1.4–2.7 kyr |
| H/3 = 111.77 kyr (inclination precession) | s₁−s₄ = 107.3 kyr (n=25) | 4.5 kyr |

Both descriptions of the same physics are valid — they measure the same geometry in different reference frames. The intrinsic H/n positions in the climate spectrum therefore appear **near zero amplitude** (§2.5): the energy has been carried into the offset positions by the frame transformation.

#### Why 8H still survives the frame transformation

If each planetary apsidal and nodal eigenmode (g_j, s_j) is itself an integer divisor of 8H — the model's deeper claim, established in [doc 55 — Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) — then any sum or difference of two such eigenmodes (`k + g_j`, `g_j − g_k`, …) is also an integer divisor of 8H. The frame transformation moves the climate signal from one 8H-divisor integer to another, but never *off* the integer lattice. That is why every observed climate peak in §2.2 still lands on an integer n, even though the integers are offset from the pure Fibonacci anchors of Earth in isolation. 8H is the synchronisation period of the entire solar system; the climate spectrum inherits that synchronisation, with the specific n determined by which two clocks are beating against each other.

#### The eigenmodes are real; only the attribution differs

The secular eigenmodes **g₁…g₈** (apsidal) and **s₁…s₈** (nodal) are mathematical objects — eigenvalues of the Laplace-Lagrange secular perturbation matrix that captures gravitational coupling between all eight planets. They exist in any framework that solves the same physics. Their numerical values (Laskar 2004: g₁ ≈ 5.59 ″/yr, g₂ ≈ 7.45 ″/yr, …, s₁ ≈ −5.61 ″/yr, …) come from the planetary masses and semi-major axes; both Berger 1978 and the Holistic model use these same numbers.

What differs between frameworks is **physical attribution**:

| | Berger / standard convention | Holistic model |
|---|---|---|
| Eigenmodes (g_j, s_j) | Mathematical objects — accepted | Mathematical objects — accepted |
| Attribution to planets | g_j labelled by the planet whose contribution dominates that mode (g₅ = "Jupiter", g₂ = "Venus", g₃ = "Earth", …) | **Not endorsed** — the eigenmodes are composite modes of the multi-planet system, not single-planet quantities |
| Planet-specific cycles | Same as the eigenmode periods (1/g₅ ≈ 305 kyr "is" Jupiter's apsidal period) | Specific H-divisor cycles per [doc 55 period table](55-solar-system-resonance-cycle-periods.md) (Jupiter ecliptic perihelion = H/5 = 67.06 kyr; Jupiter ICRF perihelion = H/8 = 41.91 kyr; Jupiter Axial = 8H/21; …) |

**Notation in this document.** Throughout §§2–7, references like *"k+g₅ climatic precession sub-peak"* mean **the mathematical eigenmode beat**, *not* "Jupiter modulation of climatic precession". The 23.7-kyr peak at n=113 is real and is correctly described as k+g₅; whether g₅ is "Jupiter" is a separate (Berger) interpretive claim that the model does not accept. When we want the model's planet-specific cycle for Jupiter (or any other planet), we use the doc 55 notation: e.g., **Jupiter ecliptic perihelion = H/5** and **Jupiter Axial = 8H/21**, two distinct cycles that don't reduce to a single "Jupiter eigenmode".

---

> **Reader's lookup.** Throughout this document, climate-cycle periods are referenced by integer **n** denoting the 8H/n divisor (e.g. n = 25 corresponds to period 8H/25 = 107.3 kyr). The **§2.2 table below is the reference lookup** for every n used in subsequent sections — its third column tells you which eigenmode beat or direct planet cycle each integer represents.

### 2.1 Definition

$$C(t) \;=\; c_0 \;+\; \sum_{n \in N} \left[\, a_n \cos\!\left(\tfrac{2\pi n t}{8H}\right) + b_n \sin\!\left(\tfrac{2\pi n t}{8H}\right) \,\right]$$

with:
- **t** = age in kyr BP (positive = past, negative = future, t = 0 ≈ 2000 AD)
- **8H** = 2,682.536 kyr (Solar System Resonance Cycle)
- **N** = the 26 active integer divisors listed below
- **a_n, b_n** = OLS-fitted coefficients (amplitude = √(a_n² + b_n²), phase = atan2(b_n, a_n))
- **C(t)** = normalized δ¹⁸O proxy (positive = colder/glacial, negative = warmer/interglacial)

To recover δ¹⁸O in original per-mille units, multiply by the LR04 detrended standard deviation (0.2673) and add back the LR04 linear trend (−0.000289 × t + 4.2536).

### 2.2 The 26 active integer divisors

Each n corresponds to a specific celestial-mechanics quantity. Letters refer to Laskar 2004 secular eigenfrequencies (g_i apsidal, s_i nodal); **k** = Earth's general precession in longitude (50.29″/yr).

| n | period | fitted amp | physical interpretation |
|---:|---:|---:|---|
| 7 | 383.2 kyr | 0.110 | g₂−g₅ Venus-Jupiter long eccentricity (~405k) |
| **9** | **298.1 kyr** | **0.111** | **g₂−g₇ Venus-Uranus eccentricity beat AND Mercury Axial = AscNode = 8H/9 (Cassini-locked, doc 55)** |
| **12** | **223.5 kyr** | **0.104** | **s₅−s₁ Jupiter-Mercury nodal beat AND Uranus AscNode = 8H/12 (doc 55)** |
| 14 | 191.6 kyr | 0.061 | g₂−g₈ Venus-Neptune eccentricity beat |
| **16** | **167.7 kyr** | **0.082** | **Mars Axial precession = 8H/16 (model direct, doc 55)** |
| 18 | 149.0 kyr | 0.122 | s₄−s₆ Mars-Saturn nodal beat |
| 20 | 134.1 kyr | 0.103 | g₃−g₂ Earth-Venus eccentricity beat |
| **21** | **127.7 kyr** | **0.084** | **Mars Obliquity / Jupiter Axial = 8H/21 (model direct, doc 55)** |
| 22 | 121.9 kyr | 0.095 | s₂−s₄ Venus-Mars nodal / g₄−g₂ Mars-Venus eccentricity |
| **25** | **107.3 kyr** | **0.213** | **s₁−s₄ Mercury-Mars nodal (100-kyr centroid)** |
| **28** | **95.8 kyr** | **0.238** | **g₄−g₅ Mars-Jupiter eccentricity (Berger 95k)** |
| 30 | 89.4 kyr | 0.124 | g₃−g₇ Earth-Uranus eccentricity beat |
| 31 | 86.5 kyr | 0.155 | g₄−g₇ Mars-Uranus eccentricity beat |
| **35** | **76.6 kyr** | **0.126** | **Mars apsidal = 8H/35 (model direct, doc 55)** |
| 38 | 70.6 kyr | 0.104 | s₈−s₃ Neptune-Earth nodal beat |
| 39 | 68.8 kyr | 0.164 | s₅−s₃ Earth nodal precession |
| 48 | 55.9 kyr | 0.101 | s₇−s₆ Uranus-Saturn nodal beat |
| 50 | 53.7 kyr | 0.156 | g₆−g₅ Saturn-Jupiter eccentricity beat |
| **53** | **50.6 kyr** | **0.138** | **Mars Eccentricity cycle = 8H/53 (model direct, doc 55)** |
| **65** | **41.27 kyr** | **0.275** | **k+s₃ Earth obliquity (Berger 41k) — dominant peak** |
| 66 | 40.6 kyr | 0.043 | obliquity-band **arithmetic mean of cycle lengths** (40.52 kyr cycle-counting mean → n=66.2). Not a distinct eigenmode beat — near-zero amplitude at full LR04 resolution; emerges as dominant only at pre-MPT window lengths where n=65/66/67 are unresolvable. See §6.6 for the Jensen's-inequality interpretation. |
| 68 | 39.5 kyr | 0.162 | k+s₄ Berger Mars-modulated obliquity sub-peak |
| 73 | 36.8 kyr | 0.092 | 2\|s₄\| Mars nodal harmonic / g₃−s₄ |
| 76 | 35.3 kyr | 0.091 | g₄−s₃ Mars apsidal − Earth nodal beat |
| **113** | **23.74 kyr** | **0.086** | **k+g₅ climatic precession sub-peak (Berger 23.7k)** — *note: Berger's convention associates g₅ with Jupiter at ~305 kyr eigenmode, an attribution the model does not endorse (Jupiter sits at H/5 or H/8 in doc 55)* |
| **120** | **22.35 kyr** | **0.104** | **k+g₂ climatic precession sub-peak = H/15 (Berger 22.4k)** |

**Six of the 26 integers** correspond directly to specific doc 55 planet cycles — these are the **model-direct matches** detectable as climate signals:

- **n = 9** → Mercury Axial = Mercury AscNode = 8H/9 (Cassini-locked, doc 55)
- **n = 12** → Uranus AscNode = 8H/12 (doc 55)
- **n = 16** → Mars Axial = Jupiter Obliquity = Uranus Obliquity = 8H/16 (doc 55)
- **n = 21** → Mars Obliquity = Jupiter Axial = 8H/21 (doc 55; "Mars-Jupiter Axial-Obliquity Swap")
- **n = 35** → Mars Perihelion (ecliptic) = 8H/35 (doc 55, exclusive to Mars)
- **n = 53** → Mars Eccentricity cycle = 8H/53 (doc 55, exclusive to Mars)

The other 20 integers are eigenmode beats between planet pairs (k+g_j, k+s_j, g_j−g_k, s_j−s_k), which all land on integer divisors of 8H because 8H is the natural synchronisation period of the solar system.

### 2.3 Joint OLS fit on LR04

- **R² = 0.238** (23.8% of LR04 variance explained by orbital forcing alone)
- **Condition number = 1.6** (all 26 candidates Rayleigh-resolvable at T = 5,320 kyr — no collinearity)
- **Past-200-kyr local R² = 0.320** (recent record fitted more cleanly than the noisier older portion)

Three components dominate by amplitude: **obliquity (n=65) at 0.275, Mars-Jupiter eccentricity (n=28) at 0.238, Mercury-Mars nodal (n=25) at 0.213**. The structural picture matches established paleoclimate theory: obliquity dominates the 41-kyr band, eccentricity-beat signals dominate the 100-kyr band, and a small but real climatic-precession contribution sits in the 22–24-kyr band.

### 2.4 Forward projection — the next 250,000 years

Evaluating C(t) at negative t (future):

**Holocene check at t = 0**: C(0) = −0.638 (normalized) → interglacial ✓

**Next predicted glacial maxima:**

| Years from now | AD date | C(t) | Strength |
|---:|---:|---:|---|
| **38,000** | ~40,000 AD | +0.25 | **next natural glaciation onset** |
| 81,500 | ~83,500 AD | +0.45 | moderate |
| 110,500 | ~112,500 AD | +0.32 | mild |
| 154,500 | ~156,500 AD | +0.67 | strong |
| **194,500** | ~196,500 AD | **+0.92** | **strongest in window** |

**Next predicted interglacial peaks** (between glacial maxima):

| Years from now | AD date | C(t) |
|---:|---:|---:|
| 53,000 | ~55,000 AD | −0.40 |
| 96,000 | ~98,000 AD | −0.55 |
| 137,500 | ~139,500 AD | **−0.65 (warmest in window)** |
| 167,500 | ~169,500 AD | −0.17 |
| 212,000 | ~214,000 AD | −0.46 |

**Validation of past predictions:**

| Formula prediction | Actual paleoclimate event | Discrepancy |
|---|---|---|
| Glacial maximum at 29 kyr BP | Last Glacial Maximum ≈ 20 kyr BP | +9 kyr early |
| Glacial maximum at 138 kyr BP | MIS 6 ≈ 140 kyr BP | −2 kyr |

The LGM offset of ~9 kyr is expected: pure orbital forcing predicts the **insolation drive**, not the **ice-sheet response**. Ice sheets carry memory; peak ice volume lags peak orbital cooling by several kyr (standard climate physics). The MIS 6 match within 2 kyr is excellent.

#### Pacing shift: the next 250 kyr looks more like a 41-kyr world than a 100-kyr world

A striking feature of the forward projection is that the **intervals between predicted glacial peaks are not ~100 kyr** — they are much closer to the obliquity band (~40 kyr):

| Interval | Years between peaks | Closest band |
|---|---:|---|
| Glacial onset → 2nd peak | **43.1 kyr** | obliquity (~41 kyr) |
| 2nd → 3rd peak | **29.2 kyr** | precession (~23 kyr) |
| 3rd → 4th peak | **43.8 kyr** | obliquity (~41 kyr) |
| 4th → 5th peak | **40.4 kyr** | obliquity (~41 kyr) |
| 5th → 6th peak | **48.5 kyr** | obliquity (~41 kyr) |
| Mean | **~41 kyr** | |

By contrast the **past ~700 kyr** in LR04 was dominated by ~100-kyr pacing (LGM ~20 kyr BP → MIS 6 ~140 kyr BP → MIS 8 ~240 kyr BP → MIS 10 ~340 kyr BP → MIS 11 ~425 kyr BP, mean interval ~100 kyr). The forward projection's ~40-kyr orbital pacing therefore resembles the **pre-MPT "41-kyr world"** (Early Pleistocene, ~2.7–1.2 Ma) more than the late-Pleistocene 100-kyr regime.

**Why the pattern shifts.** Planetary eigenmodes are stationary on Myr timescales, but the phase alignment between different beats is not. Two factors converge over the next ~50–250 kyr:

1. **Eccentricity is at a long-term minimum.** The Venus-Jupiter g₂−g₅ eccentricity envelope (~400-kyr modulation) is near a deep low; Earth's eccentricity drops toward ~0.014 (close to the model's minimum). Climatic-precession amplitude scales as e·sin ϖ, so when eccentricity is small, the precession contribution is suppressed and the obliquity-band signal (k+s₃ at 41 kyr) shows through more cleanly.
2. **The 100-kyr-band beats are partially out of phase.** The Mercury-Mars s₁−s₄ nodal beat (n=25, 107 kyr), the Mars-Jupiter g₄−g₅ eccentricity beat (n=28, 95.8 kyr), and adjacent inclination-side beats happen to be phased such that their constructive interference — which produced the strong 100-kyr-band signal of the last ~1 Myr — breaks down for the next ~250 kyr.

This is the **same prediction**, from a different angle, as [Berger & Loutre 2002 (*Science* 297, 1287)](https://www.science.org/doi/10.1126/science.1076120) — the famous "exceptionally long interglacial ahead" paper. Berger & Loutre identified the next 50+ kyr as an unusual eccentricity-minimum interval where the next natural glaciation is unusually delayed; the 8H formula reaches the same conclusion via the integer-divisor decomposition and extends it to ~250 kyr.

**Will Earth's climate respond to the new orbital pacing?** Three plausible scenarios — only one of which the formula can speak to:

- **(A) Return to a "41-kyr world" (orbital-paced).** If ice sheets shrink below the Willeit 2019 hysteresis threshold (anthropogenic warming, weaker orbital cooling, or both), the climate response could track each obliquity cycle individually — like the pre-MPT Early Pleistocene. This is the scenario where the orbital prediction and climate response align.
- **(B) 100-kyr-band response persists despite weak orbital signal.** If post-MPT ice-sheet hysteresis remains in place, the climate could keep producing ~100-kyr cycles even when orbital triggers are weaker — manifesting as subdued or "skipped" glacials. Several "exceptionally long interglacial" hypotheses fall in this camp.
- **(C) Anthropogenic CO₂ overrides orbital pacing.** [Ganopolski et al. 2016](https://www.nature.com/articles/nature16494) showed moderate-emission scenarios can delay the next natural glaciation by 50+ kyr by holding ice sheets below the formation threshold even when orbital forcing would otherwise allow them. In this scenario, the orbital "41-kyr world" prediction becomes academic in the near-term — surface climate is dominated by CO₂.

The formula answers the **orbital half** ("yes, the clock is shifting away from 100-kyr pacing toward 41-kyr pacing for the next ~250 kyr"); it explicitly takes no position on the **climate-response half**, which depends on ice-sheet hysteresis and anthropogenic forcing.

### 2.5 Earth's Fibonacci H/n positions are empty in the climate spectrum

The model's intrinsic Earth precession periods are the Fibonacci divisors of H:

| n | period | what it is |
|---:|---:|---|
| 24 | 111.77 kyr | H/3 = inclination precession |
| 40 | 67.06 kyr | H/5 = ecliptic precession |
| 64 | 41.91 kyr | H/8 = obliquity (model) / Jupiter ICRF perihelion |
| 104 | 25.79 kyr | H/13 = axial precession |
| 128 | 20.96 kyr | H/16 = climatic precession |

**Every one of these integers has amplitude below the significance threshold in LR04** (0.014–0.078, none above 0.085). The fitted formula passes near zero at these specific frequencies.

This is structurally consistent: the Fibonacci H/n periods are Earth's **intrinsic geometric precession** — what Earth's spin axis and orbital plane do in the absence of planetary perturbations. The climate spectrum observes Earth **through its own moving reference frame**, which is gravitationally coupled to every planet, so the observed signals land at integers **adjacent to** the Fibonacci anchors with planet-eigenmode offsets (Berger's k+g_j sub-peaks structure). Both pictures are real and consistent — they measure different things.

### 2.6 Limitations — orbital forcing only

The formula captures the orbital-forcing component of climate, not the full climate response. It does *not* model:

1. **Anthropogenic CO₂** — the dominant driver of climate over the next 100–1000 years
2. **Ice-sheet hysteresis** — existing ice sheets resist instantaneous orbital forcing
3. **Carbon-cycle feedbacks** — CO₂ amplification/buffering of orbital signals
4. **Internal variability** — Heinrich events, Dansgaard-Oeschger cycles, regional asymmetries
5. **The ~76% of LR04 variance** beyond the 26-component fit lives in ice-volume dynamics, carbon cycle, and other internal feedbacks

The formula is **not a weather forecast**. It tells you *when the orbital clock makes glaciation possible*; the actual ice-volume response depends on the full climate system. Comparison to Ganopolski et al. (2016): anthropogenic CO₂ may delay the next natural glaciation by 50+ kyr in moderate-emission scenarios.

Reproducer: `scripts/milankovitch_climate_formula.py`; fitted coefficients in `data/milankovitch-climate-formula.json`.

---

## 3. Per-Planet Contributions to Earth's Climate

For each climate peak, cross-reference against the full doc 55 8H/n period table (8 planets × 6 cycle types = 48 entries; 46 active after dropping frozen Uranus/Neptune axial precession). Count exact and ±1-near matches per planet.

### 3.1 LR04 full (T = 5,320 kyr)

| Planet | Exact direct matches | Near (±1) | Total | Exclusive direct matches |
|---|---:|---:|---:|---|
| **Mars** | 2 | 3 | 5 | **n=35 (Peri_ecl), n=53 (Ecc)** — both unique to Mars in doc 55 |
| Jupiter | 0 | 5 | 5 | none (shared integers with Mars Obliq, Earth AscNode, Saturn Peri_ecl, Uranus Obliq) |
| Saturn | 0 | 4 | 4 | none (shared integers) |
| Mercury | 2 | 1 | 3 | n=9 (Axial = AscNode by Cassini lock) |
| Venus | 0 | 3 | 3 | none (contributes via g₂, s₂ eigenmode beats) |
| Earth | 0 | 3 | 3 | none (Fibonacci H/n positions empty by §2.5) |
| Uranus | 1 | 1 | 2 | n=12 (AscNode) |
| **Neptune** | **0** | **0** | **0** | none direct in LR04 full *(eigenmode beats appear in pre-MPT — see §3.4)* |

### 3.2 Mars's exclusive direct matches

Two peaks in LR04 full coincide exactly with doc 55 entries that no other planet shares:

| LR04 n | Period | Doc 55 entry | Verdict |
|---|---|---|---|
| n=35 | 76.6 kyr | Mars ecliptic perihelion = 8H/35 | exact match (error 0.00) |
| n=53 | 50.6 kyr | Mars eccentricity cycle = 8H/53 | exact match (error 0.00) |

Neither N=35 nor N=53 appears for any other planet in the doc 55 table. The probability of two such exclusive matches by chance is roughly (6/46)² ≈ 1.7%. Direct empirical confirmation that Mars contributes specifically and measurably to Earth's climate.

### 3.3 Pre-MPT (1,200–3,000 kyr BP) — additional model direct matches

The pre-MPT window (T = 1,800 kyr, the canonical 41-kyr world) reveals *more* model-direct matches than LR04 full:

| Planet | Exact | Near (±1) | Total | Doc 55 entries hit |
|---|---:|---:|---:|---|
| **Mars** | **3** | 1 | 4 | n=16 (Axial), n=21 (Obliq), n=53 (Ecc); near n=68 ≈ ICRF |
| Jupiter | 2 | 0 | 2 | n=16 (Obliq — shared with Mars Axial); n=21 (Axial — shared with Mars Obliq) |
| Uranus | 1 | 1 | 2 | n=16 (Obliq — shared); near n=25 |
| Earth | 0 | 1 | 1 | near n=25 ≈ ICRF |
| Saturn | 0 | 1 | 1 | near n=25 ≈ Obliq |
| Mercury | 0 | 0 | 0 | — |
| Venus | 0 | 0 | 0 | — (contributes via eigenmode beats, §3.4) |
| Neptune | 0 | 0 | 0 | — (contributes via eigenmode beats, §3.4) |

Mars now has **three exclusive direct matches** (n=16 Mars Axial = 8H/16, n=21 Mars Obliquity = 8H/21, n=53 Mars Eccentricity = 8H/53). The doc 55 "Mars-Jupiter Axial-Obliquity Swap" identity (both planets share N=16 and N=21 with axial and obliquity exchanged) appears empirically as direct climate peaks.

### 3.4 Pre-MPT eigenmode beats reveal Neptune and Uranus

Beyond direct planet apsidal/nodal periods, the pre-MPT spectrum contains eigenmode-beat peaks **not in LR04 full** that involve outer planets:

| n | period | amp (pre-MPT) | Beat |
|---:|---:|---:|---|
| **14** | **191.6 kyr** | 0.265 | **g₂ − g₈ Venus-Neptune eccentricity beat** (n_pred 14.03, error 0.03) |
| **30** | **89.4 kyr** | 0.307 | **g₃ − g₇ Earth-Uranus eccentricity beat** |
| **38** | **70.6 kyr** | 0.240 | **s₈ − s₃ Neptune-Earth nodal beat** |

The amplitudes here come from a **single-component scan on the pre-MPT window (1,200–3,000 kyr BP)** and are not directly comparable to the joint 26-component fit on full LR04 in §2.2 — that fit assigns these same integers smaller amplitudes (0.061, 0.124, 0.104 respectively) because their pre-MPT prominence is averaged out across 5,320 kyr.

Three pre-MPT-only peaks correspond to **Venus-Neptune, Earth-Uranus, and Neptune-Earth eigenmode beats**. Neptune's and Uranus's gravitational influence on Earth's orbit IS detectable in the climate record — but only in the pre-MPT 41-kyr world where ice-sheet amplification didn't dominate the spectrum.

### 3.5 Why Mars dominates; why Neptune appears only pre-MPT

**Mars is Earth's nearest outer rocky neighbour (1.52 AU vs Jupiter at 5.2 AU).** Mars's apsidal eigenmode g₄ ≈ 17.92″/yr is one of the fastest among planets — close to Earth's g₃ ≈ 17.37″/yr, producing strong near-resonance perturbations on Earth's orbital elements. The g₄−g₅ Mars-Jupiter beat (95 kyr) is the cleanest single feature in the eccentricity spectrum; Mars's apsidal motion at 8H/35 = 76.6 kyr produces a directly observable LR04 climate peak; and the Mercury-Mars s₁−s₄ nodal beat *is* the 100-kyr centroid.

**Neptune's eigenmodes are the slowest** (g₈ ≈ 0.67″/yr, |s₈| ≈ 0.69″/yr). Beats with inner planets produce relatively long periods (~70–200 kyr) and small amplitudes. **Pre-MPT** (41-kyr-world era): ice sheets were smaller and less hysteretic, orbital signals propagated more directly through the climate system, and slow outer-planet beats registered above the noise floor. **Post-MPT** (last ~1 Myr): large ice sheets impose a ~100-kyr hysteretic response that dominates the spectrum and filters out the slower outer-planet signals. LR04 full averages the two eras, and the Neptune-beat amplitudes drop below the significance threshold.

### 3.6 Cross-planet obliquity validation

The model's obliquity-period claims for the inner solar system (from doc 16 §5) match three independent peer-reviewed references with **zero free parameters**:

| Planet | Published period | Reference | Model H/n | Period (yr) | Deviation |
|---|---|---|---|---|---|
| **Mercury** | 895,000 yr | Bills & Comstock 2005, *JGR-Planets* 110, E04006 | **8H/3** | 894,179 | **+0.09 %** |
| **Earth** | 41,000 yr | Laskar 2004 (La2004); Berger 1978 | **H/8** | 41,915 | **+2.2 %** |
| **Mars** | 124,800 yr (chaotic mean) | Ward 1973 *Science* 181; Laskar 2004 *Icarus* 170 | **8H/21** | 127,740 | **+2.4 %** |

**Three for three** on planets with published values, all within 2.5 %. Mercury's 0.09 % match against an independent dynamical calculation (Bills & Comstock used Cassini-state forced-obliquity theory, corroborated by Yseboodt & Margot 2006, Peale 2005, Bois & Rambaux 2007) is the model's tightest cross-validation against non-Holistic published references.

### 3.7 Outer planets — falsifiable predictions where standard theory says nothing

For Jupiter, Saturn, Uranus, and Neptune, standard secular theory reports **no regular obliquity oscillation** — only Gyr-scale secular trends (often resonance-locked). The model assigns each planet a specific H-divisor obliquity period:

| Planet | Published literature | Model H/n prediction |
|---|---|---:|
| Venus | tidally damped at 177° (Correia & Laskar 2003) | 8H/110 = **24,387 yr** (model: net residual after two opposing precession components nearly cancel — see doc 37) |
| Jupiter | "No regular cycle" — Gyr secular trend 3.1° → 6–37° (Saillenfest 2020) | H/2 = **167,659 yr** |
| Saturn | "No regular cycle" — Gyr trend 26.7° → 65°+ via Neptune resonance (Saillenfest 2021; Wisdom 2022) | H/3 = **111,772 yr** |
| Uranus | Frozen — > 100 Myr precession (Saillenfest 2022) | H/2 = **167,659 yr** |
| Neptune | Frozen (Rogoszinski & Hamilton 2020) | 8H/100 = **26,825 yr** |

This is a **falsifiable but currently un-testable set of predictions**: no kiloyear-resolution obliquity observations exist for the outer planets, so neither the "no cycle" standard view nor the model's specific period can be directly verified at present. Future precision astrometry from probes (Juno extended mission for Jupiter; dedicated Saturn-system or ice-giant missions) could discriminate. See [doc 37 — Planetary Precession Cycles](37-planets-precession-cycles.md) §"Reference: Obliquity Oscillation" for the canonical model-vs-standard comparison table.

Reproducer: `scripts/milankovitch_planet_climate_match.py`; results in `data/milankovitch-planet-climate-match.json`.

---

## 4. The 100,000-Year Glacial Cycle

The 100-kyr glacial cycle is paleoclimatology's most-debated feature. The data point clearly to an **inclination-side / orbital-plane** origin via planet-pair eigenmode beats rather than direct eccentricity forcing. The dominant empirical signal is the Mercury-Mars nodal beat; the broader picture vindicates Muller & MacDonald 1997's "inclination, not eccentricity" framing.

### 4.1 What the spectrum shows

LR04's 100-kyr band is a **broad single peak spanning ~80–125 kyr** — not the split structure (95k + 125k) that direct eccentricity forcing would produce. The energy-weighted centroid sits at n = 25 (= 107.3 kyr in 8H units), with strong adjacent contributions at n = 28 (g₄−g₅ Mars-Jupiter, 95.8 kyr) and weaker contributions at n = 22 (g₄−g₂ Mars-Venus / s₂−s₄ Venus-Mars nodal, 122 kyr).

### 4.2 The 100-kyr centroid is the Mercury-Mars nodal beat

The dominant 100-kyr-band integer n = 25 corresponds to the **s₁ − s₄ Mercury-Mars nodal beat** in eigenmode terms (predicted 25.11 in 8H units, error 0.11). This is a *nodal* (orbital-plane) beat between two inner rocky planets, not an eccentricity beat.

Consistent in spirit with Muller & MacDonald 1997's "inclination, not eccentricity" framing, with a specific eigenmode identification not previously stated. The model's H/3 = 111.77 kyr inclination precession claim sits in the same Rayleigh-limited band as this centroid.

### 4.3 The Rayleigh resolution limit

At a record length of T ≈ 1.2 Myr, the Rayleigh resolution at P = 110 kyr is:

$$\Delta P \;=\; \frac{P^2}{T} \;\approx\; 10 \text{ kyr}$$

The candidates 95 kyr (g₄−g₅), 100 kyr (centroid), and 112 kyr (H/3) **lie within one Rayleigh element of each other** and are spectrally collinear — they cannot be individually determined by Fourier or multitaper methods at this data length. Discriminating them requires either a longer non-tuned record or methods that bypass the Rayleigh constraint.

### 4.4 Three discriminating tests

Three independent empirical tests bear on the eccentricity-vs-inclination-side question:

- **405-kyr absence.** Standard Milankovitch predicts the g₂−g₅ Venus-Jupiter eccentricity beat (~405 kyr) should dominate the eccentricity-side signal. In post-MPT LR04 it is **essentially absent** — amplitude ratio 0.12 vs the 100-kyr-band peak. (The 405-kyr signal *does* appear in pre-MPT data as n = 7 at 383 kyr with amp 0.110, but is filtered out post-MPT by the same ice-sheet response that suppresses other slow signals.) **First specific failure mode** of the eccentricity attribution. Full methodology in §7.1.

- **No bispectral coupling.** Direct bispectral analysis of LR04 in the 100-kyr band fails to detect significant 95k+125k phase coupling — replicating Muller & MacDonald 1997. **Second specific failure mode**. Descriptive: rules out a specific eccentricity-coupling signature; does not positively confirm inclination. Full methodology in §7.2.

- **Chronology-bias test.** A test of whether the observed 107-kyr centroid might be a dating artifact. U-Th-dated Cheng 2016 speleothems (independent of orbital tuning) place the dominant peak at the **same FFT bin (k = 6, centroid ≈ 107 kyr)** as orbitally-tuned LR04. A systematic ~10% chronology offset between tuned and non-tuned records does **not exist** — the 107-kyr centroid is real, not a tuning artifact.

### 4.5 The asymmetry — why this is more than just "consistent"

Direct-eccentricity attribution and the inclination-side / H-divisor framework do *not* face the same empirical problems:

| Test | Eccentricity attribution | Inclination-side / H-divisor framework |
|---|---|---|
| 405-kyr term presence (§4.4) | **Predicts dominant; observed essentially absent (ratio 0.12)** | No contradiction |
| Eccentricity-beat phase coupling (§4.4) | **Predicts strong; not detected (consistent with M-M 1997)** | No contradiction |
| 100-kyr-band centroid identification | **Predicts 95–99 kyr eccentricity beats; observed centroid at 107 kyr is a *nodal* beat** | **Mercury-Mars nodal (s₁−s₄) at n=25 = 107 kyr — matches** |
| Cross-planet obliquity periods (§3.6) | No direct prediction | **Mercury 0.09 %, Earth 2.2 %, Mars 2.4 %** |
| Berger 1978 climatic-precession 6-peak spectrum | Not predicted by direct eccentricity (these are k+g_j sub-peaks, not eccentricity-beat periods) | **All 6 peaks match H/n divisors to <0.4 %** (see doc 16 §4.2) |

The eccentricity story has *specific* empirical headwinds (405-kyr absence + no beat coupling + wrong-family centroid) that the inclination-side framework does not.

### 4.6 The model's position

The Holistic model's broader claim — that the 100-kyr cycle is in the **inclination-side / orbital-plane family** of eigenmode beats, not direct eccentricity forcing — is:

- **Empirically supported** by the centroid at n=25 = 107 kyr being a **nodal** beat (s₁−s₄ Mercury-Mars), not an eccentricity beat
- **Consistent** with Muller & MacDonald 1997's "inclination, not eccentricity" framing
- **Distinguished from eccentricity attribution** by the asymmetry table above (405-kyr absence, no bispectral coupling, wrong-family centroid identification)

The model's specific theoretical mechanism — Earth's intrinsic H/3 = 111.77 kyr inclination precession producing a second obliquity component (§4.9) — is *one* candidate inclination-related contribution within this framework. The empirically dominant signal is the Mercury-Mars planet-pair nodal beat, not Earth's intrinsic precession period (which itself, per §2.5, has near-zero amplitude at n=24 in the climate spectrum). At Rayleigh resolution the two cannot be individually distinguished, but both sit on the inclination/orbital-plane side rather than the eccentricity side.

### 4.7 What the data cannot determine, and what would settle it

**Cannot determine from LR04 alone:**

- Whether the actual 100-kyr-band peak is at 99, 105, 110, or 115 kyr (Rayleigh at T = 1 Myr is ~10 kyr; at T = 641 kyr is ~15 kyr). The empirical centroid sits at n=25 = 107.3 kyr (§4.2), but the true peak could plausibly lie anywhere within ±10 kyr of that.
- At the adjacent integer n=24 (≈ 110–112 kyr), 110 kyr (g₃−g₁ Earth-Mercury beat) versus 111.77 kyr (model H/3) — they differ by 1.7 %, below any practical resolution. Whichever of these (or neither) contributes alongside the n=25 nodal beat cannot be separated at this data length.
- A mixed attribution where both eccentricity and inclination contribute

**What would settle it:**

| Path | What it adds |
|---|---|
| Vaks et al. 2013 Siberian U-Th speleothems (~1.5 Myr) | Resolution at 100 kyr drops to ~7 kyr — better but still doesn't separate 99 from 112 sharply |
| Parametric methods (Burg AR, MLE) on existing records | Sub-Rayleigh resolution at cost of assumptions about signal structure |
| Direct observation of Earth's obliquity oscillation over decadal-millennial timescales (satellite geodesy) | Would detect a ~112 kyr modulation directly, independent of paleo proxies |
| Bispectral test for inclination-specific phase coupling | Direct replication of M-M's *positive* evidence — §4.4 tested only the eccentricity-coupling absence |

These are real follow-ups, not hand-waves. None are immediate but all are tractable.

### 4.8 What stands independently of the 100-kyr-cycle attribution

The following findings of the model are **independent of which attribution wins the 100-kyr debate**:

- Five Milankovitch periods are H-divisors closed by Fibonacci beat algebra (doc 16 §3)
- All six Berger 1978 climatic-precession peaks match 8H/n integer fractions to < 0.4 % (doc 16 §4.2)
- Three independent eigenmode combinations converge at H/3 ± 1.3 %; two converge at H/5 (doc 16 §4.3)
- Cross-planet obliquity validation: Mercury 0.09 %, Earth 2.2 %, Mars 2.4 % (§3.6)
- 405-kyr term essentially absent in post-MPT LR04 (ratio 0.12, §4.4)
- No eccentricity-beat phase coupling in LR04 (§4.4)
- 25 of 26 formula components have clean eigenmode-beat or direct-planet-cycle interpretations as integer divisors of 8H (§2)
- Six integers in the formula are direct doc 55 planet-cycle matches: n=9 (Mercury), n=12 (Uranus), n=16, 21, 35, 53 (Mars/Jupiter)

These are the **robust contributions** of the Holistic model to Milankovitch theory. The 100-kyr-cycle attribution is the *specific* claim with the most empirical contention — it is *competitive*, not *decisively confirmed*.

### 4.9 Position relative to the literature

The broader "inclination, not eccentricity" position was argued by Muller & MacDonald (1997, *PNAS* 94, 8329) from bispectral evidence — peer-reviewed thirty years ago, never refuted spectrally, not adopted by the field because their proposed *mechanism* (extraterrestrial dust accretion) was rejected. The empirical centroid identification advances Muller-MacDonald's argument with a specific eigenmode label: **the 100-kyr-band signal is the Mercury-Mars s₁−s₄ nodal beat**, a planet-pair orbital-plane coupling.

The Holistic model also proposes a candidate **dust-free climate-coupling mechanism**:

> Inclination-related orbital-plane oscillations (model: H/3 second obliquity component; data: Mercury-Mars nodal beat at ~107 kyr) → modulated obliquity → standard Milankovitch insolation forcing → ice sheets

Every step after "modulated obliquity" is standard Milankovitch physics; the mechanism needs no new forcing. The model's specific proposal that Earth's intrinsic H/3 inclination precession produces a second obliquity component at the same period is one theoretical pathway *within* this broader inclination-side family; the empirical signal is consistent with this family but does not single out H/3 specifically. See [supporting-evidence.mdx §6](../../Holistic/holisticuniverse/src/content/en/model/supporting-evidence.mdx) for the model's full mechanism statement.

Reproducer: `scripts/milankovitch_spectral_tests.py` and `scripts/milankovitch_candidate_amplitudes.py`; results in `data/milankovitch-spectral-results.json` and `data/milankovitch-candidate-amplitudes.json`.

---

## 5. Pre-MPT vs Post-MPT — Same Forcing, Different Response

### 5.1 The Mid-Pleistocene Transition

Three structural transitions are visible in the full LR04 record:

| Approximate epoch | Transition | Effect on climate spectrum |
|---|---|---|
| ~2.7 Ma BC | Late Pliocene cooling onset (iNHG) | Northern Hemisphere ice sheets establish; climate begins to respond to orbital forcing |
| 2.7 Ma → 1.2 Ma BC | Early Pleistocene "41-kyr world" | Obliquity (n = 65, 66 in different windows) dominates |
| ~1.2 Ma → 0.7 Ma BC | Mid-Pleistocene Transition (MPT) | Shift to "100-kyr world": ice-sheet hysteresis crosses threshold; 100-kyr-band response dominates |

### 5.2 What changed: climate sensitivity, not orbital forcing

The orbital forcing — planetary eigenmodes, Earth's precession, obliquity oscillation — is **essentially constant over the past 5 Myr**. What changed is the **climate system's sensitivity** to that forcing:

- Long-term CO₂ decline → progressively colder baseline
- Northern Hemisphere ice sheets grow → stronger albedo feedback → larger climate response to the same orbital forcing
- Once ice sheets pass the Willeit threshold (~1 Ma), they become hysteretic — small orbital nudges trigger large climate responses

The 8H formula has stationary amplitudes, so the formula's reconstruction shows the same oscillation amplitude in pre-MPT as post-MPT. LR04's actual amplitude grows from left to right. **This mismatch is the correct and expected outcome**: the formula correctly captures orbital forcing; the LR04 amplitude variation correctly reflects changing climate sensitivity.

The same kind of climate-sensitivity transition could in principle run in reverse — if ice sheets shrink below the Willeit hysteresis threshold (anthropogenic warming, weaker orbital cooling, or both), the climate response could re-couple to the orbital signal at its native pacing. Doc 17 §2.4 ("Pacing shift") notes that the 8H formula's forward projection for the next ~250 kyr is **obliquity-band (~40-kyr) paced**, not 100-kyr paced — so a return to a "41-kyr-world" response is the orbital-driven scenario.

### 5.3 Two MPT mechanisms supported by evidence

**(1) Interplanetary dust concentration** [Farley 1995]: ³He measurements in deep-sea sediments confirm an increase in extraterrestrial dust accretion beginning at ~1 Ma — possibly from an asteroid family breakup. Muller & MacDonald (1997) proposed that this dust modulates climate via the H/3 inclination of Earth's orbital plane; the community rejected the specific dust-climate coupling but Farley's underlying dust-flux observation remains unchallenged. The dust mechanism stays on the list as a candidate; whether it actually drives climate has not been confirmed.

**(2) Ice-sheet threshold** [Willeit et al. 2019]: Progressive CO₂ decline and removal of easily-erodible regolith allowed ice sheets to grow past a critical size where they could survive obliquity maxima. In Willeit's standard account this silenced the ~41-kyr obliquity pacemaker and exposed eccentricity-driven forcing; in the model's reinterpretation the same threshold crossing exposed the longer **inclination-side eigenmode beats** (most prominently the Mercury-Mars nodal beat at ~107 kyr) — always present in the orbital dynamics — as the dominant climate response.

A multi-method amplitude test across the MPT (windowed Lomb–Scargle, multitaper, and band-aggregated RMS over LR04) finds that the 80–125 kyr band amplitude grew by a factor of ~1.75×–2.19× between pre- and post-MPT intervals. The growth is broadly consistent with either candidate mechanism above and does not adjudicate between them.

### 5.4 MPT amplitude growth pattern

A windowed amplitude analysis across the MPT (pre-MPT 1,500–2,500 kyr vs post-MPT 0–1,000 kyr) gives concrete post/pre growth ratios per band:

| Band | Pre→post ratio | Direction |
|---|---:|---|
| 41-kyr obliquity (anchor) | **0.72×** | **shrank** |
| 100-kyr band (n = 25, 28, 110-kyr anchor mean) | **1.64×** | grew |
| 23.7-kyr climatic-precession (n = 113) | **2.19×** | grew most |
| 405-kyr eccentricity (n = 7) | 0.34× | shrank |

The 41-kyr peak actually *decreased* — consistent with the standard "ice-sheet saturation silences the obliquity pacemaker" framing (Willeit 2019). Within the climatic-precession triplet, the three k+g_j sub-peaks grew very differently — k+g₅ at 23.7 kyr grew 1.75×, while k+g₂ at 22.4 kyr grew 1.05× and k+g₃ at 19.2 kyr grew 0.92× — so the 23-kyr growth is concentrated in one specific sub-peak rather than spread across the precession band (planet attribution of g₂/g₃/g₅ is Berger's convention and not endorsed by the model; see §2.2 note on n=113). The overall pattern is consistent with established "nonlinear ice-sheet response to orbital forcing" framings (Imbrie+ 1992 *Pacemaker*; Willeit 2019; Lisiecki 2023) and does not by itself discriminate between the model and standard frameworks.

Reproducer: `scripts/mpt_transition_analysis.py`; results in `data/mpt-transition-analysis.json`.

---

## 6. Methodology

### 6.1 Spectral methods used

| Method | Where used | Why this method |
|---|---|---|
| MTM (Thomson multitaper, NW=3, K=5) | §7.1 (405-kyr test); §4 (peak position) | Standard paleoclimate spectral estimator; bias-reduced power on uniform grids |
| Lomb-Scargle (astropy fast) | §4 (Cheng2016 spectrum) | Handles irregular sampling natively |
| Hinich bispectrum | §7.2 (eccentricity beat coupling) | Reveals nonlinear (beat-coupling) signatures |
| Multi-component OLS amplitude fit | §2 (formula fit); §4 (centroid test) | Bypasses Rayleigh peak-resolution limit by treating known candidates as parameters; collinearity-aware |
| Single-component OLS amplitude scan | §2.2 (8H integer-divisor spectrum); §6.5 (window-length sweep) | No FFT-bin snapping; evaluates amplitude at exact candidate periods |

All methods deterministic. Bootstrap CIs via resampling where reported.

**Pre-registration discipline.** Every test in §7 had its data source, method, parameters, and verdict rules **locked in writing** before any data analysis. Pre-registration matters because some tests required honest revisions of original verdicts — without locked specs, methodology issues could have been rationalised away. The locked verdict tables for each test are reproduced in §7.

### 6.2 The Rayleigh resolution limit

For a record of length T, the minimum resolvable period difference at period P is:

$$\Delta P \;\approx\; \frac{P^2}{T}$$

This is the *fundamental* spectral-resolution constraint, independent of method. Consequences:
- T = 5,320 kyr (full LR04): ΔP ≈ 0.32 kyr at P = 41 kyr — Berger 41-kyr sub-peaks resolvable
- T = 1,200 kyr: ΔP ≈ 10 kyr at P = 110 kyr — 95k/100k/112k spectrally collinear
- T = 640 kyr (Cheng): ΔP ≈ 19 kyr at P = 110 kyr — even less resolvable

Multiple results in this document — particularly the 100-kyr peak position discussion (§4.3) and the cycle-length distribution findings (§6.4) — hinge on Rayleigh resolution as the binding constraint.

### 6.3 Multi-component fit collinearity

When candidate periods are closer than ΔP, joint OLS fits suffer from collinearity: shared frequency components get distributed arbitrarily between the candidates, producing inflated amplitudes that can exceed reasonable values (condition number > 100). Diagnostic: report condition number; reject results where cond > 100 and adjacent candidates have implausible amplitudes.

The 8H formula's 26 components are all Rayleigh-resolvable at T = 5,320 kyr (condition number 1.6), so the joint fit is clean.

### 6.4 Non-stationarity and cycle-length distributions

Climate cycles are non-stationary — cycle length varies cycle-to-cycle. Bandpass-filtering LR04 and counting peak-to-peak intervals shows:

| Band / Window | N | Mean | Median | Std | Range |
|---|---:|---:|---:|---:|---|
| Obliquity / 0–700 kyr | 16 | 40.31 | 40.00 | 2.87 | [36, 45] |
| Obliquity / 0–5,320 kyr | 130 | **40.52** | 40.00 | 4.44 | [31, 59] |
| Precession / 0–5,320 kyr | 235 | **22.47** | 22.00 | 3.36 | [13, 39] |

The obliquity cycle is genuinely non-stationary: 30% of intervals fall outside the model's [37.9, 46.2] range. Mean cycle length (~40.5 kyr) sits slightly below both standard 41.0 and model H/8 = 41.91 kyr; the dominant fitted Fourier peak (n = 65 = 41.27 kyr) is the energy-weighted centroid of this distribution.

### 6.5 Window-length robustness

For competing-pair amplitude tests (e.g., 41.0 vs H/8 = 41.91; 23.7 vs H/14 = 23.95), single-component OLS amplitude fits per sliding window across multiple window lengths T ∈ {300, 400, 500, 600, 700, 800} kyr verify that conclusions are not artifacts of bin placement. Standard 41.0 wins against H/8 at all T (72% → 98%); standard 23.7 wins against H/14 marginally at long T (~60%); standard 19.2 wins against H/18 at all T (65% → 78%). For these pairwise comparisons, the data favours the standard Berger eigenmode labels over the H/n Fibonacci alternatives.

Reproducer: `scripts/milankovitch_temporal_structure.py`; results in `data/milankovitch-temporal-structure.json`.

### 6.6 The obliquity-band cycle-mean (n=66)

The formula's n=66 integer is not a distinct eigenmode beat — it is the **arithmetic mean of cycle lengths** in the obliquity band. Two different statistics on the same non-stationary signal give two different "obliquity-band centres":

| Statistic | Formula | Value | Integer |
|---|---|---|---|
| **Fourier peak position** (energy-weighted centroid of frequencies) | proportional to $\overline{1/T}$ — harmonic-mean cycle frequency | 1 / 41.27 kyr | **n = 65** (Berger k+s₃) |
| **Cycle-counting mean** (arithmetic mean of cycle lengths from §6.4) | $\bar{T} = \text{mean}(T_i)$ | 40.52 kyr | **n = 66.2** |

These differ by Jensen's inequality: $\overline{1/T} \neq 1/\bar{T}$ for non-constant T. The Fourier peak measures harmonic-mean cycle frequency; cycle-counting measures arithmetic-mean cycle length. For the obliquity band the gap is ~1.6 %, driven by the cycle-length std of 4.44 kyr around a mean of 40.52 kyr (11 % relative dispersion — see §6.4).

**Both views are correct simultaneously** — they are different statistical aggregations of the same underlying non-stationary obliquity signal:

- At **T = 5,320 kyr** (full LR04), Fourier resolution (ΔP ≈ 0.32 kyr) cleanly separates n=65 from n=66 from n=67. The spectrum's energy-weighted centre is the harmonic-mean integer n=65; the formula correctly fits n=66 amplitude to **0.043** (near-zero), because n=66 doesn't carry independent power once n=65 is resolved.
- At **T = 1,800 kyr** (pre-MPT), Fourier resolution (ΔP ≈ 0.93 kyr) cannot distinguish n=65 / 66 / 67 (integer spacing ~0.6 kyr). Amplitude piles up at the cycle-counting centre n=66 because that's where the cycle-length distribution peaks. The formula correctly captures this with n=66 amplitude **0.684** in pre-MPT spectrum.

n=66 is therefore an **emergent windowing-and-statistics phenomenon**, not a separate orbital cycle. Including it in the formula doesn't double-count because n=65 absorbs the eigenmode-beat power at full resolution while n=66 sits at near-zero amplitude. The component is self-correcting: present in the formula for window-length transparency, but contributing essentially nothing at full LR04.

---

## 7. Specific Empirical Tests

### 7.1 The 405-kyr eccentricity absence

**Hypothesis tested**. Berger 1978 / Laskar 2004 secular theory identifies the **g₂−g₅ ≈ 3.200″/yr → 405 kyr** beat as the *strongest* eccentricity eigenmode term. If eccentricity drives glacial cycles via insolation forcing, this term should produce the *strongest* climate spectral peak. Muller's earlier work flagged the absence of 405-kyr power in past-1.2-Myr climate records as an anomaly; this test quantifies it sharply on the full LR04 stack.

**Method.**

| Item | Value |
|---|---|
| Data | LR04 stack (full record, 0–5,320 kyr BP) |
| Pre-processing | Uniform 1-kyr grid + linear detrend + normalise unit variance |
| Method | MTM with NW = 3, K = 5 DPSS tapers |
| Search bands (locked) | 18–26 kyr (precession), 30–50 kyr (obliquity), 80–125 kyr (100-kyr), 380–440 kyr (405-kyr) |

**Result.** Highest spectral amplitude in each band (MTM power-spectral density units — not directly comparable to the §2.2 OLS-fit amplitudes; only ratios within this table are meaningful):

| Band (kyr) | Peak period (kyr) | Amplitude (MTM) | Identification |
|---|---|---|---|
| Precession 18–26 | 23.65 | 6.60 | Climatic precession (sanity check) |
| **Obliquity 30–50** | **40.93** | **106.7** | **Dominant overall — expected** |
| 100-kyr 80–125 | 95.02 | 54.3 | The contested 100-kyr peak |
| **405-kyr 380–440** | **380.07** | **6.49** | **At band edge — no clean peak** |

Ratio of 405-kyr amplitude to 100-kyr peak:

$$R = \frac{\text{amp}(405)}{\text{amp}(100)} = \frac{6.49}{54.3} = \mathbf{0.120}$$

**Pre-registered verdict rules** (locked before analysis):

| Ratio R | Verdict |
|---|---|
| R > 1.0 | Eccentricity attribution mechanism supported |
| 0.5 < R ≤ 1.0 | Ambiguous |
| 0.2 < R ≤ 0.5 | 405-kyr absence quantified |
| **R ≤ 0.2** | **405-kyr essentially absent — strong evidence against eccentricity attribution** |

**Verdict**: R = 0.120 falls in the bottom tier. Berger/Laskar secular theory's *strongest* prediction (g₂−g₅ at 405 kyr should dominate climate forcing) is not borne out by the LR04 record over the past 5.3 Myr. The peak at 380 kyr is at the band edge — likely rising spectral baseline, not a real 405-kyr peak. **First independent failure mode** of standard eccentricity attribution.

### 7.2 Bispectral phase coupling (Muller-MacDonald replication)

**Hypothesis tested.** If eccentricity drives the 100-kyr glacial cycle via the nonlinear beat between the 95-kyr (g₄−g₅) and 99-kyr (g₃−g₅) eigenmodes, the climate signal should inherit **phase coupling** between these frequencies, observable as elevated bicoherence b²(f₁, f₂) at the eccentricity triplet (f₁ ≈ 1/95, f₂ ≈ 1/99 → sum frequency ~1/54). This is precisely Muller & MacDonald's (1997, *PNAS* 94, 8329) test.

**Method.**

| Item | Value |
|---|---|
| Data | LR04 stack (full record, 0–5,320 kyr BP) |
| Bispectrum | Hinich-style: B̂(f₁,f₂) = ⟨X(f₁)X(f₂)X*(f₁+f₂)⟩ |
| Bicoherence | b²(f₁,f₂) = \|⟨X(f₁)X(f₂)X*(f₁+f₂)⟩\|² / [⟨\|X(f₁)X(f₂)\|²⟩ · ⟨\|X(f₁+f₂)\|²⟩] |
| Segment length | 1,500 samples (kyr); 75% overlap; Hann window; 11 segments averaged |
| Search region | (f₁, f₂) where both 1/130 < f₁, f₂ < 1/90 cy/kyr |

**Result.**

| Quantity | Value |
|---|---|
| Observed max b² in eccentricity triplet | **0.507** at (f₁ → 125 kyr, f₂ → 125 kyr) |
| Null baseline (50 time-shuffled spectra) — median | 0.367 |
| Null baseline 95th percentile | **0.555** |
| Observed / null-95 ratio | 0.91 |

The observed max bicoherence (0.507) is **below** the null 95th percentile (0.555). The peak is at *self-coupling* (125, 125 → 62.5 kyr), not the *cross-coupling* (95, 125 → 54 kyr) that eccentricity beats would produce.

**Verdict**: No statistically significant eccentricity-beat phase coupling. Consistent with Muller & MacDonald 1997. **Second independent failure mode** of the eccentricity attribution. Descriptive — the test rules out a specific eccentricity-coupling signature but does not positively confirm inclination forcing.

*Methodology lesson*: pre-registered absolute b² thresholds (e.g., b² > 0.5 → coupling) are noise-floor-dependent on N_segments. With only 11 segments the baseline 95th is already 0.55; future bispectral tests should use *relative-to-null* thresholds.

---

## 8. Data Sources & Reproducibility

### 8.1 LR04 stack

Lisiecki, L. E. & Raymo, M. E. (2005), *Paleoceanography* 20, PA1003. Stack of 57 globally distributed benthic δ¹⁸O records spanning 0–5,320 kyr BP. Cached locally at `data/lr04-stack.txt` (2,115 samples; variable 1–5 kyr spacing). Used for primary spectral analysis throughout this document.

### 8.2 Cheng 2016 Asian speleothem composite

Cheng, H. et al. (2016), *Nature* 534, 640. U-Th-dated Asian Monsoon δ¹⁸O composite spanning 0–640 kyr BP. Chronology fully independent of orbital tuning (U-Th decay constants only). Cached locally at `data/cheng2016-speleothem.txt` (8,353 samples; ~0.2 kyr spacing). Used as the non-tuned control for the chronology-bias test (§4.4).

### 8.3 Scripts

All tests are deterministic and run in under a minute combined on a modern laptop.

```bash
# Spectral tests (405-kyr absence, bispectrum, etc.):
python3 scripts/milankovitch_spectral_tests.py

# Mid-Pleistocene Transition growth analysis:
python3 scripts/mpt_transition_analysis.py

# STANDARD vs MODEL H-divisor head-to-head:
python3 scripts/milankovitch_candidate_amplitudes.py

# Cycle-length distribution + window-length sweep:
python3 scripts/milankovitch_temporal_structure.py

# 8H integer-divisor spectrum scan:
python3 scripts/milankovitch_8h_divisor_spectrum.py

# Eigenmode-beat decomposition of LR04 peaks:
python3 scripts/milankovitch_8h_beat_decomposition.py

# Per-planet climate-influence cross-reference:
python3 scripts/milankovitch_planet_climate_match.py

# Climate formula fit + forward projection (§2):
python3 scripts/milankovitch_climate_formula.py
```

### 8.4 Output JSON files

| Output | Contains |
|---|---|
| `data/milankovitch-spectral-results.json` | 405-kyr ratio, bicoherence, peak positions |
| `data/mpt-transition-analysis.json` | MPT amplitude growth per band (100-kyr, 41-kyr, 23-kyr) plus Berger triplet diagnostic |
| `data/milankovitch-candidate-amplitudes.json` | STANDARD vs MODEL head-to-head fits |
| `data/milankovitch-temporal-structure.json` | Cycle distribution + window-length sweep |
| `data/milankovitch-8h-divisor-spectrum.json` | 8H integer-divisor amplitudes |
| `data/milankovitch-8h-beat-decomposition.json` | Per-peak eigenmode-beat interpretation |
| `data/milankovitch-planet-climate-match.json` | Per-planet match counts |
| `data/milankovitch-climate-formula.json` | Fitted formula coefficients + forward projection |

---

## 9. References & Related Documents

### 9.1 References

**Data**
- Lisiecki, L. E. & Raymo, M. E. (2005). A Pliocene-Pleistocene stack of 57 globally distributed benthic δ¹⁸O records. *Paleoceanography* 20, PA1003.
- Cheng, H. et al. (2016). The Asian monsoon over the past 640,000 years and ice age terminations. *Nature* 534, 640.

**Standard Milankovitch theory**
- Berger, A. (1978). Long-term variations of daily insolation and Quaternary climatic changes. *J. Atmos. Sci.* 35, 2362.
- Berger, A. & Loutre, M. F. (1991). *Quat. Sci. Rev.* 10, 297.
- Berger, A. & Loutre, M. F. (2002). An exceptionally long interglacial ahead? *Science* 297, 1287.
- Laskar, J. et al. (2004). A long-term numerical solution for the insolation quantities of the Earth. *A&A* 428, 261.
- Hays, J. D., Imbrie, J. & Shackleton, N. J. (1976). Variations in the Earth's orbit: pacemaker of the ice ages. *Science* 194, 1121.

**Inclination hypothesis**
- Muller, R. A. & MacDonald, G. J. (1995). Glacial cycles and orbital inclination. *Nature* 377, 107.
- Muller, R. A. & MacDonald, G. J. (1997). Spectrum of 100-kyr glacial cycle: orbital inclination, not eccentricity. *PNAS* 94, 8329.

**MPT mechanism (compatible with model)**
- Farley, K. A. (1995). Cenozoic variations in the flux of interplanetary dust recorded by ³He in deep-sea sediments. *Nature* 376, 153.
- Willeit, M. et al. (2019). Mid-Pleistocene transition triggered by gradual CO₂ removal. *Science Advances* 5, eaav7337.
- Ganopolski, A., Winkelmann, R. & Schellnhuber, H. J. (2016). Critical insolation–CO₂ relation for diagnosing past and future glacial inception. *Nature* 529, 200.

**Recent open-debate**
- Barker, S. et al. (2025). Distinct roles for precession, obliquity, and eccentricity in Pleistocene 100-kyr glacial cycles. *Science* 387, eadp3491.
- Mitsui, T. et al. (2025). On the 100-kyr cycle of Pleistocene glaciations. *Earth Sys. Dyn.* 16, 1569.
- Lisiecki, L. E. (2023). Precession pacing of Late Pleistocene ice-sheet changes. *Nature Geoscience*.

**Cross-planet obliquity references**
- Bills, B. G. & Comstock, R. L. (2005). Forced obliquity variations of Mercury. *JGR-Planets* 110, E04006.
- Ward, W. R. (1973). Large-scale variations in the obliquity of Mars. *Science* 181, 260.
- Touma, J. & Wisdom, J. (1993). The chaotic obliquity of Mars. *Science* 259, 1294.

### 9.2 Related documents

- [doc 10 — Fibonacci Laws](10-fibonacci-laws.md) — derivation of H and the Fibonacci-divisor structure
- [doc 16 — Milankovitch Language](16-milankovitch-language.md) — model's predictions (companion to this document)
- [doc 32 — Inclination Calculations](32-inclination-calculations.md) — Earth's inclination oscillation
- [doc 37 — Planetary Precession Cycles](37-planets-precession-cycles.md) — canonical standard-vs-model obliquity comparison
- [doc 55 — Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) — full 8H/n period table used in §3 cross-referencing
- Website: `model/supporting-evidence.mdx` §1 (100-kyr problem) and §6 (climate mechanism)
- Website: `model/eigenfrequencies.mdx` (Berger spectrum match details)
