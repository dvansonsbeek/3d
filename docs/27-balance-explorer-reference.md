# Invariable Plane Balance Explorer

## Overview

The Invariable Plane Balance Explorer is an interactive modal for testing planetary group assignments and Fibonacci divisors for the [Fibonacci Laws of Planetary Motion](26-fibonacci-laws.md). It provides instant visual feedback on whether a given configuration satisfies the inclination balance (Law 2), eccentricity balance (Law 3), and fits within Laplace-Lagrange secular theory bounds.

The explorer allows users to experiment with alternative configurations to understand why certain planetary assignments are uniquely constrained — for example, why the mirror-symmetric d-assignments are the only solution satisfying all three laws simultaneously.

**Related Documentation:**
- [Fibonacci Laws of Planetary Motion](26-fibonacci-laws.md) — the three laws and their derivations
- [UI Panels Reference](22-ui-panels-reference.md) — overview of all UI panels
- [Invariable Plane Calculations](16-invariable-plane-calculations.md) — height calculation formulas

---

## Accessing the Explorer

1. Open the dat.GUI Settings menu
2. Expand the **"Invariable Plane Positions"** folder
3. Click **"Invariable Plane Balance Explorer"**
4. The modal overlay appears centered on screen

---

## Panel Layout

The explorer is a centered overlay modal (not a side panel) to provide the horizontal space needed for the results table. It uses the same glass-morphism aesthetic as the Planet Hierarchy Inspector.

