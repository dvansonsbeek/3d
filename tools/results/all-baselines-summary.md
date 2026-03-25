# All Baselines Summary — RMS vs JPL Horizons

**Last updated:** 2026-03-25
**Reference:** JPL Horizons RA/Dec + IMCCE INPOP19, IAU 1976 precession correction applied
**Training window:** 1800–2200 (primary) + observed pre-1800 anchors

---

## All 9 Targets

| Target   | RMS Total | Notes |
|----------|-----------|-------|
| Sun      | 0.0033°   | Earth geometry only |
| Moon     | 0.0015°   | Meeus correction layer |
| Mercury  | 0.0712°   | 78p parallax + mean anomaly terms |
| Venus    | 0.0309°   | 78p parallax |
| Mars     | 0.0914°   | 78p parallax, circular orbit limit |
| Jupiter  | 0.0515°   | 68p parallax + gravitation |
| Saturn   | 0.0672°   | 68p parallax + gravitation + 1682 anchor |
| Uranus   | 0.0159°   | 68p parallax |
| Neptune  | 0.0042°   | 68p parallax |

Five targets under 0.05°. All within 0.10° except Mars (circular orbit limit).

---

## Historical Conjunction Validation

| Event | Year | Separation | Status |
|-------|------|-----------|--------|
| Jupiter-Saturn triple #1 | 1682.8 | 0.91° | First telescopic observation |
| Jupiter-Saturn triple #2 | 1683.1 | 0.89° | First telescopic observation |
| Jupiter-Saturn triple #3 | 1683.4 | 0.79° | First telescopic observation |
| Jupiter-Saturn | 2020.0 | 0.61° | Modern observation |

---

## Data Sources

- **JPL Horizons DE441** (NASA/JPL): 1600–2400
- **IMCCE Miriade INPOP19** (OBSPM/CNRS): 1200–2800 (independent, cross-checked to 0.04")
- **Total reference data:** ~175,000 data points, 1200–2800 CE
- **Training data:** ~44,000 pts (1800–2200) + 41 observed pre-1800 anchors

---

## Detailed Results

| Target  | Results file |
|---------|-------------|
| Sun     | `sun-baseline.md` |
| Moon    | `moon-baseline.md` |
| Planets | `planet-positions.md` (EoC, ascnode, parallax) |
| Planet precession | `planet-precession.md` (ML training, ERD) |
