# 36 — Tilt, Inclination, and Eccentricity: Definitive Balance Calculations

This document records the complete relationship between axial tilt, inclination
to the invariable plane, and orbital eccentricity within the Fibonacci balance
framework. It explains how the perihelion distance is fixed, how tilt and
inclination oscillations produce a small eccentricity fluctuation, and how the
eccentricity balance is maintained at every epoch.

---

## 1. The Two Balance Laws

### Law 3 — Inclination Balance (Vector)

Each planet's inclination to the invariable plane oscillates:

    i(t) = i_mean + i_amplitude * cos(phase(t))

The balance weight is:

    L  = m * sqrt( a * (1 - e^2) )
    w  = L * i_amplitude / d

where m = planet mass / Sun mass, a = semi-major axis (AU), e = eccentricity,
d = Fibonacci d-value, and i_amplitude = PSI / (d * sqrt(m)).

**Vector balance**: the sum of L * i_amplitude vectors at their respective phase
angles (203.3195 deg or 23.3195 deg) should cancel.

### Law 5 — Eccentricity Balance (Scalar)

    v = sqrt(m) * a^(3/2) * e / sqrt(d)

**Scalar balance**: the sum of v for the 203 deg group must equal the sum of v for
the 23 deg group.

**Group assignment** (Config #3: Me=21, Ve=34, Ea=3, Ma=5, Ju=5, Sa=3, Ur=21, Ne=34):

| Group    | Planets                                               |
|----------|-------------------------------------------------------|
| 203 deg  | Mercury, Venus, Earth, Mars, Jupiter, Uranus, Neptune |
| 23 deg   | Saturn (sole member)                                  |

Saturn alone carries 50.0% of total Law 5 weight, making it the decisive planet.

---

## 2. Constants

| Symbol | Value                | Source                                      |
|--------|----------------------|---------------------------------------------|
| H      | 335008               | Holistic Year Length                         |
| PSI    | 2205 / (2H) = 0.003290966 | Inclination formula constant            |
| K      | 3.450537e-6          | Tilt-eccentricity constant (derived from Earth) |

PSI is defined in `tools/lib/constants.js` line 421.
K is derived in Section 4 below.

---

## 3. Fibonacci D-Values and Phase Groups (Config #3)

| Planet  | d  | Phase (deg) | Mirror Pair |
|---------|----|-------------|-------------|
| Mercury | 21 | 203.3195    | Uranus      |
| Venus   | 34 | 203.3195    | Neptune     |
| Earth   |  3 | 203.3195    | Saturn      |
| Mars    |  5 | 203.3195    | Jupiter     |
| Jupiter |  5 | 203.3195    | Mars        |
| Saturn  |  3 |  23.3195    | Earth       |
| Uranus  | 21 | 203.3195    | Mercury     |
| Neptune | 34 | 203.3195    | Venus       |

Mirror symmetry: Me-Ur (21), Ve-Ne (34), Ea-Sa (3), Ma-Ju (5).

---

## 4. The Tilt-Eccentricity Connection

### Inclination Amplitude Formula

    i_amplitude = PSI / (d * sqrt(m))

This determines how much a planet's inclination to the invariable plane oscillates.

### Eccentricity Amplitude Formula

The combined effect of axial tilt oscillation and inclination oscillation — which
operate at different periods — produces a real eccentricity fluctuation. The
amplitude of this fluctuation is:

    e_amplitude = K * sin(tilt_mean) * sqrt(d) / (sqrt(m) * a^(3/2))

where K = 3.450537e-6, derived from Earth:

    K = e_amp_Earth * sqrt(m_Earth) * a_Earth^(3/2) / (sin(tilt_Earth) * sqrt(d_Earth))
    K = 0.00137032 * sqrt(3.00352e-6) * 1.0 / (sin(23.41357 deg) * sqrt(3))
    K = 3.450537e-6

### Key Property: Law 5 Weight Change

When computing the Law 5 weight change from eccentricity oscillation:

    delta_v = sqrt(m) * a^(3/2) * e_amplitude / sqrt(d)
            = sqrt(m) * a^(3/2) * K * sin(tilt) * sqrt(d) / (sqrt(m) * a^(3/2) * sqrt(d))
            = K * sin(tilt)

**Mass and distance cancel completely.** The Law 5 weight change depends only on axial
tilt. This means planets with small tilts barely affect the balance regardless of their
mass or position.

---

## 5. Eccentricity Amplitudes from Tilt Formula

| Planet  | Tilt (deg) | e_amplitude   | % of J2000 ecc | Effect on balance |
|---------|------------|---------------|-----------------|-------------------|
| Mercury |   0.03     | 8.437e-5      | 0.041%          | Negligible        |
| Venus   |   2.6392   | 9.625e-4      | 14.204%         | Negligible (tiny v) |
| Earth   |  23.41357  | 1.370e-3      | 8.200%          | 0.05% of total    |
| Mars    |  25.19     | 3.074e-3      | 3.291%          | 0.14% of total    |
| Jupiter |   3.13     | 1.150e-6      | 0.002%          | Negligible        |
| Saturn  |  26.73     | 5.403e-6      | 0.010%          | Negligible        |
| Uranus  |  82.23     | 2.831e-5      | 0.060%          | Negligible        |
| Neptune |  28.32     | 8.098e-6      | 0.094%          | Negligible        |

### The Physical Mechanism: How Eccentricity Arises from Tilt and Inclination

The following chain describes what happens for each planet:

**Step 1 — Fixed orbital eccentricity (base value).**
Each planet's orbit has a fixed offset between its geometric center and the Sun.
For Earth this offset is eccentricityBase = 0.015372 AU. This base eccentricity
does not change over time. Only the direction of the perihelion precesses — the
perihelion point rotates around the Sun, but its distance remains the same.

**Step 2 — Mean axial tilt.**
Each planet has a mean axial obliquity. For Earth this is 23.41357 deg.

**Step 3 — Axial tilt oscillation.**
The axial tilt fluctuates over time with a period equal to the obliquity cycle.
The amplitude of this oscillation equals the inclination amplitude (see Step 4).
For Earth: amplitude = 0.635970 deg.

**Step 4 — Inclination oscillation.**
The inclination to the invariable plane fluctuates with a period equal to the
inclination precession cycle. The amplitude equals the axial tilt amplitude:
i_amplitude = PSI / (d * sqrt(m)). For Earth: amplitude = 0.635970 deg.

**Step 5 — Eccentricity fluctuation from combined effect.**
Because the axial tilt oscillation and the inclination oscillation operate at
DIFFERENT periods, their combined effect produces a real eccentricity fluctuation
at the planet's eccentricity cycle — the meeting frequency where axial precession
meets inclination precession. Each planet has its own eccentricity cycle (see
Section 10 and `docs/37-planets-precession-cycles.md`). For Earth the eccentricity
cycle is H/16 = 20,938 years, resulting in an amplitude of 0.00137032 AU.

**Step 6 — Eccentricity balance is maintained at every epoch.**
The mean perihelion distances (base eccentricities) achieve 100% Law 5 balance.
The fluctuations change each planet's real eccentricity slightly, but because
delta_v = K * sin(tilt) — with mass and distance cancelling — the balance is
preserved at every epoch. The dominant planets (Saturn, Jupiter, Uranus, Neptune
= 99.8% of total weight) have tiny eccentricity amplitudes (< 0.1% of mean),
so the balance barely moves.

### Balance Guard Summary

| Group          | Law 5 weight | Max ecc amplitude | Balance effect |
|----------------|-------------|-------------------|----------------|
| Outer giants   | 99.79%      | < 0.1% of mean    | Negligible     |
| Inner planets  |  0.21%      | up to 14% of mean | Negligible     |

Even in the worst case (all inner planets at maximum amplitude simultaneously),
the total Law 5 balance shifts by less than 0.05%.

---

## 6. Definitive Eccentricity Values

### Base Eccentricities

Every planet has a fixed base eccentricity — the static offset between the orbit
center and the Sun. All planets also fluctuate around this base value, with the
amplitude determined by their axial tilt (Section 4). Mercury's tilt is nearly
zero (0.03 deg), so its fluctuation is negligible. Earth and Mars have large tilts
and therefore the most significant eccentricity oscillations.

**Derivation of base eccentricities:**

- **Earth**: eccentricityBase = 0.015372 (tuned parameter in the model)
- **Saturn**: 0.05374486 (Law 5 prediction, locked as sole 23° group member)
- **Jupiter, Uranus**: Dual-balanced from Law 5 optimization
- **Venus, Mars**: Derived by fitting a cosine to JPL Horizons eccentricity
  data (originally fitted at H/16 period; to be re-fitted with per-planet eccentricity cycles).
  - Mars: JPL data (1700–2500, 10-year steps) fitted cosine gives amplitude
    3.059e-3, matching the tilt prediction (3.074e-3) to within 0.5%
    (ratio 1.00x, R² = 0.867). Fitted mean = 0.09297543.
  - Venus: JPL data (−9000 to +9000, 100-year steps) fitted cosine gives
    amplitude 1.084e-3 vs tilt prediction 9.625e-4 (ratio 1.13x).
    Fitted mean = 0.00619052.
  - Script: `tools/fit/python/planet_eccentricity_jpl.py`
- **Mercury**: JPL J2000 value (tilt = 0.03°, essentially no fluctuation)
- **Neptune**: Solved algebraically for exact 100% Law 5 balance

The following base eccentricities achieve 100.0000000000% Law 5 balance:

| Planet  | Base Ecc      | J2000 JPL     | Diff from JPL | Note                   |
|---------|---------------|---------------|---------------|------------------------|
| Mercury | 0.20563593    | 0.20563593    |  0.000%       | Tilt ~0, no fluctuation |
| Venus   | 0.00619052    | 0.00677672    | -8.650%       | Cosine fit to JPL data |
| Earth   | 0.01537200    | 0.01671022    | -8.008%       | eccentricityBase       |
| Mars    | 0.09297543    | 0.09339410    | -0.448%       | Cosine fit to JPL data |
| Jupiter | 0.04821478    | 0.04838624    | -0.354%       | Dual-balanced          |
| Saturn  | 0.05374486    | 0.05386179    | -0.217%       | Law 5 prediction       |
| Uranus  | 0.04734421    | 0.04725744    | +0.183%       | Dual-balanced          |
| Neptune | 0.00868571    | 0.00859048    | +1.109%       | Solved for 100% balance |

### Cosine Fit Validation

Note: the fits below were originally performed using the universal H/16 period.
With per-planet eccentricity cycles, the Mars and Venus fits should be re-run using
their respective periods (Mars: ~50,251 yr, Venus: ~14,056 yr). The
amplitudes are expected to remain similar since they depend on tilt, not period.

| Planet  | Fit Amp       | Tilt-Predicted Amp | Ratio | R²    |
|---------|---------------|--------------------|-------|-------|
| Mars    | 3.059e-3      | 3.074e-3           | 1.00x | 0.867 |
| Venus   | 1.084e-3      | 9.625e-4           | 1.13x | 0.074 |

Mars matches almost exactly. Venus has lower R² because 300 years of JPL data
covers a tiny fraction of the eccentricity cycle.

### J2000 Eccentricities (Model Prediction at Epoch J2000.0)

At J2000, each planet is at some phase of its eccentricity oscillation.
The JPL J2000 values represent the actual eccentricity at that epoch:

| Planet  | J2000 Model   | J2000 JPL     | Diff from JPL |
|---------|---------------|---------------|---------------|
| Mercury | 0.20563593    | 0.20563593    |  0.000%       |
| Venus   | 0.00677672    | 0.00677672    |  0.000%       |
| Earth   | 0.01671022    | 0.01671022    |  0.000%       |
| Mars    | 0.09339410    | 0.09339410    |  0.000%       |
| Jupiter | 0.04821478    | 0.04838624    | -0.354%       |
| Saturn  | 0.05374486    | 0.05386179    | -0.217%       |
| Uranus  | 0.04734421    | 0.04725744    | +0.183%       |
| Neptune | 0.00868571    | 0.00859048    | +1.109%       |

At J2000, Venus and Mars are above their base eccentricities (JPL trend shows
Venus decreasing and Mars increasing toward their respective bases). The outer
giants (Jupiter, Saturn, Uranus, Neptune) have tilt-derived amplitudes that are
negligible (< 0.001% of their base eccentricity), so their J2000 model values
are indistinguishable from their base values at the precision shown. The larger
J2000−base differences for the outer planets (~0.2–1.1%) come from
Laplace-Lagrange secular exchange, not the tilt mechanism (see Section 10).

### Law 5 Weight Contributions

| Planet  | % of total |
|---------|-----------|
| Saturn  |   50.00%  |
| Jupiter |   25.59%  |
| Uranus  |   18.52%  |
| Neptune |    5.69%  |
| Mars    |    0.14%  |
| Earth   |    0.05%  |
| Mercury |    0.01%  |
| Venus   |    0.00%  |

---

## 7. Definitive Inclination Values

### Inclination to the Invariable Plane

| Planet  | Mean Incl (deg) | Amplitude (deg) | J2000 Incl (deg) | Range (deg)      |
|---------|-----------------|------------------|-------------------|------------------|
| Mercury |  6.726620       | 0.384621         | 6.3472858         | 6.34 to 7.11    |
| Venus   |  2.207361       | 0.061866         | 2.1545441         | 2.15 to 2.27    |
| Earth   |  1.481179       | 0.635970         | (computed)        | 0.85 to 2.12    |
| Mars    |  2.649893       | 1.158626         | 1.6311858         | 1.49 to 3.81    |
| Jupiter |  0.329100       | 0.021301         | 0.3219652         | 0.31 to 0.35    |
| Saturn  |  0.931678       | 0.064879         | 0.9254704         | 0.87 to 1.00    |
| Uranus  |  1.000600       | 0.023716         | 0.9946692         | 0.98 to 1.02    |
| Neptune |  0.722190       | 0.013486         | 0.7354155         | 0.71 to 0.74    |

### Amplitude Derivation

Inclination amplitudes are derived from the PSI formula:

    i_amplitude = PSI / (d * sqrt(m))

| Planet  | d  | sqrt(m)        | PSI / (d * sqrt(m)) | Actual amplitude | Match |
|---------|-----|----------------|----------------------|------------------|-------|
| Mercury |  21 | 4.0744e-4      | 0.384621             | 0.384621         | Yes   |
| Venus   |  34 | 1.5646e-3      | 0.061866             | 0.061866         | Yes   |
| Earth   |   3 | 1.7331e-3      | 0.632976             | 0.635970         | ~0.5% |
| Mars    |   5 | 5.6808e-4      | 1.158626             | 1.158626         | Yes   |
| Jupiter |   5 | 3.0900e-2      | 0.021301             | 0.021301         | Yes   |
| Saturn  |   3 | 1.6908e-2      | 0.064879             | 0.064879         | Yes   |
| Uranus  |  21 | 6.6078e-3      | 0.023716             | 0.023716         | Yes   |
| Neptune |  34 | 7.1772e-3      | 0.013486             | 0.013486         | Yes   |

Earth shows a ~0.5% mismatch because its amplitude was independently tuned for IAU 2006
precession rate (0.635970), while the Fibonacci formula predicts 0.632976 (= 0.6329789
in the code comment). All other planets match exactly.

### Inclination Balance Result

| Check                          | Result       |
|--------------------------------|-------------|
| Law 3 vector balance (mean ecc) | 99.9919%    |
| Law 3 vector balance (J2000 ecc) | 99.9919%  |

The inclination balance is not a tuned result — it is a consequence of the
Fibonacci d-values, phase assignments, and PSI formula. The 0.008% residual
comes from the 1-e^2 terms in the angular momentum computation (which differ
per planet) and Earth's slightly adjusted amplitude.

---

## 8. Complete 6-Parameter Overview

For each planet, six parameters fully describe the orbital dynamics:

| # | Parameter            | Formula / Source                                | Physical meaning |
|---|----------------------|-------------------------------------------------|------------------|
| 1 | Mean tilt            | Axial obliquity (constant)                      | Base axial tilt  |
| 2 | Amplitude tilt       | = Amplitude inclination = PSI / (d * sqrt(m))   | Obliquity oscillation (Step 3) |
| 3 | Mean eccentricity    | Fixed perihelion distance, dual-balanced Law 5   | Base perihelion distance (Step 1) |
| 4 | Amplitude ecc        | K * sin(tilt) * sqrt(d) / (sqrt(m) * a^1.5)     | Tilt+inclination combined effect (Step 5) |
| 5 | Mean inclination     | Invariable plane mean (from Fibonacci balance)   | Orbital plane orientation |
| 6 | Amplitude inclination| = Amplitude tilt = PSI / (d * sqrt(m))           | Inclination oscillation (Step 4) |

### Full Table

| Planet  | 1. Tilt    | 2. Amp Tilt | 3. Mean Ecc  | 4. Amp Ecc    | 5. Mean Incl | 6. Amp Incl |
|---------|------------|-------------|---------------|---------------|--------------|-------------|
| Mercury |   0.03     | 0.384621    | 0.20563593    | 8.437e-5      |  6.726620    | 0.384621    |
| Venus   |   2.6392   | 0.061866    | 0.00619052    | 9.625e-4      |  2.207361    | 0.061866    |
| Earth   |  23.41357  | 0.635970    | 0.01537200    | 1.370e-3      |  1.481179    | 0.635970    |
| Mars    |  25.19     | 1.158626    | 0.09297543    | 3.074e-3      |  2.649893    | 1.158626    |
| Jupiter |   3.13     | 0.021301    | 0.04821478    | 1.150e-6      |  0.329100    | 0.021301    |
| Saturn  |  26.73     | 0.064879    | 0.05374486    | 5.403e-6      |  0.931678    | 0.064879    |
| Uranus  |  82.23     | 0.023716    | 0.04734421    | 2.831e-5      |  1.000600    | 0.023716    |
| Neptune |  28.32     | 0.013486    | 0.00868571    | 8.098e-6      |  0.722190    | 0.013486    |

Note: Columns 2 and 6 are identical — the amplitude of axial tilt oscillation IS the
amplitude of inclination oscillation, both derived from PSI / (d * sqrt(m)).

**Earth's amplitude: mean vs instantaneous.**
The ψ formula gives the **mean amplitude over the full H cycle**: 0.632469°.
This is the structural value that achieves 100% Law 3 inclination balance.
However, the IAU obliquity rate at J2000 (-46.836769"/cy) constrains the
**instantaneous amplitude** to 0.636055° — a 0.57% difference (12.9 arcsec).

This is not an exception but a predictable phase effect. The instantaneous
amplitude depends on where J2000 falls in the H/3 and H/8 cycles:

```
A(J2000) = IAU_rate / [360000 × (2π·sin(φ₃)/(H/3) − 2π·sin(φ₈)/(H/8))]
```

where φ₃ = 2π × (J2000 − balancedYear) / (H/3) and
      φ₈ = 2π × (J2000 − balancedYear) / (H/8).

At J2000, the phases are φ₃ = 261.2° and φ₈ = 96.5°, both near their
maximum rate positions (sin ≈ ±1), making the instantaneous amplitude
slightly larger than the mean. At other epochs the instantaneous amplitude
varies, but averages to the ψ-predicted value over the full cycle.

---

## 9. Perihelion Precession Periods

Each planet's perihelion **direction** (the angle of closest approach) precesses
at its own rate. The perihelion **distance** (base eccentricity) is static —
only the angle moves.

Note: these periods describe the rotation of the perihelion direction around the
orbit. The eccentricity **magnitude** oscillation is a separate phenomenon that
occurs at each planet's eccentricity cycle (see Section 10).

| Planet  | Period (years)      | Fibonacci Expression | Direction  |
|---------|---------------------|----------------------|------------|
| Mercury | 242,915             | H / (1 + 3/8)       | Prograde   |
| Venus   | 670,016             | H * 2                | Prograde   |
| Earth   |  20,938             | H / 16               | Prograde   |
| Mars    |  77,310             | H / (4 + 1/3)       | Prograde   |
| Jupiter |  67,002             | H / 5                | Prograde   |
| Saturn  | -41,876             | -H / 8               | Retrograde |
| Uranus  | 111,669             | H / 3                | Prograde   |
| Neptune | 670,016             | H * 2                | Prograde   |

---

## 10. Predictive Eccentricity Formula

Each planet's eccentricity oscillates around its base value at its own wobble
period (the meeting frequency of axial precession and perihelion ICRF precession):

    e₀ = √(e_base² + e_amp²)           (derived mean)
    θ  = 360° × (t − t_ref) / T_wobble (phase angle)
    e(t) = e₀ + (−e_amp − (e₀ − e_base) × cos θ) × cos θ

At θ = 0°: e = e_base − e_amp (minimum). At θ = 180°: e = e_base + e_amp (maximum).
At θ = 90°/270°: e ≈ e_base (near mean). This is a second-order cosine that is
slightly asymmetric around the base value due to the geometric derivation.

Parameters:
- `e_base` = fixed perihelion-distance eccentricity (Section 6)
- `e_amp` = K × sin(tilt) × √d / (√m × a^(3/2)) (Section 4)
- `T_ecc` = per-planet eccentricity cycle from `calcWobblePeriod()` (see doc 37)
- `t_ref` = 2000 − (φ_J2000 / 360) × T_ecc — reference year anchored to J2000 phase

In code: `computeEccentricityEarth(t, t_ref, T_ecc, e_base, e_amp)` in `src/script.js`.

### Oscillation Period: Per-Planet Eccentricity Cycle

Each planet oscillates at its own eccentricity cycle — the meeting frequency of its
axial precession and perihelion ICRF precession. The eccentricity cycle is computed
by `calcWobblePeriod(perihelionEclipticYears, axialPrecessionYears)` in
`src/script.js`. For Earth, this gives H/16 = 20,938 years. Other planets have
different eccentricity cycles (see `docs/37-planets-precession-cycles.md` for the
full derivation and values).

### Phase Angles

Since each planet oscillates at its own eccentricity cycle, the mirror-pair 180°
offset rule no longer applies. The inner planet phases (Mercury, Venus, Mars)
are derived analytically from JPL J2000 eccentricity data using the per-planet
eccentricity cycle. The outer planet phases (Jupiter, Saturn, Uranus, Neptune) have
negligible eccentricity amplitudes (< 0.01% of base), so their phase angles
have minimal effect on the dynamic balance.

Phase angles are stored as `<planet>EccentricityPhaseJ2000` in `src/script.js`.

### Earth Phase: ω + 90°

Earth's eccentricity phase relates to its longitude of perihelion:

    φ_Earth = ω + 90° = 102.947° + 90.000° ≈ 192.95°

This anchors Earth's phase to an observable orbital parameter. The exact
analytical solution gives 193.0129° ≈ ω + 90.07° (0.002% match).

### Inner Planets: Tilt-Driven Regime

The phase offset φ₀ is determined from the J2000 observed eccentricity using
the `computeEccentricityEarth` function:

| Planet  | φ_J2000  | e_min      | e_max      | Note |
|---------|----------|------------|------------|------|
| Mercury |  89.99°  | 0.20555156 | 0.20572030 | Tilt ~0, essentially constant |
| Venus   | 123.75°  | 0.00522798 | 0.00715306 | Past mean, decreasing |
| Earth   | 192.95°  | 0.01400168 | 0.01674232 | ω + 90°, near maximum at J2000 |
| Mars    |  96.89°  | 0.08990179 | 0.09604907 | Just past mean |

The predictive formula works for these planets because the tilt mechanism is
the dominant source of eccentricity variation over each planet's eccentricity cycle.

### Outer Planets: Laplace-Lagrange Regime

For the outer planets, the tilt-derived amplitude is orders of magnitude too
small to account for the J2000−base difference:

| Planet  | e_J2000 − e_base | e_amplitude | cos(φ)  | Factor too small |
|---------|------------------|-------------|---------|------------------|
| Jupiter | +1.71e-4         | 1.150e-6    |   149×  | 149×             |
| Saturn  | +1.17e-4         | 5.403e-6    |  21.7×  |  22×             |
| Uranus  | −8.68e-5         | 2.831e-5    |  −3.07  |   3×             |
| Neptune | −9.52e-5         | 8.098e-6    | −11.8×  |  12×             |

Since cos(φ) must be between −1 and +1, these results confirm that the tilt
mechanism is **not** the dominant driver of eccentricity variation for the giant
planets. Instead, their J2000−base differences come from **Laplace-Lagrange
secular eigenmode exchange** — long-period gravitational coupling between the
giants that redistributes eccentricity among them as a coupled system.

The tilt-derived amplitudes (~10⁻⁶ to 10⁻⁵) are still physically real — they
represent the tilt-coupled component — but they are negligible compared to the
secular exchange (~10⁻⁴). The outer planet phases are set to the value that
places the dynamic eccentricity closest to the JPL J2000 observed value:
180° when J2000 > base (maximum eccentricity) and 0° when J2000 < base
(minimum eccentricity). This maximizes the dynamic eccentricity balance at
J2000 (99.9845%) while the amplitude remains negligible.

### Phase Constants (J2000)

| Planet  | φ_J2000 (°) | Source |
|---------|-------------|--------|
| Mercury |   89.9882   | Analytical from J2000 constraint |
| Venus   |  123.7514   | Analytical from J2000 constraint |
| Earth   |  192.9471   | ω + 90° = 102.947° + 90° |
| Mars    |   96.8878   | Analytical from J2000 constraint |
| Jupiter |  180        | 180° = max ecc, closest to J2000 (amp 1.15e-6, negligible) |
| Saturn  |  180        | 180° = max ecc, closest to J2000 (amp 5.40e-6, negligible) |
| Uranus  |    0        | 0° = min ecc, closest to J2000 (amp 2.83e-5, negligible) |
| Neptune |    0        | 0° = min ecc, closest to J2000 (amp 8.10e-6, negligible) |

### Other Constants

| Symbol | Value | Source |
|--------|-------|--------|
| K | 3.4505372893e-6 | `eccentricityAmplitudeK` in constants.js |
| T_wobble (Earth) | 20,938 years | `perihelionCycleLength` in script.js |
| T_wobble (per planet) | Varies | `calcWobblePeriod()` in script.js, see doc 37 |
| e_amplitude per planet | See Section 5 table | `orbitalEccentricityAmplitude` in constants.js |
| axial tilt per planet | See Section 8 table | `axialTiltMean` in constants.js |

---

## 11. Balance Summary

| Balance Check                    | Result              |
|----------------------------------|---------------------|
| Law 5 base eccentricities        | 100.0000%           |
| Law 5 J2000 eccentricities       | 99.8913%            |
| Law 3 inclination balance         | 99.9999%            |

The Law 5 eccentricity balance is exact by construction (Neptune solved for balance).
The Law 3 inclination balance emerges naturally from the Fibonacci framework at 99.9999%.

### Why the Balance Holds at All Epochs

The balance is maintained at every epoch because of the mechanism described in
Section 5: the base perihelion distances are fixed and perfectly balanced. The
eccentricity fluctuation from the tilt/inclination interaction changes each
planet's real eccentricity slightly, but the Law 5 weight change is
delta_v = K * sin(tilt) — mass and distance cancel. Since the dominant planets
(99.8% of weight) have tiny tilts or tiny amplitudes relative to their mean
eccentricity, the balance barely shifts.

In summary: the mean perihelion distances produce 100% eccentricity balance,
and the tilt-driven fluctuations preserve that balance at every epoch because
their effect on Law 5 weights is negligible for the dominant planets.

---

## 12. Code References

| Constant / Section                    | File                        | Line(s)     |
|---------------------------------------|-----------------------------|-------------|
| eccentricityBase (Earth mean)         | src/script.js               | 46          |
| eccentricityAmplitude (Earth)         | src/script.js               | 47          |
| Planet eccentricities (dual-balanced) | src/script.js               | 133-244     |
| Inclination mean/amplitude            | src/script.js               | 393-424     |
| BALANCE_CONFIG                        | src/script.js               | 11657-11770 |
| Law 5 formula                         | src/script.js               | 11865-11877 |
| Law 3 formula                         | src/script.js               | 11845-11863 |
| PSI constant                          | tools/lib/constants.js      | 421         |
| Mass fractions                        | tools/lib/constants.js      | 407-418     |
| eccentricityAmplitudeK (K)           | tools/lib/constants.js      | 66          |
| orbitalEccentricityAmplitude (per planet) | tools/lib/constants.js  |             |
| axialTiltMean (per planet)           | tools/lib/constants.js      |             |
| Balance search script                 | tools/verify/balance-search.js |          |
| Eccentricity balance script           | tools/verify/eccentricity-balance.js |    |
| JPL eccentricity cosine fit          | tools/fit/python/planet_eccentricity_jpl.py | |
| JPL eccentricity cache               | data/planet_eccentricity_cache.json | |

---

## 13. Verification Scripts

Run `node tools/verify/eccentricity-balance.js` to verify Law 5 balance with current
dual-balanced eccentricities.

Run `node tools/verify/balance-search.js` to perform exhaustive balance search across
all Fibonacci d-value combinations.