```
┌──────────────────────────────────────────────────────────────────┐
│  Invariable Plane Balance Explorer              [Presets ▼] [X] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PLANET ASSIGNMENTS                                              │
│  ┌────────┬──────────┬────────┬────┬────────────┬─────┬───────┐ │
│  │ Planet │ Phase(γ) │ Ω J2000│ d  │ Period(yr) │ Dir │ Trend │ │
│  ├────────┼──────────┼────────┼────┼────────────┼─────┼───────┤ │
│  │ Mercury│ [▼ 203°] │ 32.83  │[▼] │ 242828     │ PRO │ +0.53 │ │
│  │ Venus  │ [▼ 203°] │ 54.70  │[▼] │ 667776     │ PRO │ +0.19 │ │
│  │ Earth🔒│  203°    │ 284.51 │ 3  │ 111296     │ PRO │ +1.16 │ │
│  │ Mars   │ [▼ 203°] │ 354.87 │[▼] │ 77051      │ PRO │ +1.68 │ │
│  │ Jupiter│ [▼ 203°] │ 312.89 │[▼] │ 66778      │ PRO │ +1.94 │ │
│  │ Saturn │ [▼  23°] │ 118.81 │[▼] │ -41736     │ RET │ -3.11 │ │
│  │ Uranus │ [▼ 203°] │ 307.80 │[▼] │ 111296     │ PRO │ +1.16 │ │
│  │ Neptune│ [▼ 203°] │ 192.04 │[▼] │ 667776     │ PRO │ +0.19 │ │
│  └────────┴──────────┴────────┴────┴────────────┴─────┴───────┘ │
│                                                                  │
│  BALANCE RESULTS                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Inclination (Law 2): w = √(m·a(1-e²))/d    99.9998%      │  │
│  │ Eccentricity (Law 3): v = √m·a^(3/2)·e/√d  99.88%       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  PER-PLANET RESULTS                                              │
│  ┌──────┬──────┬──────┬──────────┬──┬───────┬──────┬────┬───┐   │
│  │Planet│ Amp  │ Mean │ Range    │LL│Trend  │ JPL  │Err │Dir│   │
│  ├──────┼──────┼──────┼──────────┼──┼───────┼──────┼────┼───┤   │
│  │Merc  │0.384 │5.963 │[5.6,6.3]│✓ │-0.006 │-0.006│ 0.0│ ✓ │   │
│  │Venus │0.061 │2.094 │[2.0,2.2]│✓ │-0.001 │-0.001│ 0.1│ ✓ │   │
│  │...   │      │      │         │  │       │      │    │   │   │
│  └──────┴──────┴──────┴──────────┴──┴───────┴──────┴────┴───┘   │
│                                                                  │
│  BALANCE VERIFICATION                                            │
│  Incl: Σ203°=X  Σ23°=Y  →  99.9998%  ✓                         │
│  Ecc:  Σ203°=X  Σ23°=Y  →  99.88%    ✓                         │
│  LL: 8/8 pass | Dir: 7/7 match                                   │
│  ψ = 2205 / (2 × 333888) = 3.302005e-3                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Controls

### Preset Dropdown

A dropdown in the header offers **755 pre-computed configurations** that achieve ≥99.994% inclination vector balance (the TNO margin). These are grouped by Jupiter/Saturn d-value scenario:

| Scenario | Jupiter d | Saturn d |
|----------|-----------|----------|
| A | 5 | 3 |
| B | 8 | 5 |
| C | 13 | 8 |
| D | 21 | 13 |

Selecting a preset applies its d-values and phase angles to all planets (except Earth, which is locked).

### Phase Angle (γ)

A dropdown per planet to select the oscillation phase angle. Available options:

| Option | Value | Description |
|--------|-------|-------------|
| 203.3195° | 203.3195° | Model phase group (majority of planets) |
| 23.3195° | 23.3195° | Opposite phase group (180° apart) |
| γ₁–γ₈ | Various | Laplace-Lagrange eigenmode angles |
| Custom | User input | Any angle 0°–360° |

The two model phases (203.3195° and 23.3195°) are derived from the s₈ eigenmode of secular perturbation theory. See [Fibonacci Laws — Phase Groups](26-fibonacci-laws.md#phase-groups).

### Ω J2000 (Read-Only)

Displays each planet's longitude of ascending node on the invariable plane at the J2000 epoch (Souami & Souchay 2012). This value is not editable — it is a fixed observational quantity.

### Fibonacci Divisor (d)

A dropdown per planet with common Fibonacci number values:

| Value | Label | Expression |
|-------|-------|------------|
| 1 | 1 | F₁ = F₂ |
| 2 | 2 | F₃ |
| 3 | 3 | F₄ |
| 5 | 5 | F₅ |
| 8 | 8 | F₆ |
| 13 | 13 | F₇ |
| 21 | 21 | F₈ |
| 34 | 34 | F₉ |
| 55 | 55 | F₁₀ |
| Custom | (input) | Any positive value |

Selecting "Custom" reveals a numeric input field.

### Period (years)

The precession period of each planet's ascending node, editable for exploration. Negative values indicate retrograde precession. The period determines the base trend displayed in the last column.

### Earth Row (Locked)

Earth's controls are locked (grayed out): phase = 203.3195°, d = 3. Earth's amplitude is independently calibrated from the temperature/obliquity model (0.635185°), so its parameters cannot be freely varied.

### Instant Recalculation

Every control change triggers immediate recalculation — no "Calculate" button needed. All results, including balance percentages and the per-planet table, update in real time.

---

## Results

### Balance Results

Two summary lines show the balance percentage for each law:

**Inclination Balance (Law 2):**
```
w = √(m · a(1-e²)) / d
```
The structural weights of the 203° group must equal those of the 23° group. Displayed as a percentage (100% = perfect balance). Turns red if below 90%.

**Eccentricity Balance (Law 3):**
```
v = √m × a^(3/2) × e / √d
```
The eccentricity weights of the 203° group must equal those of the 23° group. Displayed as a percentage. Turns red if below 90%.

### Per-Planet Results Table

| Column | Description |
|--------|-------------|
| **Planet** | Planet name |
| **Amplitude** | Oscillation amplitude in degrees: `ψ / (d × √m)` |
| **Mean** | Center of oscillation: `i_J2000 − amplitude × cos(Ω − γ)` |
| **Range** | `[mean − amplitude, mean + amplitude]` in degrees |
| **LL** | ✓ if range fits within Laplace-Lagrange bounds, ✗ if not |
| **Trend (°/cy)** | Calculated ecliptic inclination trend from precession period |
| **JPL (°/cy)** | Reference trend from JPL ephemerides |
| **Err** | Difference between calculated and JPL trend (arcseconds) |
| **Dir** | ✓ if trend direction matches JPL, ✗ if not (Earth shows —) |
| **d×i×√m** | Structural weight for inclination balance (scientific notation) |
| **v (ecc)** | Eccentricity weight (scientific notation) |

### Balance Verification

Below the results table:

- **Inclination verification**: Sum of 203° group weights, sum of 23° group weights, balance percentage, pass/fail indicator
- **Eccentricity verification**: Same format for eccentricity weights
- **Status line**: Count of LL bounds passes (out of 8) and direction matches (out of 7, Earth excluded)
- **ψ formula**: `ψ = 2205 / (2 × 333888) = 3.302005 × 10⁻³`
- **Explanatory text**: Brief description of the TNO margin (~0.006%, ~1.25 arcseconds) and balance conditions

---

## Interpreting Results

### A Valid Configuration

A configuration is valid when:

| Check | Criterion |
|-------|-----------|
| **Inclination balance** | ≥99.994% (TNO margin) |
| **Eccentricity balance** | High percentage (99.88% for the model configuration) |
| **LL bounds** | All 8 planets within Laplace-Lagrange bounds (8/8 ✓) |
| **Trend directions** | All 7 planets match JPL direction (7/7 ✓) |

### Exploring Configurations

Useful experiments to try:

| Experiment | Expected Result |
|------------|----------------|
| Change Saturn to 203° phase | Balance collapses (all planets on one side) |
| Increase Neptune d from 34 to 55 | Amplitude decreases, may still pass LL bounds |
| Set Jupiter d to large value (e.g., 55) | Jupiter amplitude shrinks, balance breaks |
| Use Preset dropdown | See all 755 valid configurations |
| Look for Config #27 (Scenario A) | The unique mirror-symmetric solution |

### Why Earth Is Locked

Earth's inclination amplitude (0.635185°) is derived from the temperature/obliquity model — it is not a free parameter. With d = 3:

```
amplitude = ψ / (3 × √m_Earth)
          = 3.302005e-3 / (3 × 1.7328e-3)
          = 0.635185°
