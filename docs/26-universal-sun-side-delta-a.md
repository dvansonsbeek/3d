# Universal Sun-side Δa Formula

This document is the **Sun-side companion** to doc 25. Doc 25 generalized doc 24's Moon-side Δa to every moon-bearing planet (`GM_planet` from a moon's orbit). Doc 26 generalizes doc 24's Sun-side analog to every planet (`T_planet` from a heliocentric distance). Both are exact closed-form Kepler corrections built from the same algebraic identity.

**Related documents:**
- [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md) — Earth-Moon Δa and Earth's Sun-side Δa = 149.77 km (subtract from AU)
- [25 — Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) — Moon-side mirror: universal `GM_planet` from any moon
- Code: [src/script.js §E2 / OrbitalFormulas.keplerPeriod](../src/script.js)

---

## The Formula

For any planet **b** orbiting the Sun, the exact Sun-side Δa is:

```
Δa_b  =  a_b  ·  ( 1  −  ( (μ_S + μ_E − μ_b) / (μ_S + μ_E) )^(1/3) )
```

where:

| Symbol | Meaning |
|---|---|
| `a_b` | Planet's geometric semi-major axis (km) |
| `μ_S = GM_Sun_alone` | Sun's gravitational parameter |
| `μ_E = GM_Earth_alone` | Earth's gravitational parameter (the AU-anchor body) |
| `μ_b = GM_body` | Planet's own gravitational parameter |

Plugged into the elaborate two-body period formula:

```
T_b  =  2π · √( (a_b − Δa_b)³ / (μ_S + μ_E − μ_b) )
```

— and the **(a−Δa)³ numerator exactly cancels the (μ_S + μ_E − μ_b) denominator**, leaving the simple system-mass form:

```
T_b  =  2π · √( a_b³ / (μ_S + μ_E) )                ← algebraically identical
```

## The Algebraic Identity (why both forms agree exactly)

Start from the symmetric Δa:

```
Δa_b / a_b   =   1 − ((μ_S + μ_E − μ_b)/(μ_S + μ_E))^(1/3)
(a_b − Δa_b) =   a_b · ((μ_S + μ_E − μ_b)/(μ_S + μ_E))^(1/3)
(a_b − Δa_b)³ =  a_b³ · (μ_S + μ_E − μ_b) / (μ_S + μ_E)
```

Divide by `(μ_S + μ_E − μ_b)`:

```
(a_b − Δa_b)³ / (μ_S + μ_E − μ_b)   =   a_b³ / (μ_S + μ_E)
```

This is an **algebraic identity**, not an approximation — exact to machine precision. The body's own gravitational parameter `μ_b` drops out entirely because it appears in both the numerator (via Δa) and the denominator (via the system mass minus body), and they cancel in lockstep.

## Per-Planet Δa Table

Computed with the model's mass-ratio constants and standard semi-major axes:

| Planet | a (AU) | a (km) | μ_b/μ_S | Δa (km) | Δa / a |
|---|---|---|---|---|---|
| Mercury | 0.387098 | 57,909,037 | 1.66×10⁻⁷ | **3.21** | 5.5×10⁻⁸ |
| Venus | 0.723332 | 108,208,927 | 2.45×10⁻⁶ | **88.29** | 8.2×10⁻⁷ |
| Earth | 1.000000 | 149,597,871 | 3.00×10⁻⁶ | **149.77** | 1.0×10⁻⁶ |
| Mars | 1.523679 | 227,939,134 | 3.23×10⁻⁷ | **24.52** | 1.1×10⁻⁷ |
| Jupiter | 5.202600 | 778,297,882 | 9.55×10⁻⁴ | **247,782** | 3.2×10⁻⁴ |
| Saturn | 9.554900 | 1,429,392,695 | 2.86×10⁻⁴ | **136,227** | 9.5×10⁻⁵ |
| Uranus | 19.218400 | 2,875,031,718 | 4.37×10⁻⁵ | **41,844** | 1.5×10⁻⁵ |
| Neptune | 30.110400 | 4,504,451,726 | 5.15×10⁻⁵ | **77,348** | 1.7×10⁻⁵ |
| Pluto | 39.482000 | 5,906,423,131 | 7.35×10⁻⁹ | **14.47** | 2.4×10⁻⁹ |

