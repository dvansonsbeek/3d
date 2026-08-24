---
docVersion: 1.0
modelVersion: v11.0
coefficients: sha256:c6b0f26097c7945c
status: current
---

# The derived Earth-orbit vector — eccentricity and perihelion as one object

**Status**: research record of the FQ-7-Sun "option C" campaign (plan §12i).
Nothing in this document is shipped in the eclipse chain or the
deep-time path; the shipped state after option C-small is one
eccentricity law for Sun and Moon in the eclipse chain (the H/3 line,
doc 66) and the H/16 law in the cardinal-point path. What this document
records is a **derivation**: Earth's eccentricity and perihelion, from
the framework's own inputs and zero fitted constants, as a single
rotating vector — and what that vector says about the model's laws at
the modern epoch and at deep time.

**What this is, and what it is not.** The derivation in §3 is standard
secular dynamics — first-order Laplace–Lagrange theory and an N-body
integration — run on standard inputs (DE440 mass ratios, J2000 orbital
elements, the framework's periods). Reproducing Laskar's eccentricity
history with it is therefore *expected*, not a discovery about the
solar system: Laskar did the same, to higher order and with more care.
The derivation used no lattice ingredient, and the eigenfrequencies it
produced are not on the lattice (g5 → 8H/8.75). It is **not evidence
for the lattice**. What is ours is listed in §7: a real defect found and
fixed, a governing rule for which lattice periods may appear in which
quantities, an honest recalibration of the model's deep-time claims,
and a tool the framework did not have.

Instruments: `tools/explore/fq7s-ecc-consistency.mjs`,
`fq7s-orbit-vector-vs-laskar.mjs`, `fq7s-laplace-lagrange-e.mjs`,
`fq7s-nbody-g.mjs`, `fq7s-annual-channel.mjs`.

---

## 1. The finding that started it: three eccentricity laws

The joint Sun–Moon look (owner: "look at the Moon and the Sun together")
found the eclipse chain carrying three laws for one physical quantity:

| law | who rode it | ė at J2000 |
|---|---|---:|
| H/16 beat law (`earth.eccentricity`) | cardinal points / deep time | −0.84e-5/cy |
| H/3 line (`moon/ecc-channel.cjs`, e = base·(1 + cos θ/2)) | the Moon's E-factor | ≈ −4.27e-5/cy |
| H/16 + H/3 imprint (`sunEccentricityAt`, pre-C-small) | the Sun's equation of centre | −5.11e-5/cy |
| *observed (JPL/Simon)* | | *−4.20e-5/cy* |

The Sun's slope was algebraically the Moon's line plus the H/16 law's
own slope, and that H/16 slope was exactly the Sun-side ė tension the
annual-channel attribution had measured (T·sinM −3.7″/cy). JPL sides
with the Moon's line. Option C-small moved the eclipse Sun onto the H/3
line (registry Sun 0.93 → <!--v:frameworkSunVsJplRms-->0.80<!--/v-->″,
centerlines → <!--v:centerlinesMeanArcsec-->2.1<!--/v-->″, Babylon
<!--v:babylon135BestGapKm-->170<!--/v--> km — doc 66).

## 2. The principle: eccentricity is frame-invariant

Dynamically, eccentricity and perihelion are one complex variable,
**z = e·e^{iϖ}**; inclination and node are another, ζ = sin(i/2)·e^{iΩ}.
Secular theory writes z as a sum of rotating vectors (eigenmodes), and
e = |z|, ϖ = arg z fall out **together**. Two consequences for the
lattice:

- **e = |z| is frame-invariant.** Rotating the reference frame changes
  ϖ but cannot change |z|. So e may carry only fixed-frame lattice
  content — H/3 and the 8H-class beats — never an of-date period.
- **H/16 is a frame period.** The of-date perihelion cycle is
  1/(1/(H/13) + 1/(H/3)) = H/16 exactly, because 13 + 3 = 16: the H/3
  apsidal rotation seen from the H/13-precessing equinox. H/16 belongs
  to ϖ_of-date, not to e.

The frame-invariance audit of every Earth-orbit law in the chain
(e, ϖ, i, Ω, ε, p) found the eccentricity laws to be the **only** place
a frame period sat inside a frame-invariant quantity. ϖ, i, Ω, ε and p
are all frame-consistent.

## 3. The derivation: Laplace–Lagrange on the framework's own planets

First-order Laplace–Lagrange secular theory needs only what the
framework already has: GM_SUN, the derived Earth–Moon-system mass, the
DE440 planet mass ratios (declared IAU inputs, the same status they hold
everywhere in the model), the framework orbital periods, and the J2000
e/ϖ of each planet as initial conditions (anchored by design). The
secular matrix is symmetrized with the Laplace–Lagrange weights and
diagonalized; Earth's row of the eigenvectors, scaled by the J2000
initial conditions, gives z_Earth(t) = Σ cᵢ·Vᵢ·e^{i gᵢ t}. No fitted
constants.

| eigenfrequency | derived (″/yr) | Laskar 2004 | period (kyr) | 8H/n |
|---|---:|---:|---:|---:|
| g2 | 7.35 | 7.4555 | 176 | 15.2 |
| g3 | 17.34 | 17.3711 | 75 | 35.9 |
| g4 | 18.02 | 17.9159 | 72 | 37.3 |
| g1 | 5.46 | 5.5965 | 237 | 11.3 |
| g8 | 0.64 | 0.6730 | 2009 | 1.3 |
| g5 | 3.74 (first order) → **4.224 (framework N-body)** | 4.2575 | 304 | 8.75 |
| g7 | 2.73 | 3.0876 | 474 | 5.7 |

First-order theory places g5 12% low — the Jupiter–Saturn 5:2
near-resonance is a second-order effect. The model's doctrine is to
derive, and its own planetary integrator is the derivation:
`fq7s-nbody-g.mjs` integrates Sun + 8 planets from the same inputs for
100 kyr (96 s at 1 kyr/s) and a two-mode fit of Jupiter's and Saturn's
h, k returns **g5 = 4.224″/yr — 0.8% from Laskar's 4.2575**. Substituting
Laskar's g5/g7 as a sensitivity control gives the same closure the
N-body value gives: the Jupiter–Saturn frequency was the only gap.

The lattice reading follows the site's own framing
(`eigenfrequencies.mdx`): the eigenmodes are mathematical objects, the
lattice claim lives in their **beats**. The derived g3 − g5 beat is
95.3 kyr against 8H/28 = 95.8 kyr — the same empirical correspondence
the site already documents, neither strengthened nor weakened here. The
derived g's themselves are not on 8H/n (8.75, 15.2, 35.9, …). That is
the first framework-side datum for the page's open question 1 ("do the
g's converge on H/n?") and the answer it gives is **no** for g5 at the
0.8% level — recorded as such.

## 4. Deep time: the vector against La2004

| e-law | corr with La2004, last 250 kyr | RMS |
|---|---:|---:|
| H/16 law (cardinal path) | −0.01 | 0.021 |
| Sun H/16 + H/3 (pre-C-small) | −0.29 | 0.022 |
| H/3 line (Moon; eclipse Sun now) | −0.28 | 0.021 |
| **derived \|z\| (LL eigenvectors + N-body g5)** | **0.967** | **0.0047** |

Over 500 kyr the derived vector reads corr 0.93, over 1 Myr 0.90, over
2 Myr 0.73; its spectrum carries the 96 / 125 / 405-kyr eccentricity
beats at Laskar-class amplitude (sd 0.012 vs 0.013). That agreement is
the expected outcome of standard dynamics on standard inputs (see the
status note); the informative row is the other one: the shipped scalar
laws carry no deep-time eccentricity signal at all — they are correct
*local* laws at J2000 and nothing more.

**The perihelion vector.** ϖ_of-date = arg z + accumulated framework
precession (H/13) against La2004 over 250 kyr: the model's ϖ law reads
102.8° RMS; the derived vector reads **8.05° RMS**. The mean of-date
period over the window: La2004 22,973 yr, the model's law 20,954 yr
(H/16), the derived vector 23,036 yr (0.3%). Both lattice matches the
eigenfrequency page reports for Earth — H/16 (of-date) and H/3 (fixed)
— are **local J2000 rates of a non-uniformly rotating perihelion
vector**: when e is small the vector swings back, and over 250 kyr its
mean fixed-frame period is ~215 kyr, not 112. The vector reproduces
both the local rates and the long-window means; the scalar laws
reproduce only the local rates.

**Cardinal-timing scale.** The derived and H/16 laws differ by up to
δe = 0.030 in the window — 3.5° of equation of centre — which moves the
cardinal-point instants by up to 3.5 days at deep time. The Step-6d fit
(0.28–0.37 min over ±270 kyr) measures the runtime closed form against
the engine's own CSV; it is a self-consistency figure and does not
express this days-class law uncertainty.

**The paleo test.** The LR04 insolation check (doc 94 lineage,
`scripts/milankovitch_insolation_laskar_check.py`, now with `LA2010_PATH`
/ `INSOLATION_CHECK_OUT` overrides so probes never overwrite the tracked
results) run with the derived e/ϖ as a third variant: ΔR² 6.6e-7
(model 1.2e-3, Laskar 4.5e-6). The documented null — the L1 + L2 + L3
formula already carries the climate variance — is robust under all
three eccentricity laws.

## 5. The modern epoch: the hybrid is not yet a local law

Put on the eclipse Sun, the derived vector reads JPL Sun (1900–2100)
1.487 → 1.660″, registry window 0.798 → 0.915″, T·sinM −0.19 → +2.0″/cy.
Its J2000 slope (−3.73e-5/cy) is 11% from the observed −4.20e-5 because
first-order eigenvectors are inconsistent with the N-body-corrected g5
(the pure first-order solution reads −4.10e-5, 2.5%, but with the wrong
g5). So the chain currently has **two truth-carriers**: the H/3 line
locally, the derived vector at deep time. The eclipse chain stays on
the H/3 line.

## 6. What closes it

A **self-consistent secular solution** — second-order Laplace–Lagrange
on the framework inputs, or the full eigen-structure (all eight modes:
frequencies, amplitudes, phases) read from the framework's own N-body
over ≥ 2 Myr (≈ 35 min at the measured 1 kyr/s) — is expected to give
both the local slope and the deep-time shape from one object. That is
C-large step 3. If it does, e = |z| and ϖ = arg z + p·t become the
single law for all three paths: the eclipse Sun, the Moon's E-factor,
and the cardinal points — the latter a deep-time-alignment-class
landing (CSV regeneration, Step-6d refit, the matched-pair rule), and
one that changes what the model says about deep-time cardinal timing by
days, while making it a derived claim that tracks La2004 at 0.97. That
adoption would also say plainly that deep-time eccentricity is governed
by standard secular dynamics rather than by an H/16-class lattice law —
which the model's own rule already allows (structural identities stay
kinematic; data and period tables go dynamical; an eccentricity
*history* is data-class). The lattice keeps exactly what it had: the
empirical beat correspondence, no more and no less.