```

This matches the observed oscillation. Changing Earth's d would break this calibration.

---

## Default Configuration

The model's default (and uniquely determined) configuration:

| Planet | Phase | d | Fibonacci | Mirror partner |
|--------|-------|---|-----------|----------------|
| Mercury | 203° | 21 | F₈ | Uranus |
| Venus | 203° | 34 | F₉ | Neptune |
| Earth | 203° | 3 | F₄ | Saturn |
| Mars | 203° | 5 | F₅ | Jupiter |
| Jupiter | 203° | 5 | F₅ | Mars |
| Saturn | 23° | 3 | F₄ | Earth |
| Uranus | 203° | 21 | F₈ | Mercury |
| Neptune | 203° | 34 | F₉ | Venus |

Expected results:
- Inclination balance: **99.9998%**
- Eccentricity balance: **99.88%**
- LL bounds: **8/8 pass**
- Trend directions: **7/7 match**

This is Config #27 out of 755 valid configurations — the only one with mirror-symmetric d-assignments (Finding 2 in [Fibonacci Laws](26-fibonacci-laws.md#finding-2-configuration-uniqueness)).

---

## Calculation Details

### Inclination Amplitude (Law 1)

```
amplitude = ψ / (d × √m)

Where:
  ψ = 2205 / (2 × H) = 3.302005 × 10⁻³
  H = 333,888 years (Holistic Year)
  d = Fibonacci divisor
  m = planet mass in solar units
```

### Inclination Balance (Law 2)

The structural weight per planet:
```
w = √(m × a × (1-e²)) / d
```

Balance condition:
```
Σ(203° group) w = Σ(23° group) w
```

### Eccentricity Balance (Law 3)

The eccentricity weight per planet:
```
v = √m × a^(3/2) × e / √d
```

Balance condition:
```
Σ(203° group) v = Σ(23° group) v
```

### Ecliptic Trend Calculation

To verify that a configuration produces correct observed inclination trends, the explorer computes the apparent ecliptic inclination at years 1900 and 2100:

1. For each year, compute the planet's orbital pole and Earth's orbital pole in invariable plane coordinates
2. Apparent inclination = arccos(dot product of normal vectors)
3. Trend = (incl₂₁₀₀ − incl₁₉₀₀) / 2 degrees per century

The planet's invariable plane inclination at year Y:
```
Ω(Y) = Ω_J2000 + (360/period) × (Y − 2000)
i(Y) = mean + amplitude × cos(Ω(Y) − γ)
```

### Laplace-Lagrange Bounds Check

Each planet's oscillation range `[mean − amplitude, mean + amplitude]` is checked against the Laplace-Lagrange secular theory bounds (with 0.01° tolerance):

```
fits = (mean − amplitude ≥ LL_min − 0.01) AND (mean + amplitude ≤ LL_max + 0.01)
```

---

## Code Locations

| Component | Location |
|-----------|----------|
| `BALANCE_PLANETS` array | [script.js:9207](../src/script.js#L9207) |
| `BALANCE_PRESETS` (755 configs) | [script.js:9216](../src/script.js#L9216) |
| `D_VALUE_OPTIONS` | [script.js:9330](../src/script.js#L9330) |
| `BALANCE_CONFIG` | [script.js:9348](../src/script.js#L9348) |
| `computeBalanceResults()` | [script.js:9497](../src/script.js#L9497) |
| `createBalanceExplorerPanel()` | [script.js:9619](../src/script.js#L9619) |
| `updateBalanceExplorerResults()` | [script.js:9868](../src/script.js#L9868) |
| `openBalanceExplorer()` / `closeBalanceExplorer()` | [script.js:9966](../src/script.js#L9966) |
| Menu button in dat.GUI | [script.js:11535](../src/script.js#L11535) |
| CSS styles (`.fbe-` prefix) | [style.css](../src/style.css) |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [26 - Fibonacci Laws](26-fibonacci-laws.md) | The three laws, derivations, and findings |
| [22 - UI Panels Reference](22-ui-panels-reference.md) | Overview of all UI panels |
| [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) | Height calculation formulas |
| [10 - Constants Reference](10-constants-reference.md) | Planet masses and orbital elements |

---

**Previous**: [26 - Fibonacci Laws of Planetary Motion](26-fibonacci-laws.md)
