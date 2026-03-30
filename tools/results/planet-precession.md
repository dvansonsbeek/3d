# Planet Precession — ML Training Results

**Last updated:** 2026-03-25
**Data source:** `data/01-holistic-year-objects-data.xlsx` (14,579 points, 23-year steps, full H)
**Earth perihelion:** PERI_HARMONICS (21 terms, RMSE 0.003468°), PERI_OFFSET = −0.255223

---

## Predictive Model (Step 5: train_precession.py)

429-term unified feature matrix, Ridge regression (α=0.01)

| Planet   | RMSE ("/cy) | R²       |
|----------|-------------|----------|
| Mercury  | 0.7449      | 0.999929 |
| Venus    | 3.2693      | 0.999960 |
| Mars     | 2.0271      | 0.999636 |
| Jupiter  | 2.3254      | 0.999625 |
| Saturn   | 3.7207      | 0.999617 |
| Uranus   | 1.3956      | 0.999618 |
| Neptune  | 0.2482      | 0.999902 |

### J2000 Spot Check (predictive vs observed)

| Planet   | Predicted | Observed  | Diff     |
|----------|-----------|-----------|----------|
| Mercury  | 37.7544   | 38.0461   | −0.2917  |
| Venus    | 168.0776  | 175.5387  | −7.4611  |
| Mars     | −116.0683 | −116.1227 | +0.0544  |
| Jupiter  | −152.9746 | −153.0588 | +0.0842  |
| Saturn   | −280.6225 | −280.4372 | −0.1853  |
| Uranus   | −87.5472  | −87.6104  | +0.0632  |
| Neptune  | 7.9698    | 7.9545    | +0.0153  |

### Greedy Feature Selection (saturation check)

Best single-term ΔRMSE improvements from 867 candidates:

| Planet   | Best candidate              | ΔRMSE   | Max |corr| |
|----------|-----------------------------|---------|------------|
| Mercury  | sin(2πt/H/110)×cos(2δ)     | −0.0110 | 0.063      |
| Venus    | sin(2πt/H/36)×cos(2δ)      | −0.0447 | 0.131      |
| Mars     | cos(2πt/H/52)×cos(2δ)      | −0.0055 | 0.026      |
| Jupiter  | cos(2πt/H/144)             | −0.0006 | 0.023      |
| Saturn   | sin(2πt/H/35)×cos(2δ)      | −0.0003 | 0.010      |
| Uranus   | cos(2πt/H/14)              | −0.0009 | 0.024      |
| Neptune  | sin(2πt/H/112)×sin(2δ)     | −0.0007 | 0.033      |

Conclusion: model is saturated — residuals are effectively white noise.

---

## Observed Model (Step 6: train_observed.py)

225-term feature matrix (328 for Venus), least-squares SVD

| Planet   | Terms | RMSE ("/cy) | R²       |
|----------|-------|-------------|----------|
| Mercury  | 225   | 1.7795      | 0.999592 |
| Venus    | 328   | 9.1417      | 0.999691 |
| Mars     | 225   | 4.4548      | 0.998241 |
| Jupiter  | 225   | 5.1353      | 0.998170 |
| Saturn   | 225   | 8.2088      | 0.998138 |
| Uranus   | 225   | 3.0795      | 0.998142 |
| Neptune  | 225   | 0.5220      | 0.999566 |

---

## Earth Perihelion Longitude (Step 4: fit_perihelion_harmonics.py)

21-term harmonic fit to simulation perihelion longitude over full H.

### Perihelion Longitude Accuracy

| Metric              | Value       |
|---------------------|-------------|
| RMSE                | 0.003468°   |
| Max error           | 0.017821°   |
| Max error at        | year −259871|
| Mean error          | −0.000000°  |
| PERI_OFFSET         | −0.255223   |
| Harmonics           | 21 terms    |

### J2000 Accuracy

| Metric                | Value       | Diff        |
|-----------------------|-------------|-------------|
| Predicted at J2000    | 102.9465°   |             |
| Truth data (year 2000)| 102.9468°   | −0.0003°    |
| IAU reference         | 102.9470°   | −0.0005°    |

---

## Earth Rate Deviation (ERD)

Analytical derivative of perihelion harmonic series vs numerical differentiation of truth data.

### ERD Accuracy

| Metric              | Value          |
|---------------------|----------------|
| Mean precession rate| 0.017194°/yr   |
| ERD RMSE            | 0.000054°/yr   |
| ERD max error       | 0.000118°/yr   |
| Max error at        | year −135490   |

### ERD Spot Checks (deviation from mean rate)

| Year     | Analytical    | Numerical     | Diff          |
|----------|---------------|---------------|---------------|
| 2000     | −0.000097°/yr | −0.000105°/yr | −0.000008°/yr |
| 1000     | +0.000103°/yr | +0.000024°/yr | −0.000079°/yr |
| −10000   | +0.003286°/yr | +0.003284°/yr | −0.000002°/yr |
| −100000  | −0.001383°/yr | −0.001472°/yr | −0.000089°/yr |
| −301340  | +0.002746°/yr | +0.002751°/yr | +0.000006°/yr |
