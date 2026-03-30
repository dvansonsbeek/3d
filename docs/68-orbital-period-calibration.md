# Orbital Period Calibration with Ancient Observations

## Problem

The `solarYearInput` parameter controls each planet's orbital period in the model.
Due to integer quantization (`solarYearCount = Math.round(H * meanSolarYearDays / solarYearInput)`),
the effective period differs slightly from the input value. Small period errors
accumulate over centuries, causing the model to drift from observed positions at
ancient dates.

## Method

### Data Source

We use the ISAW synodic event tables (Appendix to ISAW Papers 15), which provide
modern-computed ecliptic longitudes for planetary synodic events from 800 BCE to
1650 CE. These tables use the Bretagnon (1986) ephemeris and give positions at
opposition dates (outer planets) or superior conjunction dates (inner planets).

- Source: http://dlib.nyu.edu/awdl/isaw/isaw-papers/15/
- Files: `mars1650.csv`, `jupiter1650.csv`, `saturn1650.csv`, `venus1650.csv`, `mercury1650.csv`
- License: Creative Commons Attribution 4.0

### Measurement

For each planet, we:

1. Compute the model's RA/Dec at each ISAW event date (using the event's Julian Date)
2. Convert model RA/Dec to ecliptic longitude using the obliquity for that epoch
3. Compare with the ISAW ecliptic longitude
4. Compute the mean difference at 800-600 BCE and at 1500-1650 CE
5. The "drift" is the difference between these two means

A positive drift means the model is behind ISAW at ancient dates (period too long).
A negative drift means the model is ahead (period too short).

### Tuning

Because `solarYearCount` is an integer, `solarYearInput` changes in discrete steps.
We scan adjacent count values to find the one that minimizes drift while keeping
modern RMS reasonable. After changing the period, we re-optimize `startpos` and
`eocFraction` with a start-date RA constraint (within 0.05 deg of JPL).

## Results

### Before calibration (original values)

| Planet  | solarYearInput | Drift (800 BCE to 1650 CE) | Direction       |
|---------|---------------|---------------------------|-----------------|
| Mercury | 87.9686       | +0.77 deg                 | positive        |
| Venus   | 224.6967      | +2.69 deg                 | positive        |
| Mars    | 686.934       | +10.65 deg                | positive        |
| Jupiter | 4330.6        | -1.15 deg                 | negative        |
| Saturn  | 10746.6       | -2.54 deg                 | negative        |

Mars had by far the largest drift: ~4.7 deg per millennium.

### After calibration

RMS values below are from the time of calibration (before parallax correction was extended). Current baselines are much lower — see [67-planet-parallax-corrections.md](67-planet-parallax-corrections.md) §5.

| Planet  | solarYearInput | Drift   | RMS before | RMS after | Change  |
|---------|---------------|---------|------------|-----------|---------|
| Mercury | 87.9686       | +0.77   | 1.379      | 1.379     | --      |
| Venus   | 224.695       | -1.42   | 2.661      | 2.617     | -1.7%   |
| Mars    | 686.931       | +3.89   | 1.794      | 1.702     | -5.1%   |
| Jupiter | 4330.5        | +1.87   | 0.477      | 0.277     | -41.9%  |
| Saturn  | 10747.0       | +0.21   | 0.466      | 0.562     | +20.6%  |

**Note:** Since this calibration, several `solarYearInput` values have been further adjusted through pipeline refits: Mercury 87.9686→87.9683, Mars 686.931→686.935, Jupiter 4330.5→4330.42. The drift values above reflect the state at calibration time. Current orbit counts are in the Quantization table below. For current baselines see [67-planet-parallax-corrections.md](67-planet-parallax-corrections.md) §5.

### Trade-offs

- **Jupiter** was the biggest win: 42% RMS improvement with near-zero drift.
  Further refined from 4330.65 to 4330.5 to optimize invariable plane balance
  (Config #15 achieves 100% balance). This shifts count from 28254 to 28255
  (boundary at ~4330.455), which slightly changes the effective SMA
- **Mars** improved both drift (10.65 -> 3.89 deg) and RMS (-5.1%)
- **Venus** improved modestly on both metrics
- **Saturn** traded modern RMS (+0.1 deg) for near-zero ancient drift (+0.21 deg).
  This was a deliberate choice: long-term accuracy takes priority over short-term fit.
- **Mercury** was left unchanged: its drift is negligible (0.34 deg/millennium) and
  the high orbit count (1.39M) means each step changes the period by only 0.00001 days.

### Quantization

The integer `solarYearCount` means periods change in discrete steps:

| Planet  | Count   | Step size (days) |
|---------|---------|------------------|
| Mercury | 1392228 | 0.00006          |
| Venus   | 545059  | 0.0004           |
| Mars    | 178287  | 0.004            |
| Jupiter | 28282   | 0.15             |
| Saturn  | 11396   | 0.94             |

For Mercury and Venus, the steps are so small that fine-tuning is possible.
For Saturn, each step changes the period by nearly a full day, limiting precision.

## Co-optimized Parameters

After each period change, the following parameters were re-optimized using
Nelder-Mead with a start-date RA penalty (weight=20):

- `startpos` -- shifted slightly to maintain JPL start-date alignment
- `eocFraction` -- adjusted to maintain best RMS with new period

The `angleCorrection` and `perihelionRef_JD` were not changed.