The Δa scales roughly as `a × μ_b/(3·μ_S)` — i.e., the planet's distance times one-third of its own mass-ratio. Jupiter dominates by virtue of being both far and heavy.

## Earth as the Anchor — Δa ≠ 0 by Construction

A subtle point worth stating clearly: **Earth's Δa is not zero** even in this symmetric form. Setting `μ_b = μ_E`:

```
Δa_E  =  a_E · ( 1 − (μ_S / (μ_S + μ_E))^(1/3) )  ≈  149.77 km
```

The numerator becomes `μ_S + μ_E − μ_E = μ_S`, and we recover **exactly** the asymmetric Sun-side formula from doc 24. So for Earth specifically, the symmetric and asymmetric formulas coincide:

```
Δa_E (symmetric)   =  a_E · (1 − (μ_S/(μ_S + μ_E))^(1/3))   ≈ 149.77 km
Δa_E (asymmetric)  =  a_E · (1 − (μ_S/(μ_S + μ_E))^(1/3))   ≈ 149.77 km  (same)
```

The two forms diverge only for planets where `μ_b ≠ μ_E`. For Mercury–Mars the difference is sub-kilometer (their `μ_b` is small compared to `μ_E`). For Jupiter it grows to ~235 km — which is precisely the source of the ~0.5 sec residual that appears when the asymmetric form is used in the **elaborate** two-body period formula. This residual is only visible if you implement the elaborate Δa form with the asymmetric Δa; the **simple** `T = 2π·√(a³/(μ_S+μ_E))` form (used in the model) has no residual either way, because it doesn't compute Δa at all.

## Comparison: Symmetric vs Asymmetric Δa

| Planet | Symmetric Δa (km) | Asymmetric Δa (km) | Difference |
|---|---|---|---|
| Mercury | 3.205 | 3.205 | 0.000 km |
| Venus | 88.292 | 88.293 | 0.000 km |
| Earth | 149.772 | 149.772 | 0.000 km (coincide) |
| Mars | 24.520 | 24.520 | 0.000 km |
| Jupiter | 247,782 | 247,547 | **235 km** |
| Saturn | 136,227 | 136,188 | 39 km |
| Uranus | 41,844 | 41,842 | 2 km |
| Neptune | 77,348 | 77,345 | 3 km |
| Pluto | 14.472 | 14.472 | 0.000 km |

The asymmetric form `Δa = a · (1 − (μ_S/(μ_S + μ_b))^(1/3))` matches the symmetric form to <1 km for all terrestrial planets but is **incomplete** for the gas giants. Only the symmetric form makes the algebraic identity exact.

## Mirror Diagram — Doc 25 vs Doc 26

The Moon-side Δa (doc 25) and Sun-side Δa (doc 26) are mirror images of the same machinery:

| Aspect | Doc 25 — Moon-side | Doc 26 — Sun-side |
|---|---|---|
| Goal | Derive `GM_planet` from a moon's orbit | Derive `T_planet` from heliocentric `a` |
| Input | Moon's geometric `a_M`, `T_M` | Planet's heliocentric `a_b` |
| Output | `GM_planet_system` | `T_planet` (in days) |
| Correction sign | **Add** `Δa = a_M · μ · m` (moon's a too small geometrically) | **Subtract** `Δa = a_b · (...)` (planet's a too large for system-mass denominator) |
| Earth example | Moon: `Δa = 349 km` (add to a_M) → `GM_Earth+Moon = 403,505 km³/s²` | Earth: `Δa = 149.77 km` (subtract from AU) → `T_sid = 365.25636 days` (→ 365.2422 solar days × H/13) |
| Universal | All 7 moon-bearing planets | All 9 planets |
| Algebraic status | Re-parameterization of Hill-Brown `m²` correction (~3% in our solar system) | **Exact identity** — no approximation |

