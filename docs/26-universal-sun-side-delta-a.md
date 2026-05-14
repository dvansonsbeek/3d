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

## See Also

- [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md) §Sun-side Analog — Earth's 149.77 km case (asymmetric form)
- [25 — Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) — Moon-side mirror of this document
- [src/script.js §E2 / OrbitalFormulas.keplerPeriod](../src/script.js) — implementation using the simple form
