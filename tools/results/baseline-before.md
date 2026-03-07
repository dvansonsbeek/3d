# Baseline Report — Before Optimization

**Date**: 2026-03-06
**Model epoch**: JD 2451716.5 (21 June 2000)
**Comparison**: Model RA/Dec (standalone scene graph engine) vs JPL Horizons RA/Dec

---

## Master Baseline Table (JPL Horizons, 2000-2025)

Consistent comparison: 26 yearly dates (June 21, 2000 through 2025) for all 9 targets.
Reference: JPL Horizons geocentric astrometric RA/Dec (CENTER=500@399, ANG_FORMAT=DEG).

| # | Target   | RMS RA   | RMS Dec  | RMS Total | Max RA   | Max Dec   | Error Character |
|---|----------|----------|----------|-----------|----------|-----------|-----------------|
| 1 | Sun      | 0.714°   | 0.004°   | 0.714°    | 0.902°   | -0.006°   | Steady RA drift (~0.016°/yr), negligible Dec |
| 2 | Moon     | 3.410°   | 5.258°   | 6.267°    | -7.271°  | 10.267°   | Large oscillating errors (structural) |
| 3 | Mercury  | 3.094°   | 3.810°   | 4.908°    | 6.384°   | -6.522°   | Irregular, phase-dependent |
| 4 | Venus    | 0.730°   | 3.636°   | 3.709°    | 1.725°   | -6.479°   | Small RA, periodic Dec (~1.6yr cycle) |
| 5 | Mars     | 1.223°   | 2.872°   | 3.121°    | -2.772°  | -6.000°   | Mixed: periodic + occasional spikes |
| 6 | Jupiter  | 1.061°   | 1.665°   | 1.974°    | -1.767°  | 2.391°    | Slow oscillation (~12yr period) |
| 7 | Saturn   | 1.188°   | 3.070°   | 3.291°    | -2.114°  | 4.703°    | Slow drift with long-period oscillation |
| 8 | Uranus   | 0.347°   | 1.327°   | 1.372°    | 0.770°   | 1.534°    | Smooth monotonic drift |
| 9 | Neptune  | 0.463°   | 1.423°   | 1.496°    | -0.873°  | 2.485°    | Smooth monotonic drift |

**Ranking by RMS Total** (worst to best):
1. Moon: 6.267° — dominated by structural ~5° floor (missing equation-of-center half, evection, variation)
2. Mercury: 4.908° — fast orbit + high eccentricity = large constant-speed error
3. Venus: 3.709° — small RA error but large periodic Dec error
4. Saturn: 3.291° — long-period oscillation in both RA and Dec
5. Mars: 3.121° — periodic pattern, spikes at specific orbital phases
6. Jupiter: 1.974° — ~12-year oscillation, moderate errors
7. Neptune: 1.496° — smooth monotonic drift, low eccentricity helps
8. Uranus: 1.372° — smooth drift, similar character to Neptune
9. Sun: 0.714° — excellent, steady RA drift only

---

## Reference Data Baseline (event-specific dates, 1800-2200)

Comparison against reference-data.json (PLANET_TEST_DATES enriched with JPL RA/Dec).
Dates are event-specific: transits (Mercury/Venus), oppositions (Mars), conjunctions (Jupiter/Saturn).
Wider date range and more entries than the JPL-only baseline above.

| Target   | Entries | Date Range     | RMS RA  | RMS Dec | RMS Total | Max RA  | Max Dec  |
|----------|---------|----------------|---------|---------|-----------|---------|----------|
| Mercury  | 55      | 1802-2200+     | 2.451°  | 3.102°  | 3.954°    | 4.671°  | -3.537°  |
| Venus    | 8       | 1882-2012      | 3.377°  | 1.889°  | 3.869°    | 5.944°  | -2.258°  |
| Mars     | 144     | 1829-2197      | 2.516°  | 4.328°  | 5.006°    | 4.712°  | -6.616°  |
| Jupiter  | 31      | 1802-2200+     | 1.797°  | 1.172°  | 2.145°    | 3.327°  | -2.697°  |
| Saturn   | 27      | 1802-2200+     | 1.710°  | 2.207°  | 2.791°    | -3.419° | -4.615°  |
| Uranus   | 1       | 2000           | 0.002°  | 0.069°  | 0.069°    | -0.002° | 0.069°   |
| Neptune  | 29      | 1802-2060      | 1.311°  | 1.561°  | 2.039°    | -2.903° | -3.134°  |

Notes:
- Uranus has only 1 entry (model start date) — not statistically meaningful
- Venus has only 8 entries — limited coverage
- Mars has the most entries (144) and shows the largest Dec errors
- The event-specific dates capture different orbital phases than the yearly JPL dates

---

## Observations

### Sun
- RA error grows linearly at ~0.016°/year (0.51° in 2000 → 0.90° in 2025)
- Dec error is negligible (<0.006°)
- This RA drift propagates as a correlated systematic to all planets
- The annual ~1° oscillation (constant-speed limitation) averages out in yearly samples

### Moon
- Largest errors of any target (RMS 6.27°)
- Errors oscillate wildly between consecutive years — no clear drift
- Structural floor ~5° from missing perturbation terms (equation of center, evection, variation)
- Tuning start positions may reduce the low-frequency component

### Inner Planets (Mercury, Venus)
- Mercury: high errors from fast orbit + large eccentricity (e=0.206)
- Venus: surprisingly small RA errors (~0.73°) but large periodic Dec errors (~3.6°)
- Venus Dec shows a clear ~1.6-year periodicity (Venus synodic period)

### Outer Planets (Jupiter, Saturn, Uranus, Neptune)
- Jupiter: ~12-year oscillation visible in both RA and Dec (orbital period)
- Saturn: errors drift with ~30-year period, currently around 3-4° Dec
- Uranus and Neptune: smooth monotonic drifts, smallest errors among planets
- Uranus/Neptune's low eccentricities mean small constant-speed errors

### Mars
- Moderate RA errors (~1.2°) but larger Dec errors (~2.9°)
- Occasional spikes to 6° Dec at specific orbital phases
- Has the most reference data (144 Tier 2 + 923 Tier 1C Tycho observations)
- Type II eccentricity formula gives correct eccentricity (~1.01× ratio)

---

## Key Patterns

1. **Dec errors dominate for most targets**: Only Sun and Jupiter have RA > Dec errors
2. **RA errors are generally smaller**: The model's perihelion/orbital position calibration is reasonable
3. **Dec errors suggest inclination modeling issues**: Static ascending nodes + simplified inclination dynamics
4. **Slow planets have smooth drifts**: Uranus and Neptune errors are nearly linear — easy to improve with parameter tuning
5. **Fast planets have oscillating errors**: Mercury, Moon — phase-dependent errors from constant-speed limitation

---

## Baseline Summary for Progress Tracking

| Target   | RMS Total (JPL 2000-2025) |
|----------|---------------------------|
| Sun      | 0.714°                    |
| Moon     | 6.267°                    |
| Mercury  | 4.908°                    |
| Venus    | 3.709°                    |
| Mars     | 3.121°                    |
| Jupiter  | 1.974°                    |
| Saturn   | 3.291°                    |
| Uranus   | 1.372°                    |
| Neptune  | 1.496°                    |