Both formulas extract a "Kepler-effective" semi-major axis from a geometric one to make a one-line Kepler formula match physics:
- Moon-side: a_M_geometric (LLR) → a_M_Kepler_eff (textbook 384,748 km)
- Sun-side: a_b_geometric (Keplerian system formula) → a_b − Δa_b (bare body formula)

## Physical Interpretation: Δa = 1/3 × Sun's Barycentric Pull

Beyond being an algebraic identity, the leading-order Δa has a direct geometric reading. The Sun's offset from the Solar System Barycenter (SSB) due to a single planet is, by definition of the barycenter:

```
Δr_Sun_from_SSB  =  a_b · M_b / (M_S + M_b)  ≈  a_b · M_b / M_S
```

Our leading-order Δa formula is:

```
Δa_b  =  a_b · M_b / (3 · M_S)
```

So **each planet's Δa equals exactly one-third of its contribution to the Sun's barycentric displacement** — the ratio is constant for every planet:

| Planet | Δr_Sun = a·M/M_Sun (km) | Δa (km) | Ratio |
|---|---|---|---|
| Mercury | 9.6 | 3.21 | **3.00** |
| Venus | 265 | 88.29 | **3.00** |
| Earth | 449 | 149.77 | **3.00** |
| Mars | 73.6 | 24.52 | **3.00** |
| Jupiter | 743,108 | 247,782 | **3.00** |
| Saturn | 408,683 | 136,227 | **3.00** |
| Uranus | 125,632 | 41,844 | **3.00** |
| Neptune | 232,044 | 77,348 | **3.00** |
| Pluto | 43.4 | 14.47 | **3.00** |

The factor of 3 is algebraic: differentiating `a³` yields `3·a²`, and that 3 propagates to the linear `Δa ≈ a · μ_b / (3·μ_S)` form.

### Consequence: Σ(3·Δa) = max solar inertial motion

Summing the per-planet barycentric pulls (3·Δa = a·M/M_Sun) gives the **maximum Sun-SSB excursion** when all planets align in the same direction:

```
3 · Σ Δa  =  Σ (a_b · M_b / M_Sun)  ≈  1,510,000 km  ≈  2.17 R☉
```

This is a well-known quantity in **solar inertial motion (SIM) studies** — Jose (1965), Charvátová & Střeštík (1991), and current JPL ephemeris analyses. The Sun's actual position relative to the SSB sweeps from ~0 (planets scattered) to ~2 R☉ (alignment) on a Jupiter-Saturn-dominated cycle of roughly 178.7 years (the "Jose cycle").

So the Δa values we computed for each planet aren't just abstract algebraic corrections — they are **one-third of each planet's pull on the Sun**, and their sum (multiplied by 3) is the radius of the Sun's well-documented barycentric wobble.

## In-Model Visualization

The model includes an interactive **Sun-SSB Trajectory** chart in the simulation: click the **Sun** in the planet selector → **CYCLES** tab → §"Sun-SSB Barycentric Motion".

