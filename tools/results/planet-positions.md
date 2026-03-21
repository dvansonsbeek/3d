# Planet Positions — RMS vs JPL Horizons

**Last updated:** 2026-03-21
**Reference:** JPL Horizons RA/Dec, precession-corrected (IAU 1976 J2000 -> of-date)

---

## Summary (all planets, post-parallax-correction)

| Planet   | Ref pts | Parallax tier | Pre-correction RMS | Post-correction RMS |
|----------|---------|---------------|-------------------|-------------------|
| Mercury  | 95      | 42p           | 1.182°            | 0.014°            |
| Venus    | 3812    | 42p           | 1.207°            | 0.224°            |
| Mars     | 184     | 30p           | 1.058°            | 0.034°            |
| Jupiter  | 2499    | 42p           | 0.218°            | 0.063°            |
| Saturn   | 2502    | 36p           | 0.418°            | 0.097°            |
| Uranus   | 41      | 24p           | 0.121°            | 0.008°            |
| Neptune  | 69      | 24p           | 0.688°            | 0.008°            |

---

## EoC Fractions (Step 7: eoc-fractions.js)

Type III planets only. Scanned 0.00-1.00 in 0.02 steps, refined to 0.005.

| Planet   | eocFraction | RMS at optimal | RMS at 0.50 | Improvement |
|----------|-------------|----------------|-------------|-------------|
| Jupiter  | 0.495       | 1.8289°        | 1.8296°     | -0.0007°    |
| Saturn   | 0.540       | 1.3522°        | 1.3523°     | -0.0001°    |
| Uranus   | 0.530       | 1.6723°        | 1.6769°     | -0.0046°    |
| Neptune  | 0.585       | 0.9715°        | 0.9738°     | -0.0023°    |

---

## Ascending Node & Startpos (Step 8: ascnode-correction.js)

Fine scan ±5° in 0.1° steps, golden-section startpos re-optimization.

| Planet   | Old corr°  | New corr°  | Old startpos | New startpos | RMS Total |
|----------|-----------|-----------|-------------|-------------|-----------|
| Mercury  | 131.67°   | 131.60°   | 83.53       | 83.5293     | 0.0074°   |
| Venus    | 103.32°   | 103.40°   | 249.312     | 249.3141    | 0.2220°   |
| Mars     | 130.44°   | 130.40°   | 121.4679    | 121.4679    | 0.0242°   |
| Jupiter  | 27.70°    | 27.70°    | 13.85       | 13.85       | 0.0766°   |
| Saturn   | 22.64°    | 22.60°    | 11.32       | 11.3199     | 0.0958°   |
| Uranus   | 89.76°    | 90.20°    | 44.88       | 44.8801     | 0.1205°   |
| Neptune  | 95.92°    | 95.90°    | 47.96       | 47.9551     | 0.0657°   |

Note: ascNodeTiltCorrection is derived (inner: `180 - ascendingNode`, outer: `2 * startpos`).

---

## Parallax Correction Tiers (Step 9: parallax-correction.js)

Selected via LOOCV (n<=200) or 10-fold CV (n>200).

| Planet   | n    | Method   | 15p    | 18p    | 24p    | 30p    | 36p    | 42p    | Best |
|----------|------|----------|--------|--------|--------|--------|--------|--------|------|
| Mercury  | 95   | LOOCV    | 0.1032 | 0.0715 | 0.0378 | 0.0204 | 0.0152 | 0.0135 | 42p  |
| Venus    | 3812 | 10-fold  | 0.4270 | 0.4230 | 0.3762 | 0.2691 | 0.2298 | 0.2244 | 42p  |
| Mars     | 184  | LOOCV    | 0.1852 | 0.0906 | 0.0552 | 0.0337 | 0.0390 | 0.0538 | 30p  |
| Jupiter  | 2499 | 10-fold  | 0.0917 | 0.0907 | 0.0776 | 0.0641 | 0.0632 | 0.0625 | 42p  |
| Saturn   | 2502 | 10-fold  | 0.1062 | 0.1029 | 0.0992 | 0.0973 | 0.0973 | 0.0974 | 36p  |
| Uranus   | 41   | LOOCV    | 0.0233 | 0.0249 | 0.0220 | 0.1825 | 0.2946 |   —    | 24p  |
| Neptune  | 69   | LOOCV    | 0.0340 | 0.0147 | 0.0128 | 0.0139 | 0.3765 | 0.1090 | 24p  |

CV values are RMS in degrees. Best tier selected by lowest CV error.

---

## Constants Applied

| Parameter | File | Update method |
|-----------|------|---------------|
| `eocFraction` | constants.js, script.js | Manual |
| `startpos` | constants.js, script.js | Manual |
| `PARALLAX_DEC/RA_CORRECTION` | fitted-coefficients.js | Auto (script writes directly) |
