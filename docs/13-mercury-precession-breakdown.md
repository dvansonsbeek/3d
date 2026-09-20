---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:b8b18424a3435e20
status: current
---

# Perihelion Precession: Quantities, Frames, and Breakdown

This document is the perihelion-precession reference: the distinct
quantities the model computes and displays (ecliptic longitude of date vs
Earth-frame right ascension), the Earth-frame fluctuation pattern and why
it averages out, the first-order Laplace–Lagrange physics and its
measured limitations, and §1.8 — the equatorial-projection account of the
Earth-frame rate, gate-pinned for all seven planets.

The planet panels show the **chain's** secular-shape attribution (base
mode / largest companion / remainder with % shares, plus the rate of
date — read live from the governed element chain via `_kcSecularShape`).
The first-order Laplace–Lagrange breakdown in this document is the
educational reference for the underlying physics, not a shipped display.

---

## The Two Coordinates, and the Methods That Compute Them

One perihelion motion appears in two coordinates, and keeping them apart
is load-bearing for everything below (§1.8 "The two coordinates, kept
apart"):

**(a) Ecliptic longitude of date** — what every published perihelion rate
is (Le Verrier, Newcomb, Clemence, WebGeoCalc). In the model this is the
stable analytic quantity: the scene's `perihelionLongitudeEcliptic()`
reads the pure precession angle directly from the precession layer's
rotation (bypassing all Earth-frame effects), and the perihelion markers
carry the model's own N-body longitude of perihelion of date from the
governed element chain.

**(b) Right ascension in the scene's equatorial frame** — the RA of the
perihelion direction in `earth.rotationAxis`, measured from the
perihelion-of-Earth point. No observer publishes this quantity. It
fluctuates because the projection slope dα/dλ and the obliquity move with
Earth's precession cycles; over a full H its average returns to the
ecliptic value. Two implementations exist:

- **Scene measurement** (`apparentRaFromPdA`): transforms the perihelion
  markers' world positions into Earth's equatorial frame and reads the
  apparent angle. The projection carries each body's declination
  (ρ = r·sin φ with φ the polar angle from the rotation axis) — this term
  is load-bearing: projecting with the full distance instead of ρ was
  measured to generate 96 % of Venus's exported "precession fluctuation"
  (std 513 → 20 ″/cy with the term; Mercury 96 → 35 ″/cy), as harmonics
  8–15 of the H/13 equatorial rotation with H/3 and H/8 sidebands — a
  property of the projection, not of the orbits.
- **The predict basis** (`predictGeocentricPrecession`): the trained
  physical-beat basis evaluates the same Earth-frame RA rate analytically
  at any simulation year, for all seven planets — no need to sample the
  scene over centuries. Mercury: <!--v:mercuryEarthFrameRa1900-->579.84<!--/v--> ″/cy
  at 1900, <!--v:mercuryEarthFrameRa2000-->579.83<!--/v--> ″/cy at 2000.

| Metric | Mercury |
|--------|-----------------|
| Rate at J2000 (Earth-frame RA) | <!--v:mercuryPeriRateEarthFrameMeasuredJ2000-->579.83<!--/v--> ″/cy = <!--v:mercuryPeriRateEclipticArcsecCy-->531.44<!--/v--> × dα/dλ + <!--v:mercuryPeriObliquityRateTermJ2000-->4.31<!--/v--> (+κ) |
| Lattice (ecliptic) rate | <!--v:mercuryPeriRateEclipticArcsecCy-->531.44<!--/v--> ″/cy |
| Earth-frame range over H | <!--v:mercuryFluctuationMin-->-47<!--/v--> to <!--v:mercuryFluctuationMax-->+48<!--/v--> ″/cy about the lattice rate |
| Dominant Earth-frame period | ~<!--v:mercuryOscillationPeriod-->7,451<!--/v--> years (H/45) |

### The Earth-frame fluctuation pattern

The dominant ~7,451-yr period is `H/45` — the 6th harmonic of the beat
between Earth's apsidal precession (H/3) and ecliptic precession
(H/5): `1/(1/3 − 1/5) = 7.5`, so the fundamental beat is H/7.5 ≈ 44,709 yr
and its 6th harmonic is H/45. The fluctuation arises because a planet's
perihelion marker inherits Earth's precession-layer transformations in
the scene graph; measured in Earth's equatorial frame these compound into
the apparent rate. Over a complete Earth Fundamental Cycle H the
oscillations cancel — sometimes Earth's orientation adds to the apparent
rate, sometimes it subtracts — so the long-term Earth-frame average
equals the ecliptic value. (`tools/verify/mercury-precession-centuries.js`
tabulates the rates by century, 1800–2100.)

### When to use which

- **Ecliptic-frame**: comparing to published orbital elements, verifying
  the model's precession rates, any scientific calculation.
- **Earth-frame**: understanding what an equatorial measurement does to
  the rate, and studying the interaction of Earth's precession cycles.
- GUI: each planet's perihelion folder shows both — `(Geocentric)` the
  Earth-frame value (fluctuates), `(Heliocentric)` the ecliptic value
  (stable).

---

## Part 1: The Physics

### 1.1 Secular Perturbation Theory (Laplace-Lagrange Theory)

Perihelion precession is caused by gravitational perturbations from other planets. The **secular** (long-term averaged) precession rate from a single perturber is derived from the Laplace-Lagrange secular perturbation theory.

**Diagonal A_ii contribution from perturber j** (Murray & Dermott §7.4, eq 7.138):

```
dω_i/dt = (n_i/4) × ε × α × ᾱ × b₃/₂⁽¹⁾(α)
```

Where:
- `n_i` = mean motion of the perturbed planet (rad/year)
- `ε` = m_j/M☉ = mass ratio of perturber to Sun
- `α` = min(a_i, a_j)/max(a_i, a_j) (semi-major axis ratio, always ≤ 1)
- `ᾱ` = α if j is outer of i (so α × ᾱ = **α²**)
       1 if j is inner of i (so α × ᾱ = **α**)
- `b₃/₂⁽¹⁾(α)` = Laplace coefficient (computed via numerical integration)

**Key point:** The same Laplace coefficient `b₃/₂⁽¹⁾(α)` is used for both inner and outer perturbers. The distinction comes from the `α·ᾱ` prefactor, **not** from swapping in `b₃/₂⁽²⁾`. The `b₃/₂⁽²⁾` coefficient appears only in the off-diagonal A_ij terms (secular eigenvector mixing).

The Laplace coefficient is computed using the integral definition (numerical integration, 1000 steps — series expansion is inaccurate for larger α such as Venus's 0.54):

```
b_s^j(α) = (1/π) × ∫₀^(2π) cos(jψ) / (1 - 2α cos(ψ) + α²)^s dψ
```

**Numerical values for Mercury's perturbers:**

| Perturber | α      | b₃/₂⁽¹⁾(α) |
|-----------|--------|------------|
| Venus     | 0.5352 | 3.036      |
| Earth     | 0.3871 | 1.576      |
| Mars      | 0.2541 | 0.864      |
| Jupiter   | 0.0744 | 0.226      |
| Saturn    | 0.0406 | 0.122      |

**Reference:** Murray & Dermott (1999), Park et al. (2017)

### 1.2 Eccentricity and Inclination Corrections (Negligible)

For first-order secular theory, eccentricity and inclination corrections are **negligible**: the eccentricity correction contributes ~2% for Mercury (e = 0.206) and the inclination correction ~1% for typical mutual inclinations — within the expected ~4% overestimate of first-order theory vs Park et al. (2017), so they are not included. If higher accuracy were needed: `f(e) ≈ 1 + (1/2)e²`, `g(I) = cos(I_mutual)`; for ≤1% accuracy, full numerical integration of the equations of motion is required (like JPL ephemerides).

### 1.3 Sign Convention

**All diagonal A_ii contributions are prograde (+).** The self-precession rate receives a positive contribution from every perturber, whether inner or outer — this follows directly from `α > 0`, `ᾱ > 0`, and `b₃/₂⁽¹⁾(α) > 0`. (The off-diagonal A_ij term, `−(n_i/4)·ε·α·ᾱ·b₃/₂⁽²⁾(α)`, does carry a negative sign, but it describes eigenvector mixing between planets, not the self-precession rate.)

### 1.5 IMPORTANT: Fundamental Limitations of These Calculations

**First-order Laplace-Lagrange values are APPROXIMATIONS, not precise predictions** — an educational simplification from the 18th-19th century; modern astronomy uses full numerical integration (JPL Development Ephemerides).

| Limitation | Impact | Example |
|------------|--------|---------|
| **Ecliptic-frame-only** | Treats the ecliptic as a stable reference, ignoring that the ecliptic itself precesses (general precession H/13 ≈ 50 ″/yr). See §1.5a. | Saturn ecliptic-retrograde observed but L-L gives prograde |
| **First-order only** | Neglects terms of order m² in planetary masses | ~4% error for Mercury |
| **Secular terms only** | Ignores all periodic (short-term) perturbations | Unknown systematic bias |
| **Low-order in e, i** | Only uses 2nd order in eccentricity/inclination | Poor for high-e orbits |
| **No indirect effects** | Venus→Earth→Mercury chains ignored | Park includes cross-terms |
| **No resonances** | Jupiter-Saturn 5:2 resonance not captured | Saturn accuracy ~78% |
| **Low eccentricity failure** | Theory breaks for near-circular orbits | Venus completely wrong |

From [University of Texas celestial mechanics](https://farside.ph.utexas.edu/teaching/336k/Newtonhtml/node115.html):

| Planet | Observed (″/yr) | Theoretical (″/yr) | Agreement |
|--------|-----------------|-------------------|-----------|
| Mercury | 5.75 | 5.50 | Reasonable |
| **Venus** | **2.04** | **10.75** | **VERY POOR** |
| Earth | 11.45 | 11.87 | Good |
| Mars | 16.28 | 17.60 | Reasonable |
| Jupiter | 6.55 | 7.42 | Reasonable |
| Saturn | 19.50 | 18.36 | Good |

**Venus is a known failure case** — its low eccentricity makes the perihelion direction extremely sensitive to tiny perturbations, causing first-order theory to give nonsense results.

The L-L values should therefore be read as **illustrative and qualitative** — showing which planets have the largest gravitational influence — not as precise predictions (they may differ from reality by 5-50% depending on the planet). Accurate values need full numerical integration (DE440/DE441), second-order mass corrections (Brouwer-van Woerkom 1950), and higher-degree secular theories.

**References:**
- [Secular evolution of planetary orbits - UT Austin](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html)
- [Perihelion Precession of the Planets - UT Austin](https://farside.ph.utexas.edu/teaching/336k/Newtonhtml/node115.html)
- [Park et al. 2017 - MIT/JPL](https://dspace.mit.edu/handle/1721.1/109312)

---

### 1.5a Reference Frames: why ecliptic-only L-L fails structurally

This is the deepest limitation and deserves its own section because it
explains most of the failure modes in §1.5:

**L-L is an ecliptic-based theory.** The secular matrix A is derived in a
single reference plane — traditionally the ecliptic-of-J2000 or the
invariable plane. All perihelion motions ϖ_i are measured in that one
frame. The theory assumes this frame is a stable inertial reference.

**But the ecliptic is not a stable inertial frame.** Two things move relative
to the ICRF (true inertial):

1. **General precession (H/13 ≈ <!--v:earthAxialPeriod-->25,771<!--/v--> yr)** — Earth's axial precession
   carries the equinox westward through the inertial sky at ~50 ″/yr. The
   "ecliptic-of-date" frame rotates at this rate relative to the ICRF.
2. **Ecliptic precession (H/5 ≈ <!--v:hDiv5-->67,063<!--/v--> yr)** — Earth's orbital plane itself
   precesses around the invariable plane, so the ecliptic-of-J2000 is also
   not identical to the invariable plane in the long run.

Because L-L collapses both frames into one "ecliptic" treatment, it cannot
cleanly separate what's happening **in the inertial frame** (ICRF) from
what's happening **relative to the moving equinox** (ecliptic-of-date).
For most planets this works, because the rates are large and the frames
don't disagree qualitatively. But it fails where frame matters:

- **Saturn (sign flip)**: first-order L-L gives prograde +1,867 ″/cy, but
  WebGeoCalc measures ecliptic-of-date retrograde over 1800–2100, with
  magnitude window-dependent (sliding 126-year OLS gives anywhere from
  −1,800 to −3,600 ″/cy; the WebGeoCalc Explorer panel flags Saturn as
  un-determined because of this window sensitivity). The *direction*
  retrograde is robust; the *magnitude* is not pinpointable from the
  1800–2100 baseline. Either way, the sign disagreement with L-L is
  not a mathematical error — it reflects that the "ecliptic" in L-L
  theory is a long-term-averaged inertial plane, while "ecliptic" in
  WebGeoCalc is the instantaneous date-frame. The Great Inequality
  (Jupiter-Saturn 5:2 resonance) produces a large retrograde signal
  *in the date-frame* that averages away in the inertial frame. L-L
  sees the average; WebGeoCalc sees the current-epoch reality.
- **Venus (catastrophic failure)**: Venus's near-circular orbit (e = 0.007)
  makes the perihelion direction frame-sensitive to tiny perturbations.
  L-L's single-frame treatment gives ~+1,200 ″/cy; observation gives ~0.

**The Holistic Universe Model tracks both frames explicitly.** For every
planet the model stores:

- `perihelionEclipticYears` — rate of perihelion motion in the ecliptic-
  of-date (what WebGeoCalc measures)
- Derived ICRF period: `T_ICRF = (T_peri · T_H13) / (T_H13 − T_peri)` —
  the rate in the inertial frame after subtracting general precession

The two are related by `ω_ICRF = ω_ecliptic − ω_gen` where
`ω_gen = 2π / T_H13` is the general-precession rate. This relation is
applied as a formula; inside the scene the equatorial frame and the star
field share the H/13 rotation, so a scene measurement cannot separate
"relative to the equinox" from "relative to the stars" — see §1.8, "Frames,
measured". **The model treats the
ICRF as the stable foundation** — it's the frame in which the Fibonacci
structure (H/3, H/5, H/8, H/13, H/16) is anchored — and derives the
ecliptic rate from it via this relation. That's why the model's ecliptic
rates match WebGeoCalc directly (both measure the date-frame) while L-L's
ecliptic rates match neither cleanly (L-L's "ecliptic" is a hybrid of
conventions).

**Testable prediction from the frame distinction.** Standard secular theory
says Saturn's ecliptic retrograde rate is a transient phase of the
Great-Inequality oscillation (~900-yr period) and will reverse within
~450 yr. The Holistic Universe Model says Saturn's ecliptic rate is
permanently retrograde at `−8H/65 = −3,140 ″/cy` because that's the correct
date-frame expression of the stable ICRF structure. Long-baseline JPL
DE441 integrations (13 000 BC → 17 000 AD) can in principle distinguish
these. See [docs/10-fibonacci-laws.md §Law 6](10-fibonacci-laws.md#law-6-saturn-jupiter-earth-resonance) for the full discussion.

---

### 1.6 Mercury's Missing Advance Display

The planetStats panel for Mercury includes a grouped pair comparing the Holistic Model prediction to General Relativity:

| Row | Value | Color | Source |
|-----|-------|-------|--------|
| `┌ Missing advance around 1900 AD (Model)` | ~44″/century | Amber (dynamic) | `predictGeocentricPrecession(1900, 'mercury') − baseline` |
| `└ Missing advance (GR)` | 42.98″/century | White (static) | Einstein's General Relativity prediction |

The model value uses the predictive formula at year 1900 (the epoch of Le Verrier's and Einstein's analyses). The GR value of 42.98″/century is the standard textbook result for Mercury's relativistic perihelion advance due to spacetime curvature near the Sun.

### 1.7 Historical Context

Urbain Le Verrier (1859) discovered that Mercury's observed perihelion precession (~575 ″/cy) exceeded Newtonian predictions (~532 ″/cy) by about 43 ″/cy; General Relativity (1915) explained the difference as spacetime curvature near the Sun — one of GR's first experimental confirmations. First-order secular theory **overestimates the Newtonian rate by ~4%** compared to Park et al. (2017) for Mercury (553 vs 532 ″/cy — see §1.2 and §1.5); the model's own value sits within ~0.1%:

| Source | Mercury Total |
|--------|---------------|
| Our model (H×8/11) | 531.4"/cy |
| Park et al. (2017) | 532"/cy |
| Difference | ~0.1% |

**No calibration factors are used** — values are calculated from first principles, with all their inherent limitations (no indirect Venus→Earth→Mercury chains, no higher-order terms, no eccentricity/inclination corrections, short-period terms assumed to average to zero).

### 1.8 The Earth-frame rate is the equatorial projection of the ecliptic advance

The Earth-frame perihelion rate the model measures (the right ascension of
the perihelion direction in the scene's equatorial frame — the Step-3 export's
`<Planet> Perihelion RA` column, and at J2000 the shipped predict basis) is
not a new quantity: it is the ecliptic advance projected into that frame,
plus the term the changing obliquity adds to any right ascension:

```
rate_RA  =  rate_ecl · dα/dλ(λ, ε)  +  ∂α/∂ε(λ, ε) · ε̇  +  κ

dα/dλ  =  cos ε / (cos²λ + sin²λ cos²ε)                  (β = 0)
∂α/∂ε  =  −sin λ cos λ sin ε / (cos²λ + sin²λ cos²ε)
```

with ε̇ = <!--v:obliquityRateJ2000ArcsecCy-->-46.8<!--/v--> ″/cy from the shipped
obliquity law and κ a small of-date coupling (≤ 0.7 ″/cy, measured). The gate
`tools/verify/perihelion-projection-closure.js` pins this for all seven
planets at 1900/2000/2100 to 1 ″/cy.

**Mercury.** The ecliptic advance is the lattice divisor,
<!--v:mercuryPeriRateEclipticArcsecCy-->531.44<!--/v--> ″/cy (8H/11). At the
IAU J2000 perihelion longitude (77.457°) and the IAU 2006 obliquity the slope
is <!--v:mercuryPeriRaSlopeJ2000-->1.08036<!--/v-->, the projected rate
<!--v:mercuryPeriRateRaProjectedJ2000-->574.14<!--/v--> ″/cy, and the excess
over the ecliptic advance **<!--v:mercuryPeriProjectionExcessJ2000-->42.71<!--/v--> ″/cy**.
The general-relativistic advance derived from the same model constants
(6π GM/(c² a (1 − e²)) per orbit) is
<!--v:mercuryPeriAnomalyGrArcsecCy-->42.98<!--/v--> ″/cy. Adding the obliquity-rate
term (<!--v:mercuryPeriObliquityRateTermJ2000-->4.31<!--/v-->) and κ gives the
Earth-frame rate the model measures,
<!--v:mercuryPeriRateEarthFrameMeasuredJ2000-->579.83<!--/v--> ″/cy — the "+48"
above 531.44 that is flat over the last millennium and oscillates around the
ecliptic value over a full H.

The observational precision matters here: the ranging determinations pin the
inertial excess at 42.980 ± 0.002 ″/cy (Pireaux & Rozelot 2003; Pitjeva's
EPM2008 residual to the GR-inclusive rate −0.004 ± 0.005 ″/cy), so 42.71
differs from the observed excess by 0.27 ″/cy — a 0.6 % agreement, not an
exact one. The classical determinations (Le Verrier 1859: transits, plus
meridian observations reduced to apparent geocentric *longitude*; Newcomb
1882/1895; Clemence 1947) form the perihelion correction as an ecliptic
element; no rate is formed in right ascension anywhere in those chains.
Le Verrier's Paris meridian series alone (1801–1842, 187 equations of
condition in apparent geocentric longitude, re-solved in
`tools/explore/leverrier-meridian-refit.py`) gives δπ′ = 43.1 ± 16.5 ″/cy —
the excess is present in longitude-reduced positions with no transit and no
modern constant in the chain.

**The two coordinates, kept apart** (`tools/explore/mercury-perihelion-frames.mjs`).
The advance is one motion in two coordinates: (a) ecliptic longitude of date,
λ̇ = ϖ̇_sidereal + p_A — what Le Verrier, Newcomb and Clemence measured; (b)
right ascension of date, α̇ = λ̇·dα/dλ + ∂α/∂ε·ε̇ — what the scene's export
measures for its marker and what no observer has published. Converting
either way closes exactly, and the missing advance is the same gap in both:
classical system (Newcomb p_A 5,025.645) observed 5,599.74 vs model
5,557.08 → 42.66 ″/cy in longitude, 46.09 in RA (= 42.66 × slope); modern
system, compared directly in ICRF (no equinox-referred determination
exists there, and none may be manufactured by adding p_A to a ranging
value): Park 575.31 vs model lattice 531.44 → 43.87 in longitude (0.89 of
it the baseline 532.33 − 531.44); p_A, common to both sides of an of-date
statement, cancels in any within-system subtraction. The scene's
579.8 is the RA rate in an equator that co-moves with its stars (no p_A);
converted back to longitude it is 531.44 again — the projection adds nothing
to the longitude rate, in which the anomaly is defined. A sum that applies
the slope to the sidereal rate but not to p_A, or takes the obliquity term
with the opposite sign, mixes the two coordinates and is not a decomposition.

The derivation uses the IAU longitude (λ = 77.457°). The scene's perihelion
marker shows the model's own N-body longitude of perihelion of date
(ϖ(2000) = 77.455° from the governed element chain — the same value the
perihelion panels display). The `…Marker…` registry keys record the retired
two-vector marker convention (λ + 0.97°) as historical bookkeeping — they
are not a reading of the anomaly.

**All planets.** The same projection, same constants:

| planet | ecliptic ″/cy | dα/dλ | projected ″/cy | excess ″/cy | GR advance ″/cy | Earth-frame measured ″/cy |
|---|---|---|---|---|---|---|
| Mercury | <!--v:mercuryPeriRateEclipticArcsecCy-->531.44<!--/v--> | <!--v:mercuryPeriRaSlopeJ2000-->1.08036<!--/v--> | <!--v:mercuryPeriRateRaProjectedJ2000-->574.14<!--/v--> | <!--v:mercuryPeriProjectionExcessJ2000-->42.71<!--/v--> | <!--v:mercuryPeriAnomalyGrArcsecCy-->42.98<!--/v--> | <!--v:mercuryPeriRateEarthFrameMeasuredJ2000-->579.83<!--/v--> |
| Venus | <!--v:venusPeriRateEclipticArcsecCy-->-289.87<!--/v--> | <!--v:venusPeriRaSlopeJ2000-->1.00661<!--/v--> | <!--v:venusPeriRateRaProjectedJ2000-->-291.79<!--/v--> | <!--v:venusPeriProjectionExcessJ2000-->-1.92<!--/v--> | <!--v:venusPeriAnomalyGrArcsecCy-->8.62<!--/v--> | <!--v:venusPeriRateEarthFrameMeasuredJ2000-->-303.98<!--/v--> |
| Mars | <!--v:marsPeriRateEclipticArcsecCy-->1,739.25<!--/v--> | <!--v:marsPeriRaSlopeJ2000-->0.94201<!--/v--> | <!--v:marsPeriRateRaProjectedJ2000-->1,638.40<!--/v--> | <!--v:marsPeriProjectionExcessJ2000-->-100.85<!--/v--> | <!--v:marsPeriAnomalyGrArcsecCy-->1.35<!--/v--> | <!--v:marsPeriRateEarthFrameMeasuredJ2000-->1,638.38<!--/v--> |
| Jupiter | <!--v:jupiterPeriRateEclipticArcsecCy-->1,884.19<!--/v--> | <!--v:jupiterPeriRaSlopeJ2000-->0.92693<!--/v--> | <!--v:jupiterPeriRateRaProjectedJ2000-->1,746.52<!--/v--> | <!--v:jupiterPeriProjectionExcessJ2000-->-137.67<!--/v--> | <!--v:jupiterPeriAnomalyGrArcsecCy-->0.06<!--/v--> | <!--v:jupiterPeriRateEarthFrameMeasuredJ2000-->1,753.54<!--/v--> |
| Saturn | <!--v:saturnPeriRateEclipticArcsecCy-->-3,140.31<!--/v--> | <!--v:saturnPeriRaSlopeJ2000-->1.08966<!--/v--> | <!--v:saturnPeriRateRaProjectedJ2000-->-3,421.86<!--/v--> | <!--v:saturnPeriProjectionExcessJ2000-->-281.55<!--/v--> | <!--v:saturnPeriAnomalyGrArcsecCy-->0.01<!--/v--> | <!--v:saturnPeriRateEarthFrameMeasuredJ2000-->-3,422.06<!--/v--> |
| Uranus | <!--v:uranusPeriRateEclipticArcsecCy-->1,159.50<!--/v--> | <!--v:uranusPeriRaSlopeJ2000-->0.92126<!--/v--> | <!--v:uranusPeriRateRaProjectedJ2000-->1,068.21<!--/v--> | <!--v:uranusPeriProjectionExcessJ2000-->-91.29<!--/v--> | <!--v:uranusPeriAnomalyGrArcsecCy-->0.00<!--/v--> | <!--v:uranusPeriRateEarthFrameMeasuredJ2000-->1,065.58<!--/v--> |
| Neptune | <!--v:neptunePeriRateEclipticArcsecCy-->193.25<!--/v--> | <!--v:neptunePeriRaSlopeJ2000-->0.99870<!--/v--> | <!--v:neptunePeriRateRaProjectedJ2000-->193.00<!--/v--> | <!--v:neptunePeriProjectionExcessJ2000-->-0.25<!--/v--> | <!--v:neptunePeriAnomalyGrArcsecCy-->0.00<!--/v--> | <!--v:neptunePeriRateEarthFrameMeasuredJ2000-->204.75<!--/v--> |

The projection excess reproduces the GR advance for Mercury and for no other
planet (Venus −1.92 vs 8.62; Mars −100.85 vs 1.35; the outer planets' excesses
are large where their GR advances are negligible). The ranging ephemerides
confirm the relativistic advances of all four inner planets directly:
Pitjeva's EPM2008 residual corrections to the GR-inclusive perihelion rates
are Mercury −0.004 ± 0.005, Venus +0.024 ± 0.033, Earth +0.006 ± 0.007,
Mars −0.007 ± 0.007 ″/cy — the inertial excesses equal 42.98 / 8.62 / 3.84 /
1.35 ″/cy to those precisions, and the projection values are excluded as
their cause by three orders of magnitude for Venus and Mars. Earth's own perihelion of
date (H/16, <!--v:earthPeriRateEclipticOfDateArcsecCy-->6,184.00<!--/v--> ″/cy)
projects with an excess of <!--v:earthPeriProjectionExcessJ2000-->493.18<!--/v--> ″/cy
against a GR advance of 3.84. This table is the pre-registered test of the
statement "the Mercury anomaly is the equatorial projection of the ecliptic
advance" applied to all planets; the statement's scope, frame wording and
public form are decided in the plan `IP-mercury-anomaly-projection.md`
(private repo), not here.

**Frames, measured.** In the scene the equatorial frame (`earth.rotationAxis`)
and the star field (`zodiac`, a child of `earth.pivotObj`) share the H/13
rotation, so a perihelion marker's rate is the same relative to the equinox
and relative to the stars (Mercury: 532 ″/cy for both), whereas physically
the two differ by the general precession. The "ICRF rate" of §1.5a
(ω_ICRF = ω_ecl − ω_gen) is a formula applied outside the scene. The
projection slope depends only on λ and ε and is unaffected; the words
"of date" around it are the open frame decision of the plan.

**Transits, measured.** A transit is the Sun–Mercury–Earth alignment, so
its instant depends on where the apsidal line physically points and on no
observer coordinate — no equator, equinox or ecliptic of date enters. That
makes the transit record the frame-free test of whether the apsis turns at
the Newtonian rate or 43 ″/cy faster. `tools/explore/mercury-transit-apsidal-test.mjs`
runs it: two-body Kepler orbits from the Standish J2000-ecliptic elements,
light-time included, Mercury's ϖ rate the only quantity varied (Standish
577.7 ″/cy in the fixed J2000 frame = Newton + GR, versus that minus 42.98),
a linear ΔL₀ + Δn·T fitted per hypothesis so mean-motion errors cannot pose
as an apsidal signal, against the 53 catalogue mid-transit instants
1631–2019. The discriminating signature is that a wrong apsidal rate moves
the November transits (near perihelion, cos M > 0) and the May transits
(near aphelion, cos M < 0) in opposite directions, which no linear term or
ΔT error can absorb. Measured: Newton + GR leaves RMS 87 s with residual
drifts of −9 (Nov) and +17 (May) s/cy — the two-body noise floor; the
Newton-only apsis leaves RMS 244 s with the families walking apart at +67
and −159 s/cy. A scan over the rate offset minimises at +0.1 ″/cy (577.8
″/cy) on the full record; restricted to 1800–2019 the bowl is shallow and
minimises at +18 ″/cy — the two-body model's unmodelled perturbations
(±5-min outliers such as 1832 and 1891) limit a two-century window to
roughly ±15 ″/cy on the rate, while the Newton-only apsis stays excluded
there too (RMS 177 s vs 82 s, drifts +97 / −246 s/cy). The catalogue
instants are ephemeris-computed (they reproduce the 2016/2019 observed
contacts to seconds), so the precision statement of the same test is
Morrison & Ward 1975 (MNRAS 173, 183): ~2,400 observed internal contacts
1677–1973, the perihelion excess over Newtonian a free parameter,
**+41.9 ± 0.5 ″/cy**. The physical apsidal line turns ~43 ″/cy faster than
Newton in a measurement that never touches the equator; the projection
excess of this section, being zero in every equator-free coordinate,
cannot be that motion.

**Pre-registered slot for a lattice-native cause.** Since the excess is a
property of the orbit, any explanation must be a rule that acts at the
body — one formula for every body from lattice/orbital quantities only (H,
8H/N, a, e, period, masses), with no obliquity and no longitude measured
from the equinox, and no parameter fitted to the targets (or fitted on
Mercury alone and then predicting the rest). The harness
`tools/explore/perihelion-excess-candidates.mjs` scores such rules against
the non-circular targets — Mercury 41.9 ± 0.5 (transits, free parameter),
Icarus ≈ 9.9 ± 2 (radar, free parameter; uncertainty a placeholder to be
refined from Shapiro et al. 1968/1971, Lieske & Null 1969), and Mars
≈ +0.6 ± 3, the ecliptic-longitude trend of the model's own WebGeoCalc
series minus the Newtonian rate from the masses — with the GR-inclusive
fit residuals (Venus, Earth, Mars) shown separately as informative only.
As shipped: GR (zero parameters) passes; the equatorial projection passes
Mercury and Icarus (a second ~5 % coincidence: at ϖ = 119° the RA stretch
is ~4 %, and so is GR/Newtonian for Icarus) and fails Mars by 34σ, because
in ecliptic longitude the projection is identically zero while the Mars
data want ≈ 0 and the rule gives −101; a constant fraction of the
Newtonian rate, k/a, and the nearest 8H/N slot fail. The lattice-native
slot is empty; a proposal is scored by defining its function there.

**The model's own N-body.** The audit of every planet's perihelion and node
rate with the model's own integrator, the Wisdom–Holman engine, the
frequency analysis, the lattice tested at its own quantity type, the beat
null test and the derived-orbit-vector attempt are recorded in
[109-model-nbody-engine-and-lattice-test.md](109-model-nbody-engine-and-lattice-test.md).
Its results that bear on this section: Newton + the measured masses
reproduce every rate except Mercury's (−43.0 in both windows, closed by the
1PN term alone); the masses cannot carry the 43 (a joint mass set that fits
the perihelia breaks the nodes); and the 1PN term raises Mercury's
long-term g₁ by 0.473 ″/yr — the same physics at the quantity-A level.

---

## The Three-Way Comparison

For each planet: **WebGeoCalc observed** (JPL/NAIF short-baseline
1900–2100, the actual observed rate), **first-order L-L A_ii** (the
diagonal sum from §1.1), and the **model's value** (whose quantity TYPE
differs per planet — doc 109 §9: Mars = long-term mean, Mercury =
present-epoch rate, Jupiter/Saturn/Uranus = window-epoch values). All in
″/century; the 8H/N figures are J2000-evaluated (the divisor is the
scale-invariant quantity; the literal rate scales with H(t) at deep time
under [ESSRT](99-expanding-solar-system-resonance-theory.md)).

| Planet | WebGeoCalc observed | First-order A_ii | Model | Notes |
|--------|--------------------|-----------------|-----------------|-------|
| Mercury | ~570 | ~553 | 531 (H × 8/11) | L-L matches obs to ~3 % |
| Venus | ~0 | ~1,199 | −290 (−8H/6) | L-L fails catastrophically (low-e singularity) |
| Earth | ~<!--v:earthObservedRate-->6,186<!--/v--> | ~1,280 | 6,187 (H/16) | Model matches obs exactly; L-L gives inertial rate (different frame) |
| Mars | ~<!--v:marsObservedRate-->1,600<!--/v--> | ~1,776 | 1,739 (8H/36) | L-L over by ~11 %; model matches obs to ~9 % |
| Jupiter | ~<!--v:jupiterObservedRate-->1,800<!--/v--> | ~754 | 1,884 (8H/39) | L-L under by ~58 % (Jupiter–Saturn 5:2 coupling missing); model matches obs to ~5 % |
| Saturn | retrograde, magnitude window-sensitive (~−1,800 to −3,600) | +1,867 | −3,140 (−8H/65) | L-L has wrong sign; model sits within the observed window-spread |
| Uranus | ~<!--v:uranusObservedRate-->1,100<!--/v--> | ~278 | 1,160 (H/3) | L-L under by ~75 %; model matches obs to ~5 % |
| Neptune | ~200 | ~68 | 193 (2H) | L-L under by ~66 %; model matches obs to ~4 % |

First-order L-L is a reasonable approximation for Mercury and Mars but
fails significantly for every other planet — structural failures of
first-order theory (missing off-diagonal coupling, resonances, the frame
collapse of §1.5a), not implementation bugs. The model's rates match the
six determinable planets to 3–10 % (Venus's observed rate flips sign
across windows; Saturn's observed magnitude is window-sensitive); the
per-planet dominances follow the α·ᾱ weighting (Jupiter ~83 % of Mars's
rate; Venus ~52 % of Mercury's; Jupiter↔Saturn ~98 % of each other's
diagonal rate — and inner perturbers carry one less power of α, which is
why Earth out-contributes Saturn for Mars).

Mercury's Newtonian shortfall is the famous case: the L-L sum (~553) plus
higher-order Newtonian terms leaves the ~43 ″/cy that GR supplies —
historically the most celebrated mismatch in celestial mechanics, and the
subject of §1.8's projection analysis and transit test.

---

## Related Documents

- [10-fibonacci-laws.md](10-fibonacci-laws.md) — the six relations (Saturn's ecliptic-retrograde perihelion is covered under Law 6)
- [109-model-nbody-engine-and-lattice-test.md](109-model-nbody-engine-and-lattice-test.md) — the model's own N-body: audit, engine, frequencies, the lattice at its own quantity type, divisor restatement
- [56-webgeocalc-explorer.md](56-webgeocalc-explorer.md) — the observed-rate explorer this document's comparisons cite
- [41-scene-graph-hierarchy.md](41-scene-graph-hierarchy.md) — why Earth-frame measurements inherit the precession layers
- [99-expanding-solar-system-resonance-theory.md](99-expanding-solar-system-resonance-theory.md) — ESSRT: deep-time scaling of H(t)