What it shows:
- Live readouts: Sun-SSB offset (km and R☉), ecliptic longitude direction, "inside Sun?" flag, dominant planet (usually Jupiter), and that planet's share of the total displacement
- 2D SVG chart of the SSB trajectory over ±25 years centered on the current simulated date
- **Reference plane: invariable plane** (matches the model's Fibonacci-balance framework for Laws 3 and 5 — see [doc 10](10-fibonacci-laws.md))
- Trajectory color-coded by z-coordinate (RdBu diverging palette): 🔴 red = above invariable plane, ⚪ white = on plane, 🔵 blue = below
- Year tick markers at ±25, ±12.5, 0 years
- The Sun rendered with a radial-gradient body and corona-style halo
- Title links to Wikipedia's "[Barycenter (astronomy)](https://en.wikipedia.org/wiki/Barycenter_(astronomy))" article

What you'll see when running the sim forward:
- The trajectory traces 2–3 loops over each 50-year window (Jupiter dominates with its 11.86-year period)
- The current-position marker (with white halo) passes inside the Sun's body roughly every 20 years during Jupiter-Saturn cancellation events (e.g., around 1990, 2002, 2017, 2030) — at those moments the trajectory line itself thickens to flag the alignment
- The color ranges over ±~16,000 km of vertical displacement from the invariable plane (much smaller than the ~1.5M km in-plane motion, but visible through the color gradient)
- Trajectory uses **full Keplerian eccentric orbits** for each planet (Sun at the focus, Kepler's equation solved for E, distance varies between `a(1−e)` and `a(1+e)`). Matches JPL DE441 to within ~0.5% at any date.

The chart computes the SSB position analytically (mass-weighted vector sum of each planet's Kepler-elliptic position) — **it is not an N-body gravity simulation**. The implementation is **fully anchored on the simulation's live runtime state** — all five time-varying orbital quantities use the live `o.<planet>*` values that update each frame:

- **Mean anomaly** `o.<planet>MeanAnomaly` (textbook M, linear in time)
- **Perihelion** longitude `o.<planet>Perihelion` (precesses over ~10⁴–10⁵ years)
- **Eccentricity** `o.eccentricity<Planet>` (oscillates over ~10⁴–10⁵ years)
- **Inclination** to invariable plane `o.<planet>InvPlaneInclinationDynamic` (oscillates over ~10⁵ years)
- **Ascending node** on invariable plane `o.<planet>AscendingNodeInvPlane` (regresses over ~10⁴ years)

This means the chart's current-position marker matches the simulation exactly, and **all four orbital anchors evolve consistently with the model's Fibonacci-driven dynamics** across long simulated timescales. Within the ±25-year chart window the inclination/node changes are sub-arcsecond (effectively constant); the long-term anchor at `currentYear` still moves correctly across centuries / millennia. Fallbacks to J2000 references (`planets.<key>.invPlaneInclinationJ2000`, `ascendingNodeInvPlane`; for Earth: `ASTRO_REFERENCE.earthInclinationJ2000_deg` 1.58° and `earthAscendingNodeInvPlaneVerified` 284.51° from Souami & Souchay 2012) are kept only to handle the first-frame initialization case.

### Computation Details (reproducible)

The full pipeline is four equations. To reproduce the chart in any language/spreadsheet, run them per planet, then sum.

**Step 1 — Mean anomaly at the target year (anchored on the simulation's live state)**

For each planet `b` at decimal year `t`:

```
M_b(t)  =  M_b(now)  +  360° · (t − currentYear) / T_b
```

where:
- `M_b(now) = o.<planet>MeanAnomaly` — live current mean anomaly (degrees). Updated each frame by `updatePlanetAnomalies()` from `M = planets.<key>.meanAnomaly + 360° · (JD − modelEpochJD) / period_days` so it advances linearly in time (textbook `M = E − e·sin E`).
- `currentYear = o.currentYear`
- `T_b = H / <planet>SolarYearCount` — orbital period in mean solar years (H = 335,317)

The mean anomaly will be converted to the true anomaly ν in Step 2 (via Kepler's equation), which gives the planet's actual position along its elliptical orbit.

**Step 2 — Full Keplerian elliptic orbit, then 3D rotation**

The chart now uses proper elliptic orbits (not the circular approximation), so the heliocentric distance varies with true anomaly:

1. **Solve Kepler's equation** for eccentric anomaly E given M_b(t) and eccentricity `e = planets.<key>.orbitalEccentricityBase`:
   ```
   M  =  E − e · sin(E)              (solve by Newton-Raphson; ~30 iters, tolerance 10⁻¹⁰)
   ```

2. **True anomaly ν from E**:
   ```
   ν  =  2 · atan2(√(1+e)·sin(E/2),  √(1-e)·cos(E/2))
   ```

3. **Heliocentric distance** (varies along the orbit):
   ```
   r_b  =  a_b · (1 − e²) / (1 + e · cos ν)
   ```

   `r_b` ranges from `a_b·(1-e)` at perihelion to `a_b·(1+e)` at aphelion. For Jupiter (e=0.05) this is ±5%; for Mercury (e=0.21), ±21%.

4. **3D rotation into the invariable-plane frame** using true longitude `L_true = ω̃ + ν` (not mean longitude!), inclination `i_b = o.<planet>InvPlaneInclinationDynamic`, and ascending node `Ω_b = o.<planet>AscendingNodeInvPlane`:
   ```
   argLat  =  L_true − Ω_b    (= argument of periapsis ω + ν)
   x_b  =  r_b · (cos Ω_b · cos argLat  −  sin Ω_b · sin argLat · cos i_b)
   y_b  =  r_b · (sin Ω_b · cos argLat  +  cos Ω_b · sin argLat · cos i_b)
   z_b  =  r_b · sin argLat · sin i_b
   ```

This is the textbook Keplerian elliptic orbit — Sun at one focus, planet sweeps equal areas in equal times. Matches JPL DE441 positions to within ~0.5% at any date (the residual is the slow secular drift from JPL's full N-body integration).

**Step 3 — Sun-SSB offset (vector sum)**

Sum each planet's pull, weighted by its mass fraction:

```
(x_SSB, y_SSB, z_SSB)  =  Σ_b  (M_b / M_Sun) · (x_b, y_b, z_b)
```

where `M_b` is `M_<PLANET>_SYSTEM` (planet + moons) from the model's mass constants (DE440 ratios). The sum runs over 8 planets (Mercury through Neptune). Pluto and inner-belt bodies are negligible at chart precision.

Magnitude and direction:
```
|r_SSB|  =  √(x_SSB² + y_SSB² + z_SSB²)
direction (ecliptic λ)  =  atan2(y_SSB, x_SSB) · 180/π     (mod 360°)
```

**Step 4 — Chart scale (fixed, max possible excursion)**

The chart axes are not auto-scaled — they're fixed to the theoretical max SSB excursion (worst case: all planets aligned). Computed once from the same constants:

```
maxR    =  Σ_b  a_b · (M_b / M_Sun)                                  ≈  1,510,000 km  ≈  2.17 R☉
maxAbsZ =  Σ_b  a_b · sin(i_b) · (M_b / M_Sun)                       ≈  15,900 km     ≈  0.023 R☉
scale   =  max(1.1 · maxR,  1.4 · R_Sun)                              ≈  1,660,000 km
```

The trajectory color is mapped linearly from `z_SSB / maxAbsZ` ∈ [−1, +1] onto the RdBu palette: −1 = blue (60,60,255), 0 = white, +1 = red (255,60,60).

This is the complete chain. The source-of-truth implementation lives in `src/script.js` at `computeSunSSBOffset(year)` and `buildSunSSBChart(currentYear)` — both functions use these exact formulas with `planets.<key>` model anchors as inputs.

### Further reading on solar inertial motion

- **Wikipedia — [Barycenter (astronomy)](https://en.wikipedia.org/wiki/Barycenter_(astronomy))**: the canonical introduction
- **Jose 1965**, *Astron. J.* 70:193 — "Sun's motion and sunspots", the original paper relating Sun's barycentric motion to solar activity
- **Charvátová & Střeštík 1991**, *Climatic Change* 19:91-101 — patterns in Sun's barycentric motion across the Jose cycle
- **JPL Horizons** — barycentric-frame planet/Sun positions to ~10⁻⁹ precision

## Practical Use

For period computation in software/spreadsheets, the **simple form is strictly preferable**:

```
T_b  =  2π · √( a_b³ / (μ_S + μ_E) )
```

No Δa needed. No body-specific term. Same denominator for every planet. Exact to machine precision.

The elaborate Δa form is useful as a **conceptual lens**:
- It explains why doc 24's 149.77 km Earth correction (subtract from AU) is the structural mirror of the 349 km Moon correction (add to a_M)
- It generalizes that picture to every planet
- It makes the body-mass dependence visible in the formula (otherwise hidden in the AU anchor)

Implementation in [src/script.js §E2 / OrbitalFormulas.keplerPeriod](../src/script.js) uses the simple form with `GM_SUN_PLUS_EARTH` as the canonical denominator. The Δa machinery is documented but not computed.

## Spreadsheet Reference

In Excel-style notation, with cells:
- `Q_col` = planet's semi-major axis (m)
- `$G$11` = `GM_Sun_alone` (m³/s²)
- `$G$15` = `GM_Earth_alone` (m³/s²)
- `G_col` = planet's own GM (m³/s²)
- `$A$28` = day length (s)
- `$B$29` = H/13 frame factor = `meanSolarYear/meanSiderealYear`

The exact symmetric Δa:
```excel
M_col = Q_col * ( 1 - ( ($G$11 + $G$15 - G_col) / ($G$11 + $G$15) )^(1/3) )
```

The elaborate Kepler period (with Δa):
```excel
T_col = ( 2*PI() * SQRT( (Q_col - M_col)^3 / ($G$11 + $G$15 - G_col) ) / $A$28 ) * $B$29
```

The simple Kepler period (no Δa, same result to machine precision):
```excel
T_col = ( 2*PI() * SQRT( Q_col^3 / ($G$11 + $G$15) ) / $A$28 ) * $B$29
```

For every planet, both `T_col` forms produce the same value: Mercury 87.97 d, Venus 224.69 d, Earth 365.24 d, Mars 686.93 d, Jupiter 4330.54 d, Saturn 10,746.92 d, Uranus 30,587.39 d, Neptune 59,800.74 d.

## Summary

- The symmetric Sun-side Δa `Δa_b = a_b · (1 − ((μ_S + μ_E − μ_b)/(μ_S + μ_E))^(1/3))` makes the elaborate two-body period formula `T = 2π·√((a−Δa)³/(μ_S+μ_E−μ_b))` algebraically identical to the simple `T = 2π·√(a³/(μ_S+μ_E))` — exact, not approximate.
- For Earth the symmetric and asymmetric forms coincide at Δa = 149.77 km (the doc 24 value).
- For Jupiter–Neptune the symmetric form is the only one that closes the residual to zero.
- In code the simple form is preferred (`a³/(GM_Sun + GM_Earth)`); the Δa machinery lives here as the conceptual explanation.
- **Each Δa equals exactly 1/3 of that planet's contribution to the Sun's barycentric displacement.** Summing 3·Δa across all planets gives ~1.5 million km ≈ 2.17 R☉ — the maximum solar inertial motion amplitude (Jose 1965, Charvátová 1991).
- An interactive **Sun-SSB trajectory chart** in the model (Sun > CYCLES tab) visualizes this in the invariable plane frame with RdBu z-color coding.

## See Also

- [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md) §Sun-side Analog — Earth's 149.77 km case (asymmetric form)
- [25 — Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) — Moon-side mirror of this document
- [src/script.js §E2 / OrbitalFormulas.keplerPeriod](../src/script.js) — implementation using the simple form
- [src/script.js — `computeSunSSBOffset` / `buildSunSSBChart`](../src/script.js) — Sun-SSB visualization for the Sun > CYCLES tab
- [Wikipedia — Barycenter (astronomy)](https://en.wikipedia.org/wiki/Barycenter_(astronomy)) — canonical reference linked from the in-model chart title
