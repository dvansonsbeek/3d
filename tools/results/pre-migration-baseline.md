# Pre-Migration Baseline — Before ICRF Perihelion Inclination Change

**Date**: 2026-04-03
**Commit**: This commit serves as the safe rollback point

## RMS Baseline (all planets vs JPL)

| Planet | RMS RA | RMS Dec | RMS Total |
|--------|--------|---------|-----------|
| Mercury | 0.06 | 0.06 | 0.08 |
| Venus | 0.04 | 0.02 | 0.04 |
| Mars | 0.06 | 0.07 | 0.09 |
| Jupiter | 0.05 | 0.01 | 0.05 |
| Saturn | 0.06 | 0.03 | 0.07 |
| Uranus | 0.01 | 0.01 | 0.02 |
| Neptune | 0.00 | 0.00 | 0.00 |
| Moon | 0.00 | 0.00 | 0.00 |

## Inclination Parameters (ascending node based, 203°/23° phase groups)

| Planet | Phase | Mean | Amplitude | Period (ecl) |
|--------|-------|------|-----------|-------------|
| Mercury | 203.3195 | 6.726271 | 0.384267 | 243,867 |
| Venus | 203.3195 | 2.207312 | 0.061809 | 670,634 |
| Earth | 203.3195 | 1.481282 | 0.636032 | 111,772 |
| Mars | 203.3195 | 2.648955 | 1.157559 | 77,381 |
| Jupiter | 203.3195 | 0.329094 | 0.021281 | 67,063 |
| Saturn | 23.3195 | 0.931672 | 0.064819 | -41,915 |
| Uranus | 203.3195 | 1.000594 | 0.023695 | 111,772 |
| Neptune | 203.3195 | 0.722202 | 0.013474 | 670,634 |

## Balance

- Inclination: 99.9999%
- Eccentricity: 99.8909%

## How to revert

If the migration needs to be rolled back:
```bash
git log --oneline | grep "BASELINE"
git checkout <commit-hash> -- public/input/ tools/lib/ src/script.js
```
