# Moon Baseline — RMS vs JPL Horizons

**Last updated:** 2026-03-21
**Reference:** JPL Horizons, 3-day sampling 2000–2025
**Precession:** IAU 1976 (Meeus) J2000 -> of-date applied to JPL reference frame
**Position method:** Meeus Ch. 47 perturbation overlay on 5-layer geometric orbit

---

## JPL Horizons Comparison (6088 points, 3-day sampling)

| Metric    | Value    |
|-----------|----------|
| RMS Total | 0.0123°  |
| RMS RA    | 0.0118°  |
| RMS Dec   | 0.0035°  |
| Max ΔRA   | −0.0228° |
| Max ΔDec  | −0.0090° |
| Entries   | 6088     |

### Start Date Accuracy (JD 2451716.5)

| Metric    | Model     | JPL       | Diff     |
|-----------|-----------|-----------|----------|
| RA        | 317.089°  | 317.086°  | +0.003°  |
| Dec       | −18.275°  | −18.276°  | +0.001°  |

---

## Solar Eclipse Accuracy (66 eclipses, 2000–2025)

Measures Moon-Sun angular separation at NASA GSFC eclipse times.
Theoretical limit: ~0.5–1° due to geocentric vs topocentric parallax.

| Metric              | Value    |
|---------------------|----------|
| RMS separation      | 0.8106°  |
| Startpos optimized? | Yes (no improvement found) |

Source: NASA GSFC Solar Eclipse Catalog (2000–2025)

---

## Constants

| Parameter                | Value         | Method                                     |
|--------------------------|---------------|--------------------------------------------|
| `moonSiderealMonthInput` | 27.32166156   | IAU reference                              |
| `moonAnomalisticMonthInput` | 27.55454988 | IAU reference                             |
| `moonNodalMonthInput`    | 27.21222082   | IAU reference                              |
| `moonDistance`            | 384399.07 km  | IAU reference                              |
| `moonEclipticInclinationJ2000` | 5.1453964° | IAU reference                           |
| `moonOrbitalEccentricity`| 0.054900489   | IAU reference                              |
| `moonTilt`               | 6.687°        | Reference                                  |
| `moonStartposApsidal`    | 347.622       | Eclipse optimizer (at optimum)             |
| `moonStartposNodal`      | −83.630       | Eclipse optimizer (at optimum)             |
| `moonStartposMoon`       | 131.930       | Eclipse optimizer (at optimum)             |

---

## Improvement Path

To improve Moon accuracy further, two independent factors limit different metrics:

- **JPL baseline (0.0123° RMS)**: Limited by the Meeus Ch. 47 series (60L+60B terms).
  Improving this requires updating the perturbation tables — either adding higher-order
  terms or switching to a more accurate lunar theory (e.g., ELP/MPP02, DE440).
  The centralized tables in `tools/lib/constants/meeus-lunar-tables.json` make this
  straightforward to test. See `docs/66-moon-meeus-corrections.md` Section 6, point 3.

- **Eclipse accuracy (0.81° RMS)**: Limited by geocentric parallax (~0.95°).
  Residual after subtracting parallax is only 0.04°. Improving beyond 0.81°
  requires topocentric correction (observer's location on Earth), not better tables.

---

## Position Architecture

Two-layer system:

1. **Geometric orbit** — 5 precession layers derived from 3 month inputs
   - Apsidal precession, apsidal-nodal beats (×2), lunar leveling cycle, nodal precession
   - Provides orbital shape and long-term precession behavior

2. **Meeus perturbation overlay** — 120 terms from Meeus Ch. 47
   - 60 longitude terms (Table 47.A) + 60 latitude terms (Table 47.B)
   - Centralized in `tools/lib/constants/meeus-lunar-tables.json`
   - Accounts for gravitational perturbations (Sun, Venus, Jupiter, Earth flattening)
   - EoC half-correction subtracted to avoid double-counting with geometric eccentricity
   - Final ecliptic lon/lat converted to RA/Dec and applied as visual position override