## 7. What is ours

1. **A defect found and fixed.** Three eccentricity laws for one
   quantity, one of them carrying a frame period; the fix (C-small) is
   a measured model improvement independent of any external theory —
   Sun 0.93 → 0.80″, centerlines 2.2 → 2.1″, Babylon 186 → 170 km.
2. **A governing rule.** e = |z| may carry only fixed-frame divisors;
   of-date divisors belong to ϖ; H/16 is a composite (13 + 3), not a
   fundamental eccentricity period. Every future Earth-orbit law is
   constrained by it.
3. **An honest recalibration.** The H/16 and H/3 matches are local
   J2000 rates of a non-uniformly rotating vector; the scalar laws do
   not track eccentricity at deep time; the deep-time cardinal timing
   carries a days-class law uncertainty the Step-6d figure did not
   express. Knowing this is worth more than the 0.967.
4. **A tool.** The framework computes its own secular solution — and
   its own g5 to 0.8% — from its own inputs in about a minute.

---

## Cross-references

- doc 66 §5 — the FQ-7-Sun records (annual channel, C-small)
- doc 99 — the lattice; `eigenfrequencies.mdx` (website) — the model's
  reading of the g's and the beat-level lattice claim
- doc 94 — the insolation extension and its null
- plan §12i (private) — the FQ-7-Sun / option C campaign log
